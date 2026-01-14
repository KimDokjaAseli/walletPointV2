package marketplace

import (
	"errors"
	"fmt"
	"math"
	"wallet-point/internal/wallet"

	"gorm.io/gorm"
)

type MarketplaceService struct {
	repo          *MarketplaceRepository
	walletService *wallet.WalletService
	db            *gorm.DB
}

func NewMarketplaceService(repo *MarketplaceRepository, walletService *wallet.WalletService, db *gorm.DB) *MarketplaceService {
	return &MarketplaceService{
		repo:          repo,
		walletService: walletService,
		db:            db,
	}
}

// GetAllProducts gets all products with pagination and filters
func (s *MarketplaceService) GetAllProducts(params ProductListParams) (*ProductListResponse, error) {
	// Default pagination
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 20
	}

	products, total, err := s.repo.GetAll(params)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))

	return &ProductListResponse{
		Products:   products,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetProductByID gets product by ID
func (s *MarketplaceService) GetProductByID(productID uint) (*Product, error) {
	return s.repo.FindByID(productID)
}

// CreateProduct creates a new product
func (s *MarketplaceService) CreateProduct(req *CreateProductRequest, adminID uint) (*Product, error) {
	product := &Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		ImageURL:    req.ImageURL,
		Status:      "active",
		CreatedBy:   adminID,
	}

	if err := s.repo.Create(product); err != nil {
		return nil, errors.New("failed to create product")
	}

	return product, nil
}

// UpdateProduct updates product
func (s *MarketplaceService) UpdateProduct(productID uint, req *UpdateProductRequest) (*Product, error) {
	// Check if product exists
	_, err := s.repo.FindByID(productID)
	if err != nil {
		return nil, err
	}

	// Prepare updates
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Price > 0 {
		updates["price"] = req.Price
	}
	if req.Stock >= 0 {
		updates["stock"] = req.Stock
	}
	if req.ImageURL != "" {
		updates["image_url"] = req.ImageURL
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	// Update product
	if len(updates) > 0 {
		if err := s.repo.Update(productID, updates); err != nil {
			return nil, errors.New("failed to update product")
		}
	}

	// Return updated product
	return s.repo.FindByID(productID)
}

// DeleteProduct deletes product
func (s *MarketplaceService) DeleteProduct(productID uint) error {
	// Check if product exists
	_, err := s.repo.FindByID(productID)
	if err != nil {
		return err
	}

	return s.repo.Delete(productID)
}

// PurchaseProduct handles product purchase
func (s *MarketplaceService) PurchaseProduct(userID uint, req *PurchaseRequest) (*MarketplaceTransaction, error) {
	// Start transaction
	tx := s.db.Begin()
	var err error

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		} else if err != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}()

	// 1. Get Product
	var product *Product
	product, err = s.repo.FindByID(req.ProductID)
	if err != nil {
		return nil, err
	}

	// Allow anything except explicitly 'inactive'
	if product.Status == "inactive" {
		err = errors.New("product is not active")
		return nil, err
	}

	if product.Stock < 1 {
		err = errors.New("product out of stock")
		return nil, err
	}

	// 2. Validate QR if needed
	if req.PaymentMethod == "qr" {
		if req.PaymentToken == "" {
			err = errors.New("QR payment requires a token")
			return nil, err
		}
		if err = s.walletService.ValidateAndConsumeToken(req.PaymentToken, userID, product.Price); err != nil {
			return nil, err
		}
	}

	// 3. Get User Wallet
	var userWallet *wallet.Wallet
	userWallet, err = s.walletService.GetWalletByUserID(userID)
	if err != nil {
		return nil, err
	}

	totalPrice := product.Price
	if totalPrice <= 0 {
		totalPrice = 1 // Force at least 1 point to avoid DB constraint
	}

	// 4. Check Balance
	if userWallet.Balance < totalPrice {
		err = fmt.Errorf("insufficient balance. Required: %d", totalPrice)
		return nil, err
	}

	// 5. Debit Wallet
	err = s.walletService.DebitWithTransaction(tx, userWallet.ID, totalPrice, "marketplace", fmt.Sprintf("Purchase: %s", product.Name))
	if err != nil {
		return nil, err
	}

	// 6. Reduce Stock
	err = s.repo.UpdateStock(tx, product.ID, -1)
	if err != nil {
		return nil, err
	}

	// 7. Create Transaction Record
	txn := &MarketplaceTransaction{
		WalletID:    userWallet.ID,
		ProductID:   product.ID,
		Amount:      product.Price,
		TotalAmount: totalPrice,
		Quantity:    1,
		Status:      "success",
	}

	err = s.repo.CreateTransaction(tx, txn)
	if err != nil {
		return nil, err
	}

	return txn, nil
}

// GetTransactions retrieves all marketplace transactions (Admin)
func (s *MarketplaceService) GetTransactions(limit, offset int) ([]MarketplaceTransaction, int64, error) {
	return s.repo.GetAllTransactions(limit, offset)
}

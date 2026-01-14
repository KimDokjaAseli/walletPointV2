package marketplace

import (
	"errors"

	"gorm.io/gorm"
)

type MarketplaceRepository struct {
	db *gorm.DB
}

func NewMarketplaceRepository(db *gorm.DB) *MarketplaceRepository {
	return &MarketplaceRepository{db: db}
}

// GetAll gets all products with filters and pagination
func (r *MarketplaceRepository) GetAll(params ProductListParams) ([]Product, int64, error) {
	var products []Product
	var total int64

	query := r.db.Model(&Product{})

	// Apply filters
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (params.Page - 1) * params.Limit
	query = query.Limit(params.Limit).Offset(offset).Order("created_at DESC")

	if err := query.Find(&products).Error; err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

// FindByID finds product by ID
func (r *MarketplaceRepository) FindByID(productID uint) (*Product, error) {
	var product Product
	err := r.db.First(&product, productID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("product not found")
		}
		return nil, err
	}
	return &product, nil
}

// Create creates a new product
func (r *MarketplaceRepository) Create(product *Product) error {
	return r.db.Create(product).Error
}

// Update updates product
func (r *MarketplaceRepository) Update(productID uint, updates map[string]interface{}) error {
	return r.db.Model(&Product{}).Where("id = ?", productID).Updates(updates).Error
}

// Delete deletes product (soft delete by setting status to inactive)
func (r *MarketplaceRepository) Delete(productID uint) error {
	return r.db.Model(&Product{}).Where("id = ?", productID).Update("status", "inactive").Error
}

// UpdateStock updates product stock
func (r *MarketplaceRepository) UpdateStock(tx *gorm.DB, productID uint, delta int) error {
	if tx == nil {
		tx = r.db
	}
	return tx.Model(&Product{}).
		Where("id = ?", productID).
		Update("stock", gorm.Expr("stock + ?", delta)).
		Error
}

// CreateTransaction creates a marketplace transaction record
func (r *MarketplaceRepository) CreateTransaction(tx *gorm.DB, transaction *MarketplaceTransaction) error {
	if tx == nil {
		tx = r.db
	}
	return tx.Create(transaction).Error
}

// GetAllTransactions retrieves marketplace transactions for admin
func (r *MarketplaceRepository) GetAllTransactions(limit, offset int) ([]MarketplaceTransaction, int64, error) {
	var transactions []MarketplaceTransaction
	var total int64

	if err := r.db.Model(&MarketplaceTransaction{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.Limit(limit).Offset(offset).Order("created_at DESC").Find(&transactions).Error
	return transactions, total, err
}

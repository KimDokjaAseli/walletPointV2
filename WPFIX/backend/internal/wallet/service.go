package wallet

import (
	"errors"
	"fmt"
	"math"

	"gorm.io/gorm"
)

type WalletService struct {
	repo *WalletRepository
	db   *gorm.DB
}

func NewWalletService(repo *WalletRepository, db *gorm.DB) *WalletService {
	return &WalletService{
		repo: repo,
		db:   db,
	}
}

// GetAllWallets gets all wallets with user information
func (s *WalletService) GetAllWallets() ([]WalletWithUser, error) {
	return s.repo.GetAllWithUsers()
}

// GetWalletByID gets wallet by ID
func (s *WalletService) GetWalletByID(walletID uint) (*Wallet, error) {
	return s.repo.FindByID(walletID)
}

// GetWalletByUserID gets wallet by user ID
func (s *WalletService) GetWalletByUserID(userID uint) (*Wallet, error) {
	return s.repo.FindByUserID(userID)
}

// AdjustPoints manually adjusts wallet points (admin only)
func (s *WalletService) AdjustPoints(req *AdjustmentRequest, adminID uint) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Check if wallet exists
	wallet, err := s.repo.FindByID(req.WalletID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// Calculate delta
	delta := req.Amount
	if req.Direction == "debit" {
		// Check if balance is sufficient for debit
		if wallet.Balance < req.Amount {
			tx.Rollback()
			return errors.New("insufficient balance")
		}
		delta = -req.Amount
	}

	// Create transaction record
	transaction := &WalletTransaction{
		WalletID:    req.WalletID,
		Type:        "adjustment",
		Amount:      req.Amount,
		Direction:   req.Direction,
		Status:      "success",
		Description: req.Description,
		CreatedBy:   "admin",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		tx.Rollback()
		return errors.New("failed to create transaction")
	}

	// Update balance
	if err := s.repo.UpdateBalance(tx, req.WalletID, delta); err != nil {
		tx.Rollback()
		return errors.New("failed to update balance")
	}

	return tx.Commit().Error
}

// ResetWallet resets wallet to specific balance (emergency use)
func (s *WalletService) ResetWallet(req *ResetWalletRequest, adminID uint) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Check if wallet exists
	wallet, err := s.repo.FindByID(req.WalletID)
	if err != nil {
		tx.Rollback()
		return err
	}

	oldBalance := wallet.Balance
	delta := req.NewBalance - oldBalance

	// Create adjustment transaction
	direction := "credit"
	amount := delta
	if delta < 0 {
		direction = "debit"
		amount = -delta
	}

	transaction := &WalletTransaction{
		WalletID:    req.WalletID,
		Type:        "adjustment",
		Amount:      amount,
		Direction:   direction,
		Status:      "success",
		Description: fmt.Sprintf("Wallet reset: %s (old balance: %d)", req.Reason, oldBalance),
		CreatedBy:   "admin",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		tx.Rollback()
		return errors.New("failed to create transaction")
	}

	// Set new balance
	if err := s.repo.SetBalance(tx, req.WalletID, req.NewBalance); err != nil {
		tx.Rollback()
		return errors.New("failed to reset balance")
	}

	return tx.Commit().Error
}

// GetAllTransactions gets all transactions with pagination and filters
func (s *WalletService) GetAllTransactions(params TransactionListParams) (*TransactionListResponse, error) {
	// Default pagination
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 20
	}

	transactions, total, err := s.repo.GetTransactions(params)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))

	return &TransactionListResponse{
		Transactions: transactions,
		Total:        total,
		Page:         params.Page,
		Limit:        params.Limit,
		TotalPages:   totalPages,
	}, nil
}

// GetWalletTransactions gets transactions for specific wallet
func (s *WalletService) GetWalletTransactions(walletID uint, limit int) ([]WalletTransaction, error) {
	// Check if wallet exists
	_, err := s.repo.FindByID(walletID)
	if err != nil {
		return nil, err
	}

	if limit < 1 {
		limit = 50
	}

	return s.repo.GetWalletTransactions(walletID, limit)
}

// RewardStudent handles Dosen giving points to student
func (s *WalletService) RewardStudent(req *AdjustmentRequest, dosenID uint) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Check if wallet exists
	_, err := s.repo.FindByID(req.WalletID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// Force Credit and Validate Amount
	if req.Amount <= 0 {
		tx.Rollback()
		return errors.New("amount must be positive")
	}

	// Create transaction record
	transaction := &WalletTransaction{
		WalletID:    req.WalletID,
		Type:        "adjustment",
		Amount:      req.Amount,
		Direction:   "credit",
		Status:      "success",
		Description: fmt.Sprintf("Reward from Dosen (ID: %d): %s", dosenID, req.Description),
		CreatedBy:   "dosen",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		tx.Rollback()
		return errors.New("failed to create transaction")
	}

	// Update balance (Credit adds to balance)
	if err := s.repo.UpdateBalance(tx, req.WalletID, req.Amount); err != nil {
		tx.Rollback()
		return errors.New("failed to update balance")
	}

	return tx.Commit().Error
}

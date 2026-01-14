package wallet

import (
	"errors"
	"fmt"
	"math"
	"sync"
	"time"

	"gorm.io/gorm"
)

type WalletService struct {
	repo   *WalletRepository
	db     *gorm.DB
	tokens map[string]*PaymentToken
	mu     sync.RWMutex
}

func NewWalletService(repo *WalletRepository, db *gorm.DB) *WalletService {
	return &WalletService{
		repo:   repo,
		db:     db,
		tokens: make(map[string]*PaymentToken),
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

// ProcessMissionReward credits a user's wallet for a completed mission
func (s *WalletService) ProcessMissionReward(studentID uint, amount int, missionTitle string, missionID uint, reviewerID uint) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get student's wallet
	wallet, err := s.repo.FindByUserID(studentID)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("student wallet not found: %v", err)
	}

	// Create transaction record
	transaction := &WalletTransaction{
		WalletID:    wallet.ID,
		Type:        "mission",
		Amount:      amount,
		Direction:   "credit",
		ReferenceID: &missionID,
		Status:      "success",
		Description: fmt.Sprintf("Reward for completing mission: %s", missionTitle),
		CreatedBy:   "dosen",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create transaction record: %v", err)
	}

	// Update balance
	if err := s.repo.UpdateBalance(tx, wallet.ID, amount); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update wallet balance: %v", err)
	}

	return tx.Commit().Error
}

// ProcessMissionRewardWithTx credits a user's wallet for a completed mission within an existing transaction
func (s *WalletService) ProcessMissionRewardWithTx(tx *gorm.DB, studentID uint, amount int, missionTitle string, missionID uint, reviewerID uint) error {
	if tx == nil {
		return errors.New("transaction required")
	}

	// Get student's wallet
	wallet, err := s.repo.FindByUserID(studentID)
	if err != nil {
		return fmt.Errorf("student wallet not found: %v", err)
	}

	// Create transaction record
	transaction := &WalletTransaction{
		WalletID:    wallet.ID,
		Type:        "mission",
		Amount:      amount,
		Direction:   "credit",
		ReferenceID: &missionID,
		Status:      "success",
		Description: fmt.Sprintf("Reward for completing mission: %s", missionTitle),
		CreatedBy:   "dosen",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		return fmt.Errorf("failed to create transaction record: %v", err)
	}

	// Update balance
	if err := s.repo.UpdateBalance(tx, wallet.ID, amount); err != nil {
		return fmt.Errorf("failed to update wallet balance: %v", err)
	}

	return nil
}

// GetLeaderboard gets top users
func (s *WalletService) GetLeaderboard(limit int) ([]WalletWithUser, error) {
	if limit < 1 {
		limit = 10
	}
	return s.repo.GetLeaderboard(limit)
}

// DebitWithTransaction debits a wallet within an existing transaction
func (s *WalletService) DebitWithTransaction(tx *gorm.DB, walletID uint, amount int, txType, description string) error {
	// Get wallet
	wallet, err := s.repo.FindByID(walletID)
	if err != nil {
		return fmt.Errorf("wallet not found: %v", err)
	}

	// Check balance
	if wallet.Balance < amount {
		return fmt.Errorf("insufficient balance. Current: %d, Required: %d", wallet.Balance, amount)
	}

	// Create transaction record
	transaction := &WalletTransaction{
		WalletID:    walletID,
		Type:        txType,
		Amount:      amount,
		Direction:   "debit",
		Status:      "success",
		Description: description,
		CreatedBy:   "system",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		return fmt.Errorf("failed to create debit transaction: %v", err)
	}

	// Update balance (negative for debit)
	if err := s.repo.UpdateBalance(tx, walletID, -amount); err != nil {
		return fmt.Errorf("failed to debit wallet: %v", err)
	}

	return nil
}

// CreditWithTransaction credits a wallet within an existing transaction
func (s *WalletService) CreditWithTransaction(tx *gorm.DB, walletID uint, amount int, txType, description string) error {
	// Get wallet
	_, err := s.repo.FindByID(walletID)
	if err != nil {
		return fmt.Errorf("wallet not found: %v", err)
	}

	// Create transaction record
	transaction := &WalletTransaction{
		WalletID:    walletID,
		Type:        txType,
		Amount:      amount,
		Direction:   "credit",
		Status:      "success",
		Description: description,
		CreatedBy:   "system",
	}

	if err := s.repo.CreateTransaction(tx, transaction); err != nil {
		return fmt.Errorf("failed to create credit transaction: %v", err)
	}

	// Update balance (positive for credit)
	if err := s.repo.UpdateBalance(tx, walletID, amount); err != nil {
		return fmt.Errorf("failed to credit wallet: %v", err)
	}

	return nil
}

// GeneratePaymentToken simulates generating a secure QR token for payment
func (s *WalletService) GeneratePaymentToken(userID uint, amount int, merchant string, txType string) (*PaymentToken, error) {
	wallet, err := s.repo.FindByUserID(userID)
	if err != nil {
		return nil, errors.New("wallet not found")
	}

	if wallet.Balance < amount {
		return nil, fmt.Errorf("insufficient balance for token generation. Current: %d, Required: %d", wallet.Balance, amount)
	}

	tokenCode := fmt.Sprintf("WPT-%d-%d", time.Now().Unix(), userID)

	paymentToken := &PaymentToken{
		Token:    tokenCode,
		Amount:   amount,
		Merchant: merchant,
		WalletID: wallet.ID,
		Type:     txType,
		Expiry:   time.Now().Add(10 * time.Minute),
	}

	// Store token
	s.mu.Lock()
	s.tokens[tokenCode] = paymentToken
	s.mu.Unlock()

	return paymentToken, nil
}

// ValidateAndConsumeToken verifies if a token is valid and removes it if successful
func (s *WalletService) ValidateAndConsumeToken(tokenCode string, userID uint, amount int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	token, exists := s.tokens[tokenCode]
	if !exists {
		return errors.New("invalid or expired QR token")
	}

	if time.Now().After(token.Expiry) {
		delete(s.tokens, tokenCode)
		return errors.New("QR token has expired")
	}

	// Verify wallet ownership
	wallet, err := s.repo.FindByUserID(userID)
	if err != nil || wallet.ID != token.WalletID {
		return errors.New("token does not belong to this user")
	}

	// Verify amount (optional, but good for security)
	if token.Amount != amount {
		return fmt.Errorf("token amount mismatch. Expected: %d, Found: %d", token.Amount, amount)
	}

	// Token is valid, consume it
	delete(s.tokens, tokenCode)
	return nil
}

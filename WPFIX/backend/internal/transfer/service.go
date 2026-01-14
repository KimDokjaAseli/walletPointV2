package transfer

import (
	"errors"
	"fmt"
	"wallet-point/internal/wallet"

	"gorm.io/gorm"
)

// Service handles business logic for transfers
type Service struct {
	repo          *Repository
	walletRepo    *wallet.WalletRepository
	walletService *wallet.WalletService
	db            *gorm.DB
}

// NewService creates a new transfer service
func NewService(repo *Repository, walletRepo *wallet.WalletRepository, walletService *wallet.WalletService, db *gorm.DB) *Service {
	return &Service{
		repo:          repo,
		walletRepo:    walletRepo,
		walletService: walletService,
		db:            db,
	}
}

// CreateTransfer handles the complete transfer process
// 1. Validate sender has sufficient balance
// 2. Validate receiver exists
// 3. Debit sender wallet
// 4. Credit receiver wallet
// 5. Create transfer record
// All operations are atomic (within a transaction)
func (s *Service) CreateTransfer(senderUserID, receiverUserID uint, amount int, description string) (*Transfer, error) {
	// Validation
	if senderUserID == receiverUserID {
		return nil, errors.New("cannot transfer to yourself")
	}

	if amount <= 0 {
		return nil, errors.New("transfer amount must be positive")
	}

	// Get sender wallet
	senderWallet, err := s.walletRepo.FindByUserID(senderUserID)
	if err != nil {
		return nil, errors.New("sender wallet not found")
	}

	// Get receiver wallet
	receiverWallet, err := s.walletRepo.FindByUserID(receiverUserID)
	if err != nil {
		return nil, errors.New("receiver wallet not found")
	}

	// Check sender balance
	if senderWallet.Balance < amount {
		return nil, fmt.Errorf("insufficient balance. Current: %d, Required: %d", senderWallet.Balance, amount)
	}

	// Create transfer object
	transfer := &Transfer{
		SenderWalletID:   senderWallet.ID,
		ReceiverWalletID: receiverWallet.ID,
		Amount:           amount,
		Description:      description,
		Status:           "success",
	}

	// Execute atomic transaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Debit sender wallet
		if err := s.walletService.DebitWithTransaction(tx, senderWallet.ID, amount, "transfer_out", fmt.Sprintf("Transfer to user %d: %s", receiverUserID, description)); err != nil {
			return err
		}

		// 2. Credit receiver wallet
		if err := s.walletService.CreditWithTransaction(tx, receiverWallet.ID, amount, "transfer_in", fmt.Sprintf("Transfer from user %d: %s", senderUserID, description)); err != nil {
			return err
		}

		// 3. Create transfer record
		if err := s.repo.CreateWithTransaction(tx, transfer); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		transfer.Status = "failed"
		return transfer, err
	}

	return transfer, nil
}

// GetTransferByID retrieves a transfer by ID
func (s *Service) GetTransferByID(id uint) (*Transfer, error) {
	return s.repo.FindByID(id)
}

// GetUserTransfers retrieves all transfers for a user (sent or received)
func (s *Service) GetUserTransfers(userID uint, limit, offset int) ([]Transfer, int64, error) {
	// Get user's wallet
	userWallet, err := s.walletRepo.FindByUserID(userID)
	if err != nil {
		return nil, 0, errors.New("wallet not found")
	}

	return s.repo.FindByWallet(userWallet.ID, limit, offset)
}

// GetSentTransfers retrieves transfers sent by a user
func (s *Service) GetSentTransfers(userID uint, limit, offset int) ([]Transfer, int64, error) {
	userWallet, err := s.walletRepo.FindByUserID(userID)
	if err != nil {
		return nil, 0, errors.New("wallet not found")
	}

	return s.repo.FindBySenderWallet(userWallet.ID, limit, offset)
}

// GetReceivedTransfers retrieves transfers received by a user
func (s *Service) GetReceivedTransfers(userID uint, limit, offset int) ([]Transfer, int64, error) {
	userWallet, err := s.walletRepo.FindByUserID(userID)
	if err != nil {
		return nil, 0, errors.New("wallet not found")
	}

	return s.repo.FindByReceiverWallet(userWallet.ID, limit, offset)
}

// GetAllTransfers retrieves all transfers (admin only)
func (s *Service) GetAllTransfers(limit, offset int) ([]Transfer, int64, error) {
	return s.repo.FindAll(limit, offset)
}

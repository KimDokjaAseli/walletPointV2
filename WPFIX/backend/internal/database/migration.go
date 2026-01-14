package database

import (
	"log"
	"wallet-point/internal/audit"
	"wallet-point/internal/auth"
	"wallet-point/internal/marketplace"
	"wallet-point/internal/mission"
	"wallet-point/internal/transfer"
	"wallet-point/internal/wallet"

	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) {
	log.Println("🔄 Running database migrations...")

	// Manual Fix: Ensure enum types are updated (GORM AutoMigrate doesn't update existing enums)
	db.Exec("ALTER TABLE missions MODIFY COLUMN type ENUM('quiz', 'task', 'assignment') NOT NULL")
	db.Exec("ALTER TABLE mission_submissions MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'")

	err := db.AutoMigrate(
		&auth.User{},
		&wallet.Wallet{},
		&wallet.WalletTransaction{},
		&transfer.Transfer{},
		&marketplace.Product{},
		&marketplace.MarketplaceTransaction{},
		&audit.AuditLog{},
		&mission.Mission{},
		&mission.MissionQuestion{},
		&mission.MissionSubmission{},
	)

	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}

	log.Println("✅ Database migration completed")
}

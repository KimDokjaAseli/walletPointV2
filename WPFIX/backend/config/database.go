package config

import (
	"fmt"
	"log"
	"time"
	"wallet-point/internal/audit"
	"wallet-point/internal/auth"
	"wallet-point/internal/marketplace"
	"wallet-point/internal/mission"
	"wallet-point/internal/wallet"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectDB(cfg *Config) *gorm.DB {
	// Build DSN (Data Source Name)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
	)

	// Configure GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	}

	// Connect to database
	db, err := gorm.Open(mysql.Open(dsn), gormConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Get underlying SQL DB for connection pool configuration
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)           // Maximum idle connections
	sqlDB.SetMaxOpenConns(100)          // Maximum open connections
	sqlDB.SetConnMaxLifetime(time.Hour) // Connection lifetime

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("✅ Database connected successfully")

	// Clean up old/broken constraints from previous database states
	db.Exec("ALTER TABLE missions DROP CONSTRAINT IF EXISTS `chk_mission_points_positive`")
	db.Exec("ALTER TABLE missions DROP CONSTRAINT IF EXISTS `chk_task_points_positive`")

	// Run migrations
	err = db.AutoMigrate(
		&auth.User{},
		&wallet.Wallet{},
		&wallet.WalletTransaction{},
		&marketplace.Product{},
		&audit.AuditLog{},
		&mission.Mission{},
		&mission.MissionSubmission{},
	)
	if err != nil {
		log.Printf("⚠️ Migration warning: %v", err)
	} else {
		log.Println("🚀 Database migrated successfully")
	}

	// Re-add correct constraints with correct column names
	db.Exec("ALTER TABLE missions ADD CONSTRAINT `chk_mission_points_positive` CHECK (`points` > 0)")

	return db
}

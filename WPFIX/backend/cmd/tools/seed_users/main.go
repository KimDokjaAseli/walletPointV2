package main

import (
	"fmt"
	"log"
	"os"

	"wallet-point/internal/auth"
	"wallet-point/internal/wallet"

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	godotenv.Load()

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	users := []auth.User{
		{
			Email:        "admin@campus.edu",
			PasswordHash: "Password123!",
			FullName:     "System Administrator",
			NimNip:       "ADMIN001",
			Role:         "admin",
			Status:       "active",
		},
		{
			Email:        "dosen@campus.edu",
			PasswordHash: "Password123!",
			FullName:     "Dr. Dosen Pembimbing",
			NimNip:       "DOSEN001",
			Role:         "dosen",
			Status:       "active",
		},
		{
			Email:        "mhs@campus.edu",
			PasswordHash: "Password123!",
			FullName:     "Mahasiswa Teladan",
			NimNip:       "MHS001",
			Role:         "mahasiswa",
			Status:       "active",
		},
	}

	for _, u := range users {
		var existing auth.User
		if err := db.Where("email = ?", u.Email).First(&existing).Error; err == nil {
			fmt.Printf("User %s already exists\n", u.Email)
			// Update NIM if missing
			if existing.NimNip == "" {
				db.Model(&existing).Update("nim_nip", u.NimNip)
			}
			continue
		}

		if err := db.Create(&u).Error; err != nil {
			log.Printf("Failed to create %s: %v", u.Email, err)
			continue
		}

		// Create Wallet
		wallet := wallet.Wallet{
			UserID:  u.ID,
			Balance: 0,
		}
		db.Create(&wallet)
		fmt.Printf("Created user: %s (Password: Password123!)\n", u.Email)
	}
}

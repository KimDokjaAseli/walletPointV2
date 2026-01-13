package main

import (
	"fmt"
	"log"
	"os"

	"wallet-point/internal/auth"

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

	var user auth.User
	err = db.Where("email = ?", "dosen@campus.edu").First(&user).Error
	if err != nil {
		log.Fatalf("User dosen@campus.edu NOT FOUND: %v", err)
	}

	fmt.Printf("Details for dosen@campus.edu:\n")
	fmt.Printf("- ID: %d\n", user.ID)
	fmt.Printf("- PasswordHash (DB): '%s'\n", user.PasswordHash)
	fmt.Printf("- Status: %s\n", user.Status)
}

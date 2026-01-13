package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Load .env explicitly since this tool might be run from different pwd
	godotenv.Load()

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "walletpoint_db"
	}

	// Connect without DB name
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local", dbUser, dbPass, dbHost, dbPort)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}

	// Create Database
	err = db.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s`", dbName)).Error
	if err != nil {
		log.Fatalf("Failed to create database: %v", err)
	}

	fmt.Printf("✅ Database '%s' created successfully (or already exists).\n", dbName)
}

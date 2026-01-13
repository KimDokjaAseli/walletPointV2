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

	// Check table schema
	var result []struct {
		Field   string
		Type    string
		Null    string
		Key     string
		Default *string
		Extra   string
	}
	db.Raw("DESCRIBE missions").Scan(&result)

	fmt.Println("Missions Table Structure:")
	for _, row := range result {
		fmt.Printf("- %s: %s (Null: %s, Key: %s, Default: %v)\n", row.Field, row.Type, row.Null, row.Key, row.Default)
	}

	// Check for constraints (MySQL 8.0.16+)
	var constraints []struct {
		ConstraintName string `gorm:"column:CONSTRAINT_NAME"`
		CheckClause    string `gorm:"column:CHECK_CLAUSE"`
	}
	db.Raw("SELECT CONSTRAINT_NAME, CHECK_CLAUSE FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ?", os.Getenv("DB_NAME")).Scan(&constraints)
	fmt.Println("\nCheck Constraints:")
	for _, c := range constraints {
		fmt.Printf("- %s: %s\n", c.ConstraintName, c.CheckClause)
	}
}

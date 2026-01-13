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

	tables := []string{"missions", "wallets", "wallet_transactions"}
	for _, t := range tables {
		fmt.Printf("\n--- Table: %s ---\n", t)
		var result []struct {
			Field   string
			Type    string
			Null    string
			Key     string
			Default *string
			Extra   string
		}
		db.Raw("DESCRIBE " + t).Scan(&result)
		for _, row := range result {
			fmt.Printf("- %s: %s\n", row.Field, row.Type)
		}
	}

	var constraints []struct {
		TableName      string `gorm:"column:TABLE_NAME"`
		ConstraintName string `gorm:"column:CONSTRAINT_NAME"`
		CheckClause    string `gorm:"column:CHECK_CLAUSE"`
	}
	db.Raw(`
        SELECT TABLE_NAME, CONSTRAINT_NAME, CHECK_CLAUSE 
        FROM information_schema.TABLE_CONSTRAINTS 
        JOIN information_schema.CHECK_CONSTRAINTS USING (CONSTRAINT_CATALOG, CONSTRAINT_SCHEMA, CONSTRAINT_NAME)
        WHERE CONSTRAINT_SCHEMA = ?
    `, os.Getenv("DB_NAME")).Scan(&constraints)

	fmt.Println("\nCheck Constraints Mapping:")
	for _, c := range constraints {
		fmt.Printf("- Table [%s]: %s -> %s\n", c.TableName, c.ConstraintName, c.CheckClause)
	}
}

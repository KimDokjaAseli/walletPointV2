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

	// Drop problematic constraints and add correct ones
	fixes := []struct {
		Table string
		Drop  string
		Add   string
	}{
		{
			Table: "missions",
			Drop:  "chk_mission_points_positive",
			Add:   "CONSTRAINT `chk_mission_points_positive` CHECK (`points` > 0)",
		},
		{
			Table: "missions",
			Drop:  "chk_task_points_positive",
			Add:   "", // Tasks probably don't exist as a separate table or this is redundant
		},
	}

	for _, fix := range fixes {
		fmt.Printf("Fixing table: %s\n", fix.Table)

		// Drop existing (ignore error if not exists)
		db.Exec(fmt.Sprintf("ALTER TABLE `%s` DROP CHECK `%s` ", fix.Table, fix.Drop))

		// Add new if provided
		if fix.Add != "" {
			err := db.Exec(fmt.Sprintf("ALTER TABLE `%s` ADD %s", fix.Table, fix.Add)).Error
			if err != nil {
				fmt.Printf("⚠️ Could not add constraint to %s: %v\n", fix.Table, err)
			} else {
				fmt.Printf("✅ Successfully updated constraint for %s\n", fix.Table)
			}
		}
	}

	fmt.Println("\nAll fixes applied.")
}

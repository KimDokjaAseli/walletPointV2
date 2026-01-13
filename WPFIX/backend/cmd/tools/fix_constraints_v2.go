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

	// Try DROP CONSTRAINT instead of DROP CHECK
	constraints := []string{"chk_mission_points_positive", "chk_task_points_positive"}

	for _, c := range constraints {
		fmt.Printf("Attempting to drop constraint: %s\n", c)
		db.Exec(fmt.Sprintf("ALTER TABLE missions DROP CONSTRAINT `%s` ", c))
	}

	fmt.Println("Adding correct constraint...")
	err = db.Exec("ALTER TABLE missions ADD CONSTRAINT `chk_mission_points_positive` CHECK (`points` > 0)").Error
	if err != nil {
		fmt.Printf("⚠️ Error adding constraint: %v\n", err)
	} else {
		fmt.Println("✅ Success!")
	}
}

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

	fmt.Println("🚀 Sedang mereset tabel misi agar bersih dari struktur lama...")

	// Hapus tabel yang bermasalah (Submissions harus dihapus dulu karena ada Foreign Key)
	db.Exec("DROP TABLE IF EXISTS mission_submissions")
	db.Exec("DROP TABLE IF EXISTS missions")

	fmt.Println("✅ Tabel berhasil dihapus. Silakan restart server backend untuk membuatnya ulang.")
}

package routes

import (
	"wallet-point/internal/audit"
	"wallet-point/internal/auth"
	"wallet-point/internal/marketplace"
	"wallet-point/internal/mission"
	"wallet-point/internal/user"
	"wallet-point/internal/wallet"
	"wallet-point/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, allowedOrigins string, jwtExpiry int) {
	// Apply global middleware
	r.Use(middleware.CORS(allowedOrigins))
	r.Use(middleware.Logger())

	// API v1 group
	api := r.Group("/api/v1")

	// Initialize repositories
	authRepo := auth.NewAuthRepository(db)
	userRepo := user.NewUserRepository(db)
	walletRepo := wallet.NewWalletRepository(db)
	marketplaceRepo := marketplace.NewMarketplaceRepository(db)
	auditRepo := audit.NewAuditRepository(db)
	missionRepo := mission.NewMissionRepository(db)

	// Initialize services
	authService := auth.NewAuthService(authRepo, jwtExpiry)
	userService := user.NewUserService(userRepo)
	walletService := wallet.NewWalletService(walletRepo, db)
	marketplaceService := marketplace.NewMarketplaceService(marketplaceRepo)
	auditService := audit.NewAuditService(auditRepo)
	missionService := mission.NewMissionService(missionRepo, db)

	// Initialize handlers
	authHandler := auth.NewAuthHandler(authService)
	userHandler := user.NewUserHandler(userService)
	walletHandler := wallet.NewWalletHandler(walletService)
	marketplaceHandler := marketplace.NewMarketplaceHandler(marketplaceService)
	auditHandler := audit.NewAuditHandler(auditService)
	missionHandler := mission.NewMissionHandler(missionService)

	// ========================================
	// PUBLIC ROUTES
	// ========================================
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		authGroup.GET("/me", middleware.AuthMiddleware(), authHandler.Me)
	}

	// ========================================
	// ADMIN ROUTES
	// ========================================
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.AuthMiddleware())
	adminGroup.Use(middleware.RoleMiddleware("admin"))
	{
		// User Management
		adminGroup.POST("/users", authHandler.Register) // Create new user
		adminGroup.GET("/users", userHandler.GetAll)
		adminGroup.GET("/users/:id", userHandler.GetByID)
		adminGroup.PUT("/users/:id", userHandler.Update)
		adminGroup.DELETE("/users/:id", userHandler.Deactivate)
		adminGroup.PUT("/users/:id/password", userHandler.ChangePassword)

		// Wallet Management
		adminGroup.GET("/wallets", walletHandler.GetAllWallets)
		adminGroup.GET("/wallets/:id", walletHandler.GetWalletByID)
		adminGroup.GET("/wallets/:id/transactions", walletHandler.GetWalletTransactions)
		adminGroup.POST("/wallet/adjustment", walletHandler.AdjustPoints)
		adminGroup.POST("/wallet/reset", walletHandler.ResetWallet)

		// Transaction Monitoring
		adminGroup.GET("/transactions", walletHandler.GetAllTransactions)

		// Marketplace Management
		adminGroup.GET("/products", marketplaceHandler.GetAll)
		adminGroup.POST("/products", marketplaceHandler.Create)
		adminGroup.GET("/products/:id", marketplaceHandler.GetByID)
		adminGroup.PUT("/products/:id", marketplaceHandler.Update)
		adminGroup.DELETE("/products/:id", marketplaceHandler.Delete)

		// Audit Logs
		adminGroup.GET("/audit-logs", auditHandler.GetAll)
	}

	// ========================================
	// DOSEN ROUTES
	// ========================================
	dosenGroup := api.Group("/dosen")
	dosenGroup.Use(middleware.AuthMiddleware())
	dosenGroup.Use(middleware.RoleMiddleware("dosen"))
	{
		// Mission & Task Management
		dosenGroup.POST("/missions", missionHandler.CreateMission)
		dosenGroup.PUT("/missions/:id", missionHandler.UpdateMission)
		dosenGroup.DELETE("/missions/:id", missionHandler.DeleteMission)
		dosenGroup.GET("/missions", missionHandler.GetAllMissions)
		dosenGroup.GET("/missions/:id", missionHandler.GetMissionByID)

		// Submission Validation
		dosenGroup.GET("/submissions", missionHandler.GetAllSubmissions)
		dosenGroup.POST("/submissions/:id/review", missionHandler.ReviewSubmission)

		// Student Monitoring & Credit
		dosenGroup.GET("/students", userHandler.GetStudents)
		dosenGroup.POST("/wallet/credit", walletHandler.CreditStudent)
		dosenGroup.GET("/wallets/:id/transactions", walletHandler.GetWalletTransactions)
	}

	// ========================================
	// MAHASISWA ROUTES
	// ========================================
	mahasiswaGroup := api.Group("/mahasiswa")
	mahasiswaGroup.Use(middleware.AuthMiddleware())
	mahasiswaGroup.Use(middleware.RoleMiddleware("mahasiswa"))
	{
		// Mission & Task Submission
		mahasiswaGroup.GET("/missions", missionHandler.GetAllMissions)
		mahasiswaGroup.GET("/missions/:id", missionHandler.GetMissionByID)
		mahasiswaGroup.POST("/missions/submit", missionHandler.SubmitMission)
		mahasiswaGroup.GET("/submissions", missionHandler.GetAllSubmissions)

		// TODO: View wallet
		// TODO: Transfer points
		// TODO: Marketplace purchase
		// TODO: External sync
	}

	// Health check
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Wallet Point API is running",
		})
	})
}

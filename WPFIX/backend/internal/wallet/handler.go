package wallet

import (
	"net/http"
	"strconv"
	"wallet-point/utils"

	"github.com/gin-gonic/gin"
)

type WalletHandler struct {
	service *WalletService
}

func NewWalletHandler(service *WalletService) *WalletHandler {
	return &WalletHandler{service: service}
}

// GetAllWallets handles getting all wallets
// @Summary Get all wallets
// @Description Get list of all wallets with user information (Admin only)
// @Tags Admin - Wallets
// @Security BearerAuth
// @Produce json
// @Success 200 {object} utils.Response{data=[]WalletWithUser}
// @Failure 401 {object} utils.Response
// @Failure 403 {object} utils.Response
// @Router /admin/wallets [get]
func (h *WalletHandler) GetAllWallets(c *gin.Context) {
	wallets, err := h.service.GetAllWallets()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve wallets", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Wallets retrieved successfully", wallets)
}

// GetWalletByID handles getting wallet by ID
// @Summary Get wallet by ID
// @Description Get wallet details by ID (Admin only)
// @Tags Admin - Wallets
// @Security BearerAuth
// @Produce json
// @Param id path int true "Wallet ID"
// @Success 200 {object} utils.Response{data=Wallet}
// @Failure 404 {object} utils.Response
// @Router /admin/wallets/{id} [get]
func (h *WalletHandler) GetWalletByID(c *gin.Context) {
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid wallet ID", nil)
		return
	}

	wallet, err := h.service.GetWalletByID(uint(walletID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Wallet retrieved successfully", wallet)
}

// AdjustPoints handles manual point adjustment
// @Summary Adjust wallet points
// @Description Manually adjust wallet points (Admin only)
// @Tags Admin - Wallets
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body AdjustmentRequest true "Adjustment details"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /admin/wallet/adjustment [post]
func (h *WalletHandler) AdjustPoints(c *gin.Context) {
	adminID := c.GetUint("user_id")

	var req AdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.service.AdjustPoints(&req, adminID); err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "wallet not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Points adjusted successfully", nil)
}

// ResetWallet handles wallet reset
// @Summary Reset wallet balance
// @Description Reset wallet to specific balance (Admin only - Emergency use)
// @Tags Admin - Wallets
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body ResetWalletRequest true "Reset details"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils. Response
// @Router /admin/wallet/reset [post]
func (h *WalletHandler) ResetWallet(c *gin.Context) {
	adminID := c.GetUint("user_id")

	var req ResetWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.service.ResetWallet(&req, adminID); err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "wallet not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Wallet reset successfully", nil)
}

// GetAllTransactions handles getting all transactions
// @Summary Get all transactions
// @Description Get list of all transactions with filters (Admin only)
// @Tags Admin - Transactions
// @Security BearerAuth
// @Produce json
// @Param type query string false "Filter by type"
// @Param status query string false "Filter by status"
// @Param direction query string false "Filter by direction"
// @Param from_date query string false "Filter from date (YYYY-MM-DD)"
// @Param to_date query string false "Filter to date (YYYY-MM-DD)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response{data=TransactionListResponse}
// @Failure 401 {object} utils.Response
// @Router /admin/transactions [get]
func (h *WalletHandler) GetAllTransactions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	params := TransactionListParams{
		Type:      c.Query("type"),
		Status:    c.Query("status"),
		Direction: c.Query("direction"),
		FromDate:  c.Query("from_date"),
		ToDate:    c.Query("to_date"),
		Page:      page,
		Limit:     limit,
	}

	response, err := h.service.GetAllTransactions(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve transactions", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved successfully", response)
}

// GetWalletTransactions handles getting transactions for specific wallet
// @Summary Get wallet transactions
// @Description Get transaction history for specific wallet (Admin only)
// @Tags Admin - Wallets
// @Security BearerAuth
// @Produce json
// @Param id path int true "Wallet ID"
// @Param limit query int false "Number of transactions" default(50)
// @Success 200 {object} utils.Response{data=[]WalletTransaction}
// @Failure 404 {object} utils.Response
// @Router /admin/wallets/{id}/transactions [get]
func (h *WalletHandler) GetWalletTransactions(c *gin.Context) {
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid wallet ID", nil)
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	transactions, err := h.service.GetWalletTransactions(uint(walletID), limit)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "wallet not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved successfully", transactions)
}

// CreditStudent handles Dosen giving points to student
// @Summary Credit points to student
// @Description Give points directly to a student wallet (Dosen only)
// @Tags Dosen - Wallets
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body AdjustmentRequest true "Credit details"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 404 {object} utils.Response
// @Router /dosen/wallet/credit [post]
func (h *WalletHandler) CreditStudent(c *gin.Context) {
	dosenID := c.GetUint("user_id")

	var req AdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.service.RewardStudent(&req, dosenID); err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "wallet not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Points credited successfully", nil)
}

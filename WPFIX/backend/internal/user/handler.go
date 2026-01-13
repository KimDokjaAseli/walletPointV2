package user

import (
	"net/http"
	"strconv"
	"wallet-point/utils"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service *UserService
}

func NewUserHandler(service *UserService) *UserHandler {
	return &UserHandler{service: service}
}

// GetAll handles getting all users
// @Summary Get all users
// @Description Get list of all users with pagination and filters (Admin only)
// @Tags Admin - Users
// @Security BearerAuth
// @Produce json
// @Param role query string false "Filter by role" Enums(admin, dosen, mahasiswa)
// @Param status query string false "Filter by status" Enums(active, inactive, suspended)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response{data=UserListResponse}
// @Failure 401 {object} utils.Response
// @Failure 403 {object} utils.Response
// @Router /admin/users [get]
func (h *UserHandler) GetAll(c *gin.Context) {
	// Parse query parameters
	role := c.Query("role")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	params := UserListParams{
		Role:   role,
		Status: status,
		Page:   page,
		Limit:  limit,
	}

	response, err := h.service.GetAllUsers(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve users", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", response)
}

// GetByID handles getting user by ID
// @Summary Get user by ID
// @Description Get user details by ID (Admin only)
// @Tags Admin - Users
// @Security BearerAuth
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} utils.Response{data=UserWithWallet}
// @Failure 404 {object} utils.Response
// @Router /admin/users/{id} [get]
func (h *UserHandler) GetByID(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", nil)
		return
	}

	user, err := h.service.GetUserByID(uint(userID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User retrieved successfully", user)
}

// Update handles updating user
// @Summary Update user
// @Description Update user information (Admin only)
// @Tags Admin - Users
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param request body UpdateUserRequest true "Update data"
// @Success 200 {object} utils.Response{data=User}
// @Failure 400 {object} utils.Response
// @Failure 404 {object} utils.Response
// @Router /admin/users/{id} [put]
func (h *UserHandler) Update(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", nil)
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, err := h.service.UpdateUser(uint(userID), &req)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "user not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User updated successfully", user)
}

// Deactivate handles deactivating user
// @Summary Deactivate user
// @Description Deactivate user account (Admin only)
// @Tags Admin - Users
// @Security BearerAuth
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} utils.Response
// @Failure 404 {object} utils.Response
// @Router /admin/users/{id} [delete]
func (h *UserHandler) Deactivate(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", nil)
		return
	}

	if err := h.service.DeactivateUser(uint(userID)); err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "user not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User deactivated successfully", nil)
}

// ChangePassword handles changing user password
// @Summary Change user password
// @Description Change user password (Admin only)
// @Tags Admin - Users
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param request body ChangePasswordRequest true "New password"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 404 {object} utils.Response
// @Router /admin/users/{id}/password [put]
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid user ID", nil)
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.service.ChangeUserPassword(uint(userID), req.NewPassword); err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "user not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password changed successfully", nil)
}

// GetStudents handles getting student list for Dosen
// @Summary Get all students
// @Description Get list of all students for Dosen view
// @Tags Dosen - Students
// @Security BearerAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response{data=UserListResponse}
// @Failure 401 {object} utils.Response
// @Failure 403 {object} utils.Response
// @Router /dosen/students [get]
func (h *UserHandler) GetStudents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	params := UserListParams{
		Role:   "mahasiswa",
		Status: "active",
		Page:   page,
		Limit:  limit,
	}

	response, err := h.service.GetAllUsers(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve students", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Students retrieved successfully", response)
}

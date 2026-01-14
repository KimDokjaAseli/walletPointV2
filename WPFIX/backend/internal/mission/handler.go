package mission

import (
	"net/http"
	"strconv"
	"wallet-point/internal/audit"
	"wallet-point/utils"

	"github.com/gin-gonic/gin"
)

type MissionHandler struct {
	service      *MissionService
	auditService *audit.AuditService
}

func NewMissionHandler(service *MissionService, auditService *audit.AuditService) *MissionHandler {
	return &MissionHandler{service: service, auditService: auditService}
}

// ========================================
// MISSION MANAGEMENT (Admin & Dosen)
// ========================================

// GetAllMissions handles getting all missions
// @Summary Get all missions
// @Description Get list of missions with filters
// @Tags Missions
// @Security BearerAuth
// @Produce json
// @Param type query string false "Filter by type"
// @Param status query string false "Filter by status"
// @Param created_by query int false "Filter by creator"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response{data=MissionListResponse}
// @Router /missions [get]
func (h *MissionHandler) GetAllMissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	createdBy, _ := strconv.ParseUint(c.Query("created_by"), 10, 32)

	params := MissionListParams{
		Type:      c.Query("type"),
		Status:    c.Query("status"),
		CreatedBy: uint(createdBy),
		Page:      page,
		Limit:     limit,
	}

	response, err := h.service.GetAllMissions(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve missions", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Missions retrieved successfully", response)
}

// GetMissionByID handles getting mission by ID
// @Summary Get mission by ID
// @Description Get mission details
// @Tags Missions
// @Security BearerAuth
// @Produce json
// @Param id path int true "Mission ID"
// @Success 200 {object} utils.Response{data=Mission}
// @Router /missions/{id} [get]
func (h *MissionHandler) GetMissionByID(c *gin.Context) {
	missionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid mission ID", nil)
		return
	}

	mission, err := h.service.GetMissionByID(uint(missionID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Mission retrieved successfully", mission)
}

// CreateMission handles creating new mission (Dosen only)
// @Summary Create mission
// @Description Create a new mission
// @Tags Dosen - Missions
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body CreateMissionRequest true "Mission details"
// @Success 201 {object} utils.Response{data=Mission}
// @Router /dosen/missions [post]
func (h *MissionHandler) CreateMission(c *gin.Context) {
	dosenID := c.GetUint("user_id")

	var req CreateMissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	mission, err := h.service.CreateMission(&req, dosenID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Mission created successfully", mission)

	// Log activity
	h.auditService.LogActivity(audit.CreateAuditParams{
		UserID:    dosenID,
		Action:    "CREATE_MISSION",
		Entity:    "MISSION",
		EntityID:  mission.ID,
		Details:   "Dosen created new mission: " + mission.Title,
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})
}

// UpdateMission handles updating mission
// @Summary Update mission
// @Description Update mission details
// @Tags Dosen - Missions
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Mission ID"
// @Param request body UpdateMissionRequest true "Update data"
// @Success 200 {object} utils.Response{data=Mission}
// @Router /dosen/missions/{id} [put]
func (h *MissionHandler) UpdateMission(c *gin.Context) {
	missionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid mission ID", nil)
		return
	}

	var req UpdateMissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	mission, err := h.service.UpdateMission(uint(missionID), &req)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "mission not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Mission updated successfully", mission)

	// Log activity
	dosenID := c.GetUint("user_id")
	h.auditService.LogActivity(audit.CreateAuditParams{
		UserID:    dosenID,
		Action:    "UPDATE_MISSION",
		Entity:    "MISSION",
		EntityID:  mission.ID,
		Details:   "Dosen updated mission: " + mission.Title,
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})
}

// DeleteMission handles deleting mission
// @Summary Delete mission
// @Description Delete mission
// @Tags Dosen - Missions
// @Security BearerAuth
// @Param id path int true "Mission ID"
// @Success 200 {object} utils.Response
// @Router /dosen/missions/{id} [delete]
func (h *MissionHandler) DeleteMission(c *gin.Context) {
	missionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid mission ID", nil)
		return
	}

	if err := h.service.DeleteMission(uint(missionID)); err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "mission not found" {
			statusCode = http.StatusNotFound
		}
		utils.ErrorResponse(c, statusCode, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Mission deleted successfully", nil)

	// Log activity
	dosenID := c.GetUint("user_id")
	h.auditService.LogActivity(audit.CreateAuditParams{
		UserID:    dosenID,
		Action:    "DELETE_MISSION",
		Entity:    "MISSION",
		EntityID:  uint(missionID),
		Details:   "Dosen deleted mission ID: " + strconv.FormatUint(missionID, 10),
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})
}

// ========================================
// SUBMISSION MANAGEMENT
// ========================================

// SubmitMission handles student submission
// @Summary Submit mission
// @Description Student submits mission work
// @Tags Mahasiswa - Missions
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body SubmitMissionRequest true "Submission data"
// @Success 201 {object} utils.Response{data=MissionSubmission}
// @Router /mahasiswa/missions/submit [post]
func (h *MissionHandler) SubmitMission(c *gin.Context) {
	studentID := c.GetUint("user_id")

	var req SubmitMissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	submission, err := h.service.SubmitMission(&req, studentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Mission submitted successfully", submission)

	// Log activity
	h.auditService.LogActivity(audit.CreateAuditParams{
		UserID:    studentID,
		Action:    "SUBMIT_MISSION",
		Entity:    "SUBMISSION",
		EntityID:  submission.ID,
		Details:   "Student submitted mission work",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})
}

// GetAllSubmissions handles getting submissions
// @Summary Get submissions
// @Description Get mission submissions with filters
// @Tags Missions
// @Security BearerAuth
// @Produce json
// @Param mission_id query int false "Filter by mission"
// @Param student_id query int false "Filter by student"
// @Param status query string false "Filter by status"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response{data=SubmissionListResponse}
// @Router /missions/submissions [get]
func (h *MissionHandler) GetAllSubmissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	missionID, _ := strconv.ParseUint(c.Query("mission_id"), 10, 32)
	studentID, _ := strconv.ParseUint(c.Query("student_id"), 10, 32)

	params := SubmissionListParams{
		MissionID: uint(missionID),
		StudentID: uint(studentID),
		Status:    c.Query("status"),
		Page:      page,
		Limit:     limit,
	}

	response, err := h.service.GetAllSubmissions(params)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve submissions", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Submissions retrieved successfully", response)
}

// ReviewSubmission handles reviewing student submission
// @Summary Review submission
// @Description Dosen reviews and approves/rejects submission
// @Tags Dosen - Missions
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Submission ID"
// @Param request body ReviewSubmissionRequest true "Review data"
// @Success 200 {object} utils.Response
// @Router /dosen/submissions/{id}/review [post]
func (h *MissionHandler) ReviewSubmission(c *gin.Context) {
	dosenID := c.GetUint("user_id")
	submissionID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid submission ID", nil)
		return
	}

	var req ReviewSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.service.ReviewSubmission(uint(submissionID), &req, dosenID); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Submission reviewed successfully", nil)

	// Log activity
	h.auditService.LogActivity(audit.CreateAuditParams{
		UserID:    dosenID,
		Action:    "REVIEW_SUBMISSION",
		Entity:    "SUBMISSION",
		EntityID:  uint(submissionID),
		Details:   "Dosen reviewed submission: " + req.Status,
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})
}

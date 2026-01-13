package mission

import (
	"time"
)

type Mission struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	Title          string     `json:"title" gorm:"not null"`
	Description    string     `json:"description" gorm:"type:text"`
	Type           string     `json:"type" gorm:"type:enum('quiz','task','assignment');not null"`
	Points         int        `json:"points" gorm:"not null"`
	Deadline       *time.Time `json:"deadline"`
	Status         string     `json:"status" gorm:"type:enum('active','inactive','expired');default:'active'"`
	SubmissionType string     `json:"submission_type" gorm:"type:enum('image','file','link','text');default:'text'"`
	CreatedBy      uint       `json:"created_by" gorm:"not null"` // Dosen ID
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (Mission) TableName() string {
	return "missions"
}

type MissionSubmission struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	MissionID  uint      `json:"mission_id" gorm:"not null;index"`
	StudentID  uint      `json:"student_id" gorm:"not null;index"`
	Content    string    `json:"content" gorm:"type:text"`
	FileURL    string    `json:"file_url" gorm:"size:500"`
	Score      int       `json:"score" gorm:"default:0"`
	Status     string    `json:"status" gorm:"type:enum('pending','approved','rejected');default:'pending'"`
	ReviewedBy uint      `json:"reviewed_by"`
	ReviewNote string    `json:"review_note" gorm:"type:text"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (MissionSubmission) TableName() string {
	return "mission_submissions"
}

type CreateMissionRequest struct {
	Title          string     `json:"title" binding:"required"`
	Description    string     `json:"description"`
	Type           string     `json:"type" binding:"required,oneof=quiz task assignment"`
	Points         int        `json:"points" binding:"required,gt=0"`
	Deadline       *time.Time `json:"deadline"`
	SubmissionType string     `json:"submission_type" binding:"required,oneof=image file link text"`
}

type UpdateMissionRequest struct {
	Title          string     `json:"title,omitempty"`
	Description    string     `json:"description,omitempty"`
	Points         int        `json:"points,omitempty" binding:"omitempty,gt=0"`
	Deadline       *time.Time `json:"deadline,omitempty"`
	Status         string     `json:"status,omitempty" binding:"omitempty,oneof=active inactive expired"`
	SubmissionType string     `json:"submission_type,omitempty" binding:"omitempty,oneof=image file link text"`
}

type SubmitMissionRequest struct {
	MissionID uint   `json:"mission_id" binding:"required"`
	Content   string `json:"content"`
	FileURL   string `json:"file_url"`
}

type ReviewSubmissionRequest struct {
	Status     string `json:"status" binding:"required,oneof=approved rejected"`
	Score      int    `json:"score" binding:"gte=0"`
	ReviewNote string `json:"review_note"`
}

type MissionWithCreator struct {
	Mission
	CreatorName  string `json:"creator_name"`
	CreatorEmail string `json:"creator_email"`
}

type SubmissionWithDetails struct {
	MissionSubmission
	MissionTitle string `json:"mission_title"`
	StudentName  string `json:"student_name"`
	StudentNim   string `json:"student_nim"`
	ReviewerName string `json:"reviewer_name,omitempty"`
}

type MissionListParams struct {
	Type      string
	Status    string
	CreatedBy uint
	Page      int
	Limit     int
}

type MissionListResponse struct {
	Missions   []MissionWithCreator `json:"missions"`
	Total      int64                `json:"total"`
	Page       int                  `json:"page"`
	Limit      int                  `json:"limit"`
	TotalPages int                  `json:"total_pages"`
}

type SubmissionListParams struct {
	MissionID uint
	StudentID uint
	Status    string
	Page      int
	Limit     int
}

type SubmissionListResponse struct {
	Submissions []SubmissionWithDetails `json:"submissions"`
	Total       int64                   `json:"total"`
	Page        int                     `json:"page"`
	Limit       int                     `json:"limit"`
	TotalPages  int                     `json:"total_pages"`
}

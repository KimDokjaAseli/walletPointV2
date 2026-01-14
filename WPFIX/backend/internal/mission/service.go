package mission

import (
	"errors"
	"math"
	"wallet-point/internal/wallet"

	"gorm.io/gorm"
)

type MissionService struct {
	repo          *MissionRepository
	walletService *wallet.WalletService
	db            *gorm.DB
}

func NewMissionService(repo *MissionRepository, walletService *wallet.WalletService, db *gorm.DB) *MissionService {
	return &MissionService{
		repo:          repo,
		walletService: walletService,
		db:            db,
	}
}

// Mission Management
func (s *MissionService) CreateMission(req *CreateMissionRequest, creatorID uint) (*Mission, error) {
	mission := &Mission{
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		Points:      req.Points,
		Deadline:    req.Deadline,
		Status:      "active",
		CreatorID:   creatorID,
	}

	if req.Type == "quiz" && len(req.Questions) > 0 {
		for _, q := range req.Questions {
			mission.Questions = append(mission.Questions, MissionQuestion{
				Question: q.Question,
				Options:  q.Options,
				Answer:   q.Answer,
			})
		}
	}

	if err := s.repo.Create(mission); err != nil {
		return nil, err
	}

	return mission, nil
}

func (s *MissionService) GetMissionByID(id uint) (*Mission, error) {
	return s.repo.FindByID(id)
}

func (s *MissionService) GetAllMissions(params MissionListParams) (*MissionListResponse, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 20
	}

	missions, total, err := s.repo.FindAll(params)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))

	return &MissionListResponse{
		Missions:   missions,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *MissionService) UpdateMission(id uint, req *UpdateMissionRequest) (*Mission, error) {
	// Check if exists
	_, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Points > 0 {
		updates["points_reward"] = req.Points
	}
	if req.Deadline != nil {
		updates["deadline"] = req.Deadline
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	if len(updates) > 0 {
		if err := s.repo.Update(id, updates); err != nil {
			return nil, err
		}
	}

	return s.repo.FindByID(id)
}

func (s *MissionService) DeleteMission(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	return s.repo.Delete(id)
}

// Submission Management
func (s *MissionService) SubmitMission(req *SubmitMissionRequest, studentID uint) (*MissionSubmission, error) {
	// Check if mission exists
	mission, err := s.repo.FindByID(req.MissionID)
	if err != nil {
		return nil, err
	}

	// Check deadline
	if mission.Deadline != nil && mission.Deadline.Before(s.db.NowFunc()) {
		return nil, errors.New("mission deadline has passed")
	}

	// Check duplicate submission
	exists, err := s.repo.CheckDuplicateSubmission(req.MissionID, studentID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("you have already submitted this mission")
	}

	submission := &MissionSubmission{
		MissionID: req.MissionID,
		StudentID: studentID,
		Content:   req.Content,
		FileURL:   req.FileURL,
		Status:    "pending",
	}

	if err := s.repo.CreateSubmission(submission); err != nil {
		return nil, err
	}

	return submission, nil
}

func (s *MissionService) ReviewSubmission(submissionID uint, req *ReviewSubmissionRequest, reviewerID uint) error {
	submission, err := s.repo.FindSubmissionByID(submissionID)
	if err != nil {
		return err
	}

	if submission.Status != "pending" {
		return errors.New("submission has already been reviewed")
	}

	// Start a transaction for the review and potential wallet reward
	return s.db.Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{
			"status":          req.Status,
			"score":           req.Score,
			"validation_note": req.ReviewNote,
			"validated_by":    reviewerID,
		}

		// Update submission status
		if err := s.repo.UpdateSubmissionWithTx(tx, submissionID, updates); err != nil {
			return err
		}

		// If approved, reward points
		if req.Status == "approved" {
			mission, err := s.repo.FindByID(submission.MissionID)
			if err != nil {
				return err
			}

			// for now we'll assume it handles its own internal transaction if needed,
			// though nested transactions in GORM/MySQL are safe.
			err = s.walletService.ProcessMissionRewardWithTx(tx, submission.StudentID, mission.Points, mission.Title, mission.ID, reviewerID)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *MissionService) GetAllSubmissions(params SubmissionListParams) (*SubmissionListResponse, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 20
	}

	submissions, total, err := s.repo.FindAllSubmissions(params)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))

	return &SubmissionListResponse{
		Submissions: submissions,
		Total:       total,
		Page:        params.Page,
		Limit:       params.Limit,
		TotalPages:  totalPages,
	}, nil
}

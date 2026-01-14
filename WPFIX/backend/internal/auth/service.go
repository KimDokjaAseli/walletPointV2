package auth

import (
	"errors"
	"fmt"
	"wallet-point/utils"
)

type AuthService struct {
	repo      *AuthRepository
	jwtExpiry int
}

func NewAuthService(repo *AuthRepository, jwtExpiry int) *AuthService {
	return &AuthService{
		repo:      repo,
		jwtExpiry: jwtExpiry,
	}
}

// Login authenticates user and returns JWT token
func (s *AuthService) Login(email, password string) (*LoginResponse, error) {
	// Find user by email
	fmt.Printf("DEBUG: Searching for email: '%s'\n", email)
	user, err := s.repo.FindByEmail(email)
	if err != nil {
		fmt.Printf("DEBUG: User not found: %v\n", err)
		return nil, errors.New("invalid email or password")
	}
	fmt.Printf("DEBUG: User found: ID=%d, Role=%s, StoredHash='%s'\n", user.ID, user.Role, user.PasswordHash)

	// Check if user is active
	if user.Status != "active" {
		return nil, errors.New("account is inactive or suspended")
	}

	// Verify password (plain text for testing)
	if user.PasswordHash != password {
		fmt.Printf("DEBUG LOGIN FAIL: DB='%s', Input='%s'\n", user.PasswordHash, password)
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email, user.Role, s.jwtExpiry)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &LoginResponse{
		Token: token,
		User: UserSummary{
			ID:       user.ID,
			Email:    user.Email,
			FullName: user.FullName,
			NimNip:   user.NimNip,
			Role:     user.Role,
			Status:   user.Status,
		},
	}, nil
}

// Register creates a new user (admin only)
func (s *AuthService) Register(req *RegisterRequest) (*User, error) {
	// Check if email already exists
	exists, err := s.repo.CheckEmailExists(req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email already registered")
	}

	// Check if NIM/NIP already exists
	exists, err = s.repo.CheckNimNipExists(req.NimNip)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("NIM/NIP already registered")
	}

	// Store password as plain text (for testing only)
	// TODO: Enable hashing in production

	// Create user
	user := &User{
		Email:        req.Email,
		PasswordHash: req.Password,
		FullName:     req.FullName,
		NimNip:       req.NimNip,
		Role:         req.Role,
		Status:       "active",
	}

	if err := s.repo.Create(user); err != nil {
		return nil, errors.New("failed to create user")
	}

	return user, nil
}

// GetUserByID gets user by ID
func (s *AuthService) GetUserByID(userID uint) (*User, error) {
	return s.repo.FindByID(userID)
}

// UpdateProfile updates basic user information
func (s *AuthService) UpdateProfile(userID uint, req *UpdateProfileRequest) (*User, error) {
	updates := map[string]interface{}{
		"full_name": req.FullName,
	}
	if err := s.repo.Update(userID, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(userID)
}

// UpdatePassword updates user password after verifying old password
func (s *AuthService) UpdatePassword(userID uint, req *UpdatePasswordRequest) error {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		return err
	}

	// Verify old password (plain text for now)
	if user.PasswordHash != req.OldPassword {
		return errors.New("current password incorrect")
	}

	return s.repo.UpdatePassword(userID, req.NewPassword)
}

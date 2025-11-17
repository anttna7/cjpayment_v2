package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/security"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidPassword    = errors.New("invalid password")
	ErrUserInactive       = errors.New("user account is inactive")
)

// authService implements AuthService interface
type authService struct {
	userRepo       repository.UserRepository
	roleRepo       repository.RoleRepository
	jwtManager     *JWTManager
	redisClient    *redis.Client
	sessionService SessionService
	auditLogger    security.AuditLogger
}

// NewAuthService creates a new authentication service
func NewAuthService(
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	jwtManager *JWTManager,
	redisClient *redis.Client,
) AuthService {
	return &authService{
		userRepo:    userRepo,
		roleRepo:    roleRepo,
		jwtManager:  jwtManager,
		redisClient: redisClient,
	}
}

// NewAuthServiceWithSession creates a new authentication service with session management
func NewAuthServiceWithSession(
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	jwtManager *JWTManager,
	redisClient *redis.Client,
	sessionService SessionService,
	auditLogger security.AuditLogger,
) AuthService {
	return &authService{
		userRepo:       userRepo,
		roleRepo:       roleRepo,
		jwtManager:     jwtManager,
		redisClient:    redisClient,
		sessionService: sessionService,
		auditLogger:    auditLogger,
	}
}

// Login authenticates a user and returns tokens
func (s *authService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// Get user by username
	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Log failed login attempt
			if s.auditLogger != nil {
				errorMsg := "invalid username"
				s.auditLogger.LogAuthEvent(ctx, "", req.Username, req.IPAddress, req.UserAgent, 
					"login_failed", false, &errorMsg)
			}
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if user is active
	if user.Status != "active" {
		// Log inactive user login attempt
		if s.auditLogger != nil {
			errorMsg := "user inactive"
			userIDStr := user.ID.String()
			s.auditLogger.LogAuthEvent(ctx, userIDStr, user.Username, req.IPAddress, req.UserAgent, 
				"login_failed", false, &errorMsg)
		}
		return nil, ErrUserInactive
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		// Log failed password attempt
		if s.auditLogger != nil {
			errorMsg := "invalid password"
			userIDStr := user.ID.String()
			s.auditLogger.LogAuthEvent(ctx, userIDStr, user.Username, req.IPAddress, req.UserAgent, 
				"login_failed", false, &errorMsg)
		}
		return nil, ErrInvalidCredentials
	}

	// Check for anomalous login if session service is available
	if s.sessionService != nil {
		anomalyResult, err := s.sessionService.DetectAnomalousLogin(ctx, user.ID, req.IPAddress, req.UserAgent)
		if err == nil && anomalyResult.IsAnomalous && anomalyResult.RiskScore >= 50 {
			// Log high-risk login attempt
			if s.auditLogger != nil {
				s.auditLogger.LogSecurityEvent(ctx, req.IPAddress, req.UserAgent, 
					"high_risk_login", fmt.Sprintf("Risk score: %d, Reasons: %v", anomalyResult.RiskScore, anomalyResult.Reasons), 
					security.RiskHigh)
			}
			
			// For very high risk (score >= 75), require additional verification
			if anomalyResult.RiskScore >= 75 {
				return nil, errors.New("additional verification required for this login")
			}
		}
	}

	// Get user roles
	roles, err := s.roleRepo.GetUserRoles(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Generate tokens
	tokens, err := s.GenerateTokens(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Create session if session service is available
	var sessionInfo *SessionInfo
	if s.sessionService != nil {
		sessionReq := &CreateSessionRequest{
			UserID:    user.ID,
			Username:  user.Username,
			IPAddress: req.IPAddress,
			UserAgent: req.UserAgent,
			Metadata: map[string]interface{}{
				"login_method": "password",
				"login_time":   time.Now(),
			},
		}
		
		sessionInfo, err = s.sessionService.CreateSession(ctx, sessionReq)
		if err != nil {
			// Log error but don't fail login
			if s.auditLogger != nil {
				errorMsg := err.Error()
				userIDStr := user.ID.String()
				s.auditLogger.LogEvent(ctx, &security.AuditEvent{
					UserID:    &userIDStr,
					Username:  &user.Username,
					IPAddress: req.IPAddress,
					Action:    "session_creation_failed",
					Resource:  "session",
					Success:   false,
					ErrorMsg:  &errorMsg,
					Risk:      security.RiskMedium,
				})
			}
		}
	}

	// Convert roles to string slice
	roleNames := make([]string, len(roles))
	for i, role := range roles {
		roleNames[i] = role.Name
	}

	userInfo := &UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		Status:   user.Status,
		Roles:    roleNames,
	}

	response := &LoginResponse{
		User:         userInfo,
		TokenResponse: tokens,
	}

	// Add session info if available
	if sessionInfo != nil {
		response.SessionInfo = sessionInfo
	}

	// Log successful login
	if s.auditLogger != nil {
		userIDStr := user.ID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, user.Username, req.IPAddress, req.UserAgent, 
			"login_success", true, nil)
	}

	return response, nil
}

// Register creates a new user account
func (s *authService) Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error) {
	// Check if username already exists
	_, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err == nil {
		return nil, ErrUserExists
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("failed to check username: %w", err)
	}

	// Check if email already exists
	_, err = s.userRepo.GetByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrUserExists
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &repository.User{
		ID:       uuid.New(),
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
		FullName: req.FullName,
		Status:   "active",
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	userInfo := &UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		FullName: user.FullName,
		Status:   user.Status,
		Roles:    []string{}, // New users have no roles by default
	}

	return &RegisterResponse{
		User: userInfo,
	}, nil
}

// RefreshToken generates new tokens using a refresh token
func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error) {
	// Validate refresh token
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Check if it's a refresh token
	if claims.Type != "refresh" {
		return nil, ErrInvalidToken
	}

	// Check if token is blacklisted
	isBlacklisted, err := s.isTokenBlacklisted(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to check token blacklist: %w", err)
	}
	if isBlacklisted {
		return nil, ErrInvalidToken
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if user is still active
	if user.Status != "active" {
		return nil, ErrUserInactive
	}

	// Generate new tokens
	tokens, err := s.GenerateTokens(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Blacklist the old refresh token
	if err := s.blacklistToken(ctx, refreshToken, time.Until(claims.ExpiresAt.Time)); err != nil {
		// Log error but don't fail the request
		// In production, you might want to log this properly
	}

	return tokens, nil
}

// Logout invalidates user tokens and terminates sessions
func (s *authService) Logout(ctx context.Context, userID uuid.UUID) error {
	// Get user for logging
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Terminate all user sessions if session service is available
	if s.sessionService != nil {
		if err := s.sessionService.TerminateAllUserSessions(ctx, userID); err != nil {
			// Log error but don't fail logout
			if s.auditLogger != nil {
				errorMsg := err.Error()
				userIDStr := userID.String()
				s.auditLogger.LogEvent(ctx, &security.AuditEvent{
					UserID:   &userIDStr,
					Username: &user.Username,
					Action:   "session_termination_failed",
					Resource: "session",
					Success:  false,
					ErrorMsg: &errorMsg,
					Risk:     security.RiskMedium,
				})
			}
		}
	}

	// In a more sophisticated implementation, you might also:
	// 1. Blacklist all user tokens
	// 2. Clear other user-specific caches
	
	// Log successful logout
	if s.auditLogger != nil {
		userIDStr := userID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, user.Username, "", "", 
			"logout_success", true, nil)
	}

	return nil
}

// ChangePassword changes a user's password
func (s *authService) ChangePassword(ctx context.Context, userID uuid.UUID, req *ChangePasswordRequest) error {
	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return ErrInvalidPassword
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	user.Password = string(hashedPassword)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// ResetPassword resets a user's password (simplified implementation)
func (s *authService) ResetPassword(ctx context.Context, req *ResetPasswordRequest) error {
	// In a real implementation, you would:
	// 1. Validate the reset token (stored in database/cache)
	// 2. Check if token is not expired
	// 3. Get user by email
	// 4. Update password
	// 5. Invalidate the reset token
	
	// For now, this is a simplified implementation
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	user.Password = string(hashedPassword)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// ValidateToken validates a JWT token and returns claims
func (s *authService) ValidateToken(ctx context.Context, token string) (*TokenClaims, error) {
	claims, err := s.jwtManager.ValidateToken(token)
	if err != nil {
		return nil, err
	}

	// Check if token is blacklisted
	isBlacklisted, err := s.isTokenBlacklisted(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("failed to check token blacklist: %w", err)
	}
	if isBlacklisted {
		return nil, ErrInvalidToken
	}

	return &TokenClaims{
		UserID:   claims.UserID,
		Username: claims.Username,
		Email:    claims.Email,
		Roles:    claims.Roles,
		Type:     claims.Type,
	}, nil
}

// GenerateTokens generates access and refresh tokens for a user
func (s *authService) GenerateTokens(ctx context.Context, user *repository.User) (*TokenResponse, error) {
	// Get user roles
	roles, err := s.roleRepo.GetUserRoles(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Convert roles to string slice
	roleNames := make([]string, len(roles))
	for i, role := range roles {
		roleNames[i] = role.Name
	}

	// Generate access token
	accessToken, accessExpiresAt, err := s.jwtManager.GenerateAccessToken(
		user.ID, user.Username, user.Email, roleNames,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token
	refreshToken, _, err := s.jwtManager.GenerateRefreshToken(
		user.ID, user.Username, user.Email,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(time.Until(accessExpiresAt).Seconds()),
		ExpiresAt:    accessExpiresAt,
	}, nil
}

// Helper methods for token blacklisting
func (s *authService) blacklistToken(ctx context.Context, token string, ttl time.Duration) error {
	if s.redisClient == nil {
		return nil // Skip if Redis is not available
	}
	
	key := fmt.Sprintf("blacklist:token:%s", token)
	return s.redisClient.Set(ctx, key, "1", ttl).Err()
}

func (s *authService) isTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	if s.redisClient == nil {
		return false, nil // Skip if Redis is not available
	}
	
	key := fmt.Sprintf("blacklist:token:%s", token)
	result := s.redisClient.Get(ctx, key)
	if result.Err() == redis.Nil {
		return false, nil
	}
	if result.Err() != nil {
		return false, result.Err()
	}
	return true, nil
}
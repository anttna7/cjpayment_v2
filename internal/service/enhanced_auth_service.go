package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/company/cjpayment/pkg/security"
	"github.com/google/uuid"
)

// EnhancedAuthService provides enhanced authentication with session management
type EnhancedAuthService struct {
	authService    AuthService
	auditLogger    security.AuditLogger
	securityMonitor *security.SecurityMonitor
}

// NewEnhancedAuthService creates a new enhanced authentication service
func NewEnhancedAuthService(
	authService AuthService,
	auditLogger security.AuditLogger,
	securityMonitor *security.SecurityMonitor,
) *EnhancedAuthService {
	return &EnhancedAuthService{
		authService:     authService,
		auditLogger:     auditLogger,
		securityMonitor: securityMonitor,
	}
}

// LoginWithEnhancedSecurity performs login with enhanced security checks
func (s *EnhancedAuthService) LoginWithEnhancedSecurity(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	// Log login attempt
	if s.auditLogger != nil {
		s.auditLogger.LogAuthEvent(ctx, "", req.Username, req.IPAddress, req.UserAgent, 
			"login_attempt", true, nil)
	}

	// Perform basic authentication
	response, err := s.authService.Login(ctx, req)
	if err != nil {
		// Log failed login
		if s.auditLogger != nil {
			errorMsg := err.Error()
			s.auditLogger.LogAuthEvent(ctx, "", req.Username, req.IPAddress, req.UserAgent, 
				"login_failed", false, &errorMsg)
		}
		
		// Monitor failed login for security
		if s.securityMonitor != nil {
			s.securityMonitor.MonitorFailedLogin(ctx, req.IPAddress, req.Username)
		}
		
		return nil, err
	}

	// Log successful login
	if s.auditLogger != nil {
		userIDStr := response.User.ID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, response.User.Username, req.IPAddress, req.UserAgent, 
			"login_success", true, nil)
	}

	return response, nil
}

// LogoutWithCleanup performs logout with session cleanup
func (s *EnhancedAuthService) LogoutWithCleanup(ctx context.Context, userID uuid.UUID) error {
	// Perform basic logout
	if err := s.authService.Logout(ctx, userID); err != nil {
		return err
	}

	// Log logout event
	if s.auditLogger != nil {
		userIDStr := userID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, "", "", "", 
			"logout_success", true, nil)
	}

	return nil
}

// ValidateTokenWithAudit validates token with audit logging
func (s *EnhancedAuthService) ValidateTokenWithAudit(ctx context.Context, token string, ipAddress, userAgent string) (*TokenClaims, error) {
	claims, err := s.authService.ValidateToken(ctx, token)
	if err != nil {
		// Log token validation failure
		if s.auditLogger != nil {
			s.auditLogger.LogSecurityEvent(ctx, ipAddress, userAgent, 
				"token_validation_failed", "Invalid or expired token", security.RiskMedium)
		}
		return nil, err
	}

	// Log successful token validation
	if s.auditLogger != nil {
		userIDStr := claims.UserID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, claims.Username, ipAddress, userAgent, 
			"token_validated", true, nil)
	}

	return claims, nil
}

// SimpleSessionManager provides basic session management functionality
type SimpleSessionManager struct {
	sessions map[string]*SimpleSession
	auditLogger security.AuditLogger
}

// SimpleSession represents a simple session
type SimpleSession struct {
	ID           string    `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	Username     string    `json:"username"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	CreatedAt    time.Time `json:"created_at"`
	LastActivity time.Time `json:"last_activity"`
	ExpiresAt    time.Time `json:"expires_at"`
	IsActive     bool      `json:"is_active"`
}

// NewSimpleSessionManager creates a new simple session manager
func NewSimpleSessionManager(auditLogger security.AuditLogger) *SimpleSessionManager {
	return &SimpleSessionManager{
		sessions:    make(map[string]*SimpleSession),
		auditLogger: auditLogger,
	}
}

// CreateSession creates a new session
func (sm *SimpleSessionManager) CreateSession(ctx context.Context, userID uuid.UUID, username, ipAddress, userAgent string) (*SimpleSession, error) {
	sessionID := generateSimpleSessionID()
	now := time.Now()
	
	session := &SimpleSession{
		ID:           sessionID,
		UserID:       userID,
		Username:     username,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		CreatedAt:    now,
		LastActivity: now,
		ExpiresAt:    now.Add(24 * time.Hour), // 24 hour expiration
		IsActive:     true,
	}
	
	sm.sessions[sessionID] = session
	
	// Log session creation
	if sm.auditLogger != nil {
		userIDStr := userID.String()
		sm.auditLogger.LogAuthEvent(ctx, userIDStr, username, ipAddress, userAgent, 
			"session_created", true, nil)
	}
	
	return session, nil
}

// GetSession retrieves a session by ID
func (sm *SimpleSessionManager) GetSession(ctx context.Context, sessionID string) (*SimpleSession, error) {
	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, errors.New("session not found")
	}
	
	// Check if session is expired
	if time.Now().After(session.ExpiresAt) || !session.IsActive {
		delete(sm.sessions, sessionID)
		return nil, errors.New("session expired")
	}
	
	// Update last activity
	session.LastActivity = time.Now()
	
	return session, nil
}

// TerminateSession terminates a session
func (sm *SimpleSessionManager) TerminateSession(ctx context.Context, sessionID string) error {
	session, exists := sm.sessions[sessionID]
	if !exists {
		return errors.New("session not found")
	}
	
	// Mark as inactive and remove
	session.IsActive = false
	delete(sm.sessions, sessionID)
	
	// Log session termination
	if sm.auditLogger != nil {
		userIDStr := session.UserID.String()
		sm.auditLogger.LogAuthEvent(ctx, userIDStr, session.Username, session.IPAddress, session.UserAgent, 
			"session_terminated", true, nil)
	}
	
	return nil
}

// GetUserSessions retrieves all active sessions for a user
func (sm *SimpleSessionManager) GetUserSessions(ctx context.Context, userID uuid.UUID) ([]*SimpleSession, error) {
	var userSessions []*SimpleSession
	
	for _, session := range sm.sessions {
		if session.UserID == userID && session.IsActive && time.Now().Before(session.ExpiresAt) {
			userSessions = append(userSessions, session)
		}
	}
	
	return userSessions, nil
}

// TerminateAllUserSessions terminates all sessions for a user
func (sm *SimpleSessionManager) TerminateAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	var sessionsToTerminate []string
	
	for sessionID, session := range sm.sessions {
		if session.UserID == userID {
			sessionsToTerminate = append(sessionsToTerminate, sessionID)
		}
	}
	
	for _, sessionID := range sessionsToTerminate {
		sm.TerminateSession(ctx, sessionID)
	}
	
	return nil
}

// CleanupExpiredSessions removes expired sessions
func (sm *SimpleSessionManager) CleanupExpiredSessions(ctx context.Context) error {
	now := time.Now()
	var expiredSessions []string
	
	for sessionID, session := range sm.sessions {
		if now.After(session.ExpiresAt) || !session.IsActive {
			expiredSessions = append(expiredSessions, sessionID)
		}
	}
	
	for _, sessionID := range expiredSessions {
		delete(sm.sessions, sessionID)
	}
	
	return nil
}

// generateSimpleSessionID generates a simple session ID
func generateSimpleSessionID() string {
	return fmt.Sprintf("sess_%d_%s", time.Now().UnixNano(), uuid.New().String()[:8])
}

// PermissionViolationTracker tracks permission violations
type PermissionViolationTracker struct {
	violations  []PermissionViolationEvent
	auditLogger security.AuditLogger
}

// PermissionViolationEvent represents a permission violation
type PermissionViolationEvent struct {
	ID          string             `json:"id"`
	UserID      uuid.UUID          `json:"user_id"`
	Username    string             `json:"username"`
	IPAddress   string             `json:"ip_address"`
	UserAgent   string             `json:"user_agent"`
	Resource    string             `json:"resource"`
	Action      string             `json:"action"`
	Violation   string             `json:"violation"`
	Severity    security.RiskLevel `json:"severity"`
	Timestamp   time.Time          `json:"timestamp"`
	IsResolved  bool               `json:"is_resolved"`
}

// NewPermissionViolationTracker creates a new violation tracker
func NewPermissionViolationTracker(auditLogger security.AuditLogger) *PermissionViolationTracker {
	return &PermissionViolationTracker{
		violations:  make([]PermissionViolationEvent, 0),
		auditLogger: auditLogger,
	}
}

// RecordViolation records a permission violation
func (pvt *PermissionViolationTracker) RecordViolation(ctx context.Context, userID uuid.UUID, username, ipAddress, userAgent, resource, action, violation string, severity security.RiskLevel) error {
	event := PermissionViolationEvent{
		ID:         uuid.New().String(),
		UserID:     userID,
		Username:   username,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		Resource:   resource,
		Action:     action,
		Violation:  violation,
		Severity:   severity,
		Timestamp:  time.Now(),
		IsResolved: false,
	}
	
	pvt.violations = append(pvt.violations, event)
	
	// Log violation
	if pvt.auditLogger != nil {
		pvt.auditLogger.LogSecurityEvent(ctx, ipAddress, userAgent, 
			"permission_violation", fmt.Sprintf("Resource: %s, Action: %s, Violation: %s", resource, action, violation), 
			severity)
	}
	
	return nil
}

// GetViolations retrieves violations with optional filtering
func (pvt *PermissionViolationTracker) GetViolations(ctx context.Context, userID *uuid.UUID, limit int) ([]PermissionViolationEvent, error) {
	var filtered []PermissionViolationEvent
	
	for _, violation := range pvt.violations {
		if userID != nil && violation.UserID != *userID {
			continue
		}
		filtered = append(filtered, violation)
		
		if len(filtered) >= limit {
			break
		}
	}
	
	return filtered, nil
}

// ResolveViolation marks a violation as resolved
func (pvt *PermissionViolationTracker) ResolveViolation(ctx context.Context, violationID string) error {
	for i := range pvt.violations {
		if pvt.violations[i].ID == violationID {
			pvt.violations[i].IsResolved = true
			return nil
		}
	}
	
	return errors.New("violation not found")
}
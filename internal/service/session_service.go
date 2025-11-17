package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/company/cjpayment/pkg/security"
	"github.com/google/uuid"
)

// sessionServiceImpl implements the SessionService interface
type sessionServiceImpl struct {
	sessions        map[string]*SessionInfo
	userSessions    map[uuid.UUID][]string // userID -> sessionIDs
	devices         map[uuid.UUID][]*DeviceInfo // userID -> devices
	auditLogger     security.AuditLogger
	securityMonitor *security.SecurityMonitor
	mutex           sync.RWMutex
}

// NewSessionService creates a new session service
func NewSessionService(auditLogger security.AuditLogger, securityMonitor *security.SecurityMonitor) SessionService {
	return &sessionServiceImpl{
		sessions:        make(map[string]*SessionInfo),
		userSessions:    make(map[uuid.UUID][]string),
		devices:         make(map[uuid.UUID][]*DeviceInfo),
		auditLogger:     auditLogger,
		securityMonitor: securityMonitor,
	}
}

// CreateSession creates a new session
func (s *sessionServiceImpl) CreateSession(ctx context.Context, req *CreateSessionRequest) (*SessionInfo, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	sessionID := s.generateSessionID()
	now := time.Now()
	
	session := &SessionInfo{
		SessionID:    sessionID,
		UserID:       req.UserID,
		Username:     req.Username,
		IPAddress:    req.IPAddress,
		UserAgent:    req.UserAgent,
		DeviceInfo:   req.DeviceInfo,
		LoginTime:    now,
		LastActivity: now,
		ExpiresAt:    now.Add(24 * time.Hour), // 24 hour default expiration
		IsActive:     true,
		Metadata:     req.Metadata,
	}

	s.sessions[sessionID] = session
	
	// Add to user sessions
	if userSessions, exists := s.userSessions[req.UserID]; exists {
		s.userSessions[req.UserID] = append(userSessions, sessionID)
	} else {
		s.userSessions[req.UserID] = []string{sessionID}
	}

	// Register device if provided
	if req.DeviceInfo != nil {
		s.registerDeviceInternal(req.UserID, req.DeviceInfo)
	}

	// Log session creation
	if s.auditLogger != nil {
		userIDStr := req.UserID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, req.Username, req.IPAddress, req.UserAgent, 
			"session_created", true, nil)
	}

	return session, nil
}

// GetSession retrieves a session by ID
func (s *sessionServiceImpl) GetSession(ctx context.Context, sessionID string) (*SessionInfo, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, ErrSessionNotFound
	}

	// Check if session is expired
	if time.Now().After(session.ExpiresAt) || !session.IsActive {
		return nil, ErrSessionExpired
	}

	return session, nil
}

// UpdateSession updates session information
func (s *sessionServiceImpl) UpdateSession(ctx context.Context, sessionID string, req *UpdateSessionRequest) (*SessionInfo, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, ErrSessionNotFound
	}

	if time.Now().After(session.ExpiresAt) || !session.IsActive {
		return nil, ErrSessionExpired
	}

	// Update fields
	if req.LastActivity != nil {
		session.LastActivity = *req.LastActivity
	}
	if req.Metadata != nil {
		if session.Metadata == nil {
			session.Metadata = make(map[string]interface{})
		}
		for k, v := range req.Metadata {
			session.Metadata[k] = v
		}
	}

	return session, nil
}

// RenewSession extends the expiration time of a session
func (s *sessionServiceImpl) RenewSession(ctx context.Context, sessionID string) (*SessionInfo, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, ErrSessionNotFound
	}

	if time.Now().After(session.ExpiresAt) || !session.IsActive {
		return nil, ErrSessionExpired
	}

	// Extend expiration by 24 hours
	session.ExpiresAt = time.Now().Add(24 * time.Hour)
	session.LastActivity = time.Now()

	// Log session renewal
	if s.auditLogger != nil {
		userIDStr := session.UserID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, session.Username, session.IPAddress, session.UserAgent, 
			"session_renewed", true, nil)
	}

	return session, nil
}

// TerminateSession terminates a specific session
func (s *sessionServiceImpl) TerminateSession(ctx context.Context, sessionID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return ErrSessionNotFound
	}

	// Mark as inactive and remove
	session.IsActive = false
	delete(s.sessions, sessionID)

	// Remove from user sessions
	if userSessions, exists := s.userSessions[session.UserID]; exists {
		for i, id := range userSessions {
			if id == sessionID {
				s.userSessions[session.UserID] = append(userSessions[:i], userSessions[i+1:]...)
				break
			}
		}
	}

	// Log session termination
	if s.auditLogger != nil {
		userIDStr := session.UserID.String()
		s.auditLogger.LogAuthEvent(ctx, userIDStr, session.Username, session.IPAddress, session.UserAgent, 
			"session_terminated", true, nil)
	}

	return nil
}

// GetUserSessions retrieves all active sessions for a user
func (s *sessionServiceImpl) GetUserSessions(ctx context.Context, userID uuid.UUID) ([]*SessionInfo, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var userSessions []*SessionInfo
	
	if sessionIDs, exists := s.userSessions[userID]; exists {
		for _, sessionID := range sessionIDs {
			if session, exists := s.sessions[sessionID]; exists {
				if session.IsActive && time.Now().Before(session.ExpiresAt) {
					userSessions = append(userSessions, session)
				}
			}
		}
	}

	return userSessions, nil
}

// TerminateUserSessions terminates all sessions for a user except the excluded one
func (s *sessionServiceImpl) TerminateUserSessions(ctx context.Context, userID uuid.UUID, excludeSessionID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if sessionIDs, exists := s.userSessions[userID]; exists {
		var remainingSessions []string
		
		for _, sessionID := range sessionIDs {
			if sessionID == excludeSessionID {
				remainingSessions = append(remainingSessions, sessionID)
				continue
			}
			
			if session, exists := s.sessions[sessionID]; exists {
				session.IsActive = false
				delete(s.sessions, sessionID)
				
				// Log session termination
				if s.auditLogger != nil {
					userIDStr := userID.String()
					s.auditLogger.LogAuthEvent(ctx, userIDStr, session.Username, session.IPAddress, session.UserAgent, 
						"session_terminated_bulk", true, nil)
				}
			}
		}
		
		s.userSessions[userID] = remainingSessions
	}

	return nil
}

// TerminateAllUserSessions terminates all sessions for a user
func (s *sessionServiceImpl) TerminateAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	return s.TerminateUserSessions(ctx, userID, "")
}

// GetActiveSessionCount returns the number of active sessions for a user
func (s *sessionServiceImpl) GetActiveSessionCount(ctx context.Context, userID uuid.UUID) (int, error) {
	sessions, err := s.GetUserSessions(ctx, userID)
	if err != nil {
		return 0, err
	}
	return len(sessions), nil
}

// ValidateSession validates a session and returns session info
func (s *sessionServiceImpl) ValidateSession(ctx context.Context, sessionID string) (*SessionInfo, error) {
	return s.GetSession(ctx, sessionID)
}

// RefreshSessionActivity updates the last activity time for a session
func (s *sessionServiceImpl) RefreshSessionActivity(ctx context.Context, sessionID string, ipAddress, userAgent string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return ErrSessionNotFound
	}

	if time.Now().After(session.ExpiresAt) || !session.IsActive {
		return ErrSessionExpired
	}

	session.LastActivity = time.Now()
	
	// Update IP and user agent if they changed
	if ipAddress != "" && ipAddress != session.IPAddress {
		session.IPAddress = ipAddress
	}
	if userAgent != "" && userAgent != session.UserAgent {
		session.UserAgent = userAgent
	}

	return nil
}

// DetectAnomalousLogin checks for anomalous login patterns
func (s *sessionServiceImpl) DetectAnomalousLogin(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string) (*LoginAnomalyResult, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	result := &LoginAnomalyResult{
		IsAnomalous: false,
		Reasons:     []string{},
		RiskScore:   0,
		RiskLevel:   "low",
	}

	// Get user's previous sessions
	userSessions, err := s.GetUserSessions(ctx, userID)
	if err != nil {
		return result, err
	}

	if len(userSessions) == 0 {
		// First login, not anomalous
		return result, nil
	}

	// Check for IP address anomalies
	knownIPs := make(map[string]bool)
	for _, session := range userSessions {
		knownIPs[session.IPAddress] = true
	}

	if !knownIPs[ipAddress] {
		result.Reasons = append(result.Reasons, "Unknown IP address")
		result.RiskScore += 30
	}

	// Check for user agent anomalies
	knownUserAgents := make(map[string]bool)
	for _, session := range userSessions {
		knownUserAgents[session.UserAgent] = true
	}

	if !knownUserAgents[userAgent] {
		result.Reasons = append(result.Reasons, "Unknown user agent")
		result.RiskScore += 20
	}

	// Check for unusual login time
	now := time.Now()
	hour := now.Hour()
	if hour < 6 || hour > 22 {
		result.Reasons = append(result.Reasons, "Unusual login time")
		result.RiskScore += 10
	}

	// Determine risk level and anomaly status
	if result.RiskScore >= 50 {
		result.IsAnomalous = true
		result.RiskLevel = "high"
	} else if result.RiskScore >= 30 {
		result.IsAnomalous = true
		result.RiskLevel = "medium"
	} else if result.RiskScore >= 10 {
		result.RiskLevel = "low"
	}

	return result, nil
}

// RegisterDevice registers a new device for a user
func (s *sessionServiceImpl) RegisterDevice(ctx context.Context, userID uuid.UUID, deviceInfo *DeviceInfo) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	return s.registerDeviceInternal(userID, deviceInfo)
}

// registerDeviceInternal is the internal implementation without locking
func (s *sessionServiceImpl) registerDeviceInternal(userID uuid.UUID, deviceInfo *DeviceInfo) error {
	if deviceInfo.DeviceID == "" {
		deviceInfo.DeviceID = s.generateDeviceID()
	}

	if devices, exists := s.devices[userID]; exists {
		// Check if device already exists
		for i, device := range devices {
			if device.DeviceID == deviceInfo.DeviceID {
				// Update existing device
				s.devices[userID][i] = deviceInfo
				return nil
			}
		}
		// Add new device
		s.devices[userID] = append(devices, deviceInfo)
	} else {
		s.devices[userID] = []*DeviceInfo{deviceInfo}
	}

	return nil
}

// GetUserDevices retrieves all registered devices for a user
func (s *sessionServiceImpl) GetUserDevices(ctx context.Context, userID uuid.UUID) ([]*DeviceInfo, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	if devices, exists := s.devices[userID]; exists {
		return devices, nil
	}

	return []*DeviceInfo{}, nil
}

// TrustDevice marks a device as trusted
func (s *sessionServiceImpl) TrustDevice(ctx context.Context, userID uuid.UUID, deviceID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if devices, exists := s.devices[userID]; exists {
		for i, device := range devices {
			if device.DeviceID == deviceID {
				s.devices[userID][i].IsTrusted = true
				return nil
			}
		}
	}

	return fmt.Errorf("device not found")
}

// UntrustDevice marks a device as untrusted
func (s *sessionServiceImpl) UntrustDevice(ctx context.Context, userID uuid.UUID, deviceID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if devices, exists := s.devices[userID]; exists {
		for i, device := range devices {
			if device.DeviceID == deviceID {
				s.devices[userID][i].IsTrusted = false
				return nil
			}
		}
	}

	return fmt.Errorf("device not found")
}

// CleanupExpiredSessions removes expired sessions
func (s *sessionServiceImpl) CleanupExpiredSessions(ctx context.Context) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	var expiredSessions []string

	for sessionID, session := range s.sessions {
		if now.After(session.ExpiresAt) || !session.IsActive {
			expiredSessions = append(expiredSessions, sessionID)
		}
	}

	for _, sessionID := range expiredSessions {
		if session, exists := s.sessions[sessionID]; exists {
			// Remove from user sessions
			if userSessions, exists := s.userSessions[session.UserID]; exists {
				for i, id := range userSessions {
					if id == sessionID {
						s.userSessions[session.UserID] = append(userSessions[:i], userSessions[i+1:]...)
						break
					}
				}
			}
			delete(s.sessions, sessionID)
		}
	}

	return nil
}

// GetSessionStatistics returns session statistics
func (s *sessionServiceImpl) GetSessionStatistics(ctx context.Context) (*SessionStatistics, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	stats := &SessionStatistics{
		TotalActiveSessions: len(s.sessions),
		TotalUsers:         len(s.userSessions),
	}

	// Calculate average session duration
	var totalDuration time.Duration
	var sessionCount int

	for _, session := range s.sessions {
		if session.IsActive {
			duration := session.LastActivity.Sub(session.LoginTime)
			totalDuration += duration
			sessionCount++
		}
	}

	if sessionCount > 0 {
		stats.AverageSessionDuration = totalDuration / time.Duration(sessionCount)
	}

	return stats, nil
}

// generateSessionID generates a unique session ID
func (s *sessionServiceImpl) generateSessionID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return fmt.Sprintf("sess_%d_%s", time.Now().UnixNano(), hex.EncodeToString(bytes))
}

// generateDeviceID generates a unique device ID
func (s *sessionServiceImpl) generateDeviceID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return fmt.Sprintf("dev_%s", hex.EncodeToString(bytes))
}

// parseUserAgent parses user agent string to extract device information
func parseUserAgent(userAgent string) *DeviceInfo {
	deviceInfo := &DeviceInfo{
		IsTrusted: false,
	}

	// Simple user agent parsing (in production, use a proper library)
	userAgentLower := strings.ToLower(userAgent)

	// Detect device type
	if strings.Contains(userAgentLower, "mobile") || strings.Contains(userAgentLower, "android") || strings.Contains(userAgentLower, "iphone") {
		deviceInfo.DeviceType = "mobile"
	} else if strings.Contains(userAgentLower, "tablet") || strings.Contains(userAgentLower, "ipad") {
		deviceInfo.DeviceType = "tablet"
	} else {
		deviceInfo.DeviceType = "desktop"
	}

	// Detect OS
	if strings.Contains(userAgentLower, "windows") {
		deviceInfo.OS = "Windows"
	} else if strings.Contains(userAgentLower, "mac") {
		deviceInfo.OS = "macOS"
	} else if strings.Contains(userAgentLower, "linux") {
		deviceInfo.OS = "Linux"
	} else if strings.Contains(userAgentLower, "android") {
		deviceInfo.OS = "Android"
	} else if strings.Contains(userAgentLower, "ios") || strings.Contains(userAgentLower, "iphone") || strings.Contains(userAgentLower, "ipad") {
		deviceInfo.OS = "iOS"
	}

	// Detect browser
	if strings.Contains(userAgentLower, "chrome") {
		deviceInfo.Browser = "Chrome"
	} else if strings.Contains(userAgentLower, "firefox") {
		deviceInfo.Browser = "Firefox"
	} else if strings.Contains(userAgentLower, "safari") {
		deviceInfo.Browser = "Safari"
	} else if strings.Contains(userAgentLower, "edge") {
		deviceInfo.Browser = "Edge"
	}

	return deviceInfo
}
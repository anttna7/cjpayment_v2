package security

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

// AuditEvent represents a security audit event
type AuditEvent struct {
	ID          string                 `json:"id"`
	Timestamp   time.Time              `json:"timestamp"`
	EventType   string                 `json:"event_type"`
	UserID      uint                   `json:"user_id,omitempty"`
	Username    string                 `json:"username,omitempty"`
	UserRole    string                 `json:"user_role,omitempty"`
	IPAddress   string                 `json:"ip_address"`
	UserAgent   string                 `json:"user_agent"`
	Resource    string                 `json:"resource"`
	Action      string                 `json:"action"`
	Method      string                 `json:"method"`
	Path        string                 `json:"path"`
	StatusCode  int                    `json:"status_code"`
	Success     bool                   `json:"success"`
	Message     string                 `json:"message"`
	Details     map[string]interface{} `json:"details,omitempty"`
	RiskLevel   string                 `json:"risk_level"`
	SessionID   string                 `json:"session_id,omitempty"`
	RequestID   string                 `json:"request_id,omitempty"`
	Duration    int64                  `json:"duration_ms"`
}

// AuditLogger handles security audit logging
type AuditLogger struct {
	logger    *logrus.Logger
	redis     *redis.Client
	encryptor *EncryptionService
}

// NewAuditLogger creates a new audit logger
func NewAuditLogger(logger *logrus.Logger, redisClient *redis.Client, encryptor *EncryptionService) *AuditLogger {
	return &AuditLogger{
		logger:    logger,
		redis:     redisClient,
		encryptor: encryptor,
	}
}

// LogEvent logs a security audit event
func (al *AuditLogger) LogEvent(event AuditEvent) error {
	// Generate ID if not provided
	if event.ID == "" {
		id, err := al.encryptor.GenerateSecureToken(16)
		if err != nil {
			return fmt.Errorf("failed to generate event ID: %w", err)
		}
		event.ID = id
	}

	// Set timestamp if not provided
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// Mask sensitive data in details
	if event.Details != nil {
		al.maskSensitiveDetails(event.Details)
	}

	// Log to structured logger
	al.logToStructuredLogger(event)

	// Store in Redis for real-time monitoring
	if al.redis != nil {
		if err := al.storeInRedis(event); err != nil {
			al.logger.WithError(err).Error("Failed to store audit event in Redis")
		}
	}

	// Check for security alerts
	al.checkSecurityAlerts(event)

	return nil
}

// LogAuthEvent logs authentication-related events
func (al *AuditLogger) LogAuthEvent(eventType string, c *gin.Context, userID uint, username string, success bool, message string) {
	event := AuditEvent{
		EventType:  eventType,
		UserID:     userID,
		Username:   username,
		IPAddress:  getClientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Resource:   "auth",
		Action:     eventType,
		Method:     c.Request.Method,
		Path:       c.Request.URL.Path,
		Success:    success,
		Message:    message,
		RiskLevel:  al.calculateRiskLevel(eventType, success),
		SessionID:  al.getSessionID(c),
		RequestID:  al.getRequestID(c),
	}

	al.LogEvent(event)
}

// LogAccessEvent logs resource access events
func (al *AuditLogger) LogAccessEvent(c *gin.Context, resource, action string, success bool, message string) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	userRole, _ := c.Get("user_role")

	event := AuditEvent{
		EventType:  "access",
		UserID:     al.getUintValue(userID),
		Username:   al.getStringValue(username),
		UserRole:   al.getStringValue(userRole),
		IPAddress:  getClientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Resource:   resource,
		Action:     action,
		Method:     c.Request.Method,
		Path:       c.Request.URL.Path,
		Success:    success,
		Message:    message,
		RiskLevel:  al.calculateAccessRiskLevel(resource, action, success),
		SessionID:  al.getSessionID(c),
		RequestID:  al.getRequestID(c),
	}

	al.LogEvent(event)
}

// LogDataEvent logs data manipulation events
func (al *AuditLogger) LogDataEvent(c *gin.Context, resource, action string, recordID interface{}, oldData, newData map[string]interface{}, success bool, message string) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	userRole, _ := c.Get("user_role")

	details := map[string]interface{}{
		"record_id": recordID,
	}

	if oldData != nil {
		details["old_data"] = oldData
	}
	if newData != nil {
		details["new_data"] = newData
	}

	event := AuditEvent{
		EventType:  "data_change",
		UserID:     al.getUintValue(userID),
		Username:   al.getStringValue(username),
		UserRole:   al.getStringValue(userRole),
		IPAddress:  getClientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Resource:   resource,
		Action:     action,
		Method:     c.Request.Method,
		Path:       c.Request.URL.Path,
		Success:    success,
		Message:    message,
		Details:    details,
		RiskLevel:  al.calculateDataRiskLevel(resource, action, success),
		SessionID:  al.getSessionID(c),
		RequestID:  al.getRequestID(c),
	}

	al.LogEvent(event)
}

// LogSecurityEvent logs security-related events
func (al *AuditLogger) LogSecurityEvent(eventType string, c *gin.Context, riskLevel, message string, details map[string]interface{}) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	userRole, _ := c.Get("user_role")

	event := AuditEvent{
		EventType:  eventType,
		UserID:     al.getUintValue(userID),
		Username:   al.getStringValue(username),
		UserRole:   al.getStringValue(userRole),
		IPAddress:  getClientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Resource:   "security",
		Action:     eventType,
		Method:     c.Request.Method,
		Path:       c.Request.URL.Path,
		Success:    false, // Security events are typically failures
		Message:    message,
		Details:    details,
		RiskLevel:  riskLevel,
		SessionID:  al.getSessionID(c),
		RequestID:  al.getRequestID(c),
	}

	al.LogEvent(event)
}

// AuditMiddleware creates a middleware for automatic audit logging
func (al *AuditLogger) AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Log the request
		duration := time.Since(start)
		
		userID, _ := c.Get("user_id")
		username, _ := c.Get("username")
		userRole, _ := c.Get("user_role")

		resource := al.parseResourceFromPath(c.Request.URL.Path)
		action := al.parseActionFromMethod(c.Request.Method)
		success := c.Writer.Status() < 400

		event := AuditEvent{
			EventType:  "api_request",
			UserID:     al.getUintValue(userID),
			Username:   al.getStringValue(username),
			UserRole:   al.getStringValue(userRole),
			IPAddress:  getClientIP(c),
			UserAgent:  c.GetHeader("User-Agent"),
			Resource:   resource,
			Action:     action,
			Method:     c.Request.Method,
			Path:       c.Request.URL.Path,
			StatusCode: c.Writer.Status(),
			Success:    success,
			Message:    fmt.Sprintf("%s %s - %d", c.Request.Method, c.Request.URL.Path, c.Writer.Status()),
			RiskLevel:  al.calculateRequestRiskLevel(c.Request.Method, c.Writer.Status()),
			SessionID:  al.getSessionID(c),
			RequestID:  al.getRequestID(c),
			Duration:   duration.Milliseconds(),
		}

		// Only log if it's not a health check or static resource
		if !al.isIgnoredPath(c.Request.URL.Path) {
			al.LogEvent(event)
		}
	}
}

// logToStructuredLogger logs event to structured logger
func (al *AuditLogger) logToStructuredLogger(event AuditEvent) {
	fields := logrus.Fields{
		"audit_id":     event.ID,
		"event_type":   event.EventType,
		"user_id":      event.UserID,
		"username":     event.Username,
		"user_role":    event.UserRole,
		"ip_address":   event.IPAddress,
		"resource":     event.Resource,
		"action":       event.Action,
		"method":       event.Method,
		"path":         event.Path,
		"status_code":  event.StatusCode,
		"success":      event.Success,
		"risk_level":   event.RiskLevel,
		"session_id":   event.SessionID,
		"request_id":   event.RequestID,
		"duration_ms":  event.Duration,
	}

	if event.Details != nil {
		fields["details"] = event.Details
	}

	entry := al.logger.WithFields(fields)

	switch event.RiskLevel {
	case "critical":
		entry.Error(event.Message)
	case "high":
		entry.Warn(event.Message)
	case "medium":
		entry.Info(event.Message)
	default:
		entry.Debug(event.Message)
	}
}

// storeInRedis stores event in Redis for real-time monitoring
func (al *AuditLogger) storeInRedis(event AuditEvent) error {
	ctx := context.Background()
	
	// Store in sorted set for time-based queries
	key := fmt.Sprintf("audit:events:%s", event.Timestamp.Format("2006-01-02"))
	score := float64(event.Timestamp.Unix())
	
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Store event
	if err := al.redis.ZAdd(ctx, key, redis.Z{
		Score:  score,
		Member: eventJSON,
	}).Err(); err != nil {
		return fmt.Errorf("failed to store event in Redis: %w", err)
	}

	// Set expiry for the key (30 days)
	al.redis.Expire(ctx, key, 30*24*time.Hour)

	// Store in risk-level specific sets for alerting
	if event.RiskLevel == "high" || event.RiskLevel == "critical" {
		riskKey := fmt.Sprintf("audit:risk:%s", event.RiskLevel)
		al.redis.ZAdd(ctx, riskKey, redis.Z{
			Score:  score,
			Member: eventJSON,
		})
		al.redis.Expire(ctx, riskKey, 7*24*time.Hour)
	}

	return nil
}

// checkSecurityAlerts checks for security alert conditions
func (al *AuditLogger) checkSecurityAlerts(event AuditEvent) {
	// Check for multiple failed login attempts
	if event.EventType == "login" && !event.Success {
		al.checkFailedLoginAttempts(event)
	}

	// Check for suspicious access patterns
	if event.RiskLevel == "high" || event.RiskLevel == "critical" {
		al.triggerSecurityAlert(event)
	}

	// Check for unusual access times
	if al.isUnusualAccessTime(event.Timestamp) {
		al.logUnusualAccessTime(event)
	}
}

// Helper methods
func (al *AuditLogger) maskSensitiveDetails(details map[string]interface{}) {
	sensitiveFields := []string{"password", "token", "secret", "key", "phone", "email", "account_number", "id_card"}
	
	for key, value := range details {
		for _, sensitive := range sensitiveFields {
			if strings.Contains(strings.ToLower(key), sensitive) {
				if strValue, ok := value.(string); ok {
					details[key] = al.encryptor.MaskSensitiveData(strValue, '*', 2, 2)
				}
				break
			}
		}
	}
}

func (al *AuditLogger) calculateRiskLevel(eventType string, success bool) string {
	if !success {
		switch eventType {
		case "login", "password_change", "permission_change":
			return "high"
		default:
			return "medium"
		}
	}
	return "low"
}

func (al *AuditLogger) calculateAccessRiskLevel(resource, action string, success bool) string {
	if !success {
		return "medium"
	}

	sensitiveResources := []string{"users", "permissions", "system", "config"}
	for _, sensitive := range sensitiveResources {
		if resource == sensitive {
			if action == "delete" {
				return "high"
			}
			if action == "update" || action == "create" {
				return "medium"
			}
		}
	}

	return "low"
}

func (al *AuditLogger) calculateDataRiskLevel(resource, action string, success bool) string {
	if !success {
		return "medium"
	}

	if action == "delete" {
		return "high"
	}

	sensitiveResources := []string{"merchants", "accounts", "orders", "users"}
	for _, sensitive := range sensitiveResources {
		if resource == sensitive {
			return "medium"
		}
	}

	return "low"
}

func (al *AuditLogger) calculateRequestRiskLevel(method string, statusCode int) string {
	if statusCode >= 500 {
		return "high"
	}
	if statusCode >= 400 {
		return "medium"
	}
	if method == "DELETE" {
		return "medium"
	}
	return "low"
}

func (al *AuditLogger) getUintValue(value interface{}) uint {
	if v, ok := value.(uint); ok {
		return v
	}
	return 0
}

func (al *AuditLogger) getStringValue(value interface{}) string {
	if v, ok := value.(string); ok {
		return v
	}
	return ""
}

func (al *AuditLogger) getSessionID(c *gin.Context) string {
	if sessionID, exists := c.Get("session_id"); exists {
		return al.getStringValue(sessionID)
	}
	return ""
}

func (al *AuditLogger) getRequestID(c *gin.Context) string {
	return c.GetHeader("X-Request-ID")
}

func (al *AuditLogger) parseResourceFromPath(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) > 0 && parts[0] == "api" && len(parts) > 1 {
		return parts[1]
	}
	if len(parts) > 0 {
		return parts[0]
	}
	return "unknown"
}

func (al *AuditLogger) parseActionFromMethod(method string) string {
	switch strings.ToUpper(method) {
	case "GET":
		return "read"
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return "unknown"
	}
}

func (al *AuditLogger) isIgnoredPath(path string) bool {
	ignoredPaths := []string{"/health", "/metrics", "/favicon.ico", "/static/"}
	for _, ignored := range ignoredPaths {
		if strings.HasPrefix(path, ignored) {
			return true
		}
	}
	return false
}

func (al *AuditLogger) checkFailedLoginAttempts(event AuditEvent) {
	// Implementation for checking failed login attempts
	// This would typically involve checking Redis for recent failed attempts
}

func (al *AuditLogger) triggerSecurityAlert(event AuditEvent) {
	// Implementation for triggering security alerts
	// This would typically involve sending notifications to security team
}

func (al *AuditLogger) isUnusualAccessTime(timestamp time.Time) bool {
	// Check if access is outside normal business hours
	hour := timestamp.Hour()
	return hour < 6 || hour > 22
}

func (al *AuditLogger) logUnusualAccessTime(event AuditEvent) {
	al.logger.WithFields(logrus.Fields{
		"event_id":   event.ID,
		"user_id":    event.UserID,
		"timestamp":  event.Timestamp,
		"ip_address": event.IPAddress,
	}).Warn("Unusual access time detected")
}
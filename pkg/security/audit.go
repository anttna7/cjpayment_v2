package security

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AuditEvent represents a security audit event
type AuditEvent struct {
	ID          string                 `json:"id"`
	Timestamp   time.Time              `json:"timestamp"`
	UserID      *string                `json:"user_id,omitempty"`
	Username    *string                `json:"username,omitempty"`
	IPAddress   string                 `json:"ip_address"`
	UserAgent   string                 `json:"user_agent"`
	Action      string                 `json:"action"`
	Resource    string                 `json:"resource"`
	ResourceID  *string                `json:"resource_id,omitempty"`
	Method      string                 `json:"method"`
	Path        string                 `json:"path"`
	StatusCode  int                    `json:"status_code"`
	Success     bool                   `json:"success"`
	ErrorMsg    *string                `json:"error_msg,omitempty"`
	RequestData map[string]interface{} `json:"request_data,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Risk        RiskLevel              `json:"risk"`
}

// RiskLevel represents the risk level of an audit event
type RiskLevel string

const (
	RiskLow      RiskLevel = "low"
	RiskMedium   RiskLevel = "medium"
	RiskHigh     RiskLevel = "high"
	RiskCritical RiskLevel = "critical"
)

// AuditLogger interface for audit logging
type AuditLogger interface {
	LogEvent(ctx context.Context, event *AuditEvent) error
	LogAuthEvent(ctx context.Context, userID, username, ipAddress, userAgent, action string, success bool, errorMsg *string) error
	LogDataAccess(ctx context.Context, userID, username, ipAddress, resource, resourceID, action string) error
	LogSecurityEvent(ctx context.Context, ipAddress, userAgent, event, details string, risk RiskLevel) error
	LogSystemEvent(ctx context.Context, action, details string, metadata map[string]interface{}) error
}

// DatabaseAuditLogger implements AuditLogger using database storage
type DatabaseAuditLogger struct {
	// In a real implementation, this would have database connection
	// For now, we'll use a simple in-memory store for demonstration
	events []AuditEvent
}

// NewDatabaseAuditLogger creates a new database audit logger
func NewDatabaseAuditLogger() *DatabaseAuditLogger {
	return &DatabaseAuditLogger{
		events: make([]AuditEvent, 0),
	}
}

// LogEvent logs a general audit event
func (dal *DatabaseAuditLogger) LogEvent(ctx context.Context, event *AuditEvent) error {
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	
	// Mask sensitive data in request data
	if event.RequestData != nil {
		event.RequestData = MaskSensitiveData(event.RequestData)
	}
	
	// Store event (in real implementation, this would go to database)
	dal.events = append(dal.events, *event)
	
	// In production, you might also want to:
	// 1. Send to external SIEM systems
	// 2. Trigger alerts for high-risk events
	// 3. Store in multiple locations for redundancy
	
	return nil
}

// LogAuthEvent logs authentication-related events
func (dal *DatabaseAuditLogger) LogAuthEvent(ctx context.Context, userID, username, ipAddress, userAgent, action string, success bool, errorMsg *string) error {
	risk := RiskMedium
	if !success {
		risk = RiskHigh
	}
	if action == "login_failed" || action == "password_reset" {
		risk = RiskHigh
	}
	
	event := &AuditEvent{
		UserID:     &userID,
		Username:   &username,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		Action:     action,
		Resource:   "authentication",
		Method:     "POST",
		Success:    success,
		ErrorMsg:   errorMsg,
		Risk:       risk,
		Metadata: map[string]interface{}{
			"event_type": "authentication",
		},
	}
	
	return dal.LogEvent(ctx, event)
}

// LogDataAccess logs data access events
func (dal *DatabaseAuditLogger) LogDataAccess(ctx context.Context, userID, username, ipAddress, resource, resourceID, action string) error {
	risk := RiskLow
	if action == "delete" || action == "update" {
		risk = RiskMedium
	}
	if resource == "users" || resource == "merchants" {
		risk = RiskMedium
	}
	
	event := &AuditEvent{
		UserID:     &userID,
		Username:   &username,
		IPAddress:  ipAddress,
		Action:     action,
		Resource:   resource,
		ResourceID: &resourceID,
		Success:    true,
		Risk:       risk,
		Metadata: map[string]interface{}{
			"event_type": "data_access",
		},
	}
	
	return dal.LogEvent(ctx, event)
}

// LogSecurityEvent logs security-related events
func (dal *DatabaseAuditLogger) LogSecurityEvent(ctx context.Context, ipAddress, userAgent, event, details string, risk RiskLevel) error {
	auditEvent := &AuditEvent{
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Action:    event,
		Resource:  "security",
		Success:   false, // Security events are typically failures
		Risk:      risk,
		Metadata: map[string]interface{}{
			"event_type": "security",
			"details":    details,
		},
	}
	
	return dal.LogEvent(ctx, auditEvent)
}

// LogSystemEvent logs system-level events
func (dal *DatabaseAuditLogger) LogSystemEvent(ctx context.Context, action, details string, metadata map[string]interface{}) error {
	if metadata == nil {
		metadata = make(map[string]interface{})
	}
	metadata["event_type"] = "system"
	metadata["details"] = details
	
	event := &AuditEvent{
		Action:   action,
		Resource: "system",
		Success:  true,
		Risk:     RiskLow,
		Metadata: metadata,
	}
	
	return dal.LogEvent(ctx, event)
}

// GetEvents returns audit events (for testing/debugging)
func (dal *DatabaseAuditLogger) GetEvents() []AuditEvent {
	return dal.events
}

// SecurityMonitor monitors security events and triggers alerts
type SecurityMonitor struct {
	auditLogger AuditLogger
	alertThresholds map[string]AlertThreshold
}

// AlertThreshold defines thresholds for security alerts
type AlertThreshold struct {
	MaxAttempts int
	TimeWindow  time.Duration
	RiskLevel   RiskLevel
}

// NewSecurityMonitor creates a new security monitor
func NewSecurityMonitor(auditLogger AuditLogger) *SecurityMonitor {
	return &SecurityMonitor{
		auditLogger: auditLogger,
		alertThresholds: map[string]AlertThreshold{
			"login_failed": {
				MaxAttempts: 5,
				TimeWindow:  15 * time.Minute,
				RiskLevel:   RiskHigh,
			},
			"sql_injection": {
				MaxAttempts: 1,
				TimeWindow:  time.Hour,
				RiskLevel:   RiskCritical,
			},
			"xss_attempt": {
				MaxAttempts: 1,
				TimeWindow:  time.Hour,
				RiskLevel:   RiskHigh,
			},
			"rate_limit_exceeded": {
				MaxAttempts: 10,
				TimeWindow:  time.Hour,
				RiskLevel:   RiskMedium,
			},
		},
	}
}

// MonitorFailedLogin monitors failed login attempts
func (sm *SecurityMonitor) MonitorFailedLogin(ctx context.Context, ipAddress, username string) error {
	return sm.auditLogger.LogSecurityEvent(ctx, ipAddress, "", "login_failed", 
		fmt.Sprintf("Failed login attempt for user: %s", username), RiskHigh)
}

// MonitorSQLInjection monitors SQL injection attempts
func (sm *SecurityMonitor) MonitorSQLInjection(ctx context.Context, ipAddress, userAgent, input string) error {
	return sm.auditLogger.LogSecurityEvent(ctx, ipAddress, userAgent, "sql_injection", 
		fmt.Sprintf("SQL injection attempt detected: %s", input), RiskCritical)
}

// MonitorXSSAttempt monitors XSS attempts
func (sm *SecurityMonitor) MonitorXSSAttempt(ctx context.Context, ipAddress, userAgent, input string) error {
	return sm.auditLogger.LogSecurityEvent(ctx, ipAddress, userAgent, "xss_attempt", 
		fmt.Sprintf("XSS attempt detected: %s", input), RiskHigh)
}

// MonitorRateLimitExceeded monitors rate limit violations
func (sm *SecurityMonitor) MonitorRateLimitExceeded(ctx context.Context, ipAddress, endpoint string) error {
	return sm.auditLogger.LogSecurityEvent(ctx, ipAddress, "", "rate_limit_exceeded", 
		fmt.Sprintf("Rate limit exceeded for endpoint: %s", endpoint), RiskMedium)
}

// MonitorUnauthorizedAccess monitors unauthorized access attempts
func (sm *SecurityMonitor) MonitorUnauthorizedAccess(ctx context.Context, ipAddress, userAgent, resource string) error {
	return sm.auditLogger.LogSecurityEvent(ctx, ipAddress, userAgent, "unauthorized_access", 
		fmt.Sprintf("Unauthorized access attempt to resource: %s", resource), RiskHigh)
}

// AuditEventFilter provides filtering capabilities for audit events
type AuditEventFilter struct {
	StartTime  *time.Time `json:"start_time,omitempty"`
	EndTime    *time.Time `json:"end_time,omitempty"`
	UserID     *string    `json:"user_id,omitempty"`
	IPAddress  *string    `json:"ip_address,omitempty"`
	Action     *string    `json:"action,omitempty"`
	Resource   *string    `json:"resource,omitempty"`
	Success    *bool      `json:"success,omitempty"`
	RiskLevel  *RiskLevel `json:"risk_level,omitempty"`
	Limit      int        `json:"limit,omitempty"`
	Offset     int        `json:"offset,omitempty"`
}

// AuditReporter generates audit reports
type AuditReporter struct {
	auditLogger AuditLogger
}

// NewAuditReporter creates a new audit reporter
func NewAuditReporter(auditLogger AuditLogger) *AuditReporter {
	return &AuditReporter{
		auditLogger: auditLogger,
	}
}

// GenerateSecurityReport generates a security report
func (ar *AuditReporter) GenerateSecurityReport(filter AuditEventFilter) (map[string]interface{}, error) {
	// Try to get events if the logger supports it
	var events []AuditEvent
	if dbLogger, ok := ar.auditLogger.(*DatabaseAuditLogger); ok {
		events = dbLogger.GetEvents()
	} else {
		// Return empty report if we can't get events
		return map[string]interface{}{
			"total_events":     0,
			"success_count":    0,
			"failure_count":    0,
			"risk_breakdown":   make(map[RiskLevel]int),
			"action_breakdown": make(map[string]int),
			"top_ips":          make(map[string]int),
		}, nil
	}
	
	// Filter events
	filteredEvents := ar.filterEvents(events, filter)
	
	// Generate statistics
	stats := map[string]interface{}{
		"total_events":    len(filteredEvents),
		"success_count":   0,
		"failure_count":   0,
		"risk_breakdown":  make(map[RiskLevel]int),
		"action_breakdown": make(map[string]int),
		"top_ips":         make(map[string]int),
	}
	
	riskBreakdown := stats["risk_breakdown"].(map[RiskLevel]int)
	actionBreakdown := stats["action_breakdown"].(map[string]int)
	topIPs := stats["top_ips"].(map[string]int)
	
	for _, event := range filteredEvents {
		if event.Success {
			stats["success_count"] = stats["success_count"].(int) + 1
		} else {
			stats["failure_count"] = stats["failure_count"].(int) + 1
		}
		
		riskBreakdown[event.Risk]++
		actionBreakdown[event.Action]++
		topIPs[event.IPAddress]++
	}
	
	return stats, nil
}

// filterEvents filters events based on the provided filter
func (ar *AuditReporter) filterEvents(events []AuditEvent, filter AuditEventFilter) []AuditEvent {
	var filtered []AuditEvent
	
	for _, event := range events {
		if filter.StartTime != nil && event.Timestamp.Before(*filter.StartTime) {
			continue
		}
		if filter.EndTime != nil && event.Timestamp.After(*filter.EndTime) {
			continue
		}
		if filter.UserID != nil && (event.UserID == nil || *event.UserID != *filter.UserID) {
			continue
		}
		if filter.IPAddress != nil && event.IPAddress != *filter.IPAddress {
			continue
		}
		if filter.Action != nil && event.Action != *filter.Action {
			continue
		}
		if filter.Resource != nil && event.Resource != *filter.Resource {
			continue
		}
		if filter.Success != nil && event.Success != *filter.Success {
			continue
		}
		if filter.RiskLevel != nil && event.Risk != *filter.RiskLevel {
			continue
		}
		
		filtered = append(filtered, event)
	}
	
	// Apply pagination
	if filter.Offset > 0 && filter.Offset < len(filtered) {
		filtered = filtered[filter.Offset:]
	}
	if filter.Limit > 0 && filter.Limit < len(filtered) {
		filtered = filtered[:filter.Limit]
	}
	
	return filtered
}
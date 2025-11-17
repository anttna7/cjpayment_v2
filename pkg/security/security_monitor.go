package security

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

// SecurityAlert represents a security alert
type SecurityAlert struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Severity    string                 `json:"severity"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Timestamp   time.Time              `json:"timestamp"`
	Source      string                 `json:"source"`
	UserID      uint                   `json:"user_id,omitempty"`
	IPAddress   string                 `json:"ip_address,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Status      string                 `json:"status"` // active, acknowledged, resolved
	Actions     []string               `json:"actions,omitempty"`
}

// ThreatPattern represents a security threat pattern
type ThreatPattern struct {
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Conditions  []Condition   `json:"conditions"`
	Threshold   int           `json:"threshold"`
	TimeWindow  time.Duration `json:"time_window"`
	Severity    string        `json:"severity"`
	Actions     []string      `json:"actions"`
}

// Condition represents a condition for threat detection
type Condition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"` // eq, ne, gt, lt, contains, regex
	Value    interface{} `json:"value"`
}

// SecurityMonitor handles security monitoring and alerting
type SecurityMonitor struct {
	redis           *redis.Client
	logger          *logrus.Logger
	encryptor       *EncryptionService
	auditLogger     *AuditLogger
	threatPatterns  map[string]ThreatPattern
	alertHandlers   map[string]func(SecurityAlert) error
	mu              sync.RWMutex
	stopChan        chan struct{}
	alertThresholds map[string]int
}

// NewSecurityMonitor creates a new security monitor
func NewSecurityMonitor(redisClient *redis.Client, logger *logrus.Logger, encryptor *EncryptionService, auditLogger *AuditLogger) *SecurityMonitor {
	sm := &SecurityMonitor{
		redis:           redisClient,
		logger:          logger,
		encryptor:       encryptor,
		auditLogger:     auditLogger,
		threatPatterns:  make(map[string]ThreatPattern),
		alertHandlers:   make(map[string]func(SecurityAlert) error),
		stopChan:        make(chan struct{}),
		alertThresholds: make(map[string]int),
	}

	// Initialize default threat patterns
	sm.initializeDefaultThreatPatterns()
	
	// Initialize default alert handlers
	sm.initializeDefaultAlertHandlers()

	return sm
}

// Start starts the security monitoring
func (sm *SecurityMonitor) Start() {
	go sm.monitoringLoop()
	sm.logger.Info("Security monitor started")
}

// Stop stops the security monitoring
func (sm *SecurityMonitor) Stop() {
	close(sm.stopChan)
	sm.logger.Info("Security monitor stopped")
}

// initializeDefaultThreatPatterns sets up default threat detection patterns
func (sm *SecurityMonitor) initializeDefaultThreatPatterns() {
	// Brute force login attempts
	sm.threatPatterns["brute_force_login"] = ThreatPattern{
		Name:        "Brute Force Login",
		Description: "Multiple failed login attempts from same IP",
		Conditions: []Condition{
			{Field: "event_type", Operator: "eq", Value: "login"},
			{Field: "success", Operator: "eq", Value: false},
		},
		Threshold:  5,
		TimeWindow: 15 * time.Minute,
		Severity:   "high",
		Actions:    []string{"block_ip", "notify_admin"},
	}

	// Suspicious access patterns
	sm.threatPatterns["suspicious_access"] = ThreatPattern{
		Name:        "Suspicious Access Pattern",
		Description: "Unusual access patterns detected",
		Conditions: []Condition{
			{Field: "risk_level", Operator: "eq", Value: "high"},
		},
		Threshold:  3,
		TimeWindow: 5 * time.Minute,
		Severity:   "medium",
		Actions:    []string{"notify_admin"},
	}

	// Multiple account access
	sm.threatPatterns["account_enumeration"] = ThreatPattern{
		Name:        "Account Enumeration",
		Description: "Attempts to access multiple accounts from same IP",
		Conditions: []Condition{
			{Field: "event_type", Operator: "eq", Value: "access"},
			{Field: "resource", Operator: "eq", Value: "accounts"},
		},
		Threshold:  10,
		TimeWindow: 10 * time.Minute,
		Severity:   "medium",
		Actions:    []string{"rate_limit", "notify_admin"},
	}

	// Privilege escalation attempts
	sm.threatPatterns["privilege_escalation"] = ThreatPattern{
		Name:        "Privilege Escalation",
		Description: "Attempts to access resources without permission",
		Conditions: []Condition{
			{Field: "success", Operator: "eq", Value: false},
			{Field: "status_code", Operator: "eq", Value: 403},
		},
		Threshold:  3,
		TimeWindow: 5 * time.Minute,
		Severity:   "high",
		Actions:    []string{"block_user", "notify_admin"},
	}

	// Data exfiltration attempts
	sm.threatPatterns["data_exfiltration"] = ThreatPattern{
		Name:        "Data Exfiltration",
		Description: "Large amounts of data being accessed",
		Conditions: []Condition{
			{Field: "action", Operator: "eq", Value: "export"},
		},
		Threshold:  5,
		TimeWindow: 30 * time.Minute,
		Severity:   "high",
		Actions:    []string{"notify_admin", "require_approval"},
	}

	// Unusual time access
	sm.threatPatterns["unusual_time_access"] = ThreatPattern{
		Name:        "Unusual Time Access",
		Description: "Access during unusual hours",
		Conditions: []Condition{
			{Field: "event_type", Operator: "eq", Value: "api_request"},
		},
		Threshold:  10,
		TimeWindow: 1 * time.Hour,
		Severity:   "low",
		Actions:    []string{"log_alert"},
	}
}

// initializeDefaultAlertHandlers sets up default alert handlers
func (sm *SecurityMonitor) initializeDefaultAlertHandlers() {
	sm.alertHandlers["block_ip"] = sm.handleBlockIP
	sm.alertHandlers["block_user"] = sm.handleBlockUser
	sm.alertHandlers["rate_limit"] = sm.handleRateLimit
	sm.alertHandlers["notify_admin"] = sm.handleNotifyAdmin
	sm.alertHandlers["require_approval"] = sm.handleRequireApproval
	sm.alertHandlers["log_alert"] = sm.handleLogAlert
}

// monitoringLoop runs the main monitoring loop
func (sm *SecurityMonitor) monitoringLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			sm.checkThreatPatterns()
		case <-sm.stopChan:
			return
		}
	}
}

// checkThreatPatterns checks all threat patterns for matches
func (sm *SecurityMonitor) checkThreatPatterns() {
	sm.mu.RLock()
	patterns := make(map[string]ThreatPattern)
	for k, v := range sm.threatPatterns {
		patterns[k] = v
	}
	sm.mu.RUnlock()

	for patternName, pattern := range patterns {
		if sm.checkPattern(patternName, pattern) {
			sm.triggerAlert(patternName, pattern)
		}
	}
}

// checkPattern checks if a specific threat pattern matches
func (sm *SecurityMonitor) checkPattern(patternName string, pattern ThreatPattern) bool {
	if sm.redis == nil {
		return false
	}

	ctx := context.Background()
	now := time.Now()
	windowStart := now.Add(-pattern.TimeWindow)

	// Get events from the time window
	key := fmt.Sprintf("audit:events:%s", now.Format("2006-01-02"))
	events, err := sm.redis.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min: fmt.Sprintf("%d", windowStart.Unix()),
		Max: fmt.Sprintf("%d", now.Unix()),
	}).Result()

	if err != nil {
		sm.logger.WithError(err).Error("Failed to get events from Redis")
		return false
	}

	// Count matching events
	matchCount := 0
	ipCounts := make(map[string]int)
	userCounts := make(map[uint]int)

	for _, eventStr := range events {
		var event AuditEvent
		if err := json.Unmarshal([]byte(eventStr), &event); err != nil {
			continue
		}

		if sm.eventMatchesConditions(event, pattern.Conditions) {
			matchCount++
			ipCounts[event.IPAddress]++
			if event.UserID > 0 {
				userCounts[event.UserID]++
			}
		}
	}

	// Check if threshold is exceeded
	if matchCount >= pattern.Threshold {
		// Store additional context for alert
		sm.storeAlertContext(patternName, map[string]interface{}{
			"match_count":  matchCount,
			"ip_counts":    ipCounts,
			"user_counts":  userCounts,
			"time_window":  pattern.TimeWindow.String(),
		})
		return true
	}

	return false
}

// eventMatchesConditions checks if an event matches all conditions
func (sm *SecurityMonitor) eventMatchesConditions(event AuditEvent, conditions []Condition) bool {
	for _, condition := range conditions {
		if !sm.evaluateCondition(event, condition) {
			return false
		}
	}
	return true
}

// evaluateCondition evaluates a single condition against an event
func (sm *SecurityMonitor) evaluateCondition(event AuditEvent, condition Condition) bool {
	var fieldValue interface{}

	// Get field value from event
	switch condition.Field {
	case "event_type":
		fieldValue = event.EventType
	case "user_id":
		fieldValue = event.UserID
	case "username":
		fieldValue = event.Username
	case "user_role":
		fieldValue = event.UserRole
	case "ip_address":
		fieldValue = event.IPAddress
	case "resource":
		fieldValue = event.Resource
	case "action":
		fieldValue = event.Action
	case "method":
		fieldValue = event.Method
	case "path":
		fieldValue = event.Path
	case "status_code":
		fieldValue = event.StatusCode
	case "success":
		fieldValue = event.Success
	case "risk_level":
		fieldValue = event.RiskLevel
	default:
		// Check in details
		if event.Details != nil {
			fieldValue = event.Details[condition.Field]
		}
	}

	// Evaluate condition
	switch condition.Operator {
	case "eq":
		return fieldValue == condition.Value
	case "ne":
		return fieldValue != condition.Value
	case "gt":
		if fv, ok := fieldValue.(int); ok {
			if cv, ok := condition.Value.(int); ok {
				return fv > cv
			}
		}
	case "lt":
		if fv, ok := fieldValue.(int); ok {
			if cv, ok := condition.Value.(int); ok {
				return fv < cv
			}
		}
	case "contains":
		if fv, ok := fieldValue.(string); ok {
			if cv, ok := condition.Value.(string); ok {
				return strings.Contains(fv, cv)
			}
		}
	case "regex":
		// Implement regex matching if needed
		return false
	}

	return false
}

// triggerAlert triggers a security alert
func (sm *SecurityMonitor) triggerAlert(patternName string, pattern ThreatPattern) {
	alertID, _ := sm.encryptor.GenerateSecureToken(16)
	
	alert := SecurityAlert{
		ID:          alertID,
		Type:        patternName,
		Severity:    pattern.Severity,
		Title:       pattern.Name,
		Description: pattern.Description,
		Timestamp:   time.Now(),
		Source:      "security_monitor",
		Status:      "active",
		Actions:     pattern.Actions,
	}

	// Get additional context
	if context := sm.getAlertContext(patternName); context != nil {
		alert.Details = context
	}

	// Store alert
	sm.storeAlert(alert)

	// Execute actions
	for _, action := range pattern.Actions {
		if handler, exists := sm.alertHandlers[action]; exists {
			if err := handler(alert); err != nil {
				sm.logger.WithError(err).Errorf("Failed to execute action %s for alert %s", action, alertID)
			}
		}
	}

	// Log alert
	sm.logger.WithFields(logrus.Fields{
		"alert_id":    alert.ID,
		"alert_type":  alert.Type,
		"severity":    alert.Severity,
		"title":       alert.Title,
	}).Warn("Security alert triggered")
}

// storeAlert stores an alert in Redis
func (sm *SecurityMonitor) storeAlert(alert SecurityAlert) error {
	if sm.redis == nil {
		return nil
	}

	ctx := context.Background()
	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("failed to marshal alert: %w", err)
	}

	// Store in alerts set
	key := fmt.Sprintf("security:alerts:%s", alert.Timestamp.Format("2006-01-02"))
	score := float64(alert.Timestamp.Unix())

	if err := sm.redis.ZAdd(ctx, key, redis.Z{
		Score:  score,
		Member: alertJSON,
	}).Err(); err != nil {
		return fmt.Errorf("failed to store alert: %w", err)
	}

	// Set expiry
	sm.redis.Expire(ctx, key, 30*24*time.Hour)

	// Store in severity-specific sets
	severityKey := fmt.Sprintf("security:alerts:severity:%s", alert.Severity)
	sm.redis.ZAdd(ctx, severityKey, redis.Z{
		Score:  score,
		Member: alertJSON,
	})
	sm.redis.Expire(ctx, severityKey, 7*24*time.Hour)

	return nil
}

// storeAlertContext stores additional context for an alert
func (sm *SecurityMonitor) storeAlertContext(patternName string, context map[string]interface{}) {
	if sm.redis == nil {
		return
	}

	key := fmt.Sprintf("security:alert_context:%s", patternName)
	contextJSON, _ := json.Marshal(context)
	sm.redis.Set(context.Background(), key, contextJSON, 5*time.Minute)
}

// getAlertContext retrieves alert context
func (sm *SecurityMonitor) getAlertContext(patternName string) map[string]interface{} {
	if sm.redis == nil {
		return nil
	}

	key := fmt.Sprintf("security:alert_context:%s", patternName)
	contextJSON, err := sm.redis.Get(context.Background(), key).Result()
	if err != nil {
		return nil
	}

	var context map[string]interface{}
	json.Unmarshal([]byte(contextJSON), &context)
	return context
}

// Alert handlers
func (sm *SecurityMonitor) handleBlockIP(alert SecurityAlert) error {
	// Implementation for blocking IP
	sm.logger.WithField("alert_id", alert.ID).Info("IP blocking action triggered")
	return nil
}

func (sm *SecurityMonitor) handleBlockUser(alert SecurityAlert) error {
	// Implementation for blocking user
	sm.logger.WithField("alert_id", alert.ID).Info("User blocking action triggered")
	return nil
}

func (sm *SecurityMonitor) handleRateLimit(alert SecurityAlert) error {
	// Implementation for rate limiting
	sm.logger.WithField("alert_id", alert.ID).Info("Rate limiting action triggered")
	return nil
}

func (sm *SecurityMonitor) handleNotifyAdmin(alert SecurityAlert) error {
	// Implementation for admin notification
	sm.logger.WithField("alert_id", alert.ID).Info("Admin notification sent")
	return nil
}

func (sm *SecurityMonitor) handleRequireApproval(alert SecurityAlert) error {
	// Implementation for requiring approval
	sm.logger.WithField("alert_id", alert.ID).Info("Approval requirement triggered")
	return nil
}

func (sm *SecurityMonitor) handleLogAlert(alert SecurityAlert) error {
	// Implementation for logging alert
	sm.logger.WithField("alert_id", alert.ID).Info("Alert logged")
	return nil
}

// Public methods for managing threat patterns and alerts
func (sm *SecurityMonitor) AddThreatPattern(name string, pattern ThreatPattern) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.threatPatterns[name] = pattern
}

func (sm *SecurityMonitor) RemoveThreatPattern(name string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.threatPatterns, name)
}

func (sm *SecurityMonitor) GetAlerts(severity string, limit int) ([]SecurityAlert, error) {
	if sm.redis == nil {
		return nil, fmt.Errorf("Redis not available")
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:alerts:severity:%s", severity)
	
	alertStrings, err := sm.redis.ZRevRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get alerts: %w", err)
	}

	alerts := make([]SecurityAlert, 0, len(alertStrings))
	for _, alertStr := range alertStrings {
		var alert SecurityAlert
		if err := json.Unmarshal([]byte(alertStr), &alert); err == nil {
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

func (sm *SecurityMonitor) AcknowledgeAlert(alertID string) error {
	// Implementation for acknowledging alerts
	sm.logger.WithField("alert_id", alertID).Info("Alert acknowledged")
	return nil
}

func (sm *SecurityMonitor) ResolveAlert(alertID string) error {
	// Implementation for resolving alerts
	sm.logger.WithField("alert_id", alertID).Info("Alert resolved")
	return nil
}
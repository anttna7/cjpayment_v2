package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/company/cjpayment/pkg/security"
	"github.com/google/uuid"
)

// permissionMonitorServiceImpl implements the PermissionMonitorService interface
type permissionMonitorServiceImpl struct {
	violations      []*PermissionViolation
	alerts          []*PermissionAlert
	auditLogger     security.AuditLogger
	securityMonitor *security.SecurityMonitor
	isMonitoring    bool
	startedAt       *time.Time
	lastActivityAt  *time.Time
	processedEvents int64
	detectedViolations int64
	mutex           sync.RWMutex
}

// NewPermissionMonitorService creates a new permission monitor service
func NewPermissionMonitorService(auditLogger security.AuditLogger, securityMonitor *security.SecurityMonitor) PermissionMonitorService {
	return &permissionMonitorServiceImpl{
		violations:      make([]*PermissionViolation, 0),
		alerts:          make([]*PermissionAlert, 0),
		auditLogger:     auditLogger,
		securityMonitor: securityMonitor,
		isMonitoring:    false,
	}
}

// GetViolations retrieves violations with filtering
func (s *permissionMonitorServiceImpl) GetViolations(ctx context.Context, filter *ViolationFilter) ([]*PermissionViolation, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var filtered []*PermissionViolation

	for _, violation := range s.violations {
		if s.matchesFilter(violation, filter) {
			filtered = append(filtered, violation)
		}

		if len(filtered) >= filter.Limit {
			break
		}
	}

	return filtered, nil
}

// GetViolationsByUser retrieves violations for a specific user
func (s *permissionMonitorServiceImpl) GetViolationsByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*PermissionViolation, error) {
	filter := &ViolationFilter{
		UserID: &userID,
		Limit:  limit,
	}
	return s.GetViolations(ctx, filter)
}

// ResolveViolation marks a violation as resolved
func (s *permissionMonitorServiceImpl) ResolveViolation(ctx context.Context, violationID uuid.UUID, resolvedBy uuid.UUID) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	for i, violation := range s.violations {
		if violation.ID == violationID {
			now := time.Now()
			s.violations[i].IsResolved = true
			s.violations[i].ResolvedBy = &resolvedBy
			s.violations[i].ResolvedAt = &now

			// Log resolution
			if s.auditLogger != nil {
				resolvedByStr := resolvedBy.String()
				violationIDStr := violationID.String()
				s.auditLogger.LogEvent(ctx, &security.AuditEvent{
					UserID:    &resolvedByStr,
					Action:    "violation_resolved",
					Resource:  "permission_violation",
					ResourceID: &violationIDStr,
					Success:   true,
					Risk:      security.RiskLow,
					Metadata: map[string]interface{}{
						"violation_id": violationID.String(),
						"violation_type": violation.ViolationType,
					},
				})
			}

			return nil
		}
	}

	return ErrViolationNotFound
}

// RecordViolation records a new permission violation
func (s *permissionMonitorServiceImpl) RecordViolation(ctx context.Context, violation *PermissionViolation) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if violation.ID == uuid.Nil {
		violation.ID = uuid.New()
	}
	if violation.CreatedAt.IsZero() {
		violation.CreatedAt = time.Now()
	}

	s.violations = append(s.violations, violation)
	s.detectedViolations++

	// Log violation
	if s.auditLogger != nil {
		userIDStr := violation.UserID.String()
		s.auditLogger.LogEvent(ctx, &security.AuditEvent{
			UserID:     &userIDStr,
			Username:   &violation.Username,
			IPAddress:  violation.IPAddress,
			UserAgent:  violation.UserAgent,
			Action:     "violation_recorded",
			Resource:   violation.Resource,
			Method:     "POST",
			Success:    false,
			Risk:       s.severityToRisk(violation.Severity),
			Metadata: map[string]interface{}{
				"violation_id":   violation.ID.String(),
				"violation_type": violation.ViolationType,
				"description":    violation.Description,
			},
		})
	}

	// Check if any alerts should be triggered
	s.checkAlertsForViolation(ctx, violation)

	return nil
}

// CreateAlert creates a new permission alert
func (s *permissionMonitorServiceImpl) CreateAlert(ctx context.Context, alert *PermissionAlert) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if alert.ID == uuid.Nil {
		alert.ID = uuid.New()
	}
	if alert.CreatedAt.IsZero() {
		alert.CreatedAt = time.Now()
	}
	alert.UpdatedAt = time.Now()

	s.alerts = append(s.alerts, alert)

	return nil
}

// UpdateAlert updates an existing alert
func (s *permissionMonitorServiceImpl) UpdateAlert(ctx context.Context, alertID uuid.UUID, alert *PermissionAlert) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	for i, existingAlert := range s.alerts {
		if existingAlert.ID == alertID {
			alert.ID = alertID
			alert.CreatedAt = existingAlert.CreatedAt
			alert.UpdatedAt = time.Now()
			s.alerts[i] = alert
			return nil
		}
	}

	return ErrAlertNotFound
}

// DeleteAlert deletes an alert
func (s *permissionMonitorServiceImpl) DeleteAlert(ctx context.Context, alertID uuid.UUID) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	for i, alert := range s.alerts {
		if alert.ID == alertID {
			s.alerts = append(s.alerts[:i], s.alerts[i+1:]...)
			return nil
		}
	}

	return ErrAlertNotFound
}

// GetAlert retrieves a specific alert
func (s *permissionMonitorServiceImpl) GetAlert(ctx context.Context, alertID uuid.UUID) (*PermissionAlert, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	for _, alert := range s.alerts {
		if alert.ID == alertID {
			return alert, nil
		}
	}

	return nil, ErrAlertNotFound
}

// ListAlerts retrieves all alerts
func (s *permissionMonitorServiceImpl) ListAlerts(ctx context.Context) ([]*PermissionAlert, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	// Return a copy of the alerts slice
	alerts := make([]*PermissionAlert, len(s.alerts))
	copy(alerts, s.alerts)

	return alerts, nil
}

// GetSecurityMetrics retrieves security metrics for a time range
func (s *permissionMonitorServiceImpl) GetSecurityMetrics(ctx context.Context, timeRange time.Duration) (*SecurityMetrics, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	cutoffTime := time.Now().Add(-timeRange)
	
	metrics := &SecurityMetrics{
		ViolationsByType:     make(map[string]int),
		ViolationsBySeverity: make(map[string]int),
		TopViolatingUsers:    make([]UserViolationSummary, 0),
		TimeRange:            timeRange,
		GeneratedAt:          time.Now(),
	}

	userViolationCounts := make(map[uuid.UUID]*UserViolationSummary)

	for _, violation := range s.violations {
		if violation.CreatedAt.Before(cutoffTime) {
			continue
		}

		metrics.TotalViolations++
		
		if violation.IsResolved {
			metrics.ResolvedViolations++
		} else {
			metrics.PendingViolations++
		}

		// Count by type
		metrics.ViolationsByType[violation.ViolationType]++

		// Count by severity
		metrics.ViolationsBySeverity[violation.Severity]++

		// Track user violations
		if summary, exists := userViolationCounts[violation.UserID]; exists {
			summary.ViolationCount++
			if violation.CreatedAt.After(summary.LastViolation) {
				summary.LastViolation = violation.CreatedAt
			}
		} else {
			userViolationCounts[violation.UserID] = &UserViolationSummary{
				UserID:         violation.UserID,
				Username:       violation.Username,
				ViolationCount: 1,
				LastViolation:  violation.CreatedAt,
			}
		}
	}

	// Convert user violation counts to sorted list (top 10)
	for _, summary := range userViolationCounts {
		metrics.TopViolatingUsers = append(metrics.TopViolatingUsers, *summary)
	}

	// Sort by violation count (simple bubble sort for small datasets)
	for i := 0; i < len(metrics.TopViolatingUsers)-1; i++ {
		for j := 0; j < len(metrics.TopViolatingUsers)-i-1; j++ {
			if metrics.TopViolatingUsers[j].ViolationCount < metrics.TopViolatingUsers[j+1].ViolationCount {
				metrics.TopViolatingUsers[j], metrics.TopViolatingUsers[j+1] = 
					metrics.TopViolatingUsers[j+1], metrics.TopViolatingUsers[j]
			}
		}
	}

	// Limit to top 10
	if len(metrics.TopViolatingUsers) > 10 {
		metrics.TopViolatingUsers = metrics.TopViolatingUsers[:10]
	}

	return metrics, nil
}

// GetUserRiskScore calculates risk score for a user
func (s *permissionMonitorServiceImpl) GetUserRiskScore(ctx context.Context, userID uuid.UUID) (*UserRiskScore, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	riskScore := &UserRiskScore{
		UserID:       userID,
		RiskScore:    0,
		RiskLevel:    "low",
		CalculatedAt: time.Now(),
	}

	recentCutoff := time.Now().Add(-7 * 24 * time.Hour) // Last 7 days

	for _, violation := range s.violations {
		if violation.UserID != userID {
			continue
		}

		riskScore.ViolationCount++
		
		if violation.CreatedAt.After(recentCutoff) {
			riskScore.RecentViolations++
		}

		if riskScore.LastViolation == nil || violation.CreatedAt.After(*riskScore.LastViolation) {
			riskScore.LastViolation = &violation.CreatedAt
		}

		// Add to risk score based on severity
		switch violation.Severity {
		case "high":
			riskScore.RiskScore += 30
		case "medium":
			riskScore.RiskScore += 20
		case "low":
			riskScore.RiskScore += 10
		}

		// Get username from first violation
		if riskScore.Username == "" {
			riskScore.Username = violation.Username
		}
	}

	// Determine risk level
	if riskScore.RiskScore >= 100 {
		riskScore.RiskLevel = "critical"
	} else if riskScore.RiskScore >= 60 {
		riskScore.RiskLevel = "high"
	} else if riskScore.RiskScore >= 30 {
		riskScore.RiskLevel = "medium"
	}

	return riskScore, nil
}

// GetSuspiciousActivities retrieves recent suspicious activities
func (s *permissionMonitorServiceImpl) GetSuspiciousActivities(ctx context.Context, limit int) ([]*SuspiciousActivity, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var activities []*SuspiciousActivity
	recentCutoff := time.Now().Add(-24 * time.Hour) // Last 24 hours

	for _, violation := range s.violations {
		if violation.CreatedAt.Before(recentCutoff) {
			continue
		}

		activity := &SuspiciousActivity{
			ID:           violation.ID,
			UserID:       violation.UserID,
			Username:     violation.Username,
			ActivityType: violation.ViolationType,
			Description:  violation.Description,
			IPAddress:    violation.IPAddress,
			UserAgent:    violation.UserAgent,
			Severity:     violation.Severity,
			Metadata:     violation.Metadata,
			DetectedAt:   violation.CreatedAt,
		}

		activities = append(activities, activity)

		if len(activities) >= limit {
			break
		}
	}

	return activities, nil
}

// StartMonitoring starts the permission monitoring
func (s *permissionMonitorServiceImpl) StartMonitoring(ctx context.Context) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.isMonitoring {
		return fmt.Errorf("monitoring is already active")
	}

	now := time.Now()
	s.isMonitoring = true
	s.startedAt = &now
	s.lastActivityAt = &now

	return nil
}

// StopMonitoring stops the permission monitoring
func (s *permissionMonitorServiceImpl) StopMonitoring(ctx context.Context) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if !s.isMonitoring {
		return fmt.Errorf("monitoring is not active")
	}

	s.isMonitoring = false
	s.startedAt = nil

	return nil
}

// GetMonitoringStatus retrieves the current monitoring status
func (s *permissionMonitorServiceImpl) GetMonitoringStatus(ctx context.Context) (*MonitoringStatus, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	activeAlerts := 0
	for _, alert := range s.alerts {
		if alert.IsActive {
			activeAlerts++
		}
	}

	status := &MonitoringStatus{
		IsActive:           s.isMonitoring,
		StartedAt:          s.startedAt,
		LastActivityAt:     s.lastActivityAt,
		ProcessedEvents:    s.processedEvents,
		DetectedViolations: s.detectedViolations,
		ActiveAlerts:       activeAlerts,
	}

	return status, nil
}

// Helper methods

// matchesFilter checks if a violation matches the given filter
func (s *permissionMonitorServiceImpl) matchesFilter(violation *PermissionViolation, filter *ViolationFilter) bool {
	if filter.UserID != nil && violation.UserID != *filter.UserID {
		return false
	}

	if filter.ViolationType != nil && violation.ViolationType != *filter.ViolationType {
		return false
	}

	if filter.Severity != nil && violation.Severity != *filter.Severity {
		return false
	}

	if filter.IsResolved != nil && violation.IsResolved != *filter.IsResolved {
		return false
	}

	if filter.StartTime != nil && violation.CreatedAt.Before(*filter.StartTime) {
		return false
	}

	if filter.EndTime != nil && violation.CreatedAt.After(*filter.EndTime) {
		return false
	}

	return true
}

// checkAlertsForViolation checks if any alerts should be triggered for a violation
func (s *permissionMonitorServiceImpl) checkAlertsForViolation(ctx context.Context, violation *PermissionViolation) {
	for _, alert := range s.alerts {
		if !alert.IsActive {
			continue
		}

		if s.shouldTriggerAlert(alert, violation) {
			s.triggerAlert(ctx, alert, violation)
		}
	}
}

// shouldTriggerAlert determines if an alert should be triggered
func (s *permissionMonitorServiceImpl) shouldTriggerAlert(alert *PermissionAlert, violation *PermissionViolation) bool {
	// Check alert conditions
	if alertType, exists := alert.Conditions["violation_type"]; exists {
		if alertType != violation.ViolationType {
			return false
		}
	}

	if severity, exists := alert.Conditions["severity"]; exists {
		if severity != violation.Severity {
			return false
		}
	}

	// Count recent violations within time window
	cutoffTime := time.Now().Add(-alert.TimeWindow)
	recentViolations := 0

	for _, v := range s.violations {
		if v.CreatedAt.After(cutoffTime) {
			if alertType, exists := alert.Conditions["violation_type"]; exists {
				if alertType == v.ViolationType {
					recentViolations++
				}
			} else {
				recentViolations++
			}
		}
	}

	return recentViolations >= alert.Threshold
}

// triggerAlert triggers an alert
func (s *permissionMonitorServiceImpl) triggerAlert(ctx context.Context, alert *PermissionAlert, violation *PermissionViolation) {
	// Log alert trigger
	if s.auditLogger != nil {
		s.auditLogger.LogSecurityEvent(ctx, violation.IPAddress, violation.UserAgent,
			"permission_alert_triggered", 
			fmt.Sprintf("Alert: %s, Violation: %s", alert.Name, violation.ViolationType),
			s.severityToRisk(alert.Severity))
	}

	// In a real implementation, you would send notifications to the configured URLs
	// For now, we just log the alert
	fmt.Printf("ALERT TRIGGERED: %s - %s\n", alert.Name, alert.Description)
}

// severityToRisk converts severity string to security risk level
func (s *permissionMonitorServiceImpl) severityToRisk(severity string) security.RiskLevel {
	switch severity {
	case "high", "critical":
		return security.RiskHigh
	case "medium":
		return security.RiskMedium
	case "low":
		return security.RiskLow
	default:
		return security.RiskLow
	}
}
package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/company/cjpayment/pkg/alerts"
	"github.com/company/cjpayment/pkg/consistency"
	"github.com/company/cjpayment/pkg/errors"
	"github.com/company/cjpayment/pkg/recovery"
)

// ErrorHandlingService manages comprehensive error handling and recovery
type ErrorHandlingService struct {
	db                *gorm.DB
	logger            *logrus.Logger
	alertManager      *alerts.AlertManager
	recoveryManager   *recovery.RecoveryManager
	consistencyChecker *consistency.ConsistencyChecker
	config            *ErrorHandlingConfig
	mu                sync.RWMutex
	running           bool
	stopCh            chan struct{}
	errorStats        *ErrorStatistics
}

// ErrorHandlingConfig holds configuration for error handling service
type ErrorHandlingConfig struct {
	EnableRecovery          bool          `yaml:"enable_recovery"`
	EnableConsistencyCheck  bool          `yaml:"enable_consistency_check"`
	EnableAlerts           bool          `yaml:"enable_alerts"`
	ErrorStatsWindow       time.Duration `yaml:"error_stats_window"`
	MaxErrorRate           float64       `yaml:"max_error_rate"`
	CircuitBreakerThreshold int          `yaml:"circuit_breaker_threshold"`
	RecoveryCheckInterval  time.Duration `yaml:"recovery_check_interval"`
}

// ErrorStatistics tracks error statistics
type ErrorStatistics struct {
	mu                sync.RWMutex
	totalErrors       int64
	errorsByCode      map[errors.ErrorCode]int64
	errorsByCategory  map[string]int64
	recentErrors      []ErrorEvent
	windowStart       time.Time
}

// ErrorEvent represents an error event
type ErrorEvent struct {
	Code      errors.ErrorCode `json:"code"`
	Message   string           `json:"message"`
	Source    string           `json:"source"`
	Timestamp time.Time        `json:"timestamp"`
	Severity  errors.ErrorSeverity `json:"severity"`
}

// CircuitBreaker manages circuit breaker state
type CircuitBreaker struct {
	mu           sync.RWMutex
	state        CircuitState
	failures     int
	lastFailure  time.Time
	timeout      time.Duration
	threshold    int
}

// CircuitState represents circuit breaker states
type CircuitState int

const (
	CircuitClosed CircuitState = iota
	CircuitOpen
	CircuitHalfOpen
)

// NewErrorHandlingService creates a new error handling service
func NewErrorHandlingService(
	db *gorm.DB,
	logger *logrus.Logger,
	config *ErrorHandlingConfig,
) *ErrorHandlingService {
	if config == nil {
		config = &ErrorHandlingConfig{
			EnableRecovery:          true,
			EnableConsistencyCheck:  true,
			EnableAlerts:           true,
			ErrorStatsWindow:       time.Hour,
			MaxErrorRate:           0.1, // 10%
			CircuitBreakerThreshold: 10,
			RecoveryCheckInterval:  30 * time.Second,
		}
	}

	ehs := &ErrorHandlingService{
		db:     db,
		logger: logger,
		config: config,
		stopCh: make(chan struct{}),
		errorStats: &ErrorStatistics{
			errorsByCode:     make(map[errors.ErrorCode]int64),
			errorsByCategory: make(map[string]int64),
			recentErrors:     make([]ErrorEvent, 0),
			windowStart:      time.Now(),
		},
	}

	// Initialize components
	if config.EnableAlerts {
		ehs.alertManager = alerts.NewAlertManager(nil, logger)
		ehs.setupAlertChannels()
	}

	if config.EnableRecovery {
		ehs.recoveryManager = recovery.NewRecoveryManager(db, nil, logger, nil)
	}

	if config.EnableConsistencyCheck {
		ehs.consistencyChecker = consistency.NewConsistencyChecker(db, logger, nil)
	}

	return ehs
}

// Start starts the error handling service
func (ehs *ErrorHandlingService) Start(ctx context.Context) error {
	ehs.mu.Lock()
	defer ehs.mu.Unlock()

	if ehs.running {
		return fmt.Errorf("error handling service is already running")
	}

	// Start components
	if ehs.alertManager != nil {
		if err := ehs.alertManager.Start(ctx); err != nil {
			return fmt.Errorf("failed to start alert manager: %w", err)
		}
	}

	if ehs.recoveryManager != nil {
		if err := ehs.recoveryManager.Start(ctx); err != nil {
			return fmt.Errorf("failed to start recovery manager: %w", err)
		}
	}

	if ehs.consistencyChecker != nil {
		if err := ehs.consistencyChecker.Start(ctx); err != nil {
			return fmt.Errorf("failed to start consistency checker: %w", err)
		}
	}

	ehs.running = true
	go ehs.runErrorMonitoring(ctx)

	ehs.logger.Info("Error handling service started")
	return nil
}

// Stop stops the error handling service
func (ehs *ErrorHandlingService) Stop() error {
	ehs.mu.Lock()
	defer ehs.mu.Unlock()

	if !ehs.running {
		return fmt.Errorf("error handling service is not running")
	}

	// Stop components
	if ehs.alertManager != nil {
		ehs.alertManager.Stop()
	}

	if ehs.recoveryManager != nil {
		ehs.recoveryManager.Stop()
	}

	if ehs.consistencyChecker != nil {
		ehs.consistencyChecker.Stop()
	}

	close(ehs.stopCh)
	ehs.running = false

	ehs.logger.Info("Error handling service stopped")
	return nil
}

// HandleError handles an error with comprehensive error processing
func (ehs *ErrorHandlingService) HandleError(ctx context.Context, err error, source string) *errors.APIError {
	var apiErr *errors.APIError
	var ok bool

	// Convert to APIError if needed
	if apiErr, ok = err.(*errors.APIError); !ok {
		apiErr = ehs.convertToAPIError(err)
	}

	// Record error statistics
	ehs.recordError(apiErr, source)

	// Send alert if necessary
	if ehs.alertManager != nil && ehs.shouldAlert(apiErr) {
		alert := ehs.alertManager.CreateErrorAlert(apiErr, source)
		go ehs.alertManager.SendAlert(ctx, alert)
	}

	// Check if circuit breaker should be triggered
	if ehs.shouldTriggerCircuitBreaker(apiErr) {
		ehs.triggerCircuitBreaker(source)
	}

	// Log the error
	ehs.logError(apiErr, source)

	return apiErr
}

// RecoverFromError attempts to recover from an error
func (ehs *ErrorHandlingService) RecoverFromError(ctx context.Context, err *errors.APIError, source string) error {
	if !ehs.config.EnableRecovery || ehs.recoveryManager == nil {
		return fmt.Errorf("recovery is disabled")
	}

	if !err.Retryable {
		return fmt.Errorf("error is not retryable")
	}

	ehs.logger.WithFields(logrus.Fields{
		"error_code": err.Code,
		"source":     source,
	}).Info("Attempting error recovery")

	// Implement specific recovery strategies based on error type
	switch err.Code {
	case errors.ErrDatabaseConnection:
		return ehs.recoverDatabaseConnection(ctx)
	case errors.ErrRedisConnection:
		return ehs.recoverRedisConnection(ctx)
	case errors.ErrDataInconsistency:
		return ehs.recoverDataInconsistency(ctx)
	default:
		return fmt.Errorf("no recovery strategy for error code %d", err.Code)
	}
}

// GetErrorStatistics returns current error statistics
func (ehs *ErrorHandlingService) GetErrorStatistics() *ErrorStatistics {
	ehs.errorStats.mu.RLock()
	defer ehs.errorStats.mu.RUnlock()

	// Create a copy to avoid race conditions
	stats := &ErrorStatistics{
		totalErrors:      ehs.errorStats.totalErrors,
		errorsByCode:     make(map[errors.ErrorCode]int64),
		errorsByCategory: make(map[string]int64),
		recentErrors:     make([]ErrorEvent, len(ehs.errorStats.recentErrors)),
		windowStart:      ehs.errorStats.windowStart,
	}

	for k, v := range ehs.errorStats.errorsByCode {
		stats.errorsByCode[k] = v
	}

	for k, v := range ehs.errorStats.errorsByCategory {
		stats.errorsByCategory[k] = v
	}

	copy(stats.recentErrors, ehs.errorStats.recentErrors)

	return stats
}

// RunConsistencyCheck runs data consistency checks
func (ehs *ErrorHandlingService) RunConsistencyCheck(ctx context.Context) ([]*consistency.ConsistencyResult, error) {
	if !ehs.config.EnableConsistencyCheck || ehs.consistencyChecker == nil {
		return nil, fmt.Errorf("consistency checking is disabled")
	}

	return ehs.consistencyChecker.RunAllChecks(ctx)
}

// convertToAPIError converts a generic error to APIError
func (ehs *ErrorHandlingService) convertToAPIError(err error) *errors.APIError {
	if err == nil {
		return errors.NewAPIError(errors.ErrInternalServer, "Unknown error")
	}

	// Try to map common error patterns
	errMsg := err.Error()
	
	switch {
	case errMsg == "record not found" || errMsg == gorm.ErrRecordNotFound.Error():
		return errors.NewAPIError(errors.ErrOrderNotFound, "记录不存在")
	case errMsg == "duplicated key not allowed":
		return errors.NewAPIError(errors.ErrDuplicateValue, "数据重复")
	default:
		return errors.NewAPIError(errors.ErrInternalServer, errMsg)
	}
}

// recordError records error statistics
func (ehs *ErrorHandlingService) recordError(apiErr *errors.APIError, source string) {
	ehs.errorStats.mu.Lock()
	defer ehs.errorStats.mu.Unlock()

	now := time.Now()
	
	// Clean old errors outside the window
	ehs.cleanOldErrors(now)

	// Record error
	ehs.errorStats.totalErrors++
	ehs.errorStats.errorsByCode[apiErr.Code]++
	
	category := ehs.getErrorCategory(apiErr.Code)
	ehs.errorStats.errorsByCategory[category]++

	// Add to recent errors
	event := ErrorEvent{
		Code:      apiErr.Code,
		Message:   apiErr.Message,
		Source:    source,
		Timestamp: now,
		Severity:  apiErr.Severity,
	}
	ehs.errorStats.recentErrors = append(ehs.errorStats.recentErrors, event)
}

// cleanOldErrors removes errors outside the statistics window
func (ehs *ErrorHandlingService) cleanOldErrors(now time.Time) {
	cutoff := now.Add(-ehs.config.ErrorStatsWindow)
	
	var validErrors []ErrorEvent
	for _, event := range ehs.errorStats.recentErrors {
		if event.Timestamp.After(cutoff) {
			validErrors = append(validErrors, event)
		}
	}
	
	ehs.errorStats.recentErrors = validErrors
	
	// Reset window if needed
	if now.Sub(ehs.errorStats.windowStart) > ehs.config.ErrorStatsWindow {
		ehs.errorStats.windowStart = now
	}
}

// getErrorCategory returns the category for an error code
func (ehs *ErrorHandlingService) getErrorCategory(code errors.ErrorCode) string {
	switch {
	case code >= 1000 && code < 2000:
		return "system"
	case code >= 2000 && code < 3000:
		return "auth"
	case code >= 3000 && code < 4000:
		return "merchant"
	case code >= 4000 && code < 5000:
		return "account"
	case code >= 5000 && code < 6000:
		return "order"
	case code >= 6000 && code < 7000:
		return "payment"
	case code >= 7000 && code < 8000:
		return "validation"
	case code >= 8000 && code < 9000:
		return "business"
	case code >= 9000 && code < 10000:
		return "external"
	default:
		return "unknown"
	}
}

// shouldAlert determines if an alert should be sent for an error
func (ehs *ErrorHandlingService) shouldAlert(apiErr *errors.APIError) bool {
	return apiErr.Severity == errors.SeverityCritical || 
		   apiErr.Severity == errors.SeverityHigh
}

// shouldTriggerCircuitBreaker determines if circuit breaker should be triggered
func (ehs *ErrorHandlingService) shouldTriggerCircuitBreaker(apiErr *errors.APIError) bool {
	// Trigger circuit breaker for critical system errors
	return apiErr.Severity == errors.SeverityCritical &&
		   (apiErr.Code == errors.ErrDatabaseConnection ||
			apiErr.Code == errors.ErrRedisConnection ||
			apiErr.Code == errors.ErrServiceUnavailable)
}

// triggerCircuitBreaker triggers the circuit breaker for a source
func (ehs *ErrorHandlingService) triggerCircuitBreaker(source string) {
	ehs.logger.WithField("source", source).Warn("Circuit breaker triggered")
	
	// Send circuit breaker alert
	if ehs.alertManager != nil {
		alert := &alerts.Alert{
			Level:     alerts.AlertLevelCritical,
			Title:     "Circuit Breaker Triggered",
			Message:   fmt.Sprintf("Circuit breaker triggered for source: %s", source),
			Source:    source,
			Category:  "circuit_breaker",
			Tags:      []string{"circuit_breaker", "critical"},
			Timestamp: time.Now(),
		}
		go ehs.alertManager.SendAlert(context.Background(), alert)
	}
}

// logError logs an error with appropriate level
func (ehs *ErrorHandlingService) logError(apiErr *errors.APIError, source string) {
	fields := logrus.Fields{
		"error_code": apiErr.Code,
		"severity":   apiErr.Severity,
		"source":     source,
		"request_id": apiErr.RequestID,
		"user_id":    apiErr.UserID,
		"retryable":  apiErr.Retryable,
	}

	if apiErr.Details != nil {
		fields["details"] = apiErr.Details
	}

	entry := ehs.logger.WithFields(fields)

	switch apiErr.Severity {
	case errors.SeverityCritical:
		entry.Error(apiErr.Message)
	case errors.SeverityHigh:
		entry.Warn(apiErr.Message)
	case errors.SeverityMedium:
		entry.Info(apiErr.Message)
	default:
		entry.Debug(apiErr.Message)
	}
}

// runErrorMonitoring runs error monitoring and analysis
func (ehs *ErrorHandlingService) runErrorMonitoring(ctx context.Context) {
	ticker := time.NewTicker(ehs.config.RecoveryCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ehs.stopCh:
			return
		case <-ticker.C:
			ehs.analyzeErrorPatterns(ctx)
		}
	}
}

// analyzeErrorPatterns analyzes error patterns and triggers actions
func (ehs *ErrorHandlingService) analyzeErrorPatterns(ctx context.Context) {
	stats := ehs.GetErrorStatistics()
	
	// Calculate error rate
	totalRequests := ehs.getTotalRequests() // This would come from metrics
	if totalRequests > 0 {
		errorRate := float64(stats.totalErrors) / float64(totalRequests)
		
		if errorRate > ehs.config.MaxErrorRate {
			ehs.handleHighErrorRate(ctx, errorRate)
		}
	}

	// Check for error spikes
	ehs.checkErrorSpikes(ctx, stats)
}

// getTotalRequests gets total request count (placeholder)
func (ehs *ErrorHandlingService) getTotalRequests() int64 {
	// This would integrate with your metrics system
	return 1000 // Placeholder
}

// handleHighErrorRate handles high error rate situations
func (ehs *ErrorHandlingService) handleHighErrorRate(ctx context.Context, errorRate float64) {
	ehs.logger.WithField("error_rate", errorRate).Warn("High error rate detected")

	if ehs.alertManager != nil {
		alert := &alerts.Alert{
			Level:     alerts.AlertLevelHigh,
			Title:     "High Error Rate Detected",
			Message:   fmt.Sprintf("Error rate is %.2f%%, exceeding threshold of %.2f%%", errorRate*100, ehs.config.MaxErrorRate*100),
			Source:    "error_monitoring",
			Category:  "error_rate",
			Tags:      []string{"error_rate", "high"},
			Details: map[string]interface{}{
				"error_rate": errorRate,
				"threshold":  ehs.config.MaxErrorRate,
			},
			Timestamp: time.Now(),
		}
		go ehs.alertManager.SendAlert(ctx, alert)
	}
}

// checkErrorSpikes checks for error spikes
func (ehs *ErrorHandlingService) checkErrorSpikes(ctx context.Context, stats *ErrorStatistics) {
	// Analyze recent errors for spikes
	now := time.Now()
	recentWindow := 5 * time.Minute
	
	recentCount := 0
	for _, event := range stats.recentErrors {
		if now.Sub(event.Timestamp) <= recentWindow {
			recentCount++
		}
	}

	if recentCount > 50 { // Threshold for spike detection
		ehs.logger.WithField("recent_errors", recentCount).Warn("Error spike detected")
		
		if ehs.alertManager != nil {
			alert := &alerts.Alert{
				Level:     alerts.AlertLevelHigh,
				Title:     "Error Spike Detected",
				Message:   fmt.Sprintf("Detected %d errors in the last %v", recentCount, recentWindow),
				Source:    "error_monitoring",
				Category:  "error_spike",
				Tags:      []string{"error_spike", "high"},
				Details: map[string]interface{}{
					"recent_errors": recentCount,
					"window":        recentWindow.String(),
				},
				Timestamp: time.Now(),
			}
			go ehs.alertManager.SendAlert(ctx, alert)
		}
	}
}

// Recovery methods
func (ehs *ErrorHandlingService) recoverDatabaseConnection(ctx context.Context) error {
	ehs.logger.Info("Attempting database connection recovery")
	
	// Get underlying SQL DB
	sqlDB, err := ehs.db.DB()
	if err != nil {
		return err
	}
	
	// Test connection
	if err := sqlDB.PingContext(ctx); err != nil {
		// Close and reopen connections
		sqlDB.Close()
		return sqlDB.PingContext(ctx)
	}
	
	return nil
}

func (ehs *ErrorHandlingService) recoverRedisConnection(ctx context.Context) error {
	ehs.logger.Info("Attempting Redis connection recovery")
	// Redis recovery logic would go here
	return nil
}

func (ehs *ErrorHandlingService) recoverDataInconsistency(ctx context.Context) error {
	ehs.logger.Info("Attempting data consistency recovery")
	
	if ehs.consistencyChecker != nil {
		results, err := ehs.consistencyChecker.RunAllChecks(ctx)
		if err != nil {
			return err
		}
		
		// Log consistency check results
		for _, result := range results {
			if result.Status != "pass" {
				ehs.logger.WithFields(logrus.Fields{
					"check_name":   result.CheckName,
					"status":       result.Status,
					"issues_count": len(result.Issues),
				}).Warn("Consistency check found issues")
			}
		}
	}
	
	return nil
}

// setupAlertChannels sets up default alert channels
func (ehs *ErrorHandlingService) setupAlertChannels() {
	// Email channel
	emailChannel := alerts.NewEmailChannel(
		"email",
		"smtp.example.com",
		587,
		"alerts@example.com",
		"password",
		"alerts@example.com",
		[]string{"admin@example.com"},
	)
	ehs.alertManager.RegisterChannel(emailChannel)

	// Webhook channel
	webhookChannel := alerts.NewWebhookChannel(
		"webhook",
		"https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
		map[string]string{
			"Authorization": "Bearer your-token",
		},
	)
	ehs.alertManager.RegisterChannel(webhookChannel)
}
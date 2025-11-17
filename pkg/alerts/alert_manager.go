package alerts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sirupsen/logrus"

	"github.com/company/cjpayment/pkg/errors"
)

// AlertManager manages system alerts and notifications
type AlertManager struct {
	config    *AlertConfig
	logger    *logrus.Logger
	channels  map[string]AlertChannel
	rules     []AlertRule
	mu        sync.RWMutex
	running   bool
	stopCh    chan struct{}
	alertCh   chan *Alert
}

// AlertConfig holds alert manager configuration
type AlertConfig struct {
	EnableAlerts     bool          `yaml:"enable_alerts"`
	BufferSize       int           `yaml:"buffer_size"`
	BatchSize        int           `yaml:"batch_size"`
	FlushInterval    time.Duration `yaml:"flush_interval"`
	RetryAttempts    int           `yaml:"retry_attempts"`
	RetryBackoff     time.Duration `yaml:"retry_backoff"`
	RateLimitWindow  time.Duration `yaml:"rate_limit_window"`
	RateLimitCount   int           `yaml:"rate_limit_count"`
}

// Alert represents a system alert
type Alert struct {
	ID          string                 `json:"id"`
	Level       AlertLevel             `json:"level"`
	Title       string                 `json:"title"`
	Message     string                 `json:"message"`
	Source      string                 `json:"source"`
	Category    string                 `json:"category"`
	Tags        []string               `json:"tags"`
	Details     map[string]interface{} `json:"details"`
	Timestamp   time.Time              `json:"timestamp"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
	Fingerprint string                 `json:"fingerprint"`
}

// AlertLevel represents the severity level of an alert
type AlertLevel string

const (
	AlertLevelCritical AlertLevel = "critical"
	AlertLevelHigh     AlertLevel = "high"
	AlertLevelMedium   AlertLevel = "medium"
	AlertLevelLow      AlertLevel = "low"
	AlertLevelInfo     AlertLevel = "info"
)

// AlertChannel interface for different notification channels
type AlertChannel interface {
	Send(ctx context.Context, alert *Alert) error
	Name() string
	IsEnabled() bool
}

// AlertRule defines when and how alerts should be sent
type AlertRule struct {
	Name        string            `yaml:"name"`
	Conditions  []AlertCondition  `yaml:"conditions"`
	Channels    []string          `yaml:"channels"`
	Throttle    time.Duration     `yaml:"throttle"`
	Enabled     bool              `yaml:"enabled"`
	lastTrigger map[string]time.Time
	mu          sync.RWMutex
}

// AlertCondition defines conditions for triggering alerts
type AlertCondition struct {
	Field    string      `yaml:"field"`
	Operator string      `yaml:"operator"` // eq, ne, gt, lt, gte, lte, contains, matches
	Value    interface{} `yaml:"value"`
}

// NewAlertManager creates a new alert manager
func NewAlertManager(config *AlertConfig, logger *logrus.Logger) *AlertManager {
	if config == nil {
		config = &AlertConfig{
			EnableAlerts:    true,
			BufferSize:      1000,
			BatchSize:       10,
			FlushInterval:   5 * time.Second,
			RetryAttempts:   3,
			RetryBackoff:    time.Second,
			RateLimitWindow: time.Minute,
			RateLimitCount:  10,
		}
	}

	am := &AlertManager{
		config:   config,
		logger:   logger,
		channels: make(map[string]AlertChannel),
		rules:    make([]AlertRule, 0),
		stopCh:   make(chan struct{}),
		alertCh:  make(chan *Alert, config.BufferSize),
	}

	// Initialize default alert rules
	am.initializeDefaultRules()

	return am
}

// Start starts the alert manager
func (am *AlertManager) Start(ctx context.Context) error {
	am.mu.Lock()
	defer am.mu.Unlock()

	if am.running {
		return fmt.Errorf("alert manager is already running")
	}

	am.running = true
	go am.processAlerts(ctx)

	am.logger.Info("Alert manager started")
	return nil
}

// Stop stops the alert manager
func (am *AlertManager) Stop() error {
	am.mu.Lock()
	defer am.mu.Unlock()

	if !am.running {
		return fmt.Errorf("alert manager is not running")
	}

	close(am.stopCh)
	am.running = false

	am.logger.Info("Alert manager stopped")
	return nil
}

// RegisterChannel registers a new alert channel
func (am *AlertManager) RegisterChannel(channel AlertChannel) {
	am.mu.Lock()
	defer am.mu.Unlock()

	am.channels[channel.Name()] = channel
	am.logger.WithField("channel", channel.Name()).Info("Alert channel registered")
}

// AddRule adds a new alert rule
func (am *AlertManager) AddRule(rule AlertRule) {
	am.mu.Lock()
	defer am.mu.Unlock()

	rule.lastTrigger = make(map[string]time.Time)
	am.rules = append(am.rules, rule)
	am.logger.WithField("rule", rule.Name).Info("Alert rule added")
}

// SendAlert sends an alert
func (am *AlertManager) SendAlert(ctx context.Context, alert *Alert) error {
	if !am.config.EnableAlerts {
		return nil
	}

	// Generate fingerprint for deduplication
	alert.Fingerprint = am.generateFingerprint(alert)
	alert.ID = fmt.Sprintf("alert_%d", time.Now().UnixNano())

	select {
	case am.alertCh <- alert:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		return fmt.Errorf("alert buffer is full")
	}
}

// processAlerts processes alerts from the channel
func (am *AlertManager) processAlerts(ctx context.Context) {
	ticker := time.NewTicker(am.config.FlushInterval)
	defer ticker.Stop()

	var alertBatch []*Alert

	for {
		select {
		case <-ctx.Done():
			return
		case <-am.stopCh:
			return
		case alert := <-am.alertCh:
			alertBatch = append(alertBatch, alert)
			if len(alertBatch) >= am.config.BatchSize {
				am.processBatch(ctx, alertBatch)
				alertBatch = alertBatch[:0]
			}
		case <-ticker.C:
			if len(alertBatch) > 0 {
				am.processBatch(ctx, alertBatch)
				alertBatch = alertBatch[:0]
			}
		}
	}
}

// processBatch processes a batch of alerts
func (am *AlertManager) processBatch(ctx context.Context, alerts []*Alert) {
	for _, alert := range alerts {
		am.processAlert(ctx, alert)
	}
}

// processAlert processes a single alert
func (am *AlertManager) processAlert(ctx context.Context, alert *Alert) {
	am.mu.RLock()
	rules := make([]AlertRule, len(am.rules))
	copy(rules, am.rules)
	am.mu.RUnlock()

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		if am.matchesRule(alert, rule) {
			if am.shouldThrottle(alert, rule) {
				continue
			}

			am.sendToChannels(ctx, alert, rule.Channels)
			am.updateLastTrigger(alert, rule)
		}
	}
}

// matchesRule checks if an alert matches a rule's conditions
func (am *AlertManager) matchesRule(alert *Alert, rule AlertRule) bool {
	for _, condition := range rule.Conditions {
		if !am.evaluateCondition(alert, condition) {
			return false
		}
	}
	return true
}

// evaluateCondition evaluates a single condition
func (am *AlertManager) evaluateCondition(alert *Alert, condition AlertCondition) bool {
	var fieldValue interface{}

	switch condition.Field {
	case "level":
		fieldValue = string(alert.Level)
	case "source":
		fieldValue = alert.Source
	case "category":
		fieldValue = alert.Category
	case "title":
		fieldValue = alert.Title
	case "message":
		fieldValue = alert.Message
	default:
		if val, exists := alert.Details[condition.Field]; exists {
			fieldValue = val
		} else {
			return false
		}
	}

	return am.compareValues(fieldValue, condition.Operator, condition.Value)
}

// compareValues compares two values based on the operator
func (am *AlertManager) compareValues(fieldValue interface{}, operator string, conditionValue interface{}) bool {
	switch operator {
	case "eq":
		return fieldValue == conditionValue
	case "ne":
		return fieldValue != conditionValue
	case "contains":
		if str, ok := fieldValue.(string); ok {
			if substr, ok := conditionValue.(string); ok {
				return bytes.Contains([]byte(str), []byte(substr))
			}
		}
	case "gt", "lt", "gte", "lte":
		return am.compareNumbers(fieldValue, operator, conditionValue)
	}
	return false
}

// compareNumbers compares numeric values
func (am *AlertManager) compareNumbers(fieldValue interface{}, operator string, conditionValue interface{}) bool {
	var fv, cv float64
	var ok bool

	if fv, ok = fieldValue.(float64); !ok {
		if iv, ok := fieldValue.(int); ok {
			fv = float64(iv)
		} else {
			return false
		}
	}

	if cv, ok = conditionValue.(float64); !ok {
		if iv, ok := conditionValue.(int); ok {
			cv = float64(iv)
		} else {
			return false
		}
	}

	switch operator {
	case "gt":
		return fv > cv
	case "lt":
		return fv < cv
	case "gte":
		return fv >= cv
	case "lte":
		return fv <= cv
	}
	return false
}

// shouldThrottle checks if an alert should be throttled
func (am *AlertManager) shouldThrottle(alert *Alert, rule AlertRule) bool {
	if rule.Throttle == 0 {
		return false
	}

	rule.mu.RLock()
	lastTrigger, exists := rule.lastTrigger[alert.Fingerprint]
	rule.mu.RUnlock()

	if !exists {
		return false
	}

	return time.Since(lastTrigger) < rule.Throttle
}

// updateLastTrigger updates the last trigger time for a rule
func (am *AlertManager) updateLastTrigger(alert *Alert, rule AlertRule) {
	rule.mu.Lock()
	rule.lastTrigger[alert.Fingerprint] = time.Now()
	rule.mu.Unlock()
}

// sendToChannels sends an alert to specified channels
func (am *AlertManager) sendToChannels(ctx context.Context, alert *Alert, channelNames []string) {
	am.mu.RLock()
	defer am.mu.RUnlock()

	for _, channelName := range channelNames {
		if channel, exists := am.channels[channelName]; exists && channel.IsEnabled() {
			go am.sendToChannel(ctx, alert, channel)
		}
	}
}

// sendToChannel sends an alert to a specific channel with retry logic
func (am *AlertManager) sendToChannel(ctx context.Context, alert *Alert, channel AlertChannel) {
	for attempt := 1; attempt <= am.config.RetryAttempts; attempt++ {
		err := channel.Send(ctx, alert)
		if err == nil {
			am.logger.WithFields(logrus.Fields{
				"alert_id": alert.ID,
				"channel":  channel.Name(),
			}).Debug("Alert sent successfully")
			return
		}

		am.logger.WithFields(logrus.Fields{
			"alert_id": alert.ID,
			"channel":  channel.Name(),
			"attempt":  attempt,
			"error":    err,
		}).Warn("Failed to send alert")

		if attempt < am.config.RetryAttempts {
			time.Sleep(am.config.RetryBackoff * time.Duration(attempt))
		}
	}

	am.logger.WithFields(logrus.Fields{
		"alert_id": alert.ID,
		"channel":  channel.Name(),
	}).Error("Failed to send alert after all retry attempts")
}

// generateFingerprint generates a fingerprint for alert deduplication
func (am *AlertManager) generateFingerprint(alert *Alert) string {
	data := fmt.Sprintf("%s:%s:%s:%s", alert.Level, alert.Source, alert.Category, alert.Title)
	return fmt.Sprintf("%x", data)
}

// initializeDefaultRules initializes default alert rules
func (am *AlertManager) initializeDefaultRules() {
	// Critical system errors
	am.AddRule(AlertRule{
		Name: "critical_system_errors",
		Conditions: []AlertCondition{
			{Field: "level", Operator: "eq", Value: "critical"},
			{Field: "category", Operator: "eq", Value: "system"},
		},
		Channels: []string{"email", "slack", "webhook"},
		Throttle: 5 * time.Minute,
		Enabled:  true,
	})

	// Database connection issues
	am.AddRule(AlertRule{
		Name: "database_connection_issues",
		Conditions: []AlertCondition{
			{Field: "source", Operator: "eq", Value: "database"},
			{Field: "level", Operator: "eq", Value: "critical"},
		},
		Channels: []string{"email", "slack"},
		Throttle: 2 * time.Minute,
		Enabled:  true,
	})

	// High error rate
	am.AddRule(AlertRule{
		Name: "high_error_rate",
		Conditions: []AlertCondition{
			{Field: "category", Operator: "eq", Value: "error_rate"},
			{Field: "level", Operator: "eq", Value: "high"},
		},
		Channels: []string{"slack", "webhook"},
		Throttle: 10 * time.Minute,
		Enabled:  true,
	})

	// Payment failures
	am.AddRule(AlertRule{
		Name: "payment_failures",
		Conditions: []AlertCondition{
			{Field: "category", Operator: "eq", Value: "payment"},
			{Field: "level", Operator: "eq", Value: "high"},
		},
		Channels: []string{"email", "slack"},
		Throttle: 5 * time.Minute,
		Enabled:  true,
	})
}

// CreateErrorAlert creates an alert from an API error
func (am *AlertManager) CreateErrorAlert(apiErr *errors.APIError, source string) *Alert {
	level := AlertLevelMedium
	category := "error"

	switch apiErr.Severity {
	case errors.SeverityCritical:
		level = AlertLevelCritical
		category = "system"
	case errors.SeverityHigh:
		level = AlertLevelHigh
	case errors.SeverityMedium:
		level = AlertLevelMedium
	case errors.SeverityLow:
		level = AlertLevelLow
	case errors.SeverityInfo:
		level = AlertLevelInfo
	}

	return &Alert{
		Level:     level,
		Title:     fmt.Sprintf("Error %d: %s", apiErr.Code, apiErr.Message),
		Message:   apiErr.Message,
		Source:    source,
		Category:  category,
		Tags:      []string{"error", string(apiErr.Severity)},
		Details: map[string]interface{}{
			"error_code":  apiErr.Code,
			"severity":    apiErr.Severity,
			"request_id":  apiErr.RequestID,
			"user_id":     apiErr.UserID,
			"retryable":   apiErr.Retryable,
			"details":     apiErr.Details,
		},
		Timestamp: apiErr.Timestamp,
	}
}

// EmailChannel implements AlertChannel for email notifications
type EmailChannel struct {
	name     string
	enabled  bool
	smtpHost string
	smtpPort int
	username string
	password string
	from     string
	to       []string
}

// NewEmailChannel creates a new email alert channel
func NewEmailChannel(name, smtpHost string, smtpPort int, username, password, from string, to []string) *EmailChannel {
	return &EmailChannel{
		name:     name,
		enabled:  true,
		smtpHost: smtpHost,
		smtpPort: smtpPort,
		username: username,
		password: password,
		from:     from,
		to:       to,
	}
}

func (ec *EmailChannel) Name() string     { return ec.name }
func (ec *EmailChannel) IsEnabled() bool { return ec.enabled }

func (ec *EmailChannel) Send(ctx context.Context, alert *Alert) error {
	// Email sending implementation would go here
	// For now, just log the alert
	fmt.Printf("EMAIL ALERT: [%s] %s - %s\n", alert.Level, alert.Title, alert.Message)
	return nil
}

// WebhookChannel implements AlertChannel for webhook notifications
type WebhookChannel struct {
	name    string
	enabled bool
	url     string
	headers map[string]string
	client  *http.Client
}

// NewWebhookChannel creates a new webhook alert channel
func NewWebhookChannel(name, url string, headers map[string]string) *WebhookChannel {
	return &WebhookChannel{
		name:    name,
		enabled: true,
		url:     url,
		headers: headers,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (wc *WebhookChannel) Name() string     { return wc.name }
func (wc *WebhookChannel) IsEnabled() bool { return wc.enabled }

func (wc *WebhookChannel) Send(ctx context.Context, alert *Alert) error {
	payload, err := json.Marshal(alert)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", wc.url, bytes.NewBuffer(payload))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	for key, value := range wc.headers {
		req.Header.Set(key, value)
	}

	resp, err := wc.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}

	return nil
}
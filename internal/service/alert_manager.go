package service

import (
	"context"
	"fmt"
	"time"

	"github.com/company/cjpayment/pkg/logger"
	"github.com/company/cjpayment/pkg/monitoring"
)

// AlertLevel 告警级别
type AlertLevel string

const (
	AlertLevelInfo     AlertLevel = "info"
	AlertLevelWarning  AlertLevel = "warning"
	AlertLevelCritical AlertLevel = "critical"
)

// Alert 告警信息
type Alert struct {
	ID          string                 `json:"id"`
	Level       AlertLevel             `json:"level"`
	Title       string                 `json:"title"`
	Message     string                 `json:"message"`
	Component   string                 `json:"component"`
	Timestamp   time.Time              `json:"timestamp"`
	Labels      map[string]string      `json:"labels"`
	Annotations map[string]interface{} `json:"annotations"`
}

// AlertManager 告警管理器
type AlertManager struct {
	logger            *logger.StructuredLogger
	notificationSvc   NotificationService
	alertRules        []AlertRule
	alertHistory      []Alert
	maxHistorySize    int
}

// AlertRule 告警规则
type AlertRule struct {
	Name        string
	Condition   func(ctx context.Context) (bool, *Alert)
	Interval    time.Duration
	Enabled     bool
	LastCheck   time.Time
	LastTriggered time.Time
	CooldownPeriod time.Duration
}

// NewAlertManager 创建告警管理器
func NewAlertManager(logger *logger.StructuredLogger, notificationSvc NotificationService) *AlertManager {
	am := &AlertManager{
		logger:          logger,
		notificationSvc: notificationSvc,
		alertRules:      make([]AlertRule, 0),
		alertHistory:    make([]Alert, 0),
		maxHistorySize:  1000,
	}

	// 初始化默认告警规则
	am.initDefaultAlertRules()

	return am
}

// initDefaultAlertRules 初始化默认告警规则
func (am *AlertManager) initDefaultAlertRules() {
	// 高错误率告警
	am.AddAlertRule(AlertRule{
		Name:           "high_error_rate",
		Condition:      am.checkHighErrorRate,
		Interval:       time.Minute * 5,
		Enabled:        true,
		CooldownPeriod: time.Minute * 15,
	})

	// 账号限额告警
	am.AddAlertRule(AlertRule{
		Name:           "account_limit_warning",
		Condition:      am.checkAccountLimitWarning,
		Interval:       time.Minute * 10,
		Enabled:        true,
		CooldownPeriod: time.Hour * 1,
	})

	// 数据库连接告警
	am.AddAlertRule(AlertRule{
		Name:           "database_connection_warning",
		Condition:      am.checkDatabaseConnectionWarning,
		Interval:       time.Minute * 2,
		Enabled:        true,
		CooldownPeriod: time.Minute * 10,
	})

	// 响应时间告警
	am.AddAlertRule(AlertRule{
		Name:           "high_response_time",
		Condition:      am.checkHighResponseTime,
		Interval:       time.Minute * 5,
		Enabled:        true,
		CooldownPeriod: time.Minute * 15,
	})

	// 订单处理异常告警
	am.AddAlertRule(AlertRule{
		Name:           "order_processing_anomaly",
		Condition:      am.checkOrderProcessingAnomaly,
		Interval:       time.Minute * 15,
		Enabled:        true,
		CooldownPeriod: time.Hour * 1,
	})
}

// AddAlertRule 添加告警规则
func (am *AlertManager) AddAlertRule(rule AlertRule) {
	am.alertRules = append(am.alertRules, rule)
	am.logger.WithFields(logger.LogFields{
		"component":  "alert_manager",
		"rule_name":  rule.Name,
		"interval":   rule.Interval.String(),
		"enabled":    rule.Enabled,
	}).Info("Alert rule added")
}

// StartAlertMonitoring 启动告警监控
func (am *AlertManager) StartAlertMonitoring(ctx context.Context) {
	am.logger.WithFields(logger.LogFields{
		"component":   "alert_manager",
		"rules_count": len(am.alertRules),
	}).Info("Starting alert monitoring")

	// 为每个告警规则启动独立的goroutine
	for i := range am.alertRules {
		rule := &am.alertRules[i]
		if rule.Enabled {
			go am.monitorRule(ctx, rule)
		}
	}
}

// monitorRule 监控单个告警规则
func (am *AlertManager) monitorRule(ctx context.Context, rule *AlertRule) {
	ticker := time.NewTicker(rule.Interval)
	defer ticker.Stop()

	am.logger.WithFields(logger.LogFields{
		"component": "alert_manager",
		"rule_name": rule.Name,
		"interval":  rule.Interval.String(),
	}).Info("Starting rule monitoring")

	for {
		select {
		case <-ctx.Done():
			am.logger.WithFields(logger.LogFields{
				"component": "alert_manager",
				"rule_name": rule.Name,
			}).Info("Rule monitoring stopped")
			return
		case <-ticker.C:
			am.checkRule(ctx, rule)
		}
	}
}

// checkRule 检查告警规则
func (am *AlertManager) checkRule(ctx context.Context, rule *AlertRule) {
	rule.LastCheck = time.Now()

	// 检查冷却期
	if time.Since(rule.LastTriggered) < rule.CooldownPeriod {
		return
	}

	// 执行告警条件检查
	triggered, alert := rule.Condition(ctx)
	if triggered && alert != nil {
		rule.LastTriggered = time.Now()
		am.handleAlert(ctx, *alert)
	}
}

// handleAlert 处理告警
func (am *AlertManager) handleAlert(ctx context.Context, alert Alert) {
	// 添加到告警历史
	am.addToHistory(alert)

	// 记录告警日志
	am.logger.WithFields(logger.LogFields{
		"component":   "alert_manager",
		"alert_id":    alert.ID,
		"alert_level": string(alert.Level),
		"title":       alert.Title,
		"message":     alert.Message,
		"labels":      alert.Labels,
	}).Warn("Alert triggered")

	// 记录告警指标
	monitoring.RecordError("alert_manager", "alert_triggered", string(alert.Level))

	// 发送通知
	am.sendAlertNotification(ctx, alert)
}

// sendAlertNotification 发送告警通知
func (am *AlertManager) sendAlertNotification(ctx context.Context, alert Alert) {
	// 根据告警级别选择通知渠道
	channels := am.getNotificationChannels(alert.Level)

	for _, channel := range channels {
		notification := &Notification{
			Type:      "alert",
			Title:     alert.Title,
			Content:   alert.Message,
			Recipient: am.getAlertRecipient(channel),
			Channel:   channel,
			Priority:  am.getNotificationPriority(alert.Level),
			Metadata: map[string]interface{}{
				"alert_id":    alert.ID,
				"alert_level": string(alert.Level),
				"component":   alert.Component,
				"labels":      alert.Labels,
			},
		}

		if err := am.notificationSvc.SendNotification(ctx, notification); err != nil {
			am.logger.LogError(ctx, "alert_manager", "send_notification", err, logger.LogFields{
				"alert_id": alert.ID,
				"channel":  channel,
			})
		}
	}
}

// getNotificationChannels 获取通知渠道
func (am *AlertManager) getNotificationChannels(level AlertLevel) []string {
	switch level {
	case AlertLevelCritical:
		return []string{"email", "sms", "webhook"}
	case AlertLevelWarning:
		return []string{"email", "webhook"}
	case AlertLevelInfo:
		return []string{"webhook"}
	default:
		return []string{"webhook"}
	}
}

// getAlertRecipient 获取告警接收者
func (am *AlertManager) getAlertRecipient(channel string) string {
	// 这里应该从配置中获取
	switch channel {
	case "email":
		return "admin@example.com"
	case "sms":
		return "+1234567890"
	case "webhook":
		return "https://hooks.example.com/alerts"
	default:
		return ""
	}
}

// getNotificationPriority 获取通知优先级
func (am *AlertManager) getNotificationPriority(level AlertLevel) string {
	switch level {
	case AlertLevelCritical:
		return "high"
	case AlertLevelWarning:
		return "medium"
	case AlertLevelInfo:
		return "low"
	default:
		return "low"
	}
}

// addToHistory 添加到告警历史
func (am *AlertManager) addToHistory(alert Alert) {
	am.alertHistory = append(am.alertHistory, alert)

	// 保持历史记录大小限制
	if len(am.alertHistory) > am.maxHistorySize {
		am.alertHistory = am.alertHistory[1:]
	}
}

// 告警规则检查函数

// checkHighErrorRate 检查高错误率
func (am *AlertManager) checkHighErrorRate(ctx context.Context) (bool, *Alert) {
	// 这里应该从Prometheus或其他监控系统获取实际的错误率数据
	// 为了演示，我们使用模拟数据
	errorRate := 0.05 // 5%的错误率

	if errorRate > 0.03 { // 超过3%触发告警
		alert := &Alert{
			ID:        fmt.Sprintf("high_error_rate_%d", time.Now().Unix()),
			Level:     AlertLevelWarning,
			Title:     "High Error Rate Detected",
			Message:   fmt.Sprintf("Error rate is %.2f%%, exceeding threshold of 3%%", errorRate*100),
			Component: "api_handler",
			Timestamp: time.Now(),
			Labels: map[string]string{
				"type":       "error_rate",
				"threshold":  "3%",
				"current":    fmt.Sprintf("%.2f%%", errorRate*100),
			},
			Annotations: map[string]interface{}{
				"error_rate": errorRate,
				"threshold":  0.03,
			},
		}

		if errorRate > 0.10 { // 超过10%为严重告警
			alert.Level = AlertLevelCritical
			alert.Title = "Critical Error Rate Detected"
		}

		return true, alert
	}

	return false, nil
}

// checkAccountLimitWarning 检查账号限额告警
func (am *AlertManager) checkAccountLimitWarning(ctx context.Context) (bool, *Alert) {
	// 这里应该检查实际的账号限额使用情况
	// 为了演示，我们使用模拟数据
	utilizationRatio := 0.85 // 85%的使用率

	if utilizationRatio > 0.80 { // 超过80%触发告警
		alert := &Alert{
			ID:        fmt.Sprintf("account_limit_warning_%d", time.Now().Unix()),
			Level:     AlertLevelWarning,
			Title:     "Account Limit Warning",
			Message:   fmt.Sprintf("Account limit utilization is %.1f%%, approaching daily limit", utilizationRatio*100),
			Component: "account_manager",
			Timestamp: time.Now(),
			Labels: map[string]string{
				"type":        "account_limit",
				"threshold":   "80%",
				"utilization": fmt.Sprintf("%.1f%%", utilizationRatio*100),
			},
			Annotations: map[string]interface{}{
				"utilization_ratio": utilizationRatio,
				"threshold":         0.80,
			},
		}

		if utilizationRatio > 0.95 { // 超过95%为严重告警
			alert.Level = AlertLevelCritical
			alert.Title = "Critical Account Limit Warning"
		}

		return true, alert
	}

	return false, nil
}

// checkDatabaseConnectionWarning 检查数据库连接告警
func (am *AlertManager) checkDatabaseConnectionWarning(ctx context.Context) (bool, *Alert) {
	// 这里应该检查实际的数据库连接状态
	// 为了演示，我们使用模拟数据
	activeConnections := 45
	maxConnections := 50

	utilizationRatio := float64(activeConnections) / float64(maxConnections)

	if utilizationRatio > 0.80 { // 超过80%触发告警
		alert := &Alert{
			ID:        fmt.Sprintf("db_connection_warning_%d", time.Now().Unix()),
			Level:     AlertLevelWarning,
			Title:     "Database Connection Warning",
			Message:   fmt.Sprintf("Database connections: %d/%d (%.1f%%), approaching limit", activeConnections, maxConnections, utilizationRatio*100),
			Component: "database",
			Timestamp: time.Now(),
			Labels: map[string]string{
				"type":               "db_connections",
				"active_connections": fmt.Sprintf("%d", activeConnections),
				"max_connections":    fmt.Sprintf("%d", maxConnections),
			},
			Annotations: map[string]interface{}{
				"active_connections": activeConnections,
				"max_connections":    maxConnections,
				"utilization_ratio":  utilizationRatio,
			},
		}

		if utilizationRatio > 0.95 { // 超过95%为严重告警
			alert.Level = AlertLevelCritical
			alert.Title = "Critical Database Connection Warning"
		}

		return true, alert
	}

	return false, nil
}

// checkHighResponseTime 检查高响应时间
func (am *AlertManager) checkHighResponseTime(ctx context.Context) (bool, *Alert) {
	// 这里应该从监控系统获取实际的响应时间数据
	// 为了演示，我们使用模拟数据
	avgResponseTime := 2.5 // 2.5秒

	if avgResponseTime > 2.0 { // 超过2秒触发告警
		alert := &Alert{
			ID:        fmt.Sprintf("high_response_time_%d", time.Now().Unix()),
			Level:     AlertLevelWarning,
			Title:     "High Response Time Detected",
			Message:   fmt.Sprintf("Average response time is %.2fs, exceeding threshold of 2.0s", avgResponseTime),
			Component: "api_handler",
			Timestamp: time.Now(),
			Labels: map[string]string{
				"type":          "response_time",
				"threshold":     "2.0s",
				"response_time": fmt.Sprintf("%.2fs", avgResponseTime),
			},
			Annotations: map[string]interface{}{
				"avg_response_time": avgResponseTime,
				"threshold":         2.0,
			},
		}

		if avgResponseTime > 5.0 { // 超过5秒为严重告警
			alert.Level = AlertLevelCritical
			alert.Title = "Critical Response Time Detected"
		}

		return true, alert
	}

	return false, nil
}

// checkOrderProcessingAnomaly 检查订单处理异常
func (am *AlertManager) checkOrderProcessingAnomaly(ctx context.Context) (bool, *Alert) {
	// 这里应该检查实际的订单处理情况
	// 为了演示，我们使用模拟数据
	pendingOrders := 150
	processingTime := 30 // 分钟

	if pendingOrders > 100 || processingTime > 20 { // 待处理订单超过100或处理时间超过20分钟
		alert := &Alert{
			ID:        fmt.Sprintf("order_processing_anomaly_%d", time.Now().Unix()),
			Level:     AlertLevelWarning,
			Title:     "Order Processing Anomaly",
			Message:   fmt.Sprintf("Pending orders: %d, Average processing time: %d minutes", pendingOrders, processingTime),
			Component: "order_processor",
			Timestamp: time.Now(),
			Labels: map[string]string{
				"type":            "order_processing",
				"pending_orders":  fmt.Sprintf("%d", pendingOrders),
				"processing_time": fmt.Sprintf("%d min", processingTime),
			},
			Annotations: map[string]interface{}{
				"pending_orders":     pendingOrders,
				"processing_time":    processingTime,
				"pending_threshold":  100,
				"time_threshold":     20,
			},
		}

		if pendingOrders > 200 || processingTime > 60 { // 更严重的情况
			alert.Level = AlertLevelCritical
			alert.Title = "Critical Order Processing Anomaly"
		}

		return true, alert
	}

	return false, nil
}

// GetAlertHistory 获取告警历史
func (am *AlertManager) GetAlertHistory(limit int) []Alert {
	if limit <= 0 || limit > len(am.alertHistory) {
		return am.alertHistory
	}

	start := len(am.alertHistory) - limit
	return am.alertHistory[start:]
}
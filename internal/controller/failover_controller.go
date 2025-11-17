package controller

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/company/cjpayment/internal/domain"
	"github.com/company/cjpayment/internal/gateway"
)

// FailoverEvent 故障转移事件类型
type FailoverEvent string

const (
	DomainSwitch    FailoverEvent = "domain_switch"
	GatewaySwitch   FailoverEvent = "gateway_switch"
	DomainRecovery  FailoverEvent = "domain_recovery"
	GatewayRecovery FailoverEvent = "gateway_recovery"
)

// FailoverEventLevel 事件级别
type FailoverEventLevel string

const (
	InfoLevel     FailoverEventLevel = "info"
	WarningLevel  FailoverEventLevel = "warning"
	ErrorLevel    FailoverEventLevel = "error"
	CriticalLevel FailoverEventLevel = "critical"
)

// FailoverConfig 故障转移配置
type FailoverConfig struct {
	AutoFailoverEnabled    bool `json:"auto_failover_enabled"`
	DomainCheckEnabled     bool `json:"domain_health_check_enabled"`
	GatewayCheckEnabled    bool `json:"gateway_health_check_enabled"`
	HealthCheckInterval    int  `json:"health_check_interval"`
	FailureThreshold       int  `json:"failure_threshold"`
	MaxConcurrentChecks    int  `json:"max_concurrent_checks"`
	NotificationEnabled    bool `json:"notification_enabled"`
	WebhookURL             string `json:"webhook_url"`
	LogRetentionDays       int  `json:"log_retention_days"`
}

// FailoverLogEntry 故障转移日志条目
type FailoverLogEntry struct {
	ID                  int                `json:"id"`
	EventType           FailoverEvent      `json:"event_type"`
	EventLevel          FailoverEventLevel `json:"event_level"`
	FromTarget          string             `json:"from_target,omitempty"`
	ToTarget            string             `json:"to_target,omitempty"`
	FromTargetID        *int               `json:"from_target_id,omitempty"`
	ToTargetID          *int               `json:"to_target_id,omitempty"`
	FailureReason       string             `json:"failure_reason,omitempty"`
	ErrorMessage        string             `json:"error_message,omitempty"`
	FailureCount        int                `json:"failure_count"`
	ResponseTimeMs      *int               `json:"response_time_ms,omitempty"`
	AutoSwitch          bool               `json:"auto_switch"`
	SwitchSuccess       bool               `json:"switch_success"`
	RollbackAvailable   bool               `json:"rollback_available"`
	AffectedUsers       int                `json:"affected_users"`
	DowntimeSeconds     int                `json:"downtime_seconds"`
	OperatorID          *int               `json:"operator_id,omitempty"`
	OperatorName        string             `json:"operator_name,omitempty"`
	ClientIP            string             `json:"client_ip,omitempty"`
	UserAgent           string             `json:"user_agent,omitempty"`
	AdditionalInfo      map[string]interface{} `json:"additional_info,omitempty"`
	Tags                string             `json:"tags,omitempty"`
	CreatedAt           time.Time          `json:"created_at"`
}

// FailoverNotification 故障转移通知
type FailoverNotification struct {
	Event     FailoverEvent              `json:"event"`
	Level     FailoverEventLevel         `json:"level"`
	Message   string                     `json:"message"`
	Details   map[string]interface{}     `json:"details"`
	Timestamp time.Time                  `json:"timestamp"`
}

// FailoverController 故障转移控制器
type FailoverController struct {
	db                *sql.DB
	domainChecker     *domain.DomainHealthChecker
	gatewayManager    *gateway.PaymentGatewayManager
	config            *FailoverConfig
	mu                sync.RWMutex
	isRunning         bool
	stopChan          chan struct{}
	notificationChan  chan FailoverNotification
	currentDomain     *domain.DomainConfig
	currentGateways   []*gateway.PaymentGatewayConfig
	ctx               context.Context
	cancelFunc        context.CancelFunc
}

// NewFailoverController 创建新的故障转移控制器
func NewFailoverController(db *sql.DB, domainChecker *domain.DomainHealthChecker, gatewayManager *gateway.PaymentGatewayManager) *FailoverController {
	ctx, cancel := context.WithCancel(context.Background())

	controller := &FailoverController{
		db:               db,
		domainChecker:    domainChecker,
		gatewayManager:   gatewayManager,
		config:           &FailoverConfig{},
		stopChan:         make(chan struct{}),
		notificationChan: make(chan FailoverNotification, 100),
		ctx:              ctx,
		cancelFunc:       cancel,
	}

	// 加载配置
	if err := controller.loadConfig(); err != nil {
		log.Printf("Failed to load failover config: %v", err)
		// 使用默认配置
		controller.setDefaultConfig()
	}

	return controller
}

// loadConfig 加载故障转移配置
func (fc *FailoverController) loadConfig() error {
	query := `
		SELECT config_key, config_value, config_type
		FROM system_failover_config
		WHERE is_active = true
	`

	rows, err := fc.db.Query(query)
	if err != nil {
		return fmt.Errorf("failed to query config: %w", err)
	}
	defer rows.Close()

	configMap := make(map[string]interface{})

	for rows.Next() {
		var key, value, configType string
		if err := rows.Scan(&key, &value, &configType); err != nil {
			continue
		}

		switch configType {
		case "boolean":
			configMap[key] = value == "true"
		case "int":
			var intVal int
			if err := json.Unmarshal([]byte(value), &intVal); err == nil {
				configMap[key] = intVal
			}
		case "string":
			configMap[key] = value
		}
	}

	// 映射配置到结构体
	fc.config.AutoFailoverEnabled = getBoolConfig(configMap, "auto_failover_enabled", true)
	fc.config.DomainCheckEnabled = getBoolConfig(configMap, "domain_health_check_enabled", true)
	fc.config.GatewayCheckEnabled = getBoolConfig(configMap, "gateway_health_check_enabled", true)
	fc.config.HealthCheckInterval = getIntConfig(configMap, "health_check_interval", 30)
	fc.config.FailureThreshold = getIntConfig(configMap, "failure_threshold", 3)
	fc.config.MaxConcurrentChecks = getIntConfig(configMap, "max_concurrent_checks", 10)
	fc.config.NotificationEnabled = getBoolConfig(configMap, "notification_enabled", true)
	fc.config.WebhookURL = getStringConfig(configMap, "webhook_url", "")
	fc.config.LogRetentionDays = getIntConfig(configMap, "log_retention_days", 30)

	return nil
}

// setDefaultConfig 设置默认配置
func (fc *FailoverController) setDefaultConfig() {
	fc.config = &FailoverConfig{
		AutoFailoverEnabled:    true,
		DomainCheckEnabled:     true,
		GatewayCheckEnabled:    true,
		HealthCheckInterval:    30,
		FailureThreshold:       3,
		MaxConcurrentChecks:    10,
		NotificationEnabled:    true,
		WebhookURL:             "",
		LogRetentionDays:       30,
	}
}

// Start 启动故障转移控制器
func (fc *FailoverController) Start() error {
	fc.mu.Lock()
	defer fc.mu.Unlock()

	if fc.isRunning {
		return fmt.Errorf("failover controller is already running")
	}

	log.Println("Starting failover controller...")

	// 启动域名健康检查回调
	if fc.config.DomainCheckEnabled {
		fc.domainChecker.SetCallback(fc.handleDomainStatusChange)
	}

	// 启动支付网关健康检查回调
	if fc.config.GatewayCheckEnabled {
		fc.gatewayManager.SetCallback(fc.handleGatewayStatusChange)
	}

	// 启动通知处理器
	go fc.notificationHandler()

	// 启动健康检查调度器
	go fc.healthCheckScheduler()

	// 启动日志清理器
	go fc.logCleaner()

	fc.isRunning = true

	// 记录启动日志
	fc.logFailoverEvent(FailoverLogEntry{
		EventType:     "system_start",
		EventLevel:    InfoLevel,
		AutoSwitch:    fc.config.AutoFailoverEnabled,
		SwitchSuccess: true,
		AdditionalInfo: map[string]interface{}{
			"config": fc.config,
		},
	})

	log.Println("Failover controller started successfully")
	return nil
}

// Stop 停止故障转移控制器
func (fc *FailoverController) Stop() error {
	fc.mu.Lock()
	defer fc.mu.Unlock()

	if !fc.isRunning {
		return fmt.Errorf("failover controller is not running")
	}

	log.Println("Stopping failover controller...")

	// 取消上下文
	fc.cancelFunc()

	// 发送停止信号
	close(fc.stopChan)

	fc.isRunning = false

	// 记录停止日志
	fc.logFailoverEvent(FailoverLogEntry{
		EventType:     "system_stop",
		EventLevel:    InfoLevel,
		SwitchSuccess: true,
	})

	log.Println("Failover controller stopped")
	return nil
}

// handleDomainStatusChange 处理域名状态变化
func (fc *FailoverController) handleDomainStatusChange(domainConfig *domain.DomainConfig, result *domain.HealthCheckResult) {
	fc.mu.Lock()
	defer fc.mu.Unlock()

	log.Printf("Domain status change: %s -> %s (consecutive failures: %d)",
		domainConfig.DomainName, result.Status, result.ConsecutiveFailures)

	// 检查是否需要故障转移
	if result.Status == "offline" && domainConfig.DomainType == "primary" {
		if fc.config.AutoFailoverEnabled {
			fc.performDomainFailover(domainConfig, result)
		} else {
			// 仅记录告警，不自动切换
			fc.logFailoverEvent(FailoverLogEntry{
				EventType:      DomainSwitch,
				EventLevel:     WarningLevel,
				FromTarget:     domainConfig.DomainName,
				FromTargetID:   &domainConfig.ID,
				FailureReason:  result.ErrorMessage,
				FailureCount:   result.ConsecutiveFailures,
				ResponseTimeMs: &result.ResponseTimeMs,
				AutoSwitch:     false,
				SwitchSuccess:  false,
			})
		}
	}

	// 检查域名恢复
	if result.Status == "online" && domainConfig.DomainType == "primary" && fc.currentDomain != nil && fc.currentDomain.ID != domainConfig.ID {
		if fc.config.AutoFailoverEnabled {
			fc.performDomainRecovery(domainConfig, result)
		}
	}

	// 发送通知
	if fc.config.NotificationEnabled {
		notification := FailoverNotification{
			Event:   DomainSwitch,
			Level:   InfoLevel,
			Message: fmt.Sprintf("Domain %s status changed to %s", domainConfig.DomainName, result.Status),
			Details: map[string]interface{}{
				"domain":             domainConfig.DomainName,
				"status":             result.Status,
				"consecutive_failures": result.ConsecutiveFailures,
				"response_time_ms":   result.ResponseTimeMs,
			},
			Timestamp: time.Now(),
		}

		select {
		case fc.notificationChan <- notification:
		default:
			log.Println("Notification channel full, dropping notification")
		}
	}
}

// handleGatewayStatusChange 处理支付网关状态变化
func (fc *FailoverController) handleGatewayStatusChange(gatewayConfig *gateway.PaymentGatewayConfig, result *gateway.GatewayHealthResult) {
	fc.mu.Lock()
	defer fc.mu.Unlock()

	log.Printf("Gateway status change: %s -> %s (consecutive failures: %d)",
		gatewayConfig.GatewayName, result.Status, result.ConsecutiveFailures)

	// 检查是否需要故障转移
	if result.Status == "offline" && gatewayConfig.GatewayType == "primary" {
		if fc.config.AutoFailoverEnabled {
			fc.performGatewayFailover(gatewayConfig, result)
		} else {
			// 仅记录告警，不自动切换
			fc.logFailoverEvent(FailoverLogEntry{
				EventType:      GatewaySwitch,
				EventLevel:     WarningLevel,
				FromTarget:     gatewayConfig.GatewayName,
				FromTargetID:   &gatewayConfig.ID,
				FailureReason:  result.ErrorMessage,
				FailureCount:   result.ConsecutiveFailures,
				ResponseTimeMs: &result.ResponseTimeMs,
				AutoSwitch:     false,
				SwitchSuccess:  false,
			})
		}
	}

	// 检查网关恢复
	if result.Status == "online" && gatewayConfig.GatewayType == "primary" {
		fc.performGatewayRecovery(gatewayConfig, result)
	}

	// 发送通知
	if fc.config.NotificationEnabled {
		notification := FailoverNotification{
			Event:   GatewaySwitch,
			Level:   InfoLevel,
			Message: fmt.Sprintf("Gateway %s status changed to %s", gatewayConfig.GatewayName, result.Status),
			Details: map[string]interface{}{
				"gateway":            gatewayConfig.GatewayName,
				"status":             result.Status,
				"consecutive_failures": result.ConsecutiveFailures,
				"response_time_ms":   result.ResponseTimeMs,
				"success_rate":       result.SuccessRate,
			},
			Timestamp: time.Now(),
		}

		select {
		case fc.notificationChan <- notification:
		default:
			log.Println("Notification channel full, dropping notification")
		}
	}
}

// performDomainFailover 执行域名故障转移
func (fc *FailoverController) performDomainFailover(failedDomain *domain.DomainConfig, result *domain.HealthCheckResult) {
	log.Printf("Performing domain failover from %s", failedDomain.DomainName)

	// 获取备用域名
	backupDomain, err := fc.domainChecker.GetPrimaryDomain()
	if err != nil || backupDomain == nil {
		log.Printf("No available backup domain: %v", err)
		fc.logFailoverEvent(FailoverLogEntry{
			EventType:     DomainSwitch,
			EventLevel:    CriticalLevel,
			FromTarget:    failedDomain.DomainName,
			FromTargetID:  &failedDomain.ID,
			FailureReason: "No available backup domain",
			ErrorMessage:  err.Error(),
			FailureCount:  result.ConsecutiveFailures,
			AutoSwitch:    true,
			SwitchSuccess: false,
		})
		return
	}

	// 记录故障转移
	logEntry := FailoverLogEntry{
		EventType:      DomainSwitch,
		EventLevel:     WarningLevel,
		FromTarget:     failedDomain.DomainName,
		ToTarget:       backupDomain.DomainName,
		FromTargetID:   &failedDomain.ID,
		ToTargetID:     &backupDomain.ID,
		FailureReason:  result.ErrorMessage,
		FailureCount:   result.ConsecutiveFailures,
		ResponseTimeMs: &result.ResponseTimeMs,
		AutoSwitch:     true,
		SwitchSuccess:  true,
		RollbackAvailable: true,
	}

	// 更新当前域名
	fc.currentDomain = backupDomain

	// 记录日志
	fc.logFailoverEvent(logEntry)

	log.Printf("Domain failover completed: %s -> %s", failedDomain.DomainName, backupDomain.DomainName)
}

// performDomainRecovery 执行域名恢复
func (fc *FailoverController) performDomainRecovery(recoveredDomain *domain.DomainConfig, result *domain.HealthCheckResult) {
	log.Printf("Performing domain recovery to %s", recoveredDomain.DomainName)

	previousDomain := fc.currentDomain

	// 记录域名恢复
	logEntry := FailoverLogEntry{
		EventType:      DomainRecovery,
		EventLevel:     InfoLevel,
		FromTarget:     previousDomain.DomainName,
		ToTarget:       recoveredDomain.DomainName,
		FromTargetID:   &previousDomain.ID,
		ToTargetID:     &recoveredDomain.ID,
		ResponseTimeMs: &result.ResponseTimeMs,
		AutoSwitch:     true,
		SwitchSuccess:  true,
	}

	// 更新当前域名
	fc.currentDomain = recoveredDomain

	// 记录日志
	fc.logFailoverEvent(logEntry)

	log.Printf("Domain recovery completed: %s -> %s", previousDomain.DomainName, recoveredDomain.DomainName)
}

// performGatewayFailover 执行支付网关故障转移
func (fc *FailoverController) performGatewayFailover(failedGateway *gateway.PaymentGatewayConfig, result *gateway.GatewayHealthResult) {
	log.Printf("Performing gateway failover from %s", failedGateway.GatewayName)

	// 获取可用的备用网关
	availableGateways, err := fc.gatewayManager.GetAvailableGateways()
	if err != nil || len(availableGateways) == 0 {
		log.Printf("No available backup gateway: %v", err)
		fc.logFailoverEvent(FailoverLogEntry{
			EventType:     GatewaySwitch,
			EventLevel:    CriticalLevel,
			FromTarget:    failedGateway.GatewayName,
			FromTargetID:  &failedGateway.ID,
			FailureReason: "No available backup gateway",
			ErrorMessage:  err.Error(),
			FailureCount:  result.ConsecutiveFailures,
			AutoSwitch:    true,
			SwitchSuccess: false,
		})
		return
	}

	backupGateway := availableGateways[0] // 选择第一个可用的备用网关

	// 记录故障转移
	logEntry := FailoverLogEntry{
		EventType:      GatewaySwitch,
		EventLevel:     WarningLevel,
		FromTarget:     failedGateway.GatewayName,
		ToTarget:       backupGateway.GatewayName,
		FromTargetID:   &failedGateway.ID,
		ToTargetID:     &backupGateway.ID,
		FailureReason:  result.ErrorMessage,
		FailureCount:   result.ConsecutiveFailures,
		ResponseTimeMs: &result.ResponseTimeMs,
		AutoSwitch:     true,
		SwitchSuccess:  true,
		RollbackAvailable: true,
	}

	// 记录日志
	fc.logFailoverEvent(logEntry)

	log.Printf("Gateway failover completed: %s -> %s", failedGateway.GatewayName, backupGateway.GatewayName)
}

// performGatewayRecovery 执行支付网关恢复
func (fc *FailoverController) performGatewayRecovery(recoveredGateway *gateway.PaymentGatewayConfig, result *gateway.GatewayHealthResult) {
	log.Printf("Gateway %s has recovered, updating priority", recoveredGateway.GatewayName)

	// 记录网关恢复
	logEntry := FailoverLogEntry{
		EventType:      GatewayRecovery,
		EventLevel:     InfoLevel,
		ToTarget:       recoveredGateway.GatewayName,
		ToTargetID:     &recoveredGateway.ID,
		ResponseTimeMs: &result.ResponseTimeMs,
		AutoSwitch:     true,
		SwitchSuccess:  true,
		AdditionalInfo: map[string]interface{}{
			"success_rate": result.SuccessRate,
		},
	}

	// 记录日志
	fc.logFailoverEvent(logEntry)

	log.Printf("Gateway recovery logged: %s", recoveredGateway.GatewayName)
}

// logFailoverEvent 记录故障转移事件
func (fc *FailoverController) logFailoverEvent(entry FailoverLogEntry) {
	// 设置创建时间
	entry.CreatedAt = time.Now()

	// 序列化附加信息
	var additionalInfoJSON []byte
	if entry.AdditionalInfo != nil {
		var err error
		additionalInfoJSON, err = json.Marshal(entry.AdditionalInfo)
		if err != nil {
			log.Printf("Failed to marshal additional info: %v", err)
		}
	}

	query := `
		INSERT INTO failover_logs (
			event_type, event_level, from_target, to_target, from_target_id, to_target_id,
			failure_reason, error_message, failure_count, response_time_ms, auto_switch,
			switch_success, rollback_available, affected_users, downtime_seconds,
			operator_id, operator_name, client_ip, user_agent, additional_info, tags
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := fc.db.Exec(query,
		entry.EventType, entry.EventLevel, entry.FromTarget, entry.ToTarget,
		entry.FromTargetID, entry.ToTargetID, entry.FailureReason, entry.ErrorMessage,
		entry.FailureCount, entry.ResponseTimeMs, entry.AutoSwitch, entry.SwitchSuccess,
		entry.RollbackAvailable, entry.AffectedUsers, entry.DowntimeSeconds,
		entry.OperatorID, entry.OperatorName, entry.ClientIP, entry.UserAgent,
		additionalInfoJSON, entry.Tags,
	)

	if err != nil {
		log.Printf("Failed to log failover event: %v", err)
	}
}

// notificationHandler 通知处理器
func (fc *FailoverController) notificationHandler() {
	for {
		select {
		case notification := <-fc.notificationChan:
			fc.processNotification(notification)
		case <-fc.stopChan:
			return
		}
	}
}

// processNotification 处理通知
func (fc *FailoverController) processNotification(notification FailoverNotification) {
	if !fc.config.NotificationEnabled {
		return
	}

	// 发送Webhook通知
	if fc.config.WebhookURL != "" {
		go fc.sendWebhookNotification(notification)
	}

	// 这里可以添加其他通知方式，如邮件、短信等
}

// sendWebhookNotification 发送Webhook通知
func (fc *FailoverController) sendWebhookNotification(notification FailoverNotification) {
	// 实现Webhook通知发送逻辑
	// 这里省略具体实现，可以使用HTTP客户端发送POST请求
	log.Printf("Sending webhook notification: %+v", notification)
}

// healthCheckScheduler 健康检查调度器
func (fc *FailoverController) healthCheckScheduler() {
	ticker := time.NewTicker(time.Duration(fc.config.HealthCheckInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// 触发健康检查
			if fc.config.DomainCheckEnabled {
				fc.domainChecker.TriggerImmediateCheck()
			}
			if fc.config.GatewayCheckEnabled {
				fc.gatewayManager.TriggerHealthCheck()
			}
		case <-fc.stopChan:
			return
		}
	}
}

// logCleaner 日志清理器
func (fc *FailoverController) logCleaner() {
	ticker := time.NewTicker(24 * time.Hour) // 每天清理一次
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			fc.cleanOldLogs()
		case <-fc.stopChan:
			return
		}
	}
}

// cleanOldLogs 清理旧日志
func (fc *FailoverController) cleanOldLogs() {
	query := `
		DELETE FROM failover_logs
		WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
	`

	result, err := fc.db.Exec(query, fc.config.LogRetentionDays)
	if err != nil {
		log.Printf("Failed to clean old logs: %v", err)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned %d old failover log entries", rowsAffected)
	}
}

// GetStatus 获取故障转移控制器状态
func (fc *FailoverController) GetStatus() map[string]interface{} {
	fc.mu.RLock()
	defer fc.mu.RUnlock()

	status := map[string]interface{}{
		"running":        fc.isRunning,
		"config":         fc.config,
		"current_domain": fc.currentDomain,
	}

	if fc.currentDomain != nil {
		status["current_domain_name"] = fc.currentDomain.DomainName
	}

	return status
}

// UpdateConfig 更新配置
func (fc *FailoverController) UpdateConfig(newConfig *FailoverConfig) error {
	fc.mu.Lock()
	defer fc.mu.Unlock()

	// 验证配置
	if newConfig.HealthCheckInterval < 10 {
		return fmt.Errorf("health check interval must be at least 10 seconds")
	}
	if newConfig.FailureThreshold < 1 {
		return fmt.Errorf("failure threshold must be at least 1")
	}

	fc.config = newConfig

	log.Println("Failover controller configuration updated")
	return nil
}

// 辅助函数
func getBoolConfig(configMap map[string]interface{}, key string, defaultValue bool) bool {
	if val, ok := configMap[key].(bool); ok {
		return val
	}
	return defaultValue
}

func getIntConfig(configMap map[string]interface{}, key string, defaultValue int) int {
	if val, ok := configMap[key].(int); ok {
		return val
	}
	return defaultValue
}

func getStringConfig(configMap map[string]interface{}, key string, defaultValue string) string {
	if val, ok := configMap[key].(string); ok {
		return val
	}
	return defaultValue
}
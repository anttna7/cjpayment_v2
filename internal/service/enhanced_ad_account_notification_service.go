package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"text/template"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
)

// EnhancedAdAccountNotificationService 增强版广告账户通知服务接口
type EnhancedAdAccountNotificationService interface {
	// Configuration management
	CreateAdAccountNotification(ctx context.Context, req *CreateAdAccountNotificationRequest) (*repository.AdAccountNotification, error)
	UpdateAdAccountNotification(ctx context.Context, id uuid.UUID, req *UpdateAdAccountNotificationRequest) (*repository.AdAccountNotification, error)
	DeleteAdAccountNotification(ctx context.Context, id uuid.UUID) error
	GetAdAccountNotification(ctx context.Context, id uuid.UUID) (*repository.AdAccountNotification, error)
	GetAdAccountNotificationByAccountID(ctx context.Context, adAccountID string) (*repository.AdAccountNotification, error)
	ListAdAccountNotifications(ctx context.Context, filter *AdAccountNotificationFilter) ([]*repository.AdAccountNotification, error)
	
	// Event notification
	SendAdAccountNotification(ctx context.Context, adAccountID string, eventType string, orderID uuid.UUID) error
	SendBatchNotifications(ctx context.Context, req *BatchNotificationRequest) error
	
	// Monitoring and health check
	GetNotificationMonitoring(ctx context.Context, targetID uuid.UUID, targetType string) (*repository.NotificationMonitoring, error)
	UpdateNotificationMonitoring(ctx context.Context, monitoring *repository.NotificationMonitoring) error
	RunHealthCheck(ctx context.Context, adAccountID string) (*HealthCheckResult, error)
	RunAllHealthChecks(ctx context.Context) ([]*HealthCheckResult, error)
	
	// Retry and failure handling
	RetryFailedNotifications(ctx context.Context) error
	RetryNotificationLog(ctx context.Context, logID uuid.UUID) error
	GetFailedNotificationLogs(ctx context.Context, filter *FailedNotificationFilter) ([]*repository.AdAccountNotificationLog, error)
	
	// Template management
	CreateNotificationTemplate(ctx context.Context, req *CreateNotificationTemplateRequest) (*repository.NotificationTemplate, error)
	UpdateNotificationTemplate(ctx context.Context, id uuid.UUID, req *UpdateNotificationTemplateRequest) (*repository.NotificationTemplate, error)
	DeleteNotificationTemplate(ctx context.Context, id uuid.UUID) error
	GetNotificationTemplate(ctx context.Context, id uuid.UUID) (*repository.NotificationTemplate, error)
	ListNotificationTemplates(ctx context.Context, filter *NotificationTemplateFilter) ([]*repository.NotificationTemplate, error)
	RenderNotificationTemplate(ctx context.Context, templateID uuid.UUID, data map[string]interface{}) (*RenderedNotification, error)
	
	// Queue management
	QueueNotification(ctx context.Context, req *QueueNotificationRequest) error
	ProcessNotificationQueue(ctx context.Context, queueName string, batchSize int) error
	GetQueueStats(ctx context.Context, queueName string) (*QueueStats, error)
	
	// Analytics and reporting
	GetNotificationStats(ctx context.Context, filter *NotificationStatsFilter) (*NotificationStats, error)
	GetDetailedLogs(ctx context.Context, filter *NotificationLogFilter) ([]*repository.AdAccountNotificationLog, int64, error)
	ExportNotificationData(ctx context.Context, req *ExportDataRequest) (*ExportResult, error)
	
	// Real-time processors
	StartNotificationProcessor(ctx context.Context) error
	StartHealthCheckProcessor(ctx context.Context) error
	StartMonitoringProcessor(ctx context.Context) error
}

// EnhancedAdAccountNotificationServiceImpl 增强版广告账户通知服务实现
type EnhancedAdAccountNotificationServiceImpl struct {
	adAccountNotificationRepo repository.AdAccountNotificationRepository
	rechargeRepo              repository.RechargeOrderRepository
	merchantRepo              repository.MerchantRepository
	accountRepo               repository.ReceiveAccountRepository
	redisClient               *redis.Client
	httpClient                *http.Client
	notificationChan          chan *NotificationTask
	healthCheckChan           chan *HealthCheckTask
	monitoringChan            chan *MonitoringTask
}

// NewEnhancedAdAccountNotificationService 创建增强版广告账户通知服务
func NewEnhancedAdAccountNotificationService(
	adAccountNotificationRepo repository.AdAccountNotificationRepository,
	rechargeRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
	redisClient *redis.Client,
) EnhancedAdAccountNotificationService {
	return &EnhancedAdAccountNotificationServiceImpl{
		adAccountNotificationRepo: adAccountNotificationRepo,
		rechargeRepo:              rechargeRepo,
		merchantRepo:              merchantRepo,
		accountRepo:               accountRepo,
		redisClient:               redisClient,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		notificationChan: make(chan *NotificationTask, 1000),
		healthCheckChan:  make(chan *HealthCheckTask, 100),
		monitoringChan:   make(chan *MonitoringTask, 100),
	}
}

// CreateAdAccountNotification 创建广告账户通知配置
func (s *EnhancedAdAccountNotificationServiceImpl) CreateAdAccountNotification(ctx context.Context, req *CreateAdAccountNotificationRequest) (*repository.AdAccountNotification, error) {
	// 验证webhook URL可达性
	if err := s.validateWebhookURL(ctx, req.WebhookURL); err != nil {
		return nil, fmt.Errorf("webhook URL validation failed: %w", err)
	}

	config := &repository.AdAccountNotification{
		ID:                   uuid.New(),
		AdAccountName:        req.AdAccountName,
		AdAccountID:          req.AdAccountID,
		WebhookURL:           req.WebhookURL,
		WebhookSecret:        req.WebhookSecret,
		BackupWebhookURL:     req.BackupWebhookURL,
		EnabledEvents:        req.EnabledEvents,
		MaxRetries:           req.MaxRetries,
		RetryIntervalSeconds: req.RetryIntervalSeconds,
		ExponentialBackoff:   req.ExponentialBackoff,
		MaxRetryIntervalSecs: req.MaxRetryIntervalSecs,
		TimeoutSeconds:       req.TimeoutSeconds,
		NotificationFormat:   req.NotificationFormat,
		CustomHeaders:        req.CustomHeaders,
		IsActive:             req.IsActive,
		HealthCheckEnabled:   req.HealthCheckEnabled,
		HealthCheckURL:       req.HealthCheckURL,
		HealthCheckInterval:  req.HealthCheckInterval,
		HealthStatus:         "unknown",
		ContactEmail:         req.ContactEmail,
		ContactPhone:         req.ContactPhone,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}

	if err := s.adAccountNotificationRepo.CreateAdAccountNotification(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create ad account notification: %w", err)
	}

	// 创建监控记录
	monitoring := &repository.NotificationMonitoring{
		ID:                       uuid.New(),
		TargetType:               "ad_account",
		TargetID:                 config.ID,
		TargetName:               config.AdAccountName,
		CurrentStatus:            "healthy",
		AlertThresholdFailures:   5,
		AlertThresholdResponseMS: 5000,
		MonitoringStartedAt:      time.Now(),
		LastResetAt:              time.Now(),
		CreatedAt:                time.Now(),
		UpdatedAt:                time.Now(),
	}

	if err := s.adAccountNotificationRepo.CreateNotificationMonitoring(ctx, monitoring); err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Failed to create monitoring record: %v\n", err)
	}

	return config, nil
}

// UpdateAdAccountNotification 更新广告账户通知配置
func (s *EnhancedAdAccountNotificationServiceImpl) UpdateAdAccountNotification(ctx context.Context, id uuid.UUID, req *UpdateAdAccountNotificationRequest) (*repository.AdAccountNotification, error) {
	config, err := s.adAccountNotificationRepo.GetAdAccountNotification(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get ad account notification: %w", err)
	}

	// 更新字段
	if req.AdAccountName != nil {
		config.AdAccountName = *req.AdAccountName
	}
	if req.WebhookURL != nil {
		if err := s.validateWebhookURL(ctx, *req.WebhookURL); err != nil {
			return nil, fmt.Errorf("webhook URL validation failed: %w", err)
		}
		config.WebhookURL = *req.WebhookURL
	}
	if req.WebhookSecret != nil {
		config.WebhookSecret = req.WebhookSecret
	}
	if req.BackupWebhookURL != nil {
		config.BackupWebhookURL = req.BackupWebhookURL
	}
	if req.EnabledEvents != nil {
		config.EnabledEvents = *req.EnabledEvents
	}
	if req.MaxRetries != nil {
		config.MaxRetries = *req.MaxRetries
	}
	if req.RetryIntervalSeconds != nil {
		config.RetryIntervalSeconds = *req.RetryIntervalSeconds
	}
	if req.ExponentialBackoff != nil {
		config.ExponentialBackoff = *req.ExponentialBackoff
	}
	if req.MaxRetryIntervalSecs != nil {
		config.MaxRetryIntervalSecs = *req.MaxRetryIntervalSecs
	}
	if req.TimeoutSeconds != nil {
		config.TimeoutSeconds = *req.TimeoutSeconds
	}
	if req.NotificationFormat != nil {
		config.NotificationFormat = *req.NotificationFormat
	}
	if req.CustomHeaders != nil {
		config.CustomHeaders = *req.CustomHeaders
	}
	if req.IsActive != nil {
		config.IsActive = *req.IsActive
	}
	if req.HealthCheckEnabled != nil {
		config.HealthCheckEnabled = *req.HealthCheckEnabled
	}
	if req.HealthCheckURL != nil {
		config.HealthCheckURL = req.HealthCheckURL
	}
	if req.HealthCheckInterval != nil {
		config.HealthCheckInterval = *req.HealthCheckInterval
	}
	if req.ContactEmail != nil {
		config.ContactEmail = req.ContactEmail
	}
	if req.ContactPhone != nil {
		config.ContactPhone = req.ContactPhone
	}

	config.UpdatedAt = time.Now()

	if err := s.adAccountNotificationRepo.UpdateAdAccountNotification(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to update ad account notification: %w", err)
	}

	return config, nil
}

// DeleteAdAccountNotification 删除广告账户通知配置
func (s *EnhancedAdAccountNotificationServiceImpl) DeleteAdAccountNotification(ctx context.Context, id uuid.UUID) error {
	if err := s.adAccountNotificationRepo.DeleteAdAccountNotification(ctx, id); err != nil {
		return fmt.Errorf("failed to delete ad account notification: %w", err)
	}
	return nil
}

// GetAdAccountNotification 获取广告账户通知配置
func (s *EnhancedAdAccountNotificationServiceImpl) GetAdAccountNotification(ctx context.Context, id uuid.UUID) (*repository.AdAccountNotification, error) {
	config, err := s.adAccountNotificationRepo.GetAdAccountNotification(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get ad account notification: %w", err)
	}
	return config, nil
}

// GetAdAccountNotificationByAccountID 通过广告账户ID获取通知配置
func (s *EnhancedAdAccountNotificationServiceImpl) GetAdAccountNotificationByAccountID(ctx context.Context, adAccountID string) (*repository.AdAccountNotification, error) {
	config, err := s.adAccountNotificationRepo.GetAdAccountNotificationByAccountID(ctx, adAccountID)
	if err != nil {
		return nil, fmt.Errorf("failed to get ad account notification by account ID: %w", err)
	}
	return config, nil
}

// ListAdAccountNotifications 列出广告账户通知配置
func (s *EnhancedAdAccountNotificationServiceImpl) ListAdAccountNotifications(ctx context.Context, filter *AdAccountNotificationFilter) ([]*repository.AdAccountNotification, error) {
	configs, err := s.adAccountNotificationRepo.ListAdAccountNotifications(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list ad account notifications: %w", err)
	}
	return configs, nil
}

// SendAdAccountNotification 发送广告账户通知
func (s *EnhancedAdAccountNotificationServiceImpl) SendAdAccountNotification(ctx context.Context, adAccountID string, eventType string, orderID uuid.UUID) error {
	// 获取广告账户通知配置
	config, err := s.GetAdAccountNotificationByAccountID(ctx, adAccountID)
	if err != nil {
		return fmt.Errorf("failed to get ad account notification config: %w", err)
	}

	if !config.IsActive {
		return fmt.Errorf("ad account notification is not active")
	}

	// 检查事件类型是否启用
	if !s.isEventEnabled(config.EnabledEvents, eventType) {
		return nil // Skip disabled events
	}

	// 获取订单详情
	order, err := s.rechargeRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("failed to get recharge order: %w", err)
	}

	// 获取商户详情
	merchant, err := s.merchantRepo.GetByID(ctx, order.MerchantID)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	// 获取收款账户详情
	account, err := s.accountRepo.GetByID(ctx, order.ReceiveAccountID)
	if err != nil {
		return fmt.Errorf("failed to get receive account: %w", err)
	}

	// 构建事件数据
	eventData := map[string]interface{}{
		"event_type": eventType,
		"timestamp":  time.Now().Unix(),
		"order": map[string]interface{}{
			"id":            order.ID,
			"order_number":  order.OrderNumber,
			"payer_name":    order.PayerName,
			"payer_account": order.PayerAccount,
			"payment_type":  order.PaymentType,
			"amount":        order.Amount,
			"status":        order.Status,
			"ad_account":    order.AdAccount,
			"remark":        order.Remark,
			"created_at":    order.CreatedAt,
			"updated_at":    order.UpdatedAt,
		},
		"merchant": map[string]interface{}{
			"id":            merchant.ID,
			"name":          merchant.Name,
			"code":          merchant.Code,
			"contact_email": merchant.ContactEmail,
		},
		"account": map[string]interface{}{
			"id":             account.ID,
			"account_name":   account.AccountName,
			"account_number": account.AccountNumber,
			"account_type":   account.AccountType,
			"account_holder": account.AccountHolder,
		},
		"ad_account": map[string]interface{}{
			"id":   config.AdAccountID,
			"name": config.AdAccountName,
		},
	}

	// 渲染通知内容
	content, err := s.renderNotificationContent(config, eventData)
	if err != nil {
		return fmt.Errorf("failed to render notification content: %w", err)
	}

	// 创建通知日志
	log := &repository.AdAccountNotificationLog{
		ID:                      uuid.New(),
		AdAccountNotificationID: config.ID,
		RechargeOrderID:         orderID,
		EventType:               eventType,
		EventData:               eventData,
		TargetURL:               config.WebhookURL,
		RequestMethod:           "POST",
		RequestBody:             content,
		RetryCount:              0,
		MaxRetries:              config.MaxRetries,
		Status:                  "pending",
		ScheduledAt:             time.Now(),
		CreatedAt:               time.Now(),
		UpdatedAt:               time.Now(),
	}

	if err := s.adAccountNotificationRepo.CreateAdAccountNotificationLog(ctx, log); err != nil {
		return fmt.Errorf("failed to create notification log: %w", err)
	}

	// 添加到通知队列异步处理
	task := &NotificationTask{
		LogID:    log.ID,
		ConfigID: config.ID,
		Priority: s.getEventPriority(eventType),
	}

	select {
	case s.notificationChan <- task:
		// Successfully queued
	default:
		// Channel is full, execute immediately
		go s.executeNotification(context.Background(), log, config)
	}

	return nil
}

// SendBatchNotifications 批量发送通知
func (s *EnhancedAdAccountNotificationServiceImpl) SendBatchNotifications(ctx context.Context, req *BatchNotificationRequest) error {
	for _, notification := range req.Notifications {
		if err := s.SendAdAccountNotification(ctx, notification.AdAccountID, notification.EventType, notification.OrderID); err != nil {
			// Log error but continue with other notifications
			fmt.Printf("Failed to send notification for ad account %s: %v\n", notification.AdAccountID, err)
		}
	}
	return nil
}

// RunHealthCheck 运行健康检查
func (s *EnhancedAdAccountNotificationServiceImpl) RunHealthCheck(ctx context.Context, adAccountID string) (*HealthCheckResult, error) {
	config, err := s.GetAdAccountNotificationByAccountID(ctx, adAccountID)
	if err != nil {
		return nil, fmt.Errorf("failed to get ad account notification config: %w", err)
	}

	if !config.HealthCheckEnabled || config.HealthCheckURL == nil {
		return &HealthCheckResult{
			AdAccountID: adAccountID,
			Status:      "disabled",
			Message:     "Health check is disabled",
			CheckedAt:   time.Now(),
		}, nil
	}

	result := &HealthCheckResult{
		AdAccountID: adAccountID,
		CheckedAt:   time.Now(),
	}

	// 执行健康检查请求
	startTime := time.Now()
	client := &http.Client{
		Timeout: time.Duration(config.TimeoutSeconds) * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", *config.HealthCheckURL, nil)
	if err != nil {
		result.Status = "error"
		result.Message = fmt.Sprintf("Failed to create health check request: %v", err)
		result.ResponseTime = int(time.Since(startTime).Milliseconds())
		return result, nil
	}

	// 设置自定义请求头
	if config.CustomHeaders != nil {
		for key, value := range config.CustomHeaders {
			if strValue, ok := value.(string); ok {
				req.Header.Set(key, strValue)
			}
		}
	}
	req.Header.Set("User-Agent", "CJPayment-HealthCheck/1.0")

	resp, err := client.Do(req)
	if err != nil {
		result.Status = "unhealthy"
		result.Message = fmt.Sprintf("Health check request failed: %v", err)
		result.ResponseTime = int(time.Since(startTime).Milliseconds())
		return result, nil
	}
	defer resp.Body.Close()

	result.ResponseTime = int(time.Since(startTime).Milliseconds())
	result.StatusCode = resp.StatusCode

	// 读取响应内容
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		result.Status = "error"
		result.Message = fmt.Sprintf("Failed to read health check response: %v", err)
		return result, nil
	}

	result.ResponseBody = string(body)

	// 判断健康状态
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		result.Status = "healthy"
		result.Message = "Health check passed"
	} else {
		result.Status = "unhealthy"
		result.Message = fmt.Sprintf("Health check failed with status %d", resp.StatusCode)
	}

	// 更新配置中的健康检查信息
	config.LastHealthCheckAt = &result.CheckedAt
	config.HealthStatus = result.Status
	if err := s.adAccountNotificationRepo.UpdateAdAccountNotification(ctx, config); err != nil {
		fmt.Printf("Failed to update health check status: %v\n", err)
	}

	// 更新监控信息
	monitoring, err := s.GetNotificationMonitoring(ctx, config.ID, "ad_account")
	if err == nil {
		monitoring.HealthCheckStatus = result.Status
		monitoring.LastHealthCheckAt = &result.CheckedAt
		monitoring.HealthCheckResponseTimeMS = &result.ResponseTime
		monitoring.UpdatedAt = time.Now()
		s.UpdateNotificationMonitoring(ctx, monitoring)
	}

	return result, nil
}

// RunAllHealthChecks 运行所有健康检查
func (s *EnhancedAdAccountNotificationServiceImpl) RunAllHealthChecks(ctx context.Context) ([]*HealthCheckResult, error) {
	filter := &AdAccountNotificationFilter{
		IsActive:           &[]bool{true}[0],
		HealthCheckEnabled: &[]bool{true}[0],
	}

	configs, err := s.ListAdAccountNotifications(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list active configurations: %w", err)
	}

	var results []*HealthCheckResult
	for _, config := range configs {
		// 检查是否到了检查时间
		if s.shouldRunHealthCheck(config) {
			result, err := s.RunHealthCheck(ctx, config.AdAccountID)
			if err != nil {
				// Log error but continue with other checks
				fmt.Printf("Health check failed for ad account %s: %v\n", config.AdAccountID, err)
				continue
			}
			results = append(results, result)
		}
	}

	return results, nil
}

// StartNotificationProcessor 启动通知处理器
func (s *EnhancedAdAccountNotificationServiceImpl) StartNotificationProcessor(ctx context.Context) error {
	// 启动多个工作协程处理通知
	for i := 0; i < 5; i++ {
		go s.notificationWorker(ctx, i)
	}

	// 启动重试处理器
	go s.retryProcessor(ctx)

	return nil
}

// StartHealthCheckProcessor 启动健康检查处理器
func (s *EnhancedAdAccountNotificationServiceImpl) StartHealthCheckProcessor(ctx context.Context) error {
	go s.healthCheckProcessor(ctx)
	return nil
}

// StartMonitoringProcessor 启动监控处理器
func (s *EnhancedAdAccountNotificationServiceImpl) StartMonitoringProcessor(ctx context.Context) error {
	go s.monitoringProcessor(ctx)
	return nil
}

// Private helper methods

func (s *EnhancedAdAccountNotificationServiceImpl) validateWebhookURL(ctx context.Context, url string) error {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("URL not reachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("URL returned error status: %d", resp.StatusCode)
	}

	return nil
}

func (s *EnhancedAdAccountNotificationServiceImpl) isEventEnabled(enabledEvents []string, eventType string) bool {
	for _, event := range enabledEvents {
		if event == eventType {
			return true
		}
	}
	return false
}

func (s *EnhancedAdAccountNotificationServiceImpl) renderNotificationContent(config *repository.AdAccountNotification, eventData map[string]interface{}) (string, error) {
	switch config.NotificationFormat {
	case "json":
		return s.renderJSONContent(eventData)
	case "xml":
		return s.renderXMLContent(eventData)
	case "form":
		return s.renderFormContent(eventData)
	default:
		return s.renderJSONContent(eventData)
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) renderJSONContent(eventData map[string]interface{}) (string, error) {
	jsonData, err := json.MarshalIndent(eventData, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal JSON: %w", err)
	}
	return string(jsonData), nil
}

func (s *EnhancedAdAccountNotificationServiceImpl) renderXMLContent(eventData map[string]interface{}) (string, error) {
	// Simplified XML rendering - in production, use a proper XML library
	var buffer bytes.Buffer
	buffer.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	buffer.WriteString("<notification>\n")
	
	for key, value := range eventData {
		buffer.WriteString(fmt.Sprintf("  <%s>%v</%s>\n", key, value, key))
	}
	
	buffer.WriteString("</notification>")
	return buffer.String(), nil
}

func (s *EnhancedAdAccountNotificationServiceImpl) renderFormContent(eventData map[string]interface{}) (string, error) {
	var buffer bytes.Buffer
	
	for key, value := range eventData {
		if buffer.Len() > 0 {
			buffer.WriteString("&")
		}
		buffer.WriteString(fmt.Sprintf("%s=%v", key, value))
	}
	
	return buffer.String(), nil
}

func (s *EnhancedAdAccountNotificationServiceImpl) getEventPriority(eventType string) int {
	switch eventType {
	case "recharge_failed":
		return 1 // Highest priority
	case "recharge_confirmed":
		return 2
	case "recharge_paid":
		return 3
	case "recharge_created":
		return 4
	default:
		return 5 // Lowest priority
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) shouldRunHealthCheck(config *repository.AdAccountNotification) bool {
	if !config.HealthCheckEnabled {
		return false
	}

	if config.LastHealthCheckAt == nil {
		return true
	}

	intervalDuration := time.Duration(config.HealthCheckInterval) * time.Minute
	return time.Since(*config.LastHealthCheckAt) >= intervalDuration
}

// Worker functions

func (s *EnhancedAdAccountNotificationServiceImpl) notificationWorker(ctx context.Context, workerID int) {
	for {
		select {
		case <-ctx.Done():
			return
		case task := <-s.notificationChan:
			s.processNotificationTask(ctx, task)
		}
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) processNotificationTask(ctx context.Context, task *NotificationTask) {
	// 获取通知日志
	log, err := s.adAccountNotificationRepo.GetAdAccountNotificationLog(ctx, task.LogID)
	if err != nil {
		fmt.Printf("Failed to get notification log %s: %v\n", task.LogID, err)
		return
	}

	// 获取配置
	config, err := s.adAccountNotificationRepo.GetAdAccountNotification(ctx, task.ConfigID)
	if err != nil {
		fmt.Printf("Failed to get notification config %s: %v\n", task.ConfigID, err)
		return
	}

	// 执行通知
	if err := s.executeNotification(ctx, log, config); err != nil {
		fmt.Printf("Failed to execute notification %s: %v\n", log.ID, err)
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) executeNotification(ctx context.Context, log *repository.AdAccountNotificationLog, config *repository.AdAccountNotification) error {
	startTime := time.Now()

	// 更新状态为处理中
	log.Status = "processing"
	log.StartedAt = &startTime
	log.UpdatedAt = time.Now()
	s.adAccountNotificationRepo.UpdateAdAccountNotificationLog(ctx, log)

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, log.RequestMethod, log.TargetURL, strings.NewReader(log.RequestBody))
	if err != nil {
		return s.handleNotificationError(ctx, log, config, fmt.Sprintf("Failed to create request: %v", err))
	}

	// 设置请求头
	req.Header.Set("Content-Type", s.getContentType(config.NotificationFormat))
	req.Header.Set("User-Agent", "CJPayment-AdAccountNotification/1.0")
	req.Header.Set("X-Event-Type", log.EventType)
	req.Header.Set("X-Ad-Account-ID", config.AdAccountID)
	req.Header.Set("X-Notification-ID", log.ID.String())
	req.Header.Set("X-Timestamp", strconv.FormatInt(time.Now().Unix(), 10))

	// 设置自定义请求头
	if config.CustomHeaders != nil {
		for key, value := range config.CustomHeaders {
			if strValue, ok := value.(string); ok {
				req.Header.Set(key, strValue)
			}
		}
	}

	// 生成签名
	if config.WebhookSecret != nil {
		signature := s.generateSignature(log.RequestBody, *config.WebhookSecret)
		req.Header.Set("X-Signature", signature)
		log.WebhookSignature = &signature
	}

	// 保存请求头信息
	log.RequestHeaders = make(map[string]interface{})
	for key, values := range req.Header {
		if len(values) > 0 {
			log.RequestHeaders[key] = values[0]
		}
	}

	// 创建HTTP客户端并设置超时
	client := &http.Client{
		Timeout: time.Duration(config.TimeoutSeconds) * time.Second,
	}

	// 执行请求
	resp, err := client.Do(req)
	if err != nil {
		return s.handleNotificationError(ctx, log, config, fmt.Sprintf("Request failed: %v", err))
	}
	defer resp.Body.Close()

	// 读取响应
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return s.handleNotificationError(ctx, log, config, fmt.Sprintf("Failed to read response: %v", err))
	}

	// 计算执行时间
	executionTime := int(time.Since(startTime).Milliseconds())
	completedAt := time.Now()

	// 更新日志信息
	log.ResponseStatus = &resp.StatusCode
	responseBodyStr := string(responseBody)
	log.ResponseBody = &responseBodyStr
	log.ExecutionTimeMS = &executionTime
	log.CompletedAt = &completedAt
	log.UpdatedAt = time.Now()

	// 保存响应头信息
	log.ResponseHeaders = make(map[string]interface{})
	for key, values := range resp.Header {
		if len(values) > 0 {
			log.ResponseHeaders[key] = values[0]
		}
	}

	// 检查是否成功
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Status = "success"
		
		// 更新配置统计信息
		config.SuccessCount++
		config.TotalNotifications++
		config.LastNotificationAt = &completedAt
		s.adAccountNotificationRepo.UpdateAdAccountNotification(ctx, config)
		
		// 更新监控信息
		s.updateMonitoringOnSuccess(ctx, config.ID, executionTime)
	} else {
		return s.handleNotificationError(ctx, log, config, fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(responseBody)))
	}

	return s.adAccountNotificationRepo.UpdateAdAccountNotificationLog(ctx, log)
}

func (s *EnhancedAdAccountNotificationServiceImpl) handleNotificationError(ctx context.Context, log *repository.AdAccountNotificationLog, config *repository.AdAccountNotification, errorMsg string) error {
	log.ErrorMessage = &errorMsg
	log.RetryCount++
	completedAt := time.Now()
	log.CompletedAt = &completedAt
	log.UpdatedAt = time.Now()

	// 更新配置统计信息
	config.FailureCount++
	config.TotalNotifications++
	s.adAccountNotificationRepo.UpdateAdAccountNotification(ctx, config)

	// 更新监控信息
	s.updateMonitoringOnFailure(ctx, config.ID)

	if log.RetryCount >= log.MaxRetries {
		log.Status = "max_retries_exceeded"
	} else {
		log.Status = "failed"
		// 计算下次重试时间
		var nextRetryInterval int
		if config.ExponentialBackoff {
			// 指数退避策略
			nextRetryInterval = config.RetryIntervalSeconds * (1 << log.RetryCount)
			if nextRetryInterval > config.MaxRetryIntervalSecs {
				nextRetryInterval = config.MaxRetryIntervalSecs
			}
		} else {
			// 固定间隔重试
			nextRetryInterval = config.RetryIntervalSeconds
		}
		
		nextRetry := time.Now().Add(time.Duration(nextRetryInterval) * time.Second)
		log.NextRetryAt = &nextRetry
	}

	return s.adAccountNotificationRepo.UpdateAdAccountNotificationLog(ctx, log)
}

func (s *EnhancedAdAccountNotificationServiceImpl) generateSignature(payload string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func (s *EnhancedAdAccountNotificationServiceImpl) getContentType(format string) string {
	switch format {
	case "json":
		return "application/json"
	case "xml":
		return "application/xml"
	case "form":
		return "application/x-www-form-urlencoded"
	default:
		return "application/json"
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) updateMonitoringOnSuccess(ctx context.Context, targetID uuid.UUID, responseTime int) {
	monitoring, err := s.GetNotificationMonitoring(ctx, targetID, "ad_account")
	if err != nil {
		return
	}

	monitoring.TotalNotifications++
	monitoring.SuccessfulNotifications++
	monitoring.RecentNotifications24h++
	monitoring.RecentSuccesses24h++
	monitoring.ConsecutiveFailures = 0 // Reset failure count
	monitoring.CurrentStatus = "healthy"
	now := time.Now()
	monitoring.LastNotificationAt = &now
	monitoring.LastSuccessAt = &now
	monitoring.UpdatedAt = now

	// 更新平均响应时间
	totalRequests := monitoring.TotalNotifications
	currentAvg := monitoring.AvgResponseTimeMS
	newAvg := (currentAvg.Mul(decimal.NewFromInt(int64(totalRequests-1))).Add(decimal.NewFromInt(int64(responseTime)))).Div(decimal.NewFromInt(int64(totalRequests)))
	monitoring.AvgResponseTimeMS = newAvg

	s.UpdateNotificationMonitoring(ctx, monitoring)
}

func (s *EnhancedAdAccountNotificationServiceImpl) updateMonitoringOnFailure(ctx context.Context, targetID uuid.UUID) {
	monitoring, err := s.GetNotificationMonitoring(ctx, targetID, "ad_account")
	if err != nil {
		return
	}

	monitoring.TotalNotifications++
	monitoring.FailedNotifications++
	monitoring.RecentNotifications24h++
	monitoring.RecentFailures24h++
	monitoring.ConsecutiveFailures++
	now := time.Now()
	monitoring.LastNotificationAt = &now
	monitoring.LastFailureAt = &now
	monitoring.UpdatedAt = now

	// 根据连续失败次数更新状态
	if monitoring.ConsecutiveFailures >= monitoring.AlertThresholdFailures {
		monitoring.CurrentStatus = "critical"
		monitoring.IsAlerting = true
	} else if monitoring.ConsecutiveFailures > 0 {
		monitoring.CurrentStatus = "warning"
	}

	s.UpdateNotificationMonitoring(ctx, monitoring)
}

func (s *EnhancedAdAccountNotificationServiceImpl) retryProcessor(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.RetryFailedNotifications(ctx)
		}
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) healthCheckProcessor(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.RunAllHealthChecks(ctx)
		}
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) monitoringProcessor(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.processMonitoringTasks(ctx)
		}
	}
}

func (s *EnhancedAdAccountNotificationServiceImpl) processMonitoringTasks(ctx context.Context) {
	// Reset 24-hour statistics if needed
	s.resetDailyStatistics(ctx)
	
	// Check for alerting conditions
	s.checkAlertingConditions(ctx)
}

func (s *EnhancedAdAccountNotificationServiceImpl) resetDailyStatistics(ctx context.Context) {
	// This would implement the logic to reset 24-hour statistics
	// Implementation depends on your specific requirements
}

func (s *EnhancedAdAccountNotificationServiceImpl) checkAlertingConditions(ctx context.Context) {
	// This would implement the logic to check for alerting conditions
	// and send alerts when thresholds are exceeded
}

// Request/Response types and helper structures

// NotificationTask represents a notification task
type NotificationTask struct {
	LogID    uuid.UUID
	ConfigID uuid.UUID
	Priority int
}

// HealthCheckTask represents a health check task
type HealthCheckTask struct {
	AdAccountID string
	ConfigID    uuid.UUID
}

// MonitoringTask represents a monitoring task
type MonitoringTask struct {
	TargetID   uuid.UUID
	TargetType string
	Action     string
}

// Request/Response structures would be defined here
// (CreateAdAccountNotificationRequest, UpdateAdAccountNotificationRequest, etc.)
// These are simplified for brevity - in a real implementation, 
// you would define all the request/response structures
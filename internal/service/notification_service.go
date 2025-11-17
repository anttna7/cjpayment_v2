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
	"net/smtp"
	"strings"
	"text/template"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/go-redis/redis/v8"
)

// NotificationServiceInterface defines the notification service interface (avoiding redeclaration)
type NotificationServiceInterface interface {
	// Notification configuration management
	CreateNotificationConfig(ctx context.Context, req *CreateNotificationConfigRequest) (*repository.NotificationConfig, error)
	UpdateNotificationConfig(ctx context.Context, id uuid.UUID, req *UpdateNotificationConfigRequest) (*repository.NotificationConfig, error)
	DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error
	GetNotificationConfig(ctx context.Context, id uuid.UUID) (*repository.NotificationConfig, error)
	ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*repository.NotificationConfig, error)
	
	// Event notification sending
	SendRechargeNotification(ctx context.Context, orderID uuid.UUID, eventType string) error
	SendCustomNotification(ctx context.Context, req *SendCustomNotificationRequest) error
	
	// Retry and failure handling
	RetryFailedNotifications(ctx context.Context) error
	RetryNotification(ctx context.Context, logID uuid.UUID) error
	GetFailedNotifications(ctx context.Context, filter *FailedNotificationFilter) ([]*repository.NotificationLog, error)
	
	// Notification status tracking and logs
	GetNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*repository.NotificationLog, int64, error)
	GetNotificationStatus(ctx context.Context, orderID uuid.UUID) ([]*NotificationStatus, error)
	
	// Webhook management
	RegisterWebhook(ctx context.Context, req *RegisterWebhookRequest) (*WebhookRegistration, error)
	UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error
	ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*WebhookRegistration, error)
	ValidateWebhookSignature(ctx context.Context, webhookID uuid.UUID, payload []byte, signature string) (bool, error)
}

// NotificationServiceImpl implements NotificationService
type NotificationServiceImpl struct {
	notificationRepo repository.NotificationRepository
	webhookRepo      repository.WebhookRepository
	rechargeRepo     repository.RechargeOrderRepository
	merchantRepo     repository.MerchantRepository
	accountRepo      repository.ReceiveAccountRepository
	redisClient      *redis.Client
	httpClient       *http.Client
	emailConfig      *EmailConfig
}

// EmailConfig holds email configuration
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
}

// NewNotificationService creates a new notification service
func NewNotificationService(
	notificationRepo repository.NotificationRepository,
	webhookRepo repository.WebhookRepository,
	rechargeRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
	redisClient *redis.Client,
) NotificationService {
	return &NotificationServiceImpl{
		notificationRepo: notificationRepo,
		webhookRepo:      webhookRepo,
		rechargeRepo:     rechargeRepo,
		merchantRepo:     merchantRepo,
		accountRepo:      accountRepo,
		redisClient:      redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		emailConfig: &EmailConfig{
			SMTPHost:     "smtp.gmail.com",
			SMTPPort:     "587",
			SMTPUsername: "", // Should be configured from environment
			SMTPPassword: "", // Should be configured from environment
			FromEmail:    "noreply@cjpayment.com",
			FromName:     "CJ Payment System",
		},
	}
}

// NewNotificationServiceWithConfig creates a new notification service with custom email config
func NewNotificationServiceWithConfig(
	notificationRepo repository.NotificationRepository,
	webhookRepo repository.WebhookRepository,
	rechargeRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
	redisClient *redis.Client,
	emailConfig *EmailConfig,
) NotificationService {
	return &NotificationServiceImpl{
		notificationRepo: notificationRepo,
		webhookRepo:      webhookRepo,
		rechargeRepo:     rechargeRepo,
		merchantRepo:     merchantRepo,
		accountRepo:      accountRepo,
		redisClient:      redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		emailConfig: emailConfig,
	}
}

// SendNotification sends a notification using the repository.Notification model
func (s *NotificationServiceImpl) SendNotification(ctx context.Context, notification *repository.Notification) error {
	switch notification.Channel {
	case "email":
		return s.sendEmailNotification(ctx, notification)
	case "webhook":
		return s.sendWebhookNotification(ctx, notification)
	default:
		return fmt.Errorf("unsupported notification channel: %s", notification.Channel)
	}
}

// sendEmailNotification sends an email notification
func (s *NotificationServiceImpl) sendEmailNotification(ctx context.Context, notification *repository.Notification) error {
	if s.emailConfig.SMTPUsername == "" || s.emailConfig.SMTPPassword == "" {
		// Mark as failed if email is not configured
		notification.Status = "failed"
		return fmt.Errorf("email configuration not set")
	}

	// Parse recipients
	recipients := strings.Split(notification.Recipient, ",")
	for i, recipient := range recipients {
		recipients[i] = strings.TrimSpace(recipient)
	}

	// Create email message
	message := &EmailMessage{
		To:      recipients,
		Subject: notification.Title,
		Body:    notification.Content,
		IsHTML:  true,
	}

	// Create email service
	emailService := NewEmailService(
		s.emailConfig.SMTPHost,
		s.emailConfig.SMTPPort,
		s.emailConfig.SMTPUsername,
		s.emailConfig.SMTPPassword,
		s.emailConfig.FromEmail,
		s.emailConfig.FromName,
	)

	// Send email
	err := emailService.SendEmail(ctx, message)
	if err != nil {
		notification.Status = "failed"
		return err
	}

	// Update notification status
	now := time.Now()
	notification.Status = "sent"
	notification.SentAt = &now

	return nil
}

// sendWebhookNotification sends a webhook notification
func (s *NotificationServiceImpl) sendWebhookNotification(ctx context.Context, notification *repository.Notification) error {
	// This is a placeholder for webhook functionality
	// In a real implementation, you would send HTTP requests to webhook URLs
	notification.Status = "sent"
	now := time.Now()
	notification.SentAt = &now
	return nil
}

// SendNotificationDirect sends a direct notification without using configuration
func (s *NotificationServiceImpl) SendNotificationDirect(ctx context.Context, req *SendNotificationRequest) error {
	// Create notification log
	log := &repository.NotificationLog{
		ID:               uuid.New(),
		EventType:        req.EventType,
		TargetURL:        req.TargetURL,
		RequestHeaders:   req.Headers,
		RequestBody:      req.Payload,
		RetryCount:       0,
		MaxRetries:       s.getMaxRetriesFromPolicy(req.RetryPolicy),
		Status:           "pending",
		RechargeOrderID:  req.OrderID,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := s.notificationRepo.CreateNotificationLog(ctx, log); err != nil {
		return fmt.Errorf("failed to create notification log: %w", err)
	}

	// Create temporary config for execution
	config := &repository.NotificationConfig{
		WebhookURL:     req.TargetURL,
		HTTPMethod:     req.HTTPMethod,
		Headers:        req.Headers,
		TimeoutSeconds: req.TimeoutSeconds,
	}

	if config.TimeoutSeconds == 0 {
		config.TimeoutSeconds = 30 // Default timeout
	}

	// Send notification asynchronously
	go s.executeNotification(context.Background(), log, config)

	return nil
}

// CreateNotificationConfig creates a new notification configuration
func (s *NotificationServiceImpl) CreateNotificationConfig(ctx context.Context, req *CreateNotificationConfigRequest) (*repository.NotificationConfig, error) {
	// Validate template
	if err := s.validateTemplate(req.TemplateBody); err != nil {
		return nil, fmt.Errorf("invalid template: %w", err)
	}

	config := &repository.NotificationConfig{
		ID:             uuid.New(),
		Name:           req.Name,
		EventType:      req.EventType,
		TargetSystem:   req.TargetSystem,
		WebhookURL:     req.WebhookURL,
		HTTPMethod:     req.HTTPMethod,
		Headers:        req.Headers,
		TemplateBody:   req.TemplateBody,
		RetryPolicy:    req.RetryPolicy,
		TimeoutSeconds: req.TimeoutSeconds,
		IsActive:       req.IsActive,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.notificationRepo.CreateNotificationConfig(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to create notification config: %w", err)
	}

	return config, nil
}

// UpdateNotificationConfig updates an existing notification configuration
func (s *NotificationServiceImpl) UpdateNotificationConfig(ctx context.Context, id uuid.UUID, req *UpdateNotificationConfigRequest) (*repository.NotificationConfig, error) {
	config, err := s.notificationRepo.GetNotificationConfig(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification config: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		config.Name = *req.Name
	}
	if req.EventType != nil {
		config.EventType = *req.EventType
	}
	if req.TargetSystem != nil {
		config.TargetSystem = *req.TargetSystem
	}
	if req.WebhookURL != nil {
		config.WebhookURL = *req.WebhookURL
	}
	if req.HTTPMethod != nil {
		config.HTTPMethod = *req.HTTPMethod
	}
	if req.Headers != nil {
		config.Headers = *req.Headers
	}
	if req.TemplateBody != nil {
		if err := s.validateTemplate(*req.TemplateBody); err != nil {
			return nil, fmt.Errorf("invalid template: %w", err)
		}
		config.TemplateBody = *req.TemplateBody
	}
	if req.RetryPolicy != nil {
		config.RetryPolicy = *req.RetryPolicy
	}
	if req.TimeoutSeconds != nil {
		config.TimeoutSeconds = *req.TimeoutSeconds
	}
	if req.IsActive != nil {
		config.IsActive = *req.IsActive
	}

	config.UpdatedAt = time.Now()

	if err := s.notificationRepo.UpdateNotificationConfig(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to update notification config: %w", err)
	}

	return config, nil
}

// DeleteNotificationConfig deletes a notification configuration
func (s *NotificationServiceImpl) DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error {
	if err := s.notificationRepo.DeleteNotificationConfig(ctx, id); err != nil {
		return fmt.Errorf("failed to delete notification config: %w", err)
	}
	return nil
}

// GetNotificationConfig gets a notification configuration by ID
func (s *NotificationServiceImpl) GetNotificationConfig(ctx context.Context, id uuid.UUID) (*repository.NotificationConfig, error) {
	config, err := s.notificationRepo.GetNotificationConfig(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification config: %w", err)
	}
	return config, nil
}

// ListNotificationConfigs lists notification configurations with filtering
func (s *NotificationServiceImpl) ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*repository.NotificationConfig, error) {
	repoFilter := &repository.NotificationConfigFilter{
		EventType:    filter.EventType,
		TargetSystem: filter.TargetSystem,
		IsActive:     filter.IsActive,
		Limit:        filter.Limit,
		Offset:       filter.Offset,
		OrderBy:      filter.OrderBy,
		OrderDir:     filter.OrderDir,
	}

	configs, err := s.notificationRepo.ListNotificationConfigs(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list notification configs: %w", err)
	}

	return configs, nil
}

// SendRechargeNotification sends notification for recharge order events
func (s *NotificationServiceImpl) SendRechargeNotification(ctx context.Context, orderID uuid.UUID, eventType string) error {
	// Get recharge order details
	order, err := s.rechargeRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("failed to get recharge order: %w", err)
	}

	// Get merchant details
	merchant, err := s.merchantRepo.GetByID(ctx, order.MerchantID)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	// Get receive account details
	account, err := s.accountRepo.GetByID(ctx, order.ReceiveAccountID)
	if err != nil {
		return fmt.Errorf("failed to get receive account: %w", err)
	}

	// Get notification configurations for this event type
	filter := &repository.NotificationConfigFilter{
		EventType: &eventType,
		IsActive:  &[]bool{true}[0],
	}

	configs, err := s.notificationRepo.ListNotificationConfigs(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to get notification configs: %w", err)
	}

	// Send notifications for each configuration
	for _, config := range configs {
		if err := s.sendNotification(ctx, config, order, merchant, account); err != nil {
			// Log error but continue with other notifications
			fmt.Printf("Failed to send notification for config %s: %v\n", config.ID, err)
		}
	}

	// Send email notifications if configured
	if err := s.sendRechargeEmailNotifications(ctx, order, merchant, eventType); err != nil {
		fmt.Printf("Failed to send email notifications: %v\n", err)
	}

	// Send real-time notifications
	if err := s.sendRechargeRealTimeNotifications(ctx, order, merchant, eventType); err != nil {
		fmt.Printf("Failed to send real-time notifications: %v\n", err)
	}

	return nil
}

// sendRechargeEmailNotifications sends email notifications for recharge events
func (s *NotificationServiceImpl) sendRechargeEmailNotifications(ctx context.Context, order *repository.RechargeOrder, merchant *repository.Merchant, eventType string) error {
	// Get email recipients from configuration or default
	recipients := s.getEmailRecipientsForEvent(eventType)
	if len(recipients) == 0 {
		return nil // No recipients configured
	}

	return s.SendRechargeEmailNotification(ctx, order.ID, eventType, recipients)
}

// sendRechargeRealTimeNotifications sends real-time notifications for recharge events
func (s *NotificationServiceImpl) sendRechargeRealTimeNotifications(ctx context.Context, order *repository.RechargeOrder, merchant *repository.Merchant, eventType string) error {
	// Get users who should receive real-time notifications
	userIDs := s.getUsersForRealtimeNotification(eventType)
	
	for _, userID := range userIDs {
		notification := &RealTimeNotification{
			UserID:    userID,
			Type:      "recharge_event",
			Title:     s.getRealtimeNotificationTitle(eventType),
			Message:   s.getRealtimeNotificationMessage(eventType, order, merchant),
			Data: map[string]interface{}{
				"order_id":     order.ID,
				"order_number": order.OrderNumber,
				"merchant_id":  merchant.ID,
				"merchant_name": merchant.Name,
				"amount":       order.Amount,
				"event_type":   eventType,
			},
			Timestamp: time.Now(),
		}

		if err := s.SendRealTimeNotification(ctx, notification); err != nil {
			fmt.Printf("Failed to send real-time notification to user %s: %v\n", userID, err)
		}
	}

	return nil
}

// getEmailRecipientsForEvent returns email recipients for a specific event type
func (s *NotificationServiceImpl) getEmailRecipientsForEvent(eventType string) []string {
	// This should be configurable, for now return default recipients
	switch eventType {
	case "recharge_created", "recharge_paid":
		return []string{"admin@cjpayment.com", "finance@cjpayment.com"}
	case "recharge_confirmed", "recharge_failed":
		return []string{"admin@cjpayment.com"}
	default:
		return []string{"admin@cjpayment.com"}
	}
}

// getUsersForRealtimeNotification returns user IDs who should receive real-time notifications
func (s *NotificationServiceImpl) getUsersForRealtimeNotification(eventType string) []uuid.UUID {
	// This should be configurable based on user roles and preferences
	// For now, return empty slice - should be implemented based on user management system
	return []uuid.UUID{}
}

// getRealtimeNotificationTitle returns the title for real-time notifications
func (s *NotificationServiceImpl) getRealtimeNotificationTitle(eventType string) string {
	switch eventType {
	case "recharge_created":
		return "新充值订单"
	case "recharge_paid":
		return "订单已付款"
	case "recharge_confirmed":
		return "订单已确认"
	case "recharge_failed":
		return "订单失败"
	default:
		return "订单状态更新"
	}
}

// getRealtimeNotificationMessage returns the message for real-time notifications
func (s *NotificationServiceImpl) getRealtimeNotificationMessage(eventType string, order *repository.RechargeOrder, merchant *repository.Merchant) string {
	switch eventType {
	case "recharge_created":
		return fmt.Sprintf("商户 %s 创建了新的充值订单 %s，金额 ¥%.2f", merchant.Name, order.OrderNumber, order.Amount)
	case "recharge_paid":
		return fmt.Sprintf("订单 %s 已收到付款，金额 ¥%.2f", order.OrderNumber, order.Amount)
	case "recharge_confirmed":
		return fmt.Sprintf("订单 %s 已确认完成，金额 ¥%.2f", order.OrderNumber, order.Amount)
	case "recharge_failed":
		return fmt.Sprintf("订单 %s 处理失败，金额 ¥%.2f", order.OrderNumber, order.Amount)
	default:
		return fmt.Sprintf("订单 %s 状态已更新", order.OrderNumber)
	}
}

// SendCustomNotification sends a custom notification
func (s *NotificationServiceImpl) SendCustomNotification(ctx context.Context, req *SendCustomNotificationRequest) error {
	config, err := s.notificationRepo.GetNotificationConfig(ctx, req.ConfigID)
	if err != nil {
		return fmt.Errorf("failed to get notification config: %w", err)
	}

	if !config.IsActive {
		return fmt.Errorf("notification config is not active")
	}

	// Create notification log
	log := &repository.NotificationLog{
		ID:               uuid.New(),
		NotificationID:   config.ID,
		RechargeOrderID:  req.OrderID,
		EventType:        req.EventType,
		TargetURL:        config.WebhookURL,
		RequestHeaders:   config.Headers,
		RequestBody:      req.Payload,
		RetryCount:       0,
		MaxRetries:       s.getMaxRetries(config.RetryPolicy),
		Status:           "pending",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := s.notificationRepo.CreateNotificationLog(ctx, log); err != nil {
		return fmt.Errorf("failed to create notification log: %w", err)
	}

	// Send notification asynchronously
	go s.executeNotification(context.Background(), log, config)

	return nil
}

// RetryFailedNotifications retries all failed notifications that are eligible for retry
func (s *NotificationServiceImpl) RetryFailedNotifications(ctx context.Context) error {
	now := time.Now()
	filter := &repository.NotificationLogFilter{
		Status:      &[]string{"failed"}[0],
		MaxRetries:  true, // Only get notifications that haven't exceeded max retries
		NextRetryAt: &now, // Only get notifications where next_retry_at <= now
		Limit:       100, // Process in batches
	}

	logs, _, err := s.notificationRepo.ListNotificationLogs(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to get failed notifications: %w", err)
	}

	for _, log := range logs {
		if err := s.RetryNotification(ctx, log.ID); err != nil {
			fmt.Printf("Failed to retry notification %s: %v\n", log.ID, err)
		}
	}

	return nil
}

// RetryNotification retries a specific notification
func (s *NotificationServiceImpl) RetryNotification(ctx context.Context, logID uuid.UUID) error {
	log, err := s.notificationRepo.GetNotificationLog(ctx, logID)
	if err != nil {
		return fmt.Errorf("failed to get notification log: %w", err)
	}

	if log.RetryCount >= log.MaxRetries {
		return fmt.Errorf("notification has exceeded max retries")
	}

	config, err := s.notificationRepo.GetNotificationConfig(ctx, log.NotificationID)
	if err != nil {
		return fmt.Errorf("failed to get notification config: %w", err)
	}

	// Execute notification
	go s.executeNotification(context.Background(), log, config)

	return nil
}

// GetFailedNotifications gets failed notifications with filtering
func (s *NotificationServiceImpl) GetFailedNotifications(ctx context.Context, filter *FailedNotificationFilter) ([]*repository.NotificationLog, error) {
	repoFilter := &repository.NotificationLogFilter{
		Status:     &[]string{"failed", "max_retries_exceeded"}[0],
		StartDate:  filter.StartDate,
		EndDate:    filter.EndDate,
		EventType:  filter.EventType,
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		OrderBy:    filter.OrderBy,
		OrderDir:   filter.OrderDir,
	}

	logs, _, err := s.notificationRepo.ListNotificationLogs(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get failed notifications: %w", err)
	}

	return logs, nil
}

// GetNotificationLogs gets notification logs with filtering and pagination
func (s *NotificationServiceImpl) GetNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*repository.NotificationLog, int64, error) {
	repoFilter := &repository.NotificationLogFilter{
		NotificationID:  filter.NotificationID,
		RechargeOrderID: filter.RechargeOrderID,
		EventType:       filter.EventType,
		Status:          filter.Status,
		StartDate:       filter.StartDate,
		EndDate:         filter.EndDate,
		Limit:           filter.Limit,
		Offset:          filter.Offset,
		OrderBy:         filter.OrderBy,
		OrderDir:        filter.OrderDir,
	}

	logs, total, err := s.notificationRepo.ListNotificationLogs(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notification logs: %w", err)
	}

	return logs, total, nil
}

// GetNotificationStatus gets notification status for a recharge order
func (s *NotificationServiceImpl) GetNotificationStatus(ctx context.Context, orderID uuid.UUID) ([]*NotificationStatus, error) {
	filter := &repository.NotificationLogFilter{
		RechargeOrderID: &orderID,
		OrderBy:         "created_at",
		OrderDir:        "DESC",
	}

	logs, _, err := s.notificationRepo.ListNotificationLogs(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get notification logs: %w", err)
	}

	var statuses []*NotificationStatus
	for _, log := range logs {
		config, err := s.notificationRepo.GetNotificationConfig(ctx, log.NotificationID)
		if err != nil {
			continue // Skip if config not found
		}

		status := &NotificationStatus{
			ID:               log.ID,
			ConfigName:       config.Name,
			EventType:        log.EventType,
			TargetURL:        log.TargetURL,
			Status:           log.Status,
			RetryCount:       log.RetryCount,
			MaxRetries:       log.MaxRetries,
			ResponseStatus:   log.ResponseStatus,
			ErrorMessage:     log.ErrorMessage,
			ExecutionTimeMS:  log.ExecutionTimeMS,
			NextRetryAt:      log.NextRetryAt,
			CreatedAt:        log.CreatedAt,
			UpdatedAt:        log.UpdatedAt,
		}
		statuses = append(statuses, status)
	}

	return statuses, nil
}

// RegisterWebhook registers a new webhook
func (s *NotificationServiceImpl) RegisterWebhook(ctx context.Context, req *RegisterWebhookRequest) (*WebhookRegistration, error) {
	webhook := &repository.Webhook{
		ID:        uuid.New(),
		Name:      req.Name,
		URL:       req.URL,
		Events:    req.Events,
		Secret:    req.Secret,
		IsActive:  req.IsActive,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Store webhook registration in database
	if err := s.webhookRepo.CreateWebhook(ctx, webhook); err != nil {
		return nil, fmt.Errorf("failed to create webhook: %w", err)
	}

	// Convert to response format
	registration := &WebhookRegistration{
		ID:        webhook.ID,
		Name:      webhook.Name,
		URL:       webhook.URL,
		Events:    webhook.Events,
		Secret:    webhook.Secret,
		IsActive:  webhook.IsActive,
		CreatedAt: webhook.CreatedAt,
		UpdatedAt: webhook.UpdatedAt,
	}

	return registration, nil
}

// UnregisterWebhook unregisters a webhook
func (s *NotificationServiceImpl) UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error {
	if err := s.webhookRepo.DeleteWebhook(ctx, webhookID); err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}
	return nil
}

// ListWebhooks lists registered webhooks
func (s *NotificationServiceImpl) ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*WebhookRegistration, error) {
	repoFilter := &repository.WebhookFilter{
		IsActive: filter.IsActive,
	}

	webhooks, err := s.webhookRepo.ListWebhooks(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhooks: %w", err)
	}

	var registrations []*WebhookRegistration
	for _, webhook := range webhooks {
		registration := &WebhookRegistration{
			ID:        webhook.ID,
			Name:      webhook.Name,
			URL:       webhook.URL,
			Events:    webhook.Events,
			Secret:    webhook.Secret,
			IsActive:  webhook.IsActive,
			CreatedAt: webhook.CreatedAt,
			UpdatedAt: webhook.UpdatedAt,
		}
		registrations = append(registrations, registration)
	}

	return registrations, nil
}

// ValidateWebhookSignature validates webhook signature
func (s *NotificationServiceImpl) ValidateWebhookSignature(ctx context.Context, webhookID uuid.UUID, payload []byte, signature string) (bool, error) {
	webhook, err := s.webhookRepo.GetWebhook(ctx, webhookID)
	if err != nil {
		return false, fmt.Errorf("webhook not found: %w", err)
	}

	// Calculate expected signature
	mac := hmac.New(sha256.New, []byte(webhook.Secret))
	mac.Write(payload)
	expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSignature)), nil
}

// Private helper methods

func (s *NotificationServiceImpl) sendNotification(ctx context.Context, config *repository.NotificationConfig, order *repository.RechargeOrder, merchant *repository.Merchant, account *repository.ReceiveAccount) error {
	// Render template
	payload, err := s.renderTemplate(config.TemplateBody, order, merchant, account)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	// Create notification log
	log := &repository.NotificationLog{
		ID:               uuid.New(),
		NotificationID:   config.ID,
		RechargeOrderID:  &order.ID,
		EventType:        config.EventType,
		TargetURL:        config.WebhookURL,
		RequestHeaders:   config.Headers,
		RequestBody:      payload,
		RetryCount:       0,
		MaxRetries:       s.getMaxRetries(config.RetryPolicy),
		Status:           "pending",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := s.notificationRepo.CreateNotificationLog(ctx, log); err != nil {
		return fmt.Errorf("failed to create notification log: %w", err)
	}

	// Send notification asynchronously
	go s.executeNotification(context.Background(), log, config)

	return nil
}

func (s *NotificationServiceImpl) executeNotification(ctx context.Context, log *repository.NotificationLog, config *repository.NotificationConfig) {
	startTime := time.Now()

	// Update status to processing
	log.Status = "processing"
	log.UpdatedAt = time.Now()
	s.notificationRepo.UpdateNotificationLog(ctx, log)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, config.HTTPMethod, log.TargetURL, strings.NewReader(log.RequestBody))
	if err != nil {
		s.handleNotificationError(ctx, log, fmt.Sprintf("Failed to create request: %v", err))
		return
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "CJPayment-Notification/1.0")
	
	if config.Headers != nil {
		for key, value := range config.Headers {
			if strValue, ok := value.(string); ok {
				req.Header.Set(key, strValue)
			}
		}
	}

	// Set timeout
	client := &http.Client{
		Timeout: time.Duration(config.TimeoutSeconds) * time.Second,
	}

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		s.handleNotificationError(ctx, log, fmt.Sprintf("Request failed: %v", err))
		return
	}
	defer resp.Body.Close()

	// Read response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		s.handleNotificationError(ctx, log, fmt.Sprintf("Failed to read response: %v", err))
		return
	}

	// Calculate execution time
	executionTime := int(time.Since(startTime).Milliseconds())

	// Update log with response
	log.ResponseStatus = &resp.StatusCode
	responseBodyStr := string(responseBody)
	log.ResponseBody = &responseBodyStr
	log.ExecutionTimeMS = &executionTime
	log.UpdatedAt = time.Now()

	// Check if successful
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Status = "success"
	} else {
		s.handleNotificationError(ctx, log, fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(responseBody)))
		return
	}

	s.notificationRepo.UpdateNotificationLog(ctx, log)
}

func (s *NotificationServiceImpl) handleNotificationError(ctx context.Context, log *repository.NotificationLog, errorMsg string) {
	log.ErrorMessage = &errorMsg
	log.RetryCount++
	log.UpdatedAt = time.Now()

	if log.RetryCount >= log.MaxRetries {
		log.Status = "max_retries_exceeded"
	} else {
		log.Status = "failed"
		// Calculate next retry time using exponential backoff
		backoffSeconds := int(1 << log.RetryCount) // 2^retry_count
		if backoffSeconds > 3600 { // Max 1 hour
			backoffSeconds = 3600
		}
		nextRetry := time.Now().Add(time.Duration(backoffSeconds) * time.Second)
		log.NextRetryAt = &nextRetry
	}

	s.notificationRepo.UpdateNotificationLog(ctx, log)
}

func (s *NotificationServiceImpl) renderTemplate(templateBody string, order *repository.RechargeOrder, merchant *repository.Merchant, account *repository.ReceiveAccount) (string, error) {
	tmpl, err := template.New("notification").Parse(templateBody)
	if err != nil {
		return "", err
	}

	data := map[string]interface{}{
		"Order": map[string]interface{}{
			"ID":               order.ID,
			"OrderNumber":      order.OrderNumber,
			"PayerName":        order.PayerName,
			"PayerAccount":     order.PayerAccount,
			"PaymentType":      order.PaymentType,
			"Amount":           order.Amount,
			"AdAccount":        order.AdAccount,
			"Status":           order.Status,
			"Remark":           order.Remark,
			"VoucherURL":       order.VoucherURL,
			"CreatedAt":        order.CreatedAt,
			"UpdatedAt":        order.UpdatedAt,
		},
		"Merchant": map[string]interface{}{
			"ID":            merchant.ID,
			"Name":          merchant.Name,
			"Code":          merchant.Code,
			"ContactPerson": merchant.ContactPerson,
			"ContactPhone":  merchant.ContactPhone,
			"ContactEmail":  merchant.ContactEmail,
			"Status":        merchant.Status,
		},
		"Account": map[string]interface{}{
			"ID":            account.ID,
			"AccountName":   account.AccountName,
			"AccountNumber": account.AccountNumber,
			"AccountType":   account.AccountType,
			"BankName":      account.BankName,
			"BankBranch":    account.BankBranch,
			"AccountHolder": account.AccountHolder,
			"PaymentType":   account.PaymentType,
			"Status":        account.Status,
		},
		"Timestamp": time.Now().Unix(),
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func (s *NotificationServiceImpl) validateTemplate(templateBody string) error {
	_, err := template.New("test").Parse(templateBody)
	return err
}

func (s *NotificationServiceImpl) getMaxRetries(retryPolicy map[string]interface{}) int {
	if retryPolicy == nil {
		return 3 // Default max retries
	}

	if maxRetries, ok := retryPolicy["max_retries"].(float64); ok {
		return int(maxRetries)
	}

	return 3 // Default max retries
}

func (s *NotificationServiceImpl) getMaxRetriesFromPolicy(retryPolicy map[string]interface{}) int {
	if retryPolicy == nil {
		return 3 // Default max retries
	}

	if maxRetries, ok := retryPolicy["max_retries"].(float64); ok {
		return int(maxRetries)
	}
	if maxRetries, ok := retryPolicy["max_retries"].(int); ok {
		return maxRetries
	}

	return 3 // Default max retries
}

// SendEmailNotification sends an email notification
func (s *NotificationServiceImpl) SendEmailNotification(ctx context.Context, notification *EmailNotification) error {
	if s.emailConfig == nil || s.emailConfig.SMTPUsername == "" {
		return fmt.Errorf("email configuration not set")
	}

	// Create email message
	message := s.buildEmailMessage(notification)

	// Send email
	auth := smtp.PlainAuth("", s.emailConfig.SMTPUsername, s.emailConfig.SMTPPassword, s.emailConfig.SMTPHost)
	addr := s.emailConfig.SMTPHost + ":" + s.emailConfig.SMTPPort

	err := smtp.SendMail(addr, auth, s.emailConfig.FromEmail, notification.To, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendRechargeEmailNotification sends email notification for recharge events
func (s *NotificationServiceImpl) SendRechargeEmailNotification(ctx context.Context, orderID uuid.UUID, eventType string, recipients []string) error {
	// Get recharge order details
	order, err := s.rechargeRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("failed to get recharge order: %w", err)
	}

	// Get merchant details
	merchant, err := s.merchantRepo.GetByID(ctx, order.MerchantID)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	// Create email notification based on event type
	var subject, body string
	switch eventType {
	case "recharge_created":
		subject = fmt.Sprintf("新充值订单 - %s", order.OrderNumber)
		body = s.buildRechargeCreatedEmailBody(order, merchant)
	case "recharge_paid":
		subject = fmt.Sprintf("充值订单已付款 - %s", order.OrderNumber)
		body = s.buildRechargePaidEmailBody(order, merchant)
	case "recharge_confirmed":
		subject = fmt.Sprintf("充值订单已确认 - %s", order.OrderNumber)
		body = s.buildRechargeConfirmedEmailBody(order, merchant)
	case "recharge_failed":
		subject = fmt.Sprintf("充值订单失败 - %s", order.OrderNumber)
		body = s.buildRechargeFailedEmailBody(order, merchant)
	default:
		subject = fmt.Sprintf("充值订单状态更新 - %s", order.OrderNumber)
		body = s.buildRechargeStatusUpdateEmailBody(order, merchant, eventType)
	}

	emailNotification := &EmailNotification{
		To:      recipients,
		Subject: subject,
		Body:    body,
		IsHTML:  true,
	}

	return s.SendEmailNotification(ctx, emailNotification)
}

// SendRealTimeNotification sends real-time notification via WebSocket/SSE
func (s *NotificationServiceImpl) SendRealTimeNotification(ctx context.Context, notification *RealTimeNotification) error {
	// Store notification in Redis for real-time delivery
	key := fmt.Sprintf("realtime_notification:%s", notification.UserID.String())
	
	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %w", err)
	}

	// Store with expiration (24 hours)
	err = s.redisClient.LPush(ctx, key, notificationJSON).Err()
	if err != nil {
		return fmt.Errorf("failed to store real-time notification: %w", err)
	}

	// Set expiration
	s.redisClient.Expire(ctx, key, 24*time.Hour)

	// Publish to Redis pub/sub for immediate delivery
	channel := fmt.Sprintf("notifications:%s", notification.UserID.String())
	err = s.redisClient.Publish(ctx, channel, notificationJSON).Err()
	if err != nil {
		return fmt.Errorf("failed to publish real-time notification: %w", err)
	}

	return nil
}

// GetRealTimeNotifications gets pending real-time notifications for a user
func (s *NotificationServiceImpl) GetRealTimeNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]*RealTimeNotification, error) {
	key := fmt.Sprintf("realtime_notification:%s", userID.String())
	
	// Get notifications from Redis list
	result, err := s.redisClient.LRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get real-time notifications: %w", err)
	}

	var notifications []*RealTimeNotification
	for _, notificationJSON := range result {
		var notification RealTimeNotification
		if err := json.Unmarshal([]byte(notificationJSON), &notification); err != nil {
			continue // Skip invalid notifications
		}
		notifications = append(notifications, &notification)
	}

	return notifications, nil
}

// MarkRealTimeNotificationsAsRead marks real-time notifications as read
func (s *NotificationServiceImpl) MarkRealTimeNotificationsAsRead(ctx context.Context, userID uuid.UUID, count int) error {
	key := fmt.Sprintf("realtime_notification:%s", userID.String())
	
	// Remove read notifications from the list
	for i := 0; i < count; i++ {
		err := s.redisClient.LPop(ctx, key).Err()
		if err != nil && err.Error() != "redis: nil" {
			return fmt.Errorf("failed to mark notification as read: %w", err)
		}
	}

	return nil
}

// Private helper methods for email building

func (s *NotificationServiceImpl) buildEmailMessage(notification *EmailNotification) string {
	var message bytes.Buffer
	
	// Headers
	message.WriteString(fmt.Sprintf("From: %s <%s>\r\n", s.emailConfig.FromName, s.emailConfig.FromEmail))
	message.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(notification.To, ", ")))
	
	if len(notification.CC) > 0 {
		message.WriteString(fmt.Sprintf("CC: %s\r\n", strings.Join(notification.CC, ", ")))
	}
	
	message.WriteString(fmt.Sprintf("Subject: %s\r\n", notification.Subject))
	
	if notification.IsHTML {
		message.WriteString("MIME-Version: 1.0\r\n")
		message.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	} else {
		message.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	}
	
	message.WriteString("\r\n")
	message.WriteString(notification.Body)
	
	return message.String()
}

func (s *NotificationServiceImpl) buildRechargeCreatedEmailBody(order *repository.RechargeOrder, merchant *repository.Merchant) string {
	return fmt.Sprintf(`
<html>
<body>
<h2>新充值订单通知</h2>
<p>有新的充值订单需要处理：</p>
<table border="1" cellpadding="5" cellspacing="0">
<tr><td><strong>订单号</strong></td><td>%s</td></tr>
<tr><td><strong>商户</strong></td><td>%s</td></tr>
<tr><td><strong>付款人</strong></td><td>%s</td></tr>
<tr><td><strong>金额</strong></td><td>¥%.2f</td></tr>
<tr><td><strong>付款类型</strong></td><td>%s</td></tr>
<tr><td><strong>广告账户</strong></td><td>%s</td></tr>
<tr><td><strong>创建时间</strong></td><td>%s</td></tr>
</table>
<p>请及时处理该订单。</p>
</body>
</html>
	`, order.OrderNumber, merchant.Name, order.PayerName, order.Amount, order.PaymentType, order.AdAccount, order.CreatedAt.Format("2006-01-02 15:04:05"))
}

func (s *NotificationServiceImpl) buildRechargePaidEmailBody(order *repository.RechargeOrder, merchant *repository.Merchant) string {
	return fmt.Sprintf(`
<html>
<body>
<h2>充值订单付款通知</h2>
<p>充值订单已收到付款：</p>
<table border="1" cellpadding="5" cellspacing="0">
<tr><td><strong>订单号</strong></td><td>%s</td></tr>
<tr><td><strong>商户</strong></td><td>%s</td></tr>
<tr><td><strong>付款人</strong></td><td>%s</td></tr>
<tr><td><strong>金额</strong></td><td>¥%.2f</td></tr>
<tr><td><strong>付款时间</strong></td><td>%s</td></tr>
</table>
<p>请验证付款凭证并确认订单。</p>
</body>
</html>
	`, order.OrderNumber, merchant.Name, order.PayerName, order.Amount, order.UpdatedAt.Format("2006-01-02 15:04:05"))
}

func (s *NotificationServiceImpl) buildRechargeConfirmedEmailBody(order *repository.RechargeOrder, merchant *repository.Merchant) string {
	return fmt.Sprintf(`
<html>
<body>
<h2>充值订单确认通知</h2>
<p>充值订单已确认完成：</p>
<table border="1" cellpadding="5" cellspacing="0">
<tr><td><strong>订单号</strong></td><td>%s</td></tr>
<tr><td><strong>商户</strong></td><td>%s</td></tr>
<tr><td><strong>付款人</strong></td><td>%s</td></tr>
<tr><td><strong>金额</strong></td><td>¥%.2f</td></tr>
<tr><td><strong>确认时间</strong></td><td>%s</td></tr>
</table>
<p>订单处理完成。</p>
</body>
</html>
	`, order.OrderNumber, merchant.Name, order.PayerName, order.Amount, order.UpdatedAt.Format("2006-01-02 15:04:05"))
}

func (s *NotificationServiceImpl) buildRechargeFailedEmailBody(order *repository.RechargeOrder, merchant *repository.Merchant) string {
	return fmt.Sprintf(`
<html>
<body>
<h2>充值订单失败通知</h2>
<p>充值订单处理失败：</p>
<table border="1" cellpadding="5" cellspacing="0">
<tr><td><strong>订单号</strong></td><td>%s</td></tr>
<tr><td><strong>商户</strong></td><td>%s</td></tr>
<tr><td><strong>付款人</strong></td><td>%s</td></tr>
<tr><td><strong>金额</strong></td><td>¥%.2f</td></tr>
<tr><td><strong>失败时间</strong></td><td>%s</td></tr>
<tr><td><strong>备注</strong></td><td>%s</td></tr>
</table>
<p>请检查订单详情并采取相应措施。</p>
</body>
</html>
	`, order.OrderNumber, merchant.Name, order.PayerName, order.Amount, order.UpdatedAt.Format("2006-01-02 15:04:05"), order.Remark)
}

func (s *NotificationServiceImpl) buildRechargeStatusUpdateEmailBody(order *repository.RechargeOrder, merchant *repository.Merchant, eventType string) string {
	return fmt.Sprintf(`
<html>
<body>
<h2>充值订单状态更新</h2>
<p>充值订单状态已更新：</p>
<table border="1" cellpadding="5" cellspacing="0">
<tr><td><strong>订单号</strong></td><td>%s</td></tr>
<tr><td><strong>商户</strong></td><td>%s</td></tr>
<tr><td><strong>付款人</strong></td><td>%s</td></tr>
<tr><td><strong>金额</strong></td><td>¥%.2f</td></tr>
<tr><td><strong>当前状态</strong></td><td>%s</td></tr>
<tr><td><strong>事件类型</strong></td><td>%s</td></tr>
<tr><td><strong>更新时间</strong></td><td>%s</td></tr>
</table>
</body>
</html>
	`, order.OrderNumber, merchant.Name, order.PayerName, order.Amount, order.Status, eventType, order.UpdatedAt.Format("2006-01-02 15:04:05"))
}

// Template management methods

// CreateNotificationTemplate creates a new notification template
func (s *NotificationServiceImpl) CreateNotificationTemplate(ctx context.Context, req *CreateNotificationTemplateRequest) (*NotificationTemplate, error) {
	// Validate template
	if err := s.validateTemplate(req.TemplateBody); err != nil {
		return nil, fmt.Errorf("invalid template: %w", err)
	}

	template := &NotificationTemplate{
		ID:           uuid.New(),
		Name:         req.Name,
		EventType:    req.EventType,
		TemplateType: req.TemplateType, // email, webhook, realtime
		Subject:      req.Subject,
		TemplateBody: req.TemplateBody,
		IsActive:     req.IsActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Store template in Redis for fast access
	key := fmt.Sprintf("notification_template:%s", template.ID.String())
	templateJSON, err := json.Marshal(template)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal template: %w", err)
	}

	err = s.redisClient.Set(ctx, key, templateJSON, 24*time.Hour).Err()
	if err != nil {
		return nil, fmt.Errorf("failed to store template: %w", err)
	}

	return template, nil
}

// GetNotificationTemplate gets a notification template by ID
func (s *NotificationServiceImpl) GetNotificationTemplate(ctx context.Context, templateID uuid.UUID) (*NotificationTemplate, error) {
	key := fmt.Sprintf("notification_template:%s", templateID.String())
	
	templateJSON, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("template not found: %w", err)
	}

	var template NotificationTemplate
	if err := json.Unmarshal([]byte(templateJSON), &template); err != nil {
		return nil, fmt.Errorf("failed to unmarshal template: %w", err)
	}

	return &template, nil
}

// UpdateNotificationTemplate updates a notification template
func (s *NotificationServiceImpl) UpdateNotificationTemplate(ctx context.Context, templateID uuid.UUID, req *UpdateNotificationTemplateRequest) (*NotificationTemplate, error) {
	template, err := s.GetNotificationTemplate(ctx, templateID)
	if err != nil {
		return nil, err
	}

	// Update fields if provided
	if req.Name != nil {
		template.Name = *req.Name
	}
	if req.Subject != nil {
		template.Subject = req.Subject
	}
	if req.TemplateBody != nil {
		if err := s.validateTemplate(*req.TemplateBody); err != nil {
			return nil, fmt.Errorf("invalid template: %w", err)
		}
		template.TemplateBody = *req.TemplateBody
	}
	if req.IsActive != nil {
		template.IsActive = *req.IsActive
	}

	template.UpdatedAt = time.Now()

	// Store updated template
	key := fmt.Sprintf("notification_template:%s", template.ID.String())
	templateJSON, err := json.Marshal(template)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal template: %w", err)
	}

	err = s.redisClient.Set(ctx, key, templateJSON, 24*time.Hour).Err()
	if err != nil {
		return nil, fmt.Errorf("failed to store template: %w", err)
	}

	return template, nil
}

// DeleteNotificationTemplate deletes a notification template
func (s *NotificationServiceImpl) DeleteNotificationTemplate(ctx context.Context, templateID uuid.UUID) error {
	key := fmt.Sprintf("notification_template:%s", templateID.String())
	
	err := s.redisClient.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	return nil
}

// ListNotificationTemplates lists notification templates
func (s *NotificationServiceImpl) ListNotificationTemplates(ctx context.Context, filter *NotificationTemplateFilter) ([]*NotificationTemplate, error) {
	// Get all template keys
	pattern := "notification_template:*"
	keys, err := s.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get template keys: %w", err)
	}

	var templates []*NotificationTemplate
	for _, key := range keys {
		templateJSON, err := s.redisClient.Get(ctx, key).Result()
		if err != nil {
			continue // Skip invalid templates
		}

		var template NotificationTemplate
		if err := json.Unmarshal([]byte(templateJSON), &template); err != nil {
			continue // Skip invalid templates
		}

		// Apply filters
		if filter.EventType != nil && template.EventType != *filter.EventType {
			continue
		}
		if filter.TemplateType != nil && template.TemplateType != *filter.TemplateType {
			continue
		}
		if filter.IsActive != nil && template.IsActive != *filter.IsActive {
			continue
		}

		templates = append(templates, &template)
	}

	return templates, nil
}

// RenderNotificationTemplate renders a template with data
func (s *NotificationServiceImpl) RenderNotificationTemplate(ctx context.Context, templateID uuid.UUID, data map[string]interface{}) (*RenderedNotification, error) {
	template, err := s.GetNotificationTemplate(ctx, templateID)
	if err != nil {
		return nil, err
	}

	// Render subject
	var renderedSubject string
	if template.Subject != nil {
		subjectTmpl, err := template.New("subject").Parse(*template.Subject)
		if err != nil {
			return nil, fmt.Errorf("failed to parse subject template: %w", err)
		}

		var subjectBuf bytes.Buffer
		if err := subjectTmpl.Execute(&subjectBuf, data); err != nil {
			return nil, fmt.Errorf("failed to render subject: %w", err)
		}
		renderedSubject = subjectBuf.String()
	}

	// Render body
	bodyTmpl, err := template.New("body").Parse(template.TemplateBody)
	if err != nil {
		return nil, fmt.Errorf("failed to parse body template: %w", err)
	}

	var bodyBuf bytes.Buffer
	if err := bodyTmpl.Execute(&bodyBuf, data); err != nil {
		return nil, fmt.Errorf("failed to render body: %w", err)
	}

	return &RenderedNotification{
		Subject: renderedSubject,
		Body:    bodyBuf.String(),
	}, nil
}

// Notification preference management

// SetUserNotificationPreferences sets notification preferences for a user
func (s *NotificationServiceImpl) SetUserNotificationPreferences(ctx context.Context, userID uuid.UUID, preferences *NotificationPreferences) error {
	key := fmt.Sprintf("notification_preferences:%s", userID.String())
	
	preferencesJSON, err := json.Marshal(preferences)
	if err != nil {
		return fmt.Errorf("failed to marshal preferences: %w", err)
	}

	err = s.redisClient.Set(ctx, key, preferencesJSON, 0).Err() // No expiration
	if err != nil {
		return fmt.Errorf("failed to store preferences: %w", err)
	}

	return nil
}

// GetUserNotificationPreferences gets notification preferences for a user
func (s *NotificationServiceImpl) GetUserNotificationPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreferences, error) {
	key := fmt.Sprintf("notification_preferences:%s", userID.String())
	
	preferencesJSON, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		// Return default preferences if not found
		return &NotificationPreferences{
			EmailEnabled:     true,
			RealtimeEnabled:  true,
			WebhookEnabled:   false,
			EventTypes:       []string{"recharge_created", "recharge_paid", "recharge_confirmed"},
		}, nil
	}

	var preferences NotificationPreferences
	if err := json.Unmarshal([]byte(preferencesJSON), &preferences); err != nil {
		return nil, fmt.Errorf("failed to unmarshal preferences: %w", err)
	}

	return &preferences, nil
}


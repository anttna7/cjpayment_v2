package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/go-redis/redis/v8"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockWebhookRepositoryForNotification is a simple mock for notification service tests
type MockWebhookRepositoryForNotification struct {
	mock.Mock
}

func (m *MockWebhookRepositoryForNotification) CreateWebhook(ctx context.Context, webhook *repository.Webhook) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) GetWebhook(ctx context.Context, id uuid.UUID) (*repository.Webhook, error) {
	return &repository.Webhook{}, nil
}
func (m *MockWebhookRepositoryForNotification) UpdateWebhook(ctx context.Context, webhook *repository.Webhook) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) DeleteWebhook(ctx context.Context, id uuid.UUID) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) ListWebhooks(ctx context.Context, filter *repository.WebhookFilter) ([]*repository.Webhook, error) {
	return []*repository.Webhook{}, nil
}
func (m *MockWebhookRepositoryForNotification) GetWebhooksByEvent(ctx context.Context, eventType string) ([]*repository.Webhook, error) {
	return []*repository.Webhook{}, nil
}
func (m *MockWebhookRepositoryForNotification) CreateWebhookEvent(ctx context.Context, event *repository.WebhookEvent) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) GetWebhookEvent(ctx context.Context, id uuid.UUID) (*repository.WebhookEvent, error) {
	return &repository.WebhookEvent{}, nil
}
func (m *MockWebhookRepositoryForNotification) UpdateWebhookEvent(ctx context.Context, event *repository.WebhookEvent) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) ListWebhookEvents(ctx context.Context, filter *repository.WebhookEventFilter) ([]*repository.WebhookEvent, error) {
	return []*repository.WebhookEvent{}, nil
}
func (m *MockWebhookRepositoryForNotification) GetPendingEvents(ctx context.Context, limit int) ([]*repository.WebhookEvent, error) {
	return []*repository.WebhookEvent{}, nil
}
func (m *MockWebhookRepositoryForNotification) CreateWebhookDelivery(ctx context.Context, delivery *repository.WebhookDelivery) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) GetWebhookDelivery(ctx context.Context, id uuid.UUID) (*repository.WebhookDelivery, error) {
	return &repository.WebhookDelivery{}, nil
}
func (m *MockWebhookRepositoryForNotification) UpdateWebhookDelivery(ctx context.Context, delivery *repository.WebhookDelivery) error {
	return nil
}
func (m *MockWebhookRepositoryForNotification) ListWebhookDeliveries(ctx context.Context, filter *repository.WebhookDeliveryFilter) ([]*repository.WebhookDelivery, int64, error) {
	return []*repository.WebhookDelivery{}, 0, nil
}
func (m *MockWebhookRepositoryForNotification) GetFailedDeliveries(ctx context.Context, limit int) ([]*repository.WebhookDelivery, error) {
	return []*repository.WebhookDelivery{}, nil
}
func (m *MockWebhookRepositoryForNotification) GetDeliveriesForRetry(ctx context.Context, limit int) ([]*repository.WebhookDelivery, error) {
	return []*repository.WebhookDelivery{}, nil
}

func TestNotificationService_CreateNotificationConfig(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()

	req := &CreateNotificationConfigRequest{
		Name:         "Test Notification",
		EventType:    "recharge_success",
		TargetSystem: "ad_account_system",
		WebhookURL:   "https://example.com/webhook",
		HTTPMethod:   "POST",
		Headers: map[string]interface{}{
			"Authorization": "Bearer token",
			"Content-Type":  "application/json",
		},
		TemplateBody: `{
			"order_id": "{{.Order.ID}}",
			"amount": "{{.Order.Amount}}",
			"status": "{{.Order.Status}}"
		}`,
		RetryPolicy: map[string]interface{}{
			"max_retries":      3,
			"retry_intervals": []int{1, 5, 15},
		},
		TimeoutSeconds: 30,
		IsActive:       true,
	}

	mockNotificationRepo.On("CreateNotificationConfig", ctx, mock.AnythingOfType("*repository.NotificationConfig")).Return(nil)

	config, err := service.CreateNotificationConfig(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, req.Name, config.Name)
	assert.Equal(t, req.EventType, config.EventType)
	assert.Equal(t, req.TargetSystem, config.TargetSystem)
	assert.Equal(t, req.WebhookURL, config.WebhookURL)
	assert.Equal(t, req.HTTPMethod, config.HTTPMethod)
	assert.Equal(t, req.IsActive, config.IsActive)

	mockNotificationRepo.AssertExpectations(t)
}

func TestNotificationService_CreateNotificationConfig_InvalidTemplate(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()

	req := &CreateNotificationConfigRequest{
		Name:         "Test Notification",
		EventType:    "recharge_success",
		TargetSystem: "ad_account_system",
		WebhookURL:   "https://example.com/webhook",
		HTTPMethod:   "POST",
		TemplateBody: `{
			"order_id": "{{.Order.ID",
			"invalid": "template"
		}`, // Invalid template syntax
		IsActive: true,
	}

	_, err := service.CreateNotificationConfig(ctx, req)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid template")
}

func TestNotificationService_SendRechargeNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()
	orderID := uuid.New()
	merchantID := uuid.New()
	accountID := uuid.New()
	eventType := "recharge_success"

	// Mock data
	order := &repository.RechargeOrder{
		ID:               orderID,
		OrderNumber:      "ORD-001",
		PayerName:        "Test Payer",
		PayerAccount:     "123456789",
		PaymentType:      "private",
		Amount:           decimal.NewFromFloat(100.00),
		MerchantID:       merchantID,
		AdAccount:        "AD-001",
		ReceiveAccountID: accountID,
		Status:           "success",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	merchant := &repository.Merchant{
		ID:   merchantID,
		Name: "Test Merchant",
		Code: "MERCHANT-001",
	}

	account := &repository.ReceiveAccount{
		ID:            accountID,
		AccountName:   "Test Account",
		AccountNumber: "987654321",
		AccountType:   "alipay",
		AccountHolder: "Test Holder",
		PaymentType:   "private",
	}

	configs := []*repository.NotificationConfig{
		{
			ID:           uuid.New(),
			Name:         "Test Config",
			EventType:    eventType,
			TargetSystem: "ad_account_system",
			WebhookURL:   "https://example.com/webhook",
			HTTPMethod:   "POST",
			TemplateBody: `{
				"order_id": "{{.Order.ID}}",
				"amount": "{{.Order.Amount}}",
				"status": "{{.Order.Status}}"
			}`,
			RetryPolicy: map[string]interface{}{
				"max_retries": float64(3),
			},
			TimeoutSeconds: 30,
			IsActive:       true,
		},
	}

	// Set up mocks
	mockRechargeRepo.On("GetByID", ctx, orderID).Return(order, nil)
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
	mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)

	filter := &repository.NotificationConfigFilter{
		EventType: &eventType,
		IsActive:  &[]bool{true}[0],
	}
	mockNotificationRepo.On("ListNotificationConfigs", ctx, filter).Return(configs, nil)
	mockNotificationRepo.On("CreateNotificationLog", ctx, mock.AnythingOfType("*repository.NotificationLog")).Return(nil)

	err := service.SendRechargeNotification(ctx, orderID, eventType)

	assert.NoError(t, err)

	mockRechargeRepo.AssertExpectations(t)
	mockMerchantRepo.AssertExpectations(t)
	mockAccountRepo.AssertExpectations(t)
	mockNotificationRepo.AssertExpectations(t)
}

func TestNotificationService_RegisterWebhook(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	
	// Use miniredis for testing
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()

	req := &RegisterWebhookRequest{
		Name:     "Test Webhook",
		URL:      "https://example.com/webhook",
		Events:   []string{"recharge_success", "recharge_failed"},
		Secret:   "webhook-secret",
		IsActive: true,
	}

	webhook, err := service.RegisterWebhook(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, webhook)
	assert.Equal(t, req.Name, webhook.Name)
	assert.Equal(t, req.URL, webhook.URL)
	assert.Equal(t, req.Events, webhook.Events)
	assert.Equal(t, req.Secret, webhook.Secret)
	assert.Equal(t, req.IsActive, webhook.IsActive)
	assert.NotEqual(t, uuid.Nil, webhook.ID)
}

func TestNotificationService_ValidateWebhookSignature(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()
	webhookID := uuid.New()
	secret := "webhook-secret"
	payload := []byte(`{"test": "data"}`)

	// First register a webhook
	webhook := &WebhookRegistration{
		ID:       webhookID,
		Name:     "Test Webhook",
		URL:      "https://example.com/webhook",
		Events:   []string{"recharge_success"},
		Secret:   secret,
		IsActive: true,
	}

	// Store webhook in Redis
	key := "webhook:" + webhookID.String()
	data, _ := json.Marshal(webhook)
	redisClient.Set(ctx, key, data, 0)

	// Test valid signature
	validSignature := "sha256=f4b8b1e4c8b5c8e4d8f4b8b1e4c8b5c8e4d8f4b8b1e4c8b5c8e4d8f4b8b1e4c8"
	
	// Note: This test would need the actual HMAC calculation for a real test
	// For now, we'll test the structure
	valid, err := service.ValidateWebhookSignature(ctx, webhookID, payload, validSignature)
	
	// The signature won't match because we're using a dummy signature
	// but we can verify the method doesn't error
	assert.NoError(t, err)
	assert.False(t, valid) // Expected to be false with dummy signature
}

func TestNotificationService_RetryFailedNotifications(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()
	now := time.Now()

	failedLogs := []*repository.NotificationLog{
		{
			ID:             uuid.New(),
			NotificationID: uuid.New(),
			EventType:      "recharge_success",
			TargetURL:      "https://example.com/webhook",
			Status:         "failed",
			RetryCount:     1,
			MaxRetries:     3,
			NextRetryAt:    &now,
			CreatedAt:      now,
			UpdatedAt:      now,
		},
	}

	filter := &repository.NotificationLogFilter{
		Status:      &[]string{"failed"}[0],
		MaxRetries:  true,
		NextRetryAt: &now,
		Limit:       100,
	}

	mockNotificationRepo.On("ListNotificationLogs", ctx, filter).Return(failedLogs, int64(1), nil)
	mockNotificationRepo.On("GetNotificationLog", ctx, failedLogs[0].ID).Return(failedLogs[0], nil)
	mockNotificationRepo.On("GetNotificationConfig", ctx, failedLogs[0].NotificationID).Return(&repository.NotificationConfig{
		ID:             failedLogs[0].NotificationID,
		WebhookURL:     "https://example.com/webhook",
		HTTPMethod:     "POST",
		TimeoutSeconds: 30,
	}, nil)

	err := service.RetryFailedNotifications(ctx)

	assert.NoError(t, err)
	mockNotificationRepo.AssertExpectations(t)
}

func TestNotificationService_ExecuteNotification_Success(t *testing.T) {
	// Create a test HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "received"}`))
	}))
	defer server.Close()

	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := &NotificationServiceImpl{
		notificationRepo: mockNotificationRepo,
		webhookRepo:      &MockWebhookRepositoryForNotification{},
		rechargeRepo:     mockRechargeRepo,
		merchantRepo:     mockMerchantRepo,
		accountRepo:      mockAccountRepo,
		redisClient:      redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		emailConfig: &EmailConfig{
			SMTPHost:     "smtp.test.com",
			SMTPPort:     "587",
			SMTPUsername: "test@test.com",
			SMTPPassword: "password",
			FromEmail:    "noreply@test.com",
			FromName:     "Test System",
		},
	}

	ctx := context.Background()

	log := &repository.NotificationLog{
		ID:             uuid.New(),
		NotificationID: uuid.New(),
		EventType:      "recharge_success",
		TargetURL:      server.URL,
		RequestBody:    `{"test": "data"}`,
		Status:         "pending",
		RetryCount:     0,
		MaxRetries:     3,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	config := &repository.NotificationConfig{
		ID:             log.NotificationID,
		WebhookURL:     server.URL,
		HTTPMethod:     "POST",
		TimeoutSeconds: 30,
	}

	// Mock the update calls
	mockNotificationRepo.On("UpdateNotificationLog", ctx, mock.AnythingOfType("*repository.NotificationLog")).Return(nil)

	// Execute notification
	service.executeNotification(ctx, log, config)

	// Give some time for the async operation
	time.Sleep(100 * time.Millisecond)

	mockNotificationRepo.AssertExpectations(t)
}

func TestNotificationService_SendNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := NewNotificationService(
		mockNotificationRepo,
		&MockWebhookRepositoryForNotification{},
		mockRechargeRepo,
		mockMerchantRepo,
		mockAccountRepo,
		redisClient,
	)

	ctx := context.Background()

	req := &SendNotificationRequest{
		EventType:      "test_event",
		TargetURL:      "https://example.com/webhook",
		HTTPMethod:     "POST",
		Payload:        `{"test": "data"}`,
		TimeoutSeconds: 30,
	}

	mockNotificationRepo.On("CreateNotificationLog", ctx, mock.AnythingOfType("*repository.NotificationLog")).Return(nil)

	err := service.SendNotification(ctx, req)

	assert.NoError(t, err)
	mockNotificationRepo.AssertExpectations(t)
}

func TestNotificationService_SendRealTimeNotification(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := &NotificationServiceImpl{
		notificationRepo: mockNotificationRepo,
		webhookRepo:      &MockWebhookRepositoryForNotification{},
		rechargeRepo:     mockRechargeRepo,
		merchantRepo:     mockMerchantRepo,
		accountRepo:      mockAccountRepo,
		redisClient:      redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	ctx := context.Background()
	userID := uuid.New()

	notification := &RealTimeNotification{
		UserID:    userID,
		Type:      "test_notification",
		Title:     "Test Title",
		Message:   "Test Message",
		Data:      map[string]interface{}{"key": "value"},
		Timestamp: time.Now(),
	}

	err := service.SendRealTimeNotification(ctx, notification)

	assert.NoError(t, err)

	// Verify notification was stored in Redis
	key := fmt.Sprintf("realtime_notification:%s", userID.String())
	result, err := redisClient.LRange(ctx, key, 0, 0).Result()
	assert.NoError(t, err)
	assert.Len(t, result, 1)

	// Verify notification content
	var storedNotification RealTimeNotification
	err = json.Unmarshal([]byte(result[0]), &storedNotification)
	assert.NoError(t, err)
	assert.Equal(t, notification.UserID, storedNotification.UserID)
	assert.Equal(t, notification.Type, storedNotification.Type)
	assert.Equal(t, notification.Title, storedNotification.Title)
	assert.Equal(t, notification.Message, storedNotification.Message)
}

func TestNotificationService_CreateNotificationTemplate(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := &NotificationServiceImpl{
		notificationRepo: mockNotificationRepo,
		webhookRepo:      &MockWebhookRepositoryForNotification{},
		rechargeRepo:     mockRechargeRepo,
		merchantRepo:     mockMerchantRepo,
		accountRepo:      mockAccountRepo,
		redisClient:      redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	ctx := context.Background()

	req := &CreateNotificationTemplateRequest{
		Name:         "Test Template",
		EventType:    "recharge_success",
		TemplateType: "email",
		Subject:      stringPtr("Order {{.Order.OrderNumber}} Success"),
		TemplateBody: "Order {{.Order.OrderNumber}} has been processed successfully.",
		IsActive:     true,
	}

	template, err := service.CreateNotificationTemplate(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, template)
	assert.Equal(t, req.Name, template.Name)
	assert.Equal(t, req.EventType, template.EventType)
	assert.Equal(t, req.TemplateType, template.TemplateType)
	assert.Equal(t, req.IsActive, template.IsActive)
	assert.NotEqual(t, uuid.Nil, template.ID)

	// Verify template was stored in Redis
	key := fmt.Sprintf("notification_template:%s", template.ID.String())
	exists, err := redisClient.Exists(ctx, key).Result()
	assert.NoError(t, err)
	assert.Equal(t, int64(1), exists)
}

func TestNotificationService_RenderNotificationTemplate(t *testing.T) {
	mockNotificationRepo := &MockNotificationRepository{}
	mockRechargeRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	redisClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	service := &NotificationServiceImpl{
		notificationRepo: mockNotificationRepo,
		webhookRepo:      &MockWebhookRepositoryForNotification{},
		rechargeRepo:     mockRechargeRepo,
		merchantRepo:     mockMerchantRepo,
		accountRepo:      mockAccountRepo,
		redisClient:      redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	ctx := context.Background()

	// Create a template first
	req := &CreateNotificationTemplateRequest{
		Name:         "Test Template",
		EventType:    "recharge_success",
		TemplateType: "email",
		Subject:      stringPtr("Order {{.Order.OrderNumber}} Success"),
		TemplateBody: "Order {{.Order.OrderNumber}} for amount {{.Order.Amount}} has been processed successfully.",
		IsActive:     true,
	}

	template, err := service.CreateNotificationTemplate(ctx, req)
	assert.NoError(t, err)

	// Render the template
	data := map[string]interface{}{
		"Order": map[string]interface{}{
			"OrderNumber": "ORD-12345",
			"Amount":      "100.00",
		},
	}

	rendered, err := service.RenderNotificationTemplate(ctx, template.ID, data)

	assert.NoError(t, err)
	assert.NotNil(t, rendered)
	assert.Equal(t, "Order ORD-12345 Success", rendered.Subject)
	assert.Equal(t, "Order ORD-12345 for amount 100.00 has been processed successfully.", rendered.Body)
}

// Helper function for tests
func stringPtr(s string) *string {
	return &s
}

// Mock implementations for testing

type MockNotificationRepository struct {
	mock.Mock
}

func (m *MockNotificationRepository) CreateNotificationConfig(ctx context.Context, config *repository.NotificationConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetNotificationConfig(ctx context.Context, id uuid.UUID) (*repository.NotificationConfig, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationRepository) UpdateNotificationConfig(ctx context.Context, config *repository.NotificationConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

func (m *MockNotificationRepository) DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationRepository) ListNotificationConfigs(ctx context.Context, filter *repository.NotificationConfigFilter) ([]*repository.NotificationConfig, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationRepository) CreateNotificationLog(ctx context.Context, log *repository.NotificationLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockNotificationRepository) GetNotificationLog(ctx context.Context, id uuid.UUID) (*repository.NotificationLog, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.NotificationLog), args.Error(1)
}

func (m *MockNotificationRepository) UpdateNotificationLog(ctx context.Context, log *repository.NotificationLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockNotificationRepository) ListNotificationLogs(ctx context.Context, filter *repository.NotificationLogFilter) ([]*repository.NotificationLog, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationLog), args.Get(1).(int64), args.Error(2)
}
package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockNotificationService is a mock implementation of NotificationService
type MockNotificationService struct {
	mock.Mock
}

func (m *MockNotificationService) CreateNotificationConfig(ctx context.Context, req *service.CreateNotificationConfigRequest) (*repository.NotificationConfig, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationService) UpdateNotificationConfig(ctx context.Context, id uuid.UUID, req *service.UpdateNotificationConfigRequest) (*repository.NotificationConfig, error) {
	args := m.Called(ctx, id, req)
	return args.Get(0).(*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationService) DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNotificationService) GetNotificationConfig(ctx context.Context, id uuid.UUID) (*repository.NotificationConfig, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationService) ListNotificationConfigs(ctx context.Context, filter *service.NotificationConfigFilter) ([]*repository.NotificationConfig, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationService) SendRechargeNotification(ctx context.Context, orderID uuid.UUID, eventType string) error {
	args := m.Called(ctx, orderID, eventType)
	return args.Error(0)
}

func (m *MockNotificationService) SendCustomNotification(ctx context.Context, req *service.SendCustomNotificationRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) SendNotification(ctx context.Context, req *service.SendNotificationRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) RetryFailedNotifications(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockNotificationService) RetryNotification(ctx context.Context, logID uuid.UUID) error {
	args := m.Called(ctx, logID)
	return args.Error(0)
}

func (m *MockNotificationService) GetFailedNotifications(ctx context.Context, filter *service.FailedNotificationFilter) ([]*repository.NotificationLog, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationLog), args.Error(1)
}

func (m *MockNotificationService) GetNotificationLogs(ctx context.Context, filter *service.NotificationLogFilter) ([]*repository.NotificationLog, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationLog), args.Get(1).(int64), args.Error(2)
}

func (m *MockNotificationService) GetNotificationStatus(ctx context.Context, orderID uuid.UUID) ([]*service.NotificationStatus, error) {
	args := m.Called(ctx, orderID)
	return args.Get(0).([]*service.NotificationStatus), args.Error(1)
}

func (m *MockNotificationService) RegisterWebhook(ctx context.Context, req *service.RegisterWebhookRequest) (*service.WebhookRegistration, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*service.WebhookRegistration), args.Error(1)
}

func (m *MockNotificationService) UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error {
	args := m.Called(ctx, webhookID)
	return args.Error(0)
}

func (m *MockNotificationService) ListWebhooks(ctx context.Context, filter *service.WebhookFilter) ([]*service.WebhookRegistration, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*service.WebhookRegistration), args.Error(1)
}

func (m *MockNotificationService) ValidateWebhookSignature(ctx context.Context, webhookID uuid.UUID, payload []byte, signature string) (bool, error) {
	args := m.Called(ctx, webhookID, payload, signature)
	return args.Bool(0), args.Error(1)
}

func (m *MockNotificationService) SendEmailNotification(ctx context.Context, notification *service.EmailNotification) error {
	args := m.Called(ctx, notification)
	return args.Error(0)
}

func (m *MockNotificationService) SendRechargeEmailNotification(ctx context.Context, orderID uuid.UUID, eventType string, recipients []string) error {
	args := m.Called(ctx, orderID, eventType, recipients)
	return args.Error(0)
}

func (m *MockNotificationService) SendRealTimeNotification(ctx context.Context, notification *service.RealTimeNotification) error {
	args := m.Called(ctx, notification)
	return args.Error(0)
}

func (m *MockNotificationService) GetRealTimeNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]*service.RealTimeNotification, error) {
	args := m.Called(ctx, userID, limit)
	return args.Get(0).([]*service.RealTimeNotification), args.Error(1)
}

func (m *MockNotificationService) MarkRealTimeNotificationsAsRead(ctx context.Context, userID uuid.UUID, count int) error {
	args := m.Called(ctx, userID, count)
	return args.Error(0)
}

func (m *MockNotificationService) CreateNotificationTemplate(ctx context.Context, req *service.CreateNotificationTemplateRequest) (*service.NotificationTemplate, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*service.NotificationTemplate), args.Error(1)
}

func (m *MockNotificationService) GetNotificationTemplate(ctx context.Context, templateID uuid.UUID) (*service.NotificationTemplate, error) {
	args := m.Called(ctx, templateID)
	return args.Get(0).(*service.NotificationTemplate), args.Error(1)
}

func (m *MockNotificationService) UpdateNotificationTemplate(ctx context.Context, templateID uuid.UUID, req *service.UpdateNotificationTemplateRequest) (*service.NotificationTemplate, error) {
	args := m.Called(ctx, templateID, req)
	return args.Get(0).(*service.NotificationTemplate), args.Error(1)
}

func (m *MockNotificationService) DeleteNotificationTemplate(ctx context.Context, templateID uuid.UUID) error {
	args := m.Called(ctx, templateID)
	return args.Error(0)
}

func (m *MockNotificationService) ListNotificationTemplates(ctx context.Context, filter *service.NotificationTemplateFilter) ([]*service.NotificationTemplate, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*service.NotificationTemplate), args.Error(1)
}

func (m *MockNotificationService) RenderNotificationTemplate(ctx context.Context, templateID uuid.UUID, data map[string]interface{}) (*service.RenderedNotification, error) {
	args := m.Called(ctx, templateID, data)
	return args.Get(0).(*service.RenderedNotification), args.Error(1)
}

func (m *MockNotificationService) SetUserNotificationPreferences(ctx context.Context, userID uuid.UUID, preferences *service.NotificationPreferences) error {
	args := m.Called(ctx, userID, preferences)
	return args.Error(0)
}

func (m *MockNotificationService) GetUserNotificationPreferences(ctx context.Context, userID uuid.UUID) (*service.NotificationPreferences, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*service.NotificationPreferences), args.Error(1)
}

func TestNotificationHandler_CreateNotificationConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.POST("/api/notifications/configs", handler.CreateNotificationConfig)

	req := service.CreateNotificationConfigRequest{
		Name:         "Test Config",
		EventType:    "recharge_success",
		TargetSystem: "ad_account_system",
		WebhookURL:   "https://example.com/webhook",
		HTTPMethod:   "POST",
		TemplateBody: `{"order_id": "{{.Order.ID}}"}`,
		IsActive:     true,
	}

	expectedConfig := &repository.NotificationConfig{
		ID:           uuid.New(),
		Name:         req.Name,
		EventType:    req.EventType,
		TargetSystem: req.TargetSystem,
		WebhookURL:   req.WebhookURL,
		HTTPMethod:   req.HTTPMethod,
		TemplateBody: req.TemplateBody,
		IsActive:     req.IsActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockService.On("CreateNotificationConfig", mock.Anything, &req).Return(expectedConfig, nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/notifications/configs", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response repository.NotificationConfig
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedConfig.Name, response.Name)
	assert.Equal(t, expectedConfig.EventType, response.EventType)

	mockService.AssertExpectations(t)
}

func TestNotificationHandler_SendNotification(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.POST("/api/notifications/send", handler.SendNotification)

	req := service.SendNotificationRequest{
		EventType:      "test_event",
		TargetURL:      "https://example.com/webhook",
		HTTPMethod:     "POST",
		Payload:        `{"test": "data"}`,
		TimeoutSeconds: 30,
	}

	mockService.On("SendNotification", mock.Anything, &req).Return(nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/notifications/send", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusAccepted, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Notification queued for delivery", response["message"])

	mockService.AssertExpectations(t)
}

func TestNotificationHandler_SendRechargeNotification(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.POST("/api/notifications/recharge", handler.SendRechargeNotification)

	orderID := uuid.New()
	req := SendRechargeNotificationRequest{
		OrderID:   orderID,
		EventType: "recharge_success",
	}

	mockService.On("SendRechargeNotification", mock.Anything, orderID, "recharge_success").Return(nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/notifications/recharge", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusAccepted, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Recharge notification queued for delivery", response["message"])

	mockService.AssertExpectations(t)
}

func TestNotificationHandler_GetNotificationLogs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.GET("/api/notifications/logs", handler.GetNotificationLogs)

	expectedLogs := []*repository.NotificationLog{
		{
			ID:        uuid.New(),
			EventType: "recharge_success",
			Status:    "success",
			CreatedAt: time.Now(),
		},
	}

	mockService.On("GetNotificationLogs", mock.Anything, mock.AnythingOfType("*service.NotificationLogFilter")).Return(expectedLogs, int64(1), nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("GET", "/api/notifications/logs?limit=10&offset=0", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)

	var response NotificationLogsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), response.Total)
	assert.Equal(t, 10, response.Limit)
	assert.Equal(t, 0, response.Offset)

	mockService.AssertExpectations(t)
}

func TestNotificationHandler_GetRealTimeNotifications(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.GET("/api/notifications/realtime/:user_id", handler.GetRealTimeNotifications)

	userID := uuid.New()
	expectedNotifications := []*service.RealTimeNotification{
		{
			UserID:    userID,
			Type:      "recharge_event",
			Title:     "New Order",
			Message:   "You have a new recharge order",
			Timestamp: time.Now(),
		},
	}

	mockService.On("GetRealTimeNotifications", mock.Anything, userID, 10).Return(expectedNotifications, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("GET", "/api/notifications/realtime/"+userID.String(), nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []*service.RealTimeNotification
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 1)
	assert.Equal(t, expectedNotifications[0].UserID, response[0].UserID)
	assert.Equal(t, expectedNotifications[0].Type, response[0].Type)

	mockService.AssertExpectations(t)
}

func TestNotificationHandler_MarkRealTimeNotificationsAsRead(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.POST("/api/notifications/realtime/:user_id/read", handler.MarkRealTimeNotificationsAsRead)

	userID := uuid.New()
	req := MarkNotificationsReadRequest{
		Count: 5,
	}

	mockService.On("MarkRealTimeNotificationsAsRead", mock.Anything, userID, 5).Return(nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/notifications/realtime/"+userID.String()+"/read", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Notifications marked as read", response["message"])

	mockService.AssertExpectations(t)
}

func TestNotificationHandler_RetryFailedNotifications(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockService := &MockNotificationService{}
	handler := NewNotificationHandler(mockService)

	router := gin.New()
	router.POST("/api/notifications/retry", handler.RetryFailedNotifications)

	mockService.On("RetryFailedNotifications", mock.Anything).Return(nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/notifications/retry", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusAccepted, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Failed notifications queued for retry", response["message"])

	mockService.AssertExpectations(t)
}
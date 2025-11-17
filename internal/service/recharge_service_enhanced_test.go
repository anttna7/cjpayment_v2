package service

import (
	"context"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock implementations for testing enhanced functionality

type MockOrderStatusLogRepository struct {
	mock.Mock
}

func (m *MockOrderStatusLogRepository) Create(ctx context.Context, log *repository.OrderStatusLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockOrderStatusLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.OrderStatusLog, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.OrderStatusLog), args.Error(1)
}

func (m *MockOrderStatusLogRepository) List(ctx context.Context, filter *repository.OrderStatusLogFilter) ([]*repository.OrderStatusLog, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.OrderStatusLog), args.Error(1)
}

func (m *MockOrderStatusLogRepository) Count(ctx context.Context, filter *repository.OrderStatusLogFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockOrderStatusLogRepository) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*repository.OrderStatusLog, error) {
	args := m.Called(ctx, orderID)
	return args.Get(0).([]*repository.OrderStatusLog), args.Error(1)
}

func (m *MockOrderStatusLogRepository) DeleteOldLogs(ctx context.Context, olderThan time.Time) error {
	args := m.Called(ctx, olderThan)
	return args.Error(0)
}

type MockPaymentVoucherRepository struct {
	mock.Mock
}

func (m *MockPaymentVoucherRepository) Create(ctx context.Context, voucher *repository.PaymentVoucher) error {
	args := m.Called(ctx, voucher)
	return args.Error(0)
}

func (m *MockPaymentVoucherRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.PaymentVoucher, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.PaymentVoucher), args.Error(1)
}

func (m *MockPaymentVoucherRepository) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*repository.PaymentVoucher, error) {
	args := m.Called(ctx, orderID)
	return args.Get(0).([]*repository.PaymentVoucher), args.Error(1)
}

func (m *MockPaymentVoucherRepository) Update(ctx context.Context, voucher *repository.PaymentVoucher) error {
	args := m.Called(ctx, voucher)
	return args.Error(0)
}

func (m *MockPaymentVoucherRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockPaymentVoucherRepository) List(ctx context.Context, filter *repository.PaymentVoucherFilter) ([]*repository.PaymentVoucher, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.PaymentVoucher), args.Error(1)
}

func (m *MockPaymentVoucherRepository) Count(ctx context.Context, filter *repository.PaymentVoucherFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

type MockNotificationService struct {
	mock.Mock
}

func (m *MockNotificationService) SendNotification(ctx context.Context, req *SendNotificationRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockNotificationService) SendRechargeNotification(ctx context.Context, orderID uuid.UUID, eventType string) error {
	args := m.Called(ctx, orderID, eventType)
	return args.Error(0)
}

func (m *MockNotificationService) CreateNotificationConfig(ctx context.Context, req *CreateNotificationConfigRequest) (*repository.NotificationConfig, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationService) UpdateNotificationConfig(ctx context.Context, id uuid.UUID, req *UpdateNotificationConfigRequest) (*repository.NotificationConfig, error) {
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

func (m *MockNotificationService) ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*repository.NotificationConfig, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationConfig), args.Error(1)
}

func (m *MockNotificationService) RetryFailedNotifications(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockNotificationService) RetryNotification(ctx context.Context, logID uuid.UUID) error {
	args := m.Called(ctx, logID)
	return args.Error(0)
}

func (m *MockNotificationService) GetFailedNotifications(ctx context.Context, filter *FailedNotificationFilter) ([]*repository.NotificationLog, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationLog), args.Error(1)
}

func (m *MockNotificationService) GetNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*repository.NotificationLog, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.NotificationLog), args.Get(1).(int64), args.Error(2)
}

func (m *MockNotificationService) GetNotificationStatus(ctx context.Context, orderID uuid.UUID) ([]*NotificationStatus, error) {
	args := m.Called(ctx, orderID)
	return args.Get(0).([]*NotificationStatus), args.Error(1)
}

func TestRechargeService_UploadPaymentProof(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}
	mockNotificationService := &MockNotificationService{}
	mockOrderStatusLogRepo := &MockOrderStatusLogRepository{}
	mockPaymentVoucherRepo := &MockPaymentVoucherRepository{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
		mockNotificationService,
		mockOrderStatusLogRepo,
		mockPaymentVoucherRepo,
	)

	ctx := context.Background()
	orderID := uuid.New()
	userID := uuid.New()
	proofURL := "https://example.com/proof.jpg"

	// Setup test data
	order := &repository.RechargeOrder{
		ID:          orderID,
		OrderNumber: "CJ202501120001",
		Status:      OrderStatusPending,
		PayerName:   "Test Payer",
		Amount:      decimal.NewFromFloat(1000.00),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Setup mock expectations
	mockRechargeOrderRepo.On("GetByID", ctx, orderID).Return(order, nil)
	mockRechargeOrderRepo.On("Update", ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)
	mockPaymentVoucherRepo.On("Create", ctx, mock.AnythingOfType("*repository.PaymentVoucher")).Return(nil)
	mockNotificationService.On("SendNotification", ctx, mock.AnythingOfType("*SendNotificationRequest")).Return(nil)

	// Execute
	err := service.UploadPaymentProof(ctx, orderID, proofURL, &userID)

	// Assert
	assert.NoError(t, err)

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
	mockPaymentVoucherRepo.AssertExpectations(t)
	mockNotificationService.AssertExpectations(t)
}

func TestRechargeService_SearchOrders(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}
	mockNotificationService := &MockNotificationService{}
	mockOrderStatusLogRepo := &MockOrderStatusLogRepository{}
	mockPaymentVoucherRepo := &MockPaymentVoucherRepository{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
		mockNotificationService,
		mockOrderStatusLogRepo,
		mockPaymentVoucherRepo,
	)

	ctx := context.Background()
	merchantID := uuid.New()

	// Setup test data
	orders := []*repository.RechargeOrder{
		{
			ID:          uuid.New(),
			OrderNumber: "CJ202501120001",
			Status:      OrderStatusPending,
			PayerName:   "Test Payer 1",
			Amount:      decimal.NewFromFloat(1000.00),
			MerchantID:  merchantID,
		},
		{
			ID:          uuid.New(),
			OrderNumber: "CJ202501120002",
			Status:      OrderStatusCompleted,
			PayerName:   "Test Payer 2",
			Amount:      decimal.NewFromFloat(2000.00),
			MerchantID:  merchantID,
		},
	}

	// Setup mock expectations
	mockRechargeOrderRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(orders, nil)
	mockRechargeOrderRepo.On("Count", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(int64(2), nil)

	// Test request
	req := &SearchOrdersRequest{
		MerchantID: &merchantID,
		Status:     []string{OrderStatusPending, OrderStatusCompleted},
		Page:       1,
		Limit:      10,
	}

	// Execute
	response, err := service.SearchOrders(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, 2, len(response.Orders))
	assert.Equal(t, int64(2), response.Total)
	assert.Equal(t, 1, response.Page)
	assert.Equal(t, 10, response.Limit)
	assert.Equal(t, 1, response.TotalPages)

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_GetOrderStatistics(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}
	mockNotificationService := &MockNotificationService{}
	mockOrderStatusLogRepo := &MockOrderStatusLogRepository{}
	mockPaymentVoucherRepo := &MockPaymentVoucherRepository{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
		mockNotificationService,
		mockOrderStatusLogRepo,
		mockPaymentVoucherRepo,
	)

	ctx := context.Background()
	merchantID := uuid.New()

	// Setup test data
	orders := []*repository.RechargeOrder{
		{
			ID:         uuid.New(),
			Status:     OrderStatusCompleted,
			Amount:     decimal.NewFromFloat(1000.00),
			MerchantID: merchantID,
		},
		{
			ID:         uuid.New(),
			Status:     OrderStatusPending,
			Amount:     decimal.NewFromFloat(2000.00),
			MerchantID: merchantID,
		},
		{
			ID:         uuid.New(),
			Status:     OrderStatusCancelled,
			Amount:     decimal.NewFromFloat(500.00),
			MerchantID: merchantID,
		},
	}

	// Setup mock expectations
	mockRechargeOrderRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(orders, nil)
	mockRechargeOrderRepo.On("Count", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(int64(3), nil)

	// Test filter
	filter := &OrderStatisticsFilter{
		MerchantID: &merchantID,
	}

	// Execute
	stats, err := service.GetOrderStatistics(ctx, filter)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, int64(3), stats.TotalOrders)
	assert.Equal(t, decimal.NewFromFloat(3500.00), stats.TotalAmount)
	assert.Equal(t, int64(1), stats.CompletedOrders)
	assert.Equal(t, decimal.NewFromFloat(1000.00), stats.CompletedAmount)
	assert.Equal(t, int64(1), stats.PendingOrders)
	assert.Equal(t, decimal.NewFromFloat(2000.00), stats.PendingAmount)
	assert.Equal(t, int64(1), stats.CancelledOrders)
	assert.Equal(t, decimal.NewFromFloat(500.00), stats.CancelledAmount)

	// Check calculated fields
	expectedAverage := decimal.NewFromFloat(3500.00).Div(decimal.NewFromInt(3))
	assert.True(t, expectedAverage.Equal(stats.AverageAmount))

	expectedSuccessRate := decimal.NewFromInt(1).Div(decimal.NewFromInt(3)).Mul(decimal.NewFromInt(100))
	assert.True(t, expectedSuccessRate.Equal(stats.SuccessRate))

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_ValidateStatusTransition(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}
	mockNotificationService := &MockNotificationService{}
	mockOrderStatusLogRepo := &MockOrderStatusLogRepository{}
	mockPaymentVoucherRepo := &MockPaymentVoucherRepository{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
		mockNotificationService,
		mockOrderStatusLogRepo,
		mockPaymentVoucherRepo,
	)

	ctx := context.Background()
	orderID := uuid.New()

	// Test valid transition
	order := &repository.RechargeOrder{
		ID:     orderID,
		Status: OrderStatusPending,
	}

	mockRechargeOrderRepo.On("GetByID", ctx, orderID).Return(order, nil)

	err := service.ValidateStatusTransition(ctx, orderID, OrderStatusPaid)
	assert.NoError(t, err)

	// Test invalid transition
	err = service.ValidateStatusTransition(ctx, orderID, OrderStatusCompleted)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid status transition")

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}
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
	"github.com/redis/go-redis/v9"
)

// MockReportRepository is a mock implementation of ReportRepository
type MockReportRepository struct {
	mock.Mock
}

func (m *MockReportRepository) GetTransactionStatistics(ctx context.Context, filter *repository.TransactionStatisticsFilter) (*repository.TransactionStatisticsData, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(*repository.TransactionStatisticsData), args.Error(1)
}

func (m *MockReportRepository) GetMerchantStatistics(ctx context.Context, filter *repository.MerchantStatisticsFilter) ([]*repository.MerchantStatisticsData, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.MerchantStatisticsData), args.Get(1).(int64), args.Error(2)
}

func (m *MockReportRepository) GetAccountStatistics(ctx context.Context, filter *repository.AccountStatisticsFilter) ([]*repository.AccountStatisticsData, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.AccountStatisticsData), args.Get(1).(int64), args.Error(2)
}

func (m *MockReportRepository) GetTransactionAggregation(ctx context.Context, filter *repository.TransactionAggregationFilter) ([]*repository.AggregationData, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.AggregationData), args.Error(1)
}

func (m *MockReportRepository) GetTimeSeriesData(ctx context.Context, filter *repository.TimeSeriesFilter) ([]*repository.TimeSeriesData, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.TimeSeriesData), args.Error(1)
}

func (m *MockReportRepository) CreateReport(ctx context.Context, report *repository.Report) error {
	args := m.Called(ctx, report)
	return args.Error(0)
}

func (m *MockReportRepository) GetReport(ctx context.Context, id uuid.UUID) (*repository.Report, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.Report), args.Error(1)
}

func (m *MockReportRepository) UpdateReport(ctx context.Context, report *repository.Report) error {
	args := m.Called(ctx, report)
	return args.Error(0)
}

func (m *MockReportRepository) DeleteReport(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockReportRepository) ListReports(ctx context.Context, filter *repository.ReportFilter) ([]*repository.Report, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.Report), args.Get(1).(int64), args.Error(2)
}

func (m *MockReportRepository) GetRealTimeStatistics(ctx context.Context) (*repository.RealTimeStatisticsData, error) {
	args := m.Called(ctx)
	return args.Get(0).(*repository.RealTimeStatisticsData), args.Error(1)
}

func (m *MockReportRepository) GetDashboardData(ctx context.Context, filter *repository.DashboardFilter) (*repository.DashboardData, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(*repository.DashboardData), args.Error(1)
}

func (m *MockReportRepository) GetRecentOrders(ctx context.Context, limit int) ([]*repository.RecentOrderData, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]*repository.RecentOrderData), args.Error(1)
}

func (m *MockReportRepository) GetSystemHealthStatus(ctx context.Context) (*repository.SystemHealthData, error) {
	args := m.Called(ctx)
	return args.Get(0).(*repository.SystemHealthData), args.Error(1)
}

func TestReportService_GetTransactionStatistics(t *testing.T) {
	mockRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	
	// Create a mock Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1, // Use test database
	})

	service := NewReportService(mockRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo, redisClient)

	ctx := context.Background()
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	// Mock data
	mockData := &repository.TransactionStatisticsData{
		TotalCount:    100,
		TotalAmount:   decimal.NewFromInt(10000),
		SuccessCount:  80,
		SuccessAmount: decimal.NewFromInt(8000),
		FailedCount:   15,
		FailedAmount:  decimal.NewFromInt(1500),
		PendingCount:  5,
		PendingAmount: decimal.NewFromInt(500),
		RefundCount:   0,
		RefundAmount:  decimal.Zero,
	}

	mockRepo.On("GetTransactionStatistics", ctx, mock.AnythingOfType("*repository.TransactionStatisticsFilter")).Return(mockData, nil)

	req := &TransactionStatisticsRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		Granularity: "day",
	}

	result, err := service.GetTransactionStatistics(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int64(100), result.TotalCount)
	assert.Equal(t, decimal.NewFromInt(10000), result.TotalAmount)
	assert.Equal(t, int64(80), result.SuccessCount)
	assert.Equal(t, decimal.NewFromInt(8000), result.SuccessAmount)
	assert.True(t, result.SuccessRate.Equal(decimal.NewFromInt(80))) // 80/100 * 100 = 80%
	assert.True(t, result.AverageAmount.Equal(decimal.NewFromInt(100))) // 10000/100 = 100

	mockRepo.AssertExpectations(t)
}

func TestReportService_GetMerchantStatistics(t *testing.T) {
	mockRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	service := NewReportService(mockRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo, redisClient)

	ctx := context.Background()
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	merchantID := uuid.New()
	mockData := []*repository.MerchantStatisticsData{
		{
			MerchantID:    merchantID,
			MerchantName:  "Test Merchant",
			MerchantCode:  "TEST001",
			TotalCount:    50,
			TotalAmount:   decimal.NewFromInt(5000),
			SuccessCount:  40,
			SuccessAmount: decimal.NewFromInt(4000),
			FailedCount:   10,
			FailedAmount:  decimal.NewFromInt(1000),
			DailyLimit:    decimal.NewFromInt(10000),
			DailyUsed:     decimal.NewFromInt(2000),
		},
	}

	mockRepo.On("GetMerchantStatistics", ctx, mock.AnythingOfType("*repository.MerchantStatisticsFilter")).Return(mockData, int64(1), nil)

	req := &MerchantStatisticsRequest{
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     10,
		OrderBy:   "total_amount",
		OrderDir:  "DESC",
	}

	result, err := service.GetMerchantStatistics(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int64(1), result.Total)
	assert.Len(t, result.Merchants, 1)

	merchant := result.Merchants[0]
	assert.Equal(t, merchantID, merchant.MerchantID)
	assert.Equal(t, "Test Merchant", merchant.MerchantName)
	assert.Equal(t, int64(50), merchant.TotalCount)
	assert.Equal(t, decimal.NewFromInt(5000), merchant.TotalAmount)
	assert.True(t, merchant.SuccessRate.Equal(decimal.NewFromInt(80))) // 40/50 * 100 = 80%
	assert.True(t, merchant.AverageAmount.Equal(decimal.NewFromInt(100))) // 5000/50 = 100
	assert.True(t, merchant.LimitUtilization.Equal(decimal.NewFromInt(20))) // 2000/10000 * 100 = 20%

	mockRepo.AssertExpectations(t)
}

func TestReportService_GetAccountStatistics(t *testing.T) {
	mockRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	service := NewReportService(mockRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo, redisClient)

	ctx := context.Background()
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	accountID := uuid.New()
	mockData := []*repository.AccountStatisticsData{
		{
			AccountID:     accountID,
			AccountName:   "Test Account",
			AccountNumber: "123456789",
			AccountType:   "alipay",
			PaymentType:   "private",
			TotalCount:    30,
			TotalAmount:   decimal.NewFromInt(3000),
			SuccessCount:  25,
			SuccessAmount: decimal.NewFromInt(2500),
			FailedCount:   5,
			FailedAmount:  decimal.NewFromInt(500),
			DailyLimit:    decimal.NewFromInt(5000),
			DailyUsed:     decimal.NewFromInt(1000),
		},
	}

	mockRepo.On("GetAccountStatistics", ctx, mock.AnythingOfType("*repository.AccountStatisticsFilter")).Return(mockData, int64(1), nil)

	req := &AccountStatisticsRequest{
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     10,
		OrderBy:   "total_amount",
		OrderDir:  "DESC",
	}

	result, err := service.GetAccountStatistics(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int64(1), result.Total)
	assert.Len(t, result.Accounts, 1)

	account := result.Accounts[0]
	assert.Equal(t, accountID, account.AccountID)
	assert.Equal(t, "Test Account", account.AccountName)
	assert.Equal(t, "alipay", account.AccountType)
	assert.Equal(t, int64(30), account.TotalCount)
	assert.Equal(t, decimal.NewFromInt(3000), account.TotalAmount)
	assert.True(t, account.SuccessRate.Round(2).Equal(decimal.NewFromFloat(83.33))) // 25/30 * 100 ≈ 83.33%
	assert.True(t, account.AverageAmount.Equal(decimal.NewFromInt(100))) // 3000/30 = 100
	assert.True(t, account.LimitUtilization.Equal(decimal.NewFromInt(20))) // 1000/5000 * 100 = 20%

	mockRepo.AssertExpectations(t)
}

func TestReportService_GetTimeSeriesData(t *testing.T) {
	mockRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	service := NewReportService(mockRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo, redisClient)

	ctx := context.Background()
	startDate := time.Now().AddDate(0, 0, -7)
	endDate := time.Now()

	mockData := []*repository.TimeSeriesData{
		{
			Timestamp: startDate,
			Values: map[string]decimal.Decimal{
				"count":        decimal.NewFromInt(10),
				"amount":       decimal.NewFromInt(1000),
				"success_rate": decimal.NewFromInt(80),
			},
		},
		{
			Timestamp: startDate.AddDate(0, 0, 1),
			Values: map[string]decimal.Decimal{
				"count":        decimal.NewFromInt(15),
				"amount":       decimal.NewFromInt(1500),
				"success_rate": decimal.NewFromInt(85),
			},
		},
	}

	mockRepo.On("GetTimeSeriesData", ctx, mock.AnythingOfType("*repository.TimeSeriesFilter")).Return(mockData, nil)

	req := &TimeSeriesRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		Metrics:     []string{"count", "amount", "success_rate"},
		Granularity: "day",
	}

	result, err := service.GetTimeSeriesData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "day", result.Granularity)
	assert.Equal(t, []string{"count", "amount", "success_rate"}, result.Metrics)
	assert.Len(t, result.Series, 2)

	point1 := result.Series[0]
	assert.Equal(t, startDate, point1.Timestamp)
	assert.Equal(t, decimal.NewFromInt(10), point1.Values["count"])
	assert.Equal(t, decimal.NewFromInt(1000), point1.Values["amount"])
	assert.Equal(t, decimal.NewFromInt(80), point1.Values["success_rate"])

	point2 := result.Series[1]
	assert.Equal(t, startDate.AddDate(0, 0, 1), point2.Timestamp)
	assert.Equal(t, decimal.NewFromInt(15), point2.Values["count"])
	assert.Equal(t, decimal.NewFromInt(1500), point2.Values["amount"])
	assert.Equal(t, decimal.NewFromInt(85), point2.Values["success_rate"])

	mockRepo.AssertExpectations(t)
}

func TestReportService_GenerateTransactionReport(t *testing.T) {
	mockRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	service := NewReportService(mockRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo, redisClient)

	ctx := context.Background()

	mockRepo.On("CreateReport", ctx, mock.AnythingOfType("*repository.Report")).Return(nil)
	// Mock UpdateReport for async processing
	mockRepo.On("UpdateReport", mock.Anything, mock.AnythingOfType("*repository.Report")).Return(nil)
	// Mock List for CSV generation
	mockRechargeRepo.On("List", mock.Anything, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return([]*repository.RechargeOrder{}, nil)

	req := &ReportGenerationRequest{
		ReportType:  "transaction",
		Format:      "csv",
		Title:       "Transaction Report",
		Description: "Weekly transaction report",
		StartDate:   time.Now().AddDate(0, 0, -7),
		EndDate:     time.Now(),
	}

	result, err := service.GenerateTransactionReport(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "transaction", result.ReportType)
	assert.Equal(t, "csv", result.Format)
	assert.Equal(t, "Transaction Report", result.Title)
	assert.Equal(t, "pending", result.Status)
	assert.Equal(t, 0, result.Progress)

	// Give some time for async processing to start
	time.Sleep(100 * time.Millisecond)

	mockRepo.AssertExpectations(t)
}

func TestReportService_GetRealTimeStatistics(t *testing.T) {
	mockRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	service := NewReportService(mockRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo, redisClient)

	ctx := context.Background()

	mockData := &repository.RealTimeStatisticsData{
		TodayStats: &repository.TransactionStatisticsData{
			TotalCount:    50,
			TotalAmount:   decimal.NewFromInt(5000),
			SuccessCount:  40,
			SuccessAmount: decimal.NewFromInt(4000),
		},
		YesterdayStats: &repository.TransactionStatisticsData{
			TotalCount:    45,
			TotalAmount:   decimal.NewFromInt(4500),
			SuccessCount:  35,
			SuccessAmount: decimal.NewFromInt(3500),
		},
		WeekStats: &repository.TransactionStatisticsData{
			TotalCount:    300,
			TotalAmount:   decimal.NewFromInt(30000),
			SuccessCount:  250,
			SuccessAmount: decimal.NewFromInt(25000),
		},
		MonthStats: &repository.TransactionStatisticsData{
			TotalCount:    1200,
			TotalAmount:   decimal.NewFromInt(120000),
			SuccessCount:  1000,
			SuccessAmount: decimal.NewFromInt(100000),
		},
		ActiveMerchants: 10,
		ActiveAccounts:  25,
		PendingOrders:   5,
		FailedOrders:    3,
	}

	mockRepo.On("GetRealTimeStatistics", ctx).Return(mockData, nil)

	result, err := service.GetRealTimeStatistics(ctx)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int64(10), result.ActiveMerchants)
	assert.Equal(t, int64(25), result.ActiveAccounts)
	assert.Equal(t, int64(5), result.PendingOrders)
	assert.Equal(t, int64(3), result.FailedOrders)

	assert.NotNil(t, result.TodayTransactions)
	assert.Equal(t, int64(50), result.TodayTransactions.TotalCount)
	assert.Equal(t, decimal.NewFromInt(5000), result.TodayTransactions.TotalAmount)

	assert.NotNil(t, result.SystemHealth)
	assert.Equal(t, "healthy", result.SystemHealth.DatabaseStatus)

	mockRepo.AssertExpectations(t)
}
package service

import (
	"context"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"cjpayment/internal/repository"
	"cjpayment/pkg/security"
)

// MockDataMasker is a mock implementation of DataMasker
type MockDataMasker struct {
	mock.Mock
}

func (m *MockDataMasker) MaskPhone(phone string) string {
	args := m.Called(phone)
	return args.String(0)
}

func (m *MockDataMasker) MaskBankAccount(account string) string {
	args := m.Called(account)
	return args.String(0)
}

func (m *MockDataMasker) EncryptSensitiveData(data string) (string, error) {
	args := m.Called(data)
	return args.String(0), args.Error(1)
}

func setupTestDataExportService(t *testing.T) (*DataExportService, *gorm.DB, *MockDataMasker) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Auto migrate tables
	err = db.AutoMigrate(
		&repository.Merchant{},
		&repository.ReceiveAccount{},
		&repository.RechargeOrder{},
		&repository.DataExportLog{},
	)
	assert.NoError(t, err)

	// Create repository manager
	repoManager := repository.NewManager(db)

	// Create mock data masker
	mockMasker := &MockDataMasker{}

	// Create service
	service := NewDataExportService(db, repoManager, mockMasker)

	return service, db, mockMasker
}

func createTestData(t *testing.T, db *gorm.DB) {
	// Create test merchant
	merchant := &repository.Merchant{
		ID:           1,
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		Status:       "active",
	}
	err := db.Create(merchant).Error
	assert.NoError(t, err)

	// Create test receive account
	account := &repository.ReceiveAccount{
		ID:          1,
		AccountName: "Test Bank Account",
		AccountNo:   "1234567890123456",
		BankName:    "Test Bank",
		AccountType: "corporate",
		Status:      "active",
	}
	err = db.Create(account).Error
	assert.NoError(t, err)

	// Create test orders
	orders := []repository.RechargeOrder{
		{
			ID:               1,
			OrderNo:          "ORDER001",
			MerchantID:       1,
			PayerName:        "张三",
			Amount:           decimal.NewFromFloat(1000.00),
			AdAccount:        "AD123456",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "completed",
			CreatedAt:        time.Now().Truncate(24 * time.Hour).Add(time.Hour),
			UpdatedAt:        time.Now(),
		},
		{
			ID:               2,
			OrderNo:          "ORDER002",
			MerchantID:       1,
			PayerName:        "李四",
			Amount:           decimal.NewFromFloat(2000.00),
			AdAccount:        "AD789012",
			PaymentType:      "personal",
			ReceiveAccountID: 1,
			Status:           "pending",
			CreatedAt:        time.Now().Truncate(24 * time.Hour).Add(2 * time.Hour),
			UpdatedAt:        time.Now(),
		},
	}

	for _, order := range orders {
		err := db.Create(&order).Error
		assert.NoError(t, err)
	}
}

func TestDataExportService_ExportTodayData(t *testing.T) {
	service, db, mockMasker := setupTestDataExportService(t)
	createTestData(t, db)

	// Setup mock expectations
	mockMasker.On("MaskPhone", mock.AnythingOfType("string")).Return("张*")
	mockMasker.On("MaskBankAccount", mock.AnythingOfType("string")).Return("Test****ount")

	ctx := context.Background()
	req := &ExportRequest{
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := service.ExportTodayData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.RecordCount)
	assert.Contains(t, result.FileName, "recharge_orders_")
	assert.Contains(t, result.FileName, ".xlsx")
	assert.True(t, result.FileSize > 0)

	mockMasker.AssertExpectations(t)
}

func TestDataExportService_ExportYesterdayData(t *testing.T) {
	service, db, mockMasker := setupTestDataExportService(t)

	// Create yesterday's data
	yesterday := time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour)
	
	merchant := &repository.Merchant{
		ID:           1,
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		Status:       "active",
	}
	err := db.Create(merchant).Error
	assert.NoError(t, err)

	account := &repository.ReceiveAccount{
		ID:          1,
		AccountName: "Test Bank Account",
		AccountNo:   "1234567890123456",
		BankName:    "Test Bank",
		AccountType: "corporate",
		Status:      "active",
	}
	err = db.Create(account).Error
	assert.NoError(t, err)

	order := &repository.RechargeOrder{
		ID:               1,
		OrderNo:          "ORDER001",
		MerchantID:       1,
		PayerName:        "张三",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "completed",
		CreatedAt:        yesterday.Add(time.Hour),
		UpdatedAt:        yesterday.Add(time.Hour),
	}
	err = db.Create(order).Error
	assert.NoError(t, err)

	// Setup mock expectations
	mockMasker.On("MaskPhone", mock.AnythingOfType("string")).Return("张*")
	mockMasker.On("MaskBankAccount", mock.AnythingOfType("string")).Return("Test****ount")

	ctx := context.Background()
	req := &ExportRequest{
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := service.ExportYesterdayData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.RecordCount)

	mockMasker.AssertExpectations(t)
}

func TestDataExportService_GetDailyReport(t *testing.T) {
	service, db, _ := setupTestDataExportService(t)
	createTestData(t, db)

	ctx := context.Background()
	today := time.Now().Truncate(24 * time.Hour)

	result, err := service.GetDailyReport(ctx, today)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.TotalOrders)
	assert.Equal(t, decimal.NewFromFloat(3000.00), result.TotalAmount)
	assert.Equal(t, 1, result.PendingOrders)
	assert.Equal(t, 1, result.CompletedOrders)
	assert.Equal(t, 0, result.CancelledOrders)
	assert.Len(t, result.MerchantStats, 1)
	
	merchantStat := result.MerchantStats[0]
	assert.Equal(t, uint(1), merchantStat.MerchantID)
	assert.Equal(t, "Test Merchant", merchantStat.MerchantName)
	assert.Equal(t, 2, merchantStat.OrderCount)
	assert.Equal(t, decimal.NewFromFloat(3000.00), merchantStat.TotalAmount)
	assert.Equal(t, 50.0, merchantStat.SuccessRate) // 1 completed out of 2 total
}

func TestDataExportService_ExportWithMerchantFilter(t *testing.T) {
	service, db, mockMasker := setupTestDataExportService(t)
	createTestData(t, db)

	// Create another merchant and order
	merchant2 := &repository.Merchant{
		ID:           2,
		Name:         "Test Merchant 2",
		ContactName:  "Jane Doe",
		ContactPhone: "13900139000",
		Email:        "jane@example.com",
		Status:       "active",
	}
	err := db.Create(merchant2).Error
	assert.NoError(t, err)

	order3 := &repository.RechargeOrder{
		ID:               3,
		OrderNo:          "ORDER003",
		MerchantID:       2,
		PayerName:        "王五",
		Amount:           decimal.NewFromFloat(500.00),
		AdAccount:        "AD345678",
		PaymentType:      "personal",
		ReceiveAccountID: 1,
		Status:           "paid",
		CreatedAt:        time.Now().Truncate(24 * time.Hour).Add(3 * time.Hour),
		UpdatedAt:        time.Now(),
	}
	err = db.Create(order3).Error
	assert.NoError(t, err)

	// Setup mock expectations
	mockMasker.On("MaskPhone", mock.AnythingOfType("string")).Return("张*")
	mockMasker.On("MaskBankAccount", mock.AnythingOfType("string")).Return("Test****ount")

	ctx := context.Background()
	merchantID := uint(1)
	req := &ExportRequest{
		StartDate:        time.Now().Truncate(24 * time.Hour),
		EndDate:          time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour),
		MerchantID:       &merchantID,
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := service.ExportOrderData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.RecordCount) // Only orders from merchant 1

	mockMasker.AssertExpectations(t)
}

func TestDataExportService_ExportWithStatusFilter(t *testing.T) {
	service, db, mockMasker := setupTestDataExportService(t)
	createTestData(t, db)

	// Setup mock expectations
	mockMasker.On("MaskPhone", mock.AnythingOfType("string")).Return("张*")
	mockMasker.On("MaskBankAccount", mock.AnythingOfType("string")).Return("Test****ount")

	ctx := context.Background()
	req := &ExportRequest{
		StartDate:        time.Now().Truncate(24 * time.Hour),
		EndDate:          time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour),
		Status:           "completed",
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := service.ExportOrderData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.RecordCount) // Only completed orders

	mockMasker.AssertExpectations(t)
}

func TestDataExportService_ExportWithSensitiveData(t *testing.T) {
	service, db, _ := setupTestDataExportService(t)
	createTestData(t, db)

	ctx := context.Background()
	req := &ExportRequest{
		StartDate:        time.Now().Truncate(24 * time.Hour),
		EndDate:          time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour),
		IncludeSensitive: true, // Include sensitive data
		Format:          "excel",
	}

	result, err := service.ExportOrderData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.RecordCount)
	// When including sensitive data, masker should not be called
}

func TestDataExportService_maskAdAccount(t *testing.T) {
	service, _, _ := setupTestDataExportService(t)

	tests := []struct {
		input    string
		expected string
	}{
		{"AD123456", "AD****56"},
		{"ABC", "ABC"},
		{"ABCD", "ABCD"},
		{"A1B2C3D4E5", "A1****E5"},
	}

	for _, test := range tests {
		result := service.maskAdAccount(test.input)
		assert.Equal(t, test.expected, result)
	}
}
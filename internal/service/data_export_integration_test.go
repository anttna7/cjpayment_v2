package service

import (
	"context"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"cjpayment/internal/repository"
	"cjpayment/pkg/security"
)

func setupDataExportIntegrationTest(t *testing.T) (*DataExportService, *ScheduledExportService, *gorm.DB) {
	// Setup in-memory SQLite database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto migrate tables
	err = db.AutoMigrate(
		&repository.Merchant{},
		&repository.ReceiveAccount{},
		&repository.RechargeOrder{},
		&repository.DataExportLog{},
		&repository.ExportSchedule{},
		&repository.Notification{},
	)
	require.NoError(t, err)

	// Create repository manager
	repoManager := repository.NewManager(db)

	// Create data masker
	dataMasker := &security.DataMasker{}

	// Create services
	dataExportService := NewDataExportService(db, repoManager, dataMasker)
	
	// Create mock notification service
	mockNotificationService := &MockNotificationService{}
	
	scheduledExportService := NewScheduledExportService(
		dataExportService,
		mockNotificationService,
		repoManager,
	)

	return dataExportService, scheduledExportService, db
}

func createIntegrationTestData(t *testing.T, db *gorm.DB) {
	// Create test merchant
	merchant := &repository.Merchant{
		ID:           1,
		Name:         "Integration Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		Status:       "active",
	}
	err := db.Create(merchant).Error
	require.NoError(t, err)

	// Create test receive account
	account := &repository.ReceiveAccount{
		ID:          1,
		AccountName: "Integration Test Account",
		AccountNo:   "1234567890123456",
		BankName:    "Test Bank",
		AccountType: "corporate",
		Status:      "active",
	}
	err = db.Create(account).Error
	require.NoError(t, err)

	// Create test orders for different dates
	today := time.Now().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)

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
			CreatedAt:        today.Add(time.Hour),
			UpdatedAt:        today.Add(time.Hour),
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
			CreatedAt:        today.Add(2 * time.Hour),
			UpdatedAt:        today.Add(2 * time.Hour),
		},
		{
			ID:               3,
			OrderNo:          "ORDER003",
			MerchantID:       1,
			PayerName:        "王五",
			Amount:           decimal.NewFromFloat(1500.00),
			AdAccount:        "AD345678",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "completed",
			CreatedAt:        yesterday.Add(time.Hour),
			UpdatedAt:        yesterday.Add(time.Hour),
		},
	}

	for _, order := range orders {
		err := db.Create(&order).Error
		require.NoError(t, err)
	}
}

func TestDataExportIntegration_TodayExport(t *testing.T) {
	dataExportService, _, db := setupDataExportIntegrationTest(t)
	createIntegrationTestData(t, db)

	ctx := context.Background()
	req := &ExportRequest{
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := dataExportService.ExportTodayData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.RecordCount) // Today's orders
	assert.Contains(t, result.FileName, "recharge_orders_")
	assert.Contains(t, result.FileName, ".xlsx")
	assert.True(t, result.FileSize > 0)
	assert.NotEmpty(t, result.DownloadURL)
}

func TestDataExportIntegration_YesterdayExport(t *testing.T) {
	dataExportService, _, db := setupDataExportIntegrationTest(t)
	createIntegrationTestData(t, db)

	ctx := context.Background()
	req := &ExportRequest{
		IncludeSensitive: true,
		Format:          "excel",
	}

	result, err := dataExportService.ExportYesterdayData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.RecordCount) // Yesterday's orders
	assert.Contains(t, result.FileName, "recharge_orders_")
	assert.Contains(t, result.FileName, ".xlsx")
	assert.True(t, result.FileSize > 0)
}

func TestDataExportIntegration_CustomRangeExport(t *testing.T) {
	dataExportService, _, db := setupDataExportIntegrationTest(t)
	createIntegrationTestData(t, db)

	ctx := context.Background()
	
	// Export all orders from yesterday to today
	startDate := time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour)
	endDate := time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour)
	
	req := &ExportRequest{
		StartDate:        startDate,
		EndDate:          endDate,
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := dataExportService.ExportOrderData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 3, result.RecordCount) // All orders
	assert.Contains(t, result.FileName, "recharge_orders_")
	assert.True(t, result.FileSize > 0)
}

func TestDataExportIntegration_DailyReport(t *testing.T) {
	dataExportService, _, db := setupDataExportIntegrationTest(t)
	createIntegrationTestData(t, db)

	ctx := context.Background()
	today := time.Now().Truncate(24 * time.Hour)

	result, err := dataExportService.GetDailyReport(ctx, today)

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
	assert.Equal(t, "Integration Test Merchant", merchantStat.MerchantName)
	assert.Equal(t, 2, merchantStat.OrderCount)
	assert.Equal(t, decimal.NewFromFloat(3000.00), merchantStat.TotalAmount)
	assert.Equal(t, 50.0, merchantStat.SuccessRate)
}

func TestDataExportIntegration_ExportWithFilters(t *testing.T) {
	dataExportService, _, db := setupDataExportIntegrationTest(t)
	createIntegrationTestData(t, db)

	ctx := context.Background()
	
	// Test merchant filter
	merchantID := uint(1)
	req := &ExportRequest{
		StartDate:        time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour),
		EndDate:          time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour),
		MerchantID:       &merchantID,
		IncludeSensitive: false,
		Format:          "excel",
	}

	result, err := dataExportService.ExportOrderData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 3, result.RecordCount) // All orders from merchant 1

	// Test status filter
	req.Status = "completed"
	result, err = dataExportService.ExportOrderData(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.RecordCount) // Only completed orders
}

func TestScheduledExportIntegration_CreateAndExecute(t *testing.T) {
	_, scheduledExportService, db := setupDataExportIntegrationTest(t)
	createIntegrationTestData(t, db)

	ctx := context.Background()

	// Create a schedule
	schedule := &ExportSchedule{
		Name:        "Daily Integration Test Export",
		Description: "Test daily export schedule",
		ExportType:  "daily",
		Schedule:    "daily",
		EmailList:   "test@example.com",
		Status:      "active",
	}

	err := scheduledExportService.CreateSchedule(ctx, schedule)
	assert.NoError(t, err)
	assert.NotZero(t, schedule.ID)
	assert.NotNil(t, schedule.NextRunAt)

	// Execute the schedule
	result, err := scheduledExportService.ExecuteSchedule(ctx, schedule.ID)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, schedule.ID, result.ScheduleID)
	assert.Equal(t, schedule.Name, result.ScheduleName)
	assert.True(t, result.Success)
	assert.NotNil(t, result.ExportResult)
}

func TestScheduledExportIntegration_ListSchedules(t *testing.T) {
	_, scheduledExportService, _ := setupDataExportIntegrationTest(t)

	ctx := context.Background()

	// Create multiple schedules
	schedules := []*ExportSchedule{
		{
			Name:        "Daily Export 1",
			Description: "First daily export",
			ExportType:  "daily",
			Schedule:    "daily",
			EmailList:   "admin1@example.com",
			Status:      "active",
		},
		{
			Name:        "Weekly Export",
			Description: "Weekly export",
			ExportType:  "weekly",
			Schedule:    "weekly",
			EmailList:   "admin2@example.com",
			Status:      "active",
		},
	}

	for _, schedule := range schedules {
		err := scheduledExportService.CreateSchedule(ctx, schedule)
		assert.NoError(t, err)
	}

	// List schedules
	result, err := scheduledExportService.ListSchedules(ctx)
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "Daily Export 1", result[0].Name)
	assert.Equal(t, "Weekly Export", result[1].Name)
}

func TestScheduledExportIntegration_UpdateAndDelete(t *testing.T) {
	_, scheduledExportService, _ := setupDataExportIntegrationTest(t)

	ctx := context.Background()

	// Create a schedule
	schedule := &ExportSchedule{
		Name:        "Test Schedule",
		Description: "Original description",
		ExportType:  "daily",
		Schedule:    "daily",
		EmailList:   "original@example.com",
		Status:      "active",
	}

	err := scheduledExportService.CreateSchedule(ctx, schedule)
	assert.NoError(t, err)

	// Update the schedule
	updates := &ExportSchedule{
		Name:        "Updated Test Schedule",
		Description: "Updated description",
		EmailList:   "updated@example.com",
	}

	err = scheduledExportService.UpdateSchedule(ctx, schedule.ID, updates)
	assert.NoError(t, err)

	// Verify update
	schedules, err := scheduledExportService.ListSchedules(ctx)
	assert.NoError(t, err)
	assert.Len(t, schedules, 1)
	assert.Equal(t, "Updated Test Schedule", schedules[0].Name)
	assert.Equal(t, "Updated description", schedules[0].Description)
	assert.Equal(t, "updated@example.com", schedules[0].EmailList)

	// Delete the schedule
	err = scheduledExportService.DeleteSchedule(ctx, schedule.ID)
	assert.NoError(t, err)

	// Verify deletion
	schedules, err = scheduledExportService.ListSchedules(ctx)
	assert.NoError(t, err)
	assert.Len(t, schedules, 0)
}

// MockNotificationService for testing
type MockNotificationService struct {
	SentNotifications []*repository.Notification
}

func (m *MockNotificationService) SendNotification(ctx context.Context, notification *repository.Notification) error {
	m.SentNotifications = append(m.SentNotifications, notification)
	notification.Status = "sent"
	now := time.Now()
	notification.SentAt = &now
	return nil
}
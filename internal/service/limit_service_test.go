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

func TestLimitService_CheckAccountLimits(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Account not found", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(100.00)
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(nil, nil)
		
		result, err := service.CheckAccountLimits(ctx, accountID, amount)
		
		assert.NoError(t, err)
		assert.False(t, result.Allowed)
		assert.Equal(t, "Account not found", result.Reason)
		
		mockAccountRepo.AssertExpectations(t)
	})
	
	t.Run("Account inactive", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(100.00)
		
		account := &repository.ReceiveAccount{
			ID:     accountID,
			Status: "inactive",
		}
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
		
		result, err := service.CheckAccountLimits(ctx, accountID, amount)
		
		assert.NoError(t, err)
		assert.False(t, result.Allowed)
		assert.Equal(t, "Account is not active", result.Reason)
		
		mockAccountRepo.AssertExpectations(t)
	})
	
	t.Run("Single limit exceeded", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(1000.00)
		
		account := &repository.ReceiveAccount{
			ID:            accountID,
			Status:        "active",
			SingleLimit:   decimal.NewFromFloat(500.00),
			DailyLimit:    decimal.NewFromFloat(5000.00),
			DailyUsed:     decimal.NewFromFloat(100.00),
			LastResetDate: time.Now().Truncate(24 * time.Hour),
		}
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
		
		result, err := service.CheckAccountLimits(ctx, accountID, amount)
		
		assert.NoError(t, err)
		assert.False(t, result.Allowed)
		assert.Contains(t, result.Reason, "exceeds single transaction limit")
		assert.Equal(t, account.SingleLimit, result.SingleLimit)
		assert.Equal(t, account.DailyLimit, result.DailyLimit)
		
		mockAccountRepo.AssertExpectations(t)
	})
	
	t.Run("Daily limit exceeded", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(500.00)
		
		account := &repository.ReceiveAccount{
			ID:            accountID,
			Status:        "active",
			SingleLimit:   decimal.NewFromFloat(1000.00),
			DailyLimit:    decimal.NewFromFloat(1000.00),
			DailyUsed:     decimal.NewFromFloat(800.00),
			LastResetDate: time.Now().Truncate(24 * time.Hour),
		}
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
		
		result, err := service.CheckAccountLimits(ctx, accountID, amount)
		
		assert.NoError(t, err)
		assert.False(t, result.Allowed)
		assert.Contains(t, result.Reason, "would exceed daily limit")
		
		mockAccountRepo.AssertExpectations(t)
	})
	
	t.Run("Limits passed", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(300.00)
		
		account := &repository.ReceiveAccount{
			ID:            accountID,
			Status:        "active",
			SingleLimit:   decimal.NewFromFloat(500.00),
			DailyLimit:    decimal.NewFromFloat(2000.00),
			DailyUsed:     decimal.NewFromFloat(100.00),
			LastResetDate: time.Now().Truncate(24 * time.Hour),
		}
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
		
		result, err := service.CheckAccountLimits(ctx, accountID, amount)
		
		assert.NoError(t, err)
		assert.True(t, result.Allowed)
		assert.Empty(t, result.Reason)
		assert.Equal(t, account.SingleLimit, result.SingleLimit)
		assert.Equal(t, account.DailyLimit, result.DailyLimit)
		assert.Equal(t, account.DailyUsed, result.DailyUsed)
		
		mockAccountRepo.AssertExpectations(t)
	})
	
	t.Run("Daily limit reset needed", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(300.00)
		
		// Account with yesterday's reset date
		yesterday := time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour)
		account := &repository.ReceiveAccount{
			ID:            accountID,
			Status:        "active",
			SingleLimit:   decimal.NewFromFloat(500.00),
			DailyLimit:    decimal.NewFromFloat(2000.00),
			DailyUsed:     decimal.NewFromFloat(1500.00), // High usage from yesterday
			LastResetDate: yesterday,
		}
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
		mockAccountRepo.On("Update", ctx, mock.MatchedBy(func(acc *repository.ReceiveAccount) bool {
			return acc.ID == accountID && acc.DailyUsed.Equal(decimal.Zero)
		})).Return(nil)
		
		result, err := service.CheckAccountLimits(ctx, accountID, amount)
		
		assert.NoError(t, err)
		assert.True(t, result.Allowed)
		assert.Empty(t, result.Reason)
		
		mockAccountRepo.AssertExpectations(t)
	})
}

func TestLimitService_CheckMerchantLimits(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Merchant not found", func(t *testing.T) {
		merchantID := uuid.New()
		amount := decimal.NewFromFloat(100.00)
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(nil, nil)
		
		result, err := service.CheckMerchantLimits(ctx, merchantID, amount)
		
		assert.NoError(t, err)
		assert.False(t, result.Allowed)
		assert.Equal(t, "Merchant not found", result.Reason)
		
		mockMerchantRepo.AssertExpectations(t)
	})
	
	t.Run("Merchant inactive", func(t *testing.T) {
		merchantID := uuid.New()
		amount := decimal.NewFromFloat(100.00)
		
		merchant := &repository.Merchant{
			ID:     merchantID,
			Status: "inactive",
		}
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
		
		result, err := service.CheckMerchantLimits(ctx, merchantID, amount)
		
		assert.NoError(t, err)
		assert.False(t, result.Allowed)
		assert.Equal(t, "Merchant is not active", result.Reason)
		
		mockMerchantRepo.AssertExpectations(t)
	})
	
	t.Run("Limits passed", func(t *testing.T) {
		merchantID := uuid.New()
		amount := decimal.NewFromFloat(300.00)
		
		merchant := &repository.Merchant{
			ID:            merchantID,
			Status:        "active",
			SingleLimit:   decimal.NewFromFloat(500.00),
			DailyLimit:    decimal.NewFromFloat(2000.00),
			DailyUsed:     decimal.NewFromFloat(100.00),
			LastResetDate: time.Now().Truncate(24 * time.Hour),
		}
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
		
		result, err := service.CheckMerchantLimits(ctx, merchantID, amount)
		
		assert.NoError(t, err)
		assert.True(t, result.Allowed)
		assert.Empty(t, result.Reason)
		assert.Equal(t, merchant.SingleLimit, result.SingleLimit)
		assert.Equal(t, merchant.DailyLimit, result.DailyLimit)
		assert.Equal(t, merchant.DailyUsed, result.DailyUsed)
		
		mockMerchantRepo.AssertExpectations(t)
	})
}

func TestLimitService_UpdateAccountDailyUsed(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Update successful - no alerts", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(100.00)
		
		mockAccountRepo.On("UpdateDailyUsed", ctx, accountID, amount).Return(nil)
		// The service calls GetByID to check for alerts after updating
		mockAccountRepo.On("GetByID", ctx, accountID).Return(&repository.ReceiveAccount{
			ID:          accountID,
			AccountName: "Test Account",
			DailyLimit:  decimal.NewFromFloat(1000.00),
			DailyUsed:   decimal.NewFromFloat(100.00), // Only 10% usage, no alerts
		}, nil)
		
		err := service.UpdateAccountDailyUsed(ctx, accountID, amount)
		
		assert.NoError(t, err)
		
		mockAccountRepo.AssertExpectations(t)
	})
	
	t.Run("Update successful - with warning alert", func(t *testing.T) {
		accountID := uuid.New()
		amount := decimal.NewFromFloat(100.00)
		
		mockAccountRepo.On("UpdateDailyUsed", ctx, accountID, amount).Return(nil)
		// Account with 85% usage should trigger warning alert
		mockAccountRepo.On("GetByID", ctx, accountID).Return(&repository.ReceiveAccount{
			ID:          accountID,
			AccountName: "Test Account",
			DailyLimit:  decimal.NewFromFloat(1000.00),
			DailyUsed:   decimal.NewFromFloat(850.00), // 85% usage
		}, nil)
		mockLimitAlertRepo.On("GetUnresolvedAlerts", ctx, accountID, "account_limit").Return([]*repository.LimitAlert{}, nil)
		mockLimitAlertRepo.On("Create", ctx, mock.MatchedBy(func(alert *repository.LimitAlert) bool {
			return alert.AlertLevel == "warning" && alert.AlertType == "account_limit"
		})).Return(nil)
		
		err := service.UpdateAccountDailyUsed(ctx, accountID, amount)
		
		assert.NoError(t, err)
		
		mockAccountRepo.AssertExpectations(t)
		mockLimitAlertRepo.AssertExpectations(t)
	})
}

func TestLimitService_GetAccountLimitStatus(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Get status successful", func(t *testing.T) {
		accountID := uuid.New()
		
		account := &repository.ReceiveAccount{
			ID:            accountID,
			AccountName:   "Test Account",
			SingleLimit:   decimal.NewFromFloat(500.00),
			DailyLimit:    decimal.NewFromFloat(2000.00),
			DailyUsed:     decimal.NewFromFloat(800.00),
			LastResetDate: time.Now().Truncate(24 * time.Hour),
		}
		
		mockAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
		
		status, err := service.GetAccountLimitStatus(ctx, accountID)
		
		assert.NoError(t, err)
		assert.Equal(t, accountID, status.AccountID)
		assert.Equal(t, "Test Account", status.AccountName)
		assert.Equal(t, account.SingleLimit, status.SingleLimit)
		assert.Equal(t, account.DailyLimit, status.DailyLimit)
		assert.Equal(t, account.DailyUsed, status.DailyUsed)
		assert.True(t, decimal.NewFromFloat(1200.00).Equal(status.DailyRemaining)) // 2000 - 800
		assert.True(t, decimal.NewFromFloat(40.00).Equal(status.UtilizationRate))  // 800/2000 * 100
		
		mockAccountRepo.AssertExpectations(t)
	})
}

func TestLimitService_GetMerchantLimitStatuses(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Get merchant statuses successfully", func(t *testing.T) {
		filter := &MerchantLimitStatusFilter{
			Status: stringPtr("active"),
			Limit:  10,
			Offset: 0,
		}
		
		merchants := []*repository.Merchant{
			{
				ID:            uuid.New(),
				Name:          "Test Merchant 1",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(1000.00),
				DailyUsed:     decimal.NewFromFloat(800.00),
				SingleLimit:   decimal.NewFromFloat(500.00),
				LastResetDate: time.Now().Truncate(24 * time.Hour),
			},
			{
				ID:            uuid.New(),
				Name:          "Test Merchant 2",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(2000.00),
				DailyUsed:     decimal.NewFromFloat(500.00),
				SingleLimit:   decimal.NewFromFloat(1000.00),
				LastResetDate: time.Now().Truncate(24 * time.Hour),
			},
		}
		
		mockMerchantRepo.On("List", ctx, mock.MatchedBy(func(f *repository.MerchantFilter) bool {
			return f.Status != nil && *f.Status == "active"
		})).Return(merchants, nil)
		
		statuses, err := service.GetMerchantLimitStatuses(ctx, filter)
		
		assert.NoError(t, err)
		assert.Len(t, statuses, 2)
		
		// Check first merchant (80% utilization)
		assert.Equal(t, merchants[0].ID, statuses[0].MerchantID)
		assert.Equal(t, "Test Merchant 1", statuses[0].MerchantName)
		assert.True(t, decimal.NewFromFloat(80.00).Equal(statuses[0].UtilizationRate))
		
		// Check second merchant (25% utilization)
		assert.Equal(t, merchants[1].ID, statuses[1].MerchantID)
		assert.Equal(t, "Test Merchant 2", statuses[1].MerchantName)
		assert.True(t, decimal.NewFromFloat(25.00).Equal(statuses[1].UtilizationRate))
		
		mockMerchantRepo.AssertExpectations(t)
	})
	
	t.Run("Filter by utilization rate", func(t *testing.T) {
		// Create fresh mock repositories for this test
		mockMerchantRepo2 := &MockMerchantRepository{}
		mockAccountRepo2 := &MockReceiveAccountRepository{}
		mockLimitAlertRepo2 := &MockLimitAlertRepository{}
		mockRechargeOrderRepo2 := &MockRechargeOrderRepository{}
		
		service2 := NewLimitService(mockMerchantRepo2, mockAccountRepo2, mockLimitAlertRepo2, mockRechargeOrderRepo2)
		
		minUtilization := 50.0
		filter := &MerchantLimitStatusFilter{
			Status:             stringPtr("active"),
			MinUtilizationRate: &minUtilization,
			Limit:              10,
			Offset:             0,
		}
		
		merchants := []*repository.Merchant{
			{
				ID:            uuid.New(),
				Name:          "High Usage Merchant",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(1000.00),
				DailyUsed:     decimal.NewFromFloat(800.00), // 80% usage
				SingleLimit:   decimal.NewFromFloat(500.00),
				LastResetDate: time.Now().Truncate(24 * time.Hour),
			},
			{
				ID:            uuid.New(),
				Name:          "Low Usage Merchant",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(1000.00),
				DailyUsed:     decimal.NewFromFloat(200.00), // 20% usage
				SingleLimit:   decimal.NewFromFloat(500.00),
				LastResetDate: time.Now().Truncate(24 * time.Hour),
			},
		}
		
		mockMerchantRepo2.On("List", ctx, mock.MatchedBy(func(f *repository.MerchantFilter) bool {
			return f.Status != nil && *f.Status == "active"
		})).Return(merchants, nil)
		
		statuses, err := service2.GetMerchantLimitStatuses(ctx, filter)
		
		assert.NoError(t, err)
		assert.Len(t, statuses, 1) // Only high usage merchant should be returned
		assert.Equal(t, "High Usage Merchant", statuses[0].MerchantName)
		
		mockMerchantRepo2.AssertExpectations(t)
	})
}

func TestLimitService_UpdateMerchantLimitsWithValidation(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Update limits successfully", func(t *testing.T) {
		merchantID := uuid.New()
		merchant := &repository.Merchant{
			ID:          merchantID,
			Name:        "Test Merchant",
			Status:      "active",
			DailyLimit:  decimal.NewFromFloat(1000.00),
			DailyUsed:   decimal.NewFromFloat(500.00),
			SingleLimit: decimal.NewFromFloat(500.00),
		}
		
		newDailyLimit := decimal.NewFromFloat(2000.00)
		newSingleLimit := decimal.NewFromFloat(1000.00)
		req := &UpdateMerchantLimitsRequest{
			DailyLimit:  &newDailyLimit,
			SingleLimit: &newSingleLimit,
			Reason:      "Increase limits for high volume merchant",
		}
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
		mockMerchantRepo.On("Update", ctx, mock.MatchedBy(func(m *repository.Merchant) bool {
			return m.ID == merchantID && 
				   m.DailyLimit.Equal(newDailyLimit) && 
				   m.SingleLimit.Equal(newSingleLimit)
		})).Return(nil)
		
		err := service.UpdateMerchantLimitsWithValidation(ctx, merchantID, req)
		
		assert.NoError(t, err)
		mockMerchantRepo.AssertExpectations(t)
	})
	
	t.Run("Reject negative limits", func(t *testing.T) {
		merchantID := uuid.New()
		merchant := &repository.Merchant{
			ID:          merchantID,
			Name:        "Test Merchant",
			Status:      "active",
			DailyLimit:  decimal.NewFromFloat(1000.00),
			DailyUsed:   decimal.NewFromFloat(500.00),
			SingleLimit: decimal.NewFromFloat(500.00),
		}
		
		negativeDailyLimit := decimal.NewFromFloat(-100.00)
		req := &UpdateMerchantLimitsRequest{
			DailyLimit: &negativeDailyLimit,
			Reason:     "Test negative limit",
		}
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
		
		err := service.UpdateMerchantLimitsWithValidation(ctx, merchantID, req)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "daily limit cannot be negative")
		mockMerchantRepo.AssertExpectations(t)
	})
	
	t.Run("Reject daily limit less than current usage", func(t *testing.T) {
		merchantID := uuid.New()
		merchant := &repository.Merchant{
			ID:          merchantID,
			Name:        "Test Merchant",
			Status:      "active",
			DailyLimit:  decimal.NewFromFloat(1000.00),
			DailyUsed:   decimal.NewFromFloat(800.00),
			SingleLimit: decimal.NewFromFloat(500.00),
		}
		
		lowDailyLimit := decimal.NewFromFloat(500.00) // Less than current usage of 800
		req := &UpdateMerchantLimitsRequest{
			DailyLimit: &lowDailyLimit,
			Reason:     "Test low limit",
		}
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
		
		err := service.UpdateMerchantLimitsWithValidation(ctx, merchantID, req)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "is less than current usage")
		mockMerchantRepo.AssertExpectations(t)
	})
	
	t.Run("Reject single limit exceeding daily limit", func(t *testing.T) {
		merchantID := uuid.New()
		merchant := &repository.Merchant{
			ID:          merchantID,
			Name:        "Test Merchant",
			Status:      "active",
			DailyLimit:  decimal.NewFromFloat(1000.00),
			DailyUsed:   decimal.NewFromFloat(500.00),
			SingleLimit: decimal.NewFromFloat(500.00),
		}
		
		highSingleLimit := decimal.NewFromFloat(1500.00) // Greater than daily limit
		req := &UpdateMerchantLimitsRequest{
			SingleLimit: &highSingleLimit,
			Reason:      "Test high single limit",
		}
		
		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
		
		err := service.UpdateMerchantLimitsWithValidation(ctx, merchantID, req)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot exceed daily limit")
		mockMerchantRepo.AssertExpectations(t)
	})
}

func TestLimitService_GetLimitUtilizationReport(t *testing.T) {
	ctx := context.Background()
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockAccountRepo := &MockReceiveAccountRepository{}
	mockLimitAlertRepo := &MockLimitAlertRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	
	// Create service
	service := NewLimitService(mockMerchantRepo, mockAccountRepo, mockLimitAlertRepo, mockRechargeOrderRepo)
	
	t.Run("Generate utilization report successfully", func(t *testing.T) {
		startDate := time.Now().AddDate(0, 0, -7)
		endDate := time.Now()
		filter := &LimitUtilizationFilter{
			StartDate:   startDate,
			EndDate:     endDate,
			Granularity: "daily",
		}
		
		merchants := []*repository.Merchant{
			{
				ID:          uuid.New(),
				Name:        "High Usage Merchant",
				Status:      "active",
				DailyLimit:  decimal.NewFromFloat(1000.00),
				DailyUsed:   decimal.NewFromFloat(950.00), // 95% usage - critical
			},
			{
				ID:          uuid.New(),
				Name:        "Medium Usage Merchant",
				Status:      "active",
				DailyLimit:  decimal.NewFromFloat(1000.00),
				DailyUsed:   decimal.NewFromFloat(850.00), // 85% usage - high
			},
			{
				ID:          uuid.New(),
				Name:        "Low Usage Merchant",
				Status:      "active",
				DailyLimit:  decimal.NewFromFloat(1000.00),
				DailyUsed:   decimal.NewFromFloat(300.00), // 30% usage - normal
			},
		}
		
		accounts := []*repository.ReceiveAccount{
			{
				ID:          uuid.New(),
				AccountName: "Test Account",
				Status:      "active",
				DailyLimit:  decimal.NewFromFloat(500.00),
				DailyUsed:   decimal.NewFromFloat(400.00), // 80% usage
			},
		}
		
		mockMerchantRepo.On("List", ctx, mock.MatchedBy(func(f *repository.MerchantFilter) bool {
			return f.Status != nil && *f.Status == "active"
		})).Return(merchants, nil)
		
		mockAccountRepo.On("List", ctx, mock.MatchedBy(func(f *repository.ReceiveAccountFilter) bool {
			return f.Status != nil && *f.Status == "active"
		})).Return(accounts, nil)
		
		report, err := service.GetLimitUtilizationReport(ctx, filter)
		
		assert.NoError(t, err)
		assert.NotNil(t, report)
		assert.Equal(t, 3, report.Summary.TotalMerchants)
		assert.Equal(t, 1, report.Summary.TotalAccounts)
		assert.Equal(t, 2, report.Summary.HighUtilization)    // 85% and 95% usage merchants
		assert.Equal(t, 1, report.Summary.CriticalUtilization) // 95% usage merchant
		assert.Len(t, report.Merchants, 3)
		assert.Len(t, report.Accounts, 1)
		
		mockMerchantRepo.AssertExpectations(t)
		mockAccountRepo.AssertExpectations(t)
	})
}
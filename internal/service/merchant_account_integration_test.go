package service

import (
	"context"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

// Integration test to verify the service implementation compiles and basic functionality works
func TestMerchantAccountService_Integration_BasicFunctionality(t *testing.T) {
	// This test verifies that our service implementation compiles correctly
	// and basic functionality works with mock repositories
	
	// Create mock repositories
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockMerchantAccountRepo := &MockMerchantReceiveAccountRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}

	// Create service instance
	service := NewMerchantAccountService(
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockMerchantAccountRepo,
		mockRechargeOrderRepo,
	)

	// Verify service is not nil
	assert.NotNil(t, service)
	
	// Verify service implements the interface
	var _ MerchantAccountService = service
}

func TestMerchantAccountService_Integration_TypeValidation(t *testing.T) {
	// Test that our types are correctly defined and can be used
	
	// Test BindAccountRequest
	req := &BindAccountRequest{
		MerchantID: uuid.New(),
		AccountID:  uuid.New(),
		Priority:   75,
	}
	assert.NotNil(t, req)
	assert.True(t, ValidatePriority(req.Priority))
	
	// Test TimeRange
	timeRange := TimeRange{
		StartDate: time.Now().AddDate(0, 0, -30),
		EndDate:   time.Now(),
	}
	assert.True(t, ValidateTimeRange(timeRange.StartDate, timeRange.EndDate))
	
	// Test MerchantAccountInfo
	accountInfo := &MerchantAccountInfo{
		ID:                   uuid.New(),
		MerchantID:          uuid.New(),
		ReceiveAccountID:    uuid.New(),
		AccountName:         "Test Account",
		AccountNumber:       "123456789",
		AccountType:         "bank",
		PaymentType:         "business",
		AccountHolder:       "Test Holder",
		Priority:            75,
		IsActive:            true,
		Status:              "active",
		DailyLimit:          decimal.NewFromInt(5000),
		SingleLimit:         decimal.NewFromInt(500),
		DailyUsed:           decimal.NewFromInt(100),
		RemainingDailyLimit: decimal.NewFromInt(4900),
		BoundAt:             time.Now(),
	}
	assert.NotNil(t, accountInfo)
	assert.Equal(t, "Test Account", accountInfo.AccountName)
	assert.Equal(t, 75, accountInfo.Priority)
	
	// Test ValidationResult
	validationResult := &ValidationResult{
		IsValid:  true,
		Errors:   []string{},
		Warnings: []string{"Test warning"},
	}
	assert.True(t, validationResult.IsValid)
	assert.Empty(t, validationResult.Errors)
	assert.Len(t, validationResult.Warnings, 1)
	
	// Test AvailabilityResult
	availabilityResult := &AvailabilityResult{
		AccountID:            uuid.New(),
		IsAvailable:          true,
		Reasons:              []string{},
		RemainingDailyLimit:  decimal.NewFromInt(4900),
		SingleLimit:          decimal.NewFromInt(500),
		UtilizationRate:      decimal.NewFromInt(2),
	}
	assert.True(t, availabilityResult.IsAvailable)
	assert.Empty(t, availabilityResult.Reasons)
	
	// Test AccountUsageStats
	usageStats := &AccountUsageStats{
		AccountID:        uuid.New(),
		AccountName:      "Test Account",
		TimeRange:        timeRange,
		TransactionCount: 10,
		TotalAmount:      decimal.NewFromInt(1000),
		SuccessfulCount:  9,
		FailedCount:      1,
		SuccessRate:      CalculateSuccessRate(9, 10),
		UtilizationRate:  decimal.NewFromInt(20),
		AverageAmount:    CalculateAverageAmount(decimal.NewFromInt(1000), 10),
	}
	assert.Equal(t, int64(10), usageStats.TransactionCount)
	assert.Equal(t, decimal.NewFromInt(90), usageStats.SuccessRate)
	assert.Equal(t, decimal.NewFromInt(100), usageStats.AverageAmount)
	
	// Test LoadBalancingRecommendation
	recommendation := &LoadBalancingRecommendation{
		AccountID:            uuid.New(),
		AccountName:          "Test Account",
		RecommendationType:   RecommendationOptimal,
		Description:          "Account usage is well balanced",
		Priority:             PriorityLow,
		SuggestedAction:      "No action needed",
		CurrentUtilization:   decimal.NewFromInt(50),
	}
	assert.Equal(t, RecommendationOptimal, recommendation.RecommendationType)
	assert.Equal(t, PriorityLow, recommendation.Priority)
	
	// Test BatchOperationResult
	batchResult := &BatchOperationResult{
		TotalRequested: 5,
		Successful:     4,
		Failed:         1,
		Errors:         []string{"One account failed"},
	}
	assert.Equal(t, 5, batchResult.TotalRequested)
	assert.Equal(t, 4, batchResult.Successful)
	assert.Equal(t, 1, batchResult.Failed)
	assert.Len(t, batchResult.Errors, 1)
	
	// Test AccountStatusInfo
	statusInfo := &AccountStatusInfo{
		MerchantID:      uuid.New(),
		AccountID:       uuid.New(),
		IsBindingActive: true,
		AccountStatus:   AccountStatusActive,
		Priority:        75,
		DailyLimit:      decimal.NewFromInt(5000),
		DailyUsed:       decimal.NewFromInt(100),
		UtilizationRate: CalculateUtilizationRate(decimal.NewFromInt(100), decimal.NewFromInt(5000)),
		BoundAt:         time.Now(),
	}
	assert.True(t, statusInfo.IsBindingActive)
	assert.Equal(t, AccountStatusActive, statusInfo.AccountStatus)
	assert.Equal(t, decimal.NewFromInt(2), statusInfo.UtilizationRate)
}

func TestMerchantAccountService_Integration_HelperFunctions(t *testing.T) {
	// Test helper functions
	
	// Test CalculateSuccessRate
	successRate := CalculateSuccessRate(9, 10)
	assert.Equal(t, decimal.NewFromInt(90), successRate)
	
	successRateZero := CalculateSuccessRate(0, 0)
	assert.Equal(t, decimal.Zero, successRateZero)
	
	// Test CalculateUtilizationRate
	utilizationRate := CalculateUtilizationRate(decimal.NewFromInt(100), decimal.NewFromInt(5000))
	assert.Equal(t, decimal.NewFromInt(2), utilizationRate)
	
	utilizationRateZero := CalculateUtilizationRate(decimal.NewFromInt(100), decimal.Zero)
	assert.Equal(t, decimal.Zero, utilizationRateZero)
	
	// Test CalculateAverageAmount
	averageAmount := CalculateAverageAmount(decimal.NewFromInt(1000), 10)
	assert.Equal(t, decimal.NewFromInt(100), averageAmount)
	
	averageAmountZero := CalculateAverageAmount(decimal.NewFromInt(1000), 0)
	assert.Equal(t, decimal.Zero, averageAmountZero)
	
	// Test ValidatePriority
	assert.True(t, ValidatePriority(1))
	assert.True(t, ValidatePriority(50))
	assert.True(t, ValidatePriority(100))
	assert.False(t, ValidatePriority(0))
	assert.False(t, ValidatePriority(101))
	
	// Test ValidateTimeRange
	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	tomorrow := now.AddDate(0, 0, 1)
	
	assert.True(t, ValidateTimeRange(yesterday, now))
	assert.False(t, ValidateTimeRange(now, yesterday))
	assert.False(t, ValidateTimeRange(time.Time{}, now))
	assert.False(t, ValidateTimeRange(now, time.Time{}))
	
	// Test ValidateAccountBinding
	merchantID := uuid.New()
	accountID := uuid.New()
	
	errors := ValidateAccountBinding(merchantID, accountID, 75)
	assert.Empty(t, errors)
	
	errorsInvalid := ValidateAccountBinding(uuid.Nil, uuid.Nil, 150)
	assert.Len(t, errorsInvalid, 3) // merchant_id, account_id, priority errors
}

func TestMerchantAccountService_Integration_Constants(t *testing.T) {
	// Test that all constants are properly defined
	
	// Recommendation types
	assert.Equal(t, "REDUCE_LOAD", RecommendationReduceLoad)
	assert.Equal(t, "INCREASE_LOAD", RecommendationIncreaseLoad)
	assert.Equal(t, "INCREASE_LIMITS", RecommendationIncreaseLimits)
	assert.Equal(t, "OPTIMAL", RecommendationOptimal)
	assert.Equal(t, "REBALANCE", RecommendationRebalance)
	assert.Equal(t, "ADD_ACCOUNT", RecommendationAddAccount)
	assert.Equal(t, "REMOVE_ACCOUNT", RecommendationRemoveAccount)
	
	// Priority levels
	assert.Equal(t, "HIGH", PriorityHigh)
	assert.Equal(t, "MEDIUM", PriorityMedium)
	assert.Equal(t, "LOW", PriorityLow)
	
	// Account status
	assert.Equal(t, "active", AccountStatusActive)
	assert.Equal(t, "inactive", AccountStatusInactive)
	assert.Equal(t, "suspended", AccountStatusSuspended)
	assert.Equal(t, "closed", AccountStatusClosed)
	
	// Binding status
	assert.True(t, BindingStatusActive)
	assert.False(t, BindingStatusInactive)
	
	// Validation constants
	assert.Equal(t, 1, MinPriority)
	assert.Equal(t, 100, MaxPriority)
	assert.Equal(t, 50, MaxAccountsPerMerchant)
	assert.Equal(t, 50, DefaultPriority)
}

func TestMerchantAccountService_Integration_BuilderFunctions(t *testing.T) {
	// Test builder functions
	
	// Create test data
	merchantID := uuid.New()
	accountID := uuid.New()
	
	relationship := &repository.MerchantReceiveAccount{
		ID:               uuid.New(),
		MerchantID:       merchantID,
		ReceiveAccountID: accountID,
		Weight:           75,
		IsActive:         true,
		CreatedAt:        time.Now(),
	}
	
	account := &repository.ReceiveAccount{
		ID:            accountID,
		AccountName:   "Test Account",
		AccountNumber: "123456789",
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   "business",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(5000),
		SingleLimit:   decimal.NewFromInt(500),
		DailyUsed:     decimal.NewFromInt(100),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	
	usageStats := &AccountUsageStats{
		AccountID:        accountID,
		AccountName:      "Test Account",
		TransactionCount: 10,
		TotalAmount:      decimal.NewFromInt(1000),
		SuccessfulCount:  9,
		FailedCount:      1,
		SuccessRate:      decimal.NewFromInt(90),
		UtilizationRate:  decimal.NewFromInt(20),
	}
	
	// Test BuildMerchantAccountInfo
	accountInfo := BuildMerchantAccountInfo(relationship, account, usageStats)
	assert.NotNil(t, accountInfo)
	assert.Equal(t, relationship.ID, accountInfo.ID)
	assert.Equal(t, merchantID, accountInfo.MerchantID)
	assert.Equal(t, accountID, accountInfo.ReceiveAccountID)
	assert.Equal(t, account.AccountName, accountInfo.AccountName)
	assert.Equal(t, relationship.Weight, accountInfo.Priority)
	assert.Equal(t, relationship.IsActive, accountInfo.IsActive)
	assert.Equal(t, account.Status, accountInfo.Status)
	assert.Equal(t, decimal.NewFromInt(4900), accountInfo.RemainingDailyLimit)
	assert.Equal(t, usageStats, accountInfo.UsageStats)
	
	// Test BuildAvailableAccountInfo
	amount := decimal.NewFromInt(100)
	priority := 75
	availabilityScore := 85
	
	availableInfo := BuildAvailableAccountInfo(account, priority, amount, availabilityScore)
	assert.NotNil(t, availableInfo)
	assert.Equal(t, accountID, availableInfo.AccountID)
	assert.Equal(t, account.AccountName, availableInfo.AccountName)
	assert.Equal(t, priority, availableInfo.Priority)
	assert.True(t, availableInfo.CanAcceptAmount)
	assert.Empty(t, availableInfo.LimitCheckReason)
	assert.Equal(t, availabilityScore, availableInfo.AvailabilityScore)
	assert.Equal(t, decimal.NewFromInt(4900), availableInfo.RemainingDailyLimit)
	
	// Test with amount exceeding single limit
	largeAmount := decimal.NewFromInt(1000) // Exceeds single limit of 500
	availableInfoLarge := BuildAvailableAccountInfo(account, priority, largeAmount, availabilityScore)
	assert.False(t, availableInfoLarge.CanAcceptAmount)
	assert.Contains(t, availableInfoLarge.LimitCheckReason, "single transaction limit")
	
	// Test with amount exceeding remaining daily limit
	account.DailyUsed = decimal.NewFromInt(4950) // Only 50 remaining
	mediumAmount := decimal.NewFromInt(100) // Exceeds remaining 50
	availableInfoMedium := BuildAvailableAccountInfo(account, priority, mediumAmount, availabilityScore)
	assert.False(t, availableInfoMedium.CanAcceptAmount)
	assert.Contains(t, availableInfoMedium.LimitCheckReason, "remaining daily limit")
}
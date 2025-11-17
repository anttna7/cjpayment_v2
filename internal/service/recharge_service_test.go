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

func TestRechargeService_CreateRechargeOrder(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	accountID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)

	// Setup test data
	merchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Status: "active",
	}

	receiveAccount := &repository.ReceiveAccount{
		ID:          accountID,
		AccountName: "Test Account",
		Status:      "active",
		PaymentType: "private",
		SingleLimit: decimal.NewFromFloat(5000.00),
		DailyLimit:  decimal.NewFromFloat(10000.00),
		DailyUsed:   decimal.NewFromFloat(2000.00),
	}

	limitResult := &LimitCheckResult{
		Allowed: true,
	}

	// Setup mock expectations
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
	mockLimitService.On("CheckMerchantLimits", ctx, merchantID, amount).Return(limitResult, nil)
	mockRotationService.On("SelectAccount", ctx, merchantID, amount, "private").Return(receiveAccount, nil)
	mockLimitService.On("CheckAccountLimits", ctx, accountID, amount).Return(limitResult, nil)
	mockRechargeOrderRepo.On("GetByOrderNumber", ctx, mock.AnythingOfType("string")).Return(nil, assert.AnError)
	mockRechargeOrderRepo.On("Create", ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	// Test request
	req := &CreateRechargeOrderRequest{
		PayerName:    "Test Payer",
		PayerAccount: "123456789",
		PaymentType:  "private",
		Amount:       amount,
		MerchantID:   merchantID,
		AdAccount:    "test-ad-account",
	}

	// Execute
	order, err := service.CreateRechargeOrder(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, order)
	assert.Equal(t, req.PayerName, order.PayerName)
	assert.Equal(t, req.PayerAccount, order.PayerAccount)
	assert.Equal(t, req.PaymentType, order.PaymentType)
	assert.Equal(t, req.Amount, order.Amount)
	assert.Equal(t, req.MerchantID, order.MerchantID)
	assert.Equal(t, req.AdAccount, order.AdAccount)
	assert.Equal(t, accountID, order.ReceiveAccountID)
	assert.Equal(t, OrderStatusPending, order.Status)
	assert.NotEmpty(t, order.OrderNumber)
	assert.True(t, order.OrderNumber[:2] == "CJ")

	// Verify mock calls
	mockMerchantRepo.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
	mockRotationService.AssertExpectations(t)
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_CreateRechargeOrder_MerchantNotFound(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()

	// Setup mock expectations
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(nil, assert.AnError)

	// Test request
	req := &CreateRechargeOrderRequest{
		PayerName:    "Test Payer",
		PayerAccount: "123456789",
		PaymentType:  "private",
		Amount:       decimal.NewFromFloat(1000.00),
		MerchantID:   merchantID,
		AdAccount:    "test-ad-account",
	}

	// Execute
	order, err := service.CreateRechargeOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, order)
	assert.Contains(t, err.Error(), "merchant not found")

	// Verify mock calls
	mockMerchantRepo.AssertExpectations(t)
}

func TestRechargeService_CreateRechargeOrder_LimitExceeded(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)

	// Setup test data
	merchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Status: "active",
	}

	limitResult := &LimitCheckResult{
		Allowed: false,
		Reason:  "Daily limit exceeded",
	}

	// Setup mock expectations
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
	mockLimitService.On("CheckMerchantLimits", ctx, merchantID, amount).Return(limitResult, nil)

	// Test request
	req := &CreateRechargeOrderRequest{
		PayerName:    "Test Payer",
		PayerAccount: "123456789",
		PaymentType:  "private",
		Amount:       amount,
		MerchantID:   merchantID,
		AdAccount:    "test-ad-account",
	}

	// Execute
	order, err := service.CreateRechargeOrder(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, order)
	assert.Contains(t, err.Error(), "merchant limit exceeded")
	assert.Contains(t, err.Error(), "Daily limit exceeded")

	// Verify mock calls
	mockMerchantRepo.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
}

func TestRechargeService_UpdateOrderStatus(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	orderID := uuid.New()
	userID := uuid.New()

	// Setup test data
	order := &repository.RechargeOrder{
		ID:     orderID,
		Status: OrderStatusPending,
	}

	// Setup mock expectations
	mockRechargeOrderRepo.On("GetByID", ctx, orderID).Return(order, nil)
	mockRechargeOrderRepo.On("Update", ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	// Execute
	err := service.UpdateOrderStatus(ctx, orderID, OrderStatusPaid, nil, &userID)

	// Assert
	assert.NoError(t, err)

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_UpdateOrderStatus_InvalidTransition(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	orderID := uuid.New()

	// Setup test data
	order := &repository.RechargeOrder{
		ID:     orderID,
		Status: OrderStatusCompleted,
	}

	// Setup mock expectations
	mockRechargeOrderRepo.On("GetByID", ctx, orderID).Return(order, nil)

	// Execute
	err := service.UpdateOrderStatus(ctx, orderID, OrderStatusPending, nil, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid status transition")

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_ProcessPrivateRecharge(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	orderID := uuid.New()
	userID := uuid.New()
	voucherURL := "https://example.com/voucher.jpg"

	// Setup test data
	order := &repository.RechargeOrder{
		ID:     orderID,
		Status: OrderStatusPending,
	}

	// Setup mock expectations
	mockRechargeOrderRepo.On("GetByID", ctx, orderID).Return(order, nil)
	mockRechargeOrderRepo.On("Update", ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	// Execute
	err := service.ProcessPrivateRecharge(ctx, orderID, voucherURL, &userID)

	// Assert
	assert.NoError(t, err)

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_GenerateOrderNumber(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()

	// Setup mock expectations
	mockRechargeOrderRepo.On("GetByOrderNumber", ctx, mock.AnythingOfType("string")).Return(nil, assert.AnError)

	// Execute
	orderNumber, err := service.GenerateOrderNumber(ctx)

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, orderNumber)
	assert.True(t, len(orderNumber) == 18) // CJ + 8 digits date + 8 digits random
	assert.True(t, orderNumber[:2] == "CJ")
	
	// Check date format
	today := time.Now().Format("20060102")
	assert.Equal(t, today, orderNumber[2:10])

	// Verify mock calls
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestRechargeService_AllocateReceiveAccount(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	accountID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)
	paymentType := "private"

	// Setup test data
	receiveAccount := &repository.ReceiveAccount{
		ID:          accountID,
		AccountName: "Test Account",
		Status:      "active",
		PaymentType: paymentType,
		SingleLimit: decimal.NewFromFloat(5000.00),
		DailyLimit:  decimal.NewFromFloat(10000.00),
		DailyUsed:   decimal.NewFromFloat(2000.00),
	}

	limitResult := &LimitCheckResult{
		Allowed: true,
	}

	// Setup mock expectations
	mockRotationService.On("SelectAccount", ctx, merchantID, amount, paymentType).Return(receiveAccount, nil)
	mockLimitService.On("CheckAccountLimits", ctx, accountID, amount).Return(limitResult, nil)

	// Execute
	account, err := service.AllocateReceiveAccount(ctx, merchantID, amount, paymentType)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, account)
	assert.Equal(t, accountID, account.ID)

	// Verify mock calls
	mockRotationService.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
}

func TestRechargeService_AllocateReceiveAccount_Fallback(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	accountID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)
	paymentType := "private"

	// Setup test data
	receiveAccount := &repository.ReceiveAccount{
		ID:          accountID,
		AccountName: "Test Account",
		Status:      "active",
		PaymentType: paymentType,
		SingleLimit: decimal.NewFromFloat(5000.00),
		DailyLimit:  decimal.NewFromFloat(10000.00),
		DailyUsed:   decimal.NewFromFloat(2000.00),
	}

	limitResult := &LimitCheckResult{
		Allowed: true,
	}

	// Setup mock expectations - rotation service fails
	mockRotationService.On("SelectAccount", ctx, merchantID, amount, paymentType).Return(nil, assert.AnError)
	mockReceiveAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return([]*repository.ReceiveAccount{receiveAccount}, nil)
	mockLimitService.On("CheckAccountLimits", ctx, accountID, amount).Return(limitResult, nil)

	// Execute
	account, err := service.AllocateReceiveAccount(ctx, merchantID, amount, paymentType)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, account)
	assert.Equal(t, accountID, account.ID)

	// Verify mock calls
	mockRotationService.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
}

func TestRechargeService_IsValidStatusTransition(t *testing.T) {
	service := &rechargeService{}

	tests := []struct {
		from     string
		to       string
		expected bool
	}{
		{OrderStatusPending, OrderStatusPaid, true},
		{OrderStatusPending, OrderStatusCancelled, true},
		{OrderStatusPending, OrderStatusFailed, true},
		{OrderStatusPending, OrderStatusCompleted, false},
		{OrderStatusPaid, OrderStatusConfirmed, true},
		{OrderStatusPaid, OrderStatusRefunded, true},
		{OrderStatusPaid, OrderStatusPending, false},
		{OrderStatusConfirmed, OrderStatusCompleted, true},
		{OrderStatusCompleted, OrderStatusRefunded, true},
		{OrderStatusCompleted, OrderStatusPending, false},
		{OrderStatusCancelled, OrderStatusPending, false},
		{OrderStatusRefunded, OrderStatusPending, false},
	}

	for _, test := range tests {
		result := service.isValidStatusTransition(test.from, test.to)
		assert.Equal(t, test.expected, result, 
			"Expected transition from %s to %s to be %v", test.from, test.to, test.expected)
	}
}

func TestRechargeService_AllocateReceiveAccountWithDetails(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	accountID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)
	paymentType := "private"

	// Setup test data
	receiveAccount := &repository.ReceiveAccount{
		ID:          accountID,
		AccountName: "Test Account",
		Status:      "active",
		PaymentType: paymentType,
		SingleLimit: decimal.NewFromFloat(5000.00),
		DailyLimit:  decimal.NewFromFloat(10000.00),
		DailyUsed:   decimal.NewFromFloat(2000.00),
	}

	limitResult := &LimitCheckResult{
		Allowed: true,
	}

	// Setup mock expectations - rotation service succeeds
	mockRotationService.On("SelectAccount", ctx, merchantID, amount, paymentType).Return(receiveAccount, nil)
	mockLimitService.On("CheckAccountLimits", ctx, accountID, amount).Return(limitResult, nil)

	// Execute
	result, err := service.AllocateReceiveAccountWithDetails(ctx, merchantID, amount, paymentType)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, receiveAccount, result.Account)
	assert.Equal(t, "rotation", result.AllocationMethod)
	assert.Contains(t, result.AttemptedMethods, "rotation")
	assert.Contains(t, result.Reason, "rotation service")

	// Verify mock calls
	mockRotationService.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
}

func TestRechargeService_AllocateReceiveAccountWithDetails_FallbackToDirect(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	accountID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)
	paymentType := "private"

	// Setup test data
	receiveAccount := &repository.ReceiveAccount{
		ID:          accountID,
		AccountName: "Test Account",
		Status:      "active",
		PaymentType: paymentType,
		SingleLimit: decimal.NewFromFloat(5000.00),
		DailyLimit:  decimal.NewFromFloat(10000.00),
		DailyUsed:   decimal.NewFromFloat(2000.00),
	}

	limitResult := &LimitCheckResult{
		Allowed: true,
	}

	// Setup mock expectations - rotation service fails, direct succeeds
	mockRotationService.On("SelectAccount", ctx, merchantID, amount, paymentType).Return(nil, assert.AnError)
	mockReceiveAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return([]*repository.ReceiveAccount{receiveAccount}, nil)
	mockLimitService.On("CheckAccountLimits", ctx, accountID, amount).Return(limitResult, nil)

	// Execute
	result, err := service.AllocateReceiveAccountWithDetails(ctx, merchantID, amount, paymentType)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, receiveAccount, result.Account)
	assert.Equal(t, "direct", result.AllocationMethod)
	assert.Contains(t, result.AttemptedMethods, "rotation")
	assert.Contains(t, result.AttemptedMethods, "direct")
	assert.Contains(t, result.Reason, "direct selection")

	// Verify mock calls
	mockRotationService.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
}

func TestRechargeService_ValidateAccountAllocation(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	accountID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)
	paymentType := "private"

	// Setup test data
	merchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Status: "active",
	}

	receiveAccount := &repository.ReceiveAccount{
		ID:          accountID,
		AccountName: "Test Account",
		Status:      "active",
		PaymentType: paymentType,
		SingleLimit: decimal.NewFromFloat(5000.00),
		DailyLimit:  decimal.NewFromFloat(10000.00),
		DailyUsed:   decimal.NewFromFloat(2000.00),
	}

	limitResult := &LimitCheckResult{
		Allowed: true,
	}

	// Setup mock expectations
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
	mockLimitService.On("CheckMerchantLimits", ctx, merchantID, amount).Return(limitResult, nil)
	mockReceiveAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return([]*repository.ReceiveAccount{receiveAccount}, nil)
	mockLimitService.On("CheckAccountLimits", ctx, accountID, amount).Return(limitResult, nil)

	// Execute
	validation, err := service.ValidateAccountAllocation(ctx, merchantID, amount, paymentType)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, validation)
	assert.True(t, validation.IsValid)
	assert.Equal(t, merchantID, validation.MerchantID)
	assert.Equal(t, amount, validation.Amount)
	assert.Equal(t, paymentType, validation.PaymentType)
	assert.Empty(t, validation.Issues)

	// Verify mock calls
	mockMerchantRepo.AssertExpectations(t)
	mockLimitService.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
}

func TestRechargeService_ValidateAccountAllocation_MerchantInactive(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()
	amount := decimal.NewFromFloat(1000.00)
	paymentType := "private"

	// Setup test data - inactive merchant
	merchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Status: "inactive",
	}

	// Setup mock expectations
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil)
	// Even though merchant is inactive, the validation continues to check other conditions
	limitResult := &LimitCheckResult{Allowed: false, Reason: "Merchant is inactive"}
	mockLimitService.On("CheckMerchantLimits", ctx, merchantID, amount).Return(limitResult, nil)
	mockReceiveAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return([]*repository.ReceiveAccount{}, nil)

	// Execute
	validation, err := service.ValidateAccountAllocation(ctx, merchantID, amount, paymentType)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, validation)
	assert.False(t, validation.IsValid)
	assert.Contains(t, validation.Issues, "Merchant is not active")

	// Verify mock calls
	mockMerchantRepo.AssertExpectations(t)
}

func TestRechargeService_GetAccountAllocationStats(t *testing.T) {
	// Setup mocks
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockRotationService := &MockRotationService{}
	mockLimitService := &MockLimitService{}

	service := NewRechargeService(
		mockRechargeOrderRepo,
		mockMerchantRepo,
		mockReceiveAccountRepo,
		mockRotationService,
		mockLimitService,
	)

	ctx := context.Background()
	merchantID := uuid.New()

	// Setup test data
	accounts := []*repository.ReceiveAccount{
		{
			ID:          uuid.New(),
			AccountName: "Active Account 1",
			Status:      "active",
			DailyLimit:  decimal.NewFromFloat(10000.00),
			DailyUsed:   decimal.NewFromFloat(8500.00), // 85% utilization
		},
		{
			ID:          uuid.New(),
			AccountName: "Active Account 2",
			Status:      "active",
			DailyLimit:  decimal.NewFromFloat(5000.00),
			DailyUsed:   decimal.NewFromFloat(2000.00), // 40% utilization
		},
		{
			ID:          uuid.New(),
			AccountName: "Inactive Account",
			Status:      "inactive",
			DailyLimit:  decimal.NewFromFloat(3000.00),
			DailyUsed:   decimal.NewFromFloat(1000.00),
		},
	}

	rules := []*repository.RotationRule{
		{
			ID:       uuid.New(),
			RuleName: "Active Rule",
			IsActive: true,
		},
		{
			ID:       uuid.New(),
			RuleName: "Inactive Rule",
			IsActive: false,
		},
	}

	// Setup mock expectations
	mockReceiveAccountRepo.On("GetByMerchant", ctx, merchantID).Return(accounts, nil)
	mockRotationService.On("GetMerchantRotationRules", ctx, merchantID).Return(rules, nil)

	// Execute
	stats, err := service.GetAccountAllocationStats(ctx, merchantID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, merchantID, stats.MerchantID)
	assert.Equal(t, 3, stats.TotalAccounts)
	assert.Equal(t, 2, stats.ActiveAccounts)
	assert.Equal(t, 1, stats.HighUtilizationAccounts) // Account 1 has 85% utilization
	assert.Equal(t, 2, stats.RotationRules)
	assert.Equal(t, 1, stats.ActiveRotationRules)

	// Verify mock calls
	mockReceiveAccountRepo.AssertExpectations(t)
	mockRotationService.AssertExpectations(t)
}

func TestRechargeService_PrioritizeAccountsByLimits(t *testing.T) {
	service := &rechargeService{}

	// Setup test data
	accounts := []*repository.ReceiveAccount{
		{
			ID:          uuid.New(),
			AccountName: "Low Remaining",
			DailyLimit:  decimal.NewFromFloat(10000.00),
			DailyUsed:   decimal.NewFromFloat(9000.00), // 1000 remaining
		},
		{
			ID:          uuid.New(),
			AccountName: "High Remaining",
			DailyLimit:  decimal.NewFromFloat(5000.00),
			DailyUsed:   decimal.NewFromFloat(1000.00), // 4000 remaining
		},
		{
			ID:          uuid.New(),
			AccountName: "Medium Remaining",
			DailyLimit:  decimal.NewFromFloat(8000.00),
			DailyUsed:   decimal.NewFromFloat(5000.00), // 3000 remaining
		},
	}

	amount := decimal.NewFromFloat(500.00)

	// Execute
	prioritized := service.prioritizeAccountsByLimits(context.Background(), accounts, amount)

	// Assert - should be ordered by remaining limit (descending)
	assert.Len(t, prioritized, 3)
	assert.Equal(t, "High Remaining", prioritized[0].AccountName)   // 4000 remaining
	assert.Equal(t, "Medium Remaining", prioritized[1].AccountName) // 3000 remaining
	assert.Equal(t, "Low Remaining", prioritized[2].AccountName)    // 1000 remaining
}

func TestRechargeService_IsAccountSuitable(t *testing.T) {
	service := &rechargeService{}

	tests := []struct {
		name        string
		account     *repository.ReceiveAccount
		amount      decimal.Decimal
		paymentType string
		expected    bool
	}{
		{
			name: "Suitable account",
			account: &repository.ReceiveAccount{
				Status:      "active",
				PaymentType: "private",
				SingleLimit: decimal.NewFromFloat(5000.00),
			},
			amount:      decimal.NewFromFloat(1000.00),
			paymentType: "private",
			expected:    true,
		},
		{
			name: "Inactive account",
			account: &repository.ReceiveAccount{
				Status:      "inactive",
				PaymentType: "private",
				SingleLimit: decimal.NewFromFloat(5000.00),
			},
			amount:      decimal.NewFromFloat(1000.00),
			paymentType: "private",
			expected:    false,
		},
		{
			name: "Wrong payment type",
			account: &repository.ReceiveAccount{
				Status:      "active",
				PaymentType: "public",
				SingleLimit: decimal.NewFromFloat(5000.00),
			},
			amount:      decimal.NewFromFloat(1000.00),
			paymentType: "private",
			expected:    false,
		},
		{
			name: "Amount exceeds single limit",
			account: &repository.ReceiveAccount{
				Status:      "active",
				PaymentType: "private",
				SingleLimit: decimal.NewFromFloat(500.00),
			},
			amount:      decimal.NewFromFloat(1000.00),
			paymentType: "private",
			expected:    false,
		},
		{
			name: "Zero single limit (no limit)",
			account: &repository.ReceiveAccount{
				Status:      "active",
				PaymentType: "private",
				SingleLimit: decimal.Zero,
			},
			amount:      decimal.NewFromFloat(1000.00),
			paymentType: "private",
			expected:    true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			result := service.isAccountSuitable(test.account, test.amount, test.paymentType)
			assert.Equal(t, test.expected, result)
		})
	}
}
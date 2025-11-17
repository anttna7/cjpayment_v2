package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/company/cjpayment/internal/repository"
)

func TestAccountValidationService_ValidateAccount(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	tests := []struct {
		name     string
		account  *repository.ReceiveAccount
		mockFunc func()
		wantErr  bool
		errCount int
	}{
		{
			name: "Valid account",
			account: &repository.ReceiveAccount{
				AccountName:   "测试支付宝账户",
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
				DailyUsed:     decimal.NewFromFloat(1000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  false,
			errCount: 0,
		},
		{
			name: "Invalid account - missing required fields",
			account: &repository.ReceiveAccount{
				AccountName:   "", // Empty required field
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "",  // Empty required field
				PaymentType:   "",  // Empty required field
				Status:        "",  // Empty required field
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 4, // 4 required fields missing
		},
		{
			name: "Invalid account - bank type without bank name",
			account: &repository.ReceiveAccount{
				AccountName:   "测试银行账户",
				AccountNumber: "1234567890123456",
				AccountType:   "bank",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
				// BankName is nil but required for bank type
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "1234567890123456").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Invalid account - other type without custom provider",
			account: &repository.ReceiveAccount{
				AccountName:   "测试其他账户",
				AccountNumber: "other123456",
				AccountType:   "other",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
				// CustomPaymentProvider is nil but required for other type
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "other123456").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Invalid account - single limit greater than daily limit",
			account: &repository.ReceiveAccount{
				AccountName:   "测试账户",
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(5000.00),  // Smaller than single limit
				SingleLimit:   decimal.NewFromFloat(10000.00), // Greater than daily limit
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Invalid account - daily used exceeds daily limit",
			account: &repository.ReceiveAccount{
				AccountName:   "测试账户",
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(5000.00),
				SingleLimit:   decimal.NewFromFloat(3000.00),
				DailyUsed:     decimal.NewFromFloat(6000.00), // Exceeds daily limit
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			// Setup mock
			tt.mockFunc()

			// Execute validation
			result := service.ValidateAccount(context.Background(), tt.account)

			// Assertions
			if tt.wantErr {
				assert.False(t, result.Valid)
				assert.GreaterOrEqual(t, len(result.Errors), tt.errCount)
			} else {
				assert.True(t, result.Valid)
				assert.Empty(t, result.Errors)
			}

			// Verify mock expectations
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestAccountValidationService_ValidateAccountForUpdate(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	accountID := uuid.New()
	existingAccount := &repository.ReceiveAccount{
		ID:            accountID,
		AccountName:   "现有账户",
		AccountNumber: "existing@example.com",
		AccountType:   "alipay",
		AccountHolder: "张三",
		PaymentType:   "private",
		Status:        "active",
		DailyLimit:    decimal.NewFromFloat(10000.00),
		SingleLimit:   decimal.NewFromFloat(5000.00),
		DailyUsed:     decimal.NewFromFloat(2000.00),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	tests := []struct {
		name     string
		id       uuid.UUID
		account  *repository.ReceiveAccount
		mockFunc func()
		wantErr  bool
		errCount int
	}{
		{
			name: "Valid update",
			id:   accountID,
			account: &repository.ReceiveAccount{
				AccountName:   "更新的账户",
				AccountNumber: "existing@example.com", // Same as existing
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "inactive", // Valid transition from active
				DailyLimit:    decimal.NewFromFloat(15000.00),
				SingleLimit:   decimal.NewFromFloat(7000.00),
				DailyUsed:     decimal.NewFromFloat(2000.00),
			},
			mockFunc: func() {
				mockRepo.On("GetByID", mock.Anything, accountID).Return(existingAccount, nil)
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "existing@example.com").Return(true, nil)
				mockRepo.On("GetByAccountNumber", mock.Anything, "existing@example.com").Return(existingAccount, nil)
			},
			wantErr:  false,
			errCount: 0,
		},
		{
			name: "Invalid status transition",
			id:   accountID,
			account: &repository.ReceiveAccount{
				AccountName:   "更新的账户",
				AccountNumber: "existing@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active", // Invalid: closed -> active
				DailyLimit:    decimal.NewFromFloat(15000.00),
				SingleLimit:   decimal.NewFromFloat(7000.00),
				DailyUsed:     decimal.NewFromFloat(2000.00),
			},
			mockFunc: func() {
				closedAccount := *existingAccount
				closedAccount.Status = "closed"
				mockRepo.On("GetByID", mock.Anything, accountID).Return(&closedAccount, nil)
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "existing@example.com").Return(true, nil)
				mockRepo.On("GetByAccountNumber", mock.Anything, "existing@example.com").Return(&closedAccount, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Daily limit below current usage",
			id:   accountID,
			account: &repository.ReceiveAccount{
				AccountName:   "更新的账户",
				AccountNumber: "existing@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(1000.00), // Less than current usage (2000)
				SingleLimit:   decimal.NewFromFloat(500.00),
				DailyUsed:     decimal.NewFromFloat(2000.00),
			},
			mockFunc: func() {
				mockRepo.On("GetByID", mock.Anything, accountID).Return(existingAccount, nil)
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "existing@example.com").Return(true, nil)
				mockRepo.On("GetByAccountNumber", mock.Anything, "existing@example.com").Return(existingAccount, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			// Setup mock
			tt.mockFunc()

			// Execute validation
			result := service.ValidateAccountForUpdate(context.Background(), tt.id, tt.account)

			// Assertions
			if tt.wantErr {
				assert.False(t, result.Valid)
				assert.GreaterOrEqual(t, len(result.Errors), tt.errCount)
			} else {
				assert.True(t, result.Valid)
				assert.Empty(t, result.Errors)
			}

			// Verify mock expectations
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestAccountValidationService_ValidateAccountCreation(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	tests := []struct {
		name     string
		account  *repository.ReceiveAccount
		mockFunc func()
		wantErr  bool
		errCount int
	}{
		{
			name: "Valid creation",
			account: &repository.ReceiveAccount{
				AccountName:   "新账户",
				AccountNumber: "new@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				// Status will be set to "active" by default
				DailyLimit:  decimal.NewFromFloat(10000.00),
				SingleLimit: decimal.NewFromFloat(5000.00),
				// DailyUsed will be set to zero by default
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "new@example.com").Return(false, nil)
			},
			wantErr:  false,
			errCount: 0,
		},
		{
			name: "Duplicate account number",
			account: &repository.ReceiveAccount{
				AccountName:   "新账户",
				AccountNumber: "duplicate@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "duplicate@example.com").Return(true, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Invalid initial status",
			account: &repository.ReceiveAccount{
				AccountName:   "新账户",
				AccountNumber: "new@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "suspended", // Invalid initial status
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "new@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			// Setup mock
			tt.mockFunc()

			// Execute validation
			result := service.ValidateAccountCreation(context.Background(), tt.account)

			// Check default values were set
			if tt.account.Status == "" {
				assert.Equal(t, "active", tt.account.Status)
			}
			if tt.account.DailyUsed.IsZero() {
				assert.True(t, tt.account.DailyUsed.Equal(decimal.Zero))
			}

			// Assertions
			if tt.wantErr {
				assert.False(t, result.Valid)
				assert.GreaterOrEqual(t, len(result.Errors), tt.errCount)
			} else {
				assert.True(t, result.Valid)
				assert.Empty(t, result.Errors)
			}

			// Verify mock expectations
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestAccountValidationService_IsValidStatusTransition(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	tests := []struct {
		name string
		from string
		to   string
		want bool
	}{
		{"active to inactive", "active", "inactive", true},
		{"active to suspended", "active", "suspended", true},
		{"active to closed", "active", "closed", true},
		{"inactive to active", "inactive", "active", true},
		{"inactive to closed", "inactive", "closed", true},
		{"suspended to active", "suspended", "active", true},
		{"suspended to inactive", "suspended", "inactive", true},
		{"suspended to closed", "suspended", "closed", true},
		{"closed to active", "closed", "active", false},
		{"closed to inactive", "closed", "inactive", false},
		{"closed to suspended", "closed", "suspended", false},
		{"invalid from status", "invalid", "active", false},
		{"invalid to status", "active", "invalid", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.isValidStatusTransition(tt.from, tt.to)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestAccountValidationService_SanitizeAccount(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	customProvider := "  Custom Provider  "
	bankName := "  中国银行  "
	bankBranch := "  北京分行  "

	account := &repository.ReceiveAccount{
		AccountName:           "  测试账户  ",
		AccountNumber:         "  test@example.com  ",
		AccountType:           "  ALIPAY  ",
		CustomPaymentProvider: &customProvider,
		BankName:              &bankName,
		BankBranch:            &bankBranch,
		AccountHolder:         "  张三  ",
		PaymentType:           "  PRIVATE  ",
		Status:                "  ACTIVE  ",
	}

	service.SanitizeAccount(account)

	assert.Equal(t, "测试账户", account.AccountName)
	assert.Equal(t, "test@example.com", account.AccountNumber)
	assert.Equal(t, "alipay", account.AccountType)
	assert.Equal(t, "Custom Provider", *account.CustomPaymentProvider)
	assert.Equal(t, "中国银行", *account.BankName)
	assert.Equal(t, "北京分行", *account.BankBranch)
	assert.Equal(t, "张三", account.AccountHolder)
	assert.Equal(t, "private", account.PaymentType)
	assert.Equal(t, "active", account.Status)
}

func TestAccountValidationService_GetValidationRules(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	rules := service.GetValidationRules()

	assert.NotNil(t, rules)
	assert.Contains(t, rules, "account_name")
	assert.Contains(t, rules, "account_number")
	assert.Contains(t, rules, "account_type")
	assert.Contains(t, rules, "account_holder")
	assert.Contains(t, rules, "payment_type")
	assert.Contains(t, rules, "status")

	// Check account_name rules
	accountNameRules := rules["account_name"].(map[string]interface{})
	assert.Equal(t, true, accountNameRules["required"])
	assert.Equal(t, 2, accountNameRules["min"])
	assert.Equal(t, 100, accountNameRules["max"])

	// Check account_type options
	accountTypeRules := rules["account_type"].(map[string]interface{})
	options := accountTypeRules["options"].([]string)
	assert.Contains(t, options, "alipay")
	assert.Contains(t, options, "wechat")
	assert.Contains(t, options, "bank")
	assert.Contains(t, options, "other")
}

func TestAccountValidationService_GetFieldName(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	service := NewAccountValidationService(mockRepo)

	tests := []struct {
		field    string
		expected string
	}{
		{"AccountName", "账户名称"},
		{"AccountNumber", "账户号码"},
		{"AccountType", "账户类型"},
		{"AccountHolder", "账户持有人"},
		{"PaymentType", "支付类型"},
		{"Status", "账户状态"},
		{"DailyLimit", "日限额"},
		{"SingleLimit", "单笔限额"},
		{"UnknownField", "UnknownField"}, // Should return original field name
	}

	for _, tt := range tests {
		t.Run(tt.field, func(t *testing.T) {
			result := service.getFieldName(tt.field)
			assert.Equal(t, tt.expected, result)
		})
	}
}
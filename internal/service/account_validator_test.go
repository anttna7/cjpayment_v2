package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/company/cjpayment/internal/repository"
)

// MockReceiveAccountRepository is a mock implementation of ReceiveAccountRepository
type MockReceiveAccountRepository struct {
	mock.Mock
}

func (m *MockReceiveAccountRepository) Create(ctx context.Context, account *repository.ReceiveAccount) error {
	args := m.Called(ctx, account)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) GetByAccountNumber(ctx context.Context, accountNumber string) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, accountNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) Update(ctx context.Context, account *repository.ReceiveAccount) error {
	args := m.Called(ctx, account)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) List(ctx context.Context, filter *repository.ReceiveAccountFilter) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) Count(ctx context.Context, filter *repository.ReceiveAccountFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockReceiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID)
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID, amount, paymentType)
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) UpdateDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	args := m.Called(ctx, accountID, amount)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) ResetDailyLimits(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) ExistsByAccountNumber(ctx context.Context, accountNumber string) (bool, error) {
	args := m.Called(ctx, accountNumber)
	return args.Bool(0), args.Error(1)
}

func (m *MockReceiveAccountRepository) CreateWithMerchantAssociation(ctx context.Context, account *repository.ReceiveAccount, merchantID uuid.UUID, weight int) error {
	args := m.Called(ctx, account, merchantID, weight)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) ValidateAccountType(ctx context.Context, accountType string) error {
	args := m.Called(ctx, accountType)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) ValidatePaymentProvider(ctx context.Context, accountType string, customPaymentProvider *string) error {
	args := m.Called(ctx, accountType, customPaymentProvider)
	return args.Error(0)
}

func TestAccountValidator_ValidateAccount(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	validator := NewAccountValidator(mockRepo)

	tests := []struct {
		name     string
		request  *AccountValidationRequest
		mockFunc func()
		wantErr  bool
		errCount int
	}{
		{
			name: "Valid account",
			request: &AccountValidationRequest{
				AccountName:   "测试支付宝账户",
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  false,
			errCount: 0,
		},
		{
			name: "Empty account name",
			request: &AccountValidationRequest{
				AccountName:   "",
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Invalid bank card number",
			request: &AccountValidationRequest{
				AccountName:   "测试银行账户",
				AccountNumber: "123", // Too short
				AccountType:   "bank",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "123").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Invalid account type",
			request: &AccountValidationRequest{
				AccountName:   "测试账户",
				AccountNumber: "test@example.com",
				AccountType:   "invalid",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Single limit greater than daily limit",
			request: &AccountValidationRequest{
				AccountName:   "测试账户",
				AccountNumber: "test@example.com",
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(5000.00),
				SingleLimit:   decimal.NewFromFloat(10000.00), // Greater than daily limit
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "test@example.com").Return(false, nil)
			},
			wantErr:  true,
			errCount: 1,
		},
		{
			name: "Duplicate account number",
			request: &AccountValidationRequest{
				AccountName:   "测试账户",
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			// Setup mock
			tt.mockFunc()

			// Execute validation
			result := validator.ValidateAccount(context.Background(), tt.request)

			// Assertions
			if tt.wantErr {
				assert.False(t, result.Valid)
				assert.Len(t, result.Errors, tt.errCount)
			} else {
				assert.True(t, result.Valid)
				assert.Empty(t, result.Errors)
			}

			// Verify mock expectations
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestAccountValidator_ValidateBankCardLuhn(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	validator := NewAccountValidator(mockRepo)

	tests := []struct {
		name       string
		cardNumber string
		want       bool
	}{
		{
			name:       "Valid card number",
			cardNumber: "4532015112830366", // Valid Visa test card
			want:       true,
		},
		{
			name:       "Invalid card number",
			cardNumber: "4532015112830367", // Invalid checksum
			want:       false,
		},
		{
			name:       "Card with spaces",
			cardNumber: "4532 0151 1283 0366",
			want:       true,
		},
		{
			name:       "Card with dashes",
			cardNumber: "4532-0151-1283-0366",
			want:       true,
		},
		{
			name:       "Non-numeric characters",
			cardNumber: "4532015112830366a",
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.validateBankCardLuhn(tt.cardNumber)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestAccountValidator_ValidateAccountNumber(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	validator := NewAccountValidator(mockRepo)

	tests := []struct {
		name        string
		number      string
		accountType string
		wantErr     bool
	}{
		{
			name:        "Valid Alipay email",
			number:      "test@example.com",
			accountType: "alipay",
			wantErr:     false,
		},
		{
			name:        "Valid Alipay phone",
			number:      "13812345678",
			accountType: "alipay",
			wantErr:     false,
		},
		{
			name:        "Invalid Alipay format",
			number:      "invalid-alipay",
			accountType: "alipay",
			wantErr:     true,
		},
		{
			name:        "Valid WeChat account",
			number:      "wechat123456",
			accountType: "wechat",
			wantErr:     false,
		},
		{
			name:        "Invalid WeChat account (starts with number)",
			number:      "123wechat",
			accountType: "wechat",
			wantErr:     true,
		},
		{
			name:        "Valid bank card",
			number:      "4532015112830366",
			accountType: "bank",
			wantErr:     false,
		},
		{
			name:        "Invalid bank card (too short)",
			number:      "123456789",
			accountType: "bank",
			wantErr:     true,
		},
		{
			name:        "Valid other account",
			number:      "other123456",
			accountType: "other",
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.validateAccountNumber(tt.number, tt.accountType)
			if tt.wantErr {
				assert.NotNil(t, err)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestAccountValidator_ValidateAccountForUpdate(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	validator := NewAccountValidator(mockRepo)

	accountID := uuid.New()
	existingAccount := &repository.ReceiveAccount{
		ID:            accountID,
		AccountNumber: "existing@example.com",
	}

	tests := []struct {
		name     string
		id       uuid.UUID
		request  *AccountValidationRequest
		mockFunc func()
		wantErr  bool
	}{
		{
			name: "Update with same account number",
			id:   accountID,
			request: &AccountValidationRequest{
				AccountName:   "更新的账户",
				AccountNumber: "existing@example.com", // Same as existing
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "existing@example.com").Return(true, nil)
				mockRepo.On("GetByAccountNumber", mock.Anything, "existing@example.com").Return(existingAccount, nil)
			},
			wantErr: false,
		},
		{
			name: "Update with different account number that exists",
			id:   accountID,
			request: &AccountValidationRequest{
				AccountName:   "更新的账户",
				AccountNumber: "different@example.com", // Different and exists
				AccountType:   "alipay",
				AccountHolder: "张三",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromFloat(10000.00),
				SingleLimit:   decimal.NewFromFloat(5000.00),
			},
			mockFunc: func() {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "different@example.com").Return(true, nil)
				differentAccount := &repository.ReceiveAccount{
					ID:            uuid.New(), // Different ID
					AccountNumber: "different@example.com",
				}
				mockRepo.On("GetByAccountNumber", mock.Anything, "different@example.com").Return(differentAccount, nil)
			},
			wantErr: true,
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
			result := validator.ValidateAccountForUpdate(context.Background(), tt.id, tt.request)

			// Assertions
			if tt.wantErr {
				assert.False(t, result.Valid)
				assert.NotEmpty(t, result.Errors)
			} else {
				assert.True(t, result.Valid)
				assert.Empty(t, result.Errors)
			}

			// Verify mock expectations
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestAccountValidator_SanitizeAccountData(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	validator := NewAccountValidator(mockRepo)

	customProvider := "  Custom Provider  "
	bankName := "  中国银行  "
	bankBranch := "  北京分行  "

	request := &AccountValidationRequest{
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

	validator.SanitizeAccountData(request)

	assert.Equal(t, "测试账户", request.AccountName)
	assert.Equal(t, "test@example.com", request.AccountNumber)
	assert.Equal(t, "alipay", request.AccountType)
	assert.Equal(t, "Custom Provider", *request.CustomPaymentProvider)
	assert.Equal(t, "中国银行", *request.BankName)
	assert.Equal(t, "北京分行", *request.BankBranch)
	assert.Equal(t, "张三", request.AccountHolder)
	assert.Equal(t, "private", request.PaymentType)
	assert.Equal(t, "active", request.Status)
}

func TestAccountValidator_GetValidTypes(t *testing.T) {
	mockRepo := new(MockReceiveAccountRepository)
	validator := NewAccountValidator(mockRepo)

	accountTypes := validator.GetValidAccountTypes()
	assert.Contains(t, accountTypes, "alipay")
	assert.Contains(t, accountTypes, "wechat")
	assert.Contains(t, accountTypes, "bank")
	assert.Contains(t, accountTypes, "other")

	statuses := validator.GetValidAccountStatus()
	assert.Contains(t, statuses, "active")
	assert.Contains(t, statuses, "inactive")
	assert.Contains(t, statuses, "suspended")
	assert.Contains(t, statuses, "closed")

	paymentTypes := validator.GetValidPaymentTypes()
	assert.Contains(t, paymentTypes, "private")
	assert.Contains(t, paymentTypes, "business")
}
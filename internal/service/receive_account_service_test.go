package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
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
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) Count(ctx context.Context, filter *repository.ReceiveAccountFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockReceiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID, amount, paymentType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
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

func (m *MockReceiveAccountRepository) GetByAccountNumber(ctx context.Context, accountNumber string) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, accountNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) ValidateAccountType(ctx context.Context, accountType string) error {
	args := m.Called(ctx, accountType)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) ValidatePaymentProvider(ctx context.Context, accountType string, customPaymentProvider *string) error {
	args := m.Called(ctx, accountType, customPaymentProvider)
	return args.Error(0)
}

// MockMerchantRepository is a mock implementation of MerchantRepository
type MockMerchantRepository struct {
	mock.Mock
}

func (m *MockMerchantRepository) Create(ctx context.Context, merchant *repository.Merchant) error {
	args := m.Called(ctx, merchant)
	return args.Error(0)
}

func (m *MockMerchantRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.Merchant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) Update(ctx context.Context, merchant *repository.Merchant) error {
	args := m.Called(ctx, merchant)
	return args.Error(0)
}

func (m *MockMerchantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMerchantRepository) List(ctx context.Context, filter *repository.MerchantFilter) ([]*repository.Merchant, int64, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*repository.Merchant), args.Get(1).(int64), args.Error(2)
}

func (m *MockMerchantRepository) GetByCode(ctx context.Context, code string) (*repository.Merchant, error) {
	args := m.Called(ctx, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) ExistsByCode(ctx context.Context, code string) (bool, error) {
	args := m.Called(ctx, code)
	return args.Bool(0), args.Error(1)
}

func (m *MockMerchantRepository) ExistsByName(ctx context.Context, name string) (bool, error) {
	args := m.Called(ctx, name)
	return args.Bool(0), args.Error(1)
}

func (m *MockMerchantRepository) GetMerchantWithAccounts(ctx context.Context, id uuid.UUID) (*repository.MerchantWithAccounts, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.MerchantWithAccounts), args.Error(1)
}

func (m *MockMerchantRepository) UpdateDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error {
	args := m.Called(ctx, merchantID, amount)
	return args.Error(0)
}

func (m *MockMerchantRepository) ResetDailyLimits(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// MockMerchantReceiveAccountRepository is a mock implementation of MerchantReceiveAccountRepository
type MockMerchantReceiveAccountRepository struct {
	mock.Mock
}

func (m *MockMerchantReceiveAccountRepository) Create(ctx context.Context, mra *repository.MerchantReceiveAccount) error {
	args := m.Called(ctx, mra)
	return args.Error(0)
}

func (m *MockMerchantReceiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.MerchantReceiveAccount, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.MerchantReceiveAccount), args.Error(1)
}

func (m *MockMerchantReceiveAccountRepository) DeleteByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockMerchantReceiveAccountRepository) UpdateWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error {
	args := m.Called(ctx, merchantID, accountID, weight)
	return args.Error(0)
}

// Test helper functions
func createTestReceiveAccount() *repository.ReceiveAccount {
	return &repository.ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account",
		AccountNumber: "1234567890",
		AccountType:   "alipay",
		AccountHolder: "Test Holder",
		PaymentType:   "public",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.Zero,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

func createTestMerchant() *repository.Merchant {
	return &repository.Merchant{
		ID:          uuid.New(),
		Name:        "Test Merchant",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(50000),
		SingleLimit: decimal.NewFromInt(5000),
		DailyUsed:   decimal.Zero,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

// Test CreateReceiveAccount
func TestReceiveAccountService_CreateReceiveAccount(t *testing.T) {
	tests := []struct {
		name          string
		request       *CreateReceiveAccountRequest
		setupMocks    func(*MockReceiveAccountRepository, *MockMerchantRepository, *MockMerchantReceiveAccountRepository)
		expectedError string
	}{
		{
			name: "successful creation",
			request: &CreateReceiveAccountRequest{
				AccountName:   "Test Account",
				AccountNumber: "1234567890",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMerchantRepo *MockMerchantRepository, mockMRARepo *MockMerchantReceiveAccountRepository) {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "1234567890").Return(false, nil)
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)
			},
			expectedError: "",
		},
		{
			name: "duplicate account number",
			request: &CreateReceiveAccountRequest{
				AccountName:   "Test Account",
				AccountNumber: "1234567890",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMerchantRepo *MockMerchantRepository, mockMRARepo *MockMerchantReceiveAccountRepository) {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "1234567890").Return(true, nil)
			},
			expectedError: "account number already exists: 1234567890",
		},
		{
			name: "repository error on existence check",
			request: &CreateReceiveAccountRequest{
				AccountName:   "Test Account",
				AccountNumber: "1234567890",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMerchantRepo *MockMerchantRepository, mockMRARepo *MockMerchantReceiveAccountRepository) {
				mockRepo.On("ExistsByAccountNumber", mock.Anything, "1234567890").Return(false, errors.New("database error"))
			},
			expectedError: "failed to check account number uniqueness: database error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReceiveAccountRepository{}
			mockMerchantRepo := &MockMerchantRepository{}
			mockMRARepo := &MockMerchantReceiveAccountRepository{}

			tt.setupMocks(mockRepo, mockMerchantRepo, mockMRARepo)

			service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)
			ctx := context.Background()

			result, err := service.CreateReceiveAccount(ctx, tt.request)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.request.AccountName, result.AccountName)
				assert.Equal(t, tt.request.AccountNumber, result.AccountNumber)
				assert.Equal(t, tt.request.AccountType, result.AccountType)
			}

			mockRepo.AssertExpectations(t)
			mockMerchantRepo.AssertExpectations(t)
			mockMRARepo.AssertExpectations(t)
		})
	}
}

// Test GetReceiveAccount
func TestReceiveAccountService_GetReceiveAccount(t *testing.T) {
	tests := []struct {
		name          string
		accountID     uuid.UUID
		setupMocks    func(*MockReceiveAccountRepository)
		expectedError string
	}{
		{
			name:      "successful retrieval",
			accountID: uuid.New(),
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				account := createTestReceiveAccount()
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("uuid.UUID")).Return(account, nil)
			},
			expectedError: "",
		},
		{
			name:      "account not found",
			accountID: uuid.New(),
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("uuid.UUID")).Return(nil, errors.New("account not found"))
			},
			expectedError: "failed to get receive account: account not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReceiveAccountRepository{}
			mockMerchantRepo := &MockMerchantRepository{}
			mockMRARepo := &MockMerchantReceiveAccountRepository{}

			tt.setupMocks(mockRepo)

			service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)
			ctx := context.Background()

			result, err := service.GetReceiveAccount(ctx, tt.accountID)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// Test ListReceiveAccounts
func TestReceiveAccountService_ListReceiveAccounts(t *testing.T) {
	tests := []struct {
		name          string
		filter        *repository.ReceiveAccountFilter
		setupMocks    func(*MockReceiveAccountRepository)
		expectedError string
		expectedCount int64
	}{
		{
			name: "successful list with filter",
			filter: &repository.ReceiveAccountFilter{
				Limit:  10,
				Offset: 0,
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				accounts := []*repository.ReceiveAccount{createTestReceiveAccount()}
				mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(1), nil)
				mockRepo.On("List", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(accounts, nil)
			},
			expectedError: "",
			expectedCount: 1,
		},
		{
			name:   "nil filter uses defaults",
			filter: nil,
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				accounts := []*repository.ReceiveAccount{}
				mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(0), nil)
			},
			expectedError: "",
			expectedCount: 0,
		},
		{
			name: "repository error on count",
			filter: &repository.ReceiveAccountFilter{
				Limit:  10,
				Offset: 0,
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(0), errors.New("database error"))
			},
			expectedError: "failed to count receive accounts: database error",
		},
		{
			name: "repository error on list",
			filter: &repository.ReceiveAccountFilter{
				Limit:  10,
				Offset: 0,
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(1), nil)
				mockRepo.On("List", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(nil, errors.New("database error"))
			},
			expectedError: "failed to list receive accounts from repository: database error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReceiveAccountRepository{}
			mockMerchantRepo := &MockMerchantRepository{}
			mockMRARepo := &MockMerchantReceiveAccountRepository{}

			tt.setupMocks(mockRepo)

			service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)
			ctx := context.Background()

			accounts, total, err := service.ListReceiveAccounts(ctx, tt.filter)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, accounts)
				assert.Equal(t, int64(0), total)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, accounts)
				assert.Equal(t, tt.expectedCount, total)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// Test UpdateReceiveAccount
func TestReceiveAccountService_UpdateReceiveAccount(t *testing.T) {
	accountID := uuid.New()
	existingAccount := createTestReceiveAccount()
	existingAccount.ID = accountID

	tests := []struct {
		name          string
		accountID     uuid.UUID
		request       *UpdateReceiveAccountRequest
		setupMocks    func(*MockReceiveAccountRepository)
		expectedError string
	}{
		{
			name:      "successful update",
			accountID: accountID,
			request: &UpdateReceiveAccountRequest{
				AccountName: stringPtr("Updated Account"),
				Status:      stringPtr("inactive"),
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				// First call to get existing account
				mockRepo.On("GetByID", mock.Anything, accountID).Return(existingAccount, nil).Once()
				// Second call for concurrency check
				mockRepo.On("GetByID", mock.Anything, accountID).Return(existingAccount, nil).Once()
				mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)
			},
			expectedError: "",
		},
		{
			name:      "account not found",
			accountID: accountID,
			request: &UpdateReceiveAccountRequest{
				AccountName: stringPtr("Updated Account"),
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				mockRepo.On("GetByID", mock.Anything, accountID).Return(nil, errors.New("account not found"))
			},
			expectedError: "failed to get receive account: account not found",
		},
		{
			name:      "concurrent modification detected",
			accountID: accountID,
			request: &UpdateReceiveAccountRequest{
				AccountName: stringPtr("Updated Account"),
			},
			setupMocks: func(mockRepo *MockReceiveAccountRepository) {
				// First call returns original account
				mockRepo.On("GetByID", mock.Anything, accountID).Return(existingAccount, nil).Once()
				// Second call returns account with different update time (simulating concurrent update)
				modifiedAccount := *existingAccount
				modifiedAccount.UpdatedAt = time.Now().Add(time.Minute)
				mockRepo.On("GetByID", mock.Anything, accountID).Return(&modifiedAccount, nil).Once()
			},
			expectedError: "account was modified by another process, please refresh and try again",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReceiveAccountRepository{}
			mockMerchantRepo := &MockMerchantRepository{}
			mockMRARepo := &MockMerchantReceiveAccountRepository{}

			tt.setupMocks(mockRepo)

			service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)
			ctx := context.Background()

			result, err := service.UpdateReceiveAccount(ctx, tt.accountID, tt.request)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				if tt.request.AccountName != nil {
					assert.Equal(t, *tt.request.AccountName, result.AccountName)
				}
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// Test DeleteReceiveAccount
func TestReceiveAccountService_DeleteReceiveAccount(t *testing.T) {
	accountID := uuid.New()
	existingAccount := createTestReceiveAccount()
	existingAccount.ID = accountID

	tests := []struct {
		name          string
		accountID     uuid.UUID
		setupMocks    func(*MockReceiveAccountRepository, *MockMerchantReceiveAccountRepository)
		expectedError string
	}{
		{
			name:      "successful soft delete",
			accountID: accountID,
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMRARepo *MockMerchantReceiveAccountRepository) {
				mockRepo.On("GetByID", mock.Anything, accountID).Return(existingAccount, nil)
				mockMRARepo.On("GetByMerchant", mock.Anything, accountID).Return([]*repository.MerchantReceiveAccount{}, nil)
				mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)
			},
			expectedError: "",
		},
		{
			name:      "account not found",
			accountID: accountID,
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMRARepo *MockMerchantReceiveAccountRepository) {
				mockRepo.On("GetByID", mock.Anything, accountID).Return(nil, errors.New("account not found"))
			},
			expectedError: "receive account not found: account not found",
		},
		{
			name:      "account already deleted",
			accountID: accountID,
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMRARepo *MockMerchantReceiveAccountRepository) {
				deletedAccount := *existingAccount
				deletedAccount.Status = "deleted"
				mockRepo.On("GetByID", mock.Anything, accountID).Return(&deletedAccount, nil)
			},
			expectedError: "account is already deleted",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReceiveAccountRepository{}
			mockMerchantRepo := &MockMerchantRepository{}
			mockMRARepo := &MockMerchantReceiveAccountRepository{}

			tt.setupMocks(mockRepo, mockMRARepo)

			service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)
			ctx := context.Background()

			err := service.DeleteReceiveAccount(ctx, tt.accountID)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
			mockMRARepo.AssertExpectations(t)
		})
	}
}

// Test GetAccountsByMerchant
func TestReceiveAccountService_GetAccountsByMerchant(t *testing.T) {
	merchantID := uuid.New()
	merchant := createTestMerchant()
	merchant.ID = merchantID

	tests := []struct {
		name          string
		merchantID    uuid.UUID
		setupMocks    func(*MockReceiveAccountRepository, *MockMerchantRepository)
		expectedError string
	}{
		{
			name:       "successful retrieval",
			merchantID: merchantID,
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMerchantRepo *MockMerchantRepository) {
				mockMerchantRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
				accounts := []*repository.ReceiveAccount{createTestReceiveAccount()}
				mockRepo.On("GetByMerchant", mock.Anything, merchantID).Return(accounts, nil)
			},
			expectedError: "",
		},
		{
			name:       "merchant not found",
			merchantID: merchantID,
			setupMocks: func(mockRepo *MockReceiveAccountRepository, mockMerchantRepo *MockMerchantRepository) {
				mockMerchantRepo.On("GetByID", mock.Anything, merchantID).Return(nil, errors.New("merchant not found"))
			},
			expectedError: "merchant not found: merchant not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockReceiveAccountRepository{}
			mockMerchantRepo := &MockMerchantRepository{}
			mockMRARepo := &MockMerchantReceiveAccountRepository{}

			tt.setupMocks(mockRepo, mockMerchantRepo)

			service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)
			ctx := context.Background()

			accounts, err := service.GetAccountsByMerchant(ctx, tt.merchantID)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
				assert.Nil(t, accounts)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, accounts)
			}

			mockRepo.AssertExpectations(t)
			mockMerchantRepo.AssertExpectations(t)
		})
	}
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
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

// Mock repositories for testing
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

func (m *MockMerchantRepository) GetByCode(ctx context.Context, code string) (*repository.Merchant, error) {
	args := m.Called(ctx, code)
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

func (m *MockMerchantRepository) List(ctx context.Context, filter *repository.MerchantFilter) ([]*repository.Merchant, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) Count(ctx context.Context, filter *repository.MerchantFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockMerchantRepository) Search(ctx context.Context, keyword string) ([]*repository.Merchant, error) {
	args := m.Called(ctx, keyword)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) UpdateDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error {
	args := m.Called(ctx, merchantID, amount)
	return args.Error(0)
}

func (m *MockMerchantRepository) ResetDailyLimits(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockMerchantRepository) ExistsByName(ctx context.Context, name string) (bool, error) {
	args := m.Called(ctx, name)
	return args.Bool(0), args.Error(1)
}

func (m *MockMerchantRepository) ExistsByPortName(ctx context.Context, portName string) (bool, error) {
	args := m.Called(ctx, portName)
	return args.Bool(0), args.Error(1)
}

func (m *MockMerchantRepository) GetMerchantWithAccounts(ctx context.Context, id uuid.UUID) (*repository.Merchant, []*repository.ReceiveAccount, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, nil, args.Error(2)
	}
	return args.Get(0).(*repository.Merchant), args.Get(1).([]*repository.ReceiveAccount), args.Error(2)
}

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

func (m *MockReceiveAccountRepository) ValidateAccountType(ctx context.Context, accountType string) error {
	args := m.Called(ctx, accountType)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) ValidatePaymentProvider(ctx context.Context, accountType string, customPaymentProvider *string) error {
	args := m.Called(ctx, accountType, customPaymentProvider)
	return args.Error(0)
}

type MockMerchantReceiveAccountRepository struct {
	mock.Mock
}

func (m *MockMerchantReceiveAccountRepository) Create(ctx context.Context, relationship *repository.MerchantReceiveAccount) error {
	args := m.Called(ctx, relationship)
	return args.Error(0)
}

func (m *MockMerchantReceiveAccountRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.MerchantReceiveAccount, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.MerchantReceiveAccount), args.Error(1)
}

func (m *MockMerchantReceiveAccountRepository) GetByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) (*repository.MerchantReceiveAccount, error) {
	args := m.Called(ctx, merchantID, accountID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.MerchantReceiveAccount), args.Error(1)
}

func (m *MockMerchantReceiveAccountRepository) Update(ctx context.Context, relationship *repository.MerchantReceiveAccount) error {
	args := m.Called(ctx, relationship)
	return args.Error(0)
}

func (m *MockMerchantReceiveAccountRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMerchantReceiveAccountRepository) DeleteByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockMerchantReceiveAccountRepository) List(ctx context.Context, filter *repository.MerchantReceiveAccountFilter) ([]*repository.MerchantReceiveAccount, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.MerchantReceiveAccount), args.Error(1)
}

func (m *MockMerchantReceiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.MerchantReceiveAccount, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.MerchantReceiveAccount), args.Error(1)
}

func (m *MockMerchantReceiveAccountRepository) UpdateWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error {
	args := m.Called(ctx, merchantID, accountID, weight)
	return args.Error(0)
}

type MockRechargeOrderRepository struct {
	mock.Mock
}

func (m *MockRechargeOrderRepository) Create(ctx context.Context, order *repository.RechargeOrder) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockRechargeOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.RechargeOrder, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RechargeOrder), args.Error(1)
}

func (m *MockRechargeOrderRepository) GetByOrderNumber(ctx context.Context, orderNumber string) (*repository.RechargeOrder, error) {
	args := m.Called(ctx, orderNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RechargeOrder), args.Error(1)
}

func (m *MockRechargeOrderRepository) Update(ctx context.Context, order *repository.RechargeOrder) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockRechargeOrderRepository) List(ctx context.Context, filter *repository.RechargeOrderFilter) ([]*repository.RechargeOrder, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.RechargeOrder), args.Error(1)
}

func (m *MockRechargeOrderRepository) Count(ctx context.Context, filter *repository.RechargeOrderFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRechargeOrderRepository) GetByStatus(ctx context.Context, status string) ([]*repository.RechargeOrder, error) {
	args := m.Called(ctx, status)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.RechargeOrder), args.Error(1)
}

// Test setup helper
func setupMerchantAccountServiceTest() (*merchantAccountService, *MockMerchantRepository, *MockReceiveAccountRepository, *MockMerchantReceiveAccountRepository, *MockRechargeOrderRepository) {
	mockMerchantRepo := &MockMerchantRepository{}
	mockReceiveAccountRepo := &MockReceiveAccountRepository{}
	mockMerchantAccountRepo := &MockMerchantReceiveAccountRepository{}
	mockRechargeOrderRepo := &MockRechargeOrderRepository{}

	service := &merchantAccountService{
		merchantRepo:        mockMerchantRepo,
		receiveAccountRepo:  mockReceiveAccountRepo,
		merchantAccountRepo: mockMerchantAccountRepo,
		rechargeOrderRepo:   mockRechargeOrderRepo,
	}

	return service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, mockRechargeOrderRepo
}

// Test data helpers
func createTestMerchant() *repository.Merchant {
	return &repository.Merchant{
		ID:          uuid.New(),
		Name:        "Test Merchant",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		DailyUsed:   decimal.NewFromInt(500),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

func createTestReceiveAccount() *repository.ReceiveAccount {
	return &repository.ReceiveAccount{
		ID:            uuid.New(),
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
}

func createTestMerchantReceiveAccount(merchantID, accountID uuid.UUID) *repository.MerchantReceiveAccount {
	return &repository.MerchantReceiveAccount{
		ID:               uuid.New(),
		MerchantID:       merchantID,
		ReceiveAccountID: accountID,
		Weight:           50,
		IsActive:         true,
		CreatedAt:        time.Now(),
	}
}

// Tests for BindAccount
func TestMerchantAccountService_BindAccount_Success(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	account := createTestReceiveAccount()
	
	req := &BindAccountRequest{
		MerchantID: merchant.ID,
		AccountID:  account.ID,
		Priority:   75,
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account.ID).Return(nil, errors.New("not found"))
	mockMerchantAccountRepo.On("Create", ctx, mock.AnythingOfType("*repository.MerchantReceiveAccount")).Return(nil)

	// Execute
	err := service.BindAccount(ctx, req)

	// Assert
	assert.NoError(t, err)
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_BindAccount_MerchantNotFound(t *testing.T) {
	service, mockMerchantRepo, _, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	req := &BindAccountRequest{
		MerchantID: uuid.New(),
		AccountID:  uuid.New(),
		Priority:   75,
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, req.MerchantID).Return(nil, errors.New("not found"))

	// Execute
	err := service.BindAccount(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "merchant not found")
	mockMerchantRepo.AssertExpectations(t)
}

func TestMerchantAccountService_BindAccount_InactiveMerchant(t *testing.T) {
	service, mockMerchantRepo, _, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	merchant.Status = "inactive"
	
	req := &BindAccountRequest{
		MerchantID: merchant.ID,
		AccountID:  uuid.New(),
		Priority:   75,
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil)

	// Execute
	err := service.BindAccount(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot bind account to inactive merchant")
	mockMerchantRepo.AssertExpectations(t)
}

func TestMerchantAccountService_BindAccount_AccountNotFound(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	
	req := &BindAccountRequest{
		MerchantID: merchant.ID,
		AccountID:  uuid.New(),
		Priority:   75,
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, req.AccountID).Return(nil, errors.New("not found"))

	// Execute
	err := service.BindAccount(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "receive account not found")
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_BindAccount_AlreadyBound(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	account := createTestReceiveAccount()
	existingBinding := createTestMerchantReceiveAccount(merchant.ID, account.ID)
	
	req := &BindAccountRequest{
		MerchantID: merchant.ID,
		AccountID:  account.ID,
		Priority:   75,
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account.ID).Return(existingBinding, nil)

	// Execute
	err := service.BindAccount(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "account is already bound to this merchant")
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_BindAccount_InvalidPriority(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	account := createTestReceiveAccount()
	
	req := &BindAccountRequest{
		MerchantID: merchant.ID,
		AccountID:  account.ID,
		Priority:   150, // Invalid priority
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account.ID).Return(nil, errors.New("not found"))

	// Execute
	err := service.BindAccount(ctx, req)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "priority must be between 1 and 100")
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockMerchantAccountRepo.AssertExpectations(t)
}

// Tests for UnbindAccount
func TestMerchantAccountService_UnbindAccount_Success(t *testing.T) {
	service, _, _, mockMerchantAccountRepo, mockRechargeOrderRepo := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	binding := createTestMerchantReceiveAccount(merchantID, accountID)

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(binding, nil)
	mockRechargeOrderRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return([]*repository.RechargeOrder{}, nil)
	mockMerchantAccountRepo.On("DeleteByMerchantAndAccount", ctx, merchantID, accountID).Return(nil)

	// Execute
	err := service.UnbindAccount(ctx, merchantID, accountID)

	// Assert
	assert.NoError(t, err)
	mockMerchantAccountRepo.AssertExpectations(t)
	mockRechargeOrderRepo.AssertExpectations(t)
}

func TestMerchantAccountService_UnbindAccount_BindingNotFound(t *testing.T) {
	service, _, _, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(nil, errors.New("not found"))

	// Execute
	err := service.UnbindAccount(ctx, merchantID, accountID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "account binding not found")
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_UnbindAccount_HasPendingOrders(t *testing.T) {
	service, _, _, mockMerchantAccountRepo, mockRechargeOrderRepo := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	binding := createTestMerchantReceiveAccount(merchantID, accountID)

	// Create a pending order using this account
	pendingOrder := &repository.RechargeOrder{
		ID:               uuid.New(),
		MerchantID:       merchantID,
		ReceiveAccountID: accountID,
		Status:           "pending",
		Amount:           decimal.NewFromInt(100),
	}

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(binding, nil)
	mockRechargeOrderRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return([]*repository.RechargeOrder{pendingOrder}, nil)

	// Execute
	err := service.UnbindAccount(ctx, merchantID, accountID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot unbind account with pending orders")
	mockMerchantAccountRepo.AssertExpectations(t)
	mockRechargeOrderRepo.AssertExpectations(t)
}

// Tests for UpdateAccountPriority
func TestMerchantAccountService_UpdateAccountPriority_Success(t *testing.T) {
	service, _, _, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	binding := createTestMerchantReceiveAccount(merchantID, accountID)
	newPriority := 80

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(binding, nil)
	mockMerchantAccountRepo.On("UpdateWeight", ctx, merchantID, accountID, newPriority).Return(nil)

	// Execute
	err := service.UpdateAccountPriority(ctx, merchantID, accountID, newPriority)

	// Assert
	assert.NoError(t, err)
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_UpdateAccountPriority_InvalidPriority(t *testing.T) {
	service, _, _, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	invalidPriority := 150

	// Execute
	err := service.UpdateAccountPriority(ctx, merchantID, accountID, invalidPriority)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "priority must be between 1 and 100")
}

// Tests for ListMerchantAccounts
func TestMerchantAccountService_ListMerchantAccounts_Success(t *testing.T) {
	service, _, mockReceiveAccountRepo, mockMerchantAccountRepo, mockRechargeOrderRepo := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	account := createTestReceiveAccount()
	binding := createTestMerchantReceiveAccount(merchantID, account.ID)

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchant", ctx, merchantID).Return([]*repository.MerchantReceiveAccount{binding}, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)
	mockRechargeOrderRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return([]*repository.RechargeOrder{}, nil)

	// Execute
	accounts, err := service.ListMerchantAccounts(ctx, merchantID)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, accounts, 1)
	assert.Equal(t, account.AccountName, accounts[0].AccountName)
	assert.Equal(t, binding.Weight, accounts[0].Priority)
	mockMerchantAccountRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
}

// Tests for GetAvailableAccounts
func TestMerchantAccountService_GetAvailableAccounts_Success(t *testing.T) {
	service, _, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	account := createTestReceiveAccount()
	account.PaymentType = "business"
	binding := createTestMerchantReceiveAccount(merchantID, account.ID)
	amount := decimal.NewFromInt(100)

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchant", ctx, merchantID).Return([]*repository.MerchantReceiveAccount{binding}, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)

	// Execute
	availableAccounts, err := service.GetAvailableAccounts(ctx, merchantID, "business", amount)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, availableAccounts, 1)
	assert.True(t, availableAccounts[0].CanAcceptAmount)
	assert.Equal(t, account.AccountName, availableAccounts[0].AccountName)
	mockMerchantAccountRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_GetAvailableAccounts_PaymentTypeMismatch(t *testing.T) {
	service, _, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	account := createTestReceiveAccount()
	account.PaymentType = "private"
	binding := createTestMerchantReceiveAccount(merchantID, account.ID)
	amount := decimal.NewFromInt(100)

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchant", ctx, merchantID).Return([]*repository.MerchantReceiveAccount{binding}, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)

	// Execute - requesting business payment type but account is private
	availableAccounts, err := service.GetAvailableAccounts(ctx, merchantID, "business", amount)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, availableAccounts, 0) // Should be filtered out
	mockMerchantAccountRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
}

// Tests for ValidateAccountBinding
func TestMerchantAccountService_ValidateAccountBinding_Success(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	account := createTestReceiveAccount()

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account.ID).Return(nil, errors.New("not found"))
	mockMerchantAccountRepo.On("GetByMerchant", ctx, merchant.ID).Return([]*repository.MerchantReceiveAccount{}, nil)

	// Execute
	result, err := service.ValidateAccountBinding(ctx, merchant.ID, account.ID)

	// Assert
	assert.NoError(t, err)
	assert.True(t, result.IsValid)
	assert.Empty(t, result.Errors)
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_ValidateAccountBinding_MerchantNotFound(t *testing.T) {
	service, mockMerchantRepo, _, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()

	// Setup mocks
	mockMerchantRepo.On("GetByID", ctx, merchantID).Return(nil, errors.New("not found"))

	// Execute
	result, err := service.ValidateAccountBinding(ctx, merchantID, accountID)

	// Assert
	assert.NoError(t, err)
	assert.False(t, result.IsValid)
	assert.Contains(t, result.Errors, "Merchant not found")
	mockMerchantRepo.AssertExpectations(t)
}

// Tests for CheckAccountAvailability
func TestMerchantAccountService_CheckAccountAvailability_Available(t *testing.T) {
	service, _, mockReceiveAccountRepo, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	account := createTestReceiveAccount()
	amount := decimal.NewFromInt(100) // Within limits

	// Setup mocks
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)

	// Execute
	result, err := service.CheckAccountAvailability(ctx, account.ID, amount)

	// Assert
	assert.NoError(t, err)
	assert.True(t, result.IsAvailable)
	assert.Empty(t, result.Reasons)
	assert.Equal(t, account.DailyLimit.Sub(account.DailyUsed), result.RemainingDailyLimit)
	mockReceiveAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_CheckAccountAvailability_ExceedsSingleLimit(t *testing.T) {
	service, _, mockReceiveAccountRepo, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	account := createTestReceiveAccount()
	amount := decimal.NewFromInt(1000) // Exceeds single limit of 500

	// Setup mocks
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)

	// Execute
	result, err := service.CheckAccountAvailability(ctx, account.ID, amount)

	// Assert
	assert.NoError(t, err)
	assert.False(t, result.IsAvailable)
	assert.Contains(t, result.Reasons[0], "exceeds single transaction limit")
	mockReceiveAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_CheckAccountAvailability_ExceedsDailyLimit(t *testing.T) {
	service, _, mockReceiveAccountRepo, _, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	account := createTestReceiveAccount()
	account.DailyUsed = decimal.NewFromInt(4950) // Almost at daily limit of 5000
	amount := decimal.NewFromInt(100) // Would exceed remaining daily limit of 50

	// Setup mocks
	mockReceiveAccountRepo.On("GetByID", ctx, account.ID).Return(account, nil)

	// Execute
	result, err := service.CheckAccountAvailability(ctx, account.ID, amount)

	// Assert
	assert.NoError(t, err)
	assert.False(t, result.IsAvailable)
	assert.Contains(t, result.Reasons[0], "exceeds remaining daily limit")
	mockReceiveAccountRepo.AssertExpectations(t)
}

// Tests for BatchBindAccounts
func TestMerchantAccountService_BatchBindAccounts_Success(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	account1 := createTestReceiveAccount()
	account2 := createTestReceiveAccount()
	account2.ID = uuid.New()

	req := &BatchBindAccountsRequest{
		MerchantID: merchant.ID,
		Bindings: []AccountBinding{
			{AccountID: account1.ID, Priority: 70},
			{AccountID: account2.ID, Priority: 80},
		},
	}

	// Setup mocks for both accounts
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil).Times(2)
	mockReceiveAccountRepo.On("GetByID", ctx, account1.ID).Return(account1, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account2.ID).Return(account2, nil)
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account1.ID).Return(nil, errors.New("not found"))
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account2.ID).Return(nil, errors.New("not found"))
	mockMerchantAccountRepo.On("Create", ctx, mock.AnythingOfType("*repository.MerchantReceiveAccount")).Return(nil).Times(2)

	// Execute
	result, err := service.BatchBindAccounts(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, 2, result.TotalRequested)
	assert.Equal(t, 2, result.Successful)
	assert.Equal(t, 0, result.Failed)
	assert.Empty(t, result.Errors)
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_BatchBindAccounts_PartialFailure(t *testing.T) {
	service, mockMerchantRepo, mockReceiveAccountRepo, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchant := createTestMerchant()
	account1 := createTestReceiveAccount()
	account2 := createTestReceiveAccount()
	account2.ID = uuid.New()

	req := &BatchBindAccountsRequest{
		MerchantID: merchant.ID,
		Bindings: []AccountBinding{
			{AccountID: account1.ID, Priority: 70},
			{AccountID: account2.ID, Priority: 80},
		},
	}

	// Setup mocks - first succeeds, second fails
	mockMerchantRepo.On("GetByID", ctx, merchant.ID).Return(merchant, nil).Times(2)
	mockReceiveAccountRepo.On("GetByID", ctx, account1.ID).Return(account1, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, account2.ID).Return(nil, errors.New("account not found"))
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchant.ID, account1.ID).Return(nil, errors.New("not found"))
	mockMerchantAccountRepo.On("Create", ctx, mock.AnythingOfType("*repository.MerchantReceiveAccount")).Return(nil)

	// Execute
	result, err := service.BatchBindAccounts(ctx, req)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, 2, result.TotalRequested)
	assert.Equal(t, 1, result.Successful)
	assert.Equal(t, 1, result.Failed)
	assert.Len(t, result.Errors, 1)
	mockMerchantRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
	mockMerchantAccountRepo.AssertExpectations(t)
}

// Tests for EnableAccount and DisableAccount
func TestMerchantAccountService_EnableAccount_Success(t *testing.T) {
	service, _, _, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	binding := createTestMerchantReceiveAccount(merchantID, accountID)
	binding.IsActive = false

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(binding, nil)
	mockMerchantAccountRepo.On("Update", ctx, mock.MatchedBy(func(b *repository.MerchantReceiveAccount) bool {
		return b.IsActive == true
	})).Return(nil)

	// Execute
	err := service.EnableAccount(ctx, merchantID, accountID)

	// Assert
	assert.NoError(t, err)
	mockMerchantAccountRepo.AssertExpectations(t)
}

func TestMerchantAccountService_DisableAccount_Success(t *testing.T) {
	service, _, _, mockMerchantAccountRepo, _ := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	binding := createTestMerchantReceiveAccount(merchantID, accountID)
	binding.IsActive = true

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(binding, nil)
	mockMerchantAccountRepo.On("Update", ctx, mock.MatchedBy(func(b *repository.MerchantReceiveAccount) bool {
		return b.IsActive == false
	})).Return(nil)

	// Execute
	err := service.DisableAccount(ctx, merchantID, accountID)

	// Assert
	assert.NoError(t, err)
	mockMerchantAccountRepo.AssertExpectations(t)
}

// Tests for GetAccountStatus
func TestMerchantAccountService_GetAccountStatus_Success(t *testing.T) {
	service, _, mockReceiveAccountRepo, mockMerchantAccountRepo, mockRechargeOrderRepo := setupMerchantAccountServiceTest()
	ctx := context.Background()

	merchantID := uuid.New()
	accountID := uuid.New()
	binding := createTestMerchantReceiveAccount(merchantID, accountID)
	account := createTestReceiveAccount()
	account.ID = accountID

	// Setup mocks
	mockMerchantAccountRepo.On("GetByMerchantAndAccount", ctx, merchantID, accountID).Return(binding, nil)
	mockReceiveAccountRepo.On("GetByID", ctx, accountID).Return(account, nil)
	mockRechargeOrderRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return([]*repository.RechargeOrder{}, nil)

	// Execute
	status, err := service.GetAccountStatus(ctx, merchantID, accountID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, merchantID, status.MerchantID)
	assert.Equal(t, accountID, status.AccountID)
	assert.Equal(t, binding.IsActive, status.IsBindingActive)
	assert.Equal(t, account.Status, status.AccountStatus)
	assert.Equal(t, binding.Weight, status.Priority)
	mockMerchantAccountRepo.AssertExpectations(t)
	mockReceiveAccountRepo.AssertExpectations(t)
}
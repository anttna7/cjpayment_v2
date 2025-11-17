package service

import (
	"context"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"cjpayment/internal/repository"
)

// MockRechargeOrderRepository for testing
type MockRechargeOrderRepository struct {
	mock.Mock
}

func (m *MockRechargeOrderRepository) Create(ctx context.Context, order *repository.RechargeOrder) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockRechargeOrderRepository) GetByOrderNo(ctx context.Context, orderNo string) (*repository.RechargeOrder, error) {
	args := m.Called(ctx, orderNo)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RechargeOrder), args.Error(1)
}

func (m *MockRechargeOrderRepository) Update(ctx context.Context, order *repository.RechargeOrder) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockRechargeOrderRepository) List(ctx context.Context, req *repository.ListOrdersRequest) ([]*repository.RechargeOrder, int64, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*repository.RechargeOrder), args.Get(1).(int64), args.Error(2)
}

func (m *MockRechargeOrderRepository) GetDailyStats(ctx context.Context, date time.Time) (*repository.DailyStats, error) {
	args := m.Called(ctx, date)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.DailyStats), args.Error(1)
}

// MockAccountMatcher for testing
type MockAccountMatcher struct {
	mock.Mock
}

func (m *MockAccountMatcher) Match(ctx context.Context, req *MatchRequest) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

// RechargeServiceTestSuite defines the test suite
type RechargeServiceTestSuite struct {
	suite.Suite
	service         RechargeService
	mockOrderRepo   *MockRechargeOrderRepository
	mockMerchantRepo *MockMerchantRepository
	mockAccountMatcher *MockAccountMatcher
	ctx             context.Context
}

func (suite *RechargeServiceTestSuite) SetupTest() {
	suite.mockOrderRepo = new(MockRechargeOrderRepository)
	suite.mockMerchantRepo = new(MockMerchantRepository)
	suite.mockAccountMatcher = new(MockAccountMatcher)
	suite.service = NewRechargeService(suite.mockOrderRepo, suite.mockMerchantRepo, suite.mockAccountMatcher)
	suite.ctx = context.Background()
}

func (suite *RechargeServiceTestSuite) TestCreateRechargeOrder_Success() {
	// Arrange
	req := &CreateRechargeOrderRequest{
		MerchantID:   1,
		PayerName:    "John Doe",
		Amount:       decimal.NewFromFloat(1000.00),
		AdAccount:    "AD123456",
		PaymentType:  "corporate",
	}

	merchant := &repository.Merchant{
		ID:     1,
		Name:   "Test Merchant",
		Status: "active",
	}

	matchedAccount := &repository.ReceiveAccount{
		ID:          1,
		AccountName: "Test Account",
		AccountNo:   "1234567890",
		BankName:    "Test Bank",
		AccountType: "corporate",
		Status:      "active",
	}

	matchReq := &MatchRequest{
		MerchantID:  req.MerchantID,
		PaymentType: req.PaymentType,
		Amount:      req.Amount,
	}

	suite.mockMerchantRepo.On("GetByID", suite.ctx, req.MerchantID).Return(merchant, nil)
	suite.mockAccountMatcher.On("Match", suite.ctx, matchReq).Return(matchedAccount, nil)
	suite.mockOrderRepo.On("Create", suite.ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	// Act
	result, err := suite.service.CreateRechargeOrder(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(req.MerchantID, result.MerchantID)
	suite.Equal(req.PayerName, result.PayerName)
	suite.Equal(req.Amount, result.Amount)
	suite.Equal(req.AdAccount, result.AdAccount)
	suite.Equal(req.PaymentType, result.PaymentType)
	suite.Equal(matchedAccount.ID, result.ReceiveAccountID)
	suite.Equal("pending", result.Status)
	suite.NotEmpty(result.OrderNo)
	suite.mockMerchantRepo.AssertExpectations(suite.T())
	suite.mockAccountMatcher.AssertExpectations(suite.T())
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestCreateRechargeOrder_MerchantNotFound() {
	// Arrange
	req := &CreateRechargeOrderRequest{
		MerchantID:   999,
		PayerName:    "John Doe",
		Amount:       decimal.NewFromFloat(1000.00),
		AdAccount:    "AD123456",
		PaymentType:  "corporate",
	}

	suite.mockMerchantRepo.On("GetByID", suite.ctx, req.MerchantID).Return(nil, repository.ErrMerchantNotFound)

	// Act
	result, err := suite.service.CreateRechargeOrder(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(repository.ErrMerchantNotFound, err)
	suite.mockMerchantRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestCreateRechargeOrder_MerchantInactive() {
	// Arrange
	req := &CreateRechargeOrderRequest{
		MerchantID:   1,
		PayerName:    "John Doe",
		Amount:       decimal.NewFromFloat(1000.00),
		AdAccount:    "AD123456",
		PaymentType:  "corporate",
	}

	merchant := &repository.Merchant{
		ID:     1,
		Name:   "Test Merchant",
		Status: "inactive",
	}

	suite.mockMerchantRepo.On("GetByID", suite.ctx, req.MerchantID).Return(merchant, nil)

	// Act
	result, err := suite.service.CreateRechargeOrder(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Contains(err.Error(), "merchant is inactive")
	suite.mockMerchantRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestCreateRechargeOrder_NoAvailableAccount() {
	// Arrange
	req := &CreateRechargeOrderRequest{
		MerchantID:   1,
		PayerName:    "John Doe",
		Amount:       decimal.NewFromFloat(1000.00),
		AdAccount:    "AD123456",
		PaymentType:  "corporate",
	}

	merchant := &repository.Merchant{
		ID:     1,
		Name:   "Test Merchant",
		Status: "active",
	}

	matchReq := &MatchRequest{
		MerchantID:  req.MerchantID,
		PaymentType: req.PaymentType,
		Amount:      req.Amount,
	}

	suite.mockMerchantRepo.On("GetByID", suite.ctx, req.MerchantID).Return(merchant, nil)
	suite.mockAccountMatcher.On("Match", suite.ctx, matchReq).Return(nil, ErrNoAvailableAccount)

	// Act
	result, err := suite.service.CreateRechargeOrder(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrNoAvailableAccount, err)
	suite.mockMerchantRepo.AssertExpectations(suite.T())
	suite.mockAccountMatcher.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestCreateRechargeOrder_InvalidInput() {
	// Test cases for invalid input
	testCases := []struct {
		name string
		req  *CreateRechargeOrderRequest
		expectedError string
	}{
		{
			name: "empty payer name",
			req: &CreateRechargeOrderRequest{
				MerchantID:   1,
				PayerName:    "",
				Amount:       decimal.NewFromFloat(1000.00),
				AdAccount:    "AD123456",
				PaymentType:  "corporate",
			},
			expectedError: "payer name is required",
		},
		{
			name: "zero amount",
			req: &CreateRechargeOrderRequest{
				MerchantID:   1,
				PayerName:    "John Doe",
				Amount:       decimal.Zero,
				AdAccount:    "AD123456",
				PaymentType:  "corporate",
			},
			expectedError: "amount must be greater than zero",
		},
		{
			name: "invalid payment type",
			req: &CreateRechargeOrderRequest{
				MerchantID:   1,
				PayerName:    "John Doe",
				Amount:       decimal.NewFromFloat(1000.00),
				AdAccount:    "AD123456",
				PaymentType:  "invalid",
			},
			expectedError: "invalid payment type",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			// Act
			result, err := suite.service.CreateRechargeOrder(suite.ctx, tc.req)

			// Assert
			suite.Error(err)
			suite.Nil(result)
			suite.Contains(err.Error(), tc.expectedError)
		})
	}
}

func (suite *RechargeServiceTestSuite) TestGetRechargeOrder_Success() {
	// Arrange
	orderNo := "RO20240812001"
	expectedOrder := &repository.RechargeOrder{
		ID:               1,
		OrderNo:          orderNo,
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	suite.mockOrderRepo.On("GetByOrderNo", suite.ctx, orderNo).Return(expectedOrder, nil)

	// Act
	result, err := suite.service.GetRechargeOrder(suite.ctx, orderNo)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(expectedOrder.OrderNo, result.OrderNo)
	suite.Equal(expectedOrder.MerchantID, result.MerchantID)
	suite.Equal(expectedOrder.PayerName, result.PayerName)
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestGetRechargeOrder_NotFound() {
	// Arrange
	orderNo := "NONEXISTENT"
	suite.mockOrderRepo.On("GetByOrderNo", suite.ctx, orderNo).Return(nil, repository.ErrOrderNotFound)

	// Act
	result, err := suite.service.GetRechargeOrder(suite.ctx, orderNo)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(repository.ErrOrderNotFound, err)
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestUpdateOrderStatus_Success() {
	// Arrange
	orderNo := "RO20240812001"
	newStatus := "paid"
	remark := "Payment confirmed"

	existingOrder := &repository.RechargeOrder{
		ID:               1,
		OrderNo:          orderNo,
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		Status:           "pending",
		CreatedAt:        time.Now().Add(-1 * time.Hour),
		UpdatedAt:        time.Now().Add(-1 * time.Hour),
	}

	suite.mockOrderRepo.On("GetByOrderNo", suite.ctx, orderNo).Return(existingOrder, nil)
	suite.mockOrderRepo.On("Update", suite.ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	// Act
	err := suite.service.UpdateOrderStatus(suite.ctx, orderNo, newStatus, remark)

	// Assert
	suite.NoError(err)
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestUpdateOrderStatus_InvalidTransition() {
	// Arrange
	orderNo := "RO20240812001"
	newStatus := "pending"

	existingOrder := &repository.RechargeOrder{
		ID:        1,
		OrderNo:   orderNo,
		Status:    "completed",
		CreatedAt: time.Now().Add(-1 * time.Hour),
		UpdatedAt: time.Now().Add(-1 * time.Hour),
	}

	suite.mockOrderRepo.On("GetByOrderNo", suite.ctx, orderNo).Return(existingOrder, nil)

	// Act
	err := suite.service.UpdateOrderStatus(suite.ctx, orderNo, newStatus, "")

	// Assert
	suite.Error(err)
	suite.Contains(err.Error(), "invalid status transition")
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestUploadPaymentProof_Success() {
	// Arrange
	orderNo := "RO20240812001"
	proofURL := "https://example.com/proof.jpg"

	existingOrder := &repository.RechargeOrder{
		ID:        1,
		OrderNo:   orderNo,
		Status:    "pending",
		CreatedAt: time.Now().Add(-1 * time.Hour),
		UpdatedAt: time.Now().Add(-1 * time.Hour),
	}

	suite.mockOrderRepo.On("GetByOrderNo", suite.ctx, orderNo).Return(existingOrder, nil)
	suite.mockOrderRepo.On("Update", suite.ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	// Act
	err := suite.service.UploadPaymentProof(suite.ctx, orderNo, proofURL)

	// Assert
	suite.NoError(err)
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

func (suite *RechargeServiceTestSuite) TestListOrders_Success() {
	// Arrange
	req := &ListOrdersRequest{
		Page:       1,
		PageSize:   10,
		MerchantID: 1,
		Status:     "pending",
		StartDate:  time.Now().Add(-24 * time.Hour),
		EndDate:    time.Now(),
	}

	expectedOrders := []*repository.RechargeOrder{
		{
			ID:          1,
			OrderNo:     "RO20240812001",
			MerchantID:  1,
			PayerName:   "John Doe",
			Amount:      decimal.NewFromFloat(1000.00),
			Status:      "pending",
			CreatedAt:   time.Now().Add(-2 * time.Hour),
		},
		{
			ID:          2,
			OrderNo:     "RO20240812002",
			MerchantID:  1,
			PayerName:   "Jane Smith",
			Amount:      decimal.NewFromFloat(2000.00),
			Status:      "pending",
			CreatedAt:   time.Now().Add(-1 * time.Hour),
		},
	}

	expectedTotal := int64(2)

	repoReq := &repository.ListOrdersRequest{
		Page:       req.Page,
		PageSize:   req.PageSize,
		MerchantID: req.MerchantID,
		Status:     req.Status,
		StartDate:  req.StartDate,
		EndDate:    req.EndDate,
	}

	suite.mockOrderRepo.On("List", suite.ctx, repoReq).Return(expectedOrders, expectedTotal, nil)

	// Act
	result, err := suite.service.ListOrders(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(len(expectedOrders), len(result.Orders))
	suite.Equal(expectedTotal, result.Total)
	suite.Equal(req.Page, result.Page)
	suite.Equal(req.PageSize, result.PageSize)
	suite.mockOrderRepo.AssertExpectations(suite.T())
}

// Run the test suite
func TestRechargeServiceTestSuite(t *testing.T) {
	suite.Run(t, new(RechargeServiceTestSuite))
}

// Benchmark tests
func BenchmarkRechargeService_CreateOrder(b *testing.B) {
	mockOrderRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountMatcher := new(MockAccountMatcher)
	service := NewRechargeService(mockOrderRepo, mockMerchantRepo, mockAccountMatcher)
	ctx := context.Background()

	req := &CreateRechargeOrderRequest{
		MerchantID:   1,
		PayerName:    "John Doe",
		Amount:       decimal.NewFromFloat(1000.00),
		AdAccount:    "AD123456",
		PaymentType:  "corporate",
	}

	merchant := &repository.Merchant{ID: 1, Status: "active"}
	account := &repository.ReceiveAccount{ID: 1, Status: "active"}
	matchReq := &MatchRequest{MerchantID: 1, PaymentType: "corporate", Amount: req.Amount}

	mockMerchantRepo.On("GetByID", ctx, uint(1)).Return(merchant, nil)
	mockAccountMatcher.On("Match", ctx, matchReq).Return(account, nil)
	mockOrderRepo.On("Create", ctx, mock.AnythingOfType("*repository.RechargeOrder")).Return(nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.CreateRechargeOrder(ctx, req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRechargeService_GetOrder(b *testing.B) {
	mockOrderRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountMatcher := new(MockAccountMatcher)
	service := NewRechargeService(mockOrderRepo, mockMerchantRepo, mockAccountMatcher)
	ctx := context.Background()

	order := &repository.RechargeOrder{
		ID:      1,
		OrderNo: "RO20240812001",
		Status:  "pending",
	}

	mockOrderRepo.On("GetByOrderNo", ctx, "RO20240812001").Return(order, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetRechargeOrder(ctx, "RO20240812001")
		if err != nil {
			b.Fatal(err)
		}
	}
}
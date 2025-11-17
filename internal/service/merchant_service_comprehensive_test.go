package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"cjpayment/internal/repository"
)

// MockMerchantRepository for testing
type MockMerchantRepository struct {
	mock.Mock
}

func (m *MockMerchantRepository) Create(ctx context.Context, merchant *repository.Merchant) error {
	args := m.Called(ctx, merchant)
	return args.Error(0)
}

func (m *MockMerchantRepository) GetByID(ctx context.Context, id uint) (*repository.Merchant, error) {
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

func (m *MockMerchantRepository) Delete(ctx context.Context, id uint) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMerchantRepository) List(ctx context.Context, req *repository.ListMerchantsRequest) ([]*repository.Merchant, int64, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*repository.Merchant), args.Get(1).(int64), args.Error(2)
}

func (m *MockMerchantRepository) GetByName(ctx context.Context, name string) (*repository.Merchant, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Merchant), args.Error(1)
}

// MerchantServiceTestSuite defines the test suite
type MerchantServiceTestSuite struct {
	suite.Suite
	service    MerchantService
	mockRepo   *MockMerchantRepository
	ctx        context.Context
}

func (suite *MerchantServiceTestSuite) SetupTest() {
	suite.mockRepo = new(MockMerchantRepository)
	suite.service = NewMerchantService(suite.mockRepo)
	suite.ctx = context.Background()
}

func (suite *MerchantServiceTestSuite) TestCreateMerchant_Success() {
	// Arrange
	req := &CreateMerchantRequest{
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
	}

	expectedMerchant := &repository.Merchant{
		Name:         req.Name,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
		Email:        req.Email,
		BusinessType: req.BusinessType,
		Status:       "active",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	suite.mockRepo.On("GetByName", suite.ctx, req.Name).Return(nil, repository.ErrMerchantNotFound)
	suite.mockRepo.On("Create", suite.ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil)

	// Act
	result, err := suite.service.CreateMerchant(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(expectedMerchant.Name, result.Name)
	suite.Equal(expectedMerchant.ContactName, result.ContactName)
	suite.Equal(expectedMerchant.Status, result.Status)
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestCreateMerchant_DuplicateName() {
	// Arrange
	req := &CreateMerchantRequest{
		Name:         "Existing Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
	}

	existingMerchant := &repository.Merchant{
		ID:   1,
		Name: req.Name,
	}

	suite.mockRepo.On("GetByName", suite.ctx, req.Name).Return(existingMerchant, nil)

	// Act
	result, err := suite.service.CreateMerchant(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Contains(err.Error(), "merchant name already exists")
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestCreateMerchant_InvalidInput() {
	// Test cases for invalid input
	testCases := []struct {
		name string
		req  *CreateMerchantRequest
		expectedError string
	}{
		{
			name: "empty name",
			req: &CreateMerchantRequest{
				Name:         "",
				ContactName:  "John Doe",
				ContactPhone: "13800138000",
				Email:        "john@example.com",
			},
			expectedError: "merchant name is required",
		},
		{
			name: "invalid email",
			req: &CreateMerchantRequest{
				Name:         "Test Merchant",
				ContactName:  "John Doe",
				ContactPhone: "13800138000",
				Email:        "invalid-email",
			},
			expectedError: "invalid email format",
		},
		{
			name: "invalid phone",
			req: &CreateMerchantRequest{
				Name:         "Test Merchant",
				ContactName:  "John Doe",
				ContactPhone: "123",
				Email:        "john@example.com",
			},
			expectedError: "invalid phone format",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			// Act
			result, err := suite.service.CreateMerchant(suite.ctx, tc.req)

			// Assert
			suite.Error(err)
			suite.Nil(result)
			suite.Contains(err.Error(), tc.expectedError)
		})
	}
}

func (suite *MerchantServiceTestSuite) TestGetMerchant_Success() {
	// Arrange
	merchantID := uint(1)
	expectedMerchant := &repository.Merchant{
		ID:           merchantID,
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}

	suite.mockRepo.On("GetByID", suite.ctx, merchantID).Return(expectedMerchant, nil)

	// Act
	result, err := suite.service.GetMerchant(suite.ctx, merchantID)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(expectedMerchant.ID, result.ID)
	suite.Equal(expectedMerchant.Name, result.Name)
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestGetMerchant_NotFound() {
	// Arrange
	merchantID := uint(999)
	suite.mockRepo.On("GetByID", suite.ctx, merchantID).Return(nil, repository.ErrMerchantNotFound)

	// Act
	result, err := suite.service.GetMerchant(suite.ctx, merchantID)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(repository.ErrMerchantNotFound, err)
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestUpdateMerchant_Success() {
	// Arrange
	merchantID := uint(1)
	req := &UpdateMerchantRequest{
		Name:         "Updated Merchant",
		ContactName:  "Jane Doe",
		ContactPhone: "13900139000",
		Email:        "jane@example.com",
		BusinessType: "retail",
	}

	existingMerchant := &repository.Merchant{
		ID:           merchantID,
		Name:         "Old Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
		CreatedAt:    time.Now().Add(-24 * time.Hour),
		UpdatedAt:    time.Now().Add(-1 * time.Hour),
	}

	suite.mockRepo.On("GetByID", suite.ctx, merchantID).Return(existingMerchant, nil)
	suite.mockRepo.On("Update", suite.ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil)

	// Act
	result, err := suite.service.UpdateMerchant(suite.ctx, merchantID, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(req.Name, result.Name)
	suite.Equal(req.ContactName, result.ContactName)
	suite.Equal(req.Email, result.Email)
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestListMerchants_Success() {
	// Arrange
	req := &ListMerchantsRequest{
		Page:     1,
		PageSize: 10,
		Status:   "active",
	}

	expectedMerchants := []*repository.Merchant{
		{
			ID:           1,
			Name:         "Merchant 1",
			ContactName:  "Contact 1",
			ContactPhone: "13800138001",
			Email:        "contact1@example.com",
			Status:       "active",
		},
		{
			ID:           2,
			Name:         "Merchant 2",
			ContactName:  "Contact 2",
			ContactPhone: "13800138002",
			Email:        "contact2@example.com",
			Status:       "active",
		},
	}

	expectedTotal := int64(2)

	repoReq := &repository.ListMerchantsRequest{
		Page:     req.Page,
		PageSize: req.PageSize,
		Status:   req.Status,
	}

	suite.mockRepo.On("List", suite.ctx, repoReq).Return(expectedMerchants, expectedTotal, nil)

	// Act
	result, err := suite.service.ListMerchants(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(len(expectedMerchants), len(result.Merchants))
	suite.Equal(expectedTotal, result.Total)
	suite.Equal(req.Page, result.Page)
	suite.Equal(req.PageSize, result.PageSize)
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestDeleteMerchant_Success() {
	// Arrange
	merchantID := uint(1)
	existingMerchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Status: "active",
	}

	suite.mockRepo.On("GetByID", suite.ctx, merchantID).Return(existingMerchant, nil)
	suite.mockRepo.On("Delete", suite.ctx, merchantID).Return(nil)

	// Act
	err := suite.service.DeleteMerchant(suite.ctx, merchantID)

	// Assert
	suite.NoError(err)
	suite.mockRepo.AssertExpectations(suite.T())
}

func (suite *MerchantServiceTestSuite) TestGenerateRechargeURL_Success() {
	// Arrange
	merchantID := uint(1)
	existingMerchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Status: "active",
	}

	suite.mockRepo.On("GetByID", suite.ctx, merchantID).Return(existingMerchant, nil)
	suite.mockRepo.On("Update", suite.ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil)

	// Act
	url, err := suite.service.GenerateRechargeURL(suite.ctx, merchantID)

	// Assert
	suite.NoError(err)
	suite.NotEmpty(url)
	suite.Contains(url, "/recharge/")
	suite.mockRepo.AssertExpectations(suite.T())
}

// Run the test suite
func TestMerchantServiceTestSuite(t *testing.T) {
	suite.Run(t, new(MerchantServiceTestSuite))
}

// Benchmark tests
func BenchmarkMerchantService_CreateMerchant(b *testing.B) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	req := &CreateMerchantRequest{
		Name:         "Benchmark Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
	}

	mockRepo.On("GetByName", ctx, req.Name).Return(nil, repository.ErrMerchantNotFound)
	mockRepo.On("Create", ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.CreateMerchant(ctx, req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkMerchantService_GetMerchant(b *testing.B) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	merchant := &repository.Merchant{
		ID:           1,
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		Status:       "active",
	}

	mockRepo.On("GetByID", ctx, uint(1)).Return(merchant, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetMerchant(ctx, 1)
		if err != nil {
			b.Fatal(err)
		}
	}
}
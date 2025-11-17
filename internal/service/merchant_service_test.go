package service

import (
	"context"
	"errors"
	"testing"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

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

func TestMerchantService_CreateMerchant(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	t.Run("successful creation", func(t *testing.T) {
		req := &CreateMerchantRequest{
			Name:        "Test Merchant",
			Code:        "TEST001",
			DailyLimit:  decimal.NewFromInt(10000),
			SingleLimit: decimal.NewFromInt(5000),
		}

		// Mock repository calls
		mockRepo.On("GetByCode", ctx, "TEST001").Return(nil, errors.New("not found")).Once()
		mockRepo.On("Create", ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil).Once()

		merchant, err := service.CreateMerchant(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, merchant)
		assert.Equal(t, "Test Merchant", merchant.Name)
		assert.Equal(t, "TEST001", merchant.Code)
		assert.Equal(t, "active", merchant.Status)
		mockRepo.AssertExpectations(t)
	})

	t.Run("duplicate code error", func(t *testing.T) {
		req := &CreateMerchantRequest{
			Name:        "Test Merchant",
			Code:        "EXISTING",
			DailyLimit:  decimal.NewFromInt(10000),
			SingleLimit: decimal.NewFromInt(5000),
		}

		existingMerchant := &repository.Merchant{
			ID:   uuid.New(),
			Code: "EXISTING",
		}

		mockRepo.On("GetByCode", ctx, "EXISTING").Return(existingMerchant, nil).Once()

		merchant, err := service.CreateMerchant(ctx, req)

		assert.Error(t, err)
		assert.Nil(t, merchant)
		assert.Contains(t, err.Error(), "already exists")
		mockRepo.AssertExpectations(t)
	})

	t.Run("invalid request - empty name", func(t *testing.T) {
		req := &CreateMerchantRequest{
			Name:        "",
			Code:        "TEST001",
			DailyLimit:  decimal.NewFromInt(10000),
			SingleLimit: decimal.NewFromInt(5000),
		}

		merchant, err := service.CreateMerchant(ctx, req)

		assert.Error(t, err)
		assert.Nil(t, merchant)
		assert.Contains(t, err.Error(), "name is required")
	})

	t.Run("invalid request - single limit greater than daily limit", func(t *testing.T) {
		req := &CreateMerchantRequest{
			Name:        "Test Merchant",
			Code:        "TEST001",
			DailyLimit:  decimal.NewFromInt(5000),
			SingleLimit: decimal.NewFromInt(10000),
		}

		merchant, err := service.CreateMerchant(ctx, req)

		assert.Error(t, err)
		assert.Nil(t, merchant)
		assert.Contains(t, err.Error(), "single limit cannot be greater than daily limit")
	})
}

func TestMerchantService_GetMerchant(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	t.Run("successful retrieval", func(t *testing.T) {
		merchantID := uuid.New()
		expectedMerchant := &repository.Merchant{
			ID:   merchantID,
			Name: "Test Merchant",
			Code: "TEST001",
		}

		mockRepo.On("GetByID", ctx, merchantID).Return(expectedMerchant, nil).Once()

		merchant, err := service.GetMerchant(ctx, merchantID)

		assert.NoError(t, err)
		assert.Equal(t, expectedMerchant, merchant)
		mockRepo.AssertExpectations(t)
	})

	t.Run("merchant not found", func(t *testing.T) {
		merchantID := uuid.New()

		mockRepo.On("GetByID", ctx, merchantID).Return(nil, errors.New("not found")).Once()

		merchant, err := service.GetMerchant(ctx, merchantID)

		assert.Error(t, err)
		assert.Nil(t, merchant)
		mockRepo.AssertExpectations(t)
	})
}

func TestMerchantService_UpdateMerchant(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	t.Run("successful update", func(t *testing.T) {
		merchantID := uuid.New()
		existingMerchant := &repository.Merchant{
			ID:     merchantID,
			Name:   "Old Name",
			Code:   "OLD001",
			Status: "active",
		}

		newName := "New Name"
		newStatus := "inactive"
		req := &UpdateMerchantRequest{
			Name:   &newName,
			Status: &newStatus,
		}

		mockRepo.On("GetByID", ctx, merchantID).Return(existingMerchant, nil).Once()
		mockRepo.On("Update", ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil).Once()

		merchant, err := service.UpdateMerchant(ctx, merchantID, req)

		assert.NoError(t, err)
		assert.NotNil(t, merchant)
		assert.Equal(t, "New Name", merchant.Name)
		assert.Equal(t, "inactive", merchant.Status)
		mockRepo.AssertExpectations(t)
	})

	t.Run("invalid status", func(t *testing.T) {
		merchantID := uuid.New()
		existingMerchant := &repository.Merchant{
			ID:     merchantID,
			Name:   "Test Merchant",
			Status: "active",
		}

		invalidStatus := "invalid_status"
		req := &UpdateMerchantRequest{
			Status: &invalidStatus,
		}

		mockRepo.On("GetByID", ctx, merchantID).Return(existingMerchant, nil).Once()

		merchant, err := service.UpdateMerchant(ctx, merchantID, req)

		assert.Error(t, err)
		assert.Nil(t, merchant)
		assert.Contains(t, err.Error(), "invalid status")
		mockRepo.AssertExpectations(t)
	})
}

func TestMerchantService_SearchMerchants(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	t.Run("successful search", func(t *testing.T) {
		keyword := "test"
		expectedMerchants := []*repository.Merchant{
			{ID: uuid.New(), Name: "Test Merchant 1"},
			{ID: uuid.New(), Name: "Test Merchant 2"},
		}

		mockRepo.On("Search", ctx, keyword).Return(expectedMerchants, nil).Once()

		merchants, err := service.SearchMerchants(ctx, keyword)

		assert.NoError(t, err)
		assert.Equal(t, expectedMerchants, merchants)
		mockRepo.AssertExpectations(t)
	})

	t.Run("empty keyword", func(t *testing.T) {
		merchants, err := service.SearchMerchants(ctx, "")

		assert.NoError(t, err)
		assert.Empty(t, merchants)
	})
}

func TestMerchantService_SetMerchantLimits(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)
	ctx := context.Background()

	t.Run("successful limit update", func(t *testing.T) {
		merchantID := uuid.New()
		existingMerchant := &repository.Merchant{
			ID:          merchantID,
			Name:        "Test Merchant",
			DailyLimit:  decimal.NewFromInt(5000),
			SingleLimit: decimal.NewFromInt(2500),
		}

		req := &SetMerchantLimitsRequest{
			DailyLimit:  decimal.NewFromInt(20000),
			SingleLimit: decimal.NewFromInt(10000),
		}

		mockRepo.On("GetByID", ctx, merchantID).Return(existingMerchant, nil).Once()
		mockRepo.On("Update", ctx, mock.AnythingOfType("*repository.Merchant")).Return(nil).Once()

		err := service.SetMerchantLimits(ctx, merchantID, req)

		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("invalid limits - single greater than daily", func(t *testing.T) {
		merchantID := uuid.New()

		req := &SetMerchantLimitsRequest{
			DailyLimit:  decimal.NewFromInt(5000),
			SingleLimit: decimal.NewFromInt(10000),
		}

		err := service.SetMerchantLimits(ctx, merchantID, req)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "single limit cannot be greater than daily limit")
	})

	t.Run("invalid limits - negative values", func(t *testing.T) {
		merchantID := uuid.New()

		req := &SetMerchantLimitsRequest{
			DailyLimit:  decimal.NewFromInt(-1000),
			SingleLimit: decimal.NewFromInt(500),
		}

		err := service.SetMerchantLimits(ctx, merchantID, req)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "daily limit cannot be negative")
	})
}
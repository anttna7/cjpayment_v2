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

// MockRotationRuleRepository is a mock implementation
type MockRotationRuleRepository struct {
	mock.Mock
}

func (m *MockRotationRuleRepository) Create(ctx context.Context, rule *repository.RotationRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

func (m *MockRotationRuleRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.RotationRule, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RotationRule), args.Error(1)
}

func (m *MockRotationRuleRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.RotationRule, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.RotationRule), args.Error(1)
}

func (m *MockRotationRuleRepository) Update(ctx context.Context, rule *repository.RotationRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

func (m *MockRotationRuleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRotationRuleRepository) List(ctx context.Context, filter *repository.RotationRuleFilter) ([]*repository.RotationRule, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.RotationRule), args.Error(1)
}

func TestRotationService_CreateRotationRule(t *testing.T) {
	mockRuleRepo := new(MockRotationRuleRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockMerchantAccountRepo := new(MockMerchantReceiveAccountRepository)

	service := NewRotationService(mockRuleRepo, mockAccountRepo, mockMerchantRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	t.Run("successful creation - weighted strategy", func(t *testing.T) {
		merchantID := uuid.New()
		account1ID := uuid.New()
		account2ID := uuid.New()

		req := &CreateRotationRuleRequest{
			MerchantID:   merchantID,
			RuleName:     "Test Weighted Rule",
			StrategyType: "weighted",
			StrategyConfig: repository.StrategyConfig{
				"weights": map[string]interface{}{
					account1ID.String(): 3.0,
					account2ID.String(): 2.0,
				},
			},
		}

		merchant := &repository.Merchant{ID: merchantID, Name: "Test Merchant"}

		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil).Once()
		mockRuleRepo.On("Create", ctx, mock.AnythingOfType("*repository.RotationRule")).Return(nil).Once()

		rule, err := service.CreateRotationRule(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, rule)
		assert.Equal(t, "Test Weighted Rule", rule.RuleName)
		assert.Equal(t, "weighted", rule.StrategyType)
		assert.True(t, rule.IsActive)
		mockMerchantRepo.AssertExpectations(t)
		mockRuleRepo.AssertExpectations(t)
	})

	t.Run("successful creation - time based strategy", func(t *testing.T) {
		merchantID := uuid.New()
		account1ID := uuid.New()

		req := &CreateRotationRuleRequest{
			MerchantID:   merchantID,
			RuleName:     "Test Time Based Rule",
			StrategyType: "time_based",
			StrategyConfig: repository.StrategyConfig{
				"time_slots": map[string]interface{}{
					"9":  []interface{}{account1ID.String()},
					"10": []interface{}{account1ID.String()},
				},
			},
		}

		merchant := &repository.Merchant{ID: merchantID, Name: "Test Merchant"}

		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil).Once()
		mockRuleRepo.On("Create", ctx, mock.AnythingOfType("*repository.RotationRule")).Return(nil).Once()

		rule, err := service.CreateRotationRule(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, rule)
		assert.Equal(t, "Test Time Based Rule", rule.RuleName)
		assert.Equal(t, "time_based", rule.StrategyType)
		mockMerchantRepo.AssertExpectations(t)
		mockRuleRepo.AssertExpectations(t)
	})

	t.Run("successful creation - amount tier strategy", func(t *testing.T) {
		merchantID := uuid.New()
		account1ID := uuid.New()
		account2ID := uuid.New()

		req := &CreateRotationRuleRequest{
			MerchantID:   merchantID,
			RuleName:     "Test Amount Tier Rule",
			StrategyType: "amount_tier",
			StrategyConfig: repository.StrategyConfig{
				"tiers": []interface{}{
					map[string]interface{}{
						"min_amount":  0.0,
						"max_amount":  1000.0,
						"account_ids": []interface{}{account1ID.String()},
					},
					map[string]interface{}{
						"min_amount":  1000.0,
						"max_amount":  10000.0,
						"account_ids": []interface{}{account2ID.String()},
					},
				},
			},
		}

		merchant := &repository.Merchant{ID: merchantID, Name: "Test Merchant"}

		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(merchant, nil).Once()
		mockRuleRepo.On("Create", ctx, mock.AnythingOfType("*repository.RotationRule")).Return(nil).Once()

		rule, err := service.CreateRotationRule(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, rule)
		assert.Equal(t, "Test Amount Tier Rule", rule.RuleName)
		assert.Equal(t, "amount_tier", rule.StrategyType)
		mockMerchantRepo.AssertExpectations(t)
		mockRuleRepo.AssertExpectations(t)
	})

	t.Run("merchant not found", func(t *testing.T) {
		merchantID := uuid.New()

		req := &CreateRotationRuleRequest{
			MerchantID:   merchantID,
			RuleName:     "Test Rule",
			StrategyType: "weighted",
			StrategyConfig: repository.StrategyConfig{
				"weights": map[string]interface{}{
					uuid.New().String(): 1.0,
				},
			},
		}

		mockMerchantRepo.On("GetByID", ctx, merchantID).Return(nil, errors.New("not found")).Once()

		rule, err := service.CreateRotationRule(ctx, req)

		assert.Error(t, err)
		assert.Nil(t, rule)
		assert.Contains(t, err.Error(), "merchant not found")
		mockMerchantRepo.AssertExpectations(t)
	})

	t.Run("invalid request - empty rule name", func(t *testing.T) {
		req := &CreateRotationRuleRequest{
			MerchantID:   uuid.New(),
			RuleName:     "",
			StrategyType: "weighted",
			StrategyConfig: repository.StrategyConfig{
				"weights": map[string]interface{}{
					uuid.New().String(): 1.0,
				},
			},
		}

		rule, err := service.CreateRotationRule(ctx, req)

		assert.Error(t, err)
		assert.Nil(t, rule)
		assert.Contains(t, err.Error(), "rule name is required")
	})

	t.Run("invalid strategy config - weighted without weights", func(t *testing.T) {
		merchantID := uuid.New()

		req := &CreateRotationRuleRequest{
			MerchantID:     merchantID,
			RuleName:       "Test Rule",
			StrategyType:   "weighted",
			StrategyConfig: repository.StrategyConfig{},
		}

		rule, err := service.CreateRotationRule(ctx, req)

		assert.Error(t, err)
		assert.Nil(t, rule)
		assert.Contains(t, err.Error(), "strategy config is required")
	})
}

func TestRotationService_ValidateStrategyConfig(t *testing.T) {
	service := &rotationService{}

	t.Run("valid weighted config", func(t *testing.T) {
		config := repository.StrategyConfig{
			"weights": map[string]interface{}{
				uuid.New().String(): 3.0,
				uuid.New().String(): 2.0,
			},
		}

		err := service.ValidateStrategyConfig("weighted", config)
		assert.NoError(t, err)
	})

	t.Run("invalid weighted config - missing weights", func(t *testing.T) {
		config := repository.StrategyConfig{}

		err := service.ValidateStrategyConfig("weighted", config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "weights configuration is required")
	})

	t.Run("invalid weighted config - invalid account ID", func(t *testing.T) {
		config := repository.StrategyConfig{
			"weights": map[string]interface{}{
				"invalid-uuid": 3.0,
			},
		}

		err := service.ValidateStrategyConfig("weighted", config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid account ID")
	})

	t.Run("valid time based config", func(t *testing.T) {
		config := repository.StrategyConfig{
			"time_slots": map[string]interface{}{
				"9":  []interface{}{uuid.New().String()},
				"10": []interface{}{uuid.New().String()},
			},
		}

		err := service.ValidateStrategyConfig("time_based", config)
		assert.NoError(t, err)
	})

	t.Run("invalid time based config - missing time_slots", func(t *testing.T) {
		config := repository.StrategyConfig{}

		err := service.ValidateStrategyConfig("time_based", config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "time_slots configuration is required")
	})

	t.Run("valid amount tier config", func(t *testing.T) {
		config := repository.StrategyConfig{
			"tiers": []interface{}{
				map[string]interface{}{
					"min_amount":  0.0,
					"max_amount":  1000.0,
					"account_ids": []interface{}{uuid.New().String()},
				},
			},
		}

		err := service.ValidateStrategyConfig("amount_tier", config)
		assert.NoError(t, err)
	})

	t.Run("invalid amount tier config - missing tiers", func(t *testing.T) {
		config := repository.StrategyConfig{}

		err := service.ValidateStrategyConfig("amount_tier", config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "tiers configuration is required")
	})

	t.Run("invalid amount tier config - empty tiers", func(t *testing.T) {
		config := repository.StrategyConfig{
			"tiers": []interface{}{},
		}

		err := service.ValidateStrategyConfig("amount_tier", config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "at least one tier must be specified")
	})

	t.Run("unsupported strategy type", func(t *testing.T) {
		config := repository.StrategyConfig{}

		err := service.ValidateStrategyConfig("unsupported", config)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported strategy type")
	})
}

func TestRotationService_SelectAccount(t *testing.T) {
	mockRuleRepo := new(MockRotationRuleRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockMerchantAccountRepo := new(MockMerchantReceiveAccountRepository)

	service := NewRotationService(mockRuleRepo, mockAccountRepo, mockMerchantRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	t.Run("successful selection with weighted rule", func(t *testing.T) {
		merchantID := uuid.New()
		account1ID := uuid.New()
		account2ID := uuid.New()
		amount := decimal.NewFromInt(1000)
		paymentType := "private"

		accounts := []*repository.ReceiveAccount{
			{ID: account1ID, AccountName: "Account 1"},
			{ID: account2ID, AccountName: "Account 2"},
		}

		rules := []*repository.RotationRule{
			{
				ID:           uuid.New(),
				MerchantID:   merchantID,
				RuleName:     "Weighted Rule",
				StrategyType: "weighted",
				StrategyConfig: repository.StrategyConfig{
					"weights": map[string]interface{}{
						account1ID.String(): 3.0,
						account2ID.String(): 2.0,
					},
				},
				IsActive: true,
			},
		}

		mockAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return(accounts, nil).Once()
		mockRuleRepo.On("GetByMerchant", ctx, merchantID).Return(rules, nil).Once()

		account, err := service.SelectAccount(ctx, merchantID, amount, paymentType)

		assert.NoError(t, err)
		assert.NotNil(t, account)
		assert.Contains(t, []uuid.UUID{account1ID, account2ID}, account.ID)
		mockAccountRepo.AssertExpectations(t)
		mockRuleRepo.AssertExpectations(t)
	})

	t.Run("no available accounts", func(t *testing.T) {
		merchantID := uuid.New()
		amount := decimal.NewFromInt(1000)
		paymentType := "private"

		mockAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return([]*repository.ReceiveAccount{}, nil).Once()

		account, err := service.SelectAccount(ctx, merchantID, amount, paymentType)

		assert.Error(t, err)
		assert.Nil(t, account)
		assert.Contains(t, err.Error(), "no available accounts found")
		mockAccountRepo.AssertExpectations(t)
	})

	t.Run("no active rules - fallback to weight-based selection", func(t *testing.T) {
		merchantID := uuid.New()
		account1ID := uuid.New()
		account2ID := uuid.New()
		amount := decimal.NewFromInt(1000)
		paymentType := "private"

		accounts := []*repository.ReceiveAccount{
			{ID: account1ID, AccountName: "Account 1"},
			{ID: account2ID, AccountName: "Account 2"},
		}

		rules := []*repository.RotationRule{
			{
				ID:         uuid.New(),
				MerchantID: merchantID,
				IsActive:   false, // Inactive rule
			},
		}

		relationships := []*repository.MerchantReceiveAccount{
			{
				MerchantID:       merchantID,
				ReceiveAccountID: account1ID,
				Weight:           5,
				IsActive:         true,
			},
			{
				MerchantID:       merchantID,
				ReceiveAccountID: account2ID,
				Weight:           3,
				IsActive:         true,
			},
		}

		mockAccountRepo.On("GetAvailableAccounts", ctx, merchantID, amount, paymentType).Return(accounts, nil).Once()
		mockRuleRepo.On("GetByMerchant", ctx, merchantID).Return(rules, nil).Once()
		mockMerchantAccountRepo.On("GetByMerchant", ctx, merchantID).Return(relationships, nil).Once()

		account, err := service.SelectAccount(ctx, merchantID, amount, paymentType)

		assert.NoError(t, err)
		assert.NotNil(t, account)
		assert.Contains(t, []uuid.UUID{account1ID, account2ID}, account.ID)
		mockAccountRepo.AssertExpectations(t)
		mockRuleRepo.AssertExpectations(t)
		mockMerchantAccountRepo.AssertExpectations(t)
	})
}
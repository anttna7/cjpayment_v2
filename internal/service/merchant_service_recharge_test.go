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

func TestMerchantService_CreateMerchant_RechargeSystem(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantServiceWithConfig(mockRepo, "https://test.example.com")

	tests := []struct {
		name    string
		req     *CreateMerchantRequest
		setup   func()
		wantErr bool
		errMsg  string
	}{
		{
			name: "successful creation with recharge fields",
			req: &CreateMerchantRequest{
				Name:         "Test Merchant",
				Code:         "TEST001",
				ContactEmail: stringPtr("test@example.com"),
				ContactPhone: stringPtr("13800138000"),
				DailyLimit:   decimal.NewFromFloat(10000),
				SingleLimit:  decimal.NewFromFloat(1000),
				AgentName:    stringPtr("Test Agent"),
				PortName:     stringPtr("Test Port"),
				BusinessType: stringPtr("e-commerce"),
				Remark:       stringPtr("Test merchant for recharge system"),
			},
			setup: func() {
				mockRepo.On("ExistsByName", mock.Anything, "Test Merchant").Return(false, nil)
				mockRepo.On("GetByCode", mock.Anything, "TEST001").Return(nil, repository.ErrNotFound)
				mockRepo.On("ExistsByPortName", mock.Anything, "Test Port").Return(false, nil)
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.Merchant")).Return(nil)
			},
			wantErr: false,
		},
		{
			name: "duplicate merchant name",
			req: &CreateMerchantRequest{
				Name:        "Existing Merchant",
				Code:        "TEST002",
				DailyLimit:  decimal.NewFromFloat(10000),
				SingleLimit: decimal.NewFromFloat(1000),
			},
			setup: func() {
				mockRepo.On("ExistsByName", mock.Anything, "Existing Merchant").Return(true, nil)
			},
			wantErr: true,
			errMsg:  "merchant with name 'Existing Merchant' already exists",
		},
		{
			name: "duplicate port name",
			req: &CreateMerchantRequest{
				Name:        "New Merchant",
				Code:        "TEST003",
				DailyLimit:  decimal.NewFromFloat(10000),
				SingleLimit: decimal.NewFromFloat(1000),
				PortName:    stringPtr("Existing Port"),
			},
			setup: func() {
				mockRepo.On("ExistsByName", mock.Anything, "New Merchant").Return(false, nil)
				mockRepo.On("GetByCode", mock.Anything, "TEST003").Return(nil, repository.ErrNotFound)
				mockRepo.On("ExistsByPortName", mock.Anything, "Existing Port").Return(true, nil)
			},
			wantErr: true,
			errMsg:  "merchant with port name 'Existing Port' already exists",
		},
		{
			name: "invalid email format",
			req: &CreateMerchantRequest{
				Name:         "Test Merchant",
				Code:         "TEST004",
				ContactEmail: stringPtr("invalid-email"),
				DailyLimit:   decimal.NewFromFloat(10000),
				SingleLimit:  decimal.NewFromFloat(1000),
			},
			setup:   func() {},
			wantErr: true,
			errMsg:  "invalid email format",
		},
		{
			name: "invalid limits",
			req: &CreateMerchantRequest{
				Name:        "Test Merchant",
				Code:        "TEST005",
				DailyLimit:  decimal.NewFromFloat(1000),
				SingleLimit: decimal.NewFromFloat(2000), // Single limit > daily limit
			},
			setup:   func() {},
			wantErr: true,
			errMsg:  "single limit cannot be greater than daily limit",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			tt.setup()

			merchant, err := service.CreateMerchant(context.Background(), tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
				assert.Nil(t, merchant)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, merchant)
				assert.Equal(t, tt.req.Name, merchant.Name)
				assert.Equal(t, tt.req.Code, merchant.Code)
				assert.Equal(t, "active", merchant.Status)
				assert.False(t, merchant.IsRechargeEnabled) // Default to disabled
				assert.NotNil(t, merchant.RechargePageConfig)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestMerchantService_GenerateRechargeURL(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantServiceWithConfig(mockRepo, "https://test.example.com")

	merchantID := uuid.New()
	merchant := &repository.Merchant{
		ID:     merchantID,
		Name:   "Test Merchant",
		Code:   "TEST001",
		Status: "active",
	}

	tests := []struct {
		name    string
		setup   func()
		wantErr bool
		errMsg  string
	}{
		{
			name: "successful URL generation",
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
				mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.Merchant")).Return(nil)
			},
			wantErr: false,
		},
		{
			name: "merchant not found",
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(nil, repository.ErrNotFound)
			},
			wantErr: true,
			errMsg:  "merchant not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			tt.setup()

			url, err := service.GenerateRechargeURL(context.Background(), merchantID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
				assert.Empty(t, url)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, url)
				assert.Contains(t, url, "https://test.example.com/recharge/")
				assert.Contains(t, url, "TEST001")
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestMerchantService_EnableRechargeService(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)

	merchantID := uuid.New()
	merchant := &repository.Merchant{
		ID:                merchantID,
		Name:              "Test Merchant",
		Code:              "TEST001",
		Status:            "active",
		IsRechargeEnabled: false,
	}

	tests := []struct {
		name    string
		enabled bool
		setup   func()
		wantErr bool
		errMsg  string
	}{
		{
			name:    "enable recharge service",
			enabled: true,
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
				mockRepo.On("Update", mock.Anything, mock.MatchedBy(func(m *repository.Merchant) bool {
					return m.IsRechargeEnabled == true
				})).Return(nil)
			},
			wantErr: false,
		},
		{
			name:    "disable recharge service",
			enabled: false,
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
				mockRepo.On("Update", mock.Anything, mock.MatchedBy(func(m *repository.Merchant) bool {
					return m.IsRechargeEnabled == false
				})).Return(nil)
			},
			wantErr: false,
		},
		{
			name:    "merchant not found",
			enabled: true,
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(nil, repository.ErrNotFound)
			},
			wantErr: true,
			errMsg:  "merchant not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			tt.setup()

			err := service.EnableRechargeService(context.Background(), merchantID, tt.enabled)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestMerchantService_ValidateMerchantInfo(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)

	tests := []struct {
		name     string
		req      *ValidateMerchantInfoRequest
		setup    func()
		wantErr  bool
		expected *ValidateMerchantInfoResponse
	}{
		{
			name: "valid merchant info",
			req: &ValidateMerchantInfoRequest{
				Name:         "Valid Merchant",
				Code:         "VALID001",
				PortName:     "Valid Port",
				ContactEmail: "valid@example.com",
				ContactPhone: "13800138000",
				SingleLimit:  decimal.NewFromFloat(1000),
				DailyLimit:   decimal.NewFromFloat(10000),
			},
			setup: func() {
				mockRepo.On("ExistsByName", mock.Anything, "Valid Merchant").Return(false, nil)
				mockRepo.On("GetByCode", mock.Anything, "VALID001").Return(nil, repository.ErrNotFound)
				mockRepo.On("ExistsByPortName", mock.Anything, "Valid Port").Return(false, nil)
			},
			wantErr: false,
			expected: &ValidateMerchantInfoResponse{
				IsValid: true,
				Errors:  map[string]string{},
			},
		},
		{
			name: "duplicate name and invalid email",
			req: &ValidateMerchantInfoRequest{
				Name:         "Existing Merchant",
				Code:         "VALID002",
				ContactEmail: "invalid-email",
				SingleLimit:  decimal.NewFromFloat(1000),
				DailyLimit:   decimal.NewFromFloat(10000),
			},
			setup: func() {
				mockRepo.On("ExistsByName", mock.Anything, "Existing Merchant").Return(true, nil)
				mockRepo.On("GetByCode", mock.Anything, "VALID002").Return(nil, repository.ErrNotFound)
			},
			wantErr: false,
			expected: &ValidateMerchantInfoResponse{
				IsValid: false,
				Errors: map[string]string{
					"name":          "Merchant name already exists",
					"contact_email": "invalid email format",
				},
			},
		},
		{
			name: "invalid limits",
			req: &ValidateMerchantInfoRequest{
				Name:        "Test Merchant",
				Code:        "VALID003",
				SingleLimit: decimal.NewFromFloat(2000),
				DailyLimit:  decimal.NewFromFloat(1000), // Daily < Single
			},
			setup: func() {
				mockRepo.On("ExistsByName", mock.Anything, "Test Merchant").Return(false, nil)
				mockRepo.On("GetByCode", mock.Anything, "VALID003").Return(nil, repository.ErrNotFound)
			},
			wantErr: false,
			expected: &ValidateMerchantInfoResponse{
				IsValid: false,
				Errors: map[string]string{
					"limits": "single limit cannot be greater than daily limit",
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			tt.setup()

			response, err := service.ValidateMerchantInfo(context.Background(), tt.req)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected.IsValid, response.IsValid)
				assert.Equal(t, len(tt.expected.Errors), len(response.Errors))
				for key, expectedMsg := range tt.expected.Errors {
					assert.Contains(t, response.Errors[key], expectedMsg)
				}
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestMerchantService_UpdateRechargePageConfig(t *testing.T) {
	mockRepo := new(MockMerchantRepository)
	service := NewMerchantService(mockRepo)

	merchantID := uuid.New()
	merchant := &repository.Merchant{
		ID:                 merchantID,
		Name:               "Test Merchant",
		Code:               "TEST001",
		Status:             "active",
		RechargePageConfig: make(map[string]interface{}),
	}

	tests := []struct {
		name    string
		config  map[string]interface{}
		setup   func()
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid config update",
			config: map[string]interface{}{
				"page_title":        "Custom Recharge Page",
				"show_merchant_info": true,
				"payment_methods":   []interface{}{"alipay", "wechat"},
				"footer_text":       "Contact us for support",
			},
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
				mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.Merchant")).Return(nil)
			},
			wantErr: false,
		},
		{
			name: "invalid config key",
			config: map[string]interface{}{
				"invalid_key": "value",
			},
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
			},
			wantErr: true,
			errMsg:  "invalid configuration key: invalid_key",
		},
		{
			name: "invalid payment methods",
			config: map[string]interface{}{
				"payment_methods": []interface{}{"invalid_method"},
			},
			setup: func() {
				mockRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
			},
			wantErr: true,
			errMsg:  "invalid payment method",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockRepo.ExpectedCalls = nil
			mockRepo.Calls = nil

			tt.setup()

			err := service.UpdateRechargePageConfig(context.Background(), merchantID, tt.config)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errMsg)
			} else {
				assert.NoError(t, err)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}
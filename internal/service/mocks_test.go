package service

import (
	"context"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"
)

// MockLimitAlertRepository for testing limit service
type MockLimitAlertRepository struct {
	mock.Mock
}

func (m *MockLimitAlertRepository) Create(ctx context.Context, alert *repository.LimitAlert) error {
	args := m.Called(ctx, alert)
	return args.Error(0)
}

func (m *MockLimitAlertRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.LimitAlert, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.LimitAlert), args.Error(1)
}

func (m *MockLimitAlertRepository) Update(ctx context.Context, alert *repository.LimitAlert) error {
	args := m.Called(ctx, alert)
	return args.Error(0)
}

func (m *MockLimitAlertRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockLimitAlertRepository) List(ctx context.Context, filter *repository.LimitAlertFilter) ([]*repository.LimitAlert, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.LimitAlert), args.Error(1)
}

func (m *MockLimitAlertRepository) Count(ctx context.Context, filter *repository.LimitAlertFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockLimitAlertRepository) GetUnresolvedAlerts(ctx context.Context, entityID uuid.UUID, alertType string) ([]*repository.LimitAlert, error) {
	args := m.Called(ctx, entityID, alertType)
	return args.Get(0).([]*repository.LimitAlert), args.Error(1)
}

func (m *MockLimitAlertRepository) ResolveAlert(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// Add methods to existing mock repositories for limit management

// MockMerchantRepository additional methods
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

// MockReceiveAccountRepository additional methods
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

// MockRechargeOrderRepository for testing
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
	return args.Get(0).([]*repository.RechargeOrder), args.Error(1)
}

func (m *MockRechargeOrderRepository) Count(ctx context.Context, filter *repository.RechargeOrderFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRechargeOrderRepository) GetByStatus(ctx context.Context, status string) ([]*repository.RechargeOrder, error) {
	args := m.Called(ctx, status)
	return args.Get(0).([]*repository.RechargeOrder), args.Error(1)
}

// MockRotationService for testing
type MockRotationService struct {
	mock.Mock
}

func (m *MockRotationService) CreateRotationRule(ctx context.Context, req *CreateRotationRuleRequest) (*repository.RotationRule, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RotationRule), args.Error(1)
}

func (m *MockRotationService) GetRotationRule(ctx context.Context, id uuid.UUID) (*repository.RotationRule, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RotationRule), args.Error(1)
}

func (m *MockRotationService) UpdateRotationRule(ctx context.Context, id uuid.UUID, req *UpdateRotationRuleRequest) (*repository.RotationRule, error) {
	args := m.Called(ctx, id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.RotationRule), args.Error(1)
}

func (m *MockRotationService) DeleteRotationRule(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRotationService) ListRotationRules(ctx context.Context, filter *repository.RotationRuleFilter) ([]*repository.RotationRule, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.RotationRule), args.Error(1)
}

func (m *MockRotationService) GetMerchantRotationRules(ctx context.Context, merchantID uuid.UUID) ([]*repository.RotationRule, error) {
	args := m.Called(ctx, merchantID)
	return args.Get(0).([]*repository.RotationRule), args.Error(1)
}

func (m *MockRotationService) SelectAccount(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID, amount, paymentType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockRotationService) ValidateStrategyConfig(strategyType string, config repository.StrategyConfig) error {
	args := m.Called(strategyType, config)
	return args.Error(0)
}

// MockLimitService for testing
type MockLimitService struct {
	mock.Mock
}

func (m *MockLimitService) CheckAccountLimits(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*LimitCheckResult, error) {
	args := m.Called(ctx, accountID, amount)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*LimitCheckResult), args.Error(1)
}

func (m *MockLimitService) UpdateAccountDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	args := m.Called(ctx, accountID, amount)
	return args.Error(0)
}

func (m *MockLimitService) ResetAccountDailyLimits(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockLimitService) GetAccountLimitStatus(ctx context.Context, accountID uuid.UUID) (*AccountLimitStatus, error) {
	args := m.Called(ctx, accountID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*AccountLimitStatus), args.Error(1)
}

func (m *MockLimitService) CheckMerchantLimits(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) (*LimitCheckResult, error) {
	args := m.Called(ctx, merchantID, amount)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*LimitCheckResult), args.Error(1)
}

func (m *MockLimitService) UpdateMerchantDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error {
	args := m.Called(ctx, merchantID, amount)
	return args.Error(0)
}

func (m *MockLimitService) ResetMerchantDailyLimits(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockLimitService) GetMerchantLimitStatus(ctx context.Context, merchantID uuid.UUID) (*MerchantLimitStatus, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*MerchantLimitStatus), args.Error(1)
}

func (m *MockLimitService) GetLimitAlerts(ctx context.Context, filter *LimitAlertFilter) ([]*LimitAlert, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*LimitAlert), args.Error(1)
}

func (m *MockLimitService) CreateLimitAlert(ctx context.Context, alert *LimitAlert) error {
	args := m.Called(ctx, alert)
	return args.Error(0)
}

func (m *MockLimitService) SetAccountLimits(ctx context.Context, accountID uuid.UUID, req *SetAccountLimitsRequest) error {
	args := m.Called(ctx, accountID, req)
	return args.Error(0)
}

func (m *MockLimitService) SetMerchantLimits(ctx context.Context, merchantID uuid.UUID, req *SetMerchantLimitsRequest) error {
	args := m.Called(ctx, merchantID, req)
	return args.Error(0)
}

func (m *MockLimitService) GetMerchantLimitStatuses(ctx context.Context, filter *MerchantLimitStatusFilter) ([]*MerchantLimitStatus, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*MerchantLimitStatus), args.Error(1)
}

func (m *MockLimitService) GetLimitUtilizationReport(ctx context.Context, filter *LimitUtilizationFilter) (*LimitUtilizationReport, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*LimitUtilizationReport), args.Error(1)
}

func (m *MockLimitService) UpdateMerchantLimitsWithValidation(ctx context.Context, merchantID uuid.UUID, req *UpdateMerchantLimitsRequest) error {
	args := m.Called(ctx, merchantID, req)
	return args.Error(0)
}

func (m *MockLimitService) GetLimitViolations(ctx context.Context, filter *LimitViolationFilter) ([]*LimitViolation, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*LimitViolation), args.Error(1)
}
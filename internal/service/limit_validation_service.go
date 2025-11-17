package service

import (
	"context"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// LimitValidationService provides comprehensive limit validation
type LimitValidationService struct {
	merchantRepo       repository.MerchantRepository
	receiveAccountRepo repository.ReceiveAccountRepository
	rechargeOrderRepo  repository.RechargeOrderRepository
	limitService       LimitService
}

// NewLimitValidationService creates a new limit validation service
func NewLimitValidationService(
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
	limitService LimitService,
) *LimitValidationService {
	return &LimitValidationService{
		merchantRepo:       merchantRepo,
		receiveAccountRepo: receiveAccountRepo,
		rechargeOrderRepo:  rechargeOrderRepo,
		limitService:       limitService,
	}
}

// LimitValidationResult represents limit validation result
type LimitValidationResult struct {
	Valid                bool                      `json:"valid"`
	Errors               []BusinessValidationError `json:"errors,omitempty"`
	MerchantLimitStatus  *LimitStatus             `json:"merchant_limit_status,omitempty"`
	AccountLimitStatus   *LimitStatus             `json:"account_limit_status,omitempty"`
	SystemLimitStatus    *LimitStatus             `json:"system_limit_status,omitempty"`
}

// LimitStatus represents current limit usage status
type LimitStatus struct {
	SingleLimit     decimal.Decimal `json:"single_limit"`
	DailyLimit      decimal.Decimal `json:"daily_limit"`
	DailyUsed       decimal.Decimal `json:"daily_used"`
	DailyRemaining  decimal.Decimal `json:"daily_remaining"`
	TransactionCount int            `json:"transaction_count"`
	LastResetTime   time.Time       `json:"last_reset_time"`
}

// ValidateAmountAndLimits performs comprehensive amount and limit validation
func (s *LimitValidationService) ValidateAmountAndLimits(ctx context.Context, req *AmountLimitValidationRequest) LimitValidationResult {
	var errors []BusinessValidationError
	result := LimitValidationResult{Valid: true}

	// 1. Validate merchant limits
	merchantStatus, err := s.validateMerchantLimits(ctx, req.MerchantID, req.Amount)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_limits",
			Message: err.Error(),
			Code:    "MERCHANT_LIMIT_ERROR",
		})
	}
	result.MerchantLimitStatus = merchantStatus

	// 2. Validate account limits
	accountStatus, err := s.validateAccountLimits(ctx, req.AccountID, req.Amount)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "account_limits",
			Message: err.Error(),
			Code:    "ACCOUNT_LIMIT_ERROR",
		})
	}
	result.AccountLimitStatus = accountStatus

	// 3. Validate system-wide limits
	systemStatus, err := s.validateSystemLimits(ctx, req.Amount)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "system_limits",
			Message: err.Error(),
			Code:    "SYSTEM_LIMIT_ERROR",
		})
	}
	result.SystemLimitStatus = systemStatus

	// 4. Cross-validate limits consistency
	if crossErr := s.validateLimitsConsistency(merchantStatus, accountStatus); crossErr != nil {
		errors = append(errors, *crossErr)
	}

	result.Valid = len(errors) == 0
	result.Errors = errors
	return result
}

// validateMerchantLimits validates merchant-specific limits
func (s *LimitValidationService) validateMerchantLimits(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) (*LimitStatus, error) {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("商户不存在")
	}

	status := &LimitStatus{
		SingleLimit: merchant.SingleLimit,
		DailyLimit:  merchant.DailyLimit,
	}

	// Check single transaction limit
	if !merchant.SingleLimit.IsZero() && amount.GreaterThan(merchant.SingleLimit) {
		return status, fmt.Errorf("交易金额 %s 超过商户单笔限额 %s", amount.String(), merchant.SingleLimit.String())
	}

	// Calculate daily usage
	today := time.Now().Truncate(24 * time.Hour)
	dailyUsage, transactionCount, err := s.calculateMerchantDailyUsage(ctx, merchantID, today)
	if err != nil {
		return status, fmt.Errorf("无法计算商户日限额使用情况")
	}

	status.DailyUsed = dailyUsage
	status.DailyRemaining = merchant.DailyLimit.Sub(dailyUsage)
	status.TransactionCount = transactionCount
	status.LastResetTime = today

	// Check daily limit
	if !merchant.DailyLimit.IsZero() && dailyUsage.Add(amount).GreaterThan(merchant.DailyLimit) {
		return status, fmt.Errorf("交易金额将使商户日限额超出，当前已用 %s，限额 %s", dailyUsage.String(), merchant.DailyLimit.String())
	}

	return status, nil
}

// validateAccountLimits validates account-specific limits
func (s *LimitValidationService) validateAccountLimits(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*LimitStatus, error) {
	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, fmt.Errorf("收款账户不存在")
	}

	status := &LimitStatus{
		SingleLimit:      account.SingleLimit,
		DailyLimit:       account.DailyLimit,
		DailyUsed:        account.DailyUsed,
		DailyRemaining:   account.DailyLimit.Sub(account.DailyUsed),
		LastResetTime:    account.LastResetDate,
	}

	// Check if daily limits need reset
	if s.shouldResetDailyLimits(account.LastResetDate) {
		// Reset daily usage
		err = s.receiveAccountRepo.ResetDailyLimits(ctx)
		if err != nil {
			return status, fmt.Errorf("无法重置账户日限额")
		}
		status.DailyUsed = decimal.Zero
		status.DailyRemaining = account.DailyLimit
		status.LastResetTime = time.Now().Truncate(24 * time.Hour)
	}

	// Check single transaction limit
	if !account.SingleLimit.IsZero() && amount.GreaterThan(account.SingleLimit) {
		return status, fmt.Errorf("交易金额 %s 超过账户单笔限额 %s", amount.String(), account.SingleLimit.String())
	}

	// Check daily limit
	if !account.DailyLimit.IsZero() && status.DailyUsed.Add(amount).GreaterThan(account.DailyLimit) {
		return status, fmt.Errorf("交易金额将使账户日限额超出，当前已用 %s，限额 %s", status.DailyUsed.String(), account.DailyLimit.String())
	}

	// Calculate transaction count for today
	today := time.Now().Truncate(24 * time.Hour)
	transactionCount, err := s.calculateAccountTransactionCount(ctx, accountID, today)
	if err == nil {
		status.TransactionCount = transactionCount
	}

	return status, nil
}

// validateSystemLimits validates system-wide limits
func (s *LimitValidationService) validateSystemLimits(ctx context.Context, amount decimal.Decimal) (*LimitStatus, error) {
	// System-wide limits (configurable)
	systemSingleLimit := decimal.NewFromFloat(100000)  // 10万单笔限额
	systemDailyLimit := decimal.NewFromFloat(10000000) // 1000万日限额
	maxDailyTransactions := 10000                      // 每日最大交易数

	status := &LimitStatus{
		SingleLimit: systemSingleLimit,
		DailyLimit:  systemDailyLimit,
	}

	// Check system single transaction limit
	if amount.GreaterThan(systemSingleLimit) {
		return status, fmt.Errorf("交易金额 %s 超过系统单笔限额 %s", amount.String(), systemSingleLimit.String())
	}

	// Calculate system daily usage
	today := time.Now().Truncate(24 * time.Hour)
	dailyUsage, transactionCount, err := s.calculateSystemDailyUsage(ctx, today)
	if err != nil {
		return status, fmt.Errorf("无法计算系统日限额使用情况")
	}

	status.DailyUsed = dailyUsage
	status.DailyRemaining = systemDailyLimit.Sub(dailyUsage)
	status.TransactionCount = transactionCount
	status.LastResetTime = today

	// Check system daily limit
	if dailyUsage.Add(amount).GreaterThan(systemDailyLimit) {
		return status, fmt.Errorf("交易金额将使系统日限额超出，当前已用 %s，限额 %s", dailyUsage.String(), systemDailyLimit.String())
	}

	// Check daily transaction count
	if transactionCount >= maxDailyTransactions {
		return status, fmt.Errorf("系统今日交易次数已达上限 %d", maxDailyTransactions)
	}

	return status, nil
}

// validateLimitsConsistency validates consistency between different limit levels
func (s *LimitValidationService) validateLimitsConsistency(merchantStatus, accountStatus *LimitStatus) *BusinessValidationError {
	if merchantStatus == nil || accountStatus == nil {
		return nil
	}

	// Check if merchant single limit is higher than account single limit
	if !merchantStatus.SingleLimit.IsZero() && !accountStatus.SingleLimit.IsZero() {
		if merchantStatus.SingleLimit.GreaterThan(accountStatus.SingleLimit) {
			return &BusinessValidationError{
				Field:   "limit_consistency",
				Message: "商户单笔限额不能高于收款账户单笔限额",
				Code:    "INCONSISTENT_SINGLE_LIMITS",
			}
		}
	}

	// Check if merchant daily limit is higher than account daily limit
	if !merchantStatus.DailyLimit.IsZero() && !accountStatus.DailyLimit.IsZero() {
		if merchantStatus.DailyLimit.GreaterThan(accountStatus.DailyLimit) {
			return &BusinessValidationError{
				Field:   "limit_consistency",
				Message: "商户日限额不能高于收款账户日限额",
				Code:    "INCONSISTENT_DAILY_LIMITS",
			}
		}
	}

	return nil
}

// Helper methods

func (s *LimitValidationService) calculateMerchantDailyUsage(ctx context.Context, merchantID uuid.UUID, date time.Time) (decimal.Decimal, int, error) {
	endDate := date.Add(24 * time.Hour)
	
	filter := &repository.RechargeOrderFilter{
		MerchantID: &merchantID,
		StartDate:  &date,
		EndDate:    &endDate,
		Status:     []string{"confirmed", "paid"}, // Only count successful transactions
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return decimal.Zero, 0, err
	}

	var totalAmount decimal.Decimal
	for _, order := range orders {
		totalAmount = totalAmount.Add(order.Amount)
	}

	return totalAmount, len(orders), nil
}

func (s *LimitValidationService) calculateAccountTransactionCount(ctx context.Context, accountID uuid.UUID, date time.Time) (int, error) {
	endDate := date.Add(24 * time.Hour)
	
	filter := &repository.RechargeOrderFilter{
		StartDate: &date,
		EndDate:   &endDate,
		Status:    []string{"confirmed", "paid"},
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return 0, err
	}

	// Filter by account ID since we can't filter in the query
	count := 0
	for _, order := range orders {
		if order.ReceiveAccountID == accountID {
			count++
		}
	}

	return count, nil
}

func (s *LimitValidationService) calculateSystemDailyUsage(ctx context.Context, date time.Time) (decimal.Decimal, int, error) {
	endDate := date.Add(24 * time.Hour)
	
	filter := &repository.RechargeOrderFilter{
		StartDate: &date,
		EndDate:   &endDate,
		Status:    []string{"confirmed", "paid"},
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return decimal.Zero, 0, err
	}

	var totalAmount decimal.Decimal
	for _, order := range orders {
		totalAmount = totalAmount.Add(order.Amount)
	}

	return totalAmount, len(orders), nil
}

func (s *LimitValidationService) shouldResetDailyLimits(lastResetTime time.Time) bool {
	today := time.Now().Truncate(24 * time.Hour)
	lastReset := lastResetTime.Truncate(24 * time.Hour)
	return today.After(lastReset)
}

// Request types

type AmountLimitValidationRequest struct {
	MerchantID uuid.UUID       `json:"merchant_id"`
	AccountID  uuid.UUID       `json:"account_id"`
	Amount     decimal.Decimal `json:"amount"`
}

// ValidateRechargeAmountLimits validates amount against all applicable limits
func (s *LimitValidationService) ValidateRechargeAmountLimits(ctx context.Context, merchantID uuid.UUID, accountID uuid.UUID, amount decimal.Decimal) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get merchant by ID
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_name",
			Message: "商户不存在",
			Code:    "MERCHANT_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Validate limits
	req := &AmountLimitValidationRequest{
		MerchantID: merchant.ID,
		AccountID:  accountID,
		Amount:     amount,
	}

	result := s.ValidateAmountAndLimits(ctx, req)
	
	return BusinessValidationResult{
		Valid:  result.Valid,
		Errors: result.Errors,
	}
}

// PreValidateTransaction performs pre-transaction validation
func (s *LimitValidationService) PreValidateTransaction(ctx context.Context, req *PreTransactionValidationRequest) BusinessValidationResult {
	var errors []BusinessValidationError

	// 1. Validate merchant status and limits
	merchant, err := s.merchantRepo.GetByID(ctx, req.MerchantID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_id",
			Message: "商户不存在",
			Code:    "MERCHANT_NOT_FOUND",
		})
	} else {
		if merchant.Status != "active" {
			errors = append(errors, BusinessValidationError{
				Field:   "merchant_status",
				Message: "商户状态异常，无法进行交易",
				Code:    "MERCHANT_INACTIVE",
			})
		}
	}

	// 2. Validate account status and limits
	account, err := s.receiveAccountRepo.GetByID(ctx, req.AccountID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "account_id",
			Message: "收款账户不存在",
			Code:    "ACCOUNT_NOT_FOUND",
		})
	} else {
		if account.Status != "active" {
			errors = append(errors, BusinessValidationError{
				Field:   "account_status",
				Message: "收款账户状态异常，无法进行交易",
				Code:    "ACCOUNT_INACTIVE",
			})
		}
	}

	// 3. Validate amount and limits if both merchant and account are valid
	if merchant != nil && account != nil {
		limitReq := &AmountLimitValidationRequest{
			MerchantID: req.MerchantID,
			AccountID:  req.AccountID,
			Amount:     req.Amount,
		}

		limitResult := s.ValidateAmountAndLimits(ctx, limitReq)
		if !limitResult.Valid {
			errors = append(errors, limitResult.Errors...)
		}
	}

	// 4. Validate payment type consistency
	if merchant != nil && account != nil && req.PaymentType != account.PaymentType {
		errors = append(errors, BusinessValidationError{
			Field:   "payment_type",
			Message: "付款类型与收款账户类型不匹配",
			Code:    "PAYMENT_TYPE_MISMATCH",
		})
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

type PreTransactionValidationRequest struct {
	MerchantID  uuid.UUID       `json:"merchant_id"`
	AccountID   uuid.UUID       `json:"account_id"`
	Amount      decimal.Decimal `json:"amount"`
	PaymentType string          `json:"payment_type"`
}
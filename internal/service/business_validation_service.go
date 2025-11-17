package service

import (
	"context"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/validation"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// BusinessValidationService provides business logic validation
type BusinessValidationService struct {
	merchantRepo        repository.MerchantRepository
	receiveAccountRepo  repository.ReceiveAccountRepository
	rechargeOrderRepo   repository.RechargeOrderRepository
	limitService        LimitService
	businessValidator   *validation.BusinessValidator
}

// NewBusinessValidationService creates a new business validation service
func NewBusinessValidationService(
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
	limitService LimitService,
) *BusinessValidationService {
	return &BusinessValidationService{
		merchantRepo:       merchantRepo,
		receiveAccountRepo: receiveAccountRepo,
		rechargeOrderRepo:  rechargeOrderRepo,
		limitService:       limitService,
		businessValidator:  validation.NewBusinessValidator(),
	}
}

// BusinessValidationError represents a business validation error
type BusinessValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

// BusinessValidationResult holds business validation results
type BusinessValidationResult struct {
	Valid  bool                      `json:"valid"`
	Errors []BusinessValidationError `json:"errors,omitempty"`
}

// ValidateRechargeOrderCreation validates recharge order creation with business rules
func (s *BusinessValidationService) ValidateRechargeOrderCreation(ctx context.Context, req *CreateRechargeOrderRequest) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get merchant name for validation
	merchant, err := s.merchantRepo.GetByID(ctx, req.MerchantID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_id",
			Message: "商户不存在或无效",
			Code:    "MERCHANT_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Basic validation first
	remarkStr := ""
	if req.Remark != nil {
		remarkStr = *req.Remark
	}
	
	validationReq := &validation.RechargeOrderValidationRequest{
		PayerName:    req.PayerName,
		PayerAccount: req.PayerAccount,
		PaymentType:  req.PaymentType,
		Amount:       req.Amount,
		MerchantName: merchant.Name,
		AdAccount:    req.AdAccount,
		Remark:       remarkStr,
	}

	basicResult := s.businessValidator.ValidateRechargeOrder(ctx, validationReq)
	if !basicResult.Valid {
		for _, err := range basicResult.Errors {
			errors = append(errors, BusinessValidationError{
				Field:   err.Field,
				Message: err.Message,
				Code:    err.Code,
			})
		}
	}

	if len(errors) > 0 {
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Business logic validation
	
	// 1. Validate merchant exists and is active (already done above)
	if merchant.Status != "active" {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_id",
			Message: "商户状态不可用",
			Code:    "MERCHANT_INACTIVE",
		})
	}

	// 2. Validate amount against merchant limits
	if err := s.validateMerchantLimits(ctx, req.MerchantID, req.Amount); err != nil {
		errors = append(errors, *err)
	}

	// 3. Validate duplicate order prevention
	if err := s.validateDuplicateOrder(ctx, req); err != nil {
		errors = append(errors, *err)
	}

	// 4. Validate daily transaction limits
	if err := s.validateDailyTransactionLimits(ctx, req.MerchantID, req.Amount); err != nil {
		errors = append(errors, *err)
	}

	// 5. Validate account availability for the payment type
	if err := s.validateAccountAvailability(ctx, req.MerchantID, req.PaymentType, req.Amount); err != nil {
		errors = append(errors, *err)
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateAccountStatusAndAvailability validates account status and availability
func (s *BusinessValidationService) ValidateAccountStatusAndAvailability(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get account details
	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "account_id",
			Message: "收款账户不存在",
			Code:    "ACCOUNT_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Check account status
	if account.Status != "active" {
		errors = append(errors, BusinessValidationError{
			Field:   "account_status",
			Message: fmt.Sprintf("收款账户状态异常: %s", account.Status),
			Code:    "ACCOUNT_INACTIVE",
		})
	}

	// Check single transaction limit
	if !account.SingleLimit.IsZero() && amount.GreaterThan(account.SingleLimit) {
		errors = append(errors, BusinessValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("交易金额超过账户单笔限额 %s", account.SingleLimit.String()),
			Code:    "AMOUNT_EXCEEDS_SINGLE_LIMIT",
		})
	}

	// Check daily limit
	if !account.DailyLimit.IsZero() {
		remainingLimit := account.DailyLimit.Sub(account.DailyUsed)
		if amount.GreaterThan(remainingLimit) {
			errors = append(errors, BusinessValidationError{
				Field:   "amount",
				Message: fmt.Sprintf("交易金额超过账户日剩余限额 %s", remainingLimit.String()),
				Code:    "AMOUNT_EXCEEDS_DAILY_LIMIT",
			})
		}
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateConcurrentOrderProcessing validates concurrent order processing
func (s *BusinessValidationService) ValidateConcurrentOrderProcessing(ctx context.Context, orderID uuid.UUID, expectedStatus string) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get current order status
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "order_id",
			Message: "充值订单不存在",
			Code:    "ORDER_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Check if order status matches expected status
	if order.Status != expectedStatus {
		errors = append(errors, BusinessValidationError{
			Field:   "order_status",
			Message: fmt.Sprintf("订单状态已变更，当前状态: %s，期望状态: %s", order.Status, expectedStatus),
			Code:    "ORDER_STATUS_CONFLICT",
		})
	}

	// Check if order was recently updated (potential concurrent modification)
	if time.Since(order.UpdatedAt) < 1*time.Second {
		errors = append(errors, BusinessValidationError{
			Field:   "order_update",
			Message: "订单正在被其他操作处理中，请稍后重试",
			Code:    "CONCURRENT_MODIFICATION",
		})
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateDataConsistency validates data consistency across related entities
func (s *BusinessValidationService) ValidateDataConsistency(ctx context.Context, orderID uuid.UUID) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get order details
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "order_id",
			Message: "充值订单不存在",
			Code:    "ORDER_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Validate merchant still exists and is active
	merchant, err := s.merchantRepo.GetByID(ctx, order.MerchantID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant",
			Message: "关联的商户不存在或已被删除",
			Code:    "MERCHANT_NOT_FOUND",
		})
	} else if merchant.Status != "active" {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_status",
			Message: fmt.Sprintf("关联的商户状态异常: %s", merchant.Status),
			Code:    "MERCHANT_INACTIVE",
		})
	}

	// Validate receive account still exists and is active
	account, err := s.receiveAccountRepo.GetByID(ctx, order.ReceiveAccountID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "receive_account",
			Message: "关联的收款账户不存在或已被删除",
			Code:    "ACCOUNT_NOT_FOUND",
		})
	} else if account.Status != "active" {
		errors = append(errors, BusinessValidationError{
			Field:   "account_status",
			Message: fmt.Sprintf("关联的收款账户状态异常: %s", account.Status),
			Code:    "ACCOUNT_INACTIVE",
		})
	}

	// Validate payment type consistency
	if account != nil && account.PaymentType != order.PaymentType {
		errors = append(errors, BusinessValidationError{
			Field:   "payment_type",
			Message: "订单付款类型与收款账户类型不匹配",
			Code:    "PAYMENT_TYPE_MISMATCH",
		})
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateTransactionIntegrity validates transaction integrity
func (s *BusinessValidationService) ValidateTransactionIntegrity(ctx context.Context, orderID uuid.UUID) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get order with related data
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "order_id",
			Message: "充值订单不存在",
			Code:    "ORDER_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Validate order amount consistency
	if order.Amount.IsZero() || order.Amount.IsNegative() {
		errors = append(errors, BusinessValidationError{
			Field:   "amount",
			Message: "订单金额异常",
			Code:    "INVALID_AMOUNT",
		})
	}

	// Validate order status transitions
	if err := s.validateStatusTransition(order.Status); err != nil {
		errors = append(errors, *err)
	}

	// Validate voucher requirements for private orders
	if order.PaymentType == "private" && order.Status == "paid" && (order.VoucherURL == nil || *order.VoucherURL == "") {
		errors = append(errors, BusinessValidationError{
			Field:   "voucher",
			Message: "对私充值订单缺少付款凭证",
			Code:    "MISSING_VOUCHER",
		})
	}

	// Validate timestamps
	if order.CreatedAt.After(order.UpdatedAt) {
		errors = append(errors, BusinessValidationError{
			Field:   "timestamps",
			Message: "订单时间戳异常",
			Code:    "INVALID_TIMESTAMPS",
		})
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// Private helper methods

func (s *BusinessValidationService) validateMerchantAvailability(ctx context.Context, merchantID uuid.UUID) *BusinessValidationError {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return &BusinessValidationError{
			Field:   "merchant_name",
			Message: "商户不存在",
			Code:    "MERCHANT_NOT_FOUND",
		}
	}

	if merchant.Status != "active" {
		return &BusinessValidationError{
			Field:   "merchant_name",
			Message: fmt.Sprintf("商户状态异常: %s", merchant.Status),
			Code:    "MERCHANT_INACTIVE",
		}
	}

	return nil
}

func (s *BusinessValidationService) validateMerchantLimits(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) *BusinessValidationError {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return &BusinessValidationError{
			Field:   "merchant_name",
			Message: "商户不存在",
			Code:    "MERCHANT_NOT_FOUND",
		}
	}

	// Check single transaction limit
	if !merchant.SingleLimit.IsZero() && amount.GreaterThan(merchant.SingleLimit) {
		return &BusinessValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("交易金额超过商户单笔限额 %s", merchant.SingleLimit.String()),
			Code:    "AMOUNT_EXCEEDS_MERCHANT_SINGLE_LIMIT",
		}
	}

	// Check daily limit (would need to calculate current daily usage)
	if !merchant.DailyLimit.IsZero() {
		// This would require querying today's transactions for the merchant
		// For now, we'll skip this check as it requires more complex logic
	}

	return nil
}

func (s *BusinessValidationService) validateDuplicateOrder(ctx context.Context, req *CreateRechargeOrderRequest) *BusinessValidationError {
	// Check for potential duplicate orders within the last 5 minutes
	startTime := time.Now().Add(-5 * time.Minute)
	filter := &repository.RechargeOrderFilter{
		PayerName:  &req.PayerName,
		MerchantID: &req.MerchantID,
		StartDate:  &startTime,
		Limit:      1,
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		// Log error but don't fail validation
		return nil
	}

	if len(orders) > 0 {
		return &BusinessValidationError{
			Field:   "duplicate",
			Message: "检测到可能的重复订单，请确认后重试",
			Code:    "POTENTIAL_DUPLICATE_ORDER",
		}
	}

	return nil
}

func (s *BusinessValidationService) validateDailyTransactionLimits(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) *BusinessValidationError {
	// This would check daily transaction limits across the system
	// For now, we'll implement a basic check
	
	today := time.Now().Truncate(24 * time.Hour)
	filter := &repository.RechargeOrderFilter{
		MerchantID: &merchantID,
		StartDate:  &today,
		Status:     []string{"confirmed", "paid"},
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		// Log error but don't fail validation
		return nil
	}

	// Count transactions and total amount
	transactionCount := len(orders)
	var totalAmount decimal.Decimal
	for _, order := range orders {
		totalAmount = totalAmount.Add(order.Amount)
	}

	// Check transaction count limit (example: max 100 transactions per day per merchant)
	if transactionCount >= 100 {
		return &BusinessValidationError{
			Field:   "daily_limit",
			Message: "商户今日交易次数已达上限",
			Code:    "DAILY_TRANSACTION_COUNT_EXCEEDED",
		}
	}

	// Check total amount limit (example: max 1 million per day per merchant)
	maxDailyAmount := decimal.NewFromFloat(1000000)
	if totalAmount.Add(amount).GreaterThan(maxDailyAmount) {
		return &BusinessValidationError{
			Field:   "daily_limit",
			Message: fmt.Sprintf("商户今日交易总额将超过限额 %s", maxDailyAmount.String()),
			Code:    "DAILY_AMOUNT_LIMIT_EXCEEDED",
		}
	}

	return nil
}

func (s *BusinessValidationService) validateAccountAvailability(ctx context.Context, merchantID uuid.UUID, paymentType string, amount decimal.Decimal) *BusinessValidationError {
	// Get merchant
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return &BusinessValidationError{
			Field:   "merchant_name",
			Message: "商户不存在",
			Code:    "MERCHANT_NOT_FOUND",
		}
	}

	// Get available accounts for this merchant and payment type
	filter := &repository.ReceiveAccountFilter{
		MerchantID:  &merchant.ID,
		PaymentType: &paymentType,
		Status:      func() *string { s := "active"; return &s }(),
	}

	accounts, err := s.receiveAccountRepo.List(ctx, filter)
	if err != nil {
		return &BusinessValidationError{
			Field:   "account_availability",
			Message: "无法获取可用收款账户",
			Code:    "ACCOUNT_QUERY_ERROR",
		}
	}

	if len(accounts) == 0 {
		return &BusinessValidationError{
			Field:   "account_availability",
			Message: fmt.Sprintf("没有可用的%s收款账户", paymentType),
			Code:    "NO_AVAILABLE_ACCOUNTS",
		}
	}

	// Check if any account can handle this amount
	hasAvailableAccount := false
	for _, account := range accounts {
		if account.SingleLimit.IsZero() || amount.LessThanOrEqual(account.SingleLimit) {
			remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
			if account.DailyLimit.IsZero() || amount.LessThanOrEqual(remainingDaily) {
				hasAvailableAccount = true
				break
			}
		}
	}

	if !hasAvailableAccount {
		return &BusinessValidationError{
			Field:   "amount",
			Message: "当前金额超过所有可用账户的限额",
			Code:    "AMOUNT_EXCEEDS_ALL_ACCOUNT_LIMITS",
		}
	}

	return nil
}

func (s *BusinessValidationService) validateStatusTransition(currentStatus string) *BusinessValidationError {
	// Define valid status transitions
	validTransitions := map[string][]string{
		"pending":   {"paid", "cancelled"},
		"paid":      {"confirmed", "rejected", "refunded"},
		"confirmed": {"refunded"},
		"rejected":  {"refunded"},
		"cancelled": {},
		"refunded":  {},
	}

	if _, exists := validTransitions[currentStatus]; !exists {
		return &BusinessValidationError{
			Field:   "status",
			Message: fmt.Sprintf("无效的订单状态: %s", currentStatus),
			Code:    "INVALID_STATUS",
		}
	}

	return nil
}

// ValidateAmountAndLimits validates amount against multiple limit constraints
func (s *BusinessValidationService) ValidateAmountAndLimits(ctx context.Context, merchantID, accountID uuid.UUID, amount decimal.Decimal) BusinessValidationResult {
	var errors []BusinessValidationError

	// Get merchant limits
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "merchant_id",
			Message: "商户不存在",
			Code:    "MERCHANT_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Get account limits
	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "account_id",
			Message: "收款账户不存在",
			Code:    "ACCOUNT_NOT_FOUND",
		})
		return BusinessValidationResult{Valid: false, Errors: errors}
	}

	// Validate against merchant limits
	if !merchant.SingleLimit.IsZero() && amount.GreaterThan(merchant.SingleLimit) {
		errors = append(errors, BusinessValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("金额超过商户单笔限额 %s", merchant.SingleLimit.String()),
			Code:    "MERCHANT_SINGLE_LIMIT_EXCEEDED",
		})
	}

	// Validate against account limits
	if !account.SingleLimit.IsZero() && amount.GreaterThan(account.SingleLimit) {
		errors = append(errors, BusinessValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("金额超过账户单笔限额 %s", account.SingleLimit.String()),
			Code:    "ACCOUNT_SINGLE_LIMIT_EXCEEDED",
		})
	}

	// Check daily limits
	remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
	if !account.DailyLimit.IsZero() && amount.GreaterThan(remainingDaily) {
		errors = append(errors, BusinessValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("金额超过账户日剩余限额 %s", remainingDaily.String()),
			Code:    "ACCOUNT_DAILY_LIMIT_EXCEEDED",
		})
	}

	return BusinessValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}
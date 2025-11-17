package service

import (
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Request types for MerchantAccountService

// BindAccountRequest represents a request to bind an account to a merchant
type BindAccountRequest struct {
	MerchantID uuid.UUID `json:"merchant_id" binding:"required"`
	AccountID  uuid.UUID `json:"account_id" binding:"required"`
	Priority   int       `json:"priority" binding:"required,min=1,max=100"`
}

// BatchBindAccountsRequest represents a request to bind multiple accounts
type BatchBindAccountsRequest struct {
	MerchantID uuid.UUID           `json:"merchant_id" binding:"required"`
	Bindings   []AccountBinding    `json:"bindings" binding:"required,min=1"`
}

// AccountBinding represents a single account binding in a batch operation
type AccountBinding struct {
	AccountID uuid.UUID `json:"account_id" binding:"required"`
	Priority  int       `json:"priority" binding:"required,min=1,max=100"`
}

// AccountPriority represents an account priority setting
type AccountPriority struct {
	AccountID uuid.UUID `json:"account_id" binding:"required"`
	Priority  int       `json:"priority" binding:"required,min=1,max=100"`
}

// AccountPriorityUpdate represents a priority update for batch operations
type AccountPriorityUpdate struct {
	AccountID   uuid.UUID `json:"account_id" binding:"required"`
	NewPriority int       `json:"new_priority" binding:"required,min=1,max=100"`
}

// TimeRange represents a time range for statistics
type TimeRange struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

// Response types for MerchantAccountService

// MerchantAccountInfo represents detailed information about a merchant's bound account
type MerchantAccountInfo struct {
	ID                   uuid.UUID            `json:"id"`
	MerchantID          uuid.UUID            `json:"merchant_id"`
	ReceiveAccountID    uuid.UUID            `json:"receive_account_id"`
	AccountName         string               `json:"account_name"`
	AccountNumber       string               `json:"account_number"`
	AccountType         string               `json:"account_type"`
	PaymentType         string               `json:"payment_type"`
	AccountHolder       string               `json:"account_holder"`
	Priority            int                  `json:"priority"`
	IsActive            bool                 `json:"is_active"`
	Status              string               `json:"status"`
	DailyLimit          decimal.Decimal      `json:"daily_limit"`
	SingleLimit         decimal.Decimal      `json:"single_limit"`
	DailyUsed           decimal.Decimal      `json:"daily_used"`
	RemainingDailyLimit decimal.Decimal      `json:"remaining_daily_limit"`
	UsageStats          *AccountUsageStats   `json:"usage_stats,omitempty"`
	BoundAt             time.Time            `json:"bound_at"`
}

// AvailableAccountInfo represents information about an available account
type AvailableAccountInfo struct {
	AccountID           uuid.UUID       `json:"account_id"`
	AccountName         string          `json:"account_name"`
	AccountNumber       string          `json:"account_number"`
	AccountType         string          `json:"account_type"`
	PaymentType         string          `json:"payment_type"`
	AccountHolder       string          `json:"account_holder"`
	Priority            int             `json:"priority"`
	DailyLimit          decimal.Decimal `json:"daily_limit"`
	SingleLimit         decimal.Decimal `json:"single_limit"`
	DailyUsed           decimal.Decimal `json:"daily_used"`
	RemainingDailyLimit decimal.Decimal `json:"remaining_daily_limit"`
	CanAcceptAmount     bool            `json:"can_accept_amount"`
	LimitCheckReason    string          `json:"limit_check_reason,omitempty"`
	AvailabilityScore   int             `json:"availability_score"`
	LastUsed            time.Time       `json:"last_used"`
}

// ValidationResult represents the result of account binding validation
type ValidationResult struct {
	IsValid  bool     `json:"is_valid"`
	Errors   []string `json:"errors"`
	Warnings []string `json:"warnings"`
}

// AvailabilityResult represents the result of account availability check
type AvailabilityResult struct {
	AccountID            uuid.UUID       `json:"account_id"`
	IsAvailable          bool            `json:"is_available"`
	Reasons              []string        `json:"reasons"`
	RemainingDailyLimit  decimal.Decimal `json:"remaining_daily_limit"`
	SingleLimit          decimal.Decimal `json:"single_limit"`
	UtilizationRate      decimal.Decimal `json:"utilization_rate"`
}

// AccountUsageStats represents usage statistics for an account
type AccountUsageStats struct {
	AccountID        uuid.UUID       `json:"account_id"`
	AccountName      string          `json:"account_name"`
	TimeRange        TimeRange       `json:"time_range"`
	TransactionCount int64           `json:"transaction_count"`
	TotalAmount      decimal.Decimal `json:"total_amount"`
	SuccessfulCount  int64           `json:"successful_count"`
	FailedCount      int64           `json:"failed_count"`
	SuccessRate      decimal.Decimal `json:"success_rate"`
	UtilizationRate  decimal.Decimal `json:"utilization_rate"`
	AverageAmount    decimal.Decimal `json:"average_amount"`
	PeakUsageDay     *time.Time      `json:"peak_usage_day,omitempty"`
	PeakUsageAmount  decimal.Decimal `json:"peak_usage_amount"`
}

// LoadBalancingRecommendation represents a load balancing recommendation
type LoadBalancingRecommendation struct {
	AccountID            uuid.UUID `json:"account_id"`
	AccountName          string    `json:"account_name"`
	RecommendationType   string    `json:"recommendation_type"` // REDUCE_LOAD, INCREASE_LOAD, INCREASE_LIMITS, OPTIMAL
	Description          string    `json:"description"`
	Priority             string    `json:"priority"` // HIGH, MEDIUM, LOW
	SuggestedAction      string    `json:"suggested_action"`
	CurrentUtilization   decimal.Decimal `json:"current_utilization"`
	RecommendedPriority  *int      `json:"recommended_priority,omitempty"`
	RecommendedDailyLimit *decimal.Decimal `json:"recommended_daily_limit,omitempty"`
}

// BatchOperationResult represents the result of a batch operation
type BatchOperationResult struct {
	TotalRequested int      `json:"total_requested"`
	Successful     int      `json:"successful"`
	Failed         int      `json:"failed"`
	Errors         []string `json:"errors"`
}

// AccountStatusInfo represents detailed status information for a bound account
type AccountStatusInfo struct {
	MerchantID       uuid.UUID          `json:"merchant_id"`
	AccountID        uuid.UUID          `json:"account_id"`
	IsBindingActive  bool               `json:"is_binding_active"`
	AccountStatus    string             `json:"account_status"`
	Priority         int                `json:"priority"`
	DailyLimit       decimal.Decimal    `json:"daily_limit"`
	DailyUsed        decimal.Decimal    `json:"daily_used"`
	UtilizationRate  decimal.Decimal    `json:"utilization_rate"`
	RecentUsageStats *AccountUsageStats `json:"recent_usage_stats,omitempty"`
	BoundAt          time.Time          `json:"bound_at"`
}

// Filter types for queries

// MerchantAccountFilter represents filters for merchant account queries
type MerchantAccountFilter struct {
	MerchantID       *uuid.UUID `json:"merchant_id"`
	AccountType      *string    `json:"account_type"`
	PaymentType      *string    `json:"payment_type"`
	IsActive         *bool      `json:"is_active"`
	MinPriority      *int       `json:"min_priority"`
	MaxPriority      *int       `json:"max_priority"`
	MinUtilization   *decimal.Decimal `json:"min_utilization"`
	MaxUtilization   *decimal.Decimal `json:"max_utilization"`
	Limit            int        `json:"limit"`
	Offset           int        `json:"offset"`
	OrderBy          string     `json:"order_by"`
	OrderDir         string     `json:"order_dir"`
}

// AccountAvailabilityFilter represents filters for account availability queries
type AccountAvailabilityFilter struct {
	MerchantID       uuid.UUID       `json:"merchant_id"`
	PaymentType      *string         `json:"payment_type"`
	MinAmount        *decimal.Decimal `json:"min_amount"`
	MaxAmount        *decimal.Decimal `json:"max_amount"`
	RequiredCapacity *decimal.Decimal `json:"required_capacity"`
	ExcludeAccountIDs []uuid.UUID    `json:"exclude_account_ids"`
	IncludeInactive  bool            `json:"include_inactive"`
}

// UsageStatsFilter represents filters for usage statistics queries
type UsageStatsFilter struct {
	MerchantID       *uuid.UUID `json:"merchant_id"`
	AccountIDs       []uuid.UUID `json:"account_ids"`
	StartDate        time.Time   `json:"start_date"`
	EndDate          time.Time   `json:"end_date"`
	Granularity      string      `json:"granularity"` // daily, weekly, monthly
	IncludeInactive  bool        `json:"include_inactive"`
	MinTransactions  *int64      `json:"min_transactions"`
	MinAmount        *decimal.Decimal `json:"min_amount"`
}

// LoadBalancingFilter represents filters for load balancing analysis
type LoadBalancingFilter struct {
	MerchantID           uuid.UUID `json:"merchant_id"`
	AnalysisPeriodDays   int       `json:"analysis_period_days"`
	MinTransactionCount  int64     `json:"min_transaction_count"`
	UtilizationThreshold decimal.Decimal `json:"utilization_threshold"`
	IncludeOptimal       bool      `json:"include_optimal"`
}

// Constants for recommendation types
const (
	RecommendationReduceLoad    = "REDUCE_LOAD"
	RecommendationIncreaseLoad  = "INCREASE_LOAD"
	RecommendationIncreaseLimits = "INCREASE_LIMITS"
	RecommendationOptimal       = "OPTIMAL"
	RecommendationRebalance     = "REBALANCE"
	RecommendationAddAccount    = "ADD_ACCOUNT"
	RecommendationRemoveAccount = "REMOVE_ACCOUNT"
)

// Constants for priority levels
const (
	PriorityHigh   = "HIGH"
	PriorityMedium = "MEDIUM"
	PriorityLow    = "LOW"
)

// Constants for account status
const (
	AccountStatusActive    = "active"
	AccountStatusInactive  = "inactive"
	AccountStatusSuspended = "suspended"
	AccountStatusClosed    = "closed"
)

// Constants for binding status
const (
	BindingStatusActive   = true
	BindingStatusInactive = false
)

// Validation constants
const (
	MinPriority = 1
	MaxPriority = 100
	MaxAccountsPerMerchant = 50
	DefaultPriority = 50
)

// Statistics calculation helpers

// CalculateSuccessRate calculates the success rate from successful and total counts
func CalculateSuccessRate(successful, total int64) decimal.Decimal {
	if total == 0 {
		return decimal.Zero
	}
	return decimal.NewFromInt(successful).Div(decimal.NewFromInt(total)).Mul(decimal.NewFromInt(100))
}

// CalculateUtilizationRate calculates the utilization rate from used and limit amounts
func CalculateUtilizationRate(used, limit decimal.Decimal) decimal.Decimal {
	if limit.IsZero() {
		return decimal.Zero
	}
	return used.Div(limit).Mul(decimal.NewFromInt(100))
}

// CalculateAverageAmount calculates the average amount from total amount and count
func CalculateAverageAmount(totalAmount decimal.Decimal, count int64) decimal.Decimal {
	if count == 0 {
		return decimal.Zero
	}
	return totalAmount.Div(decimal.NewFromInt(count))
}

// Helper functions for validation

// ValidatePriority validates if a priority value is within acceptable range
func ValidatePriority(priority int) bool {
	return priority >= MinPriority && priority <= MaxPriority
}

// ValidateTimeRange validates if a time range is valid
func ValidateTimeRange(startDate, endDate time.Time) bool {
	return !startDate.IsZero() && !endDate.IsZero() && startDate.Before(endDate)
}

// ValidateAccountBinding validates basic account binding parameters
func ValidateAccountBinding(merchantID, accountID uuid.UUID, priority int) []string {
	var errors []string
	
	if merchantID == uuid.Nil {
		errors = append(errors, "merchant_id is required")
	}
	
	if accountID == uuid.Nil {
		errors = append(errors, "account_id is required")
	}
	
	if !ValidatePriority(priority) {
		errors = append(errors, fmt.Sprintf("priority must be between %d and %d", MinPriority, MaxPriority))
	}
	
	return errors
}

// Response builders

// BuildMerchantAccountInfo builds MerchantAccountInfo from repository models
func BuildMerchantAccountInfo(
	relationship *repository.MerchantReceiveAccount,
	account *repository.ReceiveAccount,
	usageStats *AccountUsageStats,
) *MerchantAccountInfo {
	remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
	if remainingDaily.LessThan(decimal.Zero) {
		remainingDaily = decimal.Zero
	}
	
	return &MerchantAccountInfo{
		ID:                   relationship.ID,
		MerchantID:          relationship.MerchantID,
		ReceiveAccountID:    relationship.ReceiveAccountID,
		AccountName:         account.AccountName,
		AccountNumber:       account.AccountNumber,
		AccountType:         account.AccountType,
		PaymentType:         account.PaymentType,
		AccountHolder:       account.AccountHolder,
		Priority:            relationship.Weight,
		IsActive:            relationship.IsActive,
		Status:              account.Status,
		DailyLimit:          account.DailyLimit,
		SingleLimit:         account.SingleLimit,
		DailyUsed:           account.DailyUsed,
		RemainingDailyLimit: remainingDaily,
		UsageStats:          usageStats,
		BoundAt:             relationship.CreatedAt,
	}
}

// BuildAvailableAccountInfo builds AvailableAccountInfo from repository models
func BuildAvailableAccountInfo(
	account *repository.ReceiveAccount,
	priority int,
	amount decimal.Decimal,
	availabilityScore int,
) *AvailableAccountInfo {
	remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
	if remainingDaily.LessThan(decimal.Zero) {
		remainingDaily = decimal.Zero
	}
	
	canAcceptAmount := true
	limitCheckReason := ""
	
	if amount.GreaterThan(account.SingleLimit) {
		canAcceptAmount = false
		limitCheckReason = "Amount exceeds single transaction limit"
	} else if amount.GreaterThan(remainingDaily) {
		canAcceptAmount = false
		limitCheckReason = "Amount exceeds remaining daily limit"
	}
	
	return &AvailableAccountInfo{
		AccountID:           account.ID,
		AccountName:         account.AccountName,
		AccountNumber:       account.AccountNumber,
		AccountType:         account.AccountType,
		PaymentType:         account.PaymentType,
		AccountHolder:       account.AccountHolder,
		Priority:            priority,
		DailyLimit:          account.DailyLimit,
		SingleLimit:         account.SingleLimit,
		DailyUsed:           account.DailyUsed,
		RemainingDailyLimit: remainingDaily,
		CanAcceptAmount:     canAcceptAmount,
		LimitCheckReason:    limitCheckReason,
		AvailabilityScore:   availabilityScore,
		LastUsed:            account.LastResetDate,
	}
}
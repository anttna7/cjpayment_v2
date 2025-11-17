package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// MerchantAccountService defines the merchant account binding service interface
type MerchantAccountService interface {
	// Account binding operations
	BindAccount(ctx context.Context, req *BindAccountRequest) error
	UnbindAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	ListMerchantAccounts(ctx context.Context, merchantID uuid.UUID) ([]*MerchantAccountInfo, error)
	
	// Priority management
	UpdateAccountPriority(ctx context.Context, merchantID, accountID uuid.UUID, priority int) error
	ReorderAccountPriorities(ctx context.Context, merchantID uuid.UUID, accountPriorities []AccountPriority) error
	
	// Account availability and validation
	GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, paymentType string, amount decimal.Decimal) ([]*AvailableAccountInfo, error)
	ValidateAccountBinding(ctx context.Context, merchantID, accountID uuid.UUID) (*ValidationResult, error)
	CheckAccountAvailability(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*AvailabilityResult, error)
	
	// Usage statistics and load balancing
	GetAccountUsageStatistics(ctx context.Context, merchantID uuid.UUID, timeRange TimeRange) ([]*AccountUsageStats, error)
	GetLoadBalancingRecommendations(ctx context.Context, merchantID uuid.UUID) ([]*LoadBalancingRecommendation, error)
	UpdateAccountUsageMetrics(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error
	
	// Batch operations
	BatchBindAccounts(ctx context.Context, req *BatchBindAccountsRequest) (*BatchOperationResult, error)
	BatchUpdatePriorities(ctx context.Context, merchantID uuid.UUID, updates []AccountPriorityUpdate) (*BatchOperationResult, error)
	
	// Account status management
	EnableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	DisableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	GetAccountStatus(ctx context.Context, merchantID, accountID uuid.UUID) (*AccountStatusInfo, error)
}

// merchantAccountService implements MerchantAccountService interface
type merchantAccountService struct {
	merchantRepo        repository.MerchantRepository
	receiveAccountRepo  repository.ReceiveAccountRepository
	merchantAccountRepo repository.MerchantReceiveAccountRepository
	rechargeOrderRepo   repository.RechargeOrderRepository
}

// NewMerchantAccountService creates a new merchant account service
func NewMerchantAccountService(
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	merchantAccountRepo repository.MerchantReceiveAccountRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
) MerchantAccountService {
	return &merchantAccountService{
		merchantRepo:        merchantRepo,
		receiveAccountRepo:  receiveAccountRepo,
		merchantAccountRepo: merchantAccountRepo,
		rechargeOrderRepo:   rechargeOrderRepo,
	}
}

// BindAccount binds a receive account to a merchant
func (s *merchantAccountService) BindAccount(ctx context.Context, req *BindAccountRequest) error {
	// Validate merchant exists
	merchant, err := s.merchantRepo.GetByID(ctx, req.MerchantID)
	if err != nil {
		return fmt.Errorf("merchant not found: %w", err)
	}
	
	if merchant.Status != "active" {
		return errors.New("cannot bind account to inactive merchant")
	}

	// Validate account exists and is active
	account, err := s.receiveAccountRepo.GetByID(ctx, req.AccountID)
	if err != nil {
		return fmt.Errorf("receive account not found: %w", err)
	}
	
	if account.Status != "active" {
		return errors.New("cannot bind inactive account")
	}

	// Check if binding already exists
	existing, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, req.MerchantID, req.AccountID)
	if err == nil && existing != nil {
		return errors.New("account is already bound to this merchant")
	}

	// Validate priority
	if req.Priority < 1 || req.Priority > 100 {
		return errors.New("priority must be between 1 and 100")
	}

	// Create the binding
	binding := &repository.MerchantReceiveAccount{
		ID:               uuid.New(),
		MerchantID:       req.MerchantID,
		ReceiveAccountID: req.AccountID,
		Weight:           req.Priority,
		IsActive:         true,
		CreatedAt:        time.Now(),
	}

	return s.merchantAccountRepo.Create(ctx, binding)
}

// UnbindAccount removes the binding between a merchant and receive account
func (s *merchantAccountService) UnbindAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	// Check if binding exists
	binding, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, merchantID, accountID)
	if err != nil {
		return fmt.Errorf("account binding not found: %w", err)
	}

	// Check if account has pending orders
	filter := &repository.RechargeOrderFilter{
		MerchantID: &merchantID,
		Status:     []string{"pending", "processing"},
		Limit:      1,
	}
	
	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to check pending orders: %w", err)
	}

	if len(orders) > 0 {
		// Check if any pending orders use this account
		for _, order := range orders {
			if order.ReceiveAccountID == accountID {
				return errors.New("cannot unbind account with pending orders")
			}
		}
	}

	return s.merchantAccountRepo.DeleteByMerchantAndAccount(ctx, merchantID, accountID)
}

// ListMerchantAccounts retrieves all accounts bound to a merchant
func (s *merchantAccountService) ListMerchantAccounts(ctx context.Context, merchantID uuid.UUID) ([]*MerchantAccountInfo, error) {
	// Get merchant-account relationships
	relationships, err := s.merchantAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	var accountInfos []*MerchantAccountInfo
	for _, rel := range relationships {
		// Get account details
		account, err := s.receiveAccountRepo.GetByID(ctx, rel.ReceiveAccountID)
		if err != nil {
			continue // Skip if account not found
		}

		// Calculate usage statistics
		usageStats, err := s.calculateAccountUsage(ctx, rel.ReceiveAccountID, TimeRange{
			StartDate: time.Now().AddDate(0, 0, -30), // Last 30 days
			EndDate:   time.Now(),
		})
		if err != nil {
			usageStats = &AccountUsageStats{} // Default empty stats
		}

		accountInfo := &MerchantAccountInfo{
			ID:                   rel.ID,
			MerchantID:          rel.MerchantID,
			ReceiveAccountID:    rel.ReceiveAccountID,
			AccountName:         account.AccountName,
			AccountNumber:       account.AccountNumber,
			AccountType:         account.AccountType,
			PaymentType:         account.PaymentType,
			AccountHolder:       account.AccountHolder,
			Priority:            rel.Weight,
			IsActive:            rel.IsActive,
			Status:              account.Status,
			DailyLimit:          account.DailyLimit,
			SingleLimit:         account.SingleLimit,
			DailyUsed:           account.DailyUsed,
			RemainingDailyLimit: account.DailyLimit.Sub(account.DailyUsed),
			UsageStats:          usageStats,
			BoundAt:             rel.CreatedAt,
		}

		accountInfos = append(accountInfos, accountInfo)
	}

	return accountInfos, nil
}

// UpdateAccountPriority updates the priority of a bound account
func (s *merchantAccountService) UpdateAccountPriority(ctx context.Context, merchantID, accountID uuid.UUID, priority int) error {
	// Validate priority range
	if priority < 1 || priority > 100 {
		return errors.New("priority must be between 1 and 100")
	}

	// Check if binding exists
	_, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, merchantID, accountID)
	if err != nil {
		return fmt.Errorf("account binding not found: %w", err)
	}

	return s.merchantAccountRepo.UpdateWeight(ctx, merchantID, accountID, priority)
}

// ReorderAccountPriorities updates multiple account priorities in batch
func (s *merchantAccountService) ReorderAccountPriorities(ctx context.Context, merchantID uuid.UUID, accountPriorities []AccountPriority) error {
	// Validate all priorities are unique and in valid range
	priorityMap := make(map[int]bool)
	for _, ap := range accountPriorities {
		if ap.Priority < 1 || ap.Priority > 100 {
			return fmt.Errorf("priority must be between 1 and 100 for account %s", ap.AccountID)
		}
		if priorityMap[ap.Priority] {
			return errors.New("duplicate priorities are not allowed")
		}
		priorityMap[ap.Priority] = true
	}

	// Update each priority
	for _, ap := range accountPriorities {
		err := s.merchantAccountRepo.UpdateWeight(ctx, merchantID, ap.AccountID, ap.Priority)
		if err != nil {
			return fmt.Errorf("failed to update priority for account %s: %w", ap.AccountID, err)
		}
	}

	return nil
}

// GetAvailableAccounts retrieves available accounts for a merchant based on criteria
func (s *merchantAccountService) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, paymentType string, amount decimal.Decimal) ([]*AvailableAccountInfo, error) {
	// Get merchant's bound accounts
	relationships, err := s.merchantAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	var availableAccounts []*AvailableAccountInfo
	for _, rel := range relationships {
		if !rel.IsActive {
			continue
		}

		// Get account details
		account, err := s.receiveAccountRepo.GetByID(ctx, rel.ReceiveAccountID)
		if err != nil || account.Status != "active" {
			continue
		}

		// Check payment type compatibility
		if paymentType != "" && account.PaymentType != paymentType {
			continue
		}

		// Check limits
		canAcceptAmount := true
		limitCheckReason := ""

		if amount.GreaterThan(account.SingleLimit) {
			canAcceptAmount = false
			limitCheckReason = "Amount exceeds single transaction limit"
		}

		remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
		if amount.GreaterThan(remainingDaily) {
			canAcceptAmount = false
			limitCheckReason = "Amount exceeds remaining daily limit"
		}

		// Calculate availability score (higher is better)
		availabilityScore := s.calculateAvailabilityScore(account, rel.Weight, amount)

		availableAccount := &AvailableAccountInfo{
			AccountID:           account.ID,
			AccountName:         account.AccountName,
			AccountNumber:       account.AccountNumber,
			AccountType:         account.AccountType,
			PaymentType:         account.PaymentType,
			AccountHolder:       account.AccountHolder,
			Priority:            rel.Weight,
			DailyLimit:          account.DailyLimit,
			SingleLimit:         account.SingleLimit,
			DailyUsed:           account.DailyUsed,
			RemainingDailyLimit: remainingDaily,
			CanAcceptAmount:     canAcceptAmount,
			LimitCheckReason:    limitCheckReason,
			AvailabilityScore:   availabilityScore,
			LastUsed:            account.LastResetDate, // Approximation
		}

		availableAccounts = append(availableAccounts, availableAccount)
	}

	return availableAccounts, nil
}

// ValidateAccountBinding validates if an account can be bound to a merchant
func (s *merchantAccountService) ValidateAccountBinding(ctx context.Context, merchantID, accountID uuid.UUID) (*ValidationResult, error) {
	result := &ValidationResult{
		IsValid: true,
		Errors:  []string{},
		Warnings: []string{},
	}

	// Check if merchant exists and is active
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		result.IsValid = false
		result.Errors = append(result.Errors, "Merchant not found")
		return result, nil
	}

	if merchant.Status != "active" {
		result.IsValid = false
		result.Errors = append(result.Errors, "Merchant is not active")
	}

	// Check if account exists and is active
	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		result.IsValid = false
		result.Errors = append(result.Errors, "Receive account not found")
		return result, nil
	}

	if account.Status != "active" {
		result.IsValid = false
		result.Errors = append(result.Errors, "Receive account is not active")
	}

	// Check if already bound
	existing, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, merchantID, accountID)
	if err == nil && existing != nil {
		result.IsValid = false
		result.Errors = append(result.Errors, "Account is already bound to this merchant")
	}

	// Check account limits
	if account.DailyLimit.LessThanOrEqual(decimal.Zero) {
		result.Warnings = append(result.Warnings, "Account has no daily limit set")
	}

	if account.SingleLimit.LessThanOrEqual(decimal.Zero) {
		result.Warnings = append(result.Warnings, "Account has no single transaction limit set")
	}

	// Count existing bindings for the merchant
	existingBindings, err := s.merchantAccountRepo.GetByMerchant(ctx, merchantID)
	if err == nil && len(existingBindings) >= 10 {
		result.Warnings = append(result.Warnings, "Merchant already has many bound accounts, consider reviewing for optimal performance")
	}

	return result, nil
}

// CheckAccountAvailability checks if an account can accept a specific amount
func (s *merchantAccountService) CheckAccountAvailability(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*AvailabilityResult, error) {
	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}

	result := &AvailabilityResult{
		AccountID:   accountID,
		IsAvailable: true,
		Reasons:     []string{},
	}

	// Check account status
	if account.Status != "active" {
		result.IsAvailable = false
		result.Reasons = append(result.Reasons, "Account is not active")
	}

	// Check single transaction limit
	if amount.GreaterThan(account.SingleLimit) {
		result.IsAvailable = false
		result.Reasons = append(result.Reasons, fmt.Sprintf("Amount %.2f exceeds single transaction limit %.2f", amount, account.SingleLimit))
	}

	// Check daily limit
	remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
	if amount.GreaterThan(remainingDaily) {
		result.IsAvailable = false
		result.Reasons = append(result.Reasons, fmt.Sprintf("Amount %.2f exceeds remaining daily limit %.2f", amount, remainingDaily))
	}

	result.RemainingDailyLimit = remainingDaily
	result.SingleLimit = account.SingleLimit
	result.UtilizationRate = account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))

	return result, nil
}

// GetAccountUsageStatistics retrieves usage statistics for merchant accounts
func (s *merchantAccountService) GetAccountUsageStatistics(ctx context.Context, merchantID uuid.UUID, timeRange TimeRange) ([]*AccountUsageStats, error) {
	relationships, err := s.merchantAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	var stats []*AccountUsageStats
	for _, rel := range relationships {
		accountStats, err := s.calculateAccountUsage(ctx, rel.ReceiveAccountID, timeRange)
		if err != nil {
			continue // Skip accounts with calculation errors
		}
		stats = append(stats, accountStats)
	}

	return stats, nil
}

// GetLoadBalancingRecommendations provides recommendations for load balancing
func (s *merchantAccountService) GetLoadBalancingRecommendations(ctx context.Context, merchantID uuid.UUID) ([]*LoadBalancingRecommendation, error) {
	// Get usage statistics for the last 30 days
	timeRange := TimeRange{
		StartDate: time.Now().AddDate(0, 0, -30),
		EndDate:   time.Now(),
	}

	stats, err := s.GetAccountUsageStatistics(ctx, merchantID, timeRange)
	if err != nil {
		return nil, err
	}

	var recommendations []*LoadBalancingRecommendation

	// Analyze usage patterns and generate recommendations
	totalTransactions := int64(0)
	totalAmount := decimal.Zero
	for _, stat := range stats {
		totalTransactions += stat.TransactionCount
		totalAmount = totalAmount.Add(stat.TotalAmount)
	}

	if totalTransactions == 0 {
		return recommendations, nil
	}

	avgTransactionsPerAccount := totalTransactions / int64(len(stats))
	avgAmountPerAccount := totalAmount.Div(decimal.NewFromInt(int64(len(stats))))

	for _, stat := range stats {
		recommendation := &LoadBalancingRecommendation{
			AccountID:   stat.AccountID,
			AccountName: stat.AccountName,
		}

		// Check if account is overused
		if stat.TransactionCount > avgTransactionsPerAccount*2 {
			recommendation.RecommendationType = "REDUCE_LOAD"
			recommendation.Description = "Account is handling significantly more transactions than average"
			recommendation.Priority = "HIGH"
			recommendation.SuggestedAction = "Consider reducing priority or redistributing load to other accounts"
		} else if stat.TransactionCount < avgTransactionsPerAccount/2 {
			recommendation.RecommendationType = "INCREASE_LOAD"
			recommendation.Description = "Account is underutilized compared to others"
			recommendation.Priority = "MEDIUM"
			recommendation.SuggestedAction = "Consider increasing priority to better utilize this account"
		} else if stat.UtilizationRate.GreaterThan(decimal.NewFromFloat(80)) {
			recommendation.RecommendationType = "INCREASE_LIMITS"
			recommendation.Description = "Account is approaching limit capacity"
			recommendation.Priority = "MEDIUM"
			recommendation.SuggestedAction = "Consider increasing daily or single transaction limits"
		} else {
			recommendation.RecommendationType = "OPTIMAL"
			recommendation.Description = "Account usage is well balanced"
			recommendation.Priority = "LOW"
			recommendation.SuggestedAction = "No action needed"
		}

		recommendations = append(recommendations, recommendation)
	}

	return recommendations, nil
}

// UpdateAccountUsageMetrics updates usage metrics for an account
func (s *merchantAccountService) UpdateAccountUsageMetrics(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	return s.receiveAccountRepo.UpdateDailyUsed(ctx, accountID, amount)
}

// BatchBindAccounts binds multiple accounts to a merchant in batch
func (s *merchantAccountService) BatchBindAccounts(ctx context.Context, req *BatchBindAccountsRequest) (*BatchOperationResult, error) {
	result := &BatchOperationResult{
		TotalRequested: len(req.Bindings),
		Successful:     0,
		Failed:         0,
		Errors:         []string{},
	}

	for _, binding := range req.Bindings {
		bindReq := &BindAccountRequest{
			MerchantID: req.MerchantID,
			AccountID:  binding.AccountID,
			Priority:   binding.Priority,
		}

		err := s.BindAccount(ctx, bindReq)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Account %s: %s", binding.AccountID, err.Error()))
		} else {
			result.Successful++
		}
	}

	return result, nil
}

// BatchUpdatePriorities updates multiple account priorities in batch
func (s *merchantAccountService) BatchUpdatePriorities(ctx context.Context, merchantID uuid.UUID, updates []AccountPriorityUpdate) (*BatchOperationResult, error) {
	result := &BatchOperationResult{
		TotalRequested: len(updates),
		Successful:     0,
		Failed:         0,
		Errors:         []string{},
	}

	for _, update := range updates {
		err := s.UpdateAccountPriority(ctx, merchantID, update.AccountID, update.NewPriority)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("Account %s: %s", update.AccountID, err.Error()))
		} else {
			result.Successful++
		}
	}

	return result, nil
}

// EnableAccount enables a bound account for a merchant
func (s *merchantAccountService) EnableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	binding, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, merchantID, accountID)
	if err != nil {
		return fmt.Errorf("account binding not found: %w", err)
	}

	binding.IsActive = true
	return s.merchantAccountRepo.Update(ctx, binding)
}

// DisableAccount disables a bound account for a merchant
func (s *merchantAccountService) DisableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	binding, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, merchantID, accountID)
	if err != nil {
		return fmt.Errorf("account binding not found: %w", err)
	}

	binding.IsActive = false
	return s.merchantAccountRepo.Update(ctx, binding)
}

// GetAccountStatus retrieves the status of a bound account
func (s *merchantAccountService) GetAccountStatus(ctx context.Context, merchantID, accountID uuid.UUID) (*AccountStatusInfo, error) {
	binding, err := s.merchantAccountRepo.GetByMerchantAndAccount(ctx, merchantID, accountID)
	if err != nil {
		return nil, fmt.Errorf("account binding not found: %w", err)
	}

	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}

	// Get recent usage statistics
	usageStats, err := s.calculateAccountUsage(ctx, accountID, TimeRange{
		StartDate: time.Now().AddDate(0, 0, -7), // Last 7 days
		EndDate:   time.Now(),
	})
	if err != nil {
		usageStats = &AccountUsageStats{} // Default empty stats
	}

	return &AccountStatusInfo{
		MerchantID:       merchantID,
		AccountID:        accountID,
		IsBindingActive:  binding.IsActive,
		AccountStatus:    account.Status,
		Priority:         binding.Weight,
		DailyLimit:       account.DailyLimit,
		DailyUsed:        account.DailyUsed,
		UtilizationRate:  account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100)),
		RecentUsageStats: usageStats,
		BoundAt:          binding.CreatedAt,
	}, nil
}

// Helper methods

// calculateAvailabilityScore calculates a score for account availability
func (s *merchantAccountService) calculateAvailabilityScore(account *repository.ReceiveAccount, priority int, amount decimal.Decimal) int {
	score := priority * 10 // Base score from priority

	// Adjust based on remaining capacity
	remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
	if remainingDaily.GreaterThan(amount.Mul(decimal.NewFromInt(10))) {
		score += 50 // High capacity
	} else if remainingDaily.GreaterThan(amount.Mul(decimal.NewFromInt(5))) {
		score += 30 // Medium capacity
	} else if remainingDaily.GreaterThan(amount) {
		score += 10 // Low capacity
	}

	// Adjust based on utilization rate
	utilizationRate := account.DailyUsed.Div(account.DailyLimit)
	if utilizationRate.LessThan(decimal.NewFromFloat(0.5)) {
		score += 20 // Low utilization
	} else if utilizationRate.LessThan(decimal.NewFromFloat(0.8)) {
		score += 10 // Medium utilization
	}
	// High utilization gets no bonus

	return score
}

// calculateAccountUsage calculates usage statistics for an account
func (s *merchantAccountService) calculateAccountUsage(ctx context.Context, accountID uuid.UUID, timeRange TimeRange) (*AccountUsageStats, error) {
	// This is a simplified implementation
	// In a real system, you would query the recharge_orders table for detailed statistics
	
	filter := &repository.RechargeOrderFilter{
		StartDate: &timeRange.StartDate,
		EndDate:   &timeRange.EndDate,
		Limit:     1000, // Reasonable limit for statistics
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	stats := &AccountUsageStats{
		AccountID:        accountID,
		TimeRange:        timeRange,
		TransactionCount: 0,
		TotalAmount:      decimal.Zero,
		SuccessfulCount:  0,
		FailedCount:      0,
		UtilizationRate:  decimal.Zero,
	}

	// Filter orders for this account and calculate statistics
	for _, order := range orders {
		if order.ReceiveAccountID == accountID {
			stats.TransactionCount++
			stats.TotalAmount = stats.TotalAmount.Add(order.Amount)
			
			if order.Status == "completed" {
				stats.SuccessfulCount++
			} else if order.Status == "failed" || order.Status == "cancelled" {
				stats.FailedCount++
			}
		}
	}

	// Calculate success rate
	if stats.TransactionCount > 0 {
		stats.SuccessRate = decimal.NewFromInt(stats.SuccessfulCount).Div(decimal.NewFromInt(stats.TransactionCount)).Mul(decimal.NewFromInt(100))
	}

	// Get account details for utilization calculation
	account, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err == nil {
		stats.AccountName = account.AccountName
		if account.DailyLimit.GreaterThan(decimal.Zero) {
			stats.UtilizationRate = account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))
		}
	}

	return stats, nil
}
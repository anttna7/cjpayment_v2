package service

import (
	"context"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// limitService implements the LimitService interface
type limitService struct {
	merchantRepo     repository.MerchantRepository
	accountRepo      repository.ReceiveAccountRepository
	limitAlertRepo   repository.LimitAlertRepository
	rechargeOrderRepo repository.RechargeOrderRepository
}

// NewLimitService creates a new limit service instance
func NewLimitService(
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
	limitAlertRepo repository.LimitAlertRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
) LimitService {
	return &limitService{
		merchantRepo:      merchantRepo,
		accountRepo:       accountRepo,
		limitAlertRepo:    limitAlertRepo,
		rechargeOrderRepo: rechargeOrderRepo,
	}
}

// CheckAccountLimits checks if an account can process a transaction of the given amount
func (s *limitService) CheckAccountLimits(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*LimitCheckResult, error) {
	account, err := s.accountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	if account == nil {
		return &LimitCheckResult{
			Allowed: false,
			Reason:  "Account not found",
		}, nil
	}

	// Check if account is active
	if account.Status != "active" {
		return &LimitCheckResult{
			Allowed: false,
			Reason:  "Account is not active",
		}, nil
	}

	// Reset daily limits if needed
	if err := s.resetAccountDailyLimitsIfNeeded(ctx, account); err != nil {
		return nil, fmt.Errorf("failed to reset daily limits: %w", err)
	}

	// Check single transaction limit
	if account.SingleLimit.GreaterThan(decimal.Zero) && amount.GreaterThan(account.SingleLimit) {
		amountFloat, _ := amount.Float64()
		singleLimitFloat, _ := account.SingleLimit.Float64()
		return &LimitCheckResult{
			Allowed:        false,
			Reason:         fmt.Sprintf("Amount %.2f exceeds single transaction limit %.2f", amountFloat, singleLimitFloat),
			SingleLimit:    account.SingleLimit,
			DailyLimit:     account.DailyLimit,
			DailyUsed:      account.DailyUsed,
			DailyRemaining: account.DailyLimit.Sub(account.DailyUsed),
		}, nil
	}

	// Check daily limit
	if account.DailyLimit.GreaterThan(decimal.Zero) {
		newDailyUsed := account.DailyUsed.Add(amount)
		if newDailyUsed.GreaterThan(account.DailyLimit) {
			amountFloat, _ := amount.Float64()
			dailyLimitFloat, _ := account.DailyLimit.Float64()
			dailyUsedFloat, _ := account.DailyUsed.Float64()
			return &LimitCheckResult{
				Allowed:        false,
				Reason:         fmt.Sprintf("Amount %.2f would exceed daily limit %.2f (current used: %.2f)", amountFloat, dailyLimitFloat, dailyUsedFloat),
				SingleLimit:    account.SingleLimit,
				DailyLimit:     account.DailyLimit,
				DailyUsed:      account.DailyUsed,
				DailyRemaining: account.DailyLimit.Sub(account.DailyUsed),
			}, nil
		}
	}

	return &LimitCheckResult{
		Allowed:        true,
		SingleLimit:    account.SingleLimit,
		DailyLimit:     account.DailyLimit,
		DailyUsed:      account.DailyUsed,
		DailyRemaining: account.DailyLimit.Sub(account.DailyUsed),
	}, nil
}

// UpdateAccountDailyUsed updates the daily used amount for an account
func (s *limitService) UpdateAccountDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	if err := s.accountRepo.UpdateDailyUsed(ctx, accountID, amount); err != nil {
		return fmt.Errorf("failed to update account daily used: %w", err)
	}

	// Check for limit alerts after updating usage
	if err := s.checkAndCreateAccountLimitAlerts(ctx, accountID); err != nil {
		// Log error but don't fail the transaction
		// In a real implementation, you might want to use a logger here
		fmt.Printf("Warning: failed to check account limit alerts: %v\n", err)
	}

	return nil
}

// ResetAccountDailyLimits resets daily limits for all accounts
func (s *limitService) ResetAccountDailyLimits(ctx context.Context) error {
	return s.accountRepo.ResetDailyLimits(ctx)
}

// GetAccountLimitStatus returns the current limit status for an account
func (s *limitService) GetAccountLimitStatus(ctx context.Context, accountID uuid.UUID) (*AccountLimitStatus, error) {
	account, err := s.accountRepo.GetByID(ctx, accountID)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}

	if account == nil {
		return nil, fmt.Errorf("account not found")
	}

	// Reset daily limits if needed
	if err := s.resetAccountDailyLimitsIfNeeded(ctx, account); err != nil {
		return nil, fmt.Errorf("failed to reset daily limits: %w", err)
	}

	dailyRemaining := decimal.Zero
	utilizationRate := decimal.Zero

	if account.DailyLimit.GreaterThan(decimal.Zero) {
		dailyRemaining = account.DailyLimit.Sub(account.DailyUsed)
		if dailyRemaining.LessThan(decimal.Zero) {
			dailyRemaining = decimal.Zero
		}
		utilizationRate = account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))
	}

	return &AccountLimitStatus{
		AccountID:       account.ID,
		AccountName:     account.AccountName,
		SingleLimit:     account.SingleLimit,
		DailyLimit:      account.DailyLimit,
		DailyUsed:       account.DailyUsed,
		DailyRemaining:  dailyRemaining,
		LastResetDate:   account.LastResetDate,
		UtilizationRate: utilizationRate,
	}, nil
}

// CheckMerchantLimits checks if a merchant can process a transaction of the given amount
func (s *limitService) CheckMerchantLimits(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) (*LimitCheckResult, error) {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant: %w", err)
	}

	if merchant == nil {
		return &LimitCheckResult{
			Allowed: false,
			Reason:  "Merchant not found",
		}, nil
	}

	// Check if merchant is active
	if merchant.Status != "active" {
		return &LimitCheckResult{
			Allowed: false,
			Reason:  "Merchant is not active",
		}, nil
	}

	// Reset daily limits if needed
	if err := s.resetMerchantDailyLimitsIfNeeded(ctx, merchant); err != nil {
		return nil, fmt.Errorf("failed to reset daily limits: %w", err)
	}

	// Check single transaction limit
	if merchant.SingleLimit.GreaterThan(decimal.Zero) && amount.GreaterThan(merchant.SingleLimit) {
		amountFloat, _ := amount.Float64()
		singleLimitFloat, _ := merchant.SingleLimit.Float64()
		return &LimitCheckResult{
			Allowed:        false,
			Reason:         fmt.Sprintf("Amount %.2f exceeds single transaction limit %.2f", amountFloat, singleLimitFloat),
			SingleLimit:    merchant.SingleLimit,
			DailyLimit:     merchant.DailyLimit,
			DailyUsed:      merchant.DailyUsed,
			DailyRemaining: merchant.DailyLimit.Sub(merchant.DailyUsed),
		}, nil
	}

	// Check daily limit
	if merchant.DailyLimit.GreaterThan(decimal.Zero) {
		newDailyUsed := merchant.DailyUsed.Add(amount)
		if newDailyUsed.GreaterThan(merchant.DailyLimit) {
			amountFloat, _ := amount.Float64()
			dailyLimitFloat, _ := merchant.DailyLimit.Float64()
			dailyUsedFloat, _ := merchant.DailyUsed.Float64()
			return &LimitCheckResult{
				Allowed:        false,
				Reason:         fmt.Sprintf("Amount %.2f would exceed daily limit %.2f (current used: %.2f)", amountFloat, dailyLimitFloat, dailyUsedFloat),
				SingleLimit:    merchant.SingleLimit,
				DailyLimit:     merchant.DailyLimit,
				DailyUsed:      merchant.DailyUsed,
				DailyRemaining: merchant.DailyLimit.Sub(merchant.DailyUsed),
			}, nil
		}
	}

	return &LimitCheckResult{
		Allowed:        true,
		SingleLimit:    merchant.SingleLimit,
		DailyLimit:     merchant.DailyLimit,
		DailyUsed:      merchant.DailyUsed,
		DailyRemaining: merchant.DailyLimit.Sub(merchant.DailyUsed),
	}, nil
}

// UpdateMerchantDailyUsed updates the daily used amount for a merchant
func (s *limitService) UpdateMerchantDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error {
	if err := s.merchantRepo.UpdateDailyUsed(ctx, merchantID, amount); err != nil {
		return fmt.Errorf("failed to update merchant daily used: %w", err)
	}

	// Check for limit alerts after updating usage
	if err := s.checkAndCreateMerchantLimitAlerts(ctx, merchantID); err != nil {
		// Log error but don't fail the transaction
		fmt.Printf("Warning: failed to check merchant limit alerts: %v\n", err)
	}

	return nil
}

// ResetMerchantDailyLimits resets daily limits for all merchants
func (s *limitService) ResetMerchantDailyLimits(ctx context.Context) error {
	return s.merchantRepo.ResetDailyLimits(ctx)
}

// GetMerchantLimitStatus returns the current limit status for a merchant
func (s *limitService) GetMerchantLimitStatus(ctx context.Context, merchantID uuid.UUID) (*MerchantLimitStatus, error) {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant: %w", err)
	}

	if merchant == nil {
		return nil, fmt.Errorf("merchant not found")
	}

	// Reset daily limits if needed
	if err := s.resetMerchantDailyLimitsIfNeeded(ctx, merchant); err != nil {
		return nil, fmt.Errorf("failed to reset daily limits: %w", err)
	}

	dailyRemaining := decimal.Zero
	utilizationRate := decimal.Zero

	if merchant.DailyLimit.GreaterThan(decimal.Zero) {
		dailyRemaining = merchant.DailyLimit.Sub(merchant.DailyUsed)
		if dailyRemaining.LessThan(decimal.Zero) {
			dailyRemaining = decimal.Zero
		}
		utilizationRate = merchant.DailyUsed.Div(merchant.DailyLimit).Mul(decimal.NewFromInt(100))
	}

	return &MerchantLimitStatus{
		MerchantID:      merchant.ID,
		MerchantName:    merchant.Name,
		SingleLimit:     merchant.SingleLimit,
		DailyLimit:      merchant.DailyLimit,
		DailyUsed:       merchant.DailyUsed,
		DailyRemaining:  dailyRemaining,
		LastResetDate:   merchant.LastResetDate,
		UtilizationRate: utilizationRate,
	}, nil
}

// GetLimitAlerts returns limit alerts based on the filter
func (s *limitService) GetLimitAlerts(ctx context.Context, filter *LimitAlertFilter) ([]*LimitAlert, error) {
	// Convert service filter to repository filter
	repoFilter := &repository.LimitAlertFilter{
		AlertType:  filter.AlertType,
		EntityID:   filter.EntityID,
		AlertLevel: filter.AlertLevel,
		IsResolved: filter.IsResolved,
		StartDate:  filter.StartDate,
		EndDate:    filter.EndDate,
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		OrderBy:    filter.OrderBy,
		OrderDir:   filter.OrderDir,
	}
	
	alerts, err := s.limitAlertRepo.List(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get limit alerts: %w", err)
	}

	// Convert repository models to service models
	result := make([]*LimitAlert, len(alerts))
	for i, alert := range alerts {
		result[i] = &LimitAlert{
			ID:          alert.ID,
			AlertType:   alert.AlertType,
			EntityID:    alert.EntityID,
			EntityName:  alert.EntityName,
			AlertLevel:  alert.AlertLevel,
			Threshold:   alert.Threshold,
			CurrentUsed: alert.CurrentUsed,
			Message:     alert.Message,
			CreatedAt:   alert.CreatedAt,
			IsResolved:  alert.IsResolved,
		}
	}

	return result, nil
}

// CreateLimitAlert creates a new limit alert
func (s *limitService) CreateLimitAlert(ctx context.Context, alert *LimitAlert) error {
	repoAlert := &repository.LimitAlert{
		ID:          uuid.New(),
		AlertType:   alert.AlertType,
		EntityID:    alert.EntityID,
		EntityName:  alert.EntityName,
		AlertLevel:  alert.AlertLevel,
		Threshold:   alert.Threshold,
		CurrentUsed: alert.CurrentUsed,
		Message:     alert.Message,
		CreatedAt:   time.Now(),
		IsResolved:  false,
	}

	return s.limitAlertRepo.Create(ctx, repoAlert)
}

// SetAccountLimits sets limits for an account
func (s *limitService) SetAccountLimits(ctx context.Context, accountID uuid.UUID, req *SetAccountLimitsRequest) error {
	account, err := s.accountRepo.GetByID(ctx, accountID)
	if err != nil {
		return fmt.Errorf("failed to get account: %w", err)
	}

	if account == nil {
		return fmt.Errorf("account not found")
	}

	account.DailyLimit = req.DailyLimit
	account.SingleLimit = req.SingleLimit
	account.UpdatedAt = time.Now()

	return s.accountRepo.Update(ctx, account)
}

// SetMerchantLimits sets limits for a merchant
func (s *limitService) SetMerchantLimits(ctx context.Context, merchantID uuid.UUID, req *SetMerchantLimitsRequest) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	if merchant == nil {
		return fmt.Errorf("merchant not found")
	}

	merchant.DailyLimit = req.DailyLimit
	merchant.SingleLimit = req.SingleLimit
	merchant.UpdatedAt = time.Now()

	return s.merchantRepo.Update(ctx, merchant)
}

// Helper methods

// resetAccountDailyLimitsIfNeeded resets daily limits if the last reset date is not today
func (s *limitService) resetAccountDailyLimitsIfNeeded(ctx context.Context, account *repository.ReceiveAccount) error {
	today := time.Now().Truncate(24 * time.Hour)
	lastReset := account.LastResetDate.Truncate(24 * time.Hour)

	if !today.Equal(lastReset) {
		account.DailyUsed = decimal.Zero
		account.LastResetDate = today
		account.UpdatedAt = time.Now()
		return s.accountRepo.Update(ctx, account)
	}

	return nil
}

// resetMerchantDailyLimitsIfNeeded resets daily limits if the last reset date is not today
func (s *limitService) resetMerchantDailyLimitsIfNeeded(ctx context.Context, merchant *repository.Merchant) error {
	today := time.Now().Truncate(24 * time.Hour)
	lastReset := merchant.LastResetDate.Truncate(24 * time.Hour)

	if !today.Equal(lastReset) {
		merchant.DailyUsed = decimal.Zero
		merchant.LastResetDate = today
		merchant.UpdatedAt = time.Now()
		return s.merchantRepo.Update(ctx, merchant)
	}

	return nil
}

// checkAndCreateAccountLimitAlerts checks if account usage exceeds thresholds and creates alerts
func (s *limitService) checkAndCreateAccountLimitAlerts(ctx context.Context, accountID uuid.UUID) error {
	account, err := s.accountRepo.GetByID(ctx, accountID)
	if err != nil {
		return err
	}

	if account == nil || account.DailyLimit.LessThanOrEqual(decimal.Zero) {
		return nil
	}

	utilizationRate := account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))

	// Check for warning threshold (80%)
	warningThreshold := decimal.NewFromInt(80)
	if utilizationRate.GreaterThanOrEqual(warningThreshold) {
		// Check if there's already an unresolved warning alert
		alerts, err := s.limitAlertRepo.GetUnresolvedAlerts(ctx, accountID, "account_limit")
		if err != nil {
			return err
		}

		hasWarning := false
		for _, alert := range alerts {
			if alert.AlertLevel == "warning" {
				hasWarning = true
				break
			}
		}

		if !hasWarning {
			utilizationFloat, _ := utilizationRate.Float64()
			alert := &repository.LimitAlert{
				ID:          uuid.New(),
				AlertType:   "account_limit",
				EntityID:    accountID,
				EntityName:  account.AccountName,
				AlertLevel:  "warning",
				Threshold:   warningThreshold,
				CurrentUsed: utilizationRate,
				Message:     fmt.Sprintf("Account %s has reached %.2f%% of daily limit", account.AccountName, utilizationFloat),
				CreatedAt:   time.Now(),
				IsResolved:  false,
			}
			if err := s.limitAlertRepo.Create(ctx, alert); err != nil {
				return err
			}
		}
	}

	// Check for critical threshold (95%)
	criticalThreshold := decimal.NewFromInt(95)
	if utilizationRate.GreaterThanOrEqual(criticalThreshold) {
		// Check if there's already an unresolved critical alert
		alerts, err := s.limitAlertRepo.GetUnresolvedAlerts(ctx, accountID, "account_limit")
		if err != nil {
			return err
		}

		hasCritical := false
		for _, alert := range alerts {
			if alert.AlertLevel == "critical" {
				hasCritical = true
				break
			}
		}

		if !hasCritical {
			utilizationFloat, _ := utilizationRate.Float64()
			alert := &repository.LimitAlert{
				ID:          uuid.New(),
				AlertType:   "account_limit",
				EntityID:    accountID,
				EntityName:  account.AccountName,
				AlertLevel:  "critical",
				Threshold:   criticalThreshold,
				CurrentUsed: utilizationRate,
				Message:     fmt.Sprintf("Account %s has reached %.2f%% of daily limit - CRITICAL", account.AccountName, utilizationFloat),
				CreatedAt:   time.Now(),
				IsResolved:  false,
			}
			if err := s.limitAlertRepo.Create(ctx, alert); err != nil {
				return err
			}
		}
	}

	return nil
}

// checkAndCreateMerchantLimitAlerts checks if merchant usage exceeds thresholds and creates alerts
func (s *limitService) checkAndCreateMerchantLimitAlerts(ctx context.Context, merchantID uuid.UUID) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return err
	}

	if merchant == nil || merchant.DailyLimit.LessThanOrEqual(decimal.Zero) {
		return nil
	}

	utilizationRate := merchant.DailyUsed.Div(merchant.DailyLimit).Mul(decimal.NewFromInt(100))

	// Check for warning threshold (80%)
	warningThreshold := decimal.NewFromInt(80)
	if utilizationRate.GreaterThanOrEqual(warningThreshold) {
		// Check if there's already an unresolved warning alert
		alerts, err := s.limitAlertRepo.GetUnresolvedAlerts(ctx, merchantID, "merchant_limit")
		if err != nil {
			return err
		}

		hasWarning := false
		for _, alert := range alerts {
			if alert.AlertLevel == "warning" {
				hasWarning = true
				break
			}
		}

		if !hasWarning {
			utilizationFloat, _ := utilizationRate.Float64()
			alert := &repository.LimitAlert{
				ID:          uuid.New(),
				AlertType:   "merchant_limit",
				EntityID:    merchantID,
				EntityName:  merchant.Name,
				AlertLevel:  "warning",
				Threshold:   warningThreshold,
				CurrentUsed: utilizationRate,
				Message:     fmt.Sprintf("Merchant %s has reached %.2f%% of daily limit", merchant.Name, utilizationFloat),
				CreatedAt:   time.Now(),
				IsResolved:  false,
			}
			if err := s.limitAlertRepo.Create(ctx, alert); err != nil {
				return err
			}
		}
	}

	// Check for critical threshold (95%)
	criticalThreshold := decimal.NewFromInt(95)
	if utilizationRate.GreaterThanOrEqual(criticalThreshold) {
		// Check if there's already an unresolved critical alert
		alerts, err := s.limitAlertRepo.GetUnresolvedAlerts(ctx, merchantID, "merchant_limit")
		if err != nil {
			return err
		}

		hasCritical := false
		for _, alert := range alerts {
			if alert.AlertLevel == "critical" {
				hasCritical = true
				break
			}
		}

		if !hasCritical {
			utilizationFloat, _ := utilizationRate.Float64()
			alert := &repository.LimitAlert{
				ID:          uuid.New(),
				AlertType:   "merchant_limit",
				EntityID:    merchantID,
				EntityName:  merchant.Name,
				AlertLevel:  "critical",
				Threshold:   criticalThreshold,
				CurrentUsed: utilizationRate,
				Message:     fmt.Sprintf("Merchant %s has reached %.2f%% of daily limit - CRITICAL", merchant.Name, utilizationFloat),
				CreatedAt:   time.Now(),
				IsResolved:  false,
			}
			if err := s.limitAlertRepo.Create(ctx, alert); err != nil {
				return err
			}
		}
	}

	return nil
}

// GetMerchantLimitStatuses returns limit statuses for multiple merchants
func (s *limitService) GetMerchantLimitStatuses(ctx context.Context, filter *MerchantLimitStatusFilter) ([]*MerchantLimitStatus, error) {
	// Build merchant filter
	merchantFilter := &repository.MerchantFilter{
		Limit:    filter.Limit,
		Offset:   filter.Offset,
		OrderBy:  filter.OrderBy,
		OrderDir: filter.OrderDir,
	}
	
	if filter.Status != nil {
		merchantFilter.Status = filter.Status
	}

	merchants, err := s.merchantRepo.List(ctx, merchantFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchants: %w", err)
	}

	var result []*MerchantLimitStatus
	for _, merchant := range merchants {
		// Reset daily limits if needed
		if err := s.resetMerchantDailyLimitsIfNeeded(ctx, merchant); err != nil {
			return nil, fmt.Errorf("failed to reset merchant daily limits: %w", err)
		}

		dailyRemaining := decimal.Zero
		utilizationRate := decimal.Zero

		if merchant.DailyLimit.GreaterThan(decimal.Zero) {
			dailyRemaining = merchant.DailyLimit.Sub(merchant.DailyUsed)
			if dailyRemaining.LessThan(decimal.Zero) {
				dailyRemaining = decimal.Zero
			}
			utilizationRate = merchant.DailyUsed.Div(merchant.DailyLimit).Mul(decimal.NewFromInt(100))
		}

		// Apply utilization rate filter
		if filter.MinUtilizationRate != nil {
			utilizationFloat, _ := utilizationRate.Float64()
			if utilizationFloat < *filter.MinUtilizationRate {
				continue
			}
		}
		if filter.MaxUtilizationRate != nil {
			utilizationFloat, _ := utilizationRate.Float64()
			if utilizationFloat > *filter.MaxUtilizationRate {
				continue
			}
		}

		status := &MerchantLimitStatus{
			MerchantID:      merchant.ID,
			MerchantName:    merchant.Name,
			SingleLimit:     merchant.SingleLimit,
			DailyLimit:      merchant.DailyLimit,
			DailyUsed:       merchant.DailyUsed,
			DailyRemaining:  dailyRemaining,
			LastResetDate:   merchant.LastResetDate,
			UtilizationRate: utilizationRate,
		}

		result = append(result, status)
	}

	return result, nil
}

// GetLimitUtilizationReport generates a utilization report for merchants and accounts
func (s *limitService) GetLimitUtilizationReport(ctx context.Context, filter *LimitUtilizationFilter) (*LimitUtilizationReport, error) {
	report := &LimitUtilizationReport{
		StartDate: filter.StartDate,
		EndDate:   filter.EndDate,
		Period:    fmt.Sprintf("%s to %s", filter.StartDate.Format("2006-01-02"), filter.EndDate.Format("2006-01-02")),
		Summary:   &UtilizationSummary{},
	}

	// Get merchant utilization data
	merchantFilter := &repository.MerchantFilter{
		Status: stringPtr("active"),
	}
	merchants, err := s.merchantRepo.List(ctx, merchantFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchants: %w", err)
	}

	var merchantData []*MerchantUtilizationData
	highUtilizationCount := 0
	criticalUtilizationCount := 0
	totalUtilization := decimal.Zero

	for _, merchant := range merchants {
		// Skip if specific merchants are requested and this one isn't included
		if len(filter.MerchantIDs) > 0 {
			found := false
			for _, id := range filter.MerchantIDs {
				if id == merchant.ID {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		utilizationRate := decimal.Zero
		if merchant.DailyLimit.GreaterThan(decimal.Zero) {
			utilizationRate = merchant.DailyUsed.Div(merchant.DailyLimit).Mul(decimal.NewFromInt(100))
		}

		utilizationFloat, _ := utilizationRate.Float64()
		if utilizationFloat >= 80 {
			highUtilizationCount++
		}
		if utilizationFloat >= 95 {
			criticalUtilizationCount++
		}

		totalUtilization = totalUtilization.Add(utilizationRate)

		data := &MerchantUtilizationData{
			MerchantID:         merchant.ID,
			MerchantName:       merchant.Name,
			DailyLimit:         merchant.DailyLimit,
			AverageUtilization: utilizationRate, // For simplicity, using current as average
			PeakUtilization:    utilizationRate, // For simplicity, using current as peak
			ViolationCount:     0,               // Would need to query violation records
		}
		merchantData = append(merchantData, data)
	}

	report.Merchants = merchantData
	report.Summary.TotalMerchants = len(merchantData)
	report.Summary.HighUtilization = highUtilizationCount
	report.Summary.CriticalUtilization = criticalUtilizationCount

	if len(merchantData) > 0 {
		report.Summary.AverageUtilization = totalUtilization.Div(decimal.NewFromInt(int64(len(merchantData))))
	}

	// Get account utilization data (similar logic)
	accountFilter := &repository.ReceiveAccountFilter{
		Status: stringPtr("active"),
	}
	accounts, err := s.accountRepo.List(ctx, accountFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get accounts: %w", err)
	}

	var accountData []*AccountUtilizationData
	for _, account := range accounts {
		// Skip if specific accounts are requested and this one isn't included
		if len(filter.AccountIDs) > 0 {
			found := false
			for _, id := range filter.AccountIDs {
				if id == account.ID {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		utilizationRate := decimal.Zero
		if account.DailyLimit.GreaterThan(decimal.Zero) {
			utilizationRate = account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))
		}

		data := &AccountUtilizationData{
			AccountID:          account.ID,
			AccountName:        account.AccountName,
			DailyLimit:         account.DailyLimit,
			AverageUtilization: utilizationRate,
			PeakUtilization:    utilizationRate,
			ViolationCount:     0,
		}
		accountData = append(accountData, data)
	}

	report.Accounts = accountData
	report.Summary.TotalAccounts = len(accountData)

	return report, nil
}

// UpdateMerchantLimitsWithValidation updates merchant limits with validation and audit trail
func (s *limitService) UpdateMerchantLimitsWithValidation(ctx context.Context, merchantID uuid.UUID, req *UpdateMerchantLimitsRequest) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	if merchant == nil {
		return fmt.Errorf("merchant not found")
	}

	// Validate the new limits
	if req.DailyLimit != nil {
		if req.DailyLimit.LessThan(decimal.Zero) {
			return fmt.Errorf("daily limit cannot be negative")
		}
		// Check if new daily limit is less than current usage
		if req.DailyLimit.LessThan(merchant.DailyUsed) {
			return fmt.Errorf("new daily limit %.2f is less than current usage %.2f", 
				mustFloat64(*req.DailyLimit), mustFloat64(merchant.DailyUsed))
		}
	}

	if req.SingleLimit != nil {
		if req.SingleLimit.LessThan(decimal.Zero) {
			return fmt.Errorf("single limit cannot be negative")
		}
		// Single limit should not exceed daily limit
		dailyLimit := merchant.DailyLimit
		if req.DailyLimit != nil {
			dailyLimit = *req.DailyLimit
		}
		if dailyLimit.GreaterThan(decimal.Zero) && req.SingleLimit.GreaterThan(dailyLimit) {
			return fmt.Errorf("single limit %.2f cannot exceed daily limit %.2f", 
				mustFloat64(*req.SingleLimit), mustFloat64(dailyLimit))
		}
	}

	// Apply the changes
	if req.DailyLimit != nil {
		merchant.DailyLimit = *req.DailyLimit
	}
	if req.SingleLimit != nil {
		merchant.SingleLimit = *req.SingleLimit
	}
	merchant.UpdatedAt = time.Now()

	// Apply from specific time if provided
	if req.ValidFrom != nil && req.ValidFrom.After(time.Now()) {
		// In a real implementation, you might want to schedule this change
		// For now, we'll just apply it immediately
	}

	return s.merchantRepo.Update(ctx, merchant)
}

// GetLimitViolations returns limit violations based on filter
func (s *limitService) GetLimitViolations(ctx context.Context, filter *LimitViolationFilter) ([]*LimitViolation, error) {
	// This would require a violation repository implementation
	// For now, return empty list as the violation tracking would be implemented
	// when the violation repository is created
	return []*LimitViolation{}, nil
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func mustFloat64(d decimal.Decimal) float64 {
	f, _ := d.Float64()
	return f
}
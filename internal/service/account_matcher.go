package service

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// AccountMatcher defines the intelligent account matching engine
type AccountMatcher struct {
	merchantRepo         repository.MerchantRepository
	receiveAccountRepo   repository.ReceiveAccountRepository
	merchantAccountRepo  repository.MerchantReceiveAccountRepository
	matchingLogRepo      repository.AccountMatchingLogRepository
	strategies           []MatchStrategy
	cache                MatchingCache
}

// MatchRequest represents a request for account matching
type MatchRequest struct {
	MerchantID   uuid.UUID       `json:"merchant_id"`
	PaymentType  string          `json:"payment_type"`  // "private" or "business"
	Amount       decimal.Decimal `json:"amount"`
	PayerInfo    *PayerInfo      `json:"payer_info,omitempty"`
	SessionID    *string         `json:"session_id,omitempty"`
	IPAddress    *string         `json:"ip_address,omitempty"`
	UserAgent    *string         `json:"user_agent,omitempty"`
}

// PayerInfo contains information about the payer
type PayerInfo struct {
	Name         string `json:"name"`
	Account      string `json:"account,omitempty"`
	AdAccount    string `json:"ad_account,omitempty"`
}

// MatchResult represents the result of account matching
type MatchResult struct {
	Account       *repository.ReceiveAccount `json:"account"`
	MatchScore    int                        `json:"match_score"`
	MatchReason   string                     `json:"match_reason"`
	Confidence    float64                    `json:"confidence"`
	AlternativeAccounts []*AlternativeAccount `json:"alternative_accounts,omitempty"`
}

// AlternativeAccount represents an alternative account option
type AlternativeAccount struct {
	Account     *repository.ReceiveAccount `json:"account"`
	MatchScore  int                        `json:"match_score"`
	Reason      string                     `json:"reason"`
}

// MatchStrategy defines the interface for matching strategies
type MatchStrategy interface {
	Match(ctx context.Context, req *MatchRequest, availableAccounts []*repository.ReceiveAccount) ([]*ScoredAccount, error)
	Priority() int
	Name() string
}

// ScoredAccount represents an account with its matching score
type ScoredAccount struct {
	Account    *repository.ReceiveAccount `json:"account"`
	Score      int                        `json:"score"`
	Reason     string                     `json:"reason"`
	Confidence float64                    `json:"confidence"`
}

// MatchingCache defines the interface for caching matching results
type MatchingCache interface {
	Get(key string) (*MatchResult, bool)
	Set(key string, result *MatchResult, ttl time.Duration)
	Clear()
}

// NewAccountMatcher creates a new account matcher instance
func NewAccountMatcher(
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	merchantAccountRepo repository.MerchantReceiveAccountRepository,
	matchingLogRepo repository.AccountMatchingLogRepository,
	cache MatchingCache,
) *AccountMatcher {
	matcher := &AccountMatcher{
		merchantRepo:        merchantRepo,
		receiveAccountRepo:  receiveAccountRepo,
		merchantAccountRepo: merchantAccountRepo,
		matchingLogRepo:     matchingLogRepo,
		cache:              cache,
		strategies:         make([]MatchStrategy, 0),
	}

	// Initialize default strategies
	matcher.registerDefaultStrategies()

	return matcher
}

// registerDefaultStrategies registers the default matching strategies
func (am *AccountMatcher) registerDefaultStrategies() {
	am.strategies = []MatchStrategy{
		NewPaymentTypeMatchStrategy(),
		NewLimitCheckStrategy(),
		NewPriorityStrategy(),
		NewLoadBalancingStrategy(),
		NewAvailabilityStrategy(),
	}

	// Sort strategies by priority
	sort.Slice(am.strategies, func(i, j int) bool {
		return am.strategies[i].Priority() > am.strategies[j].Priority()
	})
}

// Match performs intelligent account matching
func (am *AccountMatcher) Match(ctx context.Context, req *MatchRequest) (*MatchResult, error) {
	startTime := time.Now()
	
	// Generate cache key
	cacheKey := am.generateCacheKey(req)
	
	// Check cache first
	if cached, found := am.cache.Get(cacheKey); found {
		return cached, nil
	}

	// Get available accounts for the merchant
	availableAccounts, err := am.getAvailableAccounts(ctx, req)
	if err != nil {
		am.logMatchingAttempt(ctx, req, nil, false, err.Error(), time.Since(startTime))
		return nil, fmt.Errorf("failed to get available accounts: %w", err)
	}

	if len(availableAccounts) == 0 {
		am.logMatchingAttempt(ctx, req, nil, false, "no available accounts", time.Since(startTime))
		return nil, fmt.Errorf("no available accounts for merchant %s", req.MerchantID)
	}

	// Apply matching strategies
	scoredAccounts, err := am.applyStrategies(ctx, req, availableAccounts)
	if err != nil {
		am.logMatchingAttempt(ctx, req, nil, false, err.Error(), time.Since(startTime))
		return nil, fmt.Errorf("failed to apply matching strategies: %w", err)
	}

	// Select the best match
	result, err := am.selectBestMatch(scoredAccounts)
	if err != nil {
		am.logMatchingAttempt(ctx, req, nil, false, err.Error(), time.Since(startTime))
		return nil, fmt.Errorf("failed to select best match: %w", err)
	}

	// Cache the result
	am.cache.Set(cacheKey, result, 5*time.Minute)

	// Log successful matching
	am.logMatchingAttempt(ctx, req, result.Account, true, result.MatchReason, time.Since(startTime))

	return result, nil
}

// getAvailableAccounts retrieves available accounts for the merchant
func (am *AccountMatcher) getAvailableAccounts(ctx context.Context, req *MatchRequest) ([]*repository.ReceiveAccount, error) {
	// Get merchant-account relationships
	relationships, err := am.merchantAccountRepo.GetByMerchant(ctx, req.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	var availableAccounts []*repository.ReceiveAccount
	for _, rel := range relationships {
		if !rel.IsActive {
			continue
		}

		account, err := am.receiveAccountRepo.GetByID(ctx, rel.ReceiveAccountID)
		if err != nil {
			continue // Skip accounts that can't be retrieved
		}

		// Basic availability checks
		if account.Status != "active" {
			continue
		}

		// Check if account can handle the amount
		if req.Amount.GreaterThan(account.SingleLimit) {
			continue
		}

		// Check daily limit
		remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
		if req.Amount.GreaterThan(remainingDaily) {
			continue
		}

		availableAccounts = append(availableAccounts, account)
	}

	return availableAccounts, nil
}

// applyStrategies applies all matching strategies to score accounts
func (am *AccountMatcher) applyStrategies(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	// Initialize scored accounts
	scoredAccounts := make([]*ScoredAccount, len(accounts))
	for i, account := range accounts {
		scoredAccounts[i] = &ScoredAccount{
			Account:    account,
			Score:      0,
			Reason:     "",
			Confidence: 0.0,
		}
	}

	// Apply each strategy
	for _, strategy := range am.strategies {
		strategyResults, err := strategy.Match(ctx, req, accounts)
		if err != nil {
			return nil, fmt.Errorf("strategy %s failed: %w", strategy.Name(), err)
		}

		// Merge strategy results
		am.mergeStrategyResults(scoredAccounts, strategyResults, strategy)
	}

	// Sort by score (descending)
	sort.Slice(scoredAccounts, func(i, j int) bool {
		return scoredAccounts[i].Score > scoredAccounts[j].Score
	})

	return scoredAccounts, nil
}

// mergeStrategyResults merges results from a strategy into the main scored accounts
func (am *AccountMatcher) mergeStrategyResults(scoredAccounts, strategyResults []*ScoredAccount, strategy MatchStrategy) {
	strategyMap := make(map[uuid.UUID]*ScoredAccount)
	for _, result := range strategyResults {
		strategyMap[result.Account.ID] = result
	}

	for _, scored := range scoredAccounts {
		if strategyResult, found := strategyMap[scored.Account.ID]; found {
			scored.Score += strategyResult.Score
			if scored.Reason == "" {
				scored.Reason = strategyResult.Reason
			} else {
				scored.Reason += "; " + strategyResult.Reason
			}
			scored.Confidence = (scored.Confidence + strategyResult.Confidence) / 2
		}
	}
}

// selectBestMatch selects the best matching account
func (am *AccountMatcher) selectBestMatch(scoredAccounts []*ScoredAccount) (*MatchResult, error) {
	if len(scoredAccounts) == 0 {
		return nil, fmt.Errorf("no scored accounts available")
	}

	best := scoredAccounts[0]
	
	// Prepare alternative accounts
	var alternatives []*AlternativeAccount
	for i := 1; i < len(scoredAccounts) && i < 3; i++ { // Top 3 alternatives
		alternatives = append(alternatives, &AlternativeAccount{
			Account:    scoredAccounts[i].Account,
			MatchScore: scoredAccounts[i].Score,
			Reason:     scoredAccounts[i].Reason,
		})
	}

	return &MatchResult{
		Account:             best.Account,
		MatchScore:          best.Score,
		MatchReason:         best.Reason,
		Confidence:          best.Confidence,
		AlternativeAccounts: alternatives,
	}, nil
}

// generateCacheKey generates a cache key for the matching request
func (am *AccountMatcher) generateCacheKey(req *MatchRequest) string {
	return fmt.Sprintf("match:%s:%s:%s", 
		req.MerchantID.String(), 
		req.PaymentType, 
		req.Amount.String())
}

// logMatchingAttempt logs the matching attempt for analysis
func (am *AccountMatcher) logMatchingAttempt(ctx context.Context, req *MatchRequest, matchedAccount *repository.ReceiveAccount, success bool, reason string, duration time.Duration) {
	log := &repository.AccountMatchingLog{
		ID:               uuid.New(),
		MerchantID:       req.MerchantID,
		PaymentType:      req.PaymentType,
		Amount:           req.Amount,
		Success:          success,
		ExecutionTimeMS:  int(duration.Milliseconds()),
		CreatedAt:        time.Now(),
	}

	if matchedAccount != nil {
		log.MatchedAccountID = &matchedAccount.ID
		log.MatchScore = &[]int{100}[0] // Default score for successful matches
	}

	if reason != "" {
		log.MatchReason = &reason
	}

	if !success {
		log.ErrorMessage = &reason
	}

	// Log matching rules used
	log.MatchingRules = map[string]interface{}{
		"strategies_used": len(am.strategies),
		"payment_type":    req.PaymentType,
		"amount":          req.Amount.String(),
	}

	// Attempt to save log (don't fail the main operation if logging fails)
	_ = am.matchingLogRepo.Create(ctx, log)
}

// AddStrategy adds a custom matching strategy
func (am *AccountMatcher) AddStrategy(strategy MatchStrategy) {
	am.strategies = append(am.strategies, strategy)
	
	// Re-sort strategies by priority
	sort.Slice(am.strategies, func(i, j int) bool {
		return am.strategies[i].Priority() > am.strategies[j].Priority()
	})
}

// GetMatchingStatistics returns matching statistics
func (am *AccountMatcher) GetMatchingStatistics(ctx context.Context, filter *repository.AccountMatchingStatsFilter) (*repository.AccountMatchingStats, error) {
	return am.matchingLogRepo.GetStatistics(ctx, filter)
}

// ClearCache clears the matching cache
func (am *AccountMatcher) ClearCache() {
	am.cache.Clear()
}
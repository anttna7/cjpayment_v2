package service

import (
	"context"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// AccountMatchingService defines the interface for intelligent account matching
type AccountMatchingService interface {
	// Core matching functionality
	MatchAccount(ctx context.Context, req *MatchAccountRequest) (*MatchAccountResponse, error)
	MatchAccountWithAlternatives(ctx context.Context, req *MatchAccountRequest) (*DetailedMatchResponse, error)
	
	// Batch matching
	BatchMatchAccounts(ctx context.Context, requests []*MatchAccountRequest) ([]*MatchAccountResponse, error)
	
	// Strategy management
	AddCustomStrategy(strategy MatchStrategy) error
	RemoveStrategy(strategyName string) error
	ListStrategies() []StrategyInfo
	
	// Performance and analytics
	GetMatchingStatistics(ctx context.Context, filter *MatchingStatsFilter) (*MatchingStatistics, error)
	GetMatchingPerformance(ctx context.Context, timeRange TimeRange) (*MatchingPerformance, error)
	
	// Cache management
	ClearMatchingCache() error
	GetCacheStatistics() (*CacheStatistics, error)
	
	// Configuration
	UpdateMatchingConfig(ctx context.Context, config *MatchingConfig) error
	GetMatchingConfig(ctx context.Context) (*MatchingConfig, error)
}

// AccountMatchingServiceImpl implements AccountMatchingService
type AccountMatchingServiceImpl struct {
	matcher     *AccountMatcher
	config      *MatchingConfig
	metrics     *MetricsCollector
}

// MatchAccountRequest represents a request to match an account
type MatchAccountRequest struct {
	MerchantID   uuid.UUID       `json:"merchant_id" binding:"required"`
	PaymentType  string          `json:"payment_type" binding:"required,oneof=private business"`
	Amount       decimal.Decimal `json:"amount" binding:"required,gt=0"`
	PayerInfo    *PayerInfo      `json:"payer_info,omitempty"`
	SessionID    *string         `json:"session_id,omitempty"`
	IPAddress    *string         `json:"ip_address,omitempty"`
	UserAgent    *string         `json:"user_agent,omitempty"`
	Preferences  *MatchingPreferences `json:"preferences,omitempty"`
}

// MatchingPreferences allows customization of matching behavior
type MatchingPreferences struct {
	PreferredAccountTypes []string `json:"preferred_account_types,omitempty"`
	ExcludeAccountIDs     []uuid.UUID `json:"exclude_account_ids,omitempty"`
	MinConfidenceScore    *float64 `json:"min_confidence_score,omitempty"`
	MaxAlternatives       *int     `json:"max_alternatives,omitempty"`
}

// MatchAccountResponse represents the response from account matching
type MatchAccountResponse struct {
	Success         bool                       `json:"success"`
	Account         *repository.ReceiveAccount `json:"account,omitempty"`
	MatchScore      int                        `json:"match_score"`
	MatchReason     string                     `json:"match_reason"`
	Confidence      float64                    `json:"confidence"`
	ExecutionTime   time.Duration              `json:"execution_time"`
	CacheHit        bool                       `json:"cache_hit"`
	Error           *string                    `json:"error,omitempty"`
}

// DetailedMatchResponse includes alternative accounts
type DetailedMatchResponse struct {
	*MatchAccountResponse
	AlternativeAccounts []*AlternativeAccount `json:"alternative_accounts,omitempty"`
	MatchingDetails     *MatchingDetails      `json:"matching_details,omitempty"`
}

// MatchingDetails provides detailed information about the matching process
type MatchingDetails struct {
	TotalAccountsEvaluated int                    `json:"total_accounts_evaluated"`
	StrategiesApplied      []string               `json:"strategies_applied"`
	FilteringSteps         []FilteringStep        `json:"filtering_steps"`
	ScoringBreakdown       map[string]int         `json:"scoring_breakdown"`
}

// FilteringStep represents a step in the account filtering process
type FilteringStep struct {
	StepName        string `json:"step_name"`
	AccountsBefore  int    `json:"accounts_before"`
	AccountsAfter   int    `json:"accounts_after"`
	FilterCriteria  string `json:"filter_criteria"`
}

// StrategyInfo provides information about a matching strategy
type StrategyInfo struct {
	Name        string `json:"name"`
	Priority    int    `json:"priority"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}

// MatchingStatsFilter filters matching statistics
type MatchingStatsFilter struct {
	MerchantID  *uuid.UUID `json:"merchant_id,omitempty"`
	PaymentType *string    `json:"payment_type,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	Success     *bool      `json:"success,omitempty"`
}

// MatchingStatistics provides statistics about matching performance
type MatchingStatistics struct {
	TotalMatches        int64           `json:"total_matches"`
	SuccessfulMatches   int64           `json:"successful_matches"`
	FailedMatches       int64           `json:"failed_matches"`
	SuccessRate         float64         `json:"success_rate"`
	AverageMatchScore   float64         `json:"average_match_score"`
	AverageExecutionTime time.Duration  `json:"average_execution_time"`
	TopFailureReasons   []FailureReason `json:"top_failure_reasons"`
	MatchesByPaymentType map[string]int64 `json:"matches_by_payment_type"`
	MatchesByHour       map[int]int64   `json:"matches_by_hour"`
}

// FailureReason represents a common failure reason
type FailureReason struct {
	Reason string `json:"reason"`
	Count  int64  `json:"count"`
}

// MatchingPerformance provides performance metrics
type MatchingPerformance struct {
	TimeRange           TimeRange     `json:"time_range"`
	TotalRequests       int64         `json:"total_requests"`
	AverageResponseTime time.Duration `json:"average_response_time"`
	P95ResponseTime     time.Duration `json:"p95_response_time"`
	P99ResponseTime     time.Duration `json:"p99_response_time"`
	CacheHitRate        float64       `json:"cache_hit_rate"`
	ErrorRate           float64       `json:"error_rate"`
}

// TimeRange represents a time range for queries
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// CacheStatistics provides cache performance statistics
type CacheStatistics struct {
	HitCount      int64   `json:"hit_count"`
	MissCount     int64   `json:"miss_count"`
	HitRate       float64 `json:"hit_rate"`
	TotalEntries  int     `json:"total_entries"`
	ActiveEntries int     `json:"active_entries"`
	MemoryUsage   int64   `json:"memory_usage"`
}

// MatchingConfig defines configuration for the matching engine
type MatchingConfig struct {
	CacheTTL                time.Duration `json:"cache_ttl"`
	MaxAlternatives         int           `json:"max_alternatives"`
	MinConfidenceThreshold  float64       `json:"min_confidence_threshold"`
	EnableLoadBalancing     bool          `json:"enable_load_balancing"`
	EnableRiskAssessment    bool          `json:"enable_risk_assessment"`
	EnableTimeBasedMatching bool          `json:"enable_time_based_matching"`
	StrategyWeights         map[string]float64 `json:"strategy_weights"`
}

// NewAccountMatchingService creates a new account matching service
func NewAccountMatchingService(
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	merchantAccountRepo repository.MerchantReceiveAccountRepository,
	matchingLogRepo repository.AccountMatchingLogRepository,
) AccountMatchingService {
	cache := NewInMemoryMatchingCache()
	matcher := NewAccountMatcher(
		merchantRepo,
		receiveAccountRepo,
		merchantAccountRepo,
		matchingLogRepo,
		cache,
	)
	
	return &AccountMatchingServiceImpl{
		matcher: matcher,
		config:  getDefaultMatchingConfig(),
		metrics: NewMetricsCollector(),
	}
}

// MatchAccount performs intelligent account matching
func (s *AccountMatchingServiceImpl) MatchAccount(ctx context.Context, req *MatchAccountRequest) (*MatchAccountResponse, error) {
	startTime := time.Now()
	
	// Convert request to internal format
	matchReq := &MatchRequest{
		MerchantID:  req.MerchantID,
		PaymentType: req.PaymentType,
		Amount:      req.Amount,
		PayerInfo:   req.PayerInfo,
		SessionID:   req.SessionID,
		IPAddress:   req.IPAddress,
		UserAgent:   req.UserAgent,
	}
	
	// Perform matching
	result, err := s.matcher.Match(ctx, matchReq)
	executionTime := time.Since(startTime)
	
	if err != nil {
		s.metrics.RecordMiss()
		errorMsg := err.Error()
		return &MatchAccountResponse{
			Success:       false,
			ExecutionTime: executionTime,
			CacheHit:      false,
			Error:         &errorMsg,
		}, nil
	}
	
	s.metrics.RecordHit()
	
	return &MatchAccountResponse{
		Success:       true,
		Account:       result.Account,
		MatchScore:    result.MatchScore,
		MatchReason:   result.MatchReason,
		Confidence:    result.Confidence,
		ExecutionTime: executionTime,
		CacheHit:      false, // TODO: Implement cache hit detection
	}, nil
}

// MatchAccountWithAlternatives performs matching and returns alternatives
func (s *AccountMatchingServiceImpl) MatchAccountWithAlternatives(ctx context.Context, req *MatchAccountRequest) (*DetailedMatchResponse, error) {
	// First get the basic match
	basicResponse, err := s.MatchAccount(ctx, req)
	if err != nil {
		return nil, err
	}
	
	// Convert to detailed response
	detailed := &DetailedMatchResponse{
		MatchAccountResponse: basicResponse,
	}
	
	// If successful, get the full result with alternatives
	if basicResponse.Success {
		matchReq := &MatchRequest{
			MerchantID:  req.MerchantID,
			PaymentType: req.PaymentType,
			Amount:      req.Amount,
			PayerInfo:   req.PayerInfo,
			SessionID:   req.SessionID,
			IPAddress:   req.IPAddress,
			UserAgent:   req.UserAgent,
		}
		
		result, err := s.matcher.Match(ctx, matchReq)
		if err == nil {
			detailed.AlternativeAccounts = result.AlternativeAccounts
			detailed.MatchingDetails = &MatchingDetails{
				TotalAccountsEvaluated: len(result.AlternativeAccounts) + 1,
				StrategiesApplied:      s.getStrategyNames(),
				ScoringBreakdown:       map[string]int{"total": result.MatchScore},
			}
		}
	}
	
	return detailed, nil
}

// BatchMatchAccounts performs batch matching
func (s *AccountMatchingServiceImpl) BatchMatchAccounts(ctx context.Context, requests []*MatchAccountRequest) ([]*MatchAccountResponse, error) {
	responses := make([]*MatchAccountResponse, len(requests))
	
	for i, req := range requests {
		response, err := s.MatchAccount(ctx, req)
		if err != nil {
			errorMsg := err.Error()
			responses[i] = &MatchAccountResponse{
				Success: false,
				Error:   &errorMsg,
			}
		} else {
			responses[i] = response
		}
	}
	
	return responses, nil
}

// AddCustomStrategy adds a custom matching strategy
func (s *AccountMatchingServiceImpl) AddCustomStrategy(strategy MatchStrategy) error {
	s.matcher.AddStrategy(strategy)
	return nil
}

// RemoveStrategy removes a matching strategy
func (s *AccountMatchingServiceImpl) RemoveStrategy(strategyName string) error {
	// Implementation would remove strategy from matcher
	return fmt.Errorf("strategy removal not implemented")
}

// ListStrategies returns information about all strategies
func (s *AccountMatchingServiceImpl) ListStrategies() []StrategyInfo {
	strategies := []StrategyInfo{
		{Name: "PaymentTypeMatch", Priority: 100, Description: "Matches based on payment type", IsActive: true},
		{Name: "LimitCheck", Priority: 90, Description: "Checks account limits", IsActive: true},
		{Name: "Priority", Priority: 80, Description: "Considers account priority", IsActive: true},
		{Name: "LoadBalancing", Priority: 70, Description: "Distributes load across accounts", IsActive: true},
		{Name: "Availability", Priority: 60, Description: "Checks account availability", IsActive: true},
	}
	
	return strategies
}

// GetMatchingStatistics returns matching statistics
func (s *AccountMatchingServiceImpl) GetMatchingStatistics(ctx context.Context, filter *MatchingStatsFilter) (*MatchingStatistics, error) {
	// Convert filter to repository filter
	repoFilter := &repository.AccountMatchingStatsFilter{
		MerchantID:  filter.MerchantID,
		PaymentType: filter.PaymentType,
		StartDate:   filter.StartDate,
		EndDate:     filter.EndDate,
	}
	
	stats, err := s.matcher.GetMatchingStatistics(ctx, repoFilter)
	if err != nil {
		return nil, err
	}
	
	return &MatchingStatistics{
		TotalMatches:         stats.TotalAttempts,
		SuccessfulMatches:    stats.SuccessfulMatches,
		FailedMatches:        stats.FailedMatches,
		SuccessRate:          stats.SuccessRate.InexactFloat64(),
		AverageMatchScore:    stats.AverageMatchScore.InexactFloat64(),
		AverageExecutionTime: time.Duration(stats.AverageExecutionTime) * time.Millisecond,
	}, nil
}

// GetMatchingPerformance returns performance metrics
func (s *AccountMatchingServiceImpl) GetMatchingPerformance(ctx context.Context, timeRange TimeRange) (*MatchingPerformance, error) {
	metrics := s.metrics.GetMetrics()
	
	return &MatchingPerformance{
		TimeRange:           timeRange,
		TotalRequests:       metrics.HitCount + metrics.MissCount,
		AverageResponseTime: 50 * time.Millisecond, // Placeholder
		P95ResponseTime:     100 * time.Millisecond, // Placeholder
		P99ResponseTime:     200 * time.Millisecond, // Placeholder
		CacheHitRate:        metrics.HitRate,
		ErrorRate:           0.05, // Placeholder
	}, nil
}

// ClearMatchingCache clears the matching cache
func (s *AccountMatchingServiceImpl) ClearMatchingCache() error {
	s.matcher.ClearCache()
	return nil
}

// GetCacheStatistics returns cache statistics
func (s *AccountMatchingServiceImpl) GetCacheStatistics() (*CacheStatistics, error) {
	metrics := s.metrics.GetMetrics()
	
	return &CacheStatistics{
		HitCount:      metrics.HitCount,
		MissCount:     metrics.MissCount,
		HitRate:       metrics.HitRate,
		TotalEntries:  100, // Placeholder
		ActiveEntries: 80,  // Placeholder
		MemoryUsage:   1024 * 1024, // Placeholder
	}, nil
}

// UpdateMatchingConfig updates the matching configuration
func (s *AccountMatchingServiceImpl) UpdateMatchingConfig(ctx context.Context, config *MatchingConfig) error {
	s.config = config
	return nil
}

// GetMatchingConfig returns the current matching configuration
func (s *AccountMatchingServiceImpl) GetMatchingConfig(ctx context.Context) (*MatchingConfig, error) {
	return s.config, nil
}

// getStrategyNames returns the names of all active strategies
func (s *AccountMatchingServiceImpl) getStrategyNames() []string {
	return []string{
		"PaymentTypeMatch",
		"LimitCheck", 
		"Priority",
		"LoadBalancing",
		"Availability",
	}
}

// getDefaultMatchingConfig returns the default matching configuration
func getDefaultMatchingConfig() *MatchingConfig {
	return &MatchingConfig{
		CacheTTL:                5 * time.Minute,
		MaxAlternatives:         3,
		MinConfidenceThreshold:  0.5,
		EnableLoadBalancing:     true,
		EnableRiskAssessment:    true,
		EnableTimeBasedMatching: true,
		StrategyWeights: map[string]float64{
			"PaymentTypeMatch": 1.0,
			"LimitCheck":       1.0,
			"Priority":         0.8,
			"LoadBalancing":    0.6,
			"Availability":     0.9,
		},
	}
}
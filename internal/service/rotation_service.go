package service

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// rotationService implements RotationService interface
type rotationService struct {
	rotationRuleRepo           repository.RotationRuleRepository
	receiveAccountRepo         repository.ReceiveAccountRepository
	merchantRepo               repository.MerchantRepository
	merchantReceiveAccountRepo repository.MerchantReceiveAccountRepository
}

// NewRotationService creates a new rotation service
func NewRotationService(
	rotationRuleRepo repository.RotationRuleRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	merchantRepo repository.MerchantRepository,
	merchantReceiveAccountRepo repository.MerchantReceiveAccountRepository,
) RotationService {
	return &rotationService{
		rotationRuleRepo:           rotationRuleRepo,
		receiveAccountRepo:         receiveAccountRepo,
		merchantRepo:               merchantRepo,
		merchantReceiveAccountRepo: merchantReceiveAccountRepo,
	}
}

// CreateRotationRule creates a new rotation rule
func (s *rotationService) CreateRotationRule(ctx context.Context, req *CreateRotationRuleRequest) (*repository.RotationRule, error) {
	// Validate request
	if err := s.validateCreateRotationRuleRequest(req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Verify merchant exists
	_, err := s.merchantRepo.GetByID(ctx, req.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("merchant not found: %w", err)
	}

	// Validate strategy configuration
	if err := s.ValidateStrategyConfig(req.StrategyType, req.StrategyConfig); err != nil {
		return nil, fmt.Errorf("invalid strategy config: %w", err)
	}

	// Create rotation rule entity
	rule := &repository.RotationRule{
		ID:             uuid.New(),
		MerchantID:     req.MerchantID,
		RuleName:       req.RuleName,
		StrategyType:   req.StrategyType,
		StrategyConfig: req.StrategyConfig,
		IsActive:       true, // Default to active
	}

	// Create rule in repository
	if err := s.rotationRuleRepo.Create(ctx, rule); err != nil {
		return nil, fmt.Errorf("failed to create rotation rule: %w", err)
	}

	return rule, nil
}

// GetRotationRule retrieves a rotation rule by ID
func (s *rotationService) GetRotationRule(ctx context.Context, id uuid.UUID) (*repository.RotationRule, error) {
	rule, err := s.rotationRuleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get rotation rule: %w", err)
	}
	return rule, nil
}

// UpdateRotationRule updates an existing rotation rule
func (s *rotationService) UpdateRotationRule(ctx context.Context, id uuid.UUID, req *UpdateRotationRuleRequest) (*repository.RotationRule, error) {
	// Get existing rule
	rule, err := s.rotationRuleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get rotation rule: %w", err)
	}

	// Update fields if provided
	if req.RuleName != nil {
		rule.RuleName = *req.RuleName
	}
	if req.StrategyType != nil {
		rule.StrategyType = *req.StrategyType
	}
	if req.StrategyConfig != nil {
		rule.StrategyConfig = *req.StrategyConfig
	}
	if req.IsActive != nil {
		rule.IsActive = *req.IsActive
	}

	// Validate strategy configuration if updated
	if req.StrategyType != nil || req.StrategyConfig != nil {
		if err := s.ValidateStrategyConfig(rule.StrategyType, rule.StrategyConfig); err != nil {
			return nil, fmt.Errorf("invalid strategy config: %w", err)
		}
	}

	// Update rule in repository
	if err := s.rotationRuleRepo.Update(ctx, rule); err != nil {
		return nil, fmt.Errorf("failed to update rotation rule: %w", err)
	}

	return rule, nil
}

// DeleteRotationRule deletes a rotation rule
func (s *rotationService) DeleteRotationRule(ctx context.Context, id uuid.UUID) error {
	// Check if rule exists
	_, err := s.rotationRuleRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("rotation rule not found: %w", err)
	}

	if err := s.rotationRuleRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete rotation rule: %w", err)
	}

	return nil
}

// ListRotationRules retrieves rotation rules with filtering
func (s *rotationService) ListRotationRules(ctx context.Context, filter *repository.RotationRuleFilter) ([]*repository.RotationRule, error) {
	rules, err := s.rotationRuleRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list rotation rules: %w", err)
	}
	return rules, nil
}

// GetMerchantRotationRules retrieves all rotation rules for a merchant
func (s *rotationService) GetMerchantRotationRules(ctx context.Context, merchantID uuid.UUID) ([]*repository.RotationRule, error) {
	// Verify merchant exists
	_, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("merchant not found: %w", err)
	}

	rules, err := s.rotationRuleRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant rotation rules: %w", err)
	}

	return rules, nil
}

// SelectAccount selects the best account for a merchant based on rotation rules
func (s *rotationService) SelectAccount(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error) {
	// Get available accounts
	accounts, err := s.receiveAccountRepo.GetAvailableAccounts(ctx, merchantID, amount, paymentType)
	if err != nil {
		return nil, fmt.Errorf("failed to get available accounts: %w", err)
	}

	if len(accounts) == 0 {
		return nil, fmt.Errorf("no available accounts found")
	}

	// Get active rotation rules for the merchant
	rules, err := s.rotationRuleRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get rotation rules: %w", err)
	}

	// Filter active rules
	var activeRules []*repository.RotationRule
	for _, rule := range rules {
		if rule.IsActive {
			activeRules = append(activeRules, rule)
		}
	}

	// If no active rules, use simple weighted round-robin based on merchant_receive_accounts weights
	if len(activeRules) == 0 {
		return s.selectByWeight(ctx, accounts, merchantID)
	}

	// Apply the first active rule (rules are ordered by priority)
	rule := activeRules[0]
	return s.applyRotationStrategy(ctx, rule, accounts, amount, paymentType)
}

// ValidateStrategyConfig validates strategy configuration
func (s *rotationService) ValidateStrategyConfig(strategyType string, config repository.StrategyConfig) error {
	switch strategyType {
	case "weighted":
		return s.validateWeightedConfig(config)
	case "time_based":
		return s.validateTimeBasedConfig(config)
	case "amount_tier":
		return s.validateAmountTierConfig(config)
	default:
		return fmt.Errorf("unsupported strategy type: %s", strategyType)
	}
}

// applyRotationStrategy applies the specified rotation strategy
func (s *rotationService) applyRotationStrategy(ctx context.Context, rule *repository.RotationRule, accounts []*repository.ReceiveAccount, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error) {
	switch rule.StrategyType {
	case "weighted":
		return s.applyWeightedStrategy(ctx, rule.StrategyConfig, accounts)
	case "time_based":
		return s.applyTimeBasedStrategy(ctx, rule.StrategyConfig, accounts)
	case "amount_tier":
		return s.applyAmountTierStrategy(ctx, rule.StrategyConfig, accounts, amount)
	default:
		return nil, fmt.Errorf("unsupported strategy type: %s", rule.StrategyType)
	}
}

// selectByWeight selects account based on merchant_receive_accounts weights
func (s *rotationService) selectByWeight(ctx context.Context, accounts []*repository.ReceiveAccount, merchantID uuid.UUID) (*repository.ReceiveAccount, error) {
	if len(accounts) == 1 {
		return accounts[0], nil
	}

	// Get merchant-account relationships to get weights
	relationships, err := s.merchantReceiveAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant account relationships: %w", err)
	}

	// Create weight map
	weightMap := make(map[uuid.UUID]int)
	for _, rel := range relationships {
		if rel.IsActive {
			weightMap[rel.ReceiveAccountID] = rel.Weight
		}
	}

	// Calculate total weight for available accounts
	totalWeight := 0
	for _, account := range accounts {
		if weight, exists := weightMap[account.ID]; exists {
			totalWeight += weight
		} else {
			totalWeight += 1 // Default weight
		}
	}

	if totalWeight == 0 {
		return accounts[0], nil // Fallback to first account
	}

	// Select account based on weighted random selection
	rand.Seed(time.Now().UnixNano())
	randomWeight := rand.Intn(totalWeight)
	currentWeight := 0

	for _, account := range accounts {
		weight := 1 // Default weight
		if w, exists := weightMap[account.ID]; exists {
			weight = w
		}
		currentWeight += weight
		if currentWeight > randomWeight {
			return account, nil
		}
	}

	return accounts[0], nil // Fallback
}

// applyWeightedStrategy applies weighted round-robin strategy
func (s *rotationService) applyWeightedStrategy(ctx context.Context, config repository.StrategyConfig, accounts []*repository.ReceiveAccount) (*repository.ReceiveAccount, error) {
	weights, ok := config["weights"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid weights configuration")
	}

	// Calculate total weight
	totalWeight := 0
	for _, account := range accounts {
		if weight, exists := weights[account.ID.String()]; exists {
			if w, ok := weight.(float64); ok {
				totalWeight += int(w)
			}
		} else {
			totalWeight += 1 // Default weight
		}
	}

	if totalWeight == 0 {
		return accounts[0], nil
	}

	// Weighted random selection
	rand.Seed(time.Now().UnixNano())
	randomWeight := rand.Intn(totalWeight)
	currentWeight := 0

	for _, account := range accounts {
		weight := 1 // Default weight
		if w, exists := weights[account.ID.String()]; exists {
			if wf, ok := w.(float64); ok {
				weight = int(wf)
			}
		}
		currentWeight += weight
		if currentWeight > randomWeight {
			return account, nil
		}
	}

	return accounts[0], nil
}

// applyTimeBasedStrategy applies time-based rotation strategy
func (s *rotationService) applyTimeBasedStrategy(ctx context.Context, config repository.StrategyConfig, accounts []*repository.ReceiveAccount) (*repository.ReceiveAccount, error) {
	timeSlots, ok := config["time_slots"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid time_slots configuration")
	}

	// Get current hour
	currentHour := time.Now().Hour()
	hourKey := fmt.Sprintf("%d", currentHour)

	// Get account IDs for current time slot
	var accountIDs []string
	if slot, exists := timeSlots[hourKey]; exists {
		if ids, ok := slot.([]interface{}); ok {
			for _, id := range ids {
				if idStr, ok := id.(string); ok {
					accountIDs = append(accountIDs, idStr)
				}
			}
		}
	}

	// If no specific time slot configuration, use all accounts
	if len(accountIDs) == 0 {
		return accounts[0], nil
	}

	// Find matching accounts
	var matchingAccounts []*repository.ReceiveAccount
	for _, account := range accounts {
		for _, idStr := range accountIDs {
			if account.ID.String() == idStr {
				matchingAccounts = append(matchingAccounts, account)
				break
			}
		}
	}

	if len(matchingAccounts) == 0 {
		return accounts[0], nil // Fallback to first available account
	}

	// Random selection from matching accounts
	rand.Seed(time.Now().UnixNano())
	return matchingAccounts[rand.Intn(len(matchingAccounts))], nil
}

// applyAmountTierStrategy applies amount-based tier strategy
func (s *rotationService) applyAmountTierStrategy(ctx context.Context, config repository.StrategyConfig, accounts []*repository.ReceiveAccount, amount decimal.Decimal) (*repository.ReceiveAccount, error) {
	tiers, ok := config["tiers"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid tiers configuration")
	}

	// Find matching tier
	for _, tierInterface := range tiers {
		tier, ok := tierInterface.(map[string]interface{})
		if !ok {
			continue
		}

		minAmount, hasMin := tier["min_amount"]
		maxAmount, hasMax := tier["max_amount"]
		accountIDs, hasAccounts := tier["account_ids"]

		// Check if amount falls within tier range
		inRange := true
		if hasMin {
			if minAmountFloat, ok := minAmount.(float64); ok {
				if amount.LessThan(decimal.NewFromFloat(minAmountFloat)) {
					inRange = false
				}
			}
		}
		if hasMax && inRange {
			if maxAmountFloat, ok := maxAmount.(float64); ok {
				if amount.GreaterThan(decimal.NewFromFloat(maxAmountFloat)) {
					inRange = false
				}
			}
		}

		if !inRange || !hasAccounts {
			continue
		}

		// Get account IDs for this tier
		var tierAccountIDs []string
		if ids, ok := accountIDs.([]interface{}); ok {
			for _, id := range ids {
				if idStr, ok := id.(string); ok {
					tierAccountIDs = append(tierAccountIDs, idStr)
				}
			}
		}

		// Find matching accounts
		var matchingAccounts []*repository.ReceiveAccount
		for _, account := range accounts {
			for _, idStr := range tierAccountIDs {
				if account.ID.String() == idStr {
					matchingAccounts = append(matchingAccounts, account)
					break
				}
			}
		}

		if len(matchingAccounts) > 0 {
			// Random selection from matching accounts
			rand.Seed(time.Now().UnixNano())
			return matchingAccounts[rand.Intn(len(matchingAccounts))], nil
		}
	}

	// No matching tier found, use first available account
	return accounts[0], nil
}

// validateCreateRotationRuleRequest validates create rotation rule request
func (s *rotationService) validateCreateRotationRuleRequest(req *CreateRotationRuleRequest) error {
	if strings.TrimSpace(req.RuleName) == "" {
		return fmt.Errorf("rule name is required")
	}
	if strings.TrimSpace(req.StrategyType) == "" {
		return fmt.Errorf("strategy type is required")
	}
	if req.StrategyConfig == nil || len(req.StrategyConfig) == 0 {
		return fmt.Errorf("strategy config is required")
	}
	return nil
}

// validateWeightedConfig validates weighted strategy configuration
func (s *rotationService) validateWeightedConfig(config repository.StrategyConfig) error {
	weights, ok := config["weights"]
	if !ok {
		return fmt.Errorf("weights configuration is required")
	}

	weightsMap, ok := weights.(map[string]interface{})
	if !ok {
		return fmt.Errorf("weights must be a map of account_id to weight")
	}

	if len(weightsMap) == 0 {
		return fmt.Errorf("at least one weight must be specified")
	}

	// Validate weight values
	for accountID, weight := range weightsMap {
		if _, err := uuid.Parse(accountID); err != nil {
			return fmt.Errorf("invalid account ID: %s", accountID)
		}
		if _, ok := weight.(float64); !ok {
			return fmt.Errorf("weight must be a number for account %s", accountID)
		}
	}

	return nil
}

// validateTimeBasedConfig validates time-based strategy configuration
func (s *rotationService) validateTimeBasedConfig(config repository.StrategyConfig) error {
	timeSlots, ok := config["time_slots"]
	if !ok {
		return fmt.Errorf("time_slots configuration is required")
	}

	timeSlotsMap, ok := timeSlots.(map[string]interface{})
	if !ok {
		return fmt.Errorf("time_slots must be a map of hour to account IDs")
	}

	// Validate time slots
	for hour, accountIDs := range timeSlotsMap {
		// Validate hour (0-23)
		if h := strings.TrimSpace(hour); h == "" {
			return fmt.Errorf("hour cannot be empty")
		}

		// Validate account IDs
		if ids, ok := accountIDs.([]interface{}); ok {
			for _, id := range ids {
				if idStr, ok := id.(string); ok {
					if _, err := uuid.Parse(idStr); err != nil {
						return fmt.Errorf("invalid account ID: %s", idStr)
					}
				} else {
					return fmt.Errorf("account ID must be a string")
				}
			}
		} else {
			return fmt.Errorf("account IDs must be an array for hour %s", hour)
		}
	}

	return nil
}

// validateAmountTierConfig validates amount tier strategy configuration
func (s *rotationService) validateAmountTierConfig(config repository.StrategyConfig) error {
	tiers, ok := config["tiers"]
	if !ok {
		return fmt.Errorf("tiers configuration is required")
	}

	tiersArray, ok := tiers.([]interface{})
	if !ok {
		return fmt.Errorf("tiers must be an array")
	}

	if len(tiersArray) == 0 {
		return fmt.Errorf("at least one tier must be specified")
	}

	// Validate each tier
	for i, tierInterface := range tiersArray {
		tier, ok := tierInterface.(map[string]interface{})
		if !ok {
			return fmt.Errorf("tier %d must be an object", i)
		}

		// Validate account IDs
		accountIDs, hasAccounts := tier["account_ids"]
		if !hasAccounts {
			return fmt.Errorf("tier %d must have account_ids", i)
		}

		if ids, ok := accountIDs.([]interface{}); ok {
			for _, id := range ids {
				if idStr, ok := id.(string); ok {
					if _, err := uuid.Parse(idStr); err != nil {
						return fmt.Errorf("invalid account ID in tier %d: %s", i, idStr)
					}
				} else {
					return fmt.Errorf("account ID must be a string in tier %d", i)
				}
			}
		} else {
			return fmt.Errorf("account_ids must be an array in tier %d", i)
		}

		// Validate amount ranges (optional)
		if minAmount, hasMin := tier["min_amount"]; hasMin {
			if _, ok := minAmount.(float64); !ok {
				return fmt.Errorf("min_amount must be a number in tier %d", i)
			}
		}
		if maxAmount, hasMax := tier["max_amount"]; hasMax {
			if _, ok := maxAmount.(float64); !ok {
				return fmt.Errorf("max_amount must be a number in tier %d", i)
			}
		}
	}

	return nil
}
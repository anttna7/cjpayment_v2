package cache

import (
	"fmt"
	"strings"
	"time"
)

// InvalidationEvent represents a cache invalidation event
type InvalidationEvent struct {
	Type      string                 `json:"type"`
	EntityID  string                 `json:"entity_id"`
	Action    string                 `json:"action"` // create, update, delete
	Metadata  map[string]interface{} `json:"metadata"`
	Timestamp time.Time              `json:"timestamp"`
}

// InvalidationRule defines how to invalidate cache for specific events
type InvalidationRule struct {
	EventType    string
	CachePattern string
	Dependencies []string // Other cache keys that should be invalidated
}

// CacheInvalidator handles cache invalidation logic
type CacheInvalidator struct {
	cache Cache
	rules map[string][]InvalidationRule
}

// NewCacheInvalidator creates a new cache invalidator
func NewCacheInvalidator(cache Cache) *CacheInvalidator {
	invalidator := &CacheInvalidator{
		cache: cache,
		rules: make(map[string][]InvalidationRule),
	}
	
	// Register default invalidation rules
	invalidator.registerDefaultRules()
	
	return invalidator
}

// registerDefaultRules registers default cache invalidation rules
func (ci *CacheInvalidator) registerDefaultRules() {
	// User-related invalidations
	ci.AddRule("user", InvalidationRule{
		EventType:    "user",
		CachePattern: "user:*",
		Dependencies: []string{"user_perm:*", "session:*"},
	})
	
	// Merchant-related invalidations
	ci.AddRule("merchant", InvalidationRule{
		EventType:    "merchant",
		CachePattern: "merchant:*",
		Dependencies: []string{"merchant_list:*", "merchant_accounts:*"},
	})
	
	// Account-related invalidations
	ci.AddRule("account", InvalidationRule{
		EventType:    "account",
		CachePattern: "account:*",
		Dependencies: []string{"account_limit:*", "account_usage:*", "merchant_accounts:*"},
	})
	
	// Rotation rule invalidations
	ci.AddRule("rotation_rule", InvalidationRule{
		EventType:    "rotation_rule",
		CachePattern: "rotation_rule:*",
		Dependencies: []string{"rotation_state:*"},
	})
	
	// Report invalidations
	ci.AddRule("report", InvalidationRule{
		EventType:    "report",
		CachePattern: "report:*",
		Dependencies: []string{"report_data:*"},
	})
	
	// Recharge order invalidations
	ci.AddRule("recharge_order", InvalidationRule{
		EventType:    "recharge_order",
		CachePattern: "account_usage:*",
		Dependencies: []string{"report:*", "report_data:*"},
	})
}

// AddRule adds a new invalidation rule
func (ci *CacheInvalidator) AddRule(eventType string, rule InvalidationRule) {
	ci.rules[eventType] = append(ci.rules[eventType], rule)
}

// InvalidateByEvent invalidates cache based on an event
func (ci *CacheInvalidator) InvalidateByEvent(event InvalidationEvent) error {
	rules, exists := ci.rules[event.Type]
	if !exists {
		return nil // No rules for this event type
	}
	
	for _, rule := range rules {
		// Invalidate main cache pattern
		pattern := ci.buildCachePattern(rule.CachePattern, event.EntityID)
		if err := ci.cache.DeletePattern(pattern); err != nil {
			return fmt.Errorf("failed to invalidate pattern %s: %w", pattern, err)
		}
		
		// Invalidate dependencies
		for _, dep := range rule.Dependencies {
			depPattern := ci.buildCachePattern(dep, event.EntityID)
			if err := ci.cache.DeletePattern(depPattern); err != nil {
				return fmt.Errorf("failed to invalidate dependency %s: %w", depPattern, err)
			}
		}
	}
	
	return nil
}

// buildCachePattern builds a cache pattern with entity ID
func (ci *CacheInvalidator) buildCachePattern(pattern, entityID string) string {
	if entityID != "" && strings.Contains(pattern, "%s") {
		return fmt.Sprintf(pattern, entityID)
	}
	return pattern
}

// InvalidateUser invalidates all user-related cache
func (ci *CacheInvalidator) InvalidateUser(userID string) error {
	return ci.InvalidateByEvent(InvalidationEvent{
		Type:      "user",
		EntityID:  userID,
		Action:    "update",
		Timestamp: time.Now(),
	})
}

// InvalidateMerchant invalidates all merchant-related cache
func (ci *CacheInvalidator) InvalidateMerchant(merchantID string) error {
	return ci.InvalidateByEvent(InvalidationEvent{
		Type:      "merchant",
		EntityID:  merchantID,
		Action:    "update",
		Timestamp: time.Now(),
	})
}

// InvalidateAccount invalidates all account-related cache
func (ci *CacheInvalidator) InvalidateAccount(accountID string) error {
	return ci.InvalidateByEvent(InvalidationEvent{
		Type:      "account",
		EntityID:  accountID,
		Action:    "update",
		Timestamp: time.Now(),
	})
}

// InvalidateRotationRule invalidates rotation rule cache
func (ci *CacheInvalidator) InvalidateRotationRule(merchantID string) error {
	return ci.InvalidateByEvent(InvalidationEvent{
		Type:      "rotation_rule",
		EntityID:  merchantID,
		Action:    "update",
		Timestamp: time.Now(),
	})
}

// InvalidateReports invalidates all report cache
func (ci *CacheInvalidator) InvalidateReports() error {
	return ci.InvalidateByEvent(InvalidationEvent{
		Type:      "report",
		EntityID:  "",
		Action:    "update",
		Timestamp: time.Now(),
	})
}

// InvalidateRechargeOrder invalidates cache when recharge order changes
func (ci *CacheInvalidator) InvalidateRechargeOrder(orderID string) error {
	return ci.InvalidateByEvent(InvalidationEvent{
		Type:      "recharge_order",
		EntityID:  orderID,
		Action:    "update",
		Timestamp: time.Now(),
	})
}

// InvalidateAll clears all cache (use with caution)
func (ci *CacheInvalidator) InvalidateAll() error {
	return ci.cache.DeletePattern("*")
}

// CacheWarmup handles cache warming strategies
type CacheWarmup struct {
	cache Cache
}

// NewCacheWarmup creates a new cache warmup handler
func NewCacheWarmup(cache Cache) *CacheWarmup {
	return &CacheWarmup{
		cache: cache,
	}
}

// WarmupUser pre-loads user data into cache
func (cw *CacheWarmup) WarmupUser(userID string, userData interface{}) error {
	key := fmt.Sprintf(UserCacheKey, userID)
	return cw.cache.Set(key, userData, MediumExpiration)
}

// WarmupMerchant pre-loads merchant data into cache
func (cw *CacheWarmup) WarmupMerchant(merchantID string, merchantData interface{}) error {
	key := fmt.Sprintf(MerchantCacheKey, merchantID)
	return cw.cache.Set(key, merchantData, LongExpiration)
}

// WarmupAccount pre-loads account data into cache
func (cw *CacheWarmup) WarmupAccount(accountID string, accountData interface{}) error {
	key := fmt.Sprintf(AccountCacheKey, accountID)
	return cw.cache.Set(key, accountData, MediumExpiration)
}

// WarmupRotationRules pre-loads rotation rules into cache
func (cw *CacheWarmup) WarmupRotationRules(merchantID string, rules interface{}) error {
	key := fmt.Sprintf(RotationRuleKey, merchantID)
	return cw.cache.Set(key, rules, LongExpiration)
}
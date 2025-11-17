package cache

import (
	"context"
	"fmt"
	"time"
)

// RechargeCacheManager manages caching for recharge testing system
type RechargeCacheManager struct {
	cache  Cache
	config RechargeCacheConfig
}

// RechargeCacheConfig holds configuration for recharge system caching
type RechargeCacheConfig struct {
	MerchantTTL         time.Duration
	AccountTTL          time.Duration
	OrderTTL            time.Duration
	MatchingTTL         time.Duration
	StatsTTL            time.Duration
	WarmupEnabled       bool
	PreloadAccounts     bool
	CacheMatchingRules  bool
}

// DefaultRechargeCacheConfig returns default cache configuration for recharge system
func DefaultRechargeCacheConfig() RechargeCacheConfig {
	return RechargeCacheConfig{
		MerchantTTL:         30 * time.Minute,
		AccountTTL:          15 * time.Minute,
		OrderTTL:            10 * time.Minute,
		MatchingTTL:         5 * time.Minute,
		StatsTTL:            2 * time.Minute,
		WarmupEnabled:       true,
		PreloadAccounts:     true,
		CacheMatchingRules:  true,
	}
}

// NewRechargeCacheManager creates a new recharge cache manager
func NewRechargeCacheManager(cache Cache, config RechargeCacheConfig) *RechargeCacheManager {
	return &RechargeCacheManager{
		cache:  cache,
		config: config,
	}
}

// Merchant caching methods
func (rcm *RechargeCacheManager) GetMerchant(ctx context.Context, merchantID uint) (interface{}, error) {
	key := fmt.Sprintf("recharge:merchant:%d", merchantID)
	var merchant interface{}
	err := rcm.cache.Get(key, &merchant)
	return merchant, err
}

func (rcm *RechargeCacheManager) SetMerchant(ctx context.Context, merchantID uint, merchant interface{}) error {
	key := fmt.Sprintf("recharge:merchant:%d", merchantID)
	return rcm.cache.Set(key, merchant, rcm.config.MerchantTTL)
}

func (rcm *RechargeCacheManager) InvalidateMerchant(ctx context.Context, merchantID uint) error {
	key := fmt.Sprintf("recharge:merchant:%d", merchantID)
	return rcm.cache.Delete(key)
}

// Account caching methods
func (rcm *RechargeCacheManager) GetAccount(ctx context.Context, accountID uint) (interface{}, error) {
	key := fmt.Sprintf("recharge:account:%d", accountID)
	var account interface{}
	err := rcm.cache.Get(key, &account)
	return account, err
}

func (rcm *RechargeCacheManager) SetAccount(ctx context.Context, accountID uint, account interface{}) error {
	key := fmt.Sprintf("recharge:account:%d", accountID)
	return rcm.cache.Set(key, account, rcm.config.AccountTTL)
}

func (rcm *RechargeCacheManager) GetAccountsByMerchant(ctx context.Context, merchantID uint) (interface{}, error) {
	key := fmt.Sprintf("recharge:merchant_accounts:%d", merchantID)
	var accounts interface{}
	err := rcm.cache.Get(key, &accounts)
	return accounts, err
}

func (rcm *RechargeCacheManager) SetAccountsByMerchant(ctx context.Context, merchantID uint, accounts interface{}) error {
	key := fmt.Sprintf("recharge:merchant_accounts:%d", merchantID)
	return rcm.cache.Set(key, accounts, rcm.config.AccountTTL)
}

func (rcm *RechargeCacheManager) InvalidateAccountsByMerchant(ctx context.Context, merchantID uint) error {
	key := fmt.Sprintf("recharge:merchant_accounts:%d", merchantID)
	return rcm.cache.Delete(key)
}

// Account status and limits caching
func (rcm *RechargeCacheManager) GetAccountStatus(ctx context.Context, accountID uint) (interface{}, error) {
	key := fmt.Sprintf("recharge:account_status:%d", accountID)
	var status interface{}
	err := rcm.cache.Get(key, &status)
	return status, err
}

func (rcm *RechargeCacheManager) SetAccountStatus(ctx context.Context, accountID uint, status interface{}) error {
	key := fmt.Sprintf("recharge:account_status:%d", accountID)
	return rcm.cache.Set(key, status, rcm.config.AccountTTL)
}

func (rcm *RechargeCacheManager) GetAccountDailyUsage(ctx context.Context, accountID uint, date string) (interface{}, error) {
	key := fmt.Sprintf("recharge:account_usage:%d:%s", accountID, date)
	var usage interface{}
	err := rcm.cache.Get(key, &usage)
	return usage, err
}

func (rcm *RechargeCacheManager) SetAccountDailyUsage(ctx context.Context, accountID uint, date string, usage interface{}) error {
	key := fmt.Sprintf("recharge:account_usage:%d:%s", accountID, date)
	return rcm.cache.Set(key, usage, 24*time.Hour) // Cache daily usage for 24 hours
}

func (rcm *RechargeCacheManager) IncrementAccountUsage(ctx context.Context, accountID uint, date string, amount float64) error {
	key := fmt.Sprintf("recharge:account_usage:%d:%s", accountID, date)
	// Use Redis INCRBYFLOAT for atomic increment
	if redisClient, ok := rcm.cache.(*RedisClient); ok {
		_, err := redisClient.client.IncrByFloat(context.Background(), key, amount).Result()
		if err == nil {
			// Set expiration if this is a new key
			redisClient.Expire(key, 24*time.Hour)
		}
		return err
	}
	return fmt.Errorf("atomic increment not supported by cache implementation")
}

// Order caching methods
func (rcm *RechargeCacheManager) GetOrder(ctx context.Context, orderNo string) (interface{}, error) {
	key := fmt.Sprintf("recharge:order:%s", orderNo)
	var order interface{}
	err := rcm.cache.Get(key, &order)
	return order, err
}

func (rcm *RechargeCacheManager) SetOrder(ctx context.Context, orderNo string, order interface{}) error {
	key := fmt.Sprintf("recharge:order:%s", orderNo)
	return rcm.cache.Set(key, order, rcm.config.OrderTTL)
}

func (rcm *RechargeCacheManager) InvalidateOrder(ctx context.Context, orderNo string) error {
	key := fmt.Sprintf("recharge:order:%s", orderNo)
	return rcm.cache.Delete(key)
}

// Account matching cache methods
func (rcm *RechargeCacheManager) GetMatchingResult(ctx context.Context, merchantID uint, paymentType string, amount float64) (interface{}, error) {
	key := fmt.Sprintf("recharge:matching:%d:%s:%.2f", merchantID, paymentType, amount)
	var result interface{}
	err := rcm.cache.Get(key, &result)
	return result, err
}

func (rcm *RechargeCacheManager) SetMatchingResult(ctx context.Context, merchantID uint, paymentType string, amount float64, result interface{}) error {
	key := fmt.Sprintf("recharge:matching:%d:%s:%.2f", merchantID, paymentType, amount)
	return rcm.cache.Set(key, result, rcm.config.MatchingTTL)
}

func (rcm *RechargeCacheManager) InvalidateMatchingResults(ctx context.Context, merchantID uint) error {
	pattern := fmt.Sprintf("recharge:matching:%d:*", merchantID)
	return rcm.cache.DeletePattern(pattern)
}

// Statistics caching methods
func (rcm *RechargeCacheManager) GetMerchantStats(ctx context.Context, merchantID uint, period string) (interface{}, error) {
	key := fmt.Sprintf("recharge:stats:merchant:%d:%s", merchantID, period)
	var stats interface{}
	err := rcm.cache.Get(key, &stats)
	return stats, err
}

func (rcm *RechargeCacheManager) SetMerchantStats(ctx context.Context, merchantID uint, period string, stats interface{}) error {
	key := fmt.Sprintf("recharge:stats:merchant:%d:%s", merchantID, period)
	return rcm.cache.Set(key, stats, rcm.config.StatsTTL)
}

func (rcm *RechargeCacheManager) GetAccountStats(ctx context.Context, accountID uint, period string) (interface{}, error) {
	key := fmt.Sprintf("recharge:stats:account:%d:%s", accountID, period)
	var stats interface{}
	err := rcm.cache.Get(key, &stats)
	return stats, err
}

func (rcm *RechargeCacheManager) SetAccountStats(ctx context.Context, accountID uint, period string, stats interface{}) error {
	key := fmt.Sprintf("recharge:stats:account:%d:%s", accountID, period)
	return rcm.cache.Set(key, stats, rcm.config.StatsTTL)
}

// Bulk operations for performance
func (rcm *RechargeCacheManager) WarmupMerchants(ctx context.Context, merchants map[uint]interface{}) error {
	if !rcm.config.WarmupEnabled {
		return nil
	}

	// Use pipeline for batch operations if Redis client
	if redisClient, ok := rcm.cache.(*RedisClient); ok {
		pipe := redisClient.Pipeline()
		
		for merchantID, merchant := range merchants {
			key := fmt.Sprintf("recharge:merchant:%d", merchantID)
			pipe.Set(ctx, key, merchant, rcm.config.MerchantTTL)
		}
		
		_, err := redisClient.ExecutePipeline(pipe)
		return err
	}

	// Fallback to individual operations
	for merchantID, merchant := range merchants {
		if err := rcm.SetMerchant(ctx, merchantID, merchant); err != nil {
			return err
		}
	}
	
	return nil
}

func (rcm *RechargeCacheManager) WarmupAccounts(ctx context.Context, accounts map[uint]interface{}) error {
	if !rcm.config.PreloadAccounts {
		return nil
	}

	// Use pipeline for batch operations if Redis client
	if redisClient, ok := rcm.cache.(*RedisClient); ok {
		pipe := redisClient.Pipeline()
		
		for accountID, account := range accounts {
			key := fmt.Sprintf("recharge:account:%d", accountID)
			pipe.Set(ctx, key, account, rcm.config.AccountTTL)
		}
		
		_, err := redisClient.ExecutePipeline(pipe)
		return err
	}

	// Fallback to individual operations
	for accountID, account := range accounts {
		if err := rcm.SetAccount(ctx, accountID, account); err != nil {
			return err
		}
	}
	
	return nil
}

// Cache invalidation methods
func (rcm *RechargeCacheManager) InvalidateAllMerchantData(ctx context.Context, merchantID uint) error {
	patterns := []string{
		fmt.Sprintf("recharge:merchant:%d", merchantID),
		fmt.Sprintf("recharge:merchant_accounts:%d", merchantID),
		fmt.Sprintf("recharge:matching:%d:*", merchantID),
		fmt.Sprintf("recharge:stats:merchant:%d:*", merchantID),
	}

	for _, pattern := range patterns {
		if err := rcm.cache.DeletePattern(pattern); err != nil {
			return err
		}
	}

	return nil
}

func (rcm *RechargeCacheManager) InvalidateAllAccountData(ctx context.Context, accountID uint) error {
	patterns := []string{
		fmt.Sprintf("recharge:account:%d", accountID),
		fmt.Sprintf("recharge:account_status:%d", accountID),
		fmt.Sprintf("recharge:account_usage:%d:*", accountID),
		fmt.Sprintf("recharge:stats:account:%d:*", accountID),
	}

	for _, pattern := range patterns {
		if err := rcm.cache.DeletePattern(pattern); err != nil {
			return err
		}
	}

	return nil
}

// Performance monitoring
func (rcm *RechargeCacheManager) GetCacheStats(ctx context.Context) map[string]interface{} {
	stats := make(map[string]interface{})

	// Get basic cache metrics if available
	if redisClient, ok := rcm.cache.(*RedisClient); ok {
		stats = redisClient.GetMetrics()
	}

	// Add recharge-specific metrics
	stats["config"] = map[string]interface{}{
		"merchant_ttl":         rcm.config.MerchantTTL.String(),
		"account_ttl":          rcm.config.AccountTTL.String(),
		"order_ttl":            rcm.config.OrderTTL.String(),
		"matching_ttl":         rcm.config.MatchingTTL.String(),
		"stats_ttl":            rcm.config.StatsTTL.String(),
		"warmup_enabled":       rcm.config.WarmupEnabled,
		"preload_accounts":     rcm.config.PreloadAccounts,
		"cache_matching_rules": rcm.config.CacheMatchingRules,
	}

	return stats
}

// Health check for cache
func (rcm *RechargeCacheManager) HealthCheck(ctx context.Context) map[string]interface{} {
	result := map[string]interface{}{
		"healthy": false,
		"checks":  make(map[string]interface{}),
	}

	// Test basic connectivity
	if err := rcm.cache.Ping(); err != nil {
		result["checks"]["connectivity"] = map[string]interface{}{
			"status": "failed",
			"error":  err.Error(),
		}
		return result
	}

	result["checks"]["connectivity"] = map[string]interface{}{
		"status": "passed",
	}

	// Test basic operations
	testKey := fmt.Sprintf("recharge:health_check:%d", time.Now().Unix())
	testValue := "test"

	if err := rcm.cache.Set(testKey, testValue, 10*time.Second); err != nil {
		result["checks"]["write"] = map[string]interface{}{
			"status": "failed",
			"error":  err.Error(),
		}
		return result
	}

	var retrievedValue string
	if err := rcm.cache.Get(testKey, &retrievedValue); err != nil {
		result["checks"]["read"] = map[string]interface{}{
			"status": "failed",
			"error":  err.Error(),
		}
		return result
	}

	result["checks"]["read"] = map[string]interface{}{
		"status": "passed",
	}

	// Cleanup test key
	rcm.cache.Delete(testKey)

	result["healthy"] = true
	return result
}
package cache

import (
	"crypto/md5"
	"fmt"
	"strings"
	"time"
)

// QueryResult represents a cached query result
type QueryResult struct {
	Data      interface{} `json:"data"`
	Count     int64       `json:"count,omitempty"`
	CachedAt  time.Time   `json:"cached_at"`
	ExpiresAt time.Time   `json:"expires_at"`
}

// QueryOptimizer provides database query caching and optimization
type QueryOptimizer struct {
	cache    Cache
	enabled  bool
	defaultTTL time.Duration
}

// NewQueryOptimizer creates a new query optimizer
func NewQueryOptimizer(cache Cache, enabled bool, defaultTTL time.Duration) *QueryOptimizer {
	if defaultTTL == 0 {
		defaultTTL = MediumExpiration
	}
	
	return &QueryOptimizer{
		cache:      cache,
		enabled:    enabled,
		defaultTTL: defaultTTL,
	}
}

// QueryCacheKey generates a cache key for a query
func (qo *QueryOptimizer) QueryCacheKey(query string, args ...interface{}) string {
	// Create a unique key based on query and arguments
	keyData := fmt.Sprintf("%s:%v", query, args)
	hash := md5.Sum([]byte(keyData))
	return fmt.Sprintf("query:%x", hash)
}

// CacheQuery caches a query result
func (qo *QueryOptimizer) CacheQuery(query string, result interface{}, ttl time.Duration, args ...interface{}) error {
	if !qo.enabled {
		return nil
	}
	
	if ttl == 0 {
		ttl = qo.defaultTTL
	}
	
	key := qo.QueryCacheKey(query, args...)
	queryResult := QueryResult{
		Data:      result,
		CachedAt:  time.Now(),
		ExpiresAt: time.Now().Add(ttl),
	}
	
	return qo.cache.Set(key, queryResult, ttl)
}

// GetCachedQuery retrieves a cached query result
func (qo *QueryOptimizer) GetCachedQuery(query string, dest interface{}, args ...interface{}) (bool, error) {
	if !qo.enabled {
		return false, nil
	}
	
	key := qo.QueryCacheKey(query, args...)
	var queryResult QueryResult
	
	err := qo.cache.Get(key, &queryResult)
	if err != nil {
		if err == ErrCacheMiss {
			return false, nil
		}
		return false, err
	}
	
	// Check if result is still valid
	if time.Now().After(queryResult.ExpiresAt) {
		qo.cache.Delete(key)
		return false, nil
	}
	
	// Copy data to destination
	*dest.(*interface{}) = queryResult.Data
	return true, nil
}

// InvalidateQueryPattern invalidates queries matching a pattern
func (qo *QueryOptimizer) InvalidateQueryPattern(pattern string) error {
	if !qo.enabled {
		return nil
	}
	
	return qo.cache.DeletePattern(fmt.Sprintf("query:*%s*", pattern))
}

// QueryCacheConfig defines caching configuration for specific queries
type QueryCacheConfig struct {
	TTL     time.Duration
	Enabled bool
	Tags    []string // For group invalidation
}

// SmartQueryOptimizer provides intelligent query caching
type SmartQueryOptimizer struct {
	cache   Cache
	configs map[string]QueryCacheConfig
}

// NewSmartQueryOptimizer creates a new smart query optimizer
func NewSmartQueryOptimizer(cache Cache) *SmartQueryOptimizer {
	optimizer := &SmartQueryOptimizer{
		cache:   cache,
		configs: make(map[string]QueryCacheConfig),
	}
	
	// Register default configurations
	optimizer.registerDefaultConfigs()
	
	return optimizer
}

// registerDefaultConfigs registers default query cache configurations
func (sqo *SmartQueryOptimizer) registerDefaultConfigs() {
	// User queries - medium caching
	sqo.configs["SELECT * FROM users"] = QueryCacheConfig{
		TTL:     MediumExpiration,
		Enabled: true,
		Tags:    []string{"users"},
	}
	
	// Merchant queries - long caching
	sqo.configs["SELECT * FROM merchants"] = QueryCacheConfig{
		TTL:     LongExpiration,
		Enabled: true,
		Tags:    []string{"merchants"},
	}
	
	// Account queries - medium caching
	sqo.configs["SELECT * FROM receive_accounts"] = QueryCacheConfig{
		TTL:     MediumExpiration,
		Enabled: true,
		Tags:    []string{"accounts"},
	}
	
	// Report queries - short caching (data changes frequently)
	sqo.configs["SELECT COUNT(*) FROM recharge_orders"] = QueryCacheConfig{
		TTL:     ShortExpiration,
		Enabled: true,
		Tags:    []string{"reports", "orders"},
	}
	
	// Rotation rules - long caching
	sqo.configs["SELECT * FROM rotation_rules"] = QueryCacheConfig{
		TTL:     LongExpiration,
		Enabled: true,
		Tags:    []string{"rotation"},
	}
}

// SetQueryConfig sets cache configuration for a specific query pattern
func (sqo *SmartQueryOptimizer) SetQueryConfig(queryPattern string, config QueryCacheConfig) {
	sqo.configs[queryPattern] = config
}

// GetQueryConfig gets cache configuration for a query
func (sqo *SmartQueryOptimizer) GetQueryConfig(query string) (QueryCacheConfig, bool) {
	// Try exact match first
	if config, exists := sqo.configs[query]; exists {
		return config, true
	}
	
	// Try pattern matching
	for pattern, config := range sqo.configs {
		if sqo.matchesPattern(query, pattern) {
			return config, true
		}
	}
	
	// Return default config
	return QueryCacheConfig{
		TTL:     MediumExpiration,
		Enabled: true,
		Tags:    []string{},
	}, false
}

// matchesPattern checks if a query matches a pattern
func (sqo *SmartQueryOptimizer) matchesPattern(query, pattern string) bool {
	// Simple pattern matching - can be enhanced with regex
	query = strings.ToUpper(strings.TrimSpace(query))
	pattern = strings.ToUpper(strings.TrimSpace(pattern))
	
	// Check if query starts with the pattern
	return strings.HasPrefix(query, pattern)
}

// CacheSmartQuery caches a query using smart configuration
func (sqo *SmartQueryOptimizer) CacheSmartQuery(query string, result interface{}, args ...interface{}) error {
	config, _ := sqo.GetQueryConfig(query)
	
	if !config.Enabled {
		return nil
	}
	
	key := sqo.generateSmartKey(query, config.Tags, args...)
	queryResult := QueryResult{
		Data:      result,
		CachedAt:  time.Now(),
		ExpiresAt: time.Now().Add(config.TTL),
	}
	
	return sqo.cache.Set(key, queryResult, config.TTL)
}

// GetSmartCachedQuery retrieves a smartly cached query result
func (sqo *SmartQueryOptimizer) GetSmartCachedQuery(query string, dest interface{}, args ...interface{}) (bool, error) {
	config, _ := sqo.GetQueryConfig(query)
	
	if !config.Enabled {
		return false, nil
	}
	
	key := sqo.generateSmartKey(query, config.Tags, args...)
	var queryResult QueryResult
	
	err := sqo.cache.Get(key, &queryResult)
	if err != nil {
		if err == ErrCacheMiss {
			return false, nil
		}
		return false, err
	}
	
	// Check if result is still valid
	if time.Now().After(queryResult.ExpiresAt) {
		sqo.cache.Delete(key)
		return false, nil
	}
	
	// Copy data to destination
	*dest.(*interface{}) = queryResult.Data
	return true, nil
}

// generateSmartKey generates a cache key with tags
func (sqo *SmartQueryOptimizer) generateSmartKey(query string, tags []string, args ...interface{}) string {
	keyData := fmt.Sprintf("%s:%v", query, args)
	hash := md5.Sum([]byte(keyData))
	
	if len(tags) > 0 {
		tagStr := strings.Join(tags, ",")
		return fmt.Sprintf("smart_query:%s:%x", tagStr, hash)
	}
	
	return fmt.Sprintf("smart_query:%x", hash)
}

// InvalidateByTags invalidates all queries with specific tags
func (sqo *SmartQueryOptimizer) InvalidateByTags(tags ...string) error {
	for _, tag := range tags {
		pattern := fmt.Sprintf("smart_query:%s:*", tag)
		if err := sqo.cache.DeletePattern(pattern); err != nil {
			return err
		}
	}
	return nil
}

// GetCacheStats returns cache statistics
func (sqo *SmartQueryOptimizer) GetCacheStats() map[string]interface{} {
	// This would typically integrate with Redis INFO command
	// For now, return basic stats structure
	return map[string]interface{}{
		"enabled":        true,
		"total_configs":  len(sqo.configs),
		"default_ttl":    MediumExpiration.String(),
	}
}
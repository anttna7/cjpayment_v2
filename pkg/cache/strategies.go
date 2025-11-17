package cache

import (
	"context"
	"fmt"
	"time"
)

// CacheStrategy defines different caching strategies
type CacheStrategy string

const (
	// WriteThrough writes to cache and database simultaneously
	WriteThrough CacheStrategy = "write_through"
	// WriteBack writes to cache immediately, database later
	WriteBack CacheStrategy = "write_back"
	// WriteAround writes to database, invalidates cache
	WriteAround CacheStrategy = "write_around"
	// ReadThrough reads from cache, falls back to database
	ReadThrough CacheStrategy = "read_through"
	// CacheAside application manages cache and database separately
	CacheAside CacheStrategy = "cache_aside"
)

// CacheConfig holds cache configuration for different data types
type CacheConfig struct {
	Strategy CacheStrategy
	TTL      time.Duration
	Prefix   string
}

// DefaultCacheConfigs returns default cache configurations for different data types
func DefaultCacheConfigs() map[string]CacheConfig {
	return map[string]CacheConfig{
		"accounts": {
			Strategy: ReadThrough,
			TTL:      10 * time.Minute,
			Prefix:   "acc:",
		},
		"merchants": {
			Strategy: ReadThrough,
			TTL:      30 * time.Minute,
			Prefix:   "mer:",
		},
		"users": {
			Strategy: ReadThrough,
			TTL:      15 * time.Minute,
			Prefix:   "usr:",
		},
		"reports": {
			Strategy: CacheAside,
			TTL:      1 * time.Hour,
			Prefix:   "rpt:",
		},
		"sessions": {
			Strategy: WriteThrough,
			TTL:      2 * time.Hour,
			Prefix:   "ses:",
		},
		"rate_limits": {
			Strategy: WriteThrough,
			TTL:      1 * time.Minute,
			Prefix:   "rl:",
		},
		"notifications": {
			Strategy: WriteAround,
			TTL:      5 * time.Minute,
			Prefix:   "not:",
		},
	}
}

// CacheManager manages different cache strategies
type CacheManager struct {
	client  *RedisClient
	configs map[string]CacheConfig
}

// NewCacheManager creates a new cache manager
func NewCacheManager(client *RedisClient, configs map[string]CacheConfig) *CacheManager {
	if configs == nil {
		configs = DefaultCacheConfigs()
	}
	
	return &CacheManager{
		client:  client,
		configs: configs,
	}
}

// GetConfig returns cache configuration for a data type
func (cm *CacheManager) GetConfig(dataType string) (CacheConfig, bool) {
	config, exists := cm.configs[dataType]
	return config, exists
}

// SetConfig sets cache configuration for a data type
func (cm *CacheManager) SetConfig(dataType string, config CacheConfig) {
	cm.configs[dataType] = config
}

// GenerateKey generates a cache key with prefix
func (cm *CacheManager) GenerateKey(dataType, identifier string) string {
	config, exists := cm.configs[dataType]
	if !exists {
		return fmt.Sprintf("default:%s", identifier)
	}
	return fmt.Sprintf("%s%s", config.Prefix, identifier)
}

// Get retrieves data from cache with strategy-aware logic
func (cm *CacheManager) Get(ctx context.Context, dataType, identifier string, dest interface{}) error {
	key := cm.GenerateKey(dataType, identifier)
	return cm.client.Get(key, dest)
}

// Set stores data in cache with strategy-aware logic
func (cm *CacheManager) Set(ctx context.Context, dataType, identifier string, value interface{}) error {
	config, exists := cm.configs[dataType]
	if !exists {
		return fmt.Errorf("no cache configuration for data type: %s", dataType)
	}
	
	key := cm.GenerateKey(dataType, identifier)
	return cm.client.Set(key, value, config.TTL)
}

// Delete removes data from cache
func (cm *CacheManager) Delete(ctx context.Context, dataType, identifier string) error {
	key := cm.GenerateKey(dataType, identifier)
	return cm.client.Delete(key)
}

// InvalidatePattern invalidates all keys matching a pattern for a data type
func (cm *CacheManager) InvalidatePattern(ctx context.Context, dataType, pattern string) error {
	config, exists := cm.configs[dataType]
	if !exists {
		return fmt.Errorf("no cache configuration for data type: %s", dataType)
	}
	
	fullPattern := fmt.Sprintf("%s%s", config.Prefix, pattern)
	return cm.client.DeletePattern(fullPattern)
}

// Warm warms up the cache with frequently accessed data
func (cm *CacheManager) Warm(ctx context.Context, dataType string, warmupFunc func() (map[string]interface{}, error)) error {
	data, err := warmupFunc()
	if err != nil {
		return fmt.Errorf("warmup function failed: %w", err)
	}
	
	config, exists := cm.configs[dataType]
	if !exists {
		return fmt.Errorf("no cache configuration for data type: %s", dataType)
	}
	
	// Use pipeline for batch operations
	pipe := cm.client.Pipeline()
	
	for identifier, value := range data {
		key := cm.GenerateKey(dataType, identifier)
		pipe.Set(ctx, key, value, config.TTL)
	}
	
	_, err = cm.client.ExecutePipeline(pipe)
	return err
}

// GetStats returns cache statistics for a data type
func (cm *CacheManager) GetStats(dataType string) (map[string]interface{}, error) {
	config, exists := cm.configs[dataType]
	if !exists {
		return nil, fmt.Errorf("no cache configuration for data type: %s", dataType)
	}
	
	// Get keys matching the prefix
	pattern := config.Prefix + "*"
	keys, err := cm.client.client.Keys(cm.client.ctx, pattern).Result()
	if err != nil {
		return nil, err
	}
	
	stats := map[string]interface{}{
		"data_type":   dataType,
		"strategy":    string(config.Strategy),
		"ttl":         config.TTL.String(),
		"prefix":      config.Prefix,
		"key_count":   len(keys),
		"total_size":  0, // Would need to calculate actual size
	}
	
	return stats, nil
}

// GetAllStats returns cache statistics for all data types
func (cm *CacheManager) GetAllStats() map[string]interface{} {
	allStats := make(map[string]interface{})
	
	for dataType := range cm.configs {
		stats, err := cm.GetStats(dataType)
		if err == nil {
			allStats[dataType] = stats
		}
	}
	
	// Add overall Redis metrics
	allStats["redis"] = cm.client.GetMetrics()
	
	return allStats
}

// Cleanup removes expired keys and performs maintenance
func (cm *CacheManager) Cleanup(ctx context.Context) error {
	// This would typically be handled by Redis automatically,
	// but we can implement custom cleanup logic here
	
	for dataType, config := range cm.configs {
		// Example: cleanup old session data
		if dataType == "sessions" {
			pattern := config.Prefix + "*"
			keys, err := cm.client.client.Keys(ctx, pattern).Result()
			if err != nil {
				continue
			}
			
			// Check TTL for each key and remove if needed
			for _, key := range keys {
				ttl, err := cm.client.TTL(key)
				if err != nil {
					continue
				}
				
				// If TTL is very short, let it expire naturally
				// If TTL is negative (no expiry set), set one
				if ttl < 0 {
					cm.client.Expire(key, config.TTL)
				}
			}
		}
	}
	
	return nil
}

// RefreshTTL refreshes the TTL for a cached item
func (cm *CacheManager) RefreshTTL(ctx context.Context, dataType, identifier string) error {
	config, exists := cm.configs[dataType]
	if !exists {
		return fmt.Errorf("no cache configuration for data type: %s", dataType)
	}
	
	key := cm.GenerateKey(dataType, identifier)
	return cm.client.Expire(key, config.TTL)
}

// Touch updates the access time for a cached item (useful for LRU)
func (cm *CacheManager) Touch(ctx context.Context, dataType, identifier string) error {
	key := cm.GenerateKey(dataType, identifier)
	
	// Check if key exists
	exists, err := cm.client.Exists(key)
	if err != nil {
		return err
	}
	
	if exists {
		// Refresh TTL to simulate access
		return cm.RefreshTTL(ctx, dataType, identifier)
	}
	
	return nil
}
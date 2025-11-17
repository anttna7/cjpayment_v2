package cache

import (
	"fmt"
	"time"
)

// InitConfig holds cache initialization configuration
type InitConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	
	// Connection pool settings
	PoolSize     int
	MinIdleConns int
	MaxRetries   int
	
	// Timeouts
	DialTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	
	// Cache settings
	DefaultTTL time.Duration
	Enabled    bool
}

// DefaultInitConfig returns default cache configuration
func DefaultInitConfig() InitConfig {
	return InitConfig{
		Host:         "localhost",
		Port:         6379,
		Password:     "",
		DB:           0,
		PoolSize:     10,
		MinIdleConns: 5,
		MaxRetries:   3,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		DefaultTTL:   MediumExpiration,
		Enabled:      true,
	}
}

// CacheSystem holds all cache components
type CacheSystem struct {
	Client          *RedisClient
	Manager         *CacheManager
	Invalidator     *CacheInvalidator
	QueryOptimizer  *SmartQueryOptimizer
	StrategyManager *CacheStrategyManager
	Warmup          *CacheWarmup
	Config          InitConfig
}

// InitializeCacheSystem initializes the complete cache system
func InitializeCacheSystem(config InitConfig) (*CacheSystem, error) {
	if !config.Enabled {
		return &CacheSystem{
			Config: config,
		}, nil
	}
	
	// Create Redis client
	client := NewRedisClient(config.Host, config.Port, config.Password, config.DB)
	
	// Test connection
	if err := client.Ping(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}
	
	// Create cache components
	manager := NewCacheManager(client)
	invalidator := NewCacheInvalidator(client)
	queryOptimizer := NewSmartQueryOptimizer(client)
	strategyManager := NewCacheStrategyManager()
	warmup := NewCacheWarmup(client)
	
	return &CacheSystem{
		Client:          client,
		Manager:         manager,
		Invalidator:     invalidator,
		QueryOptimizer:  queryOptimizer,
		StrategyManager: strategyManager,
		Warmup:          warmup,
		Config:          config,
	}, nil
}

// IsEnabled returns whether caching is enabled
func (cs *CacheSystem) IsEnabled() bool {
	return cs.Config.Enabled && cs.Client != nil
}

// GetClient returns the Redis client (can be nil if disabled)
func (cs *CacheSystem) GetClient() Cache {
	if !cs.IsEnabled() {
		return &NoOpCache{}
	}
	return cs.Client
}

// Close closes all cache connections
func (cs *CacheSystem) Close() error {
	if cs.Client != nil {
		return cs.Client.Close()
	}
	return nil
}

// WarmupCommonData pre-loads commonly accessed data
func (cs *CacheSystem) WarmupCommonData() error {
	if !cs.IsEnabled() {
		return nil
	}
	
	// This would typically load frequently accessed data
	// For now, we'll just return nil as the actual data loading
	// would depend on the specific repositories and services
	
	return nil
}

// GetStats returns cache system statistics
func (cs *CacheSystem) GetStats() map[string]interface{} {
	stats := map[string]interface{}{
		"enabled": cs.IsEnabled(),
		"config":  cs.Config,
	}
	
	if cs.IsEnabled() {
		stats["query_optimizer"] = cs.QueryOptimizer.GetCacheStats()
		// Add more stats as needed
	}
	
	return stats
}

// NoOpCache is a no-operation cache implementation for when caching is disabled
type NoOpCache struct{}

func (n *NoOpCache) Set(key string, value interface{}, expiration time.Duration) error {
	return nil
}

func (n *NoOpCache) Get(key string, dest interface{}) error {
	return ErrCacheMiss
}

func (n *NoOpCache) Delete(key string) error {
	return nil
}

func (n *NoOpCache) Exists(key string) (bool, error) {
	return false, nil
}

func (n *NoOpCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	return false, nil
}

func (n *NoOpCache) Increment(key string) (int64, error) {
	return 0, nil
}

func (n *NoOpCache) IncrementBy(key string, value int64) (int64, error) {
	return 0, nil
}

func (n *NoOpCache) Expire(key string, expiration time.Duration) error {
	return nil
}

func (n *NoOpCache) TTL(key string) (time.Duration, error) {
	return 0, nil
}

func (n *NoOpCache) HSet(key, field string, value interface{}) error {
	return nil
}

func (n *NoOpCache) HGet(key, field string, dest interface{}) error {
	return ErrCacheMiss
}

func (n *NoOpCache) HGetAll(key string) (map[string]string, error) {
	return make(map[string]string), nil
}

func (n *NoOpCache) HDel(key string, fields ...string) error {
	return nil
}

func (n *NoOpCache) DeletePattern(pattern string) error {
	return nil
}

func (n *NoOpCache) Ping() error {
	return nil
}

func (n *NoOpCache) Close() error {
	return nil
}
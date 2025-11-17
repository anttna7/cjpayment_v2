package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host               string
	Port               int
	Password           string
	DB                 int
	PoolSize           int
	MinIdleConns       int
	MaxRetries         int
	RetryDelay         time.Duration
	DialTimeout        time.Duration
	ReadTimeout        time.Duration
	WriteTimeout       time.Duration
	PoolTimeout        time.Duration
	IdleTimeout        time.Duration
	IdleCheckFrequency time.Duration
}

// RedisClient wraps redis client with additional functionality
type RedisClient struct {
	client  *redis.Client
	ctx     context.Context
	metrics *RedisMetrics
	config  RedisConfig
}

// RedisMetrics holds Redis performance metrics
type RedisMetrics struct {
	mu           sync.RWMutex
	HitCount     int64
	MissCount    int64
	ErrorCount   int64
	TotalOps     int64
	LastError    error
	LastErrorAt  time.Time
}

// GetHitRate returns cache hit rate
func (m *RedisMetrics) GetHitRate() float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	total := m.HitCount + m.MissCount
	if total == 0 {
		return 0
	}
	return float64(m.HitCount) / float64(total)
}

// RecordHit records a cache hit
func (m *RedisMetrics) RecordHit() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.HitCount++
	m.TotalOps++
}

// RecordMiss records a cache miss
func (m *RedisMetrics) RecordMiss() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.MissCount++
	m.TotalOps++
}

// RecordError records an error
func (m *RedisMetrics) RecordError(err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ErrorCount++
	m.TotalOps++
	m.LastError = err
	m.LastErrorAt = time.Now()
}

// NewRedisClient creates a new Redis client with enhanced configuration
func NewRedisClient(config RedisConfig) *RedisClient {
	rdb := redis.NewClient(&redis.Options{
		Addr:               fmt.Sprintf("%s:%d", config.Host, config.Port),
		Password:           config.Password,
		DB:                 config.DB,
		PoolSize:           config.PoolSize,
		MinIdleConns:       config.MinIdleConns,
		MaxRetries:         config.MaxRetries,
		MinRetryBackoff:    config.RetryDelay,
		MaxRetryBackoff:    config.RetryDelay * 3,
		DialTimeout:        config.DialTimeout,
		ReadTimeout:        config.ReadTimeout,
		WriteTimeout:       config.WriteTimeout,
		PoolTimeout:        config.PoolTimeout,
		IdleTimeout:        config.IdleTimeout,
		IdleCheckFrequency: config.IdleCheckFrequency,
	})

	return &RedisClient{
		client:  rdb,
		ctx:     context.Background(),
		metrics: &RedisMetrics{},
		config:  config,
	}
}

// NewRedisClientSimple creates a Redis client with basic configuration (for backward compatibility)
func NewRedisClientSimple(host string, port int, password string, db int) *RedisClient {
	config := RedisConfig{
		Host:               host,
		Port:               port,
		Password:           password,
		DB:                 db,
		PoolSize:           10,
		MinIdleConns:       2,
		MaxRetries:         3,
		RetryDelay:         100 * time.Millisecond,
		DialTimeout:        5 * time.Second,
		ReadTimeout:        3 * time.Second,
		WriteTimeout:       3 * time.Second,
		PoolTimeout:        4 * time.Second,
		IdleTimeout:        300 * time.Second,
		IdleCheckFrequency: 60 * time.Second,
	}
	
	return NewRedisClient(config)
}

// Ping tests the connection to Redis
func (r *RedisClient) Ping() error {
	return r.client.Ping(r.ctx).Err()
}

// Set stores a key-value pair with expiration
func (r *RedisClient) Set(key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}
	
	return r.client.Set(r.ctx, key, data, expiration).Err()
}

// Get retrieves a value by key
func (r *RedisClient) Get(key string, dest interface{}) error {
	val, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			r.metrics.RecordMiss()
			return ErrCacheMiss
		}
		r.metrics.RecordError(err)
		return fmt.Errorf("failed to get key %s: %w", key, err)
	}

	r.metrics.RecordHit()
	
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		r.metrics.RecordError(err)
		return fmt.Errorf("failed to unmarshal value: %w", err)
	}

	return nil
}

// Delete removes a key from cache
func (r *RedisClient) Delete(key string) error {
	return r.client.Del(r.ctx, key).Err()
}

// DeletePattern removes all keys matching a pattern
func (r *RedisClient) DeletePattern(pattern string) error {
	keys, err := r.client.Keys(r.ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get keys for pattern %s: %w", pattern, err)
	}

	if len(keys) > 0 {
		return r.client.Del(r.ctx, keys...).Err()
	}

	return nil
}

// Exists checks if a key exists
func (r *RedisClient) Exists(key string) (bool, error) {
	count, err := r.client.Exists(r.ctx, key).Result()
	return count > 0, err
}

// SetNX sets a key only if it doesn't exist (atomic operation)
func (r *RedisClient) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal value: %w", err)
	}
	
	return r.client.SetNX(r.ctx, key, data, expiration).Result()
}

// Increment atomically increments a key
func (r *RedisClient) Increment(key string) (int64, error) {
	return r.client.Incr(r.ctx, key).Result()
}

// IncrementBy atomically increments a key by a specific amount
func (r *RedisClient) IncrementBy(key string, value int64) (int64, error) {
	return r.client.IncrBy(r.ctx, key, value).Result()
}

// Expire sets expiration for a key
func (r *RedisClient) Expire(key string, expiration time.Duration) error {
	return r.client.Expire(r.ctx, key, expiration).Err()
}

// TTL returns the time to live for a key
func (r *RedisClient) TTL(key string) (time.Duration, error) {
	return r.client.TTL(r.ctx, key).Result()
}

// HSet sets a field in a hash
func (r *RedisClient) HSet(key, field string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}
	
	return r.client.HSet(r.ctx, key, field, data).Err()
}

// HGet gets a field from a hash
func (r *RedisClient) HGet(key, field string, dest interface{}) error {
	val, err := r.client.HGet(r.ctx, key, field).Result()
	if err != nil {
		if err == redis.Nil {
			return ErrCacheMiss
		}
		return fmt.Errorf("failed to get hash field %s:%s: %w", key, field, err)
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return fmt.Errorf("failed to unmarshal value: %w", err)
	}

	return nil
}

// HGetAll gets all fields from a hash
func (r *RedisClient) HGetAll(key string) (map[string]string, error) {
	return r.client.HGetAll(r.ctx, key).Result()
}

// HDel deletes fields from a hash
func (r *RedisClient) HDel(key string, fields ...string) error {
	return r.client.HDel(r.ctx, key, fields...).Err()
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	return r.client.Close()
}

// Pipeline creates a new pipeline for batch operations
func (r *RedisClient) Pipeline() redis.Pipeliner {
	return r.client.Pipeline()
}

// ExecutePipeline executes a pipeline
func (r *RedisClient) ExecutePipeline(pipe redis.Pipeliner) ([]redis.Cmder, error) {
	return pipe.Exec(r.ctx)
}

// GetMetrics returns current Redis metrics
func (r *RedisClient) GetMetrics() map[string]interface{} {
	r.metrics.mu.RLock()
	defer r.metrics.mu.RUnlock()
	
	stats := r.client.PoolStats()
	
	return map[string]interface{}{
		"hit_count":           r.metrics.HitCount,
		"miss_count":          r.metrics.MissCount,
		"error_count":         r.metrics.ErrorCount,
		"total_operations":    r.metrics.TotalOps,
		"hit_rate":           r.metrics.GetHitRate(),
		"pool_hits":          stats.Hits,
		"pool_misses":        stats.Misses,
		"pool_timeouts":      stats.Timeouts,
		"pool_total_conns":   stats.TotalConns,
		"pool_idle_conns":    stats.IdleConns,
		"pool_stale_conns":   stats.StaleConns,
		"last_error":         r.getLastErrorString(),
		"last_error_at":      r.metrics.LastErrorAt.Format(time.RFC3339),
	}
}

// getLastErrorString returns the last error as string
func (r *RedisClient) getLastErrorString() string {
	if r.metrics.LastError != nil {
		return r.metrics.LastError.Error()
	}
	return ""
}

// HealthCheck performs a Redis health check
func (r *RedisClient) HealthCheck() map[string]interface{} {
	start := time.Now()
	
	result := map[string]interface{}{
		"healthy":      false,
		"response_time": "",
		"error":        "",
		"timestamp":    start.Format(time.RFC3339),
	}
	
	// Test basic connectivity
	err := r.Ping()
	responseTime := time.Since(start)
	result["response_time"] = responseTime.String()
	
	if err != nil {
		result["error"] = err.Error()
		return result
	}
	
	// Test basic operations
	testKey := "health_check_" + fmt.Sprintf("%d", start.Unix())
	err = r.Set(testKey, "test", 10*time.Second)
	if err != nil {
		result["error"] = fmt.Sprintf("set operation failed: %v", err)
		return result
	}
	
	var testValue string
	err = r.Get(testKey, &testValue)
	if err != nil {
		result["error"] = fmt.Sprintf("get operation failed: %v", err)
		return result
	}
	
	// Cleanup test key
	r.Delete(testKey)
	
	result["healthy"] = true
	return result
}

// GetConnectionStats returns Redis connection statistics
func (r *RedisClient) GetConnectionStats() map[string]interface{} {
	stats := r.client.PoolStats()
	
	return map[string]interface{}{
		"pool_hits":        stats.Hits,
		"pool_misses":      stats.Misses,
		"pool_timeouts":    stats.Timeouts,
		"total_conns":      stats.TotalConns,
		"idle_conns":       stats.IdleConns,
		"stale_conns":      stats.StaleConns,
		"pool_size":        r.config.PoolSize,
		"min_idle_conns":   r.config.MinIdleConns,
	}
}

// FlushDB flushes the current database (use with caution)
func (r *RedisClient) FlushDB() error {
	return r.client.FlushDB(r.ctx).Err()
}

// Info returns Redis server information
func (r *RedisClient) Info(section ...string) (string, error) {
	return r.client.Info(r.ctx, section...).Result()
}

// ConfigGet gets Redis configuration
func (r *RedisClient) ConfigGet(parameter string) ([]interface{}, error) {
	return r.client.ConfigGet(r.ctx, parameter).Result()
}
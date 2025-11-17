package service

import (
	"encoding/json"
	"sync"
	"time"
)

// InMemoryMatchingCache implements MatchingCache using in-memory storage
type InMemoryMatchingCache struct {
	cache map[string]*cacheEntry
	mutex sync.RWMutex
}

type cacheEntry struct {
	result    *MatchResult
	expiresAt time.Time
}

// NewInMemoryMatchingCache creates a new in-memory matching cache
func NewInMemoryMatchingCache() *InMemoryMatchingCache {
	cache := &InMemoryMatchingCache{
		cache: make(map[string]*cacheEntry),
	}
	
	// Start cleanup goroutine
	go cache.cleanupExpired()
	
	return cache
}

// Get retrieves a cached result
func (c *InMemoryMatchingCache) Get(key string) (*MatchResult, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	entry, exists := c.cache[key]
	if !exists {
		return nil, false
	}
	
	// Check if expired
	if time.Now().After(entry.expiresAt) {
		// Remove expired entry
		delete(c.cache, key)
		return nil, false
	}
	
	// Deep copy the result to avoid mutation
	resultCopy := c.deepCopyResult(entry.result)
	return resultCopy, true
}

// Set stores a result in the cache
func (c *InMemoryMatchingCache) Set(key string, result *MatchResult, ttl time.Duration) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	// Deep copy the result to avoid external mutations
	resultCopy := c.deepCopyResult(result)
	
	c.cache[key] = &cacheEntry{
		result:    resultCopy,
		expiresAt: time.Now().Add(ttl),
	}
}

// Clear removes all cached entries
func (c *InMemoryMatchingCache) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	c.cache = make(map[string]*cacheEntry)
}

// cleanupExpired removes expired entries periodically
func (c *InMemoryMatchingCache) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		c.mutex.Lock()
		now := time.Now()
		for key, entry := range c.cache {
			if now.After(entry.expiresAt) {
				delete(c.cache, key)
			}
		}
		c.mutex.Unlock()
	}
}

// deepCopyResult creates a deep copy of a MatchResult
func (c *InMemoryMatchingCache) deepCopyResult(result *MatchResult) *MatchResult {
	// Use JSON marshaling/unmarshaling for deep copy
	// This is not the most efficient method but it's simple and safe
	data, err := json.Marshal(result)
	if err != nil {
		return result // Return original if copy fails
	}
	
	var copy MatchResult
	if err := json.Unmarshal(data, &copy); err != nil {
		return result // Return original if copy fails
	}
	
	return &copy
}

// GetStats returns cache statistics
func (c *InMemoryMatchingCache) GetStats() CacheStats {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	now := time.Now()
	activeEntries := 0
	expiredEntries := 0
	
	for _, entry := range c.cache {
		if now.After(entry.expiresAt) {
			expiredEntries++
		} else {
			activeEntries++
		}
	}
	
	return CacheStats{
		TotalEntries:   len(c.cache),
		ActiveEntries:  activeEntries,
		ExpiredEntries: expiredEntries,
	}
}

// CacheStats represents cache statistics
type CacheStats struct {
	TotalEntries   int `json:"total_entries"`
	ActiveEntries  int `json:"active_entries"`
	ExpiredEntries int `json:"expired_entries"`
}

// RedisMatchingCache implements MatchingCache using Redis
type RedisMatchingCache struct {
	// This would be implemented with a Redis client
	// For now, we'll provide the interface structure
}

// NewRedisMatchingCache creates a new Redis-based matching cache
func NewRedisMatchingCache(redisAddr, password string, db int) *RedisMatchingCache {
	// Implementation would initialize Redis client
	return &RedisMatchingCache{}
}

// Get retrieves a cached result from Redis
func (c *RedisMatchingCache) Get(key string) (*MatchResult, bool) {
	// Implementation would:
	// 1. Get JSON data from Redis
	// 2. Unmarshal to MatchResult
	// 3. Return result and existence flag
	return nil, false
}

// Set stores a result in Redis cache
func (c *RedisMatchingCache) Set(key string, result *MatchResult, ttl time.Duration) {
	// Implementation would:
	// 1. Marshal result to JSON
	// 2. Store in Redis with TTL
}

// Clear removes all cached entries from Redis
func (c *RedisMatchingCache) Clear() {
	// Implementation would clear all matching cache keys
}

// CacheMetrics provides cache performance metrics
type CacheMetrics struct {
	HitCount    int64   `json:"hit_count"`
	MissCount   int64   `json:"miss_count"`
	HitRate     float64 `json:"hit_rate"`
	TotalSize   int64   `json:"total_size"`
	LastCleanup time.Time `json:"last_cleanup"`
}

// MetricsCollector collects cache metrics
type MetricsCollector struct {
	hitCount  int64
	missCount int64
	mutex     sync.RWMutex
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{}
}

// RecordHit records a cache hit
func (m *MetricsCollector) RecordHit() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.hitCount++
}

// RecordMiss records a cache miss
func (m *MetricsCollector) RecordMiss() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.missCount++
}

// GetMetrics returns current metrics
func (m *MetricsCollector) GetMetrics() CacheMetrics {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	total := m.hitCount + m.missCount
	hitRate := 0.0
	if total > 0 {
		hitRate = float64(m.hitCount) / float64(total)
	}
	
	return CacheMetrics{
		HitCount:  m.hitCount,
		MissCount: m.missCount,
		HitRate:   hitRate,
	}
}

// Reset resets the metrics
func (m *MetricsCollector) Reset() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.hitCount = 0
	m.missCount = 0
}
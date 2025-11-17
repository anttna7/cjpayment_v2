package cache

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// MemoryCache implements Cache interface using in-memory storage
type MemoryCache struct {
	data map[string]*memoryCacheItem
	mu   sync.RWMutex
}

// memoryCacheItem represents a cached item with expiration
type memoryCacheItem struct {
	Value      []byte
	Expiration time.Time
	HasExpiry  bool
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		data: make(map[string]*memoryCacheItem),
	}
	
	// Start cleanup goroutine
	go cache.cleanup()
	
	return cache
}

// Set stores a key-value pair with expiration
func (mc *MemoryCache) Set(key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	mc.mu.Lock()
	defer mc.mu.Unlock()

	item := &memoryCacheItem{
		Value:     data,
		HasExpiry: expiration > 0,
	}

	if expiration > 0 {
		item.Expiration = time.Now().Add(expiration)
	}

	mc.data[key] = item
	return nil
}

// Get retrieves a value by key
func (mc *MemoryCache) Get(key string, dest interface{}) error {
	mc.mu.RLock()
	item, exists := mc.data[key]
	mc.mu.RUnlock()

	if !exists {
		return ErrCacheMiss
	}

	// Check expiration
	if item.HasExpiry && time.Now().After(item.Expiration) {
		mc.mu.Lock()
		delete(mc.data, key)
		mc.mu.Unlock()
		return ErrCacheMiss
	}

	if err := json.Unmarshal(item.Value, dest); err != nil {
		return fmt.Errorf("failed to unmarshal value: %w", err)
	}

	return nil
}

// Delete removes a key from cache
func (mc *MemoryCache) Delete(key string) error {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	delete(mc.data, key)
	return nil
}

// Exists checks if a key exists
func (mc *MemoryCache) Exists(key string) (bool, error) {
	mc.mu.RLock()
	item, exists := mc.data[key]
	mc.mu.RUnlock()

	if !exists {
		return false, nil
	}

	// Check expiration
	if item.HasExpiry && time.Now().After(item.Expiration) {
		mc.mu.Lock()
		delete(mc.data, key)
		mc.mu.Unlock()
		return false, nil
	}

	return true, nil
}

// SetNX sets a key only if it doesn't exist
func (mc *MemoryCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	// Check if key exists and is not expired
	if item, exists := mc.data[key]; exists {
		if !item.HasExpiry || time.Now().Before(item.Expiration) {
			return false, nil // Key exists
		}
		// Key is expired, remove it
		delete(mc.data, key)
	}

	// Set the key
	data, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal value: %w", err)
	}

	item := &memoryCacheItem{
		Value:     data,
		HasExpiry: expiration > 0,
	}

	if expiration > 0 {
		item.Expiration = time.Now().Add(expiration)
	}

	mc.data[key] = item
	return true, nil
}

// Increment atomically increments a key
func (mc *MemoryCache) Increment(key string) (int64, error) {
	return mc.IncrementBy(key, 1)
}

// IncrementBy atomically increments a key by a specific amount
func (mc *MemoryCache) IncrementBy(key string, value int64) (int64, error) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	var currentValue int64 = 0

	if item, exists := mc.data[key]; exists {
		// Check expiration
		if item.HasExpiry && time.Now().After(item.Expiration) {
			delete(mc.data, key)
		} else {
			// Try to unmarshal current value
			if err := json.Unmarshal(item.Value, &currentValue); err != nil {
				currentValue = 0
			}
		}
	}

	newValue := currentValue + value

	// Store the new value
	data, err := json.Marshal(newValue)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal value: %w", err)
	}

	mc.data[key] = &memoryCacheItem{
		Value:     data,
		HasExpiry: false, // Counters typically don't expire
	}

	return newValue, nil
}

// Expire sets expiration for a key
func (mc *MemoryCache) Expire(key string, expiration time.Duration) error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	item, exists := mc.data[key]
	if !exists {
		return fmt.Errorf("key does not exist")
	}

	item.HasExpiry = expiration > 0
	if expiration > 0 {
		item.Expiration = time.Now().Add(expiration)
	}

	return nil
}

// TTL returns the time to live for a key
func (mc *MemoryCache) TTL(key string) (time.Duration, error) {
	mc.mu.RLock()
	item, exists := mc.data[key]
	mc.mu.RUnlock()

	if !exists {
		return -2 * time.Second, nil // Key does not exist
	}

	if !item.HasExpiry {
		return -1 * time.Second, nil // Key exists but has no expiry
	}

	ttl := time.Until(item.Expiration)
	if ttl <= 0 {
		mc.mu.Lock()
		delete(mc.data, key)
		mc.mu.Unlock()
		return -2 * time.Second, nil // Key expired
	}

	return ttl, nil
}

// HSet sets a field in a hash (simplified implementation)
func (mc *MemoryCache) HSet(key, field string, value interface{}) error {
	hashKey := fmt.Sprintf("%s:%s", key, field)
	return mc.Set(hashKey, value, 0) // No expiration for hash fields
}

// HGet gets a field from a hash
func (mc *MemoryCache) HGet(key, field string, dest interface{}) error {
	hashKey := fmt.Sprintf("%s:%s", key, field)
	return mc.Get(hashKey, dest)
}

// HGetAll gets all fields from a hash (simplified implementation)
func (mc *MemoryCache) HGetAll(key string) (map[string]string, error) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	result := make(map[string]string)
	prefix := key + ":"

	for k, item := range mc.data {
		if len(k) > len(prefix) && k[:len(prefix)] == prefix {
			// Check expiration
			if item.HasExpiry && time.Now().After(item.Expiration) {
				continue
			}

			field := k[len(prefix):]
			result[field] = string(item.Value)
		}
	}

	return result, nil
}

// HDel deletes fields from a hash
func (mc *MemoryCache) HDel(key string, fields ...string) error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	for _, field := range fields {
		hashKey := fmt.Sprintf("%s:%s", key, field)
		delete(mc.data, hashKey)
	}

	return nil
}

// DeletePattern removes all keys matching a pattern (simplified glob matching)
func (mc *MemoryCache) DeletePattern(pattern string) error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	keysToDelete := []string{}

	for key := range mc.data {
		if matchPattern(pattern, key) {
			keysToDelete = append(keysToDelete, key)
		}
	}

	for _, key := range keysToDelete {
		delete(mc.data, key)
	}

	return nil
}

// matchPattern performs simple glob pattern matching
func matchPattern(pattern, str string) bool {
	if pattern == "*" {
		return true
	}

	if pattern == str {
		return true
	}

	// Simple prefix matching for patterns ending with *
	if len(pattern) > 0 && pattern[len(pattern)-1] == '*' {
		prefix := pattern[:len(pattern)-1]
		return len(str) >= len(prefix) && str[:len(prefix)] == prefix
	}

	// Simple suffix matching for patterns starting with *
	if len(pattern) > 0 && pattern[0] == '*' {
		suffix := pattern[1:]
		return len(str) >= len(suffix) && str[len(str)-len(suffix):] == suffix
	}

	return false
}

// Ping tests the cache (always returns nil for memory cache)
func (mc *MemoryCache) Ping() error {
	return nil
}

// Close closes the cache (cleanup for memory cache)
func (mc *MemoryCache) Close() error {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.data = make(map[string]*memoryCacheItem)
	return nil
}

// cleanup removes expired items periodically
func (mc *MemoryCache) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		mc.mu.Lock()
		now := time.Now()
		for key, item := range mc.data {
			if item.HasExpiry && now.After(item.Expiration) {
				delete(mc.data, key)
			}
		}
		mc.mu.Unlock()
	}
}

// GetStats returns memory cache statistics
func (mc *MemoryCache) GetStats() map[string]interface{} {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	totalSize := 0
	expiredCount := 0
	now := time.Now()

	for _, item := range mc.data {
		totalSize += len(item.Value)
		if item.HasExpiry && now.After(item.Expiration) {
			expiredCount++
		}
	}

	return map[string]interface{}{
		"type":          "memory",
		"total_keys":    len(mc.data),
		"expired_keys":  expiredCount,
		"total_size":    totalSize,
		"hit_rate":      1.0, // Memory cache always hits if key exists
	}
}

// FlushAll removes all keys from the cache
func (mc *MemoryCache) FlushAll() error {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.data = make(map[string]*memoryCacheItem)
	return nil
}
package cache

import (
	"context"
	"time"
)

// Cache interface for caching operations
type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
}

// MemoryCache is a simple in-memory cache implementation
type MemoryCache struct {
	data map[string]cacheItem
}

type cacheItem struct {
	value      string
	expiration time.Time
}

// NewMemoryCache creates a new memory cache
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		data: make(map[string]cacheItem),
	}
}

// Get retrieves a value from cache
func (mc *MemoryCache) Get(ctx context.Context, key string) (string, error) {
	item, exists := mc.data[key]
	if !exists {
		return "", nil
	}
	
	if time.Now().After(item.expiration) {
		delete(mc.data, key)
		return "", nil
	}
	
	return item.value, nil
}

// Set stores a value in cache
func (mc *MemoryCache) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	mc.data[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}
	return nil
}

// Delete removes a value from cache
func (mc *MemoryCache) Delete(ctx context.Context, key string) error {
	delete(mc.data, key)
	return nil
}
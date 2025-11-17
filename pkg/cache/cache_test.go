package cache

import (
	"testing"
	"time"
)

// MockCache implements Cache interface for testing
type MockCache struct {
	data map[string]interface{}
}

func NewMockCache() *MockCache {
	return &MockCache{
		data: make(map[string]interface{}),
	}
}

func (m *MockCache) Set(key string, value interface{}, expiration time.Duration) error {
	m.data[key] = value
	return nil
}

func (m *MockCache) Get(key string, dest interface{}) error {
	value, exists := m.data[key]
	if !exists {
		return ErrCacheMiss
	}
	
	// Simple type assertion for testing
	switch v := dest.(type) {
	case *string:
		if str, ok := value.(string); ok {
			*v = str
		}
	case *int:
		if i, ok := value.(int); ok {
			*v = i
		}
	}
	
	return nil
}

func (m *MockCache) Delete(key string) error {
	delete(m.data, key)
	return nil
}

func (m *MockCache) Exists(key string) (bool, error) {
	_, exists := m.data[key]
	return exists, nil
}

func (m *MockCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	if _, exists := m.data[key]; exists {
		return false, nil
	}
	m.data[key] = value
	return true, nil
}

func (m *MockCache) Increment(key string) (int64, error) {
	value, exists := m.data[key]
	if !exists {
		m.data[key] = int64(1)
		return 1, nil
	}
	
	if i, ok := value.(int64); ok {
		i++
		m.data[key] = i
		return i, nil
	}
	
	return 0, nil
}

func (m *MockCache) IncrementBy(key string, value int64) (int64, error) {
	existing, exists := m.data[key]
	if !exists {
		m.data[key] = value
		return value, nil
	}
	
	if i, ok := existing.(int64); ok {
		i += value
		m.data[key] = i
		return i, nil
	}
	
	return 0, nil
}

func (m *MockCache) Expire(key string, expiration time.Duration) error {
	return nil
}

func (m *MockCache) TTL(key string) (time.Duration, error) {
	return time.Hour, nil
}

func (m *MockCache) HSet(key, field string, value interface{}) error {
	hashKey := key + ":" + field
	m.data[hashKey] = value
	return nil
}

func (m *MockCache) HGet(key, field string, dest interface{}) error {
	hashKey := key + ":" + field
	return m.Get(hashKey, dest)
}

func (m *MockCache) HGetAll(key string) (map[string]string, error) {
	result := make(map[string]string)
	return result, nil
}

func (m *MockCache) HDel(key string, fields ...string) error {
	for _, field := range fields {
		hashKey := key + ":" + field
		delete(m.data, hashKey)
	}
	return nil
}

func (m *MockCache) DeletePattern(pattern string) error {
	// Simple pattern matching for testing
	for key := range m.data {
		if key == pattern || pattern == "*" {
			delete(m.data, key)
		}
	}
	return nil
}

func (m *MockCache) Ping() error {
	return nil
}

func (m *MockCache) Close() error {
	return nil
}

func TestCacheManager_GetOrSet(t *testing.T) {
	cache := NewMockCache()
	manager := NewCacheManager(cache)
	
	// Test cache miss and set
	var result string
	called := false
	err := manager.GetOrSet("test_key", &result, time.Hour, func() (interface{}, error) {
		called = true
		return "test_value", nil
	})
	
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	if !called {
		t.Error("Expected setter function to be called")
	}
	
	if result != "test_value" {
		t.Errorf("Expected 'test_value', got '%s'", result)
	}
	
	// Test cache hit
	var result2 string
	called2 := false
	err = manager.GetOrSet("test_key", &result2, time.Hour, func() (interface{}, error) {
		called2 = true
		return "new_value", nil
	})
	
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	if called2 {
		t.Error("Expected setter function not to be called on cache hit")
	}
	
	if result2 != "test_value" {
		t.Errorf("Expected 'test_value' from cache, got '%s'", result2)
	}
}

func TestCacheManager_CheckRateLimit(t *testing.T) {
	cache := NewMockCache()
	manager := NewCacheManager(cache)
	
	// Test within limit
	allowed, err := manager.CheckRateLimit("test_endpoint", "user1", 5)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if !allowed {
		t.Error("Expected request to be allowed")
	}
	
	// Test multiple requests
	for i := 0; i < 4; i++ {
		allowed, err = manager.CheckRateLimit("test_endpoint", "user1", 5)
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if !allowed {
			t.Errorf("Expected request %d to be allowed", i+2)
		}
	}
	
	// Test exceeding limit
	allowed, err = manager.CheckRateLimit("test_endpoint", "user1", 5)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if allowed {
		t.Error("Expected request to be denied after exceeding limit")
	}
}

func TestCacheInvalidator_InvalidateByEvent(t *testing.T) {
	cache := NewMockCache()
	invalidator := NewCacheInvalidator(cache)
	
	// Set some test data
	cache.Set("user:123", "test_user", time.Hour)
	cache.Set("user_perm:123", "test_permissions", time.Hour)
	
	// Test invalidation
	event := InvalidationEvent{
		Type:      "user",
		EntityID:  "123",
		Action:    "update",
		Timestamp: time.Now(),
	}
	
	err := invalidator.InvalidateByEvent(event)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	// Check that cache was invalidated
	var result string
	err = cache.Get("user:123", &result)
	if err != ErrCacheMiss {
		t.Error("Expected cache to be invalidated")
	}
}

func TestCacheStrategies(t *testing.T) {
	manager := NewCacheStrategyManager()
	
	// Test user strategy
	userStrategy := manager.GetStrategy("user")
	if userStrategy == nil {
		t.Error("Expected user strategy to exist")
	}
	
	key := userStrategy.GetKey("123")
	expectedKey := "user:123"
	if key != expectedKey {
		t.Errorf("Expected key '%s', got '%s'", expectedKey, key)
	}
	
	expiration := userStrategy.GetExpiration()
	if expiration != MediumExpiration {
		t.Errorf("Expected expiration %v, got %v", MediumExpiration, expiration)
	}
	
	shouldCache := userStrategy.ShouldCache("test_data")
	if !shouldCache {
		t.Error("Expected strategy to cache non-nil data")
	}
	
	shouldNotCache := userStrategy.ShouldCache(nil)
	if shouldNotCache {
		t.Error("Expected strategy not to cache nil data")
	}
}

func TestQueryOptimizer(t *testing.T) {
	cache := NewMockCache()
	optimizer := NewQueryOptimizer(cache, true, time.Hour)
	
	// Test query caching
	testData := "test_result"
	err := optimizer.CacheQuery("SELECT * FROM users", testData, time.Hour, "arg1", "arg2")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	// Test query retrieval
	var result interface{}
	found, err := optimizer.GetCachedQuery("SELECT * FROM users", &result, "arg1", "arg2")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if !found {
		t.Error("Expected to find cached query")
	}
}

func TestSmartQueryOptimizer(t *testing.T) {
	cache := NewMockCache()
	optimizer := NewSmartQueryOptimizer(cache)
	
	// Test configuration
	config, exists := optimizer.GetQueryConfig("SELECT * FROM users")
	if !exists {
		t.Error("Expected to find config for user query")
	}
	if !config.Enabled {
		t.Error("Expected user query config to be enabled")
	}
	if config.TTL != LongExpiration {
		t.Errorf("Expected TTL %v, got %v", LongExpiration, config.TTL)
	}
	
	// Test smart caching
	testData := "smart_result"
	err := optimizer.CacheSmartQuery("SELECT * FROM users", testData, "arg1")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	// Test smart retrieval
	var result interface{}
	found, err := optimizer.GetSmartCachedQuery("SELECT * FROM users", &result, "arg1")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if !found {
		t.Error("Expected to find smart cached query")
	}
}

func BenchmarkCacheSet(b *testing.B) {
	cache := NewMockCache()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Set("benchmark_key", "benchmark_value", time.Hour)
	}
}

func BenchmarkCacheGet(b *testing.B) {
	cache := NewMockCache()
	cache.Set("benchmark_key", "benchmark_value", time.Hour)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var result string
		cache.Get("benchmark_key", &result)
	}
}

func BenchmarkCacheManager_GetOrSet(b *testing.B) {
	cache := NewMockCache()
	manager := NewCacheManager(cache)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var result string
		manager.GetOrSet("benchmark_key", &result, time.Hour, func() (interface{}, error) {
			return "benchmark_value", nil
		})
	}
}
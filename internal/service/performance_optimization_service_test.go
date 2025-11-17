package service

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"cjpayment/pkg/cache"
)

// MockCache implements cache.Cache interface for testing
type MockCache struct {
	mock.Mock
	data map[string]interface{}
}

func NewMockCache() *MockCache {
	return &MockCache{
		data: make(map[string]interface{}),
	}
}

func (m *MockCache) Set(key string, value interface{}, expiration time.Duration) error {
	args := m.Called(key, value, expiration)
	if args.Error(0) == nil {
		m.data[key] = value
	}
	return args.Error(0)
}

func (m *MockCache) Get(key string, dest interface{}) error {
	args := m.Called(key, dest)
	if args.Error(0) == nil {
		if value, exists := m.data[key]; exists {
			// Simple copy for testing
			if ptr, ok := dest.(*interface{}); ok {
				*ptr = value
			}
		}
	}
	return args.Error(0)
}

func (m *MockCache) Delete(key string) error {
	args := m.Called(key)
	if args.Error(0) == nil {
		delete(m.data, key)
	}
	return args.Error(0)
}

func (m *MockCache) Exists(key string) (bool, error) {
	args := m.Called(key)
	_, exists := m.data[key]
	return exists, args.Error(1)
}

func (m *MockCache) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	args := m.Called(key, value, expiration)
	return args.Bool(0), args.Error(1)
}

func (m *MockCache) Increment(key string) (int64, error) {
	args := m.Called(key)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCache) IncrementBy(key string, value int64) (int64, error) {
	args := m.Called(key, value)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockCache) Expire(key string, expiration time.Duration) error {
	args := m.Called(key, expiration)
	return args.Error(0)
}

func (m *MockCache) TTL(key string) (time.Duration, error) {
	args := m.Called(key)
	return args.Get(0).(time.Duration), args.Error(1)
}

func (m *MockCache) HSet(key, field string, value interface{}) error {
	args := m.Called(key, field, value)
	return args.Error(0)
}

func (m *MockCache) HGet(key, field string, dest interface{}) error {
	args := m.Called(key, field, dest)
	return args.Error(0)
}

func (m *MockCache) HGetAll(key string) (map[string]string, error) {
	args := m.Called(key)
	return args.Get(0).(map[string]string), args.Error(1)
}

func (m *MockCache) HDel(key string, fields ...string) error {
	args := m.Called(key, fields)
	return args.Error(0)
}

func (m *MockCache) DeletePattern(pattern string) error {
	args := m.Called(pattern)
	return args.Error(0)
}

func (m *MockCache) Ping() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockCache) Close() error {
	args := m.Called()
	return args.Error(0)
}

func setupTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	return db
}

func TestNewPerformanceOptimizationService(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)

	assert.NotNil(t, service)
	assert.Equal(t, db, service.db)
	assert.Equal(t, mockCache, service.cache)
	assert.Equal(t, config, service.config)
	assert.NotNil(t, service.rechargeCache)
	assert.NotNil(t, service.queryOptimizer)
	assert.NotNil(t, service.connectionPool)
	assert.NotNil(t, service.performanceMonitor)
	assert.NotNil(t, service.performanceOptimizer)
}

func TestPerformanceOptimizationService_CacheOperations(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)
	ctx := context.Background()

	t.Run("CacheSet", func(t *testing.T) {
		key := "test_key"
		value := "test_value"
		ttl := 5 * time.Minute

		mockCache.On("Set", key, value, ttl).Return(nil)

		err := service.CacheSet(ctx, key, value, ttl)
		assert.NoError(t, err)
		mockCache.AssertExpectations(t)
	})

	t.Run("CacheGet", func(t *testing.T) {
		key := "test_key"
		var dest interface{}

		mockCache.On("Get", key, &dest).Return(nil)

		err := service.CacheGet(ctx, key, &dest)
		assert.NoError(t, err)
		mockCache.AssertExpectations(t)
	})

	t.Run("CacheDelete", func(t *testing.T) {
		key := "test_key"

		mockCache.On("Delete", key).Return(nil)

		err := service.CacheDelete(ctx, key)
		assert.NoError(t, err)
		mockCache.AssertExpectations(t)
	})
}

func TestPerformanceOptimizationService_CacheDisabled(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()
	config.EnableCaching = false

	service := NewPerformanceOptimizationService(db, mockCache, config)
	ctx := context.Background()

	t.Run("CacheSet with caching disabled", func(t *testing.T) {
		err := service.CacheSet(ctx, "key", "value", time.Minute)
		assert.NoError(t, err) // Should not error, just do nothing
	})

	t.Run("CacheGet with caching disabled", func(t *testing.T) {
		var dest interface{}
		err := service.CacheGet(ctx, "key", &dest)
		assert.Equal(t, cache.ErrCacheMiss, err)
	})
}

func TestPerformanceOptimizationService_OptimizedQueries(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)

	t.Run("OptimizedMerchantQuery", func(t *testing.T) {
		query := service.OptimizedMerchantQuery()
		assert.NotNil(t, query)
		// The query should be different from the original db instance
		// due to applied optimizations
	})

	t.Run("OptimizedAccountQuery", func(t *testing.T) {
		query := service.OptimizedAccountQuery()
		assert.NotNil(t, query)
	})

	t.Run("OptimizedOrderQuery", func(t *testing.T) {
		query := service.OptimizedOrderQuery()
		assert.NotNil(t, query)
	})
}

func TestPerformanceOptimizationService_OptimizedQueriesDisabled(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()
	config.EnableQueryOptimization = false

	service := NewPerformanceOptimizationService(db, mockCache, config)

	t.Run("OptimizedMerchantQuery with optimization disabled", func(t *testing.T) {
		query := service.OptimizedMerchantQuery()
		assert.Equal(t, db, query) // Should return original db
	})
}

func TestPerformanceOptimizationService_Metrics(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)

	t.Run("RecordRechargeOrder", func(t *testing.T) {
		duration := 100 * time.Millisecond
		// Should not panic
		service.RecordRechargeOrder(duration)
	})

	t.Run("RecordAccountMatching", func(t *testing.T) {
		duration := 50 * time.Millisecond
		success := true
		// Should not panic
		service.RecordAccountMatching(duration, success)
	})
}

func TestPerformanceOptimizationService_Stats(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)

	t.Run("GetCacheStats", func(t *testing.T) {
		stats := service.GetCacheStats()
		assert.NotNil(t, stats)
		assert.Contains(t, stats, "recharge_cache")
	})

	t.Run("GetConnectionPoolStats", func(t *testing.T) {
		stats := service.GetConnectionPoolStats()
		assert.NotNil(t, stats)
	})

	t.Run("GetSystemMetrics", func(t *testing.T) {
		metrics := service.GetSystemMetrics()
		assert.NotNil(t, metrics)
		assert.Contains(t, metrics, "timestamp")
		assert.Contains(t, metrics, "cache")
		assert.Contains(t, metrics, "connection_pool")
	})
}

func TestPerformanceOptimizationService_HealthCheck(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)

	health := service.HealthCheck()
	assert.NotNil(t, health)
	assert.Contains(t, health, "timestamp")
	assert.Contains(t, health, "overall")
	assert.Contains(t, health, "components")

	components := health["components"].(map[string]interface{})
	assert.Contains(t, components, "database")
	assert.Contains(t, components, "connection_pool")
}

func TestPerformanceOptimizationService_CacheInvalidation(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)
	ctx := context.Background()

	t.Run("InvalidateMerchantCache", func(t *testing.T) {
		merchantID := uint(1)
		err := service.InvalidateMerchantCache(ctx, merchantID)
		assert.NoError(t, err)
	})

	t.Run("InvalidateAccountCache", func(t *testing.T) {
		accountID := uint(1)
		err := service.InvalidateAccountCache(ctx, accountID)
		assert.NoError(t, err)
	})
}

func TestPerformanceOptimizationService_DisabledFeatures(t *testing.T) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := PerformanceOptimizationConfig{
		EnableCaching:           false,
		EnableQueryOptimization: false,
		EnableConnectionPooling: false,
		EnableMonitoring:        false,
	}

	service := NewPerformanceOptimizationService(db, mockCache, config)

	t.Run("GetCacheStats with caching disabled", func(t *testing.T) {
		stats := service.GetCacheStats()
		assert.Contains(t, stats, "error")
		assert.Equal(t, "Caching is disabled", stats["error"])
	})

	t.Run("GetConnectionPoolStats with pooling disabled", func(t *testing.T) {
		stats := service.GetConnectionPoolStats()
		assert.Contains(t, stats, "error")
		assert.Equal(t, "Connection pooling is disabled", stats["error"])
	})

	t.Run("GetPerformanceReport with monitoring disabled", func(t *testing.T) {
		report := service.GetPerformanceReport()
		if reportMap, ok := report.(map[string]interface{}); ok {
			assert.Contains(t, reportMap, "error")
			assert.Equal(t, "Performance monitoring is disabled", reportMap["error"])
		}
	})
}

// Benchmark tests
func BenchmarkPerformanceOptimizationService_CacheOperations(b *testing.B) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)
	ctx := context.Background()

	// Setup mock expectations
	mockCache.On("Set", mock.AnythingOfType("string"), mock.Anything, mock.AnythingOfType("time.Duration")).Return(nil)
	mockCache.On("Get", mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockCache.On("Delete", mock.AnythingOfType("string")).Return(nil)

	b.Run("CacheSet", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.CacheSet(ctx, "benchmark_key", "benchmark_value", time.Minute)
		}
	})

	b.Run("CacheGet", func(b *testing.B) {
		var dest interface{}
		for i := 0; i < b.N; i++ {
			service.CacheGet(ctx, "benchmark_key", &dest)
		}
	})

	b.Run("CacheDelete", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.CacheDelete(ctx, "benchmark_key")
		}
	})
}

func BenchmarkPerformanceOptimizationService_OptimizedQueries(b *testing.B) {
	db := setupTestDB()
	mockCache := NewMockCache()
	config := DefaultPerformanceOptimizationConfig()

	service := NewPerformanceOptimizationService(db, mockCache, config)

	b.Run("OptimizedMerchantQuery", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.OptimizedMerchantQuery()
		}
	})

	b.Run("OptimizedAccountQuery", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.OptimizedAccountQuery()
		}
	})

	b.Run("OptimizedOrderQuery", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.OptimizedOrderQuery()
		}
	})
}

// Integration test with real cache (if available)
func TestPerformanceOptimizationService_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	db := setupTestDB()
	
	// Try to create a real Redis client for integration testing
	// If Redis is not available, skip the test
	redisConfig := cache.RedisConfig{
		Host:               "localhost",
		Port:               6379,
		Password:           "",
		DB:                 0,
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

	redisClient := cache.NewRedisClient(redisConfig)
	if err := redisClient.Ping(); err != nil {
		t.Skip("Redis not available, skipping integration test")
	}
	defer redisClient.Close()

	config := DefaultPerformanceOptimizationConfig()
	service := NewPerformanceOptimizationService(db, redisClient, config)

	ctx := context.Background()

	t.Run("Real cache operations", func(t *testing.T) {
		key := "integration_test_key"
		value := "integration_test_value"
		ttl := 1 * time.Minute

		// Set
		err := service.CacheSet(ctx, key, value, ttl)
		assert.NoError(t, err)

		// Get
		var retrieved string
		err = service.CacheGet(ctx, key, &retrieved)
		assert.NoError(t, err)
		assert.Equal(t, value, retrieved)

		// Delete
		err = service.CacheDelete(ctx, key)
		assert.NoError(t, err)

		// Verify deletion
		err = service.CacheGet(ctx, key, &retrieved)
		assert.Error(t, err)
	})

	t.Run("Health check with real components", func(t *testing.T) {
		health := service.HealthCheck()
		assert.Equal(t, "healthy", health["overall"])

		components := health["components"].(map[string]interface{})
		
		// Database should be healthy
		dbHealth := components["database"].(map[string]interface{})
		assert.True(t, dbHealth["healthy"].(bool))

		// Cache should be healthy
		cacheHealth := components["cache"].(map[string]interface{})
		assert.True(t, cacheHealth["healthy"].(bool))
	})
}
package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"cjpayment/internal/handler"
	"cjpayment/internal/service"
	"cjpayment/pkg/cache"
)

type PerformanceOptimizationTestSuite struct {
	suite.Suite
	db                 *gorm.DB
	cache              cache.Cache
	performanceService *service.PerformanceOptimizationService
	performanceHandler *handler.PerformanceHandler
	router             *gin.Engine
}

func (suite *PerformanceOptimizationTestSuite) SetupSuite() {
	// Setup test database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	suite.Require().NoError(err)
	suite.db = db

	// Setup test cache (in-memory for testing)
	suite.cache = cache.NewMemoryCache()

	// Setup performance optimization service
	config := service.DefaultPerformanceOptimizationConfig()
	config.AutoTuneInterval = 1 * time.Second // Faster for testing
	config.MetricsCollectionInterval = 500 * time.Millisecond
	
	suite.performanceService = service.NewPerformanceOptimizationService(
		suite.db,
		suite.cache,
		config,
	)

	// Setup handler
	suite.performanceHandler = handler.NewPerformanceHandler(suite.performanceService)

	// Setup router
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()
	api := suite.router.Group("/api")
	handler.RegisterPerformanceRoutes(api, suite.performanceHandler)
}

func (suite *PerformanceOptimizationTestSuite) TearDownSuite() {
	if suite.cache != nil {
		suite.cache.Close()
	}
}

func (suite *PerformanceOptimizationTestSuite) TestPerformanceReport() {
	req, _ := http.NewRequest("GET", "/api/performance/report", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.NotNil(suite.T(), response["data"])
}

func (suite *PerformanceOptimizationTestSuite) TestOptimizationSuggestions() {
	req, _ := http.NewRequest("GET", "/api/performance/suggestions", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.NotNil(suite.T(), response["data"])
}

func (suite *PerformanceOptimizationTestSuite) TestCacheStats() {
	req, _ := http.NewRequest("GET", "/api/performance/cache/stats", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.NotNil(suite.T(), response["data"])
}

func (suite *PerformanceOptimizationTestSuite) TestConnectionPoolStats() {
	req, _ := http.NewRequest("GET", "/api/performance/db/pool", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.NotNil(suite.T(), response["data"])
}

func (suite *PerformanceOptimizationTestSuite) TestSystemMetrics() {
	req, _ := http.NewRequest("GET", "/api/performance/metrics", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.NotNil(suite.T(), response["data"])

	data := response["data"].(map[string]interface{})
	assert.Contains(suite.T(), data, "timestamp")
	assert.Contains(suite.T(), data, "cache")
	assert.Contains(suite.T(), data, "connection_pool")
}

func (suite *PerformanceOptimizationTestSuite) TestHealthCheck() {
	req, _ := http.NewRequest("GET", "/api/performance/health", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Contains(suite.T(), data, "overall")
	assert.Contains(suite.T(), data, "components")
	assert.Equal(suite.T(), "healthy", data["overall"])
}

func (suite *PerformanceOptimizationTestSuite) TestCacheInvalidation() {
	// Test merchant cache invalidation
	req, _ := http.NewRequest("POST", "/api/performance/cache/invalidate?type=merchant&id=1", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.Equal(suite.T(), "Cache invalidated successfully", response["message"])

	// Test account cache invalidation
	req, _ = http.NewRequest("POST", "/api/performance/cache/invalidate?type=account&id=1", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
}

func (suite *PerformanceOptimizationTestSuite) TestCacheInvalidationErrors() {
	// Test missing parameters
	req, _ := http.NewRequest("POST", "/api/performance/cache/invalidate", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response["success"].(bool))
	assert.Contains(suite.T(), response["error"], "required")

	// Test invalid ID
	req, _ = http.NewRequest("POST", "/api/performance/cache/invalidate?type=merchant&id=invalid", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response["success"].(bool))
	assert.Contains(suite.T(), response["error"], "Invalid ID format")

	// Test invalid type
	req, _ = http.NewRequest("POST", "/api/performance/cache/invalidate?type=invalid&id=1", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusBadRequest, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.False(suite.T(), response["success"].(bool))
	assert.Contains(suite.T(), response["error"], "Invalid cache type")
}

func (suite *PerformanceOptimizationTestSuite) TestCacheWarmup() {
	req, _ := http.NewRequest("POST", "/api/performance/cache/warmup", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.Equal(suite.T(), "Cache warmup initiated", response["message"])
}

func (suite *PerformanceOptimizationTestSuite) TestCacheKeys() {
	// Test default pattern
	req, _ := http.NewRequest("GET", "/api/performance/cache/keys", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(suite.T(), "*", data["pattern"])
	assert.NotNil(suite.T(), data["keys"])
	assert.NotNil(suite.T(), data["count"])

	// Test custom pattern
	req, _ = http.NewRequest("GET", "/api/performance/cache/keys?pattern=merchant:*", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data = response["data"].(map[string]interface{})
	assert.Equal(suite.T(), "merchant:*", data["pattern"])
}

func (suite *PerformanceOptimizationTestSuite) TestCacheFlush() {
	req, _ := http.NewRequest("POST", "/api/performance/cache/flush", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))
	assert.Equal(suite.T(), "Cache flush completed", response["message"])
	assert.Contains(suite.T(), response["warning"], "cleared")
}

func (suite *PerformanceOptimizationTestSuite) TestQueryStats() {
	req, _ := http.NewRequest("GET", "/api/performance/db/queries", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Contains(suite.T(), data, "total_queries")
	assert.Contains(suite.T(), data, "slow_queries")
	assert.Contains(suite.T(), data, "average_duration")
	assert.Contains(suite.T(), data, "queries_per_second")
}

func (suite *PerformanceOptimizationTestSuite) TestSlowQueries() {
	// Test default limit
	req, _ := http.NewRequest("GET", "/api/performance/db/slow-queries", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(suite.T(), float64(10), data["limit"])
	assert.NotNil(suite.T(), data["slow_queries"])
	assert.NotNil(suite.T(), data["total_count"])

	// Test custom limit
	req, _ = http.NewRequest("GET", "/api/performance/db/slow-queries?limit=5", nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	err = json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data = response["data"].(map[string]interface{})
	assert.Equal(suite.T(), float64(5), data["limit"])
}

func (suite *PerformanceOptimizationTestSuite) TestQueryOptimization() {
	req, _ := http.NewRequest("GET", "/api/performance/db/optimize", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Contains(suite.T(), data, "suggestions")

	suggestions := data["suggestions"].([]interface{})
	assert.Greater(suite.T(), len(suggestions), 0)

	// Check first suggestion structure
	if len(suggestions) > 0 {
		suggestion := suggestions[0].(map[string]interface{})
		assert.Contains(suite.T(), suggestion, "type")
		assert.Contains(suite.T(), suggestion, "description")
		assert.Contains(suite.T(), suggestion, "impact")
	}
}

func (suite *PerformanceOptimizationTestSuite) TestMemoryStats() {
	req, _ := http.NewRequest("GET", "/api/performance/memory", nil)
	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Contains(suite.T(), data, "allocated")
	assert.Contains(suite.T(), data, "total_alloc")
	assert.Contains(suite.T(), data, "sys")
	assert.Contains(suite.T(), data, "heap_alloc")
	assert.Contains(suite.T(), data, "heap_sys")
	assert.Contains(suite.T(), data, "gc_runs")
	assert.Contains(suite.T(), data, "goroutines")
}

func (suite *PerformanceOptimizationTestSuite) TestCacheOperationsIntegration() {
	ctx := context.Background()

	// Test cache set
	err := suite.performanceService.CacheSet(ctx, "test_key", "test_value", 1*time.Minute)
	assert.NoError(suite.T(), err)

	// Test cache get
	var value string
	err = suite.performanceService.CacheGet(ctx, "test_key", &value)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), "test_value", value)

	// Test cache delete
	err = suite.performanceService.CacheDelete(ctx, "test_key")
	assert.NoError(suite.T(), err)

	// Verify deletion
	err = suite.performanceService.CacheGet(ctx, "test_key", &value)
	assert.Error(suite.T(), err)
}

func (suite *PerformanceOptimizationTestSuite) TestOptimizedQueries() {
	// Test optimized merchant query
	query := suite.performanceService.OptimizedMerchantQuery()
	assert.NotNil(suite.T(), query)

	// Test optimized account query
	query = suite.performanceService.OptimizedAccountQuery()
	assert.NotNil(suite.T(), query)

	// Test optimized order query
	query = suite.performanceService.OptimizedOrderQuery()
	assert.NotNil(suite.T(), query)
}

func (suite *PerformanceOptimizationTestSuite) TestMetricsRecording() {
	// Test recharge order metrics
	duration := 100 * time.Millisecond
	suite.performanceService.RecordRechargeOrder(duration)

	// Test account matching metrics
	suite.performanceService.RecordAccountMatching(50*time.Millisecond, true)
	suite.performanceService.RecordAccountMatching(200*time.Millisecond, false)

	// Allow some time for metrics to be processed
	time.Sleep(100 * time.Millisecond)

	// Verify metrics are recorded (this would check actual metrics in a real implementation)
	stats := suite.performanceService.GetSystemMetrics()
	assert.NotNil(suite.T(), stats)
}

func (suite *PerformanceOptimizationTestSuite) TestPerformanceOptimizationFlow() {
	ctx := context.Background()

	// 1. Cache some data
	err := suite.performanceService.CacheSet(ctx, "merchant:1", map[string]interface{}{
		"id":   1,
		"name": "Test Merchant",
	}, 10*time.Minute)
	assert.NoError(suite.T(), err)

	// 2. Retrieve cached data
	var merchant map[string]interface{}
	err = suite.performanceService.CacheGet(ctx, "merchant:1", &merchant)
	assert.NoError(suite.T(), err)

	// 3. Record some metrics
	suite.performanceService.RecordRechargeOrder(150 * time.Millisecond)
	suite.performanceService.RecordAccountMatching(75*time.Millisecond, true)

	// 4. Get performance report
	report := suite.performanceService.GetPerformanceReport()
	assert.NotNil(suite.T(), report)

	// 5. Get optimization suggestions
	suggestions := suite.performanceService.GetOptimizationSuggestions()
	assert.NotNil(suite.T(), suggestions)

	// 6. Invalidate cache
	err = suite.performanceService.InvalidateMerchantCache(ctx, 1)
	assert.NoError(suite.T(), err)

	// 7. Verify cache invalidation
	err = suite.performanceService.CacheGet(ctx, "merchant:1", &merchant)
	assert.Error(suite.T(), err) // Should be cache miss after invalidation
}

func TestPerformanceOptimizationTestSuite(t *testing.T) {
	suite.Run(t, new(PerformanceOptimizationTestSuite))
}

// Benchmark tests
func BenchmarkPerformanceOptimization(b *testing.B) {
	// Setup
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	cache := cache.NewMemoryCache()
	config := service.DefaultPerformanceOptimizationConfig()
	service := service.NewPerformanceOptimizationService(db, cache, config)

	ctx := context.Background()

	b.Run("CacheOperations", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			key := fmt.Sprintf("bench_key_%d", i)
			value := fmt.Sprintf("bench_value_%d", i)
			
			service.CacheSet(ctx, key, value, time.Minute)
			
			var retrieved string
			service.CacheGet(ctx, key, &retrieved)
			
			service.CacheDelete(ctx, key)
		}
	})

	b.Run("OptimizedQueries", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.OptimizedMerchantQuery()
			service.OptimizedAccountQuery()
			service.OptimizedOrderQuery()
		}
	})

	b.Run("MetricsRecording", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			service.RecordRechargeOrder(time.Duration(i) * time.Millisecond)
			service.RecordAccountMatching(time.Duration(i)*time.Millisecond, i%2 == 0)
		}
	})
}
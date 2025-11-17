package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"gorm.io/gorm"
	"github.com/company/cjpayment/pkg/cache"
	"github.com/company/cjpayment/pkg/database"
	"github.com/company/cjpayment/pkg/monitoring"
)

// PerformanceOptimizationService manages all performance optimization features
type PerformanceOptimizationService struct {
	db                    *gorm.DB
	cache                 cache.Cache
	rechargeCache         *cache.RechargeCacheManager
	queryOptimizer        *database.RechargeQueryOptimizations
	connectionPool        *database.AdaptiveConnectionPool
	performanceMonitor    *monitoring.PerformanceMonitor
	performanceOptimizer  *monitoring.PerformanceOptimizer
	config                PerformanceOptimizationConfig
	mu                    sync.RWMutex
}

// PerformanceOptimizationConfig holds configuration for performance optimization
type PerformanceOptimizationConfig struct {
	EnableCaching           bool
	EnableQueryOptimization bool
	EnableConnectionPooling bool
	EnableMonitoring        bool
	CacheWarmupOnStart      bool
	AutoTuneInterval        time.Duration
	MetricsCollectionInterval time.Duration
}

// DefaultPerformanceOptimizationConfig returns default configuration
func DefaultPerformanceOptimizationConfig() PerformanceOptimizationConfig {
	return PerformanceOptimizationConfig{
		EnableCaching:           true,
		EnableQueryOptimization: true,
		EnableConnectionPooling: true,
		EnableMonitoring:        true,
		CacheWarmupOnStart:      true,
		AutoTuneInterval:        5 * time.Minute,
		MetricsCollectionInterval: 10 * time.Second,
	}
}

// NewPerformanceOptimizationService creates a new performance optimization service
func NewPerformanceOptimizationService(
	db *gorm.DB,
	cache cache.Cache,
	config PerformanceOptimizationConfig,
) *PerformanceOptimizationService {
	
	service := &PerformanceOptimizationService{
		db:     db,
		cache:  cache,
		config: config,
	}

	// Initialize components based on configuration
	if config.EnableCaching {
		cacheConfig := cache.DefaultRechargeCacheConfig()
		service.rechargeCache = cache.NewRechargeCacheManager(cache, cacheConfig)
	}

	if config.EnableQueryOptimization {
		service.queryOptimizer = database.NewRechargeQueryOptimizations(db)
	}

	if config.EnableConnectionPooling {
		service.connectionPool = database.NewAdaptiveConnectionPool(db)
	}

	if config.EnableMonitoring {
		monitorConfig := monitoring.DefaultPerformanceConfig()
		monitorConfig.CollectionInterval = config.MetricsCollectionInterval
		service.performanceMonitor = monitoring.NewPerformanceMonitor(monitorConfig)
		service.performanceOptimizer = monitoring.NewPerformanceOptimizer(service.performanceMonitor)
	}

	// Start background processes
	go service.startBackgroundOptimization()

	// Warm up cache if enabled
	if config.CacheWarmupOnStart {
		go service.warmupCache()
	}

	return service
}

// startBackgroundOptimization starts background optimization processes
func (pos *PerformanceOptimizationService) startBackgroundOptimization() {
	ticker := time.NewTicker(pos.config.AutoTuneInterval)
	defer ticker.Stop()

	for range ticker.C {
		pos.performAutoOptimization()
	}
}

// performAutoOptimization performs automatic optimization
func (pos *PerformanceOptimizationService) performAutoOptimization() {
	ctx := context.Background()

	// Auto-tune connection pool
	if pos.config.EnableConnectionPooling && pos.connectionPool != nil {
		if err := pos.connectionPool.AutoTune(); err != nil {
			fmt.Printf("Connection pool auto-tune failed: %v\n", err)
		}
	}

	// Clean up expired cache entries
	if pos.config.EnableCaching && pos.rechargeCache != nil {
		// This would typically be handled by Redis automatically,
		// but we can implement custom cleanup logic here
		pos.cleanupCache(ctx)
	}

	// Update performance metrics
	if pos.config.EnableMonitoring && pos.performanceMonitor != nil {
		pos.updatePerformanceMetrics()
	}
}

// warmupCache warms up the cache with frequently accessed data
func (pos *PerformanceOptimizationService) warmupCache() {
	if !pos.config.EnableCaching || pos.rechargeCache == nil {
		return
	}

	ctx := context.Background()

	// Warm up merchants
	merchants, err := pos.getActiveMerchants(ctx)
	if err == nil {
		pos.rechargeCache.WarmupMerchants(ctx, merchants)
	}

	// Warm up accounts
	accounts, err := pos.getActiveAccounts(ctx)
	if err == nil {
		pos.rechargeCache.WarmupAccounts(ctx, accounts)
	}
}

// getActiveMerchants retrieves active merchants for cache warmup
func (pos *PerformanceOptimizationService) getActiveMerchants(ctx context.Context) (map[uint]interface{}, error) {
	merchants := make(map[uint]interface{})
	
	// This would typically query the database for active merchants
	// For now, return empty map
	return merchants, nil
}

// getActiveAccounts retrieves active accounts for cache warmup
func (pos *PerformanceOptimizationService) getActiveAccounts(ctx context.Context) (map[uint]interface{}, error) {
	accounts := make(map[uint]interface{})
	
	// This would typically query the database for active accounts
	// For now, return empty map
	return accounts, nil
}

// cleanupCache performs cache cleanup operations
func (pos *PerformanceOptimizationService) cleanupCache(ctx context.Context) {
	// Implement cache cleanup logic
	// This could include removing expired entries, compacting data, etc.
}

// updatePerformanceMetrics updates performance metrics
func (pos *PerformanceOptimizationService) updatePerformanceMetrics() {
	if pos.connectionPool != nil {
		stats := pos.connectionPool.GetAdaptiveStats()
		if dbStats, ok := stats["adaptive"].(map[string]interface{}); ok {
			// Update database connection metrics
			if insights, ok := dbStats["insights"].(monitoring.ConnectionInsights); ok {
				pos.performanceMonitor.UpdateDBConnectionStats(
					insights.PeakOpenConnections,
					int(insights.AverageIdleConnections),
				)
			}
		}
	}

	if pos.rechargeCache != nil {
		cacheStats := pos.rechargeCache.GetCacheStats(context.Background())
		if hitRate, ok := cacheStats["hit_rate"].(float64); ok {
			pos.performanceMonitor.UpdateCacheStats(hitRate, 0, 0)
		}
	}
}

// OptimizedMerchantQuery returns an optimized merchant query
func (pos *PerformanceOptimizationService) OptimizedMerchantQuery() *gorm.DB {
	if !pos.config.EnableQueryOptimization || pos.queryOptimizer == nil {
		return pos.db
	}

	opts := pos.queryOptimizer.OptimizedMerchantQuery()
	return pos.queryOptimizer.optimizer.ApplyOptimizations(pos.db, opts)
}

// OptimizedAccountQuery returns an optimized account query
func (pos *PerformanceOptimizationService) OptimizedAccountQuery() *gorm.DB {
	if !pos.config.EnableQueryOptimization || pos.queryOptimizer == nil {
		return pos.db
	}

	opts := pos.queryOptimizer.OptimizedAccountQuery()
	return pos.queryOptimizer.optimizer.ApplyOptimizations(pos.db, opts)
}

// OptimizedOrderQuery returns an optimized order query
func (pos *PerformanceOptimizationService) OptimizedOrderQuery() *gorm.DB {
	if !pos.config.EnableQueryOptimization || pos.queryOptimizer == nil {
		return pos.db
	}

	opts := pos.queryOptimizer.OptimizedOrderQuery()
	return pos.queryOptimizer.optimizer.ApplyOptimizations(pos.db, opts)
}

// CacheGet retrieves data from cache
func (pos *PerformanceOptimizationService) CacheGet(ctx context.Context, key string, dest interface{}) error {
	if !pos.config.EnableCaching || pos.cache == nil {
		return cache.ErrCacheMiss
	}

	return pos.cache.Get(key, dest)
}

// CacheSet stores data in cache
func (pos *PerformanceOptimizationService) CacheSet(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if !pos.config.EnableCaching || pos.cache == nil {
		return nil
	}

	return pos.cache.Set(key, value, ttl)
}

// CacheDelete removes data from cache
func (pos *PerformanceOptimizationService) CacheDelete(ctx context.Context, key string) error {
	if !pos.config.EnableCaching || pos.cache == nil {
		return nil
	}

	return pos.cache.Delete(key)
}

// GetMerchantWithCache retrieves merchant with caching
func (pos *PerformanceOptimizationService) GetMerchantWithCache(ctx context.Context, merchantID uint) (interface{}, error) {
	if pos.config.EnableCaching && pos.rechargeCache != nil {
		// Try cache first
		if merchant, err := pos.rechargeCache.GetMerchant(ctx, merchantID); err == nil {
			return merchant, nil
		}
	}

	// Cache miss, query database
	query := pos.OptimizedMerchantQuery()
	var merchant interface{} // This would be your actual merchant model
	
	start := time.Now()
	err := query.Where("id = ? AND status = 'active'", merchantID).First(&merchant).Error
	duration := time.Since(start)

	// Record metrics
	if pos.config.EnableMonitoring && pos.performanceMonitor != nil {
		pos.performanceMonitor.RecordDBQuery(duration, err == nil)
	}

	if err != nil {
		return nil, err
	}

	// Cache the result
	if pos.config.EnableCaching && pos.rechargeCache != nil {
		pos.rechargeCache.SetMerchant(ctx, merchantID, merchant)
	}

	return merchant, nil
}

// GetAccountWithCache retrieves account with caching
func (pos *PerformanceOptimizationService) GetAccountWithCache(ctx context.Context, accountID uint) (interface{}, error) {
	if pos.config.EnableCaching && pos.rechargeCache != nil {
		// Try cache first
		if account, err := pos.rechargeCache.GetAccount(ctx, accountID); err == nil {
			return account, nil
		}
	}

	// Cache miss, query database
	query := pos.OptimizedAccountQuery()
	var account interface{} // This would be your actual account model
	
	start := time.Now()
	err := query.Where("id = ? AND status = 'active'", accountID).First(&account).Error
	duration := time.Since(start)

	// Record metrics
	if pos.config.EnableMonitoring && pos.performanceMonitor != nil {
		pos.performanceMonitor.RecordDBQuery(duration, err == nil)
	}

	if err != nil {
		return nil, err
	}

	// Cache the result
	if pos.config.EnableCaching && pos.rechargeCache != nil {
		pos.rechargeCache.SetAccount(ctx, accountID, account)
	}

	return account, nil
}

// InvalidateMerchantCache invalidates merchant-related cache
func (pos *PerformanceOptimizationService) InvalidateMerchantCache(ctx context.Context, merchantID uint) error {
	if !pos.config.EnableCaching || pos.rechargeCache == nil {
		return nil
	}

	return pos.rechargeCache.InvalidateAllMerchantData(ctx, merchantID)
}

// InvalidateAccountCache invalidates account-related cache
func (pos *PerformanceOptimizationService) InvalidateAccountCache(ctx context.Context, accountID uint) error {
	if !pos.config.EnableCaching || pos.rechargeCache == nil {
		return nil
	}

	return pos.rechargeCache.InvalidateAllAccountData(ctx, accountID)
}

// RecordRechargeOrder records recharge order metrics
func (pos *PerformanceOptimizationService) RecordRechargeOrder(duration time.Duration) {
	if pos.config.EnableMonitoring && pos.performanceMonitor != nil {
		pos.performanceMonitor.RecordRechargeOrder(duration)
	}
}

// RecordAccountMatching records account matching metrics
func (pos *PerformanceOptimizationService) RecordAccountMatching(duration time.Duration, success bool) {
	if pos.config.EnableMonitoring && pos.performanceMonitor != nil {
		pos.performanceMonitor.RecordAccountMatching(duration, success)
	}
}

// GetPerformanceReport generates a performance report
func (pos *PerformanceOptimizationService) GetPerformanceReport() interface{} {
	if !pos.config.EnableMonitoring || pos.performanceOptimizer == nil {
		return map[string]interface{}{
			"error": "Performance monitoring is disabled",
		}
	}

	return pos.performanceOptimizer.GetPerformanceReport()
}

// GetOptimizationSuggestions returns optimization suggestions
func (pos *PerformanceOptimizationService) GetOptimizationSuggestions() interface{} {
	if !pos.config.EnableMonitoring || pos.performanceOptimizer == nil {
		return []string{"Performance monitoring is disabled"}
	}

	return pos.performanceOptimizer.GetOptimizationSuggestions()
}

// GetCacheStats returns cache statistics
func (pos *PerformanceOptimizationService) GetCacheStats() map[string]interface{} {
	if !pos.config.EnableCaching {
		return map[string]interface{}{
			"error": "Caching is disabled",
		}
	}

	stats := make(map[string]interface{})

	if pos.rechargeCache != nil {
		stats["recharge_cache"] = pos.rechargeCache.GetCacheStats(context.Background())
	}

	if pos.cache != nil {
		// Add general cache stats if available
		if redisClient, ok := pos.cache.(*cache.RedisClient); ok {
			stats["redis"] = redisClient.GetMetrics()
		}
	}

	return stats
}

// GetConnectionPoolStats returns connection pool statistics
func (pos *PerformanceOptimizationService) GetConnectionPoolStats() map[string]interface{} {
	if !pos.config.EnableConnectionPooling || pos.connectionPool == nil {
		return map[string]interface{}{
			"error": "Connection pooling is disabled",
		}
	}

	return pos.connectionPool.GetAdaptiveStats()
}

// HealthCheck performs a comprehensive health check
func (pos *PerformanceOptimizationService) HealthCheck() map[string]interface{} {
	health := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"overall":   "healthy",
		"components": make(map[string]interface{}),
	}

	// Check cache health
	if pos.config.EnableCaching && pos.rechargeCache != nil {
		cacheHealth := pos.rechargeCache.HealthCheck(context.Background())
		health["components"].(map[string]interface{})["cache"] = cacheHealth
		
		if !cacheHealth["healthy"].(bool) {
			health["overall"] = "degraded"
		}
	}

	// Check database health
	if pos.db != nil {
		sqlDB, err := pos.db.DB()
		if err != nil {
			health["components"].(map[string]interface{})["database"] = map[string]interface{}{
				"healthy": false,
				"error":   err.Error(),
			}
			health["overall"] = "unhealthy"
		} else {
			err = sqlDB.Ping()
			health["components"].(map[string]interface{})["database"] = map[string]interface{}{
				"healthy": err == nil,
				"error":   func() string { if err != nil { return err.Error() } return "" }(),
			}
			
			if err != nil {
				health["overall"] = "unhealthy"
			}
		}
	}

	// Check connection pool health
	if pos.config.EnableConnectionPooling && pos.connectionPool != nil {
		poolStats := pos.connectionPool.GetAdaptiveStats()
		health["components"].(map[string]interface{})["connection_pool"] = poolStats
	}

	return health
}

// GetSystemMetrics returns comprehensive system metrics
func (pos *PerformanceOptimizationService) GetSystemMetrics() map[string]interface{} {
	metrics := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
	}

	// Add cache metrics
	if pos.config.EnableCaching {
		metrics["cache"] = pos.GetCacheStats()
	}

	// Add connection pool metrics
	if pos.config.EnableConnectionPooling {
		metrics["connection_pool"] = pos.GetConnectionPoolStats()
	}

	// Add performance metrics
	if pos.config.EnableMonitoring && pos.performanceOptimizer != nil {
		report := pos.performanceOptimizer.GetPerformanceReport()
		if perfReport, ok := report.(monitoring.PerformanceReport); ok {
			metrics["performance"] = perfReport.SystemMetrics
		}
	}

	return metrics
}
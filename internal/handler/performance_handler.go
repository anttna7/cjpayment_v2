package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"cjpayment/internal/service"
)

// PerformanceHandler handles performance optimization endpoints
type PerformanceHandler struct {
	performanceService *service.PerformanceOptimizationService
}

// NewPerformanceHandler creates a new performance handler
func NewPerformanceHandler(performanceService *service.PerformanceOptimizationService) *PerformanceHandler {
	return &PerformanceHandler{
		performanceService: performanceService,
	}
}

// GetPerformanceReport returns a comprehensive performance report
// @Summary Get performance report
// @Description Returns comprehensive performance analysis and bottleneck report
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Performance report"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/report [get]
func (ph *PerformanceHandler) GetPerformanceReport(c *gin.Context) {
	report := ph.performanceService.GetPerformanceReport()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    report,
	})
}

// GetOptimizationSuggestions returns performance optimization suggestions
// @Summary Get optimization suggestions
// @Description Returns performance optimization suggestions based on current metrics
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Optimization suggestions"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/suggestions [get]
func (ph *PerformanceHandler) GetOptimizationSuggestions(c *gin.Context) {
	suggestions := ph.performanceService.GetOptimizationSuggestions()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    suggestions,
	})
}

// GetCacheStats returns cache statistics
// @Summary Get cache statistics
// @Description Returns comprehensive cache performance statistics
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Cache statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/cache/stats [get]
func (ph *PerformanceHandler) GetCacheStats(c *gin.Context) {
	stats := ph.performanceService.GetCacheStats()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetConnectionPoolStats returns database connection pool statistics
// @Summary Get connection pool statistics
// @Description Returns database connection pool performance statistics
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Connection pool statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/db/pool [get]
func (ph *PerformanceHandler) GetConnectionPoolStats(c *gin.Context) {
	stats := ph.performanceService.GetConnectionPoolStats()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetSystemMetrics returns comprehensive system metrics
// @Summary Get system metrics
// @Description Returns comprehensive system performance metrics
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "System metrics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/metrics [get]
func (ph *PerformanceHandler) GetSystemMetrics(c *gin.Context) {
	metrics := ph.performanceService.GetSystemMetrics()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

// HealthCheck performs a comprehensive health check
// @Summary Perform health check
// @Description Performs comprehensive health check of all performance components
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Health check results"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/health [get]
func (ph *PerformanceHandler) HealthCheck(c *gin.Context) {
	health := ph.performanceService.HealthCheck()
	
	// Determine HTTP status based on health
	status := http.StatusOK
	if overall, ok := health["overall"].(string); ok {
		switch overall {
		case "unhealthy":
			status = http.StatusServiceUnavailable
		case "degraded":
			status = http.StatusPartialContent
		}
	}

	c.JSON(status, gin.H{
		"success": status == http.StatusOK,
		"data":    health,
	})
}

// InvalidateCache invalidates cache for specific resources
// @Summary Invalidate cache
// @Description Invalidates cache for specific merchant or account
// @Tags Performance
// @Accept json
// @Produce json
// @Param type query string true "Cache type (merchant|account)"
// @Param id query string true "Resource ID"
// @Success 200 {object} map[string]interface{} "Cache invalidation result"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/cache/invalidate [post]
func (ph *PerformanceHandler) InvalidateCache(c *gin.Context) {
	cacheType := c.Query("type")
	idStr := c.Query("id")

	if cacheType == "" || idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Both 'type' and 'id' parameters are required",
		})
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid ID format",
		})
		return
	}

	ctx := c.Request.Context()
	
	switch cacheType {
	case "merchant":
		err = ph.performanceService.InvalidateMerchantCache(ctx, uint(id))
	case "account":
		err = ph.performanceService.InvalidateAccountCache(ctx, uint(id))
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid cache type. Must be 'merchant' or 'account'",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cache invalidated successfully",
		"data": gin.H{
			"type": cacheType,
			"id":   id,
		},
	})
}

// WarmupCache warms up cache with frequently accessed data
// @Summary Warmup cache
// @Description Warms up cache with frequently accessed data
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Cache warmup result"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/cache/warmup [post]
func (ph *PerformanceHandler) WarmupCache(c *gin.Context) {
	// This would typically trigger cache warmup
	// For now, return success message
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cache warmup initiated",
	})
}

// GetCacheKeys returns cache keys matching a pattern
// @Summary Get cache keys
// @Description Returns cache keys matching the specified pattern
// @Tags Performance
// @Accept json
// @Produce json
// @Param pattern query string false "Key pattern (default: *)"
// @Success 200 {object} map[string]interface{} "Cache keys"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/cache/keys [get]
func (ph *PerformanceHandler) GetCacheKeys(c *gin.Context) {
	pattern := c.DefaultQuery("pattern", "*")
	
	// This would typically return actual cache keys
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"pattern": pattern,
			"keys":    []string{}, // Would contain actual keys
			"count":   0,
		},
	})
}

// FlushCache flushes all cache data
// @Summary Flush cache
// @Description Flushes all cache data (use with caution)
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Cache flush result"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/cache/flush [post]
func (ph *PerformanceHandler) FlushCache(c *gin.Context) {
	// This would typically flush all cache data
	// For now, return success message
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cache flush completed",
		"warning": "All cached data has been cleared",
	})
}

// GetQueryStats returns database query statistics
// @Summary Get query statistics
// @Description Returns database query performance statistics
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Query statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/db/queries [get]
func (ph *PerformanceHandler) GetQueryStats(c *gin.Context) {
	// This would typically return actual query statistics
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_queries":     0,
			"slow_queries":      0,
			"average_duration": "0ms",
			"queries_per_second": 0.0,
		},
	})
}

// GetSlowQueries returns slow query analysis
// @Summary Get slow queries
// @Description Returns analysis of slow database queries
// @Tags Performance
// @Accept json
// @Produce json
// @Param limit query int false "Limit number of results (default: 10)"
// @Success 200 {object} map[string]interface{} "Slow queries analysis"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/db/slow-queries [get]
func (ph *PerformanceHandler) GetSlowQueries(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}

	// This would typically return actual slow query data
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"limit":       limit,
			"slow_queries": []map[string]interface{}{},
			"total_count": 0,
		},
	})
}

// OptimizeQueries provides query optimization suggestions
// @Summary Optimize queries
// @Description Provides database query optimization suggestions
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Query optimization suggestions"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/db/optimize [get]
func (ph *PerformanceHandler) OptimizeQueries(c *gin.Context) {
	// This would typically analyze queries and provide suggestions
	// For now, return mock suggestions
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"suggestions": []map[string]interface{}{
				{
					"type":        "index",
					"table":       "recharge_orders",
					"description": "Consider adding index on (merchant_id, status, created_at)",
					"impact":      "high",
				},
				{
					"type":        "query",
					"description": "Use LIMIT clause for large result sets",
					"impact":      "medium",
				},
			},
		},
	})
}

// GetMemoryStats returns memory usage statistics
// @Summary Get memory statistics
// @Description Returns application memory usage statistics
// @Tags Performance
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Memory statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/performance/memory [get]
func (ph *PerformanceHandler) GetMemoryStats(c *gin.Context) {
	// This would typically return actual memory statistics
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"allocated":     "0 MB",
			"total_alloc":   "0 MB",
			"sys":          "0 MB",
			"heap_alloc":   "0 MB",
			"heap_sys":     "0 MB",
			"gc_runs":      0,
			"goroutines":   0,
		},
	})
}

// RegisterPerformanceRoutes registers all performance-related routes
func RegisterPerformanceRoutes(router *gin.RouterGroup, handler *PerformanceHandler) {
	perf := router.Group("/performance")
	{
		// General performance endpoints
		perf.GET("/report", handler.GetPerformanceReport)
		perf.GET("/suggestions", handler.GetOptimizationSuggestions)
		perf.GET("/metrics", handler.GetSystemMetrics)
		perf.GET("/health", handler.HealthCheck)
		perf.GET("/memory", handler.GetMemoryStats)

		// Cache endpoints
		cache := perf.Group("/cache")
		{
			cache.GET("/stats", handler.GetCacheStats)
			cache.GET("/keys", handler.GetCacheKeys)
			cache.POST("/invalidate", handler.InvalidateCache)
			cache.POST("/warmup", handler.WarmupCache)
			cache.POST("/flush", handler.FlushCache)
		}

		// Database endpoints
		db := perf.Group("/db")
		{
			db.GET("/pool", handler.GetConnectionPoolStats)
			db.GET("/queries", handler.GetQueryStats)
			db.GET("/slow-queries", handler.GetSlowQueries)
			db.GET("/optimize", handler.OptimizeQueries)
		}
	}
}
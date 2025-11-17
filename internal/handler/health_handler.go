package handler

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"

	"cjpayment/pkg/logger"
	"cjpayment/pkg/monitoring"
)

// HealthHandler 健康检查处理器
type HealthHandler struct {
	db     *gorm.DB
	redis  *redis.Client
	logger *logger.StructuredLogger
}

// NewHealthHandler 创建健康检查处理器
func NewHealthHandler(db *gorm.DB, redis *redis.Client, logger *logger.StructuredLogger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		redis:  redis,
		logger: logger,
	}
}

// HealthStatus 健康状态
type HealthStatus struct {
	Status    string                 `json:"status"`
	Timestamp time.Time              `json:"timestamp"`
	Version   string                 `json:"version"`
	Checks    map[string]CheckResult `json:"checks"`
}

// CheckResult 检查结果
type CheckResult struct {
	Status   string        `json:"status"`
	Duration time.Duration `json:"duration"`
	Message  string        `json:"message,omitempty"`
	Error    string        `json:"error,omitempty"`
}

// HealthCheck 健康检查端点
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	ctx := c.Request.Context()
	startTime := time.Now()
	
	health := HealthStatus{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "1.0.0", // 可以从环境变量或配置中获取
		Checks:    make(map[string]CheckResult),
	}
	
	// 检查数据库连接
	dbCheck := h.checkDatabase(ctx)
	health.Checks["database"] = dbCheck
	
	// 检查Redis连接
	redisCheck := h.checkRedis(ctx)
	health.Checks["redis"] = redisCheck
	
	// 检查系统资源
	systemCheck := h.checkSystem(ctx)
	health.Checks["system"] = systemCheck
	
	// 确定整体健康状态
	overallStatus := "healthy"
	for _, check := range health.Checks {
		if check.Status != "healthy" {
			overallStatus = "unhealthy"
			break
		}
	}
	health.Status = overallStatus
	
	// 记录健康检查指标
	duration := time.Since(startTime)
	monitoring.RecordHTTPRequest("GET", "/health", "200", duration.Seconds())
	
	// 记录日志
	h.logger.WithFields(logger.LogFields{
		"component":     "health_check",
		"overall_status": overallStatus,
		"duration_ms":   duration.Milliseconds(),
		"checks":        health.Checks,
	}).Info("Health check completed")
	
	// 根据健康状态返回相应的HTTP状态码
	statusCode := http.StatusOK
	if overallStatus != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}
	
	c.JSON(statusCode, health)
}

// ReadinessCheck 就绪检查端点
func (h *HealthHandler) ReadinessCheck(c *gin.Context) {
	ctx := c.Request.Context()
	
	// 检查关键依赖是否就绪
	checks := map[string]CheckResult{
		"database": h.checkDatabase(ctx),
		"redis":    h.checkRedis(ctx),
	}
	
	ready := true
	for _, check := range checks {
		if check.Status != "healthy" {
			ready = false
			break
		}
	}
	
	response := gin.H{
		"ready":  ready,
		"checks": checks,
	}
	
	statusCode := http.StatusOK
	if !ready {
		statusCode = http.StatusServiceUnavailable
	}
	
	c.JSON(statusCode, response)
}

// LivenessCheck 存活检查端点
func (h *HealthHandler) LivenessCheck(c *gin.Context) {
	// 简单的存活检查，只要服务能响应就认为是存活的
	c.JSON(http.StatusOK, gin.H{
		"alive":     true,
		"timestamp": time.Now(),
	})
}

// MetricsEndpoint Prometheus指标端点
func (h *HealthHandler) MetricsEndpoint(c *gin.Context) {
	// 这个端点通常由prometheus/promhttp包处理
	// 这里只是一个占位符，实际实现会在路由中直接使用promhttp.Handler()
	c.String(http.StatusOK, "Metrics endpoint - handled by promhttp")
}

// checkDatabase 检查数据库连接
func (h *HealthHandler) checkDatabase(ctx context.Context) CheckResult {
	startTime := time.Now()
	
	// 获取底层的sql.DB实例
	sqlDB, err := h.db.DB()
	if err != nil {
		return CheckResult{
			Status:   "unhealthy",
			Duration: time.Since(startTime),
			Error:    "Failed to get database instance: " + err.Error(),
		}
	}
	
	// 检查数据库连接
	if err := sqlDB.PingContext(ctx); err != nil {
		monitoring.RecordError("health_check", "database_ping_failed", "error")
		return CheckResult{
			Status:   "unhealthy",
			Duration: time.Since(startTime),
			Error:    "Database ping failed: " + err.Error(),
		}
	}
	
	// 检查数据库统计信息
	stats := sqlDB.Stats()
	monitoring.DatabaseConnectionsActive.Set(float64(stats.OpenConnections))
	
	return CheckResult{
		Status:   "healthy",
		Duration: time.Since(startTime),
		Message:  "Database connection is healthy",
	}
}

// checkRedis 检查Redis连接
func (h *HealthHandler) checkRedis(ctx context.Context) CheckResult {
	startTime := time.Now()
	
	// 检查Redis连接
	if err := h.redis.Ping(ctx).Err(); err != nil {
		monitoring.RecordError("health_check", "redis_ping_failed", "error")
		return CheckResult{
			Status:   "unhealthy",
			Duration: time.Since(startTime),
			Error:    "Redis ping failed: " + err.Error(),
		}
	}
	
	return CheckResult{
		Status:   "healthy",
		Duration: time.Since(startTime),
		Message:  "Redis connection is healthy",
	}
}

// checkSystem 检查系统资源
func (h *HealthHandler) checkSystem(ctx context.Context) CheckResult {
	startTime := time.Now()
	
	// 这里可以添加更多的系统检查，比如：
	// - 内存使用率
	// - CPU使用率
	// - 磁盘空间
	// - 网络连接
	
	// 简单的系统检查示例
	return CheckResult{
		Status:   "healthy",
		Duration: time.Since(startTime),
		Message:  "System resources are healthy",
	}
}

// RegisterHealthRoutes 注册健康检查路由
func (h *HealthHandler) RegisterHealthRoutes(router *gin.Engine) {
	health := router.Group("/health")
	{
		health.GET("/", h.HealthCheck)
		health.GET("/ready", h.ReadinessCheck)
		health.GET("/live", h.LivenessCheck)
	}
}
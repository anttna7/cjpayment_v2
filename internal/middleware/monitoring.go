package middleware

import (
	"context"
	"runtime/debug"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"cjpayment/pkg/logger"
	"cjpayment/pkg/monitoring"
)

// MonitoringMiddleware 监控中间件
func MonitoringMiddleware(structuredLogger *logger.StructuredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 生成请求ID
		requestID := uuid.New().String()
		c.Set("request_id", requestID)
		
		// 将请求ID添加到上下文
		ctx := context.WithValue(c.Request.Context(), "request_id", requestID)
		c.Request = c.Request.WithContext(ctx)
		
		// 记录请求开始时间
		startTime := time.Now()
		
		// 处理请求
		c.Next()
		
		// 计算请求处理时间
		duration := time.Since(startTime)
		
		// 获取响应状态码
		statusCode := c.Writer.Status()
		statusCodeStr := strconv.Itoa(statusCode)
		
		// 记录Prometheus指标
		monitoring.RecordHTTPRequest(
			c.Request.Method,
			c.FullPath(),
			statusCodeStr,
			duration.Seconds(),
		)
		
		// 记录结构化日志
		structuredLogger.LogAPIRequest(
			ctx,
			c.Request.Method,
			c.Request.URL.Path,
			statusCode,
			duration,
			c.ClientIP(),
		)
		
		// 如果有错误，记录错误指标
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				monitoring.RecordError("api_handler", "request_error", "error")
				structuredLogger.LogError(ctx, "api_handler", "request_processing", err.Err, logger.LogFields{
					"method":      c.Request.Method,
					"path":        c.Request.URL.Path,
					"status_code": statusCode,
				})
			}
		}
	}
}

// PanicRecoveryMiddleware panic恢复中间件
func PanicRecoveryMiddleware(structuredLogger *logger.StructuredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if panicValue := recover(); panicValue != nil {
				// 获取堆栈跟踪
				stackTrace := string(debug.Stack())
				
				// 记录panic指标
				monitoring.RecordPanicRecovery("api_handler", c.FullPath())
				
				// 记录panic日志
				ctx := c.Request.Context()
				structuredLogger.LogPanic(ctx, "api_handler", c.FullPath(), panicValue, stackTrace)
				
				// 返回500错误
				c.JSON(500, gin.H{
					"error": gin.H{
						"code":    "INTERNAL_SERVER_ERROR",
						"message": "Internal server error occurred",
					},
				})
				c.Abort()
			}
		}()
		
		c.Next()
	}
}

// DatabaseMonitoringMiddleware 数据库监控中间件
type DatabaseMonitoringMiddleware struct {
	logger *logger.StructuredLogger
}

// NewDatabaseMonitoringMiddleware 创建数据库监控中间件
func NewDatabaseMonitoringMiddleware(logger *logger.StructuredLogger) *DatabaseMonitoringMiddleware {
	return &DatabaseMonitoringMiddleware{
		logger: logger,
	}
}

// LogQuery 记录数据库查询
func (m *DatabaseMonitoringMiddleware) LogQuery(ctx context.Context, operation, table string, duration time.Duration, rowsAffected int64, err error) {
	// 记录Prometheus指标
	monitoring.RecordDatabaseQuery(operation, table, duration.Seconds())
	
	// 记录结构化日志
	m.logger.LogDatabaseOperation(ctx, operation, table, duration, rowsAffected, err)
	
	// 如果有错误，记录错误指标
	if err != nil {
		monitoring.RecordError("database", "query_error", "error")
	}
}

// CacheMonitoringMiddleware 缓存监控中间件
type CacheMonitoringMiddleware struct {
	logger *logger.StructuredLogger
}

// NewCacheMonitoringMiddleware 创建缓存监控中间件
func NewCacheMonitoringMiddleware(logger *logger.StructuredLogger) *CacheMonitoringMiddleware {
	return &CacheMonitoringMiddleware{
		logger: logger,
	}
}

// LogCacheOperation 记录缓存操作
func (m *CacheMonitoringMiddleware) LogCacheOperation(ctx context.Context, operation, key string, hit bool, duration time.Duration) {
	// 确定缓存类型和键模式
	cacheType := "redis"
	keyPattern := extractKeyPattern(key)
	
	// 记录Prometheus指标
	monitoring.RecordCacheOperation(cacheType, keyPattern, hit)
	
	// 记录结构化日志
	m.logger.LogCacheOperation(ctx, operation, key, hit, duration)
}

// extractKeyPattern 提取键模式
func extractKeyPattern(key string) string {
	// 简单的键模式提取逻辑
	// 可以根据实际需求进行更复杂的模式匹配
	if len(key) > 20 {
		return key[:20] + "*"
	}
	return key
}

// SecurityMonitoringMiddleware 安全监控中间件
func SecurityMonitoringMiddleware(structuredLogger *logger.StructuredLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录安全相关的请求信息
		ctx := c.Request.Context()
		
		// 检查是否有认证信息
		userID := c.GetString("user_id")
		if userID == "" {
			userID = "anonymous"
		}
		
		// 记录访问日志
		structuredLogger.LogSecurityEvent(
			ctx,
			"api_access",
			userID,
			c.ClientIP(),
			c.Request.Method+" "+c.Request.URL.Path,
			true,
			map[string]interface{}{
				"user_agent": c.Request.UserAgent(),
				"referer":    c.Request.Referer(),
			},
		)
		
		c.Next()
		
		// 如果响应状态码表示认证或授权失败，记录安全事件
		statusCode := c.Writer.Status()
		if statusCode == 401 || statusCode == 403 {
			structuredLogger.LogSecurityEvent(
				ctx,
				"access_denied",
				userID,
				c.ClientIP(),
				c.Request.Method+" "+c.Request.URL.Path,
				false,
				map[string]interface{}{
					"status_code": statusCode,
					"user_agent":  c.Request.UserAgent(),
				},
			)
		}
	}
}
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"github.com/company/cjpayment/pkg/errors"
	"github.com/company/cjpayment/pkg/logger"
	"github.com/company/cjpayment/pkg/monitoring"
)

// ErrorHandlerConfig holds configuration for error handling
type ErrorHandlerConfig struct {
	EnableStackTrace bool
	EnableRecovery   bool
	EnableMetrics    bool
	Logger          *logrus.Logger
	AlertManager    AlertManager
}

// AlertManager interface for sending alerts
type AlertManager interface {
	SendAlert(ctx context.Context, alert *Alert) error
}

// Alert represents an error alert
type Alert struct {
	Level     string                 `json:"level"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details"`
	Timestamp time.Time              `json:"timestamp"`
}

// ErrorHandler creates a new error handling middleware
func ErrorHandler(config *ErrorHandlerConfig) gin.HandlerFunc {
	if config == nil {
		config = &ErrorHandlerConfig{
			EnableStackTrace: false,
			EnableRecovery:   true,
			EnableMetrics:    true,
		}
	}

	return gin.HandlerFunc(func(c *gin.Context) {
		// Recovery middleware
		if config.EnableRecovery {
			defer func() {
				if err := recover(); err != nil {
					handlePanic(c, err, config)
				}
			}()
		}

		c.Next()

		// Handle errors that occurred during request processing
		if len(c.Errors) > 0 {
			handleErrors(c, config)
		}
	})
}

// handlePanic handles panic recovery
func handlePanic(c *gin.Context, err interface{}, config *ErrorHandlerConfig) {
	stack := debug.Stack()
	
	// Log the panic
	if config.Logger != nil {
		config.Logger.WithFields(logrus.Fields{
			"error":      err,
			"stack":      string(stack),
			"path":       c.Request.URL.Path,
			"method":     c.Request.Method,
			"user_agent": c.Request.UserAgent(),
			"ip":         c.ClientIP(),
		}).Error("Panic recovered")
	}

	// Create API error
	apiErr := errors.NewAPIError(errors.ErrInternalServer, "系统发生严重错误")
	apiErr.WithRequestID(getRequestID(c))

	// Send alert for critical errors
	if config.AlertManager != nil {
		alert := &Alert{
			Level:   "critical",
			Title:   "System Panic",
			Message: fmt.Sprintf("Panic occurred: %v", err),
			Details: map[string]interface{}{
				"path":       c.Request.URL.Path,
				"method":     c.Request.Method,
				"user_agent": c.Request.UserAgent(),
				"ip":         c.ClientIP(),
				"stack":      string(stack),
			},
			Timestamp: time.Now(),
		}
		go config.AlertManager.SendAlert(context.Background(), alert)
	}

	// Record metrics
	if config.EnableMetrics {
		monitoring.RecordError("panic", c.Request.URL.Path, c.Request.Method)
	}

	// Return error response
	c.JSON(apiErr.StatusCode, gin.H{
		"error": gin.H{
			"code":       apiErr.Code,
			"message":    apiErr.Message,
			"timestamp":  apiErr.Timestamp,
			"request_id": apiErr.RequestID,
		},
	})
	c.Abort()
}

// handleErrors handles errors that occurred during request processing
func handleErrors(c *gin.Context, config *ErrorHandlerConfig) {
	err := c.Errors.Last()
	
	var apiErr *errors.APIError
	var ok bool

	// Check if it's already an APIError
	if apiErr, ok = err.Err.(*errors.APIError); !ok {
		// Convert generic error to APIError
		apiErr = convertToAPIError(err.Err)
	}

	// Add request context
	apiErr.WithRequestID(getRequestID(c))
	if userID := getUserID(c); userID != "" {
		apiErr.WithUserID(userID)
	}

	// Log the error
	logError(apiErr, c, config.Logger)

	// Send alert if necessary
	if shouldSendAlert(apiErr) && config.AlertManager != nil {
		alert := createAlert(apiErr, c)
		go config.AlertManager.SendAlert(context.Background(), alert)
	}

	// Record metrics
	if config.EnableMetrics {
		monitoring.RecordError(string(apiErr.Code), c.Request.URL.Path, c.Request.Method)
	}

	// Prepare response
	response := gin.H{
		"error": gin.H{
			"code":       apiErr.Code,
			"message":    apiErr.Message,
			"timestamp":  apiErr.Timestamp,
			"request_id": apiErr.RequestID,
		},
	}

	// Add details for development environment
	if config.EnableStackTrace && apiErr.Details != nil {
		response["error"].(gin.H)["details"] = apiErr.Details
	}

	// Add retry information for retryable errors
	if apiErr.Retryable {
		response["error"].(gin.H)["retryable"] = true
		response["error"].(gin.H)["retry_after"] = getRetryAfter(apiErr.Code)
	}

	c.JSON(apiErr.StatusCode, response)
	c.Abort()
}

// convertToAPIError converts a generic error to APIError
func convertToAPIError(err error) *errors.APIError {
	if err == nil {
		return errors.NewAPIError(errors.ErrInternalServer, "Unknown error")
	}

	errMsg := err.Error()
	
	// Try to map common error patterns to specific error codes
	switch {
	case strings.Contains(errMsg, "connection refused"):
		return errors.NewAPIError(errors.ErrDatabaseConnection, "数据库连接失败")
	case strings.Contains(errMsg, "timeout"):
		return errors.NewAPIError(errors.ErrNetworkTimeout, "请求超时")
	case strings.Contains(errMsg, "not found"):
		return errors.NewAPIError(errors.ErrOrderNotFound, "资源不存在")
	case strings.Contains(errMsg, "duplicate"):
		return errors.NewAPIError(errors.ErrDuplicateValue, "数据重复")
	case strings.Contains(errMsg, "validation"):
		return errors.NewAPIError(errors.ErrValidationFailed, "数据验证失败")
	default:
		return errors.NewAPIError(errors.ErrInternalServer, errMsg)
	}
}

// logError logs the error with appropriate level
func logError(apiErr *errors.APIError, c *gin.Context, logger *logrus.Logger) {
	if logger == nil {
		return
	}

	fields := logrus.Fields{
		"error_code":  apiErr.Code,
		"severity":    apiErr.Severity,
		"path":        c.Request.URL.Path,
		"method":      c.Request.Method,
		"user_agent":  c.Request.UserAgent(),
		"ip":          c.ClientIP(),
		"request_id":  apiErr.RequestID,
		"user_id":     apiErr.UserID,
		"timestamp":   apiErr.Timestamp,
	}

	if apiErr.Details != nil {
		fields["details"] = apiErr.Details
	}

	entry := logger.WithFields(fields)

	switch apiErr.Severity {
	case errors.SeverityCritical:
		entry.Error(apiErr.Message)
	case errors.SeverityHigh:
		entry.Warn(apiErr.Message)
	case errors.SeverityMedium:
		entry.Info(apiErr.Message)
	default:
		entry.Debug(apiErr.Message)
	}
}

// shouldSendAlert determines if an alert should be sent
func shouldSendAlert(apiErr *errors.APIError) bool {
	return apiErr.Severity == errors.SeverityCritical || 
		   apiErr.Severity == errors.SeverityHigh
}

// createAlert creates an alert from an API error
func createAlert(apiErr *errors.APIError, c *gin.Context) *Alert {
	level := "warning"
	if apiErr.Severity == errors.SeverityCritical {
		level = "critical"
	}

	return &Alert{
		Level:   level,
		Title:   fmt.Sprintf("Error %d: %s", apiErr.Code, apiErr.Message),
		Message: apiErr.Message,
		Details: map[string]interface{}{
			"error_code": apiErr.Code,
			"severity":   apiErr.Severity,
			"path":       c.Request.URL.Path,
			"method":     c.Request.Method,
			"user_id":    apiErr.UserID,
			"request_id": apiErr.RequestID,
			"details":    apiErr.Details,
		},
		Timestamp: apiErr.Timestamp,
	}
}

// getRequestID extracts request ID from context
func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return generateRequestID()
}

// getUserID extracts user ID from context
func getUserID(c *gin.Context) string {
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			return id
		}
	}
	return ""
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return fmt.Sprintf("req_%d", time.Now().UnixNano())
}

// getRetryAfter returns the retry delay for retryable errors
func getRetryAfter(code errors.ErrorCode) int {
	switch code {
	case errors.ErrDatabaseConnection, errors.ErrRedisConnection:
		return 5 // 5 seconds
	case errors.ErrNetworkTimeout, errors.ErrExternalServiceError:
		return 10 // 10 seconds
	case errors.ErrConcurrencyConflict:
		return 1 // 1 second
	default:
		return 30 // 30 seconds
	}
}

// RequestIDMiddleware adds request ID to context
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}
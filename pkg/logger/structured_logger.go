package logger

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/sirupsen/logrus"
)

// StructuredLogger 结构化日志记录器
type StructuredLogger struct {
	*logrus.Logger
	serviceName string
	version     string
}

// LogLevel 日志级别
type LogLevel string

const (
	DebugLevel LogLevel = "debug"
	InfoLevel  LogLevel = "info"
	WarnLevel  LogLevel = "warn"
	ErrorLevel LogLevel = "error"
	FatalLevel LogLevel = "fatal"
	PanicLevel LogLevel = "panic"
)

// LogFields 日志字段
type LogFields map[string]interface{}

// NewStructuredLogger 创建新的结构化日志记录器
func NewStructuredLogger(serviceName, version string) *StructuredLogger {
	logger := logrus.New()
	
	// 设置日志格式为JSON
	logger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
		},
	})
	
	// 设置输出到标准输出
	logger.SetOutput(os.Stdout)
	
	// 设置日志级别
	level := os.Getenv("LOG_LEVEL")
	switch level {
	case "debug":
		logger.SetLevel(logrus.DebugLevel)
	case "info":
		logger.SetLevel(logrus.InfoLevel)
	case "warn":
		logger.SetLevel(logrus.WarnLevel)
	case "error":
		logger.SetLevel(logrus.ErrorLevel)
	default:
		logger.SetLevel(logrus.InfoLevel)
	}
	
	return &StructuredLogger{
		Logger:      logger,
		serviceName: serviceName,
		version:     version,
	}
}

// WithContext 添加上下文信息
func (l *StructuredLogger) WithContext(ctx context.Context) *logrus.Entry {
	entry := l.Logger.WithFields(logrus.Fields{
		"service": l.serviceName,
		"version": l.version,
	})
	
	// 从上下文中提取请求ID、用户ID等信息
	if requestID := ctx.Value("request_id"); requestID != nil {
		entry = entry.WithField("request_id", requestID)
	}
	
	if userID := ctx.Value("user_id"); userID != nil {
		entry = entry.WithField("user_id", userID)
	}
	
	if traceID := ctx.Value("trace_id"); traceID != nil {
		entry = entry.WithField("trace_id", traceID)
	}
	
	return entry
}

// WithFields 添加字段
func (l *StructuredLogger) WithFields(fields LogFields) *logrus.Entry {
	logrusFields := make(logrus.Fields)
	for k, v := range fields {
		logrusFields[k] = v
	}
	
	logrusFields["service"] = l.serviceName
	logrusFields["version"] = l.version
	
	return l.Logger.WithFields(logrusFields)
}

// LogRechargeOrder 记录充值订单日志
func (l *StructuredLogger) LogRechargeOrder(ctx context.Context, orderNo, merchantID, action string, amount float64, status string) {
	l.WithContext(ctx).WithFields(logrus.Fields{
		"component":   "recharge_service",
		"action":      action,
		"order_no":    orderNo,
		"merchant_id": merchantID,
		"amount":      amount,
		"status":      status,
		"event_type":  "recharge_order",
	}).Info("Recharge order event")
}

// LogAccountMatch 记录账号匹配日志
func (l *StructuredLogger) LogAccountMatch(ctx context.Context, merchantID, paymentType string, amount float64, matchedAccountID string, duration time.Duration, success bool, reason string) {
	fields := logrus.Fields{
		"component":          "account_matcher",
		"merchant_id":        merchantID,
		"payment_type":       paymentType,
		"amount":             amount,
		"duration_ms":        duration.Milliseconds(),
		"success":            success,
		"event_type":         "account_match",
	}
	
	if success {
		fields["matched_account_id"] = matchedAccountID
	} else {
		fields["failure_reason"] = reason
	}
	
	entry := l.WithContext(ctx).WithFields(fields)
	if success {
		entry.Info("Account matching completed successfully")
	} else {
		entry.Warn("Account matching failed")
	}
}

// LogMerchantOperation 记录商户操作日志
func (l *StructuredLogger) LogMerchantOperation(ctx context.Context, merchantID, operation string, details map[string]interface{}) {
	fields := logrus.Fields{
		"component":   "merchant_service",
		"merchant_id": merchantID,
		"operation":   operation,
		"event_type":  "merchant_operation",
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	l.WithContext(ctx).WithFields(fields).Info("Merchant operation performed")
}

// LogNotification 记录通知日志
func (l *StructuredLogger) LogNotification(ctx context.Context, notificationType, channel, recipient string, success bool, error string) {
	fields := logrus.Fields{
		"component":         "notification_service",
		"notification_type": notificationType,
		"channel":           channel,
		"recipient":         recipient,
		"success":           success,
		"event_type":        "notification",
	}
	
	if !success && error != "" {
		fields["error"] = error
	}
	
	entry := l.WithContext(ctx).WithFields(fields)
	if success {
		entry.Info("Notification sent successfully")
	} else {
		entry.Error("Notification sending failed")
	}
}

// LogAPIRequest 记录API请求日志
func (l *StructuredLogger) LogAPIRequest(ctx context.Context, method, path string, statusCode int, duration time.Duration, clientIP string) {
	l.WithContext(ctx).WithFields(logrus.Fields{
		"component":   "api_handler",
		"method":      method,
		"path":        path,
		"status_code": statusCode,
		"duration_ms": duration.Milliseconds(),
		"client_ip":   clientIP,
		"event_type":  "api_request",
	}).Info("API request processed")
}

// LogDatabaseOperation 记录数据库操作日志
func (l *StructuredLogger) LogDatabaseOperation(ctx context.Context, operation, table string, duration time.Duration, rowsAffected int64, err error) {
	fields := logrus.Fields{
		"component":      "database",
		"operation":      operation,
		"table":          table,
		"duration_ms":    duration.Milliseconds(),
		"rows_affected":  rowsAffected,
		"event_type":     "database_operation",
	}
	
	entry := l.WithContext(ctx).WithFields(fields)
	
	if err != nil {
		entry.WithField("error", err.Error()).Error("Database operation failed")
	} else {
		entry.Info("Database operation completed")
	}
}

// LogCacheOperation 记录缓存操作日志
func (l *StructuredLogger) LogCacheOperation(ctx context.Context, operation, key string, hit bool, duration time.Duration) {
	l.WithContext(ctx).WithFields(logrus.Fields{
		"component":   "cache",
		"operation":   operation,
		"key":         key,
		"hit":         hit,
		"duration_ms": duration.Milliseconds(),
		"event_type":  "cache_operation",
	}).Debug("Cache operation performed")
}

// LogError 记录错误日志
func (l *StructuredLogger) LogError(ctx context.Context, component, operation string, err error, fields LogFields) {
	logFields := logrus.Fields{
		"component":  component,
		"operation":  operation,
		"error":      err.Error(),
		"event_type": "error",
	}
	
	for k, v := range fields {
		logFields[k] = v
	}
	
	l.WithContext(ctx).WithFields(logFields).Error("Operation failed")
}

// LogPanic 记录panic日志
func (l *StructuredLogger) LogPanic(ctx context.Context, component, operation string, panicValue interface{}, stackTrace string) {
	l.WithContext(ctx).WithFields(logrus.Fields{
		"component":   component,
		"operation":   operation,
		"panic_value": fmt.Sprintf("%v", panicValue),
		"stack_trace": stackTrace,
		"event_type":  "panic",
	}).Error("Panic recovered")
}

// LogSecurityEvent 记录安全事件日志
func (l *StructuredLogger) LogSecurityEvent(ctx context.Context, eventType, userID, clientIP, action string, success bool, details map[string]interface{}) {
	fields := logrus.Fields{
		"component":  "security",
		"event_type": "security_event",
		"security_event_type": eventType,
		"user_id":    userID,
		"client_ip":  clientIP,
		"action":     action,
		"success":    success,
	}
	
	for k, v := range details {
		fields[k] = v
	}
	
	entry := l.WithContext(ctx).WithFields(fields)
	if success {
		entry.Info("Security event recorded")
	} else {
		entry.Warn("Security event - potential threat detected")
	}
}

// LogBusinessMetric 记录业务指标日志
func (l *StructuredLogger) LogBusinessMetric(ctx context.Context, metricName string, value float64, tags map[string]string) {
	fields := logrus.Fields{
		"component":   "business_metrics",
		"metric_name": metricName,
		"value":       value,
		"event_type":  "business_metric",
	}
	
	for k, v := range tags {
		fields[k] = v
	}
	
	l.WithContext(ctx).WithFields(fields).Info("Business metric recorded")
}
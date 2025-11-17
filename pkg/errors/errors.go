package errors

import (
	"fmt"
	"net/http"
	"time"
)

// ErrorCode represents the error code type
type ErrorCode int

// Error code constants for different categories
const (
	// System errors (1000-1999)
	ErrInternalServer     ErrorCode = 1001
	ErrDatabaseConnection ErrorCode = 1002
	ErrRedisConnection    ErrorCode = 1003
	ErrConfigurationError ErrorCode = 1004
	ErrServiceUnavailable ErrorCode = 1005

	// Authentication and Authorization errors (2000-2999)
	ErrUnauthorized       ErrorCode = 2001
	ErrForbidden         ErrorCode = 2002
	ErrTokenExpired      ErrorCode = 2003
	ErrInvalidCredentials ErrorCode = 2004
	ErrPermissionDenied  ErrorCode = 2005

	// Merchant related errors (3000-3999)
	ErrMerchantNotFound     ErrorCode = 3001
	ErrMerchantNameExists   ErrorCode = 3002
	ErrMerchantInactive     ErrorCode = 3003
	ErrMerchantLimitReached ErrorCode = 3004
	ErrMerchantValidation   ErrorCode = 3005

	// Account related errors (4000-4999)
	ErrAccountNotFound      ErrorCode = 4001
	ErrAccountAlreadyBound  ErrorCode = 4002
	ErrAccountLimitExceeded ErrorCode = 4003
	ErrNoAvailableAccount   ErrorCode = 4004
	ErrAccountInactive      ErrorCode = 4005
	ErrAccountValidation    ErrorCode = 4006

	// Order related errors (5000-5999)
	ErrOrderNotFound        ErrorCode = 5001
	ErrOrderStatusInvalid   ErrorCode = 5002
	ErrOrderAmountInvalid   ErrorCode = 5003
	ErrOrderAlreadyPaid     ErrorCode = 5004
	ErrOrderExpired         ErrorCode = 5005
	ErrOrderValidation      ErrorCode = 5006

	// Payment related errors (6000-6999)
	ErrPaymentFailed        ErrorCode = 6001
	ErrPaymentTimeout       ErrorCode = 6002
	ErrPaymentAmountMismatch ErrorCode = 6003
	ErrPaymentProofInvalid  ErrorCode = 6004
	ErrPaymentChannelError  ErrorCode = 6005

	// Validation errors (7000-7999)
	ErrValidationFailed     ErrorCode = 7001
	ErrRequiredFieldMissing ErrorCode = 7002
	ErrInvalidFormat        ErrorCode = 7003
	ErrValueOutOfRange      ErrorCode = 7004
	ErrDuplicateValue       ErrorCode = 7005

	// Business logic errors (8000-8999)
	ErrBusinessRuleViolation ErrorCode = 8001
	ErrInsufficientBalance   ErrorCode = 8002
	ErrOperationNotAllowed   ErrorCode = 8003
	ErrConcurrencyConflict   ErrorCode = 8004
	ErrDataInconsistency     ErrorCode = 8005

	// External service errors (9000-9999)
	ErrExternalServiceError ErrorCode = 9001
	ErrNetworkTimeout       ErrorCode = 9002
	ErrAPIRateLimit         ErrorCode = 9003
	ErrThirdPartyService    ErrorCode = 9004
)

// ErrorSeverity represents the severity level of an error
type ErrorSeverity string

const (
	SeverityCritical ErrorSeverity = "critical"
	SeverityHigh     ErrorSeverity = "high"
	SeverityMedium   ErrorSeverity = "medium"
	SeverityLow      ErrorSeverity = "low"
	SeverityInfo     ErrorSeverity = "info"
)

// APIError represents a structured API error
type APIError struct {
	Code       ErrorCode     `json:"code"`
	Message    string        `json:"message"`
	Details    interface{}   `json:"details,omitempty"`
	Severity   ErrorSeverity `json:"severity"`
	StatusCode int           `json:"-"`
	Timestamp  time.Time     `json:"timestamp"`
	RequestID  string        `json:"request_id,omitempty"`
	UserID     string        `json:"user_id,omitempty"`
	Retryable  bool          `json:"retryable"`
}

// Error implements the error interface
func (e *APIError) Error() string {
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

// NewAPIError creates a new API error
func NewAPIError(code ErrorCode, message string) *APIError {
	return &APIError{
		Code:       code,
		Message:    message,
		Severity:   getErrorSeverity(code),
		StatusCode: getHTTPStatusCode(code),
		Timestamp:  time.Now(),
		Retryable:  isRetryable(code),
	}
}

// NewAPIErrorWithDetails creates a new API error with details
func NewAPIErrorWithDetails(code ErrorCode, message string, details interface{}) *APIError {
	err := NewAPIError(code, message)
	err.Details = details
	return err
}

// WithRequestID adds request ID to the error
func (e *APIError) WithRequestID(requestID string) *APIError {
	e.RequestID = requestID
	return e
}

// WithUserID adds user ID to the error
func (e *APIError) WithUserID(userID string) *APIError {
	e.UserID = userID
	return e
}

// getErrorSeverity returns the severity level for an error code
func getErrorSeverity(code ErrorCode) ErrorSeverity {
	switch {
	case code >= 1000 && code < 2000: // System errors
		return SeverityCritical
	case code >= 2000 && code < 3000: // Auth errors
		return SeverityHigh
	case code >= 3000 && code < 6000: // Business errors
		return SeverityMedium
	case code >= 6000 && code < 8000: // Payment/Validation errors
		return SeverityHigh
	case code >= 8000 && code < 9000: // Business logic errors
		return SeverityMedium
	case code >= 9000 && code < 10000: // External service errors
		return SeverityLow
	default:
		return SeverityMedium
	}
}

// getHTTPStatusCode returns the HTTP status code for an error code
func getHTTPStatusCode(code ErrorCode) int {
	switch {
	case code >= 1000 && code < 2000: // System errors
		return http.StatusInternalServerError
	case code >= 2000 && code < 3000: // Auth errors
		switch code {
		case ErrUnauthorized, ErrTokenExpired, ErrInvalidCredentials:
			return http.StatusUnauthorized
		case ErrForbidden, ErrPermissionDenied:
			return http.StatusForbidden
		default:
			return http.StatusUnauthorized
		}
	case code >= 3000 && code < 6000: // Business errors
		switch code {
		case ErrMerchantNotFound, ErrAccountNotFound, ErrOrderNotFound:
			return http.StatusNotFound
		case ErrMerchantNameExists, ErrAccountAlreadyBound, ErrDuplicateValue:
			return http.StatusConflict
		default:
			return http.StatusBadRequest
		}
	case code >= 6000 && code < 8000: // Payment/Validation errors
		return http.StatusBadRequest
	case code >= 8000 && code < 9000: // Business logic errors
		return http.StatusUnprocessableEntity
	case code >= 9000 && code < 10000: // External service errors
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}

// isRetryable determines if an error is retryable
func isRetryable(code ErrorCode) bool {
	retryableCodes := map[ErrorCode]bool{
		ErrInternalServer:       true,
		ErrDatabaseConnection:   true,
		ErrRedisConnection:      true,
		ErrServiceUnavailable:   true,
		ErrNetworkTimeout:       true,
		ErrExternalServiceError: true,
		ErrThirdPartyService:    true,
		ErrConcurrencyConflict:  true,
	}
	return retryableCodes[code]
}

// ErrorMessages maps error codes to user-friendly messages
var ErrorMessages = map[ErrorCode]string{
	// System errors
	ErrInternalServer:     "系统内部错误，请稍后重试",
	ErrDatabaseConnection: "数据库连接异常，请稍后重试",
	ErrRedisConnection:    "缓存服务异常，请稍后重试",
	ErrConfigurationError: "系统配置错误",
	ErrServiceUnavailable: "服务暂时不可用，请稍后重试",

	// Authentication errors
	ErrUnauthorized:       "未授权访问",
	ErrForbidden:         "访问被拒绝",
	ErrTokenExpired:      "登录已过期，请重新登录",
	ErrInvalidCredentials: "用户名或密码错误",
	ErrPermissionDenied:  "权限不足",

	// Merchant errors
	ErrMerchantNotFound:     "商户不存在",
	ErrMerchantNameExists:   "商户名称已存在",
	ErrMerchantInactive:     "商户已停用",
	ErrMerchantLimitReached: "商户数量已达上限",
	ErrMerchantValidation:   "商户信息验证失败",

	// Account errors
	ErrAccountNotFound:      "收款账号不存在",
	ErrAccountAlreadyBound:  "收款账号已被绑定",
	ErrAccountLimitExceeded: "收款账号限额已超出",
	ErrNoAvailableAccount:   "暂无可用收款账号",
	ErrAccountInactive:      "收款账号已停用",
	ErrAccountValidation:    "收款账号信息验证失败",

	// Order errors
	ErrOrderNotFound:        "订单不存在",
	ErrOrderStatusInvalid:   "订单状态无效",
	ErrOrderAmountInvalid:   "订单金额无效",
	ErrOrderAlreadyPaid:     "订单已支付",
	ErrOrderExpired:         "订单已过期",
	ErrOrderValidation:      "订单信息验证失败",

	// Payment errors
	ErrPaymentFailed:        "支付失败",
	ErrPaymentTimeout:       "支付超时",
	ErrPaymentAmountMismatch: "支付金额不匹配",
	ErrPaymentProofInvalid:  "支付凭证无效",
	ErrPaymentChannelError:  "支付渠道异常",

	// Validation errors
	ErrValidationFailed:     "数据验证失败",
	ErrRequiredFieldMissing: "必填字段缺失",
	ErrInvalidFormat:        "数据格式错误",
	ErrValueOutOfRange:      "数值超出范围",
	ErrDuplicateValue:       "数据重复",

	// Business logic errors
	ErrBusinessRuleViolation: "违反业务规则",
	ErrInsufficientBalance:   "余额不足",
	ErrOperationNotAllowed:   "操作不被允许",
	ErrConcurrencyConflict:   "并发冲突，请重试",
	ErrDataInconsistency:     "数据不一致",

	// External service errors
	ErrExternalServiceError: "外部服务异常",
	ErrNetworkTimeout:       "网络超时",
	ErrAPIRateLimit:         "API调用频率超限",
	ErrThirdPartyService:    "第三方服务异常",
}

// GetErrorMessage returns the user-friendly message for an error code
func GetErrorMessage(code ErrorCode) string {
	if msg, exists := ErrorMessages[code]; exists {
		return msg
	}
	return "未知错误"
}
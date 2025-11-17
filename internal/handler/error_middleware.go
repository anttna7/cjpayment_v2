package handler

import (
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ErrorCode represents standardized error codes for the recharge testing system
type ErrorCode string

const (
	// General error codes
	ErrCodeInternalServer    ErrorCode = "INTERNAL_SERVER_ERROR"
	ErrCodeBadRequest        ErrorCode = "BAD_REQUEST"
	ErrCodeUnauthorized      ErrorCode = "UNAUTHORIZED"
	ErrCodeForbidden         ErrorCode = "FORBIDDEN"
	ErrCodeNotFound          ErrorCode = "NOT_FOUND"
	ErrCodeConflict          ErrorCode = "CONFLICT"
	ErrCodeValidationFailed  ErrorCode = "VALIDATION_FAILED"
	
	// Merchant related error codes
	ErrCodeMerchantNotFound     ErrorCode = "MERCHANT_NOT_FOUND"
	ErrCodeMerchantExists       ErrorCode = "MERCHANT_EXISTS"
	ErrCodeMerchantInactive     ErrorCode = "MERCHANT_INACTIVE"
	ErrCodeMerchantCodeExists   ErrorCode = "MERCHANT_CODE_EXISTS"
	ErrCodeInvalidMerchantCode  ErrorCode = "INVALID_MERCHANT_CODE"
	
	// Account related error codes
	ErrCodeAccountNotFound      ErrorCode = "ACCOUNT_NOT_FOUND"
	ErrCodeAccountExists        ErrorCode = "ACCOUNT_EXISTS"
	ErrCodeAccountInactive      ErrorCode = "ACCOUNT_INACTIVE"
	ErrCodeAccountLimitExceeded ErrorCode = "ACCOUNT_LIMIT_EXCEEDED"
	ErrCodeAccountAlreadyBound  ErrorCode = "ACCOUNT_ALREADY_BOUND"
	ErrCodeAccountNotBound      ErrorCode = "ACCOUNT_NOT_BOUND"
	ErrCodeNoAvailableAccount   ErrorCode = "NO_AVAILABLE_ACCOUNT"
	
	// Order related error codes
	ErrCodeOrderNotFound        ErrorCode = "ORDER_NOT_FOUND"
	ErrCodeOrderExists          ErrorCode = "ORDER_EXISTS"
	ErrCodeInvalidOrderStatus   ErrorCode = "INVALID_ORDER_STATUS"
	ErrCodeOrderAlreadyPaid     ErrorCode = "ORDER_ALREADY_PAID"
	ErrCodeOrderCancelled       ErrorCode = "ORDER_CANCELLED"
	ErrCodeInvalidAmount        ErrorCode = "INVALID_AMOUNT"
	ErrCodeAmountTooLarge       ErrorCode = "AMOUNT_TOO_LARGE"
	ErrCodeAmountTooSmall       ErrorCode = "AMOUNT_TOO_SMALL"
	
	// Export related error codes
	ErrCodeExportNotFound       ErrorCode = "EXPORT_NOT_FOUND"
	ErrCodeExportFailed         ErrorCode = "EXPORT_FAILED"
	ErrCodeExportExpired        ErrorCode = "EXPORT_EXPIRED"
	ErrCodeInvalidExportFormat  ErrorCode = "INVALID_EXPORT_FORMAT"
	ErrCodeExportTooLarge       ErrorCode = "EXPORT_TOO_LARGE"
	
	// System related error codes
	ErrCodeDatabaseError        ErrorCode = "DATABASE_ERROR"
	ErrCodeCacheError           ErrorCode = "CACHE_ERROR"
	ErrCodeFileSystemError      ErrorCode = "FILESYSTEM_ERROR"
	ErrCodeNetworkError         ErrorCode = "NETWORK_ERROR"
	ErrCodeConfigurationError   ErrorCode = "CONFIGURATION_ERROR"
)

// APIError represents a structured API error
type APIError struct {
	Code       ErrorCode              `json:"code"`
	Message    string                 `json:"message"`
	Details    string                 `json:"details,omitempty"`
	Field      string                 `json:"field,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	StatusCode int                    `json:"-"`
}

// Error implements the error interface
func (e *APIError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s (%s)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// NewAPIError creates a new API error
func NewAPIError(code ErrorCode, message string, statusCode int) *APIError {
	return &APIError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// WithDetails adds details to the API error
func (e *APIError) WithDetails(details string) *APIError {
	e.Details = details
	return e
}

// WithField adds field information to the API error
func (e *APIError) WithField(field string) *APIError {
	e.Field = field
	return e
}

// WithMetadata adds metadata to the API error
func (e *APIError) WithMetadata(metadata map[string]interface{}) *APIError {
	e.Metadata = metadata
	return e
}

// ErrorMiddleware provides comprehensive error handling for the API
type ErrorMiddleware struct {
	enableStackTrace bool
	logger           Logger
}

// Logger interface for error logging
type Logger interface {
	Error(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
}

// NewErrorMiddleware creates a new error middleware
func NewErrorMiddleware(enableStackTrace bool, logger Logger) *ErrorMiddleware {
	return &ErrorMiddleware{
		enableStackTrace: enableStackTrace,
		logger:           logger,
	}
}

// Handle is the main error handling middleware
func (em *ErrorMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				em.handlePanic(c, r)
			}
		}()
		
		c.Next()
		
		// Handle errors that occurred during request processing
		if len(c.Errors) > 0 {
			em.handleErrors(c)
		}
	}
}

// handlePanic handles panic recovery
func (em *ErrorMiddleware) handlePanic(c *gin.Context, r interface{}) {
	stackTrace := string(debug.Stack())
	
	if em.logger != nil {
		em.logger.Error("Panic recovered",
			"error", r,
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"stack_trace", stackTrace,
		)
	}
	
	apiErr := NewAPIError(
		ErrCodeInternalServer,
		"Internal server error occurred",
		http.StatusInternalServerError,
	)
	
	if em.enableStackTrace {
		apiErr.WithDetails(fmt.Sprintf("Panic: %v", r))
		apiErr.WithMetadata(map[string]interface{}{
			"stack_trace": stackTrace,
		})
	}
	
	em.sendErrorResponse(c, apiErr)
}

// handleErrors processes accumulated errors
func (em *ErrorMiddleware) handleErrors(c *gin.Context) {
	lastError := c.Errors.Last()
	
	// Try to convert to APIError first
	if apiErr, ok := lastError.Err.(*APIError); ok {
		em.sendErrorResponse(c, apiErr)
		return
	}
	
	// Handle different error types
	apiErr := em.convertToAPIError(lastError.Err)
	
	// Log the error
	if em.logger != nil {
		em.logger.Error("Request error",
			"error", lastError.Err.Error(),
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"code", apiErr.Code,
		)
	}
	
	em.sendErrorResponse(c, apiErr)
}

// convertToAPIError converts various error types to APIError
func (em *ErrorMiddleware) convertToAPIError(err error) *APIError {
	// Handle validation errors
	if validationErr, ok := err.(validator.ValidationErrors); ok {
		return em.handleValidationErrors(validationErr)
	}
	
	// Handle specific error types
	switch {
	case em.isNotFoundError(err):
		return em.createNotFoundError(err)
	case em.isConflictError(err):
		return em.createConflictError(err)
	case em.isBadRequestError(err):
		return em.createBadRequestError(err)
	case em.isDatabaseError(err):
		return em.createDatabaseError(err)
	default:
		return NewAPIError(
			ErrCodeInternalServer,
			"An unexpected error occurred",
			http.StatusInternalServerError,
		).WithDetails(err.Error())
	}
}

// handleValidationErrors converts validation errors to APIError
func (em *ErrorMiddleware) handleValidationErrors(validationErr validator.ValidationErrors) *APIError {
	validationErrors := make(map[string]string)
	
	for _, fieldErr := range validationErr {
		fieldName := em.getJSONFieldName(fieldErr)
		validationErrors[fieldName] = em.getValidationErrorMessage(fieldErr)
	}
	
	return NewAPIError(
		ErrCodeValidationFailed,
		"Validation failed",
		http.StatusBadRequest,
	).WithMetadata(map[string]interface{}{
		"validation_errors": validationErrors,
	})
}

// Error type checking functions
func (em *ErrorMiddleware) isNotFoundError(err error) bool {
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "not found") ||
		strings.Contains(errMsg, "does not exist") ||
		strings.Contains(errMsg, "no rows")
}

func (em *ErrorMiddleware) isConflictError(err error) bool {
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "already exists") ||
		strings.Contains(errMsg, "duplicate") ||
		strings.Contains(errMsg, "conflict") ||
		strings.Contains(errMsg, "unique constraint")
}

func (em *ErrorMiddleware) isBadRequestError(err error) bool {
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "invalid") ||
		strings.Contains(errMsg, "bad request") ||
		strings.Contains(errMsg, "malformed")
}

func (em *ErrorMiddleware) isDatabaseError(err error) bool {
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "database") ||
		strings.Contains(errMsg, "sql") ||
		strings.Contains(errMsg, "connection") ||
		strings.Contains(errMsg, "timeout")
}

// Error creation functions
func (em *ErrorMiddleware) createNotFoundError(err error) *APIError {
	errMsg := err.Error()
	
	switch {
	case strings.Contains(errMsg, "merchant"):
		return NewAPIError(ErrCodeMerchantNotFound, "Merchant not found", http.StatusNotFound)
	case strings.Contains(errMsg, "account"):
		return NewAPIError(ErrCodeAccountNotFound, "Account not found", http.StatusNotFound)
	case strings.Contains(errMsg, "order"):
		return NewAPIError(ErrCodeOrderNotFound, "Order not found", http.StatusNotFound)
	case strings.Contains(errMsg, "export"):
		return NewAPIError(ErrCodeExportNotFound, "Export not found", http.StatusNotFound)
	default:
		return NewAPIError(ErrCodeNotFound, "Resource not found", http.StatusNotFound)
	}
}

func (em *ErrorMiddleware) createConflictError(err error) *APIError {
	errMsg := err.Error()
	
	switch {
	case strings.Contains(errMsg, "merchant") && strings.Contains(errMsg, "code"):
		return NewAPIError(ErrCodeMerchantCodeExists, "Merchant code already exists", http.StatusConflict)
	case strings.Contains(errMsg, "merchant"):
		return NewAPIError(ErrCodeMerchantExists, "Merchant already exists", http.StatusConflict)
	case strings.Contains(errMsg, "account"):
		return NewAPIError(ErrCodeAccountExists, "Account already exists", http.StatusConflict)
	case strings.Contains(errMsg, "order"):
		return NewAPIError(ErrCodeOrderExists, "Order already exists", http.StatusConflict)
	default:
		return NewAPIError(ErrCodeConflict, "Resource conflict", http.StatusConflict)
	}
}

func (em *ErrorMiddleware) createBadRequestError(err error) *APIError {
	errMsg := err.Error()
	
	switch {
	case strings.Contains(errMsg, "amount"):
		return NewAPIError(ErrCodeInvalidAmount, "Invalid amount", http.StatusBadRequest)
	case strings.Contains(errMsg, "status"):
		return NewAPIError(ErrCodeInvalidOrderStatus, "Invalid status", http.StatusBadRequest)
	case strings.Contains(errMsg, "format"):
		return NewAPIError(ErrCodeInvalidExportFormat, "Invalid format", http.StatusBadRequest)
	default:
		return NewAPIError(ErrCodeBadRequest, "Bad request", http.StatusBadRequest)
	}
}

func (em *ErrorMiddleware) createDatabaseError(err error) *APIError {
	return NewAPIError(
		ErrCodeDatabaseError,
		"Database operation failed",
		http.StatusInternalServerError,
	).WithDetails("Please try again later")
}

// sendErrorResponse sends the error response to the client
func (em *ErrorMiddleware) sendErrorResponse(c *gin.Context, apiErr *APIError) {
	response := gin.H{
		"success": false,
		"error": gin.H{
			"code":    apiErr.Code,
			"message": apiErr.Message,
		},
	}
	
	if apiErr.Details != "" {
		response["error"].(gin.H)["details"] = apiErr.Details
	}
	
	if apiErr.Field != "" {
		response["error"].(gin.H)["field"] = apiErr.Field
	}
	
	if apiErr.Metadata != nil {
		for key, value := range apiErr.Metadata {
			response["error"].(gin.H)[key] = value
		}
	}
	
	// Add request ID if available
	if requestID := c.GetString("request_id"); requestID != "" {
		response["request_id"] = requestID
	}
	
	c.JSON(apiErr.StatusCode, response)
}

// Helper functions for validation error handling
func (em *ErrorMiddleware) getJSONFieldName(fieldErr validator.FieldError) string {
	// Convert field name to snake_case
	fieldName := fieldErr.Field()
	return em.toSnakeCase(fieldName)
}

func (em *ErrorMiddleware) getValidationErrorMessage(fieldErr validator.FieldError) string {
	field := fieldErr.Field()
	tag := fieldErr.Tag()
	param := fieldErr.Param()
	
	switch tag {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s", field, param)
	case "max":
		return fmt.Sprintf("%s must be at most %s", field, param)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", field)
	case "decimal":
		return fmt.Sprintf("%s must be a valid decimal number", field)
	case "positive_decimal":
		return fmt.Sprintf("%s must be a positive decimal number", field)
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, param)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

func (em *ErrorMiddleware) toSnakeCase(str string) string {
	var result strings.Builder
	for i, r := range str {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// Predefined API errors for common use cases
var (
	ErrMerchantNotFound = NewAPIError(
		ErrCodeMerchantNotFound,
		"Merchant not found",
		http.StatusNotFound,
	)
	
	ErrMerchantInactive = NewAPIError(
		ErrCodeMerchantInactive,
		"Merchant is inactive",
		http.StatusForbidden,
	)
	
	ErrAccountNotFound = NewAPIError(
		ErrCodeAccountNotFound,
		"Account not found",
		http.StatusNotFound,
	)
	
	ErrAccountLimitExceeded = NewAPIError(
		ErrCodeAccountLimitExceeded,
		"Account limit exceeded",
		http.StatusBadRequest,
	)
	
	ErrOrderNotFound = NewAPIError(
		ErrCodeOrderNotFound,
		"Order not found",
		http.StatusNotFound,
	)
	
	ErrInvalidAmount = NewAPIError(
		ErrCodeInvalidAmount,
		"Invalid amount",
		http.StatusBadRequest,
	)
	
	ErrExportNotFound = NewAPIError(
		ErrCodeExportNotFound,
		"Export not found",
		http.StatusNotFound,
	)
)

// Helper functions for creating specific errors
func NewMerchantNotFoundError(merchantID uuid.UUID) *APIError {
	return NewAPIError(
		ErrCodeMerchantNotFound,
		"Merchant not found",
		http.StatusNotFound,
	).WithMetadata(map[string]interface{}{
		"merchant_id": merchantID,
	})
}

func NewAccountNotFoundError(accountID uuid.UUID) *APIError {
	return NewAPIError(
		ErrCodeAccountNotFound,
		"Account not found",
		http.StatusNotFound,
	).WithMetadata(map[string]interface{}{
		"account_id": accountID,
	})
}

func NewOrderNotFoundError(orderID uuid.UUID) *APIError {
	return NewAPIError(
		ErrCodeOrderNotFound,
		"Order not found",
		http.StatusNotFound,
	).WithMetadata(map[string]interface{}{
		"order_id": orderID,
	})
}

func NewInvalidAmountError(amount decimal.Decimal, reason string) *APIError {
	return NewAPIError(
		ErrCodeInvalidAmount,
		"Invalid amount",
		http.StatusBadRequest,
	).WithDetails(reason).WithMetadata(map[string]interface{}{
		"amount": amount,
	})
}

func NewValidationError(field, message string) *APIError {
	return NewAPIError(
		ErrCodeValidationFailed,
		"Validation failed",
		http.StatusBadRequest,
	).WithField(field).WithDetails(message)
}
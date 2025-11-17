package handler

import (
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ValidationMiddleware provides comprehensive API parameter validation
type ValidationMiddleware struct {
	validator *validator.Validate
}

// NewValidationMiddleware creates a new validation middleware
func NewValidationMiddleware() *ValidationMiddleware {
	v := validator.New()
	
	// Register custom validators
	v.RegisterValidation("uuid", validateUUID)
	v.RegisterValidation("decimal", validateDecimal)
	v.RegisterValidation("positive_decimal", validatePositiveDecimal)
	v.RegisterValidation("date", validateDate)
	v.RegisterValidation("datetime", validateDateTime)
	v.RegisterValidation("phone", validatePhone)
	v.RegisterValidation("merchant_code", validateMerchantCode)
	v.RegisterValidation("account_number", validateAccountNumber)
	v.RegisterValidation("payment_type", validatePaymentType)
	v.RegisterValidation("order_status", validateOrderStatus)
	v.RegisterValidation("merchant_status", validateMerchantStatus)
	v.RegisterValidation("export_format", validateExportFormat)
	
	return &ValidationMiddleware{
		validator: v,
	}
}

// ValidateJSON validates JSON request body
func (vm *ValidationMiddleware) ValidateJSON(obj interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := c.ShouldBindJSON(obj); err != nil {
			vm.handleValidationError(c, err)
			return
		}
		
		if err := vm.validator.Struct(obj); err != nil {
			vm.handleValidationError(c, err)
			return
		}
		
		c.Next()
	}
}

// ValidateQuery validates query parameters
func (vm *ValidationMiddleware) ValidateQuery(rules map[string]string) gin.HandlerFunc {
	return func(c *gin.Context) {
		errors := make(map[string]string)
		
		for param, rule := range rules {
			value := c.Query(param)
			if value == "" {
				continue // Skip empty optional parameters
			}
			
			if err := vm.validateValue(value, rule); err != nil {
				errors[param] = err.Error()
			}
		}
		
		if len(errors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid query parameters",
				"validation_errors": errors,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// ValidatePathParams validates path parameters
func (vm *ValidationMiddleware) ValidatePathParams(rules map[string]string) gin.HandlerFunc {
	return func(c *gin.Context) {
		errors := make(map[string]string)
		
		for param, rule := range rules {
			value := c.Param(param)
			if value == "" {
				errors[param] = "Parameter is required"
				continue
			}
			
			if err := vm.validateValue(value, rule); err != nil {
				errors[param] = err.Error()
			}
		}
		
		if len(errors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid path parameters",
				"validation_errors": errors,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// ValidatePagination validates pagination parameters
func (vm *ValidationMiddleware) ValidatePagination() gin.HandlerFunc {
	return func(c *gin.Context) {
		errors := make(map[string]string)
		
		// Validate page parameter
		if pageStr := c.Query("page"); pageStr != "" {
			if page, err := strconv.Atoi(pageStr); err != nil || page < 1 {
				errors["page"] = "Page must be a positive integer"
			}
		}
		
		// Validate limit parameter
		if limitStr := c.Query("limit"); limitStr != "" {
			if limit, err := strconv.Atoi(limitStr); err != nil || limit < 1 || limit > 100 {
				errors["limit"] = "Limit must be between 1 and 100"
			}
		}
		
		if len(errors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid pagination parameters",
				"validation_errors": errors,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// ValidateDateRange validates date range parameters
func (vm *ValidationMiddleware) ValidateDateRange() gin.HandlerFunc {
	return func(c *gin.Context) {
		errors := make(map[string]string)
		
		startDateStr := c.Query("start_date")
		endDateStr := c.Query("end_date")
		
		var startDate, endDate time.Time
		var err error
		
		// Validate start_date
		if startDateStr != "" {
			startDate, err = time.Parse("2006-01-02", startDateStr)
			if err != nil {
				errors["start_date"] = "Invalid date format, expected YYYY-MM-DD"
			}
		}
		
		// Validate end_date
		if endDateStr != "" {
			endDate, err = time.Parse("2006-01-02", endDateStr)
			if err != nil {
				errors["end_date"] = "Invalid date format, expected YYYY-MM-DD"
			}
		}
		
		// Validate date range logic
		if startDateStr != "" && endDateStr != "" && len(errors) == 0 {
			if endDate.Before(startDate) {
				errors["date_range"] = "End date must be after start date"
			}
			
			// Check if date range is not too large (e.g., max 1 year)
			if endDate.Sub(startDate) > 365*24*time.Hour {
				errors["date_range"] = "Date range cannot exceed 365 days"
			}
		}
		
		if len(errors) > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid date range parameters",
				"validation_errors": errors,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// handleValidationError handles validation errors and returns appropriate response
func (vm *ValidationMiddleware) handleValidationError(c *gin.Context, err error) {
	var validationErrors map[string]string
	
	if validationErr, ok := err.(validator.ValidationErrors); ok {
		validationErrors = make(map[string]string)
		for _, fieldErr := range validationErr {
			fieldName := vm.getJSONFieldName(fieldErr)
			validationErrors[fieldName] = vm.getValidationErrorMessage(fieldErr)
		}
	} else {
		// Handle JSON binding errors
		validationErrors = map[string]string{
			"json": "Invalid JSON format: " + err.Error(),
		}
	}
	
	c.JSON(http.StatusBadRequest, gin.H{
		"error": "Validation failed",
		"validation_errors": validationErrors,
	})
	c.Abort()
}

// validateValue validates a single value against a rule
func (vm *ValidationMiddleware) validateValue(value, rule string) error {
	// Create a temporary struct for validation
	tempStruct := struct {
		Value string `validate:""`
	}{Value: value}
	
	// Set the validation tag
	field := reflect.TypeOf(tempStruct).Field(0)
	field.Tag = reflect.StructTag(fmt.Sprintf(`validate:"%s"`, rule))
	
	return vm.validator.Var(value, rule)
}

// getJSONFieldName extracts the JSON field name from validation error
func (vm *ValidationMiddleware) getJSONFieldName(fieldErr validator.FieldError) string {
	// This would typically use reflection to get the JSON tag
	// For simplicity, we'll convert the field name to snake_case
	fieldName := fieldErr.Field()
	return vm.toSnakeCase(fieldName)
}

// getValidationErrorMessage returns a user-friendly error message
func (vm *ValidationMiddleware) getValidationErrorMessage(fieldErr validator.FieldError) string {
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
	case "date":
		return fmt.Sprintf("%s must be a valid date (YYYY-MM-DD)", field)
	case "datetime":
		return fmt.Sprintf("%s must be a valid datetime", field)
	case "phone":
		return fmt.Sprintf("%s must be a valid phone number", field)
	case "merchant_code":
		return fmt.Sprintf("%s must be a valid merchant code", field)
	case "account_number":
		return fmt.Sprintf("%s must be a valid account number", field)
	case "payment_type":
		return fmt.Sprintf("%s must be either 'private' or 'public'", field)
	case "order_status":
		return fmt.Sprintf("%s must be a valid order status", field)
	case "merchant_status":
		return fmt.Sprintf("%s must be a valid merchant status", field)
	case "export_format":
		return fmt.Sprintf("%s must be either 'excel' or 'csv'", field)
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, param)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

// toSnakeCase converts camelCase to snake_case
func (vm *ValidationMiddleware) toSnakeCase(str string) string {
	var result strings.Builder
	for i, r := range str {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// Custom validation functions

func validateUUID(fl validator.FieldLevel) bool {
	_, err := uuid.Parse(fl.Field().String())
	return err == nil
}

func validateDecimal(fl validator.FieldLevel) bool {
	_, err := decimal.NewFromString(fl.Field().String())
	return err == nil
}

func validatePositiveDecimal(fl validator.FieldLevel) bool {
	d, err := decimal.NewFromString(fl.Field().String())
	if err != nil {
		return false
	}
	return d.GreaterThan(decimal.Zero)
}

func validateDate(fl validator.FieldLevel) bool {
	_, err := time.Parse("2006-01-02", fl.Field().String())
	return err == nil
}

func validateDateTime(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	formats := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}
	
	for _, format := range formats {
		if _, err := time.Parse(format, value); err == nil {
			return true
		}
	}
	return false
}

func validatePhone(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	// Simple phone validation - starts with + or digit, 10-15 digits
	if len(phone) < 10 || len(phone) > 15 {
		return false
	}
	
	for i, r := range phone {
		if i == 0 && r == '+' {
			continue
		}
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func validateMerchantCode(fl validator.FieldLevel) bool {
	code := fl.Field().String()
	// Merchant code: 3-20 alphanumeric characters
	if len(code) < 3 || len(code) > 20 {
		return false
	}
	
	for _, r := range code {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-') {
			return false
		}
	}
	return true
}

func validateAccountNumber(fl validator.FieldLevel) bool {
	accountNumber := fl.Field().String()
	// Account number: 8-30 alphanumeric characters
	if len(accountNumber) < 8 || len(accountNumber) > 30 {
		return false
	}
	
	for _, r := range accountNumber {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')) {
			return false
		}
	}
	return true
}

func validatePaymentType(fl validator.FieldLevel) bool {
	paymentType := fl.Field().String()
	return paymentType == "private" || paymentType == "public"
}

func validateOrderStatus(fl validator.FieldLevel) bool {
	status := fl.Field().String()
	validStatuses := []string{"pending", "paid", "confirmed", "completed", "cancelled"}
	
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

func validateMerchantStatus(fl validator.FieldLevel) bool {
	status := fl.Field().String()
	validStatuses := []string{"active", "inactive", "suspended"}
	
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

func validateExportFormat(fl validator.FieldLevel) bool {
	format := fl.Field().String()
	return format == "excel" || format == "csv"
}

// Validation rule constants for common use cases
const (
	UUIDRule           = "required,uuid"
	OptionalUUIDRule   = "omitempty,uuid"
	DecimalRule        = "required,decimal"
	PositiveDecimalRule = "required,positive_decimal"
	DateRule           = "required,date"
	OptionalDateRule   = "omitempty,date"
	PhoneRule          = "required,phone"
	OptionalPhoneRule  = "omitempty,phone"
	MerchantCodeRule   = "required,merchant_code"
	AccountNumberRule  = "required,account_number"
	PaymentTypeRule    = "required,payment_type"
	OrderStatusRule    = "required,order_status"
	MerchantStatusRule = "required,merchant_status"
	ExportFormatRule   = "required,export_format"
	PaginationPageRule = "omitempty,min=1"
	PaginationLimitRule = "omitempty,min=1,max=100"
)

// Common validation rule sets
var (
	PaginationRules = map[string]string{
		"page":  PaginationPageRule,
		"limit": PaginationLimitRule,
	}
	
	DateRangeRules = map[string]string{
		"start_date": OptionalDateRule,
		"end_date":   OptionalDateRule,
	}
	
	MerchantFilterRules = map[string]string{
		"status":        "omitempty,merchant_status",
		"business_type": "omitempty,min=1,max=50",
	}
	
	OrderFilterRules = map[string]string{
		"status":       "omitempty,order_status",
		"payment_type": "omitempty,payment_type",
		"merchant_id":  OptionalUUIDRule,
	}
)
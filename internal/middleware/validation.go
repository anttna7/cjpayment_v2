package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/company/cjpayment/pkg/security"
	"github.com/company/cjpayment/pkg/validation"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ValidationMiddleware provides request validation middleware
type ValidationMiddleware struct {
	inputValidator    *security.InputValidator
	businessValidator *validation.BusinessValidator
}

// NewValidationMiddleware creates a new validation middleware
func NewValidationMiddleware() *ValidationMiddleware {
	return &ValidationMiddleware{
		inputValidator:    security.NewInputValidator(),
		businessValidator: validation.NewBusinessValidator(),
	}
}

// ValidateRechargeOrder validates recharge order creation request
func (m *ValidationMiddleware) ValidateRechargeOrder() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			PayerName    string `json:"payer_name" binding:"required"`
			PayerAccount string `json:"payer_account" binding:"required"`
			PaymentType  string `json:"payment_type" binding:"required"`
			Amount       string `json:"amount" binding:"required"`
			MerchantName string `json:"merchant_name" binding:"required"`
			AdAccount    string `json:"ad_account" binding:"required"`
			Remark       string `json:"remark"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": err.Error(),
				"code":    "INVALID_REQUEST_FORMAT",
			})
			c.Abort()
			return
		}

		// Sanitize inputs
		req.PayerName = m.inputValidator.SanitizeInput(req.PayerName)
		req.PayerAccount = m.inputValidator.SanitizeInput(req.PayerAccount)
		req.PaymentType = m.inputValidator.SanitizeInput(req.PaymentType)
		req.Amount = m.inputValidator.SanitizeInput(req.Amount)
		req.MerchantName = m.inputValidator.SanitizeInput(req.MerchantName)
		req.AdAccount = m.inputValidator.SanitizeInput(req.AdAccount)
		req.Remark = m.inputValidator.SanitizeInput(req.Remark)

		// Check for injection attacks
		fields := map[string]string{
			"payer_name":    req.PayerName,
			"payer_account": req.PayerAccount,
			"merchant_name": req.MerchantName,
			"ad_account":    req.AdAccount,
			"remark":        req.Remark,
		}

		for fieldName, value := range fields {
			if m.inputValidator.CheckSQLInjection(value) || m.inputValidator.CheckXSS(value) {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   fmt.Sprintf("Field %s contains potentially dangerous content", fieldName),
					"code":    "SECURITY_VIOLATION",
					"field":   fieldName,
				})
				c.Abort()
				return
			}
		}

		// Parse and validate amount
		amount, err := m.businessValidator.ParseAmount(req.Amount)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid amount format",
				"details": err.Error(),
				"code":    "INVALID_AMOUNT",
				"field":   "amount",
			})
			c.Abort()
			return
		}

		// Business validation
		validationReq := &validation.RechargeOrderValidationRequest{
			PayerName:    req.PayerName,
			PayerAccount: req.PayerAccount,
			PaymentType:  req.PaymentType,
			Amount:       amount,
			MerchantName: req.MerchantName,
			AdAccount:    req.AdAccount,
			Remark:       req.Remark,
		}

		result := m.businessValidator.ValidateRechargeOrder(c.Request.Context(), validationReq)
		if !result.Valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Validation failed",
				"code":       "VALIDATION_FAILED",
				"validation": result,
			})
			c.Abort()
			return
		}

		// Store validated data in context
		c.Set("validated_request", validationReq)
		c.Next()
	}
}

// ValidateMerchant validates merchant creation/update request
func (m *ValidationMiddleware) ValidateMerchant() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name          string `json:"name" binding:"required"`
			Code          string `json:"code" binding:"required"`
			ContactPerson string `json:"contact_person" binding:"required"`
			ContactPhone  string `json:"contact_phone" binding:"required"`
			ContactEmail  string `json:"contact_email" binding:"required"`
			DailyLimit    string `json:"daily_limit"`
			SingleLimit   string `json:"single_limit"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": err.Error(),
				"code":    "INVALID_REQUEST_FORMAT",
			})
			c.Abort()
			return
		}

		// Sanitize inputs
		req.Name = m.inputValidator.SanitizeInput(req.Name)
		req.Code = m.inputValidator.SanitizeInput(req.Code)
		req.ContactPerson = m.inputValidator.SanitizeInput(req.ContactPerson)
		req.ContactPhone = m.inputValidator.SanitizeInput(req.ContactPhone)
		req.ContactEmail = m.inputValidator.SanitizeInput(req.ContactEmail)
		req.DailyLimit = m.inputValidator.SanitizeInput(req.DailyLimit)
		req.SingleLimit = m.inputValidator.SanitizeInput(req.SingleLimit)

		// Parse limits
		var dailyLimit, singleLimit decimal.Decimal
		var err error

		if req.DailyLimit != "" {
			dailyLimit, err = m.businessValidator.ParseAmount(req.DailyLimit)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid daily limit format",
					"details": err.Error(),
					"code":    "INVALID_DAILY_LIMIT",
					"field":   "daily_limit",
				})
				c.Abort()
				return
			}
		}

		if req.SingleLimit != "" {
			singleLimit, err = m.businessValidator.ParseAmount(req.SingleLimit)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid single limit format",
					"details": err.Error(),
					"code":    "INVALID_SINGLE_LIMIT",
					"field":   "single_limit",
				})
				c.Abort()
				return
			}
		}

		// Business validation
		validationReq := &validation.MerchantValidationRequest{
			Name:          req.Name,
			Code:          req.Code,
			ContactPerson: req.ContactPerson,
			ContactPhone:  req.ContactPhone,
			ContactEmail:  req.ContactEmail,
			DailyLimit:    dailyLimit,
			SingleLimit:   singleLimit,
		}

		result := m.businessValidator.ValidateMerchant(c.Request.Context(), validationReq)
		if !result.Valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Validation failed",
				"code":       "VALIDATION_FAILED",
				"validation": result,
			})
			c.Abort()
			return
		}

		// Store validated data in context
		c.Set("validated_request", validationReq)
		c.Next()
	}
}

// ValidateReceiveAccount validates receive account creation/update request
func (m *ValidationMiddleware) ValidateReceiveAccount() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			AccountName   string `json:"account_name" binding:"required"`
			AccountNumber string `json:"account_number" binding:"required"`
			AccountType   string `json:"account_type" binding:"required"`
			BankName      string `json:"bank_name"`
			BankBranch    string `json:"bank_branch"`
			AccountHolder string `json:"account_holder" binding:"required"`
			PaymentType   string `json:"payment_type" binding:"required"`
			DailyLimit    string `json:"daily_limit"`
			SingleLimit   string `json:"single_limit"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request format",
				"details": err.Error(),
				"code":    "INVALID_REQUEST_FORMAT",
			})
			c.Abort()
			return
		}

		// Sanitize inputs
		req.AccountName = m.inputValidator.SanitizeInput(req.AccountName)
		req.AccountNumber = m.inputValidator.SanitizeInput(req.AccountNumber)
		req.AccountType = m.inputValidator.SanitizeInput(req.AccountType)
		req.BankName = m.inputValidator.SanitizeInput(req.BankName)
		req.BankBranch = m.inputValidator.SanitizeInput(req.BankBranch)
		req.AccountHolder = m.inputValidator.SanitizeInput(req.AccountHolder)
		req.PaymentType = m.inputValidator.SanitizeInput(req.PaymentType)
		req.DailyLimit = m.inputValidator.SanitizeInput(req.DailyLimit)
		req.SingleLimit = m.inputValidator.SanitizeInput(req.SingleLimit)

		// Parse limits
		var dailyLimit, singleLimit decimal.Decimal
		var err error

		if req.DailyLimit != "" {
			dailyLimit, err = m.businessValidator.ParseAmount(req.DailyLimit)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid daily limit format",
					"details": err.Error(),
					"code":    "INVALID_DAILY_LIMIT",
					"field":   "daily_limit",
				})
				c.Abort()
				return
			}
		}

		if req.SingleLimit != "" {
			singleLimit, err = m.businessValidator.ParseAmount(req.SingleLimit)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "Invalid single limit format",
					"details": err.Error(),
					"code":    "INVALID_SINGLE_LIMIT",
					"field":   "single_limit",
				})
				c.Abort()
				return
			}
		}

		// Business validation
		validationReq := &validation.ReceiveAccountValidationRequest{
			AccountName:   req.AccountName,
			AccountNumber: req.AccountNumber,
			AccountType:   req.AccountType,
			BankName:      req.BankName,
			BankBranch:    req.BankBranch,
			AccountHolder: req.AccountHolder,
			PaymentType:   req.PaymentType,
			DailyLimit:    dailyLimit,
			SingleLimit:   singleLimit,
		}

		result := m.businessValidator.ValidateReceiveAccount(c.Request.Context(), validationReq)
		if !result.Valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Validation failed",
				"code":       "VALIDATION_FAILED",
				"validation": result,
			})
			c.Abort()
			return
		}

		// Store validated data in context
		c.Set("validated_request", validationReq)
		c.Next()
	}
}

// ValidateUUID validates UUID path parameter
func (m *ValidationMiddleware) ValidateUUID(paramName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param(paramName)
		if idStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Missing %s parameter", paramName),
				"code":  "MISSING_PARAMETER",
				"field": paramName,
			})
			c.Abort()
			return
		}

		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   fmt.Sprintf("Invalid %s format", paramName),
				"details": err.Error(),
				"code":    "INVALID_UUID",
				"field":   paramName,
			})
			c.Abort()
			return
		}

		// Store parsed UUID in context
		c.Set(fmt.Sprintf("validated_%s", paramName), id)
		c.Next()
	}
}

// ValidatePagination validates pagination query parameters
func (m *ValidationMiddleware) ValidatePagination() gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

		if err := m.businessValidator.ValidatePagination(page, limit); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Invalid pagination parameters",
				"code":       "INVALID_PAGINATION",
				"validation": []validation.ValidationError{*err},
			})
			c.Abort()
			return
		}

		// Normalize values
		if page < 1 {
			page = 1
		}
		if limit < 1 || limit > 100 {
			limit = 20
		}

		// Store validated pagination in context
		c.Set("validated_page", page)
		c.Set("validated_limit", limit)
		c.Next()
	}
}

// ValidateTimeRange validates time range query parameters
func (m *ValidationMiddleware) ValidateTimeRange() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTimeStr := c.Query("start_time")
		endTimeStr := c.Query("end_time")

		var startTime, endTime *time.Time

		if startTimeStr != "" {
			t, err := time.Parse(time.RFC3339, startTimeStr)
			if err != nil {
				// Try alternative format
				t, err = time.Parse("2006-01-02 15:04:05", startTimeStr)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"error":   "Invalid start_time format, expected RFC3339 or 'YYYY-MM-DD HH:MM:SS'",
						"details": err.Error(),
						"code":    "INVALID_TIME_FORMAT",
						"field":   "start_time",
					})
					c.Abort()
					return
				}
			}
			startTime = &t
		}

		if endTimeStr != "" {
			t, err := time.Parse(time.RFC3339, endTimeStr)
			if err != nil {
				// Try alternative format
				t, err = time.Parse("2006-01-02 15:04:05", endTimeStr)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"error":   "Invalid end_time format, expected RFC3339 or 'YYYY-MM-DD HH:MM:SS'",
						"details": err.Error(),
						"code":    "INVALID_TIME_FORMAT",
						"field":   "end_time",
					})
					c.Abort()
					return
				}
			}
			endTime = &t
		}

		// Validate time range
		if err := m.businessValidator.ValidateTimeRange(startTime, endTime); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Invalid time range",
				"code":       "INVALID_TIME_RANGE",
				"validation": []validation.ValidationError{*err},
			})
			c.Abort()
			return
		}

		// Store validated time range in context
		c.Set("validated_start_time", startTime)
		c.Set("validated_end_time", endTime)
		c.Next()
	}
}

// ValidateOrderNumber validates order number parameter
func (m *ValidationMiddleware) ValidateOrderNumber() gin.HandlerFunc {
	return func(c *gin.Context) {
		orderNumber := c.Query("order_number")
		if orderNumber == "" {
			c.Next()
			return
		}

		orderNumber = m.inputValidator.SanitizeInput(orderNumber)

		if err := m.businessValidator.ValidateOrderNumber(orderNumber); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":      "Invalid order number",
				"code":       "INVALID_ORDER_NUMBER",
				"validation": []validation.ValidationError{*err},
			})
			c.Abort()
			return
		}

		c.Set("validated_order_number", orderNumber)
		c.Next()
	}
}

// ValidateStatus validates status query parameter
func (m *ValidationMiddleware) ValidateStatus(allowedStatuses []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		status := c.Query("status")
		if status == "" {
			c.Next()
			return
		}

		status = m.inputValidator.SanitizeInput(status)

		// Check if status is in allowed list
		found := false
		for _, allowed := range allowedStatuses {
			if status == allowed {
				found = true
				break
			}
		}

		if !found {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   fmt.Sprintf("Invalid status value, allowed values: %s", strings.Join(allowedStatuses, ", ")),
				"code":    "INVALID_STATUS",
				"field":   "status",
				"allowed": allowedStatuses,
			})
			c.Abort()
			return
		}

		c.Set("validated_status", status)
		c.Next()
	}
}

// ValidateSearchKeyword validates search keyword parameter
func (m *ValidationMiddleware) ValidateSearchKeyword() gin.HandlerFunc {
	return func(c *gin.Context) {
		keyword := c.Query("search")
		if keyword == "" {
			c.Next()
			return
		}

		keyword = m.inputValidator.SanitizeInput(keyword)

		// Check for injection attacks
		if m.inputValidator.CheckSQLInjection(keyword) || m.inputValidator.CheckXSS(keyword) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Search keyword contains potentially dangerous content",
				"code":  "SECURITY_VIOLATION",
				"field": "search",
			})
			c.Abort()
			return
		}

		// Limit keyword length
		if len(keyword) > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Search keyword is too long (max 100 characters)",
				"code":  "KEYWORD_TOO_LONG",
				"field": "search",
			})
			c.Abort()
			return
		}

		c.Set("validated_search", keyword)
		c.Next()
	}
}

// ValidateFileUpload validates file upload
func (m *ValidationMiddleware) ValidateFileUpload(fieldName string, allowedTypes []string, maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		file, header, err := c.Request.FormFile(fieldName)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   fmt.Sprintf("Failed to get uploaded file from field %s", fieldName),
				"details": err.Error(),
				"code":    "FILE_UPLOAD_ERROR",
				"field":   fieldName,
			})
			c.Abort()
			return
		}
		defer file.Close()

		// Check file size
		if header.Size > maxSize {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":     fmt.Sprintf("File size exceeds maximum allowed size of %d bytes", maxSize),
				"code":      "FILE_TOO_LARGE",
				"field":     fieldName,
				"file_size": header.Size,
				"max_size":  maxSize,
			})
			c.Abort()
			return
		}

		// Check file type
		contentType := header.Header.Get("Content-Type")
		if len(allowedTypes) > 0 {
			found := false
			for _, allowed := range allowedTypes {
				if contentType == allowed {
					found = true
					break
				}
			}

			if !found {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":        "Invalid file type",
					"code":         "INVALID_FILE_TYPE",
					"field":        fieldName,
					"content_type": contentType,
					"allowed":      allowedTypes,
				})
				c.Abort()
				return
			}
		}

		// Check filename
		filename := header.Filename
		if filename == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Filename cannot be empty",
				"code":  "EMPTY_FILENAME",
				"field": fieldName,
			})
			c.Abort()
			return
		}

		// Sanitize filename
		filename = m.inputValidator.SanitizeInput(filename)
		if len(filename) > 255 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Filename is too long (max 255 characters)",
				"code":  "FILENAME_TOO_LONG",
				"field": fieldName,
			})
			c.Abort()
			return
		}

		// Store validated file info in context
		c.Set(fmt.Sprintf("validated_%s_file", fieldName), file)
		c.Set(fmt.Sprintf("validated_%s_header", fieldName), header)
		c.Set(fmt.Sprintf("validated_%s_filename", fieldName), filename)
		c.Next()
	}
}

// ValidateJSONRequest validates generic JSON request
func (m *ValidationMiddleware) ValidateJSONRequest(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check content type
		contentType := c.GetHeader("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Content-Type must be application/json",
				"code":  "INVALID_CONTENT_TYPE",
			})
			c.Abort()
			return
		}

		// Check content length
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":          fmt.Sprintf("Request body too large (max %d bytes)", maxSize),
				"code":           "REQUEST_TOO_LARGE",
				"content_length": c.Request.ContentLength,
				"max_size":       maxSize,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetValidatedValue retrieves validated value from context
func GetValidatedValue[T any](c *gin.Context, key string) (T, bool) {
	value, exists := c.Get(key)
	if !exists {
		var zero T
		return zero, false
	}

	typedValue, ok := value.(T)
	return typedValue, ok
}

// GetValidatedRequest retrieves validated request from context
func GetValidatedRequest[T any](c *gin.Context) (T, bool) {
	return GetValidatedValue[T](c, "validated_request")
}

// GetValidatedUUID retrieves validated UUID from context
func GetValidatedUUID(c *gin.Context, paramName string) (uuid.UUID, bool) {
	return GetValidatedValue[uuid.UUID](c, fmt.Sprintf("validated_%s", paramName))
}

// GetValidatedPagination retrieves validated pagination from context
func GetValidatedPagination(c *gin.Context) (page, limit int, ok bool) {
	page, pageOk := GetValidatedValue[int](c, "validated_page")
	limit, limitOk := GetValidatedValue[int](c, "validated_limit")
	return page, limit, pageOk && limitOk
}

// GetValidatedTimeRange retrieves validated time range from context
func GetValidatedTimeRange(c *gin.Context) (startTime, endTime *time.Time, ok bool) {
	startTime, _ = GetValidatedValue[*time.Time](c, "validated_start_time")
	endTime, _ = GetValidatedValue[*time.Time](c, "validated_end_time")
	return startTime, endTime, true
}
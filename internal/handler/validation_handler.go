package handler

import (
	"context"
	"fmt"
	"net/http"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/company/cjpayment/pkg/validation"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// ValidationRequest represents a field validation request
type ValidationRequest struct {
	Field   string                 `json:"field" binding:"required"`
	Value   string                 `json:"value" binding:"required"`
	Context map[string]interface{} `json:"context"`
}

// ValidationResponse represents a validation response
type ValidationResponse struct {
	Valid  bool                        `json:"valid"`
	Errors []validation.ValidationError `json:"errors,omitempty"`
}

// ValidateField validates a single field with business rules
func (h *Handler) ValidateField(c *gin.Context) {
	var req ValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	businessValidator := validation.NewBusinessValidator()
	
	switch req.Field {
	case "merchantName":
		result := h.validateMerchantName(c.Request.Context(), req.Value)
		c.JSON(http.StatusOK, ValidationResponse{
			Valid:  result.Valid,
			Errors: convertBusinessErrors(result.Errors),
		})
		
	case "merchantCode":
		result := h.validateMerchantCode(c.Request.Context(), req.Value)
		c.JSON(http.StatusOK, ValidationResponse{
			Valid:  result.Valid,
			Errors: convertBusinessErrors(result.Errors),
		})
		
	case "accountNumber":
		accountType, _ := req.Context["accountType"].(string)
		result := h.validateAccountNumber(c.Request.Context(), req.Value, accountType)
		c.JSON(http.StatusOK, ValidationResponse{
			Valid:  result.Valid,
			Errors: convertBusinessErrors(result.Errors),
		})
		
	case "amount":
		merchantName, _ := req.Context["merchantName"].(string)
		result := h.validateAmount(c.Request.Context(), req.Value, merchantName)
		c.JSON(http.StatusOK, ValidationResponse{
			Valid:  result.Valid,
			Errors: convertBusinessErrors(result.Errors),
		})
		
	default:
		// For other fields, just do basic validation
		validationReq := &validation.RechargeOrderValidationRequest{}
		
		// Set the field value based on field name
		switch req.Field {
		case "payerName":
			validationReq.PayerName = req.Value
		case "payerAccount":
			validationReq.PayerAccount = req.Value
			if paymentType, ok := req.Context["paymentType"].(string); ok {
				validationReq.PaymentType = paymentType
			}
		case "adAccount":
			validationReq.AdAccount = req.Value
		case "remark":
			validationReq.Remark = req.Value
		}
		
		result := businessValidator.ValidateRechargeOrder(c.Request.Context(), validationReq)
		c.JSON(http.StatusOK, ValidationResponse{
			Valid:  result.Valid,
			Errors: result.Errors,
		})
	}
}

// validateMerchantName validates merchant name and checks if it exists
func (h *Handler) validateMerchantName(ctx context.Context, merchantName string) service.BusinessValidationResult {
	// Check if merchant exists by code (using name as code for now)
	merchant, err := h.merchantService.GetMerchantByCode(ctx, merchantName)
	if err != nil {
		return service.BusinessValidationResult{
			Valid: false,
			Errors: []service.BusinessValidationError{
				{
					Field:   "merchantName",
					Message: "商户不存在",
					Code:    "MERCHANT_NOT_FOUND",
				},
			},
		}
	}
	
	// Check if merchant is active
	if merchant.Status != "active" {
		return service.BusinessValidationResult{
			Valid: false,
			Errors: []service.BusinessValidationError{
				{
					Field:   "merchantName",
					Message: "商户状态异常，无法进行充值",
					Code:    "MERCHANT_INACTIVE",
				},
			},
		}
	}
	
	return service.BusinessValidationResult{Valid: true}
}

// validateMerchantCode validates merchant code uniqueness
func (h *Handler) validateMerchantCode(ctx context.Context, code string) service.BusinessValidationResult {
	// Check if code already exists
	_, err := h.merchantService.GetMerchantByCode(ctx, code)
	if err == nil {
		return service.BusinessValidationResult{
			Valid: false,
			Errors: []service.BusinessValidationError{
				{
					Field:   "code",
					Message: "商户编码已存在",
					Code:    "CODE_ALREADY_EXISTS",
				},
			},
		}
	}
	
	return service.BusinessValidationResult{Valid: true}
}

// validateAccountNumber validates account number uniqueness
func (h *Handler) validateAccountNumber(ctx context.Context, accountNumber, accountType string) service.BusinessValidationResult {
	// Check if account number already exists for this type
	filter := &repository.ReceiveAccountFilter{
		AccountType: &accountType,
		Limit:       1,
	}
	
	accounts, _, err := h.accountService.ListReceiveAccounts(ctx, filter)
	if err != nil {
		// Don't fail validation on query errors
		return service.BusinessValidationResult{Valid: true}
	}
	
	if len(accounts) > 0 {
		return service.BusinessValidationResult{
			Valid: false,
			Errors: []service.BusinessValidationError{
				{
					Field:   "accountNumber",
					Message: "该账户号码已存在",
					Code:    "ACCOUNT_NUMBER_EXISTS",
				},
			},
		}
	}
	
	return service.BusinessValidationResult{Valid: true}
}

// validateAmount validates amount against merchant and system limits
func (h *Handler) validateAmount(ctx context.Context, amountStr, merchantName string) service.BusinessValidationResult {
	// Parse amount
	amount, err := decimal.NewFromString(amountStr)
	if err != nil {
		return service.BusinessValidationResult{
			Valid: false,
			Errors: []service.BusinessValidationError{
				{
					Field:   "amount",
					Message: "金额格式无效",
					Code:    "INVALID_AMOUNT_FORMAT",
				},
			},
		}
	}
	
	// Get merchant to check limits
	if merchantName != "" {
		merchant, err := h.merchantService.GetMerchantByCode(ctx, merchantName)
		if err == nil {
			// Check merchant single limit
			if !merchant.SingleLimit.IsZero() && amount.GreaterThan(merchant.SingleLimit) {
				return service.BusinessValidationResult{
					Valid: false,
					Errors: []service.BusinessValidationError{
						{
							Field:   "amount",
							Message: fmt.Sprintf("金额超过商户单笔限额 %s 元", merchant.SingleLimit.String()),
							Code:    "AMOUNT_EXCEEDS_MERCHANT_LIMIT",
						},
					},
				}
			}
		}
	}
	
	return service.BusinessValidationResult{Valid: true}
}

// convertBusinessErrors converts business validation errors to validation errors
func convertBusinessErrors(businessErrors []service.BusinessValidationError) []validation.ValidationError {
	var errors []validation.ValidationError
	for _, err := range businessErrors {
		errors = append(errors, validation.ValidationError{
			Field:   err.Field,
			Message: err.Message,
			Code:    err.Code,
		})
	}
	return errors
}

// ValidateBatchFields validates multiple fields at once
func (h *Handler) ValidateBatchFields(c *gin.Context) {
	var req struct {
		Fields  map[string]string      `json:"fields" binding:"required"`
		Context map[string]interface{} `json:"context"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}
	
	results := make(map[string]ValidationResponse)
	
	for fieldName, value := range req.Fields {
		// Create a temporary context for individual field validation
		tempC := &gin.Context{}
		tempC.Request = c.Request
		
		// Validate each field (reuse the single field validation logic)
		switch fieldName {
		case "merchantName":
			result := h.validateMerchantName(c.Request.Context(), value)
			results[fieldName] = ValidationResponse{
				Valid:  result.Valid,
				Errors: convertBusinessErrors(result.Errors),
			}
		case "merchantCode":
			result := h.validateMerchantCode(c.Request.Context(), value)
			results[fieldName] = ValidationResponse{
				Valid:  result.Valid,
				Errors: convertBusinessErrors(result.Errors),
			}
		case "accountNumber":
			accountType, _ := req.Context["accountType"].(string)
			result := h.validateAccountNumber(c.Request.Context(), value, accountType)
			results[fieldName] = ValidationResponse{
				Valid:  result.Valid,
				Errors: convertBusinessErrors(result.Errors),
			}
		case "amount":
			merchantName, _ := req.Context["merchantName"].(string)
			result := h.validateAmount(c.Request.Context(), value, merchantName)
			results[fieldName] = ValidationResponse{
				Valid:  result.Valid,
				Errors: convertBusinessErrors(result.Errors),
			}
		default:
			// Basic validation for other fields
			businessValidator := validation.NewBusinessValidator()
			validationReq := &validation.RechargeOrderValidationRequest{}
			
			switch fieldName {
			case "payerName":
				validationReq.PayerName = value
			case "payerAccount":
				validationReq.PayerAccount = value
				if paymentType, ok := req.Context["paymentType"].(string); ok {
					validationReq.PaymentType = paymentType
				}
			case "adAccount":
				validationReq.AdAccount = value
			case "remark":
				validationReq.Remark = value
			}
			
			result := businessValidator.ValidateRechargeOrder(c.Request.Context(), validationReq)
			results[fieldName] = ValidationResponse{
				Valid:  result.Valid,
				Errors: result.Errors,
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": results,
	})
}
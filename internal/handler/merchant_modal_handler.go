package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// Merchant modal specific error types
var (
	ErrMerchantNameExists         = errors.New("公司名称已存在")
	ErrPortNameExists            = errors.New("端口名称已被使用")
	ErrAccountNumberExists       = errors.New("收款账号已存在")
	ErrInvalidAccountFormat      = errors.New("账号格式不正确")
	ErrLimitValidation          = errors.New("单笔限额不能大于单日限额")
	ErrMissingPaymentProvider   = errors.New("选择其它类型时必须填写收单机构名称")
)

// CreateMerchantModal creates a new merchant with receive account through modal
func (h *Handler) CreateMerchantModal(c *gin.Context) {
	var req service.CreateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleMerchantModalError(c, err)
		return
	}

	// Validate the request using merchant validator
	if h.merchantValidator != nil {
		if err := h.merchantValidator.ValidateCreateMerchantRequest(c.Request.Context(), &req); err != nil {
			h.handleMerchantModalError(c, err)
			return
		}
	}

	// Create merchant
	merchant, err := h.merchantService.CreateMerchant(c.Request.Context(), &req)
	if err != nil {
		h.handleMerchantModalError(c, err)
		return
	}

	// Update agent suggestion usage count if agent name is provided
	if req.AgentName != nil && *req.AgentName != "" {
		if err := h.agentSuggestionRepo.IncrementUsage(c.Request.Context(), *req.AgentName); err != nil {
			// Log error but don't fail the request
			// TODO: Add proper logging
		}
	}

	// If receive account is provided, create it and associate with merchant
	if req.ReceiveAccount != nil {
		account, err := h.accountService.CreateReceiveAccount(c.Request.Context(), req.ReceiveAccount)
		if err != nil {
			// Rollback merchant creation if account creation fails
			h.merchantService.DeleteMerchant(c.Request.Context(), merchant.ID)
			h.handleMerchantModalError(c, err)
			return
		}

		// Associate account with merchant
		assignReq := &service.AssignAccountToMerchantRequest{
			MerchantID:       merchant.ID,
			ReceiveAccountID: account.ID,
			Weight:           100, // Default weight
		}
		
		if err := h.accountService.AssignAccountToMerchant(c.Request.Context(), assignReq); err != nil {
			// Rollback both merchant and account creation
			h.accountService.DeleteReceiveAccount(c.Request.Context(), account.ID)
			h.merchantService.DeleteMerchant(c.Request.Context(), merchant.ID)
			h.handleMerchantModalError(c, err)
			return
		}
	}

	// Convert to response format
	response := h.convertMerchantToResponse(merchant, nil)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
		"message": "商户创建成功",
	})
}

// UpdateMerchantModal updates an existing merchant through modal
func (h *Handler) UpdateMerchantModal(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, service.ErrorResponse{
			Code:    "INVALID_MERCHANT_ID",
			Message: "商户ID格式不正确",
		})
		return
	}

	var req service.UpdateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.handleMerchantModalError(c, err)
		return
	}

	// Validate the request using merchant validator
	if h.merchantValidator != nil {
		if err := h.merchantValidator.ValidateUpdateMerchantRequest(c.Request.Context(), id, &req); err != nil {
			h.handleMerchantModalError(c, err)
			return
		}
	}

	// Update merchant
	merchant, err := h.merchantService.UpdateMerchant(c.Request.Context(), id, &req)
	if err != nil {
		h.handleMerchantModalError(c, err)
		return
	}

	// Update agent suggestion usage count if agent name is provided and changed
	if req.AgentName != nil && *req.AgentName != "" {
		if err := h.agentSuggestionRepo.IncrementUsage(c.Request.Context(), *req.AgentName); err != nil {
			// Log error but don't fail the request
			// TODO: Add proper logging
		}
	}

	// Convert to response format
	response := h.convertMerchantToResponse(merchant, nil)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"message": "商户更新成功",
	})
}

// GetMerchantWithAccounts retrieves a merchant with its associated accounts
func (h *Handler) GetMerchantWithAccounts(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, service.ErrorResponse{
			Code:    "INVALID_MERCHANT_ID",
			Message: "商户ID格式不正确",
		})
		return
	}

	// Get merchant
	merchant, err := h.merchantService.GetMerchant(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, service.ErrorResponse{
			Code:    "MERCHANT_NOT_FOUND",
			Message: "商户不存在",
			Details: err.Error(),
		})
		return
	}

	// Get associated accounts
	accounts, err := h.accountService.GetAccountsByMerchant(c.Request.Context(), id)
	if err != nil {
		// Log error but don't fail the request
		accounts = []*repository.ReceiveAccount{}
	}

	// Convert accounts to response format
	accountResponses := make([]*service.ReceiveAccountResponse, len(accounts))
	for i, account := range accounts {
		accountResponses[i] = h.convertAccountToResponse(account)
	}

	// Convert to response format
	response := h.convertMerchantToResponse(merchant, accountResponses)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetAgentSuggestions retrieves agent name suggestions for autocomplete
func (h *Handler) GetAgentSuggestions(c *gin.Context) {
	query := c.Query("q")
	limitStr := c.DefaultQuery("limit", "10")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		limit = 10
	}

	// Get suggestions from agent suggestion repository
	suggestions, err := h.agentSuggestionRepo.Search(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, service.ErrorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "获取代理商建议失败",
			Details: err.Error(),
		})
		return
	}

	// Convert to response format
	responses := make([]*service.AgentSuggestionResponse, len(suggestions))
	for i, suggestion := range suggestions {
		responses[i] = &service.AgentSuggestionResponse{
			AgentName:  suggestion.AgentName,
			UsageCount: suggestion.UsageCount,
			LastUsedAt: suggestion.LastUsedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    responses,
	})
}

// ValidatePortName validates port name availability
func (h *Handler) ValidatePortName(c *gin.Context) {
	portName := c.Query("port_name")
	if portName == "" {
		c.JSON(http.StatusBadRequest, service.ErrorResponse{
			Code:    "MISSING_PORT_NAME",
			Message: "端口名称不能为空",
		})
		return
	}

	// Validate format
	if h.merchantValidator != nil {
		if err := h.merchantValidator.ValidatePortNameFormat(portName); err != nil {
			c.JSON(http.StatusOK, service.PortValidationResponse{
				IsValid:   false,
				Message:   err.Error(),
				Available: false,
			})
			return
		}

		// Check uniqueness
		if err := h.merchantValidator.ValidatePortNameUniqueness(c.Request.Context(), portName); err != nil {
			c.JSON(http.StatusOK, service.PortValidationResponse{
				IsValid:   true,
				Message:   err.Error(),
				Available: false,
			})
			return
		}
	}

	c.JSON(http.StatusOK, service.PortValidationResponse{
		IsValid:   true,
		Message:   "端口名称可用",
		Available: true,
	})
}

// convertMerchantToResponse converts repository.Merchant to service.MerchantResponse
func (h *Handler) convertMerchantToResponse(merchant *repository.Merchant, accounts []*service.ReceiveAccountResponse) *service.MerchantResponse {
	return &service.MerchantResponse{
		ID:            merchant.ID,
		Name:          merchant.Name,
		Code:          merchant.Code,
		ContactPerson: merchant.ContactPerson,
		ContactPhone:  merchant.ContactPhone,
		ContactEmail:  merchant.ContactEmail,
		Status:        merchant.Status,
		DailyLimit:    merchant.DailyLimit,
		SingleLimit:   merchant.SingleLimit,
		DailyUsed:     merchant.DailyUsed,
		AgentName:     merchant.AgentName,
		PortName:      merchant.PortName,
		Remark:        merchant.Remark,
		Accounts:      accounts,
		CreatedAt:     merchant.CreatedAt,
		UpdatedAt:     merchant.UpdatedAt,
	}
}

// convertAccountToResponse converts repository.ReceiveAccount to service.ReceiveAccountResponse
func (h *Handler) convertAccountToResponse(account *repository.ReceiveAccount) *service.ReceiveAccountResponse {
	return &service.ReceiveAccountResponse{
		ID:                    account.ID,
		AccountName:           account.AccountName,
		AccountNumber:         account.AccountNumber,
		AccountType:           account.AccountType,
		CustomPaymentProvider: account.CustomPaymentProvider,
		AccountHolder:         account.AccountHolder,
		PaymentType:           account.PaymentType,
		BankName:              account.BankName,
		BankBranch:            account.BankBranch,
		Status:                account.Status,
		DailyLimit:            account.DailyLimit,
		SingleLimit:           account.SingleLimit,
		DailyUsed:             account.DailyUsed,
		CreatedAt:             account.CreatedAt,
		UpdatedAt:             account.UpdatedAt,
	}
}

// handleMerchantModalError handles errors specific to merchant modal operations
func (h *Handler) handleMerchantModalError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrMerchantNameExists):
		c.JSON(http.StatusConflict, service.ErrorResponse{
			Code:    "MERCHANT_NAME_EXISTS",
			Message: err.Error(),
		})
	case errors.Is(err, ErrPortNameExists):
		c.JSON(http.StatusConflict, service.ErrorResponse{
			Code:    "PORT_NAME_EXISTS",
			Message: err.Error(),
		})
	case errors.Is(err, ErrAccountNumberExists):
		c.JSON(http.StatusConflict, service.ErrorResponse{
			Code:    "ACCOUNT_NUMBER_EXISTS",
			Message: err.Error(),
		})
	case errors.Is(err, ErrLimitValidation):
		c.JSON(http.StatusBadRequest, service.ErrorResponse{
			Code:    "LIMIT_VALIDATION_ERROR",
			Message: err.Error(),
		})
	case errors.Is(err, ErrMissingPaymentProvider):
		c.JSON(http.StatusBadRequest, service.ErrorResponse{
			Code:    "MISSING_PAYMENT_PROVIDER",
			Message: err.Error(),
		})
	case errors.Is(err, ErrInvalidAccountFormat):
		c.JSON(http.StatusBadRequest, service.ErrorResponse{
			Code:    "INVALID_ACCOUNT_FORMAT",
			Message: err.Error(),
		})
	default:
		// Handle validation errors from gin binding
		if validationErr, ok := err.(validator.ValidationErrors); ok {
			validationErrors := make(map[string]string)
			for _, fieldErr := range validationErr {
				validationErrors[fieldErr.Field()] = fieldErr.Tag()
			}
			c.JSON(http.StatusBadRequest, service.ErrorResponse{
				Code:             "VALIDATION_ERROR",
				Message:          "请求参数验证失败",
				ValidationErrors: validationErrors,
			})
		} else {
			c.JSON(http.StatusInternalServerError, service.ErrorResponse{
				Code:    "INTERNAL_ERROR",
				Message: "服务器内部错误",
				Details: err.Error(),
			})
		}
	}
}
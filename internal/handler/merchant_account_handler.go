package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// MerchantAccountHandler handles HTTP requests for merchant account operations
type MerchantAccountHandler struct {
	merchantAccountService service.MerchantAccountService
}

// NewMerchantAccountHandler creates a new merchant account handler
func NewMerchantAccountHandler(merchantAccountService service.MerchantAccountService) *MerchantAccountHandler {
	return &MerchantAccountHandler{
		merchantAccountService: merchantAccountService,
	}
}

// RegisterRoutes registers all merchant account routes
func (h *MerchantAccountHandler) RegisterRoutes(router *gin.RouterGroup) {
	merchantAccounts := router.Group("/merchant-accounts")
	{
		// Account binding operations
		merchantAccounts.POST("/bind", h.BindAccount)
		merchantAccounts.DELETE("/:merchantId/accounts/:accountId", h.UnbindAccount)
		merchantAccounts.GET("/:merchantId", h.ListMerchantAccounts)
		
		// Priority management
		merchantAccounts.PUT("/:merchantId/accounts/:accountId/priority", h.UpdateAccountPriority)
		merchantAccounts.PUT("/:merchantId/priorities", h.ReorderAccountPriorities)
		
		// Account availability and validation
		merchantAccounts.GET("/:merchantId/available", h.GetAvailableAccounts)
		merchantAccounts.POST("/validate-binding", h.ValidateAccountBinding)
		merchantAccounts.POST("/check-availability", h.CheckAccountAvailability)
		
		// Usage statistics and load balancing
		merchantAccounts.GET("/:merchantId/usage-stats", h.GetAccountUsageStatistics)
		merchantAccounts.GET("/:merchantId/load-balancing-recommendations", h.GetLoadBalancingRecommendations)
		
		// Batch operations
		merchantAccounts.POST("/batch-bind", h.BatchBindAccounts)
		merchantAccounts.PUT("/:merchantId/batch-priorities", h.BatchUpdatePriorities)
		
		// Account status management
		merchantAccounts.PUT("/:merchantId/accounts/:accountId/enable", h.EnableAccount)
		merchantAccounts.PUT("/:merchantId/accounts/:accountId/disable", h.DisableAccount)
		merchantAccounts.GET("/:merchantId/accounts/:accountId/status", h.GetAccountStatus)
	}
}

// BindAccount binds a receive account to a merchant
func (h *MerchantAccountHandler) BindAccount(c *gin.Context) {
	var req service.BindAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.merchantAccountService.BindAccount(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to bind account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Account bound successfully",
	})
}

// UnbindAccount removes the binding between a merchant and receive account
func (h *MerchantAccountHandler) UnbindAccount(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	accountID, err := uuid.Parse(c.Param("accountId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID",
		})
		return
	}

	if err := h.merchantAccountService.UnbindAccount(c.Request.Context(), merchantID, accountID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to unbind account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account unbound successfully",
	})
}

// ListMerchantAccounts retrieves all accounts bound to a merchant
func (h *MerchantAccountHandler) ListMerchantAccounts(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	accounts, err := h.merchantAccountService.ListMerchantAccounts(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve merchant accounts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": accounts,
		"count": len(accounts),
	})
}

// UpdateAccountPriority updates the priority of a bound account
func (h *MerchantAccountHandler) UpdateAccountPriority(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	accountID, err := uuid.Parse(c.Param("accountId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID",
		})
		return
	}

	var req struct {
		Priority int `json:"priority" binding:"required,min=1,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.merchantAccountService.UpdateAccountPriority(c.Request.Context(), merchantID, accountID, req.Priority); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to update account priority",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account priority updated successfully",
	})
}

// ReorderAccountPriorities updates multiple account priorities in batch
func (h *MerchantAccountHandler) ReorderAccountPriorities(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	var req struct {
		AccountPriorities []service.AccountPriority `json:"account_priorities" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.merchantAccountService.ReorderAccountPriorities(c.Request.Context(), merchantID, req.AccountPriorities); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to reorder account priorities",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account priorities reordered successfully",
	})
}

// GetAvailableAccounts retrieves available accounts for a merchant based on criteria
func (h *MerchantAccountHandler) GetAvailableAccounts(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	paymentType := c.Query("payment_type")
	amountStr := c.Query("amount")
	
	var amount decimal.Decimal
	if amountStr != "" {
		amount, err = decimal.NewFromString(amountStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid amount format",
			})
			return
		}
	}

	accounts, err := h.merchantAccountService.GetAvailableAccounts(c.Request.Context(), merchantID, paymentType, amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve available accounts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": accounts,
		"count": len(accounts),
	})
}

// ValidateAccountBinding validates if an account can be bound to a merchant
func (h *MerchantAccountHandler) ValidateAccountBinding(c *gin.Context) {
	var req struct {
		MerchantID uuid.UUID `json:"merchant_id" binding:"required"`
		AccountID  uuid.UUID `json:"account_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.merchantAccountService.ValidateAccountBinding(c.Request.Context(), req.MerchantID, req.AccountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to validate account binding",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// CheckAccountAvailability checks if an account can accept a specific amount
func (h *MerchantAccountHandler) CheckAccountAvailability(c *gin.Context) {
	var req struct {
		AccountID uuid.UUID       `json:"account_id" binding:"required"`
		Amount    decimal.Decimal `json:"amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.merchantAccountService.CheckAccountAvailability(c.Request.Context(), req.AccountID, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to check account availability",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// GetAccountUsageStatistics retrieves usage statistics for merchant accounts
func (h *MerchantAccountHandler) GetAccountUsageStatistics(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	// Parse time range parameters
	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 30
	}

	timeRange := service.TimeRange{
		StartDate: time.Now().AddDate(0, 0, -days),
		EndDate:   time.Now(),
	}

	stats, err := h.merchantAccountService.GetAccountUsageStatistics(c.Request.Context(), merchantID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve usage statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
		"time_range": timeRange,
		"count": len(stats),
	})
}

// GetLoadBalancingRecommendations provides recommendations for load balancing
func (h *MerchantAccountHandler) GetLoadBalancingRecommendations(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	recommendations, err := h.merchantAccountService.GetLoadBalancingRecommendations(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve load balancing recommendations",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": recommendations,
		"count": len(recommendations),
	})
}

// BatchBindAccounts binds multiple accounts to a merchant in batch
func (h *MerchantAccountHandler) BatchBindAccounts(c *gin.Context) {
	var req service.BatchBindAccountsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.merchantAccountService.BatchBindAccounts(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to batch bind accounts",
			"details": err.Error(),
		})
		return
	}

	statusCode := http.StatusOK
	if result.Failed > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, gin.H{
		"data": result,
		"message": "Batch bind operation completed",
	})
}

// BatchUpdatePriorities updates multiple account priorities in batch
func (h *MerchantAccountHandler) BatchUpdatePriorities(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	var req struct {
		Updates []service.AccountPriorityUpdate `json:"updates" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.merchantAccountService.BatchUpdatePriorities(c.Request.Context(), merchantID, req.Updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to batch update priorities",
			"details": err.Error(),
		})
		return
	}

	statusCode := http.StatusOK
	if result.Failed > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, gin.H{
		"data": result,
		"message": "Batch priority update completed",
	})
}

// EnableAccount enables a bound account for a merchant
func (h *MerchantAccountHandler) EnableAccount(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	accountID, err := uuid.Parse(c.Param("accountId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID",
		})
		return
	}

	if err := h.merchantAccountService.EnableAccount(c.Request.Context(), merchantID, accountID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to enable account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account enabled successfully",
	})
}

// DisableAccount disables a bound account for a merchant
func (h *MerchantAccountHandler) DisableAccount(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	accountID, err := uuid.Parse(c.Param("accountId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID",
		})
		return
	}

	if err := h.merchantAccountService.DisableAccount(c.Request.Context(), merchantID, accountID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to disable account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Account disabled successfully",
	})
}

// GetAccountStatus retrieves the status of a bound account
func (h *MerchantAccountHandler) GetAccountStatus(c *gin.Context) {
	merchantID, err := uuid.Parse(c.Param("merchantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	accountID, err := uuid.Parse(c.Param("accountId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID",
		})
		return
	}

	status, err := h.merchantAccountService.GetAccountStatus(c.Request.Context(), merchantID, accountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve account status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": status,
	})
}
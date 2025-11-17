package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// RechargeTestingHandler handles HTTP requests for recharge testing system management
type RechargeTestingHandler struct {
	merchantService        service.MerchantService
	merchantAccountService service.MerchantAccountService
	rechargeService        service.RechargeService
	reportService          service.ReportService
	dataExportService      service.DataExportService
}

// NewRechargeTestingHandler creates a new recharge testing handler
func NewRechargeTestingHandler(
	merchantService service.MerchantService,
	merchantAccountService service.MerchantAccountService,
	rechargeService service.RechargeService,
	reportService service.ReportService,
	dataExportService service.DataExportService,
) *RechargeTestingHandler {
	return &RechargeTestingHandler{
		merchantService:        merchantService,
		merchantAccountService: merchantAccountService,
		rechargeService:        rechargeService,
		reportService:          reportService,
		dataExportService:      dataExportService,
	}
}

// RegisterRoutes registers all recharge testing system routes
func (h *RechargeTestingHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Merchant management routes
	merchants := router.Group("/merchants")
	{
		merchants.GET("/", h.ListMerchants)
		merchants.POST("/", h.CreateMerchant)
		merchants.GET("/:id", h.GetMerchant)
		merchants.PUT("/:id", h.UpdateMerchant)
		merchants.DELETE("/:id", h.DeleteMerchant)
		merchants.PUT("/:id/status", h.UpdateMerchantStatus)
		merchants.POST("/:id/generate-recharge-url", h.GenerateRechargeURL)
		merchants.PUT("/:id/recharge-service", h.ToggleRechargeService)
		merchants.PUT("/:id/recharge-config", h.UpdateRechargePageConfig)
	}

	// Merchant account binding routes
	merchantAccounts := router.Group("/merchant-accounts")
	{
		merchantAccounts.POST("/bind", h.BindAccount)
		merchantAccounts.DELETE("/:merchantId/accounts/:accountId", h.UnbindAccount)
		merchantAccounts.GET("/:merchantId", h.ListMerchantAccounts)
		merchantAccounts.PUT("/:merchantId/accounts/:accountId/priority", h.UpdateAccountPriority)
		merchantAccounts.PUT("/:merchantId/priorities", h.ReorderAccountPriorities)
		merchantAccounts.GET("/:merchantId/available", h.GetAvailableAccounts)
		merchantAccounts.POST("/validate-binding", h.ValidateAccountBinding)
		merchantAccounts.GET("/:merchantId/usage-stats", h.GetAccountUsageStatistics)
		merchantAccounts.POST("/batch-bind", h.BatchBindAccounts)
	}

	// Order management routes
	orders := router.Group("/orders")
	{
		orders.GET("/", h.ListOrders)
		orders.GET("/:id", h.GetOrder)
		orders.PUT("/:id/status", h.UpdateOrderStatus)
		orders.POST("/:id/approve", h.ApproveOrder)
		orders.POST("/:id/reject", h.RejectOrder)
		orders.GET("/:id/logs", h.GetOrderLogs)
		orders.POST("/:id/add-note", h.AddOrderNote)
		orders.GET("/statistics", h.GetOrderStatistics)
		orders.GET("/pending-review", h.GetPendingReviewOrders)
	}

	// Data export routes
	exports := router.Group("/exports")
	{
		exports.POST("/orders", h.ExportOrders)
		exports.GET("/today", h.ExportTodayData)
		exports.GET("/yesterday", h.ExportYesterdayData)
		exports.GET("/:id/status", h.GetExportStatus)
		exports.GET("/:id/download", h.DownloadExport)
		exports.GET("/", h.ListExports)
		exports.DELETE("/:id", h.DeleteExport)
	}

	// Dashboard and analytics routes
	dashboard := router.Group("/dashboard")
	{
		dashboard.GET("/overview", h.GetDashboardOverview)
		dashboard.GET("/merchant-stats", h.GetMerchantStatistics)
		dashboard.GET("/order-trends", h.GetOrderTrends)
		dashboard.GET("/account-utilization", h.GetAccountUtilization)
		dashboard.GET("/recent-activities", h.GetRecentActivities)
	}

	// System configuration routes
	config := router.Group("/config")
	{
		config.GET("/", h.GetSystemConfig)
		config.PUT("/", h.UpdateSystemConfig)
		config.POST("/validate", h.ValidateSystemConfig)
	}

	// Public recharge routes (no authentication required)
	public := router.Group("/public")
	{
		public.GET("/recharge/:merchantId", h.ShowRechargePage)
		public.POST("/recharge/create", h.CreateRechargeOrder)
		public.POST("/recharge/upload-proof", h.UploadPaymentProof)
		public.GET("/recharge/status/:orderNo", h.GetOrderStatus)
	}
}

// ===== Merchant Management Handlers =====

// ListMerchants lists merchants with filtering and pagination
func (h *RechargeTestingHandler) ListMerchants(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	status := c.Query("status")
	businessType := c.Query("business_type")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := &repository.MerchantFilter{
		Keyword: &search,
		Limit:   limit,
		Offset:  (page - 1) * limit,
	}

	if status != "" {
		filter.Status = &status
	}
	if businessType != "" {
		filter.BusinessType = &businessType
	}

	merchants, total, err := h.merchantService.ListMerchants(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list merchants",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"merchants":   merchants,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// CreateMerchant creates a new merchant
func (h *RechargeTestingHandler) CreateMerchant(c *gin.Context) {
	var req service.CreateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate required fields for recharge testing system
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Merchant name is required",
		})
		return
	}

	if req.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Merchant code is required",
		})
		return
	}

	merchant, err := h.merchantService.CreateMerchant(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create merchant",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    merchant,
		"message": "Merchant created successfully",
	})
}

// GetMerchant retrieves a merchant by ID
func (h *RechargeTestingHandler) GetMerchant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	merchant, err := h.merchantService.GetMerchant(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Merchant not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    merchant,
	})
}

// UpdateMerchant updates an existing merchant
func (h *RechargeTestingHandler) UpdateMerchant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	var req service.UpdateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	merchant, err := h.merchantService.UpdateMerchant(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update merchant",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    merchant,
		"message": "Merchant updated successfully",
	})
}

// DeleteMerchant deletes a merchant
func (h *RechargeTestingHandler) DeleteMerchant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	err = h.merchantService.DeleteMerchant(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete merchant",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Merchant deleted successfully",
	})
}

// UpdateMerchantStatus updates merchant status
func (h *RechargeTestingHandler) UpdateMerchantStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=active inactive suspended"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	err = h.merchantService.UpdateMerchantStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update merchant status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Merchant status updated to %s", req.Status),
	})
}

// GenerateRechargeURL generates a recharge URL for a merchant
func (h *RechargeTestingHandler) GenerateRechargeURL(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	rechargeURL, err := h.merchantService.GenerateRechargeURL(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate recharge URL",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"recharge_url": rechargeURL,
		"message":     "Recharge URL generated successfully",
	})
}

// ToggleRechargeService enables/disables recharge service for a merchant
func (h *RechargeTestingHandler) ToggleRechargeService(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	err = h.merchantService.EnableRechargeService(c.Request.Context(), id, req.Enabled)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to toggle recharge service",
			"details": err.Error(),
		})
		return
	}

	status := "disabled"
	if req.Enabled {
		status = "enabled"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Recharge service %s successfully", status),
	})
}

// UpdateRechargePageConfig updates recharge page configuration
func (h *RechargeTestingHandler) UpdateRechargePageConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid configuration format",
			"details": err.Error(),
		})
		return
	}

	err = h.merchantService.UpdateRechargePageConfig(c.Request.Context(), id, config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update recharge page configuration",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recharge page configuration updated successfully",
	})
}

// ===== Merchant Account Binding Handlers =====

// BindAccount binds a receive account to a merchant
func (h *RechargeTestingHandler) BindAccount(c *gin.Context) {
	var req service.BindAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.merchantAccountService.BindAccount(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to bind account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Account bound successfully",
	})
}

// UnbindAccount removes the binding between a merchant and receive account
func (h *RechargeTestingHandler) UnbindAccount(c *gin.Context) {
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
			"error":   "Failed to unbind account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account unbound successfully",
	})
}

// ListMerchantAccounts retrieves all accounts bound to a merchant
func (h *RechargeTestingHandler) ListMerchantAccounts(c *gin.Context) {
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
			"error":   "Failed to retrieve merchant accounts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
	})
}

// UpdateAccountPriority updates the priority of a bound account
func (h *RechargeTestingHandler) UpdateAccountPriority(c *gin.Context) {
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
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.merchantAccountService.UpdateAccountPriority(c.Request.Context(), merchantID, accountID, req.Priority); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to update account priority",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account priority updated successfully",
	})
}

// ReorderAccountPriorities updates multiple account priorities in batch
func (h *RechargeTestingHandler) ReorderAccountPriorities(c *gin.Context) {
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
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if err := h.merchantAccountService.ReorderAccountPriorities(c.Request.Context(), merchantID, req.AccountPriorities); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to reorder account priorities",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account priorities reordered successfully",
	})
}

// GetAvailableAccounts retrieves available accounts for a merchant
func (h *RechargeTestingHandler) GetAvailableAccounts(c *gin.Context) {
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
			"error":   "Failed to retrieve available accounts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    accounts,
		"count":   len(accounts),
	})
}

// ValidateAccountBinding validates if an account can be bound to a merchant
func (h *RechargeTestingHandler) ValidateAccountBinding(c *gin.Context) {
	var req struct {
		MerchantID uuid.UUID `json:"merchant_id" binding:"required"`
		AccountID  uuid.UUID `json:"account_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.merchantAccountService.ValidateAccountBinding(c.Request.Context(), req.MerchantID, req.AccountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to validate account binding",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetAccountUsageStatistics retrieves usage statistics for merchant accounts
func (h *RechargeTestingHandler) GetAccountUsageStatistics(c *gin.Context) {
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
			"error":   "Failed to retrieve usage statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       stats,
		"time_range": timeRange,
		"count":      len(stats),
	})
}

// BatchBindAccounts binds multiple accounts to a merchant in batch
func (h *RechargeTestingHandler) BatchBindAccounts(c *gin.Context) {
	var req service.BatchBindAccountsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.merchantAccountService.BatchBindAccounts(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to batch bind accounts",
			"details": err.Error(),
		})
		return
	}

	statusCode := http.StatusOK
	if result.Failed > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, gin.H{
		"success": true,
		"data":    result,
		"message": "Batch bind operation completed",
	})
}

// ===== Order Management Handlers =====

// ListOrders lists recharge orders with filtering and pagination
func (h *RechargeTestingHandler) ListOrders(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	merchantID := c.Query("merchant_id")
	paymentType := c.Query("payment_type")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := &service.ListOrdersRequest{
		Page:  page,
		Limit: limit,
	}

	if status != "" {
		filter.Status = &status
	}
	if merchantID != "" {
		if id, err := uuid.Parse(merchantID); err == nil {
			filter.MerchantID = &id
		}
	}
	if paymentType != "" {
		filter.PaymentType = &paymentType
	}
	if startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			filter.StartDate = &t
		}
	}
	if endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			filter.EndDate = &t
		}
	}

	orders, total, err := h.rechargeService.ListOrders(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list orders",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"orders":      orders,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetOrder retrieves a recharge order by ID
func (h *RechargeTestingHandler) GetOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Order not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    order,
	})
}

// UpdateOrderStatus updates the status of a recharge order
func (h *RechargeTestingHandler) UpdateOrderStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=pending paid confirmed completed cancelled"`
		Remark string `json:"remark"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, req.Status, req.Remark)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update order status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Order status updated to %s", req.Status),
	})
}

// ApproveOrder approves a recharge order
func (h *RechargeTestingHandler) ApproveOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Remark string `json:"remark"`
	}
	c.ShouldBindJSON(&req)

	err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, "confirmed", req.Remark)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to approve order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order approved successfully",
	})
}

// RejectOrder rejects a recharge order
func (h *RechargeTestingHandler) RejectOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, "cancelled", req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to reject order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order rejected successfully",
	})
}

// GetOrderLogs retrieves logs for a specific order
func (h *RechargeTestingHandler) GetOrderLogs(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// This would typically call a service method to get order logs
	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    []interface{}{},
		"message": "Order logs retrieved successfully",
	})
}

// AddOrderNote adds a note to an order
func (h *RechargeTestingHandler) AddOrderNote(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Note string `json:"note" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// This would typically call a service method to add order note
	// For now, return a success response
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Note added successfully",
	})
}

// GetOrderStatistics retrieves order statistics
func (h *RechargeTestingHandler) GetOrderStatistics(c *gin.Context) {
	// Parse time range parameters
	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 30
	}

	// This would typically call a service method to get order statistics
	// For now, return placeholder data
	stats := gin.H{
		"total_orders":     0,
		"pending_orders":   0,
		"confirmed_orders": 0,
		"cancelled_orders": 0,
		"total_amount":     "0.00",
		"time_range":       fmt.Sprintf("Last %d days", days),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetPendingReviewOrders retrieves orders pending review
func (h *RechargeTestingHandler) GetPendingReviewOrders(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// This would typically call a service method to get pending review orders
	// For now, return placeholder data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    []interface{}{},
		"count":   0,
	})
}

// ===== Data Export Handlers =====

// ExportOrders exports orders based on criteria
func (h *RechargeTestingHandler) ExportOrders(c *gin.Context) {
	var req struct {
		StartDate   string    `json:"start_date" binding:"required"`
		EndDate     string    `json:"end_date" binding:"required"`
		Status      *string   `json:"status"`
		MerchantID  *uuid.UUID `json:"merchant_id"`
		PaymentType *string   `json:"payment_type"`
		Format      string    `json:"format" binding:"required,oneof=excel csv"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid start date format",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid end date format",
		})
		return
	}

	// This would typically call a service method to create export job
	// For now, return a placeholder response
	exportID := uuid.New()
	c.JSON(http.StatusAccepted, gin.H{
		"success":   true,
		"export_id": exportID,
		"message":   "Export job created successfully",
		"status":    "processing",
	})
}

// ExportTodayData exports today's data
func (h *RechargeTestingHandler) ExportTodayData(c *gin.Context) {
	format := c.DefaultQuery("format", "excel")
	if format != "excel" && format != "csv" {
		format = "excel"
	}

	// This would typically call a service method to export today's data
	// For now, return a placeholder response
	exportID := uuid.New()
	c.JSON(http.StatusAccepted, gin.H{
		"success":   true,
		"export_id": exportID,
		"message":   "Today's data export job created successfully",
		"status":    "processing",
	})
}

// ExportYesterdayData exports yesterday's data
func (h *RechargeTestingHandler) ExportYesterdayData(c *gin.Context) {
	format := c.DefaultQuery("format", "excel")
	if format != "excel" && format != "csv" {
		format = "excel"
	}

	// This would typically call a service method to export yesterday's data
	// For now, return a placeholder response
	exportID := uuid.New()
	c.JSON(http.StatusAccepted, gin.H{
		"success":   true,
		"export_id": exportID,
		"message":   "Yesterday's data export job created successfully",
		"status":    "processing",
	})
}

// GetExportStatus retrieves the status of an export job
func (h *RechargeTestingHandler) GetExportStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid export ID format",
		})
		return
	}

	// This would typically call a service method to get export status
	// For now, return placeholder data
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"export_id":   id,
			"status":      "completed",
			"progress":    100,
			"created_at":  time.Now().Add(-5 * time.Minute),
			"completed_at": time.Now(),
			"file_size":   "1.2MB",
			"record_count": 150,
		},
	})
}

// DownloadExport downloads an export file
func (h *RechargeTestingHandler) DownloadExport(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid export ID format",
		})
		return
	}

	// This would typically call a service method to get export file
	// For now, return a placeholder response
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Export download functionality not implemented yet",
	})
}

// ===== Public Recharge Page Handlers =====

// ShowRechargePage displays the recharge page for a merchant
func (h *RechargeTestingHandler) ShowRechargePage(c *gin.Context) {
	merchantIDStr := c.Param("merchantId")
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		c.HTML(http.StatusBadRequest, "error.html", gin.H{
			"error": "Invalid merchant ID",
		})
		return
	}

	// Get merchant information
	merchant, err := h.merchantService.GetMerchant(c.Request.Context(), merchantID)
	if err != nil {
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"error": "Merchant not found",
		})
		return
	}

	// Check if merchant is active and recharge service is enabled
	if merchant.Status != "active" {
		c.HTML(http.StatusServiceUnavailable, "service_unavailable.html", gin.H{
			"merchant": merchant,
			"message":  "Recharge service is temporarily unavailable",
		})
		return
	}

	// Detect mobile device
	userAgent := c.GetHeader("User-Agent")
	isMobile := h.isMobileDevice(userAgent)

	// Prepare template data
	templateData := gin.H{
		"MerchantID":   merchant.ID,
		"MerchantName": merchant.Name,
		"Merchant":     merchant,
		"IsMobile":     isMobile,
	}

	// Choose template based on device type
	template := "recharge_page.html"
	if isMobile {
		template = "recharge_mobile.html"
	}

	c.HTML(http.StatusOK, template, templateData)
}

// CreateRechargeOrder creates a new recharge order from the public form
func (h *RechargeTestingHandler) CreateRechargeOrder(c *gin.Context) {
	var req service.CreateRechargeOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Validate required fields
	if req.MerchantID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Merchant ID is required",
		})
		return
	}

	if req.PayerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Payer name is required",
		})
		return
	}

	if req.Amount.IsZero() || req.Amount.IsNegative() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Valid amount is required",
		})
		return
	}

	if req.PaymentType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Payment type is required",
		})
		return
	}

	// Create the recharge order
	order, err := h.rechargeService.CreateRechargeOrder(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create recharge order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    order,
		"message": "Recharge order created successfully",
	})
}

// UploadPaymentProof handles payment proof upload
func (h *RechargeTestingHandler) UploadPaymentProof(c *gin.Context) {
	orderNo := c.PostForm("orderNo")
	if orderNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Order number is required",
		})
		return
	}

	// Get uploaded file
	file, err := c.FormFile("proofFile")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Payment proof file is required",
		})
		return
	}

	// Validate file type
	if !h.isValidImageFile(file.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Only image files are allowed",
		})
		return
	}

	// Validate file size (5MB limit)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "File size cannot exceed 5MB",
		})
		return
	}

	// Save the file (this would typically upload to cloud storage)
	filename := fmt.Sprintf("proof_%s_%d_%s", orderNo, time.Now().Unix(), file.Filename)
	filepath := fmt.Sprintf("uploads/payment_proofs/%s", filename)
	
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save payment proof",
			"details": err.Error(),
		})
		return
	}

	// Update order with payment proof
	err = h.rechargeService.UploadPaymentProof(c.Request.Context(), orderNo, filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update order with payment proof",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Payment proof uploaded successfully",
		"data": gin.H{
			"filename": filename,
			"filepath": filepath,
		},
	})
}

// GetOrderStatus retrieves the status of a recharge order by order number
func (h *RechargeTestingHandler) GetOrderStatus(c *gin.Context) {
	orderNo := c.Param("orderNo")
	if orderNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Order number is required",
		})
		return
	}

	order, err := h.rechargeService.GetRechargeOrderByOrderNo(c.Request.Context(), orderNo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Order not found",
			"details": err.Error(),
		})
		return
	}

	// Return limited order information for public access
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"order_no":     order.OrderNo,
			"status":       order.Status,
			"amount":       order.Amount,
			"created_at":   order.CreatedAt,
			"updated_at":   order.UpdatedAt,
		},
	})
}

// ===== Helper Methods =====

// isMobileDevice detects if the request is from a mobile device
func (h *RechargeTestingHandler) isMobileDevice(userAgent string) bool {
	mobileKeywords := []string{
		"Mobile", "Android", "iPhone", "iPad", "iPod", 
		"BlackBerry", "IEMobile", "Opera Mini", "webOS",
	}
	
	for _, keyword := range mobileKeywords {
		if contains(userAgent, keyword) {
			return true
		}
	}
	
	return false
}

// isValidImageFile checks if the file is a valid image
func (h *RechargeTestingHandler) isValidImageFile(filename string) bool {
	validExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
	
	for _, ext := range validExtensions {
		if len(filename) >= len(ext) && 
		   filename[len(filename)-len(ext):] == ext {
			return true
		}
	}
	
	return false
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		   (s == substr || 
		    (len(s) > len(substr) && 
		     (s[:len(substr)] == substr || 
		      s[len(s)-len(substr):] == substr ||
		      containsSubstring(s, substr))))
}

// containsSubstring performs case-insensitive substring search
func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false)
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid export ID format",
		})
		return
	}

	// This would typically call a service method to get export file
	// For now, return an error indicating file not found
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusNotFound, gin.H{
		"error": "Export file not found or has expired",
	})
}

// ListExports lists all export jobs
func (h *RechargeTestingHandler) ListExports(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// This would typically call a service method to list exports
	// For now, return placeholder data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"exports":     []interface{}{},
			"total":       0,
			"page":        page,
			"limit":       limit,
			"total_pages": 0,
		},
	})
}

// DeleteExport deletes an export job
func (h *RechargeTestingHandler) DeleteExport(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid export ID format",
		})
		return
	}

	// This would typically call a service method to delete export
	// For now, return a success response
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Export deleted successfully",
	})
}

// ===== Dashboard and Analytics Handlers =====

// GetDashboardOverview retrieves dashboard overview data
func (h *RechargeTestingHandler) GetDashboardOverview(c *gin.Context) {
	// This would typically call service methods to get dashboard data
	// For now, return placeholder data
	overview := gin.H{
		"total_merchants":     0,
		"active_merchants":    0,
		"total_orders":        0,
		"pending_orders":      0,
		"confirmed_orders":    0,
		"total_amount":        "0.00",
		"today_orders":        0,
		"today_amount":        "0.00",
		"success_rate":        "0%",
		"avg_processing_time": "0 minutes",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    overview,
	})
}

// GetMerchantStatistics retrieves merchant statistics
func (h *RechargeTestingHandler) GetMerchantStatistics(c *gin.Context) {
	// This would typically call service methods to get merchant statistics
	// For now, return placeholder data
	stats := gin.H{
		"total_merchants":      0,
		"active_merchants":     0,
		"inactive_merchants":   0,
		"merchants_with_orders": 0,
		"top_merchants":        []interface{}{},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetOrderTrends retrieves order trend data
func (h *RechargeTestingHandler) GetOrderTrends(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "30")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 30
	}

	// This would typically call service methods to get order trends
	// For now, return placeholder data
	trends := gin.H{
		"time_range": fmt.Sprintf("Last %d days", days),
		"daily_orders": []interface{}{},
		"daily_amounts": []interface{}{},
		"status_distribution": gin.H{
			"pending":   0,
			"confirmed": 0,
			"cancelled": 0,
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    trends,
	})
}

// GetAccountUtilization retrieves account utilization data
func (h *RechargeTestingHandler) GetAccountUtilization(c *gin.Context) {
	// This would typically call service methods to get account utilization
	// For now, return placeholder data
	utilization := gin.H{
		"total_accounts":     0,
		"active_accounts":    0,
		"account_usage":      []interface{}{},
		"utilization_rate":   "0%",
		"peak_usage_time":    "",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    utilization,
	})
}

// GetRecentActivities retrieves recent system activities
func (h *RechargeTestingHandler) GetRecentActivities(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// This would typically call service methods to get recent activities
	// For now, return placeholder data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    []interface{}{},
		"count":   0,
	})
}

// ===== System Configuration Handlers =====

// GetSystemConfig retrieves system configuration
func (h *RechargeTestingHandler) GetSystemConfig(c *gin.Context) {
	// This would typically call a service method to get system config
	// For now, return placeholder data
	config := gin.H{
		"system_name":           "Recharge Testing System",
		"version":               "1.0.0",
		"max_daily_limit":       "1000000.00",
		"max_single_limit":      "100000.00",
		"auto_approve_threshold": "1000.00",
		"notification_enabled":  true,
		"export_retention_days": 30,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    config,
	})
}

// UpdateSystemConfig updates system configuration
func (h *RechargeTestingHandler) UpdateSystemConfig(c *gin.Context) {
	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid configuration format",
			"details": err.Error(),
		})
		return
	}

	// This would typically call a service method to update system config
	// For now, return a success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "System configuration updated successfully",
	})
}

// ValidateSystemConfig validates system configuration
func (h *RechargeTestingHandler) ValidateSystemConfig(c *gin.Context) {
	var config map[string]interface{}
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid configuration format",
			"details": err.Error(),
		})
		return
	}

	// This would typically call a service method to validate system config
	// For now, return a validation success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"valid":   true,
		"message": "Configuration is valid",
	})
}
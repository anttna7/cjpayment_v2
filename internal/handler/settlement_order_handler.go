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

type SettlementOrderHandler struct {
	settlementService service.SettlementOrderService
}

func NewSettlementOrderHandler(settlementService service.SettlementOrderService) *SettlementOrderHandler {
	return &SettlementOrderHandler{
		settlementService: settlementService,
	}
}

// POST /api/settlement-orders - 创建结算订单
func (h *SettlementOrderHandler) CreateOrder(c *gin.Context) {
	var req service.CreateSettlementOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	tenantID, _ := c.Get("tenant_id")

	req.CreatedBy = userID.(uuid.UUID)
	req.TenantID = tenantID.(uuid.UUID)

	order, err := h.settlementService.CreateSettlementOrder(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Settlement order created successfully",
		"data":    order,
	})
}

// GET /api/settlement-orders/:id - 获取结算订单详情
func (h *SettlementOrderHandler) GetOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	order, err := h.settlementService.GetSettlementOrderByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": order})
}

// PUT /api/settlement-orders/:id - 更新结算订单
func (h *SettlementOrderHandler) UpdateOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req service.UpdateSettlementOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.settlementService.UpdateSettlementOrder(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settlement order updated successfully"})
}

// DELETE /api/settlement-orders/:id - 删除结算订单
func (h *SettlementOrderHandler) DeleteOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	err = h.settlementService.DeleteSettlementOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settlement order deleted successfully"})
}

// GET /api/settlement-orders - 结算订单列表
func (h *SettlementOrderHandler) ListOrders(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	var filter service.SettlementOrderListFilter
	tid := tenantID.(uuid.UUID)
	filter.TenantID = &tid

	// 解析查询参数
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}
	if customerID := c.Query("customer_id"); customerID != "" {
		id, _ := uuid.Parse(customerID)
		filter.CustomerID = &id
	}
	if minAmount := c.Query("min_amount"); minAmount != "" {
		amount, _ := decimal.NewFromString(minAmount)
		filter.MinAmount = &amount
	}
	if maxAmount := c.Query("max_amount"); maxAmount != "" {
		amount, _ := decimal.NewFromString(maxAmount)
		filter.MaxAmount = &amount
	}
	if startDate := c.Query("start_date"); startDate != "" {
		date, _ := time.Parse("2006-01-02", startDate)
		filter.StartDate = &date
	}
	if endDate := c.Query("end_date"); endDate != "" {
		date, _ := time.Parse("2006-01-02", endDate)
		filter.EndDate = &date
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filter.Page = page
	filter.PageSize = pageSize

	orders, total, err := h.settlementService.ListSettlementOrders(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      orders,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// POST /api/settlement-orders/:id/submit - 提交审核
func (h *SettlementOrderHandler) SubmitForReview(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	userID, _ := c.Get("user_id")
	err = h.settlementService.SubmitForReview(c.Request.Context(), id, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settlement order submitted for review"})
}

// POST /api/settlement-orders/:id/approve - 批准订单
func (h *SettlementOrderHandler) ApproveOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	c.ShouldBindJSON(&req)

	userID, _ := c.Get("user_id")
	err = h.settlementService.ApproveOrder(c.Request.Context(), id, userID.(uuid.UUID), req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settlement order approved successfully"})
}

// POST /api/settlement-orders/:id/reject - 拒绝订单
func (h *SettlementOrderHandler) RejectOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req struct {
		Notes string `json:"notes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rejection notes are required"})
		return
	}

	userID, _ := c.Get("user_id")
	err = h.settlementService.RejectOrder(c.Request.Context(), id, userID.(uuid.UUID), req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settlement order rejected"})
}

// POST /api/settlement-orders/:id/settle - 完成结算
func (h *SettlementOrderHandler) SettleOrder(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	c.ShouldBindJSON(&req)

	userID, _ := c.Get("user_id")
	err = h.settlementService.SettleOrder(c.Request.Context(), id, userID.(uuid.UUID), req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settlement order settled successfully"})
}

// GET /api/settlement-orders/pending - 获取待处理订单
func (h *SettlementOrderHandler) GetPendingOrders(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	orders, err := h.settlementService.GetPendingOrders(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": orders})
}

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

type InvoiceHandler struct {
	invoiceService service.InvoiceService
}

func NewInvoiceHandler(invoiceService service.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{
		invoiceService: invoiceService,
	}
}

// POST /api/invoices - 创建发票
func (h *InvoiceHandler) CreateInvoice(c *gin.Context) {
	var req service.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从JWT中获取用户信息
	userID, _ := c.Get("user_id")
	tenantID, _ := c.Get("tenant_id")

	req.ApplicantID = userID.(uuid.UUID)
	req.TenantID = tenantID.(uuid.UUID)

	invoice, err := h.invoiceService.CreateInvoice(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Invoice created successfully",
		"data":    invoice,
	})
}

// GET /api/invoices/:id - 获取发票详情
func (h *InvoiceHandler) GetInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	invoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": invoice})
}

// PUT /api/invoices/:id - 更新发票
func (h *InvoiceHandler) UpdateInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var req service.UpdateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.invoiceService.UpdateInvoice(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice updated successfully"})
}

// DELETE /api/invoices/:id - 删除发票
func (h *InvoiceHandler) DeleteInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	err = h.invoiceService.DeleteInvoice(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice deleted successfully"})
}

// GET /api/invoices - 发票列表
func (h *InvoiceHandler) ListInvoices(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	var filter service.InvoiceListFilter
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
	if invoiceType := c.Query("invoice_type"); invoiceType != "" {
		filter.InvoiceType = &invoiceType
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

	invoices, total, err := h.invoiceService.ListInvoices(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      invoices,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// POST /api/invoices/:id/issue - 开具发票
func (h *InvoiceHandler) IssueInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	var req service.IssueInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	req.InvoiceID = id
	req.IssuerID = userID.(uuid.UUID)

	err = h.invoiceService.IssueInvoice(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice issued successfully"})
}

// POST /api/invoices/:id/send - 发送发票
func (h *InvoiceHandler) SendInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	userID, _ := c.Get("user_id")
	err = h.invoiceService.SendInvoice(c.Request.Context(), id, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice sent successfully"})
}

// POST /api/invoices/:id/confirm - 确认发票
func (h *InvoiceHandler) ConfirmInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	userID, _ := c.Get("user_id")
	err = h.invoiceService.ConfirmInvoice(c.Request.Context(), id, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice confirmed successfully"})
}

// POST /api/invoices/:id/cancel - 作废发票
func (h *InvoiceHandler) CancelInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	userID, _ := c.Get("user_id")
	err = h.invoiceService.CancelInvoice(c.Request.Context(), id, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice cancelled successfully"})
}

// GET /api/invoices/pending - 获取待处理发票
func (h *InvoiceHandler) GetPendingInvoices(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	invoices, err := h.invoiceService.GetPendingInvoices(c.Request.Context(), tenantID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": invoices})
}

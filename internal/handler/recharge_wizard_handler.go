package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetMerchants returns list of merchants for the wizard
func (h *Handler) GetMerchants(c *gin.Context) {
	// Mock merchant data - in real implementation, this would query the database
	merchants := []gin.H{
		{"id": 1, "name": "阿里巴巴集团", "code": "ALIBABA"},
		{"id": 2, "name": "腾讯科技", "code": "TENCENT"},
		{"id": 3, "name": "百度在线", "code": "BAIDU"},
		{"id": 4, "name": "京东商城", "code": "JD"},
		{"id": 5, "name": "美团点评", "code": "MEITUAN"},
		{"id": 6, "name": "字节跳动", "code": "BYTEDANCE"},
		{"id": 7, "name": "滴滴出行", "code": "DIDI"},
		{"id": 8, "name": "小米科技", "code": "XIAOMI"},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"merchants": merchants,
		},
	})
}

// GetReceiveAccounts returns list of receive accounts
func (h *Handler) GetReceiveAccounts(c *gin.Context) {
	// Mock receive account data
	accounts := []gin.H{
		{"id": 1, "accountName": "中国银行收款账户", "accountNumber": "6217001234567890123"},
		{"id": 2, "accountName": "工商银行收款账户", "accountNumber": "6222021234567890123"},
		{"id": 3, "accountName": "建设银行收款账户", "accountNumber": "6227001234567890123"},
		{"id": 4, "accountName": "农业银行收款账户", "accountNumber": "6228481234567890123"},
		{"id": 5, "accountName": "招商银行收款账户", "accountNumber": "6225881234567890123"},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"accounts": accounts,
		},
	})
}

// GetMerchantReceiveAccounts returns receive accounts for a specific merchant
func (h *Handler) GetMerchantReceiveAccounts(c *gin.Context) {
	merchantIDStr := c.Param("merchantId")
	merchantID, err := strconv.Atoi(merchantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid merchant ID",
		})
		return
	}

	// Mock merchant-specific receive accounts
	accounts := []gin.H{
		{"id": 1, "accountName": "商户" + merchantIDStr + "专用账户A", "accountNumber": "6217001234567890123"},
		{"id": 2, "accountName": "商户" + merchantIDStr + "专用账户B", "accountNumber": "6222021234567890123"},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"accounts": accounts,
			"merchantId": merchantID,
		},
	})
}

// CreateRechargeOrder creates a new recharge order
func (h *Handler) CreateRechargeOrder(c *gin.Context) {
	var req struct {
		Type           string  `json:"type" binding:"required"`
		PayerName      string  `json:"payerName" binding:"required"`
		PayerPhone     string  `json:"payerPhone"`
		PayerAccount   string  `json:"payerAccount" binding:"required"`
		BankName       string  `json:"bankName"`
		Amount         float64 `json:"amount" binding:"required,gt=0"`
		MerchantName   string  `json:"merchantName" binding:"required"`
		MerchantID     int     `json:"merchantId" binding:"required"`
		ReceiveAccount string  `json:"receiveAccount" binding:"required"`
		AdAccount      string  `json:"adAccount" binding:"required"`
		Remark         string  `json:"remark"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data: " + err.Error(),
		})
		return
	}

	// Validate amount limits
	if req.Amount < 0.01 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "充值金额不能少于0.01元",
		})
		return
	}

	if req.Amount > 1000000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "单笔充值金额不能超过100万元",
		})
		return
	}

	// Generate order number
	orderNumber := "RO" + strconv.FormatInt(time.Now().Unix(), 10)

	// In real implementation, this would:
	// 1. Validate merchant exists
	// 2. Validate receive account exists
	// 3. Create order in database
	// 4. Send notifications
	// 5. Log the operation

	// Mock successful creation
	order := gin.H{
		"id":            time.Now().Unix(),
		"orderNumber":   orderNumber,
		"type":          req.Type,
		"payerName":     req.PayerName,
		"payerPhone":    req.PayerPhone,
		"payerAccount":  req.PayerAccount,
		"bankName":      req.BankName,
		"amount":        req.Amount,
		"merchantName":  req.MerchantName,
		"merchantId":    req.MerchantID,
		"receiveAccount": req.ReceiveAccount,
		"adAccount":     req.AdAccount,
		"remark":        req.Remark,
		"status":        "pending",
		"createdAt":     time.Now().Format(time.RFC3339),
		"updatedAt":     time.Now().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "充值订单创建成功",
		"data":    order,
	})
}

// GetRechargeOrders returns list of recharge orders
func (h *Handler) GetRechargeOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Mock order data
	orders := []gin.H{
		{
			"id":            1,
			"orderNumber":   "RO1704067200001",
			"type":          "private",
			"payerName":     "张三",
			"payerAccount":  "6217001234567890123",
			"amount":        10000.00,
			"merchantName":  "阿里巴巴集团",
			"adAccount":     "AD_ALIBABA_001",
			"status":        "pending",
			"createdAt":     time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
			"updatedAt":     time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
		},
		{
			"id":            2,
			"orderNumber":   "RO1704067200002",
			"type":          "public",
			"payerName":     "李四",
			"payerAccount":  "6222021234567890123",
			"amount":        50000.00,
			"merchantName":  "腾讯科技",
			"adAccount":     "AD_TENCENT_001",
			"status":        "completed",
			"createdAt":     time.Now().Add(-4 * time.Hour).Format(time.RFC3339),
			"updatedAt":     time.Now().Add(-3 * time.Hour).Format(time.RFC3339),
		},
	}

	totalPages := 1
	if len(orders) > limit {
		totalPages = (len(orders) + limit - 1) / limit
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"orders":     orders,
			"page":       page,
			"limit":      limit,
			"totalPages": totalPages,
			"total":      len(orders),
		},
	})
}

// GetRechargeStats returns recharge statistics
func (h *Handler) GetRechargeStats(c *gin.Context) {
	// Mock statistics data
	stats := gin.H{
		"totalOrders":    156,
		"totalAmount":    "¥2,847,392.50",
		"pendingOrders":  23,
		"completedOrders": 133,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
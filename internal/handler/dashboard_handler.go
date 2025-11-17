package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// DashboardPage serves the main dashboard page
func (h *Handler) DashboardPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	// 使用Chrome风格的仪表板模板
	c.File("./web/templates/dashboard-chrome.html")
}

// GetDashboardStatistics returns dashboard statistics with caching
func (h *Handler) GetDashboardStatistics(c *gin.Context) {
	// Add cache headers for better performance
	c.Header("Cache-Control", "public, max-age=60") // Cache for 1 minute
	
	// Check if we have cached data (in a real implementation, use Redis or similar)
	// For now, we'll use mock data with improved structure
	
	// Get current time for trend calculations
	now := time.Now()
	
	// Mock data with more realistic values and better structure
	stats := gin.H{
		"totalTransactions": 1247,
		"totalAmount":       decimal.NewFromFloat(2847392.50),
		"successRate":       96.8,
		"avgAmount":         decimal.NewFromFloat(2284.12),
		"trends": gin.H{
			"transactions": gin.H{
				"change":     12.5,
				"direction":  "up",
				"period":     "24h",
				"previous":   1109,
			},
			"amount": gin.H{
				"change":     8.3,
				"direction":  "up", 
				"period":     "24h",
				"previous":   decimal.NewFromFloat(2628745.30),
			},
			"successRate": gin.H{
				"change":     2.1,
				"direction":  "up",
				"period":     "24h", 
				"previous":   94.7,
			},
			"avgAmount": gin.H{
				"change":     -1.2,
				"direction":  "down",
				"period":     "24h",
				"previous":   decimal.NewFromFloat(2311.45),
			},
		},
		"metadata": gin.H{
			"lastUpdated": now.Format(time.RFC3339),
			"dataRange":   "24h",
			"timezone":    "Asia/Shanghai",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
		"meta": gin.H{
			"cached":     false,
			"timestamp":  now.Unix(),
			"ttl":        60,
		},
	})
}

// GetDashboardCharts returns optimized chart data for dashboard
func (h *Handler) GetDashboardCharts(c *gin.Context) {
	period := c.DefaultQuery("period", "30d")
	chartType := c.DefaultQuery("type", "all")
	
	// Add cache headers based on period
	cacheTime := 300 // 5 minutes default
	switch period {
	case "7d":
		cacheTime = 60 // 1 minute for recent data
	case "30d":
		cacheTime = 300 // 5 minutes
	case "90d":
		cacheTime = 900 // 15 minutes for historical data
	}
	
	c.Header("Cache-Control", "public, max-age="+strconv.Itoa(cacheTime))
	
	// Generate optimized chart data based on period
	var labels []string
	var transactions []int
	var amounts []float64
	
	now := time.Now()
	
	switch period {
	case "7d":
		// Last 7 days with hourly granularity for recent data
		for i := 6; i >= 0; i-- {
			date := now.AddDate(0, 0, -i)
			labels = append(labels, date.Format("1/2"))
			// More realistic transaction patterns
			baseTransactions := 45 + (i%3)*10
			if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
				baseTransactions = int(float64(baseTransactions) * 0.7) // Lower weekend activity
			}
			transactions = append(transactions, baseTransactions)
			amounts = append(amounts, float64(baseTransactions)*2800) // Avg amount ~2800
		}
	case "30d":
		// Last 30 days with daily granularity
		for i := 29; i >= 0; i-- {
			date := now.AddDate(0, 0, -i)
			labels = append(labels, date.Format("1/2"))
			baseTransactions := 40 + i + (i%7)*5
			if date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
				baseTransactions = int(float64(baseTransactions) * 0.7)
			}
			transactions = append(transactions, baseTransactions)
			amounts = append(amounts, float64(baseTransactions)*2650) // Slightly lower avg for historical
		}
	case "90d":
		// Last 90 days with weekly aggregates for better performance
		for i := 12; i >= 0; i-- {
			date := now.AddDate(0, 0, -i*7)
			labels = append(labels, date.Format("1/2"))
			weeklyTransactions := 280 + i*15 + (i%4)*30
			transactions = append(transactions, weeklyTransactions)
			amounts = append(amounts, float64(weeklyTransactions)*2500)
		}
	}

	// Build response data based on requested chart type
	chartData := gin.H{}
	
	if chartType == "all" || chartType == "trend" {
		chartData["trend"] = gin.H{
			"labels":       labels,
			"transactions": transactions,
			"amounts":      amounts,
			"period":       period,
		}
	}
	
	if chartType == "all" || chartType == "status" {
		// More realistic status distribution
		total := 1247
		completed := int(float64(total) * 0.873)  // 87.3%
		processing := int(float64(total) * 0.079) // 7.9%
		failed := int(float64(total) * 0.036)     // 3.6%
		cancelled := total - completed - processing - failed
		
		chartData["status"] = gin.H{
			"completed":  completed,
			"processing": processing,
			"failed":     failed,
			"cancelled":  cancelled,
			"total":      total,
			"rates": gin.H{
				"success": float64(completed) / float64(total) * 100,
				"failure": float64(failed) / float64(total) * 100,
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    chartData,
		"meta": gin.H{
			"period":     period,
			"chartType":  chartType,
			"timestamp":  now.Unix(),
			"ttl":        cacheTime,
			"dataPoints": len(labels),
		},
	})
}

// GetRecentTransactions returns recent transactions for dashboard with pagination
func (h *Handler) GetRecentTransactions(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")
	status := c.Query("status")
	
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)
	
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}

	// Add cache headers for recent data (shorter cache time)
	c.Header("Cache-Control", "public, max-age=30") // 30 seconds cache
	
	now := time.Now()
	
	// Generate more realistic mock data
	allTransactions := []gin.H{}
	
	// Generate 50 mock transactions for pagination testing
	statuses := []string{"completed", "processing", "failed", "cancelled"}
	merchants := []string{"测试商户001", "测试商户002", "测试商户003", "电商平台A", "支付服务B"}
	names := []string{"张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十", "钱一", "孙二"}
	
	for i := 0; i < 50; i++ {
		statusIndex := i % len(statuses)
		if status != "" && statuses[statusIndex] != status {
			continue // Skip if filtering by status
		}
		
		// More realistic amount distribution
		var amount float64
		switch {
		case i%10 == 0: // 10% large transactions
			amount = 5000 + float64(i%5)*2000
		case i%5 == 0: // 20% medium transactions  
			amount = 1000 + float64(i%3)*500
		default: // 70% small transactions
			amount = 100 + float64(i%10)*50
		}
		
		transaction := gin.H{
			"id":           fmt.Sprintf("550e8400-e29b-41d4-a716-44665544%04d", i+1),
			"orderNumber":  fmt.Sprintf("R2025010500%02d", i+1),
			"payerName":    names[i%len(names)],
			"amount":       amount,
			"merchantName": merchants[i%len(merchants)],
			"status":       statuses[statusIndex],
			"paymentType":  []string{"private", "public"}[i%2],
			"createdAt":    now.Add(-time.Duration(i*5) * time.Minute).Format(time.RFC3339),
			"updatedAt":    now.Add(-time.Duration(i*3) * time.Minute).Format(time.RFC3339),
		}
		
		allTransactions = append(allTransactions, transaction)
	}
	
	// Apply pagination
	total := len(allTransactions)
	start := offset
	end := offset + limit
	
	if start >= total {
		allTransactions = []gin.H{}
	} else {
		if end > total {
			end = total
		}
		allTransactions = allTransactions[start:end]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    allTransactions,
		"meta": gin.H{
			"total":      total,
			"limit":      limit,
			"offset":     offset,
			"hasMore":    offset+limit < total,
			"timestamp":  now.Unix(),
		},
	})
}

// GetRecentActivity returns recent system activity
func (h *Handler) GetRecentActivity(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "5")
	limit, _ := strconv.Atoi(limitStr)
	
	if limit <= 0 || limit > 20 {
		limit = 5
	}

	// Mock recent activity data
	activities := []gin.H{
		{
			"id":          "act001",
			"type":        "transaction",
			"title":       "充值订单已完成",
			"description": "订单号: R202501050001 - ¥5,000",
			"createdAt":   time.Now().Add(-2 * time.Minute).Format(time.RFC3339),
		},
		{
			"id":          "act002",
			"type":        "merchant",
			"title":       "新商户注册",
			"description": "商户: 测试商户001",
			"createdAt":   time.Now().Add(-15 * time.Minute).Format(time.RFC3339),
		},
		{
			"id":          "act003",
			"type":        "account",
			"title":       "账户余额不足",
			"description": "账户: 工商银行***1234",
			"createdAt":   time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
		},
		{
			"id":          "act004",
			"type":        "system",
			"title":       "系统维护完成",
			"description": "定期维护已完成，系统运行正常",
			"createdAt":   time.Now().Add(-3 * time.Hour).Format(time.RFC3339),
		},
		{
			"id":          "act005",
			"type":        "transaction",
			"title":       "大额交易提醒",
			"description": "订单号: R202501050004 - ¥7,500",
			"createdAt":   time.Now().Add(-4 * time.Hour).Format(time.RFC3339),
		},
	}

	// Limit the results
	if len(activities) > limit {
		activities = activities[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    activities,
	})
}

// GetSystemStatus returns system health status
func (h *Handler) GetSystemStatus(c *gin.Context) {
	// Mock system status data
	status := gin.H{
		"database": gin.H{
			"status":      "healthy",
			"responseTime": "2ms",
			"connections": 15,
		},
		"cache": gin.H{
			"status":      "healthy",
			"responseTime": "1ms",
			"hitRate":     "94.2%",
		},
		"queue": gin.H{
			"status":       "warning",
			"responseTime": "5ms",
			"pendingJobs":  127,
		},
		"api": gin.H{
			"status":      "healthy",
			"responseTime": "45ms",
			"uptime":      "99.9%",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// ExportDashboard exports dashboard data
func (h *Handler) ExportDashboard(c *gin.Context) {
	var req struct {
		Format       string `json:"format" binding:"required"`
		IncludeCharts bool   `json:"includeCharts"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// For now, return a mock response
	// In real implementation, this would generate an actual Excel/PDF file
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=dashboard-export.xlsx")
	
	// Mock Excel content
	mockExcelContent := []byte("Mock Excel content for dashboard export")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", mockExcelContent)
}

// ExportRecentTransactions exports recent transactions
func (h *Handler) ExportRecentTransactions(c *gin.Context) {
	// For now, return a mock response
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=recent-transactions.xlsx")
	
	// Mock Excel content
	mockExcelContent := []byte("Mock Excel content for recent transactions export")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", mockExcelContent)
}
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
)

// RotationRuleHandler handles rotation rule related HTTP requests
type RotationRuleHandler struct {
	rotationService service.RotationService
}

// NewRotationRuleHandler creates a new rotation rule handler
func NewRotationRuleHandler(rotationService service.RotationService) *RotationRuleHandler {
	return &RotationRuleHandler{
		rotationService: rotationService,
	}
}

// CreateRotationRule creates a new rotation rule
func (h *RotationRuleHandler) CreateRotationRule(c *gin.Context) {
	var req repository.CreateRotationRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	rule, err := h.rotationService.CreateRotationRule(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "CREATE_FAILED",
			"message": "创建轮询规则失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code":    "SUCCESS",
		"message": "轮询规则创建成功",
		"data":    rule,
	})
}

// GetRotationRule retrieves a rotation rule by ID
func (h *RotationRuleHandler) GetRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ID",
			"message": "无效的规则ID",
		})
		return
	}

	rule, err := h.rotationService.GetRotationRule(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    "NOT_FOUND",
			"message": "轮询规则不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    "SUCCESS",
		"message": "获取轮询规则成功",
		"data":    rule,
	})
}

// UpdateRotationRule updates an existing rotation rule
func (h *RotationRuleHandler) UpdateRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ID",
			"message": "无效的规则ID",
		})
		return
	}

	var req repository.UpdateRotationRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_REQUEST",
			"message": "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	rule, err := h.rotationService.UpdateRotationRule(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "UPDATE_FAILED",
			"message": "更新轮询规则失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    "SUCCESS",
		"message": "轮询规则更新成功",
		"data":    rule,
	})
}

// DeleteRotationRule deletes a rotation rule
func (h *RotationRuleHandler) DeleteRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ID",
			"message": "无效的规则ID",
		})
		return
	}

	err = h.rotationService.DeleteRotationRule(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "DELETE_FAILED",
			"message": "删除轮询规则失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    "SUCCESS",
		"message": "轮询规则删除成功",
	})
}

// ListRotationRules retrieves rotation rules with filtering and pagination
func (h *RotationRuleHandler) ListRotationRules(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	filter := &repository.RotationRuleFilter{
		Limit:    limit,
		Offset:   (page - 1) * limit,
		OrderBy:  c.DefaultQuery("order_by", "created_at"),
		OrderDir: c.DefaultQuery("order_dir", "DESC"),
	}

	// Parse merchant_id filter
	if merchantIDStr := c.Query("merchant_id"); merchantIDStr != "" {
		if merchantID, err := uuid.Parse(merchantIDStr); err == nil {
			filter.MerchantID = &merchantID
		}
	}

	// Parse strategy_type filter
	if strategyType := c.Query("strategy_type"); strategyType != "" {
		filter.StrategyType = &strategyType
	}

	// Parse is_active filter
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filter.IsActive = &isActive
		}
	}

	rules, err := h.rotationService.ListRotationRules(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "LIST_FAILED",
			"message": "获取轮询规则列表失败",
			"details": err.Error(),
		})
		return
	}

	// Convert to response format
	var responses []repository.RotationRuleResponse
	for _, rule := range rules {
		response := repository.RotationRuleResponse{
			ID:             rule.ID,
			MerchantID:     rule.MerchantID,
			RuleName:       rule.RuleName,
			StrategyType:   rule.StrategyType,
			StrategyConfig: rule.StrategyConfig,
			IsActive:       rule.IsActive,
			Priority:       rule.Priority,
			CreatedAt:      rule.CreatedAt,
			UpdatedAt:      rule.UpdatedAt,
		}
		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    "SUCCESS",
		"message": "获取轮询规则列表成功",
		"data":    responses,
		"total":   len(responses), // TODO: 实现真正的总数统计
		"page":    page,
		"limit":   limit,
	})
}

// GetMerchantRotationRules retrieves all rotation rules for a specific merchant
func (h *RotationRuleHandler) GetMerchantRotationRules(c *gin.Context) {
	merchantIDStr := c.Param("merchant_id")
	merchantID, err := uuid.Parse(merchantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_MERCHANT_ID",
			"message": "无效的商户ID",
		})
		return
	}

	rules, err := h.rotationService.GetMerchantRotationRules(c.Request.Context(), merchantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "GET_FAILED",
			"message": "获取商户轮询规则失败",
			"details": err.Error(),
		})
		return
	}

	// Convert to response format
	var responses []repository.RotationRuleResponse
	for _, rule := range rules {
		response := repository.RotationRuleResponse{
			ID:             rule.ID,
			MerchantID:     rule.MerchantID,
			RuleName:       rule.RuleName,
			StrategyType:   rule.StrategyType,
			StrategyConfig: rule.StrategyConfig,
			IsActive:       rule.IsActive,
			Priority:       rule.Priority,
			CreatedAt:      rule.CreatedAt,
			UpdatedAt:      rule.UpdatedAt,
		}
		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    "SUCCESS",
		"message": "获取商户轮询规则成功",
		"data":    responses,
	})
}
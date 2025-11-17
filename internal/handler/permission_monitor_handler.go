package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/company/cjpayment/internal/middleware"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PermissionMonitorHandler handles permission monitoring HTTP requests
type PermissionMonitorHandler struct {
	monitorService service.PermissionMonitorService
}

// NewPermissionMonitorHandler creates a new permission monitor handler
func NewPermissionMonitorHandler(monitorService service.PermissionMonitorService) *PermissionMonitorHandler {
	return &PermissionMonitorHandler{
		monitorService: monitorService,
	}
}

// GetViolations retrieves permission violations with filtering
func (h *PermissionMonitorHandler) GetViolations(c *gin.Context) {
	filter := &service.ViolationFilter{
		Limit: 50, // Default limit
	}

	// Parse query parameters
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}

	if violationType := c.Query("violation_type"); violationType != "" {
		filter.ViolationType = &violationType
	}

	if severityStr := c.Query("severity"); severityStr != "" {
		filter.Severity = &severityStr
	}

	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			filter.StartTime = &startTime
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			filter.EndTime = &endTime
		}
	}

	if isResolvedStr := c.Query("is_resolved"); isResolvedStr != "" {
		if isResolved, err := strconv.ParseBool(isResolvedStr); err == nil {
			filter.IsResolved = &isResolved
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 1000 {
			filter.Limit = limit
		}
	}

	violations, err := h.monitorService.GetViolations(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get violations",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"violations": violations,
		"count":      len(violations),
		"filter":     filter,
	})
}

// GetUserViolations retrieves violations for a specific user
func (h *PermissionMonitorHandler) GetUserViolations(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 1000 {
			limit = parsedLimit
		}
	}

	violations, err := h.monitorService.GetViolationsByUser(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user violations",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"violations": violations,
		"count":      len(violations),
		"user_id":    userID,
	})
}

// ResolveViolation marks a violation as resolved
func (h *PermissionMonitorHandler) ResolveViolation(c *gin.Context) {
	violationIDStr := c.Param("violationId")
	violationID, err := uuid.Parse(violationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid violation ID",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	if err := h.monitorService.ResolveViolation(c.Request.Context(), violationID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to resolve violation",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Violation resolved successfully",
	})
}

// CreateAlert creates a new permission alert
func (h *PermissionMonitorHandler) CreateAlert(c *gin.Context) {
	var req struct {
		Name             string                 `json:"name" binding:"required"`
		Description      string                 `json:"description"`
		AlertType        string                 `json:"alert_type" binding:"required"`
		Conditions       map[string]interface{} `json:"conditions"`
		Threshold        int                    `json:"threshold" binding:"required"`
		TimeWindow       string                 `json:"time_window" binding:"required"`
		Severity         string                 `json:"severity" binding:"required"`
		NotificationURLs []string               `json:"notification_urls"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	timeWindow, err := time.ParseDuration(req.TimeWindow)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid time window format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	alert := &service.PermissionAlert{
		Name:             req.Name,
		Description:      req.Description,
		AlertType:        req.AlertType,
		Conditions:       req.Conditions,
		Threshold:        req.Threshold,
		TimeWindow:       timeWindow,
		Severity:         req.Severity,
		IsActive:         true,
		NotificationURLs: req.NotificationURLs,
	}

	if err := h.monitorService.CreateAlert(c.Request.Context(), alert); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create alert",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"alert":   alert,
		"message": "Alert created successfully",
	})
}

// UpdateAlert updates an existing alert
func (h *PermissionMonitorHandler) UpdateAlert(c *gin.Context) {
	alertIDStr := c.Param("alertId")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid alert ID",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	var req struct {
		Name             *string                 `json:"name"`
		Description      *string                 `json:"description"`
		AlertType        *string                 `json:"alert_type"`
		Conditions       *map[string]interface{} `json:"conditions"`
		Threshold        *int                    `json:"threshold"`
		TimeWindow       *string                 `json:"time_window"`
		Severity         *string                 `json:"severity"`
		IsActive         *bool                   `json:"is_active"`
		NotificationURLs *[]string               `json:"notification_urls"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	// Get existing alert
	existingAlert, err := h.monitorService.GetAlert(c.Request.Context(), alertID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Alert not found",
			"code":  "ALERT_NOT_FOUND",
		})
		return
	}

	// Update fields
	if req.Name != nil {
		existingAlert.Name = *req.Name
	}
	if req.Description != nil {
		existingAlert.Description = *req.Description
	}
	if req.AlertType != nil {
		existingAlert.AlertType = *req.AlertType
	}
	if req.Conditions != nil {
		existingAlert.Conditions = *req.Conditions
	}
	if req.Threshold != nil {
		existingAlert.Threshold = *req.Threshold
	}
	if req.TimeWindow != nil {
		timeWindow, err := time.ParseDuration(*req.TimeWindow)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid time window format",
				"code":  "INVALID_REQUEST",
			})
			return
		}
		existingAlert.TimeWindow = timeWindow
	}
	if req.Severity != nil {
		existingAlert.Severity = *req.Severity
	}
	if req.IsActive != nil {
		existingAlert.IsActive = *req.IsActive
	}
	if req.NotificationURLs != nil {
		existingAlert.NotificationURLs = *req.NotificationURLs
	}

	if err := h.monitorService.UpdateAlert(c.Request.Context(), alertID, existingAlert); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update alert",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"alert":   existingAlert,
		"message": "Alert updated successfully",
	})
}

// DeleteAlert deletes an alert
func (h *PermissionMonitorHandler) DeleteAlert(c *gin.Context) {
	alertIDStr := c.Param("alertId")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid alert ID",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	if err := h.monitorService.DeleteAlert(c.Request.Context(), alertID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete alert",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Alert deleted successfully",
	})
}

// GetAlert retrieves a specific alert
func (h *PermissionMonitorHandler) GetAlert(c *gin.Context) {
	alertIDStr := c.Param("alertId")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid alert ID",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	alert, err := h.monitorService.GetAlert(c.Request.Context(), alertID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Alert not found",
			"code":  "ALERT_NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"alert": alert,
	})
}

// ListAlerts retrieves all alerts
func (h *PermissionMonitorHandler) ListAlerts(c *gin.Context) {
	alerts, err := h.monitorService.ListAlerts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list alerts",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"alerts": alerts,
		"count":  len(alerts),
	})
}

// GetSecurityMetrics retrieves security metrics
func (h *PermissionMonitorHandler) GetSecurityMetrics(c *gin.Context) {
	timeRangeStr := c.Query("time_range")
	if timeRangeStr == "" {
		timeRangeStr = "24h" // Default to last 24 hours
	}

	timeRange, err := time.ParseDuration(timeRangeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid time range format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	metrics, err := h.monitorService.GetSecurityMetrics(c.Request.Context(), timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get security metrics",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
	})
}

// GetUserRiskScore retrieves risk score for a user
func (h *PermissionMonitorHandler) GetUserRiskScore(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	riskScore, err := h.monitorService.GetUserRiskScore(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user risk score",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"risk_score": riskScore,
	})
}

// GetSuspiciousActivities retrieves recent suspicious activities
func (h *PermissionMonitorHandler) GetSuspiciousActivities(c *gin.Context) {
	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 1000 {
			limit = parsedLimit
		}
	}

	activities, err := h.monitorService.GetSuspiciousActivities(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get suspicious activities",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"count":      len(activities),
	})
}

// GetMonitoringStatus retrieves the current monitoring status
func (h *PermissionMonitorHandler) GetMonitoringStatus(c *gin.Context) {
	status, err := h.monitorService.GetMonitoringStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get monitoring status",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": status,
	})
}

// StartMonitoring starts the permission monitoring
func (h *PermissionMonitorHandler) StartMonitoring(c *gin.Context) {
	if err := h.monitorService.StartMonitoring(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start monitoring",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Monitoring started successfully",
	})
}

// StopMonitoring stops the permission monitoring
func (h *PermissionMonitorHandler) StopMonitoring(c *gin.Context) {
	if err := h.monitorService.StopMonitoring(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to stop monitoring",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Monitoring stopped successfully",
	})
}

// RegisterRoutes registers permission monitoring routes
func (h *PermissionMonitorHandler) RegisterRoutes(router *gin.RouterGroup, authMiddleware gin.HandlerFunc, adminMiddleware gin.HandlerFunc) {
	monitor := router.Group("/permission-monitor")
	monitor.Use(authMiddleware)
	{
		// Violation management (requires admin access)
		violations := monitor.Group("/violations")
		violations.Use(adminMiddleware)
		{
			violations.GET("", h.GetViolations)
			violations.GET("/users/:userId", h.GetUserViolations)
			violations.PUT("/:violationId/resolve", h.ResolveViolation)
		}

		// Alert management (requires admin access)
		alerts := monitor.Group("/alerts")
		alerts.Use(adminMiddleware)
		{
			alerts.POST("", h.CreateAlert)
			alerts.GET("", h.ListAlerts)
			alerts.GET("/:alertId", h.GetAlert)
			alerts.PUT("/:alertId", h.UpdateAlert)
			alerts.DELETE("/:alertId", h.DeleteAlert)
		}

		// Security metrics and monitoring (requires admin access)
		security := monitor.Group("/security")
		security.Use(adminMiddleware)
		{
			security.GET("/metrics", h.GetSecurityMetrics)
			security.GET("/users/:userId/risk-score", h.GetUserRiskScore)
			security.GET("/suspicious-activities", h.GetSuspiciousActivities)
			security.GET("/status", h.GetMonitoringStatus)
			security.POST("/start", h.StartMonitoring)
			security.POST("/stop", h.StopMonitoring)
		}
	}
}
package handler

import (
	"net/http"
	"strconv"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// NotificationHandler handles notification-related HTTP requests
type NotificationHandler struct {
	notificationService service.NotificationService
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(notificationService service.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// CreateNotificationConfig creates a new notification configuration
// @Summary Create notification configuration
// @Description Create a new notification configuration for webhook notifications
// @Tags notifications
// @Accept json
// @Produce json
// @Param config body service.CreateNotificationConfigRequest true "Notification configuration"
// @Success 201 {object} repository.NotificationConfig
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/configs [post]
func (h *NotificationHandler) CreateNotificationConfig(c *gin.Context) {
	var req service.CreateNotificationConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request body",
			Details: err.Error(),
		})
		return
	}

	config, err := h.notificationService.CreateNotificationConfig(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "CREATE_CONFIG_FAILED",
			Message: "Failed to create notification configuration",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, config)
}

// GetNotificationConfig gets a notification configuration by ID
// @Summary Get notification configuration
// @Description Get a notification configuration by ID
// @Tags notifications
// @Produce json
// @Param id path string true "Configuration ID"
// @Success 200 {object} repository.NotificationConfig
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/configs/{id} [get]
func (h *NotificationHandler) GetNotificationConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_ID",
			Message: "Invalid configuration ID",
			Details: err.Error(),
		})
		return
	}

	config, err := h.notificationService.GetNotificationConfig(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Code:    "CONFIG_NOT_FOUND",
			Message: "Notification configuration not found",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateNotificationConfig updates a notification configuration
// @Summary Update notification configuration
// @Description Update an existing notification configuration
// @Tags notifications
// @Accept json
// @Produce json
// @Param id path string true "Configuration ID"
// @Param config body service.UpdateNotificationConfigRequest true "Updated configuration"
// @Success 200 {object} repository.NotificationConfig
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/configs/{id} [put]
func (h *NotificationHandler) UpdateNotificationConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_ID",
			Message: "Invalid configuration ID",
			Details: err.Error(),
		})
		return
	}

	var req service.UpdateNotificationConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request body",
			Details: err.Error(),
		})
		return
	}

	config, err := h.notificationService.UpdateNotificationConfig(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "UPDATE_CONFIG_FAILED",
			Message: "Failed to update notification configuration",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, config)
}

// DeleteNotificationConfig deletes a notification configuration
// @Summary Delete notification configuration
// @Description Delete a notification configuration by ID
// @Tags notifications
// @Param id path string true "Configuration ID"
// @Success 204
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/configs/{id} [delete]
func (h *NotificationHandler) DeleteNotificationConfig(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_ID",
			Message: "Invalid configuration ID",
			Details: err.Error(),
		})
		return
	}

	err = h.notificationService.DeleteNotificationConfig(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "DELETE_CONFIG_FAILED",
			Message: "Failed to delete notification configuration",
			Details: err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// ListNotificationConfigs lists notification configurations
// @Summary List notification configurations
// @Description List notification configurations with optional filtering
// @Tags notifications
// @Produce json
// @Param event_type query string false "Filter by event type"
// @Param target_system query string false "Filter by target system"
// @Param is_active query bool false "Filter by active status"
// @Param limit query int false "Limit number of results" default(20)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {array} repository.NotificationConfig
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/configs [get]
func (h *NotificationHandler) ListNotificationConfigs(c *gin.Context) {
	filter := &service.NotificationConfigFilter{}

	if eventType := c.Query("event_type"); eventType != "" {
		filter.EventType = &eventType
	}

	if targetSystem := c.Query("target_system"); targetSystem != "" {
		filter.TargetSystem = &targetSystem
	}

	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filter.IsActive = &isActive
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	} else {
		filter.Limit = 20
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	configs, err := h.notificationService.ListNotificationConfigs(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "LIST_CONFIGS_FAILED",
			Message: "Failed to list notification configurations",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, configs)
}

// SendNotification sends a direct notification
// @Summary Send notification
// @Description Send a direct notification without using configuration
// @Tags notifications
// @Accept json
// @Produce json
// @Param notification body service.SendNotificationRequest true "Notification details"
// @Success 202 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/send [post]
func (h *NotificationHandler) SendNotification(c *gin.Context) {
	var req service.SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request body",
			Details: err.Error(),
		})
		return
	}

	err := h.notificationService.SendNotification(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SEND_NOTIFICATION_FAILED",
			Message: "Failed to send notification",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Notification queued for delivery",
	})
}

// SendRechargeNotification sends notification for recharge events
// @Summary Send recharge notification
// @Description Send notification for recharge order events
// @Tags notifications
// @Accept json
// @Produce json
// @Param notification body SendRechargeNotificationRequest true "Recharge notification details"
// @Success 202 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/recharge [post]
func (h *NotificationHandler) SendRechargeNotification(c *gin.Context) {
	var req SendRechargeNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request body",
			Details: err.Error(),
		})
		return
	}

	err := h.notificationService.SendRechargeNotification(c.Request.Context(), req.OrderID, req.EventType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SEND_RECHARGE_NOTIFICATION_FAILED",
			Message: "Failed to send recharge notification",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Recharge notification queued for delivery",
	})
}

// GetNotificationLogs gets notification logs
// @Summary Get notification logs
// @Description Get notification logs with filtering and pagination
// @Tags notifications
// @Produce json
// @Param notification_id query string false "Filter by notification ID"
// @Param order_id query string false "Filter by recharge order ID"
// @Param event_type query string false "Filter by event type"
// @Param status query string false "Filter by status"
// @Param limit query int false "Limit number of results" default(20)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {object} NotificationLogsResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/logs [get]
func (h *NotificationHandler) GetNotificationLogs(c *gin.Context) {
	filter := &service.NotificationLogFilter{}

	if notificationIDStr := c.Query("notification_id"); notificationIDStr != "" {
		if notificationID, err := uuid.Parse(notificationIDStr); err == nil {
			filter.NotificationID = &notificationID
		}
	}

	if orderIDStr := c.Query("order_id"); orderIDStr != "" {
		if orderID, err := uuid.Parse(orderIDStr); err == nil {
			filter.RechargeOrderID = &orderID
		}
	}

	if eventType := c.Query("event_type"); eventType != "" {
		filter.EventType = &eventType
	}

	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	} else {
		filter.Limit = 20
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	logs, total, err := h.notificationService.GetNotificationLogs(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "GET_LOGS_FAILED",
			Message: "Failed to get notification logs",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, NotificationLogsResponse{
		Logs:  logs,
		Total: total,
		Limit: filter.Limit,
		Offset: filter.Offset,
	})
}

// RetryFailedNotifications retries all failed notifications
// @Summary Retry failed notifications
// @Description Retry all failed notifications that are eligible for retry
// @Tags notifications
// @Produce json
// @Success 202 {object} map[string]string
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/retry [post]
func (h *NotificationHandler) RetryFailedNotifications(c *gin.Context) {
	err := h.notificationService.RetryFailedNotifications(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "RETRY_FAILED",
			Message: "Failed to retry notifications",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Failed notifications queued for retry",
	})
}

// GetRealTimeNotifications gets real-time notifications for a user
// @Summary Get real-time notifications
// @Description Get pending real-time notifications for a user
// @Tags notifications
// @Produce json
// @Param user_id path string true "User ID"
// @Param limit query int false "Limit number of results" default(10)
// @Success 200 {array} service.RealTimeNotification
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/realtime/{user_id} [get]
func (h *NotificationHandler) GetRealTimeNotifications(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_USER_ID",
			Message: "Invalid user ID",
			Details: err.Error(),
		})
		return
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil {
			limit = parsedLimit
		}
	}

	notifications, err := h.notificationService.GetRealTimeNotifications(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "GET_REALTIME_NOTIFICATIONS_FAILED",
			Message: "Failed to get real-time notifications",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// MarkRealTimeNotificationsAsRead marks real-time notifications as read
// @Summary Mark notifications as read
// @Description Mark real-time notifications as read for a user
// @Tags notifications
// @Accept json
// @Produce json
// @Param user_id path string true "User ID"
// @Param request body MarkNotificationsReadRequest true "Mark as read request"
// @Success 200 {object} map[string]string
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/notifications/realtime/{user_id}/read [post]
func (h *NotificationHandler) MarkRealTimeNotificationsAsRead(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_USER_ID",
			Message: "Invalid user ID",
			Details: err.Error(),
		})
		return
	}

	var req MarkNotificationsReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request body",
			Details: err.Error(),
		})
		return
	}

	err = h.notificationService.MarkRealTimeNotificationsAsRead(c.Request.Context(), userID, req.Count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "MARK_READ_FAILED",
			Message: "Failed to mark notifications as read",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notifications marked as read",
	})
}

// Request/Response types

type SendRechargeNotificationRequest struct {
	OrderID   uuid.UUID `json:"order_id" binding:"required"`
	EventType string    `json:"event_type" binding:"required"`
}

type NotificationLogsResponse struct {
	Logs   interface{} `json:"logs"`
	Total  int64       `json:"total"`
	Limit  int         `json:"limit"`
	Offset int         `json:"offset"`
}

type MarkNotificationsReadRequest struct {
	Count int `json:"count" binding:"required,min=1"`
}
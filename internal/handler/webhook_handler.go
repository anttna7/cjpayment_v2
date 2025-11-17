package handler

import (
	"net/http"
	"strconv"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// WebhookHandler handles webhook-related HTTP requests
type WebhookHandler struct {
	notificationService service.NotificationService
	webhookService      service.WebhookService
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(notificationService service.NotificationService, webhookService service.WebhookService) *WebhookHandler {
	return &WebhookHandler{
		notificationService: notificationService,
		webhookService:      webhookService,
	}
}

// RegisterRoutes registers webhook routes
func (h *WebhookHandler) RegisterRoutes(router *gin.RouterGroup) {
	webhooks := router.Group("/webhooks")
	{
		webhooks.POST("", h.RegisterWebhook)
		webhooks.GET("", h.ListWebhooks)
		webhooks.GET("/:id", h.GetWebhook)
		webhooks.PUT("/:id", h.UpdateWebhook)
		webhooks.DELETE("/:id", h.UnregisterWebhook)
		webhooks.POST("/:id/validate", h.ValidateWebhookSignature)
		
		// Event management
		webhooks.POST("/events", h.CreateEvent)
		webhooks.GET("/events", h.ListEvents)
		webhooks.GET("/events/:id", h.GetEvent)
		
		// Delivery management
		webhooks.GET("/deliveries", h.GetDeliveries)
		webhooks.GET("/deliveries/:id", h.GetDelivery)
		webhooks.POST("/deliveries/:id/retry", h.RetryDelivery)
		webhooks.POST("/deliveries/retry-failed", h.RetryFailedDeliveries)
	}

	// Notification configuration routes
	notifications := router.Group("/notifications")
	{
		notifications.POST("/configs", h.CreateNotificationConfig)
		notifications.GET("/configs", h.ListNotificationConfigs)
		notifications.GET("/configs/:id", h.GetNotificationConfig)
		notifications.PUT("/configs/:id", h.UpdateNotificationConfig)
		notifications.DELETE("/configs/:id", h.DeleteNotificationConfig)

		notifications.POST("/send", h.SendCustomNotification)
		notifications.POST("/retry", h.RetryFailedNotifications)
		notifications.POST("/retry/:id", h.RetryNotification)

		notifications.GET("/logs", h.GetNotificationLogs)
		notifications.GET("/status/:order_id", h.GetNotificationStatus)
		notifications.GET("/failed", h.GetFailedNotifications)
	}
}

// RegisterWebhook registers a new webhook
func (h *WebhookHandler) RegisterWebhook(c *gin.Context) {
	var req service.RegisterWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	webhook, err := h.notificationService.RegisterWebhook(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to register webhook",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Webhook registered successfully",
		"data":    webhook,
	})
}

// ListWebhooks lists registered webhooks
func (h *WebhookHandler) ListWebhooks(c *gin.Context) {
	var filter service.WebhookFilter

	// Parse query parameters
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filter.IsActive = &isActive
		}
	}

	webhooks, err := h.notificationService.ListWebhooks(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list webhooks",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Webhooks retrieved successfully",
		"data":    webhooks,
	})
}

// UnregisterWebhook unregisters a webhook
func (h *WebhookHandler) UnregisterWebhook(c *gin.Context) {
	idStr := c.Param("id")
	webhookID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid webhook ID",
			"details": err.Error(),
		})
		return
	}

	if err := h.notificationService.UnregisterWebhook(c.Request.Context(), webhookID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to unregister webhook",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Webhook unregistered successfully",
	})
}

// ValidateWebhookSignature validates a webhook signature
func (h *WebhookHandler) ValidateWebhookSignature(c *gin.Context) {
	idStr := c.Param("id")
	webhookID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid webhook ID",
			"details": err.Error(),
		})
		return
	}

	var req struct {
		Payload   string `json:"payload" binding:"required"`
		Signature string `json:"signature" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	valid, err := h.notificationService.ValidateWebhookSignature(
		c.Request.Context(),
		webhookID,
		[]byte(req.Payload),
		req.Signature,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to validate signature",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Signature validation completed",
		"data": gin.H{
			"valid": valid,
		},
	})
}

// CreateNotificationConfig creates a new notification configuration
func (h *WebhookHandler) CreateNotificationConfig(c *gin.Context) {
	var req service.CreateNotificationConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	config, err := h.notificationService.CreateNotificationConfig(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create notification config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Notification config created successfully",
		"data":    config,
	})
}

// ListNotificationConfigs lists notification configurations
func (h *WebhookHandler) ListNotificationConfigs(c *gin.Context) {
	var filter service.NotificationConfigFilter

	// Parse query parameters
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

	// Parse pagination
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	filter.OrderBy = c.DefaultQuery("order_by", "created_at")
	filter.OrderDir = c.DefaultQuery("order_dir", "DESC")

	configs, err := h.notificationService.ListNotificationConfigs(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list notification configs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification configs retrieved successfully",
		"data":    configs,
	})
}

// GetNotificationConfig gets a notification configuration by ID
func (h *WebhookHandler) GetNotificationConfig(c *gin.Context) {
	idStr := c.Param("id")
	configID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid config ID",
			"details": err.Error(),
		})
		return
	}

	config, err := h.notificationService.GetNotificationConfig(c.Request.Context(), configID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get notification config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification config retrieved successfully",
		"data":    config,
	})
}

// UpdateNotificationConfig updates a notification configuration
func (h *WebhookHandler) UpdateNotificationConfig(c *gin.Context) {
	idStr := c.Param("id")
	configID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid config ID",
			"details": err.Error(),
		})
		return
	}

	var req service.UpdateNotificationConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	config, err := h.notificationService.UpdateNotificationConfig(c.Request.Context(), configID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update notification config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification config updated successfully",
		"data":    config,
	})
}

// DeleteNotificationConfig deletes a notification configuration
func (h *WebhookHandler) DeleteNotificationConfig(c *gin.Context) {
	idStr := c.Param("id")
	configID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid config ID",
			"details": err.Error(),
		})
		return
	}

	if err := h.notificationService.DeleteNotificationConfig(c.Request.Context(), configID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete notification config",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification config deleted successfully",
	})
}

// SendCustomNotification sends a custom notification
func (h *WebhookHandler) SendCustomNotification(c *gin.Context) {
	var req service.SendCustomNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	if err := h.notificationService.SendCustomNotification(c.Request.Context(), &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to send notification",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification sent successfully",
	})
}

// RetryFailedNotifications retries all failed notifications
func (h *WebhookHandler) RetryFailedNotifications(c *gin.Context) {
	if err := h.notificationService.RetryFailedNotifications(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retry notifications",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Failed notifications retry initiated",
	})
}

// RetryNotification retries a specific notification
func (h *WebhookHandler) RetryNotification(c *gin.Context) {
	idStr := c.Param("id")
	logID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid log ID",
			"details": err.Error(),
		})
		return
	}

	if err := h.notificationService.RetryNotification(c.Request.Context(), logID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retry notification",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification retry initiated",
	})
}

// GetNotificationLogs gets notification logs with filtering and pagination
func (h *WebhookHandler) GetNotificationLogs(c *gin.Context) {
	var filter service.NotificationLogFilter

	// Parse query parameters
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

	// Parse pagination
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	filter.OrderBy = c.DefaultQuery("order_by", "created_at")
	filter.OrderDir = c.DefaultQuery("order_dir", "DESC")

	logs, total, err := h.notificationService.GetNotificationLogs(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get notification logs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification logs retrieved successfully",
		"data": gin.H{
			"logs":  logs,
			"total": total,
		},
	})
}

// GetNotificationStatus gets notification status for a recharge order
func (h *WebhookHandler) GetNotificationStatus(c *gin.Context) {
	orderIDStr := c.Param("order_id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid order ID",
			"details": err.Error(),
		})
		return
	}

	statuses, err := h.notificationService.GetNotificationStatus(c.Request.Context(), orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get notification status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification status retrieved successfully",
		"data":    statuses,
	})
}

// GetFailedNotifications gets failed notifications with filtering
func (h *WebhookHandler) GetFailedNotifications(c *gin.Context) {
	var filter service.FailedNotificationFilter

	// Parse query parameters
	if eventType := c.Query("event_type"); eventType != "" {
		filter.EventType = &eventType
	}

	// Parse pagination
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	filter.OrderBy = c.DefaultQuery("order_by", "created_at")
	filter.OrderDir = c.DefaultQuery("order_dir", "DESC")

	logs, err := h.notificationService.GetFailedNotifications(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get failed notifications",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Failed notifications retrieved successfully",
		"data":    logs,
	})
}

// GetWebhook gets a webhook by ID
func (h *WebhookHandler) GetWebhook(c *gin.Context) {
	idStr := c.Param("id")
	webhookID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid webhook ID",
			"details": err.Error(),
		})
		return
	}

	webhook, err := h.webhookService.GetWebhook(c.Request.Context(), webhookID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get webhook",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Webhook retrieved successfully",
		"data":    webhook,
	})
}

// UpdateWebhook updates a webhook
func (h *WebhookHandler) UpdateWebhook(c *gin.Context) {
	idStr := c.Param("id")
	webhookID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid webhook ID",
			"details": err.Error(),
		})
		return
	}

	var req service.UpdateWebhookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	webhook, err := h.webhookService.UpdateWebhook(c.Request.Context(), webhookID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update webhook",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Webhook updated successfully",
		"data":    webhook,
	})
}

// CreateEvent creates a new webhook event
func (h *WebhookHandler) CreateEvent(c *gin.Context) {
	var req service.CreateWebhookEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	event, err := h.webhookService.CreateEvent(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create event",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Event created successfully",
		"data":    event,
	})
}

// ListEvents lists webhook events
func (h *WebhookHandler) ListEvents(c *gin.Context) {
	var filter service.WebhookEventFilter

	// Parse query parameters
	if eventType := c.Query("event_type"); eventType != "" {
		filter.EventType = &eventType
	}
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}

	// Parse pagination
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	filter.OrderBy = c.DefaultQuery("order_by", "timestamp")
	filter.OrderDir = c.DefaultQuery("order_dir", "DESC")

	events, err := h.webhookService.ListEvents(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list events",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Events retrieved successfully",
		"data":    events,
	})
}

// GetEvent gets a webhook event by ID
func (h *WebhookHandler) GetEvent(c *gin.Context) {
	idStr := c.Param("id")
	eventID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid event ID",
			"details": err.Error(),
		})
		return
	}

	event, err := h.webhookService.GetEvent(c.Request.Context(), eventID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get event",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Event retrieved successfully",
		"data":    event,
	})
}

// GetDeliveries gets webhook deliveries
func (h *WebhookHandler) GetDeliveries(c *gin.Context) {
	var filter service.WebhookDeliveryFilter

	// Parse query parameters
	if webhookIDStr := c.Query("webhook_id"); webhookIDStr != "" {
		if webhookID, err := uuid.Parse(webhookIDStr); err == nil {
			filter.WebhookID = &webhookID
		}
	}
	if eventIDStr := c.Query("event_id"); eventIDStr != "" {
		if eventID, err := uuid.Parse(eventIDStr); err == nil {
			filter.EventID = &eventID
		}
	}
	if eventType := c.Query("event_type"); eventType != "" {
		filter.EventType = &eventType
	}
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}

	// Parse pagination
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	filter.OrderBy = c.DefaultQuery("order_by", "created_at")
	filter.OrderDir = c.DefaultQuery("order_dir", "DESC")

	deliveries, total, err := h.webhookService.GetDeliveries(c.Request.Context(), &filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get deliveries",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Deliveries retrieved successfully",
		"data": gin.H{
			"deliveries": deliveries,
			"total":      total,
		},
	})
}

// GetDelivery gets a webhook delivery by ID
func (h *WebhookHandler) GetDelivery(c *gin.Context) {
	idStr := c.Param("id")
	deliveryID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid delivery ID",
			"details": err.Error(),
		})
		return
	}

	delivery, err := h.webhookService.GetDelivery(c.Request.Context(), deliveryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get delivery",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Delivery retrieved successfully",
		"data":    delivery,
	})
}

// RetryDelivery retries a specific webhook delivery
func (h *WebhookHandler) RetryDelivery(c *gin.Context) {
	idStr := c.Param("id")
	deliveryID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid delivery ID",
			"details": err.Error(),
		})
		return
	}

	if err := h.webhookService.RetryDelivery(c.Request.Context(), deliveryID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retry delivery",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Delivery retry initiated",
	})
}

// RetryFailedDeliveries retries all failed webhook deliveries
func (h *WebhookHandler) RetryFailedDeliveries(c *gin.Context) {
	if err := h.webhookService.RetryFailedDeliveries(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retry failed deliveries",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Failed deliveries retry initiated",
	})
}
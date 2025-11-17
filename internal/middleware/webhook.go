package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// WebhookSignatureValidator validates webhook signatures
type WebhookSignatureValidator struct {
	notificationService service.NotificationService
}

// NewWebhookSignatureValidator creates a new webhook signature validator
func NewWebhookSignatureValidator(notificationService service.NotificationService) *WebhookSignatureValidator {
	return &WebhookSignatureValidator{
		notificationService: notificationService,
	}
}

// ValidateSignature validates webhook signature middleware
func (v *WebhookSignatureValidator) ValidateSignature() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get webhook ID from path parameter
		webhookIDStr := c.Param("webhook_id")
		if webhookIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Webhook ID is required",
			})
			c.Abort()
			return
		}

		webhookID, err := uuid.Parse(webhookIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid webhook ID format",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Get signature from header
		signature := c.GetHeader("X-Webhook-Signature")
		if signature == "" {
			signature = c.GetHeader("X-Hub-Signature-256")
		}
		if signature == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Webhook signature is required",
			})
			c.Abort()
			return
		}

		// Read request body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Failed to read request body",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Restore request body for downstream handlers
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		// Validate signature
		valid, err := v.notificationService.ValidateWebhookSignature(
			c.Request.Context(),
			webhookID,
			body,
			signature,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to validate webhook signature",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		if !valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid webhook signature",
			})
			c.Abort()
			return
		}

		// Store webhook ID in context for downstream handlers
		c.Set("webhook_id", webhookID)
		c.Next()
	}
}

// ValidateSignatureWithSecret validates webhook signature with provided secret
func ValidateSignatureWithSecret(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get signature from header
		signature := c.GetHeader("X-Webhook-Signature")
		if signature == "" {
			signature = c.GetHeader("X-Hub-Signature-256")
		}
		if signature == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Webhook signature is required",
			})
			c.Abort()
			return
		}

		// Read request body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Failed to read request body",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Restore request body for downstream handlers
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		// Calculate expected signature
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(body)
		expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

		// Validate signature
		if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid webhook signature",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// WebhookRateLimiter provides rate limiting for webhook endpoints
type WebhookRateLimiter struct {
	// This could be implemented using Redis or in-memory store
	// For now, we'll keep it simple
}

// NewWebhookRateLimiter creates a new webhook rate limiter
func NewWebhookRateLimiter() *WebhookRateLimiter {
	return &WebhookRateLimiter{}
}

// RateLimit applies rate limiting to webhook endpoints
func (r *WebhookRateLimiter) RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client IP or webhook ID for rate limiting
		clientID := c.ClientIP()
		if webhookID := c.GetString("webhook_id"); webhookID != "" {
			clientID = webhookID
		}

		// TODO: Implement actual rate limiting logic
		// For now, just pass through
		_ = clientID

		c.Next()
	}
}

// WebhookLogger logs webhook requests and responses
type WebhookLogger struct{}

// NewWebhookLogger creates a new webhook logger
func NewWebhookLogger() *WebhookLogger {
	return &WebhookLogger{}
}

// LogRequest logs webhook requests
func (l *WebhookLogger) LogRequest() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[WEBHOOK] %v | %3d | %13v | %15s | %-7s %#v\n%s",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			param.StatusCode,
			param.Latency,
			param.ClientIP,
			param.Method,
			param.Path,
			param.ErrorMessage,
		)
	})
}

// WebhookHeaders adds standard webhook headers
func WebhookHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Webhook-Version", "1.0")
		c.Header("X-Webhook-Timestamp", fmt.Sprintf("%d", time.Now().Unix()))
		c.Next()
	}
}

// WebhookCORS handles CORS for webhook endpoints
func WebhookCORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Allow specific origins or all origins for webhooks
		// In production, you should restrict this to known webhook sources
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Header("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Webhook-Signature, X-Hub-Signature-256")
		c.Header("Access-Control-Expose-Headers", "X-Webhook-Version, X-Webhook-Timestamp")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
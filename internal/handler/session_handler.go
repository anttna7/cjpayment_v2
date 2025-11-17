package handler

import (
	"net/http"

	"github.com/company/cjpayment/internal/middleware"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
)

// SessionHandler handles session-related HTTP requests
type SessionHandler struct {
	sessionService service.SessionService
}

// NewSessionHandler creates a new session handler
func NewSessionHandler(sessionService service.SessionService) *SessionHandler {
	return &SessionHandler{
		sessionService: sessionService,
	}
}

// GetUserSessions retrieves all active sessions for the authenticated user
func (h *SessionHandler) GetUserSessions(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	sessions, err := h.sessionService.GetUserSessions(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user sessions",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// GetSession retrieves a specific session by ID
func (h *SessionHandler) GetSession(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Session ID is required",
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

	session, err := h.sessionService.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		if err == service.ErrSessionNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Session not found",
				"code":  "SESSION_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get session",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	// Check if user owns the session
	if session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
			"code":  "ACCESS_DENIED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session": session,
	})
}

// TerminateSession terminates a specific session
func (h *SessionHandler) TerminateSession(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Session ID is required",
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

	// First check if user owns the session
	session, err := h.sessionService.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		if err == service.ErrSessionNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Session not found",
				"code":  "SESSION_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get session",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	if session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
			"code":  "ACCESS_DENIED",
		})
		return
	}

	// Terminate the session
	if err := h.sessionService.TerminateSession(c.Request.Context(), sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to terminate session",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Session terminated successfully",
	})
}

// TerminateAllSessions terminates all sessions for the authenticated user except the current one
func (h *SessionHandler) TerminateAllSessions(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	// Get current session ID from header if available
	currentSessionID := c.GetHeader("X-Session-ID")

	var err error
	if currentSessionID != "" {
		// Terminate all sessions except current one
		err = h.sessionService.TerminateUserSessions(c.Request.Context(), userID, currentSessionID)
	} else {
		// Terminate all sessions
		err = h.sessionService.TerminateAllUserSessions(c.Request.Context(), userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to terminate sessions",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Sessions terminated successfully",
	})
}

// RenewSession extends the expiration time of a session
func (h *SessionHandler) RenewSession(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Session ID is required",
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

	// First check if user owns the session
	session, err := h.sessionService.GetSession(c.Request.Context(), sessionID)
	if err != nil {
		if err == service.ErrSessionNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Session not found",
				"code":  "SESSION_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get session",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	if session.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
			"code":  "ACCESS_DENIED",
		})
		return
	}

	// Renew the session
	renewedSession, err := h.sessionService.RenewSession(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to renew session",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session": renewedSession,
		"message": "Session renewed successfully",
	})
}

// GetUserDevices retrieves all registered devices for the authenticated user
func (h *SessionHandler) GetUserDevices(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	devices, err := h.sessionService.GetUserDevices(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user devices",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"devices": devices,
		"count":   len(devices),
	})
}

// TrustDevice marks a device as trusted
func (h *SessionHandler) TrustDevice(c *gin.Context) {
	deviceID := c.Param("deviceId")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Device ID is required",
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

	if err := h.sessionService.TrustDevice(c.Request.Context(), userID, deviceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to trust device",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Device trusted successfully",
	})
}

// UntrustDevice marks a device as untrusted
func (h *SessionHandler) UntrustDevice(c *gin.Context) {
	deviceID := c.Param("deviceId")
	if deviceID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Device ID is required",
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

	if err := h.sessionService.UntrustDevice(c.Request.Context(), userID, deviceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to untrust device",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Device untrusted successfully",
	})
}

// DetectAnomalousLogin checks for anomalous login patterns
func (h *SessionHandler) DetectAnomalousLogin(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	result, err := h.sessionService.DetectAnomalousLogin(c.Request.Context(), userID, ipAddress, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to detect anomalous login",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"anomaly_result": result,
	})
}

// GetSessionStatistics retrieves session statistics
func (h *SessionHandler) GetSessionStatistics(c *gin.Context) {
	stats, err := h.sessionService.GetSessionStatistics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get session statistics",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"statistics": stats,
	})
}

// ValidateSession validates a session and returns session info
func (h *SessionHandler) ValidateSession(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		sessionID = c.GetHeader("X-Session-ID")
	}

	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Session ID is required",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	session, err := h.sessionService.ValidateSession(c.Request.Context(), sessionID)
	if err != nil {
		if err == service.ErrSessionNotFound || err == service.ErrSessionExpired {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired session",
				"code":  "SESSION_INVALID",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to validate session",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session": session,
		"valid":   true,
	})
}

// RegisterRoutes registers session-related routes
func (h *SessionHandler) RegisterRoutes(router *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	sessions := router.Group("/sessions")
	sessions.Use(authMiddleware)
	{
		// Session management
		sessions.GET("", h.GetUserSessions)
		sessions.GET("/:sessionId", h.GetSession)
		sessions.DELETE("/:sessionId", h.TerminateSession)
		sessions.DELETE("", h.TerminateAllSessions)
		sessions.PUT("/:sessionId/renew", h.RenewSession)
		
		// Device management
		sessions.GET("/devices", h.GetUserDevices)
		sessions.PUT("/devices/:deviceId/trust", h.TrustDevice)
		sessions.PUT("/devices/:deviceId/untrust", h.UntrustDevice)
		
		// Security features
		sessions.POST("/detect-anomaly", h.DetectAnomalousLogin)
		sessions.GET("/statistics", h.GetSessionStatistics)
	}
	
	// Public validation endpoint (no auth required)
	router.GET("/sessions/validate", h.ValidateSession)
}
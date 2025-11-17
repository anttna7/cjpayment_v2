package middleware

import (
	"net/http"
	"strings"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	UserIDKey           = "user_id"
	UserClaimsKey       = "user_claims"
)

// AuthMiddleware creates an authentication middleware
func AuthMiddleware(authService service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get authorization header
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if it starts with Bearer
		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Extract token
		token := strings.TrimPrefix(authHeader, BearerPrefix)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token is required",
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Check if it's an access token
		if claims.Type != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token type",
			})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserClaimsKey, claims)

		c.Next()
	}
}

// SessionAuthMiddleware creates an authentication middleware with session management
func SessionAuthMiddleware(authService service.AuthService, sessionService service.SessionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try token-based authentication first
		authHeader := c.GetHeader(AuthorizationHeader)
		sessionID := c.GetHeader("X-Session-ID")
		
		var userID uuid.UUID
		var claims *service.TokenClaims
		var session *service.SessionInfo
		var err error
		
		// Check for session-based authentication
		if sessionID != "" {
			session, err = sessionService.ValidateSession(c.Request.Context(), sessionID)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid or expired session",
					"code":  "SESSION_INVALID",
				})
				c.Abort()
				return
			}
			
			userID = session.UserID
			// Refresh session activity
			sessionService.RefreshSessionActivity(c.Request.Context(), sessionID, 
				getClientIP(c), c.GetHeader("User-Agent"))
				
		} else if authHeader != "" {
			// Fall back to token-based authentication
			if !strings.HasPrefix(authHeader, BearerPrefix) {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid authorization header format",
				})
				c.Abort()
				return
			}

			token := strings.TrimPrefix(authHeader, BearerPrefix)
			if token == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Token is required",
				})
				c.Abort()
				return
			}

			claims, err = authService.ValidateToken(c.Request.Context(), token)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid or expired token",
				})
				c.Abort()
				return
			}

			if claims.Type != "access" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid token type",
				})
				c.Abort()
				return
			}
			
			userID = claims.UserID
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set(UserIDKey, userID)
		if claims != nil {
			c.Set(UserClaimsKey, claims)
		}
		if session != nil {
			c.Set("session_info", session)
		}

		c.Next()
	}
}

// RequirePermission creates a middleware that checks for specific permissions
func RequirePermission(permissionService service.PermissionService, resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by AuthMiddleware)
		userIDValue, exists := c.Get(UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}

		userID, ok := userIDValue.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid user ID format",
			})
			c.Abort()
			return
		}

		// Check permission
		hasPermission, err := permissionService.CheckPermission(c.Request.Context(), userID, resource, action)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to check permissions",
			})
			c.Abort()
			return
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole creates a middleware that checks for specific roles
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user claims from context (set by AuthMiddleware)
		claimsValue, exists := c.Get(UserClaimsKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
			})
			c.Abort()
			return
		}

		claims, ok := claimsValue.(*service.TokenClaims)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid user claims format",
			})
			c.Abort()
			return
		}

		// Check if user has any of the required roles
		userRoles := make(map[string]bool)
		for _, role := range claims.Roles {
			userRoles[role] = true
		}

		hasRole := false
		for _, requiredRole := range roles {
			if userRoles[requiredRole] {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient role permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth creates an optional authentication middleware
// It sets user information if token is provided and valid, but doesn't fail if not
func OptionalAuth(authService service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get authorization header
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			c.Next()
			return
		}

		// Check if it starts with Bearer
		if !strings.HasPrefix(authHeader, BearerPrefix) {
			c.Next()
			return
		}

		// Extract token
		token := strings.TrimPrefix(authHeader, BearerPrefix)
		if token == "" {
			c.Next()
			return
		}

		// Validate token
		claims, err := authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			c.Next()
			return
		}

		// Check if it's an access token
		if claims.Type != "access" {
			c.Next()
			return
		}

		// Set user information in context
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserClaimsKey, claims)

		c.Next()
	}
}

// GetUserID extracts user ID from gin context
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	userIDValue, exists := c.Get(UserIDKey)
	if !exists {
		return uuid.Nil, false
	}

	userID, ok := userIDValue.(uuid.UUID)
	return userID, ok
}

// GetUserClaims extracts user claims from gin context
func GetUserClaims(c *gin.Context) (*service.TokenClaims, bool) {
	claimsValue, exists := c.Get(UserClaimsKey)
	if !exists {
		return nil, false
	}

	claims, ok := claimsValue.(*service.TokenClaims)
	return claims, ok
}
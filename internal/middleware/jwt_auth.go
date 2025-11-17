package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// JWTAuthMiddleware handles JWT authentication
type JWTAuthMiddleware struct {
	secretKey []byte
	redis     *redis.Client
}

// NewJWTAuthMiddleware creates a new JWT authentication middleware
func NewJWTAuthMiddleware(secretKey string, redisClient *redis.Client) *JWTAuthMiddleware {
	return &JWTAuthMiddleware{
		secretKey: []byte(secretKey),
		redis:     redisClient,
	}
}

// RequireAuth middleware that requires valid JWT token
func (m *JWTAuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := m.extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    4001,
					"message": "Missing authentication token",
				},
			})
			c.Abort()
			return
		}

		claims, err := m.validateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    4002,
					"message": "Invalid authentication token",
					"details": err.Error(),
				},
			})
			c.Abort()
			return
		}

		// Check if token is blacklisted
		if m.isTokenBlacklisted(token) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    4003,
					"message": "Token has been revoked",
				},
			})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("user_role", claims.Role)
		c.Set("jwt_token", token)
		
		c.Next()
	}
}

// RequireRole middleware that requires specific role
func (m *JWTAuthMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    4031,
					"message": "User role not found in context",
				},
			})
			c.Abort()
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    4032,
					"message": "Invalid user role format",
				},
			})
			c.Abort()
			return
		}

		// Check if user has required role
		hasRole := false
		for _, role := range roles {
			if roleStr == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    4033,
					"message": "Insufficient permissions",
					"details": fmt.Sprintf("Required roles: %v, user role: %s", roles, roleStr),
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GenerateToken generates a new JWT token
func (m *JWTAuthMiddleware) GenerateToken(userID uint, username, role string) (string, error) {
	now := time.Now()
	claims := &JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "recharge-system",
			Subject:   fmt.Sprintf("user:%d", userID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secretKey)
}

// RefreshToken generates a new token with extended expiry
func (m *JWTAuthMiddleware) RefreshToken(oldToken string) (string, error) {
	claims, err := m.validateToken(oldToken)
	if err != nil {
		return "", err
	}

	// Blacklist old token
	m.blacklistToken(oldToken, claims.ExpiresAt.Time)

	// Generate new token
	return m.GenerateToken(claims.UserID, claims.Username, claims.Role)
}

// RevokeToken blacklists a token
func (m *JWTAuthMiddleware) RevokeToken(token string) error {
	claims, err := m.validateToken(token)
	if err != nil {
		return err
	}

	return m.blacklistToken(token, claims.ExpiresAt.Time)
}

// extractToken extracts JWT token from request
func (m *JWTAuthMiddleware) extractToken(c *gin.Context) string {
	// Try Authorization header first
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}

	// Try query parameter
	if token := c.Query("token"); token != "" {
		return token
	}

	// Try cookie
	if cookie, err := c.Cookie("jwt_token"); err == nil {
		return cookie
	}

	return ""
}

// validateToken validates JWT token and returns claims
func (m *JWTAuthMiddleware) validateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// isTokenBlacklisted checks if token is blacklisted
func (m *JWTAuthMiddleware) isTokenBlacklisted(token string) bool {
	if m.redis == nil {
		return false
	}

	key := fmt.Sprintf("blacklist:token:%s", token)
	exists, err := m.redis.Exists(context.Background(), key).Result()
	if err != nil {
		return false
	}

	return exists > 0
}

// blacklistToken adds token to blacklist
func (m *JWTAuthMiddleware) blacklistToken(token string, expiry time.Time) error {
	if m.redis == nil {
		return nil
	}

	key := fmt.Sprintf("blacklist:token:%s", token)
	ttl := time.Until(expiry)
	if ttl <= 0 {
		return nil // Token already expired
	}

	return m.redis.Set(context.Background(), key, "1", ttl).Err()
}
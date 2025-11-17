package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/company/cjpayment/pkg/security"
)

// SecurityConfig holds security middleware configuration
type SecurityConfig struct {
	EnableCSRF          bool
	EnableXSSProtection bool
	EnableSQLInjection  bool
	EnableRateLimit     bool
	EnableAuditLog      bool
	TrustedProxies      []string
	AllowedOrigins      []string
}

// DefaultSecurityConfig returns default security configuration
func DefaultSecurityConfig() SecurityConfig {
	return SecurityConfig{
		EnableCSRF:          true,
		EnableXSSProtection: true,
		EnableSQLInjection:  true,
		EnableRateLimit:     true,
		EnableAuditLog:      true,
		TrustedProxies:      []string{"127.0.0.1", "::1"},
		AllowedOrigins:      []string{"http://localhost:3000"},
	}
}

// SecurityMiddleware creates a comprehensive security middleware
func SecurityMiddleware(config SecurityConfig, validator *security.InputValidator, auditLogger security.AuditLogger, monitor *security.SecurityMonitor) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Set security headers
		setSecurityHeaders(c)
		
		// Validate trusted proxies
		if !isTrustedProxy(c.ClientIP(), config.TrustedProxies) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Access denied",
				"code":  "UNTRUSTED_PROXY",
			})
			c.Abort()
			return
		}
		
		// Check for SQL injection in query parameters and form data
		if config.EnableSQLInjection {
			if checkSQLInjectionInRequest(c, validator, monitor) {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid request data",
					"code":  "SECURITY_VIOLATION",
				})
				c.Abort()
				return
			}
		}
		
		// Check for XSS in request data
		if config.EnableXSSProtection {
			if checkXSSInRequest(c, validator, monitor) {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid request data",
					"code":  "SECURITY_VIOLATION",
				})
				c.Abort()
				return
			}
		}
		
		// Log request for audit
		if config.EnableAuditLog {
			logRequestForAudit(c, auditLogger)
		}
		
		c.Next()
		
		// Log response for audit
		if config.EnableAuditLog {
			logResponseForAudit(c, auditLogger)
		}
	})
}

// setSecurityHeaders sets various security headers
func setSecurityHeaders(c *gin.Context) {
	// Prevent MIME type sniffing
	c.Header("X-Content-Type-Options", "nosniff")
	
	// Enable XSS protection
	c.Header("X-XSS-Protection", "1; mode=block")
	
	// Prevent clickjacking
	c.Header("X-Frame-Options", "DENY")
	
	// Enforce HTTPS
	c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
	
	// Content Security Policy
	c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
	
	// Referrer Policy
	c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
	
	// Permissions Policy
	c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
}

// isTrustedProxy checks if the IP is in the trusted proxy list
func isTrustedProxy(ip string, trustedProxies []string) bool {
	for _, proxy := range trustedProxies {
		if ip == proxy {
			return true
		}
	}
	return false
}

// checkSQLInjectionInRequest checks for SQL injection patterns in request
func checkSQLInjectionInRequest(c *gin.Context, validator *security.InputValidator, monitor *security.SecurityMonitor) bool {
	// Check query parameters
	for key, values := range c.Request.URL.Query() {
		for _, value := range values {
			if validator.CheckSQLInjection(value) {
				monitor.MonitorSQLInjection(c.Request.Context(), c.ClientIP(), c.Request.UserAgent(), 
					"Query parameter: "+key+"="+value)
				return true
			}
		}
	}
	
	// Check form data
	if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
		c.Request.ParseForm()
		for key, values := range c.Request.PostForm {
			for _, value := range values {
				if validator.CheckSQLInjection(value) {
					monitor.MonitorSQLInjection(c.Request.Context(), c.ClientIP(), c.Request.UserAgent(), 
						"Form parameter: "+key+"="+value)
					return true
				}
			}
		}
	}
	
	return false
}

// checkXSSInRequest checks for XSS patterns in request
func checkXSSInRequest(c *gin.Context, validator *security.InputValidator, monitor *security.SecurityMonitor) bool {
	// Check query parameters
	for key, values := range c.Request.URL.Query() {
		for _, value := range values {
			if validator.CheckXSS(value) {
				monitor.MonitorXSSAttempt(c.Request.Context(), c.ClientIP(), c.Request.UserAgent(), 
					"Query parameter: "+key+"="+value)
				return true
			}
		}
	}
	
	// Check form data
	if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
		c.Request.ParseForm()
		for key, values := range c.Request.PostForm {
			for _, value := range values {
				if validator.CheckXSS(value) {
					monitor.MonitorXSSAttempt(c.Request.Context(), c.ClientIP(), c.Request.UserAgent(), 
						"Form parameter: "+key+"="+value)
					return true
				}
			}
		}
	}
	
	return false
}

// logRequestForAudit logs request details for audit
func logRequestForAudit(c *gin.Context, auditLogger security.AuditLogger) {
	// Extract user information if available
	var userID, username *string
	if uid, exists := c.Get("user_id"); exists {
		if uidStr, ok := uid.(string); ok {
			userID = &uidStr
		}
	}
	if uname, exists := c.Get("username"); exists {
		if unameStr, ok := uname.(string); ok {
			username = &unameStr
		}
	}
	
	// Create request data map (excluding sensitive information)
	requestData := make(map[string]interface{})
	
	// Add query parameters
	if len(c.Request.URL.Query()) > 0 {
		requestData["query_params"] = c.Request.URL.Query()
	}
	
	// Add headers (excluding sensitive ones)
	headers := make(map[string]string)
	for key, values := range c.Request.Header {
		if !isSensitiveHeader(key) && len(values) > 0 {
			headers[key] = values[0]
		}
	}
	if len(headers) > 0 {
		requestData["headers"] = headers
	}
	
	// Store in context for response logging
	c.Set("audit_request_data", requestData)
	c.Set("audit_user_id", userID)
	c.Set("audit_username", username)
}

// logResponseForAudit logs response details for audit
func logResponseForAudit(c *gin.Context, auditLogger security.AuditLogger) {
	// Get stored request data
	requestData, _ := c.Get("audit_request_data")
	userID, _ := c.Get("audit_user_id")
	username, _ := c.Get("audit_username")
	
	var userIDStr, usernameStr *string
	if userID != nil {
		if uid, ok := userID.(*string); ok {
			userIDStr = uid
		}
	}
	if username != nil {
		if uname, ok := username.(*string); ok {
			usernameStr = uname
		}
	}
	
	// Determine if the request was successful
	success := c.Writer.Status() >= 200 && c.Writer.Status() < 400
	
	// Create audit event
	event := &security.AuditEvent{
		UserID:      userIDStr,
		Username:    usernameStr,
		IPAddress:   c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
		Action:      strings.ToLower(c.Request.Method),
		Resource:    c.Request.URL.Path,
		Method:      c.Request.Method,
		Path:        c.Request.URL.Path,
		StatusCode:  c.Writer.Status(),
		Success:     success,
		Risk:        determineRiskLevel(c.Request.Method, c.Request.URL.Path, c.Writer.Status()),
		Metadata: map[string]interface{}{
			"event_type":    "http_request",
			"response_size": c.Writer.Size(),
		},
	}
	
	if requestData != nil {
		if reqData, ok := requestData.(map[string]interface{}); ok {
			event.RequestData = reqData
		}
	}
	
	// Add error message if request failed
	if !success {
		errorMsg := http.StatusText(c.Writer.Status())
		event.ErrorMsg = &errorMsg
	}
	
	// Log the event
	auditLogger.LogEvent(c.Request.Context(), event)
}

// isSensitiveHeader checks if a header contains sensitive information
func isSensitiveHeader(header string) bool {
	sensitiveHeaders := []string{
		"authorization", "cookie", "x-api-key", "x-auth-token",
		"x-csrf-token", "x-session-id",
	}
	
	header = strings.ToLower(header)
	for _, sensitive := range sensitiveHeaders {
		if header == sensitive {
			return true
		}
	}
	
	return false
}

// determineRiskLevel determines the risk level based on request characteristics
func determineRiskLevel(method, path string, statusCode int) security.RiskLevel {
	// High risk for authentication endpoints
	if strings.Contains(path, "/auth/") || strings.Contains(path, "/login") {
		if statusCode >= 400 {
			return security.RiskHigh
		}
		return security.RiskMedium
	}
	
	// Medium risk for write operations
	if method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH" {
		if statusCode >= 400 {
			return security.RiskMedium
		}
		return security.RiskLow
	}
	
	// High risk for admin endpoints
	if strings.Contains(path, "/admin/") {
		return security.RiskHigh
	}
	
	// Medium risk for user management
	if strings.Contains(path, "/users/") || strings.Contains(path, "/merchants/") {
		return security.RiskMedium
	}
	
	// Low risk for read operations
	return security.RiskLow
}

// CSRFMiddleware provides CSRF protection
func CSRFMiddleware(secretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip CSRF check for GET, HEAD, OPTIONS
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}
		
		// Get CSRF token from header or form
		token := c.GetHeader("X-CSRF-Token")
		if token == "" {
			token = c.PostForm("_csrf_token")
		}
		
		// Validate CSRF token
		if !validateCSRFToken(token, secretKey) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Invalid CSRF token",
				"code":  "CSRF_TOKEN_INVALID",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// validateCSRFToken validates a CSRF token
func validateCSRFToken(token, secretKey string) bool {
	// In a real implementation, this would validate the token properly
	// For now, just check if token is not empty
	return token != ""
}

// IPWhitelistMiddleware restricts access to whitelisted IPs
func IPWhitelistMiddleware(whitelist []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		
		// Check if IP is in whitelist
		allowed := false
		for _, ip := range whitelist {
			if clientIP == ip {
				allowed = true
				break
			}
		}
		
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Access denied",
				"code":  "IP_NOT_WHITELISTED",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// RequestSizeLimitMiddleware limits request body size
func RequestSizeLimitMiddleware(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large",
				"code":  "REQUEST_TOO_LARGE",
			})
			c.Abort()
			return
		}
		
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	}
}
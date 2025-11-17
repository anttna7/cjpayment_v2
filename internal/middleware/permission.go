package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/service"
	"github.com/company/cjpayment/pkg/security"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PermissionLevel defines the granularity of permission checking
type PermissionLevel string

const (
	PermissionLevelAPI      PermissionLevel = "api"      // API endpoint level
	PermissionLevelResource PermissionLevel = "resource" // Resource level
	PermissionLevelData     PermissionLevel = "data"     // Data level (row-level)
	PermissionLevelField    PermissionLevel = "field"    // Field level
)

// PermissionContext contains context information for permission checking
type PermissionContext struct {
	UserID      uuid.UUID              `json:"user_id"`
	Username    string                 `json:"username"`
	IPAddress   string                 `json:"ip_address"`
	UserAgent   string                 `json:"user_agent"`
	Method      string                 `json:"method"`
	Path        string                 `json:"path"`
	Resource    string                 `json:"resource"`
	Action      string                 `json:"action"`
	ResourceID  *string                `json:"resource_id,omitempty"`
	RequestData map[string]interface{} `json:"request_data,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// DataAccessRule defines data-level access control rules
type DataAccessRule struct {
	Resource   string                 `json:"resource"`
	Conditions map[string]interface{} `json:"conditions"`
	Fields     []string               `json:"fields,omitempty"`     // Allowed fields
	Filters    map[string]interface{} `json:"filters,omitempty"`    // Additional filters to apply
}

// PermissionMiddlewareConfig configures the permission middleware
type PermissionMiddlewareConfig struct {
	PermissionService service.PermissionService
	AuditLogger       security.AuditLogger
	SecurityMonitor   *security.SecurityMonitor
	Level             PermissionLevel
	Resource          string
	Action            string
	DataAccessRules   []DataAccessRule
	SkipAudit         bool
	CustomValidator   func(ctx *gin.Context, permCtx *PermissionContext) error
}

// EnhancedPermissionMiddleware creates an enhanced permission middleware with fine-grained control
func EnhancedPermissionMiddleware(config PermissionMiddlewareConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		
		// Extract user information from context
		userID, exists := GetUserID(c)
		if !exists {
			auditUnauthorizedAccess(c, config.AuditLogger, config.Resource, "user not authenticated")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not authenticated",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		userClaims, _ := GetUserClaims(c)
		username := ""
		if userClaims != nil {
			username = userClaims.Username
		}

		// Build permission context
		permCtx := &PermissionContext{
			UserID:    userID,
			Username:  username,
			IPAddress: getClientIP(c),
			UserAgent: c.GetHeader("User-Agent"),
			Method:    c.Request.Method,
			Path:      c.Request.URL.Path,
			Resource:  config.Resource,
			Action:    config.Action,
			Metadata: map[string]interface{}{
				"permission_level": config.Level,
				"timestamp":        startTime,
			},
		}

		// Extract resource ID from URL parameters if available
		if resourceID := c.Param("id"); resourceID != "" {
			permCtx.ResourceID = &resourceID
		}

		// Extract request data for audit purposes
		if c.Request.Method != "GET" {
			permCtx.RequestData = extractRequestData(c)
		}

		// Perform permission check based on level
		var hasPermission bool
		var err error

		switch config.Level {
		case PermissionLevelAPI:
			hasPermission, err = checkAPIPermission(c.Request.Context(), config.PermissionService, permCtx)
		case PermissionLevelResource:
			hasPermission, err = checkResourcePermission(c.Request.Context(), config.PermissionService, permCtx)
		case PermissionLevelData:
			hasPermission, err = checkDataPermission(c.Request.Context(), config.PermissionService, permCtx, config.DataAccessRules)
		case PermissionLevelField:
			hasPermission, err = checkFieldPermission(c.Request.Context(), config.PermissionService, permCtx, config.DataAccessRules)
		default:
			hasPermission, err = checkAPIPermission(c.Request.Context(), config.PermissionService, permCtx)
		}

		if err != nil {
			auditPermissionError(c, config.AuditLogger, permCtx, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Permission check failed",
				"code":  "PERMISSION_CHECK_ERROR",
			})
			c.Abort()
			return
		}

		if !hasPermission {
			auditPermissionDenied(c, config.AuditLogger, config.SecurityMonitor, permCtx)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"code":  "PERMISSION_DENIED",
			})
			c.Abort()
			return
		}

		// Run custom validator if provided
		if config.CustomValidator != nil {
			if err := config.CustomValidator(c, permCtx); err != nil {
				auditCustomValidationFailed(c, config.AuditLogger, permCtx, err)
				c.JSON(http.StatusForbidden, gin.H{
					"error": err.Error(),
					"code":  "CUSTOM_VALIDATION_FAILED",
				})
				c.Abort()
				return
			}
		}

		// Store permission context for downstream use
		c.Set("permission_context", permCtx)

		// Audit successful permission check
		if !config.SkipAudit {
			auditPermissionGranted(c, config.AuditLogger, permCtx, time.Since(startTime))
		}

		c.Next()
	}
}

// RequireAPIPermission creates middleware for API-level permission checking
func RequireAPIPermission(permissionService service.PermissionService, auditLogger security.AuditLogger, resource, action string) gin.HandlerFunc {
	return EnhancedPermissionMiddleware(PermissionMiddlewareConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             PermissionLevelAPI,
		Resource:          resource,
		Action:            action,
	})
}

// RequireResourcePermission creates middleware for resource-level permission checking
func RequireResourcePermission(permissionService service.PermissionService, auditLogger security.AuditLogger, resource, action string) gin.HandlerFunc {
	return EnhancedPermissionMiddleware(PermissionMiddlewareConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             PermissionLevelResource,
		Resource:          resource,
		Action:            action,
	})
}

// RequireDataPermission creates middleware for data-level permission checking
func RequireDataPermission(permissionService service.PermissionService, auditLogger security.AuditLogger, resource, action string, rules []DataAccessRule) gin.HandlerFunc {
	return EnhancedPermissionMiddleware(PermissionMiddlewareConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             PermissionLevelData,
		Resource:          resource,
		Action:            action,
		DataAccessRules:   rules,
	})
}

// checkAPIPermission performs API-level permission checking
func checkAPIPermission(ctx context.Context, permissionService service.PermissionService, permCtx *PermissionContext) (bool, error) {
	return permissionService.CheckPermission(ctx, permCtx.UserID, permCtx.Resource, permCtx.Action)
}

// checkResourcePermission performs resource-level permission checking
func checkResourcePermission(ctx context.Context, permissionService service.PermissionService, permCtx *PermissionContext) (bool, error) {
	// First check basic API permission
	hasAPIPermission, err := permissionService.CheckPermission(ctx, permCtx.UserID, permCtx.Resource, permCtx.Action)
	if err != nil || !hasAPIPermission {
		return hasAPIPermission, err
	}

	// Additional resource-specific checks can be added here
	// For example, checking if user owns the resource or has specific role for the resource
	
	return true, nil
}

// checkDataPermission performs data-level permission checking
func checkDataPermission(ctx context.Context, permissionService service.PermissionService, permCtx *PermissionContext, rules []DataAccessRule) (bool, error) {
	// First check resource permission
	hasResourcePermission, err := checkResourcePermission(ctx, permissionService, permCtx)
	if err != nil || !hasResourcePermission {
		return hasResourcePermission, err
	}

	// Apply data access rules
	for _, rule := range rules {
		if rule.Resource == permCtx.Resource {
			// Check conditions
			if !evaluateDataAccessConditions(permCtx, rule.Conditions) {
				return false, nil
			}
		}
	}

	return true, nil
}

// checkFieldPermission performs field-level permission checking
func checkFieldPermission(ctx context.Context, permissionService service.PermissionService, permCtx *PermissionContext, rules []DataAccessRule) (bool, error) {
	// First check data permission
	hasDataPermission, err := checkDataPermission(ctx, permissionService, permCtx, rules)
	if err != nil || !hasDataPermission {
		return hasDataPermission, err
	}

	// Field-level permissions would be applied during response filtering
	// This is typically handled in the response middleware or service layer
	
	return true, nil
}

// evaluateDataAccessConditions evaluates data access conditions
func evaluateDataAccessConditions(permCtx *PermissionContext, conditions map[string]interface{}) bool {
	for key, expectedValue := range conditions {
		switch key {
		case "user_id":
			if permCtx.ResourceID != nil && *permCtx.ResourceID != permCtx.UserID.String() {
				return false
			}
		case "ip_range":
			// Implement IP range checking
			if !isIPInRange(permCtx.IPAddress, expectedValue.(string)) {
				return false
			}
		case "time_range":
			// Implement time-based access control
			if !isTimeInRange(time.Now(), expectedValue.(map[string]interface{})) {
				return false
			}
		// Add more condition types as needed
		}
	}
	return true
}

// isIPInRange checks if IP is in the specified range (simplified implementation)
func isIPInRange(ip, ipRange string) bool {
	// This is a simplified implementation
	// In production, use proper CIDR checking
	return strings.HasPrefix(ip, strings.Split(ipRange, "/")[0][:len(strings.Split(ipRange, "/")[0])-1])
}

// isTimeInRange checks if current time is within allowed range
func isTimeInRange(current time.Time, timeRange map[string]interface{}) bool {
	startHour, ok1 := timeRange["start_hour"].(float64)
	endHour, ok2 := timeRange["end_hour"].(float64)
	
	if !ok1 || !ok2 {
		return true // If no time restriction, allow access
	}
	
	currentHour := float64(current.Hour()) + float64(current.Minute())/60.0
	return currentHour >= startHour && currentHour <= endHour
}

// extractRequestData extracts request data for audit purposes
func extractRequestData(c *gin.Context) map[string]interface{} {
	data := make(map[string]interface{})
	
	// Extract form data
	if c.Request.Header.Get("Content-Type") == "application/x-www-form-urlencoded" {
		c.Request.ParseForm()
		for key, values := range c.Request.PostForm {
			if len(values) == 1 {
				data[key] = values[0]
			} else {
				data[key] = values
			}
		}
	}
	
	// Extract JSON data (limited for security)
	if strings.Contains(c.Request.Header.Get("Content-Type"), "application/json") {
		var jsonData map[string]interface{}
		if err := c.ShouldBindJSON(&jsonData); err == nil {
			// Mask sensitive fields
			data = security.MaskSensitiveData(jsonData)
		}
	}
	
	return data
}

// getClientIP extracts the real client IP address
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	
	// Check X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}
	
	// Fall back to RemoteAddr
	return c.ClientIP()
}

// Audit functions
func auditUnauthorizedAccess(c *gin.Context, auditLogger security.AuditLogger, resource, reason string) {
	if auditLogger != nil {
		auditLogger.LogSecurityEvent(c.Request.Context(), getClientIP(c), c.GetHeader("User-Agent"), 
			"unauthorized_access", fmt.Sprintf("Resource: %s, Reason: %s", resource, reason), security.RiskHigh)
	}
}

func auditPermissionError(c *gin.Context, auditLogger security.AuditLogger, permCtx *PermissionContext, err error) {
	if auditLogger != nil {
		errorMsg := err.Error()
		userIDStr := permCtx.UserID.String()
		auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
			UserID:     &userIDStr,
			Username:   &permCtx.Username,
			IPAddress:  permCtx.IPAddress,
			UserAgent:  permCtx.UserAgent,
			Action:     "permission_check_error",
			Resource:   permCtx.Resource,
			Method:     permCtx.Method,
			Path:       permCtx.Path,
			Success:    false,
			ErrorMsg:   &errorMsg,
			Risk:       security.RiskMedium,
			Metadata:   permCtx.Metadata,
		})
	}
}

func auditPermissionDenied(c *gin.Context, auditLogger security.AuditLogger, securityMonitor *security.SecurityMonitor, permCtx *PermissionContext) {
	if auditLogger != nil {
		userIDStr := permCtx.UserID.String()
		auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
			UserID:     &userIDStr,
			Username:   &permCtx.Username,
			IPAddress:  permCtx.IPAddress,
			UserAgent:  permCtx.UserAgent,
			Action:     "permission_denied",
			Resource:   permCtx.Resource,
			ResourceID: permCtx.ResourceID,
			Method:     permCtx.Method,
			Path:       permCtx.Path,
			Success:    false,
			Risk:       security.RiskHigh,
			Metadata:   permCtx.Metadata,
		})
	}
	
	if securityMonitor != nil {
		securityMonitor.MonitorUnauthorizedAccess(c.Request.Context(), permCtx.IPAddress, permCtx.UserAgent, 
			fmt.Sprintf("%s:%s", permCtx.Resource, permCtx.Action))
	}
}

func auditCustomValidationFailed(c *gin.Context, auditLogger security.AuditLogger, permCtx *PermissionContext, err error) {
	if auditLogger != nil {
		errorMsg := err.Error()
		userIDStr := permCtx.UserID.String()
		auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
			UserID:     &userIDStr,
			Username:   &permCtx.Username,
			IPAddress:  permCtx.IPAddress,
			UserAgent:  permCtx.UserAgent,
			Action:     "custom_validation_failed",
			Resource:   permCtx.Resource,
			ResourceID: permCtx.ResourceID,
			Method:     permCtx.Method,
			Path:       permCtx.Path,
			Success:    false,
			ErrorMsg:   &errorMsg,
			Risk:       security.RiskMedium,
			Metadata:   permCtx.Metadata,
		})
	}
}

func auditPermissionGranted(c *gin.Context, auditLogger security.AuditLogger, permCtx *PermissionContext, duration time.Duration) {
	if auditLogger != nil {
		permCtx.Metadata["check_duration_ms"] = duration.Milliseconds()
		userIDStr := permCtx.UserID.String()
		auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
			UserID:      &userIDStr,
			Username:    &permCtx.Username,
			IPAddress:   permCtx.IPAddress,
			UserAgent:   permCtx.UserAgent,
			Action:      "permission_granted",
			Resource:    permCtx.Resource,
			ResourceID:  permCtx.ResourceID,
			Method:      permCtx.Method,
			Path:        permCtx.Path,
			Success:     true,
			Risk:        security.RiskLow,
			RequestData: permCtx.RequestData,
			Metadata:    permCtx.Metadata,
		})
	}
}

// GetPermissionContext extracts permission context from gin context
func GetPermissionContext(c *gin.Context) (*PermissionContext, bool) {
	value, exists := c.Get("permission_context")
	if !exists {
		return nil, false
	}
	
	permCtx, ok := value.(*PermissionContext)
	return permCtx, ok
}

// PermissionMonitoringMiddleware creates middleware for monitoring permission usage
func PermissionMonitoringMiddleware(auditLogger security.AuditLogger) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		
		c.Next()
		
		// Log permission monitoring data
		if permCtx, exists := GetPermissionContext(c); exists {
			duration := time.Since(startTime)
			statusCode := c.Writer.Status()
			
			if auditLogger != nil {
				userIDStr := permCtx.UserID.String()
				auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
					UserID:     &userIDStr,
					Username:   &permCtx.Username,
					IPAddress:  permCtx.IPAddress,
					UserAgent:  permCtx.UserAgent,
					Action:     "api_access",
					Resource:   permCtx.Resource,
					ResourceID: permCtx.ResourceID,
					Method:     permCtx.Method,
					Path:       permCtx.Path,
					StatusCode: statusCode,
					Success:    statusCode < 400,
					Risk:       security.RiskLow,
					Metadata: map[string]interface{}{
						"response_time_ms": duration.Milliseconds(),
						"status_code":      statusCode,
					},
				})
			}
		}
	}
}
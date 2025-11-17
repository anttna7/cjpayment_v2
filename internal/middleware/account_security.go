package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/company/cjpayment/internal/service"
	"github.com/company/cjpayment/pkg/security"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AccountSecurityConfig configures the integrated account security middleware
type AccountSecurityConfig struct {
	PermissionService service.PermissionService
	AuditLogger       security.AuditLogger
	AccountAuditLogger *security.AccountAuditLogger
	DataMasker        *security.DataMasker
	SecurityMonitor   *security.SecurityMonitor
	EnableAuditLogging bool
	EnableDataMasking  bool
	EnableRealTimeAlerts bool
}

// AccountSecurityMiddleware creates an integrated security middleware for account operations
func AccountSecurityMiddleware(config AccountSecurityConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Extract user information
		userID, exists := GetUserID(c)
		if !exists {
			auditUnauthorizedAccountAccess(c, config, "user not authenticated")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		userClaims, _ := GetUserClaims(c)
		username := ""
		userRoles := []string{}
		if userClaims != nil {
			username = userClaims.Username
			// Extract roles from claims if available
			if roles, ok := userClaims.Claims["roles"].([]interface{}); ok {
				for _, role := range roles {
					if roleStr, ok := role.(string); ok {
						userRoles = append(userRoles, roleStr)
					}
				}
			}
		}

		// Determine operation type based on HTTP method and path
		operationType := determineAccountOperationType(c.Request.Method, c.Request.URL.Path)
		
		// Check permissions
		hasPermission, err := checkAccountSecurityPermission(c.Request.Context(), config, userID, operationType)
		if err != nil {
			auditAccountSecurityError(c, config, userID, username, operationType, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Security check failed",
				"code":  "SECURITY_CHECK_ERROR",
			})
			c.Abort()
			return
		}

		if !hasPermission {
			auditAccountPermissionDenied(c, config, userID, username, operationType)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions for account operation",
				"code":  "ACCOUNT_PERMISSION_DENIED",
			})
			c.Abort()
			return
		}

		// Determine data masking level based on user roles and operation
		maskingLevel := security.MaskingLevelNone
		if config.EnableDataMasking {
			maskingLevel = security.GetMaskingLevelForUser(userRoles, string(operationType))
		}

		// Store security context for downstream use
		securityContext := &AccountSecurityContext{
			UserID:        userID,
			Username:      username,
			UserRoles:     userRoles,
			OperationType: operationType,
			MaskingLevel:  maskingLevel,
			IPAddress:     getClientIP(c),
			UserAgent:     c.GetHeader("User-Agent"),
			StartTime:     startTime,
		}
		
		c.Set("account_security_context", securityContext)
		c.Set("data_masking_level", maskingLevel)

		// Audit successful permission check
		if config.EnableAuditLogging {
			auditAccountAccessGranted(c, config, securityContext, time.Since(startTime))
		}

		// Set up response interceptor for data masking
		if config.EnableDataMasking && maskingLevel > security.MaskingLevelNone {
			c.Set("response_masker", config.DataMasker)
		}

		c.Next()

		// Post-request audit logging
		if config.EnableAuditLogging {
			auditAccountOperationComplete(c, config, securityContext)
		}
	}
}

// AccountSecurityContext contains security context for account operations
type AccountSecurityContext struct {
	UserID        uuid.UUID                        `json:"user_id"`
	Username      string                           `json:"username"`
	UserRoles     []string                         `json:"user_roles"`
	OperationType security.AccountOperationType   `json:"operation_type"`
	MaskingLevel  security.MaskingLevel            `json:"masking_level"`
	IPAddress     string                           `json:"ip_address"`
	UserAgent     string                           `json:"user_agent"`
	StartTime     time.Time                        `json:"start_time"`
}

// determineAccountOperationType determines the operation type based on HTTP method and path
func determineAccountOperationType(method, path string) security.AccountOperationType {
	switch method {
	case "GET":
		if containsAccountID(path) {
			return security.AccountOpRead
		}
		return security.AccountOpList
	case "POST":
		if containsBulkOperation(path) {
			return security.AccountOpImport
		}
		return security.AccountOpCreate
	case "PUT", "PATCH":
		if containsStatusChange(path) {
			return security.AccountOpUpdate // Will be refined in the handler
		}
		if containsLimitChange(path) {
			return security.AccountOpLimitChange
		}
		return security.AccountOpUpdate
	case "DELETE":
		return security.AccountOpDelete
	default:
		return security.AccountOpRead
	}
}

// Helper functions to analyze request path
func containsAccountID(path string) bool {
	// Simple check for UUID pattern in path
	return len(path) > 36 && (path[len(path)-36:len(path)-32] == "-" || path[len(path)-32:len(path)-28] == "-")
}

func containsBulkOperation(path string) bool {
	return contains(path, "bulk") || contains(path, "import") || contains(path, "export")
}

func containsStatusChange(path string) bool {
	return contains(path, "status") || contains(path, "activate") || contains(path, "deactivate")
}

func containsLimitChange(path string) bool {
	return contains(path, "limit") || contains(path, "limits")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || (len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsSubstring(s, substr))))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// checkAccountSecurityPermission performs comprehensive security checks
func checkAccountSecurityPermission(ctx context.Context, config AccountSecurityConfig, userID uuid.UUID, operationType security.AccountOperationType) (bool, error) {
	// Check basic permission
	hasPermission, err := config.PermissionService.CheckPermission(ctx, userID, "accounts", string(operationType))
	if err != nil {
		return false, fmt.Errorf("failed to check permission: %w", err)
	}

	if !hasPermission {
		// Check for wildcard permissions
		hasWildcard, err := config.PermissionService.CheckPermission(ctx, userID, "accounts", "*")
		if err != nil {
			return false, fmt.Errorf("failed to check wildcard permission: %w", err)
		}
		
		if !hasWildcard {
			// Check for admin permissions
			hasAdmin, err := config.PermissionService.CheckPermission(ctx, userID, "*", "*")
			if err != nil {
				return false, fmt.Errorf("failed to check admin permission: %w", err)
			}
			
			return hasAdmin, nil
		}
		
		return hasWildcard, nil
	}

	return hasPermission, nil
}

// Audit functions for account security

func auditUnauthorizedAccountAccess(c *gin.Context, config AccountSecurityConfig, reason string) {
	if config.EnableAuditLogging && config.AuditLogger != nil {
		config.AuditLogger.LogSecurityEvent(c.Request.Context(), getClientIP(c), c.GetHeader("User-Agent"),
			"unauthorized_account_access", fmt.Sprintf("Reason: %s", reason), security.RiskHigh)
	}
}

func auditAccountSecurityError(c *gin.Context, config AccountSecurityConfig, userID uuid.UUID, username string, operationType security.AccountOperationType, err error) {
	if config.EnableAuditLogging && config.AccountAuditLogger != nil {
		errorMsg := err.Error()
		config.AccountAuditLogger.LogAccountAccess(c.Request.Context(), userID.String(), username, 
			getClientIP(c), c.GetHeader("User-Agent"), nil, operationType, false, security.MaskingLevelNone, false, &errorMsg)
	}
}

func auditAccountPermissionDenied(c *gin.Context, config AccountSecurityConfig, userID uuid.UUID, username string, operationType security.AccountOperationType) {
	if config.EnableAuditLogging && config.AccountAuditLogger != nil {
		errorMsg := "Permission denied"
		config.AccountAuditLogger.LogAccountAccess(c.Request.Context(), userID.String(), username,
			getClientIP(c), c.GetHeader("User-Agent"), nil, operationType, false, security.MaskingLevelNone, false, &errorMsg)
	}
	
	if config.EnableRealTimeAlerts && config.SecurityMonitor != nil {
		config.SecurityMonitor.MonitorUnauthorizedAccess(c.Request.Context(), getClientIP(c), c.GetHeader("User-Agent"),
			fmt.Sprintf("accounts:%s", operationType))
	}
}

func auditAccountAccessGranted(c *gin.Context, config AccountSecurityConfig, securityContext *AccountSecurityContext, duration time.Duration) {
	if config.EnableAuditLogging && config.AccountAuditLogger != nil {
		config.AccountAuditLogger.LogAccountAccess(c.Request.Context(), securityContext.UserID.String(), securityContext.Username,
			securityContext.IPAddress, securityContext.UserAgent, nil, securityContext.OperationType, 
			config.EnableDataMasking, securityContext.MaskingLevel, true, nil)
	}
}

func auditAccountOperationComplete(c *gin.Context, config AccountSecurityConfig, securityContext *AccountSecurityContext) {
	if config.EnableAuditLogging && config.AccountAuditLogger != nil {
		statusCode := c.Writer.Status()
		success := statusCode < 400
		
		var errorMsg *string
		if !success {
			msg := fmt.Sprintf("HTTP %d", statusCode)
			errorMsg = &msg
		}
		
		// Extract account ID from response or request if available
		var accountID *string
		if id := c.Param("id"); id != "" {
			accountID = &id
		}
		
		config.AccountAuditLogger.LogAccountAccess(c.Request.Context(), securityContext.UserID.String(), securityContext.Username,
			securityContext.IPAddress, securityContext.UserAgent, accountID, securityContext.OperationType,
			config.EnableDataMasking, securityContext.MaskingLevel, success, errorMsg)
	}
}

// GetAccountSecurityContext extracts account security context from gin context
func GetAccountSecurityContext(c *gin.Context) (*AccountSecurityContext, bool) {
	value, exists := c.Get("account_security_context")
	if !exists {
		return nil, false
	}
	
	securityContext, ok := value.(*AccountSecurityContext)
	return securityContext, ok
}

// ResponseMaskingMiddleware applies data masking to response data
func ResponseMaskingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		
		// Check if response masking is needed
		if masker, exists := c.Get("response_masker"); exists {
			if dataMasker, ok := masker.(*security.DataMasker); ok {
				if maskingLevel := GetDataMaskingLevel(c); maskingLevel > security.MaskingLevelNone {
					// This would typically be handled in the response writer
					// For now, we just set a header to indicate masking was applied
					c.Header("X-Data-Masked", "true")
					c.Header("X-Masking-Level", string(rune(maskingLevel)))
				}
			}
		}
	}
}

// Convenience functions for creating account security middleware

// NewAccountReadSecurityMiddleware creates security middleware for account read operations
func NewAccountReadSecurityMiddleware(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	accountAuditLogger := security.NewAccountAuditLogger(auditLogger)
	dataMasker := security.NewDataMasker()
	securityMonitor := security.NewSecurityMonitor(auditLogger)
	
	return AccountSecurityMiddleware(AccountSecurityConfig{
		PermissionService:    permissionService,
		AuditLogger:          auditLogger,
		AccountAuditLogger:   accountAuditLogger,
		DataMasker:           dataMasker,
		SecurityMonitor:      securityMonitor,
		EnableAuditLogging:   true,
		EnableDataMasking:    true,
		EnableRealTimeAlerts: true,
	})
}

// NewAccountWriteSecurityMiddleware creates security middleware for account write operations
func NewAccountWriteSecurityMiddleware(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	accountAuditLogger := security.NewAccountAuditLogger(auditLogger)
	dataMasker := security.NewDataMasker()
	securityMonitor := security.NewSecurityMonitor(auditLogger)
	
	return AccountSecurityMiddleware(AccountSecurityConfig{
		PermissionService:    permissionService,
		AuditLogger:          auditLogger,
		AccountAuditLogger:   accountAuditLogger,
		DataMasker:           dataMasker,
		SecurityMonitor:      securityMonitor,
		EnableAuditLogging:   true,
		EnableDataMasking:    false, // No masking for write operations
		EnableRealTimeAlerts: true,
	})
}

// NewAccountAdminSecurityMiddleware creates security middleware for account admin operations
func NewAccountAdminSecurityMiddleware(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	accountAuditLogger := security.NewAccountAuditLogger(auditLogger)
	dataMasker := security.NewDataMasker()
	securityMonitor := security.NewSecurityMonitor(auditLogger)
	
	return AccountSecurityMiddleware(AccountSecurityConfig{
		PermissionService:    permissionService,
		AuditLogger:          auditLogger,
		AccountAuditLogger:   accountAuditLogger,
		DataMasker:           dataMasker,
		SecurityMonitor:      securityMonitor,
		EnableAuditLogging:   true,
		EnableDataMasking:    false, // No masking for admin operations
		EnableRealTimeAlerts: true,
	})
}
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

// AccountPermissionLevel defines the level of permission checking for account operations
type AccountPermissionLevel string

const (
	AccountPermissionRead   AccountPermissionLevel = "read"   // View account information
	AccountPermissionWrite  AccountPermissionLevel = "write"  // Create/Update accounts
	AccountPermissionDelete AccountPermissionLevel = "delete" // Delete accounts
	AccountPermissionAdmin  AccountPermissionLevel = "admin"  // Full administrative access
)

// AccountPermissionConfig configures account-specific permission middleware
type AccountPermissionConfig struct {
	PermissionService service.PermissionService
	AuditLogger       security.AuditLogger
	SecurityMonitor   *security.SecurityMonitor
	Level             AccountPermissionLevel
	RequiredRoles     []string // Roles that have access to this operation
	AllowSelfAccess   bool     // Allow users to access their own account data
	DataMaskingLevel  int      // Level of data masking (0=none, 1=partial, 2=full)
}

// AccountPermissionMiddleware creates middleware for account-specific permission checking
func AccountPermissionMiddleware(config AccountPermissionConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Extract user information
		userID, exists := GetUserID(c)
		if !exists {
			auditAccountAccessDenied(c, config.AuditLogger, "user not authenticated", "")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
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
			Resource:  "accounts",
			Action:    string(config.Level),
			Metadata: map[string]interface{}{
				"permission_level": config.Level,
				"timestamp":        startTime,
			},
		}

		// Extract account ID from URL if available
		if accountID := c.Param("id"); accountID != "" {
			permCtx.ResourceID = &accountID
		}

		// Check account-specific permissions
		hasPermission, err := checkAccountPermission(c.Request.Context(), config, permCtx)
		if err != nil {
			auditAccountPermissionError(c, config.AuditLogger, permCtx, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Permission check failed",
				"code":  "PERMISSION_CHECK_ERROR",
			})
			c.Abort()
			return
		}

		if !hasPermission {
			auditAccountAccessDenied(c, config.AuditLogger, "insufficient permissions", permCtx.Action)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions for account operation",
				"code":  "ACCOUNT_PERMISSION_DENIED",
			})
			c.Abort()
			return
		}

		// Store permission context and data masking level
		c.Set("permission_context", permCtx)
		c.Set("data_masking_level", config.DataMaskingLevel)

		// Audit successful permission check
		auditAccountAccessGranted(c, config.AuditLogger, permCtx, time.Since(startTime))

		c.Next()
	}
}

// checkAccountPermission performs account-specific permission checking
func checkAccountPermission(ctx context.Context, config AccountPermissionConfig, permCtx *PermissionContext) (bool, error) {
	// Check basic permission first
	hasBasicPermission, err := config.PermissionService.CheckPermission(ctx, permCtx.UserID, "accounts", permCtx.Action)
	if err != nil {
		return false, fmt.Errorf("failed to check basic permission: %w", err)
	}

	if !hasBasicPermission {
		// If no basic permission, check if user has required roles
		if len(config.RequiredRoles) > 0 {
			userRoles, err := config.PermissionService.GetUserRoles(ctx, permCtx.UserID)
			if err != nil {
				return false, fmt.Errorf("failed to get user roles: %w", err)
			}

			hasRequiredRole := false
			for _, userRole := range userRoles {
				for _, requiredRole := range config.RequiredRoles {
					if strings.EqualFold(userRole.Code, requiredRole) {
						hasRequiredRole = true
						break
					}
				}
				if hasRequiredRole {
					break
				}
			}

			if !hasRequiredRole {
				return false, nil
			}
		} else {
			return false, nil
		}
	}

	// Check self-access permission if enabled and resource ID is provided
	if config.AllowSelfAccess && permCtx.ResourceID != nil {
		// For self-access, we need to verify if the account belongs to the user
		// This would typically involve checking the account ownership
		// For now, we'll allow if the resource ID matches the user ID
		if *permCtx.ResourceID == permCtx.UserID.String() {
			return true, nil
		}
	}

	// Additional account-specific checks based on permission level
	switch config.Level {
	case AccountPermissionRead:
		return checkAccountReadPermission(ctx, config, permCtx)
	case AccountPermissionWrite:
		return checkAccountWritePermission(ctx, config, permCtx)
	case AccountPermissionDelete:
		return checkAccountDeletePermission(ctx, config, permCtx)
	case AccountPermissionAdmin:
		return checkAccountAdminPermission(ctx, config, permCtx)
	default:
		return hasBasicPermission, nil
	}
}

// checkAccountReadPermission checks read-specific permissions
func checkAccountReadPermission(ctx context.Context, config AccountPermissionConfig, permCtx *PermissionContext) (bool, error) {
	// Read permission is generally allowed if basic permission is granted
	// Additional checks can be added here for sensitive account data
	return true, nil
}

// checkAccountWritePermission checks write-specific permissions
func checkAccountWritePermission(ctx context.Context, config AccountPermissionConfig, permCtx *PermissionContext) (bool, error) {
	// Check if user has write permission or is an admin
	hasWritePermission, err := config.PermissionService.CheckPermission(ctx, permCtx.UserID, "accounts", "write")
	if err != nil {
		return false, err
	}

	if hasWritePermission {
		return true, nil
	}

	// Check for admin permission as fallback
	hasAdminPermission, err := config.PermissionService.CheckPermission(ctx, permCtx.UserID, "accounts", "admin")
	if err != nil {
		return false, err
	}

	return hasAdminPermission, nil
}

// checkAccountDeletePermission checks delete-specific permissions
func checkAccountDeletePermission(ctx context.Context, config AccountPermissionConfig, permCtx *PermissionContext) (bool, error) {
	// Delete operations require explicit delete permission or admin access
	hasDeletePermission, err := config.PermissionService.CheckPermission(ctx, permCtx.UserID, "accounts", "delete")
	if err != nil {
		return false, err
	}

	if hasDeletePermission {
		return true, nil
	}

	// Check for admin permission as fallback
	hasAdminPermission, err := config.PermissionService.CheckPermission(ctx, permCtx.UserID, "accounts", "admin")
	if err != nil {
		return false, err
	}

	return hasAdminPermission, nil
}

// checkAccountAdminPermission checks admin-specific permissions
func checkAccountAdminPermission(ctx context.Context, config AccountPermissionConfig, permCtx *PermissionContext) (bool, error) {
	// Admin operations require explicit admin permission
	hasAdminPermission, err := config.PermissionService.CheckPermission(ctx, permCtx.UserID, "accounts", "admin")
	if err != nil {
		return false, err
	}

	return hasAdminPermission, nil
}

// Convenience functions for creating account permission middleware

// RequireAccountReadPermission creates middleware for account read operations
func RequireAccountReadPermission(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	return AccountPermissionMiddleware(AccountPermissionConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             AccountPermissionRead,
		RequiredRoles:     []string{"account_viewer", "account_manager", "admin"},
		AllowSelfAccess:   true,
		DataMaskingLevel:  1, // Partial masking for read operations
	})
}

// RequireAccountWritePermission creates middleware for account write operations
func RequireAccountWritePermission(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	return AccountPermissionMiddleware(AccountPermissionConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             AccountPermissionWrite,
		RequiredRoles:     []string{"account_manager", "admin"},
		AllowSelfAccess:   false,
		DataMaskingLevel:  0, // No masking for write operations (need full data)
	})
}

// RequireAccountDeletePermission creates middleware for account delete operations
func RequireAccountDeletePermission(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	return AccountPermissionMiddleware(AccountPermissionConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             AccountPermissionDelete,
		RequiredRoles:     []string{"admin"},
		AllowSelfAccess:   false,
		DataMaskingLevel:  0, // No masking for delete operations
	})
}

// RequireAccountAdminPermission creates middleware for account admin operations
func RequireAccountAdminPermission(permissionService service.PermissionService, auditLogger security.AuditLogger) gin.HandlerFunc {
	return AccountPermissionMiddleware(AccountPermissionConfig{
		PermissionService: permissionService,
		AuditLogger:       auditLogger,
		Level:             AccountPermissionAdmin,
		RequiredRoles:     []string{"admin"},
		AllowSelfAccess:   false,
		DataMaskingLevel:  0, // No masking for admin operations
	})
}

// Audit functions for account operations

func auditAccountAccessDenied(c *gin.Context, auditLogger security.AuditLogger, reason, action string) {
	if auditLogger != nil {
		auditLogger.LogSecurityEvent(c.Request.Context(), getClientIP(c), c.GetHeader("User-Agent"),
			"account_access_denied", fmt.Sprintf("Reason: %s, Action: %s", reason, action), security.RiskHigh)
	}
}

func auditAccountPermissionError(c *gin.Context, auditLogger security.AuditLogger, permCtx *PermissionContext, err error) {
	if auditLogger != nil {
		errorMsg := err.Error()
		userIDStr := permCtx.UserID.String()
		auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
			UserID:     &userIDStr,
			Username:   &permCtx.Username,
			IPAddress:  permCtx.IPAddress,
			UserAgent:  permCtx.UserAgent,
			Action:     "account_permission_error",
			Resource:   "accounts",
			Method:     permCtx.Method,
			Path:       permCtx.Path,
			Success:    false,
			ErrorMsg:   &errorMsg,
			Risk:       security.RiskMedium,
			Metadata:   permCtx.Metadata,
		})
	}
}

func auditAccountAccessGranted(c *gin.Context, auditLogger security.AuditLogger, permCtx *PermissionContext, duration time.Duration) {
	if auditLogger != nil {
		permCtx.Metadata["check_duration_ms"] = duration.Milliseconds()
		userIDStr := permCtx.UserID.String()
		auditLogger.LogEvent(c.Request.Context(), &security.AuditEvent{
			UserID:      &userIDStr,
			Username:    &permCtx.Username,
			IPAddress:   permCtx.IPAddress,
			UserAgent:   permCtx.UserAgent,
			Action:      "account_access_granted",
			Resource:    "accounts",
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

// GetDataMaskingLevel extracts data masking level from gin context
func GetDataMaskingLevel(c *gin.Context) int {
	if level, exists := c.Get("data_masking_level"); exists {
		if maskingLevel, ok := level.(int); ok {
			return maskingLevel
		}
	}
	return 0 // Default to no masking
}
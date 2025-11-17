package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Permission represents a system permission
type Permission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

// Role represents a user role with permissions
type Role struct {
	Name        string       `json:"name"`
	Permissions []Permission `json:"permissions"`
}

// RBACMiddleware handles role-based access control
type RBACMiddleware struct {
	roles map[string]Role
}

// NewRBACMiddleware creates a new RBAC middleware
func NewRBACMiddleware() *RBACMiddleware {
	rbac := &RBACMiddleware{
		roles: make(map[string]Role),
	}
	
	// Initialize default roles
	rbac.initializeDefaultRoles()
	
	return rbac
}

// initializeDefaultRoles sets up default system roles
func (m *RBACMiddleware) initializeDefaultRoles() {
	// Super Admin - full access
	m.roles["super_admin"] = Role{
		Name: "super_admin",
		Permissions: []Permission{
			{"*", "*"}, // All resources, all actions
		},
	}

	// Admin - system management
	m.roles["admin"] = Role{
		Name: "admin",
		Permissions: []Permission{
			{"merchants", "create"},
			{"merchants", "read"},
			{"merchants", "update"},
			{"merchants", "delete"},
			{"accounts", "create"},
			{"accounts", "read"},
			{"accounts", "update"},
			{"accounts", "delete"},
			{"orders", "read"},
			{"orders", "update"},
			{"orders", "export"},
			{"users", "read"},
			{"users", "update"},
			{"reports", "read"},
			{"reports", "export"},
			{"system", "read"},
		},
	}

	// Manager - business operations
	m.roles["manager"] = Role{
		Name: "manager",
		Permissions: []Permission{
			{"merchants", "read"},
			{"merchants", "update"},
			{"accounts", "read"},
			{"accounts", "update"},
			{"orders", "read"},
			{"orders", "update"},
			{"reports", "read"},
			{"reports", "export"},
		},
	}

	// Operator - daily operations
	m.roles["operator"] = Role{
		Name: "operator",
		Permissions: []Permission{
			{"merchants", "read"},
			{"accounts", "read"},
			{"orders", "read"},
			{"orders", "update"},
			{"reports", "read"},
		},
	}

	// Viewer - read-only access
	m.roles["viewer"] = Role{
		Name: "viewer",
		Permissions: []Permission{
			{"merchants", "read"},
			{"accounts", "read"},
			{"orders", "read"},
			{"reports", "read"},
		},
	}

	// Customer - limited access for recharge operations
	m.roles["customer"] = Role{
		Name: "customer",
		Permissions: []Permission{
			{"recharge", "create"},
			{"recharge", "read"},
			{"orders", "read"}, // Only own orders
		},
	}
}

// RequirePermission middleware that requires specific permission
func (m *RBACMiddleware) RequirePermission(resource, action string) gin.HandlerFunc {
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

		if !m.hasPermission(roleStr, resource, action) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    4034,
					"message": "Insufficient permissions",
					"details": fmt.Sprintf("Required permission: %s:%s, user role: %s", resource, action, roleStr),
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyPermission middleware that requires any of the specified permissions
func (m *RBACMiddleware) RequireAnyPermission(permissions ...Permission) gin.HandlerFunc {
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

		hasAnyPermission := false
		for _, perm := range permissions {
			if m.hasPermission(roleStr, perm.Resource, perm.Action) {
				hasAnyPermission = true
				break
			}
		}

		if !hasAnyPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    4035,
					"message": "Insufficient permissions",
					"details": fmt.Sprintf("Required any of permissions: %v, user role: %s", permissions, roleStr),
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// hasPermission checks if a role has specific permission
func (m *RBACMiddleware) hasPermission(roleName, resource, action string) bool {
	role, exists := m.roles[roleName]
	if !exists {
		return false
	}

	for _, perm := range role.Permissions {
		// Check for wildcard permissions
		if perm.Resource == "*" && perm.Action == "*" {
			return true
		}
		
		// Check for resource wildcard
		if perm.Resource == "*" && perm.Action == action {
			return true
		}
		
		// Check for action wildcard
		if perm.Resource == resource && perm.Action == "*" {
			return true
		}
		
		// Check for exact match
		if perm.Resource == resource && perm.Action == action {
			return true
		}
	}

	return false
}

// AddRole adds a new role to the system
func (m *RBACMiddleware) AddRole(role Role) {
	m.roles[role.Name] = role
}

// UpdateRole updates an existing role
func (m *RBACMiddleware) UpdateRole(roleName string, role Role) error {
	if _, exists := m.roles[roleName]; !exists {
		return fmt.Errorf("role %s does not exist", roleName)
	}
	
	m.roles[roleName] = role
	return nil
}

// RemoveRole removes a role from the system
func (m *RBACMiddleware) RemoveRole(roleName string) error {
	if _, exists := m.roles[roleName]; !exists {
		return fmt.Errorf("role %s does not exist", roleName)
	}
	
	delete(m.roles, roleName)
	return nil
}

// GetRole returns a role by name
func (m *RBACMiddleware) GetRole(roleName string) (Role, error) {
	role, exists := m.roles[roleName]
	if !exists {
		return Role{}, fmt.Errorf("role %s does not exist", roleName)
	}
	
	return role, nil
}

// ListRoles returns all available roles
func (m *RBACMiddleware) ListRoles() []Role {
	roles := make([]Role, 0, len(m.roles))
	for _, role := range m.roles {
		roles = append(roles, role)
	}
	return roles
}

// GetUserPermissions returns all permissions for a user role
func (m *RBACMiddleware) GetUserPermissions(roleName string) []Permission {
	role, exists := m.roles[roleName]
	if !exists {
		return []Permission{}
	}
	
	return role.Permissions
}

// CanAccess checks if a role can access a specific resource with action
func (m *RBACMiddleware) CanAccess(roleName, resource, action string) bool {
	return m.hasPermission(roleName, resource, action)
}

// ParseResourceFromPath extracts resource name from request path
func (m *RBACMiddleware) ParseResourceFromPath(path string) string {
	// Remove leading slash and split by slash
	path = strings.TrimPrefix(path, "/")
	parts := strings.Split(path, "/")
	
	if len(parts) == 0 {
		return ""
	}
	
	// Skip API version prefix if exists
	if parts[0] == "api" && len(parts) > 1 {
		if len(parts) > 2 && (parts[1] == "v1" || parts[1] == "v2") {
			return parts[2]
		}
		return parts[1]
	}
	
	return parts[0]
}

// ParseActionFromMethod converts HTTP method to action
func (m *RBACMiddleware) ParseActionFromMethod(method string) string {
	switch strings.ToUpper(method) {
	case "GET":
		return "read"
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return "read"
	}
}

// AutoPermissionCheck automatically checks permissions based on request path and method
func (m *RBACMiddleware) AutoPermissionCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip permission check for public endpoints
		if m.isPublicEndpoint(c.Request.URL.Path) {
			c.Next()
			return
		}

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

		resource := m.ParseResourceFromPath(c.Request.URL.Path)
		action := m.ParseActionFromMethod(c.Request.Method)

		if !m.hasPermission(roleStr, resource, action) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    4036,
					"message": "Access denied",
					"details": fmt.Sprintf("Required permission: %s:%s, user role: %s", resource, action, roleStr),
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// isPublicEndpoint checks if an endpoint is public (no authentication required)
func (m *RBACMiddleware) isPublicEndpoint(path string) bool {
	publicPaths := []string{
		"/api/auth/login",
		"/api/auth/register",
		"/api/recharge/",
		"/api/health",
		"/api/version",
		"/static/",
		"/favicon.ico",
	}

	for _, publicPath := range publicPaths {
		if strings.HasPrefix(path, publicPath) {
			return true
		}
	}

	return false
}
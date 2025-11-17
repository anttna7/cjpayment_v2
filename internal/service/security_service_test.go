package service

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"cjpayment/internal/middleware"
)

func TestSecurityService_Authentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   true,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel) // Reduce noise in tests
	
	service := NewSecurityService(config, nil, logger)
	
	t.Run("GenerateToken", func(t *testing.T) {
		token, err := service.GenerateToken(1, "testuser", "admin")
		require.NoError(t, err)
		assert.NotEmpty(t, token)
	})
	
	t.Run("RefreshToken", func(t *testing.T) {
		originalToken, err := service.GenerateToken(1, "testuser", "admin")
		require.NoError(t, err)
		
		time.Sleep(time.Millisecond * 10) // Ensure different timestamps
		
		newToken, err := service.RefreshToken(originalToken)
		require.NoError(t, err)
		assert.NotEmpty(t, newToken)
		assert.NotEqual(t, originalToken, newToken)
	})
	
	t.Run("RevokeToken", func(t *testing.T) {
		token, err := service.GenerateToken(1, "testuser", "admin")
		require.NoError(t, err)
		
		err = service.RevokeToken(token)
		assert.NoError(t, err) // Should not error even without Redis
	})
}

func TestSecurityService_PasswordManagement(t *testing.T) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	t.Run("ValidatePassword", func(t *testing.T) {
		tests := []struct {
			name        string
			password    string
			expectError bool
		}{
			{
				name:        "strong password",
				password:    "StrongP@ssw0rd!",
				expectError: false,
			},
			{
				name:        "weak password",
				password:    "weak",
				expectError: true,
			},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				err := service.ValidatePassword(tt.password)
				if tt.expectError {
					assert.Error(t, err)
				} else {
					assert.NoError(t, err)
				}
			})
		}
	})
	
	t.Run("HashAndVerifyPassword", func(t *testing.T) {
		password := "TestPassword123!"
		
		hash, err := service.HashPassword(password)
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
		assert.NotEqual(t, password, hash)
		
		// Verify correct password
		assert.True(t, service.VerifyPassword(password, hash))
		
		// Verify incorrect password
		assert.False(t, service.VerifyPassword("WrongPassword", hash))
	})
}

func TestSecurityService_DataEncryption(t *testing.T) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	t.Run("EncryptDecryptData", func(t *testing.T) {
		originalData := "sensitive data to encrypt"
		
		encrypted, err := service.EncryptData(originalData)
		require.NoError(t, err)
		assert.NotEmpty(t, encrypted)
		assert.NotEqual(t, originalData, encrypted)
		
		decrypted, err := service.DecryptData(encrypted)
		require.NoError(t, err)
		assert.Equal(t, originalData, decrypted)
	})
	
	t.Run("MaskSensitiveData", func(t *testing.T) {
		tests := []struct {
			name     string
			data     string
			expected string
		}{
			{
				name:     "phone number",
				data:     "13800138000",
				expected: "138****8000",
			},
			{
				name:     "email",
				data:     "test@example.com",
				expected: "t**t@example.com",
			},
			{
				name:     "bank account",
				data:     "1234567890123456",
				expected: "1234********3456",
			},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				var result string
				switch tt.name {
				case "phone number":
					result = service.MaskPhone(tt.data)
				case "email":
					result = service.MaskEmail(tt.data)
				case "bank account":
					result = service.MaskBankAccount(tt.data)
				}
				assert.Equal(t, tt.expected, result)
			})
		}
	})
}

func TestSecurityService_APIKeyManagement(t *testing.T) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	t.Run("GenerateAndValidateAPIKey", func(t *testing.T) {
		apiKey, err := service.GenerateAPIKey()
		require.NoError(t, err)
		assert.NotEmpty(t, apiKey)
		assert.True(t, service.ValidateAPIKey(apiKey))
		
		// Generate another key and ensure they're different
		apiKey2, err := service.GenerateAPIKey()
		require.NoError(t, err)
		assert.NotEqual(t, apiKey, apiKey2)
		assert.True(t, service.ValidateAPIKey(apiKey2))
	})
	
	t.Run("ValidateInvalidAPIKey", func(t *testing.T) {
		invalidKeys := []string{
			"invalid-key",
			"",
			"wrong_prefix_key",
			"rts_invalid-base64!",
		}
		
		for _, key := range invalidKeys {
			assert.False(t, service.ValidateAPIKey(key))
		}
	})
}

func TestSecurityService_PermissionManagement(t *testing.T) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	t.Run("HasPermission", func(t *testing.T) {
		tests := []struct {
			name     string
			role     string
			resource string
			action   string
			expected bool
		}{
			{
				name:     "admin has all permissions",
				role:     "admin",
				resource: "merchants",
				action:   "create",
				expected: true,
			},
			{
				name:     "viewer cannot create",
				role:     "viewer",
				resource: "merchants",
				action:   "create",
				expected: false,
			},
			{
				name:     "viewer can read",
				role:     "viewer",
				resource: "merchants",
				action:   "read",
				expected: true,
			},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := service.HasPermission(tt.role, tt.resource, tt.action)
				assert.Equal(t, tt.expected, result)
			})
		}
	})
	
	t.Run("GetUserPermissions", func(t *testing.T) {
		permissions := service.GetUserPermissions("admin")
		assert.NotEmpty(t, permissions)
		
		// Admin should have many permissions
		assert.Greater(t, len(permissions), 5)
	})
	
	t.Run("ManageRoles", func(t *testing.T) {
		// Add custom role
		customRole := middleware.Role{
			Name: "custom_role",
			Permissions: []middleware.Permission{
				{Resource: "test", Action: "read"},
			},
		}
		
		service.AddRole(customRole)
		
		// Check if role was added
		assert.True(t, service.HasPermission("custom_role", "test", "read"))
		assert.False(t, service.HasPermission("custom_role", "test", "write"))
		
		// Update role
		customRole.Permissions = append(customRole.Permissions, middleware.Permission{Resource: "test", Action: "write"})
		err := service.UpdateRole("custom_role", customRole)
		require.NoError(t, err)
		
		// Check updated permissions
		assert.True(t, service.HasPermission("custom_role", "test", "write"))
		
		// Remove role
		err = service.RemoveRole("custom_role")
		require.NoError(t, err)
		
		// Check if role was removed
		assert.False(t, service.HasPermission("custom_role", "test", "read"))
	})
}

func TestSecurityService_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	t.Run("RequireAuth", func(t *testing.T) {
		router := gin.New()
		router.Use(service.RequireAuth())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})
		
		// Test without token
		req := httptest.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		
		// Test with valid token
		token, err := service.GenerateToken(1, "testuser", "admin")
		require.NoError(t, err)
		
		req = httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	})
	
	t.Run("RequireRole", func(t *testing.T) {
		router := gin.New()
		router.Use(service.RequireAuth())
		router.Use(service.RequireRole("admin"))
		router.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})
		
		// Test with admin role
		adminToken, err := service.GenerateToken(1, "admin", "admin")
		require.NoError(t, err)
		
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		
		// Test with user role
		userToken, err := service.GenerateToken(2, "user", "viewer")
		require.NoError(t, err)
		
		req = httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusForbidden, w.Code)
	})
	
	t.Run("RequirePermission", func(t *testing.T) {
		router := gin.New()
		router.Use(service.RequireAuth())
		router.Use(service.RequirePermission("merchants", "create"))
		router.POST("/merchants", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "merchant created"})
		})
		
		// Test with admin role (has permission)
		adminToken, err := service.GenerateToken(1, "admin", "admin")
		require.NoError(t, err)
		
		req := httptest.NewRequest("POST", "/merchants", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		
		// Test with viewer role (no permission)
		viewerToken, err := service.GenerateToken(2, "viewer", "viewer")
		require.NoError(t, err)
		
		req = httptest.NewRequest("POST", "/merchants", nil)
		req.Header.Set("Authorization", "Bearer "+viewerToken)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

func TestSecurityService_HealthCheck(t *testing.T) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	health := service.HealthCheck()
	assert.NotEmpty(t, health)
	
	// Check that all components are reported
	expectedComponents := []string{
		"encryption_service",
		"audit_logger",
		"rbac",
		"rate_limiter",
		"redis",
		"security_monitor",
	}
	
	for _, component := range expectedComponents {
		assert.Contains(t, health, component)
	}
}

func BenchmarkSecurityService_GenerateToken(b *testing.B) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GenerateToken(1, "testuser", "admin")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkSecurityService_EncryptData(b *testing.B) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	data := "sensitive data to encrypt"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.EncryptData(data)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkSecurityService_HasPermission(b *testing.B) {
	config := SecurityConfig{
		JWTSecret:     "test-jwt-secret",
		EncryptionKey: "test-encryption-key",
		EnableAudit:   false,
		EnableMonitor: false,
	}
	
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	
	service := NewSecurityService(config, nil, logger)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service.HasPermission("admin", "merchants", "create")
	}
}
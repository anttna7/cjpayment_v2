package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTAuthMiddleware_GenerateToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	token, err := middleware.GenerateToken(1, "testuser", "admin")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	
	// Validate the token
	claims, err := middleware.validateToken(token)
	require.NoError(t, err)
	assert.Equal(t, uint(1), claims.UserID)
	assert.Equal(t, "testuser", claims.Username)
	assert.Equal(t, "admin", claims.Role)
}

func TestJWTAuthMiddleware_RequireAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	tests := []struct {
		name           string
		setupRequest   func(*http.Request)
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "valid token in header",
			setupRequest: func(req *http.Request) {
				token, _ := middleware.GenerateToken(1, "testuser", "admin")
				req.Header.Set("Authorization", "Bearer "+token)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "missing token",
			setupRequest: func(req *http.Request) {
				// No token
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid token",
			setupRequest: func(req *http.Request) {
				req.Header.Set("Authorization", "Bearer invalid-token")
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "token in query parameter",
			setupRequest: func(req *http.Request) {
				token, _ := middleware.GenerateToken(1, "testuser", "admin")
				q := req.URL.Query()
				q.Add("token", token)
				req.URL.RawQuery = q.Encode()
			},
			expectedStatus: http.StatusOK,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(middleware.RequireAuth())
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})
			
			req := httptest.NewRequest("GET", "/test", nil)
			tt.setupRequest(req)
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestJWTAuthMiddleware_RequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	tests := []struct {
		name           string
		userRole       string
		requiredRoles  []string
		expectedStatus int
	}{
		{
			name:           "user has required role",
			userRole:       "admin",
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "user has one of required roles",
			userRole:       "manager",
			requiredRoles:  []string{"admin", "manager"},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "user does not have required role",
			userRole:       "user",
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusForbidden,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(middleware.RequireAuth())
			router.Use(middleware.RequireRole(tt.requiredRoles...))
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})
			
			token, err := middleware.GenerateToken(1, "testuser", tt.userRole)
			require.NoError(t, err)
			
			req := httptest.NewRequest("GET", "/test", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestJWTAuthMiddleware_RefreshToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	// Generate original token
	originalToken, err := middleware.GenerateToken(1, "testuser", "admin")
	require.NoError(t, err)
	
	// Wait a moment to ensure different timestamps
	time.Sleep(time.Millisecond * 10)
	
	// Refresh token
	newToken, err := middleware.RefreshToken(originalToken)
	require.NoError(t, err)
	assert.NotEmpty(t, newToken)
	assert.NotEqual(t, originalToken, newToken)
	
	// Validate new token
	claims, err := middleware.validateToken(newToken)
	require.NoError(t, err)
	assert.Equal(t, uint(1), claims.UserID)
	assert.Equal(t, "testuser", claims.Username)
	assert.Equal(t, "admin", claims.Role)
}

func TestJWTAuthMiddleware_ExtractToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	tests := []struct {
		name          string
		setupRequest  func(*gin.Context)
		expectedToken string
	}{
		{
			name: "token in Authorization header",
			setupRequest: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer test-token")
			},
			expectedToken: "test-token",
		},
		{
			name: "token in query parameter",
			setupRequest: func(c *gin.Context) {
				c.Request.URL.RawQuery = "token=query-token"
			},
			expectedToken: "query-token",
		},
		{
			name: "no token",
			setupRequest: func(c *gin.Context) {
				// No token
			},
			expectedToken: "",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/test", nil)
			
			tt.setupRequest(c)
			
			token := middleware.extractToken(c)
			assert.Equal(t, tt.expectedToken, token)
		})
	}
}

func TestJWTAuthMiddleware_ValidateToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	tests := []struct {
		name        string
		token       string
		expectError bool
	}{
		{
			name: "valid token",
			token: func() string {
				token, _ := middleware.GenerateToken(1, "testuser", "admin")
				return token
			}(),
			expectError: false,
		},
		{
			name:        "invalid token",
			token:       "invalid-token",
			expectError: true,
		},
		{
			name:        "empty token",
			token:       "",
			expectError: true,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := middleware.validateToken(tt.token)
			
			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, claims)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, claims)
			}
		})
	}
}

func BenchmarkJWTAuthMiddleware_GenerateToken(b *testing.B) {
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := middleware.GenerateToken(1, "testuser", "admin")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkJWTAuthMiddleware_ValidateToken(b *testing.B) {
	middleware := NewJWTAuthMiddleware("test-secret-key", nil)
	token, _ := middleware.GenerateToken(1, "testuser", "admin")
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := middleware.validateToken(token)
		if err != nil {
			b.Fatal(err)
		}
	}
}
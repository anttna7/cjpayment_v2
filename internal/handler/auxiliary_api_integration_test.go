package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/company/cjpayment/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAuxiliaryAPIEndpoints_Integration tests the auxiliary API endpoints integration
func TestAuxiliaryAPIEndpoints_Integration(t *testing.T) {
	// Skip if no database connection available
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Setup test configuration
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "test",
			Password: "test",
			DBName:   "test",
		},
	}

	// Create handler with test config
	// Note: This would normally require a real database connection
	// For now, we'll test the endpoint structure and error handling
	handler := &Handler{
		config: cfg,
	}

	// Setup router
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Register auxiliary API routes
	v1 := router.Group("/api/v1")
	{
		v1.GET("/agents/suggestions", handler.GetAgentSuggestions)
		v1.GET("/ports/validate", handler.ValidatePortName)
	}

	t.Run("GetAgentSuggestions endpoint structure", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/agents/suggestions", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// The endpoint should exist and not return 404
		assert.NotEqual(t, http.StatusNotFound, w.Code)
		
		// Should return JSON response
		assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	})

	t.Run("GetAgentSuggestions with query parameters", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/agents/suggestions?q=test&limit=5", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// The endpoint should exist and not return 404
		assert.NotEqual(t, http.StatusNotFound, w.Code)
	})

	t.Run("ValidatePortName endpoint structure", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/ports/validate?port_name=test_port", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// The endpoint should exist and not return 404
		assert.NotEqual(t, http.StatusNotFound, w.Code)
		
		// Should return JSON response
		assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
	})

	t.Run("ValidatePortName missing parameter", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/ports/validate", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return bad request for missing parameter
		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// Should have error structure
		assert.Contains(t, response, "code")
		assert.Contains(t, response, "message")
		assert.Contains(t, response["message"].(string), "端口名称不能为空")
	})

	t.Run("ValidatePortName empty parameter", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/ports/validate?port_name=", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return bad request for empty parameter
		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// Should have error structure
		assert.Contains(t, response, "message")
		assert.Contains(t, response["message"].(string), "端口名称不能为空")
	})
}

// TestAuxiliaryAPIEndpoints_ResponseFormat tests the response format of auxiliary API endpoints
func TestAuxiliaryAPIEndpoints_ResponseFormat(t *testing.T) {
	// Setup minimal handler for testing response format
	handler := &Handler{}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	v1 := router.Group("/api/v1")
	{
		v1.GET("/agents/suggestions", handler.GetAgentSuggestions)
		v1.GET("/ports/validate", handler.ValidatePortName)
	}

	t.Run("GetAgentSuggestions response format", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/agents/suggestions", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Parse response
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// Check response structure based on status
		if w.Code == http.StatusOK {
			// Success response should have success and data fields
			assert.Contains(t, response, "success")
			assert.Contains(t, response, "data")
			
			// Data should be an array
			data, ok := response["data"].([]interface{})
			assert.True(t, ok)
			assert.NotNil(t, data)
		} else if w.Code == http.StatusInternalServerError {
			// Error response should have code and message
			assert.Contains(t, response, "code")
			assert.Contains(t, response, "message")
		}
	})

	t.Run("ValidatePortName success response format", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/ports/validate?port_name=test_port", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Parse response
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// Should have validation response structure
		if w.Code == http.StatusOK {
			assert.Contains(t, response, "is_valid")
			assert.Contains(t, response, "message")
			assert.Contains(t, response, "available")
			
			// Check types
			_, ok := response["is_valid"].(bool)
			assert.True(t, ok)
			
			_, ok = response["available"].(bool)
			assert.True(t, ok)
			
			_, ok = response["message"].(string)
			assert.True(t, ok)
		}
	})
}

// TestAuxiliaryAPIEndpoints_ParameterValidation tests parameter validation
func TestAuxiliaryAPIEndpoints_ParameterValidation(t *testing.T) {
	handler := &Handler{}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	v1 := router.Group("/api/v1")
	{
		v1.GET("/agents/suggestions", handler.GetAgentSuggestions)
		v1.GET("/ports/validate", handler.ValidatePortName)
	}

	t.Run("GetAgentSuggestions limit parameter validation", func(t *testing.T) {
		testCases := []struct {
			name        string
			limitParam  string
			expectError bool
		}{
			{"no limit", "", false},
			{"valid limit", "5", false},
			{"zero limit", "0", false},
			{"negative limit", "-1", false},
			{"invalid limit", "abc", false},
			{"very large limit", "1000", false},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				url := "/api/v1/agents/suggestions"
				if tc.limitParam != "" {
					url += "?limit=" + tc.limitParam
				}

				req := httptest.NewRequest("GET", url, nil)
				w := httptest.NewRecorder()

				router.ServeHTTP(w, req)

				// Should not return 404 (endpoint exists)
				assert.NotEqual(t, http.StatusNotFound, w.Code)
				
				// Should return valid JSON
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
			})
		}
	})

	t.Run("ValidatePortName parameter validation", func(t *testing.T) {
		testCases := []struct {
			name           string
			portName       string
			expectedStatus int
		}{
			{"missing parameter", "", http.StatusBadRequest},
			{"empty parameter", "?port_name=", http.StatusBadRequest},
			{"valid parameter", "?port_name=test_port", http.StatusOK},
			{"special characters", "?port_name=test@port", http.StatusOK},
			{"long parameter", "?port_name=very_long_port_name_that_might_exceed_limits", http.StatusOK},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				url := "/api/v1/ports/validate"
				if tc.portName != "" {
					url += tc.portName
				}

				req := httptest.NewRequest("GET", url, nil)
				w := httptest.NewRecorder()

				router.ServeHTTP(w, req)

				assert.Equal(t, tc.expectedStatus, w.Code)
				
				// Should return valid JSON
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
			})
		}
	})
}
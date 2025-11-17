package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/company/cjpayment/internal/config"
	"github.com/gin-gonic/gin"
)

func TestHealthCheck(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test configuration
	cfg := &config.Config{}

	// Create handler with nil database for this simple test
	handler := New(nil, cfg)

	// Create a Gin router and register routes
	router := gin.New()
	handler.RegisterRoutes(router)

	// Create a test request
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Create a response recorder
	w := httptest.NewRecorder()

	// Perform the request
	router.ServeHTTP(w, req)

	// Check the status code
	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	// Check the response body contains expected fields
	expectedSubstrings := []string{
		`"status":"ok"`,
		`"service":"cjpayment-api"`,
		`"version":"1.0.0"`,
	}

	body := w.Body.String()
	for _, expected := range expectedSubstrings {
		if !contains(body, expected) {
			t.Errorf("Expected response body to contain %s, got: %s", expected, body)
		}
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > len(substr) && (s[:len(substr)] == substr || 
		s[len(s)-len(substr):] == substr || 
		containsInMiddle(s, substr))))
}

func containsInMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
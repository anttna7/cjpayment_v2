package integration

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"cjpayment/internal/middleware"
	"cjpayment/internal/service"
	"cjpayment/pkg/alerts"
	"cjpayment/pkg/errors"
)

func TestErrorHandlingIntegration(t *testing.T) {
	// Setup test database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Setup logger
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Setup error handling service
	errorService := service.NewErrorHandlingService(db, logger, &service.ErrorHandlingConfig{
		EnableRecovery:         true,
		EnableConsistencyCheck: true,
		EnableAlerts:          true,
		ErrorStatsWindow:      time.Minute,
		MaxErrorRate:          0.1,
	})

	ctx := context.Background()
	err = errorService.Start(ctx)
	require.NoError(t, err)
	defer errorService.Stop()

	// Setup Gin router with error handling middleware
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add request ID middleware
	router.Use(middleware.RequestIDMiddleware())

	// Add error handling middleware
	router.Use(middleware.ErrorHandler(&middleware.ErrorHandlerConfig{
		EnableStackTrace: true,
		EnableRecovery:   true,
		EnableMetrics:    true,
		Logger:          logger,
	}))

	// Test routes
	router.GET("/test/panic", func(c *gin.Context) {
		panic("test panic")
	})

	router.GET("/test/error", func(c *gin.Context) {
		c.Error(errors.NewAPIError(errors.ErrValidationFailed, "Test validation error"))
	})

	router.GET("/test/db-error", func(c *gin.Context) {
		c.Error(errors.NewAPIError(errors.ErrDatabaseConnection, "Database connection failed"))
	})

	router.GET("/test/generic-error", func(c *gin.Context) {
		c.Error(fmt.Errorf("generic error"))
	})

	router.GET("/test/success", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	t.Run("panic recovery", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test/panic", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		
		var response map[string]interface{}
		err := parseJSONResponse(w.Body.String(), &response)
		require.NoError(t, err)

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, float64(errors.ErrInternalServer), errorData["code"])
		assert.Contains(t, errorData["message"], "系统发生严重错误")
		assert.NotEmpty(t, errorData["request_id"])
	})

	t.Run("api error handling", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test/error", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		
		var response map[string]interface{}
		err := parseJSONResponse(w.Body.String(), &response)
		require.NoError(t, err)

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, float64(errors.ErrValidationFailed), errorData["code"])
		assert.Equal(t, "Test validation error", errorData["message"])
	})

	t.Run("critical error handling", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test/db-error", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		
		var response map[string]interface{}
		err := parseJSONResponse(w.Body.String(), &response)
		require.NoError(t, err)

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, float64(errors.ErrDatabaseConnection), errorData["code"])
		assert.Equal(t, "Database connection failed", errorData["message"])
		assert.Equal(t, true, errorData["retryable"])
	})

	t.Run("generic error conversion", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test/generic-error", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		
		var response map[string]interface{}
		err := parseJSONResponse(w.Body.String(), &response)
		require.NoError(t, err)

		errorData := response["error"].(map[string]interface{})
		assert.Equal(t, float64(errors.ErrInternalServer), errorData["code"])
		assert.Contains(t, errorData["message"], "generic error")
	})

	t.Run("successful request", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test/success", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]interface{}
		err := parseJSONResponse(w.Body.String(), &response)
		require.NoError(t, err)

		assert.Equal(t, "success", response["message"])
	})

	t.Run("error statistics", func(t *testing.T) {
		// Generate some errors
		for i := 0; i < 5; i++ {
			req := httptest.NewRequest("GET", "/test/error", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
		}

		// Check error statistics
		stats := errorService.GetErrorStatistics()
		assert.True(t, stats.totalErrors >= 5)
		assert.True(t, stats.errorsByCode[errors.ErrValidationFailed] >= 5)
		assert.True(t, len(stats.recentErrors) >= 5)
	})
}

func TestAlertManagerIntegration(t *testing.T) {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create alert manager
	alertManager := alerts.NewAlertManager(&alerts.AlertConfig{
		EnableAlerts:    true,
		BufferSize:      100,
		BatchSize:       5,
		FlushInterval:   100 * time.Millisecond,
		RetryAttempts:   2,
		RetryBackoff:    time.Millisecond,
	}, logger)

	// Create test webhook server
	alertReceived := make(chan *alerts.Alert, 10)
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var alert alerts.Alert
		err := parseJSONRequest(r, &alert)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		
		alertReceived <- &alert
		w.WriteHeader(http.StatusOK)
	}))
	defer testServer.Close()

	// Register webhook channel
	webhookChannel := alerts.NewWebhookChannel("test-webhook", testServer.URL, nil)
	alertManager.RegisterChannel(webhookChannel)

	// Add test rule
	alertManager.AddRule(alerts.AlertRule{
		Name: "test-rule",
		Conditions: []alerts.AlertCondition{
			{Field: "level", Operator: "eq", Value: "critical"},
		},
		Channels: []string{"test-webhook"},
		Enabled:  true,
	})

	ctx := context.Background()
	err := alertManager.Start(ctx)
	require.NoError(t, err)
	defer alertManager.Stop()

	t.Run("send critical alert", func(t *testing.T) {
		alert := &alerts.Alert{
			Level:     alerts.AlertLevelCritical,
			Title:     "Test Critical Alert",
			Message:   "This is a test critical alert",
			Source:    "test",
			Category:  "test",
			Timestamp: time.Now(),
		}

		err := alertManager.SendAlert(ctx, alert)
		require.NoError(t, err)

		// Wait for alert to be processed and sent
		select {
		case receivedAlert := <-alertReceived:
			assert.Equal(t, alert.Title, receivedAlert.Title)
			assert.Equal(t, alert.Message, receivedAlert.Message)
			assert.Equal(t, alert.Level, receivedAlert.Level)
		case <-time.After(time.Second):
			t.Fatal("Alert was not received within timeout")
		}
	})

	t.Run("filter non-matching alert", func(t *testing.T) {
		alert := &alerts.Alert{
			Level:     alerts.AlertLevelLow,
			Title:     "Test Low Alert",
			Message:   "This is a test low alert",
			Source:    "test",
			Category:  "test",
			Timestamp: time.Now(),
		}

		err := alertManager.SendAlert(ctx, alert)
		require.NoError(t, err)

		// Wait a bit to ensure alert is not sent
		select {
		case <-alertReceived:
			t.Fatal("Alert should not have been sent")
		case <-time.After(200 * time.Millisecond):
			// Expected - alert should be filtered out
		}
	})
}

func TestConsistencyCheckerIntegration(t *testing.T) {
	// Setup test database with tables
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Create test tables
	err = db.Exec(`
		CREATE TABLE merchants (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			status TEXT DEFAULT 'active'
		)
	`).Error
	require.NoError(t, err)

	err = db.Exec(`
		CREATE TABLE receive_accounts (
			id INTEGER PRIMARY KEY,
			account_name TEXT NOT NULL,
			daily_limit DECIMAL(15,2) DEFAULT 0
		)
	`).Error
	require.NoError(t, err)

	err = db.Exec(`
		CREATE TABLE merchant_accounts (
			id INTEGER PRIMARY KEY,
			merchant_id INTEGER,
			receive_account_id INTEGER,
			priority INTEGER DEFAULT 1
		)
	`).Error
	require.NoError(t, err)

	err = db.Exec(`
		CREATE TABLE recharge_orders (
			id INTEGER PRIMARY KEY,
			order_no TEXT UNIQUE NOT NULL,
			merchant_id INTEGER,
			receive_account_id INTEGER,
			amount DECIMAL(15,2),
			status TEXT DEFAULT 'pending',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`).Error
	require.NoError(t, err)

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create consistency checker
	checker := consistency.NewConsistencyChecker(db, logger, &consistency.ConsistencyConfig{
		CheckInterval:    time.Minute,
		EnableAutoRepair: true,
		MaxRepairRetries: 3,
		AlertOnFailure:   true,
	})

	ctx := context.Background()
	err = checker.Start(ctx)
	require.NoError(t, err)
	defer checker.Stop()

	t.Run("detect orphaned bindings", func(t *testing.T) {
		// Insert test data with orphaned binding
		db.Exec("INSERT INTO merchants (id, name) VALUES (1, 'Test Merchant')")
		db.Exec("INSERT INTO receive_accounts (id, account_name) VALUES (1, 'Test Account')")
		db.Exec("INSERT INTO merchant_accounts (id, merchant_id, receive_account_id) VALUES (1, 999, 1)") // Orphaned

		result, err := checker.RunCheck(ctx, "merchant_account_binding")
		require.NoError(t, err)

		assert.Equal(t, "fail", result.Status)
		assert.Len(t, result.Issues, 1)
		assert.Equal(t, "orphaned_binding", result.Issues[0].Type)
		assert.Equal(t, "high", result.Issues[0].Severity)
	})

	t.Run("detect invalid order references", func(t *testing.T) {
		// Insert order with invalid account reference
		db.Exec("INSERT INTO recharge_orders (id, order_no, merchant_id, receive_account_id) VALUES (1, 'ORDER001', 1, 999)") // Invalid account

		result, err := checker.RunCheck(ctx, "order_account_consistency")
		require.NoError(t, err)

		assert.Equal(t, "fail", result.Status)
		assert.Len(t, result.Issues, 1)
		assert.Equal(t, "invalid_account_reference", result.Issues[0].Type)
	})

	t.Run("detect invalid order status", func(t *testing.T) {
		// Insert order with invalid status
		db.Exec("INSERT INTO recharge_orders (id, order_no, status) VALUES (2, 'ORDER002', 'invalid_status')")

		result, err := checker.RunCheck(ctx, "order_status_consistency")
		require.NoError(t, err)

		assert.Equal(t, "fail", result.Status)
		assert.Len(t, result.Issues, 1)
		assert.Equal(t, "invalid_status", result.Issues[0].Type)
	})

	t.Run("run all checks", func(t *testing.T) {
		results, err := checker.RunAllChecks(ctx)
		require.NoError(t, err)

		assert.True(t, len(results) > 0)
		
		// Check that we have results for all registered checks
		checkNames := make(map[string]bool)
		for _, result := range results {
			checkNames[result.CheckName] = true
		}
		
		expectedChecks := []string{
			"merchant_account_binding",
			"order_account_consistency", 
			"order_status_consistency",
			"account_limit_consistency",
		}
		
		for _, expected := range expectedChecks {
			assert.True(t, checkNames[expected], "Missing check: %s", expected)
		}
	})
}

func TestRecoveryManagerIntegration(t *testing.T) {
	// Setup test database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create recovery manager
	recoveryManager := recovery.NewRecoveryManager(db, nil, logger, &recovery.RecoveryConfig{
		CheckInterval:     time.Second,
		MaxRetryAttempts:  2,
		RetryBackoff:      100 * time.Millisecond,
		EnableAutoRestart: true,
		AlertThreshold:    2,
	})

	ctx := context.Background()
	err = recoveryManager.Start(ctx)
	require.NoError(t, err)
	defer recoveryManager.Stop()

	t.Run("health status check", func(t *testing.T) {
		// Wait a bit for health checks to run
		time.Sleep(200 * time.Millisecond)

		statuses := recoveryManager.GetHealthStatus()
		assert.True(t, len(statuses) > 0)

		// Check that database health check exists and is healthy
		var dbStatus *recovery.HealthStatus
		for _, status := range statuses {
			if status.Name == "database" {
				dbStatus = &status
				break
			}
		}

		require.NotNil(t, dbStatus)
		assert.Equal(t, "healthy", dbStatus.Status)
		assert.Equal(t, 0, dbStatus.FailCount)
	})

	t.Run("custom health check", func(t *testing.T) {
		// Register a custom health check that will fail
		failingCheck := recovery.HealthCheck{
			Name:     "test-failing-check",
			Enabled:  true,
			MaxFails: 2,
			CheckFunc: func(ctx context.Context) error {
				return fmt.Errorf("test failure")
			},
			RecoverFunc: func(ctx context.Context) error {
				return nil // Recovery succeeds
			},
		}

		recoveryManager.RegisterHealthCheck(failingCheck)

		// Wait for health checks to run
		time.Sleep(300 * time.Millisecond)

		statuses := recoveryManager.GetHealthStatus()
		
		var testStatus *recovery.HealthStatus
		for _, status := range statuses {
			if status.Name == "test-failing-check" {
				testStatus = &status
				break
			}
		}

		require.NotNil(t, testStatus)
		assert.Equal(t, "unhealthy", testStatus.Status)
		assert.True(t, testStatus.FailCount > 0)
	})
}

// Helper functions
func parseJSONResponse(body string, v interface{}) error {
	return parseJSON(strings.NewReader(body), v)
}

func parseJSONRequest(r *http.Request, v interface{}) error {
	return parseJSON(r.Body, v)
}

func parseJSON(reader interface{}, v interface{}) error {
	// Simple JSON parsing - in real implementation you'd use json.Unmarshal
	// This is a placeholder for the test
	return nil
}
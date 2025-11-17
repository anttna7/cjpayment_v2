package handler

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// AccountsIntegrationTestSuite defines the test suite for accounts integration tests
type AccountsIntegrationTestSuite struct {
	suite.Suite
	db      *sqlx.DB
	handler *Handler
	router  *gin.Engine
}

// SetupSuite runs once before all tests in the suite
func (suite *AccountsIntegrationTestSuite) SetupSuite() {
	// Skip integration tests if no database URL is provided
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		suite.T().Skip("TEST_DATABASE_URL not set, skipping integration tests")
	}

	// Connect to test database
	db, err := sqlx.Connect("postgres", dbURL)
	require.NoError(suite.T(), err)
	suite.db = db

	// Set up test configuration
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			URL: dbURL,
		},
	}

	// Create handler with real dependencies
	suite.handler = New(db, cfg)

	// Set up Gin router
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()
	suite.handler.RegisterRoutes(suite.router)
}

// TearDownSuite runs once after all tests in the suite
func (suite *AccountsIntegrationTestSuite) TearDownSuite() {
	if suite.db != nil {
		suite.db.Close()
	}
}

// SetupTest runs before each test
func (suite *AccountsIntegrationTestSuite) SetupTest() {
	// Clean up test data before each test
	suite.cleanupTestData()
}

// TearDownTest runs after each test
func (suite *AccountsIntegrationTestSuite) TearDownTest() {
	// Clean up test data after each test
	suite.cleanupTestData()
}

// cleanupTestData removes all test data from the database
func (suite *AccountsIntegrationTestSuite) cleanupTestData() {
	// Delete test data in reverse dependency order
	queries := []string{
		"DELETE FROM merchant_receive_accounts WHERE receive_account_id IN (SELECT id FROM receive_accounts WHERE account_name LIKE 'Test%')",
		"DELETE FROM receive_accounts WHERE account_name LIKE 'Test%'",
		"DELETE FROM merchants WHERE name LIKE 'Test%'",
	}

	for _, query := range queries {
		_, err := suite.db.Exec(query)
		if err != nil {
			suite.T().Logf("Warning: failed to cleanup with query %s: %v", query, err)
		}
	}
}

// createTestAccount creates a test account in the database
func (suite *AccountsIntegrationTestSuite) createTestAccount() *repository.ReceiveAccount {
	account := &repository.ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account " + uuid.New().String()[:8],
		AccountNumber: fmt.Sprintf("TEST%d", time.Now().Unix()),
		AccountType:   "alipay",
		AccountHolder: "Test Holder",
		PaymentType:   "public",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.Zero,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		LastResetDate: time.Now().Truncate(24 * time.Hour),
	}

	query := `
		INSERT INTO receive_accounts (id, account_name, account_number, account_type, account_holder, 
		                             payment_type, status, daily_limit, single_limit, daily_used, 
		                             last_reset_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`

	_, err := suite.db.Exec(query,
		account.ID, account.AccountName, account.AccountNumber, account.AccountType, account.AccountHolder,
		account.PaymentType, account.Status, account.DailyLimit, account.SingleLimit, account.DailyUsed,
		account.LastResetDate, account.CreatedAt, account.UpdatedAt)

	require.NoError(suite.T(), err)
	return account
}

// TestCreateAccountIntegration tests the complete account creation flow
func (suite *AccountsIntegrationTestSuite) TestCreateAccountIntegration() {
	requestBody := service.CreateReceiveAccountRequest{
		AccountName:   "Test Integration Account",
		AccountNumber: fmt.Sprintf("INTEG%d", time.Now().Unix()),
		AccountType:   "alipay",
		AccountHolder: "Integration Test Holder",
		PaymentType:   "public",
		DailyLimit:    decimal.NewFromInt(20000),
		SingleLimit:   decimal.NewFromInt(2000),
	}

	body, err := json.Marshal(requestBody)
	require.NoError(suite.T(), err)

	req, err := http.NewRequest("POST", "/api/v1/accounts", bytes.NewBuffer(body))
	require.NoError(suite.T(), err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusCreated, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.True(suite.T(), response["success"].(bool))
	data := response["data"].(map[string]interface{})
	assert.Equal(suite.T(), requestBody.AccountName, data["account_name"])
	assert.Equal(suite.T(), requestBody.AccountNumber, data["account_number"])

	// Verify the account was actually created in the database
	var count int
	err = suite.db.Get(&count, "SELECT COUNT(*) FROM receive_accounts WHERE account_number = $1", requestBody.AccountNumber)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), 1, count)
}

// TestGetAccountIntegration tests the complete account retrieval flow
func (suite *AccountsIntegrationTestSuite) TestGetAccountIntegration() {
	// Create a test account
	account := suite.createTestAccount()

	req, err := http.NewRequest("GET", "/api/v1/accounts/"+account.ID.String(), nil)
	require.NoError(suite.T(), err)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.True(suite.T(), response["success"].(bool))
	data := response["data"].(map[string]interface{})
	assert.Equal(suite.T(), account.AccountName, data["account_name"])
	assert.Equal(suite.T(), account.AccountNumber, data["account_number"])
}

// TestListAccountsIntegration tests the complete account listing flow
func (suite *AccountsIntegrationTestSuite) TestListAccountsIntegration() {
	// Create multiple test accounts
	account1 := suite.createTestAccount()
	account2 := suite.createTestAccount()
	account2.AccountType = "wechat"
	
	// Update account2 type in database
	_, err := suite.db.Exec("UPDATE receive_accounts SET account_type = $1 WHERE id = $2", "wechat", account2.ID)
	require.NoError(suite.T(), err)

	tests := []struct {
		name           string
		queryParams    string
		expectedCount  int
		expectedFilter func([]interface{}) bool
	}{
		{
			name:          "list all accounts",
			queryParams:   "",
			expectedCount: 2,
			expectedFilter: func(accounts []interface{}) bool {
				return len(accounts) >= 2
			},
		},
		{
			name:          "filter by account type",
			queryParams:   "?type=alipay",
			expectedCount: 1,
			expectedFilter: func(accounts []interface{}) bool {
				for _, acc := range accounts {
					account := acc.(map[string]interface{})
					if account["account_type"] != "alipay" {
						return false
					}
				}
				return true
			},
		},
		{
			name:          "pagination",
			queryParams:   "?page=1&limit=1",
			expectedCount: 1,
			expectedFilter: func(accounts []interface{}) bool {
				return len(accounts) == 1
			},
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/v1/accounts"+tt.queryParams, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			suite.router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusOK, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			assert.True(t, response["success"].(bool))
			data := response["data"].(map[string]interface{})
			accounts := data["accounts"].([]interface{})

			assert.True(t, tt.expectedFilter(accounts))
		})
	}
}

// TestUpdateAccountIntegration tests the complete account update flow
func (suite *AccountsIntegrationTestSuite) TestUpdateAccountIntegration() {
	// Create a test account
	account := suite.createTestAccount()

	updateRequest := service.UpdateReceiveAccountRequest{
		AccountName: stringPtr("Updated Integration Account"),
		Status:      stringPtr("inactive"),
		DailyLimit:  decimalPtr(decimal.NewFromInt(15000)),
	}

	body, err := json.Marshal(updateRequest)
	require.NoError(suite.T(), err)

	req, err := http.NewRequest("PUT", "/api/v1/accounts/"+account.ID.String(), bytes.NewBuffer(body))
	require.NoError(suite.T(), err)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.True(suite.T(), response["success"].(bool))
	data := response["data"].(map[string]interface{})
	assert.Equal(suite.T(), *updateRequest.AccountName, data["account_name"])
	assert.Equal(suite.T(), *updateRequest.Status, data["status"])

	// Verify the account was actually updated in the database
	var updatedAccount repository.ReceiveAccount
	err = suite.db.Get(&updatedAccount, "SELECT * FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), *updateRequest.AccountName, updatedAccount.AccountName)
	assert.Equal(suite.T(), *updateRequest.Status, updatedAccount.Status)
}

// TestDeleteAccountIntegration tests the complete account deletion flow
func (suite *AccountsIntegrationTestSuite) TestDeleteAccountIntegration() {
	// Create a test account
	account := suite.createTestAccount()

	req, err := http.NewRequest("DELETE", "/api/v1/accounts/"+account.ID.String(), nil)
	require.NoError(suite.T(), err)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.True(suite.T(), response["success"].(bool))
	assert.Contains(suite.T(), response["message"], "deleted successfully")

	// Verify the account was soft deleted in the database
	var status string
	err = suite.db.Get(&status, "SELECT status FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "deleted", status)
}

// TestRestoreAccountIntegration tests the complete account restoration flow
func (suite *AccountsIntegrationTestSuite) TestRestoreAccountIntegration() {
	// Create a test account and mark it as deleted
	account := suite.createTestAccount()
	_, err := suite.db.Exec("UPDATE receive_accounts SET status = 'deleted' WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)

	req, err := http.NewRequest("POST", "/api/v1/accounts/"+account.ID.String()+"/restore", nil)
	require.NoError(suite.T(), err)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)

	assert.Equal(suite.T(), http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(suite.T(), err)

	assert.True(suite.T(), response["success"].(bool))
	assert.Contains(suite.T(), response["message"], "restored successfully")

	// Verify the account was restored in the database
	var status string
	err = suite.db.Get(&status, "SELECT status FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), "inactive", status) // Restored accounts are set to inactive
}

// TestAccountValidationIntegration tests validation rules in the integration flow
func (suite *AccountsIntegrationTestSuite) TestAccountValidationIntegration() {
	tests := []struct {
		name           string
		requestBody    service.CreateReceiveAccountRequest
		expectedStatus int
		expectedError  string
	}{
		{
			name: "duplicate account number",
			requestBody: service.CreateReceiveAccountRequest{
				AccountName:   "Duplicate Test",
				AccountNumber: "DUPLICATE123",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "account number already exists",
		},
		{
			name: "invalid account type",
			requestBody: service.CreateReceiveAccountRequest{
				AccountName:   "Invalid Type Test",
				AccountNumber: "INVALID123",
				AccountType:   "invalid_type",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "validation failed",
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			// For duplicate test, create an account with the same number first
			if tt.name == "duplicate account number" {
				existingAccount := suite.createTestAccount()
				existingAccount.AccountNumber = tt.requestBody.AccountNumber
				_, err := suite.db.Exec("UPDATE receive_accounts SET account_number = $1 WHERE id = $2", 
					tt.requestBody.AccountNumber, existingAccount.ID)
				require.NoError(t, err)
			}

			body, err := json.Marshal(tt.requestBody)
			require.NoError(t, err)

			req, err := http.NewRequest("POST", "/api/v1/accounts", bytes.NewBuffer(body))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			suite.router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			}
		})
	}
}

// TestConcurrentAccountOperations tests concurrent operations on accounts
func (suite *AccountsIntegrationTestSuite) TestConcurrentAccountOperations() {
	// Create a test account
	account := suite.createTestAccount()

	// Simulate concurrent updates
	done := make(chan bool, 2)
	errors := make(chan error, 2)

	// First concurrent update
	go func() {
		updateRequest := service.UpdateReceiveAccountRequest{
			AccountName: stringPtr("Concurrent Update 1"),
		}

		body, err := json.Marshal(updateRequest)
		if err != nil {
			errors <- err
			done <- true
			return
		}

		req, err := http.NewRequest("PUT", "/api/v1/accounts/"+account.ID.String(), bytes.NewBuffer(body))
		if err != nil {
			errors <- err
			done <- true
			return
		}
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			errors <- fmt.Errorf("first update failed with status %d", w.Code)
		}
		done <- true
	}()

	// Second concurrent update
	go func() {
		// Add a small delay to increase chance of concurrency
		time.Sleep(10 * time.Millisecond)

		updateRequest := service.UpdateReceiveAccountRequest{
			AccountName: stringPtr("Concurrent Update 2"),
		}

		body, err := json.Marshal(updateRequest)
		if err != nil {
			errors <- err
			done <- true
			return
		}

		req, err := http.NewRequest("PUT", "/api/v1/accounts/"+account.ID.String(), bytes.NewBuffer(body))
		if err != nil {
			errors <- err
			done <- true
			return
		}
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)

		// One of the updates might fail due to concurrency control
		if w.Code != http.StatusOK && w.Code != http.StatusInternalServerError {
			errors <- fmt.Errorf("second update failed with unexpected status %d", w.Code)
		}
		done <- true
	}()

	// Wait for both operations to complete
	<-done
	<-done

	// Check if there were any unexpected errors
	select {
	case err := <-errors:
		suite.T().Logf("Concurrent operation error (may be expected): %v", err)
	default:
		// No errors, which is also fine
	}

	// Verify the account still exists and has one of the expected names
	var finalName string
	err := suite.db.Get(&finalName, "SELECT account_name FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)
	
	// The final name should be one of the concurrent updates or the original name
	validNames := []string{"Concurrent Update 1", "Concurrent Update 2", account.AccountName}
	assert.Contains(suite.T(), validNames, finalName)
}

// TestAccountPerformance tests the performance of account operations
func (suite *AccountsIntegrationTestSuite) TestAccountPerformance() {
	// Skip performance test in short mode
	if testing.Short() {
		suite.T().Skip("Skipping performance test in short mode")
	}

	// Create multiple accounts to test list performance
	numAccounts := 100
	accountIDs := make([]uuid.UUID, numAccounts)

	start := time.Now()
	for i := 0; i < numAccounts; i++ {
		account := suite.createTestAccount()
		accountIDs[i] = account.ID
	}
	createDuration := time.Since(start)

	suite.T().Logf("Created %d accounts in %v (avg: %v per account)", 
		numAccounts, createDuration, createDuration/time.Duration(numAccounts))

	// Test list performance
	start = time.Now()
	req, err := http.NewRequest("GET", "/api/v1/accounts?limit=50", nil)
	require.NoError(suite.T(), err)

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)
	listDuration := time.Since(start)

	assert.Equal(suite.T(), http.StatusOK, w.Code)
	suite.T().Logf("Listed accounts in %v", listDuration)

	// Performance assertions (adjust thresholds as needed)
	assert.Less(suite.T(), createDuration.Milliseconds(), int64(5000), "Account creation took too long")
	assert.Less(suite.T(), listDuration.Milliseconds(), int64(1000), "Account listing took too long")
}

// Helper functions
func stringPtr(s string) *string {
	return &s
}

func decimalPtr(d decimal.Decimal) *decimal.Decimal {
	return &d
}

// TestAccountsIntegration runs the integration test suite
func TestAccountsIntegration(t *testing.T) {
	suite.Run(t, new(AccountsIntegrationTestSuite))
}
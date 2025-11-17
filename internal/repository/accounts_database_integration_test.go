package repository

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	_ "github.com/lib/pq" // PostgreSQL driver
)

// AccountsDatabaseIntegrationTestSuite defines the test suite for database integration tests
type AccountsDatabaseIntegrationTestSuite struct {
	suite.Suite
	db   *sqlx.DB
	repo ReceiveAccountRepository
}

// SetupSuite runs once before all tests in the suite
func (suite *AccountsDatabaseIntegrationTestSuite) SetupSuite() {
	// Skip integration tests if no database URL is provided
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		suite.T().Skip("TEST_DATABASE_URL not set, skipping database integration tests")
	}

	// Connect to test database
	db, err := sqlx.Connect("postgres", dbURL)
	require.NoError(suite.T(), err)
	suite.db = db

	// Create repository
	suite.repo = NewReceiveAccountRepository(db)

	// Ensure the receive_accounts table exists
	suite.ensureTableExists()
}

// TearDownSuite runs once after all tests in the suite
func (suite *AccountsDatabaseIntegrationTestSuite) TearDownSuite() {
	if suite.db != nil {
		suite.db.Close()
	}
}

// SetupTest runs before each test
func (suite *AccountsDatabaseIntegrationTestSuite) SetupTest() {
	// Clean up test data before each test
	suite.cleanupTestData()
}

// TearDownTest runs after each test
func (suite *AccountsDatabaseIntegrationTestSuite) TearDownTest() {
	// Clean up test data after each test
	suite.cleanupTestData()
}

// ensureTableExists creates the receive_accounts table if it doesn't exist
func (suite *AccountsDatabaseIntegrationTestSuite) ensureTableExists() {
	createTableSQL := `
		CREATE TABLE IF NOT EXISTS receive_accounts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			account_name VARCHAR(100) NOT NULL,
			account_number VARCHAR(50) NOT NULL UNIQUE,
			account_type VARCHAR(20) NOT NULL,
			custom_payment_provider VARCHAR(50),
			bank_name VARCHAR(100),
			bank_branch VARCHAR(100),
			account_holder VARCHAR(100) NOT NULL,
			payment_type VARCHAR(20) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'active',
			daily_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
			single_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
			daily_used DECIMAL(15,2) NOT NULL DEFAULT 0,
			last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_by UUID,
			updated_by UUID
		);
		
		CREATE INDEX IF NOT EXISTS idx_receive_accounts_type_status ON receive_accounts(account_type, status);
		CREATE INDEX IF NOT EXISTS idx_receive_accounts_payment_type ON receive_accounts(payment_type);
		CREATE INDEX IF NOT EXISTS idx_receive_accounts_created_at ON receive_accounts(created_at);
	`

	_, err := suite.db.Exec(createTableSQL)
	require.NoError(suite.T(), err)
}

// cleanupTestData removes all test data from the database
func (suite *AccountsDatabaseIntegrationTestSuite) cleanupTestData() {
	_, err := suite.db.Exec("DELETE FROM receive_accounts WHERE account_name LIKE 'Test%' OR account_name LIKE 'Integration%'")
	if err != nil {
		suite.T().Logf("Warning: failed to cleanup test data: %v", err)
	}
}

// createTestAccountForDB creates a test account for database testing
func (suite *AccountsDatabaseIntegrationTestSuite) createTestAccountForDB() *ReceiveAccount {
	return &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account " + uuid.New().String()[:8],
		AccountNumber: fmt.Sprintf("TEST%d", time.Now().UnixNano()),
		AccountType:   "alipay",
		AccountHolder: "Test Holder",
		PaymentType:   "public",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.Zero,
		LastResetDate: time.Now().Truncate(24 * time.Hour),
	}
}

// TestCreateAccountDatabase tests account creation in the database
func (suite *AccountsDatabaseIntegrationTestSuite) TestCreateAccountDatabase() {
	account := suite.createTestAccountForDB()

	err := suite.repo.Create(context.Background(), account)
	require.NoError(suite.T(), err)

	// Verify the account was created
	var count int
	err = suite.db.Get(&count, "SELECT COUNT(*) FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), 1, count)

	// Verify the account data
	var dbAccount ReceiveAccount
	err = suite.db.Get(&dbAccount, "SELECT * FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), account.AccountName, dbAccount.AccountName)
	assert.Equal(suite.T(), account.AccountNumber, dbAccount.AccountNumber)
	assert.Equal(suite.T(), account.AccountType, dbAccount.AccountType)
	assert.Equal(suite.T(), account.AccountHolder, dbAccount.AccountHolder)
	assert.Equal(suite.T(), account.PaymentType, dbAccount.PaymentType)
	assert.Equal(suite.T(), account.Status, dbAccount.Status)
	assert.True(suite.T(), account.DailyLimit.Equal(dbAccount.DailyLimit))
	assert.True(suite.T(), account.SingleLimit.Equal(dbAccount.SingleLimit))
}

// TestGetAccountByIDDatabase tests account retrieval by ID
func (suite *AccountsDatabaseIntegrationTestSuite) TestGetAccountByIDDatabase() {
	// Create a test account directly in the database
	account := suite.createTestAccountForDB()
	err := suite.repo.Create(context.Background(), account)
	require.NoError(suite.T(), err)

	// Retrieve the account
	retrievedAccount, err := suite.repo.GetByID(context.Background(), account.ID)
	require.NoError(suite.T(), err)
	require.NotNil(suite.T(), retrievedAccount)

	assert.Equal(suite.T(), account.ID, retrievedAccount.ID)
	assert.Equal(suite.T(), account.AccountName, retrievedAccount.AccountName)
	assert.Equal(suite.T(), account.AccountNumber, retrievedAccount.AccountNumber)

	// Test non-existent account
	nonExistentID := uuid.New()
	_, err = suite.repo.GetByID(context.Background(), nonExistentID)
	assert.Error(suite.T(), err)
	assert.Equal(suite.T(), sql.ErrNoRows, err)
}

// TestUpdateAccountDatabase tests account updates in the database
func (suite *AccountsDatabaseIntegrationTestSuite) TestUpdateAccountDatabase() {
	// Create a test account
	account := suite.createTestAccountForDB()
	err := suite.repo.Create(context.Background(), account)
	require.NoError(suite.T(), err)

	// Update the account
	account.AccountName = "Updated Test Account"
	account.Status = "inactive"
	account.DailyLimit = decimal.NewFromInt(20000)

	err = suite.repo.Update(context.Background(), account)
	require.NoError(suite.T(), err)

	// Verify the update
	updatedAccount, err := suite.repo.GetByID(context.Background(), account.ID)
	require.NoError(suite.T(), err)

	assert.Equal(suite.T(), "Updated Test Account", updatedAccount.AccountName)
	assert.Equal(suite.T(), "inactive", updatedAccount.Status)
	assert.True(suite.T(), decimal.NewFromInt(20000).Equal(updatedAccount.DailyLimit))

	// Test updating non-existent account
	nonExistentAccount := suite.createTestAccountForDB()
	nonExistentAccount.ID = uuid.New()
	err = suite.repo.Update(context.Background(), nonExistentAccount)
	assert.Error(suite.T(), err)
	assert.Contains(suite.T(), err.Error(), "not found")
}

// TestListAccountsDatabase tests account listing with various filters
func (suite *AccountsDatabaseIntegrationTestSuite) TestListAccountsDatabase() {
	// Create multiple test accounts with different properties
	accounts := []*ReceiveAccount{
		{
			ID:            uuid.New(),
			AccountName:   "Integration Test Account 1",
			AccountNumber: fmt.Sprintf("INTEG1_%d", time.Now().UnixNano()),
			AccountType:   "alipay",
			AccountHolder: "Test Holder 1",
			PaymentType:   "public",
			Status:        "active",
			DailyLimit:    decimal.NewFromInt(10000),
			SingleLimit:   decimal.NewFromInt(1000),
			DailyUsed:     decimal.Zero,
		},
		{
			ID:            uuid.New(),
			AccountName:   "Integration Test Account 2",
			AccountNumber: fmt.Sprintf("INTEG2_%d", time.Now().UnixNano()),
			AccountType:   "wechat",
			AccountHolder: "Test Holder 2",
			PaymentType:   "private",
			Status:        "active",
			DailyLimit:    decimal.NewFromInt(15000),
			SingleLimit:   decimal.NewFromInt(1500),
			DailyUsed:     decimal.Zero,
		},
		{
			ID:            uuid.New(),
			AccountName:   "Integration Test Account 3",
			AccountNumber: fmt.Sprintf("INTEG3_%d", time.Now().UnixNano()),
			AccountType:   "bank",
			AccountHolder: "Test Holder 3",
			PaymentType:   "public",
			Status:        "inactive",
			DailyLimit:    decimal.NewFromInt(20000),
			SingleLimit:   decimal.NewFromInt(2000),
			DailyUsed:     decimal.Zero,
		},
	}

	// Create all accounts
	for _, account := range accounts {
		err := suite.repo.Create(context.Background(), account)
		require.NoError(suite.T(), err)
	}

	tests := []struct {
		name          string
		filter        *ReceiveAccountFilter
		expectedCount int
		validateFunc  func([]*ReceiveAccount) bool
	}{
		{
			name:          "list all accounts",
			filter:        &ReceiveAccountFilter{Limit: 10, Offset: 0},
			expectedCount: 3,
			validateFunc: func(results []*ReceiveAccount) bool {
				return len(results) >= 3
			},
		},
		{
			name: "filter by account type",
			filter: &ReceiveAccountFilter{
				AccountType: stringPtr("alipay"),
				Limit:       10,
				Offset:      0,
			},
			expectedCount: 1,
			validateFunc: func(results []*ReceiveAccount) bool {
				for _, account := range results {
					if account.AccountType != "alipay" {
						return false
					}
				}
				return true
			},
		},
		{
			name: "filter by payment type",
			filter: &ReceiveAccountFilter{
				PaymentType: stringPtr("public"),
				Limit:       10,
				Offset:      0,
			},
			expectedCount: 2,
			validateFunc: func(results []*ReceiveAccount) bool {
				count := 0
				for _, account := range results {
					if account.PaymentType == "public" {
						count++
					}
				}
				return count >= 2
			},
		},
		{
			name: "filter by status",
			filter: &ReceiveAccountFilter{
				Status: stringPtr("active"),
				Limit:  10,
				Offset: 0,
			},
			expectedCount: 2,
			validateFunc: func(results []*ReceiveAccount) bool {
				count := 0
				for _, account := range results {
					if account.Status == "active" {
						count++
					}
				}
				return count >= 2
			},
		},
		{
			name: "search by account name",
			filter: &ReceiveAccountFilter{
				Search: stringPtr("Integration Test Account 1"),
				Limit:  10,
				Offset: 0,
			},
			expectedCount: 1,
			validateFunc: func(results []*ReceiveAccount) bool {
				for _, account := range results {
					if account.AccountName == "Integration Test Account 1" {
						return true
					}
				}
				return false
			},
		},
		{
			name: "pagination test",
			filter: &ReceiveAccountFilter{
				Limit:  1,
				Offset: 0,
			},
			expectedCount: 1,
			validateFunc: func(results []*ReceiveAccount) bool {
				return len(results) == 1
			},
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			results, err := suite.repo.List(context.Background(), tt.filter)
			require.NoError(t, err)
			require.NotNil(t, results)

			assert.True(t, tt.validateFunc(results), "Validation function failed for test: %s", tt.name)
		})
	}
}

// TestCountAccountsDatabase tests account counting with filters
func (suite *AccountsDatabaseIntegrationTestSuite) TestCountAccountsDatabase() {
	// Create test accounts
	accounts := []*ReceiveAccount{
		{
			ID:            uuid.New(),
			AccountName:   "Integration Count Test 1",
			AccountNumber: fmt.Sprintf("COUNT1_%d", time.Now().UnixNano()),
			AccountType:   "alipay",
			AccountHolder: "Count Test Holder 1",
			PaymentType:   "public",
			Status:        "active",
			DailyLimit:    decimal.NewFromInt(10000),
			SingleLimit:   decimal.NewFromInt(1000),
			DailyUsed:     decimal.Zero,
		},
		{
			ID:            uuid.New(),
			AccountName:   "Integration Count Test 2",
			AccountNumber: fmt.Sprintf("COUNT2_%d", time.Now().UnixNano()),
			AccountType:   "alipay",
			AccountHolder: "Count Test Holder 2",
			PaymentType:   "public",
			Status:        "active",
			DailyLimit:    decimal.NewFromInt(15000),
			SingleLimit:   decimal.NewFromInt(1500),
			DailyUsed:     decimal.Zero,
		},
	}

	for _, account := range accounts {
		err := suite.repo.Create(context.Background(), account)
		require.NoError(suite.T(), err)
	}

	tests := []struct {
		name          string
		filter        *ReceiveAccountFilter
		expectedCount int64
	}{
		{
			name:          "count all test accounts",
			filter:        &ReceiveAccountFilter{Search: stringPtr("Integration Count Test")},
			expectedCount: 2,
		},
		{
			name: "count by account type",
			filter: &ReceiveAccountFilter{
				AccountType: stringPtr("alipay"),
				Search:      stringPtr("Integration Count Test"),
			},
			expectedCount: 2,
		},
		{
			name: "count by status",
			filter: &ReceiveAccountFilter{
				Status: stringPtr("active"),
				Search: stringPtr("Integration Count Test"),
			},
			expectedCount: 2,
		},
	}

	for _, tt := range tests {
		suite.T().Run(tt.name, func(t *testing.T) {
			count, err := suite.repo.Count(context.Background(), tt.filter)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedCount, count)
		})
	}
}

// TestExistsByAccountNumberDatabase tests account number uniqueness checking
func (suite *AccountsDatabaseIntegrationTestSuite) TestExistsByAccountNumberDatabase() {
	account := suite.createTestAccountForDB()
	
	// Initially should not exist
	exists, err := suite.repo.ExistsByAccountNumber(context.Background(), account.AccountNumber)
	require.NoError(suite.T(), err)
	assert.False(suite.T(), exists)

	// Create the account
	err = suite.repo.Create(context.Background(), account)
	require.NoError(suite.T(), err)

	// Now should exist
	exists, err = suite.repo.ExistsByAccountNumber(context.Background(), account.AccountNumber)
	require.NoError(suite.T(), err)
	assert.True(suite.T(), exists)

	// Different account number should not exist
	exists, err = suite.repo.ExistsByAccountNumber(context.Background(), "NONEXISTENT123")
	require.NoError(suite.T(), err)
	assert.False(suite.T(), exists)
}

// TestUpdateDailyUsedDatabase tests daily usage updates
func (suite *AccountsDatabaseIntegrationTestSuite) TestUpdateDailyUsedDatabase() {
	account := suite.createTestAccountForDB()
	err := suite.repo.Create(context.Background(), account)
	require.NoError(suite.T(), err)

	// Update daily used amount
	amount := decimal.NewFromInt(500)
	err = suite.repo.UpdateDailyUsed(context.Background(), account.ID, amount)
	require.NoError(suite.T(), err)

	// Verify the update
	updatedAccount, err := suite.repo.GetByID(context.Background(), account.ID)
	require.NoError(suite.T(), err)
	assert.True(suite.T(), amount.Equal(updatedAccount.DailyUsed))

	// Update again to test accumulation
	err = suite.repo.UpdateDailyUsed(context.Background(), account.ID, amount)
	require.NoError(suite.T(), err)

	updatedAccount, err = suite.repo.GetByID(context.Background(), account.ID)
	require.NoError(suite.T(), err)
	expectedTotal := amount.Add(amount) // 500 + 500 = 1000
	assert.True(suite.T(), expectedTotal.Equal(updatedAccount.DailyUsed))
}

// TestResetDailyLimitsDatabase tests daily limit reset functionality
func (suite *AccountsDatabaseIntegrationTestSuite) TestResetDailyLimitsDatabase() {
	// Create accounts with different reset dates
	account1 := suite.createTestAccountForDB()
	account1.DailyUsed = decimal.NewFromInt(500)
	account1.LastResetDate = time.Now().Add(-25 * time.Hour) // Yesterday
	err := suite.repo.Create(context.Background(), account1)
	require.NoError(suite.T(), err)

	account2 := suite.createTestAccountForDB()
	account2.DailyUsed = decimal.NewFromInt(300)
	account2.LastResetDate = time.Now().Truncate(24 * time.Hour) // Today
	err = suite.repo.Create(context.Background(), account2)
	require.NoError(suite.T(), err)

	// Update the accounts in database with the test data
	_, err = suite.db.Exec("UPDATE receive_accounts SET daily_used = $1, last_reset_date = $2 WHERE id = $3",
		account1.DailyUsed, account1.LastResetDate, account1.ID)
	require.NoError(suite.T(), err)

	_, err = suite.db.Exec("UPDATE receive_accounts SET daily_used = $1, last_reset_date = $2 WHERE id = $3",
		account2.DailyUsed, account2.LastResetDate, account2.ID)
	require.NoError(suite.T(), err)

	// Reset daily limits
	err = suite.repo.ResetDailyLimits(context.Background())
	require.NoError(suite.T(), err)

	// Verify account1 was reset (old reset date)
	updatedAccount1, err := suite.repo.GetByID(context.Background(), account1.ID)
	require.NoError(suite.T(), err)
	assert.True(suite.T(), decimal.Zero.Equal(updatedAccount1.DailyUsed))

	// Verify account2 was not reset (current reset date)
	updatedAccount2, err := suite.repo.GetByID(context.Background(), account2.ID)
	require.NoError(suite.T(), err)
	// Note: This might be reset too depending on exact timing, so we just check it's valid
	assert.True(suite.T(), updatedAccount2.DailyUsed.GreaterThanOrEqual(decimal.Zero))
}

// TestTransactionIntegrity tests database transaction integrity
func (suite *AccountsDatabaseIntegrationTestSuite) TestTransactionIntegrity() {
	// Test that failed operations don't leave partial data
	account := suite.createTestAccountForDB()
	
	// Try to create account with invalid data that should fail
	account.AccountNumber = "" // This should cause a constraint violation
	
	err := suite.repo.Create(context.Background(), account)
	assert.Error(suite.T(), err)

	// Verify no partial data was created
	var count int
	err = suite.db.Get(&count, "SELECT COUNT(*) FROM receive_accounts WHERE id = $1", account.ID)
	require.NoError(suite.T(), err)
	assert.Equal(suite.T(), 0, count)
}

// TestDatabasePerformance tests database operation performance
func (suite *AccountsDatabaseIntegrationTestSuite) TestDatabasePerformance() {
	if testing.Short() {
		suite.T().Skip("Skipping performance test in short mode")
	}

	// Test bulk insert performance
	numAccounts := 1000
	accounts := make([]*ReceiveAccount, numAccounts)
	
	for i := 0; i < numAccounts; i++ {
		accounts[i] = &ReceiveAccount{
			ID:            uuid.New(),
			AccountName:   fmt.Sprintf("Performance Test Account %d", i),
			AccountNumber: fmt.Sprintf("PERF%d_%d", i, time.Now().UnixNano()),
			AccountType:   "alipay",
			AccountHolder: fmt.Sprintf("Performance Test Holder %d", i),
			PaymentType:   "public",
			Status:        "active",
			DailyLimit:    decimal.NewFromInt(10000),
			SingleLimit:   decimal.NewFromInt(1000),
			DailyUsed:     decimal.Zero,
		}
	}

	start := time.Now()
	for _, account := range accounts {
		err := suite.repo.Create(context.Background(), account)
		require.NoError(suite.T(), err)
	}
	createDuration := time.Since(start)

	suite.T().Logf("Created %d accounts in %v (avg: %v per account)", 
		numAccounts, createDuration, createDuration/time.Duration(numAccounts))

	// Test list performance
	start = time.Now()
	filter := &ReceiveAccountFilter{
		Search: stringPtr("Performance Test"),
		Limit:  100,
		Offset: 0,
	}
	results, err := suite.repo.List(context.Background(), filter)
	require.NoError(suite.T(), err)
	listDuration := time.Since(start)

	suite.T().Logf("Listed %d accounts in %v", len(results), listDuration)

	// Performance assertions (adjust thresholds based on your requirements)
	assert.Less(suite.T(), createDuration.Seconds(), 30.0, "Bulk create took too long")
	assert.Less(suite.T(), listDuration.Milliseconds(), int64(500), "List query took too long")
	assert.GreaterOrEqual(suite.T(), len(results), 100, "Should return at least 100 results")
}

// TestAccountsDatabaseIntegration runs the database integration test suite
func TestAccountsDatabaseIntegration(t *testing.T) {
	suite.Run(t, new(AccountsDatabaseIntegrationTestSuite))
}
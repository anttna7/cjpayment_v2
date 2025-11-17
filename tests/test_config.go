package tests

import (
	"fmt"
	"log"
	"os"
	"strings"
	"testing"

	"github.com/shopspring/decimal"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"cjpayment/internal/repository"
)

// TestConfig holds configuration for tests
type TestConfig struct {
	DatabaseDSN string
	RedisAddr   string
	TestMode    string
}

// GetTestConfig returns test configuration
func GetTestConfig() *TestConfig {
	return &TestConfig{
		DatabaseDSN: getEnvOrDefault("TEST_DATABASE_DSN", "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"),
		RedisAddr:   getEnvOrDefault("TEST_REDIS_ADDR", "localhost:6379"),
		TestMode:    getEnvOrDefault("TEST_MODE", "unit"),
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// SetupTestDatabase creates and migrates test database
func SetupTestDatabase(config *TestConfig) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(config.DatabaseDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to test database: %w", err)
	}

	// Auto migrate all tables
	err = db.AutoMigrate(
		&repository.Merchant{},
		&repository.ReceiveAccount{},
		&repository.MerchantAccount{},
		&repository.RechargeOrder{},
		&repository.RechargeSession{},
		&repository.AccountMatchingLog{},
		&repository.DataExportLog{},
		&repository.Notification{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to migrate test database: %w", err)
	}

	return db, nil
}

// CleanupTestDatabase cleans up test database
func CleanupTestDatabase(db *gorm.DB) error {
	// Drop all tables in reverse order to handle foreign key constraints
	tables := []string{
		"data_export_logs",
		"account_matching_logs",
		"recharge_sessions",
		"notifications",
		"recharge_orders",
		"merchant_accounts",
		"receive_accounts",
		"merchants",
	}

	for _, table := range tables {
		if err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", table)).Error; err != nil {
			log.Printf("Warning: failed to drop table %s: %v", table, err)
		}
	}

	return nil
}

// TestMain provides setup and teardown for all tests
func TestMain(m *testing.M) {
	config := GetTestConfig()
	
	// Setup test database for integration tests
	if config.TestMode == "integration" || config.TestMode == "all" {
		db, err := SetupTestDatabase(config)
		if err != nil {
			log.Fatalf("Failed to setup test database: %v", err)
		}
		defer func() {
			if err := CleanupTestDatabase(db); err != nil {
				log.Printf("Failed to cleanup test database: %v", err)
			}
			sqlDB, _ := db.DB()
			if sqlDB != nil {
				sqlDB.Close()
			}
		}()
	}

	// Run tests
	code := m.Run()
	
	os.Exit(code)
}

// SkipIfShort skips test if running in short mode
func SkipIfShort(t *testing.T, reason string) {
	if testing.Short() {
		t.Skipf("Skipping %s: %s", t.Name(), reason)
	}
}

// SkipIfNotIntegration skips test if not running integration tests
func SkipIfNotIntegration(t *testing.T) {
	config := GetTestConfig()
	if config.TestMode != "integration" && config.TestMode != "all" {
		t.Skipf("Skipping %s: not running integration tests", t.Name())
	}
}

// CreateTestMerchant creates a test merchant for testing
func CreateTestMerchant(db *gorm.DB, name string) (*repository.Merchant, error) {
	merchant := &repository.Merchant{
		Name:         name,
		ContactName:  "Test Contact",
		ContactPhone: "13800138000",
		Email:        "test@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	
	err := db.Create(merchant).Error
	return merchant, err
}

// CreateTestReceiveAccount creates a test receive account
func CreateTestReceiveAccount(db *gorm.DB, accountType string) (*repository.ReceiveAccount, error) {
	account := &repository.ReceiveAccount{
		AccountName: fmt.Sprintf("Test %s Account", accountType),
		AccountNo:   "1234567890",
		BankName:    "Test Bank",
		AccountType: accountType,
		DailyLimit:  decimal.NewFromFloat(100000.00),
		Status:      "active",
	}
	
	err := db.Create(account).Error
	return account, err
}

// CreateTestMerchantAccount creates a merchant account binding
func CreateTestMerchantAccount(db *gorm.DB, merchantID, accountID uint, priority int) (*repository.MerchantAccount, error) {
	merchantAccount := &repository.MerchantAccount{
		MerchantID:       merchantID,
		ReceiveAccountID: accountID,
		Priority:         priority,
		Status:           "active",
	}
	
	err := db.Create(merchantAccount).Error
	return merchantAccount, err
}

// AssertNoError is a helper for asserting no error
func AssertNoError(t *testing.T, err error, msgAndArgs ...interface{}) {
	if err != nil {
		if len(msgAndArgs) > 0 {
			t.Fatalf("Expected no error, got %v: %v", err, msgAndArgs[0])
		} else {
			t.Fatalf("Expected no error, got %v", err)
		}
	}
}

// AssertError is a helper for asserting an error occurred
func AssertError(t *testing.T, err error, msgAndArgs ...interface{}) {
	if err == nil {
		if len(msgAndArgs) > 0 {
			t.Fatalf("Expected error, got nil: %v", msgAndArgs[0])
		} else {
			t.Fatalf("Expected error, got nil")
		}
	}
}

// AssertEqual is a helper for asserting equality
func AssertEqual(t *testing.T, expected, actual interface{}, msgAndArgs ...interface{}) {
	if expected != actual {
		if len(msgAndArgs) > 0 {
			t.Fatalf("Expected %v, got %v: %v", expected, actual, msgAndArgs[0])
		} else {
			t.Fatalf("Expected %v, got %v", expected, actual)
		}
	}
}

// AssertNotNil is a helper for asserting not nil
func AssertNotNil(t *testing.T, value interface{}, msgAndArgs ...interface{}) {
	if value == nil {
		if len(msgAndArgs) > 0 {
			t.Fatalf("Expected not nil, got nil: %v", msgAndArgs[0])
		} else {
			t.Fatalf("Expected not nil, got nil")
		}
	}
}

// AssertContains is a helper for asserting string contains
func AssertContains(t *testing.T, str, substr string, msgAndArgs ...interface{}) {
	if !strings.Contains(str, substr) {
		if len(msgAndArgs) > 0 {
			t.Fatalf("Expected '%s' to contain '%s': %v", str, substr, msgAndArgs[0])
		} else {
			t.Fatalf("Expected '%s' to contain '%s'", str, substr)
		}
	}
}
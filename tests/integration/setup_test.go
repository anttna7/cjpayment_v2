package integration

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/handler"
	"github.com/company/cjpayment/pkg/database"
	"github.com/company/cjpayment/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/suite"
)

// IntegrationTestSuite provides a test suite for integration tests
type IntegrationTestSuite struct {
	suite.Suite
	DB     *sqlx.DB
	Redis  *redis.Client
	Server *httptest.Server
	Router *gin.Engine
	Config *config.Config
}

// SetupSuite runs once before all tests in the suite
func (suite *IntegrationTestSuite) SetupSuite() {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Load test configuration
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     getEnvOrDefault("TEST_DB_HOST", "localhost"),
			Port:     getEnvOrDefault("TEST_DB_PORT", "5432"),
			User:     getEnvOrDefault("TEST_DB_USER", "cjpayment_test"),
			Password: getEnvOrDefault("TEST_DB_PASSWORD", "test_password"),
			DBName:   getEnvOrDefault("TEST_DB_NAME", "cjpayment_test"),
			SSLMode:  "disable",
		},
		Redis: config.RedisConfig{
			Host:     getEnvOrDefault("TEST_REDIS_HOST", "localhost"),
			Port:     getEnvOrDefault("TEST_REDIS_PORT", "6379"),
			Password: getEnvOrDefault("TEST_REDIS_PASSWORD", ""),
			DB:       0,
		},
		JWT: config.JWTConfig{
			Secret:     "test-secret-key-for-integration-tests",
			Expiration: time.Hour * 24,
		},
		LogLevel: "debug",
	}
	suite.Config = cfg

	// Initialize logger
	logger.Init(cfg.LogLevel)

	// Setup test database
	suite.setupTestDatabase()

	// Setup test Redis
	suite.setupTestRedis()

	// Setup test server
	suite.setupTestServer()
}

// TearDownSuite runs once after all tests in the suite
func (suite *IntegrationTestSuite) TearDownSuite() {
	if suite.Server != nil {
		suite.Server.Close()
	}
	if suite.DB != nil {
		suite.DB.Close()
	}
	if suite.Redis != nil {
		suite.Redis.Close()
	}
}

// SetupTest runs before each test
func (suite *IntegrationTestSuite) SetupTest() {
	// Clean up database tables
	suite.cleanupDatabase()
	
	// Clean up Redis
	suite.cleanupRedis()
}

// TearDownTest runs after each test
func (suite *IntegrationTestSuite) TearDownTest() {
	// Additional cleanup if needed
}

func (suite *IntegrationTestSuite) setupTestDatabase() {
	// Connect to database
	db, err := database.ConnectX(suite.Config.Database)
	suite.Require().NoError(err, "Failed to connect to test database")
	suite.DB = db

	// Run migrations
	suite.runMigrations()
}

func (suite *IntegrationTestSuite) setupTestRedis() {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", suite.Config.Redis.Host, suite.Config.Redis.Port),
		Password: suite.Config.Redis.Password,
		DB:       suite.Config.Redis.DB,
	})

	// Test Redis connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, err := rdb.Ping(ctx).Result()
	suite.Require().NoError(err, "Failed to connect to test Redis")
	
	suite.Redis = rdb
}

func (suite *IntegrationTestSuite) setupTestServer() {
	// Create Gin router
	router := gin.New()
	router.Use(gin.Recovery())
	
	// Initialize handlers
	h := handler.New(suite.DB, suite.Config)
	h.RegisterRoutes(router)
	
	suite.Router = router
	suite.Server = httptest.NewServer(router)
}

func (suite *IntegrationTestSuite) runMigrations() {
	// Create a standard database connection for migrations
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		suite.Config.Database.User,
		suite.Config.Database.Password,
		suite.Config.Database.Host,
		suite.Config.Database.Port,
		suite.Config.Database.DBName,
		suite.Config.Database.SSLMode,
	)

	db, err := sql.Open("postgres", dbURL)
	suite.Require().NoError(err, "Failed to open database for migrations")
	defer db.Close()

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	suite.Require().NoError(err, "Failed to create postgres driver")

	m, err := migrate.NewWithDatabaseInstance(
		"file://../../migrations",
		"postgres", driver)
	suite.Require().NoError(err, "Failed to create migrate instance")

	// Run up migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		suite.Require().NoError(err, "Failed to run migrations")
	}
}

func (suite *IntegrationTestSuite) cleanupDatabase() {
	// Clean up tables in reverse dependency order
	tables := []string{
		"notification_logs",
		"notifications", 
		"order_status_logs",
		"payment_vouchers",
		"recharge_orders",
		"merchant_receive_accounts",
		"rotation_rules",
		"receive_accounts",
		"merchants",
		"user_roles",
		"role_permissions", 
		"permissions",
		"roles",
		"users",
		"webhooks",
		"reports",
		"limit_alerts",
	}

	for _, table := range tables {
		_, err := suite.DB.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", table))
		if err != nil {
			// Log error but don't fail test - table might not exist
			log.Printf("Warning: Failed to truncate table %s: %v", table, err)
		}
	}
}

func (suite *IntegrationTestSuite) cleanupRedis() {
	ctx := context.Background()
	suite.Redis.FlushDB(ctx)
}

// Helper function to get environment variable with default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// TestMain sets up and tears down the test environment
func TestMain(m *testing.M) {
	// Setup code here if needed
	code := m.Run()
	// Teardown code here if needed
	os.Exit(code)
}
package performance

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"runtime"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/handler"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/database"
	"github.com/company/cjpayment/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ConcurrentRechargeTest tests concurrent recharge processing
type ConcurrentRechargeTest struct {
	DB     *sqlx.DB
	Redis  *redis.Client
	Server *httptest.Server
	Router *gin.Engine
	Config *config.Config
}

// TestConcurrentRechargeProcessing tests the system's ability to handle concurrent recharge requests
func TestConcurrentRechargeProcessing(t *testing.T) {
	test := setupPerformanceTest(t)
	defer test.cleanup()

	// Test parameters
	concurrentUsers := 50
	requestsPerUser := 10
	totalRequests := concurrentUsers * requestsPerUser

	// Setup test data
	test.setupTestData(t)

	// Create test users and get tokens
	tokens := test.createTestUsers(t, concurrentUsers)

	// Performance metrics
	var (
		successCount int64
		errorCount   int64
		totalLatency time.Duration
		maxLatency   time.Duration
		minLatency   = time.Hour // Initialize with large value
		mutex        sync.Mutex
	)

	// Channel to collect results
	results := make(chan TestResult, totalRequests)

	// Start time
	startTime := time.Now()

	// Launch concurrent goroutines
	var wg sync.WaitGroup
	for i := 0; i < concurrentUsers; i++ {
		wg.Add(1)
		go func(userIndex int) {
			defer wg.Done()
			token := tokens[userIndex]
			
			for j := 0; j < requestsPerUser; j++ {
				requestStart := time.Now()
				
				// Create recharge request
				rechargeReq := map[string]interface{}{
					"payer_name":     fmt.Sprintf("User%d_Request%d", userIndex, j),
					"payer_account":  fmt.Sprintf("98765432%03d%03d", userIndex, j),
					"payment_type":   "private",
					"amount":         "100.00",
					"merchant_name":  "Performance Test Merchant",
					"ad_account":     fmt.Sprintf("AD%d%d", userIndex, j),
					"remark":         fmt.Sprintf("Performance test %d-%d", userIndex, j),
				}

				resp := test.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
				requestDuration := time.Since(requestStart)

				result := TestResult{
					UserIndex: userIndex,
					RequestIndex: j,
					StatusCode: resp.Code,
					Duration: requestDuration,
					Success: resp.Code == http.StatusCreated,
				}

				results <- result
			}
		}(i)
	}

	// Wait for all requests to complete
	wg.Wait()
	close(results)

	// Collect and analyze results
	var durations []time.Duration
	for result := range results {
		mutex.Lock()
		durations = append(durations, result.Duration)
		totalLatency += result.Duration
		
		if result.Duration > maxLatency {
			maxLatency = result.Duration
		}
		if result.Duration < minLatency {
			minLatency = result.Duration
		}
		
		if result.Success {
			successCount++
		} else {
			errorCount++
		}
		mutex.Unlock()
	}

	totalTime := time.Since(startTime)

	// Calculate statistics
	avgLatency := totalLatency / time.Duration(totalRequests)
	throughput := float64(totalRequests) / totalTime.Seconds()
	successRate := float64(successCount) / float64(totalRequests) * 100

	// Calculate percentiles
	p95Latency := calculatePercentile(durations, 95)
	p99Latency := calculatePercentile(durations, 99)

	// Print performance results
	t.Logf("=== Concurrent Recharge Performance Test Results ===")
	t.Logf("Total Requests: %d", totalRequests)
	t.Logf("Concurrent Users: %d", concurrentUsers)
	t.Logf("Requests per User: %d", requestsPerUser)
	t.Logf("Total Time: %v", totalTime)
	t.Logf("Success Count: %d", successCount)
	t.Logf("Error Count: %d", errorCount)
	t.Logf("Success Rate: %.2f%%", successRate)
	t.Logf("Throughput: %.2f requests/second", throughput)
	t.Logf("Average Latency: %v", avgLatency)
	t.Logf("Min Latency: %v", minLatency)
	t.Logf("Max Latency: %v", maxLatency)
	t.Logf("95th Percentile Latency: %v", p95Latency)
	t.Logf("99th Percentile Latency: %v", p99Latency)

	// Performance assertions
	assert.Greater(t, successRate, 95.0, "Success rate should be above 95%")
	assert.Less(t, avgLatency, 2*time.Second, "Average latency should be under 2 seconds")
	assert.Less(t, p95Latency, 5*time.Second, "95th percentile latency should be under 5 seconds")
	assert.Greater(t, throughput, 10.0, "Throughput should be at least 10 requests/second")

	// Verify data consistency
	test.verifyDataConsistency(t, int(successCount))
}

// TestConcurrentAccountRotation tests account rotation under concurrent load
func TestConcurrentAccountRotation(t *testing.T) {
	test := setupPerformanceTest(t)
	defer test.cleanup()

	// Setup test data with multiple accounts
	merchant := test.createTestMerchant(t, "Rotation Test Merchant", "RTM001")
	
	// Create multiple accounts with different weights
	accounts := []struct {
		name   string
		number string
		weight int
	}{
		{"Account 1", "11111111111", 5},
		{"Account 2", "22222222222", 3},
		{"Account 3", "33333333333", 2},
	}

	for _, acc := range accounts {
		account := test.createTestReceiveAccount(t, acc.name, acc.number, "private")
		test.linkMerchantAccountWithWeight(t, merchant.ID, account.ID, acc.weight)
	}

	// Create test user
	user := test.createTestUser(t, "rotation_user", "rotation@example.com", "password123")
	token := test.loginUser(t, "rotation_user", "password123")

	// Test parameters
	concurrentRequests := 100
	accountUsage := make(map[string]int)
	var mutex sync.Mutex

	// Launch concurrent requests
	var wg sync.WaitGroup
	for i := 0; i < concurrentRequests; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			
			rechargeReq := map[string]interface{}{
				"payer_name":     fmt.Sprintf("Payer%d", index),
				"payer_account":  fmt.Sprintf("9876543210%d", index),
				"payment_type":   "private",
				"amount":         "50.00",
				"merchant_name":  "Rotation Test Merchant",
				"ad_account":     fmt.Sprintf("AD%d", index),
				"remark":         fmt.Sprintf("Rotation test %d", index),
			}

			resp := test.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
			if resp.Code == http.StatusCreated {
				var result map[string]interface{}
				json.Unmarshal(resp.Body.Bytes(), &result)
				
				receiverAccount := result["data"].(map[string]interface{})["receiver_account"].(string)
				
				mutex.Lock()
				accountUsage[receiverAccount]++
				mutex.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// Analyze rotation results
	t.Logf("=== Account Rotation Test Results ===")
	totalAssigned := 0
	for account, count := range accountUsage {
		percentage := float64(count) / float64(concurrentRequests) * 100
		t.Logf("Account %s: %d requests (%.2f%%)", account, count, percentage)
		totalAssigned += count
	}

	// Verify rotation worked correctly
	assert.Equal(t, concurrentRequests, totalAssigned, "All requests should be assigned to accounts")
	assert.Len(t, accountUsage, 3, "All three accounts should be used")
	
	// Verify weighted distribution (account with weight 5 should get more requests)
	maxUsage := 0
	maxAccount := ""
	for account, count := range accountUsage {
		if count > maxUsage {
			maxUsage = count
			maxAccount = account
		}
	}
	
	// Account 1 (weight 5) should get the most requests
	assert.Equal(t, "11111111111", maxAccount, "Account with highest weight should get most requests")
}

// TestDatabasePerformance tests database performance under load
func TestDatabasePerformance(t *testing.T) {
	test := setupPerformanceTest(t)
	defer test.cleanup()

	// Test parameters
	concurrentQueries := 20
	queriesPerConnection := 50
	totalQueries := concurrentQueries * queriesPerConnection

	// Setup test data
	test.setupTestData(t)

	// Performance metrics
	var (
		successCount int64
		errorCount   int64
		totalLatency time.Duration
		mutex        sync.Mutex
	)

	startTime := time.Now()

	// Test different types of database operations
	var wg sync.WaitGroup

	// Test 1: Read operations (SELECT queries)
	wg.Add(1)
	go func() {
		defer wg.Done()
		test.testReadOperations(t, concurrentQueries/2, queriesPerConnection, &successCount, &errorCount, &totalLatency, &mutex)
	}()

	// Test 2: Write operations (INSERT queries)
	wg.Add(1)
	go func() {
		defer wg.Done()
		test.testWriteOperations(t, concurrentQueries/2, queriesPerConnection, &successCount, &errorCount, &totalLatency, &mutex)
	}()

	wg.Wait()

	totalTime := time.Since(startTime)

	// Calculate statistics
	avgLatency := totalLatency / time.Duration(totalQueries)
	throughput := float64(totalQueries) / totalTime.Seconds()
	successRate := float64(successCount) / float64(totalQueries) * 100

	// Print results
	t.Logf("=== Database Performance Test Results ===")
	t.Logf("Total Queries: %d", totalQueries)
	t.Logf("Concurrent Connections: %d", concurrentQueries)
	t.Logf("Total Time: %v", totalTime)
	t.Logf("Success Count: %d", successCount)
	t.Logf("Error Count: %d", errorCount)
	t.Logf("Success Rate: %.2f%%", successRate)
	t.Logf("Throughput: %.2f queries/second", throughput)
	t.Logf("Average Latency: %v", avgLatency)

	// Performance assertions
	assert.Greater(t, successRate, 98.0, "Database success rate should be above 98%")
	assert.Less(t, avgLatency, 100*time.Millisecond, "Average database latency should be under 100ms")
	assert.Greater(t, throughput, 100.0, "Database throughput should be at least 100 queries/second")
}

// TestMemoryUsage tests memory usage under load
func TestMemoryUsage(t *testing.T) {
	test := setupPerformanceTest(t)
	defer test.cleanup()

	// Get initial memory stats
	var initialStats, finalStats runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&initialStats)

	// Setup test data
	test.setupTestData(t)
	tokens := test.createTestUsers(t, 10)

	// Create load
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			token := tokens[index%len(tokens)]
			
			for j := 0; j < 10; j++ {
				rechargeReq := map[string]interface{}{
					"payer_name":     fmt.Sprintf("MemTest%d_%d", index, j),
					"payer_account":  fmt.Sprintf("98765%d%d", index, j),
					"payment_type":   "private",
					"amount":         "100.00",
					"merchant_name":  "Performance Test Merchant",
					"ad_account":     fmt.Sprintf("AD%d%d", index, j),
					"remark":         "Memory test",
				}
				test.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
			}
		}(i)
	}

	wg.Wait()

	// Get final memory stats
	runtime.GC()
	runtime.ReadMemStats(&finalStats)

	// Calculate memory usage
	allocDiff := finalStats.Alloc - initialStats.Alloc
	totalAllocDiff := finalStats.TotalAlloc - initialStats.TotalAlloc
	sysMemDiff := finalStats.Sys - initialStats.Sys

	t.Logf("=== Memory Usage Test Results ===")
	t.Logf("Current Alloc Diff: %d bytes (%.2f MB)", allocDiff, float64(allocDiff)/1024/1024)
	t.Logf("Total Alloc Diff: %d bytes (%.2f MB)", totalAllocDiff, float64(totalAllocDiff)/1024/1024)
	t.Logf("System Memory Diff: %d bytes (%.2f MB)", sysMemDiff, float64(sysMemDiff)/1024/1024)
	t.Logf("GC Runs: %d", finalStats.NumGC-initialStats.NumGC)

	// Memory assertions (adjust thresholds based on your requirements)
	assert.Less(t, allocDiff, uint64(50*1024*1024), "Current allocated memory should not increase by more than 50MB")
	assert.Less(t, sysMemDiff, uint64(100*1024*1024), "System memory should not increase by more than 100MB")
}

// Helper types and methods

type TestResult struct {
	UserIndex    int
	RequestIndex int
	StatusCode   int
	Duration     time.Duration
	Success      bool
}

func setupPerformanceTest(t *testing.T) *ConcurrentRechargeTest {
	gin.SetMode(gin.TestMode)

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
			Password: "",
			DB:       0,
		},
		JWT: config.JWTConfig{
			Secret:     "test-secret-key",
			Expiration: time.Hour * 24,
		},
		LogLevel: "error", // Reduce logging for performance tests
	}

	logger.Init(cfg.LogLevel)

	db, err := database.ConnectX(cfg.Database)
	require.NoError(t, err)

	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		DB:   cfg.Redis.DB,
	})

	router := gin.New()
	h := handler.New(db, cfg)
	h.RegisterRoutes(router)

	server := httptest.NewServer(router)

	return &ConcurrentRechargeTest{
		DB:     db,
		Redis:  rdb,
		Server: server,
		Router: router,
		Config: cfg,
	}
}

func (test *ConcurrentRechargeTest) cleanup() {
	if test.Server != nil {
		test.Server.Close()
	}
	if test.DB != nil {
		test.DB.Close()
	}
	if test.Redis != nil {
		test.Redis.Close()
	}
}

func (test *ConcurrentRechargeTest) setupTestData(t *testing.T) {
	// Create test merchant
	merchant := test.createTestMerchant(t, "Performance Test Merchant", "PTM001")
	
	// Create test account
	account := test.createTestReceiveAccount(t, "Performance Test Account", "12345678901", "private")
	
	// Link merchant and account
	test.linkMerchantAccount(t, merchant.ID, account.ID)
}

func (test *ConcurrentRechargeTest) createTestUsers(t *testing.T, count int) []string {
	tokens := make([]string, count)
	
	for i := 0; i < count; i++ {
		username := fmt.Sprintf("perf_user_%d", i)
		email := fmt.Sprintf("perf%d@example.com", i)
		
		user := test.createTestUser(t, username, email, "password123")
		require.NotNil(t, user)
		
		tokens[i] = test.loginUser(t, username, "password123")
	}
	
	return tokens
}

func (test *ConcurrentRechargeTest) testReadOperations(t *testing.T, connections, queriesPerConnection int, successCount, errorCount *int64, totalLatency *time.Duration, mutex *sync.Mutex) {
	var wg sync.WaitGroup
	
	for i := 0; i < connections; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			for j := 0; j < queriesPerConnection; j++ {
				start := time.Now()
				
				var count int
				err := test.DB.Get(&count, "SELECT COUNT(*) FROM merchants")
				
				duration := time.Since(start)
				
				mutex.Lock()
				*totalLatency += duration
				if err == nil {
					*successCount++
				} else {
					*errorCount++
				}
				mutex.Unlock()
			}
		}()
	}
	
	wg.Wait()
}

func (test *ConcurrentRechargeTest) testWriteOperations(t *testing.T, connections, queriesPerConnection int, successCount, errorCount *int64, totalLatency *time.Duration, mutex *sync.Mutex) {
	var wg sync.WaitGroup
	
	for i := 0; i < connections; i++ {
		wg.Add(1)
		go func(connIndex int) {
			defer wg.Done()
			
			for j := 0; j < queriesPerConnection; j++ {
				start := time.Now()
				
				// Insert a test record
				query := `INSERT INTO merchants (id, name, code, status, created_at, updated_at) 
						  VALUES ($1, $2, $3, 'active', NOW(), NOW())`
				_, err := test.DB.Exec(query, 
					uuid.New().String(),
					fmt.Sprintf("PerfMerchant_%d_%d", connIndex, j),
					fmt.Sprintf("PM%d%d", connIndex, j))
				
				duration := time.Since(start)
				
				mutex.Lock()
				*totalLatency += duration
				if err == nil {
					*successCount++
				} else {
					*errorCount++
				}
				mutex.Unlock()
			}
		}(i)
	}
	
	wg.Wait()
}

func (test *ConcurrentRechargeTest) verifyDataConsistency(t *testing.T, expectedCount int) {
	var actualCount int
	err := test.DB.Get(&actualCount, "SELECT COUNT(*) FROM recharge_orders WHERE status = 'pending'")
	require.NoError(t, err)
	
	assert.Equal(t, expectedCount, actualCount, "Database should contain expected number of recharge orders")
}

// Additional helper methods (similar to integration tests)

func (test *ConcurrentRechargeTest) createTestUser(t *testing.T, username, email, password string) *repository.User {
	user := &repository.User{
		ID:       uuid.New().String(),
		Username: username,
		Email:    email,
		Password: password,
		Status:   "active",
	}

	query := `INSERT INTO users (id, username, email, password, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`
	_, err := test.DB.Exec(query, user.ID, user.Username, user.Email, user.Password, user.Status)
	require.NoError(t, err)

	return user
}

func (test *ConcurrentRechargeTest) createTestMerchant(t *testing.T, name, code string) *repository.Merchant {
	merchant := &repository.Merchant{
		ID:     uuid.New().String(),
		Name:   name,
		Code:   code,
		Status: "active",
	}

	query := `INSERT INTO merchants (id, name, code, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, NOW(), NOW())`
	_, err := test.DB.Exec(query, merchant.ID, merchant.Name, merchant.Code, merchant.Status)
	require.NoError(t, err)

	return merchant
}

func (test *ConcurrentRechargeTest) createTestReceiveAccount(t *testing.T, name, number, paymentType string) *repository.ReceiveAccount {
	account := &repository.ReceiveAccount{
		ID:            uuid.New().String(),
		AccountName:   name,
		AccountNumber: number,
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   paymentType,
		Status:        "active",
		DailyLimit:    decimal.NewFromFloat(100000),
		SingleLimit:   decimal.NewFromFloat(10000),
	}

	query := `INSERT INTO receive_accounts (id, account_name, account_number, account_type, 
			  account_holder, payment_type, status, daily_limit, single_limit, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`
	_, err := test.DB.Exec(query, account.ID, account.AccountName, account.AccountNumber, 
		account.AccountType, account.AccountHolder, account.PaymentType, account.Status,
		account.DailyLimit, account.SingleLimit)
	require.NoError(t, err)

	return account
}

func (test *ConcurrentRechargeTest) linkMerchantAccount(t *testing.T, merchantID, accountID string) {
	test.linkMerchantAccountWithWeight(t, merchantID, accountID, 1)
}

func (test *ConcurrentRechargeTest) linkMerchantAccountWithWeight(t *testing.T, merchantID, accountID string, weight int) {
	query := `INSERT INTO merchant_receive_accounts (id, merchant_id, receive_account_id, weight, is_active, created_at) 
			  VALUES ($1, $2, $3, $4, true, NOW())`
	_, err := test.DB.Exec(query, uuid.New().String(), merchantID, accountID, weight)
	require.NoError(t, err)
}

func (test *ConcurrentRechargeTest) loginUser(t *testing.T, username, password string) string {
	loginReq := map[string]interface{}{
		"username": username,
		"password": password,
	}

	resp := test.makeRequest("POST", "/api/auth/login", loginReq)
	require.Equal(t, http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	require.NoError(t, err)

	return result["data"].(map[string]interface{})["token"].(string)
}

func (test *ConcurrentRechargeTest) makeRequest(method, path string, body interface{}) *httptest.ResponseRecorder {
	var reqBody *bytes.Buffer
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		reqBody = bytes.NewBuffer(jsonBody)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, _ := http.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")

	recorder := httptest.NewRecorder()
	test.Router.ServeHTTP(recorder, req)

	return recorder
}

func (test *ConcurrentRechargeTest) makeAuthenticatedRequest(method, path, token string, body interface{}) *httptest.ResponseRecorder {
	var reqBody *bytes.Buffer
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		reqBody = bytes.NewBuffer(jsonBody)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, _ := http.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	recorder := httptest.NewRecorder()
	test.Router.ServeHTTP(recorder, req)

	return recorder
}

// Utility functions

func calculatePercentile(durations []time.Duration, percentile float64) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	
	// Sort durations
	sort.Slice(durations, func(i, j int) bool {
		return durations[i] < durations[j]
	})
	
	index := int(float64(len(durations)) * percentile / 100.0)
	if index >= len(durations) {
		index = len(durations) - 1
	}
	
	return durations[index]
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
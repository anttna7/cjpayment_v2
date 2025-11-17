package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"cjpayment/internal/handler"
	"cjpayment/internal/repository"
	"cjpayment/internal/service"
)

// RechargeFlowE2ETestSuite defines the end-to-end test suite
type RechargeFlowE2ETestSuite struct {
	suite.Suite
	db                    *gorm.DB
	router                *gin.Engine
	merchantRepo          repository.MerchantRepository
	receiveAccountRepo    repository.ReceiveAccountRepository
	merchantAccountRepo   repository.MerchantAccountRepository
	rechargeOrderRepo     repository.RechargeOrderRepository
	rechargeService       service.RechargeService
	merchantService       service.MerchantService
	accountMatcher        service.AccountMatcher
	ctx                   context.Context
	testMerchant          *repository.Merchant
	testAccounts          []*repository.ReceiveAccount
}

func (suite *RechargeFlowE2ETestSuite) SetupSuite() {
	// Setup test database connection
	dsn := "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	suite.Require().NoError(err)

	suite.db = db
	suite.ctx = context.Background()

	// Auto migrate tables
	err = db.AutoMigrate(
		&repository.Merchant{},
		&repository.ReceiveAccount{},
		&repository.MerchantAccount{},
		&repository.RechargeOrder{},
	)
	suite.Require().NoError(err)

	// Initialize repositories
	suite.merchantRepo = repository.NewMerchantRepository(db)
	suite.receiveAccountRepo = repository.NewReceiveAccountRepository(db)
	suite.merchantAccountRepo = repository.NewMerchantAccountRepository(db)
	suite.rechargeOrderRepo = repository.NewRechargeOrderRepository(db)

	// Initialize services
	suite.accountMatcher = service.NewAccountMatcher(suite.receiveAccountRepo, suite.merchantAccountRepo)
	suite.rechargeService = service.NewRechargeService(suite.rechargeOrderRepo, suite.merchantRepo, suite.accountMatcher)
	suite.merchantService = service.NewMerchantService(suite.merchantRepo)

	// Setup router
	gin.SetMode(gin.TestMode)
	suite.router = gin.New()
	suite.setupRoutes()
}

func (suite *RechargeFlowE2ETestSuite) SetupTest() {
	// Clean up data before each test
	suite.db.Exec("DELETE FROM recharge_orders")
	suite.db.Exec("DELETE FROM merchant_accounts")
	suite.db.Exec("DELETE FROM receive_accounts")
	suite.db.Exec("DELETE FROM merchants")

	// Create test data
	suite.createTestData()
}

func (suite *RechargeFlowE2ETestSuite) TearDownSuite() {
	// Clean up after all tests
	suite.db.Exec("DROP TABLE IF EXISTS recharge_orders")
	suite.db.Exec("DROP TABLE IF EXISTS merchant_accounts")
	suite.db.Exec("DROP TABLE IF EXISTS receive_accounts")
	suite.db.Exec("DROP TABLE IF EXISTS merchants")
	
	sqlDB, err := suite.db.DB()
	if err == nil {
		sqlDB.Close()
	}
}

func (suite *RechargeFlowE2ETestSuite) setupRoutes() {
	rechargeHandler := handler.NewRechargeTestingHandler(suite.rechargeService)
	merchantHandler := handler.NewMerchantHandler(suite.merchantService)

	api := suite.router.Group("/api/v1")
	{
		// Public recharge endpoints
		api.POST("/recharge/orders", rechargeHandler.CreateRechargeOrder)
		api.GET("/recharge/orders/:orderNo", rechargeHandler.GetRechargeOrder)
		api.POST("/recharge/orders/:orderNo/proof", rechargeHandler.UploadPaymentProof)
		
		// Admin endpoints
		admin := api.Group("/admin")
		{
			admin.POST("/merchants", merchantHandler.CreateMerchant)
			admin.GET("/merchants/:id", merchantHandler.GetMerchant)
			admin.GET("/orders", rechargeHandler.ListOrders)
			admin.PUT("/orders/:orderNo/status", rechargeHandler.UpdateOrderStatus)
		}
	}
}

func (suite *RechargeFlowE2ETestSuite) createTestData() {
	// Create test merchant
	suite.testMerchant = &repository.Merchant{
		Name:         "E2E Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	err := suite.merchantRepo.Create(suite.ctx, suite.testMerchant)
	suite.Require().NoError(err)

	// Create test receive accounts
	suite.testAccounts = []*repository.ReceiveAccount{
		{
			AccountName: "Corporate Account 1",
			AccountNo:   "1234567890",
			BankName:    "Test Bank 1",
			AccountType: "corporate",
			DailyLimit:  decimal.NewFromFloat(100000.00),
			Status:      "active",
		},
		{
			AccountName: "Corporate Account 2",
			AccountNo:   "0987654321",
			BankName:    "Test Bank 2",
			AccountType: "corporate",
			DailyLimit:  decimal.NewFromFloat(50000.00),
			Status:      "active",
		},
		{
			AccountName: "Personal Account 1",
			AccountNo:   "1111111111",
			BankName:    "Personal Bank",
			AccountType: "personal",
			DailyLimit:  decimal.NewFromFloat(20000.00),
			Status:      "active",
		},
	}

	for _, account := range suite.testAccounts {
		err := suite.receiveAccountRepo.Create(suite.ctx, account)
		suite.Require().NoError(err)
	}

	// Bind accounts to merchant
	for i, account := range suite.testAccounts {
		merchantAccount := &repository.MerchantAccount{
			MerchantID:       suite.testMerchant.ID,
			ReceiveAccountID: account.ID,
			Priority:         i + 1,
			Status:           "active",
		}
		err := suite.merchantAccountRepo.Create(suite.ctx, merchantAccount)
		suite.Require().NoError(err)
	}
}

func (suite *RechargeFlowE2ETestSuite) TestCompleteRechargeFlow_Corporate_Success() {
	// Step 1: Create recharge order
	createReq := map[string]interface{}{
		"merchant_id":  suite.testMerchant.ID,
		"payer_name":   "John Doe",
		"amount":       "5000.00",
		"ad_account":   "AD123456",
		"payment_type": "corporate",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	// Assert order creation
	suite.Equal(http.StatusCreated, w.Code)
	
	var createResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &createResponse)
	suite.NoError(err)
	
	orderData := createResponse["data"].(map[string]interface{})
	orderNo := orderData["order_no"].(string)
	suite.NotEmpty(orderNo)
	suite.Equal("pending", orderData["status"])
	suite.Equal(float64(suite.testAccounts[0].ID), orderData["receive_account_id"]) // Should match first corporate account

	// Step 2: Get order details
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/v1/recharge/orders/%s", orderNo), nil)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusOK, w.Code)
	
	var getResponse map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &getResponse)
	suite.NoError(err)
	
	orderData = getResponse["data"].(map[string]interface{})
	suite.Equal(orderNo, orderData["order_no"])
	suite.Equal("John Doe", orderData["payer_name"])
	suite.Equal("5000", orderData["amount"])

	// Step 3: Upload payment proof
	proofReq := map[string]interface{}{
		"proof_url": "https://example.com/proof.jpg",
	}

	jsonBody, _ = json.Marshal(proofReq)
	req = httptest.NewRequest("POST", fmt.Sprintf("/api/v1/recharge/orders/%s/proof", orderNo), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusOK, w.Code)

	// Step 4: Admin updates order status
	statusReq := map[string]interface{}{
		"status": "paid",
		"remark": "Payment confirmed by admin",
	}

	jsonBody, _ = json.Marshal(statusReq)
	req = httptest.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/orders/%s/status", orderNo), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusOK, w.Code)

	// Step 5: Verify final order state
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/v1/recharge/orders/%s", orderNo), nil)
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusOK, w.Code)
	
	err = json.Unmarshal(w.Body.Bytes(), &getResponse)
	suite.NoError(err)
	
	finalOrderData := getResponse["data"].(map[string]interface{})
	suite.Equal("paid", finalOrderData["status"])
	suite.Equal("https://example.com/proof.jpg", finalOrderData["payment_proof"])
	suite.Equal("Payment confirmed by admin", finalOrderData["remark"])
}

func (suite *RechargeFlowE2ETestSuite) TestCompleteRechargeFlow_Personal_Success() {
	// Test personal payment type flow
	createReq := map[string]interface{}{
		"merchant_id":  suite.testMerchant.ID,
		"payer_name":   "Jane Smith",
		"amount":       "2000.00",
		"ad_account":   "AD789012",
		"payment_type": "personal",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusCreated, w.Code)
	
	var createResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &createResponse)
	suite.NoError(err)
	
	orderData := createResponse["data"].(map[string]interface{})
	suite.Equal(float64(suite.testAccounts[2].ID), orderData["receive_account_id"]) // Should match personal account
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_AccountLimitExceeded() {
	// First, create an order that uses most of the account limit
	largeOrder := &repository.RechargeOrder{
		OrderNo:          "RO20240812999",
		MerchantID:       suite.testMerchant.ID,
		PayerName:        "Large Order",
		Amount:           decimal.NewFromFloat(95000.00), // Close to limit
		AdAccount:        "AD999999",
		PaymentType:      "corporate",
		ReceiveAccountID: suite.testAccounts[0].ID,
		Status:           "completed",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	err := suite.rechargeOrderRepo.Create(suite.ctx, largeOrder)
	suite.Require().NoError(err)

	// Now try to create another order that would exceed the limit
	createReq := map[string]interface{}{
		"merchant_id":  suite.testMerchant.ID,
		"payer_name":   "Exceeding Order",
		"amount":       "10000.00", // Would exceed first account limit
		"ad_account":   "AD888888",
		"payment_type": "corporate",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusCreated, w.Code)
	
	var createResponse map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &createResponse)
	suite.NoError(err)
	
	orderData := createResponse["data"].(map[string]interface{})
	// Should fallback to second corporate account
	suite.Equal(float64(suite.testAccounts[1].ID), orderData["receive_account_id"])
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_NoAvailableAccount() {
	// Create orders that exhaust all corporate accounts
	for i, account := range suite.testAccounts {
		if account.AccountType == "corporate" {
			exhaustOrder := &repository.RechargeOrder{
				OrderNo:          fmt.Sprintf("RO2024081299%d", i),
				MerchantID:       suite.testMerchant.ID,
				PayerName:        fmt.Sprintf("Exhaust Order %d", i),
				Amount:           account.DailyLimit, // Use full limit
				AdAccount:        fmt.Sprintf("AD99999%d", i),
				PaymentType:      "corporate",
				ReceiveAccountID: account.ID,
				Status:           "completed",
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			}
			err := suite.rechargeOrderRepo.Create(suite.ctx, exhaustOrder)
			suite.Require().NoError(err)
		}
	}

	// Now try to create another corporate order
	createReq := map[string]interface{}{
		"merchant_id":  suite.testMerchant.ID,
		"payer_name":   "No Account Order",
		"amount":       "1000.00",
		"ad_account":   "AD777777",
		"payment_type": "corporate",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusBadRequest, w.Code)
	
	var errorResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &errorResponse)
	suite.NoError(err)
	
	errorMsg := errorResponse["error"].(map[string]interface{})["message"].(string)
	suite.Contains(errorMsg, "no available account")
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_InvalidMerchant() {
	createReq := map[string]interface{}{
		"merchant_id":  999, // Non-existent merchant
		"payer_name":   "Invalid Merchant Order",
		"amount":       "1000.00",
		"ad_account":   "AD666666",
		"payment_type": "corporate",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)

	suite.Equal(http.StatusNotFound, w.Code)
	
	var errorResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &errorResponse)
	suite.NoError(err)
	
	errorMsg := errorResponse["error"].(map[string]interface{})["message"].(string)
	suite.Contains(errorMsg, "merchant not found")
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_OrderStatusTransitions() {
	// Create order
	createReq := map[string]interface{}{
		"merchant_id":  suite.testMerchant.ID,
		"payer_name":   "Status Test Order",
		"amount":       "1000.00",
		"ad_account":   "AD555555",
		"payment_type": "corporate",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusCreated, w.Code)

	var createResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &createResponse)
	suite.NoError(err)
	orderNo := createResponse["data"].(map[string]interface{})["order_no"].(string)

	// Test valid status transitions
	validTransitions := []struct {
		status string
		remark string
	}{
		{"paid", "Payment received"},
		{"confirmed", "Payment confirmed"},
		{"completed", "Order completed"},
	}

	for _, transition := range validTransitions {
		statusReq := map[string]interface{}{
			"status": transition.status,
			"remark": transition.remark,
		}

		jsonBody, _ = json.Marshal(statusReq)
		req = httptest.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/orders/%s/status", orderNo), bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()

		suite.router.ServeHTTP(w, req)
		suite.Equal(http.StatusOK, w.Code, fmt.Sprintf("Failed to transition to %s", transition.status))
	}

	// Test invalid transition (completed -> pending)
	statusReq := map[string]interface{}{
		"status": "pending",
		"remark": "Invalid transition",
	}

	jsonBody, _ = json.Marshal(statusReq)
	req = httptest.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/orders/%s/status", orderNo), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusBadRequest, w.Code)
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_ConcurrentOrders() {
	// Test concurrent order creation
	concurrency := 10
	results := make(chan int, concurrency)

	for i := 0; i < concurrency; i++ {
		go func(index int) {
			createReq := map[string]interface{}{
				"merchant_id":  suite.testMerchant.ID,
				"payer_name":   fmt.Sprintf("Concurrent Order %d", index),
				"amount":       "1000.00",
				"ad_account":   fmt.Sprintf("AD44444%d", index),
				"payment_type": "corporate",
			}

			jsonBody, _ := json.Marshal(createReq)
			req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			suite.router.ServeHTTP(w, req)
			results <- w.Code
		}(i)
	}

	// Collect results
	successCount := 0
	for i := 0; i < concurrency; i++ {
		statusCode := <-results
		if statusCode == http.StatusCreated {
			successCount++
		}
	}

	// All concurrent orders should succeed
	suite.Equal(concurrency, successCount)

	// Verify all orders were created
	req := httptest.NewRequest("GET", "/api/v1/admin/orders?page=1&page_size=20", nil)
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusOK, w.Code)

	var listResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &listResponse)
	suite.NoError(err)

	data := listResponse["data"].(map[string]interface{})
	total := data["total"].(float64)
	suite.GreaterOrEqual(int(total), concurrency)
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_DataConsistency() {
	// Create order
	createReq := map[string]interface{}{
		"merchant_id":  suite.testMerchant.ID,
		"payer_name":   "Consistency Test",
		"amount":       "3000.00",
		"ad_account":   "AD333333",
		"payment_type": "corporate",
	}

	jsonBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusCreated, w.Code)

	var createResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &createResponse)
	suite.NoError(err)
	orderNo := createResponse["data"].(map[string]interface{})["order_no"].(string)

	// Verify data consistency across different endpoints
	// 1. Get order directly
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/v1/recharge/orders/%s", orderNo), nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusOK, w.Code)

	var directResponse map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &directResponse)
	suite.NoError(err)
	directOrder := directResponse["data"].(map[string]interface{})

	// 2. Get order from list
	req = httptest.NewRequest("GET", fmt.Sprintf("/api/v1/admin/orders?search=%s", orderNo), nil)
	w = httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusOK, w.Code)

	var listResponse map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &listResponse)
	suite.NoError(err)
	
	data := listResponse["data"].(map[string]interface{})
	orders := data["orders"].([]interface{})
	suite.Len(orders, 1)
	listOrder := orders[0].(map[string]interface{})

	// Verify consistency
	suite.Equal(directOrder["order_no"], listOrder["order_no"])
	suite.Equal(directOrder["payer_name"], listOrder["payer_name"])
	suite.Equal(directOrder["amount"], listOrder["amount"])
	suite.Equal(directOrder["status"], listOrder["status"])
}

func (suite *RechargeFlowE2ETestSuite) TestRechargeFlow_ErrorRecovery() {
	// Test system behavior during simulated failures
	
	// 1. Test database transaction rollback
	// This would require injecting failures, which is complex in integration tests
	// For now, we'll test basic error scenarios
	
	// Test with invalid JSON
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusBadRequest, w.Code)

	// Test with missing required fields
	incompleteReq := map[string]interface{}{
		"merchant_id": suite.testMerchant.ID,
		// Missing other required fields
	}

	jsonBody, _ := json.Marshal(incompleteReq)
	req = httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()

	suite.router.ServeHTTP(w, req)
	suite.Equal(http.StatusBadRequest, w.Code)
}

// Run the end-to-end test suite
func TestRechargeFlowE2ETestSuite(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping end-to-end integration tests")
	}

	suite.Run(t, new(RechargeFlowE2ETestSuite))
}

// Performance test for complete flow
func TestRechargeFlow_Performance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test")
	}

	// This would be similar to the E2E setup but focused on performance metrics
	// Measuring end-to-end latency, throughput, etc.
	
	suite := new(RechargeFlowE2ETestSuite)
	suite.SetupSuite()
	defer suite.TearDownSuite()
	suite.SetupTest()

	// Measure complete flow performance
	iterations := 100
	start := time.Now()

	for i := 0; i < iterations; i++ {
		createReq := map[string]interface{}{
			"merchant_id":  suite.testMerchant.ID,
			"payer_name":   fmt.Sprintf("Perf Test %d", i),
			"amount":       "1000.00",
			"ad_account":   fmt.Sprintf("AD%06d", i),
			"payment_type": "corporate",
		}

		jsonBody, _ := json.Marshal(createReq)
		req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		suite.router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)
	}

	duration := time.Since(start)
	ordersPerSecond := float64(iterations) / duration.Seconds()
	avgLatency := duration / time.Duration(iterations)

	t.Logf("Performance Results:")
	t.Logf("  Orders: %d", iterations)
	t.Logf("  Duration: %v", duration)
	t.Logf("  Orders/sec: %.2f", ordersPerSecond)
	t.Logf("  Avg Latency: %v", avgLatency)

	// Performance assertions
	assert.Greater(t, ordersPerSecond, 50.0, "Should handle at least 50 orders per second")
	assert.Less(t, avgLatency, 100*time.Millisecond, "Average latency should be less than 100ms")
}
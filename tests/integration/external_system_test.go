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

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

// ExternalSystemTestSuite tests integration with external systems
type ExternalSystemTestSuite struct {
	IntegrationTestSuite
	MockAdServer    *httptest.Server
	MockBankServer  *httptest.Server
	MockPaymentServer *httptest.Server
}

// TestExternalSystemTestSuite runs the external system test suite
func TestExternalSystemTestSuite(t *testing.T) {
	suite.Run(t, new(ExternalSystemTestSuite))
}

// SetupSuite sets up mock external servers
func (suite *ExternalSystemTestSuite) SetupSuite() {
	suite.IntegrationTestSuite.SetupSuite()
	suite.setupMockServers()
}

// TearDownSuite tears down mock external servers
func (suite *ExternalSystemTestSuite) TearDownSuite() {
	if suite.MockAdServer != nil {
		suite.MockAdServer.Close()
	}
	if suite.MockBankServer != nil {
		suite.MockBankServer.Close()
	}
	if suite.MockPaymentServer != nil {
		suite.MockPaymentServer.Close()
	}
	suite.IntegrationTestSuite.TearDownSuite()
}

// TestWebhookNotificationToAdSystem tests webhook notifications to ad system
func (suite *ExternalSystemTestSuite) TestWebhookNotificationToAdSystem() {
	// Step 1: Register webhook for ad system
	webhookReq := map[string]interface{}{
		"url":    suite.MockAdServer.URL + "/webhook/recharge",
		"events": []string{"recharge.completed", "recharge.failed"},
		"secret": "webhook-secret-key",
	}

	user := suite.createTestUser("webhook_user", "webhook@example.com", "password123")
	token := suite.loginUser("webhook_user", "password123")

	resp := suite.makeAuthenticatedRequest("POST", "/api/webhooks", token, webhookReq)
	suite.Equal(http.StatusCreated, resp.Code)

	// Step 2: Create test data
	merchant := suite.createTestMerchant("Webhook Merchant", "WM001")
	account := suite.createTestReceiveAccount("Webhook Account", "12345678901", "private")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	// Step 3: Create and complete a recharge order
	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "98765432109",
		"payment_type":   "private",
		"amount":         "1000.00",
		"merchant_name":  "Webhook Merchant",
		"ad_account":     "AD123456",
		"remark":         "Test webhook notification",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	suite.Equal(http.StatusCreated, orderResp.Code)

	var orderResult map[string]interface{}
	err := json.Unmarshal(orderResp.Body.Bytes(), &orderResult)
	suite.NoError(err)

	orderID := orderResult["data"].(map[string]interface{})["id"].(string)

	// Step 4: Upload voucher and approve
	voucherReq := map[string]interface{}{
		"order_id":     orderID,
		"voucher_url":  "https://example.com/voucher.jpg",
		"voucher_type": "image",
	}

	suite.makeAuthenticatedRequest("POST", "/api/recharge/upload-voucher", token, voucherReq)

	auditReq := map[string]interface{}{
		"order_id": orderID,
		"action":   "approve",
		"remark":   "Payment verified",
	}

	suite.makeAuthenticatedRequest("POST", "/api/recharge/audit", token, auditReq)

	// Step 5: Wait for webhook notification and verify
	time.Sleep(2 * time.Second) // Allow time for async notification

	// Check that webhook was called
	suite.True(suite.webhookReceived, "Webhook should have been called")
	suite.Equal("recharge.completed", suite.lastWebhookEvent, "Should receive completed event")
}

// TestBankCallbackIntegration tests bank callback integration
func (suite *ExternalSystemTestSuite) TestBankCallbackIntegration() {
	// Step 1: Create test data
	user := suite.createTestUser("bank_user", "bank@example.com", "password123")
	merchant := suite.createTestMerchant("Bank Merchant", "BM001")
	account := suite.createTestReceiveAccount("Bank Account", "1234567890123456", "public")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	token := suite.loginUser("bank_user", "password123")

	// Step 2: Create public recharge order
	rechargeReq := map[string]interface{}{
		"payer_name":     "Company ABC",
		"payer_account":  "9876543210987654",
		"payment_type":   "public",
		"amount":         "5000.00",
		"merchant_name":  "Bank Merchant",
		"ad_account":     "AD789012",
		"remark":         "Test bank callback",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	suite.Equal(http.StatusCreated, orderResp.Code)

	var orderResult map[string]interface{}
	err := json.Unmarshal(orderResp.Body.Bytes(), &orderResult)
	suite.NoError(err)

	orderID := orderResult["data"].(map[string]interface{})["id"].(string)

	// Step 3: Simulate successful bank callback
	callbackReq := map[string]interface{}{
		"order_id":        orderID,
		"transaction_id":  "TXN" + uuid.New().String()[:8],
		"amount":          "5000.00",
		"status":          "success",
		"bank_reference":  "BANK" + uuid.New().String()[:8],
		"callback_time":   time.Now().Format(time.RFC3339),
		"signature":       "mock-signature",
	}

	callbackResp := suite.makeRequest("POST", "/api/webhook/bank-callback", callbackReq)
	suite.Equal(http.StatusOK, callbackResp.Code)

	// Step 4: Verify order status is updated
	statusResp := suite.makeAuthenticatedRequest("GET", fmt.Sprintf("/api/recharge/%s", orderID), token, nil)
	suite.Equal(http.StatusOK, statusResp.Code)

	var statusResult map[string]interface{}
	err = json.Unmarshal(statusResp.Body.Bytes(), &statusResult)
	suite.NoError(err)

	status := statusResult["data"].(map[string]interface{})["status"].(string)
	suite.Equal("completed", status)
}

// TestThirdPartyPaymentIntegration tests third-party payment integration
func (suite *ExternalSystemTestSuite) TestThirdPartyPaymentIntegration() {
	// Step 1: Create test data
	user := suite.createTestUser("payment_user", "payment@example.com", "password123")
	merchant := suite.createTestMerchant("Payment Merchant", "PM001")
	account := suite.createTestReceiveAccount("Alipay Account", "alipay@example.com", "private")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	token := suite.loginUser("payment_user", "password123")

	// Step 2: Create recharge order with third-party payment
	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "john.doe@email.com",
		"payment_type":   "private",
		"payment_method": "alipay",
		"amount":         "500.00",
		"merchant_name":  "Payment Merchant",
		"ad_account":     "AD345678",
		"remark":         "Test third-party payment",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	suite.Equal(http.StatusCreated, orderResp.Code)

	var orderResult map[string]interface{}
	err := json.Unmarshal(orderResp.Body.Bytes(), &orderResult)
	suite.NoError(err)

	orderID := orderResult["data"].(map[string]interface{})["id"].(string)

	// Step 3: Simulate third-party payment callback
	paymentCallbackReq := map[string]interface{}{
		"order_id":       orderID,
		"trade_no":       "ALIPAY" + uuid.New().String()[:8],
		"amount":         "500.00",
		"status":         "TRADE_SUCCESS",
		"notify_time":    time.Now().Format("2006-01-02 15:04:05"),
		"sign":           "mock-alipay-signature",
	}

	callbackResp := suite.makeRequest("POST", "/api/webhook/alipay-callback", paymentCallbackReq)
	suite.Equal(http.StatusOK, callbackResp.Code)

	// Step 4: Verify order status is updated
	statusResp := suite.makeAuthenticatedRequest("GET", fmt.Sprintf("/api/recharge/%s", orderID), token, nil)
	suite.Equal(http.StatusOK, statusResp.Code)

	var statusResult map[string]interface{}
	err = json.Unmarshal(statusResp.Body.Bytes(), &statusResult)
	suite.NoError(err)

	status := statusResult["data"].(map[string]interface{})["status"].(string)
	suite.Equal("completed", status)
}

// TestNotificationRetryMechanism tests notification retry mechanism
func (suite *ExternalSystemTestSuite) TestNotificationRetryMechanism() {
	// Step 1: Setup failing webhook endpoint
	failingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer failingServer.Close()

	// Step 2: Register webhook
	webhookReq := map[string]interface{}{
		"url":    failingServer.URL + "/webhook/recharge",
		"events": []string{"recharge.completed"},
		"secret": "webhook-secret-key",
	}

	user := suite.createTestUser("retry_user", "retry@example.com", "password123")
	token := suite.loginUser("retry_user", "password123")

	suite.makeAuthenticatedRequest("POST", "/api/webhooks", token, webhookReq)

	// Step 3: Create and complete recharge order
	merchant := suite.createTestMerchant("Retry Merchant", "RM001")
	account := suite.createTestReceiveAccount("Retry Account", "12345678901", "private")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "98765432109",
		"payment_type":   "private",
		"amount":         "1000.00",
		"merchant_name":  "Retry Merchant",
		"ad_account":     "AD123456",
		"remark":         "Test retry mechanism",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	orderResult := suite.parseResponse(orderResp)
	orderID := orderResult["data"].(map[string]interface{})["id"].(string)

	// Complete the order
	voucherReq := map[string]interface{}{
		"order_id":     orderID,
		"voucher_url":  "https://example.com/voucher.jpg",
		"voucher_type": "image",
	}
	suite.makeAuthenticatedRequest("POST", "/api/recharge/upload-voucher", token, voucherReq)

	auditReq := map[string]interface{}{
		"order_id": orderID,
		"action":   "approve",
		"remark":   "Payment verified",
	}
	suite.makeAuthenticatedRequest("POST", "/api/recharge/audit", token, auditReq)

	// Step 4: Wait and check that retry attempts were made
	time.Sleep(5 * time.Second)

	// Check notification logs for retry attempts
	logsResp := suite.makeAuthenticatedRequest("GET", "/api/notifications/logs", token, nil)
	suite.Equal(http.StatusOK, logsResp.Code)

	logsResult := suite.parseResponse(logsResp)
	logs := logsResult["data"].([]interface{})
	
	// Should have multiple retry attempts
	retryCount := 0
	for _, log := range logs {
		logMap := log.(map[string]interface{})
		if logMap["status"].(string) == "failed" {
			retryCount++
		}
	}
	
	suite.Greater(retryCount, 0, "Should have retry attempts for failed notifications")
}

// TestExternalSystemTimeout tests handling of external system timeouts
func (suite *ExternalSystemTestSuite) TestExternalSystemTimeout() {
	// Step 1: Setup slow responding server
	slowServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(10 * time.Second) // Simulate timeout
		w.WriteHeader(http.StatusOK)
	}))
	defer slowServer.Close()

	// Step 2: Register webhook with slow server
	webhookReq := map[string]interface{}{
		"url":    slowServer.URL + "/webhook/recharge",
		"events": []string{"recharge.completed"},
		"secret": "webhook-secret-key",
	}

	user := suite.createTestUser("timeout_user", "timeout@example.com", "password123")
	token := suite.loginUser("timeout_user", "password123")

	suite.makeAuthenticatedRequest("POST", "/api/webhooks", token, webhookReq)

	// Step 3: Create and complete recharge order
	merchant := suite.createTestMerchant("Timeout Merchant", "TOM001")
	account := suite.createTestReceiveAccount("Timeout Account", "12345678901", "private")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "98765432109",
		"payment_type":   "private",
		"amount":         "1000.00",
		"merchant_name":  "Timeout Merchant",
		"ad_account":     "AD123456",
		"remark":         "Test timeout handling",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	orderResult := suite.parseResponse(orderResp)
	orderID := orderResult["data"].(map[string]interface{})["id"].(string)

	// Complete the order
	voucherReq := map[string]interface{}{
		"order_id":     orderID,
		"voucher_url":  "https://example.com/voucher.jpg",
		"voucher_type": "image",
	}
	suite.makeAuthenticatedRequest("POST", "/api/recharge/upload-voucher", token, voucherReq)

	auditReq := map[string]interface{}{
		"order_id": orderID,
		"action":   "approve",
		"remark":   "Payment verified",
	}
	suite.makeAuthenticatedRequest("POST", "/api/recharge/audit", token, auditReq)

	// Step 4: Check that timeout was handled gracefully
	time.Sleep(3 * time.Second)

	logsResp := suite.makeAuthenticatedRequest("GET", "/api/notifications/logs", token, nil)
	suite.Equal(http.StatusOK, logsResp.Code)

	logsResult := suite.parseResponse(logsResp)
	logs := logsResult["data"].([]interface{})
	
	// Should have timeout error logged
	timeoutFound := false
	for _, log := range logs {
		logMap := log.(map[string]interface{})
		if logMap["status"].(string) == "failed" {
			errorMsg := logMap["error_message"].(string)
			if fmt.Sprintf("%v", errorMsg) != "<nil>" && len(errorMsg) > 0 {
				timeoutFound = true
				break
			}
		}
	}
	
	suite.True(timeoutFound, "Should log timeout errors")
}

// TestRedisIntegration tests Redis integration for caching and queuing
func (suite *ExternalSystemTestSuite) TestRedisIntegration() {
	ctx := context.Background()

	// Step 1: Test Redis connection
	pong, err := suite.Redis.Ping(ctx).Result()
	suite.NoError(err)
	suite.Equal("PONG", pong)

	// Step 2: Test caching functionality
	testKey := "test:cache:key"
	testValue := "test-cache-value"

	err = suite.Redis.Set(ctx, testKey, testValue, time.Minute).Err()
	suite.NoError(err)

	cachedValue, err := suite.Redis.Get(ctx, testKey).Result()
	suite.NoError(err)
	suite.Equal(testValue, cachedValue)

	// Step 3: Test pub/sub for notifications
	pubsub := suite.Redis.Subscribe(ctx, "notifications")
	defer pubsub.Close()

	// Publish a test message
	testMessage := map[string]interface{}{
		"type":     "recharge.completed",
		"order_id": uuid.New().String(),
		"amount":   "1000.00",
	}

	messageJSON, _ := json.Marshal(testMessage)
	err = suite.Redis.Publish(ctx, "notifications", messageJSON).Err()
	suite.NoError(err)

	// Receive the message
	msg, err := pubsub.ReceiveTimeout(ctx, 5*time.Second)
	suite.NoError(err)

	message, ok := msg.(*redis.Message)
	suite.True(ok)
	suite.Equal("notifications", message.Channel)

	var receivedMessage map[string]interface{}
	err = json.Unmarshal([]byte(message.Payload), &receivedMessage)
	suite.NoError(err)
	suite.Equal("recharge.completed", receivedMessage["type"])
}

// Mock server setup and helper methods

func (suite *ExternalSystemTestSuite) setupMockServers() {
	// Mock Ad System Server
	suite.MockAdServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/webhook/recharge" {
			suite.handleAdSystemWebhook(w, r)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))

	// Mock Bank Server
	suite.MockBankServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/transfer" {
			suite.handleBankTransfer(w, r)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))

	// Mock Payment Server
	suite.MockPaymentServer = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/pay" {
			suite.handlePaymentRequest(w, r)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

var (
	webhookReceived   bool
	lastWebhookEvent  string
)

func (suite *ExternalSystemTestSuite) handleAdSystemWebhook(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	json.NewDecoder(r.Body).Decode(&payload)
	
	suite.webhookReceived = true
	if event, ok := payload["event"].(string); ok {
		suite.lastWebhookEvent = event
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "received"})
}

func (suite *ExternalSystemTestSuite) handleBankTransfer(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	json.NewDecoder(r.Body).Decode(&payload)
	
	response := map[string]interface{}{
		"status":           "success",
		"transaction_id":   "BANK" + uuid.New().String()[:8],
		"reference_number": "REF" + uuid.New().String()[:8],
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (suite *ExternalSystemTestSuite) handlePaymentRequest(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	json.NewDecoder(r.Body).Decode(&payload)
	
	response := map[string]interface{}{
		"status":    "success",
		"trade_no":  "PAY" + uuid.New().String()[:8],
		"pay_url":   suite.MockPaymentServer.URL + "/pay/redirect",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (suite *ExternalSystemTestSuite) parseResponse(resp *httptest.ResponseRecorder) map[string]interface{} {
	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	suite.NoError(err)
	return result
}

// Helper methods (reusing from other test files)

func (suite *ExternalSystemTestSuite) createTestUser(username, email, password string) *repository.User {
	user := &repository.User{
		ID:       uuid.New().String(),
		Username: username,
		Email:    email,
		Password: password,
		Status:   "active",
	}

	query := `INSERT INTO users (id, username, email, password, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`
	_, err := suite.DB.Exec(query, user.ID, user.Username, user.Email, user.Password, user.Status)
	suite.NoError(err)

	return user
}

func (suite *ExternalSystemTestSuite) createTestMerchant(name, code string) *repository.Merchant {
	merchant := &repository.Merchant{
		ID:     uuid.New().String(),
		Name:   name,
		Code:   code,
		Status: "active",
	}

	query := `INSERT INTO merchants (id, name, code, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, NOW(), NOW())`
	_, err := suite.DB.Exec(query, merchant.ID, merchant.Name, merchant.Code, merchant.Status)
	suite.NoError(err)

	return merchant
}

func (suite *ExternalSystemTestSuite) createTestReceiveAccount(name, number, paymentType string) *repository.ReceiveAccount {
	account := &repository.ReceiveAccount{
		ID:            uuid.New().String(),
		AccountName:   name,
		AccountNumber: number,
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   paymentType,
		Status:        "active",
	}

	query := `INSERT INTO receive_accounts (id, account_name, account_number, account_type, 
			  account_holder, payment_type, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`
	_, err := suite.DB.Exec(query, account.ID, account.AccountName, account.AccountNumber, 
		account.AccountType, account.AccountHolder, account.PaymentType, account.Status)
	suite.NoError(err)

	return account
}

func (suite *ExternalSystemTestSuite) linkMerchantAccount(merchantID, accountID string) {
	query := `INSERT INTO merchant_receive_accounts (id, merchant_id, receive_account_id, weight, is_active, created_at) 
			  VALUES ($1, $2, $3, 1, true, NOW())`
	_, err := suite.DB.Exec(query, uuid.New().String(), merchantID, accountID)
	suite.NoError(err)
}

func (suite *ExternalSystemTestSuite) loginUser(username, password string) string {
	loginReq := map[string]interface{}{
		"username": username,
		"password": password,
	}

	resp := suite.makeRequest("POST", "/api/auth/login", loginReq)
	suite.Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	suite.NoError(err)

	return result["data"].(map[string]interface{})["token"].(string)
}
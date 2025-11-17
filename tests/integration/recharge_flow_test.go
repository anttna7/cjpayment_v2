package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/suite"
)

// RechargeFlowTestSuite tests the complete recharge flow
type RechargeFlowTestSuite struct {
	IntegrationTestSuite
}

// TestRechargeFlowTestSuite runs the recharge flow test suite
func TestRechargeFlowTestSuite(t *testing.T) {
	suite.Run(t, new(RechargeFlowTestSuite))
}

// TestPrivateRechargeEndToEnd tests the complete private recharge flow
func (suite *RechargeFlowTestSuite) TestPrivateRechargeEndToEnd() {
	// Step 1: Create test data
	user := suite.createTestUser("test_user", "test@example.com", "password123")
	merchant := suite.createTestMerchant("Test Merchant", "TM001")
	account := suite.createTestReceiveAccount("Test Account", "12345678901", "private")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	// Step 2: Login and get JWT token
	token := suite.loginUser("test_user", "password123")

	// Step 3: Create recharge order
	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "98765432109",
		"payment_type":   "private",
		"amount":         "1000.00",
		"merchant_name":  "Test Merchant",
		"ad_account":     "AD123456",
		"remark":         "Test recharge",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	suite.Equal(http.StatusCreated, orderResp.Code)

	var orderResult map[string]interface{}
	err := json.Unmarshal(orderResp.Body.Bytes(), &orderResult)
	suite.NoError(err)

	orderID := orderResult["data"].(map[string]interface{})["id"].(string)
	orderNumber := orderResult["data"].(map[string]interface{})["order_number"].(string)

	// Step 4: Upload payment voucher
	voucherReq := map[string]interface{}{
		"order_id":     orderID,
		"voucher_url":  "https://example.com/voucher.jpg",
		"voucher_type": "image",
	}

	voucherResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/upload-voucher", token, voucherReq)
	suite.Equal(http.StatusOK, voucherResp.Code)

	// Step 5: Verify order status is pending_review
	statusResp := suite.makeAuthenticatedRequest("GET", fmt.Sprintf("/api/recharge/%s", orderID), token, nil)
	suite.Equal(http.StatusOK, statusResp.Code)

	var statusResult map[string]interface{}
	err = json.Unmarshal(statusResp.Body.Bytes(), &statusResult)
	suite.NoError(err)

	status := statusResult["data"].(map[string]interface{})["status"].(string)
	suite.Equal("pending_review", status)

	// Step 6: Financial audit - approve the recharge
	auditReq := map[string]interface{}{
		"order_id": orderID,
		"action":   "approve",
		"remark":   "Payment verified",
	}

	auditResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/audit", token, auditReq)
	suite.Equal(http.StatusOK, auditResp.Code)

	// Step 7: Verify order status is completed
	finalStatusResp := suite.makeAuthenticatedRequest("GET", fmt.Sprintf("/api/recharge/%s", orderID), token, nil)
	suite.Equal(http.StatusOK, finalStatusResp.Code)

	var finalStatusResult map[string]interface{}
	err = json.Unmarshal(finalStatusResp.Body.Bytes(), &finalStatusResult)
	suite.NoError(err)

	finalStatus := finalStatusResult["data"].(map[string]interface{})["status"].(string)
	suite.Equal("completed", finalStatus)

	// Step 8: Verify notification was sent (check notification logs)
	notificationResp := suite.makeAuthenticatedRequest("GET", fmt.Sprintf("/api/notifications?order_number=%s", orderNumber), token, nil)
	suite.Equal(http.StatusOK, notificationResp.Code)

	var notificationResult map[string]interface{}
	err = json.Unmarshal(notificationResp.Body.Bytes(), &notificationResult)
	suite.NoError(err)

	notifications := notificationResult["data"].([]interface{})
	suite.Greater(len(notifications), 0, "Should have at least one notification")
}

// TestPublicRechargeEndToEnd tests the complete public recharge flow
func (suite *RechargeFlowTestSuite) TestPublicRechargeEndToEnd() {
	// Step 1: Create test data
	user := suite.createTestUser("test_user2", "test2@example.com", "password123")
	merchant := suite.createTestMerchant("Test Merchant 2", "TM002")
	account := suite.createTestReceiveAccount("Test Bank Account", "1234567890123456", "public")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	// Step 2: Login and get JWT token
	token := suite.loginUser("test_user2", "password123")

	// Step 3: Create public recharge order
	rechargeReq := map[string]interface{}{
		"payer_name":     "Company ABC",
		"payer_account":  "9876543210987654",
		"payment_type":   "public",
		"amount":         "5000.00",
		"merchant_name":  "Test Merchant 2",
		"ad_account":     "AD789012",
		"remark":         "Test public recharge",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	suite.Equal(http.StatusCreated, orderResp.Code)

	var orderResult map[string]interface{}
	err := json.Unmarshal(orderResp.Body.Bytes(), &orderResult)
	suite.NoError(err)

	orderID := orderResult["data"].(map[string]interface{})["id"].(string)

	// Step 4: Simulate bank callback
	callbackReq := map[string]interface{}{
		"order_id":        orderID,
		"transaction_id":  "TXN" + uuid.New().String()[:8],
		"amount":          "5000.00",
		"status":          "success",
		"bank_reference":  "BANK" + uuid.New().String()[:8],
		"callback_time":   time.Now().Format(time.RFC3339),
	}

	callbackResp := suite.makeRequest("POST", "/api/webhook/bank-callback", callbackReq)
	suite.Equal(http.StatusOK, callbackResp.Code)

	// Step 5: Verify order status is completed
	statusResp := suite.makeAuthenticatedRequest("GET", fmt.Sprintf("/api/recharge/%s", orderID), token, nil)
	suite.Equal(http.StatusOK, statusResp.Code)

	var statusResult map[string]interface{}
	err = json.Unmarshal(statusResp.Body.Bytes(), &statusResult)
	suite.NoError(err)

	status := statusResult["data"].(map[string]interface{})["status"].(string)
	suite.Equal("completed", status)
}

// TestRechargeWithLimitExceeded tests recharge when limits are exceeded
func (suite *RechargeFlowTestSuite) TestRechargeWithLimitExceeded() {
	// Step 1: Create test data with low limits
	user := suite.createTestUser("test_user3", "test3@example.com", "password123")
	merchant := suite.createTestMerchant("Test Merchant 3", "TM003")
	account := suite.createTestReceiveAccountWithLimits("Limited Account", "11111111111", "private", "100.00", "500.00")
	suite.linkMerchantAccount(merchant.ID, account.ID)

	// Step 2: Login and get JWT token
	token := suite.loginUser("test_user3", "password123")

	// Step 3: Try to create recharge order exceeding single limit
	rechargeReq := map[string]interface{}{
		"payer_name":     "John Doe",
		"payer_account":  "98765432109",
		"payment_type":   "private",
		"amount":         "200.00", // Exceeds single limit of 100.00
		"merchant_name":  "Test Merchant 3",
		"ad_account":     "AD123456",
		"remark":         "Test limit exceeded",
	}

	orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
	suite.Equal(http.StatusBadRequest, orderResp.Code)

	var errorResult map[string]interface{}
	err := json.Unmarshal(orderResp.Body.Bytes(), &errorResult)
	suite.NoError(err)

	suite.Contains(errorResult["message"].(string), "limit")
}

// TestRechargeAccountRotation tests account rotation functionality
func (suite *RechargeFlowTestSuite) TestRechargeAccountRotation() {
	// Step 1: Create test data with multiple accounts
	user := suite.createTestUser("test_user4", "test4@example.com", "password123")
	merchant := suite.createTestMerchant("Test Merchant 4", "TM004")
	
	account1 := suite.createTestReceiveAccount("Account 1", "11111111111", "private")
	account2 := suite.createTestReceiveAccount("Account 2", "22222222222", "private")
	
	suite.linkMerchantAccountWithWeight(merchant.ID, account1.ID, 3)
	suite.linkMerchantAccountWithWeight(merchant.ID, account2.ID, 1)

	// Step 2: Login and get JWT token
	token := suite.loginUser("test_user4", "password123")

	// Step 3: Create multiple recharge orders and verify rotation
	accountUsage := make(map[string]int)
	
	for i := 0; i < 10; i++ {
		rechargeReq := map[string]interface{}{
			"payer_name":     fmt.Sprintf("Payer %d", i),
			"payer_account":  fmt.Sprintf("9876543210%d", i),
			"payment_type":   "private",
			"amount":         "50.00",
			"merchant_name":  "Test Merchant 4",
			"ad_account":     fmt.Sprintf("AD%d", i),
			"remark":         fmt.Sprintf("Test rotation %d", i),
		}

		orderResp := suite.makeAuthenticatedRequest("POST", "/api/recharge/create", token, rechargeReq)
		suite.Equal(http.StatusCreated, orderResp.Code)

		var orderResult map[string]interface{}
		err := json.Unmarshal(orderResp.Body.Bytes(), &orderResult)
		suite.NoError(err)

		receiverAccount := orderResult["data"].(map[string]interface{})["receiver_account"].(string)
		accountUsage[receiverAccount]++
	}

	// Verify that account1 (weight 3) is used more than account2 (weight 1)
	suite.Greater(accountUsage["11111111111"], accountUsage["22222222222"], 
		"Account with higher weight should be used more frequently")
}

// Helper methods for test data creation

func (suite *RechargeFlowTestSuite) createTestUser(username, email, password string) *repository.User {
	user := &repository.User{
		ID:       uuid.New().String(),
		Username: username,
		Email:    email,
		Password: password, // In real implementation, this should be hashed
		Status:   "active",
	}

	query := `INSERT INTO users (id, username, email, password, status, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`
	_, err := suite.DB.Exec(query, user.ID, user.Username, user.Email, user.Password, user.Status)
	suite.NoError(err)

	return user
}

func (suite *RechargeFlowTestSuite) createTestMerchant(name, code string) *repository.Merchant {
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

func (suite *RechargeFlowTestSuite) createTestReceiveAccount(name, number, paymentType string) *repository.ReceiveAccount {
	account := &repository.ReceiveAccount{
		ID:            uuid.New().String(),
		AccountName:   name,
		AccountNumber: number,
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   paymentType,
		Status:        "active",
		DailyLimit:    decimal.NewFromFloat(10000),
		SingleLimit:   decimal.NewFromFloat(5000),
	}

	query := `INSERT INTO receive_accounts (id, account_name, account_number, account_type, 
			  account_holder, payment_type, status, daily_limit, single_limit, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`
	_, err := suite.DB.Exec(query, account.ID, account.AccountName, account.AccountNumber, 
		account.AccountType, account.AccountHolder, account.PaymentType, account.Status,
		account.DailyLimit, account.SingleLimit)
	suite.NoError(err)

	return account
}

func (suite *RechargeFlowTestSuite) createTestReceiveAccountWithLimits(name, number, paymentType, singleLimit, dailyLimit string) *repository.ReceiveAccount {
	single, _ := decimal.NewFromString(singleLimit)
	daily, _ := decimal.NewFromString(dailyLimit)
	
	account := &repository.ReceiveAccount{
		ID:            uuid.New().String(),
		AccountName:   name,
		AccountNumber: number,
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   paymentType,
		Status:        "active",
		DailyLimit:    daily,
		SingleLimit:   single,
	}

	query := `INSERT INTO receive_accounts (id, account_name, account_number, account_type, 
			  account_holder, payment_type, status, daily_limit, single_limit, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`
	_, err := suite.DB.Exec(query, account.ID, account.AccountName, account.AccountNumber, 
		account.AccountType, account.AccountHolder, account.PaymentType, account.Status,
		account.DailyLimit, account.SingleLimit)
	suite.NoError(err)

	return account
}

func (suite *RechargeFlowTestSuite) linkMerchantAccount(merchantID, accountID string) {
	suite.linkMerchantAccountWithWeight(merchantID, accountID, 1)
}

func (suite *RechargeFlowTestSuite) linkMerchantAccountWithWeight(merchantID, accountID string, weight int) {
	query := `INSERT INTO merchant_receive_accounts (id, merchant_id, receive_account_id, weight, is_active, created_at) 
			  VALUES ($1, $2, $3, $4, true, NOW())`
	_, err := suite.DB.Exec(query, uuid.New().String(), merchantID, accountID, weight)
	suite.NoError(err)
}

func (suite *RechargeFlowTestSuite) loginUser(username, password string) string {
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

func (suite *RechargeFlowTestSuite) makeRequest(method, path string, body interface{}) *httptest.ResponseRecorder {
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
	suite.Router.ServeHTTP(recorder, req)

	return recorder
}

func (suite *RechargeFlowTestSuite) makeAuthenticatedRequest(method, path, token string, body interface{}) *httptest.ResponseRecorder {
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
	suite.Router.ServeHTTP(recorder, req)

	return recorder
}
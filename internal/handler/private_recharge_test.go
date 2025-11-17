package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRechargeService is a mock implementation of RechargeService
type MockRechargeService struct {
	mock.Mock
}

func (m *MockRechargeService) CreateRechargeOrder(ctx interface{}, req *service.CreateRechargeOrderRequest) (*MockRechargeOrder, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*MockRechargeOrder), args.Error(1)
}

func (m *MockRechargeService) GetRechargeOrder(ctx interface{}, id uuid.UUID) (*MockRechargeOrder, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*MockRechargeOrder), args.Error(1)
}

func (m *MockRechargeService) ProcessPrivateRecharge(ctx interface{}, orderID uuid.UUID, voucherURL string, userID *uuid.UUID) error {
	args := m.Called(ctx, orderID, voucherURL, userID)
	return args.Error(0)
}

// MockRechargeOrder represents a mock recharge order
type MockRechargeOrder struct {
	ID               uuid.UUID       `json:"id"`
	OrderNumber      string          `json:"order_number"`
	PayerName        string          `json:"payer_name"`
	PayerAccount     string          `json:"payer_account"`
	PaymentType      string          `json:"payment_type"`
	Amount           decimal.Decimal `json:"amount"`
	MerchantID       uuid.UUID       `json:"merchant_id"`
	AdAccount        string          `json:"ad_account"`
	ReceiveAccountID uuid.UUID       `json:"receive_account_id"`
	Status           string          `json:"status"`
	Remark           *string         `json:"remark"`
	VoucherURL       *string         `json:"voucher_url"`
}

// MockMerchantService is a mock implementation of MerchantService
type MockMerchantService struct {
	mock.Mock
}

func (m *MockMerchantService) ListMerchants(ctx interface{}, filter interface{}) ([]*MockMerchant, int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*MockMerchant), args.Get(1).(int64), args.Error(2)
}

// MockMerchant represents a mock merchant
type MockMerchant struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Code string    `json:"code"`
}

// MockReceiveAccountService is a mock implementation of ReceiveAccountService
type MockReceiveAccountService struct {
	mock.Mock
}

func (m *MockReceiveAccountService) GetReceiveAccount(ctx interface{}, id uuid.UUID) (*MockReceiveAccount, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*MockReceiveAccount), args.Error(1)
}

// MockReceiveAccount represents a mock receive account
type MockReceiveAccount struct {
	ID            uuid.UUID `json:"id"`
	AccountHolder string    `json:"account_holder"`
	AccountNumber string    `json:"account_number"`
	AccountType   string    `json:"account_type"`
	BankName      *string   `json:"bank_name"`
	BankBranch    *string   `json:"bank_branch"`
}

func TestCreateRecharge(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create mock services
	mockRechargeService := &MockRechargeService{}
	mockMerchantService := &MockMerchantService{}
	mockAccountService := &MockReceiveAccountService{}

	// Create handler with mocks
	handler := &Handler{
		config:          &config.Config{},
		rechargeService: mockRechargeService,
		merchantService: mockMerchantService,
		accountService:  mockAccountService,
	}

	// Setup mock expectations
	merchantID := uuid.New()
	orderID := uuid.New()
	receiveAccountID := uuid.New()

	expectedOrder := &MockRechargeOrder{
		ID:               orderID,
		OrderNumber:      "CJ202501011234567",
		PayerName:        "张三",
		PayerAccount:     "6222021234567890",
		PaymentType:      "private",
		Amount:           decimal.NewFromFloat(1000.00),
		MerchantID:       merchantID,
		AdAccount:        "test-ad-account",
		ReceiveAccountID: receiveAccountID,
		Status:           "pending",
	}

	mockRechargeService.On("CreateRechargeOrder", mock.Anything, mock.AnythingOfType("*service.CreateRechargeOrderRequest")).Return(expectedOrder, nil)

	// Create test request
	requestBody := map[string]interface{}{
		"payer_name":    "张三",
		"payer_account": "6222021234567890",
		"payment_type":  "private",
		"amount":        1000.00,
		"merchant_id":   merchantID.String(),
		"ad_account":    "test-ad-account",
		"remark":        "测试充值",
	}

	jsonBody, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/v1/recharge/", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Create Gin context
	router := gin.New()
	router.POST("/api/v1/recharge/", handler.CreateRecharge)

	// Perform request
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.NotNil(t, response["data"])

	// Verify mock was called
	mockRechargeService.AssertExpectations(t)
}

func TestListMerchants(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create mock services
	mockMerchantService := &MockMerchantService{}

	// Create handler with mocks
	handler := &Handler{
		config:          &config.Config{},
		merchantService: mockMerchantService,
	}

	// Setup mock expectations
	expectedMerchants := []*MockMerchant{
		{
			ID:   uuid.New(),
			Name: "测试商户1",
			Code: "TEST001",
		},
		{
			ID:   uuid.New(),
			Name: "测试商户2",
			Code: "TEST002",
		},
	}

	mockMerchantService.On("ListMerchants", mock.Anything, mock.Anything).Return(expectedMerchants, int64(2), nil)

	// Create HTTP request
	req, _ := http.NewRequest("GET", "/api/v1/merchants", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Create Gin context
	router := gin.New()
	router.GET("/api/v1/merchants", handler.ListMerchants)

	// Perform request
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.NotNil(t, response["data"])

	// Verify mock was called
	mockMerchantService.AssertExpectations(t)
}

func TestGetReceiveInfo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create mock services
	mockRechargeService := &MockRechargeService{}
	mockAccountService := &MockReceiveAccountService{}

	// Create handler with mocks
	handler := &Handler{
		config:          &config.Config{},
		rechargeService: mockRechargeService,
		accountService:  mockAccountService,
	}

	// Setup mock expectations
	orderID := uuid.New()
	receiveAccountID := uuid.New()

	expectedOrder := &MockRechargeOrder{
		ID:               orderID,
		OrderNumber:      "CJ202501011234567",
		Amount:           decimal.NewFromFloat(1000.00),
		PaymentType:      "private",
		ReceiveAccountID: receiveAccountID,
		Status:           "pending",
	}

	expectedAccount := &MockReceiveAccount{
		ID:            receiveAccountID,
		AccountHolder: "李四",
		AccountNumber: "6222021234567891",
		AccountType:   "bank",
		BankName:      stringPtr("中国银行"),
		BankBranch:    stringPtr("北京分行"),
	}

	mockRechargeService.On("GetRechargeOrder", mock.Anything, orderID).Return(expectedOrder, nil)
	mockAccountService.On("GetReceiveAccount", mock.Anything, receiveAccountID).Return(expectedAccount, nil)

	// Create HTTP request
	req, _ := http.NewRequest("GET", "/api/v1/recharge/"+orderID.String()+"/receive-info", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Create Gin context
	router := gin.New()
	router.GET("/api/v1/recharge/:id/receive-info", handler.GetReceiveInfo)

	// Perform request
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))

	data := response["data"].(map[string]interface{})
	assert.Equal(t, orderID.String(), data["order_id"])
	assert.Equal(t, "CJ202501011234567", data["order_number"])
	assert.Equal(t, "李四", data["receiver_name"])
	assert.Equal(t, "6222021234567891", data["receiver_account"])
	assert.Equal(t, "bank", data["account_type"])

	// Verify mocks were called
	mockRechargeService.AssertExpectations(t)
	mockAccountService.AssertExpectations(t)
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
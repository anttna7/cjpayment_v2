package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock services for testing
type MockMerchantService struct {
	mock.Mock
}

func (m *MockMerchantService) CreateMerchant(ctx interface{}, req *service.CreateMerchantRequest) (*service.MerchantResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.MerchantResponse), args.Error(1)
}

func (m *MockMerchantService) GetMerchant(ctx interface{}, id uuid.UUID) (*service.MerchantResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.MerchantResponse), args.Error(1)
}

func (m *MockMerchantService) UpdateMerchant(ctx interface{}, id uuid.UUID, req *service.UpdateMerchantRequest) (*service.MerchantResponse, error) {
	args := m.Called(ctx, id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.MerchantResponse), args.Error(1)
}

func (m *MockMerchantService) DeleteMerchant(ctx interface{}, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMerchantService) ListMerchants(ctx interface{}, filter interface{}) ([]*service.MerchantResponse, int64, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*service.MerchantResponse), args.Get(1).(int64), args.Error(2)
}

func (m *MockMerchantService) UpdateMerchantStatus(ctx interface{}, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockMerchantService) GenerateRechargeURL(ctx interface{}, merchantID uuid.UUID) (string, error) {
	args := m.Called(ctx, merchantID)
	return args.String(0), args.Error(1)
}

func (m *MockMerchantService) EnableRechargeService(ctx interface{}, merchantID uuid.UUID, enabled bool) error {
	args := m.Called(ctx, merchantID, enabled)
	return args.Error(0)
}

func (m *MockMerchantService) UpdateRechargePageConfig(ctx interface{}, merchantID uuid.UUID, config map[string]interface{}) error {
	args := m.Called(ctx, merchantID, config)
	return args.Error(0)
}

type MockMerchantAccountService struct {
	mock.Mock
}

func (m *MockMerchantAccountService) BindAccount(ctx interface{}, req *service.BindAccountRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockMerchantAccountService) UnbindAccount(ctx interface{}, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockMerchantAccountService) ListMerchantAccounts(ctx interface{}, merchantID uuid.UUID) ([]*service.MerchantAccountInfo, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.MerchantAccountInfo), args.Error(1)
}

func (m *MockMerchantAccountService) UpdateAccountPriority(ctx interface{}, merchantID, accountID uuid.UUID, priority int) error {
	args := m.Called(ctx, merchantID, accountID, priority)
	return args.Error(0)
}

func (m *MockMerchantAccountService) ReorderAccountPriorities(ctx interface{}, merchantID uuid.UUID, accountPriorities []service.AccountPriority) error {
	args := m.Called(ctx, merchantID, accountPriorities)
	return args.Error(0)
}

func (m *MockMerchantAccountService) GetAvailableAccounts(ctx interface{}, merchantID uuid.UUID, paymentType string, amount decimal.Decimal) ([]*service.AvailableAccountInfo, error) {
	args := m.Called(ctx, merchantID, paymentType, amount)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.AvailableAccountInfo), args.Error(1)
}

func (m *MockMerchantAccountService) ValidateAccountBinding(ctx interface{}, merchantID, accountID uuid.UUID) (*service.ValidationResult, error) {
	args := m.Called(ctx, merchantID, accountID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.ValidationResult), args.Error(1)
}

func (m *MockMerchantAccountService) GetAccountUsageStatistics(ctx interface{}, merchantID uuid.UUID, timeRange service.TimeRange) ([]*service.AccountUsageStats, error) {
	args := m.Called(ctx, merchantID, timeRange)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.AccountUsageStats), args.Error(1)
}

func (m *MockMerchantAccountService) BatchBindAccounts(ctx interface{}, req *service.BatchBindAccountsRequest) (*service.BatchOperationResult, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.BatchOperationResult), args.Error(1)
}

type MockRechargeService struct {
	mock.Mock
}

func (m *MockRechargeService) ListOrders(ctx interface{}, req *service.ListOrdersRequest) ([]*service.RechargeOrderResponse, int64, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*service.RechargeOrderResponse), args.Get(1).(int64), args.Error(2)
}

func (m *MockRechargeService) GetRechargeOrder(ctx interface{}, id uuid.UUID) (*service.RechargeOrderResponse, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.RechargeOrderResponse), args.Error(1)
}

func (m *MockRechargeService) UpdateOrderStatus(ctx interface{}, id uuid.UUID, status string, remark string) error {
	args := m.Called(ctx, id, status, remark)
	return args.Error(0)
}

type MockReportService struct {
	mock.Mock
}

type MockDataExportService struct {
	mock.Mock
}

func setupTestRouter() (*gin.Engine, *RechargeTestingHandler, *MockMerchantService, *MockMerchantAccountService, *MockRechargeService) {
	gin.SetMode(gin.TestMode)
	
	mockMerchantService := &MockMerchantService{}
	mockMerchantAccountService := &MockMerchantAccountService{}
	mockRechargeService := &MockRechargeService{}
	mockReportService := &MockReportService{}
	mockDataExportService := &MockDataExportService{}
	
	handler := NewRechargeTestingHandler(
		mockMerchantService,
		mockMerchantAccountService,
		mockRechargeService,
		mockReportService,
		mockDataExportService,
	)
	
	router := gin.New()
	api := router.Group("/api/v1/recharge-testing")
	handler.RegisterRoutes(api)
	
	return router, handler, mockMerchantService, mockMerchantAccountService, mockRechargeService
}

func TestCreateMerchant(t *testing.T) {
	router, _, mockMerchantService, _, _ := setupTestRouter()
	
	// Test data
	merchantID := uuid.New()
	createReq := service.CreateMerchantRequest{
		Name: "Test Merchant",
		Code: "TEST001",
	}
	
	expectedResponse := &service.MerchantResponse{
		ID:   merchantID,
		Name: "Test Merchant",
		Code: "TEST001",
		Status: "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	
	// Setup mock
	mockMerchantService.On("CreateMerchant", mock.Anything, &createReq).Return(expectedResponse, nil)
	
	// Create request
	reqBody, _ := json.Marshal(createReq)
	req, _ := http.NewRequest("POST", "/api/v1/recharge-testing/merchants", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusCreated, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.Equal(t, "Merchant created successfully", response["message"])
	
	mockMerchantService.AssertExpectations(t)
}

func TestCreateMerchantValidationError(t *testing.T) {
	router, _, _, _, _ := setupTestRouter()
	
	// Test data with missing required fields
	createReq := service.CreateMerchantRequest{
		// Missing Name and Code
	}
	
	// Create request
	reqBody, _ := json.Marshal(createReq)
	req, _ := http.NewRequest("POST", "/api/v1/recharge-testing/merchants", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response["error"], "Merchant name is required")
}

func TestListMerchants(t *testing.T) {
	router, _, mockMerchantService, _, _ := setupTestRouter()
	
	// Test data
	merchants := []*service.MerchantResponse{
		{
			ID:   uuid.New(),
			Name: "Merchant 1",
			Code: "MERCH001",
			Status: "active",
		},
		{
			ID:   uuid.New(),
			Name: "Merchant 2",
			Code: "MERCH002",
			Status: "active",
		},
	}
	
	// Setup mock
	mockMerchantService.On("ListMerchants", mock.Anything, mock.Anything).Return(merchants, int64(2), nil)
	
	// Create request
	req, _ := http.NewRequest("GET", "/api/v1/recharge-testing/merchants?page=1&limit=20", nil)
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	
	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["total"])
	assert.Equal(t, float64(1), data["page"])
	assert.Equal(t, float64(20), data["limit"])
	
	mockMerchantService.AssertExpectations(t)
}

func TestGetMerchant(t *testing.T) {
	router, _, mockMerchantService, _, _ := setupTestRouter()
	
	// Test data
	merchantID := uuid.New()
	expectedMerchant := &service.MerchantResponse{
		ID:   merchantID,
		Name: "Test Merchant",
		Code: "TEST001",
		Status: "active",
	}
	
	// Setup mock
	mockMerchantService.On("GetMerchant", mock.Anything, merchantID).Return(expectedMerchant, nil)
	
	// Create request
	req, _ := http.NewRequest("GET", "/api/v1/recharge-testing/merchants/"+merchantID.String(), nil)
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	
	mockMerchantService.AssertExpectations(t)
}

func TestGetMerchantInvalidID(t *testing.T) {
	router, _, _, _, _ := setupTestRouter()
	
	// Create request with invalid UUID
	req, _ := http.NewRequest("GET", "/api/v1/recharge-testing/merchants/invalid-uuid", nil)
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response["error"], "Invalid merchant ID format")
}

func TestBindAccount(t *testing.T) {
	router, _, _, mockMerchantAccountService, _ := setupTestRouter()
	
	// Test data
	bindReq := service.BindAccountRequest{
		MerchantID: uuid.New(),
		AccountID:  uuid.New(),
		Priority:   1,
	}
	
	// Setup mock
	mockMerchantAccountService.On("BindAccount", mock.Anything, &bindReq).Return(nil)
	
	// Create request
	reqBody, _ := json.Marshal(bindReq)
	req, _ := http.NewRequest("POST", "/api/v1/recharge-testing/merchant-accounts/bind", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusCreated, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.Equal(t, "Account bound successfully", response["message"])
	
	mockMerchantAccountService.AssertExpectations(t)
}

func TestListOrders(t *testing.T) {
	router, _, _, _, mockRechargeService := setupTestRouter()
	
	// Test data
	orders := []*service.RechargeOrderResponse{
		{
			ID:          uuid.New(),
			OrderNumber: "ORD001",
			Amount:      decimal.NewFromFloat(100.00),
			Status:      "pending",
		},
		{
			ID:          uuid.New(),
			OrderNumber: "ORD002",
			Amount:      decimal.NewFromFloat(200.00),
			Status:      "confirmed",
		},
	}
	
	// Setup mock
	mockRechargeService.On("ListOrders", mock.Anything, mock.Anything).Return(orders, int64(2), nil)
	
	// Create request
	req, _ := http.NewRequest("GET", "/api/v1/recharge-testing/orders?page=1&limit=20", nil)
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	
	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["total"])
	
	mockRechargeService.AssertExpectations(t)
}

func TestUpdateOrderStatus(t *testing.T) {
	router, _, _, _, mockRechargeService := setupTestRouter()
	
	// Test data
	orderID := uuid.New()
	updateReq := map[string]interface{}{
		"status": "confirmed",
		"remark": "Payment verified",
	}
	
	// Setup mock
	mockRechargeService.On("UpdateOrderStatus", mock.Anything, orderID, "confirmed", "Payment verified").Return(nil)
	
	// Create request
	reqBody, _ := json.Marshal(updateReq)
	req, _ := http.NewRequest("PUT", "/api/v1/recharge-testing/orders/"+orderID.String()+"/status", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.Contains(t, response["message"], "Order status updated to confirmed")
	
	mockRechargeService.AssertExpectations(t)
}

func TestGenerateRechargeURL(t *testing.T) {
	router, _, mockMerchantService, _, _ := setupTestRouter()
	
	// Test data
	merchantID := uuid.New()
	expectedURL := "https://example.com/recharge/" + merchantID.String()
	
	// Setup mock
	mockMerchantService.On("GenerateRechargeURL", mock.Anything, merchantID).Return(expectedURL, nil)
	
	// Create request
	req, _ := http.NewRequest("POST", "/api/v1/recharge-testing/merchants/"+merchantID.String()+"/generate-recharge-url", nil)
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	assert.Equal(t, expectedURL, response["recharge_url"])
	assert.Equal(t, "Recharge URL generated successfully", response["message"])
	
	mockMerchantService.AssertExpectations(t)
}

func TestDashboardOverview(t *testing.T) {
	router, _, _, _, _ := setupTestRouter()
	
	// Create request
	req, _ := http.NewRequest("GET", "/api/v1/recharge-testing/dashboard/overview", nil)
	
	// Execute request
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response["success"].(bool))
	
	data := response["data"].(map[string]interface{})
	assert.Contains(t, data, "total_merchants")
	assert.Contains(t, data, "total_orders")
	assert.Contains(t, data, "total_amount")
}

// Benchmark tests
func BenchmarkListMerchants(b *testing.B) {
	router, _, mockMerchantService, _, _ := setupTestRouter()
	
	merchants := make([]*service.MerchantResponse, 100)
	for i := 0; i < 100; i++ {
		merchants[i] = &service.MerchantResponse{
			ID:   uuid.New(),
			Name: fmt.Sprintf("Merchant %d", i),
			Code: fmt.Sprintf("MERCH%03d", i),
			Status: "active",
		}
	}
	
	mockMerchantService.On("ListMerchants", mock.Anything, mock.Anything).Return(merchants, int64(100), nil)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req, _ := http.NewRequest("GET", "/api/v1/recharge-testing/merchants", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
}
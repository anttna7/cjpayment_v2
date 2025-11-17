package handler

import (
	"bytes"
	"context"
	"encoding/json"
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

// MockMerchantAccountService for testing
type MockMerchantAccountService struct {
	mock.Mock
}

func (m *MockMerchantAccountService) BindAccount(ctx context.Context, req *service.BindAccountRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockMerchantAccountService) UnbindAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockMerchantAccountService) ListMerchantAccounts(ctx context.Context, merchantID uuid.UUID) ([]*service.MerchantAccountInfo, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.MerchantAccountInfo), args.Error(1)
}

func (m *MockMerchantAccountService) UpdateAccountPriority(ctx context.Context, merchantID, accountID uuid.UUID, priority int) error {
	args := m.Called(ctx, merchantID, accountID, priority)
	return args.Error(0)
}

func (m *MockMerchantAccountService) ReorderAccountPriorities(ctx context.Context, merchantID uuid.UUID, accountPriorities []service.AccountPriority) error {
	args := m.Called(ctx, merchantID, accountPriorities)
	return args.Error(0)
}

func (m *MockMerchantAccountService) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, paymentType string, amount decimal.Decimal) ([]*service.AvailableAccountInfo, error) {
	args := m.Called(ctx, merchantID, paymentType, amount)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.AvailableAccountInfo), args.Error(1)
}

func (m *MockMerchantAccountService) ValidateAccountBinding(ctx context.Context, merchantID, accountID uuid.UUID) (*service.ValidationResult, error) {
	args := m.Called(ctx, merchantID, accountID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.ValidationResult), args.Error(1)
}

func (m *MockMerchantAccountService) CheckAccountAvailability(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*service.AvailabilityResult, error) {
	args := m.Called(ctx, accountID, amount)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.AvailabilityResult), args.Error(1)
}

func (m *MockMerchantAccountService) GetAccountUsageStatistics(ctx context.Context, merchantID uuid.UUID, timeRange service.TimeRange) ([]*service.AccountUsageStats, error) {
	args := m.Called(ctx, merchantID, timeRange)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.AccountUsageStats), args.Error(1)
}

func (m *MockMerchantAccountService) GetLoadBalancingRecommendations(ctx context.Context, merchantID uuid.UUID) ([]*service.LoadBalancingRecommendation, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*service.LoadBalancingRecommendation), args.Error(1)
}

func (m *MockMerchantAccountService) UpdateAccountUsageMetrics(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	args := m.Called(ctx, accountID, amount)
	return args.Error(0)
}

func (m *MockMerchantAccountService) BatchBindAccounts(ctx context.Context, req *service.BatchBindAccountsRequest) (*service.BatchOperationResult, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.BatchOperationResult), args.Error(1)
}

func (m *MockMerchantAccountService) BatchUpdatePriorities(ctx context.Context, merchantID uuid.UUID, updates []service.AccountPriorityUpdate) (*service.BatchOperationResult, error) {
	args := m.Called(ctx, merchantID, updates)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.BatchOperationResult), args.Error(1)
}

func (m *MockMerchantAccountService) EnableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockMerchantAccountService) DisableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockMerchantAccountService) GetAccountStatus(ctx context.Context, merchantID, accountID uuid.UUID) (*service.AccountStatusInfo, error) {
	args := m.Called(ctx, merchantID, accountID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.AccountStatusInfo), args.Error(1)
}

// Test setup helper
func setupMerchantAccountHandlerTest() (*MerchantAccountHandler, *MockMerchantAccountService, *gin.Engine) {
	gin.SetMode(gin.TestMode)
	
	mockService := &MockMerchantAccountService{}
	handler := NewMerchantAccountHandler(mockService)
	
	router := gin.New()
	api := router.Group("/api/v1")
	handler.RegisterRoutes(api)
	
	return handler, mockService, router
}

// Test data helpers
func createTestMerchantAccountInfo() *service.MerchantAccountInfo {
	return &service.MerchantAccountInfo{
		ID:                   uuid.New(),
		MerchantID:          uuid.New(),
		ReceiveAccountID:    uuid.New(),
		AccountName:         "Test Account",
		AccountNumber:       "123456789",
		AccountType:         "bank",
		PaymentType:         "business",
		AccountHolder:       "Test Holder",
		Priority:            75,
		IsActive:            true,
		Status:              "active",
		DailyLimit:          decimal.NewFromInt(5000),
		SingleLimit:         decimal.NewFromInt(500),
		DailyUsed:           decimal.NewFromInt(100),
		RemainingDailyLimit: decimal.NewFromInt(4900),
		BoundAt:             time.Now(),
	}
}

// Tests for BindAccount
func TestMerchantAccountHandler_BindAccount_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	req := service.BindAccountRequest{
		MerchantID: uuid.New(),
		AccountID:  uuid.New(),
		Priority:   75,
	}

	mockService.On("BindAccount", mock.Anything, &req).Return(nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/v1/merchant-accounts/bind", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}

func TestMerchantAccountHandler_BindAccount_InvalidRequest(t *testing.T) {
	_, _, router := setupMerchantAccountHandlerTest()

	invalidReq := map[string]interface{}{
		"merchant_id": "invalid-uuid",
		"account_id":  uuid.New(),
		"priority":    75,
	}

	reqBody, _ := json.Marshal(invalidReq)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/v1/merchant-accounts/bind", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// Tests for UnbindAccount
func TestMerchantAccountHandler_UnbindAccount_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()

	mockService.On("UnbindAccount", mock.Anything, merchantID, accountID).Return(nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("DELETE", "/api/v1/merchant-accounts/"+merchantID.String()+"/accounts/"+accountID.String(), nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestMerchantAccountHandler_UnbindAccount_InvalidMerchantID(t *testing.T) {
	_, _, router := setupMerchantAccountHandlerTest()

	accountID := uuid.New()

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("DELETE", "/api/v1/merchant-accounts/invalid-uuid/accounts/"+accountID.String(), nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// Tests for ListMerchantAccounts
func TestMerchantAccountHandler_ListMerchantAccounts_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountInfo := createTestMerchantAccountInfo()
	accountInfo.MerchantID = merchantID

	mockService.On("ListMerchantAccounts", mock.Anything, merchantID).Return([]*service.MerchantAccountInfo{accountInfo}, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("GET", "/api/v1/merchant-accounts/"+merchantID.String(), nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(1), response["count"])
	
	mockService.AssertExpectations(t)
}

// Tests for UpdateAccountPriority
func TestMerchantAccountHandler_UpdateAccountPriority_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()
	priority := 80

	mockService.On("UpdateAccountPriority", mock.Anything, merchantID, accountID, priority).Return(nil)

	reqBody := map[string]int{"priority": priority}
	reqBodyBytes, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("PUT", "/api/v1/merchant-accounts/"+merchantID.String()+"/accounts/"+accountID.String()+"/priority", bytes.NewBuffer(reqBodyBytes))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestMerchantAccountHandler_UpdateAccountPriority_InvalidPriority(t *testing.T) {
	_, _, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()

	reqBody := map[string]int{"priority": 150} // Invalid priority
	reqBodyBytes, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("PUT", "/api/v1/merchant-accounts/"+merchantID.String()+"/accounts/"+accountID.String()+"/priority", bytes.NewBuffer(reqBodyBytes))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// Tests for GetAvailableAccounts
func TestMerchantAccountHandler_GetAvailableAccounts_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	paymentType := "business"
	amount := decimal.NewFromInt(100)

	availableAccount := &service.AvailableAccountInfo{
		AccountID:           uuid.New(),
		AccountName:         "Available Account",
		AccountNumber:       "987654321",
		AccountType:         "bank",
		PaymentType:         paymentType,
		AccountHolder:       "Available Holder",
		Priority:            80,
		DailyLimit:          decimal.NewFromInt(5000),
		SingleLimit:         decimal.NewFromInt(500),
		DailyUsed:           decimal.NewFromInt(50),
		RemainingDailyLimit: decimal.NewFromInt(4950),
		CanAcceptAmount:     true,
		AvailabilityScore:   85,
		LastUsed:            time.Now(),
	}

	mockService.On("GetAvailableAccounts", mock.Anything, merchantID, paymentType, amount).Return([]*service.AvailableAccountInfo{availableAccount}, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("GET", "/api/v1/merchant-accounts/"+merchantID.String()+"/available?payment_type="+paymentType+"&amount=100", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(1), response["count"])
	
	mockService.AssertExpectations(t)
}

// Tests for ValidateAccountBinding
func TestMerchantAccountHandler_ValidateAccountBinding_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()

	validationResult := &service.ValidationResult{
		IsValid:  true,
		Errors:   []string{},
		Warnings: []string{},
	}

	mockService.On("ValidateAccountBinding", mock.Anything, merchantID, accountID).Return(validationResult, nil)

	reqBody := map[string]uuid.UUID{
		"merchant_id": merchantID,
		"account_id":  accountID,
	}
	reqBodyBytes, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/v1/merchant-accounts/validate-binding", bytes.NewBuffer(reqBodyBytes))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	data := response["data"].(map[string]interface{})
	assert.True(t, data["is_valid"].(bool))
	
	mockService.AssertExpectations(t)
}

// Tests for CheckAccountAvailability
func TestMerchantAccountHandler_CheckAccountAvailability_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	accountID := uuid.New()
	amount := decimal.NewFromInt(100)

	availabilityResult := &service.AvailabilityResult{
		AccountID:            accountID,
		IsAvailable:          true,
		Reasons:              []string{},
		RemainingDailyLimit:  decimal.NewFromInt(4900),
		SingleLimit:          decimal.NewFromInt(500),
		UtilizationRate:      decimal.NewFromInt(2),
	}

	mockService.On("CheckAccountAvailability", mock.Anything, accountID, amount).Return(availabilityResult, nil)

	reqBody := map[string]interface{}{
		"account_id": accountID,
		"amount":     amount,
	}
	reqBodyBytes, _ := json.Marshal(reqBody)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/v1/merchant-accounts/check-availability", bytes.NewBuffer(reqBodyBytes))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	data := response["data"].(map[string]interface{})
	assert.True(t, data["is_available"].(bool))
	
	mockService.AssertExpectations(t)
}

// Tests for GetAccountUsageStatistics
func TestMerchantAccountHandler_GetAccountUsageStatistics_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	
	usageStats := &service.AccountUsageStats{
		AccountID:        uuid.New(),
		AccountName:      "Test Account",
		TransactionCount: 10,
		TotalAmount:      decimal.NewFromInt(1000),
		SuccessfulCount:  9,
		FailedCount:      1,
		SuccessRate:      decimal.NewFromInt(90),
		UtilizationRate:  decimal.NewFromInt(20),
	}

	mockService.On("GetAccountUsageStatistics", mock.Anything, merchantID, mock.AnythingOfType("service.TimeRange")).Return([]*service.AccountUsageStats{usageStats}, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("GET", "/api/v1/merchant-accounts/"+merchantID.String()+"/usage-stats?days=7", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(1), response["count"])
	
	mockService.AssertExpectations(t)
}

// Tests for BatchBindAccounts
func TestMerchantAccountHandler_BatchBindAccounts_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	req := service.BatchBindAccountsRequest{
		MerchantID: uuid.New(),
		Bindings: []service.AccountBinding{
			{AccountID: uuid.New(), Priority: 70},
			{AccountID: uuid.New(), Priority: 80},
		},
	}

	batchResult := &service.BatchOperationResult{
		TotalRequested: 2,
		Successful:     2,
		Failed:         0,
		Errors:         []string{},
	}

	mockService.On("BatchBindAccounts", mock.Anything, &req).Return(batchResult, nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/v1/merchant-accounts/batch-bind", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["successful"])
	assert.Equal(t, float64(0), data["failed"])
	
	mockService.AssertExpectations(t)
}

func TestMerchantAccountHandler_BatchBindAccounts_PartialFailure(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	req := service.BatchBindAccountsRequest{
		MerchantID: uuid.New(),
		Bindings: []service.AccountBinding{
			{AccountID: uuid.New(), Priority: 70},
			{AccountID: uuid.New(), Priority: 80},
		},
	}

	batchResult := &service.BatchOperationResult{
		TotalRequested: 2,
		Successful:     1,
		Failed:         1,
		Errors:         []string{"Account not found"},
	}

	mockService.On("BatchBindAccounts", mock.Anything, &req).Return(batchResult, nil)

	reqBody, _ := json.Marshal(req)
	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("POST", "/api/v1/merchant-accounts/batch-bind", bytes.NewBuffer(reqBody))
	httpReq.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusPartialContent, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(1), data["successful"])
	assert.Equal(t, float64(1), data["failed"])
	
	mockService.AssertExpectations(t)
}

// Tests for EnableAccount and DisableAccount
func TestMerchantAccountHandler_EnableAccount_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()

	mockService.On("EnableAccount", mock.Anything, merchantID, accountID).Return(nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("PUT", "/api/v1/merchant-accounts/"+merchantID.String()+"/accounts/"+accountID.String()+"/enable", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestMerchantAccountHandler_DisableAccount_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()

	mockService.On("DisableAccount", mock.Anything, merchantID, accountID).Return(nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("PUT", "/api/v1/merchant-accounts/"+merchantID.String()+"/accounts/"+accountID.String()+"/disable", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

// Tests for GetAccountStatus
func TestMerchantAccountHandler_GetAccountStatus_Success(t *testing.T) {
	_, mockService, router := setupMerchantAccountHandlerTest()

	merchantID := uuid.New()
	accountID := uuid.New()

	accountStatus := &service.AccountStatusInfo{
		MerchantID:      merchantID,
		AccountID:       accountID,
		IsBindingActive: true,
		AccountStatus:   "active",
		Priority:        75,
		DailyLimit:      decimal.NewFromInt(5000),
		DailyUsed:       decimal.NewFromInt(100),
		UtilizationRate: decimal.NewFromInt(2),
		BoundAt:         time.Now(),
	}

	mockService.On("GetAccountStatus", mock.Anything, merchantID, accountID).Return(accountStatus, nil)

	w := httptest.NewRecorder()
	httpReq, _ := http.NewRequest("GET", "/api/v1/merchant-accounts/"+merchantID.String()+"/accounts/"+accountID.String()+"/status", nil)

	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	data := response["data"].(map[string]interface{})
	assert.True(t, data["is_binding_active"].(bool))
	assert.Equal(t, "active", data["account_status"])
	
	mockService.AssertExpectations(t)
}
package handler

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
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"cjpayment/internal/service"
)

// MockRechargeService for testing
type MockRechargeService struct {
	mock.Mock
}

func (m *MockRechargeService) CreateRechargeOrder(ctx context.Context, req *service.CreateRechargeOrderRequest) (*service.RechargeOrder, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.RechargeOrder), args.Error(1)
}

func (m *MockRechargeService) GetRechargeOrder(ctx context.Context, orderNo string) (*service.RechargeOrder, error) {
	args := m.Called(ctx, orderNo)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.RechargeOrder), args.Error(1)
}

func (m *MockRechargeService) UpdateOrderStatus(ctx context.Context, orderNo string, status string, remark string) error {
	args := m.Called(ctx, orderNo, status, remark)
	return args.Error(0)
}

func (m *MockRechargeService) UploadPaymentProof(ctx context.Context, orderNo string, proofURL string) error {
	args := m.Called(ctx, orderNo, proofURL)
	return args.Error(0)
}

func (m *MockRechargeService) ListOrders(ctx context.Context, req *service.ListOrdersRequest) (*service.ListOrdersResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.ListOrdersResponse), args.Error(1)
}

// RechargeAPIIntegrationTestSuite defines the integration test suite
type RechargeAPIIntegrationTestSuite struct {
	suite.Suite
	router         *gin.Engine
	handler        *RechargeTestingHandler
	mockService    *MockRechargeService
}

func (suite *RechargeAPIIntegrationTestSuite) SetupTest() {
	gin.SetMode(gin.TestMode)
	
	suite.mockService = new(MockRechargeService)
	suite.handler = NewRechargeTestingHandler(suite.mockService)
	
	suite.router = gin.New()
	suite.setupRoutes()
}

func (suite *RechargeAPIIntegrationTestSuite) setupRoutes() {
	api := suite.router.Group("/api/v1")
	{
		// Public recharge endpoints
		api.POST("/recharge/orders", suite.handler.CreateRechargeOrder)
		api.GET("/recharge/orders/:orderNo", suite.handler.GetRechargeOrder)
		api.POST("/recharge/orders/:orderNo/proof", suite.handler.UploadPaymentProof)
		
		// Admin endpoints (simplified auth for testing)
		admin := api.Group("/admin")
		{
			admin.GET("/orders", suite.handler.ListOrders)
			admin.PUT("/orders/:orderNo/status", suite.handler.UpdateOrderStatus)
		}
	}
}

func (suite *RechargeAPIIntegrationTestSuite) TestCreateRechargeOrder_Success() {
	// Arrange
	reqBody := map[string]interface{}{
		"merchant_id":   1,
		"payer_name":    "John Doe",
		"amount":        "1000.00",
		"ad_account":    "AD123456",
		"payment_type":  "corporate",
	}

	expectedOrder := &service.RechargeOrder{
		ID:               1,
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	suite.mockService.On("CreateRechargeOrder", mock.Anything, mock.MatchedBy(func(req *service.CreateRechargeOrderRequest) bool {
		return req.MerchantID == 1 && req.PayerName == "John Doe" && req.Amount.Equal(decimal.NewFromFloat(1000.00))
	})).Return(expectedOrder, nil)

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusCreated, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	data := response["data"].(map[string]interface{})
	suite.Equal("RO20240812001", data["order_no"])
	suite.Equal(float64(1), data["merchant_id"])
	suite.Equal("John Doe", data["payer_name"])
	suite.Equal("1000", data["amount"])
	suite.Equal("pending", data["status"])
	
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestCreateRechargeOrder_ValidationError() {
	// Test cases for validation errors
	testCases := []struct {
		name           string
		reqBody        map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "missing merchant_id",
			reqBody: map[string]interface{}{
				"payer_name":   "John Doe",
				"amount":       "1000.00",
				"ad_account":   "AD123456",
				"payment_type": "corporate",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "merchant_id is required",
		},
		{
			name: "empty payer_name",
			reqBody: map[string]interface{}{
				"merchant_id":  1,
				"payer_name":   "",
				"amount":       "1000.00",
				"ad_account":   "AD123456",
				"payment_type": "corporate",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "payer_name is required",
		},
		{
			name: "invalid amount",
			reqBody: map[string]interface{}{
				"merchant_id":  1,
				"payer_name":   "John Doe",
				"amount":       "0",
				"ad_account":   "AD123456",
				"payment_type": "corporate",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "amount must be greater than zero",
		},
		{
			name: "invalid payment_type",
			reqBody: map[string]interface{}{
				"merchant_id":  1,
				"payer_name":   "John Doe",
				"amount":       "1000.00",
				"ad_account":   "AD123456",
				"payment_type": "invalid",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "payment_type must be either 'corporate' or 'personal'",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			jsonBody, _ := json.Marshal(tc.reqBody)
			req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			// Act
			suite.router.ServeHTTP(w, req)

			// Assert
			suite.Equal(tc.expectedStatus, w.Code)
			
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			suite.NoError(err)
			
			errorMsg := response["error"].(map[string]interface{})["message"].(string)
			suite.Contains(errorMsg, tc.expectedError)
		})
	}
}

func (suite *RechargeAPIIntegrationTestSuite) TestCreateRechargeOrder_ServiceError() {
	// Arrange
	reqBody := map[string]interface{}{
		"merchant_id":  999,
		"payer_name":   "John Doe",
		"amount":       "1000.00",
		"ad_account":   "AD123456",
		"payment_type": "corporate",
	}

	suite.mockService.On("CreateRechargeOrder", mock.Anything, mock.AnythingOfType("*service.CreateRechargeOrderRequest")).Return(nil, service.ErrMerchantNotFound)

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusNotFound, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	errorMsg := response["error"].(map[string]interface{})["message"].(string)
	suite.Contains(errorMsg, "merchant not found")
	
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestGetRechargeOrder_Success() {
	// Arrange
	orderNo := "RO20240812001"
	expectedOrder := &service.RechargeOrder{
		ID:               1,
		OrderNo:          orderNo,
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	suite.mockService.On("GetRechargeOrder", mock.Anything, orderNo).Return(expectedOrder, nil)

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/v1/recharge/orders/%s", orderNo), nil)
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	data := response["data"].(map[string]interface{})
	suite.Equal(orderNo, data["order_no"])
	suite.Equal("John Doe", data["payer_name"])
	suite.Equal("pending", data["status"])
	
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestGetRechargeOrder_NotFound() {
	// Arrange
	orderNo := "NONEXISTENT"
	suite.mockService.On("GetRechargeOrder", mock.Anything, orderNo).Return(nil, service.ErrOrderNotFound)

	req := httptest.NewRequest("GET", fmt.Sprintf("/api/v1/recharge/orders/%s", orderNo), nil)
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusNotFound, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	errorMsg := response["error"].(map[string]interface{})["message"].(string)
	suite.Contains(errorMsg, "order not found")
	
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestUploadPaymentProof_Success() {
	// Arrange
	orderNo := "RO20240812001"
	reqBody := map[string]interface{}{
		"proof_url": "https://example.com/proof.jpg",
	}

	suite.mockService.On("UploadPaymentProof", mock.Anything, orderNo, "https://example.com/proof.jpg").Return(nil)

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", fmt.Sprintf("/api/v1/recharge/orders/%s/proof", orderNo), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	suite.Equal("Payment proof uploaded successfully", response["message"])
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestListOrders_Success() {
	// Arrange
	expectedOrders := []*service.RechargeOrder{
		{
			ID:          1,
			OrderNo:     "RO20240812001",
			MerchantID:  1,
			PayerName:   "John Doe",
			Amount:      decimal.NewFromFloat(1000.00),
			Status:      "pending",
			CreatedAt:   time.Now(),
		},
		{
			ID:          2,
			OrderNo:     "RO20240812002",
			MerchantID:  1,
			PayerName:   "Jane Smith",
			Amount:      decimal.NewFromFloat(2000.00),
			Status:      "paid",
			CreatedAt:   time.Now(),
		},
	}

	expectedResponse := &service.ListOrdersResponse{
		Orders:   expectedOrders,
		Total:    2,
		Page:     1,
		PageSize: 10,
	}

	suite.mockService.On("ListOrders", mock.Anything, mock.MatchedBy(func(req *service.ListOrdersRequest) bool {
		return req.Page == 1 && req.PageSize == 10
	})).Return(expectedResponse, nil)

	req := httptest.NewRequest("GET", "/api/v1/admin/orders?page=1&page_size=10", nil)
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	data := response["data"].(map[string]interface{})
	orders := data["orders"].([]interface{})
	suite.Len(orders, 2)
	suite.Equal(float64(2), data["total"])
	suite.Equal(float64(1), data["page"])
	
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestListOrders_WithFilters() {
	// Arrange
	expectedResponse := &service.ListOrdersResponse{
		Orders:   []*service.RechargeOrder{},
		Total:    0,
		Page:     1,
		PageSize: 10,
	}

	suite.mockService.On("ListOrders", mock.Anything, mock.MatchedBy(func(req *service.ListOrdersRequest) bool {
		return req.MerchantID == 1 && req.Status == "pending" && req.PaymentType == "corporate"
	})).Return(expectedResponse, nil)

	req := httptest.NewRequest("GET", "/api/v1/admin/orders?merchant_id=1&status=pending&payment_type=corporate", nil)
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusOK, w.Code)
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestUpdateOrderStatus_Success() {
	// Arrange
	orderNo := "RO20240812001"
	reqBody := map[string]interface{}{
		"status": "paid",
		"remark": "Payment confirmed",
	}

	suite.mockService.On("UpdateOrderStatus", mock.Anything, orderNo, "paid", "Payment confirmed").Return(nil)

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/orders/%s/status", orderNo), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusOK, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	suite.Equal("Order status updated successfully", response["message"])
	suite.mockService.AssertExpectations(suite.T())
}

func (suite *RechargeAPIIntegrationTestSuite) TestUpdateOrderStatus_InvalidStatus() {
	// Arrange
	orderNo := "RO20240812001"
	reqBody := map[string]interface{}{
		"status": "invalid_status",
		"remark": "Test remark",
	}

	jsonBody, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", fmt.Sprintf("/api/v1/admin/orders/%s/status", orderNo), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Act
	suite.router.ServeHTTP(w, req)

	// Assert
	suite.Equal(http.StatusBadRequest, w.Code)
	
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)
	
	errorMsg := response["error"].(map[string]interface{})["message"].(string)
	suite.Contains(errorMsg, "invalid status")
}

func (suite *RechargeAPIIntegrationTestSuite) TestConcurrentRequests() {
	// Test concurrent API requests
	concurrency := 10
	results := make(chan int, concurrency)

	// Setup mock for concurrent requests
	expectedOrder := &service.RechargeOrder{
		ID:      1,
		OrderNo: "RO20240812001",
		Status:  "pending",
	}
	suite.mockService.On("GetRechargeOrder", mock.Anything, "RO20240812001").Return(expectedOrder, nil)

	for i := 0; i < concurrency; i++ {
		go func() {
			req := httptest.NewRequest("GET", "/api/v1/recharge/orders/RO20240812001", nil)
			w := httptest.NewRecorder()
			suite.router.ServeHTTP(w, req)
			results <- w.Code
		}()
	}

	// Collect results
	for i := 0; i < concurrency; i++ {
		statusCode := <-results
		suite.Equal(http.StatusOK, statusCode)
	}
}

func (suite *RechargeAPIIntegrationTestSuite) TestRateLimiting() {
	// Test rate limiting (if implemented)
	// This would test the rate limiting middleware
	orderNo := "RO20240812001"
	expectedOrder := &service.RechargeOrder{
		ID:      1,
		OrderNo: orderNo,
		Status:  "pending",
	}
	suite.mockService.On("GetRechargeOrder", mock.Anything, orderNo).Return(expectedOrder, nil)

	// Make multiple rapid requests
	successCount := 0
	rateLimitedCount := 0

	for i := 0; i < 100; i++ {
		req := httptest.NewRequest("GET", fmt.Sprintf("/api/v1/recharge/orders/%s", orderNo), nil)
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)

		if w.Code == http.StatusOK {
			successCount++
		} else if w.Code == http.StatusTooManyRequests {
			rateLimitedCount++
		}
	}

	// At least some requests should succeed
	suite.Greater(successCount, 0)
}

func (suite *RechargeAPIIntegrationTestSuite) TestErrorHandling() {
	// Test various error scenarios
	testCases := []struct {
		name           string
		method         string
		url            string
		body           interface{}
		mockSetup      func()
		expectedStatus int
		expectedError  string
	}{
		{
			name:   "invalid JSON",
			method: "POST",
			url:    "/api/v1/recharge/orders",
			body:   "invalid json",
			mockSetup: func() {
				// No mock setup needed for JSON parsing error
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid JSON",
		},
		{
			name:   "service unavailable",
			method: "GET",
			url:    "/api/v1/recharge/orders/RO20240812001",
			body:   nil,
			mockSetup: func() {
				suite.mockService.On("GetRechargeOrder", mock.Anything, "RO20240812001").Return(nil, fmt.Errorf("database connection failed"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "internal server error",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			// Setup
			tc.mockSetup()

			var reqBody []byte
			if tc.body != nil {
				if str, ok := tc.body.(string); ok {
					reqBody = []byte(str)
				} else {
					reqBody, _ = json.Marshal(tc.body)
				}
			}

			req := httptest.NewRequest(tc.method, tc.url, bytes.NewBuffer(reqBody))
			if tc.body != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			w := httptest.NewRecorder()

			// Act
			suite.router.ServeHTTP(w, req)

			// Assert
			suite.Equal(tc.expectedStatus, w.Code)
			
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			suite.NoError(err)
			
			if errorInfo, exists := response["error"]; exists {
				errorMsg := errorInfo.(map[string]interface{})["message"].(string)
				suite.Contains(errorMsg, tc.expectedError)
			}
		})
	}
}

// Run the integration test suite
func TestRechargeAPIIntegrationTestSuite(t *testing.T) {
	suite.Run(t, new(RechargeAPIIntegrationTestSuite))
}

// Performance benchmark for API endpoints
func BenchmarkRechargeAPI_CreateOrder(b *testing.B) {
	gin.SetMode(gin.TestMode)
	
	mockService := new(MockRechargeService)
	handler := NewRechargeTestingHandler(mockService)
	
	router := gin.New()
	router.POST("/api/v1/recharge/orders", handler.CreateRechargeOrder)

	expectedOrder := &service.RechargeOrder{
		ID:      1,
		OrderNo: "RO20240812001",
		Status:  "pending",
	}
	mockService.On("CreateRechargeOrder", mock.Anything, mock.AnythingOfType("*service.CreateRechargeOrderRequest")).Return(expectedOrder, nil)

	reqBody := map[string]interface{}{
		"merchant_id":  1,
		"payer_name":   "John Doe",
		"amount":       "1000.00",
		"ad_account":   "AD123456",
		"payment_type": "corporate",
	}
	jsonBody, _ := json.Marshal(reqBody)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			b.Fatalf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}
	}
}

func BenchmarkRechargeAPI_GetOrder(b *testing.B) {
	gin.SetMode(gin.TestMode)
	
	mockService := new(MockRechargeService)
	handler := NewRechargeTestingHandler(mockService)
	
	router := gin.New()
	router.GET("/api/v1/recharge/orders/:orderNo", handler.GetRechargeOrder)

	expectedOrder := &service.RechargeOrder{
		ID:      1,
		OrderNo: "RO20240812001",
		Status:  "pending",
	}
	mockService.On("GetRechargeOrder", mock.Anything, "RO20240812001").Return(expectedOrder, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/api/v1/recharge/orders/RO20240812001", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Fatalf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
	}
}
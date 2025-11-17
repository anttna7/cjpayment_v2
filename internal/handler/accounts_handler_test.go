package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockReceiveAccountService is a mock implementation of ReceiveAccountService
type MockReceiveAccountService struct {
	mock.Mock
}

func (m *MockReceiveAccountService) CreateReceiveAccount(ctx context.Context, req *service.CreateReceiveAccountRequest) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountService) GetReceiveAccount(ctx context.Context, id uuid.UUID) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountService) UpdateReceiveAccount(ctx context.Context, id uuid.UUID, req *service.UpdateReceiveAccountRequest) (*repository.ReceiveAccount, error) {
	args := m.Called(ctx, id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountService) DeleteReceiveAccount(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockReceiveAccountService) RestoreReceiveAccount(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockReceiveAccountService) ListReceiveAccounts(ctx context.Context, filter *repository.ReceiveAccountFilter) ([]*repository.ReceiveAccount, int64, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*repository.ReceiveAccount), args.Get(1).(int64), args.Error(2)
}

func (m *MockReceiveAccountService) GetAccountsByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountService) UpdateAccountStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockReceiveAccountService) SetAccountLimits(ctx context.Context, id uuid.UUID, req *service.SetAccountLimitsRequest) error {
	args := m.Called(ctx, id, req)
	return args.Error(0)
}

func (m *MockReceiveAccountService) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID, amount, paymentType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountService) AssignAccountToMerchant(ctx context.Context, req *service.AssignAccountToMerchantRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockReceiveAccountService) RemoveAccountFromMerchant(ctx context.Context, merchantID, accountID uuid.UUID) error {
	args := m.Called(ctx, merchantID, accountID)
	return args.Error(0)
}

func (m *MockReceiveAccountService) UpdateAccountWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error {
	args := m.Called(ctx, merchantID, accountID, weight)
	return args.Error(0)
}

// Test helper functions
func setupTestHandler() (*Handler, *MockReceiveAccountService) {
	mockService := &MockReceiveAccountService{}
	
	handler := &Handler{
		accountService: mockService,
	}
	
	return handler, mockService
}

func createTestReceiveAccountForHandler() *repository.ReceiveAccount {
	return &repository.ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account",
		AccountNumber: "1234567890",
		AccountType:   "alipay",
		AccountHolder: "Test Holder",
		PaymentType:   "public",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.Zero,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

// Test ListAccounts
func TestHandler_ListAccounts(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		queryParams    string
		setupMock      func(*MockReceiveAccountService)
		expectedStatus int
		expectedError  string
	}{
		{
			name:        "successful list without filters",
			queryParams: "",
			setupMock: func(mockService *MockReceiveAccountService) {
				accounts := []*repository.ReceiveAccount{createTestReceiveAccountForHandler()}
				mockService.On("ListReceiveAccounts", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).
					Return(accounts, int64(1), nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  "",
		},
		{
			name:        "successful list with filters",
			queryParams: "?type=alipay&status=active&page=1&limit=10",
			setupMock: func(mockService *MockReceiveAccountService) {
				accounts := []*repository.ReceiveAccount{createTestReceiveAccountForHandler()}
				mockService.On("ListReceiveAccounts", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).
					Return(accounts, int64(1), nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  "",
		},
		{
			name:        "service error",
			queryParams: "",
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("ListReceiveAccounts", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).
					Return(nil, int64(0), errors.New("service error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "Failed to list accounts",
		},
		{
			name:        "account service not initialized",
			queryParams: "",
			setupMock:   func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "Account service is not initialized",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, mockService := setupTestHandler()
			
			// For the "account service not initialized" test, set accountService to nil
			if tt.name == "account service not initialized" {
				handler.accountService = nil
			} else {
				tt.setupMock(mockService)
			}

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			
			req, _ := http.NewRequest("GET", "/api/v1/accounts"+tt.queryParams, nil)
			c.Request = req

			handler.ListAccounts(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			} else {
				assert.True(t, response["success"].(bool))
				assert.NotNil(t, response["data"])
			}

			if handler.accountService != nil {
				mockService.AssertExpectations(t)
			}
		})
	}
}

// Test CreateAccount
func TestHandler_CreateAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    interface{}
		setupMock      func(*MockReceiveAccountService)
		expectedStatus int
		expectedError  string
	}{
		{
			name: "successful creation",
			requestBody: service.CreateReceiveAccountRequest{
				AccountName:   "Test Account",
				AccountNumber: "1234567890",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			setupMock: func(mockService *MockReceiveAccountService) {
				account := createTestReceiveAccountForHandler()
				mockService.On("CreateReceiveAccount", mock.Anything, mock.AnythingOfType("*service.CreateReceiveAccountRequest")).
					Return(account, nil)
			},
			expectedStatus: http.StatusCreated,
			expectedError:  "",
		},
		{
			name:        "invalid request body",
			requestBody: "invalid json",
			setupMock:   func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request format",
		},
		{
			name: "service error",
			requestBody: service.CreateReceiveAccountRequest{
				AccountName:   "Test Account",
				AccountNumber: "1234567890",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "public",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
			},
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("CreateReceiveAccount", mock.Anything, mock.AnythingOfType("*service.CreateReceiveAccountRequest")).
					Return(nil, errors.New("service error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "Failed to create account",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, mockService := setupTestHandler()
			tt.setupMock(mockService)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			var body []byte
			var err error
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, err = json.Marshal(tt.requestBody)
				assert.NoError(t, err)
			}

			req, _ := http.NewRequest("POST", "/api/v1/accounts", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			handler.CreateAccount(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			} else {
				assert.True(t, response["success"].(bool))
				assert.NotNil(t, response["data"])
			}

			mockService.AssertExpectations(t)
		})
	}
}

// Test GetAccount
func TestHandler_GetAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	validID := uuid.New()
	account := createTestReceiveAccountForHandler()
	account.ID = validID

	tests := []struct {
		name           string
		accountID      string
		setupMock      func(*MockReceiveAccountService)
		expectedStatus int
		expectedError  string
	}{
		{
			name:      "successful retrieval",
			accountID: validID.String(),
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("GetReceiveAccount", mock.Anything, validID).
					Return(account, nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  "",
		},
		{
			name:           "invalid account ID format",
			accountID:      "invalid-uuid",
			setupMock:      func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid account ID format",
		},
		{
			name:      "account not found",
			accountID: validID.String(),
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("GetReceiveAccount", mock.Anything, validID).
					Return(nil, errors.New("account not found"))
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  "Account not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, mockService := setupTestHandler()
			tt.setupMock(mockService)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("GET", "/api/v1/accounts/"+tt.accountID, nil)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: tt.accountID}}

			handler.GetAccount(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			} else {
				assert.True(t, response["success"].(bool))
				assert.NotNil(t, response["data"])
			}

			mockService.AssertExpectations(t)
		})
	}
}

// Test UpdateAccount
func TestHandler_UpdateAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	validID := uuid.New()
	account := createTestReceiveAccountForHandler()
	account.ID = validID

	tests := []struct {
		name           string
		accountID      string
		requestBody    interface{}
		setupMock      func(*MockReceiveAccountService)
		expectedStatus int
		expectedError  string
	}{
		{
			name:      "successful update",
			accountID: validID.String(),
			requestBody: service.UpdateReceiveAccountRequest{
				AccountName: stringPtr("Updated Account"),
				Status:      stringPtr("inactive"),
			},
			setupMock: func(mockService *MockReceiveAccountService) {
				updatedAccount := *account
				updatedAccount.AccountName = "Updated Account"
				updatedAccount.Status = "inactive"
				mockService.On("UpdateReceiveAccount", mock.Anything, validID, mock.AnythingOfType("*service.UpdateReceiveAccountRequest")).
					Return(&updatedAccount, nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  "",
		},
		{
			name:           "invalid account ID format",
			accountID:      "invalid-uuid",
			requestBody:    service.UpdateReceiveAccountRequest{},
			setupMock:      func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid account ID format",
		},
		{
			name:        "invalid request body",
			accountID:   validID.String(),
			requestBody: "invalid json",
			setupMock:   func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request format",
		},
		{
			name:      "service error",
			accountID: validID.String(),
			requestBody: service.UpdateReceiveAccountRequest{
				AccountName: stringPtr("Updated Account"),
			},
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("UpdateReceiveAccount", mock.Anything, validID, mock.AnythingOfType("*service.UpdateReceiveAccountRequest")).
					Return(nil, errors.New("service error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "Failed to update account",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, mockService := setupTestHandler()
			tt.setupMock(mockService)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			var body []byte
			var err error
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, err = json.Marshal(tt.requestBody)
				assert.NoError(t, err)
			}

			req, _ := http.NewRequest("PUT", "/api/v1/accounts/"+tt.accountID, bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: tt.accountID}}

			handler.UpdateAccount(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			} else {
				assert.True(t, response["success"].(bool))
				assert.NotNil(t, response["data"])
			}

			mockService.AssertExpectations(t)
		})
	}
}

// Test DeleteAccount
func TestHandler_DeleteAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	validID := uuid.New()

	tests := []struct {
		name           string
		accountID      string
		setupMock      func(*MockReceiveAccountService)
		expectedStatus int
		expectedError  string
	}{
		{
			name:      "successful deletion",
			accountID: validID.String(),
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("DeleteReceiveAccount", mock.Anything, validID).
					Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  "",
		},
		{
			name:           "invalid account ID format",
			accountID:      "invalid-uuid",
			setupMock:      func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid account ID format",
		},
		{
			name:      "service error",
			accountID: validID.String(),
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("DeleteReceiveAccount", mock.Anything, validID).
					Return(errors.New("service error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "Failed to delete account",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, mockService := setupTestHandler()
			tt.setupMock(mockService)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("DELETE", "/api/v1/accounts/"+tt.accountID, nil)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: tt.accountID}}

			handler.DeleteAccount(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			} else {
				assert.True(t, response["success"].(bool))
				assert.Contains(t, response["message"], "deleted successfully")
			}

			mockService.AssertExpectations(t)
		})
	}
}

// Test RestoreAccount
func TestHandler_RestoreAccount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	validID := uuid.New()

	tests := []struct {
		name           string
		accountID      string
		setupMock      func(*MockReceiveAccountService)
		expectedStatus int
		expectedError  string
	}{
		{
			name:      "successful restoration",
			accountID: validID.String(),
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("RestoreReceiveAccount", mock.Anything, validID).
					Return(nil)
			},
			expectedStatus: http.StatusOK,
			expectedError:  "",
		},
		{
			name:           "invalid account ID format",
			accountID:      "invalid-uuid",
			setupMock:      func(mockService *MockReceiveAccountService) {},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid account ID format",
		},
		{
			name:      "service error",
			accountID: validID.String(),
			setupMock: func(mockService *MockReceiveAccountService) {
				mockService.On("RestoreReceiveAccount", mock.Anything, validID).
					Return(errors.New("service error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedError:  "Failed to restore account",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, mockService := setupTestHandler()
			tt.setupMock(mockService)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			req, _ := http.NewRequest("POST", "/api/v1/accounts/"+tt.accountID+"/restore", nil)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: tt.accountID}}

			handler.RestoreAccount(c)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			assert.NoError(t, err)

			if tt.expectedError != "" {
				assert.Contains(t, response["error"], tt.expectedError)
			} else {
				assert.True(t, response["success"].(bool))
				assert.Contains(t, response["message"], "restored successfully")
			}

			mockService.AssertExpectations(t)
		})
	}
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
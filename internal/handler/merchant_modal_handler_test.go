package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestHandler(t *testing.T) *Handler {
	// Setup test database
	db := setupTestDB(t)
	
	// Create test config
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			DBName:   "test_db",
			User:     "test_user",
			Password: "test_pass",
		},
	}
	
	// Create handler
	handler := New(db, cfg)
	
	return handler
}

func setupTestRouter(handler *Handler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler.RegisterRoutes(router)
	return router
}

func TestCreateMerchantModal(t *testing.T) {
	handler := setupTestHandler(t)
	router := setupTestRouter(handler)

	tests := []struct {
		name           string
		payload        service.CreateMerchantRequest
		expectedStatus int
		expectedError  string
	}{
		{
			name: "成功创建商户",
			payload: service.CreateMerchantRequest{
				Name: "测试公司",
				Code: "TEST001",
				ReceiveAccount: &service.CreateReceiveAccountRequest{
					AccountName:   "测试账户",
					AccountNumber: "123456789",
					AccountType:   "bank",
					AccountHolder: "张三",
					PaymentType:   "private",
					DailyLimit:    decimal.NewFromInt(10000),
					SingleLimit:   decimal.NewFromInt(5000),
				},
				AgentName: stringPtrModal("测试代理商"),
				PortName:  stringPtrModal("test_port"),
				Remark:    stringPtrModal("测试备注"),
			},
			expectedStatus: http.StatusCreated,
		},
		{
			name: "公司名称重复",
			payload: service.CreateMerchantRequest{
				Name: "已存在公司",
				Code: "TEST002",
			},
			expectedStatus: http.StatusConflict,
			expectedError:  "MERCHANT_NAME_EXISTS",
		},
		{
			name: "限额验证失败",
			payload: service.CreateMerchantRequest{
				Name: "测试公司2",
				Code: "TEST003",
				ReceiveAccount: &service.CreateReceiveAccountRequest{
					AccountName:   "测试账户",
					AccountNumber: "987654321",
					AccountType:   "bank",
					AccountHolder: "李四",
					PaymentType:   "private",
					DailyLimit:    decimal.NewFromInt(1000),
					SingleLimit:   decimal.NewFromInt(2000), // 单笔大于单日
				},
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "LIMIT_VALIDATION_ERROR",
		},
		{
			name: "端口名称重复",
			payload: service.CreateMerchantRequest{
				Name:     "测试公司3",
				Code:     "TEST004",
				PortName: stringPtrModal("existing_port"),
			},
			expectedStatus: http.StatusConflict,
			expectedError:  "PORT_NAME_EXISTS",
		},
		{
			name: "收款账号重复",
			payload: service.CreateMerchantRequest{
				Name: "测试公司4",
				Code: "TEST005",
				ReceiveAccount: &service.CreateReceiveAccountRequest{
					AccountName:   "测试账户",
					AccountNumber: "existing_account",
					AccountType:   "bank",
					AccountHolder: "王五",
					PaymentType:   "private",
					DailyLimit:    decimal.NewFromInt(10000),
					SingleLimit:   decimal.NewFromInt(5000),
				},
			},
			expectedStatus: http.StatusConflict,
			expectedError:  "ACCOUNT_NUMBER_EXISTS",
		},
		{
			name: "缺少自定义支付机构",
			payload: service.CreateMerchantRequest{
				Name: "测试公司5",
				Code: "TEST006",
				ReceiveAccount: &service.CreateReceiveAccountRequest{
					AccountName:   "测试账户",
					AccountNumber: "123456780",
					AccountType:   "other", // 选择其它但未提供自定义支付机构
					AccountHolder: "赵六",
					PaymentType:   "private",
					DailyLimit:    decimal.NewFromInt(10000),
					SingleLimit:   decimal.NewFromInt(5000),
				},
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "MISSING_PAYMENT_PROVIDER",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup test data if needed
			if tt.name == "公司名称重复" {
				// Pre-create a merchant with the same name
				setupExistingMerchant(t, handler, "已存在公司")
			}
			if tt.name == "端口名称重复" {
				// Pre-create a merchant with the same port name
				setupExistingMerchantWithPort(t, handler, "existing_port")
			}
			if tt.name == "收款账号重复" {
				// Pre-create an account with the same number
				setupExistingAccount(t, handler, "existing_account")
			}

			body, _ := json.Marshal(tt.payload)
			req := httptest.NewRequest("POST", "/api/v1/merchants", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				var response service.ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedError, response.Code)
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
				assert.NotNil(t, response["data"])
			}
		})
	}
}

func TestUpdateMerchantModal(t *testing.T) {
	handler := setupTestHandler(t)
	router := setupTestRouter(handler)

	// Create a test merchant first
	merchantID := setupTestMerchant(t, handler)

	tests := []struct {
		name           string
		merchantID     string
		payload        service.UpdateMerchantRequest
		expectedStatus int
		expectedError  string
	}{
		{
			name:       "成功更新商户",
			merchantID: merchantID.String(),
			payload: service.UpdateMerchantRequest{
				Name:      stringPtrModal("更新后的公司名称"),
				AgentName: stringPtrModal("更新后的代理商"),
				Remark:    stringPtrModal("更新后的备注"),
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:       "无效的商户ID",
			merchantID: "invalid-uuid",
			payload: service.UpdateMerchantRequest{
				Name: stringPtrModal("测试更新"),
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_MERCHANT_ID",
		},
		{
			name:       "商户不存在",
			merchantID: uuid.New().String(),
			payload: service.UpdateMerchantRequest{
				Name: stringPtrModal("测试更新"),
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.payload)
			req := httptest.NewRequest("PUT", "/api/v1/merchants/"+tt.merchantID, bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				var response service.ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedError, response.Code)
			}
		})
	}
}

func TestGetMerchantWithAccounts(t *testing.T) {
	handler := setupTestHandler(t)
	router := setupTestRouter(handler)

	// Create a test merchant with accounts
	merchantID := setupTestMerchantWithAccounts(t, handler)

	tests := []struct {
		name           string
		merchantID     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "成功获取商户及关联账户",
			merchantID:     merchantID.String(),
			expectedStatus: http.StatusOK,
		},
		{
			name:           "无效的商户ID",
			merchantID:     "invalid-uuid",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_MERCHANT_ID",
		},
		{
			name:           "商户不存在",
			merchantID:     uuid.New().String(),
			expectedStatus: http.StatusNotFound,
			expectedError:  "MERCHANT_NOT_FOUND",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/v1/merchants/"+tt.merchantID, nil)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				var response service.ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedError, response.Code)
			} else if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
				
				data := response["data"].(map[string]interface{})
				assert.NotNil(t, data["id"])
				assert.NotNil(t, data["name"])
				assert.NotNil(t, data["accounts"])
			}
		})
	}
}

func TestGetAgentSuggestions(t *testing.T) {
	handler := setupTestHandler(t)
	router := setupTestRouter(handler)

	// Setup test agent suggestions
	setupTestAgentSuggestions(t, handler)

	tests := []struct {
		name           string
		query          string
		limit          string
		expectedStatus int
		expectedCount  int
	}{
		{
			name:           "获取所有建议",
			query:          "",
			limit:          "10",
			expectedStatus: http.StatusOK,
			expectedCount:  3,
		},
		{
			name:           "按查询过滤建议",
			query:          "代理",
			limit:          "5",
			expectedStatus: http.StatusOK,
			expectedCount:  2,
		},
		{
			name:           "限制返回数量",
			query:          "",
			limit:          "1",
			expectedStatus: http.StatusOK,
			expectedCount:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/v1/agents/suggestions?q=" + tt.query + "&limit=" + tt.limit
			req := httptest.NewRequest("GET", url, nil)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.True(t, response["success"].(bool))
				
				data := response["data"].([]interface{})
				assert.Len(t, data, tt.expectedCount)
			}
		})
	}
}

func TestValidatePortName(t *testing.T) {
	handler := setupTestHandler(t)
	router := setupTestRouter(handler)

	// Setup existing port name
	setupExistingMerchantWithPort(t, handler, "existing_port")

	tests := []struct {
		name           string
		portName       string
		expectedStatus int
		expectedValid  bool
		expectedAvail  bool
	}{
		{
			name:           "有效且可用的端口名称",
			portName:       "new_port_123",
			expectedStatus: http.StatusOK,
			expectedValid:  true,
			expectedAvail:  true,
		},
		{
			name:           "有效但已存在的端口名称",
			portName:       "existing_port",
			expectedStatus: http.StatusOK,
			expectedValid:  true,
			expectedAvail:  false,
		},
		{
			name:           "无效的端口名称格式",
			portName:       "invalid port name!",
			expectedStatus: http.StatusOK,
			expectedValid:  false,
			expectedAvail:  false,
		},
		{
			name:           "空端口名称",
			portName:       "",
			expectedStatus: http.StatusBadRequest,
			expectedValid:  false,
			expectedAvail:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/v1/ports/validate?port_name=" + tt.portName
			req := httptest.NewRequest("GET", url, nil)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == http.StatusOK {
				var response service.PortValidationResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedValid, response.IsValid)
				assert.Equal(t, tt.expectedAvail, response.Available)
			}
		})
	}
}

// Helper functions for test setup

func stringPtrModal(s string) *string {
	return &s
}

func setupTestDB(t *testing.T) *sqlx.DB {
	// This would normally connect to a test database
	// For now, return nil and mock the dependencies
	return nil
}

func setupExistingMerchant(t *testing.T, handler *Handler, name string) {
	// Create a merchant with the given name
	req := &service.CreateMerchantRequest{
		Name: name,
		Code: "EXISTING001",
	}
	_, err := handler.merchantService.CreateMerchant(context.Background(), req)
	require.NoError(t, err)
}

func setupExistingMerchantWithPort(t *testing.T, handler *Handler, portName string) {
	// Create a merchant with the given port name
	req := &service.CreateMerchantRequest{
		Name:     "Existing Merchant",
		Code:     "EXISTING002",
		PortName: &portName,
	}
	_, err := handler.merchantService.CreateMerchant(context.Background(), req)
	require.NoError(t, err)
}

func setupExistingAccount(t *testing.T, handler *Handler, accountNumber string) {
	// Create an account with the given account number
	req := &service.CreateReceiveAccountRequest{
		AccountName:   "Existing Account",
		AccountNumber: accountNumber,
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   "private",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(5000),
	}
	_, err := handler.accountService.CreateReceiveAccount(context.Background(), req)
	require.NoError(t, err)
}

func setupTestMerchant(t *testing.T, handler *Handler) uuid.UUID {
	req := &service.CreateMerchantRequest{
		Name: "Test Merchant",
		Code: "TEST001",
	}
	merchant, err := handler.merchantService.CreateMerchant(context.Background(), req)
	require.NoError(t, err)
	return merchant.ID
}

func setupTestMerchantWithAccounts(t *testing.T, handler *Handler) uuid.UUID {
	// Create merchant
	merchantID := setupTestMerchant(t, handler)
	
	// Create and associate account
	accountReq := &service.CreateReceiveAccountRequest{
		AccountName:   "Test Account",
		AccountNumber: "123456789",
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   "private",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(5000),
	}
	account, err := handler.accountService.CreateReceiveAccount(context.Background(), accountReq)
	require.NoError(t, err)
	
	// Associate account with merchant
	assignReq := &service.AssignAccountToMerchantRequest{
		MerchantID:       merchantID,
		ReceiveAccountID: account.ID,
		Weight:           100,
	}
	err = handler.accountService.AssignAccountToMerchant(context.Background(), assignReq)
	require.NoError(t, err)
	
	return merchantID
}

func setupTestAgentSuggestions(t *testing.T, handler *Handler) {
	// This would normally insert test data into the agent_suggestions table
	// For now, we'll assume the repository is mocked
}
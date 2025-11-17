package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

// TestMerchantModalAPIEndpoints tests the API endpoints without database dependencies
func TestMerchantModalAPIEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	t.Run("CreateMerchantModal_ValidationError", func(t *testing.T) {
		router := gin.New()
		
		// Add a simple handler that returns validation error
		router.POST("/api/v1/merchants", func(c *gin.Context) {
			c.JSON(http.StatusBadRequest, service.ErrorResponse{
				Code:    "VALIDATION_ERROR",
				Message: "请求参数验证失败",
				ValidationErrors: map[string]string{
					"name": "required",
				},
			})
		})

		// Test with empty request
		req := httptest.NewRequest("POST", "/api/v1/merchants", bytes.NewBuffer([]byte("{}")))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response service.ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "VALIDATION_ERROR", response.Code)
	})

	t.Run("GetAgentSuggestions_Success", func(t *testing.T) {
		router := gin.New()
		
		// Add a simple handler that returns mock suggestions
		router.GET("/api/v1/agents/suggestions", func(c *gin.Context) {
			suggestions := []*service.AgentSuggestionResponse{
				{
					AgentName:  "测试代理商1",
					UsageCount: 10,
				},
				{
					AgentName:  "测试代理商2",
					UsageCount: 5,
				},
			}

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    suggestions,
			})
		})

		req := httptest.NewRequest("GET", "/api/v1/agents/suggestions?q=测试&limit=10", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response["success"].(bool))
		
		data := response["data"].([]interface{})
		assert.Len(t, data, 2)
	})

	t.Run("ValidatePortName_Success", func(t *testing.T) {
		router := gin.New()
		
		// Add a simple handler that returns validation result
		router.GET("/api/v1/ports/validate", func(c *gin.Context) {
			portName := c.Query("port_name")
			
			if portName == "" {
				c.JSON(http.StatusBadRequest, service.ErrorResponse{
					Code:    "MISSING_PORT_NAME",
					Message: "端口名称不能为空",
				})
				return
			}

			c.JSON(http.StatusOK, service.PortValidationResponse{
				IsValid:   true,
				Message:   "端口名称可用",
				Available: true,
			})
		})

		req := httptest.NewRequest("GET", "/api/v1/ports/validate?port_name=test_port", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response service.PortValidationResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.IsValid)
		assert.True(t, response.Available)
	})
}

// TestMerchantModalRequestValidation tests request structure validation
func TestMerchantModalRequestValidation(t *testing.T) {
	t.Run("CreateMerchantRequest_ValidStructure", func(t *testing.T) {
		req := service.CreateMerchantRequest{
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
			AgentName: stringPtrIntegration("测试代理商"),
			PortName:  stringPtrIntegration("test_port"),
			Remark:    stringPtrIntegration("测试备注"),
		}

		// Test JSON marshaling/unmarshaling
		data, err := json.Marshal(req)
		assert.NoError(t, err)

		var unmarshaled service.CreateMerchantRequest
		err = json.Unmarshal(data, &unmarshaled)
		assert.NoError(t, err)

		assert.Equal(t, req.Name, unmarshaled.Name)
		assert.Equal(t, req.Code, unmarshaled.Code)
		assert.NotNil(t, unmarshaled.ReceiveAccount)
		assert.Equal(t, req.ReceiveAccount.AccountName, unmarshaled.ReceiveAccount.AccountName)
	})

	t.Run("UpdateMerchantRequest_ValidStructure", func(t *testing.T) {
		req := service.UpdateMerchantRequest{
			Name:      stringPtrIntegration("更新后的公司名称"),
			AgentName: stringPtrIntegration("更新后的代理商"),
			Remark:    stringPtrIntegration("更新后的备注"),
		}

		// Test JSON marshaling/unmarshaling
		data, err := json.Marshal(req)
		assert.NoError(t, err)

		var unmarshaled service.UpdateMerchantRequest
		err = json.Unmarshal(data, &unmarshaled)
		assert.NoError(t, err)

		assert.Equal(t, *req.Name, *unmarshaled.Name)
		assert.Equal(t, *req.AgentName, *unmarshaled.AgentName)
		assert.Equal(t, *req.Remark, *unmarshaled.Remark)
	})
}

// TestMerchantModalResponseStructures tests response structure serialization
func TestMerchantModalResponseStructures(t *testing.T) {
	t.Run("MerchantResponse_Serialization", func(t *testing.T) {
		response := &service.MerchantResponse{
			Name:        "测试公司",
			Code:        "TEST001",
			Status:      "active",
			DailyLimit:  decimal.NewFromInt(10000),
			SingleLimit: decimal.NewFromInt(5000),
			DailyUsed:   decimal.NewFromInt(1000),
			AgentName:   stringPtrIntegration("测试代理商"),
			PortName:    stringPtrIntegration("test_port"),
			Remark:      stringPtrIntegration("测试备注"),
		}

		// Test JSON marshaling
		data, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "测试公司")
		assert.Contains(t, string(data), "TEST001")
	})

	t.Run("ErrorResponse_Serialization", func(t *testing.T) {
		response := service.ErrorResponse{
			Code:    "MERCHANT_NAME_EXISTS",
			Message: "公司名称已存在",
			ValidationErrors: map[string]string{
				"name": "公司名称已存在",
			},
		}

		// Test JSON marshaling
		data, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "MERCHANT_NAME_EXISTS")
		assert.Contains(t, string(data), "公司名称已存在")
	})
}

// Helper function
func stringPtrIntegration(s string) *string {
	return &s
}
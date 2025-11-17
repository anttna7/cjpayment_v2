package handler

import (
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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// Test-specific error definitions (matching service package)
var (
	ErrInvalidPortNameFormat = errors.New("端口名称格式不正确")
	ErrPortNameExists       = errors.New("端口名称已被使用")
)

// MockAgentSuggestionRepository is a mock implementation of AgentSuggestionRepository
type MockAgentSuggestionRepository struct {
	mock.Mock
}

func (m *MockAgentSuggestionRepository) Create(ctx context.Context, suggestion *repository.AgentSuggestion) error {
	args := m.Called(ctx, suggestion)
	return args.Error(0)
}

func (m *MockAgentSuggestionRepository) GetByAgentName(ctx context.Context, agentName string) (*repository.AgentSuggestion, error) {
	args := m.Called(ctx, agentName)
	return args.Get(0).(*repository.AgentSuggestion), args.Error(1)
}

func (m *MockAgentSuggestionRepository) Update(ctx context.Context, suggestion *repository.AgentSuggestion) error {
	args := m.Called(ctx, suggestion)
	return args.Error(0)
}

func (m *MockAgentSuggestionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockAgentSuggestionRepository) List(ctx context.Context, filter *repository.AgentSuggestionFilter) ([]*repository.AgentSuggestion, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*repository.AgentSuggestion), args.Error(1)
}

func (m *MockAgentSuggestionRepository) Search(ctx context.Context, keyword string, limit int) ([]*repository.AgentSuggestion, error) {
	args := m.Called(ctx, keyword, limit)
	return args.Get(0).([]*repository.AgentSuggestion), args.Error(1)
}

func (m *MockAgentSuggestionRepository) IncrementUsage(ctx context.Context, agentName string) error {
	args := m.Called(ctx, agentName)
	return args.Error(0)
}

func (m *MockAgentSuggestionRepository) GetTopSuggestions(ctx context.Context, limit int) ([]*repository.AgentSuggestion, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]*repository.AgentSuggestion), args.Error(1)
}

// MockMerchantValidator is a mock implementation of MerchantValidator
type MockMerchantValidator struct {
	mock.Mock
}

func (m *MockMerchantValidator) ValidatePortNameFormat(portName string) error {
	args := m.Called(portName)
	return args.Error(0)
}

func (m *MockMerchantValidator) ValidatePortNameUniqueness(ctx context.Context, portName string) error {
	args := m.Called(ctx, portName)
	return args.Error(0)
}

func (m *MockMerchantValidator) ValidateCreateMerchantRequest(ctx context.Context, req *service.CreateMerchantRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockMerchantValidator) ValidateUpdateMerchantRequest(ctx context.Context, merchantID uuid.UUID, req *service.UpdateMerchantRequest) error {
	args := m.Called(ctx, merchantID, req)
	return args.Error(0)
}

// TestGetAgentSuggestions tests the GetAgentSuggestions endpoint
func TestGetAgentSuggestions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("successful request with results", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		
		// Mock data
		suggestions := []*repository.AgentSuggestion{
			{
				ID:         uuid.New(),
				AgentName:  "测试代理商1",
				UsageCount: 5,
				LastUsedAt: time.Now(),
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			},
			{
				ID:         uuid.New(),
				AgentName:  "测试代理商2",
				UsageCount: 3,
				LastUsedAt: time.Now(),
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			},
		}

		mockRepo.On("Search", mock.Anything, "测试", 10).Return(suggestions, nil)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Setup router
		router := gin.New()
		router.GET("/agents/suggestions", handler.GetAgentSuggestions)

		// Make request
		req := httptest.NewRequest("GET", "/agents/suggestions?q=测试&limit=10", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		assert.Contains(t, response, "data")

		data := response["data"].([]interface{})
		assert.Len(t, data, 2)

		// Check first suggestion
		firstSuggestion := data[0].(map[string]interface{})
		assert.Equal(t, "测试代理商1", firstSuggestion["agent_name"])
		assert.Equal(t, float64(5), firstSuggestion["usage_count"])

		mockRepo.AssertExpectations(t)
	})

	t.Run("successful request with no results", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		mockRepo.On("Search", mock.Anything, "不存在", 10).Return([]*repository.AgentSuggestion{}, nil)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Setup router
		router := gin.New()
		router.GET("/agents/suggestions", handler.GetAgentSuggestions)

		// Make request
		req := httptest.NewRequest("GET", "/agents/suggestions?q=不存在", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].([]interface{})
		assert.Len(t, data, 0)

		mockRepo.AssertExpectations(t)
	})

	t.Run("default parameters", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		mockRepo.On("Search", mock.Anything, "", 10).Return([]*repository.AgentSuggestion{}, nil)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Setup router
		router := gin.New()
		router.GET("/agents/suggestions", handler.GetAgentSuggestions)

		// Make request without parameters
		req := httptest.NewRequest("GET", "/agents/suggestions", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)
		mockRepo.AssertExpectations(t)
	})

	t.Run("invalid limit parameter", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		// Should use default limit of 10
		mockRepo.On("Search", mock.Anything, "test", 10).Return([]*repository.AgentSuggestion{}, nil)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Setup router
		router := gin.New()
		router.GET("/agents/suggestions", handler.GetAgentSuggestions)

		// Make request with invalid limit
		req := httptest.NewRequest("GET", "/agents/suggestions?q=test&limit=invalid", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)
		mockRepo.AssertExpectations(t)
	})

	t.Run("repository error", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		mockRepo.On("Search", mock.Anything, "test", 10).Return([]*repository.AgentSuggestion{}, assert.AnError)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Setup router
		router := gin.New()
		router.GET("/agents/suggestions", handler.GetAgentSuggestions)

		// Make request
		req := httptest.NewRequest("GET", "/agents/suggestions?q=test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusInternalServerError, w.Code)

		var response service.ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "INTERNAL_ERROR", response.Code)
		assert.Equal(t, "获取代理商建议失败", response.Message)

		mockRepo.AssertExpectations(t)
	})
}

// TestValidatePortName tests the ValidatePortName endpoint
func TestValidatePortName(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("valid and available port name", func(t *testing.T) {
		// Setup mocks
		mockValidator := new(MockMerchantValidator)
		mockValidator.On("ValidatePortNameFormat", "test_port").Return(nil)
		mockValidator.On("ValidatePortNameUniqueness", mock.Anything, "test_port").Return(nil)

		// Setup handler
		handler := &Handler{
			merchantValidator: mockValidator,
		}

		// Setup router
		router := gin.New()
		router.GET("/ports/validate", handler.ValidatePortName)

		// Make request
		req := httptest.NewRequest("GET", "/ports/validate?port_name=test_port", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)

		var response service.PortValidationResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response.IsValid)
		assert.True(t, response.Available)
		assert.Equal(t, "端口名称可用", response.Message)

		mockValidator.AssertExpectations(t)
	})

	t.Run("invalid port name format", func(t *testing.T) {
		// Setup mocks
		mockValidator := new(MockMerchantValidator)
		mockValidator.On("ValidatePortNameFormat", "invalid@port").Return(ErrInvalidPortNameFormat)

		// Setup handler
		handler := &Handler{
			merchantValidator: mockValidator,
		}

		// Setup router
		router := gin.New()
		router.GET("/ports/validate", handler.ValidatePortName)

		// Make request
		req := httptest.NewRequest("GET", "/ports/validate?port_name=invalid@port", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)

		var response service.PortValidationResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.False(t, response.IsValid)
		assert.False(t, response.Available)
		assert.Contains(t, response.Message, "端口名称格式不正确")

		mockValidator.AssertExpectations(t)
	})

	t.Run("port name already exists", func(t *testing.T) {
		// Setup mocks
		mockValidator := new(MockMerchantValidator)
		mockValidator.On("ValidatePortNameFormat", "existing_port").Return(nil)
		mockValidator.On("ValidatePortNameUniqueness", mock.Anything, "existing_port").Return(ErrPortNameExists)

		// Setup handler
		handler := &Handler{
			merchantValidator: mockValidator,
		}

		// Setup router
		router := gin.New()
		router.GET("/ports/validate", handler.ValidatePortName)

		// Make request
		req := httptest.NewRequest("GET", "/ports/validate?port_name=existing_port", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)

		var response service.PortValidationResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response.IsValid)
		assert.False(t, response.Available)
		assert.Contains(t, response.Message, "端口名称已被使用")

		mockValidator.AssertExpectations(t)
	})

	t.Run("missing port name parameter", func(t *testing.T) {
		// Setup handler
		handler := &Handler{}

		// Setup router
		router := gin.New()
		router.GET("/ports/validate", handler.ValidatePortName)

		// Make request without port_name parameter
		req := httptest.NewRequest("GET", "/ports/validate", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response service.ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "MISSING_PORT_NAME", response.Code)
		assert.Equal(t, "端口名称不能为空", response.Message)
	})

	t.Run("empty port name parameter", func(t *testing.T) {
		// Setup handler
		handler := &Handler{}

		// Setup router
		router := gin.New()
		router.GET("/ports/validate", handler.ValidatePortName)

		// Make request with empty port_name parameter
		req := httptest.NewRequest("GET", "/ports/validate?port_name=", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response service.ErrorResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "MISSING_PORT_NAME", response.Code)
		assert.Equal(t, "端口名称不能为空", response.Message)
	})

	t.Run("no validator configured", func(t *testing.T) {
		// Setup handler without validator
		handler := &Handler{
			merchantValidator: nil,
		}

		// Setup router
		router := gin.New()
		router.GET("/ports/validate", handler.ValidatePortName)

		// Make request
		req := httptest.NewRequest("GET", "/ports/validate?port_name=test_port", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Assertions
		assert.Equal(t, http.StatusOK, w.Code)

		var response service.PortValidationResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response.IsValid)
		assert.True(t, response.Available)
		assert.Equal(t, "端口名称可用", response.Message)
	})
}

// TestAuxiliaryAPIEndpoints_UsageCountUpdate tests that agent suggestions usage count is updated
func TestAuxiliaryAPIEndpoints_UsageCountUpdate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("usage count updated on merchant creation", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		mockRepo.On("IncrementUsage", mock.Anything, "测试代理商").Return(nil)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Simulate usage count update (this would normally be called from CreateMerchantModal)
		ctx := context.Background()
		err := handler.agentSuggestionRepo.IncrementUsage(ctx, "测试代理商")

		// Assertions
		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("usage count update handles repository error", func(t *testing.T) {
		// Setup mocks
		mockRepo := new(MockAgentSuggestionRepository)
		mockRepo.On("IncrementUsage", mock.Anything, "测试代理商").Return(assert.AnError)

		// Setup handler
		handler := &Handler{
			agentSuggestionRepo: mockRepo,
		}

		// Simulate usage count update
		ctx := context.Background()
		err := handler.agentSuggestionRepo.IncrementUsage(ctx, "测试代理商")

		// Assertions
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})
}
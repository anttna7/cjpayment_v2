package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"cjpayment/internal/service"
)

// MockDataExportService is a mock implementation of DataExportService
type MockDataExportService struct {
	mock.Mock
}

func (m *MockDataExportService) ExportTodayData(ctx context.Context, req *service.ExportRequest) (*service.ExportResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*service.ExportResponse), args.Error(1)
}

func (m *MockDataExportService) ExportYesterdayData(ctx context.Context, req *service.ExportRequest) (*service.ExportResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*service.ExportResponse), args.Error(1)
}

func (m *MockDataExportService) ExportOrderData(ctx context.Context, req *service.ExportRequest) (*service.ExportResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*service.ExportResponse), args.Error(1)
}

func (m *MockDataExportService) GetDailyReport(ctx context.Context, date time.Time) (*service.DailyReportSummary, error) {
	args := m.Called(ctx, date)
	return args.Get(0).(*service.DailyReportSummary), args.Error(1)
}

// MockScheduledExportService is a mock implementation of ScheduledExportService
type MockScheduledExportService struct {
	mock.Mock
}

func (m *MockScheduledExportService) CreateSchedule(ctx context.Context, schedule *service.ExportSchedule) error {
	args := m.Called(ctx, schedule)
	return args.Error(0)
}

func (m *MockScheduledExportService) UpdateSchedule(ctx context.Context, scheduleID uint, updates *service.ExportSchedule) error {
	args := m.Called(ctx, scheduleID, updates)
	return args.Error(0)
}

func (m *MockScheduledExportService) DeleteSchedule(ctx context.Context, scheduleID uint) error {
	args := m.Called(ctx, scheduleID)
	return args.Error(0)
}

func (m *MockScheduledExportService) ListSchedules(ctx context.Context) ([]service.ExportSchedule, error) {
	args := m.Called(ctx)
	return args.Get(0).([]service.ExportSchedule), args.Error(1)
}

func (m *MockScheduledExportService) ExecuteSchedule(ctx context.Context, scheduleID uint) (*service.ScheduledExportResult, error) {
	args := m.Called(ctx, scheduleID)
	return args.Get(0).(*service.ScheduledExportResult), args.Error(1)
}

func setupDataExportHandler() (*DataExportHandler, *MockDataExportService, *MockScheduledExportService) {
	mockDataExportService := &MockDataExportService{}
	mockScheduledExportService := &MockScheduledExportService{}
	handler := NewDataExportHandler(mockDataExportService, mockScheduledExportService)
	return handler, mockDataExportService, mockScheduledExportService
}

func TestDataExportHandler_ExportTodayData(t *testing.T) {
	handler, mockService, _ := setupDataExportHandler()

	// Setup mock expectations
	expectedResponse := &service.ExportResponse{
		FileName:    "recharge_orders_20240101_120000.xlsx",
		FileSize:    1024,
		RecordCount: 10,
		ExportedAt:  time.Now(),
		DownloadURL: "/api/exports/download/recharge_orders_20240101_120000.xlsx",
	}

	mockService.On("ExportTodayData", mock.AnythingOfType("*context.valueCtx"), mock.AnythingOfType("*service.ExportRequest")).
		Return(expectedResponse, nil)

	// Setup request
	requestBody := service.ExportRequest{
		IncludeSensitive: false,
		Format:          "excel",
	}
	jsonBody, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/exports/today", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.ExportTodayData(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response service.ExportResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedResponse.FileName, response.FileName)
	assert.Equal(t, expectedResponse.RecordCount, response.RecordCount)

	mockService.AssertExpectations(t)
}

func TestDataExportHandler_ExportYesterdayData(t *testing.T) {
	handler, mockService, _ := setupDataExportHandler()

	// Setup mock expectations
	expectedResponse := &service.ExportResponse{
		FileName:    "recharge_orders_20231231_120000.xlsx",
		FileSize:    2048,
		RecordCount: 15,
		ExportedAt:  time.Now(),
		DownloadURL: "/api/exports/download/recharge_orders_20231231_120000.xlsx",
	}

	mockService.On("ExportYesterdayData", mock.AnythingOfType("*context.valueCtx"), mock.AnythingOfType("*service.ExportRequest")).
		Return(expectedResponse, nil)

	// Setup request
	requestBody := service.ExportRequest{
		IncludeSensitive: true,
		Format:          "excel",
	}
	jsonBody, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/exports/yesterday", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.ExportYesterdayData(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response service.ExportResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedResponse.FileName, response.FileName)
	assert.Equal(t, expectedResponse.RecordCount, response.RecordCount)

	mockService.AssertExpectations(t)
}

func TestDataExportHandler_ExportCustomRange(t *testing.T) {
	handler, mockService, _ := setupDataExportHandler()

	// Setup mock expectations
	expectedResponse := &service.ExportResponse{
		FileName:    "recharge_orders_20240101_20240107_120000.xlsx",
		FileSize:    4096,
		RecordCount: 25,
		ExportedAt:  time.Now(),
		DownloadURL: "/api/exports/download/recharge_orders_20240101_20240107_120000.xlsx",
	}

	mockService.On("ExportOrderData", mock.AnythingOfType("*context.valueCtx"), mock.AnythingOfType("*service.ExportRequest")).
		Return(expectedResponse, nil)

	// Setup request
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2024, 1, 7, 23, 59, 59, 0, time.UTC)
	requestBody := service.ExportRequest{
		StartDate:        startDate,
		EndDate:          endDate,
		IncludeSensitive: false,
		Format:          "excel",
	}
	jsonBody, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/exports/custom", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.ExportCustomRange(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response service.ExportResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedResponse.FileName, response.FileName)
	assert.Equal(t, expectedResponse.RecordCount, response.RecordCount)

	mockService.AssertExpectations(t)
}

func TestDataExportHandler_ExportCustomRange_InvalidDateRange(t *testing.T) {
	handler, _, _ := setupDataExportHandler()

	// Setup request with invalid date range (end before start)
	startDate := time.Date(2024, 1, 7, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	requestBody := service.ExportRequest{
		StartDate: startDate,
		EndDate:   endDate,
		Format:   "excel",
	}
	jsonBody, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/exports/custom", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.ExportCustomRange(c)

	// Assertions
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "INVALID_DATE_RANGE", response.Code)
}

func TestDataExportHandler_GetDailyReport(t *testing.T) {
	handler, mockService, _ := setupDataExportHandler()

	// Setup mock expectations
	expectedReport := &service.DailyReportSummary{
		Date:            time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		TotalOrders:     100,
		TotalAmount:     decimal.NewFromFloat(50000.00),
		PendingOrders:   10,
		PaidOrders:      80,
		CompletedOrders: 70,
		CancelledOrders: 10,
		MerchantStats: []service.MerchantStat{
			{
				MerchantID:   1,
				MerchantName: "Test Merchant",
				OrderCount:   50,
				TotalAmount:  decimal.NewFromFloat(25000.00),
				SuccessRate:  80.0,
			},
		},
	}

	mockService.On("GetDailyReport", mock.AnythingOfType("*context.valueCtx"), mock.AnythingOfType("time.Time")).
		Return(expectedReport, nil)

	// Create HTTP request
	req, _ := http.NewRequest("GET", "/api/exports/daily-report?date=2024-01-01", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.GetDailyReport(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response service.DailyReportSummary
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedReport.TotalOrders, response.TotalOrders)
	assert.Equal(t, expectedReport.TotalAmount, response.TotalAmount)
	assert.Len(t, response.MerchantStats, 1)

	mockService.AssertExpectations(t)
}

func TestDataExportHandler_CreateExportSchedule(t *testing.T) {
	handler, _, mockScheduledService := setupDataExportHandler()

	// Setup mock expectations
	mockScheduledService.On("CreateSchedule", mock.AnythingOfType("*context.valueCtx"), mock.AnythingOfType("*service.ExportSchedule")).
		Return(nil)

	// Setup request
	requestBody := service.ExportSchedule{
		Name:        "Daily Export",
		Description: "Daily export of order data",
		ExportType:  "daily",
		Schedule:    "daily",
		EmailList:   "admin@example.com",
		Status:      "active",
	}
	jsonBody, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/exports/schedules", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.CreateExportSchedule(c)

	// Assertions
	assert.Equal(t, http.StatusCreated, w.Code)

	var response SuccessResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Export schedule created successfully", response.Message)

	mockScheduledService.AssertExpectations(t)
}

func TestDataExportHandler_ListExportSchedules(t *testing.T) {
	handler, _, mockScheduledService := setupDataExportHandler()

	// Setup mock expectations
	expectedSchedules := []service.ExportSchedule{
		{
			ID:          1,
			Name:        "Daily Export",
			Description: "Daily export of order data",
			ExportType:  "daily",
			Schedule:    "daily",
			Status:      "active",
			EmailList:   "admin@example.com",
		},
		{
			ID:          2,
			Name:        "Weekly Export",
			Description: "Weekly export of order data",
			ExportType:  "weekly",
			Schedule:    "weekly",
			Status:      "active",
			EmailList:   "manager@example.com",
		},
	}

	mockScheduledService.On("ListSchedules", mock.AnythingOfType("*context.valueCtx")).
		Return(expectedSchedules, nil)

	// Create HTTP request
	req, _ := http.NewRequest("GET", "/api/exports/schedules", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Execute handler
	handler.ListExportSchedules(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response []service.ExportSchedule
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 2)
	assert.Equal(t, expectedSchedules[0].Name, response[0].Name)
	assert.Equal(t, expectedSchedules[1].Name, response[1].Name)

	mockScheduledService.AssertExpectations(t)
}

func TestDataExportHandler_ExecuteSchedule(t *testing.T) {
	handler, _, mockScheduledService := setupDataExportHandler()

	// Setup mock expectations
	expectedResult := &service.ScheduledExportResult{
		ScheduleID:   1,
		ScheduleName: "Daily Export",
		ExportResult: &service.ExportResponse{
			FileName:    "recharge_orders_20240101_120000.xlsx",
			FileSize:    1024,
			RecordCount: 10,
			ExportedAt:  time.Now(),
			DownloadURL: "/api/exports/download/recharge_orders_20240101_120000.xlsx",
		},
		Success:    true,
		ExecutedAt: time.Now(),
	}

	mockScheduledService.On("ExecuteSchedule", mock.AnythingOfType("*context.valueCtx"), uint(1)).
		Return(expectedResult, nil)

	// Create HTTP request
	req, _ := http.NewRequest("POST", "/api/exports/schedules/1/execute", nil)

	// Create response recorder
	w := httptest.NewRecorder()

	// Setup Gin context
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = []gin.Param{{Key: "id", Value: "1"}}

	// Execute handler
	handler.ExecuteSchedule(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response service.ScheduledExportResult
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, expectedResult.ScheduleID, response.ScheduleID)
	assert.Equal(t, expectedResult.ScheduleName, response.ScheduleName)
	assert.True(t, response.Success)

	mockScheduledService.AssertExpectations(t)
}
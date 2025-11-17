package service

import (
	"context"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestReportGenerator_GenerateReport(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	ctx := context.Background()

	// Mock data for transaction report
	mockOrders := []*repository.RechargeOrder{
		{
			ID:           uuid.New(),
			OrderNumber:  "ORD001",
			PayerName:    "John Doe",
			PayerAccount: "123456789",
			Amount:       decimal.NewFromInt(1000),
			MerchantID:   uuid.New(),
			Status:       "completed",
			PaymentType:  "private",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		{
			ID:           uuid.New(),
			OrderNumber:  "ORD002",
			PayerName:    "Jane Smith",
			PayerAccount: "987654321",
			Amount:       decimal.NewFromInt(2000),
			MerchantID:   uuid.New(),
			Status:       "pending",
			PaymentType:  "public",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	mockRechargeRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(mockOrders, nil)

	req := &ReportGenerationRequest{
		ReportType:  "transaction",
		Format:      "csv",
		Title:       "Transaction Report",
		Description: "Test transaction report",
		StartDate:   time.Now().AddDate(0, 0, -7),
		EndDate:     time.Now(),
	}

	filePath, err := generator.GenerateReport(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, filePath)
	assert.Contains(t, filePath, "transaction_csv_")
	assert.Contains(t, filePath, ".csv")

	mockRechargeRepo.AssertExpectations(t)
}

func TestReportGenerator_GenerateMerchantReport(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	ctx := context.Background()

	// Mock data for merchant report
	mockMerchants := []*repository.MerchantStatisticsData{
		{
			MerchantID:    uuid.New(),
			MerchantName:  "Test Merchant 1",
			MerchantCode:  "TM001",
			TotalCount:    100,
			TotalAmount:   decimal.NewFromInt(10000),
			SuccessCount:  80,
			SuccessAmount: decimal.NewFromInt(8000),
			FailedCount:   20,
			FailedAmount:  decimal.NewFromInt(2000),
			DailyLimit:    decimal.NewFromInt(50000),
			DailyUsed:     decimal.NewFromInt(10000),
		},
	}

	mockReportRepo.On("GetMerchantStatistics", ctx, mock.AnythingOfType("*repository.MerchantStatisticsFilter")).Return(mockMerchants, int64(1), nil)

	req := &ReportGenerationRequest{
		ReportType:  "merchant",
		Format:      "csv",
		Title:       "Merchant Report",
		Description: "Test merchant report",
		StartDate:   time.Now().AddDate(0, 0, -7),
		EndDate:     time.Now(),
	}

	filePath, err := generator.GenerateReport(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, filePath)
	assert.Contains(t, filePath, "merchant_csv_")
	assert.Contains(t, filePath, ".csv")

	mockReportRepo.AssertExpectations(t)
}

func TestReportGenerator_GenerateAccountReport(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	ctx := context.Background()

	// Mock data for account report
	mockAccounts := []*repository.AccountStatisticsData{
		{
			AccountID:     uuid.New(),
			AccountName:   "Test Account 1",
			AccountNumber: "ACC001",
			AccountType:   "alipay",
			PaymentType:   "private",
			TotalCount:    50,
			TotalAmount:   decimal.NewFromInt(5000),
			SuccessCount:  40,
			SuccessAmount: decimal.NewFromInt(4000),
			FailedCount:   10,
			FailedAmount:  decimal.NewFromInt(1000),
			DailyLimit:    decimal.NewFromInt(20000),
			DailyUsed:     decimal.NewFromInt(5000),
		},
	}

	mockReportRepo.On("GetAccountStatistics", ctx, mock.AnythingOfType("*repository.AccountStatisticsFilter")).Return(mockAccounts, int64(1), nil)

	req := &ReportGenerationRequest{
		ReportType:  "account",
		Format:      "csv",
		Title:       "Account Report",
		Description: "Test account report",
		StartDate:   time.Now().AddDate(0, 0, -7),
		EndDate:     time.Now(),
	}

	filePath, err := generator.GenerateReport(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, filePath)
	assert.Contains(t, filePath, "account_csv_")
	assert.Contains(t, filePath, ".csv")

	mockReportRepo.AssertExpectations(t)
}

func TestReportGenerator_GenerateExcelReport(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	ctx := context.Background()

	// Mock data
	mockOrders := []*repository.RechargeOrder{
		{
			ID:           uuid.New(),
			OrderNumber:  "ORD001",
			PayerName:    "John Doe",
			Amount:       decimal.NewFromInt(1000),
			Status:       "completed",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	mockRechargeRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(mockOrders, nil)

	req := &ReportGenerationRequest{
		ReportType:  "transaction",
		Format:      "excel",
		Title:       "Transaction Report",
		Description: "Test Excel report",
		StartDate:   time.Now().AddDate(0, 0, -7),
		EndDate:     time.Now(),
	}

	filePath, err := generator.GenerateReport(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, filePath)
	assert.Contains(t, filePath, "transaction_excel_")
	assert.Contains(t, filePath, ".xlsx")

	mockRechargeRepo.AssertExpectations(t)
}

func TestReportGenerator_GeneratePDFReport(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	ctx := context.Background()

	// Mock data
	mockOrders := []*repository.RechargeOrder{
		{
			ID:           uuid.New(),
			OrderNumber:  "ORD001",
			PayerName:    "John Doe",
			Amount:       decimal.NewFromInt(1000),
			Status:       "completed",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}

	mockRechargeRepo.On("List", ctx, mock.AnythingOfType("*repository.RechargeOrderFilter")).Return(mockOrders, nil)

	req := &ReportGenerationRequest{
		ReportType:  "transaction",
		Format:      "pdf",
		Title:       "Transaction Report",
		Description: "Test PDF report",
		StartDate:   time.Now().AddDate(0, 0, -7),
		EndDate:     time.Now(),
	}

	filePath, err := generator.GenerateReport(ctx, req)

	assert.NoError(t, err)
	assert.NotEmpty(t, filePath)
	assert.Contains(t, filePath, "transaction_pdf_")
	assert.Contains(t, filePath, ".pdf")

	mockRechargeRepo.AssertExpectations(t)
}

func TestReportGenerator_GetTemplate(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	// Test getting transaction template
	template, exists := generator.GetTemplate("transaction")
	assert.True(t, exists)
	assert.NotNil(t, template)
	assert.Equal(t, "transaction", template.ReportType)
	assert.Equal(t, "Transaction Report", template.Name)
	assert.NotEmpty(t, template.Columns)

	// Test getting merchant template
	template, exists = generator.GetTemplate("merchant")
	assert.True(t, exists)
	assert.NotNil(t, template)
	assert.Equal(t, "merchant", template.ReportType)
	assert.Equal(t, "Merchant Report", template.Name)

	// Test getting account template
	template, exists = generator.GetTemplate("account")
	assert.True(t, exists)
	assert.NotNil(t, template)
	assert.Equal(t, "account", template.ReportType)
	assert.Equal(t, "Account Report", template.Name)

	// Test getting non-existent template
	template, exists = generator.GetTemplate("nonexistent")
	assert.False(t, exists)
	assert.Nil(t, template)
}

func TestReportGenerator_ListTemplates(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	templates := generator.ListTemplates()
	assert.Len(t, templates, 3) // transaction, merchant, account

	templateTypes := make(map[string]bool)
	for _, template := range templates {
		templateTypes[template.ReportType] = true
	}

	assert.True(t, templateTypes["transaction"])
	assert.True(t, templateTypes["merchant"])
	assert.True(t, templateTypes["account"])
}

func TestReportGenerator_RegisterTemplate(t *testing.T) {
	mockReportRepo := new(MockReportRepository)
	mockRechargeRepo := new(MockRechargeOrderRepository)
	mockMerchantRepo := new(MockMerchantRepository)
	mockAccountRepo := new(MockReceiveAccountRepository)

	generator := NewReportGenerator(mockReportRepo, mockRechargeRepo, mockMerchantRepo, mockAccountRepo)

	// Register a custom template
	customTemplate := &ReportTemplate{
		ID:         uuid.New(),
		Name:       "Custom Report",
		ReportType: "custom",
		Format:     "csv",
		Columns: []ReportColumn{
			{Key: "id", Title: "ID", Type: "string", Width: 10, Alignment: "left"},
			{Key: "name", Title: "Name", Type: "string", Width: 20, Alignment: "left"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	generator.RegisterTemplate(customTemplate)

	// Verify the template was registered
	template, exists := generator.GetTemplate("custom")
	assert.True(t, exists)
	assert.NotNil(t, template)
	assert.Equal(t, "custom", template.ReportType)
	assert.Equal(t, "Custom Report", template.Name)
	assert.Len(t, template.Columns, 2)

	// Verify it appears in the list
	templates := generator.ListTemplates()
	assert.Len(t, templates, 4) // original 3 + 1 custom
}
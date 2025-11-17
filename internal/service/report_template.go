package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ReportTemplate represents a report template
type ReportTemplate struct {
	ID          uuid.UUID              `json:"id"`
	Name        string                 `json:"name"`
	ReportType  string                 `json:"report_type"`
	Format      string                 `json:"format"`
	Template    string                 `json:"template"`
	Columns     []ReportColumn         `json:"columns"`
	Parameters  map[string]interface{} `json:"parameters"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// ReportColumn represents a column in a report
type ReportColumn struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Type        string `json:"type"` // string, number, date, currency
	Width       int    `json:"width"`
	Alignment   string `json:"alignment"` // left, center, right
	Format      string `json:"format"`
	Aggregation string `json:"aggregation"` // sum, avg, count, min, max
}

// ReportGenerator handles report generation with templates
type ReportGenerator struct {
	reportRepo         repository.ReportRepository
	rechargeOrderRepo  repository.RechargeOrderRepository
	merchantRepo       repository.MerchantRepository
	receiveAccountRepo repository.ReceiveAccountRepository
	templates          map[string]*ReportTemplate
}

// NewReportGenerator creates a new report generator
func NewReportGenerator(
	reportRepo repository.ReportRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
) *ReportGenerator {
	generator := &ReportGenerator{
		reportRepo:         reportRepo,
		rechargeOrderRepo:  rechargeOrderRepo,
		merchantRepo:       merchantRepo,
		receiveAccountRepo: receiveAccountRepo,
		templates:          make(map[string]*ReportTemplate),
	}

	// Initialize default templates
	generator.initializeDefaultTemplates()

	return generator
}

// initializeDefaultTemplates initializes default report templates
func (g *ReportGenerator) initializeDefaultTemplates() {
	// Transaction report template
	transactionTemplate := &ReportTemplate{
		ID:         uuid.New(),
		Name:       "Transaction Report",
		ReportType: "transaction",
		Format:     "csv",
		Columns: []ReportColumn{
			{Key: "order_number", Title: "Order Number", Type: "string", Width: 20, Alignment: "left"},
			{Key: "payer_name", Title: "Payer Name", Type: "string", Width: 15, Alignment: "left"},
			{Key: "payer_account", Title: "Payer Account", Type: "string", Width: 20, Alignment: "left"},
			{Key: "amount", Title: "Amount", Type: "currency", Width: 12, Alignment: "right", Format: "%.2f"},
			{Key: "merchant_name", Title: "Merchant", Type: "string", Width: 15, Alignment: "left"},
			{Key: "receiver_name", Title: "Receiver", Type: "string", Width: 15, Alignment: "left"},
			{Key: "receiver_account", Title: "Receiver Account", Type: "string", Width: 20, Alignment: "left"},
			{Key: "payment_type", Title: "Payment Type", Type: "string", Width: 12, Alignment: "center"},
			{Key: "status", Title: "Status", Type: "string", Width: 10, Alignment: "center"},
			{Key: "created_at", Title: "Created At", Type: "date", Width: 20, Alignment: "center", Format: "2006-01-02 15:04:05"},
			{Key: "updated_at", Title: "Updated At", Type: "date", Width: 20, Alignment: "center", Format: "2006-01-02 15:04:05"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	g.templates["transaction"] = transactionTemplate

	// Merchant report template
	merchantTemplate := &ReportTemplate{
		ID:         uuid.New(),
		Name:       "Merchant Report",
		ReportType: "merchant",
		Format:     "csv",
		Columns: []ReportColumn{
			{Key: "merchant_name", Title: "Merchant Name", Type: "string", Width: 20, Alignment: "left"},
			{Key: "merchant_code", Title: "Merchant Code", Type: "string", Width: 15, Alignment: "left"},
			{Key: "total_count", Title: "Total Orders", Type: "number", Width: 12, Alignment: "right", Aggregation: "sum"},
			{Key: "total_amount", Title: "Total Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f", Aggregation: "sum"},
			{Key: "success_count", Title: "Success Orders", Type: "number", Width: 12, Alignment: "right", Aggregation: "sum"},
			{Key: "success_amount", Title: "Success Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f", Aggregation: "sum"},
			{Key: "failed_count", Title: "Failed Orders", Type: "number", Width: 12, Alignment: "right", Aggregation: "sum"},
			{Key: "failed_amount", Title: "Failed Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f", Aggregation: "sum"},
			{Key: "success_rate", Title: "Success Rate (%)", Type: "number", Width: 12, Alignment: "right", Format: "%.2f"},
			{Key: "average_amount", Title: "Average Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f"},
			{Key: "daily_limit", Title: "Daily Limit", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f"},
			{Key: "daily_used", Title: "Daily Used", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f"},
			{Key: "limit_utilization", Title: "Limit Utilization (%)", Type: "number", Width: 15, Alignment: "right", Format: "%.2f"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	g.templates["merchant"] = merchantTemplate

	// Account report template
	accountTemplate := &ReportTemplate{
		ID:         uuid.New(),
		Name:       "Account Report",
		ReportType: "account",
		Format:     "csv",
		Columns: []ReportColumn{
			{Key: "account_name", Title: "Account Name", Type: "string", Width: 20, Alignment: "left"},
			{Key: "account_number", Title: "Account Number", Type: "string", Width: 20, Alignment: "left"},
			{Key: "account_type", Title: "Account Type", Type: "string", Width: 12, Alignment: "center"},
			{Key: "payment_type", Title: "Payment Type", Type: "string", Width: 12, Alignment: "center"},
			{Key: "total_count", Title: "Total Orders", Type: "number", Width: 12, Alignment: "right", Aggregation: "sum"},
			{Key: "total_amount", Title: "Total Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f", Aggregation: "sum"},
			{Key: "success_count", Title: "Success Orders", Type: "number", Width: 12, Alignment: "right", Aggregation: "sum"},
			{Key: "success_amount", Title: "Success Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f", Aggregation: "sum"},
			{Key: "failed_count", Title: "Failed Orders", Type: "number", Width: 12, Alignment: "right", Aggregation: "sum"},
			{Key: "failed_amount", Title: "Failed Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f", Aggregation: "sum"},
			{Key: "success_rate", Title: "Success Rate (%)", Type: "number", Width: 12, Alignment: "right", Format: "%.2f"},
			{Key: "average_amount", Title: "Average Amount", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f"},
			{Key: "daily_limit", Title: "Daily Limit", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f"},
			{Key: "daily_used", Title: "Daily Used", Type: "currency", Width: 15, Alignment: "right", Format: "%.2f"},
			{Key: "limit_utilization", Title: "Limit Utilization (%)", Type: "number", Width: 15, Alignment: "right", Format: "%.2f"},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	g.templates["account"] = accountTemplate
}

// GenerateReport generates a report using templates
func (g *ReportGenerator) GenerateReport(ctx context.Context, req *ReportGenerationRequest) (string, error) {
	template, exists := g.templates[req.ReportType]
	if !exists {
		return "", fmt.Errorf("template not found for report type: %s", req.ReportType)
	}

	switch req.Format {
	case "csv":
		return g.generateCSVReportWithTemplate(ctx, req, template)
	case "excel":
		return g.generateExcelReportWithTemplate(ctx, req, template)
	case "pdf":
		return g.generatePDFReportWithTemplate(ctx, req, template)
	default:
		return "", fmt.Errorf("unsupported format: %s", req.Format)
	}
}

// generateCSVReportWithTemplate generates CSV report using template
func (g *ReportGenerator) generateCSVReportWithTemplate(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate) (string, error) {
	// Create reports directory if not exists
	reportsDir := "reports"
	os.MkdirAll(reportsDir, 0755)

	fileName := fmt.Sprintf("%s_%s_%d.csv", req.ReportType, req.Format, time.Now().Unix())
	filePath := filepath.Join(reportsDir, fileName)

	file, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write headers
	headers := make([]string, len(tmpl.Columns))
	for i, col := range tmpl.Columns {
		headers[i] = col.Title
	}
	writer.Write(headers)

	// Get data based on report type
    var genErr error
    switch req.ReportType {
    case "transaction":
        _, genErr = g.generateTransactionCSV(ctx, req, tmpl, writer, filePath)
    case "merchant":
        _, genErr = g.generateMerchantCSV(ctx, req, tmpl, writer, filePath)
    case "account":
        _, genErr = g.generateAccountCSV(ctx, req, tmpl, writer, filePath)
    default:
        return "", fmt.Errorf("unsupported report type: %s", req.ReportType)
    }
    if genErr != nil { return "", genErr }

    // Append Funds Credited Summary & Trend if requested via Filters
    if req.Filters != nil {
        if include, ok := req.Filters["include_funds_credited"]; ok {
            // summary
            writer.Write([]string{})
            writer.Write([]string{"Funds Credited Summary"})
            writer.Write([]string{"date","cash","grant","total","cash_pct","grant_pct"})
            var tenantID *uuid.UUID
            if v, ok := req.Filters["tenant_id"].(string); ok {
                if id, err := uuid.Parse(v); err == nil { tenantID = &id }
            }
            today, err := g.reportRepo.GetFundsCreditedToday(ctx, &repository.FundsCreditedFilter{ TenantID: tenantID })
            if err == nil {
                total := today.Cash.Add(today.Grant)
                cashPct := decimal.Zero; grantPct := decimal.Zero
                if total.GreaterThan(decimal.Zero) {
                    cashPct = today.Cash.Div(total).Mul(decimal.NewFromInt(100))
                    grantPct = today.Grant.Div(total).Mul(decimal.NewFromInt(100))
                }
                writer.Write([]string{ today.Date.Format("2006-01-02"), today.Cash.String(), today.Grant.String(), total.String(), cashPct.String(), grantPct.String() })
            }
            // trend
            writer.Write([]string{})
            writer.Write([]string{"Funds Credited Trend"})
            writer.Write([]string{"day","cash","grant","total","cash_pct","grant_pct"})
            days := 14
            if dv, ok := req.Filters["funds_trend_days"]; ok {
                switch t := dv.(type) {
                case float64:
                    days = int(t)
                case int:
                    days = t
                case string:
                    if dParsed, err := strconv.Atoi(t); err == nil { days = dParsed }
                }
            }
            trend, err := g.reportRepo.GetFundsCreditedTrend(ctx, &repository.FundsCreditedTrendFilter{ TenantID: tenantID, Days: days })
            if err == nil {
                for _, p := range trend {
                    total := p.Cash.Add(p.Grant)
                    cashPct := decimal.Zero; grantPct := decimal.Zero
                    if total.GreaterThan(decimal.Zero) {
                        cashPct = p.Cash.Div(total).Mul(decimal.NewFromInt(100))
                        grantPct = p.Grant.Div(total).Mul(decimal.NewFromInt(100))
                    }
                    writer.Write([]string{ p.Day.Format("2006-01-02"), p.Cash.String(), p.Grant.String(), total.String(), cashPct.String(), grantPct.String() })
                }
            }
        }
    }

    return filePath, nil
}

// generateTransactionCSV generates transaction CSV data
func (g *ReportGenerator) generateTransactionCSV(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate, writer *csv.Writer, filePath string) (string, error) {
	filter := &repository.RechargeOrderFilter{
		StartDate: &req.StartDate,
		EndDate:   &req.EndDate,
		Status:    req.Status,
	}
	if req.PaymentType != nil {
		filter.PaymentType = *req.PaymentType
	}

	// Get all orders (in a real implementation, you would paginate)
	orders, err := g.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return "", fmt.Errorf("failed to get orders: %w", err)
	}

	// Get merchants and accounts for joining
	merchants := make(map[uuid.UUID]*repository.Merchant)
	accounts := make(map[uuid.UUID]*repository.ReceiveAccount)

	// Load merchants
	if len(req.MerchantIDs) > 0 {
		for _, merchantID := range req.MerchantIDs {
			merchant, err := g.merchantRepo.GetByID(ctx, merchantID)
			if err == nil {
				merchants[merchantID] = merchant
			}
		}
	}

	// Load accounts
	if len(req.AccountIDs) > 0 {
		for _, accountID := range req.AccountIDs {
			account, err := g.receiveAccountRepo.GetByID(ctx, accountID)
			if err == nil {
				accounts[accountID] = account
			}
		}
	}

	// Write data rows
	for _, order := range orders {
		record := make([]string, len(tmpl.Columns))
		
		for i, col := range tmpl.Columns {
			switch col.Key {
			case "order_number":
				record[i] = order.OrderNumber
			case "payer_name":
				record[i] = order.PayerName
			case "payer_account":
				record[i] = order.PayerAccount
			case "amount":
				record[i] = g.formatValue(order.Amount, col)
			case "merchant_name":
				if merchant, exists := merchants[order.MerchantID]; exists {
					record[i] = merchant.Name
				} else {
					record[i] = ""
				}
			case "receiver_name":
				if account, exists := accounts[order.ReceiveAccountID]; exists {
					record[i] = account.AccountHolder
				} else {
					record[i] = ""
				}
			case "receiver_account":
				if account, exists := accounts[order.ReceiveAccountID]; exists {
					record[i] = account.AccountNumber
				} else {
					record[i] = ""
				}
			case "payment_type":
				record[i] = order.PaymentType
			case "status":
				record[i] = order.Status
			case "created_at":
				record[i] = g.formatTime(order.CreatedAt, col)
			case "updated_at":
				record[i] = g.formatTime(order.UpdatedAt, col)
			default:
				record[i] = ""
			}
		}
		
		writer.Write(record)
	}

	return filePath, nil
}

// generateMerchantCSV generates merchant CSV data
func (g *ReportGenerator) generateMerchantCSV(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate, writer *csv.Writer, filePath string) (string, error) {
	filter := &repository.MerchantStatisticsFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		MerchantIDs: req.MerchantIDs,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Limit:       1000, // Get up to 1000 merchants
		OrderBy:     "total_amount",
		OrderDir:    "DESC",
	}

	merchants, _, err := g.reportRepo.GetMerchantStatistics(ctx, filter)
	if err != nil {
		return "", fmt.Errorf("failed to get merchant statistics: %w", err)
	}

	// Write data rows
	for _, merchant := range merchants {
		record := make([]string, len(tmpl.Columns))
		
		for i, col := range tmpl.Columns {
			switch col.Key {
			case "merchant_name":
				record[i] = merchant.MerchantName
			case "merchant_code":
				record[i] = merchant.MerchantCode
			case "total_count":
				record[i] = fmt.Sprintf("%d", merchant.TotalCount)
			case "total_amount":
				record[i] = g.formatValue(merchant.TotalAmount, col)
			case "success_count":
				record[i] = fmt.Sprintf("%d", merchant.SuccessCount)
			case "success_amount":
				record[i] = g.formatValue(merchant.SuccessAmount, col)
			case "failed_count":
				record[i] = fmt.Sprintf("%d", merchant.FailedCount)
			case "failed_amount":
				record[i] = g.formatValue(merchant.FailedAmount, col)
			case "success_rate":
				if merchant.TotalCount > 0 {
					rate := decimal.NewFromInt(merchant.SuccessCount).Div(decimal.NewFromInt(merchant.TotalCount)).Mul(decimal.NewFromInt(100))
					record[i] = g.formatValue(rate, col)
				} else {
					record[i] = "0.00"
				}
			case "average_amount":
				if merchant.TotalCount > 0 {
					avg := merchant.TotalAmount.Div(decimal.NewFromInt(merchant.TotalCount))
					record[i] = g.formatValue(avg, col)
				} else {
					record[i] = "0.00"
				}
			case "daily_limit":
				record[i] = g.formatValue(merchant.DailyLimit, col)
			case "daily_used":
				record[i] = g.formatValue(merchant.DailyUsed, col)
			case "limit_utilization":
				if merchant.DailyLimit.GreaterThan(decimal.Zero) {
					util := merchant.DailyUsed.Div(merchant.DailyLimit).Mul(decimal.NewFromInt(100))
					record[i] = g.formatValue(util, col)
				} else {
					record[i] = "0.00"
				}
			default:
				record[i] = ""
			}
		}
		
		writer.Write(record)
	}

	return filePath, nil
}

// generateAccountCSV generates account CSV data
func (g *ReportGenerator) generateAccountCSV(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate, writer *csv.Writer, filePath string) (string, error) {
	filter := &repository.AccountStatisticsFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		AccountIDs:  req.AccountIDs,
		MerchantIDs: req.MerchantIDs,
		AccountType: req.AccountType,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Limit:       1000, // Get up to 1000 accounts
		OrderBy:     "total_amount",
		OrderDir:    "DESC",
	}

	accounts, _, err := g.reportRepo.GetAccountStatistics(ctx, filter)
	if err != nil {
		return "", fmt.Errorf("failed to get account statistics: %w", err)
	}

	// Write data rows
	for _, account := range accounts {
		record := make([]string, len(tmpl.Columns))
		
		for i, col := range tmpl.Columns {
			switch col.Key {
			case "account_name":
				record[i] = account.AccountName
			case "account_number":
				record[i] = account.AccountNumber
			case "account_type":
				record[i] = account.AccountType
			case "payment_type":
				record[i] = account.PaymentType
			case "total_count":
				record[i] = fmt.Sprintf("%d", account.TotalCount)
			case "total_amount":
				record[i] = g.formatValue(account.TotalAmount, col)
			case "success_count":
				record[i] = fmt.Sprintf("%d", account.SuccessCount)
			case "success_amount":
				record[i] = g.formatValue(account.SuccessAmount, col)
			case "failed_count":
				record[i] = fmt.Sprintf("%d", account.FailedCount)
			case "failed_amount":
				record[i] = g.formatValue(account.FailedAmount, col)
			case "success_rate":
				if account.TotalCount > 0 {
					rate := decimal.NewFromInt(account.SuccessCount).Div(decimal.NewFromInt(account.TotalCount)).Mul(decimal.NewFromInt(100))
					record[i] = g.formatValue(rate, col)
				} else {
					record[i] = "0.00"
				}
			case "average_amount":
				if account.TotalCount > 0 {
					avg := account.TotalAmount.Div(decimal.NewFromInt(account.TotalCount))
					record[i] = g.formatValue(avg, col)
				} else {
					record[i] = "0.00"
				}
			case "daily_limit":
				record[i] = g.formatValue(account.DailyLimit, col)
			case "daily_used":
				record[i] = g.formatValue(account.DailyUsed, col)
			case "limit_utilization":
				if account.DailyLimit.GreaterThan(decimal.Zero) {
					util := account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))
					record[i] = g.formatValue(util, col)
				} else {
					record[i] = "0.00"
				}
			default:
				record[i] = ""
			}
		}
		
		writer.Write(record)
	}

	return filePath, nil
}

// generateExcelReportWithTemplate generates Excel report using template
func (g *ReportGenerator) generateExcelReportWithTemplate(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate) (string, error) {
	// For now, generate CSV and rename to Excel
	// In a real implementation, you would use a library like excelize
	csvPath, err := g.generateCSVReportWithTemplate(ctx, req, tmpl)
	if err != nil {
		return "", err
	}

	excelPath := strings.Replace(csvPath, ".csv", ".xlsx", 1)
	err = os.Rename(csvPath, excelPath)
	if err != nil {
		return "", fmt.Errorf("failed to rename to Excel: %w", err)
	}

	return excelPath, nil
}

// generatePDFReportWithTemplate generates PDF report using template
func (g *ReportGenerator) generatePDFReportWithTemplate(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate) (string, error) {
	// For now, generate a simple text-based PDF
	// In a real implementation, you would use a PDF generation library
	
	// Create reports directory if not exists
	reportsDir := "reports"
	os.MkdirAll(reportsDir, 0755)

	fileName := fmt.Sprintf("%s_%s_%d.pdf", req.ReportType, req.Format, time.Now().Unix())
	filePath := filepath.Join(reportsDir, fileName)

	// Generate report content
	content, err := g.generateReportContent(ctx, req, tmpl)
	if err != nil {
		return "", fmt.Errorf("failed to generate report content: %w", err)
	}

	// Write to file (in a real implementation, this would be PDF content)
	err = os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to write PDF file: %w", err)
	}

	return filePath, nil
}

// generateReportContent generates report content using templates
func (g *ReportGenerator) generateReportContent(ctx context.Context, req *ReportGenerationRequest, tmpl *ReportTemplate) (string, error) {
	// Create a simple text template
	templateStr := `
{{.Title}}
Generated on: {{.GeneratedAt}}
Period: {{.StartDate}} to {{.EndDate}}

{{range .Headers}}{{.}}	{{end}}
{{range .Rows}}{{range .}}{{.}}	{{end}}
{{end}}

Summary:
Total Records: {{.TotalRecords}}
`

	t, err := template.New("report").Parse(templateStr)
	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	// Prepare template data
	data := map[string]interface{}{
		"Title":       req.Title,
		"GeneratedAt": time.Now().Format("2006-01-02 15:04:05"),
		"StartDate":   req.StartDate.Format("2006-01-02"),
		"EndDate":     req.EndDate.Format("2006-01-02"),
		"Headers":     []string{},
		"Rows":        [][]string{},
		"TotalRecords": 0,
	}

	// Get headers
	headers := make([]string, len(tmpl.Columns))
	for i, col := range tmpl.Columns {
		headers[i] = col.Title
	}
	data["Headers"] = headers

	// Get data based on report type (simplified for PDF)
    switch req.ReportType {
    case "transaction":
		filter := &repository.RechargeOrderFilter{
			StartDate: &req.StartDate,
			EndDate:   &req.EndDate,
			Status:    req.Status,
			Limit:     100, // Limit for PDF
		}
		orders, err := g.rechargeOrderRepo.List(ctx, filter)
		if err != nil {
			return "", fmt.Errorf("failed to get orders: %w", err)
		}

		rows := make([][]string, len(orders))
		for i, order := range orders {
			rows[i] = []string{
				order.OrderNumber,
				order.PayerName,
				order.Amount.String(),
				order.Status,
				order.CreatedAt.Format("2006-01-02 15:04:05"),
			}
		}
        data["Rows"] = rows
        data["TotalRecords"] = len(orders)
    }

    if req.Filters != nil {
        if include, ok := req.Filters["include_funds_credited"]; ok {
            var tenantID *uuid.UUID
            if v, ok := req.Filters["tenant_id"].(string); ok {
                if id, err := uuid.Parse(v); err == nil { tenantID = &id }
            }
            today, err := g.reportRepo.GetFundsCreditedToday(ctx, &repository.FundsCreditedFilter{ TenantID: tenantID })
            if err == nil {
                total := today.Cash.Add(today.Grant)
                cashPct := decimal.Zero; grantPct := decimal.Zero
                if total.GreaterThan(decimal.Zero) {
                    cashPct = today.Cash.Div(total).Mul(decimal.NewFromInt(100))
                    grantPct = today.Grant.Div(total).Mul(decimal.NewFromInt(100))
                }
                data["Rows"] = append(data["Rows"].([][]string), []string{})
                data["Rows"] = append(data["Rows"].([][]string), []string{"Funds Credited Summary"})
                data["Rows"] = append(data["Rows"].([][]string), []string{"date","cash","grant","total","cash_pct","grant_pct"})
                data["Rows"] = append(data["Rows"].([][]string), []string{ today.Date.Format("2006-01-02"), today.Cash.String(), today.Grant.String(), total.String(), cashPct.String(), grantPct.String() })
            }
            days := 14
            if dv, ok := req.Filters["funds_trend_days"]; ok {
                switch t := dv.(type) {
                case float64:
                    days = int(t)
                case int:
                    days = t
                case string:
                    if dParsed, err := strconv.Atoi(t); err == nil { days = dParsed }
                }
            }
            trend, err := g.reportRepo.GetFundsCreditedTrend(ctx, &repository.FundsCreditedTrendFilter{ TenantID: tenantID, Days: days })
            if err == nil {
                data["Rows"] = append(data["Rows"].([][]string), []string{})
                data["Rows"] = append(data["Rows"].([][]string), []string{"Funds Credited Trend"})
                data["Rows"] = append(data["Rows"].([][]string), []string{"day","cash","grant","total","cash_pct","grant_pct"})
                for _, p := range trend {
                    total := p.Cash.Add(p.Grant)
                    cashPct := decimal.Zero; grantPct := decimal.Zero
                    if total.GreaterThan(decimal.Zero) {
                        cashPct = p.Cash.Div(total).Mul(decimal.NewFromInt(100))
                        grantPct = p.Grant.Div(total).Mul(decimal.NewFromInt(100))
                    }
                    data["Rows"] = append(data["Rows"].([][]string), []string{ p.Day.Format("2006-01-02"), p.Cash.String(), p.Grant.String(), total.String(), cashPct.String(), grantPct.String() })
                }
            }
        }
    }

	var buf bytes.Buffer
	err = t.Execute(&buf, data)
	if err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return buf.String(), nil
}

// Helper methods

// formatValue formats a decimal value according to column specification
func (g *ReportGenerator) formatValue(value decimal.Decimal, col ReportColumn) string {
	if col.Format != "" {
		if col.Type == "currency" || col.Type == "number" {
			f, _ := value.Float64()
			return fmt.Sprintf(col.Format, f)
		}
	}
	return value.String()
}

// formatTime formats a time value according to column specification
func (g *ReportGenerator) formatTime(t time.Time, col ReportColumn) string {
	if col.Format != "" {
		return t.Format(col.Format)
	}
	return t.Format("2006-01-02 15:04:05")
}

// GetTemplate returns a template by report type
func (g *ReportGenerator) GetTemplate(reportType string) (*ReportTemplate, bool) {
	template, exists := g.templates[reportType]
	return template, exists
}

// RegisterTemplate registers a new template
func (g *ReportGenerator) RegisterTemplate(template *ReportTemplate) {
	g.templates[template.ReportType] = template
}

// ListTemplates returns all available templates
func (g *ReportGenerator) ListTemplates() []*ReportTemplate {
	templates := make([]*ReportTemplate, 0, len(g.templates))
	for _, template := range g.templates {
		templates = append(templates, template)
	}
	return templates
}

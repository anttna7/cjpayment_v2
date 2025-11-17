package service

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/security"
)

// DataExportService handles data export and reporting functionality
type DataExportService struct {
	db           *gorm.DB
	repoManager  *repository.Manager
	dataMasker   *security.DataMasker
}

// NewDataExportService creates a new data export service
func NewDataExportService(db *gorm.DB, repoManager *repository.Manager, dataMasker *security.DataMasker) *DataExportService {
	return &DataExportService{
		db:          db,
		repoManager: repoManager,
		dataMasker:  dataMasker,
	}
}

// ExportRequest represents a data export request
type ExportRequest struct {
	StartDate    time.Time `json:"start_date"`
	EndDate      time.Time `json:"end_date"`
	MerchantID   *uint     `json:"merchant_id,omitempty"`
	Status       string    `json:"status,omitempty"`
	IncludeSensitive bool  `json:"include_sensitive"`
	Format       string    `json:"format"` // excel, csv
}

// ExportResponse represents the export result
type ExportResponse struct {
	FileName    string    `json:"file_name"`
	FileSize    int64     `json:"file_size"`
	RecordCount int       `json:"record_count"`
	ExportedAt  time.Time `json:"exported_at"`
	DownloadURL string    `json:"download_url"`
}

// DailyReportSummary represents daily report statistics
type DailyReportSummary struct {
	Date            time.Time       `json:"date"`
	TotalOrders     int             `json:"total_orders"`
	TotalAmount     decimal.Decimal `json:"total_amount"`
	PendingOrders   int             `json:"pending_orders"`
	PaidOrders      int             `json:"paid_orders"`
	CompletedOrders int             `json:"completed_orders"`
	CancelledOrders int             `json:"cancelled_orders"`
	MerchantStats   []MerchantStat  `json:"merchant_stats"`
}

// MerchantStat represents merchant-specific statistics
type MerchantStat struct {
	MerchantID   uint            `json:"merchant_id"`
	MerchantName string          `json:"merchant_name"`
	OrderCount   int             `json:"order_count"`
	TotalAmount  decimal.Decimal `json:"total_amount"`
	SuccessRate  float64         `json:"success_rate"`
}

// ExportTodayData exports today's order data
func (s *DataExportService) ExportTodayData(ctx context.Context, req *ExportRequest) (*ExportResponse, error) {
	today := time.Now().Truncate(24 * time.Hour)
	req.StartDate = today
	req.EndDate = today.Add(24 * time.Hour)
	
	return s.ExportOrderData(ctx, req)
}

// ExportYesterdayData exports yesterday's order data
func (s *DataExportService) ExportYesterdayData(ctx context.Context, req *ExportRequest) (*ExportResponse, error) {
	yesterday := time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour)
	req.StartDate = yesterday
	req.EndDate = yesterday.Add(24 * time.Hour)
	
	return s.ExportOrderData(ctx, req)
}

// ExportOrderData exports order data based on the request parameters
func (s *DataExportService) ExportOrderData(ctx context.Context, req *ExportRequest) (*ExportResponse, error) {
	// Query orders based on request parameters
	orders, err := s.queryOrders(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to query orders: %w", err)
	}

	// Generate Excel file
	fileData, err := s.generateExcelFile(orders, req.IncludeSensitive)
	if err != nil {
		return nil, fmt.Errorf("failed to generate Excel file: %w", err)
	}

	// Generate filename
	fileName := s.generateFileName(req)
	
	// Log export activity
	err = s.logExportActivity(ctx, req, len(orders), fileName)
	if err != nil {
		// Log error but don't fail the export
		fmt.Printf("Failed to log export activity: %v\n", err)
	}

	return &ExportResponse{
		FileName:    fileName,
		FileSize:    int64(len(fileData)),
		RecordCount: len(orders),
		ExportedAt:  time.Now(),
		DownloadURL: fmt.Sprintf("/api/exports/download/%s", fileName),
	}, nil
}

// GetDailyReport generates daily report summary
func (s *DataExportService) GetDailyReport(ctx context.Context, date time.Time) (*DailyReportSummary, error) {
	startDate := date.Truncate(24 * time.Hour)
	endDate := startDate.Add(24 * time.Hour)

	// Get order statistics
	var stats struct {
		TotalOrders     int64
		TotalAmount     decimal.Decimal
		PendingOrders   int64
		PaidOrders      int64
		CompletedOrders int64
		CancelledOrders int64
	}

	err := s.db.WithContext(ctx).
		Table("recharge_orders").
		Select(`
			COUNT(*) as total_orders,
			COALESCE(SUM(amount), 0) as total_amount,
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
			SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
			SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
		`).
		Where("created_at >= ? AND created_at < ?", startDate, endDate).
		Scan(&stats).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get order statistics: %w", err)
	}

	// Get merchant statistics
	merchantStats, err := s.getMerchantStats(ctx, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant statistics: %w", err)
	}

	return &DailyReportSummary{
		Date:            date,
		TotalOrders:     int(stats.TotalOrders),
		TotalAmount:     stats.TotalAmount,
		PendingOrders:   int(stats.PendingOrders),
		PaidOrders:      int(stats.PaidOrders),
		CompletedOrders: int(stats.CompletedOrders),
		CancelledOrders: int(stats.CancelledOrders),
		MerchantStats:   merchantStats,
	}, nil
}

// queryOrders queries orders based on request parameters
func (s *DataExportService) queryOrders(ctx context.Context, req *ExportRequest) ([]repository.RechargeOrder, error) {
	query := s.db.WithContext(ctx).
		Preload("Merchant").
		Preload("ReceiveAccount").
		Where("created_at >= ? AND created_at < ?", req.StartDate, req.EndDate)

	if req.MerchantID != nil {
		query = query.Where("merchant_id = ?", *req.MerchantID)
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	var orders []repository.RechargeOrder
	err := query.Order("created_at DESC").Find(&orders).Error
	if err != nil {
		return nil, err
	}

	return orders, nil
}

// generateExcelFile generates Excel file from order data
func (s *DataExportService) generateExcelFile(orders []repository.RechargeOrder, includeSensitive bool) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "订单数据"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, err
	}

	// Set headers
	headers := []string{
		"订单号", "商户名称", "付款人姓名", "充值金额", "广告账户",
		"付款类型", "收款账号", "订单状态", "创建时间", "更新时间", "备注",
	}

	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		f.SetCellValue(sheetName, cell, header)
	}

	// Set data
	for i, order := range orders {
		row := i + 2
		
		// Mask sensitive data if not including sensitive information
		payerName := order.PayerName
		adAccount := order.AdAccount
		receiveAccount := ""
		
		if order.ReceiveAccount != nil {
			receiveAccount = order.ReceiveAccount.AccountName
			if !includeSensitive {
				receiveAccount = s.dataMasker.MaskBankAccount(receiveAccount)
			}
		}
		
		if !includeSensitive {
			payerName = s.dataMasker.MaskPhone(payerName)
			adAccount = s.maskAdAccount(adAccount)
		}

		merchantName := ""
		if order.Merchant != nil {
			merchantName = order.Merchant.Name
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), order.OrderNo)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), merchantName)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), payerName)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), order.Amount.String())
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), adAccount)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), order.PaymentType)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), receiveAccount)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), order.Status)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), order.CreatedAt.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), order.UpdatedAt.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), order.Remark)
	}

	f.SetActiveSheet(index)

	// Generate buffer
	var buf bytes.Buffer
	err = f.Write(&buf)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// generateFileName generates export file name
func (s *DataExportService) generateFileName(req *ExportRequest) string {
	dateStr := req.StartDate.Format("20060102")
	if req.StartDate.Format("20060102") != req.EndDate.AddDate(0, 0, -1).Format("20060102") {
		dateStr = fmt.Sprintf("%s_%s", req.StartDate.Format("20060102"), req.EndDate.AddDate(0, 0, -1).Format("20060102"))
	}
	
	timestamp := time.Now().Format("150405")
	return fmt.Sprintf("recharge_orders_%s_%s.xlsx", dateStr, timestamp)
}

// getMerchantStats gets merchant-specific statistics
func (s *DataExportService) getMerchantStats(ctx context.Context, startDate, endDate time.Time) ([]MerchantStat, error) {
	var stats []struct {
		MerchantID   uint
		MerchantName string
		OrderCount   int64
		TotalAmount  decimal.Decimal
		CompletedCount int64
	}

	err := s.db.WithContext(ctx).
		Table("recharge_orders ro").
		Select(`
			ro.merchant_id,
			m.name as merchant_name,
			COUNT(*) as order_count,
			COALESCE(SUM(ro.amount), 0) as total_amount,
			SUM(CASE WHEN ro.status = 'completed' THEN 1 ELSE 0 END) as completed_count
		`).
		Joins("LEFT JOIN merchants m ON ro.merchant_id = m.id").
		Where("ro.created_at >= ? AND ro.created_at < ?", startDate, endDate).
		Group("ro.merchant_id, m.name").
		Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	merchantStats := make([]MerchantStat, len(stats))
	for i, stat := range stats {
		successRate := 0.0
		if stat.OrderCount > 0 {
			successRate = float64(stat.CompletedCount) / float64(stat.OrderCount) * 100
		}

		merchantStats[i] = MerchantStat{
			MerchantID:   stat.MerchantID,
			MerchantName: stat.MerchantName,
			OrderCount:   int(stat.OrderCount),
			TotalAmount:  stat.TotalAmount,
			SuccessRate:  successRate,
		}
	}

	return merchantStats, nil
}

// logExportActivity logs export activity
func (s *DataExportService) logExportActivity(ctx context.Context, req *ExportRequest, recordCount int, fileName string) error {
	exportLog := &repository.DataExportLog{
		ExportType:   "order_data",
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		RecordCount:  recordCount,
		FileName:     fileName,
		Status:       "completed",
		ExportedAt:   time.Now(),
	}

	if req.MerchantID != nil {
		exportLog.MerchantID = req.MerchantID
	}

	return s.repoManager.DataExportLogRepo.Create(ctx, exportLog)
}

// maskAdAccount masks advertisement account information
func (s *DataExportService) maskAdAccount(adAccount string) string {
	if len(adAccount) <= 4 {
		return adAccount
	}
	return adAccount[:2] + "****" + adAccount[len(adAccount)-2:]
}
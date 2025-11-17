package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/redis/go-redis/v9"
)

// reportService implements ReportService interface
type reportService struct {
	reportRepo         repository.ReportRepository
	rechargeOrderRepo  repository.RechargeOrderRepository
	merchantRepo       repository.MerchantRepository
	receiveAccountRepo repository.ReceiveAccountRepository
	redis              *redis.Client
	generator          *ReportGenerator
}

// NewReportService creates a new report service
func NewReportService(
	reportRepo repository.ReportRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	redis *redis.Client,
) ReportService {
	generator := NewReportGenerator(reportRepo, rechargeOrderRepo, merchantRepo, receiveAccountRepo)
	
	return &reportService{
		reportRepo:         reportRepo,
		rechargeOrderRepo:  rechargeOrderRepo,
		merchantRepo:       merchantRepo,
		receiveAccountRepo: receiveAccountRepo,
		redis:              redis,
		generator:          generator,
	}
}

// GetTransactionStatistics retrieves transaction statistics
func (s *reportService) GetTransactionStatistics(ctx context.Context, req *TransactionStatisticsRequest) (*TransactionStatistics, error) {
	// Check cache first
	cacheKey := s.buildCacheKey("transaction_stats", req)
	if cached, err := s.getFromCache(ctx, cacheKey); err == nil && cached != nil {
		var stats TransactionStatistics
		if err := json.Unmarshal(cached, &stats); err == nil {
			return &stats, nil
		}
	}

	filter := &repository.TransactionStatisticsFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Granularity: req.Granularity,
	}

	data, err := s.reportRepo.GetTransactionStatistics(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction statistics: %w", err)
	}

	stats := &TransactionStatistics{
		Period:        s.formatPeriod(req.StartDate, req.EndDate),
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		TotalCount:    data.TotalCount,
		TotalAmount:   data.TotalAmount,
		SuccessCount:  data.SuccessCount,
		SuccessAmount: data.SuccessAmount,
		FailedCount:   data.FailedCount,
		FailedAmount:  data.FailedAmount,
		PendingCount:  data.PendingCount,
		PendingAmount: data.PendingAmount,
		RefundCount:   data.RefundCount,
		RefundAmount:  data.RefundAmount,
		GeneratedAt:   time.Now(),
	}

	// Calculate derived metrics
	if stats.TotalCount > 0 {
		stats.SuccessRate = decimal.NewFromInt(stats.SuccessCount).Div(decimal.NewFromInt(stats.TotalCount)).Mul(decimal.NewFromInt(100))
		stats.AverageAmount = stats.TotalAmount.Div(decimal.NewFromInt(stats.TotalCount))
	}

	// Cache the result
	s.setCache(ctx, cacheKey, stats, 5*time.Minute)

	return stats, nil
}

// GetMerchantStatistics retrieves merchant statistics
func (s *reportService) GetMerchantStatistics(ctx context.Context, req *MerchantStatisticsRequest) (*MerchantStatistics, error) {
	filter := &repository.MerchantStatisticsFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		MerchantIDs: req.MerchantIDs,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Limit:       req.Limit,
		Offset:      req.Offset,
		OrderBy:     req.OrderBy,
		OrderDir:    req.OrderDir,
	}

	data, total, err := s.reportRepo.GetMerchantStatistics(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant statistics: %w", err)
	}

	merchants := make([]*MerchantStatisticsItem, len(data))
	for i, item := range data {
		merchants[i] = &MerchantStatisticsItem{
			MerchantID:    item.MerchantID,
			MerchantName:  item.MerchantName,
			MerchantCode:  item.MerchantCode,
			TotalCount:    item.TotalCount,
			TotalAmount:   item.TotalAmount,
			SuccessCount:  item.SuccessCount,
			SuccessAmount: item.SuccessAmount,
			FailedCount:   item.FailedCount,
			FailedAmount:  item.FailedAmount,
			DailyLimit:    item.DailyLimit,
			DailyUsed:     item.DailyUsed,
		}

		// Calculate derived metrics
		if merchants[i].TotalCount > 0 {
			merchants[i].SuccessRate = decimal.NewFromInt(merchants[i].SuccessCount).Div(decimal.NewFromInt(merchants[i].TotalCount)).Mul(decimal.NewFromInt(100))
			merchants[i].AverageAmount = merchants[i].TotalAmount.Div(decimal.NewFromInt(merchants[i].TotalCount))
		}
		if merchants[i].DailyLimit.GreaterThan(decimal.Zero) {
			merchants[i].LimitUtilization = merchants[i].DailyUsed.Div(merchants[i].DailyLimit).Mul(decimal.NewFromInt(100))
		}
	}

	return &MerchantStatistics{
		Period:    s.formatPeriod(req.StartDate, req.EndDate),
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
		Merchants: merchants,
		Total:     total,
	}, nil
}

// GetAccountStatistics retrieves account statistics
func (s *reportService) GetAccountStatistics(ctx context.Context, req *AccountStatisticsRequest) (*AccountStatistics, error) {
	filter := &repository.AccountStatisticsFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		AccountIDs:  req.AccountIDs,
		MerchantIDs: req.MerchantIDs,
		AccountType: req.AccountType,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Limit:       req.Limit,
		Offset:      req.Offset,
		OrderBy:     req.OrderBy,
		OrderDir:    req.OrderDir,
	}

	data, total, err := s.reportRepo.GetAccountStatistics(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get account statistics: %w", err)
	}

	accounts := make([]*AccountStatisticsItem, len(data))
	for i, item := range data {
		accounts[i] = &AccountStatisticsItem{
			AccountID:     item.AccountID,
			AccountName:   item.AccountName,
			AccountNumber: item.AccountNumber,
			AccountType:   item.AccountType,
			PaymentType:   item.PaymentType,
			TotalCount:    item.TotalCount,
			TotalAmount:   item.TotalAmount,
			SuccessCount:  item.SuccessCount,
			SuccessAmount: item.SuccessAmount,
			FailedCount:   item.FailedCount,
			FailedAmount:  item.FailedAmount,
			DailyLimit:    item.DailyLimit,
			DailyUsed:     item.DailyUsed,
		}

		// Calculate derived metrics
		if accounts[i].TotalCount > 0 {
			accounts[i].SuccessRate = decimal.NewFromInt(accounts[i].SuccessCount).Div(decimal.NewFromInt(accounts[i].TotalCount)).Mul(decimal.NewFromInt(100))
			accounts[i].AverageAmount = accounts[i].TotalAmount.Div(decimal.NewFromInt(accounts[i].TotalCount))
		}
		if accounts[i].DailyLimit.GreaterThan(decimal.Zero) {
			accounts[i].LimitUtilization = accounts[i].DailyUsed.Div(accounts[i].DailyLimit).Mul(decimal.NewFromInt(100))
		}
	}

	return &AccountStatistics{
		Period:    s.formatPeriod(req.StartDate, req.EndDate),
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
		Accounts:  accounts,
		Total:     total,
	}, nil
}

// GetTransactionAggregation retrieves aggregated transaction data
func (s *reportService) GetTransactionAggregation(ctx context.Context, req *TransactionAggregationRequest) (*TransactionAggregationResult, error) {
	filter := &repository.TransactionAggregationFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		GroupBy:     req.GroupBy,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Granularity: req.Granularity,
		Limit:       req.Limit,
		Offset:      req.Offset,
		OrderBy:     req.OrderBy,
		OrderDir:    req.OrderDir,
	}

	data, err := s.reportRepo.GetTransactionAggregation(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction aggregation: %w", err)
	}

	dataPoints := make([]*AggregationDataPoint, len(data))
	for i, item := range data {
		dataPoints[i] = &AggregationDataPoint{
			Dimensions:    item.Dimensions,
			Count:         item.Count,
			Amount:        item.Amount,
			SuccessCount:  item.SuccessCount,
			SuccessAmount: item.SuccessAmount,
			FailedCount:   item.FailedCount,
			FailedAmount:  item.FailedAmount,
		}

		// Calculate success rate
		if dataPoints[i].Count > 0 {
			dataPoints[i].SuccessRate = decimal.NewFromInt(dataPoints[i].SuccessCount).Div(decimal.NewFromInt(dataPoints[i].Count)).Mul(decimal.NewFromInt(100))
		}
	}

	// Get summary statistics
	summaryReq := &TransactionStatisticsRequest{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Granularity: req.Granularity,
	}
	summary, err := s.GetTransactionStatistics(ctx, summaryReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary statistics: %w", err)
	}

	return &TransactionAggregationResult{
		Period:      s.formatPeriod(req.StartDate, req.EndDate),
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		GroupBy:     req.GroupBy,
		Granularity: req.Granularity,
		Data:        dataPoints,
		Total:       int64(len(dataPoints)),
		Summary:     summary,
	}, nil
}

// GetTimeSeriesData retrieves time series data
func (s *reportService) GetTimeSeriesData(ctx context.Context, req *TimeSeriesRequest) (*TimeSeriesResult, error) {
	filter := &repository.TimeSeriesFilter{
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Metrics:     req.Metrics,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Granularity: req.Granularity,
	}

	data, err := s.reportRepo.GetTimeSeriesData(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get time series data: %w", err)
	}

	series := make([]*TimeSeriesPoint, len(data))
	for i, item := range data {
		series[i] = &TimeSeriesPoint{
			Timestamp: item.Timestamp,
			Values:    item.Values,
		}
	}

	return &TimeSeriesResult{
		Period:      s.formatPeriod(req.StartDate, req.EndDate),
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Granularity: req.Granularity,
		Metrics:     req.Metrics,
		Series:      series,
	}, nil
}

// GenerateTransactionReport generates a transaction report
func (s *reportService) GenerateTransactionReport(ctx context.Context, req *ReportGenerationRequest) (*ReportInfo, error) {
	reportID := uuid.New()
	
	// Create report record
	report := &repository.Report{
		ID:          reportID,
		ReportType:  req.ReportType,
		Format:      req.Format,
		Title:       req.Title,
		Description: req.Description,
		Status:      "pending",
		Progress:    0,
		Parameters:  s.convertToMap(req),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := s.reportRepo.CreateReport(ctx, report)
	if err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	// Start async report generation
	go s.generateReportAsync(context.Background(), reportID, req)

	return &ReportInfo{
		ID:          reportID,
		ReportType:  req.ReportType,
		Format:      req.Format,
		Title:       req.Title,
		Description: req.Description,
		Status:      "pending",
		Progress:    0,
		CreatedAt:   report.CreatedAt,
		UpdatedAt:   report.UpdatedAt,
		CreatedBy:   report.CreatedBy,
	}, nil
}

// GetReportStatus retrieves report status
func (s *reportService) GetReportStatus(ctx context.Context, reportID uuid.UUID) (*ReportStatus, error) {
	report, err := s.reportRepo.GetReport(ctx, reportID)
	if err != nil {
		return nil, fmt.Errorf("failed to get report: %w", err)
	}

	return &ReportStatus{
		ID:           report.ID,
		Status:       report.Status,
		Progress:     report.Progress,
		ErrorMessage: report.ErrorMessage,
		UpdatedAt:    report.UpdatedAt,
	}, nil
}

// DownloadReport downloads a report
func (s *reportService) DownloadReport(ctx context.Context, reportID uuid.UUID) (*ReportDownload, error) {
	report, err := s.reportRepo.GetReport(ctx, reportID)
	if err != nil {
		return nil, fmt.Errorf("failed to get report: %w", err)
	}

	if report.Status != "completed" {
		return nil, fmt.Errorf("report is not ready for download")
	}

	if report.FilePath == nil {
		return nil, fmt.Errorf("report file not found")
	}

	// Read file data
	data, err := os.ReadFile(*report.FilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read report file: %w", err)
	}

	fileName := filepath.Base(*report.FilePath)
	contentType := s.getContentType(report.Format)

	return &ReportDownload{
		ID:          report.ID,
		FileName:    fileName,
		ContentType: contentType,
		FileSize:    int64(len(data)),
		Data:        data,
		DownloadURL: *report.DownloadURL,
	}, nil
}

// ListReports lists reports
func (s *reportService) ListReports(ctx context.Context, filter *ReportFilter) ([]*ReportInfo, int64, error) {
	repoFilter := &repository.ReportFilter{
		ReportType: filter.ReportType,
		Status:     filter.Status,
		CreatedBy:  filter.CreatedBy,
		StartDate:  filter.StartDate,
		EndDate:    filter.EndDate,
		Limit:      filter.Limit,
		Offset:     filter.Offset,
		OrderBy:    filter.OrderBy,
		OrderDir:   filter.OrderDir,
	}
	reports, total, err := s.reportRepo.ListReports(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list reports: %w", err)
	}

	result := make([]*ReportInfo, len(reports))
	for i, report := range reports {
		result[i] = &ReportInfo{
			ID:           report.ID,
			ReportType:   report.ReportType,
			Format:       report.Format,
			Title:        report.Title,
			Description:  report.Description,
			Status:       report.Status,
			Progress:     report.Progress,
			FileSize:     report.FileSize,
			FilePath:     report.FilePath,
			DownloadURL:  report.DownloadURL,
			ExpiresAt:    report.ExpiresAt,
			ErrorMessage: report.ErrorMessage,
			CreatedAt:    report.CreatedAt,
			UpdatedAt:    report.UpdatedAt,
			CreatedBy:    report.CreatedBy,
		}
	}

	return result, total, nil
}

// DeleteReport deletes a report
func (s *reportService) DeleteReport(ctx context.Context, reportID uuid.UUID) error {
	report, err := s.reportRepo.GetReport(ctx, reportID)
	if err != nil {
		return fmt.Errorf("failed to get report: %w", err)
	}

	// Delete file if exists
	if report.FilePath != nil {
		os.Remove(*report.FilePath)
	}

	err = s.reportRepo.DeleteReport(ctx, reportID)
	if err != nil {
		return fmt.Errorf("failed to delete report: %w", err)
	}

	return nil
}

// GetRealTimeStatistics retrieves real-time statistics
func (s *reportService) GetRealTimeStatistics(ctx context.Context) (*RealTimeStatistics, error) {
	// Check cache first
	cacheKey := "realtime_stats"
	if cached, err := s.getFromCache(ctx, cacheKey); err == nil && cached != nil {
		var stats RealTimeStatistics
		if err := json.Unmarshal(cached, &stats); err == nil {
			return &stats, nil
		}
	}

	data, err := s.reportRepo.GetRealTimeStatistics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get real-time statistics: %w", err)
	}

	stats := &RealTimeStatistics{
		TodayTransactions:     s.convertTransactionStats(data.TodayStats),
		YesterdayTransactions: s.convertTransactionStats(data.YesterdayStats),
		ThisWeekTransactions:  s.convertTransactionStats(data.WeekStats),
		ThisMonthTransactions: s.convertTransactionStats(data.MonthStats),
		ActiveMerchants:       data.ActiveMerchants,
		ActiveAccounts:        data.ActiveAccounts,
		PendingOrders:         data.PendingOrders,
		FailedOrders:          data.FailedOrders,
		SystemHealth:          &SystemHealthStatus{
			DatabaseStatus:    "healthy",
			CacheStatus:       "healthy",
			QueueStatus:       "healthy",
			ExternalAPIStatus: "healthy",
			LastCheckedAt:     time.Now(),
		},
		GeneratedAt: time.Now(),
	}

	// Cache for 1 minute
	s.setCache(ctx, cacheKey, stats, time.Minute)

	return stats, nil
}

// GetFundsCreditedToday provides today's credited amounts split by cash and grant with caching
func (s *reportService) GetFundsCreditedToday(ctx context.Context, req *FundsCreditedRequest) (*FundsCreditedToday, error) {
    cacheKey := "stats:funds_credited_today"
    if req != nil && req.TenantID != nil { cacheKey += ":tenant:" + req.TenantID.String() }
    if cached, err := s.getFromCache(ctx, cacheKey); err == nil && cached != nil {
        var out FundsCreditedToday
        if err := json.Unmarshal(cached, &out); err == nil { return &out, nil }
    }
    filter := &repository.FundsCreditedFilter{ }
    if req != nil { filter.TenantID = req.TenantID }
    data, err := s.reportRepo.GetFundsCreditedToday(ctx, filter)
    if err != nil { return nil, fmt.Errorf("failed to get funds credited today: %w", err) }
    total := data.Cash.Add(data.Grant)
    cashPct := decimal.Zero; grantPct := decimal.Zero
    if total.GreaterThan(decimal.Zero) {
        cashPct = data.Cash.Div(total).Mul(decimal.NewFromInt(100))
        grantPct = data.Grant.Div(total).Mul(decimal.NewFromInt(100))
    }
    out := &FundsCreditedToday{ Date: data.Date, Cash: data.Cash, Grant: data.Grant, Total: total, CashPct: cashPct, GrantPct: grantPct }
    _ = s.setCache(ctx, cacheKey, out, time.Minute)
    return out, nil
}

// GetFundsCreditedTrend provides last N days credited amounts split and cached
func (s *reportService) GetFundsCreditedTrend(ctx context.Context, req *FundsCreditedTrendRequest) (*FundsCreditedTrendResult, error) {
    days := 14
    if req != nil && req.Days > 0 { days = req.Days }
    cacheKey := fmt.Sprintf("stats:funds_credited_trend:%d", days)
    if req != nil && req.TenantID != nil { cacheKey += ":tenant:" + req.TenantID.String() }
    if cached, err := s.getFromCache(ctx, cacheKey); err == nil && cached != nil {
        var out FundsCreditedTrendResult
        if err := json.Unmarshal(cached, &out); err == nil { return &out, nil }
    }
    filter := &repository.FundsCreditedTrendFilter{ Days: days }
    if req != nil { filter.TenantID = req.TenantID }
    data, err := s.reportRepo.GetFundsCreditedTrend(ctx, filter)
    if err != nil { return nil, fmt.Errorf("failed to get funds credited trend: %w", err) }
    series := make([]*FundsCreditedTrendPoint, len(data))
    for i, d := range data { series[i] = &FundsCreditedTrendPoint{ Day: d.Day, Cash: d.Cash, Grant: d.Grant } }
    out := &FundsCreditedTrendResult{ Days: days, Series: series }
    _ = s.setCache(ctx, cacheKey, out, 5*time.Minute)
    return out, nil
}

// GetDashboardData retrieves dashboard data
func (s *reportService) GetDashboardData(ctx context.Context, req *DashboardRequest) (*DashboardData, error) {
	var startDate, endDate time.Time
	now := time.Now()

	// Determine time range
	switch req.TimeRange {
	case "today":
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = now
	case "yesterday":
		yesterday := now.AddDate(0, 0, -1)
		startDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
		endDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case "week":
		startDate = now.AddDate(0, 0, -7)
		endDate = now
	case "month":
		startDate = now.AddDate(0, -1, 0)
		endDate = now
	case "custom":
		if req.StartDate != nil && req.EndDate != nil {
			startDate = *req.StartDate
			endDate = *req.EndDate
		} else {
			return nil, fmt.Errorf("start_date and end_date are required for custom time range")
		}
	default:
		startDate = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		endDate = now
	}

	// Get statistics
	statsReq := &TransactionStatisticsRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		MerchantIDs: req.MerchantIDs,
	}
	statistics, err := s.GetTransactionStatistics(ctx, statsReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get statistics: %w", err)
	}

	// Get trend data
	trendReq := &TimeSeriesRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		Metrics:     []string{"count", "amount", "success_rate"},
		MerchantIDs: req.MerchantIDs,
		Granularity: "day",
	}
	trendData, err := s.GetTimeSeriesData(ctx, trendReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get trend data: %w", err)
	}

	// Get top merchants
	merchantReq := &MerchantStatisticsRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		MerchantIDs: req.MerchantIDs,
		Limit:       10,
		OrderBy:     "total_amount",
		OrderDir:    "DESC",
	}
	merchantStats, err := s.GetMerchantStatistics(ctx, merchantReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant statistics: %w", err)
	}

	// Get top accounts
	accountReq := &AccountStatisticsRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		MerchantIDs: req.MerchantIDs,
		Limit:       10,
		OrderBy:     "total_amount",
		OrderDir:    "DESC",
	}
	accountStats, err := s.GetAccountStatistics(ctx, accountReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get account statistics: %w", err)
	}

	// Get recent orders
	recentOrders, err := s.reportRepo.GetRecentOrders(ctx, 20)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent orders: %w", err)
	}

	recentOrderItems := make([]*RecentOrderItem, len(recentOrders))
	for i, order := range recentOrders {
		recentOrderItems[i] = &RecentOrderItem{
			ID:           order.ID,
			OrderNumber:  order.OrderNumber,
			PayerName:    order.PayerName,
			Amount:       order.Amount,
			MerchantName: order.MerchantName,
			Status:       order.Status,
			CreatedAt:    order.CreatedAt,
		}
	}

	return &DashboardData{
		TimeRange:    req.TimeRange,
		StartDate:    startDate,
		EndDate:      endDate,
		Statistics:   statistics,
		TrendData:    trendData,
		TopMerchants: merchantStats.Merchants,
		TopAccounts:  accountStats.Accounts,
		RecentOrders: recentOrderItems,
		Alerts:       []*DashboardAlert{}, // TODO: Implement alerts
		SystemStatus: &SystemHealthStatus{
			DatabaseStatus:    "healthy",
			CacheStatus:       "healthy",
			QueueStatus:       "healthy",
			ExternalAPIStatus: "healthy",
			LastCheckedAt:     time.Now(),
		},
		GeneratedAt: time.Now(),
	}, nil
}

// RefreshStatisticsCache refreshes statistics cache
func (s *reportService) RefreshStatisticsCache(ctx context.Context, cacheKey string) error {
	return s.redis.Del(ctx, cacheKey).Err()
}

// ClearStatisticsCache clears all statistics cache
func (s *reportService) ClearStatisticsCache(ctx context.Context) error {
	pattern := "stats:*"
	keys, err := s.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return s.redis.Del(ctx, keys...).Err()
	}

	return nil
}

// QueryTransactions performs multi-dimensional transaction queries
func (s *reportService) QueryTransactions(ctx context.Context, req *TransactionQueryRequest) (*TransactionQueryResult, error) {
	startTime := time.Now()
	
	// Parse time range
	startDate, endDate, err := s.parseTimeRange(req.TimeRange, req.StartDate, req.EndDate)
	if err != nil {
		return nil, fmt.Errorf("invalid time range: %w", err)
	}

	// Build repository filter
	filter := &repository.TransactionQueryFilter{
		StartDate:     &startDate,
		EndDate:       &endDate,
		Status:        req.Status,
		MerchantIDs:   req.MerchantIDs,
		MerchantNames: req.MerchantNames,
		AccountIDs:    req.AccountIDs,
		AccountNames:  req.AccountNames,
		AccountTypes:  req.AccountTypes,
		PaymentTypes:  req.PaymentTypes,
		MinAmount:     req.MinAmount,
		MaxAmount:     req.MaxAmount,
		PayerName:     req.PayerName,
		PayerAccount:  req.PayerAccount,
		OrderNumber:   req.OrderNumber,
		Limit:         req.Limit,
		Offset:        req.Offset,
		OrderBy:       req.OrderBy,
		OrderDir:      req.OrderDir,
		GroupBy:       req.GroupBy,
		Granularity:   req.Granularity,
	}

	// Set defaults
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.OrderBy == "" {
		filter.OrderBy = "created_at"
	}
	if filter.OrderDir == "" {
		filter.OrderDir = "DESC"
	}

	// Query transactions
	transactions, totalCount, err := s.reportRepo.QueryTransactions(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to query transactions: %w", err)
	}

	// Convert to service types
	transactionDetails := make([]*TransactionDetail, len(transactions))
	for i, tx := range transactions {
		transactionDetails[i] = &TransactionDetail{
			ID:              tx.ID,
			OrderNumber:     tx.OrderNumber,
			PayerName:       tx.PayerName,
			PayerAccount:    tx.PayerAccount,
			PaymentType:     tx.PaymentType,
			Amount:          tx.Amount,
			MerchantID:      tx.MerchantID,
			MerchantName:    tx.MerchantName,
			MerchantCode:    tx.MerchantCode,
			AdAccount:       tx.AdAccount,
			AccountID:       tx.AccountID,
			AccountName:     tx.AccountName,
			AccountNumber:   tx.AccountNumber,
			AccountType:     tx.AccountType,
			Status:          tx.Status,
			Remark:          tx.Remark,
			VoucherURL:      tx.VoucherURL,
			CreatedAt:       tx.CreatedAt,
			UpdatedAt:       tx.UpdatedAt,
			ProcessedAt:     tx.ProcessedAt,
		}
	}

	result := &TransactionQueryResult{
		Query:         req,
		TotalCount:    totalCount,
		FilteredCount: int64(len(transactions)),
		Transactions:  transactionDetails,
		ExecutionTime: time.Since(startTime),
		GeneratedAt:   time.Now(),
	}

	// Add summary if requested
	if req.IncludeSummary {
		statsReq := &TransactionStatisticsRequest{
			StartDate:   startDate,
			EndDate:     endDate,
			MerchantIDs: req.MerchantIDs,
			AccountIDs:  req.AccountIDs,
			Status:      req.Status,
		}
		summary, err := s.GetTransactionStatistics(ctx, statsReq)
		if err != nil {
			return nil, fmt.Errorf("failed to get summary statistics: %w", err)
		}
		result.Summary = summary
	}

	return result, nil
}

// GetFilterOptions retrieves available filter options
func (s *reportService) GetFilterOptions(ctx context.Context, req *FilterOptionsRequest) (*FilterOptions, error) {
	// Check cache first
	cacheKey := s.buildCacheKey("filter_options", req)
	if cached, err := s.getFromCache(ctx, cacheKey); err == nil && cached != nil {
		var options FilterOptions
		if err := json.Unmarshal(cached, &options); err == nil {
			return &options, nil
		}
	}

	filter := &repository.FilterOptionsFilter{
		IncludeMerchants: req.IncludeMerchants,
		IncludeAccounts:  req.IncludeAccounts,
		IncludeStatuses:  req.IncludeStatuses,
		IncludeTypes:     req.IncludeTypes,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
	}

	data, err := s.reportRepo.GetFilterOptions(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get filter options: %w", err)
	}

	options := &FilterOptions{
		GeneratedAt: time.Now(),
	}

	// Convert merchants
	if data.Merchants != nil {
		options.Merchants = make([]*FilterMerchant, len(data.Merchants))
		for i, m := range data.Merchants {
			options.Merchants[i] = &FilterMerchant{
				ID:               m.ID,
				Name:             m.Name,
				Code:             m.Code,
				TransactionCount: m.TransactionCount,
				TotalAmount:      m.TotalAmount,
			}
		}
	}

	// Convert accounts
	if data.Accounts != nil {
		options.Accounts = make([]*FilterAccount, len(data.Accounts))
		for i, a := range data.Accounts {
			options.Accounts[i] = &FilterAccount{
				ID:               a.ID,
				Name:             a.Name,
				Number:           a.Number,
				Type:             a.Type,
				PaymentType:      a.PaymentType,
				TransactionCount: a.TransactionCount,
				TotalAmount:      a.TotalAmount,
			}
		}
	}

	// Convert statuses
	if data.Statuses != nil {
		options.Statuses = make([]*FilterStatus, len(data.Statuses))
		for i, st := range data.Statuses {
			options.Statuses[i] = &FilterStatus{
				Status:      st.Status,
				DisplayName: st.DisplayName,
				Count:       st.Count,
				Percentage:  st.Percentage,
			}
		}
	}

	// Convert account types
	if data.AccountTypes != nil {
		options.AccountTypes = make([]*FilterType, len(data.AccountTypes))
		for i, at := range data.AccountTypes {
			options.AccountTypes[i] = &FilterType{
				Type:        at.Type,
				DisplayName: at.DisplayName,
				Count:       at.Count,
				Percentage:  at.Percentage,
			}
		}
	}

	// Convert payment types
	if data.PaymentTypes != nil {
		options.PaymentTypes = make([]*FilterType, len(data.PaymentTypes))
		for i, pt := range data.PaymentTypes {
			options.PaymentTypes[i] = &FilterType{
				Type:        pt.Type,
				DisplayName: pt.DisplayName,
				Count:       pt.Count,
				Percentage:  pt.Percentage,
			}
		}
	}

	// Cache for 10 minutes
	s.setCache(ctx, cacheKey, options, 10*time.Minute)

	return options, nil
}

// GetTimeDimensionData retrieves time dimension data
func (s *reportService) GetTimeDimensionData(ctx context.Context, req *TimeDimensionRequest) (*TimeDimensionResult, error) {
	// Parse time range
	startDate, endDate, err := s.parseTimeRange(req.TimeRange, req.StartDate, req.EndDate)
	if err != nil {
		return nil, fmt.Errorf("invalid time range: %w", err)
	}

	// Set default granularity
	granularity := req.Granularity
	if granularity == "" {
		granularity = "day"
	}

	filter := &repository.TimeDimensionFilter{
		StartDate:   &startDate,
		EndDate:     &endDate,
		Granularity: granularity,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		Status:      req.Status,
	}

	data, err := s.reportRepo.GetTimeDimensionData(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get time dimension data: %w", err)
	}

	// Convert to service types
	dataPoints := make([]*TimeDimensionPoint, len(data))
	for i, d := range data {
		successRate := decimal.Zero
		if d.Count > 0 {
			successRate = decimal.NewFromInt(d.SuccessCount).Div(decimal.NewFromInt(d.Count)).Mul(decimal.NewFromInt(100))
		}

		dataPoints[i] = &TimeDimensionPoint{
			Timestamp:     d.Timestamp,
			PeriodLabel:   d.PeriodLabel,
			Count:         d.Count,
			Amount:        d.Amount,
			SuccessCount:  d.SuccessCount,
			SuccessAmount: d.SuccessAmount,
			FailedCount:   d.FailedCount,
			FailedAmount:  d.FailedAmount,
			SuccessRate:   successRate,
		}
	}

	// Get summary statistics
	statsReq := &TransactionStatisticsRequest{
		StartDate:   startDate,
		EndDate:     endDate,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		Status:      req.Status,
	}
	summary, err := s.GetTransactionStatistics(ctx, statsReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary statistics: %w", err)
	}

	return &TimeDimensionResult{
		TimeRange:   req.TimeRange,
		StartDate:   startDate,
		EndDate:     endDate,
		Granularity: granularity,
		DataPoints:  dataPoints,
		Summary:     summary,
		GeneratedAt: time.Now(),
	}, nil
}

// GetStatusDimensionData retrieves status dimension data
func (s *reportService) GetStatusDimensionData(ctx context.Context, req *StatusDimensionRequest) (*StatusDimensionResult, error) {
	// Set default dates if not provided
	startDate := req.StartDate
	endDate := req.EndDate
	if startDate == nil {
		now := time.Now()
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		startDate = &start
	}
	if endDate == nil {
		now := time.Now()
		endDate = &now
	}

	filter := &repository.StatusDimensionFilter{
		StartDate:   startDate,
		EndDate:     endDate,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
		PaymentType: req.PaymentType,
	}

	data, err := s.reportRepo.GetStatusDimensionData(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get status dimension data: %w", err)
	}

	// Convert to service types
	statusData := make([]*StatusDimensionPoint, len(data))
	for i, d := range data {
		statusData[i] = &StatusDimensionPoint{
			Status:        d.Status,
			DisplayName:   d.DisplayName,
			Count:         d.Count,
			Amount:        d.Amount,
			Percentage:    d.Percentage,
			AmountPercent: d.AmountPercent,
		}
	}

	// Get summary statistics
	statsReq := &TransactionStatisticsRequest{
		StartDate:   *startDate,
		EndDate:     *endDate,
		MerchantIDs: req.MerchantIDs,
		AccountIDs:  req.AccountIDs,
	}
	if req.PaymentType != nil {
		statsReq.PaymentType = req.PaymentType
	}
	summary, err := s.GetTransactionStatistics(ctx, statsReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary statistics: %w", err)
	}

	return &StatusDimensionResult{
		Period:      s.formatPeriod(*startDate, *endDate),
		StartDate:   *startDate,
		EndDate:     *endDate,
		StatusData:  statusData,
		Summary:     summary,
		GeneratedAt: time.Now(),
	}, nil
}

// GetMerchantDimensionData retrieves merchant dimension data
func (s *reportService) GetMerchantDimensionData(ctx context.Context, req *MerchantDimensionRequest) (*MerchantDimensionResult, error) {
	// Set default dates if not provided
	startDate := req.StartDate
	endDate := req.EndDate
	if startDate == nil {
		now := time.Now()
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		startDate = &start
	}
	if endDate == nil {
		now := time.Now()
		endDate = &now
	}

	filter := &repository.MerchantDimensionFilter{
		StartDate:   startDate,
		EndDate:     endDate,
		MerchantIDs: req.MerchantIDs,
		Status:      req.Status,
		PaymentType: req.PaymentType,
		Limit:       req.Limit,
		Offset:      req.Offset,
		OrderBy:     req.OrderBy,
		OrderDir:    req.OrderDir,
	}

	// Set defaults
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.OrderBy == "" {
		filter.OrderBy = "total_amount"
	}
	if filter.OrderDir == "" {
		filter.OrderDir = "DESC"
	}

	data, total, err := s.reportRepo.GetMerchantDimensionData(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant dimension data: %w", err)
	}

	// Convert to service types
	merchantData := make([]*MerchantDimensionPoint, len(data))
	for i, d := range data {
		successRate := decimal.Zero
		averageAmount := decimal.Zero
		limitUtilization := decimal.Zero

		if d.Count > 0 {
			successRate = decimal.NewFromInt(d.SuccessCount).Div(decimal.NewFromInt(d.Count)).Mul(decimal.NewFromInt(100))
			averageAmount = d.Amount.Div(decimal.NewFromInt(d.Count))
		}
		if d.DailyLimit.GreaterThan(decimal.Zero) {
			limitUtilization = d.DailyUsed.Div(d.DailyLimit).Mul(decimal.NewFromInt(100))
		}

		merchantData[i] = &MerchantDimensionPoint{
			MerchantID:       d.MerchantID,
			MerchantName:     d.MerchantName,
			MerchantCode:     d.MerchantCode,
			Count:            d.Count,
			Amount:           d.Amount,
			SuccessCount:     d.SuccessCount,
			SuccessAmount:    d.SuccessAmount,
			FailedCount:      d.FailedCount,
			FailedAmount:     d.FailedAmount,
			SuccessRate:      successRate,
			AverageAmount:    averageAmount,
			DailyLimit:       d.DailyLimit,
			DailyUsed:        d.DailyUsed,
			LimitUtilization: limitUtilization,
			Rank:             i + 1,
		}
	}

	// Get summary statistics
	statsReq := &TransactionStatisticsRequest{
		StartDate:   *startDate,
		EndDate:     *endDate,
		MerchantIDs: req.MerchantIDs,
		Status:      req.Status,
	}
	if req.PaymentType != nil {
		statsReq.PaymentType = req.PaymentType
	}
	summary, err := s.GetTransactionStatistics(ctx, statsReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary statistics: %w", err)
	}

	return &MerchantDimensionResult{
		Period:       s.formatPeriod(*startDate, *endDate),
		StartDate:    *startDate,
		EndDate:      *endDate,
		MerchantData: merchantData,
		Total:        total,
		Summary:      summary,
		GeneratedAt:  time.Now(),
	}, nil
}

// GetAccountDimensionData retrieves account dimension data
func (s *reportService) GetAccountDimensionData(ctx context.Context, req *AccountDimensionRequest) (*AccountDimensionResult, error) {
	// Set default dates if not provided
	startDate := req.StartDate
	endDate := req.EndDate
	if startDate == nil {
		now := time.Now()
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		startDate = &start
	}
	if endDate == nil {
		now := time.Now()
		endDate = &now
	}

	filter := &repository.AccountDimensionFilter{
		StartDate:   startDate,
		EndDate:     endDate,
		AccountIDs:  req.AccountIDs,
		MerchantIDs: req.MerchantIDs,
		AccountType: req.AccountType,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		Limit:       req.Limit,
		Offset:      req.Offset,
		OrderBy:     req.OrderBy,
		OrderDir:    req.OrderDir,
	}

	// Set defaults
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.OrderBy == "" {
		filter.OrderBy = "total_amount"
	}
	if filter.OrderDir == "" {
		filter.OrderDir = "DESC"
	}

	data, total, err := s.reportRepo.GetAccountDimensionData(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get account dimension data: %w", err)
	}

	// Convert to service types
	accountData := make([]*AccountDimensionPoint, len(data))
	for i, d := range data {
		successRate := decimal.Zero
		averageAmount := decimal.Zero
		limitUtilization := decimal.Zero

		if d.Count > 0 {
			successRate = decimal.NewFromInt(d.SuccessCount).Div(decimal.NewFromInt(d.Count)).Mul(decimal.NewFromInt(100))
			averageAmount = d.Amount.Div(decimal.NewFromInt(d.Count))
		}
		if d.DailyLimit.GreaterThan(decimal.Zero) {
			limitUtilization = d.DailyUsed.Div(d.DailyLimit).Mul(decimal.NewFromInt(100))
		}

		accountData[i] = &AccountDimensionPoint{
			AccountID:        d.AccountID,
			AccountName:      d.AccountName,
			AccountNumber:    d.AccountNumber,
			AccountType:      d.AccountType,
			PaymentType:      d.PaymentType,
			Count:            d.Count,
			Amount:           d.Amount,
			SuccessCount:     d.SuccessCount,
			SuccessAmount:    d.SuccessAmount,
			FailedCount:      d.FailedCount,
			FailedAmount:     d.FailedAmount,
			SuccessRate:      successRate,
			AverageAmount:    averageAmount,
			DailyLimit:       d.DailyLimit,
			DailyUsed:        d.DailyUsed,
			LimitUtilization: limitUtilization,
			Rank:             i + 1,
		}
	}

	// Get summary statistics
	statsReq := &TransactionStatisticsRequest{
		StartDate:   *startDate,
		EndDate:     *endDate,
		AccountIDs:  req.AccountIDs,
		MerchantIDs: req.MerchantIDs,
		Status:      req.Status,
	}
	if req.PaymentType != nil {
		statsReq.PaymentType = req.PaymentType
	}
	summary, err := s.GetTransactionStatistics(ctx, statsReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary statistics: %w", err)
	}

	return &AccountDimensionResult{
		Period:      s.formatPeriod(*startDate, *endDate),
		StartDate:   *startDate,
		EndDate:     *endDate,
		AccountData: accountData,
		Total:       total,
		Summary:     summary,
		GeneratedAt: time.Now(),
	}, nil
}

// parseTimeRange parses time range string and returns start and end dates
func (s *reportService) parseTimeRange(timeRange string, startDate, endDate *time.Time) (time.Time, time.Time, error) {
	now := time.Now()
	
	if timeRange == "custom" {
		if startDate == nil || endDate == nil {
			return time.Time{}, time.Time{}, fmt.Errorf("start_date and end_date are required for custom time range")
		}
		return *startDate, *endDate, nil
	}

	switch timeRange {
	case "today":
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return start, now, nil
	case "yesterday":
		yesterday := now.AddDate(0, 0, -1)
		start := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, yesterday.Location())
		end := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return start, end, nil
	case "this_week":
		weekday := int(now.Weekday())
		if weekday == 0 { // Sunday
			weekday = 7
		}
		start := now.AddDate(0, 0, -(weekday-1))
		start = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
		return start, now, nil
	case "last_week":
		weekday := int(now.Weekday())
		if weekday == 0 { // Sunday
			weekday = 7
		}
		lastWeekEnd := now.AddDate(0, 0, -weekday)
		lastWeekStart := lastWeekEnd.AddDate(0, 0, -6)
		start := time.Date(lastWeekStart.Year(), lastWeekStart.Month(), lastWeekStart.Day(), 0, 0, 0, 0, lastWeekStart.Location())
		end := time.Date(lastWeekEnd.Year(), lastWeekEnd.Month(), lastWeekEnd.Day(), 23, 59, 59, 999999999, lastWeekEnd.Location())
		return start, end, nil
	case "this_month":
		start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		return start, now, nil
	case "last_month":
		lastMonth := now.AddDate(0, -1, 0)
		start := time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, lastMonth.Location())
		end := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Add(-time.Nanosecond)
		return start, end, nil
	default:
		// Default to today
		start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return start, now, nil
	}
}

// Helper methods

func (s *reportService) buildCacheKey(prefix string, req interface{}) string {
	data, _ := json.Marshal(req)
	return fmt.Sprintf("stats:%s:%x", prefix, data)
}

func (s *reportService) getFromCache(ctx context.Context, key string) ([]byte, error) {
	return s.redis.Get(ctx, key).Bytes()
}

func (s *reportService) setCache(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return s.redis.Set(ctx, key, data, expiration).Err()
}

func (s *reportService) formatPeriod(startDate, endDate time.Time) string {
	return fmt.Sprintf("%s - %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
}

func (s *reportService) convertToMap(req *ReportGenerationRequest) map[string]interface{} {
	data, _ := json.Marshal(req)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result
}

func (s *reportService) getContentType(format string) string {
	switch format {
	case "excel":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case "csv":
		return "text/csv"
	case "pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

func (s *reportService) convertTransactionStats(data *repository.TransactionStatisticsData) *TransactionStatistics {
	if data == nil {
		return &TransactionStatistics{}
	}

	stats := &TransactionStatistics{
		TotalCount:    data.TotalCount,
		TotalAmount:   data.TotalAmount,
		SuccessCount:  data.SuccessCount,
		SuccessAmount: data.SuccessAmount,
		FailedCount:   data.FailedCount,
		FailedAmount:  data.FailedAmount,
		PendingCount:  data.PendingCount,
		PendingAmount: data.PendingAmount,
		RefundCount:   data.RefundCount,
		RefundAmount:  data.RefundAmount,
		GeneratedAt:   time.Now(),
	}

	// Calculate derived metrics
	if stats.TotalCount > 0 {
		stats.SuccessRate = decimal.NewFromInt(stats.SuccessCount).Div(decimal.NewFromInt(stats.TotalCount)).Mul(decimal.NewFromInt(100))
		stats.AverageAmount = stats.TotalAmount.Div(decimal.NewFromInt(stats.TotalCount))
	}

	return stats
}

// generateReportAsync generates report asynchronously
func (s *reportService) generateReportAsync(ctx context.Context, reportID uuid.UUID, req *ReportGenerationRequest) {
	// Update status to processing
	report := &repository.Report{
		ID:        reportID,
		Status:    "processing",
		Progress:  10,
		UpdatedAt: time.Now(),
	}
	s.reportRepo.UpdateReport(ctx, report)

	// Generate report using the report generator
	filePath, err := s.generator.GenerateReport(ctx, req)

	if err != nil {
		// Update status to failed
		report.Status = "failed"
		errMsg := err.Error()
		report.ErrorMessage = &errMsg
		report.UpdatedAt = time.Now()
		s.reportRepo.UpdateReport(ctx, report)
		return
	}

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		report.Status = "failed"
		errMsg := fmt.Sprintf("failed to get file info: %v", err)
		report.ErrorMessage = &errMsg
		report.UpdatedAt = time.Now()
		s.reportRepo.UpdateReport(ctx, report)
		return
	}

	// Update status to completed
	fileSize := fileInfo.Size()
	downloadURL := fmt.Sprintf("/api/reports/%s/download", reportID)
	expiresAt := time.Now().Add(24 * time.Hour) // Expire after 24 hours

	report.Status = "completed"
	report.Progress = 100
	report.FileSize = &fileSize
	report.FilePath = &filePath
	report.DownloadURL = &downloadURL
	report.ExpiresAt = &expiresAt
	report.UpdatedAt = time.Now()
	s.reportRepo.UpdateReport(ctx, report)
}

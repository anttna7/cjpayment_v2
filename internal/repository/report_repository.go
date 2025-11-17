package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/company/cjpayment/pkg/cache"
)

// reportRepository implements ReportRepository interface
type reportRepository struct {
	db *sqlx.DB
}

// NewReportRepository creates a new report repository
func NewReportRepository(db *sqlx.DB) ReportRepository {
	return &reportRepository{
		db: db,
	}
}

// GetTransactionStatistics retrieves transaction statistics
func (r *reportRepository) GetTransactionStatistics(ctx context.Context, filter *TransactionStatisticsFilter) (*TransactionStatisticsData, error) {
	query := `
		SELECT 
			COUNT(*) as total_count,
			COALESCE(SUM(amount), 0) as total_amount,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_count,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as success_amount,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
			COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
			COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refund_count,
			COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refund_amount
		FROM recharge_orders ro
		WHERE ro.created_at >= $1 AND ro.created_at <= $2
	`

	args := []interface{}{filter.StartDate, filter.EndDate}
	argIndex := 3

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.merchant_id IN (%s)", strings.Join(placeholders, ","))
	}

	// Add account filter
	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.receive_account_id IN (%s)", strings.Join(placeholders, ","))
	}

	// Add payment type filter
	if filter.PaymentType != nil {
		query += fmt.Sprintf(" AND ro.payment_type = $%d", argIndex)
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	// Add status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.status IN (%s)", strings.Join(placeholders, ","))
	}

	var stats TransactionStatisticsData
	err := r.db.GetContext(ctx, &stats, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction statistics: %w", err)
	}

	return &stats, nil
}

// GetMerchantStatistics retrieves merchant statistics
func (r *reportRepository) GetMerchantStatistics(ctx context.Context, filter *MerchantStatisticsFilter) ([]*MerchantStatisticsData, int64, error) {
	baseQuery := `
		SELECT 
			m.id as merchant_id,
			m.name as merchant_name,
			m.code as merchant_code,
			COUNT(ro.id) as total_count,
			COALESCE(SUM(ro.amount), 0) as total_amount,
			COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) as success_count,
			COALESCE(SUM(CASE WHEN ro.status = 'completed' THEN ro.amount ELSE 0 END), 0) as success_amount,
			COUNT(CASE WHEN ro.status = 'failed' THEN 1 END) as failed_count,
			COALESCE(SUM(CASE WHEN ro.status = 'failed' THEN ro.amount ELSE 0 END), 0) as failed_amount,
			m.daily_limit,
			m.daily_used
		FROM merchants m
		LEFT JOIN recharge_orders ro ON m.id = ro.merchant_id 
			AND ro.created_at >= $1 AND ro.created_at <= $2
	`

	args := []interface{}{filter.StartDate, filter.EndDate}
	argIndex := 3

	whereConditions := []string{}

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("m.id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add payment type filter
	if filter.PaymentType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.payment_type = $%d OR ro.payment_type IS NULL)", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	// Add status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.status IN (%s) OR ro.status IS NULL)", strings.Join(placeholders, ",")))
	}

	if len(whereConditions) > 0 {
		baseQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	baseQuery += " GROUP BY m.id, m.name, m.code, m.daily_limit, m.daily_used"

	// Add ordering
	orderBy := "total_amount"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Count query
	countQuery := `
		SELECT COUNT(DISTINCT m.id)
		FROM merchants m
		LEFT JOIN recharge_orders ro ON m.id = ro.merchant_id 
			AND ro.created_at >= $1 AND ro.created_at <= $2
	`
	if len(whereConditions) > 0 {
		countQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args[:argIndex-len(filter.Status)]...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count merchant statistics: %w", err)
	}

	// Add pagination
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	var stats []*MerchantStatisticsData
	err = r.db.SelectContext(ctx, &stats, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get merchant statistics: %w", err)
	}

	return stats, total, nil
}

// GetAccountStatistics retrieves account statistics
func (r *reportRepository) GetAccountStatistics(ctx context.Context, filter *AccountStatisticsFilter) ([]*AccountStatisticsData, int64, error) {
	baseQuery := `
		SELECT 
			ra.id as account_id,
			ra.account_name,
			ra.account_number,
			ra.account_type,
			ra.payment_type,
			COUNT(ro.id) as total_count,
			COALESCE(SUM(ro.amount), 0) as total_amount,
			COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) as success_count,
			COALESCE(SUM(CASE WHEN ro.status = 'completed' THEN ro.amount ELSE 0 END), 0) as success_amount,
			COUNT(CASE WHEN ro.status = 'failed' THEN 1 END) as failed_count,
			COALESCE(SUM(CASE WHEN ro.status = 'failed' THEN ro.amount ELSE 0 END), 0) as failed_amount,
			ra.daily_limit,
			ra.daily_used
		FROM receive_accounts ra
		LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id 
			AND ro.created_at >= $1 AND ro.created_at <= $2
	`

	args := []interface{}{filter.StartDate, filter.EndDate}
	argIndex := 3

	whereConditions := []string{}

	// Add account filter
	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ra.id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.merchant_id IN (%s) OR ro.merchant_id IS NULL)", strings.Join(placeholders, ",")))
	}

	// Add account type filter
	if filter.AccountType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ra.account_type = $%d", argIndex))
		args = append(args, *filter.AccountType)
		argIndex++
	}

	// Add payment type filter
	if filter.PaymentType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ra.payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	// Add status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.status IN (%s) OR ro.status IS NULL)", strings.Join(placeholders, ",")))
	}

	if len(whereConditions) > 0 {
		baseQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	baseQuery += " GROUP BY ra.id, ra.account_name, ra.account_number, ra.account_type, ra.payment_type, ra.daily_limit, ra.daily_used"

	// Add ordering
	orderBy := "total_amount"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Count query
	countQuery := `
		SELECT COUNT(DISTINCT ra.id)
		FROM receive_accounts ra
		LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id 
			AND ro.created_at >= $1 AND ro.created_at <= $2
	`
	if len(whereConditions) > 0 {
		countQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args[:argIndex-len(filter.Status)]...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count account statistics: %w", err)
	}

	// Add pagination
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	var stats []*AccountStatisticsData
	err = r.db.SelectContext(ctx, &stats, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get account statistics: %w", err)
	}

	return stats, total, nil
}

// GetTransactionAggregation retrieves aggregated transaction data
func (r *reportRepository) GetTransactionAggregation(ctx context.Context, filter *TransactionAggregationFilter) ([]*AggregationData, error) {
	// Build SELECT clause based on group by fields
	selectFields := []string{
		"COUNT(*) as count",
		"COALESCE(SUM(ro.amount), 0) as amount",
		"COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) as success_count",
		"COALESCE(SUM(CASE WHEN ro.status = 'completed' THEN ro.amount ELSE 0 END), 0) as success_amount",
		"COUNT(CASE WHEN ro.status = 'failed' THEN 1 END) as failed_count",
		"COALESCE(SUM(CASE WHEN ro.status = 'failed' THEN ro.amount ELSE 0 END), 0) as failed_amount",
	}

	groupByFields := []string{}
	for _, field := range filter.GroupBy {
		switch field {
		case "merchant":
			selectFields = append(selectFields, "m.id as merchant_id", "m.name as merchant_name")
			groupByFields = append(groupByFields, "m.id", "m.name")
		case "account":
			selectFields = append(selectFields, "ra.id as account_id", "ra.account_name")
			groupByFields = append(groupByFields, "ra.id", "ra.account_name")
		case "payment_type":
			selectFields = append(selectFields, "ro.payment_type")
			groupByFields = append(groupByFields, "ro.payment_type")
		case "status":
			selectFields = append(selectFields, "ro.status")
			groupByFields = append(groupByFields, "ro.status")
		case "date":
			switch filter.Granularity {
			case "hour":
				selectFields = append(selectFields, "DATE_TRUNC('hour', ro.created_at) as date_group")
				groupByFields = append(groupByFields, "DATE_TRUNC('hour', ro.created_at)")
			case "day":
				selectFields = append(selectFields, "DATE_TRUNC('day', ro.created_at) as date_group")
				groupByFields = append(groupByFields, "DATE_TRUNC('day', ro.created_at)")
			case "week":
				selectFields = append(selectFields, "DATE_TRUNC('week', ro.created_at) as date_group")
				groupByFields = append(groupByFields, "DATE_TRUNC('week', ro.created_at)")
			case "month":
				selectFields = append(selectFields, "DATE_TRUNC('month', ro.created_at) as date_group")
				groupByFields = append(groupByFields, "DATE_TRUNC('month', ro.created_at)")
			}
		}
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM recharge_orders ro
		LEFT JOIN merchants m ON ro.merchant_id = m.id
		LEFT JOIN receive_accounts ra ON ro.receive_account_id = ra.id
		WHERE ro.created_at >= $1 AND ro.created_at <= $2
	`, strings.Join(selectFields, ", "))

	args := []interface{}{filter.StartDate, filter.EndDate}
	argIndex := 3

	// Add filters
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.merchant_id IN (%s)", strings.Join(placeholders, ","))
	}

	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.receive_account_id IN (%s)", strings.Join(placeholders, ","))
	}

	if filter.PaymentType != nil {
		query += fmt.Sprintf(" AND ro.payment_type = $%d", argIndex)
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.status IN (%s)", strings.Join(placeholders, ","))
	}

	// Add GROUP BY
	if len(groupByFields) > 0 {
		query += " GROUP BY " + strings.Join(groupByFields, ", ")
	}

	// Add ordering
	orderBy := "amount"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get transaction aggregation: %w", err)
	}
	defer rows.Close()

	var results []*AggregationData
	for rows.Next() {
		data := &AggregationData{
			Dimensions: make(map[string]interface{}),
		}

		// Prepare scan destinations
		scanDest := []interface{}{
			&data.Count,
			&data.Amount,
			&data.SuccessCount,
			&data.SuccessAmount,
			&data.FailedCount,
			&data.FailedAmount,
		}

		// Add dimension scan destinations
		var merchantID, accountID *uuid.UUID
		var merchantName, accountName, paymentType, status *string
		var dateGroup *time.Time

		for _, field := range filter.GroupBy {
			switch field {
			case "merchant":
				scanDest = append(scanDest, &merchantID, &merchantName)
			case "account":
				scanDest = append(scanDest, &accountID, &accountName)
			case "payment_type":
				scanDest = append(scanDest, &paymentType)
			case "status":
				scanDest = append(scanDest, &status)
			case "date":
				scanDest = append(scanDest, &dateGroup)
			}
		}

		err := rows.Scan(scanDest...)
		if err != nil {
			return nil, fmt.Errorf("failed to scan aggregation row: %w", err)
		}

		// Populate dimensions
		for _, field := range filter.GroupBy {
			switch field {
			case "merchant":
				if merchantID != nil {
					data.Dimensions["merchant_id"] = *merchantID
				}
				if merchantName != nil {
					data.Dimensions["merchant_name"] = *merchantName
				}
			case "account":
				if accountID != nil {
					data.Dimensions["account_id"] = *accountID
				}
				if accountName != nil {
					data.Dimensions["account_name"] = *accountName
				}
			case "payment_type":
				if paymentType != nil {
					data.Dimensions["payment_type"] = *paymentType
				}
			case "status":
				if status != nil {
					data.Dimensions["status"] = *status
				}
			case "date":
				if dateGroup != nil {
					data.Dimensions["date"] = *dateGroup
				}
			}
		}

		results = append(results, data)
	}

	return results, nil
}

// GetTimeSeriesData retrieves time series data
func (r *reportRepository) GetTimeSeriesData(ctx context.Context, filter *TimeSeriesFilter) ([]*TimeSeriesData, error) {
	var dateFormat string
	switch filter.Granularity {
	case "hour":
		dateFormat = "DATE_TRUNC('hour', ro.created_at)"
	case "day":
		dateFormat = "DATE_TRUNC('day', ro.created_at)"
	case "week":
		dateFormat = "DATE_TRUNC('week', ro.created_at)"
	case "month":
		dateFormat = "DATE_TRUNC('month', ro.created_at)"
	default:
		dateFormat = "DATE_TRUNC('day', ro.created_at)"
	}

	selectFields := []string{
		fmt.Sprintf("%s as timestamp", dateFormat),
	}

	for _, metric := range filter.Metrics {
		switch metric {
		case "count":
			selectFields = append(selectFields, "COUNT(*) as count")
		case "amount":
			selectFields = append(selectFields, "COALESCE(SUM(ro.amount), 0) as amount")
		case "success_rate":
			selectFields = append(selectFields, `
				CASE 
					WHEN COUNT(*) > 0 THEN 
						ROUND(COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2)
					ELSE 0 
				END as success_rate
			`)
		}
	}

	query := fmt.Sprintf(`
		SELECT %s
		FROM recharge_orders ro
		WHERE ro.created_at >= $1 AND ro.created_at <= $2
	`, strings.Join(selectFields, ", "))

	args := []interface{}{filter.StartDate, filter.EndDate}
	argIndex := 3

	// Add filters
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.merchant_id IN (%s)", strings.Join(placeholders, ","))
	}

	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.receive_account_id IN (%s)", strings.Join(placeholders, ","))
	}

	if filter.PaymentType != nil {
		query += fmt.Sprintf(" AND ro.payment_type = $%d", argIndex)
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		query += fmt.Sprintf(" AND ro.status IN (%s)", strings.Join(placeholders, ","))
	}

	query += fmt.Sprintf(" GROUP BY %s ORDER BY timestamp", dateFormat)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get time series data: %w", err)
	}
	defer rows.Close()

	var results []*TimeSeriesData
	for rows.Next() {
		data := &TimeSeriesData{
			Values: make(map[string]decimal.Decimal),
		}

		scanDest := []interface{}{&data.Timestamp}
		
		for _, metric := range filter.Metrics {
			var value decimal.Decimal
			scanDest = append(scanDest, &value)
			data.Values[metric] = value
		}

		err := rows.Scan(scanDest...)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time series row: %w", err)
		}

		results = append(results, data)
	}

	return results, nil
}

// CreateReport creates a new report
func (r *reportRepository) CreateReport(ctx context.Context, report *Report) error {
	query := `
		INSERT INTO reports (id, report_type, format, title, description, status, progress, parameters, created_at, updated_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	
	_, err := r.db.ExecContext(ctx, query,
		report.ID,
		report.ReportType,
		report.Format,
		report.Title,
		report.Description,
		report.Status,
		report.Progress,
		report.Parameters,
		report.CreatedAt,
		report.UpdatedAt,
		report.CreatedBy,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create report: %w", err)
	}
	
	return nil
}

// GetReport retrieves a report by ID
func (r *reportRepository) GetReport(ctx context.Context, id uuid.UUID) (*Report, error) {
	query := `
		SELECT id, report_type, format, title, description, status, progress, file_size, file_path, 
			   download_url, expires_at, error_message, parameters, created_at, updated_at, created_by
		FROM reports
		WHERE id = $1
	`
	
	var report Report
	err := r.db.GetContext(ctx, &report, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get report: %w", err)
	}
	
	return &report, nil
}

// UpdateReport updates a report
func (r *reportRepository) UpdateReport(ctx context.Context, report *Report) error {
	query := `
		UPDATE reports 
		SET status = $2, progress = $3, file_size = $4, file_path = $5, download_url = $6, 
			expires_at = $7, error_message = $8, updated_at = $9
		WHERE id = $1
	`
	
	_, err := r.db.ExecContext(ctx, query,
		report.ID,
		report.Status,
		report.Progress,
		report.FileSize,
		report.FilePath,
		report.DownloadURL,
		report.ExpiresAt,
		report.ErrorMessage,
		report.UpdatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("failed to update report: %w", err)
	}
	
	return nil
}

// DeleteReport deletes a report
func (r *reportRepository) DeleteReport(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM reports WHERE id = $1`
	
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete report: %w", err)
	}
	
	return nil
}

// ListReports lists reports with filtering
func (r *reportRepository) ListReports(ctx context.Context, filter *ReportFilter) ([]*Report, int64, error) {
	baseQuery := `
		SELECT id, report_type, format, title, description, status, progress, file_size, file_path, 
			   download_url, expires_at, error_message, parameters, created_at, updated_at, created_by
		FROM reports
	`
	
	countQuery := `SELECT COUNT(*) FROM reports`
	
	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1
	
	if filter.ReportType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("report_type = $%d", argIndex))
		args = append(args, *filter.ReportType)
		argIndex++
	}
	
	if filter.Status != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}
	
	if filter.CreatedBy != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_by = $%d", argIndex))
		args = append(args, *filter.CreatedBy)
		argIndex++
	}
	
	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}
	
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}
	
	if len(whereConditions) > 0 {
		whereClause := " WHERE " + strings.Join(whereConditions, " AND ")
		baseQuery += whereClause
		countQuery += whereClause
	}
	
	// Get total count
	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count reports: %w", err)
	}
	
	// Add ordering
	orderBy := "created_at"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)
	
	// Add pagination
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}
	
	var reports []*Report
	err = r.db.SelectContext(ctx, &reports, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list reports: %w", err)
	}
	
	return reports, total, nil
}

// GetRealTimeStatistics retrieves real-time statistics
func (r *reportRepository) GetRealTimeStatistics(ctx context.Context) (*RealTimeStatisticsData, error) {
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterday := today.AddDate(0, 0, -1)
	weekStart := today.AddDate(0, 0, -int(today.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	// Get today's statistics
	todayStats, err := r.GetTransactionStatistics(ctx, &TransactionStatisticsFilter{
		StartDate: today,
		EndDate:   now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get today statistics: %w", err)
	}

	// Get yesterday's statistics
	yesterdayStats, err := r.GetTransactionStatistics(ctx, &TransactionStatisticsFilter{
		StartDate: yesterday,
		EndDate:   today,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get yesterday statistics: %w", err)
	}

	// Get this week's statistics
	weekStats, err := r.GetTransactionStatistics(ctx, &TransactionStatisticsFilter{
		StartDate: weekStart,
		EndDate:   now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get week statistics: %w", err)
	}

	// Get this month's statistics
	monthStats, err := r.GetTransactionStatistics(ctx, &TransactionStatisticsFilter{
		StartDate: monthStart,
		EndDate:   now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get month statistics: %w", err)
	}

	// Get counts
	countsQuery := `
		SELECT 
			(SELECT COUNT(*) FROM merchants WHERE status = 'active') as active_merchants,
			(SELECT COUNT(*) FROM receive_accounts WHERE status = 'active') as active_accounts,
			(SELECT COUNT(*) FROM recharge_orders WHERE status = 'pending') as pending_orders,
			(SELECT COUNT(*) FROM recharge_orders WHERE status = 'failed') as failed_orders
	`

	var counts struct {
		ActiveMerchants int64 `db:"active_merchants"`
		ActiveAccounts  int64 `db:"active_accounts"`
		PendingOrders   int64 `db:"pending_orders"`
		FailedOrders    int64 `db:"failed_orders"`
	}

	err = r.db.GetContext(ctx, &counts, countsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get counts: %w", err)
	}

	return &RealTimeStatisticsData{
		TodayStats:      todayStats,
		YesterdayStats:  yesterdayStats,
		WeekStats:       weekStats,
		MonthStats:      monthStats,
		ActiveMerchants: counts.ActiveMerchants,
		ActiveAccounts:  counts.ActiveAccounts,
		PendingOrders:   counts.PendingOrders,
		FailedOrders:    counts.FailedOrders,
	}, nil
}

// GetDashboardData retrieves dashboard data
func (r *reportRepository) GetDashboardData(ctx context.Context, filter *DashboardFilter) (*DashboardData, error) {
	// This is a simplified implementation
	// In a real implementation, you would build this based on the filter
	return &DashboardData{}, nil
}

// GetRecentOrders retrieves recent orders
func (r *reportRepository) GetRecentOrders(ctx context.Context, limit int) ([]*RecentOrderData, error) {
	query := `
		SELECT ro.id, ro.order_number, ro.payer_name, ro.amount, m.name as merchant_name, ro.status, ro.created_at
		FROM recharge_orders ro
		LEFT JOIN merchants m ON ro.merchant_id = m.id
		ORDER BY ro.created_at DESC
		LIMIT $1
	`

	var orders []*RecentOrderData
	err := r.db.SelectContext(ctx, &orders, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent orders: %w", err)
	}

	return orders, nil
}

// GetSystemHealthStatus retrieves system health status
func (r *reportRepository) GetSystemHealthStatus(ctx context.Context) (*SystemHealthData, error) {
	// This is a simplified implementation
	// In a real implementation, you would check actual system health
	return &SystemHealthData{
		DatabaseStatus:    "healthy",
		CacheStatus:       "healthy",
		QueueStatus:       "healthy",
		ExternalAPIStatus: "healthy",
		LastCheckedAt:     time.Now(),
	}, nil
}

// QueryTransactions performs multi-dimensional transaction queries
func (r *reportRepository) QueryTransactions(ctx context.Context, filter *TransactionQueryFilter) ([]*TransactionDetailData, int64, error) {
	baseQuery := `
		SELECT 
			ro.id,
			ro.order_number,
			ro.payer_name,
			ro.payer_account,
			ro.payment_type,
			ro.amount,
			ro.merchant_id,
			m.name as merchant_name,
			m.code as merchant_code,
			ro.ad_account,
			ro.receive_account_id as account_id,
			ra.account_name,
			ra.account_number,
			ra.account_type,
			ro.status,
			ro.remark,
			ro.voucher_url,
			ro.created_at,
			ro.updated_at,
			NULL as processed_at
		FROM recharge_orders ro
		JOIN merchants m ON ro.merchant_id = m.id
		JOIN receive_accounts ra ON ro.receive_account_id = ra.id
	`

	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	// Time filters
	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	// Status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ro.status IN (%s)", strings.Join(placeholders, ",")))
	}

	// Merchant filters
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ro.merchant_id IN (%s)", strings.Join(placeholders, ",")))
	}
	if len(filter.MerchantNames) > 0 {
		placeholders := make([]string, len(filter.MerchantNames))
		for i, name := range filter.MerchantNames {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, "%"+name+"%")
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("m.name ILIKE ANY(ARRAY[%s])", strings.Join(placeholders, ",")))
	}

	// Account filters
	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ro.receive_account_id IN (%s)", strings.Join(placeholders, ",")))
	}
	if len(filter.AccountNames) > 0 {
		placeholders := make([]string, len(filter.AccountNames))
		for i, name := range filter.AccountNames {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, "%"+name+"%")
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ra.account_name ILIKE ANY(ARRAY[%s])", strings.Join(placeholders, ",")))
	}
	if len(filter.AccountTypes) > 0 {
		placeholders := make([]string, len(filter.AccountTypes))
		for i, accountType := range filter.AccountTypes {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountType)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ra.account_type IN (%s)", strings.Join(placeholders, ",")))
	}
	if len(filter.PaymentTypes) > 0 {
		placeholders := make([]string, len(filter.PaymentTypes))
		for i, paymentType := range filter.PaymentTypes {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, paymentType)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ro.payment_type IN (%s)", strings.Join(placeholders, ",")))
	}

	// Amount filters
	if filter.MinAmount != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.amount >= $%d", argIndex))
		args = append(args, *filter.MinAmount)
		argIndex++
	}
	if filter.MaxAmount != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.amount <= $%d", argIndex))
		args = append(args, *filter.MaxAmount)
		argIndex++
	}

	// Additional filters
	if filter.PayerName != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.payer_name ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.PayerName+"%")
		argIndex++
	}
	if filter.PayerAccount != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.payer_account ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.PayerAccount+"%")
		argIndex++
	}
	if filter.OrderNumber != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.order_number ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.OrderNumber+"%")
		argIndex++
	}

	// Build final query
	if len(whereConditions) > 0 {
		baseQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	// Count query for total
	countQuery := strings.Replace(baseQuery, 
		"SELECT ro.id, ro.order_number, ro.payer_name, ro.payer_account, ro.payment_type, ro.amount, ro.merchant_id, m.name as merchant_name, m.code as merchant_code, ro.ad_account, ro.receive_account_id as account_id, ra.account_name, ra.account_number, ra.account_type, ro.status, ro.remark, ro.voucher_url, ro.created_at, ro.updated_at, NULL as processed_at",
		"SELECT COUNT(*)", 1)

	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	// Add ordering
	orderBy := "created_at"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	var transactions []*TransactionDetailData
	err = r.db.SelectContext(ctx, &transactions, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query transactions: %w", err)
	}

	return transactions, total, nil
}

// GetFilterOptions retrieves available filter options
func (r *reportRepository) GetFilterOptions(ctx context.Context, filter *FilterOptionsFilter) (*FilterOptionsData, error) {
	result := &FilterOptionsData{}

	// Get merchants
	if filter.IncludeMerchants {
		merchantQuery := `
			SELECT 
				m.id,
				m.name,
				m.code,
				COUNT(ro.id) as transaction_count,
				COALESCE(SUM(ro.amount), 0) as total_amount
			FROM merchants m
			LEFT JOIN recharge_orders ro ON m.id = ro.merchant_id
		`
		
		args := []interface{}{}
		argIndex := 1
		whereConditions := []string{}

		if filter.StartDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
			args = append(args, *filter.EndDate)
			argIndex++
		}

		if len(whereConditions) > 0 {
			merchantQuery += " WHERE " + strings.Join(whereConditions, " AND ")
		}

		merchantQuery += " GROUP BY m.id, m.name, m.code ORDER BY transaction_count DESC"

		var merchants []*FilterMerchantData
		err := r.db.SelectContext(ctx, &merchants, merchantQuery, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to get merchant filter options: %w", err)
		}
		result.Merchants = merchants
	}

	// Get accounts
	if filter.IncludeAccounts {
		accountQuery := `
			SELECT 
				ra.id,
				ra.account_name as name,
				ra.account_number as number,
				ra.account_type as type,
				ra.payment_type,
				COUNT(ro.id) as transaction_count,
				COALESCE(SUM(ro.amount), 0) as total_amount
			FROM receive_accounts ra
			LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id
		`
		
		args := []interface{}{}
		argIndex := 1
		whereConditions := []string{}

		if filter.StartDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
			args = append(args, *filter.EndDate)
			argIndex++
		}

		if len(whereConditions) > 0 {
			accountQuery += " WHERE " + strings.Join(whereConditions, " AND ")
		}

		accountQuery += " GROUP BY ra.id, ra.account_name, ra.account_number, ra.account_type, ra.payment_type ORDER BY transaction_count DESC"

		var accounts []*FilterAccountData
		err := r.db.SelectContext(ctx, &accounts, accountQuery, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to get account filter options: %w", err)
		}
		result.Accounts = accounts
	}

	// Get statuses
	if filter.IncludeStatuses {
		statusQuery := `
			SELECT 
				status,
				CASE 
					WHEN status = 'pending' THEN '待处理'
					WHEN status = 'completed' THEN '已完成'
					WHEN status = 'failed' THEN '失败'
					WHEN status = 'cancelled' THEN '已取消'
					WHEN status = 'refunded' THEN '已退款'
					ELSE status
				END as display_name,
				COUNT(*) as count,
				ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
			FROM recharge_orders
		`
		
		args := []interface{}{}
		argIndex := 1
		whereConditions := []string{}

		if filter.StartDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argIndex))
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argIndex))
			args = append(args, *filter.EndDate)
			argIndex++
		}

		if len(whereConditions) > 0 {
			statusQuery += " WHERE " + strings.Join(whereConditions, " AND ")
		}

		statusQuery += " GROUP BY status ORDER BY count DESC"

		var statuses []*FilterStatusData
		err := r.db.SelectContext(ctx, &statuses, statusQuery, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to get status filter options: %w", err)
		}
		result.Statuses = statuses
	}

	// Get account types
	if filter.IncludeTypes {
		accountTypeQuery := `
			SELECT 
				ra.account_type as type,
				CASE 
					WHEN ra.account_type = 'alipay' THEN '支付宝'
					WHEN ra.account_type = 'wechat' THEN '微信'
					WHEN ra.account_type = 'bank' THEN '银行卡'
					ELSE ra.account_type
				END as display_name,
				COUNT(ro.id) as count,
				ROUND(COUNT(ro.id) * 100.0 / SUM(COUNT(ro.id)) OVER(), 2) as percentage
			FROM receive_accounts ra
			LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id
		`
		
		args := []interface{}{}
		argIndex := 1
		whereConditions := []string{}

		if filter.StartDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
			args = append(args, *filter.EndDate)
			argIndex++
		}

		if len(whereConditions) > 0 {
			accountTypeQuery += " WHERE " + strings.Join(whereConditions, " AND ")
		}

		accountTypeQuery += " GROUP BY ra.account_type ORDER BY count DESC"

		var accountTypes []*FilterTypeData
		err := r.db.SelectContext(ctx, &accountTypes, accountTypeQuery, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to get account type filter options: %w", err)
		}
		result.AccountTypes = accountTypes

		// Get payment types
		paymentTypeQuery := `
			SELECT 
				payment_type as type,
				CASE 
					WHEN payment_type = 'public' THEN '对公'
					WHEN payment_type = 'private' THEN '对私'
					ELSE payment_type
				END as display_name,
				COUNT(*) as count,
				ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
			FROM recharge_orders
		`
		
		args = []interface{}{}
		argIndex = 1
		whereConditions = []string{}

		if filter.StartDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argIndex))
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argIndex))
			args = append(args, *filter.EndDate)
			argIndex++
		}

		if len(whereConditions) > 0 {
			paymentTypeQuery += " WHERE " + strings.Join(whereConditions, " AND ")
		}

		paymentTypeQuery += " GROUP BY payment_type ORDER BY count DESC"

		var paymentTypes []*FilterTypeData
		err = r.db.SelectContext(ctx, &paymentTypes, paymentTypeQuery, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to get payment type filter options: %w", err)
		}
		result.PaymentTypes = paymentTypes
	}

	return result, nil
}

// GetTimeDimensionData retrieves time dimension data
func (r *reportRepository) GetTimeDimensionData(ctx context.Context, filter *TimeDimensionFilter) ([]*TimeDimensionData, error) {
	var timeFormat string
	var periodFormat string

	switch filter.Granularity {
	case "hour":
		timeFormat = "DATE_TRUNC('hour', created_at)"
		periodFormat = "TO_CHAR(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD HH24:00')"
	case "day":
		timeFormat = "DATE_TRUNC('day', created_at)"
		periodFormat = "TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')"
	case "week":
		timeFormat = "DATE_TRUNC('week', created_at)"
		periodFormat = "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') || ' (Week)'"
	case "month":
		timeFormat = "DATE_TRUNC('month', created_at)"
		periodFormat = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')"
	default:
		timeFormat = "DATE_TRUNC('day', created_at)"
		periodFormat = "TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')"
	}

	query := fmt.Sprintf(`
		SELECT 
			%s as timestamp,
			%s as period_label,
			COUNT(*) as count,
			COALESCE(SUM(amount), 0) as amount,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_count,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as success_amount,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
			COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount
		FROM recharge_orders
	`, timeFormat, periodFormat)

	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("merchant_id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add account filter
	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("receive_account_id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(whereConditions) > 0 {
		query += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	query += fmt.Sprintf(" GROUP BY %s ORDER BY %s", timeFormat, timeFormat)

	var data []*TimeDimensionData
	err := r.db.SelectContext(ctx, &data, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get time dimension data: %w", err)
	}

	return data, nil
}

// GetStatusDimensionData retrieves status dimension data
func (r *reportRepository) GetStatusDimensionData(ctx context.Context, filter *StatusDimensionFilter) ([]*StatusDimensionData, error) {
	query := `
		SELECT 
			status,
			CASE 
				WHEN status = 'pending' THEN '待处理'
				WHEN status = 'completed' THEN '已完成'
				WHEN status = 'failed' THEN '失败'
				WHEN status = 'cancelled' THEN '已取消'
				WHEN status = 'refunded' THEN '已退款'
				ELSE status
			END as display_name,
			COUNT(*) as count,
			COALESCE(SUM(amount), 0) as amount,
			ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
			ROUND(SUM(amount) * 100.0 / SUM(SUM(amount)) OVER(), 2) as amount_percent
		FROM recharge_orders
	`

	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("merchant_id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add account filter
	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("receive_account_id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add payment type filter
	if filter.PaymentType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if len(whereConditions) > 0 {
		query += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	query += " GROUP BY status ORDER BY count DESC"

	var data []*StatusDimensionData
	err := r.db.SelectContext(ctx, &data, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get status dimension data: %w", err)
	}

	return data, nil
}

// GetMerchantDimensionData retrieves merchant dimension data
func (r *reportRepository) GetMerchantDimensionData(ctx context.Context, filter *MerchantDimensionFilter) ([]*MerchantDimensionData, int64, error) {
	baseQuery := `
		SELECT 
			m.id as merchant_id,
			m.name as merchant_name,
			m.code as merchant_code,
			COUNT(ro.id) as count,
			COALESCE(SUM(ro.amount), 0) as amount,
			COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) as success_count,
			COALESCE(SUM(CASE WHEN ro.status = 'completed' THEN ro.amount ELSE 0 END), 0) as success_amount,
			COUNT(CASE WHEN ro.status = 'failed' THEN 1 END) as failed_count,
			COALESCE(SUM(CASE WHEN ro.status = 'failed' THEN ro.amount ELSE 0 END), 0) as failed_amount,
			m.daily_limit,
			m.daily_used
		FROM merchants m
		LEFT JOIN recharge_orders ro ON m.id = ro.merchant_id
	`

	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("m.id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.status IN (%s) OR ro.status IS NULL)", strings.Join(placeholders, ",")))
	}

	// Add payment type filter
	if filter.PaymentType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.payment_type = $%d OR ro.payment_type IS NULL)", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if len(whereConditions) > 0 {
		baseQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	baseQuery += " GROUP BY m.id, m.name, m.code, m.daily_limit, m.daily_used"

	// Count query
	countQuery := `
		SELECT COUNT(DISTINCT m.id)
		FROM merchants m
		LEFT JOIN recharge_orders ro ON m.id = ro.merchant_id
	`
	if len(whereConditions) > 0 {
		countQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count merchant dimension data: %w", err)
	}

	// Add ordering
	orderBy := "amount"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	var data []*MerchantDimensionData
	err = r.db.SelectContext(ctx, &data, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get merchant dimension data: %w", err)
	}

	return data, total, nil
}

// GetAccountDimensionData retrieves account dimension data
func (r *reportRepository) GetAccountDimensionData(ctx context.Context, filter *AccountDimensionFilter) ([]*AccountDimensionData, int64, error) {
	baseQuery := `
		SELECT 
			ra.id as account_id,
			ra.account_name,
			ra.account_number,
			ra.account_type,
			ra.payment_type,
			COUNT(ro.id) as count,
			COALESCE(SUM(ro.amount), 0) as amount,
			COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) as success_count,
			COALESCE(SUM(CASE WHEN ro.status = 'completed' THEN ro.amount ELSE 0 END), 0) as success_amount,
			COUNT(CASE WHEN ro.status = 'failed' THEN 1 END) as failed_count,
			COALESCE(SUM(CASE WHEN ro.status = 'failed' THEN ro.amount ELSE 0 END), 0) as failed_amount,
			ra.daily_limit,
			ra.daily_used
		FROM receive_accounts ra
		LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id
	`

	whereConditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	// Add account filter
	if len(filter.AccountIDs) > 0 {
		placeholders := make([]string, len(filter.AccountIDs))
		for i, accountID := range filter.AccountIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("ra.id IN (%s)", strings.Join(placeholders, ",")))
	}

	// Add merchant filter
	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.merchant_id IN (%s) OR ro.merchant_id IS NULL)", strings.Join(placeholders, ",")))
	}

	// Add account type filter
	if filter.AccountType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ra.account_type = $%d", argIndex))
		args = append(args, *filter.AccountType)
		argIndex++
	}

	// Add payment type filter
	if filter.PaymentType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("ra.payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	// Add status filter
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		whereConditions = append(whereConditions, fmt.Sprintf("(ro.status IN (%s) OR ro.status IS NULL)", strings.Join(placeholders, ",")))
	}

	if len(whereConditions) > 0 {
		baseQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	baseQuery += " GROUP BY ra.id, ra.account_name, ra.account_number, ra.account_type, ra.payment_type, ra.daily_limit, ra.daily_used"

	// Count query
	countQuery := `
		SELECT COUNT(DISTINCT ra.id)
		FROM receive_accounts ra
		LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id
	`
	if len(whereConditions) > 0 {
		countQuery += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int64
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count account dimension data: %w", err)
	}

	// Add ordering
	orderBy := "amount"
	orderDir := "DESC"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	baseQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	var data []*AccountDimensionData
	err = r.db.SelectContext(ctx, &data, baseQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get account dimension data: %w", err)
	}

	return data, total, nil
}

// NewReportRepositoryWithCache creates a new cached report repository
func NewReportRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) ReportRepository {
	// TODO: Implement cached version properly
	return NewReportRepository(db)
}

// cachedReportRepository implements ReportRepository interface with caching
type cachedReportRepository struct {
	*CachedBaseRepository
}

// GetTransactionStats retrieves transaction statistics with caching
func (r *cachedReportRepository) GetTransactionStats(ctx context.Context, startDate, endDate time.Time, merchantID *uuid.UUID) (*TransactionStats, error) {
	cacheKey := r.generateStatsKey("transaction", startDate, endDate, merchantID)
	
	var stats TransactionStats
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := `
		SELECT 
			COUNT(*) as total_count,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as success_count,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
			COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refund_count,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount,
			COALESCE(AVG(CASE WHEN status = 'completed' THEN amount END), 0) as avg_amount
		FROM recharge_orders`

	// Build WHERE conditions
	conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
	args = append(args, startDate)
	argIndex++

	conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
	args = append(args, endDate)
	argIndex++

	if merchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *merchantID)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	err := r.GetWithCache(ctx, &stats, cacheKey, cache.MediumExpiration, query, args...)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

// generateStatsKey generates a cache key for statistics queries
func (r *cachedReportRepository) generateStatsKey(statsType string, startDate, endDate time.Time, merchantID *uuid.UUID) string {
	key := fmt.Sprintf("stats:%s:%s:%s", statsType, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	
	if merchantID != nil {
		key += fmt.Sprintf(":merchant:%s", merchantID.String())
	}
	
	return key
}
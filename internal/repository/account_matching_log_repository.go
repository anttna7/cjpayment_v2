package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
)

// accountMatchingLogRepository implements AccountMatchingLogRepository interface
type accountMatchingLogRepository struct {
	*BaseRepository
}

// NewAccountMatchingLogRepository creates a new account matching log repository
func NewAccountMatchingLogRepository(db *sqlx.DB) AccountMatchingLogRepository {
	return &accountMatchingLogRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new account matching log entry
func (r *accountMatchingLogRepository) Create(ctx context.Context, log *AccountMatchingLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	log.CreatedAt = time.Now()

	query := `
		INSERT INTO account_matching_logs (id, merchant_id, payment_type, amount, matched_account_id,
		                                  match_score, match_reason, available_accounts, matching_rules,
		                                  execution_time_ms, success, error_message, created_at)
		VALUES (:id, :merchant_id, :payment_type, :amount, :matched_account_id,
		        :match_score, :match_reason, :available_accounts, :matching_rules,
		        :execution_time_ms, :success, :error_message, :created_at)`

	_, err := r.db.NamedExecContext(ctx, query, log)
	return err
}

// GetByID retrieves an account matching log by ID
func (r *accountMatchingLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*AccountMatchingLog, error) {
	var log AccountMatchingLog
	query := "SELECT * FROM account_matching_logs WHERE id = $1"
	err := r.db.GetContext(ctx, &log, query, id)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// List retrieves account matching logs with filtering
func (r *accountMatchingLogRepository) List(ctx context.Context, filter *AccountMatchingLogFilter) ([]*AccountMatchingLog, error) {
	var logs []*AccountMatchingLog
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM account_matching_logs"

	// Build WHERE conditions
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.PaymentType != nil && *filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if filter.Success != nil {
		conditions = append(conditions, fmt.Sprintf("success = $%d", argIndex))
		args = append(args, *filter.Success)
		argIndex++
	}

	if filter.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}

	if filter.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	orderBy := "created_at"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "DESC"
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
	}

	err := r.db.SelectContext(ctx, &logs, query, args...)
	return logs, err
}

// Count returns the count of account matching logs matching the filter
func (r *accountMatchingLogRepository) Count(ctx context.Context, filter *AccountMatchingLogFilter) (int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM account_matching_logs"

	// Build WHERE conditions (same as List)
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.PaymentType != nil && *filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if filter.Success != nil {
		conditions = append(conditions, fmt.Sprintf("success = $%d", argIndex))
		args = append(args, *filter.Success)
		argIndex++
	}

	if filter.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}

	if filter.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	return count, err
}

// GetStatistics retrieves account matching statistics
func (r *accountMatchingLogRepository) GetStatistics(ctx context.Context, filter *AccountMatchingStatsFilter) (*AccountMatchingStats, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := `
		SELECT 
			COUNT(*) as total_attempts,
			COUNT(CASE WHEN success = true THEN 1 END) as successful_matches,
			COUNT(CASE WHEN success = false THEN 1 END) as failed_matches,
			CASE 
				WHEN COUNT(*) > 0 THEN 
					ROUND((COUNT(CASE WHEN success = true THEN 1 END)::decimal / COUNT(*)::decimal) * 100, 2)
				ELSE 0 
			END as success_rate,
			COALESCE(AVG(CASE WHEN match_score IS NOT NULL THEN match_score END), 0) as average_match_score,
			COALESCE(AVG(execution_time_ms), 0) as average_execution_time
		FROM account_matching_logs`

	// Build WHERE conditions
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.PaymentType != nil && *filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if filter.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}

	if filter.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	var stats struct {
		TotalAttempts        int64           `db:"total_attempts"`
		SuccessfulMatches    int64           `db:"successful_matches"`
		FailedMatches        int64           `db:"failed_matches"`
		SuccessRate          decimal.Decimal `db:"success_rate"`
		AverageMatchScore    decimal.Decimal `db:"average_match_score"`
		AverageExecutionTime decimal.Decimal `db:"average_execution_time"`
	}

	err := r.db.GetContext(ctx, &stats, query, args...)
	if err != nil {
		return nil, err
	}

	return &AccountMatchingStats{
		TotalAttempts:        stats.TotalAttempts,
		SuccessfulMatches:    stats.SuccessfulMatches,
		FailedMatches:        stats.FailedMatches,
		SuccessRate:          stats.SuccessRate,
		AverageMatchScore:    stats.AverageMatchScore,
		AverageExecutionTime: stats.AverageExecutionTime.IntPart(),
	}, nil
}
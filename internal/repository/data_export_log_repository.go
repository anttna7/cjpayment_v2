package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// dataExportLogRepository implements DataExportLogRepository interface
type dataExportLogRepository struct {
	*BaseRepository
}

// NewDataExportLogRepository creates a new data export log repository
func NewDataExportLogRepository(db *sqlx.DB) DataExportLogRepository {
	return &dataExportLogRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new data export log entry
func (r *dataExportLogRepository) Create(ctx context.Context, log *DataExportLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	log.CreatedAt = time.Now()

	query := `
		INSERT INTO data_export_logs (id, export_type, export_date, start_date, end_date,
		                             record_count, file_size, file_path, status, error_message,
		                             parameters, created_at, created_by)
		VALUES (:id, :export_type, :export_date, :start_date, :end_date,
		        :record_count, :file_size, :file_path, :status, :error_message,
		        :parameters, :created_at, :created_by)`

	_, err := r.db.NamedExecContext(ctx, query, log)
	return err
}

// GetByID retrieves a data export log by ID
func (r *dataExportLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*DataExportLog, error) {
	var log DataExportLog
	query := "SELECT * FROM data_export_logs WHERE id = $1"
	err := r.db.GetContext(ctx, &log, query, id)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// Update updates a data export log
func (r *dataExportLogRepository) Update(ctx context.Context, log *DataExportLog) error {
	query := `
		UPDATE data_export_logs 
		SET record_count = :record_count, file_size = :file_size, file_path = :file_path,
		    status = :status, error_message = :error_message, parameters = :parameters
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, log)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("data export log with id %s not found", log.ID)
	}

	return nil
}

// List retrieves data export logs with filtering
func (r *dataExportLogRepository) List(ctx context.Context, filter *DataExportLogFilter) ([]*DataExportLog, error) {
	var logs []*DataExportLog
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM data_export_logs"

	// Build WHERE conditions
	if filter.ExportType != nil && *filter.ExportType != "" {
		conditions = append(conditions, fmt.Sprintf("export_type = $%d", argIndex))
		args = append(args, *filter.ExportType)
		argIndex++
	}

	if filter.Status != nil && *filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.CreatedBy != nil {
		conditions = append(conditions, fmt.Sprintf("created_by = $%d", argIndex))
		args = append(args, *filter.CreatedBy)
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

// Count returns the count of data export logs matching the filter
func (r *dataExportLogRepository) Count(ctx context.Context, filter *DataExportLogFilter) (int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM data_export_logs"

	// Build WHERE conditions (same as List)
	if filter.ExportType != nil && *filter.ExportType != "" {
		conditions = append(conditions, fmt.Sprintf("export_type = $%d", argIndex))
		args = append(args, *filter.ExportType)
		argIndex++
	}

	if filter.Status != nil && *filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.CreatedBy != nil {
		conditions = append(conditions, fmt.Sprintf("created_by = $%d", argIndex))
		args = append(args, *filter.CreatedBy)
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

// DeleteOldLogs deletes data export logs older than the specified time
func (r *dataExportLogRepository) DeleteOldLogs(ctx context.Context, olderThan time.Time) error {
	query := "DELETE FROM data_export_logs WHERE created_at < $1"
	result, err := r.db.ExecContext(ctx, query, olderThan)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	// Log the number of deleted records (optional)
	_ = rowsAffected

	return nil
}
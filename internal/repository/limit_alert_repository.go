package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// limitAlertRepository implements the LimitAlertRepository interface
type limitAlertRepository struct {
	db *sqlx.DB
}

// NewLimitAlertRepository creates a new limit alert repository instance
func NewLimitAlertRepository(db *sqlx.DB) LimitAlertRepository {
	return &limitAlertRepository{db: db}
}

// Create creates a new limit alert
func (r *limitAlertRepository) Create(ctx context.Context, alert *LimitAlert) error {
	query := `
		INSERT INTO limit_alerts (
			id, alert_type, entity_id, entity_name, alert_level, 
			threshold, current_used, message, created_at, is_resolved, created_by
		) VALUES (
			:id, :alert_type, :entity_id, :entity_name, :alert_level,
			:threshold, :current_used, :message, :created_at, :is_resolved, :created_by
		)`

	if alert.ID == uuid.Nil {
		alert.ID = uuid.New()
	}
	if alert.CreatedAt.IsZero() {
		alert.CreatedAt = time.Now()
	}

	_, err := r.db.NamedExecContext(ctx, query, alert)
	if err != nil {
		return fmt.Errorf("failed to create limit alert: %w", err)
	}

	return nil
}

// GetByID retrieves a limit alert by ID
func (r *limitAlertRepository) GetByID(ctx context.Context, id uuid.UUID) (*LimitAlert, error) {
	query := `
		SELECT id, alert_type, entity_id, entity_name, alert_level,
			   threshold, current_used, message, created_at, is_resolved,
			   resolved_at, created_by
		FROM limit_alerts 
		WHERE id = $1`

	var alert LimitAlert
	err := r.db.GetContext(ctx, &alert, query, id)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get limit alert: %w", err)
	}

	return &alert, nil
}

// Update updates a limit alert
func (r *limitAlertRepository) Update(ctx context.Context, alert *LimitAlert) error {
	query := `
		UPDATE limit_alerts SET
			alert_type = :alert_type,
			entity_id = :entity_id,
			entity_name = :entity_name,
			alert_level = :alert_level,
			threshold = :threshold,
			current_used = :current_used,
			message = :message,
			is_resolved = :is_resolved,
			resolved_at = :resolved_at
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, alert)
	if err != nil {
		return fmt.Errorf("failed to update limit alert: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("limit alert not found")
	}

	return nil
}

// Delete deletes a limit alert
func (r *limitAlertRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM limit_alerts WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete limit alert: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("limit alert not found")
	}

	return nil
}

// List retrieves limit alerts based on filter
func (r *limitAlertRepository) List(ctx context.Context, filter *LimitAlertFilter) ([]*LimitAlert, error) {
	query := `
		SELECT id, alert_type, entity_id, entity_name, alert_level,
			   threshold, current_used, message, created_at, is_resolved,
			   resolved_at, created_by
		FROM limit_alerts`

	var conditions []string
	var args []interface{}
	argIndex := 1

	if filter.AlertType != nil {
		conditions = append(conditions, fmt.Sprintf("alert_type = $%d", argIndex))
		args = append(args, *filter.AlertType)
		argIndex++
	}

	if filter.EntityID != nil {
		conditions = append(conditions, fmt.Sprintf("entity_id = $%d", argIndex))
		args = append(args, *filter.EntityID)
		argIndex++
	}

	if filter.AlertLevel != nil {
		conditions = append(conditions, fmt.Sprintf("alert_level = $%d", argIndex))
		args = append(args, *filter.AlertLevel)
		argIndex++
	}

	if filter.IsResolved != nil {
		conditions = append(conditions, fmt.Sprintf("is_resolved = $%d", argIndex))
		args = append(args, *filter.IsResolved)
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

	var alerts []*LimitAlert
	err := r.db.SelectContext(ctx, &alerts, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list limit alerts: %w", err)
	}

	return alerts, nil
}

// Count returns the total count of limit alerts based on filter
func (r *limitAlertRepository) Count(ctx context.Context, filter *LimitAlertFilter) (int64, error) {
	query := `SELECT COUNT(*) FROM limit_alerts`

	var conditions []string
	var args []interface{}
	argIndex := 1

	if filter.AlertType != nil {
		conditions = append(conditions, fmt.Sprintf("alert_type = $%d", argIndex))
		args = append(args, *filter.AlertType)
		argIndex++
	}

	if filter.EntityID != nil {
		conditions = append(conditions, fmt.Sprintf("entity_id = $%d", argIndex))
		args = append(args, *filter.EntityID)
		argIndex++
	}

	if filter.AlertLevel != nil {
		conditions = append(conditions, fmt.Sprintf("alert_level = $%d", argIndex))
		args = append(args, *filter.AlertLevel)
		argIndex++
	}

	if filter.IsResolved != nil {
		conditions = append(conditions, fmt.Sprintf("is_resolved = $%d", argIndex))
		args = append(args, *filter.IsResolved)
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

	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	if err != nil {
		return 0, fmt.Errorf("failed to count limit alerts: %w", err)
	}

	return count, nil
}

// GetUnresolvedAlerts retrieves unresolved alerts for a specific entity
func (r *limitAlertRepository) GetUnresolvedAlerts(ctx context.Context, entityID uuid.UUID, alertType string) ([]*LimitAlert, error) {
	query := `
		SELECT id, alert_type, entity_id, entity_name, alert_level,
			   threshold, current_used, message, created_at, is_resolved,
			   resolved_at, created_by
		FROM limit_alerts 
		WHERE entity_id = $1 AND alert_type = $2 AND is_resolved = false
		ORDER BY created_at DESC`

	var alerts []*LimitAlert
	err := r.db.SelectContext(ctx, &alerts, query, entityID, alertType)
	if err != nil {
		return nil, fmt.Errorf("failed to get unresolved alerts: %w", err)
	}

	return alerts, nil
}

// ResolveAlert marks an alert as resolved
func (r *limitAlertRepository) ResolveAlert(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE limit_alerts SET
			is_resolved = true,
			resolved_at = $2
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("failed to resolve alert: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("alert not found")
	}

	return nil
}
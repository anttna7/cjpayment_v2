package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// NotificationRepositoryImpl implements NotificationRepository
type NotificationRepositoryImpl struct {
	db *sqlx.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *sqlx.DB) NotificationRepository {
	return &NotificationRepositoryImpl{db: db}
}

// CreateNotificationConfig creates a new notification configuration
func (r *NotificationRepositoryImpl) CreateNotificationConfig(ctx context.Context, config *NotificationConfig) error {
	query := `
		INSERT INTO notifications (
			id, name, event_type, target_system, webhook_url, http_method,
			headers, template_body, retry_policy, timeout_seconds, is_active,
			created_at, updated_at, created_by, updated_by
		) VALUES (
			:id, :name, :event_type, :target_system, :webhook_url, :http_method,
			:headers, :template_body, :retry_policy, :timeout_seconds, :is_active,
			:created_at, :updated_at, :created_by, :updated_by
		)`

	// Convert maps to JSON
	headersJSON, err := json.Marshal(config.Headers)
	if err != nil {
		return fmt.Errorf("failed to marshal headers: %w", err)
	}

	retryPolicyJSON, err := json.Marshal(config.RetryPolicy)
	if err != nil {
		return fmt.Errorf("failed to marshal retry policy: %w", err)
	}

	params := map[string]interface{}{
		"id":              config.ID,
		"name":            config.Name,
		"event_type":      config.EventType,
		"target_system":   config.TargetSystem,
		"webhook_url":     config.WebhookURL,
		"http_method":     config.HTTPMethod,
		"headers":         headersJSON,
		"template_body":   config.TemplateBody,
		"retry_policy":    retryPolicyJSON,
		"timeout_seconds": config.TimeoutSeconds,
		"is_active":       config.IsActive,
		"created_at":      config.CreatedAt,
		"updated_at":      config.UpdatedAt,
		"created_by":      config.CreatedBy,
		"updated_by":      config.UpdatedBy,
	}

	_, err = r.db.NamedExecContext(ctx, query, params)
	if err != nil {
		return fmt.Errorf("failed to create notification config: %w", err)
	}

	return nil
}

// GetNotificationConfig gets a notification configuration by ID
func (r *NotificationRepositoryImpl) GetNotificationConfig(ctx context.Context, id uuid.UUID) (*NotificationConfig, error) {
	query := `
		SELECT id, name, event_type, target_system, webhook_url, http_method,
			   headers, template_body, retry_policy, timeout_seconds, is_active,
			   created_at, updated_at, created_by, updated_by
		FROM notifications
		WHERE id = $1`

	var config NotificationConfig
	var headersJSON, retryPolicyJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&config.ID, &config.Name, &config.EventType, &config.TargetSystem,
		&config.WebhookURL, &config.HTTPMethod, &headersJSON, &config.TemplateBody,
		&retryPolicyJSON, &config.TimeoutSeconds, &config.IsActive,
		&config.CreatedAt, &config.UpdatedAt, &config.CreatedBy, &config.UpdatedBy,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get notification config: %w", err)
	}

	// Unmarshal JSON fields
	if len(headersJSON) > 0 {
		if err := json.Unmarshal(headersJSON, &config.Headers); err != nil {
			return nil, fmt.Errorf("failed to unmarshal headers: %w", err)
		}
	}

	if len(retryPolicyJSON) > 0 {
		if err := json.Unmarshal(retryPolicyJSON, &config.RetryPolicy); err != nil {
			return nil, fmt.Errorf("failed to unmarshal retry policy: %w", err)
		}
	}

	return &config, nil
}

// UpdateNotificationConfig updates a notification configuration
func (r *NotificationRepositoryImpl) UpdateNotificationConfig(ctx context.Context, config *NotificationConfig) error {
	query := `
		UPDATE notifications SET
			name = :name, event_type = :event_type, target_system = :target_system,
			webhook_url = :webhook_url, http_method = :http_method, headers = :headers,
			template_body = :template_body, retry_policy = :retry_policy,
			timeout_seconds = :timeout_seconds, is_active = :is_active,
			updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	// Convert maps to JSON
	headersJSON, err := json.Marshal(config.Headers)
	if err != nil {
		return fmt.Errorf("failed to marshal headers: %w", err)
	}

	retryPolicyJSON, err := json.Marshal(config.RetryPolicy)
	if err != nil {
		return fmt.Errorf("failed to marshal retry policy: %w", err)
	}

	params := map[string]interface{}{
		"id":              config.ID,
		"name":            config.Name,
		"event_type":      config.EventType,
		"target_system":   config.TargetSystem,
		"webhook_url":     config.WebhookURL,
		"http_method":     config.HTTPMethod,
		"headers":         headersJSON,
		"template_body":   config.TemplateBody,
		"retry_policy":    retryPolicyJSON,
		"timeout_seconds": config.TimeoutSeconds,
		"is_active":       config.IsActive,
		"updated_at":      config.UpdatedAt,
		"updated_by":      config.UpdatedBy,
	}

	result, err := r.db.NamedExecContext(ctx, query, params)
	if err != nil {
		return fmt.Errorf("failed to update notification config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// DeleteNotificationConfig deletes a notification configuration
func (r *NotificationRepositoryImpl) DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM notifications WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete notification config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// ListNotificationConfigs lists notification configurations with filtering
func (r *NotificationRepositoryImpl) ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*NotificationConfig, error) {
	query := `
		SELECT id, name, event_type, target_system, webhook_url, http_method,
			   headers, template_body, retry_policy, timeout_seconds, is_active,
			   created_at, updated_at, created_by, updated_by
		FROM notifications`

	var conditions []string
	var args []interface{}
	argIndex := 1

	// Apply filters
	if filter.EventType != nil {
		conditions = append(conditions, fmt.Sprintf("event_type = $%d", argIndex))
		args = append(args, *filter.EventType)
		argIndex++
	}

	if filter.TargetSystem != nil {
		conditions = append(conditions, fmt.Sprintf("target_system = $%d", argIndex))
		args = append(args, *filter.TargetSystem)
		argIndex++
	}

	if filter.IsActive != nil {
		conditions = append(conditions, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *filter.IsActive)
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

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list notification configs: %w", err)
	}
	defer rows.Close()

	var configs []*NotificationConfig
	for rows.Next() {
		var config NotificationConfig
		var headersJSON, retryPolicyJSON []byte

		err := rows.Scan(
			&config.ID, &config.Name, &config.EventType, &config.TargetSystem,
			&config.WebhookURL, &config.HTTPMethod, &headersJSON, &config.TemplateBody,
			&retryPolicyJSON, &config.TimeoutSeconds, &config.IsActive,
			&config.CreatedAt, &config.UpdatedAt, &config.CreatedBy, &config.UpdatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification config: %w", err)
		}

		// Unmarshal JSON fields
		if len(headersJSON) > 0 {
			if err := json.Unmarshal(headersJSON, &config.Headers); err != nil {
				return nil, fmt.Errorf("failed to unmarshal headers: %w", err)
			}
		}

		if len(retryPolicyJSON) > 0 {
			if err := json.Unmarshal(retryPolicyJSON, &config.RetryPolicy); err != nil {
				return nil, fmt.Errorf("failed to unmarshal retry policy: %w", err)
			}
		}

		configs = append(configs, &config)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate notification configs: %w", err)
	}

	return configs, nil
}

// CreateNotificationLog creates a new notification log
func (r *NotificationRepositoryImpl) CreateNotificationLog(ctx context.Context, log *NotificationLog) error {
	query := `
		INSERT INTO notification_logs (
			id, notification_id, recharge_order_id, event_type, target_url,
			request_headers, request_body, response_status, response_headers,
			response_body, execution_time_ms, retry_count, max_retries,
			status, error_message, next_retry_at, created_at, updated_at
		) VALUES (
			:id, :notification_id, :recharge_order_id, :event_type, :target_url,
			:request_headers, :request_body, :response_status, :response_headers,
			:response_body, :execution_time_ms, :retry_count, :max_retries,
			:status, :error_message, :next_retry_at, :created_at, :updated_at
		)`

	// Convert maps to JSON
	requestHeadersJSON, err := json.Marshal(log.RequestHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal request headers: %w", err)
	}

	responseHeadersJSON, err := json.Marshal(log.ResponseHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal response headers: %w", err)
	}

	params := map[string]interface{}{
		"id":                log.ID,
		"notification_id":   log.NotificationID,
		"recharge_order_id": log.RechargeOrderID,
		"event_type":        log.EventType,
		"target_url":        log.TargetURL,
		"request_headers":   requestHeadersJSON,
		"request_body":      log.RequestBody,
		"response_status":   log.ResponseStatus,
		"response_headers":  responseHeadersJSON,
		"response_body":     log.ResponseBody,
		"execution_time_ms": log.ExecutionTimeMS,
		"retry_count":       log.RetryCount,
		"max_retries":       log.MaxRetries,
		"status":            log.Status,
		"error_message":     log.ErrorMessage,
		"next_retry_at":     log.NextRetryAt,
		"created_at":        log.CreatedAt,
		"updated_at":        log.UpdatedAt,
	}

	_, err = r.db.NamedExecContext(ctx, query, params)
	if err != nil {
		return fmt.Errorf("failed to create notification log: %w", err)
	}

	return nil
}

// GetNotificationLog gets a notification log by ID
func (r *NotificationRepositoryImpl) GetNotificationLog(ctx context.Context, id uuid.UUID) (*NotificationLog, error) {
	query := `
		SELECT id, notification_id, recharge_order_id, event_type, target_url,
			   request_headers, request_body, response_status, response_headers,
			   response_body, execution_time_ms, retry_count, max_retries,
			   status, error_message, next_retry_at, created_at, updated_at
		FROM notification_logs
		WHERE id = $1`

	var log NotificationLog
	var requestHeadersJSON, responseHeadersJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&log.ID, &log.NotificationID, &log.RechargeOrderID, &log.EventType,
		&log.TargetURL, &requestHeadersJSON, &log.RequestBody, &log.ResponseStatus,
		&responseHeadersJSON, &log.ResponseBody, &log.ExecutionTimeMS,
		&log.RetryCount, &log.MaxRetries, &log.Status, &log.ErrorMessage,
		&log.NextRetryAt, &log.CreatedAt, &log.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get notification log: %w", err)
	}

	// Unmarshal JSON fields
	if len(requestHeadersJSON) > 0 {
		if err := json.Unmarshal(requestHeadersJSON, &log.RequestHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal request headers: %w", err)
		}
	}

	if len(responseHeadersJSON) > 0 {
		if err := json.Unmarshal(responseHeadersJSON, &log.ResponseHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response headers: %w", err)
		}
	}

	return &log, nil
}

// UpdateNotificationLog updates a notification log
func (r *NotificationRepositoryImpl) UpdateNotificationLog(ctx context.Context, log *NotificationLog) error {
	query := `
		UPDATE notification_logs SET
			response_status = :response_status, response_headers = :response_headers,
			response_body = :response_body, execution_time_ms = :execution_time_ms,
			retry_count = :retry_count, status = :status, error_message = :error_message,
			next_retry_at = :next_retry_at, updated_at = :updated_at
		WHERE id = :id`

	// Convert maps to JSON
	responseHeadersJSON, err := json.Marshal(log.ResponseHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal response headers: %w", err)
	}

	params := map[string]interface{}{
		"id":                log.ID,
		"response_status":   log.ResponseStatus,
		"response_headers":  responseHeadersJSON,
		"response_body":     log.ResponseBody,
		"execution_time_ms": log.ExecutionTimeMS,
		"retry_count":       log.RetryCount,
		"status":            log.Status,
		"error_message":     log.ErrorMessage,
		"next_retry_at":     log.NextRetryAt,
		"updated_at":        log.UpdatedAt,
	}

	result, err := r.db.NamedExecContext(ctx, query, params)
	if err != nil {
		return fmt.Errorf("failed to update notification log: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// ListNotificationLogs lists notification logs with filtering and pagination
func (r *NotificationRepositoryImpl) ListNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*NotificationLog, int64, error) {
	// Build the base query
	baseQuery := `
		FROM notification_logs`

	var conditions []string
	var args []interface{}
	argIndex := 1

	// Apply filters
	if filter.NotificationID != nil {
		conditions = append(conditions, fmt.Sprintf("notification_id = $%d", argIndex))
		args = append(args, *filter.NotificationID)
		argIndex++
	}

	if filter.RechargeOrderID != nil {
		conditions = append(conditions, fmt.Sprintf("recharge_order_id = $%d", argIndex))
		args = append(args, *filter.RechargeOrderID)
		argIndex++
	}

	if filter.EventType != nil {
		conditions = append(conditions, fmt.Sprintf("event_type = $%d", argIndex))
		args = append(args, *filter.EventType)
		argIndex++
	}

	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
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

	if filter.MaxRetries {
		conditions = append(conditions, "retry_count < max_retries")
	}

	if filter.NextRetryAt != nil {
		conditions = append(conditions, fmt.Sprintf("next_retry_at <= $%d", argIndex))
		args = append(args, *filter.NextRetryAt)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Get total count
	countQuery := "SELECT COUNT(*) " + baseQuery + whereClause
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notification logs count: %w", err)
	}

	// Build the main query
	query := `
		SELECT id, notification_id, recharge_order_id, event_type, target_url,
			   request_headers, request_body, response_status, response_headers,
			   response_body, execution_time_ms, retry_count, max_retries,
			   status, error_message, next_retry_at, created_at, updated_at
		` + baseQuery + whereClause

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

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list notification logs: %w", err)
	}
	defer rows.Close()

	var logs []*NotificationLog
	for rows.Next() {
		var log NotificationLog
		var requestHeadersJSON, responseHeadersJSON []byte

		err := rows.Scan(
			&log.ID, &log.NotificationID, &log.RechargeOrderID, &log.EventType,
			&log.TargetURL, &requestHeadersJSON, &log.RequestBody, &log.ResponseStatus,
			&responseHeadersJSON, &log.ResponseBody, &log.ExecutionTimeMS,
			&log.RetryCount, &log.MaxRetries, &log.Status, &log.ErrorMessage,
			&log.NextRetryAt, &log.CreatedAt, &log.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan notification log: %w", err)
		}

		// Unmarshal JSON fields
		if len(requestHeadersJSON) > 0 {
			if err := json.Unmarshal(requestHeadersJSON, &log.RequestHeaders); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal request headers: %w", err)
			}
		}

		if len(responseHeadersJSON) > 0 {
			if err := json.Unmarshal(responseHeadersJSON, &log.ResponseHeaders); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal response headers: %w", err)
			}
		}

		logs = append(logs, &log)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate notification logs: %w", err)
	}

	return logs, total, nil
}
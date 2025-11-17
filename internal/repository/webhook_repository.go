package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// WebhookRepository defines operations for webhook management
type WebhookRepository interface {
	// Webhook CRUD operations
	CreateWebhook(ctx context.Context, webhook *Webhook) error
	GetWebhook(ctx context.Context, id uuid.UUID) (*Webhook, error)
	UpdateWebhook(ctx context.Context, webhook *Webhook) error
	DeleteWebhook(ctx context.Context, id uuid.UUID) error
	ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*Webhook, error)
	GetWebhooksByEvent(ctx context.Context, eventType string) ([]*Webhook, error)
	
	// Event management
	CreateWebhookEvent(ctx context.Context, event *WebhookEvent) error
	GetWebhookEvent(ctx context.Context, id uuid.UUID) (*WebhookEvent, error)
	UpdateWebhookEvent(ctx context.Context, event *WebhookEvent) error
	ListWebhookEvents(ctx context.Context, filter *WebhookEventFilter) ([]*WebhookEvent, error)
	GetPendingEvents(ctx context.Context, limit int) ([]*WebhookEvent, error)
	
	// Delivery management
	CreateWebhookDelivery(ctx context.Context, delivery *WebhookDelivery) error
	GetWebhookDelivery(ctx context.Context, id uuid.UUID) (*WebhookDelivery, error)
	UpdateWebhookDelivery(ctx context.Context, delivery *WebhookDelivery) error
	ListWebhookDeliveries(ctx context.Context, filter *WebhookDeliveryFilter) ([]*WebhookDelivery, int64, error)
	GetFailedDeliveries(ctx context.Context, limit int) ([]*WebhookDelivery, error)
	GetDeliveriesForRetry(ctx context.Context, limit int) ([]*WebhookDelivery, error)
}

// WebhookRepositoryImpl implements WebhookRepository
type WebhookRepositoryImpl struct {
	db *sql.DB
}

// NewWebhookRepository creates a new webhook repository
func NewWebhookRepository(db *sql.DB) WebhookRepository {
	return &WebhookRepositoryImpl{
		db: db,
	}
}

// CreateWebhook creates a new webhook
func (r *WebhookRepositoryImpl) CreateWebhook(ctx context.Context, webhook *Webhook) error {
	query := `
		INSERT INTO webhooks (id, name, url, events, secret, is_active, created_at, updated_at, created_by, updated_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	
	_, err := r.db.ExecContext(ctx, query,
		webhook.ID,
		webhook.Name,
		webhook.URL,
		pq.Array(webhook.Events),
		webhook.Secret,
		webhook.IsActive,
		webhook.CreatedAt,
		webhook.UpdatedAt,
		webhook.CreatedBy,
		webhook.UpdatedBy,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create webhook: %w", err)
	}
	
	return nil
}

// GetWebhook gets a webhook by ID
func (r *WebhookRepositoryImpl) GetWebhook(ctx context.Context, id uuid.UUID) (*Webhook, error) {
	query := `
		SELECT id, name, url, events, secret, is_active, created_at, updated_at, created_by, updated_by
		FROM webhooks
		WHERE id = $1`
	
	webhook := &Webhook{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&webhook.ID,
		&webhook.Name,
		&webhook.URL,
		pq.Array(&webhook.Events),
		&webhook.Secret,
		&webhook.IsActive,
		&webhook.CreatedAt,
		&webhook.UpdatedAt,
		&webhook.CreatedBy,
		&webhook.UpdatedBy,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("webhook not found")
		}
		return nil, fmt.Errorf("failed to get webhook: %w", err)
	}
	
	return webhook, nil
}

// UpdateWebhook updates a webhook
func (r *WebhookRepositoryImpl) UpdateWebhook(ctx context.Context, webhook *Webhook) error {
	query := `
		UPDATE webhooks 
		SET name = $2, url = $3, events = $4, secret = $5, is_active = $6, updated_at = $7, updated_by = $8
		WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query,
		webhook.ID,
		webhook.Name,
		webhook.URL,
		pq.Array(webhook.Events),
		webhook.Secret,
		webhook.IsActive,
		webhook.UpdatedAt,
		webhook.UpdatedBy,
	)
	
	if err != nil {
		return fmt.Errorf("failed to update webhook: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("webhook not found")
	}
	
	return nil
}

// DeleteWebhook deletes a webhook
func (r *WebhookRepositoryImpl) DeleteWebhook(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM webhooks WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("webhook not found")
	}
	
	return nil
}

// ListWebhooks lists webhooks with filtering
func (r *WebhookRepositoryImpl) ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*Webhook, error) {
	query := `
		SELECT id, name, url, events, secret, is_active, created_at, updated_at, created_by, updated_by
		FROM webhooks
		WHERE 1=1`
	
	args := []interface{}{}
	argIndex := 1
	
	if filter.IsActive != nil {
		query += fmt.Sprintf(" AND is_active = $%d", argIndex)
		args = append(args, *filter.IsActive)
		argIndex++
	}
	
	if filter.EventType != nil {
		query += fmt.Sprintf(" AND $%d = ANY(events)", argIndex)
		args = append(args, *filter.EventType)
		argIndex++
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
		argIndex++
	}
	
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhooks: %w", err)
	}
	defer rows.Close()
	
	var webhooks []*Webhook
	for rows.Next() {
		webhook := &Webhook{}
		err := rows.Scan(
			&webhook.ID,
			&webhook.Name,
			&webhook.URL,
			pq.Array(&webhook.Events),
			&webhook.Secret,
			&webhook.IsActive,
			&webhook.CreatedAt,
			&webhook.UpdatedAt,
			&webhook.CreatedBy,
			&webhook.UpdatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan webhook: %w", err)
		}
		webhooks = append(webhooks, webhook)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate webhooks: %w", err)
	}
	
	return webhooks, nil
}

// GetWebhooksByEvent gets webhooks that subscribe to a specific event type
func (r *WebhookRepositoryImpl) GetWebhooksByEvent(ctx context.Context, eventType string) ([]*Webhook, error) {
	query := `
		SELECT id, name, url, events, secret, is_active, created_at, updated_at, created_by, updated_by
		FROM webhooks
		WHERE is_active = true AND $1 = ANY(events)
		ORDER BY created_at ASC`
	
	rows, err := r.db.QueryContext(ctx, query, eventType)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhooks by event: %w", err)
	}
	defer rows.Close()
	
	var webhooks []*Webhook
	for rows.Next() {
		webhook := &Webhook{}
		err := rows.Scan(
			&webhook.ID,
			&webhook.Name,
			&webhook.URL,
			pq.Array(&webhook.Events),
			&webhook.Secret,
			&webhook.IsActive,
			&webhook.CreatedAt,
			&webhook.UpdatedAt,
			&webhook.CreatedBy,
			&webhook.UpdatedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan webhook: %w", err)
		}
		webhooks = append(webhooks, webhook)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate webhooks: %w", err)
	}
	
	return webhooks, nil
}

// CreateWebhookEvent creates a new webhook event
func (r *WebhookRepositoryImpl) CreateWebhookEvent(ctx context.Context, event *WebhookEvent) error {
	dataJSON, err := json.Marshal(event.Data)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}
	
	query := `
		INSERT INTO webhook_events (id, event_type, source, data, timestamp, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`
	
	_, err = r.db.ExecContext(ctx, query,
		event.ID,
		event.EventType,
		event.Source,
		dataJSON,
		event.Timestamp,
		event.Status,
		event.CreatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create webhook event: %w", err)
	}
	
	return nil
}

// GetWebhookEvent gets a webhook event by ID
func (r *WebhookRepositoryImpl) GetWebhookEvent(ctx context.Context, id uuid.UUID) (*WebhookEvent, error) {
	query := `
		SELECT id, event_type, source, data, timestamp, processed_at, status, created_at
		FROM webhook_events
		WHERE id = $1`
	
	event := &WebhookEvent{}
	var dataJSON []byte
	
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&event.ID,
		&event.EventType,
		&event.Source,
		&dataJSON,
		&event.Timestamp,
		&event.ProcessedAt,
		&event.Status,
		&event.CreatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("webhook event not found")
		}
		return nil, fmt.Errorf("failed to get webhook event: %w", err)
	}
	
	if err := json.Unmarshal(dataJSON, &event.Data); err != nil {
		return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
	}
	
	return event, nil
}

// UpdateWebhookEvent updates a webhook event
func (r *WebhookRepositoryImpl) UpdateWebhookEvent(ctx context.Context, event *WebhookEvent) error {
	query := `
		UPDATE webhook_events 
		SET processed_at = $2, status = $3
		WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query,
		event.ID,
		event.ProcessedAt,
		event.Status,
	)
	
	if err != nil {
		return fmt.Errorf("failed to update webhook event: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("webhook event not found")
	}
	
	return nil
}

// ListWebhookEvents lists webhook events with filtering
func (r *WebhookRepositoryImpl) ListWebhookEvents(ctx context.Context, filter *WebhookEventFilter) ([]*WebhookEvent, error) {
	query := `
		SELECT id, event_type, source, data, timestamp, processed_at, status, created_at
		FROM webhook_events
		WHERE 1=1`
	
	args := []interface{}{}
	argIndex := 1
	
	if filter.EventType != nil {
		query += fmt.Sprintf(" AND event_type = $%d", argIndex)
		args = append(args, *filter.EventType)
		argIndex++
	}
	
	if filter.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *filter.Status)
		argIndex++
	}
	
	if filter.StartDate != nil {
		query += fmt.Sprintf(" AND timestamp >= $%d", argIndex)
		args = append(args, *filter.StartDate)
		argIndex++
	}
	
	if filter.EndDate != nil {
		query += fmt.Sprintf(" AND timestamp <= $%d", argIndex)
		args = append(args, *filter.EndDate)
		argIndex++
	}
	
	// Add ordering
	orderBy := "timestamp"
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
		argIndex++
	}
	
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhook events: %w", err)
	}
	defer rows.Close()
	
	var events []*WebhookEvent
	for rows.Next() {
		event := &WebhookEvent{}
		var dataJSON []byte
		
		err := rows.Scan(
			&event.ID,
			&event.EventType,
			&event.Source,
			&dataJSON,
			&event.Timestamp,
			&event.ProcessedAt,
			&event.Status,
			&event.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan webhook event: %w", err)
		}
		
		if err := json.Unmarshal(dataJSON, &event.Data); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
		}
		
		events = append(events, event)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate webhook events: %w", err)
	}
	
	return events, nil
}

// GetPendingEvents gets pending webhook events
func (r *WebhookRepositoryImpl) GetPendingEvents(ctx context.Context, limit int) ([]*WebhookEvent, error) {
	query := `
		SELECT id, event_type, source, data, timestamp, processed_at, status, created_at
		FROM webhook_events
		WHERE status = 'pending'
		ORDER BY timestamp ASC
		LIMIT $1`
	
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending events: %w", err)
	}
	defer rows.Close()
	
	var events []*WebhookEvent
	for rows.Next() {
		event := &WebhookEvent{}
		var dataJSON []byte
		
		err := rows.Scan(
			&event.ID,
			&event.EventType,
			&event.Source,
			&dataJSON,
			&event.Timestamp,
			&event.ProcessedAt,
			&event.Status,
			&event.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan webhook event: %w", err)
		}
		
		if err := json.Unmarshal(dataJSON, &event.Data); err != nil {
			return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
		}
		
		events = append(events, event)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate webhook events: %w", err)
	}
	
	return events, nil
}

// CreateWebhookDelivery creates a new webhook delivery
func (r *WebhookRepositoryImpl) CreateWebhookDelivery(ctx context.Context, delivery *WebhookDelivery) error {
	requestHeadersJSON, err := json.Marshal(delivery.RequestHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal request headers: %w", err)
	}
	
	responseHeadersJSON, err := json.Marshal(delivery.ResponseHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal response headers: %w", err)
	}
	
	query := `
		INSERT INTO webhook_deliveries (
			id, webhook_id, event_id, event_type, target_url, request_headers, request_body,
			response_status, response_headers, response_body, execution_time_ms, retry_count,
			max_retries, status, error_message, next_retry_at, delivered_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`
	
	_, err = r.db.ExecContext(ctx, query,
		delivery.ID,
		delivery.WebhookID,
		delivery.EventID,
		delivery.EventType,
		delivery.TargetURL,
		requestHeadersJSON,
		delivery.RequestBody,
		delivery.ResponseStatus,
		responseHeadersJSON,
		delivery.ResponseBody,
		delivery.ExecutionTimeMS,
		delivery.RetryCount,
		delivery.MaxRetries,
		delivery.Status,
		delivery.ErrorMessage,
		delivery.NextRetryAt,
		delivery.DeliveredAt,
		delivery.CreatedAt,
		delivery.UpdatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create webhook delivery: %w", err)
	}
	
	return nil
}

// GetWebhookDelivery gets a webhook delivery by ID
func (r *WebhookRepositoryImpl) GetWebhookDelivery(ctx context.Context, id uuid.UUID) (*WebhookDelivery, error) {
	query := `
		SELECT id, webhook_id, event_id, event_type, target_url, request_headers, request_body,
			   response_status, response_headers, response_body, execution_time_ms, retry_count,
			   max_retries, status, error_message, next_retry_at, delivered_at, created_at, updated_at
		FROM webhook_deliveries
		WHERE id = $1`
	
	delivery := &WebhookDelivery{}
	var requestHeadersJSON, responseHeadersJSON []byte
	
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&delivery.ID,
		&delivery.WebhookID,
		&delivery.EventID,
		&delivery.EventType,
		&delivery.TargetURL,
		&requestHeadersJSON,
		&delivery.RequestBody,
		&delivery.ResponseStatus,
		&responseHeadersJSON,
		&delivery.ResponseBody,
		&delivery.ExecutionTimeMS,
		&delivery.RetryCount,
		&delivery.MaxRetries,
		&delivery.Status,
		&delivery.ErrorMessage,
		&delivery.NextRetryAt,
		&delivery.DeliveredAt,
		&delivery.CreatedAt,
		&delivery.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("webhook delivery not found")
		}
		return nil, fmt.Errorf("failed to get webhook delivery: %w", err)
	}
	
	if err := json.Unmarshal(requestHeadersJSON, &delivery.RequestHeaders); err != nil {
		return nil, fmt.Errorf("failed to unmarshal request headers: %w", err)
	}
	
	if err := json.Unmarshal(responseHeadersJSON, &delivery.ResponseHeaders); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response headers: %w", err)
	}
	
	return delivery, nil
}

// UpdateWebhookDelivery updates a webhook delivery
func (r *WebhookRepositoryImpl) UpdateWebhookDelivery(ctx context.Context, delivery *WebhookDelivery) error {
	requestHeadersJSON, err := json.Marshal(delivery.RequestHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal request headers: %w", err)
	}
	
	responseHeadersJSON, err := json.Marshal(delivery.ResponseHeaders)
	if err != nil {
		return fmt.Errorf("failed to marshal response headers: %w", err)
	}
	
	query := `
		UPDATE webhook_deliveries 
		SET request_headers = $2, response_status = $3, response_headers = $4, response_body = $5, execution_time_ms = $6,
			retry_count = $7, status = $8, error_message = $9, next_retry_at = $10, delivered_at = $11, updated_at = $12
		WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query,
		delivery.ID,
		requestHeadersJSON,
		delivery.ResponseStatus,
		responseHeadersJSON,
		delivery.ResponseBody,
		delivery.ExecutionTimeMS,
		delivery.RetryCount,
		delivery.Status,
		delivery.ErrorMessage,
		delivery.NextRetryAt,
		delivery.DeliveredAt,
		delivery.UpdatedAt,
	)
	
	if err != nil {
		return fmt.Errorf("failed to update webhook delivery: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("webhook delivery not found")
	}
	
	return nil
}

// ListWebhookDeliveries lists webhook deliveries with filtering and pagination
func (r *WebhookRepositoryImpl) ListWebhookDeliveries(ctx context.Context, filter *WebhookDeliveryFilter) ([]*WebhookDelivery, int64, error) {
	// Build the WHERE clause
	whereConditions := []string{"1=1"}
	args := []interface{}{}
	argIndex := 1
	
	if filter.WebhookID != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("webhook_id = $%d", argIndex))
		args = append(args, *filter.WebhookID)
		argIndex++
	}
	
	if filter.EventID != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("event_id = $%d", argIndex))
		args = append(args, *filter.EventID)
		argIndex++
	}
	
	if filter.EventType != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("event_type = $%d", argIndex))
		args = append(args, *filter.EventType)
		argIndex++
	}
	
	if filter.Status != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
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
	
	whereClause := strings.Join(whereConditions, " AND ")
	
	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM webhook_deliveries WHERE %s", whereClause)
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get total count: %w", err)
	}
	
	// Build the main query
	query := fmt.Sprintf(`
		SELECT id, webhook_id, event_id, event_type, target_url, request_headers, request_body,
			   response_status, response_headers, response_body, execution_time_ms, retry_count,
			   max_retries, status, error_message, next_retry_at, delivered_at, created_at, updated_at
		FROM webhook_deliveries
		WHERE %s`, whereClause)
	
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
		argIndex++
	}
	
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list webhook deliveries: %w", err)
	}
	defer rows.Close()
	
	var deliveries []*WebhookDelivery
	for rows.Next() {
		delivery := &WebhookDelivery{}
		var requestHeadersJSON, responseHeadersJSON []byte
		
		err := rows.Scan(
			&delivery.ID,
			&delivery.WebhookID,
			&delivery.EventID,
			&delivery.EventType,
			&delivery.TargetURL,
			&requestHeadersJSON,
			&delivery.RequestBody,
			&delivery.ResponseStatus,
			&responseHeadersJSON,
			&delivery.ResponseBody,
			&delivery.ExecutionTimeMS,
			&delivery.RetryCount,
			&delivery.MaxRetries,
			&delivery.Status,
			&delivery.ErrorMessage,
			&delivery.NextRetryAt,
			&delivery.DeliveredAt,
			&delivery.CreatedAt,
			&delivery.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan webhook delivery: %w", err)
		}
		
		if err := json.Unmarshal(requestHeadersJSON, &delivery.RequestHeaders); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal request headers: %w", err)
		}
		
		if err := json.Unmarshal(responseHeadersJSON, &delivery.ResponseHeaders); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal response headers: %w", err)
		}
		
		deliveries = append(deliveries, delivery)
	}
	
	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("failed to iterate webhook deliveries: %w", err)
	}
	
	return deliveries, total, nil
}

// GetFailedDeliveries gets failed webhook deliveries
func (r *WebhookRepositoryImpl) GetFailedDeliveries(ctx context.Context, limit int) ([]*WebhookDelivery, error) {
	query := `
		SELECT id, webhook_id, event_id, event_type, target_url, request_headers, request_body,
			   response_status, response_headers, response_body, execution_time_ms, retry_count,
			   max_retries, status, error_message, next_retry_at, delivered_at, created_at, updated_at
		FROM webhook_deliveries
		WHERE status IN ('failed', 'max_retries_exceeded')
		ORDER BY created_at DESC
		LIMIT $1`
	
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get failed deliveries: %w", err)
	}
	defer rows.Close()
	
	var deliveries []*WebhookDelivery
	for rows.Next() {
		delivery := &WebhookDelivery{}
		var requestHeadersJSON, responseHeadersJSON []byte
		
		err := rows.Scan(
			&delivery.ID,
			&delivery.WebhookID,
			&delivery.EventID,
			&delivery.EventType,
			&delivery.TargetURL,
			&requestHeadersJSON,
			&delivery.RequestBody,
			&delivery.ResponseStatus,
			&responseHeadersJSON,
			&delivery.ResponseBody,
			&delivery.ExecutionTimeMS,
			&delivery.RetryCount,
			&delivery.MaxRetries,
			&delivery.Status,
			&delivery.ErrorMessage,
			&delivery.NextRetryAt,
			&delivery.DeliveredAt,
			&delivery.CreatedAt,
			&delivery.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan webhook delivery: %w", err)
		}
		
		if err := json.Unmarshal(requestHeadersJSON, &delivery.RequestHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal request headers: %w", err)
		}
		
		if err := json.Unmarshal(responseHeadersJSON, &delivery.ResponseHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response headers: %w", err)
		}
		
		deliveries = append(deliveries, delivery)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate webhook deliveries: %w", err)
	}
	
	return deliveries, nil
}

// GetDeliveriesForRetry gets webhook deliveries that are ready for retry
func (r *WebhookRepositoryImpl) GetDeliveriesForRetry(ctx context.Context, limit int) ([]*WebhookDelivery, error) {
	query := `
		SELECT id, webhook_id, event_id, event_type, target_url, request_headers, request_body,
			   response_status, response_headers, response_body, execution_time_ms, retry_count,
			   max_retries, status, error_message, next_retry_at, delivered_at, created_at, updated_at
		FROM webhook_deliveries
		WHERE status = 'failed' 
		  AND retry_count < max_retries 
		  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		ORDER BY next_retry_at ASC NULLS FIRST
		LIMIT $1`
	
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get deliveries for retry: %w", err)
	}
	defer rows.Close()
	
	var deliveries []*WebhookDelivery
	for rows.Next() {
		delivery := &WebhookDelivery{}
		var requestHeadersJSON, responseHeadersJSON []byte
		
		err := rows.Scan(
			&delivery.ID,
			&delivery.WebhookID,
			&delivery.EventID,
			&delivery.EventType,
			&delivery.TargetURL,
			&requestHeadersJSON,
			&delivery.RequestBody,
			&delivery.ResponseStatus,
			&responseHeadersJSON,
			&delivery.ResponseBody,
			&delivery.ExecutionTimeMS,
			&delivery.RetryCount,
			&delivery.MaxRetries,
			&delivery.Status,
			&delivery.ErrorMessage,
			&delivery.NextRetryAt,
			&delivery.DeliveredAt,
			&delivery.CreatedAt,
			&delivery.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan webhook delivery: %w", err)
		}
		
		if err := json.Unmarshal(requestHeadersJSON, &delivery.RequestHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal request headers: %w", err)
		}
		
		if err := json.Unmarshal(responseHeadersJSON, &delivery.ResponseHeaders); err != nil {
			return nil, fmt.Errorf("failed to unmarshal response headers: %w", err)
		}
		
		deliveries = append(deliveries, delivery)
	}
	
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate webhook deliveries: %w", err)
	}
	
	return deliveries, nil
}
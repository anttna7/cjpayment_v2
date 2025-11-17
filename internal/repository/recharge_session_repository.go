package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// rechargeSessionRepository implements RechargeSessionRepository interface
type rechargeSessionRepository struct {
	*BaseRepository
}

// NewRechargeSessionRepository creates a new recharge session repository
func NewRechargeSessionRepository(db *sqlx.DB) RechargeSessionRepository {
	return &rechargeSessionRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new recharge session
func (r *rechargeSessionRepository) Create(ctx context.Context, session *RechargeSession) error {
	if session.ID == uuid.Nil {
		session.ID = uuid.New()
	}
	
	// Generate session token if not provided
	if session.SessionToken == "" {
		token, err := r.generateSessionToken()
		if err != nil {
			return fmt.Errorf("failed to generate session token: %w", err)
		}
		session.SessionToken = token
	}
	
	session.CreatedAt = time.Now()
	session.UpdatedAt = time.Now()
	
	// Set default expiration if not provided (1 hour)
	if session.ExpiresAt.IsZero() {
		session.ExpiresAt = time.Now().Add(time.Hour)
	}
	
	// Set default current step if not provided
	if session.CurrentStep == "" {
		session.CurrentStep = "form_filling"
	}

	query := `
		INSERT INTO recharge_sessions (id, session_token, merchant_id, ip_address, user_agent,
		                              form_data, current_step, matched_account_id, recharge_order_id,
		                              expires_at, created_at, updated_at)
		VALUES (:id, :session_token, :merchant_id, :ip_address, :user_agent,
		        :form_data, :current_step, :matched_account_id, :recharge_order_id,
		        :expires_at, :created_at, :updated_at)`

	_, err := r.db.NamedExecContext(ctx, query, session)
	return err
}

// GetByID retrieves a recharge session by ID
func (r *rechargeSessionRepository) GetByID(ctx context.Context, id uuid.UUID) (*RechargeSession, error) {
	var session RechargeSession
	query := "SELECT * FROM recharge_sessions WHERE id = $1"
	err := r.db.GetContext(ctx, &session, query, id)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// GetBySessionToken retrieves a recharge session by session token
func (r *rechargeSessionRepository) GetBySessionToken(ctx context.Context, sessionToken string) (*RechargeSession, error) {
	var session RechargeSession
	query := "SELECT * FROM recharge_sessions WHERE session_token = $1 AND expires_at > NOW()"
	err := r.db.GetContext(ctx, &session, query, sessionToken)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// Update updates a recharge session
func (r *rechargeSessionRepository) Update(ctx context.Context, session *RechargeSession) error {
	session.UpdatedAt = time.Now()

	query := `
		UPDATE recharge_sessions 
		SET ip_address = :ip_address, user_agent = :user_agent, form_data = :form_data,
		    current_step = :current_step, matched_account_id = :matched_account_id,
		    recharge_order_id = :recharge_order_id, expires_at = :expires_at,
		    updated_at = :updated_at
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, session)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("recharge session with id %s not found", session.ID)
	}

	return nil
}

// Delete deletes a recharge session by ID
func (r *rechargeSessionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM recharge_sessions WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("recharge session with id %s not found", id)
	}

	return nil
}

// DeleteExpired deletes expired recharge sessions
func (r *rechargeSessionRepository) DeleteExpired(ctx context.Context) error {
	query := "DELETE FROM recharge_sessions WHERE expires_at <= NOW()"
	_, err := r.db.ExecContext(ctx, query)
	return err
}

// List retrieves recharge sessions with filtering
func (r *rechargeSessionRepository) List(ctx context.Context, filter *RechargeSessionFilter) ([]*RechargeSession, error) {
	var sessions []*RechargeSession
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM recharge_sessions"

	// Build WHERE conditions
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.CurrentStep != nil && *filter.CurrentStep != "" {
		conditions = append(conditions, fmt.Sprintf("current_step = $%d", argIndex))
		args = append(args, *filter.CurrentStep)
		argIndex++
	}

	if filter.IsExpired != nil {
		if *filter.IsExpired {
			conditions = append(conditions, "expires_at <= NOW()")
		} else {
			conditions = append(conditions, "expires_at > NOW()")
		}
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

	err := r.db.SelectContext(ctx, &sessions, query, args...)
	return sessions, err
}

// Count returns the count of recharge sessions matching the filter
func (r *rechargeSessionRepository) Count(ctx context.Context, filter *RechargeSessionFilter) (int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM recharge_sessions"

	// Build WHERE conditions (same as List)
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.CurrentStep != nil && *filter.CurrentStep != "" {
		conditions = append(conditions, fmt.Sprintf("current_step = $%d", argIndex))
		args = append(args, *filter.CurrentStep)
		argIndex++
	}

	if filter.IsExpired != nil {
		if *filter.IsExpired {
			conditions = append(conditions, "expires_at <= NOW()")
		} else {
			conditions = append(conditions, "expires_at > NOW()")
		}
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

// generateSessionToken generates a secure random session token
func (r *rechargeSessionRepository) generateSessionToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
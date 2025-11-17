package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// merchantReceiveAccountRepository implements MerchantReceiveAccountRepository interface
type merchantReceiveAccountRepository struct {
	*BaseRepository
}

// NewMerchantReceiveAccountRepository creates a new merchant receive account repository
func NewMerchantReceiveAccountRepository(db *sqlx.DB) MerchantReceiveAccountRepository {
	return &merchantReceiveAccountRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new merchant-receive account relationship
func (r *merchantReceiveAccountRepository) Create(ctx context.Context, relationship *MerchantReceiveAccount) error {
	if relationship.ID == uuid.Nil {
		relationship.ID = uuid.New()
	}
	relationship.CreatedAt = time.Now()

	query := `
		INSERT INTO merchant_receive_accounts (id, merchant_id, receive_account_id, weight, is_active, created_at)
		VALUES (:id, :merchant_id, :receive_account_id, :weight, :is_active, :created_at)
		ON CONFLICT (merchant_id, receive_account_id) 
		DO UPDATE SET weight = EXCLUDED.weight, is_active = EXCLUDED.is_active`

	_, err := r.db.NamedExecContext(ctx, query, relationship)
	return err
}

// GetByID retrieves a merchant-receive account relationship by ID
func (r *merchantReceiveAccountRepository) GetByID(ctx context.Context, id uuid.UUID) (*MerchantReceiveAccount, error) {
	var relationship MerchantReceiveAccount
	query := "SELECT * FROM merchant_receive_accounts WHERE id = $1"
	err := r.db.GetContext(ctx, &relationship, query, id)
	if err != nil {
		return nil, err
	}
	return &relationship, nil
}

// GetByMerchantAndAccount retrieves a relationship by merchant and account IDs
func (r *merchantReceiveAccountRepository) GetByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) (*MerchantReceiveAccount, error) {
	var relationship MerchantReceiveAccount
	query := "SELECT * FROM merchant_receive_accounts WHERE merchant_id = $1 AND receive_account_id = $2"
	err := r.db.GetContext(ctx, &relationship, query, merchantID, accountID)
	if err != nil {
		return nil, err
	}
	return &relationship, nil
}

// Update updates a merchant-receive account relationship
func (r *merchantReceiveAccountRepository) Update(ctx context.Context, relationship *MerchantReceiveAccount) error {
	query := `
		UPDATE merchant_receive_accounts 
		SET weight = :weight, is_active = :is_active
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, relationship)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant receive account relationship with id %s not found", relationship.ID)
	}

	return nil
}

// Delete deletes a merchant-receive account relationship by ID
func (r *merchantReceiveAccountRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM merchant_receive_accounts WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant receive account relationship with id %s not found", id)
	}

	return nil
}

// DeleteByMerchantAndAccount deletes a relationship by merchant and account IDs
func (r *merchantReceiveAccountRepository) DeleteByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) error {
	query := "DELETE FROM merchant_receive_accounts WHERE merchant_id = $1 AND receive_account_id = $2"
	result, err := r.db.ExecContext(ctx, query, merchantID, accountID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant receive account relationship not found")
	}

	return nil
}

// List retrieves merchant-receive account relationships with filtering
func (r *merchantReceiveAccountRepository) List(ctx context.Context, filter *MerchantReceiveAccountFilter) ([]*MerchantReceiveAccount, error) {
	var relationships []*MerchantReceiveAccount
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM merchant_receive_accounts"

	// Build WHERE conditions
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.ReceiveAccountID != nil {
		conditions = append(conditions, fmt.Sprintf("receive_account_id = $%d", argIndex))
		args = append(args, *filter.ReceiveAccountID)
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

	err := r.db.SelectContext(ctx, &relationships, query, args...)
	return relationships, err
}

// GetByMerchant retrieves all relationships for a merchant
func (r *merchantReceiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*MerchantReceiveAccount, error) {
	var relationships []*MerchantReceiveAccount
	query := `
		SELECT * FROM merchant_receive_accounts 
		WHERE merchant_id = $1 
		ORDER BY weight DESC, created_at ASC`

	err := r.db.SelectContext(ctx, &relationships, query, merchantID)
	return relationships, err
}

// UpdateWeight updates the weight of a merchant-account relationship
func (r *merchantReceiveAccountRepository) UpdateWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error {
	query := `
		UPDATE merchant_receive_accounts 
		SET weight = $1
		WHERE merchant_id = $2 AND receive_account_id = $3`

	result, err := r.db.ExecContext(ctx, query, weight, merchantID, accountID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant receive account relationship not found")
	}

	return nil
}
package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/company/cjpayment/pkg/cache"
)

// rotationRuleRepository implements RotationRuleRepository interface
type rotationRuleRepository struct {
	*BaseRepository
}

// NewRotationRuleRepository creates a new rotation rule repository
func NewRotationRuleRepository(db *sqlx.DB) RotationRuleRepository {
	return &rotationRuleRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new rotation rule
func (r *rotationRuleRepository) Create(ctx context.Context, rule *RotationRule) error {
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
	}
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()

	query := `
		INSERT INTO rotation_rules (id, merchant_id, rule_name, strategy_type, strategy_config,
		                           is_active, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :merchant_id, :rule_name, :strategy_type, :strategy_config,
		        :is_active, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, rule)
	return err
}

// GetByID retrieves a rotation rule by ID
func (r *rotationRuleRepository) GetByID(ctx context.Context, id uuid.UUID) (*RotationRule, error) {
	var rule RotationRule
	query := "SELECT * FROM rotation_rules WHERE id = $1"
	err := r.db.GetContext(ctx, &rule, query, id)
	if err != nil {
		return nil, err
	}
	return &rule, nil
}

// GetByMerchant retrieves all rotation rules for a merchant
func (r *rotationRuleRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*RotationRule, error) {
	var rules []*RotationRule
	query := `
		SELECT * FROM rotation_rules 
		WHERE merchant_id = $1 
		ORDER BY is_active DESC, created_at DESC`

	err := r.db.SelectContext(ctx, &rules, query, merchantID)
	return rules, err
}

// Update updates a rotation rule
func (r *rotationRuleRepository) Update(ctx context.Context, rule *RotationRule) error {
	rule.UpdatedAt = time.Now()

	query := `
		UPDATE rotation_rules 
		SET rule_name = :rule_name, strategy_type = :strategy_type, strategy_config = :strategy_config,
		    is_active = :is_active, updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, rule)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("rotation rule with id %s not found", rule.ID)
	}

	return nil
}

// Delete deletes a rotation rule by ID
func (r *rotationRuleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM rotation_rules WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("rotation rule with id %s not found", id)
	}

	return nil
}

// List retrieves rotation rules with filtering
func (r *rotationRuleRepository) List(ctx context.Context, filter *RotationRuleFilter) ([]*RotationRule, error) {
	var rules []*RotationRule
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM rotation_rules"

	// Build WHERE conditions
	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.StrategyType != nil {
		conditions = append(conditions, fmt.Sprintf("strategy_type = $%d", argIndex))
		args = append(args, *filter.StrategyType)
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

	err := r.db.SelectContext(ctx, &rules, query, args...)
	return rules, err
}

// NewRotationRuleRepositoryWithCache creates a new cached rotation rule repository
func NewRotationRuleRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) RotationRuleRepository {
	// TODO: Implement cached version properly
	return NewRotationRuleRepository(db)
}

// cachedRotationRuleRepository implements RotationRuleRepository interface with caching
type cachedRotationRuleRepository struct {
	*CachedBaseRepository
}

// GetByMerchantID retrieves rotation rules by merchant ID with caching
func (r *cachedRotationRuleRepository) GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*RotationRule, error) {
	cacheKey := fmt.Sprintf("rotation_rule:%s", merchantID.String())
	
	var rules []*RotationRule
	query := `
		SELECT * FROM rotation_rules 
		WHERE merchant_id = $1 AND is_active = true
		ORDER BY created_at DESC`
	
	err := r.GetManyWithCache(ctx, &rules, cacheKey, cache.LongExpiration, query, merchantID)
	return rules, err
}

// Update updates a rotation rule with cache invalidation
func (r *cachedRotationRuleRepository) Update(ctx context.Context, rule *RotationRule) error {
	rule.UpdatedAt = time.Now()

	query := `
		UPDATE rotation_rules 
		SET rule_name = :rule_name, strategy_type = :strategy_type, 
		    strategy_config = :strategy_config, is_active = :is_active,
		    updated_at = :updated_at
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, rule)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("rotation rule with id %s not found", rule.ID)
	}

	// Invalidate rotation rule cache
	r.invalidator.InvalidateRotationRule(rule.MerchantID.String())

	return nil
}
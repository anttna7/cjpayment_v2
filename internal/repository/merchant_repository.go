package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
	"github.com/company/cjpayment/pkg/cache"
)

// merchantRepository implements MerchantRepository interface
type merchantRepository struct {
	*BaseRepository
}

// NewMerchantRepository creates a new merchant repository
func NewMerchantRepository(db *sqlx.DB) MerchantRepository {
	return &merchantRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new merchant
func (r *merchantRepository) Create(ctx context.Context, merchant *Merchant) error {
	if merchant.ID == uuid.Nil {
		merchant.ID = uuid.New()
	}
	merchant.CreatedAt = time.Now()
	merchant.UpdatedAt = time.Now()
	if merchant.DailyUsed.IsZero() {
		merchant.DailyUsed = decimal.Zero
	}
	if merchant.LastResetDate.IsZero() {
		merchant.LastResetDate = time.Now().Truncate(24 * time.Hour)
	}

	query := `
		INSERT INTO merchants (id, name, code, contact_person, contact_phone, contact_email, 
		                      status, daily_limit, single_limit, daily_used, last_reset_date,
		                      created_at, updated_at, created_by, updated_by)
		VALUES (:id, :name, :code, :contact_person, :contact_phone, :contact_email,
		        :status, :daily_limit, :single_limit, :daily_used, :last_reset_date,
		        :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, merchant)
	return err
}

// GetByID retrieves a merchant by ID
func (r *merchantRepository) GetByID(ctx context.Context, id uuid.UUID) (*Merchant, error) {
	var merchant Merchant
	query := "SELECT * FROM merchants WHERE id = $1"
	err := r.db.GetContext(ctx, &merchant, query, id)
	if err != nil {
		return nil, err
	}
	return &merchant, nil
}

// GetByCode retrieves a merchant by code
func (r *merchantRepository) GetByCode(ctx context.Context, code string) (*Merchant, error) {
	var merchant Merchant
	query := "SELECT * FROM merchants WHERE code = $1"
	err := r.db.GetContext(ctx, &merchant, query, code)
	if err != nil {
		return nil, err
	}
	return &merchant, nil
}

// Update updates a merchant
func (r *merchantRepository) Update(ctx context.Context, merchant *Merchant) error {
	merchant.UpdatedAt = time.Now()

	query := `
		UPDATE merchants 
		SET name = :name, code = :code, contact_person = :contact_person, 
		    contact_phone = :contact_phone, contact_email = :contact_email,
		    status = :status, daily_limit = :daily_limit, single_limit = :single_limit,
		    daily_used = :daily_used, last_reset_date = :last_reset_date,
		    updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, merchant)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", merchant.ID)
	}

	return nil
}

// Delete deletes a merchant by ID
func (r *merchantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM merchants WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", id)
	}

	return nil
}

// List retrieves merchants with filtering
func (r *merchantRepository) List(ctx context.Context, filter *MerchantFilter) ([]*Merchant, error) {
	var merchants []*Merchant
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM merchants"

	// Build WHERE conditions
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR code ILIKE $%d OR contact_person ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
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

	err := r.db.SelectContext(ctx, &merchants, query, args...)
	return merchants, err
}

// Count returns the count of merchants matching the filter
func (r *merchantRepository) Count(ctx context.Context, filter *MerchantFilter) (int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM merchants"

	// Build WHERE conditions (same as List)
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR code ILIKE $%d OR contact_person ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	return count, err
}

// Search searches merchants by keyword (name, code, or contact person)
func (r *merchantRepository) Search(ctx context.Context, keyword string) ([]*Merchant, error) {
	var merchants []*Merchant
	query := `
		SELECT * FROM merchants 
		WHERE (name ILIKE $1 OR code ILIKE $1 OR contact_person ILIKE $1) 
		  AND status = 'active'
		ORDER BY name
		LIMIT 20`

	searchTerm := "%" + keyword + "%"
	err := r.db.SelectContext(ctx, &merchants, query, searchTerm)
	return merchants, err
}

// UpdateDailyUsed updates the daily used amount for a merchant
func (r *merchantRepository) UpdateDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error {
	query := `
		UPDATE merchants 
		SET daily_used = daily_used + $2, updated_at = $3
		WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, merchantID, amount, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update merchant daily used: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", merchantID)
	}

	return nil
}

// ResetDailyLimits resets daily used amounts for all merchants
func (r *merchantRepository) ResetDailyLimits(ctx context.Context) error {
	query := `
		UPDATE merchants 
		SET daily_used = 0, last_reset_date = $1, updated_at = $1
		WHERE last_reset_date < $1`

	today := time.Now().Truncate(24 * time.Hour)
	_, err := r.db.ExecContext(ctx, query, today)
	if err != nil {
		return fmt.Errorf("failed to reset merchant daily limits: %w", err)
	}

	return nil
}

// ExistsByName checks if a merchant with the given name already exists
func (r *merchantRepository) ExistsByName(ctx context.Context, name string) (bool, error) {
	var count int
	query := "SELECT COUNT(*) FROM merchants WHERE name = $1"
	err := r.db.GetContext(ctx, &count, query, name)
	if err != nil {
		return false, fmt.Errorf("failed to check merchant name existence: %w", err)
	}
	return count > 0, nil
}

// ExistsByPortName checks if a merchant with the given port name already exists
func (r *merchantRepository) ExistsByPortName(ctx context.Context, portName string) (bool, error) {
	var count int
	query := "SELECT COUNT(*) FROM merchants WHERE port_name = $1"
	err := r.db.GetContext(ctx, &count, query, portName)
	if err != nil {
		return false, fmt.Errorf("failed to check merchant port name existence: %w", err)
	}
	return count > 0, nil
}

// GetMerchantWithAccounts retrieves a merchant along with its associated receive accounts
func (r *merchantRepository) GetMerchantWithAccounts(ctx context.Context, id uuid.UUID) (*Merchant, []*ReceiveAccount, error) {
	// Get merchant
	merchant, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get merchant: %w", err)
	}

	// Get associated receive accounts
	var accounts []*ReceiveAccount
	query := `
		SELECT ra.* 
		FROM receive_accounts ra
		INNER JOIN merchant_receive_accounts mra ON ra.id = mra.receive_account_id
		WHERE mra.merchant_id = $1 AND mra.is_active = true
		ORDER BY mra.weight DESC, ra.created_at ASC`

	err = r.db.SelectContext(ctx, &accounts, query, id)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	return merchant, accounts, nil
}

// Recharge Testing System Methods

// GetByRechargeURL retrieves a merchant by recharge URL
func (r *merchantRepository) GetByRechargeURL(ctx context.Context, rechargeURL string) (*Merchant, error) {
	var merchant Merchant
	query := "SELECT * FROM merchants WHERE recharge_url = $1 AND is_recharge_enabled = true"
	err := r.db.GetContext(ctx, &merchant, query, rechargeURL)
	if err != nil {
		return nil, err
	}
	return &merchant, nil
}

// UpdateRechargeConfig updates the recharge page configuration for a merchant
func (r *merchantRepository) UpdateRechargeConfig(ctx context.Context, merchantID uuid.UUID, config map[string]interface{}) error {
	query := `
		UPDATE merchants 
		SET recharge_page_config = $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, config, merchantID)
	if err != nil {
		return fmt.Errorf("failed to update recharge config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", merchantID)
	}

	return nil
}

// EnableRecharge enables or disables recharge functionality for a merchant
func (r *merchantRepository) EnableRecharge(ctx context.Context, merchantID uuid.UUID, enabled bool) error {
	query := `
		UPDATE merchants 
		SET is_recharge_enabled = $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, enabled, merchantID)
	if err != nil {
		return fmt.Errorf("failed to update recharge enabled status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", merchantID)
	}

	return nil
}

// GenerateRechargeURL generates a unique recharge URL for a merchant
func (r *merchantRepository) GenerateRechargeURL(ctx context.Context, merchantID uuid.UUID) (string, error) {
	// Generate a unique URL path based on merchant ID and timestamp
	urlPath := fmt.Sprintf("/recharge/%s", merchantID.String())
	
	query := `
		UPDATE merchants 
		SET recharge_url = $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, urlPath, merchantID)
	if err != nil {
		return "", fmt.Errorf("failed to update recharge URL: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return "", fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return "", fmt.Errorf("merchant with id %s not found", merchantID)
	}

	return urlPath, nil
}

// GetRechargeEnabledMerchants retrieves all merchants with recharge functionality enabled
func (r *merchantRepository) GetRechargeEnabledMerchants(ctx context.Context) ([]*Merchant, error) {
	var merchants []*Merchant
	query := `
		SELECT * FROM merchants 
		WHERE is_recharge_enabled = true AND status = 'active'
		ORDER BY name ASC`

	err := r.db.SelectContext(ctx, &merchants, query)
	return merchants, err
}

// cachedMerchantRepository implements MerchantRepository interface with caching
type cachedMerchantRepository struct {
	*CachedBaseRepository
}

// NewMerchantRepositoryWithCache creates a new cached merchant repository
func NewMerchantRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) MerchantRepository {
	// TODO: Implement cached version properly
	return NewMerchantRepository(db)
}

// Create creates a new merchant with cache invalidation
func (r *cachedMerchantRepository) Create(ctx context.Context, merchant *Merchant) error {
	if merchant.ID == uuid.Nil {
		merchant.ID = uuid.New()
	}
	merchant.CreatedAt = time.Now()
	merchant.UpdatedAt = time.Now()
	if merchant.DailyUsed.IsZero() {
		merchant.DailyUsed = decimal.Zero
	}
	if merchant.LastResetDate.IsZero() {
		merchant.LastResetDate = time.Now().Truncate(24 * time.Hour)
	}

	query := `
		INSERT INTO merchants (id, name, code, contact_person, contact_phone, contact_email, 
		                      status, daily_limit, single_limit, daily_used, last_reset_date,
		                      created_at, updated_at, created_by, updated_by)
		VALUES (:id, :name, :code, :contact_person, :contact_phone, :contact_email,
		        :status, :daily_limit, :single_limit, :daily_used, :last_reset_date,
		        :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, merchant)
	if err != nil {
		return err
	}

	// Invalidate merchant-related cache
	r.invalidator.InvalidateMerchant(merchant.ID.String())
	
	return nil
}

// GetByID retrieves a merchant by ID with caching
func (r *cachedMerchantRepository) GetByID(ctx context.Context, id uuid.UUID) (*Merchant, error) {
	var merchant Merchant
	err := r.GetByIDWithCache(ctx, &merchant, "merchants", id, "merchant")
	if err != nil {
		return nil, err
	}
	return &merchant, nil
}

// GetByCode retrieves a merchant by code with caching
func (r *cachedMerchantRepository) GetByCode(ctx context.Context, code string) (*Merchant, error) {
	cacheKey := fmt.Sprintf("merchant:code:%s", code)
	var merchant Merchant
	
	err := r.GetWithCache(ctx, &merchant, cacheKey, cache.LongExpiration,
		"SELECT * FROM merchants WHERE code = $1", code)
	if err != nil {
		return nil, err
	}
	return &merchant, nil
}

// Update updates a merchant with cache invalidation
func (r *cachedMerchantRepository) Update(ctx context.Context, merchant *Merchant) error {
	merchant.UpdatedAt = time.Now()

	query := `
		UPDATE merchants 
		SET name = :name, code = :code, contact_person = :contact_person, 
		    contact_phone = :contact_phone, contact_email = :contact_email,
		    status = :status, daily_limit = :daily_limit, single_limit = :single_limit,
		    daily_used = :daily_used, last_reset_date = :last_reset_date,
		    updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, merchant)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", merchant.ID)
	}

	// Invalidate merchant-related cache
	r.invalidator.InvalidateMerchant(merchant.ID.String())

	return nil
}

// Delete deletes a merchant by ID with cache invalidation
func (r *cachedMerchantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM merchants WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", id)
	}

	// Invalidate merchant-related cache
	r.invalidator.InvalidateMerchant(id.String())

	return nil
}

// List retrieves merchants with caching for common filters
func (r *cachedMerchantRepository) List(ctx context.Context, filter *MerchantFilter) ([]*Merchant, error) {
	cacheKey := r.generateMerchantListCacheKey(filter)
	
	var merchants []*Merchant
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM merchants"

	// Build WHERE conditions
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR code ILIKE $%d OR contact_person ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
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

	// Use cache for simple queries
	if r.shouldCacheMerchantList(filter) {
		err := r.GetManyWithCache(ctx, &merchants, cacheKey, cache.MediumExpiration, query, args...)
		return merchants, err
	}

	// Direct database query for complex filters
	err := r.db.SelectContext(ctx, &merchants, query, args...)
	return merchants, err
}

// Count returns the count of merchants with caching
func (r *cachedMerchantRepository) Count(ctx context.Context, filter *MerchantFilter) (int64, error) {
	cacheKey := r.generateMerchantCountCacheKey(filter)
	
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM merchants"

	// Build WHERE conditions
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR code ILIKE $%d OR contact_person ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Use cache for simple queries
	if r.shouldCacheMerchantList(filter) {
		return r.CountWithCache(ctx, "merchants", strings.Join(conditions, " AND "), cacheKey, cache.MediumExpiration, args...)
	}

	// Direct database query
	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	return count, err
}

// SearchByKeyword searches merchants by keyword with caching
func (r *cachedMerchantRepository) SearchByKeyword(ctx context.Context, keyword string, limit int) ([]*Merchant, error) {
	cacheKey := fmt.Sprintf("merchant:search:%s:%d", keyword, limit)
	
	var merchants []*Merchant
	query := `
		SELECT * FROM merchants 
		WHERE (name ILIKE $1 OR code ILIKE $1 OR contact_person ILIKE $1) 
		  AND status = 'active'
		ORDER BY name ASC 
		LIMIT $2`
	
	searchTerm := "%" + keyword + "%"
	
	err := r.GetManyWithCache(ctx, &merchants, cacheKey, cache.ShortExpiration, query, searchTerm, limit)
	return merchants, err
}

// UpdateDailyUsage updates merchant daily usage with cache invalidation
func (r *cachedMerchantRepository) UpdateDailyUsage(ctx context.Context, id uuid.UUID, amount decimal.Decimal) error {
	query := `
		UPDATE merchants 
		SET daily_used = daily_used + $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, amount, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("merchant with id %s not found", id)
	}

	// Invalidate merchant cache
	r.invalidator.InvalidateMerchant(id.String())

	return nil
}

// ResetDailyUsage resets daily usage for all merchants with cache invalidation
func (r *cachedMerchantRepository) ResetDailyUsage(ctx context.Context) error {
	query := `
		UPDATE merchants 
		SET daily_used = 0, last_reset_date = CURRENT_DATE, updated_at = NOW()
		WHERE last_reset_date < CURRENT_DATE`

	_, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return err
	}

	// Invalidate all merchant cache
	r.InvalidatePattern("merchant:*")

	return nil
}

// generateMerchantListCacheKey generates a cache key for merchant list queries
func (r *cachedMerchantRepository) generateMerchantListCacheKey(filter *MerchantFilter) string {
	key := "merchant_list"
	
	if filter.Status != nil {
		key += fmt.Sprintf(":status:%s", *filter.Status)
	}
	if filter.Keyword != nil && *filter.Keyword != "" {
		key += fmt.Sprintf(":keyword:%s", *filter.Keyword)
	}
	
	key += fmt.Sprintf(":order:%s:%s", filter.OrderBy, filter.OrderDir)
	key += fmt.Sprintf(":page:%d:%d", filter.Offset, filter.Limit)
	
	return key
}

// generateMerchantCountCacheKey generates a cache key for merchant count queries
func (r *cachedMerchantRepository) generateMerchantCountCacheKey(filter *MerchantFilter) string {
	key := "merchant_count"
	
	if filter.Status != nil {
		key += fmt.Sprintf(":status:%s", *filter.Status)
	}
	if filter.Keyword != nil && *filter.Keyword != "" {
		key += fmt.Sprintf(":keyword:%s", *filter.Keyword)
	}
	
	return key
}

// shouldCacheMerchantList determines if a merchant list query should be cached
func (r *cachedMerchantRepository) shouldCacheMerchantList(filter *MerchantFilter) bool {
	// Cache simple queries without complex filters
	return filter.Keyword == nil || *filter.Keyword == ""
}
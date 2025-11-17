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

// receiveAccountRepository implements ReceiveAccountRepository interface
type receiveAccountRepository struct {
	*BaseRepository
}

// NewReceiveAccountRepository creates a new receive account repository
func NewReceiveAccountRepository(db *sqlx.DB) ReceiveAccountRepository {
	return &receiveAccountRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new receive account
func (r *receiveAccountRepository) Create(ctx context.Context, account *ReceiveAccount) error {
	if account.ID == uuid.Nil {
		account.ID = uuid.New()
	}
	account.CreatedAt = time.Now()
	account.UpdatedAt = time.Now()
	account.LastResetDate = time.Now().Truncate(24 * time.Hour) // Set to start of today

	query := `
		INSERT INTO receive_accounts (id, account_name, account_number, account_type, bank_name, bank_branch,
		                             account_holder, payment_type, status, daily_limit, single_limit, daily_used,
		                             last_reset_date, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :account_name, :account_number, :account_type, :bank_name, :bank_branch,
		        :account_holder, :payment_type, :status, :daily_limit, :single_limit, :daily_used,
		        :last_reset_date, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, account)
	return err
}

// GetByID retrieves a receive account by ID
func (r *receiveAccountRepository) GetByID(ctx context.Context, id uuid.UUID) (*ReceiveAccount, error) {
	var account ReceiveAccount
	query := "SELECT * FROM receive_accounts WHERE id = $1"
	err := r.db.GetContext(ctx, &account, query, id)
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// GetByAccountNumber retrieves a receive account by account number
func (r *receiveAccountRepository) GetByAccountNumber(ctx context.Context, accountNumber string) (*ReceiveAccount, error) {
	var account ReceiveAccount
	query := "SELECT * FROM receive_accounts WHERE account_number = $1"
	err := r.db.GetContext(ctx, &account, query, accountNumber)
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// Update updates a receive account
func (r *receiveAccountRepository) Update(ctx context.Context, account *ReceiveAccount) error {
	account.UpdatedAt = time.Now()

	query := `
		UPDATE receive_accounts 
		SET account_name = :account_name, account_number = :account_number, account_type = :account_type,
		    bank_name = :bank_name, bank_branch = :bank_branch, account_holder = :account_holder,
		    payment_type = :payment_type, status = :status, daily_limit = :daily_limit,
		    single_limit = :single_limit, daily_used = :daily_used, last_reset_date = :last_reset_date,
		    updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, account)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("receive account with id %s not found", account.ID)
	}

	return nil
}

// Delete deletes a receive account by ID
func (r *receiveAccountRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM receive_accounts WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("receive account with id %s not found", id)
	}

	return nil
}

// List retrieves receive accounts with filtering and optimized pagination
func (r *receiveAccountRepository) List(ctx context.Context, filter *ReceiveAccountFilter) ([]*ReceiveAccount, error) {
	// 检查数据库连接状态
	if r.db == nil {
		return nil, fmt.Errorf("database connection is not initialized")
	}

	// 测试数据库连接
	if err := r.db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	var accounts []*ReceiveAccount
	var conditions []string
	var args []interface{}
	argIndex := 1

	// 设置默认过滤器并验证分页参数
	if filter == nil {
		filter = &ReceiveAccountFilter{
			Limit:  20,
			Offset: 0,
		}
	}

	// 验证和调整分页参数边界
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 1000 { // 防止过大的查询
		filter.Limit = 1000
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	// 使用优化的查询，只选择必要的字段以提高性能
	query := `SELECT id, account_name, account_number, account_type, custom_payment_provider,
	                 bank_name, bank_branch, account_holder, payment_type, status,
	                 daily_limit, single_limit, daily_used, last_reset_date,
	                 created_at, updated_at, created_by, updated_by
	          FROM receive_accounts`

	// Build WHERE conditions
	if filter.AccountType != nil && *filter.AccountType != "" {
		conditions = append(conditions, fmt.Sprintf("account_type = $%d", argIndex))
		args = append(args, *filter.AccountType)
		argIndex++
	}

	if filter.PaymentType != nil && *filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if filter.Status != nil && *filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.MerchantID != nil {
		// 优化子查询使用 EXISTS 而不是 IN
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM merchant_receive_accounts WHERE receive_account_id = receive_accounts.id AND merchant_id = $%d AND is_active = true)", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	// 添加搜索功能支持，使用更高效的搜索
	if filter.Search != nil && *filter.Search != "" {
		searchTerm := "%" + strings.ToLower(*filter.Search) + "%"
		conditions = append(conditions, fmt.Sprintf("(LOWER(account_name) LIKE $%d OR LOWER(account_number) LIKE $%d OR LOWER(account_holder) LIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchTerm)
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// 验证排序字段以防止SQL注入
	validOrderFields := map[string]bool{
		"created_at":     true,
		"updated_at":     true,
		"account_name":   true,
		"account_type":   true,
		"payment_type":   true,
		"status":         true,
		"daily_limit":    true,
		"single_limit":   true,
		"daily_used":     true,
	}

	orderBy := "created_at"
	if filter.OrderBy != "" && validOrderFields[filter.OrderBy] {
		orderBy = filter.OrderBy
	}

	orderDir := "DESC"
	if filter.OrderDir == "ASC" || filter.OrderDir == "DESC" {
		orderDir = filter.OrderDir
	}

	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination with LIMIT and OFFSET
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filter.Limit, filter.Offset)

	err := r.db.SelectContext(ctx, &accounts, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	
	return accounts, nil
}

// Count returns the total number of receive accounts matching the filter
func (r *receiveAccountRepository) Count(ctx context.Context, filter *ReceiveAccountFilter) (int64, error) {
	var count int64
	var conditions []string
	var args []interface{}
	argIndex := 1

	// 设置默认过滤器
	if filter == nil {
		filter = &ReceiveAccountFilter{}
	}

	query := "SELECT COUNT(*) FROM receive_accounts"

	// Build WHERE conditions (same as List method)
	if filter.AccountType != nil && *filter.AccountType != "" {
		conditions = append(conditions, fmt.Sprintf("account_type = $%d", argIndex))
		args = append(args, *filter.AccountType)
		argIndex++
	}

	if filter.PaymentType != nil && *filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *filter.PaymentType)
		argIndex++
	}

	if filter.Status != nil && *filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("id IN (SELECT receive_account_id FROM merchant_receive_accounts WHERE merchant_id = $%d AND is_active = true)", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	// 添加搜索功能支持
	if filter.Search != nil && *filter.Search != "" {
		searchTerm := "%" + *filter.Search + "%"
		conditions = append(conditions, fmt.Sprintf("(account_name ILIKE $%d OR account_number ILIKE $%d OR account_holder ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchTerm)
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	err := r.db.GetContext(ctx, &count, query, args...)
	if err != nil {
		return 0, fmt.Errorf("failed to count accounts: %w", err)
	}

	return count, nil
}

// GetByMerchant retrieves all receive accounts for a merchant
func (r *receiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*ReceiveAccount, error) {
	var accounts []*ReceiveAccount
	query := `
		SELECT ra.* FROM receive_accounts ra
		INNER JOIN merchant_receive_accounts mra ON ra.id = mra.receive_account_id
		WHERE mra.merchant_id = $1 AND mra.is_active = true AND ra.status = 'active'
		ORDER BY mra.weight DESC, ra.account_name`

	err := r.db.SelectContext(ctx, &accounts, query, merchantID)
	return accounts, err
}

// GetAvailableAccounts retrieves available receive accounts for a merchant that can handle the specified amount
func (r *receiveAccountRepository) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*ReceiveAccount, error) {
	var accounts []*ReceiveAccount
	
	// First, reset daily limits for accounts where the last reset date is not today
	err := r.ResetDailyLimits(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to reset daily limits: %w", err)
	}

	query := `
		SELECT ra.* FROM receive_accounts ra
		INNER JOIN merchant_receive_accounts mra ON ra.id = mra.receive_account_id
		WHERE mra.merchant_id = $1 
		  AND mra.is_active = true 
		  AND ra.status = 'active'
		  AND ra.payment_type = $2
		  AND ra.single_limit >= $3
		  AND (ra.daily_limit - ra.daily_used) >= $3
		ORDER BY mra.weight DESC, ra.daily_used ASC`

	err = r.db.SelectContext(ctx, &accounts, query, merchantID, paymentType, amount)
	return accounts, err
}

// UpdateDailyUsed updates the daily used amount for an account
func (r *receiveAccountRepository) UpdateDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	query := `
		UPDATE receive_accounts 
		SET daily_used = daily_used + $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, amount, accountID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("receive account with id %s not found", accountID)
	}

	return nil
}

// ResetDailyLimits resets daily used amounts for accounts where last_reset_date is not today
func (r *receiveAccountRepository) ResetDailyLimits(ctx context.Context) error {
	today := time.Now().Truncate(24 * time.Hour)
	
	query := `
		UPDATE receive_accounts 
		SET daily_used = 0, last_reset_date = $1, updated_at = NOW()
		WHERE last_reset_date < $1`

	_, err := r.db.ExecContext(ctx, query, today)
	return err
}

// ExistsByAccountNumber checks if a receive account with the given account number already exists
func (r *receiveAccountRepository) ExistsByAccountNumber(ctx context.Context, accountNumber string) (bool, error) {
	var count int
	query := "SELECT COUNT(*) FROM receive_accounts WHERE account_number = $1"
	err := r.db.GetContext(ctx, &count, query, accountNumber)
	if err != nil {
		return false, fmt.Errorf("failed to check account number existence: %w", err)
	}
	return count > 0, nil
}

// CreateWithMerchantAssociation creates a new receive account and associates it with a merchant
func (r *receiveAccountRepository) CreateWithMerchantAssociation(ctx context.Context, account *ReceiveAccount, merchantID uuid.UUID, weight int) error {
	// Start transaction
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Create the receive account
	if account.ID == uuid.Nil {
		account.ID = uuid.New()
	}
	account.CreatedAt = time.Now()
	account.UpdatedAt = time.Now()
	account.LastResetDate = time.Now().Truncate(24 * time.Hour)

	accountQuery := `
		INSERT INTO receive_accounts (id, account_name, account_number, account_type, custom_payment_provider,
		                             bank_name, bank_branch, account_holder, payment_type, status, 
		                             daily_limit, single_limit, daily_used, last_reset_date, 
		                             created_at, updated_at, created_by, updated_by)
		VALUES (:id, :account_name, :account_number, :account_type, :custom_payment_provider,
		        :bank_name, :bank_branch, :account_holder, :payment_type, :status,
		        :daily_limit, :single_limit, :daily_used, :last_reset_date,
		        :created_at, :updated_at, :created_by, :updated_by)`

	_, err = tx.NamedExecContext(ctx, accountQuery, account)
	if err != nil {
		return fmt.Errorf("failed to create receive account: %w", err)
	}

	// Create the merchant-account association
	associationID := uuid.New()
	associationQuery := `
		INSERT INTO merchant_receive_accounts (id, merchant_id, receive_account_id, weight, is_active, created_at)
		VALUES ($1, $2, $3, $4, true, $5)`

	_, err = tx.ExecContext(ctx, associationQuery, associationID, merchantID, account.ID, weight, time.Now())
	if err != nil {
		return fmt.Errorf("failed to create merchant-account association: %w", err)
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// ValidateAccountType validates if the account type is supported
func (r *receiveAccountRepository) ValidateAccountType(ctx context.Context, accountType string) error {
	validTypes := map[string]bool{
		"alipay": true,
		"wechat": true,
		"bank":   true,
		"other":  true,
	}
	
	if !validTypes[accountType] {
		return fmt.Errorf("invalid account type: %s. Valid types are: alipay, wechat, bank, other", accountType)
	}
	
	return nil
}

// ValidatePaymentProvider validates payment provider based on account type
func (r *receiveAccountRepository) ValidatePaymentProvider(ctx context.Context, accountType string, customPaymentProvider *string) error {
	// First validate the account type
	if err := r.ValidateAccountType(ctx, accountType); err != nil {
		return err
	}
	
	// For "other" type, custom payment provider is required
	if accountType == "other" {
		if customPaymentProvider == nil || *customPaymentProvider == "" {
			return fmt.Errorf("custom payment provider is required when account type is 'other'")
		}
		
		// Validate custom payment provider length
		if len(*customPaymentProvider) < 2 || len(*customPaymentProvider) > 50 {
			return fmt.Errorf("custom payment provider must be between 2 and 50 characters")
		}
	}
	
	// For standard types (alipay, wechat, bank), custom payment provider should be empty or null
	if accountType != "other" && customPaymentProvider != nil && *customPaymentProvider != "" {
		return fmt.Errorf("custom payment provider should not be specified for account type '%s'", accountType)
	}
	
	return nil
}

// NewReceiveAccountRepositoryWithCache creates a new cached receive account repository
func NewReceiveAccountRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) ReceiveAccountRepository {
	baseRepo := NewReceiveAccountRepository(db)
	return &cachedReceiveAccountRepository{
		CachedBaseRepository: NewCachedBaseRepository(db, cacheClient),
		baseRepo:            baseRepo,
	}
}

// cachedReceiveAccountRepository implements ReceiveAccountRepository interface with caching
type cachedReceiveAccountRepository struct {
	*CachedBaseRepository
	baseRepo ReceiveAccountRepository
}

// GetByID retrieves a receive account by ID with caching
func (r *cachedReceiveAccountRepository) GetByID(ctx context.Context, id uuid.UUID) (*ReceiveAccount, error) {
	var account ReceiveAccount
	err := r.GetByIDWithCache(ctx, &account, "receive_accounts", id, "account")
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// GetAvailableAccounts retrieves available accounts with caching
func (r *cachedReceiveAccountRepository) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*ReceiveAccount, error) {
	return r.baseRepo.GetAvailableAccounts(ctx, merchantID, amount, paymentType)
}

// UpdateDailyUsage updates account daily usage with cache invalidation
func (r *cachedReceiveAccountRepository) UpdateDailyUsage(ctx context.Context, id uuid.UUID, amount decimal.Decimal) error {
	query := `
		UPDATE receive_accounts 
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
		return fmt.Errorf("receive account with id %s not found", id)
	}

	// Invalidate account cache
	r.invalidator.InvalidateAccount(id.String())

	return nil
}

// ValidateAccountType validates if the account type is supported
func (r *cachedReceiveAccountRepository) ValidateAccountType(ctx context.Context, accountType string) error {
	validTypes := map[string]bool{
		"alipay": true,
		"wechat": true,
		"bank":   true,
		"other":  true,
	}
	
	if !validTypes[accountType] {
		return fmt.Errorf("invalid account type: %s. Valid types are: alipay, wechat, bank, other", accountType)
	}
	
	return nil
}

// ValidatePaymentProvider validates payment provider based on account type
func (r *cachedReceiveAccountRepository) ValidatePaymentProvider(ctx context.Context, accountType string, customPaymentProvider *string) error {
	// First validate the account type
	if err := r.ValidateAccountType(ctx, accountType); err != nil {
		return err
	}
	
	// For "other" type, custom payment provider is required
	if accountType == "other" {
		if customPaymentProvider == nil || *customPaymentProvider == "" {
			return fmt.Errorf("custom payment provider is required when account type is 'other'")
		}
		
		// Validate custom payment provider length
		if len(*customPaymentProvider) < 2 || len(*customPaymentProvider) > 50 {
			return fmt.Errorf("custom payment provider must be between 2 and 50 characters")
		}
	}
	
	// For standard types (alipay, wechat, bank), custom payment provider should be empty or null
	if accountType != "other" && customPaymentProvider != nil && *customPaymentProvider != "" {
		return fmt.Errorf("custom payment provider should not be specified for account type '%s'", accountType)
	}
	
	return nil
}

// Delegate missing methods to base repository
func (r *cachedReceiveAccountRepository) Create(ctx context.Context, account *ReceiveAccount) error {
	err := r.baseRepo.Create(ctx, account)
	if err != nil {
		return err
	}
	
	// Invalidate related cache entries
	r.invalidateAccountListCache()
	return nil
}

func (r *cachedReceiveAccountRepository) Update(ctx context.Context, account *ReceiveAccount) error {
	err := r.baseRepo.Update(ctx, account)
	if err != nil {
		return err
	}
	
	// Invalidate account cache and list cache
	r.invalidateAccountCache(account.ID.String())
	r.invalidateAccountListCache()
	return nil
}

func (r *cachedReceiveAccountRepository) Delete(ctx context.Context, id uuid.UUID) error {
	err := r.baseRepo.Delete(ctx, id)
	if err != nil {
		return err
	}
	
	// Invalidate account cache and list cache
	r.invalidateAccountCache(id.String())
	r.invalidateAccountListCache()
	return nil
}

// List retrieves receive accounts with caching support
func (r *cachedReceiveAccountRepository) List(ctx context.Context, filter *ReceiveAccountFilter) ([]*ReceiveAccount, error) {
	// Generate cache key based on filter parameters
	cacheKey := r.generateListCacheKey(filter)
	
	// Try to get from cache first
	var accounts []*ReceiveAccount
	err := r.cache.Get(cacheKey, &accounts)
	if err == nil && accounts != nil {
		return accounts, nil
	}
	
	// Cache miss, get from database
	accounts, err = r.baseRepo.List(ctx, filter)
	if err != nil {
		return nil, err
	}
	
	// Cache the results for 5 minutes (accounts data changes frequently)
	if len(accounts) > 0 {
		_ = r.cache.Set(cacheKey, accounts, cache.ShortExpiration)
	}
	
	return accounts, nil
}

// Count retrieves account count with caching support
func (r *cachedReceiveAccountRepository) Count(ctx context.Context, filter *ReceiveAccountFilter) (int64, error) {
	// Generate cache key for count
	cacheKey := r.generateCountCacheKey(filter)
	
	// Try to get from cache first
	var count int64
	err := r.cache.Get(cacheKey, &count)
	if err == nil {
		return count, nil
	}
	
	// Cache miss, get from database
	count, err = r.baseRepo.Count(ctx, filter)
	if err != nil {
		return 0, err
	}
	
	// Cache the count for 5 minutes
	_ = r.cache.Set(cacheKey, count, cache.ShortExpiration)
	
	return count, nil
}

func (r *cachedReceiveAccountRepository) GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*ReceiveAccount, error) {
	return r.baseRepo.GetByMerchant(ctx, merchantID)
}

func (r *cachedReceiveAccountRepository) UpdateDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error {
	return r.baseRepo.UpdateDailyUsed(ctx, accountID, amount)
}

func (r *cachedReceiveAccountRepository) ResetDailyLimits(ctx context.Context) error {
	return r.baseRepo.ResetDailyLimits(ctx)
}

func (r *cachedReceiveAccountRepository) ExistsByAccountNumber(ctx context.Context, accountNumber string) (bool, error) {
	return r.baseRepo.ExistsByAccountNumber(ctx, accountNumber)
}

func (r *cachedReceiveAccountRepository) CreateWithMerchantAssociation(ctx context.Context, account *ReceiveAccount, merchantID uuid.UUID, weight int) error {
	return r.baseRepo.CreateWithMerchantAssociation(ctx, account, merchantID, weight)
}

func (r *cachedReceiveAccountRepository) GetByAccountNumber(ctx context.Context, accountNumber string) (*ReceiveAccount, error) {
	return r.baseRepo.GetByAccountNumber(ctx, accountNumber)
}

// Cache helper methods
func (r *cachedReceiveAccountRepository) generateListCacheKey(filter *ReceiveAccountFilter) string {
	if filter == nil {
		return "accounts:list:default"
	}
	
	key := "accounts:list"
	
	if filter.AccountType != nil {
		key += fmt.Sprintf(":type_%s", *filter.AccountType)
	}
	if filter.PaymentType != nil {
		key += fmt.Sprintf(":payment_%s", *filter.PaymentType)
	}
	if filter.Status != nil {
		key += fmt.Sprintf(":status_%s", *filter.Status)
	}
	if filter.MerchantID != nil {
		key += fmt.Sprintf(":merchant_%s", filter.MerchantID.String())
	}
	if filter.Search != nil && *filter.Search != "" {
		key += fmt.Sprintf(":search_%s", *filter.Search)
	}
	
	key += fmt.Sprintf(":limit_%d:offset_%d", filter.Limit, filter.Offset)
	key += fmt.Sprintf(":order_%s_%s", filter.OrderBy, filter.OrderDir)
	
	return key
}

func (r *cachedReceiveAccountRepository) generateCountCacheKey(filter *ReceiveAccountFilter) string {
	if filter == nil {
		return "accounts:count:default"
	}
	
	key := "accounts:count"
	
	if filter.AccountType != nil {
		key += fmt.Sprintf(":type_%s", *filter.AccountType)
	}
	if filter.PaymentType != nil {
		key += fmt.Sprintf(":payment_%s", *filter.PaymentType)
	}
	if filter.Status != nil {
		key += fmt.Sprintf(":status_%s", *filter.Status)
	}
	if filter.MerchantID != nil {
		key += fmt.Sprintf(":merchant_%s", filter.MerchantID.String())
	}
	if filter.Search != nil && *filter.Search != "" {
		key += fmt.Sprintf(":search_%s", *filter.Search)
	}
	
	return key
}

func (r *cachedReceiveAccountRepository) invalidateAccountCache(accountID string) {
	key := fmt.Sprintf(cache.AccountCacheKey, accountID)
	_ = r.cache.Delete(key)
}

func (r *cachedReceiveAccountRepository) invalidateAccountListCache() {
	// Invalidate all account list cache entries
	_ = r.cache.DeletePattern("accounts:list:*")
	_ = r.cache.DeletePattern("accounts:count:*")
}
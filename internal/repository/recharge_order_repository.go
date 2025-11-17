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

// rechargeOrderRepository implements RechargeOrderRepository interface
type rechargeOrderRepository struct {
	*BaseRepository
}

// NewRechargeOrderRepository creates a new recharge order repository
func NewRechargeOrderRepository(db *sqlx.DB) RechargeOrderRepository {
	return &rechargeOrderRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new recharge order
func (r *rechargeOrderRepository) Create(ctx context.Context, order *RechargeOrder) error {
	if order.ID == uuid.Nil {
		order.ID = uuid.New()
	}
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()

	query := `
		INSERT INTO recharge_orders (id, order_number, payer_name, payer_account, payment_type,
		                            amount, merchant_id, ad_account, receive_account_id, status,
		                            remark, voucher_url, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :order_number, :payer_name, :payer_account, :payment_type,
		        :amount, :merchant_id, :ad_account, :receive_account_id, :status,
		        :remark, :voucher_url, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, order)
	return err
}

// GetByID retrieves a recharge order by ID
func (r *rechargeOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*RechargeOrder, error) {
	var order RechargeOrder
	query := "SELECT * FROM recharge_orders WHERE id = $1"
	err := r.db.GetContext(ctx, &order, query, id)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// GetByOrderNumber retrieves a recharge order by order number
func (r *rechargeOrderRepository) GetByOrderNumber(ctx context.Context, orderNumber string) (*RechargeOrder, error) {
	var order RechargeOrder
	query := "SELECT * FROM recharge_orders WHERE order_number = $1"
	err := r.db.GetContext(ctx, &order, query, orderNumber)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// Update updates a recharge order
func (r *rechargeOrderRepository) Update(ctx context.Context, order *RechargeOrder) error {
	order.UpdatedAt = time.Now()

	query := `
		UPDATE recharge_orders 
		SET payer_name = :payer_name, payer_account = :payer_account, payment_type = :payment_type,
		    amount = :amount, merchant_id = :merchant_id, ad_account = :ad_account,
		    receive_account_id = :receive_account_id, status = :status, remark = :remark,
		    voucher_url = :voucher_url, updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, order)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("recharge order with id %s not found", order.ID)
	}

	return nil
}

// List retrieves recharge orders with filtering
func (r *rechargeOrderRepository) List(ctx context.Context, filter *RechargeOrderFilter) ([]*RechargeOrder, error) {
	var orders []*RechargeOrder
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM recharge_orders"

	// Build WHERE conditions
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ",")))
	}

	if filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, filter.PaymentType)
		argIndex++
	}

	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.PayerName != nil && *filter.PayerName != "" {
		conditions = append(conditions, fmt.Sprintf("payer_name ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.PayerName+"%")
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

	err := r.db.SelectContext(ctx, &orders, query, args...)
	return orders, err
}

// Count returns the count of recharge orders matching the filter
func (r *rechargeOrderRepository) Count(ctx context.Context, filter *RechargeOrderFilter) (int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM recharge_orders"

	// Build WHERE conditions (same as List)
	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ",")))
	}

	if filter.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, filter.PaymentType)
		argIndex++
	}

	if filter.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
		argIndex++
	}

	if filter.PayerName != nil && *filter.PayerName != "" {
		conditions = append(conditions, fmt.Sprintf("payer_name ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.PayerName+"%")
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

// GetByStatus retrieves recharge orders by status
func (r *rechargeOrderRepository) GetByStatus(ctx context.Context, status string) ([]*RechargeOrder, error) {
	var orders []*RechargeOrder
	query := `
		SELECT * FROM recharge_orders 
		WHERE status = $1 
		ORDER BY created_at ASC`

	err := r.db.SelectContext(ctx, &orders, query, status)
	return orders, err
}

// Enhanced methods for recharge testing system

// UpdateStatus updates the status of a recharge order with optional notes
func (r *rechargeOrderRepository) UpdateStatus(ctx context.Context, orderID uuid.UUID, status string, notes *string) error {
	query := `
		UPDATE recharge_orders 
		SET status = $1, processing_notes = $2, updated_at = NOW()
		WHERE id = $3`

	// Set completed_at if status is completed
	if status == "completed" {
		query = `
			UPDATE recharge_orders 
			SET status = $1, processing_notes = $2, completed_at = NOW(), updated_at = NOW()
			WHERE id = $3`
	}

	result, err := r.db.ExecContext(ctx, query, status, notes, orderID)
	if err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("recharge order with id %s not found", orderID)
	}

	return nil
}

// UpdatePaymentProof updates the payment proof for a recharge order
func (r *rechargeOrderRepository) UpdatePaymentProof(ctx context.Context, orderID uuid.UUID, paymentProof string) error {
	query := `
		UPDATE recharge_orders 
		SET payment_proof = $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, paymentProof, orderID)
	if err != nil {
		return fmt.Errorf("failed to update payment proof: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("recharge order with id %s not found", orderID)
	}

	return nil
}

// GetOrdersForExport retrieves orders for data export based on filter criteria
func (r *rechargeOrderRepository) GetOrdersForExport(ctx context.Context, filter *DataExportRequest) ([]*RechargeOrder, error) {
	var orders []*RechargeOrder
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := `
		SELECT ro.*, m.name as merchant_name, ra.account_name, ra.account_number
		FROM recharge_orders ro
		LEFT JOIN merchants m ON ro.merchant_id = m.id
		LEFT JOIN receive_accounts ra ON ro.receive_account_id = ra.id`

	// Build WHERE conditions
	conditions = append(conditions, fmt.Sprintf("ro.created_at >= $%d", argIndex))
	args = append(args, filter.StartDate)
	argIndex++

	conditions = append(conditions, fmt.Sprintf("ro.created_at <= $%d", argIndex))
	args = append(args, filter.EndDate)
	argIndex++

	if len(filter.MerchantIDs) > 0 {
		placeholders := make([]string, len(filter.MerchantIDs))
		for i, merchantID := range filter.MerchantIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, merchantID)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("ro.merchant_id IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filter.Status) > 0 {
		placeholders := make([]string, len(filter.Status))
		for i, status := range filter.Status {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("ro.status IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY ro.created_at ASC"

	err := r.db.SelectContext(ctx, &orders, query, args...)
	return orders, err
}

// GetDailySummary retrieves daily summary statistics for orders
func (r *rechargeOrderRepository) GetDailySummary(ctx context.Context, date time.Time, merchantID *uuid.UUID) (*DailySummary, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := `
		SELECT 
			DATE($1) as date,
			COUNT(*) as total_orders,
			COALESCE(SUM(amount), 0) as total_amount,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
			COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
			COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
			COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) as cancelled_amount,
			COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_orders,
			COALESCE(SUM(CASE WHEN status = 'expired' THEN amount ELSE 0 END), 0) as expired_amount
		FROM recharge_orders`

	args = append(args, date)
	conditions = append(conditions, fmt.Sprintf("DATE(created_at) = DATE($%d)", argIndex))
	argIndex++

	if merchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *merchantID)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	var summary DailySummary
	err := r.db.GetContext(ctx, &summary, query, args...)
	if err != nil {
		return nil, err
	}

	summary.MerchantID = merchantID
	return &summary, nil
}

// GetOrdersByDateRange retrieves orders within a date range
func (r *rechargeOrderRepository) GetOrdersByDateRange(ctx context.Context, startDate, endDate time.Time, merchantID *uuid.UUID) ([]*RechargeOrder, error) {
	var orders []*RechargeOrder
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM recharge_orders"

	conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
	args = append(args, startDate)
	argIndex++

	conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
	args = append(args, endDate)
	argIndex++

	if merchantID != nil {
		conditions = append(conditions, fmt.Sprintf("merchant_id = $%d", argIndex))
		args = append(args, *merchantID)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY created_at ASC"

	err := r.db.SelectContext(ctx, &orders, query, args...)
	return orders, err
}

// MarkAsExpired marks orders as expired if they are past their expiration time
func (r *rechargeOrderRepository) MarkAsExpired(ctx context.Context, expiredBefore time.Time) error {
	query := `
		UPDATE recharge_orders 
		SET status = 'expired', updated_at = NOW()
		WHERE status IN ('pending', 'paid') 
		  AND expired_at IS NOT NULL 
		  AND expired_at <= $1`

	result, err := r.db.ExecContext(ctx, query, expiredBefore)
	if err != nil {
		return fmt.Errorf("failed to mark orders as expired: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	// Log the number of expired orders (optional)
	_ = rowsAffected

	return nil
}

// NewRechargeOrderRepositoryWithCache creates a new cached recharge order repository
func NewRechargeOrderRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) RechargeOrderRepository {
	// TODO: Implement cached version properly
	return NewRechargeOrderRepository(db)
}

// cachedRechargeOrderRepository implements RechargeOrderRepository interface with caching
type cachedRechargeOrderRepository struct {
	*CachedBaseRepository
}

// GetByOrderNumber retrieves a recharge order by order number with caching
func (r *cachedRechargeOrderRepository) GetByOrderNumber(ctx context.Context, orderNumber string) (*RechargeOrder, error) {
	cacheKey := fmt.Sprintf("recharge_order:number:%s", orderNumber)
	
	var order RechargeOrder
	query := "SELECT * FROM recharge_orders WHERE order_number = $1"
	
	err := r.GetWithCache(ctx, &order, cacheKey, cache.MediumExpiration, query, orderNumber)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// UpdateStatus updates order status with cache invalidation
func (r *cachedRechargeOrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedBy *uuid.UUID) error {
	query := `
		UPDATE recharge_orders 
		SET status = $1, updated_at = NOW(), updated_by = $2
		WHERE id = $3`

	result, err := r.db.ExecContext(ctx, query, status, updatedBy, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("recharge order with id %s not found", id)
	}

	// Invalidate recharge order cache and related reports
	r.invalidator.InvalidateRechargeOrder(id.String())

	return nil
}
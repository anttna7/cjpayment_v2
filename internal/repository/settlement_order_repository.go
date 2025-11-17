package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
)

// SettlementOrderRepository 结算订单数据访问接口
type SettlementOrderRepository interface {
	Create(ctx context.Context, order *SettlementOrder) error
	Update(ctx context.Context, order *SettlementOrder) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*SettlementOrder, error)
	GetByOrderNumber(ctx context.Context, orderNumber string) (*SettlementOrder, error)
	List(ctx context.Context, filter SettlementOrderFilter) ([]*SettlementOrder, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedBy uuid.UUID) error
	Approve(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error
	Reject(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error
	Settle(ctx context.Context, id uuid.UUID, settlerID uuid.UUID, notes string) error
	GetByCustomerID(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]*SettlementOrder, int, error)
	GetPendingOrders(ctx context.Context, tenantID uuid.UUID) ([]*SettlementOrder, error)
}

// SettlementOrderFilter 结算订单过滤器
type SettlementOrderFilter struct {
	TenantID    *uuid.UUID
	CustomerID  *uuid.UUID
	Status      *string
	StartDate   *time.Time
	EndDate     *time.Time
	MinAmount   *decimal.Decimal
	MaxAmount   *decimal.Decimal
	Limit       int
	Offset      int
}

type settlementOrderRepository struct {
	db *sqlx.DB
}

// NewSettlementOrderRepository 创建结算订单仓库实例
func NewSettlementOrderRepository(db *sqlx.DB) SettlementOrderRepository {
	return &settlementOrderRepository{db: db}
}

func (r *settlementOrderRepository) Create(ctx context.Context, order *SettlementOrder) error {
	query := `
		INSERT INTO settlement_orders (
			id, tenant_id, customer_id, order_number,
			settlement_period_start, settlement_period_end,
			total_amount, settled_amount, outstanding_amount,
			related_recharge_orders, status,
			reviewer_id, reviewed_at, review_notes,
			settler_id, settled_at, settlement_notes,
			attachment_url, attachment_name, notes,
			created_at, updated_at, created_by
		) VALUES (
			:id, :tenant_id, :customer_id, :order_number,
			:settlement_period_start, :settlement_period_end,
			:total_amount, :settled_amount, :outstanding_amount,
			:related_recharge_orders, :status,
			:reviewer_id, :reviewed_at, :review_notes,
			:settler_id, :settled_at, :settlement_notes,
			:attachment_url, :attachment_name, :notes,
			:created_at, :updated_at, :created_by
		)
	`

	if order.ID == uuid.Nil {
		order.ID = uuid.New()
	}

	now := time.Now()
	order.CreatedAt = now
	order.UpdatedAt = now

	_, err := r.db.NamedExecContext(ctx, query, order)
	return err
}

func (r *settlementOrderRepository) Update(ctx context.Context, order *SettlementOrder) error {
	query := `
		UPDATE settlement_orders SET
			settlement_period_start = :settlement_period_start,
			settlement_period_end = :settlement_period_end,
			total_amount = :total_amount,
			settled_amount = :settled_amount,
			outstanding_amount = :outstanding_amount,
			related_recharge_orders = :related_recharge_orders,
			status = :status,
			attachment_url = :attachment_url,
			attachment_name = :attachment_name,
			notes = :notes,
			updated_at = :updated_at
		WHERE id = :id
	`

	order.UpdatedAt = time.Now()

	result, err := r.db.NamedExecContext(ctx, query, order)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *settlementOrderRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM settlement_orders WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *settlementOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*SettlementOrder, error) {
	query := `SELECT * FROM settlement_orders WHERE id = $1`

	var order SettlementOrder
	err := r.db.GetContext(ctx, &order, query, id)
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *settlementOrderRepository) GetByOrderNumber(ctx context.Context, orderNumber string) (*SettlementOrder, error) {
	query := `SELECT * FROM settlement_orders WHERE order_number = $1`

	var order SettlementOrder
	err := r.db.GetContext(ctx, &order, query, orderNumber)
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *settlementOrderRepository) List(ctx context.Context, filter SettlementOrderFilter) ([]*SettlementOrder, int, error) {
	// 构建查询条件
	conditions := []string{"1=1"}
	args := make(map[string]interface{})

	if filter.TenantID != nil {
		conditions = append(conditions, "tenant_id = :tenant_id")
		args["tenant_id"] = *filter.TenantID
	}

	if filter.CustomerID != nil {
		conditions = append(conditions, "customer_id = :customer_id")
		args["customer_id"] = *filter.CustomerID
	}

	if filter.Status != nil {
		conditions = append(conditions, "status = :status")
		args["status"] = *filter.Status
	}

	if filter.StartDate != nil {
		conditions = append(conditions, "settlement_period_start >= :start_date")
		args["start_date"] = *filter.StartDate
	}

	if filter.EndDate != nil {
		conditions = append(conditions, "settlement_period_end <= :end_date")
		args["end_date"] = *filter.EndDate
	}

	if filter.MinAmount != nil {
		conditions = append(conditions, "total_amount >= :min_amount")
		args["min_amount"] = *filter.MinAmount
	}

	if filter.MaxAmount != nil {
		conditions = append(conditions, "total_amount <= :max_amount")
		args["max_amount"] = *filter.MaxAmount
	}

	whereClause := ""
	for i, cond := range conditions {
		if i == 0 {
			whereClause = "WHERE " + cond
		} else {
			whereClause += " AND " + cond
		}
	}

	// 获取总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM settlement_orders %s", whereClause)
	var total int
	countStmt, err := r.db.PrepareNamedContext(ctx, countQuery)
	if err != nil {
		return nil, 0, err
	}
	defer countStmt.Close()

	err = countStmt.GetContext(ctx, &total, args)
	if err != nil {
		return nil, 0, err
	}

	// 获取数据
	args["limit"] = filter.Limit
	args["offset"] = filter.Offset

	dataQuery := fmt.Sprintf(`
		SELECT * FROM settlement_orders %s
		ORDER BY created_at DESC
		LIMIT :limit OFFSET :offset
	`, whereClause)

	dataStmt, err := r.db.PrepareNamedContext(ctx, dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer dataStmt.Close()

	var orders []*SettlementOrder
	err = dataStmt.SelectContext(ctx, &orders, args)
	if err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *settlementOrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedBy uuid.UUID) error {
	query := `
		UPDATE settlement_orders
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, status, time.Now(), id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *settlementOrderRepository) Approve(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error {
	query := `
		UPDATE settlement_orders
		SET status = 'approved',
		    reviewer_id = $1,
		    review_notes = $2,
		    reviewed_at = $3,
		    updated_at = $4
		WHERE id = $5 AND status = 'reviewing'
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, reviewerID, notes, now, now, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("settlement order not found or not in reviewing status")
	}

	return nil
}

func (r *settlementOrderRepository) Reject(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error {
	query := `
		UPDATE settlement_orders
		SET status = 'rejected',
		    reviewer_id = $1,
		    review_notes = $2,
		    reviewed_at = $3,
		    updated_at = $4
		WHERE id = $5 AND status = 'reviewing'
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, reviewerID, notes, now, now, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("settlement order not found or not in reviewing status")
	}

	return nil
}

func (r *settlementOrderRepository) Settle(ctx context.Context, id uuid.UUID, settlerID uuid.UUID, notes string) error {
	query := `
		UPDATE settlement_orders
		SET status = 'settled',
		    settler_id = $1,
		    settlement_notes = $2,
		    settled_at = $3,
		    updated_at = $4
		WHERE id = $5 AND status = 'approved'
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, settlerID, notes, now, now, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("settlement order not found or not in approved status")
	}

	return nil
}

func (r *settlementOrderRepository) GetByCustomerID(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]*SettlementOrder, int, error) {
	countQuery := `SELECT COUNT(*) FROM settlement_orders WHERE customer_id = $1`
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, customerID)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT * FROM settlement_orders
		WHERE customer_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	var orders []*SettlementOrder
	err = r.db.SelectContext(ctx, &orders, dataQuery, customerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *settlementOrderRepository) GetPendingOrders(ctx context.Context, tenantID uuid.UUID) ([]*SettlementOrder, error) {
	query := `
		SELECT * FROM settlement_orders
		WHERE tenant_id = $1 AND status IN ('pending', 'reviewing')
		ORDER BY created_at ASC
	`

	var orders []*SettlementOrder
	err := r.db.SelectContext(ctx, &orders, query, tenantID)
	if err != nil {
		return nil, err
	}

	return orders, nil
}

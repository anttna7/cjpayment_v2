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

// InvoiceRepository 发票数据访问接口
type InvoiceRepository interface {
	Create(ctx context.Context, invoice *Invoice) error
	Update(ctx context.Context, invoice *Invoice) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*Invoice, error)
	GetByInvoiceNumber(ctx context.Context, invoiceNumber string) (*Invoice, error)
	List(ctx context.Context, filter InvoiceFilter) ([]*Invoice, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedBy uuid.UUID) error
	GetByCustomerID(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]*Invoice, int, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Invoice, int, error)
	GetPendingInvoices(ctx context.Context, tenantID uuid.UUID) ([]*Invoice, error)
	IssueInvoice(ctx context.Context, id uuid.UUID, issuerID uuid.UUID, fileURL, fileName string, fileSize int64) error
}

// InvoiceFilter 发票过滤器
type InvoiceFilter struct {
	TenantID      *uuid.UUID
	CustomerID    *uuid.UUID
	Status        *string
	InvoiceType   *string
	StartDate     *time.Time
	EndDate       *time.Time
	MinAmount     *decimal.Decimal
	MaxAmount     *decimal.Decimal
	Limit         int
	Offset        int
}

type invoiceRepository struct {
	db *sqlx.DB
}

// NewInvoiceRepository 创建发票仓库实例
func NewInvoiceRepository(db *sqlx.DB) InvoiceRepository {
	return &invoiceRepository{db: db}
}

func (r *invoiceRepository) Create(ctx context.Context, invoice *Invoice) error {
	query := `
		INSERT INTO invoices (
			id, tenant_id, customer_id, invoice_number, order_id,
			invoice_type, invoice_title, tax_number,
			amount, tax_amount, total_amount, status,
			file_url, file_name, file_size,
			applicant_id, issuer_id,
			recipient_name, recipient_phone, recipient_address,
			notes, applied_at, issued_at, sent_at, confirmed_at,
			created_at, updated_at
		) VALUES (
			:id, :tenant_id, :customer_id, :invoice_number, :order_id,
			:invoice_type, :invoice_title, :tax_number,
			:amount, :tax_amount, :total_amount, :status,
			:file_url, :file_name, :file_size,
			:applicant_id, :issuer_id,
			:recipient_name, :recipient_phone, :recipient_address,
			:notes, :applied_at, :issued_at, :sent_at, :confirmed_at,
			:created_at, :updated_at
		)
	`

	if invoice.ID == uuid.Nil {
		invoice.ID = uuid.New()
	}

	now := time.Now()
	invoice.CreatedAt = now
	invoice.UpdatedAt = now
	invoice.AppliedAt = now

	_, err := r.db.NamedExecContext(ctx, query, invoice)
	return err
}

func (r *invoiceRepository) Update(ctx context.Context, invoice *Invoice) error {
	query := `
		UPDATE invoices SET
			invoice_type = :invoice_type,
			invoice_title = :invoice_title,
			tax_number = :tax_number,
			amount = :amount,
			tax_amount = :tax_amount,
			total_amount = :total_amount,
			status = :status,
			file_url = :file_url,
			file_name = :file_name,
			file_size = :file_size,
			recipient_name = :recipient_name,
			recipient_phone = :recipient_phone,
			recipient_address = :recipient_address,
			notes = :notes,
			updated_at = :updated_at
		WHERE id = :id
	`

	invoice.UpdatedAt = time.Now()

	result, err := r.db.NamedExecContext(ctx, query, invoice)
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

func (r *invoiceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM invoices WHERE id = $1`

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

func (r *invoiceRepository) GetByID(ctx context.Context, id uuid.UUID) (*Invoice, error) {
	query := `SELECT * FROM invoices WHERE id = $1`

	var invoice Invoice
	err := r.db.GetContext(ctx, &invoice, query, id)
	if err != nil {
		return nil, err
	}

	return &invoice, nil
}

func (r *invoiceRepository) GetByInvoiceNumber(ctx context.Context, invoiceNumber string) (*Invoice, error) {
	query := `SELECT * FROM invoices WHERE invoice_number = $1`

	var invoice Invoice
	err := r.db.GetContext(ctx, &invoice, query, invoiceNumber)
	if err != nil {
		return nil, err
	}

	return &invoice, nil
}

func (r *invoiceRepository) List(ctx context.Context, filter InvoiceFilter) ([]*Invoice, int, error) {
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

	if filter.InvoiceType != nil {
		conditions = append(conditions, "invoice_type = :invoice_type")
		args["invoice_type"] = *filter.InvoiceType
	}

	if filter.StartDate != nil {
		conditions = append(conditions, "applied_at >= :start_date")
		args["start_date"] = *filter.StartDate
	}

	if filter.EndDate != nil {
		conditions = append(conditions, "applied_at <= :end_date")
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
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM invoices %s", whereClause)
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
		SELECT * FROM invoices %s
		ORDER BY created_at DESC
		LIMIT :limit OFFSET :offset
	`, whereClause)

	dataStmt, err := r.db.PrepareNamedContext(ctx, dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer dataStmt.Close()

	var invoices []*Invoice
	err = dataStmt.SelectContext(ctx, &invoices, args)
	if err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

func (r *invoiceRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, updatedBy uuid.UUID) error {
	query := `
		UPDATE invoices
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

func (r *invoiceRepository) GetByCustomerID(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]*Invoice, int, error) {
	countQuery := `SELECT COUNT(*) FROM invoices WHERE customer_id = $1`
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, customerID)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT * FROM invoices
		WHERE customer_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	var invoices []*Invoice
	err = r.db.SelectContext(ctx, &invoices, dataQuery, customerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

func (r *invoiceRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Invoice, int, error) {
	countQuery := `SELECT COUNT(*) FROM invoices WHERE tenant_id = $1`
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, tenantID)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT * FROM invoices
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	var invoices []*Invoice
	err = r.db.SelectContext(ctx, &invoices, dataQuery, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

func (r *invoiceRepository) GetPendingInvoices(ctx context.Context, tenantID uuid.UUID) ([]*Invoice, error) {
	query := `
		SELECT * FROM invoices
		WHERE tenant_id = $1 AND status = 'pending'
		ORDER BY applied_at ASC
	`

	var invoices []*Invoice
	err := r.db.SelectContext(ctx, &invoices, query, tenantID)
	if err != nil {
		return nil, err
	}

	return invoices, nil
}

func (r *invoiceRepository) IssueInvoice(ctx context.Context, id uuid.UUID, issuerID uuid.UUID, fileURL, fileName string, fileSize int64) error {
	query := `
		UPDATE invoices
		SET status = 'issued',
		    issuer_id = $1,
		    file_url = $2,
		    file_name = $3,
		    file_size = $4,
		    issued_at = $5,
		    updated_at = $6
		WHERE id = $7 AND status = 'pending'
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, issuerID, fileURL, fileName, fileSize, now, now, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("invoice not found or not in pending status")
	}

	return nil
}

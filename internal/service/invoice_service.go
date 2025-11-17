package service

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// InvoiceService 发票服务接口
type InvoiceService interface {
	CreateInvoice(ctx context.Context, req CreateInvoiceRequest) (*repository.Invoice, error)
	UpdateInvoice(ctx context.Context, id uuid.UUID, req UpdateInvoiceRequest) error
	DeleteInvoice(ctx context.Context, id uuid.UUID) error
	GetInvoiceByID(ctx context.Context, id uuid.UUID) (*repository.Invoice, error)
	ListInvoices(ctx context.Context, filter InvoiceListFilter) ([]*repository.Invoice, int, error)
	IssueInvoice(ctx context.Context, req IssueInvoiceRequest) error
	SendInvoice(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	ConfirmInvoice(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	CancelInvoice(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	GetCustomerInvoices(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]*repository.Invoice, int, error)
	GetPendingInvoices(ctx context.Context, tenantID uuid.UUID) ([]*repository.Invoice, error)
	GenerateInvoiceNumber(ctx context.Context, tenantID uuid.UUID) (string, error)
}

// CreateInvoiceRequest 创建发票请求
type CreateInvoiceRequest struct {
	TenantID         uuid.UUID       `json:"tenant_id"`
	CustomerID       uuid.UUID       `json:"customer_id"`
	OrderID          *uuid.UUID      `json:"order_id"`
	InvoiceType      string          `json:"invoice_type"`
	InvoiceTitle     string          `json:"invoice_title"`
	TaxNumber        string          `json:"tax_number"`
	Amount           decimal.Decimal `json:"amount"`
	TaxAmount        decimal.Decimal `json:"tax_amount"`
	RecipientName    *string         `json:"recipient_name"`
	RecipientPhone   *string         `json:"recipient_phone"`
	RecipientAddress *string         `json:"recipient_address"`
	Notes            *string         `json:"notes"`
	ApplicantID      uuid.UUID       `json:"applicant_id"`
}

// UpdateInvoiceRequest 更新发票请求
type UpdateInvoiceRequest struct {
	InvoiceType      *string          `json:"invoice_type"`
	InvoiceTitle     *string          `json:"invoice_title"`
	TaxNumber        *string          `json:"tax_number"`
	Amount           *decimal.Decimal `json:"amount"`
	TaxAmount        *decimal.Decimal `json:"tax_amount"`
	RecipientName    *string          `json:"recipient_name"`
	RecipientPhone   *string          `json:"recipient_phone"`
	RecipientAddress *string          `json:"recipient_address"`
	Notes            *string          `json:"notes"`
}

// IssueInvoiceRequest 开具发票请求
type IssueInvoiceRequest struct {
	InvoiceID uuid.UUID `json:"invoice_id"`
	IssuerID  uuid.UUID `json:"issuer_id"`
	FileURL   string    `json:"file_url"`
	FileName  string    `json:"file_name"`
	FileSize  int64     `json:"file_size"`
}

// InvoiceListFilter 发票列表过滤器
type InvoiceListFilter struct {
	TenantID    *uuid.UUID       `json:"tenant_id"`
	CustomerID  *uuid.UUID       `json:"customer_id"`
	Status      *string          `json:"status"`
	InvoiceType *string          `json:"invoice_type"`
	StartDate   *time.Time       `json:"start_date"`
	EndDate     *time.Time       `json:"end_date"`
	MinAmount   *decimal.Decimal `json:"min_amount"`
	MaxAmount   *decimal.Decimal `json:"max_amount"`
	Page        int              `json:"page"`
	PageSize    int              `json:"page_size"`
}

type invoiceService struct {
	invoiceRepo repository.InvoiceRepository
}

// NewInvoiceService 创建发票服务实例
func NewInvoiceService(invoiceRepo repository.InvoiceRepository) InvoiceService {
	return &invoiceService{
		invoiceRepo: invoiceRepo,
	}
}

func (s *invoiceService) CreateInvoice(ctx context.Context, req CreateInvoiceRequest) (*repository.Invoice, error) {
	// 生成发票号
	invoiceNumber, err := s.GenerateInvoiceNumber(ctx, req.TenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate invoice number: %w", err)
	}

	// 计算总金额
	totalAmount := req.Amount.Add(req.TaxAmount)

	invoice := &repository.Invoice{
		TenantID:         req.TenantID,
		CustomerID:       req.CustomerID,
		InvoiceNumber:    invoiceNumber,
		OrderID:          req.OrderID,
		InvoiceType:      req.InvoiceType,
		InvoiceTitle:     req.InvoiceTitle,
		TaxNumber:        req.TaxNumber,
		Amount:           req.Amount,
		TaxAmount:        req.TaxAmount,
		TotalAmount:      totalAmount,
		Status:           "pending",
		RecipientName:    req.RecipientName,
		RecipientPhone:   req.RecipientPhone,
		RecipientAddress: req.RecipientAddress,
		Notes:            req.Notes,
		ApplicantID:      &req.ApplicantID,
	}

	err = s.invoiceRepo.Create(ctx, invoice)
	if err != nil {
		return nil, fmt.Errorf("failed to create invoice: %w", err)
	}

	return invoice, nil
}

func (s *invoiceService) UpdateInvoice(ctx context.Context, id uuid.UUID, req UpdateInvoiceRequest) error {
	// 获取现有发票
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get invoice: %w", err)
	}

	// 只能更新pending状态的发票
	if invoice.Status != "pending" {
		return fmt.Errorf("cannot update invoice with status: %s", invoice.Status)
	}

	// 更新字段
	if req.InvoiceType != nil {
		invoice.InvoiceType = *req.InvoiceType
	}
	if req.InvoiceTitle != nil {
		invoice.InvoiceTitle = *req.InvoiceTitle
	}
	if req.TaxNumber != nil {
		invoice.TaxNumber = *req.TaxNumber
	}
	if req.Amount != nil {
		invoice.Amount = *req.Amount
	}
	if req.TaxAmount != nil {
		invoice.TaxAmount = *req.TaxAmount
	}
	if req.Amount != nil || req.TaxAmount != nil {
		invoice.TotalAmount = invoice.Amount.Add(invoice.TaxAmount)
	}
	if req.RecipientName != nil {
		invoice.RecipientName = req.RecipientName
	}
	if req.RecipientPhone != nil {
		invoice.RecipientPhone = req.RecipientPhone
	}
	if req.RecipientAddress != nil {
		invoice.RecipientAddress = req.RecipientAddress
	}
	if req.Notes != nil {
		invoice.Notes = req.Notes
	}

	err = s.invoiceRepo.Update(ctx, invoice)
	if err != nil {
		return fmt.Errorf("failed to update invoice: %w", err)
	}

	return nil
}

func (s *invoiceService) DeleteInvoice(ctx context.Context, id uuid.UUID) error {
	// 获取现有发票
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get invoice: %w", err)
	}

	// 只能删除pending状态的发票
	if invoice.Status != "pending" {
		return fmt.Errorf("cannot delete invoice with status: %s", invoice.Status)
	}

	err = s.invoiceRepo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete invoice: %w", err)
	}

	return nil
}

func (s *invoiceService) GetInvoiceByID(ctx context.Context, id uuid.UUID) (*repository.Invoice, error) {
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invoice not found")
		}
		return nil, fmt.Errorf("failed to get invoice: %w", err)
	}

	return invoice, nil
}

func (s *invoiceService) ListInvoices(ctx context.Context, filter InvoiceListFilter) ([]*repository.Invoice, int, error) {
	// 设置默认分页
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	offset := (filter.Page - 1) * filter.PageSize

	repoFilter := repository.InvoiceFilter{
		TenantID:    filter.TenantID,
		CustomerID:  filter.CustomerID,
		Status:      filter.Status,
		InvoiceType: filter.InvoiceType,
		StartDate:   filter.StartDate,
		EndDate:     filter.EndDate,
		MinAmount:   filter.MinAmount,
		MaxAmount:   filter.MaxAmount,
		Limit:       filter.PageSize,
		Offset:      offset,
	}

	invoices, total, err := s.invoiceRepo.List(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list invoices: %w", err)
	}

	return invoices, total, nil
}

func (s *invoiceService) IssueInvoice(ctx context.Context, req IssueInvoiceRequest) error {
	err := s.invoiceRepo.IssueInvoice(ctx, req.InvoiceID, req.IssuerID, req.FileURL, req.FileName, req.FileSize)
	if err != nil {
		return fmt.Errorf("failed to issue invoice: %w", err)
	}

	return nil
}

func (s *invoiceService) SendInvoice(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// 获取发票
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get invoice: %w", err)
	}

	// 只能发送已开具的发票
	if invoice.Status != "issued" {
		return fmt.Errorf("can only send issued invoices")
	}

	err = s.invoiceRepo.UpdateStatus(ctx, id, "sent", userID)
	if err != nil {
		return fmt.Errorf("failed to update invoice status: %w", err)
	}

	return nil
}

func (s *invoiceService) ConfirmInvoice(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// 获取发票
	invoice, err := s.invoiceRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get invoice: %w", err)
	}

	// 只能确认已发送的发票
	if invoice.Status != "sent" {
		return fmt.Errorf("can only confirm sent invoices")
	}

	err = s.invoiceRepo.UpdateStatus(ctx, id, "confirmed", userID)
	if err != nil {
		return fmt.Errorf("failed to update invoice status: %w", err)
	}

	return nil
}

func (s *invoiceService) CancelInvoice(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	err = s.invoiceRepo.UpdateStatus(ctx, id, "cancelled", userID)
	if err != nil {
		return fmt.Errorf("failed to cancel invoice: %w", err)
	}

	return nil
}

func (s *invoiceService) GetCustomerInvoices(ctx context.Context, customerID uuid.UUID, limit, offset int) ([]*repository.Invoice, int, error) {
	if limit <= 0 {
		limit = 20
	}

	invoices, total, err := s.invoiceRepo.GetByCustomerID(ctx, customerID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get customer invoices: %w", err)
	}

	return invoices, total, nil
}

func (s *invoiceService) GetPendingInvoices(ctx context.Context, tenantID uuid.UUID) ([]*repository.Invoice, error) {
	invoices, err := s.invoiceRepo.GetPendingInvoices(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending invoices: %w", err)
	}

	return invoices, nil
}

func (s *invoiceService) GenerateInvoiceNumber(ctx context.Context, tenantID uuid.UUID) (string, error) {
	// 生成发票号格式: INV-{YYYYMMDD}-{6位随机数}
	now := time.Now()
	dateStr := now.Format("20060102")
	randomID := uuid.New().String()[:6]

	invoiceNumber := fmt.Sprintf("INV-%s-%s", dateStr, randomID)

	// 检查是否已存在
	_, err := s.invoiceRepo.GetByInvoiceNumber(ctx, invoiceNumber)
	if err == nil {
		// 已存在，递归重新生成
		return s.GenerateInvoiceNumber(ctx, tenantID)
	}
	if err != sql.ErrNoRows {
		return "", fmt.Errorf("failed to check invoice number: %w", err)
	}

	return invoiceNumber, nil
}

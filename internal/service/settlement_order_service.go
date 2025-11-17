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

// SettlementOrderService 结算订单服务接口
type SettlementOrderService interface {
	CreateSettlementOrder(ctx context.Context, req CreateSettlementOrderRequest) (*repository.SettlementOrder, error)
	UpdateSettlementOrder(ctx context.Context, id uuid.UUID, req UpdateSettlementOrderRequest) error
	DeleteSettlementOrder(ctx context.Context, id uuid.UUID) error
	GetSettlementOrderByID(ctx context.Context, id uuid.UUID) (*repository.SettlementOrder, error)
	ListSettlementOrders(ctx context.Context, filter SettlementOrderListFilter) ([]*repository.SettlementOrder, int, error)
	SubmitForReview(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	ApproveOrder(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error
	RejectOrder(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error
	SettleOrder(ctx context.Context, id uuid.UUID, settlerID uuid.UUID, notes string) error
	GetPendingOrders(ctx context.Context, tenantID uuid.UUID) ([]*repository.SettlementOrder, error)
	GenerateOrderNumber(ctx context.Context, tenantID uuid.UUID) (string, error)
}

// CreateSettlementOrderRequest 创建结算订单请求
type CreateSettlementOrderRequest struct {
	TenantID              uuid.UUID       `json:"tenant_id"`
	CustomerID            uuid.UUID       `json:"customer_id"`
	SettlementPeriodStart time.Time       `json:"settlement_period_start"`
	SettlementPeriodEnd   time.Time       `json:"settlement_period_end"`
	TotalAmount           decimal.Decimal `json:"total_amount"`
	RelatedRechargeOrders []uuid.UUID     `json:"related_recharge_orders"`
	Notes                 *string         `json:"notes"`
	CreatedBy             uuid.UUID       `json:"created_by"`
}

// UpdateSettlementOrderRequest 更新结算订单请求
type UpdateSettlementOrderRequest struct {
	SettlementPeriodStart *time.Time       `json:"settlement_period_start"`
	SettlementPeriodEnd   *time.Time       `json:"settlement_period_end"`
	TotalAmount           *decimal.Decimal `json:"total_amount"`
	RelatedRechargeOrders *[]uuid.UUID     `json:"related_recharge_orders"`
	Notes                 *string          `json:"notes"`
}

// SettlementOrderListFilter 结算订单列表过滤器
type SettlementOrderListFilter struct {
	TenantID   *uuid.UUID       `json:"tenant_id"`
	CustomerID *uuid.UUID       `json:"customer_id"`
	Status     *string          `json:"status"`
	StartDate  *time.Time       `json:"start_date"`
	EndDate    *time.Time       `json:"end_date"`
	MinAmount  *decimal.Decimal `json:"min_amount"`
	MaxAmount  *decimal.Decimal `json:"max_amount"`
	Page       int              `json:"page"`
	PageSize   int              `json:"page_size"`
}

type settlementOrderService struct {
	settlementRepo repository.SettlementOrderRepository
}

// NewSettlementOrderService 创建结算订单服务实例
func NewSettlementOrderService(settlementRepo repository.SettlementOrderRepository) SettlementOrderService {
	return &settlementOrderService{
		settlementRepo: settlementRepo,
	}
}

func (s *settlementOrderService) CreateSettlementOrder(ctx context.Context, req CreateSettlementOrderRequest) (*repository.SettlementOrder, error) {
	// 验证日期范围
	if req.SettlementPeriodEnd.Before(req.SettlementPeriodStart) {
		return nil, fmt.Errorf("settlement period end must be after start")
	}

	// 生成结算单号
	orderNumber, err := s.GenerateOrderNumber(ctx, req.TenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate order number: %w", err)
	}

	order := &repository.SettlementOrder{
		TenantID:              req.TenantID,
		CustomerID:            req.CustomerID,
		OrderNumber:           orderNumber,
		SettlementPeriodStart: req.SettlementPeriodStart,
		SettlementPeriodEnd:   req.SettlementPeriodEnd,
		TotalAmount:           req.TotalAmount,
		SettledAmount:         decimal.Zero,
		OutstandingAmount:     req.TotalAmount,
		RelatedRechargeOrders: repository.JSONBArray(req.RelatedRechargeOrders),
		Status:                "pending",
		Notes:                 req.Notes,
		CreatedBy:             &req.CreatedBy,
	}

	err = s.settlementRepo.Create(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to create settlement order: %w", err)
	}

	return order, nil
}

func (s *settlementOrderService) UpdateSettlementOrder(ctx context.Context, id uuid.UUID, req UpdateSettlementOrderRequest) error {
	// 获取现有订单
	order, err := s.settlementRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get settlement order: %w", err)
	}

	// 只能更新pending状态的订单
	if order.Status != "pending" {
		return fmt.Errorf("cannot update settlement order with status: %s", order.Status)
	}

	// 更新字段
	if req.SettlementPeriodStart != nil {
		order.SettlementPeriodStart = *req.SettlementPeriodStart
	}
	if req.SettlementPeriodEnd != nil {
		order.SettlementPeriodEnd = *req.SettlementPeriodEnd
	}
	if req.TotalAmount != nil {
		order.TotalAmount = *req.TotalAmount
		order.OutstandingAmount = req.TotalAmount.Sub(order.SettledAmount)
	}
	if req.RelatedRechargeOrders != nil {
		order.RelatedRechargeOrders = repository.JSONBArray(*req.RelatedRechargeOrders)
	}
	if req.Notes != nil {
		order.Notes = req.Notes
	}

	// 验证日期范围
	if order.SettlementPeriodEnd.Before(order.SettlementPeriodStart) {
		return fmt.Errorf("settlement period end must be after start")
	}

	err = s.settlementRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to update settlement order: %w", err)
	}

	return nil
}

func (s *settlementOrderService) DeleteSettlementOrder(ctx context.Context, id uuid.UUID) error {
	// 获取现有订单
	order, err := s.settlementRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get settlement order: %w", err)
	}

	// 只能删除pending状态的订单
	if order.Status != "pending" {
		return fmt.Errorf("cannot delete settlement order with status: %s", order.Status)
	}

	err = s.settlementRepo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete settlement order: %w", err)
	}

	return nil
}

func (s *settlementOrderService) GetSettlementOrderByID(ctx context.Context, id uuid.UUID) (*repository.SettlementOrder, error) {
	order, err := s.settlementRepo.GetByID(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("settlement order not found")
		}
		return nil, fmt.Errorf("failed to get settlement order: %w", err)
	}

	return order, nil
}

func (s *settlementOrderService) ListSettlementOrders(ctx context.Context, filter SettlementOrderListFilter) ([]*repository.SettlementOrder, int, error) {
	// 设置默认分页
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	offset := (filter.Page - 1) * filter.PageSize

	repoFilter := repository.SettlementOrderFilter{
		TenantID:   filter.TenantID,
		CustomerID: filter.CustomerID,
		Status:     filter.Status,
		StartDate:  filter.StartDate,
		EndDate:    filter.EndDate,
		MinAmount:  filter.MinAmount,
		MaxAmount:  filter.MaxAmount,
		Limit:      filter.PageSize,
		Offset:     offset,
	}

	orders, total, err := s.settlementRepo.List(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list settlement orders: %w", err)
	}

	return orders, total, nil
}

func (s *settlementOrderService) SubmitForReview(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// 获取订单
	order, err := s.settlementRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get settlement order: %w", err)
	}

	// 只能提交pending状态的订单
	if order.Status != "pending" {
		return fmt.Errorf("can only submit pending orders for review")
	}

	err = s.settlementRepo.UpdateStatus(ctx, id, "reviewing", userID)
	if err != nil {
		return fmt.Errorf("failed to update settlement order status: %w", err)
	}

	return nil
}

func (s *settlementOrderService) ApproveOrder(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error {
	err := s.settlementRepo.Approve(ctx, id, reviewerID, notes)
	if err != nil {
		return fmt.Errorf("failed to approve settlement order: %w", err)
	}

	return nil
}

func (s *settlementOrderService) RejectOrder(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, notes string) error {
	err := s.settlementRepo.Reject(ctx, id, reviewerID, notes)
	if err != nil {
		return fmt.Errorf("failed to reject settlement order: %w", err)
	}

	return nil
}

func (s *settlementOrderService) SettleOrder(ctx context.Context, id uuid.UUID, settlerID uuid.UUID, notes string) error {
	err := s.settlementRepo.Settle(ctx, id, settlerID, notes)
	if err != nil {
		return fmt.Errorf("failed to settle order: %w", err)
	}

	return nil
}

func (s *settlementOrderService) GetPendingOrders(ctx context.Context, tenantID uuid.UUID) ([]*repository.SettlementOrder, error) {
	orders, err := s.settlementRepo.GetPendingOrders(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending orders: %w", err)
	}

	return orders, nil
}

func (s *settlementOrderService) GenerateOrderNumber(ctx context.Context, tenantID uuid.UUID) (string, error) {
	// 生成结算单号格式: ST-{YYYYMMDD}-{6位随机数}
	now := time.Now()
	dateStr := now.Format("20060102")
	randomID := uuid.New().String()[:6]

	orderNumber := fmt.Sprintf("ST-%s-%s", dateStr, randomID)

	// 检查是否已存在
	_, err := s.settlementRepo.GetByOrderNumber(ctx, orderNumber)
	if err == nil {
		// 已存在，递归重新生成
		return s.GenerateOrderNumber(ctx, tenantID)
	}
	if err != sql.ErrNoRows {
		return "", fmt.Errorf("failed to check order number: %w", err)
	}

	return orderNumber, nil
}

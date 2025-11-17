package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// RechargeService defines the recharge order management service interface
type RechargeService interface {
	// Recharge order CRUD operations
	CreateRechargeOrder(ctx context.Context, req *CreateRechargeOrderRequest) (*repository.RechargeOrder, error)
	GetRechargeOrder(ctx context.Context, id uuid.UUID) (*repository.RechargeOrder, error)
	GetRechargeOrderByNumber(ctx context.Context, orderNumber string) (*repository.RechargeOrder, error)
	UpdateRechargeOrder(ctx context.Context, id uuid.UUID, req *UpdateRechargeOrderRequest) (*repository.RechargeOrder, error)
	ListRechargeOrders(ctx context.Context, filter *repository.RechargeOrderFilter) ([]*repository.RechargeOrder, int64, error)
	
	// Enhanced order status management
	UpdateOrderStatus(ctx context.Context, orderID uuid.UUID, status string, reason *string, userID *uuid.UUID) error
	GetOrderStatusHistory(ctx context.Context, orderID uuid.UUID) ([]*repository.OrderStatusLog, error)
	ValidateStatusTransition(ctx context.Context, orderID uuid.UUID, newStatus string) error
	BulkUpdateOrderStatus(ctx context.Context, orderIDs []uuid.UUID, status string, reason *string, userID *uuid.UUID) error
	
	// Payment proof and voucher management
	UploadPaymentProof(ctx context.Context, orderID uuid.UUID, proofURL string, userID *uuid.UUID) error
	GetPaymentProof(ctx context.Context, orderID uuid.UUID) (*PaymentProofInfo, error)
	ReviewPaymentProof(ctx context.Context, orderID uuid.UUID, approved bool, reviewNotes *string, userID *uuid.UUID) error
	
	// Order processing
	ProcessPrivateRecharge(ctx context.Context, orderID uuid.UUID, voucherURL string, userID *uuid.UUID) error
	ProcessPublicRecharge(ctx context.Context, orderID uuid.UUID, userID *uuid.UUID) error
	CancelRecharge(ctx context.Context, orderID uuid.UUID, reason string, userID *uuid.UUID) error
	CompleteRecharge(ctx context.Context, orderID uuid.UUID, userID *uuid.UUID) error
	
	// Advanced order querying and filtering
	SearchOrders(ctx context.Context, req *SearchOrdersRequest) (*SearchOrdersResponse, error)
	GetOrdersByDateRange(ctx context.Context, startDate, endDate time.Time, merchantID *uuid.UUID) ([]*repository.RechargeOrder, error)
	GetOrderStatistics(ctx context.Context, filter *OrderStatisticsFilter) (*OrderStatistics, error)
	GetDailySummary(ctx context.Context, date time.Time, merchantID *uuid.UUID) (*repository.DailySummary, error)
	
	// Order expiration management
	MarkExpiredOrders(ctx context.Context) (int64, error)
	GetExpiringOrders(ctx context.Context, withinHours int) ([]*repository.RechargeOrder, error)
	ExtendOrderExpiration(ctx context.Context, orderID uuid.UUID, newExpirationTime time.Time, userID *uuid.UUID) error
	
	// Order number generation
	GenerateOrderNumber(ctx context.Context) (string, error)
	
	// Account allocation
	AllocateReceiveAccount(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error)
	AllocateReceiveAccountWithDetails(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*AccountAllocationResult, error)
	ValidateAccountAllocation(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*AccountAllocationValidation, error)
	GetAccountAllocationStats(ctx context.Context, merchantID uuid.UUID) (*AccountAllocationStats, error)
}

// Request/Response types for RechargeService
type CreateRechargeOrderRequest struct {
	PayerName    string          `json:"payer_name" binding:"required"`
	PayerAccount string          `json:"payer_account" binding:"required"`
	PaymentType  string          `json:"payment_type" binding:"required"` // public/private
	Amount       decimal.Decimal `json:"amount" binding:"required"`
	MerchantID   uuid.UUID       `json:"merchant_id" binding:"required"`
	AdAccount    string          `json:"ad_account" binding:"required"`
	Remark       *string         `json:"remark"`
}

type UpdateRechargeOrderRequest struct {
	PayerName    *string          `json:"payer_name"`
	PayerAccount *string          `json:"payer_account"`
	Amount       *decimal.Decimal `json:"amount"`
	AdAccount    *string          `json:"ad_account"`
	Remark       *string          `json:"remark"`
	VoucherURL   *string          `json:"voucher_url"`
}

// Enhanced request/response types for recharge testing system

type SearchOrdersRequest struct {
	// Basic filters
	OrderNumber  *string     `json:"order_number"`
	PayerName    *string     `json:"payer_name"`
	PayerAccount *string     `json:"payer_account"`
	MerchantID   *uuid.UUID  `json:"merchant_id"`
	Status       []string    `json:"status"`
	PaymentType  *string     `json:"payment_type"`
	
	// Date range filters
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	
	// Amount range filters
	MinAmount *decimal.Decimal `json:"min_amount"`
	MaxAmount *decimal.Decimal `json:"max_amount"`
	
	// Advanced filters
	HasPaymentProof *bool      `json:"has_payment_proof"`
	AutoMatched     *bool      `json:"auto_matched"`
	ExpiredOnly     *bool      `json:"expired_only"`
	
	// Pagination and sorting
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
	OrderBy  string `json:"order_by"`
	OrderDir string `json:"order_dir"`
}

type SearchOrdersResponse struct {
	Orders     []*repository.RechargeOrder `json:"orders"`
	Total      int64                       `json:"total"`
	Page       int                         `json:"page"`
	Limit      int                         `json:"limit"`
	TotalPages int                         `json:"total_pages"`
}

type PaymentProofInfo struct {
	OrderID     uuid.UUID  `json:"order_id"`
	ProofURL    string     `json:"proof_url"`
	UploadedAt  time.Time  `json:"uploaded_at"`
	UploadedBy  *uuid.UUID `json:"uploaded_by"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
	ReviewedBy  *uuid.UUID `json:"reviewed_by"`
	ReviewNotes *string    `json:"review_notes"`
	IsApproved  *bool      `json:"is_approved"`
}

type OrderStatisticsFilter struct {
	MerchantID  *uuid.UUID `json:"merchant_id"`
	PaymentType *string    `json:"payment_type"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
}

type OrderStatistics struct {
	TotalOrders     int64           `json:"total_orders"`
	TotalAmount     decimal.Decimal `json:"total_amount"`
	CompletedOrders int64           `json:"completed_orders"`
	CompletedAmount decimal.Decimal `json:"completed_amount"`
	PendingOrders   int64           `json:"pending_orders"`
	PendingAmount   decimal.Decimal `json:"pending_amount"`
	CancelledOrders int64           `json:"cancelled_orders"`
	CancelledAmount decimal.Decimal `json:"cancelled_amount"`
	ExpiredOrders   int64           `json:"expired_orders"`
	ExpiredAmount   decimal.Decimal `json:"expired_amount"`
	AverageAmount   decimal.Decimal `json:"average_amount"`
	SuccessRate     decimal.Decimal `json:"success_rate"`
}

// Order status constants
const (
	OrderStatusPending   = "pending"
	OrderStatusPaid      = "paid"
	OrderStatusConfirmed = "confirmed"
	OrderStatusCompleted = "completed"
	OrderStatusCancelled = "cancelled"
	OrderStatusRefunded  = "refunded"
	OrderStatusFailed    = "failed"
)

// rechargeService implements RechargeService interface
type rechargeService struct {
	rechargeOrderRepo     repository.RechargeOrderRepository
	merchantRepo          repository.MerchantRepository
	receiveAccountRepo    repository.ReceiveAccountRepository
	rotationService       RotationService
	limitService          LimitService
	notificationService   NotificationService
	orderStatusLogRepo    repository.OrderStatusLogRepository
	paymentVoucherRepo    repository.PaymentVoucherRepository
}

// NewRechargeService creates a new recharge service
func NewRechargeService(
	rechargeOrderRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	rotationService RotationService,
	limitService LimitService,
	notificationService NotificationService,
	orderStatusLogRepo repository.OrderStatusLogRepository,
	paymentVoucherRepo repository.PaymentVoucherRepository,
) RechargeService {
	return &rechargeService{
		rechargeOrderRepo:   rechargeOrderRepo,
		merchantRepo:        merchantRepo,
		receiveAccountRepo:  receiveAccountRepo,
		rotationService:     rotationService,
		limitService:        limitService,
		notificationService: notificationService,
		orderStatusLogRepo:  orderStatusLogRepo,
		paymentVoucherRepo:  paymentVoucherRepo,
	}
}

// CreateRechargeOrder creates a new recharge order
func (s *rechargeService) CreateRechargeOrder(ctx context.Context, req *CreateRechargeOrderRequest) (*repository.RechargeOrder, error) {
	// Validate merchant exists
	_, err := s.merchantRepo.GetByID(ctx, req.MerchantID)
	if err != nil {
		return nil, fmt.Errorf("merchant not found: %w", err)
	}

	// Check merchant limits
	limitResult, err := s.limitService.CheckMerchantLimits(ctx, req.MerchantID, req.Amount)
	if err != nil {
		return nil, fmt.Errorf("failed to check merchant limits: %w", err)
	}
	if !limitResult.Allowed {
		return nil, fmt.Errorf("merchant limit exceeded: %s", limitResult.Reason)
	}

	// Allocate receive account
	receiveAccount, err := s.AllocateReceiveAccount(ctx, req.MerchantID, req.Amount, req.PaymentType)
	if err != nil {
		return nil, fmt.Errorf("failed to allocate receive account: %w", err)
	}

	// Generate order number
	orderNumber, err := s.GenerateOrderNumber(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to generate order number: %w", err)
	}

	// Create recharge order
	order := &repository.RechargeOrder{
		ID:               uuid.New(),
		OrderNumber:      orderNumber,
		PayerName:        req.PayerName,
		PayerAccount:     req.PayerAccount,
		PaymentType:      req.PaymentType,
		Amount:           req.Amount,
		MerchantID:       req.MerchantID,
		AdAccount:        req.AdAccount,
		ReceiveAccountID: receiveAccount.ID,
		Status:           OrderStatusPending,
		Remark:           req.Remark,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	err = s.rechargeOrderRepo.Create(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to create recharge order: %w", err)
	}

	return order, nil
}

// GetRechargeOrder retrieves a recharge order by ID
func (s *rechargeService) GetRechargeOrder(ctx context.Context, id uuid.UUID) (*repository.RechargeOrder, error) {
	return s.rechargeOrderRepo.GetByID(ctx, id)
}

// GetRechargeOrderByNumber retrieves a recharge order by order number
func (s *rechargeService) GetRechargeOrderByNumber(ctx context.Context, orderNumber string) (*repository.RechargeOrder, error) {
	return s.rechargeOrderRepo.GetByOrderNumber(ctx, orderNumber)
}

// UpdateRechargeOrder updates a recharge order
func (s *rechargeService) UpdateRechargeOrder(ctx context.Context, id uuid.UUID, req *UpdateRechargeOrderRequest) (*repository.RechargeOrder, error) {
	// Get existing order
	order, err := s.rechargeOrderRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("recharge order not found: %w", err)
	}

	// Update fields if provided
	if req.PayerName != nil {
		order.PayerName = *req.PayerName
	}
	if req.PayerAccount != nil {
		order.PayerAccount = *req.PayerAccount
	}
	if req.Amount != nil {
		order.Amount = *req.Amount
	}
	if req.AdAccount != nil {
		order.AdAccount = *req.AdAccount
	}
	if req.Remark != nil {
		order.Remark = req.Remark
	}
	if req.VoucherURL != nil {
		order.VoucherURL = req.VoucherURL
	}

	order.UpdatedAt = time.Now()

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to update recharge order: %w", err)
	}

	return order, nil
}

// ListRechargeOrders lists recharge orders with filtering
func (s *rechargeService) ListRechargeOrders(ctx context.Context, filter *repository.RechargeOrderFilter) ([]*repository.RechargeOrder, int64, error) {
	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list recharge orders: %w", err)
	}

	count, err := s.rechargeOrderRepo.Count(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count recharge orders: %w", err)
	}

	return orders, count, nil
}

// UpdateOrderStatus updates the status of a recharge order with proper logging and notifications
func (s *rechargeService) UpdateOrderStatus(ctx context.Context, orderID uuid.UUID, status string, reason *string, userID *uuid.UUID) error {
	// Get existing order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	// Validate status transition
	if !s.isValidStatusTransition(order.Status, status) {
		return fmt.Errorf("invalid status transition from %s to %s", order.Status, status)
	}

	oldStatus := order.Status

	// Update order status
	order.Status = status
	order.UpdatedAt = time.Now()
	if userID != nil {
		order.UpdatedBy = userID
	}

	// Set completion time if status is completed
	if status == OrderStatusCompleted {
		now := time.Now()
		order.CompletedAt = &now
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	// Create status log entry
	if s.orderStatusLogRepo != nil {
		statusLog := &repository.OrderStatusLog{
			ID:              uuid.New(),
			RechargeOrderID: orderID,
			FromStatus:      &oldStatus,
			ToStatus:        status,
			Reason:          reason,
			CreatedAt:       time.Now(),
			CreatedBy:       userID,
		}

		err = s.orderStatusLogRepo.Create(ctx, statusLog)
		if err != nil {
			// Log error but don't fail the main operation
			fmt.Printf("Failed to create status log: %v\n", err)
		}
	}

	// Send notification for status change
	if s.notificationService != nil {
		notificationReq := &SendNotificationRequest{
			EventType:       "order_status_changed",
			RechargeOrderID: &orderID,
			Data: map[string]interface{}{
				"order_number": order.OrderNumber,
				"old_status":   oldStatus,
				"new_status":   status,
				"reason":       reason,
				"changed_by":   userID,
			},
		}

		err = s.notificationService.SendNotification(ctx, notificationReq)
		if err != nil {
			// Log error but don't fail the main operation
			fmt.Printf("Failed to send notification: %v\n", err)
		}
	}

	return nil
}

// GetOrderStatusHistory retrieves the status history of an order
func (s *rechargeService) GetOrderStatusHistory(ctx context.Context, orderID uuid.UUID) ([]*repository.OrderStatusLog, error) {
	if s.orderStatusLogRepo == nil {
		return nil, fmt.Errorf("order status log repository not available")
	}

	filter := &repository.OrderStatusLogFilter{
		RechargeOrderID: &orderID,
		OrderBy:         "created_at",
		OrderDir:        "ASC",
	}

	logs, err := s.orderStatusLogRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get order status history: %w", err)
	}

	return logs, nil
}

// ProcessPrivateRecharge processes a private recharge order
func (s *rechargeService) ProcessPrivateRecharge(ctx context.Context, orderID uuid.UUID, voucherURL string, userID *uuid.UUID) error {
	// Get order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	// Validate order status
	if order.Status != OrderStatusPending {
		return fmt.Errorf("order status must be pending, current status: %s", order.Status)
	}

	// Update order with voucher
	order.VoucherURL = &voucherURL
	order.Status = OrderStatusPaid
	order.UpdatedAt = time.Now()
	if userID != nil {
		order.UpdatedBy = userID
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to update order: %w", err)
	}

	return nil
}

// ProcessPublicRecharge processes a public recharge order
func (s *rechargeService) ProcessPublicRecharge(ctx context.Context, orderID uuid.UUID, userID *uuid.UUID) error {
	// Get order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	// Validate order status
	if order.Status != OrderStatusPending {
		return fmt.Errorf("order status must be pending, current status: %s", order.Status)
	}

	// Validate payment type
	if order.PaymentType != "public" {
		return fmt.Errorf("order payment type must be public, current type: %s", order.PaymentType)
	}

	// Update order status to paid (bank transfer completed via callback)
	order.Status = OrderStatusPaid
	order.UpdatedAt = time.Now()
	if userID != nil {
		order.UpdatedBy = userID
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to update order: %w", err)
	}

	return nil
}

// CancelRecharge cancels a recharge order
func (s *rechargeService) CancelRecharge(ctx context.Context, orderID uuid.UUID, reason string, userID *uuid.UUID) error {
	return s.UpdateOrderStatus(ctx, orderID, OrderStatusCancelled, &reason, userID)
}

// GenerateOrderNumber generates a unique order number
func (s *rechargeService) GenerateOrderNumber(ctx context.Context) (string, error) {
	// Format: CJ + YYYYMMDD + 8-digit random number
	now := time.Now()
	dateStr := now.Format("20060102")
	
	// Generate 8-digit random number
	max := big.NewInt(99999999)
	randomNum, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate random number: %w", err)
	}
	
	orderNumber := fmt.Sprintf("CJ%s%08d", dateStr, randomNum.Int64())
	
	// Check if order number already exists (very unlikely but good to check)
	_, err = s.rechargeOrderRepo.GetByOrderNumber(ctx, orderNumber)
	if err == nil {
		// Order number exists, try again (recursive call)
		return s.GenerateOrderNumber(ctx)
	}
	
	return orderNumber, nil
}

// AllocateReceiveAccount allocates a receive account for the order with intelligent selection
func (s *rechargeService) AllocateReceiveAccount(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error) {
	// Strategy 1: Try intelligent rotation service first
	account, err := s.tryRotationService(ctx, merchantID, amount, paymentType)
	if err == nil && account != nil {
		return account, nil
	}

	// Strategy 2: Fallback to direct account selection with limit checking
	account, err = s.tryDirectAccountSelection(ctx, merchantID, amount, paymentType)
	if err == nil && account != nil {
		return account, nil
	}

	// Strategy 3: Emergency fallback - try accounts with relaxed criteria
	account, err = s.tryEmergencyFallback(ctx, merchantID, paymentType)
	if err == nil && account != nil {
		return account, nil
	}

	return nil, fmt.Errorf("no suitable accounts available for merchant %s with amount %s and payment type %s", 
		merchantID, amount.String(), paymentType)
}

// tryRotationService attempts to use the rotation service for account selection
func (s *rechargeService) tryRotationService(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error) {
	account, err := s.rotationService.SelectAccount(ctx, merchantID, amount, paymentType)
	if err != nil {
		return nil, err
	}

	if account == nil {
		return nil, fmt.Errorf("rotation service returned no account")
	}

	// Verify account is still suitable
	if !s.isAccountSuitable(account, amount, paymentType) {
		return nil, fmt.Errorf("selected account is not suitable")
	}

	// Check account limits
	limitResult, err := s.limitService.CheckAccountLimits(ctx, account.ID, amount)
	if err != nil {
		return nil, fmt.Errorf("failed to check account limits: %w", err)
	}

	if !limitResult.Allowed {
		return nil, fmt.Errorf("account limit exceeded: %s", limitResult.Reason)
	}

	return account, nil
}

// tryDirectAccountSelection attempts direct account selection with limit checking
func (s *rechargeService) tryDirectAccountSelection(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error) {
	accounts, err := s.receiveAccountRepo.GetAvailableAccounts(ctx, merchantID, amount, paymentType)
	if err != nil {
		return nil, fmt.Errorf("failed to get available accounts: %w", err)
	}

	if len(accounts) == 0 {
		return nil, fmt.Errorf("no available accounts found")
	}

	// Sort accounts by priority (prefer accounts with higher remaining limits)
	prioritizedAccounts := s.prioritizeAccountsByLimits(ctx, accounts, amount)

	// Check limits for each account in priority order
	for _, account := range prioritizedAccounts {
		if !s.isAccountSuitable(account, amount, paymentType) {
			continue
		}

		limitResult, err := s.limitService.CheckAccountLimits(ctx, account.ID, amount)
		if err != nil {
			continue // Skip accounts with limit check errors
		}

		if limitResult.Allowed {
			return account, nil
		}
	}

	return nil, fmt.Errorf("no accounts available within limits")
}

// tryEmergencyFallback attempts emergency fallback with relaxed criteria
func (s *rechargeService) tryEmergencyFallback(ctx context.Context, merchantID uuid.UUID, paymentType string) (*repository.ReceiveAccount, error) {
	// Get all accounts for the merchant regardless of amount limits
	accounts, err := s.receiveAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	// Filter by payment type and active status only
	var suitableAccounts []*repository.ReceiveAccount
	for _, account := range accounts {
		if account.Status == "active" && account.PaymentType == paymentType {
			suitableAccounts = append(suitableAccounts, account)
		}
	}

	if len(suitableAccounts) == 0 {
		return nil, fmt.Errorf("no emergency fallback accounts available")
	}

	// Return the first suitable account (emergency mode)
	return suitableAccounts[0], nil
}

// isAccountSuitable checks if an account is suitable for the given criteria
func (s *rechargeService) isAccountSuitable(account *repository.ReceiveAccount, amount decimal.Decimal, paymentType string) bool {
	// Check basic criteria
	if account.Status != "active" {
		return false
	}

	if account.PaymentType != paymentType {
		return false
	}

	// Check single transaction limit
	if account.SingleLimit.GreaterThan(decimal.Zero) && amount.GreaterThan(account.SingleLimit) {
		return false
	}

	return true
}

// prioritizeAccountsByLimits sorts accounts by remaining daily limits (descending)
func (s *rechargeService) prioritizeAccountsByLimits(ctx context.Context, accounts []*repository.ReceiveAccount, amount decimal.Decimal) []*repository.ReceiveAccount {
	// Create a copy to avoid modifying the original slice
	prioritized := make([]*repository.ReceiveAccount, len(accounts))
	copy(prioritized, accounts)

	// Sort by remaining daily limit (descending)
	// Accounts with higher remaining limits get priority
	for i := 0; i < len(prioritized)-1; i++ {
		for j := i + 1; j < len(prioritized); j++ {
			remainingI := prioritized[i].DailyLimit.Sub(prioritized[i].DailyUsed)
			remainingJ := prioritized[j].DailyLimit.Sub(prioritized[j].DailyUsed)

			// If account J has more remaining limit, swap
			if remainingJ.GreaterThan(remainingI) {
				prioritized[i], prioritized[j] = prioritized[j], prioritized[i]
			}
		}
	}

	return prioritized
}

// AccountAllocationResult represents the result of account allocation
type AccountAllocationResult struct {
	Account          *repository.ReceiveAccount `json:"account"`
	AllocationMethod string                     `json:"allocation_method"` // rotation, direct, emergency
	Reason           string                     `json:"reason"`
	AttemptedMethods []string                   `json:"attempted_methods"`
}

// AllocateReceiveAccountWithDetails allocates a receive account with detailed result information
func (s *rechargeService) AllocateReceiveAccountWithDetails(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*AccountAllocationResult, error) {
	result := &AccountAllocationResult{
		AttemptedMethods: []string{},
	}

	// Strategy 1: Try intelligent rotation service first
	result.AttemptedMethods = append(result.AttemptedMethods, "rotation")
	account, err := s.tryRotationService(ctx, merchantID, amount, paymentType)
	if err == nil && account != nil {
		result.Account = account
		result.AllocationMethod = "rotation"
		result.Reason = "Successfully allocated using rotation service"
		return result, nil
	}

	// Strategy 2: Fallback to direct account selection
	result.AttemptedMethods = append(result.AttemptedMethods, "direct")
	account, err = s.tryDirectAccountSelection(ctx, merchantID, amount, paymentType)
	if err == nil && account != nil {
		result.Account = account
		result.AllocationMethod = "direct"
		result.Reason = "Successfully allocated using direct selection"
		return result, nil
	}

	// Strategy 3: Emergency fallback
	result.AttemptedMethods = append(result.AttemptedMethods, "emergency")
	account, err = s.tryEmergencyFallback(ctx, merchantID, paymentType)
	if err == nil && account != nil {
		result.Account = account
		result.AllocationMethod = "emergency"
		result.Reason = "Successfully allocated using emergency fallback"
		return result, nil
	}

	result.Reason = fmt.Sprintf("All allocation methods failed for merchant %s with amount %s and payment type %s", 
		merchantID, amount.String(), paymentType)
	return result, fmt.Errorf("account allocation failed: %s", result.Reason)
}

// ValidateAccountAllocation validates if an account can be allocated for the given parameters
func (s *rechargeService) ValidateAccountAllocation(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*AccountAllocationValidation, error) {
	validation := &AccountAllocationValidation{
		MerchantID:  merchantID,
		Amount:      amount,
		PaymentType: paymentType,
		Issues:      []string{},
	}

	// Check if merchant exists and is active
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		validation.Issues = append(validation.Issues, "Merchant not found")
		validation.IsValid = false
		return validation, nil
	}

	if merchant.Status != "active" {
		validation.Issues = append(validation.Issues, "Merchant is not active")
		validation.IsValid = false
	}

	// Check merchant limits
	limitResult, err := s.limitService.CheckMerchantLimits(ctx, merchantID, amount)
	if err != nil {
		validation.Issues = append(validation.Issues, fmt.Sprintf("Failed to check merchant limits: %v", err))
		validation.IsValid = false
	} else if !limitResult.Allowed {
		validation.Issues = append(validation.Issues, fmt.Sprintf("Merchant limit exceeded: %s", limitResult.Reason))
		validation.IsValid = false
	}

	// Check if any accounts are available
	accounts, err := s.receiveAccountRepo.GetAvailableAccounts(ctx, merchantID, amount, paymentType)
	if err != nil {
		validation.Issues = append(validation.Issues, fmt.Sprintf("Failed to get available accounts: %v", err))
		validation.IsValid = false
	} else if len(accounts) == 0 {
		validation.Issues = append(validation.Issues, "No available accounts found")
		validation.IsValid = false
	} else {
		// Check if any account has sufficient limits
		hasValidAccount := false
		for _, account := range accounts {
			if s.isAccountSuitable(account, amount, paymentType) {
				accountLimitResult, err := s.limitService.CheckAccountLimits(ctx, account.ID, amount)
				if err == nil && accountLimitResult.Allowed {
					hasValidAccount = true
					break
				}
			}
		}
		if !hasValidAccount {
			validation.Issues = append(validation.Issues, "No accounts available within limits")
			validation.IsValid = false
		}
	}

	// If no issues found, allocation should be valid
	if len(validation.Issues) == 0 {
		validation.IsValid = true
	}

	return validation, nil
}

// AccountAllocationValidation represents the validation result for account allocation
type AccountAllocationValidation struct {
	MerchantID  uuid.UUID       `json:"merchant_id"`
	Amount      decimal.Decimal `json:"amount"`
	PaymentType string          `json:"payment_type"`
	IsValid     bool            `json:"is_valid"`
	Issues      []string        `json:"issues"`
}

// GetAccountAllocationStats returns statistics about account allocation for a merchant
func (s *rechargeService) GetAccountAllocationStats(ctx context.Context, merchantID uuid.UUID) (*AccountAllocationStats, error) {
	stats := &AccountAllocationStats{
		MerchantID: merchantID,
	}

	// Get all accounts for the merchant
	accounts, err := s.receiveAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant accounts: %w", err)
	}

	stats.TotalAccounts = len(accounts)

	// Count active accounts
	for _, account := range accounts {
		if account.Status == "active" {
			stats.ActiveAccounts++
			
			// Calculate utilization
			if account.DailyLimit.GreaterThan(decimal.Zero) {
				utilization := account.DailyUsed.Div(account.DailyLimit).Mul(decimal.NewFromInt(100))
				if utilization.GreaterThan(decimal.NewFromInt(80)) {
					stats.HighUtilizationAccounts++
				}
			}
		}
	}

	// Get rotation rules
	rules, err := s.rotationService.GetMerchantRotationRules(ctx, merchantID)
	if err == nil {
		stats.RotationRules = len(rules)
		for _, rule := range rules {
			if rule.IsActive {
				stats.ActiveRotationRules++
			}
		}
	}

	return stats, nil
}

// AccountAllocationStats represents statistics about account allocation
type AccountAllocationStats struct {
	MerchantID               uuid.UUID `json:"merchant_id"`
	TotalAccounts            int       `json:"total_accounts"`
	ActiveAccounts           int       `json:"active_accounts"`
	HighUtilizationAccounts  int       `json:"high_utilization_accounts"`
	RotationRules            int       `json:"rotation_rules"`
	ActiveRotationRules      int       `json:"active_rotation_rules"`
}

// isValidStatusTransition checks if a status transition is valid
func (s *rechargeService) isValidStatusTransition(fromStatus, toStatus string) bool {
	validTransitions := map[string][]string{
		OrderStatusPending: {OrderStatusPaid, OrderStatusCancelled, OrderStatusFailed},
		OrderStatusPaid:    {OrderStatusConfirmed, OrderStatusCancelled, OrderStatusRefunded},
		OrderStatusConfirmed: {OrderStatusCompleted, OrderStatusRefunded},
		OrderStatusCompleted: {OrderStatusRefunded},
		OrderStatusCancelled: {},
		OrderStatusRefunded:  {},
		OrderStatusFailed:    {OrderStatusPending, OrderStatusCancelled},
	}

	allowedStatuses, exists := validTransitions[fromStatus]
	if !exists {
		return false
	}

	for _, allowedStatus := range allowedStatuses {
		if allowedStatus == toStatus {
			return true
		}
	}

	return false
}

// Enhanced methods for recharge testing system

// ValidateStatusTransition validates if a status transition is allowed for an order
func (s *rechargeService) ValidateStatusTransition(ctx context.Context, orderID uuid.UUID, newStatus string) error {
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	if !s.isValidStatusTransition(order.Status, newStatus) {
		return fmt.Errorf("invalid status transition from %s to %s", order.Status, newStatus)
	}

	return nil
}

// BulkUpdateOrderStatus updates the status of multiple orders
func (s *rechargeService) BulkUpdateOrderStatus(ctx context.Context, orderIDs []uuid.UUID, status string, reason *string, userID *uuid.UUID) error {
	if len(orderIDs) == 0 {
		return fmt.Errorf("no order IDs provided")
	}

	var errors []string
	successCount := 0

	for _, orderID := range orderIDs {
		err := s.UpdateOrderStatus(ctx, orderID, status, reason, userID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Order %s: %v", orderID, err))
		} else {
			successCount++
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("bulk update completed with %d successes and %d errors: %s", 
			successCount, len(errors), strings.Join(errors, "; "))
	}

	return nil
}

// UploadPaymentProof uploads payment proof for an order
func (s *rechargeService) UploadPaymentProof(ctx context.Context, orderID uuid.UUID, proofURL string, userID *uuid.UUID) error {
	// Get existing order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	// Validate order status - only pending or paid orders can have proof uploaded
	if order.Status != OrderStatusPending && order.Status != OrderStatusPaid {
		return fmt.Errorf("payment proof can only be uploaded for pending or paid orders, current status: %s", order.Status)
	}

	// Update order with payment proof
	order.PaymentProof = &proofURL
	order.UpdatedAt = time.Now()
	if userID != nil {
		order.UpdatedBy = userID
	}

	// If order was pending, move to paid status
	if order.Status == OrderStatusPending {
		order.Status = OrderStatusPaid
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to update order with payment proof: %w", err)
	}

	// Create payment voucher record if repository is available
	if s.paymentVoucherRepo != nil {
		voucher := &repository.PaymentVoucher{
			ID:              uuid.New(),
			RechargeOrderID: orderID,
			VoucherType:     "payment_proof",
			VoucherURL:      proofURL,
			UploadedAt:      time.Now(),
			UploadedBy:      userID,
		}

		err = s.paymentVoucherRepo.Create(ctx, voucher)
		if err != nil {
			// Log error but don't fail the main operation
			fmt.Printf("Failed to create payment voucher record: %v\n", err)
		}
	}

	// Send notification for payment proof upload
	if s.notificationService != nil {
		notificationReq := &SendNotificationRequest{
			EventType:       "payment_proof_uploaded",
			RechargeOrderID: &orderID,
			Data: map[string]interface{}{
				"order_number": order.OrderNumber,
				"proof_url":    proofURL,
				"uploaded_by":  userID,
			},
		}

		err = s.notificationService.SendNotification(ctx, notificationReq)
		if err != nil {
			// Log error but don't fail the main operation
			fmt.Printf("Failed to send notification: %v\n", err)
		}
	}

	return nil
}

// GetPaymentProof retrieves payment proof information for an order
func (s *rechargeService) GetPaymentProof(ctx context.Context, orderID uuid.UUID) (*PaymentProofInfo, error) {
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("recharge order not found: %w", err)
	}

	if order.PaymentProof == nil {
		return nil, fmt.Errorf("no payment proof found for order %s", orderID)
	}

	proofInfo := &PaymentProofInfo{
		OrderID:  orderID,
		ProofURL: *order.PaymentProof,
	}

	// Get additional details from payment voucher if available
	if s.paymentVoucherRepo != nil {
		vouchers, err := s.paymentVoucherRepo.GetByOrderID(ctx, orderID)
		if err == nil && len(vouchers) > 0 {
			// Get the latest payment proof voucher
			for _, voucher := range vouchers {
				if voucher.VoucherType == "payment_proof" {
					proofInfo.UploadedAt = voucher.UploadedAt
					proofInfo.UploadedBy = voucher.UploadedBy
					break
				}
			}
		}
	}

	return proofInfo, nil
}

// ReviewPaymentProof allows admin to review and approve/reject payment proof
func (s *rechargeService) ReviewPaymentProof(ctx context.Context, orderID uuid.UUID, approved bool, reviewNotes *string, userID *uuid.UUID) error {
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	if order.PaymentProof == nil {
		return fmt.Errorf("no payment proof to review for order %s", orderID)
	}

	// Update order status based on review
	newStatus := OrderStatusConfirmed
	if !approved {
		newStatus = OrderStatusCancelled
	}

	// Update processing notes
	order.ProcessingNotes = reviewNotes
	order.UpdatedAt = time.Now()
	if userID != nil {
		order.UpdatedBy = userID
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to update order after review: %w", err)
	}

	// Update order status with proper logging
	reason := "Payment proof reviewed"
	if reviewNotes != nil {
		reason = *reviewNotes
	}
	
	err = s.UpdateOrderStatus(ctx, orderID, newStatus, &reason, userID)
	if err != nil {
		return fmt.Errorf("failed to update order status after review: %w", err)
	}

	return nil
}

// CompleteRecharge marks a recharge order as completed
func (s *rechargeService) CompleteRecharge(ctx context.Context, orderID uuid.UUID, userID *uuid.UUID) error {
	return s.UpdateOrderStatus(ctx, orderID, OrderStatusCompleted, nil, userID)
}

// SearchOrders provides advanced search functionality for orders
func (s *rechargeService) SearchOrders(ctx context.Context, req *SearchOrdersRequest) (*SearchOrdersResponse, error) {
	// Convert search request to repository filter
	filter := &repository.RechargeOrderFilter{
		PayerName:   req.PayerName,
		MerchantID:  req.MerchantID,
		Status:      req.Status,
		PaymentType: req.PaymentType,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		OrderBy:     req.OrderBy,
		OrderDir:    req.OrderDir,
	}

	// Set pagination
	if req.Limit <= 0 {
		req.Limit = 20 // Default limit
	}
	if req.Limit > 100 {
		req.Limit = 100 // Max limit
	}
	if req.Page <= 0 {
		req.Page = 1
	}

	filter.Limit = req.Limit
	filter.Offset = (req.Page - 1) * req.Limit

	// Get orders and count
	orders, total, err := s.ListRechargeOrders(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to search orders: %w", err)
	}

	// Calculate total pages
	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &SearchOrdersResponse{
		Orders:     orders,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetOrdersByDateRange retrieves orders within a specific date range
func (s *rechargeService) GetOrdersByDateRange(ctx context.Context, startDate, endDate time.Time, merchantID *uuid.UUID) ([]*repository.RechargeOrder, error) {
	filter := &repository.RechargeOrderFilter{
		MerchantID: merchantID,
		StartDate:  &startDate,
		EndDate:    &endDate,
		OrderBy:    "created_at",
		OrderDir:   "ASC",
	}

	orders, _, err := s.ListRechargeOrders(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders by date range: %w", err)
	}

	return orders, nil
}

// GetOrderStatistics calculates order statistics based on filter criteria
func (s *rechargeService) GetOrderStatistics(ctx context.Context, filter *OrderStatisticsFilter) (*OrderStatistics, error) {
	repoFilter := &repository.RechargeOrderFilter{
		MerchantID:  filter.MerchantID,
		PaymentType: filter.PaymentType,
		StartDate:   filter.StartDate,
		EndDate:     filter.EndDate,
	}

	orders, _, err := s.ListRechargeOrders(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders for statistics: %w", err)
	}

	stats := &OrderStatistics{}
	
	for _, order := range orders {
		stats.TotalOrders++
		stats.TotalAmount = stats.TotalAmount.Add(order.Amount)

		switch order.Status {
		case OrderStatusCompleted:
			stats.CompletedOrders++
			stats.CompletedAmount = stats.CompletedAmount.Add(order.Amount)
		case OrderStatusPending, OrderStatusPaid, OrderStatusConfirmed:
			stats.PendingOrders++
			stats.PendingAmount = stats.PendingAmount.Add(order.Amount)
		case OrderStatusCancelled:
			stats.CancelledOrders++
			stats.CancelledAmount = stats.CancelledAmount.Add(order.Amount)
		case OrderStatusFailed:
			stats.ExpiredOrders++
			stats.ExpiredAmount = stats.ExpiredAmount.Add(order.Amount)
		}
	}

	// Calculate derived statistics
	if stats.TotalOrders > 0 {
		stats.AverageAmount = stats.TotalAmount.Div(decimal.NewFromInt(stats.TotalOrders))
		stats.SuccessRate = decimal.NewFromInt(stats.CompletedOrders).Div(decimal.NewFromInt(stats.TotalOrders)).Mul(decimal.NewFromInt(100))
	}

	return stats, nil
}

// GetDailySummary retrieves daily summary statistics
func (s *rechargeService) GetDailySummary(ctx context.Context, date time.Time, merchantID *uuid.UUID) (*repository.DailySummary, error) {
	// Use enhanced repository method if available
	if enhancedRepo, ok := s.rechargeOrderRepo.(repository.EnhancedRechargeOrderRepository); ok {
		return enhancedRepo.GetDailySummary(ctx, date, merchantID)
	}

	// Fallback to manual calculation
	startDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endDate := startDate.Add(24 * time.Hour)

	orders, err := s.GetOrdersByDateRange(ctx, startDate, endDate, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get orders for daily summary: %w", err)
	}

	summary := &repository.DailySummary{
		Date:       date,
		MerchantID: merchantID,
	}

	for _, order := range orders {
		summary.TotalOrders++
		summary.TotalAmount = summary.TotalAmount.Add(order.Amount)

		switch order.Status {
		case OrderStatusCompleted:
			summary.CompletedOrders++
			summary.CompletedAmount = summary.CompletedAmount.Add(order.Amount)
		case OrderStatusPending, OrderStatusPaid, OrderStatusConfirmed:
			summary.PendingOrders++
			summary.PendingAmount = summary.PendingAmount.Add(order.Amount)
		case OrderStatusCancelled:
			summary.CancelledOrders++
			summary.CancelledAmount = summary.CancelledAmount.Add(order.Amount)
		case OrderStatusFailed:
			summary.ExpiredOrders++
			summary.ExpiredAmount = summary.ExpiredAmount.Add(order.Amount)
		}
	}

	return summary, nil
}

// MarkExpiredOrders marks orders as expired based on their expiration time
func (s *rechargeService) MarkExpiredOrders(ctx context.Context) (int64, error) {
	// Use enhanced repository method if available
	if enhancedRepo, ok := s.rechargeOrderRepo.(repository.EnhancedRechargeOrderRepository); ok {
		return enhancedRepo.MarkAsExpired(ctx, time.Now())
	}

	// Fallback implementation
	filter := &repository.RechargeOrderFilter{
		Status:  []string{OrderStatusPending, OrderStatusPaid},
		EndDate: &time.Time{}, // Will be set to current time
	}

	orders, _, err := s.ListRechargeOrders(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to get orders for expiration check: %w", err)
	}

	var expiredCount int64
	now := time.Now()

	for _, order := range orders {
		if order.ExpiredAt != nil && order.ExpiredAt.Before(now) {
			err = s.UpdateOrderStatus(ctx, order.ID, OrderStatusFailed, nil, nil)
			if err != nil {
				fmt.Printf("Failed to mark order %s as expired: %v\n", order.ID, err)
			} else {
				expiredCount++
			}
		}
	}

	return expiredCount, nil
}

// GetExpiringOrders retrieves orders that will expire within the specified hours
func (s *rechargeService) GetExpiringOrders(ctx context.Context, withinHours int) ([]*repository.RechargeOrder, error) {
	expirationTime := time.Now().Add(time.Duration(withinHours) * time.Hour)
	
	filter := &repository.RechargeOrderFilter{
		Status:  []string{OrderStatusPending, OrderStatusPaid},
		EndDate: &expirationTime,
	}

	orders, _, err := s.ListRechargeOrders(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get expiring orders: %w", err)
	}

	var expiringOrders []*repository.RechargeOrder
	for _, order := range orders {
		if order.ExpiredAt != nil && order.ExpiredAt.Before(expirationTime) {
			expiringOrders = append(expiringOrders, order)
		}
	}

	return expiringOrders, nil
}

// ExtendOrderExpiration extends the expiration time of an order
func (s *rechargeService) ExtendOrderExpiration(ctx context.Context, orderID uuid.UUID, newExpirationTime time.Time, userID *uuid.UUID) error {
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("recharge order not found: %w", err)
	}

	// Only allow extension for pending or paid orders
	if order.Status != OrderStatusPending && order.Status != OrderStatusPaid {
		return fmt.Errorf("can only extend expiration for pending or paid orders, current status: %s", order.Status)
	}

	// Update expiration time
	order.ExpiredAt = &newExpirationTime
	order.UpdatedAt = time.Now()
	if userID != nil {
		order.UpdatedBy = userID
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return fmt.Errorf("failed to extend order expiration: %w", err)
	}

	// Log the extension
	reason := fmt.Sprintf("Order expiration extended to %s", newExpirationTime.Format("2006-01-02 15:04:05"))
	if s.orderStatusLogRepo != nil {
		statusLog := &repository.OrderStatusLog{
			ID:              uuid.New(),
			RechargeOrderID: orderID,
			FromStatus:      &order.Status,
			ToStatus:        order.Status,
			Reason:          &reason,
			CreatedAt:       time.Now(),
			CreatedBy:       userID,
		}

		err = s.orderStatusLogRepo.Create(ctx, statusLog)
		if err != nil {
			fmt.Printf("Failed to create status log for expiration extension: %v\n", err)
		}
	}

	return nil
}
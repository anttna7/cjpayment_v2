package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ConcurrencyValidationService handles concurrent processing validation
type ConcurrencyValidationService struct {
	rechargeOrderRepo  repository.RechargeOrderRepository
	merchantRepo       repository.MerchantRepository
	receiveAccountRepo repository.ReceiveAccountRepository
	
	// In-memory locks for preventing concurrent modifications
	orderLocks    map[uuid.UUID]*sync.RWMutex
	accountLocks  map[uuid.UUID]*sync.RWMutex
	merchantLocks map[uuid.UUID]*sync.RWMutex
	locksMutex    sync.RWMutex
	
	// Processing tracking
	processingOrders   map[uuid.UUID]*ProcessingInfo
	processingAccounts map[uuid.UUID]*ProcessingInfo
	processingMutex    sync.RWMutex
}

// ProcessingInfo tracks ongoing processing operations
type ProcessingInfo struct {
	ID        uuid.UUID `json:"id"`
	StartTime time.Time `json:"start_time"`
	Operation string    `json:"operation"`
	UserID    *uuid.UUID `json:"user_id,omitempty"`
}

// NewConcurrencyValidationService creates a new concurrency validation service
func NewConcurrencyValidationService(
	rechargeOrderRepo repository.RechargeOrderRepository,
	merchantRepo repository.MerchantRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
) *ConcurrencyValidationService {
	return &ConcurrencyValidationService{
		rechargeOrderRepo:  rechargeOrderRepo,
		merchantRepo:       merchantRepo,
		receiveAccountRepo: receiveAccountRepo,
		orderLocks:         make(map[uuid.UUID]*sync.RWMutex),
		accountLocks:       make(map[uuid.UUID]*sync.RWMutex),
		merchantLocks:      make(map[uuid.UUID]*sync.RWMutex),
		processingOrders:   make(map[uuid.UUID]*ProcessingInfo),
		processingAccounts: make(map[uuid.UUID]*ProcessingInfo),
	}
}

// ConcurrencyValidationResult represents concurrency validation result
type ConcurrencyValidationResult struct {
	Valid              bool                      `json:"valid"`
	Errors             []BusinessValidationError `json:"errors,omitempty"`
	ConflictingOrders  []ConflictInfo           `json:"conflicting_orders,omitempty"`
	ProcessingInfo     *ProcessingInfo          `json:"processing_info,omitempty"`
}

// ConflictInfo represents information about conflicting operations
type ConflictInfo struct {
	ResourceID   uuid.UUID `json:"resource_id"`
	ResourceType string    `json:"resource_type"`
	Operation    string    `json:"operation"`
	StartTime    time.Time `json:"start_time"`
	UserID       *uuid.UUID `json:"user_id,omitempty"`
}

// ValidateOrderConcurrency validates concurrent order processing
func (s *ConcurrencyValidationService) ValidateOrderConcurrency(ctx context.Context, orderID uuid.UUID, operation string, userID *uuid.UUID) ConcurrencyValidationResult {
	var errors []BusinessValidationError
	var conflicts []ConflictInfo

	// Check if order is currently being processed
	s.processingMutex.RLock()
	if processingInfo, exists := s.processingOrders[orderID]; exists {
		s.processingMutex.RUnlock()
		
		// Check if it's the same user
		if userID != nil && processingInfo.UserID != nil && *userID == *processingInfo.UserID {
			// Same user, allow operation but warn about potential conflict
			errors = append(errors, BusinessValidationError{
				Field:   "concurrency",
				Message: "您正在同时处理此订单，请注意避免重复操作",
				Code:    "SAME_USER_CONCURRENT_PROCESSING",
			})
		} else {
			// Different user or system operation
			conflicts = append(conflicts, ConflictInfo{
				ResourceID:   orderID,
				ResourceType: "order",
				Operation:    processingInfo.Operation,
				StartTime:    processingInfo.StartTime,
				UserID:       processingInfo.UserID,
			})
			
			errors = append(errors, BusinessValidationError{
				Field:   "concurrency",
				Message: fmt.Sprintf("订单正在被其他用户处理中（操作：%s），请稍后重试", processingInfo.Operation),
				Code:    "ORDER_CONCURRENT_PROCESSING",
			})
		}
	} else {
		s.processingMutex.RUnlock()
	}

	// Get current order state to check for recent modifications
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "order_id",
			Message: "订单不存在",
			Code:    "ORDER_NOT_FOUND",
		})
		return ConcurrencyValidationResult{Valid: false, Errors: errors}
	}

	// Check if order was recently modified (within last 5 seconds)
	if time.Since(order.UpdatedAt) < 5*time.Second {
		errors = append(errors, BusinessValidationError{
			Field:   "order_modification",
			Message: "订单刚刚被修改，请稍后重试以避免冲突",
			Code:    "RECENT_MODIFICATION",
		})
	}

	// Check for duplicate orders that might cause conflicts
	duplicateConflicts := s.checkDuplicateOrderConflicts(ctx, order)
	conflicts = append(conflicts, duplicateConflicts...)

	return ConcurrencyValidationResult{
		Valid:             len(errors) == 0,
		Errors:            errors,
		ConflictingOrders: conflicts,
	}
}

// ValidateAccountConcurrency validates concurrent account operations
func (s *ConcurrencyValidationService) ValidateAccountConcurrency(ctx context.Context, accountID uuid.UUID, operation string, amount decimal.Decimal) ConcurrencyValidationResult {
	var errors []BusinessValidationError
	var conflicts []ConflictInfo

	// Check if account is currently being processed
	s.processingMutex.RLock()
	if processingInfo, exists := s.processingAccounts[accountID]; exists {
		s.processingMutex.RUnlock()
		
		conflicts = append(conflicts, ConflictInfo{
			ResourceID:   accountID,
			ResourceType: "account",
			Operation:    processingInfo.Operation,
			StartTime:    processingInfo.StartTime,
			UserID:       processingInfo.UserID,
		})
		
		errors = append(errors, BusinessValidationError{
			Field:   "account_concurrency",
			Message: fmt.Sprintf("收款账户正在被其他操作使用中（操作：%s），请稍后重试", processingInfo.Operation),
			Code:    "ACCOUNT_CONCURRENT_PROCESSING",
		})
	} else {
		s.processingMutex.RUnlock()
	}

	// Check account's current state and recent transactions
	_, err := s.receiveAccountRepo.GetByID(ctx, accountID)
	if err != nil {
		errors = append(errors, BusinessValidationError{
			Field:   "account_id",
			Message: "收款账户不存在",
			Code:    "ACCOUNT_NOT_FOUND",
		})
		return ConcurrencyValidationResult{Valid: false, Errors: errors}
	}

	// Check for concurrent transactions that might affect limits
	concurrentTransactions := s.checkConcurrentTransactions(ctx, accountID, amount)
	if len(concurrentTransactions) > 0 {
		errors = append(errors, BusinessValidationError{
			Field:   "concurrent_transactions",
			Message: fmt.Sprintf("检测到 %d 个并发交易可能影响账户限额，请稍后重试", len(concurrentTransactions)),
			Code:    "CONCURRENT_TRANSACTIONS_DETECTED",
		})
		
		for _, tx := range concurrentTransactions {
			conflicts = append(conflicts, ConflictInfo{
				ResourceID:   tx.ID,
				ResourceType: "transaction",
				Operation:    "processing",
				StartTime:    tx.CreatedAt,
			})
		}
	}

	return ConcurrencyValidationResult{
		Valid:             len(errors) == 0,
		Errors:            errors,
		ConflictingOrders: conflicts,
	}
}

// ValidateDuplicateOrderPrevention validates against duplicate order creation
func (s *ConcurrencyValidationService) ValidateDuplicateOrderPrevention(ctx context.Context, req *DuplicateOrderValidationRequest) ConcurrencyValidationResult {
	var errors []BusinessValidationError
	var conflicts []ConflictInfo

	// Check for potential duplicate orders within the last 10 minutes
	timeWindow := time.Now().Add(-10 * time.Minute)
	
	filter := &repository.RechargeOrderFilter{
		PayerName:  &req.PayerName,
		MerchantID: &req.MerchantID,
		StartDate:  &timeWindow,
		Status:     []string{"pending", "paid", "confirmed"}, // Active statuses
		Limit:      10,
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		// Don't fail validation on query errors, just log
		return ConcurrencyValidationResult{Valid: true}
	}

	// Check for exact matches
	exactMatches := 0
	for _, order := range orders {
		if order.PayerName == req.PayerName &&
			order.PayerAccount == req.PayerAccount &&
			order.MerchantID == req.MerchantID &&
			order.Amount.Equal(req.Amount) {
			
			exactMatches++
			conflicts = append(conflicts, ConflictInfo{
				ResourceID:   order.ID,
				ResourceType: "duplicate_order",
				Operation:    "created",
				StartTime:    order.CreatedAt,
			})
		}
	}

	if exactMatches > 0 {
		if exactMatches == 1 {
			errors = append(errors, BusinessValidationError{
				Field:   "duplicate_order",
				Message: "检测到相似的订单，请确认是否为重复提交",
				Code:    "POTENTIAL_DUPLICATE_ORDER",
			})
		} else {
			errors = append(errors, BusinessValidationError{
				Field:   "duplicate_order",
				Message: fmt.Sprintf("检测到 %d 个相似订单，可能存在重复提交", exactMatches),
				Code:    "MULTIPLE_DUPLICATE_ORDERS",
			})
		}
	}

	// Check for rapid successive orders from same payer
	rapidOrders := 0
	recentTime := time.Now().Add(-2 * time.Minute)
	for _, order := range orders {
		if order.PayerAccount == req.PayerAccount && order.CreatedAt.After(recentTime) {
			rapidOrders++
		}
	}

	if rapidOrders >= 3 {
		errors = append(errors, BusinessValidationError{
			Field:   "rapid_orders",
			Message: "检测到短时间内多次提交订单，请稍后重试",
			Code:    "RAPID_ORDER_SUBMISSION",
		})
	}

	return ConcurrencyValidationResult{
		Valid:             len(errors) == 0,
		Errors:            errors,
		ConflictingOrders: conflicts,
	}
}

// AcquireOrderLock acquires a lock for order processing
func (s *ConcurrencyValidationService) AcquireOrderLock(orderID uuid.UUID, operation string, userID *uuid.UUID) error {
	s.locksMutex.Lock()
	defer s.locksMutex.Unlock()

	// Get or create lock for this order
	if _, exists := s.orderLocks[orderID]; !exists {
		s.orderLocks[orderID] = &sync.RWMutex{}
	}

	// Try to acquire lock (non-blocking)
	if !s.orderLocks[orderID].TryLock() {
		return fmt.Errorf("订单正在被其他操作处理中")
	}

	// Record processing info
	s.processingMutex.Lock()
	s.processingOrders[orderID] = &ProcessingInfo{
		ID:        orderID,
		StartTime: time.Now(),
		Operation: operation,
		UserID:    userID,
	}
	s.processingMutex.Unlock()

	return nil
}

// ReleaseOrderLock releases a lock for order processing
func (s *ConcurrencyValidationService) ReleaseOrderLock(orderID uuid.UUID) {
	s.locksMutex.RLock()
	if lock, exists := s.orderLocks[orderID]; exists {
		lock.Unlock()
	}
	s.locksMutex.RUnlock()

	// Remove processing info
	s.processingMutex.Lock()
	delete(s.processingOrders, orderID)
	s.processingMutex.Unlock()
}

// AcquireAccountLock acquires a lock for account processing
func (s *ConcurrencyValidationService) AcquireAccountLock(accountID uuid.UUID, operation string) error {
	s.locksMutex.Lock()
	defer s.locksMutex.Unlock()

	// Get or create lock for this account
	if _, exists := s.accountLocks[accountID]; !exists {
		s.accountLocks[accountID] = &sync.RWMutex{}
	}

	// Try to acquire lock (non-blocking)
	if !s.accountLocks[accountID].TryLock() {
		return fmt.Errorf("收款账户正在被其他操作使用中")
	}

	// Record processing info
	s.processingMutex.Lock()
	s.processingAccounts[accountID] = &ProcessingInfo{
		ID:        accountID,
		StartTime: time.Now(),
		Operation: operation,
	}
	s.processingMutex.Unlock()

	return nil
}

// ReleaseAccountLock releases a lock for account processing
func (s *ConcurrencyValidationService) ReleaseAccountLock(accountID uuid.UUID) {
	s.locksMutex.RLock()
	if lock, exists := s.accountLocks[accountID]; exists {
		lock.Unlock()
	}
	s.locksMutex.RUnlock()

	// Remove processing info
	s.processingMutex.Lock()
	delete(s.processingAccounts, accountID)
	s.processingMutex.Unlock()
}

// Helper methods

func (s *ConcurrencyValidationService) checkDuplicateOrderConflicts(ctx context.Context, order *repository.RechargeOrder) []ConflictInfo {
	var conflicts []ConflictInfo

	// Check for orders with same payer and similar amount within last hour
	timeWindow := time.Now().Add(-1 * time.Hour)
	
	filter := &repository.RechargeOrderFilter{
		PayerName: &order.PayerAccount, // Using PayerName field as closest match
		StartDate: &timeWindow,
		Status:    []string{"pending", "paid"},
		Limit:     5,
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return conflicts
	}

	for _, similarOrder := range orders {
		if similarOrder.ID != order.ID {
			// Check if amounts are very similar (within 1% or same)
			amountDiff := order.Amount.Sub(similarOrder.Amount).Abs()
			threshold := order.Amount.Mul(decimal.NewFromFloat(0.01)) // 1%
			
			if amountDiff.LessThanOrEqual(threshold) {
				conflicts = append(conflicts, ConflictInfo{
					ResourceID:   similarOrder.ID,
					ResourceType: "similar_order",
					Operation:    "created",
					StartTime:    similarOrder.CreatedAt,
				})
			}
		}
	}

	return conflicts
}

func (s *ConcurrencyValidationService) checkConcurrentTransactions(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) []*repository.RechargeOrder {
	// Check for transactions created in the last 30 seconds that are still processing
	timeWindow := time.Now().Add(-30 * time.Second)
	
	filter := &repository.RechargeOrderFilter{
		StartDate: &timeWindow,
		Status:    []string{"pending", "paid"}, // Processing statuses
		Limit:     10,
	}

	orders, err := s.rechargeOrderRepo.List(ctx, filter)
	if err != nil {
		return nil
	}

	return orders
}

// GetProcessingStatus returns current processing status
func (s *ConcurrencyValidationService) GetProcessingStatus() map[string]interface{} {
	s.processingMutex.RLock()
	defer s.processingMutex.RUnlock()

	return map[string]interface{}{
		"processing_orders_count":   len(s.processingOrders),
		"processing_accounts_count": len(s.processingAccounts),
		"processing_orders":         s.processingOrders,
		"processing_accounts":       s.processingAccounts,
	}
}

// CleanupStaleProcessing cleans up stale processing records
func (s *ConcurrencyValidationService) CleanupStaleProcessing() {
	s.processingMutex.Lock()
	defer s.processingMutex.Unlock()

	staleThreshold := time.Now().Add(-10 * time.Minute)

	// Clean up stale order processing
	for orderID, info := range s.processingOrders {
		if info.StartTime.Before(staleThreshold) {
			delete(s.processingOrders, orderID)
			
			// Also release the lock if it exists
			s.locksMutex.RLock()
			if lock, exists := s.orderLocks[orderID]; exists {
				lock.Unlock()
			}
			s.locksMutex.RUnlock()
		}
	}

	// Clean up stale account processing
	for accountID, info := range s.processingAccounts {
		if info.StartTime.Before(staleThreshold) {
			delete(s.processingAccounts, accountID)
			
			// Also release the lock if it exists
			s.locksMutex.RLock()
			if lock, exists := s.accountLocks[accountID]; exists {
				lock.Unlock()
			}
			s.locksMutex.RUnlock()
		}
	}
}

// Request types

type DuplicateOrderValidationRequest struct {
	PayerName    string          `json:"payer_name"`
	PayerAccount string          `json:"payer_account"`
	MerchantID   uuid.UUID       `json:"merchant_id"`
	Amount       decimal.Decimal `json:"amount"`
}
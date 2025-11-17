package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// BankService defines the bank transfer service interface
type BankService interface {
	// Bank transfer operations
	InitiateBankTransfer(ctx context.Context, req *InitiateBankTransferRequest) (*BankTransferResponse, error)
	ProcessBankCallback(ctx context.Context, callback *BankCallbackRequest) (*BankCallbackResponse, error)
	GetBankTransferStatus(ctx context.Context, orderID uuid.UUID) (*BankTransferStatus, error)
	
	// Bank transfer validation
	ValidateBankCallback(ctx context.Context, callback *BankCallbackRequest) error
	VerifyCallbackSignature(ctx context.Context, callback *BankCallbackRequest) error
	
	// Bank transfer synchronization
	SyncTransferStatus(ctx context.Context, orderID uuid.UUID) (*BankTransferStatus, error)
	RetryFailedTransfers(ctx context.Context) error
	
	// Public refund operations
	InitiatePublicRefund(ctx context.Context, req *InitiatePublicRefundRequest) (*PublicRefundResponse, error)
	ProcessRefundCallback(ctx context.Context, callback *RefundCallbackRequest) (*RefundCallbackResponse, error)
	GetRefundStatus(ctx context.Context, orderID uuid.UUID) (*PublicRefundStatus, error)
}

// Request/Response types for BankService
type InitiateBankTransferRequest struct {
	OrderID         uuid.UUID       `json:"order_id" binding:"required"`
	PayerName       string          `json:"payer_name" binding:"required"`
	PayerAccount    string          `json:"payer_account" binding:"required"`
	Amount          decimal.Decimal `json:"amount" binding:"required"`
	ReceiverName    string          `json:"receiver_name" binding:"required"`
	ReceiverAccount string          `json:"receiver_account" binding:"required"`
	BankName        string          `json:"bank_name" binding:"required"`
	BankBranch      *string         `json:"bank_branch"`
	Purpose         string          `json:"purpose"`
	NotifyURL       string          `json:"notify_url"`
	ReturnURL       string          `json:"return_url"`
}

type BankTransferResponse struct {
	TransferID    string    `json:"transfer_id"`
	OrderID       uuid.UUID `json:"order_id"`
	Status        string    `json:"status"`
	TransferURL   string    `json:"transfer_url"`
	QRCodeURL     *string   `json:"qr_code_url,omitempty"`
	ExpiresAt     time.Time `json:"expires_at"`
	Message       string    `json:"message"`
	BankReference string    `json:"bank_reference"`
}

type BankCallbackRequest struct {
	TransferID    string          `json:"transfer_id" binding:"required"`
	OrderID       string          `json:"order_id" binding:"required"`
	Status        string          `json:"status" binding:"required"`
	Amount        decimal.Decimal `json:"amount" binding:"required"`
	PayerName     string          `json:"payer_name"`
	PayerAccount  string          `json:"payer_account"`
	TransferTime  time.Time       `json:"transfer_time"`
	BankReference string          `json:"bank_reference"`
	FailureReason *string         `json:"failure_reason,omitempty"`
	Signature     string          `json:"signature" binding:"required"`
	Timestamp     int64           `json:"timestamp" binding:"required"`
}

type BankCallbackResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

type BankTransferStatus struct {
	TransferID    string          `json:"transfer_id"`
	OrderID       uuid.UUID       `json:"order_id"`
	Status        string          `json:"status"`
	Amount        decimal.Decimal `json:"amount"`
	PayerName     *string         `json:"payer_name,omitempty"`
	PayerAccount  *string         `json:"payer_account,omitempty"`
	TransferTime  *time.Time      `json:"transfer_time,omitempty"`
	BankReference *string         `json:"bank_reference,omitempty"`
	FailureReason *string         `json:"failure_reason,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Public refund request/response types
type InitiatePublicRefundRequest struct {
	OrderID         uuid.UUID       `json:"order_id" binding:"required"`
	RefundAmount    decimal.Decimal `json:"refund_amount" binding:"required"`
	RefundReason    string          `json:"refund_reason" binding:"required"`
	RefundAccount   string          `json:"refund_account" binding:"required"`
	RefundName      string          `json:"refund_name" binding:"required"`
	BankName        string          `json:"bank_name" binding:"required"`
	BankBranch      *string         `json:"bank_branch"`
	NotifyURL       string          `json:"notify_url"`
	OriginalTransferID string       `json:"original_transfer_id"`
}

type PublicRefundResponse struct {
	RefundID      string    `json:"refund_id"`
	OrderID       uuid.UUID `json:"order_id"`
	Status        string    `json:"status"`
	RefundAmount  decimal.Decimal `json:"refund_amount"`
	BankReference string    `json:"bank_reference"`
	ExpiresAt     time.Time `json:"expires_at"`
	Message       string    `json:"message"`
}

type RefundCallbackRequest struct {
	RefundID      string          `json:"refund_id" binding:"required"`
	OrderID       string          `json:"order_id" binding:"required"`
	Status        string          `json:"status" binding:"required"`
	RefundAmount  decimal.Decimal `json:"refund_amount" binding:"required"`
	RefundTime    time.Time       `json:"refund_time"`
	BankReference string          `json:"bank_reference"`
	FailureReason *string         `json:"failure_reason,omitempty"`
	Signature     string          `json:"signature" binding:"required"`
	Timestamp     int64           `json:"timestamp" binding:"required"`
}

type RefundCallbackResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

type PublicRefundStatus struct {
	RefundID      string          `json:"refund_id"`
	OrderID       uuid.UUID       `json:"order_id"`
	Status        string          `json:"status"`
	RefundAmount  decimal.Decimal `json:"refund_amount"`
	RefundTime    *time.Time      `json:"refund_time,omitempty"`
	BankReference *string         `json:"bank_reference,omitempty"`
	FailureReason *string         `json:"failure_reason,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// Bank transfer status constants
const (
	BankTransferStatusPending   = "pending"
	BankTransferStatusSuccess   = "success"
	BankTransferStatusFailed    = "failed"
	BankTransferStatusExpired   = "expired"
	BankTransferStatusCancelled = "cancelled"
)

// Public refund status constants
const (
	PublicRefundStatusPending   = "pending"
	PublicRefundStatusSuccess   = "success"
	PublicRefundStatusFailed    = "failed"
	PublicRefundStatusExpired   = "expired"
	PublicRefundStatusCancelled = "cancelled"
)

// bankService implements BankService interface
type bankService struct {
	rechargeOrderRepo repository.RechargeOrderRepository
	bankConfig        *BankConfig
}

// BankConfig holds bank service configuration
type BankConfig struct {
	APIBaseURL    string
	APIKey        string
	APISecret     string
	NotifyURL     string
	ReturnURL     string
	SignatureKey  string
	Timeout       time.Duration
	RetryAttempts int
}

// NewBankService creates a new bank service
func NewBankService(
	rechargeOrderRepo repository.RechargeOrderRepository,
	config *BankConfig,
) BankService {
	if config == nil {
		config = &BankConfig{
			APIBaseURL:    "https://api.bank.example.com",
			Timeout:       30 * time.Second,
			RetryAttempts: 3,
		}
	}
	
	return &bankService{
		rechargeOrderRepo: rechargeOrderRepo,
		bankConfig:        config,
	}
}

// InitiateBankTransfer initiates a bank transfer for public recharge
func (s *bankService) InitiateBankTransfer(ctx context.Context, req *InitiateBankTransferRequest) (*BankTransferResponse, error) {
	// Validate order exists and is eligible for bank transfer
	order, err := s.rechargeOrderRepo.GetByID(ctx, req.OrderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get recharge order: %w", err)
	}

	if order.PaymentType != "public" {
		return nil, fmt.Errorf("bank transfer is only available for public recharge orders")
	}

	if order.Status != "pending" {
		return nil, fmt.Errorf("order status must be pending, current status: %s", order.Status)
	}

	// Generate transfer ID
	transferID := s.generateTransferID(req.OrderID)

	// Prepare bank API request
	bankReq := map[string]interface{}{
		"transfer_id":      transferID,
		"order_id":         req.OrderID.String(),
		"payer_name":       req.PayerName,
		"payer_account":    req.PayerAccount,
		"amount":           req.Amount.String(),
		"receiver_name":    req.ReceiverName,
		"receiver_account": req.ReceiverAccount,
		"bank_name":        req.BankName,
		"bank_branch":      req.BankBranch,
		"purpose":          req.Purpose,
		"notify_url":       req.NotifyURL,
		"return_url":       req.ReturnURL,
		"timestamp":        time.Now().Unix(),
	}

	// Add signature
	signature, err := s.generateSignature(bankReq)
	if err != nil {
		return nil, fmt.Errorf("failed to generate signature: %w", err)
	}
	bankReq["signature"] = signature

	// For demo purposes, simulate bank API response
	// In real implementation, this would make HTTP request to bank API
	response := s.simulateBankAPIResponse(transferID, req)

	// Store transfer information (in real implementation, you might want a separate table)
	// For now, we'll update the order with bank reference
	order.Remark = &response.BankReference
	order.UpdatedAt = time.Now()
	
	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to update order with bank reference: %w", err)
	}

	return response, nil
}

// ProcessBankCallback processes bank transfer callback
func (s *bankService) ProcessBankCallback(ctx context.Context, callback *BankCallbackRequest) (*BankCallbackResponse, error) {
	// Validate callback signature
	if err := s.VerifyCallbackSignature(ctx, callback); err != nil {
		return &BankCallbackResponse{
			Success: false,
			Message: "Invalid signature",
			Code:    "INVALID_SIGNATURE",
		}, nil
	}

	// Validate callback data
	if err := s.ValidateBankCallback(ctx, callback); err != nil {
		return &BankCallbackResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid callback data: %v", err),
			Code:    "INVALID_DATA",
		}, nil
	}

	// Parse order ID
	orderID, err := uuid.Parse(callback.OrderID)
	if err != nil {
		return &BankCallbackResponse{
			Success: false,
			Message: "Invalid order ID format",
			Code:    "INVALID_ORDER_ID",
		}, nil
	}

	// Get order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return &BankCallbackResponse{
			Success: false,
			Message: "Order not found",
			Code:    "ORDER_NOT_FOUND",
		}, nil
	}

	// Validate order amount matches callback amount
	if !order.Amount.Equal(callback.Amount) {
		return &BankCallbackResponse{
			Success: false,
			Message: "Amount mismatch",
			Code:    "AMOUNT_MISMATCH",
		}, nil
	}

	// Update order status based on callback status
	var newStatus string

	switch callback.Status {
	case BankTransferStatusSuccess:
		newStatus = "paid"
	case BankTransferStatusFailed:
		newStatus = "failed"
	case BankTransferStatusExpired:
		newStatus = "cancelled"
	case BankTransferStatusCancelled:
		newStatus = "cancelled"
	default:
		return &BankCallbackResponse{
			Success: false,
			Message: "Unknown transfer status",
			Code:    "UNKNOWN_STATUS",
		}, nil
	}

	// Update order
	order.Status = newStatus
	order.UpdatedAt = time.Now()
	if callback.BankReference != "" {
		bankRef := fmt.Sprintf("Bank Reference: %s", callback.BankReference)
		order.Remark = &bankRef
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return &BankCallbackResponse{
			Success: false,
			Message: "Failed to update order",
			Code:    "UPDATE_FAILED",
		}, nil
	}

	// TODO: Create order status log entry
	// TODO: Send notification to ad account system if payment successful

	return &BankCallbackResponse{
		Success: true,
		Message: "Callback processed successfully",
		Code:    "SUCCESS",
	}, nil
}

// GetBankTransferStatus gets the current status of a bank transfer
func (s *bankService) GetBankTransferStatus(ctx context.Context, orderID uuid.UUID) (*BankTransferStatus, error) {
	// Get order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get recharge order: %w", err)
	}

	// In real implementation, this might query bank API for latest status
	// For now, we'll return status based on order status
	var transferStatus string
	switch order.Status {
	case "pending":
		transferStatus = BankTransferStatusPending
	case "paid":
		transferStatus = BankTransferStatusSuccess
	case "failed":
		transferStatus = BankTransferStatusFailed
	case "cancelled":
		transferStatus = BankTransferStatusCancelled
	default:
		transferStatus = BankTransferStatusPending
	}

	status := &BankTransferStatus{
		TransferID:   s.generateTransferID(orderID),
		OrderID:      orderID,
		Status:       transferStatus,
		Amount:       order.Amount,
		CreatedAt:    order.CreatedAt,
		UpdatedAt:    order.UpdatedAt,
	}

	if order.Remark != nil {
		bankRef := *order.Remark
		status.BankReference = &bankRef
	}

	return status, nil
}

// ValidateBankCallback validates bank callback data
func (s *bankService) ValidateBankCallback(ctx context.Context, callback *BankCallbackRequest) error {
	// Validate timestamp (should be within 5 minutes)
	now := time.Now().Unix()
	if abs(now-callback.Timestamp) > 300 {
		return fmt.Errorf("callback timestamp is too old or too new")
	}

	// Validate status
	validStatuses := []string{
		BankTransferStatusSuccess,
		BankTransferStatusFailed,
		BankTransferStatusExpired,
		BankTransferStatusCancelled,
	}
	
	isValidStatus := false
	for _, status := range validStatuses {
		if callback.Status == status {
			isValidStatus = true
			break
		}
	}
	
	if !isValidStatus {
		return fmt.Errorf("invalid transfer status: %s", callback.Status)
	}

	// Validate amount
	if callback.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("invalid amount: %s", callback.Amount.String())
	}

	return nil
}

// VerifyCallbackSignature verifies the signature of bank callback
func (s *bankService) VerifyCallbackSignature(ctx context.Context, callback *BankCallbackRequest) error {
	// Prepare data for signature verification
	data := map[string]interface{}{
		"transfer_id":    callback.TransferID,
		"order_id":       callback.OrderID,
		"status":         callback.Status,
		"amount":         callback.Amount.String(),
		"payer_name":     callback.PayerName,
		"payer_account":  callback.PayerAccount,
		"bank_reference": callback.BankReference,
		"timestamp":      callback.Timestamp,
	}

	// Generate expected signature
	expectedSignature, err := s.generateSignature(data)
	if err != nil {
		return fmt.Errorf("failed to generate expected signature: %w", err)
	}

	// Compare signatures
	if callback.Signature != expectedSignature {
		return fmt.Errorf("signature verification failed")
	}

	return nil
}

// SyncTransferStatus synchronizes transfer status with bank
func (s *bankService) SyncTransferStatus(ctx context.Context, orderID uuid.UUID) (*BankTransferStatus, error) {
	// In real implementation, this would query bank API for latest status
	// For now, we'll just return current status
	return s.GetBankTransferStatus(ctx, orderID)
}

// RetryFailedTransfers retries failed bank transfers
func (s *bankService) RetryFailedTransfers(ctx context.Context) error {
	// In real implementation, this would:
	// 1. Query for failed transfers that are eligible for retry
	// 2. Retry the transfers
	// 3. Update status based on results
	
	// For now, this is a placeholder
	return nil
}

// Helper functions

// generateTransferID generates a unique transfer ID
func (s *bankService) generateTransferID(orderID uuid.UUID) string {
	// Format: BT + timestamp + first 8 chars of order ID
	timestamp := time.Now().Format("20060102150405")
	orderPrefix := orderID.String()[:8]
	return fmt.Sprintf("BT%s%s", timestamp, orderPrefix)
}

// generateSignature generates HMAC signature for API requests
func (s *bankService) generateSignature(data map[string]interface{}) (string, error) {
	// Convert data to JSON and sort keys for consistent signature
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal data: %w", err)
	}

	// Generate HMAC-SHA256 signature
	h := hmac.New(sha256.New, []byte(s.bankConfig.SignatureKey))
	h.Write(jsonData)
	signature := hex.EncodeToString(h.Sum(nil))

	return signature, nil
}

// simulateBankAPIResponse simulates bank API response for demo purposes
func (s *bankService) simulateBankAPIResponse(transferID string, req *InitiateBankTransferRequest) *BankTransferResponse {
	// In real implementation, this would make HTTP request to bank API
	return &BankTransferResponse{
		TransferID:    transferID,
		OrderID:       req.OrderID,
		Status:        BankTransferStatusPending,
		TransferURL:   fmt.Sprintf("https://bank.example.com/transfer/%s", transferID),
		QRCodeURL:     nil, // Some banks provide QR codes for mobile transfers
		ExpiresAt:     time.Now().Add(30 * time.Minute),
		Message:       "Bank transfer initiated successfully",
		BankReference: fmt.Sprintf("REF%s", transferID),
	}
}

// InitiatePublicRefund initiates a public refund for a recharge order
func (s *bankService) InitiatePublicRefund(ctx context.Context, req *InitiatePublicRefundRequest) (*PublicRefundResponse, error) {
	// Validate order exists and is eligible for refund
	order, err := s.rechargeOrderRepo.GetByID(ctx, req.OrderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get recharge order: %w", err)
	}

	if order.PaymentType != "public" {
		return nil, fmt.Errorf("public refund is only available for public recharge orders")
	}

	// Validate order status (can refund confirmed or completed orders)
	if order.Status != "confirmed" && order.Status != "completed" {
		return nil, fmt.Errorf("order status must be confirmed or completed, current status: %s", order.Status)
	}

	// Validate refund amount
	if req.RefundAmount.GreaterThan(order.Amount) {
		return nil, fmt.Errorf("refund amount cannot exceed original amount")
	}

	if req.RefundAmount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("refund amount must be greater than zero")
	}

	// Generate refund ID
	refundID := s.generateRefundID(req.OrderID)

	// Prepare bank API request for refund
	bankReq := map[string]interface{}{
		"refund_id":           refundID,
		"order_id":            req.OrderID.String(),
		"original_transfer_id": req.OriginalTransferID,
		"refund_amount":       req.RefundAmount.String(),
		"refund_reason":       req.RefundReason,
		"refund_account":      req.RefundAccount,
		"refund_name":         req.RefundName,
		"bank_name":           req.BankName,
		"bank_branch":         req.BankBranch,
		"notify_url":          req.NotifyURL,
		"timestamp":           time.Now().Unix(),
	}

	// Add signature
	signature, err := s.generateSignature(bankReq)
	if err != nil {
		return nil, fmt.Errorf("failed to generate signature: %w", err)
	}
	bankReq["signature"] = signature

	// For demo purposes, simulate bank API response
	// In real implementation, this would make HTTP request to bank API
	response := s.simulateBankRefundAPIResponse(refundID, req)

	// Store refund information (in real implementation, you might want a separate refunds table)
	// For now, we'll update the order status to indicate refund is in progress
	order.Status = "refunding"
	order.UpdatedAt = time.Now()
	refundRemark := fmt.Sprintf("Refund initiated: %s - %s", refundID, req.RefundReason)
	order.Remark = &refundRemark

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to update order with refund information: %w", err)
	}

	return response, nil
}

// ProcessRefundCallback processes public refund callback
func (s *bankService) ProcessRefundCallback(ctx context.Context, callback *RefundCallbackRequest) (*RefundCallbackResponse, error) {
	// Validate callback signature
	if err := s.verifyRefundCallbackSignature(ctx, callback); err != nil {
		return &RefundCallbackResponse{
			Success: false,
			Message: "Invalid signature",
			Code:    "INVALID_SIGNATURE",
		}, nil
	}

	// Validate callback data
	if err := s.validateRefundCallback(ctx, callback); err != nil {
		return &RefundCallbackResponse{
			Success: false,
			Message: fmt.Sprintf("Invalid callback data: %v", err),
			Code:    "INVALID_DATA",
		}, nil
	}

	// Parse order ID
	orderID, err := uuid.Parse(callback.OrderID)
	if err != nil {
		return &RefundCallbackResponse{
			Success: false,
			Message: "Invalid order ID format",
			Code:    "INVALID_ORDER_ID",
		}, nil
	}

	// Get order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return &RefundCallbackResponse{
			Success: false,
			Message: "Order not found",
			Code:    "ORDER_NOT_FOUND",
		}, nil
	}

	// Update order status based on refund callback status
	var newStatus string

	switch callback.Status {
	case PublicRefundStatusSuccess:
		newStatus = "refunded"
	case PublicRefundStatusFailed:
		newStatus = "confirmed" // Revert to confirmed if refund failed
	case PublicRefundStatusExpired:
		newStatus = "confirmed" // Revert to confirmed if refund expired
	case PublicRefundStatusCancelled:
		newStatus = "confirmed" // Revert to confirmed if refund cancelled
	default:
		return &RefundCallbackResponse{
			Success: false,
			Message: "Unknown refund status",
			Code:    "UNKNOWN_STATUS",
		}, nil
	}

	// Update order
	order.Status = newStatus
	order.UpdatedAt = time.Now()
	if callback.BankReference != "" {
		refundRef := fmt.Sprintf("Refund Reference: %s", callback.BankReference)
		order.Remark = &refundRef
	}

	err = s.rechargeOrderRepo.Update(ctx, order)
	if err != nil {
		return &RefundCallbackResponse{
			Success: false,
			Message: "Failed to update order",
			Code:    "UPDATE_FAILED",
		}, nil
	}

	// TODO: Create refund status log entry
	// TODO: Send notification about refund status

	return &RefundCallbackResponse{
		Success: true,
		Message: "Refund callback processed successfully",
		Code:    "SUCCESS",
	}, nil
}

// GetRefundStatus gets the current status of a public refund
func (s *bankService) GetRefundStatus(ctx context.Context, orderID uuid.UUID) (*PublicRefundStatus, error) {
	// Get order
	order, err := s.rechargeOrderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get recharge order: %w", err)
	}

	// In real implementation, this might query bank API for latest refund status
	// For now, we'll return status based on order status
	var refundStatus string
	switch order.Status {
	case "refunding":
		refundStatus = PublicRefundStatusPending
	case "refunded":
		refundStatus = PublicRefundStatusSuccess
	case "confirmed", "completed":
		// Check if there was a failed refund attempt
		if order.Remark != nil && strings.Contains(*order.Remark, "Refund") {
			refundStatus = PublicRefundStatusFailed
		} else {
			return nil, fmt.Errorf("no refund found for this order")
		}
	default:
		return nil, fmt.Errorf("order is not in a refundable state")
	}

	status := &PublicRefundStatus{
		RefundID:     s.generateRefundID(orderID),
		OrderID:      orderID,
		Status:       refundStatus,
		RefundAmount: order.Amount, // In real implementation, this would be stored separately
		CreatedAt:    order.CreatedAt,
		UpdatedAt:    order.UpdatedAt,
	}

	if order.Remark != nil {
		bankRef := *order.Remark
		status.BankReference = &bankRef
	}

	return status, nil
}

// Helper functions for refund operations

// generateRefundID generates a unique refund ID
func (s *bankService) generateRefundID(orderID uuid.UUID) string {
	// Format: RF + timestamp + first 8 chars of order ID
	timestamp := time.Now().Format("20060102150405")
	orderPrefix := orderID.String()[:8]
	return fmt.Sprintf("RF%s%s", timestamp, orderPrefix)
}

// validateRefundCallback validates refund callback data
func (s *bankService) validateRefundCallback(ctx context.Context, callback *RefundCallbackRequest) error {
	// Validate timestamp (should be within 5 minutes)
	now := time.Now().Unix()
	if abs(now-callback.Timestamp) > 300 {
		return fmt.Errorf("callback timestamp is too old or too new")
	}

	// Validate status
	validStatuses := []string{
		PublicRefundStatusSuccess,
		PublicRefundStatusFailed,
		PublicRefundStatusExpired,
		PublicRefundStatusCancelled,
	}

	isValidStatus := false
	for _, status := range validStatuses {
		if callback.Status == status {
			isValidStatus = true
			break
		}
	}

	if !isValidStatus {
		return fmt.Errorf("invalid refund status: %s", callback.Status)
	}

	// Validate amount
	if callback.RefundAmount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("invalid refund amount: %s", callback.RefundAmount.String())
	}

	return nil
}

// verifyRefundCallbackSignature verifies the signature of refund callback
func (s *bankService) verifyRefundCallbackSignature(ctx context.Context, callback *RefundCallbackRequest) error {
	// Prepare data for signature verification
	data := map[string]interface{}{
		"refund_id":      callback.RefundID,
		"order_id":       callback.OrderID,
		"status":         callback.Status,
		"refund_amount":  callback.RefundAmount.String(),
		"bank_reference": callback.BankReference,
		"timestamp":      callback.Timestamp,
	}

	// Generate expected signature
	expectedSignature, err := s.generateSignature(data)
	if err != nil {
		return fmt.Errorf("failed to generate expected signature: %w", err)
	}

	// Compare signatures
	if callback.Signature != expectedSignature {
		return fmt.Errorf("signature verification failed")
	}

	return nil
}

// simulateBankRefundAPIResponse simulates bank API response for refund
func (s *bankService) simulateBankRefundAPIResponse(refundID string, req *InitiatePublicRefundRequest) *PublicRefundResponse {
	// In real implementation, this would make HTTP request to bank API
	return &PublicRefundResponse{
		RefundID:      refundID,
		OrderID:       req.OrderID,
		Status:        PublicRefundStatusPending,
		RefundAmount:  req.RefundAmount,
		BankReference: fmt.Sprintf("REFREF%s", refundID),
		ExpiresAt:     time.Now().Add(24 * time.Hour), // Refunds typically have longer expiry
		Message:       "Public refund initiated successfully",
	}
}

// abs returns the absolute value of an integer
func abs(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}
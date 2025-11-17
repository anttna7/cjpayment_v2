package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// paymentProcessor implements PaymentProcessor interface
type paymentProcessor struct {
	channelManager PaymentChannelManager
	rechargeRepo   repository.RechargeOrderRepository
	
	// Configuration
	defaultTimeout time.Duration
	maxRetries     int
}

// NewPaymentProcessor creates a new payment processor
func NewPaymentProcessor(
	channelManager PaymentChannelManager,
	rechargeRepo repository.RechargeOrderRepository,
) PaymentProcessor {
	return &paymentProcessor{
		channelManager: channelManager,
		rechargeRepo:   rechargeRepo,
		defaultTimeout: 30 * time.Second,
		maxRetries:     3,
	}
}

// ProcessPayment processes a payment using the best available channel
func (p *paymentProcessor) ProcessPayment(ctx context.Context, req *ProcessPaymentRequest) (*PaymentResult, error) {
	if req == nil {
		return nil, errors.New("payment request cannot be nil")
	}
	
	if err := p.validatePaymentRequest(req); err != nil {
		return nil, fmt.Errorf("invalid payment request: %w", err)
	}
	
	// Select payment channel
	selectionReq := &ChannelSelectionRequest{
		Amount:            req.Amount,
		Currency:          req.Currency,
		PaymentType:       req.PaymentType,
		MerchantID:        req.MerchantID,
		PreferredChannels: []string{req.PreferredChannel},
	}
	
	channel, err := p.channelManager.SelectChannel(ctx, selectionReq)
	if err != nil {
		return nil, fmt.Errorf("failed to select payment channel: %w", err)
	}
	
	// Generate payment ID
	paymentID := p.generatePaymentID(req.OrderID)
	
	// Create payment request for channel
	channelReq := &CreatePaymentRequest{
		OrderID:      req.OrderID,
		PaymentID:    paymentID,
		Amount:       req.Amount,
		Currency:     req.Currency,
		PaymentType:  req.PaymentType,
		PayerInfo:    req.PayerInfo,
		ReceiverInfo: req.ReceiverInfo,
		Description:  req.Description,
		NotifyURL:    req.NotifyURL,
		ReturnURL:    req.ReturnURL,
		ExtraParams:  req.ExtraParams,
	}
	
	// Process payment through channel
	channelResp, err := channel.CreatePayment(ctx, channelReq)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment: %w", err)
	}
	
	// Create payment result
	result := &PaymentResult{
		OrderID:          req.OrderID,
		PaymentID:        paymentID,
		ChannelID:        channel.GetChannelID(),
		ChannelPaymentID: channelResp.ChannelPaymentID,
		Status:           channelResp.Status,
		Amount:           req.Amount,
		PaymentURL:       channelResp.PaymentURL,
		QRCode:           channelResp.QRCode,
		ExtraData:        channelResp.ExtraData,
		CreatedAt:        channelResp.CreatedAt,
		ExpireTime:       channelResp.ExpireTime,
	}
	
	// Update order with payment information
	if err := p.updateOrderPaymentInfo(ctx, req.OrderID, result); err != nil {
		// Log error but don't fail the payment
		// TODO: Add proper logging
	}
	
	return result, nil
}

// QueryPaymentStatus queries payment status
func (p *paymentProcessor) QueryPaymentStatus(ctx context.Context, orderID uuid.UUID) (*PaymentStatusResult, error) {
	// Get order information
	order, err := p.rechargeRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}
	
	// Get payment channel
	// For now, we'll need to store channel ID in the order or derive it
	// This is a simplified implementation
	channels := p.channelManager.ListChannels()
	if len(channels) == 0 {
		return nil, errors.New("no payment channels available")
	}
	
	// Try to query from all channels (in real implementation, we'd store the channel ID)
	for _, channel := range channels {
		paymentID := p.generatePaymentID(orderID)
		status, err := channel.QueryPayment(ctx, paymentID)
		if err != nil {
			continue // Try next channel
		}
		
		result := &PaymentStatusResult{
			OrderID:          orderID,
			PaymentID:        paymentID,
			ChannelID:        channel.GetChannelID(),
			ChannelPaymentID: status.ChannelPaymentID,
			Status:           status.Status,
			Amount:           status.Amount,
			PaidAmount:       status.PaidAmount,
			Currency:         status.Currency,
			PaymentTime:      status.PaymentTime,
			FailureReason:    status.FailureReason,
			ExtraData:        status.ExtraData,
			UpdatedAt:        status.UpdatedAt,
		}
		
		// Update order status if needed
		if p.shouldUpdateOrderStatus(order.Status, status.Status) {
			if err := p.updateOrderStatus(ctx, orderID, status.Status); err != nil {
				// Log error but don't fail the query
			}
		}
		
		return result, nil
	}
	
	return nil, errors.New("payment not found in any channel")
}

// CancelPayment cancels a payment
func (p *paymentProcessor) CancelPayment(ctx context.Context, orderID uuid.UUID, reason string) (*CancelResult, error) {
	// Get order information
	order, err := p.rechargeRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}
	
	// Check if order can be cancelled
	if !p.canCancelOrder(order.Status) {
		return nil, fmt.Errorf("order with status %s cannot be cancelled", order.Status)
	}
	
	// Get payment channel and cancel payment
	channels := p.channelManager.ListChannels()
	paymentID := p.generatePaymentID(orderID)
	
	var lastError error
	for _, channel := range channels {
		cancelResp, err := channel.CancelPayment(ctx, paymentID)
		if err != nil {
			lastError = err
			continue
		}
		
		result := &CancelResult{
			OrderID:       orderID,
			PaymentID:     paymentID,
			Status:        cancelResp.Status,
			CancelledAt:   cancelResp.CancelledAt,
			FailureReason: cancelResp.FailureReason,
		}
		
		// Update order status
		if err := p.updateOrderStatus(ctx, orderID, PaymentStatusCancelled); err != nil {
			// Log error but don't fail the cancellation
		}
		
		return result, nil
	}
	
	if lastError != nil {
		return nil, fmt.Errorf("failed to cancel payment: %w", lastError)
	}
	
	return nil, errors.New("no channels available for cancellation")
}

// ProcessRefund processes a refund
func (p *paymentProcessor) ProcessRefund(ctx context.Context, req *ProcessRefundRequest) (*RefundResult, error) {
	if req == nil {
		return nil, errors.New("refund request cannot be nil")
	}
	
	// Get order information
	order, err := p.rechargeRepo.GetByID(ctx, req.OrderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}
	
	// Check if order can be refunded
	if !p.canRefundOrder(order.Status) {
		return nil, fmt.Errorf("order with status %s cannot be refunded", order.Status)
	}
	
	// Get payment channel and process refund
	channels := p.channelManager.ListChannels()
	
	var lastError error
	for _, channel := range channels {
		refundReq := &RefundPaymentRequest{
			PaymentID:   req.PaymentID,
			RefundID:    req.RefundID,
			Amount:      req.Amount,
			Reason:      req.Reason,
			NotifyURL:   req.NotifyURL,
			ExtraParams: req.ExtraParams,
		}
		
		refundResp, err := channel.RefundPayment(ctx, refundReq)
		if err != nil {
			lastError = err
			continue
		}
		
		result := &RefundResult{
			OrderID:         req.OrderID,
			PaymentID:       req.PaymentID,
			RefundID:        req.RefundID,
			ChannelRefundID: refundResp.ChannelRefundID,
			Status:          refundResp.Status,
			Amount:          refundResp.Amount,
			RefundedAt:      refundResp.RefundedAt,
			FailureReason:   refundResp.FailureReason,
		}
		
		// Update order status if refund is successful
		if refundResp.Status == PaymentStatusRefunded {
			if err := p.updateOrderStatus(ctx, req.OrderID, PaymentStatusRefunded); err != nil {
				// Log error but don't fail the refund
			}
		}
		
		return result, nil
	}
	
	if lastError != nil {
		return nil, fmt.Errorf("failed to process refund: %w", lastError)
	}
	
	return nil, errors.New("no channels available for refund")
}

// BatchQueryPayments queries multiple payment statuses
func (p *paymentProcessor) BatchQueryPayments(ctx context.Context, orderIDs []uuid.UUID) ([]*PaymentStatusResult, error) {
	if len(orderIDs) == 0 {
		return nil, errors.New("order IDs cannot be empty")
	}
	
	results := make([]*PaymentStatusResult, 0, len(orderIDs))
	
	for _, orderID := range orderIDs {
		result, err := p.QueryPaymentStatus(ctx, orderID)
		if err != nil {
			// Create error result
			result = &PaymentStatusResult{
				OrderID:       orderID,
				Status:        PaymentStatusFailed,
				FailureReason: err.Error(),
				UpdatedAt:     time.Now(),
			}
		}
		results = append(results, result)
	}
	
	return results, nil
}

// BatchCancelPayments cancels multiple payments
func (p *paymentProcessor) BatchCancelPayments(ctx context.Context, requests []*BatchCancelRequest) ([]*CancelResult, error) {
	if len(requests) == 0 {
		return nil, errors.New("cancel requests cannot be empty")
	}
	
	results := make([]*CancelResult, 0, len(requests))
	
	for _, req := range requests {
		result, err := p.CancelPayment(ctx, req.OrderID, req.Reason)
		if err != nil {
			// Create error result
			result = &CancelResult{
				OrderID:       req.OrderID,
				Status:        PaymentStatusFailed,
				FailureReason: err.Error(),
				CancelledAt:   time.Now(),
			}
		}
		results = append(results, result)
	}
	
	return results, nil
}

// ProcessWebhook processes webhook from payment channels
func (p *paymentProcessor) ProcessWebhook(ctx context.Context, channelID string, payload []byte, headers map[string]string) (*WebhookProcessResult, error) {
	// Get payment channel
	channel, err := p.channelManager.GetChannel(channelID)
	if err != nil {
		return nil, fmt.Errorf("channel not found: %w", err)
	}
	
	// Process webhook
	webhookResult, err := channel.HandleWebhook(ctx, payload, headers)
	if err != nil {
		return &WebhookProcessResult{
			EventType:    "unknown",
			Status:       "failed",
			ProcessedAt:  time.Now(),
			ShouldRetry:  true,
			ErrorMessage: err.Error(),
		}, nil
	}
	
	// Extract order ID from payment ID
	orderID, err := p.extractOrderIDFromPaymentID(webhookResult.PaymentID)
	if err != nil {
		return &WebhookProcessResult{
			PaymentID:    webhookResult.PaymentID,
			EventType:    webhookResult.EventType,
			Status:       "failed",
			ProcessedAt:  time.Now(),
			ShouldRetry:  false,
			ErrorMessage: "invalid payment ID format",
		}, nil
	}
	
	// Update order status based on webhook event
	if err := p.processWebhookEvent(ctx, orderID, webhookResult); err != nil {
		return &WebhookProcessResult{
			OrderID:      orderID,
			PaymentID:    webhookResult.PaymentID,
			EventType:    webhookResult.EventType,
			Status:       "failed",
			ProcessedAt:  time.Now(),
			ShouldRetry:  true,
			ErrorMessage: err.Error(),
		}, nil
	}
	
	return &WebhookProcessResult{
		OrderID:     orderID,
		PaymentID:   webhookResult.PaymentID,
		EventType:   webhookResult.EventType,
		Status:      "success",
		ProcessedAt: time.Now(),
		ShouldRetry: false,
	}, nil
}

// RetryFailedPayments retries failed payments
func (p *paymentProcessor) RetryFailedPayments(ctx context.Context, filter *RetryFilter) (*RetryResult, error) {
	// This would query failed payments from database and retry them
	// For now, return empty result
	return &RetryResult{
		TotalCount:   0,
		SuccessCount: 0,
		FailureCount: 0,
		Results:      []*PaymentStatusResult{},
		ProcessedAt:  time.Now(),
	}, nil
}

// RecoverPaymentStatus recovers payment status from channel
func (p *paymentProcessor) RecoverPaymentStatus(ctx context.Context, orderID uuid.UUID) (*PaymentStatusResult, error) {
	return p.QueryPaymentStatus(ctx, orderID)
}

// Helper methods

func (p *paymentProcessor) validatePaymentRequest(req *ProcessPaymentRequest) error {
	if req.OrderID == uuid.Nil {
		return errors.New("order ID is required")
	}
	
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return errors.New("amount must be greater than zero")
	}
	
	if req.Currency == "" {
		return errors.New("currency is required")
	}
	
	if req.PaymentType == "" {
		return errors.New("payment type is required")
	}
	
	if req.MerchantID == uuid.Nil {
		return errors.New("merchant ID is required")
	}
	
	return nil
}

func (p *paymentProcessor) generatePaymentID(orderID uuid.UUID) string {
	return fmt.Sprintf("PAY_%s_%d", orderID.String(), time.Now().Unix())
}

func (p *paymentProcessor) extractOrderIDFromPaymentID(paymentID string) (uuid.UUID, error) {
	// This is a simplified implementation
	// In real implementation, you'd parse the payment ID format
	// For now, assume payment ID format is "PAY_{orderID}_{timestamp}"
	
	if len(paymentID) < 40 { // "PAY_" + UUID length
		return uuid.Nil, errors.New("invalid payment ID format")
	}
	
	orderIDStr := paymentID[4:40] // Extract UUID part
	return uuid.Parse(orderIDStr)
}

func (p *paymentProcessor) updateOrderPaymentInfo(ctx context.Context, orderID uuid.UUID, result *PaymentResult) error {
	// Update order with payment information
	// This would typically update fields like payment_id, channel_id, etc.
	// For now, just update the status
	return p.updateOrderStatus(ctx, orderID, result.Status)
}

func (p *paymentProcessor) updateOrderStatus(ctx context.Context, orderID uuid.UUID, status string) error {
	// Get current order
	order, err := p.rechargeRepo.GetByID(ctx, orderID)
	if err != nil {
		return err
	}
	
	// Update status
	order.Status = status
	order.UpdatedAt = time.Now()
	
	return p.rechargeRepo.Update(ctx, order)
}

func (p *paymentProcessor) shouldUpdateOrderStatus(currentStatus, newStatus string) bool {
	// Define status transition rules
	transitions := map[string][]string{
		PaymentStatusPending: {PaymentStatusPaid, PaymentStatusFailed, PaymentStatusCancelled, PaymentStatusExpired},
		PaymentStatusPaid:    {PaymentStatusRefunded},
		PaymentStatusFailed:  {PaymentStatusPending}, // Allow retry
	}
	
	allowedTransitions, exists := transitions[currentStatus]
	if !exists {
		return false
	}
	
	for _, allowed := range allowedTransitions {
		if allowed == newStatus {
			return true
		}
	}
	
	return false
}

func (p *paymentProcessor) canCancelOrder(status string) bool {
	cancellableStatuses := []string{PaymentStatusPending}
	
	for _, cancellable := range cancellableStatuses {
		if status == cancellable {
			return true
		}
	}
	
	return false
}

func (p *paymentProcessor) canRefundOrder(status string) bool {
	refundableStatuses := []string{PaymentStatusPaid}
	
	for _, refundable := range refundableStatuses {
		if status == refundable {
			return true
		}
	}
	
	return false
}

func (p *paymentProcessor) processWebhookEvent(ctx context.Context, orderID uuid.UUID, webhookResult *WebhookResult) error {
	// Process different webhook events
	switch webhookResult.EventType {
	case EventTypePaymentPaid:
		return p.updateOrderStatus(ctx, orderID, PaymentStatusPaid)
	case EventTypePaymentFailed:
		return p.updateOrderStatus(ctx, orderID, PaymentStatusFailed)
	case EventTypePaymentCancelled:
		return p.updateOrderStatus(ctx, orderID, PaymentStatusCancelled)
	case EventTypePaymentExpired:
		return p.updateOrderStatus(ctx, orderID, PaymentStatusExpired)
	case EventTypeRefundCompleted:
		return p.updateOrderStatus(ctx, orderID, PaymentStatusRefunded)
	default:
		// Unknown event type, don't update status
		return nil
	}
}
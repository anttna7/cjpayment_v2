package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// paymentChannelService implements PaymentChannelService interface
type paymentChannelService struct {
	channelManager PaymentChannelManager
	processor      PaymentProcessor
	
	// Channel registry for persistence
	registeredChannels map[string]*ChannelInfo
}

// NewPaymentChannelService creates a new payment channel service
func NewPaymentChannelService(
	channelManager PaymentChannelManager,
	processor PaymentProcessor,
) PaymentChannelService {
	return &paymentChannelService{
		channelManager:     channelManager,
		processor:          processor,
		registeredChannels: make(map[string]*ChannelInfo),
	}
}

// RegisterChannel registers a new payment channel
func (s *paymentChannelService) RegisterChannel(ctx context.Context, req *RegisterChannelRequest) (*ChannelInfo, error) {
	if req == nil {
		return nil, errors.New("register channel request cannot be nil")
	}
	
	if err := s.validateRegisterChannelRequest(req); err != nil {
		return nil, fmt.Errorf("invalid register channel request: %w", err)
	}
	
	// Check if channel already exists
	if _, exists := s.registeredChannels[req.ChannelID]; exists {
		return nil, fmt.Errorf("channel with ID %s already exists", req.ChannelID)
	}
	
	// Create channel based on type
	channel, err := s.createChannelByType(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create channel: %w", err)
	}
	
	// Register with channel manager
	if err := s.channelManager.RegisterChannel(channel); err != nil {
		return nil, fmt.Errorf("failed to register channel with manager: %w", err)
	}
	
	// Create channel info
	channelInfo := &ChannelInfo{
		ChannelID:             req.ChannelID,
		ChannelName:           req.ChannelName,
		ChannelType:           req.ChannelType,
		SupportedPaymentTypes: channel.SupportedPaymentTypes(),
		SupportedCurrencies:   channel.SupportedCurrencies(),
		Limits:                req.Limits,
		Status:                channel.GetChannelStatus(),
		Config:                req.Config,
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}
	
	// Store in registry
	s.registeredChannels[req.ChannelID] = channelInfo
	
	return channelInfo, nil
}

// UnregisterChannel unregisters a payment channel
func (s *paymentChannelService) UnregisterChannel(ctx context.Context, channelID string) error {
	if channelID == "" {
		return errors.New("channel ID cannot be empty")
	}
	
	// Check if channel exists
	if _, exists := s.registeredChannels[channelID]; !exists {
		return fmt.Errorf("channel with ID %s not found", channelID)
	}
	
	// Unregister from channel manager
	if err := s.channelManager.UnregisterChannel(channelID); err != nil {
		return fmt.Errorf("failed to unregister channel from manager: %w", err)
	}
	
	// Remove from registry
	delete(s.registeredChannels, channelID)
	
	return nil
}

// GetChannel gets channel information
func (s *paymentChannelService) GetChannel(ctx context.Context, channelID string) (*ChannelInfo, error) {
	if channelID == "" {
		return nil, errors.New("channel ID cannot be empty")
	}
	
	channelInfo, exists := s.registeredChannels[channelID]
	if !exists {
		return nil, fmt.Errorf("channel with ID %s not found", channelID)
	}
	
	// Update status from channel manager
	channel, err := s.channelManager.GetChannel(channelID)
	if err == nil {
		channelInfo.Status = channel.GetChannelStatus()
	}
	
	return channelInfo, nil
}

// ListChannels lists all registered channels
func (s *paymentChannelService) ListChannels(ctx context.Context, filter *ChannelFilter) ([]*ChannelInfo, error) {
	var channels []*ChannelInfo
	
	for _, channelInfo := range s.registeredChannels {
		// Apply filters
		if filter != nil {
			if filter.ChannelType != nil && *filter.ChannelType != channelInfo.ChannelType {
				continue
			}
			
			if filter.IsActive != nil && *filter.IsActive != channelInfo.Status.IsActive {
				continue
			}
			
			if filter.IsHealthy != nil && *filter.IsHealthy != channelInfo.Status.IsHealthy {
				continue
			}
		}
		
		channels = append(channels, channelInfo)
	}
	
	// Apply pagination
	if filter != nil && filter.Limit > 0 {
		start := filter.Offset
		end := start + filter.Limit
		
		if start >= len(channels) {
			return []*ChannelInfo{}, nil
		}
		
		if end > len(channels) {
			end = len(channels)
		}
		
		channels = channels[start:end]
	}
	
	return channels, nil
}

// UpdateChannelConfig updates channel configuration
func (s *paymentChannelService) UpdateChannelConfig(ctx context.Context, channelID string, config map[string]interface{}) error {
	if channelID == "" {
		return errors.New("channel ID cannot be empty")
	}
	
	// Update in channel manager
	if err := s.channelManager.UpdateChannelConfig(channelID, config); err != nil {
		return fmt.Errorf("failed to update channel config: %w", err)
	}
	
	// Update in registry
	if channelInfo, exists := s.registeredChannels[channelID]; exists {
		for key, value := range config {
			channelInfo.Config[key] = value
		}
		channelInfo.UpdatedAt = time.Now()
	}
	
	return nil
}

// CheckChannelHealth checks health of a specific channel
func (s *paymentChannelService) CheckChannelHealth(ctx context.Context, channelID string) (*ChannelHealthStatus, error) {
	if channelID == "" {
		return nil, errors.New("channel ID cannot be empty")
	}
	
	channel, err := s.channelManager.GetChannel(channelID)
	if err != nil {
		return nil, fmt.Errorf("channel not found: %w", err)
	}
	
	startTime := time.Now()
	isHealthy := channel.IsHealthy(ctx)
	responseTime := time.Since(startTime).Milliseconds()
	
	status := &ChannelHealthStatus{
		ChannelID:    channelID,
		ChannelName:  channel.GetChannelName(),
		IsHealthy:    isHealthy,
		ResponseTime: responseTime,
		CheckedAt:    time.Now(),
	}
	
	if !isHealthy {
		channelStatus := channel.GetChannelStatus()
		if channelStatus != nil {
			status.ErrorMessage = channelStatus.ErrorMessage
		}
	}
	
	return status, nil
}

// GetChannelHealthStatus gets health status of all channels
func (s *paymentChannelService) GetChannelHealthStatus(ctx context.Context) (map[string]*ChannelHealthStatus, error) {
	return s.channelManager.CheckChannelHealth(ctx), nil
}

// ProcessPayment processes a payment
func (s *paymentChannelService) ProcessPayment(ctx context.Context, req *ProcessPaymentRequest) (*PaymentResult, error) {
	return s.processor.ProcessPayment(ctx, req)
}

// QueryPaymentStatus queries payment status
func (s *paymentChannelService) QueryPaymentStatus(ctx context.Context, orderID uuid.UUID) (*PaymentStatusResult, error) {
	return s.processor.QueryPaymentStatus(ctx, orderID)
}

// CancelPayment cancels a payment
func (s *paymentChannelService) CancelPayment(ctx context.Context, orderID uuid.UUID, reason string) (*CancelResult, error) {
	return s.processor.CancelPayment(ctx, orderID, reason)
}

// ProcessRefund processes a refund
func (s *paymentChannelService) ProcessRefund(ctx context.Context, req *ProcessRefundRequest) (*RefundResult, error) {
	return s.processor.ProcessRefund(ctx, req)
}

// ProcessWebhook processes webhook from payment channels
func (s *paymentChannelService) ProcessWebhook(ctx context.Context, channelID string, payload []byte, headers map[string]string) (*WebhookProcessResult, error) {
	return s.processor.ProcessWebhook(ctx, channelID, payload, headers)
}

// BatchQueryPayments queries multiple payment statuses
func (s *paymentChannelService) BatchQueryPayments(ctx context.Context, orderIDs []uuid.UUID) ([]*PaymentStatusResult, error) {
	return s.processor.BatchQueryPayments(ctx, orderIDs)
}

// BatchCancelPayments cancels multiple payments
func (s *paymentChannelService) BatchCancelPayments(ctx context.Context, requests []*BatchCancelRequest) ([]*CancelResult, error) {
	return s.processor.BatchCancelPayments(ctx, requests)
}

// Helper methods

func (s *paymentChannelService) validateRegisterChannelRequest(req *RegisterChannelRequest) error {
	if req.ChannelID == "" {
		return errors.New("channel ID is required")
	}
	
	if req.ChannelName == "" {
		return errors.New("channel name is required")
	}
	
	if req.ChannelType == "" {
		return errors.New("channel type is required")
	}
	
	// Validate channel type
	validTypes := []string{ChannelTypeAlipay, ChannelTypeWechat, ChannelTypeBank, ChannelTypeOther}
	isValidType := false
	for _, validType := range validTypes {
		if req.ChannelType == validType {
			isValidType = true
			break
		}
	}
	
	if !isValidType {
		return fmt.Errorf("invalid channel type: %s", req.ChannelType)
	}
	
	return nil
}

func (s *paymentChannelService) createChannelByType(req *RegisterChannelRequest) (PaymentChannel, error) {
	switch req.ChannelType {
	case ChannelTypeAlipay:
		return s.createAlipayChannel(req)
	case ChannelTypeWechat:
		return s.createWechatChannel(req)
	case ChannelTypeBank:
		return s.createBankChannel(req)
	case ChannelTypeOther:
		return s.createOtherChannel(req)
	default:
		// Create mock channel for testing
		return NewMockPaymentChannel(req.ChannelID, req.ChannelName, false), nil
	}
}

func (s *paymentChannelService) createAlipayChannel(req *RegisterChannelRequest) (PaymentChannel, error) {
	// For now, create a mock channel
	// In real implementation, this would create an actual Alipay channel
	channel := NewMockPaymentChannel(req.ChannelID, req.ChannelName, false)
	channel.channelType = ChannelTypeAlipay
	
	// Configure channel
	if req.Config != nil {
		channel.UpdateConfiguration(req.Config)
	}
	
	if req.Limits != nil {
		channel.UpdateLimits(req.Limits)
	}
	
	return channel, nil
}

func (s *paymentChannelService) createWechatChannel(req *RegisterChannelRequest) (PaymentChannel, error) {
	// For now, create a mock channel
	// In real implementation, this would create an actual WeChat channel
	channel := NewMockPaymentChannel(req.ChannelID, req.ChannelName, false)
	channel.channelType = ChannelTypeWechat
	
	// Configure channel
	if req.Config != nil {
		channel.UpdateConfiguration(req.Config)
	}
	
	if req.Limits != nil {
		channel.UpdateLimits(req.Limits)
	}
	
	return channel, nil
}

func (s *paymentChannelService) createBankChannel(req *RegisterChannelRequest) (PaymentChannel, error) {
	// For now, create a mock channel
	// In real implementation, this would create an actual Bank channel
	channel := NewMockPaymentChannel(req.ChannelID, req.ChannelName, false)
	channel.channelType = ChannelTypeBank
	
	// Configure channel
	if req.Config != nil {
		channel.UpdateConfiguration(req.Config)
	}
	
	if req.Limits != nil {
		channel.UpdateLimits(req.Limits)
	}
	
	return channel, nil
}

func (s *paymentChannelService) createOtherChannel(req *RegisterChannelRequest) (PaymentChannel, error) {
	// For now, create a mock channel
	// In real implementation, this would create a generic channel
	channel := NewMockPaymentChannel(req.ChannelID, req.ChannelName, false)
	channel.channelType = ChannelTypeOther
	
	// Configure channel
	if req.Config != nil {
		channel.UpdateConfiguration(req.Config)
	}
	
	if req.Limits != nil {
		channel.UpdateLimits(req.Limits)
	}
	
	return channel, nil
}
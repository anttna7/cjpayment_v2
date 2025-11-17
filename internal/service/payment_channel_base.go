package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/shopspring/decimal"
)

// BasePaymentChannel provides common functionality for payment channels
type BasePaymentChannel struct {
	channelID   string
	channelName string
	channelType string
	config      map[string]interface{}
	limits      *ChannelLimits
	status      *ChannelStatus
}

// NewBasePaymentChannel creates a new base payment channel
func NewBasePaymentChannel(channelID, channelName, channelType string) *BasePaymentChannel {
	return &BasePaymentChannel{
		channelID:   channelID,
		channelName: channelName,
		channelType: channelType,
		config:      make(map[string]interface{}),
		limits: &ChannelLimits{
			MinAmount:    decimal.NewFromFloat(0.01),
			MaxAmount:    decimal.NewFromFloat(100000),
			DailyLimit:   decimal.NewFromFloat(1000000),
			MonthlyLimit: decimal.NewFromFloat(30000000),
			SingleLimit:  decimal.NewFromFloat(100000),
		},
		status: &ChannelStatus{
			IsActive:      true,
			IsHealthy:     true,
			LastCheckTime: time.Now(),
			Uptime:        100.0,
		},
	}
}

// GetChannelType returns the channel type
func (c *BasePaymentChannel) GetChannelType() string {
	return c.channelType
}

// GetChannelName returns the channel name
func (c *BasePaymentChannel) GetChannelName() string {
	return c.channelName
}

// GetChannelID returns the channel ID
func (c *BasePaymentChannel) GetChannelID() string {
	return c.channelID
}

// SupportedPaymentTypes returns supported payment types
func (c *BasePaymentChannel) SupportedPaymentTypes() []string {
	return []string{PaymentTypePublic, PaymentTypePrivate}
}

// SupportedCurrencies returns supported currencies
func (c *BasePaymentChannel) SupportedCurrencies() []string {
	return []string{"CNY", "USD"}
}

// GetChannelLimits returns channel limits
func (c *BasePaymentChannel) GetChannelLimits() *ChannelLimits {
	return c.limits
}

// IsHealthy checks if the channel is healthy
func (c *BasePaymentChannel) IsHealthy(ctx context.Context) bool {
	return c.status.IsHealthy
}

// GetChannelStatus returns channel status
func (c *BasePaymentChannel) GetChannelStatus() *ChannelStatus {
	return c.status
}

// UpdateConfiguration updates channel configuration
func (c *BasePaymentChannel) UpdateConfiguration(config map[string]interface{}) error {
	for key, value := range config {
		c.config[key] = value
	}
	return nil
}

// ValidateWebhookSignature validates webhook signature using HMAC-SHA256
func (c *BasePaymentChannel) ValidateWebhookSignature(payload []byte, signature string, secret string) bool {
	if secret == "" {
		return true // No signature validation required
	}
	
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// GetConfigValue gets a configuration value
func (c *BasePaymentChannel) GetConfigValue(key string) (interface{}, bool) {
	value, exists := c.config[key]
	return value, exists
}

// SetConfigValue sets a configuration value
func (c *BasePaymentChannel) SetConfigValue(key string, value interface{}) {
	c.config[key] = value
}

// UpdateLimits updates channel limits
func (c *BasePaymentChannel) UpdateLimits(limits *ChannelLimits) {
	c.limits = limits
}

// UpdateStatus updates channel status
func (c *BasePaymentChannel) UpdateStatus(status *ChannelStatus) {
	c.status = status
}

// MockPaymentChannel is a mock implementation for testing
type MockPaymentChannel struct {
	*BasePaymentChannel
	shouldFail bool
}

// NewMockPaymentChannel creates a new mock payment channel
func NewMockPaymentChannel(channelID, channelName string, shouldFail bool) *MockPaymentChannel {
	return &MockPaymentChannel{
		BasePaymentChannel: NewBasePaymentChannel(channelID, channelName, "mock"),
		shouldFail:         shouldFail,
	}
}

// CreatePayment creates a mock payment
func (c *MockPaymentChannel) CreatePayment(ctx context.Context, req *CreatePaymentRequest) (*PaymentResponse, error) {
	if c.shouldFail {
		return nil, &PaymentChannelError{
			Code:    "MOCK_ERROR",
			Message: "Mock payment creation failed",
			Type:    ErrorTypeTemporary,
		}
	}
	
	return &PaymentResponse{
		PaymentID:        req.PaymentID,
		ChannelPaymentID: "MOCK_" + req.PaymentID,
		Status:           PaymentStatusPending,
		PaymentURL:       "https://mock.payment.com/pay/" + req.PaymentID,
		QRCode:           "data:image/png;base64,mock_qr_code",
		CreatedAt:        time.Now(),
		ExpireTime:       &[]time.Time{time.Now().Add(30 * time.Minute)}[0],
	}, nil
}

// QueryPayment queries mock payment status
func (c *MockPaymentChannel) QueryPayment(ctx context.Context, paymentID string) (*PaymentStatus, error) {
	if c.shouldFail {
		return nil, &PaymentChannelError{
			Code:    "MOCK_ERROR",
			Message: "Mock payment query failed",
			Type:    ErrorTypeTemporary,
		}
	}
	
	return &PaymentStatus{
		PaymentID:        paymentID,
		ChannelPaymentID: "MOCK_" + paymentID,
		Status:           PaymentStatusPaid,
		Amount:           decimal.NewFromFloat(100.00),
		PaidAmount:       decimal.NewFromFloat(100.00),
		Currency:         "CNY",
		PaymentTime:      &[]time.Time{time.Now()}[0],
		UpdatedAt:        time.Now(),
	}, nil
}

// CancelPayment cancels mock payment
func (c *MockPaymentChannel) CancelPayment(ctx context.Context, paymentID string) (*CancelPaymentResponse, error) {
	if c.shouldFail {
		return nil, &PaymentChannelError{
			Code:    "MOCK_ERROR",
			Message: "Mock payment cancellation failed",
			Type:    ErrorTypeTemporary,
		}
	}
	
	return &CancelPaymentResponse{
		PaymentID:   paymentID,
		Status:      PaymentStatusCancelled,
		CancelledAt: time.Now(),
	}, nil
}

// RefundPayment processes mock refund
func (c *MockPaymentChannel) RefundPayment(ctx context.Context, req *RefundPaymentRequest) (*RefundResponse, error) {
	if c.shouldFail {
		return nil, &PaymentChannelError{
			Code:    "MOCK_ERROR",
			Message: "Mock refund failed",
			Type:    ErrorTypeTemporary,
		}
	}
	
	return &RefundResponse{
		RefundID:        req.RefundID,
		ChannelRefundID: "MOCK_REFUND_" + req.RefundID,
		Status:          PaymentStatusRefunded,
		Amount:          req.Amount,
		RefundedAt:      &[]time.Time{time.Now()}[0],
	}, nil
}

// HandleWebhook handles mock webhook
func (c *MockPaymentChannel) HandleWebhook(ctx context.Context, payload []byte, headers map[string]string) (*WebhookResult, error) {
	if c.shouldFail {
		return nil, &PaymentChannelError{
			Code:    "MOCK_ERROR",
			Message: "Mock webhook handling failed",
			Type:    ErrorTypeTemporary,
		}
	}
	
	return &WebhookResult{
		PaymentID:   "MOCK_PAYMENT_ID",
		EventType:   EventTypePaymentPaid,
		Status:      "success",
		Data:        map[string]interface{}{"mock": true},
		ProcessedAt: time.Now(),
		ShouldRetry: false,
	}, nil
}

// PaymentChannelError represents a payment channel error
type PaymentChannelError struct {
	Code    string
	Message string
	Type    ErrorType
	Details map[string]interface{}
}

func (e *PaymentChannelError) Error() string {
	return e.Message
}

// ErrorType represents the type of error
type ErrorType string

const (
	ErrorTypeTemporary ErrorType = "temporary"
	ErrorTypePermanent ErrorType = "permanent"
	ErrorTypeRetryable ErrorType = "retryable"
)

// IsRetryable returns true if the error is retryable
func (e *PaymentChannelError) IsRetryable() bool {
	return e.Type == ErrorTypeTemporary || e.Type == ErrorTypeRetryable
}

// GetErrorCode returns the error code
func (e *PaymentChannelError) GetErrorCode() string {
	return e.Code
}

// GetErrorType returns the error type
func (e *PaymentChannelError) GetErrorType() ErrorType {
	return e.Type
}

// GetErrorDetails returns error details
func (e *PaymentChannelError) GetErrorDetails() map[string]interface{} {
	return e.Details
}
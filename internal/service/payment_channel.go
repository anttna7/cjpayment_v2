package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// PaymentChannel defines the interface for all payment channels
type PaymentChannel interface {
	// Channel identification
	GetChannelType() string
	GetChannelName() string
	GetChannelID() string
	
	// Channel capabilities
	SupportedPaymentTypes() []string
	SupportedCurrencies() []string
	GetChannelLimits() *ChannelLimits
	
	// Payment processing
	CreatePayment(ctx context.Context, req *CreatePaymentRequest) (*PaymentResponse, error)
	QueryPayment(ctx context.Context, paymentID string) (*PaymentStatus, error)
	CancelPayment(ctx context.Context, paymentID string) (*CancelPaymentResponse, error)
	RefundPayment(ctx context.Context, req *RefundPaymentRequest) (*RefundResponse, error)
	
	// Webhook handling
	HandleWebhook(ctx context.Context, payload []byte, headers map[string]string) (*WebhookResult, error)
	ValidateWebhookSignature(payload []byte, signature string, secret string) bool
	
	// Channel management
	IsHealthy(ctx context.Context) bool
	GetChannelStatus() *ChannelStatus
	UpdateConfiguration(config map[string]interface{}) error
}

// PaymentChannelManager manages multiple payment channels
type PaymentChannelManager interface {
	// Channel registration and management
	RegisterChannel(channel PaymentChannel) error
	UnregisterChannel(channelID string) error
	GetChannel(channelID string) (PaymentChannel, error)
	ListChannels() []PaymentChannel
	GetChannelsByType(channelType string) []PaymentChannel
	
	// Channel selection
	SelectChannel(ctx context.Context, req *ChannelSelectionRequest) (PaymentChannel, error)
	SelectChannelByStrategy(ctx context.Context, strategy ChannelSelectionStrategy, req *ChannelSelectionRequest) (PaymentChannel, error)
	
	// Health monitoring
	CheckChannelHealth(ctx context.Context) map[string]*ChannelHealthStatus
	GetHealthyChannels(channelType string) []PaymentChannel
	
	// Configuration management
	UpdateChannelConfig(channelID string, config map[string]interface{}) error
	GetChannelConfig(channelID string) (map[string]interface{}, error)
}

// PaymentProcessor provides unified payment processing interface
type PaymentProcessor interface {
	// Payment processing
	ProcessPayment(ctx context.Context, req *ProcessPaymentRequest) (*PaymentResult, error)
	QueryPaymentStatus(ctx context.Context, orderID uuid.UUID) (*PaymentStatusResult, error)
	CancelPayment(ctx context.Context, orderID uuid.UUID, reason string) (*CancelResult, error)
	ProcessRefund(ctx context.Context, req *ProcessRefundRequest) (*RefundResult, error)
	
	// Batch operations
	BatchQueryPayments(ctx context.Context, orderIDs []uuid.UUID) ([]*PaymentStatusResult, error)
	BatchCancelPayments(ctx context.Context, requests []*BatchCancelRequest) ([]*CancelResult, error)
	
	// Webhook processing
	ProcessWebhook(ctx context.Context, channelID string, payload []byte, headers map[string]string) (*WebhookProcessResult, error)
	
	// Retry and recovery
	RetryFailedPayments(ctx context.Context, filter *RetryFilter) (*RetryResult, error)
	RecoverPaymentStatus(ctx context.Context, orderID uuid.UUID) (*PaymentStatusResult, error)
}

// Data structures for payment channel operations

// CreatePaymentRequest represents a payment creation request
type CreatePaymentRequest struct {
	OrderID       uuid.UUID       `json:"order_id"`
	PaymentID     string          `json:"payment_id"`
	Amount        decimal.Decimal `json:"amount"`
	Currency      string          `json:"currency"`
	PaymentType   string          `json:"payment_type"`
	PayerInfo     *PayerInfo      `json:"payer_info"`
	ReceiverInfo  *ReceiverInfo   `json:"receiver_info"`
	Description   string          `json:"description"`
	NotifyURL     string          `json:"notify_url"`
	ReturnURL     string          `json:"return_url"`
	ExtraParams   map[string]interface{} `json:"extra_params"`
	ExpireTime    *time.Time      `json:"expire_time"`
}

// PaymentResponse represents the response from payment creation
type PaymentResponse struct {
	PaymentID     string                 `json:"payment_id"`
	ChannelPaymentID string              `json:"channel_payment_id"`
	Status        string                 `json:"status"`
	PaymentURL    string                 `json:"payment_url,omitempty"`
	QRCode        string                 `json:"qr_code,omitempty"`
	ExtraData     map[string]interface{} `json:"extra_data,omitempty"`
	CreatedAt     time.Time              `json:"created_at"`
	ExpireTime    *time.Time             `json:"expire_time,omitempty"`
}

// PaymentStatus represents payment status information
type PaymentStatus struct {
	PaymentID        string                 `json:"payment_id"`
	ChannelPaymentID string                 `json:"channel_payment_id"`
	Status           string                 `json:"status"`
	Amount           decimal.Decimal        `json:"amount"`
	PaidAmount       decimal.Decimal        `json:"paid_amount"`
	Currency         string                 `json:"currency"`
	PaymentTime      *time.Time             `json:"payment_time,omitempty"`
	FailureReason    string                 `json:"failure_reason,omitempty"`
	ExtraData        map[string]interface{} `json:"extra_data,omitempty"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

// CancelPaymentResponse represents payment cancellation response
type CancelPaymentResponse struct {
	PaymentID     string    `json:"payment_id"`
	Status        string    `json:"status"`
	CancelledAt   time.Time `json:"cancelled_at"`
	FailureReason string    `json:"failure_reason,omitempty"`
}

// RefundPaymentRequest represents a refund request
type RefundPaymentRequest struct {
	PaymentID     string          `json:"payment_id"`
	RefundID      string          `json:"refund_id"`
	Amount        decimal.Decimal `json:"amount"`
	Reason        string          `json:"reason"`
	NotifyURL     string          `json:"notify_url"`
	ExtraParams   map[string]interface{} `json:"extra_params"`
}

// RefundResponse represents refund response
type RefundResponse struct {
	RefundID        string          `json:"refund_id"`
	ChannelRefundID string          `json:"channel_refund_id"`
	Status          string          `json:"status"`
	Amount          decimal.Decimal `json:"amount"`
	RefundedAt      *time.Time      `json:"refunded_at,omitempty"`
	FailureReason   string          `json:"failure_reason,omitempty"`
}

// WebhookResult represents webhook processing result
type WebhookResult struct {
	PaymentID     string                 `json:"payment_id"`
	EventType     string                 `json:"event_type"`
	Status        string                 `json:"status"`
	Data          map[string]interface{} `json:"data"`
	ProcessedAt   time.Time              `json:"processed_at"`
	ShouldRetry   bool                   `json:"should_retry"`
}

// PayerInfo represents payer information
type PayerInfo struct {
	Name    string `json:"name"`
	Account string `json:"account"`
	Email   string `json:"email,omitempty"`
	Phone   string `json:"phone,omitempty"`
}

// ReceiverInfo represents receiver information
type ReceiverInfo struct {
	Name    string `json:"name"`
	Account string `json:"account"`
	BankName string `json:"bank_name,omitempty"`
	BankBranch string `json:"bank_branch,omitempty"`
}

// ChannelLimits represents channel limits
type ChannelLimits struct {
	MinAmount     decimal.Decimal `json:"min_amount"`
	MaxAmount     decimal.Decimal `json:"max_amount"`
	DailyLimit    decimal.Decimal `json:"daily_limit"`
	MonthlyLimit  decimal.Decimal `json:"monthly_limit"`
	SingleLimit   decimal.Decimal `json:"single_limit"`
}

// ChannelStatus represents channel status
type ChannelStatus struct {
	IsActive      bool      `json:"is_active"`
	IsHealthy     bool      `json:"is_healthy"`
	LastCheckTime time.Time `json:"last_check_time"`
	ErrorMessage  string    `json:"error_message,omitempty"`
	Uptime        float64   `json:"uptime"`
}

// ChannelSelectionRequest represents channel selection criteria
type ChannelSelectionRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	Currency      string          `json:"currency"`
	PaymentType   string          `json:"payment_type"`
	MerchantID    uuid.UUID       `json:"merchant_id"`
	PreferredChannels []string    `json:"preferred_channels"`
	ExcludedChannels  []string    `json:"excluded_channels"`
	RequireFeatures   []string    `json:"require_features"`
}

// ChannelSelectionStrategy defines channel selection strategy
type ChannelSelectionStrategy interface {
	SelectChannel(ctx context.Context, channels []PaymentChannel, req *ChannelSelectionRequest) (PaymentChannel, error)
	GetStrategyName() string
}

// ChannelHealthStatus represents channel health status
type ChannelHealthStatus struct {
	ChannelID     string    `json:"channel_id"`
	ChannelName   string    `json:"channel_name"`
	IsHealthy     bool      `json:"is_healthy"`
	ResponseTime  int64     `json:"response_time_ms"`
	ErrorMessage  string    `json:"error_message,omitempty"`
	CheckedAt     time.Time `json:"checked_at"`
}

// ProcessPaymentRequest represents unified payment processing request
type ProcessPaymentRequest struct {
	OrderID         uuid.UUID       `json:"order_id"`
	Amount          decimal.Decimal `json:"amount"`
	Currency        string          `json:"currency"`
	PaymentType     string          `json:"payment_type"`
	MerchantID      uuid.UUID       `json:"merchant_id"`
	PayerInfo       *PayerInfo      `json:"payer_info"`
	ReceiverInfo    *ReceiverInfo   `json:"receiver_info"`
	Description     string          `json:"description"`
	NotifyURL       string          `json:"notify_url"`
	ReturnURL       string          `json:"return_url"`
	PreferredChannel string         `json:"preferred_channel,omitempty"`
	ExtraParams     map[string]interface{} `json:"extra_params"`
}

// PaymentResult represents payment processing result
type PaymentResult struct {
	OrderID          uuid.UUID       `json:"order_id"`
	PaymentID        string          `json:"payment_id"`
	ChannelID        string          `json:"channel_id"`
	ChannelPaymentID string          `json:"channel_payment_id"`
	Status           string          `json:"status"`
	Amount           decimal.Decimal `json:"amount"`
	PaymentURL       string          `json:"payment_url,omitempty"`
	QRCode           string          `json:"qr_code,omitempty"`
	ExtraData        map[string]interface{} `json:"extra_data,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	ExpireTime       *time.Time      `json:"expire_time,omitempty"`
}

// PaymentStatusResult represents payment status query result
type PaymentStatusResult struct {
	OrderID          uuid.UUID       `json:"order_id"`
	PaymentID        string          `json:"payment_id"`
	ChannelID        string          `json:"channel_id"`
	ChannelPaymentID string          `json:"channel_payment_id"`
	Status           string          `json:"status"`
	Amount           decimal.Decimal `json:"amount"`
	PaidAmount       decimal.Decimal `json:"paid_amount"`
	Currency         string          `json:"currency"`
	PaymentTime      *time.Time      `json:"payment_time,omitempty"`
	FailureReason    string          `json:"failure_reason,omitempty"`
	ExtraData        map[string]interface{} `json:"extra_data,omitempty"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// CancelResult represents payment cancellation result
type CancelResult struct {
	OrderID       uuid.UUID `json:"order_id"`
	PaymentID     string    `json:"payment_id"`
	Status        string    `json:"status"`
	CancelledAt   time.Time `json:"cancelled_at"`
	FailureReason string    `json:"failure_reason,omitempty"`
}

// ProcessRefundRequest represents refund processing request
type ProcessRefundRequest struct {
	OrderID       uuid.UUID       `json:"order_id"`
	PaymentID     string          `json:"payment_id"`
	RefundID      string          `json:"refund_id"`
	Amount        decimal.Decimal `json:"amount"`
	Reason        string          `json:"reason"`
	NotifyURL     string          `json:"notify_url"`
	ExtraParams   map[string]interface{} `json:"extra_params"`
}

// RefundResult represents refund processing result
type RefundResult struct {
	OrderID         uuid.UUID       `json:"order_id"`
	PaymentID       string          `json:"payment_id"`
	RefundID        string          `json:"refund_id"`
	ChannelRefundID string          `json:"channel_refund_id"`
	Status          string          `json:"status"`
	Amount          decimal.Decimal `json:"amount"`
	RefundedAt      *time.Time      `json:"refunded_at,omitempty"`
	FailureReason   string          `json:"failure_reason,omitempty"`
}

// BatchCancelRequest represents batch cancellation request
type BatchCancelRequest struct {
	OrderID uuid.UUID `json:"order_id"`
	Reason  string    `json:"reason"`
}

// WebhookProcessResult represents webhook processing result
type WebhookProcessResult struct {
	OrderID       uuid.UUID `json:"order_id"`
	PaymentID     string    `json:"payment_id"`
	EventType     string    `json:"event_type"`
	Status        string    `json:"status"`
	ProcessedAt   time.Time `json:"processed_at"`
	ShouldRetry   bool      `json:"should_retry"`
	ErrorMessage  string    `json:"error_message,omitempty"`
}

// RetryFilter represents retry filter criteria
type RetryFilter struct {
	StartDate    *time.Time   `json:"start_date"`
	EndDate      *time.Time   `json:"end_date"`
	ChannelIDs   []string     `json:"channel_ids"`
	OrderIDs     []uuid.UUID  `json:"order_ids"`
	Status       []string     `json:"status"`
	MaxRetries   int          `json:"max_retries"`
	Limit        int          `json:"limit"`
}

// RetryResult represents retry operation result
type RetryResult struct {
	TotalCount    int                    `json:"total_count"`
	SuccessCount  int                    `json:"success_count"`
	FailureCount  int                    `json:"failure_count"`
	Results       []*PaymentStatusResult `json:"results"`
	ProcessedAt   time.Time              `json:"processed_at"`
}

// Payment status constants
const (
	PaymentStatusPending   = "pending"
	PaymentStatusPaid      = "paid"
	PaymentStatusFailed    = "failed"
	PaymentStatusCancelled = "cancelled"
	PaymentStatusExpired   = "expired"
	PaymentStatusRefunded  = "refunded"
)

// Payment type constants
const (
	PaymentTypePublic  = "public"
	PaymentTypePrivate = "private"
)

// Channel type constants
const (
	ChannelTypeAlipay = "alipay"
	ChannelTypeWechat = "wechat"
	ChannelTypeBank   = "bank"
	ChannelTypeOther  = "other"
)

// Event type constants
const (
	EventTypePaymentCreated   = "payment.created"
	EventTypePaymentPaid      = "payment.paid"
	EventTypePaymentFailed    = "payment.failed"
	EventTypePaymentCancelled = "payment.cancelled"
	EventTypePaymentExpired   = "payment.expired"
	EventTypeRefundCreated    = "refund.created"
	EventTypeRefundCompleted  = "refund.completed"
	EventTypeRefundFailed     = "refund.failed"
)
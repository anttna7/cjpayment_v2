package repository

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// User represents a system user
type User struct {
    ID          uuid.UUID  `json:"id" db:"id"`
    Username    string     `json:"username" db:"username"`
    Email       string     `json:"email" db:"email"`
    Password    string     `json:"-" db:"password_hash"`
    FullName    string     `json:"full_name" db:"full_name"`
    Phone       *string    `json:"phone" db:"phone"`
    TenantID    *uuid.UUID `json:"tenant_id,omitempty" db:"tenant_id"`
    Status      string     `json:"status" db:"status"`
    LastLoginAt *time.Time `json:"last_login_at" db:"last_login_at"`
    CreatedAt   time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
    CreatedBy   *uuid.UUID `json:"created_by" db:"created_by"`
    UpdatedBy   *uuid.UUID `json:"updated_by" db:"updated_by"`
}

type Customer struct {
    ID             uuid.UUID  `json:"id" db:"id"`
    TenantID       uuid.UUID  `json:"tenant_id" db:"tenant_id"`
    Name           string     `json:"name" db:"name"`
    Code           string     `json:"code" db:"code"`
    ContactPerson  *string    `json:"contact_person" db:"contact_person"`
    ContactPhone   *string    `json:"contact_phone" db:"contact_phone"`
    ContactEmail   *string    `json:"contact_email" db:"contact_email"`
    Status         string     `json:"status" db:"status"`
    CreatedAt      time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

type Contract struct {
    ID         uuid.UUID `json:"id" db:"id"`
    CustomerID uuid.UUID `json:"customer_id" db:"customer_id"`
    FileURL    string    `json:"file_url" db:"file_url"`
    FileName   string    `json:"file_name" db:"file_name"`
    FileSize   *int64    `json:"file_size" db:"file_size"`
    MimeType   *string   `json:"mime_type" db:"mime_type"`
    UploadedAt time.Time `json:"uploaded_at" db:"uploaded_at"`
}

type FundsAccount struct {
    ID           uuid.UUID       `json:"id" db:"id"`
    CustomerID   uuid.UUID       `json:"customer_id" db:"customer_id"`
    CashBalance  decimal.Decimal `json:"cash_balance" db:"cash_balance"`
    GrantBalance decimal.Decimal `json:"grant_balance" db:"grant_balance"`
    UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

type ConsumeAccount struct {
    ID         uuid.UUID       `json:"id" db:"id"`
    CustomerID uuid.UUID       `json:"customer_id" db:"customer_id"`
    Balance    decimal.Decimal `json:"balance" db:"balance"`
    UpdatedAt  time.Time       `json:"updated_at" db:"updated_at"`
}

type LedgerEntry struct {
    ID           uuid.UUID       `json:"id" db:"id"`
    CustomerID   uuid.UUID       `json:"customer_id" db:"customer_id"`
    AccountType  string          `json:"account_type" db:"account_type"`
    Category     string          `json:"category" db:"category"`
    Source       *string         `json:"source" db:"source"`
    Amount       decimal.Decimal `json:"amount" db:"amount"`
    CashDelta    *decimal.Decimal `json:"cash_delta" db:"cash_delta"`
    GrantDelta   *decimal.Decimal `json:"grant_delta" db:"grant_delta"`
    BalanceAfter decimal.Decimal `json:"balance_after" db:"balance_after"`
    OrderID      *uuid.UUID      `json:"order_id" db:"order_id"`
    CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}

type TransferOrder struct {
    ID          uuid.UUID       `json:"id" db:"id"`
    CustomerID  uuid.UUID       `json:"customer_id" db:"customer_id"`
    Amount      decimal.Decimal `json:"amount" db:"amount"`
    Source      string          `json:"source" db:"source"`
    Status      string          `json:"status" db:"status"`
    CreatedAt   time.Time       `json:"created_at" db:"created_at"`
    CompletedAt *time.Time      `json:"completed_at" db:"completed_at"`
    CreatedBy   *uuid.UUID      `json:"created_by" db:"created_by"`
}

// Role represents a user role
type Role struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	Code        string     `json:"code" db:"code"`
	Description *string    `json:"description" db:"description"`
	IsSystem    bool       `json:"is_system" db:"is_system"`
	Scope       string     `json:"scope" db:"scope"`           // platform, tenant
	TenantID    *uuid.UUID `json:"tenant_id" db:"tenant_id"`   // 租户ID，仅对租户角色有效
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	CreatedBy   *uuid.UUID `json:"created_by" db:"created_by"`
	UpdatedBy   *uuid.UUID `json:"updated_by" db:"updated_by"`
}

// Permission represents a system permission
type Permission struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Resource    string     `json:"resource" db:"resource"`
	Action      string     `json:"action" db:"action"`
	Description string     `json:"description" db:"description"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	CreatedBy   *uuid.UUID `json:"created_by" db:"created_by"`
	UpdatedBy   *uuid.UUID `json:"updated_by" db:"updated_by"`
}

// Merchant represents a merchant entity
type Merchant struct {
	ID                   uuid.UUID              `json:"id" db:"id"`
	Name                 string                 `json:"name" db:"name"`
	Code                 string                 `json:"code" db:"code"`
	ContactPerson        *string                `json:"contact_person" db:"contact_person"`
	ContactPhone         *string                `json:"contact_phone" db:"contact_phone"`
	ContactEmail         *string                `json:"contact_email" db:"contact_email"`
	Status               string                 `json:"status" db:"status"`
	DailyLimit           decimal.Decimal        `json:"daily_limit" db:"daily_limit"`
	SingleLimit          decimal.Decimal        `json:"single_limit" db:"single_limit"`
	DailyUsed            decimal.Decimal        `json:"daily_used" db:"daily_used"`
	LastResetDate        time.Time              `json:"last_reset_date" db:"last_reset_date"`
	AgentName            *string                `json:"agent_name" db:"agent_name"`
	PortName             *string                `json:"port_name" db:"port_name"`
	Remark               *string                `json:"remark" db:"remark"`
	// Recharge testing system fields
	BusinessType         *string                `json:"business_type" db:"business_type"`
	RechargeURL          *string                `json:"recharge_url" db:"recharge_url"`
	RechargePageConfig   map[string]interface{} `json:"recharge_page_config" db:"recharge_page_config"`
	IsRechargeEnabled    bool                   `json:"is_recharge_enabled" db:"is_recharge_enabled"`
	CreatedAt            time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at" db:"updated_at"`
	CreatedBy            *uuid.UUID             `json:"created_by" db:"created_by"`
	UpdatedBy            *uuid.UUID             `json:"updated_by" db:"updated_by"`
}

// ReceiveAccount represents a receive account
type ReceiveAccount struct {
	ID                    uuid.UUID       `json:"id" db:"id"`
	AccountName           string          `json:"account_name" db:"account_name" validate:"required,min=2,max=100"`
	AccountNumber         string          `json:"account_number" db:"account_number" validate:"required,min=6,max=50"`
	AccountType           string          `json:"account_type" db:"account_type" validate:"required,oneof=alipay wechat bank other"`
	CustomPaymentProvider *string         `json:"custom_payment_provider,omitempty" db:"custom_payment_provider" validate:"omitempty,min=2,max=50"`
	BankName              *string         `json:"bank_name,omitempty" db:"bank_name" validate:"omitempty,min=2,max=100"`
	BankBranch            *string         `json:"bank_branch,omitempty" db:"bank_branch" validate:"omitempty,min=2,max=200"`
	AccountHolder         string          `json:"account_holder" db:"account_holder" validate:"required,min=2,max=100"`
	PaymentType           string          `json:"payment_type" db:"payment_type" validate:"required,oneof=private business"`
	Status                string          `json:"status" db:"status" validate:"required,oneof=active inactive suspended closed"`
	DailyLimit            decimal.Decimal `json:"daily_limit" db:"daily_limit" validate:"gte=0"`
	SingleLimit           decimal.Decimal `json:"single_limit" db:"single_limit" validate:"gte=0"`
	DailyUsed             decimal.Decimal `json:"daily_used" db:"daily_used" validate:"gte=0"`
	LastResetDate         time.Time       `json:"last_reset_date" db:"last_reset_date"`
	CreatedAt             time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy             *uuid.UUID      `json:"created_by,omitempty" db:"created_by"`
	UpdatedBy             *uuid.UUID      `json:"updated_by,omitempty" db:"updated_by"`
}

// MerchantReceiveAccount represents the relationship between merchant and receive account
type MerchantReceiveAccount struct {
	ID               uuid.UUID `json:"id" db:"id"`
	MerchantID       uuid.UUID `json:"merchant_id" db:"merchant_id"`
	ReceiveAccountID uuid.UUID `json:"receive_account_id" db:"receive_account_id"`
	Weight           int       `json:"weight" db:"weight"`
	IsActive         bool      `json:"is_active" db:"is_active"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

// RechargeSession represents a user session during the recharge process
type RechargeSession struct {
	ID                uuid.UUID              `json:"id" db:"id"`
	SessionToken      string                 `json:"session_token" db:"session_token"`
	MerchantID        uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	IPAddress         *string                `json:"ip_address" db:"ip_address"`
	UserAgent         *string                `json:"user_agent" db:"user_agent"`
	FormData          map[string]interface{} `json:"form_data" db:"form_data"`
	CurrentStep       string                 `json:"current_step" db:"current_step"`
	MatchedAccountID  *uuid.UUID             `json:"matched_account_id" db:"matched_account_id"`
	RechargeOrderID   *uuid.UUID             `json:"recharge_order_id" db:"recharge_order_id"`
	ExpiresAt         time.Time              `json:"expires_at" db:"expires_at"`
	CreatedAt         time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at" db:"updated_at"`
}

// AccountMatchingLog represents a log entry for account matching operations
type AccountMatchingLog struct {
	ID               uuid.UUID              `json:"id" db:"id"`
	MerchantID       uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	PaymentType      string                 `json:"payment_type" db:"payment_type"`
	Amount           decimal.Decimal        `json:"amount" db:"amount"`
	MatchedAccountID *uuid.UUID             `json:"matched_account_id" db:"matched_account_id"`
	MatchScore       *int                   `json:"match_score" db:"match_score"`
	MatchReason      *string                `json:"match_reason" db:"match_reason"`
	AvailableAccounts int                   `json:"available_accounts" db:"available_accounts"`
	MatchingRules    map[string]interface{} `json:"matching_rules" db:"matching_rules"`
	ExecutionTimeMS  int                    `json:"execution_time_ms" db:"execution_time_ms"`
	Success          bool                   `json:"success" db:"success"`
	ErrorMessage     *string                `json:"error_message" db:"error_message"`
	CreatedAt        time.Time              `json:"created_at" db:"created_at"`
}

// DataExportLog represents a log entry for data export operations
type DataExportLog struct {
	ID           uuid.UUID              `json:"id" db:"id"`
	ExportType   string                 `json:"export_type" db:"export_type"`
	ExportDate   time.Time              `json:"export_date" db:"export_date"`
	StartDate    time.Time              `json:"start_date" db:"start_date"`
	EndDate      time.Time              `json:"end_date" db:"end_date"`
	RecordCount  int                    `json:"record_count" db:"record_count"`
	FileSize     *int64                 `json:"file_size" db:"file_size"`
	FilePath     *string                `json:"file_path" db:"file_path"`
	Status       string                 `json:"status" db:"status"`
	ErrorMessage *string                `json:"error_message" db:"error_message"`
	Parameters   map[string]interface{} `json:"parameters" db:"parameters"`
	CreatedAt    time.Time              `json:"created_at" db:"created_at"`
	CreatedBy    *uuid.UUID             `json:"created_by" db:"created_by"`
}

// StrategyConfig represents the JSON configuration for rotation strategies
type StrategyConfig map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (sc StrategyConfig) Value() (driver.Value, error) {
	return json.Marshal(sc)
}

// Scan implements the sql.Scanner interface for database retrieval
func (sc *StrategyConfig) Scan(value interface{}) error {
	if value == nil {
		*sc = make(StrategyConfig)
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	
	return json.Unmarshal(bytes, sc)
}

// RotationRule represents a rotation rule for merchant accounts
type RotationRule struct {
	ID             uuid.UUID      `json:"id" db:"id"`
	MerchantID     uuid.UUID      `json:"merchant_id" db:"merchant_id"`
	RuleName       string         `json:"rule_name" db:"rule_name"`
	StrategyType   string         `json:"strategy_type" db:"strategy_type"`
	StrategyConfig StrategyConfig `json:"strategy_config" db:"strategy_config"`
	IsActive       bool           `json:"is_active" db:"is_active"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" db:"updated_at"`
	CreatedBy      *uuid.UUID     `json:"created_by" db:"created_by"`
	UpdatedBy      *uuid.UUID     `json:"updated_by" db:"updated_by"`
}

// RechargeOrder represents a recharge order
type RechargeOrder struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	OrderNumber      string          `json:"order_number" db:"order_number"`
	PayerName        string          `json:"payer_name" db:"payer_name"`
	PayerAccount     string          `json:"payer_account" db:"payer_account"`
	PaymentType      string          `json:"payment_type" db:"payment_type"`
	Amount           decimal.Decimal `json:"amount" db:"amount"`
	MerchantID       uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	AdAccount        string          `json:"ad_account" db:"ad_account"`
	ReceiveAccountID uuid.UUID       `json:"receive_account_id" db:"receive_account_id"`
	Status           string          `json:"status" db:"status"`
	Remark           *string         `json:"remark" db:"remark"`
	VoucherURL       *string         `json:"voucher_url" db:"voucher_url"`
	// Enhanced fields for recharge testing system
	PaymentProof     *string         `json:"payment_proof" db:"payment_proof"`
	ProcessingNotes  *string         `json:"processing_notes" db:"processing_notes"`
	AutoMatched      bool            `json:"auto_matched" db:"auto_matched"`
	MatchScore       *int            `json:"match_score" db:"match_score"`
	IPAddress        *string         `json:"ip_address" db:"ip_address"`
	UserAgent        *string         `json:"user_agent" db:"user_agent"`
	CompletedAt      *time.Time      `json:"completed_at" db:"completed_at"`
	ExpiredAt        *time.Time      `json:"expired_at" db:"expired_at"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy        *uuid.UUID      `json:"created_by" db:"created_by"`
	UpdatedBy        *uuid.UUID      `json:"updated_by" db:"updated_by"`
}

// PaymentVoucher represents a payment voucher
type PaymentVoucher struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	RechargeOrderID uuid.UUID  `json:"recharge_order_id" db:"recharge_order_id"`
	VoucherType     string     `json:"voucher_type" db:"voucher_type"`
	VoucherURL      string     `json:"voucher_url" db:"voucher_url"`
	FileSize        int64      `json:"file_size" db:"file_size"`
	MimeType        string     `json:"mime_type" db:"mime_type"`
	UploadedAt      time.Time  `json:"uploaded_at" db:"uploaded_at"`
	UploadedBy      *uuid.UUID `json:"uploaded_by" db:"uploaded_by"`
}

// AdAccountNotification represents enhanced ad account notification configuration
type AdAccountNotification struct {
	ID                    uuid.UUID              `json:"id" db:"id"`
	AdAccountName         string                 `json:"ad_account_name" db:"ad_account_name"`
	AdAccountID           string                 `json:"ad_account_id" db:"ad_account_id"`
	
	// Notification configuration
	WebhookURL            string                 `json:"webhook_url" db:"webhook_url"`
	WebhookSecret         *string                `json:"webhook_secret" db:"webhook_secret"`
	BackupWebhookURL      *string                `json:"backup_webhook_url" db:"backup_webhook_url"`
	
	// Event configuration
	EnabledEvents         []string               `json:"enabled_events" db:"enabled_events"`
	
	// Retry strategy
	MaxRetries            int                    `json:"max_retries" db:"max_retries"`
	RetryIntervalSeconds  int                    `json:"retry_interval_seconds" db:"retry_interval_seconds"`
	ExponentialBackoff    bool                   `json:"exponential_backoff" db:"exponential_backoff"`
	MaxRetryIntervalSecs  int                    `json:"max_retry_interval_seconds" db:"max_retry_interval_seconds"`
	
	// Timeout configuration
	TimeoutSeconds        int                    `json:"timeout_seconds" db:"timeout_seconds"`
	
	// Notification format
	NotificationFormat    string                 `json:"notification_format" db:"notification_format"`
	CustomHeaders         map[string]interface{} `json:"custom_headers" db:"custom_headers"`
	
	// Status and monitoring
	IsActive              bool                   `json:"is_active" db:"is_active"`
	LastNotificationAt    *time.Time             `json:"last_notification_at" db:"last_notification_at"`
	SuccessCount          int                    `json:"success_count" db:"success_count"`
	FailureCount          int                    `json:"failure_count" db:"failure_count"`
	TotalNotifications    int                    `json:"total_notifications" db:"total_notifications"`
	
	// Health check
	HealthCheckEnabled    bool                   `json:"health_check_enabled" db:"health_check_enabled"`
	HealthCheckURL        *string                `json:"health_check_url" db:"health_check_url"`
	HealthCheckInterval   int                    `json:"health_check_interval_minutes" db:"health_check_interval_minutes"`
	LastHealthCheckAt     *time.Time             `json:"last_health_check_at" db:"last_health_check_at"`
	HealthStatus          string                 `json:"health_status" db:"health_status"`
	
	// Contact information
	ContactEmail          *string                `json:"contact_email" db:"contact_email"`
	ContactPhone          *string                `json:"contact_phone" db:"contact_phone"`
	
	CreatedAt             time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at" db:"updated_at"`
	CreatedBy             *uuid.UUID             `json:"created_by" db:"created_by"`
	UpdatedBy             *uuid.UUID             `json:"updated_by" db:"updated_by"`
}

// AdAccountNotificationLog represents enhanced notification log
type AdAccountNotificationLog struct {
	ID                        uuid.UUID              `json:"id" db:"id"`
	AdAccountNotificationID   uuid.UUID              `json:"ad_account_notification_id" db:"ad_account_notification_id"`
	RechargeOrderID           uuid.UUID              `json:"recharge_order_id" db:"recharge_order_id"`
	
	// Event information
	EventType                 string                 `json:"event_type" db:"event_type"`
	EventData                 map[string]interface{} `json:"event_data" db:"event_data"`
	
	// Request information
	TargetURL                 string                 `json:"target_url" db:"target_url"`
	RequestMethod             string                 `json:"request_method" db:"request_method"`
	RequestHeaders            map[string]interface{} `json:"request_headers" db:"request_headers"`
	RequestBody               string                 `json:"request_body" db:"request_body"`
	
	// Response information
	ResponseStatus            *int                   `json:"response_status" db:"response_status"`
	ResponseHeaders           map[string]interface{} `json:"response_headers" db:"response_headers"`
	ResponseBody              *string                `json:"response_body" db:"response_body"`
	ExecutionTimeMS           *int                   `json:"execution_time_ms" db:"execution_time_ms"`
	
	// Retry information
	RetryCount                int                    `json:"retry_count" db:"retry_count"`
	MaxRetries                int                    `json:"max_retries" db:"max_retries"`
	NextRetryAt               *time.Time             `json:"next_retry_at" db:"next_retry_at"`
	
	// Status and result
	Status                    string                 `json:"status" db:"status"`
	ErrorMessage              *string                `json:"error_message" db:"error_message"`
	ErrorCode                 *string                `json:"error_code" db:"error_code"`
	
	// Signature and security
	WebhookSignature          *string                `json:"webhook_signature" db:"webhook_signature"`
	IsSignatureValid          *bool                  `json:"is_signature_valid" db:"is_signature_valid"`
	
	// Timing information
	ScheduledAt               time.Time              `json:"scheduled_at" db:"scheduled_at"`
	StartedAt                 *time.Time             `json:"started_at" db:"started_at"`
	CompletedAt               *time.Time             `json:"completed_at" db:"completed_at"`
	
	CreatedAt                 time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt                 time.Time              `json:"updated_at" db:"updated_at"`
}

// NotificationMonitoring represents real-time notification monitoring
type NotificationMonitoring struct {
	ID                        uuid.UUID       `json:"id" db:"id"`
	
	// Monitoring target
	TargetType                string          `json:"target_type" db:"target_type"`
	TargetID                  uuid.UUID       `json:"target_id" db:"target_id"`
	TargetName                string          `json:"target_name" db:"target_name"`
	
	// Monitoring metrics
	TotalNotifications        int             `json:"total_notifications" db:"total_notifications"`
	SuccessfulNotifications   int             `json:"successful_notifications" db:"successful_notifications"`
	FailedNotifications       int             `json:"failed_notifications" db:"failed_notifications"`
	AvgResponseTimeMS         decimal.Decimal `json:"avg_response_time_ms" db:"avg_response_time_ms"`
	
	// Recent statistics (past 24 hours)
	RecentNotifications24h    int             `json:"recent_notifications_24h" db:"recent_notifications_24h"`
	RecentSuccesses24h        int             `json:"recent_successes_24h" db:"recent_successes_24h"`
	RecentFailures24h         int             `json:"recent_failures_24h" db:"recent_failures_24h"`
	RecentAvgResponseMS       decimal.Decimal `json:"recent_avg_response_ms" db:"recent_avg_response_ms"`
	
	// Status indicators
	CurrentStatus             string          `json:"current_status" db:"current_status"`
	LastNotificationAt        *time.Time      `json:"last_notification_at" db:"last_notification_at"`
	LastSuccessAt             *time.Time      `json:"last_success_at" db:"last_success_at"`
	LastFailureAt             *time.Time      `json:"last_failure_at" db:"last_failure_at"`
	ConsecutiveFailures       int             `json:"consecutive_failures" db:"consecutive_failures"`
	
	// Health check
	HealthCheckStatus         string          `json:"health_check_status" db:"health_check_status"`
	LastHealthCheckAt         *time.Time      `json:"last_health_check_at" db:"last_health_check_at"`
	HealthCheckResponseTimeMS *int            `json:"health_check_response_time_ms" db:"health_check_response_time_ms"`
	
	// Alert information
	AlertThresholdFailures    int             `json:"alert_threshold_failures" db:"alert_threshold_failures"`
	AlertThresholdResponseMS  int             `json:"alert_threshold_response_time_ms" db:"alert_threshold_response_time_ms"`
	IsAlerting                bool            `json:"is_alerting" db:"is_alerting"`
	LastAlertSentAt           *time.Time      `json:"last_alert_sent_at" db:"last_alert_sent_at"`
	
	// Timing information
	MonitoringStartedAt       time.Time       `json:"monitoring_started_at" db:"monitoring_started_at"`
	LastResetAt               time.Time       `json:"last_reset_at" db:"last_reset_at"`
	
	CreatedAt                 time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt                 time.Time       `json:"updated_at" db:"updated_at"`
}

// NotificationTemplate represents notification template
type NotificationTemplate struct {
	ID                    uuid.UUID              `json:"id" db:"id"`
	
	// Template basic information
	Name                  string                 `json:"name" db:"name"`
	TemplateType          string                 `json:"template_type" db:"template_type"`
	EventType             string                 `json:"event_type" db:"event_type"`
	
	// Template content
	SubjectTemplate       *string                `json:"subject_template" db:"subject_template"`
	BodyTemplate          string                 `json:"body_template" db:"body_template"`
	
	// Format configuration
	ContentType           string                 `json:"content_type" db:"content_type"`
	TemplateEngine        string                 `json:"template_engine" db:"template_engine"`
	
	// Variable definition
	TemplateVariables     map[string]interface{} `json:"template_variables" db:"template_variables"`
	SampleData            map[string]interface{} `json:"sample_data" db:"sample_data"`
	
	// Validation and testing
	IsValidated           bool                   `json:"is_validated" db:"is_validated"`
	ValidationErrors      []string               `json:"validation_errors" db:"validation_errors"`
	TestResults           map[string]interface{} `json:"test_results" db:"test_results"`
	
	// Usage statistics
	UsageCount            int                    `json:"usage_count" db:"usage_count"`
	LastUsedAt            *time.Time             `json:"last_used_at" db:"last_used_at"`
	
	// Version management
	Version               string                 `json:"version" db:"version"`
	ParentTemplateID      *uuid.UUID             `json:"parent_template_id" db:"parent_template_id"`
	
	// Status
	IsActive              bool                   `json:"is_active" db:"is_active"`
	IsSystemTemplate      bool                   `json:"is_system_template" db:"is_system_template"`
	
	CreatedAt             time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at" db:"updated_at"`
	CreatedBy             *uuid.UUID             `json:"created_by" db:"created_by"`
	UpdatedBy             *uuid.UUID             `json:"updated_by" db:"updated_by"`
}

// NotificationQueue represents notification queue for batch and scheduled notifications
type NotificationQueue struct {
	ID                    uuid.UUID              `json:"id" db:"id"`
	
	// Queue information
	QueueName             string                 `json:"queue_name" db:"queue_name"`
	Priority              int                    `json:"priority" db:"priority"`
	
	// Notification target
	TargetType            string                 `json:"target_type" db:"target_type"`
	TargetIdentifier      string                 `json:"target_identifier" db:"target_identifier"`
	
	// Notification content
	NotificationType      string                 `json:"notification_type" db:"notification_type"`
	EventType             string                 `json:"event_type" db:"event_type"`
	Subject               *string                `json:"subject" db:"subject"`
	Content               string                 `json:"content" db:"content"`
	ContentType           string                 `json:"content_type" db:"content_type"`
	
	// Metadata
	Metadata              map[string]interface{} `json:"metadata" db:"metadata"`
	ReferenceID           *uuid.UUID             `json:"reference_id" db:"reference_id"`
	ReferenceType         *string                `json:"reference_type" db:"reference_type"`
	
	// Scheduling information
	ScheduledAt           time.Time              `json:"scheduled_at" db:"scheduled_at"`
	DelaySeconds          int                    `json:"delay_seconds" db:"delay_seconds"`
	
	// Retry configuration
	MaxRetries            int                    `json:"max_retries" db:"max_retries"`
	RetryCount            int                    `json:"retry_count" db:"retry_count"`
	RetryIntervalSeconds  int                    `json:"retry_interval_seconds" db:"retry_interval_seconds"`
	NextRetryAt           *time.Time             `json:"next_retry_at" db:"next_retry_at"`
	
	// Status
	Status                string                 `json:"status" db:"status"`
	
	// Execution information
	StartedAt             *time.Time             `json:"started_at" db:"started_at"`
	CompletedAt           *time.Time             `json:"completed_at" db:"completed_at"`
	ExecutionResult       map[string]interface{} `json:"execution_result" db:"execution_result"`
	ErrorMessage          *string                `json:"error_message" db:"error_message"`
	
	CreatedAt             time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at" db:"updated_at"`
}

// OrderStatusLog represents order status change log
type OrderStatusLog struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	RechargeOrderID uuid.UUID  `json:"recharge_order_id" db:"recharge_order_id"`
	FromStatus      *string    `json:"from_status" db:"from_status"`
	ToStatus        string     `json:"to_status" db:"to_status"`
	Reason          *string    `json:"reason" db:"reason"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	CreatedBy       *uuid.UUID `json:"created_by" db:"created_by"`
}

// NotificationConfig represents a notification configuration
type NotificationConfig struct {
	ID             uuid.UUID              `json:"id" db:"id"`
	Name           string                 `json:"name" db:"name"`
	EventType      string                 `json:"event_type" db:"event_type"`
	TargetSystem   string                 `json:"target_system" db:"target_system"`
	WebhookURL     string                 `json:"webhook_url" db:"webhook_url"`
	HTTPMethod     string                 `json:"http_method" db:"http_method"`
	Headers        map[string]interface{} `json:"headers" db:"headers"`
	TemplateBody   string                 `json:"template_body" db:"template_body"`
	RetryPolicy    map[string]interface{} `json:"retry_policy" db:"retry_policy"`
	TimeoutSeconds int                    `json:"timeout_seconds" db:"timeout_seconds"`
	IsActive       bool                   `json:"is_active" db:"is_active"`
	CreatedAt      time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at" db:"updated_at"`
	CreatedBy      *uuid.UUID             `json:"created_by" db:"created_by"`
	UpdatedBy      *uuid.UUID             `json:"updated_by" db:"updated_by"`
}

// NotificationLog represents a notification attempt log
type NotificationLog struct {
	ID               uuid.UUID              `json:"id" db:"id"`
	NotificationID   uuid.UUID              `json:"notification_id" db:"notification_id"`
	RechargeOrderID  *uuid.UUID             `json:"recharge_order_id" db:"recharge_order_id"`
	EventType        string                 `json:"event_type" db:"event_type"`
	TargetURL        string                 `json:"target_url" db:"target_url"`
	RequestHeaders   map[string]interface{} `json:"request_headers" db:"request_headers"`
	RequestBody      string                 `json:"request_body" db:"request_body"`
	ResponseStatus   *int                   `json:"response_status" db:"response_status"`
	ResponseHeaders  map[string]interface{} `json:"response_headers" db:"response_headers"`
	ResponseBody     *string                `json:"response_body" db:"response_body"`
	ExecutionTimeMS  *int                   `json:"execution_time_ms" db:"execution_time_ms"`
	RetryCount       int                    `json:"retry_count" db:"retry_count"`
	MaxRetries       int                    `json:"max_retries" db:"max_retries"`
	Status           string                 `json:"status" db:"status"`
	ErrorMessage     *string                `json:"error_message" db:"error_message"`
	NextRetryAt      *time.Time             `json:"next_retry_at" db:"next_retry_at"`
	CreatedAt        time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at" db:"updated_at"`
}

// LimitAlert represents a limit alert
type LimitAlert struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	AlertType   string          `json:"alert_type" db:"alert_type"`
	EntityID    uuid.UUID       `json:"entity_id" db:"entity_id"`
	EntityName  string          `json:"entity_name" db:"entity_name"`
	AlertLevel  string          `json:"alert_level" db:"alert_level"`
	Threshold   decimal.Decimal `json:"threshold" db:"threshold"`
	CurrentUsed decimal.Decimal `json:"current_used" db:"current_used"`
	Message     string          `json:"message" db:"message"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	IsResolved  bool            `json:"is_resolved" db:"is_resolved"`
	ResolvedAt  *time.Time      `json:"resolved_at" db:"resolved_at"`
	CreatedBy   *uuid.UUID      `json:"created_by" db:"created_by"`
}

// LimitViolation represents a limit violation record
type LimitViolation struct {
	ID             uuid.UUID       `json:"id" db:"id"`
	EntityType     string          `json:"entity_type" db:"entity_type"`
	EntityID       uuid.UUID       `json:"entity_id" db:"entity_id"`
	EntityName     string          `json:"entity_name" db:"entity_name"`
	ViolationType  string          `json:"violation_type" db:"violation_type"`
	LimitValue     decimal.Decimal `json:"limit_value" db:"limit_value"`
	AttemptedValue decimal.Decimal `json:"attempted_value" db:"attempted_value"`
	ViolatedAt     time.Time       `json:"violated_at" db:"violated_at"`
	OrderID        *uuid.UUID      `json:"order_id" db:"order_id"`
	CreatedBy      *uuid.UUID      `json:"created_by" db:"created_by"`
}

// Webhook represents a webhook registration
type Webhook struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	URL       string     `json:"url" db:"url"`
	Events    []string   `json:"events" db:"events"`
	Secret    string     `json:"secret" db:"secret"`
	IsActive  bool       `json:"is_active" db:"is_active"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	CreatedBy *uuid.UUID `json:"created_by" db:"created_by"`
	UpdatedBy *uuid.UUID `json:"updated_by" db:"updated_by"`
}

// WebhookEvent represents an event that can trigger webhooks
type WebhookEvent struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	EventType   string                 `json:"event_type" db:"event_type"`
	Source      string                 `json:"source" db:"source"`
	Data        map[string]interface{} `json:"data" db:"data"`
	Timestamp   time.Time              `json:"timestamp" db:"timestamp"`
	ProcessedAt *time.Time             `json:"processed_at" db:"processed_at"`
	Status      string                 `json:"status" db:"status"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
}

// WebhookDelivery represents a webhook delivery attempt
type WebhookDelivery struct {
	ID              uuid.UUID              `json:"id" db:"id"`
	WebhookID       uuid.UUID              `json:"webhook_id" db:"webhook_id"`
	EventID         uuid.UUID              `json:"event_id" db:"event_id"`
	EventType       string                 `json:"event_type" db:"event_type"`
	TargetURL       string                 `json:"target_url" db:"target_url"`
	RequestHeaders  map[string]interface{} `json:"request_headers" db:"request_headers"`
	RequestBody     string                 `json:"request_body" db:"request_body"`
	ResponseStatus  *int                   `json:"response_status" db:"response_status"`
	ResponseHeaders map[string]interface{} `json:"response_headers" db:"response_headers"`
	ResponseBody    *string                `json:"response_body" db:"response_body"`
	ExecutionTimeMS *int                   `json:"execution_time_ms" db:"execution_time_ms"`
	RetryCount      int                    `json:"retry_count" db:"retry_count"`
	MaxRetries      int                    `json:"max_retries" db:"max_retries"`
	Status          string                 `json:"status" db:"status"`
	ErrorMessage    *string                `json:"error_message" db:"error_message"`
	NextRetryAt     *time.Time             `json:"next_retry_at" db:"next_retry_at"`
	DeliveredAt     *time.Time             `json:"delivered_at" db:"delivered_at"`
	CreatedAt       time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at" db:"updated_at"`
}

// Report represents a generated report
type Report struct {
	ID           uuid.UUID              `json:"id" db:"id"`
	ReportType   string                 `json:"report_type" db:"report_type"`
	Format       string                 `json:"format" db:"format"`
	Title        string                 `json:"title" db:"title"`
	Description  string                 `json:"description" db:"description"`
	Status       string                 `json:"status" db:"status"`
	Progress     int                    `json:"progress" db:"progress"`
	FileSize     *int64                 `json:"file_size" db:"file_size"`
	FilePath     *string                `json:"file_path" db:"file_path"`
	DownloadURL  *string                `json:"download_url" db:"download_url"`
	ExpiresAt    *time.Time             `json:"expires_at" db:"expires_at"`
	ErrorMessage *string                `json:"error_message" db:"error_message"`
	Parameters   map[string]interface{} `json:"parameters" db:"parameters"`
	CreatedAt    time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at" db:"updated_at"`
	CreatedBy    *uuid.UUID             `json:"created_by" db:"created_by"`
}

// AgentSuggestion represents an agent suggestion for autocomplete functionality
type AgentSuggestion struct {
	ID         uuid.UUID `json:"id" db:"id"`
	AgentName  string    `json:"agent_name" db:"agent_name" validate:"required,min=2,max=100"`
	UsageCount int       `json:"usage_count" db:"usage_count"`
	LastUsedAt time.Time `json:"last_used_at" db:"last_used_at"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

// MerchantModalDTO represents the data transfer object for merchant modal operations
type MerchantModalDTO struct {
	// Basic merchant information
	ID          *uuid.UUID `json:"id,omitempty"`
	CompanyName string     `json:"company_name" validate:"required,min=2,max=100"`
	
	// Receive account information
	ReceiveAccountName        string          `json:"receive_account_name" validate:"required,min=2,max=50"`
	ReceiveAccountNumber      string          `json:"receive_account_number" validate:"required,min=6,max=30"`
	AccountType               string          `json:"account_type" validate:"required,oneof=alipay wechat bank other"`
	CustomPaymentProvider     *string         `json:"custom_payment_provider,omitempty" validate:"omitempty,min=2,max=50"`
	AccountHolder             string          `json:"account_holder" validate:"required,min=2,max=50"`
	PaymentType               string          `json:"payment_type" validate:"required,oneof=private business"`
	
	// Limit information
	DailyLimit  decimal.Decimal `json:"daily_limit" validate:"gte=0"`
	SingleLimit decimal.Decimal `json:"single_limit" validate:"gte=0"`
	
	// Business information
	AgentName *string `json:"agent_name,omitempty" validate:"omitempty,min=2,max=100"`
	PortName  *string `json:"port_name,omitempty" validate:"omitempty,min=2,max=50"`
	Remark    *string `json:"remark,omitempty" validate:"omitempty,max=500"`
}

// CreateMerchantRequest represents the request for creating a merchant
type CreateMerchantRequest struct {
	// Basic merchant information
	CompanyName   string  `json:"company_name" binding:"required,min=2,max=100"`
	ContactPerson *string `json:"contact_person,omitempty" binding:"omitempty,min=2,max=50"`
	ContactPhone  *string `json:"contact_phone,omitempty" binding:"omitempty,min=10,max=20"`
	ContactEmail  *string `json:"contact_email,omitempty" binding:"omitempty,email,max=100"`
	
	// Receive account information
	ReceiveAccount *CreateReceiveAccountRequest `json:"receive_account,omitempty"`
	
	// Business information
	AgentName *string `json:"agent_name,omitempty" binding:"omitempty,min=2,max=100"`
	PortName  *string `json:"port_name,omitempty" binding:"omitempty,min=2,max=50"`
	Remark    *string `json:"remark,omitempty" binding:"omitempty,max=500"`
}

// UpdateMerchantRequest represents the request for updating a merchant
type UpdateMerchantRequest struct {
	// Basic merchant information
	CompanyName   *string `json:"company_name,omitempty" binding:"omitempty,min=2,max=100"`
	ContactPerson *string `json:"contact_person,omitempty" binding:"omitempty,min=2,max=50"`
	ContactPhone  *string `json:"contact_phone,omitempty" binding:"omitempty,min=10,max=20"`
	ContactEmail  *string `json:"contact_email,omitempty" binding:"omitempty,email,max=100"`
	Status        *string `json:"status,omitempty" binding:"omitempty,oneof=active inactive suspended"`
	
	// Limit information
	DailyLimit  *decimal.Decimal `json:"daily_limit,omitempty" binding:"omitempty,gte=0"`
	SingleLimit *decimal.Decimal `json:"single_limit,omitempty" binding:"omitempty,gte=0"`
	
	// Business information
	AgentName *string `json:"agent_name,omitempty" binding:"omitempty,min=2,max=100"`
	PortName  *string `json:"port_name,omitempty" binding:"omitempty,min=2,max=50"`
	Remark    *string `json:"remark,omitempty" binding:"omitempty,max=500"`
}

// CreateReceiveAccountRequest represents the request for creating a receive account
type CreateReceiveAccountRequest struct {
	AccountName           string          `json:"account_name" binding:"required,min=2,max=50"`
	AccountNumber         string          `json:"account_number" binding:"required,min=6,max=30"`
	AccountType           string          `json:"account_type" binding:"required,oneof=alipay wechat bank other"`
	CustomPaymentProvider *string         `json:"custom_payment_provider,omitempty" binding:"omitempty,min=2,max=50"`
	AccountHolder         string          `json:"account_holder" binding:"required,min=2,max=50"`
	PaymentType           string          `json:"payment_type" binding:"required,oneof=private business"`
	BankName              *string         `json:"bank_name,omitempty" binding:"omitempty,min=2,max=100"`
	BankBranch            *string         `json:"bank_branch,omitempty" binding:"omitempty,min=2,max=100"`
	DailyLimit            decimal.Decimal `json:"daily_limit" binding:"gte=0"`
	SingleLimit           decimal.Decimal `json:"single_limit" binding:"gte=0"`
}

// MerchantResponse represents the response for merchant operations
type MerchantResponse struct {
	ID            uuid.UUID                `json:"id"`
	Name          string                   `json:"name"`
	Code          string                   `json:"code"`
	ContactPerson *string                  `json:"contact_person"`
	ContactPhone  *string                  `json:"contact_phone"`
	ContactEmail  *string                  `json:"contact_email"`
	Status        string                   `json:"status"`
	DailyLimit    decimal.Decimal          `json:"daily_limit"`
	SingleLimit   decimal.Decimal          `json:"single_limit"`
	DailyUsed     decimal.Decimal          `json:"daily_used"`
	AgentName     *string                  `json:"agent_name"`
	PortName      *string                  `json:"port_name"`
	Remark        *string                  `json:"remark"`
	Accounts      []*ReceiveAccountResponse `json:"accounts,omitempty"`
	CreatedAt     time.Time                `json:"created_at"`
	UpdatedAt     time.Time                `json:"updated_at"`
}

// ReceiveAccountResponse represents the response for receive account operations
type ReceiveAccountResponse struct {
	ID                    uuid.UUID       `json:"id"`
	AccountName           string          `json:"account_name"`
	AccountNumber         string          `json:"account_number"`
	AccountType           string          `json:"account_type"`
	CustomPaymentProvider *string         `json:"custom_payment_provider"`
	AccountHolder         string          `json:"account_holder"`
	PaymentType           string          `json:"payment_type"`
	BankName              *string         `json:"bank_name"`
	BankBranch            *string         `json:"bank_branch"`
	Status                string          `json:"status"`
	DailyLimit            decimal.Decimal `json:"daily_limit"`
	SingleLimit           decimal.Decimal `json:"single_limit"`
	DailyUsed             decimal.Decimal `json:"daily_used"`
	CreatedAt             time.Time       `json:"created_at"`
	UpdatedAt             time.Time       `json:"updated_at"`
}

// AgentSuggestionResponse represents the response for agent suggestions
type AgentSuggestionResponse struct {
	AgentName  string    `json:"agent_name"`
	UsageCount int       `json:"usage_count"`
	LastUsedAt time.Time `json:"last_used_at"`
}

// ValidationErrorResponse represents validation error details
type ValidationErrorResponse struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

// ErrorResponse represents API error response
type ErrorResponse struct {
	Code             string                      `json:"code"`
	Message          string                      `json:"message"`
	ValidationErrors []*ValidationErrorResponse  `json:"validation_errors,omitempty"`
	Details          interface{}                 `json:"details,omitempty"`
}

// TransactionStatisticsData represents transaction statistics data from database
type TransactionStatisticsData struct {
	TotalCount    int64           `json:"total_count" db:"total_count"`
	TotalAmount   decimal.Decimal `json:"total_amount" db:"total_amount"`
	SuccessCount  int64           `json:"success_count" db:"success_count"`
	SuccessAmount decimal.Decimal `json:"success_amount" db:"success_amount"`
	FailedCount   int64           `json:"failed_count" db:"failed_count"`
	FailedAmount  decimal.Decimal `json:"failed_amount" db:"failed_amount"`
	PendingCount  int64           `json:"pending_count" db:"pending_count"`
	PendingAmount decimal.Decimal `json:"pending_amount" db:"pending_amount"`
	RefundCount   int64           `json:"refund_count" db:"refund_count"`
	RefundAmount  decimal.Decimal `json:"refund_amount" db:"refund_amount"`
}

// MerchantStatisticsData represents merchant statistics data from database
type MerchantStatisticsData struct {
	MerchantID      uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	MerchantName    string          `json:"merchant_name" db:"merchant_name"`
	MerchantCode    string          `json:"merchant_code" db:"merchant_code"`
	TotalCount      int64           `json:"total_count" db:"total_count"`
	TotalAmount     decimal.Decimal `json:"total_amount" db:"total_amount"`
	SuccessCount    int64           `json:"success_count" db:"success_count"`
	SuccessAmount   decimal.Decimal `json:"success_amount" db:"success_amount"`
	FailedCount     int64           `json:"failed_count" db:"failed_count"`
	FailedAmount    decimal.Decimal `json:"failed_amount" db:"failed_amount"`
	DailyLimit      decimal.Decimal `json:"daily_limit" db:"daily_limit"`
	DailyUsed       decimal.Decimal `json:"daily_used" db:"daily_used"`
}

// AccountStatisticsData represents account statistics data from database
type AccountStatisticsData struct {
	AccountID     uuid.UUID       `json:"account_id" db:"account_id"`
	AccountName   string          `json:"account_name" db:"account_name"`
	AccountNumber string          `json:"account_number" db:"account_number"`
	AccountType   string          `json:"account_type" db:"account_type"`
	PaymentType   string          `json:"payment_type" db:"payment_type"`
	TotalCount    int64           `json:"total_count" db:"total_count"`
	TotalAmount   decimal.Decimal `json:"total_amount" db:"total_amount"`
	SuccessCount  int64           `json:"success_count" db:"success_count"`
	SuccessAmount decimal.Decimal `json:"success_amount" db:"success_amount"`
	FailedCount   int64           `json:"failed_count" db:"failed_count"`
	FailedAmount  decimal.Decimal `json:"failed_amount" db:"failed_amount"`
	DailyLimit    decimal.Decimal `json:"daily_limit" db:"daily_limit"`
	DailyUsed     decimal.Decimal `json:"daily_used" db:"daily_used"`
}

// AggregationData represents aggregated transaction data
type AggregationData struct {
	Dimensions    map[string]interface{} `json:"dimensions"`
	Count         int64                  `json:"count" db:"count"`
	Amount        decimal.Decimal        `json:"amount" db:"amount"`
	SuccessCount  int64                  `json:"success_count" db:"success_count"`
	SuccessAmount decimal.Decimal        `json:"success_amount" db:"success_amount"`
	FailedCount   int64                  `json:"failed_count" db:"failed_count"`
	FailedAmount  decimal.Decimal        `json:"failed_amount" db:"failed_amount"`
}

// TimeSeriesData represents time series data point
type TimeSeriesData struct {
	Timestamp time.Time                  `json:"timestamp" db:"timestamp"`
	Values    map[string]decimal.Decimal `json:"values"`
}

// RotationRule represents a rotation rule for account selection
type RotationRule struct {
	ID             uuid.UUID              `json:"id" db:"id"`
	MerchantID     uuid.UUID              `json:"merchant_id" db:"merchant_id"`
	RuleName       string                 `json:"rule_name" db:"rule_name"`
	StrategyType   string                 `json:"strategy_type" db:"strategy_type"`
	StrategyConfig map[string]interface{} `json:"strategy_config" db:"strategy_config"`
	IsActive       bool                   `json:"is_active" db:"is_active"`
	Priority       int                    `json:"priority" db:"priority"`
	CreatedAt      time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at" db:"updated_at"`
	CreatedBy      *uuid.UUID             `json:"created_by" db:"created_by"`
	UpdatedBy      *uuid.UUID             `json:"updated_by" db:"updated_by"`
}

// StrategyConfig represents the configuration for rotation strategies
type StrategyConfig map[string]interface{}

// Scan implements the sql.Scanner interface for StrategyConfig
func (sc *StrategyConfig) Scan(value interface{}) error {
	if value == nil {
		*sc = make(StrategyConfig)
		return nil
	}
	
	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, sc)
	case string:
		return json.Unmarshal([]byte(v), sc)
	default:
		return fmt.Errorf("cannot scan %T into StrategyConfig", value)
	}
}

// Value implements the driver.Valuer interface for StrategyConfig
func (sc StrategyConfig) Value() (driver.Value, error) {
	if sc == nil {
		return nil, nil
	}
	return json.Marshal(sc)
}

// CreateRotationRuleRequest represents the request for creating a rotation rule
type CreateRotationRuleRequest struct {
	MerchantID     uuid.UUID              `json:"merchant_id" binding:"required"`
	RuleName       string                 `json:"rule_name" binding:"required,min=2,max=100"`
	StrategyType   string                 `json:"strategy_type" binding:"required,oneof=weighted time_based amount_tier round_robin"`
	StrategyConfig map[string]interface{} `json:"strategy_config" binding:"required"`
	Priority       *int                   `json:"priority,omitempty" binding:"omitempty,min=1"`
}

// UpdateRotationRuleRequest represents the request for updating a rotation rule
type UpdateRotationRuleRequest struct {
	RuleName       *string                 `json:"rule_name,omitempty" binding:"omitempty,min=2,max=100"`
	StrategyType   *string                 `json:"strategy_type,omitempty" binding:"omitempty,oneof=weighted time_based amount_tier round_robin"`
	StrategyConfig *map[string]interface{} `json:"strategy_config,omitempty"`
	IsActive       *bool                   `json:"is_active,omitempty"`
	Priority       *int                    `json:"priority,omitempty" binding:"omitempty,min=1"`
}

// RotationRuleResponse represents the response for rotation rule operations
type RotationRuleResponse struct {
	ID             uuid.UUID              `json:"id"`
	MerchantID     uuid.UUID              `json:"merchant_id"`
	MerchantName   string                 `json:"merchant_name,omitempty"`
	RuleName       string                 `json:"rule_name"`
	StrategyType   string                 `json:"strategy_type"`
	StrategyConfig map[string]interface{} `json:"strategy_config"`
	IsActive       bool                   `json:"is_active"`
	Priority       int                    `json:"priority"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// RealTimeStatisticsData represents real-time statistics data
type RealTimeStatisticsData struct {
	TodayStats     *TransactionStatisticsData `json:"today_stats"`
	YesterdayStats *TransactionStatisticsData `json:"yesterday_stats"`
	WeekStats      *TransactionStatisticsData `json:"week_stats"`
	MonthStats     *TransactionStatisticsData `json:"month_stats"`
	ActiveMerchants int64                     `json:"active_merchants" db:"active_merchants"`
	ActiveAccounts  int64                     `json:"active_accounts" db:"active_accounts"`
	PendingOrders   int64                     `json:"pending_orders" db:"pending_orders"`
	FailedOrders    int64                     `json:"failed_orders" db:"failed_orders"`
}

// DashboardData represents dashboard data
type DashboardData struct {
	Statistics   *TransactionStatisticsData `json:"statistics"`
	TrendData    []*TimeSeriesData          `json:"trend_data"`
	TopMerchants []*MerchantStatisticsData  `json:"top_merchants"`
	TopAccounts  []*AccountStatisticsData   `json:"top_accounts"`
	RecentOrders []*RecentOrderData         `json:"recent_orders"`
}

// RecentOrderData represents recent order data
type RecentOrderData struct {
	ID           uuid.UUID       `json:"id" db:"id"`
	OrderNumber  string          `json:"order_number" db:"order_number"`
	PayerName    string          `json:"payer_name" db:"payer_name"`
	Amount       decimal.Decimal `json:"amount" db:"amount"`
	MerchantName string          `json:"merchant_name" db:"merchant_name"`
	Status       string          `json:"status" db:"status"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}

// SystemHealthData represents system health status data
type SystemHealthData struct {
	DatabaseStatus    string    `json:"database_status" db:"database_status"`
	CacheStatus       string    `json:"cache_status" db:"cache_status"`
	QueueStatus       string    `json:"queue_status" db:"queue_status"`
	ExternalAPIStatus string    `json:"external_api_status" db:"external_api_status"`
	LastCheckedAt     time.Time `json:"last_checked_at" db:"last_checked_at"`
}

// Multi-dimensional query data types
type TransactionDetailData struct {
	ID              uuid.UUID       `json:"id" db:"id"`
	OrderNumber     string          `json:"order_number" db:"order_number"`
	PayerName       string          `json:"payer_name" db:"payer_name"`
	PayerAccount    string          `json:"payer_account" db:"payer_account"`
	PaymentType     string          `json:"payment_type" db:"payment_type"`
	Amount          decimal.Decimal `json:"amount" db:"amount"`
	MerchantID      uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	MerchantName    string          `json:"merchant_name" db:"merchant_name"`
	MerchantCode    string          `json:"merchant_code" db:"merchant_code"`
	AdAccount       string          `json:"ad_account" db:"ad_account"`
	AccountID       uuid.UUID       `json:"account_id" db:"account_id"`
	AccountName     string          `json:"account_name" db:"account_name"`
	AccountNumber   string          `json:"account_number" db:"account_number"`
	AccountType     string          `json:"account_type" db:"account_type"`
	Status          string          `json:"status" db:"status"`
	Remark          *string         `json:"remark" db:"remark"`
	VoucherURL      *string         `json:"voucher_url" db:"voucher_url"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
	ProcessedAt     *time.Time      `json:"processed_at" db:"processed_at"`
}

type FilterOptionsData struct {
	Merchants    []*FilterMerchantData `json:"merchants,omitempty"`
	Accounts     []*FilterAccountData  `json:"accounts,omitempty"`
	Statuses     []*FilterStatusData   `json:"statuses,omitempty"`
	AccountTypes []*FilterTypeData     `json:"account_types,omitempty"`
	PaymentTypes []*FilterTypeData     `json:"payment_types,omitempty"`
}

type FilterMerchantData struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	Name             string          `json:"name" db:"name"`
	Code             string          `json:"code" db:"code"`
	TransactionCount int64           `json:"transaction_count" db:"transaction_count"`
	TotalAmount      decimal.Decimal `json:"total_amount" db:"total_amount"`
}

type FilterAccountData struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	Name             string          `json:"name" db:"name"`
	Number           string          `json:"number" db:"number"`
	Type             string          `json:"type" db:"type"`
	PaymentType      string          `json:"payment_type" db:"payment_type"`
	TransactionCount int64           `json:"transaction_count" db:"transaction_count"`
	TotalAmount      decimal.Decimal `json:"total_amount" db:"total_amount"`
}

type FilterStatusData struct {
	Status      string          `json:"status" db:"status"`
	DisplayName string          `json:"display_name" db:"display_name"`
	Count       int64           `json:"count" db:"count"`
	Percentage  decimal.Decimal `json:"percentage" db:"percentage"`
}

type FilterTypeData struct {
	Type        string          `json:"type" db:"type"`
	DisplayName string          `json:"display_name" db:"display_name"`
	Count       int64           `json:"count" db:"count"`
	Percentage  decimal.Decimal `json:"percentage" db:"percentage"`
}

type TimeDimensionData struct {
	Timestamp     time.Time       `json:"timestamp" db:"timestamp"`
	PeriodLabel   string          `json:"period_label" db:"period_label"`
	Count         int64           `json:"count" db:"count"`
	Amount        decimal.Decimal `json:"amount" db:"amount"`
	SuccessCount  int64           `json:"success_count" db:"success_count"`
	SuccessAmount decimal.Decimal `json:"success_amount" db:"success_amount"`
	FailedCount   int64           `json:"failed_count" db:"failed_count"`
	FailedAmount  decimal.Decimal `json:"failed_amount" db:"failed_amount"`
}

type StatusDimensionData struct {
	Status        string          `json:"status" db:"status"`
	DisplayName   string          `json:"display_name" db:"display_name"`
	Count         int64           `json:"count" db:"count"`
	Amount        decimal.Decimal `json:"amount" db:"amount"`
	Percentage    decimal.Decimal `json:"percentage" db:"percentage"`
	AmountPercent decimal.Decimal `json:"amount_percent" db:"amount_percent"`
}

type MerchantDimensionData struct {
	MerchantID       uuid.UUID       `json:"merchant_id" db:"merchant_id"`
	MerchantName     string          `json:"merchant_name" db:"merchant_name"`
	MerchantCode     string          `json:"merchant_code" db:"merchant_code"`
	Count            int64           `json:"count" db:"count"`
	Amount           decimal.Decimal `json:"amount" db:"amount"`
	SuccessCount     int64           `json:"success_count" db:"success_count"`
	SuccessAmount    decimal.Decimal `json:"success_amount" db:"success_amount"`
	FailedCount      int64           `json:"failed_count" db:"failed_count"`
	FailedAmount     decimal.Decimal `json:"failed_amount" db:"failed_amount"`
	DailyLimit       decimal.Decimal `json:"daily_limit" db:"daily_limit"`
	DailyUsed        decimal.Decimal `json:"daily_used" db:"daily_used"`
}

type AccountDimensionData struct {
	AccountID        uuid.UUID       `json:"account_id" db:"account_id"`
	AccountName      string          `json:"account_name" db:"account_name"`
	AccountNumber    string          `json:"account_number" db:"account_number"`
	AccountType      string          `json:"account_type" db:"account_type"`
	PaymentType      string          `json:"payment_type" db:"payment_type"`
	Count            int64           `json:"count" db:"count"`
	Amount           decimal.Decimal `json:"amount" db:"amount"`
	SuccessCount     int64           `json:"success_count" db:"success_count"`
	SuccessAmount    decimal.Decimal `json:"success_amount" db:"success_amount"`
	FailedCount      int64           `json:"failed_count" db:"failed_count"`
	FailedAmount     decimal.Decimal `json:"failed_amount" db:"failed_amount"`
	DailyLimit       decimal.Decimal `json:"daily_limit" db:"daily_limit"`
	DailyUsed        decimal.Decimal `json:"daily_used" db:"daily_used"`
}

// TransactionStats represents transaction statistics
type TransactionStats struct {
	TotalCount    int64           `json:"total_count"`
	TotalAmount   decimal.Decimal `json:"total_amount"`
	SuccessCount  int64           `json:"success_count"`
	SuccessAmount decimal.Decimal `json:"success_amount"`
	FailedCount   int64           `json:"failed_count"`
	FailedAmount  decimal.Decimal `json:"failed_amount"`
	PendingCount  int64           `json:"pending_count"`
	PendingAmount decimal.Decimal `json:"pending_amount"`
}
//
 Recharge Testing System DTOs

// CreateRechargeOrderRequest represents the request for creating a recharge order
type CreateRechargeOrderRequest struct {
	PayerName        string          `json:"payer_name" binding:"required,min=2,max=50"`
	Amount           decimal.Decimal `json:"amount" binding:"required,gt=0"`
	AdAccount        string          `json:"ad_account" binding:"required,min=2,max=100"`
	PaymentType      string          `json:"payment_type" binding:"required,oneof=private business"`
	MerchantID       uuid.UUID       `json:"merchant_id" binding:"required"`
	PayerAccount     *string         `json:"payer_account,omitempty" binding:"omitempty,min=6,max=50"`
	Remark           *string         `json:"remark,omitempty" binding:"omitempty,max=500"`
	IPAddress        *string         `json:"ip_address,omitempty"`
	UserAgent        *string         `json:"user_agent,omitempty"`
}

// UpdateRechargeOrderRequest represents the request for updating a recharge order
type UpdateRechargeOrderRequest struct {
	Status           *string `json:"status,omitempty" binding:"omitempty,oneof=pending paid confirmed completed cancelled expired failed"`
	PaymentProof     *string `json:"payment_proof,omitempty" binding:"omitempty,max=1000"`
	ProcessingNotes  *string `json:"processing_notes,omitempty" binding:"omitempty,max=1000"`
	Remark           *string `json:"remark,omitempty" binding:"omitempty,max=500"`
}

// RechargeOrderResponse represents the response for recharge order operations
type RechargeOrderResponse struct {
	ID               uuid.UUID                `json:"id"`
	OrderNumber      string                   `json:"order_number"`
	PayerName        string                   `json:"payer_name"`
	PayerAccount     string                   `json:"payer_account"`
	PaymentType      string                   `json:"payment_type"`
	Amount           decimal.Decimal          `json:"amount"`
	AdAccount        string                   `json:"ad_account"`
	Status           string                   `json:"status"`
	PaymentProof     *string                  `json:"payment_proof"`
	ProcessingNotes  *string                  `json:"processing_notes"`
	AutoMatched      bool                     `json:"auto_matched"`
	MatchScore       *int                     `json:"match_score"`
	CompletedAt      *time.Time               `json:"completed_at"`
	ExpiredAt        *time.Time               `json:"expired_at"`
	Merchant         *MerchantResponse        `json:"merchant,omitempty"`
	ReceiveAccount   *ReceiveAccountResponse  `json:"receive_account,omitempty"`
	CreatedAt        time.Time                `json:"created_at"`
	UpdatedAt        time.Time                `json:"updated_at"`
}

// CreateRechargeSessionRequest represents the request for creating a recharge session
type CreateRechargeSessionRequest struct {
	MerchantID   uuid.UUID              `json:"merchant_id" binding:"required"`
	IPAddress    *string                `json:"ip_address,omitempty"`
	UserAgent    *string                `json:"user_agent,omitempty"`
	FormData     map[string]interface{} `json:"form_data,omitempty"`
	CurrentStep  string                 `json:"current_step" binding:"required"`
	ExpiresIn    int                    `json:"expires_in,omitempty"` // seconds, default 3600
}

// UpdateRechargeSessionRequest represents the request for updating a recharge session
type UpdateRechargeSessionRequest struct {
	FormData         map[string]interface{} `json:"form_data,omitempty"`
	CurrentStep      *string                `json:"current_step,omitempty"`
	MatchedAccountID *uuid.UUID             `json:"matched_account_id,omitempty"`
	RechargeOrderID  *uuid.UUID             `json:"recharge_order_id,omitempty"`
}

// RechargeSessionResponse represents the response for recharge session operations
type RechargeSessionResponse struct {
	ID               uuid.UUID              `json:"id"`
	SessionToken     string                 `json:"session_token"`
	MerchantID       uuid.UUID              `json:"merchant_id"`
	FormData         map[string]interface{} `json:"form_data"`
	CurrentStep      string                 `json:"current_step"`
	MatchedAccountID *uuid.UUID             `json:"matched_account_id,omitempty"`
	RechargeOrderID  *uuid.UUID             `json:"recharge_order_id,omitempty"`
	ExpiresAt        time.Time              `json:"expires_at"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

// AccountMatchRequest represents a request for account matching
type AccountMatchRequest struct {
	MerchantID   uuid.UUID       `json:"merchant_id" binding:"required"`
	PaymentType  string          `json:"payment_type" binding:"required,oneof=private business"`
	Amount       decimal.Decimal `json:"amount" binding:"required,gt=0"`
	PayerInfo    *PayerInfo      `json:"payer_info,omitempty"`
}

// PayerInfo represents information about the payer
type PayerInfo struct {
	Name    string  `json:"name"`
	Account *string `json:"account,omitempty"`
}

// AccountMatchResponse represents the response for account matching
type AccountMatchResponse struct {
	Success          bool                    `json:"success"`
	MatchedAccount   *ReceiveAccountResponse `json:"matched_account,omitempty"`
	MatchScore       *int                    `json:"match_score,omitempty"`
	MatchReason      *string                 `json:"match_reason,omitempty"`
	AvailableAccounts int                    `json:"available_accounts"`
	ErrorMessage     *string                 `json:"error_message,omitempty"`
}

// DataExportRequest represents a request for data export
type DataExportRequest struct {
	ExportType  string     `json:"export_type" binding:"required,oneof=orders merchants accounts daily_summary"`
	StartDate   time.Time  `json:"start_date" binding:"required"`
	EndDate     time.Time  `json:"end_date" binding:"required"`
	Format      string     `json:"format" binding:"required,oneof=excel csv json"`
	MerchantIDs []uuid.UUID `json:"merchant_ids,omitempty"`
	Status      []string   `json:"status,omitempty"`
	IncludeSensitiveData bool `json:"include_sensitive_data,omitempty"`
}

// DataExportResponse represents the response for data export
type DataExportResponse struct {
	ID           uuid.UUID `json:"id"`
	ExportType   string    `json:"export_type"`
	Status       string    `json:"status"`
	RecordCount  int       `json:"record_count"`
	FileSize     *int64    `json:"file_size,omitempty"`
	DownloadURL  *string   `json:"download_url,omitempty"`
	ErrorMessage *string   `json:"error_message,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// ListRechargeOrdersRequest represents the request for listing recharge orders
type ListRechargeOrdersRequest struct {
	Status       []string    `json:"status,omitempty"`
	PaymentType  *string     `json:"payment_type,omitempty"`
	MerchantID   *uuid.UUID  `json:"merchant_id,omitempty"`
	PayerName    *string     `json:"payer_name,omitempty"`
	StartDate    *time.Time  `json:"start_date,omitempty"`
	EndDate      *time.Time  `json:"end_date,omitempty"`
	Page         int         `json:"page,omitempty"`
	Limit        int         `json:"limit,omitempty"`
	OrderBy      string      `json:"order_by,omitempty"`
	OrderDir     string      `json:"order_dir,omitempty"`
}

// ListRechargeOrdersResponse represents the response for listing recharge orders
type ListRechargeOrdersResponse struct {
	Orders     []*RechargeOrderResponse `json:"orders"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	Limit      int                      `json:"limit"`
	TotalPages int                      `json:"total_pages"`
}// 
DataExportLog represents a data export log entry
type DataExportLog struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	ExportType  string     `json:"export_type" gorm:"size:50;not null"`
	StartDate   time.Time  `json:"start_date"`
	EndDate     time.Time  `json:"end_date"`
	MerchantID  *uint      `json:"merchant_id"`
	RecordCount int        `json:"record_count"`
	FileName    string     `json:"file_name" gorm:"size:200"`
	FileSize    int64      `json:"file_size"`
	Status      string     `json:"status" gorm:"size:20;default:pending"`
	ErrorMsg    string     `json:"error_msg" gorm:"size:1000"`
	ExportedAt  time.Time  `json:"exported_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	
	Merchant *Merchant `json:"merchant,omitempty" gorm:"foreignKey:MerchantID"`
}

// ExportSchedule represents an automated export schedule
type ExportSchedule struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Description string    `json:"description" gorm:"size:500"`
	ExportType  string    `json:"export_type" gorm:"size:50;not null"` // daily, weekly, monthly
	Schedule    string    `json:"schedule" gorm:"size:100;not null"`   // cron expression
	MerchantID  *uint     `json:"merchant_id"`
	Status      string    `json:"status" gorm:"size:20;default:active"`
	EmailList   string    `json:"email_list" gorm:"size:1000"` // comma-separated emails
	LastRunAt   *time.Time `json:"last_run_at"`
	NextRunAt   *time.Time `json:"next_run_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	Merchant *Merchant `json:"merchant,omitempty" gorm:"foreignKey:MerchantID"`
}

// Notification represents a system notification
type Notification struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Type      string    `json:"type" gorm:"size:50"`
	Title     string    `json:"title" gorm:"size:200"`
	Content   string    `json:"content" gorm:"type:text"`
	Recipient string    `json:"recipient" gorm:"size:100"`
	Channel   string    `json:"channel" gorm:"size:20"`
	Status    string    `json:"status" gorm:"size:20;default:pending"`
	SentAt    *time.Time `json:"sent_at"`
	CreatedAt time.Time `json:"created_at"`
}

// RechargeLink 充值链接管理模型
type RechargeLink struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	ShortCode  string     `json:"short_code" db:"short_code"`
	MerchantID *uuid.UUID `json:"merchant_id" db:"merchant_id"`
	LinkType   string     `json:"link_type" db:"link_type"`
	Title      *string    `json:"title" db:"title"`
	Description *string   `json:"description" db:"description"`
	
	// 预填充信息
	PrefillMerchantName *string         `json:"prefill_merchant_name" db:"prefill_merchant_name"`
	PrefillAdAccount    *string         `json:"prefill_ad_account" db:"prefill_ad_account"`
	PrefillAmount       *decimal.Decimal `json:"prefill_amount" db:"prefill_amount"`
	PrefillRemark       *string         `json:"prefill_remark" db:"prefill_remark"`
	
	// 访问控制
	IsActive            bool       `json:"is_active" db:"is_active"`
	ExpiresAt          *time.Time `json:"expires_at" db:"expires_at"`
	MaxUses            *int       `json:"max_uses" db:"max_uses"`
	CurrentUses        int        `json:"current_uses" db:"current_uses"`
	AllowedIPs         []string   `json:"allowed_ips" db:"allowed_ips"`
	RequireVerification bool       `json:"require_verification" db:"require_verification"`
	
	// 统计信息
	TotalVisits       int             `json:"total_visits" db:"total_visits"`
	SuccessfulOrders  int             `json:"successful_orders" db:"successful_orders"`
	TotalAmount       decimal.Decimal `json:"total_amount" db:"total_amount"`
	LastAccessedAt   *time.Time      `json:"last_accessed_at" db:"last_accessed_at"`
	
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	CreatedBy *uuid.UUID `json:"created_by" db:"created_by"`
	UpdatedBy *uuid.UUID `json:"updated_by" db:"updated_by"`
	
	// 关联数据
	Merchant *Merchant `json:"merchant,omitempty"`
}

// RechargeLinkLog 充值链接访问日志模型
type RechargeLinkLog struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	LinkID    uuid.UUID  `json:"link_id" db:"link_id"`
	VisitorIP *string    `json:"visitor_ip" db:"visitor_ip"`
	UserAgent *string    `json:"user_agent" db:"user_agent"`
	Referer   *string    `json:"referer" db:"referer"`
	
	// 访问结果
	Action  string     `json:"action" db:"action"`
	OrderID *uuid.UUID `json:"order_id" db:"order_id"`
	
	// 地理位置信息
	Country *string `json:"country" db:"country"`
	Region  *string `json:"region" db:"region"`
	City    *string `json:"city" db:"city"`
	
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	
	// 关联数据
	RechargeLink *RechargeLink  `json:"recharge_link,omitempty"`
	RechargeOrder *RechargeOrder `json:"recharge_order,omitempty"`
}

// PayerVerification 付款人身份验证记录模型
type PayerVerification struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	PayerName             string     `json:"payer_name" db:"payer_name"`
	PayerAccount          string     `json:"payer_account" db:"payer_account"`
	AccountType           string     `json:"account_type" db:"account_type"`
	
	// 身份验证信息
	VerificationType      string     `json:"verification_type" db:"verification_type"`
	VerificationStatus    string     `json:"verification_status" db:"verification_status"`
	VerificationMethod    *string    `json:"verification_method" db:"verification_method"`
	
	// 验证数据
	IdentityDocumentType  *string    `json:"identity_document_type" db:"identity_document_type"`
	IdentityDocumentNumber *string   `json:"identity_document_number" db:"identity_document_number"`
	PhoneNumber           *string    `json:"phone_number" db:"phone_number"`
	Email                 *string    `json:"email" db:"email"`
	
	// 验证结果
	VerificationScore     *int       `json:"verification_score" db:"verification_score"`
	RiskLevel             string     `json:"risk_level" db:"risk_level"`
	VerificationDetails   map[string]interface{} `json:"verification_details" db:"verification_details"`
	FailureReason         *string    `json:"failure_reason" db:"failure_reason"`
	
	// 账户信息验证
	AccountHolderName     *string    `json:"account_holder_name" db:"account_holder_name"`
	AccountHolderVerified bool       `json:"account_holder_verified" db:"account_holder_verified"`
	BankName              *string    `json:"bank_name" db:"bank_name"`
	BankBranch            *string    `json:"bank_branch" db:"bank_branch"`
	
	// 时间信息
	VerifiedAt            *time.Time `json:"verified_at" db:"verified_at"`
	ExpiresAt             *time.Time `json:"expires_at" db:"expires_at"`
	LastUsedAt            *time.Time `json:"last_used_at" db:"last_used_at"`
	
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
	CreatedBy             *uuid.UUID `json:"created_by" db:"created_by"`
	UpdatedBy             *uuid.UUID `json:"updated_by" db:"updated_by"`
}

// PayerBlacklist 付款人黑名单模型
type PayerBlacklist struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	PayerName       *string    `json:"payer_name" db:"payer_name"`
	PayerAccount    *string    `json:"payer_account" db:"payer_account"`
	AccountType     *string    `json:"account_type" db:"account_type"`
	
	// 黑名单信息
	BlacklistType   string     `json:"blacklist_type" db:"blacklist_type"`
	Reason          string     `json:"reason" db:"reason"`
	Severity        string     `json:"severity" db:"severity"`
	
	// 处理信息
	ReportedBy      *uuid.UUID `json:"reported_by" db:"reported_by"`
	ReviewedBy      *uuid.UUID `json:"reviewed_by" db:"reviewed_by"`
	Status          string     `json:"status" db:"status"`
	
	// 时间信息
	EffectiveFrom   time.Time  `json:"effective_from" db:"effective_from"`
	ExpiresAt       *time.Time `json:"expires_at" db:"expires_at"`
	
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// AccountMatchVerification 账户匹配验证模型
type AccountMatchVerification struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	RechargeOrderID       uuid.UUID  `json:"recharge_order_id" db:"recharge_order_id"`
	PayerName             string     `json:"payer_name" db:"payer_name"`
	PayerAccount          string     `json:"payer_account" db:"payer_account"`
	ReceiverName          string     `json:"receiver_name" db:"receiver_name"`
	ReceiverAccount       string     `json:"receiver_account" db:"receiver_account"`
	
	// 匹配验证结果
	MatchStatus           string     `json:"match_status" db:"match_status"`
	MatchScore            *decimal.Decimal `json:"match_score" db:"match_score"`
	MatchDetails          map[string]interface{} `json:"match_details" db:"match_details"`
	
	// 验证规则
	NameMatchResult       *bool      `json:"name_match_result" db:"name_match_result"`
	AccountMatchResult    *bool      `json:"account_match_result" db:"account_match_result"`
	BankMatchResult       *bool      `json:"bank_match_result" db:"bank_match_result"`
	AmountMatchResult     *bool      `json:"amount_match_result" db:"amount_match_result"`
	
	// 风险评估
	RiskFlags             []string   `json:"risk_flags" db:"risk_flags"`
	RiskScore             int        `json:"risk_score" db:"risk_score"`
	
	// 人工审核
	ManualReviewRequired  bool       `json:"manual_review_required" db:"manual_review_required"`
	ReviewedBy            *uuid.UUID `json:"reviewed_by" db:"reviewed_by"`
	ReviewNotes           *string    `json:"review_notes" db:"review_notes"`
	ReviewedAt            *time.Time `json:"reviewed_at" db:"reviewed_at"`
	
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
	
	// 关联数据
	RechargeOrder         *RechargeOrder `json:"recharge_order,omitempty"`
}

// DuplicatePaymentCheck 重复付款检测模型
type DuplicatePaymentCheck struct {
	ID                      uuid.UUID  `json:"id" db:"id"`
	PayerName               string     `json:"payer_name" db:"payer_name"`
	PayerAccount            string     `json:"payer_account" db:"payer_account"`
	ReceiverAccount         string     `json:"receiver_account" db:"receiver_account"`
	Amount                  decimal.Decimal `json:"amount" db:"amount"`
	
	// 检测窗口
	CheckWindowHours        int        `json:"check_window_hours" db:"check_window_hours"`
	
	// 检测结果
	IsDuplicate             bool       `json:"is_duplicate" db:"is_duplicate"`
	DuplicateCount          int        `json:"duplicate_count" db:"duplicate_count"`
	SimilarTransactionsCount int       `json:"similar_transactions_count" db:"similar_transactions_count"`
	
	// 相关订单
	OriginalOrderID         *uuid.UUID `json:"original_order_id" db:"original_order_id"`
	RelatedOrderIDs         []uuid.UUID `json:"related_order_ids" db:"related_order_ids"`
	
	// 检测详情
	DetectionMethod         string     `json:"detection_method" db:"detection_method"`
	DetectionDetails        map[string]interface{} `json:"detection_details" db:"detection_details"`
	ConfidenceScore         *decimal.Decimal `json:"confidence_score" db:"confidence_score"`
	
	// 处理状态
	Status                  string     `json:"status" db:"status"`
	ActionTaken             *string    `json:"action_taken" db:"action_taken"`
	
	// 审核信息
	ReviewedBy              *uuid.UUID `json:"reviewed_by" db:"reviewed_by"`
	ReviewDecision          *string    `json:"review_decision" db:"review_decision"`
	ReviewNotes             *string    `json:"review_notes" db:"review_notes"`
	ReviewedAt              *time.Time `json:"reviewed_at" db:"reviewed_at"`
	
	CreatedAt               time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at" db:"updated_at"`
	
	// 关联数据
	OriginalOrder           *RechargeOrder `json:"original_order,omitempty"`
}

// PayerCreditScore 付款人信用评分模型
type PayerCreditScore struct {
	ID                   uuid.UUID  `json:"id" db:"id"`
	PayerName            string     `json:"payer_name" db:"payer_name"`
	PayerAccount         string     `json:"payer_account" db:"payer_account"`
	AccountType          string     `json:"account_type" db:"account_type"`
	
	// 信用评分
	CreditScore          int        `json:"credit_score" db:"credit_score"`
	ScoreLevel           string     `json:"score_level" db:"score_level"`
	
	// 评分因子
	SuccessfulPayments   int        `json:"successful_payments" db:"successful_payments"`
	FailedPayments       int        `json:"failed_payments" db:"failed_payments"`
	DisputedPayments     int        `json:"disputed_payments" db:"disputed_payments"`
	TotalAmount          decimal.Decimal `json:"total_amount" db:"total_amount"`
	
	// 行为分析
	AvgPaymentAmount     *decimal.Decimal `json:"avg_payment_amount" db:"avg_payment_amount"`
	PaymentFrequency     *decimal.Decimal `json:"payment_frequency" db:"payment_frequency"`
	LastPaymentDate      *time.Time `json:"last_payment_date" db:"last_payment_date"`
	
	// 风险指标
	RiskIncidents        int        `json:"risk_incidents" db:"risk_incidents"`
	BlacklistHits        int        `json:"blacklist_hits" db:"blacklist_hits"`
	VerificationFailures int        `json:"verification_failures" db:"verification_failures"`
	
	// 时间信息
	ScoreCalculatedAt    time.Time  `json:"score_calculated_at" db:"score_calculated_at"`
	NextCalculationAt    *time.Time `json:"next_calculation_at" db:"next_calculation_at"`
	
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}

// Department 部门模型
type Department struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	TenantID    uuid.UUID  `json:"tenant_id" db:"tenant_id"`
	Name        string     `json:"name" db:"name"`
	Description *string    `json:"description" db:"description"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// UserDepartment 用户-部门关联模型
type UserDepartment struct {
	ID           uuid.UUID `json:"id" db:"id"`
	UserID       uuid.UUID `json:"user_id" db:"user_id"`
	DepartmentID uuid.UUID `json:"department_id" db:"department_id"`
	AssignedAt   time.Time `json:"assigned_at" db:"assigned_at"`
}

// RoleHierarchy 角色层级模型
type RoleHierarchy struct {
	ID           uuid.UUID `json:"id" db:"id"`
	ChildRoleID  uuid.UUID `json:"child_role_id" db:"child_role_id"`
	ParentRoleID uuid.UUID `json:"parent_role_id" db:"parent_role_id"`
	Scope        string    `json:"scope" db:"scope"` // platform, tenant, department
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// DepartmentRole 部门-角色关联模型
type DepartmentRole struct {
	ID           uuid.UUID `json:"id" db:"id"`
	DepartmentID uuid.UUID `json:"department_id" db:"department_id"`
	RoleID       uuid.UUID `json:"role_id" db:"role_id"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// Invoice 发票模型
type Invoice struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	TenantID         uuid.UUID       `json:"tenant_id" db:"tenant_id"`
	CustomerID       uuid.UUID       `json:"customer_id" db:"customer_id"`
	InvoiceNumber    string          `json:"invoice_number" db:"invoice_number"`
	OrderID          *uuid.UUID      `json:"order_id" db:"order_id"`

	// 发票信息
	InvoiceType      string          `json:"invoice_type" db:"invoice_type"`     // vat_normal, vat_special, electronic, paper
	InvoiceTitle     string          `json:"invoice_title" db:"invoice_title"`
	TaxNumber        string          `json:"tax_number" db:"tax_number"`

	// 金额信息
	Amount           decimal.Decimal `json:"amount" db:"amount"`
	TaxAmount        decimal.Decimal `json:"tax_amount" db:"tax_amount"`
	TotalAmount      decimal.Decimal `json:"total_amount" db:"total_amount"`

	// 发票状态
	Status           string          `json:"status" db:"status"` // pending, issued, sent, confirmed, cancelled

	// 发票文件
	FileURL          *string         `json:"file_url" db:"file_url"`
	FileName         *string         `json:"file_name" db:"file_name"`
	FileSize         *int64          `json:"file_size" db:"file_size"`

	// 申请和开具信息
	ApplicantID      *uuid.UUID      `json:"applicant_id" db:"applicant_id"`
	IssuerID         *uuid.UUID      `json:"issuer_id" db:"issuer_id"`

	// 收件信息
	RecipientName    *string         `json:"recipient_name" db:"recipient_name"`
	RecipientPhone   *string         `json:"recipient_phone" db:"recipient_phone"`
	RecipientAddress *string         `json:"recipient_address" db:"recipient_address"`

	// 备注
	Notes            *string         `json:"notes" db:"notes"`

	// 时间戳
	AppliedAt        time.Time       `json:"applied_at" db:"applied_at"`
	IssuedAt         *time.Time      `json:"issued_at" db:"issued_at"`
	SentAt           *time.Time      `json:"sent_at" db:"sent_at"`
	ConfirmedAt      *time.Time      `json:"confirmed_at" db:"confirmed_at"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
}

// SettlementOrder 结算订单模型
type SettlementOrder struct {
	ID                      uuid.UUID       `json:"id" db:"id"`
	TenantID                uuid.UUID       `json:"tenant_id" db:"tenant_id"`
	CustomerID              uuid.UUID       `json:"customer_id" db:"customer_id"`

	// 订单编号
	OrderNumber             string          `json:"order_number" db:"order_number"`

	// 结算信息
	SettlementPeriodStart   time.Time       `json:"settlement_period_start" db:"settlement_period_start"`
	SettlementPeriodEnd     time.Time       `json:"settlement_period_end" db:"settlement_period_end"`
	TotalAmount             decimal.Decimal `json:"total_amount" db:"total_amount"`
	SettledAmount           decimal.Decimal `json:"settled_amount" db:"settled_amount"`
	OutstandingAmount       decimal.Decimal `json:"outstanding_amount" db:"outstanding_amount"`

	// 关联的充值订单
	RelatedRechargeOrders   JSONBArray      `json:"related_recharge_orders" db:"related_recharge_orders"`

	// 结算状态
	Status                  string          `json:"status" db:"status"` // pending, reviewing, approved, rejected, settled, cancelled

	// 审批信息
	ReviewerID              *uuid.UUID      `json:"reviewer_id" db:"reviewer_id"`
	ReviewedAt              *time.Time      `json:"reviewed_at" db:"reviewed_at"`
	ReviewNotes             *string         `json:"review_notes" db:"review_notes"`

	// 结算完成信息
	SettlerID               *uuid.UUID      `json:"settler_id" db:"settler_id"`
	SettledAt               *time.Time      `json:"settled_at" db:"settled_at"`
	SettlementNotes         *string         `json:"settlement_notes" db:"settlement_notes"`

	// 附件
	AttachmentURL           *string         `json:"attachment_url" db:"attachment_url"`
	AttachmentName          *string         `json:"attachment_name" db:"attachment_name"`

	// 备注
	Notes                   *string         `json:"notes" db:"notes"`

	// 时间戳
	CreatedAt               time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time       `json:"updated_at" db:"updated_at"`
	CreatedBy               *uuid.UUID      `json:"created_by" db:"created_by"`
}

// CustomForm 自定义表单模型
type CustomForm struct {
	ID                 uuid.UUID              `json:"id" db:"id"`
	TenantID           uuid.UUID              `json:"tenant_id" db:"tenant_id"`

	// 表单基本信息
	Name               string                 `json:"name" db:"name"`
	Code               string                 `json:"code" db:"code"`
	Description        *string                `json:"description" db:"description"`
	Category           *string                `json:"category" db:"category"`

	// 表单配置
	Config             map[string]interface{} `json:"config" db:"config"`

	// 状态
	Status             string                 `json:"status" db:"status"` // draft, active, archived
	IsTemplate         bool                   `json:"is_template" db:"is_template"`

	// 权限控制
	AllowedRoles       JSONBArray             `json:"allowed_roles" db:"allowed_roles"`
	AllowedDepartments JSONBArray             `json:"allowed_departments" db:"allowed_departments"`

	// 创建和更新信息
	CreatedBy          *uuid.UUID             `json:"created_by" db:"created_by"`
	UpdatedBy          *uuid.UUID             `json:"updated_by" db:"updated_by"`
	CreatedAt          time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at" db:"updated_at"`
}

// FormField 表单字段模型
type FormField struct {
	ID               uuid.UUID              `json:"id" db:"id"`
	FormID           uuid.UUID              `json:"form_id" db:"form_id"`

	// 字段基本信息
	FieldName        string                 `json:"field_name" db:"field_name"`
	FieldLabel       string                 `json:"field_label" db:"field_label"`
	FieldType        string                 `json:"field_type" db:"field_type"`

	// 字段配置
	Placeholder      *string                `json:"placeholder" db:"placeholder"`
	DefaultValue     *string                `json:"default_value" db:"default_value"`
	Options          JSONBArray             `json:"options" db:"options"`
	ValidationRules  map[string]interface{} `json:"validation_rules" db:"validation_rules"`

	// 显示配置
	DisplayOrder     int                    `json:"display_order" db:"display_order"`
	IsRequired       bool                   `json:"is_required" db:"is_required"`
	IsVisible        bool                   `json:"is_visible" db:"is_visible"`
	IsReadonly       bool                   `json:"is_readonly" db:"is_readonly"`
	Width            string                 `json:"width" db:"width"`

	// 高级配置
	DependsOn        JSONBArray             `json:"depends_on" db:"depends_on"`
	HelpText         *string                `json:"help_text" db:"help_text"`
	ErrorMessage     *string                `json:"error_message" db:"error_message"`

	CreatedAt        time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at" db:"updated_at"`
}

// FormSubmission 表单提交记录模型
type FormSubmission struct {
	ID             uuid.UUID              `json:"id" db:"id"`
	FormID         uuid.UUID              `json:"form_id" db:"form_id"`
	TenantID       uuid.UUID              `json:"tenant_id" db:"tenant_id"`

	// 提交数据
	SubmissionData map[string]interface{} `json:"submission_data" db:"submission_data"`

	// 关联对象
	RelatedType    *string                `json:"related_type" db:"related_type"`
	RelatedID      *uuid.UUID             `json:"related_id" db:"related_id"`

	// 状态
	Status         string                 `json:"status" db:"status"` // submitted, reviewing, approved, rejected

	// 审核信息
	ReviewerID     *uuid.UUID             `json:"reviewer_id" db:"reviewer_id"`
	ReviewedAt     *time.Time             `json:"reviewed_at" db:"reviewed_at"`
	ReviewNotes    *string                `json:"review_notes" db:"review_notes"`

	// 提交信息
	SubmittedBy    *uuid.UUID             `json:"submitted_by" db:"submitted_by"`
	SubmittedAt    time.Time              `json:"submitted_at" db:"submitted_at"`

	// IP和用户代理
	IPAddress      *string                `json:"ip_address" db:"ip_address"`
	UserAgent      *string                `json:"user_agent" db:"user_agent"`

	CreatedAt      time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at" db:"updated_at"`
}

// FormSubmissionFile 表单提交附件模型
type FormSubmissionFile struct {
	ID           uuid.UUID `json:"id" db:"id"`
	SubmissionID uuid.UUID `json:"submission_id" db:"submission_id"`
	FieldName    string    `json:"field_name" db:"field_name"`

	// 文件信息
	FileURL      string    `json:"file_url" db:"file_url"`
	FileName     string    `json:"file_name" db:"file_name"`
	FileSize     *int64    `json:"file_size" db:"file_size"`
	MimeType     *string   `json:"mime_type" db:"mime_type"`

	UploadedAt   time.Time `json:"uploaded_at" db:"uploaded_at"`
}

// JSONBArray 用于处理JSONB数组类型
type JSONBArray []uuid.UUID

// Scan implements the sql.Scanner interface
func (j *JSONBArray) Scan(value interface{}) error {
	if value == nil {
		*j = JSONBArray{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), j)
	}
	return json.Unmarshal(bytes, j)
}

// Value implements the driver.Valuer interface
func (j JSONBArray) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("[]"), nil
	}
	return json.Marshal(j)
}

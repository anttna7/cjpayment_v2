package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Repository interfaces define the contract for data access operations

// UserRepository defines operations for user management
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByUsername(ctx context.Context, username string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *UserFilter) ([]*User, error)
	Count(ctx context.Context, filter *UserFilter) (int64, error)
}

// RoleRepository defines operations for role management
type RoleRepository interface {
	Create(ctx context.Context, role *Role) error
	GetByID(ctx context.Context, id uuid.UUID) (*Role, error)
	GetByName(ctx context.Context, name string) (*Role, error)
	Update(ctx context.Context, role *Role) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *RoleFilter) ([]*Role, error)
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*Role, error)
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	RemoveRoleFromUser(ctx context.Context, userID, roleID uuid.UUID) error
}

// PermissionRepository defines operations for permission management
type PermissionRepository interface {
	Create(ctx context.Context, permission *Permission) error
	GetByID(ctx context.Context, id uuid.UUID) (*Permission, error)
	Update(ctx context.Context, permission *Permission) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *PermissionFilter) ([]*Permission, error)
	GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*Permission, error)
	AssignPermissionToRole(ctx context.Context, roleID, permissionID uuid.UUID) error
	RemovePermissionFromRole(ctx context.Context, roleID, permissionID uuid.UUID) error
}

// MerchantRepository defines operations for merchant management
type MerchantRepository interface {
	Create(ctx context.Context, merchant *Merchant) error
	GetByID(ctx context.Context, id uuid.UUID) (*Merchant, error)
	GetByCode(ctx context.Context, code string) (*Merchant, error)
	Update(ctx context.Context, merchant *Merchant) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *MerchantFilter) ([]*Merchant, error)
	Count(ctx context.Context, filter *MerchantFilter) (int64, error)
	Search(ctx context.Context, keyword string) ([]*Merchant, error)
	UpdateDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error
	ResetDailyLimits(ctx context.Context) error
	
	// New methods for merchant modal functionality
	ExistsByName(ctx context.Context, name string) (bool, error)
	ExistsByPortName(ctx context.Context, portName string) (bool, error)
	GetMerchantWithAccounts(ctx context.Context, id uuid.UUID) (*Merchant, []*ReceiveAccount, error)
}

// ReceiveAccountRepository defines operations for receive account management
type ReceiveAccountRepository interface {
	Create(ctx context.Context, account *ReceiveAccount) error
	GetByID(ctx context.Context, id uuid.UUID) (*ReceiveAccount, error)
	GetByAccountNumber(ctx context.Context, accountNumber string) (*ReceiveAccount, error)
	Update(ctx context.Context, account *ReceiveAccount) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *ReceiveAccountFilter) ([]*ReceiveAccount, error)
	Count(ctx context.Context, filter *ReceiveAccountFilter) (int64, error)
	GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*ReceiveAccount, error)
	GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*ReceiveAccount, error)
	UpdateDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error
	ResetDailyLimits(ctx context.Context) error
	
	// New methods for merchant modal functionality
	ExistsByAccountNumber(ctx context.Context, accountNumber string) (bool, error)
	CreateWithMerchantAssociation(ctx context.Context, account *ReceiveAccount, merchantID uuid.UUID, weight int) error
	ValidateAccountType(ctx context.Context, accountType string) error
	ValidatePaymentProvider(ctx context.Context, accountType string, customPaymentProvider *string) error
}

// RotationRuleRepository defines operations for rotation rule management
type RotationRuleRepository interface {
	Create(ctx context.Context, rule *RotationRule) error
	GetByID(ctx context.Context, id uuid.UUID) (*RotationRule, error)
	GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*RotationRule, error)
	Update(ctx context.Context, rule *RotationRule) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *RotationRuleFilter) ([]*RotationRule, error)
}

// RechargeOrderRepository defines operations for recharge order management
type RechargeOrderRepository interface {
	Create(ctx context.Context, order *RechargeOrder) error
	GetByID(ctx context.Context, id uuid.UUID) (*RechargeOrder, error)
	GetByOrderNumber(ctx context.Context, orderNumber string) (*RechargeOrder, error)
	Update(ctx context.Context, order *RechargeOrder) error
	List(ctx context.Context, filter *RechargeOrderFilter) ([]*RechargeOrder, error)
	Count(ctx context.Context, filter *RechargeOrderFilter) (int64, error)
	GetByStatus(ctx context.Context, status string) ([]*RechargeOrder, error)
}

// MerchantReceiveAccountRepository defines operations for merchant-receive account relationships
type MerchantReceiveAccountRepository interface {
	Create(ctx context.Context, relationship *MerchantReceiveAccount) error
	GetByID(ctx context.Context, id uuid.UUID) (*MerchantReceiveAccount, error)
	GetByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) (*MerchantReceiveAccount, error)
	Update(ctx context.Context, relationship *MerchantReceiveAccount) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByMerchantAndAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	List(ctx context.Context, filter *MerchantReceiveAccountFilter) ([]*MerchantReceiveAccount, error)
	GetByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*MerchantReceiveAccount, error)
	UpdateWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error
}

// NotificationRepository defines operations for notification management
type NotificationRepository interface {
	// Notification configuration management
	CreateNotificationConfig(ctx context.Context, config *NotificationConfig) error
	GetNotificationConfig(ctx context.Context, id uuid.UUID) (*NotificationConfig, error)
	UpdateNotificationConfig(ctx context.Context, config *NotificationConfig) error
	DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error
	ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*NotificationConfig, error)
	
	// Notification log management
	CreateNotificationLog(ctx context.Context, log *NotificationLog) error
	GetNotificationLog(ctx context.Context, id uuid.UUID) (*NotificationLog, error)
	UpdateNotificationLog(ctx context.Context, log *NotificationLog) error
	ListNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*NotificationLog, int64, error)
}

// LimitAlertRepository defines operations for limit alert management
type LimitAlertRepository interface {
	Create(ctx context.Context, alert *LimitAlert) error
	GetByID(ctx context.Context, id uuid.UUID) (*LimitAlert, error)
	Update(ctx context.Context, alert *LimitAlert) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *LimitAlertFilter) ([]*LimitAlert, error)
	Count(ctx context.Context, filter *LimitAlertFilter) (int64, error)
	GetUnresolvedAlerts(ctx context.Context, entityID uuid.UUID, alertType string) ([]*LimitAlert, error)
	ResolveAlert(ctx context.Context, id uuid.UUID) error
}

// LimitViolationRepository defines operations for limit violation management
type LimitViolationRepository interface {
	Create(ctx context.Context, violation *LimitViolation) error
	GetByID(ctx context.Context, id uuid.UUID) (*LimitViolation, error)
	List(ctx context.Context, filter *LimitViolationFilter) ([]*LimitViolation, error)
	Count(ctx context.Context, filter *LimitViolationFilter) (int64, error)
	GetViolationsByEntity(ctx context.Context, entityType string, entityID uuid.UUID, startDate, endDate time.Time) ([]*LimitViolation, error)
}

// Common filter types
type UserFilter struct {
	Status   *string
	RoleID   *uuid.UUID
	Keyword  *string
	Limit    int
	Offset   int
	OrderBy  string
	OrderDir string
}

type RoleFilter struct {
	IsSystem *bool
	Keyword  *string
	Limit    int
	Offset   int
	OrderBy  string
	OrderDir string
}

type PermissionFilter struct {
	Resource *string
	Action   *string
	Limit    int
	Offset   int
	OrderBy  string
	OrderDir string
}

type MerchantFilter struct {
	Status   *string
	Keyword  *string
	Limit    int
	Offset   int
	OrderBy  string
	OrderDir string
}

type ReceiveAccountFilter struct {
	AccountType *string
	PaymentType *string
	Status      *string
	MerchantID  *uuid.UUID
	Keyword     *string
	Limit       int
	Offset      int
	OrderBy     string
	OrderDir    string
}

type RotationRuleFilter struct {
	MerchantID   *uuid.UUID
	StrategyType *string
	IsActive     *bool
	Limit        int
	Offset       int
	OrderBy      string
	OrderDir     string
	PaymentType *string
	Status      *string
	MerchantID  *uuid.UUID
	Search      *string
	Limit       int
	Offset      int
	OrderBy     string
	OrderDir    string
}

type RotationRuleFilter struct {
	MerchantID   *uuid.UUID
	StrategyType *string
	IsActive     *bool
	Limit        int
	Offset       int
	OrderBy      string
	OrderDir     string
}

type RechargeOrderFilter struct {
	Status      []string
	PaymentType string
	MerchantID  *uuid.UUID
	PayerName   *string
	StartDate   *time.Time
	EndDate     *time.Time
	Page        int
	Limit       int
	Offset      int
	OrderBy     string
	OrderDir    string
}

type MerchantReceiveAccountFilter struct {
	MerchantID       *uuid.UUID
	ReceiveAccountID *uuid.UUID
	IsActive         *bool
	Limit            int
	Offset           int
	OrderBy          string
	OrderDir         string
}

type LimitAlertFilter struct {
	AlertType  *string
	EntityID   *uuid.UUID
	AlertLevel *string
	IsResolved *bool
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
	OrderBy    string
	OrderDir   string
}

type LimitViolationFilter struct {
	StartDate     *time.Time
	EndDate       *time.Time
	EntityType    *string
	EntityID      *uuid.UUID
	ViolationType *string
	Limit         int
	Offset        int
	OrderBy       string
	OrderDir      string
}

type NotificationConfigFilter struct {
	EventType    *string `json:"event_type"`
	TargetSystem *string `json:"target_system"`
	IsActive     *bool   `json:"is_active"`
	Limit        int     `json:"limit"`
	Offset       int     `json:"offset"`
	OrderBy      string  `json:"order_by"`
	OrderDir     string  `json:"order_dir"`
}

type NotificationLogFilter struct {
	NotificationID  *uuid.UUID `json:"notification_id"`
	RechargeOrderID *uuid.UUID `json:"recharge_order_id"`
	EventType       *string    `json:"event_type"`
	Status          *string    `json:"status"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	MaxRetries      bool       `json:"max_retries"` // If true, only get logs that haven't exceeded max retries
	NextRetryAt     *time.Time `json:"next_retry_at"` // Only get logs where next_retry_at <= this time
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

// Webhook filter types
type WebhookFilter struct {
	IsActive  *bool   `json:"is_active"`
	EventType *string `json:"event_type"`
	Limit     int     `json:"limit"`
	Offset    int     `json:"offset"`
	OrderBy   string  `json:"order_by"`
	OrderDir  string  `json:"order_dir"`
}

type WebhookEventFilter struct {
	EventType *string    `json:"event_type"`
	Status    *string    `json:"status"`
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	Limit     int        `json:"limit"`
	Offset    int        `json:"offset"`
	OrderBy   string     `json:"order_by"`
	OrderDir  string     `json:"order_dir"`
}

type WebhookDeliveryFilter struct {
	WebhookID *uuid.UUID `json:"webhook_id"`
	EventID   *uuid.UUID `json:"event_id"`
	EventType *string    `json:"event_type"`
	Status    *string    `json:"status"`
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	Limit     int        `json:"limit"`
	Offset    int        `json:"offset"`
	OrderBy   string     `json:"order_by"`
	OrderDir  string     `json:"order_dir"`
}

// AgentSuggestionRepository defines operations for agent suggestion management
type AgentSuggestionRepository interface {
	Create(ctx context.Context, suggestion *AgentSuggestion) error
	GetByAgentName(ctx context.Context, agentName string) (*AgentSuggestion, error)
	Update(ctx context.Context, suggestion *AgentSuggestion) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *AgentSuggestionFilter) ([]*AgentSuggestion, error)
	Search(ctx context.Context, keyword string, limit int) ([]*AgentSuggestion, error)
	IncrementUsage(ctx context.Context, agentName string) error
	GetTopSuggestions(ctx context.Context, limit int) ([]*AgentSuggestion, error)
}

// ReportRepository defines operations for report and statistics management
type ReportRepository interface {
	// Transaction statistics
	GetTransactionStatistics(ctx context.Context, filter *TransactionStatisticsFilter) (*TransactionStatisticsData, error)
	GetMerchantStatistics(ctx context.Context, filter *MerchantStatisticsFilter) ([]*MerchantStatisticsData, int64, error)
	GetAccountStatistics(ctx context.Context, filter *AccountStatisticsFilter) ([]*AccountStatisticsData, int64, error)
	
	// Aggregation queries
	GetTransactionAggregation(ctx context.Context, filter *TransactionAggregationFilter) ([]*AggregationData, error)
	GetTimeSeriesData(ctx context.Context, filter *TimeSeriesFilter) ([]*TimeSeriesData, error)
	
	// Multi-dimensional queries
	QueryTransactions(ctx context.Context, filter *TransactionQueryFilter) ([]*TransactionDetailData, int64, error)
	GetFilterOptions(ctx context.Context, filter *FilterOptionsFilter) (*FilterOptionsData, error)
	GetTimeDimensionData(ctx context.Context, filter *TimeDimensionFilter) ([]*TimeDimensionData, error)
	GetStatusDimensionData(ctx context.Context, filter *StatusDimensionFilter) ([]*StatusDimensionData, error)
	GetMerchantDimensionData(ctx context.Context, filter *MerchantDimensionFilter) ([]*MerchantDimensionData, int64, error)
	GetAccountDimensionData(ctx context.Context, filter *AccountDimensionFilter) ([]*AccountDimensionData, int64, error)
	
	// Report management
	CreateReport(ctx context.Context, report *Report) error
	GetReport(ctx context.Context, id uuid.UUID) (*Report, error)
	UpdateReport(ctx context.Context, report *Report) error
	DeleteReport(ctx context.Context, id uuid.UUID) error
	ListReports(ctx context.Context, filter *ReportFilter) ([]*Report, int64, error)
	
	// Real-time data
	GetRealTimeStatistics(ctx context.Context) (*RealTimeStatisticsData, error)
	GetDashboardData(ctx context.Context, filter *DashboardFilter) (*DashboardData, error)
	GetRecentOrders(ctx context.Context, limit int) ([]*RecentOrderData, error)
	
	// System health
	GetSystemHealthStatus(ctx context.Context) (*SystemHealthData, error)

	// Funds credited aggregations
	GetFundsCreditedToday(ctx context.Context, filter *FundsCreditedFilter) (*FundsCreditedTodayData, error)
	GetFundsCreditedTrend(ctx context.Context, filter *FundsCreditedTrendFilter) ([]*FundsCreditedTrendData, error)
}

// Report filter types
type TransactionStatisticsFilter struct {
	StartDate   time.Time   `json:"start_date"`
	EndDate     time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Granularity string      `json:"granularity"`
}

type MerchantStatisticsFilter struct {
	StartDate   time.Time   `json:"start_date"`
	EndDate     time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Limit       int         `json:"limit"`
	Offset      int         `json:"offset"`
	OrderBy     string      `json:"order_by"`
	OrderDir    string      `json:"order_dir"`
}

type AccountStatisticsFilter struct {
	StartDate   time.Time   `json:"start_date"`
	EndDate     time.Time   `json:"end_date"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountType *string     `json:"account_type"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Limit       int         `json:"limit"`
	Offset      int         `json:"offset"`
	OrderBy     string      `json:"order_by"`
	OrderDir    string      `json:"order_dir"`
}

type TransactionAggregationFilter struct {
	StartDate   time.Time   `json:"start_date"`
	EndDate     time.Time   `json:"end_date"`
	GroupBy     []string    `json:"group_by"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Granularity string      `json:"granularity"`
	Limit       int         `json:"limit"`
	Offset      int         `json:"offset"`
	OrderBy     string      `json:"order_by"`
	OrderDir    string      `json:"order_dir"`
}

type TimeSeriesFilter struct {
	StartDate   time.Time   `json:"start_date"`
	EndDate     time.Time   `json:"end_date"`
	Metrics     []string    `json:"metrics"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Granularity string      `json:"granularity"`
}

type ReportFilter struct {
	ReportType *string    `json:"report_type"`
	Status     *string    `json:"status"`
	CreatedBy  *uuid.UUID `json:"created_by"`
	StartDate  *time.Time `json:"start_date"`
	EndDate    *time.Time `json:"end_date"`
	Limit      int        `json:"limit"`
	Offset     int        `json:"offset"`
	OrderBy    string     `json:"order_by"`
	OrderDir   string     `json:"order_dir"`
}

// Funds credited aggregation filter and data types
type FundsCreditedFilter struct {
    TenantID *uuid.UUID `json:"tenant_id"`
}

type FundsCreditedTodayData struct {
    Date      time.Time       `json:"date"`
    Cash      decimal.Decimal `json:"cash"`
    Grant     decimal.Decimal `json:"grant"`
}

type FundsCreditedTrendFilter struct {
    TenantID *uuid.UUID `json:"tenant_id"`
    Days     int        `json:"days"`
}

type FundsCreditedTrendData struct {
    Day    time.Time       `json:"day"`
    Cash   decimal.Decimal `json:"cash"`
    Grant  decimal.Decimal `json:"grant"`
}

type DashboardFilter struct {
	TimeRange   string      `json:"time_range"`
	StartDate   *time.Time  `json:"start_date"`
	EndDate     *time.Time  `json:"end_date"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	Widgets     []string    `json:"widgets"`
}

// Multi-dimensional query filter types
type TransactionQueryFilter struct {
	// Time dimension
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	
	// Status dimension
	Status      []string   `json:"status"`
	
	// Merchant dimension
	MerchantIDs   []uuid.UUID `json:"merchant_ids"`
	MerchantNames []string    `json:"merchant_names"`
	
	// Account dimension
	AccountIDs    []uuid.UUID `json:"account_ids"`
	AccountNames  []string    `json:"account_names"`
	AccountTypes  []string    `json:"account_types"`
	PaymentTypes  []string    `json:"payment_types"`
	
	// Amount dimension
	MinAmount   *decimal.Decimal `json:"min_amount"`
	MaxAmount   *decimal.Decimal `json:"max_amount"`
	
	// Additional filters
	PayerName     *string `json:"payer_name"`
	PayerAccount  *string `json:"payer_account"`
	OrderNumber   *string `json:"order_number"`
	
	// Pagination and sorting
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
	OrderBy  string `json:"order_by"`
	OrderDir string `json:"order_dir"`
	
	// Grouping and aggregation
	GroupBy     []string `json:"group_by"`
	Granularity string   `json:"granularity"`
}

type FilterOptionsFilter struct {
	IncludeMerchants bool       `json:"include_merchants"`
	IncludeAccounts  bool       `json:"include_accounts"`
	IncludeStatuses  bool       `json:"include_statuses"`
	IncludeTypes     bool       `json:"include_types"`
	StartDate        *time.Time `json:"start_date"`
	EndDate          *time.Time `json:"end_date"`
}

type TimeDimensionFilter struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	Granularity string       `json:"granularity"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	Status      []string     `json:"status"`
}

type StatusDimensionFilter struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	PaymentType *string      `json:"payment_type"`
}

type MerchantDimensionFilter struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	Status      []string     `json:"status"`
	PaymentType *string      `json:"payment_type"`
	Limit       int          `json:"limit"`
	Offset      int          `json:"offset"`
	OrderBy     string       `json:"order_by"`
	OrderDir    string       `json:"order_dir"`
}

type AccountDimensionFilter struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountType *string      `json:"account_type"`
	PaymentType *string      `json:"payment_type"`
	Status      []string     `json:"status"`
	Limit       int          `json:"limit"`
	Offset      int          `json:"offset"`
	OrderBy     string       `json:"order_by"`
	OrderDir    string       `json:"order_dir"`
}

type AgentSuggestionFilter struct {
	AgentName *string `json:"agent_name"`
	Keyword   *string `json:"keyword"`
	Limit     int     `json:"limit"`
	Offset    int     `json:"offset"`
	OrderBy   string  `json:"order_by"`
	OrderDir  string  `json:"order_dir"`
}

// Recharge Testing System Repository Interfaces

// RechargeSessionRepository defines operations for recharge session management
type RechargeSessionRepository interface {
	Create(ctx context.Context, session *RechargeSession) error
	GetByID(ctx context.Context, id uuid.UUID) (*RechargeSession, error)
	GetBySessionToken(ctx context.Context, sessionToken string) (*RechargeSession, error)
	Update(ctx context.Context, session *RechargeSession) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteExpired(ctx context.Context) error
	List(ctx context.Context, filter *RechargeSessionFilter) ([]*RechargeSession, error)
	Count(ctx context.Context, filter *RechargeSessionFilter) (int64, error)
}

// AccountMatchingLogRepository defines operations for account matching log management
type AccountMatchingLogRepository interface {
	Create(ctx context.Context, log *AccountMatchingLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*AccountMatchingLog, error)
	List(ctx context.Context, filter *AccountMatchingLogFilter) ([]*AccountMatchingLog, error)
	Count(ctx context.Context, filter *AccountMatchingLogFilter) (int64, error)
	GetStatistics(ctx context.Context, filter *AccountMatchingStatsFilter) (*AccountMatchingStats, error)
}

// DataExportLogRepository defines operations for data export log management
type DataExportLogRepository interface {
	Create(ctx context.Context, log *DataExportLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*DataExportLog, error)
	Update(ctx context.Context, log *DataExportLog) error
	List(ctx context.Context, filter *DataExportLogFilter) ([]*DataExportLog, error)
	Count(ctx context.Context, filter *DataExportLogFilter) (int64, error)
	DeleteOldLogs(ctx context.Context, olderThan time.Time) error
}

// OrderStatusLogRepository defines operations for order status log management
type OrderStatusLogRepository interface {
	Create(ctx context.Context, log *OrderStatusLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*OrderStatusLog, error)
	List(ctx context.Context, filter *OrderStatusLogFilter) ([]*OrderStatusLog, error)
	Count(ctx context.Context, filter *OrderStatusLogFilter) (int64, error)
	GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*OrderStatusLog, error)
	DeleteOldLogs(ctx context.Context, olderThan time.Time) error
}

// PaymentVoucherRepository defines operations for payment voucher management
type PaymentVoucherRepository interface {
	Create(ctx context.Context, voucher *PaymentVoucher) error
	GetByID(ctx context.Context, id uuid.UUID) (*PaymentVoucher, error)
	GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]*PaymentVoucher, error)
	Update(ctx context.Context, voucher *PaymentVoucher) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter *PaymentVoucherFilter) ([]*PaymentVoucher, error)
	Count(ctx context.Context, filter *PaymentVoucherFilter) (int64, error)
}

// Enhanced repository interfaces for recharge testing system

// Enhanced MerchantRepository with recharge testing functionality
type EnhancedMerchantRepository interface {
	MerchantRepository
	// Recharge testing specific methods
	GetByRechargeURL(ctx context.Context, rechargeURL string) (*Merchant, error)
	UpdateRechargeConfig(ctx context.Context, merchantID uuid.UUID, config map[string]interface{}) error
	EnableRecharge(ctx context.Context, merchantID uuid.UUID, enabled bool) error
	GenerateRechargeURL(ctx context.Context, merchantID uuid.UUID) (string, error)
	GetRechargeEnabledMerchants(ctx context.Context) ([]*Merchant, error)
}

// Enhanced RechargeOrderRepository with additional functionality
type EnhancedRechargeOrderRepository interface {
	RechargeOrderRepository
	// Enhanced methods for recharge testing system
	UpdateStatus(ctx context.Context, orderID uuid.UUID, status string, notes *string) error
	UpdatePaymentProof(ctx context.Context, orderID uuid.UUID, paymentProof string) error
	GetOrdersForExport(ctx context.Context, filter *DataExportRequest) ([]*RechargeOrder, error)
	GetDailySummary(ctx context.Context, date time.Time, merchantID *uuid.UUID) (*DailySummary, error)
	GetOrdersByDateRange(ctx context.Context, startDate, endDate time.Time, merchantID *uuid.UUID) ([]*RechargeOrder, error)
	MarkAsExpired(ctx context.Context, expiredBefore time.Time) error
}

// Filter types for new repositories

type RechargeSessionFilter struct {
	MerchantID      *uuid.UUID `json:"merchant_id"`
	CurrentStep     *string    `json:"current_step"`
	IsExpired       *bool      `json:"is_expired"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

type AccountMatchingLogFilter struct {
	MerchantID      *uuid.UUID `json:"merchant_id"`
	PaymentType     *string    `json:"payment_type"`
	Success         *bool      `json:"success"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

type DataExportLogFilter struct {
	ExportType      *string    `json:"export_type"`
	Status          *string    `json:"status"`
	CreatedBy       *uuid.UUID `json:"created_by"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

type AccountMatchingStatsFilter struct {
	MerchantID      *uuid.UUID `json:"merchant_id"`
	PaymentType     *string    `json:"payment_type"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Granularity     string     `json:"granularity"` // hour, day, week, month
}

type OrderStatusLogFilter struct {
	RechargeOrderID *uuid.UUID `json:"recharge_order_id"`
	FromStatus      *string    `json:"from_status"`
	ToStatus        *string    `json:"to_status"`
	CreatedBy       *uuid.UUID `json:"created_by"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

type PaymentVoucherFilter struct {
	RechargeOrderID *uuid.UUID `json:"recharge_order_id"`
	VoucherType     *string    `json:"voucher_type"`
	UploadedBy      *uuid.UUID `json:"uploaded_by"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

// Statistics and summary types

type AccountMatchingStats struct {
	TotalAttempts    int64           `json:"total_attempts"`
	SuccessfulMatches int64          `json:"successful_matches"`
	FailedMatches    int64           `json:"failed_matches"`
	SuccessRate      decimal.Decimal `json:"success_rate"`
	AverageMatchScore decimal.Decimal `json:"average_match_score"`
	AverageExecutionTime int64        `json:"average_execution_time_ms"`
}

type DailySummary struct {
	Date             time.Time       `json:"date"`
	MerchantID       *uuid.UUID      `json:"merchant_id,omitempty"`
	TotalOrders      int64           `json:"total_orders"`
	TotalAmount      decimal.Decimal `json:"total_amount"`
	CompletedOrders  int64           `json:"completed_orders"`
	CompletedAmount  decimal.Decimal `json:"completed_amount"`
	PendingOrders    int64           `json:"pending_orders"`
	PendingAmount    decimal.Decimal `json:"pending_amount"`
	CancelledOrders  int64           `json:"cancelled_orders"`
	CancelledAmount  decimal.Decimal `json:"cancelled_amount"`
	ExpiredOrders    int64           `json:"expired_orders"`
	ExpiredAmount    decimal.Decimal `json:"expired_amount"`
}

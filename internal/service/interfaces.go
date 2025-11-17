package service

import (
	"context"
	"errors"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Common service errors
var (
	ErrSessionNotFound = errors.New("session not found")
	ErrSessionExpired  = errors.New("session expired")
	ErrInvalidSession  = errors.New("invalid session")
	ErrViolationNotFound = errors.New("violation not found")
	ErrAlertNotFound   = errors.New("alert not found")
)

// AuthService defines the authentication service interface
type AuthService interface {
	// User authentication
	Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)
	Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error)
	Logout(ctx context.Context, userID uuid.UUID) error
	
	// Password management
	ChangePassword(ctx context.Context, userID uuid.UUID, req *ChangePasswordRequest) error
	ResetPassword(ctx context.Context, req *ResetPasswordRequest) error
	
	// Token management
	ValidateToken(ctx context.Context, token string) (*TokenClaims, error)
	GenerateTokens(ctx context.Context, user *repository.User) (*TokenResponse, error)
}

// SessionService defines the session management service interface
type SessionService interface {
	// Session lifecycle
	CreateSession(ctx context.Context, req *CreateSessionRequest) (*SessionInfo, error)
	GetSession(ctx context.Context, sessionID string) (*SessionInfo, error)
	UpdateSession(ctx context.Context, sessionID string, req *UpdateSessionRequest) (*SessionInfo, error)
	RenewSession(ctx context.Context, sessionID string) (*SessionInfo, error)
	TerminateSession(ctx context.Context, sessionID string) error
	
	// Multi-device management
	GetUserSessions(ctx context.Context, userID uuid.UUID) ([]*SessionInfo, error)
	TerminateUserSessions(ctx context.Context, userID uuid.UUID, excludeSessionID string) error
	TerminateAllUserSessions(ctx context.Context, userID uuid.UUID) error
	GetActiveSessionCount(ctx context.Context, userID uuid.UUID) (int, error)
	
	// Session validation and monitoring
	ValidateSession(ctx context.Context, sessionID string) (*SessionInfo, error)
	RefreshSessionActivity(ctx context.Context, sessionID string, ipAddress, userAgent string) error
	DetectAnomalousLogin(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string) (*LoginAnomalyResult, error)
	
	// Device management
	RegisterDevice(ctx context.Context, userID uuid.UUID, deviceInfo *DeviceInfo) error
	GetUserDevices(ctx context.Context, userID uuid.UUID) ([]*DeviceInfo, error)
	TrustDevice(ctx context.Context, userID uuid.UUID, deviceID string) error
	UntrustDevice(ctx context.Context, userID uuid.UUID, deviceID string) error
	
	// Session cleanup and maintenance
	CleanupExpiredSessions(ctx context.Context) error
	GetSessionStatistics(ctx context.Context) (*SessionStatistics, error)
}

// PermissionService defines the permission management service interface
type PermissionService interface {
	// Role management
	CreateRole(ctx context.Context, req *CreateRoleRequest) (*repository.Role, error)
	UpdateRole(ctx context.Context, roleID uuid.UUID, req *UpdateRoleRequest) (*repository.Role, error)
	DeleteRole(ctx context.Context, roleID uuid.UUID) error
	GetRole(ctx context.Context, roleID uuid.UUID) (*repository.Role, error)
	ListRoles(ctx context.Context, filter *repository.RoleFilter) ([]*repository.Role, error)
	
	// Permission management
	CreatePermission(ctx context.Context, req *CreatePermissionRequest) (*repository.Permission, error)
	UpdatePermission(ctx context.Context, permissionID uuid.UUID, req *UpdatePermissionRequest) (*repository.Permission, error)
	DeletePermission(ctx context.Context, permissionID uuid.UUID) error
	GetPermission(ctx context.Context, permissionID uuid.UUID) (*repository.Permission, error)
	ListPermissions(ctx context.Context, filter *repository.PermissionFilter) ([]*repository.Permission, error)
	
	// Role-Permission assignment
	AssignPermissionToRole(ctx context.Context, roleID, permissionID uuid.UUID) error
	RemovePermissionFromRole(ctx context.Context, roleID, permissionID uuid.UUID) error
	GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*repository.Permission, error)
	
	// User-Role assignment
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	RemoveRoleFromUser(ctx context.Context, userID, roleID uuid.UUID) error
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*repository.Role, error)
	
	// Permission checking
	CheckPermission(ctx context.Context, userID uuid.UUID, resource, action string) (bool, error)
	GetUserPermissions(ctx context.Context, userID uuid.UUID) ([]*repository.Permission, error)
}

// PermissionMonitorService defines the permission monitoring service interface
type PermissionMonitorService interface {
	// Violation management
	GetViolations(ctx context.Context, filter *ViolationFilter) ([]*PermissionViolation, error)
	GetViolationsByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*PermissionViolation, error)
	ResolveViolation(ctx context.Context, violationID uuid.UUID, resolvedBy uuid.UUID) error
	RecordViolation(ctx context.Context, violation *PermissionViolation) error
	
	// Alert management
	CreateAlert(ctx context.Context, alert *PermissionAlert) error
	UpdateAlert(ctx context.Context, alertID uuid.UUID, alert *PermissionAlert) error
	DeleteAlert(ctx context.Context, alertID uuid.UUID) error
	GetAlert(ctx context.Context, alertID uuid.UUID) (*PermissionAlert, error)
	ListAlerts(ctx context.Context) ([]*PermissionAlert, error)
	
	// Security monitoring
	GetSecurityMetrics(ctx context.Context, timeRange time.Duration) (*SecurityMetrics, error)
	GetUserRiskScore(ctx context.Context, userID uuid.UUID) (*UserRiskScore, error)
	GetSuspiciousActivities(ctx context.Context, limit int) ([]*SuspiciousActivity, error)
	
	// Monitoring control
	StartMonitoring(ctx context.Context) error
	StopMonitoring(ctx context.Context) error
	GetMonitoringStatus(ctx context.Context) (*MonitoringStatus, error)
}

// Request/Response types for AuthService
type LoginRequest struct {
	Username  string `json:"username" form:"username" binding:"required"`
	Password  string `json:"password" form:"password" binding:"required"`
	IPAddress string `json:"ip_address,omitempty" form:"ip_address,omitempty"`
	UserAgent string `json:"user_agent,omitempty" form:"user_agent,omitempty"`
}

type LoginResponse struct {
	User         *UserInfo      `json:"user"`
	TokenResponse *TokenResponse `json:"tokens"`
	SessionInfo  *SessionInfo   `json:"session_info,omitempty"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required"`
}

type RegisterResponse struct {
	User *UserInfo `json:"user"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email" binding:"required,email"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
	ResetToken  string `json:"reset_token" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int64     `json:"expires_in"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type TokenClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
	Roles    []string  `json:"roles"`
	Type     string    `json:"type"` // access or refresh
}

type UserInfo struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
	FullName string    `json:"full_name"`
	Status   string    `json:"status"`
	Roles    []string  `json:"roles"`
}

// Session-related types
type SessionInfo struct {
	SessionID    string                 `json:"session_id"`
	UserID       uuid.UUID              `json:"user_id"`
	Username     string                 `json:"username"`
	IPAddress    string                 `json:"ip_address"`
	UserAgent    string                 `json:"user_agent"`
	DeviceInfo   *DeviceInfo            `json:"device_info"`
	LoginTime    time.Time              `json:"login_time"`
	LastActivity time.Time              `json:"last_activity"`
	ExpiresAt    time.Time              `json:"expires_at"`
	IsActive     bool                   `json:"is_active"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type DeviceInfo struct {
	DeviceID       string `json:"device_id"`
	DeviceType     string `json:"device_type"`     // desktop, mobile, tablet
	OS             string `json:"os"`              // Windows, macOS, Linux, iOS, Android
	Browser        string `json:"browser"`         // Chrome, Firefox, Safari, etc.
	BrowserVersion string `json:"browser_version"`
	IsTrusted      bool   `json:"is_trusted"`
}

type CreateSessionRequest struct {
	UserID     uuid.UUID              `json:"user_id"`
	Username   string                 `json:"username"`
	IPAddress  string                 `json:"ip_address"`
	UserAgent  string                 `json:"user_agent"`
	DeviceInfo *DeviceInfo            `json:"device_info,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

type UpdateSessionRequest struct {
	LastActivity *time.Time             `json:"last_activity,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

type LoginAnomalyResult struct {
	IsAnomalous bool   `json:"is_anomalous"`
	Reasons     []string `json:"reasons"`
	RiskScore   int    `json:"risk_score"`
	RiskLevel   string `json:"risk_level"`
}

type SessionStatistics struct {
	TotalActiveSessions    int           `json:"total_active_sessions"`
	TotalUsers            int           `json:"total_users"`
	AverageSessionDuration time.Duration `json:"average_session_duration"`
}

// Request/Response types for PermissionService
type CreateRoleRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateRoleRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type CreatePermissionRequest struct {
	Resource    string `json:"resource" binding:"required"`
	Action      string `json:"action" binding:"required"`
	Description string `json:"description"`
}

type UpdatePermissionRequest struct {
	Resource    string `json:"resource"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

// Permission monitoring related types
type PermissionViolation struct {
	ID           uuid.UUID                  `json:"id"`
	UserID       uuid.UUID                  `json:"user_id"`
	Username     string                     `json:"username"`
	IPAddress    string                     `json:"ip_address"`
	UserAgent    string                     `json:"user_agent"`
	Resource     string                     `json:"resource"`
	Action       string                     `json:"action"`
	ViolationType string                    `json:"violation_type"`
	Description  string                     `json:"description"`
	Severity     string                     `json:"severity"`
	Metadata     map[string]interface{}     `json:"metadata"`
	IsResolved   bool                       `json:"is_resolved"`
	ResolvedBy   *uuid.UUID                 `json:"resolved_by"`
	ResolvedAt   *time.Time                 `json:"resolved_at"`
	CreatedAt    time.Time                  `json:"created_at"`
}

type ViolationFilter struct {
	UserID        *uuid.UUID `json:"user_id"`
	ViolationType *string    `json:"violation_type"`
	Severity      *string    `json:"severity"`
	IsResolved    *bool      `json:"is_resolved"`
	StartTime     *time.Time `json:"start_time"`
	EndTime       *time.Time `json:"end_time"`
	Limit         int        `json:"limit"`
}

type PermissionAlert struct {
	ID               uuid.UUID                  `json:"id"`
	Name             string                     `json:"name"`
	Description      string                     `json:"description"`
	AlertType        string                     `json:"alert_type"`
	Conditions       map[string]interface{}     `json:"conditions"`
	Threshold        int                        `json:"threshold"`
	TimeWindow       time.Duration              `json:"time_window"`
	Severity         string                     `json:"severity"`
	IsActive         bool                       `json:"is_active"`
	NotificationURLs []string                   `json:"notification_urls"`
	CreatedAt        time.Time                  `json:"created_at"`
	UpdatedAt        time.Time                  `json:"updated_at"`
}

type SecurityMetrics struct {
	TotalViolations     int                        `json:"total_violations"`
	ResolvedViolations  int                        `json:"resolved_violations"`
	PendingViolations   int                        `json:"pending_violations"`
	ViolationsByType    map[string]int             `json:"violations_by_type"`
	ViolationsBySeverity map[string]int            `json:"violations_by_severity"`
	TopViolatingUsers   []UserViolationSummary     `json:"top_violating_users"`
	TimeRange           time.Duration              `json:"time_range"`
	GeneratedAt         time.Time                  `json:"generated_at"`
}

type UserViolationSummary struct {
	UserID       uuid.UUID `json:"user_id"`
	Username     string    `json:"username"`
	ViolationCount int     `json:"violation_count"`
	LastViolation time.Time `json:"last_violation"`
}

type UserRiskScore struct {
	UserID              uuid.UUID `json:"user_id"`
	Username            string    `json:"username"`
	RiskScore           int       `json:"risk_score"`
	RiskLevel           string    `json:"risk_level"`
	ViolationCount      int       `json:"violation_count"`
	RecentViolations    int       `json:"recent_violations"`
	LastViolation       *time.Time `json:"last_violation"`
	CalculatedAt        time.Time  `json:"calculated_at"`
}

type SuspiciousActivity struct {
	ID          uuid.UUID                  `json:"id"`
	UserID      uuid.UUID                  `json:"user_id"`
	Username    string                     `json:"username"`
	ActivityType string                    `json:"activity_type"`
	Description string                     `json:"description"`
	IPAddress   string                     `json:"ip_address"`
	UserAgent   string                     `json:"user_agent"`
	Severity    string                     `json:"severity"`
	Metadata    map[string]interface{}     `json:"metadata"`
	DetectedAt  time.Time                  `json:"detected_at"`
}

type MonitoringStatus struct {
	IsActive           bool      `json:"is_active"`
	StartedAt          *time.Time `json:"started_at"`
	LastActivityAt     *time.Time `json:"last_activity_at"`
	ProcessedEvents    int64     `json:"processed_events"`
	DetectedViolations int64     `json:"detected_violations"`
	ActiveAlerts       int       `json:"active_alerts"`
}

// MerchantAccountService defines the merchant account binding service interface
type MerchantAccountService interface {
	// Account binding operations
	BindAccount(ctx context.Context, req *BindAccountRequest) error
	UnbindAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	ListMerchantAccounts(ctx context.Context, merchantID uuid.UUID) ([]*MerchantAccountInfo, error)
	
	// Priority management
	UpdateAccountPriority(ctx context.Context, merchantID, accountID uuid.UUID, priority int) error
	ReorderAccountPriorities(ctx context.Context, merchantID uuid.UUID, accountPriorities []AccountPriority) error
	
	// Account availability and validation
	GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, paymentType string, amount decimal.Decimal) ([]*AvailableAccountInfo, error)
	ValidateAccountBinding(ctx context.Context, merchantID, accountID uuid.UUID) (*ValidationResult, error)
	CheckAccountAvailability(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*AvailabilityResult, error)
	
	// Usage statistics and load balancing
	GetAccountUsageStatistics(ctx context.Context, merchantID uuid.UUID, timeRange TimeRange) ([]*AccountUsageStats, error)
	GetLoadBalancingRecommendations(ctx context.Context, merchantID uuid.UUID) ([]*LoadBalancingRecommendation, error)
	UpdateAccountUsageMetrics(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error
	
	// Batch operations
	BatchBindAccounts(ctx context.Context, req *BatchBindAccountsRequest) (*BatchOperationResult, error)
	BatchUpdatePriorities(ctx context.Context, merchantID uuid.UUID, updates []AccountPriorityUpdate) (*BatchOperationResult, error)
	
	// Account status management
	EnableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	DisableAccount(ctx context.Context, merchantID, accountID uuid.UUID) error
	GetAccountStatus(ctx context.Context, merchantID, accountID uuid.UUID) (*AccountStatusInfo, error)
}

// MerchantService defines the merchant management service interface
type MerchantService interface {
	// Merchant CRUD operations
	CreateMerchant(ctx context.Context, req *CreateMerchantRequest) (*repository.Merchant, error)
	GetMerchant(ctx context.Context, id uuid.UUID) (*repository.Merchant, error)
	GetMerchantByCode(ctx context.Context, code string) (*repository.Merchant, error)
	UpdateMerchant(ctx context.Context, id uuid.UUID, req *UpdateMerchantRequest) (*repository.Merchant, error)
	DeleteMerchant(ctx context.Context, id uuid.UUID) error
	ListMerchants(ctx context.Context, filter *repository.MerchantFilter) ([]*repository.Merchant, int64, error)
	
	// Merchant search and status management
	SearchMerchants(ctx context.Context, keyword string) ([]*repository.Merchant, error)
	UpdateMerchantStatus(ctx context.Context, id uuid.UUID, status string) error
	SetMerchantLimits(ctx context.Context, id uuid.UUID, req *SetMerchantLimitsRequest) error
	
	// Recharge testing system methods
	GenerateRechargeURL(ctx context.Context, merchantID uuid.UUID) (string, error)
	EnableRechargeService(ctx context.Context, merchantID uuid.UUID, enabled bool) error
	UpdateRechargePageConfig(ctx context.Context, merchantID uuid.UUID, config map[string]interface{}) error
	GetMerchantByRechargeURL(ctx context.Context, rechargeURL string) (*repository.Merchant, error)
	ValidateMerchantInfo(ctx context.Context, req *ValidateMerchantInfoRequest) (*ValidateMerchantInfoResponse, error)
}

// MerchantValidationService defines the merchant validation service interface
type MerchantValidationService interface {
	// Request validation
	ValidateCreateMerchantRequest(ctx context.Context, req *repository.CreateMerchantRequest) error
	ValidateUpdateMerchantRequest(ctx context.Context, merchantID uuid.UUID, req *repository.UpdateMerchantRequest) error
	ValidateMerchantModalDTO(ctx context.Context, dto *repository.MerchantModalDTO) error
	
	// Field validation
	ValidateCompanyNameFormat(companyName string) error
	ValidateCompanyNameUniqueness(ctx context.Context, companyName string) error
	ValidatePortNameFormat(portName string) error
	ValidatePortNameUniqueness(ctx context.Context, portName string) error
	ValidateAccountNameFormat(accountName string) error
	ValidateAccountNumberFormat(accountNumber, accountType string) error
	ValidateAccountNumberUniqueness(ctx context.Context, accountNumber string) error
	ValidateAccountTypeAndProvider(accountType string, customPaymentProvider *string) error
	ValidateLimitLogic(singleLimit, dailyLimit decimal.Decimal) error
	
	// Receive account validation
	ValidateReceiveAccountRequest(ctx context.Context, req *repository.CreateReceiveAccountRequest) error
	
	// Validation rules
	GetValidationRules() map[string]interface{}
}

// ReceiveAccountService defines the receive account management service interface
type ReceiveAccountService interface {
	// Receive Account CRUD operations
	CreateReceiveAccount(ctx context.Context, req *CreateReceiveAccountRequest) (*repository.ReceiveAccount, error)
	GetReceiveAccount(ctx context.Context, id uuid.UUID) (*repository.ReceiveAccount, error)
	UpdateReceiveAccount(ctx context.Context, id uuid.UUID, req *UpdateReceiveAccountRequest) (*repository.ReceiveAccount, error)
	DeleteReceiveAccount(ctx context.Context, id uuid.UUID) error
	RestoreReceiveAccount(ctx context.Context, id uuid.UUID) error
	ListReceiveAccounts(ctx context.Context, filter *repository.ReceiveAccountFilter) ([]*repository.ReceiveAccount, int64, error)
	
	// Account management
	GetAccountsByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.ReceiveAccount, error)
	UpdateAccountStatus(ctx context.Context, id uuid.UUID, status string) error
	SetAccountLimits(ctx context.Context, id uuid.UUID, req *SetAccountLimitsRequest) error
	GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*repository.ReceiveAccount, error)
	
	// Merchant-Account relationship
	AssignAccountToMerchant(ctx context.Context, req *AssignAccountToMerchantRequest) error
	RemoveAccountFromMerchant(ctx context.Context, merchantID, accountID uuid.UUID) error
	UpdateAccountWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error
}

// RotationService defines the intelligent rotation service interface
type RotationService interface {
	// Rotation rule management
	CreateRotationRule(ctx context.Context, req *CreateRotationRuleRequest) (*repository.RotationRule, error)
	GetRotationRule(ctx context.Context, id uuid.UUID) (*repository.RotationRule, error)
	UpdateRotationRule(ctx context.Context, id uuid.UUID, req *UpdateRotationRuleRequest) (*repository.RotationRule, error)
	DeleteRotationRule(ctx context.Context, id uuid.UUID) error
	ListRotationRules(ctx context.Context, filter *repository.RotationRuleFilter) ([]*repository.RotationRule, error)
	GetMerchantRotationRules(ctx context.Context, merchantID uuid.UUID) ([]*repository.RotationRule, error)
	
	// Account selection
	SelectAccount(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) (*repository.ReceiveAccount, error)
	
	// Strategy management
	ValidateStrategyConfig(strategyType string, config repository.StrategyConfig) error
}

// Request/Response types for MerchantService
type CreateMerchantRequest struct {
	Name          string          `json:"name" binding:"required"`
	Code          string          `json:"code" binding:"required"`
	ContactPerson *string         `json:"contact_person"`
	ContactPhone  *string         `json:"contact_phone"`
	ContactEmail  *string         `json:"contact_email"`
	DailyLimit    decimal.Decimal `json:"daily_limit"`
	SingleLimit   decimal.Decimal `json:"single_limit"`
	
	// New fields for merchant modal
	AgentName     *string                      `json:"agent_name"`
	PortName      *string                      `json:"port_name"`
	Remark        *string                      `json:"remark"`
	BusinessType  *string                      `json:"business_type"`
	ReceiveAccount *CreateReceiveAccountRequest `json:"receive_account"`
}

type UpdateMerchantRequest struct {
	Name          *string          `json:"name"`
	Code          *string          `json:"code"`
	ContactPerson *string          `json:"contact_person"`
	ContactPhone  *string          `json:"contact_phone"`
	ContactEmail  *string          `json:"contact_email"`
	Status        *string          `json:"status"`
	DailyLimit    *decimal.Decimal `json:"daily_limit"`
	SingleLimit   *decimal.Decimal `json:"single_limit"`
	
	// New fields for merchant modal
	AgentName     *string          `json:"agent_name"`
	PortName      *string          `json:"port_name"`
	Remark        *string          `json:"remark"`
	BusinessType  *string          `json:"business_type"`
}

// Request/Response types for recharge testing system
type ValidateMerchantInfoRequest struct {
	Name               string           `json:"name"`
	Code               string           `json:"code"`
	PortName           string           `json:"port_name"`
	ContactEmail       string           `json:"contact_email"`
	ContactPhone       string           `json:"contact_phone"`
	SingleLimit        decimal.Decimal  `json:"single_limit"`
	DailyLimit         decimal.Decimal  `json:"daily_limit"`
	ExcludeMerchantID  *uuid.UUID       `json:"exclude_merchant_id"`
}

type ValidateMerchantInfoResponse struct {
	IsValid bool              `json:"is_valid"`
	Errors  map[string]string `json:"errors"`
}

// MerchantResponse represents the response structure for merchant API
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

// ReceiveAccountResponse represents the response structure for receive account API
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

type SetMerchantLimitsRequest struct {
	DailyLimit  decimal.Decimal `json:"daily_limit" binding:"required"`
	SingleLimit decimal.Decimal `json:"single_limit" binding:"required"`
}

// Request/Response types for ReceiveAccountService
type CreateReceiveAccountRequest struct {
	AccountName           string          `json:"account_name" binding:"required"`
	AccountNumber         string          `json:"account_number" binding:"required"`
	AccountType           string          `json:"account_type" binding:"required"`
	CustomPaymentProvider *string         `json:"custom_payment_provider"`
	BankName              *string         `json:"bank_name"`
	BankBranch            *string         `json:"bank_branch"`
	AccountHolder         string          `json:"account_holder" binding:"required"`
	PaymentType           string          `json:"payment_type" binding:"required"`
	DailyLimit            decimal.Decimal `json:"daily_limit"`
	SingleLimit           decimal.Decimal `json:"single_limit"`
}

type UpdateReceiveAccountRequest struct {
	AccountName   *string          `json:"account_name"`
	AccountNumber *string          `json:"account_number"`
	AccountType   *string          `json:"account_type"`
	BankName      *string          `json:"bank_name"`
	BankBranch    *string          `json:"bank_branch"`
	AccountHolder *string          `json:"account_holder"`
	PaymentType   *string          `json:"payment_type"`
	Status        *string          `json:"status"`
	DailyLimit    *decimal.Decimal `json:"daily_limit"`
	SingleLimit   *decimal.Decimal `json:"single_limit"`
}

type SetAccountLimitsRequest struct {
	DailyLimit  decimal.Decimal `json:"daily_limit" binding:"required"`
	SingleLimit decimal.Decimal `json:"single_limit" binding:"required"`
}

type AssignAccountToMerchantRequest struct {
	MerchantID       uuid.UUID `json:"merchant_id" binding:"required"`
	ReceiveAccountID uuid.UUID `json:"receive_account_id" binding:"required"`
	Weight           int       `json:"weight"`
}

// ErrorResponse represents API error response
type ErrorResponse struct {
	Code             string            `json:"code"`
	Message          string            `json:"message"`
	ValidationErrors map[string]string `json:"validation_errors,omitempty"`
	Details          interface{}       `json:"details,omitempty"`
}

// AgentSuggestionResponse represents agent suggestion response
type AgentSuggestionResponse struct {
	AgentName   string    `json:"agent_name"`
	UsageCount  int       `json:"usage_count"`
	LastUsedAt  time.Time `json:"last_used_at"`
}

// PortValidationResponse represents port name validation response
type PortValidationResponse struct {
	IsValid   bool   `json:"is_valid"`
	Message   string `json:"message,omitempty"`
	Available bool   `json:"available"`
}

// NotificationService defines the notification service interface
type NotificationService interface {
	// Send notifications
	SendNotification(ctx context.Context, req *SendNotificationRequest) error
	SendRechargeNotification(ctx context.Context, orderID uuid.UUID, eventType string) error
	
	// Notification configuration management
	CreateNotificationConfig(ctx context.Context, req *CreateNotificationConfigRequest) (*repository.NotificationConfig, error)
	UpdateNotificationConfig(ctx context.Context, id uuid.UUID, req *UpdateNotificationConfigRequest) (*repository.NotificationConfig, error)
	DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error
	GetNotificationConfig(ctx context.Context, id uuid.UUID) (*repository.NotificationConfig, error)
	ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*repository.NotificationConfig, error)
	
	// Retry and failure handling
	RetryFailedNotifications(ctx context.Context) error
	RetryNotification(ctx context.Context, logID uuid.UUID) error
	GetFailedNotifications(ctx context.Context, filter *FailedNotificationFilter) ([]*repository.NotificationLog, error)
	
	// Notification status tracking and logs
	GetNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*repository.NotificationLog, int64, error)
	GetNotificationStatus(ctx context.Context, orderID uuid.UUID) ([]*NotificationStatus, error)
}

// LimitService defines the limit management service interface
type LimitService interface {
	// Account limit management
	CheckAccountLimits(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) (*LimitCheckResult, error)
	UpdateAccountDailyUsed(ctx context.Context, accountID uuid.UUID, amount decimal.Decimal) error
	ResetAccountDailyLimits(ctx context.Context) error
	GetAccountLimitStatus(ctx context.Context, accountID uuid.UUID) (*AccountLimitStatus, error)
	
	// Merchant limit management
	CheckMerchantLimits(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) (*LimitCheckResult, error)
	UpdateMerchantDailyUsed(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal) error
	ResetMerchantDailyLimits(ctx context.Context) error
	GetMerchantLimitStatus(ctx context.Context, merchantID uuid.UUID) (*MerchantLimitStatus, error)
	
	// Limit monitoring and alerts
	GetLimitAlerts(ctx context.Context, filter *LimitAlertFilter) ([]*LimitAlert, error)
	CreateLimitAlert(ctx context.Context, alert *LimitAlert) error
	
	// Limit configuration
	SetAccountLimits(ctx context.Context, accountID uuid.UUID, req *SetAccountLimitsRequest) error
	SetMerchantLimits(ctx context.Context, merchantID uuid.UUID, req *SetMerchantLimitsRequest) error
	
	// Merchant limit monitoring and management
	GetMerchantLimitStatuses(ctx context.Context, filter *MerchantLimitStatusFilter) ([]*MerchantLimitStatus, error)
	GetLimitUtilizationReport(ctx context.Context, filter *LimitUtilizationFilter) (*LimitUtilizationReport, error)
	UpdateMerchantLimitsWithValidation(ctx context.Context, merchantID uuid.UUID, req *UpdateMerchantLimitsRequest) error
	GetLimitViolations(ctx context.Context, filter *LimitViolationFilter) ([]*LimitViolation, error)
}

// Request/Response types for RotationService
type CreateRotationRuleRequest struct {
	MerchantID     uuid.UUID                  `json:"merchant_id" binding:"required"`
	RuleName       string                     `json:"rule_name" binding:"required"`
	StrategyType   string                     `json:"strategy_type" binding:"required"`
	StrategyConfig repository.StrategyConfig `json:"strategy_config" binding:"required"`
}

type UpdateRotationRuleRequest struct {
	RuleName       *string                     `json:"rule_name"`
	StrategyType   *string                     `json:"strategy_type"`
	StrategyConfig *repository.StrategyConfig `json:"strategy_config"`
	IsActive       *bool                       `json:"is_active"`
}

// NotificationService defines the notification service interface
type NotificationService interface {
	// Notification configuration management
	CreateNotificationConfig(ctx context.Context, req *CreateNotificationConfigRequest) (*repository.NotificationConfig, error)
	UpdateNotificationConfig(ctx context.Context, id uuid.UUID, req *UpdateNotificationConfigRequest) (*repository.NotificationConfig, error)
	DeleteNotificationConfig(ctx context.Context, id uuid.UUID) error
	GetNotificationConfig(ctx context.Context, id uuid.UUID) (*repository.NotificationConfig, error)
	ListNotificationConfigs(ctx context.Context, filter *NotificationConfigFilter) ([]*repository.NotificationConfig, error)
	
	// Event notification sending
	SendRechargeNotification(ctx context.Context, orderID uuid.UUID, eventType string) error
	SendCustomNotification(ctx context.Context, req *SendCustomNotificationRequest) error
	
	// Retry and failure handling
	RetryFailedNotifications(ctx context.Context) error
	RetryNotification(ctx context.Context, logID uuid.UUID) error
	GetFailedNotifications(ctx context.Context, filter *FailedNotificationFilter) ([]*repository.NotificationLog, error)
	
	// Notification status tracking and logs
	GetNotificationLogs(ctx context.Context, filter *NotificationLogFilter) ([]*repository.NotificationLog, int64, error)
	GetNotificationStatus(ctx context.Context, orderID uuid.UUID) ([]*NotificationStatus, error)
	
	// Webhook management
	RegisterWebhook(ctx context.Context, req *RegisterWebhookRequest) (*WebhookRegistration, error)
	UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error
	ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*WebhookRegistration, error)
	ValidateWebhookSignature(ctx context.Context, webhookID uuid.UUID, payload []byte, signature string) (bool, error)
	
	// Email notifications
	SendEmailNotification(ctx context.Context, notification *EmailNotification) error
	SendRechargeEmailNotification(ctx context.Context, orderID uuid.UUID, eventType string, recipients []string) error
	
	// Real-time notifications
	SendRealTimeNotification(ctx context.Context, notification *RealTimeNotification) error
	GetRealTimeNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]*RealTimeNotification, error)
	MarkRealTimeNotificationsAsRead(ctx context.Context, userID uuid.UUID, count int) error
	
	// Template management
	CreateNotificationTemplate(ctx context.Context, req *CreateNotificationTemplateRequest) (*NotificationTemplate, error)
	GetNotificationTemplate(ctx context.Context, templateID uuid.UUID) (*NotificationTemplate, error)
	UpdateNotificationTemplate(ctx context.Context, templateID uuid.UUID, req *UpdateNotificationTemplateRequest) (*NotificationTemplate, error)
	DeleteNotificationTemplate(ctx context.Context, templateID uuid.UUID) error
	ListNotificationTemplates(ctx context.Context, filter *NotificationTemplateFilter) ([]*NotificationTemplate, error)
	RenderNotificationTemplate(ctx context.Context, templateID uuid.UUID, data map[string]interface{}) (*RenderedNotification, error)
	
	// User preferences
	SetUserNotificationPreferences(ctx context.Context, userID uuid.UUID, preferences *NotificationPreferences) error
	GetUserNotificationPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreferences, error)
}

// Request/Response types for NotificationService
type CreateNotificationConfigRequest struct {
	Name           string                 `json:"name" binding:"required"`
	EventType      string                 `json:"event_type" binding:"required"`
	TargetSystem   string                 `json:"target_system" binding:"required"`
	WebhookURL     string                 `json:"webhook_url" binding:"required,url"`
	HTTPMethod     string                 `json:"http_method" binding:"required"`
	Headers        map[string]interface{} `json:"headers"`
	TemplateBody   string                 `json:"template_body" binding:"required"`
	RetryPolicy    map[string]interface{} `json:"retry_policy"`
	TimeoutSeconds int                    `json:"timeout_seconds"`
	IsActive       bool                   `json:"is_active"`
}

type UpdateNotificationConfigRequest struct {
	Name           *string                 `json:"name"`
	EventType      *string                 `json:"event_type"`
	TargetSystem   *string                 `json:"target_system"`
	WebhookURL     *string                 `json:"webhook_url"`
	HTTPMethod     *string                 `json:"http_method"`
	Headers        *map[string]interface{} `json:"headers"`
	TemplateBody   *string                 `json:"template_body"`
	RetryPolicy    *map[string]interface{} `json:"retry_policy"`
	TimeoutSeconds *int                    `json:"timeout_seconds"`
	IsActive       *bool                   `json:"is_active"`
}

type SendNotificationRequest struct {
	EventType    string                 `json:"event_type" binding:"required"`
	TargetURL    string                 `json:"target_url" binding:"required,url"`
	HTTPMethod   string                 `json:"http_method" binding:"required"`
	Headers      map[string]interface{} `json:"headers"`
	Payload      string                 `json:"payload" binding:"required"`
	OrderID      *uuid.UUID             `json:"order_id"`
	RetryPolicy  map[string]interface{} `json:"retry_policy"`
	TimeoutSeconds int                  `json:"timeout_seconds"`
}

type SendCustomNotificationRequest struct {
	ConfigID  uuid.UUID  `json:"config_id" binding:"required"`
	OrderID   *uuid.UUID `json:"order_id"`
	EventType string     `json:"event_type" binding:"required"`
	Payload   string     `json:"payload" binding:"required"`
}

type RegisterWebhookRequest struct {
	Name     string   `json:"name" binding:"required"`
	URL      string   `json:"url" binding:"required,url"`
	Events   []string `json:"events" binding:"required"`
	Secret   string   `json:"secret" binding:"required"`
	IsActive bool     `json:"is_active"`
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
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

type FailedNotificationFilter struct {
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	EventType *string    `json:"event_type"`
	Limit     int        `json:"limit"`
	Offset    int        `json:"offset"`
	OrderBy   string     `json:"order_by"`
	OrderDir  string     `json:"order_dir"`
}

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

// ReportService defines the report and statistics service interface
type ReportService interface {
	// Transaction statistics
	GetTransactionStatistics(ctx context.Context, req *TransactionStatisticsRequest) (*TransactionStatistics, error)
	GetMerchantStatistics(ctx context.Context, req *MerchantStatisticsRequest) (*MerchantStatistics, error)
	GetAccountStatistics(ctx context.Context, req *AccountStatisticsRequest) (*AccountStatistics, error)
	
	// Multi-dimensional aggregation
	GetTransactionAggregation(ctx context.Context, req *TransactionAggregationRequest) (*TransactionAggregationResult, error)
	GetTimeSeriesData(ctx context.Context, req *TimeSeriesRequest) (*TimeSeriesResult, error)
	
	// Multi-dimensional query and filtering
	QueryTransactions(ctx context.Context, req *TransactionQueryRequest) (*TransactionQueryResult, error)
	GetFilterOptions(ctx context.Context, req *FilterOptionsRequest) (*FilterOptions, error)
	GetTimeDimensionData(ctx context.Context, req *TimeDimensionRequest) (*TimeDimensionResult, error)
	GetStatusDimensionData(ctx context.Context, req *StatusDimensionRequest) (*StatusDimensionResult, error)
	GetMerchantDimensionData(ctx context.Context, req *MerchantDimensionRequest) (*MerchantDimensionResult, error)
	GetAccountDimensionData(ctx context.Context, req *AccountDimensionRequest) (*AccountDimensionResult, error)
	
	// Report generation
	GenerateTransactionReport(ctx context.Context, req *ReportGenerationRequest) (*ReportInfo, error)
	GetReportStatus(ctx context.Context, reportID uuid.UUID) (*ReportStatus, error)
	DownloadReport(ctx context.Context, reportID uuid.UUID) (*ReportDownload, error)
	ListReports(ctx context.Context, filter *ReportFilter) ([]*ReportInfo, int64, error)
	DeleteReport(ctx context.Context, reportID uuid.UUID) error
	
	// Real-time statistics
	GetRealTimeStatistics(ctx context.Context) (*RealTimeStatistics, error)
    GetDashboardData(ctx context.Context, req *DashboardRequest) (*DashboardData, error)
	
	// Cache management
    RefreshStatisticsCache(ctx context.Context, cacheKey string) error
    ClearStatisticsCache(ctx context.Context) error

    // Funds credited aggregations
    GetFundsCreditedToday(ctx context.Context, req *FundsCreditedRequest) (*FundsCreditedToday, error)
    GetFundsCreditedTrend(ctx context.Context, req *FundsCreditedTrendRequest) (*FundsCreditedTrendResult, error)
}

type NotificationStatus struct {
	ID              uuid.UUID  `json:"id"`
	ConfigName      string     `json:"config_name"`
	EventType       string     `json:"event_type"`
	TargetURL       string     `json:"target_url"`
	Status          string     `json:"status"`
	RetryCount      int        `json:"retry_count"`
	MaxRetries      int        `json:"max_retries"`
	ResponseStatus  *int       `json:"response_status"`
	ErrorMessage    *string    `json:"error_message"`
	ExecutionTimeMS *int       `json:"execution_time_ms"`
	NextRetryAt     *time.Time `json:"next_retry_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type WebhookRegistration struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	Secret    string    `json:"secret"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Request/Response types for LimitService
type LimitCheckResult struct {
	Allowed         bool            `json:"allowed"`
	Reason          string          `json:"reason,omitempty"`
	SingleLimit     decimal.Decimal `json:"single_limit"`
	DailyLimit      decimal.Decimal `json:"daily_limit"`
	DailyUsed       decimal.Decimal `json:"daily_used"`
	DailyRemaining  decimal.Decimal `json:"daily_remaining"`
}

type AccountLimitStatus struct {
	AccountID       uuid.UUID       `json:"account_id"`
	AccountName     string          `json:"account_name"`
	SingleLimit     decimal.Decimal `json:"single_limit"`
	DailyLimit      decimal.Decimal `json:"daily_limit"`
	DailyUsed       decimal.Decimal `json:"daily_used"`
	DailyRemaining  decimal.Decimal `json:"daily_remaining"`
	LastResetDate   time.Time       `json:"last_reset_date"`
	UtilizationRate decimal.Decimal `json:"utilization_rate"`
}

type MerchantLimitStatus struct {
	MerchantID      uuid.UUID       `json:"merchant_id"`
	MerchantName    string          `json:"merchant_name"`
	SingleLimit     decimal.Decimal `json:"single_limit"`
	DailyLimit      decimal.Decimal `json:"daily_limit"`
	DailyUsed       decimal.Decimal `json:"daily_used"`
	DailyRemaining  decimal.Decimal `json:"daily_remaining"`
	LastResetDate   time.Time       `json:"last_reset_date"`
	UtilizationRate decimal.Decimal `json:"utilization_rate"`
}

type LimitAlert struct {
	ID          uuid.UUID       `json:"id"`
	AlertType   string          `json:"alert_type"` // account_limit, merchant_limit
	EntityID    uuid.UUID       `json:"entity_id"`  // account_id or merchant_id
	EntityName  string          `json:"entity_name"`
	AlertLevel  string          `json:"alert_level"` // warning, critical
	Threshold   decimal.Decimal `json:"threshold"`
	CurrentUsed decimal.Decimal `json:"current_used"`
	Message     string          `json:"message"`
	CreatedAt   time.Time       `json:"created_at"`
	IsResolved  bool            `json:"is_resolved"`
}

type LimitAlertFilter struct {
	AlertType  *string    `json:"alert_type"`
	EntityID   *uuid.UUID `json:"entity_id"`
	AlertLevel *string    `json:"alert_level"`
	IsResolved *bool      `json:"is_resolved"`
	StartDate  *time.Time `json:"start_date"`
	EndDate    *time.Time `json:"end_date"`
	Limit      int        `json:"limit"`
	Offset     int        `json:"offset"`
	OrderBy    string     `json:"order_by"`
	OrderDir   string     `json:"order_dir"`
}

type MerchantLimitStatusFilter struct {
	MerchantIDs        []uuid.UUID `json:"merchant_ids"`
	Status             *string     `json:"status"`
	MinUtilizationRate *float64    `json:"min_utilization_rate"`
	MaxUtilizationRate *float64    `json:"max_utilization_rate"`
	Limit              int         `json:"limit"`
	Offset             int         `json:"offset"`
	OrderBy            string      `json:"order_by"`
	OrderDir           string      `json:"order_dir"`
}

type LimitUtilizationFilter struct {
	StartDate   time.Time    `json:"start_date"`
	EndDate     time.Time    `json:"end_date"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	Granularity string       `json:"granularity"` // daily, weekly, monthly
}

type LimitUtilizationReport struct {
	Period      string                        `json:"period"`
	StartDate   time.Time                     `json:"start_date"`
	EndDate     time.Time                     `json:"end_date"`
	Merchants   []*MerchantUtilizationData    `json:"merchants"`
	Accounts    []*AccountUtilizationData     `json:"accounts"`
	Summary     *UtilizationSummary           `json:"summary"`
}

type MerchantUtilizationData struct {
	MerchantID         uuid.UUID       `json:"merchant_id"`
	MerchantName       string          `json:"merchant_name"`
	DailyLimit         decimal.Decimal `json:"daily_limit"`
	AverageUtilization decimal.Decimal `json:"average_utilization"`
	PeakUtilization    decimal.Decimal `json:"peak_utilization"`
	ViolationCount     int             `json:"violation_count"`
}

type AccountUtilizationData struct {
	AccountID          uuid.UUID       `json:"account_id"`
	AccountName        string          `json:"account_name"`
	DailyLimit         decimal.Decimal `json:"daily_limit"`
	AverageUtilization decimal.Decimal `json:"average_utilization"`
	PeakUtilization    decimal.Decimal `json:"peak_utilization"`
	ViolationCount     int             `json:"violation_count"`
}

type UtilizationSummary struct {
	TotalMerchants     int             `json:"total_merchants"`
	TotalAccounts      int             `json:"total_accounts"`
	AverageUtilization decimal.Decimal `json:"average_utilization"`
	HighUtilization    int             `json:"high_utilization_count"`    // > 80%
	CriticalUtilization int            `json:"critical_utilization_count"` // > 95%
}

type UpdateMerchantLimitsRequest struct {
	DailyLimit  *decimal.Decimal `json:"daily_limit"`
	SingleLimit *decimal.Decimal `json:"single_limit"`
	Reason      string           `json:"reason" binding:"required"`
	ValidFrom   *time.Time       `json:"valid_from"`
}

type LimitViolationFilter struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	ViolationType *string    `json:"violation_type"` // single_limit, daily_limit
	Limit       int          `json:"limit"`
	Offset      int          `json:"offset"`
}

type LimitViolation struct {
	ID            uuid.UUID       `json:"id"`
	EntityType    string          `json:"entity_type"` // merchant, account
	EntityID      uuid.UUID       `json:"entity_id"`
	EntityName    string          `json:"entity_name"`
	ViolationType string          `json:"violation_type"`
	LimitValue    decimal.Decimal `json:"limit_value"`
	AttemptedValue decimal.Decimal `json:"attempted_value"`
	ViolatedAt    time.Time       `json:"violated_at"`
	OrderID       *uuid.UUID      `json:"order_id"`
}

// PaymentChannelService defines the payment channel management service interface
type PaymentChannelService interface {
	// Channel management
	RegisterChannel(ctx context.Context, req *RegisterChannelRequest) (*ChannelInfo, error)
	UnregisterChannel(ctx context.Context, channelID string) error
	GetChannel(ctx context.Context, channelID string) (*ChannelInfo, error)
	ListChannels(ctx context.Context, filter *ChannelFilter) ([]*ChannelInfo, error)
	UpdateChannelConfig(ctx context.Context, channelID string, config map[string]interface{}) error
	
	// Channel health monitoring
	CheckChannelHealth(ctx context.Context, channelID string) (*ChannelHealthStatus, error)
	GetChannelHealthStatus(ctx context.Context) (map[string]*ChannelHealthStatus, error)
	
	// Payment processing
	ProcessPayment(ctx context.Context, req *ProcessPaymentRequest) (*PaymentResult, error)
	QueryPaymentStatus(ctx context.Context, orderID uuid.UUID) (*PaymentStatusResult, error)
	CancelPayment(ctx context.Context, orderID uuid.UUID, reason string) (*CancelResult, error)
	ProcessRefund(ctx context.Context, req *ProcessRefundRequest) (*RefundResult, error)
	
	// Webhook handling
	ProcessWebhook(ctx context.Context, channelID string, payload []byte, headers map[string]string) (*WebhookProcessResult, error)
	
	// Batch operations
	BatchQueryPayments(ctx context.Context, orderIDs []uuid.UUID) ([]*PaymentStatusResult, error)
	BatchCancelPayments(ctx context.Context, requests []*BatchCancelRequest) ([]*CancelResult, error)
}

// Request/Response types for PaymentChannelService
type RegisterChannelRequest struct {
	ChannelID   string                 `json:"channel_id" binding:"required"`
	ChannelName string                 `json:"channel_name" binding:"required"`
	ChannelType string                 `json:"channel_type" binding:"required"`
	Config      map[string]interface{} `json:"config"`
	Limits      *ChannelLimits         `json:"limits"`
	IsActive    bool                   `json:"is_active"`
}

type ChannelInfo struct {
	ChannelID            string                 `json:"channel_id"`
	ChannelName          string                 `json:"channel_name"`
	ChannelType          string                 `json:"channel_type"`
	SupportedPaymentTypes []string              `json:"supported_payment_types"`
	SupportedCurrencies   []string              `json:"supported_currencies"`
	Limits               *ChannelLimits         `json:"limits"`
	Status               *ChannelStatus         `json:"status"`
	Config               map[string]interface{} `json:"config"`
	CreatedAt            time.Time              `json:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at"`
}

type ChannelFilter struct {
	ChannelType *string `json:"channel_type"`
	IsActive    *bool   `json:"is_active"`
	IsHealthy   *bool   `json:"is_healthy"`
	Limit       int     `json:"limit"`
	Offset      int     `json:"offset"`
	OrderBy     string  `json:"order_by"`
	OrderDir    string  `json:"order_dir"`
}

// Request/Response types for ReportService
type TransactionStatisticsRequest struct {
	StartDate   time.Time    `json:"start_date" binding:"required"`
	EndDate     time.Time    `json:"end_date" binding:"required"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	PaymentType *string      `json:"payment_type"`
	Status      []string     `json:"status"`
	Granularity string       `json:"granularity"` // hour, day, week, month
}

type TransactionStatistics struct {
	Period           string          `json:"period"`
	StartDate        time.Time       `json:"start_date"`
	EndDate          time.Time       `json:"end_date"`
	TotalCount       int64           `json:"total_count"`
	TotalAmount      decimal.Decimal `json:"total_amount"`
	SuccessCount     int64           `json:"success_count"`
	SuccessAmount    decimal.Decimal `json:"success_amount"`
	FailedCount      int64           `json:"failed_count"`
	FailedAmount     decimal.Decimal `json:"failed_amount"`
	PendingCount     int64           `json:"pending_count"`
	PendingAmount    decimal.Decimal `json:"pending_amount"`
	RefundCount      int64           `json:"refund_count"`
	RefundAmount     decimal.Decimal `json:"refund_amount"`
	SuccessRate      decimal.Decimal `json:"success_rate"`
	AverageAmount    decimal.Decimal `json:"average_amount"`
	GeneratedAt      time.Time       `json:"generated_at"`
}

type MerchantStatisticsRequest struct {
	StartDate   time.Time   `json:"start_date" binding:"required"`
	EndDate     time.Time   `json:"end_date" binding:"required"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Limit       int         `json:"limit"`
	Offset      int         `json:"offset"`
	OrderBy     string      `json:"order_by"`
	OrderDir    string      `json:"order_dir"`
}

type MerchantStatistics struct {
	Period    string                   `json:"period"`
	StartDate time.Time                `json:"start_date"`
	EndDate   time.Time                `json:"end_date"`
	Merchants []*MerchantStatisticsItem `json:"merchants"`
	Total     int64                    `json:"total"`
}

type MerchantStatisticsItem struct {
	MerchantID      uuid.UUID       `json:"merchant_id"`
	MerchantName    string          `json:"merchant_name"`
	MerchantCode    string          `json:"merchant_code"`
	TotalCount      int64           `json:"total_count"`
	TotalAmount     decimal.Decimal `json:"total_amount"`
	SuccessCount    int64           `json:"success_count"`
	SuccessAmount   decimal.Decimal `json:"success_amount"`
	FailedCount     int64           `json:"failed_count"`
	FailedAmount    decimal.Decimal `json:"failed_amount"`
	SuccessRate     decimal.Decimal `json:"success_rate"`
	AverageAmount   decimal.Decimal `json:"average_amount"`
	DailyLimit      decimal.Decimal `json:"daily_limit"`
	DailyUsed       decimal.Decimal `json:"daily_used"`
	LimitUtilization decimal.Decimal `json:"limit_utilization"`
}

type AccountStatisticsRequest struct {
	StartDate   time.Time   `json:"start_date" binding:"required"`
	EndDate     time.Time   `json:"end_date" binding:"required"`
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

type AccountStatistics struct {
	Period   string                   `json:"period"`
	StartDate time.Time               `json:"start_date"`
	EndDate   time.Time               `json:"end_date"`
	Accounts []*AccountStatisticsItem `json:"accounts"`
	Total    int64                    `json:"total"`
}

type AccountStatisticsItem struct {
	AccountID        uuid.UUID       `json:"account_id"`
	AccountName      string          `json:"account_name"`
	AccountNumber    string          `json:"account_number"`
	AccountType      string          `json:"account_type"`
	PaymentType      string          `json:"payment_type"`
	TotalCount       int64           `json:"total_count"`
	TotalAmount      decimal.Decimal `json:"total_amount"`
	SuccessCount     int64           `json:"success_count"`
	SuccessAmount    decimal.Decimal `json:"success_amount"`
	FailedCount      int64           `json:"failed_count"`
	FailedAmount     decimal.Decimal `json:"failed_amount"`
	SuccessRate      decimal.Decimal `json:"success_rate"`
	AverageAmount    decimal.Decimal `json:"average_amount"`
	DailyLimit       decimal.Decimal `json:"daily_limit"`
	DailyUsed        decimal.Decimal `json:"daily_used"`
	LimitUtilization decimal.Decimal `json:"limit_utilization"`
}

type TransactionAggregationRequest struct {
	StartDate   time.Time   `json:"start_date" binding:"required"`
	EndDate     time.Time   `json:"end_date" binding:"required"`
	GroupBy     []string    `json:"group_by" binding:"required"` // merchant, account, payment_type, status, date
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Granularity string      `json:"granularity"` // hour, day, week, month
	Limit       int         `json:"limit"`
	Offset      int         `json:"offset"`
	OrderBy     string      `json:"order_by"`
	OrderDir    string      `json:"order_dir"`
}

type TransactionAggregationResult struct {
	Period      string                      `json:"period"`
	StartDate   time.Time                   `json:"start_date"`
	EndDate     time.Time                   `json:"end_date"`
	GroupBy     []string                    `json:"group_by"`
	Granularity string                      `json:"granularity"`
	Data        []*AggregationDataPoint     `json:"data"`
	Total       int64                       `json:"total"`
	Summary     *TransactionStatistics      `json:"summary"`
}

type AggregationDataPoint struct {
	Dimensions   map[string]interface{} `json:"dimensions"`
	Count        int64                  `json:"count"`
	Amount       decimal.Decimal        `json:"amount"`
	SuccessCount int64                  `json:"success_count"`
	SuccessAmount decimal.Decimal       `json:"success_amount"`
	FailedCount  int64                  `json:"failed_count"`
	FailedAmount decimal.Decimal        `json:"failed_amount"`
	SuccessRate  decimal.Decimal        `json:"success_rate"`
}

type TimeSeriesRequest struct {
	StartDate   time.Time   `json:"start_date" binding:"required"`
	EndDate     time.Time   `json:"end_date" binding:"required"`
	Metrics     []string    `json:"metrics" binding:"required"` // count, amount, success_rate
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	PaymentType *string     `json:"payment_type"`
	Status      []string    `json:"status"`
	Granularity string      `json:"granularity" binding:"required"` // hour, day, week, month
}

type TimeSeriesResult struct {
	Period      string               `json:"period"`
	StartDate   time.Time            `json:"start_date"`
	EndDate     time.Time            `json:"end_date"`
	Granularity string               `json:"granularity"`
	Metrics     []string             `json:"metrics"`
	Series      []*TimeSeriesPoint   `json:"series"`
}

type TimeSeriesPoint struct {
	Timestamp    time.Time                  `json:"timestamp"`
	Values       map[string]decimal.Decimal `json:"values"`
}

type ReportGenerationRequest struct {
	ReportType   string                 `json:"report_type" binding:"required"` // transaction, merchant, account, summary
	Format       string                 `json:"format" binding:"required"`      // excel, csv, pdf
	StartDate    time.Time              `json:"start_date" binding:"required"`
	EndDate      time.Time              `json:"end_date" binding:"required"`
	MerchantIDs  []uuid.UUID            `json:"merchant_ids"`
	AccountIDs   []uuid.UUID            `json:"account_ids"`
	PaymentType  *string                `json:"payment_type"`
	AccountType  *string                `json:"account_type"`
	Status       []string               `json:"status"`
	Columns      []string               `json:"columns"`
	Filters      map[string]interface{} `json:"filters"`
	TemplateID   *uuid.UUID             `json:"template_id"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
}

type ReportInfo struct {
	ID          uuid.UUID  `json:"id"`
	ReportType  string     `json:"report_type"`
	Format      string     `json:"format"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Status      string     `json:"status"` // pending, processing, completed, failed
	Progress    int        `json:"progress"`
	FileSize    *int64     `json:"file_size"`
	FilePath    *string    `json:"file_path"`
	DownloadURL *string    `json:"download_url"`
	ExpiresAt   *time.Time `json:"expires_at"`
	ErrorMessage *string   `json:"error_message"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CreatedBy   *uuid.UUID `json:"created_by"`
}

type ReportStatus struct {
	ID           uuid.UUID  `json:"id"`
	Status       string     `json:"status"`
	Progress     int        `json:"progress"`
	ErrorMessage *string    `json:"error_message"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type ReportDownload struct {
	ID          uuid.UUID `json:"id"`
	FileName    string    `json:"file_name"`
	ContentType string    `json:"content_type"`
	FileSize    int64     `json:"file_size"`
	Data        []byte    `json:"-"`
	DownloadURL string    `json:"download_url"`
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

type RealTimeStatistics struct {
	TodayTransactions    *TransactionStatistics `json:"today_transactions"`
	YesterdayTransactions *TransactionStatistics `json:"yesterday_transactions"`
	ThisWeekTransactions *TransactionStatistics `json:"this_week_transactions"`
	ThisMonthTransactions *TransactionStatistics `json:"this_month_transactions"`
	ActiveMerchants      int64                  `json:"active_merchants"`
	ActiveAccounts       int64                  `json:"active_accounts"`
	PendingOrders        int64                  `json:"pending_orders"`
	FailedOrders         int64                  `json:"failed_orders"`
	SystemHealth         *SystemHealthStatus    `json:"system_health"`
	GeneratedAt          time.Time              `json:"generated_at"`
}

type SystemHealthStatus struct {
	DatabaseStatus    string    `json:"database_status"`
	CacheStatus       string    `json:"cache_status"`
	QueueStatus       string    `json:"queue_status"`
	ExternalAPIStatus string    `json:"external_api_status"`
	LastCheckedAt     time.Time `json:"last_checked_at"`
}

type DashboardRequest struct {
	TimeRange   string      `json:"time_range"` // today, yesterday, week, month, custom
	StartDate   *time.Time  `json:"start_date"`
	EndDate     *time.Time  `json:"end_date"`
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	Widgets     []string    `json:"widgets"` // statistics, charts, alerts, recent_orders
}

type DashboardData struct {
	TimeRange      string                 `json:"time_range"`
	StartDate      time.Time              `json:"start_date"`
	EndDate        time.Time              `json:"end_date"`
	Statistics     *TransactionStatistics `json:"statistics"`
	TrendData      *TimeSeriesResult      `json:"trend_data"`
	TopMerchants   []*MerchantStatisticsItem `json:"top_merchants"`
	TopAccounts    []*AccountStatisticsItem  `json:"top_accounts"`
	RecentOrders   []*RecentOrderItem     `json:"recent_orders"`
	Alerts         []*DashboardAlert      `json:"alerts"`
	SystemStatus   *SystemHealthStatus    `json:"system_status"`
	GeneratedAt    time.Time              `json:"generated_at"`
}

// Funds credited types
type FundsCreditedRequest struct {
    TenantID *uuid.UUID `json:"tenant_id"`
}

type FundsCreditedToday struct {
    Date     time.Time       `json:"date"`
    Cash     decimal.Decimal `json:"cash"`
    Grant    decimal.Decimal `json:"grant"`
    Total    decimal.Decimal `json:"total"`
    CashPct  decimal.Decimal `json:"cash_pct"`
    GrantPct decimal.Decimal `json:"grant_pct"`
}

type FundsCreditedTrendRequest struct {
    TenantID *uuid.UUID `json:"tenant_id"`
    Days     int        `json:"days"`
}

type FundsCreditedTrendPoint struct {
    Day   time.Time       `json:"day"`
    Cash  decimal.Decimal `json:"cash"`
    Grant decimal.Decimal `json:"grant"`
}

type FundsCreditedTrendResult struct {
    Days   int                         `json:"days"`
    Series []*FundsCreditedTrendPoint  `json:"series"`
}

type RecentOrderItem struct {
	ID           uuid.UUID       `json:"id"`
	OrderNumber  string          `json:"order_number"`
	PayerName    string          `json:"payer_name"`
	Amount       decimal.Decimal `json:"amount"`
	MerchantName string          `json:"merchant_name"`
	Status       string          `json:"status"`
	CreatedAt    time.Time       `json:"created_at"`
}

type DashboardAlert struct {
	ID          uuid.UUID `json:"id"`
	Type        string    `json:"type"`
	Level       string    `json:"level"`
	Title       string    `json:"title"`
	Message     string    `json:"message"`
	CreatedAt   time.Time `json:"created_at"`
	IsResolved  bool      `json:"is_resolved"`
}

// Multi-dimensional query request and response types
type TransactionQueryRequest struct {
	// Time dimension
	TimeRange   string     `json:"time_range"` // today, yesterday, this_week, last_week, this_month, last_month, custom
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	
	// Status dimension
	Status      []string   `json:"status"` // pending, completed, failed, cancelled, refunded
	
	// Merchant dimension
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	MerchantNames []string  `json:"merchant_names"`
	
	// Account dimension
	AccountIDs    []uuid.UUID `json:"account_ids"`
	AccountNames  []string    `json:"account_names"`
	AccountTypes  []string    `json:"account_types"` // alipay, wechat, bank, other
	PaymentTypes  []string    `json:"payment_types"` // public, private
	
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
	OrderBy  string `json:"order_by"`  // created_at, amount, status, merchant_name
	OrderDir string `json:"order_dir"` // ASC, DESC
	
	// Grouping and aggregation
	GroupBy     []string `json:"group_by"` // date, status, merchant, account, payment_type
	Granularity string   `json:"granularity"` // hour, day, week, month
	
	// Include options
	IncludeDetails bool `json:"include_details"`
	IncludeSummary bool `json:"include_summary"`
}

type TransactionQueryResult struct {
	// Query metadata
	Query       *TransactionQueryRequest `json:"query"`
	TotalCount  int64                    `json:"total_count"`
	FilteredCount int64                  `json:"filtered_count"`
	
	// Results
	Transactions []*TransactionDetail     `json:"transactions"`
	Aggregations []*AggregationDataPoint  `json:"aggregations,omitempty"`
	Summary      *TransactionStatistics   `json:"summary,omitempty"`
	
	// Execution metadata
	ExecutionTime time.Duration `json:"execution_time"`
	GeneratedAt   time.Time     `json:"generated_at"`
}

type TransactionDetail struct {
	ID              uuid.UUID       `json:"id"`
	OrderNumber     string          `json:"order_number"`
	PayerName       string          `json:"payer_name"`
	PayerAccount    string          `json:"payer_account"`
	PaymentType     string          `json:"payment_type"`
	Amount          decimal.Decimal `json:"amount"`
	MerchantID      uuid.UUID       `json:"merchant_id"`
	MerchantName    string          `json:"merchant_name"`
	MerchantCode    string          `json:"merchant_code"`
	AdAccount       string          `json:"ad_account"`
	AccountID       uuid.UUID       `json:"account_id"`
	AccountName     string          `json:"account_name"`
	AccountNumber   string          `json:"account_number"`
	AccountType     string          `json:"account_type"`
	Status          string          `json:"status"`
	Remark          *string         `json:"remark"`
	VoucherURL      *string         `json:"voucher_url"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	ProcessedAt     *time.Time      `json:"processed_at"`
}

type FilterOptionsRequest struct {
	// Specify which filter options to retrieve
	IncludeMerchants bool `json:"include_merchants"`
	IncludeAccounts  bool `json:"include_accounts"`
	IncludeStatuses  bool `json:"include_statuses"`
	IncludeTypes     bool `json:"include_types"`
	
	// Date range for filtering options (e.g., only show merchants with transactions in this period)
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
}

type FilterOptions struct {
	Merchants    []*FilterMerchant `json:"merchants,omitempty"`
	Accounts     []*FilterAccount  `json:"accounts,omitempty"`
	Statuses     []*FilterStatus   `json:"statuses,omitempty"`
	AccountTypes []*FilterType     `json:"account_types,omitempty"`
	PaymentTypes []*FilterType     `json:"payment_types,omitempty"`
	GeneratedAt  time.Time         `json:"generated_at"`
}

type FilterMerchant struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Code         string    `json:"code"`
	TransactionCount int64 `json:"transaction_count"`
	TotalAmount  decimal.Decimal `json:"total_amount"`
}

type FilterAccount struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Number       string    `json:"number"`
	Type         string    `json:"type"`
	PaymentType  string    `json:"payment_type"`
	TransactionCount int64 `json:"transaction_count"`
	TotalAmount  decimal.Decimal `json:"total_amount"`
}

type FilterStatus struct {
	Status       string `json:"status"`
	DisplayName  string `json:"display_name"`
	Count        int64  `json:"count"`
	Percentage   decimal.Decimal `json:"percentage"`
}

type FilterType struct {
	Type         string `json:"type"`
	DisplayName  string `json:"display_name"`
	Count        int64  `json:"count"`
	Percentage   decimal.Decimal `json:"percentage"`
}

// Time dimension specific requests
type TimeDimensionRequest struct {
	TimeRange   string     `json:"time_range"` // today, yesterday, this_week, last_week, this_month, last_month, custom
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	Granularity string     `json:"granularity"` // hour, day, week, month
	MerchantIDs []uuid.UUID `json:"merchant_ids"`
	AccountIDs  []uuid.UUID `json:"account_ids"`
	Status      []string    `json:"status"`
}

type TimeDimensionResult struct {
	TimeRange   string              `json:"time_range"`
	StartDate   time.Time           `json:"start_date"`
	EndDate     time.Time           `json:"end_date"`
	Granularity string              `json:"granularity"`
	DataPoints  []*TimeDimensionPoint `json:"data_points"`
	Summary     *TransactionStatistics `json:"summary"`
	GeneratedAt time.Time           `json:"generated_at"`
}

type TimeDimensionPoint struct {
	Timestamp     time.Time       `json:"timestamp"`
	PeriodLabel   string          `json:"period_label"` // "2025-01-01", "Week 1", "January 2025"
	Count         int64           `json:"count"`
	Amount        decimal.Decimal `json:"amount"`
	SuccessCount  int64           `json:"success_count"`
	SuccessAmount decimal.Decimal `json:"success_amount"`
	FailedCount   int64           `json:"failed_count"`
	FailedAmount  decimal.Decimal `json:"failed_amount"`
	SuccessRate   decimal.Decimal `json:"success_rate"`
}

// Status dimension specific requests
type StatusDimensionRequest struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	PaymentType *string      `json:"payment_type"`
}

type StatusDimensionResult struct {
	Period      string                 `json:"period"`
	StartDate   time.Time              `json:"start_date"`
	EndDate     time.Time              `json:"end_date"`
	StatusData  []*StatusDimensionPoint `json:"status_data"`
	Summary     *TransactionStatistics  `json:"summary"`
	GeneratedAt time.Time              `json:"generated_at"`
}

type StatusDimensionPoint struct {
	Status        string          `json:"status"`
	DisplayName   string          `json:"display_name"`
	Count         int64           `json:"count"`
	Amount        decimal.Decimal `json:"amount"`
	Percentage    decimal.Decimal `json:"percentage"`
	AmountPercent decimal.Decimal `json:"amount_percent"`
	TrendChange   *decimal.Decimal `json:"trend_change,omitempty"` // Compared to previous period
}

// Merchant dimension specific requests
type MerchantDimensionRequest struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	Status      []string     `json:"status"`
	PaymentType *string      `json:"payment_type"`
	Limit       int          `json:"limit"`
	Offset      int          `json:"offset"`
	OrderBy     string       `json:"order_by"`  // name, transaction_count, total_amount, success_rate
	OrderDir    string       `json:"order_dir"` // ASC, DESC
}

type MerchantDimensionResult struct {
	Period       string                    `json:"period"`
	StartDate    time.Time                 `json:"start_date"`
	EndDate      time.Time                 `json:"end_date"`
	MerchantData []*MerchantDimensionPoint `json:"merchant_data"`
	Total        int64                     `json:"total"`
	Summary      *TransactionStatistics    `json:"summary"`
	GeneratedAt  time.Time                 `json:"generated_at"`
}

type MerchantDimensionPoint struct {
	MerchantID       uuid.UUID       `json:"merchant_id"`
	MerchantName     string          `json:"merchant_name"`
	MerchantCode     string          `json:"merchant_code"`
	Count            int64           `json:"count"`
	Amount           decimal.Decimal `json:"amount"`
	SuccessCount     int64           `json:"success_count"`
	SuccessAmount    decimal.Decimal `json:"success_amount"`
	FailedCount      int64           `json:"failed_count"`
	FailedAmount     decimal.Decimal `json:"failed_amount"`
	SuccessRate      decimal.Decimal `json:"success_rate"`
	AverageAmount    decimal.Decimal `json:"average_amount"`
	DailyLimit       decimal.Decimal `json:"daily_limit"`
	DailyUsed        decimal.Decimal `json:"daily_used"`
	LimitUtilization decimal.Decimal `json:"limit_utilization"`
	Rank             int             `json:"rank"`
}

// Account dimension specific requests
type AccountDimensionRequest struct {
	StartDate   *time.Time   `json:"start_date"`
	EndDate     *time.Time   `json:"end_date"`
	AccountIDs  []uuid.UUID  `json:"account_ids"`
	MerchantIDs []uuid.UUID  `json:"merchant_ids"`
	AccountType *string      `json:"account_type"`
	PaymentType *string      `json:"payment_type"`
	Status      []string     `json:"status"`
	Limit       int          `json:"limit"`
	Offset      int          `json:"offset"`
	OrderBy     string       `json:"order_by"`  // name, transaction_count, total_amount, success_rate
	OrderDir    string       `json:"order_dir"` // ASC, DESC
}

type AccountDimensionResult struct {
	Period      string                   `json:"period"`
	StartDate   time.Time                `json:"start_date"`
	EndDate     time.Time                `json:"end_date"`
	AccountData []*AccountDimensionPoint `json:"account_data"`
	Total       int64                    `json:"total"`
	Summary     *TransactionStatistics   `json:"summary"`
	GeneratedAt time.Time                `json:"generated_at"`
}

type AccountDimensionPoint struct {
	AccountID        uuid.UUID       `json:"account_id"`
	AccountName      string          `json:"account_name"`
	AccountNumber    string          `json:"account_number"`
	AccountType      string          `json:"account_type"`
	PaymentType      string          `json:"payment_type"`
	Count            int64           `json:"count"`
	Amount           decimal.Decimal `json:"amount"`
	SuccessCount     int64           `json:"success_count"`
	SuccessAmount    decimal.Decimal `json:"success_amount"`
	FailedCount      int64           `json:"failed_count"`
	FailedAmount     decimal.Decimal `json:"failed_amount"`
	SuccessRate      decimal.Decimal `json:"success_rate"`
	AverageAmount    decimal.Decimal `json:"average_amount"`
	DailyLimit       decimal.Decimal `json:"daily_limit"`
	DailyUsed        decimal.Decimal `json:"daily_used"`
	LimitUtilization decimal.Decimal `json:"limit_utilization"`
	Rank             int             `json:"rank"`
}
// 
Notification service types

type SendNotificationRequest struct {
	EventType       string                 `json:"event_type"`
	RechargeOrderID *uuid.UUID             `json:"recharge_order_id,omitempty"`
	Data            map[string]interface{} `json:"data"`
	Priority        *string                `json:"priority,omitempty"`
	DelaySeconds    *int                   `json:"delay_seconds,omitempty"`
}

type CreateNotificationConfigRequest struct {
	Name           string                 `json:"name" binding:"required"`
	EventType      string                 `json:"event_type" binding:"required"`
	TargetSystem   string                 `json:"target_system" binding:"required"`
	WebhookURL     string                 `json:"webhook_url" binding:"required,url"`
	HTTPMethod     string                 `json:"http_method" binding:"required,oneof=GET POST PUT PATCH DELETE"`
	Headers        map[string]interface{} `json:"headers"`
	TemplateBody   string                 `json:"template_body" binding:"required"`
	RetryPolicy    map[string]interface{} `json:"retry_policy"`
	TimeoutSeconds int                    `json:"timeout_seconds" binding:"min=1,max=300"`
}

type UpdateNotificationConfigRequest struct {
	Name           *string                `json:"name"`
	EventType      *string                `json:"event_type"`
	TargetSystem   *string                `json:"target_system"`
	WebhookURL     *string                `json:"webhook_url"`
	HTTPMethod     *string                `json:"http_method"`
	Headers        map[string]interface{} `json:"headers"`
	TemplateBody   *string                `json:"template_body"`
	RetryPolicy    map[string]interface{} `json:"retry_policy"`
	TimeoutSeconds *int                   `json:"timeout_seconds"`
	IsActive       *bool                  `json:"is_active"`
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
	MaxRetries      bool       `json:"max_retries"`
	NextRetryAt     *time.Time `json:"next_retry_at"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
	OrderBy         string     `json:"order_by"`
	OrderDir        string     `json:"order_dir"`
}

type FailedNotificationFilter struct {
	EventType       *string    `json:"event_type"`
	RechargeOrderID *uuid.UUID `json:"recharge_order_id"`
	StartDate       *time.Time `json:"start_date"`
	EndDate         *time.Time `json:"end_date"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
}

type NotificationStatus struct {
	EventType      string     `json:"event_type"`
	Status         string     `json:"status"`
	AttemptCount   int        `json:"attempt_count"`
	LastAttemptAt  *time.Time `json:"last_attempt_at"`
	NextRetryAt    *time.Time `json:"next_retry_at"`
	ErrorMessage   *string    `json:"error_message"`
}

// Data export types for recharge testing system

type DataExportRequest struct {
	ExportType   string      `json:"export_type"`
	StartDate    time.Time   `json:"start_date"`
	EndDate      time.Time   `json:"end_date"`
	MerchantIDs  []uuid.UUID `json:"merchant_ids"`
	Status       []string    `json:"status"`
	Format       string      `json:"format"` // excel, csv, json
	IncludeDetails bool      `json:"include_details"`
	MaskSensitiveData bool   `json:"mask_sensitive_data"`
}
// Data
ExportService defines the data export service interface for recharge testing system
type DataExportService interface {
	// Export operations
	ExportOrders(ctx context.Context, req *DataExportRequest) (*DataExportJob, error)
	ExportTodayData(ctx context.Context, format string) (*DataExportJob, error)
	ExportYesterdayData(ctx context.Context, format string) (*DataExportJob, error)
	
	// Export job management
	GetExportStatus(ctx context.Context, exportID uuid.UUID) (*DataExportJob, error)
	ListExports(ctx context.Context, filter *DataExportFilter) ([]*DataExportJob, int64, error)
	DeleteExport(ctx context.Context, exportID uuid.UUID) error
	
	// File operations
	GetExportFile(ctx context.Context, exportID uuid.UUID) ([]byte, string, error)
	CleanupExpiredExports(ctx context.Context) error
}

// RechargeService interface extensions for recharge testing system
type RechargeService interface {
	// Order management
	CreateRechargeOrder(ctx context.Context, req *CreateRechargeOrderRequest) (*repository.RechargeOrder, error)
	GetRechargeOrder(ctx context.Context, id uuid.UUID) (*repository.RechargeOrder, error)
	UpdateOrderStatus(ctx context.Context, id uuid.UUID, status string, remark string) error
	ListOrders(ctx context.Context, req *ListOrdersRequest) ([]*repository.RechargeOrder, int64, error)
	
	// Order processing
	ProcessPrivateRecharge(ctx context.Context, orderID uuid.UUID, voucherURL string, metadata map[string]interface{}) error
	ProcessPublicRecharge(ctx context.Context, orderID uuid.UUID, bankTransferID string) error
	
	// Order statistics
	GetOrderStatistics(ctx context.Context, timeRange TimeRange) (*OrderStatistics, error)
	GetPendingReviewOrders(ctx context.Context, limit int) ([]*repository.RechargeOrder, error)
}

// Data export related types
type DataExportJob struct {
	ID            uuid.UUID  `json:"id"`
	ExportType    string     `json:"export_type"`
	Format        string     `json:"format"`
	Status        string     `json:"status"` // pending, processing, completed, failed
	Progress      int        `json:"progress"`
	TotalRecords  int        `json:"total_records"`
	ProcessedRecords int     `json:"processed_records"`
	FileSize      int64      `json:"file_size"`
	FilePath      string     `json:"file_path"`
	DownloadURL   string     `json:"download_url"`
	ErrorMessage  *string    `json:"error_message"`
	CreatedAt     time.Time  `json:"created_at"`
	StartedAt     *time.Time `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	ExpiresAt     time.Time  `json:"expires_at"`
}

type DataExportFilter struct {
	ExportType *string    `json:"export_type"`
	Status     *string    `json:"status"`
	StartDate  *time.Time `json:"start_date"`
	EndDate    *time.Time `json:"end_date"`
	Limit      int        `json:"limit"`
	Offset     int        `json:"offset"`
}

// Recharge order related types
type CreateRechargeOrderRequest struct {
	MerchantID      uuid.UUID       `json:"merchant_id" binding:"required"`
	PayerName       string          `json:"payer_name" binding:"required"`
	Amount          decimal.Decimal `json:"amount" binding:"required"`
	AdAccount       string          `json:"ad_account" binding:"required"`
	PaymentType     string          `json:"payment_type" binding:"required,oneof=private public"`
	PayerPhone      *string         `json:"payer_phone"`
	PayerEmail      *string         `json:"payer_email"`
	Remark          *string         `json:"remark"`
}

type ListOrdersRequest struct {
	Page        int        `json:"page"`
	Limit       int        `json:"limit"`
	Status      *string    `json:"status"`
	MerchantID  *uuid.UUID `json:"merchant_id"`
	PaymentType *string    `json:"payment_type"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	PayerName   *string    `json:"payer_name"`
	OrderNumber *string    `json:"order_number"`
}

type OrderStatistics struct {
	TotalOrders     int64           `json:"total_orders"`
	PendingOrders   int64           `json:"pending_orders"`
	ConfirmedOrders int64           `json:"confirmed_orders"`
	CancelledOrders int64           `json:"cancelled_orders"`
	TotalAmount     decimal.Decimal `json:"total_amount"`
	SuccessRate     float64         `json:"success_rate"`
	AvgProcessingTime time.Duration `json:"avg_processing_time"`
	TimeRange       TimeRange       `json:"time_range"`
}

type TimeRange struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}// Me
rchant account service related types
type BindAccountRequest struct {
	MerchantID uuid.UUID `json:"merchant_id" binding:"required"`
	AccountID  uuid.UUID `json:"account_id" binding:"required"`
	Priority   int       `json:"priority" binding:"min=1,max=100"`
}

type MerchantAccountInfo struct {
	ID              uuid.UUID                `json:"id"`
	MerchantID      uuid.UUID                `json:"merchant_id"`
	AccountID       uuid.UUID                `json:"account_id"`
	Priority        int                      `json:"priority"`
	Status          string                   `json:"status"`
	CreatedAt       time.Time                `json:"created_at"`
	UpdatedAt       time.Time                `json:"updated_at"`
	Account         *ReceiveAccountResponse  `json:"account,omitempty"`
	UsageStats      *AccountUsageStats       `json:"usage_stats,omitempty"`
}

type AccountPriority struct {
	AccountID uuid.UUID `json:"account_id" binding:"required"`
	Priority  int       `json:"priority" binding:"required,min=1,max=100"`
}

type AvailableAccountInfo struct {
	ID                uuid.UUID       `json:"id"`
	AccountName       string          `json:"account_name"`
	AccountNumber     string          `json:"account_number"`
	AccountType       string          `json:"account_type"`
	AccountHolder     string          `json:"account_holder"`
	PaymentType       string          `json:"payment_type"`
	BankName          *string         `json:"bank_name"`
	DailyLimit        decimal.Decimal `json:"daily_limit"`
	DailyUsed         decimal.Decimal `json:"daily_used"`
	RemainingLimit    decimal.Decimal `json:"remaining_limit"`
	Priority          int             `json:"priority"`
	MatchScore        float64         `json:"match_score"`
	RecommendationReason string       `json:"recommendation_reason"`
}

type ValidationResult struct {
	IsValid      bool              `json:"is_valid"`
	CanBind      bool              `json:"can_bind"`
	Warnings     []string          `json:"warnings"`
	Errors       []string          `json:"errors"`
	Suggestions  []string          `json:"suggestions"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type AvailabilityResult struct {
	IsAvailable      bool            `json:"is_available"`
	RemainingLimit   decimal.Decimal `json:"remaining_limit"`
	CanAcceptAmount  bool            `json:"can_accept_amount"`
	ReasonCode       string          `json:"reason_code"`
	ReasonMessage    string          `json:"reason_message"`
	NextAvailableAt  *time.Time      `json:"next_available_at"`
}

type AccountUsageStats struct {
	AccountID       uuid.UUID       `json:"account_id"`
	AccountName     string          `json:"account_name"`
	TotalTransactions int           `json:"total_transactions"`
	TotalAmount     decimal.Decimal `json:"total_amount"`
	DailyUsage      decimal.Decimal `json:"daily_usage"`
	DailyLimit      decimal.Decimal `json:"daily_limit"`
	UtilizationRate float64         `json:"utilization_rate"`
	AvgTransactionAmount decimal.Decimal `json:"avg_transaction_amount"`
	PeakUsageHour   int             `json:"peak_usage_hour"`
	LastUsedAt      *time.Time      `json:"last_used_at"`
	TimeRange       TimeRange       `json:"time_range"`
}

type LoadBalancingRecommendation struct {
	AccountID       uuid.UUID `json:"account_id"`
	AccountName     string    `json:"account_name"`
	CurrentPriority int       `json:"current_priority"`
	RecommendedPriority int   `json:"recommended_priority"`
	ReasonCode      string    `json:"reason_code"`
	ReasonMessage   string    `json:"reason_message"`
	ImpactScore     float64   `json:"impact_score"`
	UtilizationRate float64   `json:"utilization_rate"`
}

type BatchBindAccountsRequest struct {
	MerchantID uuid.UUID           `json:"merchant_id" binding:"required"`
	Accounts   []AccountBindInfo   `json:"accounts" binding:"required,min=1"`
}

type AccountBindInfo struct {
	AccountID uuid.UUID `json:"account_id" binding:"required"`
	Priority  int       `json:"priority" binding:"min=1,max=100"`
}

type BatchOperationResult struct {
	Total     int                    `json:"total"`
	Success   int                    `json:"success"`
	Failed    int                    `json:"failed"`
	Results   []BatchItemResult      `json:"results"`
	Errors    []string               `json:"errors"`
}

type BatchItemResult struct {
	ItemID    uuid.UUID `json:"item_id"`
	Success   bool      `json:"success"`
	Error     *string   `json:"error"`
	Message   string    `json:"message"`
}

type AccountPriorityUpdate struct {
	AccountID uuid.UUID `json:"account_id" binding:"required"`
	Priority  int       `json:"priority" binding:"required,min=1,max=100"`
}

type AccountStatusInfo struct {
	AccountID       uuid.UUID  `json:"account_id"`
	MerchantID      uuid.UUID  `json:"merchant_id"`
	Status          string     `json:"status"`
	IsActive        bool       `json:"is_active"`
	LastStatusChange time.Time `json:"last_status_change"`
	StatusReason    *string    `json:"status_reason"`
	Priority        int        `json:"priority"`
	UsageToday      decimal.Decimal `json:"usage_today"`
	LimitToday      decimal.Decimal `json:"limit_today"`
	NextResetAt     time.Time  `json:"next_reset_at"`
}// Resp
onse types for recharge testing system
type RechargeOrderResponse struct {
	ID              uuid.UUID       `json:"id"`
	OrderNumber     string          `json:"order_number"`
	MerchantID      uuid.UUID       `json:"merchant_id"`
	PayerName       string          `json:"payer_name"`
	Amount          decimal.Decimal `json:"amount"`
	AdAccount       string          `json:"ad_account"`
	PaymentType     string          `json:"payment_type"`
	Status          string          `json:"status"`
	PaymentProof    *string         `json:"payment_proof"`
	Remark          *string         `json:"remark"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	Merchant        *MerchantResponse `json:"merchant,omitempty"`
	ReceiveAccount  *ReceiveAccountResponse `json:"receive_account,omitempty"`
}
// Email 
notification types
type EmailNotification struct {
	To          []string            `json:"to"`
	CC          []string            `json:"cc"`
	BCC         []string            `json:"bcc"`
	Subject     string              `json:"subject"`
	Body        string              `json:"body"`
	IsHTML      bool                `json:"is_html"`
	Attachments []EmailAttachment   `json:"attachments"`
}

type EmailAttachment struct {
	Filename string `json:"filename"`
	Content  []byte `json:"content"`
	MimeType string `json:"mime_type"`
}

// Real-time notification types
type RealTimeNotification struct {
	UserID    uuid.UUID              `json:"user_id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// Template management types
type NotificationTemplate struct {
	ID           uuid.UUID  `json:"id"`
	Name         string     `json:"name"`
	EventType    string     `json:"event_type"`
	TemplateType string     `json:"template_type"` // email, webhook, realtime
	Subject      *string    `json:"subject"`
	TemplateBody string     `json:"template_body"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type CreateNotificationTemplateRequest struct {
	Name         string  `json:"name" binding:"required"`
	EventType    string  `json:"event_type" binding:"required"`
	TemplateType string  `json:"template_type" binding:"required"`
	Subject      *string `json:"subject"`
	TemplateBody string  `json:"template_body" binding:"required"`
	IsActive     bool    `json:"is_active"`
}

type UpdateNotificationTemplateRequest struct {
	Name         *string `json:"name"`
	Subject      *string `json:"subject"`
	TemplateBody *string `json:"template_body"`
	IsActive     *bool   `json:"is_active"`
}

type NotificationTemplateFilter struct {
	EventType    *string `json:"event_type"`
	TemplateType *string `json:"template_type"`
	IsActive     *bool   `json:"is_active"`
}

type RenderedNotification struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type NotificationPreferences struct {
	EmailEnabled    bool     `json:"email_enabled"`
	RealtimeEnabled bool     `json:"realtime_enabled"`
	WebhookEnabled  bool     `json:"webhook_enabled"`
	EventTypes      []string `json:"event_types"`
	EmailAddress    *string  `json:"email_address"`
}

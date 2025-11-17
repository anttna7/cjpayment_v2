package repository

import (
	"github.com/jmoiron/sqlx"
	"github.com/company/cjpayment/pkg/cache"
)

// Manager holds all repository instances
type Manager struct {
	db    *sqlx.DB
	cache cache.Cache

	// Repository instances
	User                   UserRepository
	Role                   RoleRepository
	Permission             PermissionRepository
	Merchant               MerchantRepository
	ReceiveAccount         ReceiveAccountRepository
	MerchantReceiveAccount MerchantReceiveAccountRepository
	RotationRule           RotationRuleRepository
	RechargeOrder          RechargeOrderRepository
	LimitAlert             LimitAlertRepository
	Notification           NotificationRepository
	Webhook                WebhookRepository
	Report                 ReportRepository
	AgentSuggestion        AgentSuggestionRepository
	
	// Recharge Testing System repositories
	RechargeSession        RechargeSessionRepository
	AccountMatchingLog     AccountMatchingLogRepository
	DataExportLog          DataExportLogRepository

	// Recharge Link System repositories
	RechargeLink           RechargeLinkRepository

	// Customer Payment System repositories
	Invoice                InvoiceRepository
	SettlementOrder        SettlementOrderRepository
	Department             DepartmentRepository
	CustomForm             CustomFormRepository
	FormField              FormFieldRepository
	FormSubmission         FormSubmissionRepository
}

// NewManager creates a new repository manager with all repositories initialized
func NewManager(db *sqlx.DB) *Manager {
	var webhookRepo WebhookRepository
	if db != nil {
		webhookRepo = NewWebhookRepository(db.DB)
	}

	return &Manager{
		db:                     db,
		User:                   NewUserRepository(db),
		Role:                   NewRoleRepository(db),
		Permission:             NewPermissionRepository(db),
		Merchant:               NewMerchantRepository(db),
		ReceiveAccount:         NewReceiveAccountRepository(db),
		MerchantReceiveAccount: NewMerchantReceiveAccountRepository(db),
		RotationRule:           NewRotationRuleRepository(db),
		RechargeOrder:          NewRechargeOrderRepository(db),
		LimitAlert:             NewLimitAlertRepository(db),
		Notification:           NewNotificationRepository(db),
		Webhook:                webhookRepo,
		Report:                 NewReportRepository(db),
		AgentSuggestion:        NewAgentSuggestionRepository(db),

		// Recharge Testing System repositories
		RechargeSession:        NewRechargeSessionRepository(db),
		AccountMatchingLog:     NewAccountMatchingLogRepository(db),
		DataExportLog:          NewDataExportLogRepository(db),

		// Recharge Link System repositories
		RechargeLink:           NewRechargeLinkRepository(db),

		// Customer Payment System repositories
		Invoice:                NewInvoiceRepository(db),
		SettlementOrder:        NewSettlementOrderRepository(db),
		Department:             NewDepartmentRepository(db),
		CustomForm:             NewCustomFormRepository(db),
		FormField:              NewFormFieldRepository(db),
		FormSubmission:         NewFormSubmissionRepository(db),
	}
}

// NewManagerWithCache creates a new repository manager with cache support
func NewManagerWithCache(db *sqlx.DB, cacheClient cache.Cache) *Manager {
	// For now, use non-cached versions to avoid implementation issues
	return &Manager{
		db:                     db,
		cache:                  cacheClient,
		User:                   NewUserRepository(db),
		Role:                   NewRoleRepository(db),
		Permission:             NewPermissionRepository(db),
		Merchant:               NewMerchantRepository(db),
		ReceiveAccount:         NewReceiveAccountRepository(db),
		MerchantReceiveAccount: NewMerchantReceiveAccountRepository(db),
		RotationRule:           NewRotationRuleRepository(db),
		RechargeOrder:          NewRechargeOrderRepository(db),
		LimitAlert:             NewLimitAlertRepository(db),
		Notification:           NewNotificationRepository(db),
		Webhook:                NewWebhookRepository(db.DB),
		Report:                 NewReportRepository(db),
		AgentSuggestion:        NewAgentSuggestionRepositoryWithCache(db, cacheClient),

		// Recharge Testing System repositories
		RechargeSession:        NewRechargeSessionRepository(db),
		AccountMatchingLog:     NewAccountMatchingLogRepository(db),
		DataExportLog:          NewDataExportLogRepository(db),

		// Recharge Link System repositories
		RechargeLink:           NewRechargeLinkRepository(db),

		// Customer Payment System repositories
		Invoice:                NewInvoiceRepository(db),
		SettlementOrder:        NewSettlementOrderRepository(db),
		Department:             NewDepartmentRepository(db),
		CustomForm:             NewCustomFormRepository(db),
		FormField:              NewFormFieldRepository(db),
		FormSubmission:         NewFormSubmissionRepository(db),
	}
}

// DB returns the underlying database connection
func (m *Manager) DB() *sqlx.DB {
	return m.db
}

// Cache returns the cache instance
func (m *Manager) Cache() cache.Cache {
	return m.cache
}
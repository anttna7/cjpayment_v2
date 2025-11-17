package service

import (
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/security"
	"github.com/redis/go-redis/v9"
)

// ServiceManager manages all application services
type ServiceManager struct {
	AuthService              AuthService
	PermissionService        PermissionService
	SessionService           SessionService
	PermissionMonitorService PermissionMonitorService
	MerchantService          MerchantService
	MerchantAccountService   MerchantAccountService
	ReceiveAccountService    ReceiveAccountService
	RotationService          RotationService
	LimitService             LimitService
	RechargeService          RechargeService
	BankService              BankService
	NotificationService      NotificationService
	WebhookService           WebhookService
	PaymentChannelService    PaymentChannelService
	ReportService            ReportService
	TestDataService          TestDataService
	DataCleanupService       DataCleanupService
	RechargeLinkService      RechargeLinkService
}

// ServiceConfig holds configuration for services
type ServiceConfig struct {
	JWTSecretKey        string
	AccessTokenTTL      time.Duration
	RefreshTokenTTL     time.Duration
}

// NewServiceManager creates a new service manager with all services
func NewServiceManager(
	repoManager *repository.Manager,
	redisClient *redis.Client,
	config *ServiceConfig,
) *ServiceManager {
	// Create JWT manager
	jwtManager := NewJWTManager(
		config.JWTSecretKey,
		config.AccessTokenTTL,
		config.RefreshTokenTTL,
	)

	// Create services
	authService := NewAuthService(
		repoManager.User,
		repoManager.Role,
		jwtManager,
		redisClient,
	)

	permissionService := NewPermissionService(
		repoManager.User,
		repoManager.Role,
		repoManager.Permission,
	)

	merchantService := NewMerchantService(
		repoManager.Merchant,
	)

	merchantAccountService := NewMerchantAccountService(
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		repoManager.MerchantReceiveAccount,
		repoManager.RechargeOrder,
	)

	receiveAccountService := NewReceiveAccountService(
		repoManager.ReceiveAccount,
		repoManager.Merchant,
		repoManager.MerchantReceiveAccount,
	)

	rotationService := NewRotationService(
		repoManager.RotationRule,
		repoManager.ReceiveAccount,
		repoManager.Merchant,
		repoManager.MerchantReceiveAccount,
	)

	limitService := NewLimitService(
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		repoManager.LimitAlert,
		repoManager.RechargeOrder,
	)

	rechargeService := NewRechargeService(
		repoManager.RechargeOrder,
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		rotationService,
		limitService,
	)

	// Create bank service with default config
	bankConfig := &BankConfig{
		APIBaseURL:    "https://api.bank.example.com",
		APIKey:        "demo-api-key",
		APISecret:     "demo-api-secret",
		NotifyURL:     "https://your-domain.com/api/v1/bank/callback",
		ReturnURL:     "https://your-domain.com/bank-transfer-result",
		SignatureKey:  "demo-signature-key",
		Timeout:       30 * time.Second,
		RetryAttempts: 3,
	}
	
	bankService := NewBankService(
		repoManager.RechargeOrder,
		bankConfig,
	)

	notificationService := NewNotificationService(
		repoManager.Notification,
		repoManager.Webhook,
		repoManager.RechargeOrder,
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		redisClient,
	)

	webhookService := NewWebhookService(
		repoManager.Webhook,
		redisClient,
	)

	// Create payment channel components
	channelManager := NewPaymentChannelManager()
	paymentProcessor := NewPaymentProcessor(channelManager, repoManager.RechargeOrder)
	paymentChannelService := NewPaymentChannelService(channelManager, paymentProcessor)

	// Create report service
	reportService := NewReportService(
		repoManager.Report,
		repoManager.RechargeOrder,
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		redisClient,
	)

	// Create test data service
	testDataService := NewTestDataService(
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		repoManager.RechargeOrder,
		repoManager.User,
		repoManager.Role,
		repoManager.Permission,
		repoManager.MerchantReceiveAccount,
	)

	// Create data cleanup service
	dataCleanupService := NewDataCleanupService(
		repoManager.Merchant,
		repoManager.ReceiveAccount,
		repoManager.RechargeOrder,
		repoManager.User,
		repoManager.Role,
		repoManager.Permission,
		repoManager.MerchantReceiveAccount,
	)

	// Create security components
	auditLogger := security.NewDatabaseAuditLogger()
	securityMonitor := security.NewSecurityMonitor(auditLogger)

	// Create enhanced authentication services
	sessionService := NewSessionService(auditLogger, securityMonitor)
	permissionMonitorService := NewPermissionMonitorService(auditLogger, securityMonitor)

	return &ServiceManager{
		AuthService:              authService,
		PermissionService:        permissionService,
		SessionService:           sessionService,
		PermissionMonitorService: permissionMonitorService,
		MerchantService:          merchantService,
		MerchantAccountService:   merchantAccountService,
		ReceiveAccountService:    receiveAccountService,
		RotationService:          rotationService,
		LimitService:             limitService,
		RechargeService:          rechargeService,
		BankService:              bankService,
		NotificationService:      notificationService,
		WebhookService:           webhookService,
		PaymentChannelService:    paymentChannelService,
		ReportService:            reportService,
		TestDataService:          testDataService,
		DataCleanupService:       dataCleanupService,
		RechargeLinkService:      NewRechargeLinkService(repoManager.RechargeLink, repoManager.Merchant),
	}
}

// DefaultServiceConfig returns default configuration for services
func DefaultServiceConfig() *ServiceConfig {
	return &ServiceConfig{
		JWTSecretKey:    "your-secret-key-change-in-production",
		AccessTokenTTL:  time.Hour,        // 1 hour
		RefreshTokenTTL: time.Hour * 24 * 7, // 7 days
	}
}
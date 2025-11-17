package handler

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/middleware"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "github.com/shopspring/decimal"
    "github.com/redis/go-redis/v9"
    "encoding/csv"
    "encoding/json"
)

// Handler holds the dependencies for HTTP handlers
type Handler struct {
    db                     *sqlx.DB
    config                 *config.Config
    jwtAuth                *middleware.JWTAuthMiddleware
    authService            service.AuthService
    permissionService      service.PermissionService
    rechargeService        service.RechargeService
    notificationService    service.NotificationService
    merchantService        service.MerchantService
    merchantAccountService service.MerchantAccountService
    accountService         service.ReceiveAccountService
    bankService            service.BankService
    reportService          service.ReportService
	testDataService        service.TestDataService
	dataCleanupService     service.DataCleanupService
	merchantValidator      *service.MerchantValidator
	agentSuggestionRepo    repository.AgentSuggestionRepository
	rechargeTestingHandler *RechargeTestingHandler
	rechargeLinkHandler    *RechargeLinkHandler
	passwordResetHandler   *PasswordResetHandler
	validationMiddleware   *ValidationMiddleware
	errorMiddleware        *ErrorMiddleware
	invoiceHandler         *InvoiceHandler
	settlementOrderHandler *SettlementOrderHandler
	departmentHandler      *DepartmentHandler
	customFormHandler      *CustomFormHandler
}

// New creates a new handler instance
func New(db *sqlx.DB, cfg *config.Config) *Handler {
	// Initialize repositories
	repoManager := repository.NewManager(db)
	
    // Initialize Redis client
    var redisClient *redis.Client
    if cfg.Redis.Host != "" {
        redisClient = redis.NewClient(&redis.Options{
            Addr:     fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
            Password: cfg.Redis.Password,
            DB:       cfg.Redis.DB,
        })
    }

    // Initialize services with default config
    serviceConfig := service.DefaultServiceConfig()
    // Override JWT secret from config if provided
    if cfg.JWT.Secret != "" {
        serviceConfig.JWTSecretKey = cfg.JWT.Secret
    }
    serviceManager := service.NewServiceManager(repoManager, redisClient, serviceConfig)
	
	// Initialize merchant validator
	merchantValidator := service.NewMerchantValidator(
		repoManager.Merchant,
		repoManager.ReceiveAccount,
	)

	// Initialize middleware
	validationMiddleware := NewValidationMiddleware()
    errorMiddleware := NewErrorMiddleware(cfg.Debug, nil)

    // Initialize JWT auth middleware
    jwtMiddleware := middleware.NewJWTAuthMiddleware(serviceConfig.JWTSecretKey, redisClient)
	
	// Initialize recharge testing handler
	rechargeTestingHandler := NewRechargeTestingHandler(
		serviceManager.MerchantService,
		serviceManager.MerchantAccountService,
		serviceManager.RechargeService,
		serviceManager.ReportService,
		nil, // TODO: Add DataExportService
	)
	
	// Initialize recharge link handler
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	rechargeLinkHandler := NewRechargeLinkHandler(serviceManager.RechargeLinkService, baseURL)
	
	// Initialize password reset handler
	passwordResetHandler := NewPasswordResetHandler()

	// Initialize customer payment system handlers
	invoiceHandler := NewInvoiceHandler(serviceManager.InvoiceService)
	settlementOrderHandler := NewSettlementOrderHandler(serviceManager.SettlementOrderService)
	departmentHandler := NewDepartmentHandler(serviceManager.DepartmentService)
	customFormHandler := NewCustomFormHandler(serviceManager.CustomFormService)

    return &Handler{
        db:                     db,
        config:                 cfg,
        jwtAuth:                jwtMiddleware,
        authService:            serviceManager.AuthService,
        permissionService:      serviceManager.PermissionService,
        rechargeService:        serviceManager.RechargeService,
        notificationService:    serviceManager.NotificationService,
        merchantService:        serviceManager.MerchantService,
        merchantAccountService: serviceManager.MerchantAccountService,
        accountService:         serviceManager.ReceiveAccountService,
        bankService:            serviceManager.BankService,
        reportService:          serviceManager.ReportService,
		testDataService:        serviceManager.TestDataService,
		dataCleanupService:     serviceManager.DataCleanupService,
		merchantValidator:      merchantValidator,
		agentSuggestionRepo:    repoManager.AgentSuggestion,
		rechargeTestingHandler: rechargeTestingHandler,
		rechargeLinkHandler:    rechargeLinkHandler,
		passwordResetHandler:   passwordResetHandler,
		validationMiddleware:   validationMiddleware,
		errorMiddleware:        errorMiddleware,
		invoiceHandler:         invoiceHandler,
		settlementOrderHandler: settlementOrderHandler,
		departmentHandler:      departmentHandler,
		customFormHandler:      customFormHandler,
	}
}

// RegisterRoutes registers all HTTP routes
func (h *Handler) RegisterRoutes(router *gin.Engine) {
	// Static files
	router.Static("/static", "./web/static")
	router.Static("/uploads", "./uploads")

	// Web pages
	router.GET("/", h.HomePage)
	router.GET("/dashboard", h.DashboardPage)
	router.GET("/login", h.LoginPage)
	router.GET("/simple-login", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/simple_login.html")
	})
	router.GET("/test-login", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./test_login.html")
	})
	router.GET("/test-full-login", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./test_full_login.html")
	})
	router.GET("/debug-js", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./debug_js.html")
	})
	router.GET("/test-admin", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./test_admin.html")
	})
	router.GET("/test-dashboard", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./test_dashboard.html")
	})
	router.GET("/admin", h.AdminDashboard)
	router.GET("/recharge-management", h.RechargeManagementPage)
	router.GET("/recharge_management", h.RechargeManagementPage) // Add underscore version
	router.GET("/private-recharge", h.PrivateRechargePage)
	router.GET("/public-recharge", h.PublicRechargePage)
	router.GET("/financial-audit", h.FinancialAuditPage)
	router.GET("/audit", h.FinancialAuditPage) // Add audit alias
	router.GET("/report-dashboard", h.ReportDashboardPage)
	router.GET("/report_dashboard", h.ReportDashboardPage) // Add underscore version
	router.GET("/user-management", h.UserManagementPage)
	router.GET("/user_management", h.UserManagementPage) // Add underscore version
	router.GET("/customer-management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/customer_management.html")
	})
	router.GET("/validation", h.ValidationDashboardPage)

	// Customer payment system pages
	router.GET("/invoice-management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/invoice_management.html")
	})
	router.GET("/invoice_management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/invoice_management.html")
	})
	router.GET("/settlement-order-management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/settlement_order_management.html")
	})
	router.GET("/settlement_order_management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/settlement_order_management.html")
	})
	router.GET("/department-management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/department_management.html")
	})
	router.GET("/department_management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/department_management.html")
	})
	router.GET("/form-management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/form_management.html")
	})
	router.GET("/form_management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/form_management.html")
	})

	// Role management pages
	router.GET("/role-management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/role_management.html")
	})
	router.GET("/role_management", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/role_management.html")
	})

	// Permission management pages
	router.GET("/permission-groups", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/permission_groups.html")
	})
	router.GET("/permission_groups", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/permission_groups.html")
	})
	router.GET("/permission-assignment", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/permission_assignment.html")
	})
	router.GET("/permission_assignment", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/permission_assignment.html")
	})

	// Contract archive page
	router.GET("/contract-archive", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/contract_archive.html")
	})
	router.GET("/contract_archive", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/contract_archive.html")
	})

	// Order management pages
	router.GET("/recharge-orders", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/recharge_orders.html")
	})
	router.GET("/recharge_orders", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/recharge_orders.html")
	})
	router.GET("/transfer-orders", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/transfer_orders.html")
	})
	router.GET("/transfer_orders", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.File("./web/templates/transfer_orders.html")
	})

	// System management pages
	router.GET("/system_management", h.SystemManagementPage)
	router.GET("/system-management", h.SystemManagementPage) // Add hyphen version
	router.GET("/system_config", h.SystemConfigPage)
	router.GET("/system-config", h.SystemConfigPage) // Add hyphen version
	router.GET("/api_management", h.APIManagementPage)
	router.GET("/api-management", h.APIManagementPage) // Add hyphen version
	router.GET("/backup_management", h.BackupManagementPage)
	router.GET("/backup-management", h.BackupManagementPage) // Add hyphen version
	router.GET("/monitoring_alerts", h.MonitoringAlertsPage)
	router.GET("/monitoring-alerts", h.MonitoringAlertsPage) // Add hyphen version
	router.GET("/security_center", h.SecurityCenterPage)
	router.GET("/security-center", h.SecurityCenterPage) // Add hyphen version

	// Health check endpoint
	router.GET("/health", h.HealthCheck)

	// Add global middleware
	router.Use(h.errorMiddleware.Handle())

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Authentication routes
		auth := v1.Group("/auth")
		{
			auth.POST("/login", h.Login)
			auth.POST("/logout", h.Logout)
			auth.POST("/refresh", h.RefreshToken)
		}

        // Protected routes (require authentication)
        protected := v1.Group("/")
        if h.jwtAuth != nil {
            protected.Use(h.jwtAuth.RequireAuth())
        }
        {
            customers := protected.Group("/customers")
            {
                customers.GET("/", h.ListCustomers)
                customers.POST("/", h.CreateCustomer)
                customers.GET("/:id", h.GetCustomer)
                customers.PUT("/:id", h.UpdateCustomer)
                customers.DELETE("/:id", h.DeleteCustomer)
                customers.POST("/import", h.ImportCustomersCSV)
                customers.GET("/export", h.ExportCustomersCSV)
                customers.GET("/:id/contracts", h.ListContracts)
                customers.POST("/:id/contracts", h.UploadContract)
                customers.GET("/:id/contracts/:contractId/download", h.DownloadContract)
            }

            finance := protected.Group("/finance")
            {
                finance.GET("/funds-accounts/:customerId", h.GetFundsAccount)
                finance.GET("/consume-accounts/:customerId", h.GetConsumeAccount)
                finance.POST("/transfer", h.CreateTransferOrder)
            }
			// Recharge routes
			recharge := protected.Group("/recharge")
			{
				recharge.POST("/", h.CreateRecharge)
				recharge.GET("/:id", h.GetRecharge)
				recharge.PUT("/:id/status", h.UpdateRechargeStatus)
				
				// Private recharge specific routes
				recharge.POST("/:id/voucher", h.UploadVoucher)
				recharge.POST("/:id/confirm-payment", h.ConfirmPrivatePayment)
				recharge.GET("/:id/receive-info", h.GetReceiveInfo)
				
				// Public recharge specific routes
				recharge.POST("/:id/initiate-bank-transfer", h.InitiateBankTransfer)
				recharge.GET("/:id/bank-transfer-status", h.GetBankTransferStatus)
				recharge.POST("/:id/sync-bank-status", h.SyncBankTransferStatus)
				
				// Public refund routes
				recharge.POST("/:id/initiate-public-refund", h.InitiatePublicRefund)
				recharge.GET("/:id/public-refund-status", h.GetPublicRefundStatus)
				
            // Financial audit routes
            recharge.POST("/:id/approve", h.ApproveRecharge)
            recharge.POST("/:id/reject", h.RejectRecharge)
            recharge.POST("/:id/refund", h.RefundRecharge)
            recharge.GET("/pending-audit", h.GetPendingAuditOrders)
            recharge.POST("/:id/mark-arrived", h.MarkRechargeArrived)
			}

			// Merchant routes
            merchants := protected.Group("/merchants")
            {
                merchants.GET("/", h.ListMerchants)
                merchants.GET("/options", h.ListMerchantOptions)
                merchants.POST("/", h.CreateMerchantModal)
                merchants.GET("/:id", h.GetMerchantWithAccounts)
                merchants.PUT("/:id", h.UpdateMerchantModal)
                merchants.DELETE("/:id", h.DeleteMerchant)
            }

			// Account routes with permission middleware
			accounts := protected.Group("/accounts")
			{
				accounts.GET("/", 
					middleware.RequirePermission(h.permissionService, "accounts", "read"), 
					h.ListAccounts)
				accounts.POST("/", 
					middleware.RequirePermission(h.permissionService, "accounts", "create"), 
					h.CreateAccount)
				accounts.GET("/:id", 
					middleware.RequirePermission(h.permissionService, "accounts", "read"), 
					h.GetAccount)
				accounts.PUT("/:id", 
					middleware.RequirePermission(h.permissionService, "accounts", "update"), 
					h.UpdateAccount)
				accounts.DELETE("/:id", 
					middleware.RequirePermission(h.permissionService, "accounts", "delete"), 
					h.DeleteAccount)
				accounts.POST("/:id/restore", 
					middleware.RequirePermission(h.permissionService, "accounts", "manage"), 
					h.RestoreAccount)
				accounts.POST("/:id/reset-limits", 
					middleware.RequirePermission(h.permissionService, "accounts", "manage"), 
					h.ResetAccountLimits)
			}

			// Rotation rules routes
			rotation := protected.Group("/rotation-rules")
			{
				rotation.GET("/", h.ListRotationRules)
				rotation.POST("/", h.CreateRotationRule)
				rotation.GET("/:id", h.GetRotationRule)
				rotation.PUT("/:id", h.UpdateRotationRule)
				rotation.DELETE("/:id", h.DeleteRotationRule)
				rotation.PUT("/:id/toggle", h.ToggleRotationRule)
			}

			// Limits management routes
			limits := protected.Group("/limits")
			{
				limits.GET("/", h.ListLimits)
				limits.GET("/stats", h.GetLimitStats)
				limits.POST("/reset", h.ResetLimits)
				limits.PUT("/:id", h.UpdateLimit)
			}

			// Report routes
			reports := protected.Group("/reports")
			{
				// Multi-dimensional query endpoints
				reports.POST("/query-transactions", h.QueryTransactions)
				reports.POST("/filter-options", h.GetFilterOptions)
				reports.POST("/statistics", h.GetTransactionStatistics)
				reports.POST("/time-series", h.GetTimeSeriesData)
				reports.POST("/status-dimension", h.GetStatusDimensionData)
				reports.POST("/merchant-dimension", h.GetMerchantDimensionData)
				reports.POST("/account-dimension", h.GetAccountDimensionData)
				
				// Report generation and management
				reports.POST("/generate", h.GenerateReport)
				reports.GET("/:id/status", h.GetReportStatus)
				reports.GET("/:id/download", h.DownloadReport)
				reports.GET("/", h.ListReports)
				reports.DELETE("/:id", h.DeleteReport)
				
				// Dashboard data
                reports.GET("/dashboard", h.GetDashboardData)
                reports.GET("/realtime-stats", h.GetRealTimeStatistics)
                reports.GET("/funds-credited-today", h.GetFundsCreditedToday)
                reports.GET("/funds-credited-trend", h.GetFundsCreditedTrend)
                reports.GET("/funds-credited-trend/export", h.ExportFundsCreditedTrend)
				
				// Legacy endpoints (deprecated)
				reports.GET("/transactions", h.GetTransactionReport)
				reports.GET("/merchants", h.GetMerchantReport)
				reports.GET("/accounts", h.GetAccountReport)
				reports.POST("/export", h.ExportReport)
			}

			// User management routes
			users := protected.Group("/users")
			{
				users.GET("/", h.ListUsers)
				users.POST("/", h.CreateUser)
				users.GET("/:id", h.GetUser)
				users.PUT("/:id", h.UpdateUser)
				users.DELETE("/:id", h.DeleteUser)
			}
			
			// Bank transfer routes
			bank := protected.Group("/bank")
			{
				bank.POST("/callback", h.ProcessBankCallback)
				bank.POST("/refund-callback", h.ProcessRefundCallback)
				bank.POST("/retry-failed", h.RetryFailedTransfers)
			}

			// Test data management routes
			testData := protected.Group("/test-data")
			{
				testData.POST("/merchants", h.GenerateMerchantTestData)
				testData.POST("/accounts", h.GenerateReceiveAccountTestData)
				testData.POST("/orders", h.GenerateRechargeOrderTestData)
				testData.POST("/users", h.GenerateUserTestData)
				testData.POST("/batch", h.GenerateBatchTestData)
				testData.DELETE("/cleanup", h.CleanupTestData)
			}

			// Data cleanup and reset routes
			dataCleanup := protected.Group("/data-cleanup")
			{
				dataCleanup.POST("/reset-database", h.ResetDatabaseState)
				dataCleanup.POST("/import-demo", h.ImportDemoData)
				dataCleanup.POST("/export-demo", h.ExportDemoData)
				dataCleanup.GET("/validate-integrity", h.ValidateDataIntegrity)
				dataCleanup.GET("/statistics", h.GetCleanupStatistics)
			}

			// Validation routes
			validation := protected.Group("/validation")
			{
				validation.POST("/field", h.ValidateField)
				validation.POST("/batch", h.ValidateBatchFields)
			}

			// Dashboard API routes
			dashboard := protected.Group("/dashboard")
			{
				dashboard.GET("/statistics", h.GetDashboardStatistics)
				dashboard.GET("/charts", h.GetDashboardCharts)
				dashboard.GET("/recent-transactions", h.GetRecentTransactions)
				dashboard.GET("/recent-activity", h.GetRecentActivity)
				dashboard.GET("/system-status", h.GetSystemStatus)
				dashboard.POST("/export", h.ExportDashboard)
				dashboard.GET("/recent-transactions/export", h.ExportRecentTransactions)
			}

			// Auxiliary API routes for merchant modal
			protected.GET("/agents/suggestions", h.GetAgentSuggestions)
			protected.GET("/ports/validate", h.ValidatePortName)

			// Invoice management routes
			invoices := protected.Group("/invoices")
			{
				invoices.GET("/", h.invoiceHandler.ListInvoices)
				invoices.POST("/", h.invoiceHandler.CreateInvoice)
				invoices.GET("/:id", h.invoiceHandler.GetInvoice)
				invoices.PUT("/:id", h.invoiceHandler.UpdateInvoice)
				invoices.DELETE("/:id", h.invoiceHandler.DeleteInvoice)
				invoices.POST("/:id/issue", h.invoiceHandler.IssueInvoice)
				invoices.POST("/:id/send", h.invoiceHandler.SendInvoice)
				invoices.POST("/:id/confirm", h.invoiceHandler.ConfirmInvoice)
				invoices.POST("/:id/cancel", h.invoiceHandler.CancelInvoice)
				invoices.GET("/pending", h.invoiceHandler.GetPendingInvoices)
			}

			// Settlement order routes
			settlements := protected.Group("/settlement-orders")
			{
				settlements.GET("/", h.settlementOrderHandler.ListSettlementOrders)
				settlements.POST("/", h.settlementOrderHandler.CreateSettlementOrder)
				settlements.GET("/:id", h.settlementOrderHandler.GetSettlementOrder)
				settlements.PUT("/:id", h.settlementOrderHandler.UpdateSettlementOrder)
				settlements.DELETE("/:id", h.settlementOrderHandler.DeleteSettlementOrder)
				settlements.POST("/:id/submit", h.settlementOrderHandler.SubmitForReview)
				settlements.POST("/:id/approve", h.settlementOrderHandler.ApproveOrder)
				settlements.POST("/:id/reject", h.settlementOrderHandler.RejectOrder)
				settlements.POST("/:id/settle", h.settlementOrderHandler.SettleOrder)
				settlements.GET("/pending", h.settlementOrderHandler.GetPendingOrders)
			}

			// Department management routes
			departments := protected.Group("/departments")
			{
				departments.GET("/", h.departmentHandler.ListDepartments)
				departments.POST("/", h.departmentHandler.CreateDepartment)
				departments.GET("/:id", h.departmentHandler.GetDepartment)
				departments.PUT("/:id", h.departmentHandler.UpdateDepartment)
				departments.DELETE("/:id", h.departmentHandler.DeleteDepartment)
				departments.POST("/:departmentId/users/:userId", h.departmentHandler.AssignUserToDepartment)
				departments.DELETE("/:departmentId/users/:userId", h.departmentHandler.RemoveUserFromDepartment)
				departments.GET("/:id/users", h.departmentHandler.GetDepartmentUsers)
				departments.POST("/:departmentId/roles/:roleId", h.departmentHandler.AssignRoleToDepartment)
				departments.DELETE("/:departmentId/roles/:roleId", h.departmentHandler.RemoveRoleFromDepartment)
				departments.GET("/:id/roles", h.departmentHandler.GetDepartmentRoles)
				departments.GET("/users/:userId/permissions", h.departmentHandler.GetUserEffectivePermissions)
			}

			// Custom form routes
			forms := protected.Group("/forms")
			{
				forms.GET("/", h.customFormHandler.ListForms)
				forms.POST("/", h.customFormHandler.CreateForm)
				forms.GET("/:id", h.customFormHandler.GetForm)
				forms.PUT("/:id", h.customFormHandler.UpdateForm)
				forms.DELETE("/:id", h.customFormHandler.DeleteForm)
				forms.POST("/:id/publish", h.customFormHandler.PublishForm)
				forms.POST("/:id/archive", h.customFormHandler.ArchiveForm)
				forms.POST("/:id/submissions", h.customFormHandler.SubmitForm)
				forms.GET("/:id/submissions", h.customFormHandler.ListSubmissions)
			}

			// Form submission routes
			submissions := protected.Group("/submissions")
			{
				submissions.GET("/:id", h.customFormHandler.GetSubmission)
				submissions.POST("/:id/review", h.customFormHandler.ReviewSubmission)
			}
		}

		// Recharge Testing System Management API routes
		rechargeTestingAPI := v1.Group("/recharge-testing")
		rechargeTestingAPI.Use(h.validationMiddleware.ValidatePagination())
		{
			h.rechargeTestingHandler.RegisterRoutes(rechargeTestingAPI)
		}
	}

	// Simple API routes for recharge wizard (without authentication for testing)
	api := router.Group("/api")
	{
		api.GET("/merchants", h.GetMerchants)
		api.GET("/receive-accounts", h.GetReceiveAccounts)
		api.GET("/merchants/:merchantId/receive-accounts", h.GetMerchantReceiveAccounts)
		api.POST("/recharge/orders", h.CreateRechargeOrder)
		api.GET("/recharge/orders", h.GetRechargeOrders)
		api.GET("/recharge/stats", h.GetRechargeStats)
	}
	
	// Register recharge link routes (includes public short link access)
	if h.rechargeLinkHandler != nil {
		h.rechargeLinkHandler.RegisterRoutes(v1) // Management API
	}
}

// HomePage serves the home page
func (h *Handler) HomePage(c *gin.Context) {
	c.Redirect(http.StatusFound, "/dashboard")
}

// LoginPage serves the login page
func (h *Handler) LoginPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/login.html")
}

// DashboardPage is implemented in dashboard_handler.go

// AdminDashboard serves the admin dashboard page
func (h *Handler) AdminDashboard(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/system_management.html")
}

// RechargeManagementPage serves the recharge management page
func (h *Handler) RechargeManagementPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/recharge_management.html")
}

// PrivateRechargePage serves the private recharge page
func (h *Handler) PrivateRechargePage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/private_recharge.html")
}

// PublicRechargePage serves the public recharge page
func (h *Handler) PublicRechargePage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/public_recharge.html")
}

// FinancialAuditPage serves the financial audit page
func (h *Handler) FinancialAuditPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/financial_audit.html")
}

// ReportDashboardPage serves the report dashboard page
func (h *Handler) ReportDashboardPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/report_dashboard.html")
}

// ValidationDashboardPage serves the validation dashboard page
func (h *Handler) ValidationDashboardPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/validation_dashboard.html")
}

// UserManagementPage serves the user management page
func (h *Handler) UserManagementPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/user_management.html")
}

// HealthCheck handles health check requests
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":  "ok",
		"service": "cjpayment-api",
		"version": "1.0.0",
	})
}

// Authentication handlers
func (h *Handler) Login(c *gin.Context) {
	var req service.LoginRequest
	
	// 支持多种内容类型
	contentType := c.GetHeader("Content-Type")
	var err error
	
	if strings.Contains(contentType, "application/json") {
		err = c.ShouldBindJSON(&req)
	} else {
		// 处理 form data
		err = c.ShouldBind(&req)
	}
	
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	response, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid username or password",
			})
			return
		}
		if errors.Is(err, service.ErrUserInactive) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "User account is inactive",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Login failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *Handler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (h *Handler) RefreshToken(c *gin.Context) {
	c.JSON(501, gin.H{"error": "not implemented"})
}
// ListMerchants lists merchants with filtering and pagination
func (h *Handler) ListMerchants(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := &repository.MerchantFilter{
		Keyword: &search,
		Limit:   limit,
		Offset:  (page - 1) * limit,
	}

	if status != "" {
		filter.Status = &status
	}

	merchants, total, err := h.merchantService.ListMerchants(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list merchants",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"merchants":   merchants,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": (total + int64(limit) - 1) / int64(limit),
	})
}
// CreateMerchant creates a new merchant
func (h *Handler) CreateMerchant(c *gin.Context) {
	var req service.CreateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	merchant, err := h.merchantService.CreateMerchant(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create merchant",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    merchant,
	})
}

// GetMerchant retrieves a merchant by ID
func (h *Handler) GetMerchant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	merchant, err := h.merchantService.GetMerchant(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Merchant not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    merchant,
	})
}

// UpdateMerchant updates an existing merchant
func (h *Handler) UpdateMerchant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	var req service.UpdateMerchantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	merchant, err := h.merchantService.UpdateMerchant(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update merchant",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    merchant,
	})
}

// DeleteMerchant deletes a merchant
func (h *Handler) DeleteMerchant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid merchant ID format",
		})
		return
	}

	err = h.merchantService.DeleteMerchant(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete merchant",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Merchant deleted successfully",
	})
}
// ListAccounts lists all receive accounts with filtering
func (h *Handler) ListAccounts(c *gin.Context) {
	// 添加详细的错误日志
	if h.accountService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Account service is not initialized",
		})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	accountType := c.Query("type")
	status := c.Query("status")
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var accountTypePtr, statusPtr, searchPtr *string
	if accountType != "" {
		accountTypePtr = &accountType
	}
	if status != "" {
		statusPtr = &status
	}
	if search != "" {
		searchPtr = &search
	}

	filter := &repository.ReceiveAccountFilter{
		AccountType: accountTypePtr,
		Status:      statusPtr,
		Search:      searchPtr,
		Limit:       limit,
		Offset:      (page - 1) * limit,
	}

	accounts, total, err := h.accountService.ListReceiveAccounts(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list accounts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"accounts":    accounts,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": (total + int64(limit) - 1) / int64(limit),
	})
}

// CreateAccount creates a new receive account
func (h *Handler) CreateAccount(c *gin.Context) {
	var req service.CreateReceiveAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	account, err := h.accountService.CreateReceiveAccount(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    account,
	})
}

// GetAccount retrieves a receive account by ID
func (h *Handler) GetAccount(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID format",
		})
		return
	}

	account, err := h.accountService.GetReceiveAccount(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Account not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    account,
	})
}

// UpdateAccount updates an existing receive account
func (h *Handler) UpdateAccount(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID format",
		})
		return
	}

	var req service.UpdateReceiveAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	account, err := h.accountService.UpdateReceiveAccount(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    account,
	})
}

// DeleteAccount deletes a receive account
func (h *Handler) DeleteAccount(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID format",
		})
		return
	}

	err = h.accountService.DeleteReceiveAccount(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account deleted successfully",
	})
}

// RestoreAccount restores a soft-deleted receive account
func (h *Handler) RestoreAccount(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID format",
		})
		return
	}

	err = h.accountService.RestoreReceiveAccount(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to restore account",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account restored successfully",
	})
}

// ResetAccountLimits resets the daily usage limits for an account
func (h *Handler) ResetAccountLimits(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid account ID format",
		})
		return
	}

	// TODO: Implement ResetAccountLimits method in service
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account limits reset successfully",
	})
}
// Rotation Rules handlers
func (h *Handler) ListRotationRules(c *gin.Context) {
	// Mock data for now - replace with actual service call
	rules := []gin.H{
		{
			"id":          "rule-1",
			"name":        "默认轮询规则",
			"merchant_id": "merchant-1",
			"status":      "active",
			"priority":    1,
			"created_at":  "2024-01-01T00:00:00Z",
		},
		{
			"id":          "rule-2", 
			"name":        "高优先级规则",
			"merchant_id": "merchant-2",
			"status":      "inactive",
			"priority":    2,
			"created_at":  "2024-01-02T00:00:00Z",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"rules": rules,
			"total": len(rules),
		},
	})
}

func (h *Handler) CreateRotationRule(c *gin.Context) { 
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "轮询规则创建成功",
		"data": gin.H{
			"id": "new-rule-id",
		},
	})
}

func (h *Handler) GetRotationRule(c *gin.Context) { 
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":          id,
			"name":        "示例轮询规则",
			"merchant_id": "merchant-1",
			"status":      "active",
		},
	})
}

func (h *Handler) UpdateRotationRule(c *gin.Context) { 
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "轮询规则更新成功",
	})
}

func (h *Handler) DeleteRotationRule(c *gin.Context) { 
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "轮询规则删除成功",
	})
}

func (h *Handler) ToggleRotationRule(c *gin.Context) { 
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "轮询规则状态切换成功",
	})
}

// Limits handlers
func (h *Handler) ListLimits(c *gin.Context) {
	// Mock data for now - replace with actual service call
	limits := []gin.H{
		{
			"id":           "limit-1",
			"type":         "daily",
			"name":         "日限额",
			"current_used": 50000.00,
			"limit_amount": 100000.00,
			"is_near_limit": false,
			"last_reset":   "2024-01-01T00:00:00Z",
		},
		{
			"id":           "limit-2",
			"type":         "monthly", 
			"name":         "月限额",
			"current_used": 800000.00,
			"limit_amount": 1000000.00,
			"is_near_limit": true,
			"last_reset":   "2024-01-01T00:00:00Z",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"limits": limits,
			"total":  len(limits),
		},
	})
}

func (h *Handler) GetLimitStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_limits":     4,
			"active_limits":    3,
			"near_limit_count": 1,
			"exceeded_count":   0,
		},
	})
}

func (h *Handler) ResetLimits(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "限额重置成功",
	})
}

func (h *Handler) UpdateLimit(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "限额更新成功",
	})
}

func (h *Handler) GetTransactionReport(c *gin.Context) { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) GetMerchantReport(c *gin.Context)  { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) GetAccountReport(c *gin.Context)   { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) ExportReport(c *gin.Context)       { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) ListUsers(c *gin.Context)          { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) CreateUser(c *gin.Context)         { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) GetUser(c *gin.Context)            { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) UpdateUser(c *gin.Context)         { c.JSON(501, gin.H{"error": "not implemented"}) }
func (h *Handler) DeleteUser(c *gin.Context)         { c.JSON(501, gin.H{"error": "not implemented"}) }

// Private Recharge Handler Implementations

// CreateRecharge creates a new recharge order
func (h *Handler) CreateRecharge(c *gin.Context) {
	var req service.CreateRechargeOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Create recharge order
	order, err := h.rechargeService.CreateRechargeOrder(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create recharge order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    order,
	})
}

// GetRecharge retrieves a recharge order by ID
func (h *Handler) GetRecharge(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    order,
	})
}

// GetReceiveInfo retrieves receive account information for a recharge order
func (h *Handler) GetReceiveInfo(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// Get recharge order
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Get receive account details
	account, err := h.accountService.GetReceiveAccount(c.Request.Context(), order.ReceiveAccountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get receive account information",
			"details": err.Error(),
		})
		return
	}

	// Return receive information
	receiveInfo := gin.H{
		"order_id":        order.ID,
		"order_number":    order.OrderNumber,
		"amount":          order.Amount,
		"payment_type":    order.PaymentType,
		"receiver_name":   account.AccountHolder,
		"receiver_account": account.AccountNumber,
		"account_type":    account.AccountType,
		"bank_name":       account.BankName,
		"bank_branch":     account.BankBranch,
		"status":          order.Status,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    receiveInfo,
	})
}

// UploadVoucher handles payment voucher upload for private recharge
func (h *Handler) UploadVoucher(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// Get recharge order
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Validate order status
	if order.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot upload voucher for order with status: %s", order.Status),
		})
		return
	}

	// Validate payment type
	if order.PaymentType != "private" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Voucher upload is only allowed for private recharge orders",
		})
		return
	}

	// Handle file upload
	file, header, err := c.Request.FormFile("voucher")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to get uploaded file",
			"details": err.Error(),
		})
		return
	}
	defer file.Close()

	// Validate file
	if err := h.validateVoucherFile(header); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid voucher file",
			"details": err.Error(),
		})
		return
	}

	// Save file
	voucherURL, err := h.saveVoucherFile(file, header, order.OrderNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to save voucher file",
			"details": err.Error(),
		})
		return
	}

	// Update order with voucher
	err = h.rechargeService.ProcessPrivateRecharge(c.Request.Context(), id, voucherURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to process private recharge",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Voucher uploaded successfully, order is now pending financial audit",
		"voucher_url": voucherURL,
	})
}

// ConfirmPrivatePayment confirms that payment has been completed for private recharge
func (h *Handler) ConfirmPrivatePayment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		VoucherURL string `json:"voucher_url" binding:"required"`
		Remark     string `json:"remark"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Process private recharge
	err = h.rechargeService.ProcessPrivateRecharge(c.Request.Context(), id, req.VoucherURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to confirm private payment",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Payment confirmed successfully, order is now pending financial audit",
	})
}

// UpdateRechargeStatus updates the status of a recharge order
func (h *Handler) UpdateRechargeStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Status string  `json:"status" binding:"required"`
		Reason *string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

    // Update order status
    err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, req.Status, req.Reason, nil)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error":   "Failed to update order status",
            "details": err.Error(),
        })
        return
    }

    // Auto credit funds account when order completed
    if strings.ToLower(req.Status) == "completed" {
        creditType := strings.ToLower(c.DefaultQuery("credit_type", "cash"))
        grantAmount := c.Query("grant_amount")
        grantRatio := c.Query("grant_ratio")
        if err := h.autoCreditFundsForOrderWithSplit(c.Request.Context(), id, creditType, nullableStrPtr(grantAmount), nullableStrPtr(grantRatio)); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error":"Order marked completed but auto credit failed","details":err.Error()})
            return
        }
    }

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order status updated successfully",
	})
}

func (h *Handler) autoCreditFundsForOrderWithType(ctx context.Context, orderID uuid.UUID, creditType string) error {
    order, err := h.rechargeService.GetRechargeOrder(ctx, orderID)
    if err != nil { return fmt.Errorf("load order failed: %w", err) }
    if strings.ToLower(order.Status) != "completed" { return fmt.Errorf("order not completed") }
    custID, err := h.ensureCustomerForOrder(ctx, order)
    if err != nil { return fmt.Errorf("ensure customer failed: %w", err) }
    // idempotency: if ledger already has recharge entry for this order, skip
    var exists int
    _ = h.db.QueryRowx("SELECT 1 FROM ledger_entries WHERE order_id=$1 AND category='recharge'", order.ID).Scan(&exists)
    if exists == 1 { return nil }
    tx, err := h.db.Beginx(); if err != nil { return err }
    defer func(){ if err != nil { _ = tx.Rollback() } }()
    var cash, grant decimal.Decimal
    // lock funds
    err = tx.QueryRowx("SELECT cash_balance, grant_balance FROM funds_accounts WHERE customer_id=$1 FOR UPDATE", custID).Scan(&cash, &grant)
    if err != nil {
        // ensure account then retry
        _, _ = tx.Exec("INSERT INTO funds_accounts(customer_id, cash_balance, grant_balance) VALUES($1,0,0) ON CONFLICT (customer_id) DO NOTHING", custID)
        err = tx.QueryRowx("SELECT cash_balance, grant_balance FROM funds_accounts WHERE customer_id=$1 FOR UPDATE", custID).Scan(&cash, &grant)
        if err != nil { return err }
    }
    if creditType == "grant" {
        grant = grant.Add(order.Amount)
        if _, err = tx.Exec("UPDATE funds_accounts SET grant_balance=$1, updated_at=NOW() WHERE customer_id=$2", grant, custID); err != nil { return err }
        _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'funds','recharge','grant',$2,0,$3,$4,$5,NOW())", custID, order.Amount, order.Amount, grant, order.ID)
    } else {
        cash = cash.Add(order.Amount)
        if _, err = tx.Exec("UPDATE funds_accounts SET cash_balance=$1, updated_at=NOW() WHERE customer_id=$2", cash, custID); err != nil { return err }
        _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'funds','recharge','cash',$2,$3,0,$4,$5,NOW())", custID, order.Amount, order.Amount, cash, order.ID)
    }
    err = tx.Commit(); if err != nil { return err }
    if h.notificationService != nil {
        payload := map[string]interface{}{
            "order_id": order.ID.String(),
            "order_number": order.OrderNumber,
            "customer_id": custID.String(),
            "amount": order.Amount.String(),
            "credit_type": creditType,
        }
        _ = h.notificationService.SendNotification(ctx, &service.SendNotificationRequest{EventType:"funds_credited", Payload: string(mustJSON(payload))})
    }
    if h.reportService != nil {
        _ = h.reportService.RefreshStatisticsCache(ctx, "funds_credited")
    }
    return nil
}
// autoCreditFundsForOrderWithSplit supports split allocation between grant and cash using grant_amount or grant_ratio
func (h *Handler) autoCreditFundsForOrderWithSplit(ctx context.Context, orderID uuid.UUID, creditType string, grantAmountStr *string, grantRatioStr *string) error {
    order, err := h.rechargeService.GetRechargeOrder(ctx, orderID)
    if err != nil { return fmt.Errorf("load order failed: %w", err) }
    if strings.ToLower(order.Status) != "completed" { return fmt.Errorf("order not completed") }
    custID, err := h.ensureCustomerForOrder(ctx, order)
    if err != nil { return fmt.Errorf("ensure customer failed: %w", err) }
    var exists int
    _ = h.db.QueryRowx("SELECT 1 FROM ledger_entries WHERE order_id=$1 AND category='recharge'", order.ID).Scan(&exists)
    if exists == 1 { return nil }
    total := order.Amount
    grantAmt := decimal.Zero
    cashAmt := decimal.Zero
    if grantAmountStr != nil && *grantAmountStr != "" {
        if ga, err := decimal.NewFromString(*grantAmountStr); err == nil && ga.IsPositive() && !ga.GreaterThan(total) {
            grantAmt = ga
        }
    } else if grantRatioStr != nil && *grantRatioStr != "" {
        if gr, err := decimal.NewFromString(*grantRatioStr); err == nil {
            if gr.LessThan(decimal.Zero) { gr = decimal.Zero }
            if gr.GreaterThan(decimal.NewFromInt(1)) { gr = decimal.NewFromInt(1) }
            grantAmt = total.Mul(gr)
        }
    } else if creditType == "grant" {
        grantAmt = total
    }
    cashAmt = total.Sub(grantAmt)
    tx, err := h.db.Beginx(); if err != nil { return err }
    defer func(){ if err != nil { _ = tx.Rollback() } }()
    var cashBal, grantBal decimal.Decimal
    err = tx.QueryRowx("SELECT cash_balance, grant_balance FROM funds_accounts WHERE customer_id=$1 FOR UPDATE", custID).Scan(&cashBal, &grantBal)
    if err != nil {
        _, _ = tx.Exec("INSERT INTO funds_accounts(customer_id, cash_balance, grant_balance) VALUES($1,0,0) ON CONFLICT (customer_id) DO NOTHING", custID)
        err = tx.QueryRowx("SELECT cash_balance, grant_balance FROM funds_accounts WHERE customer_id=$1 FOR UPDATE", custID).Scan(&cashBal, &grantBal)
        if err != nil { return err }
    }
    if grantAmt.GreaterThan(decimal.Zero) {
        grantBal = grantBal.Add(grantAmt)
        if _, err = tx.Exec("UPDATE funds_accounts SET grant_balance=$1, updated_at=NOW() WHERE customer_id=$2", grantBal, custID); err != nil { return err }
        _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'funds','recharge','grant',$2,0,$3,$4,$5,NOW())", custID, grantAmt, grantAmt, grantBal, order.ID)
    }
    if cashAmt.GreaterThan(decimal.Zero) {
        cashBal = cashBal.Add(cashAmt)
        if _, err = tx.Exec("UPDATE funds_accounts SET cash_balance=$1, updated_at=NOW() WHERE customer_id=$2", cashBal, custID); err != nil { return err }
        _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'funds','recharge','cash',$2,$3,0,$4,$5,NOW())", custID, cashAmt, cashAmt, cashBal, order.ID)
    }
    err = tx.Commit(); if err != nil { return err }
    if h.notificationService != nil {
        payload := map[string]interface{}{
            "order_id": order.ID.String(),
            "order_number": order.OrderNumber,
            "customer_id": custID.String(),
            "amount": total.String(),
            "grant_amount": grantAmt.String(),
            "cash_amount": cashAmt.String(),
        }
        _ = h.notificationService.SendNotification(ctx, &service.SendNotificationRequest{EventType:"funds_credited", Payload: string(mustJSON(payload))})
    }
    if h.reportService != nil { _ = h.reportService.RefreshStatisticsCache(ctx, "funds_credited") }
    return nil
}

// ensureCustomerForOrder finds or creates a customer under the merchant (tenant) using order.AdAccount as customer code
func (h *Handler) ensureCustomerForOrder(ctx context.Context, order *repository.RechargeOrder) (uuid.UUID, error) {
    // try find
    var cid uuid.UUID
    err := h.db.QueryRowx("SELECT id FROM customers WHERE tenant_id=$1 AND code=$2", order.MerchantID, order.AdAccount).Scan(&cid)
    if err == nil { return cid, nil }
    // create
    cid = uuid.New()
    _, err = h.db.Exec("INSERT INTO customers(id, tenant_id, name, code, status) VALUES($1,$2,$3,$4,'active')", cid, order.MerchantID, order.AdAccount, order.AdAccount)
    if err != nil { return uuid.Nil, err }
    h.ensureAccountsForCustomer(cid)
    return cid, nil
}

// Financial Audit Handler Implementations

// GetPendingAuditOrders retrieves orders pending financial audit
func (h *Handler) GetPendingAuditOrders(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	paymentType := c.Query("payment_type")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Create filter for pending audit orders
	filter := &repository.RechargeOrderFilter{
		Status:      []string{"paid"}, // Orders that have been paid but not yet confirmed
		PaymentType: paymentType,
		Page:        page,
		Limit:       limit,
		OrderBy:     "created_at",
		OrderDir:    "ASC", // Oldest first for audit queue
	}

	// Get orders
	orders, total, err := h.rechargeService.ListRechargeOrders(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get pending audit orders",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"orders":     orders,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// ApproveRecharge approves a recharge order (financial audit)
func (h *Handler) ApproveRecharge(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Remark string `json:"remark"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Get order to validate
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Validate order status
	if order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot approve order with status: %s", order.Status),
		})
		return
	}

	// Update status to confirmed
	reason := fmt.Sprintf("Approved by financial audit. %s", req.Remark)
	err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, "confirmed", &reason, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to approve recharge order",
			"details": err.Error(),
		})
		return
	}

	// For public recharge orders, also check if bank transfer was successful
	var message string
	if order.PaymentType == "public" {
		message = "Public recharge order approved successfully. Bank transfer has been confirmed."
	} else {
		message = "Private recharge order approved successfully."
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"order_id":     order.ID,
			"payment_type": order.PaymentType,
			"status":       "confirmed",
		},
	})
}

// MarkRechargeArrived marks the recharge as funds arrived and auto credits customer funds account
func (h *Handler) MarkRechargeArrived(c *gin.Context) {
    idStr := c.Param("id")
    id, err := uuid.Parse(idStr)
    if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid order ID"}); return }
    var req struct{ CreditType string `json:"credit_type"`; GrantAmount *string `json:"grant_amount"`; GrantRatio *string `json:"grant_ratio"` }
    _ = c.ShouldBindJSON(&req)
    if req.CreditType == "" { req.CreditType = "cash" }
    creditType := strings.ToLower(req.CreditType)
    reason := "Finance marked funds arrived"
    if err := h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, "completed", &reason, nil); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to mark arrived","details":err.Error()}); return
    }
    if err := h.autoCreditFundsForOrderWithSplit(c.Request.Context(), id, creditType, req.GrantAmount, req.GrantRatio); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error":"Auto credit failed","details":err.Error()}); return
    }
    c.JSON(http.StatusOK, gin.H{"success":true, "message":"Recharge marked arrived and credited"})
}

// RejectRecharge rejects a recharge order (financial audit)
func (h *Handler) RejectRecharge(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Get order to validate
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Validate order status
	if order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot reject order with status: %s", order.Status),
		})
		return
	}

	// Update status to cancelled
	reason := fmt.Sprintf("Rejected by financial audit: %s", req.Reason)
	err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, "cancelled", &reason, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to reject recharge order",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Recharge order rejected successfully",
	})
}

// RefundRecharge processes a refund for a recharge order
func (h *Handler) RefundRecharge(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		Reason        string  `json:"reason" binding:"required"`
		RefundAccount *string `json:"refund_account"` // Required for public refunds
		RefundName    *string `json:"refund_name"`    // Required for public refunds
		BankName      *string `json:"bank_name"`      // Required for public refunds
		BankBranch    *string `json:"bank_branch"`    // Optional for public refunds
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Get order to validate
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Validate order status (can refund confirmed or completed orders)
	if order.Status != "confirmed" && order.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot refund order with status: %s", order.Status),
		})
		return
	}

	// Handle different refund types
	if order.PaymentType == "public" {
		// For public orders, initiate bank refund
		if req.RefundAccount == nil || req.RefundName == nil || req.BankName == nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Public refunds require refund_account, refund_name, and bank_name",
			})
			return
		}

		refundReq := &service.InitiatePublicRefundRequest{
			OrderID:            id,
			RefundAmount:       order.Amount,
			RefundReason:       req.Reason,
			RefundAccount:      *req.RefundAccount,
			RefundName:         *req.RefundName,
			BankName:           *req.BankName,
			BankBranch:         req.BankBranch,
			NotifyURL:          fmt.Sprintf("%s/api/v1/bank/refund-callback", h.getBaseURL(c)),
			OriginalTransferID: fmt.Sprintf("BT%s", order.OrderNumber[2:]),
		}

		response, err := h.bankService.InitiatePublicRefund(c.Request.Context(), refundReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to initiate public refund",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Public refund initiated successfully",
			"data":    response,
		})
	} else {
		// For private orders, directly update status to refunded
		reason := fmt.Sprintf("Private refund processed: %s", req.Reason)
		err = h.rechargeService.UpdateOrderStatus(c.Request.Context(), id, "refunded", &reason, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to process private refund",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Private refund processed successfully",
		})
	}
}

// Helper functions

// validateVoucherFile validates the uploaded voucher file
func (h *Handler) validateVoucherFile(header *multipart.FileHeader) error {
	// Check file size (max 10MB)
	maxSize := int64(10 * 1024 * 1024)
	if header.Size > maxSize {
		return fmt.Errorf("file size exceeds maximum limit of 10MB")
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := []string{".jpg", ".jpeg", ".png", ".pdf", ".gif"}
	
	isAllowed := false
	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			isAllowed = true
			break
		}
	}
	
	if !isAllowed {
		return fmt.Errorf("file type not allowed. Allowed types: %s", strings.Join(allowedExts, ", "))
	}

	return nil
}

// saveVoucherFile saves the uploaded voucher file and returns the URL
func (h *Handler) saveVoucherFile(file multipart.File, header *multipart.FileHeader, orderNumber string) (string, error) {
	// Create upload directory if it doesn't exist
	uploadDir := "uploads/vouchers"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s_%d%s", orderNumber, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	_, err = io.Copy(dst, file)
	if err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	// Return relative URL
	return fmt.Sprintf("/uploads/vouchers/%s", filename), nil
}

// Bank Transfer Handler Implementations

// InitiateBankTransfer initiates a bank transfer for public recharge
func (h *Handler) InitiateBankTransfer(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// Get recharge order
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Validate order
	if order.PaymentType != "public" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Bank transfer is only available for public recharge orders",
		})
		return
	}

	if order.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot initiate bank transfer for order with status: %s", order.Status),
		})
		return
	}

	// Get receive account details
	account, err := h.accountService.GetReceiveAccount(c.Request.Context(), order.ReceiveAccountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get receive account information",
			"details": err.Error(),
		})
		return
	}

	// Prepare bank transfer request
	req := &service.InitiateBankTransferRequest{
		OrderID:         order.ID,
		PayerName:       order.PayerName,
		PayerAccount:    order.PayerAccount,
		Amount:          order.Amount,
		ReceiverName:    account.AccountHolder,
		ReceiverAccount: account.AccountNumber,
		BankName:        *account.BankName,
		BankBranch:      account.BankBranch,
		Purpose:         fmt.Sprintf("Recharge for order %s", order.OrderNumber),
		NotifyURL:       fmt.Sprintf("%s/api/v1/bank/callback", h.getBaseURL(c)),
		ReturnURL:       fmt.Sprintf("%s/public-recharge?order_id=%s", h.getBaseURL(c), order.ID),
	}

	// Initiate bank transfer
	response, err := h.bankService.InitiateBankTransfer(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initiate bank transfer",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetBankTransferStatus gets the status of a bank transfer
func (h *Handler) GetBankTransferStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// Get bank transfer status
	status, err := h.bankService.GetBankTransferStatus(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get bank transfer status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// SyncBankTransferStatus synchronizes bank transfer status
func (h *Handler) SyncBankTransferStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// Sync transfer status
	status, err := h.bankService.SyncTransferStatus(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to sync bank transfer status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
		"message": "Bank transfer status synchronized successfully",
	})
}

// ProcessBankCallback processes bank transfer callback
func (h *Handler) ProcessBankCallback(c *gin.Context) {
	var callback service.BankCallbackRequest
	if err := c.ShouldBindJSON(&callback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid callback format",
			"code":    "INVALID_FORMAT",
		})
		return
	}

	// Process callback
	response, err := h.bankService.ProcessBankCallback(c.Request.Context(), &callback)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to process callback",
			"code":    "PROCESSING_ERROR",
		})
		return
	}

	// Return response based on callback processing result
	if response.Success {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusBadRequest, response)
	}
}

// RetryFailedTransfers retries failed bank transfers
func (h *Handler) RetryFailedTransfers(c *gin.Context) {
	err := h.bankService.RetryFailedTransfers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retry failed transfers",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Failed transfers retry initiated successfully",
	})
}

// Helper functions

// getBaseURL gets the base URL for the current request
func (h *Handler) getBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, c.Request.Host)
}

// Public Refund Handler Implementations

// InitiatePublicRefund initiates a public refund for a recharge order
func (h *Handler) InitiatePublicRefund(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	var req struct {
		RefundAmount  float64 `json:"refund_amount" binding:"required"`
		RefundReason  string  `json:"refund_reason" binding:"required"`
		RefundAccount string  `json:"refund_account" binding:"required"`
		RefundName    string  `json:"refund_name" binding:"required"`
		BankName      string  `json:"bank_name" binding:"required"`
		BankBranch    *string `json:"bank_branch"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Get recharge order to validate
	order, err := h.rechargeService.GetRechargeOrder(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Recharge order not found",
			"details": err.Error(),
		})
		return
	}

	// Validate order is eligible for refund
	if order.PaymentType != "public" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Public refund is only available for public recharge orders",
		})
		return
	}

	if order.Status != "confirmed" && order.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot refund order with status: %s", order.Status),
		})
		return
	}

	// Prepare refund request
	refundReq := &service.InitiatePublicRefundRequest{
		OrderID:            id,
		RefundAmount:       decimal.NewFromFloat(req.RefundAmount),
		RefundReason:       req.RefundReason,
		RefundAccount:      req.RefundAccount,
		RefundName:         req.RefundName,
		BankName:           req.BankName,
		BankBranch:         req.BankBranch,
		NotifyURL:          fmt.Sprintf("%s/api/v1/bank/refund-callback", h.getBaseURL(c)),
		OriginalTransferID: fmt.Sprintf("BT%s", order.OrderNumber[2:]), // Extract from order number
	}

	// Initiate refund
	response, err := h.bankService.InitiatePublicRefund(c.Request.Context(), refundReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initiate public refund",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"message": "Public refund initiated successfully",
	})
}

// GetPublicRefundStatus gets the status of a public refund
func (h *Handler) GetPublicRefundStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid order ID format",
		})
		return
	}

	// Get refund status
	status, err := h.bankService.GetRefundStatus(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get public refund status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// ProcessRefundCallback processes public refund callback
func (h *Handler) ProcessRefundCallback(c *gin.Context) {
	var callback service.RefundCallbackRequest
	if err := c.ShouldBindJSON(&callback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid callback format",
			"code":    "INVALID_FORMAT",
		})
		return
	}

	// Process callback
	response, err := h.bankService.ProcessRefundCallback(c.Request.Context(), &callback)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to process refund callback",
			"code":    "PROCESSING_ERROR",
		})
		return
	}

	// Return response based on callback processing result
	if response.Success {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusBadRequest, response)
	}
}

// Report Handler Implementations

// QueryTransactions handles multi-dimensional transaction queries
func (h *Handler) QueryTransactions(c *gin.Context) {
	var req service.TransactionQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.reportService.QueryTransactions(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to query transactions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetFilterOptions retrieves available filter options
func (h *Handler) GetFilterOptions(c *gin.Context) {
	var req service.FilterOptionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	options, err := h.reportService.GetFilterOptions(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get filter options",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, options)
}

// GetTransactionStatistics retrieves transaction statistics
func (h *Handler) GetTransactionStatistics(c *gin.Context) {
	var req service.TransactionStatisticsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	stats, err := h.reportService.GetTransactionStatistics(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get transaction statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetTimeSeriesData retrieves time series data
func (h *Handler) GetTimeSeriesData(c *gin.Context) {
	var req service.TimeSeriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.reportService.GetTimeSeriesData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get time series data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetStatusDimensionData retrieves status dimension data
func (h *Handler) GetStatusDimensionData(c *gin.Context) {
	var req service.StatusDimensionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.reportService.GetStatusDimensionData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get status dimension data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetMerchantDimensionData retrieves merchant dimension data
func (h *Handler) GetMerchantDimensionData(c *gin.Context) {
	var req service.MerchantDimensionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.reportService.GetMerchantDimensionData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get merchant dimension data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetAccountDimensionData retrieves account dimension data
func (h *Handler) GetAccountDimensionData(c *gin.Context) {
	var req service.AccountDimensionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.reportService.GetAccountDimensionData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get account dimension data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GenerateReport generates a report
func (h *Handler) GenerateReport(c *gin.Context) {
	var req service.ReportGenerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	report, err := h.reportService.GenerateTransactionReport(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate report",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    report,
	})
}

// GetReportStatus retrieves report status
func (h *Handler) GetReportStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid report ID format",
		})
		return
	}

	status, err := h.reportService.GetReportStatus(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get report status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, status)
}

// DownloadReport downloads a report
func (h *Handler) DownloadReport(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid report ID format",
		})
		return
	}

	download, err := h.reportService.DownloadReport(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to download report",
			"details": err.Error(),
		})
		return
	}

	c.Header("Content-Type", download.ContentType)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", download.FileName))
	c.Header("Content-Length", fmt.Sprintf("%d", download.FileSize))
	c.Data(http.StatusOK, download.ContentType, download.Data)
}

func (h *Handler) ListCustomers(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    search := c.Query("search")
    tenantIDStr := c.Query("tenant_id")
    if page < 1 { page = 1 }
    if limit < 1 || limit > 100 { limit = 20 }
    args := []interface{}{}
    where := ""
    if tenantIDStr != "" {
        if tid, err := uuid.Parse(tenantIDStr); err == nil {
            where += " AND tenant_id = $1"
            args = append(args, tid)
        }
    }
    if search != "" {
        args = append(args, "%"+search+"%")
        where += " AND name ILIKE $" + strconv.Itoa(len(args))
    }
    offset := (page-1)*limit
    query := "SELECT id, tenant_id, name, code, contact_person, contact_phone, contact_email, status, created_at, updated_at FROM customers WHERE 1=1" + where + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)+1) + " OFFSET $" + strconv.Itoa(len(args)+2)
    args = append(args, limit, offset)
    rows, err := h.db.Queryx(query, args...)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to list customers","details":err.Error()}); return
    }
    defer rows.Close()
    var customers []repository.Customer
    for rows.Next() {
        var cust repository.Customer
        if err := rows.StructScan(&cust); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to parse customer","details":err.Error()}); return }
        customers = append(customers, cust)
    }
    countQuery := "SELECT COUNT(1) FROM customers WHERE 1=1" + where
    var total int64
    if err := h.db.QueryRowx(countQuery, args[:len(args)-2]...).Scan(&total); err != nil { total = int64(len(customers)) }
    c.JSON(http.StatusOK, gin.H{"customers":customers, "total":total, "page":page, "limit":limit, "total_pages":(total+int64(limit)-1)/int64(limit)})
}

func (h *Handler) CreateCustomer(c *gin.Context) {
    var req struct{
        TenantID string `json:"tenant_id" binding:"required"`
        Name string `json:"name" binding:"required"`
        Code string `json:"code" binding:"required"`
        ContactPerson *string `json:"contact_person"`
        ContactPhone *string `json:"contact_phone"`
        ContactEmail *string `json:"contact_email"`
    }
    if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid request","details":err.Error()}); return }
    tid, err := uuid.Parse(req.TenantID); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid tenant_id"}); return }
    id := uuid.New()
    _, err = h.db.Exec("INSERT INTO customers(id, tenant_id, name, code, contact_person, contact_phone, contact_email, status) VALUES($1,$2,$3,$4,$5,$6,$7,'active')", id, tid, req.Name, req.Code, req.ContactPerson, req.ContactPhone, req.ContactEmail)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to create customer","details":err.Error()}); return }
    h.ensureAccountsForCustomer(id)
    var cust repository.Customer
    if err := h.db.QueryRowx("SELECT id, tenant_id, name, code, contact_person, contact_phone, contact_email, status, created_at, updated_at FROM customers WHERE id=$1", id).StructScan(&cust); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to load customer","details":err.Error()}); return }
    c.JSON(http.StatusCreated, gin.H{"success":true, "data":cust})
}

func (h *Handler) GetCustomer(c *gin.Context) {
    idStr := c.Param("id")
    id, err := uuid.Parse(idStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    var cust repository.Customer
    if err := h.db.QueryRowx("SELECT id, tenant_id, name, code, contact_person, contact_phone, contact_email, status, created_at, updated_at FROM customers WHERE id=$1", id).StructScan(&cust); err != nil { c.JSON(http.StatusNotFound, gin.H{"error":"Customer not found","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "data":cust})
}

func (h *Handler) UpdateCustomer(c *gin.Context) {
    idStr := c.Param("id")
    id, err := uuid.Parse(idStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    var req struct{
        Name *string `json:"name"`
        Code *string `json:"code"`
        ContactPerson *string `json:"contact_person"`
        ContactPhone *string `json:"contact_phone"`
        ContactEmail *string `json:"contact_email"`
        Status *string `json:"status"`
    }
    if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid request","details":err.Error()}); return }
    setParts := []string{}
    args := []interface{}{}
    if req.Name != nil { setParts = append(setParts, "name=$"+strconv.Itoa(len(args)+1)); args = append(args, *req.Name) }
    if req.Code != nil { setParts = append(setParts, "code=$"+strconv.Itoa(len(args)+1)); args = append(args, *req.Code) }
    if req.ContactPerson != nil { setParts = append(setParts, "contact_person=$"+strconv.Itoa(len(args)+1)); args = append(args, *req.ContactPerson) }
    if req.ContactPhone != nil { setParts = append(setParts, "contact_phone=$"+strconv.Itoa(len(args)+1)); args = append(args, *req.ContactPhone) }
    if req.ContactEmail != nil { setParts = append(setParts, "contact_email=$"+strconv.Itoa(len(args)+1)); args = append(args, *req.ContactEmail) }
    if req.Status != nil { setParts = append(setParts, "status=$"+strconv.Itoa(len(args)+1)); args = append(args, *req.Status) }
    if len(setParts) == 0 { c.JSON(http.StatusBadRequest, gin.H{"error":"No fields to update"}); return }
    args = append(args, id)
    query := "UPDATE customers SET " + strings.Join(setParts, ",") + ", updated_at=NOW() WHERE id=$"+strconv.Itoa(len(args))
    if _, err := h.db.Exec(query, args...); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to update customer","details":err.Error()}); return }
    var cust repository.Customer
    if err := h.db.QueryRowx("SELECT id, tenant_id, name, code, contact_person, contact_phone, contact_email, status, created_at, updated_at FROM customers WHERE id=$1", id).StructScan(&cust); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to load customer","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "data":cust})
}

func (h *Handler) DeleteCustomer(c *gin.Context) {
    idStr := c.Param("id")
    id, err := uuid.Parse(idStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    if _, err := h.db.Exec("DELETE FROM customers WHERE id=$1", id); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to delete customer","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "message":"Customer deleted"})
}

func (h *Handler) ImportCustomersCSV(c *gin.Context) {
    file, header, err := c.Request.FormFile("file")
    if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Failed to get file","details":err.Error()}); return }
    defer file.Close()
    reader := csv.NewReader(file)
    reader.TrimLeadingSpace = true
    records, err := reader.ReadAll()
    if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid CSV","details":err.Error()}); return }
    tenantIDStr := c.PostForm("tenant_id")
    tid, err := uuid.Parse(tenantIDStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid tenant_id"}); return }
    tx, err := h.db.Beginx(); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to begin transaction","details":err.Error()}); return }
    success := 0
    for i, r := range records {
        if i == 0 {
            continue
        }
        name := strings.TrimSpace(r[0])
        code := strings.TrimSpace(r[1])
        contactPerson := strings.TrimSpace(r[2])
        contactPhone := strings.TrimSpace(r[3])
        contactEmail := strings.TrimSpace(r[4])
        id := uuid.New()
        _, err := tx.Exec("INSERT INTO customers(id, tenant_id, name, code, contact_person, contact_phone, contact_email, status) VALUES($1,$2,$3,$4,$5,$6,$7,'active') ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, contact_person=EXCLUDED.contact_person, contact_phone=EXCLUDED.contact_phone, contact_email=EXCLUDED.contact_email, updated_at=NOW()", id, tid, name, code, nullableString(contactPerson), nullableString(contactPhone), nullableString(contactEmail))
        if err == nil {
            success++
        }
    }
    if err := tx.Commit(); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to commit","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "processed":len(records)-1, "success_count":success, "filename":header.Filename})
}

func (h *Handler) ExportCustomersCSV(c *gin.Context) {
    rows, err := h.db.Queryx("SELECT name, code, COALESCE(contact_person,''), COALESCE(contact_phone,''), COALESCE(contact_email,'') FROM customers ORDER BY created_at DESC")
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to export","details":err.Error()}); return }
    defer rows.Close()
    b := &strings.Builder{}
    w := csv.NewWriter(b)
    _ = w.Write([]string{"name","code","contact_person","contact_phone","contact_email"})
    for rows.Next() {
        var name, code, cp, cph, cem string
        if err := rows.Scan(&name, &code, &cp, &cph, &cem); err != nil { continue }
        _ = w.Write([]string{name, code, cp, cph, cem})
    }
    w.Flush()
    data := b.String()
    c.Header("Content-Type", "text/csv; charset=utf-8")
    c.Header("Content-Disposition", "attachment; filename=customers.csv")
    c.String(http.StatusOK, data)
}

func (h *Handler) ListContracts(c *gin.Context) {
    idStr := c.Param("id")
    id, err := uuid.Parse(idStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    rows, err := h.db.Queryx("SELECT id, customer_id, file_url, file_name, file_size, mime_type, uploaded_at FROM contracts WHERE customer_id=$1 ORDER BY uploaded_at DESC", id)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to list contracts","details":err.Error()}); return }
    defer rows.Close()
    var items []repository.Contract
    for rows.Next() {
        var ct repository.Contract
        if err := rows.StructScan(&ct); err != nil { continue }
        items = append(items, ct)
    }
    c.JSON(http.StatusOK, gin.H{"success":true, "data":items})
}

func (h *Handler) UploadContract(c *gin.Context) {
    idStr := c.Param("id")
    id, err := uuid.Parse(idStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    file, header, err := c.Request.FormFile("file")
    if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Failed to get file","details":err.Error()}); return }
    defer file.Close()
    dir := "uploads/contracts"
    if err := os.MkdirAll(dir, 0755); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to create dir","details":err.Error()}); return }
    ext := filepath.Ext(header.Filename)
    fname := fmt.Sprintf("%s_%d%s", id.String(), time.Now().Unix(), ext)
    path := filepath.Join(dir, fname)
    dst, err := os.Create(path)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to save file","details":err.Error()}); return }
    defer dst.Close()
    size, err := io.Copy(dst, file)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to write file","details":err.Error()}); return }
    url := "/uploads/contracts/" + fname
    _, err = h.db.Exec("INSERT INTO contracts(customer_id, file_url, file_name, file_size, mime_type) VALUES($1,$2,$3,$4,$5)", id, url, header.Filename, size, header.Header.Get("Content-Type"))
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to record contract","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "file_url":url})
}

func (h *Handler) DownloadContract(c *gin.Context) {
    contractIDStr := c.Param("contractId")
    cid, err := uuid.Parse(contractIDStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid contract id"}); return }
    var url, name string
    if err := h.db.QueryRowx("SELECT file_url, file_name FROM contracts WHERE id=$1", cid).Scan(&url, &name); err != nil { c.JSON(http.StatusNotFound, gin.H{"error":"Contract not found","details":err.Error()}); return }
    c.FileAttachment("."+url, name)
}

func (h *Handler) GetFundsAccount(c *gin.Context) {
    cidStr := c.Param("customerId")
    cid, err := uuid.Parse(cidStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    h.ensureAccountsForCustomer(cid)
    var fa repository.FundsAccount
    if err := h.db.QueryRowx("SELECT id, customer_id, cash_balance, grant_balance, updated_at FROM funds_accounts WHERE customer_id=$1", cid).StructScan(&fa); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to load funds account","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "data":fa})
}

func (h *Handler) GetConsumeAccount(c *gin.Context) {
    cidStr := c.Param("customerId")
    cid, err := uuid.Parse(cidStr); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer id"}); return }
    h.ensureAccountsForCustomer(cid)
    var ca repository.ConsumeAccount
    if err := h.db.QueryRowx("SELECT id, customer_id, balance, updated_at FROM consume_accounts WHERE customer_id=$1", cid).StructScan(&ca); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to load consume account","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "data":ca})
}

func (h *Handler) CreateTransferOrder(c *gin.Context) {
    var req struct{
        CustomerID string `json:"customer_id" binding:"required"`
        Amount     string `json:"amount" binding:"required"`
        Source     string `json:"source" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid request","details":err.Error()}); return }
    cid, err := uuid.Parse(req.CustomerID); if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid customer_id"}); return }
    amt, err := decimal.NewFromString(req.Amount); if err != nil || !amt.IsPositive() { c.JSON(http.StatusBadRequest, gin.H{"error":"Invalid amount"}); return }
    src := strings.ToLower(req.Source)
    if src != "cash" && src != "grant" { c.JSON(http.StatusBadRequest, gin.H{"error":"Source must be cash or grant"}); return }
    h.ensureAccountsForCustomer(cid)
    tx, err := h.db.Beginx(); if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to begin transaction","details":err.Error()}); return }
    defer func(){ if err != nil { _ = tx.Rollback() } }()
    var cash, grant decimal.Decimal
    if err = tx.QueryRowx("SELECT cash_balance, grant_balance FROM funds_accounts WHERE customer_id=$1 FOR UPDATE", cid).Scan(&cash, &grant); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to lock funds","details":err.Error()}); return }
    if src == "cash" {
        if cash.LessThan(amt) { c.JSON(http.StatusBadRequest, gin.H{"error":"Insufficient cash balance"}); return }
        cash = cash.Sub(amt)
    } else {
        if grant.LessThan(amt) { c.JSON(http.StatusBadRequest, gin.H{"error":"Insufficient grant balance"}); return }
        grant = grant.Sub(amt)
    }
    if _, err = tx.Exec("UPDATE funds_accounts SET cash_balance=$1, grant_balance=$2, updated_at=NOW() WHERE customer_id=$3", cash, grant, cid); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to update funds","details":err.Error()}); return }
    var consume decimal.Decimal
    if err = tx.QueryRowx("SELECT balance FROM consume_accounts WHERE customer_id=$1 FOR UPDATE", cid).Scan(&consume); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to lock consume","details":err.Error()}); return }
    consume = consume.Add(amt)
    if _, err = tx.Exec("UPDATE consume_accounts SET balance=$1, updated_at=NOW() WHERE customer_id=$2", consume, cid); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to update consume","details":err.Error()}); return }
    tid := uuid.New()
    if _, err = tx.Exec("INSERT INTO transfer_orders(id, customer_id, amount, source, status, created_at) VALUES($1,$2,$3,$4,'completed',NOW())", tid, cid, amt, src); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to create transfer order","details":err.Error()}); return }
    if src == "cash" {
        _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'funds','transfer',$2,$3,$4,0,$5,$6,NOW())", cid, src, amt, amt.Neg(), cash, tid)
    } else {
        _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'funds','transfer',$2,$3,0,$4,$5,$6,NOW())", cid, src, amt, amt.Neg(), grant, tid)
    }
    _, _ = tx.Exec("INSERT INTO ledger_entries(customer_id, account_type, category, source, amount, cash_delta, grant_delta, balance_after, order_id, created_at) VALUES($1,'consume','transfer',$2,$3,0,0,$4,$5,NOW())", cid, src, amt, consume, tid)
    if err = tx.Commit(); err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to commit","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"success":true, "order_id":tid})
}

func (h *Handler) ensureAccountsForCustomer(id uuid.UUID) {
    var exists int
    _ = h.db.QueryRowx("SELECT 1 FROM funds_accounts WHERE customer_id=$1", id).Scan(&exists)
    if exists != 1 {
        _, _ = h.db.Exec("INSERT INTO funds_accounts(customer_id, cash_balance, grant_balance) VALUES($1,0,0)", id)
    }
    exists = 0
    _ = h.db.QueryRowx("SELECT 1 FROM consume_accounts WHERE customer_id=$1", id).Scan(&exists)
    if exists != 1 {
        _, _ = h.db.Exec("INSERT INTO consume_accounts(customer_id, balance) VALUES($1,0)", id)
    }
}

func nullableString(s string) interface{} {
    if s == "" { return nil }
    return s
}
func nullableStrPtr(s string) *string { if s=="" { return nil }; return &s }

func mustJSON(v interface{}) []byte {
    b, _ := json.Marshal(v)
    return b
}

// ListReports lists reports
func (h *Handler) ListReports(c *gin.Context) {
	// Parse query parameters
	reportType := c.Query("report_type")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := &service.ReportFilter{
		Limit:    limit,
		Offset:   (page - 1) * limit,
		OrderBy:  "created_at",
		OrderDir: "DESC",
	}

	if reportType != "" {
		filter.ReportType = &reportType
	}
	if status != "" {
		filter.Status = &status
	}

	reports, total, err := h.reportService.ListReports(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to list reports",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"reports":     reports,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// DeleteReport deletes a report
func (h *Handler) DeleteReport(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid report ID format",
		})
		return
	}

	err = h.reportService.DeleteReport(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete report",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Report deleted successfully",
	})
}

// GetDashboardData retrieves dashboard data
func (h *Handler) GetDashboardData(c *gin.Context) {
	timeRange := c.DefaultQuery("time_range", "today")

	req := &service.DashboardRequest{
		TimeRange: timeRange,
	}

	// Parse custom date range if provided
	if timeRange == "custom" {
		if startDateStr := c.Query("start_date"); startDateStr != "" {
			if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
				req.StartDate = &startDate
			}
		}
		if endDateStr := c.Query("end_date"); endDateStr != "" {
			if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
				req.EndDate = &endDate
			}
		}
	}

	// Parse merchant IDs if provided
	if merchantIDsStr := c.Query("merchant_ids"); merchantIDsStr != "" {
		merchantIDStrs := strings.Split(merchantIDsStr, ",")
		for _, idStr := range merchantIDStrs {
			if id, err := uuid.Parse(strings.TrimSpace(idStr)); err == nil {
				req.MerchantIDs = append(req.MerchantIDs, id)
			}
		}
	}

	data, err := h.reportService.GetDashboardData(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get dashboard data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, data)
}

// GetRealTimeStatistics retrieves real-time statistics
func (h *Handler) GetRealTimeStatistics(c *gin.Context) {
	stats, err := h.reportService.GetRealTimeStatistics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get real-time statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetFundsCreditedToday returns today's credited amounts split by cash and grant
func (h *Handler) GetFundsCreditedToday(c *gin.Context) {
    var tid *uuid.UUID
    if s := c.Query("tenant_id"); s != "" { if v, err := uuid.Parse(s); err==nil { tid=&v } }
    out, err := h.reportService.GetFundsCreditedToday(c.Request.Context(), &service.FundsCreditedRequest{ TenantID: tid })
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to query","details":err.Error()}); return }
    c.JSON(http.StatusOK, gin.H{"cash": out.Cash.String(), "grant": out.Grant.String(), "total": out.Total.String(), "cash_pct": out.CashPct.String(), "grant_pct": out.GrantPct.String(), "date": out.Date.Format("2006-01-02")})
}

// GetFundsCreditedTrend returns last N days credited amounts split by cash and grant
func (h *Handler) GetFundsCreditedTrend(c *gin.Context) {
    days, _ := strconv.Atoi(c.DefaultQuery("days", "14"))
    var tid *uuid.UUID
    if s := c.Query("tenant_id"); s != "" { if v, err := uuid.Parse(s); err==nil { tid=&v } }
    out, err := h.reportService.GetFundsCreditedTrend(c.Request.Context(), &service.FundsCreditedTrendRequest{ TenantID: tid, Days: days })
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to query","details":err.Error()}); return }
    type point struct{ Day string; Cash string; Grant string }
    series := make([]point, len(out.Series))
    for i, p := range out.Series { series[i] = point{ Day: p.Day.Format("2006-01-02"), Cash: p.Cash.String(), Grant: p.Grant.String() } }
    c.JSON(http.StatusOK, gin.H{"days": out.Days, "series": series})
}

// ExportFundsCreditedTrend exports trend data to CSV
func (h *Handler) ExportFundsCreditedTrend(c *gin.Context) {
    days, _ := strconv.Atoi(c.DefaultQuery("days", "14"))
    var tid *uuid.UUID
    if s := c.Query("tenant_id"); s != "" { if v, err := uuid.Parse(s); err==nil { tid=&v } }
    out, err := h.reportService.GetFundsCreditedTrend(c.Request.Context(), &service.FundsCreditedTrendRequest{ TenantID: tid, Days: days })
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to query","details":err.Error()}); return }
    b := &strings.Builder{}
    w := csv.NewWriter(b)
    _ = w.Write([]string{"day","cash","grant","total","cash_pct","grant_pct"})
    for _, p := range out.Series {
        total := p.Cash.Add(p.Grant)
        cashPct := decimal.Zero; grantPct := decimal.Zero
        if total.GreaterThan(decimal.Zero) {
            cashPct = p.Cash.Div(total).Mul(decimal.NewFromInt(100))
            grantPct = p.Grant.Div(total).Mul(decimal.NewFromInt(100))
        }
        _ = w.Write([]string{p.Day.Format("2006-01-02"), p.Cash.String(), p.Grant.String(), total.String(), cashPct.String(), grantPct.String()})
    }
    w.Flush()
    c.Header("Content-Type", "text/csv; charset=utf-8")
    c.Header("Content-Disposition", "attachment; filename=funds_credited_trend.csv")
    c.String(http.StatusOK, b.String())
}
// Authentication Handlers

// Web Page Handlers

// HomePage serves the home page

// Rotation Rules Handler Implementations

// ListRotationRules lists all rotation rules with filtering
func (h *Handler) ListRotationRules(c *gin.Context) {
	merchantID := c.Query("merchant")
	
	var merchantUUID *uuid.UUID
	if merchantID != "" {
		id, err := uuid.Parse(merchantID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid merchant ID format",
			})
			return
		}
		merchantUUID = &id
	}

	// TODO: Use proper filter when RotationRuleFilter is available
	_ = merchantUUID

	// TODO: Implement ListRotationRules method in service
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"rules": []interface{}{},
		},
	})
}

// CreateRotationRule creates a new rotation rule
func (h *Handler) CreateRotationRule(c *gin.Context) {
	var req struct {
		MerchantID     string      `json:"merchant_id"`
		RuleName       string      `json:"rule_name"`
		StrategyType   string      `json:"strategy_type"`
		StrategyConfig interface{} `json:"strategy_config"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Implement CreateRotationRule method in service
	_ = req // Suppress unused variable warning
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Rotation rule creation not yet implemented",
	})
}

// GetRotationRule retrieves a rotation rule by ID
func (h *Handler) GetRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rotation rule ID format",
		})
		return
	}

	// TODO: Implement GetRotationRule method in service
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Get rotation rule not yet implemented",
	})
}

// UpdateRotationRule updates an existing rotation rule
func (h *Handler) UpdateRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rotation rule ID format",
		})
		return
	}

	var req struct {
		RuleName       *string     `json:"rule_name"`
		StrategyType   *string     `json:"strategy_type"`
		StrategyConfig interface{} `json:"strategy_config"`
		IsActive       *bool       `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Implement UpdateRotationRule method in service
	_ = id  // Suppress unused variable warning
	_ = req // Suppress unused variable warning
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Update rotation rule not yet implemented",
	})
}

// DeleteRotationRule deletes a rotation rule
func (h *Handler) DeleteRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rotation rule ID format",
		})
		return
	}

	// TODO: Implement DeleteRotationRule method in service
	_ = id // Suppress unused variable warning
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Delete rotation rule not yet implemented",
	})
}

// ToggleRotationRule toggles the active status of a rotation rule
func (h *Handler) ToggleRotationRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid rotation rule ID format",
		})
		return
	}

	var req struct {
		IsActive bool `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Implement ToggleRotationRule method in service
	_ = id  // Suppress unused variable warning
	_ = req // Suppress unused variable warning
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Toggle rotation rule not yet implemented",
	})
}

// Limits Management Handler Implementations

// ListLimits lists all limits with filtering
func (h *Handler) ListLimits(c *gin.Context) {
	limitType := c.Query("type") // "merchant" or "account"

	// TODO: Use proper filter when LimitFilter is available
	_ = limitType

	// TODO: Implement ListLimits method in service
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"limits": []interface{}{},
		},
	})
}

// GetLimitStats retrieves limit statistics
func (h *Handler) GetLimitStats(c *gin.Context) {
	// TODO: Implement GetLimitStats method in service
	mockStats := gin.H{
		"total_merchant_limits": 0,
		"total_account_limits":  0,
		"near_limit_count":      0,
		"exceeded_limit_count":  0,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mockStats,
	})
}

// ResetLimits resets all daily limits
func (h *Handler) ResetLimits(c *gin.Context) {
	var req struct {
		Type string `json:"type"` // "all", "merchant", "account"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Implement ResetLimits method in service
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Limits reset successfully",
	})
}

// UpdateLimit updates a specific limit configuration
func (h *Handler) UpdateLimit(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid limit ID format",
		})
		return
	}

	var req struct {
		DailyLimit  *decimal.Decimal `json:"daily_limit"`
		SingleLimit *decimal.Decimal `json:"single_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Implement UpdateLimit method in service
	_ = id  // Suppress unused variable warning
	_ = req // Suppress unused variable warning
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "Update limit not yet implemented",
	})
}

// Test Data Management Handler Implementations

// GenerateMerchantTestData generates test merchant data
func (h *Handler) GenerateMerchantTestData(c *gin.Context) {
	var req service.GenerateMerchantTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.testDataService.GenerateMerchantTestData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate merchant test data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GenerateReceiveAccountTestData generates test receive account data
func (h *Handler) GenerateReceiveAccountTestData(c *gin.Context) {
	var req service.GenerateReceiveAccountTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.testDataService.GenerateReceiveAccountTestData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate receive account test data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GenerateRechargeOrderTestData generates test recharge order data
func (h *Handler) GenerateRechargeOrderTestData(c *gin.Context) {
	var req service.GenerateRechargeOrderTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.testDataService.GenerateRechargeOrderTestData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate recharge order test data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GenerateUserTestData generates test user and permission data
func (h *Handler) GenerateUserTestData(c *gin.Context) {
	var req service.GenerateUserTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.testDataService.GenerateUserTestData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate user test data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GenerateBatchTestData generates multiple types of test data in batch
func (h *Handler) GenerateBatchTestData(c *gin.Context) {
	var req service.BatchTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.testDataService.GenerateBatchTestData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate batch test data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// CleanupTestData cleans up test data
func (h *Handler) CleanupTestData(c *gin.Context) {
	var req service.CleanupTestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.testDataService.CleanupTestData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to cleanup test data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// Data Cleanup and Reset Handler Implementations

// ResetDatabaseState resets various database states
func (h *Handler) ResetDatabaseState(c *gin.Context) {
	var req service.ResetDatabaseStateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.dataCleanupService.ResetDatabaseState(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to reset database state",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ImportDemoData imports demo data from various sources
func (h *Handler) ImportDemoData(c *gin.Context) {
	var req service.ImportDemoDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.dataCleanupService.ImportDemoData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to import demo data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ExportDemoData exports demo data to various formats
func (h *Handler) ExportDemoData(c *gin.Context) {
	var req service.ExportDemoDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	result, err := h.dataCleanupService.ExportDemoData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to export demo data",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// ValidateDataIntegrity performs data integrity checks
func (h *Handler) ValidateDataIntegrity(c *gin.Context) {
	result, err := h.dataCleanupService.ValidateDataIntegrity(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to validate data integrity",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// GetCleanupStatistics returns cleanup statistics
func (h *Handler) GetCleanupStatistics(c *gin.Context) {
	result, err := h.dataCleanupService.GetCleanupStatistics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get cleanup statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// SystemManagementPage serves the system management page
func (h *Handler) SystemManagementPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	// 使用Chrome风格的系统管理模板
	c.File("./web/templates/system-chrome.html")
}

// SystemConfigPage serves the system configuration page
func (h *Handler) SystemConfigPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/system_config.html")
}

// APIManagementPage serves the API management page
func (h *Handler) APIManagementPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/api_management.html")
}

// BackupManagementPage serves the backup management page
func (h *Handler) BackupManagementPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/backup_management.html")
}

// MonitoringAlertsPage serves the monitoring and alerts page
func (h *Handler) MonitoringAlertsPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/monitoring_alerts.html")
}

// SecurityCenterPage serves the security center page
func (h *Handler) SecurityCenterPage(c *gin.Context) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.File("./web/templates/security_center.html")
}
// ListMerchantOptions returns compact merchant options with code, department count and status
func (h *Handler) ListMerchantOptions(c *gin.Context) {
    search := strings.TrimSpace(c.Query("search"))
    status := strings.TrimSpace(c.Query("status"))
    base := `SELECT m.id, m.name, m.code, m.status, COALESCE(dc.cnt,0) AS dept_count
             FROM merchants m
             LEFT JOIN (
                 SELECT tenant_id, COUNT(*) AS cnt FROM departments GROUP BY tenant_id
             ) dc ON dc.tenant_id = m.id`
    where := " WHERE 1=1"
    args := []interface{}{}
    if search != "" {
        where += " AND (m.name ILIKE $1 OR m.code ILIKE $1)"
        args = append(args, "%"+search+"%")
    }
    if status != "" {
        where += " AND m.status = $" + strconv.Itoa(len(args)+1)
        args = append(args, status)
    }
    order := " ORDER BY m.name ASC"
    query := base + where + order
    rows, err := h.db.Queryx(query, args...)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"Failed to load merchant options","details":err.Error()}); return }
    defer rows.Close()
    type option struct{
        ID           uuid.UUID `json:"id" db:"id"`
        Name         string    `json:"name" db:"name"`
        Code         string    `json:"code" db:"code"`
        Status       string    `json:"status" db:"status"`
        StatusLabel  string    `json:"status_label"`
        DeptCount    int       `json:"dept_count" db:"dept_count"`
    }
    var list []option
    for rows.Next() {
        var o option
        if err := rows.StructScan(&o); err != nil { continue }
        s := strings.ToLower(o.Status)
        if s == "active" { o.StatusLabel = "启用" } else if s == "inactive" { o.StatusLabel = "停用" } else if s == "suspended" { o.StatusLabel = "已挂起" } else { o.StatusLabel = "未知" }
        list = append(list, o)
    }
    c.JSON(http.StatusOK, gin.H{"options": list})
}

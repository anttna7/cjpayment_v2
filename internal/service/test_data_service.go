package service

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// TestDataService defines the test data generation service interface
type TestDataService interface {
	// Merchant test data generation
	GenerateMerchantTestData(ctx context.Context, req *GenerateMerchantTestDataRequest) (*TestDataGenerationResult, error)
	
	// Receive account test data generation
	GenerateReceiveAccountTestData(ctx context.Context, req *GenerateReceiveAccountTestDataRequest) (*TestDataGenerationResult, error)
	
	// Recharge order test data generation
	GenerateRechargeOrderTestData(ctx context.Context, req *GenerateRechargeOrderTestDataRequest) (*TestDataGenerationResult, error)
	
	// User and permission test data generation
	GenerateUserTestData(ctx context.Context, req *GenerateUserTestDataRequest) (*TestDataGenerationResult, error)
	
	// Batch test data generation
	GenerateBatchTestData(ctx context.Context, req *BatchTestDataRequest) (*BatchTestDataResult, error)
	
	// Test data cleanup
	CleanupTestData(ctx context.Context, req *CleanupTestDataRequest) (*CleanupResult, error)
}

// Request types for test data generation
type GenerateMerchantTestDataRequest struct {
	Count       int    `json:"count" binding:"required,min=1,max=100"`
	NamePrefix  string `json:"name_prefix"`
	CodePrefix  string `json:"code_prefix"`
	WithLimits  bool   `json:"with_limits"`
	WithAccounts bool  `json:"with_accounts"`
}

type GenerateReceiveAccountTestDataRequest struct {
	Count         int      `json:"count" binding:"required,min=1,max=100"`
	AccountTypes  []string `json:"account_types"`
	PaymentTypes  []string `json:"payment_types"`
	WithLimits    bool     `json:"with_limits"`
	MerchantIDs   []uuid.UUID `json:"merchant_ids"`
}

type GenerateRechargeOrderTestDataRequest struct {
	Count         int         `json:"count" binding:"required,min=1,max=500"`
	MerchantIDs   []uuid.UUID `json:"merchant_ids"`
	AccountIDs    []uuid.UUID `json:"account_ids"`
	PaymentTypes  []string    `json:"payment_types"`
	Statuses      []string    `json:"statuses"`
	DateRange     *DateRange  `json:"date_range"`
	AmountRange   *AmountRange `json:"amount_range"`
}

type GenerateUserTestDataRequest struct {
	Count        int      `json:"count" binding:"required,min=1,max=50"`
	UsernamePrefix string `json:"username_prefix"`
	Roles        []string `json:"roles"`
	WithPermissions bool  `json:"with_permissions"`
}

type BatchTestDataRequest struct {
	Merchants      *GenerateMerchantTestDataRequest      `json:"merchants"`
	Accounts       *GenerateReceiveAccountTestDataRequest `json:"accounts"`
	Orders         *GenerateRechargeOrderTestDataRequest  `json:"orders"`
	Users          *GenerateUserTestDataRequest          `json:"users"`
	LinkAccounts   bool                                  `json:"link_accounts"`
}

type CleanupTestDataRequest struct {
	DataTypes    []string `json:"data_types" binding:"required"` // merchants, accounts, orders, users
	TestPrefix   string   `json:"test_prefix"`
	CreatedAfter *time.Time `json:"created_after"`
	DryRun       bool     `json:"dry_run"`
}

// Response types
type TestDataGenerationResult struct {
	DataType     string      `json:"data_type"`
	Count        int         `json:"count"`
	GeneratedIDs []uuid.UUID `json:"generated_ids"`
	Duration     time.Duration `json:"duration"`
	Message      string      `json:"message"`
}

type BatchTestDataResult struct {
	Results      []*TestDataGenerationResult `json:"results"`
	TotalCount   int                         `json:"total_count"`
	Duration     time.Duration               `json:"duration"`
	Success      bool                        `json:"success"`
	ErrorMessage string                      `json:"error_message,omitempty"`
}



// Helper types
type DateRange struct {
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

type AmountRange struct {
	MinAmount decimal.Decimal `json:"min_amount"`
	MaxAmount decimal.Decimal `json:"max_amount"`
}

// testDataService implements TestDataService
type testDataService struct {
	merchantRepo      repository.MerchantRepository
	accountRepo       repository.ReceiveAccountRepository
	rechargeRepo      repository.RechargeOrderRepository
	userRepo          repository.UserRepository
	roleRepo          repository.RoleRepository
	permissionRepo    repository.PermissionRepository
	merchantAccountRepo repository.MerchantReceiveAccountRepository
}

// NewTestDataService creates a new test data service
func NewTestDataService(
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
	rechargeRepo repository.RechargeOrderRepository,
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	permissionRepo repository.PermissionRepository,
	merchantAccountRepo repository.MerchantReceiveAccountRepository,
) TestDataService {
	return &testDataService{
		merchantRepo:        merchantRepo,
		accountRepo:         accountRepo,
		rechargeRepo:        rechargeRepo,
		userRepo:            userRepo,
		roleRepo:            roleRepo,
		permissionRepo:      permissionRepo,
		merchantAccountRepo: merchantAccountRepo,
	}
}

// GenerateMerchantTestData generates test merchant data
func (s *testDataService) GenerateMerchantTestData(ctx context.Context, req *GenerateMerchantTestDataRequest) (*TestDataGenerationResult, error) {
	startTime := time.Now()
	var generatedIDs []uuid.UUID
	
	namePrefix := req.NamePrefix
	if namePrefix == "" {
		namePrefix = "TestMerchant"
	}
	
	codePrefix := req.CodePrefix
	if codePrefix == "" {
		codePrefix = "TM"
	}
	
	for i := 0; i < req.Count; i++ {
		merchant := &repository.Merchant{
			ID:            uuid.New(),
			Name:          fmt.Sprintf("%s_%d_%d", namePrefix, i+1, time.Now().Unix()),
			Code:          fmt.Sprintf("%s_%d_%d", codePrefix, i+1, time.Now().Unix()),
			ContactPerson: testStringPtr(fmt.Sprintf("Contact Person %d", i+1)),
			ContactPhone:  testStringPtr(fmt.Sprintf("1380000%04d", i+1)),
			ContactEmail:  testStringPtr(fmt.Sprintf("test%d@example.com", i+1)),
			Status:        "active",
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		
		if req.WithLimits {
			merchant.DailyLimit = decimal.NewFromFloat(float64(rand.Intn(50000) + 10000))
			merchant.SingleLimit = decimal.NewFromFloat(float64(rand.Intn(5000) + 1000))
		} else {
			merchant.DailyLimit = decimal.Zero
			merchant.SingleLimit = decimal.Zero
		}
		
		err := s.merchantRepo.Create(ctx, merchant)
		if err != nil {
			return nil, fmt.Errorf("failed to create merchant %d: %w", i+1, err)
		}
		
		generatedIDs = append(generatedIDs, merchant.ID)
	}
	
	duration := time.Since(startTime)
	return &TestDataGenerationResult{
		DataType:     "merchants",
		Count:        req.Count,
		GeneratedIDs: generatedIDs,
		Duration:     duration,
		Message:      fmt.Sprintf("Successfully generated %d test merchants", req.Count),
	}, nil
}

// GenerateReceiveAccountTestData generates test receive account data
func (s *testDataService) GenerateReceiveAccountTestData(ctx context.Context, req *GenerateReceiveAccountTestDataRequest) (*TestDataGenerationResult, error) {
	startTime := time.Now()
	var generatedIDs []uuid.UUID
	
	accountTypes := req.AccountTypes
	if len(accountTypes) == 0 {
		accountTypes = []string{"alipay", "wechat", "bank", "other"}
	}
	
	paymentTypes := req.PaymentTypes
	if len(paymentTypes) == 0 {
		paymentTypes = []string{"public", "private"}
	}
	
	for i := 0; i < req.Count; i++ {
		accountType := accountTypes[rand.Intn(len(accountTypes))]
		paymentType := paymentTypes[rand.Intn(len(paymentTypes))]
		
		account := &repository.ReceiveAccount{
			ID:            uuid.New(),
			AccountName:   fmt.Sprintf("TestAccount_%s_%d_%d", accountType, i+1, time.Now().Unix()),
			AccountNumber: generateAccountNumber(accountType, i+1),
			AccountType:   accountType,
			AccountHolder: fmt.Sprintf("Test Holder %d", i+1),
			PaymentType:   paymentType,
			Status:        "active",
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}
		
		if accountType == "bank" {
			account.BankName = testStringPtr(fmt.Sprintf("Test Bank %d", rand.Intn(10)+1))
			account.BankBranch = testStringPtr(fmt.Sprintf("Test Branch %d", rand.Intn(100)+1))
		}
		
		if req.WithLimits {
			account.DailyLimit = decimal.NewFromFloat(float64(rand.Intn(30000) + 5000))
			account.SingleLimit = decimal.NewFromFloat(float64(rand.Intn(3000) + 500))
		} else {
			account.DailyLimit = decimal.Zero
			account.SingleLimit = decimal.Zero
		}
		
		err := s.accountRepo.Create(ctx, account)
		if err != nil {
			return nil, fmt.Errorf("failed to create account %d: %w", i+1, err)
		}
		
		generatedIDs = append(generatedIDs, account.ID)
		
		// Link to merchants if specified
		if len(req.MerchantIDs) > 0 {
			merchantID := req.MerchantIDs[rand.Intn(len(req.MerchantIDs))]
			merchantAccount := &repository.MerchantReceiveAccount{
				ID:               uuid.New(),
				MerchantID:       merchantID,
				ReceiveAccountID: account.ID,
				Weight:           rand.Intn(10) + 1,
				IsActive:         true,
				CreatedAt:        time.Now(),
			}
			
			err = s.merchantAccountRepo.Create(ctx, merchantAccount)
			if err != nil {
				// Log error but don't fail the entire operation
				fmt.Printf("Warning: failed to link account %s to merchant %s: %v\n", account.ID, merchantID, err)
			}
		}
	}
	
	duration := time.Since(startTime)
	return &TestDataGenerationResult{
		DataType:     "accounts",
		Count:        req.Count,
		GeneratedIDs: generatedIDs,
		Duration:     duration,
		Message:      fmt.Sprintf("Successfully generated %d test receive accounts", req.Count),
	}, nil
}

// GenerateRechargeOrderTestData generates test recharge order data
func (s *testDataService) GenerateRechargeOrderTestData(ctx context.Context, req *GenerateRechargeOrderTestDataRequest) (*TestDataGenerationResult, error) {
	startTime := time.Now()
	var generatedIDs []uuid.UUID
	
	// Get merchants and accounts if not provided
	merchantIDs := req.MerchantIDs
	if len(merchantIDs) == 0 {
		merchants, err := s.merchantRepo.List(ctx, &repository.MerchantFilter{Limit: 100})
		if err != nil {
			return nil, fmt.Errorf("failed to get merchants: %w", err)
		}
		for _, merchant := range merchants {
			merchantIDs = append(merchantIDs, merchant.ID)
		}
	}
	
	accountIDs := req.AccountIDs
	if len(accountIDs) == 0 {
		accounts, err := s.accountRepo.List(ctx, &repository.ReceiveAccountFilter{Limit: 100})
		if err != nil {
			return nil, fmt.Errorf("failed to get accounts: %w", err)
		}
		for _, account := range accounts {
			accountIDs = append(accountIDs, account.ID)
		}
	}
	
	if len(merchantIDs) == 0 || len(accountIDs) == 0 {
		return nil, fmt.Errorf("no merchants or accounts available for generating orders")
	}
	
	paymentTypes := req.PaymentTypes
	if len(paymentTypes) == 0 {
		paymentTypes = []string{"public", "private"}
	}
	
	statuses := req.Statuses
	if len(statuses) == 0 {
		statuses = []string{"pending", "paid", "confirmed", "cancelled", "refunded"}
	}
	
	// Set default date range
	dateRange := req.DateRange
	if dateRange == nil {
		dateRange = &DateRange{
			StartDate: time.Now().AddDate(0, 0, -30),
			EndDate:   time.Now(),
		}
	}
	
	// Set default amount range
	amountRange := req.AmountRange
	if amountRange == nil {
		amountRange = &AmountRange{
			MinAmount: decimal.NewFromFloat(100),
			MaxAmount: decimal.NewFromFloat(10000),
		}
	}
	
	for i := 0; i < req.Count; i++ {
		merchantID := merchantIDs[rand.Intn(len(merchantIDs))]
		accountID := accountIDs[rand.Intn(len(accountIDs))]
		paymentType := paymentTypes[rand.Intn(len(paymentTypes))]
		status := statuses[rand.Intn(len(statuses))]
		
		// Generate random amount within range
		minFloat, _ := amountRange.MinAmount.Float64()
		maxFloat, _ := amountRange.MaxAmount.Float64()
		amount := decimal.NewFromFloat(minFloat + rand.Float64()*(maxFloat-minFloat))
		
		// Generate random date within range
		timeDiff := dateRange.EndDate.Sub(dateRange.StartDate)
		randomDuration := time.Duration(rand.Int63n(int64(timeDiff)))
		createdAt := dateRange.StartDate.Add(randomDuration)
		
		order := &repository.RechargeOrder{
			ID:               uuid.New(),
			OrderNumber:      fmt.Sprintf("TO%d%06d", time.Now().Unix(), i+1),
			PayerName:        fmt.Sprintf("TestPayer_%d", i+1),
			PayerAccount:     generatePayerAccount(paymentType, i+1),
			PaymentType:      paymentType,
			Amount:           amount,
			MerchantID:       merchantID,
			AdAccount:        fmt.Sprintf("AD%06d", i+1),
			ReceiveAccountID: accountID,
			Status:           status,
			Remark:           testStringPtr(fmt.Sprintf("Test order %d", i+1)),
			CreatedAt:        createdAt,
			UpdatedAt:        createdAt,
		}
		
		// Add voucher URL for paid/confirmed orders
		if status == "paid" || status == "confirmed" {
			order.VoucherURL = testStringPtr(fmt.Sprintf("/uploads/test_voucher_%d.jpg", i+1))
		}
		
		err := s.rechargeRepo.Create(ctx, order)
		if err != nil {
			return nil, fmt.Errorf("failed to create order %d: %w", i+1, err)
		}
		
		generatedIDs = append(generatedIDs, order.ID)
	}
	
	duration := time.Since(startTime)
	return &TestDataGenerationResult{
		DataType:     "orders",
		Count:        req.Count,
		GeneratedIDs: generatedIDs,
		Duration:     duration,
		Message:      fmt.Sprintf("Successfully generated %d test recharge orders", req.Count),
	}, nil
}

// GenerateUserTestData generates test user and permission data
func (s *testDataService) GenerateUserTestData(ctx context.Context, req *GenerateUserTestDataRequest) (*TestDataGenerationResult, error) {
	startTime := time.Now()
	var generatedIDs []uuid.UUID
	
	usernamePrefix := req.UsernamePrefix
	if usernamePrefix == "" {
		usernamePrefix = "testuser"
	}
	
	roles := req.Roles
	if len(roles) == 0 {
		roles = []string{"admin", "finance", "operator", "viewer"}
	}
	
	for i := 0; i < req.Count; i++ {
		user := &repository.User{
			ID:       uuid.New(),
			Username: fmt.Sprintf("%s_%d_%d", usernamePrefix, i+1, time.Now().Unix()),
			Email:    fmt.Sprintf("%s%d@test.com", usernamePrefix, i+1),
			Password: "$2a$10$test.hash.for.testing.purposes.only", // Test password hash
			FullName: fmt.Sprintf("Test User %d", i+1),
			Phone:    testStringPtr(fmt.Sprintf("1390000%04d", i+1)),
			Status:   "active",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		
		err := s.userRepo.Create(ctx, user)
		if err != nil {
			return nil, fmt.Errorf("failed to create user %d: %w", i+1, err)
		}
		
		generatedIDs = append(generatedIDs, user.ID)
		
		// Assign random role if permissions are requested
		if req.WithPermissions && len(roles) > 0 {
			roleName := roles[rand.Intn(len(roles))]
			
			// Try to find existing role or create it
			roleFilter := &repository.RoleFilter{
				Keyword: &roleName,
				Limit: 1,
			}
			existingRoles, err := s.roleRepo.List(ctx, roleFilter)
			if err == nil && len(existingRoles) > 0 {
				// Role exists, assign it to user
				err = s.roleRepo.AssignRoleToUser(ctx, user.ID, existingRoles[0].ID)
				if err != nil {
					fmt.Printf("Warning: failed to assign role %s to user %s: %v\n", roleName, user.ID, err)
				}
			} else {
				// Create role if it doesn't exist
				role := &repository.Role{
					ID:          uuid.New(),
					Name:        roleName,
					Code:        fmt.Sprintf("ROLE_%s", roleName),
					Description: testStringPtr(fmt.Sprintf("Test role: %s", roleName)),
					IsSystem:    false,
					CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				}
				
				err = s.roleRepo.Create(ctx, role)
				if err == nil {
					err = s.roleRepo.AssignRoleToUser(ctx, user.ID, role.ID)
					if err != nil {
						fmt.Printf("Warning: failed to assign new role %s to user %s: %v\n", roleName, user.ID, err)
					}
				}
			}
		}
	}
	
	duration := time.Since(startTime)
	return &TestDataGenerationResult{
		DataType:     "users",
		Count:        req.Count,
		GeneratedIDs: generatedIDs,
		Duration:     duration,
		Message:      fmt.Sprintf("Successfully generated %d test users", req.Count),
	}, nil
}

// GenerateBatchTestData generates multiple types of test data in batch
func (s *testDataService) GenerateBatchTestData(ctx context.Context, req *BatchTestDataRequest) (*BatchTestDataResult, error) {
	startTime := time.Now()
	var results []*TestDataGenerationResult
	var totalCount int
	
	// Generate merchants first
	if req.Merchants != nil {
		result, err := s.GenerateMerchantTestData(ctx, req.Merchants)
		if err != nil {
			return &BatchTestDataResult{
				Results:      results,
				TotalCount:   totalCount,
				Duration:     time.Since(startTime),
				Success:      false,
				ErrorMessage: fmt.Sprintf("Failed to generate merchants: %v", err),
			}, nil
		}
		results = append(results, result)
		totalCount += result.Count
		
		// Use generated merchant IDs for accounts if linking is requested
		if req.LinkAccounts && req.Accounts != nil {
			req.Accounts.MerchantIDs = result.GeneratedIDs
		}
	}
	
	// Generate accounts
	if req.Accounts != nil {
		result, err := s.GenerateReceiveAccountTestData(ctx, req.Accounts)
		if err != nil {
			return &BatchTestDataResult{
				Results:      results,
				TotalCount:   totalCount,
				Duration:     time.Since(startTime),
				Success:      false,
				ErrorMessage: fmt.Sprintf("Failed to generate accounts: %v", err),
			}, nil
		}
		results = append(results, result)
		totalCount += result.Count
		
		// Use generated account IDs for orders
		if req.Orders != nil {
			req.Orders.AccountIDs = result.GeneratedIDs
			if req.LinkAccounts && len(req.Orders.MerchantIDs) == 0 && req.Merchants != nil {
				req.Orders.MerchantIDs = results[0].GeneratedIDs // Use merchant IDs from first result
			}
		}
	}
	
	// Generate orders
	if req.Orders != nil {
		result, err := s.GenerateRechargeOrderTestData(ctx, req.Orders)
		if err != nil {
			return &BatchTestDataResult{
				Results:      results,
				TotalCount:   totalCount,
				Duration:     time.Since(startTime),
				Success:      false,
				ErrorMessage: fmt.Sprintf("Failed to generate orders: %v", err),
			}, nil
		}
		results = append(results, result)
		totalCount += result.Count
	}
	
	// Generate users
	if req.Users != nil {
		result, err := s.GenerateUserTestData(ctx, req.Users)
		if err != nil {
			return &BatchTestDataResult{
				Results:      results,
				TotalCount:   totalCount,
				Duration:     time.Since(startTime),
				Success:      false,
				ErrorMessage: fmt.Sprintf("Failed to generate users: %v", err),
			}, nil
		}
		results = append(results, result)
		totalCount += result.Count
	}
	
	return &BatchTestDataResult{
		Results:    results,
		TotalCount: totalCount,
		Duration:   time.Since(startTime),
		Success:    true,
	}, nil
}

// CleanupTestData cleans up test data using the cleanup service
func (s *testDataService) CleanupTestData(ctx context.Context, req *CleanupTestDataRequest) (*CleanupResult, error) {
	// Create cleanup service
	cleanupService := NewDataCleanupService(
		s.merchantRepo,
		s.accountRepo,
		s.rechargeRepo,
		s.userRepo,
		s.roleRepo,
		s.permissionRepo,
		s.merchantAccountRepo,
	)
	
	// Delegate to cleanup service
	return cleanupService.CleanupTestDataInternal(ctx, req.DataTypes, req.TestPrefix, req.CreatedAfter, req.DryRun)
}

// Helper functions
func testStringPtr(s string) *string {
	return &s
}

func generateAccountNumber(accountType string, index int) string {
	switch accountType {
	case "alipay":
		return fmt.Sprintf("alipay_%d@test.com", index)
	case "wechat":
		return fmt.Sprintf("wx_test_%d", index)
	case "bank":
		return fmt.Sprintf("6222%012d", index)
	default:
		return fmt.Sprintf("other_%d", index)
	}
}

func generatePayerAccount(paymentType string, index int) string {
	if paymentType == "public" {
		return fmt.Sprintf("6228%012d", index)
	}
	return fmt.Sprintf("payer_%d@test.com", index)
}
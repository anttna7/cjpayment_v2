package repository

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// RechargeOrderRepositoryIntegrationTestSuite defines the integration test suite
type RechargeOrderRepositoryIntegrationTestSuite struct {
	suite.Suite
	db   *gorm.DB
	repo RechargeOrderRepository
	ctx  context.Context
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) SetupSuite() {
	// Setup test database connection
	dsn := "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	suite.Require().NoError(err)

	suite.db = db
	suite.repo = NewRechargeOrderRepository(db)
	suite.ctx = context.Background()

	// Auto migrate tables
	err = db.AutoMigrate(&RechargeOrder{}, &Merchant{}, &ReceiveAccount{})
	suite.Require().NoError(err)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) SetupTest() {
	// Clean up data before each test
	suite.db.Exec("DELETE FROM recharge_orders")
	suite.db.Exec("DELETE FROM merchants")
	suite.db.Exec("DELETE FROM receive_accounts")

	// Create test merchant
	merchant := &Merchant{
		ID:           1,
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	suite.db.Create(merchant)

	// Create test receive account
	account := &ReceiveAccount{
		ID:          1,
		AccountName: "Test Account",
		AccountNo:   "1234567890",
		BankName:    "Test Bank",
		AccountType: "corporate",
		DailyLimit:  decimal.NewFromFloat(100000.00),
		Status:      "active",
	}
	suite.db.Create(account)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TearDownSuite() {
	// Clean up after all tests
	suite.db.Exec("DROP TABLE IF EXISTS recharge_orders")
	suite.db.Exec("DROP TABLE IF EXISTS merchants")
	suite.db.Exec("DROP TABLE IF EXISTS receive_accounts")
	
	sqlDB, err := suite.db.DB()
	if err == nil {
		sqlDB.Close()
	}
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestCreate_Success() {
	// Arrange
	order := &RechargeOrder{
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
	}

	// Act
	err := suite.repo.Create(suite.ctx, order)

	// Assert
	suite.NoError(err)
	suite.NotZero(order.ID)
	suite.NotZero(order.CreatedAt)
	suite.NotZero(order.UpdatedAt)

	// Verify in database
	var dbOrder RechargeOrder
	err = suite.db.First(&dbOrder, order.ID).Error
	suite.NoError(err)
	suite.Equal(order.OrderNo, dbOrder.OrderNo)
	suite.Equal(order.MerchantID, dbOrder.MerchantID)
	suite.Equal(order.PayerName, dbOrder.PayerName)
	suite.True(order.Amount.Equal(dbOrder.Amount))
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestCreate_DuplicateOrderNo() {
	// Arrange
	order1 := &RechargeOrder{
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
	}

	order2 := &RechargeOrder{
		OrderNo:          "RO20240812001", // Same order number
		MerchantID:       1,
		PayerName:        "Jane Doe",
		Amount:           decimal.NewFromFloat(2000.00),
		AdAccount:        "AD789012",
		PaymentType:      "personal",
		ReceiveAccountID: 1,
		Status:           "pending",
	}

	// Act
	err1 := suite.repo.Create(suite.ctx, order1)
	err2 := suite.repo.Create(suite.ctx, order2)

	// Assert
	suite.NoError(err1)
	suite.Error(err2) // Should fail due to unique constraint
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestGetByOrderNo_Success() {
	// Arrange
	order := &RechargeOrder{
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
	}
	err := suite.repo.Create(suite.ctx, order)
	suite.Require().NoError(err)

	// Act
	result, err := suite.repo.GetByOrderNo(suite.ctx, order.OrderNo)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(order.ID, result.ID)
	suite.Equal(order.OrderNo, result.OrderNo)
	suite.Equal(order.MerchantID, result.MerchantID)
	suite.Equal(order.PayerName, result.PayerName)
	suite.True(order.Amount.Equal(result.Amount))
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestGetByOrderNo_NotFound() {
	// Act
	result, err := suite.repo.GetByOrderNo(suite.ctx, "NONEXISTENT")

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrOrderNotFound, err)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestUpdate_Success() {
	// Arrange
	order := &RechargeOrder{
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "John Doe",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
	}
	err := suite.repo.Create(suite.ctx, order)
	suite.Require().NoError(err)

	originalUpdatedAt := order.UpdatedAt
	time.Sleep(10 * time.Millisecond) // Ensure timestamp difference

	// Modify order
	order.Status = "paid"
	order.PaymentProof = "https://example.com/proof.jpg"
	order.Remark = "Payment confirmed"

	// Act
	err = suite.repo.Update(suite.ctx, order)

	// Assert
	suite.NoError(err)
	suite.True(order.UpdatedAt.After(originalUpdatedAt))

	// Verify in database
	var dbOrder RechargeOrder
	err = suite.db.First(&dbOrder, order.ID).Error
	suite.NoError(err)
	suite.Equal("paid", dbOrder.Status)
	suite.Equal("https://example.com/proof.jpg", dbOrder.PaymentProof)
	suite.Equal("Payment confirmed", dbOrder.Remark)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestList_Success() {
	// Arrange - Create test orders
	orders := []*RechargeOrder{
		{
			OrderNo:          "RO20240812001",
			MerchantID:       1,
			PayerName:        "John Doe",
			Amount:           decimal.NewFromFloat(1000.00),
			AdAccount:        "AD123456",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "pending",
		},
		{
			OrderNo:          "RO20240812002",
			MerchantID:       1,
			PayerName:        "Jane Smith",
			Amount:           decimal.NewFromFloat(2000.00),
			AdAccount:        "AD789012",
			PaymentType:      "personal",
			ReceiveAccountID: 1,
			Status:           "paid",
		},
		{
			OrderNo:          "RO20240812003",
			MerchantID:       1,
			PayerName:        "Bob Johnson",
			Amount:           decimal.NewFromFloat(1500.00),
			AdAccount:        "AD345678",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "completed",
		},
	}

	for _, order := range orders {
		err := suite.repo.Create(suite.ctx, order)
		suite.Require().NoError(err)
	}

	// Test cases
	testCases := []struct {
		name           string
		req            *ListOrdersRequest
		expectedCount  int
		expectedTotal  int64
	}{
		{
			name: "list all orders",
			req: &ListOrdersRequest{
				Page:     1,
				PageSize: 10,
			},
			expectedCount: 3,
			expectedTotal: 3,
		},
		{
			name: "list pending orders only",
			req: &ListOrdersRequest{
				Page:     1,
				PageSize: 10,
				Status:   "pending",
			},
			expectedCount: 1,
			expectedTotal: 1,
		},
		{
			name: "list by merchant",
			req: &ListOrdersRequest{
				Page:       1,
				PageSize:   10,
				MerchantID: 1,
			},
			expectedCount: 3,
			expectedTotal: 3,
		},
		{
			name: "list with pagination",
			req: &ListOrdersRequest{
				Page:     1,
				PageSize: 2,
			},
			expectedCount: 2,
			expectedTotal: 3,
		},
		{
			name: "list by payment type",
			req: &ListOrdersRequest{
				Page:        1,
				PageSize:    10,
				PaymentType: "corporate",
			},
			expectedCount: 2,
			expectedTotal: 2,
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			// Act
			result, total, err := suite.repo.List(suite.ctx, tc.req)

			// Assert
			suite.NoError(err)
			suite.Len(result, tc.expectedCount)
			suite.Equal(tc.expectedTotal, total)
		})
	}
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestList_DateRange() {
	// Arrange - Create orders with different dates
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)
	tomorrow := now.Add(24 * time.Hour)

	orders := []*RechargeOrder{
		{
			OrderNo:          "RO20240811001",
			MerchantID:       1,
			PayerName:        "Yesterday Order",
			Amount:           decimal.NewFromFloat(1000.00),
			AdAccount:        "AD123456",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "pending",
			CreatedAt:        yesterday,
		},
		{
			OrderNo:          "RO20240812001",
			MerchantID:       1,
			PayerName:        "Today Order",
			Amount:           decimal.NewFromFloat(2000.00),
			AdAccount:        "AD789012",
			PaymentType:      "personal",
			ReceiveAccountID: 1,
			Status:           "paid",
			CreatedAt:        now,
		},
	}

	for _, order := range orders {
		suite.db.Create(order) // Direct DB create to set custom timestamps
	}

	// Test date range filtering
	req := &ListOrdersRequest{
		Page:      1,
		PageSize:  10,
		StartDate: now.Add(-1 * time.Hour),
		EndDate:   now.Add(1 * time.Hour),
	}

	// Act
	result, total, err := suite.repo.List(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.Len(result, 1) // Only today's order
	suite.Equal(int64(1), total)
	suite.Equal("Today Order", result[0].PayerName)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestGetDailyStats_Success() {
	// Arrange - Create orders for today
	today := time.Now()
	orders := []*RechargeOrder{
		{
			OrderNo:          "RO20240812001",
			MerchantID:       1,
			PayerName:        "Order 1",
			Amount:           decimal.NewFromFloat(1000.00),
			AdAccount:        "AD123456",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "completed",
			CreatedAt:        today,
		},
		{
			OrderNo:          "RO20240812002",
			MerchantID:       1,
			PayerName:        "Order 2",
			Amount:           decimal.NewFromFloat(2000.00),
			AdAccount:        "AD789012",
			PaymentType:      "personal",
			ReceiveAccountID: 1,
			Status:           "completed",
			CreatedAt:        today,
		},
		{
			OrderNo:          "RO20240812003",
			MerchantID:       1,
			PayerName:        "Order 3",
			Amount:           decimal.NewFromFloat(1500.00),
			AdAccount:        "AD345678",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "pending", // Not completed
			CreatedAt:        today,
		},
	}

	for _, order := range orders {
		suite.db.Create(order)
	}

	// Act
	stats, err := suite.repo.GetDailyStats(suite.ctx, today)

	// Assert
	suite.NoError(err)
	suite.NotNil(stats)
	suite.Equal(int64(3), stats.TotalOrders)
	suite.Equal(int64(2), stats.CompletedOrders)
	suite.True(stats.TotalAmount.Equal(decimal.NewFromFloat(4500.00)))
	suite.True(stats.CompletedAmount.Equal(decimal.NewFromFloat(3000.00)))
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestGetDailyStats_NoOrders() {
	// Act
	stats, err := suite.repo.GetDailyStats(suite.ctx, time.Now())

	// Assert
	suite.NoError(err)
	suite.NotNil(stats)
	suite.Equal(int64(0), stats.TotalOrders)
	suite.Equal(int64(0), stats.CompletedOrders)
	suite.True(stats.TotalAmount.Equal(decimal.Zero))
	suite.True(stats.CompletedAmount.Equal(decimal.Zero))
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestConcurrentOperations() {
	// Test concurrent create operations
	concurrency := 10
	results := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		go func(index int) {
			order := &RechargeOrder{
				OrderNo:          fmt.Sprintf("RO2024081200%d", index),
				MerchantID:       1,
				PayerName:        fmt.Sprintf("Concurrent Order %d", index),
				Amount:           decimal.NewFromFloat(1000.00),
				AdAccount:        fmt.Sprintf("AD12345%d", index),
				PaymentType:      "corporate",
				ReceiveAccountID: 1,
				Status:           "pending",
			}
			err := suite.repo.Create(suite.ctx, order)
			results <- err
		}(i)
	}

	// Collect results
	for i := 0; i < concurrency; i++ {
		err := <-results
		suite.NoError(err)
	}

	// Verify all orders were created
	req := &ListOrdersRequest{
		Page:     1,
		PageSize: 20,
	}
	orders, total, err := suite.repo.List(suite.ctx, req)
	suite.NoError(err)
	suite.Equal(int64(concurrency), total)
	suite.Len(orders, concurrency)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestTransactionRollback() {
	// Test transaction rollback scenario
	order := &RechargeOrder{
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "Transaction Test",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
	}

	// Start transaction
	tx := suite.db.Begin()
	txRepo := NewRechargeOrderRepository(tx)

	// Create order in transaction
	err := txRepo.Create(suite.ctx, order)
	suite.NoError(err)

	// Verify order exists in transaction
	result, err := txRepo.GetByOrderNo(suite.ctx, order.OrderNo)
	suite.NoError(err)
	suite.NotNil(result)

	// Rollback transaction
	tx.Rollback()

	// Verify order doesn't exist after rollback
	result, err = suite.repo.GetByOrderNo(suite.ctx, order.OrderNo)
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrOrderNotFound, err)
}

func (suite *RechargeOrderRepositoryIntegrationTestSuite) TestComplexQuery() {
	// Arrange - Create complex test data
	now := time.Now()
	orders := []*RechargeOrder{
		{
			OrderNo:          "RO20240812001",
			MerchantID:       1,
			PayerName:        "High Value Order",
			Amount:           decimal.NewFromFloat(10000.00),
			AdAccount:        "AD123456",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "completed",
			CreatedAt:        now.Add(-2 * time.Hour),
		},
		{
			OrderNo:          "RO20240812002",
			MerchantID:       1,
			PayerName:        "Medium Value Order",
			Amount:           decimal.NewFromFloat(5000.00),
			AdAccount:        "AD789012",
			PaymentType:      "personal",
			ReceiveAccountID: 1,
			Status:           "paid",
			CreatedAt:        now.Add(-1 * time.Hour),
		},
		{
			OrderNo:          "RO20240812003",
			MerchantID:       1,
			PayerName:        "Low Value Order",
			Amount:           decimal.NewFromFloat(1000.00),
			AdAccount:        "AD345678",
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "pending",
			CreatedAt:        now,
		},
	}

	for _, order := range orders {
		suite.db.Create(order)
	}

	// Test complex query with multiple filters
	req := &ListOrdersRequest{
		Page:        1,
		PageSize:    10,
		MerchantID:  1,
		PaymentType: "corporate",
		MinAmount:   decimal.NewFromFloat(5000.00),
		MaxAmount:   decimal.NewFromFloat(15000.00),
		StartDate:   now.Add(-3 * time.Hour),
		EndDate:     now.Add(1 * time.Hour),
	}

	// Act
	result, total, err := suite.repo.List(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.Len(result, 1) // Only high value corporate order should match
	suite.Equal(int64(1), total)
	suite.Equal("High Value Order", result[0].PayerName)
	suite.True(result[0].Amount.Equal(decimal.NewFromFloat(10000.00)))
}

// Run the integration test suite
func TestRechargeOrderRepositoryIntegrationTestSuite(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration tests")
	}

	suite.Run(t, new(RechargeOrderRepositoryIntegrationTestSuite))
}

// Performance benchmarks
func BenchmarkRechargeOrderRepository_Create(b *testing.B) {
	if testing.Short() {
		b.Skip("Skipping benchmark in short mode")
	}

	dsn := "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		b.Fatal(err)
	}

	repo := NewRechargeOrderRepository(db)
	ctx := context.Background()

	// Clean up and setup
	db.Exec("DELETE FROM recharge_orders")
	db.Create(&Merchant{ID: 1, Name: "Test Merchant", Status: "active"})
	db.Create(&ReceiveAccount{ID: 1, AccountName: "Test Account", Status: "active"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		order := &RechargeOrder{
			OrderNo:          fmt.Sprintf("RO2024081200%d", i),
			MerchantID:       1,
			PayerName:        fmt.Sprintf("Benchmark Order %d", i),
			Amount:           decimal.NewFromFloat(1000.00),
			AdAccount:        fmt.Sprintf("AD12345%d", i),
			PaymentType:      "corporate",
			ReceiveAccountID: 1,
			Status:           "pending",
		}
		err := repo.Create(ctx, order)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRechargeOrderRepository_GetByOrderNo(b *testing.B) {
	if testing.Short() {
		b.Skip("Skipping benchmark in short mode")
	}

	dsn := "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		b.Fatal(err)
	}

	repo := NewRechargeOrderRepository(db)
	ctx := context.Background()

	// Setup test data
	db.Create(&Merchant{ID: 1, Name: "Test Merchant", Status: "active"})
	db.Create(&ReceiveAccount{ID: 1, AccountName: "Test Account", Status: "active"})

	order := &RechargeOrder{
		OrderNo:          "RO20240812001",
		MerchantID:       1,
		PayerName:        "Benchmark Order",
		Amount:           decimal.NewFromFloat(1000.00),
		AdAccount:        "AD123456",
		PaymentType:      "corporate",
		ReceiveAccountID: 1,
		Status:           "pending",
	}
	err = repo.Create(ctx, order)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := repo.GetByOrderNo(ctx, order.OrderNo)
		if err != nil {
			b.Fatal(err)
		}
	}
}
package repository

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"cjpayment/pkg/database"
)

// MerchantRepositoryIntegrationTestSuite defines the integration test suite
type MerchantRepositoryIntegrationTestSuite struct {
	suite.Suite
	db   *gorm.DB
	repo MerchantRepository
	ctx  context.Context
}

func (suite *MerchantRepositoryIntegrationTestSuite) SetupSuite() {
	// Setup test database connection
	dsn := "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	suite.Require().NoError(err)

	suite.db = db
	suite.repo = NewMerchantRepository(db)
	suite.ctx = context.Background()

	// Auto migrate tables
	err = db.AutoMigrate(&Merchant{})
	suite.Require().NoError(err)
}

func (suite *MerchantRepositoryIntegrationTestSuite) SetupTest() {
	// Clean up data before each test
	suite.db.Exec("DELETE FROM merchants")
}

func (suite *MerchantRepositoryIntegrationTestSuite) TearDownSuite() {
	// Clean up after all tests
	suite.db.Exec("DROP TABLE IF EXISTS merchants")
	
	sqlDB, err := suite.db.DB()
	if err == nil {
		sqlDB.Close()
	}
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestCreate_Success() {
	// Arrange
	merchant := &Merchant{
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}

	// Act
	err := suite.repo.Create(suite.ctx, merchant)

	// Assert
	suite.NoError(err)
	suite.NotZero(merchant.ID)
	suite.NotZero(merchant.CreatedAt)
	suite.NotZero(merchant.UpdatedAt)

	// Verify in database
	var dbMerchant Merchant
	err = suite.db.First(&dbMerchant, merchant.ID).Error
	suite.NoError(err)
	suite.Equal(merchant.Name, dbMerchant.Name)
	suite.Equal(merchant.ContactName, dbMerchant.ContactName)
	suite.Equal(merchant.Email, dbMerchant.Email)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestCreate_DuplicateName() {
	// Arrange
	merchant1 := &Merchant{
		Name:         "Duplicate Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}

	merchant2 := &Merchant{
		Name:         "Duplicate Merchant", // Same name
		ContactName:  "Jane Doe",
		ContactPhone: "13900139000",
		Email:        "jane@example.com",
		BusinessType: "retail",
		Status:       "active",
	}

	// Act
	err1 := suite.repo.Create(suite.ctx, merchant1)
	err2 := suite.repo.Create(suite.ctx, merchant2)

	// Assert
	suite.NoError(err1)
	suite.Error(err2) // Should fail due to unique constraint
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestGetByID_Success() {
	// Arrange
	merchant := &Merchant{
		Name:         "Test Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	err := suite.repo.Create(suite.ctx, merchant)
	suite.Require().NoError(err)

	// Act
	result, err := suite.repo.GetByID(suite.ctx, merchant.ID)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(merchant.ID, result.ID)
	suite.Equal(merchant.Name, result.Name)
	suite.Equal(merchant.ContactName, result.ContactName)
	suite.Equal(merchant.Email, result.Email)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestGetByID_NotFound() {
	// Act
	result, err := suite.repo.GetByID(suite.ctx, 999)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrMerchantNotFound, err)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestGetByName_Success() {
	// Arrange
	merchant := &Merchant{
		Name:         "Unique Merchant Name",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	err := suite.repo.Create(suite.ctx, merchant)
	suite.Require().NoError(err)

	// Act
	result, err := suite.repo.GetByName(suite.ctx, merchant.Name)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(merchant.ID, result.ID)
	suite.Equal(merchant.Name, result.Name)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestGetByName_NotFound() {
	// Act
	result, err := suite.repo.GetByName(suite.ctx, "Nonexistent Merchant")

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrMerchantNotFound, err)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestUpdate_Success() {
	// Arrange
	merchant := &Merchant{
		Name:         "Original Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	err := suite.repo.Create(suite.ctx, merchant)
	suite.Require().NoError(err)

	originalUpdatedAt := merchant.UpdatedAt
	time.Sleep(10 * time.Millisecond) // Ensure timestamp difference

	// Modify merchant
	merchant.Name = "Updated Merchant"
	merchant.ContactName = "Jane Doe"
	merchant.Email = "jane@example.com"

	// Act
	err = suite.repo.Update(suite.ctx, merchant)

	// Assert
	suite.NoError(err)
	suite.True(merchant.UpdatedAt.After(originalUpdatedAt))

	// Verify in database
	var dbMerchant Merchant
	err = suite.db.First(&dbMerchant, merchant.ID).Error
	suite.NoError(err)
	suite.Equal("Updated Merchant", dbMerchant.Name)
	suite.Equal("Jane Doe", dbMerchant.ContactName)
	suite.Equal("jane@example.com", dbMerchant.Email)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestDelete_Success() {
	// Arrange
	merchant := &Merchant{
		Name:         "To Be Deleted",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	err := suite.repo.Create(suite.ctx, merchant)
	suite.Require().NoError(err)

	// Act
	err = suite.repo.Delete(suite.ctx, merchant.ID)

	// Assert
	suite.NoError(err)

	// Verify deletion
	var dbMerchant Merchant
	err = suite.db.First(&dbMerchant, merchant.ID).Error
	suite.Error(err)
	suite.True(gorm.ErrRecordNotFound == err)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestList_Success() {
	// Arrange - Create test merchants
	merchants := []*Merchant{
		{
			Name:         "Active Merchant 1",
			ContactName:  "Contact 1",
			ContactPhone: "13800138001",
			Email:        "contact1@example.com",
			BusinessType: "e-commerce",
			Status:       "active",
		},
		{
			Name:         "Active Merchant 2",
			ContactName:  "Contact 2",
			ContactPhone: "13800138002",
			Email:        "contact2@example.com",
			BusinessType: "retail",
			Status:       "active",
		},
		{
			Name:         "Inactive Merchant",
			ContactName:  "Contact 3",
			ContactPhone: "13800138003",
			Email:        "contact3@example.com",
			BusinessType: "service",
			Status:       "inactive",
		},
	}

	for _, merchant := range merchants {
		err := suite.repo.Create(suite.ctx, merchant)
		suite.Require().NoError(err)
	}

	// Test cases
	testCases := []struct {
		name           string
		req            *ListMerchantsRequest
		expectedCount  int
		expectedTotal  int64
	}{
		{
			name: "list all merchants",
			req: &ListMerchantsRequest{
				Page:     1,
				PageSize: 10,
			},
			expectedCount: 3,
			expectedTotal: 3,
		},
		{
			name: "list active merchants only",
			req: &ListMerchantsRequest{
				Page:     1,
				PageSize: 10,
				Status:   "active",
			},
			expectedCount: 2,
			expectedTotal: 2,
		},
		{
			name: "list with pagination",
			req: &ListMerchantsRequest{
				Page:     1,
				PageSize: 2,
			},
			expectedCount: 2,
			expectedTotal: 3,
		},
		{
			name: "search by name",
			req: &ListMerchantsRequest{
				Page:     1,
				PageSize: 10,
				Search:   "Active",
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

func (suite *MerchantRepositoryIntegrationTestSuite) TestList_Pagination() {
	// Arrange - Create 5 merchants
	for i := 1; i <= 5; i++ {
		merchant := &Merchant{
			Name:         fmt.Sprintf("Merchant %d", i),
			ContactName:  fmt.Sprintf("Contact %d", i),
			ContactPhone: fmt.Sprintf("1380013800%d", i),
			Email:        fmt.Sprintf("contact%d@example.com", i),
			BusinessType: "e-commerce",
			Status:       "active",
		}
		err := suite.repo.Create(suite.ctx, merchant)
		suite.Require().NoError(err)
	}

	// Test pagination
	req := &ListMerchantsRequest{
		Page:     2,
		PageSize: 2,
	}

	// Act
	result, total, err := suite.repo.List(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.Len(result, 2) // Page 2 with page size 2
	suite.Equal(int64(5), total) // Total count should be 5
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestConcurrentOperations() {
	// Test concurrent create operations
	concurrency := 10
	results := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		go func(index int) {
			merchant := &Merchant{
				Name:         fmt.Sprintf("Concurrent Merchant %d", index),
				ContactName:  fmt.Sprintf("Contact %d", index),
				ContactPhone: fmt.Sprintf("1380013%04d", index),
				Email:        fmt.Sprintf("contact%d@example.com", index),
				BusinessType: "e-commerce",
				Status:       "active",
			}
			err := suite.repo.Create(suite.ctx, merchant)
			results <- err
		}(i)
	}

	// Collect results
	for i := 0; i < concurrency; i++ {
		err := <-results
		suite.NoError(err)
	}

	// Verify all merchants were created
	req := &ListMerchantsRequest{
		Page:     1,
		PageSize: 20,
		Search:   "Concurrent",
	}
	merchants, total, err := suite.repo.List(suite.ctx, req)
	suite.NoError(err)
	suite.Equal(int64(concurrency), total)
	suite.Len(merchants, concurrency)
}

func (suite *MerchantRepositoryIntegrationTestSuite) TestTransactionRollback() {
	// Test transaction rollback scenario
	merchant := &Merchant{
		Name:         "Transaction Test",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}

	// Start transaction
	tx := suite.db.Begin()
	txRepo := NewMerchantRepository(tx)

	// Create merchant in transaction
	err := txRepo.Create(suite.ctx, merchant)
	suite.NoError(err)

	// Verify merchant exists in transaction
	result, err := txRepo.GetByID(suite.ctx, merchant.ID)
	suite.NoError(err)
	suite.NotNil(result)

	// Rollback transaction
	tx.Rollback()

	// Verify merchant doesn't exist after rollback
	result, err = suite.repo.GetByID(suite.ctx, merchant.ID)
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrMerchantNotFound, err)
}

// Run the integration test suite
func TestMerchantRepositoryIntegrationTestSuite(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration tests")
	}

	suite.Run(t, new(MerchantRepositoryIntegrationTestSuite))
}

// Performance benchmarks
func BenchmarkMerchantRepository_Create(b *testing.B) {
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

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Clean up
	db.Exec("DELETE FROM merchants")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		merchant := &Merchant{
			Name:         fmt.Sprintf("Benchmark Merchant %d", i),
			ContactName:  "John Doe",
			ContactPhone: fmt.Sprintf("1380013%04d", i),
			Email:        fmt.Sprintf("john%d@example.com", i),
			BusinessType: "e-commerce",
			Status:       "active",
		}
		err := repo.Create(ctx, merchant)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkMerchantRepository_GetByID(b *testing.B) {
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

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create test merchant
	merchant := &Merchant{
		Name:         "Benchmark Merchant",
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}
	err = repo.Create(ctx, merchant)
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := repo.GetByID(ctx, merchant.ID)
		if err != nil {
			b.Fatal(err)
		}
	}
}
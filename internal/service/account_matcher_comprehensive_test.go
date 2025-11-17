package service

import (
	"context"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"cjpayment/internal/repository"
)

// MockReceiveAccountRepository for testing
type MockReceiveAccountRepository struct {
	mock.Mock
}

func (m *MockReceiveAccountRepository) GetAvailableAccounts(ctx context.Context, merchantID uint, paymentType string) ([]*repository.ReceiveAccount, error) {
	args := m.Called(ctx, merchantID, paymentType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.ReceiveAccount), args.Error(1)
}

func (m *MockReceiveAccountRepository) UpdateDailyUsage(ctx context.Context, accountID uint, amount decimal.Decimal) error {
	args := m.Called(ctx, accountID, amount)
	return args.Error(0)
}

func (m *MockReceiveAccountRepository) GetDailyUsage(ctx context.Context, accountID uint, date time.Time) (decimal.Decimal, error) {
	args := m.Called(ctx, accountID, date)
	return args.Get(0).(decimal.Decimal), args.Error(1)
}

// MockMerchantAccountRepository for testing
type MockMerchantAccountRepository struct {
	mock.Mock
}

func (m *MockMerchantAccountRepository) GetMerchantAccounts(ctx context.Context, merchantID uint) ([]*repository.MerchantAccount, error) {
	args := m.Called(ctx, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.MerchantAccount), args.Error(1)
}

// AccountMatcherTestSuite defines the test suite
type AccountMatcherTestSuite struct {
	suite.Suite
	matcher                   AccountMatcher
	mockReceiveAccountRepo    *MockReceiveAccountRepository
	mockMerchantAccountRepo   *MockMerchantAccountRepository
	ctx                       context.Context
}

func (suite *AccountMatcherTestSuite) SetupTest() {
	suite.mockReceiveAccountRepo = new(MockReceiveAccountRepository)
	suite.mockMerchantAccountRepo = new(MockMerchantAccountRepository)
	suite.matcher = NewAccountMatcher(suite.mockReceiveAccountRepo, suite.mockMerchantAccountRepo)
	suite.ctx = context.Background()
}

func (suite *AccountMatcherTestSuite) TestMatch_Success_Corporate() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account 1",
				AccountNo:   "1234567890",
				BankName:    "Test Bank",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(100000.00),
				Status:      "active",
			},
		},
		{
			ID:               2,
			MerchantID:       1,
			ReceiveAccountID: 2,
			Priority:         2,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          2,
				AccountName: "Corporate Account 2",
				AccountNo:   "0987654321",
				BankName:    "Test Bank 2",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(50000.00),
				Status:      "active",
			},
		},
	}

	today := time.Now()
	dailyUsage := decimal.NewFromFloat(5000.00) // Well below limit

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(1), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(dailyUsage, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(uint(1), result.ID)
	suite.Equal("corporate", result.AccountType)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
	suite.mockReceiveAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_Success_Personal() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "personal",
		Amount:      decimal.NewFromFloat(500.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Personal Account 1",
				AccountNo:   "1111111111",
				BankName:    "Personal Bank",
				AccountType: "personal",
				DailyLimit:  decimal.NewFromFloat(10000.00),
				Status:      "active",
			},
		},
	}

	today := time.Now()
	dailyUsage := decimal.NewFromFloat(2000.00)

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(1), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(dailyUsage, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(uint(1), result.ID)
	suite.Equal("personal", result.AccountType)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
	suite.mockReceiveAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_NoMerchantAccounts() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  999,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return([]*repository.MerchantAccount{}, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrNoAvailableAccount, err)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_NoMatchingAccountType() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Personal Account",
				AccountNo:   "1111111111",
				BankName:    "Personal Bank",
				AccountType: "personal", // Different type
				DailyLimit:  decimal.NewFromFloat(10000.00),
				Status:      "active",
			},
		},
	}

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrNoAvailableAccount, err)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_AccountLimitExceeded() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account",
				AccountNo:   "1234567890",
				BankName:    "Test Bank",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(10000.00),
				Status:      "active",
			},
		},
	}

	today := time.Now()
	dailyUsage := decimal.NewFromFloat(9500.00) // Close to limit, new amount would exceed

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(1), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(dailyUsage, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.Error(err)
	suite.Nil(result)
	suite.Equal(ErrAccountLimitExceeded, err)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
	suite.mockReceiveAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_FallbackToSecondAccount() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account 1",
				AccountNo:   "1234567890",
				BankName:    "Test Bank",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(10000.00),
				Status:      "active",
			},
		},
		{
			ID:               2,
			MerchantID:       1,
			ReceiveAccountID: 2,
			Priority:         2,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          2,
				AccountName: "Corporate Account 2",
				AccountNo:   "0987654321",
				BankName:    "Test Bank 2",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(20000.00),
				Status:      "active",
			},
		},
	}

	today := time.Now()
	firstAccountUsage := decimal.NewFromFloat(9500.00)  // Would exceed limit
	secondAccountUsage := decimal.NewFromFloat(5000.00) // Within limit

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(1), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(firstAccountUsage, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(2), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(secondAccountUsage, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(uint(2), result.ID) // Should select second account
	suite.Equal("corporate", result.AccountType)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
	suite.mockReceiveAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_InactiveAccountSkipped() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "inactive", // Inactive binding
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account 1",
				AccountNo:   "1234567890",
				BankName:    "Test Bank",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(10000.00),
				Status:      "active",
			},
		},
		{
			ID:               2,
			MerchantID:       1,
			ReceiveAccountID: 2,
			Priority:         2,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          2,
				AccountName: "Corporate Account 2",
				AccountNo:   "0987654321",
				BankName:    "Test Bank 2",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(20000.00),
				Status:      "active",
			},
		},
	}

	today := time.Now()
	secondAccountUsage := decimal.NewFromFloat(5000.00)

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(2), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(secondAccountUsage, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(uint(2), result.ID) // Should skip inactive and select second account
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
	suite.mockReceiveAccountRepo.AssertExpectations(suite.T())
}

func (suite *AccountMatcherTestSuite) TestMatch_PriorityOrdering() {
	// Arrange
	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         3, // Lower priority
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account 1",
				AccountNo:   "1234567890",
				BankName:    "Test Bank",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(10000.00),
				Status:      "active",
			},
		},
		{
			ID:               2,
			MerchantID:       1,
			ReceiveAccountID: 2,
			Priority:         1, // Higher priority
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          2,
				AccountName: "Corporate Account 2",
				AccountNo:   "0987654321",
				BankName:    "Test Bank 2",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(20000.00),
				Status:      "active",
			},
		},
	}

	today := time.Now()
	usage := decimal.NewFromFloat(5000.00)

	suite.mockMerchantAccountRepo.On("GetMerchantAccounts", suite.ctx, req.MerchantID).Return(merchantAccounts, nil)
	suite.mockReceiveAccountRepo.On("GetDailyUsage", suite.ctx, uint(2), mock.MatchedBy(func(t time.Time) bool {
		return t.Format("2006-01-02") == today.Format("2006-01-02")
	})).Return(usage, nil)

	// Act
	result, err := suite.matcher.Match(suite.ctx, req)

	// Assert
	suite.NoError(err)
	suite.NotNil(result)
	suite.Equal(uint(2), result.ID) // Should select higher priority account (priority 1)
	suite.mockMerchantAccountRepo.AssertExpectations(suite.T())
	suite.mockReceiveAccountRepo.AssertExpectations(suite.T())
}

// Run the test suite
func TestAccountMatcherTestSuite(t *testing.T) {
	suite.Run(t, new(AccountMatcherTestSuite))
}

// Performance benchmark tests
func BenchmarkAccountMatcher_Match_SingleAccount(b *testing.B) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(100000.00),
				Status:      "active",
			},
		},
	}

	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(1), mock.AnythingOfType("time.Time")).Return(usage, nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := matcher.Match(ctx, req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkAccountMatcher_Match_MultipleAccounts(b *testing.B) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	// Create 10 accounts for performance testing
	merchantAccounts := make([]*repository.MerchantAccount, 10)
	for i := 0; i < 10; i++ {
		merchantAccounts[i] = &repository.MerchantAccount{
			ID:               uint(i + 1),
			MerchantID:       1,
			ReceiveAccountID: uint(i + 1),
			Priority:         i + 1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          uint(i + 1),
				AccountName: "Corporate Account",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(100000.00),
				Status:      "active",
			},
		}
	}

	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= 10; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := matcher.Match(ctx, req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// Stress test for concurrent matching
func TestAccountMatcher_ConcurrentMatching(t *testing.T) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	merchantAccounts := []*repository.MerchantAccount{
		{
			ID:               1,
			MerchantID:       1,
			ReceiveAccountID: 1,
			Priority:         1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          1,
				AccountName: "Corporate Account",
				AccountType: "corporate",
				DailyLimit:  decimal.NewFromFloat(100000.00),
				Status:      "active",
			},
		},
	}

	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(1), mock.AnythingOfType("time.Time")).Return(usage, nil)

	// Run 100 concurrent matching operations
	concurrency := 100
	results := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			req := &MatchRequest{
				MerchantID:  1,
				PaymentType: "corporate",
				Amount:      decimal.NewFromFloat(1000.00),
			}
			_, err := matcher.Match(ctx, req)
			results <- err
		}()
	}

	// Collect results
	for i := 0; i < concurrency; i++ {
		err := <-results
		assert.NoError(t, err)
	}
}
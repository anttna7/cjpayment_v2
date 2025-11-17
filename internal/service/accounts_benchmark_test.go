package service

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/mock"
)

// BenchmarkReceiveAccountService_CreateReceiveAccount benchmarks account creation
func BenchmarkReceiveAccountService_CreateReceiveAccount(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	// Setup mocks for successful creation
	mockRepo.On("ExistsByAccountNumber", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)

	request := &CreateReceiveAccountRequest{
		AccountName:   "Benchmark Account",
		AccountNumber: "BENCH123",
		AccountType:   "alipay",
		AccountHolder: "Benchmark Holder",
		PaymentType:   "public",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Modify account number to avoid uniqueness conflicts
		request.AccountNumber = fmt.Sprintf("BENCH%d", i)
		_, err := service.CreateReceiveAccount(ctx, request)
		if err != nil {
			b.Fatalf("CreateReceiveAccount failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_GetReceiveAccount benchmarks account retrieval
func BenchmarkReceiveAccountService_GetReceiveAccount(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	account := createTestReceiveAccount()
	accountID := account.ID

	// Setup mock for successful retrieval
	mockRepo.On("GetByID", mock.Anything, accountID).Return(account, nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetReceiveAccount(ctx, accountID)
		if err != nil {
			b.Fatalf("GetReceiveAccount failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_ListReceiveAccounts benchmarks account listing
func BenchmarkReceiveAccountService_ListReceiveAccounts(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	// Create test accounts for listing
	accounts := make([]*repository.ReceiveAccount, 100)
	for i := 0; i < 100; i++ {
		accounts[i] = createTestReceiveAccount()
		accounts[i].AccountName = fmt.Sprintf("Test Account %d", i)
	}

	filter := &repository.ReceiveAccountFilter{
		Limit:  20,
		Offset: 0,
	}

	// Setup mocks for successful listing
	mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(100), nil)
	mockRepo.On("List", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(accounts[:20], nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _, err := service.ListReceiveAccounts(ctx, filter)
		if err != nil {
			b.Fatalf("ListReceiveAccounts failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_UpdateReceiveAccount benchmarks account updates
func BenchmarkReceiveAccountService_UpdateReceiveAccount(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	account := createTestReceiveAccount()
	accountID := account.ID

	updateRequest := &UpdateReceiveAccountRequest{
		AccountName: stringPtr("Updated Account"),
		Status:      stringPtr("inactive"),
	}

	// Setup mocks for successful update
	mockRepo.On("GetByID", mock.Anything, accountID).Return(account, nil)
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.UpdateReceiveAccount(ctx, accountID, updateRequest)
		if err != nil {
			b.Fatalf("UpdateReceiveAccount failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_DeleteReceiveAccount benchmarks account deletion
func BenchmarkReceiveAccountService_DeleteReceiveAccount(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	account := createTestReceiveAccount()
	accountID := account.ID

	// Setup mocks for successful deletion
	mockRepo.On("GetByID", mock.Anything, accountID).Return(account, nil)
	mockMRARepo.On("GetByMerchant", mock.Anything, accountID).Return([]*repository.MerchantReceiveAccount{}, nil)
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := service.DeleteReceiveAccount(ctx, accountID)
		if err != nil {
			b.Fatalf("DeleteReceiveAccount failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_GetAccountsByMerchant benchmarks merchant account retrieval
func BenchmarkReceiveAccountService_GetAccountsByMerchant(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	merchantID := uuid.New()
	merchant := createTestMerchant()
	merchant.ID = merchantID

	accounts := make([]*repository.ReceiveAccount, 10)
	for i := 0; i < 10; i++ {
		accounts[i] = createTestReceiveAccount()
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
	mockRepo.On("GetByMerchant", mock.Anything, merchantID).Return(accounts, nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetAccountsByMerchant(ctx, merchantID)
		if err != nil {
			b.Fatalf("GetAccountsByMerchant failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_GetAvailableAccounts benchmarks available account retrieval
func BenchmarkReceiveAccountService_GetAvailableAccounts(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	merchantID := uuid.New()
	merchant := createTestMerchant()
	merchant.ID = merchantID
	amount := decimal.NewFromInt(500)
	paymentType := "public"

	accounts := make([]*repository.ReceiveAccount, 5)
	for i := 0; i < 5; i++ {
		accounts[i] = createTestReceiveAccount()
		accounts[i].DailyLimit = decimal.NewFromInt(10000)
		accounts[i].SingleLimit = decimal.NewFromInt(1000)
		accounts[i].DailyUsed = decimal.NewFromInt(100)
	}

	// Setup mocks
	mockMerchantRepo.On("GetByID", mock.Anything, merchantID).Return(merchant, nil)
	mockRepo.On("GetAvailableAccounts", mock.Anything, merchantID, amount, paymentType).Return(accounts, nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetAvailableAccounts(ctx, merchantID, amount, paymentType)
		if err != nil {
			b.Fatalf("GetAvailableAccounts failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_ConcurrentOperations benchmarks concurrent operations
func BenchmarkReceiveAccountService_ConcurrentOperations(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	account := createTestReceiveAccount()
	accountID := account.ID

	// Setup mocks for concurrent operations
	mockRepo.On("GetByID", mock.Anything, accountID).Return(account, nil)
	mockRepo.On("ExistsByAccountNumber", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)
	mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(1), nil)
	mockRepo.On("List", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return([]*repository.ReceiveAccount{account}, nil)

	ctx := context.Background()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			switch i % 4 {
			case 0:
				// Create operation
				req := &CreateReceiveAccountRequest{
					AccountName:   fmt.Sprintf("Concurrent Account %d", i),
					AccountNumber: fmt.Sprintf("CONC%d", i),
					AccountType:   "alipay",
					AccountHolder: "Concurrent Holder",
					PaymentType:   "public",
					DailyLimit:    decimal.NewFromInt(10000),
					SingleLimit:   decimal.NewFromInt(1000),
				}
				_, err := service.CreateReceiveAccount(ctx, req)
				if err != nil {
					b.Fatalf("Concurrent CreateReceiveAccount failed: %v", err)
				}
			case 1:
				// Read operation
				_, err := service.GetReceiveAccount(ctx, accountID)
				if err != nil {
					b.Fatalf("Concurrent GetReceiveAccount failed: %v", err)
				}
			case 2:
				// Update operation
				updateReq := &UpdateReceiveAccountRequest{
					AccountName: stringPtr(fmt.Sprintf("Updated Account %d", i)),
				}
				_, err := service.UpdateReceiveAccount(ctx, accountID, updateReq)
				if err != nil {
					b.Fatalf("Concurrent UpdateReceiveAccount failed: %v", err)
				}
			case 3:
				// List operation
				filter := &repository.ReceiveAccountFilter{Limit: 10, Offset: 0}
				_, _, err := service.ListReceiveAccounts(ctx, filter)
				if err != nil {
					b.Fatalf("Concurrent ListReceiveAccounts failed: %v", err)
				}
			}
			i++
		}
	})
}

// BenchmarkReceiveAccountService_ValidationOverhead benchmarks validation overhead
func BenchmarkReceiveAccountService_ValidationOverhead(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	// Setup mocks to isolate validation performance
	mockRepo.On("ExistsByAccountNumber", mock.Anything, mock.AnythingOfType("string")).Return(false, nil)
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccount")).Return(nil)

	ctx := context.Background()

	// Test with complex validation scenarios
	requests := []*CreateReceiveAccountRequest{
		{
			AccountName:   "Simple Account",
			AccountNumber: "SIMPLE123",
			AccountType:   "alipay",
			AccountHolder: "Simple Holder",
			PaymentType:   "public",
			DailyLimit:    decimal.NewFromInt(10000),
			SingleLimit:   decimal.NewFromInt(1000),
		},
		{
			AccountName:           "Complex Account with Custom Provider",
			AccountNumber:         "COMPLEX123",
			AccountType:           "other",
			CustomPaymentProvider: stringPtr("CustomProvider"),
			BankName:              stringPtr("Test Bank"),
			BankBranch:            stringPtr("Test Branch"),
			AccountHolder:         "Complex Holder",
			PaymentType:           "private",
			DailyLimit:            decimal.NewFromInt(50000),
			SingleLimit:           decimal.NewFromInt(5000),
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := requests[i%len(requests)]
		req.AccountNumber = fmt.Sprintf("%s_%d", req.AccountNumber, i)
		
		_, err := service.CreateReceiveAccount(ctx, req)
		if err != nil {
			b.Fatalf("Validation benchmark failed: %v", err)
		}
	}
}

// BenchmarkReceiveAccountService_MemoryUsage benchmarks memory usage patterns
func BenchmarkReceiveAccountService_MemoryUsage(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	// Create large dataset for memory testing
	accounts := make([]*repository.ReceiveAccount, 1000)
	for i := 0; i < 1000; i++ {
		accounts[i] = createTestReceiveAccount()
		accounts[i].AccountName = fmt.Sprintf("Memory Test Account %d", i)
		accounts[i].AccountNumber = fmt.Sprintf("MEM%d", i)
	}

	filter := &repository.ReceiveAccountFilter{
		Limit:  100,
		Offset: 0,
	}

	// Setup mocks
	mockRepo.On("Count", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(int64(1000), nil)
	mockRepo.On("List", mock.Anything, mock.AnythingOfType("*repository.ReceiveAccountFilter")).Return(accounts[:100], nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		results, total, err := service.ListReceiveAccounts(ctx, filter)
		if err != nil {
			b.Fatalf("Memory benchmark failed: %v", err)
		}
		
		// Process results to simulate real usage
		for _, account := range results {
			_ = account.AccountName
			_ = account.DailyLimit.String()
		}
		_ = total
	}
}

// BenchmarkReceiveAccountService_ErrorHandling benchmarks error handling performance
func BenchmarkReceiveAccountService_ErrorHandling(b *testing.B) {
	mockRepo := &MockReceiveAccountRepository{}
	mockMerchantRepo := &MockMerchantRepository{}
	mockMRARepo := &MockMerchantReceiveAccountRepository{}

	service := NewReceiveAccountService(mockRepo, mockMerchantRepo, mockMRARepo)

	accountID := uuid.New()

	// Setup mock to return error
	mockRepo.On("GetByID", mock.Anything, accountID).Return(nil, fmt.Errorf("account not found"))

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetReceiveAccount(ctx, accountID)
		if err == nil {
			b.Fatalf("Expected error but got none")
		}
	}
}
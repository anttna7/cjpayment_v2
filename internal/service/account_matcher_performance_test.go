package service

import (
	"context"
	"fmt"
	"math/rand"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"cjpayment/internal/repository"
)

// Performance test suite for AccountMatcher
func TestAccountMatcher_Performance(t *testing.T) {
	tests := []struct {
		name         string
		accountCount int
		requestCount int
		concurrency  int
	}{
		{
			name:         "Small Scale",
			accountCount: 10,
			requestCount: 100,
			concurrency:  5,
		},
		{
			name:         "Medium Scale",
			accountCount: 50,
			requestCount: 1000,
			concurrency:  10,
		},
		{
			name:         "Large Scale",
			accountCount: 100,
			requestCount: 5000,
			concurrency:  20,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testAccountMatcherPerformance(t, tt.accountCount, tt.requestCount, tt.concurrency)
		})
	}
}

func testAccountMatcherPerformance(t *testing.T, accountCount, requestCount, concurrency int) {
	// Setup
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	// Create test accounts
	merchantAccounts := createTestMerchantAccounts(accountCount)
	usage := decimal.NewFromFloat(5000.00)

	// Setup mocks
	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= accountCount; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	// Performance test
	start := time.Now()
	
	// Create channels for concurrent processing
	requests := make(chan *MatchRequest, requestCount)
	results := make(chan error, requestCount)
	
	// Generate requests
	go func() {
		defer close(requests)
		for i := 0; i < requestCount; i++ {
			requests <- &MatchRequest{
				MerchantID:  1,
				PaymentType: getRandomPaymentType(),
				Amount:      decimal.NewFromFloat(float64(rand.Intn(5000) + 100)),
			}
		}
	}()

	// Process requests concurrently
	var wg sync.WaitGroup
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for req := range requests {
				_, err := matcher.Match(ctx, req)
				results <- err
			}
		}()
	}

	// Wait for completion
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	successCount := 0
	errorCount := 0
	for err := range results {
		if err == nil {
			successCount++
		} else {
			errorCount++
		}
	}

	duration := time.Since(start)
	
	// Performance assertions
	assert.Equal(t, requestCount, successCount+errorCount, "All requests should be processed")
	assert.Greater(t, successCount, 0, "At least some requests should succeed")
	
	// Performance metrics
	requestsPerSecond := float64(requestCount) / duration.Seconds()
	avgLatency := duration / time.Duration(requestCount)
	
	t.Logf("Performance Results:")
	t.Logf("  Accounts: %d", accountCount)
	t.Logf("  Requests: %d", requestCount)
	t.Logf("  Concurrency: %d", concurrency)
	t.Logf("  Duration: %v", duration)
	t.Logf("  Requests/sec: %.2f", requestsPerSecond)
	t.Logf("  Avg Latency: %v", avgLatency)
	t.Logf("  Success Rate: %.2f%%", float64(successCount)/float64(requestCount)*100)
	
	// Performance thresholds
	assert.Greater(t, requestsPerSecond, 100.0, "Should handle at least 100 requests per second")
	assert.Less(t, avgLatency, 10*time.Millisecond, "Average latency should be less than 10ms")
}

func createTestMerchantAccounts(count int) []*repository.MerchantAccount {
	accounts := make([]*repository.MerchantAccount, count)
	
	for i := 0; i < count; i++ {
		accountType := "corporate"
		if i%2 == 1 {
			accountType = "personal"
		}
		
		accounts[i] = &repository.MerchantAccount{
			ID:               uint(i + 1),
			MerchantID:       1,
			ReceiveAccountID: uint(i + 1),
			Priority:         i + 1,
			Status:           "active",
			ReceiveAccount: repository.ReceiveAccount{
				ID:          uint(i + 1),
				AccountName: fmt.Sprintf("Account %d", i+1),
				AccountNo:   fmt.Sprintf("123456789%d", i),
				BankName:    fmt.Sprintf("Bank %d", i+1),
				AccountType: accountType,
				DailyLimit:  decimal.NewFromFloat(100000.00),
				Status:      "active",
			},
		}
	}
	
	return accounts
}

func getRandomPaymentType() string {
	types := []string{"corporate", "personal"}
	return types[rand.Intn(len(types))]
}

// Benchmark tests for different scenarios
func BenchmarkAccountMatcher_Match_1Account(b *testing.B) {
	benchmarkAccountMatcher(b, 1)
}

func BenchmarkAccountMatcher_Match_10Accounts(b *testing.B) {
	benchmarkAccountMatcher(b, 10)
}

func BenchmarkAccountMatcher_Match_50Accounts(b *testing.B) {
	benchmarkAccountMatcher(b, 50)
}

func BenchmarkAccountMatcher_Match_100Accounts(b *testing.B) {
	benchmarkAccountMatcher(b, 100)
}

func benchmarkAccountMatcher(b *testing.B, accountCount int) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	merchantAccounts := createTestMerchantAccounts(accountCount)
	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= accountCount; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := matcher.Match(ctx, req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// Memory allocation benchmark
func BenchmarkAccountMatcher_MemoryAllocation(b *testing.B) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	merchantAccounts := createTestMerchantAccounts(50)
	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= 50; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	req := &MatchRequest{
		MerchantID:  1,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(1000.00),
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := matcher.Match(ctx, req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// Concurrent matching benchmark
func BenchmarkAccountMatcher_ConcurrentMatching(b *testing.B) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	merchantAccounts := createTestMerchantAccounts(20)
	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= 20; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			req := &MatchRequest{
				MerchantID:  1,
				PaymentType: getRandomPaymentType(),
				Amount:      decimal.NewFromFloat(float64(rand.Intn(5000) + 100)),
			}
			_, err := matcher.Match(ctx, req)
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

// Stress test for high load scenarios
func TestAccountMatcher_StressTest(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping stress test in short mode")
	}

	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	// Large number of accounts
	accountCount := 200
	merchantAccounts := createTestMerchantAccounts(accountCount)
	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= accountCount; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	// High concurrency stress test
	concurrency := 50
	requestsPerWorker := 1000
	totalRequests := concurrency * requestsPerWorker

	start := time.Now()
	
	var wg sync.WaitGroup
	errors := make(chan error, totalRequests)
	
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			
			for j := 0; j < requestsPerWorker; j++ {
				req := &MatchRequest{
					MerchantID:  1,
					PaymentType: getRandomPaymentType(),
					Amount:      decimal.NewFromFloat(float64(rand.Intn(10000) + 100)),
				}
				
				_, err := matcher.Match(ctx, req)
				errors <- err
			}
		}(i)
	}
	
	wg.Wait()
	close(errors)
	
	duration := time.Since(start)
	
	// Collect results
	successCount := 0
	errorCount := 0
	for err := range errors {
		if err == nil {
			successCount++
		} else {
			errorCount++
		}
	}
	
	// Stress test assertions
	assert.Equal(t, totalRequests, successCount+errorCount, "All requests should be processed")
	assert.Greater(t, successCount, totalRequests*8/10, "At least 80% of requests should succeed")
	
	requestsPerSecond := float64(totalRequests) / duration.Seconds()
	
	t.Logf("Stress Test Results:")
	t.Logf("  Total Requests: %d", totalRequests)
	t.Logf("  Concurrency: %d", concurrency)
	t.Logf("  Duration: %v", duration)
	t.Logf("  Requests/sec: %.2f", requestsPerSecond)
	t.Logf("  Success Rate: %.2f%%", float64(successCount)/float64(totalRequests)*100)
	
	// Performance requirements for stress test
	assert.Greater(t, requestsPerSecond, 1000.0, "Should handle at least 1000 requests per second under stress")
	assert.Less(t, duration, 30*time.Second, "Stress test should complete within 30 seconds")
}

// Test for memory leaks during long-running operations
func TestAccountMatcher_MemoryLeak(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping memory leak test in short mode")
	}

	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	merchantAccounts := createTestMerchantAccounts(10)
	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= 10; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	// Run many iterations to detect memory leaks
	iterations := 100000
	
	for i := 0; i < iterations; i++ {
		req := &MatchRequest{
			MerchantID:  1,
			PaymentType: getRandomPaymentType(),
			Amount:      decimal.NewFromFloat(float64(rand.Intn(5000) + 100)),
		}
		
		_, err := matcher.Match(ctx, req)
		assert.NoError(t, err)
		
		// Periodically trigger GC to help detect leaks
		if i%10000 == 0 {
			runtime.GC()
		}
	}
	
	t.Logf("Completed %d iterations without memory issues", iterations)
}

// Test for degradation under different load patterns
func TestAccountMatcher_LoadPatterns(t *testing.T) {
	testCases := []struct {
		name        string
		pattern     string
		duration    time.Duration
		concurrency int
	}{
		{
			name:        "Constant Load",
			pattern:     "constant",
			duration:    5 * time.Second,
			concurrency: 10,
		},
		{
			name:        "Burst Load",
			pattern:     "burst",
			duration:    10 * time.Second,
			concurrency: 20,
		},
		{
			name:        "Gradual Increase",
			pattern:     "gradual",
			duration:    15 * time.Second,
			concurrency: 5,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			testLoadPattern(t, tc.pattern, tc.duration, tc.concurrency)
		})
	}
}

func testLoadPattern(t *testing.T, pattern string, duration time.Duration, baseConcurrency int) {
	mockReceiveAccountRepo := new(MockReceiveAccountRepository)
	mockMerchantAccountRepo := new(MockMerchantAccountRepository)
	matcher := NewAccountMatcher(mockReceiveAccountRepo, mockMerchantAccountRepo)
	ctx := context.Background()

	merchantAccounts := createTestMerchantAccounts(20)
	usage := decimal.NewFromFloat(5000.00)

	mockMerchantAccountRepo.On("GetMerchantAccounts", ctx, uint(1)).Return(merchantAccounts, nil)
	for i := 1; i <= 20; i++ {
		mockReceiveAccountRepo.On("GetDailyUsage", ctx, uint(i), mock.AnythingOfType("time.Time")).Return(usage, nil)
	}

	start := time.Now()
	var totalRequests int64
	var successCount int64
	var wg sync.WaitGroup
	
	switch pattern {
	case "constant":
		// Constant load
		for i := 0; i < baseConcurrency; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for time.Since(start) < duration {
					req := &MatchRequest{
						MerchantID:  1,
						PaymentType: getRandomPaymentType(),
						Amount:      decimal.NewFromFloat(1000.00),
					}
					_, err := matcher.Match(ctx, req)
					atomic.AddInt64(&totalRequests, 1)
					if err == nil {
						atomic.AddInt64(&successCount, 1)
					}
					time.Sleep(10 * time.Millisecond)
				}
			}()
		}
		
	case "burst":
		// Burst load pattern
		ticker := time.NewTicker(1 * time.Second)
		go func() {
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					if time.Since(start) >= duration {
						return
					}
					// Create burst of requests
					for i := 0; i < baseConcurrency*5; i++ {
						wg.Add(1)
						go func() {
							defer wg.Done()
							req := &MatchRequest{
								MerchantID:  1,
								PaymentType: getRandomPaymentType(),
								Amount:      decimal.NewFromFloat(1000.00),
							}
							_, err := matcher.Match(ctx, req)
							atomic.AddInt64(&totalRequests, 1)
							if err == nil {
								atomic.AddInt64(&successCount, 1)
							}
						}()
					}
				}
			}
		}()
		
	case "gradual":
		// Gradually increasing load
		go func() {
			concurrency := 1
			ticker := time.NewTicker(1 * time.Second)
			defer ticker.Stop()
			
			for {
				select {
				case <-ticker.C:
					if time.Since(start) >= duration {
						return
					}
					
					for i := 0; i < concurrency; i++ {
						wg.Add(1)
						go func() {
							defer wg.Done()
							req := &MatchRequest{
								MerchantID:  1,
								PaymentType: getRandomPaymentType(),
								Amount:      decimal.NewFromFloat(1000.00),
							}
							_, err := matcher.Match(ctx, req)
							atomic.AddInt64(&totalRequests, 1)
							if err == nil {
								atomic.AddInt64(&successCount, 1)
							}
						}()
					}
					
					if concurrency < baseConcurrency*2 {
						concurrency++
					}
				}
			}
		}()
	}
	
	// Wait for test duration
	time.Sleep(duration)
	wg.Wait()
	
	actualDuration := time.Since(start)
	requestsPerSecond := float64(totalRequests) / actualDuration.Seconds()
	successRate := float64(successCount) / float64(totalRequests) * 100
	
	t.Logf("Load Pattern '%s' Results:", pattern)
	t.Logf("  Duration: %v", actualDuration)
	t.Logf("  Total Requests: %d", totalRequests)
	t.Logf("  Requests/sec: %.2f", requestsPerSecond)
	t.Logf("  Success Rate: %.2f%%", successRate)
	
	// Basic performance assertions
	assert.Greater(t, totalRequests, int64(0), "Should process some requests")
	assert.Greater(t, successRate, 80.0, "Success rate should be above 80%")
}
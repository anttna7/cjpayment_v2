package performance

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/internal/service"
	"github.com/company/cjpayment/pkg/database"
	"github.com/company/cjpayment/pkg/logger"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"
)

// BenchmarkSetup provides common setup for benchmarks
type BenchmarkSetup struct {
	DB           *sqlx.DB
	Redis        *redis.Client
	Config       *config.Config
	RepoManager  *repository.Manager
	ServiceManager *service.Manager
}

func setupBenchmark(b *testing.B) *BenchmarkSetup {
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     getEnvOrDefault("TEST_DB_HOST", "localhost"),
			Port:     getEnvOrDefault("TEST_DB_PORT", "5432"),
			User:     getEnvOrDefault("TEST_DB_USER", "cjpayment_test"),
			Password: getEnvOrDefault("TEST_DB_PASSWORD", "test_password"),
			DBName:   getEnvOrDefault("TEST_DB_NAME", "cjpayment_test"),
			SSLMode:  "disable",
		},
		Redis: config.RedisConfig{
			Host:     getEnvOrDefault("TEST_REDIS_HOST", "localhost"),
			Port:     getEnvOrDefault("TEST_REDIS_PORT", "6379"),
			Password: "",
			DB:       0,
		},
		JWT: config.JWTConfig{
			Secret:     "benchmark-secret-key",
			Expiration: time.Hour * 24,
		},
		LogLevel: "error", // Reduce logging for benchmarks
	}

	logger.Init(cfg.LogLevel)

	db, err := database.ConnectX(cfg.Database)
	if err != nil {
		b.Fatalf("Failed to connect to database: %v", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		DB:   cfg.Redis.DB,
	})

	repoManager := repository.NewManager(db)
	serviceManager := service.NewManager(repoManager, rdb, cfg)

	return &BenchmarkSetup{
		DB:             db,
		Redis:          rdb,
		Config:         cfg,
		RepoManager:    repoManager,
		ServiceManager: serviceManager,
	}
}

func (setup *BenchmarkSetup) cleanup() {
	if setup.DB != nil {
		setup.DB.Close()
	}
	if setup.Redis != nil {
		setup.Redis.Close()
	}
}

// BenchmarkDatabaseOperations benchmarks various database operations
func BenchmarkDatabaseOperations(b *testing.B) {
	setup := setupBenchmark(b)
	defer setup.cleanup()

	b.Run("UserRepository_Create", func(b *testing.B) {
		userRepo := setup.RepoManager.User()
		b.ResetTimer()
		
		for i := 0; i < b.N; i++ {
			user := &repository.User{
				ID:       uuid.New().String(),
				Username: fmt.Sprintf("bench_user_%d", i),
				Email:    fmt.Sprintf("bench%d@example.com", i),
				Password: "hashed_password",
				Status:   "active",
			}
			
			err := userRepo.Create(context.Background(), user)
			if err != nil {
				b.Fatalf("Failed to create user: %v", err)
			}
		}
	})

	b.Run("UserRepository_GetByID", func(b *testing.B) {
		userRepo := setup.RepoManager.User()
		
		// Create test user
		testUser := &repository.User{
			ID:       uuid.New().String(),
			Username: "benchmark_user",
			Email:    "benchmark@example.com",
			Password: "hashed_password",
			Status:   "active",
		}
		userRepo.Create(context.Background(), testUser)
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			_, err := userRepo.GetByID(context.Background(), testUser.ID)
			if err != nil {
				b.Fatalf("Failed to get user: %v", err)
			}
		}
	})

	b.Run("MerchantRepository_Create", func(b *testing.B) {
		merchantRepo := setup.RepoManager.Merchant()
		b.ResetTimer()
		
		for i := 0; i < b.N; i++ {
			merchant := &repository.Merchant{
				ID:     uuid.New().String(),
				Name:   fmt.Sprintf("Benchmark Merchant %d", i),
				Code:   fmt.Sprintf("BM%d", i),
				Status: "active",
			}
			
			err := merchantRepo.Create(context.Background(), merchant)
			if err != nil {
				b.Fatalf("Failed to create merchant: %v", err)
			}
		}
	})

	b.Run("RechargeOrderRepository_Create", func(b *testing.B) {
		rechargeRepo := setup.RepoManager.RechargeOrder()
		
		// Create test merchant and account
		merchant := &repository.Merchant{
			ID:     uuid.New().String(),
			Name:   "Benchmark Merchant",
			Code:   "BM001",
			Status: "active",
		}
		setup.RepoManager.Merchant().Create(context.Background(), merchant)
		
		account := &repository.ReceiveAccount{
			ID:            uuid.New().String(),
			AccountName:   "Benchmark Account",
			AccountNumber: "12345678901",
			AccountType:   "bank",
			AccountHolder: "Test Holder",
			PaymentType:   "private",
			Status:        "active",
		}
		setup.RepoManager.ReceiveAccount().Create(context.Background(), account)
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			order := &repository.RechargeOrder{
				ID:                uuid.New().String(),
				OrderNumber:       fmt.Sprintf("ORD%d%d", time.Now().Unix(), i),
				PayerName:         fmt.Sprintf("Payer %d", i),
				PayerAccount:      fmt.Sprintf("98765432%d", i),
				PaymentType:       "private",
				Amount:            decimal.NewFromFloat(100.00),
				MerchantID:        merchant.ID,
				AdAccount:         fmt.Sprintf("AD%d", i),
				ReceiveAccountID:  account.ID,
				Status:            "pending",
			}
			
			err := rechargeRepo.Create(context.Background(), order)
			if err != nil {
				b.Fatalf("Failed to create recharge order: %v", err)
			}
		}
	})
}

// BenchmarkServiceOperations benchmarks service layer operations
func BenchmarkServiceOperations(b *testing.B) {
	setup := setupBenchmark(b)
	defer setup.cleanup()

	b.Run("AuthService_GenerateToken", func(b *testing.B) {
		authService := setup.ServiceManager.Auth()
		
		user := &repository.User{
			ID:       uuid.New().String(),
			Username: "benchmark_user",
			Email:    "benchmark@example.com",
			Status:   "active",
		}
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			_, err := authService.GenerateToken(user)
			if err != nil {
				b.Fatalf("Failed to generate token: %v", err)
			}
		}
	})

	b.Run("AuthService_ValidateToken", func(b *testing.B) {
		authService := setup.ServiceManager.Auth()
		
		user := &repository.User{
			ID:       uuid.New().String(),
			Username: "benchmark_user",
			Email:    "benchmark@example.com",
			Status:   "active",
		}
		
		token, err := authService.GenerateToken(user)
		if err != nil {
			b.Fatalf("Failed to generate token: %v", err)
		}
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			_, err := authService.ValidateToken(token)
			if err != nil {
				b.Fatalf("Failed to validate token: %v", err)
			}
		}
	})

	b.Run("RechargeService_CreateOrder", func(b *testing.B) {
		rechargeService := setup.ServiceManager.Recharge()
		
		// Setup test data
		merchant := &repository.Merchant{
			ID:     uuid.New().String(),
			Name:   "Benchmark Merchant",
			Code:   "BM001",
			Status: "active",
		}
		setup.RepoManager.Merchant().Create(context.Background(), merchant)
		
		account := &repository.ReceiveAccount{
			ID:            uuid.New().String(),
			AccountName:   "Benchmark Account",
			AccountNumber: "12345678901",
			AccountType:   "bank",
			AccountHolder: "Test Holder",
			PaymentType:   "private",
			Status:        "active",
			DailyLimit:    decimal.NewFromFloat(100000),
			SingleLimit:   decimal.NewFromFloat(10000),
		}
		setup.RepoManager.ReceiveAccount().Create(context.Background(), account)
		
		// Link merchant and account
		link := &repository.MerchantReceiveAccount{
			ID:               uuid.New().String(),
			MerchantID:       merchant.ID,
			ReceiveAccountID: account.ID,
			Weight:           1,
			IsActive:         true,
		}
		setup.RepoManager.MerchantReceiveAccount().Create(context.Background(), link)
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			req := &service.CreateRechargeRequest{
				PayerName:    fmt.Sprintf("Payer %d", i),
				PayerAccount: fmt.Sprintf("98765432%d", i),
				PaymentType:  "private",
				Amount:       decimal.NewFromFloat(100.00),
				MerchantName: "Benchmark Merchant",
				AdAccount:    fmt.Sprintf("AD%d", i),
				Remark:       "Benchmark test",
			}
			
			_, err := rechargeService.CreateRecharge(context.Background(), req)
			if err != nil {
				b.Fatalf("Failed to create recharge: %v", err)
			}
		}
	})
}

// BenchmarkRedisOperations benchmarks Redis operations
func BenchmarkRedisOperations(b *testing.B) {
	setup := setupBenchmark(b)
	defer setup.cleanup()

	ctx := context.Background()

	b.Run("Redis_Set", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			key := fmt.Sprintf("benchmark:set:%d", i)
			value := fmt.Sprintf("value_%d", i)
			
			err := setup.Redis.Set(ctx, key, value, time.Minute).Err()
			if err != nil {
				b.Fatalf("Failed to set Redis key: %v", err)
			}
		}
	})

	b.Run("Redis_Get", func(b *testing.B) {
		// Setup test data
		testKey := "benchmark:get:test"
		testValue := "test_value"
		setup.Redis.Set(ctx, testKey, testValue, time.Minute)
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			_, err := setup.Redis.Get(ctx, testKey).Result()
			if err != nil {
				b.Fatalf("Failed to get Redis key: %v", err)
			}
		}
	})

	b.Run("Redis_Pipeline", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			pipe := setup.Redis.Pipeline()
			
			for j := 0; j < 10; j++ {
				key := fmt.Sprintf("benchmark:pipeline:%d:%d", i, j)
				value := fmt.Sprintf("value_%d_%d", i, j)
				pipe.Set(ctx, key, value, time.Minute)
			}
			
			_, err := pipe.Exec(ctx)
			if err != nil {
				b.Fatalf("Failed to execute Redis pipeline: %v", err)
			}
		}
	})

	b.Run("Redis_Publish", func(b *testing.B) {
		channel := "benchmark:channel"
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			message := fmt.Sprintf("message_%d", i)
			
			err := setup.Redis.Publish(ctx, channel, message).Err()
			if err != nil {
				b.Fatalf("Failed to publish Redis message: %v", err)
			}
		}
	})
}

// BenchmarkConcurrentOperations benchmarks operations under concurrent load
func BenchmarkConcurrentOperations(b *testing.B) {
	setup := setupBenchmark(b)
	defer setup.cleanup()

	b.Run("Concurrent_UserCreation", func(b *testing.B) {
		userRepo := setup.RepoManager.User()
		
		b.RunParallel(func(pb *testing.PB) {
			i := 0
			for pb.Next() {
				user := &repository.User{
					ID:       uuid.New().String(),
					Username: fmt.Sprintf("concurrent_user_%d", i),
					Email:    fmt.Sprintf("concurrent%d@example.com", i),
					Password: "hashed_password",
					Status:   "active",
				}
				
				err := userRepo.Create(context.Background(), user)
				if err != nil {
					b.Fatalf("Failed to create user: %v", err)
				}
				i++
			}
		})
	})

	b.Run("Concurrent_TokenGeneration", func(b *testing.B) {
		authService := setup.ServiceManager.Auth()
		
		user := &repository.User{
			ID:       uuid.New().String(),
			Username: "concurrent_user",
			Email:    "concurrent@example.com",
			Status:   "active",
		}
		
		b.RunParallel(func(pb *testing.PB) {
			for pb.Next() {
				_, err := authService.GenerateToken(user)
				if err != nil {
					b.Fatalf("Failed to generate token: %v", err)
				}
			}
		})
	})

	b.Run("Concurrent_RedisOperations", func(b *testing.B) {
		ctx := context.Background()
		
		b.RunParallel(func(pb *testing.PB) {
			i := 0
			for pb.Next() {
				key := fmt.Sprintf("concurrent:key:%d", i)
				value := fmt.Sprintf("value_%d", i)
				
				// Set
				err := setup.Redis.Set(ctx, key, value, time.Minute).Err()
				if err != nil {
					b.Fatalf("Failed to set Redis key: %v", err)
				}
				
				// Get
				_, err = setup.Redis.Get(ctx, key).Result()
				if err != nil {
					b.Fatalf("Failed to get Redis key: %v", err)
				}
				
				i++
			}
		})
	})
}

// BenchmarkMemoryAllocations benchmarks memory allocations
func BenchmarkMemoryAllocations(b *testing.B) {
	setup := setupBenchmark(b)
	defer setup.cleanup()

	b.Run("UserStruct_Creation", func(b *testing.B) {
		b.ReportAllocs()
		b.ResetTimer()
		
		for i := 0; i < b.N; i++ {
			user := &repository.User{
				ID:       uuid.New().String(),
				Username: fmt.Sprintf("user_%d", i),
				Email:    fmt.Sprintf("user%d@example.com", i),
				Password: "password",
				Status:   "active",
			}
			_ = user // Prevent optimization
		}
	})

	b.Run("RechargeOrder_Creation", func(b *testing.B) {
		b.ReportAllocs()
		b.ResetTimer()
		
		for i := 0; i < b.N; i++ {
			order := &repository.RechargeOrder{
				ID:               uuid.New().String(),
				OrderNumber:      fmt.Sprintf("ORD%d", i),
				PayerName:        fmt.Sprintf("Payer %d", i),
				PayerAccount:     fmt.Sprintf("98765432%d", i),
				PaymentType:      "private",
				Amount:           decimal.NewFromFloat(100.00),
				MerchantID:       uuid.New().String(),
				AdAccount:        fmt.Sprintf("AD%d", i),
				ReceiveAccountID: uuid.New().String(),
				Status:           "pending",
			}
			_ = order // Prevent optimization
		}
	})

	b.Run("JSON_Marshal_Unmarshal", func(b *testing.B) {
		user := &repository.User{
			ID:       uuid.New().String(),
			Username: "test_user",
			Email:    "test@example.com",
			Password: "password",
			Status:   "active",
		}
		
		b.ReportAllocs()
		b.ResetTimer()
		
		for i := 0; i < b.N; i++ {
			// Marshal
			data, err := json.Marshal(user)
			if err != nil {
				b.Fatalf("Failed to marshal: %v", err)
			}
			
			// Unmarshal
			var unmarshaled repository.User
			err = json.Unmarshal(data, &unmarshaled)
			if err != nil {
				b.Fatalf("Failed to unmarshal: %v", err)
			}
		}
	})
}
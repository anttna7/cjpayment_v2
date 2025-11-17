package performance

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"cjpayment/internal/repository"
	"cjpayment/internal/service"
	"cjpayment/pkg/database"
)

// ConcurrencyStressTestSuite 并发压力测试套件
type ConcurrencyStressTestSuite struct {
	suite.Suite
	db              *gorm.DB
	merchantService service.MerchantService
	accountService  service.MerchantAccountService
	rechargeService service.RechargeService
	matcherService  service.AccountMatcher
	notifyService   service.NotificationService
	repoManager     *repository.Manager
	
	// 测试统计
	totalRequests    int64
	successRequests  int64
	failedRequests   int64
	totalLatency     int64
	maxLatency       int64
	minLatency       int64
}

// SetupSuite 初始化测试套件
func (s *ConcurrencyStressTestSuite) SetupSuite() {
	// 初始化数据库连接
	var err error
	s.db, err = database.NewTestConnection()
	s.Require().NoError(err)

	// 运行迁移
	err = database.RunMigrations(s.db)
	s.Require().NoError(err)

	// 初始化仓储管理器
	s.repoManager = repository.NewManager(s.db)

	// 初始化服务
	s.merchantService = service.NewMerchantService(s.repoManager.Merchant())
	s.accountService = service.NewMerchantAccountService(s.repoManager.MerchantAccount(), s.repoManager.ReceiveAccount())
	s.rechargeService = service.NewRechargeService(s.repoManager.RechargeOrder(), s.repoManager.ReceiveAccount())
	s.matcherService = service.NewAccountMatcher(s.repoManager.ReceiveAccount(), s.repoManager.MerchantAccount())
	s.notifyService = service.NewNotificationService(s.repoManager.Notification())

	// 初始化统计
	s.minLatency = int64(^uint64(0) >> 1) // 最大int64值
}

// TearDownSuite 清理测试套件
func (s *ConcurrencyStressTestSuite) TearDownSuite() {
	if s.db != nil {
		s.cleanupTestData()
		sqlDB, _ := s.db.DB()
		sqlDB.Close()
	}
}

// SetupTest 每个测试前的准备
func (s *ConcurrencyStressTestSuite) SetupTest() {
	s.cleanupTestData()
	s.resetStats()
}

// cleanupTestData 清理测试数据
func (s *ConcurrencyStressTestSuite) cleanupTestData() {
	tables := []string{
		"notifications",
		"recharge_orders",
		"merchant_accounts",
		"merchants",
		"receive_accounts",
		"users",
		"roles",
	}

	for _, table := range tables {
		s.db.Exec(fmt.Sprintf("DELETE FROM %s", table))
	}
}

// resetStats 重置统计数据
func (s *ConcurrencyStressTestSuite) resetStats() {
	atomic.StoreInt64(&s.totalRequests, 0)
	atomic.StoreInt64(&s.successRequests, 0)
	atomic.StoreInt64(&s.failedRequests, 0)
	atomic.StoreInt64(&s.totalLatency, 0)
	atomic.StoreInt64(&s.maxLatency, 0)
	atomic.StoreInt64(&s.minLatency, int64(^uint64(0)>>1))
}

// updateStats 更新统计数据
func (s *ConcurrencyStressTestSuite) updateStats(latency int64, success bool) {
	atomic.AddInt64(&s.totalRequests, 1)
	if success {
		atomic.AddInt64(&s.successRequests, 1)
	} else {
		atomic.AddInt64(&s.failedRequests, 1)
	}
	
	atomic.AddInt64(&s.totalLatency, latency)
	
	// 更新最大延迟
	for {
		current := atomic.LoadInt64(&s.maxLatency)
		if latency <= current || atomic.CompareAndSwapInt64(&s.maxLatency, current, latency) {
			break
		}
	}
	
	// 更新最小延迟
	for {
		current := atomic.LoadInt64(&s.minLatency)
		if latency >= current || atomic.CompareAndSwapInt64(&s.minLatency, current, latency) {
			break
		}
	}
}

// printStats 打印统计信息
func (s *ConcurrencyStressTestSuite) printStats() {
	total := atomic.LoadInt64(&s.totalRequests)
	success := atomic.LoadInt64(&s.successRequests)
	failed := atomic.LoadInt64(&s.failedRequests)
	totalLatency := atomic.LoadInt64(&s.totalLatency)
	maxLatency := atomic.LoadInt64(&s.maxLatency)
	minLatency := atomic.LoadInt64(&s.minLatency)
	
	if total > 0 {
		avgLatency := totalLatency / total
		successRate := float64(success) / float64(total) * 100
		
		fmt.Printf("\n=== 性能测试统计 ===\n")
		fmt.Printf("总请求数: %d\n", total)
		fmt.Printf("成功请求: %d\n", success)
		fmt.Printf("失败请求: %d\n", failed)
		fmt.Printf("成功率: %.2f%%\n", successRate)
		fmt.Printf("平均延迟: %d ms\n", avgLatency)
		fmt.Printf("最大延迟: %d ms\n", maxLatency)
		fmt.Printf("最小延迟: %d ms\n", minLatency)
		fmt.Printf("==================\n")
	}
}

// TestHighConcurrencyOrderCreation 测试高并发订单创建
func (s *ConcurrencyStressTestSuite) TestHighConcurrencyOrderCreation() {
	ctx := context.Background()
	
	// 准备测试数据
	merchants := s.createTestMerchants(ctx, 10)
	accounts := s.createTestAccounts(ctx, 20)
	s.bindAccountsToMerchants(ctx, merchants, accounts)
	
	// 并发参数
	concurrency := 100
	requestsPerGoroutine := 50
	totalRequests := concurrency * requestsPerGoroutine
	
	fmt.Printf("开始高并发订单创建测试: %d 并发, 每个协程 %d 请求, 总计 %d 请求\n", 
		concurrency, requestsPerGoroutine, totalRequests)
	
	var wg sync.WaitGroup
	startTime := time.Now()
	
	// 启动并发协程
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			
			for j := 0; j < requestsPerGoroutine; j++ {
				requestStart := time.Now()
				
				// 随机选择商户
				merchant := merchants[rand.Intn(len(merchants))]
				
				// 创建订单请求
				createReq := &service.CreateRechargeOrderRequest{
					MerchantID:  merchant.ID,
					PayerName:   fmt.Sprintf("并发用户_%d_%d", goroutineID, j),
					Amount:      decimal.NewFromFloat(float64(rand.Intn(10000) + 100)),
					AdAccount:   fmt.Sprintf("AD_%d_%d_%d", goroutineID, j, time.Now().UnixNano()),
					PaymentType: []string{"corporate", "personal"}[rand.Intn(2)],
				}
				
				// 执行创建订单
				_, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
				
				latency := time.Since(requestStart).Milliseconds()
				s.updateStats(latency, err == nil)
				
				if err != nil && testing.Verbose() {
					fmt.Printf("订单创建失败 [G%d-R%d]: %v\n", goroutineID, j, err)
				}
			}
		}(i)
	}
	
	// 等待所有协程完成
	wg.Wait()
	duration := time.Since(startTime)
	
	// 打印统计信息
	s.printStats()
	fmt.Printf("总耗时: %v\n", duration)
	fmt.Printf("QPS: %.2f\n", float64(totalRequests)/duration.Seconds())
	
	// 验证结果
	total := atomic.LoadInt64(&s.totalRequests)
	success := atomic.LoadInt64(&s.successRequests)
	
	s.Assert().Equal(int64(totalRequests), total)
	s.Assert().Greater(success, int64(totalRequests*8/10)) // 至少80%成功率
	
	// 验证数据库中的订单数量
	var orderCount int64
	err := s.db.Model(&repository.RechargeOrder{}).Count(&orderCount).Error
	s.Require().NoError(err)
	s.Assert().Equal(success, orderCount)
}

// TestConcurrentAccountMatching 测试并发账号匹配
func (s *ConcurrencyStressTestSuite) TestConcurrentAccountMatching() {
	ctx := context.Background()
	
	// 准备测试数据
	merchants := s.createTestMerchants(ctx, 5)
	accounts := s.createTestAccounts(ctx, 10)
	s.bindAccountsToMerchants(ctx, merchants, accounts)
	
	// 并发参数
	concurrency := 50
	requestsPerGoroutine := 100
	
	fmt.Printf("开始并发账号匹配测试: %d 并发, 每个协程 %d 请求\n", concurrency, requestsPerGoroutine)
	
	var wg sync.WaitGroup
	startTime := time.Now()
	
	// 启动并发协程
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			
			for j := 0; j < requestsPerGoroutine; j++ {
				requestStart := time.Now()
				
				// 随机选择商户和参数
				merchant := merchants[rand.Intn(len(merchants))]
				paymentType := []string{"corporate", "personal"}[rand.Intn(2)]
				amount := decimal.NewFromFloat(float64(rand.Intn(50000) + 1000))
				
				// 执行账号匹配
				matchReq := &service.MatchRequest{
					MerchantID:  merchant.ID,
					PaymentType: paymentType,
					Amount:      amount,
				}
				
				_, err := s.matcherService.Match(ctx, matchReq)
				
				latency := time.Since(requestStart).Milliseconds()
				s.updateStats(latency, err == nil)
				
				if err != nil && testing.Verbose() {
					fmt.Printf("账号匹配失败 [G%d-R%d]: %v\n", goroutineID, j, err)
				}
			}
		}(i)
	}
	
	// 等待所有协程完成
	wg.Wait()
	duration := time.Since(startTime)
	
	// 打印统计信息
	s.printStats()
	fmt.Printf("总耗时: %v\n", duration)
	
	// 验证结果
	success := atomic.LoadInt64(&s.successRequests)
	total := atomic.LoadInt64(&s.totalRequests)
	
	s.Assert().Greater(success, total*7/10) // 至少70%成功率
	
	// 验证平均延迟
	avgLatency := atomic.LoadInt64(&s.totalLatency) / total
	s.Assert().Less(avgLatency, int64(100)) // 平均延迟小于100ms
}

// TestConcurrentOrderStatusUpdate 测试并发订单状态更新
func (s *ConcurrencyStressTestSuite) TestConcurrentOrderStatusUpdate() {
	ctx := context.Background()
	
	// 准备测试数据
	merchants := s.createTestMerchants(ctx, 3)
	accounts := s.createTestAccounts(ctx, 5)
	s.bindAccountsToMerchants(ctx, merchants, accounts)
	
	// 创建测试订单
	orders := s.createTestOrders(ctx, merchants, 100)
	
	// 并发参数
	concurrency := 20
	
	fmt.Printf("开始并发订单状态更新测试: %d 并发, %d 订单\n", concurrency, len(orders))
	
	var wg sync.WaitGroup
	startTime := time.Now()
	
	// 为每个订单启动一个协程进行状态更新
	orderChan := make(chan *repository.RechargeOrder, len(orders))
	for _, order := range orders {
		orderChan <- order
	}
	close(orderChan)
	
	// 启动并发协程
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			
			for order := range orderChan {
				requestStart := time.Now()
				
				// 随机选择状态更新
				statuses := []string{"paid", "confirmed", "completed"}
				newStatus := statuses[rand.Intn(len(statuses))]
				remark := fmt.Sprintf("并发更新测试 G%d", goroutineID)
				
				// 执行状态更新
				err := s.rechargeService.UpdateOrderStatus(ctx, order.OrderNo, newStatus, remark)
				
				latency := time.Since(requestStart).Milliseconds()
				s.updateStats(latency, err == nil)
				
				if err != nil && testing.Verbose() {
					fmt.Printf("状态更新失败 [G%d] Order %s: %v\n", goroutineID, order.OrderNo, err)
				}
			}
		}(i)
	}
	
	// 等待所有协程完成
	wg.Wait()
	duration := time.Since(startTime)
	
	// 打印统计信息
	s.printStats()
	fmt.Printf("总耗时: %v\n", duration)
	
	// 验证结果
	success := atomic.LoadInt64(&s.successRequests)
	total := atomic.LoadInt64(&s.totalRequests)
	
	s.Assert().Equal(int64(len(orders)), total)
	s.Assert().Greater(success, total*8/10) // 至少80%成功率
}

// TestDatabaseConnectionPool 测试数据库连接池性能
func (s *ConcurrencyStressTestSuite) TestDatabaseConnectionPool() {
	ctx := context.Background()
	
	// 并发参数
	concurrency := 200
	requestsPerGoroutine := 50
	
	fmt.Printf("开始数据库连接池测试: %d 并发, 每个协程 %d 请求\n", concurrency, requestsPerGoroutine)
	
	var wg sync.WaitGroup
	startTime := time.Now()
	
	// 启动并发协程
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			
			for j := 0; j < requestsPerGoroutine; j++ {
				requestStart := time.Now()
				
				// 执行简单的数据库查询
				var count int64
				err := s.db.WithContext(ctx).Model(&repository.Merchant{}).Count(&count).Error
				
				latency := time.Since(requestStart).Milliseconds()
				s.updateStats(latency, err == nil)
				
				if err != nil && testing.Verbose() {
					fmt.Printf("数据库查询失败 [G%d-R%d]: %v\n", goroutineID, j, err)
				}
			}
		}(i)
	}
	
	// 等待所有协程完成
	wg.Wait()
	duration := time.Since(startTime)
	
	// 打印统计信息
	s.printStats()
	fmt.Printf("总耗时: %v\n", duration)
	
	// 验证结果
	success := atomic.LoadInt64(&s.successRequests)
	total := atomic.LoadInt64(&s.totalRequests)
	
	s.Assert().Equal(success, total) // 应该100%成功
	
	// 验证平均延迟
	avgLatency := atomic.LoadInt64(&s.totalLatency) / total
	s.Assert().Less(avgLatency, int64(50)) // 平均延迟小于50ms
}

// TestMemoryUsage 测试内存使用情况
func (s *ConcurrencyStressTestSuite) TestMemoryUsage() {
	ctx := context.Background()
	
	// 准备测试数据
	merchants := s.createTestMerchants(ctx, 5)
	accounts := s.createTestAccounts(ctx, 10)
	s.bindAccountsToMerchants(ctx, merchants, accounts)
	
	// 记录初始内存使用
	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)
	
	// 创建大量订单
	orderCount := 1000
	fmt.Printf("开始内存使用测试: 创建 %d 个订单\n", orderCount)
	
	startTime := time.Now()
	
	for i := 0; i < orderCount; i++ {
		merchant := merchants[rand.Intn(len(merchants))]
		
		createReq := &service.CreateRechargeOrderRequest{
			MerchantID:  merchant.ID,
			PayerName:   fmt.Sprintf("内存测试用户_%d", i),
			Amount:      decimal.NewFromFloat(float64(rand.Intn(10000) + 100)),
			AdAccount:   fmt.Sprintf("AD_MEM_%d", i),
			PaymentType: []string{"corporate", "personal"}[rand.Intn(2)],
		}
		
		_, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
		s.Require().NoError(err)
		
		// 每100个订单检查一次内存
		if (i+1)%100 == 0 {
			runtime.GC()
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			fmt.Printf("已创建 %d 订单, 内存使用: %.2f MB\n", i+1, float64(m.Alloc)/1024/1024)
		}
	}
	
	duration := time.Since(startTime)
	
	// 记录最终内存使用
	runtime.GC()
	runtime.ReadMemStats(&m2)
	
	fmt.Printf("订单创建完成, 耗时: %v\n", duration)
	fmt.Printf("初始内存: %.2f MB\n", float64(m1.Alloc)/1024/1024)
	fmt.Printf("最终内存: %.2f MB\n", float64(m2.Alloc)/1024/1024)
	fmt.Printf("内存增长: %.2f MB\n", float64(m2.Alloc-m1.Alloc)/1024/1024)
	
	// 验证内存使用合理
	memoryGrowth := float64(m2.Alloc-m1.Alloc) / 1024 / 1024
	s.Assert().Less(memoryGrowth, 100.0) // 内存增长小于100MB
}

// TestLongRunningStability 测试长时间运行稳定性
func (s *ConcurrencyStressTestSuite) TestLongRunningStability() {
	if testing.Short() {
		s.T().Skip("跳过长时间运行测试")
	}
	
	ctx := context.Background()
	
	// 准备测试数据
	merchants := s.createTestMerchants(ctx, 3)
	accounts := s.createTestAccounts(ctx, 6)
	s.bindAccountsToMerchants(ctx, merchants, accounts)
	
	// 测试参数
	testDuration := 2 * time.Minute
	concurrency := 10
	
	fmt.Printf("开始长时间运行稳定性测试: 持续 %v, %d 并发\n", testDuration, concurrency)
	
	var wg sync.WaitGroup
	stopChan := make(chan struct{})
	startTime := time.Now()
	
	// 启动并发协程
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			
			requestCount := 0
			for {
				select {
				case <-stopChan:
					fmt.Printf("协程 %d 完成, 处理了 %d 个请求\n", goroutineID, requestCount)
					return
				default:
					requestStart := time.Now()
					
					// 随机执行不同操作
					operation := rand.Intn(4)
					var err error
					
					switch operation {
					case 0: // 创建订单
						merchant := merchants[rand.Intn(len(merchants))]
						createReq := &service.CreateRechargeOrderRequest{
							MerchantID:  merchant.ID,
							PayerName:   fmt.Sprintf("长期测试用户_%d_%d", goroutineID, requestCount),
							Amount:      decimal.NewFromFloat(float64(rand.Intn(10000) + 100)),
							AdAccount:   fmt.Sprintf("AD_LONG_%d_%d", goroutineID, requestCount),
							PaymentType: []string{"corporate", "personal"}[rand.Intn(2)],
						}
						_, err = s.rechargeService.CreateRechargeOrder(ctx, createReq)
						
					case 1: // 账号匹配
						merchant := merchants[rand.Intn(len(merchants))]
						matchReq := &service.MatchRequest{
							MerchantID:  merchant.ID,
							PaymentType: []string{"corporate", "personal"}[rand.Intn(2)],
							Amount:      decimal.NewFromFloat(float64(rand.Intn(50000) + 1000)),
						}
						_, err = s.matcherService.Match(ctx, matchReq)
						
					case 2: // 查询商户
						merchant := merchants[rand.Intn(len(merchants))]
						_, err = s.merchantService.GetMerchant(ctx, merchant.ID)
						
					case 3: // 查询账号
						merchant := merchants[rand.Intn(len(merchants))]
						_, err = s.accountService.ListMerchantAccounts(ctx, merchant.ID)
					}
					
					latency := time.Since(requestStart).Milliseconds()
					s.updateStats(latency, err == nil)
					requestCount++
					
					// 短暂休息
					time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
				}
			}
		}(i)
	}
	
	// 等待测试时间结束
	time.Sleep(testDuration)
	close(stopChan)
	
	// 等待所有协程完成
	wg.Wait()
	actualDuration := time.Since(startTime)
	
	// 打印统计信息
	s.printStats()
	fmt.Printf("实际运行时间: %v\n", actualDuration)
	
	// 验证结果
	total := atomic.LoadInt64(&s.totalRequests)
	success := atomic.LoadInt64(&s.successRequests)
	
	s.Assert().Greater(total, int64(0))
	s.Assert().Greater(success, total*8/10) // 至少80%成功率
	
	// 验证系统仍然响应正常
	merchant := merchants[0]
	_, err := s.merchantService.GetMerchant(ctx, merchant.ID)
	s.Assert().NoError(err, "长时间运行后系统应该仍然正常响应")
}

// 辅助方法

// createTestMerchants 创建测试商户
func (s *ConcurrencyStressTestSuite) createTestMerchants(ctx context.Context, count int) []*repository.Merchant {
	var merchants []*repository.Merchant
	
	for i := 0; i < count; i++ {
		createReq := &service.CreateMerchantRequest{
			Name:         fmt.Sprintf("压力测试商户_%d", i),
			ContactName:  fmt.Sprintf("联系人_%d", i),
			ContactPhone: fmt.Sprintf("138%08d", i),
			Email:        fmt.Sprintf("merchant%d@test.com", i),
			BusinessType: []string{"e-commerce", "retail", "service"}[i%3],
		}
		
		merchant, err := s.merchantService.CreateMerchant(ctx, createReq)
		s.Require().NoError(err)
		merchants = append(merchants, merchant)
	}
	
	return merchants
}

// createTestAccounts 创建测试收款账号
func (s *ConcurrencyStressTestSuite) createTestAccounts(ctx context.Context, count int) []*repository.ReceiveAccount {
	var accounts []*repository.ReceiveAccount
	
	for i := 0; i < count; i++ {
		account := &repository.ReceiveAccount{
			BankName:      fmt.Sprintf("测试银行_%d", i%5),
			AccountName:   fmt.Sprintf("测试账户_%d", i),
			AccountNumber: fmt.Sprintf("1234567890%010d", i),
			AccountType:   []string{"corporate", "personal"}[i%2],
			DailyLimit:    decimal.NewFromFloat(float64((i+1) * 100000)),
			UsedAmount:    decimal.Zero,
			Status:        "active",
		}
		
		err := s.db.Create(account).Error
		s.Require().NoError(err)
		accounts = append(accounts, account)
	}
	
	return accounts
}

// bindAccountsToMerchants 绑定账号到商户
func (s *ConcurrencyStressTestSuite) bindAccountsToMerchants(ctx context.Context, merchants []*repository.Merchant, accounts []*repository.ReceiveAccount) {
	for i, merchant := range merchants {
		// 每个商户绑定2-4个账号
		accountCount := 2 + rand.Intn(3)
		for j := 0; j < accountCount && i*accountCount+j < len(accounts); j++ {
			account := accounts[i*accountCount+j]
			err := s.accountService.BindAccount(ctx, merchant.ID, account.ID, j+1)
			s.Require().NoError(err)
		}
	}
}

// createTestOrders 创建测试订单
func (s *ConcurrencyStressTestSuite) createTestOrders(ctx context.Context, merchants []*repository.Merchant, count int) []*repository.RechargeOrder {
	var orders []*repository.RechargeOrder
	
	for i := 0; i < count; i++ {
		merchant := merchants[rand.Intn(len(merchants))]
		
		createReq := &service.CreateRechargeOrderRequest{
			MerchantID:  merchant.ID,
			PayerName:   fmt.Sprintf("测试用户_%d", i),
			Amount:      decimal.NewFromFloat(float64(rand.Intn(10000) + 100)),
			AdAccount:   fmt.Sprintf("AD_TEST_%d", i),
			PaymentType: []string{"corporate", "personal"}[rand.Intn(2)],
		}
		
		order, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
		s.Require().NoError(err)
		orders = append(orders, order)
	}
	
	return orders
}

// TestConcurrencyStress 运行并发压力测试
func TestConcurrencyStress(t *testing.T) {
	suite.Run(t, new(ConcurrencyStressTestSuite))
}
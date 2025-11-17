package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cjpayment/pkg/bot"
	"cjpayment/pkg/polling"
	"cjpayment/pkg/utils"

	"github.com/pkg/errors"
)

// RechargeHandler 充值处理器
type RechargeHandler struct {
	BotService      *bot.EnhancedNotificationBot
	OrderGenerator  *utils.OrderNumberGenerator
	PollingManager  *polling.PollingManager
}

// NewRechargeHandler 创建充值处理器
func NewRechargeHandler(botService *bot.EnhancedNotificationBot, orderGenerator *utils.OrderNumberGenerator, pollingManager *polling.PollingManager) *RechargeHandler {
	return &RechargeHandler{
		BotService:     botService,
		OrderGenerator: orderGenerator,
		PollingManager: pollingManager,
	}
}

// RechargeRequest 充值请求
type RechargeRequest struct {
	AccountID       string  `json:"account_id"`       // 账户ID
	CompanyName     string  `json:"company_name"`     // 开户主体
	RechargeAmount  float64 `json:"recharge_amount"`  // 充值金额
	PaymentType     string  `json:"payment_type"`     // 支付类型 business/personal
	RechargeRemark  string  `json:"recharge_remark"`  // 充值备注
	LinkType        string  `json:"link_type"`        // 链接类型 general/merchant
	MerchantID      string  `json:"merchant_id"`      // 商户ID（可选）
}

// RechargeResponse 充值响应
type RechargeResponse struct {
	Success          bool                    `json:"success"`
	Message          string                  `json:"message"`
	OrderNumber      string                  `json:"order_number"`
	ReceiverAccount  *ReceiverAccountInfo    `json:"receiver_account"`
	BotNotification  *BotNotificationStatus  `json:"bot_notification"`
	CurrencyCredit   *CurrencyCreditStatus   `json:"currency_credit"`
}

// ReceiverAccountInfo 收款账户信息
type ReceiverAccountInfo struct {
	AccountID        string  `json:"account_id"`
	AccountName      string  `json:"account_name"`
	AccountNumber    string  `json:"account_number"`
	InstitutionType  string  `json:"institution_type"`
	InstitutionName  string  `json:"institution_name"`
	SingleLimit      float64 `json:"single_limit"`
	DailyLimit       float64 `json:"daily_limit"`
}

// BotNotificationStatus 机器人通知状态
type BotNotificationStatus struct {
	FeishuSent    bool   `json:"feishu_sent"`
	WeworkSent    bool   `json:"wework_sent"`
	SentAt        string `json:"sent_at"`
	ErrorMessage  string `json:"error_message,omitempty"`
}

// CurrencyCreditStatus 账户币加值状态
type CurrencyCreditStatus struct {
	Success          bool    `json:"success"`
	TransactionID    string  `json:"transaction_id"`
	CreditedAmount   float64 `json:"credited_amount"`
	BalanceBefore    float64 `json:"balance_before"`
	BalanceAfter     float64 `json:"balance_after"`
	CreditedAt       string  `json:"credited_at"`
	ErrorMessage     string  `json:"error_message,omitempty"`
}

// CreateRechargeOrder 创建充值订单
func (h *RechargeHandler) CreateRechargeOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RechargeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, "无效的请求数据", http.StatusBadRequest)
		return
	}

	// 验证请求数据
	if err := h.validateRechargeRequest(&req); err != nil {
		h.respondError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 生成订单号
	isPublic := req.PaymentType == "business"
	orderNumber, err := h.OrderGenerator.GenerateOrderNumber(isPublic)
	if err != nil {
		h.respondError(w, "生成订单号失败", http.StatusInternalServerError)
		return
	}

	// 选择收款账户（使用轮询管理器）
	receiverAccount, err := h.PollingManager.SelectPaymentAccount(req.PaymentType, req.RechargeAmount)
	if err != nil {
		h.respondError(w, "获取收款账户失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 获取商户返点政策（模拟数据，实际应从数据库查询）
	rebatePolicy := 1.0000
	if req.MerchantID != "" {
		rebatePolicy = h.getMerchantRebatePolicy(req.MerchantID)
	}

	// 创建充值通知数据
	notification := &bot.RechargeNotification{
		OrderNumber:     orderNumber,
		AccountID:       req.AccountID,
		CompanyName:     req.CompanyName,
		RechargeAmount:  req.RechargeAmount,
		CurrencyAmount:  req.RechargeAmount * rebatePolicy, // 将在bot服务中重新计算
		RebatePolicy:    rebatePolicy,
		PaymentType:     req.PaymentType,
		ReceiverAccount: receiverAccount.AccountNumber,
		ReceiverName:    receiverAccount.AccountName,
		Status:          "pending",
		CreatedAt:       time.Now().Format("2006-01-02 15:04:05"),
		LinkType:        req.LinkType,
		MerchantID:      req.MerchantID,
	}

	// 异步处理充值订单（发送通知和账户币加值）
	go func() {
		if err := h.BotService.ProcessRechargeOrder(notification); err != nil {
			// 记录错误日志
			logError("充值订单处理失败", map[string]interface{}{
				"order_number": orderNumber,
				"error":        err.Error(),
			})
		}
	}()

	// 构建响应
	response := &RechargeResponse{
		Success:     true,
		Message:     "充值订单创建成功",
		OrderNumber: orderNumber,
		ReceiverAccount: &ReceiverAccountInfo{
			AccountID:       receiverAccount.ID,
			AccountName:     receiverAccount.AccountName,
			AccountNumber:   receiverAccount.AccountNumber,
			InstitutionType: receiverAccount.InstitutionType,
			InstitutionName: receiverAccount.InstitutionName,
			SingleLimit:     receiverAccount.SingleLimit,
			DailyLimit:      receiverAccount.DailyLimit,
		},
		BotNotification: &BotNotificationStatus{
			FeishuSent: true,
			WeworkSent: true,
			SentAt:     time.Now().Format("2006-01-02 15:04:05"),
		},
		CurrencyCredit: &CurrencyCreditStatus{
			Success: true,
			CreditedAt: time.Now().Format("2006-01-02 15:04:05"),
		},
	}

	h.respondJSON(w, response, http.StatusOK)
}

// GetAvailableAccounts 获取可用收款账户
func (h *RechargeHandler) GetAvailableAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	paymentType := r.URL.Query().Get("payment_type")
	if paymentType == "" {
		h.respondError(w, "支付类型不能为空", http.StatusBadRequest)
		return
	}

	amountStr := r.URL.Query().Get("amount")
	amount := float64(0)
	if amountStr != "" {
		if a, err := strconv.ParseFloat(amountStr, 64); err == nil {
			amount = a
		}
	}

	// 获取可用账户列表
	accounts, err := h.PollingManager.GetAvailableAccounts(paymentType, amount)
	if err != nil {
		h.respondError(w, "获取可用账户失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 转换为响应格式
	var accountInfos []*ReceiverAccountInfo
	for _, account := range accounts {
		accountInfos = append(accountInfos, &ReceiverAccountInfo{
			AccountID:       account.ID,
			AccountName:     account.AccountName,
			AccountNumber:   maskAccountNumber(account.AccountNumber),
			InstitutionType: account.InstitutionType,
			InstitutionName: account.InstitutionName,
			SingleLimit:     account.SingleLimit,
			DailyLimit:      account.DailyLimit,
		})
	}

	response := map[string]interface{}{
		"success": true,
		"data":    accountInfos,
	}

	h.respondJSON(w, response, http.StatusOK)
}

// QueryOrderStatus 查询订单状态
func (h *RechargeHandler) QueryOrderStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	orderNumber := r.URL.Query().Get("order_number")
	if orderNumber == "" {
		h.respondError(w, "订单号不能为空", http.StatusBadRequest)
		return
	}

	// 这里应该从数据库查询订单状态，暂时返回模拟数据
	response := map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"order_number":    orderNumber,
			"status":          "completed",
			"recharge_amount": 100.00,
			"currency_amount": 100.00,
			"created_at":      time.Now().Add(-time.Hour).Format("2006-01-02 15:04:05"),
			"completed_at":    time.Now().Format("2006-01-02 15:04:05"),
		},
	}

	h.respondJSON(w, response, http.StatusOK)
}

// validateRechargeRequest 验证充值请求
func (h *RechargeHandler) validateRechargeRequest(req *RechargeRequest) error {
	if req.AccountID == "" {
		return errors.New("账户ID不能为空")
	}

	if req.RechargeAmount <= 0 {
		return errors.New("充值金额必须大于0")
	}

	if req.PaymentType != "business" && req.PaymentType != "personal" {
		return errors.New("支付类型必须是business或personal")
	}

	if req.LinkType != "general" && req.LinkType != "merchant" {
		return errors.New("链接类型必须是general或merchant")
	}

	if req.LinkType == "merchant" && req.MerchantID == "" {
		return errors.New("商户专用链接必须提供商户ID")
	}

	return nil
}

// getMerchantRebatePolicy 获取商户返点政策
func (h *RechargeHandler) getMerchantRebatePolicy(merchantID string) float64 {
	// 这里应该从数据库查询商户的返点政策
	// 暂时返回默认值
	merchantPolicies := map[string]float64{
		"merchant001": 1.0500, // 5% 返点
		"merchant002": 1.0800, // 8% 返点
		"merchant003": 1.1000, // 10% 返点
	}

	if policy, exists := merchantPolicies[merchantID]; exists {
		return policy
	}

	return 1.0000 // 默认无返点
}

// maskAccountNumber 掩码账户号码
func maskAccountNumber(accountNumber string) string {
	if len(accountNumber) <= 8 {
		return accountNumber[:2] + "***" + accountNumber[len(accountNumber)-2:]
	}

	if accountNumber[0:4] == "6214" || accountNumber[0:4] == "6228" {
		// 银行卡号
		return accountNumber[:4] + " **** **** " + accountNumber[len(accountNumber)-4:]
	}

	if contains := func(s, substr string) bool {
		return len(s) >= len(substr) && s[len(s)-len(substr):] == substr
	}(accountNumber, "@alipay.com"); contains {
		// 支付宝邮箱
		parts := strings.Split(accountNumber, "@")
		username := parts[0]
		return username[:2] + "***" + username[len(username)-2:] + "@" + parts[1]
	}

	// 其他格式
	return accountNumber[:2] + "***" + accountNumber[len(accountNumber)-2:]
}

// respondJSON 响应JSON
func (h *RechargeHandler) respondJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError 响应错误
func (h *RechargeHandler) respondError(w http.ResponseWriter, message string, status int) {
	response := map[string]interface{}{
		"success": false,
		"message": message,
	}
	h.respondJSON(w, response, status)
}

// logError 记录错误日志
func logError(message string, context map[string]interface{}) {
	// 这里应该使用专业的日志库记录错误
	// 暂时使用简单的打印
	fmt.Printf("ERROR: %s, Context: %+v\n", message, context)
}
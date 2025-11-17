package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/pkg/errors"
)

// EnhancedNotificationBot 增强的通知机器人
type EnhancedNotificationBot struct {
	FeishuBot      *FeishuBot
	WeworkBot      *WeworkBot
	CurrencyService CurrencyCreditService
	HTTPClient     *http.Client
}

// NewEnhancedNotificationBot 创建增强通知机器人
func NewEnhancedNotificationBot(feishuAppID, feishuSecret, feishuWebhook, weworkWebhook string, currencyService CurrencyCreditService) *EnhancedNotificationBot {
	return &EnhancedNotificationBot{
		FeishuBot:       NewFeishuBot(feishuAppID, feishuSecret, feishuWebhook),
		WeworkBot:       NewWeworkBot(weworkWebhook),
		CurrencyService: currencyService,
		HTTPClient:      &http.Client{Timeout: 30 * time.Second},
	}
}

// ProcessRechargeOrder 处理充值订单的完整流程
func (e *EnhancedNotificationBot) ProcessRechargeOrder(notification *RechargeNotification) error {
	// 第一步：发送充值订单通知
	if err := e.SendRechargeNotification(notification); err != nil {
		return errors.Wrap(err, "发送充值订单通知失败")
	}

	// 第二步：处理账户币加值
	creditResponse, err := e.processCurrencyCredit(notification)
	if err != nil {
		return errors.Wrap(err, "账户币加值处理失败")
	}

	// 第三步：更新通知信息并发送成功通知
	notification.AvailableBalance = creditResponse.BalanceAfter
	notification.CurrencyAmount = creditResponse.CreditedAmount
	notification.CreditedAt = creditResponse.CreditedAt
	notification.Status = "completed"

	if err := e.SendCurrencyCreditNotification(notification); err != nil {
		return errors.Wrap(err, "发送账户币加值成功通知失败")
	}

	return nil
}

// processCurrencyCredit 处理账户币加值
func (e *EnhancedNotificationBot) processCurrencyCredit(notification *RechargeNotification) (*CurrencyCreditResponse, error) {
	// 计算实际加值金额（现金金额 * 返点政策）
	actualCreditAmount := notification.RechargeAmount * notification.RebatePolicy

	// 创建加值请求
	request := &CurrencyCreditRequest{
		AccountID:     notification.AccountID,
		Amount:        actualCreditAmount,
		OrderNumber:   notification.OrderNumber,
		Remark:        fmt.Sprintf("充值加值：订单%s，现金%.2f元，返点政策%.4f", notification.OrderNumber, notification.RechargeAmount, notification.RebatePolicy),
		OperatorID:    "system",
		NotifyWebhook: "", // 可以配置回调地址
	}

	// 执行账户币加值
	response, err := e.CurrencyService.CreditAccount(request)
	if err != nil {
		return nil, errors.Wrap(err, "执行账户币加值失败")
	}

	return response, nil
}

// SendRechargeNotification 发送充值通知到所有平台
func (e *EnhancedNotificationBot) SendRechargeNotification(notification *RechargeNotification) error {
	var errs []error

	// 发送到飞书
	if err := e.FeishuBot.SendRechargeNotification(notification); err != nil {
		errs = append(errs, errors.Wrap(err, "发送飞书通知失败"))
	}

	// 发送到企业微信
	if err := e.WeworkBot.SendRechargeNotification(notification); err != nil {
		errs = append(errs, errors.Wrap(err, "发送企业微信通知失败"))
	}

	if len(errs) > 0 {
		// 即使部分失败，也记录错误但不中断流程
		for _, err := range errs {
			fmt.Printf("通知发送错误: %v\n", err)
		}
	}

	return nil
}

// SendCurrencyCreditNotification 发送账户币加值成功通知
func (e *EnhancedNotificationBot) SendCurrencyCreditNotification(notification *RechargeNotification) error {
	var errs []error

	// 发送到飞书
	if err := e.FeishuBot.SendCurrencyCreditNotification(notification); err != nil {
		errs = append(errs, errors.Wrap(err, "发送飞书加值通知失败"))
	}

	// 发送到企业微信
	if err := e.WeworkBot.SendCurrencyCreditNotification(notification); err != nil {
		errs = append(errs, errors.Wrap(err, "发送企业微信加值通知失败"))
	}

	if len(errs) > 0 {
		for _, err := range errs {
			fmt.Printf("加值通知发送错误: %v\n", err)
		}
	}

	return nil
}

// SendCustomMessage 发送自定义消息
func (e *EnhancedNotificationBot) SendCustomMessage(groupID, message string) error {
	var errs []error

	// 发送到飞书
	if err := e.FeishuBot.SendCustomMessage(groupID, message); err != nil {
		errs = append(errs, errors.Wrap(err, "发送飞书自定义消息失败"))
	}

	// 发送到企业微信
	if err := e.WeworkBot.SendCustomMessage(groupID, message); err != nil {
		errs = append(errs, errors.Wrap(err, "发送企业微信自定义消息失败"))
	}

	if len(errs) > 0 {
		return errors.New("部分平台消息发送失败")
	}

	return nil
}

// ValidateConfig 验证配置
func (e *EnhancedNotificationBot) ValidateConfig() error {
	if e.FeishuBot != nil {
		if err := e.FeishuBot.ValidateConfig(); err != nil {
			return errors.Wrap(err, "飞书配置验证失败")
		}
	}

	if e.WeworkBot != nil {
		if err := e.WeworkBot.ValidateConfig(); err != nil {
			return errors.Wrap(err, "企业微信配置验证失败")
		}
	}

	if e.CurrencyService == nil {
		return errors.New("账户币加值服务未配置")
	}

	return nil
}

// WeworkBot 企业微信机器人
type WeworkBot struct {
	WebhookURL string
	HTTPClient *http.Client
}

// NewWeworkBot 创建企业微信机器人
func NewWeworkBot(webhookURL string) *WeworkBot {
	return &WeworkBot{
		WebhookURL: webhookURL,
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// ValidateConfig 验证企业微信配置
func (w *WeworkBot) ValidateConfig() error {
	if w.WebhookURL == "" {
		return errors.New("企业微信WebhookURL不能为空")
	}
	return nil
}

// SendRechargeNotification 发送充值通知
func (w *WeworkBot) SendRechargeNotification(notification *RechargeNotification) error {
	message := w.formatRechargeMessage(notification)
	return w.SendCustomMessage("", message)
}

// SendCurrencyCreditNotification 发送账户币加值通知
func (w *WeworkBot) SendCurrencyCreditNotification(notification *RechargeNotification) error {
	message := w.formatCurrencyCreditMessage(notification)
	return w.SendCustomMessage("", message)
}

// SendCustomMessage 发送自定义消息
func (w *WeworkBot) SendCustomMessage(groupID, message string) error {
	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"content": message,
		},
	}

	jsonData, _ := json.Marshal(payload)

	resp, err := w.HTTPClient.Post(w.WebhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return errors.Wrap(err, "发送企业微信消息失败")
	}
	defer resp.Body.Close()

	var result struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.Wrap(err, "解析企业微信响应失败")
	}

	if result.ErrCode != 0 {
		return errors.New(fmt.Sprintf("企业微信发送失败: %s", result.ErrMsg))
	}

	return nil
}

// formatRechargeMessage 格式化充值消息
func (w *WeworkBot) formatRechargeMessage(notification *RechargeNotification) string {
	paymentTypeText := "对私转账"
	if notification.PaymentType == "business" {
		paymentTypeText = "对公转账"
	}

	linkTypeText := "通用链接"
	if notification.LinkType == "merchant" {
		linkTypeText = "商户专用链接"
	}

	return fmt.Sprintf(`## 📢 充值订单通知

**💰 订单信息:**
- 订单号: %s
- 账户ID: %s
- 开户主体: %s
- 充值金额: %.2f 元

**🏦 收款信息:**
- 支付方式: %s
- 收款账户: %s
- 收款人: %s

**🔗 链接类型:** %s
**⏰ 创建时间:** %s
**🎯 订单状态:** %s

> ⚠️ 请管理员及时处理该订单！`,
		notification.OrderNumber,
		notification.AccountID,
		notification.CompanyName,
		notification.RechargeAmount,
		paymentTypeText,
		notification.ReceiverAccount,
		notification.ReceiverName,
		linkTypeText,
		notification.CreatedAt,
		notification.Status,
	)
}

// formatCurrencyCreditMessage 格式化账户币加值消息
func (w *WeworkBot) formatCurrencyCreditMessage(notification *RechargeNotification) string {
	paymentTypeText := "对私转账"
	if notification.PaymentType == "business" {
		paymentTypeText = "对公转账"
	}

	return fmt.Sprintf(`## 🎉 账户币加值成功

**💰 账户信息:**
- 账户ID: %s
- 开户主体: %s
- 支付方式: %s

**💸 金额详情:**
- 充值现金: %.2f 元
- 返点政策: %.4f
- 账户币加值: %.2f
- 充值后余额: %.2f

**📋 订单信息:**
- 订单号: %s
- 充值时间: %s
- 加值完成时间: %s

> ✅ 账户币加值已完成，请查收！`,
		notification.AccountID,
		notification.CompanyName,
		paymentTypeText,
		notification.RechargeAmount,
		notification.RebatePolicy,
		notification.CurrencyAmount,
		notification.AvailableBalance,
		notification.OrderNumber,
		notification.CreatedAt,
		notification.CreditedAt,
	)
}

// MockCurrencyCreditService 模拟账户币加值服务实现（用于测试）
type MockCurrencyCreditService struct {
	accounts map[string]float64 // 账户余额映射
}

// NewMockCurrencyCreditService 创建模拟服务
func NewMockCurrencyCreditService() *MockCurrencyCreditService {
	return &MockCurrencyCreditService{
		accounts: make(map[string]float64),
	}
}

// CreditAccount 模拟账户币加值
func (m *MockCurrencyCreditService) CreditAccount(request *CurrencyCreditRequest) (*CurrencyCreditResponse, error) {
	if request.AccountID == "" {
		return nil, errors.New("账户ID不能为空")
	}

	if request.Amount <= 0 {
		return nil, errors.New("加值金额必须大于0")
	}

	// 获取当前余额
	balanceBefore := m.accounts[request.AccountID]
	balanceAfter := balanceBefore + request.Amount

	// 更新余额
	m.accounts[request.AccountID] = balanceAfter

	// 生成交易ID
	transactionID := fmt.Sprintf("TXN%d", time.Now().Unix())

	return &CurrencyCreditResponse{
		Success:        true,
		Message:        "账户币加值成功",
		TransactionID:  transactionID,
		AccountID:      request.AccountID,
		CreditedAmount: request.Amount,
		BalanceBefore:  balanceBefore,
		BalanceAfter:   balanceAfter,
		CreditedAt:     time.Now().Format("2006-01-02 15:04:05"),
	}, nil
}

// QueryAccountBalance 查询账户余额
func (m *MockCurrencyCreditService) QueryAccountBalance(accountID string) (float64, error) {
	if accountID == "" {
		return 0, errors.New("账户ID不能为空")
	}

	balance, exists := m.accounts[accountID]
	if !exists {
		// 如果账户不存在，初始化为0余额
		m.accounts[accountID] = 0
		return 0, nil
	}

	return balance, nil
}

// ValidateAccount 验证账户是否有效
func (m *MockCurrencyCreditService) ValidateAccount(accountID string) error {
	if accountID == "" {
		return errors.New("账户ID不能为空")
	}

	// 这里可以添加更复杂的账户验证逻辑
	// 比如检查账户格式、是否在白名单中等

	return nil
}
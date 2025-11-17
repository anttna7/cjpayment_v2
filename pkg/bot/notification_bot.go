package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/pkg/errors"
)

// NotificationBot 通知机器人接口
type NotificationBot interface {
	SendRechargeNotification(notification *RechargeNotification) error
	SendCurrencyCreditNotification(notification *RechargeNotification) error
	SendCustomMessage(groupID, message string) error
	ValidateConfig() error
}

// CurrencyCreditService 账户币加值服务接口
type CurrencyCreditService interface {
	CreditAccount(request *CurrencyCreditRequest) (*CurrencyCreditResponse, error)
	QueryAccountBalance(accountID string) (float64, error)
	ValidateAccount(accountID string) error
}

// RechargeNotification 充值通知信息
type RechargeNotification struct {
	OrderNumber        string  `json:"order_number"`        // 订单号
	AccountID          string  `json:"account_id"`          // 账户ID
	CompanyName        string  `json:"company_name"`        // 开户主体
	RechargeAmount     float64 `json:"recharge_amount"`     // 充值现金金额
	CurrencyAmount     float64 `json:"currency_amount"`     // 账户币加值金额（实际到账金额）
	AvailableBalance   float64 `json:"available_balance"`   // 充值后可用余额
	RebatePolicy       float64 `json:"rebate_policy"`       // 返点政策（汇率）
	PaymentType        string  `json:"payment_type"`        // 支付类型（business/personal）
	ReceiverAccount    string  `json:"receiver_account"`    // 收款账户
	ReceiverName       string  `json:"receiver_name"`       // 收款人姓名
	Status             string  `json:"status"`              // 订单状态
	CreatedAt          string  `json:"created_at"`          // 创建时间
	CreditedAt         string  `json:"credited_at"`         // 账户加值完成时间
	LinkType           string  `json:"link_type"`           // 链接类型（general/merchant）
	MerchantID         string  `json:"merchant_id"`         // 商户ID（专用链接使用）
}

// CurrencyCreditRequest 账户币加值请求
type CurrencyCreditRequest struct {
	AccountID      string  `json:"account_id"`      // 账户ID
	Amount         float64 `json:"amount"`          // 加值金额
	OrderNumber    string  `json:"order_number"`    // 关联订单号
	Remark         string  `json:"remark"`          // 备注信息
	OperatorID     string  `json:"operator_id"`     // 操作员ID
	NotifyWebhook  string  `json:"notify_webhook"`  // 回调通知地址
}

// CurrencyCreditResponse 账户币加值响应
type CurrencyCreditResponse struct {
	Success          bool    `json:"success"`           // 是否成功
	Message          string  `json:"message"`           // 响应消息
	TransactionID    string  `json:"transaction_id"`    // 交易ID
	AccountID        string  `json:"account_id"`        // 账户ID
	CreditedAmount   float64 `json:"credited_amount"`   // 实际加值金额
	BalanceBefore    float64 `json:"balance_before"`    // 加值前余额
	BalanceAfter     float64 `json:"balance_after"`     // 加值后余额
	CreditedAt       string  `json:"credited_at"`       // 加值时间
}

// FeishuBot 飞书机器人实现
type FeishuBot struct {
	AppID     string
	AppSecret string
	WebhookURL string
	AccessToken string
	ExpiresAt   time.Time
	HTTPClient  *http.Client
}

// NewFeishuBot 创建飞书机器人实例
func NewFeishuBot(appID, appSecret, webhookURL string) *FeishuBot {
	return &FeishuBot{
		AppID:      appID,
		AppSecret:  appSecret,
		WebhookURL: webhookURL,
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// ValidateConfig 验证飞书配置
func (f *FeishuBot) ValidateConfig() error {
	if f.AppID == "" {
		return errors.New("飞书AppID不能为空")
	}
	if f.AppSecret == "" {
		return errors.New("飞书AppSecret不能为空")
	}
	if f.WebhookURL == "" {
		return errors.New("飞书WebhookURL不能为空")
	}
	return nil
}

// getAccessToken 获取访问令牌
func (f *FeishuBot) getAccessToken() (string, error) {
	// 如果token未过期，直接返回
	if f.AccessToken != "" && time.Now().Before(f.ExpiresAt) {
		return f.AccessToken, nil
	}

	// 请求新的access token
	tokenURL := "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
	
	payload := map[string]string{
		"app_id":     f.AppID,
		"app_secret": f.AppSecret,
	}
	
	jsonData, _ := json.Marshal(payload)
	
	resp, err := f.HTTPClient.Post(tokenURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", errors.Wrap(err, "请求飞书token失败")
	}
	defer resp.Body.Close()
	
	var result struct {
		Code   int    `json:"code"`
		Msg    string `json:"msg"`
		Token  string `json:"tenant_access_token"`
		Expire int    `json:"expire"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", errors.Wrap(err, "解析飞书token响应失败")
	}
	
	if result.Code != 0 {
		return "", errors.New(fmt.Sprintf("获取飞书token失败: %s", result.Msg))
	}
	
	f.AccessToken = result.Token
	f.ExpiresAt = time.Now().Add(time.Duration(result.Expire-300) * time.Second) // 提前5分钟过期
	
	return f.AccessToken, nil
}

// SendRechargeNotification 发送充值通知
func (f *FeishuBot) SendRechargeNotification(notification *RechargeNotification) error {
	message := f.formatRechargeMessage(notification)
	return f.SendCustomMessage("", message)
}

// formatRechargeMessage 格式化充值消息
func (f *FeishuBot) formatRechargeMessage(notification *RechargeNotification) string {
	paymentTypeText := "对私转账"
	if notification.PaymentType == "business" {
		paymentTypeText = "对公转账"
	}
	
	message := fmt.Sprintf(`🎉 充值成功通知

💰 账户信息:
• 账户ID: %s
• 开户主体: %s
• 支付方式: %s

💸 金额详情:
• 充值现金: %.2f 元
• 返点政策: %.4f
• 账户币加值: %.2f
• 当前余额: %.2f

📋 订单信息:
• 订单号: %s
• 充值时间: %s

✅ 充值已完成，账户币已成功加值！`,
		notification.AccountID,
		notification.CompanyName,
		paymentTypeText,
		notification.RechargeAmount,
		notification.RebatePolicy,
		notification.CurrencyAmount,
		notification.AvailableBalance,
		notification.OrderNumber,
		notification.CreatedAt,
	)
	
	return message
}

// SendCustomMessage 发送自定义消息
func (f *FeishuBot) SendCustomMessage(groupID, message string) error {
	if f.WebhookURL != "" {
		return f.sendWebhookMessage(message)
	}
	
	// 使用OpenAPI发送消息
	token, err := f.getAccessToken()
	if err != nil {
		return err
	}
	
	return f.sendAPIMessage(token, groupID, message)
}

// sendWebhookMessage 通过Webhook发送消息
func (f *FeishuBot) sendWebhookMessage(message string) error {
	payload := map[string]interface{}{
		"msg_type": "text",
		"content": map[string]string{
			"text": message,
		},
	}
	
	jsonData, _ := json.Marshal(payload)
	
	resp, err := f.HTTPClient.Post(f.WebhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return errors.Wrap(err, "发送飞书webhook消息失败")
	}
	defer resp.Body.Close()
	
	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.Wrap(err, "解析飞书webhook响应失败")
	}
	
	if result.Code != 0 {
		return errors.New(fmt.Sprintf("飞书webhook发送失败: %s", result.Msg))
	}
	
	return nil
}

// sendAPIMessage 通过OpenAPI发送消息
func (f *FeishuBot) sendAPIMessage(token, groupID, message string) error {
	apiURL := "https://open.feishu.cn/open-apis/im/v1/messages"
	
	payload := map[string]interface{}{
		"receive_id_type": "chat_id",
		"receive_id":      groupID,
		"content":         fmt.Sprintf(`{"text": "%s"}`, message),
		"msg_type":        "text",
	}
	
	jsonData, _ := json.Marshal(payload)
	
	req, _ := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := f.HTTPClient.Do(req)
	if err != nil {
		return errors.Wrap(err, "发送飞书API消息失败")
	}
	defer resp.Body.Close()
	
	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.Wrap(err, "解析飞书API响应失败")
	}
	
	if result.Code != 0 {
		return errors.New(fmt.Sprintf("飞书API发送失败: %s", result.Msg))
	}
	
	return nil
}

// WeChatWorkBot 企业微信机器人实现
type WeChatWorkBot struct {
	CorpID     string
	AgentID    string
	Secret     string
	WebhookURL string
	AccessToken string
	ExpiresAt   time.Time
	HTTPClient  *http.Client
}

// NewWeChatWorkBot 创建企业微信机器人实例
func NewWeChatWorkBot(corpID, agentID, secret, webhookURL string) *WeChatWorkBot {
	return &WeChatWorkBot{
		CorpID:     corpID,
		AgentID:    agentID,
		Secret:     secret,
		WebhookURL: webhookURL,
		HTTPClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// ValidateConfig 验证企业微信配置
func (w *WeChatWorkBot) ValidateConfig() error {
	if w.CorpID == "" {
		return errors.New("企业微信CorpID不能为空")
	}
	if w.Secret == "" {
		return errors.New("企业微信Secret不能为空")
	}
	return nil
}

// getAccessToken 获取企业微信访问令牌
func (w *WeChatWorkBot) getAccessToken() (string, error) {
	if w.AccessToken != "" && time.Now().Before(w.ExpiresAt) {
		return w.AccessToken, nil
	}
	
	tokenURL := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", w.CorpID, w.Secret)
	
	resp, err := w.HTTPClient.Get(tokenURL)
	if err != nil {
		return "", errors.Wrap(err, "请求企业微信token失败")
	}
	defer resp.Body.Close()
	
	var result struct {
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", errors.Wrap(err, "解析企业微信token响应失败")
	}
	
	if result.ErrCode != 0 {
		return "", errors.New(fmt.Sprintf("获取企业微信token失败: %s", result.ErrMsg))
	}
	
	w.AccessToken = result.AccessToken
	w.ExpiresAt = time.Now().Add(time.Duration(result.ExpiresIn-300) * time.Second)
	
	return w.AccessToken, nil
}

// SendRechargeNotification 发送充值通知
func (w *WeChatWorkBot) SendRechargeNotification(notification *RechargeNotification) error {
	message := w.formatRechargeMessage(notification)
	return w.SendCustomMessage("", message)
}

// formatRechargeMessage 格式化充值消息
func (w *WeChatWorkBot) formatRechargeMessage(notification *RechargeNotification) string {
	paymentTypeText := "对私转账"
	if notification.PaymentType == "business" {
		paymentTypeText = "对公转账"
	}
	
	message := fmt.Sprintf(`💰 充值成功通知

账户ID：%s
开户主体：%s
充值现金：%.2f元
账户币加值：%.2f
可用余额：%.2f账户币

订单号：%s
支付方式：%s
时间：%s`,
		notification.AccountID,
		notification.CompanyName,
		notification.RechargeAmount,
		notification.CurrencyAmount,
		notification.AvailableBalance,
		notification.OrderNumber,
		paymentTypeText,
		notification.CreatedAt,
	)
	
	return message
}

// SendCustomMessage 发送自定义消息
func (w *WeChatWorkBot) SendCustomMessage(groupID, message string) error {
	if w.WebhookURL != "" {
		return w.sendWebhookMessage(message)
	}
	
	token, err := w.getAccessToken()
	if err != nil {
		return err
	}
	
	return w.sendAPIMessage(token, message)
}

// sendWebhookMessage 通过Webhook发送消息
func (w *WeChatWorkBot) sendWebhookMessage(message string) error {
	payload := map[string]interface{}{
		"msgtype": "text",
		"text": map[string]string{
			"content": message,
		},
	}
	
	jsonData, _ := json.Marshal(payload)
	
	resp, err := w.HTTPClient.Post(w.WebhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return errors.Wrap(err, "发送企业微信webhook消息失败")
	}
	defer resp.Body.Close()
	
	var result struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.Wrap(err, "解析企业微信webhook响应失败")
	}
	
	if result.ErrCode != 0 {
		return errors.New(fmt.Sprintf("企业微信webhook发送失败: %s", result.ErrMsg))
	}
	
	return nil
}

// sendAPIMessage 通过API发送消息
func (w *WeChatWorkBot) sendAPIMessage(token, message string) error {
	apiURL := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s", token)
	
	payload := map[string]interface{}{
		"touser":  "@all",
		"msgtype": "text",
		"agentid": w.AgentID,
		"text": map[string]string{
			"content": message,
		},
	}
	
	jsonData, _ := json.Marshal(payload)
	
	resp, err := w.HTTPClient.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return errors.Wrap(err, "发送企业微信API消息失败")
	}
	defer resp.Body.Close()
	
	var result struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return errors.Wrap(err, "解析企业微信API响应失败")
	}
	
	if result.ErrCode != 0 {
		return errors.New(fmt.Sprintf("企业微信API发送失败: %s", result.ErrMsg))
	}
	
	return nil
}

// BotManager 机器人管理器
type BotManager struct {
	bots []NotificationBot
}

// NewBotManager 创建机器人管理器
func NewBotManager() *BotManager {
	return &BotManager{
		bots: make([]NotificationBot, 0),
	}
}

// AddBot 添加机器人
func (m *BotManager) AddBot(bot NotificationBot) error {
	if err := bot.ValidateConfig(); err != nil {
		return errors.Wrap(err, "机器人配置验证失败")
	}
	
	m.bots = append(m.bots, bot)
	return nil
}

// SendToAll 向所有机器人发送通知
func (m *BotManager) SendToAll(notification *RechargeNotification) error {
	var lastErr error
	successCount := 0
	
	for _, bot := range m.bots {
		if err := bot.SendRechargeNotification(notification); err != nil {
			lastErr = err
			fmt.Printf("机器人通知发送失败: %v\n", err)
		} else {
			successCount++
		}
	}
	
	if successCount == 0 && lastErr != nil {
		return errors.Wrap(lastErr, "所有机器人通知发送失败")
	}
	
	return nil
}
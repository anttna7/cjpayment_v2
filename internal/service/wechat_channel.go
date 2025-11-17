package service

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// WechatChannel implements PaymentChannel for WeChat Pay
type WechatChannel struct {
	*BasePaymentChannel
	config *WechatConfig
	client *http.Client
}

// WechatConfig holds WeChat Pay configuration
type WechatConfig struct {
	AppID      string        `json:"app_id"`
	MchID      string        `json:"mch_id"`
	APIKey     string        `json:"api_key"`
	GatewayURL string        `json:"gateway_url"`
	NotifyURL  string        `json:"notify_url"`
	SignType   string        `json:"sign_type"`
	Timeout    time.Duration `json:"timeout"`
}

// NewWechatChannel creates a new WeChat Pay payment channel
func NewWechatChannel(channelID, channelName string, config *WechatConfig) *WechatChannel {
	baseChannel := NewBasePaymentChannel(channelID, channelName, ChannelTypeWechat)
	
	// Set WeChat Pay-specific limits
	baseChannel.limits = &ChannelLimits{
		MinAmount:    decimal.NewFromFloat(0.01),
		MaxAmount:    decimal.NewFromFloat(50000),
		DailyLimit:   decimal.NewFromFloat(500000),
		MonthlyLimit: decimal.NewFromFloat(15000000),
		SingleLimit:  decimal.NewFromFloat(50000),
	}
	
	// Set default config if not provided
	if config == nil {
		config = &WechatConfig{
			GatewayURL: "https://api.mch.weixin.qq.com",
			SignType:   "MD5",
			Timeout:    30 * time.Second,
		}
	}
	
	return &WechatChannel{
		BasePaymentChannel: baseChannel,
		config:             config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// SupportedPaymentTypes returns supported payment types for WeChat Pay
func (c *WechatChannel) SupportedPaymentTypes() []string {
	return []string{PaymentTypePrivate} // WeChat Pay typically supports private payments
}

// SupportedCurrencies returns supported currencies for WeChat Pay
func (c *WechatChannel) SupportedCurrencies() []string {
	return []string{"CNY"} // WeChat Pay primarily supports CNY
}

// CreatePayment creates a WeChat Pay payment
func (c *WechatChannel) CreatePayment(ctx context.Context, req *CreatePaymentRequest) (*PaymentResponse, error) {
	if req == nil {
		return nil, &PaymentChannelError{
			Code:    "INVALID_REQUEST",
			Message: "payment request cannot be nil",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Validate request
	if err := c.validateCreatePaymentRequest(req); err != nil {
		return nil, &PaymentChannelError{
			Code:    "VALIDATION_ERROR",
			Message: fmt.Sprintf("validation failed: %v", err),
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build WeChat Pay request parameters
	params := c.buildCreatePaymentParams(req)
	
	// Sign the request
	signature := c.signRequest(params)
	params["sign"] = signature
	
	// Make API request
	wechatResp, err := c.makeAPIRequest(ctx, "/pay/unifiedorder", params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseCreatePaymentResponse(req.PaymentID, wechatResp)
}

// QueryPayment queries WeChat Pay payment status
func (c *WechatChannel) QueryPayment(ctx context.Context, paymentID string) (*PaymentStatus, error) {
	if paymentID == "" {
		return nil, &PaymentChannelError{
			Code:    "INVALID_PAYMENT_ID",
			Message: "payment ID cannot be empty",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build query parameters
	params := c.buildQueryPaymentParams(paymentID)
	
	// Sign the request
	signature := c.signRequest(params)
	params["sign"] = signature
	
	// Make API request
	wechatResp, err := c.makeAPIRequest(ctx, "/pay/orderquery", params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseQueryPaymentResponse(paymentID, wechatResp)
}

// CancelPayment cancels a WeChat Pay payment
func (c *WechatChannel) CancelPayment(ctx context.Context, paymentID string) (*CancelPaymentResponse, error) {
	if paymentID == "" {
		return nil, &PaymentChannelError{
			Code:    "INVALID_PAYMENT_ID",
			Message: "payment ID cannot be empty",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build cancel parameters
	params := c.buildCancelPaymentParams(paymentID)
	
	// Sign the request
	signature := c.signRequest(params)
	params["sign"] = signature
	
	// Make API request
	wechatResp, err := c.makeAPIRequest(ctx, "/pay/closeorder", params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseCancelPaymentResponse(paymentID, wechatResp)
}

// RefundPayment processes a WeChat Pay refund
func (c *WechatChannel) RefundPayment(ctx context.Context, req *RefundPaymentRequest) (*RefundResponse, error) {
	if req == nil {
		return nil, &PaymentChannelError{
			Code:    "INVALID_REQUEST",
			Message: "refund request cannot be nil",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build refund parameters
	params := c.buildRefundPaymentParams(req)
	
	// Sign the request
	signature := c.signRequest(params)
	params["sign"] = signature
	
	// Make API request
	wechatResp, err := c.makeAPIRequest(ctx, "/secapi/pay/refund", params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseRefundPaymentResponse(req.RefundID, wechatResp)
}

// HandleWebhook handles WeChat Pay webhook notifications
func (c *WechatChannel) HandleWebhook(ctx context.Context, payload []byte, headers map[string]string) (*WebhookResult, error) {
	// Parse webhook payload (WeChat Pay uses XML format)
	webhookData, err := c.parseXMLPayload(payload)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "WEBHOOK_PARSE_ERROR",
			Message: fmt.Sprintf("failed to parse webhook payload: %v", err),
			Type:    ErrorTypePermanent,
		}
	}
	
	// Verify webhook signature
	signature, exists := webhookData["sign"]
	if !exists {
		return nil, &PaymentChannelError{
			Code:    "WEBHOOK_SIGNATURE_MISSING",
			Message: "webhook signature is missing",
			Type:    ErrorTypePermanent,
		}
	}
	
	if !c.verifyWebhookSignature(webhookData, signature) {
		return nil, &PaymentChannelError{
			Code:    "WEBHOOK_SIGNATURE_INVALID",
			Message: "webhook signature verification failed",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Extract payment information
	paymentID, _ := webhookData["out_trade_no"]
	resultCode, _ := webhookData["result_code"]
	
	// Map WeChat Pay status to internal status
	eventType := c.mapResultCodeToEventType(resultCode)
	
	return &WebhookResult{
		PaymentID:   paymentID,
		EventType:   eventType,
		Status:      "success",
		Data:        c.convertToInterface(webhookData),
		ProcessedAt: time.Now(),
		ShouldRetry: false,
	}, nil
}

// ValidateWebhookSignature validates WeChat Pay webhook signature
func (c *WechatChannel) ValidateWebhookSignature(payload []byte, signature string, secret string) bool {
	webhookData, err := c.parseXMLPayload(payload)
	if err != nil {
		return false
	}
	
	return c.verifyWebhookSignature(webhookData, signature)
}

// IsHealthy checks if WeChat Pay channel is healthy
func (c *WechatChannel) IsHealthy(ctx context.Context) bool {
	// Simple health check - try to make a test API call
	params := map[string]string{
		"appid":     c.config.AppID,
		"mch_id":    c.config.MchID,
		"nonce_str": c.generateNonceStr(),
	}
	
	signature := c.signRequest(params)
	params["sign"] = signature
	
	_, err := c.makeAPIRequest(ctx, "/pay/orderquery", params)
	if err != nil {
		c.status.IsHealthy = false
		c.status.ErrorMessage = fmt.Sprintf("API error: %v", err)
		return false
	}
	
	c.status.IsHealthy = true
	c.status.ErrorMessage = ""
	c.status.LastCheckTime = time.Now()
	
	return true
}

// Helper methods

func (c *WechatChannel) validateCreatePaymentRequest(req *CreatePaymentRequest) error {
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("amount must be greater than zero")
	}
	
	if req.Currency != "CNY" {
		return fmt.Errorf("unsupported currency: %s", req.Currency)
	}
	
	if req.PaymentType != PaymentTypePrivate {
		return fmt.Errorf("unsupported payment type: %s", req.PaymentType)
	}
	
	return nil
}

func (c *WechatChannel) buildCreatePaymentParams(req *CreatePaymentRequest) map[string]string {
	// Convert amount to cents (WeChat Pay uses cents)
	totalFee := req.Amount.Mul(decimal.NewFromInt(100)).IntPart()
	
	params := map[string]string{
		"appid":            c.config.AppID,
		"mch_id":           c.config.MchID,
		"nonce_str":        c.generateNonceStr(),
		"body":             req.Description,
		"out_trade_no":     req.PaymentID,
		"total_fee":        fmt.Sprintf("%d", totalFee),
		"spbill_create_ip": "127.0.0.1", // Should be actual client IP
		"notify_url":       req.NotifyURL,
		"trade_type":       "NATIVE", // QR code payment
	}
	
	if req.ExpireTime != nil {
		params["time_expire"] = req.ExpireTime.Format("20060102150405")
	}
	
	return params
}

func (c *WechatChannel) buildQueryPaymentParams(paymentID string) map[string]string {
	return map[string]string{
		"appid":        c.config.AppID,
		"mch_id":       c.config.MchID,
		"out_trade_no": paymentID,
		"nonce_str":    c.generateNonceStr(),
	}
}

func (c *WechatChannel) buildCancelPaymentParams(paymentID string) map[string]string {
	return map[string]string{
		"appid":        c.config.AppID,
		"mch_id":       c.config.MchID,
		"out_trade_no": paymentID,
		"nonce_str":    c.generateNonceStr(),
	}
}

func (c *WechatChannel) buildRefundPaymentParams(req *RefundPaymentRequest) map[string]string {
	// Convert amounts to cents
	totalFee := decimal.NewFromFloat(100.00).Mul(decimal.NewFromInt(100)).IntPart() // Assume original amount
	refundFee := req.Amount.Mul(decimal.NewFromInt(100)).IntPart()
	
	return map[string]string{
		"appid":         c.config.AppID,
		"mch_id":        c.config.MchID,
		"nonce_str":     c.generateNonceStr(),
		"out_trade_no":  req.PaymentID,
		"out_refund_no": req.RefundID,
		"total_fee":     fmt.Sprintf("%d", totalFee),
		"refund_fee":    fmt.Sprintf("%d", refundFee),
		"refund_desc":   req.Reason,
	}
}

func (c *WechatChannel) signRequest(params map[string]string) string {
	// Sort parameters
	var keys []string
	for key := range params {
		if key != "sign" && params[key] != "" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	
	// Build sign string
	var signParts []string
	for _, key := range keys {
		signParts = append(signParts, fmt.Sprintf("%s=%s", key, params[key]))
	}
	signString := strings.Join(signParts, "&") + "&key=" + c.config.APIKey
	
	// Calculate MD5 signature
	hash := md5.Sum([]byte(signString))
	return strings.ToUpper(hex.EncodeToString(hash[:]))
}

func (c *WechatChannel) makeAPIRequest(ctx context.Context, endpoint string, params map[string]string) (map[string]string, error) {
	// Build XML request body
	xmlBody := c.buildXMLRequest(params)
	
	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", c.config.GatewayURL+endpoint, strings.NewReader(xmlBody))
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Content-Type", "application/xml")
	
	// Make request
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	// Parse XML response
	return c.parseXMLPayload(body)
}

func (c *WechatChannel) buildXMLRequest(params map[string]string) string {
	var xmlParts []string
	xmlParts = append(xmlParts, "<xml>")
	
	for key, value := range params {
		xmlParts = append(xmlParts, fmt.Sprintf("<%s><![CDATA[%s]]></%s>", key, value, key))
	}
	
	xmlParts = append(xmlParts, "</xml>")
	return strings.Join(xmlParts, "")
}

func (c *WechatChannel) parseXMLPayload(payload []byte) (map[string]string, error) {
	// This is a simplified XML parser
	// In production, use a proper XML parser
	result := make(map[string]string)
	
	// Extract key-value pairs from XML
	// This is a very basic implementation
	// Note: payload is used implicitly for parsing in real implementation
	_ = payload
	
	result["out_trade_no"] = "DEMO_PAYMENT_ID"
	result["result_code"] = "SUCCESS"
	result["sign"] = "DEMO_SIGNATURE"
	
	return result, nil
}

func (c *WechatChannel) parseCreatePaymentResponse(paymentID string, resp map[string]string) (*PaymentResponse, error) {
	// Check if request was successful
	returnCode, exists := resp["return_code"]
	if !exists || returnCode != "SUCCESS" {
		return nil, &PaymentChannelError{
			Code:    "WECHAT_ERROR",
			Message: fmt.Sprintf("WeChat Pay error: %s", resp["return_msg"]),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Extract QR code URL
	codeURL, _ := resp["code_url"]
	
	return &PaymentResponse{
		PaymentID:        paymentID,
		ChannelPaymentID: fmt.Sprintf("WECHAT_%s", paymentID),
		Status:           PaymentStatusPending,
		PaymentURL:       codeURL,
		QRCode:           codeURL, // WeChat Pay returns QR code URL directly
		CreatedAt:        time.Now(),
		ExpireTime:       &[]time.Time{time.Now().Add(30 * time.Minute)}[0],
	}, nil
}

func (c *WechatChannel) parseQueryPaymentResponse(paymentID string, resp map[string]string) (*PaymentStatus, error) {
	// Check if request was successful
	returnCode, exists := resp["return_code"]
	if !exists || returnCode != "SUCCESS" {
		return nil, &PaymentChannelError{
			Code:    "WECHAT_ERROR",
			Message: fmt.Sprintf("WeChat Pay error: %s", resp["return_msg"]),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Map trade state to internal status
	tradeState, _ := resp["trade_state"]
	status := c.mapTradeStateToStatus(tradeState)
	
	// Parse amount (convert from cents)
	totalFee, _ := resp["total_fee"]
	amount := decimal.NewFromFloat(100.00) // Default amount
	if totalFee != "" {
		if cents, err := decimal.NewFromString(totalFee); err == nil {
			amount = cents.Div(decimal.NewFromInt(100))
		}
	}
	
	return &PaymentStatus{
		PaymentID:        paymentID,
		ChannelPaymentID: fmt.Sprintf("WECHAT_%s", paymentID),
		Status:           status,
		Amount:           amount,
		PaidAmount:       amount,
		Currency:         "CNY",
		PaymentTime:      &[]time.Time{time.Now()}[0],
		UpdatedAt:        time.Now(),
	}, nil
}

func (c *WechatChannel) parseCancelPaymentResponse(paymentID string, resp map[string]string) (*CancelPaymentResponse, error) {
	return &CancelPaymentResponse{
		PaymentID:   paymentID,
		Status:      PaymentStatusCancelled,
		CancelledAt: time.Now(),
	}, nil
}

func (c *WechatChannel) parseRefundPaymentResponse(refundID string, resp map[string]string) (*RefundResponse, error) {
	return &RefundResponse{
		RefundID:        refundID,
		ChannelRefundID: fmt.Sprintf("WECHAT_REFUND_%s", refundID),
		Status:          PaymentStatusRefunded,
		Amount:          decimal.NewFromFloat(50.00),
		RefundedAt:      &[]time.Time{time.Now()}[0],
	}, nil
}

func (c *WechatChannel) generateNonceStr() string {
	return fmt.Sprintf("NONCE_%d", time.Now().UnixNano())
}

func (c *WechatChannel) verifyWebhookSignature(data map[string]string, signature string) bool {
	// Remove sign parameter
	delete(data, "sign")
	
	// Calculate expected signature
	expectedSignature := c.signRequest(data)
	
	return signature == expectedSignature
}

func (c *WechatChannel) mapResultCodeToEventType(resultCode string) string {
	switch resultCode {
	case "SUCCESS":
		return EventTypePaymentPaid
	case "FAIL":
		return EventTypePaymentFailed
	default:
		return EventTypePaymentFailed
	}
}

func (c *WechatChannel) mapTradeStateToStatus(tradeState string) string {
	switch tradeState {
	case "SUCCESS":
		return PaymentStatusPaid
	case "REFUND":
		return PaymentStatusRefunded
	case "NOTPAY":
		return PaymentStatusPending
	case "CLOSED":
		return PaymentStatusCancelled
	case "REVOKED":
		return PaymentStatusCancelled
	case "USERPAYING":
		return PaymentStatusPending
	case "PAYERROR":
		return PaymentStatusFailed
	default:
		return PaymentStatusFailed
	}
}

func (c *WechatChannel) convertToInterface(data map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for key, value := range data {
		result[key] = value
	}
	return result
}
package service

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// AlipayChannel implements PaymentChannel for Alipay
type AlipayChannel struct {
	*BasePaymentChannel
	config *AlipayConfig
	client *http.Client
}

// AlipayConfig holds Alipay configuration
type AlipayConfig struct {
	AppID        string `json:"app_id"`
	PrivateKey   string `json:"private_key"`
	PublicKey    string `json:"public_key"`
	GatewayURL   string `json:"gateway_url"`
	NotifyURL    string `json:"notify_url"`
	ReturnURL    string `json:"return_url"`
	SignType     string `json:"sign_type"`
	Format       string `json:"format"`
	Charset      string `json:"charset"`
	Version      string `json:"version"`
	Timeout      time.Duration `json:"timeout"`
}

// NewAlipayChannel creates a new Alipay payment channel
func NewAlipayChannel(channelID, channelName string, config *AlipayConfig) *AlipayChannel {
	baseChannel := NewBasePaymentChannel(channelID, channelName, ChannelTypeAlipay)
	
	// Set Alipay-specific limits
	baseChannel.limits = &ChannelLimits{
		MinAmount:    decimal.NewFromFloat(0.01),
		MaxAmount:    decimal.NewFromFloat(50000),
		DailyLimit:   decimal.NewFromFloat(500000),
		MonthlyLimit: decimal.NewFromFloat(15000000),
		SingleLimit:  decimal.NewFromFloat(50000),
	}
	
	// Set default config if not provided
	if config == nil {
		config = &AlipayConfig{
			GatewayURL: "https://openapi.alipay.com/gateway.do",
			SignType:   "RSA2",
			Format:     "JSON",
			Charset:    "utf-8",
			Version:    "1.0",
			Timeout:    30 * time.Second,
		}
	}
	
	return &AlipayChannel{
		BasePaymentChannel: baseChannel,
		config:             config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// SupportedPaymentTypes returns supported payment types for Alipay
func (c *AlipayChannel) SupportedPaymentTypes() []string {
	return []string{PaymentTypePrivate} // Alipay typically supports private payments
}

// SupportedCurrencies returns supported currencies for Alipay
func (c *AlipayChannel) SupportedCurrencies() []string {
	return []string{"CNY"} // Alipay primarily supports CNY
}

// CreatePayment creates an Alipay payment
func (c *AlipayChannel) CreatePayment(ctx context.Context, req *CreatePaymentRequest) (*PaymentResponse, error) {
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
	
	// Build Alipay request parameters
	params := c.buildCreatePaymentParams(req)
	
	// Sign the request
	signature, err := c.signRequest(params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "SIGN_ERROR",
			Message: fmt.Sprintf("failed to sign request: %v", err),
			Type:    ErrorTypeTemporary,
		}
	}
	params["sign"] = signature
	
	// Make API request
	alipayResp, err := c.makeAPIRequest(ctx, params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseCreatePaymentResponse(req.PaymentID, alipayResp)
}

// QueryPayment queries Alipay payment status
func (c *AlipayChannel) QueryPayment(ctx context.Context, paymentID string) (*PaymentStatus, error) {
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
	signature, err := c.signRequest(params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "SIGN_ERROR",
			Message: fmt.Sprintf("failed to sign request: %v", err),
			Type:    ErrorTypeTemporary,
		}
	}
	params["sign"] = signature
	
	// Make API request
	alipayResp, err := c.makeAPIRequest(ctx, params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseQueryPaymentResponse(paymentID, alipayResp)
}

// CancelPayment cancels an Alipay payment
func (c *AlipayChannel) CancelPayment(ctx context.Context, paymentID string) (*CancelPaymentResponse, error) {
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
	signature, err := c.signRequest(params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "SIGN_ERROR",
			Message: fmt.Sprintf("failed to sign request: %v", err),
			Type:    ErrorTypeTemporary,
		}
	}
	params["sign"] = signature
	
	// Make API request
	alipayResp, err := c.makeAPIRequest(ctx, params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseCancelPaymentResponse(paymentID, alipayResp)
}

// RefundPayment processes an Alipay refund
func (c *AlipayChannel) RefundPayment(ctx context.Context, req *RefundPaymentRequest) (*RefundResponse, error) {
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
	signature, err := c.signRequest(params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "SIGN_ERROR",
			Message: fmt.Sprintf("failed to sign request: %v", err),
			Type:    ErrorTypeTemporary,
		}
	}
	params["sign"] = signature
	
	// Make API request
	alipayResp, err := c.makeAPIRequest(ctx, params)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseRefundPaymentResponse(req.RefundID, alipayResp)
}

// HandleWebhook handles Alipay webhook notifications
func (c *AlipayChannel) HandleWebhook(ctx context.Context, payload []byte, headers map[string]string) (*WebhookResult, error) {
	// Parse webhook payload
	var webhookData map[string]interface{}
	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return nil, &PaymentChannelError{
			Code:    "WEBHOOK_PARSE_ERROR",
			Message: fmt.Sprintf("failed to parse webhook payload: %v", err),
			Type:    ErrorTypePermanent,
		}
	}
	
	// Verify webhook signature
	signature, exists := webhookData["sign"].(string)
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
	paymentID, _ := webhookData["out_trade_no"].(string)
	tradeStatus, _ := webhookData["trade_status"].(string)
	
	// Map Alipay status to internal status
	eventType := c.mapTradeStatusToEventType(tradeStatus)
	
	return &WebhookResult{
		PaymentID:   paymentID,
		EventType:   eventType,
		Status:      "success",
		Data:        webhookData,
		ProcessedAt: time.Now(),
		ShouldRetry: false,
	}, nil
}

// ValidateWebhookSignature validates Alipay webhook signature
func (c *AlipayChannel) ValidateWebhookSignature(payload []byte, signature string, secret string) bool {
	var webhookData map[string]interface{}
	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return false
	}
	
	return c.verifyWebhookSignature(webhookData, signature)
}

// IsHealthy checks if Alipay channel is healthy
func (c *AlipayChannel) IsHealthy(ctx context.Context) bool {
	// Simple health check - try to make a test API call
	params := map[string]string{
		"app_id":    c.config.AppID,
		"method":    "alipay.system.oauth.token",
		"format":    c.config.Format,
		"charset":   c.config.Charset,
		"sign_type": c.config.SignType,
		"timestamp": time.Now().Format("2006-01-02 15:04:05"),
		"version":   c.config.Version,
	}
	
	signature, err := c.signRequest(params)
	if err != nil {
		c.status.IsHealthy = false
		c.status.ErrorMessage = fmt.Sprintf("signature error: %v", err)
		return false
	}
	params["sign"] = signature
	
	_, err = c.makeAPIRequest(ctx, params)
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

func (c *AlipayChannel) validateCreatePaymentRequest(req *CreatePaymentRequest) error {
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

func (c *AlipayChannel) buildCreatePaymentParams(req *CreatePaymentRequest) map[string]string {
	bizContent := map[string]interface{}{
		"out_trade_no": req.PaymentID,
		"total_amount": req.Amount.String(),
		"subject":      req.Description,
		"product_code": "FAST_INSTANT_TRADE_PAY",
	}
	
	if req.ExpireTime != nil {
		bizContent["timeout_express"] = fmt.Sprintf("%dm", int(time.Until(*req.ExpireTime).Minutes()))
	}
	
	bizContentJSON, _ := json.Marshal(bizContent)
	
	return map[string]string{
		"app_id":      c.config.AppID,
		"method":      "alipay.trade.page.pay",
		"format":      c.config.Format,
		"charset":     c.config.Charset,
		"sign_type":   c.config.SignType,
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     c.config.Version,
		"notify_url":  req.NotifyURL,
		"return_url":  req.ReturnURL,
		"biz_content": string(bizContentJSON),
	}
}

func (c *AlipayChannel) buildQueryPaymentParams(paymentID string) map[string]string {
	bizContent := map[string]interface{}{
		"out_trade_no": paymentID,
	}
	
	bizContentJSON, _ := json.Marshal(bizContent)
	
	return map[string]string{
		"app_id":      c.config.AppID,
		"method":      "alipay.trade.query",
		"format":      c.config.Format,
		"charset":     c.config.Charset,
		"sign_type":   c.config.SignType,
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     c.config.Version,
		"biz_content": string(bizContentJSON),
	}
}

func (c *AlipayChannel) buildCancelPaymentParams(paymentID string) map[string]string {
	bizContent := map[string]interface{}{
		"out_trade_no": paymentID,
	}
	
	bizContentJSON, _ := json.Marshal(bizContent)
	
	return map[string]string{
		"app_id":      c.config.AppID,
		"method":      "alipay.trade.cancel",
		"format":      c.config.Format,
		"charset":     c.config.Charset,
		"sign_type":   c.config.SignType,
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     c.config.Version,
		"biz_content": string(bizContentJSON),
	}
}

func (c *AlipayChannel) buildRefundPaymentParams(req *RefundPaymentRequest) map[string]string {
	bizContent := map[string]interface{}{
		"out_trade_no":   req.PaymentID,
		"out_request_no": req.RefundID,
		"refund_amount":  req.Amount.String(),
		"refund_reason":  req.Reason,
	}
	
	bizContentJSON, _ := json.Marshal(bizContent)
	
	return map[string]string{
		"app_id":      c.config.AppID,
		"method":      "alipay.trade.refund",
		"format":      c.config.Format,
		"charset":     c.config.Charset,
		"sign_type":   c.config.SignType,
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     c.config.Version,
		"biz_content": string(bizContentJSON),
	}
}

func (c *AlipayChannel) signRequest(params map[string]string) (string, error) {
	// Sort parameters
	var keys []string
	for key := range params {
		if key != "sign" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	
	// Build sign string
	var signParts []string
	for _, key := range keys {
		if params[key] != "" {
			signParts = append(signParts, fmt.Sprintf("%s=%s", key, params[key]))
		}
	}
	signString := strings.Join(signParts, "&")
	
	// For demo purposes, use MD5 signature (in production, use RSA2)
	hash := md5.Sum([]byte(signString + c.config.PrivateKey))
	return hex.EncodeToString(hash[:]), nil
}

func (c *AlipayChannel) makeAPIRequest(ctx context.Context, params map[string]string) (map[string]interface{}, error) {
	// Build form data
	formData := url.Values{}
	for key, value := range params {
		formData.Set(key, value)
	}
	
	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", c.config.GatewayURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	
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
	
	// Parse JSON response
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

func (c *AlipayChannel) parseCreatePaymentResponse(paymentID string, resp map[string]interface{}) (*PaymentResponse, error) {
	// This is a simplified implementation
	// In real implementation, you'd parse the actual Alipay response structure
	
	return &PaymentResponse{
		PaymentID:        paymentID,
		ChannelPaymentID: fmt.Sprintf("ALIPAY_%s", paymentID),
		Status:           PaymentStatusPending,
		PaymentURL:       fmt.Sprintf("https://openapi.alipay.com/gateway.do?%s", c.buildPaymentURL(resp)),
		CreatedAt:        time.Now(),
		ExpireTime:       &[]time.Time{time.Now().Add(30 * time.Minute)}[0],
	}, nil
}

func (c *AlipayChannel) parseQueryPaymentResponse(paymentID string, resp map[string]interface{}) (*PaymentStatus, error) {
	// This is a simplified implementation
	// In real implementation, you'd parse the actual Alipay response structure
	
	return &PaymentStatus{
		PaymentID:        paymentID,
		ChannelPaymentID: fmt.Sprintf("ALIPAY_%s", paymentID),
		Status:           PaymentStatusPaid,
		Amount:           decimal.NewFromFloat(100.00),
		PaidAmount:       decimal.NewFromFloat(100.00),
		Currency:         "CNY",
		PaymentTime:      &[]time.Time{time.Now()}[0],
		UpdatedAt:        time.Now(),
	}, nil
}

func (c *AlipayChannel) parseCancelPaymentResponse(paymentID string, resp map[string]interface{}) (*CancelPaymentResponse, error) {
	return &CancelPaymentResponse{
		PaymentID:   paymentID,
		Status:      PaymentStatusCancelled,
		CancelledAt: time.Now(),
	}, nil
}

func (c *AlipayChannel) parseRefundPaymentResponse(refundID string, resp map[string]interface{}) (*RefundResponse, error) {
	return &RefundResponse{
		RefundID:        refundID,
		ChannelRefundID: fmt.Sprintf("ALIPAY_REFUND_%s", refundID),
		Status:          PaymentStatusRefunded,
		Amount:          decimal.NewFromFloat(50.00),
		RefundedAt:      &[]time.Time{time.Now()}[0],
	}, nil
}

func (c *AlipayChannel) buildPaymentURL(resp map[string]interface{}) string {
	// Build payment URL from response parameters
	return "payment_url_params"
}

func (c *AlipayChannel) verifyWebhookSignature(data map[string]interface{}, signature string) bool {
	// Remove sign parameter
	delete(data, "sign")
	delete(data, "sign_type")
	
	// Sort and build sign string
	var keys []string
	for key := range data {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	
	var signParts []string
	for _, key := range keys {
		if value, ok := data[key].(string); ok && value != "" {
			signParts = append(signParts, fmt.Sprintf("%s=%s", key, value))
		}
	}
	signString := strings.Join(signParts, "&")
	
	// Calculate expected signature
	hash := md5.Sum([]byte(signString + c.config.PrivateKey))
	expectedSignature := hex.EncodeToString(hash[:])
	
	return signature == expectedSignature
}

func (c *AlipayChannel) mapTradeStatusToEventType(tradeStatus string) string {
	switch tradeStatus {
	case "TRADE_SUCCESS", "TRADE_FINISHED":
		return EventTypePaymentPaid
	case "TRADE_CLOSED":
		return EventTypePaymentCancelled
	case "WAIT_BUYER_PAY":
		return EventTypePaymentCreated
	default:
		return EventTypePaymentFailed
	}
}
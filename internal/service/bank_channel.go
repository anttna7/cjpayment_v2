package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// BankChannel implements PaymentChannel for bank transfers
type BankChannel struct {
	*BasePaymentChannel
	config *BankChannelConfig
	client *http.Client
}

// BankChannelConfig holds bank channel configuration
type BankChannelConfig struct {
	BankCode     string        `json:"bank_code"`
	BankName     string        `json:"bank_name"`
	APIBaseURL   string        `json:"api_base_url"`
	APIKey       string        `json:"api_key"`
	APISecret    string        `json:"api_secret"`
	MerchantID   string        `json:"merchant_id"`
	NotifyURL    string        `json:"notify_url"`
	ReturnURL    string        `json:"return_url"`
	SignType     string        `json:"sign_type"`
	Timeout      time.Duration `json:"timeout"`
}

// NewBankChannel creates a new bank payment channel
func NewBankChannel(channelID, channelName string, config *BankChannelConfig) *BankChannel {
	baseChannel := NewBasePaymentChannel(channelID, channelName, ChannelTypeBank)
	
	// Set bank-specific limits (typically higher for bank transfers)
	baseChannel.limits = &ChannelLimits{
		MinAmount:    decimal.NewFromFloat(1.00),
		MaxAmount:    decimal.NewFromFloat(1000000),
		DailyLimit:   decimal.NewFromFloat(10000000),
		MonthlyLimit: decimal.NewFromFloat(300000000),
		SingleLimit:  decimal.NewFromFloat(1000000),
	}
	
	// Set default config if not provided
	if config == nil {
		config = &BankChannelConfig{
			APIBaseURL: "https://api.bank.example.com",
			SignType:   "HMAC-SHA256",
			Timeout:    60 * time.Second, // Bank transfers may take longer
		}
	}
	
	return &BankChannel{
		BasePaymentChannel: baseChannel,
		config:             config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// SupportedPaymentTypes returns supported payment types for bank transfers
func (c *BankChannel) SupportedPaymentTypes() []string {
	return []string{PaymentTypePublic, PaymentTypePrivate} // Banks support both
}

// SupportedCurrencies returns supported currencies for bank transfers
func (c *BankChannel) SupportedCurrencies() []string {
	return []string{"CNY", "USD", "EUR"} // Banks typically support multiple currencies
}

// CreatePayment creates a bank transfer payment
func (c *BankChannel) CreatePayment(ctx context.Context, req *CreatePaymentRequest) (*PaymentResponse, error) {
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
	
	// Build bank API request
	apiReq := c.buildCreatePaymentRequest(req)
	
	// Make API request
	bankResp, err := c.makeAPIRequest(ctx, "POST", "/api/v1/payments", apiReq)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseCreatePaymentResponse(req.PaymentID, bankResp)
}

// QueryPayment queries bank transfer payment status
func (c *BankChannel) QueryPayment(ctx context.Context, paymentID string) (*PaymentStatus, error) {
	if paymentID == "" {
		return nil, &PaymentChannelError{
			Code:    "INVALID_PAYMENT_ID",
			Message: "payment ID cannot be empty",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build query request
	queryParams := map[string]string{
		"merchant_id":    c.config.MerchantID,
		"out_trade_no":   paymentID,
		"timestamp":      fmt.Sprintf("%d", time.Now().Unix()),
	}
	
	// Make API request
	bankResp, err := c.makeAPIRequest(ctx, "GET", fmt.Sprintf("/api/v1/payments/%s", paymentID), queryParams)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseQueryPaymentResponse(paymentID, bankResp)
}

// CancelPayment cancels a bank transfer payment
func (c *BankChannel) CancelPayment(ctx context.Context, paymentID string) (*CancelPaymentResponse, error) {
	if paymentID == "" {
		return nil, &PaymentChannelError{
			Code:    "INVALID_PAYMENT_ID",
			Message: "payment ID cannot be empty",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build cancel request
	cancelReq := map[string]interface{}{
		"merchant_id":  c.config.MerchantID,
		"out_trade_no": paymentID,
		"timestamp":    time.Now().Unix(),
		"reason":       "User cancelled",
	}
	
	// Make API request
	bankResp, err := c.makeAPIRequest(ctx, "POST", fmt.Sprintf("/api/v1/payments/%s/cancel", paymentID), cancelReq)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseCancelPaymentResponse(paymentID, bankResp)
}

// RefundPayment processes a bank transfer refund
func (c *BankChannel) RefundPayment(ctx context.Context, req *RefundPaymentRequest) (*RefundResponse, error) {
	if req == nil {
		return nil, &PaymentChannelError{
			Code:    "INVALID_REQUEST",
			Message: "refund request cannot be nil",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Build refund request
	refundReq := map[string]interface{}{
		"merchant_id":    c.config.MerchantID,
		"out_trade_no":   req.PaymentID,
		"out_refund_no":  req.RefundID,
		"refund_amount":  req.Amount.String(),
		"refund_reason":  req.Reason,
		"timestamp":      time.Now().Unix(),
		"notify_url":     req.NotifyURL,
	}
	
	// Make API request
	bankResp, err := c.makeAPIRequest(ctx, "POST", "/api/v1/refunds", refundReq)
	if err != nil {
		return nil, &PaymentChannelError{
			Code:    "API_ERROR",
			Message: fmt.Sprintf("API request failed: %v", err),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Parse response
	return c.parseRefundPaymentResponse(req.RefundID, bankResp)
}

// HandleWebhook handles bank webhook notifications
func (c *BankChannel) HandleWebhook(ctx context.Context, payload []byte, headers map[string]string) (*WebhookResult, error) {
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
	signature := headers["X-Bank-Signature"]
	if signature == "" {
		return nil, &PaymentChannelError{
			Code:    "WEBHOOK_SIGNATURE_MISSING",
			Message: "webhook signature is missing",
			Type:    ErrorTypePermanent,
		}
	}
	
	if !c.verifyWebhookSignature(payload, signature) {
		return nil, &PaymentChannelError{
			Code:    "WEBHOOK_SIGNATURE_INVALID",
			Message: "webhook signature verification failed",
			Type:    ErrorTypePermanent,
		}
	}
	
	// Extract payment information
	paymentID, _ := webhookData["out_trade_no"].(string)
	status, _ := webhookData["status"].(string)
	
	// Map bank status to internal event type
	mappedEventType := c.mapStatusToEventType(status)
	
	return &WebhookResult{
		PaymentID:   paymentID,
		EventType:   mappedEventType,
		Status:      "success",
		Data:        webhookData,
		ProcessedAt: time.Now(),
		ShouldRetry: false,
	}, nil
}

// ValidateWebhookSignature validates bank webhook signature
func (c *BankChannel) ValidateWebhookSignature(payload []byte, signature string, secret string) bool {
	return c.verifyWebhookSignature(payload, signature)
}

// IsHealthy checks if bank channel is healthy
func (c *BankChannel) IsHealthy(ctx context.Context) bool {
	// Simple health check - try to make a test API call
	healthReq := map[string]interface{}{
		"merchant_id": c.config.MerchantID,
		"timestamp":   time.Now().Unix(),
	}
	
	_, err := c.makeAPIRequest(ctx, "GET", "/api/v1/health", healthReq)
	if err != nil {
		c.status.IsHealthy = false
		c.status.ErrorMessage = fmt.Sprintf("health check failed: %v", err)
		return false
	}
	
	c.status.IsHealthy = true
	c.status.ErrorMessage = ""
	c.status.LastCheckTime = time.Now()
	
	return true
}

// Helper methods

func (c *BankChannel) validateCreatePaymentRequest(req *CreatePaymentRequest) error {
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("amount must be greater than zero")
	}
	
	// Check if currency is supported
	supportedCurrencies := c.SupportedCurrencies()
	currencySupported := false
	for _, currency := range supportedCurrencies {
		if req.Currency == currency {
			currencySupported = true
			break
		}
	}
	if !currencySupported {
		return fmt.Errorf("unsupported currency: %s", req.Currency)
	}
	
	// Check if payment type is supported
	supportedTypes := c.SupportedPaymentTypes()
	typeSupported := false
	for _, paymentType := range supportedTypes {
		if req.PaymentType == paymentType {
			typeSupported = true
			break
		}
	}
	if !typeSupported {
		return fmt.Errorf("unsupported payment type: %s", req.PaymentType)
	}
	
	return nil
}

func (c *BankChannel) buildCreatePaymentRequest(req *CreatePaymentRequest) map[string]interface{} {
	apiReq := map[string]interface{}{
		"merchant_id":    c.config.MerchantID,
		"out_trade_no":   req.PaymentID,
		"amount":         req.Amount.String(),
		"currency":       req.Currency,
		"payment_type":   req.PaymentType,
		"subject":        req.Description,
		"notify_url":     req.NotifyURL,
		"return_url":     req.ReturnURL,
		"timestamp":      time.Now().Unix(),
	}
	
	// Add payer information
	if req.PayerInfo != nil {
		apiReq["payer_name"] = req.PayerInfo.Name
		apiReq["payer_account"] = req.PayerInfo.Account
		if req.PayerInfo.Email != "" {
			apiReq["payer_email"] = req.PayerInfo.Email
		}
		if req.PayerInfo.Phone != "" {
			apiReq["payer_phone"] = req.PayerInfo.Phone
		}
	}
	
	// Add receiver information
	if req.ReceiverInfo != nil {
		apiReq["receiver_name"] = req.ReceiverInfo.Name
		apiReq["receiver_account"] = req.ReceiverInfo.Account
		if req.ReceiverInfo.BankName != "" {
			apiReq["receiver_bank"] = req.ReceiverInfo.BankName
		}
		if req.ReceiverInfo.BankBranch != "" {
			apiReq["receiver_branch"] = req.ReceiverInfo.BankBranch
		}
	}
	
	// Add expiration time
	if req.ExpireTime != nil {
		apiReq["expire_time"] = req.ExpireTime.Unix()
	}
	
	// Add extra parameters
	if req.ExtraParams != nil {
		for key, value := range req.ExtraParams {
			apiReq[key] = value
		}
	}
	
	return apiReq
}

func (c *BankChannel) makeAPIRequest(ctx context.Context, method, endpoint string, data interface{}) (map[string]interface{}, error) {
	var reqBody io.Reader
	var contentType string
	
	if method == "GET" {
		// For GET requests, convert data to query parameters
		if params, ok := data.(map[string]string); ok {
			values := url.Values{}
			for key, value := range params {
				values.Set(key, value)
			}
			endpoint += "?" + values.Encode()
		}
		contentType = "application/json"
	} else {
		// For POST requests, send JSON body
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, err
		}
		reqBody = strings.NewReader(string(jsonData))
		contentType = "application/json"
	}
	
	// Create request
	req, err := http.NewRequestWithContext(ctx, method, c.config.APIBaseURL+endpoint, reqBody)
	if err != nil {
		return nil, err
	}
	
	// Set headers
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("X-API-Key", c.config.APIKey)
	
	// Add signature header
	if method != "GET" {
		if jsonData, err := json.Marshal(data); err == nil {
			signature := c.generateSignature(jsonData)
			req.Header.Set("X-Signature", signature)
		}
	}
	
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
	
	// Check HTTP status
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(body))
	}
	
	// Parse JSON response
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	
	return result, nil
}

func (c *BankChannel) parseCreatePaymentResponse(paymentID string, resp map[string]interface{}) (*PaymentResponse, error) {
	// Check if request was successful
	code, _ := resp["code"].(float64)
	if code != 0 {
		message, _ := resp["message"].(string)
		return nil, &PaymentChannelError{
			Code:    "BANK_ERROR",
			Message: fmt.Sprintf("Bank error: %s", message),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Extract response data
	data, _ := resp["data"].(map[string]interface{})
	channelPaymentID, _ := data["transaction_id"].(string)
	paymentURL, _ := data["payment_url"].(string)
	status, _ := data["status"].(string)
	
	return &PaymentResponse{
		PaymentID:        paymentID,
		ChannelPaymentID: channelPaymentID,
		Status:           c.mapBankStatusToInternal(status),
		PaymentURL:       paymentURL,
		CreatedAt:        time.Now(),
		ExpireTime:       &[]time.Time{time.Now().Add(24 * time.Hour)}[0], // Bank transfers typically have longer expiry
	}, nil
}

func (c *BankChannel) parseQueryPaymentResponse(paymentID string, resp map[string]interface{}) (*PaymentStatus, error) {
	// Check if request was successful
	code, _ := resp["code"].(float64)
	if code != 0 {
		message, _ := resp["message"].(string)
		return nil, &PaymentChannelError{
			Code:    "BANK_ERROR",
			Message: fmt.Sprintf("Bank error: %s", message),
			Type:    ErrorTypeRetryable,
		}
	}
	
	// Extract response data
	data, _ := resp["data"].(map[string]interface{})
	channelPaymentID, _ := data["transaction_id"].(string)
	status, _ := data["status"].(string)
	amountStr, _ := data["amount"].(string)
	currency, _ := data["currency"].(string)
	
	// Parse amount
	amount, err := decimal.NewFromString(amountStr)
	if err != nil {
		amount = decimal.Zero
	}
	
	return &PaymentStatus{
		PaymentID:        paymentID,
		ChannelPaymentID: channelPaymentID,
		Status:           c.mapBankStatusToInternal(status),
		Amount:           amount,
		PaidAmount:       amount,
		Currency:         currency,
		PaymentTime:      &[]time.Time{time.Now()}[0],
		UpdatedAt:        time.Now(),
	}, nil
}

func (c *BankChannel) parseCancelPaymentResponse(paymentID string, resp map[string]interface{}) (*CancelPaymentResponse, error) {
	// Check if request was successful
	code, _ := resp["code"].(float64)
	if code != 0 {
		message, _ := resp["message"].(string)
		return &CancelPaymentResponse{
			PaymentID:     paymentID,
			Status:        PaymentStatusFailed,
			FailureReason: message,
			CancelledAt:   time.Now(),
		}, nil
	}
	
	return &CancelPaymentResponse{
		PaymentID:   paymentID,
		Status:      PaymentStatusCancelled,
		CancelledAt: time.Now(),
	}, nil
}

func (c *BankChannel) parseRefundPaymentResponse(refundID string, resp map[string]interface{}) (*RefundResponse, error) {
	// Check if request was successful
	code, _ := resp["code"].(float64)
	if code != 0 {
		message, _ := resp["message"].(string)
		return &RefundResponse{
			RefundID:      refundID,
			Status:        PaymentStatusFailed,
			FailureReason: message,
		}, nil
	}
	
	// Extract response data
	data, _ := resp["data"].(map[string]interface{})
	channelRefundID, _ := data["refund_id"].(string)
	amountStr, _ := data["refund_amount"].(string)
	
	// Parse amount
	amount, err := decimal.NewFromString(amountStr)
	if err != nil {
		amount = decimal.Zero
	}
	
	return &RefundResponse{
		RefundID:        refundID,
		ChannelRefundID: channelRefundID,
		Status:          PaymentStatusRefunded,
		Amount:          amount,
		RefundedAt:      &[]time.Time{time.Now()}[0],
	}, nil
}

func (c *BankChannel) generateSignature(data []byte) string {
	mac := hmac.New(sha256.New, []byte(c.config.APISecret))
	mac.Write(data)
	return hex.EncodeToString(mac.Sum(nil))
}

func (c *BankChannel) verifyWebhookSignature(payload []byte, signature string) bool {
	expectedSignature := c.generateSignature(payload)
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func (c *BankChannel) mapBankStatusToInternal(bankStatus string) string {
	switch strings.ToUpper(bankStatus) {
	case "SUCCESS", "COMPLETED", "PAID":
		return PaymentStatusPaid
	case "PENDING", "PROCESSING", "WAITING":
		return PaymentStatusPending
	case "FAILED", "ERROR":
		return PaymentStatusFailed
	case "CANCELLED", "CANCELED":
		return PaymentStatusCancelled
	case "EXPIRED":
		return PaymentStatusExpired
	case "REFUNDED":
		return PaymentStatusRefunded
	default:
		return PaymentStatusPending
	}
}

func (c *BankChannel) mapStatusToEventType(status string) string {
	switch strings.ToUpper(status) {
	case "SUCCESS", "COMPLETED", "PAID":
		return EventTypePaymentPaid
	case "FAILED", "ERROR":
		return EventTypePaymentFailed
	case "CANCELLED", "CANCELED":
		return EventTypePaymentCancelled
	case "EXPIRED":
		return EventTypePaymentExpired
	case "REFUNDED":
		return EventTypeRefundCompleted
	default:
		return EventTypePaymentCreated
	}
}
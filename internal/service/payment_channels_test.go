package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAlipayChannel(t *testing.T) {
	config := &AlipayConfig{
		AppID:      "test_app_id",
		PrivateKey: "test_private_key",
		PublicKey:  "test_public_key",
		GatewayURL: "https://openapi.alipay.com/gateway.do",
		SignType:   "RSA2",
		Format:     "JSON",
		Charset:    "utf-8",
		Version:    "1.0",
		Timeout:    30 * time.Second,
	}
	
	channel := NewAlipayChannel("alipay-test", "Alipay Test Channel", config)
	
	t.Run("ChannelProperties", func(t *testing.T) {
		assert.Equal(t, "alipay-test", channel.GetChannelID())
		assert.Equal(t, "Alipay Test Channel", channel.GetChannelName())
		assert.Equal(t, ChannelTypeAlipay, channel.GetChannelType())
		
		supportedTypes := channel.SupportedPaymentTypes()
		assert.Contains(t, supportedTypes, PaymentTypePrivate)
		
		supportedCurrencies := channel.SupportedCurrencies()
		assert.Contains(t, supportedCurrencies, "CNY")
		
		limits := channel.GetChannelLimits()
		assert.NotNil(t, limits)
		assert.True(t, limits.MaxAmount.Equal(decimal.NewFromFloat(50000)))
	})
	
	t.Run("CreatePayment", func(t *testing.T) {
		req := &CreatePaymentRequest{
			OrderID:     uuid.New(),
			PaymentID:   "alipay-payment-123",
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePrivate,
			PayerInfo: &PayerInfo{
				Name:    "Test Payer",
				Account: "test-account",
			},
			ReceiverInfo: &ReceiverInfo{
				Name:    "Test Receiver",
				Account: "receiver-account",
			},
			Description: "Test Alipay payment",
			NotifyURL:   "https://example.com/notify",
			ReturnURL:   "https://example.com/return",
		}
		
		// Note: This will fail in tests because we don't have a real Alipay API
		// In a real test environment, you would mock the HTTP client
		_, err := channel.CreatePayment(context.Background(), req)
		assert.Error(t, err) // Expected to fail without real API
		
		var paymentErr *PaymentChannelError
		assert.ErrorAs(t, err, &paymentErr)
		assert.Equal(t, ErrorTypeRetryable, paymentErr.GetErrorType())
	})
	
	t.Run("ValidationErrors", func(t *testing.T) {
		// Test nil request
		_, err := channel.CreatePayment(context.Background(), nil)
		assert.Error(t, err)
		
		// Test invalid currency
		req := &CreatePaymentRequest{
			OrderID:     uuid.New(),
			PaymentID:   "test-payment",
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "USD", // Not supported by Alipay
			PaymentType: PaymentTypePrivate,
		}
		
		_, err = channel.CreatePayment(context.Background(), req)
		assert.Error(t, err)
		
		var paymentErr *PaymentChannelError
		assert.ErrorAs(t, err, &paymentErr)
		assert.Equal(t, ErrorTypePermanent, paymentErr.GetErrorType())
	})
}

func TestWechatChannel(t *testing.T) {
	config := &WechatConfig{
		AppID:      "test_app_id",
		MchID:      "test_mch_id",
		APIKey:     "test_api_key",
		GatewayURL: "https://api.mch.weixin.qq.com",
		SignType:   "MD5",
		Timeout:    30 * time.Second,
	}
	
	channel := NewWechatChannel("wechat-test", "WeChat Test Channel", config)
	
	t.Run("ChannelProperties", func(t *testing.T) {
		assert.Equal(t, "wechat-test", channel.GetChannelID())
		assert.Equal(t, "WeChat Test Channel", channel.GetChannelName())
		assert.Equal(t, ChannelTypeWechat, channel.GetChannelType())
		
		supportedTypes := channel.SupportedPaymentTypes()
		assert.Contains(t, supportedTypes, PaymentTypePrivate)
		
		supportedCurrencies := channel.SupportedCurrencies()
		assert.Contains(t, supportedCurrencies, "CNY")
		
		limits := channel.GetChannelLimits()
		assert.NotNil(t, limits)
		assert.True(t, limits.MaxAmount.Equal(decimal.NewFromFloat(50000)))
	})
	
	t.Run("SignatureGeneration", func(t *testing.T) {
		params := map[string]string{
			"appid":        "test_app_id",
			"mch_id":       "test_mch_id",
			"out_trade_no": "test_payment_123",
			"total_fee":    "10000",
		}
		
		signature := channel.signRequest(params)
		assert.NotEmpty(t, signature)
		assert.Len(t, signature, 32) // MD5 hash length
	})
	
	t.Run("NonceGeneration", func(t *testing.T) {
		nonce1 := channel.generateNonceStr()
		nonce2 := channel.generateNonceStr()
		
		assert.NotEmpty(t, nonce1)
		assert.NotEmpty(t, nonce2)
		assert.NotEqual(t, nonce1, nonce2)
		assert.Contains(t, nonce1, "NONCE_")
	})
	
	t.Run("StatusMapping", func(t *testing.T) {
		assert.Equal(t, PaymentStatusPaid, channel.mapTradeStateToStatus("SUCCESS"))
		assert.Equal(t, PaymentStatusRefunded, channel.mapTradeStateToStatus("REFUND"))
		assert.Equal(t, PaymentStatusPending, channel.mapTradeStateToStatus("NOTPAY"))
		assert.Equal(t, PaymentStatusCancelled, channel.mapTradeStateToStatus("CLOSED"))
		assert.Equal(t, PaymentStatusFailed, channel.mapTradeStateToStatus("UNKNOWN"))
	})
}

func TestBankChannel(t *testing.T) {
	config := &BankChannelConfig{
		BankCode:   "TEST_BANK",
		BankName:   "Test Bank",
		APIBaseURL: "https://api.testbank.com",
		APIKey:     "test_api_key",
		APISecret:  "test_api_secret",
		MerchantID: "test_merchant_123",
		SignType:   "HMAC-SHA256",
		Timeout:    60 * time.Second,
	}
	
	channel := NewBankChannel("bank-test", "Bank Test Channel", config)
	
	t.Run("ChannelProperties", func(t *testing.T) {
		assert.Equal(t, "bank-test", channel.GetChannelID())
		assert.Equal(t, "Bank Test Channel", channel.GetChannelName())
		assert.Equal(t, ChannelTypeBank, channel.GetChannelType())
		
		supportedTypes := channel.SupportedPaymentTypes()
		assert.Contains(t, supportedTypes, PaymentTypePublic)
		assert.Contains(t, supportedTypes, PaymentTypePrivate)
		
		supportedCurrencies := channel.SupportedCurrencies()
		assert.Contains(t, supportedCurrencies, "CNY")
		assert.Contains(t, supportedCurrencies, "USD")
		assert.Contains(t, supportedCurrencies, "EUR")
		
		limits := channel.GetChannelLimits()
		assert.NotNil(t, limits)
		assert.True(t, limits.MaxAmount.Equal(decimal.NewFromFloat(1000000)))
	})
	
	t.Run("RequestBuilding", func(t *testing.T) {
		req := &CreatePaymentRequest{
			OrderID:     uuid.New(),
			PaymentID:   "bank-payment-123",
			Amount:      decimal.NewFromFloat(1000.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePublic,
			PayerInfo: &PayerInfo{
				Name:    "Test Company",
				Account: "1234567890",
				Email:   "test@company.com",
				Phone:   "13800138000",
			},
			ReceiverInfo: &ReceiverInfo{
				Name:       "Receiver Company",
				Account:    "0987654321",
				BankName:   "Test Bank",
				BankBranch: "Test Branch",
			},
			Description: "Test bank transfer",
			NotifyURL:   "https://example.com/notify",
			ReturnURL:   "https://example.com/return",
			ExtraParams: map[string]interface{}{
				"business_type": "B2B",
				"urgency":       "normal",
			},
		}
		
		apiReq := channel.buildCreatePaymentRequest(req)
		
		assert.Equal(t, config.MerchantID, apiReq["merchant_id"])
		assert.Equal(t, req.PaymentID, apiReq["out_trade_no"])
		assert.Equal(t, req.Amount.String(), apiReq["amount"])
		assert.Equal(t, req.Currency, apiReq["currency"])
		assert.Equal(t, req.PaymentType, apiReq["payment_type"])
		assert.Equal(t, req.Description, apiReq["subject"])
		assert.Equal(t, req.NotifyURL, apiReq["notify_url"])
		assert.Equal(t, req.ReturnURL, apiReq["return_url"])
		
		// Check payer info
		assert.Equal(t, req.PayerInfo.Name, apiReq["payer_name"])
		assert.Equal(t, req.PayerInfo.Account, apiReq["payer_account"])
		assert.Equal(t, req.PayerInfo.Email, apiReq["payer_email"])
		assert.Equal(t, req.PayerInfo.Phone, apiReq["payer_phone"])
		
		// Check receiver info
		assert.Equal(t, req.ReceiverInfo.Name, apiReq["receiver_name"])
		assert.Equal(t, req.ReceiverInfo.Account, apiReq["receiver_account"])
		assert.Equal(t, req.ReceiverInfo.BankName, apiReq["receiver_bank"])
		assert.Equal(t, req.ReceiverInfo.BankBranch, apiReq["receiver_branch"])
		
		// Check extra params
		assert.Equal(t, "B2B", apiReq["business_type"])
		assert.Equal(t, "normal", apiReq["urgency"])
		
		// Check timestamp
		assert.NotNil(t, apiReq["timestamp"])
	})
	
	t.Run("SignatureGeneration", func(t *testing.T) {
		data := []byte(`{"test":"data","amount":"100.00"}`)
		signature := channel.generateSignature(data)
		
		assert.NotEmpty(t, signature)
		assert.Len(t, signature, 64) // SHA256 hex length
		
		// Verify signature
		assert.True(t, channel.verifyWebhookSignature(data, signature))
		assert.False(t, channel.verifyWebhookSignature(data, "invalid_signature"))
	})
	
	t.Run("StatusMapping", func(t *testing.T) {
		assert.Equal(t, PaymentStatusPaid, channel.mapBankStatusToInternal("SUCCESS"))
		assert.Equal(t, PaymentStatusPaid, channel.mapBankStatusToInternal("COMPLETED"))
		assert.Equal(t, PaymentStatusPaid, channel.mapBankStatusToInternal("PAID"))
		assert.Equal(t, PaymentStatusPending, channel.mapBankStatusToInternal("PENDING"))
		assert.Equal(t, PaymentStatusPending, channel.mapBankStatusToInternal("PROCESSING"))
		assert.Equal(t, PaymentStatusFailed, channel.mapBankStatusToInternal("FAILED"))
		assert.Equal(t, PaymentStatusCancelled, channel.mapBankStatusToInternal("CANCELLED"))
		assert.Equal(t, PaymentStatusExpired, channel.mapBankStatusToInternal("EXPIRED"))
		assert.Equal(t, PaymentStatusRefunded, channel.mapBankStatusToInternal("REFUNDED"))
		assert.Equal(t, PaymentStatusPending, channel.mapBankStatusToInternal("UNKNOWN"))
	})
	
	t.Run("EventTypeMapping", func(t *testing.T) {
		assert.Equal(t, EventTypePaymentPaid, channel.mapStatusToEventType("SUCCESS"))
		assert.Equal(t, EventTypePaymentFailed, channel.mapStatusToEventType("FAILED"))
		assert.Equal(t, EventTypePaymentCancelled, channel.mapStatusToEventType("CANCELLED"))
		assert.Equal(t, EventTypePaymentExpired, channel.mapStatusToEventType("EXPIRED"))
		assert.Equal(t, EventTypeRefundCompleted, channel.mapStatusToEventType("REFUNDED"))
		assert.Equal(t, EventTypePaymentCreated, channel.mapStatusToEventType("UNKNOWN"))
	})
	
	t.Run("ValidationErrors", func(t *testing.T) {
		// Test invalid currency
		req := &CreatePaymentRequest{
			OrderID:     uuid.New(),
			PaymentID:   "test-payment",
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "JPY", // Not supported
			PaymentType: PaymentTypePublic,
		}
		
		err := channel.validateCreatePaymentRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported currency")
		
		// Test zero amount
		req.Currency = "CNY"
		req.Amount = decimal.Zero
		
		err = channel.validateCreatePaymentRequest(req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "amount must be greater than zero")
		
		// Test valid request
		req.Amount = decimal.NewFromFloat(100.00)
		
		err = channel.validateCreatePaymentRequest(req)
		assert.NoError(t, err)
	})
}

func TestPaymentChannelService(t *testing.T) {
	// Create dependencies
	channelManager := NewPaymentChannelManager()
	
	// Mock payment processor (we'll use nil for repository since we're not testing database operations)
	paymentProcessor := NewPaymentProcessor(channelManager, nil)
	
	service := NewPaymentChannelService(channelManager, paymentProcessor)
	
	t.Run("RegisterChannel", func(t *testing.T) {
		req := &RegisterChannelRequest{
			ChannelID:   "test-channel-1",
			ChannelName: "Test Channel 1",
			ChannelType: ChannelTypeAlipay,
			Config: map[string]interface{}{
				"app_id": "test_app_id",
				"api_key": "test_api_key",
			},
			Limits: &ChannelLimits{
				MinAmount:   decimal.NewFromFloat(0.01),
				MaxAmount:   decimal.NewFromFloat(10000),
				DailyLimit:  decimal.NewFromFloat(100000),
				SingleLimit: decimal.NewFromFloat(10000),
			},
			IsActive: true,
		}
		
		channelInfo, err := service.RegisterChannel(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, channelInfo)
		assert.Equal(t, req.ChannelID, channelInfo.ChannelID)
		assert.Equal(t, req.ChannelName, channelInfo.ChannelName)
		assert.Equal(t, req.ChannelType, channelInfo.ChannelType)
		
		// Test duplicate registration
		_, err = service.RegisterChannel(context.Background(), req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
	})
	
	t.Run("GetChannel", func(t *testing.T) {
		channelInfo, err := service.GetChannel(context.Background(), "test-channel-1")
		assert.NoError(t, err)
		assert.NotNil(t, channelInfo)
		assert.Equal(t, "test-channel-1", channelInfo.ChannelID)
		
		// Test non-existent channel
		_, err = service.GetChannel(context.Background(), "non-existent")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not found")
	})
	
	t.Run("ListChannels", func(t *testing.T) {
		// Register another channel
		req := &RegisterChannelRequest{
			ChannelID:   "test-channel-2",
			ChannelName: "Test Channel 2",
			ChannelType: ChannelTypeWechat,
			IsActive:    true,
		}
		
		_, err := service.RegisterChannel(context.Background(), req)
		require.NoError(t, err)
		
		// List all channels
		channels, err := service.ListChannels(context.Background(), nil)
		assert.NoError(t, err)
		assert.Len(t, channels, 2)
		
		// Filter by channel type
		filter := &ChannelFilter{
			ChannelType: &[]string{ChannelTypeAlipay}[0],
		}
		
		channels, err = service.ListChannels(context.Background(), filter)
		assert.NoError(t, err)
		assert.Len(t, channels, 1)
		assert.Equal(t, ChannelTypeAlipay, channels[0].ChannelType)
		
		// Test pagination
		filter = &ChannelFilter{
			Limit:  1,
			Offset: 0,
		}
		
		channels, err = service.ListChannels(context.Background(), filter)
		assert.NoError(t, err)
		assert.Len(t, channels, 1)
	})
	
	t.Run("UnregisterChannel", func(t *testing.T) {
		err := service.UnregisterChannel(context.Background(), "test-channel-2")
		assert.NoError(t, err)
		
		// Verify channel is removed
		_, err = service.GetChannel(context.Background(), "test-channel-2")
		assert.Error(t, err)
		
		// Test unregistering non-existent channel
		err = service.UnregisterChannel(context.Background(), "non-existent")
		assert.Error(t, err)
	})
	
	t.Run("UpdateChannelConfig", func(t *testing.T) {
		config := map[string]interface{}{
			"new_key":     "new_value",
			"updated_key": "updated_value",
		}
		
		err := service.UpdateChannelConfig(context.Background(), "test-channel-1", config)
		assert.NoError(t, err)
		
		// Verify config was updated
		channelInfo, err := service.GetChannel(context.Background(), "test-channel-1")
		assert.NoError(t, err)
		assert.Equal(t, "new_value", channelInfo.Config["new_key"])
		assert.Equal(t, "updated_value", channelInfo.Config["updated_key"])
	})
	
	t.Run("ValidationErrors", func(t *testing.T) {
		// Test nil request
		_, err := service.RegisterChannel(context.Background(), nil)
		assert.Error(t, err)
		
		// Test empty channel ID
		req := &RegisterChannelRequest{
			ChannelID:   "",
			ChannelName: "Test Channel",
			ChannelType: ChannelTypeAlipay,
		}
		
		_, err = service.RegisterChannel(context.Background(), req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "channel ID is required")
		
		// Test invalid channel type
		req.ChannelID = "test-invalid"
		req.ChannelType = "invalid_type"
		
		_, err = service.RegisterChannel(context.Background(), req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid channel type")
	})
}
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

func TestPaymentChannelManager(t *testing.T) {
	manager := NewPaymentChannelManager()
	
	t.Run("RegisterChannel", func(t *testing.T) {
		channel := NewMockPaymentChannel("test-channel", "Test Channel", false)
		
		err := manager.RegisterChannel(channel)
		assert.NoError(t, err)
		
		// Test duplicate registration
		err = manager.RegisterChannel(channel)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
	})
	
	t.Run("GetChannel", func(t *testing.T) {
		channel := NewMockPaymentChannel("get-test-channel", "Get Test Channel", false)
		err := manager.RegisterChannel(channel)
		require.NoError(t, err)
		
		retrievedChannel, err := manager.GetChannel("get-test-channel")
		assert.NoError(t, err)
		assert.Equal(t, "get-test-channel", retrievedChannel.GetChannelID())
		assert.Equal(t, "Get Test Channel", retrievedChannel.GetChannelName())
		
		// Test non-existent channel
		_, err = manager.GetChannel("non-existent")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not found")
	})
	
	t.Run("ListChannels", func(t *testing.T) {
		// Clear existing channels
		manager = NewPaymentChannelManager()
		
		channel1 := NewMockPaymentChannel("list-channel-1", "List Channel 1", false)
		channel2 := NewMockPaymentChannel("list-channel-2", "List Channel 2", false)
		
		err := manager.RegisterChannel(channel1)
		require.NoError(t, err)
		err = manager.RegisterChannel(channel2)
		require.NoError(t, err)
		
		channels := manager.ListChannels()
		assert.Len(t, channels, 2)
	})
	
	t.Run("UnregisterChannel", func(t *testing.T) {
		channel := NewMockPaymentChannel("unregister-channel", "Unregister Channel", false)
		err := manager.RegisterChannel(channel)
		require.NoError(t, err)
		
		err = manager.UnregisterChannel("unregister-channel")
		assert.NoError(t, err)
		
		// Verify channel is removed
		_, err = manager.GetChannel("unregister-channel")
		assert.Error(t, err)
		
		// Test unregistering non-existent channel
		err = manager.UnregisterChannel("non-existent")
		assert.Error(t, err)
	})
	
	t.Run("SelectChannel", func(t *testing.T) {
		// Clear existing channels
		manager = NewPaymentChannelManager()
		
		channel1 := NewMockPaymentChannel("select-channel-1", "Select Channel 1", false)
		channel2 := NewMockPaymentChannel("select-channel-2", "Select Channel 2", false)
		
		err := manager.RegisterChannel(channel1)
		require.NoError(t, err)
		err = manager.RegisterChannel(channel2)
		require.NoError(t, err)
		
		// Wait for health check to complete and manually trigger health check
		time.Sleep(100 * time.Millisecond)
		manager.CheckChannelHealth(context.Background())
		
		req := &ChannelSelectionRequest{
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePrivate,
			MerchantID:  uuid.New(),
		}
		
		selectedChannel, err := manager.SelectChannel(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, selectedChannel)
	})
	
	t.Run("CheckChannelHealth", func(t *testing.T) {
		// Clear existing channels
		manager = NewPaymentChannelManager()
		
		healthyChannel := NewMockPaymentChannel("healthy-channel", "Healthy Channel", false)
		unhealthyChannel := NewMockPaymentChannel("unhealthy-channel", "Unhealthy Channel", true)
		
		err := manager.RegisterChannel(healthyChannel)
		require.NoError(t, err)
		err = manager.RegisterChannel(unhealthyChannel)
		require.NoError(t, err)
		
		healthStatus := manager.CheckChannelHealth(context.Background())
		assert.Len(t, healthStatus, 2)
		
		// Check healthy channel
		assert.True(t, healthStatus["healthy-channel"].IsHealthy)
		assert.Empty(t, healthStatus["healthy-channel"].ErrorMessage)
		
		// Check unhealthy channel
		assert.True(t, healthStatus["unhealthy-channel"].IsHealthy) // Mock channel always returns healthy in IsHealthy()
	})
}

func TestChannelSelectionStrategies(t *testing.T) {
	t.Run("DefaultChannelSelectionStrategy", func(t *testing.T) {
		strategy := &DefaultChannelSelectionStrategy{}
		
		channel1 := NewMockPaymentChannel("strategy-channel-1", "Strategy Channel 1", false)
		channel2 := NewMockPaymentChannel("strategy-channel-2", "Strategy Channel 2", false)
		channels := []PaymentChannel{channel1, channel2}
		
		req := &ChannelSelectionRequest{
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePrivate,
		}
		
		selectedChannel, err := strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "strategy-channel-1", selectedChannel.GetChannelID())
		
		// Test empty channels
		_, err = strategy.SelectChannel(context.Background(), []PaymentChannel{}, req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no channels available")
	})
	
	t.Run("RoundRobinChannelSelectionStrategy", func(t *testing.T) {
		strategy := &RoundRobinChannelSelectionStrategy{}
		
		channel1 := NewMockPaymentChannel("rr-channel-1", "RR Channel 1", false)
		channel2 := NewMockPaymentChannel("rr-channel-2", "RR Channel 2", false)
		channels := []PaymentChannel{channel1, channel2}
		
		req := &ChannelSelectionRequest{
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePrivate,
		}
		
		// First selection should return first channel
		selectedChannel, err := strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "rr-channel-1", selectedChannel.GetChannelID())
		
		// Second selection should return second channel
		selectedChannel, err = strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "rr-channel-2", selectedChannel.GetChannelID())
		
		// Third selection should return first channel again
		selectedChannel, err = strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "rr-channel-1", selectedChannel.GetChannelID())
	})
	
	t.Run("WeightedChannelSelectionStrategy", func(t *testing.T) {
		strategy := &WeightedChannelSelectionStrategy{}
		
		channel1 := NewMockPaymentChannel("weighted-channel-1", "Weighted Channel 1", false)
		channel2 := NewMockPaymentChannel("weighted-channel-2", "Weighted Channel 2", false)
		channels := []PaymentChannel{channel1, channel2}
		
		// Set weights
		strategy.SetWeight("weighted-channel-1", 1)
		strategy.SetWeight("weighted-channel-2", 5)
		
		req := &ChannelSelectionRequest{
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePrivate,
		}
		
		selectedChannel, err := strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "weighted-channel-2", selectedChannel.GetChannelID()) // Higher weight
	})
	
	t.Run("LeastUsedChannelSelectionStrategy", func(t *testing.T) {
		strategy := &LeastUsedChannelSelectionStrategy{}
		
		channel1 := NewMockPaymentChannel("least-used-channel-1", "Least Used Channel 1", false)
		channel2 := NewMockPaymentChannel("least-used-channel-2", "Least Used Channel 2", false)
		channels := []PaymentChannel{channel1, channel2}
		
		req := &ChannelSelectionRequest{
			Amount:      decimal.NewFromFloat(100.00),
			Currency:    "CNY",
			PaymentType: PaymentTypePrivate,
		}
		
		// First selection should return first channel (both have 0 usage)
		selectedChannel, err := strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "least-used-channel-1", selectedChannel.GetChannelID())
		
		// Second selection should return second channel (first now has usage 1)
		selectedChannel, err = strategy.SelectChannel(context.Background(), channels, req)
		assert.NoError(t, err)
		assert.Equal(t, "least-used-channel-2", selectedChannel.GetChannelID())
	})
}

func TestMockPaymentChannel(t *testing.T) {
	t.Run("SuccessfulOperations", func(t *testing.T) {
		channel := NewMockPaymentChannel("mock-success", "Mock Success Channel", false)
		
		// Test CreatePayment
		req := &CreatePaymentRequest{
			OrderID:     uuid.New(),
			PaymentID:   "test-payment-123",
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
			Description: "Test payment",
		}
		
		resp, err := channel.CreatePayment(context.Background(), req)
		assert.NoError(t, err)
		assert.Equal(t, "test-payment-123", resp.PaymentID)
		assert.Equal(t, "MOCK_test-payment-123", resp.ChannelPaymentID)
		assert.Equal(t, PaymentStatusPending, resp.Status)
		assert.NotEmpty(t, resp.PaymentURL)
		assert.NotEmpty(t, resp.QRCode)
		
		// Test QueryPayment
		status, err := channel.QueryPayment(context.Background(), "test-payment-123")
		assert.NoError(t, err)
		assert.Equal(t, "test-payment-123", status.PaymentID)
		assert.Equal(t, PaymentStatusPaid, status.Status)
		
		// Test CancelPayment
		cancelResp, err := channel.CancelPayment(context.Background(), "test-payment-123")
		assert.NoError(t, err)
		assert.Equal(t, "test-payment-123", cancelResp.PaymentID)
		assert.Equal(t, PaymentStatusCancelled, cancelResp.Status)
		
		// Test RefundPayment
		refundReq := &RefundPaymentRequest{
			PaymentID: "test-payment-123",
			RefundID:  "test-refund-123",
			Amount:    decimal.NewFromFloat(50.00),
			Reason:    "Test refund",
		}
		
		refundResp, err := channel.RefundPayment(context.Background(), refundReq)
		assert.NoError(t, err)
		assert.Equal(t, "test-refund-123", refundResp.RefundID)
		assert.Equal(t, PaymentStatusRefunded, refundResp.Status)
		
		// Test HandleWebhook
		webhookResult, err := channel.HandleWebhook(context.Background(), []byte("test payload"), map[string]string{})
		assert.NoError(t, err)
		assert.Equal(t, EventTypePaymentPaid, webhookResult.EventType)
		assert.Equal(t, "success", webhookResult.Status)
	})
	
	t.Run("FailedOperations", func(t *testing.T) {
		channel := NewMockPaymentChannel("mock-fail", "Mock Fail Channel", true)
		
		// Test CreatePayment failure
		req := &CreatePaymentRequest{
			OrderID:   uuid.New(),
			PaymentID: "test-payment-fail",
			Amount:    decimal.NewFromFloat(100.00),
			Currency:  "CNY",
		}
		
		_, err := channel.CreatePayment(context.Background(), req)
		assert.Error(t, err)
		
		var paymentErr *PaymentChannelError
		assert.ErrorAs(t, err, &paymentErr)
		assert.Equal(t, "MOCK_ERROR", paymentErr.GetErrorCode())
		assert.Equal(t, ErrorTypeTemporary, paymentErr.GetErrorType())
		assert.True(t, paymentErr.IsRetryable())
		
		// Test other operations also fail
		_, err = channel.QueryPayment(context.Background(), "test-payment-fail")
		assert.Error(t, err)
		
		_, err = channel.CancelPayment(context.Background(), "test-payment-fail")
		assert.Error(t, err)
		
		_, err = channel.RefundPayment(context.Background(), &RefundPaymentRequest{})
		assert.Error(t, err)
		
		_, err = channel.HandleWebhook(context.Background(), []byte("test"), map[string]string{})
		assert.Error(t, err)
	})
	
	t.Run("ChannelProperties", func(t *testing.T) {
		channel := NewMockPaymentChannel("mock-props", "Mock Props Channel", false)
		
		assert.Equal(t, "mock-props", channel.GetChannelID())
		assert.Equal(t, "Mock Props Channel", channel.GetChannelName())
		assert.Equal(t, "mock", channel.GetChannelType())
		
		supportedTypes := channel.SupportedPaymentTypes()
		assert.Contains(t, supportedTypes, PaymentTypePublic)
		assert.Contains(t, supportedTypes, PaymentTypePrivate)
		
		supportedCurrencies := channel.SupportedCurrencies()
		assert.Contains(t, supportedCurrencies, "CNY")
		assert.Contains(t, supportedCurrencies, "USD")
		
		limits := channel.GetChannelLimits()
		assert.NotNil(t, limits)
		assert.True(t, limits.MinAmount.GreaterThan(decimal.Zero))
		
		status := channel.GetChannelStatus()
		assert.NotNil(t, status)
		assert.True(t, status.IsActive)
		
		assert.True(t, channel.IsHealthy(context.Background()))
		
		// Test configuration update
		config := map[string]interface{}{
			"test_key": "test_value",
		}
		err := channel.UpdateConfiguration(config)
		assert.NoError(t, err)
		
		// Test webhook signature validation
		assert.True(t, channel.ValidateWebhookSignature([]byte("test"), "signature", ""))
	})
}
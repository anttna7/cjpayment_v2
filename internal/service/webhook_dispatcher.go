package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// WebhookEvent represents an event that can trigger webhooks
type WebhookEvent struct {
	ID        uuid.UUID              `json:"id"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
}

// WebhookDispatcher manages webhook event dispatching
type WebhookDispatcher struct {
	notificationService NotificationService
	redisClient         *redis.Client
	subscribers         map[string][]WebhookSubscriber
	mu                  sync.RWMutex
}

// WebhookSubscriber defines the interface for webhook subscribers
type WebhookSubscriber interface {
	HandleEvent(ctx context.Context, event *WebhookEvent) error
	GetEventTypes() []string
}

// NewWebhookDispatcher creates a new webhook dispatcher
func NewWebhookDispatcher(
	notificationService NotificationService,
	redisClient *redis.Client,
) *WebhookDispatcher {
	return &WebhookDispatcher{
		notificationService: notificationService,
		redisClient:         redisClient,
		subscribers:         make(map[string][]WebhookSubscriber),
	}
}

// Subscribe adds a subscriber for specific event types
func (d *WebhookDispatcher) Subscribe(subscriber WebhookSubscriber) {
	d.mu.Lock()
	defer d.mu.Unlock()

	for _, eventType := range subscriber.GetEventTypes() {
		d.subscribers[eventType] = append(d.subscribers[eventType], subscriber)
	}
}

// Unsubscribe removes a subscriber
func (d *WebhookDispatcher) Unsubscribe(subscriber WebhookSubscriber) {
	d.mu.Lock()
	defer d.mu.Unlock()

	for _, eventType := range subscriber.GetEventTypes() {
		subscribers := d.subscribers[eventType]
		for i, sub := range subscribers {
			if sub == subscriber {
				d.subscribers[eventType] = append(subscribers[:i], subscribers[i+1:]...)
				break
			}
		}
	}
}

// Dispatch dispatches an event to all registered subscribers and webhooks
func (d *WebhookDispatcher) Dispatch(ctx context.Context, event *WebhookEvent) error {
	// Dispatch to local subscribers
	if err := d.dispatchToSubscribers(ctx, event); err != nil {
		return fmt.Errorf("failed to dispatch to subscribers: %w", err)
	}

	// Dispatch to registered webhooks
	if err := d.dispatchToWebhooks(ctx, event); err != nil {
		return fmt.Errorf("failed to dispatch to webhooks: %w", err)
	}

	// Publish to Redis for distributed processing
	if err := d.publishToRedis(ctx, event); err != nil {
		return fmt.Errorf("failed to publish to Redis: %w", err)
	}

	return nil
}

// DispatchRechargeEvent dispatches a recharge-related event
func (d *WebhookDispatcher) DispatchRechargeEvent(ctx context.Context, orderID uuid.UUID, eventType string, data map[string]interface{}) error {
	event := &WebhookEvent{
		ID:        uuid.New(),
		Type:      eventType,
		Source:    "recharge_service",
		Data:      data,
		Timestamp: time.Now(),
	}

	// Add order ID to event data
	if event.Data == nil {
		event.Data = make(map[string]interface{})
	}
	event.Data["order_id"] = orderID.String()

	return d.Dispatch(ctx, event)
}

// StartEventProcessor starts the Redis event processor
func (d *WebhookDispatcher) StartEventProcessor(ctx context.Context) error {
	pubsub := d.redisClient.Subscribe(ctx, "webhook_events")
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg := <-ch:
			var event WebhookEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				fmt.Printf("Failed to unmarshal webhook event: %v\n", err)
				continue
			}

			// Process the event
			if err := d.processEvent(ctx, &event); err != nil {
				fmt.Printf("Failed to process webhook event: %v\n", err)
			}
		}
	}
}

// Private methods

func (d *WebhookDispatcher) dispatchToSubscribers(ctx context.Context, event *WebhookEvent) error {
	d.mu.RLock()
	subscribers := d.subscribers[event.Type]
	d.mu.RUnlock()

	for _, subscriber := range subscribers {
		go func(sub WebhookSubscriber) {
			if err := sub.HandleEvent(ctx, event); err != nil {
				fmt.Printf("Subscriber failed to handle event %s: %v\n", event.Type, err)
			}
		}(subscriber)
	}

	return nil
}

func (d *WebhookDispatcher) dispatchToWebhooks(ctx context.Context, event *WebhookEvent) error {
	// Get registered webhooks for this event type
	filter := &WebhookFilter{
		IsActive: &[]bool{true}[0],
	}

	webhooks, err := d.notificationService.ListWebhooks(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to get webhooks: %w", err)
	}

	for _, webhook := range webhooks {
		// Check if webhook is subscribed to this event type
		subscribed := false
		for _, eventType := range webhook.Events {
			if eventType == event.Type {
				subscribed = true
				break
			}
		}

		if !subscribed {
			continue
		}

		// Send notification for this webhook
		go func(w *WebhookRegistration) {
			if err := d.sendWebhookNotification(ctx, w, event); err != nil {
				fmt.Printf("Failed to send webhook notification to %s: %v\n", w.URL, err)
			}
		}(webhook)
	}

	return nil
}

func (d *WebhookDispatcher) publishToRedis(ctx context.Context, event *WebhookEvent) error {
	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	return d.redisClient.Publish(ctx, "webhook_events", eventData).Err()
}

func (d *WebhookDispatcher) processEvent(ctx context.Context, event *WebhookEvent) error {
	// This method processes events received from Redis
	// It can be used for distributed webhook processing

	// For now, just dispatch to local subscribers and webhooks
	return d.dispatchToWebhooks(ctx, event)
}

func (d *WebhookDispatcher) sendWebhookNotification(ctx context.Context, webhook *WebhookRegistration, event *WebhookEvent) error {
	// Create a custom notification payload
	payload := map[string]interface{}{
		"webhook_id": webhook.ID,
		"event":      event,
		"timestamp":  time.Now().Unix(),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create a temporary notification config for this webhook
	req := &SendCustomNotificationRequest{
		ConfigID:  webhook.ID, // Use webhook ID as config ID for tracking
		EventType: event.Type,
		Payload:   string(payloadJSON),
	}

	// If the event has an order ID, include it
	if orderIDStr, ok := event.Data["order_id"].(string); ok {
		if orderID, err := uuid.Parse(orderIDStr); err == nil {
			req.OrderID = &orderID
		}
	}

	return d.notificationService.SendCustomNotification(ctx, req)
}

// RechargeEventSubscriber is a built-in subscriber for recharge events
type RechargeEventSubscriber struct {
	notificationService NotificationService
}

// NewRechargeEventSubscriber creates a new recharge event subscriber
func NewRechargeEventSubscriber(notificationService NotificationService) *RechargeEventSubscriber {
	return &RechargeEventSubscriber{
		notificationService: notificationService,
	}
}

// HandleEvent handles recharge events
func (s *RechargeEventSubscriber) HandleEvent(ctx context.Context, event *WebhookEvent) error {
	// Extract order ID from event data
	orderIDStr, ok := event.Data["order_id"].(string)
	if !ok {
		return fmt.Errorf("order_id not found in event data")
	}

	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return fmt.Errorf("invalid order_id format: %w", err)
	}

	// Send recharge notification
	return s.notificationService.SendRechargeNotification(ctx, orderID, event.Type)
}

// GetEventTypes returns the event types this subscriber handles
func (s *RechargeEventSubscriber) GetEventTypes() []string {
	return []string{
		"recharge_created",
		"recharge_success",
		"recharge_failed",
		"recharge_cancelled",
		"recharge_refunded",
	}
}

// WebhookEventBuilder helps build webhook events
type WebhookEventBuilder struct {
	event *WebhookEvent
}

// NewWebhookEventBuilder creates a new webhook event builder
func NewWebhookEventBuilder() *WebhookEventBuilder {
	return &WebhookEventBuilder{
		event: &WebhookEvent{
			ID:        uuid.New(),
			Timestamp: time.Now(),
			Data:      make(map[string]interface{}),
		},
	}
}

// WithType sets the event type
func (b *WebhookEventBuilder) WithType(eventType string) *WebhookEventBuilder {
	b.event.Type = eventType
	return b
}

// WithSource sets the event source
func (b *WebhookEventBuilder) WithSource(source string) *WebhookEventBuilder {
	b.event.Source = source
	return b
}

// WithData adds data to the event
func (b *WebhookEventBuilder) WithData(key string, value interface{}) *WebhookEventBuilder {
	b.event.Data[key] = value
	return b
}

// WithDataMap sets the entire data map
func (b *WebhookEventBuilder) WithDataMap(data map[string]interface{}) *WebhookEventBuilder {
	b.event.Data = data
	return b
}

// Build returns the built webhook event
func (b *WebhookEventBuilder) Build() *WebhookEvent {
	return b.event
}
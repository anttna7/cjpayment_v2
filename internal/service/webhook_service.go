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
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// WebhookService defines the webhook service interface
type WebhookService interface {
	// Webhook management
	RegisterWebhook(ctx context.Context, req *RegisterWebhookRequest) (*WebhookRegistration, error)
	UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error
	UpdateWebhook(ctx context.Context, webhookID uuid.UUID, req *UpdateWebhookRequest) (*WebhookRegistration, error)
	GetWebhook(ctx context.Context, webhookID uuid.UUID) (*WebhookRegistration, error)
	ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*WebhookRegistration, error)
	ValidateWebhookSignature(ctx context.Context, webhookID uuid.UUID, payload []byte, signature string) (bool, error)
	
	// Event management
	CreateEvent(ctx context.Context, req *CreateWebhookEventRequest) (*WebhookEventResponse, error)
	GetEvent(ctx context.Context, eventID uuid.UUID) (*WebhookEventResponse, error)
	ListEvents(ctx context.Context, filter *WebhookEventFilter) ([]*WebhookEventResponse, error)
	
	// Delivery management
	GetDeliveries(ctx context.Context, filter *WebhookDeliveryFilter) ([]*WebhookDeliveryResponse, int64, error)
	GetDelivery(ctx context.Context, deliveryID uuid.UUID) (*WebhookDeliveryResponse, error)
	RetryDelivery(ctx context.Context, deliveryID uuid.UUID) error
	RetryFailedDeliveries(ctx context.Context) error
	
	// Event processing
	ProcessEvent(ctx context.Context, event *repository.WebhookEvent) error
	StartEventProcessor(ctx context.Context) error
	StartDeliveryRetryProcessor(ctx context.Context) error
}

// WebhookServiceImpl implements WebhookService
type WebhookServiceImpl struct {
	webhookRepo repository.WebhookRepository
	redisClient *redis.Client
	httpClient  *http.Client
}

// NewWebhookService creates a new webhook service
func NewWebhookService(
	webhookRepo repository.WebhookRepository,
	redisClient *redis.Client,
) WebhookService {
	return &WebhookServiceImpl{
		webhookRepo: webhookRepo,
		redisClient: redisClient,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// RegisterWebhook registers a new webhook
func (s *WebhookServiceImpl) RegisterWebhook(ctx context.Context, req *RegisterWebhookRequest) (*WebhookRegistration, error) {
	webhook := &repository.Webhook{
		ID:        uuid.New(),
		Name:      req.Name,
		URL:       req.URL,
		Events:    req.Events,
		Secret:    req.Secret,
		IsActive:  req.IsActive,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.webhookRepo.CreateWebhook(ctx, webhook); err != nil {
		return nil, fmt.Errorf("failed to create webhook: %w", err)
	}

	return s.convertToWebhookRegistration(webhook), nil
}

// UnregisterWebhook unregisters a webhook
func (s *WebhookServiceImpl) UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error {
	if err := s.webhookRepo.DeleteWebhook(ctx, webhookID); err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}
	return nil
}

// UpdateWebhook updates a webhook
func (s *WebhookServiceImpl) UpdateWebhook(ctx context.Context, webhookID uuid.UUID, req *UpdateWebhookRequest) (*WebhookRegistration, error) {
	webhook, err := s.webhookRepo.GetWebhook(ctx, webhookID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		webhook.Name = *req.Name
	}
	if req.URL != nil {
		webhook.URL = *req.URL
	}
	if req.Events != nil {
		webhook.Events = *req.Events
	}
	if req.Secret != nil {
		webhook.Secret = *req.Secret
	}
	if req.IsActive != nil {
		webhook.IsActive = *req.IsActive
	}

	webhook.UpdatedAt = time.Now()

	if err := s.webhookRepo.UpdateWebhook(ctx, webhook); err != nil {
		return nil, fmt.Errorf("failed to update webhook: %w", err)
	}

	return s.convertToWebhookRegistration(webhook), nil
}

// GetWebhook gets a webhook by ID
func (s *WebhookServiceImpl) GetWebhook(ctx context.Context, webhookID uuid.UUID) (*WebhookRegistration, error) {
	webhook, err := s.webhookRepo.GetWebhook(ctx, webhookID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook: %w", err)
	}

	return s.convertToWebhookRegistration(webhook), nil
}

// ListWebhooks lists webhooks with filtering
func (s *WebhookServiceImpl) ListWebhooks(ctx context.Context, filter *WebhookFilter) ([]*WebhookRegistration, error) {
	repoFilter := &repository.WebhookFilter{
		IsActive:  filter.IsActive,
		EventType: filter.EventType,
		Limit:     filter.Limit,
		Offset:    filter.Offset,
		OrderBy:   filter.OrderBy,
		OrderDir:  filter.OrderDir,
	}

	webhooks, err := s.webhookRepo.ListWebhooks(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhooks: %w", err)
	}

	var registrations []*WebhookRegistration
	for _, webhook := range webhooks {
		registrations = append(registrations, s.convertToWebhookRegistration(webhook))
	}

	return registrations, nil
}

// ValidateWebhookSignature validates webhook signature
func (s *WebhookServiceImpl) ValidateWebhookSignature(ctx context.Context, webhookID uuid.UUID, payload []byte, signature string) (bool, error) {
	webhook, err := s.webhookRepo.GetWebhook(ctx, webhookID)
	if err != nil {
		return false, fmt.Errorf("webhook not found: %w", err)
	}

	// Calculate expected signature
	mac := hmac.New(sha256.New, []byte(webhook.Secret))
	mac.Write(payload)
	expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSignature)), nil
}

// CreateEvent creates a new webhook event
func (s *WebhookServiceImpl) CreateEvent(ctx context.Context, req *CreateWebhookEventRequest) (*WebhookEventResponse, error) {
	event := &repository.WebhookEvent{
		ID:        uuid.New(),
		EventType: req.EventType,
		Source:    req.Source,
		Data:      req.Data,
		Timestamp: time.Now(),
		Status:    "pending",
		CreatedAt: time.Now(),
	}

	if err := s.webhookRepo.CreateWebhookEvent(ctx, event); err != nil {
		return nil, fmt.Errorf("failed to create webhook event: %w", err)
	}

	// Process the event asynchronously
	go func() {
		if err := s.ProcessEvent(context.Background(), event); err != nil {
			fmt.Printf("Failed to process webhook event %s: %v\n", event.ID, err)
		}
	}()

	return s.convertToWebhookEventResponse(event), nil
}

// GetEvent gets a webhook event by ID
func (s *WebhookServiceImpl) GetEvent(ctx context.Context, eventID uuid.UUID) (*WebhookEventResponse, error) {
	event, err := s.webhookRepo.GetWebhookEvent(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook event: %w", err)
	}

	return s.convertToWebhookEventResponse(event), nil
}

// ListEvents lists webhook events with filtering
func (s *WebhookServiceImpl) ListEvents(ctx context.Context, filter *WebhookEventFilter) ([]*WebhookEventResponse, error) {
	repoFilter := &repository.WebhookEventFilter{
		EventType: filter.EventType,
		Status:    filter.Status,
		StartDate: filter.StartDate,
		EndDate:   filter.EndDate,
		Limit:     filter.Limit,
		Offset:    filter.Offset,
		OrderBy:   filter.OrderBy,
		OrderDir:  filter.OrderDir,
	}

	events, err := s.webhookRepo.ListWebhookEvents(ctx, repoFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list webhook events: %w", err)
	}

	var responses []*WebhookEventResponse
	for _, event := range events {
		responses = append(responses, s.convertToWebhookEventResponse(event))
	}

	return responses, nil
}

// GetDeliveries gets webhook deliveries with filtering and pagination
func (s *WebhookServiceImpl) GetDeliveries(ctx context.Context, filter *WebhookDeliveryFilter) ([]*WebhookDeliveryResponse, int64, error) {
	repoFilter := &repository.WebhookDeliveryFilter{
		WebhookID: filter.WebhookID,
		EventID:   filter.EventID,
		EventType: filter.EventType,
		Status:    filter.Status,
		StartDate: filter.StartDate,
		EndDate:   filter.EndDate,
		Limit:     filter.Limit,
		Offset:    filter.Offset,
		OrderBy:   filter.OrderBy,
		OrderDir:  filter.OrderDir,
	}

	deliveries, total, err := s.webhookRepo.ListWebhookDeliveries(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list webhook deliveries: %w", err)
	}

	var responses []*WebhookDeliveryResponse
	for _, delivery := range deliveries {
		responses = append(responses, s.convertToWebhookDeliveryResponse(delivery))
	}

	return responses, total, nil
}

// GetDelivery gets a webhook delivery by ID
func (s *WebhookServiceImpl) GetDelivery(ctx context.Context, deliveryID uuid.UUID) (*WebhookDeliveryResponse, error) {
	delivery, err := s.webhookRepo.GetWebhookDelivery(ctx, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook delivery: %w", err)
	}

	return s.convertToWebhookDeliveryResponse(delivery), nil
}

// RetryDelivery retries a specific webhook delivery
func (s *WebhookServiceImpl) RetryDelivery(ctx context.Context, deliveryID uuid.UUID) error {
	delivery, err := s.webhookRepo.GetWebhookDelivery(ctx, deliveryID)
	if err != nil {
		return fmt.Errorf("failed to get webhook delivery: %w", err)
	}

	if delivery.RetryCount >= delivery.MaxRetries {
		return fmt.Errorf("delivery has exceeded max retries")
	}

	// Execute delivery
	go func() {
		if err := s.executeDelivery(context.Background(), delivery); err != nil {
			fmt.Printf("Failed to retry webhook delivery %s: %v\n", delivery.ID, err)
		}
	}()

	return nil
}

// RetryFailedDeliveries retries all failed webhook deliveries
func (s *WebhookServiceImpl) RetryFailedDeliveries(ctx context.Context) error {
	deliveries, err := s.webhookRepo.GetDeliveriesForRetry(ctx, 100)
	if err != nil {
		return fmt.Errorf("failed to get deliveries for retry: %w", err)
	}

	for _, delivery := range deliveries {
		go func(d *repository.WebhookDelivery) {
			if err := s.executeDelivery(context.Background(), d); err != nil {
				fmt.Printf("Failed to retry webhook delivery %s: %v\n", d.ID, err)
			}
		}(delivery)
	}

	return nil
}

// ProcessEvent processes a webhook event by sending it to all subscribed webhooks
func (s *WebhookServiceImpl) ProcessEvent(ctx context.Context, event *repository.WebhookEvent) error {
	// Get webhooks subscribed to this event type
	webhooks, err := s.webhookRepo.GetWebhooksByEvent(ctx, event.EventType)
	if err != nil {
		return fmt.Errorf("failed to get webhooks for event type %s: %w", event.EventType, err)
	}

	// Create deliveries for each webhook
	for _, webhook := range webhooks {
		delivery := &repository.WebhookDelivery{
			ID:             uuid.New(),
			WebhookID:      webhook.ID,
			EventID:        event.ID,
			EventType:      event.EventType,
			TargetURL:      webhook.URL,
			RequestHeaders: make(map[string]interface{}),
			RequestBody:    s.buildEventPayload(event, webhook),
			RetryCount:     0,
			MaxRetries:     3,
			Status:         "pending",
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		if err := s.webhookRepo.CreateWebhookDelivery(ctx, delivery); err != nil {
			fmt.Printf("Failed to create webhook delivery for webhook %s: %v\n", webhook.ID, err)
			continue
		}

		// Execute delivery asynchronously
		go func(d *repository.WebhookDelivery, w *repository.Webhook) {
			if err := s.executeDelivery(context.Background(), d); err != nil {
				fmt.Printf("Failed to execute webhook delivery %s: %v\n", d.ID, err)
			}
		}(delivery, webhook)
	}

	// Update event status
	event.Status = "processed"
	now := time.Now()
	event.ProcessedAt = &now
	if err := s.webhookRepo.UpdateWebhookEvent(ctx, event); err != nil {
		return fmt.Errorf("failed to update event status: %w", err)
	}

	return nil
}

// StartEventProcessor starts the event processor
func (s *WebhookServiceImpl) StartEventProcessor(ctx context.Context) error {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			events, err := s.webhookRepo.GetPendingEvents(ctx, 10)
			if err != nil {
				fmt.Printf("Failed to get pending events: %v\n", err)
				continue
			}

			for _, event := range events {
				go func(e *repository.WebhookEvent) {
					if err := s.ProcessEvent(context.Background(), e); err != nil {
						fmt.Printf("Failed to process event %s: %v\n", e.ID, err)
					}
				}(event)
			}
		}
	}
}

// StartDeliveryRetryProcessor starts the delivery retry processor
func (s *WebhookServiceImpl) StartDeliveryRetryProcessor(ctx context.Context) error {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := s.RetryFailedDeliveries(ctx); err != nil {
				fmt.Printf("Failed to retry failed deliveries: %v\n", err)
			}
		}
	}
}

// Private helper methods

func (s *WebhookServiceImpl) executeDelivery(ctx context.Context, delivery *repository.WebhookDelivery) error {
	startTime := time.Now()

	// Update status to processing
	delivery.Status = "processing"
	delivery.UpdatedAt = time.Now()
	s.webhookRepo.UpdateWebhookDelivery(ctx, delivery)

	// Get webhook for signature
	webhook, err := s.webhookRepo.GetWebhook(ctx, delivery.WebhookID)
	if err != nil {
		return s.handleDeliveryError(ctx, delivery, fmt.Sprintf("Failed to get webhook: %v", err))
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", delivery.TargetURL, strings.NewReader(delivery.RequestBody))
	if err != nil {
		return s.handleDeliveryError(ctx, delivery, fmt.Sprintf("Failed to create request: %v", err))
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "CJPayment-Webhook/1.0")
	req.Header.Set("X-Webhook-Event", delivery.EventType)
	req.Header.Set("X-Webhook-ID", delivery.WebhookID.String())
	req.Header.Set("X-Webhook-Delivery", delivery.ID.String())
	req.Header.Set("X-Webhook-Timestamp", fmt.Sprintf("%d", time.Now().Unix()))

	// Generate signature
	mac := hmac.New(sha256.New, []byte(webhook.Secret))
	mac.Write([]byte(delivery.RequestBody))
	signature := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	req.Header.Set("X-Webhook-Signature", signature)

	// Store request headers
	delivery.RequestHeaders = make(map[string]interface{})
	for key, values := range req.Header {
		if len(values) > 0 {
			delivery.RequestHeaders[key] = values[0]
		}
	}

	// Execute request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return s.handleDeliveryError(ctx, delivery, fmt.Sprintf("Request failed: %v", err))
	}
	defer resp.Body.Close()

	// Read response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return s.handleDeliveryError(ctx, delivery, fmt.Sprintf("Failed to read response: %v", err))
	}

	// Calculate execution time
	executionTime := int(time.Since(startTime).Milliseconds())

	// Update delivery with response
	delivery.ResponseStatus = &resp.StatusCode
	responseBodyStr := string(responseBody)
	delivery.ResponseBody = &responseBodyStr
	delivery.ExecutionTimeMS = &executionTime
	delivery.UpdatedAt = time.Now()

	// Store response headers
	delivery.ResponseHeaders = make(map[string]interface{})
	for key, values := range resp.Header {
		if len(values) > 0 {
			delivery.ResponseHeaders[key] = values[0]
		}
	}

	// Check if successful
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		delivery.Status = "delivered"
		now := time.Now()
		delivery.DeliveredAt = &now
	} else {
		return s.handleDeliveryError(ctx, delivery, fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(responseBody)))
	}

	return s.webhookRepo.UpdateWebhookDelivery(ctx, delivery)
}

func (s *WebhookServiceImpl) handleDeliveryError(ctx context.Context, delivery *repository.WebhookDelivery, errorMsg string) error {
	delivery.ErrorMessage = &errorMsg
	delivery.RetryCount++
	delivery.UpdatedAt = time.Now()

	if delivery.RetryCount >= delivery.MaxRetries {
		delivery.Status = "max_retries_exceeded"
	} else {
		delivery.Status = "failed"
		// Calculate next retry time using exponential backoff
		backoffSeconds := int(1 << delivery.RetryCount) // 2^retry_count
		if backoffSeconds > 3600 { // Max 1 hour
			backoffSeconds = 3600
		}
		nextRetry := time.Now().Add(time.Duration(backoffSeconds) * time.Second)
		delivery.NextRetryAt = &nextRetry
	}

	return s.webhookRepo.UpdateWebhookDelivery(ctx, delivery)
}

func (s *WebhookServiceImpl) buildEventPayload(event *repository.WebhookEvent, webhook *repository.Webhook) string {
	payload := map[string]interface{}{
		"id":        event.ID,
		"type":      event.EventType,
		"source":    event.Source,
		"data":      event.Data,
		"timestamp": event.Timestamp.Unix(),
		"webhook": map[string]interface{}{
			"id":   webhook.ID,
			"name": webhook.Name,
		},
	}

	payloadJSON, _ := json.Marshal(payload)
	return string(payloadJSON)
}

func (s *WebhookServiceImpl) convertToWebhookRegistration(webhook *repository.Webhook) *WebhookRegistration {
	return &WebhookRegistration{
		ID:        webhook.ID,
		Name:      webhook.Name,
		URL:       webhook.URL,
		Events:    webhook.Events,
		Secret:    webhook.Secret,
		IsActive:  webhook.IsActive,
		CreatedAt: webhook.CreatedAt,
		UpdatedAt: webhook.UpdatedAt,
	}
}

func (s *WebhookServiceImpl) convertToWebhookEventResponse(event *repository.WebhookEvent) *WebhookEventResponse {
	return &WebhookEventResponse{
		ID:          event.ID,
		EventType:   event.EventType,
		Source:      event.Source,
		Data:        event.Data,
		Timestamp:   event.Timestamp,
		ProcessedAt: event.ProcessedAt,
		Status:      event.Status,
		CreatedAt:   event.CreatedAt,
	}
}

func (s *WebhookServiceImpl) convertToWebhookDeliveryResponse(delivery *repository.WebhookDelivery) *WebhookDeliveryResponse {
	return &WebhookDeliveryResponse{
		ID:              delivery.ID,
		WebhookID:       delivery.WebhookID,
		EventID:         delivery.EventID,
		EventType:       delivery.EventType,
		TargetURL:       delivery.TargetURL,
		RequestHeaders:  delivery.RequestHeaders,
		RequestBody:     delivery.RequestBody,
		ResponseStatus:  delivery.ResponseStatus,
		ResponseHeaders: delivery.ResponseHeaders,
		ResponseBody:    delivery.ResponseBody,
		ExecutionTimeMS: delivery.ExecutionTimeMS,
		RetryCount:      delivery.RetryCount,
		MaxRetries:      delivery.MaxRetries,
		Status:          delivery.Status,
		ErrorMessage:    delivery.ErrorMessage,
		NextRetryAt:     delivery.NextRetryAt,
		DeliveredAt:     delivery.DeliveredAt,
		CreatedAt:       delivery.CreatedAt,
		UpdatedAt:       delivery.UpdatedAt,
	}
}

// Request/Response types for WebhookService
type UpdateWebhookRequest struct {
	Name     *string   `json:"name"`
	URL      *string   `json:"url"`
	Events   *[]string `json:"events"`
	Secret   *string   `json:"secret"`
	IsActive *bool     `json:"is_active"`
}

type CreateWebhookEventRequest struct {
	EventType string                 `json:"event_type" binding:"required"`
	Source    string                 `json:"source" binding:"required"`
	Data      map[string]interface{} `json:"data" binding:"required"`
}

type WebhookEventResponse struct {
	ID          uuid.UUID              `json:"id"`
	EventType   string                 `json:"event_type"`
	Source      string                 `json:"source"`
	Data        map[string]interface{} `json:"data"`
	Timestamp   time.Time              `json:"timestamp"`
	ProcessedAt *time.Time             `json:"processed_at"`
	Status      string                 `json:"status"`
	CreatedAt   time.Time              `json:"created_at"`
}

type WebhookDeliveryResponse struct {
	ID              uuid.UUID              `json:"id"`
	WebhookID       uuid.UUID              `json:"webhook_id"`
	EventID         uuid.UUID              `json:"event_id"`
	EventType       string                 `json:"event_type"`
	TargetURL       string                 `json:"target_url"`
	RequestHeaders  map[string]interface{} `json:"request_headers"`
	RequestBody     string                 `json:"request_body"`
	ResponseStatus  *int                   `json:"response_status"`
	ResponseHeaders map[string]interface{} `json:"response_headers"`
	ResponseBody    *string                `json:"response_body"`
	ExecutionTimeMS *int                   `json:"execution_time_ms"`
	RetryCount      int                    `json:"retry_count"`
	MaxRetries      int                    `json:"max_retries"`
	Status          string                 `json:"status"`
	ErrorMessage    *string                `json:"error_message"`
	NextRetryAt     *time.Time             `json:"next_retry_at"`
	DeliveredAt     *time.Time             `json:"delivered_at"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}
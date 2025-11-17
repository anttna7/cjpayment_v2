package service

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/shopspring/decimal"
)

// paymentChannelManager implements PaymentChannelManager interface
type paymentChannelManager struct {
	channels map[string]PaymentChannel
	mutex    sync.RWMutex
	
	// Health monitoring
	healthCheckInterval time.Duration
	healthStatus        map[string]*ChannelHealthStatus
	healthMutex         sync.RWMutex
	
	// Channel selection strategies
	strategies map[string]ChannelSelectionStrategy
}

// NewPaymentChannelManager creates a new payment channel manager
func NewPaymentChannelManager() PaymentChannelManager {
	manager := &paymentChannelManager{
		channels:            make(map[string]PaymentChannel),
		healthCheckInterval: 30 * time.Second,
		healthStatus:        make(map[string]*ChannelHealthStatus),
		strategies:          make(map[string]ChannelSelectionStrategy),
	}
	
	// Register default strategies
	manager.registerDefaultStrategies()
	
	// Start health monitoring
	go manager.startHealthMonitoring()
	
	return manager
}

// RegisterChannel registers a payment channel
func (m *paymentChannelManager) RegisterChannel(channel PaymentChannel) error {
	if channel == nil {
		return errors.New("channel cannot be nil")
	}
	
	channelID := channel.GetChannelID()
	if channelID == "" {
		return errors.New("channel ID cannot be empty")
	}
	
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	if _, exists := m.channels[channelID]; exists {
		return fmt.Errorf("channel with ID %s already exists", channelID)
	}
	
	m.channels[channelID] = channel
	
	// Initialize health status
	m.healthMutex.Lock()
	m.healthStatus[channelID] = &ChannelHealthStatus{
		ChannelID:   channelID,
		ChannelName: channel.GetChannelName(),
		IsHealthy:   false,
		CheckedAt:   time.Now(),
	}
	m.healthMutex.Unlock()
	
	return nil
}

// UnregisterChannel unregisters a payment channel
func (m *paymentChannelManager) UnregisterChannel(channelID string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	if _, exists := m.channels[channelID]; !exists {
		return fmt.Errorf("channel with ID %s not found", channelID)
	}
	
	delete(m.channels, channelID)
	
	// Remove health status
	m.healthMutex.Lock()
	delete(m.healthStatus, channelID)
	m.healthMutex.Unlock()
	
	return nil
}

// GetChannel gets a payment channel by ID
func (m *paymentChannelManager) GetChannel(channelID string) (PaymentChannel, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	channel, exists := m.channels[channelID]
	if !exists {
		return nil, fmt.Errorf("channel with ID %s not found", channelID)
	}
	
	return channel, nil
}

// ListChannels lists all registered channels
func (m *paymentChannelManager) ListChannels() []PaymentChannel {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	channels := make([]PaymentChannel, 0, len(m.channels))
	for _, channel := range m.channels {
		channels = append(channels, channel)
	}
	
	return channels
}

// GetChannelsByType gets channels by type
func (m *paymentChannelManager) GetChannelsByType(channelType string) []PaymentChannel {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	var channels []PaymentChannel
	for _, channel := range m.channels {
		if channel.GetChannelType() == channelType {
			channels = append(channels, channel)
		}
	}
	
	return channels
}

// SelectChannel selects a channel using default strategy
func (m *paymentChannelManager) SelectChannel(ctx context.Context, req *ChannelSelectionRequest) (PaymentChannel, error) {
	return m.SelectChannelByStrategy(ctx, &DefaultChannelSelectionStrategy{}, req)
}

// SelectChannelByStrategy selects a channel using specified strategy
func (m *paymentChannelManager) SelectChannelByStrategy(ctx context.Context, strategy ChannelSelectionStrategy, req *ChannelSelectionRequest) (PaymentChannel, error) {
	if strategy == nil {
		return nil, errors.New("strategy cannot be nil")
	}
	
	if req == nil {
		return nil, errors.New("selection request cannot be nil")
	}
	
	// Get available channels
	availableChannels := m.getAvailableChannels(req)
	if len(availableChannels) == 0 {
		return nil, errors.New("no available channels found")
	}
	
	// Use strategy to select channel
	return strategy.SelectChannel(ctx, availableChannels, req)
}

// CheckChannelHealth checks health of all channels
func (m *paymentChannelManager) CheckChannelHealth(ctx context.Context) map[string]*ChannelHealthStatus {
	m.mutex.RLock()
	channels := make(map[string]PaymentChannel)
	for id, channel := range m.channels {
		channels[id] = channel
	}
	m.mutex.RUnlock()
	
	results := make(map[string]*ChannelHealthStatus)
	
	for channelID, ch := range channels {
		startTime := time.Now()
		isHealthy := ch.IsHealthy(ctx)
		responseTime := time.Since(startTime).Milliseconds()
		
		status := &ChannelHealthStatus{
			ChannelID:    channelID,
			ChannelName:  ch.GetChannelName(),
			IsHealthy:    isHealthy,
			ResponseTime: responseTime,
			CheckedAt:    time.Now(),
		}
		
		if !isHealthy {
			channelStatus := ch.GetChannelStatus()
			if channelStatus != nil {
				status.ErrorMessage = channelStatus.ErrorMessage
			}
		}
		
		results[channelID] = status
		
		// Update internal health status
		m.healthMutex.Lock()
		m.healthStatus[channelID] = status
		m.healthMutex.Unlock()
	}
	
	return results
}

// GetHealthyChannels gets healthy channels by type
func (m *paymentChannelManager) GetHealthyChannels(channelType string) []PaymentChannel {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	var healthyChannels []PaymentChannel
	
	for channelID, channel := range m.channels {
		if channelType != "" && channel.GetChannelType() != channelType {
			continue
		}
		
		m.healthMutex.RLock()
		healthStatus, exists := m.healthStatus[channelID]
		m.healthMutex.RUnlock()
		
		if exists && healthStatus.IsHealthy {
			healthyChannels = append(healthyChannels, channel)
		}
	}
	
	return healthyChannels
}

// UpdateChannelConfig updates channel configuration
func (m *paymentChannelManager) UpdateChannelConfig(channelID string, config map[string]interface{}) error {
	channel, err := m.GetChannel(channelID)
	if err != nil {
		return err
	}
	
	return channel.UpdateConfiguration(config)
}

// GetChannelConfig gets channel configuration
func (m *paymentChannelManager) GetChannelConfig(channelID string) (map[string]interface{}, error) {
	_, err := m.GetChannel(channelID)
	if err != nil {
		return nil, err
	}
	
	// This would need to be implemented by each channel
	// For now, return empty config
	return make(map[string]interface{}), nil
}

// getAvailableChannels filters channels based on selection criteria
func (m *paymentChannelManager) getAvailableChannels(req *ChannelSelectionRequest) []PaymentChannel {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	var availableChannels []PaymentChannel
	
	for channelID, channel := range m.channels {
		// Check if channel is excluded
		if m.isChannelExcluded(channelID, req.ExcludedChannels) {
			continue
		}
		
		// Check if channel is healthy
		m.healthMutex.RLock()
		healthStatus, exists := m.healthStatus[channelID]
		m.healthMutex.RUnlock()
		
		if !exists || !healthStatus.IsHealthy {
			continue
		}
		
		// Check payment type support
		if !m.supportsPaymentType(channel, req.PaymentType) {
			continue
		}
		
		// Check currency support
		if !m.supportsCurrency(channel, req.Currency) {
			continue
		}
		
		// Check amount limits
		if !m.isAmountWithinLimits(channel, req.Amount) {
			continue
		}
		
		// Check required features
		if !m.hasRequiredFeatures(channel, req.RequireFeatures) {
			continue
		}
		
		availableChannels = append(availableChannels, channel)
	}
	
	// Prioritize preferred channels
	if len(req.PreferredChannels) > 0 {
		availableChannels = m.prioritizePreferredChannels(availableChannels, req.PreferredChannels)
	}
	
	return availableChannels
}

// Helper methods for channel filtering
func (m *paymentChannelManager) isChannelExcluded(channelID string, excludedChannels []string) bool {
	for _, excluded := range excludedChannels {
		if channelID == excluded {
			return true
		}
	}
	return false
}

func (m *paymentChannelManager) supportsPaymentType(channel PaymentChannel, paymentType string) bool {
	supportedTypes := channel.SupportedPaymentTypes()
	for _, supported := range supportedTypes {
		if supported == paymentType {
			return true
		}
	}
	return false
}

func (m *paymentChannelManager) supportsCurrency(channel PaymentChannel, currency string) bool {
	supportedCurrencies := channel.SupportedCurrencies()
	for _, supported := range supportedCurrencies {
		if supported == currency {
			return true
		}
	}
	return false
}

func (m *paymentChannelManager) isAmountWithinLimits(channel PaymentChannel, amount decimal.Decimal) bool {
	limits := channel.GetChannelLimits()
	if limits == nil {
		return true
	}
	
	if limits.MinAmount.GreaterThan(decimal.Zero) && amount.LessThan(limits.MinAmount) {
		return false
	}
	
	if limits.MaxAmount.GreaterThan(decimal.Zero) && amount.GreaterThan(limits.MaxAmount) {
		return false
	}
	
	if limits.SingleLimit.GreaterThan(decimal.Zero) && amount.GreaterThan(limits.SingleLimit) {
		return false
	}
	
	return true
}

func (m *paymentChannelManager) hasRequiredFeatures(channel PaymentChannel, requiredFeatures []string) bool {
	// This would need to be implemented based on channel capabilities
	// For now, assume all channels have all features
	return true
}

func (m *paymentChannelManager) prioritizePreferredChannels(channels []PaymentChannel, preferredChannels []string) []PaymentChannel {
	var prioritized []PaymentChannel
	var others []PaymentChannel
	
	// Add preferred channels first
	for _, preferred := range preferredChannels {
		for _, channel := range channels {
			if channel.GetChannelID() == preferred {
				prioritized = append(prioritized, channel)
				break
			}
		}
	}
	
	// Add non-preferred channels
	for _, channel := range channels {
		isPreferred := false
		for _, preferred := range preferredChannels {
			if channel.GetChannelID() == preferred {
				isPreferred = true
				break
			}
		}
		if !isPreferred {
			others = append(others, channel)
		}
	}
	
	return append(prioritized, others...)
}

// startHealthMonitoring starts background health monitoring
func (m *paymentChannelManager) startHealthMonitoring() {
	ticker := time.NewTicker(m.healthCheckInterval)
	defer ticker.Stop()
	
	for range ticker.C {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		m.CheckChannelHealth(ctx)
		cancel()
	}
}

// registerDefaultStrategies registers default channel selection strategies
func (m *paymentChannelManager) registerDefaultStrategies() {
	m.strategies["default"] = &DefaultChannelSelectionStrategy{}
	m.strategies["round_robin"] = &RoundRobinChannelSelectionStrategy{}
	m.strategies["weighted"] = &WeightedChannelSelectionStrategy{}
	m.strategies["least_used"] = &LeastUsedChannelSelectionStrategy{}
}

// Channel Selection Strategies

// DefaultChannelSelectionStrategy selects the first available channel
type DefaultChannelSelectionStrategy struct{}

func (s *DefaultChannelSelectionStrategy) SelectChannel(ctx context.Context, channels []PaymentChannel, req *ChannelSelectionRequest) (PaymentChannel, error) {
	if len(channels) == 0 {
		return nil, errors.New("no channels available")
	}
	return channels[0], nil
}

func (s *DefaultChannelSelectionStrategy) GetStrategyName() string {
	return "default"
}

// RoundRobinChannelSelectionStrategy selects channels in round-robin fashion
type RoundRobinChannelSelectionStrategy struct {
	counter int
	mutex   sync.Mutex
}

func (s *RoundRobinChannelSelectionStrategy) SelectChannel(ctx context.Context, channels []PaymentChannel, req *ChannelSelectionRequest) (PaymentChannel, error) {
	if len(channels) == 0 {
		return nil, errors.New("no channels available")
	}
	
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	index := s.counter % len(channels)
	s.counter++
	
	return channels[index], nil
}

func (s *RoundRobinChannelSelectionStrategy) GetStrategyName() string {
	return "round_robin"
}

// WeightedChannelSelectionStrategy selects channels based on weights
type WeightedChannelSelectionStrategy struct {
	weights map[string]int
	mutex   sync.RWMutex
}

func (s *WeightedChannelSelectionStrategy) SelectChannel(ctx context.Context, channels []PaymentChannel, req *ChannelSelectionRequest) (PaymentChannel, error) {
	if len(channels) == 0 {
		return nil, errors.New("no channels available")
	}
	
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	
	// Simple implementation: select channel with highest weight
	var selectedChannel PaymentChannel
	maxWeight := -1
	
	for _, channel := range channels {
		weight, exists := s.weights[channel.GetChannelID()]
		if !exists {
			weight = 1 // default weight
		}
		
		if weight > maxWeight {
			maxWeight = weight
			selectedChannel = channel
		}
	}
	
	if selectedChannel == nil {
		return channels[0], nil
	}
	
	return selectedChannel, nil
}

func (s *WeightedChannelSelectionStrategy) GetStrategyName() string {
	return "weighted"
}

func (s *WeightedChannelSelectionStrategy) SetWeight(channelID string, weight int) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	if s.weights == nil {
		s.weights = make(map[string]int)
	}
	
	s.weights[channelID] = weight
}

// LeastUsedChannelSelectionStrategy selects the least used channel
type LeastUsedChannelSelectionStrategy struct {
	usage map[string]int
	mutex sync.RWMutex
}

func (s *LeastUsedChannelSelectionStrategy) SelectChannel(ctx context.Context, channels []PaymentChannel, req *ChannelSelectionRequest) (PaymentChannel, error) {
	if len(channels) == 0 {
		return nil, errors.New("no channels available")
	}
	
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	if s.usage == nil {
		s.usage = make(map[string]int)
	}
	
	// Find channel with least usage
	var selectedChannel PaymentChannel
	minUsage := int(^uint(0) >> 1) // max int
	
	for _, channel := range channels {
		usage, exists := s.usage[channel.GetChannelID()]
		if !exists {
			usage = 0
		}
		
		if usage < minUsage {
			minUsage = usage
			selectedChannel = channel
		}
	}
	
	if selectedChannel == nil {
		selectedChannel = channels[0]
	}
	
	// Increment usage counter
	s.usage[selectedChannel.GetChannelID()]++
	
	return selectedChannel, nil
}

func (s *LeastUsedChannelSelectionStrategy) GetStrategyName() string {
	return "least_used"
}
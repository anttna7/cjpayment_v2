package service

import (
	"context"
	"log"
	"sync"
	"time"
)

// FailoverService 故障转移服务
type FailoverService struct {
	domainChecker      *DomainHealthChecker
	gatewayManager     *PaymentGatewayManager
	failoverController *FailoverController
	handler            *FailoverHandler

	// 服务控制
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	running    bool
	mu         sync.RWMutex

	// 配置
	domainCheckInterval  time.Duration
	gatewayCheckInterval time.Duration
	cleanupInterval      time.Duration
}

// NewFailoverService 创建故障转移服务
func NewFailoverService(
	domainChecker *DomainHealthChecker,
	gatewayManager *PaymentGatewayManager,
	failoverController *FailoverController,
	handler *FailoverHandler,
) *FailoverService {
	ctx, cancel := context.WithCancel(context.Background())

	return &FailoverService{
		domainChecker:        domainChecker,
		gatewayManager:       gatewayManager,
		failoverController:   failoverController,
		handler:              handler,
		ctx:                  ctx,
		cancel:               cancel,
		domainCheckInterval:  30 * time.Second,
		gatewayCheckInterval: 60 * time.Second,
		cleanupInterval:      24 * time.Hour,
	}
}

// Start 启动故障转移服务
func (s *FailoverService) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return nil
	}

	log.Println("Starting Failover Service...")

	// 启动域名健康检查定时任务
	s.wg.Add(1)
	go s.domainHealthCheckLoop()

	// 启动支付网关健康检查定时任务
	s.wg.Add(1)
	go s.gatewayHealthCheckLoop()

	// 启动数据清理定时任务
	s.wg.Add(1)
	go s.cleanupLoop()

	// 启动WebSocket状态广播
	s.wg.Add(1)
	go s.websocketBroadcastLoop()

	// 启动故障转移事件处理
	s.wg.Add(1)
	go s.failoverEventLoop()

	s.running = true
	log.Println("Failover Service started successfully")

	return nil
}

// Stop 停止故障转移服务
func (s *FailoverService) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return nil
	}

	log.Println("Stopping Failover Service...")

	s.cancel()
	s.wg.Wait()
	s.running = false

	log.Println("Failover Service stopped successfully")
	return nil
}

// IsRunning 检查服务是否正在运行
func (s *FailoverService) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// domainHealthCheckLoop 域名健康检查循环
func (s *FailoverService) domainHealthCheckLoop() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.domainCheckInterval)
	defer ticker.Stop()

	log.Printf("Domain health check loop started (interval: %v)", s.domainCheckInterval)

	// 立即执行一次检查
	s.performDomainHealthCheck()

	for {
		select {
		case <-ticker.C:
			s.performDomainHealthCheck()
		case <-s.ctx.Done():
			log.Println("Domain health check loop stopped")
			return
		}
	}
}

// gatewayHealthCheckLoop 支付网关健康检查循环
func (s *FailoverService) gatewayHealthCheckLoop() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.gatewayCheckInterval)
	defer ticker.Stop()

	log.Printf("Gateway health check loop started (interval: %v)", s.gatewayCheckInterval)

	// 立即执行一次检查
	s.performGatewayHealthCheck()

	for {
		select {
		case <-ticker.C:
			s.performGatewayHealthCheck()
		case <-s.ctx.Done():
			log.Println("Gateway health check loop stopped")
			return
		}
	}
}

// cleanupLoop 数据清理循环
func (s *FailoverService) cleanupLoop() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	log.Printf("Cleanup loop started (interval: %v)", s.cleanupInterval)

	for {
		select {
		case <-ticker.C:
			s.performCleanup()
		case <-s.ctx.Done():
			log.Println("Cleanup loop stopped")
			return
		}
	}
}

// websocketBroadcastLoop WebSocket状态广播循环
func (s *FailoverService) websocketBroadcastLoop() {
	defer s.wg.Done()

	log.Println("WebSocket broadcast loop started")
	s.handler.StartPeriodicStatusBroadcast(s.ctx)
	log.Println("WebSocket broadcast loop stopped")
}

// failoverEventLoop 故障转移事件处理循环
func (s *FailoverService) failoverEventLoop() {
	defer s.wg.Done()

	log.Println("Failover event loop started")

	// 设置事件回调
	s.domainChecker.SetStatusChangeCallback(s.handleDomainStatusChange)
	s.gatewayManager.SetStatusChangeCallback(s.handleGatewayStatusChange)

	// 保持运行
	<-s.ctx.Done()
	log.Println("Failover event loop stopped")
}

// performDomainHealthCheck 执行域名健康检查
func (s *FailoverService) performDomainHealthCheck() {
	log.Println("Performing domain health check...")

	domains, err := s.domainChecker.GetAllDomains()
	if err != nil {
		log.Printf("Failed to get domains for health check: %v", err)
		return
	}

	var wg sync.WaitGroup

	for _, domain := range domains {
		if !domain.Enabled {
			continue
		}

		wg.Add(1)
		go func(d DomainConfig) {
			defer wg.Done()

			result, err := s.domainChecker.checkDomainHealth(&d)
			if err != nil {
				log.Printf("Failed to check domain %s: %v", d.Domain, err)
				return
			}

			// 更新状态
			if err := s.domainChecker.updateDomainStatus(d.ID, result); err != nil {
				log.Printf("Failed to update domain status for %s: %v", d.Domain, err)
			}
		}(domain)
	}

	wg.Wait()
	log.Println("Domain health check completed")
}

// performGatewayHealthCheck 执行支付网关健康检查
func (s *FailoverService) performGatewayHealthCheck() {
	log.Println("Performing gateway health check...")

	gateways, err := s.gatewayManager.GetAllGateways()
	if err != nil {
		log.Printf("Failed to get gateways for health check: %v", err)
		return
	}

	var wg sync.WaitGroup

	for _, gateway := range gateways {
		if !gateway.Enabled {
			continue
		}

		wg.Add(1)
		go func(g PaymentGatewayConfig) {
			defer wg.Done()

			result, err := s.gatewayManager.checkGatewayHealth(&g)
			if err != nil {
				log.Printf("Failed to check gateway %s: %v", g.Name, err)
				return
			}

			// 更新状态
			if err := s.gatewayManager.updateGatewayStatus(g.ID, result); err != nil {
				log.Printf("Failed to update gateway status for %s: %v", g.Name, err)
			}
		}(gateway)
	}

	wg.Wait()
	log.Println("Gateway health check completed")
}

// performCleanup 执行数据清理
func (s *FailoverService) performCleanup() {
	log.Println("Performing data cleanup...")

	// 清理30天前的健康检查记录
	cutoffTime := time.Now().AddDate(0, 0, -30)

	// 清理域名检查记录
	if err := s.domainChecker.CleanupOldRecords(cutoffTime); err != nil {
		log.Printf("Failed to cleanup domain records: %v", err)
	}

	// 清理网关检查记录
	if err := s.gatewayManager.CleanupOldRecords(cutoffTime); err != nil {
		log.Printf("Failed to cleanup gateway records: %v", err)
	}

	// 清理故障转移日志
	if err := s.failoverController.CleanupOldLogs(cutoffTime); err != nil {
		log.Printf("Failed to cleanup failover logs: %v", err)
	}

	log.Println("Data cleanup completed")
}

// handleDomainStatusChange 处理域名状态变化
func (s *FailoverService) handleDomainStatusChange(domain *DomainConfig, oldStatus, newStatus string) {
	log.Printf("Domain status changed: %s (%s -> %s)", domain.Domain, oldStatus, newStatus)

	// 创建故障转移事件
	event := FailoverEvent{
		Type:        "domain_status_change",
		Source:      "domain_checker",
		SourceID:    domain.ID,
		Description: fmt.Sprintf("Domain %s status changed from %s to %s", domain.Domain, oldStatus, newStatus),
		Timestamp:   time.Now(),
		Metadata: map[string]interface{}{
			"domain":     domain.Domain,
			"old_status": oldStatus,
			"new_status": newStatus,
			"priority":   domain.Priority,
		},
	}

	// 处理故障转移
	if err := s.failoverController.HandleEvent(&event); err != nil {
		log.Printf("Failed to handle domain failover event: %v", err)
	}

	// 如果是主域名出现故障，触发故障转移
	if domain.IsPrimary && newStatus == "down" {
		if err := s.failoverController.performDomainFailover(domain); err != nil {
			log.Printf("Failed to perform domain failover: %v", err)
		}
	}

	// 广播状态更新
	s.handler.broadcastStatusUpdate("domain_status_change", map[string]interface{}{
		"domain":     domain,
		"old_status": oldStatus,
		"new_status": newStatus,
		"timestamp":  time.Now(),
	})
}

// handleGatewayStatusChange 处理支付网关状态变化
func (s *FailoverService) handleGatewayStatusChange(gateway *PaymentGatewayConfig, oldStatus, newStatus string) {
	log.Printf("Gateway status changed: %s (%s -> %s)", gateway.Name, oldStatus, newStatus)

	// 创建故障转移事件
	event := FailoverEvent{
		Type:        "gateway_status_change",
		Source:      "gateway_manager",
		SourceID:    gateway.ID,
		Description: fmt.Sprintf("Gateway %s status changed from %s to %s", gateway.Name, oldStatus, newStatus),
		Timestamp:   time.Now(),
		Metadata: map[string]interface{}{
			"gateway":    gateway.Name,
			"old_status": oldStatus,
			"new_status": newStatus,
			"priority":   gateway.Priority,
		},
	}

	// 处理故障转移
	if err := s.failoverController.HandleEvent(&event); err != nil {
		log.Printf("Failed to handle gateway failover event: %v", err)
	}

	// 如果是主网关出现故障，触发故障转移
	if gateway.IsPrimary && newStatus == "down" {
		if err := s.failoverController.performGatewayFailover(gateway); err != nil {
			log.Printf("Failed to perform gateway failover: %v", err)
		}
	}

	// 广播状态更新
	s.handler.broadcastStatusUpdate("gateway_status_change", map[string]interface{}{
		"gateway":    gateway,
		"old_status": oldStatus,
		"new_status": newStatus,
		"timestamp":  time.Now(),
	})
}

// UpdateDomainCheckInterval 更新域名检查间隔
func (s *FailoverService) UpdateDomainCheckInterval(interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.domainCheckInterval = interval
	log.Printf("Domain check interval updated to: %v", interval)
}

// UpdateGatewayCheckInterval 更新网关检查间隔
func (s *FailoverService) UpdateGatewayCheckInterval(interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gatewayCheckInterval = interval
	log.Printf("Gateway check interval updated to: %v", interval)
}

// GetStatus 获取服务状态
func (s *FailoverService) GetStatus() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return map[string]interface{}{
		"running":                 s.running,
		"domain_check_interval":   s.domainCheckInterval.String(),
		"gateway_check_interval":  s.gatewayCheckInterval.String(),
		"cleanup_interval":        s.cleanupInterval.String(),
		"start_time":              time.Now().Sub(s.ctx.Value("start_time").(time.Time)).String(),
	}
}

// TriggerDomainCheck 手动触发域名检查
func (s *FailoverService) TriggerDomainCheck() {
	go s.performDomainHealthCheck()
}

// TriggerGatewayCheck 手动触发网关检查
func (s *FailoverService) TriggerGatewayCheck() {
	go s.performGatewayHealthCheck()
}

// TriggerCleanup 手动触发数据清理
func (s *FailoverService) TriggerCleanup() {
	go s.performCleanup()
}
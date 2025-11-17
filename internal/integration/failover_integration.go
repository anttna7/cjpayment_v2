package integration

import (
	"context"
	"database/sql"
	"log"
	"time"
)

// FailoverSystem 故障转移系统集成
type FailoverSystem struct {
	db                 *sql.DB
	domainChecker      *DomainHealthChecker
	gatewayManager     *PaymentGatewayManager
	failoverController *FailoverController
	handler            *FailoverHandler
	service            *FailoverService

	// 系统状态
	initialized bool
	running     bool
}

// NewFailoverSystem 创建故障转移系统
func NewFailoverSystem(db *sql.DB) *FailoverSystem {
	return &FailoverSystem{
		db: db,
	}
}

// Initialize 初始化故障转移系统
func (fs *FailoverSystem) Initialize() error {
	if fs.initialized {
		return nil
	}

	log.Println("Initializing Failover System...")

	// 1. 初始化域名健康检查器
	fs.domainChecker = NewDomainHealthChecker(fs.db)
	if err := fs.domainChecker.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize domain checker: %v", err)
	}

	// 2. 初始化支付网关管理器
	fs.gatewayManager = NewPaymentGatewayManager(fs.db)
	if err := fs.gatewayManager.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize gateway manager: %v", err)
	}

	// 3. 初始化故障转移控制器
	fs.failoverController = NewFailoverController(fs.db, fs.domainChecker, fs.gatewayManager)
	if err := fs.failoverController.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize failover controller: %v", err)
	}

	// 4. 初始化HTTP处理器
	fs.handler = NewFailoverHandler(fs.domainChecker, fs.gatewayManager, fs.failoverController)

	// 5. 初始化后台服务
	fs.service = NewFailoverService(fs.domainChecker, fs.gatewayManager, fs.failoverController, fs.handler)

	fs.initialized = true
	log.Println("Failover System initialized successfully")

	return nil
}

// Start 启动故障转移系统
func (fs *FailoverSystem) Start() error {
	if !fs.initialized {
		if err := fs.Initialize(); err != nil {
			return err
		}
	}

	if fs.running {
		return nil
	}

	log.Println("Starting Failover System...")

	// 启动健康检查器
	if err := fs.domainChecker.Start(); err != nil {
		return fmt.Errorf("failed to start domain checker: %v", err)
	}

	// 启动网关管理器
	if err := fs.gatewayManager.Start(); err != nil {
		return fmt.Errorf("failed to start gateway manager: %v", err)
	}

	// 启动故障转移控制器
	if err := fs.failoverController.Start(); err != nil {
		return fmt.Errorf("failed to start failover controller: %v", err)
	}

	// 启动后台服务
	if err := fs.service.Start(); err != nil {
		return fmt.Errorf("failed to start failover service: %v", err)
	}

	fs.running = true
	log.Println("Failover System started successfully")

	return nil
}

// Stop 停止故障转移系统
func (fs *FailoverSystem) Stop() error {
	if !fs.running {
		return nil
	}

	log.Println("Stopping Failover System...")

	// 停止后台服务
	if err := fs.service.Stop(); err != nil {
		log.Printf("Failed to stop failover service: %v", err)
	}

	// 停止故障转移控制器
	if err := fs.failoverController.Stop(); err != nil {
		log.Printf("Failed to stop failover controller: %v", err)
	}

	// 停止网关管理器
	if err := fs.gatewayManager.Stop(); err != nil {
		log.Printf("Failed to stop gateway manager: %v", err)
	}

	// 停止健康检查器
	if err := fs.domainChecker.Stop(); err != nil {
		log.Printf("Failed to stop domain checker: %v", err)
	}

	fs.running = false
	log.Println("Failover System stopped successfully")

	return nil
}

// IsRunning 检查系统是否运行中
func (fs *FailoverSystem) IsRunning() bool {
	return fs.running
}

// GetHandler 获取HTTP处理器
func (fs *FailoverSystem) GetHandler() *FailoverHandler {
	return fs.handler
}

// GetService 获取后台服务
func (fs *FailoverSystem) GetService() *FailoverService {
	return fs.service
}

// GetDomainChecker 获取域名检查器
func (fs *FailoverSystem) GetDomainChecker() *DomainHealthChecker {
	return fs.domainChecker
}

// GetGatewayManager 获取网关管理器
func (fs *FailoverSystem) GetGatewayManager() *PaymentGatewayManager {
	return fs.gatewayManager
}

// GetFailoverController 获取故障转移控制器
func (fs *FailoverSystem) GetFailoverController() *FailoverController {
	return fs.failoverController
}

// GetSystemStatus 获取系统状态
func (fs *FailoverSystem) GetSystemStatus() map[string]interface{} {
	status := map[string]interface{}{
		"initialized": fs.initialized,
		"running":     fs.running,
		"timestamp":   time.Now().Format(time.RFC3339),
	}

	if fs.initialized {
		// 获取各组件状态
		if fs.domainChecker != nil {
			status["domain_checker"] = fs.domainChecker.GetStatus()
		}

		if fs.gatewayManager != nil {
			status["gateway_manager"] = fs.gatewayManager.GetStatus()
		}

		if fs.failoverController != nil {
			status["failover_controller"] = fs.failoverController.GetStatus()
		}

		if fs.service != nil {
			status["service"] = fs.service.GetStatus()
		}
	}

	return status
}

// PerformHealthCheck 执行系统健康检查
func (fs *FailoverSystem) PerformHealthCheck() (map[string]interface{}, error) {
	if !fs.running {
		return nil, fmt.Errorf("system is not running")
	}

	result := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"overall":   "healthy",
	}

	// 检查域名状态
	domains, err := fs.domainChecker.GetAllDomains()
	if err != nil {
		result["domain_error"] = err.Error()
		result["overall"] = "degraded"
	} else {
		activeDomains := 0
		for _, domain := range domains {
			if domain.Status == "up" && domain.Enabled {
				activeDomains++
			}
		}
		result["active_domains"] = activeDomains
		result["total_domains"] = len(domains)

		if activeDomains == 0 {
			result["overall"] = "critical"
		}
	}

	// 检查网关状态
	gateways, err := fs.gatewayManager.GetAllGateways()
	if err != nil {
		result["gateway_error"] = err.Error()
		result["overall"] = "degraded"
	} else {
		activeGateways := 0
		for _, gateway := range gateways {
			if gateway.Status == "up" && gateway.Enabled {
				activeGateways++
			}
		}
		result["active_gateways"] = activeGateways
		result["total_gateways"] = len(gateways)

		if activeGateways == 0 {
			result["overall"] = "critical"
		}
	}

	return result, nil
}

// TriggerFailover 手动触发故障转移
func (fs *FailoverSystem) TriggerFailover(failoverType string, sourceID int64) error {
	if !fs.running {
		return fmt.Errorf("system is not running")
	}

	switch failoverType {
	case "domain":
		domain, err := fs.domainChecker.GetDomain(sourceID)
		if err != nil {
			return fmt.Errorf("failed to get domain: %v", err)
		}
		return fs.failoverController.performDomainFailover(domain)

	case "gateway":
		gateway, err := fs.gatewayManager.GetGateway(sourceID)
		if err != nil {
			return fmt.Errorf("failed to get gateway: %v", err)
		}
		return fs.failoverController.performGatewayFailover(gateway)

	default:
		return fmt.Errorf("unknown failover type: %s", failoverType)
	}
}

// GetRecentEvents 获取最近的事件
func (fs *FailoverSystem) GetRecentEvents(limit int) ([]FailoverLogEntry, error) {
	if !fs.running {
		return nil, fmt.Errorf("system is not running")
	}

	return fs.failoverController.GetLogs(limit)
}

// GetStatistics 获取统计信息
func (fs *FailoverSystem) GetStatistics() (map[string]interface{}, error) {
	if !fs.running {
		return nil, fmt.Errorf("system is not running")
	}

	stats := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
	}

	// 域名统计
	domains, err := fs.domainChecker.GetAllDomains()
	if err != nil {
		return nil, fmt.Errorf("failed to get domain statistics: %v", err)
	}

	domainStats := map[string]int{
		"total":   len(domains),
		"enabled": 0,
		"up":      0,
		"down":    0,
		"primary": 0,
	}

	for _, domain := range domains {
		if domain.Enabled {
			domainStats["enabled"]++
		}
		if domain.Status == "up" {
			domainStats["up"]++
		} else {
			domainStats["down"]++
		}
		if domain.IsPrimary {
			domainStats["primary"]++
		}
	}

	stats["domains"] = domainStats

	// 网关统计
	gateways, err := fs.gatewayManager.GetAllGateways()
	if err != nil {
		return nil, fmt.Errorf("failed to get gateway statistics: %v", err)
	}

	gatewayStats := map[string]int{
		"total":   len(gateways),
		"enabled": 0,
		"up":      0,
		"down":    0,
		"primary": 0,
	}

	for _, gateway := range gateways {
		if gateway.Enabled {
			gatewayStats["enabled"]++
		}
		if gateway.Status == "up" {
			gatewayStats["up"]++
		} else {
			gatewayStats["down"]++
		}
		if gateway.IsPrimary {
			gatewayStats["primary"]++
		}
	}

	stats["gateways"] = gatewayStats

	// 故障转移统计
	logs, err := fs.failoverController.GetLogs(1000)
	if err != nil {
		return nil, fmt.Errorf("failed to get failover statistics: %v", err)
	}

	failoverStats := map[string]int{
		"total_events":     len(logs),
		"domain_events":    0,
		"gateway_events":   0,
		"recent_24h":       0,
	}

	cutoff24h := time.Now().Add(-24 * time.Hour)
	for _, log := range logs {
		if log.Timestamp.After(cutoff24h) {
			failoverStats["recent_24h"]++
		}
		if log.EventType == "domain_failover" {
			failoverStats["domain_events"]++
		} else if log.EventType == "gateway_failover" {
			failoverStats["gateway_events"]++
		}
	}

	stats["failover"] = failoverStats

	return stats, nil
}

// ValidateConfiguration 验证配置
func (fs *FailoverSystem) ValidateConfiguration() []string {
	var issues []string

	if !fs.initialized {
		issues = append(issues, "System not initialized")
		return issues
	}

	// 检查域名配置
	domains, err := fs.domainChecker.GetAllDomains()
	if err != nil {
		issues = append(issues, fmt.Sprintf("Failed to get domains: %v", err))
	} else {
		primaryCount := 0
		enabledCount := 0
		for _, domain := range domains {
			if domain.Enabled {
				enabledCount++
			}
			if domain.IsPrimary {
				primaryCount++
			}
		}

		if enabledCount == 0 {
			issues = append(issues, "No enabled domains configured")
		}
		if primaryCount == 0 {
			issues = append(issues, "No primary domain configured")
		}
		if primaryCount > 1 {
			issues = append(issues, "Multiple primary domains configured")
		}
	}

	// 检查网关配置
	gateways, err := fs.gatewayManager.GetAllGateways()
	if err != nil {
		issues = append(issues, fmt.Sprintf("Failed to get gateways: %v", err))
	} else {
		primaryCount := 0
		enabledCount := 0
		for _, gateway := range gateways {
			if gateway.Enabled {
				enabledCount++
			}
			if gateway.IsPrimary {
				primaryCount++
			}
		}

		if enabledCount == 0 {
			issues = append(issues, "No enabled gateways configured")
		}
		if primaryCount == 0 {
			issues = append(issues, "No primary gateway configured")
		}
		if primaryCount > 1 {
			issues = append(issues, "Multiple primary gateways configured")
		}
	}

	return issues
}

// Restart 重启系统
func (fs *FailoverSystem) Restart() error {
	log.Println("Restarting Failover System...")

	if err := fs.Stop(); err != nil {
		return fmt.Errorf("failed to stop system: %v", err)
	}

	// 等待一秒确保资源释放
	time.Sleep(1 * time.Second)

	if err := fs.Start(); err != nil {
		return fmt.Errorf("failed to start system: %v", err)
	}

	log.Println("Failover System restarted successfully")
	return nil
}
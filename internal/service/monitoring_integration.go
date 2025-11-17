package service

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"gorm.io/gorm"

	"github.com/company/cjpayment/internal/middleware"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/logger"
	"cjpayment/pkg/monitoring"
)

// MonitoringIntegration 监控集成服务
type MonitoringIntegration struct {
	db                  *gorm.DB
	redis               *redis.Client
	logger              *logger.StructuredLogger
	metricsCollector    *MetricsCollector
	alertManager        *AlertManager
	// healthHandler removed to avoid import cycle
	monitoringService   *monitoring.Service
}

// NewMonitoringIntegration 创建监控集成服务
func NewMonitoringIntegration(
	db *gorm.DB,
	redis *redis.Client,
	logger *logger.StructuredLogger,
	repositoryManager *repository.Manager,
	notificationService NotificationService,
) *MonitoringIntegration {
	// 创建指标收集器
	metricsCollector := NewMetricsCollector(
		repositoryManager.MerchantRepository(),
		repositoryManager.MerchantReceiveAccountRepository(),
		repositoryManager.RechargeOrderRepository(),
		repositoryManager.ReceiveAccountRepository(),
		logger,
	)

	// 创建告警管理器
	alertManager := NewAlertManager(logger, notificationService)

	// Health handler removed to avoid import cycle

	// 创建监控服务配置
	config := monitoring.Config{
		Enabled:            true,
		Port:               "9090",
		Path:               "/metrics",
		HealthPath:         "/health",
		CollectionInterval: time.Minute * 5,
	}

	// 创建监控服务
	monitoringService := monitoring.NewService(config, nil, redis)

	return &MonitoringIntegration{
		db:                db,
		redis:             redis,
		logger:            logger,
		metricsCollector:  metricsCollector,
		alertManager:      alertManager,
		// healthHandler:     healthHandler,
		monitoringService: monitoringService,
	}
}

// SetupMonitoringMiddleware 设置监控中间件
func (mi *MonitoringIntegration) SetupMonitoringMiddleware(router *gin.Engine) {
	// 添加监控中间件
	router.Use(middleware.MonitoringMiddleware(mi.logger))
	
	// 添加panic恢复中间件
	router.Use(middleware.PanicRecoveryMiddleware(mi.logger))
	
	// 添加安全监控中间件
	router.Use(middleware.SecurityMonitoringMiddleware(mi.logger))
}

// SetupMonitoringRoutes 设置监控路由
func (mi *MonitoringIntegration) SetupMonitoringRoutes(router *gin.Engine) {
	// 注册健康检查路由
	// mi.healthHandler.RegisterHealthRoutes(router) // removed to avoid import cycle

	// 添加Prometheus指标端点
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 添加监控仪表板路由
	monitoring := router.Group("/monitoring")
	{
		monitoring.GET("/dashboard", mi.handleMonitoringDashboard)
		monitoring.GET("/alerts", mi.handleAlertsAPI)
		monitoring.GET("/metrics/business", mi.handleBusinessMetrics)
		monitoring.GET("/system/status", mi.handleSystemStatus)
	}
}

// StartMonitoringServices 启动监控服务
func (mi *MonitoringIntegration) StartMonitoringServices(ctx context.Context) error {
	mi.logger.WithFields(logger.LogFields{
		"component": "monitoring_integration",
	}).Info("Starting monitoring services")

	// 启动指标收集
	go mi.metricsCollector.StartMetricsCollection(ctx, time.Minute*5)

	// 启动告警监控
	go mi.alertManager.StartAlertMonitoring(ctx)

	// 启动监控服务
	go func() {
		if err := mi.monitoringService.Start(); err != nil {
			mi.logger.LogError(ctx, "monitoring_integration", "start_monitoring_service", err, nil)
		}
	}()

	mi.logger.WithFields(logger.LogFields{
		"component": "monitoring_integration",
	}).Info("All monitoring services started successfully")

	return nil
}

// StopMonitoringServices 停止监控服务
func (mi *MonitoringIntegration) StopMonitoringServices(ctx context.Context) error {
	mi.logger.WithFields(logger.LogFields{
		"component": "monitoring_integration",
	}).Info("Stopping monitoring services")

	// 停止监控服务
	if err := mi.monitoringService.Stop(ctx); err != nil {
		mi.logger.LogError(ctx, "monitoring_integration", "stop_monitoring_service", err, nil)
		return err
	}

	mi.logger.WithFields(logger.LogFields{
		"component": "monitoring_integration",
	}).Info("All monitoring services stopped successfully")

	return nil
}

// handleMonitoringDashboard 处理监控仪表板请求
func (mi *MonitoringIntegration) handleMonitoringDashboard(c *gin.Context) {
	ctx := c.Request.Context()

	// 收集当前业务指标
	if err := mi.metricsCollector.CollectBusinessMetrics(ctx); err != nil {
		mi.logger.LogError(ctx, "monitoring_integration", "collect_dashboard_metrics", err, nil)
		c.JSON(500, gin.H{"error": "Failed to collect metrics"})
		return
	}

	// 获取系统状态
	systemStatus := mi.monitoringService.GetHealthStatus()

	// 获取告警历史
	alertHistory := mi.alertManager.GetAlertHistory(50)

	dashboard := gin.H{
		"system_status":  systemStatus,
		"alert_history":  alertHistory,
		"metrics_summary": mi.getMetricsSummary(ctx),
		"timestamp":      time.Now(),
	}

	c.JSON(200, dashboard)
}

// handleAlertsAPI 处理告警API请求
func (mi *MonitoringIntegration) handleAlertsAPI(c *gin.Context) {
	limit := 100
	if limitParam := c.Query("limit"); limitParam != "" {
		// 解析limit参数
		// 这里简化处理，实际应该进行错误处理
	}

	alerts := mi.alertManager.GetAlertHistory(limit)
	c.JSON(200, gin.H{
		"alerts": alerts,
		"total":  len(alerts),
	})
}

// handleBusinessMetrics 处理业务指标API请求
func (mi *MonitoringIntegration) handleBusinessMetrics(c *gin.Context) {
	ctx := c.Request.Context()

	// 收集最新的业务指标
	if err := mi.metricsCollector.CollectBusinessMetrics(ctx); err != nil {
		mi.logger.LogError(ctx, "monitoring_integration", "collect_business_metrics", err, nil)
		c.JSON(500, gin.H{"error": "Failed to collect business metrics"})
		return
	}

	metrics := mi.getMetricsSummary(ctx)
	c.JSON(200, metrics)
}

// handleSystemStatus 处理系统状态API请求
func (mi *MonitoringIntegration) handleSystemStatus(c *gin.Context) {
	status := mi.monitoringService.GetHealthStatus()
	c.JSON(200, status)
}

// getMetricsSummary 获取指标摘要
func (mi *MonitoringIntegration) getMetricsSummary(ctx context.Context) map[string]interface{} {
	// 这里应该从Prometheus或其他指标存储中获取实际数据
	// 为了演示，我们返回模拟数据
	return map[string]interface{}{
		"orders": map[string]interface{}{
			"total_today":    150,
			"completed":      120,
			"pending":        25,
			"failed":         5,
			"success_rate":   0.8,
			"total_amount":   125000.50,
		},
		"accounts": map[string]interface{}{
			"total_active":       45,
			"high_utilization":   3,
			"avg_utilization":    0.65,
			"limit_warnings":     2,
		},
		"merchants": map[string]interface{}{
			"total_active":       12,
			"orders_today":       150,
			"avg_order_amount":   833.34,
		},
		"system": map[string]interface{}{
			"response_time_avg":  1.2,
			"error_rate":         0.02,
			"uptime_hours":       72.5,
			"active_connections": 35,
		},
	}
}

// RecordRechargeOrderMetrics 记录充值订单指标
func (mi *MonitoringIntegration) RecordRechargeOrderMetrics(ctx context.Context, merchantID string, status, paymentType string, amount float64) {
	// 记录Prometheus指标
	monitoring.RecordRechargeOrder(merchantID, status, paymentType, amount)

	// 记录结构化日志
	mi.logger.LogRechargeOrder(ctx, "", merchantID, "order_created", amount, status)

	// 记录业务指标日志
	mi.logger.LogBusinessMetric(ctx, "recharge_order_created", amount, map[string]string{
		"merchant_id":  merchantID,
		"status":       status,
		"payment_type": paymentType,
	})
}

// RecordAccountMatchMetrics 记录账号匹配指标
func (mi *MonitoringIntegration) RecordAccountMatchMetrics(ctx context.Context, merchantID, paymentType, accountID string, duration time.Duration, success bool, reason string) {
	// 记录Prometheus指标
	monitoring.RecordAccountMatch(merchantID, paymentType, accountID, duration.Seconds(), success, reason)

	// 记录结构化日志
	mi.logger.LogAccountMatch(ctx, merchantID, paymentType, 0, accountID, duration, success, reason)
}

// RecordNotificationMetrics 记录通知指标
func (mi *MonitoringIntegration) RecordNotificationMetrics(ctx context.Context, notificationType, channel, status string) {
	// 记录Prometheus指标
	monitoring.RecordNotification(notificationType, channel, status)

	// 记录结构化日志
	mi.logger.LogNotification(ctx, notificationType, channel, "", status == "success", "")
}

// GetDatabaseMonitoringMiddleware 获取数据库监控中间件
func (mi *MonitoringIntegration) GetDatabaseMonitoringMiddleware() *middleware.DatabaseMonitoringMiddleware {
	return middleware.NewDatabaseMonitoringMiddleware(mi.logger)
}

// GetCacheMonitoringMiddleware 获取缓存监控中间件
func (mi *MonitoringIntegration) GetCacheMonitoringMiddleware() *middleware.CacheMonitoringMiddleware {
	return middleware.NewCacheMonitoringMiddleware(mi.logger)
}
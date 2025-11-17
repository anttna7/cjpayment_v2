package service

import (
	"context"
	"testing"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"cjpayment/internal/repository"
	"cjpayment/pkg/logger"
)

// MockNotificationService 模拟通知服务
type MockNotificationService struct {
	mock.Mock
}

func (m *MockNotificationService) SendNotification(ctx context.Context, notification *Notification) error {
	args := m.Called(ctx, notification)
	return args.Error(0)
}

func (m *MockNotificationService) SendEmail(ctx context.Context, to, subject, body string) error {
	args := m.Called(ctx, to, subject, body)
	return args.Error(0)
}

func (m *MockNotificationService) SendSMS(ctx context.Context, to, message string) error {
	args := m.Called(ctx, to, message)
	return args.Error(0)
}

// TestMonitoringIntegration_Setup 测试监控集成设置
func TestMonitoringIntegration_Setup(t *testing.T) {
	// 设置测试数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 设置测试Redis客户端
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1, // 使用测试数据库
	})

	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建模拟通知服务
	mockNotificationService := &MockNotificationService{}

	// 创建仓储管理器
	repositoryManager := repository.NewManager(db)

	// 创建监控集成服务
	monitoringIntegration := NewMonitoringIntegration(
		db,
		redisClient,
		structuredLogger,
		repositoryManager,
		mockNotificationService,
	)

	assert.NotNil(t, monitoringIntegration)
	assert.NotNil(t, monitoringIntegration.metricsCollector)
	assert.NotNil(t, monitoringIntegration.alertManager)
	assert.NotNil(t, monitoringIntegration.healthHandler)
}

// TestMetricsCollector_CollectBusinessMetrics 测试业务指标收集
func TestMetricsCollector_CollectBusinessMetrics(t *testing.T) {
	// 设置测试数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建仓储管理器
	repositoryManager := repository.NewManager(db)

	// 创建指标收集器
	metricsCollector := NewMetricsCollector(
		repositoryManager.MerchantRepository(),
		repositoryManager.MerchantReceiveAccountRepository(),
		repositoryManager.RechargeOrderRepository(),
		repositoryManager.ReceiveAccountRepository(),
		structuredLogger,
	)

	ctx := context.Background()

	// 测试指标收集
	err = metricsCollector.CollectBusinessMetrics(ctx)
	assert.NoError(t, err)
}

// TestAlertManager_AlertRules 测试告警规则
func TestAlertManager_AlertRules(t *testing.T) {
	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建模拟通知服务
	mockNotificationService := &MockNotificationService{}
	mockNotificationService.On("SendNotification", mock.Anything, mock.Anything).Return(nil)

	// 创建告警管理器
	alertManager := NewAlertManager(structuredLogger, mockNotificationService)

	assert.NotNil(t, alertManager)
	assert.Greater(t, len(alertManager.alertRules), 0)

	// 测试添加自定义告警规则
	customRule := AlertRule{
		Name:           "test_rule",
		Condition:      func(ctx context.Context) (bool, *Alert) { return false, nil },
		Interval:       time.Minute,
		Enabled:        true,
		CooldownPeriod: time.Minute * 5,
	}

	alertManager.AddAlertRule(customRule)
	assert.Equal(t, len(alertManager.alertRules), 6) // 5个默认规则 + 1个自定义规则
}

// TestAlertManager_HandleAlert 测试告警处理
func TestAlertManager_HandleAlert(t *testing.T) {
	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建模拟通知服务
	mockNotificationService := &MockNotificationService{}
	mockNotificationService.On("SendNotification", mock.Anything, mock.Anything).Return(nil)

	// 创建告警管理器
	alertManager := NewAlertManager(structuredLogger, mockNotificationService)

	ctx := context.Background()

	// 创建测试告警
	testAlert := Alert{
		ID:        "test_alert_001",
		Level:     AlertLevelWarning,
		Title:     "Test Alert",
		Message:   "This is a test alert",
		Component: "test_component",
		Timestamp: time.Now(),
		Labels: map[string]string{
			"test": "true",
		},
	}

	// 处理告警
	alertManager.handleAlert(ctx, testAlert)

	// 验证告警被添加到历史记录
	history := alertManager.GetAlertHistory(10)
	assert.Equal(t, len(history), 1)
	assert.Equal(t, history[0].ID, testAlert.ID)

	// 验证通知服务被调用
	mockNotificationService.AssertCalled(t, "SendNotification", mock.Anything, mock.Anything)
}

// TestMonitoringIntegration_RecordMetrics 测试指标记录
func TestMonitoringIntegration_RecordMetrics(t *testing.T) {
	// 设置测试数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 设置测试Redis客户端
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建模拟通知服务
	mockNotificationService := &MockNotificationService{}

	// 创建仓储管理器
	repositoryManager := repository.NewManager(db)

	// 创建监控集成服务
	monitoringIntegration := NewMonitoringIntegration(
		db,
		redisClient,
		structuredLogger,
		repositoryManager,
		mockNotificationService,
	)

	ctx := context.Background()

	// 测试记录充值订单指标
	monitoringIntegration.RecordRechargeOrderMetrics(ctx, "merchant_001", "pending", "corporate", 1000.50)

	// 测试记录账号匹配指标
	monitoringIntegration.RecordAccountMatchMetrics(ctx, "merchant_001", "corporate", "account_001", time.Millisecond*500, true, "")

	// 测试记录通知指标
	monitoringIntegration.RecordNotificationMetrics(ctx, "order_created", "email", "success")

	// 这些测试主要验证方法调用不会出错
	// 实际的指标验证需要集成Prometheus测试环境
}

// BenchmarkMetricsCollector_CollectBusinessMetrics 基准测试指标收集性能
func BenchmarkMetricsCollector_CollectBusinessMetrics(b *testing.B) {
	// 设置测试数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		b.Fatal(err)
	}

	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建仓储管理器
	repositoryManager := repository.NewManager(db)

	// 创建指标收集器
	metricsCollector := NewMetricsCollector(
		repositoryManager.MerchantRepository(),
		repositoryManager.MerchantReceiveAccountRepository(),
		repositoryManager.RechargeOrderRepository(),
		repositoryManager.ReceiveAccountRepository(),
		structuredLogger,
	)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := metricsCollector.CollectBusinessMetrics(ctx)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// TestAlertManager_CooldownPeriod 测试告警冷却期
func TestAlertManager_CooldownPeriod(t *testing.T) {
	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建模拟通知服务
	mockNotificationService := &MockNotificationService{}
	mockNotificationService.On("SendNotification", mock.Anything, mock.Anything).Return(nil)

	// 创建告警管理器
	alertManager := NewAlertManager(structuredLogger, mockNotificationService)

	ctx := context.Background()

	// 创建测试告警规则
	testRule := &AlertRule{
		Name:           "test_cooldown_rule",
		Condition:      func(ctx context.Context) (bool, *Alert) {
			return true, &Alert{
				ID:        "test_cooldown_alert",
				Level:     AlertLevelWarning,
				Title:     "Test Cooldown Alert",
				Message:   "Testing cooldown period",
				Component: "test",
				Timestamp: time.Now(),
			}
		},
		Interval:       time.Second,
		Enabled:        true,
		CooldownPeriod: time.Second * 5,
	}

	// 第一次检查应该触发告警
	alertManager.checkRule(ctx, testRule)
	assert.True(t, !testRule.LastTriggered.IsZero())

	firstTriggerTime := testRule.LastTriggered

	// 立即再次检查，应该因为冷却期而不触发
	alertManager.checkRule(ctx, testRule)
	assert.Equal(t, testRule.LastTriggered, firstTriggerTime)

	// 等待冷却期结束后再次检查
	time.Sleep(time.Second * 6)
	alertManager.checkRule(ctx, testRule)
	assert.True(t, testRule.LastTriggered.After(firstTriggerTime))
}

// TestMonitoringIntegration_GetMetricsSummary 测试指标摘要获取
func TestMonitoringIntegration_GetMetricsSummary(t *testing.T) {
	// 设置测试数据库
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 设置测试Redis客户端
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   1,
	})

	// 创建结构化日志记录器
	structuredLogger := logger.NewStructuredLogger("test-service", "1.0.0")

	// 创建模拟通知服务
	mockNotificationService := &MockNotificationService{}

	// 创建仓储管理器
	repositoryManager := repository.NewManager(db)

	// 创建监控集成服务
	monitoringIntegration := NewMonitoringIntegration(
		db,
		redisClient,
		structuredLogger,
		repositoryManager,
		mockNotificationService,
	)

	ctx := context.Background()

	// 获取指标摘要
	summary := monitoringIntegration.getMetricsSummary(ctx)

	assert.NotNil(t, summary)
	assert.Contains(t, summary, "orders")
	assert.Contains(t, summary, "accounts")
	assert.Contains(t, summary, "merchants")
	assert.Contains(t, summary, "system")

	// 验证订单指标结构
	orders, ok := summary["orders"].(map[string]interface{})
	assert.True(t, ok)
	assert.Contains(t, orders, "total_today")
	assert.Contains(t, orders, "success_rate")
	assert.Contains(t, orders, "total_amount")
}
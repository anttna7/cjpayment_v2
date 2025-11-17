# 错误处理和异常恢复系统

## 概述

充值测试系统的错误处理和异常恢复系统提供了全面的错误管理、自动恢复、数据一致性检查和告警通知功能。该系统确保系统在遇到各种异常情况时能够快速响应、自动恢复并及时通知相关人员。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    错误处理系统架构                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 错误中间件   │  │ 错误分类器   │  │ 错误统计器   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│           │              │              │                  │
│           └──────────────┼──────────────┘                  │
│                          │                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              错误处理服务                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │ 告警管理器   │  │ 恢复管理器   │  │ 一致性检查器 │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│           │              │              │                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 邮件通知     │  │ 健康检查     │  │ 数据修复     │         │
│  │ Webhook通知  │  │ 自动重启     │  │ 约束检查     │         │
│  │ Slack通知    │  │ 连接恢复     │  │ 关系验证     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 错误分类和编码体系

系统采用分层的错误编码体系，便于错误识别和处理：

```go
// 错误代码分类
1000-1999: 系统错误 (数据库连接、Redis连接、配置错误等)
2000-2999: 认证授权错误 (未授权、权限不足、令牌过期等)
3000-3999: 商户相关错误 (商户不存在、商户停用等)
4000-4999: 账号相关错误 (账号不存在、限额超出等)
5000-5999: 订单相关错误 (订单不存在、状态无效等)
6000-6999: 支付相关错误 (支付失败、金额不匹配等)
7000-7999: 验证错误 (数据格式错误、必填字段缺失等)
8000-8999: 业务逻辑错误 (业务规则违反、并发冲突等)
9000-9999: 外部服务错误 (网络超时、第三方服务异常等)
```

### 2. 统一错误处理中间件

错误处理中间件提供以下功能：

- **Panic恢复**: 捕获并处理系统panic，防止服务崩溃
- **错误转换**: 将通用错误转换为结构化的API错误
- **请求追踪**: 为每个请求分配唯一ID，便于问题追踪
- **错误日志**: 记录详细的错误信息和上下文
- **指标收集**: 收集错误相关的监控指标

```go
// 使用示例
router.Use(middleware.RequestIDMiddleware())
router.Use(middleware.ErrorHandler(&middleware.ErrorHandlerConfig{
    EnableStackTrace: false,
    EnableRecovery:   true,
    EnableMetrics:    true,
    Logger:          logger,
    AlertManager:    alertManager,
}))
```

### 3. 自动恢复机制

恢复管理器提供多种自动恢复策略：

#### 健康检查
- **数据库健康检查**: 检查数据库连接状态
- **Redis健康检查**: 检查缓存服务状态
- **内存健康检查**: 监控内存使用情况
- **磁盘空间检查**: 监控磁盘使用情况

#### 恢复策略
- **连接重置**: 重新建立数据库和Redis连接
- **内存清理**: 触发垃圾回收释放内存
- **临时文件清理**: 清理临时文件释放磁盘空间
- **服务重启**: 在必要时重启相关服务

```go
// 注册自定义健康检查
recoveryManager.RegisterHealthCheck(recovery.HealthCheck{
    Name:    "custom_service",
    Enabled: true,
    MaxFails: 3,
    CheckFunc: func(ctx context.Context) error {
        // 健康检查逻辑
        return checkServiceHealth()
    },
    RecoverFunc: func(ctx context.Context) error {
        // 恢复逻辑
        return recoverService()
    },
})
```

### 4. 数据一致性检查和修复

一致性检查器定期检查数据完整性并自动修复问题：

#### 检查项目
- **商户账号绑定一致性**: 检查商户与收款账号的绑定关系
- **订单账号一致性**: 验证订单与收款账号的关联关系
- **订单状态一致性**: 检查订单状态转换的合法性
- **账号限额一致性**: 验证账号使用量与限额的一致性

#### 修复功能
- **孤立记录清理**: 删除无效的关联记录
- **状态重置**: 修复无效的状态值
- **引用修复**: 修正错误的外键引用

```go
// 运行一致性检查
results, err := consistencyChecker.RunAllChecks(ctx)
for _, result := range results {
    if result.Status != "pass" {
        log.Printf("一致性检查失败: %s, 问题数量: %d", 
                  result.CheckName, len(result.Issues))
    }
}
```

### 5. 告警和通知机制

告警管理器支持多种通知渠道和灵活的规则配置：

#### 通知渠道
- **邮件通知**: 用于重要错误和日报
- **Webhook通知**: 集成第三方系统
- **Slack通知**: 实时团队协作

#### 告警规则
- **条件匹配**: 基于错误级别、来源、类别等条件
- **频率控制**: 防止告警风暴
- **批量处理**: 提高通知效率

```go
// 添加自定义告警规则
alertManager.AddRule(alerts.AlertRule{
    Name: "payment_failures",
    Conditions: []alerts.AlertCondition{
        {Field: "category", Operator: "eq", Value: "payment"},
        {Field: "level", Operator: "eq", Value: "high"},
    },
    Channels: []string{"email", "slack"},
    Throttle: 5 * time.Minute,
    Enabled:  true,
})
```

## 配置说明

### 基础配置

```yaml
error_handling:
  enable_recovery: true          # 启用自动恢复
  enable_consistency_check: true # 启用一致性检查
  enable_alerts: true           # 启用告警
  error_stats_window: "1h"      # 错误统计窗口
  max_error_rate: 0.1          # 最大错误率阈值
  circuit_breaker_threshold: 10 # 熔断器阈值
```

### 告警配置

```yaml
alerts:
  enable_alerts: true
  buffer_size: 1000      # 告警缓冲区大小
  batch_size: 10         # 批处理大小
  flush_interval: "5s"   # 刷新间隔
  retry_attempts: 3      # 重试次数
```

### 恢复配置

```yaml
recovery:
  check_interval: "30s"        # 健康检查间隔
  max_retry_attempts: 3        # 最大重试次数
  retry_backoff: "5s"         # 重试退避时间
  enable_auto_restart: true    # 启用自动重启
```

## 使用指南

### 1. 初始化错误处理服务

```go
// 创建错误处理服务
errorService := service.NewErrorHandlingService(db, logger, &service.ErrorHandlingConfig{
    EnableRecovery:         true,
    EnableConsistencyCheck: true,
    EnableAlerts:          true,
    ErrorStatsWindow:      time.Hour,
    MaxErrorRate:          0.1,
})

// 启动服务
ctx := context.Background()
err := errorService.Start(ctx)
if err != nil {
    log.Fatal("Failed to start error handling service:", err)
}
defer errorService.Stop()
```

### 2. 处理业务错误

```go
// 在业务逻辑中处理错误
func (s *MerchantService) CreateMerchant(req *CreateMerchantRequest) (*Merchant, error) {
    // 业务逻辑
    if err := s.validateMerchant(req); err != nil {
        // 返回结构化错误
        return nil, errors.NewAPIError(errors.ErrMerchantValidation, "商户信息验证失败")
    }
    
    merchant, err := s.repo.Create(req)
    if err != nil {
        // 让错误处理服务处理错误
        apiErr := s.errorService.HandleError(context.Background(), err, "merchant_service")
        return nil, apiErr
    }
    
    return merchant, nil
}
```

### 3. 自定义健康检查

```go
// 注册自定义健康检查
func registerCustomHealthChecks(recoveryManager *recovery.RecoveryManager) {
    // 外部API健康检查
    recoveryManager.RegisterHealthCheck(recovery.HealthCheck{
        Name:    "external_api",
        Enabled: true,
        MaxFails: 3,
        CheckFunc: func(ctx context.Context) error {
            resp, err := http.Get("https://api.example.com/health")
            if err != nil {
                return err
            }
            defer resp.Body.Close()
            
            if resp.StatusCode != http.StatusOK {
                return fmt.Errorf("API returned status %d", resp.StatusCode)
            }
            return nil
        },
        RecoverFunc: func(ctx context.Context) error {
            // 重置连接池或其他恢复操作
            return resetAPIConnection()
        },
    })
}
```

### 4. 自定义一致性检查

```go
// 添加自定义一致性检查
func addCustomConsistencyCheck(checker *consistency.ConsistencyChecker) {
    checker.RegisterCheck(consistency.ConsistencyCheck{
        Name:        "custom_business_rule",
        Description: "检查自定义业务规则",
        Enabled:     true,
        CheckFunc: func(ctx context.Context) (*consistency.ConsistencyResult, error) {
            // 实现检查逻辑
            result := &consistency.ConsistencyResult{
                CheckName: "custom_business_rule",
                Status:    "pass",
                Issues:    make([]consistency.ConsistencyIssue, 0),
            }
            
            // 执行检查
            if violations := checkBusinessRules(); len(violations) > 0 {
                result.Status = "fail"
                for _, violation := range violations {
                    result.Issues = append(result.Issues, consistency.ConsistencyIssue{
                        Type:        "business_rule_violation",
                        Severity:    "high",
                        Description: violation.Description,
                        Repairable:  violation.CanRepair,
                    })
                }
            }
            
            return result, nil
        },
        RepairFunc: func(ctx context.Context, issues []consistency.ConsistencyIssue) error {
            // 实现修复逻辑
            return repairBusinessRuleViolations(issues)
        },
    })
}
```

## 监控和指标

### 错误指标

系统自动收集以下错误相关指标：

- `error_count_total`: 错误总数（按错误代码、严重程度、来源分类）
- `error_rate`: 当前错误率
- `recovery_attempts_total`: 恢复尝试总数
- `consistency_check_failures`: 一致性检查失败次数
- `alert_sent_total`: 发送的告警总数

### 健康检查指标

- `health_check_failures`: 健康检查失败次数
- `health_check_duration`: 健康检查耗时
- `recovery_success_rate`: 恢复成功率

### Prometheus集成

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'recharge-system-errors'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## 最佳实践

### 1. 错误处理

- **使用结构化错误**: 始终使用APIError而不是通用error
- **提供上下文信息**: 在错误中包含足够的上下文信息
- **避免敏感信息**: 不要在错误消息中暴露敏感数据
- **合理的错误级别**: 根据错误的影响程度设置合适的严重级别

### 2. 告警配置

- **避免告警风暴**: 合理设置告警频率限制
- **分级告警**: 不同级别的错误使用不同的通知渠道
- **告警聚合**: 对相似的错误进行聚合处理
- **及时响应**: 建立告警响应流程

### 3. 恢复策略

- **渐进式恢复**: 从简单到复杂的恢复策略
- **避免无限重试**: 设置合理的重试次数和退避时间
- **状态检查**: 恢复后验证系统状态
- **人工干预**: 对于复杂问题，及时转为人工处理

### 4. 一致性检查

- **定期检查**: 设置合理的检查频率
- **优先级排序**: 按照数据重要性排序检查项目
- **谨慎修复**: 在生产环境中谨慎使用自动修复
- **备份验证**: 修复前备份相关数据

## 故障排查

### 常见问题

1. **告警未发送**
   - 检查告警规则配置
   - 验证通知渠道设置
   - 查看告警管理器日志

2. **恢复失败**
   - 检查健康检查配置
   - 验证恢复函数逻辑
   - 查看恢复管理器日志

3. **一致性检查失败**
   - 检查数据库连接
   - 验证检查逻辑
   - 查看一致性检查器日志

### 日志分析

```bash
# 查看错误处理相关日志
grep "error_handling" /var/log/recharge-system.log

# 查看告警日志
grep "alert" /var/log/recharge-system.log

# 查看恢复日志
grep "recovery" /var/log/recharge-system.log
```

### 性能调优

- **调整缓冲区大小**: 根据错误频率调整告警缓冲区
- **优化检查频率**: 平衡检查频率和系统性能
- **批量处理**: 使用批量处理提高效率
- **异步处理**: 使用异步处理避免阻塞主流程

## 总结

错误处理和异常恢复系统为充值测试系统提供了全面的错误管理能力，通过统一的错误处理、自动恢复机制、数据一致性检查和智能告警，确保系统的稳定性和可靠性。合理配置和使用这些功能，可以大大提高系统的可用性和运维效率。
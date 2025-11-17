# 充值测试系统数据迁移和系统切换方案

## 概述

本文档详细描述了充值测试系统的数据迁移策略、系统切换方案、风险控制措施和应急预案。

## 迁移策略

### 迁移目标

1. **零数据丢失**: 确保所有业务数据完整迁移
2. **最小停机时间**: 控制业务中断时间在2小时内
3. **平滑切换**: 用户无感知或最小感知的系统切换
4. **可回滚**: 出现问题时能够快速回滚到原系统

### 迁移范围

#### 数据迁移范围
- **用户数据**: 用户账号、角色权限
- **商户数据**: 商户信息、联系方式、业务配置
- **账号数据**: 收款账号信息、绑定关系、限额配置
- **订单数据**: 历史订单、状态记录、付款凭证
- **系统配置**: 系统参数、通知模板、业务规则
- **日志数据**: 操作日志、审计记录（可选）

#### 不迁移数据
- **临时文件**: 缓存文件、临时上传文件
- **过期数据**: 超过保留期的日志数据
- **测试数据**: 开发和测试环境的数据

## 迁移计划

### 阶段一：准备阶段（迁移前2周）

#### 1.1 环境准备
```bash
# 1. 部署新系统环境
docker-compose -f docker-compose.production.yml up -d

# 2. 验证系统功能
./scripts/system-health-check.sh

# 3. 性能基准测试
./scripts/performance-benchmark.sh

# 4. 安全扫描
./scripts/security-scan.sh
```

#### 1.2 数据分析
```sql
-- 分析源数据库结构
SELECT 
    table_name,
    table_rows,
    data_length,
    index_length
FROM information_schema.tables 
WHERE table_schema = 'old_system';

-- 统计关键数据量
SELECT 
    'merchants' as table_name, COUNT(*) as count FROM merchants
UNION ALL
SELECT 'orders' as table_name, COUNT(*) as count FROM orders
UNION ALL
SELECT 'accounts' as table_name, COUNT(*) as count FROM accounts;
```

#### 1.3 迁移脚本开发
```go
// migration/main.go
package main

import (
    "database/sql"
    "log"
    "time"
)

type MigrationManager struct {
    sourceDB *sql.DB
    targetDB *sql.DB
    logger   *log.Logger
}

func (m *MigrationManager) MigrateMerchants() error {
    // 商户数据迁移逻辑
    query := `
        SELECT id, name, contact_name, contact_phone, 
               email, business_type, status, created_at
        FROM old_merchants 
        WHERE status != 'deleted'
    `
    
    rows, err := m.sourceDB.Query(query)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    for rows.Next() {
        var merchant Merchant
        err := rows.Scan(&merchant.ID, &merchant.Name, 
                        &merchant.ContactName, &merchant.ContactPhone,
                        &merchant.Email, &merchant.BusinessType,
                        &merchant.Status, &merchant.CreatedAt)
        if err != nil {
            m.logger.Printf("Error scanning merchant: %v", err)
            continue
        }
        
        err = m.insertMerchant(merchant)
        if err != nil {
            m.logger.Printf("Error inserting merchant %d: %v", 
                           merchant.ID, err)
            return err
        }
    }
    
    return nil
}
```

### 阶段二：数据迁移阶段（迁移前1周）

#### 2.1 全量数据迁移
```bash
#!/bin/bash
# scripts/full-migration.sh

echo "开始全量数据迁移..."

# 1. 导出源数据
echo "导出源数据..."
mysqldump -h old-db-host -u user -p old_database > old_data_backup.sql

# 2. 数据清洗和转换
echo "数据清洗和转换..."
./migration/data-transformer old_data_backup.sql > cleaned_data.sql

# 3. 导入新系统
echo "导入新系统..."
mysql -h new-db-host -u user -p new_database < cleaned_data.sql

# 4. 数据验证
echo "数据验证..."
./migration/data-validator

echo "全量数据迁移完成"
```

#### 2.2 数据验证
```go
// migration/validator.go
package main

type DataValidator struct {
    sourceDB *sql.DB
    targetDB *sql.DB
}

func (v *DataValidator) ValidateDataIntegrity() error {
    // 验证数据完整性
    tables := []string{"merchants", "accounts", "orders", "users"}
    
    for _, table := range tables {
        sourceCount, err := v.getTableCount(v.sourceDB, table)
        if err != nil {
            return err
        }
        
        targetCount, err := v.getTableCount(v.targetDB, table)
        if err != nil {
            return err
        }
        
        if sourceCount != targetCount {
            return fmt.Errorf("数据不一致: %s 表源数据 %d 条，目标数据 %d 条", 
                            table, sourceCount, targetCount)
        }
        
        log.Printf("✓ %s 表数据验证通过: %d 条记录", table, sourceCount)
    }
    
    return nil
}

func (v *DataValidator) ValidateBusinessLogic() error {
    // 验证业务逻辑
    
    // 1. 验证商户账号绑定关系
    query := `
        SELECT m.id, m.name, COUNT(ma.id) as account_count
        FROM merchants m
        LEFT JOIN merchant_accounts ma ON m.id = ma.merchant_id
        GROUP BY m.id, m.name
        HAVING account_count = 0
    `
    
    rows, err := v.targetDB.Query(query)
    if err != nil {
        return err
    }
    defer rows.Close()
    
    var unboundMerchants []string
    for rows.Next() {
        var id int
        var name string
        var count int
        rows.Scan(&id, &name, &count)
        unboundMerchants = append(unboundMerchants, 
                                 fmt.Sprintf("%s(ID:%d)", name, id))
    }
    
    if len(unboundMerchants) > 0 {
        log.Printf("警告: 以下商户没有绑定收款账号: %v", unboundMerchants)
    }
    
    return nil
}
```

### 阶段三：增量同步阶段（迁移前3天）

#### 3.1 增量数据同步
```bash
#!/bin/bash
# scripts/incremental-sync.sh

LAST_SYNC_TIME=$(cat /tmp/last_sync_time 2>/dev/null || echo "2024-01-01 00:00:00")
CURRENT_TIME=$(date "+%Y-%m-%d %H:%M:%S")

echo "开始增量同步，上次同步时间: $LAST_SYNC_TIME"

# 同步新增/修改的商户
mysql -h old-db-host -u user -p -e "
    SELECT * FROM merchants 
    WHERE updated_at > '$LAST_SYNC_TIME'
" old_database | ./migration/sync-merchants

# 同步新增/修改的订单
mysql -h old-db-host -u user -p -e "
    SELECT * FROM orders 
    WHERE updated_at > '$LAST_SYNC_TIME'
" old_database | ./migration/sync-orders

# 更新同步时间
echo "$CURRENT_TIME" > /tmp/last_sync_time

echo "增量同步完成"
```

#### 3.2 实时同步监控
```go
// migration/sync-monitor.go
package main

import (
    "time"
    "log"
)

type SyncMonitor struct {
    sourceDB *sql.DB
    targetDB *sql.DB
    interval time.Duration
}

func (s *SyncMonitor) StartMonitoring() {
    ticker := time.NewTicker(s.interval)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            err := s.checkSyncStatus()
            if err != nil {
                log.Printf("同步状态检查失败: %v", err)
                // 发送告警通知
                s.sendAlert(err)
            }
        }
    }
}

func (s *SyncMonitor) checkSyncStatus() error {
    // 检查数据同步延迟
    var sourceMaxTime, targetMaxTime time.Time
    
    err := s.sourceDB.QueryRow("SELECT MAX(updated_at) FROM orders").
           Scan(&sourceMaxTime)
    if err != nil {
        return err
    }
    
    err = s.targetDB.QueryRow("SELECT MAX(updated_at) FROM orders").
           Scan(&targetMaxTime)
    if err != nil {
        return err
    }
    
    delay := sourceMaxTime.Sub(targetMaxTime)
    if delay > 5*time.Minute {
        return fmt.Errorf("数据同步延迟 %v", delay)
    }
    
    return nil
}
```

### 阶段四：系统切换阶段（迁移当天）

#### 4.1 切换前检查
```bash
#!/bin/bash
# scripts/pre-switch-check.sh

echo "执行切换前检查..."

# 1. 系统健康检查
./scripts/health-check.sh || exit 1

# 2. 数据一致性检查
./migration/data-validator || exit 1

# 3. 性能测试
./scripts/performance-test.sh || exit 1

# 4. 备份当前数据
./scripts/backup-current-data.sh || exit 1

echo "切换前检查通过"
```

#### 4.2 系统切换流程
```bash
#!/bin/bash
# scripts/system-switch.sh

echo "开始系统切换..."

# 1. 发送维护通知
curl -X POST "https://notification-service/api/maintenance" \
     -d '{"message": "系统维护中，预计2小时", "type": "maintenance"}'

# 2. 停止旧系统写入
echo "停止旧系统写入..."
mysql -h old-db-host -u user -p -e "
    UPDATE system_config SET maintenance_mode = 1;
    FLUSH TABLES WITH READ LOCK;
" old_database

# 3. 最后一次增量同步
echo "执行最后一次增量同步..."
./scripts/final-incremental-sync.sh

# 4. 切换DNS/负载均衡
echo "切换流量到新系统..."
./scripts/switch-traffic.sh

# 5. 启动新系统
echo "启动新系统..."
systemctl start recharge-system

# 6. 验证新系统
echo "验证新系统..."
./scripts/post-switch-validation.sh

# 7. 发送完成通知
curl -X POST "https://notification-service/api/maintenance" \
     -d '{"message": "系统维护完成，服务已恢复", "type": "completed"}'

echo "系统切换完成"
```

#### 4.3 切换后验证
```bash
#!/bin/bash
# scripts/post-switch-validation.sh

echo "执行切换后验证..."

# 1. 基础功能测试
echo "测试基础功能..."
curl -f http://localhost:8080/health || exit 1
curl -f http://localhost:8080/api/merchants || exit 1

# 2. 业务流程测试
echo "测试业务流程..."
./tests/integration/business-flow-test.sh || exit 1

# 3. 性能测试
echo "执行性能测试..."
./scripts/performance-validation.sh || exit 1

# 4. 数据一致性验证
echo "验证数据一致性..."
./migration/post-migration-validator || exit 1

echo "切换后验证通过"
```

## 风险控制

### 风险识别

| 风险类型 | 风险描述 | 影响程度 | 发生概率 | 应对措施 |
|----------|----------|----------|----------|----------|
| 数据丢失 | 迁移过程中数据丢失 | 高 | 低 | 多重备份、分阶段验证 |
| 系统故障 | 新系统启动失败 | 高 | 中 | 充分测试、快速回滚 |
| 性能问题 | 新系统性能不达标 | 中 | 中 | 性能调优、资源扩容 |
| 业务中断 | 切换时间过长 | 中 | 低 | 精确时间控制、并行操作 |
| 用户体验 | 用户操作习惯改变 | 低 | 高 | 用户培训、界面优化 |

### 风险缓解措施

#### 1. 数据安全保障
```bash
# 多重备份策略
#!/bin/bash

# 本地备份
mysqldump --single-transaction --routines --triggers \
          old_database > backup_local_$(date +%Y%m%d_%H%M%S).sql

# 远程备份
rsync -av backup_local_*.sql backup-server:/backups/

# 云存储备份
aws s3 cp backup_local_*.sql s3://backup-bucket/migration/

# 验证备份完整性
mysql test_db < backup_local_*.sql
```

#### 2. 系统监控
```go
// monitoring/migration-monitor.go
package main

type MigrationMonitor struct {
    metrics map[string]interface{}
    alerts  []Alert
}

func (m *MigrationMonitor) MonitorMigration() {
    // 监控关键指标
    m.metrics["data_sync_delay"] = m.getDataSyncDelay()
    m.metrics["system_performance"] = m.getSystemPerformance()
    m.metrics["error_rate"] = m.getErrorRate()
    
    // 检查告警条件
    if m.metrics["data_sync_delay"].(time.Duration) > 10*time.Minute {
        m.alerts = append(m.alerts, Alert{
            Type:    "data_sync_delay",
            Message: "数据同步延迟超过10分钟",
            Level:   "critical",
        })
    }
    
    // 发送告警
    for _, alert := range m.alerts {
        m.sendAlert(alert)
    }
}
```

#### 3. 回滚机制
```bash
#!/bin/bash
# scripts/rollback.sh

echo "开始系统回滚..."

# 1. 停止新系统
systemctl stop recharge-system

# 2. 切换流量回旧系统
./scripts/switch-traffic-back.sh

# 3. 恢复旧系统写入
mysql -h old-db-host -u user -p -e "
    UPDATE system_config SET maintenance_mode = 0;
    UNLOCK TABLES;
" old_database

# 4. 验证旧系统
./scripts/validate-old-system.sh

# 5. 通知相关人员
./scripts/notify-rollback.sh

echo "系统回滚完成"
```

## 应急预案

### 应急响应流程

#### 1. 问题分类
- **P0 - 紧急**: 系统完全不可用，数据丢失
- **P1 - 高优先级**: 核心功能异常，影响业务
- **P2 - 中优先级**: 部分功能异常，用户体验差
- **P3 - 低优先级**: 非核心功能问题，不影响业务

#### 2. 应急联系人
```yaml
emergency_contacts:
  technical_lead:
    name: "技术负责人"
    phone: "+86-138-xxxx-xxxx"
    email: "tech-lead@example.com"
    
  dba:
    name: "数据库管理员"
    phone: "+86-139-xxxx-xxxx"
    email: "dba@example.com"
    
  ops_manager:
    name: "运维经理"
    phone: "+86-137-xxxx-xxxx"
    email: "ops@example.com"
    
  business_owner:
    name: "业务负责人"
    phone: "+86-136-xxxx-xxxx"
    email: "business@example.com"
```

#### 3. 应急处理步骤

**P0级别问题处理**：
```bash
#!/bin/bash
# emergency/p0-response.sh

echo "P0级别问题应急响应"

# 1. 立即通知所有相关人员
./scripts/notify-emergency.sh "P0" "$1"

# 2. 评估问题影响范围
./scripts/assess-impact.sh

# 3. 决定是否回滚
read -p "是否需要立即回滚? (y/n): " rollback
if [ "$rollback" = "y" ]; then
    ./scripts/emergency-rollback.sh
fi

# 4. 启动应急处理
./scripts/emergency-fix.sh "$1"

# 5. 持续监控
./scripts/continuous-monitor.sh
```

### 数据恢复方案

#### 1. 数据库恢复
```bash
#!/bin/bash
# recovery/database-recovery.sh

BACKUP_FILE=$1
RECOVERY_POINT=$2

echo "开始数据库恢复..."

# 1. 停止应用服务
systemctl stop recharge-system

# 2. 备份当前数据
mysqldump recharge_system > current_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 恢复数据
mysql recharge_system < $BACKUP_FILE

# 4. 验证数据完整性
./scripts/validate-data-integrity.sh

# 5. 重启服务
systemctl start recharge-system

echo "数据库恢复完成"
```

#### 2. 文件恢复
```bash
#!/bin/bash
# recovery/file-recovery.sh

BACKUP_PATH=$1
TARGET_PATH=$2

echo "开始文件恢复..."

# 1. 备份当前文件
tar -czf current_files_backup_$(date +%Y%m%d_%H%M%S).tar.gz $TARGET_PATH

# 2. 恢复文件
rsync -av $BACKUP_PATH/ $TARGET_PATH/

# 3. 设置权限
chown -R recharge:recharge $TARGET_PATH
chmod -R 755 $TARGET_PATH

echo "文件恢复完成"
```

## 测试计划

### 迁移测试

#### 1. 单元测试
```go
// tests/migration_test.go
package tests

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestMerchantMigration(t *testing.T) {
    // 测试商户数据迁移
    migrator := NewMigrator(sourceDB, targetDB)
    
    err := migrator.MigrateMerchants()
    assert.NoError(t, err)
    
    // 验证数据完整性
    sourceCount := getTableCount(sourceDB, "merchants")
    targetCount := getTableCount(targetDB, "merchants")
    assert.Equal(t, sourceCount, targetCount)
}

func TestDataIntegrity(t *testing.T) {
    // 测试数据完整性
    validator := NewDataValidator(sourceDB, targetDB)
    
    err := validator.ValidateDataIntegrity()
    assert.NoError(t, err)
}
```

#### 2. 集成测试
```bash
#!/bin/bash
# tests/integration-test.sh

echo "执行集成测试..."

# 1. 端到端业务流程测试
./tests/e2e/recharge-flow-test.sh

# 2. API接口测试
./tests/api/api-test.sh

# 3. 性能测试
./tests/performance/load-test.sh

# 4. 安全测试
./tests/security/security-test.sh

echo "集成测试完成"
```

#### 3. 用户验收测试
```markdown
# 用户验收测试清单

## 基础功能测试
- [ ] 用户登录功能
- [ ] 商户管理功能
- [ ] 收款账号管理
- [ ] 充值流程测试
- [ ] 订单管理功能
- [ ] 数据导出功能

## 性能测试
- [ ] 页面加载速度 < 3秒
- [ ] API响应时间 < 1秒
- [ ] 并发用户支持 > 100

## 兼容性测试
- [ ] Chrome浏览器
- [ ] Firefox浏览器
- [ ] Safari浏览器
- [ ] 移动端浏览器

## 安全测试
- [ ] 登录安全验证
- [ ] 数据传输加密
- [ ] 权限控制验证
```

## 上线计划

### 上线时间安排

```
迁移时间表:
├── T-14天: 环境准备和脚本开发
├── T-7天:  全量数据迁移和验证
├── T-3天:  增量同步开始
├── T-1天:  最终测试和准备
├── T-Day:  系统切换
│   ├── 02:00 - 停止旧系统写入
│   ├── 02:30 - 最后增量同步
│   ├── 03:00 - 切换流量
│   ├── 03:30 - 验证新系统
│   └── 04:00 - 完成切换
└── T+1天:  监控和优化
```

### 上线检查清单

#### 技术检查
```
□ 新系统部署完成
□ 数据迁移验证通过
□ 性能测试达标
□ 安全扫描通过
□ 备份策略就绪
□ 监控告警配置
□ 回滚方案准备
□ 应急联系人确认
```

#### 业务检查
```
□ 用户通知发送
□ 客服团队培训
□ 操作手册更新
□ 业务流程确认
□ 数据导出验证
□ 报表功能测试
□ 第三方集成测试
□ 用户反馈渠道准备
```

### 上线后监控

#### 1. 关键指标监控
```yaml
monitoring_metrics:
  system_health:
    - cpu_usage < 80%
    - memory_usage < 85%
    - disk_usage < 90%
    
  application_metrics:
    - response_time < 1s
    - error_rate < 1%
    - throughput > baseline
    
  business_metrics:
    - order_success_rate > 95%
    - user_satisfaction > 4.0
    - system_availability > 99.9%
```

#### 2. 告警配置
```yaml
alerts:
  critical:
    - system_down
    - data_corruption
    - security_breach
    
  warning:
    - high_response_time
    - increased_error_rate
    - resource_usage_high
    
  info:
    - deployment_completed
    - backup_completed
    - maintenance_scheduled
```

## 总结

本数据迁移和系统切换方案涵盖了从准备到上线的完整流程，包括：

1. **全面的风险评估和控制措施**
2. **详细的迁移步骤和验证方法**
3. **完善的应急预案和回滚机制**
4. **充分的测试计划和验收标准**
5. **明确的上线时间表和检查清单**

通过严格执行本方案，可以确保系统迁移的成功和业务的连续性。

---

**文档版本**: v1.0  
**更新日期**: 2024-08-12  
**负责团队**: 系统迁移项目组
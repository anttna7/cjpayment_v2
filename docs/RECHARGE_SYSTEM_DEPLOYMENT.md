# 充值测试系统部署和运维文档

## 概述

本文档详细描述了充值测试系统的部署流程、配置要求、运维操作和故障排除方法。

## 系统架构

### 技术栈
- **后端**: Go 1.21+, Gin Framework, GORM
- **数据库**: MySQL 8.0+, Redis 6.0+
- **前端**: HTML5/CSS3/JavaScript, Bootstrap 5
- **部署**: Docker, Nginx, Systemd
- **监控**: Prometheus, Grafana, ELK Stack

### 服务组件
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  Recharge API   │    │   MySQL DB      │
│   (Port 80/443) │────│   (Port 8080)   │────│   (Port 3306)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Port 6379)   │
                       └─────────────────┘
```

## 环境要求

### 硬件要求
- **CPU**: 最低 2 核，推荐 4 核
- **内存**: 最低 4GB，推荐 8GB
- **存储**: 最低 50GB SSD，推荐 100GB
- **网络**: 100Mbps 带宽

### 软件要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.25+

## 部署流程

### 1. 环境准备

#### 1.1 安装 Docker 和 Docker Compose
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 1.2 创建系统用户
```bash
sudo useradd -m -s /bin/bash recharge
sudo usermod -aG docker recharge
sudo mkdir -p /opt/recharge-system
sudo chown recharge:recharge /opt/recharge-system
```

### 2. 代码部署

#### 2.1 克隆代码仓库
```bash
sudo -u recharge git clone <repository-url> /opt/recharge-system
cd /opt/recharge-system
```

#### 2.2 配置环境变量
```bash
# 复制环境配置文件
cp .env.recharge.production.example .env.recharge.production

# 编辑配置文件
vim .env.recharge.production
```

#### 2.3 配置文件说明
```bash
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_NAME=recharge_system
DB_USER=recharge_user
DB_PASSWORD=your_secure_password

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 应用配置
APP_ENV=production
APP_PORT=8080
JWT_SECRET=your_jwt_secret_key
UPLOAD_PATH=/app/uploads

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your_smtp_password
```

### 3. 数据库初始化

#### 3.1 启动数据库服务
```bash
docker-compose -f docker-compose.recharge.production.yml up -d mysql redis
```

#### 3.2 运行数据库迁移
```bash
# 等待数据库启动
sleep 30

# 运行迁移
docker-compose -f docker-compose.recharge.production.yml exec api ./migrate up
```

#### 3.3 创建管理员用户
```bash
docker-compose -f docker-compose.recharge.production.yml exec api ./create-admin \
  --username admin \
  --password your_admin_password \
  --email admin@example.com
```

### 4. 应用部署

#### 4.1 构建和启动服务
```bash
# 构建镜像
docker-compose -f docker-compose.recharge.production.yml build

# 启动所有服务
docker-compose -f docker-compose.recharge.production.yml up -d
```

#### 4.2 验证部署
```bash
# 检查服务状态
docker-compose -f docker-compose.recharge.production.yml ps

# 检查日志
docker-compose -f docker-compose.recharge.production.yml logs -f api

# 健康检查
curl http://localhost:8080/health
```

### 5. Nginx 配置

#### 5.1 安装 Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### 5.2 配置反向代理
```bash
sudo cp nginx/recharge.conf /etc/nginx/sites-available/recharge
sudo ln -s /etc/nginx/sites-available/recharge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL 证书配置

#### 6.1 使用 Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 6.2 自动续期
```bash
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## 系统配置

### 1. Systemd 服务配置

#### 1.1 创建服务文件
```bash
sudo cp configs/systemd/recharge-system.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable recharge-system
```

#### 1.2 服务管理命令
```bash
# 启动服务
sudo systemctl start recharge-system

# 停止服务
sudo systemctl stop recharge-system

# 重启服务
sudo systemctl restart recharge-system

# 查看状态
sudo systemctl status recharge-system

# 查看日志
sudo journalctl -u recharge-system -f
```

### 2. 日志配置

#### 2.1 日志轮转配置
```bash
sudo vim /etc/logrotate.d/recharge-system
```

```
/opt/recharge-system/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 recharge recharge
    postrotate
        systemctl reload recharge-system
    endscript
}
```

### 3. 监控配置

#### 3.1 Prometheus 配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'recharge-system'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

#### 3.2 Grafana 仪表板
- 导入预配置的仪表板: `configs/grafana-dashboard.json`
- 配置数据源指向 Prometheus
- 设置告警规则

## 运维操作

### 1. 日常维护

#### 1.1 系统健康检查
```bash
#!/bin/bash
# scripts/health-check.sh

# 检查服务状态
systemctl is-active recharge-system

# 检查数据库连接
docker-compose exec mysql mysqladmin ping

# 检查 Redis 连接
docker-compose exec redis redis-cli ping

# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 检查 API 响应
curl -f http://localhost:8080/health || echo "API health check failed"
```

#### 1.2 数据库维护
```bash
# 数据库备份
docker-compose exec mysql mysqldump -u root -p recharge_system > backup_$(date +%Y%m%d_%H%M%S).sql

# 数据库优化
docker-compose exec mysql mysql -u root -p -e "OPTIMIZE TABLE recharge_orders, merchants, receive_accounts;"

# 清理过期数据
docker-compose exec api ./cleanup-expired-data --days 90
```

#### 1.3 日志分析
```bash
# 查看错误日志
grep -i error /opt/recharge-system/logs/app.log | tail -100

# 分析访问模式
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -20

# 监控响应时间
tail -f /var/log/nginx/access.log | awk '{print $NF}' | grep -v '-'
```

### 2. 性能优化

#### 2.1 数据库优化
```sql
-- 添加索引
CREATE INDEX idx_recharge_orders_created_at ON recharge_orders(created_at);
CREATE INDEX idx_recharge_orders_status ON recharge_orders(status);

-- 分析查询性能
EXPLAIN SELECT * FROM recharge_orders WHERE created_at >= '2024-01-01';

-- 优化表
OPTIMIZE TABLE recharge_orders;
```

#### 2.2 缓存优化
```bash
# Redis 内存使用分析
docker-compose exec redis redis-cli info memory

# 清理过期缓存
docker-compose exec redis redis-cli FLUSHDB

# 设置缓存策略
docker-compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 3. 备份和恢复

#### 3.1 数据备份策略
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/backups/recharge-system"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 数据库备份
docker-compose exec mysql mysqldump -u root -p recharge_system > $BACKUP_DIR/db_$DATE.sql

# 文件备份
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /opt/recharge-system/uploads

# 配置备份
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/recharge-system/configs

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

#### 3.2 数据恢复
```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql>"
    exit 1
fi

# 停止应用服务
systemctl stop recharge-system

# 恢复数据库
docker-compose exec mysql mysql -u root -p recharge_system < $BACKUP_FILE

# 启动应用服务
systemctl start recharge-system
```

## 故障排除

### 1. 常见问题

#### 1.1 服务无法启动
```bash
# 检查端口占用
netstat -tlnp | grep :8080

# 检查配置文件
docker-compose config

# 查看详细错误
docker-compose logs api
```

#### 1.2 数据库连接失败
```bash
# 检查数据库状态
docker-compose ps mysql

# 测试连接
docker-compose exec mysql mysql -u root -p -e "SELECT 1"

# 检查网络
docker network ls
docker network inspect recharge-system_default
```

#### 1.3 内存不足
```bash
# 检查内存使用
free -h
docker stats

# 清理 Docker 资源
docker system prune -a

# 重启服务
systemctl restart recharge-system
```

### 2. 性能问题

#### 2.1 响应时间慢
```bash
# 检查数据库慢查询
docker-compose exec mysql mysql -u root -p -e "SHOW PROCESSLIST"

# 分析 Nginx 日志
tail -f /var/log/nginx/access.log | awk '{print $NF}' | sort -n

# 检查系统负载
top
htop
```

#### 2.2 内存泄漏
```bash
# 监控内存使用
watch -n 5 'docker stats --no-stream'

# 重启应用
docker-compose restart api
```

### 3. 安全问题

#### 3.1 异常访问
```bash
# 分析访问日志
grep -E "40[0-9]|50[0-9]" /var/log/nginx/access.log

# 检查失败登录
grep "authentication failed" /opt/recharge-system/logs/app.log

# 封禁恶意 IP
iptables -A INPUT -s <malicious_ip> -j DROP
```

#### 3.2 SSL 证书问题
```bash
# 检查证书状态
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout

# 手动续期
certbot renew --dry-run
```

## 监控和告警

### 1. 关键指标

#### 1.1 系统指标
- CPU 使用率 > 80%
- 内存使用率 > 85%
- 磁盘使用率 > 90%
- 网络延迟 > 100ms

#### 1.2 应用指标
- API 响应时间 > 2s
- 错误率 > 5%
- 数据库连接数 > 80%
- 充值订单处理失败率 > 1%

#### 1.3 业务指标
- 每小时充值订单数
- 平均充值金额
- 账号匹配成功率
- 用户活跃度

### 2. 告警配置

#### 2.1 Prometheus 告警规则
```yaml
groups:
  - name: recharge-system
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseConnectionHigh
        expr: mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection usage is high"
```

#### 2.2 告警通知
- **邮件通知**: 发送给运维团队
- **短信通知**: 紧急故障通知
- **钉钉/企业微信**: 实时状态更新
- **PagerDuty**: 值班人员通知

## 升级和维护

### 1. 版本升级

#### 1.1 升级前准备
```bash
# 备份数据
./scripts/backup.sh

# 检查系统状态
./scripts/health-check.sh

# 通知用户维护窗口
echo "System maintenance scheduled"
```

#### 1.2 升级流程
```bash
# 拉取新版本代码
git pull origin main

# 构建新镜像
docker-compose build

# 滚动更新
docker-compose up -d --no-deps api

# 运行数据库迁移
docker-compose exec api ./migrate up

# 验证升级
./scripts/health-check.sh
```

### 2. 维护计划

#### 2.1 日常维护（每日）
- 检查系统健康状态
- 监控关键指标
- 查看错误日志
- 备份重要数据

#### 2.2 周期维护（每周）
- 数据库性能优化
- 清理临时文件
- 更新安全补丁
- 分析性能报告

#### 2.3 定期维护（每月）
- 系统安全扫描
- 容量规划评估
- 备份策略验证
- 灾难恢复演练

## 联系信息

### 技术支持
- **运维团队**: ops@example.com
- **开发团队**: dev@example.com
- **紧急联系**: +86-xxx-xxxx-xxxx

### 文档更新
- **版本**: v1.0
- **更新日期**: 2024-08-12
- **维护人**: 系统运维团队
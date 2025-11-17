# CJPayment 部署和运维文档

## 概述

本文档详细介绍了CJPayment系统的部署方法、运维操作和故障排除指南。

## 系统要求

### 硬件要求

#### 最小配置
- CPU: 2核心
- 内存: 4GB
- 存储: 50GB SSD
- 网络: 100Mbps

#### 推荐配置
- CPU: 4核心
- 内存: 8GB
- 存储: 100GB SSD
- 网络: 1Gbps

#### 生产环境配置
- CPU: 8核心
- 内存: 16GB
- 存储: 200GB SSD (系统) + 500GB SSD (数据)
- 网络: 1Gbps

### 软件要求

- 操作系统: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- Docker: 20.10+
- Docker Compose: 2.0+
- PostgreSQL: 17+ (如果不使用容器)
- Redis: 7+ (如果不使用容器)

## 部署方式

### 1. Docker Compose 部署 (推荐)

#### 1.1 准备环境

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 1.2 克隆项目

```bash
git clone https://github.com/company/cjpayment.git
cd cjpayment
```

#### 1.3 配置环境变量

```bash
# 复制环境变量文件
cp .env.example .env.production

# 编辑配置文件
vim .env.production
```

关键配置项：
```bash
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=cjpayment
DB_USER=cjpayment
DB_PASSWORD=your_secure_password

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 应用配置
APP_ENV=production
APP_PORT=8080
APP_LOG_LEVEL=info

# 文件上传配置
UPLOAD_PATH=/app/uploads
MAX_UPLOAD_SIZE=10MB
```

#### 1.4 启动服务

```bash
# 构建并启动服务
docker-compose -f docker-compose.production.yml up -d

# 查看服务状态
docker-compose -f docker-compose.production.yml ps

# 查看日志
docker-compose -f docker-compose.production.yml logs -f
```

#### 1.5 初始化数据库

```bash
# 运行数据库迁移
docker-compose -f docker-compose.production.yml exec api go run cmd/migrate/main.go -direction=up

# 创建初始管理员用户
docker-compose -f docker-compose.production.yml exec api go run scripts/create-admin.go
```

### 2. 手动部署

#### 2.1 安装依赖

```bash
# 安装Go
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 安装PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 安装Redis
sudo apt install redis-server

# 安装Nginx (可选)
sudo apt install nginx
```

#### 2.2 配置数据库

```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE cjpayment;
CREATE USER cjpayment WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cjpayment TO cjpayment;
\q
```

#### 2.3 编译应用

```bash
# 克隆代码
git clone https://github.com/company/cjpayment.git
cd cjpayment

# 安装依赖
go mod download

# 编译应用
go build -o bin/cjpayment cmd/api/main.go
go build -o bin/migrate cmd/migrate/main.go

# 设置权限
chmod +x bin/cjpayment
chmod +x bin/migrate
```

#### 2.4 配置文件

```bash
# 复制配置文件
cp configs/config.yaml.example configs/config.production.yaml

# 编辑配置
vim configs/config.production.yaml
```

#### 2.5 创建系统服务

```bash
# 创建服务文件
sudo vim /etc/systemd/system/cjpayment.service
```

服务文件内容：
```ini
[Unit]
Description=CJPayment API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=cjpayment
Group=cjpayment
WorkingDirectory=/opt/cjpayment
ExecStart=/opt/cjpayment/bin/cjpayment
Restart=always
RestartSec=5
Environment=CONFIG_FILE=/opt/cjpayment/configs/config.production.yaml

[Install]
WantedBy=multi-user.target
```

```bash
# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable cjpayment
sudo systemctl start cjpayment

# 查看服务状态
sudo systemctl status cjpayment
```

## 环境配置

### 开发环境

```bash
# 启动开发环境
docker-compose -f docker-compose.development.yml up -d

# 或者本地运行
go run cmd/api/main.go
```

### 测试环境

```bash
# 启动测试环境
docker-compose -f docker-compose.testing.yml up -d

# 运行测试
make test
```

### 生产环境

```bash
# 启动生产环境
docker-compose -f docker-compose.production.yml up -d
```

## 负载均衡配置

### Nginx配置

```nginx
upstream cjpayment_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    server_name cjpayment.example.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cjpayment.example.com;
    
    # SSL配置
    ssl_certificate /etc/ssl/certs/cjpayment.crt;
    ssl_certificate_key /etc/ssl/private/cjpayment.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 静态文件
    location /static/ {
        alias /opt/cjpayment/web/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 文件上传
    location /uploads/ {
        alias /opt/cjpayment/uploads/;
        expires 1y;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://cjpayment_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://cjpayment_backend;
        access_log off;
    }
    
    # 默认路由
    location / {
        proxy_pass http://cjpayment_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 数据库管理

### 备份策略

#### 自动备份脚本

```bash
#!/bin/bash
# /opt/cjpayment/scripts/backup.sh

BACKUP_DIR="/opt/backups/cjpayment"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="cjpayment"
DB_USER="cjpayment"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 数据库备份
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/db_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

#### 设置定时任务

```bash
# 编辑crontab
crontab -e

# 添加定时任务（每天凌晨2点备份）
0 2 * * * /opt/cjpayment/scripts/backup.sh >> /var/log/cjpayment/backup.log 2>&1
```

### 数据库恢复

```bash
# 恢复数据库
gunzip -c /opt/backups/cjpayment/db_backup_20250101_020000.sql.gz | psql -h localhost -U cjpayment -d cjpayment
```

### 数据库迁移

```bash
# 查看当前迁移状态
./bin/migrate -database "postgres://user:pass@localhost/dbname?sslmode=disable" -path ./migrations version

# 执行迁移
./bin/migrate -database "postgres://user:pass@localhost/dbname?sslmode=disable" -path ./migrations up

# 回滚迁移
./bin/migrate -database "postgres://user:pass@localhost/dbname?sslmode=disable" -path ./migrations down 1
```

## 监控和日志

### 应用监控

系统集成了Prometheus监控，监控指标包括：

- HTTP请求数量和延迟
- 数据库连接池状态
- Redis连接状态
- 内存和CPU使用率
- 业务指标（充值成功率、订单数量等）

### 日志管理

#### 日志配置

```yaml
# configs/logging.yaml
logging:
  level: info
  format: json
  output: stdout
  file:
    enabled: true
    path: /var/log/cjpayment/app.log
    max_size: 100MB
    max_backups: 10
    max_age: 30
    compress: true
```

#### 日志轮转

```bash
# /etc/logrotate.d/cjpayment
/var/log/cjpayment/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 cjpayment cjpayment
    postrotate
        systemctl reload cjpayment
    endscript
}
```

### 告警配置

#### Prometheus告警规则

```yaml
# configs/alert_rules.yml
groups:
  - name: cjpayment
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"
      
      - alert: DatabaseConnectionFailed
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "PostgreSQL database is down"
      
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"
```

## 性能优化

### 数据库优化

```sql
-- 创建索引
CREATE INDEX CONCURRENTLY idx_recharge_orders_created_at ON recharge_orders(created_at);
CREATE INDEX CONCURRENTLY idx_recharge_orders_status ON recharge_orders(status);
CREATE INDEX CONCURRENTLY idx_recharge_orders_merchant_id ON recharge_orders(merchant_id);

-- 分析表统计信息
ANALYZE recharge_orders;
ANALYZE merchants;
ANALYZE receive_accounts;
```

### 缓存优化

```yaml
# Redis配置优化
redis:
  host: localhost
  port: 6379
  password: ""
  db: 0
  pool_size: 10
  min_idle_conns: 5
  max_conn_age: 30m
  pool_timeout: 4s
  idle_timeout: 5m
  idle_check_frequency: 1m
```

### 应用优化

```yaml
# 应用配置优化
server:
  read_timeout: 30s
  write_timeout: 30s
  idle_timeout: 120s
  max_header_bytes: 1048576

database:
  max_open_conns: 25
  max_idle_conns: 5
  conn_max_lifetime: 5m
```

## 安全配置

### 防火墙配置

```bash
# UFW配置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL证书配置

```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cjpayment.example.com
```

### 安全加固

```bash
# 禁用root登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 修改SSH端口
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# 重启SSH服务
sudo systemctl restart sshd

# 安装fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 故障排除

### 常见问题

#### 1. 应用无法启动

```bash
# 检查日志
docker-compose logs api
# 或
journalctl -u cjpayment -f

# 检查配置文件
go run cmd/api/main.go -config-check

# 检查端口占用
netstat -tlnp | grep 8080
```

#### 2. 数据库连接失败

```bash
# 检查数据库状态
sudo systemctl status postgresql

# 测试连接
psql -h localhost -U cjpayment -d cjpayment

# 检查配置
grep -A 10 "database:" configs/config.production.yaml
```

#### 3. Redis连接失败

```bash
# 检查Redis状态
sudo systemctl status redis

# 测试连接
redis-cli ping

# 检查配置
grep -A 10 "redis:" configs/config.production.yaml
```

#### 4. 内存不足

```bash
# 检查内存使用
free -h
top -p $(pgrep cjpayment)

# 检查交换空间
swapon --show

# 添加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 性能问题排查

#### 1. 慢查询分析

```sql
-- 启用慢查询日志
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- 查看慢查询
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### 2. 连接池监控

```bash
# 检查数据库连接
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

# 检查应用连接池状态
curl http://localhost:8080/debug/vars | jq '.database'
```

## 升级指南

### 应用升级

```bash
# 1. 备份数据
./scripts/backup.sh

# 2. 停止服务
docker-compose -f docker-compose.production.yml down

# 3. 拉取新版本
git pull origin main

# 4. 构建新镜像
docker-compose -f docker-compose.production.yml build

# 5. 运行数据库迁移
docker-compose -f docker-compose.production.yml run --rm api go run cmd/migrate/main.go -direction=up

# 6. 启动服务
docker-compose -f docker-compose.production.yml up -d

# 7. 验证升级
curl http://localhost:8080/health
```

### 回滚操作

```bash
# 1. 停止服务
docker-compose -f docker-compose.production.yml down

# 2. 回滚代码
git checkout <previous-version-tag>

# 3. 回滚数据库（如需要）
./bin/migrate -database "postgres://..." -path ./migrations down <steps>

# 4. 重新构建和启动
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

## 联系信息

- 技术支持: tech-support@company.com
- 运维团队: ops@company.com
- 紧急联系: +86-400-xxx-xxxx
# Recharge Testing System - Deployment Guide

This guide provides comprehensive instructions for deploying the Recharge Testing System across different environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Monitoring and Maintenance](#monitoring-and-maintenance)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- OS: Linux (Ubuntu 20.04+ recommended)

**Recommended for Production:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 100GB+ SSD
- OS: Linux (Ubuntu 22.04 LTS)

### Software Dependencies

```bash
# Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Go (for building from source)
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# MySQL Client
sudo apt-get update
sudo apt-get install mysql-client-core-8.0

# Redis CLI
sudo apt-get install redis-tools

# Nginx (for reverse proxy)
sudo apt-get install nginx

# Monitoring tools
sudo apt-get install htop iotop nethogs
```

## Environment Configuration

### Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/recharge-system.git
cd recharge-system

# Setup development environment
make setup-dev

# Copy and configure environment file
cp .env.recharge.development .env.development
# Edit .env.development with your settings

# Start development environment
make docker-compose-dev
```

### Staging Environment

```bash
# Configure staging environment
cp .env.recharge.staging .env.staging
# Edit .env.staging with staging-specific settings

# Deploy to staging
make deploy-staging
```

### Production Environment

```bash
# Configure production environment
cp .env.recharge.production .env.production
# Edit .env.production with production settings

# Deploy to production
make deploy-prod
```

## Docker Deployment

### Using Docker Compose

#### Development
```bash
# Start all services
docker-compose -f docker-compose.recharge.development.yml up -d

# View logs
docker-compose -f docker-compose.recharge.development.yml logs -f

# Stop services
docker-compose -f docker-compose.recharge.development.yml down
```

#### Production
```bash
# Start production services
docker-compose -f docker-compose.recharge.production.yml up -d

# Scale application instances
docker-compose -f docker-compose.recharge.production.yml up -d --scale recharge-app-1=2 --scale recharge-app-2=2

# Update services
docker-compose -f docker-compose.recharge.production.yml pull
docker-compose -f docker-compose.recharge.production.yml up -d --remove-orphans
```

### Manual Docker Deployment

```bash
# Build image
docker build -f Dockerfile.recharge.production -t recharge-system:latest .

# Run container
docker run -d \
  --name recharge-system \
  -p 8080:8080 \
  -e ENVIRONMENT=production \
  -v /opt/recharge-system/configs:/app/configs:ro \
  -v /opt/recharge-system/uploads:/var/uploads \
  -v /var/log/recharge-system:/var/log/recharge \
  --restart unless-stopped \
  recharge-system:latest
```

## Production Deployment

### Automated Deployment

The system includes automated deployment scripts for zero-downtime deployments:

```bash
# Deploy to production with automated pipeline
./scripts/deploy-recharge-production.sh --tag=v1.0.0

# Deploy with custom settings
./scripts/deploy-recharge-production.sh \
  --tag=v1.0.0 \
  --host=production.recharge.example.com \
  --user=deploy
```

### Manual Production Setup

#### 1. Server Preparation

```bash
# Create application user
sudo useradd -r -s /bin/false -d /opt/recharge-system recharge

# Create directories
sudo mkdir -p /opt/recharge-system/{configs,uploads,logs}
sudo mkdir -p /var/log/recharge-system
sudo mkdir -p /opt/backups/recharge-system

# Set permissions
sudo chown -R recharge:recharge /opt/recharge-system
sudo chown -R recharge:recharge /var/log/recharge-system
```

#### 2. Database Setup

```bash
# Create database and user
mysql -u root -p << EOF
CREATE DATABASE cjpayment_recharge_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'recharge_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON cjpayment_recharge_prod.* TO 'recharge_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Run migrations
./recharge-system migrate up --config configs/config.recharge.production.yaml
```

#### 3. Redis Setup

```bash
# Configure Redis
sudo cp configs/redis.conf /etc/redis/redis.conf
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### 4. Nginx Configuration

```bash
# Copy Nginx configuration
sudo cp nginx/recharge.conf /etc/nginx/sites-available/recharge
sudo ln -s /etc/nginx/sites-available/recharge /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 5. SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d recharge.example.com

# Or copy existing certificates
sudo cp ssl/recharge.example.com.crt /etc/ssl/certs/
sudo cp ssl/recharge.example.com.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/recharge.example.com.key
```

#### 6. Systemd Service

```bash
# Install systemd service
sudo cp configs/systemd/recharge-system.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable recharge-system
sudo systemctl start recharge-system
```

### Load Balancer Setup

For high availability, configure multiple application instances behind a load balancer:

```bash
# Using Nginx as load balancer
sudo cp nginx/recharge-lb.conf /etc/nginx/sites-available/recharge-lb
sudo ln -s /etc/nginx/sites-available/recharge-lb /etc/nginx/sites-enabled/

# Configure upstream servers in the file
# Update DNS to point to load balancer
```

## Monitoring and Maintenance

### Health Checks

```bash
# Manual health check
./scripts/health-check.sh --verbose

# Automated health monitoring
# Add to crontab:
*/5 * * * * /opt/recharge-system/scripts/health-check.sh >> /var/log/recharge-system/health.log 2>&1
```

### Log Management

```bash
# View application logs
tail -f /var/log/recharge-system/app.log

# View error logs
tail -f /var/log/recharge-system/error.log

# Log rotation (add to /etc/logrotate.d/recharge-system)
/var/log/recharge-system/*.log {
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

### Backup Strategy

```bash
# Database backup
mysqldump -u recharge_user -p cjpayment_recharge_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
./scripts/backup-system.sh

# Automated backup (add to crontab)
0 2 * * * /opt/recharge-system/scripts/backup-system.sh
```

### Performance Monitoring

#### Prometheus Metrics

Access metrics at: `http://your-server:9090`

Key metrics to monitor:
- `recharge_orders_total` - Total number of orders
- `recharge_amount_total` - Total recharge amount
- `account_match_duration_seconds` - Account matching performance
- `http_requests_total` - HTTP request metrics
- `go_memstats_alloc_bytes` - Memory usage

#### Grafana Dashboards

Access Grafana at: `http://your-server:3000`

Default login: `admin` / `admin` (change immediately)

Import the provided dashboard: `configs/grafana-dashboard.json`

### Security Maintenance

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Update Docker images
docker-compose pull
docker-compose up -d

# Security scan
make security-scan

# Check for vulnerabilities
make vulnerability-check
```

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
journalctl -u recharge-system -f

# Check configuration
./recharge-system --config configs/config.recharge.production.yaml --validate

# Check dependencies
./scripts/health-check.sh --verbose
```

#### Database Connection Issues

```bash
# Test database connection
mysql -h localhost -u recharge_user -p cjpayment_recharge_prod -e "SELECT 1;"

# Check database status
systemctl status mysql

# Review database logs
tail -f /var/log/mysql/error.log
```

#### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis status
systemctl status redis-server

# Review Redis logs
tail -f /var/log/redis/redis-server.log
```

#### High Memory Usage

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check for memory leaks
go tool pprof http://localhost:8080/debug/pprof/heap
```

#### High CPU Usage

```bash
# Check CPU usage
top -p $(pgrep recharge-system)

# Profile CPU usage
go tool pprof http://localhost:8080/debug/pprof/profile
```

### Performance Tuning

#### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_recharge_orders_created_at ON recharge_orders(created_at);
CREATE INDEX idx_recharge_orders_merchant_status ON recharge_orders(merchant_id, status);

-- Optimize MySQL configuration
-- Add to /etc/mysql/mysql.conf.d/mysqld.cnf:
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
query_cache_size = 128M
max_connections = 200
```

#### Application Tuning

```bash
# Increase file descriptor limits
echo "recharge soft nofile 65536" >> /etc/security/limits.conf
echo "recharge hard nofile 65536" >> /etc/security/limits.conf

# Optimize Go garbage collector
export GOGC=100
export GOMEMLIMIT=2GiB
```

#### Nginx Optimization

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 4096;
keepalive_timeout 65;
client_max_body_size 50M;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
```

### Rollback Procedures

#### Automated Rollback

```bash
# Rollback to previous version
./scripts/deploy-recharge-production.sh --rollback
```

#### Manual Rollback

```bash
# Stop current version
sudo systemctl stop recharge-system

# Restore from backup
sudo cp /opt/backups/recharge-system/backup-20240101-120000/recharge-system /opt/recharge-system/

# Restore database if needed
mysql -u recharge_user -p cjpayment_recharge_prod < backup_20240101_120000.sql

# Start service
sudo systemctl start recharge-system
```

### Support and Maintenance

#### Log Analysis

```bash
# Find errors in logs
grep -i error /var/log/recharge-system/app.log | tail -20

# Monitor real-time errors
tail -f /var/log/recharge-system/app.log | grep -i error

# Analyze access patterns
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
```

#### Performance Analysis

```bash
# Database slow query analysis
mysqldumpslow /var/log/mysql/slow.log

# Application profiling
go tool pprof http://localhost:8080/debug/pprof/profile?seconds=30

# Memory profiling
go tool pprof http://localhost:8080/debug/pprof/heap
```

For additional support, refer to the system documentation or contact the development team.
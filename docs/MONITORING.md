# CJPayment Monitoring and Logging Guide

This document provides comprehensive information about the monitoring and logging infrastructure for the CJPayment system.

## Overview

The CJPayment monitoring stack includes:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notification
- **Loki**: Log aggregation (optional)
- **Promtail**: Log collection (optional)
- **Jaeger**: Distributed tracing (optional)
- **Node Exporter**: System metrics
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics

## Quick Start

### Basic Monitoring Stack

```bash
# Start basic monitoring (Prometheus + Grafana + Alertmanager)
make monitoring-start

# Or using the script directly
./scripts/start-monitoring.sh -e development
```

### Full Monitoring Stack

```bash
# Start with logging and tracing
make monitoring-start-full

# Or using the script directly
./scripts/start-monitoring.sh -e development -l -t
```

### Access URLs

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Alertmanager**: http://localhost:9093
- **Jaeger**: http://localhost:16686 (if tracing enabled)
- **Loki**: http://localhost:3100 (if logging enabled)

## Metrics

### Application Metrics

The CJPayment application exposes metrics at `/metrics` endpoint (port 9090 by default).

#### HTTP Metrics

- `cjpayment_http_requests_total`: Total HTTP requests by method, endpoint, and status
- `cjpayment_http_request_duration_seconds`: HTTP request duration histogram

#### Database Metrics

- `cjpayment_database_connections_active`: Number of active database connections
- `cjpayment_database_query_duration_seconds`: Database query duration histogram

#### Business Metrics

- `cjpayment_recharge_orders_total`: Total recharge orders by status and payment type
- `cjpayment_recharge_amount_total`: Total recharge amount processed
- `cjpayment_webhook_notifications_total`: Total webhook notifications sent

#### Redis Metrics

- `cjpayment_redis_operations_total`: Total Redis operations by operation and status

### System Metrics

System metrics are collected by Node Exporter:

- CPU usage, memory usage, disk usage
- Network I/O, disk I/O
- System load, process count

### Database Metrics

PostgreSQL metrics are collected by PostgreSQL Exporter:

- Connection count, query performance
- Database size, table statistics
- Lock information, replication status

## Alerting

### Alert Rules

Alert rules are defined in `configs/alert_rules.yml`:

#### Application Alerts

- **ApplicationDown**: Application is not responding
- **HighErrorRate**: Error rate > 5% for 5 minutes
- **HighResponseTime**: 95th percentile response time > 2s

#### Database Alerts

- **DatabaseDown**: PostgreSQL is not responding
- **DatabaseConnectionsHigh**: High number of database connections
- **DatabaseSlowQueries**: Slow database queries detected

#### System Alerts

- **HighCPUUsage**: CPU usage > 80%
- **HighMemoryUsage**: Memory usage > 90%
- **HighDiskUsage**: Disk usage > 90%

#### Business Alerts

- **HighRechargeFailureRate**: Recharge failure rate > 10%
- **WebhookNotificationFailures**: High webhook failure rate
- **NoRechargeOrders**: No orders processed in 30 minutes

### Alert Notifications

Alerts are routed through Alertmanager to various channels:

- **Email**: For all alert types
- **Slack**: For critical and warning alerts
- **Webhook**: For integration with external systems
- **Microsoft Teams**: For critical alerts

### Configuration

Alert notification channels are configured in `configs/alertmanager.yml`:

```yaml
# Environment variables for notification configuration
SMTP_HOST=smtp.gmail.com:587
SMTP_FROM=alerts@cjpayment.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# Email recipients
CRITICAL_EMAIL=admin@cjpayment.com
WARNING_EMAIL=ops@cjpayment.com
BUSINESS_EMAIL=business@cjpayment.com
DBA_EMAIL=dba@cjpayment.com
SYSADMIN_EMAIL=sysadmin@cjpayment.com
```

## Logging

### Log Configuration

Logging is configured in `configs/logging.yaml` with different settings for each environment:

#### Development
- **Level**: debug
- **Format**: console (colored)
- **Output**: stdout
- **Features**: Request/response logging, query logging

#### Production
- **Level**: info
- **Format**: json
- **Output**: file + stdout
- **Features**: Log sampling, field redaction, structured logging

### Log Aggregation

When logging is enabled, logs are collected by Promtail and sent to Loki:

```bash
# Start with log aggregation
./scripts/start-monitoring.sh -e production -l
```

### Log Queries

Example Loki queries:

```logql
# All application logs
{job="cjpayment-app"}

# Error logs only
{job="cjpayment-app"} |= "level=error"

# Database errors
{job="cjpayment-app"} |= "component=database" |= "level=error"

# HTTP requests with high response time
{job="cjpayment-app"} |= "http_request" | json | duration > 1s

# Failed recharge orders
{job="cjpayment-app"} |= "recharge_order" |= "status=failed"
```

### Log Retention

- **Development**: 7 days
- **Staging**: 30 days
- **Production**: 90 days

## Dashboards

### Main Dashboard

The main Grafana dashboard (`configs/grafana-dashboard.json`) includes:

1. **System Overview**: Service status indicators
2. **HTTP Metrics**: Request rate, response time, error rate
3. **Database Metrics**: Connection count, query performance
4. **Business Metrics**: Recharge orders, amounts, success rates
5. **System Resources**: CPU, memory, disk usage

### Custom Dashboards

Additional dashboards can be imported:

1. **Node Exporter Dashboard**: System metrics
2. **PostgreSQL Dashboard**: Database performance
3. **Redis Dashboard**: Cache performance
4. **Nginx Dashboard**: Web server metrics

### Dashboard Management

```bash
# Import dashboard via API
curl -X POST \
  http://admin:admin123@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @path/to/dashboard.json

# Export dashboard
curl -X GET \
  http://admin:admin123@localhost:3000/api/dashboards/uid/dashboard-uid \
  | jq '.dashboard' > exported-dashboard.json
```

## Distributed Tracing

### Jaeger Setup

Enable distributed tracing:

```bash
./scripts/start-monitoring.sh -e production -t
```

### Trace Configuration

Configure tracing in the application:

```yaml
tracing:
  enabled: true
  jaeger:
    endpoint: "http://jaeger:14268/api/traces"
    service_name: "cjpayment"
    sampler_type: "probabilistic"
    sampler_param: 0.1  # 10% sampling
```

### Trace Analysis

Use Jaeger UI to:

- Track request flows across services
- Identify performance bottlenecks
- Debug distributed system issues
- Analyze service dependencies

## Performance Monitoring

### Key Performance Indicators (KPIs)

1. **Availability**: Service uptime percentage
2. **Response Time**: 95th percentile response time
3. **Error Rate**: Percentage of failed requests
4. **Throughput**: Requests per second
5. **Resource Utilization**: CPU, memory, disk usage

### SLA Monitoring

Define and monitor Service Level Agreements:

- **Availability**: 99.9% uptime
- **Response Time**: < 500ms for 95% of requests
- **Error Rate**: < 1% of total requests

### Capacity Planning

Monitor trends for:

- Request volume growth
- Resource usage patterns
- Database performance degradation
- Storage capacity requirements

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Check application memory usage
docker stats cjpayment_cjpayment-api_1

# Check memory metrics in Grafana
# Query: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Investigate memory leaks
go tool pprof http://localhost:8080/debug/pprof/heap
```

#### Database Connection Issues

```bash
# Check database connections
docker-compose exec postgres psql -U cjpayment -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool metrics
curl http://localhost:9090/metrics | grep database_connections

# Review slow queries
docker-compose exec postgres psql -U cjpayment -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### High Error Rates

```bash
# Check error logs
docker-compose logs cjpayment-api | grep ERROR

# Query error metrics
curl http://localhost:9090/api/v1/query?query=rate(cjpayment_http_requests_total{status=~"5.."}[5m])

# Check specific error patterns in Loki
{job="cjpayment-app"} |= "level=error" | json | line_format "{{.message}}"
```

### Debug Commands

```bash
# Check service health
curl http://localhost:8080/health

# Get metrics
curl http://localhost:9090/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Validate alert rules
promtool check rules configs/alert_rules.yml

# Test alertmanager config
amtool config check configs/alertmanager.yml
```

## Security

### Monitoring Security

1. **Authentication**: Secure Grafana with strong passwords
2. **Network Security**: Use internal networks for monitoring traffic
3. **Data Privacy**: Redact sensitive information in logs
4. **Access Control**: Limit access to monitoring interfaces

### Security Monitoring

Monitor for:

- Failed authentication attempts
- Unusual access patterns
- Privilege escalation attempts
- Data exfiltration indicators

## Backup and Recovery

### Monitoring Data Backup

```bash
# Backup Prometheus data
docker run --rm -v cjpayment_prometheus_data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus_backup.tar.gz -C /data .

# Backup Grafana data
docker run --rm -v cjpayment_grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana_backup.tar.gz -C /data .

# Backup Loki data
docker run --rm -v cjpayment_loki_data:/data -v $(pwd):/backup alpine tar czf /backup/loki_backup.tar.gz -C /data .
```

### Recovery Procedures

```bash
# Restore Prometheus data
docker run --rm -v cjpayment_prometheus_data:/data -v $(pwd):/backup alpine tar xzf /backup/prometheus_backup.tar.gz -C /data

# Restore Grafana data
docker run --rm -v cjpayment_grafana_data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana_backup.tar.gz -C /data
```

## Best Practices

1. **Monitor Everything**: Application, infrastructure, and business metrics
2. **Set Meaningful Alerts**: Avoid alert fatigue with actionable alerts
3. **Use Dashboards Effectively**: Create role-specific dashboards
4. **Regular Reviews**: Review and update monitoring configuration
5. **Documentation**: Keep monitoring documentation up to date
6. **Testing**: Test alert rules and notification channels regularly
7. **Capacity Planning**: Monitor trends for proactive scaling
8. **Security**: Secure monitoring infrastructure and data
9. **Backup**: Regular backup of monitoring data and configuration
10. **Training**: Ensure team members understand monitoring tools and procedures
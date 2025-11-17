# Docker Deployment Guide

This document provides comprehensive instructions for deploying the CJPayment system using Docker containers.

## Overview

The CJPayment system uses a multi-stage Docker build process with different targets for different environments:

- **development**: Hot-reload development environment with debugging support
- **runtime**: Standard runtime environment (default)
- **production**: Optimized production environment with security hardening

## Prerequisites

- Docker 20.10+ 
- Docker Compose 2.0+
- Make (optional, for using Makefile commands)

## Quick Start

### Development Environment

```bash
# Using Makefile
make docker-run-dev

# Using docker-compose directly
docker-compose -f docker-compose.yml -f docker-compose.development.yml up -d

# Using deployment script
./scripts/deploy.sh -e development
```

### Production Environment

```bash
# Using Makefile
make docker-run-prod

# Using docker-compose directly
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Using deployment script
./scripts/deploy.sh -e production -v 1.0.0
```

## Environment Configurations

### Development
- **Target**: `development`
- **Features**: Hot reload, debugging support, development tools
- **Database**: Local PostgreSQL container
- **Redis**: Local Redis container
- **Ports**: 8080 (API), 2345 (debugger), 5432 (PostgreSQL), 6379 (Redis), 5050 (pgAdmin)

### Staging
- **Target**: `production`
- **Features**: Production-like environment for testing
- **Database**: Can use external or containerized
- **Redis**: Can use external or containerized
- **Ports**: 8080 (API), 9090 (metrics)

### Production
- **Target**: `production`
- **Features**: Optimized, secure, multi-replica deployment
- **Database**: External managed database recommended
- **Redis**: External managed Redis recommended
- **Ports**: 80/443 (via Nginx), internal 8080

## Docker Images

### Multi-Stage Build Targets

1. **builder**: Compiles the Go application
2. **development**: Development environment with hot reload
3. **runtime**: Standard runtime (scratch-based, minimal)
4. **production**: Production-optimized (Alpine-based with security tools)

### Building Images

```bash
# Build all targets
make docker-build

# Build specific targets
make docker-build-dev
make docker-build-prod

# Build with version tag
VERSION=1.0.0 make docker-build-prod
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_HOST` | Database hostname | `postgres` |
| `DATABASE_USER` | Database username | `cjpayment` |
| `DATABASE_PASSWORD` | Database password | `secure_password` |
| `DATABASE_DBNAME` | Database name | `cjpayment` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | API server port | `8080` |
| `LOG_LEVEL` | Logging level | `info` |
| `ENABLE_METRICS` | Enable metrics endpoint | `true` |
| `MAX_UPLOAD_SIZE` | Max file upload size | `52428800` |

## Volumes

### Persistent Volumes

- `postgres_data`: PostgreSQL data
- `redis_data`: Redis data
- `uploads_data`: File uploads
- `logs_data`: Application logs (production)

### Development Volumes

- `go_modules`: Go module cache
- `test_coverage`: Test coverage reports

## Networking

### Default Network

- **Name**: `cjpayment-network`
- **Driver**: `bridge`
- **Subnet**: `172.20.0.0/16` (development), `172.21.0.0/16` (staging)

### Port Mapping

| Service | Internal Port | External Port | Environment |
|---------|---------------|---------------|-------------|
| API | 8080 | 8080 | development |
| API | 8080 | 80/443 | production (via Nginx) |
| PostgreSQL | 5432 | 5432 | development |
| Redis | 6379 | 6379 | development |
| pgAdmin | 80 | 5050 | development |
| Debugger | 2345 | 2345 | development |

## Health Checks

### Application Health Check

The application includes a comprehensive health check system:

```bash
# Manual health check
curl http://localhost:8080/health

# Using custom health check script
./scripts/healthcheck.sh
```

### Health Check Components

1. **Application endpoint**: `/health`
2. **Database connectivity**: PostgreSQL connection test
3. **Redis connectivity**: Redis ping test
4. **System resources**: Disk and memory usage
5. **External dependencies**: Optional external service checks

## Monitoring and Logging

### Logging Configuration

- **Development**: Console output with debug level
- **Production**: JSON format with info level
- **Log rotation**: 10MB max size, 3 files retention

### Metrics

- **Endpoint**: `/metrics` (when `ENABLE_METRICS=true`)
- **Port**: 9090 (configurable via `METRICS_PORT`)
- **Format**: Prometheus format

## Security

### Container Security

1. **Non-root user**: Runs as user ID 1001
2. **Minimal base image**: Uses scratch for runtime, Alpine for production
3. **Security updates**: Regular base image updates
4. **Read-only filesystem**: Where possible
5. **Capability dropping**: Minimal required capabilities

### Network Security

1. **Internal networking**: Services communicate via internal network
2. **TLS termination**: Nginx handles HTTPS
3. **Rate limiting**: Nginx-based rate limiting
4. **Security headers**: Comprehensive security headers

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker-compose logs cjpayment-api

# Check health status
docker-compose ps

# Inspect container
docker inspect cjpayment_cjpayment-api_1
```

#### Database Connection Issues

```bash
# Check database logs
docker-compose logs postgres

# Test database connectivity
docker-compose exec postgres pg_isready -U cjpayment -d cjpayment

# Connect to database
docker-compose exec postgres psql -U cjpayment -d cjpayment
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Check application metrics
curl http://localhost:9090/metrics

# Run performance tests
make test-performance
```

### Debug Mode

For development debugging:

```bash
# Start with debugger
docker-compose -f docker-compose.yml -f docker-compose.development.yml up -d

# Attach debugger to port 2345
# Use your IDE's remote debugging feature
```

## Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy new version
VERSION=1.1.0 ./scripts/deploy.sh -e production -v 1.1.0

# Verify health
curl https://your-domain.com/health

# Rollback if needed
VERSION=1.0.0 ./scripts/deploy.sh -e production -v 1.0.0
```

### Rolling Updates

```bash
# Update with zero downtime
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d --scale cjpayment-api=6
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d --scale cjpayment-api=3
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker-compose exec postgres pg_dump -U cjpayment cjpayment > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U cjpayment cjpayment < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v cjpayment_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v cjpayment_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Performance Optimization

### Image Size Optimization

- Multi-stage builds reduce final image size
- UPX compression for binaries (optional)
- Minimal base images (scratch/Alpine)
- .dockerignore to reduce build context

### Runtime Optimization

- Resource limits and reservations
- Health check intervals
- Connection pooling
- Caching strategies

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build --target production -t cjpayment:${{ github.sha }} .
          docker tag cjpayment:${{ github.sha }} cjpayment:latest
      - name: Deploy to staging
        run: |
          VERSION=${{ github.sha }} ./scripts/deploy.sh -e staging
```

## Best Practices

1. **Use specific image tags** in production
2. **Set resource limits** for all containers
3. **Use health checks** for all services
4. **Implement proper logging** and monitoring
5. **Regular security updates** for base images
6. **Backup strategies** for persistent data
7. **Test deployments** in staging first
8. **Monitor resource usage** and performance
9. **Use secrets management** for sensitive data
10. **Document deployment procedures** and runbooks
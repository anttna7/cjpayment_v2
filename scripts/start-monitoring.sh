#!/bin/bash

# CJPayment Monitoring Stack Startup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[MONITORING]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[MONITORING]${NC} $1"
}

print_error() {
    echo -e "${RED}[MONITORING]${NC} $1"
}

# Default values
ENVIRONMENT="development"
ENABLE_LOGGING="false"
ENABLE_TRACING="false"

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|staging|production)"
    echo "  -l, --logging           Enable log aggregation (Loki + Promtail)"
    echo "  -t, --tracing           Enable distributed tracing (Jaeger)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e development        Start basic monitoring for development"
    echo "  $0 -e production -l -t   Start full monitoring stack for production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -l|--logging)
            ENABLE_LOGGING="true"
            shift
            ;;
        -t|--tracing)
            ENABLE_TRACING="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Valid environments: development, staging, production"
        exit 1
        ;;
esac

print_status "Starting monitoring stack for $ENVIRONMENT environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Load environment variables
ENV_FILE=".env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    print_status "Environment variables loaded from $ENV_FILE"
else
    print_warning "Environment file $ENV_FILE not found, using defaults"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p configs/grafana/dashboards
mkdir -p configs/grafana/datasources
mkdir -p configs/alertmanager/templates

# Create Grafana datasource configuration
cat > configs/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

# Build compose command
COMPOSE_CMD="docker-compose -f docker-compose.monitoring.yml"

# Add profiles based on options
PROFILES=""
if [[ "$ENABLE_LOGGING" == "true" ]]; then
    PROFILES="$PROFILES --profile logging"
    print_status "Enabling log aggregation (Loki + Promtail)"
fi

if [[ "$ENABLE_TRACING" == "true" ]]; then
    PROFILES="$PROFILES --profile tracing"
    print_status "Enabling distributed tracing (Jaeger)"
fi

# Start monitoring stack
print_status "Starting monitoring services..."
$COMPOSE_CMD $PROFILES up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service health
print_status "Checking service health..."
services_healthy=true

# Check Prometheus
if ! curl -f -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    print_error "Prometheus is not healthy"
    services_healthy=false
else
    print_status "Prometheus is healthy"
fi

# Check Grafana
if ! curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    print_error "Grafana is not healthy"
    services_healthy=false
else
    print_status "Grafana is healthy"
fi

# Check Alertmanager
if ! curl -f -s http://localhost:9093/-/healthy > /dev/null 2>&1; then
    print_error "Alertmanager is not healthy"
    services_healthy=false
else
    print_status "Alertmanager is healthy"
fi

if [[ "$services_healthy" == "false" ]]; then
    print_error "Some services are not healthy. Check logs with:"
    print_error "$COMPOSE_CMD logs"
    exit 1
fi

# Import Grafana dashboard
print_status "Importing Grafana dashboard..."
sleep 10  # Wait a bit more for Grafana to be fully ready

# Create dashboard via API
curl -X POST \
  http://admin:${GRAFANA_PASSWORD:-admin123}@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @configs/grafana-dashboard.json > /dev/null 2>&1 || print_warning "Failed to import dashboard automatically"

print_status "Monitoring stack started successfully!"
print_status ""
print_status "Access URLs:"
print_status "  - Prometheus: http://localhost:9090"
print_status "  - Grafana: http://localhost:3000 (admin/${GRAFANA_PASSWORD:-admin123})"
print_status "  - Alertmanager: http://localhost:9093"

if [[ "$ENABLE_TRACING" == "true" ]]; then
    print_status "  - Jaeger: http://localhost:16686"
fi

if [[ "$ENABLE_LOGGING" == "true" ]]; then
    print_status "  - Loki: http://localhost:3100"
fi

print_status ""
print_status "To view logs: $COMPOSE_CMD logs -f"
print_status "To stop monitoring: $COMPOSE_CMD $PROFILES down"

# Show next steps
print_status ""
print_status "Next steps:"
print_status "1. Configure alert notification channels in Alertmanager"
print_status "2. Import additional Grafana dashboards as needed"
print_status "3. Set up log retention policies in Loki (if enabled)"
print_status "4. Configure application to send metrics to Prometheus"
print_status "5. Test alert rules by triggering test conditions"
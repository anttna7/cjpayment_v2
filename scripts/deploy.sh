#!/bin/bash

# CJPayment Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
VERSION="latest"
COMPOSE_FILE=""
ENV_FILE=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|testing|production)"
    echo "  -v, --version VERSION    Set version tag (default: latest)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e development        Deploy to development environment"
    echo "  $0 -e production -v 1.0.0  Deploy version 1.0.0 to production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
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
    development|testing|staging|production)
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Valid environments: development, testing, staging, production"
        exit 1
        ;;
esac

# Set compose file and env file based on environment
case $ENVIRONMENT in
    development)
        COMPOSE_FILE="docker-compose.yml -f docker-compose.development.yml"
        ENV_FILE=".env.development"
        ;;
    testing)
        COMPOSE_FILE="docker-compose.yml -f docker-compose.testing.yml"
        ENV_FILE=".env.testing"
        ;;
    staging)
        COMPOSE_FILE="docker-compose.yml -f docker-compose.staging.yml"
        ENV_FILE=".env.staging"
        ;;
    production)
        COMPOSE_FILE="docker-compose.yml -f docker-compose.production.yml"
        ENV_FILE=".env.production"
        ;;
esac

print_status "Starting deployment to $ENVIRONMENT environment..."
print_status "Version: $VERSION"

# Check if env file exists
if [[ ! -f "$ENV_FILE" ]]; then
    print_warning "Environment file $ENV_FILE not found, using .env.example"
    if [[ ! -f ".env.example" ]]; then
        print_error "No environment file found. Please create $ENV_FILE or .env.example"
        exit 1
    fi
    cp .env.example "$ENV_FILE"
fi

# Export environment variables
export VERSION="$VERSION"
export $(grep -v '^#' "$ENV_FILE" | xargs)

print_status "Environment variables loaded from $ENV_FILE"

# Pre-deployment checks
print_status "Running pre-deployment checks..."

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

# Build and deploy
print_status "Building Docker images..."
docker-compose -f $COMPOSE_FILE build

if [[ $ENVIRONMENT == "production" ]] || [[ $ENVIRONMENT == "staging" ]]; then
    print_status "Tagging images for $ENVIRONMENT..."
    docker tag cjpayment:latest cjpayment:$VERSION
fi

print_status "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
print_status "Checking service health..."
if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy\|Exit"; then
    print_error "Some services are not healthy. Check logs with:"
    print_error "docker-compose -f $COMPOSE_FILE logs"
    exit 1
fi

# Run database migrations if needed
if [[ $ENVIRONMENT != "testing" ]]; then
    print_status "Running database migrations..."
    docker-compose -f $COMPOSE_FILE exec -T cjpayment-api ./migrate -command=up || {
        print_warning "Migration failed or no migrations to run"
    }
fi

print_status "Deployment completed successfully!"
print_status "Services are running on:"

case $ENVIRONMENT in
    development)
        echo "  - API: http://localhost:${API_PORT:-8080}"
        echo "  - pgAdmin: http://localhost:${PGADMIN_PORT:-5050}"
        ;;
    staging)
        echo "  - API: https://staging.your-domain.com"
        echo "  - Health Check: https://staging.your-domain.com/health"
        echo "  - Metrics: https://staging.your-domain.com:${METRICS_PORT:-9090}/metrics"
        ;;
    production)
        echo "  - API: https://your-domain.com"
        echo "  - Health Check: https://your-domain.com/health"
        ;;
esac

print_status "To view logs: docker-compose -f $COMPOSE_FILE logs -f"
print_status "To stop services: docker-compose -f $COMPOSE_FILE down"
#!/bin/bash

# Production Deployment Script for Recharge Testing System
# This script handles zero-downtime deployment to production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="recharge-system"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_HOST="${DEPLOY_HOST:-production.recharge.example.com}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/recharge-system}"
BACKUP_PATH="${BACKUP_PATH:-/opt/backups/recharge-system}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-registry.example.com}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
        DEBUG)
            if [[ "${DEBUG:-false}" == "true" ]]; then
                echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message"
            fi
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log INFO "Checking deployment prerequisites..."
    
    local required_tools=("docker" "docker-compose" "ssh" "rsync")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log ERROR "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check SSH connectivity
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$DEPLOY_USER@$DEPLOY_HOST" exit 2>/dev/null; then
        log ERROR "Cannot connect to deployment host: $DEPLOY_USER@$DEPLOY_HOST"
        exit 1
    fi
    
    log INFO "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log INFO "Building Docker image..."
    
    local image_name="${DOCKER_REGISTRY}/${APP_NAME}:${IMAGE_TAG}"
    local build_args=""
    
    # Add build arguments
    if [[ -n "${BUILD_VERSION:-}" ]]; then
        build_args="--build-arg VERSION=${BUILD_VERSION}"
    fi
    
    # Build production image
    if docker build \
        -f "${PROJECT_ROOT}/Dockerfile.recharge.production" \
        -t "$image_name" \
        $build_args \
        "$PROJECT_ROOT"; then
        log INFO "Docker image built successfully: $image_name"
    else
        log ERROR "Failed to build Docker image"
        exit 1
    fi
    
    # Push to registry
    if [[ "${PUSH_IMAGE:-true}" == "true" ]]; then
        log INFO "Pushing image to registry..."
        if docker push "$image_name"; then
            log INFO "Image pushed successfully"
        else
            log ERROR "Failed to push image to registry"
            exit 1
        fi
    fi
}

# Run tests
run_tests() {
    log INFO "Running tests before deployment..."
    
    # Run unit tests
    if ! go test -short ./...; then
        log ERROR "Unit tests failed"
        exit 1
    fi
    
    # Run integration tests if available
    if [[ -f "${PROJECT_ROOT}/tests/integration/run_tests.sh" ]]; then
        if ! "${PROJECT_ROOT}/tests/integration/run_tests.sh"; then
            log ERROR "Integration tests failed"
            exit 1
        fi
    fi
    
    log INFO "All tests passed"
}

# Create backup
create_backup() {
    log INFO "Creating backup of current deployment..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="${BACKUP_PATH}/${backup_name}"
    
    # Create backup on remote server
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "
        mkdir -p '$backup_dir'
        if [[ -d '$DEPLOY_PATH' ]]; then
            cp -r '$DEPLOY_PATH'/* '$backup_dir/' 2>/dev/null || true
            echo 'Backup created: $backup_dir'
        fi
        
        # Keep only last 5 backups
        cd '$BACKUP_PATH'
        ls -t | tail -n +6 | xargs -r rm -rf
    "
    
    log INFO "Backup created: $backup_name"
}

# Deploy configuration files
deploy_configs() {
    log INFO "Deploying configuration files..."
    
    local temp_dir=$(mktemp -d)
    
    # Prepare configuration files
    cp -r "${PROJECT_ROOT}/configs" "$temp_dir/"
    cp "${PROJECT_ROOT}/docker-compose.recharge.production.yml" "$temp_dir/docker-compose.yml"
    cp "${PROJECT_ROOT}/.env.recharge.production" "$temp_dir/.env"
    
    # Copy nginx configuration
    mkdir -p "$temp_dir/nginx"
    cp "${PROJECT_ROOT}/nginx/recharge.conf" "$temp_dir/nginx/"
    cp "${PROJECT_ROOT}/nginx/recharge-common.conf" "$temp_dir/nginx/"
    
    # Sync files to remote server
    rsync -avz --delete "$temp_dir/" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/"
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log INFO "Configuration files deployed"
}

# Deploy application
deploy_application() {
    log INFO "Deploying application..."
    
    # Update docker-compose on remote server
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "
        cd '$DEPLOY_PATH'
        
        # Pull latest images
        docker-compose pull
        
        # Start new containers
        docker-compose up -d --remove-orphans
        
        # Wait for health check
        echo 'Waiting for application to start...'
        for i in {1..30}; do
            if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
                echo 'Application is healthy'
                break
            fi
            if [[ \$i -eq 30 ]]; then
                echo 'Health check timeout'
                exit 1
            fi
            sleep 2
        done
    "
    
    log INFO "Application deployed successfully"
}

# Run database migrations
run_migrations() {
    log INFO "Running database migrations..."
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "
        cd '$DEPLOY_PATH'
        
        # Run migrations in a temporary container
        docker-compose run --rm app ./recharge-system migrate up
    "
    
    log INFO "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    log INFO "Verifying deployment..."
    
    local health_url="https://${DEPLOY_HOST}/health"
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log INFO "Deployment verification successful"
            return 0
        fi
        
        log DEBUG "Verification attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        ((attempt++))
    done
    
    log ERROR "Deployment verification failed"
    return 1
}

# Rollback deployment
rollback() {
    log WARN "Rolling back deployment..."
    
    # Get latest backup
    local latest_backup=$(ssh "$DEPLOY_USER@$DEPLOY_HOST" "ls -t '$BACKUP_PATH' | head -n1")
    
    if [[ -n "$latest_backup" ]]; then
        ssh "$DEPLOY_USER@$DEPLOY_HOST" "
            cd '$DEPLOY_PATH'
            
            # Stop current containers
            docker-compose down
            
            # Restore from backup
            rm -rf ./*
            cp -r '$BACKUP_PATH/$latest_backup'/* ./
            
            # Start restored version
            docker-compose up -d
        "
        
        log INFO "Rollback completed using backup: $latest_backup"
    else
        log ERROR "No backup found for rollback"
        exit 1
    fi
}

# Cleanup old images
cleanup() {
    log INFO "Cleaning up old Docker images..."
    
    ssh "$DEPLOY_USER@$DEPLOY_HOST" "
        # Remove unused images
        docker image prune -f
        
        # Remove old versions (keep last 3)
        docker images '${DOCKER_REGISTRY}/${APP_NAME}' --format 'table {{.Tag}}\t{{.ID}}' | \
        tail -n +4 | awk '{print \$2}' | xargs -r docker rmi
    "
    
    log INFO "Cleanup completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" != "success" ]]; then
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" || true
    fi
    
    if [[ -n "${EMAIL_NOTIFICATION:-}" ]]; then
        echo "$message" | mail -s "Deployment $status: $APP_NAME" "$EMAIL_NOTIFICATION" || true
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log INFO "Starting production deployment of $APP_NAME"
    
    # Trap for cleanup on failure
    trap 'rollback; send_notification "failed" "Deployment failed and was rolled back"' ERR
    
    check_prerequisites
    run_tests
    build_image
    create_backup
    deploy_configs
    run_migrations
    deploy_application
    
    if verify_deployment; then
        cleanup
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log INFO "Deployment completed successfully in ${duration}s"
        send_notification "success" "Deployment completed successfully in ${duration}s"
    else
        log ERROR "Deployment verification failed, rolling back..."
        rollback
        send_notification "failed" "Deployment failed verification and was rolled back"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag|-t)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --host|-h)
            DEPLOY_HOST="$2"
            shift 2
            ;;
        --user|-u)
            DEPLOY_USER="$2"
            shift 2
            ;;
        --no-push)
            PUSH_IMAGE=false
            shift
            ;;
        --debug|-d)
            DEBUG=true
            shift
            ;;
        --rollback)
            rollback
            exit 0
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -t, --tag TAG        Docker image tag (default: latest)"
            echo "  -h, --host HOST      Deployment host"
            echo "  -u, --user USER      Deployment user"
            echo "  --no-push            Don't push image to registry"
            echo "  --rollback           Rollback to previous version"
            echo "  -d, --debug          Enable debug logging"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            log ERROR "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
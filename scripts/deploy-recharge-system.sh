#!/bin/bash

# Recharge Testing System Deployment Script
# This script deploys the recharge testing system to production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="recharge-system"
DEPLOY_USER="recharge"
DEPLOY_PATH="/opt/recharge-system"
SERVICE_NAME="recharge-system"

# Default values
ENVIRONMENT="${ENVIRONMENT:-production}"
BUILD_BINARY="${BUILD_BINARY:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RESTART_SERVICE="${RESTART_SERVICE:-true}"
BACKUP_DATABASE="${BACKUP_DATABASE:-true}"

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log ERROR "This script must be run as root for system deployment"
        exit 1
    fi
}

# Create deployment user
create_deploy_user() {
    if ! id "$DEPLOY_USER" &>/dev/null; then
        log INFO "Creating deployment user: $DEPLOY_USER"
        useradd -r -s /bin/bash -d "$DEPLOY_PATH" -m "$DEPLOY_USER"
    else
        log INFO "Deployment user already exists: $DEPLOY_USER"
    fi
}

# Create deployment directories
create_directories() {
    log INFO "Creating deployment directories..."
    
    local dirs=(
        "$DEPLOY_PATH"
        "$DEPLOY_PATH/configs"
        "$DEPLOY_PATH/web"
        "$DEPLOY_PATH/migrations"
        "$DEPLOY_PATH/uploads"
        "$DEPLOY_PATH/logs"
        "/var/log/$APP_NAME"
        "/etc/systemd/system"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log INFO "Created directory: $dir"
        fi
    done
    
    # Set ownership
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "/var/log/$APP_NAME"
}

# Build application binary
build_application() {
    if [[ "$BUILD_BINARY" == "true" ]]; then
        log INFO "Building application binary..."
        
        cd "$PROJECT_ROOT"
        
        # Clean previous builds
        rm -f "$APP_NAME"
        
        # Build for production
        CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
            -ldflags='-w -s -extldflags "-static"' \
            -a -installsuffix cgo \
            -o "$APP_NAME" ./cmd/api
        
        if [[ -f "$APP_NAME" ]]; then
            log INFO "Application binary built successfully"
        else
            log ERROR "Failed to build application binary"
            exit 1
        fi
    else
        log INFO "Skipping binary build"
    fi
}

# Stop existing service
stop_service() {
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log INFO "Stopping existing service: $SERVICE_NAME"
        systemctl stop "$SERVICE_NAME"
        
        # Wait for service to stop
        local max_wait=30
        local wait_time=0
        
        while systemctl is-active --quiet "$SERVICE_NAME" && [[ $wait_time -lt $max_wait ]]; do
            sleep 1
            ((wait_time++))
        done
        
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log ERROR "Failed to stop service within $max_wait seconds"
            exit 1
        fi
        
        log INFO "Service stopped successfully"
    else
        log INFO "Service is not running"
    fi
}

# Backup current deployment
backup_deployment() {
    if [[ -f "$DEPLOY_PATH/$APP_NAME" ]]; then
        local backup_dir="$DEPLOY_PATH/backups/$(date +%Y%m%d_%H%M%S)"
        log INFO "Creating backup: $backup_dir"
        
        mkdir -p "$backup_dir"
        cp "$DEPLOY_PATH/$APP_NAME" "$backup_dir/"
        cp -r "$DEPLOY_PATH/configs" "$backup_dir/"
        
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH/backups"
        log INFO "Backup created successfully"
    else
        log INFO "No existing deployment to backup"
    fi
}

# Backup database
backup_database() {
    if [[ "$BACKUP_DATABASE" == "true" ]]; then
        log INFO "Creating database backup..."
        
        local backup_file="/var/backups/${APP_NAME}_$(date +%Y%m%d_%H%M%S).sql"
        local db_host="${DB_HOST:-localhost}"
        local db_user="${DB_USERNAME:-cjpayment_prod}"
        local db_password="${DB_PASSWORD}"
        local db_name="${DB_DATABASE:-cjpayment_recharge_prod}"
        
        if [[ -n "$db_password" ]]; then
            mysqldump -h "$db_host" -u "$db_user" -p"$db_password" "$db_name" > "$backup_file"
            gzip "$backup_file"
            log INFO "Database backup created: ${backup_file}.gz"
        else
            log WARN "Database password not set, skipping database backup"
        fi
    else
        log INFO "Skipping database backup"
    fi
}

# Deploy application files
deploy_files() {
    log INFO "Deploying application files..."
    
    # Copy binary
    cp "$PROJECT_ROOT/$APP_NAME" "$DEPLOY_PATH/"
    chmod +x "$DEPLOY_PATH/$APP_NAME"
    
    # Copy configuration files
    cp -r "$PROJECT_ROOT/configs"/* "$DEPLOY_PATH/configs/"
    
    # Copy web assets
    cp -r "$PROJECT_ROOT/web"/* "$DEPLOY_PATH/web/"
    
    # Copy migrations
    cp -r "$PROJECT_ROOT/migrations"/* "$DEPLOY_PATH/migrations/"
    
    # Copy environment file
    if [[ -f "$PROJECT_ROOT/.env.recharge.$ENVIRONMENT" ]]; then
        cp "$PROJECT_ROOT/.env.recharge.$ENVIRONMENT" "$DEPLOY_PATH/.env.$ENVIRONMENT"
    fi
    
    # Set ownership and permissions
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"
    chmod 600 "$DEPLOY_PATH/.env.$ENVIRONMENT" 2>/dev/null || true
    
    log INFO "Application files deployed successfully"
}

# Install systemd service
install_service() {
    log INFO "Installing systemd service..."
    
    cp "$PROJECT_ROOT/configs/systemd/$SERVICE_NAME.service" "/etc/systemd/system/"
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable service
    systemctl enable "$SERVICE_NAME"
    
    log INFO "Systemd service installed and enabled"
}

# Run database migrations
run_migrations() {
    if [[ "$RUN_MIGRATIONS" == "true" ]]; then
        log INFO "Running database migrations..."
        
        cd "$DEPLOY_PATH"
        
        # Run migrations as deploy user
        sudo -u "$DEPLOY_USER" ./migrate -path ./migrations -database "mysql://${DB_USERNAME}:${DB_PASSWORD}@tcp(${DB_HOST}:${DB_PORT})/${DB_DATABASE}" up
        
        log INFO "Database migrations completed"
    else
        log INFO "Skipping database migrations"
    fi
}

# Start service
start_service() {
    if [[ "$RESTART_SERVICE" == "true" ]]; then
        log INFO "Starting service: $SERVICE_NAME"
        
        systemctl start "$SERVICE_NAME"
        
        # Wait for service to start
        local max_wait=30
        local wait_time=0
        
        while ! systemctl is-active --quiet "$SERVICE_NAME" && [[ $wait_time -lt $max_wait ]]; do
            sleep 1
            ((wait_time++))
        done
        
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log INFO "Service started successfully"
        else
            log ERROR "Failed to start service"
            systemctl status "$SERVICE_NAME"
            exit 1
        fi
    else
        log INFO "Skipping service start"
    fi
}

# Health check
health_check() {
    log INFO "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:8080/health"
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log INFO "Health check passed"
            return 0
        fi
        
        log DEBUG "Health check attempt $attempt/$max_attempts failed, retrying in 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    log ERROR "Health check failed after $max_attempts attempts"
    return 1
}

# Rollback deployment
rollback() {
    log ERROR "Deployment failed, initiating rollback..."
    
    # Stop current service
    systemctl stop "$SERVICE_NAME" || true
    
    # Find latest backup
    local latest_backup=$(find "$DEPLOY_PATH/backups" -type d -name "*" | sort -r | head -n1)
    
    if [[ -n "$latest_backup" && -d "$latest_backup" ]]; then
        log INFO "Rolling back to: $latest_backup"
        
        # Restore binary and configs
        cp "$latest_backup/$APP_NAME" "$DEPLOY_PATH/"
        cp -r "$latest_backup/configs"/* "$DEPLOY_PATH/configs/"
        
        # Set ownership
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"
        
        # Start service
        systemctl start "$SERVICE_NAME"
        
        log INFO "Rollback completed"
    else
        log ERROR "No backup found for rollback"
    fi
}

# Cleanup old backups
cleanup_backups() {
    log INFO "Cleaning up old backups..."
    
    # Keep only last 5 backups
    find "$DEPLOY_PATH/backups" -type d -name "*" | sort -r | tail -n +6 | xargs rm -rf
    
    # Keep only last 10 database backups
    find /var/backups -name "${APP_NAME}_*.sql.gz" | sort -r | tail -n +11 | xargs rm -f
    
    log INFO "Backup cleanup completed"
}

# Main deployment function
main() {
    log INFO "Starting deployment of $APP_NAME to $ENVIRONMENT environment..."
    
    # Pre-deployment checks
    check_root
    
    # Load environment variables
    if [[ -f "$PROJECT_ROOT/.env.recharge.$ENVIRONMENT" ]]; then
        source "$PROJECT_ROOT/.env.recharge.$ENVIRONMENT"
    fi
    
    # Deployment steps
    create_deploy_user
    create_directories
    build_application
    backup_database
    stop_service
    backup_deployment
    deploy_files
    install_service
    run_migrations
    start_service
    
    # Post-deployment verification
    if health_check; then
        log INFO "Deployment completed successfully!"
        log INFO "Service status: $(systemctl is-active $SERVICE_NAME)"
        log INFO "Application logs: journalctl -u $SERVICE_NAME -f"
        cleanup_backups
    else
        log ERROR "Deployment verification failed"
        rollback
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --no-build)
            BUILD_BINARY=false
            shift
            ;;
        --no-migrations)
            RUN_MIGRATIONS=false
            shift
            ;;
        --no-restart)
            RESTART_SERVICE=false
            shift
            ;;
        --no-backup)
            BACKUP_DATABASE=false
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV  Set environment (default: production)"
            echo "  --no-build            Skip building binary"
            echo "  --no-migrations       Skip running migrations"
            echo "  --no-restart          Skip restarting service"
            echo "  --no-backup           Skip database backup"
            echo "  --debug               Enable debug logging"
            echo "  -h, --help            Show this help message"
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
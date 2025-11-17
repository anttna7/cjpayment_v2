#!/bin/bash

# Recharge Testing System Startup Script
# This script starts the recharge testing system with proper initialization

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="recharge-system"
PID_FILE="/var/run/${APP_NAME}.pid"
LOG_FILE="/var/log/${APP_NAME}/startup.log"
CONFIG_DIR="${PROJECT_ROOT}/configs"
BINARY_PATH="${PROJECT_ROOT}/${APP_NAME}"

# Environment variables
export ENVIRONMENT="${ENVIRONMENT:-development}"
export CONFIG_FILE="${CONFIG_DIR}/config.recharge.${ENVIRONMENT}.yaml"

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
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
            ;;
        DEBUG)
            if [[ "${DEBUG:-false}" == "true" ]]; then
                echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE"
            fi
            ;;
    esac
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log WARN "Running as root is not recommended for security reasons"
    fi
}

# Create necessary directories
create_directories() {
    log INFO "Creating necessary directories..."
    
    local dirs=(
        "/var/log/${APP_NAME}"
        "/var/run"
        "${PROJECT_ROOT}/uploads"
        "${PROJECT_ROOT}/tmp"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log INFO "Created directory: $dir"
        fi
    done
}

# Check dependencies
check_dependencies() {
    log INFO "Checking system dependencies..."
    
    local deps=("mysql" "redis-cli")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log ERROR "Missing dependencies: ${missing_deps[*]}"
        log ERROR "Please install missing dependencies before starting the system"
        exit 1
    fi
    
    log INFO "All dependencies are available"
}

# Check configuration files
check_config() {
    log INFO "Checking configuration files..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log ERROR "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Validate YAML syntax
    if command -v yq &> /dev/null; then
        if ! yq eval '.' "$CONFIG_FILE" > /dev/null 2>&1; then
            log ERROR "Invalid YAML syntax in configuration file: $CONFIG_FILE"
            exit 1
        fi
    fi
    
    log INFO "Configuration file is valid: $CONFIG_FILE"
}

# Check database connectivity
check_database() {
    log INFO "Checking database connectivity..."
    
    # Extract database configuration
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-3306}"
    local db_user="${DB_USERNAME:-cjpayment_dev}"
    local db_password="${DB_PASSWORD:-dev_password_123}"
    local db_name="${DB_DATABASE:-cjpayment_recharge_dev}"
    
    # Test database connection
    if ! mysql -h "$db_host" -P "$db_port" -u "$db_user" -p"$db_password" -e "USE $db_name;" 2>/dev/null; then
        log ERROR "Cannot connect to database: $db_host:$db_port/$db_name"
        exit 1
    fi
    
    log INFO "Database connection successful"
}

# Check Redis connectivity
check_redis() {
    log INFO "Checking Redis connectivity..."
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_password="${REDIS_PASSWORD:-}"
    
    # Test Redis connection
    local redis_cmd="redis-cli -h $redis_host -p $redis_port"
    if [[ -n "$redis_password" ]]; then
        redis_cmd="$redis_cmd -a $redis_password"
    fi
    
    if ! $redis_cmd ping > /dev/null 2>&1; then
        log ERROR "Cannot connect to Redis: $redis_host:$redis_port"
        exit 1
    fi
    
    log INFO "Redis connection successful"
}

# Run database migrations
run_migrations() {
    log INFO "Running database migrations..."
    
    local migrate_cmd="${PROJECT_ROOT}/cmd/migrate/main.go"
    if [[ -f "$migrate_cmd" ]]; then
        if go run "$migrate_cmd" up; then
            log INFO "Database migrations completed successfully"
        else
            log ERROR "Database migrations failed"
            exit 1
        fi
    else
        log WARN "Migration command not found, skipping migrations"
    fi
}

# Check if application is already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log ERROR "Application is already running with PID: $pid"
            exit 1
        else
            log WARN "Stale PID file found, removing it"
            rm -f "$PID_FILE"
        fi
    fi
}

# Start the application
start_application() {
    log INFO "Starting $APP_NAME..."
    
    # Check if binary exists
    if [[ ! -f "$BINARY_PATH" ]]; then
        log ERROR "Application binary not found: $BINARY_PATH"
        log INFO "Please build the application first: go build -o $APP_NAME ./cmd/api"
        exit 1
    fi
    
    # Make binary executable
    chmod +x "$BINARY_PATH"
    
    # Start the application in background
    nohup "$BINARY_PATH" \
        --config "$CONFIG_FILE" \
        --env "$ENVIRONMENT" \
        > "/var/log/${APP_NAME}/app.log" 2>&1 &
    
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    log INFO "Application started with PID: $pid"
    
    # Wait a moment and check if it's still running
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        log INFO "$APP_NAME started successfully"
    else
        log ERROR "$APP_NAME failed to start"
        rm -f "$PID_FILE"
        exit 1
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

# Cleanup function
cleanup() {
    log INFO "Cleaning up..."
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log INFO "Stopping application with PID: $pid"
            kill -TERM "$pid"
            sleep 5
            if kill -0 "$pid" 2>/dev/null; then
                log WARN "Application didn't stop gracefully, forcing termination"
                kill -KILL "$pid"
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Signal handlers
trap cleanup EXIT INT TERM

# Main execution
main() {
    log INFO "Starting $APP_NAME initialization..."
    
    check_root
    create_directories
    check_dependencies
    check_config
    check_database
    check_redis
    check_running
    run_migrations
    start_application
    
    if health_check; then
        log INFO "$APP_NAME is running and healthy"
        log INFO "Application logs: /var/log/${APP_NAME}/app.log"
        log INFO "PID file: $PID_FILE"
        log INFO "To stop the application, run: kill \$(cat $PID_FILE)"
    else
        log ERROR "$APP_NAME started but health check failed"
        cleanup
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
        --debug|-d)
            DEBUG=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV    Set environment (development, testing, production)"
            echo "  -d, --debug             Enable debug logging"
            echo "  -h, --help              Show this help message"
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
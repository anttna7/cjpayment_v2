#!/bin/bash

# Recharge Testing System Health Check Script
# This script performs comprehensive health checks on the system

set -euo pipefail

# Configuration
APP_NAME="recharge-system"
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/health}"
METRICS_URL="${METRICS_URL:-http://localhost:8080/metrics}"
TIMEOUT="${TIMEOUT:-10}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2
EXIT_UNKNOWN=3

# Global status
OVERALL_STATUS="OK"
WARNINGS=0
ERRORS=0

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        OK)
            echo -e "${GREEN}[OK]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ((WARNINGS++))
            if [[ "$OVERALL_STATUS" == "OK" ]]; then
                OVERALL_STATUS="WARNING"
            fi
            ;;
        CRITICAL)
            echo -e "${RED}[CRITICAL]${NC} $message"
            ((ERRORS++))
            OVERALL_STATUS="CRITICAL"
            ;;
        INFO)
            if [[ "$VERBOSE" == "true" ]]; then
                echo -e "${BLUE}[INFO]${NC} $message"
            fi
            ;;
    esac
}

# Check if application is running
check_process() {
    log INFO "Checking if $APP_NAME process is running..."
    
    local pid_file="/var/run/${APP_NAME}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log OK "Process is running with PID: $pid"
            return 0
        else
            log CRITICAL "PID file exists but process is not running"
            return 1
        fi
    else
        # Try to find process by name
        if pgrep -f "$APP_NAME" > /dev/null; then
            log WARNING "Process is running but PID file is missing"
            return 0
        else
            log CRITICAL "Process is not running"
            return 1
        fi
    fi
}

# Check HTTP health endpoint
check_http_health() {
    log INFO "Checking HTTP health endpoint..."
    
    local response
    local http_code
    
    if response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null); then
        http_code="${response: -3}"
        response="${response%???}"
        
        if [[ "$http_code" == "200" ]]; then
            log OK "HTTP health check passed (200 OK)"
            
            # Parse JSON response if possible
            if command -v jq &> /dev/null && echo "$response" | jq . > /dev/null 2>&1; then
                local status=$(echo "$response" | jq -r '.status // "unknown"')
                local version=$(echo "$response" | jq -r '.version // "unknown"')
                log INFO "Application status: $status, version: $version"
            fi
            
            return 0
        else
            log CRITICAL "HTTP health check failed with status: $http_code"
            return 1
        fi
    else
        log CRITICAL "HTTP health check failed - cannot connect to $HEALTH_URL"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log INFO "Checking database connectivity..."
    
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-3306}"
    local db_user="${DB_USERNAME:-cjpayment_dev}"
    local db_password="${DB_PASSWORD:-dev_password_123}"
    local db_name="${DB_DATABASE:-cjpayment_recharge_dev}"
    
    if command -v mysql &> /dev/null; then
        if mysql -h "$db_host" -P "$db_port" -u "$db_user" -p"$db_password" \
           -e "SELECT 1;" "$db_name" > /dev/null 2>&1; then
            log OK "Database connection successful"
            return 0
        else
            log CRITICAL "Database connection failed"
            return 1
        fi
    else
        log WARNING "MySQL client not available, skipping database check"
        return 0
    fi
}

# Check Redis connectivity
check_redis() {
    log INFO "Checking Redis connectivity..."
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_password="${REDIS_PASSWORD:-}"
    
    if command -v redis-cli &> /dev/null; then
        local redis_cmd="redis-cli -h $redis_host -p $redis_port"
        if [[ -n "$redis_password" ]]; then
            redis_cmd="$redis_cmd -a $redis_password"
        fi
        
        if $redis_cmd ping > /dev/null 2>&1; then
            log OK "Redis connection successful"
            return 0
        else
            log CRITICAL "Redis connection failed"
            return 1
        fi
    else
        log WARNING "Redis CLI not available, skipping Redis check"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    log INFO "Checking disk space..."
    
    local paths=("/" "/var/log" "/tmp")
    local threshold=90
    
    for path in "${paths[@]}"; do
        if [[ -d "$path" ]]; then
            local usage=$(df "$path" | awk 'NR==2 {print $5}' | sed 's/%//')
            if [[ "$usage" -gt "$threshold" ]]; then
                log CRITICAL "Disk usage for $path is ${usage}% (threshold: ${threshold}%)"
            elif [[ "$usage" -gt 80 ]]; then
                log WARNING "Disk usage for $path is ${usage}%"
            else
                log OK "Disk usage for $path is ${usage}%"
            fi
        fi
    done
}

# Check memory usage
check_memory() {
    log INFO "Checking memory usage..."
    
    if command -v free &> /dev/null; then
        local mem_info=$(free | grep '^Mem:')
        local total=$(echo "$mem_info" | awk '{print $2}')
        local used=$(echo "$mem_info" | awk '{print $3}')
        local usage=$((used * 100 / total))
        
        if [[ "$usage" -gt 90 ]]; then
            log CRITICAL "Memory usage is ${usage}%"
        elif [[ "$usage" -gt 80 ]]; then
            log WARNING "Memory usage is ${usage}%"
        else
            log OK "Memory usage is ${usage}%"
        fi
    else
        log WARNING "Cannot check memory usage - 'free' command not available"
    fi
}

# Check log files
check_logs() {
    log INFO "Checking log files..."
    
    local log_paths=(
        "/var/log/${APP_NAME}/app.log"
        "/var/log/${APP_NAME}/error.log"
    )
    
    for log_path in "${log_paths[@]}"; do
        if [[ -f "$log_path" ]]; then
            local size=$(stat -f%z "$log_path" 2>/dev/null || stat -c%s "$log_path" 2>/dev/null || echo "0")
            local size_mb=$((size / 1024 / 1024))
            
            if [[ "$size_mb" -gt 1000 ]]; then
                log WARNING "Log file $log_path is large (${size_mb}MB)"
            else
                log OK "Log file $log_path size: ${size_mb}MB"
            fi
            
            # Check for recent errors
            if grep -q "ERROR\|FATAL" "$log_path" 2>/dev/null; then
                local error_count=$(grep -c "ERROR\|FATAL" "$log_path" 2>/dev/null || echo "0")
                if [[ "$error_count" -gt 10 ]]; then
                    log WARNING "Found $error_count errors in $log_path"
                fi
            fi
        fi
    done
}

# Check metrics endpoint
check_metrics() {
    log INFO "Checking metrics endpoint..."
    
    if curl -s --max-time "$TIMEOUT" "$METRICS_URL" > /dev/null 2>&1; then
        log OK "Metrics endpoint is accessible"
        return 0
    else
        log WARNING "Metrics endpoint is not accessible"
        return 1
    fi
}

# Check SSL certificate (if HTTPS)
check_ssl() {
    if [[ "$HEALTH_URL" =~ ^https:// ]]; then
        log INFO "Checking SSL certificate..."
        
        local domain=$(echo "$HEALTH_URL" | sed -E 's|https://([^/]+).*|\1|')
        
        if command -v openssl &> /dev/null; then
            local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
            
            if [[ -n "$cert_info" ]]; then
                local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
                local expiry_date=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$not_after" +%s 2>/dev/null)
                local current_date=$(date +%s)
                local days_left=$(( (expiry_date - current_date) / 86400 ))
                
                if [[ "$days_left" -lt 7 ]]; then
                    log CRITICAL "SSL certificate expires in $days_left days"
                elif [[ "$days_left" -lt 30 ]]; then
                    log WARNING "SSL certificate expires in $days_left days"
                else
                    log OK "SSL certificate is valid for $days_left days"
                fi
            else
                log WARNING "Could not retrieve SSL certificate information"
            fi
        else
            log WARNING "OpenSSL not available, skipping SSL check"
        fi
    fi
}

# Generate summary
generate_summary() {
    echo
    echo "=================================="
    echo "Health Check Summary"
    echo "=================================="
    echo "Overall Status: $OVERALL_STATUS"
    echo "Warnings: $WARNINGS"
    echo "Errors: $ERRORS"
    echo "Timestamp: $(date)"
    echo "=================================="
}

# Main execution
main() {
    echo "Starting health check for $APP_NAME..."
    echo
    
    # Run all checks
    check_process
    check_http_health
    check_database
    check_redis
    check_disk_space
    check_memory
    check_logs
    check_metrics
    check_ssl
    
    # Generate summary
    generate_summary
    
    # Exit with appropriate code
    case "$OVERALL_STATUS" in
        "OK")
            exit $EXIT_OK
            ;;
        "WARNING")
            exit $EXIT_WARNING
            ;;
        "CRITICAL")
            exit $EXIT_CRITICAL
            ;;
        *)
            exit $EXIT_UNKNOWN
            ;;
    esac
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url|-u)
            HEALTH_URL="$2"
            shift 2
            ;;
        --timeout|-t)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -u, --url URL        Health check URL (default: http://localhost:8080/health)"
            echo "  -t, --timeout SEC    Request timeout in seconds (default: 10)"
            echo "  -v, --verbose        Enable verbose output"
            echo "  -h, --help           Show this help message"
            echo
            echo "Exit codes:"
            echo "  0 - OK"
            echo "  1 - WARNING"
            echo "  2 - CRITICAL"
            echo "  3 - UNKNOWN"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit $EXIT_UNKNOWN
            ;;
    esac
done

# Run main function
main "$@"
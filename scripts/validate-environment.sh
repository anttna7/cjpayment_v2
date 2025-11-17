#!/bin/bash

# Environment Validation Script for Recharge Testing System
# This script validates the deployment environment and configuration

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_NAME="recharge-system"

# Environment variables
ENVIRONMENT="${ENVIRONMENT:-development}"
CONFIG_FILE="${PROJECT_ROOT}/configs/config.recharge.${ENVIRONMENT}.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        PASS)
            echo -e "${GREEN}[PASS]${NC} $message"
            ((PASSED_CHECKS++))
            ;;
        FAIL)
            echo -e "${RED}[FAIL]${NC} $message"
            ((FAILED_CHECKS++))
            ;;
        WARN)
            echo -e "${YELLOW}[WARN]${NC} $message"
            ((WARNING_CHECKS++))
            ;;
        INFO)
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
    esac
    ((TOTAL_CHECKS++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_system_requirements() {
    echo "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log PASS "Operating system: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log PASS "Operating system: macOS"
    else
        log WARN "Operating system: $OSTYPE (not officially supported)"
    fi
    
    # Check CPU cores
    local cpu_cores
    if command_exists nproc; then
        cpu_cores=$(nproc)
    elif command_exists sysctl; then
        cpu_cores=$(sysctl -n hw.ncpu)
    else
        cpu_cores="unknown"
    fi
    
    if [[ "$cpu_cores" != "unknown" && "$cpu_cores" -ge 2 ]]; then
        log PASS "CPU cores: $cpu_cores"
    elif [[ "$cpu_cores" != "unknown" ]]; then
        log WARN "CPU cores: $cpu_cores (minimum 2 recommended)"
    else
        log WARN "CPU cores: unknown"
    fi
    
    # Check memory
    local memory_gb
    if command_exists free; then
        memory_gb=$(free -g | awk '/^Mem:/{print $2}')
    elif command_exists vm_stat; then
        local pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        memory_gb=$((pages * 4096 / 1024 / 1024 / 1024))
    else
        memory_gb="unknown"
    fi
    
    if [[ "$memory_gb" != "unknown" && "$memory_gb" -ge 4 ]]; then
        log PASS "Memory: ${memory_gb}GB"
    elif [[ "$memory_gb" != "unknown" ]]; then
        log WARN "Memory: ${memory_gb}GB (minimum 4GB recommended)"
    else
        log WARN "Memory: unknown"
    fi
    
    # Check disk space
    local disk_space
    disk_space=$(df -h . | awk 'NR==2 {print $4}')
    if [[ -n "$disk_space" ]]; then
        log PASS "Available disk space: $disk_space"
    else
        log WARN "Could not determine disk space"
    fi
}

# Check required software
check_software_dependencies() {
    echo "Checking software dependencies..."
    
    # Check Go
    if command_exists go; then
        local go_version=$(go version | awk '{print $3}' | sed 's/go//')
        log PASS "Go version: $go_version"
    else
        log FAIL "Go is not installed"
    fi
    
    # Check Docker
    if command_exists docker; then
        local docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        log PASS "Docker version: $docker_version"
        
        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            log PASS "Docker daemon is running"
        else
            log FAIL "Docker daemon is not running"
        fi
    else
        log FAIL "Docker is not installed"
    fi
    
    # Check Docker Compose
    if command_exists docker-compose; then
        local compose_version=$(docker-compose --version | awk '{print $3}' | sed 's/,//')
        log PASS "Docker Compose version: $compose_version"
    else
        log FAIL "Docker Compose is not installed"
    fi
    
    # Check MySQL client
    if command_exists mysql; then
        local mysql_version=$(mysql --version | awk '{print $5}' | sed 's/,//')
        log PASS "MySQL client version: $mysql_version"
    else
        log WARN "MySQL client is not installed (optional for development)"
    fi
    
    # Check Redis CLI
    if command_exists redis-cli; then
        local redis_version=$(redis-cli --version | awk '{print $2}')
        log PASS "Redis CLI version: $redis_version"
    else
        log WARN "Redis CLI is not installed (optional for development)"
    fi
    
    # Check Nginx
    if command_exists nginx; then
        local nginx_version=$(nginx -v 2>&1 | awk '{print $3}' | sed 's/nginx\///')
        log PASS "Nginx version: $nginx_version"
    else
        log WARN "Nginx is not installed (required for production)"
    fi
    
    # Check curl
    if command_exists curl; then
        log PASS "curl is available"
    else
        log FAIL "curl is not installed"
    fi
    
    # Check jq (optional)
    if command_exists jq; then
        log PASS "jq is available"
    else
        log WARN "jq is not installed (optional for JSON processing)"
    fi
}

# Check configuration files
check_configuration() {
    echo "Checking configuration files..."
    
    # Check main config file
    if [[ -f "$CONFIG_FILE" ]]; then
        log PASS "Configuration file exists: $CONFIG_FILE"
        
        # Validate YAML syntax
        if command_exists yq; then
            if yq eval '.' "$CONFIG_FILE" >/dev/null 2>&1; then
                log PASS "Configuration file has valid YAML syntax"
            else
                log FAIL "Configuration file has invalid YAML syntax"
            fi
        elif command_exists python3; then
            if python3 -c "import yaml; yaml.safe_load(open('$CONFIG_FILE'))" 2>/dev/null; then
                log PASS "Configuration file has valid YAML syntax"
            else
                log FAIL "Configuration file has invalid YAML syntax"
            fi
        else
            log WARN "Cannot validate YAML syntax (yq or python3 not available)"
        fi
    else
        log FAIL "Configuration file not found: $CONFIG_FILE"
    fi
    
    # Check environment file
    local env_file="${PROJECT_ROOT}/.env.recharge.${ENVIRONMENT}"
    if [[ -f "$env_file" ]]; then
        log PASS "Environment file exists: $env_file"
    else
        log WARN "Environment file not found: $env_file"
    fi
    
    # Check Docker files
    local dockerfile="${PROJECT_ROOT}/Dockerfile.recharge"
    if [[ -f "$dockerfile" ]]; then
        log PASS "Dockerfile exists: $dockerfile"
    else
        log FAIL "Dockerfile not found: $dockerfile"
    fi
    
    local compose_file="${PROJECT_ROOT}/docker-compose.recharge.${ENVIRONMENT}.yml"
    if [[ -f "$compose_file" ]]; then
        log PASS "Docker Compose file exists: $compose_file"
    else
        log FAIL "Docker Compose file not found: $compose_file"
    fi
    
    # Check Nginx configuration
    local nginx_config="${PROJECT_ROOT}/nginx/recharge.conf"
    if [[ -f "$nginx_config" ]]; then
        log PASS "Nginx configuration exists: $nginx_config"
    else
        log WARN "Nginx configuration not found: $nginx_config"
    fi
}

# Check network connectivity
check_network() {
    echo "Checking network connectivity..."
    
    # Check internet connectivity
    if curl -s --max-time 5 https://google.com >/dev/null 2>&1; then
        log PASS "Internet connectivity is available"
    else
        log WARN "Internet connectivity check failed"
    fi
    
    # Check DNS resolution
    if nslookup google.com >/dev/null 2>&1; then
        log PASS "DNS resolution is working"
    else
        log WARN "DNS resolution check failed"
    fi
    
    # Check required ports
    local ports=("8080" "3306" "6379" "80" "443")
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log WARN "Port $port is already in use"
        else
            log PASS "Port $port is available"
        fi
    done
}

# Check database connectivity
check_database() {
    echo "Checking database connectivity..."
    
    # Extract database configuration from environment or config
    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-3306}"
    local db_user="${DB_USERNAME:-cjpayment_dev}"
    local db_password="${DB_PASSWORD:-dev_password_123}"
    local db_name="${DB_DATABASE:-cjpayment_recharge_dev}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        db_user="${DB_USERNAME:-cjpayment_prod}"
        db_password="${DB_PASSWORD:-}"
        db_name="${DB_DATABASE:-cjpayment_recharge_prod}"
    fi
    
    # Test database connection
    if command_exists mysql; then
        if mysql -h "$db_host" -P "$db_port" -u "$db_user" -p"$db_password" -e "USE $db_name;" 2>/dev/null; then
            log PASS "Database connection successful"
            
            # Check database version
            local db_version=$(mysql -h "$db_host" -P "$db_port" -u "$db_user" -p"$db_password" -e "SELECT VERSION();" 2>/dev/null | tail -n1)
            log PASS "Database version: $db_version"
        else
            log FAIL "Database connection failed"
        fi
    else
        log WARN "MySQL client not available, skipping database check"
    fi
}

# Check Redis connectivity
check_redis() {
    echo "Checking Redis connectivity..."
    
    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_password="${REDIS_PASSWORD:-}"
    
    if command_exists redis-cli; then
        local redis_cmd="redis-cli -h $redis_host -p $redis_port"
        if [[ -n "$redis_password" ]]; then
            redis_cmd="$redis_cmd -a $redis_password"
        fi
        
        if $redis_cmd ping >/dev/null 2>&1; then
            log PASS "Redis connection successful"
            
            # Check Redis version
            local redis_version=$($redis_cmd info server | grep redis_version | cut -d: -f2 | tr -d '\r')
            log PASS "Redis version: $redis_version"
        else
            log FAIL "Redis connection failed"
        fi
    else
        log WARN "Redis CLI not available, skipping Redis check"
    fi
}

# Check file permissions
check_permissions() {
    echo "Checking file permissions..."
    
    # Check project directory permissions
    if [[ -r "$PROJECT_ROOT" && -w "$PROJECT_ROOT" ]]; then
        log PASS "Project directory is readable and writable"
    else
        log FAIL "Project directory permissions are insufficient"
    fi
    
    # Check log directory
    local log_dir="/var/log/$APP_NAME"
    if [[ -d "$log_dir" ]]; then
        if [[ -w "$log_dir" ]]; then
            log PASS "Log directory is writable: $log_dir"
        else
            log FAIL "Log directory is not writable: $log_dir"
        fi
    else
        log WARN "Log directory does not exist: $log_dir"
    fi
    
    # Check uploads directory
    local uploads_dir="${PROJECT_ROOT}/uploads"
    if [[ -d "$uploads_dir" ]]; then
        if [[ -w "$uploads_dir" ]]; then
            log PASS "Uploads directory is writable: $uploads_dir"
        else
            log FAIL "Uploads directory is not writable: $uploads_dir"
        fi
    else
        log WARN "Uploads directory does not exist: $uploads_dir"
    fi
}

# Check security settings
check_security() {
    echo "Checking security settings..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log WARN "Running as root (not recommended for production)"
    else
        log PASS "Not running as root"
    fi
    
    # Check firewall status
    if command_exists ufw; then
        if ufw status | grep -q "Status: active"; then
            log PASS "UFW firewall is active"
        else
            log WARN "UFW firewall is not active"
        fi
    elif command_exists firewall-cmd; then
        if firewall-cmd --state >/dev/null 2>&1; then
            log PASS "Firewalld is active"
        else
            log WARN "Firewalld is not active"
        fi
    else
        log WARN "No firewall detected"
    fi
    
    # Check SSL certificates for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        local cert_file="/etc/ssl/certs/recharge.example.com.crt"
        local key_file="/etc/ssl/private/recharge.example.com.key"
        
        if [[ -f "$cert_file" ]]; then
            log PASS "SSL certificate exists: $cert_file"
            
            # Check certificate expiration
            if command_exists openssl; then
                local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                local current_timestamp=$(date +%s)
                local days_left=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [[ $days_left -gt 30 ]]; then
                    log PASS "SSL certificate expires in $days_left days"
                elif [[ $days_left -gt 0 ]]; then
                    log WARN "SSL certificate expires in $days_left days"
                else
                    log FAIL "SSL certificate has expired"
                fi
            fi
        else
            log WARN "SSL certificate not found: $cert_file"
        fi
        
        if [[ -f "$key_file" ]]; then
            log PASS "SSL private key exists: $key_file"
            
            # Check key permissions
            local key_perms=$(stat -c %a "$key_file" 2>/dev/null || stat -f %A "$key_file" 2>/dev/null)
            if [[ "$key_perms" == "600" ]]; then
                log PASS "SSL private key has correct permissions (600)"
            else
                log WARN "SSL private key permissions should be 600, currently: $key_perms"
            fi
        else
            log WARN "SSL private key not found: $key_file"
        fi
    fi
}

# Check monitoring setup
check_monitoring() {
    echo "Checking monitoring setup..."
    
    # Check if Prometheus is configured
    local prometheus_config="${PROJECT_ROOT}/configs/prometheus.yml"
    if [[ -f "$prometheus_config" ]]; then
        log PASS "Prometheus configuration exists"
    else
        log WARN "Prometheus configuration not found"
    fi
    
    # Check if Grafana dashboard is configured
    local grafana_dashboard="${PROJECT_ROOT}/configs/grafana-dashboard.json"
    if [[ -f "$grafana_dashboard" ]]; then
        log PASS "Grafana dashboard configuration exists"
    else
        log WARN "Grafana dashboard configuration not found"
    fi
    
    # Check log rotation
    local logrotate_config="/etc/logrotate.d/$APP_NAME"
    if [[ -f "$logrotate_config" ]]; then
        log PASS "Log rotation is configured"
    else
        log WARN "Log rotation is not configured"
    fi
}

# Generate summary report
generate_summary() {
    echo
    echo "=================================="
    echo "Environment Validation Summary"
    echo "=================================="
    echo "Environment: $ENVIRONMENT"
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Passed: $PASSED_CHECKS"
    echo "Failed: $FAILED_CHECKS"
    echo "Warnings: $WARNING_CHECKS"
    echo "=================================="
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}✓ Environment validation completed successfully${NC}"
        echo "Success rate: ${success_rate}%"
        return 0
    else
        echo -e "${RED}✗ Environment validation failed${NC}"
        echo "Success rate: ${success_rate}%"
        echo "Please fix the failed checks before proceeding with deployment."
        return 1
    fi
}

# Main execution
main() {
    echo "Starting environment validation for $APP_NAME ($ENVIRONMENT)..."
    echo
    
    check_system_requirements
    echo
    check_software_dependencies
    echo
    check_configuration
    echo
    check_network
    echo
    check_database
    echo
    check_redis
    echo
    check_permissions
    echo
    check_security
    echo
    check_monitoring
    
    generate_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            CONFIG_FILE="${PROJECT_ROOT}/configs/config.recharge.${ENVIRONMENT}.yaml"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --environment ENV    Set environment (development, staging, production)"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
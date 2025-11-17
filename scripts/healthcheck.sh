#!/bin/sh

# Health check script for CJPayment application
set -e

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:8080/health}"
TIMEOUT="${TIMEOUT:-5}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[HEALTH]${NC} $1"
}

print_error() {
    echo -e "${RED}[HEALTH]${NC} $1"
}

# Function to check health endpoint
check_health() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if curl -f -s --max-time $TIMEOUT "$HEALTH_URL" > /dev/null 2>&1; then
            print_status "Health check passed"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            print_warning "Health check failed, retrying ($retry_count/$MAX_RETRIES)..."
            sleep 2
        fi
    done
    
    print_error "Health check failed after $MAX_RETRIES attempts"
    return 1
}

# Function to check database connectivity
check_database() {
    if [ -n "$DATABASE_HOST" ] && [ -n "$DATABASE_USER" ] && [ -n "$DATABASE_DBNAME" ]; then
        print_status "Checking database connectivity..."
        
        # Use pg_isready if available, otherwise skip
        if command -v pg_isready > /dev/null 2>&1; then
            if pg_isready -h "$DATABASE_HOST" -p "${DATABASE_PORT:-5432}" -U "$DATABASE_USER" -d "$DATABASE_DBNAME" > /dev/null 2>&1; then
                print_status "Database connection OK"
                return 0
            else
                print_error "Database connection failed"
                return 1
            fi
        else
            print_warning "pg_isready not available, skipping database check"
            return 0
        fi
    else
        print_warning "Database configuration not found, skipping database check"
        return 0
    fi
}

# Function to check Redis connectivity
check_redis() {
    if [ -n "$REDIS_HOST" ]; then
        print_status "Checking Redis connectivity..."
        
        # Use redis-cli if available, otherwise skip
        if command -v redis-cli > /dev/null 2>&1; then
            if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
                print_status "Redis connection OK"
                return 0
            else
                print_error "Redis connection failed"
                return 1
            fi
        else
            print_warning "redis-cli not available, skipping Redis check"
            return 0
        fi
    else
        print_warning "Redis configuration not found, skipping Redis check"
        return 0
    fi
}

# Function to check disk space
check_disk_space() {
    print_status "Checking disk space..."
    
    # Check if disk usage is above 90%
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 90 ]; then
        print_error "Disk usage is ${disk_usage}% (above 90% threshold)"
        return 1
    elif [ "$disk_usage" -gt 80 ]; then
        print_warning "Disk usage is ${disk_usage}% (above 80% threshold)"
    else
        print_status "Disk usage is ${disk_usage}%"
    fi
    
    return 0
}

# Function to check memory usage
check_memory() {
    print_status "Checking memory usage..."
    
    # Check if memory usage is above 90%
    if [ -f /proc/meminfo ]; then
        mem_total=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
        mem_available=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)
        
        if [ "$mem_total" -gt 0 ] && [ "$mem_available" -gt 0 ]; then
            mem_used=$((mem_total - mem_available))
            mem_usage=$((mem_used * 100 / mem_total))
            
            if [ "$mem_usage" -gt 90 ]; then
                print_error "Memory usage is ${mem_usage}% (above 90% threshold)"
                return 1
            elif [ "$mem_usage" -gt 80 ]; then
                print_warning "Memory usage is ${mem_usage}% (above 80% threshold)"
            else
                print_status "Memory usage is ${mem_usage}%"
            fi
        fi
    else
        print_warning "/proc/meminfo not available, skipping memory check"
    fi
    
    return 0
}

# Main health check function
main() {
    print_status "Starting comprehensive health check..."
    
    local exit_code=0
    
    # Check application health endpoint
    if ! check_health; then
        exit_code=1
    fi
    
    # Check external dependencies (only if health endpoint passed)
    if [ $exit_code -eq 0 ]; then
        if ! check_database; then
            exit_code=1
        fi
        
        if ! check_redis; then
            exit_code=1
        fi
    fi
    
    # Check system resources
    if ! check_disk_space; then
        exit_code=1
    fi
    
    if ! check_memory; then
        exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        print_status "All health checks passed"
    else
        print_error "One or more health checks failed"
    fi
    
    exit $exit_code
}

# Run main function
main "$@"
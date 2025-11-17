#!/bin/bash

# Recharge Testing System Stop Script
# This script gracefully stops the recharge testing system

set -euo pipefail

# Configuration
APP_NAME="recharge-system"
PID_FILE="/var/run/${APP_NAME}.pid"
LOG_FILE="/var/log/${APP_NAME}/shutdown.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    esac
}

# Stop the application
stop_application() {
    if [[ ! -f "$PID_FILE" ]]; then
        log WARN "PID file not found: $PID_FILE"
        log INFO "Application may not be running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if ! kill -0 "$pid" 2>/dev/null; then
        log WARN "Process with PID $pid is not running"
        rm -f "$PID_FILE"
        return 0
    fi
    
    log INFO "Stopping $APP_NAME with PID: $pid"
    
    # Send TERM signal for graceful shutdown
    kill -TERM "$pid"
    
    # Wait for graceful shutdown
    local max_wait=30
    local wait_time=0
    
    while kill -0 "$pid" 2>/dev/null && [[ $wait_time -lt $max_wait ]]; do
        sleep 1
        ((wait_time++))
        log INFO "Waiting for graceful shutdown... ($wait_time/$max_wait)"
    done
    
    # Check if process is still running
    if kill -0 "$pid" 2>/dev/null; then
        log WARN "Process didn't stop gracefully, forcing termination"
        kill -KILL "$pid"
        sleep 2
        
        if kill -0 "$pid" 2>/dev/null; then
            log ERROR "Failed to stop process with PID: $pid"
            return 1
        fi
    fi
    
    # Remove PID file
    rm -f "$PID_FILE"
    log INFO "$APP_NAME stopped successfully"
    return 0
}

# Main execution
main() {
    log INFO "Stopping $APP_NAME..."
    
    if stop_application; then
        log INFO "$APP_NAME shutdown completed"
    else
        log ERROR "$APP_NAME shutdown failed"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -f, --force    Force kill the process"
            echo "  -h, --help     Show this help message"
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
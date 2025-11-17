#!/bin/bash

# Simple validation environment startup script (without Docker)
echo "Starting CJPayment validation environment on port 8091..."

# Set environment variables
export CONFIG_ENV=validation
export GIN_MODE=debug
export SERVER_PORT=8091

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")/.."

# Check if database services are running
echo "Checking database services..."
if ! nc -z localhost 5434 2>/dev/null; then
    echo "Warning: PostgreSQL not running on port 5434. Starting Docker services..."
    docker-compose up -d postgres redis
    echo "Waiting for database to be ready..."
    sleep 10
fi

# Build the application
echo "Building application..."
go build -o cjpayment-validation ./cmd/api

if [ $? -ne 0 ]; then
    echo "Error: Failed to build application"
    exit 1
fi

# Start the application
echo "Starting application on port 8091..."
echo ""
echo "🚀 Validation Environment Ready!"
echo "📊 Validation Dashboard: http://localhost:8091/validation"
echo "🏠 Main Dashboard: http://localhost:8091/dashboard"
echo "💳 Recharge Management: http://localhost:8091/recharge_management"
echo "⚙️  System Management: http://localhost:8091/system_management"
echo "📈 Report Center: http://localhost:8091/report_dashboard"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

CONFIG_ENV=validation ./cjpayment-validation
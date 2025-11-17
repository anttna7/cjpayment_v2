#!/bin/bash

# Start validation environment on port 8091
echo "Starting CJPayment validation environment on port 8091..."

# Set environment variables
export CONFIG_ENV=validation
export GIN_MODE=debug

# Build the application
echo "Building application..."
go build -o cjpayment-validation ./cmd/api

# Start database and Redis services
echo "Starting database and Redis services..."
docker-compose -f docker-compose.validation.yml up -d postgres-validation redis-validation

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
go run ./cmd/migrate -config=./configs/config.validation.yaml

# Start the application
echo "Starting application on port 8091..."
CONFIG_FILE=./configs/config.validation.yaml ./cjpayment-validation

echo "Validation environment started successfully!"
echo "Access the application at: http://localhost:8091"
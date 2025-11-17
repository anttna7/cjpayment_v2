#!/bin/bash

# Integration Test Runner Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting CJPayment Integration Tests...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Function to cleanup
cleanup() {
    echo -e "${YELLOW}Cleaning up test environment...${NC}"
    docker-compose -f docker-compose.test.yml down -v
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start test databases
echo -e "${YELLOW}Starting test databases...${NC}"
docker-compose -f docker-compose.test.yml up -d

# Wait for databases to be ready
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 10

# Check if databases are healthy
echo -e "${YELLOW}Checking database health...${NC}"
if ! docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
    echo -e "${RED}Error: Test databases are not healthy${NC}"
    docker-compose -f docker-compose.test.yml logs
    exit 1
fi

# Set test environment variables
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5433
export TEST_DB_USER=cjpayment_test
export TEST_DB_PASSWORD=test_password
export TEST_DB_NAME=cjpayment_test
export TEST_REDIS_HOST=localhost
export TEST_REDIS_PORT=6380
export TEST_REDIS_PASSWORD=""

# Run the integration tests
echo -e "${YELLOW}Running integration tests...${NC}"
cd ../..

# Run tests with verbose output and coverage
if go test -v -race -coverprofile=coverage.out ./tests/integration/...; then
    echo -e "${GREEN}✅ All integration tests passed!${NC}"
    
    # Generate coverage report
    echo -e "${YELLOW}Generating coverage report...${NC}"
    go tool cover -html=coverage.out -o tests/integration/coverage.html
    echo -e "${GREEN}Coverage report generated: tests/integration/coverage.html${NC}"
    
    # Show coverage summary
    go tool cover -func=coverage.out | tail -1
    
    exit 0
else
    echo -e "${RED}❌ Integration tests failed!${NC}"
    exit 1
fi
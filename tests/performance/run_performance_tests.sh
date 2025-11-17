#!/bin/bash

# Performance Test Runner Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting CJPayment Performance Tests...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Function to cleanup
cleanup() {
    echo -e "${YELLOW}Cleaning up test environment...${NC}"
    docker-compose -f ../integration/docker-compose.test.yml down -v
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start test databases
echo -e "${YELLOW}Starting test databases...${NC}"
docker-compose -f ../integration/docker-compose.test.yml up -d

# Wait for databases to be ready
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 15

# Check if databases are healthy
echo -e "${YELLOW}Checking database health...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f ../integration/docker-compose.test.yml ps | grep -q "healthy"; then
        echo -e "${GREEN}Databases are healthy${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for databases... (attempt $attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Error: Test databases failed to become healthy${NC}"
    docker-compose -f ../integration/docker-compose.test.yml logs
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

# Navigate to project root
cd ../..

echo -e "${BLUE}Running Performance Tests...${NC}"

# Test options
VERBOSE=""
COVERAGE=""
BENCHTIME="30s"
PARALLEL=4

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE="-v"
            shift
            ;;
        -c|--coverage)
            COVERAGE="-coverprofile=performance_coverage.out"
            shift
            ;;
        -t|--time)
            BENCHTIME="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -v, --verbose     Enable verbose output"
            echo "  -c, --coverage    Enable coverage reporting"
            echo "  -t, --time TIME   Set benchmark time (default: 30s)"
            echo "  -p, --parallel N  Set parallel test count (default: 4)"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Run different types of performance tests

echo -e "${YELLOW}1. Running Concurrent Recharge Tests...${NC}"
if go test $VERBOSE $COVERAGE -timeout=10m -parallel=$PARALLEL ./tests/performance -run TestConcurrentRecharge; then
    echo -e "${GREEN}✅ Concurrent recharge tests passed${NC}"
else
    echo -e "${RED}❌ Concurrent recharge tests failed${NC}"
    exit 1
fi

echo -e "${YELLOW}2. Running Database Performance Tests...${NC}"
if go test $VERBOSE -timeout=5m -parallel=$PARALLEL ./tests/performance -run TestDatabasePerformance; then
    echo -e "${GREEN}✅ Database performance tests passed${NC}"
else
    echo -e "${RED}❌ Database performance tests failed${NC}"
    exit 1
fi

echo -e "${YELLOW}3. Running Memory Usage Tests...${NC}"
if go test $VERBOSE -timeout=5m ./tests/performance -run TestMemoryUsage; then
    echo -e "${GREEN}✅ Memory usage tests passed${NC}"
else
    echo -e "${RED}❌ Memory usage tests failed${NC}"
    exit 1
fi

echo -e "${YELLOW}4. Running Load Tests...${NC}"
if go test $VERBOSE -timeout=15m ./tests/performance -run TestSystemLoadCapacity; then
    echo -e "${GREEN}✅ Load tests passed${NC}"
else
    echo -e "${RED}❌ Load tests failed${NC}"
    exit 1
fi

# Optional: Run stress tests (can be resource intensive)
read -p "Run stress tests? This may take several minutes and use significant resources. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}5. Running Stress Tests...${NC}"
    if go test $VERBOSE -timeout=20m ./tests/performance -run TestStressTest; then
        echo -e "${GREEN}✅ Stress tests passed${NC}"
    else
        echo -e "${RED}❌ Stress tests failed${NC}"
        exit 1
    fi

    echo -e "${YELLOW}6. Running Spike Tests...${NC}"
    if go test $VERBOSE -timeout=10m ./tests/performance -run TestSpikeTest; then
        echo -e "${GREEN}✅ Spike tests passed${NC}"
    else
        echo -e "${RED}❌ Spike tests failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Skipping stress and spike tests${NC}"
fi

# Generate coverage report if requested
if [[ -n "$COVERAGE" ]]; then
    echo -e "${YELLOW}Generating coverage report...${NC}"
    if [[ -f "performance_coverage.out" ]]; then
        go tool cover -html=performance_coverage.out -o tests/performance/performance_coverage.html
        echo -e "${GREEN}Performance coverage report generated: tests/performance/performance_coverage.html${NC}"
        
        # Show coverage summary
        echo -e "${YELLOW}Coverage Summary:${NC}"
        go tool cover -func=performance_coverage.out | tail -1
    fi
fi

# Run benchmarks
echo -e "${YELLOW}Running Benchmarks...${NC}"
if go test -bench=. -benchtime=$BENCHTIME -benchmem ./tests/performance > benchmark_results.txt 2>&1; then
    echo -e "${GREEN}✅ Benchmarks completed${NC}"
    echo -e "${YELLOW}Benchmark Results:${NC}"
    cat benchmark_results.txt
else
    echo -e "${RED}❌ Benchmarks failed${NC}"
    cat benchmark_results.txt
fi

# System resource usage summary
echo -e "${BLUE}=== System Resource Usage Summary ===${NC}"
echo -e "${YELLOW}CPU Usage:${NC}"
top -l 1 -n 0 | grep "CPU usage" || echo "CPU usage information not available"

echo -e "${YELLOW}Memory Usage:${NC}"
top -l 1 -n 0 | grep "PhysMem" || echo "Memory usage information not available"

echo -e "${YELLOW}Docker Container Stats:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" || echo "Docker stats not available"

echo -e "${GREEN}🎉 All performance tests completed successfully!${NC}"

# Performance recommendations
echo -e "${BLUE}=== Performance Recommendations ===${NC}"
echo -e "${YELLOW}Based on the test results, consider the following optimizations:${NC}"
echo "1. Monitor database connection pool usage and adjust if needed"
echo "2. Implement caching for frequently accessed data"
echo "3. Consider horizontal scaling if throughput requirements increase"
echo "4. Monitor memory usage patterns and optimize garbage collection"
echo "5. Set up monitoring and alerting for production environments"

exit 0
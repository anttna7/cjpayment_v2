#!/bin/bash

# Test runner script for the recharge testing system
# This script runs different types of tests based on the provided arguments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="unit"
VERBOSE=false
COVERAGE=false
RACE=false
PARALLEL=4
TIMEOUT="10m"
DATABASE_DSN="root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
REDIS_ADDR="localhost:6379"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE        Test type: unit, integration, performance, e2e, all (default: unit)"
    echo "  -v, --verbose          Enable verbose output"
    echo "  -c, --coverage         Generate coverage report"
    echo "  -r, --race             Enable race detection"
    echo "  -p, --parallel NUM     Number of parallel test processes (default: 4)"
    echo "  --timeout DURATION     Test timeout (default: 10m)"
    echo "  --db-dsn DSN          Database DSN for integration tests"
    echo "  --redis-addr ADDR     Redis address for integration tests"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Run unit tests"
    echo "  $0 -t integration -c   # Run integration tests with coverage"
    echo "  $0 -t all -v -r        # Run all tests with verbose output and race detection"
    echo "  $0 -t performance      # Run performance tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -r|--race)
            RACE=true
            shift
            ;;
        -p|--parallel)
            PARALLEL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --db-dsn)
            DATABASE_DSN="$2"
            shift 2
            ;;
        --redis-addr)
            REDIS_ADDR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate test type
case $TEST_TYPE in
    unit|integration|performance|e2e|all)
        ;;
    *)
        print_color $RED "Error: Invalid test type '$TEST_TYPE'"
        usage
        exit 1
        ;;
esac

# Set environment variables
export TEST_DATABASE_DSN="$DATABASE_DSN"
export TEST_REDIS_ADDR="$REDIS_ADDR"
export TEST_MODE="$TEST_TYPE"

# Build test flags
TEST_FLAGS=""
if [ "$VERBOSE" = true ]; then
    TEST_FLAGS="$TEST_FLAGS -v"
fi
if [ "$RACE" = true ]; then
    TEST_FLAGS="$TEST_FLAGS -race"
fi
TEST_FLAGS="$TEST_FLAGS -parallel $PARALLEL -timeout $TIMEOUT"

# Coverage flags
COVERAGE_FLAGS=""
if [ "$COVERAGE" = true ]; then
    COVERAGE_FLAGS="-coverprofile=coverage.out -covermode=atomic"
fi

# Function to run tests
run_tests() {
    local test_pattern=$1
    local test_name=$2
    
    print_color $BLUE "Running $test_name tests..."
    
    if go test $TEST_FLAGS $COVERAGE_FLAGS $test_pattern; then
        print_color $GREEN "✓ $test_name tests passed"
        return 0
    else
        print_color $RED "✗ $test_name tests failed"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_color $BLUE "Checking prerequisites..."
    
    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        print_color $RED "Error: Go is not installed"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "go.mod" ]; then
        print_color $RED "Error: go.mod not found. Please run this script from the project root."
        exit 1
    fi
    
    # For integration tests, check database connectivity
    if [[ "$TEST_TYPE" == "integration" || "$TEST_TYPE" == "e2e" || "$TEST_TYPE" == "all" ]]; then
        print_color $BLUE "Checking database connectivity..."
        if ! go run -tags tools scripts/check_db_connection.go; then
            print_color $RED "Error: Cannot connect to test database"
            print_color $YELLOW "Please ensure MySQL is running and the test database exists"
            exit 1
        fi
    fi
    
    print_color $GREEN "✓ Prerequisites check passed"
}

# Function to setup test database
setup_test_database() {
    print_color $BLUE "Setting up test database..."
    
    # Create test database if it doesn't exist
    mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS cjpayment_test;" 2>/dev/null || {
        print_color $YELLOW "Warning: Could not create test database. It may already exist."
    }
    
    print_color $GREEN "✓ Test database setup completed"
}

# Function to cleanup after tests
cleanup() {
    if [ "$COVERAGE" = true ] && [ -f "coverage.out" ]; then
        print_color $BLUE "Generating coverage report..."
        go tool cover -html=coverage.out -o coverage.html
        go tool cover -func=coverage.out | tail -1
        print_color $GREEN "✓ Coverage report generated: coverage.html"
    fi
}

# Main execution
main() {
    print_color $BLUE "Starting test execution..."
    print_color $BLUE "Test type: $TEST_TYPE"
    print_color $BLUE "Parallel processes: $PARALLEL"
    print_color $BLUE "Timeout: $TIMEOUT"
    
    check_prerequisites
    
    # Setup database for integration tests
    if [[ "$TEST_TYPE" == "integration" || "$TEST_TYPE" == "e2e" || "$TEST_TYPE" == "all" ]]; then
        setup_test_database
    fi
    
    # Track test results
    FAILED_TESTS=()
    
    case $TEST_TYPE in
        unit)
            run_tests "./internal/service/..." "Unit (Service)" || FAILED_TESTS+=("Unit Service")
            run_tests "./internal/repository/..." "Unit (Repository)" || FAILED_TESTS+=("Unit Repository")
            run_tests "./internal/handler/..." "Unit (Handler)" || FAILED_TESTS+=("Unit Handler")
            ;;
        integration)
            run_tests "./internal/repository/*integration_test.go" "Integration (Repository)" || FAILED_TESTS+=("Integration Repository")
            run_tests "./internal/handler/*integration_test.go" "Integration (Handler)" || FAILED_TESTS+=("Integration Handler")
            ;;
        performance)
            run_tests "./internal/service/*performance_test.go" "Performance (Service)" || FAILED_TESTS+=("Performance Service")
            run_tests "./tests/performance/..." "Performance (System)" || FAILED_TESTS+=("Performance System")
            ;;
        e2e)
            run_tests "./tests/integration/..." "End-to-End" || FAILED_TESTS+=("End-to-End")
            ;;
        all)
            # Unit tests
            run_tests "./internal/service/..." "Unit (Service)" || FAILED_TESTS+=("Unit Service")
            run_tests "./internal/repository/..." "Unit (Repository)" || FAILED_TESTS+=("Unit Repository")
            run_tests "./internal/handler/..." "Unit (Handler)" || FAILED_TESTS+=("Unit Handler")
            
            # Integration tests
            run_tests "./internal/repository/*integration_test.go" "Integration (Repository)" || FAILED_TESTS+=("Integration Repository")
            run_tests "./internal/handler/*integration_test.go" "Integration (Handler)" || FAILED_TESTS+=("Integration Handler")
            
            # Performance tests
            run_tests "./internal/service/*performance_test.go" "Performance (Service)" || FAILED_TESTS+=("Performance Service")
            run_tests "./tests/performance/..." "Performance (System)" || FAILED_TESTS+=("Performance System")
            
            # End-to-end tests
            run_tests "./tests/integration/..." "End-to-End" || FAILED_TESTS+=("End-to-End")
            ;;
    esac
    
    # Cleanup and report results
    cleanup
    
    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        print_color $GREEN "🎉 All tests passed!"
        exit 0
    else
        print_color $RED "❌ Some tests failed:"
        for test in "${FAILED_TESTS[@]}"; do
            print_color $RED "  - $test"
        done
        exit 1
    fi
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
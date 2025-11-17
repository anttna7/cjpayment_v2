# Testing Guide for Recharge Testing System

This document provides comprehensive information about testing the recharge testing system, including test types, setup instructions, and best practices.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The recharge testing system includes comprehensive test coverage across multiple layers:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions with real dependencies
- **Performance Tests**: Measure system performance under various loads
- **End-to-End Tests**: Test complete user workflows
- **API Tests**: Test HTTP endpoints and API contracts

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, methods, and components in isolation using mocks and stubs.

**Location**: `internal/service/*_test.go`, `internal/repository/*_test.go`, `internal/handler/*_test.go`

**Characteristics**:
- Fast execution (< 1ms per test)
- No external dependencies
- High code coverage
- Use mocks for dependencies

**Example**:
```go
func TestMerchantService_CreateMerchant_Success(t *testing.T) {
    // Arrange
    mockRepo := new(MockMerchantRepository)
    service := NewMerchantService(mockRepo)
    
    req := &CreateMerchantRequest{
        Name: "Test Merchant",
        Email: "test@example.com",
    }
    
    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*repository.Merchant")).Return(nil)
    
    // Act
    result, err := service.CreateMerchant(context.Background(), req)
    
    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, result)
    mockRepo.AssertExpectations(t)
}
```

### Integration Tests

Integration tests verify that components work correctly when integrated with real dependencies like databases and external services.

**Location**: `internal/repository/*_integration_test.go`, `internal/handler/*_integration_test.go`

**Characteristics**:
- Use real database connections
- Test actual SQL queries and transactions
- Verify data persistence and retrieval
- Test error scenarios with real dependencies

**Example**:
```go
func TestMerchantRepository_Create_Success(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    repo := NewMerchantRepository(db)
    
    merchant := &Merchant{
        Name: "Integration Test Merchant",
        Email: "integration@example.com",
    }
    
    // Act
    err := repo.Create(context.Background(), merchant)
    
    // Assert
    assert.NoError(t, err)
    assert.NotZero(t, merchant.ID)
    
    // Verify in database
    var dbMerchant Merchant
    err = db.First(&dbMerchant, merchant.ID).Error
    assert.NoError(t, err)
    assert.Equal(t, merchant.Name, dbMerchant.Name)
}
```

### Performance Tests

Performance tests measure system performance, latency, and throughput under various load conditions.

**Location**: `internal/service/*_performance_test.go`, `tests/performance/`

**Characteristics**:
- Benchmark functions using `testing.B`
- Measure latency, throughput, and resource usage
- Test concurrent operations
- Identify performance bottlenecks

**Example**:
```go
func BenchmarkAccountMatcher_Match(b *testing.B) {
    matcher := setupAccountMatcher()
    req := &MatchRequest{
        MerchantID: 1,
        PaymentType: "corporate",
        Amount: decimal.NewFromFloat(1000.00),
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, err := matcher.Match(context.Background(), req)
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

### End-to-End Tests

End-to-end tests verify complete user workflows from API requests to database persistence.

**Location**: `tests/integration/`

**Characteristics**:
- Test complete user scenarios
- Use real HTTP requests
- Verify data flow through all layers
- Test error handling and edge cases

**Example**:
```go
func TestCompleteRechargeFlow(t *testing.T) {
    // Setup test environment
    router := setupTestRouter()
    
    // Step 1: Create recharge order
    createReq := map[string]interface{}{
        "merchant_id": 1,
        "payer_name": "John Doe",
        "amount": "1000.00",
        "payment_type": "corporate",
    }
    
    resp := makeRequest(router, "POST", "/api/v1/recharge/orders", createReq)
    assert.Equal(t, http.StatusCreated, resp.Code)
    
    // Step 2: Upload payment proof
    // Step 3: Update order status
    // Step 4: Verify final state
}
```

## Setup

### Prerequisites

1. **Go 1.21+**: Ensure Go is installed and properly configured
2. **MySQL 8.0+**: Required for integration and E2E tests
3. **Redis 6.0+**: Required for caching tests (optional)
4. **Make**: For running test commands

### Database Setup

Create a test database for integration tests:

```sql
CREATE DATABASE cjpayment_test;
GRANT ALL PRIVILEGES ON cjpayment_test.* TO 'root'@'localhost';
```

### Environment Variables

Set the following environment variables for tests:

```bash
export TEST_DATABASE_DSN="root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
export TEST_REDIS_ADDR="localhost:6379"
export TEST_MODE="unit"  # or integration, performance, e2e, all
```

## Running Tests

### Using the Test Script

The project includes a comprehensive test runner script:

```bash
# Run unit tests
./scripts/run_tests.sh

# Run integration tests with coverage
./scripts/run_tests.sh -t integration -c

# Run all tests with verbose output and race detection
./scripts/run_tests.sh -t all -v -r

# Run performance tests
./scripts/run_tests.sh -t performance

# Run with custom database settings
./scripts/run_tests.sh -t integration --db-dsn "custom_dsn"
```

### Using Go Commands

```bash
# Unit tests
go test ./internal/service/... -v

# Integration tests
go test ./internal/repository/... -tags=integration -v

# Performance tests
go test ./internal/service/... -bench=. -benchmem

# All tests with coverage
go test ./... -coverprofile=coverage.out -covermode=atomic

# Race detection
go test ./... -race
```

### Using Make

```bash
# Run unit tests
make test

# Run integration tests
make test-integration

# Run performance tests
make test-performance

# Run all tests
make test-all

# Generate coverage report
make coverage
```

## Test Structure

### Directory Structure

```
cjpayment/
├── internal/
│   ├── service/
│   │   ├── merchant_service.go
│   │   ├── merchant_service_test.go              # Unit tests
│   │   ├── merchant_service_comprehensive_test.go # Comprehensive unit tests
│   │   └── merchant_service_performance_test.go   # Performance tests
│   ├── repository/
│   │   ├── merchant_repository.go
│   │   ├── merchant_repository_test.go           # Unit tests
│   │   └── merchant_repository_integration_test.go # Integration tests
│   └── handler/
│       ├── recharge_handler.go
│       ├── recharge_handler_test.go              # Unit tests
│       └── recharge_api_integration_test.go      # API integration tests
├── tests/
│   ├── integration/
│   │   ├── recharge_flow_e2e_test.go            # End-to-end tests
│   │   └── setup_test.go                        # Test setup utilities
│   ├── performance/
│   │   └── load_test.go                         # System performance tests
│   └── test_config.go                           # Test configuration
└── scripts/
    ├── run_tests.sh                             # Test runner script
    └── check_db_connection.go                   # Database connectivity check
```

### Test Naming Conventions

- **Unit tests**: `*_test.go`
- **Integration tests**: `*_integration_test.go`
- **Performance tests**: `*_performance_test.go` or `*_benchmark_test.go`
- **End-to-end tests**: `*_e2e_test.go`

### Test Function Naming

```go
// Unit tests
func TestServiceName_MethodName_Scenario(t *testing.T)
func TestMerchantService_CreateMerchant_Success(t *testing.T)
func TestMerchantService_CreateMerchant_ValidationError(t *testing.T)

// Benchmark tests
func BenchmarkServiceName_MethodName(b *testing.B)
func BenchmarkAccountMatcher_Match(b *testing.B)

// Table-driven tests
func TestMerchantService_CreateMerchant(t *testing.T) {
    testCases := []struct {
        name string
        // test case fields
    }{
        // test cases
    }
}
```

## Writing Tests

### Best Practices

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should clearly describe what is being tested
3. **Test One Thing**: Each test should focus on a single behavior
4. **Use Table-Driven Tests**: For testing multiple scenarios
5. **Mock External Dependencies**: Use mocks for unit tests
6. **Clean Up Resources**: Ensure proper cleanup in integration tests

### Mock Usage

```go
// Define mock interface
type MockMerchantRepository struct {
    mock.Mock
}

func (m *MockMerchantRepository) Create(ctx context.Context, merchant *Merchant) error {
    args := m.Called(ctx, merchant)
    return args.Error(0)
}

// Use in tests
func TestMerchantService_CreateMerchant(t *testing.T) {
    mockRepo := new(MockMerchantRepository)
    service := NewMerchantService(mockRepo)
    
    // Setup expectations
    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*Merchant")).Return(nil)
    
    // Execute test
    err := service.CreateMerchant(context.Background(), &CreateMerchantRequest{})
    
    // Verify expectations
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}
```

### Test Suites

Use testify suites for complex test scenarios:

```go
type MerchantServiceTestSuite struct {
    suite.Suite
    service  MerchantService
    mockRepo *MockMerchantRepository
}

func (suite *MerchantServiceTestSuite) SetupTest() {
    suite.mockRepo = new(MockMerchantRepository)
    suite.service = NewMerchantService(suite.mockRepo)
}

func (suite *MerchantServiceTestSuite) TestCreateMerchant_Success() {
    // Test implementation
}

func TestMerchantServiceTestSuite(t *testing.T) {
    suite.Run(t, new(MerchantServiceTestSuite))
}
```

## Coverage

### Generating Coverage Reports

```bash
# Generate coverage profile
go test ./... -coverprofile=coverage.out

# View coverage in terminal
go tool cover -func=coverage.out

# Generate HTML coverage report
go tool cover -html=coverage.out -o coverage.html
```

### Coverage Targets

- **Unit Tests**: > 90% coverage
- **Integration Tests**: > 80% coverage
- **Overall**: > 85% coverage

### Coverage Exclusions

Some code may be excluded from coverage requirements:
- Generated code
- Main functions
- Configuration loading
- Error handling for impossible scenarios

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: cjpayment_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-go@v3
      with:
        go-version: '1.21'
    
    - name: Run unit tests
      run: ./scripts/run_tests.sh -t unit -c
    
    - name: Run integration tests
      run: ./scripts/run_tests.sh -t integration -c
      env:
        TEST_DATABASE_DSN: "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.out
```

### Pre-commit Hooks

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run unit tests before commit
./scripts/run_tests.sh -t unit

if [ $? -ne 0 ]; then
    echo "Unit tests failed. Commit aborted."
    exit 1
fi
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```
   Error: Cannot connect to test database
   ```
   - Ensure MySQL is running
   - Check database credentials
   - Verify test database exists

2. **Race Condition Failures**
   ```
   WARNING: DATA RACE
   ```
   - Run tests with `-race` flag to identify race conditions
   - Use proper synchronization in concurrent code

3. **Timeout Errors**
   ```
   Test timeout exceeded
   ```
   - Increase timeout with `-timeout` flag
   - Optimize slow tests
   - Check for deadlocks

4. **Memory Issues**
   ```
   runtime: out of memory
   ```
   - Check for memory leaks in tests
   - Reduce test data size
   - Run tests with smaller parallelism

### Debug Tips

1. **Verbose Output**: Use `-v` flag for detailed test output
2. **Run Single Test**: `go test -run TestSpecificTest`
3. **Debug with Delve**: `dlv test -- -test.run TestSpecificTest`
4. **Profile Tests**: Use `-cpuprofile` and `-memprofile` flags

### Performance Debugging

```bash
# CPU profiling
go test -cpuprofile=cpu.prof -bench=.

# Memory profiling
go test -memprofile=mem.prof -bench=.

# View profiles
go tool pprof cpu.prof
go tool pprof mem.prof
```

## Test Data Management

### Test Fixtures

Create reusable test data:

```go
func CreateTestMerchant() *Merchant {
    return &Merchant{
        Name: "Test Merchant",
        Email: "test@example.com",
        Status: "active",
    }
}
```

### Database Seeding

```go
func SeedTestDatabase(db *gorm.DB) error {
    merchants := []*Merchant{
        CreateTestMerchant(),
        // more test data
    }
    
    return db.Create(&merchants).Error
}
```

### Cleanup

```go
func CleanupTestData(db *gorm.DB) error {
    tables := []string{"recharge_orders", "merchants"}
    for _, table := range tables {
        if err := db.Exec("DELETE FROM " + table).Error; err != nil {
            return err
        }
    }
    return nil
}
```

This comprehensive testing guide ensures that the recharge testing system maintains high quality, reliability, and performance through thorough testing practices.
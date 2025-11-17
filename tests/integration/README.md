# CJPayment Integration Tests

This directory contains comprehensive integration tests for the CJPayment system. These tests verify the complete functionality of the system including API endpoints, database operations, external system integrations, and business workflows.

## Test Structure

### Test Suites

1. **RechargeFlowTestSuite** (`recharge_flow_test.go`)
   - Tests complete recharge workflows (private and public)
   - Verifies account rotation and limit management
   - Tests end-to-end payment processing

2. **PermissionTestSuite** (`permission_test.go`)
   - Tests RBAC (Role-Based Access Control) system
   - Verifies JWT token authentication and authorization
   - Tests permission inheritance and multi-role scenarios

3. **ExternalSystemTestSuite** (`external_system_test.go`)
   - Tests webhook notifications to external systems
   - Verifies bank callback integration
   - Tests third-party payment provider integration
   - Tests retry mechanisms and timeout handling

### Base Test Suite

The `IntegrationTestSuite` in `setup_test.go` provides:
- Test database setup and cleanup
- Redis integration testing
- Mock server management
- Common test utilities

## Prerequisites

Before running integration tests, ensure you have:

1. **Docker and Docker Compose** installed
2. **Go 1.24+** installed
3. **Make** utility (optional, for using Makefile targets)

## Running Tests

### Option 1: Using the Test Script (Recommended)

```bash
# Navigate to the integration tests directory
cd tests/integration

# Run the test script
./run_tests.sh
```

### Option 2: Using Makefile

```bash
# From the project root directory
make test-integration

# Or run all tests (unit + integration)
make test-all
```

### Option 3: Manual Setup

1. Start test databases:
```bash
cd tests/integration
docker-compose -f docker-compose.test.yml up -d
```

2. Set environment variables:
```bash
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5433
export TEST_DB_USER=cjpayment_test
export TEST_DB_PASSWORD=test_password
export TEST_DB_NAME=cjpayment_test
export TEST_REDIS_HOST=localhost
export TEST_REDIS_PORT=6380
```

3. Run tests:
```bash
cd ../..
go test -v ./tests/integration/...
```

4. Cleanup:
```bash
cd tests/integration
docker-compose -f docker-compose.test.yml down -v
```

## Test Configuration

### Environment Variables

The tests use the following environment variables (with defaults):

- `TEST_DB_HOST` (default: localhost)
- `TEST_DB_PORT` (default: 5432)
- `TEST_DB_USER` (default: cjpayment_test)
- `TEST_DB_PASSWORD` (default: test_password)
- `TEST_DB_NAME` (default: cjpayment_test)
- `TEST_REDIS_HOST` (default: localhost)
- `TEST_REDIS_PORT` (default: 6379)
- `TEST_REDIS_PASSWORD` (default: "")

### Test Database

The integration tests use a separate PostgreSQL database (`cjpayment_test`) to avoid interfering with development data. The test suite:

1. Runs database migrations before tests
2. Cleans up data between test cases
3. Uses transactions where appropriate

### Test Redis

A separate Redis instance is used for testing caching and pub/sub functionality.

## Test Coverage

The integration tests cover:

### API Endpoints
- Authentication and authorization
- Recharge order management
- Merchant and account management
- Report generation
- Webhook management

### Business Workflows
- Complete recharge flows (private and public)
- Financial audit processes
- Account rotation algorithms
- Limit management and validation

### External Integrations
- Webhook notifications to ad systems
- Bank callback processing
- Third-party payment provider integration
- Notification retry mechanisms

### System Components
- Database operations and transactions
- Redis caching and pub/sub
- JWT token management
- Permission and role validation

## Writing New Tests

### Adding Test Cases

1. Create a new test method in the appropriate test suite
2. Follow the naming convention: `TestFeatureName`
3. Use the setup methods to create test data
4. Make HTTP requests using the helper methods
5. Assert expected results using testify assertions

### Example Test Case

```go
func (suite *RechargeFlowTestSuite) TestNewFeature() {
    // Step 1: Setup test data
    user := suite.createTestUser("test_user", "test@example.com", "password")
    token := suite.loginUser("test_user", "password")
    
    // Step 2: Make API request
    req := map[string]interface{}{
        "field1": "value1",
        "field2": "value2",
    }
    resp := suite.makeAuthenticatedRequest("POST", "/api/endpoint", token, req)
    
    // Step 3: Assert results
    suite.Equal(http.StatusOK, resp.Code)
    
    var result map[string]interface{}
    err := json.Unmarshal(resp.Body.Bytes(), &result)
    suite.NoError(err)
    suite.Equal("expected_value", result["field"])
}
```

### Helper Methods

The test suites provide helper methods for:
- Creating test users, merchants, and accounts
- User authentication and token management
- Making HTTP requests (authenticated and unauthenticated)
- Database cleanup and setup

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure Docker is running
   - Check that test database ports are not in use
   - Verify environment variables are set correctly

2. **Migration Errors**
   - Ensure migration files are present in `../../migrations`
   - Check database permissions
   - Verify migration file syntax

3. **Redis Connection Errors**
   - Ensure Redis container is running
   - Check Redis port availability
   - Verify Redis configuration

4. **Test Timeouts**
   - Increase timeout values for slow systems
   - Check for resource constraints
   - Verify external mock servers are responding

### Debug Mode

To run tests with more verbose output:

```bash
go test -v -race ./tests/integration/...
```

To run a specific test suite:

```bash
go test -v -run TestRechargeFlowTestSuite ./tests/integration/...
```

To run a specific test case:

```bash
go test -v -run TestRechargeFlowTestSuite/TestPrivateRechargeEndToEnd ./tests/integration/...
```

## Continuous Integration

These integration tests are designed to run in CI/CD pipelines. The test script:

1. Starts required services using Docker Compose
2. Waits for services to be healthy
3. Runs tests with race detection and coverage
4. Generates coverage reports
5. Cleans up resources automatically

### CI Configuration Example

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    cd tests/integration
    ./run_tests.sh
  env:
    TEST_DB_HOST: localhost
    TEST_REDIS_HOST: localhost
```

## Performance Considerations

The integration tests are designed to:
- Run efficiently in parallel where possible
- Clean up resources between tests
- Use transactions to speed up database operations
- Mock external services to avoid network delays

Typical test execution time: 2-5 minutes depending on system resources.
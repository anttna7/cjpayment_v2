# CJPayment Performance Tests

This directory contains comprehensive performance and load tests for the CJPayment system. These tests are designed to evaluate system performance under various load conditions, identify bottlenecks, and ensure the system meets performance requirements.

## Test Types

### 1. Concurrent Processing Tests (`concurrent_recharge_test.go`)
- **Concurrent Recharge Processing**: Tests the system's ability to handle multiple simultaneous recharge requests
- **Account Rotation Under Load**: Verifies that account rotation works correctly under concurrent access
- **Database Performance**: Tests database operations under concurrent load
- **Memory Usage**: Monitors memory consumption during high-load scenarios

### 2. Load Tests (`load_test.go`)
- **System Load Capacity**: Tests system behavior under sustained load
- **Stress Testing**: Pushes the system to its limits to find breaking points
- **Spike Testing**: Tests system behavior under sudden load spikes
- **Recovery Testing**: Verifies system recovery after load spikes

### 3. Benchmark Tests (`benchmark_test.go`)
- **Database Operations**: Benchmarks CRUD operations on various entities
- **Service Layer Operations**: Benchmarks business logic performance
- **Redis Operations**: Benchmarks caching and pub/sub operations
- **Memory Allocations**: Measures memory allocation patterns

## Prerequisites

- **Docker and Docker Compose**: For test database setup
- **Go 1.24+**: For running the tests
- **Sufficient System Resources**: Performance tests can be resource-intensive

### Recommended System Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB+ available
- **Storage**: SSD recommended for database operations
- **Network**: Stable connection for external service mocking

## Running Performance Tests

### Quick Start

```bash
# Navigate to performance tests directory
cd tests/performance

# Run all performance tests
./run_performance_tests.sh
```

### Advanced Usage

```bash
# Run with verbose output
./run_performance_tests.sh -v

# Run with coverage reporting
./run_performance_tests.sh -c

# Set custom benchmark time
./run_performance_tests.sh -t 60s

# Set parallel test count
./run_performance_tests.sh -p 8

# Show help
./run_performance_tests.sh -h
```

### Individual Test Categories

```bash
# Run only concurrent tests
go test -v -timeout=10m ./tests/performance -run TestConcurrentRecharge

# Run only load tests
go test -v -timeout=15m ./tests/performance -run TestSystemLoadCapacity

# Run only benchmarks
go test -bench=. -benchtime=30s -benchmem ./tests/performance

# Run specific benchmark
go test -bench=BenchmarkDatabaseOperations -benchtime=10s ./tests/performance
```

### Using Makefile

```bash
# From project root
make test-performance

# Run all tests including performance
make test-all
```

## Test Configuration

### Environment Variables

Performance tests use the same environment variables as integration tests:

- `TEST_DB_HOST` (default: localhost)
- `TEST_DB_PORT` (default: 5433)
- `TEST_DB_USER` (default: cjpayment_test)
- `TEST_DB_PASSWORD` (default: test_password)
- `TEST_DB_NAME` (default: cjpayment_test)
- `TEST_REDIS_HOST` (default: localhost)
- `TEST_REDIS_PORT` (default: 6380)

### Test Parameters

Key performance test parameters can be adjusted in the test files:

```go
// Concurrent processing test parameters
concurrentUsers := 50
requestsPerUser := 10
totalRequests := concurrentUsers * requestsPerUser

// Load test parameters
Duration:          30 * time.Second
ConcurrentUsers:   10
RampUpTime:        5 * time.Second
RequestsPerSecond: 50
```

## Performance Metrics

### Key Performance Indicators (KPIs)

1. **Throughput**: Requests per second (RPS)
2. **Latency**: Response time percentiles (P95, P99)
3. **Error Rate**: Percentage of failed requests
4. **Resource Usage**: CPU, memory, database connections
5. **Concurrency**: Maximum concurrent users supported

### Expected Performance Baselines

#### Light Load (10 concurrent users, 50 RPS)
- **Success Rate**: > 99%
- **Average Latency**: < 500ms
- **P95 Latency**: < 2s
- **Throughput**: > 40 RPS

#### Medium Load (25 concurrent users, 100 RPS)
- **Success Rate**: > 95%
- **Average Latency**: < 1s
- **P95 Latency**: < 5s
- **Throughput**: > 80 RPS

#### Heavy Load (50 concurrent users, 200 RPS)
- **Success Rate**: > 90%
- **Average Latency**: < 2s
- **P99 Latency**: < 10s
- **Throughput**: > 100 RPS

## Test Scenarios

### 1. Concurrent Recharge Processing
Tests the core business functionality under concurrent load:
- Multiple users creating recharge orders simultaneously
- Account rotation and selection under concurrent access
- Database consistency under concurrent writes
- Memory usage patterns during high concurrency

### 2. Load Testing Scenarios
Simulates realistic user behavior patterns:
- **Create Recharge** (40% of requests): Primary business operation
- **Get Merchants** (30% of requests): Common read operation
- **Get Reports** (20% of requests): Data-intensive operation
- **Get User Profile** (10% of requests): Authentication-related operation

### 3. Stress Testing
Pushes system beyond normal operating conditions:
- High concurrent user count (100+ users)
- High request rate (500+ RPS)
- Extended duration (2+ minutes)
- Resource exhaustion scenarios

### 4. Spike Testing
Tests system behavior under sudden load changes:
- Normal load baseline
- Sudden spike to 10x normal load
- Recovery to normal load
- System stability verification

## Benchmark Results Interpretation

### Database Benchmarks
```
BenchmarkDatabaseOperations/UserRepository_Create-8         1000    1.2ms/op    512 B/op    8 allocs/op
BenchmarkDatabaseOperations/UserRepository_GetByID-8       5000    0.3ms/op    256 B/op    4 allocs/op
```

- **Operations/second**: Higher is better
- **Time/operation**: Lower is better
- **Bytes/operation**: Lower is better (memory efficiency)
- **Allocations/operation**: Lower is better (GC pressure)

### Service Benchmarks
```
BenchmarkServiceOperations/AuthService_GenerateToken-8     10000   0.1ms/op    128 B/op    2 allocs/op
BenchmarkServiceOperations/RechargeService_CreateOrder-8   1000    2.5ms/op    1024 B/op   15 allocs/op
```

### Redis Benchmarks
```
BenchmarkRedisOperations/Redis_Set-8                       50000   0.02ms/op   64 B/op     1 allocs/op
BenchmarkRedisOperations/Redis_Get-8                       100000  0.01ms/op   32 B/op     1 allocs/op
```

## Performance Optimization Guidelines

### Database Optimization
1. **Connection Pooling**: Optimize pool size based on concurrent load
2. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
3. **Indexing**: Ensure proper indexes on frequently queried columns
4. **Batch Operations**: Use batch inserts/updates where possible

### Application Optimization
1. **Caching**: Implement Redis caching for frequently accessed data
2. **Connection Reuse**: Reuse HTTP connections and database connections
3. **Goroutine Management**: Avoid goroutine leaks in concurrent operations
4. **Memory Management**: Optimize struct sizes and reduce allocations

### System Optimization
1. **Resource Limits**: Set appropriate CPU and memory limits
2. **Garbage Collection**: Tune GC parameters for your workload
3. **Network Configuration**: Optimize network buffer sizes
4. **Monitoring**: Implement comprehensive monitoring and alerting

## Troubleshooting Performance Issues

### Common Issues and Solutions

#### High Latency
- **Symptoms**: P95/P99 latencies above thresholds
- **Causes**: Database slow queries, network issues, resource contention
- **Solutions**: Query optimization, connection pooling, caching

#### Low Throughput
- **Symptoms**: RPS below expected levels
- **Causes**: CPU bottlenecks, database locks, inefficient algorithms
- **Solutions**: Horizontal scaling, algorithm optimization, async processing

#### High Error Rate
- **Symptoms**: Increased 4xx/5xx responses
- **Causes**: Resource exhaustion, timeout issues, dependency failures
- **Solutions**: Resource scaling, timeout tuning, circuit breakers

#### Memory Issues
- **Symptoms**: High memory usage, GC pressure
- **Causes**: Memory leaks, large object allocations, inefficient data structures
- **Solutions**: Memory profiling, object pooling, data structure optimization

### Debugging Tools

```bash
# CPU profiling
go test -cpuprofile=cpu.prof -bench=BenchmarkDatabaseOperations

# Memory profiling
go test -memprofile=mem.prof -bench=BenchmarkServiceOperations

# Analyze profiles
go tool pprof cpu.prof
go tool pprof mem.prof

# Database query analysis
EXPLAIN ANALYZE SELECT * FROM recharge_orders WHERE status = 'pending';

# Redis monitoring
redis-cli monitor
redis-cli info stats
```

## Continuous Performance Testing

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v3
        with:
          go-version: '1.24'
      - name: Run Performance Tests
        run: |
          cd tests/performance
          ./run_performance_tests.sh -c
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: tests/performance/performance_coverage.html
```

### Performance Monitoring

1. **Baseline Establishment**: Run tests regularly to establish performance baselines
2. **Regression Detection**: Alert on performance degradation
3. **Trend Analysis**: Track performance metrics over time
4. **Capacity Planning**: Use results for infrastructure planning

## Best Practices

### Test Design
1. **Realistic Scenarios**: Model actual user behavior patterns
2. **Gradual Load Increase**: Use ramp-up periods to avoid sudden spikes
3. **Proper Cleanup**: Clean up test data between runs
4. **Resource Monitoring**: Monitor system resources during tests

### Test Execution
1. **Isolated Environment**: Run tests in dedicated environments
2. **Consistent Conditions**: Ensure consistent hardware and network conditions
3. **Multiple Runs**: Run tests multiple times for statistical significance
4. **Documentation**: Document test conditions and results

### Result Analysis
1. **Statistical Analysis**: Use proper statistical methods for result analysis
2. **Trend Monitoring**: Track performance trends over time
3. **Root Cause Analysis**: Investigate performance regressions thoroughly
4. **Actionable Insights**: Convert results into actionable optimization tasks

## Performance Test Maintenance

### Regular Tasks
1. **Update Test Scenarios**: Keep scenarios aligned with actual usage patterns
2. **Review Thresholds**: Adjust performance thresholds based on requirements
3. **Update Dependencies**: Keep test dependencies up to date
4. **Validate Results**: Regularly validate test results against production metrics

### Scaling Considerations
1. **Test Environment Scaling**: Scale test environment with production
2. **Load Pattern Updates**: Update load patterns based on growth
3. **New Feature Testing**: Add performance tests for new features
4. **Infrastructure Changes**: Update tests for infrastructure changes
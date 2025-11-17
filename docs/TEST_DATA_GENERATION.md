# Test Data Generation Guide

This document describes the test data generation functionality in the CJPayment system, which allows you to quickly populate the database with realistic test data for development, testing, and demonstration purposes.

## Overview

The test data generation system provides APIs and tools to create:

- **Merchants**: Test merchant accounts with configurable limits
- **Receive Accounts**: Test payment accounts (Alipay, WeChat, Bank, etc.)
- **Recharge Orders**: Test transaction records with various statuses
- **Users**: Test user accounts with roles and permissions
- **Batch Generation**: Create all types of data in a single operation

## API Endpoints

All test data endpoints are under `/api/v1/test-data/` and require authentication.

### Generate Merchant Test Data

**POST** `/api/v1/test-data/merchants`

```json
{
  "count": 10,
  "name_prefix": "TestMerchant",
  "code_prefix": "TM",
  "with_limits": true,
  "with_accounts": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data_type": "merchants",
    "count": 10,
    "generated_ids": ["uuid1", "uuid2", ...],
    "duration": "150ms",
    "message": "Successfully generated 10 test merchants"
  }
}
```

### Generate Receive Account Test Data

**POST** `/api/v1/test-data/accounts`

```json
{
  "count": 15,
  "account_types": ["alipay", "wechat", "bank"],
  "payment_types": ["public", "private"],
  "with_limits": true,
  "merchant_ids": ["uuid1", "uuid2"]
}
```

### Generate Recharge Order Test Data

**POST** `/api/v1/test-data/orders`

```json
{
  "count": 50,
  "merchant_ids": ["uuid1", "uuid2"],
  "account_ids": ["uuid3", "uuid4"],
  "payment_types": ["public", "private"],
  "statuses": ["pending", "paid", "confirmed", "cancelled"],
  "date_range": {
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z"
  },
  "amount_range": {
    "min_amount": "100.00",
    "max_amount": "5000.00"
  }
}
```

### Generate User Test Data

**POST** `/api/v1/test-data/users`

```json
{
  "count": 5,
  "username_prefix": "testuser",
  "roles": ["admin", "finance", "operator", "viewer"],
  "with_permissions": true
}
```

### Batch Test Data Generation

**POST** `/api/v1/test-data/batch`

```json
{
  "merchants": {
    "count": 5,
    "name_prefix": "BatchMerchant",
    "with_limits": true
  },
  "accounts": {
    "count": 10,
    "account_types": ["alipay", "wechat", "bank"],
    "with_limits": true
  },
  "orders": {
    "count": 25,
    "payment_types": ["public", "private"],
    "statuses": ["pending", "paid", "confirmed"]
  },
  "users": {
    "count": 3,
    "username_prefix": "batchuser",
    "with_permissions": true
  },
  "link_accounts": true
}
```

### Cleanup Test Data

**DELETE** `/api/v1/test-data/cleanup`

```json
{
  "data_types": ["merchants", "accounts", "orders", "users"],
  "test_prefix": "Test",
  "created_after": "2024-01-01T00:00:00Z",
  "dry_run": false
}
```

## Command Line Tool

A convenient command-line tool is provided for generating test data:

### Usage

```bash
# Set the API base URL (optional)
export API_BASE_URL=http://localhost:8080

# Generate different types of test data
go run scripts/generate-test-data.go merchants
go run scripts/generate-test-data.go accounts
go run scripts/generate-test-data.go orders
go run scripts/generate-test-data.go users

# Generate all types in batch
go run scripts/generate-test-data.go batch

# Clean up test data
go run scripts/generate-test-data.go cleanup
```

### Examples

```bash
# Generate 10 test merchants
go run scripts/generate-test-data.go merchants

# Generate 15 test accounts
go run scripts/generate-test-data.go accounts

# Generate 50 test orders
go run scripts/generate-test-data.go orders

# Generate complete test dataset
go run scripts/generate-test-data.go batch
```

## Data Characteristics

### Merchants
- **Names**: `TestMerchant_1_timestamp`, `TestMerchant_2_timestamp`, etc.
- **Codes**: `TM_1_timestamp`, `TM_2_timestamp`, etc.
- **Contact Info**: Generated email, phone, and person names
- **Limits**: Random daily limits (10,000-60,000) and single limits (1,000-6,000)
- **Status**: All set to "active"

### Receive Accounts
- **Account Types**: Alipay, WeChat, Bank, Other
- **Account Numbers**: 
  - Alipay: `alipay_N@test.com`
  - WeChat: `wx_test_N`
  - Bank: `6222000000000N` (16 digits)
  - Other: `other_N`
- **Payment Types**: Public or Private
- **Limits**: Random daily limits (5,000-35,000) and single limits (500-3,500)

### Recharge Orders
- **Order Numbers**: `TO{timestamp}{sequence}`
- **Payer Names**: `TestPayer_N`
- **Amounts**: Random amounts within specified range
- **Statuses**: Distributed across pending, paid, confirmed, cancelled, refunded
- **Dates**: Random dates within specified range
- **Vouchers**: Added for paid/confirmed orders

### Users
- **Usernames**: `testuser_N_timestamp`
- **Emails**: `testuser_N@test.com`
- **Passwords**: Test hash (not for production use)
- **Roles**: Randomly assigned from admin, finance, operator, viewer
- **Status**: All set to "active"

## Best Practices

### Development Environment
1. **Start Fresh**: Clean existing test data before generating new data
2. **Realistic Volumes**: Use reasonable counts (10-100 merchants, 50-200 orders)
3. **Linked Data**: Use `link_accounts: true` in batch generation for realistic relationships

### Testing Environment
1. **Consistent Data**: Use the same seed values for reproducible test data
2. **Edge Cases**: Generate data with various statuses and edge case amounts
3. **Performance Testing**: Generate larger datasets (1000+ orders) for load testing

### Demo Environment
1. **Clean Data**: Use meaningful prefixes like "Demo" instead of "Test"
2. **Realistic Scenarios**: Create data that represents real business scenarios
3. **Complete Workflows**: Generate data across all statuses to show complete workflows

## Security Considerations

⚠️ **Important**: The test data generation functionality should only be enabled in development and testing environments.

### Production Safety
- Test data endpoints should be disabled in production
- Use environment variables to control availability
- Implement proper authentication and authorization
- Log all test data generation activities

### Data Privacy
- Test data uses fake/generated information only
- No real customer data should be used in test generation
- Generated data should be clearly marked as test data

## Troubleshooting

### Common Issues

**"No merchants or accounts available"**
- Generate merchants and accounts before generating orders
- Use batch generation with `link_accounts: true`

**"Failed to create merchant/account"**
- Check for unique constraint violations
- Ensure database is properly migrated
- Verify sufficient database permissions

**"API authentication failed"**
- Ensure you're authenticated with proper permissions
- Check if test data endpoints are enabled
- Verify API base URL is correct

### Performance Considerations

- Large batch operations (>100 items) may take several seconds
- Database constraints may slow down generation with many existing records
- Consider generating data in smaller batches for better performance

## Integration with Testing

### Unit Tests
```go
// Use the test data service in unit tests
testDataService := service.NewTestDataService(...)
result, err := testDataService.GenerateMerchantTestData(ctx, &req)
```

### Integration Tests
```bash
# Setup test data before integration tests
go run scripts/generate-test-data.go batch

# Run integration tests
go test ./tests/integration/...

# Cleanup after tests
go run scripts/generate-test-data.go cleanup
```

### Load Testing
```bash
# Generate large dataset for load testing
export API_BASE_URL=http://test-server:8080
go run scripts/generate-test-data.go batch
```

## API Response Format

All test data generation endpoints return a consistent response format:

```json
{
  "success": true,
  "data": {
    "data_type": "merchants|accounts|orders|users",
    "count": 10,
    "generated_ids": ["uuid1", "uuid2", ...],
    "duration": "150ms",
    "message": "Success message"
  }
}
```

For batch operations:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "data_type": "merchants",
        "count": 5,
        "generated_ids": [...],
        "duration": "100ms",
        "message": "Success message"
      }
    ],
    "total_count": 43,
    "duration": "500ms",
    "success": true
  }
}
```

## Future Enhancements

- **Data Templates**: Predefined data templates for common scenarios
- **Custom Generators**: Plugin system for custom data generators
- **Data Relationships**: More sophisticated relationship generation
- **Export/Import**: Export generated data for reuse across environments
- **Cleanup Improvements**: More granular cleanup options with foreign key handling## 
Data Cleanup and Reset

In addition to test data generation, the system provides comprehensive data cleanup and reset functionality.

### Database State Reset

**POST** `/api/v1/data-cleanup/reset-database`

Reset various database states including limits, counters, cache, and logs.

```json
{
  "reset_types": ["limits", "counters", "cache", "logs"],
  "preserve_tables": ["users", "roles"],
  "dry_run": false,
  "backup_before": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reset_types": ["limits", "counters"],
    "affected_tables": ["merchants", "receive_accounts", "statistics"],
    "records_reset": 150,
    "duration": "500ms",
    "backup_path": "/backups/backup_20240205_143022.sql",
    "dry_run": false,
    "message": "Database state reset completed for limits, counters"
  }
}
```

### Demo Data Management

**POST** `/api/v1/data-cleanup/import-demo`

Import demo data from various sources.

```json
{
  "data_source": "file",
  "source_path": "/path/to/demo-data.json",
  "data_types": ["merchants", "accounts", "orders"],
  "replace_existing": false,
  "options": {
    "validate_data": true,
    "batch_size": 100
  }
}
```

**POST** `/api/v1/data-cleanup/export-demo`

Export demo data to various formats.

```json
{
  "data_types": ["merchants", "accounts", "orders"],
  "export_format": "json",
  "output_path": "/exports/demo-data.json",
  "include_schema": true,
  "options": {
    "pretty_print": true,
    "include_relationships": true
  }
}
```

### Data Integrity Validation

**GET** `/api/v1/data-cleanup/validate-integrity`

Perform comprehensive data integrity checks.

**Response:**
```json
{
  "success": true,
  "data": {
    "checks_performed": [
      "orphaned_records",
      "missing_references",
      "invalid_data",
      "constraint_violations"
    ],
    "issues": [
      {
        "type": "orphaned",
        "table": "recharge_orders",
        "record_id": "uuid-123",
        "description": "Order references non-existent merchant",
        "severity": "high"
      }
    ],
    "summary": {
      "total_issues": 1,
      "critical_issues": 0,
      "high_issues": 1,
      "medium_issues": 0,
      "low_issues": 0
    },
    "duration": "2.5s"
  }
}
```

### Cleanup Statistics

**GET** `/api/v1/data-cleanup/statistics`

Get cleanup statistics and history.

**Response:**
```json
{
  "success": true,
  "data": {
    "last_cleanup": "2024-02-05T14:30:22Z",
    "total_cleanups": 15,
    "records_cleaned": 2500,
    "table_statistics": [
      {
        "table_name": "merchants",
        "record_count": 25,
        "test_records": 10,
        "last_cleaned": "2024-02-05T14:30:22Z"
      }
    ],
    "cleanup_history": [
      {
        "timestamp": "2024-02-05T14:30:22Z",
        "operation": "cleanup_test_data",
        "data_types": ["merchants", "accounts"],
        "records_affected": 35,
        "duration": "1.2s"
      }
    ]
  }
}
```

## Database Reset Command Line Tool

A command-line tool is provided for database reset and cleanup operations:

### Usage

```bash
# Set the API base URL (optional)
export API_BASE_URL=http://localhost:8080

# Reset specific database states
go run scripts/database-reset.go reset-limits
go run scripts/database-reset.go reset-counters
go run scripts/database-reset.go reset-cache
go run scripts/database-reset.go reset-logs

# Reset all database states
go run scripts/database-reset.go reset-all

# Clean up test data
go run scripts/database-reset.go cleanup-test
go run scripts/database-reset.go cleanup-all

# Validate data integrity
go run scripts/database-reset.go validate-integrity

# Get cleanup statistics
go run scripts/database-reset.go statistics
```

### Examples

```bash
# Reset daily usage limits
go run scripts/database-reset.go reset-limits

# Clean up all test data
go run scripts/database-reset.go cleanup-all

# Validate data integrity
go run scripts/database-reset.go validate-integrity

# Reset everything for a fresh start
go run scripts/database-reset.go reset-all
```

## Reset Types

### Limits Reset
- Resets daily usage counters for merchants and accounts
- Resets limit violation flags
- Preserves limit configurations

### Counters Reset
- Resets transaction counters
- Resets performance metrics
- Resets usage statistics

### Cache Reset
- Clears Redis cache
- Invalidates cached queries
- Resets session data

### Logs Reset
- Cleans up old notification logs
- Removes expired order status logs
- Archives audit logs

## Data Cleanup Workflow

The cleanup system follows a specific order to maintain referential integrity:

1. **Recharge Orders** - Delete test orders first
2. **Merchant-Account Relationships** - Remove test relationships
3. **Receive Accounts** - Delete test accounts
4. **Merchants** - Delete test merchants
5. **Users** - Delete test users (preserve system users)
6. **Roles** - Delete test roles (preserve system roles)

## Safety Features

### Dry Run Mode
All cleanup operations support dry run mode to preview changes:

```json
{
  "data_types": ["merchants", "accounts"],
  "dry_run": true
}
```

### Backup Before Reset
Database reset operations can create backups:

```json
{
  "reset_types": ["limits"],
  "backup_before": true
}
```

### Preserve Tables
Specify tables to preserve during reset:

```json
{
  "reset_types": ["all"],
  "preserve_tables": ["users", "roles", "permissions"]
}
```

### Test Data Identification
Test data is identified by:
- Name prefixes (Test*, Demo*, etc.)
- Creation timestamps
- Special markers in data fields
- User-defined patterns

## Monitoring and Alerts

### Cleanup Monitoring
- Track cleanup operations
- Monitor data growth
- Alert on cleanup failures
- Report cleanup statistics

### Integrity Monitoring
- Regular integrity checks
- Automated issue detection
- Severity-based alerting
- Trend analysis

## Best Practices for Cleanup

### Development Environment
1. **Regular Cleanup**: Run cleanup weekly to prevent data bloat
2. **Integrity Checks**: Validate integrity after major changes
3. **Backup Strategy**: Always backup before major resets

### Testing Environment
1. **Automated Cleanup**: Include cleanup in CI/CD pipelines
2. **Fresh State**: Reset to clean state before test runs
3. **Isolation**: Ensure test data doesn't affect other tests

### Staging Environment
1. **Controlled Cleanup**: Use dry run mode first
2. **Scheduled Maintenance**: Plan cleanup during maintenance windows
3. **Data Preservation**: Preserve important demo data

## Troubleshooting Cleanup Issues

### Common Problems

**Foreign Key Constraint Violations**
- Clean up in dependency order
- Check for circular references
- Use cascade delete where appropriate

**Performance Issues**
- Clean up in smaller batches
- Use database-specific optimizations
- Monitor resource usage during cleanup

**Data Recovery**
- Restore from backups if needed
- Use transaction rollback for failed operations
- Implement point-in-time recovery

### Error Handling

The cleanup system provides detailed error information:
- Specific error messages
- Affected records
- Suggested remediation steps
- Recovery procedures
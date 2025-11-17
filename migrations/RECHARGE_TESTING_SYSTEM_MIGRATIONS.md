# Recharge Testing System Database Migrations

This document outlines the database migrations created for the recharge testing system implementation.

## Migration Overview

The following migrations have been created to support the recharge testing system functionality:

### 1. 20250812120000_enhance_merchants_for_recharge_testing
**Purpose**: Enhance merchants table with recharge testing specific fields
**Changes**:
- Added `business_type` field for categorizing merchant business types
- Added `recharge_url` field for storing unique recharge page URLs
- Added `recharge_page_config` JSONB field for storing page configuration
- Added `is_recharge_enabled` boolean flag to enable/disable recharge functionality
- Created indexes for recharge URL lookups and enabled status

### 2. 20250812120100_enhance_merchant_accounts_priority
**Purpose**: Enhance merchant_receive_accounts table with priority and usage tracking
**Changes**:
- Renamed `weight` column to `priority` for better clarity
- Added `daily_usage_amount` for tracking daily usage amounts
- Added `daily_usage_count` for tracking daily usage frequency
- Added `last_used_at` timestamp for tracking last usage
- Added `usage_reset_date` for managing daily usage resets
- Created indexes for priority-based queries and usage tracking

### 3. 20250812120200_enhance_recharge_orders_for_testing
**Purpose**: Enhance recharge_orders table for comprehensive testing functionality
**Changes**:
- Added `payment_proof` field for storing payment evidence
- Added `processing_notes` for administrative notes
- Added `auto_matched` boolean flag for tracking automatic account matching
- Added `match_score` integer for storing matching algorithm scores
- Added `ip_address` and `user_agent` for security and tracking
- Added `completed_at` and `expired_at` timestamps
- Enhanced status constraint to include more order states
- Created comprehensive indexes for query optimization

### 4. 20250812120300_create_recharge_sessions_table
**Purpose**: Create table for tracking user sessions during recharge process
**Features**:
- Session token management for secure session tracking
- Form data storage for multi-step recharge process
- Current step tracking for process flow management
- Account matching and order association
- Session expiration management
- IP and user agent tracking for security

### 5. 20250812120400_create_account_matching_logs_table
**Purpose**: Create table for logging account matching decisions and performance
**Features**:
- Detailed logging of matching strategies and decisions
- Performance tracking with matching duration
- Available accounts snapshot for audit purposes
- Match scoring and reasoning for optimization
- Historical data for improving matching algorithms

### 6. 20250812120500_create_data_export_logs_table
**Purpose**: Create table for tracking data export operations
**Features**:
- Support for multiple export types and formats
- Date range and filter criteria tracking
- File management with size and path tracking
- Export status and error handling
- Download tracking and file expiration
- User attribution for audit purposes

### 7. 20250812120600_enhance_notifications_for_recharge_testing
**Purpose**: Enhance notifications table for recharge testing specific events
**Changes**:
- Added merchant-specific notification support
- Added multiple notification channels (webhook, email, SMS, internal)
- Added recipient configuration for flexible notification routing
- Added trigger conditions for conditional notifications
- Added trigger tracking for monitoring and optimization

### 8. 20250812120700_add_recharge_testing_indexes_and_constraints
**Purpose**: Add comprehensive indexes and constraints for optimal performance
**Features**:
- Performance indexes for common query patterns
- Composite indexes for complex multi-column queries
- Partial indexes for filtered queries
- Data integrity constraints
- Check constraints for business rule enforcement

## Database Schema Summary

### Core Tables Enhanced:
- `merchants` - Enhanced with recharge testing fields
- `merchant_receive_accounts` - Enhanced with priority and usage tracking
- `recharge_orders` - Enhanced with comprehensive testing features
- `notifications` - Enhanced with recharge-specific notification features

### New Tables Created:
- `recharge_sessions` - Session management for recharge process
- `account_matching_logs` - Account matching decision logging
- `data_export_logs` - Data export operation tracking

### Key Indexes Created:
- Performance indexes for common query patterns
- Composite indexes for multi-column queries
- Partial indexes for filtered queries
- Foreign key indexes for join optimization

### Constraints Added:
- Data integrity constraints for business rules
- Check constraints for value validation
- Foreign key constraints for referential integrity

## Requirements Mapping

This migration implementation addresses the following requirements:

- **Requirement 1.4**: Merchant information storage and management
- **Requirement 2.4**: Account binding and priority management
- **Requirement 6.7**: Order management and status tracking
- **Requirement 7.5**: Data export and reporting functionality

## Performance Considerations

The migrations include comprehensive indexing strategies to ensure optimal performance:

1. **Query Optimization**: Indexes designed for common query patterns
2. **Join Performance**: Foreign key indexes for efficient joins
3. **Filtering Performance**: Partial indexes for commonly filtered data
4. **Composite Queries**: Multi-column indexes for complex queries
5. **Data Integrity**: Constraints to maintain data quality

## Migration Execution Order

The migrations should be executed in the following order:
1. 20250812120000_enhance_merchants_for_recharge_testing
2. 20250812120100_enhance_merchant_accounts_priority
3. 20250812120200_enhance_recharge_orders_for_testing
4. 20250812120300_create_recharge_sessions_table
5. 20250812120400_create_account_matching_logs_table
6. 20250812120500_create_data_export_logs_table
7. 20250812120600_enhance_notifications_for_recharge_testing
8. 20250812120700_add_recharge_testing_indexes_and_constraints

## Rollback Support

All migrations include corresponding `.down.sql` files for safe rollback operations if needed.
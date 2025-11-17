# Recharge Testing System API Documentation

This document describes the API endpoints for the Recharge Testing System management backend.

## Base URL

All API endpoints are prefixed with `/api/v1/recharge-testing`

## Authentication

All endpoints require authentication (to be implemented with JWT middleware).

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)",
    "validation_errors": {
      "field_name": "Field specific error message"
    }
  },
  "request_id": "unique-request-id"
}
```

## Merchant Management API

### List Merchants

**GET** `/merchants`

Lists merchants with filtering and pagination.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `search` (string, optional): Search by merchant name or code
- `status` (string, optional): Filter by status (`active`, `inactive`, `suspended`)
- `business_type` (string, optional): Filter by business type

**Response:**
```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": "uuid",
        "name": "Merchant Name",
        "code": "MERCHANT_CODE",
        "contact_person": "Contact Person",
        "contact_phone": "+1234567890",
        "contact_email": "contact@merchant.com",
        "status": "active",
        "business_type": "e-commerce",
        "daily_limit": "10000.00",
        "single_limit": "1000.00",
        "daily_used": "2500.00",
        "recharge_url": "https://example.com/recharge/uuid",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  }
}
```

### Create Merchant

**POST** `/merchants`

Creates a new merchant.

**Request Body:**
```json
{
  "name": "Merchant Name",
  "code": "MERCHANT_CODE",
  "contact_person": "Contact Person",
  "contact_phone": "+1234567890",
  "contact_email": "contact@merchant.com",
  "business_type": "e-commerce",
  "daily_limit": "10000.00",
  "single_limit": "1000.00",
  "remark": "Optional remark"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Merchant Name",
    "code": "MERCHANT_CODE",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Merchant created successfully"
}
```

### Get Merchant

**GET** `/merchants/{id}`

Retrieves a specific merchant by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Merchant Name",
    "code": "MERCHANT_CODE",
    "contact_person": "Contact Person",
    "contact_phone": "+1234567890",
    "contact_email": "contact@merchant.com",
    "status": "active",
    "business_type": "e-commerce",
    "daily_limit": "10000.00",
    "single_limit": "1000.00",
    "daily_used": "2500.00",
    "recharge_url": "https://example.com/recharge/uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### Update Merchant

**PUT** `/merchants/{id}`

Updates an existing merchant.

**Request Body:**
```json
{
  "name": "Updated Merchant Name",
  "contact_person": "Updated Contact Person",
  "contact_phone": "+1234567890",
  "contact_email": "updated@merchant.com",
  "business_type": "retail",
  "daily_limit": "15000.00",
  "single_limit": "1500.00",
  "remark": "Updated remark"
}
```

### Delete Merchant

**DELETE** `/merchants/{id}`

Deletes a merchant.

**Response:**
```json
{
  "success": true,
  "message": "Merchant deleted successfully"
}
```

### Update Merchant Status

**PUT** `/merchants/{id}/status`

Updates merchant status.

**Request Body:**
```json
{
  "status": "active|inactive|suspended"
}
```

### Generate Recharge URL

**POST** `/merchants/{id}/generate-recharge-url`

Generates a unique recharge URL for a merchant.

**Response:**
```json
{
  "success": true,
  "recharge_url": "https://example.com/recharge/uuid",
  "message": "Recharge URL generated successfully"
}
```

### Toggle Recharge Service

**PUT** `/merchants/{id}/recharge-service`

Enables or disables recharge service for a merchant.

**Request Body:**
```json
{
  "enabled": true
}
```

### Update Recharge Page Configuration

**PUT** `/merchants/{id}/recharge-config`

Updates recharge page configuration.

**Request Body:**
```json
{
  "page_title": "Custom Recharge Page",
  "theme_color": "#007bff",
  "show_merchant_info": true,
  "payment_methods": ["private", "public"],
  "custom_fields": {
    "field1": "value1"
  }
}
```

## Merchant Account Binding API

### Bind Account

**POST** `/merchant-accounts/bind`

Binds a receive account to a merchant.

**Request Body:**
```json
{
  "merchant_id": "uuid",
  "account_id": "uuid",
  "priority": 1
}
```

### Unbind Account

**DELETE** `/merchant-accounts/{merchantId}/accounts/{accountId}`

Removes the binding between a merchant and receive account.

### List Merchant Accounts

**GET** `/merchant-accounts/{merchantId}`

Retrieves all accounts bound to a merchant.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "merchant_id": "uuid",
      "account_id": "uuid",
      "priority": 1,
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "account": {
        "id": "uuid",
        "account_name": "Account Name",
        "account_number": "1234567890",
        "account_type": "bank",
        "account_holder": "Account Holder",
        "payment_type": "private",
        "bank_name": "Bank Name",
        "daily_limit": "5000.00",
        "daily_used": "1200.00"
      }
    }
  ],
  "count": 1
}
```

### Update Account Priority

**PUT** `/merchant-accounts/{merchantId}/accounts/{accountId}/priority`

Updates the priority of a bound account.

**Request Body:**
```json
{
  "priority": 2
}
```

### Reorder Account Priorities

**PUT** `/merchant-accounts/{merchantId}/priorities`

Updates multiple account priorities in batch.

**Request Body:**
```json
{
  "account_priorities": [
    {
      "account_id": "uuid",
      "priority": 1
    },
    {
      "account_id": "uuid",
      "priority": 2
    }
  ]
}
```

### Get Available Accounts

**GET** `/merchant-accounts/{merchantId}/available`

Retrieves available accounts for a merchant based on criteria.

**Query Parameters:**
- `payment_type` (string, optional): Filter by payment type (`private`, `public`)
- `amount` (decimal, optional): Check availability for specific amount

### Validate Account Binding

**POST** `/merchant-accounts/validate-binding`

Validates if an account can be bound to a merchant.

**Request Body:**
```json
{
  "merchant_id": "uuid",
  "account_id": "uuid"
}
```

### Get Account Usage Statistics

**GET** `/merchant-accounts/{merchantId}/usage-stats`

Retrieves usage statistics for merchant accounts.

**Query Parameters:**
- `days` (integer, optional): Number of days to include (default: 30)

### Batch Bind Accounts

**POST** `/merchant-accounts/batch-bind`

Binds multiple accounts to a merchant in batch.

**Request Body:**
```json
{
  "merchant_id": "uuid",
  "accounts": [
    {
      "account_id": "uuid",
      "priority": 1
    },
    {
      "account_id": "uuid",
      "priority": 2
    }
  ]
}
```

## Order Management API

### List Orders

**GET** `/orders`

Lists recharge orders with filtering and pagination.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status (`pending`, `paid`, `confirmed`, `completed`, `cancelled`)
- `merchant_id` (uuid, optional): Filter by merchant ID
- `payment_type` (string, optional): Filter by payment type (`private`, `public`)
- `start_date` (date, optional): Start date filter (YYYY-MM-DD)
- `end_date` (date, optional): End date filter (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "order_number": "ORD20240101001",
        "merchant_id": "uuid",
        "payer_name": "John Doe",
        "amount": "100.00",
        "ad_account": "AD123456",
        "payment_type": "private",
        "status": "pending",
        "payment_proof": "https://example.com/proof.jpg",
        "remark": "Payment note",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "merchant": {
          "id": "uuid",
          "name": "Merchant Name",
          "code": "MERCHANT_CODE"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  }
}
```

### Get Order

**GET** `/orders/{id}`

Retrieves a specific order by ID.

### Update Order Status

**PUT** `/orders/{id}/status`

Updates the status of a recharge order.

**Request Body:**
```json
{
  "status": "confirmed",
  "remark": "Payment verified"
}
```

### Approve Order

**POST** `/orders/{id}/approve`

Approves a recharge order.

**Request Body:**
```json
{
  "remark": "Approved by admin"
}
```

### Reject Order

**POST** `/orders/{id}/reject`

Rejects a recharge order.

**Request Body:**
```json
{
  "reason": "Invalid payment proof"
}
```

### Get Order Logs

**GET** `/orders/{id}/logs`

Retrieves logs for a specific order.

### Add Order Note

**POST** `/orders/{id}/add-note`

Adds a note to an order.

**Request Body:**
```json
{
  "note": "Additional information about the order"
}
```

### Get Order Statistics

**GET** `/orders/statistics`

Retrieves order statistics.

**Query Parameters:**
- `days` (integer, optional): Number of days to include (default: 30)

### Get Pending Review Orders

**GET** `/orders/pending-review`

Retrieves orders pending review.

**Query Parameters:**
- `limit` (integer, optional): Maximum number of orders (default: 50, max: 100)

## Data Export API

### Export Orders

**POST** `/exports/orders`

Exports orders based on criteria.

**Request Body:**
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "status": "confirmed",
  "merchant_id": "uuid",
  "payment_type": "private",
  "format": "excel"
}
```

**Response:**
```json
{
  "success": true,
  "export_id": "uuid",
  "message": "Export job created successfully",
  "status": "processing"
}
```

### Export Today Data

**GET** `/exports/today`

Exports today's data.

**Query Parameters:**
- `format` (string, optional): Export format (`excel`, `csv`) (default: excel)

### Export Yesterday Data

**GET** `/exports/yesterday`

Exports yesterday's data.

**Query Parameters:**
- `format` (string, optional): Export format (`excel`, `csv`) (default: excel)

### Get Export Status

**GET** `/exports/{id}/status`

Retrieves the status of an export job.

**Response:**
```json
{
  "success": true,
  "data": {
    "export_id": "uuid",
    "status": "completed",
    "progress": 100,
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:05:00Z",
    "file_size": "1.2MB",
    "record_count": 150
  }
}
```

### Download Export

**GET** `/exports/{id}/download`

Downloads an export file.

### List Exports

**GET** `/exports`

Lists all export jobs.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)

### Delete Export

**DELETE** `/exports/{id}`

Deletes an export job.

## Dashboard and Analytics API

### Get Dashboard Overview

**GET** `/dashboard/overview`

Retrieves dashboard overview data.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_merchants": 50,
    "active_merchants": 45,
    "total_orders": 1000,
    "pending_orders": 25,
    "confirmed_orders": 800,
    "total_amount": "50000.00",
    "today_orders": 15,
    "today_amount": "1500.00",
    "success_rate": "95%",
    "avg_processing_time": "30 minutes"
  }
}
```

### Get Merchant Statistics

**GET** `/dashboard/merchant-stats`

Retrieves merchant statistics.

### Get Order Trends

**GET** `/dashboard/order-trends`

Retrieves order trend data.

**Query Parameters:**
- `days` (integer, optional): Number of days to include (default: 30)

### Get Account Utilization

**GET** `/dashboard/account-utilization`

Retrieves account utilization data.

### Get Recent Activities

**GET** `/dashboard/recent-activities`

Retrieves recent system activities.

**Query Parameters:**
- `limit` (integer, optional): Maximum number of activities (default: 20, max: 100)

## System Configuration API

### Get System Configuration

**GET** `/config`

Retrieves system configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "system_name": "Recharge Testing System",
    "version": "1.0.0",
    "max_daily_limit": "1000000.00",
    "max_single_limit": "100000.00",
    "auto_approve_threshold": "1000.00",
    "notification_enabled": true,
    "export_retention_days": 30
  }
}
```

### Update System Configuration

**PUT** `/config`

Updates system configuration.

**Request Body:**
```json
{
  "max_daily_limit": "2000000.00",
  "max_single_limit": "200000.00",
  "auto_approve_threshold": "2000.00",
  "notification_enabled": false,
  "export_retention_days": 60
}
```

### Validate System Configuration

**POST** `/config/validate`

Validates system configuration.

**Request Body:**
```json
{
  "max_daily_limit": "2000000.00",
  "max_single_limit": "200000.00"
}
```

## HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `202 Accepted`: Request accepted for processing
- `400 Bad Request`: Invalid request parameters or body
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Validation failed
- `500 Internal Server Error`: Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- 1000 requests per hour per IP address
- 100 requests per minute per authenticated user

## Pagination

List endpoints support pagination with the following parameters:
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)

Response includes pagination metadata:
```json
{
  "total": 1000,
  "page": 1,
  "limit": 20,
  "total_pages": 50
}
```

## Filtering and Sorting

List endpoints support filtering and sorting:
- Use query parameters for filtering
- Use `sort` parameter for sorting (e.g., `sort=created_at:desc`)
- Use `search` parameter for text search

## Validation Rules

### Merchant Code
- 3-20 alphanumeric characters
- Can include underscore and hyphen
- Must be unique

### Account Number
- 8-30 alphanumeric characters
- Must be unique

### Phone Number
- 10-15 digits
- Can start with + for international numbers

### Amount
- Positive decimal number
- Up to 2 decimal places
- Must not exceed configured limits

### Status Values
- Merchant: `active`, `inactive`, `suspended`
- Order: `pending`, `paid`, `confirmed`, `completed`, `cancelled`
- Payment Type: `private`, `public`
- Export Format: `excel`, `csv`
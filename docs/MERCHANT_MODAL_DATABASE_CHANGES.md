# Merchant Management Modal Database Changes

## Overview

This document describes the database schema changes required for the merchant management modal functionality. These changes support the new merchant information editing modal that allows administrators to manage merchant details, receive account information, and agent relationships.

## Migration Files

### 1. Add Merchant Modal Fields (20250808180000)

**Files:**
- `migrations/20250808180000_add_merchant_modal_fields.up.sql`
- `migrations/20250808180000_add_merchant_modal_fields.down.sql`

**Changes:**

#### Merchants Table Extensions
- **agent_name** (VARCHAR(100)): Stores the name of the agent associated with the merchant
- **port_name** (VARCHAR(50)): Stores the unique port name for technical integration
- **remark** (TEXT): Stores additional notes or comments about the merchant

#### Receive Accounts Table Extensions
- **custom_payment_provider** (VARCHAR(50)): Stores custom payment provider name when account_type is 'other'

#### Indexes Added
- `idx_merchants_agent_name`: Index on agent_name for efficient agent-based queries
- `idx_merchants_port_name_unique`: Unique index on port_name (only for non-null values)
- `idx_receive_accounts_custom_provider`: Index on custom_payment_provider field

### 2. Create Agent Suggestions Table (20250808180100)

**Files:**
- `migrations/20250808180100_create_agent_suggestions_table.up.sql`
- `migrations/20250808180100_create_agent_suggestions_table.down.sql`

**Changes:**

#### New Table: agent_suggestions
```sql
CREATE TABLE agent_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Supports autocomplete functionality for agent names in the merchant modal.

#### Indexes Added
- `idx_agent_suggestions_name`: Index on agent_name for fast lookups
- `idx_agent_suggestions_usage`: Index on usage_count (DESC) for popularity-based suggestions
- `idx_agent_suggestions_last_used`: Index on last_used_at (DESC) for recent usage tracking

#### Triggers Added
- `trigger_agent_suggestions_updated_at`: Automatically updates the updated_at timestamp on record changes

## Schema Impact

### Before Migration

**merchants table:**
```sql
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    daily_limit DECIMAL(15,2) DEFAULT 0,
    single_limit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**receive_accounts table:**
```sql
CREATE TABLE receive_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100),
    bank_branch VARCHAR(200),
    account_holder VARCHAR(100) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    daily_limit DECIMAL(15,2) DEFAULT 0,
    single_limit DECIMAL(15,2) DEFAULT 0,
    daily_used DECIMAL(15,2) DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### After Migration

**merchants table (new fields added):**
- `agent_name VARCHAR(100)` - Agent name for business relationship tracking
- `port_name VARCHAR(50)` - Unique port identifier for technical integration
- `remark TEXT` - Additional notes and comments

**receive_accounts table (new field added):**
- `custom_payment_provider VARCHAR(50)` - Custom payment provider when type is 'other'

**agent_suggestions table (new table):**
- Complete table for agent name autocomplete functionality

## Business Logic Impact

### Agent Name Management
- Agent names are now tracked at the merchant level
- Autocomplete suggestions are populated from the `agent_suggestions` table
- Usage statistics help prioritize frequently used agent names

### Port Name Uniqueness
- Port names must be unique across all merchants (when provided)
- Supports technical integration requirements
- Null values are allowed (optional field)

### Custom Payment Providers
- Supports flexible payment provider configuration
- Used when account_type is set to 'other'
- Enables integration with non-standard payment systems

### Remarks and Notes
- Free-form text field for additional merchant information
- Supports business context and special instructions
- No length limit (TEXT type)

## Data Migration Considerations

### Existing Data
- All new fields are nullable, so existing records remain valid
- No data transformation required during migration
- Backward compatibility maintained

### Default Values
- `agent_name`: NULL (optional)
- `port_name`: NULL (optional, but unique when provided)
- `remark`: NULL (optional)
- `custom_payment_provider`: NULL (optional)

### Performance Impact
- New indexes improve query performance for agent-based searches
- Unique constraint on port_name ensures data integrity
- Agent suggestions table enables fast autocomplete queries

## Rollback Strategy

### Safe Rollback
- Down migrations safely remove all new fields and tables
- Existing functionality remains unaffected
- No data loss for core merchant and account information

### Rollback Considerations
- Agent name associations will be lost
- Port name configurations will be removed
- Custom payment provider settings will be cleared
- Agent suggestions data will be deleted

## Testing and Validation

### Migration Testing
Run the validation script to ensure migrations are properly structured:
```bash
go run scripts/validate-merchant-modal-migrations.go
```

### Database Testing
After starting the database service, apply and test migrations:
```bash
# Apply migrations
go run cmd/migrate/main.go -command=up

# Check status
go run cmd/migrate/main.go -command=status

# Test schema (requires running database)
go run scripts/test-merchant-modal-migrations.go
```

### Manual Verification
After migration, verify the following:

1. **New merchant fields exist:**
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'merchants' 
   AND column_name IN ('agent_name', 'port_name', 'remark');
   ```

2. **New receive_accounts field exists:**
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'receive_accounts' 
   AND column_name = 'custom_payment_provider';
   ```

3. **Agent suggestions table exists:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'agent_suggestions';
   ```

4. **Indexes are created:**
   ```sql
   SELECT indexname, tablename FROM pg_indexes 
   WHERE indexname IN (
     'idx_merchants_agent_name',
     'idx_merchants_port_name_unique',
     'idx_receive_accounts_custom_provider',
     'idx_agent_suggestions_name',
     'idx_agent_suggestions_usage',
     'idx_agent_suggestions_last_used'
   );
   ```

## Requirements Mapping

These database changes support the following requirements from the merchant management modal specification:

- **Requirement 5**: Receive account limit settings (existing fields)
- **Requirement 6**: Agent and port information (new agent_name, port_name fields)
- **Requirement 10**: Data persistence and integration (all new fields and table)

The schema changes enable the complete merchant management modal functionality while maintaining backward compatibility and data integrity.
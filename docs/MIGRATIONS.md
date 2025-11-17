# Database Migration System

The CJPayment system uses a robust database migration system built on top of [golang-migrate](https://github.com/golang-migrate/migrate) to manage database schema changes and version control.

## Features

- **Version Control**: Track database schema versions and changes
- **Rollback Support**: Safely rollback migrations when needed
- **Migration Templates**: Automatically generated migration files with proper structure
- **Status Tracking**: View current migration status and history
- **Force Recovery**: Recover from failed migrations
- **Validation**: Ensure migration files are properly paired (up/down)

## Commands

### Basic Migration Commands

```bash
# Run all pending migrations
make migrate-up

# Rollback the last migration
make migrate-down

# Check current migration status
make migrate-status

# Get current database version
make migrate-version
```

### Advanced Migration Commands

```bash
# Create a new migration
make migrate-create
# This will prompt for a migration name

# Force database to a specific version (use with caution)
make migrate-force
# This will prompt for the version number

# Reset database (drop all tables and re-run migrations)
make migrate-reset
# This will ask for confirmation before proceeding
```

### Direct Command Usage

You can also use the migration command directly:

```bash
# Create a new migration
go run cmd/migrate/main.go -command=create -name="add_user_table"

# Run migrations up
go run cmd/migrate/main.go -command=up

# Run specific number of migrations
go run cmd/migrate/main.go -command=up -steps=2

# Rollback migrations
go run cmd/migrate/main.go -command=down -steps=1

# Check status
go run cmd/migrate/main.go -command=status

# Get version
go run cmd/migrate/main.go -command=version

# Force version (dangerous - use only to recover from failed migrations)
go run cmd/migrate/main.go -command=force -version=5

# Drop entire database (dangerous)
go run cmd/migrate/main.go -command=drop
```

## Migration File Structure

Migration files are stored in the `migrations/` directory and follow this naming convention:

```
{timestamp}_{migration_name}.up.sql
{timestamp}_{migration_name}.down.sql
```

Example:
```
migrations/
├── 20250801113815_create_users_and_roles_tables.up.sql
├── 20250801113815_create_users_and_roles_tables.down.sql
├── 20250801120000_add_merchants_table.up.sql
├── 20250801120000_add_merchants_table.down.sql
├── 20250808180000_add_merchant_modal_fields.up.sql
├── 20250808180000_add_merchant_modal_fields.down.sql
├── 20250808180100_create_agent_suggestions_table.up.sql
└── 20250808180100_create_agent_suggestions_table.down.sql
```

### Migration File Template

When you create a new migration, it will be generated with this template:

**Up Migration (`*.up.sql`)**:
```sql
-- Migration: {migration_name}
-- Created at: {timestamp}
-- Description: {migration_name}

BEGIN;

-- Add your migration SQL here


COMMIT;
```

**Down Migration (`*.down.sql`)**:
```sql
-- Rollback migration: {migration_name}
-- Created at: {timestamp}
-- Description: Rollback {migration_name}

BEGIN;

-- Add your rollback SQL here


COMMIT;
```

## Best Practices

### 1. Always Use Transactions
Wrap your migration SQL in `BEGIN;` and `COMMIT;` statements to ensure atomicity.

### 2. Write Reversible Migrations
Always provide a corresponding down migration that can safely reverse the changes made by the up migration.

### 3. Test Migrations
Test both up and down migrations in a development environment before applying to production.

### 4. Backup Before Major Changes
Always backup your database before running migrations in production.

### 5. Use Descriptive Names
Use clear, descriptive names for your migrations:
- ✅ `create_users_table`
- ✅ `add_email_index_to_users`
- ✅ `remove_deprecated_status_column`
- ❌ `fix_stuff`
- ❌ `update_table`

### 6. Handle Data Migrations Carefully
When migrating data, consider:
- Large datasets may require batching
- Potential downtime during migration
- Data validation after migration

## Configuration

The migration system uses the same database configuration as the main application. Ensure your `configs/config.yaml` file has the correct database settings:

```yaml
database:
  host: "localhost"
  port: 5432
  user: "cjpayment"
  password: "password"
  dbname: "cjpayment"
  sslmode: "disable"
  dsn: "postgres://cjpayment:password@localhost:5432/cjpayment?sslmode=disable"
```

## Migration Manager API

The system also provides a programmatic API through the `migration.Manager` type:

```go
package main

import (
    "github.com/company/cjpayment/pkg/migration"
)

func main() {
    manager, err := migration.NewManager(dsn, "migrations")
    if err != nil {
        log.Fatal(err)
    }
    defer manager.Close()

    // Run migrations
    if err := manager.Up(); err != nil {
        log.Fatal(err)
    }

    // Get status
    status, err := manager.Status()
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Current version: %d\n", status.CurrentVersion)
}
```

## Troubleshooting

### Dirty State Recovery
If a migration fails and leaves the database in a "dirty" state:

1. Check the migration status:
   ```bash
   make migrate-status
   ```

2. Fix the issue in the database manually or rollback:
   ```bash
   make migrate-down
   ```

3. If manual intervention is needed, force the version:
   ```bash
   make migrate-force
   # Enter the correct version number
   ```

### Common Issues

**Connection Refused**: Ensure PostgreSQL is running and accessible with the configured credentials.

**Permission Denied**: Ensure the database user has sufficient privileges to create/drop tables and modify schema.

**Migration Not Found**: Ensure migration files exist in the `migrations/` directory and follow the correct naming convention.

**Dirty State**: A previous migration failed. Use `migrate-status` to check and `migrate-force` to recover if necessary.

## Schema Migrations Table

The migration system creates a `schema_migrations` table to track applied migrations:

```sql
CREATE TABLE schema_migrations (
    version bigint NOT NULL PRIMARY KEY,
    dirty boolean NOT NULL
);
```

This table should not be modified manually unless you're recovering from a failed migration.
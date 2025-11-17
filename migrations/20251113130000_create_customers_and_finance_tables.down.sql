BEGIN;

DROP INDEX IF EXISTS idx_transfer_orders_status;
DROP INDEX IF EXISTS idx_transfer_orders_customer;
DROP TABLE IF EXISTS transfer_orders;

DROP INDEX IF EXISTS idx_ledger_entries_order;
DROP INDEX IF EXISTS idx_ledger_entries_customer;
DROP TABLE IF EXISTS ledger_entries;

DROP TABLE IF EXISTS consume_accounts;
DROP TABLE IF EXISTS funds_accounts;

DROP INDEX IF EXISTS idx_contracts_customer_id;
DROP TABLE IF EXISTS contracts;

DROP INDEX IF EXISTS idx_customers_name;
DROP INDEX IF EXISTS idx_customers_tenant_id;
DROP TABLE IF EXISTS customers;

COMMIT;


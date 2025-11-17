BEGIN;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);

CREATE TABLE IF NOT EXISTS funds_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    cash_balance NUMERIC(20,2) NOT NULL DEFAULT 0,
    grant_balance NUMERIC(20,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS consume_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    balance NUMERIC(20,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('funds','consume')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('recharge','transfer','consume','refund')),
    source VARCHAR(20),
    amount NUMERIC(20,2) NOT NULL,
    cash_delta NUMERIC(20,2),
    grant_delta NUMERIC(20,2),
    balance_after NUMERIC(20,2) NOT NULL,
    order_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_customer ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_order ON ledger_entries(order_id);

CREATE TABLE IF NOT EXISTS transfer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(20,2) NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('cash','grant')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_transfer_orders_customer ON transfer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_status ON transfer_orders(status);

COMMIT;


-- Migration: create_merchant_receive_accounts_table
-- Created at: 2025-08-01 13:34:42
-- Description: Create merchant_receive_accounts table for managing merchant and receive account relationships

BEGIN;

CREATE TABLE merchant_receive_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    receive_account_id UUID NOT NULL REFERENCES receive_accounts(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1 CHECK (weight > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate relationships
CREATE UNIQUE INDEX idx_merchant_receive_accounts_unique ON merchant_receive_accounts(merchant_id, receive_account_id);

-- Create indexes for better query performance
CREATE INDEX idx_merchant_receive_accounts_merchant_id ON merchant_receive_accounts(merchant_id);
CREATE INDEX idx_merchant_receive_accounts_receive_account_id ON merchant_receive_accounts(receive_account_id);
CREATE INDEX idx_merchant_receive_accounts_is_active ON merchant_receive_accounts(is_active);

COMMIT;
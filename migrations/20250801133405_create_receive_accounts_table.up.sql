-- Migration: create_receive_accounts_table
-- Created at: 2025-08-01 13:34:05
-- Description: Create receive_accounts table for managing payment receiving accounts

BEGIN;

CREATE TABLE receive_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('alipay', 'wechat', 'bank', 'other')),
    custom_payment_provider VARCHAR(50),
    bank_name VARCHAR(100),
    bank_branch VARCHAR(200),
    account_holder VARCHAR(100) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('public', 'private')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    daily_limit DECIMAL(15,2) DEFAULT 0,
    single_limit DECIMAL(15,2) DEFAULT 0,
    daily_used DECIMAL(15,2) DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for better query performance
CREATE INDEX idx_receive_accounts_account_number ON receive_accounts(account_number);
CREATE INDEX idx_receive_accounts_account_type ON receive_accounts(account_type);
CREATE INDEX idx_receive_accounts_payment_type ON receive_accounts(payment_type);
CREATE INDEX idx_receive_accounts_status ON receive_accounts(status);
CREATE INDEX idx_receive_accounts_account_holder ON receive_accounts(account_holder);

-- Create unique constraint for account_number and account_type combination
CREATE UNIQUE INDEX idx_receive_accounts_unique_account ON receive_accounts(account_number, account_type);

COMMIT;
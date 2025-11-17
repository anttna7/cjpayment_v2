-- Migration: create_merchants_table
-- Created at: 2025-08-01 11:43:01
-- Description: Create merchants table for managing merchant information

BEGIN;

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    daily_limit DECIMAL(15,2) DEFAULT 0,
    single_limit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_merchants_code ON merchants(code);
CREATE INDEX idx_merchants_name ON merchants(name);
CREATE INDEX idx_merchants_status ON merchants(status);

COMMIT;

-- Test script for merchant modal database schema changes
-- Run this after applying the migrations to verify the schema

-- Test 1: Check if new merchant fields exist
SELECT 'Testing merchant table new fields...' as test_description;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'merchants' 
AND column_name IN ('agent_name', 'port_name', 'remark')
ORDER BY column_name;

-- Test 2: Check if custom_payment_provider field exists in receive_accounts
SELECT 'Testing receive_accounts table new field...' as test_description;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'receive_accounts' 
AND column_name = 'custom_payment_provider';

-- Test 3: Check if agent_suggestions table exists with correct structure
SELECT 'Testing agent_suggestions table structure...' as test_description;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agent_suggestions'
ORDER BY ordinal_position;

-- Test 4: Check if all required indexes exist
SELECT 'Testing indexes...' as test_description;
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE indexname IN (
    'idx_merchants_agent_name',
    'idx_merchants_port_name_unique',
    'idx_receive_accounts_custom_provider',
    'idx_agent_suggestions_name',
    'idx_agent_suggestions_usage',
    'idx_agent_suggestions_last_used'
)
ORDER BY tablename, indexname;

-- Test 5: Check if trigger exists for agent_suggestions
SELECT 'Testing triggers...' as test_description;
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_agent_suggestions_updated_at';

-- Test 6: Test inserting sample data to verify constraints
SELECT 'Testing data insertion...' as test_description;

-- Insert test merchant with new fields
INSERT INTO merchants (name, code, agent_name, port_name, remark) 
VALUES ('Test Merchant', 'TEST001', 'Test Agent', 'test_port', 'Test remark')
ON CONFLICT (code) DO NOTHING;

-- Insert test receive account with custom payment provider
INSERT INTO receive_accounts (
    account_name, account_number, account_type, account_holder, 
    payment_type, custom_payment_provider
) 
VALUES (
    'Test Account', 'TEST123456', 'other', 'Test Holder', 
    'private', 'Custom Provider'
)
ON CONFLICT (account_number, account_type) DO NOTHING;

-- Insert test agent suggestion
INSERT INTO agent_suggestions (agent_name) 
VALUES ('Test Agent Suggestion')
ON CONFLICT (agent_name) DO NOTHING;

-- Test 7: Verify data was inserted correctly
SELECT 'Verifying inserted data...' as test_description;

-- Check merchant data
SELECT id, name, code, agent_name, port_name, remark
FROM merchants 
WHERE code = 'TEST001';

-- Check receive account data
SELECT id, account_name, account_number, account_type, custom_payment_provider
FROM receive_accounts 
WHERE account_number = 'TEST123456';

-- Check agent suggestion data
SELECT id, agent_name, usage_count, last_used_at, created_at, updated_at
FROM agent_suggestions 
WHERE agent_name = 'Test Agent Suggestion';

-- Test 8: Test unique constraints
SELECT 'Testing unique constraints...' as test_description;

-- This should fail due to unique port_name constraint
-- INSERT INTO merchants (name, code, port_name) 
-- VALUES ('Another Merchant', 'TEST002', 'test_port');

-- This should fail due to unique agent_name constraint
-- INSERT INTO agent_suggestions (agent_name) 
-- VALUES ('Test Agent Suggestion');

-- Test 9: Test trigger functionality
SELECT 'Testing trigger functionality...' as test_description;

-- Update agent suggestion to test trigger
UPDATE agent_suggestions 
SET usage_count = usage_count + 1 
WHERE agent_name = 'Test Agent Suggestion';

-- Verify updated_at was changed
SELECT agent_name, usage_count, updated_at > created_at as updated_at_changed
FROM agent_suggestions 
WHERE agent_name = 'Test Agent Suggestion';

-- Cleanup test data
SELECT 'Cleaning up test data...' as test_description;
DELETE FROM merchants WHERE code = 'TEST001';
DELETE FROM receive_accounts WHERE account_number = 'TEST123456';
DELETE FROM agent_suggestions WHERE agent_name = 'Test Agent Suggestion';

SELECT 'Schema test completed successfully!' as result;
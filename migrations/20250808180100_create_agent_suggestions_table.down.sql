-- Migration: create_agent_suggestions_table (rollback)
-- Created at: 2025-08-08 18:01:00
-- Description: Drop agent_suggestions table

BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_agent_suggestions_updated_at ON agent_suggestions;
DROP FUNCTION IF EXISTS update_agent_suggestions_updated_at();

-- Drop table (indexes will be dropped automatically)
DROP TABLE IF EXISTS agent_suggestions;

COMMIT;
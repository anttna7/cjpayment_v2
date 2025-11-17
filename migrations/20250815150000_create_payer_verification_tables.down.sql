-- 回滚付款人验证系统相关表的创建

-- 删除触发器
DROP TRIGGER IF EXISTS payer_credit_scores_update_trigger ON payer_credit_scores;
DROP TRIGGER IF EXISTS duplicate_payment_checks_update_trigger ON duplicate_payment_checks;
DROP TRIGGER IF EXISTS account_match_verifications_update_trigger ON account_match_verifications;
DROP TRIGGER IF EXISTS payer_blacklist_update_trigger ON payer_blacklist;
DROP TRIGGER IF EXISTS payer_verifications_update_trigger ON payer_verifications;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_payer_verification_updated_at();

-- 删除表
DROP TABLE IF EXISTS payer_credit_scores CASCADE;
DROP TABLE IF EXISTS duplicate_payment_checks CASCADE;
DROP TABLE IF EXISTS account_match_verifications CASCADE;
DROP TABLE IF EXISTS payer_blacklist CASCADE;
DROP TABLE IF EXISTS payer_verifications CASCADE;
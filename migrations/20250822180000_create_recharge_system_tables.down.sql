-- 充值系统数据库表删除脚本

-- 删除外键约束后删除表
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS system_configs;
DROP TABLE IF EXISTS bank_dictionary;
DROP TABLE IF EXISTS polling_rules_new;
DROP TABLE IF EXISTS recharge_orders_new;
DROP TABLE IF EXISTS receive_accounts_new;
DROP TABLE IF EXISTS payment_accounts;
DROP TABLE IF EXISTS ad_accounts;
DROP TABLE IF EXISTS merchants;

SET FOREIGN_KEY_CHECKS = 1;
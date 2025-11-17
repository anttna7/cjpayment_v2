-- 回滚充值链接管理表的创建

DROP TRIGGER IF EXISTS recharge_links_update_trigger ON recharge_links;
DROP FUNCTION IF EXISTS update_recharge_links_updated_at();

DROP TABLE IF EXISTS recharge_link_logs CASCADE;
DROP TABLE IF EXISTS recharge_links CASCADE;
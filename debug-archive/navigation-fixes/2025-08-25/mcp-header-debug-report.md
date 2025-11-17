# MCP Header调试报告

**测试时间**: 2025-08-24T16:28:05.934Z
**测试页面数**: 6
**通过页面**: 5
**失败页面**: 1
**总问题数**: 1

## 一致性检查结果

- UI一致性: ❌
- 交互一致性: ❌
- 样式一致性: ✅
- 数据一致性: ❌

## 详细测试结果

### 仪表板
**URL**: http://localhost:8091/dashboard
**状态**: ✅ 通过
**UI检查**: ✅ header__right, ✅ theme-toggle, ✅ notifications, ✅ user-menu
**交互测试**: ❌ 主题切换, ✅ 通知展开, ✅ 菜单展开
**数据检查**: 通知数量=2, 帮助中心=✅
**通知内容**: 系统状态更新, 新的支付请求

### 系统管理
**URL**: http://localhost:8091/system_management
**状态**: ⚠️ 存在问题
**UI检查**: ✅ header__right, ✅ theme-toggle, ✅ notifications, ✅ user-menu
**交互测试**: ✅ 主题切换, ✅ 通知展开, ✅ 菜单展开
**数据检查**: 通知数量=2, 帮助中心=❌
**通知内容**: 系统状态更新, 新的支付请求
**问题列表**:
- ❌ 缺少帮助中心菜单项

### 商户管理
**URL**: http://localhost:8091/merchant
**状态**: ✅ 通过
**UI检查**: ✅ header__right, ✅ theme-toggle, ✅ notifications, ✅ user-menu
**交互测试**: ✅ 主题切换, ✅ 通知展开, ✅ 菜单展开
**数据检查**: 通知数量=2, 帮助中心=✅
**通知内容**: 系统状态更新, 新的支付请求

### 财务审核
**URL**: http://localhost:8091/audit
**状态**: ✅ 通过
**UI检查**: ✅ header__right, ✅ theme-toggle, ✅ notifications, ✅ user-menu
**交互测试**: ✅ 主题切换, ✅ 通知展开, ✅ 菜单展开
**数据检查**: 通知数量=2, 帮助中心=✅
**通知内容**: 系统状态更新, 新的支付请求

### 账户管理
**URL**: http://localhost:8091/accounts
**状态**: ✅ 通过
**UI检查**: ✅ header__right, ✅ theme-toggle, ✅ notifications, ✅ user-menu
**交互测试**: ✅ 主题切换, ✅ 通知展开, ✅ 菜单展开
**数据检查**: 通知数量=2, 帮助中心=✅
**通知内容**: 系统状态更新, 新的支付请求

### 数据报表
**URL**: http://localhost:8091/reports
**状态**: ✅ 通过
**UI检查**: ✅ header__right, ✅ theme-toggle, ✅ notifications, ✅ user-menu
**交互测试**: ❌ 主题切换, ✅ 通知展开, ✅ 菜单展开
**数据检查**: 通知数量=2, 帮助中心=✅
**通知内容**: 系统状态更新, 新的支付请求

## 修复建议

- 需要统一各页面的CSS样式文件引用
- 需要使用统一的通知数据源和用户菜单配置
- 需要确保所有页面都正确加载header-unified.js
- 修复问题: 缺少帮助中心菜单项

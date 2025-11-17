// 完整的权限数据源 - 统一管理所有系统权限
class PermissionsData {
    constructor() {
        this.permissions = this.getCompletePermissions();
        this.roles = this.getCompleteRoles();
    }

    /**
     * 获取完整的权限定义
     * 包含所有系统模块的权限点
     */
    getCompletePermissions() {
        return [
            // 核心功能权限
            {
                id: 'dashboard:view',
                resource: 'dashboard',
                action: 'view',
                name: '仪表板查看',
                description: '查看系统仪表板和统计信息',
                category: '核心功能',
                level: 1
            },
            {
                id: 'dashboard:export',
                resource: 'dashboard',
                action: 'export',
                name: '仪表板导出',
                description: '导出仪表板数据和报表',
                category: '核心功能',
                level: 2
            },

            // 商户管理权限
            {
                id: 'merchant:view',
                resource: 'merchant',
                action: 'view',
                name: '商户查看',
                description: '查看商户信息和列表',
                category: '业务管理',
                level: 1
            },
            {
                id: 'merchant:create',
                resource: 'merchant',
                action: 'create',
                name: '商户创建',
                description: '创建新的商户账户',
                category: '业务管理',
                level: 2
            },
            {
                id: 'merchant:update',
                resource: 'merchant',
                action: 'update',
                name: '商户更新',
                description: '修改商户信息',
                category: '业务管理',
                level: 3
            },
            {
                id: 'merchant:delete',
                resource: 'merchant',
                action: 'delete',
                name: '商户删除',
                description: '删除商户账户',
                category: '业务管理',
                level: 4
            },
            {
                id: 'merchant:export',
                resource: 'merchant',
                action: 'export',
                name: '商户导出',
                description: '导出商户数据',
                category: '业务管理',
                level: 2
            },
            {
                id: 'merchant:audit',
                resource: 'merchant',
                action: 'audit',
                name: '商户审核',
                description: '审核商户资质和申请',
                category: '业务管理',
                level: 4
            },

            // 账户管理权限
            {
                id: 'account:view',
                resource: 'account',
                action: 'view',
                name: '账户查看',
                description: '查看账户信息和余额',
                category: '业务管理',
                level: 1
            },
            {
                id: 'account:create',
                resource: 'account',
                action: 'create',
                name: '账户创建',
                description: '创建新的收款账户',
                category: '业务管理',
                level: 2
            },
            {
                id: 'account:update',
                resource: 'account',
                action: 'update',
                name: '账户更新',
                description: '修改账户信息和配置',
                category: '业务管理',
                level: 3
            },
            {
                id: 'account:delete',
                resource: 'account',
                action: 'delete',
                name: '账户删除',
                description: '删除收款账户',
                category: '业务管理',
                level: 4
            },
            {
                id: 'account:balance',
                resource: 'account',
                action: 'balance',
                name: '余额查看',
                description: '查看账户余额和流水',
                category: '业务管理',
                level: 2
            },

            // 财务审核权限
            {
                id: 'financial_audit:view',
                resource: 'financial_audit',
                action: 'view',
                name: '财务审核查看',
                description: '查看财务审核记录和状态',
                category: '财务管理',
                level: 1
            },
            {
                id: 'financial_audit:audit',
                resource: 'financial_audit',
                action: 'audit',
                name: '财务审核操作',
                description: '执行财务审核和批准',
                category: '财务管理',
                level: 4
            },
            {
                id: 'financial_audit:export',
                resource: 'financial_audit',
                action: 'export',
                name: '财务审核导出',
                description: '导出审核数据和报告',
                category: '财务管理',
                level: 2
            },
            {
                id: 'financial_audit:reject',
                resource: 'financial_audit',
                action: 'reject',
                name: '财务审核拒绝',
                description: '拒绝财务审核申请',
                category: '财务管理',
                level: 3
            },

            // 用户管理权限
            {
                id: 'user:view',
                resource: 'user',
                action: 'view',
                name: '用户查看',
                description: '查看用户信息和列表',
                category: '用户权限',
                level: 1
            },
            {
                id: 'user:create',
                resource: 'user',
                action: 'create',
                name: '用户创建',
                description: '创建新用户账户',
                category: '用户权限',
                level: 3
            },
            {
                id: 'user:update',
                resource: 'user',
                action: 'update',
                name: '用户更新',
                description: '修改用户信息和设置',
                category: '用户权限',
                level: 3
            },
            {
                id: 'user:delete',
                resource: 'user',
                action: 'delete',
                name: '用户删除',
                description: '删除用户账户',
                category: '用户权限',
                level: 4
            },
            {
                id: 'user:reset_password',
                resource: 'user',
                action: 'reset_password',
                name: '密码重置',
                description: '重置用户密码',
                category: '用户权限',
                level: 3
            },

            // 角色管理权限
            {
                id: 'role:view',
                resource: 'role',
                action: 'view',
                name: '角色查看',
                description: '查看角色信息和权限',
                category: '用户权限',
                level: 1
            },
            {
                id: 'role:create',
                resource: 'role',
                action: 'create',
                name: '角色创建',
                description: '创建新的用户角色',
                category: '用户权限',
                level: 4
            },
            {
                id: 'role:update',
                resource: 'role',
                action: 'update',
                name: '角色更新',
                description: '修改角色权限配置',
                category: '用户权限',
                level: 4
            },
            {
                id: 'role:delete',
                resource: 'role',
                action: 'delete',
                name: '角色删除',
                description: '删除用户角色',
                category: '用户权限',
                level: 5
            },

            // 系统管理权限
            {
                id: 'system:view',
                resource: 'system',
                action: 'view',
                name: '系统查看',
                description: '查看系统设置和配置',
                category: '系统管理',
                level: 1
            },
            {
                id: 'system:config',
                resource: 'system',
                action: 'config',
                name: '系统配置',
                description: '修改系统配置参数',
                category: '系统管理',
                level: 4
            },
            {
                id: 'system:backup',
                resource: 'system',
                action: 'backup',
                name: '系统备份',
                description: '执行系统数据备份',
                category: '系统管理',
                level: 5
            },
            {
                id: 'system:log',
                resource: 'system',
                action: 'log',
                name: '系统日志',
                description: '查看系统操作日志',
                category: '系统管理',
                level: 2
            },
            {
                id: 'system:manage',
                resource: 'system',
                action: 'manage',
                name: '系统管理',
                description: '完全管理系统设置',
                category: '系统管理',
                level: 5
            },

            // 充值管理权限
            {
                id: 'recharge:view',
                resource: 'recharge',
                action: 'view',
                name: '充值查看',
                description: '查看充值记录和统计',
                category: '充值管理',
                level: 1
            },
            {
                id: 'recharge:create',
                resource: 'recharge',
                action: 'create',
                name: '充值创建',
                description: '创建充值订单和链接',
                category: '充值管理',
                level: 2
            },
            {
                id: 'recharge:update',
                resource: 'recharge',
                action: 'update',
                name: '充值更新',
                description: '修改充值配置和规则',
                category: '充值管理',
                level: 3
            },
            {
                id: 'recharge:manage',
                resource: 'recharge',
                action: 'manage',
                name: '充值管理',
                description: '完全管理充值系统',
                category: '充值管理',
                level: 4
            },
            {
                id: 'recharge:config',
                resource: 'recharge',
                action: 'config',
                name: '充值配置',
                description: '配置充值通道和参数',
                category: '充值管理',
                level: 4
            },

            // 数据分析权限
            {
                id: 'analytics:view',
                resource: 'analytics',
                action: 'view',
                name: '数据分析查看',
                description: '查看业务数据分析报告',
                category: '数据分析',
                level: 1
            },
            {
                id: 'analytics:export',
                resource: 'analytics',
                action: 'export',
                name: '数据分析导出',
                description: '导出分析数据和报表',
                category: '数据分析',
                level: 2
            },
            {
                id: 'analytics:advanced',
                resource: 'analytics',
                action: 'advanced',
                name: '高级数据分析',
                description: '访问高级分析功能',
                category: '数据分析',
                level: 3
            },

            // 报表管理权限
            {
                id: 'report:view',
                resource: 'report',
                action: 'view',
                name: '报表查看',
                description: '查看各类业务报表',
                category: '数据分析',
                level: 1
            },
            {
                id: 'report:create',
                resource: 'report',
                action: 'create',
                name: '报表创建',
                description: '创建自定义报表',
                category: '数据分析',
                level: 3
            },
            {
                id: 'report:export',
                resource: 'report',
                action: 'export',
                name: '报表导出',
                description: '导出报表数据',
                category: '数据分析',
                level: 2
            }
        ];
    }

    /**
     * 获取完整的角色定义
     */
    getCompleteRoles() {
        const allPermissions = this.getCompletePermissions();

        return [
            {
                id: 'SUPER_ADMIN',
                name: '超级管理员',
                description: '拥有系统所有权限，可以管理用户、角色和系统配置',
                level: 5,
                permissions: allPermissions.map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'ADMIN',
                name: '管理员',
                description: '拥有大部分管理权限，但不能管理超级管理员',
                level: 4,
                permissions: allPermissions.filter(p => p.level <= 4).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'FINANCIAL_MANAGER',
                name: '财务主管',
                description: '负责财务相关的审核和管理工作',
                level: 3,
                permissions: allPermissions.filter(p =>
                    ['dashboard', 'account', 'financial_audit', 'report', 'analytics'].includes(p.resource)
                ).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'AUDITOR',
                name: '审核员',
                description: '主要负责审核工作和数据查看',
                level: 2,
                permissions: allPermissions.filter(p =>
                    p.action === 'view' || p.action === 'audit' || p.action === 'export'
                ).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'OPERATOR',
                name: '操作员',
                description: '负责日常业务操作',
                level: 2,
                permissions: allPermissions.filter(p =>
                    ['dashboard', 'merchant', 'account', 'recharge'].includes(p.resource) && p.level <= 3
                ).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'VIEWER',
                name: '查看员',
                description: '只能查看数据，无修改权限',
                level: 1,
                permissions: allPermissions.filter(p => p.action === 'view').map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            }
        ];
    }

    /**
     * 按类别分组权限
     */
    groupPermissionsByCategory() {
        const grouped = {};
        this.permissions.forEach(permission => {
            const category = permission.category || '其他';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(permission);
        });
        return grouped;
    }

    /**
     * 按级别筛选权限
     */
    getPermissionsByLevel(maxLevel) {
        return this.permissions.filter(p => p.level <= maxLevel);
    }

    /**
     * 按资源筛选权限
     */
    getPermissionsByResource(resource) {
        return this.permissions.filter(p => p.resource === resource);
    }

    /**
     * 获取权限名称
     */
    getPermissionName(permissionId) {
        const permission = this.permissions.find(p => p.id === permissionId);
        return permission ? permission.name : permissionId;
    }

    /**
     * 获取角色权限
     */
    getRolePermissions(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        return role ? role.permissions : [];
    }

    /**
     * 获取分类图标
     */
    getCategoryIcon(category) {
        const icons = {
            '核心功能': '🏠',
            '业务管理': '💼',
            '财务管理': '💰',
            '数据分析': '📊',
            '用户权限': '👥',
            '系统管理': '⚙️',
            '充值管理': '💳'
        };
        return icons[category] || '📋';
    }

    /**
     * 获取权限级别样式类
     */
    getLevelClass(level) {
        return `permission-level-${level}`;
    }

    /**
     * 获取权限级别文本
     */
    getLevelText(level) {
        const texts = {
            1: '基础',
            2: '普通',
            3: '重要',
            4: '高级',
            5: '超级'
        };
        return texts[level] || '未知';
    }
}

// 创建全局实例
window.PermissionsData = PermissionsData;
window.permissionsData = new PermissionsData();
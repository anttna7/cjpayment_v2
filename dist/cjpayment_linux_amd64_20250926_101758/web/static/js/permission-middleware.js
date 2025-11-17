// 权限验证中间件
class PermissionMiddleware {
    constructor() {
        this.currentUser = null;
        this.currentRole = null;
        this.permissions = new Set();
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.injectPermissionChecks();
        this.monitorDOMChanges();
    }

    // 加载当前用户信息
    async loadCurrentUser() {
        try {
            // 从localStorage或sessionStorage获取用户信息
            const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                this.currentUser = user;
                await this.loadUserPermissions(user.role || 'VIEWER');
            } else {
                // 默认为查看员权限
                await this.loadUserPermissions('VIEWER');
            }
            this.applyPermissionControls();
        } catch (error) {
            console.error('加载用户权限失败:', error);
            // 默认最低权限
            await this.loadUserPermissions('VIEWER');
            this.applyPermissionControls();
        }
    }

    // 加载用户权限
    async loadUserPermissions(roleId) {
        try {
            const response = await fetch('/api/roles');
            const data = await response.json();

            if (data.success) {
                const role = data.roles.find(r => r.id === roleId);
                if (role) {
                    this.currentRole = role;
                    this.permissions = new Set(role.permissions);
                }
            }
        } catch (error) {
            console.error('加载角色权限失败:', error);
        }
    }

    // 检查权限
    hasPermission(resource, action) {
        const permissionKey = `${resource}:${action}`;
        return this.permissions.has(permissionKey) || this.permissions.has(`${resource}:manage`);
    }

    // 检查页面访问权限
    canAccessPage(page) {
        const pagePermissions = {
            'dashboard': 'dashboard:view',
            'merchant': 'merchant:view',
            'accounts': 'account:view',
            'audit': 'financial_audit:view',
            'reports': 'dashboard:view',
            'user_management': 'user:view',
            'permission_management': 'role:view',
            'system_management': 'system:view',
            'security_center': 'system:view',
            'api_management': 'system:view',
            'monitoring_alerts': 'system:view',
            'backup_management': 'system:view'
        };

        const requiredPermission = pagePermissions[page];
        if (!requiredPermission) return true; // 未定义的页面默认允许访问

        const [resource, action] = requiredPermission.split(':');
        return this.hasPermission(resource, action);
    }

    // 应用权限控制
    applyPermissionControls() {
        this.hideUnauthorizedElements();
        this.disableUnauthorizedActions();
        this.updateNavigationMenu();
        this.protectForms();
    }

    // 隐藏无权限的元素
    hideUnauthorizedElements() {
        // 查找所有带有权限标记的元素
        document.querySelectorAll('[data-permission]').forEach(element => {
            const permission = element.getAttribute('data-permission');
            const [resource, action] = permission.split(':');

            if (!this.hasPermission(resource, action)) {
                element.style.display = 'none';
                element.setAttribute('data-permission-hidden', 'true');
            } else {
                element.style.display = '';
                element.removeAttribute('data-permission-hidden');
            }
        });

        // 隐藏无权限的按钮
        this.hideUnauthorizedButtons();
    }

    // 隐藏无权限的按钮
    hideUnauthorizedButtons() {
        const buttonPermissions = {
            // 商户管理相关
            'addMerchant': 'merchant:create',
            'editMerchant': 'merchant:update',
            'deleteMerchant': 'merchant:delete',
            'auditMerchant': 'merchant:audit',
            'exportMerchants': 'merchant:export',

            // 账户管理相关
            'addAccount': 'account:create',
            'editAccount': 'account:update',
            'deleteAccount': 'account:delete',
            'exportAccounts': 'account:export',

            // 用户管理相关
            'addUser': 'user:create',
            'editUser': 'user:update',
            'deleteUser': 'user:delete',
            'importUsers': 'user:import',

            // 角色管理相关
            'createRole': 'role:create',
            'editRole': 'role:update',
            'deleteRole': 'role:delete',

            // 系统管理相关
            'systemConfig': 'system:manage',
            'backupSystem': 'system:manage',

            // 财务审核相关
            'auditTransaction': 'financial_audit:audit',
            'exportAudit': 'financial_audit:export'
        };

        Object.entries(buttonPermissions).forEach(([buttonId, permission]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                const [resource, action] = permission.split(':');
                if (!this.hasPermission(resource, action)) {
                    button.style.display = 'none';
                    button.disabled = true;
                } else {
                    button.style.display = '';
                    button.disabled = false;
                }
            }
        });
    }

    // 禁用无权限的操作
    disableUnauthorizedActions() {
        // 禁用无权限的链接点击
        document.querySelectorAll('a[data-action]').forEach(link => {
            const action = link.getAttribute('data-action');
            const resource = link.getAttribute('data-resource') || this.getResourceFromUrl(link.href);

            if (!this.hasPermission(resource, action)) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showPermissionDeniedMessage(resource, action);
                });
                link.classList.add('disabled');
                link.title = '您没有权限执行此操作';
            }
        });
    }

    // 更新导航菜单
    updateNavigationMenu() {
        const navItems = document.querySelectorAll('.nav__item');

        navItems.forEach(item => {
            const link = item.querySelector('.nav__link');
            if (link) {
                const route = link.getAttribute('data-route');
                if (route && !this.canAccessPage(route)) {
                    item.style.display = 'none';
                }
            }
        });
    }

    // 保护表单提交
    protectForms() {
        document.querySelectorAll('form[data-permission]').forEach(form => {
            const permission = form.getAttribute('data-permission');
            const [resource, action] = permission.split(':');

            if (!this.hasPermission(resource, action)) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.showPermissionDeniedMessage(resource, action);
                });
            }
        });
    }

    // 注入权限检查到常见操作
    injectPermissionChecks() {
        // 劫持 fetch 请求，添加权限检查
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            const options = args[1] || {};

            // 检查API权限
            if (this.shouldCheckApiPermission(url, options.method)) {
                const permission = this.getApiPermission(url, options.method);
                if (permission) {
                    const [resource, action] = permission.split(':');
                    if (!this.hasPermission(resource, action)) {
                        throw new Error(`权限不足: 需要 ${permission} 权限`);
                    }
                }
            }

            return originalFetch.apply(this, args);
        };
    }

    // 监控DOM变化，对新增元素应用权限控制
    monitorDOMChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.hasAttribute('data-permission') ||
                                node.querySelector('[data-permission]')) {
                                shouldReapply = true;
                            }
                        }
                    });
                }
            });

            if (shouldReapply) {
                this.applyPermissionControls();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 判断是否需要检查API权限
    shouldCheckApiPermission(url, method = 'GET') {
        return url.includes('/api/') && !url.includes('/api/login');
    }

    // 获取API对应的权限
    getApiPermission(url, method = 'GET') {
        const apiPermissions = {
            // 商户管理API
            'GET:/api/merchants': 'merchant:view',
            'POST:/api/merchants': 'merchant:create',
            'PUT:/api/merchants': 'merchant:update',
            'DELETE:/api/merchants': 'merchant:delete',

            // 账户管理API
            'GET:/api/accounts': 'account:view',
            'POST:/api/accounts': 'account:create',
            'PUT:/api/accounts': 'account:update',
            'DELETE:/api/accounts': 'account:delete',

            // 用户管理API
            'GET:/api/users': 'user:view',
            'POST:/api/users': 'user:create',
            'PUT:/api/users': 'user:update',
            'DELETE:/api/users': 'user:delete',

            // 角色管理API
            'GET:/api/roles': 'role:view',
            'POST:/api/roles': 'role:create',
            'PUT:/api/roles': 'role:update',
            'DELETE:/api/roles': 'role:delete',

            // 权限管理API
            'GET:/api/permissions': 'role:view',

            // 财务审核API
            'GET:/api/audit': 'financial_audit:view',
            'POST:/api/audit': 'financial_audit:audit',

            // 系统管理API
            'GET:/api/system': 'system:view',
            'POST:/api/system': 'system:manage',
            'PUT:/api/system': 'system:manage'
        };

        // 提取API路径模式
        const apiPath = url.split('?')[0]; // 移除查询参数
        const key = `${method.toUpperCase()}:${apiPath}`;

        // 精确匹配
        if (apiPermissions[key]) {
            return apiPermissions[key];
        }

        // 模糊匹配
        for (const [pattern, permission] of Object.entries(apiPermissions)) {
            if (apiPath.includes(pattern.split(':')[1])) {
                return permission;
            }
        }

        return null;
    }

    // 从URL获取资源类型
    getResourceFromUrl(url) {
        const pathname = new URL(url, window.location.origin).pathname;

        if (pathname.includes('merchant')) return 'merchant';
        if (pathname.includes('account')) return 'account';
        if (pathname.includes('user')) return 'user';
        if (pathname.includes('role') || pathname.includes('permission')) return 'role';
        if (pathname.includes('audit')) return 'financial_audit';
        if (pathname.includes('system')) return 'system';
        if (pathname.includes('dashboard')) return 'dashboard';

        return 'unknown';
    }

    // 显示权限不足消息
    showPermissionDeniedMessage(resource, action) {
        const message = `权限不足：您没有权限执行 "${resource}:${action}" 操作`;

        // 创建通知
        this.showNotification(message, 'error');

        // 记录权限拒绝日志
        this.logPermissionDenied(resource, action);
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `permission-notification permission-notification-${type}`;
        notification.innerHTML = `
            <div class="permission-notification-content">
                <span class="permission-notification-icon">
                    ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span class="permission-notification-message">${message}</span>
            </div>
            <button class="permission-notification-close">&times;</button>
        `;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-left: 4px solid ${type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
            z-index: 10000;
            min-width: 300px;
            max-width: 500px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        // 关闭按钮
        notification.querySelector('.permission-notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    // 记录权限拒绝日志
    logPermissionDenied(resource, action) {
        const logData = {
            user: this.currentUser?.username || 'anonymous',
            role: this.currentRole?.name || 'unknown',
            resource,
            action,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // 发送到后端日志系统
        fetch('/api/audit/permission-denied', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        }).catch(error => {
            console.error('记录权限拒绝日志失败:', error);
        });

        // 本地日志
        console.warn('权限拒绝:', logData);
    }

    // 刷新权限
    async refreshPermissions() {
        await this.loadCurrentUser();
        this.applyPermissionControls();
    }

    // 设置用户角色
    setUserRole(roleId) {
        if (this.currentUser) {
            this.currentUser.role = roleId;
            localStorage.setItem('userInfo', JSON.stringify(this.currentUser));
        }
        this.loadUserPermissions(roleId).then(() => {
            this.applyPermissionControls();
        });
    }

    // 获取当前用户权限列表
    getCurrentPermissions() {
        return Array.from(this.permissions);
    }

    // 获取当前角色信息
    getCurrentRole() {
        return this.currentRole;
    }

    // 检查是否有管理员权限
    isAdmin() {
        return this.currentRole && this.currentRole.level >= 4;
    }

    // 检查是否有超级管理员权限
    isSuperAdmin() {
        return this.currentRole && this.currentRole.level >= 5;
    }
}

// 添加CSS动画
const permissionStyles = document.createElement('style');
permissionStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .permission-notification {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .permission-notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .permission-notification-message {
        color: #374151;
        font-size: 0.9rem;
    }

    .permission-notification-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: #6B7280;
        padding: 0;
        margin-left: 1rem;
        line-height: 1;
    }

    .permission-notification-close:hover {
        color: #374151;
    }

    [data-permission-hidden="true"] {
        display: none !important;
    }

    .disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }
`;
document.head.appendChild(permissionStyles);

// 全局实例
window.permissionMiddleware = new PermissionMiddleware();

// 导出权限检查函数供其他脚本使用
window.hasPermission = (resource, action) => {
    return window.permissionMiddleware.hasPermission(resource, action);
};

window.canAccessPage = (page) => {
    return window.permissionMiddleware.canAccessPage(page);
};

window.refreshPermissions = () => {
    return window.permissionMiddleware.refreshPermissions();
};

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('权限中间件已加载');
});
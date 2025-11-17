/**
 * CJPayment 统一头部组件管理
 * 统一处理用户信息显示、主题切换、通知管理等功能
 */

class HeaderUnified {
    constructor() {
        this.currentUser = this.getUserInfo();
        this.notifications = [];
        this.init();
    }

    /**
     * 初始化头部组件
     */
    init() {
        this.initUserInfo();
        this.initThemeToggle();
        this.initNotifications();
        this.initUserMenu();
        this.initMobileMenu();
        this.ensureDropdownsHidden(); // 确保页面加载时所有dropdown都是隐藏的
        console.log('HeaderUnified: 统一头部组件初始化完成');
    }

    /**
     * 获取用户信息（统一的用户数据源）
     */
    getUserInfo() {
        // 尝试从localStorage获取用户信息
        try {
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                return {
                    id: user.id || 'user_001',
                    name: user.name || user.username || '系统管理员',
                    role: user.role || '超级管理员',
                    avatar: user.avatar || '👤',
                    email: user.email || 'admin@cjpayment.com',
                    permissions: user.permissions || ['all']
                };
            }
        } catch (error) {
            console.warn('HeaderUnified: 解析用户信息失败', error);
        }

        // 返回默认用户信息
        return {
            id: 'admin_001',
            name: '系统管理员',
            role: '超级管理员',
            avatar: '👤',
            email: 'admin@cjpayment.com',
            permissions: ['all']
        };
    }

    /**
     * 初始化用户信息显示（统一所有页面）
     */
    initUserInfo() {
        // 更新用户名显示
        const userNameElements = document.querySelectorAll('#userName, .user-menu__name');
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = this.currentUser.name;
            }
        });

        // 更新用户角色显示
        const userRoleElements = document.querySelectorAll('.user-menu__role');
        userRoleElements.forEach(element => {
            if (element) {
                element.textContent = this.currentUser.role;
            }
        });

        // 更新用户头像显示
        const userAvatarElements = document.querySelectorAll('.user-menu__avatar');
        userAvatarElements.forEach(element => {
            if (element) {
                element.textContent = this.currentUser.avatar;
            }
        });

        // 保存用户信息到localStorage（确保数据一致性）
        localStorage.setItem('userInfo', JSON.stringify(this.currentUser));

        console.log('HeaderUnified: 用户信息已统一更新', this.currentUser);
    }

    /**
     * 初始化主题切换功能
     */
    initThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle?.querySelector('.theme-icon');
        const html = document.documentElement;

        if (!themeToggle) return;

        // 加载保存的主题
        const savedTheme = localStorage.getItem('system-theme') || 'light';
        html.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme, themeIcon);

        // 主题切换事件
        themeToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('system-theme', newTheme);
            this.updateThemeIcon(newTheme, themeIcon);
            
            // 触发主题变更事件，让其他组件响应
            window.dispatchEvent(new CustomEvent('themeChanged', { 
                detail: { theme: newTheme } 
            }));
            
            console.log(`HeaderUnified: 主题已切换为 ${newTheme}`);
        });
    }

    /**
     * 更新主题图标
     */
    updateThemeIcon(theme, themeIcon) {
        if (!themeIcon) return;
        
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        const themeToggle = themeIcon.closest('.theme-toggle');
        if (themeToggle) {
            themeToggle.setAttribute('title', 
                theme === 'light' ? '切换到深色主题' : '切换到浅色主题'
            );
        }
    }

    /**
     * 初始化通知系统
     */
    initNotifications() {
        const notificationButton = document.getElementById('notificationButton');
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const clearNotifications = document.getElementById('clearNotifications');

        if (!notificationButton) return;

        // 加载通知数据
        this.loadNotifications();

        // 通知按钮点击事件（修复无法点击问题）
        notificationButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = notificationsDropdown?.classList.contains('show');
            
            // 关闭其他下拉菜单
            this.closeAllDropdowns();
            
            if (!isOpen && notificationsDropdown) {
                // 清除内联样式，让CSS类控制
                notificationsDropdown.style.opacity = '';
                notificationsDropdown.style.visibility = '';
                notificationsDropdown.style.transform = '';
                notificationsDropdown.style.pointerEvents = '';
                
                notificationsDropdown.classList.add('show');
                notificationButton.setAttribute('aria-expanded', 'true');
                console.log('HeaderUnified: 通知面板已打开');
            }
        });

        // 清除所有通知
        clearNotifications?.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearAllNotifications();
        });

        // 点击外部关闭通知面板
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notifications') && notificationsDropdown) {
                notificationsDropdown.classList.remove('show');
                notificationButton.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * 加载通知数据
     */
    loadNotifications() {
        // 模拟通知数据
        this.notifications = [
            {
                id: 1,
                title: '系统状态更新',
                message: '所有服务运行正常',
                time: '5分钟前',
                unread: true,
                type: 'info'
            },
            {
                id: 2,
                title: '新的支付请求',
                message: '商户A提交了新的支付申请',
                time: '10分钟前',
                unread: true,
                type: 'success'
            }
        ];

        this.updateNotificationUI();
    }

    /**
     * 更新通知UI显示
     */
    updateNotificationUI() {
        const notificationBadge = document.getElementById('notificationBadge');
        const notificationsList = document.getElementById('notificationsList');

        if (!notificationsList) return;

        const unreadCount = this.notifications.filter(n => n.unread).length;

        // 更新通知徽章
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
                notificationBadge.style.display = 'flex';
            } else {
                notificationBadge.style.display = 'none';
            }
        }

        // 更新通知列表
        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.unread ? 'notification-unread' : ''}">
                <div class="notification-icon ${notification.unread ? 'unread' : ''}"></div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-text">${notification.message}</div>
                    <div class="notification-meta">
                        <span class="notification-time">${notification.time}</span>
                        ${notification.unread ? '<span class="notification-new">新</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        console.log(`HeaderUnified: 通知UI已更新，未读数量: ${unreadCount}`);
    }

    /**
     * 清除所有通知
     */
    clearAllNotifications() {
        this.notifications.forEach(n => n.unread = false);
        this.updateNotificationUI();
        console.log('HeaderUnified: 所有通知已标记为已读');
        
        if (window.CJComponents?.showToast) {
            window.CJComponents.showToast('所有通知已标记为已读', 'success');
        }
    }

    /**
     * 初始化用户菜单（修复交互问题）
     */
    initUserMenu() {
        const userButton = document.getElementById('userButton');
        const userDropdown = document.getElementById('userDropdown');

        if (!userButton) return;

        // 用户菜单点击事件
        userButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = userDropdown?.classList.contains('show');
            
            // 关闭其他下拉菜单
            this.closeAllDropdowns();
            
            if (!isOpen && userDropdown) {
                // 清除内联样式，让CSS类控制
                userDropdown.style.opacity = '';
                userDropdown.style.visibility = '';
                userDropdown.style.transform = '';
                userDropdown.style.pointerEvents = '';
                
                userDropdown.classList.add('show');
                userButton.setAttribute('aria-expanded', 'true');
                console.log('HeaderUnified: 用户菜单已打开');
            }
        });

        // 菜单项点击事件
        this.initUserMenuItems();

        // 点击外部关闭用户菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu') && userDropdown) {
                userDropdown.classList.remove('show');
                userButton.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * 初始化用户菜单项交互
     */
    initUserMenuItems() {
        // 个人资料
        const profileLink = document.querySelector('a[href="/profile"]');
        profileLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openUserProfile();
        });

        // 账户设置
        const settingsLink = document.querySelector('a[href="/account-settings"]');
        settingsLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAccountSettings();
        });

        // 帮助中心
        const helpLink = document.querySelector('a[href="/help"]');
        helpLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelpCenter();
        });

        // 退出登录
        const logoutLink = document.getElementById('logoutLink');
        logoutLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    }

    /**
     * 打开个人资料模态框
     */
    openUserProfile() {
        console.log('HeaderUnified: 打开个人资料');
        
        // 创建个人资料模态框
        const profileModal = this.createProfileModal();
        document.body.appendChild(profileModal);
        
        // 显示模态框
        setTimeout(() => {
            profileModal.classList.add('show');
        }, 50);
    }

    /**
     * 创建个人资料模态框
     */
    createProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>个人资料</h3>
                    <button class="modal-close" type="button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="profile-info">
                        <div class="profile-avatar">
                            <div class="avatar-display">${this.currentUser.avatar}</div>
                            <button class="avatar-change-btn">更换头像</button>
                        </div>
                        <div class="profile-details">
                            <div class="form-group">
                                <label>用户名</label>
                                <input type="text" value="${this.currentUser.name}" id="profileName">
                            </div>
                            <div class="form-group">
                                <label>角色</label>
                                <input type="text" value="${this.currentUser.role}" readonly>
                            </div>
                            <div class="form-group">
                                <label>邮箱</label>
                                <input type="email" value="${this.currentUser.email}" id="profileEmail">
                            </div>
                            <div class="form-group">
                                <label>用户ID</label>
                                <input type="text" value="${this.currentUser.id}" readonly>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline modal-cancel">取消</button>
                    <button class="btn btn-primary modal-save">保存更改</button>
                </div>
            </div>
        `;

        // 添加模态框样式
        this.injectModalStyles();

        // 绑定模态框事件
        this.bindModalEvents(modal);

        return modal;
    }

    /**
     * 打开账户设置
     */
    openAccountSettings() {
        console.log('HeaderUnified: 打开账户设置页面');
        
        // 直接跳转到账户设置页面
        window.location.href = '/account-settings';
    }

    /**
     * 打开帮助中心
     */
    openHelpCenter() {
        console.log('HeaderUnified: 打开帮助中心');
        
        // 创建帮助中心窗口
        const helpWindow = window.open('', 'helpCenter', 'width=800,height=600,scrollbars=yes');
        helpWindow.document.write(`
            <html>
                <head>
                    <title>CJPayment 帮助中心</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
                        h1 { color: #0369a1; }
                        .help-section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>CJPayment 帮助中心</h1>
                    <div class="help-section">
                        <h2>快速开始</h2>
                        <p>欢迎使用CJPayment企业内部支付管理系统</p>
                    </div>
                    <div class="help-section">
                        <h2>功能介绍</h2>
                        <ul>
                            <li>商户管理：管理系统中的商户信息</li>
                            <li>账户管理：管理收付款账户</li>
                            <li>财务审核：审核支付申请</li>
                            <li>数据报表：查看业务数据统计</li>
                            <li>系统管理：系统配置和用户管理</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h2>联系我们</h2>
                        <p>技术支持：support@cjpayment.com</p>
                        <p>客服热线：400-888-8888</p>
                    </div>
                </body>
            </html>
        `);
    }

    /**
     * 处理退出登录
     */
    handleLogout() {
        if (confirm('确定要退出登录吗？')) {
            console.log('HeaderUnified: 用户退出登录');
            
            // 清除本地存储
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            
            // 显示退出提示
            if (window.CJComponents?.showToast) {
                window.CJComponents.showToast('已安全退出系统', 'success');
            }
            
            // 延迟跳转到登录页
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        }
    }

    /**
     * 初始化移动端菜单
     */
    initMobileMenu() {
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const nav = document.querySelector('.nav');

        if (!mobileToggle) return;

        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            nav?.classList.toggle('show');
        });
    }

    /**
     * 确保所有dropdown在页面加载时都是隐藏状态
     */
    ensureDropdownsHidden() {
        // 强制隐藏通知下拉菜单
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const notificationButton = document.getElementById('notificationButton');
        const notifications = document.getElementById('notifications');
        
        if (notificationsDropdown) {
            notificationsDropdown.classList.remove('show');
            notificationsDropdown.style.opacity = '0';
            notificationsDropdown.style.visibility = 'hidden';
            notificationsDropdown.style.transform = 'translateY(-10px)';
            notificationsDropdown.style.pointerEvents = 'none';
        }
        if (notificationButton) {
            notificationButton.setAttribute('aria-expanded', 'false');
        }
        if (notifications) {
            notifications.classList.remove('active');
        }

        // 强制隐藏用户菜单
        const userDropdown = document.getElementById('userDropdown');
        const userButton = document.getElementById('userButton');
        const userMenu = document.getElementById('userMenu');
        
        if (userDropdown) {
            userDropdown.classList.remove('show');
            userDropdown.style.opacity = '0';
            userDropdown.style.visibility = 'hidden';
            userDropdown.style.transform = 'translateY(-10px)';
            userDropdown.style.pointerEvents = 'none';
        }
        if (userButton) {
            userButton.setAttribute('aria-expanded', 'false');
        }
        if (userMenu) {
            userMenu.classList.remove('active');
        }
        
        console.log('HeaderUnified: 所有dropdown已强制隐藏');
    }

    /**
     * 关闭所有下拉菜单
     */
    closeAllDropdowns() {
        // 关闭通知下拉菜单
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const notificationButton = document.getElementById('notificationButton');
        if (notificationsDropdown) {
            notificationsDropdown.classList.remove('show');
            notificationButton?.setAttribute('aria-expanded', 'false');
        }

        // 关闭用户菜单
        const userDropdown = document.getElementById('userDropdown');
        const userButton = document.getElementById('userButton');
        if (userDropdown) {
            userDropdown.classList.remove('show');
            userButton?.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * 注入模态框样式
     */
    injectModalStyles() {
        if (document.getElementById('modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1050;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }

            .modal-content {
                background: var(--color-bg-surface, #ffffff);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .modal-overlay.show .modal-content {
                transform: scale(1);
            }

            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--color-border-light, #e5e7eb);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: var(--color-text-primary, #1f2937);
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--color-text-secondary, #6b7280);
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
            }

            .modal-close:hover {
                background: var(--color-bg-secondary, #f3f4f6);
                color: var(--color-text-primary, #1f2937);
            }

            .modal-body {
                padding: 24px;
            }

            .profile-info {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }

            .profile-avatar {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
            }

            .avatar-display {
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, var(--primary-500, #0ea5e9), var(--primary-600, #0284c7));
                color: white;
                border-radius: 50%;
                font-size: 2rem;
                font-weight: 600;
            }

            .avatar-change-btn {
                padding: 6px 12px;
                background: var(--color-bg-secondary, #f3f4f6);
                border: 1px solid var(--color-border-base, #d1d5db);
                border-radius: 6px;
                font-size: 12px;
                color: var(--color-text-secondary, #6b7280);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .avatar-change-btn:hover {
                background: var(--color-bg-tertiary, #e5e7eb);
                color: var(--color-text-primary, #1f2937);
            }

            .form-group {
                margin-bottom: 16px;
            }

            .form-group label {
                display: block;
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 500;
                color: var(--color-text-primary, #1f2937);
            }

            .form-group input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--color-border-base, #d1d5db);
                border-radius: 6px;
                font-size: 14px;
                color: var(--color-text-primary, #1f2937);
                background: var(--color-bg-surface, #ffffff);
                transition: all 0.2s ease;
            }

            .form-group input:focus {
                outline: none;
                border-color: var(--primary-500, #0ea5e9);
                box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
            }

            .form-group input:read-only {
                background: var(--color-bg-secondary, #f3f4f6);
                color: var(--color-text-secondary, #6b7280);
            }

            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid var(--color-border-light, #e5e7eb);
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-footer .btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                border: 1px solid transparent;
                transition: all 0.2s ease;
            }

            .btn-outline {
                background: var(--color-bg-surface, #ffffff);
                color: var(--color-text-primary, #1f2937);
                border-color: var(--color-border-base, #d1d5db);
            }

            .btn-outline:hover {
                background: var(--color-bg-secondary, #f3f4f6);
            }

            .btn-primary {
                background: var(--primary-600, #0284c7);
                color: white;
            }

            .btn-primary:hover {
                background: var(--primary-700, #0369a1);
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * 绑定模态框事件
     */
    bindModalEvents(modal) {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const saveBtn = modal.querySelector('.modal-save');

        // 关闭模态框
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // 保存更改
        saveBtn?.addEventListener('click', () => {
            const nameInput = modal.querySelector('#profileName');
            const emailInput = modal.querySelector('#profileEmail');

            if (nameInput && emailInput) {
                // 更新用户信息
                this.currentUser.name = nameInput.value;
                this.currentUser.email = emailInput.value;
                
                // 保存到localStorage
                localStorage.setItem('userInfo', JSON.stringify(this.currentUser));
                
                // 更新UI显示
                this.initUserInfo();
                
                if (window.CJComponents?.showToast) {
                    window.CJComponents.showToast('个人资料已更新', 'success');
                } else {
                    alert('个人资料已更新');
                }
                
                closeModal();
            }
        });
    }
}

// 全局初始化统一头部组件
window.addEventListener('DOMContentLoaded', () => {
    if (!window.headerUnified) {
        window.headerUnified = new HeaderUnified();
    }
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderUnified;
} else {
    window.HeaderUnified = HeaderUnified;
}
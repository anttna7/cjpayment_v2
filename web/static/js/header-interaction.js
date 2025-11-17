/**
 * 头部导航交互处理
 * 处理通知和用户菜单的展开/收起
 */

(function() {
    'use strict';

    const HeaderInteraction = {
        init() {
            this.setupNotifications();
            this.setupUserMenu();
            this.setupThemeToggle();
            this.setupMobileMenu();
            this.setupClickOutside();
            console.log('✅ Header interactions initialized');
        },

        /**
         * 设置通知交互
         */
        setupNotifications() {
            const notificationButton = document.getElementById('notificationButton');
            const notifications = document.getElementById('notifications');
            
            if (notificationButton && notifications) {
                notificationButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleNotifications();
                });

                // 加载通知数据
                this.loadNotifications();
            }
        },

        /**
         * 切换通知面板
         */
        toggleNotifications() {
            const notifications = document.getElementById('notifications');
            const userMenu = document.getElementById('userMenu');
            
            if (notifications) {
                const isActive = notifications.classList.contains('active');
                
                // 关闭用户菜单
                if (userMenu) {
                    userMenu.classList.remove('active');
                }
                
                // 切换通知面板
                notifications.classList.toggle('active', !isActive);
                
                // 更新aria状态
                const button = document.getElementById('notificationButton');
                if (button) {
                    button.setAttribute('aria-expanded', !isActive);
                }
            }
        },

        /**
         * 加载通知数据
         */
        async loadNotifications() {
            try {
                // 模拟通知数据
                const notifications = [
                    {
                        id: 1,
                        title: '💰 新支付订单',
                        message: '商户"ABC公司"有一笔￥2,580.00的支付订单需要处理',
                        time: '2分钟前',
                        unread: true
                    },
                    {
                        id: 2,
                        title: '🔧 系统维护通知',
                        message: '系统将于今晚23:00-01:00进行例行维护，预计持续2小时',
                        time: '1小时前',
                        unread: true
                    },
                    {
                        id: 3,
                        title: '🛡️ 安全提醒',
                        message: '检测到来自广州的登录请求，如非本人操作请立即修改密码',
                        time: '2小时前',
                        unread: true
                    },
                    {
                        id: 4,
                        title: '📊 数据报表',
                        message: '今日交易数据汇总报表已生成，请及时查看',
                        time: '4小时前',
                        unread: false
                    }
                ];

                this.renderNotifications(notifications);
                this.updateNotificationBadge(notifications.filter(n => n.unread).length);
            } catch (error) {
                console.error('Failed to load notifications:', error);
            }
        },

        /**
         * 渲染通知列表
         */
        renderNotifications(notifications) {
            const notificationList = document.getElementById('notificationList');
            if (!notificationList) return;

            if (notifications.length === 0) {
                notificationList.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: #64748b;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📪</div>
                        <div>暂无新通知</div>
                    </div>
                `;
                return;
            }

            const html = notifications.map(notification => `
                <div class="notification-item ${notification.unread ? 'notification-unread' : 'notification-read'}" data-id="${notification.id}">
                    <div class="notification-icon ${notification.unread ? 'unread' : 'read'}"></div>
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

            notificationList.innerHTML = html;

            // 绑定点击事件
            notificationList.addEventListener('click', (e) => {
                const item = e.target.closest('.notification-item');
                if (item) {
                    this.markNotificationAsRead(item.dataset.id);
                }
            });
        },

        /**
         * 更新通知徽章
         */
        updateNotificationBadge(count) {
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        },

        /**
         * 标记通知为已读
         */
        markNotificationAsRead(notificationId) {
            console.log('Marking notification as read:', notificationId);
            // 这里可以发送API请求标记为已读
        },

        /**
         * 设置用户菜单交互
         */
        setupUserMenu() {
            const userButton = document.getElementById('userButton');
            const userMenu = document.getElementById('userMenu');
            
            if (userButton && userMenu) {
                userButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleUserMenu();
                });

                // 绑定菜单项点击事件
                this.setupUserMenuItems();
            }
        },

        /**
         * 切换用户菜单
         */
        toggleUserMenu() {
            const userMenu = document.getElementById('userMenu');
            const notifications = document.getElementById('notifications');
            
            if (userMenu) {
                const isActive = userMenu.classList.contains('active');
                
                // 关闭通知面板
                if (notifications) {
                    notifications.classList.remove('active');
                }
                
                // 切换用户菜单
                userMenu.classList.toggle('active', !isActive);
                
                // 更新aria状态
                const button = document.getElementById('userButton');
                if (button) {
                    button.setAttribute('aria-expanded', !isActive);
                }
            }
        },

        /**
         * 设置用户菜单项
         */
        setupUserMenuItems() {
            const logoutLink = document.getElementById('logoutLink');
            
            if (logoutLink) {
                logoutLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        },

        /**
         * 处理退出登录
         */
        async handleLogout() {
            if (confirm('确定要退出登录吗？')) {
                try {
                    // 清除本地存储
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userInfo');
                    
                    // 显示加载状态
                    this.showLoading('正在退出...');
                    
                    // 模拟API调用
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 跳转到登录页
                    window.location.href = '/login';
                } catch (error) {
                    console.error('Logout failed:', error);
                    this.showToast('退出失败，请重试', 'error');
                }
            }
        },

        /**
         * 设置主题切换
         */
        setupThemeToggle() {
            const themeToggle = document.getElementById('themeToggle');
            const themeIcon = themeToggle?.querySelector('.theme-icon');
            
            if (themeToggle && themeIcon) {
                // 加载保存的主题
                const savedTheme = localStorage.getItem('theme') || 'light';
                this.applyTheme(savedTheme);
                
                themeToggle.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                    this.applyTheme(newTheme);
                });
            }
        },

        /**
         * 应用主题
         */
        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
            }
        },

        /**
         * 设置移动端菜单
         */
        setupMobileMenu() {
            const mobileToggle = document.getElementById('mobileMenuToggle');
            
            if (mobileToggle) {
                mobileToggle.addEventListener('click', () => {
                    this.toggleMobileMenu();
                });
            }
        },

        /**
         * 切换移动端菜单
         */
        toggleMobileMenu() {
            const nav = document.querySelector('.nav');
            if (nav) {
                nav.classList.toggle('mobile-open');
            }
        },

        /**
         * 设置点击外部关闭
         */
        setupClickOutside() {
            document.addEventListener('click', (e) => {
                const notifications = document.getElementById('notifications');
                const userMenu = document.getElementById('userMenu');
                
                // 关闭通知面板
                if (notifications && 
                    notifications.classList.contains('active') && 
                    !notifications.contains(e.target)) {
                    notifications.classList.remove('active');
                    const button = document.getElementById('notificationButton');
                    if (button) button.setAttribute('aria-expanded', 'false');
                }
                
                // 关闭用户菜单
                if (userMenu && 
                    userMenu.classList.contains('active') && 
                    !userMenu.contains(e.target)) {
                    userMenu.classList.remove('active');
                    const button = document.getElementById('userButton');
                    if (button) button.setAttribute('aria-expanded', 'false');
                }
            });
        },

        /**
         * 显示加载状态
         */
        showLoading(message = '加载中...') {
            const loading = document.getElementById('globalLoading');
            if (loading) {
                const loadingText = loading.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = message;
                }
                loading.style.display = 'flex';
            }
        },

        /**
         * 隐藏加载状态
         */
        hideLoading() {
            const loading = document.getElementById('globalLoading');
            if (loading) {
                loading.style.display = 'none';
            }
        },

        /**
         * 显示提示消息
         */
        showToast(message, type = 'info') {
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(message, type);
            } else {
                console.log(`Toast [${type}]: ${message}`);
            }
        }
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            HeaderInteraction.init();
        });
    } else {
        HeaderInteraction.init();
    }

    // 导出到全局
    window.HeaderInteraction = HeaderInteraction;

})();
/**
 * CJPayment Main Application
 * Core application logic and initialization
 */

window.CJPaymentApp = (function() {
    'use strict';

    class CJPaymentApp {
        constructor(options = {}) {
            this.options = {
                user: null,
                permissions: [],
                config: {},
                ...options
            };

            this.modules = new Map();
            this.eventBus = new EventTarget();

            // Initialize store and router
            this.store = CJStore.store;
            this.router = new CJRouter.Router({
                mode: 'history',
                root: '/'
            });

            this.init();
        }

        init() {
            this.initializeStore();
            this.initializeRouter();
            this.initializeComponents();
            this.initializeAccessibility();
            this.bindGlobalEvents();
            this.loadUserPreferences();
            this.startPeriodicTasks();
        }

        // ==========================================================================
        // Store Initialization
        // ==========================================================================

        initializeStore() {
            // Initialize store with user data
            if (this.options.user) {
                this.store.commit('SET_USER', this.options.user);
                this.store.commit('SET_PERMISSIONS', this.options.permissions);
            }

            // Subscribe to store changes
            this.store.subscribe((mutation, state) => {
                this.handleStoreChange(mutation, state);
            });
        }

        handleStoreChange(mutation, state) {
            switch (mutation.type) {
                case 'SET_USER':
                    this.updateUserDisplay();
                    break;
                case 'SET_LOADING':
                    CJComponents.loading.toggle(state.loading, state.loadingMessage);
                    break;
                case 'SET_THEME':
                    this.applyTheme(state.theme);
                    break;
                case 'ADD_NOTIFICATION':
                    this.updateNotificationBadge();
                    break;
            }
        }

        // ==========================================================================
        // Router Initialization
        // ==========================================================================

        initializeRouter() {
            // Define routes
            this.router.routes({
                '/': {
                    handler: () => this.router.navigate('/dashboard'),
                    name: 'home'
                },
                '/dashboard': {
                    component: '/static/js/modules/dashboard.js',
                    middleware: [CJRouter.middleware.auth],
                    name: 'dashboard'
                },
                '/recharge': {
                    component: '/static/js/modules/recharge.js',
                    middleware: [CJRouter.middleware.auth],
                    name: 'recharge'
                },
                '/recharge/private': {
                    template: '/templates/private_recharge.html',
                    middleware: [CJRouter.middleware.auth],
                    name: 'private-recharge'
                },
                '/recharge/public': {
                    template: '/templates/public_recharge.html',
                    middleware: [CJRouter.middleware.auth],
                    name: 'public-recharge'
                },
                '/merchants': {
                    component: '/static/js/modules/merchants.js',
                    middleware: [
                        CJRouter.middleware.auth,
                        CJRouter.middleware.permission('merchants.view')
                    ],
                    name: 'merchants'
                },
                '/accounts': {
                    component: '/static/js/modules/accounts.js',
                    middleware: [
                        CJRouter.middleware.auth,
                        CJRouter.middleware.permission('accounts.view')
                    ],
                    name: 'accounts'
                },
                '/reports': {
                    template: '/templates/report_dashboard.html',
                    middleware: [
                        CJRouter.middleware.auth,
                        CJRouter.middleware.permission('reports.view')
                    ],
                    name: 'reports'
                },
                '/settings': {
                    component: '/static/js/modules/settings.js',
                    middleware: [
                        CJRouter.middleware.auth,
                        CJRouter.middleware.permission('settings.view')
                    ],
                    name: 'settings'
                },
                '/error': {
                    template: '/templates/error.html',
                    name: 'error'
                }
            });

            // Add global middleware
            this.router.use(CJRouter.middleware.loading());
            this.router.use((context) => {
                // Update breadcrumbs
                this.updateBreadcrumbs(context);
                return true;
            });

            // Listen to route changes
            this.router.on('changed', (e) => {
                this.handleRouteChange(e.detail);
            });

            this.router.on('error', (e) => {
                console.error('Router error:', e.detail.error);
                CJComponents.toast.error('页面加载失败');
            });
        }

        updateBreadcrumbs(context) {
            const breadcrumbs = this.generateBreadcrumbs(context.route, context.params);
            this.store.commit('SET_BREADCRUMBS', breadcrumbs);
        }

        generateBreadcrumbs(route, params) {
            const breadcrumbMap = {
                'dashboard': [{ title: '仪表板', url: '/dashboard' }],
                'recharge': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '充值管理', url: '/recharge' }
                ],
                'private-recharge': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '充值管理', url: '/recharge' },
                    { title: '对私充值' }
                ],
                'public-recharge': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '充值管理', url: '/recharge' },
                    { title: '对公充值' }
                ],
                'merchants': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '商户管理', url: '/merchants' }
                ],
                'accounts': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '账户管理', url: '/accounts' }
                ],
                'reports': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '数据报表', url: '/reports' }
                ],
                'settings': [
                    { title: '仪表板', url: '/dashboard' },
                    { title: '系统设置', url: '/settings' }
                ]
            };

            return breadcrumbMap[route.name] || [{ title: '仪表板', url: '/dashboard' }];
        }

        // ==========================================================================
        // Component Initialization
        // ==========================================================================

        initializeComponents() {
            // Initialize navigation
            this.initializeNavigation();

            // Initialize user menu
            this.initializeUserMenu();

            // Initialize mobile menu
            this.initializeMobileMenu();

            // Initialize global error handling
            this.initializeErrorHandling();

            // Initialize keyboard shortcuts
            this.initializeKeyboardShortcuts();
        }

        // ==========================================================================
        // Accessibility Initialization
        // ==========================================================================

        initializeAccessibility() {
            // Initialize accessibility manager if available
            if (window.AccessibilityManager) {
                this.accessibilityManager = window.AccessibilityManager;
                console.log('可访问性管理器已启用');
            }

            // Initialize screen reader support if available
            if (window.ScreenReaderManager) {
                this.screenReaderManager = window.ScreenReaderManager;
                console.log('屏幕阅读器支持已启用');
            }

            // Initialize accessibility tester in development mode
            if (window.AccessibilityTester && (
                window.location.hostname === 'localhost' || 
                window.location.search.includes('accessibility-test=true')
            )) {
                this.accessibilityTester = window.AccessibilityTester;
                console.log('可访问性测试工具已启用');
            }

            // Enhance existing components with accessibility features
            this.enhanceComponentsAccessibility();

            // Set up accessibility event listeners
            this.bindAccessibilityEvents();
        }

        enhanceComponentsAccessibility() {
            // Add ARIA labels to navigation
            const navItems = document.querySelectorAll('.nav-link');
            navItems.forEach((item, index) => {
                if (!item.hasAttribute('aria-label')) {
                    const text = item.textContent.trim();
                    if (text) {
                        item.setAttribute('aria-label', text);
                    }
                }
                
                // Add position information for screen readers
                item.setAttribute('aria-posinset', index + 1);
                item.setAttribute('aria-setsize', navItems.length);
            });

            // Enhance form elements
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                this.enhanceFormAccessibility(form);
            });

            // Enhance tables
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                this.enhanceTableAccessibility(table);
            });

            // Enhance modals
            const modals = document.querySelectorAll('.modal, [role="dialog"]');
            modals.forEach(modal => {
                this.enhanceModalAccessibility(modal);
            });
        }

        enhanceFormAccessibility(form) {
            // Ensure all form fields have labels
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                if (!field.hasAttribute('aria-label') && 
                    !field.hasAttribute('aria-labelledby') &&
                    !form.querySelector(`label[for="${field.id}"]`) &&
                    !field.closest('label')) {
                    
                    // Try to infer label from placeholder or name
                    const label = field.placeholder || field.name || '输入字段';
                    field.setAttribute('aria-label', label);
                }

                // Add required indicator
                if (field.hasAttribute('required')) {
                    field.setAttribute('aria-required', 'true');
                }
            });

            // Add form submission feedback
            form.addEventListener('submit', (e) => {
                if (this.screenReaderManager) {
                    this.screenReaderManager.announce('正在提交表单...', 'polite');
                }
            });
        }

        enhanceTableAccessibility(table) {
            // Add table caption if missing
            if (!table.querySelector('caption') && !table.hasAttribute('aria-label')) {
                const title = table.getAttribute('data-title') || 
                             table.previousElementSibling?.textContent?.trim() ||
                             '数据表格';
                table.setAttribute('aria-label', title);
            }

            // Enhance table headers
            const headers = table.querySelectorAll('th');
            headers.forEach((header, index) => {
                if (!header.id) {
                    header.id = `table-header-${Date.now()}-${index}`;
                }
                
                if (!header.hasAttribute('scope')) {
                    header.setAttribute('scope', 'col');
                }
            });
        }

        enhanceModalAccessibility(modal) {
            // Ensure modal has proper ARIA attributes
            if (!modal.hasAttribute('role')) {
                modal.setAttribute('role', 'dialog');
            }
            
            modal.setAttribute('aria-modal', 'true');

            // Find and link title
            const title = modal.querySelector('.modal-title, h1, h2, h3');
            if (title && !title.id) {
                title.id = `modal-title-${Date.now()}`;
                modal.setAttribute('aria-labelledby', title.id);
            }
        }

        bindAccessibilityEvents() {
            // Listen for dynamic content changes
            document.addEventListener('DOMContentLoaded', () => {
                if (this.accessibilityManager) {
                    this.accessibilityManager.enhanceExistingComponents();
                }
            });

            // Listen for route changes to announce page changes
            this.eventBus.addEventListener('route-changed', (e) => {
                if (this.screenReaderManager) {
                    const pageName = e.detail.name || '页面';
                    this.screenReaderManager.announce(`已导航到${pageName}`, 'polite');
                }
            });

            // Listen for form validation errors
            document.addEventListener('invalid', (e) => {
                if (this.screenReaderManager) {
                    const field = e.target;
                    const label = this.getFieldLabel(field);
                    this.screenReaderManager.announce(`${label}输入无效`, 'assertive');
                }
            }, true);

            // Listen for successful operations
            document.addEventListener('operation-success', (e) => {
                if (this.screenReaderManager) {
                    const message = e.detail.message || '操作成功';
                    this.screenReaderManager.announce(message, 'polite');
                }
            });

            // Listen for errors
            document.addEventListener('operation-error', (e) => {
                if (this.screenReaderManager) {
                    const message = e.detail.message || '操作失败';
                    this.screenReaderManager.announce(message, 'assertive');
                }
            });
        }

        getFieldLabel(field) {
            // Try to get field label from various sources
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) {
                return label.textContent.trim();
            }

            if (field.hasAttribute('aria-label')) {
                return field.getAttribute('aria-label');
            }

            if (field.placeholder) {
                return field.placeholder;
            }

            return field.name || '字段';
        }

        initializeNavigation() {
            const navLinks = CJUtils.$$('.nav-link');
            navLinks.forEach(link => {
                CJUtils.on(link, 'click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href) {
                        this.router.navigate(href);
                    }
                });
            });

            // Set active nav item based on current path
            this.updateActiveNavigation();
        }

        initializeUserMenu() {
            const userButton = CJUtils.$('#userButton');
            const userMenu = CJUtils.$('#userMenu');
            
            if (userButton && userMenu) {
                CJUtils.on(userButton, 'click', (e) => {
                    e.stopPropagation();
                    userMenu.classList.toggle('open');
                });

                // Close menu when clicking outside
                CJUtils.on(document, 'click', (e) => {
                    if (!userMenu.contains(e.target)) {
                        userMenu.classList.remove('open');
                    }
                });

                // Handle logout
                const logoutLink = userMenu.querySelector('.logout');
                if (logoutLink) {
                    CJUtils.on(logoutLink, 'click', (e) => {
                        e.preventDefault();
                        this.logout();
                    });
                }
            }
        }

        initializeMobileMenu() {
            const mobileToggle = CJUtils.$('#mobileMenuToggle');
            const headerNav = CJUtils.$('#headerNav');
            
            if (mobileToggle && headerNav) {
                CJUtils.on(mobileToggle, 'click', () => {
                    headerNav.classList.toggle('mobile-open');
                    mobileToggle.classList.toggle('active');
                });
            }
        }

        initializeErrorHandling() {
            // Global error handler
            window.addEventListener('error', (e) => {
                console.error('Global error:', e.error);
                this.handleError(e.error);
            });

            // Unhandled promise rejection handler
            window.addEventListener('unhandledrejection', (e) => {
                console.error('Unhandled promise rejection:', e.reason);
                this.handleError(e.reason);
            });
        }

        initializeKeyboardShortcuts() {
            CJUtils.on(document, 'keydown', (e) => {
                // Ctrl/Cmd + K: Global search
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.openGlobalSearch();
                }

                // Escape: Close modals/dropdowns
                if (e.key === 'Escape') {
                    this.closeAllOverlays();
                }

                // Alt + 1-9: Navigate to menu items
                if (e.altKey && e.key >= '1' && e.key <= '9') {
                    e.preventDefault();
                    const index = parseInt(e.key) - 1;
                    const navLinks = CJUtils.$$('.nav-link');
                    if (navLinks[index]) {
                        navLinks[index].click();
                    }
                }
            });
        }

        // ==========================================================================
        // Event Handling
        // ==========================================================================

        bindGlobalEvents() {
            // Handle API errors globally
            this.on('api:error', (e) => {
                CJApi.handleError(e.detail.error);
            });

            // Handle authentication events
            this.on('auth:login', (e) => {
                this.handleLogin(e.detail.user);
            });

            this.on('auth:logout', () => {
                this.handleLogout();
            });

            // Handle route changes
            this.on('route:change', (e) => {
                this.handleRouteChange(e.detail.route);
            });

            // Handle notifications
            this.on('notification:new', (e) => {
                this.handleNewNotification(e.detail.notification);
            });
        }

        // ==========================================================================
        // Navigation Methods
        // ==========================================================================

        navigate(path, options = {}) {
            return this.router.navigate(path, options);
        }

        handleRouteChange(routeData) {
            // Update active navigation
            this.updateActiveNavigation();
            
            // Update current route in store
            this.store.commit('SET_CURRENT_ROUTE', routeData.route);
            
            // Load route-specific module if needed
            this.loadRouteModule(routeData.route.name);
        }

        // ==========================================================================
        // Module System
        // ==========================================================================

        async loadRouteModule(route) {
            if (this.modules.has(route)) {
                return this.modules.get(route);
            }

            try {
                // Dynamically load route module
                const moduleUrl = `/static/js/modules/${route}.js`;
                const module = await import(moduleUrl);
                
                if (module.default && typeof module.default.init === 'function') {
                    const instance = new module.default(this);
                    await instance.init();
                    this.modules.set(route, instance);
                    return instance;
                }
            } catch (error) {
                console.warn(`Failed to load module for route: ${route}`, error);
            }

            return null;
        }

        getModule(name) {
            return this.modules.get(name);
        }

        registerModule(name, module) {
            this.modules.set(name, module);
        }

        // ==========================================================================
        // Authentication
        // ==========================================================================

        async login(credentials) {
            try {
                const response = await this.store.dispatch('login', credentials);
                
                if (response && response.token) {
                    this.emit('auth:login', { user: response.user });
                    CJComponents.toast.success('登录成功');
                    
                    // Redirect to dashboard or intended page
                    const intendedRoute = CJUtils.storage.get('intended_route') || '/dashboard';
                    CJUtils.storage.remove('intended_route');
                    this.navigate(intendedRoute);
                }
                
                return response;
            } catch (error) {
                CJComponents.toast.error('登录失败：' + error.message);
                throw error;
            }
        }

        async logout() {
            try {
                const confirmed = await CJComponents.Modal.confirm('确定要退出登录吗？');
                if (!confirmed) return;

                await this.store.dispatch('logout');
                
                this.emit('auth:logout');
                CJComponents.toast.success('已退出登录');
                
                // Redirect to login page
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout error:', error);
                // Force logout even if API call fails
                await this.store.dispatch('logout');
                window.location.href = '/login';
            }
        }

        handleLogin(user) {
            this.options.user = user;
            this.updateUserDisplay();
        }

        handleLogout() {
            this.options.user = null;
            this.options.permissions = [];
        }

        updateUserDisplay() {
            const userName = CJUtils.$('#userName');
            if (userName && this.options.user) {
                userName.textContent = this.options.user.name || this.options.user.username;
            }
        }

        // ==========================================================================
        // Permissions
        // ==========================================================================

        hasPermission(permission) {
            return this.store.get('hasPermission')(permission);
        }

        hasAnyPermission(permissions) {
            return this.store.get('hasAnyPermission')(permissions);
        }

        hasAllPermissions(permissions) {
            return permissions.every(permission => this.hasPermission(permission));
        }

        checkPermission(permission, showError = true) {
            if (!this.hasPermission(permission)) {
                if (showError) {
                    CJComponents.toast.error('权限不足，无法执行此操作');
                }
                return false;
            }
            return true;
        }

        // ==========================================================================
        // User Preferences
        // ==========================================================================

        loadUserPreferences() {
            this.store.dispatch('loadUserPreferences');
        }

        saveUserPreferences() {
            this.store.dispatch('saveUserPreferences');
        }

        applyTheme(theme) {
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${theme}`);
        }

        getCurrentTheme() {
            return this.store.get('currentTheme');
        }

        setLanguage(language) {
            this.store.commit('SET_LANGUAGE', language);
            document.documentElement.lang = language;
        }

        getCurrentLanguage() {
            return this.store.get('currentLanguage');
        }

        // ==========================================================================
        // Periodic Tasks
        // ==========================================================================

        startPeriodicTasks() {
            // Check for new notifications every 30 seconds
            setInterval(() => {
                this.checkNotifications();
            }, 30000);

            // Refresh auth token every 15 minutes
            setInterval(() => {
                this.refreshAuthToken();
            }, 15 * 60 * 1000);

            // Save user preferences every 5 minutes
            setInterval(() => {
                this.saveUserPreferences();
            }, 5 * 60 * 1000);
        }

        async checkNotifications() {
            if (!this.store.get('isAuthenticated')) return;

            try {
                await this.store.dispatch('fetchNotifications');
            } catch (error) {
                // Silently fail for background tasks
                console.debug('Failed to check notifications:', error);
            }
        }

        async refreshAuthToken() {
            if (!this.store.get('isAuthenticated')) return;

            try {
                await this.store.dispatch('refreshToken');
            } catch (error) {
                console.debug('Failed to refresh token:', error);
                // If refresh fails, user will be redirected to login on next API call
            }
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        openGlobalSearch() {
            // TODO: Implement global search functionality
            CJComponents.toast.info('全局搜索功能即将推出');
        }

        closeAllOverlays() {
            // Close user menu
            const userMenu = CJUtils.$('#userMenu');
            if (userMenu) {
                userMenu.classList.remove('open');
            }

            // Close mobile menu
            const headerNav = CJUtils.$('#headerNav');
            const mobileToggle = CJUtils.$('#mobileMenuToggle');
            if (headerNav && mobileToggle) {
                headerNav.classList.remove('mobile-open');
                mobileToggle.classList.remove('active');
            }
        }

        handleError(error) {
            console.error('Application error:', error);
            
            // Don't show error toast for API errors (handled by API client)
            if (!(error instanceof CJApi.ApiError)) {
                CJComponents.toast.error('系统出现错误，请刷新页面重试');
            }
        }

        handleNewNotification(notification) {
            // Show toast for important notifications
            if (notification.priority === 'high') {
                CJComponents.toast.info(notification.message);
            }

            // Update notification badge
            this.updateNotificationBadge();
        }

        updateNotificationBadge() {
            // TODO: Update notification badge in header
        }

        // ==========================================================================
        // Event System
        // ==========================================================================

        on(event, handler) {
            this.eventBus.addEventListener(event, handler);
        }

        off(event, handler) {
            this.eventBus.removeEventListener(event, handler);
        }

        emit(event, data) {
            this.eventBus.dispatchEvent(new CustomEvent(event, { detail: data }));
        }

        // ==========================================================================
        // Public API
        // ==========================================================================

        getUser() {
            return this.store.get('currentUser');
        }

        getConfig() {
            return this.options.config;
        }

        getCurrentRoute() {
            return this.router.getCurrentRoute();
        }

        isAuthenticated() {
            return this.store.get('isAuthenticated');
        }

        getStore() {
            return this.store;
        }

        getRouter() {
            return this.router;
        }
    }

    return CJPaymentApp;
})();
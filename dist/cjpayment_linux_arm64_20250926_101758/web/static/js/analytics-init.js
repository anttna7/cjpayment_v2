/**
 * 用户分析系统初始化脚本
 * 
 * 自动集成到所有页面，提供用户行为追踪和反馈收集功能
 * 版本：v1.0.0
 */

(function() {
    'use strict';

    // 配置选项
    const ANALYTICS_CONFIG = {
        // API端点
        apiEndpoint: '/api/feedback',
        analyticsEndpoint: '/api/analytics',
        
        // 功能开关
        enableBehaviorTracking: true,
        enablePerformanceMonitoring: true,
        enableHeatmaps: true,
        enableUserJourney: true,
        enableA_B_Testing: false,
        
        // 性能配置
        sessionTimeout: 30 * 60 * 1000, // 30分钟
        batchSize: 10,
        flushInterval: 30000, // 30秒
        
        // 采样率 (0-1)
        samplingRate: 1.0,
        
        // 排除的页面路径
        excludePaths: ['/static/', '/api/', '/admin/'],
        
        // 调试模式
        debug: false
    };

    // 检查是否应该初始化分析系统
    function shouldInitializeAnalytics() {
        const currentPath = window.location.pathname;
        
        // 检查排除路径
        for (const excludePath of ANALYTICS_CONFIG.excludePaths) {
            if (currentPath.startsWith(excludePath)) {
                return false;
            }
        }
        
        // 检查采样率
        if (Math.random() > ANALYTICS_CONFIG.samplingRate) {
            return false;
        }
        
        // 检查是否已经初始化
        if (window.userAnalytics) {
            return false;
        }
        
        return true;
    }

    // 等待依赖加载完成
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                if (typeof UserFeedbackAnalytics !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    // 初始化分析系统
    async function initializeAnalytics() {
        if (!shouldInitializeAnalytics()) {
            if (ANALYTICS_CONFIG.debug) {
                console.log('Analytics: Skipping initialization');
            }
            return;
        }

        try {
            // 等待依赖加载
            await waitForDependencies();

            // 获取用户信息
            const userInfo = getUserInfo();
            
            // 创建分析实例
            window.userAnalytics = new UserFeedbackAnalytics({
                ...ANALYTICS_CONFIG,
                userId: userInfo?.id,
                userRole: userInfo?.role,
                sessionMetadata: {
                    page: document.title,
                    url: window.location.href,
                    referrer: document.referrer,
                    timestamp: Date.now()
                }
            });

            // 添加页面特定的追踪
            addPageSpecificTracking();
            
            // 添加表单验证追踪
            addFormValidationTracking();
            
            // 添加搜索行为追踪
            addSearchTracking();
            
            // 添加导航追踪
            addNavigationTracking();

            if (ANALYTICS_CONFIG.debug) {
                console.log('Analytics: Initialized successfully', window.userAnalytics);
            }

        } catch (error) {
            console.error('Analytics: Initialization failed', error);
        }
    }

    // 获取用户信息
    function getUserInfo() {
        try {
            // 从localStorage获取用户信息
            const userInfo = localStorage.getItem('userInfo');
            if (userInfo) {
                return JSON.parse(userInfo);
            }

            // 从页面中获取用户信息
            const userMenu = document.querySelector('.user-menu__name');
            if (userMenu) {
                return {
                    name: userMenu.textContent.trim(),
                    role: document.querySelector('.user-menu__role')?.textContent.trim()
                };
            }

            return null;
        } catch (error) {
            console.error('Failed to get user info:', error);
            return null;
        }
    }

    // 添加页面特定的追踪
    function addPageSpecificTracking() {
        const pagePath = window.location.pathname;
        
        // 仪表板页面
        if (pagePath.includes('/dashboard')) {
            trackDashboardInteractions();
        }
        
        // 商户管理页面
        if (pagePath.includes('/merchant')) {
            trackMerchantManagementInteractions();
        }
        
        // 财务审核页面
        if (pagePath.includes('/audit')) {
            trackAuditInteractions();
        }
        
        // 报表页面
        if (pagePath.includes('/report')) {
            trackReportInteractions();
        }
    }

    // 仪表板交互追踪
    function trackDashboardInteractions() {
        // 图表交互
        document.addEventListener('click', (event) => {
            if (event.target.closest('.chart-card')) {
                window.userAnalytics?.trackEvent('dashboard_chart_click', {
                    chartType: event.target.closest('.chart-card').dataset.chartType || 'unknown',
                    timestamp: Date.now()
                });
            }
        });

        // KPI卡片点击
        document.addEventListener('click', (event) => {
            if (event.target.closest('.kpi-card')) {
                const kpiTitle = event.target.closest('.kpi-card').querySelector('.kpi-label')?.textContent;
                window.userAnalytics?.trackEvent('dashboard_kpi_click', {
                    kpiType: kpiTitle,
                    timestamp: Date.now()
                });
            }
        });
    }

    // 商户管理交互追踪
    function trackMerchantManagementInteractions() {
        // 搜索行为
        const searchInput = document.querySelector('#merchantSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    window.userAnalytics?.trackEvent('merchant_search', {
                        query: event.target.value.length > 0 ? 'non-empty' : 'empty',
                        queryLength: event.target.value.length,
                        timestamp: Date.now()
                    });
                }, 500);
            });
        }

        // 筛选操作
        document.addEventListener('change', (event) => {
            if (event.target.matches('select[id*="Filter"]')) {
                window.userAnalytics?.trackEvent('merchant_filter', {
                    filterType: event.target.id,
                    filterValue: event.target.value,
                    timestamp: Date.now()
                });
            }
        });
    }

    // 审核交互追踪
    function trackAuditInteractions() {
        // 审核操作
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-action*="audit"]')) {
                window.userAnalytics?.trackEvent('audit_action', {
                    action: event.target.dataset.action,
                    timestamp: Date.now()
                });
            }
        });

        // 批量操作
        document.addEventListener('click', (event) => {
            if (event.target.matches('#bulkApproveBtn, #bulkRejectBtn')) {
                const selectedCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
                window.userAnalytics?.trackEvent('audit_bulk_action', {
                    action: event.target.id.includes('Approve') ? 'approve' : 'reject',
                    count: selectedCount,
                    timestamp: Date.now()
                });
            }
        });
    }

    // 报表交互追踪
    function trackReportInteractions() {
        // 时间范围选择
        document.addEventListener('change', (event) => {
            if (event.target.matches('.time-preset, #timeRange')) {
                window.userAnalytics?.trackEvent('report_time_range', {
                    range: event.target.value || event.target.dataset.range,
                    timestamp: Date.now()
                });
            }
        });

        // 图表类型切换
        document.addEventListener('click', (event) => {
            if (event.target.matches('.chart-tab')) {
                window.userAnalytics?.trackEvent('report_chart_switch', {
                    chartType: event.target.dataset.tab,
                    timestamp: Date.now()
                });
            }
        });

        // 导出操作
        document.addEventListener('click', (event) => {
            if (event.target.matches('#exportReportBtn, #exportTableBtn')) {
                window.userAnalytics?.trackEvent('report_export', {
                    exportType: event.target.id.includes('Table') ? 'table' : 'report',
                    timestamp: Date.now()
                });
            }
        });
    }

    // 表单验证追踪
    function addFormValidationTracking() {
        // 表单提交
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const formId = form.id || form.className || 'unknown';
            
            window.userAnalytics?.trackEvent('form_submit', {
                formId,
                formAction: form.action,
                fieldCount: form.querySelectorAll('input, select, textarea').length,
                timestamp: Date.now()
            });
        });

        // 表单验证错误
        document.addEventListener('invalid', (event) => {
            const field = event.target;
            
            window.userAnalytics?.trackEvent('form_validation_error', {
                fieldName: field.name || field.id,
                fieldType: field.type,
                validationMessage: field.validationMessage,
                timestamp: Date.now()
            });
        });
    }

    // 搜索行为追踪
    function addSearchTracking() {
        // 通用搜索输入框
        document.addEventListener('input', (event) => {
            if (event.target.matches('input[type="search"], input[placeholder*="搜索"], #tableSearch')) {
                let searchTimeout;
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    window.userAnalytics?.trackEvent('search_query', {
                        searchType: event.target.id || 'generic',
                        queryLength: event.target.value.length,
                        hasResults: true, // 这里可以根据实际搜索结果来设置
                        timestamp: Date.now()
                    });
                }, 1000);
            }
        });
    }

    // 导航追踪
    function addNavigationTracking() {
        // 导航菜单点击
        document.addEventListener('click', (event) => {
            if (event.target.closest('.nav__link')) {
                const link = event.target.closest('.nav__link');
                const navText = link.querySelector('.nav__text')?.textContent;
                
                window.userAnalytics?.trackEvent('navigation_click', {
                    destination: link.href,
                    navText,
                    timestamp: Date.now()
                });
            }
        });

        // 面包屑导航
        document.addEventListener('click', (event) => {
            if (event.target.closest('.breadcrumb a')) {
                window.userAnalytics?.trackEvent('breadcrumb_click', {
                    destination: event.target.href,
                    breadcrumbText: event.target.textContent,
                    timestamp: Date.now()
                });
            }
        });
    }

    // 添加自定义CSS样式
    function injectAnalyticsStyles() {
        const styles = `
            <style id="analytics-styles">
            /* 确保反馈组件不与现有样式冲突 */
            .feedback-widget {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                box-sizing: border-box !important;
            }
            
            .feedback-widget *,
            .feedback-widget *::before,
            .feedback-widget *::after {
                box-sizing: border-box !important;
            }
            
            /* 确保在所有页面中都能正确显示 */
            .feedback-trigger {
                position: fixed !important;
                z-index: 10000 !important;
            }
            
            .feedback-panel {
                position: fixed !important;
                z-index: 10001 !important;
                bottom: 100px !important;
                right: 20px !important;
                max-width: calc(100vw - 40px) !important;
                max-height: calc(100vh - 200px) !important;
            }
            
            /* 深色主题支持 */
            [data-theme="dark"] .feedback-panel {
                background: #1f2937 !important;
                color: #f9fafb !important;
                border-color: #374151 !important;
            }
            
            [data-theme="dark"] .feedback-header h3 {
                color: #f9fafb !important;
            }
            
            [data-theme="dark"] .feedback-content input,
            [data-theme="dark"] .feedback-content select,
            [data-theme="dark"] .feedback-content textarea {
                background: #374151 !important;
                color: #f9fafb !important;
                border-color: #4b5563 !important;
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // 错误监控和上报
    function setupErrorReporting() {
        // 捕获未处理的错误
        window.addEventListener('error', (event) => {
            if (window.userAnalytics) {
                window.userAnalytics.trackEvent('global_error', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack?.substring(0, 1000), // 限制stack长度
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                });
            }
        });

        // 捕获Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            if (window.userAnalytics) {
                window.userAnalytics.trackEvent('promise_rejection', {
                    reason: event.reason?.toString()?.substring(0, 500),
                    stack: event.reason?.stack?.substring(0, 1000),
                    url: window.location.href,
                    timestamp: Date.now()
                });
            }
        });
    }

    // 性能监控
    function setupPerformanceMonitoring() {
        // 页面加载完成后收集性能数据
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (window.userAnalytics && performance.getEntriesByType) {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const paint = performance.getEntriesByType('paint');
                    
                    if (navigation) {
                        window.userAnalytics.trackEvent('page_performance', {
                            loadTime: navigation.loadEventEnd - navigation.fetchStart,
                            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
                            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                            url: window.location.href,
                            timestamp: Date.now()
                        });
                    }
                }
            }, 1000);
        });
    }

    // 用户会话管理
    function setupSessionManagement() {
        // 检测用户活跃状态
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            }, true);
        });

        // 定期检查会话状态
        setInterval(() => {
            const inactiveTime = Date.now() - lastActivity;
            
            // 5分钟无活动视为不活跃
            if (inactiveTime > 5 * 60 * 1000 && window.userAnalytics) {
                window.userAnalytics.trackEvent('user_inactive', {
                    inactiveTime,
                    timestamp: Date.now()
                });
            }
        }, 60000); // 每分钟检查一次
    }

    // 主初始化函数
    function init() {
        // 检查文档是否已加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // 注入样式
        injectAnalyticsStyles();
        
        // 设置错误监控
        setupErrorReporting();
        
        // 设置性能监控
        setupPerformanceMonitoring();
        
        // 设置会话管理
        setupSessionManagement();
        
        // 初始化分析系统
        initializeAnalytics();
    }

    // 暴露全局接口
    window.analyticsInit = {
        config: ANALYTICS_CONFIG,
        reinitialize: initializeAnalytics,
        getAnalytics: () => window.userAnalytics
    };

    // 开始初始化
    init();

})();
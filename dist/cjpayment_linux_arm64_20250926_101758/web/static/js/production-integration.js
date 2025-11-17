/**
 * 生产环境集成脚本
 * 整合所有生产环境功能：监控、功能开关、A/B测试、回滚管理
 */

class ProductionIntegration {
    constructor(config = {}) {
        this.config = {
            environment: config.environment || 'production',
            version: config.version || '1.0.0',
            userId: config.userId || null,
            enableMonitoring: config.enableMonitoring !== false,
            enableFeatureFlags: config.enableFeatureFlags !== false,
            enableABTesting: config.enableABTesting !== false,
            enableRollback: config.enableRollback !== false,
            enableResourceManager: config.enableResourceManager !== false,
            ...config
        };
        
        this.components = {};
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing production environment...');
        
        try {
            // 初始化各个组件
            await this.initializeComponents();
            
            // 设置组件间的集成
            this.setupIntegrations();
            
            // 设置全局错误处理
            this.setupGlobalErrorHandling();
            
            // 设置性能监控
            this.setupPerformanceMonitoring();
            
            // 标记为已初始化
            this.isInitialized = true;
            
            console.log('✅ Production environment initialized successfully');
            
            // 发送初始化完成事件
            this.dispatchEvent('production:initialized', {
                version: this.config.version,
                components: Object.keys(this.components),
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize production environment:', error);
            
            // 发送初始化失败事件
            this.dispatchEvent('production:initialization_failed', {
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
    
    async initializeComponents() {
        const initPromises = [];
        
        // 初始化生产监控
        if (this.config.enableMonitoring) {
            initPromises.push(this.initMonitoring());
        }
        
        // 初始化资源管理器
        if (this.config.enableResourceManager) {
            initPromises.push(this.initResourceManager());
        }
        
        // 初始化功能开关
        if (this.config.enableFeatureFlags) {
            initPromises.push(this.initFeatureFlags());
        }
        
        // 初始化A/B测试
        if (this.config.enableABTesting) {
            initPromises.push(this.initABTesting());
        }
        
        // 初始化回滚管理
        if (this.config.enableRollback) {
            initPromises.push(this.initRollbackManager());
        }
        
        await Promise.all(initPromises);
    }
    
    async initMonitoring() {
        if (typeof ProductionMonitor !== 'undefined') {
            this.components.monitor = new ProductionMonitor({
                apiEndpoint: '/api/monitoring',
                userId: this.config.userId,
                enablePerformanceTracking: true,
                enableErrorTracking: true,
                enableUserTracking: true,
                sampleRate: this.config.environment === 'production' ? 0.1 : 1.0
            });
            
            console.log('📊 Production monitoring initialized');
        }
    }
    
    async initResourceManager() {
        if (typeof ResourceManager !== 'undefined') {
            this.components.resourceManager = new ResourceManager({
                cdnDomain: this.config.cdnDomain || '',
                version: this.config.version,
                enablePreload: true,
                enablePrefetch: true,
                enableServiceWorker: true
            });
            
            console.log('📦 Resource manager initialized');
        }
    }
    
    async initFeatureFlags() {
        if (typeof FeatureFlags !== 'undefined') {
            this.components.featureFlags = new FeatureFlags({
                apiEndpoint: '/api/feature-flags',
                userId: this.config.userId,
                environment: this.config.environment,
                enableLocalStorage: true,
                enableAnalytics: true
            });
            
            console.log('🚩 Feature flags initialized');
        }
    }
    
    async initABTesting() {
        if (typeof ABTesting !== 'undefined') {
            this.components.abTesting = new ABTesting({
                apiEndpoint: '/api/ab-testing',
                userId: this.config.userId,
                enableAutoTracking: true
            });
            
            console.log('🧪 A/B testing initialized');
        }
    }
    
    async initRollbackManager() {
        if (typeof RollbackManager !== 'undefined') {
            this.components.rollbackManager = new RollbackManager({
                apiEndpoint: '/api/rollback',
                enableAutoRollback: this.config.environment === 'production',
                enableManualRollback: true,
                errorThreshold: 0.05,
                performanceThreshold: 3000
            });
            
            console.log('🔄 Rollback manager initialized');
        }
    }
    
    setupIntegrations() {
        // 功能开关与A/B测试集成
        if (this.components.featureFlags && this.components.abTesting) {
            this.integrateFeatureFlagsWithABTesting();
        }
        
        // 监控与回滚管理集成
        if (this.components.monitor && this.components.rollbackManager) {
            this.integrateMonitoringWithRollback();
        }
        
        // 资源管理器与功能开关集成
        if (this.components.resourceManager && this.components.featureFlags) {
            this.integrateResourceManagerWithFeatureFlags();
        }
    }
    
    integrateFeatureFlagsWithABTesting() {
        // 监听功能开关变化，同步到A/B测试
        window.addEventListener('featureFlagChanged', (event) => {
            const { key, newValue } = event.detail;
            
            // 如果功能开关关闭，停止相关的A/B测试
            if (!newValue && key.includes('test')) {
                const testId = key.replace('_enabled', '');
                this.components.abTesting.stopTest(testId);
            }
        });
        
        console.log('🔗 Feature flags and A/B testing integrated');
    }
    
    integrateMonitoringWithRollback() {
        // 监听监控告警，触发回滚检查
        this.components.monitor.onAlert = (alert) => {
            if (alert.severity === 'critical') {
                console.warn('Critical alert received, checking rollback conditions:', alert);
                
                // 通知回滚管理器检查系统健康状态
                this.components.rollbackManager.checkSystemHealth();
            }
        };
        
        console.log('🔗 Monitoring and rollback integrated');
    }
    
    integrateResourceManagerWithFeatureFlags() {
        // 根据功能开关动态加载资源
        const originalLoadPageResources = this.components.resourceManager.loadPageResources;
        
        this.components.resourceManager.loadPageResources = async (pageName) => {
            // 检查页面相关的功能开关
            const pageFeatures = this.getPageFeatures(pageName);
            
            for (const feature of pageFeatures) {
                if (this.components.featureFlags.isEnabled(feature)) {
                    // 加载功能相关的资源
                    await this.loadFeatureResources(feature);
                }
            }
            
            // 调用原始方法
            return originalLoadPageResources.call(this.components.resourceManager, pageName);
        };
        
        console.log('🔗 Resource manager and feature flags integrated');
    }
    
    getPageFeatures(pageName) {
        const pageFeatureMap = {
            'dashboard': ['new_dashboard', 'advanced_charts', 'real_time_updates'],
            'recharge_management': ['enhanced_forms', 'batch_operations'],
            'system_management': ['advanced_permissions', 'audit_logs'],
            'report_dashboard': ['advanced_charts', 'export_features']
        };
        
        return pageFeatureMap[pageName] || [];
    }
    
    async loadFeatureResources(feature) {
        const featureResourceMap = {
            'new_dashboard': ['dashboard-v2.css', 'dashboard-v2.js'],
            'advanced_charts': ['charts-advanced.css', 'charts-advanced.js'],
            'enhanced_forms': ['forms-enhanced.css', 'forms-enhanced.js'],
            'real_time_updates': ['websocket.js', 'real-time.js']
        };
        
        const resources = featureResourceMap[feature];
        if (resources) {
            for (const resource of resources) {
                if (resource.endsWith('.css')) {
                    await this.components.resourceManager.loadCSS(resource);
                } else if (resource.endsWith('.js')) {
                    await this.components.resourceManager.loadJS(resource);
                }
            }
        }
    }
    
    setupGlobalErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            this.handleGlobalError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Promise rejection处理
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                type: 'promise_rejection',
                message: event.reason?.toString() || 'Unhandled promise rejection',
                stack: event.reason?.stack
            });
        });
        
        console.log('🛡️ Global error handling setup complete');
    }
    
    handleGlobalError(error) {
        // 记录到监控系统
        if (this.components.monitor) {
            this.components.monitor.recordCustomEvent('global_error', error);
        }
        
        // 检查是否需要触发回滚
        if (this.components.rollbackManager && error.type === 'javascript_error') {
            // 如果JavaScript错误过多，可能需要回滚
            this.checkErrorThreshold();
        }
        
        // 发送错误事件
        this.dispatchEvent('production:error', error);
    }
    
    checkErrorThreshold() {
        // 简单的错误阈值检查
        const errorCount = this.getErrorCount();
        const errorRate = errorCount / this.getPageViews();
        
        if (errorRate > 0.1) { // 10%错误率
            console.warn('High error rate detected:', errorRate);
            
            if (this.components.rollbackManager) {
                this.components.rollbackManager.checkSystemHealth();
            }
        }
    }
    
    getErrorCount() {
        // 从监控系统获取错误计数
        return this.components.monitor?.getErrorCount() || 0;
    }
    
    getPageViews() {
        // 从监控系统获取页面浏览量
        return this.components.monitor?.getPageViews() || 1;
    }
    
    setupPerformanceMonitoring() {
        // 监控关键性能指标
        if ('PerformanceObserver' in window) {
            // 监控长任务
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) { // 超过50ms的任务
                        this.handlePerformanceIssue({
                            type: 'long_task',
                            duration: entry.duration,
                            startTime: entry.startTime
                        });
                    }
                }
            });
            
            try {
                longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.warn('Long task observer not supported');
            }
        }
        
        // 监控内存使用
        if ('memory' in performance) {
            setInterval(() => {
                const memoryInfo = performance.memory;
                const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
                
                if (usageRatio > 0.9) { // 90%内存使用率
                    this.handlePerformanceIssue({
                        type: 'high_memory_usage',
                        usageRatio: usageRatio,
                        usedSize: memoryInfo.usedJSHeapSize,
                        totalSize: memoryInfo.jsHeapSizeLimit
                    });
                }
            }, 30000); // 每30秒检查一次
        }
        
        console.log('📈 Performance monitoring setup complete');
    }
    
    handlePerformanceIssue(issue) {
        console.warn('Performance issue detected:', issue);
        
        // 记录到监控系统
        if (this.components.monitor) {
            this.components.monitor.recordCustomEvent('performance_issue', issue);
        }
        
        // 发送性能事件
        this.dispatchEvent('production:performance_issue', issue);
        
        // 如果性能问题严重，考虑回滚
        if (issue.type === 'high_memory_usage' && issue.usageRatio > 0.95) {
            if (this.components.rollbackManager) {
                this.components.rollbackManager.checkSystemHealth();
            }
        }
    }
    
    // 公共API方法
    
    // 检查功能是否启用
    isFeatureEnabled(featureName) {
        return this.components.featureFlags?.isEnabled(featureName) || false;
    }
    
    // 获取A/B测试变体
    getTestVariant(testName) {
        return this.components.abTesting?.getVariant(testName) || 'control';
    }
    
    // 记录转化事件
    trackConversion(eventName, properties = {}) {
        if (this.components.monitor) {
            this.components.monitor.recordCustomEvent('conversion', {
                eventName,
                properties,
                timestamp: Date.now()
            });
        }
        
        // 为所有活跃的A/B测试记录转化
        if (this.components.abTesting) {
            const activeTests = this.components.abTesting.getActiveTests();
            for (const testId of Object.keys(activeTests)) {
                this.components.abTesting.trackConversion(testId, eventName, properties);
            }
        }
    }
    
    // 手动触发回滚
    triggerRollback(reason = 'manual') {
        if (this.components.rollbackManager) {
            return this.components.rollbackManager.triggerManualRollback(reason);
        }
        return false;
    }
    
    // 获取系统状态
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            version: this.config.version,
            environment: this.config.environment,
            components: Object.keys(this.components),
            health: this.components.rollbackManager?.getHealthStatus() || null,
            timestamp: Date.now()
        };
    }
    
    // 设置用户信息
    setUser(userId, attributes = {}) {
        this.config.userId = userId;
        
        // 更新所有组件的用户信息
        if (this.components.monitor) {
            this.components.monitor.setUserId(userId);
        }
        
        if (this.components.featureFlags) {
            this.components.featureFlags.setUser(userId, attributes);
        }
        
        if (this.components.abTesting) {
            this.components.abTesting.setUser(userId);
        }
        
        console.log('👤 User information updated:', userId);
    }
    
    // 事件分发
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }
    
    // 清理资源
    destroy() {
        // 清理所有组件
        for (const [name, component] of Object.entries(this.components)) {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        }
        
        this.components = {};
        this.isInitialized = false;
        
        console.log('🧹 Production integration cleaned up');
    }
}

// 全局实例
window.ProductionIntegration = ProductionIntegration;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    if (window.PRODUCTION_CONFIG) {
        window.production = new ProductionIntegration(window.PRODUCTION_CONFIG);
    }
});

export default ProductionIntegration;
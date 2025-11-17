/**
 * 组件懒加载系统
 * Component Lazy Loading System
 */

class LazyLoader {
    constructor() {
        this.componentCache = new Map();
        this.loadingPromises = new Map();
        this.preloadQueue = new Set();
        this.observers = new Map();
        this.config = {
            baseUrl: '/static/js/',
            timeout: 10000,
            retryAttempts: 3,
            preloadDelay: 2000,
            intersectionThreshold: 0.1
        };
        
        this.init();
    }
    
    init() {
        // 设置 Intersection Observer 用于可视区域懒加载
        this.setupIntersectionObserver();
        
        // 预加载关键组件
        this.preloadCriticalComponents();
        
        // 监听路由变化
        this.setupRouteListener();
    }
    
    /**
     * 动态导入组件
     * @param {string} componentName - 组件名称
     * @param {Object} options - 加载选项
     * @returns {Promise} 组件实例
     */
    async loadComponent(componentName, options = {}) {
        const cacheKey = this.getCacheKey(componentName, options);
        
        // 检查缓存
        if (this.componentCache.has(cacheKey)) {
            return this.componentCache.get(cacheKey);
        }
        
        // 检查是否正在加载
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        
        // 开始加载
        const loadPromise = this.doLoadComponent(componentName, options);
        this.loadingPromises.set(cacheKey, loadPromise);
        
        try {
            const component = await loadPromise;
            this.componentCache.set(cacheKey, component);
            this.loadingPromises.delete(cacheKey);
            return component;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
    }
    
    /**
     * 执行组件加载
     */
    async doLoadComponent(componentName, options) {
        const { timeout = this.config.timeout, retryAttempts = this.config.retryAttempts } = options;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                const startTime = performance.now();
                
                // 动态导入模块
                const module = await this.importWithTimeout(componentName, timeout);
                
                const loadTime = performance.now() - startTime;
                this.logPerformance(componentName, loadTime, attempt);
                
                // 实例化组件
                const ComponentClass = module.default || module[componentName];
                if (!ComponentClass) {
                    throw new Error(`Component ${componentName} not found in module`);
                }
                
                return new ComponentClass(options);
                
            } catch (error) {
                console.warn(`Failed to load component ${componentName} (attempt ${attempt}):`, error);
                
                if (attempt === retryAttempts) {
                    throw new Error(`Failed to load component ${componentName} after ${retryAttempts} attempts`);
                }
                
                // 指数退避重试
                await this.delay(Math.pow(2, attempt) * 1000);
            }
        }
    }
    
    /**
     * 带超时的动态导入
     */
    async importWithTimeout(componentName, timeout) {
        const importPromise = import(`${this.config.baseUrl}${componentName}.js`);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Import timeout for ${componentName}`)), timeout);
        });
        
        return Promise.race([importPromise, timeoutPromise]);
    }
    
    /**
     * 预加载组件
     * @param {string|Array} components - 组件名称或组件列表
     * @param {Object} options - 预加载选项
     */
    async preloadComponent(components, options = {}) {
        const componentList = Array.isArray(components) ? components : [components];
        const { priority = 'low', delay = this.config.preloadDelay } = options;
        
        // 延迟预加载以避免阻塞主线程
        if (delay > 0) {
            await this.delay(delay);
        }
        
        const preloadPromises = componentList.map(async (componentName) => {
            if (this.componentCache.has(componentName)) {
                return; // 已缓存
            }
            
            try {
                await this.loadComponent(componentName, { ...options, preload: true });
                console.log(`Preloaded component: ${componentName}`);
            } catch (error) {
                console.warn(`Failed to preload component ${componentName}:`, error);
            }
        });
        
        if (priority === 'high') {
            await Promise.all(preloadPromises);
        } else {
            // 低优先级预加载，不等待完成
            Promise.all(preloadPromises);
        }
    }
    
    /**
     * 路由级别的代码分割
     */
    async loadRoute(routeName, params = {}) {
        const routeComponents = this.getRouteComponents(routeName);
        
        // 并行加载路由所需的所有组件
        const loadPromises = routeComponents.map(componentName => 
            this.loadComponent(componentName, { route: routeName, ...params })
        );
        
        try {
            const components = await Promise.all(loadPromises);
            return this.assembleRoute(routeName, components, params);
        } catch (error) {
            console.error(`Failed to load route ${routeName}:`, error);
            throw error;
        }
    }
    
    /**
     * 获取路由所需的组件列表
     */
    getRouteComponents(routeName) {
        const routeMap = {
            'dashboard': ['dashboard', 'chart-component', 'stats-component', 'card-component'],
            'recharge': ['recharge_management', 'table-component', 'pagination-component', 'form-wizard'],
            'system': ['system_management', 'user_management', 'modal-component'],
            'reports': ['report_dashboard', 'chart-component', 'advanced-table'],
            'financial': ['financial_audit', 'advanced-table', 'chart-component']
        };
        
        return routeMap[routeName] || [routeName];
    }
    
    /**
     * 组装路由
     */
    assembleRoute(routeName, components, params) {
        return {
            name: routeName,
            components,
            params,
            timestamp: Date.now()
        };
    }
    
    /**
     * 设置可视区域观察器
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            return; // 不支持 IntersectionObserver
        }
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const componentName = element.dataset.lazyComponent;
                    
                    if (componentName && !this.componentCache.has(componentName)) {
                        this.loadComponent(componentName, { 
                            element,
                            lazy: true 
                        }).then(component => {
                            this.renderLazyComponent(component, element);
                        }).catch(error => {
                            console.error(`Failed to lazy load component ${componentName}:`, error);
                            this.renderErrorPlaceholder(element, error);
                        });
                    }
                    
                    observer.unobserve(element);
                }
            });
        }, {
            threshold: this.config.intersectionThreshold,
            rootMargin: '50px'
        });
        
        this.observers.set('intersection', observer);
    }
    
    /**
     * 渲染懒加载组件
     */
    renderLazyComponent(component, element) {
        if (component && typeof component.render === 'function') {
            const content = component.render();
            element.innerHTML = content;
            element.classList.add('lazy-loaded');
            
            // 触发加载完成事件
            element.dispatchEvent(new CustomEvent('lazyLoaded', {
                detail: { component }
            }));
        }
    }
    
    /**
     * 渲染错误占位符
     */
    renderErrorPlaceholder(element, error) {
        element.innerHTML = `
            <div class="lazy-load-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">组件加载失败</div>
                <button class="retry-btn" onclick="window.lazyLoader.retryLoad('${element.dataset.lazyComponent}', this.parentElement.parentElement)">
                    重试
                </button>
            </div>
        `;
        element.classList.add('lazy-error');
    }
    
    /**
     * 重试加载
     */
    async retryLoad(componentName, element) {
        element.innerHTML = '<div class="loading-spinner">加载中...</div>';
        element.classList.remove('lazy-error');
        
        try {
            const component = await this.loadComponent(componentName, { 
                element,
                retry: true 
            });
            this.renderLazyComponent(component, element);
        } catch (error) {
            this.renderErrorPlaceholder(element, error);
        }
    }
    
    /**
     * 预加载关键组件
     */
    preloadCriticalComponents() {
        const criticalComponents = [
            'modal-component',
            'toast-component',
            'loading-component',
            'navigation'
        ];
        
        // 在空闲时预加载
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.preloadComponent(criticalComponents, { priority: 'high', delay: 0 });
            });
        } else {
            setTimeout(() => {
                this.preloadComponent(criticalComponents, { priority: 'high', delay: 0 });
            }, 1000);
        }
    }
    
    /**
     * 设置路由监听器
     */
    setupRouteListener() {
        // 监听 popstate 事件
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.preloadRoute(event.state.route);
            }
        });
        
        // 监听链接点击，预加载目标路由
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-route]');
            if (link) {
                const routeName = link.dataset.route;
                this.preloadRoute(routeName);
            }
        });
    }
    
    /**
     * 预加载路由
     */
    async preloadRoute(routeName) {
        const components = this.getRouteComponents(routeName);
        await this.preloadComponent(components, { priority: 'low' });
    }
    
    /**
     * 获取缓存键
     */
    getCacheKey(componentName, options = {}) {
        const optionsKey = Object.keys(options)
            .filter(key => key !== 'element') // 排除 DOM 元素
            .sort()
            .map(key => `${key}:${options[key]}`)
            .join('|');
        
        return optionsKey ? `${componentName}|${optionsKey}` : componentName;
    }
    
    /**
     * 记录性能指标
     */
    logPerformance(componentName, loadTime, attempt) {
        if (loadTime > 1000) {
            console.warn(`Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`);
        }
        
        // 发送性能数据到监控系统
        if (window.performance && window.performance.mark) {
            window.performance.mark(`component-load-${componentName}`);
        }
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 清理缓存
     */
    clearCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const [key] of this.componentCache) {
                if (regex.test(key)) {
                    this.componentCache.delete(key);
                }
            }
        } else {
            this.componentCache.clear();
        }
    }
    
    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.componentCache.size,
            loading: this.loadingPromises.size,
            preloadQueue: this.preloadQueue.size,
            keys: Array.from(this.componentCache.keys())
        };
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        // 清理观察器
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        // 清理缓存
        this.componentCache.clear();
        this.loadingPromises.clear();
        this.preloadQueue.clear();
    }
}

// 创建全局实例
window.lazyLoader = new LazyLoader();

// 导出类
export default LazyLoader;
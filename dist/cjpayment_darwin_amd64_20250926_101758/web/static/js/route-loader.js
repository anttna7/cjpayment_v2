/**
 * 路由级别代码分割系统
 * Route-level Code Splitting System
 */

class RouteLoader {
    constructor() {
        this.routeCache = new Map();
        this.routeModules = new Map();
        this.loadingStates = new Map();
        this.preloadedRoutes = new Set();
        
        this.config = {
            baseUrl: '/static/js/',
            timeout: 15000,
            maxCacheSize: 10,
            preloadDelay: 1000
        };
        
        this.init();
    }
    
    init() {
        this.setupRouteDefinitions();
        this.setupLinkPreloading();
        this.setupRouteTransitions();
    }
    
    /**
     * 定义路由和对应的模块
     */
    setupRouteDefinitions() {
        this.routeDefinitions = {
            '/dashboard': {
                modules: ['dashboard', 'chart-component', 'stats-component'],
                preload: ['modal-component', 'toast-component'],
                critical: true
            },
            '/recharge': {
                modules: ['recharge_management', 'form-wizard', 'table-component'],
                preload: ['pagination-component', 'modal-component'],
                critical: false
            },
            '/recharge/create': {
                modules: ['recharge-creation-wizard', 'form-enhancements'],
                preload: ['business-validation'],
                critical: false
            },
            '/system': {
                modules: ['system_management', 'user_management'],
                preload: ['modal-component', 'table-component'],
                critical: false
            },
            '/system/config': {
                modules: ['system_config', 'form-enhancements'],
                preload: ['modal-component'],
                critical: false
            },
            '/reports': {
                modules: ['report_dashboard', 'chart-component', 'advanced-table'],
                preload: ['pagination-component'],
                critical: false
            },
            '/financial': {
                modules: ['financial_audit', 'advanced-table'],
                preload: ['chart-component'],
                critical: false
            }
        };
    }
    
    /**
     * 加载路由
     * @param {string} routePath - 路由路径
     * @param {Object} options - 加载选项
     * @returns {Promise} 路由数据
     */
    async loadRoute(routePath, options = {}) {
        const normalizedPath = this.normalizeRoutePath(routePath);
        const routeDefinition = this.routeDefinitions[normalizedPath];
        
        if (!routeDefinition) {
            throw new Error(`Route not found: ${routePath}`);
        }
        
        // 检查缓存
        if (this.routeCache.has(normalizedPath) && !options.forceReload) {
            return this.routeCache.get(normalizedPath);
        }
        
        // 检查是否正在加载
        if (this.loadingStates.has(normalizedPath)) {
            return this.loadingStates.get(normalizedPath);
        }
        
        // 开始加载
        const loadPromise = this.doLoadRoute(normalizedPath, routeDefinition, options);
        this.loadingStates.set(normalizedPath, loadPromise);
        
        try {
            const routeData = await loadPromise;
            
            // 缓存路由数据
            this.cacheRoute(normalizedPath, routeData);
            
            // 预加载相关模块
            this.preloadRelatedModules(routeDefinition.preload);
            
            this.loadingStates.delete(normalizedPath);
            return routeData;
            
        } catch (error) {
            this.loadingStates.delete(normalizedPath);
            throw error;
        }
    }
    
    /**
     * 执行路由加载
     */
    async doLoadRoute(routePath, routeDefinition, options) {
        const startTime = performance.now();
        
        try {
            // 显示加载状态
            this.showRouteLoading(routePath);
            
            // 并行加载所有必需模块
            const modulePromises = routeDefinition.modules.map(moduleName => 
                this.loadModule(moduleName, { timeout: this.config.timeout })
            );
            
            const modules = await Promise.all(modulePromises);
            
            // 创建路由数据
            const routeData = {
                path: routePath,
                modules: this.createModuleMap(routeDefinition.modules, modules),
                definition: routeDefinition,
                loadTime: performance.now() - startTime,
                timestamp: Date.now()
            };
            
            // 隐藏加载状态
            this.hideRouteLoading();
            
            // 记录性能
            this.logRoutePerformance(routePath, routeData.loadTime);
            
            return routeData;
            
        } catch (error) {
            this.hideRouteLoading();
            throw error;
        }
    }
    
    /**
     * 加载单个模块
     */
    async loadModule(moduleName, options = {}) {
        const { timeout = this.config.timeout } = options;
        
        // 检查模块缓存
        if (this.routeModules.has(moduleName)) {
            return this.routeModules.get(moduleName);
        }
        
        try {
            const moduleUrl = `${this.config.baseUrl}${moduleName}.js`;
            
            // 动态导入模块
            const importPromise = import(moduleUrl);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Module load timeout: ${moduleName}`)), timeout);
            });
            
            const module = await Promise.race([importPromise, timeoutPromise]);
            
            // 缓存模块
            this.routeModules.set(moduleName, module);
            
            return module;
            
        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            throw error;
        }
    }
    
    /**
     * 创建模块映射
     */
    createModuleMap(moduleNames, modules) {
        const moduleMap = {};
        
        moduleNames.forEach((name, index) => {
            moduleMap[name] = modules[index];
        });
        
        return moduleMap;
    }
    
    /**
     * 预加载路由
     * @param {string} routePath - 路由路径
     * @param {Object} options - 预加载选项
     */
    async preloadRoute(routePath, options = {}) {
        const normalizedPath = this.normalizeRoutePath(routePath);
        
        if (this.preloadedRoutes.has(normalizedPath) || this.routeCache.has(normalizedPath)) {
            return; // 已预加载或已缓存
        }
        
        const { delay = this.config.preloadDelay, priority = 'low' } = options;
        
        // 延迟预加载
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
            await this.loadRoute(routePath, { preload: true });
            this.preloadedRoutes.add(normalizedPath);
            console.log(`Preloaded route: ${routePath}`);
        } catch (error) {
            console.warn(`Failed to preload route ${routePath}:`, error);
        }
    }
    
    /**
     * 预加载相关模块
     */
    async preloadRelatedModules(moduleNames = []) {
        if (moduleNames.length === 0) return;
        
        // 在空闲时预加载
        const preloadFn = async () => {
            const preloadPromises = moduleNames.map(moduleName => 
                this.loadModule(moduleName).catch(error => {
                    console.warn(`Failed to preload module ${moduleName}:`, error);
                })
            );
            
            await Promise.all(preloadPromises);
        };
        
        if ('requestIdleCallback' in window) {
            requestIdleCallback(preloadFn);
        } else {
            setTimeout(preloadFn, 100);
        }
    }
    
    /**
     * 设置链接预加载
     */
    setupLinkPreloading() {
        // 鼠标悬停预加载
        document.addEventListener('mouseover', (event) => {
            const link = event.target.closest('a[href]');
            if (link && this.isInternalLink(link)) {
                const routePath = this.extractRoutePath(link.href);
                if (routePath && this.routeDefinitions[routePath]) {
                    this.preloadRoute(routePath, { delay: 200 });
                }
            }
        });
        
        // 触摸开始预加载（移动端）
        document.addEventListener('touchstart', (event) => {
            const link = event.target.closest('a[href]');
            if (link && this.isInternalLink(link)) {
                const routePath = this.extractRoutePath(link.href);
                if (routePath && this.routeDefinitions[routePath]) {
                    this.preloadRoute(routePath, { delay: 0 });
                }
            }
        });
    }
    
    /**
     * 设置路由转场
     */
    setupRouteTransitions() {
        // 监听路由变化
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.handleRouteChange(event.state.route);
            }
        });
        
        // 拦截链接点击
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (link && this.isInternalLink(link) && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                const routePath = this.extractRoutePath(link.href);
                this.navigateToRoute(routePath);
            }
        });
    }
    
    /**
     * 导航到路由
     */
    async navigateToRoute(routePath) {
        try {
            // 开始路由转场
            this.startRouteTransition();
            
            // 加载路由
            const routeData = await this.loadRoute(routePath);
            
            // 更新浏览器历史
            history.pushState({ route: routePath }, '', routePath);
            
            // 渲染路由
            await this.renderRoute(routeData);
            
            // 完成路由转场
            this.completeRouteTransition();
            
        } catch (error) {
            console.error(`Failed to navigate to route ${routePath}:`, error);
            this.handleRouteError(error);
        }
    }
    
    /**
     * 处理路由变化
     */
    async handleRouteChange(routePath) {
        try {
            const routeData = await this.loadRoute(routePath);
            await this.renderRoute(routeData);
        } catch (error) {
            console.error(`Failed to handle route change to ${routePath}:`, error);
            this.handleRouteError(error);
        }
    }
    
    /**
     * 渲染路由
     */
    async renderRoute(routeData) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // 清理当前内容
        mainContent.innerHTML = '';
        
        // 渲染新内容
        for (const [moduleName, module] of Object.entries(routeData.modules)) {
            if (module.default && typeof module.default.render === 'function') {
                const component = new module.default();
                const content = component.render();
                
                const wrapper = document.createElement('div');
                wrapper.className = `route-module route-module-${moduleName}`;
                wrapper.innerHTML = content;
                
                mainContent.appendChild(wrapper);
            }
        }
        
        // 触发路由渲染完成事件
        document.dispatchEvent(new CustomEvent('routeRendered', {
            detail: { routeData }
        }));
    }
    
    /**
     * 显示路由加载状态
     */
    showRouteLoading(routePath) {
        const loadingElement = document.getElementById('route-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
            loadingElement.textContent = `加载中...`;
        }
        
        // 添加加载类到 body
        document.body.classList.add('route-loading');
    }
    
    /**
     * 隐藏路由加载状态
     */
    hideRouteLoading() {
        const loadingElement = document.getElementById('route-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 移除加载类
        document.body.classList.remove('route-loading');
    }
    
    /**
     * 开始路由转场
     */
    startRouteTransition() {
        document.body.classList.add('route-transitioning');
    }
    
    /**
     * 完成路由转场
     */
    completeRouteTransition() {
        document.body.classList.remove('route-transitioning');
    }
    
    /**
     * 处理路由错误
     */
    handleRouteError(error) {
        console.error('Route error:', error);
        
        // 显示错误页面
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="route-error">
                    <h2>页面加载失败</h2>
                    <p>抱歉，页面加载时出现了问题。</p>
                    <button onclick="location.reload()" class="btn btn-primary">重新加载</button>
                </div>
            `;
        }
        
        this.hideRouteLoading();
        this.completeRouteTransition();
    }
    
    /**
     * 缓存路由数据
     */
    cacheRoute(routePath, routeData) {
        // 检查缓存大小限制
        if (this.routeCache.size >= this.config.maxCacheSize) {
            // 删除最旧的缓存项
            const oldestKey = this.routeCache.keys().next().value;
            this.routeCache.delete(oldestKey);
        }
        
        this.routeCache.set(routePath, routeData);
    }
    
    /**
     * 工具方法
     */
    normalizeRoutePath(path) {
        return path.replace(/\/$/, '') || '/';
    }
    
    isInternalLink(link) {
        return link.hostname === window.location.hostname;
    }
    
    extractRoutePath(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname;
        } catch {
            return null;
        }
    }
    
    logRoutePerformance(routePath, loadTime) {
        if (loadTime > 2000) {
            console.warn(`Slow route load: ${routePath} took ${loadTime.toFixed(2)}ms`);
        }
        
        // 发送性能数据
        if (window.performance && window.performance.mark) {
            window.performance.mark(`route-load-${routePath.replace(/\//g, '-')}`);
        }
    }
    
    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            routeCache: this.routeCache.size,
            moduleCache: this.routeModules.size,
            preloadedRoutes: this.preloadedRoutes.size,
            loadingStates: this.loadingStates.size
        };
    }
    
    /**
     * 清理缓存
     */
    clearCache() {
        this.routeCache.clear();
        this.routeModules.clear();
        this.preloadedRoutes.clear();
        this.loadingStates.clear();
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        this.clearCache();
    }
}

// 创建全局实例
window.routeLoader = new RouteLoader();

// 导出类
export default RouteLoader;
/**
 * 生产环境资源管理器
 * 处理资源加载、缓存和优化
 */

class ResourceManager {
    constructor(config = {}) {
        this.config = {
            cdnDomain: config.cdnDomain || '',
            version: config.version || Date.now(),
            enablePreload: config.enablePreload !== false,
            enablePrefetch: config.enablePrefetch !== false,
            enableServiceWorker: config.enableServiceWorker !== false,
            cacheStrategy: config.cacheStrategy || 'cache-first',
            ...config
        };
        
        this.loadedResources = new Set();
        this.preloadedResources = new Set();
        this.resourceCache = new Map();
        this.loadingPromises = new Map();
        
        this.init();
    }
    
    init() {
        // 加载资源清单
        this.loadManifest();
        
        // 初始化Service Worker
        if (this.config.enableServiceWorker) {
            this.initServiceWorker();
        }
        
        // 预加载关键资源
        if (this.config.enablePreload) {
            this.preloadCriticalResources();
        }
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.onPageVisible();
            }
        });
    }
    
    async loadManifest() {
        try {
            const response = await fetch(`${this.config.cdnDomain}/static/manifest.json?v=${this.config.version}`);
            this.manifest = await response.json();
            console.log('Resource manifest loaded:', this.manifest);
        } catch (error) {
            console.warn('Failed to load resource manifest:', error);
            this.manifest = this.getDefaultManifest();
        }
    }
    
    getDefaultManifest() {
        return {
            version: this.config.version,
            files: {
                css: {
                    critical: '/static/css/critical.min.css',
                    main: '/static/css/main.min.css'
                },
                js: {
                    core: '/static/js/core.min.js',
                    components: '/static/js/components.min.js'
                }
            }
        };
    }
    
    // Service Worker初始化
    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // 监听Service Worker更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }
    
    showUpdateNotification() {
        // 显示更新通知
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <span>新版本可用</span>
                <button onclick="window.location.reload()">更新</button>
                <button onclick="this.parentElement.parentElement.remove()">稍后</button>
            </div>
        `;
        document.body.appendChild(notification);
    }
    
    // 预加载关键资源
    preloadCriticalResources() {
        const criticalResources = [
            this.getResourceUrl('css', 'critical'),
            this.getResourceUrl('css', 'main'),
            this.getResourceUrl('js', 'core')
        ];
        
        criticalResources.forEach(url => {
            if (url) {
                this.preloadResource(url);
            }
        });
    }
    
    preloadResource(url, type = 'auto') {
        if (this.preloadedResources.has(url)) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        
        // 根据文件类型设置as属性
        if (type === 'auto') {
            if (url.endsWith('.css')) {
                link.as = 'style';
            } else if (url.endsWith('.js')) {
                link.as = 'script';
            } else if (url.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
                link.as = 'image';
            } else if (url.match(/\.(woff|woff2|ttf|eot)$/)) {
                link.as = 'font';
                link.crossOrigin = 'anonymous';
            }
        } else {
            link.as = type;
        }
        
        document.head.appendChild(link);
        this.preloadedResources.add(url);
        
        console.log('Preloaded resource:', url);
    }
    
    // 预取资源
    prefetchResource(url) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
        
        console.log('Prefetched resource:', url);
    }
    
    // 获取资源URL
    getResourceUrl(type, name) {
        if (!this.manifest || !this.manifest.files[type]) {
            return null;
        }
        
        const path = this.manifest.files[type][name];
        if (!path) {
            return null;
        }
        
        return `${this.config.cdnDomain}${path}?v=${this.manifest.version}`;
    }
    
    // 动态加载CSS
    async loadCSS(name, critical = false) {
        const url = this.getResourceUrl('css', name);
        if (!url) {
            throw new Error(`CSS resource not found: ${name}`);
        }
        
        if (this.loadedResources.has(url)) {
            return Promise.resolve();
        }
        
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }
        
        const promise = new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            link.onload = () => {
                this.loadedResources.add(url);
                this.loadingPromises.delete(url);
                console.log('CSS loaded:', url);
                resolve();
            };
            
            link.onerror = () => {
                this.loadingPromises.delete(url);
                console.error('Failed to load CSS:', url);
                reject(new Error(`Failed to load CSS: ${url}`));
            };
            
            // 关键CSS插入到头部，非关键CSS插入到尾部
            if (critical) {
                document.head.insertBefore(link, document.head.firstChild);
            } else {
                document.head.appendChild(link);
            }
        });
        
        this.loadingPromises.set(url, promise);
        return promise;
    }
    
    // 动态加载JavaScript
    async loadJS(name, defer = false) {
        const url = this.getResourceUrl('js', name);
        if (!url) {
            throw new Error(`JS resource not found: ${name}`);
        }
        
        if (this.loadedResources.has(url)) {
            return Promise.resolve();
        }
        
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }
        
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.defer = defer;
            
            script.onload = () => {
                this.loadedResources.add(url);
                this.loadingPromises.delete(url);
                console.log('JS loaded:', url);
                resolve();
            };
            
            script.onerror = () => {
                this.loadingPromises.delete(url);
                console.error('Failed to load JS:', url);
                reject(new Error(`Failed to load JS: ${url}`));
            };
            
            document.head.appendChild(script);
        });
        
        this.loadingPromises.set(url, promise);
        return promise;
    }
    
    // 加载页面特定资源
    async loadPageResources(pageName) {
        const promises = [];
        
        // 加载页面CSS
        const cssUrl = this.getResourceUrl('css', pageName);
        if (cssUrl) {
            promises.push(this.loadCSS(pageName));
        }
        
        // 加载页面JS
        const jsUrl = this.getResourceUrl('js', pageName);
        if (jsUrl) {
            promises.push(this.loadJS(pageName));
        }
        
        try {
            await Promise.all(promises);
            console.log(`Page resources loaded for: ${pageName}`);
        } catch (error) {
            console.error(`Failed to load page resources for ${pageName}:`, error);
            throw error;
        }
    }
    
    // 内联关键CSS
    inlineCriticalCSS() {
        const criticalUrl = this.getResourceUrl('css', 'critical');
        if (!criticalUrl) {
            return;
        }
        
        fetch(criticalUrl)
            .then(response => response.text())
            .then(css => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.insertBefore(style, document.head.firstChild);
                console.log('Critical CSS inlined');
            })
            .catch(error => {
                console.warn('Failed to inline critical CSS:', error);
            });
    }
    
    // 页面可见时的优化
    onPageVisible() {
        // 预取下一页可能需要的资源
        this.prefetchNextPageResources();
        
        // 清理未使用的资源
        this.cleanupUnusedResources();
    }
    
    prefetchNextPageResources() {
        // 根据当前页面预测下一页
        const currentPage = this.getCurrentPageName();
        const nextPages = this.getPredictedNextPages(currentPage);
        
        nextPages.forEach(pageName => {
            const cssUrl = this.getResourceUrl('css', pageName);
            const jsUrl = this.getResourceUrl('js', pageName);
            
            if (cssUrl) this.prefetchResource(cssUrl);
            if (jsUrl) this.prefetchResource(jsUrl);
        });
    }
    
    getCurrentPageName() {
        const path = window.location.pathname;
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('recharge')) return 'recharge_management';
        if (path.includes('system')) return 'system_management';
        if (path.includes('report')) return 'report_dashboard';
        return 'dashboard';
    }
    
    getPredictedNextPages(currentPage) {
        const predictions = {
            'dashboard': ['recharge_management', 'system_management'],
            'recharge_management': ['dashboard', 'report_dashboard'],
            'system_management': ['dashboard', 'recharge_management'],
            'report_dashboard': ['dashboard', 'recharge_management']
        };
        
        return predictions[currentPage] || [];
    }
    
    cleanupUnusedResources() {
        // 清理超过5分钟未使用的缓存
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分钟
        
        for (const [key, value] of this.resourceCache.entries()) {
            if (now - value.timestamp > maxAge) {
                this.resourceCache.delete(key);
            }
        }
    }
    
    // 获取资源加载统计
    getLoadingStats() {
        return {
            loadedResources: this.loadedResources.size,
            preloadedResources: this.preloadedResources.size,
            cachedResources: this.resourceCache.size,
            loadingPromises: this.loadingPromises.size
        };
    }
    
    // 清除所有缓存
    clearCache() {
        this.loadedResources.clear();
        this.preloadedResources.clear();
        this.resourceCache.clear();
        this.loadingPromises.clear();
        
        console.log('Resource cache cleared');
    }
}

// 全局实例
window.ResourceManager = ResourceManager;

// 自动初始化
if (window.RESOURCE_CONFIG) {
    window.resourceManager = new ResourceManager(window.RESOURCE_CONFIG);
}

export default ResourceManager;
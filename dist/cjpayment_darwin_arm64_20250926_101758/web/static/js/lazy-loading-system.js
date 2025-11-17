/**
 * 懒加载系统集成
 * Lazy Loading System Integration
 */

import LazyLoader from './lazy-loader.js';
import RouteLoader from './route-loader.js';
import PreloadCache from './preload-cache.js';
import PerformanceMonitor from './performance-monitor.js';

class LazyLoadingSystem {
    constructor() {
        this.lazyLoader = null;
        this.routeLoader = null;
        this.preloadCache = null;
        this.performanceMonitor = null;
        
        this.config = {
            enableLazyLoading: true,
            enableRouteLoading: true,
            enablePreloading: true,
            enablePerformanceMonitoring: true,
            debug: false
        };
        
        this.init();
    }
    
    async init() {
        try {
            // 初始化性能监控
            if (this.config.enablePerformanceMonitoring) {
                this.performanceMonitor = new PerformanceMonitor();
            }
            
            // 初始化预加载缓存
            if (this.config.enablePreloading) {
                this.preloadCache = new PreloadCache();
            }
            
            // 初始化组件懒加载
            if (this.config.enableLazyLoading) {
                this.lazyLoader = new LazyLoader();
            }
            
            // 初始化路由加载
            if (this.config.enableRouteLoading) {
                this.routeLoader = new RouteLoader();
            }
            
            // 设置系统集成
            this.setupIntegration();
            
            // 设置全局API
            this.setupGlobalAPI();
            
            console.log('Lazy Loading System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Lazy Loading System:', error);
        }
    }
    
    /**
     * 设置系统集成
     */
    setupIntegration() {
        // 集成懒加载器和预加载缓存
        if (this.lazyLoader && this.preloadCache) {
            this.integrateLazyLoaderWithCache();
        }
        
        // 集成路由加载器和性能监控
        if (this.routeLoader && this.performanceMonitor) {
            this.integrateRouteLoaderWithMonitoring();
        }
        
        // 设置组件间通信
        this.setupInterComponentCommunication();
    }
    
    /**
     * 集成懒加载器和预加载缓存
     */
    integrateLazyLoaderWithCache() {
        // 重写懒加载器的加载方法，使用预加载缓存
        const originalLoadComponent = this.lazyLoader.loadComponent.bind(this.lazyLoader);
        
        this.lazyLoader.loadComponent = async (componentName, options = {}) => {
            // 首先检查预加载缓存
            const cached = this.preloadCache.getCachedResource(componentName);
            if (cached) {
                if (this.config.debug) {
                    console.log(`Component ${componentName} loaded from cache`);
                }
                return cached;
            }
            
            // 使用性能监控包装加载过程
            if (this.performanceMonitor) {
                return this.performanceMonitor.measureComponentLoad(
                    componentName,
                    () => originalLoadComponent(componentName, options)
                );
            }
            
            return originalLoadComponent(componentName, options);
        };
    }
    
    /**
     * 集成路由加载器和性能监控
     */
    integrateRouteLoaderWithMonitoring() {
        // 重写路由加载器的加载方法，添加性能监控
        const originalLoadRoute = this.routeLoader.loadRoute.bind(this.routeLoader);
        
        this.routeLoader.loadRoute = async (routePath, options = {}) => {
            return this.performanceMonitor.measureComponentLoad(
                `route-${routePath}`,
                () => originalLoadRoute(routePath, options)
            );
        };
    }
    
    /**
     * 设置组件间通信
     */
    setupInterComponentCommunication() {
        // 创建事件总线
        this.eventBus = new EventTarget();
        
        // 监听组件加载事件
        document.addEventListener('lazyLoaded', (event) => {
            const { component } = event.detail;
            
            // 通知预加载缓存
            if (this.preloadCache) {
                this.preloadCache.preload(this.getPredictedComponents(component), 'predictive');
            }
        });
        
        // 监听路由变化事件
        document.addEventListener('routeRendered', (event) => {
            const { routeData } = event.detail;
            
            // 预加载相关路由
            if (this.routeLoader) {
                this.preloadRelatedRoutes(routeData.path);
            }
        });
    }
    
    /**
     * 获取预测的组件
     */
    getPredictedComponents(currentComponent) {
        // 基于当前组件预测可能需要的组件
        const predictions = {
            'dashboard': ['chart-component', 'stats-component', 'modal-component'],
            'table-component': ['pagination-component', 'modal-component'],
            'form-wizard': ['business-validation', 'modal-component'],
            'chart-component': ['stats-component', 'advanced-table']
        };
        
        const componentName = currentComponent.constructor.name.toLowerCase();
        return predictions[componentName] || [];
    }
    
    /**
     * 预加载相关路由
     */
    preloadRelatedRoutes(currentRoute) {
        const relatedRoutes = {
            '/dashboard': ['/recharge', '/reports'],
            '/recharge': ['/recharge/create', '/dashboard'],
            '/system': ['/system/config', '/dashboard'],
            '/reports': ['/financial', '/dashboard']
        };
        
        const routes = relatedRoutes[currentRoute] || [];
        routes.forEach(route => {
            if (this.routeLoader) {
                this.routeLoader.preloadRoute(route, { priority: 'low' });
            }
        });
    }
    
    /**
     * 设置全局API
     */
    setupGlobalAPI() {
        // 创建统一的全局API
        window.LazySystem = {
            // 组件加载
            loadComponent: (name, options) => {
                return this.lazyLoader ? this.lazyLoader.loadComponent(name, options) : null;
            },
            
            // 路由加载
            loadRoute: (path, options) => {
                return this.routeLoader ? this.routeLoader.loadRoute(path, options) : null;
            },
            
            // 预加载
            preload: (resources, strategy, options) => {
                return this.preloadCache ? this.preloadCache.preload(resources, strategy, options) : null;
            },
            
            // 性能测量
            measurePerformance: (fn, context) => {
                return this.performanceMonitor ? this.performanceMonitor.measureRender(fn, context) : fn();
            },
            
            // 获取统计信息
            getStats: () => {
                return {
                    lazyLoader: this.lazyLoader ? this.lazyLoader.getCacheStats() : null,
                    routeLoader: this.routeLoader ? this.routeLoader.getCacheStats() : null,
                    preloadCache: this.preloadCache ? this.preloadCache.getStats() : null,
                    performance: this.performanceMonitor ? this.performanceMonitor.getStats() : null
                };
            },
            
            // 清理缓存
            clearCache: () => {
                if (this.lazyLoader) this.lazyLoader.clearCache();
                if (this.routeLoader) this.routeLoader.clearCache();
                if (this.preloadCache) this.preloadCache.clearCache();
            },
            
            // 配置系统
            configure: (newConfig) => {
                Object.assign(this.config, newConfig);
                this.applyConfiguration();
            }
        };
        
        // 设置便捷方法
        this.setupConvenienceMethods();
    }
    
    /**
     * 设置便捷方法
     */
    setupConvenienceMethods() {
        // 自动懒加载标记的元素
        this.setupAutoLazyLoading();
        
        // 自动预加载链接
        this.setupAutoPreloading();
        
        // 自动路由处理
        this.setupAutoRouting();
    }
    
    /**
     * 设置自动懒加载
     */
    setupAutoLazyLoading() {
        // 观察带有 data-lazy-component 属性的元素
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const componentName = element.dataset.lazyComponent;
                    
                    if (componentName && this.lazyLoader) {
                        this.lazyLoader.loadComponent(componentName, { element })
                            .then(component => {
                                if (component && typeof component.render === 'function') {
                                    element.innerHTML = component.render();
                                    element.classList.add('lazy-loaded');
                                }
                            })
                            .catch(error => {
                                console.error(`Failed to lazy load ${componentName}:`, error);
                                element.innerHTML = '<div class="lazy-error">加载失败</div>';
                            });
                    }
                    
                    observer.unobserve(element);
                }
            });
        }, { threshold: 0.1, rootMargin: '50px' });
        
        // 观察现有元素
        document.querySelectorAll('[data-lazy-component]').forEach(el => {
            observer.observe(el);
        });
        
        // 观察新添加的元素
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.dataset && node.dataset.lazyComponent) {
                            observer.observe(node);
                        }
                        
                        // 检查子元素
                        const lazyElements = node.querySelectorAll('[data-lazy-component]');
                        lazyElements.forEach(el => observer.observe(el));
                    }
                });
            });
        });
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 设置自动预加载
     */
    setupAutoPreloading() {
        // 预加载带有 data-preload 属性的链接
        document.addEventListener('mouseover', (event) => {
            const link = event.target.closest('[data-preload]');
            if (link && this.preloadCache) {
                const resources = link.dataset.preload.split(',').map(s => s.trim());
                this.preloadCache.preload(resources, 'predictive', { delay: 200 });
            }
        });
    }
    
    /**
     * 设置自动路由处理
     */
    setupAutoRouting() {
        // 处理带有 data-route 属性的链接
        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-route]');
            if (link && this.routeLoader && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                const routePath = link.dataset.route;
                this.routeLoader.navigateToRoute(routePath);
            }
        });
    }
    
    /**
     * 应用配置
     */
    applyConfiguration() {
        // 根据配置启用/禁用功能
        if (!this.config.enableLazyLoading && this.lazyLoader) {
            this.lazyLoader.destroy();
            this.lazyLoader = null;
        }
        
        if (!this.config.enableRouteLoading && this.routeLoader) {
            this.routeLoader.destroy();
            this.routeLoader = null;
        }
        
        if (!this.config.enablePreloading && this.preloadCache) {
            this.preloadCache.destroy();
            this.preloadCache = null;
        }
        
        if (!this.config.enablePerformanceMonitoring && this.performanceMonitor) {
            this.performanceMonitor.destroy();
            this.performanceMonitor = null;
        }
    }
    
    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            initialized: true,
            components: {
                lazyLoader: !!this.lazyLoader,
                routeLoader: !!this.routeLoader,
                preloadCache: !!this.preloadCache,
                performanceMonitor: !!this.performanceMonitor
            },
            config: this.config,
            stats: window.LazySystem ? window.LazySystem.getStats() : null
        };
    }
    
    /**
     * 销毁系统
     */
    destroy() {
        if (this.lazyLoader) {
            this.lazyLoader.destroy();
            this.lazyLoader = null;
        }
        
        if (this.routeLoader) {
            this.routeLoader.destroy();
            this.routeLoader = null;
        }
        
        if (this.preloadCache) {
            this.preloadCache.destroy();
            this.preloadCache = null;
        }
        
        if (this.performanceMonitor) {
            this.performanceMonitor.destroy();
            this.performanceMonitor = null;
        }
        
        // 清理全局API
        if (window.LazySystem) {
            delete window.LazySystem;
        }
    }
}

// 自动初始化系统
document.addEventListener('DOMContentLoaded', () => {
    window.lazyLoadingSystem = new LazyLoadingSystem();
});

// 导出类
export default LazyLoadingSystem;
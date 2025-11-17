/**
 * 性能优化集成系统
 * Performance Optimization Integration System
 */

import { VirtualScroll, VirtualTable, VirtualGrid } from './virtual-scroll.js';
import { ImageLazyLoader, BackgroundImageLazyLoader } from './image-lazy-loader.js';
import ResourceOptimizer from './resource-optimizer.js';

class PerformanceOptimizer {
    constructor() {
        this.config = {
            enableVirtualScroll: true,
            enableImageLazyLoading: true,
            enableResourceOptimization: true,
            enableRenderOptimization: true,
            enableMemoryOptimization: true,
            performanceThresholds: {
                renderTime: 16, // 60fps
                loadTime: 2000,
                memoryUsage: 50 * 1024 * 1024, // 50MB
                bundleSize: 250 * 1024 // 250KB
            }
        };
        
        this.virtualScrollInstances = new Map();
        this.imageLazyLoader = null;
        this.backgroundImageLazyLoader = null;
        this.resourceOptimizer = null;
        
        this.performanceMetrics = {
            renderTimes: [],
            loadTimes: [],
            memoryUsage: [],
            bundleSizes: []
        };
        
        this.optimizationQueue = [];
        this.isOptimizing = false;
        
        this.init();
    }
    
    async init() {
        try {
            // 初始化各个优化模块
            await this.initializeOptimizers();
            
            // 设置性能监控
            this.setupPerformanceMonitoring();
            
            // 设置自动优化
            this.setupAutoOptimization();
            
            // 设置内存管理
            this.setupMemoryManagement();
            
            console.log('Performance Optimizer initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Performance Optimizer:', error);
        }
    }
    
    /**
     * 初始化优化器
     */
    async initializeOptimizers() {
        // 初始化图片懒加载
        if (this.config.enableImageLazyLoading) {
            this.imageLazyLoader = new ImageLazyLoader({
                rootMargin: '100px',
                threshold: 0.1,
                enableWebP: true,
                enableResponsive: true
            });
            
            this.backgroundImageLazyLoader = new BackgroundImageLazyLoader({
                rootMargin: '100px',
                threshold: 0.1
            });
        }
        
        // 初始化资源优化器
        if (this.config.enableResourceOptimization) {
            this.resourceOptimizer = new ResourceOptimizer();
        }
        
        // 初始化虚拟滚动
        if (this.config.enableVirtualScroll) {
            this.initializeVirtualScroll();
        }
    }
    
    /**
     * 初始化虚拟滚动
     */
    initializeVirtualScroll() {
        // 自动为大列表启用虚拟滚动
        const largeLists = document.querySelectorAll('[data-virtual-scroll]');
        
        largeLists.forEach(container => {
            const type = container.dataset.virtualScrollType || 'list';
            const itemHeight = parseInt(container.dataset.itemHeight) || 50;
            const options = {
                itemHeight,
                bufferSize: 5,
                overscan: 3
            };
            
            let virtualScroll;
            
            switch (type) {
                case 'table':
                    const columns = this.parseColumns(container.dataset.columns);
                    virtualScroll = new VirtualTable(container, { ...options, columns });
                    break;
                    
                case 'grid':
                    const columnsCount = parseInt(container.dataset.columnsCount) || 3;
                    virtualScroll = new VirtualGrid(container, { ...options, columnsCount });
                    break;
                    
                default:
                    virtualScroll = new VirtualScroll(container, options);
            }
            
            this.virtualScrollInstances.set(container, virtualScroll);
        });
    }
    
    /**
     * 解析列配置
     */
    parseColumns(columnsData) {
        if (!columnsData) return [];
        
        try {
            return JSON.parse(columnsData);
        } catch {
            return [];
        }
    }
    
    /**
     * 设置性能监控
     */
    setupPerformanceMonitoring() {
        // 监控渲染性能
        this.monitorRenderPerformance();
        
        // 监控内存使用
        this.monitorMemoryUsage();
        
        // 监控网络性能
        this.monitorNetworkPerformance();
        
        // 监控用户交互性能
        this.monitorInteractionPerformance();
    }
    
    /**
     * 监控渲染性能
     */
    monitorRenderPerformance() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
            const currentTime = performance.now();
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    console.warn(`Low FPS detected: ${fps}fps`);
                    this.optimizeRendering();
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    /**
     * 监控内存使用
     */
    monitorMemoryUsage() {
        if (!('memory' in performance)) return;
        
        setInterval(() => {
            const memInfo = performance.memory;
            const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
            
            this.performanceMetrics.memoryUsage.push({
                timestamp: Date.now(),
                used: memInfo.usedJSHeapSize,
                total: memInfo.totalJSHeapSize,
                limit: memInfo.jsHeapSizeLimit,
                ratio: usageRatio
            });
            
            if (usageRatio > 0.8) {
                console.warn('High memory usage detected:', {
                    used: `${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                    limit: `${(memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
                    ratio: `${(usageRatio * 100).toFixed(1)}%`
                });
                
                this.optimizeMemory();
            }
        }, 10000);
    }
    
    /**
     * 监控网络性能
     */
    monitorNetworkPerformance() {
        if (!('PerformanceObserver' in window)) return;
        
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > this.config.performanceThresholds.loadTime) {
                    console.warn(`Slow resource load: ${entry.name} took ${entry.duration}ms`);
                    this.optimizeResourceLoading(entry);
                }
                
                this.performanceMetrics.loadTimes.push({
                    timestamp: Date.now(),
                    name: entry.name,
                    duration: entry.duration,
                    size: entry.transferSize
                });
            }
        });
        
        observer.observe({ entryTypes: ['resource'] });
    }
    
    /**
     * 监控用户交互性能
     */
    monitorInteractionPerformance() {
        // 监控点击响应时间
        document.addEventListener('click', (event) => {
            const startTime = performance.now();
            
            requestAnimationFrame(() => {
                const responseTime = performance.now() - startTime;
                
                if (responseTime > this.config.performanceThresholds.renderTime) {
                    console.warn(`Slow click response: ${responseTime}ms`);
                    this.optimizeInteraction(event.target);
                }
            });
        });
        
        // 监控滚动性能
        let scrollStartTime = 0;
        let isScrolling = false;
        
        document.addEventListener('scroll', () => {
            if (!isScrolling) {
                scrollStartTime = performance.now();
                isScrolling = true;
            }
        }, { passive: true });
        
        document.addEventListener('scrollend', () => {
            if (isScrolling) {
                const scrollDuration = performance.now() - scrollStartTime;
                
                if (scrollDuration > 100) {
                    console.warn(`Slow scroll performance: ${scrollDuration}ms`);
                    this.optimizeScrolling();
                }
                
                isScrolling = false;
            }
        });
    }
    
    /**
     * 设置自动优化
     */
    setupAutoOptimization() {
        // 页面空闲时进行优化
        if ('requestIdleCallback' in window) {
            const optimizeOnIdle = () => {
                requestIdleCallback((deadline) => {
                    while (deadline.timeRemaining() > 0 && this.optimizationQueue.length > 0) {
                        const task = this.optimizationQueue.shift();
                        task();
                    }
                    
                    // 继续下一轮优化
                    setTimeout(optimizeOnIdle, 5000);
                });
            };
            
            optimizeOnIdle();
        }
        
        // 页面可见性变化时优化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.optimizeOnVisible();
            }
        });
    }
    
    /**
     * 设置内存管理
     */
    setupMemoryManagement() {
        // 定期清理不需要的资源
        setInterval(() => {
            this.cleanupUnusedResources();
        }, 30000);
        
        // 监听页面可见性变化，清理资源（替代beforeunload）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.cleanup();
            }
        });
    }
    
    /**
     * 优化渲染性能
     */
    optimizeRendering() {
        this.optimizationQueue.push(() => {
            // 减少重绘和重排
            this.batchDOMUpdates();
            
            // 优化动画
            this.optimizeAnimations();
            
            // 使用 CSS containment
            this.applyCSSContainment();
        });
    }
    
    /**
     * 批量 DOM 更新
     */
    batchDOMUpdates() {
        const elementsToUpdate = document.querySelectorAll('[data-batch-update]');
        
        if (elementsToUpdate.length === 0) return;
        
        // 使用 DocumentFragment 批量更新
        const fragment = document.createDocumentFragment();
        const updates = [];
        
        elementsToUpdate.forEach(element => {
            const updateData = element.dataset.batchUpdate;
            if (updateData) {
                try {
                    const update = JSON.parse(updateData);
                    updates.push({ element, update });
                } catch (error) {
                    console.warn('Invalid batch update data:', updateData);
                }
            }
        });
        
        // 批量应用更新
        requestAnimationFrame(() => {
            updates.forEach(({ element, update }) => {
                Object.assign(element.style, update.style || {});
                if (update.className) {
                    element.className = update.className;
                }
                if (update.textContent) {
                    element.textContent = update.textContent;
                }
            });
        });
    }
    
    /**
     * 优化动画
     */
    optimizeAnimations() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        animatedElements.forEach(element => {
            // 使用 transform 和 opacity 进行动画
            element.style.willChange = 'transform, opacity';
            
            // 在动画结束后移除 will-change
            element.addEventListener('animationend', () => {
                element.style.willChange = 'auto';
            }, { once: true });
        });
    }
    
    /**
     * 应用 CSS containment
     */
    applyCSSContainment() {
        const containers = document.querySelectorAll('.card, .component, .widget');
        
        containers.forEach(container => {
            if (!container.style.contain) {
                container.style.contain = 'layout style paint';
            }
        });
    }
    
    /**
     * 优化内存使用
     */
    optimizeMemory() {
        this.optimizationQueue.push(() => {
            // 清理事件监听器
            this.cleanupEventListeners();
            
            // 清理缓存
            this.cleanupCaches();
            
            // 强制垃圾回收（如果可用）
            if (window.gc) {
                window.gc();
            }
        });
    }
    
    /**
     * 清理事件监听器
     */
    cleanupEventListeners() {
        // 移除不活跃元素的事件监听器
        const inactiveElements = document.querySelectorAll('[data-inactive]');
        
        inactiveElements.forEach(element => {
            // 克隆元素以移除所有事件监听器
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        });
    }
    
    /**
     * 清理缓存
     */
    cleanupCaches() {
        // 清理虚拟滚动缓存
        this.virtualScrollInstances.forEach(instance => {
            if (typeof instance.clearCache === 'function') {
                instance.clearCache();
            }
        });
        
        // 清理图片懒加载缓存
        if (this.imageLazyLoader) {
            // 清理已加载但不可见的图片
            const loadedImages = document.querySelectorAll('img.img-loaded');
            loadedImages.forEach(img => {
                if (!this.isElementVisible(img)) {
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('img-loaded');
                }
            });
        }
    }
    
    /**
     * 优化资源加载
     */
    optimizeResourceLoading(entry) {
        this.optimizationQueue.push(() => {
            // 对慢速资源进行优化
            if (entry.name.includes('.js')) {
                this.optimizeScriptLoading(entry.name);
            } else if (entry.name.includes('.css')) {
                this.optimizeStyleLoading(entry.name);
            } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                this.optimizeImageLoading(entry.name);
            }
        });
    }
    
    /**
     * 优化脚本加载
     */
    optimizeScriptLoading(scriptUrl) {
        const script = document.querySelector(`script[src="${scriptUrl}"]`);
        if (script && !script.async && !script.defer) {
            // 为慢速脚本添加 defer 属性
            script.defer = true;
        }
    }
    
    /**
     * 优化样式加载
     */
    optimizeStyleLoading(styleUrl) {
        const link = document.querySelector(`link[href="${styleUrl}"]`);
        if (link) {
            // 将非关键 CSS 改为预加载
            if (!link.dataset.critical) {
                link.rel = 'preload';
                link.as = 'style';
                link.onload = () => {
                    link.rel = 'stylesheet';
                };
            }
        }
    }
    
    /**
     * 优化图片加载
     */
    optimizeImageLoading(imageUrl) {
        const img = document.querySelector(`img[src="${imageUrl}"]`);
        if (img) {
            // 为大图片添加懒加载
            if (!img.dataset.src && img.naturalWidth > 800) {
                img.dataset.src = img.src;
                img.src = this.imageLazyLoader?.config.placeholderSrc || '';
                img.classList.add('img-loading');
                
                if (this.imageLazyLoader) {
                    this.imageLazyLoader.observeImage(img);
                }
            }
        }
    }
    
    /**
     * 优化用户交互
     */
    optimizeInteraction(element) {
        this.optimizationQueue.push(() => {
            // 为慢响应元素添加防抖
            this.addDebounce(element);
            
            // 优化事件委托
            this.optimizeEventDelegation(element);
        });
    }
    
    /**
     * 添加防抖
     */
    addDebounce(element) {
        if (element.dataset.debounced) return;
        
        const originalHandler = element.onclick;
        if (originalHandler) {
            element.onclick = this.debounce(originalHandler, 300);
            element.dataset.debounced = 'true';
        }
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * 优化事件委托
     */
    optimizeEventDelegation(element) {
        const parent = element.closest('[data-event-delegate]');
        if (parent) {
            // 移除子元素的直接事件监听器，使用事件委托
            const eventType = parent.dataset.eventDelegate;
            if (element[`on${eventType}`]) {
                element[`on${eventType}`] = null;
            }
        }
    }
    
    /**
     * 优化滚动性能
     */
    optimizeScrolling() {
        this.optimizationQueue.push(() => {
            // 为滚动容器启用虚拟滚动
            const scrollContainers = document.querySelectorAll('[data-scroll-optimize]');
            
            scrollContainers.forEach(container => {
                if (!this.virtualScrollInstances.has(container)) {
                    const itemCount = container.children.length;
                    
                    if (itemCount > 50) {
                        // 启用虚拟滚动
                        const virtualScroll = new VirtualScroll(container, {
                            itemHeight: 50,
                            bufferSize: 10
                        });
                        
                        this.virtualScrollInstances.set(container, virtualScroll);
                    }
                }
            });
        });
    }
    
    /**
     * 页面可见时优化
     */
    optimizeOnVisible() {
        // 恢复暂停的动画
        const pausedAnimations = document.querySelectorAll('[data-animation-paused]');
        pausedAnimations.forEach(element => {
            element.style.animationPlayState = 'running';
            element.removeAttribute('data-animation-paused');
        });
        
        // 恢复图片加载
        if (this.imageLazyLoader) {
            this.imageLazyLoader.resumeLoading();
        }
    }
    
    /**
     * 清理未使用的资源
     */
    cleanupUnusedResources() {
        // 清理不可见的虚拟滚动实例
        this.virtualScrollInstances.forEach((instance, container) => {
            if (!this.isElementVisible(container)) {
                instance.destroy();
                this.virtualScrollInstances.delete(container);
            }
        });
        
        // 清理旧的性能指标
        const cutoffTime = Date.now() - 5 * 60 * 1000; // 5分钟前
        
        Object.keys(this.performanceMetrics).forEach(key => {
            this.performanceMetrics[key] = this.performanceMetrics[key].filter(
                metric => metric.timestamp > cutoffTime
            );
        });
    }
    
    /**
     * 检查元素是否可见
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }
    
    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        return {
            virtualScrollInstances: this.virtualScrollInstances.size,
            optimizationQueueLength: this.optimizationQueue.length,
            metrics: {
                renderTimes: this.performanceMetrics.renderTimes.length,
                loadTimes: this.performanceMetrics.loadTimes.length,
                memoryUsage: this.performanceMetrics.memoryUsage.length
            },
            thresholds: this.config.performanceThresholds
        };
    }
    
    /**
     * 手动触发优化
     */
    optimize() {
        if (this.isOptimizing) return;
        
        this.isOptimizing = true;
        
        Promise.resolve()
            .then(() => this.optimizeRendering())
            .then(() => this.optimizeMemory())
            .then(() => this.cleanupUnusedResources())
            .finally(() => {
                this.isOptimizing = false;
            });
    }
    
    /**
     * 清理所有资源
     */
    cleanup() {
        // 销毁虚拟滚动实例
        this.virtualScrollInstances.forEach(instance => {
            instance.destroy();
        });
        this.virtualScrollInstances.clear();
        
        // 销毁图片懒加载器
        if (this.imageLazyLoader) {
            this.imageLazyLoader.destroy();
        }
        
        if (this.backgroundImageLazyLoader) {
            this.backgroundImageLazyLoader.destroy();
        }
        
        // 销毁资源优化器
        if (this.resourceOptimizer) {
            this.resourceOptimizer.destroy();
        }
        
        // 清理性能指标
        Object.keys(this.performanceMetrics).forEach(key => {
            this.performanceMetrics[key] = [];
        });
        
        // 清理优化队列
        this.optimizationQueue = [];
    }
}

// 创建全局实例
window.performanceOptimizer = new PerformanceOptimizer();

// 导出类
export default PerformanceOptimizer;
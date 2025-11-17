/**
 * 预加载和缓存策略系统
 * Preloading and Caching Strategy System
 */

class PreloadCache {
    constructor() {
        this.cache = new Map();
        this.preloadQueue = [];
        this.loadingPromises = new Map();
        this.strategies = new Map();
        this.observers = new Map();
        
        this.config = {
            maxCacheSize: 50,
            maxMemoryUsage: 50 * 1024 * 1024, // 50MB
            preloadBatchSize: 3,
            preloadInterval: 100,
            cacheExpiry: 30 * 60 * 1000, // 30分钟
            priorityLevels: {
                critical: 0,
                high: 1,
                normal: 2,
                low: 3
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupPreloadStrategies();
        this.setupCacheStrategies();
        this.setupMemoryMonitoring();
        this.startPreloadWorker();
    }
    
    /**
     * 设置预加载策略
     */
    setupPreloadStrategies() {
        // 关键资源预加载策略
        this.strategies.set('critical', {
            priority: this.config.priorityLevels.critical,
            immediate: true,
            retry: 3,
            timeout: 5000,
            cache: true
        });
        
        // 用户行为预测预加载
        this.strategies.set('predictive', {
            priority: this.config.priorityLevels.high,
            immediate: false,
            delay: 1000,
            retry: 2,
            timeout: 10000,
            cache: true
        });
        
        // 可视区域预加载
        this.strategies.set('viewport', {
            priority: this.config.priorityLevels.normal,
            immediate: false,
            threshold: 0.1,
            rootMargin: '100px',
            retry: 1,
            timeout: 15000,
            cache: true
        });
        
        // 空闲时间预加载
        this.strategies.set('idle', {
            priority: this.config.priorityLevels.low,
            immediate: false,
            idleTimeout: 5000,
            retry: 1,
            timeout: 20000,
            cache: true
        });
    }
    
    /**
     * 设置缓存策略
     */
    setupCacheStrategies() {
        // LRU 缓存策略
        this.cacheStrategies = {
            lru: this.lruEviction.bind(this),
            lfu: this.lfuEviction.bind(this),
            ttl: this.ttlEviction.bind(this),
            memory: this.memoryBasedEviction.bind(this)
        };
        
        this.currentStrategy = 'lru';
    }
    
    /**
     * 预加载资源
     * @param {string|Array} resources - 资源或资源列表
     * @param {string} strategy - 预加载策略
     * @param {Object} options - 选项
     */
    async preload(resources, strategy = 'normal', options = {}) {
        const resourceList = Array.isArray(resources) ? resources : [resources];
        const strategyConfig = this.strategies.get(strategy) || this.strategies.get('normal');
        
        const preloadTasks = resourceList.map(resource => ({
            resource,
            strategy,
            config: { ...strategyConfig, ...options },
            timestamp: Date.now(),
            attempts: 0
        }));
        
        // 根据优先级排序
        preloadTasks.sort((a, b) => a.config.priority - b.config.priority);
        
        // 添加到预加载队列
        this.preloadQueue.push(...preloadTasks);
        
        // 如果是立即执行的策略，直接处理
        if (strategyConfig.immediate) {
            return this.processPreloadTasks(preloadTasks);
        }
        
        return Promise.resolve();
    }
    
    /**
     * 处理预加载任务
     */
    async processPreloadTasks(tasks) {
        const results = [];
        
        for (const task of tasks) {
            try {
                const result = await this.executePreloadTask(task);
                results.push(result);
            } catch (error) {
                console.warn(`Preload failed for ${task.resource}:`, error);
                results.push({ resource: task.resource, error });
            }
        }
        
        return results;
    }
    
    /**
     * 执行预加载任务
     */
    async executePreloadTask(task) {
        const { resource, config } = task;
        const cacheKey = this.getCacheKey(resource);
        
        // 检查缓存
        if (this.cache.has(cacheKey)) {
            return { resource, cached: true, data: this.cache.get(cacheKey) };
        }
        
        // 检查是否正在加载
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        
        // 应用延迟
        if (config.delay) {
            await this.delay(config.delay);
        }
        
        // 开始加载
        const loadPromise = this.loadResource(resource, config);
        this.loadingPromises.set(cacheKey, loadPromise);
        
        try {
            const data = await loadPromise;
            
            // 缓存数据
            if (config.cache) {
                this.cacheResource(cacheKey, data, config);
            }
            
            this.loadingPromises.delete(cacheKey);
            return { resource, data };
            
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            
            // 重试逻辑
            if (task.attempts < config.retry) {
                task.attempts++;
                console.log(`Retrying preload for ${resource} (attempt ${task.attempts})`);
                return this.executePreloadTask(task);
            }
            
            throw error;
        }
    }
    
    /**
     * 加载资源
     */
    async loadResource(resource, config) {
        const { timeout = 10000 } = config;
        
        // 根据资源类型选择加载方法
        if (resource.endsWith('.js')) {
            return this.loadScript(resource, timeout);
        } else if (resource.endsWith('.css')) {
            return this.loadStylesheet(resource, timeout);
        } else if (resource.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            return this.loadImage(resource, timeout);
        } else {
            return this.loadGeneric(resource, timeout);
        }
    }
    
    /**
     * 加载脚本
     */
    async loadScript(src, timeout) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const timeoutId = setTimeout(() => {
                reject(new Error(`Script load timeout: ${src}`));
            }, timeout);
            
            script.onload = () => {
                clearTimeout(timeoutId);
                resolve({ type: 'script', src, element: script });
            };
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Script load error: ${src}`));
            };
            
            script.src = src;
            script.async = true;
            document.head.appendChild(script);
        });
    }
    
    /**
     * 加载样式表
     */
    async loadStylesheet(href, timeout) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            const timeoutId = setTimeout(() => {
                reject(new Error(`Stylesheet load timeout: ${href}`));
            }, timeout);
            
            link.onload = () => {
                clearTimeout(timeoutId);
                resolve({ type: 'stylesheet', href, element: link });
            };
            
            link.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Stylesheet load error: ${href}`));
            };
            
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        });
    }
    
    /**
     * 加载图片
     */
    async loadImage(src, timeout) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeoutId = setTimeout(() => {
                reject(new Error(`Image load timeout: ${src}`));
            }, timeout);
            
            img.onload = () => {
                clearTimeout(timeoutId);
                resolve({ type: 'image', src, element: img, width: img.width, height: img.height });
            };
            
            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Image load error: ${src}`));
            };
            
            img.src = src;
        });
    }
    
    /**
     * 加载通用资源
     */
    async loadGeneric(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.text();
            return { type: 'generic', url, data, size: data.length };
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    /**
     * 缓存资源
     */
    cacheResource(key, data, config) {
        // 检查缓存大小限制
        if (this.cache.size >= this.config.maxCacheSize) {
            this.evictCache();
        }
        
        // 检查内存使用限制
        if (this.getMemoryUsage() >= this.config.maxMemoryUsage) {
            this.evictCache('memory');
        }
        
        const cacheEntry = {
            data,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccess: Date.now(),
            size: this.estimateSize(data),
            ttl: config.ttl || this.config.cacheExpiry
        };
        
        this.cache.set(key, cacheEntry);
    }
    
    /**
     * 获取缓存资源
     */
    getCachedResource(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        // 检查 TTL
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        // 更新访问信息
        entry.accessCount++;
        entry.lastAccess = Date.now();
        
        return entry.data;
    }
    
    /**
     * 缓存淘汰策略
     */
    evictCache(strategy = this.currentStrategy) {
        const evictionFn = this.cacheStrategies[strategy];
        if (evictionFn) {
            evictionFn();
        }
    }
    
    /**
     * LRU 淘汰策略
     */
    lruEviction() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * LFU 淘汰策略
     */
    lfuEviction() {
        let leastUsedKey = null;
        let leastCount = Infinity;
        
        for (const [key, entry] of this.cache) {
            if (entry.accessCount < leastCount) {
                leastCount = entry.accessCount;
                leastUsedKey = key;
            }
        }
        
        if (leastUsedKey) {
            this.cache.delete(leastUsedKey);
        }
    }
    
    /**
     * TTL 淘汰策略
     */
    ttlEviction() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => this.cache.delete(key));
    }
    
    /**
     * 基于内存的淘汰策略
     */
    memoryBasedEviction() {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => b[1].size - a[1].size); // 按大小降序排序
        
        // 删除最大的缓存项
        if (entries.length > 0) {
            this.cache.delete(entries[0][0]);
        }
    }
    
    /**
     * 启动预加载工作器
     */
    startPreloadWorker() {
        const processQueue = () => {
            if (this.preloadQueue.length === 0) {
                setTimeout(processQueue, this.config.preloadInterval);
                return;
            }
            
            // 处理一批任务
            const batch = this.preloadQueue.splice(0, this.config.preloadBatchSize);
            
            // 在空闲时处理
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    this.processPreloadTasks(batch);
                    setTimeout(processQueue, this.config.preloadInterval);
                });
            } else {
                setTimeout(() => {
                    this.processPreloadTasks(batch);
                    setTimeout(processQueue, this.config.preloadInterval);
                }, this.config.preloadInterval);
            }
        };
        
        processQueue();
    }
    
    /**
     * 设置内存监控
     */
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
                
                if (usageRatio > 0.8) {
                    console.warn('High memory usage detected, clearing cache');
                    this.evictCache('memory');
                }
            }, 30000); // 每30秒检查一次
        }
    }
    
    /**
     * 预测性预加载
     */
    setupPredictivePreloading() {
        // 基于用户行为的预加载
        const userBehavior = {
            clickPatterns: [],
            navigationHistory: [],
            timeSpent: new Map()
        };
        
        // 记录用户行为
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a[href]');
            if (target) {
                userBehavior.clickPatterns.push({
                    href: target.href,
                    timestamp: Date.now()
                });
                
                // 预测下一个可能的页面
                this.predictNextPage(userBehavior);
            }
        });
    }
    
    /**
     * 预测下一个页面
     */
    predictNextPage(behavior) {
        // 简单的预测算法：基于最近的点击模式
        const recentClicks = behavior.clickPatterns.slice(-5);
        const patterns = this.analyzePatterns(recentClicks);
        
        if (patterns.length > 0) {
            const nextPage = patterns[0];
            this.preload(nextPage, 'predictive');
        }
    }
    
    /**
     * 分析用户行为模式
     */
    analyzePatterns(clicks) {
        // 这里可以实现更复杂的机器学习算法
        // 目前使用简单的频率分析
        const frequency = {};
        
        clicks.forEach(click => {
            frequency[click.href] = (frequency[click.href] || 0) + 1;
        });
        
        return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]);
    }
    
    /**
     * 工具方法
     */
    getCacheKey(resource) {
        return typeof resource === 'string' ? resource : JSON.stringify(resource);
    }
    
    estimateSize(data) {
        if (typeof data === 'string') {
            return data.length * 2; // Unicode 字符
        } else if (data && data.size) {
            return data.size;
        } else {
            return JSON.stringify(data).length * 2;
        }
    }
    
    getMemoryUsage() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.size || 0;
        }
        return totalSize;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            memoryUsage: this.getMemoryUsage(),
            queueLength: this.preloadQueue.length,
            loadingCount: this.loadingPromises.size,
            hitRate: this.calculateHitRate()
        };
    }
    
    calculateHitRate() {
        // 这里需要实现命中率计算逻辑
        return 0;
    }
    
    /**
     * 清理缓存
     */
    clearCache() {
        this.cache.clear();
        this.preloadQueue.length = 0;
        this.loadingPromises.clear();
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        this.clearCache();
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
    }
}

// 创建全局实例
window.preloadCache = new PreloadCache();

// 导出类
export default PreloadCache;
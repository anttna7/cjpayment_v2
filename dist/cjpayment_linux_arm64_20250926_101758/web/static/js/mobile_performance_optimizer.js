/**
 * 移动端性能优化器
 * 包含资源预加载、图片压缩、内存管理、电池优化等功能
 */

class MobilePerformanceOptimizer {
    constructor() {
        this.config = {
            // 资源预加载配置
            preload: {
                enabled: true,
                criticalResources: [
                    '/static/css/mobile_recharge_enhanced.css',
                    '/static/js/mobile_recharge_enhanced.js'
                ],
                prefetchResources: [
                    '/static/js/mobile_touch_gestures.js',
                    '/static/js/mobile_camera_enhanced.js'
                ]
            },
            
            // 图片优化配置
            images: {
                lazyLoading: true,
                webpSupport: this.supportsWebP(),
                compression: {
                    quality: 0.8,
                    maxWidth: 1920,
                    maxHeight: 1080
                }
            },
            
            // 内存管理配置
            memory: {
                cleanupInterval: 5 * 60 * 1000, // 5分钟
                maxCacheSize: 50 * 1024 * 1024, // 50MB
                gcThreshold: 0.8 // 80%内存使用率时触发清理
            },
            
            // 网络优化配置
            network: {
                enableCompression: true,
                enableCaching: true,
                requestCoalescing: true,
                adaptiveLoading: true
            }
        };
        
        this.metrics = {
            loadTime: 0,
            memoryUsage: 0,
            networkRequests: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        this.observers = new Map();
        this.scheduledTasks = new Map();
        
        this.init();
    }
    
    /**
     * 初始化性能优化器
     */
    init() {
        // 等待DOM就绪
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeOptimizations());
        } else {
            this.initializeOptimizations();
        }
    }
    
    /**
     * 初始化所有优化功能
     */
    initializeOptimizations() {
        // 性能监控
        this.setupPerformanceMonitoring();
        
        // 资源优化
        this.setupResourceOptimization();
        
        // 图片优化
        this.setupImageOptimization();
        
        // 内存管理
        this.setupMemoryManagement();
        
        // 网络优化
        this.setupNetworkOptimization();
        
        // 电池优化
        this.setupBatteryOptimization();
        
        // 渲染优化
        this.setupRenderOptimization();
        
        console.log('Mobile Performance Optimizer initialized');
    }
    
    /**
     * 性能监控设置
     */
    setupPerformanceMonitoring() {
        // Performance Observer
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.handlePerformanceEntry(entry);
                }
            });
            
            observer.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] });
            this.observers.set('performance', observer);
        }
        
        // 页面加载完成时间
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now();
            this.reportMetrics('page-load', { loadTime: this.metrics.loadTime });
        });
        
        // 页面可见性变化监控
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseOptimizations();
            } else {
                this.resumeOptimizations();
            }
        });
    }
    
    /**
     * 处理性能条目
     */
    handlePerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.handleNavigationTiming(entry);
                break;
            case 'resource':
                this.handleResourceTiming(entry);
                break;
            case 'paint':
                this.handlePaintTiming(entry);
                break;
            case 'measure':
                this.handleUserTiming(entry);
                break;
        }
    }
    
    /**
     * 导航时间处理
     */
    handleNavigationTiming(entry) {
        const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ttfb: entry.responseStart - entry.requestStart,
            domParse: entry.domContentLoadedEventStart - entry.responseEnd,
            resourceLoad: entry.loadEventStart - entry.domContentLoadedEventStart
        };
        
        this.reportMetrics('navigation-timing', timing);
    }
    
    /**
     * 资源时间处理
     */
    handleResourceTiming(entry) {
        this.metrics.networkRequests++;
        
        // 检查缓存命中
        if (entry.transferSize === 0 && entry.encodedBodySize > 0) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
        }
        
        // 慢资源警告
        if (entry.duration > 1000) {
            console.warn('Slow resource detected:', entry.name, entry.duration + 'ms');
        }
    }
    
    /**
     * 绘制时间处理
     */
    handlePaintTiming(entry) {\n        this.reportMetrics('paint-timing', {\n            name: entry.name,\n            startTime: entry.startTime\n        });\n    }\n    \n    /**\n     * 用户时间处理\n     */\n    handleUserTiming(entry) {\n        this.reportMetrics('user-timing', {\n            name: entry.name,\n            duration: entry.duration\n        });\n    }\n    \n    /**\n     * 资源优化设置\n     */\n    setupResourceOptimization() {\n        // 预加载关键资源\n        this.preloadCriticalResources();\n        \n        // 预获取次要资源\n        this.prefetchResources();\n        \n        // 延迟加载非关键资源\n        this.deferNonCriticalResources();\n        \n        // 资源合并和压缩\n        this.optimizeResourceDelivery();\n    }\n    \n    /**\n     * 预加载关键资源\n     */\n    preloadCriticalResources() {\n        if (!this.config.preload.enabled) return;\n        \n        this.config.preload.criticalResources.forEach(resource => {\n            const link = document.createElement('link');\n            link.rel = 'preload';\n            link.href = resource;\n            \n            if (resource.endsWith('.css')) {\n                link.as = 'style';\n            } else if (resource.endsWith('.js')) {\n                link.as = 'script';\n            } else if (resource.match(/\\.(jpg|jpeg|png|webp|avif)$/)) {\n                link.as = 'image';\n            }\n            \n            document.head.appendChild(link);\n        });\n    }\n    \n    /**\n     * 预获取资源\n     */\n    prefetchResources() {\n        // 使用requestIdleCallback在空闲时预获取\n        if ('requestIdleCallback' in window) {\n            requestIdleCallback(() => {\n                this.config.preload.prefetchResources.forEach(resource => {\n                    const link = document.createElement('link');\n                    link.rel = 'prefetch';\n                    link.href = resource;\n                    document.head.appendChild(link);\n                });\n            });\n        }\n    }\n    \n    /**\n     * 延迟加载非关键资源\n     */\n    deferNonCriticalResources() {\n        // 延迟加载非关键脚本\n        const scripts = document.querySelectorAll('script[data-defer]');\n        scripts.forEach(script => {\n            if ('requestIdleCallback' in window) {\n                requestIdleCallback(() => {\n                    this.loadScript(script.src);\n                });\n            } else {\n                setTimeout(() => this.loadScript(script.src), 100);\n            }\n        });\n    }\n    \n    /**\n     * 加载脚本\n     */\n    loadScript(src) {\n        return new Promise((resolve, reject) => {\n            const script = document.createElement('script');\n            script.src = src;\n            script.onload = resolve;\n            script.onerror = reject;\n            document.head.appendChild(script);\n        });\n    }\n    \n    /**\n     * 优化资源交付\n     */\n    optimizeResourceDelivery() {\n        // HTTP/2 Server Push提示\n        if (this.supportsHTTP2()) {\n            this.addServerPushHints();\n        }\n        \n        // 资源提示\n        this.addResourceHints();\n    }\n    \n    /**\n     * 添加服务器推送提示\n     */\n    addServerPushHints() {\n        // 通过meta标签提示服务器推送\n        const pushResources = [\n            { href: '/static/css/mobile_recharge_enhanced.css', as: 'style' },\n            { href: '/static/js/mobile_recharge_enhanced.js', as: 'script' }\n        ];\n        \n        pushResources.forEach(resource => {\n            const meta = document.createElement('meta');\n            meta.httpEquiv = 'Link';\n            meta.content = `<${resource.href}>; rel=preload; as=${resource.as}`;\n            document.head.appendChild(meta);\n        });\n    }\n    \n    /**\n     * 添加资源提示\n     */\n    addResourceHints() {\n        // DNS预解析\n        const domains = ['cdn.example.com', 'api.example.com'];\n        domains.forEach(domain => {\n            const link = document.createElement('link');\n            link.rel = 'dns-prefetch';\n            link.href = `//${domain}`;\n            document.head.appendChild(link);\n        });\n        \n        // 预连接\n        const preconnectDomains = ['https://fonts.googleapis.com'];\n        preconnectDomains.forEach(domain => {\n            const link = document.createElement('link');\n            link.rel = 'preconnect';\n            link.href = domain;\n            link.crossOrigin = 'anonymous';\n            document.head.appendChild(link);\n        });\n    }\n    \n    /**\n     * 图片优化设置\n     */\n    setupImageOptimization() {\n        // 懒加载\n        if (this.config.images.lazyLoading) {\n            this.setupLazyLoading();\n        }\n        \n        // 响应式图片\n        this.setupResponsiveImages();\n        \n        // 现代图片格式支持\n        this.setupModernImageFormats();\n        \n        // 图片压缩\n        this.setupImageCompression();\n    }\n    \n    /**\n     * 懒加载设置\n     */\n    setupLazyLoading() {\n        if ('IntersectionObserver' in window) {\n            const imageObserver = new IntersectionObserver((entries, observer) => {\n                entries.forEach(entry => {\n                    if (entry.isIntersecting) {\n                        const img = entry.target;\n                        this.loadImage(img);\n                        observer.unobserve(img);\n                    }\n                });\n            }, {\n                rootMargin: '50px 0px',\n                threshold: 0.01\n            });\n            \n            // 观察所有懒加载图片\n            document.querySelectorAll('img[data-src]').forEach(img => {\n                imageObserver.observe(img);\n            });\n            \n            this.observers.set('image', imageObserver);\n        }\n    }\n    \n    /**\n     * 加载图片\n     */\n    loadImage(img) {\n        return new Promise((resolve, reject) => {\n            const src = img.dataset.src;\n            if (!src) return resolve();\n            \n            const newImg = new Image();\n            newImg.onload = () => {\n                img.src = src;\n                img.classList.add('loaded');\n                resolve();\n            };\n            newImg.onerror = reject;\n            newImg.src = src;\n        });\n    }\n    \n    /**\n     * 响应式图片设置\n     */\n    setupResponsiveImages() {\n        // 自动生成srcset\n        document.querySelectorAll('img[data-responsive]').forEach(img => {\n            const baseSrc = img.dataset.src || img.src;\n            if (!baseSrc) return;\n            \n            const sizes = [480, 768, 1200, 1920];\n            const srcset = sizes.map(size => {\n                const url = this.generateResponsiveUrl(baseSrc, size);\n                return `${url} ${size}w`;\n            }).join(', ');\n            \n            img.srcset = srcset;\n            img.sizes = '(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw';\n        });\n    }\n    \n    /**\n     * 生成响应式图片URL\n     */\n    generateResponsiveUrl(src, width) {\n        // 如果有图片处理服务，在此处理\n        return src.replace(/\\.(jpg|jpeg|png)$/, `_${width}w.$1`);\n    }\n    \n    /**\n     * 现代图片格式设置\n     */\n    setupModernImageFormats() {\n        if (this.config.images.webpSupport) {\n            // 替换为WebP格式\n            document.querySelectorAll('img[data-webp]').forEach(img => {\n                const webpSrc = img.dataset.webp;\n                if (webpSrc) {\n                    img.src = webpSrc;\n                }\n            });\n        }\n    }\n    \n    /**\n     * 检查WebP支持\n     */\n    supportsWebP() {\n        const canvas = document.createElement('canvas');\n        canvas.width = canvas.height = 1;\n        return canvas.toDataURL('image/webp').indexOf('webp') > -1;\n    }\n    \n    /**\n     * 图片压缩设置\n     */\n    setupImageCompression() {\n        // 监听文件输入变化\n        document.addEventListener('change', (e) => {\n            if (e.target.type === 'file' && e.target.accept?.includes('image')) {\n                this.handleImageUpload(e.target);\n            }\n        });\n    }\n    \n    /**\n     * 处理图片上传\n     */\n    async handleImageUpload(input) {\n        const files = Array.from(input.files);\n        const compressedFiles = await Promise.all(\n            files.map(file => this.compressImage(file))\n        );\n        \n        // 替换文件列表\n        const dt = new DataTransfer();\n        compressedFiles.forEach(file => dt.items.add(file));\n        input.files = dt.files;\n    }\n    \n    /**\n     * 压缩图片\n     */\n    async compressImage(file) {\n        if (!file.type.startsWith('image/')) return file;\n        \n        return new Promise((resolve) => {\n            const canvas = document.createElement('canvas');\n            const ctx = canvas.getContext('2d');\n            const img = new Image();\n            \n            img.onload = () => {\n                // 计算新尺寸\n                const { width, height } = this.calculateOptimalSize(\n                    img.width,\n                    img.height,\n                    this.config.images.compression.maxWidth,\n                    this.config.images.compression.maxHeight\n                );\n                \n                canvas.width = width;\n                canvas.height = height;\n                \n                // 绘制并压缩\n                ctx.drawImage(img, 0, 0, width, height);\n                \n                canvas.toBlob(\n                    (blob) => {\n                        const compressedFile = new File(\n                            [blob],\n                            file.name,\n                            { type: 'image/jpeg' }\n                        );\n                        resolve(compressedFile);\n                    },\n                    'image/jpeg',\n                    this.config.images.compression.quality\n                );\n            };\n            \n            img.src = URL.createObjectURL(file);\n        });\n    }\n    \n    /**\n     * 计算最优尺寸\n     */\n    calculateOptimalSize(width, height, maxWidth, maxHeight) {\n        if (width <= maxWidth && height <= maxHeight) {\n            return { width, height };\n        }\n        \n        const ratio = Math.min(maxWidth / width, maxHeight / height);\n        return {\n            width: Math.round(width * ratio),\n            height: Math.round(height * ratio)\n        };\n    }\n    \n    /**\n     * 内存管理设置\n     */\n    setupMemoryManagement() {\n        // 定期内存清理\n        setInterval(() => {\n            this.performMemoryCleanup();\n        }, this.config.memory.cleanupInterval);\n        \n        // 内存压力监控\n        this.monitorMemoryPressure();\n        \n        // 页面卸载时清理\n        window.addEventListener('beforeunload', () => {\n            this.cleanup();\n        });\n    }\n    \n    /**\n     * 执行内存清理\n     */\n    performMemoryCleanup() {\n        // 清理未使用的缓存\n        this.clearUnusedCache();\n        \n        // 清理DOM事件监听器\n        this.cleanupEventListeners();\n        \n        // 清理定时器\n        this.cleanupTimers();\n        \n        // 强制垃圾回收（如果支持）\n        if (window.gc && typeof window.gc === 'function') {\n            window.gc();\n        }\n        \n        console.log('Memory cleanup performed');\n    }\n    \n    /**\n     * 清理未使用的缓存\n     */\n    async clearUnusedCache() {\n        if ('caches' in window) {\n            const cacheNames = await caches.keys();\n            const currentCacheSize = await this.getCacheSize();\n            \n            if (currentCacheSize > this.config.memory.maxCacheSize) {\n                // 删除最旧的缓存\n                const oldestCache = cacheNames[0];\n                if (oldestCache) {\n                    await caches.delete(oldestCache);\n                    console.log('Deleted cache:', oldestCache);\n                }\n            }\n        }\n    }\n    \n    /**\n     * 获取缓存大小\n     */\n    async getCacheSize() {\n        if (!('caches' in window)) return 0;\n        \n        const cacheNames = await caches.keys();\n        let totalSize = 0;\n        \n        for (const cacheName of cacheNames) {\n            const cache = await caches.open(cacheName);\n            const requests = await cache.keys();\n            \n            for (const request of requests) {\n                const response = await cache.match(request);\n                if (response) {\n                    const clone = response.clone();\n                    const blob = await clone.blob();\n                    totalSize += blob.size;\n                }\n            }\n        }\n        \n        return totalSize;\n    }\n    \n    /**\n     * 清理事件监听器\n     */\n    cleanupEventListeners() {\n        // 清理过期的事件监听器\n        const elements = document.querySelectorAll('[data-cleanup-listeners]');\n        elements.forEach(element => {\n            const listeners = element._eventListeners || [];\n            listeners.forEach(({ type, handler }) => {\n                element.removeEventListener(type, handler);\n            });\n            element._eventListeners = [];\n        });\n    }\n    \n    /**\n     * 清理定时器\n     */\n    cleanupTimers() {\n        // 清理已完成的定时任务\n        for (const [key, task] of this.scheduledTasks) {\n            if (task.completed || Date.now() > task.expiry) {\n                if (task.timeoutId) {\n                    clearTimeout(task.timeoutId);\n                }\n                if (task.intervalId) {\n                    clearInterval(task.intervalId);\n                }\n                this.scheduledTasks.delete(key);\n            }\n        }\n    }\n    \n    /**\n     * 监控内存压力\n     */\n    monitorMemoryPressure() {\n        if ('memory' in performance) {\n            setInterval(() => {\n                const memInfo = performance.memory;\n                const usage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;\n                \n                this.metrics.memoryUsage = usage;\n                \n                if (usage > this.config.memory.gcThreshold) {\n                    console.warn('High memory usage detected:', (usage * 100).toFixed(1) + '%');\n                    this.performMemoryCleanup();\n                }\n            }, 30000); // 每30秒检查一次\n        }\n    }\n    \n    /**\n     * 网络优化设置\n     */\n    setupNetworkOptimization() {\n        // 请求合并\n        if (this.config.network.requestCoalescing) {\n            this.setupRequestCoalescing();\n        }\n        \n        // 自适应加载\n        if (this.config.network.adaptiveLoading) {\n            this.setupAdaptiveLoading();\n        }\n        \n        // 网络状态监控\n        this.monitorNetworkStatus();\n    }\n    \n    /**\n     * 设置请求合并\n     */\n    setupRequestCoalescing() {\n        const pendingRequests = new Map();\n        const originalFetch = window.fetch;\n        \n        window.fetch = function(resource, init) {\n            const key = `${resource}_${JSON.stringify(init || {})}`;\n            \n            if (pendingRequests.has(key)) {\n                return pendingRequests.get(key);\n            }\n            \n            const promise = originalFetch(resource, init);\n            pendingRequests.set(key, promise);\n            \n            promise.finally(() => {\n                pendingRequests.delete(key);\n            });\n            \n            return promise;\n        };\n    }\n    \n    /**\n     * 设置自适应加载\n     */\n    setupAdaptiveLoading() {\n        if ('connection' in navigator) {\n            const connection = navigator.connection;\n            \n            const adaptContent = () => {\n                const isSlowConnection = \n                    connection.effectiveType === 'slow-2g' ||\n                    connection.effectiveType === '2g' ||\n                    connection.saveData;\n                \n                if (isSlowConnection) {\n                    // 降低资源质量\n                    document.body.classList.add('low-bandwidth');\n                    \n                    // 禁用非关键动画\n                    document.body.style.setProperty('--animation-duration', '0ms');\n                    \n                    // 延迟非关键资源加载\n                    this.deferNonCriticalContent();\n                } else {\n                    document.body.classList.remove('low-bandwidth');\n                    document.body.style.removeProperty('--animation-duration');\n                }\n            };\n            \n            connection.addEventListener('change', adaptContent);\n            adaptContent();\n        }\n    }\n    \n    /**\n     * 延迟非关键内容\n     */\n    deferNonCriticalContent() {\n        // 延迟加载非关键图片\n        document.querySelectorAll('img[data-non-critical]').forEach(img => {\n            img.style.display = 'none';\n        });\n        \n        // 禁用非关键功能\n        document.querySelectorAll('[data-non-critical-feature]').forEach(element => {\n            element.style.display = 'none';\n        });\n    }\n    \n    /**\n     * 监控网络状态\n     */\n    monitorNetworkStatus() {\n        window.addEventListener('online', () => {\n            this.handleNetworkChange(true);\n        });\n        \n        window.addEventListener('offline', () => {\n            this.handleNetworkChange(false);\n        });\n    }\n    \n    /**\n     * 处理网络状态变化\n     */\n    handleNetworkChange(isOnline) {\n        if (isOnline) {\n            // 网络恢复，恢复正常加载\n            this.resumeOptimizations();\n        } else {\n            // 网络断开，暂停非关键操作\n            this.pauseOptimizations();\n        }\n    }\n    \n    /**\n     * 电池优化设置\n     */\n    setupBatteryOptimization() {\n        if ('getBattery' in navigator) {\n            navigator.getBattery().then(battery => {\n                this.monitorBatteryStatus(battery);\n            });\n        }\n    }\n    \n    /**\n     * 监控电池状态\n     */\n    monitorBatteryStatus(battery) {\n        const checkBattery = () => {\n            if (battery.level < 0.2 || !battery.charging) {\n                // 低电量模式\n                this.enableLowPowerMode();\n            } else {\n                this.disableLowPowerMode();\n            }\n        };\n        \n        battery.addEventListener('levelchange', checkBattery);\n        battery.addEventListener('chargingchange', checkBattery);\n        checkBattery();\n    }\n    \n    /**\n     * 启用低电量模式\n     */\n    enableLowPowerMode() {\n        document.body.classList.add('low-power-mode');\n        \n        // 减少动画\n        document.documentElement.style.setProperty('--animation-duration', '0ms');\n        \n        // 降低刷新频率\n        this.reduceFps();\n        \n        // 暂停非关键后台任务\n        this.pauseBackgroundTasks();\n        \n        console.log('Low power mode enabled');\n    }\n    \n    /**\n     * 禁用低电量模式\n     */\n    disableLowPowerMode() {\n        document.body.classList.remove('low-power-mode');\n        document.documentElement.style.removeProperty('--animation-duration');\n        this.resumeBackgroundTasks();\n        console.log('Low power mode disabled');\n    }\n    \n    /**\n     * 降低帧率\n     */\n    reduceFps() {\n        // 使用setTimeout代替requestAnimationFrame\n        const originalRAF = window.requestAnimationFrame;\n        window.requestAnimationFrame = function(callback) {\n            return setTimeout(callback, 33); // ~30fps\n        };\n    }\n    \n    /**\n     * 渲染优化设置\n     */\n    setupRenderOptimization() {\n        // 虚拟化长列表\n        this.setupVirtualization();\n        \n        // 批量DOM操作\n        this.setupBatchedUpdates();\n        \n        // 避免布局抖动\n        this.preventLayoutThrashing();\n    }\n    \n    /**\n     * 设置虚拟化\n     */\n    setupVirtualization() {\n        const longLists = document.querySelectorAll('[data-virtualize]');\n        longLists.forEach(list => {\n            this.virtualizeLongList(list);\n        });\n    }\n    \n    /**\n     * 虚拟化长列表\n     */\n    virtualizeLongList(container) {\n        const items = Array.from(container.children);\n        if (items.length < 100) return; // 少于100项不需要虚拟化\n        \n        const itemHeight = items[0].offsetHeight;\n        const containerHeight = container.offsetHeight;\n        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;\n        \n        let scrollTop = 0;\n        let startIndex = 0;\n        \n        const updateVisibleItems = () => {\n            const newStartIndex = Math.floor(scrollTop / itemHeight);\n            const endIndex = Math.min(newStartIndex + visibleCount, items.length);\n            \n            if (newStartIndex !== startIndex) {\n                startIndex = newStartIndex;\n                \n                // 隐藏所有项目\n                items.forEach((item, index) => {\n                    if (index < startIndex || index >= endIndex) {\n                        item.style.display = 'none';\n                    } else {\n                        item.style.display = '';\n                        item.style.transform = `translateY(${index * itemHeight}px)`;\n                    }\n                });\n                \n                // 设置容器高度\n                container.style.height = `${items.length * itemHeight}px`;\n            }\n        };\n        \n        container.addEventListener('scroll', () => {\n            scrollTop = container.scrollTop;\n            requestAnimationFrame(updateVisibleItems);\n        });\n        \n        updateVisibleItems();\n    }\n    \n    /**\n     * 设置批量更新\n     */\n    setupBatchedUpdates() {\n        let updateQueue = [];\n        let isUpdating = false;\n        \n        window.batchUpdate = function(updateFn) {\n            updateQueue.push(updateFn);\n            \n            if (!isUpdating) {\n                isUpdating = true;\n                requestAnimationFrame(() => {\n                    updateQueue.forEach(fn => fn());\n                    updateQueue = [];\n                    isUpdating = false;\n                });\n            }\n        };\n    }\n    \n    /**\n     * 防止布局抖动\n     */\n    preventLayoutThrashing() {\n        // 缓存DOM查询结果\n        this.cacheDOMQueries();\n        \n        // 避免强制同步布局\n        this.avoidForcedReflow();\n    }\n    \n    /**\n     * 缓存DOM查询\n     */\n    cacheDOMQueries() {\n        const cache = new Map();\n        const originalQuerySelector = document.querySelector;\n        const originalQuerySelectorAll = document.querySelectorAll;\n        \n        document.querySelector = function(selector) {\n            if (cache.has(selector)) {\n                return cache.get(selector);\n            }\n            const result = originalQuerySelector.call(document, selector);\n            cache.set(selector, result);\n            return result;\n        };\n        \n        // 定期清理缓存\n        setInterval(() => cache.clear(), 60000);\n    }\n    \n    /**\n     * 避免强制回流\n     */\n    avoidForcedReflow() {\n        // 监控可能导致回流的属性访问\n        const reflowProperties = [\n            'offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight',\n            'scrollTop', 'scrollLeft', 'scrollWidth', 'scrollHeight',\n            'clientTop', 'clientLeft', 'clientWidth', 'clientHeight'\n        ];\n        \n        reflowProperties.forEach(prop => {\n            Object.defineProperty(HTMLElement.prototype, `_${prop}`, {\n                get: function() {\n                    console.warn(`Potential reflow trigger: ${prop}`);\n                    return this[prop];\n                }\n            });\n        });\n    }\n    \n    /**\n     * 暂停优化\n     */\n    pauseOptimizations() {\n        // 暂停定时器\n        this.scheduledTasks.forEach(task => {\n            if (task.intervalId) {\n                clearInterval(task.intervalId);\n                task.paused = true;\n            }\n        });\n        \n        // 暂停观察器\n        this.observers.forEach(observer => {\n            if (observer.disconnect) {\n                observer.disconnect();\n            }\n        });\n    }\n    \n    /**\n     * 恢复优化\n     */\n    resumeOptimizations() {\n        // 恢复定时器\n        this.scheduledTasks.forEach(task => {\n            if (task.paused) {\n                if (task.interval) {\n                    task.intervalId = setInterval(task.callback, task.interval);\n                }\n                task.paused = false;\n            }\n        });\n        \n        // 重新启动观察器\n        this.setupImageOptimization();\n    }\n    \n    /**\n     * 暂停后台任务\n     */\n    pauseBackgroundTasks() {\n        this.backgroundTasksPaused = true;\n    }\n    \n    /**\n     * 恢复后台任务\n     */\n    resumeBackgroundTasks() {\n        this.backgroundTasksPaused = false;\n    }\n    \n    /**\n     * 检查HTTP/2支持\n     */\n    supportsHTTP2() {\n        return window.location.protocol === 'https:' && \n               'serviceWorker' in navigator;\n    }\n    \n    /**\n     * 报告性能指标\n     */\n    reportMetrics(type, data) {\n        // 发送到分析服务\n        if (window.gtag) {\n            window.gtag('event', 'performance_metric', {\n                event_category: 'Performance',\n                event_label: type,\n                value: data.duration || data.loadTime || 0,\n                custom_map: {\n                    metric_type: type,\n                    metric_data: JSON.stringify(data)\n                }\n            });\n        }\n        \n        console.log(`Performance metric [${type}]:`, data);\n    }\n    \n    /**\n     * 清理资源\n     */\n    cleanup() {\n        // 断开所有观察器\n        this.observers.forEach(observer => {\n            if (observer.disconnect) {\n                observer.disconnect();\n            }\n        });\n        \n        // 清理定时器\n        this.scheduledTasks.forEach(task => {\n            if (task.timeoutId) {\n                clearTimeout(task.timeoutId);\n            }\n            if (task.intervalId) {\n                clearInterval(task.intervalId);\n            }\n        });\n        \n        console.log('Performance optimizer cleanup completed');\n    }\n}\n\n// 自动初始化\nif (typeof window !== 'undefined') {\n    window.MobilePerformanceOptimizer = MobilePerformanceOptimizer;\n    \n    // 等待DOM加载完成后初始化\n    document.addEventListener('DOMContentLoaded', () => {\n        if (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {\n            window.mobilePerformanceOptimizer = new MobilePerformanceOptimizer();\n        }\n    });\n}\n\n// 导出类\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = MobilePerformanceOptimizer;\n}"
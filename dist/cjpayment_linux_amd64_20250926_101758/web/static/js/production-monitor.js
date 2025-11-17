/**
 * 生产环境性能监控和错误追踪系统
 * 用于收集用户体验指标和错误信息
 */

class ProductionMonitor {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || '/api/monitoring',
            enablePerformanceTracking: config.enablePerformanceTracking !== false,
            enableErrorTracking: config.enableErrorTracking !== false,
            enableUserTracking: config.enableUserTracking !== false,
            sampleRate: config.sampleRate || 0.1, // 10%采样率
            batchSize: config.batchSize || 10,
            flushInterval: config.flushInterval || 30000, // 30秒
            ...config
        };
        
        this.metrics = [];
        this.errors = [];
        this.userEvents = [];
        this.sessionId = this.generateSessionId();
        this.userId = null;
        
        this.init();
    }
    
    init() {
        if (this.config.enablePerformanceTracking) {
            this.initPerformanceTracking();
        }
        
        if (this.config.enableErrorTracking) {
            this.initErrorTracking();
        }
        
        if (this.config.enableUserTracking) {
            this.initUserTracking();
        }
        
        // 定期发送数据
        setInterval(() => {
            this.flush();
        }, this.config.flushInterval);
        
        // 页面可见性变化时发送剩余数据（替代beforeunload）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush(true);
            }
        });
        
        // 页面可见性变化时发送数据
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush();
            }
        });
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 性能监控
    initPerformanceTracking() {
        // 页面加载性能
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.collectPageLoadMetrics();
            }, 0);
        });
        
        // Core Web Vitals
        this.observeWebVitals();
        
        // 资源加载监控
        this.observeResourceTiming();
        
        // 长任务监控
        this.observeLongTasks();
    }
    
    collectPageLoadMetrics() {
        if (!window.performance || !window.performance.timing) {
            return;
        }
        
        const timing = window.performance.timing;
        const navigation = window.performance.navigation;
        
        const metrics = {
            type: 'page_load',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            
            // 导航类型
            navigationType: navigation.type,
            redirectCount: navigation.redirectCount,
            
            // 时间指标
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            ssl: timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0,
            ttfb: timing.responseStart - timing.navigationStart, // Time to First Byte
            domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
            loadComplete: timing.loadEventEnd - timing.navigationStart,
            
            // 页面大小
            transferSize: this.getTransferSize(),
            resourceCount: performance.getEntriesByType('resource').length
        };
        
        this.addMetric(metrics);
    }
    
    observeWebVitals() {
        // Largest Contentful Paint (LCP)
        this.observePerformanceEntry('largest-contentful-paint', (entry) => {
            this.addMetric({
                type: 'lcp',
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                value: entry.startTime,
                url: window.location.href
            });
        });
        
        // First Input Delay (FID)
        this.observePerformanceEntry('first-input', (entry) => {
            this.addMetric({
                type: 'fid',
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                value: entry.processingStart - entry.startTime,
                url: window.location.href
            });
        });
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        this.observePerformanceEntry('layout-shift', (entry) => {
            if (!entry.hadRecentInput) {
                clsValue += entry.value;
            }
        });
        
        // 定期报告CLS
        setInterval(() => {
            if (clsValue > 0) {
                this.addMetric({
                    type: 'cls',
                    timestamp: Date.now(),
                    sessionId: this.sessionId,
                    userId: this.userId,
                    value: clsValue,
                    url: window.location.href
                });
                clsValue = 0;
            }
        }, 5000);
    }
    
    observePerformanceEntry(type, callback) {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(callback);
                });
                observer.observe({ type, buffered: true });
            } catch (e) {
                console.warn('Performance observer not supported:', type);
            }
        }
    }
    
    observeResourceTiming() {
        this.observePerformanceEntry('resource', (entry) => {
            // 只监控关键资源
            if (entry.name.includes('.css') || entry.name.includes('.js')) {
                this.addMetric({
                    type: 'resource_timing',
                    timestamp: Date.now(),
                    sessionId: this.sessionId,
                    userId: this.userId,
                    name: entry.name,
                    duration: entry.duration,
                    transferSize: entry.transferSize,
                    encodedBodySize: entry.encodedBodySize,
                    decodedBodySize: entry.decodedBodySize
                });
            }
        });
    }
    
    observeLongTasks() {
        this.observePerformanceEntry('longtask', (entry) => {
            this.addMetric({
                type: 'long_task',
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                duration: entry.duration,
                startTime: entry.startTime,
                url: window.location.href
            });
        });
    }
    
    getTransferSize() {
        const entries = performance.getEntriesByType('navigation');
        return entries.length > 0 ? entries[0].transferSize : 0;
    }
    
    // 错误监控
    initErrorTracking() {
        // JavaScript错误
        window.addEventListener('error', (event) => {
            this.addError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error ? event.error.stack : null,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        });
        
        // Promise rejection错误
        window.addEventListener('unhandledrejection', (event) => {
            this.addError({
                type: 'promise_rejection',
                message: event.reason ? event.reason.toString() : 'Unhandled promise rejection',
                stack: event.reason && event.reason.stack ? event.reason.stack : null,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        });
        
        // 资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.addError({
                    type: 'resource_error',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    timestamp: Date.now(),
                    sessionId: this.sessionId,
                    userId: this.userId,
                    url: window.location.href
                });
            }
        }, true);
    }
    
    // 用户行为监控
    initUserTracking() {
        // 页面访问
        this.trackPageView();
        
        // 点击事件
        document.addEventListener('click', (event) => {
            if (Math.random() > this.config.sampleRate) return;
            
            const target = event.target;
            const tagName = target.tagName.toLowerCase();
            
            // 只跟踪重要的交互元素
            if (['button', 'a', 'input'].includes(tagName) || target.classList.contains('btn')) {
                this.addUserEvent({
                    type: 'click',
                    element: tagName,
                    className: target.className,
                    id: target.id,
                    text: target.textContent ? target.textContent.substring(0, 100) : '',
                    timestamp: Date.now(),
                    sessionId: this.sessionId,
                    userId: this.userId,
                    url: window.location.href
                });
            }
        });
        
        // 表单提交
        document.addEventListener('submit', (event) => {
            const form = event.target;
            this.addUserEvent({
                type: 'form_submit',
                formId: form.id,
                formClass: form.className,
                action: form.action,
                method: form.method,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                url: window.location.href
            });
        });
        
        // 页面停留时间
        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const duration = Date.now() - startTime;
            this.addUserEvent({
                type: 'page_duration',
                duration: duration,
                timestamp: Date.now(),
                sessionId: this.sessionId,
                userId: this.userId,
                url: window.location.href
            });
        });
    }
    
    trackPageView() {
        this.addUserEvent({
            type: 'page_view',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            }
        });
    }
    
    // 数据收集方法
    addMetric(metric) {
        this.metrics.push(metric);
        
        if (this.metrics.length >= this.config.batchSize) {
            this.flush();
        }
    }
    
    addError(error) {
        this.errors.push(error);
        
        // 错误立即发送
        this.sendErrors();
    }
    
    addUserEvent(event) {
        this.userEvents.push(event);
        
        if (this.userEvents.length >= this.config.batchSize) {
            this.flush();
        }
    }
    
    // 设置用户ID
    setUserId(userId) {
        this.userId = userId;
    }
    
    // 发送数据
    flush(immediate = false) {
        if (this.metrics.length > 0) {
            this.sendMetrics();
        }
        
        if (this.errors.length > 0) {
            this.sendErrors();
        }
        
        if (this.userEvents.length > 0) {
            this.sendUserEvents();
        }
    }
    
    sendMetrics() {
        if (this.metrics.length === 0) return;
        
        const data = {
            type: 'metrics',
            data: this.metrics.splice(0)
        };
        
        this.sendData(data);
    }
    
    sendErrors() {
        if (this.errors.length === 0) return;
        
        const data = {
            type: 'errors',
            data: this.errors.splice(0)
        };
        
        this.sendData(data, true); // 错误数据优先发送
    }
    
    sendUserEvents() {
        if (this.userEvents.length === 0) return;
        
        const data = {
            type: 'user_events',
            data: this.userEvents.splice(0)
        };
        
        this.sendData(data);
    }
    
    sendData(data, priority = false) {
        const payload = JSON.stringify(data);
        
        // 使用sendBeacon API（如果支持）确保数据发送
        if (navigator.sendBeacon && !priority) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(this.config.apiEndpoint, blob);
        } else {
            // 回退到fetch API
            fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: payload,
                keepalive: true
            }).catch(error => {
                console.warn('Failed to send monitoring data:', error);
            });
        }
    }
    
    // 手动记录自定义指标
    recordCustomMetric(name, value, tags = {}) {
        this.addMetric({
            type: 'custom_metric',
            name: name,
            value: value,
            tags: tags,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href
        });
    }
    
    // 手动记录自定义事件
    recordCustomEvent(name, properties = {}) {
        this.addUserEvent({
            type: 'custom_event',
            name: name,
            properties: properties,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href
        });
    }
    
    // 记录API调用性能
    recordApiCall(url, method, duration, status, error = null) {
        this.addMetric({
            type: 'api_call',
            url: url,
            method: method,
            duration: duration,
            status: status,
            error: error,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            pageUrl: window.location.href
        });
    }
}

// 全局实例
window.ProductionMonitor = ProductionMonitor;

// 自动初始化（如果配置存在）
if (window.MONITORING_CONFIG) {
    window.monitor = new ProductionMonitor(window.MONITORING_CONFIG);
}

export default ProductionMonitor;
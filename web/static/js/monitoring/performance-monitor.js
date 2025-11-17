/**
 * 前端性能监控系统
 * 跟踪页面加载时间、用户体验指标和性能数据
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.config = {
            enableWebVitals: true,
            enableResourceTiming: true,
            enableUserTiming: true,
            enableNavigationTiming: true,
            reportInterval: 30000, // 30秒上报一次
            maxMetrics: 1000
        };
        
        this.init();
    }

    init() {
        this.setupWebVitals();
        this.setupResourceTiming();
        this.setupNavigationTiming();
        this.setupUserTiming();
        this.setupPerformanceObserver();
        this.startReporting();
        
        console.log('Performance Monitor initialized');
    }

    /**
     * 设置Web Vitals监控
     */
    setupWebVitals() {
        if (!this.config.enableWebVitals) return;

        // First Contentful Paint (FCP)
        this.observeWebVital('first-contentful-paint', (entry) => {
            this.recordMetric('FCP', entry.startTime, {
                timestamp: Date.now(),
                url: window.location.href
            });
        });

        // Largest Contentful Paint (LCP)
        this.observeWebVital('largest-contentful-paint', (entry) => {
            this.recordMetric('LCP', entry.startTime, {
                timestamp: Date.now(),
                url: window.location.href,
                element: entry.element?.tagName
            });
        });

        // First Input Delay (FID)
        this.observeWebVital('first-input', (entry) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime, {
                timestamp: Date.now(),
                url: window.location.href,
                eventType: entry.name
            });
        });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        this.observeWebVital('layout-shift', (entry) => {
            if (!entry.hadRecentInput) {
                clsValue += entry.value;
                this.recordMetric('CLS', clsValue, {
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        });
    }

    /**
     * 观察Web Vital指标
     */
    observeWebVital(type, callback) {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    callback(entry);
                }
            });
            observer.observe({ type, buffered: true });
            this.observers.set(type, observer);
        } catch (error) {
            console.warn(`Failed to observe ${type}:`, error);
        }
    }

    /**
     * 设置资源加载时间监控
     */
    setupResourceTiming() {
        if (!this.config.enableResourceTiming) return;

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    this.recordResourceMetric(entry);
                }
            }
        });

        try {
            observer.observe({ type: 'resource', buffered: true });
            this.observers.set('resource', observer);
        } catch (error) {
            console.warn('Resource timing not supported:', error);
        }
    }

    /**
     * 记录资源加载指标
     */
    recordResourceMetric(entry) {
        const resourceType = this.getResourceType(entry.name);
        const loadTime = entry.responseEnd - entry.startTime;
        
        this.recordMetric('ResourceTiming', loadTime, {
            name: entry.name,
            type: resourceType,
            size: entry.transferSize || 0,
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
            timestamp: Date.now()
        });
    }

    /**
     * 获取资源类型
     */
    getResourceType(url) {
        if (url.includes('.css')) return 'css';
        if (url.includes('.js')) return 'javascript';
        if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
        if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'font';
        return 'other';
    }

    /**
     * 设置导航时间监控
     */
    setupNavigationTiming() {
        if (!this.config.enableNavigationTiming) return;

        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    this.recordNavigationMetrics(navigation);
                }
            }, 0);
        });
    }

    /**
     * 记录导航指标
     */
    recordNavigationMetrics(navigation) {
        const metrics = {
            DNS: navigation.domainLookupEnd - navigation.domainLookupStart,
            TCP: navigation.connectEnd - navigation.connectStart,
            SSL: navigation.secureConnectionStart > 0 ? 
                 navigation.connectEnd - navigation.secureConnectionStart : 0,
            TTFB: navigation.responseStart - navigation.requestStart,
            Download: navigation.responseEnd - navigation.responseStart,
            DOMParse: navigation.domContentLoadedEventStart - navigation.responseEnd,
            DOMReady: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            LoadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            TotalTime: navigation.loadEventEnd - navigation.navigationStart
        };

        Object.entries(metrics).forEach(([key, value]) => {
            this.recordMetric(`Navigation_${key}`, value, {
                timestamp: Date.now(),
                url: window.location.href
            });
        });
    }

    /**
     * 设置用户自定义时间监控
     */
    setupUserTiming() {
        if (!this.config.enableUserTiming) return;

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    this.recordMetric('UserTiming', entry.duration, {
                        name: entry.name,
                        timestamp: Date.now()
                    });
                }
            }
        });

        try {
            observer.observe({ type: 'measure', buffered: true });
            this.observers.set('measure', observer);
        } catch (error) {
            console.warn('User timing not supported:', error);
        }
    }

    /**
     * 设置性能观察器
     */
    setupPerformanceObserver() {
        // 监控长任务
        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordMetric('LongTask', entry.duration, {
                        timestamp: Date.now(),
                        startTime: entry.startTime
                    });
                }
            });
            longTaskObserver.observe({ type: 'longtask', buffered: true });
            this.observers.set('longtask', longTaskObserver);
        } catch (error) {
            console.warn('Long task observer not supported:', error);
        }
    }

    /**
     * 记录性能指标
     */
    recordMetric(name, value, metadata = {}) {
        if (this.metrics.size >= this.config.maxMetrics) {
            // 清理旧指标
            const oldestKey = this.metrics.keys().next().value;
            this.metrics.delete(oldestKey);
        }

        const metric = {
            name,
            value,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...metadata
        };

        this.metrics.set(`${name}_${Date.now()}_${Math.random()}`, metric);
    }

    /**
     * 手动标记性能时间点
     */
    mark(name) {
        try {
            performance.mark(name);
        } catch (error) {
            console.warn(`Failed to mark ${name}:`, error);
        }
    }

    /**
     * 手动测量性能区间
     */
    measure(name, startMark, endMark) {
        try {
            performance.measure(name, startMark, endMark);
        } catch (error) {
            console.warn(`Failed to measure ${name}:`, error);
        }
    }

    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
        }
        return null;
    }

    /**
     * 获取连接信息
     */
    getConnectionInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData,
                timestamp: Date.now()
            };
        }
        return null;
    }

    /**
     * 获取所有指标
     */
    getMetrics() {
        return Array.from(this.metrics.values());
    }

    /**
     * 获取指标摘要
     */
    getMetricsSummary() {
        const metrics = this.getMetrics();
        const summary = {};

        metrics.forEach(metric => {
            if (!summary[metric.name]) {
                summary[metric.name] = {
                    count: 0,
                    total: 0,
                    min: Infinity,
                    max: -Infinity,
                    avg: 0
                };
            }

            const stat = summary[metric.name];
            stat.count++;
            stat.total += metric.value;
            stat.min = Math.min(stat.min, metric.value);
            stat.max = Math.max(stat.max, metric.value);
            stat.avg = stat.total / stat.count;
        });

        return summary;
    }

    /**
     * 开始定期上报
     */
    startReporting() {
        setInterval(() => {
            this.reportMetrics();
        }, this.config.reportInterval);

        // 页面卸载时上报
        window.addEventListener('beforeunload', () => {
            this.reportMetrics(true);
        });
    }

    /**
     * 上报指标数据
     */
    reportMetrics(isBeforeUnload = false) {
        const metrics = this.getMetrics();
        const memoryUsage = this.getMemoryUsage();
        const connectionInfo = this.getConnectionInfo();

        const report = {
            metrics,
            memoryUsage,
            connectionInfo,
            summary: this.getMetricsSummary(),
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // 发送到服务器
        this.sendReport(report, isBeforeUnload);

        // 清理已上报的指标
        if (!isBeforeUnload) {
            this.metrics.clear();
        }
    }

    /**
     * 发送报告到服务器
     */
    sendReport(report, isBeforeUnload = false) {
        const endpoint = '/api/monitoring/performance';
        
        try {
            if (isBeforeUnload && navigator.sendBeacon) {
                // 使用 sendBeacon 确保数据在页面卸载时能发送
                navigator.sendBeacon(endpoint, JSON.stringify(report));
            } else {
                // 使用 fetch 发送
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(report),
                    keepalive: isBeforeUnload
                }).catch(error => {
                    console.warn('Failed to send performance report:', error);
                });
            }
        } catch (error) {
            console.warn('Failed to send performance report:', error);
        }
    }

    /**
     * 销毁监控器
     */
    destroy() {
        // 断开所有观察器
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
        this.metrics.clear();
    }
}

// 导出类
window.PerformanceMonitor = PerformanceMonitor;

// 自动初始化
if (typeof window !== 'undefined') {
    window.performanceMonitor = new PerformanceMonitor();
}
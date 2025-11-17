/**
 * 性能监控系统
 * Performance Monitoring System
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.config = {
            sampleRate: 0.1, // 10% 采样率
            bufferSize: 100,
            reportInterval: 30000, // 30秒上报一次
            thresholds: {
                loadTime: 2000,
                renderTime: 16,
                memoryUsage: 50 * 1024 * 1024,
                cacheHitRate: 0.8
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupPerformanceObservers();
        this.setupMemoryMonitoring();
        this.setupNetworkMonitoring();
        this.startReporting();
    }
    
    /**
     * 设置性能观察器
     */
    setupPerformanceObservers() {
        if ('PerformanceObserver' in window) {
            // 监控导航性能
            this.observeNavigation();
            
            // 监控资源加载性能
            this.observeResources();
            
            // 监控长任务
            this.observeLongTasks();
            
            // 监控布局偏移
            this.observeLayoutShift();
            
            // 监控首次内容绘制
            this.observePaint();
        }
    }
    
    /**
     * 监控导航性能
     */
    observeNavigation() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordNavigationMetrics(entry);
                }
            });
            
            observer.observe({ entryTypes: ['navigation'] });
            this.observers.set('navigation', observer);
        } catch (error) {
            console.warn('Navigation performance observer not supported:', error);
        }
    }
    
    /**
     * 监控资源加载性能
     */
    observeResources() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordResourceMetrics(entry);
                }
            });
            
            observer.observe({ entryTypes: ['resource'] });
            this.observers.set('resource', observer);
        } catch (error) {
            console.warn('Resource performance observer not supported:', error);
        }
    }
    
    /**
     * 监控长任务
     */
    observeLongTasks() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordLongTask(entry);
                }
            });
            
            observer.observe({ entryTypes: ['longtask'] });
            this.observers.set('longtask', observer);
        } catch (error) {
            console.warn('Long task observer not supported:', error);
        }
    }
    
    /**
     * 监控布局偏移
     */
    observeLayoutShift() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordLayoutShift(entry);
                }
            });
            
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('layout-shift', observer);
        } catch (error) {
            console.warn('Layout shift observer not supported:', error);
        }
    }
    
    /**
     * 监控绘制性能
     */
    observePaint() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordPaintMetrics(entry);
                }
            });
            
            observer.observe({ entryTypes: ['paint'] });
            this.observers.set('paint', observer);
        } catch (error) {
            console.warn('Paint observer not supported:', error);
        }
    }
    
    /**
     * 记录导航指标
     */
    recordNavigationMetrics(entry) {
        const metrics = {
            type: 'navigation',
            timestamp: Date.now(),
            url: entry.name,
            duration: entry.duration,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            firstByte: entry.responseStart - entry.requestStart,
            domInteractive: entry.domInteractive - entry.navigationStart,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            decodedBodySize: entry.decodedBodySize
        };
        
        this.addMetric('navigation', metrics);
        
        // 检查性能阈值
        if (metrics.duration > this.config.thresholds.loadTime) {
            this.reportSlowNavigation(metrics);
        }
    }
    
    /**
     * 记录资源指标
     */
    recordResourceMetrics(entry) {
        const metrics = {
            type: 'resource',
            timestamp: Date.now(),
            name: entry.name,
            duration: entry.duration,
            initiatorType: entry.initiatorType,
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            decodedBodySize: entry.decodedBodySize,
            startTime: entry.startTime,
            responseEnd: entry.responseEnd
        };
        
        this.addMetric('resource', metrics);
        
        // 分析资源类型性能
        this.analyzeResourcePerformance(metrics);
    }
    
    /**
     * 记录长任务
     */
    recordLongTask(entry) {
        const metrics = {
            type: 'longtask',
            timestamp: Date.now(),
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
            attribution: entry.attribution
        };
        
        this.addMetric('longtask', metrics);
        
        // 长任务警告
        if (entry.duration > 50) {
            console.warn(`Long task detected: ${entry.duration}ms`, entry);
        }
    }
    
    /**
     * 记录布局偏移
     */
    recordLayoutShift(entry) {
        const metrics = {
            type: 'layout-shift',
            timestamp: Date.now(),
            value: entry.value,
            hadRecentInput: entry.hadRecentInput,
            lastInputTime: entry.lastInputTime,
            sources: entry.sources
        };
        
        this.addMetric('layout-shift', metrics);
    }
    
    /**
     * 记录绘制指标
     */
    recordPaintMetrics(entry) {
        const metrics = {
            type: 'paint',
            timestamp: Date.now(),
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration
        };
        
        this.addMetric('paint', metrics);
        
        // 记录关键绘制时间
        if (entry.name === 'first-contentful-paint') {
            this.recordCriticalMetric('fcp', entry.startTime);
        } else if (entry.name === 'largest-contentful-paint') {
            this.recordCriticalMetric('lcp', entry.startTime);
        }
    }
    
    /**
     * 监控组件加载性能
     */
    measureComponentLoad(componentName, loadFn) {
        const startTime = performance.now();
        const startMark = `component-load-start-${componentName}`;
        const endMark = `component-load-end-${componentName}`;
        
        performance.mark(startMark);
        
        return Promise.resolve(loadFn()).then(result => {
            const endTime = performance.now();
            performance.mark(endMark);
            
            const duration = endTime - startTime;
            
            const metrics = {
                type: 'component-load',
                timestamp: Date.now(),
                componentName,
                duration,
                startTime,
                endTime
            };
            
            this.addMetric('component-load', metrics);
            
            // 检查组件加载性能
            if (duration > this.config.thresholds.loadTime) {
                this.reportSlowComponent(componentName, duration);
            }
            
            return result;
        }).catch(error => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.addMetric('component-error', {
                type: 'component-error',
                timestamp: Date.now(),
                componentName,
                duration,
                error: error.message
            });
            
            throw error;
        });
    }
    
    /**
     * 监控渲染性能
     */
    measureRender(renderFn, context = 'unknown') {
        const startTime = performance.now();
        
        return new Promise((resolve) => {
            const result = renderFn();
            
            requestAnimationFrame(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                const metrics = {
                    type: 'render',
                    timestamp: Date.now(),
                    context,
                    duration,
                    startTime,
                    endTime
                };
                
                this.addMetric('render', metrics);
                
                // 检查渲染性能
                if (duration > this.config.thresholds.renderTime) {
                    this.reportSlowRender(context, duration);
                }
                
                resolve(result);
            });
        });
    }
    
    /**
     * 设置内存监控
     */
    setupMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                
                const metrics = {
                    type: 'memory',
                    timestamp: Date.now(),
                    usedJSHeapSize: memInfo.usedJSHeapSize,
                    totalJSHeapSize: memInfo.totalJSHeapSize,
                    jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
                    usageRatio: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit
                };
                
                this.addMetric('memory', metrics);
                
                // 内存使用警告
                if (metrics.usageRatio > 0.8) {
                    this.reportHighMemoryUsage(metrics);
                }
            }, 10000); // 每10秒检查一次
        }
    }
    
    /**
     * 设置网络监控
     */
    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const recordConnection = () => {
                const metrics = {
                    type: 'network',
                    timestamp: Date.now(),
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData
                };
                
                this.addMetric('network', metrics);
            };
            
            // 初始记录
            recordConnection();
            
            // 监听网络变化
            connection.addEventListener('change', recordConnection);
        }
    }
    
    /**
     * 添加指标
     */
    addMetric(category, metric) {
        if (!this.shouldSample()) return;
        
        if (!this.metrics.has(category)) {
            this.metrics.set(category, []);
        }
        
        const categoryMetrics = this.metrics.get(category);
        categoryMetrics.push(metric);
        
        // 限制缓冲区大小
        if (categoryMetrics.length > this.config.bufferSize) {
            categoryMetrics.shift();
        }
    }
    
    /**
     * 记录关键指标
     */
    recordCriticalMetric(name, value) {
        const metric = {
            type: 'critical',
            name,
            value,
            timestamp: Date.now()
        };
        
        this.addMetric('critical', metric);
        
        // 立即检查关键指标
        this.checkCriticalThresholds(name, value);
    }
    
    /**
     * 检查关键指标阈值
     */
    checkCriticalThresholds(name, value) {
        const thresholds = {
            fcp: 1800, // First Contentful Paint
            lcp: 2500, // Largest Contentful Paint
            fid: 100,  // First Input Delay
            cls: 0.1   // Cumulative Layout Shift
        };
        
        if (thresholds[name] && value > thresholds[name]) {
            console.warn(`Poor ${name.toUpperCase()} performance: ${value}ms (threshold: ${thresholds[name]}ms)`);
        }
    }
    
    /**
     * 分析资源性能
     */
    analyzeResourcePerformance(metrics) {
        const { name, duration, transferSize, initiatorType } = metrics;
        
        // 分析不同类型资源的性能
        if (initiatorType === 'script' && duration > 1000) {
            console.warn(`Slow script load: ${name} took ${duration}ms`);
        } else if (initiatorType === 'css' && duration > 500) {
            console.warn(`Slow stylesheet load: ${name} took ${duration}ms`);
        } else if (initiatorType === 'img' && transferSize > 1024 * 1024) {
            console.warn(`Large image: ${name} is ${(transferSize / 1024 / 1024).toFixed(2)}MB`);
        }
    }
    
    /**
     * 报告慢导航
     */
    reportSlowNavigation(metrics) {
        console.warn(`Slow navigation detected:`, {
            url: metrics.url,
            duration: `${metrics.duration}ms`,
            domContentLoaded: `${metrics.domContentLoaded}ms`,
            firstByte: `${metrics.firstByte}ms`
        });
    }
    
    /**
     * 报告慢组件
     */
    reportSlowComponent(componentName, duration) {
        console.warn(`Slow component load: ${componentName} took ${duration.toFixed(2)}ms`);
    }
    
    /**
     * 报告慢渲染
     */
    reportSlowRender(context, duration) {
        console.warn(`Slow render: ${context} took ${duration.toFixed(2)}ms`);
    }
    
    /**
     * 报告高内存使用
     */
    reportHighMemoryUsage(metrics) {
        console.warn(`High memory usage detected:`, {
            used: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            total: `${(metrics.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            limit: `${(metrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
            ratio: `${(metrics.usageRatio * 100).toFixed(1)}%`
        });
    }
    
    /**
     * 采样决策
     */
    shouldSample() {
        return Math.random() < this.config.sampleRate;
    }
    
    /**
     * 开始性能报告
     */
    startReporting() {
        setInterval(() => {
            this.generateReport();
        }, this.config.reportInterval);
    }
    
    /**
     * 生成性能报告
     */
    generateReport() {
        const report = {
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            metrics: {}
        };
        
        // 汇总各类指标
        for (const [category, metrics] of this.metrics) {
            if (metrics.length > 0) {
                report.metrics[category] = this.summarizeMetrics(metrics);
            }
        }
        
        // 计算核心 Web Vitals
        report.webVitals = this.calculateWebVitals();
        
        // 发送报告
        this.sendReport(report);
        
        // 清理旧数据
        this.cleanupMetrics();
    }
    
    /**
     * 汇总指标
     */
    summarizeMetrics(metrics) {
        const durations = metrics.map(m => m.duration).filter(d => d !== undefined);
        
        if (durations.length === 0) {
            return { count: metrics.length };
        }
        
        durations.sort((a, b) => a - b);
        
        return {
            count: metrics.length,
            min: durations[0],
            max: durations[durations.length - 1],
            avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            p50: durations[Math.floor(durations.length * 0.5)],
            p90: durations[Math.floor(durations.length * 0.9)],
            p95: durations[Math.floor(durations.length * 0.95)]
        };
    }
    
    /**
     * 计算 Core Web Vitals
     */
    calculateWebVitals() {
        const vitals = {};
        
        // 从指标中提取 Web Vitals
        const criticalMetrics = this.metrics.get('critical') || [];
        
        for (const metric of criticalMetrics) {
            if (metric.name === 'fcp') {
                vitals.fcp = metric.value;
            } else if (metric.name === 'lcp') {
                vitals.lcp = metric.value;
            }
        }
        
        // 计算 CLS
        const layoutShifts = this.metrics.get('layout-shift') || [];
        if (layoutShifts.length > 0) {
            vitals.cls = layoutShifts.reduce((sum, shift) => sum + shift.value, 0);
        }
        
        return vitals;
    }
    
    /**
     * 发送性能报告
     */
    sendReport(report) {
        // 这里可以发送到性能监控服务
        console.log('Performance Report:', report);
        
        // 使用 sendBeacon 发送数据（如果支持）
        if ('sendBeacon' in navigator) {
            const data = JSON.stringify(report);
            navigator.sendBeacon('/api/performance', data);
        }
    }
    
    /**
     * 清理旧指标
     */
    cleanupMetrics() {
        const cutoffTime = Date.now() - this.config.reportInterval * 2;
        
        for (const [category, metrics] of this.metrics) {
            const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
            this.metrics.set(category, filteredMetrics);
        }
    }
    
    /**
     * 获取性能统计
     */
    getStats() {
        const stats = {};
        
        for (const [category, metrics] of this.metrics) {
            stats[category] = {
                count: metrics.length,
                latest: metrics[metrics.length - 1]
            };
        }
        
        return stats;
    }
    
    /**
     * 销毁监控器
     */
    destroy() {
        // 断开所有观察器
        for (const observer of this.observers.values()) {
            observer.disconnect();
        }
        
        this.observers.clear();
        this.metrics.clear();
    }
}

// 创建全局实例
window.performanceMonitor = new PerformanceMonitor();

// 导出类
export default PerformanceMonitor;
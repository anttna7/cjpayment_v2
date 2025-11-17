/**
 * 前端错误监控系统
 * 捕获和报告JavaScript错误、网络错误和用户操作错误
 */
class ErrorMonitor {
    constructor() {
        this.errors = [];
        this.config = {
            maxErrors: 100,
            reportInterval: 10000, // 10秒上报一次
            enableConsoleCapture: true,
            enableNetworkErrorCapture: true,
            enablePromiseRejectionCapture: true,
            enableResourceErrorCapture: true
        };
        
        this.init();
    }

    init() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledRejectionHandler();
        this.setupResourceErrorHandler();
        this.setupConsoleCapture();
        this.setupNetworkErrorCapture();
        this.startReporting();
        
        console.log('Error Monitor initialized');
    }

    /**
     * 设置全局错误处理器
     */
    setupGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            this.captureError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        });
    }

    /**
     * 设置未处理的Promise拒绝处理器
     */
    setupUnhandledRejectionHandler() {
        if (!this.config.enablePromiseRejectionCapture) return;

        window.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                type: 'promise_rejection',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                reason: event.reason,
                stack: event.reason?.stack,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
        });
    }

    /**
     * 设置资源加载错误处理器
     */
    setupResourceErrorHandler() {
        if (!this.config.enableResourceErrorCapture) return;

        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.captureError({
                    type: 'resource',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    resource: event.target.src || event.target.href,
                    tagName: event.target.tagName,
                    timestamp: Date.now(),
                    url: window.location.href,
                    userAgent: navigator.userAgent
                });
            }
        }, true);
    }

    /**
     * 设置控制台捕获
     */
    setupConsoleCapture() {
        if (!this.config.enableConsoleCapture) return;

        const originalConsole = {
            error: console.error,
            warn: console.warn
        };

        console.error = (...args) => {
            this.captureError({
                type: 'console_error',
                message: args.join(' '),
                args: args,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
            originalConsole.error.apply(console, args);
        };

        console.warn = (...args) => {
            this.captureError({
                type: 'console_warn',
                message: args.join(' '),
                args: args,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
            originalConsole.warn.apply(console, args);
        };
    }

    /**
     * 设置网络错误捕获
     */
    setupNetworkErrorCapture() {
        if (!this.config.enableNetworkErrorCapture) return;

        // 拦截fetch请求
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch.apply(window, args);
                
                if (!response.ok) {
                    this.captureError({
                        type: 'network',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        method: args[1]?.method || 'GET',
                        timestamp: Date.now(),
                        pageUrl: window.location.href,
                        userAgent: navigator.userAgent
                    });
                }
                
                return response;
            } catch (error) {
                this.captureError({
                    type: 'network',
                    message: `Network error: ${error.message}`,
                    url: args[0],
                    error: error.message,
                    method: args[1]?.method || 'GET',
                    timestamp: Date.now(),
                    pageUrl: window.location.href,
                    userAgent: navigator.userAgent
                });
                throw error;
            }
        };

        // 拦截XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._errorMonitor = { method, url };
            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('error', () => {
                if (this._errorMonitor) {
                    window.errorMonitor?.captureError({
                        type: 'network',
                        message: 'XMLHttpRequest error',
                        url: this._errorMonitor.url,
                        method: this._errorMonitor.method,
                        timestamp: Date.now(),
                        pageUrl: window.location.href,
                        userAgent: navigator.userAgent
                    });
                }
            });

            this.addEventListener('load', () => {
                if (this._errorMonitor && this.status >= 400) {
                    window.errorMonitor?.captureError({
                        type: 'network',
                        message: `HTTP ${this.status}: ${this.statusText}`,
                        url: this._errorMonitor.url,
                        status: this.status,
                        statusText: this.statusText,
                        method: this._errorMonitor.method,
                        timestamp: Date.now(),
                        pageUrl: window.location.href,
                        userAgent: navigator.userAgent
                    });
                }
            });

            return originalXHRSend.apply(this, args);
        };
    }

    /**
     * 捕获错误
     */
    captureError(errorInfo) {
        // 限制错误数量
        if (this.errors.length >= this.config.maxErrors) {
            this.errors.shift();
        }

        // 添加额外的上下文信息
        const enhancedError = {
            ...errorInfo,
            id: this.generateErrorId(),
            sessionId: this.getSessionId(),
            userId: this.getUserId(),
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height
            },
            connection: this.getConnectionInfo(),
            memory: this.getMemoryInfo()
        };

        this.errors.push(enhancedError);

        // 立即上报严重错误
        if (this.isCriticalError(errorInfo)) {
            this.reportError(enhancedError);
        }
    }

    /**
     * 生成错误ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取会话ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('monitoring_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('monitoring_session_id', sessionId);
        }
        return sessionId;
    }

    /**
     * 获取用户ID
     */
    getUserId() {
        // 从localStorage或其他地方获取用户ID
        return localStorage.getItem('user_id') || 'anonymous';
    }

    /**
     * 获取连接信息
     */
    getConnectionInfo() {
        if (navigator.connection) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            };
        }
        return null;
    }

    /**
     * 获取内存信息
     */
    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * 判断是否为严重错误
     */
    isCriticalError(errorInfo) {
        const criticalPatterns = [
            /cannot read property/i,
            /undefined is not a function/i,
            /network error/i,
            /script error/i
        ];

        return criticalPatterns.some(pattern => 
            pattern.test(errorInfo.message || '')
        );
    }

    /**
     * 手动报告错误
     */
    reportError(errorInfo) {
        const endpoint = '/api/monitoring/error';
        
        try {
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorInfo)
            }).catch(error => {
                console.warn('Failed to report error:', error);
            });
        } catch (error) {
            console.warn('Failed to report error:', error);
        }
    }

    /**
     * 开始定期上报
     */
    startReporting() {
        setInterval(() => {
            if (this.errors.length > 0) {
                this.reportErrors();
            }
        }, this.config.reportInterval);

        // 页面卸载时上报
        window.addEventListener('beforeunload', () => {
            if (this.errors.length > 0) {
                this.reportErrors(true);
            }
        });
    }

    /**
     * 批量上报错误
     */
    reportErrors(isBeforeUnload = false) {
        const errors = [...this.errors];
        const report = {
            errors,
            timestamp: Date.now(),
            sessionId: this.getSessionId(),
            userId: this.getUserId(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        const endpoint = '/api/monitoring/errors';
        
        try {
            if (isBeforeUnload && navigator.sendBeacon) {
                navigator.sendBeacon(endpoint, JSON.stringify(report));
            } else {
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(report),
                    keepalive: isBeforeUnload
                }).catch(error => {
                    console.warn('Failed to report errors:', error);
                });
            }
        } catch (error) {
            console.warn('Failed to report errors:', error);
        }

        // 清理已上报的错误
        if (!isBeforeUnload) {
            this.errors = [];
        }
    }

    /**
     * 获取错误统计
     */
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            byType: {},
            byUrl: {},
            recent: this.errors.slice(-10)
        };

        this.errors.forEach(error => {
            // 按类型统计
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            
            // 按URL统计
            stats.byUrl[error.url || error.pageUrl] = (stats.byUrl[error.url || error.pageUrl] || 0) + 1;
        });

        return stats;
    }

    /**
     * 清理错误记录
     */
    clearErrors() {
        this.errors = [];
    }

    /**
     * 销毁监控器
     */
    destroy() {
        this.errors = [];
    }
}

// 导出类
window.ErrorMonitor = ErrorMonitor;

// 自动初始化
if (typeof window !== 'undefined') {
    window.errorMonitor = new ErrorMonitor();
}
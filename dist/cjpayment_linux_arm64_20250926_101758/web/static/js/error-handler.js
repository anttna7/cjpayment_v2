/**
 * Enhanced Error Handler for System Management
 * Provides comprehensive error handling, network status detection, and retry mechanisms
 */

window.ErrorHandler = (function() {
    'use strict';

    class ErrorHandler {
        constructor(options = {}) {
            this.options = {
                maxRetries: 3,
                retryDelay: 1000,
                networkCheckInterval: 5000,
                showToast: true,
                logErrors: true,
                ...options
            };
            
            this.isOnline = navigator.onLine;
            this.retryAttempts = new Map();
            this.networkCheckTimer = null;
            
            this.init();
        }

        init() {
            this.setupNetworkListeners();
            this.startNetworkMonitoring();
            this.setupGlobalErrorHandler();
        }

        setupNetworkListeners() {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.showToast('网络连接已恢复', 'success');
                this.retryFailedRequests();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.showToast('网络连接已断开', 'warning');
            });
        }

        startNetworkMonitoring() {
            this.networkCheckTimer = setInterval(() => {
                this.checkNetworkStatus();
            }, this.options.networkCheckInterval);
        }

        async checkNetworkStatus() {
            try {
                const response = await fetch('/api/health', {
                    method: 'HEAD',
                    cache: 'no-cache',
                    timeout: 3000
                });
                
                const wasOnline = this.isOnline;
                this.isOnline = response.ok;
                
                if (!wasOnline && this.isOnline) {
                    this.showToast('服务器连接已恢复', 'success');
                    this.retryFailedRequests();
                }
            } catch (error) {
                if (this.isOnline) {
                    this.isOnline = false;
                    this.showToast('服务器连接中断', 'error');
                }
            }
        }

        setupGlobalErrorHandler() {
            window.addEventListener('error', (event) => {
                this.handleError(event.error, {
                    type: 'javascript',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.handleError(event.reason, {
                    type: 'promise',
                    promise: event.promise
                });
            });
        }

        /**
         * Handle API errors with retry mechanism
         */
        async handleApiError(error, requestConfig = {}) {
            const errorInfo = this.parseApiError(error);
            
            // Log error
            if (this.options.logErrors) {
                console.error('API Error:', errorInfo);
            }

            // Check if retry is possible
            if (this.shouldRetry(errorInfo, requestConfig)) {
                return await this.retryRequest(requestConfig);
            }

            // Show user-friendly error message
            this.showUserError(errorInfo);
            
            return { success: false, error: errorInfo };
        }

        parseApiError(error) {
            const errorInfo = {
                type: 'api',
                message: '请求失败',
                code: 'UNKNOWN_ERROR',
                status: null,
                retryable: false,
                timestamp: new Date().toISOString()
            };

            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorInfo.type = 'network';
                errorInfo.message = '网络连接失败';
                errorInfo.code = 'NETWORK_ERROR';
                errorInfo.retryable = true;
            } else if (error.response) {
                errorInfo.status = error.response.status;
                errorInfo.retryable = this.isRetryableStatus(error.response.status);
                
                switch (error.response.status) {
                    case 400:
                        errorInfo.message = '请求参数错误';
                        errorInfo.code = 'BAD_REQUEST';
                        break;
                    case 401:
                        errorInfo.message = '身份验证失败';
                        errorInfo.code = 'UNAUTHORIZED';
                        break;
                    case 403:
                        errorInfo.message = '权限不足';
                        errorInfo.code = 'FORBIDDEN';
                        break;
                    case 404:
                        errorInfo.message = '请求的资源不存在';
                        errorInfo.code = 'NOT_FOUND';
                        break;
                    case 429:
                        errorInfo.message = '请求过于频繁，请稍后重试';
                        errorInfo.code = 'RATE_LIMITED';
                        errorInfo.retryable = true;
                        break;
                    case 500:
                        errorInfo.message = '服务器内部错误';
                        errorInfo.code = 'INTERNAL_ERROR';
                        errorInfo.retryable = true;
                        break;
                    case 502:
                    case 503:
                    case 504:
                        errorInfo.message = '服务暂时不可用';
                        errorInfo.code = 'SERVICE_UNAVAILABLE';
                        errorInfo.retryable = true;
                        break;
                    default:
                        errorInfo.message = `请求失败 (${error.response.status})`;
                }
            } else if (error.message) {
                errorInfo.message = error.message;
            }

            return errorInfo;
        }

        isRetryableStatus(status) {
            return [408, 429, 500, 502, 503, 504].includes(status);
        }

        shouldRetry(errorInfo, requestConfig) {
            if (!errorInfo.retryable) return false;
            if (!this.isOnline && errorInfo.type === 'network') return false;
            
            const requestKey = this.getRequestKey(requestConfig);
            const attempts = this.retryAttempts.get(requestKey) || 0;
            
            return attempts < this.options.maxRetries;
        }

        async retryRequest(requestConfig) {
            const requestKey = this.getRequestKey(requestConfig);
            const attempts = this.retryAttempts.get(requestKey) || 0;
            
            this.retryAttempts.set(requestKey, attempts + 1);
            
            // Wait before retry
            await this.delay(this.options.retryDelay * Math.pow(2, attempts));
            
            try {
                const response = await this.makeRequest(requestConfig);
                this.retryAttempts.delete(requestKey);
                return { success: true, data: response };
            } catch (error) {
                return await this.handleApiError(error, requestConfig);
            }
        }

        async makeRequest(config) {
            const { url, method = 'GET', headers = {}, body } = config;
            
            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };
            
            if (body) {
                fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
            }
            
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}`);
                error.response = response;
                throw error;
            }
            
            return await response.json();
        }

        getRequestKey(config) {
            return `${config.method || 'GET'}:${config.url}`;
        }

        async retryFailedRequests() {
            // This would retry any failed requests that are retryable
            // Implementation depends on how you want to store failed requests
            console.log('Retrying failed requests...');
        }

        showUserError(errorInfo) {
            if (!this.options.showToast) return;
            
            let message = errorInfo.message;
            let type = 'error';
            
            // Customize message based on error type
            if (errorInfo.type === 'network') {
                message = '网络连接失败，请检查网络设置';
                type = 'warning';
            } else if (errorInfo.code === 'UNAUTHORIZED') {
                message = '登录已过期，请重新登录';
                // Optionally redirect to login
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
            
            this.showToast(message, type);
        }

        handleError(error, context = {}) {
            const errorInfo = {
                message: error.message || '未知错误',
                stack: error.stack,
                context,
                timestamp: new Date().toISOString()
            };
            
            if (this.options.logErrors) {
                console.error('Error handled:', errorInfo);
            }
            
            // Don't show toast for every JavaScript error to avoid spam
            if (context.type === 'javascript' && this.options.showToast) {
                this.showToast('页面出现错误，请刷新重试', 'error');
            }
        }

        showToast(message, type = 'info') {
            // Try to use existing toast component
            if (window.CJComponents && window.CJComponents.Toast) {
                const toast = new window.CJComponents.Toast();
                toast.show(message, type);
            } else if (window.SystemManagement && window.SystemManagement.showToast) {
                window.SystemManagement.showToast(message, type);
            } else {
                // Fallback to simple alert or console
                console.log(`[${type.toUpperCase()}] ${message}`);
                
                // Create simple toast if no component available
                this.createSimpleToast(message, type);
            }
        }

        createSimpleToast(message, type) {
            // Remove existing toast
            const existingToast = document.querySelector('.simple-toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            const toast = document.createElement('div');
            toast.className = `simple-toast toast-${type}`;
            toast.textContent = message;
            
            // Add styles
            Object.assign(toast.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '12px 20px',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px',
                zIndex: '10000',
                maxWidth: '300px',
                wordWrap: 'break-word'
            });
            
            // Set background color based on type
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            toast.style.backgroundColor = colors[type] || colors.info;
            
            document.body.appendChild(toast);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 5000);
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        destroy() {
            if (this.networkCheckTimer) {
                clearInterval(this.networkCheckTimer);
            }
            this.retryAttempts.clear();
        }
    }

    return ErrorHandler;
})();

// Create global instance
window.errorHandler = new window.ErrorHandler();
/**
 * Network Status Monitor
 * Monitors network connectivity and provides reconnection mechanisms
 */

window.NetworkMonitor = (function() {
    'use strict';

    class NetworkMonitor {
        constructor(options = {}) {
            this.options = {
                checkInterval: 30000, // 30 seconds
                healthEndpoint: '/api/health',
                timeout: 5000,
                maxRetries: 3,
                retryDelay: 2000,
                showNotifications: true,
                ...options
            };
            
            this.isOnline = navigator.onLine;
            this.isServerReachable = true;
            this.lastCheck = null;
            this.checkTimer = null;
            this.retryCount = 0;
            this.listeners = new Set();
            
            this.init();
        }

        init() {
            this.setupEventListeners();
            this.startMonitoring();
            this.performInitialCheck();
        }

        setupEventListeners() {
            // Browser online/offline events
            window.addEventListener('online', () => {
                this.handleOnline();
            });

            window.addEventListener('offline', () => {
                this.handleOffline();
            });

            // Page visibility change - check when page becomes visible
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && this.shouldCheckConnection()) {
                    this.checkConnection();
                }
            });

            // Focus event - check when window gains focus
            window.addEventListener('focus', () => {
                if (this.shouldCheckConnection()) {
                    this.checkConnection();
                }
            });
        }

        startMonitoring() {
            this.checkTimer = setInterval(() => {
                this.checkConnection();
            }, this.options.checkInterval);
        }

        async performInitialCheck() {
            await this.checkConnection();
        }

        shouldCheckConnection() {
            if (!this.lastCheck) return true;
            return Date.now() - this.lastCheck > 10000; // At least 10 seconds since last check
        }

        async checkConnection() {
            this.lastCheck = Date.now();
            
            try {
                const isReachable = await this.checkServerHealth();
                this.updateServerStatus(isReachable);
            } catch (error) {
                console.warn('Network check failed:', error);
                this.updateServerStatus(false);
            }
        }

        async checkServerHealth() {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
            
            try {
                const response = await fetch(this.options.healthEndpoint, {
                    method: 'HEAD',
                    cache: 'no-cache',
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                clearTimeout(timeoutId);
                return response.ok;
            } catch (error) {
                clearTimeout(timeoutId);
                
                // If it's an abort error, treat as timeout
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                
                throw error;
            }
        }

        handleOnline() {
            console.log('Browser detected online');
            this.isOnline = true;
            this.checkConnection();
            this.notifyListeners('browser-online');
        }

        handleOffline() {
            console.log('Browser detected offline');
            this.isOnline = false;
            this.updateServerStatus(false);
            this.notifyListeners('browser-offline');
        }

        updateServerStatus(isReachable) {
            const wasReachable = this.isServerReachable;
            this.isServerReachable = isReachable;
            
            if (wasReachable && !isReachable) {
                // Server became unreachable
                this.handleServerDisconnected();
            } else if (!wasReachable && isReachable) {
                // Server became reachable
                this.handleServerReconnected();
            }
        }

        handleServerDisconnected() {
            console.warn('Server connection lost');
            this.retryCount = 0;
            
            if (this.options.showNotifications) {
                this.showConnectionLostNotification();
            }
            
            this.notifyListeners('server-disconnected');
            this.startReconnectionAttempts();
        }

        handleServerReconnected() {
            console.log('Server connection restored');
            this.retryCount = 0;
            
            if (this.options.showNotifications) {
                this.showConnectionRestoredNotification();
            }
            
            this.notifyListeners('server-reconnected');
        }

        async startReconnectionAttempts() {
            if (this.retryCount >= this.options.maxRetries) {
                this.notifyListeners('max-retries-reached');
                return;
            }
            
            this.retryCount++;
            
            if (this.options.showNotifications) {
                this.showReconnectingNotification(this.retryCount);
            }
            
            // Wait before retry
            await this.delay(this.options.retryDelay * this.retryCount);
            
            // Check if we're still disconnected
            if (!this.isServerReachable) {
                await this.checkConnection();
                
                // If still disconnected, try again
                if (!this.isServerReachable) {
                    this.startReconnectionAttempts();
                }
            }
        }

        showConnectionLostNotification() {
            if (window.toastEnhanced) {
                window.toastEnhanced.error('网络连接已断开', {
                    title: '连接中断',
                    duration: 0, // Don't auto-dismiss
                    actions: [
                        { label: '重试连接', action: 'retry' }
                    ],
                    onAction: (action) => {
                        if (action === 'retry') {
                            this.checkConnection();
                        }
                    }
                });
            }
        }

        showReconnectingNotification(attempt) {
            if (window.toastEnhanced) {
                window.toastEnhanced.warning(`正在尝试重新连接... (${attempt}/${this.options.maxRetries})`, {
                    title: '重新连接中',
                    duration: 3000
                });
            }
        }

        showConnectionRestoredNotification() {
            if (window.toastEnhanced) {
                window.toastEnhanced.success('网络连接已恢复', {
                    title: '连接恢复',
                    duration: 3000
                });
            }
        }

        // Public API methods
        isConnected() {
            return this.isOnline && this.isServerReachable;
        }

        getStatus() {
            return {
                isOnline: this.isOnline,
                isServerReachable: this.isServerReachable,
                isConnected: this.isConnected(),
                lastCheck: this.lastCheck,
                retryCount: this.retryCount
            };
        }

        // Event listener management
        addEventListener(callback) {
            this.listeners.add(callback);
        }

        removeEventListener(callback) {
            this.listeners.delete(callback);
        }

        notifyListeners(event, data = {}) {
            this.listeners.forEach(callback => {
                try {
                    callback(event, { ...data, status: this.getStatus() });
                } catch (error) {
                    console.error('Error in network monitor listener:', error);
                }
            });
        }

        // Utility methods
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Manual connection check
        async forceCheck() {
            await this.checkConnection();
            return this.getStatus();
        }

        // Destroy method
        destroy() {
            if (this.checkTimer) {
                clearInterval(this.checkTimer);
                this.checkTimer = null;
            }
            
            this.listeners.clear();
        }
    }

    return NetworkMonitor;
})();

// Create global instance
if (!window.networkMonitor) {
    window.networkMonitor = new window.NetworkMonitor();
    
    // Add to window for easy access
    window.addEventListener('load', () => {
        // Expose status in console for debugging
        window.getNetworkStatus = () => window.networkMonitor.getStatus();
    });
}
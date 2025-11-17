/**
 * PWA Manager - Progressive Web App 功能管理
 * 
 * 提供PWA安装、离线检测、缓存管理、推送通知等功能
 */

class PWAManager {
    constructor(options = {}) {
        this.options = {
            enableNotifications: true,
            enableBackgroundSync: true,
            enableInstallPrompt: true,
            cacheFirst: ['css', 'js', 'images'],
            networkFirst: ['api'],
            ...options
        };

        this.state = {
            isOnline: navigator.onLine,
            isInstalled: false,
            isInstallable: false,
            serviceWorkerReady: false,
            notificationPermission: Notification.permission
        };

        this.deferredPrompt = null;
        this.registration = null;

        this.init();
    }

    /**
     * 初始化PWA管理器
     */
    async init() {
        try {
            // 检查浏览器支持
            if (!this.checkBrowserSupport()) {
                console.warn('PWA Manager: Browser does not support required features');
                return;
            }

            // 注册Service Worker
            await this.registerServiceWorker();

            // 设置事件监听器
            this.setupEventListeners();

            // 检查安装状态
            this.checkInstallationStatus();

            // 初始化通知权限
            await this.initializeNotifications();

            // 设置离线检测
            this.setupOfflineDetection();

            // 设置背景同步
            this.setupBackgroundSync();

            console.log('PWA Manager: Initialized successfully');
        } catch (error) {
            console.error('PWA Manager: Initialization failed', error);
        }
    }

    /**
     * 检查浏览器支持
     */
    checkBrowserSupport() {
        const requiredFeatures = [
            'serviceWorker' in navigator,
            'caches' in window,
            'indexedDB' in window,
            'fetch' in window
        ];

        return requiredFeatures.every(feature => feature);
    }

    /**
     * 注册Service Worker
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker not supported');
        }

        try {
            this.registration = await navigator.serviceWorker.register('/static/js/sw.js', {
                scope: '/'
            });

            console.log('PWA Manager: Service Worker registered', this.registration);

            // 监听更新
            this.registration.addEventListener('updatefound', () => {
                this.handleServiceWorkerUpdate();
            });

            // 等待Service Worker准备就绪
            await navigator.serviceWorker.ready;
            this.state.serviceWorkerReady = true;

            // 设置消息监听器
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });

        } catch (error) {
            console.error('PWA Manager: Service Worker registration failed', error);
            throw error;
        }
    }

    /**
     * 处理Service Worker更新
     */
    handleServiceWorkerUpdate() {
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
            }
        });
    }

    /**
     * 显示更新通知
     */
    showUpdateNotification() {
        const notification = this.createNotificationElement(
            '应用更新可用',
            '发现新版本，点击刷新以获取最新功能',
            [
                {
                    text: '稍后',
                    action: () => this.dismissNotification(notification)
                },
                {
                    text: '立即更新',
                    action: () => this.applyUpdate()
                }
            ]
        );

        document.body.appendChild(notification);
    }

    /**
     * 应用更新
     */
    async applyUpdate() {
        if (this.registration && this.registration.waiting) {
            // 通知Service Worker跳过等待
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // 重新加载页面
            window.location.reload();
        }
    }

    /**
     * 处理Service Worker消息
     */
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'sync-completed':
                this.handleSyncCompleted(data);
                break;
            case 'sync-failed':
                this.handleSyncFailed(data);
                break;
            case 'cache-updated':
                this.handleCacheUpdated(data);
                break;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 安装提示
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
            this.state.isInstallable = true;
            this.showInstallButton();
        });

        // 安装完成
        window.addEventListener('appinstalled', () => {
            console.log('PWA Manager: App installed');
            this.state.isInstalled = true;
            this.hideInstallButton();
            this.deferredPrompt = null;
        });

        // 在线/离线状态
        window.addEventListener('online', () => {
            this.handleOnlineStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleOnlineStatusChange(false);
        });

        // 可见性变化
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    /**
     * 检查安装状态
     */
    checkInstallationStatus() {
        // 检查是否从主屏幕启动
        if (window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true) {
            this.state.isInstalled = true;
        }

        // 检查是否在PWA模式下运行
        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.documentElement.classList.add('pwa-installed');
        }
    }

    /**
     * 显示安装按钮
     */
    showInstallButton() {
        if (!this.options.enableInstallPrompt) return;

        let installButton = document.getElementById('pwaInstallButton');
        
        if (!installButton) {
            installButton = this.createInstallButton();
            document.body.appendChild(installButton);
        }

        installButton.style.display = 'block';
    }

    /**
     * 创建安装按钮
     */
    createInstallButton() {
        const button = document.createElement('button');
        button.id = 'pwaInstallButton';
        button.className = 'pwa-install-button';
        button.innerHTML = `
            <span class="install-icon">📱</span>
            <span class="install-text">安装应用</span>
        `;

        button.addEventListener('click', () => this.promptInstall());

        return button;
    }

    /**
     * 提示安装应用
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.warn('PWA Manager: Install prompt not available');
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('PWA Manager: User accepted install prompt');
            } else {
                console.log('PWA Manager: User dismissed install prompt');
            }
        } catch (error) {
            console.error('PWA Manager: Install prompt failed', error);
        }

        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    /**
     * 隐藏安装按钮
     */
    hideInstallButton() {
        const installButton = document.getElementById('pwaInstallButton');
        if (installButton) {
            installButton.style.display = 'none';
        }
    }

    /**
     * 初始化通知权限
     */
    async initializeNotifications() {
        if (!this.options.enableNotifications || !('Notification' in window)) {
            return;
        }

        if (Notification.permission === 'default') {
            // 不立即请求权限，等用户操作时再请求
            this.showNotificationPermissionPrompt();
        }
    }

    /**
     * 显示通知权限提示
     */
    showNotificationPermissionPrompt() {
        const prompt = this.createNotificationElement(
            '启用通知',
            '允许接收重要的系统通知和提醒',
            [
                {
                    text: '暂不启用',
                    action: () => this.dismissNotification(prompt)
                },
                {
                    text: '启用通知',
                    action: () => this.requestNotificationPermission(prompt)
                }
            ]
        );

        // 延迟显示，避免打扰用户
        setTimeout(() => {
            document.body.appendChild(prompt);
        }, 10000);
    }

    /**
     * 请求通知权限
     */
    async requestNotificationPermission(promptElement) {
        try {
            const permission = await Notification.requestPermission();
            this.state.notificationPermission = permission;

            if (permission === 'granted') {
                await this.setupPushSubscription();
                this.showToast('通知已启用', 'success');
            } else {
                this.showToast('通知已禁用', 'info');
            }
        } catch (error) {
            console.error('PWA Manager: Notification permission request failed', error);
        }

        this.dismissNotification(promptElement);
    }

    /**
     * 设置推送订阅
     */
    async setupPushSubscription() {
        if (!this.registration || !this.registration.pushManager) {
            return;
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlB64ToUint8Array(this.options.vapidPublicKey)
            });

            // 发送订阅信息到服务器
            await this.sendSubscriptionToServer(subscription);
            
            console.log('PWA Manager: Push subscription created', subscription);
        } catch (error) {
            console.error('PWA Manager: Push subscription failed', error);
        }
    }

    /**
     * 将订阅信息发送到服务器
     */
    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('PWA Manager: Failed to send subscription to server', error);
        }
    }

    /**
     * 设置离线检测
     */
    setupOfflineDetection() {
        // 创建离线状态指示器
        this.createOfflineIndicator();

        // 定期检测网络状态
        setInterval(() => {
            this.checkNetworkStatus();
        }, 30000);
    }

    /**
     * 创建离线状态指示器
     */
    createOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
            <span class="offline-icon">📶</span>
            <span class="offline-text">离线模式</span>
        `;

        document.body.appendChild(indicator);
    }

    /**
     * 处理在线状态变化
     */
    handleOnlineStatusChange(isOnline) {
        this.state.isOnline = isOnline;
        
        const indicator = document.getElementById('offlineIndicator');
        if (indicator) {
            if (isOnline) {
                indicator.classList.remove('visible');
                this.showToast('网络连接已恢复', 'success');
                // 触发后台同步
                this.triggerBackgroundSync();
            } else {
                indicator.classList.add('visible');
                this.showToast('网络连接已断开，进入离线模式', 'warning');
            }
        }

        // 通知其他组件
        this.dispatchEvent('networkStatusChanged', { isOnline });
    }

    /**
     * 检测网络状态
     */
    async checkNetworkStatus() {
        try {
            const response = await fetch('/api/health', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const isOnline = response.ok;
            if (isOnline !== this.state.isOnline) {
                this.handleOnlineStatusChange(isOnline);
            }
        } catch (error) {
            if (this.state.isOnline) {
                this.handleOnlineStatusChange(false);
            }
        }
    }

    /**
     * 设置背景同步
     */
    setupBackgroundSync() {
        if (!this.options.enableBackgroundSync || !this.registration) {
            return;
        }

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.state.isOnline) {
                this.triggerBackgroundSync();
            }
        });
    }

    /**
     * 触发后台同步
     */
    async triggerBackgroundSync() {
        if (!this.registration || !this.registration.sync) {
            console.log('PWA Manager: Background sync not supported');
            return;
        }

        const syncTags = [
            'transaction-sync',
            'audit-sync',
            'merchant-sync',
            'account-sync'
        ];

        for (const tag of syncTags) {
            try {
                await this.registration.sync.register(tag);
                console.log(`PWA Manager: Background sync registered for ${tag}`);
            } catch (error) {
                console.error(`PWA Manager: Failed to register sync for ${tag}`, error);
            }
        }
    }

    /**
     * 处理可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面被隐藏
            console.log('PWA Manager: Page hidden');
        } else {
            // 页面变为可见
            console.log('PWA Manager: Page visible');
            if (this.state.isOnline) {
                this.triggerBackgroundSync();
            }
        }
    }

    /**
     * 队列离线操作
     */
    async queueOfflineOperation(operation, data) {
        if (!this.state.serviceWorkerReady) {
            console.warn('PWA Manager: Service Worker not ready');
            return;
        }

        try {
            navigator.serviceWorker.controller.postMessage({
                type: 'QUEUE_SYNC',
                data: {
                    tag: operation,
                    payload: data
                }
            });

            console.log(`PWA Manager: Operation queued for sync: ${operation}`);
        } catch (error) {
            console.error('PWA Manager: Failed to queue operation', error);
        }
    }

    /**
     * 处理同步完成
     */
    handleSyncCompleted(data) {
        console.log('PWA Manager: Sync completed', data);
        this.showToast(`数据同步完成 (${data.count} 条记录)`, 'success');
        
        // 通知其他组件
        this.dispatchEvent('syncCompleted', data);
    }

    /**
     * 处理同步失败
     */
    handleSyncFailed(data) {
        console.error('PWA Manager: Sync failed', data);
        this.showToast('数据同步失败，稍后将重试', 'error');
        
        // 通知其他组件
        this.dispatchEvent('syncFailed', data);
    }

    /**
     * 处理缓存更新
     */
    handleCacheUpdated(data) {
        console.log('PWA Manager: Cache updated', data);
        // 可以显示更新提示或刷新相关内容
    }

    /**
     * 清理缓存
     */
    async clearCache() {
        if (!this.state.serviceWorkerReady) {
            console.warn('PWA Manager: Service Worker not ready');
            return;
        }

        try {
            const response = await this.sendMessageToServiceWorker('CLEAR_CACHE');
            
            if (response.success) {
                this.showToast('缓存已清理', 'success');
            } else {
                this.showToast('缓存清理失败', 'error');
            }
        } catch (error) {
            console.error('PWA Manager: Failed to clear cache', error);
            this.showToast('缓存清理失败', 'error');
        }
    }

    /**
     * 向Service Worker发送消息
     */
    sendMessageToServiceWorker(type, data = {}) {
        return new Promise((resolve, reject) => {
            if (!navigator.serviceWorker.controller) {
                reject(new Error('Service Worker controller not available'));
                return;
            }

            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };

            navigator.serviceWorker.controller.postMessage(
                { type, data },
                [messageChannel.port2]
            );
        });
    }

    /**
     * 创建通知元素
     */
    createNotificationElement(title, message, actions = []) {
        const notification = document.createElement('div');
        notification.className = 'pwa-notification';
        
        notification.innerHTML = `
            <div class="notification-content">
                <h3 class="notification-title">${title}</h3>
                <p class="notification-message">${message}</p>
                <div class="notification-actions">
                    ${actions.map((action, index) => 
                        `<button class="notification-btn" data-action="${index}">${action.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // 绑定事件
        actions.forEach((action, index) => {
            const button = notification.querySelector(`[data-action="${index}"]`);
            button.addEventListener('click', action.action);
        });

        return notification;
    }

    /**
     * 关闭通知
     */
    dismissNotification(notification) {
        if (notification && notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }

    /**
     * 分发自定义事件
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(`pwa:${eventName}`, { detail });
        document.dispatchEvent(event);
    }

    /**
     * URL Base64 转 Uint8Array
     */
    urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * 获取应用信息
     */
    getAppInfo() {
        return {
            isOnline: this.state.isOnline,
            isInstalled: this.state.isInstalled,
            isInstallable: this.state.isInstallable,
            serviceWorkerReady: this.state.serviceWorkerReady,
            notificationPermission: this.state.notificationPermission
        };
    }

    /**
     * 销毁PWA管理器
     */
    destroy() {
        // 清理事件监听器
        window.removeEventListener('beforeinstallprompt', this.handleInstallPrompt);
        window.removeEventListener('appinstalled', this.handleAppInstalled);
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);

        // 清理DOM元素
        const installButton = document.getElementById('pwaInstallButton');
        if (installButton) {
            installButton.remove();
        }

        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            offlineIndicator.remove();
        }

        console.log('PWA Manager: Destroyed');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWAManager;
} else {
    window.PWAManager = PWAManager;
}

// CSS样式
const pwaStyles = `
<style>
.pwa-install-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 15px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;
    z-index: 9998;
    display: none;
    align-items: center;
    gap: 8px;
}

.pwa-install-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.offline-indicator {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: #f59e0b;
    color: white;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    opacity: 0;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.offline-indicator.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.pwa-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    padding: 20px;
    max-width: 350px;
    z-index: 10000;
    border-left: 4px solid #667eea;
}

.notification-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
}

.notification-message {
    margin: 0 0 15px 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.4;
}

.notification-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.notification-btn {
    padding: 8px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.notification-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
}

.notification-btn:last-child {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

.notification-btn:last-child:hover {
    background: #5a67d8;
    border-color: #5a67d8;
}
</style>
`;

// 注入样式
document.head.insertAdjacentHTML('beforeend', pwaStyles);
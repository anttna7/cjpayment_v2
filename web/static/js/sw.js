/**
 * CJPayment Service Worker
 * 
 * 提供PWA功能：离线缓存、后台同步、推送通知
 * 版本：v2.0.0
 */

const CACHE_NAME = 'cjpayment-v2.0.0';
const STATIC_CACHE_NAME = 'cjpayment-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'cjpayment-dynamic-v2.0.0';
const API_CACHE_NAME = 'cjpayment-api-v2.0.0';

// 需要缓存的静态资源
const STATIC_FILES = [
    '/',
    '/static/css/base.css',
    '/static/css/components.css',
    '/static/css/dashboard-enhanced.css',
    '/static/css/auth-enhanced.css',
    '/static/css/merchant-management-enhanced.css',
    '/static/css/account-management-enhanced.css',
    '/static/css/financial-audit-enhanced.css',
    '/static/css/report-enhanced.css',
    '/static/js/utils.js',
    '/static/js/api.js',
    '/static/js/components.js',
    '/static/js/auth-enhanced.js',
    '/static/js/dashboard-enhanced.js',
    '/static/js/merchant-management-enhanced.js',
    '/static/js/account-management-enhanced.js',
    '/static/js/financial-audit-enhanced.js',
    '/static/js/report-enhanced.js',
    '/static/favicon.ico',
    '/static/icons/icon-192.png',
    '/static/icons/icon-512.png'
];

// 离线页面
const OFFLINE_PAGE = '/offline';
const OFFLINE_API_RESPONSE = {
    error: 'OFFLINE_MODE',
    message: '当前处于离线模式，数据可能不是最新的',
    timestamp: new Date().toISOString()
};

// 缓存策略配置
const CACHE_STRATEGIES = {
    // 静态资源使用Cache First策略
    static: {
        strategy: 'cacheFirst',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    },
    // API请求使用Network First策略
    api: {
        strategy: 'networkFirst',
        maxAge: 5 * 60 * 1000, // 5分钟
        timeout: 5000 // 5秒超时
    },
    // 页面使用Stale While Revalidate策略
    pages: {
        strategy: 'staleWhileRevalidate',
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    },
    // 图片使用Cache First策略
    images: {
        strategy: 'cacheFirst',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
    }
};

// 需要后台同步的操作
const SYNC_OPERATIONS = [
    'transaction-sync',
    'audit-sync',
    'merchant-sync',
    'account-sync'
];

/**
 * Service Worker 安装事件
 */
self.addEventListener('install', event => {
    console.log('Service Worker: Installing');
    
    event.waitUntil(
        (async () => {
            try {
                // 预缓存静态资源
                const staticCache = await caches.open(STATIC_CACHE_NAME);
                await staticCache.addAll(STATIC_FILES);
                
                // 预缓存离线页面
                const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);
                await dynamicCache.add(OFFLINE_PAGE);
                
                console.log('Service Worker: Static resources cached');
                
                // 强制激活新的Service Worker
                self.skipWaiting();
            } catch (error) {
                console.error('Service Worker: Install failed', error);
            }
        })()
    );
});

/**
 * Service Worker 激活事件
 */
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating');
    
    event.waitUntil(
        (async () => {
            try {
                // 清理旧版本缓存
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames
                    .filter(name => name.startsWith('cjpayment-') && !isCurrentCache(name))
                    .map(name => caches.delete(name));
                
                await Promise.all(deletePromises);
                console.log('Service Worker: Old caches cleaned');
                
                // 立即控制所有客户端
                self.clients.claim();
            } catch (error) {
                console.error('Service Worker: Activation failed', error);
            }
        })()
    );
});

/**
 * 检查是否为当前版本缓存
 */
function isCurrentCache(cacheName) {
    return cacheName === STATIC_CACHE_NAME || 
           cacheName === DYNAMIC_CACHE_NAME || 
           cacheName === API_CACHE_NAME;
}

/**
 * 拦截网络请求
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 只处理同源请求
    if (url.origin !== location.origin) {
        return;
    }
    
    // 根据请求类型选择缓存策略
    if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isStaticResource(request)) {
        event.respondWith(handleStaticResource(request));
    } else if (isImageRequest(request)) {
        event.respondWith(handleImageRequest(request));
    } else if (isPageRequest(request)) {
        event.respondWith(handlePageRequest(request));
    }
});

/**
 * 判断是否为API请求
 */
function isAPIRequest(request) {
    return request.url.includes('/api/') || 
           request.url.includes('/ajax/');
}

/**
 * 判断是否为静态资源请求
 */
function isStaticResource(request) {
    return request.url.includes('/static/') ||
           request.url.includes('.css') ||
           request.url.includes('.js') ||
           request.url.includes('.ico');
}

/**
 * 判断是否为图片请求
 */
function isImageRequest(request) {
    return request.destination === 'image' ||
           /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url);
}

/**
 * 判断是否为页面请求
 */
function isPageRequest(request) {
    return request.mode === 'navigate' ||
           (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * 处理API请求 - Network First策略
 */
async function handleAPIRequest(request) {
    const strategy = CACHE_STRATEGIES.api;
    
    try {
        // 先尝试网络请求
        const networkResponse = await Promise.race([
            fetch(request),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), strategy.timeout)
            )
        ]);
        
        if (networkResponse.ok) {
            // 缓存成功的响应
            const cache = await caches.open(API_CACHE_NAME);
            const responseClone = networkResponse.clone();
            
            // 为响应添加时间戳
            const headers = new Headers(responseClone.headers);
            headers.set('sw-cached-at', new Date().toISOString());
            
            const modifiedResponse = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers
            });
            
            cache.put(request, modifiedResponse);
            return networkResponse;
        }
    } catch (error) {
        console.log('Service Worker: Network request failed, trying cache', error);
    }
    
    // 网络请求失败，尝试缓存
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // 检查缓存是否过期
        const cachedAt = cachedResponse.headers.get('sw-cached-at');
        if (cachedAt) {
            const cacheAge = Date.now() - new Date(cachedAt).getTime();
            if (cacheAge > strategy.maxAge) {
                console.log('Service Worker: Cached API response expired');
            }
        }
        
        return cachedResponse;
    }
    
    // 返回离线响应
    return new Response(JSON.stringify(OFFLINE_API_RESPONSE), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'application/json',
            'SW-Offline': 'true'
        }
    });
}

/**
 * 处理静态资源请求 - Cache First策略
 */
async function handleStaticResource(request) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // 后台更新缓存
        updateStaticResourceCache(request, cache);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Failed to fetch static resource', error);
        // 返回基本的错误响应
        return new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * 后台更新静态资源缓存
 */
async function updateStaticResourceCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // 静默失败，不影响用户体验
        console.log('Service Worker: Background cache update failed');
    }
}

/**
 * 处理图片请求 - Cache First策略
 */
async function handleImageRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // 返回占位图片
        return generatePlaceholderImage();
    }
}

/**
 * 生成占位图片
 */
function generatePlaceholderImage() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#999" font-size="14">
                图片暂不可用
            </text>
        </svg>
    `;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
        }
    });
}

/**
 * 处理页面请求 - Stale While Revalidate策略
 */
async function handlePageRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // 并行进行网络请求和缓存查找
    const networkResponsePromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);
    
    // 如果有缓存，立即返回缓存的响应
    if (cachedResponse) {
        // 后台更新缓存
        networkResponsePromise.catch(() => {});
        return cachedResponse;
    }
    
    // 没有缓存，等待网络响应
    const networkResponse = await networkResponsePromise;
    
    if (networkResponse && networkResponse.ok) {
        return networkResponse;
    }
    
    // 网络请求失败，返回离线页面
    const offlineResponse = await cache.match(OFFLINE_PAGE);
    return offlineResponse || new Response('离线模式：页面暂不可用', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

/**
 * 后台同步事件
 */
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (SYNC_OPERATIONS.includes(event.tag)) {
        event.waitUntil(handleBackgroundSync(event.tag));
    }
});

/**
 * 处理后台同步
 */
async function handleBackgroundSync(tag) {
    try {
        // 从IndexedDB获取待同步的数据
        const syncData = await getSyncData(tag);
        
        if (syncData && syncData.length > 0) {
            // 执行同步操作
            for (const item of syncData) {
                await performSyncOperation(tag, item);
            }
            
            // 清理已同步的数据
            await clearSyncData(tag);
            
            // 通知客户端同步完成
            await notifyClients('sync-completed', { tag, count: syncData.length });
        }
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
        
        // 通知客户端同步失败
        await notifyClients('sync-failed', { tag, error: error.message });
    }
}

/**
 * 获取待同步数据（从IndexedDB）
 */
async function getSyncData(tag) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CJPaymentSyncDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([tag], 'readonly');
            const store = transaction.objectStore(tag);
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            SYNC_OPERATIONS.forEach(operation => {
                if (!db.objectStoreNames.contains(operation)) {
                    db.createObjectStore(operation, { keyPath: 'id', autoIncrement: true });
                }
            });
        };
    });
}

/**
 * 执行同步操作
 */
async function performSyncOperation(tag, data) {
    const endpoint = getSyncEndpoint(tag);
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`Sync operation failed: ${response.statusText}`);
    }
    
    return response.json();
}

/**
 * 获取同步端点
 */
function getSyncEndpoint(tag) {
    const endpoints = {
        'transaction-sync': '/api/transactions/sync',
        'audit-sync': '/api/audit/sync',
        'merchant-sync': '/api/merchants/sync',
        'account-sync': '/api/accounts/sync'
    };
    
    return endpoints[tag] || '/api/sync';
}

/**
 * 清理已同步数据
 */
async function clearSyncData(tag) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CJPaymentSyncDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([tag], 'readwrite');
            const store = transaction.objectStore(tag);
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        };
    });
}

/**
 * 推送通知事件
 */
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: 'CJPayment 系统通知',
        icon: '/static/icons/icon-192.png',
        badge: '/static/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2'
        },
        actions: [
            {
                action: 'explore',
                title: '查看详情',
                icon: '/static/icons/checkmark.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: '/static/icons/xmark.png'
            }
        ]
    };
    
    if (event.data) {
        const payload = event.data.json();
        options.body = payload.message || options.body;
        options.title = payload.title || 'CJPayment';
        options.data = { ...options.data, ...payload.data };
    }
    
    event.waitUntil(
        self.registration.showNotification('CJPayment', options)
    );
});

/**
 * 通知点击事件
 */
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification click');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // 打开应用
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // 关闭通知
        event.notification.close();
    } else {
        // 默认行为：打开应用
        event.waitUntil(
            clients.matchAll().then(clientList => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

/**
 * 通知所有客户端
 */
async function notifyClients(type, data) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type,
            data,
            timestamp: Date.now()
        });
    });
}

/**
 * 消息事件处理
 */
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
            
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLAIM_CLIENTS':
            self.clients.claim();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            }).catch(error => {
                event.ports[0].postMessage({ success: false, error: error.message });
            });
            break;
            
        case 'QUEUE_SYNC':
            queueSyncOperation(data.tag, data.payload);
            break;
    }
});

/**
 * 清理所有缓存
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
        .filter(name => name.startsWith('cjpayment-'))
        .map(name => caches.delete(name));
    
    return Promise.all(deletePromises);
}

/**
 * 队列同步操作
 */
async function queueSyncOperation(tag, payload) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CJPaymentSyncDB', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([tag], 'readwrite');
            const store = transaction.objectStore(tag);
            const addRequest = store.add({
                ...payload,
                queued_at: new Date().toISOString()
            });
            
            addRequest.onsuccess = () => {
                // 注册后台同步
                self.registration.sync.register(tag);
                resolve();
            };
            addRequest.onerror = () => reject(addRequest.error);
        };
    });
}

/**
 * 错误处理
 */
self.addEventListener('error', event => {
    console.error('Service Worker: Error', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
});

console.log('Service Worker: Script loaded successfully');
/**
 * Service Worker for Mobile Recharge System
 * 提供离线缓存、网络拦截、推送通知、后台同步等增强功能
 */

const CACHE_NAME = 'mobile-recharge-v1.2.0';
const OFFLINE_URL = '/offline.html';

// 需要缓存的静态资源
const STATIC_CACHE_URLS = [
    '/',
    '/static/css/mobile_recharge_enhanced.css',
    '/static/js/mobile_recharge_enhanced.js',
    '/static/js/mobile_touch_gestures.js',
    '/static/js/mobile_camera_enhanced.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png',
    '/static/manifest.json',
    OFFLINE_URL
];

// 动态缓存的API端点
const API_CACHE_PATTERNS = [
    '/api/merchants/',
    '/api/mobile/recharge/',
    '/api/payment-accounts/'
];

// 离线队列存储key
const OFFLINE_QUEUE_KEY = 'mobile-recharge-offline-queue';
const MAX_OFFLINE_ITEMS = 50;

/**
 * Service Worker安装事件
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static resources...');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                // 强制激活新的Service Worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Cache installation failed:', error);
            })
    );
});

// 激活事件
self.addEventListener('activate', (event) => {
    console.log('Service Worker 激活中...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker 激活完成');
            return self.clients.claim();
        })
    );
});

/**
 * 网络请求拦截
 */
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 只处理同源请求
    if (url.origin !== location.origin) {
        return;
    }
    
    // 根据请求类型选择策略
    if (request.method === 'GET') {
        event.respondWith(handleGetRequest(request));
    } else if (request.method === 'POST') {
        event.respondWith(handlePostRequest(request));
    }
});

/**
 * 处理GET请求
 */
async function handleGetRequest(request) {
    const url = new URL(request.url);
    
    // 静态资源：缓存优先
    if (isStaticResource(url.pathname)) {
        return cacheFirstStrategy(request);
    }
    
    // API请求：网络优先
    if (isApiRequest(url.pathname)) {
        return networkFirstStrategy(request);
    }
    
    // HTML页面：网络优先，离线时返回缓存
    if (isHtmlRequest(request)) {
        return staleWhileRevalidateStrategy(request);
    }
    
    // 默认策略：网络优先
    return networkFirstStrategy(request);
}

/**
 * 处理POST请求
 */
async function handlePostRequest(request) {
    try {
        // 尝试网络请求
        const response = await fetch(request.clone());
        
        // 如果是充值订单创建请求，缓存响应
        if (request.url.includes('/api/mobile/recharge/create')) {
            await cacheOrderResponse(request, response.clone());
        }
        
        return response;
        
    } catch (error) {
        console.log('POST request failed, adding to offline queue:', error);
        
        // 网络失败时添加到离线队列
        await addToOfflineQueue(request);
        
        // 返回离线响应
        return createOfflinePostResponse(request);
    }
}

/**
 * 缓存优先策略
 */
async function cacheFirstStrategy(request) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Cache first strategy failed:', error);
        return new Response('Service Unavailable', { status: 503 });
    }
}

/**
 * 网络优先策略
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 返回离线页面
        if (isHtmlRequest(request)) {
            return caches.match(OFFLINE_URL);
        }
        
        return new Response('Offline', { status: 503 });
    }
}

/**
 * 过期时重新验证策略
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // 在后台更新缓存
    const networkResponsePromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(error => {
            console.log('Background update failed:', error);
        });
    
    // 如果有缓存，立即返回缓存
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // 否则等待网络响应
    try {
        return await networkResponsePromise;
    } catch (error) {
        return caches.match(OFFLINE_URL);
    }
}

// 后台同步
self.addEventListener('sync', (event) => {
    console.log('后台同步事件:', event.tag);
    
    if (event.tag === 'recharge-form-sync') {
        event.waitUntil(syncRechargeForm());
    }
    
    if (event.tag === 'upload-proof-sync') {
        event.waitUntil(syncUploadProof());
    }
});

// 推送通知
self.addEventListener('push', (event) => {
    console.log('收到推送消息:', event);
    
    const options = {
        body: '您的充值订单状态已更新',
        icon: '/static/images/icons/icon-192x192.png',
        badge: '/static/images/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看详情',
                icon: '/static/images/icons/checkmark.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: '/static/images/icons/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('充值系统通知', options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
    console.log('通知点击事件:', event);
    
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
            clients.openWindow('/')
        );
    }
});

// 消息事件
self.addEventListener('message', (event) => {
    console.log('收到消息:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_FORM_DATA') {
        cacheFormData(event.data.formData);
    }
    
    if (event.data && event.data.type === 'GET_CACHED_FORM_DATA') {
        getCachedFormData().then((data) => {
            event.ports[0].postMessage(data);
        });
    }
});

/**
 * 同步充值表单数据
 */
async function syncRechargeForm() {
    try {
        const formData = await getCachedFormData();
        if (!formData) {
            return;
        }
        
        const response = await fetch('/api/recharge/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            // 同步成功，清除缓存数据
            await clearCachedFormData();
            
            // 通知客户端
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_SUCCESS',
                    data: 'recharge-form'
                });
            });
        }
    } catch (error) {
        console.error('同步充值表单失败:', error);
    }
}

/**
 * 同步上传凭证
 */
async function syncUploadProof() {
    try {
        const proofData = await getCachedProofData();
        if (!proofData) {
            return;
        }
        
        const formData = new FormData();
        formData.append('orderNo', proofData.orderNo);
        formData.append('proofFile', proofData.file);
        
        const response = await fetch('/api/recharge/upload-proof', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            // 同步成功，清除缓存数据
            await clearCachedProofData();
            
            // 通知客户端
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_SUCCESS',
                    data: 'upload-proof'
                });
            });
        }
    } catch (error) {
        console.error('同步上传凭证失败:', error);
    }
}

/**
 * 缓存表单数据
 */
async function cacheFormData(formData) {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(formData));
    await cache.put('/cached-form-data', response);
}

/**
 * 获取缓存的表单数据
 */
async function getCachedFormData() {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/cached-form-data');
    
    if (response) {
        return await response.json();
    }
    
    return null;
}

/**
 * 清除缓存的表单数据
 */
async function clearCachedFormData() {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete('/cached-form-data');
}

/**
 * 缓存凭证数据
 */
async function cacheProofData(proofData) {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify({
        orderNo: proofData.orderNo,
        fileName: proofData.file.name,
        fileType: proofData.file.type,
        fileSize: proofData.file.size
    }));
    await cache.put('/cached-proof-data', response);
    
    // 缓存文件内容
    const fileResponse = new Response(proofData.file);
    await cache.put('/cached-proof-file', fileResponse);
}

/**
 * 获取缓存的凭证数据
 */
async function getCachedProofData() {
    const cache = await caches.open(CACHE_NAME);
    const metaResponse = await cache.match('/cached-proof-data');
    const fileResponse = await cache.match('/cached-proof-file');
    
    if (metaResponse && fileResponse) {
        const meta = await metaResponse.json();
        const fileBlob = await fileResponse.blob();
        
        return {
            orderNo: meta.orderNo,
            file: new File([fileBlob], meta.fileName, { type: meta.fileType })
        };
    }
    
    return null;
}

/**
 * 清除缓存的凭证数据
 */
async function clearCachedProofData() {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete('/cached-proof-data');
    await cache.delete('/cached-proof-file');
}

/**
 * 检查网络状态
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * 获取缓存大小
 */
async function getCacheSize() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }
    
    return totalSize;
}

/**
 * 清理过期缓存
 */
async function cleanupExpiredCache() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
            const dateHeader = response.headers.get('date');
            if (dateHeader) {
                const responseDate = new Date(dateHeader).getTime();
                if (now - responseDate > maxAge) {
                    await cache.delete(key);
                    console.log('删除过期缓存:', key.url);
                }
            }
        }
    }
}

/**
 * 添加到离线队列
 */
async function addToOfflineQueue(request) {
    try {
        const requestData = await serializeRequest(request);
        
        // 获取现有队列
        const queue = await getOfflineQueue();
        
        // 添加新请求
        queue.push({
            id: generateRequestId(),
            request: requestData,
            timestamp: Date.now(),
            retryCount: 0
        });
        
        // 限制队列长度
        if (queue.length > MAX_OFFLINE_ITEMS) {
            queue.splice(0, queue.length - MAX_OFFLINE_ITEMS);
        }
        
        // 保存队列
        await saveOfflineQueue(queue);
        
        // 通知客户端
        notifyClients('offline-request-queued', {
            queueLength: queue.length
        });
        
    } catch (error) {
        console.error('Failed to add request to offline queue:', error);
    }
}

/**
 * 序列化请求
 */
async function serializeRequest(request) {
    const headers = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });
    
    let body = null;
    if (request.body) {
        if (request.headers.get('content-type')?.includes('application/json')) {
            body = await request.text();
        } else if (request.headers.get('content-type')?.includes('multipart/form-data')) {
            // FormData需要特殊处理
            body = await request.formData();
            body = formDataToObject(body);
        }
    }
    
    return {
        url: request.url,
        method: request.method,
        headers: headers,
        body: body
    };
}

/**
 * FormData转对象
 */
function formDataToObject(formData) {
    const obj = {};
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            obj[key] = {
                type: 'file',
                name: value.name,
                size: value.size,
                lastModified: value.lastModified
            };
        } else {
            obj[key] = value;
        }
    }
    return obj;
}

/**
 * 获取离线队列
 */
async function getOfflineQueue() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['offline-queue'], 'readonly');
        const store = transaction.objectStore('offline-queue');
        const result = await promisifyIDBRequest(store.get(OFFLINE_QUEUE_KEY));
        
        return result ? result.queue : [];
    } catch (error) {
        console.error('Failed to get offline queue:', error);
        return [];
    }
}

/**
 * 保存离线队列
 */
async function saveOfflineQueue(queue) {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['offline-queue'], 'readwrite');
        const store = transaction.objectStore('offline-queue');
        
        await promisifyIDBRequest(store.put({
            id: OFFLINE_QUEUE_KEY,
            queue: queue,
            lastUpdated: Date.now()
        }));
        
    } catch (error) {
        console.error('Failed to save offline queue:', error);
    }
}

/**
 * 打开IndexedDB
 */
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MobileRechargeDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('offline-queue')) {
                db.createObjectStore('offline-queue', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('cached-data')) {
                const store = db.createObjectStore('cached-data', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

/**
 * Promise化IndexedDB请求
 */
function promisifyIDBRequest(request) {
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * 创建离线POST响应
 */
function createOfflinePostResponse(request) {
    const url = new URL(request.url);
    
    if (url.pathname.includes('/api/mobile/recharge/create')) {
        // 创建模拟订单响应
        const mockOrder = {
            success: true,
            data: {
                order_id: `offline_${Date.now()}`,
                order_number: `OFF${Date.now().toString().slice(-8)}`,
                status: 'offline_pending',
                message: '订单已保存，将在网络恢复后提交',
                amount: '0.00',
                created_at: new Date().toISOString()
            }
        };
        
        return new Response(JSON.stringify(mockOrder), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Offline-Response': 'true'
            }
        });
    }
    
    return new Response(JSON.stringify({
        success: false,
        message: '网络连接失败，请稍后重试',
        offline: true
    }), {
        status: 503,
        headers: {
            'Content-Type': 'application/json',
            'X-Offline-Response': 'true'
        }
    });
}

/**
 * 缓存订单响应
 */
async function cacheOrderResponse(request, response) {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['cached-data'], 'readwrite');
        const store = transaction.objectStore('cached-data');
        
        const data = await response.json();
        
        await promisifyIDBRequest(store.put({
            id: `order_${data.data?.order_id || Date.now()}`,
            type: 'order',
            data: data,
            timestamp: Date.now(),
            url: request.url
        }));
        
    } catch (error) {
        console.error('Failed to cache order response:', error);
    }
}

/**
 * 检查是否为静态资源
 */
function isStaticResource(pathname) {
    return pathname.startsWith('/static/') || 
           pathname.endsWith('.css') || 
           pathname.endsWith('.js') || 
           pathname.endsWith('.png') || 
           pathname.endsWith('.jpg') || 
           pathname.endsWith('.jpeg') || 
           pathname.endsWith('.gif') || 
           pathname.endsWith('.webp') || 
           pathname.endsWith('.ico');
}

/**
 * 检查是否为API请求
 */
function isApiRequest(pathname) {
    return API_CACHE_PATTERNS.some(pattern => pathname.startsWith(pattern));
}

/**
 * 检查是否为HTML请求
 */
function isHtmlRequest(request) {
    return request.headers.get('accept')?.includes('text/html');
}

/**
 * 生成请求ID
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 通知所有客户端
 */
function notifyClients(type, data) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: type,
                data: data
            });
        });
    });
}

// 定期清理过期缓存
setInterval(cleanupExpiredCache, 24 * 60 * 60 * 1000); // 每天清理一次

console.log('Service Worker loaded successfully');
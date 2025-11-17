/**
 * Service Worker for CJPayment
 * 处理资源缓存和离线功能
 */

const CACHE_NAME = 'cjpayment-v1';
const STATIC_CACHE = 'cjpayment-static-v1';
const DYNAMIC_CACHE = 'cjpayment-dynamic-v1';
const API_CACHE = 'cjpayment-api-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
    '/',
    '/static/css/critical.min.css',
    '/static/css/main.min.css',
    '/static/js/core.min.js',
    '/static/js/components.min.js',
    '/static/manifest.json'
];

// 需要缓存的页面
const CACHED_PAGES = [
    '/dashboard',
    '/login',
    '/recharge',
    '/system',
    '/reports'
];

// API缓存策略配置
const API_CACHE_CONFIG = {
    // 缓存时间（毫秒）
    cacheDuration: {
        '/api/dashboard/stats': 5 * 60 * 1000,      // 5分钟
        '/api/merchants': 30 * 60 * 1000,           // 30分钟
        '/api/accounts': 30 * 60 * 1000,            // 30分钟
        '/api/reports': 10 * 60 * 1000              // 10分钟
    },
    // 默认缓存时间
    defaultCacheDuration: 5 * 60 * 1000
};

// Service Worker安装
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // 缓存静态资源
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // 缓存页面
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('Caching pages...');
                return cache.addAll(CACHED_PAGES);
            })
        ]).then(() => {
            console.log('Service Worker installed successfully');
            // 强制激活新的Service Worker
            return self.skipWaiting();
        })
    );
});

// Service Worker激活
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        // 清理旧缓存
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== DYNAMIC_CACHE && 
                        cacheName !== API_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            // 立即控制所有客户端
            return self.clients.claim();
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 只处理同源请求
    if (url.origin !== location.origin) {
        return;
    }
    
    // 根据请求类型选择缓存策略
    if (request.url.includes('/api/')) {
        // API请求：网络优先，缓存回退
        event.respondWith(handleApiRequest(request));
    } else if (request.destination === 'document') {
        // HTML页面：缓存优先，网络回退
        event.respondWith(handlePageRequest(request));
    } else if (request.url.includes('/static/')) {
        // 静态资源：缓存优先
        event.respondWith(handleStaticRequest(request));
    } else {
        // 其他请求：网络优先
        event.respondWith(handleNetworkFirst(request));
    }
});

// 处理API请求
async function handleApiRequest(request) {
    const url = request.url;
    const cacheDuration = getCacheDuration(url);
    
    try {
        // 尝试网络请求
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存成功的响应
            const cache = await caches.open(API_CACHE);
            const responseClone = networkResponse.clone();
            
            // 添加时间戳到响应头
            const headers = new Headers(responseClone.headers);
            headers.set('sw-cached-at', Date.now().toString());
            
            const cachedResponse = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: headers
            });
            
            cache.put(request, cachedResponse);
            console.log('API response cached:', url);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', url);
        
        // 网络失败，尝试缓存
        const cachedResponse = await getCachedApiResponse(request, cacheDuration);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 返回离线页面或错误响应
        return new Response(JSON.stringify({
            error: 'Network unavailable',
            message: '网络连接不可用，请稍后重试'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 处理页面请求
async function handlePageRequest(request) {
    try {
        // 尝试网络请求
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存页面
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache for page:', request.url);
        
        // 网络失败，尝试缓存
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 返回离线页面
        return caches.match('/offline.html') || new Response('页面暂时无法访问', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}

// 处理静态资源请求
async function handleStaticRequest(request) {
    // 缓存优先策略
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 缓存静态资源
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch static resource:', request.url);
        return new Response('Resource not available', { status: 404 });
    }
}

// 处理网络优先请求
async function handleNetworkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Resource not available', { status: 503 });
    }
}

// 获取缓存的API响应
async function getCachedApiResponse(request, cacheDuration) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (!cachedResponse) {
        return null;
    }
    
    // 检查缓存是否过期
    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    if (cachedAt) {
        const age = Date.now() - parseInt(cachedAt);
        if (age > cacheDuration) {
            console.log('Cached API response expired:', request.url);
            cache.delete(request);
            return null;
        }
    }
    
    console.log('Using cached API response:', request.url);
    return cachedResponse;
}

// 获取API缓存时长
function getCacheDuration(url) {
    for (const [pattern, duration] of Object.entries(API_CACHE_CONFIG.cacheDuration)) {
        if (url.includes(pattern)) {
            return duration;
        }
    }
    return API_CACHE_CONFIG.defaultCacheDuration;
}

// 处理消息
self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'GET_CACHE_INFO':
            getCacheInfo().then(info => {
                event.ports[0].postMessage(info);
            });
            break;
            
        case 'PREFETCH_RESOURCES':
            prefetchResources(payload.urls).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
    }
});

// 清除所有缓存
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('All caches cleared');
}

// 获取缓存信息
async function getCacheInfo() {
    const cacheNames = await caches.keys();
    const info = {};
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        info[name] = keys.length;
    }
    
    return info;
}

// 预取资源
async function prefetchResources(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('Prefetched:', url);
            }
        } catch (error) {
            console.warn('Failed to prefetch:', url, error);
        }
    }
}

// 后台同步
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // 处理离线时的数据同步
    console.log('Background sync triggered');
    
    // 这里可以处理离线时存储的数据
    // 例如：发送离线时的表单数据、统计数据等
}

// 推送通知
self.addEventListener('push', event => {
    if (!event.data) {
        return;
    }
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/badge-72x72.png',
        data: data.data,
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 通知点击
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const data = event.notification.data;
    if (data && data.url) {
        event.waitUntil(
            clients.openWindow(data.url)
        );
    }
});

console.log('Service Worker loaded');
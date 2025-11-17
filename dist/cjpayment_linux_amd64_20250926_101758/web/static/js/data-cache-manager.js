/**
 * Data Cache Manager
 * Provides intelligent caching to reduce redundant API calls and improve performance
 */

window.DataCacheManager = (function() {
    'use strict';

    class DataCacheManager {
        constructor(options = {}) {
            this.options = {
                defaultTTL: 5 * 60 * 1000, // 5 minutes
                maxCacheSize: 100,
                enablePersistence: true,
                storagePrefix: 'cjpayment_cache_',
                ...options
            };
            
            this.cache = new Map();
            this.timers = new Map();
            this.requestQueue = new Map();
            
            this.init();
        }

        init() {
            // Load persisted cache on startup
            if (this.options.enablePersistence) {
                this.loadPersistedCache();
            }
            
            // Clean up expired entries periodically
            setInterval(() => {
                this.cleanupExpired();
            }, 60000); // Every minute
            
            // Save cache before page unload
            if (this.options.enablePersistence) {
                window.addEventListener('beforeunload', () => {
                    this.persistCache();
                });
            }
        }

        // Generate cache key from request parameters
        generateKey(url, params = {}) {
            const sortedParams = Object.keys(params)
                .sort()
                .map(key => `${key}=${params[key]}`)
                .join('&');
            
            return `${url}${sortedParams ? '?' + sortedParams : ''}`;
        }

        // Check if data is cached and not expired
        has(key) {
            const entry = this.cache.get(key);
            if (!entry) return false;
            
            if (Date.now() > entry.expiresAt) {
                this.delete(key);
                return false;
            }
            
            return true;
        }

        // Get cached data
        get(key) {
            if (!this.has(key)) return null;
            
            const entry = this.cache.get(key);
            entry.lastAccessed = Date.now();
            entry.accessCount++;
            
            return entry.data;
        }

        // Set cached data
        set(key, data, ttl = this.options.defaultTTL) {
            // Remove oldest entries if cache is full
            if (this.cache.size >= this.options.maxCacheSize) {
                this.evictOldest();
            }
            
            const expiresAt = Date.now() + ttl;
            const entry = {
                data,
                expiresAt,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 1,
                ttl
            };
            
            this.cache.set(key, entry);
            
            // Set expiration timer
            const timer = setTimeout(() => {
                this.delete(key);
            }, ttl);
            
            this.timers.set(key, timer);
            
            return entry;
        }

        // Delete cached data
        delete(key) {
            this.cache.delete(key);
            
            const timer = this.timers.get(key);
            if (timer) {
                clearTimeout(timer);
                this.timers.delete(key);
            }
        }

        // Clear all cached data
        clear() {
            this.cache.clear();
            this.timers.forEach(timer => clearTimeout(timer));
            this.timers.clear();
            this.requestQueue.clear();
        }

        // Evict oldest entries based on last access time
        evictOldest() {
            let oldestKey = null;
            let oldestTime = Date.now();
            
            for (const [key, entry] of this.cache.entries()) {
                if (entry.lastAccessed < oldestTime) {
                    oldestTime = entry.lastAccessed;
                    oldestKey = key;
                }
            }
            
            if (oldestKey) {
                this.delete(oldestKey);
            }
        }

        // Clean up expired entries
        cleanupExpired() {
            const now = Date.now();
            const expiredKeys = [];
            
            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) {
                    expiredKeys.push(key);
                }
            }
            
            expiredKeys.forEach(key => this.delete(key));
        }

        // Cached fetch with deduplication
        async fetch(url, options = {}) {
            const cacheKey = this.generateKey(url, options.params);
            const cacheTTL = options.cacheTTL || this.options.defaultTTL;
            const forceRefresh = options.forceRefresh || false;
            
            // Return cached data if available and not forcing refresh
            if (!forceRefresh && this.has(cacheKey)) {
                return {
                    data: this.get(cacheKey),
                    fromCache: true,
                    cacheKey
                };
            }
            
            // Check if request is already in progress
            if (this.requestQueue.has(cacheKey)) {
                return await this.requestQueue.get(cacheKey);
            }
            
            // Create new request promise
            const requestPromise = this.performFetch(url, options)
                .then(result => {
                    // Cache successful results
                    if (result.success) {
                        this.set(cacheKey, result.data, cacheTTL);
                    }
                    
                    // Remove from queue
                    this.requestQueue.delete(cacheKey);
                    
                    return {
                        ...result,
                        fromCache: false,
                        cacheKey
                    };
                })
                .catch(error => {
                    // Remove from queue on error
                    this.requestQueue.delete(cacheKey);
                    throw error;
                });
            
            // Add to request queue
            this.requestQueue.set(cacheKey, requestPromise);
            
            return await requestPromise;
        }

        // Perform actual fetch request
        async performFetch(url, options = {}) {
            const fetchOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options.fetchOptions
            };
            
            // Add query parameters to URL
            if (options.params) {
                const params = new URLSearchParams(options.params);
                url += (url.includes('?') ? '&' : '?') + params.toString();
            }
            
            try {
                const response = await fetch(url, fetchOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                return {
                    success: true,
                    data,
                    status: response.status,
                    headers: response.headers
                };
                
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    status: error.status || 0
                };
            }
        }

        // Invalidate cache entries by pattern
        invalidate(pattern) {
            const keysToDelete = [];
            
            if (typeof pattern === 'string') {
                // Simple string matching
                for (const key of this.cache.keys()) {
                    if (key.includes(pattern)) {
                        keysToDelete.push(key);
                    }
                }
            } else if (pattern instanceof RegExp) {
                // Regex matching
                for (const key of this.cache.keys()) {
                    if (pattern.test(key)) {
                        keysToDelete.push(key);
                    }
                }
            } else if (typeof pattern === 'function') {
                // Function matching
                for (const [key, entry] of this.cache.entries()) {
                    if (pattern(key, entry)) {
                        keysToDelete.push(key);
                    }
                }
            }
            
            keysToDelete.forEach(key => this.delete(key));
            
            return keysToDelete.length;
        }

        // Refresh specific cache entry
        async refresh(key, url, options = {}) {
            this.delete(key);
            return await this.fetch(url, { ...options, forceRefresh: true });
        }

        // Get cache statistics
        getStats() {
            const entries = Array.from(this.cache.values());
            const now = Date.now();
            
            return {
                size: this.cache.size,
                maxSize: this.options.maxCacheSize,
                totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
                averageAge: entries.length > 0 
                    ? entries.reduce((sum, entry) => sum + (now - entry.createdAt), 0) / entries.length 
                    : 0,
                hitRate: this.calculateHitRate(),
                memoryUsage: this.estimateMemoryUsage()
            };
        }

        // Calculate cache hit rate (simplified)
        calculateHitRate() {
            // This would need to be tracked over time for accuracy
            // For now, return a placeholder
            return 0.75; // 75% hit rate assumption
        }

        // Estimate memory usage (rough calculation)
        estimateMemoryUsage() {
            let totalSize = 0;
            
            for (const [key, entry] of this.cache.entries()) {
                totalSize += key.length * 2; // Rough string size
                totalSize += JSON.stringify(entry.data).length * 2; // Rough data size
                totalSize += 200; // Overhead for entry metadata
            }
            
            return totalSize;
        }

        // Persist cache to localStorage
        persistCache() {
            if (!this.options.enablePersistence) return;
            
            try {
                const cacheData = {};
                const now = Date.now();
                
                for (const [key, entry] of this.cache.entries()) {
                    // Only persist non-expired entries
                    if (now < entry.expiresAt) {
                        cacheData[key] = {
                            data: entry.data,
                            expiresAt: entry.expiresAt,
                            createdAt: entry.createdAt
                        };
                    }
                }
                
                localStorage.setItem(
                    this.options.storagePrefix + 'data',
                    JSON.stringify(cacheData)
                );
                
            } catch (error) {
                console.warn('Failed to persist cache:', error);
            }
        }

        // Load persisted cache from localStorage
        loadPersistedCache() {
            if (!this.options.enablePersistence) return;
            
            try {
                const cacheData = localStorage.getItem(this.options.storagePrefix + 'data');
                if (!cacheData) return;
                
                const parsedData = JSON.parse(cacheData);
                const now = Date.now();
                
                for (const [key, entry] of Object.entries(parsedData)) {
                    // Only load non-expired entries
                    if (now < entry.expiresAt) {
                        const ttl = entry.expiresAt - now;
                        this.set(key, entry.data, ttl);
                    }
                }
                
            } catch (error) {
                console.warn('Failed to load persisted cache:', error);
            }
        }

        // Preload data for better performance
        async preload(requests) {
            const promises = requests.map(request => {
                return this.fetch(request.url, request.options).catch(error => {
                    console.warn('Preload failed for', request.url, error);
                    return null;
                });
            });
            
            return await Promise.allSettled(promises);
        }

        // Destroy cache manager
        destroy() {
            this.clear();
            
            if (this.options.enablePersistence) {
                this.persistCache();
            }
        }
    }

    return DataCacheManager;
})();

// Create global instance
window.dataCacheManager = new window.DataCacheManager();
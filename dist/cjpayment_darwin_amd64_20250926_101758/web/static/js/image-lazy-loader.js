/**
 * 图片懒加载系统
 * Image Lazy Loading System
 */

class ImageLazyLoader {
    constructor(options = {}) {
        this.config = {
            rootMargin: '50px',
            threshold: 0.1,
            loadingClass: 'img-loading',
            loadedClass: 'img-loaded',
            errorClass: 'img-error',
            placeholderSrc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
            errorSrc: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
            retryAttempts: 3,
            retryDelay: 1000,
            enableWebP: true,
            enableResponsive: true,
            quality: 85,
            ...options
        };
        
        this.observer = null;
        this.loadingImages = new Set();
        this.loadedImages = new Set();
        this.failedImages = new Set();
        this.retryCount = new Map();
        
        this.init();
    }
    
    init() {
        this.setupIntersectionObserver();
        this.setupMutationObserver();
        this.processExistingImages();
        this.setupEventListeners();
    }
    
    /**
     * 设置 Intersection Observer
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            // 降级处理：直接加载所有图片
            this.loadAllImages();
            return;
        }
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: this.config.rootMargin,
            threshold: this.config.threshold
        });
    }
    
    /**
     * 设置 Mutation Observer 监听新添加的图片
     */
    setupMutationObserver() {
        if (!('MutationObserver' in window)) return;
        
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查节点本身
                        if (this.isLazyImage(node)) {
                            this.observeImage(node);
                        }
                        
                        // 检查子节点
                        const lazyImages = node.querySelectorAll && node.querySelectorAll('[data-src], [data-lazy]');
                        if (lazyImages) {
                            lazyImages.forEach(img => this.observeImage(img));
                        }
                    }
                });
            });
        });
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * 处理现有图片
     */
    processExistingImages() {
        const lazyImages = document.querySelectorAll('[data-src], [data-lazy]');
        lazyImages.forEach(img => this.observeImage(img));
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 网络状态变化时重试失败的图片
        window.addEventListener('online', () => {
            this.retryFailedImages();
        });
        
        // 页面可见性变化时暂停/恢复加载
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseLoading();
            } else {
                this.resumeLoading();
            }
        });
    }
    
    /**
     * 观察图片
     */
    observeImage(img) {
        if (!this.isLazyImage(img) || this.loadedImages.has(img)) {
            return;
        }
        
        // 设置占位符
        this.setPlaceholder(img);
        
        if (this.observer) {
            this.observer.observe(img);
        } else {
            // 降级处理
            this.loadImage(img);
        }
    }
    
    /**
     * 检查是否为懒加载图片
     */
    isLazyImage(element) {
        return element.tagName === 'IMG' && (element.dataset.src || element.dataset.lazy);
    }
    
    /**
     * 设置占位符
     */
    setPlaceholder(img) {
        if (!img.src || img.src === this.config.errorSrc) {
            img.src = this.config.placeholderSrc;
        }
        
        img.classList.add(this.config.loadingClass);
    }
    
    /**
     * 加载图片
     */
    async loadImage(img) {
        if (this.loadingImages.has(img) || this.loadedImages.has(img)) {
            return;
        }
        
        this.loadingImages.add(img);
        
        try {
            const src = this.getOptimalSrc(img);
            await this.preloadImage(src);
            
            // 应用图片
            this.applyImage(img, src);
            
            this.loadingImages.delete(img);
            this.loadedImages.add(img);
            this.failedImages.delete(img);
            this.retryCount.delete(img);
            
        } catch (error) {
            this.handleImageError(img, error);
        }
    }
    
    /**
     * 获取最优图片源
     */
    getOptimalSrc(img) {
        let src = img.dataset.src || img.dataset.lazy;
        
        // 响应式图片处理
        if (this.config.enableResponsive) {
            src = this.getResponsiveSrc(img, src);
        }
        
        // WebP 支持检测
        if (this.config.enableWebP && this.supportsWebP()) {
            src = this.getWebPSrc(src);
        }
        
        return src;
    }
    
    /**
     * 获取响应式图片源
     */
    getResponsiveSrc(img, originalSrc) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const imgRect = img.getBoundingClientRect();
        const displayWidth = Math.ceil(imgRect.width * devicePixelRatio);
        const displayHeight = Math.ceil(imgRect.height * devicePixelRatio);
        
        // 检查是否有 srcset
        if (img.dataset.srcset) {
            return this.selectFromSrcset(img.dataset.srcset, displayWidth);
        }
        
        // 检查是否有尺寸参数
        if (originalSrc.includes('?') || originalSrc.includes('&')) {
            return `${originalSrc}&w=${displayWidth}&h=${displayHeight}&q=${this.config.quality}`;
        } else {
            return `${originalSrc}?w=${displayWidth}&h=${displayHeight}&q=${this.config.quality}`;
        }
    }
    
    /**
     * 从 srcset 中选择合适的图片
     */
    selectFromSrcset(srcset, targetWidth) {
        const sources = srcset.split(',').map(src => {
            const [url, descriptor] = src.trim().split(' ');
            const width = descriptor ? parseInt(descriptor.replace('w', '')) : 0;
            return { url, width };
        });
        
        // 按宽度排序
        sources.sort((a, b) => a.width - b.width);
        
        // 选择最接近目标宽度的图片
        for (const source of sources) {
            if (source.width >= targetWidth) {
                return source.url;
            }
        }
        
        // 如果没有找到合适的，返回最大的
        return sources[sources.length - 1].url;
    }
    
    /**
     * 获取 WebP 版本的图片
     */
    getWebPSrc(src) {
        // 简单的 WebP 转换逻辑
        if (src.match(/\.(jpg|jpeg|png)$/i)) {
            return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        return src;
    }
    
    /**
     * 检查 WebP 支持
     */
    supportsWebP() {
        if (this._webpSupport !== undefined) {
            return this._webpSupport;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        this._webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        return this._webpSupport;
    }
    
    /**
     * 预加载图片
     */
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            const cleanup = () => {
                img.onload = null;
                img.onerror = null;
            };
            
            img.onload = () => {
                cleanup();
                resolve(img);
            };
            
            img.onerror = () => {
                cleanup();
                reject(new Error(`Failed to load image: ${src}`));
            };
            
            img.src = src;
        });
    }
    
    /**
     * 应用图片
     */
    applyImage(img, src) {
        // 创建淡入效果
        const fadeIn = () => {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            
            img.src = src;
            
            // 复制 data-* 属性到实际属性
            if (img.dataset.alt) {
                img.alt = img.dataset.alt;
            }
            
            if (img.dataset.title) {
                img.title = img.dataset.title;
            }
            
            // 等待图片加载完成后淡入
            img.onload = () => {
                img.style.opacity = '1';
                img.classList.remove(this.config.loadingClass);
                img.classList.add(this.config.loadedClass);
                
                // 触发加载完成事件
                img.dispatchEvent(new CustomEvent('lazyLoaded', {
                    detail: { src, originalElement: img }
                }));
            };
        };
        
        // 如果图片已经在视口中，立即应用
        if (this.isInViewport(img)) {
            fadeIn();
        } else {
            // 否则等待进入视口
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        fadeIn();
                        observer.unobserve(entry.target);
                    }
                });
            });
            
            observer.observe(img);
        }
    }
    
    /**
     * 处理图片加载错误
     */
    handleImageError(img, error) {
        console.warn('Image load failed:', error);
        
        this.loadingImages.delete(img);
        
        const currentRetries = this.retryCount.get(img) || 0;
        
        if (currentRetries < this.config.retryAttempts) {
            // 重试
            this.retryCount.set(img, currentRetries + 1);
            
            setTimeout(() => {
                this.loadImage(img);
            }, this.config.retryDelay * Math.pow(2, currentRetries));
            
        } else {
            // 达到最大重试次数，显示错误图片
            this.failedImages.add(img);
            img.src = this.config.errorSrc;
            img.classList.remove(this.config.loadingClass);
            img.classList.add(this.config.errorClass);
            
            // 触发错误事件
            img.dispatchEvent(new CustomEvent('lazyError', {
                detail: { error, originalElement: img }
            }));
        }
    }
    
    /**
     * 检查元素是否在视口中
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    /**
     * 重试失败的图片
     */
    retryFailedImages() {
        this.failedImages.forEach(img => {
            this.retryCount.delete(img);
            this.failedImages.delete(img);
            this.loadImage(img);
        });
    }
    
    /**
     * 暂停加载
     */
    pauseLoading() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
    
    /**
     * 恢复加载
     */
    resumeLoading() {
        if (this.observer) {
            this.setupIntersectionObserver();
            this.processExistingImages();
        }
    }
    
    /**
     * 加载所有图片（降级处理）
     */
    loadAllImages() {
        const lazyImages = document.querySelectorAll('[data-src], [data-lazy]');
        lazyImages.forEach(img => this.loadImage(img));
    }
    
    /**
     * 预加载指定图片
     */
    async preload(urls) {
        const preloadPromises = urls.map(url => this.preloadImage(url));
        
        try {
            await Promise.all(preloadPromises);
            console.log('Images preloaded successfully');
        } catch (error) {
            console.warn('Some images failed to preload:', error);
        }
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            loading: this.loadingImages.size,
            loaded: this.loadedImages.size,
            failed: this.failedImages.size,
            totalObserved: this.loadedImages.size + this.failedImages.size + this.loadingImages.size
        };
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.loadingImages.clear();
        this.loadedImages.clear();
        this.failedImages.clear();
        this.retryCount.clear();
    }
}

/**
 * 背景图片懒加载类
 */
class BackgroundImageLazyLoader extends ImageLazyLoader {
    constructor(options = {}) {
        super(options);
    }
    
    isLazyImage(element) {
        return element.dataset.bgSrc || element.dataset.backgroundSrc;
    }
    
    setPlaceholder(element) {
        element.classList.add(this.config.loadingClass);
        
        // 设置占位符背景
        if (!element.style.backgroundImage) {
            element.style.backgroundImage = `url(${this.config.placeholderSrc})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
        }
    }
    
    getOptimalSrc(element) {
        return element.dataset.bgSrc || element.dataset.backgroundSrc;
    }
    
    applyImage(element, src) {
        // 预加载图片
        this.preloadImage(src).then(() => {
            element.style.backgroundImage = `url(${src})`;
            element.classList.remove(this.config.loadingClass);
            element.classList.add(this.config.loadedClass);
            
            // 触发加载完成事件
            element.dispatchEvent(new CustomEvent('lazyLoaded', {
                detail: { src, originalElement: element }
            }));
        }).catch(error => {
            this.handleImageError(element, error);
        });
    }
    
    handleImageError(element, error) {
        console.warn('Background image load failed:', error);
        
        this.loadingImages.delete(element);
        this.failedImages.add(element);
        
        element.style.backgroundImage = `url(${this.config.errorSrc})`;
        element.classList.remove(this.config.loadingClass);
        element.classList.add(this.config.errorClass);
        
        // 触发错误事件
        element.dispatchEvent(new CustomEvent('lazyError', {
            detail: { error, originalElement: element }
        }));
    }
}

// 创建全局实例
window.imageLazyLoader = new ImageLazyLoader();
window.backgroundImageLazyLoader = new BackgroundImageLazyLoader();

// 导出类
export { ImageLazyLoader, BackgroundImageLazyLoader };
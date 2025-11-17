/**
 * 资源优化系统
 * Resource Optimization System
 */

class ResourceOptimizer {
    constructor() {
        this.config = {
            criticalCSSThreshold: 14000, // 14KB
            deferNonCriticalCSS: true,
            preloadFonts: true,
            optimizeImages: true,
            enableServiceWorker: true,
            cacheStrategy: 'stale-while-revalidate',
            compressionLevel: 'high'
        };
        
        this.loadedResources = new Set();
        this.criticalResources = new Set();
        this.deferredResources = new Set();
        this.preloadedResources = new Set();
        
        this.init();
    }
    
    init() {
        this.optimizeCriticalCSS();
        this.setupDeferredLoading();
        this.preloadCriticalResources();
        this.setupResourceHints();
        this.optimizeWebFonts();
        this.setupServiceWorker();
    }
    
    /**
     * 优化关键 CSS
     */
    optimizeCriticalCSS() {
        // 提取关键 CSS
        const criticalCSS = this.extractCriticalCSS();
        
        if (criticalCSS) {
            this.inlineCriticalCSS(criticalCSS);
        }
        
        // 延迟加载非关键 CSS
        if (this.config.deferNonCriticalCSS) {
            this.deferNonCriticalCSS();
        }
    }
    
    /**
     * 提取关键 CSS
     */
    extractCriticalCSS() {
        const aboveFoldElements = this.getAboveFoldElements();
        const criticalRules = new Set();
        
        // 遍历所有样式表
        for (const stylesheet of document.styleSheets) {
            try {
                for (const rule of stylesheet.cssRules || []) {
                    if (this.isCriticalRule(rule, aboveFoldElements)) {
                        criticalRules.add(rule.cssText);
                    }
                }
            } catch (error) {
                // 跨域样式表无法访问，跳过
                console.warn('Cannot access stylesheet:', stylesheet.href);
            }
        }
        
        return Array.from(criticalRules).join('\n');
    }
    
    /**
     * 获取首屏元素
     */
    getAboveFoldElements() {
        const viewportHeight = window.innerHeight;
        const elements = document.querySelectorAll('*');
        const aboveFoldElements = [];
        
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0) {
                aboveFoldElements.push(element);
            }
        }
        
        return aboveFoldElements;
    }
    
    /**
     * 判断是否为关键 CSS 规则
     */
    isCriticalRule(rule, aboveFoldElements) {
        if (rule.type !== CSSRule.STYLE_RULE) {
            return false;
        }
        
        try {
            // 检查选择器是否匹配首屏元素
            for (const element of aboveFoldElements) {
                if (element.matches && element.matches(rule.selectorText)) {
                    return true;
                }
            }
        } catch (error) {
            // 无效选择器，跳过
        }
        
        return false;
    }
    
    /**
     * 内联关键 CSS
     */
    inlineCriticalCSS(css) {
        if (css.length > this.config.criticalCSSThreshold) {
            // 如果关键 CSS 太大，只内联最重要的部分
            css = this.prioritizeCriticalCSS(css);
        }
        
        const style = document.createElement('style');
        style.textContent = css;
        style.setAttribute('data-critical', 'true');
        
        // 插入到 head 的最前面
        const firstLink = document.head.querySelector('link[rel="stylesheet"]');
        if (firstLink) {
            document.head.insertBefore(style, firstLink);
        } else {
            document.head.appendChild(style);
        }
    }
    
    /**
     * 优先级排序关键 CSS
     */
    prioritizeCriticalCSS(css) {
        const rules = css.split('}').filter(rule => rule.trim());
        
        // 按重要性排序
        const priorityOrder = [
            /body|html/,
            /\.container|\.wrapper/,
            /\.header|\.nav/,
            /\.btn|button/,
            /\.card/,
            /\.grid|\.flex/
        ];
        
        const prioritizedRules = [];
        
        for (const pattern of priorityOrder) {
            const matchingRules = rules.filter(rule => pattern.test(rule));
            prioritizedRules.push(...matchingRules);
        }
        
        // 限制大小
        let result = '';
        for (const rule of prioritizedRules) {
            if (result.length + rule.length > this.config.criticalCSSThreshold) {
                break;
            }
            result += rule + '}';
        }
        
        return result;
    }
    
    /**
     * 延迟加载非关键 CSS
     */
    deferNonCriticalCSS() {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([data-critical])');
        
        stylesheets.forEach(link => {
            // 将 rel 改为 preload，稍后再改回 stylesheet
            link.rel = 'preload';
            link.as = 'style';
            
            // 在页面加载完成后加载样式
            link.onload = () => {
                link.rel = 'stylesheet';
                link.onload = null;
            };
            
            // 降级处理
            const noscript = document.createElement('noscript');
            const fallbackLink = link.cloneNode();
            fallbackLink.rel = 'stylesheet';
            noscript.appendChild(fallbackLink);
            link.parentNode.insertBefore(noscript, link.nextSibling);
        });
    }
    
    /**
     * 设置延迟加载
     */
    setupDeferredLoading() {
        // 页面加载完成后加载延迟资源
        if (document.readyState === 'complete') {
            this.loadDeferredResources();
        } else {
            window.addEventListener('load', () => {
                // 延迟一点时间，确保关键资源已加载
                setTimeout(() => {
                    this.loadDeferredResources();
                }, 100);
            });
        }
    }
    
    /**
     * 加载延迟资源
     */
    loadDeferredResources() {
        // 加载延迟的 JavaScript
        this.loadDeferredScripts();
        
        // 加载延迟的 CSS
        this.loadDeferredStyles();
        
        // 加载延迟的图片
        this.loadDeferredImages();
    }
    
    /**
     * 加载延迟的脚本
     */
    loadDeferredScripts() {
        const deferredScripts = document.querySelectorAll('script[data-defer]');
        
        deferredScripts.forEach(script => {
            const newScript = document.createElement('script');
            
            // 复制属性
            Array.from(script.attributes).forEach(attr => {
                if (attr.name !== 'data-defer') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });
            
            // 复制内容
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            
            // 替换原脚本
            script.parentNode.replaceChild(newScript, script);
        });
    }
    
    /**
     * 加载延迟的样式
     */
    loadDeferredStyles() {
        const deferredStyles = document.querySelectorAll('link[data-defer][rel="preload"]');
        
        deferredStyles.forEach(link => {
            link.rel = 'stylesheet';
            link.removeAttribute('data-defer');
        });
    }
    
    /**
     * 加载延迟的图片
     */
    loadDeferredImages() {
        const deferredImages = document.querySelectorAll('img[data-defer]');
        
        deferredImages.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-defer');
            }
        });
    }
    
    /**
     * 预加载关键资源
     */
    preloadCriticalResources() {
        const criticalResources = [
            // 关键字体
            { href: '/static/fonts/main.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
            
            // 关键图片
            { href: '/static/images/logo.svg', as: 'image' },
            
            // 关键脚本
            { href: '/static/js/app.js', as: 'script' },
            
            // 关键样式
            { href: '/static/css/critical.css', as: 'style' }
        ];
        
        criticalResources.forEach(resource => {
            this.preloadResource(resource);
        });
    }
    
    /**
     * 预加载资源
     */
    preloadResource(resource) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        
        if (resource.type) {
            link.type = resource.type;
        }
        
        if (resource.crossorigin) {
            link.crossOrigin = resource.crossorigin;
        }
        
        // 添加到 head
        document.head.appendChild(link);
        
        this.preloadedResources.add(resource.href);
    }
    
    /**
     * 设置资源提示
     */
    setupResourceHints() {
        // DNS 预解析
        this.addDNSPrefetch([
            '//fonts.googleapis.com',
            '//fonts.gstatic.com',
            '//cdn.jsdelivr.net'
        ]);
        
        // 预连接
        this.addPreconnect([
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
        ]);
        
        // 预取下一页资源
        this.setupPrefetch();
    }
    
    /**
     * 添加 DNS 预解析
     */
    addDNSPrefetch(domains) {
        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = domain;
            document.head.appendChild(link);
        });
    }
    
    /**
     * 添加预连接
     */
    addPreconnect(origins) {
        origins.forEach(origin => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = origin;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }
    
    /**
     * 设置预取
     */
    setupPrefetch() {
        // 监听链接悬停，预取页面资源
        document.addEventListener('mouseover', (event) => {
            const link = event.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                this.prefetchPage(link.href);
            }
        });
    }
    
    /**
     * 预取页面
     */
    prefetchPage(url) {
        if (this.preloadedResources.has(url)) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
        
        this.preloadedResources.add(url);
    }
    
    /**
     * 检查是否为内部链接
     */
    isInternalLink(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            return urlObj.origin === window.location.origin;
        } catch {
            return false;
        }
    }
    
    /**
     * 优化 Web 字体
     */
    optimizeWebFonts() {
        if (!this.config.preloadFonts) return;
        
        // 预加载关键字体
        const criticalFonts = [
            '/static/fonts/main-regular.woff2',
            '/static/fonts/main-bold.woff2'
        ];
        
        criticalFonts.forEach(font => {
            this.preloadResource({
                href: font,
                as: 'font',
                type: 'font/woff2',
                crossorigin: 'anonymous'
            });
        });
        
        // 使用 font-display: swap
        this.addFontDisplaySwap();
    }
    
    /**
     * 添加 font-display: swap
     */
    addFontDisplaySwap() {
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: 'Main';
                src: url('/static/fonts/main-regular.woff2') format('woff2');
                font-display: swap;
                font-weight: 400;
            }
            @font-face {
                font-family: 'Main';
                src: url('/static/fonts/main-bold.woff2') format('woff2');
                font-display: swap;
                font-weight: 700;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 设置 Service Worker
     */
    setupServiceWorker() {
        if (!this.config.enableServiceWorker || !('serviceWorker' in navigator)) {
            return;
        }
        
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
                
                // 监听更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 有新版本可用
                            this.notifyUpdate();
                        }
                    });
                });
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });
    }
    
    /**
     * 通知更新
     */
    notifyUpdate() {
        // 可以显示更新提示
        console.log('New version available');
    }
    
    /**
     * 压缩资源
     */
    compressResources() {
        // 这个方法主要用于构建时压缩，运行时可以检查压缩状态
        const compressionSupport = {
            gzip: this.supportsGzip(),
            brotli: this.supportsBrotli()
        };
        
        console.log('Compression support:', compressionSupport);
        return compressionSupport;
    }
    
    /**
     * 检查 Gzip 支持
     */
    supportsGzip() {
        return navigator.userAgent.indexOf('gzip') !== -1 ||
               document.querySelector('meta[http-equiv="Content-Encoding"][content*="gzip"]');
    }
    
    /**
     * 检查 Brotli 支持
     */
    supportsBrotli() {
        return navigator.userAgent.indexOf('br') !== -1 ||
               document.querySelector('meta[http-equiv="Content-Encoding"][content*="br"]');
    }
    
    /**
     * 监控资源加载性能
     */
    monitorResourcePerformance() {
        if (!('PerformanceObserver' in window)) return;
        
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 1000) {
                    console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
                }
                
                // 记录资源大小
                if (entry.transferSize > 1024 * 1024) {
                    console.warn(`Large resource: ${entry.name} is ${(entry.transferSize / 1024 / 1024).toFixed(2)}MB`);
                }
            }
        });
        
        observer.observe({ entryTypes: ['resource'] });
    }
    
    /**
     * 获取优化统计
     */
    getOptimizationStats() {
        return {
            loadedResources: this.loadedResources.size,
            criticalResources: this.criticalResources.size,
            deferredResources: this.deferredResources.size,
            preloadedResources: this.preloadedResources.size,
            compressionSupport: this.compressResources()
        };
    }
    
    /**
     * 销毁优化器
     */
    destroy() {
        this.loadedResources.clear();
        this.criticalResources.clear();
        this.deferredResources.clear();
        this.preloadedResources.clear();
    }
}

// 创建全局实例
window.resourceOptimizer = new ResourceOptimizer();

// 导出类
export default ResourceOptimizer;
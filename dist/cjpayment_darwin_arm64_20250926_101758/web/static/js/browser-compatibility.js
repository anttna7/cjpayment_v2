/**
 * 浏览器兼容性检测和处理模块
 * 提供跨浏览器兼容性支持和polyfill
 */

class BrowserCompatibility {
    constructor() {
        this.userAgent = navigator.userAgent;
        this.browserInfo = this.detectBrowser();
        this.features = this.detectFeatures();
        this.init();
    }

    /**
     * 检测浏览器类型和版本
     */
    detectBrowser() {
        const ua = this.userAgent;
        let browser = {
            name: 'unknown',
            version: 0,
            engine: 'unknown'
        };

        // Chrome
        if (ua.includes('Chrome') && !ua.includes('Edg')) {
            const match = ua.match(/Chrome\/(\d+)/);
            browser.name = 'chrome';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.engine = 'blink';
        }
        // Firefox
        else if (ua.includes('Firefox')) {
            const match = ua.match(/Firefox\/(\d+)/);
            browser.name = 'firefox';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.engine = 'gecko';
        }
        // Safari
        else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/(\d+)/);
            browser.name = 'safari';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.engine = 'webkit';
        }
        // Edge
        else if (ua.includes('Edg')) {
            const match = ua.match(/Edg\/(\d+)/);
            browser.name = 'edge';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.engine = 'blink';
        }
        // Internet Explorer
        else if (ua.includes('MSIE') || ua.includes('Trident')) {
            const match = ua.match(/(?:MSIE |rv:)(\d+)/);
            browser.name = 'ie';
            browser.version = match ? parseInt(match[1]) : 0;
            browser.engine = 'trident';
        }

        return browser;
    }

    /**
     * 检测浏览器特性支持
     */
    detectFeatures() {
        const features = {
            // CSS特性
            cssVariables: this.supportsCSSVariables(),
            cssGrid: this.supportsCSSGrid(),
            flexbox: this.supportsFlexbox(),
            transforms: this.supportsTransforms(),
            transitions: this.supportsTransitions(),
            animations: this.supportsAnimations(),
            
            // JavaScript特性
            es6: this.supportsES6(),
            fetch: this.supportsFetch(),
            promises: this.supportsPromises(),
            intersectionObserver: this.supportsIntersectionObserver(),
            resizeObserver: this.supportsResizeObserver(),
            
            // HTML特性
            webComponents: this.supportsWebComponents(),
            customElements: this.supportsCustomElements(),
            
            // 其他特性
            touchEvents: this.supportsTouchEvents(),
            pointerEvents: this.supportsPointerEvents(),
            webGL: this.supportsWebGL()
        };

        return features;
    }

    /**
     * CSS Variables支持检测
     */
    supportsCSSVariables() {
        return window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
    }

    /**
     * CSS Grid支持检测
     */
    supportsCSSGrid() {
        return window.CSS && CSS.supports && CSS.supports('display', 'grid');
    }

    /**
     * Flexbox支持检测
     */
    supportsFlexbox() {
        return window.CSS && CSS.supports && CSS.supports('display', 'flex');
    }

    /**
     * CSS Transforms支持检测
     */
    supportsTransforms() {
        return window.CSS && CSS.supports && CSS.supports('transform', 'translateX(1px)');
    }

    /**
     * CSS Transitions支持检测
     */
    supportsTransitions() {
        return window.CSS && CSS.supports && CSS.supports('transition', 'opacity 1s');
    }

    /**
     * CSS Animations支持检测
     */
    supportsAnimations() {
        return window.CSS && CSS.supports && CSS.supports('animation', 'test 1s');
    }

    /**
     * ES6支持检测
     */
    supportsES6() {
        try {
            return typeof Symbol !== 'undefined' && 
                   typeof Promise !== 'undefined' && 
                   typeof Map !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    /**
     * Fetch API支持检测
     */
    supportsFetch() {
        return typeof fetch !== 'undefined';
    }

    /**
     * Promises支持检测
     */
    supportsPromises() {
        return typeof Promise !== 'undefined';
    }

    /**
     * Intersection Observer支持检测
     */
    supportsIntersectionObserver() {
        return typeof IntersectionObserver !== 'undefined';
    }

    /**
     * Resize Observer支持检测
     */
    supportsResizeObserver() {
        return typeof ResizeObserver !== 'undefined';
    }

    /**
     * Web Components支持检测
     */
    supportsWebComponents() {
        return typeof customElements !== 'undefined';
    }

    /**
     * Custom Elements支持检测
     */
    supportsCustomElements() {
        return typeof customElements !== 'undefined' && customElements.define;
    }

    /**
     * Touch Events支持检测
     */
    supportsTouchEvents() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Pointer Events支持检测
     */
    supportsPointerEvents() {
        return typeof PointerEvent !== 'undefined';
    }

    /**
     * WebGL支持检测
     */
    supportsWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    /**
     * 初始化兼容性处理
     */
    init() {
        this.addBrowserClasses();
        this.loadPolyfills();
        this.applyFallbacks();
        this.setupEventListeners();
    }

    /**
     * 添加浏览器相关的CSS类
     */
    addBrowserClasses() {
        const html = document.documentElement;
        
        // 添加浏览器类
        html.classList.add(`browser-${this.browserInfo.name}`);
        html.classList.add(`engine-${this.browserInfo.engine}`);
        
        // 添加版本类
        if (this.browserInfo.version) {
            html.classList.add(`version-${this.browserInfo.version}`);
        }

        // 添加特性支持类
        Object.keys(this.features).forEach(feature => {
            if (this.features[feature]) {
                html.classList.add(`supports-${feature}`);
            } else {
                html.classList.add(`no-${feature}`);
            }
        });

        // 添加设备类型类
        if (this.isMobile()) {
            html.classList.add('is-mobile');
        }
        if (this.isTablet()) {
            html.classList.add('is-tablet');
        }
        if (this.isDesktop()) {
            html.classList.add('is-desktop');
        }
    }

    /**
     * 加载必要的polyfills
     */
    async loadPolyfills() {
        const polyfills = [];

        // CSS Variables polyfill for IE
        if (!this.features.cssVariables) {
            polyfills.push(this.loadCSSVariablesPolyfill());
        }

        // Fetch polyfill
        if (!this.features.fetch) {
            polyfills.push(this.loadFetchPolyfill());
        }

        // Promises polyfill
        if (!this.features.promises) {
            polyfills.push(this.loadPromisesPolyfill());
        }

        // Intersection Observer polyfill
        if (!this.features.intersectionObserver) {
            polyfills.push(this.loadIntersectionObserverPolyfill());
        }

        // 等待所有polyfills加载完成
        await Promise.all(polyfills);
    }

    /**
     * CSS Variables polyfill
     */
    loadCSSVariablesPolyfill() {
        return new Promise((resolve) => {
            // 简单的CSS变量polyfill实现
            const cssVarsPonyfill = {
                init: () => {
                    const sheets = document.styleSheets;
                    const cssVars = {};
                    
                    // 提取CSS变量
                    for (let sheet of sheets) {
                        try {
                            const rules = sheet.cssRules || sheet.rules;
                            for (let rule of rules) {
                                if (rule.selectorText === ':root') {
                                    const style = rule.style;
                                    for (let i = 0; i < style.length; i++) {
                                        const prop = style[i];
                                        if (prop.startsWith('--')) {
                                            cssVars[prop] = style.getPropertyValue(prop);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // 跨域样式表访问限制
                        }
                    }
                    
                    // 替换var()函数
                    this.replaceCSSVars(cssVars);
                    resolve();
                }
            };
            
            cssVarsPonyfill.init();
        });
    }

    /**
     * 替换CSS变量
     */
    replaceCSSVars(cssVars) {
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            const computedStyle = getComputedStyle(element);
            const styles = {};
            
            // 检查所有样式属性
            for (let prop of computedStyle) {
                const value = computedStyle.getPropertyValue(prop);
                if (value.includes('var(')) {
                    const varMatch = value.match(/var\((--[^,)]+)(?:,([^)]+))?\)/g);
                    if (varMatch) {
                        let newValue = value;
                        varMatch.forEach(varCall => {
                            const varName = varCall.match(/var\((--[^,)]+)/)[1];
                            const fallback = varCall.match(/,([^)]+)\)/);
                            const replacement = cssVars[varName] || (fallback ? fallback[1].trim() : '');
                            newValue = newValue.replace(varCall, replacement);
                        });
                        styles[prop] = newValue;
                    }
                }
            }
            
            // 应用替换后的样式
            Object.keys(styles).forEach(prop => {
                element.style.setProperty(prop, styles[prop]);
            });
        });
    }

    /**
     * Fetch polyfill
     */
    loadFetchPolyfill() {
        return new Promise((resolve) => {
            if (typeof fetch === 'undefined') {
                window.fetch = function(url, options = {}) {
                    return new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open(options.method || 'GET', url);
                        
                        // 设置请求头
                        if (options.headers) {
                            Object.keys(options.headers).forEach(key => {
                                xhr.setRequestHeader(key, options.headers[key]);
                            });
                        }
                        
                        xhr.onload = () => {
                            const response = {
                                ok: xhr.status >= 200 && xhr.status < 300,
                                status: xhr.status,
                                statusText: xhr.statusText,
                                json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                                text: () => Promise.resolve(xhr.responseText)
                            };
                            resolve(response);
                        };
                        
                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.send(options.body);
                    });
                };
            }
            resolve();
        });
    }

    /**
     * Promises polyfill
     */
    loadPromisesPolyfill() {
        return new Promise((resolve) => {
            if (typeof Promise === 'undefined') {
                // 简单的Promise polyfill
                window.Promise = function(executor) {
                    const self = this;
                    self.state = 'pending';
                    self.value = undefined;
                    self.handlers = [];
                    
                    function resolve(value) {
                        if (self.state === 'pending') {
                            self.state = 'fulfilled';
                            self.value = value;
                            self.handlers.forEach(handler => handler.onFulfilled(value));
                        }
                    }
                    
                    function reject(reason) {
                        if (self.state === 'pending') {
                            self.state = 'rejected';
                            self.value = reason;
                            self.handlers.forEach(handler => handler.onRejected(reason));
                        }
                    }
                    
                    self.then = function(onFulfilled, onRejected) {
                        return new Promise((resolve, reject) => {
                            function handle() {
                                if (self.state === 'fulfilled') {
                                    if (onFulfilled) {
                                        try {
                                            resolve(onFulfilled(self.value));
                                        } catch (e) {
                                            reject(e);
                                        }
                                    } else {
                                        resolve(self.value);
                                    }
                                } else if (self.state === 'rejected') {
                                    if (onRejected) {
                                        try {
                                            resolve(onRejected(self.value));
                                        } catch (e) {
                                            reject(e);
                                        }
                                    } else {
                                        reject(self.value);
                                    }
                                } else {
                                    self.handlers.push({
                                        onFulfilled: onFulfilled,
                                        onRejected: onRejected
                                    });
                                }
                            }
                            handle();
                        });
                    };
                    
                    try {
                        executor(resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                };
                
                Promise.resolve = function(value) {
                    return new Promise(resolve => resolve(value));
                };
                
                Promise.reject = function(reason) {
                    return new Promise((resolve, reject) => reject(reason));
                };
            }
            resolve();
        });
    }

    /**
     * Intersection Observer polyfill
     */
    loadIntersectionObserverPolyfill() {
        return new Promise((resolve) => {
            if (typeof IntersectionObserver === 'undefined') {
                // 简单的Intersection Observer polyfill
                window.IntersectionObserver = function(callback, options = {}) {
                    this.callback = callback;
                    this.options = options;
                    this.targets = [];
                    
                    this.observe = (target) => {
                        this.targets.push(target);
                        this.checkIntersection();
                    };
                    
                    this.unobserve = (target) => {
                        this.targets = this.targets.filter(t => t !== target);
                    };
                    
                    this.disconnect = () => {
                        this.targets = [];
                    };
                    
                    this.checkIntersection = () => {
                        const entries = this.targets.map(target => {
                            const rect = target.getBoundingClientRect();
                            const isIntersecting = rect.top < window.innerHeight && rect.bottom > 0;
                            
                            return {
                                target: target,
                                isIntersecting: isIntersecting,
                                intersectionRatio: isIntersecting ? 1 : 0,
                                boundingClientRect: rect
                            };
                        });
                        
                        this.callback(entries);
                    };
                    
                    // 定期检查交集
                    setInterval(() => this.checkIntersection(), 100);
                };
            }
            resolve();
        });
    }

    /**
     * 应用回退方案
     */
    applyFallbacks() {
        // CSS Grid回退到Flexbox
        if (!this.features.cssGrid) {
            this.applyGridFallback();
        }

        // CSS Variables回退
        if (!this.features.cssVariables) {
            this.applyCSSVariablesFallback();
        }

        // 动画回退
        if (!this.features.animations || !this.features.transitions) {
            this.applyAnimationFallback();
        }
    }

    /**
     * CSS Grid回退方案
     */
    applyGridFallback() {
        const style = document.createElement('style');
        style.textContent = `
            .no-cssGrid .grid {
                display: flex;
                flex-wrap: wrap;
            }
            
            .no-cssGrid .grid-cols-1 > * { flex: 0 0 100%; }
            .no-cssGrid .grid-cols-2 > * { flex: 0 0 50%; }
            .no-cssGrid .grid-cols-3 > * { flex: 0 0 33.333%; }
            .no-cssGrid .grid-cols-4 > * { flex: 0 0 25%; }
            .no-cssGrid .grid-cols-6 > * { flex: 0 0 16.666%; }
            .no-cssGrid .grid-cols-12 > * { flex: 0 0 8.333%; }
        `;
        document.head.appendChild(style);
    }

    /**
     * CSS Variables回退方案
     */
    applyCSSVariablesFallback() {
        const style = document.createElement('style');
        style.textContent = `
            .no-cssVariables {
                --primary-500: #0ea5e9;
                --neutral-100: #f5f5f5;
                --neutral-200: #e5e5e5;
                --neutral-600: #525252;
                --neutral-900: #171717;
                --success-500: #22c55e;
                --warning-500: #f59e0b;
                --error-500: #ef4444;
            }
            
            .no-cssVariables .btn-primary {
                background-color: #0ea5e9;
            }
            
            .no-cssVariables .card {
                background-color: #ffffff;
                border-color: #e5e5e5;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 动画回退方案
     */
    applyAnimationFallback() {
        const style = document.createElement('style');
        style.textContent = `
            .no-animations *,
            .no-transitions * {
                animation-duration: 0s !important;
                transition-duration: 0s !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听窗口大小变化
        window.addEventListener('resize', this.debounce(() => {
            this.updateViewportClasses();
        }, 250));

        // 监听方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateViewportClasses();
            }, 100);
        });
    }

    /**
     * 更新视口相关的CSS类
     */
    updateViewportClasses() {
        const html = document.documentElement;
        
        // 移除旧的视口类
        html.classList.remove('is-mobile', 'is-tablet', 'is-desktop');
        
        // 添加新的视口类
        if (this.isMobile()) {
            html.classList.add('is-mobile');
        } else if (this.isTablet()) {
            html.classList.add('is-tablet');
        } else {
            html.classList.add('is-desktop');
        }
    }

    /**
     * 检测是否为移动设备
     */
    isMobile() {
        return window.innerWidth <= 767;
    }

    /**
     * 检测是否为平板设备
     */
    isTablet() {
        return window.innerWidth >= 768 && window.innerWidth <= 1023;
    }

    /**
     * 检测是否为桌面设备
     */
    isDesktop() {
        return window.innerWidth >= 1024;
    }

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 获取浏览器信息
     */
    getBrowserInfo() {
        return this.browserInfo;
    }

    /**
     * 获取特性支持信息
     */
    getFeatures() {
        return this.features;
    }

    /**
     * 检查特定特性是否支持
     */
    supports(feature) {
        return this.features[feature] || false;
    }

    /**
     * 获取兼容性报告
     */
    getCompatibilityReport() {
        return {
            browser: this.browserInfo,
            features: this.features,
            recommendations: this.getRecommendations()
        };
    }

    /**
     * 获取兼容性建议
     */
    getRecommendations() {
        const recommendations = [];

        if (this.browserInfo.name === 'ie') {
            recommendations.push('建议升级到现代浏览器以获得更好的体验');
        }

        if (!this.features.cssVariables) {
            recommendations.push('您的浏览器不支持CSS变量，某些主题功能可能受限');
        }

        if (!this.features.cssGrid) {
            recommendations.push('您的浏览器不支持CSS Grid，布局将使用Flexbox回退方案');
        }

        if (!this.features.fetch) {
            recommendations.push('您的浏览器不支持Fetch API，将使用XMLHttpRequest');
        }

        return recommendations;
    }
}

// 全局实例
window.BrowserCompatibility = BrowserCompatibility;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.browserCompat = new BrowserCompatibility();
    
    // 在控制台输出兼容性报告
    console.log('浏览器兼容性报告:', window.browserCompat.getCompatibilityReport());
});

export default BrowserCompatibility;
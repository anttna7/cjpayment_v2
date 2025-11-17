/**
 * 性能优化加载器
 * 延迟加载非关键JavaScript文件以提升首屏性能
 */

(function() {
    'use strict';

    const PerformanceLoader = {
        // 加载队列
        loadQueue: [],
        // 已加载的文件
        loadedFiles: new Set(),
        // 性能监控
        metrics: {
            startTime: performance.now(),
            loadTimes: {}
        },

        /**
         * 延迟加载脚本
         * @param {string} src - 脚本路径
         * @param {Object} options - 配置选项
         * @returns {Promise}
         */
        loadScript(src, options = {}) {
            return new Promise((resolve, reject) => {
                // 检查是否已加载
                if (this.loadedFiles.has(src)) {
                    resolve();
                    return;
                }

                const startTime = performance.now();
                const script = document.createElement('script');
                
                script.src = src;
                script.async = options.async !== false;
                script.defer = options.defer || false;
                
                script.onload = () => {
                    this.loadedFiles.add(src);
                    const loadTime = performance.now() - startTime;
                    this.metrics.loadTimes[src] = loadTime;
                    console.log(`✅ Loaded: ${src} (${loadTime.toFixed(2)}ms)`);
                    resolve();
                };
                
                script.onerror = (error) => {
                    console.error(`❌ Failed to load: ${src}`, error);
                    reject(error);
                };
                
                document.head.appendChild(script);
            });
        },

        /**
         * 延迟加载CSS
         * @param {string} href - CSS路径
         * @returns {Promise}
         */
        loadCSS(href) {
            return new Promise((resolve, reject) => {
                if (this.loadedFiles.has(href)) {
                    resolve();
                    return;
                }

                const startTime = performance.now();
                const link = document.createElement('link');
                
                link.rel = 'stylesheet';
                link.href = href;
                
                link.onload = () => {
                    this.loadedFiles.add(href);
                    const loadTime = performance.now() - startTime;
                    this.metrics.loadTimes[href] = loadTime;
                    console.log(`✅ CSS Loaded: ${href} (${loadTime.toFixed(2)}ms)`);
                    resolve();
                };
                
                link.onerror = (error) => {
                    console.error(`❌ CSS Failed to load: ${href}`, error);
                    reject(error);
                };
                
                document.head.appendChild(link);
            });
        },

        /**
         * 批量加载资源
         * @param {Array} resources - 资源列表
         * @param {Object} options - 配置选项
         */
        async loadResources(resources, options = {}) {
            const { concurrent = 3, priority = 'normal' } = options;
            
            if (priority === 'high') {
                // 高优先级：并行加载
                return Promise.all(resources.map(resource => {
                    if (resource.endsWith('.css')) {
                        return this.loadCSS(resource);
                    } else {
                        return this.loadScript(resource);
                    }
                }));
            } else {
                // 普通优先级：限制并发数
                const chunks = this.chunkArray(resources, concurrent);
                for (const chunk of chunks) {
                    await Promise.all(chunk.map(resource => {
                        if (resource.endsWith('.css')) {
                            return this.loadCSS(resource);
                        } else {
                            return this.loadScript(resource);
                        }
                    }));
                }
            }
        },

        /**
         * 根据页面类型加载对应资源
         * @param {string} pageType - 页面类型
         */
        loadPageResources(pageType) {
            const resourceMap = {
                dashboard: [
                    '/static/js/dashboard-enhanced.js',
                    '/static/css/dashboard-enhanced.css'
                ],
                merchant: [
                    '/static/js/merchant-management-enhanced.js',
                    '/static/css/merchant-management-enhanced.css'
                ],
                accounts: [
                    '/static/js/account-management-enhanced.js',
                    '/static/css/account-management-enhanced.css'
                ],
                audit: [
                    '/static/js/financial-audit-enhanced.js',
                    '/static/css/financial-audit-enhanced.css'
                ],
                reports: [
                    '/static/js/report_dashboard.js',
                    '/static/css/report_dashboard.css'
                ],
                system: [
                    '/static/js/system_management.js',
                    '/static/css/system_management.css'
                ]
            };

            const resources = resourceMap[pageType] || [];
            if (resources.length > 0) {
                this.loadResources(resources, { priority: 'high' });
            }
        },

        /**
         * 智能预加载
         * 根据用户行为预测并预加载可能需要的资源
         */
        setupIntelligentPreloading() {
            // 获取当前页面类型，避免预加载当前页面资源
            const currentPage = this.getCurrentPageType();
            
            // 监听鼠标悬停在导航链接上
            document.addEventListener('mouseover', (e) => {
                const navLink = e.target.closest('.nav__link');
                if (navLink && navLink.dataset.route) {
                    const route = navLink.dataset.route;
                    
                    // 避免预加载当前页面的资源
                    if (route === currentPage) {
                        return;
                    }
                    
                    // 延迟预加载，仅预加载JavaScript文件，避免CSS样式冲突
                    setTimeout(() => {
                        this.loadPageJSOnly(route);
                    }, 200);
                }
            });

            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    // 页面重新可见时，预加载常用资源
                    this.preloadCommonResources();
                }
            });
        },

        /**
         * 获取当前页面类型
         */
        getCurrentPageType() {
            const path = window.location.pathname;
            if (path.includes('dashboard')) return 'dashboard';
            if (path.includes('merchant')) return 'merchant';
            if (path.includes('accounts')) return 'accounts';
            if (path.includes('audit')) return 'audit';
            if (path.includes('reports')) return 'reports';
            if (path.includes('system')) return 'system';
            return 'dashboard'; // 默认
        },

        /**
         * 仅预加载JavaScript文件，避免CSS样式冲突
         */
        loadPageJSOnly(pageType) {
            const jsResourceMap = {
                dashboard: ['/static/js/dashboard-enhanced.js'],
                merchant: ['/static/js/merchant-management-enhanced.js'],
                accounts: ['/static/js/account-management-enhanced.js'],
                audit: ['/static/js/financial-audit-enhanced.js'],
                reports: ['/static/js/report_dashboard.js'],
                system: ['/static/js/system_management.js']
            };

            const jsResources = jsResourceMap[pageType] || [];
            if (jsResources.length > 0) {
                console.log(`🚀 预加载 ${pageType} 页面JavaScript资源`);
                
                // 低优先级预加载，避免影响当前页面性能
                jsResources.forEach(src => {
                    if (!this.loadedFiles.has(src)) {
                        this.loadScript(src, { 
                            priority: 'low',
                            preload: true // 标记为预加载
                        });
                    }
                });
            }
        },

        /**
         * 预加载常用资源
         */
        preloadCommonResources() {
            const commonResources = [
                '/static/js/components.js',
                '/static/js/toast-enhanced.js',
                '/static/js/modal-component.js'
            ];

            this.loadResources(commonResources, { 
                priority: 'normal',
                concurrent: 2 
            });
        },

        /**
         * 数组分块
         */
        chunkArray(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        },

        /**
         * 获取性能报告
         */
        getPerformanceReport() {
            const totalTime = performance.now() - this.metrics.startTime;
            const avgLoadTime = Object.values(this.metrics.loadTimes)
                .reduce((sum, time) => sum + time, 0) / Object.keys(this.metrics.loadTimes).length;

            return {
                totalTime: totalTime.toFixed(2),
                averageLoadTime: avgLoadTime.toFixed(2),
                filesLoaded: this.loadedFiles.size,
                loadTimes: this.metrics.loadTimes
            };
        },

        /**
         * 初始化
         */
        init() {
            console.log('🚀 Performance Loader initialized');
            
            // 设置智能预加载
            this.setupIntelligentPreloading();
            
            // 预加载常用资源
            setTimeout(() => {
                this.preloadCommonResources();
            }, 1000);

            // 根据当前页面加载对应资源
            const currentPage = document.body.dataset.page || this.getCurrentPageType();
            if (currentPage) {
                console.log(`📄 Current page: ${currentPage}`);
                this.loadPageResources(currentPage);
            }

            // 5秒后输出性能报告
            setTimeout(() => {
                const report = this.getPerformanceReport();
                console.log('📊 Performance Report:', report);
            }, 5000);
        }
    };

    // 导出到全局
    window.PerformanceLoader = PerformanceLoader;

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            PerformanceLoader.init();
        });
    } else {
        PerformanceLoader.init();
    }

})();
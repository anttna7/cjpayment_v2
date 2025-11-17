
// 修复fetch错误处理
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
        // 静默处理analytics上传失败
        if (args[0] && args[0].includes('/api/analytics')) {
            console.warn('⚠️ Analytics数据上传失败，但不影响页面功能');
            return Promise.resolve({ ok: false, status: 0 });
        }
        throw error;
    });
};/**
 * 用户反馈和体验分析系统
 * 
 * 提供用户行为追踪、反馈收集、性能监控、体验分析等功能
 * 版本：v1.0.0
 */

class UserFeedbackAnalytics {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/feedback',
            analyticsEndpoint: '/api/analytics',
            enableBehaviorTracking: true,
            enablePerformanceMonitoring: true,
            enableHeatmaps: true,
            enableUserJourney: true,
            enableA_B_Testing: false,
            sessionTimeout: 30 * 60 * 1000, // 30分钟
            batchSize: 10,
            flushInterval: 30000, // 30秒
            ...options
        };

        this.state = {
            sessionId: this.generateSessionId(),
            userId: null,
            pageLoadTime: performance.now(),
            interactions: [],
            performanceMetrics: {},
            feedbackQueue: [],
            isTracking: false
        };

        this.init();
    }

    /**
     * 初始化分析系统
     */
    async init() {
        try {
            console.log('User Feedback Analytics: Initializing...');

            // 初始化会话跟踪
            this.initSessionTracking();

            // 初始化行为跟踪
            if (this.options.enableBehaviorTracking) {
                this.initBehaviorTracking();
            }

            // 初始化性能监控
            if (this.options.enablePerformanceMonitoring) {
                this.initPerformanceMonitoring();
            }

            // 初始化反馈收集器
            this.initFeedbackCollector();

            // 初始化热力图
            if (this.options.enableHeatmaps) {
                this.initHeatmaps();
            }

            // 初始化用户旅程跟踪
            if (this.options.enableUserJourney) {
                this.initUserJourney();
            }

            // 设置数据上传定时器
            this.initDataUpload();

            // 监听页面卸载
            this.initUnloadHandlers();

            this.state.isTracking = true;
            console.log('User Feedback Analytics: Initialized successfully');
        } catch (error) {
            console.error('User Feedback Analytics: Initialization failed', error);
        }
    }

    /**
     * 生成会话ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 初始化会话跟踪
     */
    initSessionTracking() {
        // 设置用户ID（如果已登录）
        const userInfo = this.getUserInfo();
        if (userInfo) {
            this.state.userId = userInfo.id;
        }

        // 记录会话开始
        this.trackEvent('session_start', {
            sessionId: this.state.sessionId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer,
            url: window.location.href
        });

        // 会话超时检测
        this.sessionTimer = setInterval(() => {
            this.checkSessionTimeout();
        }, 60000); // 每分钟检查一次
    }

    /**
     * 初始化行为跟踪
     */
    initBehaviorTracking() {
        // 点击事件跟踪
        document.addEventListener('click', (event) => {
            this.trackInteraction('click', event);
        });

        // 表单交互跟踪
        document.addEventListener('input', (event) => {
            if (event.target.type !== 'password') {
                this.trackInteraction('input', event);
            }
        });

        // 滚动行为跟踪
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackInteraction('scroll', {
                    scrollY: window.scrollY,
                    scrollX: window.scrollX,
                    scrollHeight: document.documentElement.scrollHeight,
                    windowHeight: window.innerHeight
                });
            }, 100);
        });

        // 页面停留时间跟踪
        this.initPageDwellTime();

        // 错误跟踪
        this.initErrorTracking();
    }

    /**
     * 跟踪用户交互
     */
    trackInteraction(type, event) {
        const interaction = {
            type,
            timestamp: Date.now(),
            sessionId: this.state.sessionId,
            url: window.location.href,
            data: this.extractEventData(type, event)
        };

        this.state.interactions.push(interaction);

        // 立即跟踪重要交互
        if (['error', 'form_submit', 'navigation'].includes(type)) {
            this.sendEvent(interaction);
        }
    }

    /**
     * 提取事件数据
     */
    extractEventData(type, event) {
        const data = { type };

        if (type === 'click' && event.target) {
            const target = event.target;
            data.element = {
                tagName: target.tagName,
                className: target.className,
                id: target.id,
                text: target.textContent?.substring(0, 100),
                selector: this.getElementSelector(target),
                position: {
                    x: event.clientX,
                    y: event.clientY
                }
            };
        } else if (type === 'input' && event.target) {
            const target = event.target;
            data.element = {
                tagName: target.tagName,
                type: target.type,
                name: target.name,
                id: target.id,
                selector: this.getElementSelector(target)
            };
        } else if (type === 'scroll') {
            data.scroll = event;
        }

        return data;
    }

    /**
     * 获取元素选择器
     */
    getElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            return `.${element.className.split(' ')[0]}`;
        }
        
        let path = element.tagName.toLowerCase();
        let parent = element.parentElement;
        
        while (parent) {
            const index = Array.from(parent.children).indexOf(element) + 1;
            path = `${parent.tagName.toLowerCase()}:nth-child(${index}) > ${path}`;
            
            if (parent.id) {
                path = `#${parent.id} > ${path}`;
                break;
            }
            
            element = parent;
            parent = parent.parentElement;
        }
        
        return path;
    }

    /**
     * 初始化页面停留时间跟踪
     */
    initPageDwellTime() {
        this.pageStartTime = Date.now();
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackPageDwell();
            } else {
                this.pageStartTime = Date.now();
            }
        });

        // 页面可见性变化时记录停留时间（替代beforeunload）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.trackPageDwell();
            }
        });
    }

    /**
     * 跟踪页面停留时间
     */
    trackPageDwell() {
        const dwellTime = Date.now() - this.pageStartTime;
        if (dwellTime > 1000) { // 只记录超过1秒的停留
            this.trackEvent('page_dwell', {
                url: window.location.href,
                dwellTime,
                title: document.title
            });
        }
    }

    /**
     * 初始化错误跟踪
     */
    initErrorTracking() {
        // JavaScript错误
        window.addEventListener('error', (event) => {
            this.trackEvent('javascript_error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                url: window.location.href
            });
        });

        // Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.trackEvent('promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack,
                url: window.location.href
            });
        });

        // 网络错误
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                if (!response.ok) {
                    this.trackEvent('api_error', {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText
                    });
                }
                return response;
            } catch (error) {
                this.trackEvent('network_error', {
                    url: args[0],
                    error: error.message
                });
                throw error;
            }
        };
    }

    /**
     * 初始化性能监控
     */
    initPerformanceMonitoring() {
        // 页面加载性能
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.collectPerformanceMetrics();
            }, 1000);
        });

        // Web Vitals
        this.initWebVitals();

        // 资源加载监控
        this.initResourceMonitoring();
    }

    /**
     * 收集性能指标
     */
    collectPerformanceMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');

        const metrics = {
            // 页面加载时间
            pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
            // DOM内容加载时间
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            // 首次绘制时间
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            // 首次内容绘制时间
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            // DNS查询时间
            dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            // TCP连接时间
            tcpConnect: navigation.connectEnd - navigation.connectStart,
            // 服务器响应时间
            serverResponse: navigation.responseEnd - navigation.requestStart,
            // 内存使用情况
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null
        };

        this.state.performanceMetrics = metrics;
        this.trackEvent('performance_metrics', metrics);
    }

    /**
     * 初始化Web Vitals监控
     */
    initWebVitals() {
        // 累积布局偏移 (CLS)
        let clsValue = 0;
        let clsEntries = [];

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                    clsEntries.push(entry);
                }
            }
        });

        if ('PerformanceObserver' in window) {
            observer.observe({ type: 'layout-shift', buffered: true });
        }

        // 在页面可见性变化时发送CLS数据（替代beforeunload）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && clsValue > 0) {
                this.trackEvent('web_vitals', {
                    metric: 'CLS',
                    value: clsValue,
                    entries: clsEntries.length
                });
            }
        });
    }

    /**
     * 初始化资源加载监控
     */
    initResourceMonitoring() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                // 监控慢加载资源
                if (entry.duration > 1000) {
                    this.trackEvent('slow_resource', {
                        name: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize,
                        type: entry.initiatorType
                    });
                }
            }
        });

        if ('PerformanceObserver' in window) {
            observer.observe({ entryTypes: ['resource'] });
        }
    }

    /**
     * 初始化反馈收集器
     */
    initFeedbackCollector() {
        this.createFeedbackWidget();
        this.initFeedbackEvents();
    }

    /**
     * 创建反馈组件
     */
    createFeedbackWidget() {
        const feedbackHtml = `
            <div class="feedback-widget" id="feedbackWidget">
                <button class="feedback-trigger" id="feedbackTrigger" title="意见反馈">
                    <span class="feedback-icon">💬</span>
                </button>
                
                <div class="feedback-panel" id="feedbackPanel">
                    <div class="feedback-header">
                        <h3>意见反馈</h3>
                        <button class="feedback-close" id="feedbackClose">✕</button>
                    </div>
                    
                    <div class="feedback-content">
                        <div class="feedback-rating">
                            <label>整体满意度：</label>
                            <div class="rating-stars" id="ratingStars">
                                <span class="star" data-rating="1">⭐</span>
                                <span class="star" data-rating="2">⭐</span>
                                <span class="star" data-rating="3">⭐</span>
                                <span class="star" data-rating="4">⭐</span>
                                <span class="star" data-rating="5">⭐</span>
                            </div>
                        </div>
                        
                        <div class="feedback-category">
                            <label>问题类型：</label>
                            <select id="feedbackCategory">
                                <option value="">请选择</option>
                                <option value="bug">功能异常</option>
                                <option value="ui">界面问题</option>
                                <option value="performance">性能问题</option>
                                <option value="feature">功能建议</option>
                                <option value="other">其他</option>
                            </select>
                        </div>
                        
                        <div class="feedback-message">
                            <label>详细描述：</label>
                            <textarea id="feedbackMessage" placeholder="请详细描述您遇到的问题或建议..."></textarea>
                        </div>
                        
                        <div class="feedback-contact">
                            <label>联系方式（可选）：</label>
                            <input type="email" id="feedbackContact" placeholder="邮箱地址">
                        </div>
                        
                        <div class="feedback-screenshot">
                            <label>
                                <input type="checkbox" id="includeScreenshot">
                                包含当前页面截图
                            </label>
                        </div>
                    </div>
                    
                    <div class="feedback-actions">
                        <button class="btn btn-outline" id="feedbackCancel">取消</button>
                        <button class="btn btn-primary" id="feedbackSubmit">提交反馈</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', feedbackHtml);
        this.injectFeedbackStyles();
    }

    /**
     * 注入反馈组件样式
     */
    injectFeedbackStyles() {
        const styles = `
            <style>
            .feedback-widget {
                position: fixed;
                bottom: 100px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .feedback-trigger {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }
            
            .feedback-trigger:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
            }
            
            .feedback-panel {
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 360px;
                max-width: calc(100vw - 40px);
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                border: 1px solid #e5e7eb;
                display: none;
                max-height: calc(100vh - 200px);
                overflow-y: auto;
                z-index: 10001;
            }
            
            .feedback-header {
                padding: 20px 20px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e5e7eb;
                margin-bottom: 20px;
            }
            
            .feedback-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
            }
            
            .feedback-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6b7280;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .feedback-content {
                padding: 0 20px 20px;
            }
            
            .feedback-content label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #374151;
                font-size: 14px;
            }
            
            .feedback-rating {
                margin-bottom: 20px;
            }
            
            .rating-stars {
                display: flex;
                gap: 4px;
            }
            
            .star {
                cursor: pointer;
                font-size: 20px;
                transition: all 0.2s ease;
                filter: grayscale(100%);
            }
            
            .star:hover,
            .star.active {
                filter: none;
                transform: scale(1.1);
            }
            
            .feedback-category,
            .feedback-message,
            .feedback-contact {
                margin-bottom: 20px;
            }
            
            .feedback-category select,
            .feedback-contact input {
                width: 100%;
                padding: 10px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .feedback-message textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                min-height: 80px;
                resize: vertical;
                font-family: inherit;
            }
            
            .feedback-screenshot {
                margin-bottom: 20px;
            }
            
            .feedback-screenshot label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }
            
            .feedback-actions {
                padding: 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            
            .feedback-actions .btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
                transition: all 0.2s ease;
            }
            
            .feedback-actions .btn:hover {
                background: #f9fafb;
                border-color: #9ca3af;
            }
            
            .feedback-actions .btn-primary {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .feedback-actions .btn-primary:hover {
                background: #5a67d8;
                border-color: #5a67d8;
            }
            
            @media (max-width: 480px) {
                .feedback-panel {
                    width: calc(100vw - 40px);
                    right: 20px;
                    left: 20px;
                }
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * 初始化反馈事件
     */
    initFeedbackEvents() {
        const trigger = document.getElementById('feedbackTrigger');
        const panel = document.getElementById('feedbackPanel');
        const close = document.getElementById('feedbackClose');
        const cancel = document.getElementById('feedbackCancel');
        const submit = document.getElementById('feedbackSubmit');
        const stars = document.querySelectorAll('.star');

        // 显示/隐藏面板
        trigger.addEventListener('click', () => {
            const isVisible = panel.style.display === 'block' || (panel.style.display === '' && window.getComputedStyle(panel).display !== 'none');
            panel.style.display = isVisible ? 'none' : 'block';
        });

        close.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        cancel.addEventListener('click', () => {
            panel.style.display = 'none';
            this.resetFeedbackForm();
        });

        // 评星交互
        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.setRating(rating);
            });
        });

        // 提交反馈
        submit.addEventListener('click', () => {
            this.submitFeedback();
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.feedback-widget')) {
                panel.style.display = 'none';
            }
        });
    }

    /**
     * 设置评分
     */
    setRating(rating) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        this.currentRating = rating;
    }

    /**
     * 提交反馈
     */
    async submitFeedback() {
        const category = document.getElementById('feedbackCategory').value;
        const message = document.getElementById('feedbackMessage').value.trim();
        const contact = document.getElementById('feedbackContact').value.trim();
        const includeScreenshot = document.getElementById('includeScreenshot').checked;

        if (!this.currentRating) {
            this.showToast('请选择满意度评分', 'warning');
            return;
        }

        if (!message) {
            this.showToast('请填写详细描述', 'warning');
            return;
        }

        const feedback = {
            sessionId: this.state.sessionId,
            userId: this.state.userId,
            rating: this.currentRating,
            category,
            message,
            contact,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            screenshot: null
        };

        try {
            // 包含截图
            if (includeScreenshot) {
                feedback.screenshot = await this.captureScreenshot();
            }

            await this.sendFeedback(feedback);
            this.showToast('反馈提交成功，感谢您的建议！', 'success');
            document.getElementById('feedbackPanel').style.display = 'none';
            this.resetFeedbackForm();
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            this.showToast('反馈提交失败，请稍后重试', 'error');
        }
    }

    /**
     * 捕获屏幕截图
     */
    async captureScreenshot() {
        try {
            // 使用html2canvas库捕获截图
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(document.body);
                return canvas.toDataURL('image/png');
            }
            return null;
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return null;
        }
    }

    /**
     * 重置反馈表单
     */
    resetFeedbackForm() {
        document.getElementById('feedbackCategory').value = '';
        document.getElementById('feedbackMessage').value = '';
        document.getElementById('feedbackContact').value = '';
        document.getElementById('includeScreenshot').checked = false;
        document.querySelectorAll('.star').forEach(star => {
            star.classList.remove('active');
        });
        this.currentRating = 0;
    }

    /**
     * 初始化热力图
     */
    initHeatmaps() {
        this.heatmapData = [];
        
        // 收集点击热力图数据
        document.addEventListener('click', (event) => {
            this.heatmapData.push({
                x: event.clientX,
                y: event.clientY,
                timestamp: Date.now(),
                url: window.location.href
            });
            
            // 限制数据量
            if (this.heatmapData.length > 1000) {
                this.heatmapData = this.heatmapData.slice(-500);
            }
        });

        // 定期上传热力图数据
        setInterval(() => {
            if (this.heatmapData.length > 0) {
                this.sendHeatmapData([...this.heatmapData]);
                this.heatmapData = [];
            }
        }, 60000); // 每分钟上传一次
    }

    /**
     * 初始化用户旅程跟踪
     */
    initUserJourney() {
        this.userJourney = [];
        
        // 跟踪页面访问
        this.trackJourneyStep('page_visit', {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer
        });

        // 监听路由变化（SPA）
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(() => {
                window.userAnalytics?.trackJourneyStep('navigation', {
                    url: window.location.href,
                    title: document.title,
                    method: 'pushState'
                });
            }, 0);
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(() => {
                window.userAnalytics?.trackJourneyStep('navigation', {
                    url: window.location.href,
                    title: document.title,
                    method: 'replaceState'
                });
            }, 0);
        };

        window.addEventListener('popstate', () => {
            this.trackJourneyStep('navigation', {
                url: window.location.href,
                title: document.title,
                method: 'popstate'
            });
        });
    }

    /**
     * 跟踪用户旅程步骤
     */
    trackJourneyStep(action, data) {
        const step = {
            action,
            data,
            timestamp: Date.now(),
            sessionId: this.state.sessionId,
            sequence: this.userJourney.length + 1
        };

        this.userJourney.push(step);
        
        // 限制旅程长度
        if (this.userJourney.length > 100) {
            this.userJourney = this.userJourney.slice(-50);
        }
    }

    /**
     * 初始化数据上传
     */
    initDataUpload() {
        // 定期批量上传数据
        this.uploadTimer = setInterval(() => {
            this.flushData();
        }, this.options.flushInterval);
    }

    /**
     * 批量上传数据
     */
    async flushData() {
        if (!this.state.isTracking) return;

        const data = {
            sessionId: this.state.sessionId,
            userId: this.state.userId,
            interactions: this.state.interactions.splice(0, this.options.batchSize),
            userJourney: this.userJourney.splice(0, this.options.batchSize),
            timestamp: Date.now()
        };

        if (data.interactions.length > 0 || data.userJourney.length > 0) {
            try {
                await this.sendAnalyticsData(data);
            } catch (error) {
                console.error('Failed to upload analytics data:', error);
                // 重新加入队列
                this.state.interactions.unshift(...data.interactions);
                this.userJourney.unshift(...data.userJourney);
            }
        }
    }

    /**
     * 初始化页面卸载处理
     */
    initUnloadHandlers() {
        // 页面隐藏时发送数据（替代beforeunload）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.trackEvent('session_end', {
                    sessionId: this.state.sessionId,
                    duration: Date.now() - this.state.pageLoadTime
                });

                // 立即发送剩余数据
                this.flushData();
            }
        });

        // 保持原有的页面隐藏处理逻辑
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.flushData();
            }
        });
    }

    /**
     * 跟踪事件
     */
    trackEvent(eventName, eventData) {
        const event = {
            name: eventName,
            data: eventData,
            timestamp: Date.now(),
            sessionId: this.state.sessionId,
            userId: this.state.userId,
            url: window.location.href
        };

        this.state.interactions.push(event);
    }

    /**
     * 发送单个事件
     */
    async sendEvent(event) {
        try {
            await fetch(this.options.analyticsEndpoint + '/event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event)
            });
        } catch (error) {
            console.error('Failed to send event:', error);
        }
    }

    /**
     * 发送反馈数据
     */
    async sendFeedback(feedback) {
        const response = await fetch(this.options.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedback)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * 发送分析数据
     */
    async sendAnalyticsData(data) {
        await fetch(this.options.analyticsEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
    }

    /**
     * 发送热力图数据
     */
    async sendHeatmapData(data) {
        try {
            await fetch(this.options.analyticsEndpoint + '/heatmap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.state.sessionId,
                    data,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.error('Failed to send heatmap data:', error);
        }
    }

    /**
     * 检查会话超时
     */
    checkSessionTimeout() {
        const lastActivity = Math.max(
            ...this.state.interactions.map(i => i.timestamp),
            this.state.pageLoadTime
        );

        if (Date.now() - lastActivity > this.options.sessionTimeout) {
            this.trackEvent('session_timeout', {
                sessionId: this.state.sessionId,
                lastActivity
            });
            this.endSession();
        }
    }

    /**
     * 结束会话
     */
    endSession() {
        this.state.isTracking = false;
        clearInterval(this.sessionTimer);
        clearInterval(this.uploadTimer);
        this.flushData();
    }

    /**
     * 获取用户信息
     */
    getUserInfo() {
        // 从localStorage或cookie获取用户信息
        try {
            const userInfo = localStorage.getItem('userInfo');
            return userInfo ? JSON.parse(userInfo) : null;
        } catch {
            return null;
        }
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, type);
        } else {
            alert(message);
        }
    }

    /**
     * 获取分析报告
     */
    getAnalyticsReport() {
        return {
            session: {
                id: this.state.sessionId,
                userId: this.state.userId,
                startTime: this.state.pageLoadTime,
                duration: Date.now() - this.state.pageLoadTime,
                interactions: this.state.interactions.length
            },
            performance: this.state.performanceMetrics,
            journey: this.userJourney,
            heatmap: this.heatmapData
        };
    }

    /**
     * 销毁分析系统
     */
    destroy() {
        this.endSession();
        
        // 清理DOM
        const widget = document.getElementById('feedbackWidget');
        if (widget) {
            widget.remove();
        }

        console.log('User Feedback Analytics: Destroyed');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserFeedbackAnalytics;
} else {
    window.UserFeedbackAnalytics = UserFeedbackAnalytics;
}
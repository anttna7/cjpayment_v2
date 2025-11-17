/**
 * 用户行为分析和界面使用统计系统
 * 跟踪用户交互、页面访问和使用模式
 */
class UserBehaviorMonitor {
    constructor() {
        this.events = [];
        this.session = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            pageViews: 0,
            interactions: 0
        };
        
        this.config = {
            maxEvents: 500,
            reportInterval: 30000, // 30秒上报一次
            trackClicks: true,
            trackScrolls: true,
            trackFormInteractions: true,
            trackPageViews: true,
            trackTimeOnPage: true,
            trackHeatmap: true
        };
        
        this.heatmapData = new Map();
        this.pageStartTime = Date.now();
        
        this.init();
    }

    init() {
        this.setupClickTracking();
        this.setupScrollTracking();
        this.setupFormTracking();
        this.setupPageViewTracking();
        this.setupTimeTracking();
        this.setupHeatmapTracking();
        this.setupVisibilityTracking();
        this.startReporting();
        
        console.log('User Behavior Monitor initialized');
    }

    /**
     * 生成会话ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 设置点击跟踪
     */
    setupClickTracking() {
        if (!this.config.trackClicks) return;

        document.addEventListener('click', (event) => {
            const element = event.target;
            const elementInfo = this.getElementInfo(element);
            
            this.trackEvent('click', {
                element: elementInfo,
                coordinates: {
                    x: event.clientX,
                    y: event.clientY,
                    pageX: event.pageX,
                    pageY: event.pageY
                },
                timestamp: Date.now(),
                url: window.location.href
            });

            this.session.interactions++;
        });

        // 右键点击跟踪
        document.addEventListener('contextmenu', (event) => {
            const element = event.target;
            const elementInfo = this.getElementInfo(element);
            
            this.trackEvent('rightclick', {
                element: elementInfo,
                coordinates: {
                    x: event.clientX,
                    y: event.clientY,
                    pageX: event.pageX,
                    pageY: event.pageY
                },
                timestamp: Date.now(),
                url: window.location.href
            });
        });
    }

    /**
     * 设置滚动跟踪
     */
    setupScrollTracking() {
        if (!this.config.trackScrolls) return;

        let scrollTimeout;
        let lastScrollY = window.scrollY;
        let maxScrollDepth = 0;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            const currentScrollY = window.scrollY;
            const scrollDepth = (currentScrollY + window.innerHeight) / document.body.scrollHeight;
            
            if (scrollDepth > maxScrollDepth) {
                maxScrollDepth = scrollDepth;
            }

            scrollTimeout = setTimeout(() => {
                this.trackEvent('scroll', {
                    scrollY: currentScrollY,
                    scrollDepth: Math.round(scrollDepth * 100),
                    maxScrollDepth: Math.round(maxScrollDepth * 100),
                    direction: currentScrollY > lastScrollY ? 'down' : 'up',
                    timestamp: Date.now(),
                    url: window.location.href
                });

                lastScrollY = currentScrollY;
            }, 150);
        });
    }

    /**
     * 设置表单跟踪
     */
    setupFormTracking() {
        if (!this.config.trackFormInteractions) return;

        // 表单输入跟踪
        document.addEventListener('input', (event) => {
            if (event.target.matches('input, textarea, select')) {
                const element = event.target;
                const elementInfo = this.getElementInfo(element);
                
                this.trackEvent('form_input', {
                    element: elementInfo,
                    fieldType: element.type,
                    fieldName: element.name,
                    hasValue: !!element.value,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        });

        // 表单提交跟踪
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const formInfo = this.getElementInfo(form);
            
            this.trackEvent('form_submit', {
                form: formInfo,
                timestamp: Date.now(),
                url: window.location.href
            });
        });

        // 表单焦点跟踪
        document.addEventListener('focus', (event) => {
            if (event.target.matches('input, textarea, select')) {
                const element = event.target;
                const elementInfo = this.getElementInfo(element);
                
                this.trackEvent('form_focus', {
                    element: elementInfo,
                    fieldType: element.type,
                    fieldName: element.name,
                    timestamp: Date.now(),
                    url: window.location.href
                });
            }
        }, true);
    }

    /**
     * 设置页面访问跟踪
     */
    setupPageViewTracking() {
        if (!this.config.trackPageViews) return;

        // 初始页面访问
        this.trackPageView();

        // 监听路由变化（SPA应用）
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(() => {
                window.userBehaviorMonitor?.trackPageView();
            }, 0);
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(() => {
                window.userBehaviorMonitor?.trackPageView();
            }, 0);
        };

        window.addEventListener('popstate', () => {
            setTimeout(() => {
                this.trackPageView();
            }, 0);
        });
    }

    /**
     * 跟踪页面访问
     */
    trackPageView() {
        // 记录上一页的停留时间
        if (this.pageStartTime) {
            const timeOnPage = Date.now() - this.pageStartTime;
            this.trackEvent('page_time', {
                duration: timeOnPage,
                url: window.location.href,
                timestamp: Date.now()
            });
        }

        this.pageStartTime = Date.now();
        this.session.pageViews++;

        this.trackEvent('page_view', {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height
            },
            timestamp: Date.now()
        });
    }

    /**
     * 设置时间跟踪
     */
    setupTimeTracking() {
        if (!this.config.trackTimeOnPage) return;

        // 页面卸载时记录总时间
        window.addEventListener('beforeunload', () => {
            const totalTime = Date.now() - this.session.startTime;
            const pageTime = Date.now() - this.pageStartTime;
            
            this.trackEvent('session_end', {
                sessionDuration: totalTime,
                pageTime: pageTime,
                pageViews: this.session.pageViews,
                interactions: this.session.interactions,
                timestamp: Date.now(),
                url: window.location.href
            });
        });
    }

    /**
     * 设置热力图跟踪
     */
    setupHeatmapTracking() {
        if (!this.config.trackHeatmap) return;

        document.addEventListener('mousemove', (event) => {
            const x = Math.floor(event.clientX / 10) * 10;
            const y = Math.floor(event.clientY / 10) * 10;
            const key = `${x},${y}`;
            
            this.heatmapData.set(key, (this.heatmapData.get(key) || 0) + 1);
        });

        // 定期上报热力图数据
        setInterval(() => {
            if (this.heatmapData.size > 0) {
                this.trackEvent('heatmap', {
                    data: Object.fromEntries(this.heatmapData),
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    timestamp: Date.now(),
                    url: window.location.href
                });
                
                this.heatmapData.clear();
            }
        }, 60000); // 每分钟上报一次
    }

    /**
     * 设置可见性跟踪
     */
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('visibility_change', {
                hidden: document.hidden,
                visibilityState: document.visibilityState,
                timestamp: Date.now(),
                url: window.location.href
            });
        });
    }

    /**
     * 获取元素信息
     */
    getElementInfo(element) {
        return {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            text: element.textContent?.substring(0, 100),
            href: element.href,
            src: element.src,
            type: element.type,
            name: element.name,
            value: element.type === 'password' ? '[HIDDEN]' : element.value?.substring(0, 100),
            xpath: this.getXPath(element)
        };
    }

    /**
     * 获取元素的XPath
     */
    getXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            
            const tagName = element.tagName.toLowerCase();
            const pathIndex = index > 0 ? `[${index + 1}]` : '';
            parts.unshift(`${tagName}${pathIndex}`);
            
            element = element.parentNode;
        }
        
        return parts.length ? `/${parts.join('/')}` : '';
    }

    /**
     * 跟踪事件
     */
    trackEvent(type, data) {
        if (this.events.length >= this.config.maxEvents) {
            this.events.shift();
        }

        const event = {
            type,
            data,
            sessionId: this.session.id,
            userId: this.getUserId(),
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.events.push(event);
    }

    /**
     * 获取用户ID
     */
    getUserId() {
        return localStorage.getItem('user_id') || 'anonymous';
    }

    /**
     * 开始定期上报
     */
    startReporting() {
        setInterval(() => {
            if (this.events.length > 0) {
                this.reportEvents();
            }
        }, this.config.reportInterval);

        // 页面卸载时上报
        window.addEventListener('beforeunload', () => {
            if (this.events.length > 0) {
                this.reportEvents(true);
            }
        });
    }

    /**
     * 上报事件数据
     */
    reportEvents(isBeforeUnload = false) {
        const events = [...this.events];
        const report = {
            events,
            session: this.session,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        const endpoint = '/api/monitoring/behavior';
        
        try {
            if (isBeforeUnload && navigator.sendBeacon) {
                navigator.sendBeacon(endpoint, JSON.stringify(report));
            } else {
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(report),
                    keepalive: isBeforeUnload
                }).catch(error => {
                    console.warn('Failed to report user behavior:', error);
                });
            }
        } catch (error) {
            console.warn('Failed to report user behavior:', error);
        }

        // 清理已上报的事件
        if (!isBeforeUnload) {
            this.events = [];
        }
    }

    /**
     * 获取行为统计
     */
    getBehaviorStats() {
        const stats = {
            session: this.session,
            totalEvents: this.events.length,
            eventsByType: {},
            recentEvents: this.events.slice(-10)
        };

        this.events.forEach(event => {
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * 手动跟踪自定义事件
     */
    track(eventName, properties = {}) {
        this.trackEvent('custom', {
            name: eventName,
            properties,
            timestamp: Date.now()
        });
    }

    /**
     * 销毁监控器
     */
    destroy() {
        this.events = [];
        this.heatmapData.clear();
    }
}

// 导出类
window.UserBehaviorMonitor = UserBehaviorMonitor;

// 自动初始化
if (typeof window !== 'undefined') {
    window.userBehaviorMonitor = new UserBehaviorMonitor();
}
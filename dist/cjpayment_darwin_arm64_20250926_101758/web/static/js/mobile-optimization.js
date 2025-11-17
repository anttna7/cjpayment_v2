/**
 * 移动端优化模块
 * 提供移动设备特有的交互模式和性能优化
 */

class MobileOptimization {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.isTouchDevice = this.detectTouch();
        this.orientation = this.getOrientation();
        this.viewport = this.getViewportInfo();
        
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
        this.swipeThreshold = 50;
        this.tapThreshold = 10;
        this.longPressThreshold = 500;
        
        this.init();
    }

    /**
     * 检测是否为移动设备
     */
    detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'mobile', 'android', 'iphone', 'ipod', 'blackberry', 
            'windows phone', 'opera mini', 'iemobile'
        ];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               window.innerWidth <= 767;
    }

    /**
     * 检测是否为平板设备
     */
    detectTablet() {
        const userAgent = navigator.userAgent.toLowerCase();
        const tabletKeywords = ['ipad', 'tablet', 'kindle', 'playbook', 'silk'];
        
        return tabletKeywords.some(keyword => userAgent.includes(keyword)) ||
               (window.innerWidth >= 768 && window.innerWidth <= 1024);
    }

    /**
     * 检测是否支持触摸
     */
    detectTouch() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    }

    /**
     * 获取设备方向
     */
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle;
        } else if (window.orientation !== undefined) {
            return window.orientation;
        }
        return window.innerWidth > window.innerHeight ? 90 : 0;
    }

    /**
     * 获取视口信息
     */
    getViewportInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight
        };
    }

    /**
     * 初始化移动端优化
     */
    init() {
        this.addDeviceClasses();
        this.setupViewportMeta();
        this.optimizeScrolling();
        this.setupTouchEvents();
        this.optimizeImages();
        this.setupOrientationChange();
        this.optimizePerformance();
        this.setupMobileNavigation();
        this.optimizeForms();
        this.setupGestures();
    }

    /**
     * 添加设备相关的CSS类
     */
    addDeviceClasses() {
        const html = document.documentElement;
        
        if (this.isMobile) {
            html.classList.add('is-mobile');
        }
        if (this.isTablet) {
            html.classList.add('is-tablet');
        }
        if (this.isTouchDevice) {
            html.classList.add('is-touch');
        }
        
        // 添加操作系统类
        const userAgent = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(userAgent)) {
            html.classList.add('is-ios');
        } else if (/Android/.test(userAgent)) {
            html.classList.add('is-android');
        } else if (/Windows Phone/.test(userAgent)) {
            html.classList.add('is-windows-phone');
        }

        // 添加方向类
        html.classList.add(this.orientation === 0 || this.orientation === 180 ? 'portrait' : 'landscape');
    }

    /**
     * 设置视口元标签
     */
    setupViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        // 设置适合移动设备的视口配置
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
        
        // 为iOS设备添加状态栏样式
        if (document.documentElement.classList.contains('is-ios')) {
            let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
            if (!statusBarMeta) {
                statusBarMeta = document.createElement('meta');
                statusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
                statusBarMeta.content = 'default';
                document.head.appendChild(statusBarMeta);
            }
        }
    }

    /**
     * 优化滚动性能
     */
    optimizeScrolling() {
        // 启用硬件加速滚动
        document.body.style.webkitOverflowScrolling = 'touch';
        
        // 防止滚动时的橡皮筋效果（iOS）
        document.addEventListener('touchmove', (e) => {
            if (e.target === document.body || e.target === document.documentElement) {
                e.preventDefault();
            }
        }, { passive: false });

        // 优化滚动性能
        let ticking = false;
        const updateScrollPosition = () => {
            // 更新滚动相关的UI状态
            this.updateScrollUI();
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollPosition);
                ticking = true;
            }
        }, { passive: true });
    }

    /**
     * 更新滚动相关的UI
     */
    updateScrollUI() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

        // 更新滚动进度指示器
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) {
            progressBar.style.width = `${scrollPercent}%`;
        }

        // 控制导航栏显示/隐藏
        const navbar = document.querySelector('.navbar');
        if (navbar && this.isMobile) {
            if (scrollTop > 100) {
                navbar.classList.add('navbar-hidden');
            } else {
                navbar.classList.remove('navbar-hidden');
            }
        }
    }

    /**
     * 设置触摸事件处理
     */
    setupTouchEvents() {
        if (!this.isTouchDevice) return;

        // 优化点击延迟
        this.setupFastClick();

        // 设置触摸反馈
        this.setupTouchFeedback();

        // 防止双击缩放
        this.preventDoubleClickZoom();
    }

    /**
     * 设置快速点击（消除300ms延迟）
     */
    setupFastClick() {
        let touchStartTime = 0;
        let touchStartTarget = null;

        document.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartTarget = e.target;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;

            if (touchDuration < 200 && e.target === touchStartTarget) {
                // 快速触摸，立即触发点击
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                e.target.dispatchEvent(clickEvent);
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * 设置触摸反馈
     */
    setupTouchFeedback() {
        const interactiveElements = document.querySelectorAll('button, .btn, a, .card, .nav-link');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.classList.add('touch-active');
            }, { passive: true });

            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 150);
            }, { passive: true });

            element.addEventListener('touchcancel', () => {
                element.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    /**
     * 防止双击缩放
     */
    preventDoubleClickZoom() {
        let lastTouchEnd = 0;
        
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    /**
     * 优化图片加载
     */
    optimizeImages() {
        // 为移动设备优化图片
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            // 添加懒加载
            if ('loading' in HTMLImageElement.prototype) {
                img.loading = 'lazy';
            }

            // 为高DPI屏幕提供高分辨率图片
            if (this.viewport.devicePixelRatio > 1) {
                const src = img.src;
                const highResSrc = src.replace(/\.(jpg|jpeg|png|webp)$/i, '@2x.$1');
                
                // 检查高分辨率图片是否存在
                const testImg = new Image();
                testImg.onload = () => {
                    img.src = highResSrc;
                };
                testImg.src = highResSrc;
            }
        });

        // 设置响应式图片
        this.setupResponsiveImages();
    }

    /**
     * 设置响应式图片
     */
    setupResponsiveImages() {
        const images = document.querySelectorAll('img[data-mobile-src]');
        
        images.forEach(img => {
            if (this.isMobile && img.dataset.mobileSrc) {
                img.src = img.dataset.mobileSrc;
            }
        });
    }

    /**
     * 设置方向变化处理
     */
    setupOrientationChange() {
        const handleOrientationChange = () => {
            setTimeout(() => {
                this.orientation = this.getOrientation();
                this.viewport = this.getViewportInfo();
                
                const html = document.documentElement;
                html.classList.remove('portrait', 'landscape');
                html.classList.add(this.orientation === 0 || this.orientation === 180 ? 'portrait' : 'landscape');
                
                // 触发自定义事件
                window.dispatchEvent(new CustomEvent('orientationchange', {
                    detail: {
                        orientation: this.orientation,
                        viewport: this.viewport
                    }
                }));
                
                // 重新计算布局
                this.recalculateLayout();
            }, 100);
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
    }

    /**
     * 重新计算布局
     */
    recalculateLayout() {
        // 更新CSS自定义属性
        document.documentElement.style.setProperty('--viewport-width', `${this.viewport.width}px`);
        document.documentElement.style.setProperty('--viewport-height', `${this.viewport.height}px`);
        
        // 重新计算卡片网格
        const grids = document.querySelectorAll('.grid');
        grids.forEach(grid => {
            this.optimizeGridLayout(grid);
        });
    }

    /**
     * 优化网格布局
     */
    optimizeGridLayout(grid) {
        const containerWidth = grid.offsetWidth;
        const cardMinWidth = 280; // 卡片最小宽度
        const gap = 24; // 间距
        
        let columns = Math.floor((containerWidth + gap) / (cardMinWidth + gap));
        columns = Math.max(1, Math.min(columns, 4)); // 限制在1-4列之间
        
        grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }

    /**
     * 移动端性能优化
     */
    optimizePerformance() {
        // 减少重绘和回流
        this.optimizeAnimations();
        
        // 优化事件监听器
        this.optimizeEventListeners();
        
        // 预加载关键资源
        this.preloadCriticalResources();
        
        // 延迟加载非关键内容
        this.lazyLoadContent();
    }

    /**
     * 优化动画性能
     */
    optimizeAnimations() {
        // 检测设备性能
        const isLowEndDevice = this.detectLowEndDevice();
        
        if (isLowEndDevice) {
            // 禁用复杂动画
            document.documentElement.classList.add('reduce-animations');
        }

        // 使用transform和opacity进行动画
        const animatedElements = document.querySelectorAll('.animate');
        animatedElements.forEach(element => {
            element.style.willChange = 'transform, opacity';
        });
    }

    /**
     * 检测低端设备
     */
    detectLowEndDevice() {
        // 基于硬件并发数和内存判断
        const hardwareConcurrency = navigator.hardwareConcurrency || 2;
        const deviceMemory = navigator.deviceMemory || 2;
        
        return hardwareConcurrency <= 2 || deviceMemory <= 2;
    }

    /**
     * 优化事件监听器
     */
    optimizeEventListeners() {
        // 使用事件委托
        document.addEventListener('click', this.handleDelegatedClick.bind(this));
        document.addEventListener('touchstart', this.handleDelegatedTouch.bind(this), { passive: true });
    }

    /**
     * 处理委托点击事件
     */
    handleDelegatedClick(e) {
        const target = e.target.closest('[data-action]');
        if (target) {
            const action = target.dataset.action;
            this.executeAction(action, target, e);
        }
    }

    /**
     * 处理委托触摸事件
     */
    handleDelegatedTouch(e) {
        const target = e.target.closest('.touch-interactive');
        if (target) {
            target.classList.add('touch-active');
        }
    }

    /**
     * 执行动作
     */
    executeAction(action, element, event) {
        switch (action) {
            case 'toggle-menu':
                this.toggleMobileMenu();
                break;
            case 'scroll-to-top':
                this.scrollToTop();
                break;
            case 'toggle-card':
                this.toggleCard(element);
                break;
            default:
                console.log(`未知动作: ${action}`);
        }
    }

    /**
     * 预加载关键资源
     */
    preloadCriticalResources() {
        const criticalImages = document.querySelectorAll('img[data-critical]');
        criticalImages.forEach(img => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = img.src || img.dataset.src;
            document.head.appendChild(link);
        });
    }

    /**
     * 延迟加载内容
     */
    lazyLoadContent() {
        const lazyElements = document.querySelectorAll('[data-lazy]');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyElement(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px'
            });

            lazyElements.forEach(element => observer.observe(element));
        } else {
            // 回退方案
            lazyElements.forEach(element => this.loadLazyElement(element));
        }
    }

    /**
     * 加载懒加载元素
     */
    loadLazyElement(element) {
        if (element.dataset.lazySrc) {
            element.src = element.dataset.lazySrc;
        }
        if (element.dataset.lazyContent) {
            element.innerHTML = element.dataset.lazyContent;
        }
        element.classList.add('lazy-loaded');
    }

    /**
     * 设置移动端导航
     */
    setupMobileNavigation() {
        if (!this.isMobile) return;

        const navbar = document.querySelector('.navbar');
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('nav-menu-open');
                navToggle.classList.toggle('nav-toggle-active');
                document.body.classList.toggle('nav-open');
            });

            // 点击菜单项后关闭菜单
            navMenu.addEventListener('click', (e) => {
                if (e.target.matches('.nav-link')) {
                    navMenu.classList.remove('nav-menu-open');
                    navToggle.classList.remove('nav-toggle-active');
                    document.body.classList.remove('nav-open');
                }
            });
        }

        // 添加滚动时隐藏导航栏
        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // 向下滚动，隐藏导航栏
                navbar?.classList.add('navbar-hidden');
            } else {
                // 向上滚动，显示导航栏
                navbar?.classList.remove('navbar-hidden');
            }
            
            lastScrollTop = scrollTop;
        }, { passive: true });
    }

    /**
     * 优化表单体验
     */
    optimizeForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                // 设置适当的输入类型和属性
                this.optimizeInputForMobile(input);
                
                // 添加焦点处理
                input.addEventListener('focus', () => {
                    // 滚动到输入框位置（避免被虚拟键盘遮挡）
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });
            });
        });
    }

    /**
     * 为移动端优化输入框
     */
    optimizeInputForMobile(input) {
        // 设置适当的虚拟键盘类型
        if (input.type === 'email') {
            input.inputMode = 'email';
        } else if (input.type === 'tel') {
            input.inputMode = 'tel';
        } else if (input.type === 'number') {
            input.inputMode = 'numeric';
        } else if (input.type === 'url') {
            input.inputMode = 'url';
        }

        // 防止iOS自动缩放
        if (document.documentElement.classList.contains('is-ios')) {
            if (parseFloat(input.style.fontSize) < 16) {
                input.style.fontSize = '16px';
            }
        }

        // 添加触摸友好的样式
        input.style.minHeight = '44px';
    }

    /**
     * 设置手势识别
     */
    setupGestures() {
        if (!this.isTouchDevice) return;

        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    /**
     * 处理触摸开始
     */
    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        this.touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    }

    /**
     * 处理触摸移动
     */
    handleTouchMove(e) {
        // 可以在这里处理拖拽等手势
    }

    /**
     * 处理触摸结束
     */
    handleTouchEnd(e) {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - this.touchStartTime;
        
        const touchEndPos = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };

        const deltaX = touchEndPos.x - this.touchStartPos.x;
        const deltaY = touchEndPos.y - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 检测手势类型
        if (touchDuration < 200 && distance < this.tapThreshold) {
            // 点击
            this.handleTap(e, touchEndPos);
        } else if (touchDuration > this.longPressThreshold && distance < this.tapThreshold) {
            // 长按
            this.handleLongPress(e, touchEndPos);
        } else if (distance > this.swipeThreshold) {
            // 滑动
            this.handleSwipe(e, deltaX, deltaY);
        }
    }

    /**
     * 处理点击手势
     */
    handleTap(e, pos) {
        // 触发自定义点击事件
        const target = document.elementFromPoint(pos.x, pos.y);
        if (target) {
            target.dispatchEvent(new CustomEvent('mobiletap', {
                bubbles: true,
                detail: { position: pos }
            }));
        }
    }

    /**
     * 处理长按手势
     */
    handleLongPress(e, pos) {
        const target = document.elementFromPoint(pos.x, pos.y);
        if (target) {
            target.dispatchEvent(new CustomEvent('mobilelongpress', {
                bubbles: true,
                detail: { position: pos }
            }));
        }
    }

    /**
     * 处理滑动手势
     */
    handleSwipe(e, deltaX, deltaY) {
        let direction;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        // 触发滑动事件
        document.dispatchEvent(new CustomEvent('mobileswipe', {
            detail: {
                direction,
                deltaX,
                deltaY,
                target: e.target
            }
        }));

        // 处理特定的滑动动作
        this.handleSwipeAction(direction, e.target);
    }

    /**
     * 处理滑动动作
     */
    handleSwipeAction(direction, target) {
        // 侧边栏滑动
        if (direction === 'right' && this.touchStartPos.x < 20) {
            this.openSidebar();
        } else if (direction === 'left' && this.touchStartPos.x > window.innerWidth - 20) {
            this.closeSidebar();
        }

        // 卡片滑动
        const card = target.closest('.swipeable-card');
        if (card) {
            if (direction === 'left') {
                card.classList.add('swiped-left');
            } else if (direction === 'right') {
                card.classList.add('swiped-right');
            }
        }
    }

    /**
     * 切换移动端菜单
     */
    toggleMobileMenu() {
        const menu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.menu-overlay');
        
        if (menu) {
            menu.classList.toggle('menu-open');
            document.body.classList.toggle('menu-open');
        }
        
        if (overlay) {
            overlay.classList.toggle('overlay-visible');
        }
    }

    /**
     * 滚动到顶部
     */
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * 切换卡片状态
     */
    toggleCard(card) {
        card.classList.toggle('card-expanded');
        
        const content = card.querySelector('.card-expandable-content');
        if (content) {
            if (card.classList.contains('card-expanded')) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0';
            }
        }
    }

    /**
     * 打开侧边栏
     */
    openSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.add('sidebar-open');
            document.body.classList.add('sidebar-open');
        }
    }

    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('sidebar-open');
            document.body.classList.remove('sidebar-open');
        }
    }

    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isTouchDevice: this.isTouchDevice,
            orientation: this.orientation,
            viewport: this.viewport,
            userAgent: navigator.userAgent
        };
    }

    /**
     * 启用/禁用移动端优化
     */
    toggleMobileOptimization(enabled) {
        const html = document.documentElement;
        
        if (enabled) {
            html.classList.add('mobile-optimized');
        } else {
            html.classList.remove('mobile-optimized');
        }
    }

    /**
     * 销毁移动端优化
     */
    destroy() {
        // 移除事件监听器
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleOrientationChange);
        
        // 移除CSS类
        const html = document.documentElement;
        html.classList.remove('is-mobile', 'is-tablet', 'is-touch', 'is-ios', 'is-android', 'is-windows-phone');
        html.classList.remove('portrait', 'landscape', 'mobile-optimized');
    }
}

// 全局实例
window.MobileOptimization = MobileOptimization;

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimization = new MobileOptimization();
    
    // 在控制台输出设备信息
    console.log('移动端设备信息:', window.mobileOptimization.getDeviceInfo());
});

export default MobileOptimization;
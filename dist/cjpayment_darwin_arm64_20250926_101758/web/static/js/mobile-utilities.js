/**
 * 移动端工具类
 * 
 * 提供移动端特定的交互和功能支持
 * 版本：v1.0.0
 */

class MobileUtilities {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.isTouch = this.detectTouch();
        this.orientation = this.getOrientation();
        
        this.init();
    }

    /**
     * 初始化移动端功能
     */
    init() {
        if (this.isMobile || this.isTablet) {
            this.setupMobileNavigation();
            this.setupTouchOptimization();
            this.setupViewportHandling();
            this.setupMobileTableMode();
            this.setupSwipeGestures();
            this.setupOrientationHandling();
            this.setupMobileModals();
            this.setupVirtualKeyboardHandling();
        }
        
        console.log('Mobile Utilities initialized:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isTouch: this.isTouch,
            orientation: this.orientation
        });
    }

    /**
     * 检测是否为移动设备
     */
    detectMobile() {
        const userAgent = navigator.userAgent;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        return mobileRegex.test(userAgent) || window.innerWidth <= 768;
    }

    /**
     * 检测是否为平板设备
     */
    detectTablet() {
        const userAgent = navigator.userAgent;
        const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;
        return tabletRegex.test(userAgent) || (window.innerWidth > 768 && window.innerWidth <= 1024);
    }

    /**
     * 检测是否支持触摸
     */
    detectTouch() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * 获取屏幕方向
     */
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle === 0 || screen.orientation.angle === 180 ? 'portrait' : 'landscape';
        }
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    /**
     * 设置移动端导航
     */
    setupMobileNavigation() {
        // 创建移动端菜单按钮
        this.createMobileMenuButton();
        
        // 设置导航菜单事件
        this.setupNavigationEvents();
        
        // 设置遮罩层
        this.createNavigationOverlay();
    }

    /**
     * 创建移动端菜单按钮
     */
    createMobileMenuButton() {
        const header = document.querySelector('.header__left');
        if (!header || document.querySelector('.mobile-menu-toggle')) return;

        const menuButton = document.createElement('button');
        menuButton.className = 'mobile-menu-toggle mobile-only';
        menuButton.innerHTML = '☰';
        menuButton.setAttribute('aria-label', '打开菜单');
        
        header.appendChild(menuButton);
    }

    /**
     * 设置导航事件
     */
    setupNavigationEvents() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.nav');
        
        if (!menuToggle || !nav) return;

        menuToggle.addEventListener('click', () => {
            this.toggleMobileNavigation();
        });

        // 点击导航链接时关闭菜单
        nav.addEventListener('click', (event) => {
            if (event.target.closest('.nav__link')) {
                this.closeMobileNavigation();
            }
        });
    }

    /**
     * 创建导航遮罩层
     */
    createNavigationOverlay() {
        if (document.querySelector('.mobile-nav-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 998;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        
        overlay.addEventListener('click', () => {
            this.closeMobileNavigation();
        });
        
        document.body.appendChild(overlay);
    }

    /**
     * 切换移动端导航
     */
    toggleMobileNavigation() {
        const nav = document.querySelector('.nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const isOpen = nav.classList.contains('active');
        
        if (isOpen) {
            this.closeMobileNavigation();
        } else {
            this.openMobileNavigation();
        }
    }

    /**
     * 打开移动端导航
     */
    openMobileNavigation() {
        const nav = document.querySelector('.nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        nav.classList.add('active');
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        menuToggle.innerHTML = '✕';
        menuToggle.setAttribute('aria-label', '关闭菜单');
        
        // 防止页面滚动
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭移动端导航
     */
    closeMobileNavigation() {
        const nav = document.querySelector('.nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        nav.classList.remove('active');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        menuToggle.innerHTML = '☰';
        menuToggle.setAttribute('aria-label', '打开菜单');
        
        // 恢复页面滚动
        document.body.style.overflow = '';
    }

    /**
     * 设置触摸优化
     */
    setupTouchOptimization() {
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        });

        // 优化滚动性能
        this.optimizeScrolling();
        
        // 设置触摸反馈
        this.setupTouchFeedback();
    }

    /**
     * 优化滚动性能
     */
    optimizeScrolling() {
        const scrollableElements = document.querySelectorAll('.table-container, .modal-body, .nav');
        
        scrollableElements.forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overscrollBehavior = 'contain';
        });
    }

    /**
     * 设置触摸反馈
     */
    setupTouchFeedback() {
        const touchElements = document.querySelectorAll('button, .btn, .nav__link, .card');
        
        touchElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.opacity = '0.8';
            });
            
            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.style.opacity = '';
                }, 150);
            });
            
            element.addEventListener('touchcancel', function() {
                this.style.opacity = '';
            });
        });
    }

    /**
     * 设置视口处理
     */
    setupViewportHandling() {
        // 设置视口meta标签
        this.setViewportMeta();
        
        // 处理视口变化
        this.handleViewportChanges();
        
        // 处理安全区域
        this.handleSafeArea();
    }

    /**
     * 设置视口meta标签
     */
    setViewportMeta() {
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }
        
        viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
    }

    /**
     * 处理安全区域
     */
    handleSafeArea() {
        // 检测是否支持安全区域
        if (CSS.supports('padding: env(safe-area-inset-top)')) {
            document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
            document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
            document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
            document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
            
            // 为body添加安全区域类
            document.body.classList.add('has-safe-area');
        }
        
        // 为刘海屏和其他特殊设备添加特殊处理
        this.detectNotchDevices();
    }

    /**
     * 检测刘海屏设备
     */
    detectNotchDevices() {
        // 检测iPhone X系列及以上设备
        const isIPhoneX = /iPhone/.test(navigator.userAgent) && window.screen.height >= 812;
        
        if (isIPhoneX) {
            document.body.classList.add('is-iphone-x');
        }
        
        // 检测其他可能的刘海屏设备
        if (window.screen.height / window.screen.width > 2) {
            document.body.classList.add('has-notch');
        }
    }

    /**
     * 处理视口变化
     */
    handleViewportChanges() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        // 更新断点检测
        this.updateBreakpoint();
        
        // 重新调整表格
        this.adjustTablesForViewport();
        
        // 重新调整模态框
        this.adjustModalsForViewport();
    }

    /**
     * 更新断点检测
     */
    updateBreakpoint() {
        const width = window.innerWidth;
        let breakpoint = 'xl';
        
        if (width < 576) breakpoint = 'xs';
        else if (width < 768) breakpoint = 'sm';
        else if (width < 992) breakpoint = 'md';
        else if (width < 1200) breakpoint = 'lg';
        
        document.documentElement.setAttribute('data-breakpoint', breakpoint);
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('breakpointChange', {
            detail: { breakpoint, width }
        }));
    }

    /**
     * 设置移动端表格模式
     */
    setupMobileTableMode() {
        if (window.innerWidth <= 768) {
            this.convertTablesToCards();
        }
        
        // 监听断点变化
        window.addEventListener('breakpointChange', (event) => {
            if (event.detail.width <= 768) {
                this.convertTablesToCards();
            } else {
                this.restoreTablesFromCards();
            }
        });
    }

    /**
     * 将表格转换为卡片模式
     */
    convertTablesToCards() {
        const tables = document.querySelectorAll('.enhanced-table');
        
        tables.forEach(table => {
            if (table.dataset.mobileConverted) return;
            
            const cardContainer = this.createCardContainer(table);
            table.parentNode.insertBefore(cardContainer, table.nextSibling);
            table.style.display = 'none';
            table.dataset.mobileConverted = 'true';
        });
    }

    /**
     * 创建卡片容器
     */
    createCardContainer(table) {
        const container = document.createElement('div');
        container.className = 'mobile-table-cards';
        
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const card = this.createDataCard(headers, cells);
            container.appendChild(card);
        });
        
        return container;
    }

    /**
     * 创建数据卡片
     */
    createDataCard(headers, cells) {
        const card = document.createElement('div');
        card.className = 'data-card';
        
        // 创建卡片头部
        const header = document.createElement('div');
        header.className = 'data-card__header';
        
        const title = document.createElement('div');
        title.className = 'data-card__title';
        title.textContent = cells[0]?.textContent?.trim() || '数据项';
        
        const status = document.createElement('div');
        status.className = 'data-card__status';
        status.textContent = cells[cells.length - 2]?.textContent?.trim() || '';
        
        header.appendChild(title);
        header.appendChild(status);
        
        // 创建卡片主体
        const body = document.createElement('div');
        body.className = 'data-card__body';
        
        headers.forEach((header, index) => {
            if (index === 0 || index === headers.length - 1) return; // 跳过标题和操作列
            
            const field = document.createElement('div');
            field.className = 'data-card__field';
            
            const label = document.createElement('div');
            label.className = 'data-card__label';
            label.textContent = header;
            
            const value = document.createElement('div');
            value.className = 'data-card__value';
            value.textContent = cells[index]?.textContent?.trim() || '';
            
            field.appendChild(label);
            field.appendChild(value);
            body.appendChild(field);
        });
        
        card.appendChild(header);
        card.appendChild(body);
        
        return card;
    }

    /**
     * 恢复表格模式
     */
    restoreTablesFromCards() {
        const tables = document.querySelectorAll('.enhanced-table[data-mobile-converted]');
        
        tables.forEach(table => {
            table.style.display = '';
            table.removeAttribute('data-mobile-converted');
            
            const cardContainer = table.parentNode.querySelector('.mobile-table-cards');
            if (cardContainer) {
                cardContainer.remove();
            }
        });
    }

    /**
     * 设置滑动手势
     */
    setupSwipeGestures() {
        let startX, startY, currentX, currentY;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY || !currentX || !currentY) return;
            
            const diffX = startX - currentX;
            const diffY = startY - currentY;
            
            // 确保是水平滑动
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // 向左滑动
                    this.handleSwipeLeft();
                } else {
                    // 向右滑动
                    this.handleSwipeRight();
                }
            }
            
            // 重置
            startX = startY = currentX = currentY = null;
        });
    }

    /**
     * 处理向左滑动
     */
    handleSwipeLeft() {
        // 如果导航菜单打开，关闭它
        const nav = document.querySelector('.nav');
        if (nav && nav.classList.contains('active')) {
            this.closeMobileNavigation();
        }
    }

    /**
     * 处理向右滑动
     */
    handleSwipeRight() {
        // 如果在页面左边缘开始滑动，打开导航菜单
        if (this.startX < 50) {
            this.openMobileNavigation();
        }
    }

    /**
     * 设置方向变化处理
     */
    setupOrientationHandling() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
    }

    /**
     * 处理方向变化
     */
    handleOrientationChange() {
        const newOrientation = this.getOrientation();
        
        if (newOrientation !== this.orientation) {
            this.orientation = newOrientation;
            
            // 关闭打开的导航菜单
            this.closeMobileNavigation();
            
            // 重新调整布局
            this.adjustLayoutForOrientation();
            
            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('orientationChanged', {
                detail: { orientation: newOrientation }
            }));
        }
    }

    /**
     * 根据方向调整布局
     */
    adjustLayoutForOrientation() {
        const body = document.body;
        body.classList.remove('portrait', 'landscape');
        body.classList.add(this.orientation);
        
        // 调整图表高度
        const charts = document.querySelectorAll('.chart-container');
        charts.forEach(chart => {
            if (this.orientation === 'landscape') {
                chart.style.height = '200px';
            } else {
                chart.style.height = '250px';
            }
        });
    }

    /**
     * 设置移动端模态框
     */
    setupMobileModals() {
        // 监听模态框打开
        document.addEventListener('modalOpened', (event) => {
            this.handleModalOpen(event.detail.modal);
        });
        
        // 监听模态框关闭
        document.addEventListener('modalClosed', (event) => {
            this.handleModalClose(event.detail.modal);
        });
    }

    /**
     * 处理模态框打开
     */
    handleModalOpen(modal) {
        if (this.isMobile) {
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
            
            // 调整模态框为全屏
            const content = modal.querySelector('.modal-content');
            if (content && window.innerWidth <= 576) {
                content.style.width = '100vw';
                content.style.height = '100vh';
                content.style.borderRadius = '0';
            }
        }
    }

    /**
     * 处理模态框关闭
     */
    handleModalClose(modal) {
        if (this.isMobile) {
            // 恢复背景滚动
            document.body.style.overflow = '';
        }
    }

    /**
     * 设置虚拟键盘处理
     */
    setupVirtualKeyboardHandling() {
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // 检测虚拟键盘是否打开
            if (heightDifference > 150) {
                this.handleVirtualKeyboardOpen();
            } else {
                this.handleVirtualKeyboardClose();
            }
        });
        
        // 监听input焦点
        document.addEventListener('focusin', (event) => {
            if (this.isMobile && this.isInputElement(event.target)) {
                setTimeout(() => {
                    this.scrollToElement(event.target);
                }, 300);
            }
        });
    }

    /**
     * 检测是否为输入元素
     */
    isInputElement(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        return inputTypes.includes(element.tagName.toLowerCase());
    }

    /**
     * 滚动到指定元素
     */
    scrollToElement(element) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.pageYOffset;
        const viewportHeight = window.innerHeight;
        const offset = viewportHeight * 0.3; // 留出30%的空间
        
        window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
        });
    }

    /**
     * 处理虚拟键盘打开
     */
    handleVirtualKeyboardOpen() {
        document.body.classList.add('virtual-keyboard-open');
        
        // 调整固定定位元素
        const fixedElements = document.querySelectorAll('.app__header, .toast-container');
        fixedElements.forEach(element => {
            element.style.position = 'absolute';
        });
    }

    /**
     * 处理虚拟键盘关闭
     */
    handleVirtualKeyboardClose() {
        document.body.classList.remove('virtual-keyboard-open');
        
        // 恢复固定定位元素
        const fixedElements = document.querySelectorAll('.app__header, .toast-container');
        fixedElements.forEach(element => {
            element.style.position = 'fixed';
        });
    }

    /**
     * 调整表格以适应视口
     */
    adjustTablesForViewport() {
        if (window.innerWidth <= 768) {
            this.convertTablesToCards();
        } else {
            this.restoreTablesFromCards();
        }
    }

    /**
     * 调整模态框以适应视口
     */
    adjustModalsForViewport() {
        const modals = document.querySelectorAll('.modal-content');
        
        modals.forEach(modal => {
            if (window.innerWidth <= 576) {
                modal.style.width = '100vw';
                modal.style.height = '100vh';
                modal.style.borderRadius = '0';
            } else if (window.innerWidth <= 768) {
                modal.style.width = 'calc(100vw - 2rem)';
                modal.style.height = 'auto';
                modal.style.borderRadius = '12px';
            } else {
                modal.style.width = '';
                modal.style.height = '';
                modal.style.borderRadius = '';
            }
        });
    }

    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isTouch: this.isTouch,
            orientation: this.orientation,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            userAgent: navigator.userAgent
        };
    }

    /**
     * 显示移动端调试信息
     */
    showDebugInfo() {
        if (!document.querySelector('.debug-mobile')) {
            const debug = document.createElement('div');
            debug.className = 'debug-mobile';
            debug.setAttribute('data-breakpoint', document.documentElement.getAttribute('data-breakpoint') || 'unknown');
            document.body.appendChild(debug);
        }
    }

    /**
     * 隐藏移动端调试信息
     */
    hideDebugInfo() {
        const debug = document.querySelector('.debug-mobile');
        if (debug) {
            debug.remove();
        }
    }

    /**
     * 销毁移动端功能
     */
    destroy() {
        // 移除事件监听器
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        // 移除添加的DOM元素
        const elementsToRemove = [
            '.mobile-menu-toggle',
            '.mobile-nav-overlay',
            '.mobile-table-cards',
            '.debug-mobile'
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => element.remove());
        });
        
        // 恢复body样式
        document.body.style.overflow = '';
        document.body.classList.remove('virtual-keyboard-open', 'portrait', 'landscape');
        
        console.log('Mobile Utilities destroyed');
    }
}

// 全局实例
let mobileUtils = null;

// 自动初始化
document.addEventListener('DOMContentLoaded', function() {
    mobileUtils = new MobileUtilities();
    window.MobileUtilities = MobileUtilities;
    window.mobileUtils = mobileUtils;
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileUtilities;
}
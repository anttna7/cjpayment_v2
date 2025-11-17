/**
 * 前端交互增强组件
 * 
 * 提供高级交互功能：动画、微交互、键盘快捷键、拖拽等
 * 版本：v1.0.0
 */

class InteractionEnhancements {
    constructor(options = {}) {
        this.options = {
            enableAnimations: true,
            enableKeyboardShortcuts: true,
            enableDragDrop: true,
            enableTooltips: true,
            enableContextMenu: true,
            enableVirtualScrolling: false,
            animationDuration: 300,
            debounceDelay: 250,
            ...options
        };

        this.state = {
            animations: new Map(),
            shortcuts: new Map(),
            tooltips: new Map(),
            contextMenus: new Map(),
            dragState: null
        };

        this.init();
    }

    /**
     * 初始化交互增强功能
     */
    init() {
        console.log('Interaction Enhancements: Initializing...');

        // 初始化各种功能
        this.initAnimations();
        this.initKeyboardShortcuts();
        this.initTooltips();
        this.initContextMenus();
        this.initDragDrop();
        this.initMicroInteractions();
        this.initAccessibilityEnhancements();
        this.initPerformanceOptimizations();

        console.log('Interaction Enhancements: Initialized successfully');
    }

    /**
     * 初始化动画系统
     */
    initAnimations() {
        if (!this.options.enableAnimations) return;

        // 创建动画管理器
        this.animationManager = {
            running: new Set(),
            queue: []
        };

        // 页面入场动画
        this.setupPageEntranceAnimations();
        
        // 滚动动画
        this.setupScrollAnimations();
        
        // 悬停动画
        this.setupHoverAnimations();
        
        // 加载动画
        this.setupLoadingAnimations();
    }

    /**
     * 设置页面入场动画
     */
    setupPageEntranceAnimations() {
        const animatedElements = document.querySelectorAll('.fade-in, .slide-in, .bounce-in');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target, 'fadeIn');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            observer.observe(element);
        });
    }

    /**
     * 设置滚动动画
     */
    setupScrollAnimations() {
        const scrollElements = document.querySelectorAll('.scroll-reveal');
        
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                } else {
                    entry.target.classList.remove('revealed');
                }
            });
        }, { threshold: 0.2 });

        scrollElements.forEach(element => scrollObserver.observe(element));

        // 平滑滚动到锚点
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href^="#"]');
            if (link) {
                event.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    this.smoothScrollTo(target);
                }
            }
        });
    }

    /**
     * 设置悬停动画
     */
    setupHoverAnimations() {
        const hoverElements = document.querySelectorAll('.hover-lift, .hover-glow, .hover-rotate');
        
        hoverElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                this.addHoverEffect(element);
            });
            
            element.addEventListener('mouseleave', () => {
                this.removeHoverEffect(element);
            });
        });
    }

    /**
     * 设置加载动画
     */
    setupLoadingAnimations() {
        // 骨架屏加载
        this.setupSkeletonLoading();
        
        // 渐进式图片加载
        this.setupProgressiveImageLoading();
        
        // 内容加载状态
        this.setupContentLoadingStates();
    }

    /**
     * 设置骨架屏加载
     */
    setupSkeletonLoading() {
        const skeletonElements = document.querySelectorAll('.skeleton');
        
        skeletonElements.forEach(element => {
            this.createSkeletonAnimation(element);
        });
    }

    /**
     * 创建骨架屏动画
     */
    createSkeletonAnimation(element) {
        element.style.background = `
            linear-gradient(90deg, 
                #f0f0f0 25%, 
                #e0e0e0 50%, 
                #f0f0f0 75%
            )
        `;
        element.style.backgroundSize = '200% 100%';
        element.style.animation = 'skeleton-loading 1.5s infinite';
        
        // 添加CSS关键帧动画
        this.addSkeletonKeyframes();
    }

    /**
     * 添加骨架屏关键帧动画
     */
    addSkeletonKeyframes() {
        if (document.querySelector('#skeleton-keyframes')) return;
        
        const style = document.createElement('style');
        style.id = 'skeleton-keyframes';
        style.textContent = `
            @keyframes skeleton-loading {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 设置渐进式图片加载
     */
    setupProgressiveImageLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => {
                img.classList.add('lazy');
                imageObserver.observe(img);
            });
        } else {
            // 降级处理：直接加载所有图片
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    /**
     * 设置内容加载状态
     */
    setupContentLoadingStates() {
        const loadingElements = document.querySelectorAll('.loading-content');
        
        loadingElements.forEach(element => {
            // 模拟加载过程
            setTimeout(() => {
                element.classList.remove('loading-content');
                element.classList.add('content-loaded');
            }, Math.random() * 2000 + 500);
        });
    }

    /**
     * 初始化键盘快捷键
     */
    initKeyboardShortcuts() {
        if (!this.options.enableKeyboardShortcuts) return;

        // 定义快捷键
        this.shortcuts = {
            'ctrl+k': () => this.focusGlobalSearch(),
            'ctrl+shift+d': () => this.toggleDebugMode(),
            'esc': () => this.closeModalsAndMenus(),
            'ctrl+s': (e) => { e.preventDefault(); this.saveCurrentForm(); },
            'ctrl+enter': () => this.submitCurrentForm(),
            'f': () => this.toggleFullscreen(),
            '?': () => this.showShortcutHelp()
        };

        // 注册快捷键监听器
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcut(event);
        });

        // 显示快捷键提示
        this.createShortcutHints();
    }

    /**
     * 处理键盘快捷键
     */
    handleKeyboardShortcut(event) {
        const key = this.getKeyCombo(event);
        const shortcut = this.shortcuts[key];
        
        if (shortcut && !this.isInputFocused()) {
            event.preventDefault();
            shortcut(event);
        }
    }

    /**
     * 获取按键组合
     */
    getKeyCombo(event) {
        const keys = [];
        
        if (event.ctrlKey) keys.push('ctrl');
        if (event.shiftKey) keys.push('shift');
        if (event.altKey) keys.push('alt');
        if (event.metaKey) keys.push('meta');
        
        if (event.key && event.key !== 'Control' && event.key !== 'Shift' && event.key !== 'Alt' && event.key !== 'Meta') {
            keys.push(event.key.toLowerCase());
        }
        
        return keys.join('+');
    }

    /**
     * 检查是否有输入框获得焦点
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    }

    /**
     * 创建快捷键提示
     */
    createShortcutHints() {
        // 创建快捷键帮助提示
        const shortcutHelp = document.createElement('div');
        shortcutHelp.id = 'shortcut-help';
        shortcutHelp.className = 'shortcut-help-overlay';
        shortcutHelp.style.display = 'none';
        
        const shortcuts = [
            { key: 'Ctrl + K', desc: '全局搜索' },
            { key: 'Ctrl + S', desc: '保存当前表单' },
            { key: 'Ctrl + Enter', desc: '提交当前表单' },
            { key: 'Esc', desc: '关闭弹窗和菜单' },
            { key: 'F', desc: '切换全屏' },
            { key: '?', desc: '显示快捷键帮助' }
        ];

        const helpContent = `
            <div class="shortcut-help-content">
                <h3>键盘快捷键</h3>
                <div class="shortcut-list">
                    ${shortcuts.map(shortcut => `
                        <div class="shortcut-item">
                            <span class="shortcut-key">${shortcut.key}</span>
                            <span class="shortcut-desc">${shortcut.desc}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="shortcut-close" onclick="this.closest('.shortcut-help-overlay').style.display='none'">关闭</button>
            </div>
        `;

        shortcutHelp.innerHTML = helpContent;
        document.body.appendChild(shortcutHelp);

        // 添加样式
        this.addShortcutStyles();
    }

    /**
     * 添加快捷键样式
     */
    addShortcutStyles() {
        if (document.querySelector('#shortcut-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'shortcut-styles';
        style.textContent = `
            .shortcut-help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .shortcut-help-content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
            }
            .shortcut-help-content h3 {
                margin: 0 0 20px 0;
                color: #333;
                text-align: center;
            }
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .shortcut-key {
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                color: #495057;
            }
            .shortcut-desc {
                color: #666;
            }
            .shortcut-close {
                margin-top: 20px;
                width: 100%;
                padding: 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
            .shortcut-close:hover {
                background: #0056b3;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 初始化工具提示
     */
    initTooltips() {
        if (!this.options.enableTooltips) return;

        // 查找所有需要工具提示的元素
        const tooltipElements = document.querySelectorAll('[data-tooltip], [title]');
        
        tooltipElements.forEach(element => {
            this.attachTooltip(element);
        });

        // 创建工具提示容器
        this.createTooltipContainer();
    }

    /**
     * 附加工具提示
     */
    attachTooltip(element) {
        const tooltipText = element.dataset.tooltip || element.title;
        if (!tooltipText) return;

        // 移除原生title属性
        element.removeAttribute('title');

        element.addEventListener('mouseenter', (event) => {
            this.showTooltip(event.target, tooltipText);
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        element.addEventListener('focus', (event) => {
            this.showTooltip(event.target, tooltipText);
        });

        element.addEventListener('blur', () => {
            this.hideTooltip();
        });
    }

    /**
     * 创建工具提示容器
     */
    createTooltipContainer() {
        if (document.querySelector('#tooltip-container')) return;

        const container = document.createElement('div');
        container.id = 'tooltip-container';
        container.className = 'tooltip-container';
        container.style.cssText = `
            position: absolute;
            z-index: 10000;
            background: #333;
            color: white;
            padding: 0.5rem 0.75rem;
            border-radius: 4px;
            font-size: 0.875rem;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease;
            max-width: 300px;
            word-wrap: break-word;
            white-space: normal;
        `;

        document.body.appendChild(container);
    }

    /**
     * 显示工具提示
     */
    showTooltip(element, text) {
        const tooltip = document.querySelector('#tooltip-container');
        if (!tooltip) return;

        tooltip.textContent = text;
        tooltip.style.opacity = '1';

        // 计算位置
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // 边界检查
        if (top < 0) {
            top = rect.bottom + 8;
        }
        if (left < 0) {
            left = 8;
        }
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 8;
        }

        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left}px`;
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        const tooltip = document.querySelector('#tooltip-container');
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    }

    /**
     * 初始化右键菜单
     */
    initContextMenus() {
        if (!this.options.enableContextMenu) return;

        // 禁用默认右键菜单
        document.addEventListener('contextmenu', (event) => {
            const target = event.target.closest('[data-context-menu]');
            if (target) {
                event.preventDefault();
                this.showContextMenu(event, target);
            }
        });

        // 点击其他地方时隐藏菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    /**
     * 显示右键菜单
     */
    showContextMenu(event, element) {
        const menuType = element.dataset.contextMenu;
        const menu = this.createContextMenu(menuType, element);
        
        if (!menu) return;

        // 定位菜单
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
        
        document.body.appendChild(menu);
        
        // 边界检查
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${event.pageX - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${event.pageY - rect.height}px`;
        }
    }

    /**
     * 创建右键菜单
     */
    createContextMenu(type, element) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 150px;
        `;

        const menuItems = this.getContextMenuItems(type, element);
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.style.cssText = `
                padding: 0.5rem 1rem;
                cursor: pointer;
                transition: background 0.2s ease;
            `;
            
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action(element);
                this.hideContextMenu();
            });
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#f5f5f5';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = '';
            });
            
            menu.appendChild(menuItem);
        });

        return menu;
    }

    /**
     * 获取右键菜单项
     */
    getContextMenuItems(type, element) {
        const commonItems = [
            { label: '刷新', action: () => window.location.reload() },
            { label: '复制链接', action: () => navigator.clipboard.writeText(window.location.href) }
        ];

        switch (type) {
            case 'table':
                return [
                    { label: '复制行', action: (el) => this.copyTableRow(el) },
                    { label: '导出数据', action: (el) => this.exportTableData(el) },
                    ...commonItems
                ];
            case 'chart':
                return [
                    { label: '保存图片', action: (el) => this.saveChartAsImage(el) },
                    { label: '复制数据', action: (el) => this.copyChartData(el) },
                    ...commonItems
                ];
            default:
                return commonItems;
        }
    }

    /**
     * 隐藏右键菜单
     */
    hideContextMenu() {
        const menu = document.querySelector('.context-menu');
        if (menu) {
            menu.remove();
        }
    }

    /**
     * 初始化拖拽功能
     */
    initDragDrop() {
        if (!this.options.enableDragDrop) return;

        // 查找可拖拽元素
        const draggableElements = document.querySelectorAll('[draggable="true"], .draggable');
        
        draggableElements.forEach(element => {
            this.attachDragEvents(element);
        });

        // 查找拖放目标
        const dropTargets = document.querySelectorAll('[data-drop-target], .drop-target');
        
        dropTargets.forEach(target => {
            this.attachDropEvents(target);
        });
    }

    /**
     * 附加拖拽事件
     */
    attachDragEvents(element) {
        element.addEventListener('dragstart', (event) => {
            this.handleDragStart(event);
        });

        element.addEventListener('drag', (event) => {
            this.handleDrag(event);
        });

        element.addEventListener('dragend', (event) => {
            this.handleDragEnd(event);
        });
    }

    /**
     * 附加拖放事件
     */
    attachDropEvents(target) {
        target.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.handleDragOver(event);
        });

        target.addEventListener('dragenter', (event) => {
            event.preventDefault();
            this.handleDragEnter(event);
        });

        target.addEventListener('dragleave', (event) => {
            this.handleDragLeave(event);
        });

        target.addEventListener('drop', (event) => {
            event.preventDefault();
            this.handleDrop(event);
        });
    }

    /**
     * 初始化微交互
     */
    initMicroInteractions() {
        // 按钮点击反馈
        this.setupButtonFeedback();
        
        // 表单输入反馈
        this.setupFormFeedback();
        
        // 链接悬停效果
        this.setupLinkEffects();
        
        // 加载状态指示
        this.setupLoadingIndicators();
    }

    /**
     * 设置按钮反馈
     */
    setupButtonFeedback() {
        const buttons = document.querySelectorAll('button, .btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                this.createRippleEffect(event);
            });
        });
    }

    /**
     * 创建涟漪效果
     */
    createRippleEffect(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple 0.6s linear;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            pointer-events: none;
        `;

        // 添加涟漪动画
        if (!document.querySelector('#ripple-keyframes')) {
            const style = document.createElement('style');
            style.id = 'ripple-keyframes';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * 设置表单反馈
     */
    setupFormFeedback() {
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // 输入焦点效果
            input.addEventListener('focus', () => {
                input.parentElement?.classList.add('input-focused');
            });
            
            input.addEventListener('blur', () => {
                input.parentElement?.classList.remove('input-focused');
            });
            
            // 输入验证反馈
            input.addEventListener('input', () => {
                if (input.checkValidity()) {
                    input.classList.remove('invalid');
                    input.classList.add('valid');
                } else {
                    input.classList.remove('valid');
                    input.classList.add('invalid');
                }
            });
        });
    }

    /**
     * 设置链接效果
     */
    setupLinkEffects() {
        const links = document.querySelectorAll('a');
        
        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                link.style.transition = 'all 0.2s ease';
            });
            
            link.addEventListener('mouseleave', () => {
                link.style.transition = '';
            });
        });
    }

    /**
     * 设置加载指示器
     */
    setupLoadingIndicators() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', (event) => {
                const submitBtn = form.querySelector('[type="submit"], .submit-btn');
                if (submitBtn) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                    
                    // 如果表单提交失败，恢复按钮状态
                    setTimeout(() => {
                        submitBtn.classList.remove('loading');
                        submitBtn.disabled = false;
                    }, 5000);
                }
            });
        });
    }

    /**
     * 初始化无障碍增强
     */
    initAccessibilityEnhancements() {
        // 焦点管理
        this.setupFocusManagement();
        
        // 屏幕阅读器支持
        this.setupScreenReaderSupport();
        
        // 键盘导航
        this.setupKeyboardNavigation();
    }

    /**
     * 设置焦点管理
     */
    setupFocusManagement() {
        // 焦点可见性
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // 焦点陷阱
        this.setupFocusTraps();
    }

    /**
     * 设置焦点陷阱
     */
    setupFocusTraps() {
        const modals = document.querySelectorAll('.modal, .dialog');
        
        modals.forEach(modal => {
            modal.addEventListener('keydown', (event) => {
                if (event.key === 'Tab') {
                    this.trapFocus(event, modal);
                }
            });
        });
    }

    /**
     * 陷阱焦点
     */
    trapFocus(event, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * 设置屏幕阅读器支持
     */
    setupScreenReaderSupport() {
        // 添加ARIA标签和属性
        this.addAriaLabels();
        
        // 添加屏幕阅读器公告
        this.setupScreenReaderAnnouncements();
        
        // 设置语义化HTML增强
        this.enhanceSemanticHTML();
    }

    /**
     * 添加ARIA标签
     */
    addAriaLabels() {
        // 为没有标签的表单控件添加aria-label
        const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        unlabeledInputs.forEach(input => {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder) {
                input.setAttribute('aria-label', placeholder);
            }
        });

        // 为按钮添加描述性标签
        const buttons = document.querySelectorAll('button:not([aria-label])');
        buttons.forEach(button => {
            if (!button.textContent.trim()) {
                const icon = button.querySelector('i, svg');
                if (icon) {
                    button.setAttribute('aria-label', '按钮');
                }
            }
        });
    }

    /**
     * 设置屏幕阅读器公告
     */
    setupScreenReaderAnnouncements() {
        // 创建公告区域
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
        
        this.liveRegion = liveRegion;
    }

    /**
     * 增强语义化HTML
     */
    enhanceSemanticHTML() {
        // 为导航添加landmark
        const navs = document.querySelectorAll('nav:not([role])');
        navs.forEach(nav => nav.setAttribute('role', 'navigation'));

        // 为主要内容添加landmark
        const main = document.querySelector('main:not([role])');
        if (main) main.setAttribute('role', 'main');

        // 为页眉页脚添加landmark
        const header = document.querySelector('header:not([role])');
        if (header) header.setAttribute('role', 'banner');

        const footer = document.querySelector('footer:not([role])');
        if (footer) footer.setAttribute('role', 'contentinfo');
    }

    /**
     * 设置键盘导航
     */
    setupKeyboardNavigation() {
        // 设置跳转链接
        this.addSkipLinks();
        
        // 增强键盘快捷键
        this.enhanceKeyboardShortcuts();
        
        // 设置可访问的下拉菜单
        this.setupAccessibleDropdowns();
    }

    /**
     * 添加跳转链接
     */
    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = '跳转到主要内容';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 1000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * 增强键盘快捷键
     */
    enhanceKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Alt + M: 跳转到主菜单
            if (event.altKey && event.key === 'm') {
                event.preventDefault();
                const mainNav = document.querySelector('nav, .main-nav');
                if (mainNav) {
                    const firstLink = mainNav.querySelector('a, button');
                    if (firstLink) firstLink.focus();
                }
            }
            
            // Alt + S: 跳转到搜索
            if (event.altKey && event.key === 's') {
                event.preventDefault();
                const searchInput = document.querySelector('input[type="search"], .search-input');
                if (searchInput) searchInput.focus();
            }
        });
    }

    /**
     * 设置可访问的下拉菜单
     */
    setupAccessibleDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown, .menu-dropdown');
        
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('button, .dropdown-trigger');
            const menu = dropdown.querySelector('.dropdown-menu, .menu');
            
            if (trigger && menu) {
                // 设置ARIA属性
                trigger.setAttribute('aria-expanded', 'false');
                trigger.setAttribute('aria-haspopup', 'true');
                menu.setAttribute('role', 'menu');
                
                // 键盘事件处理
                trigger.addEventListener('keydown', (event) => {
                    if (event.key === 'ArrowDown' || event.key === 'Enter') {
                        event.preventDefault();
                        this.openDropdown(dropdown);
                    }
                });
                
                menu.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        this.closeDropdown(dropdown);
                        trigger.focus();
                    }
                });
            }
        });
    }

    /**
     * 打开下拉菜单
     */
    openDropdown(dropdown) {
        const trigger = dropdown.querySelector('button, .dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu, .menu');
        
        if (trigger && menu) {
            trigger.setAttribute('aria-expanded', 'true');
            menu.style.display = 'block';
            
            const firstItem = menu.querySelector('a, button');
            if (firstItem) firstItem.focus();
        }
    }

    /**
     * 关闭下拉菜单
     */
    closeDropdown(dropdown) {
        const trigger = dropdown.querySelector('button, .dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu, .menu');
        
        if (trigger && menu) {
            trigger.setAttribute('aria-expanded', 'false');
            menu.style.display = 'none';
        }
    }








    /**
     * 初始化性能优化
     */
    initPerformanceOptimizations() {
        // 防抖处理
        this.setupDebouncing();
        
        // 节流处理
        this.setupThrottling();
        
        // 虚拟滚动
        if (this.options.enableVirtualScrolling) {
            this.setupVirtualScrolling();
        }
        
        // 图片懒加载
        this.setupLazyLoading();
    }

    /**
     * 设置防抖处理
     */
    setupDebouncing() {
        const searchInputs = document.querySelectorAll('input[type="search"], .search-input');
        
        searchInputs.forEach(input => {
            input.addEventListener('input', this.debounce((event) => {
                this.handleSearch(event.target.value);
            }, this.options.debounceDelay));
        });
    }

    /**
     * 设置节流处理
     */
    setupThrottling() {
        const scrollElements = document.querySelectorAll('.scrollable, .infinite-scroll');
        
        scrollElements.forEach(element => {
            element.addEventListener('scroll', this.throttle(() => {
                this.handleScroll(element);
            }, 100));
        });

        // 窗口resize节流
        window.addEventListener('resize', this.throttle(() => {
            this.handleResize();
        }, 250));
    }

    /**
     * 设置虚拟滚动
     */
    setupVirtualScrolling() {
        const virtualScrollContainers = document.querySelectorAll('.virtual-scroll');
        
        virtualScrollContainers.forEach(container => {
            this.initVirtualScroll(container);
        });
    }

    /**
     * 初始化虚拟滚动
     */
    initVirtualScroll(container) {
        const items = container.querySelectorAll('.virtual-item');
        const itemHeight = 50; // 默认项目高度
        const containerHeight = container.clientHeight;
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
        
        let scrollTop = 0;
        
        container.addEventListener('scroll', this.throttle(() => {
            scrollTop = container.scrollTop;
            this.updateVirtualItems(container, items, scrollTop, itemHeight, visibleCount);
        }, 16));
        
        // 初始渲染
        this.updateVirtualItems(container, items, scrollTop, itemHeight, visibleCount);
    }

    /**
     * 更新虚拟滚动项目
     */
    updateVirtualItems(container, items, scrollTop, itemHeight, visibleCount) {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, items.length);
        
        items.forEach((item, index) => {
            if (index >= startIndex && index < endIndex) {
                item.style.display = 'block';
                item.style.transform = `translateY(${index * itemHeight}px)`;
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        if (!query.trim()) {
            this.clearSearchResults();
            return;
        }
        
        // 模拟搜索请求
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    /**
     * 执行搜索
     */
    performSearch(query) {
        // 这里可以调用实际的搜索API
        console.log(`搜索: ${query}`);
        
        // 模拟搜索结果
        const mockResults = [
            { title: `结果1: ${query}`, url: '#' },
            { title: `结果2: ${query}`, url: '#' },
            { title: `结果3: ${query}`, url: '#' }
        ];
        
        this.displaySearchResults(mockResults);
    }

    /**
     * 显示搜索结果
     */
    displaySearchResults(results) {
        const resultsContainer = document.querySelector('.search-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = results.map(result => 
            `<div class="search-result">
                <a href="${result.url}">${result.title}</a>
            </div>`
        ).join('');
    }

    /**
     * 清空搜索结果
     */
    clearSearchResults() {
        const resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    /**
     * 处理滚动事件
     */
    handleScroll(element) {
        const { scrollTop, scrollHeight, clientHeight } = element;
        
        // 检查是否接近底部
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            this.loadMoreContent(element);
        }
    }

    /**
     * 加载更多内容
     */
    loadMoreContent(element) {
        if (element.dataset.loading === 'true') return;
        
        element.dataset.loading = 'true';
        
        // 模拟加载更多内容
        setTimeout(() => {
            const newItems = this.generateMoreItems();
            element.appendChild(newItems);
            element.dataset.loading = 'false';
        }, 1000);
    }

    /**
     * 生成更多项目
     */
    generateMoreItems() {
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < 10; i++) {
            const item = document.createElement('div');
            item.className = 'scroll-item';
            item.textContent = `新项目 ${Date.now()}_${i}`;
            fragment.appendChild(item);
        }
        
        return fragment;
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 重新计算虚拟滚动
        const virtualScrollContainers = document.querySelectorAll('.virtual-scroll');
        virtualScrollContainers.forEach(container => {
            this.initVirtualScroll(container);
        });
        
        // 重新计算工具提示位置
        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => {
            this.repositionTooltip(tooltip);
        });
    }

    /**
     * 重新定位工具提示
     */
    repositionTooltip(tooltip) {
        const trigger = document.querySelector(`[data-tooltip="${tooltip.id}"]`);
        if (trigger) {
            const rect = trigger.getBoundingClientRect();
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        }
    }

    /**
     * 防抖函数
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * 节流函数
     */
    throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }

    /**
     * 设置图片懒加载
     */
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    imageObserver.unobserve(entry.target);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    /**
     * 加载图片
     */
    loadImage(img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.addEventListener('load', () => {
            img.classList.add('loaded');
        });
    }

    // ========== 工具方法 ==========

    /**
     * 平滑滚动到元素
     */
    smoothScrollTo(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    /**
     * 动画元素
     */
    animateElement(element, animation) {
        element.style.transition = `all ${this.options.animationDuration}ms ease`;
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }

    /**
     * 添加悬停效果
     */
    addHoverEffect(element) {
        if (element.classList.contains('hover-lift')) {
            element.style.transform = 'translateY(-2px)';
            element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
    }

    /**
     * 移除悬停效果
     */
    removeHoverEffect(element) {
        element.style.transform = '';
        element.style.boxShadow = '';
    }

    /**
     * 焦点全局搜索
     */
    focusGlobalSearch() {
        const searchInput = document.querySelector('.search-input, input[type="search"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * 切换调试模式
     */
    toggleDebugMode() {
        document.body.classList.toggle('debug-mode');
        if (window.mobileUtils) {
            if (document.body.classList.contains('debug-mode')) {
                window.mobileUtils.showDebugInfo();
            } else {
                window.mobileUtils.hideDebugInfo();
            }
        }
    }

    /**
     * 关闭模态框和菜单
     */
    closeModalsAndMenus() {
        // 关闭模态框
        const modals = document.querySelectorAll('.modal.show, .modal-enhanced[style*="block"]');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close, .close');
            if (closeBtn) closeBtn.click();
        });

        // 关闭下拉菜单
        const dropdowns = document.querySelectorAll('.dropdown.show');
        dropdowns.forEach(dropdown => dropdown.classList.remove('show'));

        // 关闭移动端导航
        if (window.mobileUtils) {
            window.mobileUtils.closeMobileNavigation();
        }
    }

    /**
     * 保存当前表单
     */
    saveCurrentForm() {
        const activeForm = document.activeElement.closest('form');
        if (activeForm) {
            // 这里可以实现自动保存逻辑
            console.log('Auto-saving form...');
            this.showToast('表单已自动保存', 'success');
        }
    }

    /**
     * 提交当前表单
     */
    submitCurrentForm() {
        const activeForm = document.activeElement.closest('form');
        if (activeForm) {
            const submitBtn = activeForm.querySelector('[type="submit"], .submit-btn');
            if (submitBtn) {
                submitBtn.click();
            }
        }
    }

    /**
     * 切换全屏模式
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * 显示快捷键帮助
     */
    showShortcutHelp() {
        // 创建快捷键帮助模态框
        const helpModal = this.createShortcutHelpModal();
        document.body.appendChild(helpModal);
        helpModal.style.display = 'block';
    }

    /**
     * 创建快捷键帮助模态框
     */
    createShortcutHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'shortcut-help-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>键盘快捷键</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="shortcut-list">
                        <div class="shortcut-item">
                            <kbd>Ctrl + K</kbd>
                            <span>全局搜索</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl + S</kbd>
                            <span>保存表单</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Ctrl + Enter</kbd>
                            <span>提交表单</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>Esc</kbd>
                            <span>关闭弹窗</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>F</kbd>
                            <span>全屏模式</span>
                        </div>
                        <div class="shortcut-item">
                            <kbd>?</kbd>
                            <span>显示帮助</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: none;
        `;

        // 绑定关闭事件
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }

    /**
     * 销毁交互增强功能
     */
    destroy() {
        // 清理事件监听器
        document.removeEventListener('keydown', this.handleKeyboardShortcut);
        document.removeEventListener('contextmenu', this.showContextMenu);
        
        // 清理创建的DOM元素
        const elementsToRemove = [
            '#tooltip-container',
            '#skeleton-keyframes',
            '#ripple-keyframes',
            '.context-menu',
            '.shortcut-help-modal'
        ];
        
        elementsToRemove.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.remove();
        });

        console.log('Interaction Enhancements: Destroyed');
    }
}

// 全局实例
let interactionEnhancements = null;

// 自动初始化
document.addEventListener('DOMContentLoaded', function() {
    interactionEnhancements = new InteractionEnhancements();
    window.InteractionEnhancements = InteractionEnhancements;
    window.interactionEnhancements = interactionEnhancements;
});

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionEnhancements;
}
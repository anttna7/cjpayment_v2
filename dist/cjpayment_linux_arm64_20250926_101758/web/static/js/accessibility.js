/**
 * 可访问性管理器 - Accessibility Manager
 * 提供键盘导航、焦点管理和可访问性功能
 */

class AccessibilityManager {
    constructor() {
        this.isKeyboardMode = false;
        this.focusableElements = [];
        this.currentFocusIndex = -1;
        this.shortcuts = new Map();
        this.focusTraps = new Map();
        this.announcements = [];
        
        this.init();
    }
    
    init() {
        this.setupKeyboardDetection();
        this.setupSkipLinks();
        this.setupFocusManagement();
        this.setupKeyboardShortcuts();
        this.setupAccessibilityToolbar();
        this.setupAriaLiveRegions();
        
        // 监听DOM变化
        this.observeDOM();
        
        console.log('可访问性管理器已初始化');
    }
    
    /**
     * 设置键盘检测
     */
    setupKeyboardDetection() {
        let isTabPressed = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                isTabPressed = true;
                this.enableKeyboardMode();
            }
            
            // ESC键处理
            if (e.key === 'Escape') {
                this.handleEscape();
            }
        });
        
        document.addEventListener('mousedown', () => {
            if (isTabPressed) {
                isTabPressed = false;
                this.disableKeyboardMode();
            }
        });
        
        // 监听焦点变化
        document.addEventListener('focusin', (e) => {
            if (this.isKeyboardMode) {
                this.updateFocusIndicator(e.target);
            }
        });
    }
    
    /**
     * 启用键盘模式
     */
    enableKeyboardMode() {
        if (!this.isKeyboardMode) {
            this.isKeyboardMode = true;
            document.body.classList.add('keyboard-navigation-active');
            this.showKeyboardModeIndicator();
            this.updateFocusableElements();
        }
    }
    
    /**
     * 禁用键盘模式
     */
    disableKeyboardMode() {
        if (this.isKeyboardMode) {
            this.isKeyboardMode = false;
            document.body.classList.remove('keyboard-navigation-active');
            this.hideKeyboardModeIndicator();
        }
    }
    
    /**
     * 显示键盘模式指示器
     */
    showKeyboardModeIndicator() {
        let indicator = document.querySelector('.keyboard-mode-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'keyboard-mode-indicator';
            indicator.innerHTML = '⌨️ 键盘导航';
            indicator.setAttribute('aria-live', 'polite');
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
    
    /**
     * 隐藏键盘模式指示器
     */
    hideKeyboardModeIndicator() {
        const indicator = document.querySelector('.keyboard-mode-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }
    
    /**
     * 设置跳过链接
     */
    setupSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">跳转到主要内容</a>
            <a href="#main-navigation" class="skip-link">跳转到导航</a>
            <a href="#search" class="skip-link">跳转到搜索</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
        
        // 确保目标元素存在
        this.ensureSkipTargets();
    }
    
    /**
     * 确保跳过链接的目标元素存在
     */
    ensureSkipTargets() {
        const targets = [
            { id: 'main-content', selector: 'main, .main-content, .content' },
            { id: 'main-navigation', selector: 'nav, .navbar, .navigation' },
            { id: 'search', selector: '.search, input[type="search"]' }
        ];
        
        targets.forEach(target => {
            let element = document.getElementById(target.id);
            if (!element) {
                element = document.querySelector(target.selector);
                if (element && !element.id) {
                    element.id = target.id;
                }
            }
        });
    }
    
    /**
     * 设置焦点管理
     */
    setupFocusManagement() {
        this.updateFocusableElements();
        
        // 监听Tab键导航
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.isKeyboardMode) {
                this.handleTabNavigation(e);
            }
        });
    }
    
    /**
     * 更新可聚焦元素列表
     */
    updateFocusableElements() {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        this.focusableElements = Array.from(document.querySelectorAll(selector))
            .filter(el => this.isVisible(el) && !this.isInert(el))
            .sort((a, b) => {
                const aIndex = parseInt(a.getAttribute('tabindex')) || 0;
                const bIndex = parseInt(b.getAttribute('tabindex')) || 0;
                return aIndex - bIndex;
            });
    }
    
    /**
     * 检查元素是否可见
     */
    isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }
    
    /**
     * 检查元素是否被标记为inert
     */
    isInert(element) {
        return element.hasAttribute('inert') || 
               element.closest('[inert]') !== null;
    }
    
    /**
     * 处理Tab导航
     */
    handleTabNavigation(e) {
        const activeElement = document.activeElement;
        const currentIndex = this.focusableElements.indexOf(activeElement);
        
        if (e.shiftKey) {
            // Shift+Tab - 向前导航
            const prevIndex = currentIndex <= 0 ? this.focusableElements.length - 1 : currentIndex - 1;
            if (this.focusableElements[prevIndex]) {
                e.preventDefault();
                this.focusableElements[prevIndex].focus();
            }
        } else {
            // Tab - 向后导航
            const nextIndex = currentIndex >= this.focusableElements.length - 1 ? 0 : currentIndex + 1;
            if (this.focusableElements[nextIndex]) {
                e.preventDefault();
                this.focusableElements[nextIndex].focus();
            }
        }
    }
    
    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        // 默认快捷键
        this.registerShortcut('Alt+1', () => this.focusElement('#main-navigation'));
        this.registerShortcut('Alt+2', () => this.focusElement('#main-content'));
        this.registerShortcut('Alt+3', () => this.focusElement('#search'));
        this.registerShortcut('Alt+/', () => this.showShortcutHelp());
        this.registerShortcut('Alt+t', () => this.toggleAccessibilityToolbar());
        
        document.addEventListener('keydown', (e) => {
            const key = this.getShortcutKey(e);
            const handler = this.shortcuts.get(key);
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
    }
    
    /**
     * 注册快捷键
     */
    registerShortcut(key, handler, description = '') {
        this.shortcuts.set(key, handler);
        if (description) {
            this.shortcuts.set(key + '_desc', description);
        }
    }
    
    /**
     * 获取快捷键字符串
     */
    getShortcutKey(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');
        parts.push(e.key);
        return parts.join('+');
    }
    
    /**
     * 聚焦到指定元素
     */
    focusElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.focus();
            this.announceToScreenReader(`已聚焦到 ${element.textContent || element.getAttribute('aria-label') || selector}`);
        }
    }
    
    /**
     * 显示快捷键帮助
     */
    showShortcutHelp() {
        const shortcuts = [
            { key: 'Alt+1', desc: '聚焦到导航' },
            { key: 'Alt+2', desc: '聚焦到主要内容' },
            { key: 'Alt+3', desc: '聚焦到搜索' },
            { key: 'Alt+/', desc: '显示快捷键帮助' },
            { key: 'Alt+t', desc: '切换可访问性工具栏' },
            { key: 'Tab', desc: '下一个元素' },
            { key: 'Shift+Tab', desc: '上一个元素' },
            { key: 'Escape', desc: '关闭对话框/菜单' }
        ];
        
        const helpContent = shortcuts.map(s => 
            `<div class="shortcut-item">
                <kbd>${s.key}</kbd>
                <span>${s.desc}</span>
            </div>`
        ).join('');
        
        this.showModal('键盘快捷键', helpContent);
    }
    
    /**
     * 设置可访问性工具栏
     */
    setupAccessibilityToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'accessibility-toolbar';
        toolbar.innerHTML = `
            <button type="button" data-action="toggle-contrast" aria-label="切换高对比度">
                🎨 对比度
            </button>
            <button type="button" data-action="toggle-large-text" aria-label="切换大字体">
                🔍 大字体
            </button>
            <button type="button" data-action="toggle-focus-debug" aria-label="切换焦点调试">
                🎯 焦点调试
            </button>
            <button type="button" data-action="close-toolbar" aria-label="关闭工具栏">
                ✕
            </button>
        `;
        
        document.body.appendChild(toolbar);
        
        // 绑定工具栏事件
        toolbar.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            this.handleToolbarAction(action);
        });
    }
    
    /**
     * 切换可访问性工具栏
     */
    toggleAccessibilityToolbar() {
        const toolbar = document.querySelector('.accessibility-toolbar');
        if (toolbar) {
            toolbar.classList.toggle('show');
        }
    }
    
    /**
     * 处理工具栏操作
     */
    handleToolbarAction(action) {
        switch (action) {
            case 'toggle-contrast':
                this.toggleHighContrast();
                break;
            case 'toggle-large-text':
                this.toggleLargeText();
                break;
            case 'toggle-focus-debug':
                this.toggleFocusDebug();
                break;
            case 'close-toolbar':
                this.toggleAccessibilityToolbar();
                break;
        }
    }
    
    /**
     * 切换高对比度模式
     */
    toggleHighContrast() {
        document.body.classList.toggle('accessibility-high-contrast');
        const isEnabled = document.body.classList.contains('accessibility-high-contrast');
        this.announceToScreenReader(isEnabled ? '已启用高对比度模式' : '已禁用高对比度模式');
    }
    
    /**
     * 切换大字体模式
     */
    toggleLargeText() {
        document.body.classList.toggle('accessibility-large-text');
        const isEnabled = document.body.classList.contains('accessibility-large-text');
        this.announceToScreenReader(isEnabled ? '已启用大字体模式' : '已禁用大字体模式');
    }
    
    /**
     * 切换焦点调试模式
     */
    toggleFocusDebug() {
        document.body.classList.toggle('focus-order-debug');
        const isEnabled = document.body.classList.contains('focus-order-debug');
        
        if (isEnabled) {
            this.addFocusOrderIndicators();
        } else {
            this.removeFocusOrderIndicators();
        }
        
        this.announceToScreenReader(isEnabled ? '已启用焦点调试模式' : '已禁用焦点调试模式');
    }
    
    /**
     * 添加焦点顺序指示器
     */
    addFocusOrderIndicators() {
        this.updateFocusableElements();
        this.focusableElements.forEach((element, index) => {
            element.setAttribute('data-focus-order', index + 1);
        });
    }
    
    /**
     * 移除焦点顺序指示器
     */
    removeFocusOrderIndicators() {
        this.focusableElements.forEach(element => {
            element.removeAttribute('data-focus-order');
        });
    }
    
    /**
     * 设置ARIA Live区域
     */
    setupAriaLiveRegions() {
        // 创建公告区域
        const announcer = document.createElement('div');
        announcer.id = 'aria-announcer';
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
        
        // 创建状态区域
        const status = document.createElement('div');
        status.id = 'aria-status';
        status.className = 'sr-only';
        status.setAttribute('aria-live', 'assertive');
        status.setAttribute('aria-atomic', 'true');
        document.body.appendChild(status);
    }
    
    /**
     * 向屏幕阅读器宣布消息
     */
    announceToScreenReader(message, priority = 'polite') {
        const announcer = document.getElementById(priority === 'assertive' ? 'aria-status' : 'aria-announcer');
        if (announcer) {
            announcer.textContent = message;
            
            // 清除消息以便下次宣布
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * 创建焦点陷阱
     */
    createFocusTrap(container, options = {}) {
        const trapId = options.id || `trap-${Date.now()}`;
        
        const trap = {
            container,
            firstFocusable: null,
            lastFocusable: null,
            previousFocus: document.activeElement,
            isActive: false
        };
        
        this.focusTraps.set(trapId, trap);
        return trapId;
    }
    
    /**
     * 激活焦点陷阱
     */
    activateFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap) return;
        
        const focusableElements = trap.container.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        trap.firstFocusable = focusableElements[0];
        trap.lastFocusable = focusableElements[focusableElements.length - 1];
        trap.isActive = true;
        
        // 聚焦到第一个元素
        trap.firstFocusable.focus();
        
        // 监听Tab键
        const handleTab = (e) => {
            if (e.key !== 'Tab' || !trap.isActive) return;
            
            if (e.shiftKey) {
                if (document.activeElement === trap.firstFocusable) {
                    e.preventDefault();
                    trap.lastFocusable.focus();
                }
            } else {
                if (document.activeElement === trap.lastFocusable) {
                    e.preventDefault();
                    trap.firstFocusable.focus();
                }
            }
        };
        
        trap.handleTab = handleTab;
        document.addEventListener('keydown', handleTab);
    }
    
    /**
     * 停用焦点陷阱
     */
    deactivateFocusTrap(trapId) {
        const trap = this.focusTraps.get(trapId);
        if (!trap) return;
        
        trap.isActive = false;
        
        if (trap.handleTab) {
            document.removeEventListener('keydown', trap.handleTab);
        }
        
        // 恢复之前的焦点
        if (trap.previousFocus && trap.previousFocus.focus) {
            trap.previousFocus.focus();
        }
        
        this.focusTraps.delete(trapId);
    }
    
    /**
     * 处理ESC键
     */
    handleEscape() {
        // 关闭活动的焦点陷阱
        for (const [trapId, trap] of this.focusTraps) {
            if (trap.isActive) {
                this.deactivateFocusTrap(trapId);
                break;
            }
        }
        
        // 关闭模态框
        const modal = document.querySelector('.modal.show');
        if (modal && window.ModalComponent) {
            window.ModalComponent.close();
        }
        
        // 关闭下拉菜单
        const dropdown = document.querySelector('.dropdown.show');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    /**
     * 更新焦点指示器
     */
    updateFocusIndicator(element) {
        // 移除之前的指示器
        const prevIndicator = document.querySelector('.focus-indicator');
        if (prevIndicator) {
            prevIndicator.remove();
        }
        
        // 为当前元素添加指示器
        if (element && this.isKeyboardMode) {
            const rect = element.getBoundingClientRect();
            const indicator = document.createElement('div');
            indicator.className = 'focus-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: ${rect.top - 2}px;
                left: ${rect.left - 2}px;
                width: ${rect.width + 4}px;
                height: ${rect.height + 4}px;
                border: 2px solid var(--primary-500, #3b82f6);
                border-radius: 4px;
                pointer-events: none;
                z-index: 9999;
                transition: all 0.1s ease-in-out;
            `;
            document.body.appendChild(indicator);
        }
    }
    
    /**
     * 显示模态框
     */
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <div class="modal-header">
                    <h2 id="modal-title" class="modal-title">${title}</h2>
                    <button type="button" class="modal-close" aria-label="关闭">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 创建焦点陷阱
        const trapId = this.createFocusTrap(modal.querySelector('.modal-content'));
        this.activateFocusTrap(trapId);
        
        // 绑定关闭事件
        const closeBtn = modal.querySelector('.modal-close');
        const backdrop = modal.querySelector('.modal-backdrop');
        
        const closeModal = () => {
            this.deactivateFocusTrap(trapId);
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
    }
    
    /**
     * 监听DOM变化
     */
    observeDOM() {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || 
                    (mutation.type === 'attributes' && 
                     ['disabled', 'tabindex', 'hidden'].includes(mutation.attributeName))) {
                    shouldUpdate = true;
                }
            });
            
            if (shouldUpdate) {
                this.updateFocusableElements();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'tabindex', 'hidden', 'aria-hidden']
        });
    }
    
    /**
     * 添加可访问性属性到现有组件
     */
    enhanceExistingComponents() {
        // 增强按钮
        document.querySelectorAll('.btn').forEach(btn => {
            if (!btn.hasAttribute('role')) {
                btn.setAttribute('role', 'button');
            }
            btn.classList.add('focusable');
        });
        
        // 增强表单输入
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.add('focusable');
            
            // 添加必填标识
            if (input.hasAttribute('required')) {
                input.setAttribute('aria-required', 'true');
            }
        });
        
        // 增强卡片
        document.querySelectorAll('.card').forEach(card => {
            if (card.querySelector('a, button')) {
                card.setAttribute('role', 'region');
            }
        });
        
        // 增强导航
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.add('focusable');
        });
        
        // 增强表格
        document.querySelectorAll('.table').forEach(table => {
            if (!table.hasAttribute('role')) {
                table.setAttribute('role', 'table');
            }
        });
    }
}

// 初始化可访问性管理器
document.addEventListener('DOMContentLoaded', () => {
    window.AccessibilityManager = new AccessibilityManager();
    
    // 增强现有组件
    window.AccessibilityManager.enhanceExistingComponents();
});

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
}
/**
 * Toast增强组件
 * 提供丰富的消息提示功能
 */

class ToastEnhanced {
    constructor() {
        this.toasts = new Map();
        this.container = null;
        this.defaultOptions = {
            duration: 5000,
            position: 'top-right',
            showProgress: true,
            closeButton: true,
            animation: 'slide'
        };
        this.init();
    }

    init() {
        this.createContainer();
        this.bindGlobalEvents();
        console.log('Toast Enhanced: 初始化完成');
    }

    createContainer() {
        // 创建Toast容器
        this.container = document.createElement('div');
        this.container.className = 'toast-enhanced-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 420px;
            width: 100%;
        `;
        document.body.appendChild(this.container);

        // 添加样式
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('toast-enhanced-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'toast-enhanced-styles';
        styles.textContent = `
            .toast-enhanced-item {
                background: var(--color-bg-surface, white);
                border-radius: var(--border-radius-md, 8px);
                box-shadow: var(--card-shadow-hover, 0 8px 24px rgba(0, 0, 0, 0.15));
                border: 1px solid var(--color-border-light, #e5e7eb);
                margin-bottom: 12px;
                overflow: hidden;
                pointer-events: auto;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                transform: translateX(100%);
                opacity: 0;
                position: relative;
            }

            .toast-enhanced-item.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast-enhanced-item.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .toast-enhanced-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                width: 4px;
                background: var(--toast-accent-color, #3b82f6);
            }

            .toast-enhanced-item.success::before {
                background: var(--color-success, #10b981);
            }

            .toast-enhanced-item.error::before {
                background: var(--color-error, #ef4444);
            }

            .toast-enhanced-item.warning::before {
                background: var(--color-warning, #f59e0b);
            }

            .toast-enhanced-item.info::before {
                background: var(--color-info, #3b82f6);
            }

            .toast-enhanced-content {
                padding: 16px;
                padding-right: 48px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }

            .toast-enhanced-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 12px;
                margin-top: 2px;
            }

            .toast-enhanced-icon.success {
                background: var(--color-success-bg, #d1fae5);
                color: var(--color-success, #10b981);
            }

            .toast-enhanced-icon.error {
                background: var(--color-error-bg, #fee2e2);
                color: var(--color-error, #ef4444);
            }

            .toast-enhanced-icon.warning {
                background: var(--color-warning-bg, #fef3c7);
                color: var(--color-warning, #f59e0b);
            }

            .toast-enhanced-icon.info {
                background: var(--color-info-bg, #dbeafe);
                color: var(--color-info, #3b82f6);
            }

            .toast-enhanced-body {
                flex: 1;
            }

            .toast-enhanced-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--color-text-primary, #111827);
                margin: 0 0 4px 0;
                line-height: 1.4;
            }

            .toast-enhanced-message {
                font-size: 13px;
                color: var(--color-text-secondary, #6b7280);
                margin: 0;
                line-height: 1.4;
            }

            .toast-enhanced-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 24px;
                height: 24px;
                border: none;
                background: none;
                color: var(--color-text-tertiary, #9ca3af);
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-size: 16px;
            }

            .toast-enhanced-close:hover {
                background: var(--color-bg-hover, #f3f4f6);
                color: var(--color-text-secondary, #6b7280);
            }

            .toast-enhanced-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: var(--toast-accent-color, #3b82f6);
                transform-origin: left;
                animation: toast-progress var(--duration, 5000ms) linear forwards;
            }

            @keyframes toast-progress {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
            }

            /* 响应式设计 */
            @media (max-width: 640px) {
                .toast-enhanced-container {
                    left: 12px;
                    right: 12px;
                    top: 12px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(message, type = 'info', options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const id = this.generateId();
        
        const toast = this.createToast(id, message, type, config);
        this.container.appendChild(toast);
        this.toasts.set(id, { element: toast, config, timer: null });

        // 触发显示动画
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 设置自动关闭
        if (config.duration > 0) {
            const timer = setTimeout(() => {
                this.hide(id);
            }, config.duration);
            this.toasts.get(id).timer = timer;
        }

        return id;
    }

    createToast(id, message, type, config) {
        const toast = document.createElement('div');
        toast.className = `toast-enhanced-item ${type}`;
        toast.dataset.id = id;

        const iconSymbols = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const titles = {
            success: '成功',
            error: '错误', 
            warning: '警告',
            info: '提示'
        };

        toast.innerHTML = `
            <div class="toast-enhanced-content">
                <div class="toast-enhanced-icon ${type}">${iconSymbols[type] || 'ℹ'}</div>
                <div class="toast-enhanced-body">
                    <div class="toast-enhanced-title">${titles[type] || '提示'}</div>
                    <div class="toast-enhanced-message">${this.escapeHtml(message)}</div>
                </div>
            </div>
            ${config.closeButton ? '<button class="toast-enhanced-close">×</button>' : ''}
            ${config.showProgress && config.duration > 0 ? 
                `<div class="toast-enhanced-progress" style="--duration: ${config.duration}ms;"></div>` : ''}
        `;

        // 绑定关闭按钮事件
        const closeBtn = toast.querySelector('.toast-enhanced-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide(id));
        }

        // 点击Toast也可以关闭（可选）
        if (config.clickToClose !== false) {
            toast.addEventListener('click', () => this.hide(id));
        }

        return toast;
    }

    hide(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const { element, timer } = toastData;
        
        // 清除定时器
        if (timer) {
            clearTimeout(timer);
        }

        // 隐藏动画
        element.classList.add('hide');
        element.classList.remove('show');

        // 动画完成后移除元素
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.delete(id);
        }, 300);
    }

    clear() {
        this.toasts.forEach((_, id) => {
            this.hide(id);
        });
    }

    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: 8000 });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    bindGlobalEvents() {
        // ESC键关闭所有Toast
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
            }
        });

        // 页面失去焦点时暂停进度条
        document.addEventListener('visibilitychange', () => {
            const progressBars = this.container.querySelectorAll('.toast-enhanced-progress');
            progressBars.forEach(bar => {
                if (document.hidden) {
                    bar.style.animationPlayState = 'paused';
                } else {
                    bar.style.animationPlayState = 'running';
                }
            });
        });
    }

    generateId() {
        return 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局实例
const toastEnhanced = new ToastEnhanced();

// 兼容性API
window.ToastManager = {
    show: (message, type = 'info', options = {}) => toastEnhanced.show(message, type, options),
    success: (message, options = {}) => toastEnhanced.success(message, options),
    error: (message, options = {}) => toastEnhanced.error(message, options),
    warning: (message, options = {}) => toastEnhanced.warning(message, options),
    info: (message, options = {}) => toastEnhanced.info(message, options),
    clear: () => toastEnhanced.clear()
};

// 全局暴露增强实例
window.toastEnhanced = toastEnhanced;
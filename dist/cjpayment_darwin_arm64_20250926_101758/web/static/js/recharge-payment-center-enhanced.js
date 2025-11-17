// 充值支付管理中心增强交互脚本

class RechargePaymentCenterEnhanced {
    constructor() {
        this.currentTab = 'config';
        this.isLoaded = false;
        this.animationQueue = [];
        this.observers = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeAnimations();
        this.setupIntersectionObserver();
        this.initializeCounters();
        this.setupTabSwitching();
        this.initializeTooltips();
        this.setupLiveUpdates();
        this.preloadAssets();
    }

    // ================== 事件监听器设置 ==================
    setupEventListeners() {
        // 标签切换
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // 统计卡片点击效果
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.animateCardClick(e.currentTarget);
            });
        });

        // 表单输入增强
        document.querySelectorAll('.form-input, .form-select').forEach(input => {
            input.addEventListener('focus', (e) => {
                this.enhanceInputFocus(e.target);
            });

            input.addEventListener('blur', (e) => {
                this.enhanceInputBlur(e.target);
            });
        });

        // 配置组悬停效果
        document.querySelectorAll('.config-group').forEach(group => {
            group.addEventListener('mouseenter', (e) => {
                this.animateConfigGroupHover(e.currentTarget, true);
            });

            group.addEventListener('mouseleave', (e) => {
                this.animateConfigGroupHover(e.currentTarget, false);
            });
        });

        // 复选框动画
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.animateCheckbox(e.target);
            });
        });

        // 按钮增强效果
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.createRippleEffect(e);
            });
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // 滚动视差效果
        window.addEventListener('scroll', this.throttle(() => {
            this.handleScrollEffects();
        }, 16));

        // 窗口大小变化
        window.addEventListener('resize', this.throttle(() => {
            this.handleResponsiveLayout();
        }, 100));
    }

    // ================== 初始化动画 ==================
    initializeAnimations() {
        // 页面加载动画
        this.animatePageLoad();

        // 统计数字动画
        this.animateStatNumbers();

        // 卡片入场动画
        this.animateCardsEntrance();

        // 标题动画
        this.animatePageTitle();
    }

    animatePageLoad() {
        const timeline = [
            { element: '.page__title-section', delay: 0, animation: 'slideInDown' },
            { element: '.stats-row', delay: 200, animation: 'fadeInUp' },
            { element: '.content-tabs', delay: 400, animation: 'fadeInUp' },
            { element: '.config-section', delay: 600, animation: 'fadeIn' }
        ];

        timeline.forEach(({ element, delay, animation }) => {
            setTimeout(() => {
                const elements = document.querySelectorAll(element);
                elements.forEach((el, index) => {
                    el.style.opacity = '0';
                    el.style.transform = this.getInitialTransform(animation);

                    setTimeout(() => {
                        el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    }, index * 100);
                });
            }, delay);
        });
    }

    getInitialTransform(animation) {
        const transforms = {
            'slideInDown': 'translateY(-50px)',
            'fadeInUp': 'translateY(30px)',
            'fadeIn': 'scale(0.9)',
            'slideInLeft': 'translateX(-50px)',
            'slideInRight': 'translateX(50px)'
        };
        return transforms[animation] || 'translateY(20px)';
    }

    animateStatNumbers() {
        const statValues = document.querySelectorAll('.stat-card__value');

        statValues.forEach(value => {
            const finalText = value.textContent;
            const isNumber = /^[¥\d,%.]+$/.test(finalText.replace(/\s/g, ''));

            if (isNumber) {
                const numValue = parseFloat(finalText.replace(/[¥,%]/g, ''));
                if (!isNaN(numValue)) {
                    value.textContent = '0';
                    this.animateNumber(value, 0, numValue, finalText, 2000);
                }
            }
        });
    }

    animateNumber(element, start, end, finalFormat, duration) {
        const startTime = performance.now();
        const isPercentage = finalFormat.includes('%');
        const isCurrency = finalFormat.includes('¥');

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const current = start + (end - start) * this.easeOutCubic(progress);

            let displayValue = Math.floor(current);
            if (isCurrency) {
                displayValue = '¥' + displayValue.toLocaleString();
            } else if (isPercentage) {
                displayValue = (current).toFixed(1) + '%';
            } else {
                displayValue = displayValue.toLocaleString();
            }

            element.textContent = displayValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    animateCardsEntrance() {
        const cards = document.querySelectorAll('.stat-card, .config-group');

        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px) scale(0.95)';

            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) scale(1)';
            }, index * 150);
        });
    }

    animatePageTitle() {
        const title = document.querySelector('.page__title');
        const icon = document.querySelector('.page__icon');

        if (title && icon) {
            // 标题打字机效果
            const text = title.textContent;
            title.textContent = '';
            title.style.borderRight = '2px solid white';

            let i = 0;
            const typeWriter = () => {
                if (i < text.length) {
                    title.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeWriter, 100);
                } else {
                    title.style.borderRight = 'none';
                }
            };

            setTimeout(typeWriter, 500);
        }
    }

    // ================== 标签切换增强 ==================
    setupTabSwitching() {
        // 初始化标签指示器
        this.createTabIndicator();
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        const currentPanel = document.querySelector('.tab-panel--active');
        const targetPanel = document.getElementById(`${tabName}Panel`);
        const currentButton = document.querySelector('.tab-button--active');
        const targetButton = document.querySelector(`[data-tab="${tabName}"]`);

        if (!targetPanel || !targetButton) return;

        // 动画切换
        this.animateTabSwitch(currentPanel, targetPanel, currentButton, targetButton);

        this.currentTab = tabName;
        this.updateTabIndicator(targetButton);
    }

    animateTabSwitch(currentPanel, targetPanel, currentButton, targetButton) {
        // 按钮状态切换
        currentButton.classList.remove('tab-button--active');
        targetButton.classList.add('tab-button--active');

        // 面板切换动画
        if (currentPanel) {
            currentPanel.style.transform = 'translateX(-20px)';
            currentPanel.style.opacity = '0';

            setTimeout(() => {
                currentPanel.classList.remove('tab-panel--active');
                currentPanel.style.transform = '';
                currentPanel.style.opacity = '';
            }, 300);
        }

        setTimeout(() => {
            targetPanel.classList.add('tab-panel--active');
            targetPanel.style.transform = 'translateX(20px)';
            targetPanel.style.opacity = '0';

            setTimeout(() => {
                targetPanel.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                targetPanel.style.transform = 'translateX(0)';
                targetPanel.style.opacity = '1';

                setTimeout(() => {
                    targetPanel.style.transition = '';
                    targetPanel.style.transform = '';
                    targetPanel.style.opacity = '';
                }, 400);
            }, 50);
        }, 300);
    }

    createTabIndicator() {
        const tabList = document.querySelector('.tab-list');
        const indicator = document.createElement('div');
        indicator.className = 'tab-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: 0;
            height: 3px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 2px 2px 0 0;
            z-index: 2;
        `;
        tabList.appendChild(indicator);

        // 初始位置
        const activeButton = document.querySelector('.tab-button--active');
        if (activeButton) {
            this.updateTabIndicator(activeButton);
        }
    }

    updateTabIndicator(targetButton) {
        const indicator = document.querySelector('.tab-indicator');
        if (indicator && targetButton) {
            const rect = targetButton.getBoundingClientRect();
            const parentRect = targetButton.parentElement.getBoundingClientRect();

            indicator.style.left = (targetButton.offsetLeft) + 'px';
            indicator.style.width = targetButton.offsetWidth + 'px';
        }
    }

    // ================== 交互效果增强 ==================
    animateCardClick(card) {
        // 创建波纹效果
        const ripple = document.createElement('div');
        ripple.className = 'card-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(102, 126, 234, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        const rect = card.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';

        card.style.position = 'relative';
        card.appendChild(ripple);

        // 添加CSS动画
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
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

        setTimeout(() => {
            ripple.remove();
        }, 600);

        // 卡片弹跳效果
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = 'scale(1.02)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        }, 100);
    }

    enhanceInputFocus(input) {
        const parent = input.closest('.form-group');
        if (parent) {
            parent.classList.add('form-group--focused');

            // 创建聚焦光晕效果
            const glow = document.createElement('div');
            glow.className = 'input-glow';
            glow.style.cssText = `
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 14px;
                opacity: 0;
                z-index: -1;
                transition: opacity 0.3s ease;
            `;

            input.style.position = 'relative';
            input.parentNode.style.position = 'relative';
            input.parentNode.insertBefore(glow, input);

            setTimeout(() => {
                glow.style.opacity = '0.2';
            }, 10);
        }
    }

    enhanceInputBlur(input) {
        const parent = input.closest('.form-group');
        if (parent) {
            parent.classList.remove('form-group--focused');

            const glow = parent.querySelector('.input-glow');
            if (glow) {
                glow.style.opacity = '0';
                setTimeout(() => {
                    glow.remove();
                }, 300);
            }
        }
    }

    animateConfigGroupHover(group, isEntering) {
        const icon = group.querySelector('.config-group-title');

        if (isEntering) {
            group.style.transform = 'translateY(-8px) scale(1.02)';
            if (icon) {
                icon.style.transform = 'scale(1.05)';
            }
        } else {
            group.style.transform = '';
            if (icon) {
                icon.style.transform = '';
            }
        }
    }

    animateCheckbox(checkbox) {
        const custom = checkbox.nextElementSibling;
        if (custom && custom.classList.contains('checkbox-custom')) {
            if (checkbox.checked) {
                custom.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    custom.style.transform = 'scale(1)';
                }, 150);
            } else {
                custom.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    custom.style.transform = 'scale(1)';
                }, 150);
            }
        }
    }

    createRippleEffect(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');

        ripple.className = 'button-ripple';
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: button-ripple 0.5s linear;
        `;

        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        // 添加按钮波纹动画
        if (!document.querySelector('#button-ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'button-ripple-styles';
            style.textContent = `
                @keyframes button-ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            ripple.remove();
        }, 500);
    }

    // ================== 数据计数器动画 ==================
    initializeCounters() {
        this.setupLiveCounters();
    }

    setupLiveCounters() {
        const counters = {
            totalLinks: { current: 156, target: 180, increment: 0.5 },
            totalAmount: { current: 2847392, target: 3200000, increment: 1000 },
            successRate: { current: 94.6, target: 96.2, increment: 0.02 },
            activeMerchants: { current: 89, target: 95, increment: 0.1 }
        };

        Object.entries(counters).forEach(([id, data]) => {
            setInterval(() => {
                const element = document.getElementById(id);
                if (element && data.current < data.target) {
                    data.current += data.increment;
                    if (data.current > data.target) data.current = data.target;

                    this.updateCounterDisplay(element, data.current, id);
                }
            }, 2000 + Math.random() * 3000);
        });
    }

    updateCounterDisplay(element, value, type) {
        let displayValue;

        switch (type) {
            case 'totalAmount':
                displayValue = '¥' + Math.floor(value).toLocaleString();
                break;
            case 'successRate':
                displayValue = value.toFixed(1) + '%';
                break;
            default:
                displayValue = Math.floor(value).toLocaleString();
        }

        // 数字变化动画
        element.style.transform = 'scale(1.1)';
        element.style.color = '#667eea';
        element.textContent = displayValue;

        setTimeout(() => {
            element.style.transform = '';
            element.style.color = '';
        }, 200);
    }

    // ================== 工具函数 ==================
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

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

    // ================== 响应式处理 ==================
    handleResponsiveLayout() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024;

        // 动态调整动画
        document.documentElement.style.setProperty(
            '--animation-duration',
            isMobile ? '0.3s' : '0.5s'
        );

        // 重新计算标签指示器位置
        const activeButton = document.querySelector('.tab-button--active');
        if (activeButton) {
            this.updateTabIndicator(activeButton);
        }
    }

    // ================== 其他功能 ==================
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in-view');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.config-group, .stat-card').forEach(el => {
            observer.observe(el);
        });
    }

    initializeTooltips() {
        // 为表单帮助文本添加交互提示
        document.querySelectorAll('.form-help').forEach(help => {
            help.style.opacity = '0.7';
            help.style.transition = 'opacity 0.3s ease';

            const input = help.closest('.form-group').querySelector('.form-input, .form-select');
            if (input) {
                input.addEventListener('focus', () => {
                    help.style.opacity = '1';
                });
                input.addEventListener('blur', () => {
                    help.style.opacity = '0.7';
                });
            }
        });
    }

    setupLiveUpdates() {
        // 模拟实时数据更新
        setInterval(() => {
            this.updateRandomStat();
        }, 10000);
    }

    updateRandomStat() {
        const stats = ['totalLinks', 'totalAmount', 'successRate', 'activeMerchants'];
        const randomStat = stats[Math.floor(Math.random() * stats.length)];
        const element = document.getElementById(randomStat);

        if (element) {
            element.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
                element.style.animation = '';
            }, 1000);
        }
    }

    handleKeyboardShortcuts(e) {
        // Tab切换快捷键 (Alt + 数字)
        if (e.altKey && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const tabs = ['config', 'links', 'analytics', 'testing'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                this.switchTab(tabs[tabIndex]);
            }
        }
    }

    handleScrollEffects() {
        const scrollTop = window.pageYOffset;
        const header = document.querySelector('.page__title-section');

        if (header) {
            const parallaxOffset = scrollTop * 0.5;
            header.style.transform = `translateY(${parallaxOffset}px)`;
        }
    }

    preloadAssets() {
        // 预加载关键资源
        const criticalImages = [
            // 添加需要预加载的图片URL
        ];

        criticalImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
}

// 初始化增强功能
document.addEventListener('DOMContentLoaded', () => {
    const enhancedCenter = new RechargePaymentCenterEnhanced();
    window.rechargePaymentEnhanced = enhancedCenter;
});

// 添加全局样式增强
const globalStyles = document.createElement('style');
globalStyles.textContent = `
    .animate-in-view {
        animation: slideInUp 0.6s ease-out;
    }

    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .form-group--focused .form-label {
        color: var(--primary);
        transform: translateY(-2px);
    }

    .page__title-section {
        will-change: transform;
    }

    .stat-card,
    .config-group {
        will-change: transform, box-shadow;
    }

    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
`;

document.head.appendChild(globalStyles);
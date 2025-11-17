/**
 * CJPayment Page Transition System
 * Handles smooth page transitions and route animations
 */

window.CJPageTransitions = (function() {
    'use strict';

    class PageTransitionManager {
        constructor(options = {}) {
            this.options = {
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                defaultTransition: 'fade',
                enableProgressBar: true,
                progressBarColor: 'var(--primary-500)',
                ...options
            };

            this.isTransitioning = false;
            this.currentTransition = null;
            this.progressBar = null;
            this.pageContainer = null;

            this.init();
        }

        init() {
            this.createProgressBar();
            this.setupPageContainer();
            this.bindRouterEvents();
            this.addTransitionStyles();
        }

        // ==========================================================================
        // Progress Bar
        // ==========================================================================

        createProgressBar() {
            if (!this.options.enableProgressBar) return;

            this.progressBar = document.createElement('div');
            this.progressBar.className = 'page-transition-progress';
            this.progressBar.innerHTML = '<div class="page-transition-progress__bar"></div>';
            
            document.body.appendChild(this.progressBar);
        }

        showProgressBar() {
            if (!this.progressBar) return;

            this.progressBar.classList.add('active');
            const bar = this.progressBar.querySelector('.page-transition-progress__bar');
            
            // Animate progress bar
            bar.style.width = '0%';
            requestAnimationFrame(() => {
                bar.style.width = '70%';
            });
        }

        hideProgressBar() {
            if (!this.progressBar) return;

            const bar = this.progressBar.querySelector('.page-transition-progress__bar');
            bar.style.width = '100%';
            
            setTimeout(() => {
                this.progressBar.classList.remove('active');
                setTimeout(() => {
                    bar.style.width = '0%';
                }, 200);
            }, 100);
        }

        // ==========================================================================
        // Page Container Setup
        // ==========================================================================

        setupPageContainer() {
            this.pageContainer = document.querySelector('#pageContent') || 
                                document.querySelector('.app__main') ||
                                document.querySelector('main');

            if (!this.pageContainer) {
                console.warn('Page container not found. Creating default container.');
                this.pageContainer = document.createElement('div');
                this.pageContainer.id = 'pageContent';
                this.pageContainer.className = 'page-content';
                document.body.appendChild(this.pageContainer);
            }

            // Add transition wrapper
            if (!this.pageContainer.querySelector('.page-transition-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'page-transition-wrapper';
                
                // Move existing content to wrapper
                while (this.pageContainer.firstChild) {
                    wrapper.appendChild(this.pageContainer.firstChild);
                }
                
                this.pageContainer.appendChild(wrapper);
            }
        }

        // ==========================================================================
        // Router Integration
        // ==========================================================================

        bindRouterEvents() {
            if (window.CJRouter) {
                // Listen for route changes
                window.addEventListener('router:changed', (e) => {
                    this.handleRouteChange(e.detail);
                });

                // Show progress on navigation start
                document.addEventListener('click', (e) => {
                    const link = e.target.closest('a[href]');
                    if (link && this.shouldTransition(link)) {
                        this.showProgressBar();
                    }
                });
            }
        }

        shouldTransition(link) {
            // Don't transition for external links
            if (link.hostname !== window.location.hostname) {
                return false;
            }

            // Don't transition if disabled
            if (link.hasAttribute('data-no-transition')) {
                return false;
            }

            return true;
        }

        // ==========================================================================
        // Transition Handling
        // ==========================================================================

        async handleRouteChange(routeData) {
            if (this.isTransitioning) return;

            const transitionType = this.getTransitionType(routeData);
            await this.performTransition(transitionType, routeData);
        }

        getTransitionType(routeData) {
            // Check for custom transition in route meta
            if (routeData.route && routeData.route.meta && routeData.route.meta.transition) {
                return routeData.route.meta.transition;
            }

            // Check for data attribute on current page
            const currentPage = this.pageContainer.querySelector('.page-transition-wrapper');
            if (currentPage && currentPage.dataset.transition) {
                return currentPage.dataset.transition;
            }

            return this.options.defaultTransition;
        }

        async performTransition(transitionType, routeData) {
            this.isTransitioning = true;
            this.currentTransition = transitionType;

            try {
                const wrapper = this.pageContainer.querySelector('.page-transition-wrapper');
                if (!wrapper) return;

                // Start exit animation
                await this.animateExit(wrapper, transitionType);

                // Wait for new content to be ready
                await this.waitForContent();

                // Start enter animation
                await this.animateEnter(wrapper, transitionType);

                this.hideProgressBar();
            } catch (error) {
                console.error('Transition error:', error);
                this.hideProgressBar();
            } finally {
                this.isTransitioning = false;
                this.currentTransition = null;
            }
        }

        // ==========================================================================
        // Animation Methods
        // ==========================================================================

        async animateExit(element, transitionType) {
            return new Promise((resolve) => {
                element.classList.add('page-exit', `page-exit--${transitionType}`);
                
                const handleTransitionEnd = () => {
                    element.removeEventListener('transitionend', handleTransitionEnd);
                    resolve();
                };

                element.addEventListener('transitionend', handleTransitionEnd);
                
                // Fallback timeout
                setTimeout(resolve, this.options.duration + 50);
            });
        }

        async animateEnter(element, transitionType) {
            return new Promise((resolve) => {
                // Remove exit classes
                element.classList.remove('page-exit', `page-exit--${transitionType}`);
                
                // Add enter classes
                element.classList.add('page-enter', `page-enter--${transitionType}`);
                
                // Force reflow
                element.offsetHeight;
                
                // Start enter animation
                requestAnimationFrame(() => {
                    element.classList.add('page-enter-active');
                    
                    const handleTransitionEnd = () => {
                        element.removeEventListener('transitionend', handleTransitionEnd);
                        element.classList.remove('page-enter', `page-enter--${transitionType}`, 'page-enter-active');
                        resolve();
                    };

                    element.addEventListener('transitionend', handleTransitionEnd);
                    
                    // Fallback timeout
                    setTimeout(() => {
                        element.classList.remove('page-enter', `page-enter--${transitionType}`, 'page-enter-active');
                        resolve();
                    }, this.options.duration + 50);
                });
            });
        }

        async waitForContent() {
            // Wait for DOM to be updated with new content
            return new Promise((resolve) => {
                // Use MutationObserver to detect content changes
                const observer = new MutationObserver((mutations) => {
                    const hasContentChanges = mutations.some(mutation => 
                        mutation.type === 'childList' && mutation.addedNodes.length > 0
                    );
                    
                    if (hasContentChanges) {
                        observer.disconnect();
                        // Wait a bit more for content to settle
                        setTimeout(resolve, 50);
                    }
                });

                observer.observe(this.pageContainer, {
                    childList: true,
                    subtree: true
                });

                // Fallback timeout
                setTimeout(() => {
                    observer.disconnect();
                    resolve();
                }, 1000);
            });
        }

        // ==========================================================================
        // Component Transitions
        // ==========================================================================

        async transitionComponent(element, transitionType = 'fade', options = {}) {
            if (!element) return;

            const config = {
                duration: this.options.duration,
                easing: this.options.easing,
                ...options
            };

            return new Promise((resolve) => {
                element.style.transition = `all ${config.duration}ms ${config.easing}`;
                element.classList.add('component-transition', `component-transition--${transitionType}`);

                const handleTransitionEnd = () => {
                    element.removeEventListener('transitionend', handleTransitionEnd);
                    element.classList.remove('component-transition', `component-transition--${transitionType}`);
                    element.style.transition = '';
                    resolve();
                };

                element.addEventListener('transitionend', handleTransitionEnd);
                
                // Fallback timeout
                setTimeout(() => {
                    element.classList.remove('component-transition', `component-transition--${transitionType}`);
                    element.style.transition = '';
                    resolve();
                }, config.duration + 50);
            });
        }

        // ==========================================================================
        // Loading States
        // ==========================================================================

        showLoadingState(message = '加载中...') {
            const wrapper = this.pageContainer.querySelector('.page-transition-wrapper');
            if (!wrapper) return;

            // Create loading overlay
            const loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'page-loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="page-loading-content">
                    <div class="page-loading-spinner"></div>
                    <div class="page-loading-message">${message}</div>
                </div>
            `;

            wrapper.appendChild(loadingOverlay);

            // Animate in
            requestAnimationFrame(() => {
                loadingOverlay.classList.add('active');
            });

            return loadingOverlay;
        }

        hideLoadingState() {
            const loadingOverlay = this.pageContainer.querySelector('.page-loading-overlay');
            if (!loadingOverlay) return;

            loadingOverlay.classList.remove('active');
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 300);
        }

        // ==========================================================================
        // CSS Styles
        // ==========================================================================

        addTransitionStyles() {
            if (document.querySelector('#page-transition-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'page-transition-styles';
            styles.textContent = `
                /* Progress Bar */
                .page-transition-progress {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: transparent;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 200ms ease;
                }

                .page-transition-progress.active {
                    opacity: 1;
                }

                .page-transition-progress__bar {
                    height: 100%;
                    background: ${this.options.progressBarColor};
                    width: 0%;
                    transition: width 300ms ease;
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                }

                /* Page Transitions */
                .page-transition-wrapper {
                    transition: all ${this.options.duration}ms ${this.options.easing};
                }

                /* Fade Transition */
                .page-exit--fade {
                    opacity: 0;
                }

                .page-enter--fade {
                    opacity: 0;
                }

                .page-enter-active {
                    opacity: 1;
                }

                /* Slide Transitions */
                .page-exit--slide-left {
                    transform: translateX(-100%);
                }

                .page-enter--slide-left {
                    transform: translateX(100%);
                }

                .page-exit--slide-right {
                    transform: translateX(100%);
                }

                .page-enter--slide-right {
                    transform: translateX(-100%);
                }

                .page-exit--slide-up {
                    transform: translateY(-100%);
                }

                .page-enter--slide-up {
                    transform: translateY(100%);
                }

                .page-exit--slide-down {
                    transform: translateY(100%);
                }

                .page-enter--slide-down {
                    transform: translateY(-100%);
                }

                /* Scale Transition */
                .page-exit--scale {
                    transform: scale(0.9);
                    opacity: 0;
                }

                .page-enter--scale {
                    transform: scale(1.1);
                    opacity: 0;
                }

                /* Zoom Transition */
                .page-exit--zoom {
                    transform: scale(0.8);
                    opacity: 0;
                }

                .page-enter--zoom {
                    transform: scale(0.8);
                    opacity: 0;
                }

                /* Component Transitions */
                .component-transition--fade {
                    opacity: 0;
                }

                .component-transition--slide-up {
                    transform: translateY(20px);
                    opacity: 0;
                }

                .component-transition--slide-down {
                    transform: translateY(-20px);
                    opacity: 0;
                }

                .component-transition--scale {
                    transform: scale(0.95);
                    opacity: 0;
                }

                /* Loading Overlay */
                .page-loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 300ms ease;
                    z-index: 100;
                }

                .page-loading-overlay.active {
                    opacity: 1;
                }

                .page-loading-content {
                    text-align: center;
                    color: var(--text-secondary, #64748b);
                }

                .page-loading-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid var(--border-primary, #e2e8f0);
                    border-top: 3px solid var(--primary-500, #3b82f6);
                    border-radius: 50%;
                    animation: page-loading-spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                .page-loading-message {
                    font-size: 14px;
                    font-weight: 500;
                }

                @keyframes page-loading-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Reduced motion support */
                @media (prefers-reduced-motion: reduce) {
                    .page-transition-wrapper,
                    .page-transition-progress__bar,
                    .page-loading-overlay,
                    .component-transition {
                        transition: none !important;
                        animation: none !important;
                    }

                    .page-loading-spinner {
                        animation: none !important;
                        border-top-color: transparent !important;
                    }
                }
            `;

            document.head.appendChild(styles);
        }

        // ==========================================================================
        // Public API
        // ==========================================================================

        setDefaultTransition(transitionType) {
            this.options.defaultTransition = transitionType;
        }

        setDuration(duration) {
            this.options.duration = duration;
        }

        setEasing(easing) {
            this.options.easing = easing;
        }

        isTransitionActive() {
            return this.isTransitioning;
        }

        getCurrentTransition() {
            return this.currentTransition;
        }

        // Manual transition trigger
        async triggerTransition(transitionType = 'fade', options = {}) {
            if (this.isTransitioning) return;

            const routeData = {
                route: { meta: { transition: transitionType } },
                ...options
            };

            await this.performTransition(transitionType, routeData);
        }
    }

    // ==========================================================================
    // Transition Presets
    // ==========================================================================

    const presets = {
        // Navigation transitions
        navigation: {
            dashboard: 'fade',
            recharge: 'slide-left',
            merchants: 'slide-left',
            accounts: 'slide-left',
            reports: 'slide-left',
            settings: 'slide-left'
        },

        // Modal transitions
        modal: {
            open: 'scale',
            close: 'fade'
        },

        // Component transitions
        component: {
            cardEnter: 'slide-up',
            cardExit: 'fade',
            formEnter: 'fade',
            formExit: 'slide-down'
        }
    };

    // ==========================================================================
    // Utility Functions
    // ==========================================================================

    function createTransitionManager(options = {}) {
        return new PageTransitionManager(options);
    }

    function getPreset(category, name) {
        return presets[category] && presets[category][name];
    }

    // ==========================================================================
    // Auto-initialization
    // ==========================================================================

    let defaultManager = null;

    function init(options = {}) {
        if (defaultManager) {
            console.warn('Page transitions already initialized');
            return defaultManager;
        }

        defaultManager = new PageTransitionManager(options);
        return defaultManager;
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    return {
        PageTransitionManager,
        createTransitionManager,
        getPreset,
        presets,
        init,
        get default() { return defaultManager; }
    };
})();
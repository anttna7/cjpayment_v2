/**
 * CJPayment Micro-Interactions System
 * Handles button clicks, form interactions, and data animations
 */

window.CJMicroInteractions = (function() {
    'use strict';

    class MicroInteractionManager {
        constructor(options = {}) {
            this.options = {
                enableRipple: true,
                enableHover: true,
                enableFocus: true,
                enableNumberAnimation: true,
                enableFormValidation: true,
                rippleColor: 'rgba(255, 255, 255, 0.3)',
                animationDuration: 300,
                ...options
            };

            this.activeAnimations = new Map();
            this.observers = new Map();

            this.init();
        }

        init() {
            this.addMicroInteractionStyles();
            this.initializeButtonInteractions();
            this.initializeFormInteractions();
            this.initializeHoverEffects();
            this.initializeFocusEffects();
            this.initializeNumberAnimations();
            this.bindGlobalEvents();
        }

        // ==========================================================================
        // Button Interactions
        // ==========================================================================

        initializeButtonInteractions() {
            if (!this.options.enableRipple) return;

            // Add ripple effect to buttons
            document.addEventListener('click', (e) => {
                const button = e.target.closest('.btn, button, [role="button"]');
                if (button && !button.disabled && !button.hasAttribute('data-no-ripple')) {
                    this.createRippleEffect(button, e);
                }
            });

            // Add press animation
            document.addEventListener('mousedown', (e) => {
                const button = e.target.closest('.btn, button, [role="button"]');
                if (button && !button.disabled) {
                    this.addPressAnimation(button);
                }
            });

            document.addEventListener('mouseup', (e) => {
                const button = e.target.closest('.btn, button, [role="button"]');
                if (button) {
                    this.removePressAnimation(button);
                }
            });
        }

        createRippleEffect(element, event) {
            // Remove existing ripples
            const existingRipples = element.querySelectorAll('.ripple');
            existingRipples.forEach(ripple => ripple.remove());

            // Create ripple element
            const ripple = document.createElement('span');
            ripple.className = 'ripple';

            // Calculate ripple position and size
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            // Add ripple to button
            element.appendChild(ripple);

            // Remove ripple after animation
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
        }

        addPressAnimation(element) {
            element.classList.add('btn-pressed');
        }

        removePressAnimation(element) {
            element.classList.remove('btn-pressed');
        }

        // ==========================================================================
        // Form Interactions
        // ==========================================================================

        initializeFormInteractions() {
            if (!this.options.enableFormValidation) return;

            // Input focus animations
            document.addEventListener('focusin', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    this.addInputFocusAnimation(e.target);
                }
            });

            document.addEventListener('focusout', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    this.removeInputFocusAnimation(e.target);
                }
            });

            // Input validation animations
            document.addEventListener('input', (e) => {
                if (e.target.matches('input, textarea')) {
                    this.handleInputValidation(e.target);
                }
            });

            // Form submission animations
            document.addEventListener('submit', (e) => {
                this.handleFormSubmission(e.target);
            });
        }

        addInputFocusAnimation(input) {
            const formGroup = input.closest('.form-group, .input-group');
            if (formGroup) {
                formGroup.classList.add('focused');
            }

            // Add floating label animation
            const label = input.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.classList.add('floating');
            }

            // Add focus ring animation
            input.classList.add('input-focused');
        }

        removeInputFocusAnimation(input) {
            const formGroup = input.closest('.form-group, .input-group');
            if (formGroup) {
                formGroup.classList.remove('focused');
            }

            // Remove floating label if input is empty
            if (!input.value) {
                const label = input.previousElementSibling;
                if (label && label.tagName === 'LABEL') {
                    label.classList.remove('floating');
                }
            }

            input.classList.remove('input-focused');
        }

        handleInputValidation(input) {
            const isValid = input.checkValidity();
            const formGroup = input.closest('.form-group, .input-group');

            if (formGroup) {
                formGroup.classList.remove('valid', 'invalid');
                
                if (input.value) {
                    formGroup.classList.add(isValid ? 'valid' : 'invalid');
                    
                    // Add validation animation
                    this.addValidationAnimation(formGroup, isValid);
                }
            }
        }

        addValidationAnimation(element, isValid) {
            const animationClass = isValid ? 'validation-success' : 'validation-error';
            element.classList.add(animationClass);

            setTimeout(() => {
                element.classList.remove(animationClass);
            }, 300);
        }

        handleFormSubmission(form) {
            // Add submission animation
            form.classList.add('form-submitting');

            // Find submit button and add loading state
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                this.addButtonLoadingState(submitButton);
            }
        }

        addButtonLoadingState(button) {
            if (button.classList.contains('loading')) return;

            button.classList.add('loading');
            button.disabled = true;

            // Store original text
            const originalText = button.textContent;
            button.dataset.originalText = originalText;

            // Add loading text and spinner
            button.innerHTML = `
                <span class="loading-spinner"></span>
                <span class="loading-text">处理中...</span>
            `;
        }

        removeButtonLoadingState(button) {
            if (!button.classList.contains('loading')) return;

            button.classList.remove('loading');
            button.disabled = false;

            // Restore original text
            const originalText = button.dataset.originalText || '提交';
            button.textContent = originalText;
            delete button.dataset.originalText;
        }

        // ==========================================================================
        // Hover Effects
        // ==========================================================================

        initializeHoverEffects() {
            if (!this.options.enableHover) return;

            // Card hover effects
            document.addEventListener('mouseenter', (e) => {
                const card = e.target.closest('.card, .card-interactive');
                if (card) {
                    this.addCardHoverEffect(card);
                }

                const button = e.target.closest('.btn, button');
                if (button && !button.disabled) {
                    this.addButtonHoverEffect(button);
                }
            });

            document.addEventListener('mouseleave', (e) => {
                const card = e.target.closest('.card, .card-interactive');
                if (card) {
                    this.removeCardHoverEffect(card);
                }

                const button = e.target.closest('.btn, button');
                if (button) {
                    this.removeButtonHoverEffect(button);
                }
            });
        }

        addCardHoverEffect(card) {
            card.classList.add('card-hovered');
        }

        removeCardHoverEffect(card) {
            card.classList.remove('card-hovered');
        }

        addButtonHoverEffect(button) {
            button.classList.add('btn-hovered');
        }

        removeButtonHoverEffect(button) {
            button.classList.remove('btn-hovered');
        }

        // ==========================================================================
        // Focus Effects
        // ==========================================================================

        initializeFocusEffects() {
            if (!this.options.enableFocus) return;

            // Enhanced focus indicators
            document.addEventListener('focusin', (e) => {
                if (e.target.matches('button, a, input, textarea, select, [tabindex]')) {
                    this.addFocusEffect(e.target);
                }
            });

            document.addEventListener('focusout', (e) => {
                if (e.target.matches('button, a, input, textarea, select, [tabindex]')) {
                    this.removeFocusEffect(e.target);
                }
            });

            // Keyboard navigation indicators
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    document.body.classList.add('keyboard-navigation');
                }
            });

            document.addEventListener('mousedown', () => {
                document.body.classList.remove('keyboard-navigation');
            });
        }

        addFocusEffect(element) {
            element.classList.add('element-focused');
        }

        removeFocusEffect(element) {
            element.classList.remove('element-focused');
        }

        // ==========================================================================
        // Number Animations
        // ==========================================================================

        initializeNumberAnimations() {
            if (!this.options.enableNumberAnimation) return;

            // Observe number elements for changes
            this.observeNumberElements();

            // Initialize intersection observer for counting animations
            this.initializeCountingAnimations();
        }

        observeNumberElements() {
            const numberElements = document.querySelectorAll('[data-animate-number]');
            
            numberElements.forEach(element => {
                if (!this.observers.has(element)) {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach(mutation => {
                            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                                this.animateNumberChange(element);
                            }
                        });
                    });

                    observer.observe(element, {
                        childList: true,
                        characterData: true,
                        subtree: true
                    });

                    this.observers.set(element, observer);
                }
            });
        }

        initializeCountingAnimations() {
            const countElements = document.querySelectorAll('[data-count-to]');
            
            if (countElements.length === 0) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                        this.animateCountTo(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            countElements.forEach(element => observer.observe(element));
        }

        animateNumberChange(element) {
            if (this.activeAnimations.has(element)) return;

            element.classList.add('number-changing');
            
            const animation = setTimeout(() => {
                element.classList.remove('number-changing');
                this.activeAnimations.delete(element);
            }, 300);

            this.activeAnimations.set(element, animation);
        }

        animateCountTo(element) {
            const targetValue = parseFloat(element.dataset.countTo) || 0;
            const duration = parseInt(element.dataset.countDuration) || 2000;
            const startValue = parseFloat(element.textContent) || 0;
            const increment = (targetValue - startValue) / (duration / 16);

            element.classList.add('counting', 'counted');

            let currentValue = startValue;
            const timer = setInterval(() => {
                currentValue += increment;
                
                if ((increment > 0 && currentValue >= targetValue) || 
                    (increment < 0 && currentValue <= targetValue)) {
                    currentValue = targetValue;
                    clearInterval(timer);
                    element.classList.remove('counting');
                }

                // Format number based on data attributes
                const decimals = parseInt(element.dataset.countDecimals) || 0;
                const separator = element.dataset.countSeparator || '';
                
                let displayValue = currentValue.toFixed(decimals);
                if (separator) {
                    displayValue = this.addNumberSeparator(displayValue, separator);
                }

                element.textContent = displayValue;
            }, 16);
        }

        addNumberSeparator(number, separator) {
            const parts = number.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
            return parts.join('.');
        }

        // ==========================================================================
        // Chart and Data Animations
        // ==========================================================================

        animateChartData(chartElement, data, options = {}) {
            const config = {
                duration: 1000,
                delay: 0,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                ...options
            };

            // Add chart animation class
            chartElement.classList.add('chart-animating');

            // Animate chart elements
            const bars = chartElement.querySelectorAll('.chart-bar, .bar');
            const lines = chartElement.querySelectorAll('.chart-line, .line');
            const points = chartElement.querySelectorAll('.chart-point, .point');

            // Animate bars
            bars.forEach((bar, index) => {
                setTimeout(() => {
                    bar.classList.add('animate-in');
                }, config.delay + (index * 100));
            });

            // Animate lines
            lines.forEach((line, index) => {
                setTimeout(() => {
                    line.classList.add('animate-in');
                }, config.delay + (index * 150));
            });

            // Animate points
            points.forEach((point, index) => {
                setTimeout(() => {
                    point.classList.add('animate-in');
                }, config.delay + (index * 50));
            });

            // Remove animation class after completion
            setTimeout(() => {
                chartElement.classList.remove('chart-animating');
            }, config.duration + config.delay + (Math.max(bars.length, lines.length, points.length) * 150));
        }

        // ==========================================================================
        // Progress Animations
        // ==========================================================================

        animateProgress(progressElement, targetValue, options = {}) {
            const config = {
                duration: 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                ...options
            };

            const progressBar = progressElement.querySelector('.progress-bar, .progress__bar');
            if (!progressBar) return;

            const startValue = parseFloat(progressBar.style.width) || 0;
            const endValue = Math.min(Math.max(targetValue, 0), 100);

            progressElement.classList.add('progress-animating');

            // Animate progress bar width
            let currentValue = startValue;
            const increment = (endValue - startValue) / (config.duration / 16);

            const timer = setInterval(() => {
                currentValue += increment;
                
                if ((increment > 0 && currentValue >= endValue) || 
                    (increment < 0 && currentValue <= endValue)) {
                    currentValue = endValue;
                    clearInterval(timer);
                    progressElement.classList.remove('progress-animating');
                }

                progressBar.style.width = currentValue + '%';
                
                // Update progress text if exists
                const progressText = progressElement.querySelector('.progress-text, .progress__text');
                if (progressText) {
                    progressText.textContent = Math.round(currentValue) + '%';
                }
            }, 16);
        }

        // ==========================================================================
        // Stagger Animations
        // ==========================================================================

        staggerAnimation(elements, animationType = 'fade-in', options = {}) {
            const config = {
                delay: 100,
                duration: 300,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                ...options
            };

            elements.forEach((element, index) => {
                setTimeout(() => {
                    element.classList.add('stagger-animate', `stagger-${animationType}`);
                    
                    setTimeout(() => {
                        element.classList.remove('stagger-animate', `stagger-${animationType}`);
                    }, config.duration);
                }, index * config.delay);
            });
        }

        // ==========================================================================
        // Global Event Handlers
        // ==========================================================================

        bindGlobalEvents() {
            // Handle dynamic content
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeDynamicContent();
            });

            // Handle AJAX content updates
            document.addEventListener('content:updated', (e) => {
                if (e.detail && e.detail.container) {
                    this.initializeContainerContent(e.detail.container);
                }
            });

            // Handle theme changes
            document.addEventListener('theme:changed', () => {
                this.updateAnimationStyles();
            });
        }

        initializeDynamicContent() {
            // Re-initialize interactions for dynamically added content
            this.observeNumberElements();
            this.initializeCountingAnimations();
        }

        initializeContainerContent(container) {
            // Initialize interactions for specific container
            const numberElements = container.querySelectorAll('[data-animate-number]');
            const countElements = container.querySelectorAll('[data-count-to]');

            numberElements.forEach(element => {
                if (!this.observers.has(element)) {
                    this.observeNumberElements();
                }
            });

            if (countElements.length > 0) {
                this.initializeCountingAnimations();
            }
        }

        updateAnimationStyles() {
            // Update animation styles based on current theme
            const isDark = document.body.classList.contains('theme-dark');
            const rippleColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
            
            document.documentElement.style.setProperty('--ripple-color', rippleColor);
        }

        // ==========================================================================
        // CSS Styles
        // ==========================================================================

        addMicroInteractionStyles() {
            if (document.querySelector('#micro-interaction-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'micro-interaction-styles';
            styles.textContent = `
                /* Ripple Effect */
                .btn, button, [role="button"] {
                    position: relative;
                    overflow: hidden;
                }

                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    background: ${this.options.rippleColor};
                    transform: scale(0);
                    animation: ripple-animation 0.6s linear;
                    pointer-events: none;
                }

                @keyframes ripple-animation {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }

                /* Button Press Animation */
                .btn-pressed {
                    transform: scale(0.98);
                    transition: transform 0.1s ease;
                }

                /* Button Hover Effects */
                .btn-hovered {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                /* Card Hover Effects */
                .card-hovered {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                /* Focus Effects */
                .keyboard-navigation .element-focused {
                    outline: 2px solid var(--primary-500, #3b82f6);
                    outline-offset: 2px;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
                }

                /* Form Interactions */
                .form-group.focused {
                    transform: scale(1.02);
                    transition: transform 0.2s ease;
                }

                .input-focused {
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    border-color: var(--primary-500, #3b82f6);
                }

                .form-group.valid .form-input {
                    border-color: var(--success-500, #22c55e);
                }

                .form-group.invalid .form-input {
                    border-color: var(--error-500, #ef4444);
                }

                .validation-success {
                    animation: validation-success 0.3s ease;
                }

                .validation-error {
                    animation: validation-error 0.3s ease;
                }

                @keyframes validation-success {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); }
                }

                @keyframes validation-error {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                /* Floating Labels */
                .floating {
                    transform: translateY(-20px) scale(0.8);
                    color: var(--primary-500, #3b82f6);
                    transition: all 0.2s ease;
                }

                /* Loading States */
                .loading {
                    pointer-events: none;
                }

                .loading-spinner {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .loading-text {
                    margin-left: 8px;
                }

                /* Number Animations */
                .number-changing {
                    animation: number-change 0.3s ease;
                }

                @keyframes number-change {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); color: var(--primary-500, #3b82f6); }
                    100% { transform: scale(1); }
                }

                .counting {
                    color: var(--primary-500, #3b82f6);
                    font-weight: var(--font-weight-semibold, 600);
                }

                /* Chart Animations */
                .chart-animating .chart-bar,
                .chart-animating .bar {
                    transform: scaleY(0);
                    transform-origin: bottom;
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .chart-animating .chart-bar.animate-in,
                .chart-animating .bar.animate-in {
                    transform: scaleY(1);
                }

                .chart-animating .chart-line,
                .chart-animating .line {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: draw-line 1s ease-out forwards;
                }

                @keyframes draw-line {
                    to {
                        stroke-dashoffset: 0;
                    }
                }

                .chart-animating .chart-point,
                .chart-animating .point {
                    transform: scale(0);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .chart-animating .chart-point.animate-in,
                .chart-animating .point.animate-in {
                    transform: scale(1);
                }

                /* Progress Animations */
                .progress-animating .progress-bar,
                .progress-animating .progress__bar {
                    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* Stagger Animations */
                .stagger-animate {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .stagger-fade-in {
                    opacity: 0;
                    transform: translateY(20px);
                }

                .stagger-animate.stagger-fade-in {
                    opacity: 1;
                    transform: translateY(0);
                }

                .stagger-slide-left {
                    opacity: 0;
                    transform: translateX(-20px);
                }

                .stagger-animate.stagger-slide-left {
                    opacity: 1;
                    transform: translateX(0);
                }

                .stagger-scale {
                    opacity: 0;
                    transform: scale(0.8);
                }

                .stagger-animate.stagger-scale {
                    opacity: 1;
                    transform: scale(1);
                }

                /* Reduced Motion */
                @media (prefers-reduced-motion: reduce) {
                    .ripple,
                    .btn-pressed,
                    .btn-hovered,
                    .card-hovered,
                    .form-group.focused,
                    .number-changing,
                    .stagger-animate {
                        animation: none !important;
                        transform: none !important;
                        transition: none !important;
                    }

                    .loading-spinner {
                        animation: none !important;
                        border-top-color: transparent !important;
                    }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;

            document.head.appendChild(styles);
        }

        // ==========================================================================
        // Public API
        // ==========================================================================

        // Manual trigger methods
        triggerRipple(element, event) {
            this.createRippleEffect(element, event);
        }

        triggerNumberAnimation(element) {
            this.animateNumberChange(element);
        }

        triggerCountAnimation(element) {
            this.animateCountTo(element);
        }

        triggerProgressAnimation(element, value, options) {
            this.animateProgress(element, value, options);
        }

        triggerStaggerAnimation(elements, type, options) {
            this.staggerAnimation(elements, type, options);
        }

        // State management
        addLoadingState(button) {
            this.addButtonLoadingState(button);
        }

        removeLoadingState(button) {
            this.removeButtonLoadingState(button);
        }

        // Configuration
        updateOptions(newOptions) {
            this.options = { ...this.options, ...newOptions };
            this.updateAnimationStyles();
        }

        // Cleanup
        destroy() {
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
            
            this.activeAnimations.forEach(animation => clearTimeout(animation));
            this.activeAnimations.clear();

            const styles = document.querySelector('#micro-interaction-styles');
            if (styles) {
                styles.remove();
            }
        }
    }

    // ==========================================================================
    // Utility Functions
    // ==========================================================================

    function createManager(options = {}) {
        return new MicroInteractionManager(options);
    }

    // ==========================================================================
    // Auto-initialization
    // ==========================================================================

    let defaultManager = null;

    function init(options = {}) {
        if (defaultManager) {
            console.warn('Micro-interactions already initialized');
            return defaultManager;
        }

        defaultManager = new MicroInteractionManager(options);
        return defaultManager;
    }

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    return {
        MicroInteractionManager,
        createManager,
        init,
        get default() { return defaultManager; }
    };
})();
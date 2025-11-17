/**
 * Enhanced Button Component System
 * Provides JavaScript functionality for advanced button interactions
 */

class ButtonEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.setupLoadingButtons();
        this.setupButtonGroups();
        this.setupFabMenus();
        this.setupSplitButtons();
        this.setupRippleEffect();
        this.setupKeyboardNavigation();
        this.setupTooltips();
    }

    /**
     * Loading Button Functionality
     */
    setupLoadingButtons() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-loading]');
            if (!button) return;

            this.setLoadingState(button, true);
            
            // Simulate async operation or use provided promise
            const loadingPromise = button.dataset.loading === 'true' 
                ? new Promise(resolve => setTimeout(resolve, 2000))
                : window[button.dataset.loading]?.();

            if (loadingPromise && typeof loadingPromise.then === 'function') {
                loadingPromise
                    .then(() => this.setLoadingState(button, false))
                    .catch(() => this.setLoadingState(button, false));
            }
        });
    }

    setLoadingState(button, isLoading) {
        if (isLoading) {
            button.classList.add('btn--loading');
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
        } else {
            button.classList.remove('btn--loading');
            button.disabled = false;
            button.removeAttribute('aria-busy');
        }
    }

    /**
     * Button Group Functionality
     */
    setupButtonGroups() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-group .btn');
            if (!button) return;

            const group = button.closest('.btn-group');
            if (group.classList.contains('btn-group--segmented')) {
                // Handle segmented control
                group.querySelectorAll('.btn').forEach(btn => {
                    btn.classList.remove('btn--active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                
                button.classList.add('btn--active');
                button.setAttribute('aria-pressed', 'true');
            }
        });
    }

    /**
     * FAB Menu Functionality
     */
    setupFabMenus() {
        document.addEventListener('click', (e) => {
            const fabToggle = e.target.closest('.fab-menu .btn--fab');
            if (!fabToggle) return;

            const fabMenu = fabToggle.closest('.fab-menu');
            const isOpen = fabMenu.classList.contains('fab-menu--open');
            
            if (isOpen) {
                this.closeFabMenu(fabMenu);
            } else {
                this.openFabMenu(fabMenu);
            }
        });

        // Close FAB menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fab-menu')) {
                document.querySelectorAll('.fab-menu--open').forEach(menu => {
                    this.closeFabMenu(menu);
                });
            }
        });
    }

    openFabMenu(fabMenu) {
        fabMenu.classList.add('fab-menu--open');
        fabMenu.setAttribute('aria-expanded', 'true');
        
        // Animate FAB icon rotation
        const icon = fabMenu.querySelector('.btn--fab .btn__icon');
        if (icon) {
            icon.style.transform = 'rotate(45deg)';
        }
    }

    closeFabMenu(fabMenu) {
        fabMenu.classList.remove('fab-menu--open');
        fabMenu.setAttribute('aria-expanded', 'false');
        
        // Reset FAB icon rotation
        const icon = fabMenu.querySelector('.btn--fab .btn__icon');
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }
    }

    /**
     * Split Button Functionality
     */
    setupSplitButtons() {
        document.addEventListener('click', (e) => {
            const splitToggle = e.target.closest('.btn-split__toggle');
            if (!splitToggle) return;

            e.preventDefault();
            e.stopPropagation();

            // Create or toggle dropdown menu
            this.toggleSplitDropdown(splitToggle);
        });
    }

    toggleSplitDropdown(toggle) {
        const splitButton = toggle.closest('.btn-split');
        let dropdown = splitButton.querySelector('.split-dropdown');

        if (dropdown) {
            dropdown.remove();
            return;
        }

        // Create dropdown menu
        dropdown = document.createElement('div');
        dropdown.className = 'split-dropdown';
        dropdown.innerHTML = `
            <div class="split-dropdown__content">
                <button class="split-dropdown__item">Save and Continue</button>
                <button class="split-dropdown__item">Save as Draft</button>
                <button class="split-dropdown__item">Save as Template</button>
            </div>
        `;

        splitButton.appendChild(dropdown);

        // Position dropdown
        const rect = toggle.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.right = '0';
        dropdown.style.zIndex = '1000';

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!splitButton.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    /**
     * Ripple Effect for Material Design Feel
     */
    setupRippleEffect() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn[data-ripple]');
            if (!button) return;

            this.createRipple(button, e);
        });
    }

    createRipple(button, event) {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        ripple.className = 'btn-ripple';
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Enhanced Keyboard Navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const button = e.target.closest('.btn');
            if (!button) return;

            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.activateButton(button);
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    this.navigateButtonGroup(button, 'next');
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    this.navigateButtonGroup(button, 'prev');
                    break;
                case 'Escape':
                    this.handleEscapeKey(button);
                    break;
            }
        });
    }

    activateButton(button) {
        if (button.disabled || button.classList.contains('btn--loading')) return;
        
        // Add pressed state
        button.classList.add('btn--pressed');
        setTimeout(() => button.classList.remove('btn--pressed'), 150);
        
        button.click();
    }

    navigateButtonGroup(currentButton, direction) {
        const group = currentButton.closest('.btn-group, .btn-toolbar');
        if (!group) return;

        const buttons = Array.from(group.querySelectorAll('.btn:not(:disabled)'));
        const currentIndex = buttons.indexOf(currentButton);
        
        if (currentIndex === -1) return;

        let nextIndex;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % buttons.length;
        } else {
            nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        }

        buttons[nextIndex].focus();
    }

    handleEscapeKey(button) {
        // Close any open dropdowns or menus
        const fabMenu = button.closest('.fab-menu--open');
        if (fabMenu) {
            this.closeFabMenu(fabMenu);
            return;
        }

        const splitButton = button.closest('.btn-split');
        if (splitButton) {
            const dropdown = splitButton.querySelector('.split-dropdown');
            if (dropdown) {
                dropdown.remove();
                return;
            }
        }

        // Blur the button
        button.blur();
    }

    /**
     * Tooltip Functionality
     */
    setupTooltips() {
        let tooltip = null;

        document.addEventListener('mouseenter', (e) => {
            const button = e.target.closest('.btn[title], .btn[data-tooltip]');
            if (!button) return;

            const text = button.getAttribute('data-tooltip') || button.getAttribute('title');
            if (!text) return;

            // Remove title to prevent default tooltip
            if (button.hasAttribute('title')) {
                button.setAttribute('data-original-title', button.getAttribute('title'));
                button.removeAttribute('title');
            }

            this.showTooltip(button, text);
        });

        document.addEventListener('mouseleave', (e) => {
            const button = e.target.closest('.btn[data-tooltip], .btn[data-original-title]');
            if (!button) return;

            this.hideTooltip();

            // Restore original title
            if (button.hasAttribute('data-original-title')) {
                button.setAttribute('title', button.getAttribute('data-original-title'));
                button.removeAttribute('data-original-title');
            }
        });
    }

    showTooltip(element, text) {
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'btn-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: var(--color-bg-inverse, #333);
            color: var(--color-text-inverse, white);
            padding: var(--space-2, 8px) var(--space-3, 12px);
            border-radius: var(--radius-base, 4px);
            font-size: var(--font-size-sm, 14px);
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transform: translateY(4px);
            transition: all 0.2s ease-out;
        `;

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;

        // Show tooltip
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(0)';
        });

        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    /**
     * Utility Methods
     */
    
    // Add loading state to any button
    static setLoading(buttonSelector, isLoading = true) {
        const button = typeof buttonSelector === 'string' 
            ? document.querySelector(buttonSelector)
            : buttonSelector;
            
        if (button) {
            const instance = new ButtonEnhancements();
            instance.setLoadingState(button, isLoading);
        }
    }

    // Create a button programmatically
    static createButton(options = {}) {
        const {
            text = 'Button',
            variant = 'primary',
            size = 'md',
            icon = null,
            iconPosition = 'left',
            disabled = false,
            loading = false,
            onClick = null,
            className = '',
            ...attributes
        } = options;

        const button = document.createElement('button');
        button.className = `btn btn--${variant} btn--${size} ${className}`.trim();
        
        if (disabled) button.disabled = true;
        if (loading) button.classList.add('btn--loading');

        // Add icon if provided
        if (icon) {
            const iconElement = document.createElement('span');
            iconElement.className = `btn__icon btn__icon--${iconPosition}`;
            iconElement.textContent = icon;
            button.appendChild(iconElement);
        }

        // Add text
        if (text) {
            const textElement = document.createElement('span');
            textElement.className = 'btn__text';
            textElement.textContent = text;
            button.appendChild(textElement);
        }

        // Add event listener
        if (onClick) {
            button.addEventListener('click', onClick);
        }

        // Add other attributes
        Object.entries(attributes).forEach(([key, value]) => {
            button.setAttribute(key, value);
        });

        return button;
    }
}

// CSS for additional functionality
const additionalCSS = `
    .btn--pressed {
        transform: scale(0.98) !important;
        transition-duration: 75ms !important;
    }

    .btn-ripple {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
    }

    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .split-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: 1000;
        margin-top: 2px;
    }

    .split-dropdown__content {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        padding: var(--space-2);
        min-width: 160px;
    }

    .split-dropdown__item {
        display: block;
        width: 100%;
        padding: var(--space-2) var(--space-3);
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        border-radius: var(--radius-base);
        transition: background-color var(--duration-150) var(--ease-out);
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
    }

    .split-dropdown__item:hover {
        background-color: var(--color-interactive-secondary);
    }

    .btn-tooltip {
        position: absolute;
        z-index: 1000;
        pointer-events: none;
    }

    .btn-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: var(--color-bg-inverse, #333);
    }
`;

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ButtonEnhancements());
} else {
    new ButtonEnhancements();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ButtonEnhancements;
}

// Global access
window.ButtonEnhancements = ButtonEnhancements;
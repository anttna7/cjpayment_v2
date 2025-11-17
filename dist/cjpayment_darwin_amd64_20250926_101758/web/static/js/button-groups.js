/**
 * Advanced Button Group Components
 * Implements dropdown buttons, split buttons, and FAB components
 */

class ButtonGroups {
    constructor() {
        this.dropdowns = new Map();
        this.fabMenus = new Map();
        this.init();
    }

    init() {
        this.setupDropdownButtons();
        this.setupSplitButtons();
        this.setupFabComponents();
        this.setupButtonToolbars();
        this.setupSegmentedControls();
    }

    /**
     * Dropdown Button Implementation
     */
    setupDropdownButtons() {
        document.addEventListener('click', (e) => {
            const dropdownBtn = e.target.closest('[data-dropdown]');
            if (dropdownBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown(dropdownBtn);
                return;
            }

            // Close dropdowns when clicking outside
            if (!e.target.closest('.dropdown-menu')) {
                this.closeAllDropdowns();
            }
        });

        // Handle keyboard navigation in dropdowns
        document.addEventListener('keydown', (e) => {
            const dropdown = e.target.closest('.dropdown-menu');
            if (!dropdown) return;

            switch (e.key) {
                case 'Escape':
                    this.closeDropdown(dropdown.id);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateDropdown(dropdown, 'down');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateDropdown(dropdown, 'up');
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (e.target.classList.contains('dropdown-item')) {
                        e.target.click();
                    }
                    break;
            }
        });
    }

    toggleDropdown(button) {
        const dropdownId = button.getAttribute('data-dropdown');
        const existingDropdown = document.getElementById(dropdownId);

        if (existingDropdown) {
            this.closeDropdown(dropdownId);
            return;
        }

        // Close other dropdowns first
        this.closeAllDropdowns();

        // Create dropdown menu
        const dropdown = this.createDropdownMenu(dropdownId, button);
        this.positionDropdown(dropdown, button);
        this.showDropdown(dropdown);

        // Store reference
        this.dropdowns.set(dropdownId, {
            element: dropdown,
            trigger: button
        });

        // Update button state
        button.setAttribute('aria-expanded', 'true');
        button.classList.add('btn--active');
    }

    createDropdownMenu(id, button) {
        const dropdown = document.createElement('div');
        dropdown.id = id;
        dropdown.className = 'dropdown-menu';
        dropdown.setAttribute('role', 'menu');
        dropdown.setAttribute('aria-labelledby', button.id || 'dropdown-trigger');

        // Get menu items from data attribute or create default ones
        const menuData = button.getAttribute('data-dropdown-items');
        let items = [];

        if (menuData) {
            try {
                items = JSON.parse(menuData);
            } catch (e) {
                console.warn('Invalid dropdown items data:', menuData);
            }
        }

        // Default items if none provided
        if (items.length === 0) {
            items = [
                { text: 'Action 1', value: 'action1' },
                { text: 'Action 2', value: 'action2' },
                { text: 'Action 3', value: 'action3', disabled: true },
                { type: 'divider' },
                { text: 'Delete', value: 'delete', variant: 'danger' }
            ];
        }

        // Build menu content
        const menuContent = document.createElement('div');
        menuContent.className = 'dropdown-content';

        items.forEach((item, index) => {
            if (item.type === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'dropdown-divider';
                menuContent.appendChild(divider);
            } else {
                const menuItem = document.createElement('button');
                menuItem.className = `dropdown-item ${item.variant ? `dropdown-item--${item.variant}` : ''}`;
                menuItem.textContent = item.text;
                menuItem.setAttribute('role', 'menuitem');
                menuItem.setAttribute('tabindex', '-1');
                
                if (item.disabled) {
                    menuItem.disabled = true;
                }

                if (item.icon) {
                    const icon = document.createElement('span');
                    icon.className = 'dropdown-item__icon';
                    icon.textContent = item.icon;
                    menuItem.insertBefore(icon, menuItem.firstChild);
                }

                menuItem.addEventListener('click', () => {
                    if (!item.disabled) {
                        this.handleDropdownItemClick(button, item);
                        this.closeDropdown(id);
                    }
                });

                menuContent.appendChild(menuItem);
            }
        });

        dropdown.appendChild(menuContent);
        document.body.appendChild(dropdown);

        return dropdown;
    }

    positionDropdown(dropdown, button) {
        const buttonRect = button.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let top = buttonRect.bottom + 4;
        let left = buttonRect.left;

        // Adjust if dropdown would go off-screen
        if (top + dropdownRect.height > viewportHeight) {
            top = buttonRect.top - dropdownRect.height - 4;
        }

        if (left + dropdownRect.width > viewportWidth) {
            left = buttonRect.right - dropdownRect.width;
        }

        dropdown.style.position = 'fixed';
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.zIndex = '1000';
    }

    showDropdown(dropdown) {
        dropdown.classList.add('dropdown-menu--show');
        
        // Focus first non-disabled item
        const firstItem = dropdown.querySelector('.dropdown-item:not(:disabled)');
        if (firstItem) {
            firstItem.setAttribute('tabindex', '0');
            firstItem.focus();
        }
    }

    closeDropdown(dropdownId) {
        const dropdownData = this.dropdowns.get(dropdownId);
        if (!dropdownData) return;

        const { element, trigger } = dropdownData;
        
        element.classList.remove('dropdown-menu--show');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.classList.remove('btn--active');
        
        setTimeout(() => {
            element.remove();
            this.dropdowns.delete(dropdownId);
        }, 200);
    }

    closeAllDropdowns() {
        this.dropdowns.forEach((_, id) => this.closeDropdown(id));
    }

    navigateDropdown(dropdown, direction) {
        const items = Array.from(dropdown.querySelectorAll('.dropdown-item:not(:disabled)'));
        const currentIndex = items.findIndex(item => item.getAttribute('tabindex') === '0');
        
        if (items.length === 0) return;

        let nextIndex;
        if (direction === 'down') {
            nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }

        // Update tabindex and focus
        items.forEach(item => item.setAttribute('tabindex', '-1'));
        items[nextIndex].setAttribute('tabindex', '0');
        items[nextIndex].focus();
    }

    handleDropdownItemClick(trigger, item) {
        // Dispatch custom event
        const event = new CustomEvent('dropdown-item-click', {
            detail: { trigger, item }
        });
        trigger.dispatchEvent(event);

        // Default behavior - update button text if it's a selection dropdown
        if (trigger.hasAttribute('data-dropdown-select')) {
            const textElement = trigger.querySelector('.btn__text');
            if (textElement) {
                textElement.textContent = item.text;
            }
        }
    }

    /**
     * Split Button Implementation
     */
    setupSplitButtons() {
        document.addEventListener('click', (e) => {
            const splitToggle = e.target.closest('.btn-split__toggle');
            if (!splitToggle) return;

            e.preventDefault();
            e.stopPropagation();

            const splitButton = splitToggle.closest('.btn-split');
            const dropdownId = `split-dropdown-${Date.now()}`;
            
            // Create dropdown for split button
            splitToggle.setAttribute('data-dropdown', dropdownId);
            splitToggle.setAttribute('data-dropdown-items', JSON.stringify([
                { text: 'Save and Continue', value: 'save-continue', icon: '💾' },
                { text: 'Save as Draft', value: 'save-draft', icon: '📝' },
                { type: 'divider' },
                { text: 'Save as Template', value: 'save-template', icon: '📋' }
            ]));

            this.toggleDropdown(splitToggle);
        });
    }

    /**
     * Floating Action Button (FAB) Implementation
     */
    setupFabComponents() {
        // Setup FAB menus
        document.addEventListener('click', (e) => {
            const fabTrigger = e.target.closest('.fab-menu .btn--fab');
            if (!fabTrigger) return;

            const fabMenu = fabTrigger.closest('.fab-menu');
            const isOpen = fabMenu.classList.contains('fab-menu--open');

            if (isOpen) {
                this.closeFabMenu(fabMenu);
            } else {
                this.openFabMenu(fabMenu);
            }
        });

        // Close FAB menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.fab-menu')) {
                document.querySelectorAll('.fab-menu--open').forEach(menu => {
                    this.closeFabMenu(menu);
                });
            }
        });

        // Setup FAB scroll behavior
        this.setupFabScrollBehavior();
    }

    openFabMenu(fabMenu) {
        fabMenu.classList.add('fab-menu--open');
        fabMenu.setAttribute('aria-expanded', 'true');

        // Animate main FAB icon
        const mainIcon = fabMenu.querySelector('.btn--fab .btn__icon');
        if (mainIcon) {
            mainIcon.style.transform = 'rotate(45deg)';
        }

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'fab-backdrop';
        backdrop.addEventListener('click', () => this.closeFabMenu(fabMenu));
        document.body.appendChild(backdrop);

        // Store backdrop reference
        fabMenu._backdrop = backdrop;
    }

    closeFabMenu(fabMenu) {
        fabMenu.classList.remove('fab-menu--open');
        fabMenu.setAttribute('aria-expanded', 'false');

        // Reset main FAB icon
        const mainIcon = fabMenu.querySelector('.btn--fab .btn__icon');
        if (mainIcon) {
            mainIcon.style.transform = 'rotate(0deg)';
        }

        // Remove backdrop
        if (fabMenu._backdrop) {
            fabMenu._backdrop.remove();
            delete fabMenu._backdrop;
        }
    }

    setupFabScrollBehavior() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateFabVisibility = () => {
            const fabs = document.querySelectorAll('.btn--fab:not(.fab-menu .btn--fab)');
            const currentScrollY = window.scrollY;
            const scrollingDown = currentScrollY > lastScrollY;

            fabs.forEach(fab => {
                if (scrollingDown && currentScrollY > 100) {
                    fab.classList.add('btn--fab-hidden');
                } else {
                    fab.classList.remove('btn--fab-hidden');
                }
            });

            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateFabVisibility);
                ticking = true;
            }
        });
    }

    /**
     * Button Toolbar Enhancements
     */
    setupButtonToolbars() {
        // Handle responsive toolbar behavior
        const toolbars = document.querySelectorAll('.btn-toolbar');
        
        toolbars.forEach(toolbar => {
            this.makeToolbarResponsive(toolbar);
        });

        // Handle toolbar overflow
        window.addEventListener('resize', () => {
            toolbars.forEach(toolbar => {
                this.handleToolbarOverflow(toolbar);
            });
        });
    }

    makeToolbarResponsive(toolbar) {
        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                this.handleToolbarOverflow(entry.target);
            });
        });

        observer.observe(toolbar);
    }

    handleToolbarOverflow(toolbar) {
        const toolbarWidth = toolbar.offsetWidth;
        const buttons = Array.from(toolbar.children);
        let totalWidth = 0;
        let visibleButtons = [];
        let hiddenButtons = [];

        // Calculate which buttons fit
        buttons.forEach(button => {
            totalWidth += button.offsetWidth + 12; // Include gap
            if (totalWidth <= toolbarWidth - 60) { // Reserve space for overflow menu
                visibleButtons.push(button);
            } else {
                hiddenButtons.push(button);
            }
        });

        // Show/hide overflow menu
        let overflowMenu = toolbar.querySelector('.toolbar-overflow');
        
        if (hiddenButtons.length > 0) {
            if (!overflowMenu) {
                overflowMenu = this.createToolbarOverflowMenu(toolbar);
            }
            this.updateOverflowMenu(overflowMenu, hiddenButtons);
        } else if (overflowMenu) {
            overflowMenu.remove();
        }
    }

    createToolbarOverflowMenu(toolbar) {
        const overflowBtn = document.createElement('button');
        overflowBtn.className = 'btn btn--secondary btn--sm toolbar-overflow';
        overflowBtn.innerHTML = `
            <span class="btn__icon">⋯</span>
        `;
        
        overflowBtn.setAttribute('data-dropdown', `toolbar-overflow-${Date.now()}`);
        toolbar.appendChild(overflowBtn);
        
        return overflowBtn;
    }

    updateOverflowMenu(overflowMenu, hiddenButtons) {
        const items = hiddenButtons.map(button => ({
            text: button.textContent.trim() || 'Action',
            value: button.getAttribute('data-action') || 'action',
            disabled: button.disabled
        }));

        overflowMenu.setAttribute('data-dropdown-items', JSON.stringify(items));
    }

    /**
     * Segmented Control Implementation
     */
    setupSegmentedControls() {
        document.addEventListener('click', (e) => {
            const segment = e.target.closest('.btn-group--segmented .btn');
            if (!segment) return;

            const group = segment.closest('.btn-group--segmented');
            const isRadio = group.hasAttribute('data-radio');
            const isMultiple = group.hasAttribute('data-multiple');

            if (isRadio || (!isMultiple && !segment.classList.contains('btn--active'))) {
                // Single selection mode
                group.querySelectorAll('.btn').forEach(btn => {
                    btn.classList.remove('btn--active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                
                segment.classList.add('btn--active');
                segment.setAttribute('aria-pressed', 'true');
            } else if (isMultiple) {
                // Multiple selection mode
                segment.classList.toggle('btn--active');
                const isActive = segment.classList.contains('btn--active');
                segment.setAttribute('aria-pressed', isActive.toString());
            }

            // Dispatch change event
            const event = new CustomEvent('segmented-control-change', {
                detail: {
                    group,
                    selectedButton: segment,
                    selectedValue: segment.getAttribute('data-value'),
                    allSelected: Array.from(group.querySelectorAll('.btn--active')).map(btn => 
                        btn.getAttribute('data-value')
                    )
                }
            });
            group.dispatchEvent(event);
        });
    }

    /**
     * Utility Methods
     */
    static createDropdownButton(options = {}) {
        const {
            text = 'Dropdown',
            variant = 'secondary',
            size = 'md',
            items = [],
            onItemClick = null,
            ...attributes
        } = options;

        const button = document.createElement('button');
        button.className = `btn btn--${variant} btn--${size} btn--dropdown`;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'btn__text';
        textSpan.textContent = text;
        button.appendChild(textSpan);

        const dropdownId = `dropdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        button.setAttribute('data-dropdown', dropdownId);
        
        if (items.length > 0) {
            button.setAttribute('data-dropdown-items', JSON.stringify(items));
        }

        if (onItemClick) {
            button.addEventListener('dropdown-item-click', onItemClick);
        }

        Object.entries(attributes).forEach(([key, value]) => {
            button.setAttribute(key, value);
        });

        return button;
    }

    static createSplitButton(options = {}) {
        const {
            mainText = 'Save',
            mainAction = null,
            variant = 'primary',
            size = 'md',
            dropdownItems = [],
            ...attributes
        } = options;

        const splitContainer = document.createElement('div');
        splitContainer.className = 'btn-split';

        // Main button
        const mainButton = document.createElement('button');
        mainButton.className = `btn btn--${variant} btn--${size} btn-split__main`;
        mainButton.textContent = mainText;
        
        if (mainAction) {
            mainButton.addEventListener('click', mainAction);
        }

        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = `btn btn--${variant} btn--${size} btn-split__toggle`;

        splitContainer.appendChild(mainButton);
        splitContainer.appendChild(toggleButton);

        Object.entries(attributes).forEach(([key, value]) => {
            splitContainer.setAttribute(key, value);
        });

        return splitContainer;
    }

    static createFabMenu(options = {}) {
        const {
            mainIcon = '+',
            items = [],
            position = 'bottom-right',
            ...attributes
        } = options;

        const fabMenu = document.createElement('div');
        fabMenu.className = `fab-menu fab-menu--${position}`;
        fabMenu.setAttribute('aria-expanded', 'false');

        // Main FAB
        const mainFab = document.createElement('button');
        mainFab.className = 'btn btn--fab';
        mainFab.innerHTML = `<span class="btn__icon">${mainIcon}</span>`;
        
        // Menu items
        const menuItems = document.createElement('div');
        menuItems.className = 'fab-menu__items';

        items.forEach((item, index) => {
            const fabItem = document.createElement('div');
            fabItem.className = 'fab-menu__item';

            if (item.label) {
                const label = document.createElement('div');
                label.className = 'fab-menu__label';
                label.textContent = item.label;
                fabItem.appendChild(label);
            }

            const itemButton = document.createElement('button');
            itemButton.className = 'btn btn--fab btn--fab-sm';
            itemButton.innerHTML = `<span class="btn__icon">${item.icon}</span>`;
            
            if (item.onClick) {
                itemButton.addEventListener('click', item.onClick);
            }

            fabItem.appendChild(itemButton);
            menuItems.appendChild(fabItem);
        });

        fabMenu.appendChild(menuItems);
        fabMenu.appendChild(mainFab);

        Object.entries(attributes).forEach(([key, value]) => {
            fabMenu.setAttribute(key, value);
        });

        return fabMenu;
    }
}

// Additional CSS for button groups
const buttonGroupCSS = `
    /* Dropdown Menu Styles */
    .dropdown-menu {
        position: fixed;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: all var(--duration-200) var(--ease-out);
        z-index: 1000;
    }

    .dropdown-menu--show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

    .dropdown-content {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        padding: var(--space-2);
        min-width: 180px;
        max-width: 320px;
    }

    .dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
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
        line-height: var(--line-height-normal);
    }

    .dropdown-item:hover,
    .dropdown-item:focus {
        background-color: var(--color-interactive-secondary);
        outline: none;
    }

    .dropdown-item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }

    .dropdown-item--danger {
        color: var(--color-status-error);
    }

    .dropdown-item--danger:hover,
    .dropdown-item--danger:focus {
        background-color: var(--color-status-error-bg);
    }

    .dropdown-item__icon {
        font-size: 1.1em;
        line-height: 1;
    }

    .dropdown-divider {
        height: 1px;
        background-color: var(--color-border-primary);
        margin: var(--space-2) 0;
    }

    /* FAB Enhancements */
    .btn--fab-hidden {
        transform: translateY(100px) scale(0.8);
        opacity: 0;
        pointer-events: none;
    }

    .fab-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: var(--z-40);
        opacity: 0;
        animation: fab-backdrop-in var(--duration-300) var(--ease-out) forwards;
    }

    @keyframes fab-backdrop-in {
        to { opacity: 1; }
    }

    /* Toolbar Overflow */
    .toolbar-overflow {
        margin-left: auto;
    }

    /* Dark theme adjustments */
    [data-theme="dark"] .dropdown-content {
        background: var(--color-bg-tertiary);
        border-color: var(--color-border-secondary);
    }

    [data-theme="dark"] .dropdown-item--danger:hover,
    [data-theme="dark"] .dropdown-item--danger:focus {
        background-color: rgba(239, 68, 68, 0.1);
    }

    /* High contrast theme */
    [data-theme="high-contrast"] .dropdown-content {
        border-width: 2px;
    }

    [data-theme="high-contrast"] .dropdown-item {
        border: 1px solid transparent;
    }

    [data-theme="high-contrast"] .dropdown-item:focus {
        border-color: var(--color-border-focus);
        outline: 2px solid var(--color-border-focus);
        outline-offset: 1px;
    }
`;

// Inject CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = buttonGroupCSS;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ButtonGroups());
} else {
    new ButtonGroups();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ButtonGroups;
}

// Global access
window.ButtonGroups = ButtonGroups;
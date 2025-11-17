/**
 * CJPayment Theme System
 * Handles theme switching, persistence, and system preference detection
 */

class ThemeSystem {
    constructor() {
        this.themes = {
            light: 'light',
            dark: 'dark',
            'high-contrast': 'high-contrast',
            auto: 'auto'
        };
        
        this.currentTheme = this.validateThemeSettings() || 'auto';
        this.systemTheme = this.getSystemTheme();
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        this.init();
    }
    
    /**
     * Initialize the theme system
     */
    init() {
        // Initialize accessibility features
        this.initAccessibility();
        
        // Apply fallback styles for older browsers
        this.applyFallbackStyles();
        
        // Apply initial theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', (e) => {
            this.systemTheme = e.matches ? 'dark' : 'light';
            if (this.currentTheme === 'auto') {
                this.applyTheme('auto');
                this.announceThemeChange('系统主题已更改为' + this.getThemeDisplayName(this.systemTheme));
            }
        });
        
        // Listen for storage changes (for cross-tab synchronization)
        window.addEventListener('storage', (e) => {
            if (e.key === 'cjpayment-theme') {
                this.currentTheme = e.newValue || 'auto';
                this.applyTheme(this.currentTheme);
                this.announceThemeChange('主题已同步为' + this.getThemeDisplayName(this.currentTheme));
            }
        });
        
        // Listen for high contrast preference changes
        if (window.matchMedia) {
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            highContrastQuery.addEventListener('change', (e) => {
                if (e.matches && this.currentTheme === 'auto') {
                    this.setTheme('high-contrast');
                }
            });
        }
        
        // Create theme switcher UI if it doesn't exist
        this.createThemeSwitcher();
        
        // Expose global methods
        window.ThemeSystem = this;
        
        // Log initialization
        console.log('Theme system initialized:', {
            currentTheme: this.currentTheme,
            systemTheme: this.systemTheme,
            effectiveTheme: this.getEffectiveTheme()
        });
    }
    
    /**
     * Get the current system theme preference
     */
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        try {
            return localStorage.getItem('cjpayment-theme');
        } catch (error) {
            console.warn('Failed to read theme from localStorage:', error);
            return null;
        }
    }
    
    /**
     * Store theme in localStorage
     */
    setStoredTheme(theme) {
        try {
            localStorage.setItem('cjpayment-theme', theme);
            // Also store timestamp for debugging
            localStorage.setItem('cjpayment-theme-timestamp', Date.now().toString());
        } catch (error) {
            console.warn('Failed to store theme in localStorage:', error);
            // Fallback: try to use sessionStorage
            try {
                sessionStorage.setItem('cjpayment-theme', theme);
                console.info('Theme stored in sessionStorage as fallback');
            } catch (sessionError) {
                console.warn('Failed to store theme in sessionStorage:', sessionError);
            }
        }
    }
    
    /**
     * Validate and recover theme settings
     */
    validateThemeSettings() {
        const storedTheme = this.getStoredTheme();
        
        // If stored theme is invalid, reset to auto
        if (storedTheme && !this.themes[storedTheme]) {
            console.warn('Invalid stored theme detected, resetting to auto:', storedTheme);
            this.setStoredTheme('auto');
            return 'auto';
        }
        
        return storedTheme;
    }
    
    /**
     * Apply theme to the document
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        // Add transition class to prevent flash during theme switch
        html.classList.add('theme-switching');
        
        // Remove existing theme attributes
        html.removeAttribute('data-theme');
        
        // Apply new theme
        if (theme === 'auto') {
            // Use auto-detected theme based on system preferences
            const effectiveTheme = this.autoDetectTheme();
            if (effectiveTheme !== 'light') {
                html.setAttribute('data-theme', effectiveTheme);
            }
            // Light theme is default, no attribute needed
        } else if (theme !== 'light') {
            html.setAttribute('data-theme', theme);
        }
        
        // Update current theme
        this.currentTheme = theme;
        
        // Store theme preference
        this.setStoredTheme(theme);
        
        // Update theme switcher UI
        this.updateThemeSwitcherUI();
        
        // Dispatch theme change event
        this.dispatchThemeChangeEvent(theme);
        
        // Remove transition class after a short delay
        setTimeout(() => {
            html.classList.remove('theme-switching');
        }, 100);
    }
    
    /**
     * Switch to a specific theme
     */
    setTheme(theme) {
        if (!theme || typeof theme !== 'string') {
            console.warn('Invalid theme provided:', theme);
            return false;
        }
        
        if (this.themes[theme]) {
            try {
                this.applyTheme(theme);
                return true;
            } catch (error) {
                console.error('Failed to apply theme:', error);
                return false;
            }
        } else {
            console.warn(`Unknown theme: ${theme}. Available themes:`, Object.keys(this.themes));
            return false;
        }
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentEffectiveTheme = this.getEffectiveTheme();
        const newTheme = currentEffectiveTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    
    /**
     * Get the currently effective theme (resolves 'auto' to actual theme)
     */
    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            return this.autoDetectTheme();
        }
        return this.currentTheme;
    }
    
    /**
     * Create theme switcher UI
     */
    createThemeSwitcher() {
        // Check if theme switcher already exists
        if (document.querySelector('.theme-switcher')) {
            return;
        }
        
        // Find a suitable container (header__right from base template)
        let container = document.querySelector('.header__right');
        if (!container) {
            console.warn('Could not find header__right container for theme switcher');
            return;
        }
        
        // Create theme switcher HTML
        const themeSwitcher = document.createElement('div');
        themeSwitcher.className = 'theme-switcher';
        themeSwitcher.innerHTML = `
            <button class="theme-option" data-theme="light" title="浅色主题" aria-label="切换到浅色主题">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
            </button>
            <button class="theme-option" data-theme="dark" title="深色主题" aria-label="切换到深色主题">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            </button>
            <button class="theme-option" data-theme="high-contrast" title="高对比度主题" aria-label="切换到高对比度主题">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 0 0 20V2z"/>
                </svg>
            </button>
            <button class="theme-option" data-theme="auto" title="跟随系统" aria-label="跟随系统主题设置">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
            </button>
        `;
        
        // Add event listeners
        themeSwitcher.addEventListener('click', (e) => {
            const button = e.target.closest('.theme-option');
            if (button) {
                const theme = button.dataset.theme;
                this.setTheme(theme);
            }
        });
        
        // Insert before user menu if it exists, otherwise append
        const userMenu = container.querySelector('.user-menu');
        if (userMenu) {
            container.insertBefore(themeSwitcher, userMenu);
        } else {
            container.appendChild(themeSwitcher);
        }
        
        // Update initial UI state
        this.updateThemeSwitcherUI();
    }
    
    /**
     * Update theme switcher UI to reflect current theme
     */
    updateThemeSwitcherUI() {
        const switcher = document.querySelector('.theme-switcher');
        if (!switcher) return;
        
        const options = switcher.querySelectorAll('.theme-option');
        options.forEach(option => {
            const isActive = option.dataset.theme === this.currentTheme;
            option.classList.toggle('active', isActive);
            option.setAttribute('aria-pressed', isActive.toString());
        });
    }
    
    /**
     * Dispatch custom theme change event
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: {
                theme: theme,
                effectiveTheme: this.getEffectiveTheme(),
                systemTheme: this.systemTheme
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get theme-aware color value
     */
    getThemeColor(colorToken) {
        const computedStyle = getComputedStyle(document.documentElement);
        return computedStyle.getPropertyValue(colorToken).trim();
    }
    
    /**
     * Check if dark theme is currently active
     */
    isDarkTheme() {
        return this.getEffectiveTheme() === 'dark';
    }
    
    /**
     * Check if high contrast theme is currently active
     */
    isHighContrastTheme() {
        return this.currentTheme === 'high-contrast';
    }
    
    /**
     * Check if browser supports CSS custom properties
     */
    supportsCSSVariables() {
        return window.CSS && CSS.supports('color', 'var(--test)');
    }
    
    /**
     * Apply fallback styles for browsers that don't support CSS variables
     */
    applyFallbackStyles() {
        if (this.supportsCSSVariables()) {
            return;
        }
        
        // Add fallback class to body
        document.body.classList.add('no-css-variables');
        
        // Create fallback stylesheet
        const fallbackCSS = `
            .no-css-variables {
                --color-bg-primary: #fafafa;
                --color-bg-secondary: #f5f5f5;
                --color-text-primary: #171717;
                --color-text-secondary: #404040;
                --color-border-primary: #e5e5e5;
                --color-interactive-primary: #0ea5e9;
            }
            
            .no-css-variables .card {
                background-color: #ffffff;
                border-color: #e5e5e5;
            }
            
            .no-css-variables .btn-primary {
                background-color: #0ea5e9;
                border-color: #0ea5e9;
            }
            
            .no-css-variables .form-control {
                border-color: #e5e5e5;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = fallbackCSS;
        document.head.appendChild(style);
    }
    
    /**
     * Initialize accessibility features
     */
    initAccessibility() {
        // Add keyboard navigation support
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + T to toggle theme
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
        
        // Announce theme changes to screen readers
        document.addEventListener('themechange', (e) => {
            this.announceThemeChange(`主题已切换到${this.getThemeDisplayName(e.detail.effectiveTheme)}`);
        });
    }
    
    /**
     * Get display name for theme
     */
    getThemeDisplayName(theme) {
        const names = {
            light: '浅色主题',
            dark: '深色主题',
            'high-contrast': '高对比度主题',
            auto: '自动主题'
        };
        return names[theme] || theme;
    }
    
    /**
     * Announce theme changes to screen readers
     */
    announceThemeChange(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove announcement after it's been read
        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }
    
    /**
     * Get theme preference from system
     */
    detectSystemPreferences() {
        const preferences = {
            colorScheme: 'light',
            contrast: 'normal',
            reducedMotion: false
        };
        
        if (window.matchMedia) {
            // Detect color scheme preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                preferences.colorScheme = 'dark';
            }
            
            // Detect contrast preference
            if (window.matchMedia('(prefers-contrast: high)').matches) {
                preferences.contrast = 'high';
            }
            
            // Detect motion preference
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                preferences.reducedMotion = true;
            }
        }
        
        return preferences;
    }
    
    /**
     * Auto-detect and apply best theme based on system preferences
     */
    autoDetectTheme() {
        const preferences = this.detectSystemPreferences();
        
        if (preferences.contrast === 'high') {
            return 'high-contrast';
        } else if (preferences.colorScheme === 'dark') {
            return 'dark';
        } else {
            return 'light';
        }
    }
    
    /**
     * Get theme system status for debugging
     */
    getThemeStatus() {
        return {
            currentTheme: this.currentTheme,
            effectiveTheme: this.getEffectiveTheme(),
            systemTheme: this.systemTheme,
            systemPreferences: this.detectSystemPreferences(),
            supportsCSSVariables: this.supportsCSSVariables(),
            storedTheme: this.getStoredTheme(),
            availableThemes: Object.keys(this.themes),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Reset theme system to defaults
     */
    resetTheme() {
        try {
            localStorage.removeItem('cjpayment-theme');
            localStorage.removeItem('cjpayment-theme-timestamp');
        } catch (error) {
            console.warn('Failed to clear theme from localStorage:', error);
        }
        
        this.currentTheme = 'auto';
        this.applyTheme('auto');
        this.announceThemeChange('主题已重置为自动模式');
        
        console.log('Theme system reset to defaults');
    }
}

// CSS for theme switcher
const themeSwitcherCSS = `
.theme-switcher {
    display: flex;
    align-items: center;
    gap: var(--space-1, 0.25rem);
    padding: var(--space-1, 0.25rem);
    background-color: var(--color-bg-secondary, #f5f5f5);
    border: 1px solid var(--color-border-primary, #e5e5e5);
    border-radius: var(--radius-full, 9999px);
    margin-right: var(--space-3, 0.75rem);
    position: relative;
    z-index: var(--z-10, 10);
}

.theme-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: var(--space-2, 0.5rem);
    background: transparent;
    border: none;
    border-radius: var(--radius-full, 9999px);
    color: var(--color-text-secondary, #404040);
    cursor: pointer;
    transition: all var(--duration-150, 150ms) var(--ease-out, ease-out);
    position: relative;
}

.theme-option:hover:not(.active) {
    background-color: var(--color-interactive-secondary-hover, #e5e5e5);
    color: var(--color-text-primary, #171717);
    transform: scale(1.05);
}

.theme-option.active {
    background-color: var(--color-interactive-primary, #0ea5e9);
    color: var(--color-text-inverse, #ffffff);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
}

.theme-option:focus {
    outline: 2px solid var(--color-border-focus, #0ea5e9);
    outline-offset: 2px;
}

.theme-option:focus:not(:focus-visible) {
    outline: none;
}

.theme-option:focus-visible {
    outline: 2px solid var(--color-border-focus, #0ea5e9);
    outline-offset: 2px;
}

.theme-option svg {
    width: 16px;
    height: 16px;
    transition: transform var(--duration-150, 150ms) var(--ease-out, ease-out);
}

.theme-option:hover svg {
    transform: rotate(5deg);
}

.theme-option.active svg {
    transform: scale(1.1);
}

/* Screen reader only class */
.sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}

/* Theme switching animation */
.theme-switching {
    transition: none !important;
}

.theme-switching *,
.theme-switching *::before,
.theme-switching *::after {
    transition: none !important;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .theme-switcher {
        margin-right: var(--space-2, 0.5rem);
        gap: var(--space-0-5, 0.125rem);
        padding: var(--space-0-5, 0.125rem);
    }
    
    .theme-option {
        width: 28px;
        height: 28px;
        padding: var(--space-1, 0.25rem);
    }
    
    .theme-option svg {
        width: 14px;
        height: 14px;
    }
}

/* High contrast mode adjustments */
@media (prefers-contrast: high) {
    .theme-switcher {
        border-width: 2px;
        border-color: var(--color-border-primary, #000000);
    }
    
    .theme-option {
        border: 1px solid transparent;
    }
    
    .theme-option:focus {
        border-color: var(--color-border-focus, #0066cc);
        outline: none;
    }
    
    .theme-option.active {
        border-color: var(--color-interactive-primary, #0066cc);
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    .theme-option,
    .theme-option svg {
        transition: none;
    }
    
    .theme-option:hover {
        transform: none;
    }
    
    .theme-option:hover svg {
        transform: none;
    }
    
    .theme-option.active svg {
        transform: none;
    }
}
`;

// Inject theme switcher CSS
const style = document.createElement('style');
style.textContent = themeSwitcherCSS;
document.head.appendChild(style);

// Initialize theme system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ThemeSystem();
    });
} else {
    new ThemeSystem();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSystem;
}
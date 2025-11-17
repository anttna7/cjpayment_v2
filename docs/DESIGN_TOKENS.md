# CJPayment Design Token System

## Overview

The CJPayment design token system provides a comprehensive set of CSS custom properties (variables) that define the visual design language of the application. It includes support for multiple themes, accessibility features, and fallback mechanisms for older browsers.

## Features

- **Comprehensive Token System**: Colors, typography, spacing, shadows, and more
- **Multi-Theme Support**: Light, dark, and high-contrast themes
- **System Preference Detection**: Automatically respects user's OS theme preference
- **Accessibility**: High contrast mode and reduced motion support
- **Fallback Support**: Works in browsers that don't support CSS custom properties
- **Theme Persistence**: Remembers user's theme choice across sessions

## File Structure

```
/static/css/
├── design-tokens.css     # Core design token definitions
├── base.css             # Base styles using design tokens
└── components.css       # Component styles using design tokens

/static/js/
└── theme-system.js      # Theme switching functionality
```

## Design Token Categories

### 1. Color Tokens

#### Raw Color Palette
```css
/* Primary Colors */
--primary-50: #f0f9ff;
--primary-100: #e0f2fe;
--primary-500: #0ea5e9;  /* Main brand color */
--primary-900: #0c4a6e;

/* Neutral Colors */
--neutral-50: #fafafa;
--neutral-500: #737373;
--neutral-900: #171717;

/* Semantic Colors */
--success-500: #22c55e;
--warning-500: #f59e0b;
--error-500: #ef4444;
--info-500: #3b82f6;
```

#### Semantic Color Tokens
```css
/* Background Colors */
--color-bg-primary: var(--neutral-50);
--color-bg-secondary: var(--neutral-100);
--color-bg-surface: #ffffff;

/* Text Colors */
--color-text-primary: var(--neutral-900);
--color-text-secondary: var(--neutral-700);
--color-text-tertiary: var(--neutral-500);

/* Border Colors */
--color-border-primary: var(--neutral-200);
--color-border-secondary: var(--neutral-300);

/* Interactive Colors */
--color-interactive-primary: var(--primary-500);
--color-interactive-primary-hover: var(--primary-600);

/* Status Colors */
--color-status-success: var(--success-500);
--color-status-error: var(--error-500);
```

### 2. Spacing Tokens

```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-12: 3rem;      /* 48px */
```

### 3. Typography Tokens

```css
/* Font Families */
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...;
--font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', ...;

/* Font Sizes */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.625;
```

### 4. Shadow Tokens

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
```

### 5. Border Radius Tokens

```css
--radius-sm: 0.125rem;    /* 2px */
--radius-base: 0.25rem;   /* 4px */
--radius-md: 0.375rem;    /* 6px */
--radius-lg: 0.5rem;      /* 8px */
--radius-xl: 0.75rem;     /* 12px */
--radius-full: 9999px;
```

## Theme System

### Available Themes

1. **Light Theme** (default)
2. **Dark Theme**
3. **High Contrast Theme**
4. **Auto Theme** (follows system preference)

### Theme Switching

#### JavaScript API

```javascript
// Get theme system instance
const themeSystem = window.ThemeSystem;

// Switch to a specific theme
themeSystem.setTheme('dark');
themeSystem.setTheme('light');
themeSystem.setTheme('high-contrast');
themeSystem.setTheme('auto');

// Toggle between light and dark
themeSystem.toggleTheme();

// Get current theme
const currentTheme = themeSystem.currentTheme;
const effectiveTheme = themeSystem.getEffectiveTheme();

// Check if dark theme is active
const isDark = themeSystem.isDarkTheme();
```

#### Theme Change Events

```javascript
document.addEventListener('themechange', function(event) {
    console.log('Theme changed to:', event.detail.theme);
    console.log('Effective theme:', event.detail.effectiveTheme);
    console.log('System theme:', event.detail.systemTheme);
});
```

#### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + T`: Toggle between light and dark themes

### Theme Persistence

Themes are automatically saved to `localStorage` and restored on page load. The system also synchronizes theme changes across browser tabs.

## Usage Guidelines

### 1. Using Design Tokens in CSS

```css
/* ✅ Good - Use semantic tokens */
.my-component {
    background-color: var(--color-bg-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-primary);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
}

/* ❌ Avoid - Don't use raw color values */
.my-component {
    background-color: #ffffff;
    color: #171717;
    border: 1px solid #e5e5e5;
}
```

### 2. Fallback Values

Always provide fallback values for better browser compatibility:

```css
.my-component {
    /* Fallback value first, then CSS variable */
    background-color: #ffffff;
    background-color: var(--color-bg-surface, #ffffff);
    
    padding: 1rem;
    padding: var(--space-4, 1rem);
}
```

### 3. Theme-Aware Components

```css
.status-indicator {
    padding: var(--space-2);
    border-radius: var(--radius-base);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
}

.status-indicator.success {
    background-color: var(--color-status-success-bg);
    color: var(--color-status-success);
    border: 1px solid var(--color-status-success-border);
}

.status-indicator.error {
    background-color: var(--color-status-error-bg);
    color: var(--color-status-error);
    border: 1px solid var(--color-status-error-border);
}
```

### 4. Responsive Design with Tokens

```css
.responsive-grid {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-6);
}

@media (min-width: 768px) {
    .responsive-grid {
        gap: var(--space-6);
        padding: var(--space-8);
    }
}
```

## Utility Classes

The design token system includes utility classes for common patterns:

### Spacing Utilities
```html
<div class="space-y-4">  <!-- Vertical spacing between children -->
    <div>Item 1</div>
    <div>Item 2</div>
</div>

<div class="space-x-2">  <!-- Horizontal spacing between children -->
    <span>Tag 1</span>
    <span>Tag 2</span>
</div>
```

### Color Utilities
```html
<div class="text-primary bg-surface border-primary">
    Content with semantic colors
</div>

<div class="status-success">Success text</div>
<div class="bg-error">Error background</div>
```

### Interactive Utilities
```html
<button class="interactive-primary">
    Primary interactive element
</button>
```

## Accessibility Features

### High Contrast Mode

The high contrast theme provides enhanced contrast ratios for users with visual impairments:

```css
[data-theme="high-contrast"] {
    --color-text-primary: #000000;
    --color-bg-primary: #ffffff;
    --color-border-primary: #000000;
    --color-interactive-primary: #0066cc;
}
```

### Reduced Motion Support

The system respects the user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
    :root {
        --duration-75: 0ms;
        --duration-150: 0ms;
        --duration-300: 0ms;
    }
}
```

### System Preference Detection

Automatically applies dark theme when user's system is set to dark mode:

```css
@media (prefers-color-scheme: dark) {
    :root:not([data-theme]) {
        /* Apply dark theme tokens */
    }
}
```

## Browser Support

### Modern Browsers
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 16+

### Fallback Support
For older browsers that don't support CSS custom properties, the system provides:

1. **Fallback values** in CSS declarations
2. **Fallback classes** for common patterns
3. **Progressive enhancement** approach

```css
/* Example with fallback */
.component {
    background-color: #ffffff; /* Fallback */
    background-color: var(--color-bg-surface, #ffffff); /* Enhanced */
}
```

## Testing

### Manual Testing
1. Open `/static/test-design-tokens.html` in your browser
2. Test theme switching using the theme switcher
3. Verify colors, spacing, and typography scales
4. Test in different browsers

### Automated Testing
```javascript
// Test CSS variable support
function testCSSVariableSupport() {
    return window.CSS && CSS.supports('color', 'var(--test)');
}

// Test theme switching
function testThemeSwitching() {
    const themeSystem = window.ThemeSystem;
    themeSystem.setTheme('dark');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark;
}
```

## Migration Guide

### From Legacy CSS Variables

The system maintains backward compatibility with existing CSS variables:

```css
/* Old way (still works) */
.component {
    color: var(--text-primary);
    background: var(--bg-primary);
}

/* New way (recommended) */
.component {
    color: var(--color-text-primary);
    background: var(--color-bg-surface);
}
```

### Updating Components

1. Replace hardcoded colors with semantic tokens
2. Use spacing tokens instead of fixed values
3. Apply shadow tokens for consistent elevation
4. Use typography tokens for consistent text styling

## Best Practices

### 1. Token Selection
- Use semantic tokens (`--color-text-primary`) over raw tokens (`--neutral-900`)
- Choose appropriate spacing tokens for consistent rhythm
- Use shadow tokens to create visual hierarchy

### 2. Theme Considerations
- Test components in all available themes
- Ensure sufficient contrast ratios
- Consider color-blind users when using color to convey information

### 3. Performance
- CSS custom properties are performant and don't require preprocessing
- Theme switching is instant with CSS custom properties
- Minimize the number of custom properties for better performance

### 4. Maintenance
- Document any custom tokens you add
- Follow the naming convention: `--category-property-variant`
- Keep tokens organized by category

## Troubleshooting

### Common Issues

1. **Theme not switching**: Check if `theme-system.js` is loaded
2. **Colors not updating**: Ensure you're using semantic tokens, not raw values
3. **Fallbacks not working**: Verify fallback values are provided before CSS variables

### Debug Tools

```javascript
// Check current theme
console.log('Current theme:', window.ThemeSystem?.currentTheme);

// Get computed token value
const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg-primary');
console.log('Background color:', bgColor);

// Test CSS variable support
console.log('CSS Variables supported:', 
    window.CSS && CSS.supports('color', 'var(--test)'));
```

## Contributing

When adding new design tokens:

1. Follow the established naming convention
2. Add tokens to the appropriate category
3. Provide fallback values
4. Update theme variants (dark, high-contrast)
5. Document the new tokens
6. Test in all supported browsers

## Resources

- [CSS Custom Properties MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Design Tokens W3C Community Group](https://www.w3.org/community/design-tokens/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
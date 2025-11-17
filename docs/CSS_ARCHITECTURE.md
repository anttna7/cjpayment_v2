# CSS Architecture Documentation

## Overview

This document describes the refactored CSS architecture for the CJPayment frontend, implementing modern CSS practices with BEM methodology, design tokens, and optimized loading strategies.

## Architecture Principles

### 1. **Separation of Concerns**
- **Design Tokens**: Centralized design system variables
- **Foundation**: Base styles and resets
- **Components**: Reusable UI components with BEM naming
- **Utilities**: Single-purpose utility classes

### 2. **BEM Methodology**
All CSS classes follow the Block Element Modifier (BEM) naming convention:
- **Block**: `.card`
- **Element**: `.card__header`, `.card__body`
- **Modifier**: `.card--elevated`, `.card__header--primary`

### 3. **Performance Optimization**
- Critical CSS inlining for first paint optimization
- Async CSS loading for non-critical styles
- CSS minification and bundling for production

## Directory Structure

```
cjpayment/web/static/css/
├── critical.css                 # Critical CSS for first paint
├── main.css                     # Main CSS bundle (imports all)
├── tokens/                      # Design token system
│   ├── colors.css              # Color palette and semantic colors
│   ├── spacing.css             # Spacing scale and semantic spacing
│   ├── typography.css          # Font system and text styles
│   └── layout.css              # Layout tokens and responsive breakpoints
├── foundation/                  # Base styles
│   ├── reset.css               # Modern CSS reset with accessibility
│   └── layout.css              # Base layout components (BEM)
├── components/                  # UI components (BEM)
│   ├── button.css              # Button component with variants
│   ├── card.css                # Card component with variants
│   └── [component].css         # Additional components
├── utilities/                   # Utility classes
│   └── utilities.css           # Atomic utility classes
└── dist/                       # Production build output
    ├── critical.min.css        # Minified critical CSS
    ├── main.min.css            # Minified main bundle
    └── manifest.json           # Build manifest with integrity hashes
```

## Design Token System

### Color Tokens

#### Base Palette
```css
/* Primary Brand Colors */
--primary-500: #0ea5e9;
--primary-600: #0284c7;
--primary-700: #0369a1;

/* Neutral Colors */
--neutral-50: #fafafa;
--neutral-100: #f5f5f5;
--neutral-900: #171717;

/* Status Colors */
--success-500: #22c55e;
--warning-500: #f59e0b;
--error-500: #ef4444;
--info-500: #3b82f6;
```

#### Semantic Colors
```css
/* Background Colors */
--color-bg-primary: var(--neutral-50);
--color-bg-surface: #ffffff;

/* Text Colors */
--color-text-primary: var(--neutral-900);
--color-text-secondary: var(--neutral-700);

/* Interactive Colors */
--color-interactive-primary: var(--primary-500);
--color-interactive-primary-hover: var(--primary-600);
```

### Spacing Tokens

#### Scale
```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
```

#### Semantic Spacing
```css
--space-component-sm: var(--space-2);
--space-component-md: var(--space-4);
--space-layout-md: var(--space-8);
```

### Typography Tokens

```css
/* Font Families */
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;

/* Font Sizes */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */

/* Semantic Typography */
--font-button-family: var(--font-family-sans);
--font-button-weight: var(--font-weight-medium);
```

## BEM Component Examples

### Button Component

```css
/* Block */
.btn {
  display: inline-flex;
  align-items: center;
  /* ... base styles */
}

/* Modifiers */
.btn--primary { /* primary variant */ }
.btn--secondary { /* secondary variant */ }
.btn--sm { /* small size */ }
.btn--lg { /* large size */ }
.btn--loading { /* loading state */ }

/* Elements */
.btn__icon { /* button icon */ }
.btn__text { /* button text */ }
```

### Card Component

```css
/* Block */
.card {
  background-color: var(--color-bg-surface);
  border-radius: var(--card-border-radius);
  /* ... base styles */
}

/* Elements */
.card__header { /* card header */ }
.card__body { /* card body */ }
.card__footer { /* card footer */ }
.card__title { /* card title */ }

/* Modifiers */
.card--elevated { /* elevated variant */ }
.card--interactive { /* interactive variant */ }
.card--success { /* success status */ }
```

## Theme System

### Theme Implementation

The system supports multiple themes through CSS custom properties:

```css
/* Light Theme (default) */
:root {
  --color-bg-primary: #fafafa;
  --color-text-primary: #171717;
}

/* Dark Theme */
[data-theme="dark"] {
  --color-bg-primary: #171717;
  --color-text-primary: #fafafa;
}

/* High Contrast Theme */
[data-theme="high-contrast"] {
  --color-bg-primary: #ffffff;
  --color-text-primary: #000000;
  --color-border-primary: #000000;
}
```

### Theme Switching

```javascript
// Theme switching with smooth transitions
document.documentElement.setAttribute('data-theme', 'dark');
```

## CSS Loading Strategy

### Critical CSS

Critical CSS is inlined in the HTML head for optimal first paint performance:

```html
<style>
  /* Critical CSS inlined here */
  .app__header { /* essential header styles */ }
  .page__content { /* essential content styles */ }
</style>
```

### Async CSS Loading

Non-critical CSS is loaded asynchronously:

```html
<link rel="preload" href="/static/css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/static/css/main.css"></noscript>
```

### JavaScript CSS Loader

The `CSSLoader` class provides advanced CSS loading capabilities:

```javascript
// Load CSS asynchronously
await window.CSSLoader.loadCSS('/static/css/components.css');

// Load responsive CSS
await window.CSSLoader.loadResponsiveCSS({
  '(max-width: 767px)': '/static/css/mobile.css',
  '(min-width: 1024px)': '/static/css/desktop.css'
});

// Preload CSS for better performance
window.CSSLoader.preloadCSS(['/static/css/charts.css']);
```

## Utility Classes

### Naming Convention

Utility classes use the `u-` prefix to distinguish them from component classes:

```css
.u-display-flex { display: flex !important; }
.u-justify-center { justify-content: center !important; }
.u-text-primary { color: var(--color-text-primary) !important; }
.u-mb-4 { margin-bottom: var(--space-4) !important; }
```

### Usage Examples

```html
<div class="card u-mb-6">
  <div class="card__header u-display-flex u-justify-between u-items-center">
    <h2 class="card__title u-mb-0">Title</h2>
    <button class="btn btn--primary btn--sm">Action</button>
  </div>
</div>
```

## Responsive Design

### Breakpoint System

```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

### Mobile-First Approach

```css
/* Mobile styles (default) */
.card {
  padding: var(--space-4);
}

/* Tablet and up */
@media (min-width: 768px) {
  .card {
    padding: var(--space-6);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .card {
    padding: var(--space-8);
  }
}
```

## Build Process

### Development

In development, CSS files are loaded individually for easier debugging:

```html
<link rel="stylesheet" href="/static/css/main.css">
```

### Production

For production, use the build script to optimize CSS:

```bash
./scripts/build-css.sh
```

This generates:
- Minified CSS files
- Combined bundles
- Integrity hashes
- Size reports

### Build Output

```
dist/
├── critical.min.css     # Critical CSS (inlined)
├── main.min.css         # Main CSS bundle
├── manifest.json        # Build manifest
└── size-report.txt      # Size analysis
```

## Performance Metrics

### Target Performance

- **First Paint**: < 1.5s
- **Critical CSS**: < 14KB (inlined)
- **Main Bundle**: < 50KB (gzipped)
- **Component CSS**: < 10KB each

### Optimization Techniques

1. **Critical CSS Inlining**: Essential styles in HTML head
2. **Async Loading**: Non-critical CSS loaded asynchronously
3. **CSS Minification**: Remove whitespace and comments
4. **Tree Shaking**: Remove unused CSS (manual process)
5. **Compression**: Gzip/Brotli compression on server

## Accessibility

### Focus Management

```css
.btn:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-border-focus);
  outline-offset: var(--focus-ring-offset);
}
```

### High Contrast Support

```css
@media (prefers-contrast: high) {
  :root {
    --color-border-primary: #000000;
    --color-text-primary: #000000;
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-200: 0ms;
    --duration-300: 0ms;
  }
}
```

## Migration Guide

### From Old Architecture

1. **Replace class names** with BEM equivalents:
   ```css
   /* Old */
   .header-container { }
   
   /* New */
   .header { }
   ```

2. **Use design tokens** instead of hardcoded values:
   ```css
   /* Old */
   color: #0ea5e9;
   
   /* New */
   color: var(--color-interactive-primary);
   ```

3. **Update HTML templates** with new class names:
   ```html
   <!-- Old -->
   <div class="user-menu">
     <button class="user-button">
   
   <!-- New -->
   <div class="user-menu">
     <button class="user-menu__trigger">
   ```

### Testing

1. **Visual regression testing**: Compare before/after screenshots
2. **Performance testing**: Measure loading times
3. **Accessibility testing**: Verify keyboard navigation and screen readers
4. **Cross-browser testing**: Test in major browsers

## Maintenance

### Adding New Components

1. Create component CSS file in `components/` directory
2. Follow BEM naming convention
3. Use design tokens for consistency
4. Add to main.css imports
5. Document component API

### Updating Design Tokens

1. Modify token values in `tokens/` files
2. Test across all components
3. Update documentation
4. Rebuild CSS bundles

### Performance Monitoring

1. Monitor CSS bundle sizes
2. Track loading performance
3. Analyze unused CSS
4. Optimize critical CSS path

## Best Practices

### CSS Writing

1. **Use design tokens** for all values
2. **Follow BEM naming** consistently
3. **Mobile-first** responsive design
4. **Semantic class names** over presentational
5. **Avoid deep nesting** (max 3 levels)

### Performance

1. **Minimize CSS bundle size**
2. **Inline critical CSS**
3. **Load non-critical CSS async**
4. **Use CSS containment** where appropriate
5. **Optimize for Core Web Vitals**

### Accessibility

1. **Ensure sufficient color contrast**
2. **Support keyboard navigation**
3. **Respect user preferences**
4. **Use semantic HTML**
5. **Test with screen readers**

## Troubleshooting

### Common Issues

1. **FOUC (Flash of Unstyled Content)**
   - Ensure critical CSS is inlined
   - Check CSS loading order

2. **Theme switching delays**
   - Verify CSS custom property support
   - Check transition timing

3. **Mobile layout issues**
   - Test responsive breakpoints
   - Verify mobile-first approach

4. **Performance issues**
   - Analyze CSS bundle size
   - Check for unused CSS
   - Optimize critical path

### Debug Tools

1. **Browser DevTools**: Inspect CSS loading
2. **Lighthouse**: Performance analysis
3. **CSS Stats**: Bundle analysis
4. **axe**: Accessibility testing

## Future Enhancements

### Planned Improvements

1. **CSS-in-JS migration** (optional)
2. **Automatic critical CSS extraction**
3. **CSS tree shaking** automation
4. **Component CSS isolation**
5. **Advanced performance monitoring**

### Technology Considerations

1. **PostCSS** for advanced processing
2. **CSS Modules** for component isolation
3. **Styled Components** for dynamic styling
4. **CSS Container Queries** for responsive components
5. **CSS Cascade Layers** for better specificity management
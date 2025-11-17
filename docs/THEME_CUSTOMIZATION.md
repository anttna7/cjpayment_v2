# 主题定制和扩展开发指南

## 概述

本指南详细介绍如何定制和扩展 CJPayment 设计系统的主题，包括创建自定义主题、扩展现有主题、以及开发新的主题功能。

## 目录

- [主题架构](#主题架构)
- [创建自定义主题](#创建自定义主题)
- [主题令牌系统](#主题令牌系统)
- [组件主题化](#组件主题化)
- [动态主题切换](#动态主题切换)
- [主题继承和扩展](#主题继承和扩展)
- [主题测试](#主题测试)
- [部署和分发](#部署和分发)

## 主题架构

### 主题层次结构

```
主题系统
├── 基础主题 (Base Theme)
│   ├── 设计令牌 (Design Tokens)
│   ├── 组件样式 (Component Styles)
│   └── 工具类 (Utility Classes)
├── 预设主题 (Preset Themes)
│   ├── 明亮主题 (Light Theme)
│   ├── 暗黑主题 (Dark Theme)
│   └── 高对比度主题 (High Contrast Theme)
└── 自定义主题 (Custom Themes)
    ├── 品牌主题 (Brand Themes)
    ├── 功能主题 (Functional Themes)
    └── 用户主题 (User Themes)
```

### 主题文件结构

```
themes/
├── base/
│   ├── tokens.css          # 基础设计令牌
│   ├── components.css      # 组件基础样式
│   └── utilities.css       # 工具类
├── presets/
│   ├── light.css          # 明亮主题
│   ├── dark.css           # 暗黑主题
│   └── high-contrast.css  # 高对比度主题
├── custom/
│   ├── brand-blue.css     # 蓝色品牌主题
│   ├── brand-green.css    # 绿色品牌主题
│   └── user-theme.css     # 用户自定义主题
└── theme-system.js        # 主题系统 JavaScript
```

## 创建自定义主题

### 1. 基础主题模板

创建一个新的主题文件：

```css
/* themes/custom/my-theme.css */

/**
 * 自定义主题：我的主题
 * 作者：开发者姓名
 * 版本：1.0.0
 * 描述：基于企业品牌色的自定义主题
 */

[data-theme="my-theme"] {
  /* === 品牌色彩 === */
  --color-primary-50: #f0f4ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;  /* 主品牌色 */
  --color-primary-600: #4f46e5;
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;
  
  /* === 次要色彩 === */
  --color-secondary-50: #fdf4ff;
  --color-secondary-100: #fae8ff;
  --color-secondary-200: #f5d0fe;
  --color-secondary-300: #f0abfc;
  --color-secondary-400: #e879f9;
  --color-secondary-500: #d946ef;  /* 次要品牌色 */
  --color-secondary-600: #c026d3;
  --color-secondary-700: #a21caf;
  --color-secondary-800: #86198f;
  --color-secondary-900: #701a75;
  
  /* === 背景色彩 === */
  --color-background-primary: #ffffff;
  --color-background-secondary: #f8fafc;
  --color-background-tertiary: #f1f5f9;
  --color-background-accent: linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500));
  
  /* === 文字色彩 === */
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  --color-text-inverse: #ffffff;
  
  /* === 边框色彩 === */
  --color-border-primary: #e2e8f0;
  --color-border-secondary: #cbd5e1;
  --color-border-focus: var(--color-primary-500);
  
  /* === 状态色彩 === */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: var(--color-primary-500);
  
  /* === 阴影定制 === */
  --shadow-brand: 0 4px 14px 0 rgba(99, 102, 241, 0.15);
  --shadow-card-hover: 0 8px 25px -5px rgba(99, 102, 241, 0.1);
  
  /* === 特殊效果 === */
  --gradient-primary: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  --gradient-secondary: linear-gradient(135deg, var(--color-secondary-500) 0%, var(--color-secondary-600) 100%);
  --gradient-accent: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-secondary-500) 100%);
}
```

### 2. 组件特定样式

为特定组件定制样式：

```css
/* 按钮组件定制 */
[data-theme="my-theme"] .button-primary {
  background: var(--gradient-primary);
  border: none;
  box-shadow: var(--shadow-brand);
  position: relative;
  overflow: hidden;
}

[data-theme="my-theme"] .button-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

[data-theme="my-theme"] .button-primary:hover::before {
  left: 100%;
}

[data-theme="my-theme"] .button-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}

/* 卡片组件定制 */
[data-theme="my-theme"] .card {
  border: 1px solid var(--color-border-primary);
  background: var(--color-background-primary);
  backdrop-filter: blur(10px);
}

[data-theme="my-theme"] .card-header {
  background: var(--gradient-accent);
  color: var(--color-text-inverse);
  border-bottom: none;
}

[data-theme="my-theme"] .stat-card {
  background: var(--gradient-primary);
  color: var(--color-text-inverse);
  border: none;
  position: relative;
}

[data-theme="my-theme"] .stat-card::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}
```

### 3. 响应式主题适配

```css
/* 移动端主题适配 */
@media (max-width: 768px) {
  [data-theme="my-theme"] {
    --color-background-primary: #fafbfc;
    --shadow-brand: 0 2px 8px 0 rgba(99, 102, 241, 0.1);
  }
  
  [data-theme="my-theme"] .card {
    border-radius: var(--border-radius-lg);
    margin-bottom: var(--spacing-4);
  }
  
  [data-theme="my-theme"] .button {
    min-height: 44px; /* 触摸友好 */
  }
}

/* 大屏幕主题适配 */
@media (min-width: 1200px) {
  [data-theme="my-theme"] {
    --shadow-brand: 0 6px 20px 0 rgba(99, 102, 241, 0.2);
  }
  
  [data-theme="my-theme"] .card {
    border-radius: var(--border-radius-xl);
  }
}
```

## 主题令牌系统

### 令牌分层架构

```css
/* 第一层：基础令牌 (Global Tokens) */
:root {
  /* 颜色基础值 */
  --base-color-blue-500: #3b82f6;
  --base-color-green-500: #10b981;
  --base-color-red-500: #ef4444;
  
  /* 尺寸基础值 */
  --base-size-1: 0.25rem;
  --base-size-2: 0.5rem;
  --base-size-4: 1rem;
  
  /* 字体基础值 */
  --base-font-sans: system-ui, sans-serif;
  --base-font-mono: 'SF Mono', monospace;
}

/* 第二层：语义令牌 (Semantic Tokens) */
:root {
  /* 语义颜色 */
  --semantic-color-primary: var(--base-color-blue-500);
  --semantic-color-success: var(--base-color-green-500);
  --semantic-color-danger: var(--base-color-red-500);
  
  /* 语义尺寸 */
  --semantic-spacing-xs: var(--base-size-1);
  --semantic-spacing-sm: var(--base-size-2);
  --semantic-spacing-md: var(--base-size-4);
  
  /* 语义字体 */
  --semantic-font-ui: var(--base-font-sans);
  --semantic-font-code: var(--base-font-mono);
}

/* 第三层：组件令牌 (Component Tokens) */
:root {
  /* 按钮令牌 */
  --button-color-primary: var(--semantic-color-primary);
  --button-padding-x: var(--semantic-spacing-md);
  --button-padding-y: var(--semantic-spacing-sm);
  --button-font-family: var(--semantic-font-ui);
  
  /* 卡片令牌 */
  --card-background: var(--semantic-color-surface);
  --card-padding: var(--semantic-spacing-md);
  --card-border-radius: var(--semantic-spacing-sm);
}

/* 第四层：主题令牌 (Theme Tokens) */
[data-theme="my-theme"] {
  /* 重写语义令牌 */
  --semantic-color-primary: #6366f1;
  --semantic-color-success: #059669;
  --semantic-color-danger: #dc2626;
  
  /* 重写组件令牌 */
  --button-color-primary: var(--semantic-color-primary);
  --card-background: rgba(255, 255, 255, 0.8);
}
```

### 令牌命名规范

```css
/* 命名模式：--{category}-{property}-{variant}-{state} */

/* 颜色令牌 */
--color-primary-500          /* 基础颜色 */
--color-primary-500-hover    /* 悬停状态 */
--color-primary-500-active   /* 激活状态 */
--color-primary-500-disabled /* 禁用状态 */

/* 间距令牌 */
--spacing-component-padding-x    /* 组件水平内边距 */
--spacing-component-padding-y    /* 组件垂直内边距 */
--spacing-layout-gap-sm         /* 小间距 */
--spacing-layout-gap-lg         /* 大间距 */

/* 字体令牌 */
--font-heading-size-lg          /* 大标题字体大小 */
--font-heading-weight-bold      /* 标题字体粗细 */
--font-body-size-base          /* 正文字体大小 */
--font-body-line-height-normal  /* 正文行高 */
```

## 组件主题化

### 主题化组件基类

```css
/* 可主题化组件的基础结构 */
.themeable-component {
  /* 使用主题令牌 */
  color: var(--component-text-color, var(--color-text-primary));
  background: var(--component-bg-color, var(--color-background-primary));
  border: var(--component-border, 1px solid var(--color-border-primary));
  
  /* 过渡效果 */
  transition: var(--component-transition, var(--transition-colors));
}

/* 主题化状态 */
.themeable-component:hover {
  color: var(--component-text-color-hover, var(--component-text-color));
  background: var(--component-bg-color-hover, var(--component-bg-color));
  border-color: var(--component-border-color-hover, var(--color-border-secondary));
}

.themeable-component:focus {
  outline: none;
  box-shadow: var(--component-focus-shadow, 0 0 0 3px var(--color-primary-200));
}

.themeable-component:disabled {
  opacity: var(--component-disabled-opacity, 0.6);
  cursor: not-allowed;
}
```

### 组件主题变体

```css
/* 按钮组件的主题变体 */
.button {
  /* 继承基础主题化样式 */
  @extend .themeable-component;
  
  /* 按钮特定样式 */
  padding: var(--button-padding-y) var(--button-padding-x);
  border-radius: var(--button-border-radius);
  font-weight: var(--button-font-weight);
  font-size: var(--button-font-size);
}

/* 主要按钮变体 */
.button-primary {
  --component-text-color: var(--button-primary-text, white);
  --component-bg-color: var(--button-primary-bg, var(--color-primary-500));
  --component-border: var(--button-primary-border, 1px solid var(--color-primary-500));
  
  --component-bg-color-hover: var(--button-primary-bg-hover, var(--color-primary-600));
  --component-border-color-hover: var(--button-primary-border-hover, var(--color-primary-600));
}

/* 次要按钮变体 */
.button-secondary {
  --component-text-color: var(--button-secondary-text, var(--color-text-primary));
  --component-bg-color: var(--button-secondary-bg, var(--color-background-secondary));
  --component-border: var(--button-secondary-border, 1px solid var(--color-border-primary));
  
  --component-bg-color-hover: var(--button-secondary-bg-hover, var(--color-background-tertiary));
  --component-border-color-hover: var(--button-secondary-border-hover, var(--color-border-secondary));
}
```

### 主题化 Mixin（使用 Sass）

```scss
// 主题化 mixin
@mixin themeable($component-name) {
  color: var(--#{$component-name}-text-color, var(--color-text-primary));
  background: var(--#{$component-name}-bg-color, var(--color-background-primary));
  border: var(--#{$component-name}-border, 1px solid var(--color-border-primary));
  
  &:hover {
    color: var(--#{$component-name}-text-color-hover, var(--#{$component-name}-text-color));
    background: var(--#{$component-name}-bg-color-hover, var(--#{$component-name}-bg-color));
    border-color: var(--#{$component-name}-border-color-hover, var(--color-border-secondary));
  }
  
  &:focus {
    box-shadow: var(--#{$component-name}-focus-shadow, 0 0 0 3px var(--color-primary-200));
  }
}

// 使用 mixin
.card {
  @include themeable('card');
  padding: var(--card-padding);
  border-radius: var(--card-border-radius);
}

.modal {
  @include themeable('modal');
  box-shadow: var(--modal-shadow);
}
```

## 动态主题切换

### JavaScript 主题管理器

```javascript
class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.currentTheme = 'light';
    this.observers = [];
    this.init();
  }
  
  init() {
    // 加载已注册的主题
    this.loadRegisteredThemes();
    
    // 从本地存储恢复主题设置
    this.restoreThemeFromStorage();
    
    // 监听系统主题变化
    this.watchSystemTheme();
    
    // 监听主题文件变化（开发模式）
    if (process.env.NODE_ENV === 'development') {
      this.watchThemeFiles();
    }
  }
  
  // 注册主题
  registerTheme(name, config) {
    this.themes.set(name, {
      name,
      displayName: config.displayName || name,
      description: config.description || '',
      author: config.author || '',
      version: config.version || '1.0.0',
      cssFile: config.cssFile,
      tokens: config.tokens || {},
      preview: config.preview || null,
      ...config
    });
    
    // 预加载主题 CSS
    if (config.preload) {
      this.preloadTheme(name);
    }
    
    this.notifyObservers('themeRegistered', { name, config });
  }
  
  // 应用主题
  async applyTheme(themeName) {
    const theme = this.themes.get(themeName);
    if (!theme) {
      throw new Error(`主题 "${themeName}" 不存在`);
    }
    
    try {
      // 加载主题 CSS
      await this.loadThemeCSS(theme);
      
      // 设置主题属性
      document.documentElement.setAttribute('data-theme', themeName);
      
      // 应用主题令牌
      this.applyThemeTokens(theme.tokens);
      
      // 更新当前主题
      const previousTheme = this.currentTheme;
      this.currentTheme = themeName;
      
      // 保存到本地存储
      localStorage.setItem('theme', themeName);
      
      // 通知观察者
      this.notifyObservers('themeChanged', {
        current: themeName,
        previous: previousTheme,
        theme
      });
      
      return true;
    } catch (error) {
      console.error(`应用主题失败: ${error.message}`);
      return false;
    }
  }
  
  // 加载主题 CSS
  async loadThemeCSS(theme) {
    if (!theme.cssFile) return;
    
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existingLink = document.querySelector(`link[data-theme="${theme.name}"]`);
      if (existingLink) {
        resolve();
        return;
      }
      
      // 创建 link 元素
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = theme.cssFile;
      link.setAttribute('data-theme', theme.name);
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`无法加载主题 CSS: ${theme.cssFile}`));
      
      document.head.appendChild(link);
    });
  }
  
  // 应用主题令牌
  applyThemeTokens(tokens) {
    const root = document.documentElement;
    
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }
  
  // 获取可用主题列表
  getAvailableThemes() {
    return Array.from(this.themes.values()).map(theme => ({
      name: theme.name,
      displayName: theme.displayName,
      description: theme.description,
      author: theme.author,
      version: theme.version,
      preview: theme.preview
    }));
  }
  
  // 获取当前主题
  getCurrentTheme() {
    return this.themes.get(this.currentTheme);
  }
  
  // 创建主题预览
  createThemePreview(themeName) {
    const theme = this.themes.get(themeName);
    if (!theme) return null;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.setAttribute('data-theme', themeName);
    
    preview.innerHTML = `
      <div class="theme-preview-header">
        <h4>${theme.displayName}</h4>
        <p>${theme.description}</p>
      </div>
      <div class="theme-preview-content">
        <div class="preview-card card">
          <div class="card-header">
            <h5 class="card-title">示例卡片</h5>
          </div>
          <div class="card-body">
            <p>这是主题预览内容</p>
            <button class="button button-primary">主要按钮</button>
            <button class="button button-secondary">次要按钮</button>
          </div>
        </div>
      </div>
    `;
    
    return preview;
  }
  
  // 监听主题变化
  onThemeChange(callback) {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }
  
  // 通知观察者
  notifyObservers(event, data) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('主题观察者回调错误:', error);
      }
    });
  }
  
  // 监听系统主题变化
  watchSystemTheme() {
    if (!window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (this.currentTheme === 'auto') {
        const systemTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(systemTheme);
      }
    };
    
    mediaQuery.addListener(handleChange);
    
    // 初始检查
    if (this.currentTheme === 'auto') {
      handleChange(mediaQuery);
    }
  }
  
  // 从本地存储恢复主题
  restoreThemeFromStorage() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && this.themes.has(savedTheme)) {
      this.applyTheme(savedTheme);
    }
  }
  
  // 预加载主题
  async preloadTheme(themeName) {
    const theme = this.themes.get(themeName);
    if (theme && theme.cssFile) {
      try {
        await this.loadThemeCSS(theme);
      } catch (error) {
        console.warn(`预加载主题失败: ${themeName}`, error);
      }
    }
  }
}

// 创建全局主题管理器实例
const themeManager = new ThemeManager();

// 注册默认主题
themeManager.registerTheme('light', {
  displayName: '明亮主题',
  description: '适合白天使用的明亮主题',
  cssFile: '/themes/presets/light.css',
  preload: true
});

themeManager.registerTheme('dark', {
  displayName: '暗黑主题',
  description: '适合夜间使用的暗黑主题',
  cssFile: '/themes/presets/dark.css',
  preload: true
});

themeManager.registerTheme('high-contrast', {
  displayName: '高对比度',
  description: '提高可访问性的高对比度主题',
  cssFile: '/themes/presets/high-contrast.css'
});

// 导出主题管理器
window.ThemeManager = themeManager;
```

### 主题切换器组件

```html
<!-- 主题切换器 HTML -->
<div class="theme-switcher" id="theme-switcher">
  <button class="theme-switcher-toggle" aria-label="切换主题">
    <i class="icon-palette"></i>
    <span class="theme-name">明亮主题</span>
    <i class="icon-chevron-down"></i>
  </button>
  
  <div class="theme-switcher-dropdown">
    <div class="theme-list" id="theme-list">
      <!-- 主题选项将动态生成 -->
    </div>
    
    <div class="theme-actions">
      <button class="button button-sm button-outline" onclick="openThemeCustomizer()">
        <i class="icon-settings"></i>
        自定义主题
      </button>
    </div>
  </div>
</div>
```

```javascript
// 主题切换器 JavaScript
class ThemeSwitcher {
  constructor(element) {
    this.element = element;
    this.toggle = element.querySelector('.theme-switcher-toggle');
    this.dropdown = element.querySelector('.theme-switcher-dropdown');
    this.themeList = element.querySelector('.theme-list');
    this.isOpen = false;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.renderThemeList();
    this.updateCurrentTheme();
    
    // 监听主题变化
    themeManager.onThemeChange((event, data) => {
      if (event === 'themeChanged') {
        this.updateCurrentTheme();
      }
    });
  }
  
  bindEvents() {
    this.toggle.addEventListener('click', () => {
      this.toggleDropdown();
    });
    
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.closeDropdown();
      }
    });
    
    // 键盘导航
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });
  }
  
  renderThemeList() {
    const themes = themeManager.getAvailableThemes();
    const currentTheme = themeManager.currentTheme;
    
    this.themeList.innerHTML = themes.map(theme => `
      <div class="theme-option ${theme.name === currentTheme ? 'active' : ''}" 
           data-theme="${theme.name}">
        <div class="theme-preview-mini">
          <div class="preview-colors">
            <span class="color-primary" style="background: var(--color-primary-500)"></span>
            <span class="color-secondary" style="background: var(--color-secondary-500)"></span>
            <span class="color-background" style="background: var(--color-background-primary)"></span>
          </div>
        </div>
        <div class="theme-info">
          <div class="theme-name">${theme.displayName}</div>
          <div class="theme-description">${theme.description}</div>
        </div>
        <div class="theme-check">
          <i class="icon-check"></i>
        </div>
      </div>
    `).join('');
    
    // 绑定点击事件
    this.themeList.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const themeName = option.dataset.theme;
        themeManager.applyTheme(themeName);
        this.closeDropdown();
      });
    });
  }
  
  updateCurrentTheme() {
    const currentTheme = themeManager.getCurrentTheme();
    if (currentTheme) {
      this.toggle.querySelector('.theme-name').textContent = currentTheme.displayName;
    }
    
    // 更新活跃状态
    this.themeList.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('active', option.dataset.theme === themeManager.currentTheme);
    });
  }
  
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    this.dropdown.classList.toggle('show', this.isOpen);
    this.toggle.setAttribute('aria-expanded', this.isOpen);
  }
  
  closeDropdown() {
    this.isOpen = false;
    this.dropdown.classList.remove('show');
    this.toggle.setAttribute('aria-expanded', 'false');
  }
}

// 初始化主题切换器
document.addEventListener('DOMContentLoaded', () => {
  const themeSwitcher = document.getElementById('theme-switcher');
  if (themeSwitcher) {
    new ThemeSwitcher(themeSwitcher);
  }
});
```

## 主题继承和扩展

### 主题继承机制

```css
/* 基础主题 */
[data-theme="base"] {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --spacing-unit: 0.25rem;
  --border-radius: 0.375rem;
}

/* 继承基础主题的品牌主题 */
[data-theme="brand-blue"] {
  /* 继承基础主题的所有属性 */
  @extend [data-theme="base"];
  
  /* 重写特定属性 */
  --color-primary: #1e40af;
  --color-primary-light: #3b82f6;
  --color-primary-dark: #1e3a8a;
  
  /* 添加新属性 */
  --color-brand-accent: #f59e0b;
  --gradient-brand: linear-gradient(135deg, var(--color-primary), var(--color-brand-accent));
}

/* 进一步扩展的子主题 */
[data-theme="brand-blue-dark"] {
  /* 继承品牌主题 */
  @extend [data-theme="brand-blue"];
  
  /* 暗色模式适配 */
  --color-background: #1f2937;
  --color-text: #f9fafb;
  --color-border: #374151;
  
  /* 调整品牌色在暗色模式下的表现 */
  --color-primary: #60a5fa;
  --color-primary-light: #93c5fd;
}
```

### 主题混合 (Theme Mixing)

```javascript
// 主题混合工具
class ThemeMixer {
  constructor() {
    this.mixedThemes = new Map();
  }
  
  // 混合多个主题
  mixThemes(name, baseTheme, ...overlayThemes) {
    const mixed = {
      name,
      displayName: `混合主题: ${name}`,
      tokens: { ...baseTheme.tokens }
    };
    
    // 依次应用覆盖主题
    overlayThemes.forEach(overlay => {
      Object.assign(mixed.tokens, overlay.tokens);
    });
    
    // 生成混合主题的 CSS
    mixed.css = this.generateMixedCSS(mixed);
    
    this.mixedThemes.set(name, mixed);
    return mixed;
  }
  
  // 生成混合主题的 CSS
  generateMixedCSS(theme) {
    const tokens = Object.entries(theme.tokens)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join('\n');
    
    return `
[data-theme="${theme.name}"] {
${tokens}
}
    `;
  }
  
  // 应用混合主题
  applyMixedTheme(name) {
    const theme = this.mixedThemes.get(name);
    if (!theme) return false;
    
    // 动态注入 CSS
    let styleElement = document.getElementById(`mixed-theme-${name}`);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = `mixed-theme-${name}`;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = theme.css;
    
    // 应用主题
    document.documentElement.setAttribute('data-theme', name);
    
    return true;
  }
}

// 使用示例
const mixer = new ThemeMixer();

// 创建混合主题
const corporateTheme = mixer.mixThemes(
  'corporate-blue',
  lightTheme,           // 基础主题
  brandBlueTheme,       // 品牌色覆盖
  corporateLayoutTheme  // 企业布局覆盖
);

// 应用混合主题
mixer.applyMixedTheme('corporate-blue');
```

## 主题测试

### 自动化主题测试

```javascript
// 主题测试套件
class ThemeTestSuite {
  constructor() {
    this.tests = [];
    this.results = [];
  }
  
  // 添加测试用例
  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }
  
  // 运行所有测试
  async runTests(themeName) {
    console.log(`开始测试主题: ${themeName}`);
    
    // 应用主题
    await themeManager.applyTheme(themeName);
    
    this.results = [];
    
    for (const test of this.tests) {
      try {
        const result = await test.testFn();
        this.results.push({
          name: test.name,
          status: 'passed',
          result
        });
        console.log(`✅ ${test.name}: 通过`);
      } catch (error) {
        this.results.push({
          name: test.name,
          status: 'failed',
          error: error.message
        });
        console.error(`❌ ${test.name}: 失败 - ${error.message}`);
      }
    }
    
    return this.results;
  }
  
  // 生成测试报告
  generateReport() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    
    return {
      total: this.results.length,
      passed,
      failed,
      passRate: (passed / this.results.length * 100).toFixed(2),
      details: this.results
    };
  }
}

// 创建测试套件
const themeTests = new ThemeTestSuite();

// 添加对比度测试
themeTests.addTest('颜色对比度检查', () => {
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-text-primary').trim();
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-background-primary').trim();
  
  const contrast = calculateContrast(textColor, bgColor);
  
  if (contrast < 4.5) {
    throw new Error(`文字对比度不足: ${contrast.toFixed(2)} (要求 >= 4.5)`);
  }
  
  return { contrast: contrast.toFixed(2) };
});

// 添加主题令牌完整性测试
themeTests.addTest('主题令牌完整性', () => {
  const requiredTokens = [
    '--color-primary-500',
    '--color-background-primary',
    '--color-text-primary',
    '--color-border-primary',
    '--spacing-4',
    '--border-radius-md'
  ];
  
  const missing = [];
  const root = document.documentElement;
  
  requiredTokens.forEach(token => {
    const value = getComputedStyle(root).getPropertyValue(token);
    if (!value || value.trim() === '') {
      missing.push(token);
    }
  });
  
  if (missing.length > 0) {
    throw new Error(`缺少必需的主题令牌: ${missing.join(', ')}`);
  }
  
  return { checkedTokens: requiredTokens.length };
});

// 添加组件渲染测试
themeTests.addTest('组件渲染测试', () => {
  // 创建测试组件
  const testContainer = document.createElement('div');
  testContainer.innerHTML = `
    <button class="button button-primary">测试按钮</button>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">测试卡片</h3>
      </div>
      <div class="card-body">
        <p>测试内容</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(testContainer);
  
  try {
    // 检查组件是否正确应用了主题样式
    const button = testContainer.querySelector('.button');
    const buttonBg = getComputedStyle(button).backgroundColor;
    
    if (buttonBg === 'rgba(0, 0, 0, 0)' || buttonBg === 'transparent') {
      throw new Error('按钮背景色未正确应用');
    }
    
    const card = testContainer.querySelector('.card');
    const cardBg = getComputedStyle(card).backgroundColor;
    
    if (cardBg === 'rgba(0, 0, 0, 0)' || cardBg === 'transparent') {
      throw new Error('卡片背景色未正确应用');
    }
    
    return { 
      buttonBackground: buttonBg,
      cardBackground: cardBg
    };
  } finally {
    document.body.removeChild(testContainer);
  }
});

// 运行测试的函数
async function testTheme(themeName) {
  const results = await themeTests.runTests(themeName);
  const report = themeTests.generateReport();
  
  console.log(`\n主题测试报告 - ${themeName}`);
  console.log(`总计: ${report.total}, 通过: ${report.passed}, 失败: ${report.failed}`);
  console.log(`通过率: ${report.passRate}%`);
  
  return report;
}

// 批量测试所有主题
async function testAllThemes() {
  const themes = themeManager.getAvailableThemes();
  const reports = {};
  
  for (const theme of themes) {
    reports[theme.name] = await testTheme(theme.name);
  }
  
  return reports;
}
```

### 视觉回归测试

```javascript
// 视觉回归测试工具
class VisualRegressionTester {
  constructor() {
    this.screenshots = new Map();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }
  
  // 截取组件截图
  async captureComponent(selector, themeName) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`元素未找到: ${selector}`);
    }
    
    // 使用 html2canvas 或类似库截图
    const screenshot = await this.takeScreenshot(element);
    
    const key = `${themeName}-${selector}`;
    this.screenshots.set(key, screenshot);
    
    return screenshot;
  }
  
  // 比较截图差异
  compareScreenshots(baseline, current) {
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return { match: false, reason: '尺寸不匹配' };
    }
    
    const diff = this.calculatePixelDiff(baseline, current);
    const threshold = 0.01; // 1% 差异阈值
    
    return {
      match: diff.percentage < threshold,
      percentage: diff.percentage,
      diffPixels: diff.diffPixels,
      totalPixels: diff.totalPixels
    };
  }
  
  // 计算像素差异
  calculatePixelDiff(img1, img2) {
    const canvas1 = this.imageToCanvas(img1);
    const canvas2 = this.imageToCanvas(img2);
    
    const data1 = canvas1.getContext('2d').getImageData(0, 0, canvas1.width, canvas1.height);
    const data2 = canvas2.getContext('2d').getImageData(0, 0, canvas2.width, canvas2.height);
    
    let diffPixels = 0;
    const totalPixels = data1.width * data1.height;
    
    for (let i = 0; i < data1.data.length; i += 4) {
      const r1 = data1.data[i];
      const g1 = data1.data[i + 1];
      const b1 = data1.data[i + 2];
      const a1 = data1.data[i + 3];
      
      const r2 = data2.data[i];
      const g2 = data2.data[i + 1];
      const b2 = data2.data[i + 2];
      const a2 = data2.data[i + 3];
      
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
      
      if (diff > 10) { // 容差阈值
        diffPixels++;
      }
    }
    
    return {
      diffPixels,
      totalPixels,
      percentage: (diffPixels / totalPixels) * 100
    };
  }
  
  // 生成视觉测试报告
  generateVisualReport(comparisons) {
    const report = {
      timestamp: new Date().toISOString(),
      total: comparisons.length,
      passed: 0,
      failed: 0,
      details: []
    };
    
    comparisons.forEach(comparison => {
      if (comparison.result.match) {
        report.passed++;
      } else {
        report.failed++;
      }
      
      report.details.push({
        component: comparison.component,
        theme: comparison.theme,
        match: comparison.result.match,
        difference: comparison.result.percentage,
        reason: comparison.result.reason
      });
    });
    
    return report;
  }
}
```

## 部署和分发

### 主题构建流程

```javascript
// 主题构建工具
class ThemeBuilder {
  constructor(config) {
    this.config = config;
    this.themes = new Map();
  }
  
  // 构建单个主题
  async buildTheme(themeName) {
    const themeConfig = this.config.themes[themeName];
    if (!themeConfig) {
      throw new Error(`主题配置未找到: ${themeName}`);
    }
    
    console.log(`构建主题: ${themeName}`);
    
    // 处理 CSS 文件
    const css = await this.processCSSFiles(themeConfig.sources);
    
    // 优化 CSS
    const optimizedCSS = await this.optimizeCSS(css);
    
    // 生成主题元数据
    const metadata = this.generateMetadata(themeName, themeConfig);
    
    // 输出文件
    const outputPath = path.join(this.config.outputDir, `${themeName}.css`);
    await fs.writeFile(outputPath, optimizedCSS);
    
    const metadataPath = path.join(this.config.outputDir, `${themeName}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`✅ 主题构建完成: ${themeName}`);
    
    return {
      name: themeName,
      cssPath: outputPath,
      metadataPath: metadataPath,
      size: optimizedCSS.length
    };
  }
  
  // 构建所有主题
  async buildAllThemes() {
    const results = [];
    
    for (const themeName of Object.keys(this.config.themes)) {
      try {
        const result = await this.buildTheme(themeName);
        results.push(result);
      } catch (error) {
        console.error(`构建主题失败 ${themeName}:`, error);
        results.push({
          name: themeName,
          error: error.message
        });
      }
    }
    
    // 生成构建报告
    const report = this.generateBuildReport(results);
    const reportPath = path.join(this.config.outputDir, 'build-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return results;
  }
  
  // 处理 CSS 文件
  async processCSSFiles(sources) {
    let combinedCSS = '';
    
    for (const source of sources) {
      const cssContent = await fs.readFile(source, 'utf8');
      
      // 处理 CSS 变量
      const processedCSS = this.processCSSVariables(cssContent);
      
      // 处理导入
      const resolvedCSS = await this.resolveImports(processedCSS, path.dirname(source));
      
      combinedCSS += resolvedCSS + '\n';
    }
    
    return combinedCSS;
  }
  
  // 优化 CSS
  async optimizeCSS(css) {
    // 移除注释
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 压缩空白
    css = css.replace(/\s+/g, ' ').trim();
    
    // 移除不必要的分号
    css = css.replace(/;}/g, '}');
    
    // 合并相同的选择器
    css = this.mergeDuplicateSelectors(css);
    
    return css;
  }
  
  // 生成主题元数据
  generateMetadata(themeName, config) {
    return {
      name: themeName,
      displayName: config.displayName || themeName,
      description: config.description || '',
      version: config.version || '1.0.0',
      author: config.author || '',
      buildTime: new Date().toISOString(),
      tokens: this.extractTokens(config),
      dependencies: config.dependencies || [],
      preview: config.preview || null
    };
  }
}

// 构建配置示例
const buildConfig = {
  outputDir: './dist/themes',
  themes: {
    'corporate-blue': {
      displayName: '企业蓝色主题',
      description: '适合企业使用的专业蓝色主题',
      version: '1.0.0',
      author: 'CJPayment Team',
      sources: [
        './src/themes/base.css',
        './src/themes/corporate-blue.css'
      ],
      dependencies: ['base'],
      preview: './previews/corporate-blue.png'
    }
  }
};

// 运行构建
const builder = new ThemeBuilder(buildConfig);
builder.buildAllThemes().then(results => {
  console.log('所有主题构建完成:', results);
});
```

### 主题分发和更新

```javascript
// 主题分发管理器
class ThemeDistributor {
  constructor(config) {
    this.config = config;
    this.registry = new Map();
  }
  
  // 发布主题到注册表
  async publishTheme(themePath) {
    const metadata = await this.loadThemeMetadata(themePath);
    const themePackage = await this.createThemePackage(themePath, metadata);
    
    // 上传到 CDN 或主题服务器
    const url = await this.uploadTheme(themePackage);
    
    // 注册主题
    this.registry.set(metadata.name, {
      ...metadata,
      url,
      publishTime: new Date().toISOString()
    });
    
    // 更新注册表
    await this.updateRegistry();
    
    return url;
  }
  
  // 检查主题更新
  async checkForUpdates(installedThemes) {
    const updates = [];
    
    for (const [name, localVersion] of installedThemes) {
      const remoteTheme = this.registry.get(name);
      
      if (remoteTheme && this.isNewerVersion(remoteTheme.version, localVersion)) {
        updates.push({
          name,
          currentVersion: localVersion,
          latestVersion: remoteTheme.version,
          url: remoteTheme.url
        });
      }
    }
    
    return updates;
  }
  
  // 安装主题更新
  async installUpdate(update) {
    try {
      // 下载新版本
      const themeData = await this.downloadTheme(update.url);
      
      // 备份当前版本
      await this.backupTheme(update.name);
      
      // 安装新版本
      await this.installTheme(update.name, themeData);
      
      // 验证安装
      const installed = await this.verifyInstallation(update.name);
      
      if (installed) {
        console.log(`主题更新成功: ${update.name} ${update.latestVersion}`);
        return true;
      } else {
        // 回滚到备份版本
        await this.rollbackTheme(update.name);
        throw new Error('主题验证失败，已回滚到之前版本');
      }
    } catch (error) {
      console.error(`主题更新失败: ${update.name}`, error);
      return false;
    }
  }
}
```

---

本指南提供了完整的主题定制和扩展开发流程，从创建自定义主题到部署分发，涵盖了主题开发的各个方面。遵循这些指南可以确保主题的质量、一致性和可维护性。
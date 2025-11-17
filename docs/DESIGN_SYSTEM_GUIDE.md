# CJPayment 设计系统指南

## 概述

CJPayment 设计系统是一套完整的设计语言和组件库，为企业级支付管理系统提供统一、一致的用户体验。本指南详细介绍了设计令牌、设计原则、组件规范和使用方法。

## 目录

- [设计原则](#设计原则)
- [设计令牌](#设计令牌)
- [颜色系统](#颜色系统)
- [字体系统](#字体系统)
- [间距系统](#间距系统)
- [布局系统](#布局系统)
- [组件规范](#组件规范)
- [主题系统](#主题系统)
- [响应式设计](#响应式设计)
- [可访问性](#可访问性)
- [最佳实践](#最佳实践)

## 设计原则

### 1. 一致性 (Consistency)

在整个系统中保持视觉和交互的一致性，确保用户能够预测和理解界面行为。

**实现方式:**
- 统一的设计令牌系统
- 标准化的组件库
- 一致的交互模式
- 统一的视觉语言

### 2. 清晰性 (Clarity)

界面应该清晰、直观，帮助用户快速理解和完成任务。

**实现方式:**
- 清晰的信息层次
- 明确的操作反馈
- 简洁的视觉设计
- 有意义的图标和文字

### 3. 效率性 (Efficiency)

设计应该帮助用户高效地完成任务，减少认知负担。

**实现方式:**
- 简化的操作流程
- 智能的默认设置
- 快捷操作支持
- 上下文相关的功能

### 4. 可访问性 (Accessibility)

确保所有用户都能够使用系统，包括有特殊需求的用户。

**实现方式:**
- 符合 WCAG 2.1 标准
- 键盘导航支持
- 屏幕阅读器兼容
- 高对比度模式

### 5. 适应性 (Adaptability)

系统应该能够适应不同的设备、环境和用户需求。

**实现方式:**
- 响应式设计
- 多主题支持
- 个性化设置
- 渐进式增强

## 设计令牌

设计令牌是设计系统的基础，定义了所有视觉属性的标准值。

### 令牌结构

```css
:root {
  /* 基础令牌 */
  --color-primary-50: #f0f9ff;
  --color-primary-500: #0ea5e9;
  --color-primary-900: #0c4a6e;
  
  /* 语义令牌 */
  --color-background-primary: var(--color-neutral-50);
  --color-text-primary: var(--color-neutral-900);
  --color-border-primary: var(--color-neutral-200);
  
  /* 组件令牌 */
  --button-background-primary: var(--color-primary-500);
  --button-text-primary: white;
  --button-border-primary: var(--color-primary-500);
}
```

### 令牌分类

#### 1. 基础令牌 (Primitive Tokens)
最基础的设计值，不依赖于上下文。

```css
/* 颜色基础令牌 */
--color-blue-50: #f0f9ff;
--color-blue-100: #e0f2fe;
--color-blue-500: #0ea5e9;
--color-blue-900: #0c4a6e;

/* 尺寸基础令牌 */
--size-1: 0.25rem;  /* 4px */
--size-2: 0.5rem;   /* 8px */
--size-4: 1rem;     /* 16px */
--size-8: 2rem;     /* 32px */

/* 字体基础令牌 */
--font-size-xs: 0.75rem;   /* 12px */
--font-size-sm: 0.875rem;  /* 14px */
--font-size-base: 1rem;    /* 16px */
--font-size-lg: 1.125rem;  /* 18px */
```

#### 2. 语义令牌 (Semantic Tokens)
具有特定含义的令牌，基于基础令牌定义。

```css
/* 颜色语义令牌 */
--color-background-primary: var(--color-neutral-50);
--color-background-secondary: var(--color-neutral-100);
--color-text-primary: var(--color-neutral-900);
--color-text-secondary: var(--color-neutral-600);
--color-border-primary: var(--color-neutral-200);
--color-border-focus: var(--color-primary-500);

/* 间距语义令牌 */
--spacing-component-padding: var(--size-4);
--spacing-component-margin: var(--size-6);
--spacing-section-gap: var(--size-8);

/* 阴影语义令牌 */
--shadow-card: var(--shadow-sm);
--shadow-modal: var(--shadow-xl);
--shadow-focus: 0 0 0 3px var(--color-primary-200);
```

#### 3. 组件令牌 (Component Tokens)
特定组件的令牌，基于语义令牌定义。

```css
/* 按钮组件令牌 */
--button-padding-y: var(--spacing-component-padding);
--button-padding-x: calc(var(--spacing-component-padding) * 1.5);
--button-border-radius: var(--border-radius-md);
--button-font-weight: var(--font-weight-medium);

/* 卡片组件令牌 */
--card-padding: var(--spacing-component-padding);
--card-border-radius: var(--border-radius-lg);
--card-background: var(--color-background-primary);
--card-border: 1px solid var(--color-border-primary);
--card-shadow: var(--shadow-card);
```

## 颜色系统

### 主色调 (Primary Colors)

主色调用于品牌识别和主要操作。

```css
:root {
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9;  /* 主色 */
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
}
```

**使用指南:**
- `primary-500`: 主要按钮、链接、品牌元素
- `primary-100`: 浅色背景、悬停状态
- `primary-700`: 深色变体、激活状态

### 中性色 (Neutral Colors)

中性色用于文本、边框、背景等基础元素。

```css
:root {
  --color-neutral-50: #fafafa;   /* 浅色背景 */
  --color-neutral-100: #f5f5f5;  /* 卡片背景 */
  --color-neutral-200: #e5e5e5;  /* 边框颜色 */
  --color-neutral-300: #d4d4d4;  /* 分割线 */
  --color-neutral-400: #a3a3a3;  /* 占位符文字 */
  --color-neutral-500: #737373;  /* 辅助文字 */
  --color-neutral-600: #525252;  /* 次要文字 */
  --color-neutral-700: #404040;  /* 标题文字 */
  --color-neutral-800: #262626;  /* 主要文字 */
  --color-neutral-900: #171717;  /* 强调文字 */
}
```

### 语义色 (Semantic Colors)

语义色传达特定的状态和含义。

```css
:root {
  /* 成功色 */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;
  
  /* 警告色 */
  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;
  
  /* 错误色 */
  --color-error-50: #fef2f2;
  --color-error-100: #fee2e2;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-error-700: #b91c1c;
  
  /* 信息色 */
  --color-info-50: #eff6ff;
  --color-info-100: #dbeafe;
  --color-info-500: #3b82f6;
  --color-info-600: #2563eb;
  --color-info-700: #1d4ed8;
}
```

### 颜色使用规范

#### 对比度要求

- **正常文字**: 最小对比度 4.5:1
- **大文字**: 最小对比度 3:1
- **图形元素**: 最小对比度 3:1

#### 颜色组合示例

```css
/* ✅ 推荐的颜色组合 */
.text-primary {
  color: var(--color-neutral-900);
  background: var(--color-neutral-50);
}

.text-secondary {
  color: var(--color-neutral-600);
  background: var(--color-neutral-50);
}

.button-primary {
  color: white;
  background: var(--color-primary-500);
  border: 1px solid var(--color-primary-500);
}

.button-primary:hover {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

/* ❌ 避免的颜色组合 */
.bad-contrast {
  color: var(--color-neutral-400); /* 对比度不足 */
  background: var(--color-neutral-100);
}
```

## 字体系统

### 字体族 (Font Families)

```css
:root {
  /* 无衬线字体 - 用于界面文字 */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                      'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 
                      'Segoe UI Emoji', 'Segoe UI Symbol';
  
  /* 等宽字体 - 用于代码和数据 */
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 
                      Consolas, 'Courier New', monospace;
  
  /* 数字字体 - 用于数字显示 */
  --font-family-numeric: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 字体尺寸 (Font Sizes)

```css
:root {
  --font-size-xs: 0.75rem;    /* 12px - 辅助信息 */
  --font-size-sm: 0.875rem;   /* 14px - 次要文字 */
  --font-size-base: 1rem;     /* 16px - 正文文字 */
  --font-size-lg: 1.125rem;   /* 18px - 强调文字 */
  --font-size-xl: 1.25rem;    /* 20px - 小标题 */
  --font-size-2xl: 1.5rem;    /* 24px - 中标题 */
  --font-size-3xl: 1.875rem;  /* 30px - 大标题 */
  --font-size-4xl: 2.25rem;   /* 36px - 特大标题 */
}
```

### 字体粗细 (Font Weights)

```css
:root {
  --font-weight-light: 300;     /* 细体 */
  --font-weight-normal: 400;    /* 正常 */
  --font-weight-medium: 500;    /* 中等 */
  --font-weight-semibold: 600;  /* 半粗 */
  --font-weight-bold: 700;      /* 粗体 */
  --font-weight-extrabold: 800; /* 特粗 */
}
```

### 行高 (Line Heights)

```css
:root {
  --line-height-tight: 1.25;    /* 紧密 - 标题 */
  --line-height-normal: 1.5;    /* 正常 - 正文 */
  --line-height-relaxed: 1.75;  /* 宽松 - 长文本 */
}
```

### 字体使用规范

#### 层次结构

```css
/* 页面标题 */
.heading-1 {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

/* 章节标题 */
.heading-2 {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
}

/* 小节标题 */
.heading-3 {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* 正文文字 */
.body-text {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* 辅助文字 */
.caption-text {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}

/* 数字显示 */
.numeric-text {
  font-family: var(--font-family-numeric);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

/* 代码文字 */
.code-text {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  background: var(--color-neutral-100);
  padding: 0.125rem 0.25rem;
  border-radius: var(--border-radius-sm);
}
```

## 间距系统

### 基础间距 (Base Spacing)

基于 4px 网格系统的间距标准。

```css
:root {
  --spacing-0: 0;           /* 0px */
  --spacing-1: 0.25rem;     /* 4px */
  --spacing-2: 0.5rem;      /* 8px */
  --spacing-3: 0.75rem;     /* 12px */
  --spacing-4: 1rem;        /* 16px */
  --spacing-5: 1.25rem;     /* 20px */
  --spacing-6: 1.5rem;      /* 24px */
  --spacing-8: 2rem;        /* 32px */
  --spacing-10: 2.5rem;     /* 40px */
  --spacing-12: 3rem;       /* 48px */
  --spacing-16: 4rem;       /* 64px */
  --spacing-20: 5rem;       /* 80px */
  --spacing-24: 6rem;       /* 96px */
}
```

### 语义间距 (Semantic Spacing)

```css
:root {
  /* 组件内部间距 */
  --spacing-component-xs: var(--spacing-1);   /* 4px */
  --spacing-component-sm: var(--spacing-2);   /* 8px */
  --spacing-component-md: var(--spacing-4);   /* 16px */
  --spacing-component-lg: var(--spacing-6);   /* 24px */
  --spacing-component-xl: var(--spacing-8);   /* 32px */
  
  /* 布局间距 */
  --spacing-layout-xs: var(--spacing-4);      /* 16px */
  --spacing-layout-sm: var(--spacing-6);      /* 24px */
  --spacing-layout-md: var(--spacing-8);      /* 32px */
  --spacing-layout-lg: var(--spacing-12);     /* 48px */
  --spacing-layout-xl: var(--spacing-16);     /* 64px */
  
  /* 页面间距 */
  --spacing-page-padding: var(--spacing-6);   /* 24px */
  --spacing-section-gap: var(--spacing-12);   /* 48px */
  --spacing-container-padding: var(--spacing-6); /* 24px */
}
```

### 间距使用规范

#### 组件间距

```css
/* 按钮内边距 */
.button {
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
}

.button-sm {
  padding: var(--spacing-2) var(--spacing-3); /* 8px 12px */
}

.button-lg {
  padding: var(--spacing-4) var(--spacing-6); /* 16px 24px */
}

/* 卡片间距 */
.card {
  padding: var(--spacing-6); /* 24px */
  margin-bottom: var(--spacing-6); /* 24px */
}

.card-header {
  padding: var(--spacing-4) var(--spacing-6); /* 16px 24px */
  margin-bottom: var(--spacing-4); /* 16px */
}

/* 表单间距 */
.form-group {
  margin-bottom: var(--spacing-6); /* 24px */
}

.form-label {
  margin-bottom: var(--spacing-2); /* 8px */
}

.form-input {
  padding: var(--spacing-3) var(--spacing-4); /* 12px 16px */
}
```

#### 布局间距

```css
/* 页面布局 */
.page-container {
  padding: var(--spacing-page-padding);
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  margin-bottom: var(--spacing-section-gap); /* 48px */
}

.section-header {
  margin-bottom: var(--spacing-8); /* 32px */
}

/* 网格间距 */
.grid {
  gap: var(--spacing-6); /* 24px */
}

.grid-tight {
  gap: var(--spacing-4); /* 16px */
}

.grid-loose {
  gap: var(--spacing-8); /* 32px */
}
```

## 布局系统

### 容器系统 (Container System)

```css
/* 流体容器 */
.container-fluid {
  width: 100%;
  padding-left: var(--spacing-container-padding);
  padding-right: var(--spacing-container-padding);
}

/* 固定宽度容器 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: var(--spacing-container-padding);
  padding-right: var(--spacing-container-padding);
}

/* 响应式容器 */
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }
```

### 网格系统 (Grid System)

基于 CSS Grid 的现代布局系统。

```css
/* 基础网格 */
.grid {
  display: grid;
  gap: var(--spacing-6);
}

/* 列数定义 */
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

/* 列跨度 */
.col-span-1 { grid-column: span 1 / span 1; }
.col-span-2 { grid-column: span 2 / span 2; }
.col-span-3 { grid-column: span 3 / span 3; }
.col-span-4 { grid-column: span 4 / span 4; }
.col-span-6 { grid-column: span 6 / span 6; }
.col-span-12 { grid-column: span 12 / span 12; }

/* 响应式网格 */
@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sm\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 768px) {
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lg\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
```

### Flexbox 系统

```css
/* Flex 容器 */
.flex { display: flex; }
.inline-flex { display: inline-flex; }

/* Flex 方向 */
.flex-row { flex-direction: row; }
.flex-col { flex-direction: column; }
.flex-row-reverse { flex-direction: row-reverse; }
.flex-col-reverse { flex-direction: column-reverse; }

/* Flex 换行 */
.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }

/* 对齐方式 */
.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }

.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }

/* Flex 增长和收缩 */
.flex-1 { flex: 1 1 0%; }
.flex-auto { flex: 1 1 auto; }
.flex-initial { flex: 0 1 auto; }
.flex-none { flex: none; }
```

## 组件规范

### 边框半径 (Border Radius)

```css
:root {
  --border-radius-none: 0;
  --border-radius-sm: 0.125rem;   /* 2px */
  --border-radius-base: 0.25rem;  /* 4px */
  --border-radius-md: 0.375rem;   /* 6px */
  --border-radius-lg: 0.5rem;     /* 8px */
  --border-radius-xl: 0.75rem;    /* 12px */
  --border-radius-2xl: 1rem;      /* 16px */
  --border-radius-3xl: 1.5rem;    /* 24px */
  --border-radius-full: 9999px;   /* 圆形 */
}
```

### 阴影系统 (Shadow System)

```css
:root {
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}
```

### 过渡动画 (Transitions)

```css
:root {
  /* 过渡时长 */
  --transition-duration-fast: 150ms;
  --transition-duration-base: 200ms;
  --transition-duration-slow: 300ms;
  --transition-duration-slower: 500ms;
  
  /* 缓动函数 */
  --transition-timing-ease: ease;
  --transition-timing-ease-in: ease-in;
  --transition-timing-ease-out: ease-out;
  --transition-timing-ease-in-out: ease-in-out;
  
  /* 常用过渡 */
  --transition-all: all var(--transition-duration-base) var(--transition-timing-ease-in-out);
  --transition-colors: color var(--transition-duration-base) var(--transition-timing-ease-in-out),
                       background-color var(--transition-duration-base) var(--transition-timing-ease-in-out),
                       border-color var(--transition-duration-base) var(--transition-timing-ease-in-out);
  --transition-transform: transform var(--transition-duration-base) var(--transition-timing-ease-in-out);
  --transition-opacity: opacity var(--transition-duration-base) var(--transition-timing-ease-in-out);
}
```

## 主题系统

### 主题结构

主题系统支持明暗主题和高对比度模式。

```css
/* 明亮主题（默认） */
:root {
  --theme-background-primary: #ffffff;
  --theme-background-secondary: #f8fafc;
  --theme-text-primary: #1e293b;
  --theme-text-secondary: #64748b;
  --theme-border-primary: #e2e8f0;
}

/* 暗黑主题 */
[data-theme="dark"] {
  --theme-background-primary: #0f172a;
  --theme-background-secondary: #1e293b;
  --theme-text-primary: #f8fafc;
  --theme-text-secondary: #cbd5e1;
  --theme-border-primary: #334155;
}

/* 高对比度主题 */
[data-theme="high-contrast"] {
  --theme-background-primary: #ffffff;
  --theme-background-secondary: #f0f0f0;
  --theme-text-primary: #000000;
  --theme-text-secondary: #333333;
  --theme-border-primary: #000000;
  
  /* 增强对比度 */
  --color-primary-500: #0066cc;
  --color-success-500: #008800;
  --color-warning-500: #cc6600;
  --color-error-500: #cc0000;
}
```

### 主题切换实现

```javascript
// 主题系统类
class ThemeSystem {
  constructor() {
    this.currentTheme = 'light';
    this.init();
  }
  
  init() {
    // 从本地存储读取主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
    
    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener(this.handleSystemThemeChange.bind(this));
    }
  }
  
  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // 触发主题变化事件
    document.dispatchEvent(new CustomEvent('themeChange', {
      detail: { theme }
    }));
  }
  
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
  
  handleSystemThemeChange(e) {
    if (this.currentTheme === 'auto') {
      const systemTheme = e.matches ? 'dark' : 'light';
      this.setTheme(systemTheme);
    }
  }
}

// 初始化主题系统
const themeSystem = new ThemeSystem();
```

### 主题适配组件

```css
/* 组件主题适配示例 */
.card {
  background: var(--theme-background-primary);
  color: var(--theme-text-primary);
  border: 1px solid var(--theme-border-primary);
  transition: var(--transition-colors);
}

.button-primary {
  background: var(--color-primary-500);
  color: white;
  border: 1px solid var(--color-primary-500);
}

/* 暗黑主题下的特殊处理 */
[data-theme="dark"] .card {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .button-secondary {
  background: var(--color-neutral-700);
  color: var(--color-neutral-100);
  border-color: var(--color-neutral-600);
}
```

## 响应式设计

### 断点系统 (Breakpoints)

```css
:root {
  --breakpoint-xs: 0px;      /* 超小屏幕 */
  --breakpoint-sm: 640px;    /* 小屏幕 */
  --breakpoint-md: 768px;    /* 中等屏幕 */
  --breakpoint-lg: 1024px;   /* 大屏幕 */
  --breakpoint-xl: 1280px;   /* 超大屏幕 */
  --breakpoint-2xl: 1536px;  /* 超超大屏幕 */
}

/* 媒体查询 */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### 响应式工具类

```css
/* 显示/隐藏 */
.hidden { display: none; }
.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }

/* 响应式显示 */
@media (min-width: 640px) {
  .sm\:hidden { display: none; }
  .sm\:block { display: block; }
}

@media (min-width: 768px) {
  .md\:hidden { display: none; }
  .md\:block { display: block; }
}

/* 响应式间距 */
@media (min-width: 640px) {
  .sm\:p-4 { padding: var(--spacing-4); }
  .sm\:m-6 { margin: var(--spacing-6); }
}

@media (min-width: 768px) {
  .md\:p-6 { padding: var(--spacing-6); }
  .md\:m-8 { margin: var(--spacing-8); }
}
```

### 移动端优化

```css
/* 移动端基础样式 */
@media (max-width: 767px) {
  .container {
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
  }
  
  .card {
    margin-bottom: var(--spacing-4);
    border-radius: var(--border-radius-md);
  }
  
  .button {
    min-height: 44px; /* 触摸友好的最小高度 */
  }
  
  /* 表格在移动端的处理 */
  .table-responsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* 导航在移动端的处理 */
  .navbar-nav {
    flex-direction: column;
    width: 100%;
  }
}
```

## 可访问性

### 颜色对比度

确保所有文字和背景的对比度符合 WCAG 2.1 AA 标准。

```css
/* 符合对比度要求的颜色组合 */
.text-primary-on-light {
  color: var(--color-neutral-900); /* 对比度 > 4.5:1 */
  background: var(--color-neutral-50);
}

.text-secondary-on-light {
  color: var(--color-neutral-700); /* 对比度 > 4.5:1 */
  background: var(--color-neutral-50);
}

.text-on-primary {
  color: white; /* 对比度 > 4.5:1 */
  background: var(--color-primary-500);
}
```

### 焦点指示器

```css
/* 统一的焦点样式 */
.focusable {
  outline: none;
  transition: box-shadow var(--transition-duration-fast) var(--transition-timing-ease-out);
}

.focusable:focus {
  box-shadow: 0 0 0 3px var(--color-primary-200);
}

.focusable:focus:not(:focus-visible) {
  box-shadow: none;
}

.focusable:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-200);
}

/* 高对比度模式下的焦点样式 */
[data-theme="high-contrast"] .focusable:focus {
  box-shadow: 0 0 0 2px var(--color-neutral-900);
}
```

### 运动偏好

```css
/* 尊重用户的运动偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 最佳实践

### 设计令牌使用

#### ✅ 推荐做法

```css
/* 使用语义令牌 */
.card {
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  padding: var(--spacing-component-md);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-card);
}

/* 使用组件令牌 */
.button {
  padding: var(--button-padding-y) var(--button-padding-x);
  border-radius: var(--button-border-radius);
  font-weight: var(--button-font-weight);
  transition: var(--transition-colors);
}
```

#### ❌ 避免做法

```css
/* 避免硬编码值 */
.card {
  background: #ffffff;
  color: #333333;
  border: 1px solid #e5e5e5;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 避免直接使用基础令牌 */
.button {
  background: var(--color-blue-500); /* 应该使用 var(--color-primary-500) */
  padding: var(--spacing-4); /* 应该使用 var(--button-padding) */
}
```

### 组件设计原则

#### 1. 组合优于继承

```css
/* ✅ 推荐：使用组合 */
.button {
  /* 基础样式 */
}

.button-primary {
  /* 主要按钮样式 */
}

.button-large {
  /* 大尺寸样式 */
}

/* 使用：<button class="button button-primary button-large"> */
```

#### 2. 单一职责原则

```css
/* ✅ 推荐：每个类有单一职责 */
.card { /* 卡片基础样式 */ }
.card-interactive { /* 交互功能 */ }
.card-elevated { /* 阴影效果 */ }

/* ❌ 避免：一个类承担多个职责 */
.card-primary-interactive-elevated { /* 职责过多 */ }
```

#### 3. 可预测的命名

```css
/* ✅ 推荐：可预测的命名模式 */
.button { }
.button-primary { }
.button-secondary { }
.button-sm { }
.button-lg { }

/* ❌ 避免：不一致的命名 */
.btn { }
.primary-button { }
.button-secondary { }
.small-btn { }
.button-large { }
```

### 性能优化

#### CSS 优化

```css
/* ✅ 推荐：使用 CSS 自定义属性 */
.component {
  color: var(--component-text-color, var(--color-text-primary));
  background: var(--component-bg-color, var(--color-background-primary));
}

/* ✅ 推荐：避免深层嵌套 */
.card-header { }
.card-title { }
.card-actions { }

/* ❌ 避免：过深的嵌套 */
.card .card-header .card-title .title-text { }
```

#### 加载优化

```html
<!-- 关键 CSS 内联 -->
<style>
  /* 关键渲染路径的 CSS */
  .container { max-width: 1200px; margin: 0 auto; }
  .card { background: white; padding: 1rem; }
</style>

<!-- 非关键 CSS 异步加载 -->
<link rel="preload" href="/css/components.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/css/components.css"></noscript>
```

### 维护指南

#### 版本控制

```css
/* 版本注释 */
/**
 * CJPayment Design System
 * Version: 1.0.0
 * Last Updated: 2025-01-05
 */

/* 组件版本 */
.button {
  /* @version 1.2.0 */
  /* @since 1.0.0 */
  /* @deprecated 使用 .btn 替代，将在 2.0.0 版本中移除 */
}
```

#### 文档更新

1. **令牌变更**: 更新设计令牌时，同步更新文档
2. **组件更新**: 新增或修改组件时，更新组件文档
3. **示例代码**: 保持示例代码与实际实现同步
4. **变更日志**: 记录所有重要变更

#### 测试策略

```javascript
// 设计令牌测试
describe('Design Tokens', () => {
  test('primary color should be accessible', () => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary-500');
    expect(primaryColor).toBe('#0ea5e9');
  });
  
  test('text contrast should meet WCAG standards', () => {
    const contrast = calculateContrast(
      '--color-text-primary',
      '--color-background-primary'
    );
    expect(contrast).toBeGreaterThan(4.5);
  });
});
```

## 工具和资源

### 设计工具

- **Figma**: 设计系统组件库
- **Sketch**: 设计稿和原型
- **Adobe XD**: 交互设计

### 开发工具

- **CSS 变量检查器**: 浏览器开发者工具
- **对比度检查器**: WebAIM Contrast Checker
- **可访问性测试**: axe DevTools

### 代码示例

完整的设计系统使用示例：

```html
<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CJPayment 设计系统示例</title>
    <link rel="stylesheet" href="/css/design-tokens.css">
    <link rel="stylesheet" href="/css/components.css">
</head>
<body>
    <div class="container">
        <header class="section">
            <h1 class="heading-1">设计系统示例</h1>
            <p class="body-text text-secondary">展示设计系统的各种组件和样式</p>
        </header>
        
        <section class="section">
            <h2 class="heading-2">按钮组件</h2>
            <div class="flex gap-4 flex-wrap">
                <button class="button button-primary">主要按钮</button>
                <button class="button button-secondary">次要按钮</button>
                <button class="button button-outline">轮廓按钮</button>
                <button class="button button-primary button-sm">小按钮</button>
                <button class="button button-primary button-lg">大按钮</button>
            </div>
        </section>
        
        <section class="section">
            <h2 class="heading-2">卡片组件</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">卡片标题</h3>
                    </div>
                    <div class="card-body">
                        <p class="card-text">这是卡片的内容区域。</p>
                    </div>
                    <div class="card-footer">
                        <button class="button button-primary button-sm">操作</button>
                    </div>
                </div>
                
                <div class="card stat-card">
                    <div class="card-body">
                        <div class="stat-value">1,234</div>
                        <div class="stat-label">总订单数</div>
                        <div class="stat-trend positive">+12%</div>
                    </div>
                </div>
                
                <div class="card success-card">
                    <div class="card-body">
                        <div class="status-icon">✅</div>
                        <div class="status-content">
                            <h5>操作成功</h5>
                            <p>您的操作已成功完成。</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        
        <section class="section">
            <h2 class="heading-2">表单组件</h2>
            <form class="max-w-md">
                <div class="form-group">
                    <label for="username" class="form-label">用户名</label>
                    <input type="text" id="username" name="username" class="form-input" placeholder="请输入用户名">
                </div>
                
                <div class="form-group">
                    <label for="email" class="form-label">邮箱</label>
                    <input type="email" id="email" name="email" class="form-input" placeholder="请输入邮箱">
                </div>
                
                <div class="form-group">
                    <label for="message" class="form-label">消息</label>
                    <textarea id="message" name="message" class="form-textarea" rows="4" placeholder="请输入消息"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="button button-primary">提交</button>
                    <button type="reset" class="button button-secondary">重置</button>
                </div>
            </form>
        </section>
    </div>
    
    <script src="/js/theme-system.js"></script>
    <script>
        // 初始化主题系统
        ThemeSystem.init();
    </script>
</body>
</html>
```

---

本设计系统指南提供了创建一致、可访问、可维护的用户界面所需的所有工具和规范。遵循这些指南将确保 CJPayment 系统在所有平台和设备上提供优秀的用户体验。
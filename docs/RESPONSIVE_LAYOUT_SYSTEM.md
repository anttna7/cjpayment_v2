# 响应式布局系统文档

## 概述

CJPayment管理后台采用现代化的响应式布局系统，基于CSS Grid、Flexbox和Container Queries构建，提供移动设备优先的响应式设计体验。

## 核心特性

### 1. 移动设备优先设计
- 基于移动设备优先的断点系统
- 渐进增强的响应式体验
- 优化的移动端交互

### 2. 现代CSS技术
- CSS Grid布局系统
- Flexbox弹性布局
- Container Queries容器查询
- CSS自定义属性(CSS Variables)

### 3. 智能响应式组件
- 自适应网格布局
- 响应式导航系统
- 容器查询支持
- JavaScript增强功能

## 断点系统

### 断点定义
```css
:root {
  --breakpoint-sm: 640px;   /* 小屏设备 */
  --breakpoint-md: 768px;   /* 中等设备 */
  --breakpoint-lg: 1024px;  /* 大屏设备 */
  --breakpoint-xl: 1280px;  /* 超大设备 */
  --breakpoint-2xl: 1536px; /* 超宽设备 */
}
```

### 断点使用
- `xs`: < 640px (移动设备)
- `sm`: ≥ 640px (大型手机)
- `md`: ≥ 768px (平板设备)
- `lg`: ≥ 1024px (桌面设备)
- `xl`: ≥ 1280px (大屏桌面)
- `2xl`: ≥ 1536px (超宽屏幕)

## 容器系统

### 基础容器
```html
<!-- 响应式容器 -->
<div class="container">
  <!-- 内容 -->
</div>

<!-- 流体容器 -->
<div class="container-fluid">
  <!-- 内容 -->
</div>
```

### 容器特性
- 自动居中对齐
- 响应式最大宽度
- 自适应内边距
- 流体容器支持

## CSS Grid布局

### 基础网格
```html
<!-- 基础网格 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

### 自适应网格
```html
<!-- 自适应网格 -->
<div class="grid-responsive">
  <div>自适应项目 1</div>
  <div>自适应项目 2</div>
  <div>自适应项目 3</div>
</div>
```

### 网格工具类
- `grid-cols-{n}`: 设置列数
- `col-span-{n}`: 跨越列数
- `gap-{size}`: 设置间距
- `row-span-{n}`: 跨越行数

### 响应式网格
```html
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  <!-- 响应式网格项目 -->
</div>
```

## Flexbox布局

### 基础Flex
```html
<div class="flex flex-col md:flex-row gap-4">
  <div class="flex-1">弹性项目 1</div>
  <div class="flex-1">弹性项目 2</div>
</div>
```

### Flex工具类
- `flex`: 启用flex布局
- `flex-col`: 垂直方向
- `flex-row`: 水平方向
- `justify-center`: 主轴居中
- `items-center`: 交叉轴居中
- `flex-1`: 弹性增长

## 容器查询

### 启用容器查询
```html
<div class="container-query">
  <div class="cq-sm:grid-cols-2 cq-md:grid-cols-3">
    <!-- 基于容器宽度响应的内容 -->
  </div>
</div>
```

### 容器查询断点
- `cq-sm`: ≥ 320px
- `cq-md`: ≥ 480px
- `cq-lg`: ≥ 640px
- `cq-xl`: ≥ 800px

## 布局模式

### 1. 侧边栏布局
```html
<div class="layout-sidebar">
  <aside>侧边栏</aside>
  <main>主要内容</main>
</div>
```

### 2. 卡片网格布局
```html
<div class="layout-card-grid">
  <div class="card">卡片 1</div>
  <div class="card">卡片 2</div>
  <div class="card">卡片 3</div>
</div>
```

### 3. 圣杯布局
```html
<div class="layout-holy-grail">
  <header class="header">头部</header>
  <main class="main">主要内容</main>
  <aside class="sidebar">侧边栏</aside>
  <footer class="footer">底部</footer>
</div>
```

### 4. 堆叠布局
```html
<div class="layout-stack">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

## JavaScript增强

### 响应式工具类
```javascript
// 获取当前断点
const breakpoint = window.responsiveUtils.getCurrentBreakpoint();

// 检查断点匹配
const isDesktop = window.responsiveUtils.matches('lg');

// 监听断点变化
window.addEventListener('breakpointChange', (e) => {
  console.log('断点变化:', e.detail);
});
```

### 自动响应式网格
```html
<div data-responsive-grid='{"minItemWidth": 280, "maxColumns": 4}'>
  <!-- 自动调整的网格项目 -->
</div>
```

### 响应式导航
```html
<nav data-responsive-nav='{"mobileBreakpoint": "md"}'>
  <button class="nav-toggle">菜单</button>
  <div class="nav-menu">
    <!-- 导航项目 -->
  </div>
</nav>
```

## 宽高比控制

### 宽高比工具类
```html
<div class="aspect-square">正方形</div>
<div class="aspect-video">16:9视频比例</div>
<div class="aspect-photo">4:3照片比例</div>
<div class="aspect-wide">21:9宽屏比例</div>
```

## 响应式可见性

### 显示/隐藏工具类
```html
<div class="visible-mobile">仅移动端显示</div>
<div class="hidden-mobile">移动端隐藏</div>
<div class="visible-tablet-up">平板及以上显示</div>
<div class="visible-desktop-up">桌面及以上显示</div>
```

## 性能优化

### 1. CSS优化
- 使用CSS自定义属性减少重复
- 利用CSS Grid和Flexbox的原生性能
- 避免不必要的媒体查询

### 2. JavaScript优化
- 防抖和节流处理
- ResizeObserver优化
- 事件委托机制

### 3. 渲染优化
- 避免布局抖动
- 使用transform进行动画
- 合理使用will-change属性

## 可访问性支持

### 1. 键盘导航
- 响应式导航的键盘支持
- 焦点管理
- 跳过链接

### 2. 屏幕阅读器
- 语义化HTML结构
- ARIA标签支持
- 动态内容通知

### 3. 运动偏好
```css
@media (prefers-reduced-motion: reduce) {
  /* 减少动画效果 */
}
```

## 浏览器兼容性

### 现代浏览器支持
- Chrome 88+
- Firefox 87+
- Safari 14+
- Edge 88+

### 渐进增强
- CSS Grid回退到Flexbox
- Container Queries polyfill
- 自定义属性回退值

## 最佳实践

### 1. 移动优先
```css
/* 移动端样式 */
.component {
  display: block;
}

/* 桌面端增强 */
@media (min-width: 768px) {
  .component {
    display: flex;
  }
}
```

### 2. 语义化HTML
```html
<main class="container">
  <section class="grid md:grid-cols-2 gap-6">
    <article class="card">
      <header>
        <h2>标题</h2>
      </header>
      <div>
        <p>内容</p>
      </div>
    </article>
  </section>
</main>
```

### 3. 渐进增强
```javascript
// 检查功能支持
if (CSS.supports('container-type: inline-size')) {
  // 使用原生容器查询
} else {
  // 使用polyfill
}
```

## 调试工具

### 1. 断点指示器
```html
<div class="breakpoint-indicator">
  当前断点: <span id="currentBreakpoint"></span>
</div>
```

### 2. 网格可视化
```css
.debug-grid {
  background-image: 
    linear-gradient(rgba(255,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

### 3. 容器查询调试
```javascript
// 监听容器尺寸变化
const observer = new ResizeObserver(entries => {
  entries.forEach(entry => {
    console.log('容器尺寸:', entry.contentRect);
  });
});
```

## 示例页面

查看完整的响应式布局示例：
- [响应式布局测试页面](../web/static/test-responsive-layout.html)

## 相关文档

- [设计令牌文档](./DESIGN_TOKENS.md)
- [CSS架构文档](./CSS_ARCHITECTURE.md)
- [组件库文档](./COMPONENT_LIBRARY.md)

## 更新日志

### v1.0.0 (2025-01-05)
- 初始版本发布
- 基础响应式布局系统
- CSS Grid和Flexbox支持
- Container Queries实现
- JavaScript增强功能
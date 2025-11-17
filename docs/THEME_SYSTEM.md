# CJPayment 主题系统文档

## 概述

CJPayment 主题系统提供了完整的主题切换功能，支持明亮、暗黑、高对比度主题，以及自动检测系统偏好设置。系统采用现代 CSS 自定义属性（CSS Variables）技术，确保主题切换的流畅性和一致性。

## 功能特性

### 🎨 支持的主题

- **浅色主题 (Light)**: 默认的明亮主题，适合日间使用
- **深色主题 (Dark)**: 暗黑主题，适合夜间使用，减少眼部疲劳
- **高对比度主题 (High Contrast)**: 高对比度主题，提升可访问性
- **自动主题 (Auto)**: 根据系统偏好自动选择合适的主题

### 💾 持久化存储

- 用户主题偏好自动保存到 `localStorage`
- 支持跨标签页同步
- 提供 `sessionStorage` 降级方案
- 包含时间戳用于调试

### 🔍 系统检测

- 自动检测系统颜色方案偏好 (`prefers-color-scheme`)
- 检测高对比度偏好 (`prefers-contrast`)
- 检测动画偏好 (`prefers-reduced-motion`)
- 智能主题推荐

### ♿ 可访问性支持

- 完整的键盘导航支持
- 屏幕阅读器友好的 ARIA 标签
- 主题变更语音通知
- 高对比度模式优化
- 减少动画支持

## 使用方法

### 基本使用

```javascript
// 获取主题系统实例
const themeSystem = window.ThemeSystem;

// 切换到指定主题
themeSystem.setTheme('dark');

// 获取当前有效主题
const currentTheme = themeSystem.getEffectiveTheme();

// 切换主题（在明暗主题间切换）
themeSystem.toggleTheme();

// 重置到默认设置
themeSystem.resetTheme();
```

### 监听主题变更

```javascript
document.addEventListener('themechange', (event) => {
    console.log('主题已变更:', {
        theme: event.detail.theme,
        effectiveTheme: event.detail.effectiveTheme,
        systemTheme: event.detail.systemTheme
    });
});
```

### 获取主题状态

```javascript
const status = themeSystem.getThemeStatus();
console.log('主题系统状态:', status);
```

## API 参考

### 方法

#### `setTheme(theme: string): boolean`
切换到指定主题。

**参数:**
- `theme`: 主题名称 ('light', 'dark', 'high-contrast', 'auto')

**返回值:**
- `boolean`: 切换是否成功

#### `getEffectiveTheme(): string`
获取当前有效的主题（将 'auto' 解析为实际主题）。

#### `toggleTheme(): void`
在明暗主题间切换。

#### `resetTheme(): void`
重置主题系统到默认状态。

#### `getThemeStatus(): object`
获取主题系统的详细状态信息。

#### `detectSystemPreferences(): object`
检测系统偏好设置。

### 属性

#### `currentTheme: string`
当前设置的主题名称。

#### `systemTheme: string`
系统偏好的主题。

#### `themes: object`
支持的主题列表。

## CSS 集成

### 使用设计令牌

```css
.my-component {
    background-color: var(--color-bg-primary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-primary);
}
```

### 主题特定样式

```css
/* 默认（浅色）主题 */
.my-component {
    background-color: #ffffff;
}

/* 深色主题 */
[data-theme="dark"] .my-component {
    background-color: #1a1a1a;
}

/* 高对比度主题 */
[data-theme="high-contrast"] .my-component {
    background-color: #ffffff;
    border: 2px solid #000000;
}
```

## 键盘快捷键

- `Ctrl/Cmd + Shift + T`: 切换主题

## 浏览器兼容性

### 现代浏览器支持
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 16+

### 降级支持
- 自动检测 CSS 自定义属性支持
- 提供静态 CSS 降级方案
- 优雅降级到默认主题

## 配置选项

### 主题切换器位置
主题切换器会自动插入到 `.header__right` 容器中。如果需要自定义位置，可以在初始化前创建容器：

```html
<div class="header__right">
    <!-- 主题切换器将插入到这里 -->
</div>
```

### 自定义主题
可以通过 CSS 自定义属性扩展主题：

```css
[data-theme="custom"] {
    --color-bg-primary: #f0f8ff;
    --color-text-primary: #2c3e50;
    /* 其他自定义颜色 */
}
```

## 调试和测试

### 调试信息
```javascript
// 获取详细状态
console.log(themeSystem.getThemeStatus());

// 检查 CSS 变量支持
console.log(themeSystem.supportsCSSVariables());

// 检查系统偏好
console.log(themeSystem.detectSystemPreferences());
```

### 测试页面
访问 `/static/test-theme-system.html` 查看主题系统测试页面。

### 集成测试
```javascript
// 运行集成测试
window.ThemeIntegrationTest.runTests();
```

## 性能优化

### CSS 加载优化
- 关键 CSS 内联
- 非关键 CSS 异步加载
- 主题切换时禁用过渡动画防止闪烁

### 内存优化
- 事件监听器自动清理
- 避免内存泄漏
- 高效的 DOM 操作

## 故障排除

### 常见问题

**Q: 主题切换器没有显示**
A: 确保页面中存在 `.header__right` 容器，或者手动创建合适的容器。

**Q: 主题设置没有保存**
A: 检查浏览器是否支持 localStorage，或者查看控制台是否有存储相关错误。

**Q: 某些元素没有应用主题**
A: 确保 CSS 中使用了正确的设计令牌变量，而不是硬编码的颜色值。

**Q: 主题切换有延迟或闪烁**
A: 检查 CSS 过渡动画设置，确保主题切换时正确禁用了过渡效果。

### 调试步骤

1. 打开浏览器开发者工具
2. 检查控制台是否有错误信息
3. 运行 `window.ThemeSystem.getThemeStatus()` 查看状态
4. 检查 HTML 元素的 `data-theme` 属性
5. 验证 CSS 自定义属性是否正确应用

## 更新日志

### v1.0.0 (2025-01-05)
- 初始版本发布
- 支持四种主题模式
- 完整的可访问性支持
- 系统偏好检测
- 持久化存储
- 集成测试套件

## 贡献指南

如需扩展主题系统功能，请遵循以下原则：

1. 保持向后兼容性
2. 添加适当的错误处理
3. 更新相关文档
4. 添加对应的测试用例
5. 确保可访问性标准

## 许可证

本主题系统是 CJPayment 项目的一部分，遵循项目的许可证条款。
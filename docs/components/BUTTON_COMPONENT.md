# 按钮组件 (Button Component)

## 概述

按钮组件是用户界面中最基础的交互元素，提供了统一的视觉样式和交互行为。支持多种变体、尺寸和状态。

## 特性

- ✅ 多种视觉变体（主要、次要、轮廓、危险等）
- ✅ 三种尺寸规格（小、默认、大）
- ✅ 丰富的状态支持（正常、悬停、激活、禁用、加载）
- ✅ 图标支持
- ✅ 键盘导航和可访问性
- ✅ 主题适配（明暗主题）
- ✅ 微交互动画

## 基本用法

### HTML 结构

```html
<!-- 基础按钮 -->
<button class="btn btn-primary">主要按钮</button>
<button class="btn btn-secondary">次要按钮</button>
<button class="btn btn-outline">轮廓按钮</button>
<button class="btn btn-danger">危险按钮</button>
```

### CSS 类名

| 类名 | 说明 |
|------|------|
| `.btn` | 基础按钮类，必须包含 |
| `.btn-primary` | 主要按钮样式 |
| `.btn-secondary` | 次要按钮样式 |
| `.btn-outline` | 轮廓按钮样式 |
| `.btn-danger` | 危险操作按钮样式 |
| `.btn-success` | 成功操作按钮样式 |
| `.btn-warning` | 警告操作按钮样式 |

## 尺寸变体

```html
<!-- 小尺寸 -->
<button class="btn btn-primary btn-sm">小按钮</button>

<!-- 默认尺寸 -->
<button class="btn btn-primary">默认按钮</button>

<!-- 大尺寸 -->
<button class="btn btn-primary btn-lg">大按钮</button>

<!-- 全宽按钮 -->
<button class="btn btn-primary btn-block">全宽按钮</button>
```

### 尺寸规格

| 尺寸 | 类名 | 高度 | 内边距 | 字体大小 |
|------|------|------|--------|----------|
| 小 | `.btn-sm` | 32px | 8px 12px | 12px |
| 默认 | - | 40px | 12px 16px | 14px |
| 大 | `.btn-lg` | 48px | 16px 24px | 16px |

## 状态管理

### 禁用状态

```html
<!-- HTML 禁用 -->
<button class="btn btn-primary" disabled>禁用按钮</button>

<!-- CSS 禁用 -->
<button class="btn btn-primary btn-disabled">禁用按钮</button>
```

### 加载状态

```html
<!-- 加载状态 -->
<button class="btn btn-primary btn-loading">
    <span class="btn-spinner"></span>
    加载中...
</button>
```

### 激活状态

```html
<!-- 激活状态 -->
<button class="btn btn-primary btn-active">激活按钮</button>
```

## 图标按钮

### 带图标的按钮

```html
<!-- 左侧图标 -->
<button class="btn btn-primary">
    <i class="icon-plus"></i>
    添加项目
</button>

<!-- 右侧图标 -->
<button class="btn btn-primary">
    下载文件
    <i class="icon-download"></i>
</button>

<!-- 仅图标 -->
<button class="btn btn-primary btn-icon">
    <i class="icon-search"></i>
</button>
```

### 图标规范

- 图标尺寸：16px × 16px
- 图标与文字间距：8px
- 仅图标按钮：32px × 32px（小）、40px × 40px（默认）、48px × 48px（大）

## 按钮组

### 水平按钮组

```html
<div class="btn-group">
    <button class="btn btn-outline">左</button>
    <button class="btn btn-outline btn-active">中</button>
    <button class="btn btn-outline">右</button>
</div>
```

### 垂直按钮组

```html
<div class="btn-group btn-group-vertical">
    <button class="btn btn-outline">选项一</button>
    <button class="btn btn-outline">选项二</button>
    <button class="btn btn-outline">选项三</button>
</div>
```

### 分割按钮

```html
<div class="btn-group">
    <button class="btn btn-primary">主操作</button>
    <button class="btn btn-primary btn-dropdown">
        <i class="icon-chevron-down"></i>
    </button>
</div>
```

## JavaScript API

### 初始化

```javascript
// 自动初始化所有按钮
ButtonEnhancements.init();

// 手动创建按钮实例
const button = new ButtonComponent({
    element: document.querySelector('#my-button'),
    variant: 'primary',
    size: 'lg',
    disabled: false
});
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `element` | HTMLElement | null | 按钮元素 |
| `variant` | string | 'primary' | 按钮变体 |
| `size` | string | 'default' | 按钮尺寸 |
| `disabled` | boolean | false | 是否禁用 |
| `loading` | boolean | false | 是否显示加载状态 |
| `ripple` | boolean | true | 是否启用波纹效果 |

### 方法

```javascript
// 设置加载状态
button.setLoading(true);
button.setLoading(false);

// 设置禁用状态
button.setDisabled(true);
button.setDisabled(false);

// 设置变体
button.setVariant('secondary');

// 设置尺寸
button.setSize('lg');

// 触发点击
button.click();

// 销毁实例
button.destroy();
```

### 事件

```javascript
// 点击事件
button.on('click', function(event) {
    console.log('按钮被点击', event);
});

// 状态变化事件
button.on('stateChange', function(state) {
    console.log('按钮状态变化', state);
});

// 加载状态变化
button.on('loadingChange', function(loading) {
    console.log('加载状态变化', loading);
});
```

## 样式定制

### CSS 变量

```css
.btn {
    /* 基础样式变量 */
    --btn-font-family: var(--font-family-sans);
    --btn-font-weight: var(--font-weight-medium);
    --btn-border-radius: var(--radius-md);
    --btn-transition: all 0.2s ease-in-out;
    
    /* 尺寸变量 */
    --btn-padding-y: var(--space-3);
    --btn-padding-x: var(--space-4);
    --btn-font-size: var(--font-size-sm);
    --btn-line-height: var(--line-height-normal);
    
    /* 颜色变量 */
    --btn-bg: var(--primary-500);
    --btn-color: white;
    --btn-border-color: var(--primary-500);
    
    /* 悬停状态 */
    --btn-hover-bg: var(--primary-600);
    --btn-hover-color: white;
    --btn-hover-border-color: var(--primary-600);
    
    /* 激活状态 */
    --btn-active-bg: var(--primary-700);
    --btn-active-color: white;
    --btn-active-border-color: var(--primary-700);
    
    /* 禁用状态 */
    --btn-disabled-opacity: 0.6;
}
```

### 自定义主题

```css
/* 自定义品牌按钮 */
.btn-brand {
    --btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --btn-color: white;
    --btn-border-color: transparent;
    --btn-hover-bg: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

/* 自定义圆形按钮 */
.btn-circle {
    --btn-border-radius: var(--radius-full);
    --btn-padding-x: var(--btn-padding-y);
    aspect-ratio: 1;
}

/* 自定义阴影按钮 */
.btn-shadow {
    box-shadow: var(--shadow-lg);
}

.btn-shadow:hover {
    box-shadow: var(--shadow-xl);
    transform: translateY(-2px);
}
```

## 可访问性

### ARIA 属性

```html
<!-- 带标签的图标按钮 -->
<button class="btn btn-primary btn-icon" aria-label="搜索">
    <i class="icon-search" aria-hidden="true"></i>
</button>

<!-- 切换按钮 -->
<button class="btn btn-outline" 
        aria-pressed="false" 
        aria-describedby="toggle-help">
    切换选项
</button>
<div id="toggle-help" class="sr-only">点击切换选项状态</div>

<!-- 加载状态按钮 -->
<button class="btn btn-primary btn-loading" 
        aria-busy="true" 
        aria-describedby="loading-text">
    <span class="btn-spinner" aria-hidden="true"></span>
    <span id="loading-text">正在处理...</span>
</button>
```

### 键盘导航

- `Tab`: 聚焦到按钮
- `Enter` / `Space`: 激活按钮
- `Esc`: 取消操作（在模态框中）

### 屏幕阅读器支持

```html
<!-- 状态通知 -->
<button class="btn btn-primary" id="save-btn">
    保存
    <span class="sr-only" aria-live="polite" id="save-status"></span>
</button>

<script>
// 更新状态通知
function updateSaveStatus(message) {
    document.getElementById('save-status').textContent = message;
}

// 保存成功后
updateSaveStatus('保存成功');
</script>
```

## 最佳实践

### 使用指南

1. **语义化**: 使用 `<button>` 元素而不是 `<div>` 或 `<a>`
2. **明确性**: 按钮文字应该清楚地描述操作
3. **一致性**: 在同一界面中保持按钮样式的一致性
4. **层次性**: 使用不同的按钮变体来表示操作的重要性
5. **反馈性**: 为异步操作提供加载状态反馈

### 推荐用法

```html
<!-- ✅ 推荐：语义化和可访问性 -->
<button class="btn btn-primary" type="submit">
    <i class="icon-save" aria-hidden="true"></i>
    保存更改
</button>

<!-- ✅ 推荐：明确的操作描述 -->
<button class="btn btn-danger" onclick="confirmDelete()">
    删除订单
</button>

<!-- ✅ 推荐：加载状态反馈 -->
<button class="btn btn-primary btn-loading" disabled>
    <span class="btn-spinner" aria-hidden="true"></span>
    正在保存...
</button>
```

### 避免的用法

```html
<!-- ❌ 避免：使用非语义化元素 -->
<div class="btn btn-primary" onclick="doSomething()">点击我</div>

<!-- ❌ 避免：模糊的操作描述 -->
<button class="btn btn-primary">确定</button>

<!-- ❌ 避免：没有反馈的异步操作 -->
<button class="btn btn-primary" onclick="longRunningTask()">
    执行任务
</button>
```

## 示例代码

### 完整的表单提交示例

```html
<form id="user-form">
    <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" required>
    </div>
    
    <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="resetForm()">
            重置
        </button>
        <button type="submit" class="btn btn-primary" id="submit-btn">
            <i class="icon-save"></i>
            保存用户
        </button>
    </div>
</form>

<script>
document.getElementById('user-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.innerHTML;
    
    // 设置加载状态
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span>正在保存...';
    
    try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 成功反馈
        Toast.success('用户保存成功！');
        
    } catch (error) {
        // 错误反馈
        Toast.error('保存失败，请重试');
        
    } finally {
        // 恢复按钮状态
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = btnText;
    }
});
</script>
```

### 动态按钮组示例

```html
<div class="btn-toolbar">
    <div class="btn-group" role="group" aria-label="文本对齐">
        <button type="button" class="btn btn-outline" data-align="left">
            <i class="icon-align-left"></i>
        </button>
        <button type="button" class="btn btn-outline" data-align="center">
            <i class="icon-align-center"></i>
        </button>
        <button type="button" class="btn btn-outline" data-align="right">
            <i class="icon-align-right"></i>
        </button>
    </div>
    
    <div class="btn-group" role="group" aria-label="文本样式">
        <button type="button" class="btn btn-outline" data-style="bold">
            <i class="icon-bold"></i>
        </button>
        <button type="button" class="btn btn-outline" data-style="italic">
            <i class="icon-italic"></i>
        </button>
        <button type="button" class="btn btn-outline" data-style="underline">
            <i class="icon-underline"></i>
        </button>
    </div>
</div>

<script>
// 按钮组状态管理
class ButtonGroupManager {
    constructor(selector) {
        this.groups = document.querySelectorAll(selector);
        this.init();
    }
    
    init() {
        this.groups.forEach(group => {
            group.addEventListener('click', this.handleClick.bind(this));
        });
    }
    
    handleClick(event) {
        const button = event.target.closest('.btn');
        if (!button) return;
        
        const group = button.closest('.btn-group');
        const isToggle = group.dataset.toggle !== 'false';
        
        if (isToggle) {
            // 切换模式：可以同时选中多个
            button.classList.toggle('btn-active');
        } else {
            // 单选模式：只能选中一个
            group.querySelectorAll('.btn').forEach(btn => {
                btn.classList.remove('btn-active');
            });
            button.classList.add('btn-active');
        }
        
        // 触发自定义事件
        group.dispatchEvent(new CustomEvent('selectionChange', {
            detail: {
                button: button,
                value: button.dataset.value || button.textContent,
                active: button.classList.contains('btn-active')
            }
        }));
    }
}

// 初始化按钮组管理器
new ButtonGroupManager('.btn-group');
</script>
```

## 浏览器兼容性

| 浏览器 | 版本 | 支持状态 |
|--------|------|----------|
| Chrome | 70+ | ✅ 完全支持 |
| Firefox | 65+ | ✅ 完全支持 |
| Safari | 12+ | ✅ 完全支持 |
| Edge | 79+ | ✅ 完全支持 |
| IE | 11 | ⚠️ 部分支持（需要 polyfill） |

### Polyfill 需求

对于 IE11 支持，需要以下 polyfill：

```html
<!-- IE11 支持 -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6,Array.prototype.forEach,Object.assign"></script>
```

## 更新日志

### v1.2.0 (2025-01-05)
- 新增波纹点击效果
- 优化加载动画性能
- 增强键盘导航支持

### v1.1.0 (2025-01-03)
- 新增按钮组功能
- 支持图标按钮
- 改进可访问性

### v1.0.0 (2025-01-01)
- 初始版本发布
- 基础按钮功能
- 多种变体和尺寸支持
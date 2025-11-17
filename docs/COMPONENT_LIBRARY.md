# CJPayment 组件库文档

## 概述

CJPayment 组件库是一套现代化的 UI 组件系统，专为企业级支付管理系统设计。本文档提供了所有组件的详细使用指南、API 文档和最佳实践。

## 目录

- [设计系统](#设计系统)
- [基础组件](#基础组件)
- [布局组件](#布局组件)
- [表单组件](#表单组件)
- [数据展示组件](#数据展示组件)
- [反馈组件](#反馈组件)
- [导航组件](#导航组件)
- [高级组件](#高级组件)
- [工具类](#工具类)

## 设计系统

### 设计原则

1. **一致性**: 所有组件遵循统一的设计语言和交互模式
2. **可访问性**: 支持键盘导航、屏幕阅读器和高对比度模式
3. **响应式**: 适配各种屏幕尺寸和设备类型
4. **性能**: 优化加载速度和运行时性能
5. **可维护性**: 模块化设计，易于扩展和维护

### 使用方式

#### 引入组件

```html
<!-- 引入基础样式 -->
<link rel="stylesheet" href="/static/css/design-tokens.css">
<link rel="stylesheet" href="/static/css/main.css">

<!-- 引入特定组件样式 -->
<link rel="stylesheet" href="/static/css/components/card.css">
<link rel="stylesheet" href="/static/css/components/button.css">

<!-- 引入组件脚本 -->
<script src="/static/js/components.js"></script>
<script src="/static/js/card-component.js"></script>
```

#### 初始化组件

```javascript
// 初始化组件系统
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题系统
    ThemeSystem.init();
    
    // 初始化组件
    CardComponent.init();
    ButtonEnhancements.init();
});
```

## 基础组件

### 按钮组件 (Button)

现代化的按钮组件，支持多种样式和状态。

#### 基本用法

```html
<!-- 主要按钮 -->
<button class="btn btn-primary">主要按钮</button>

<!-- 次要按钮 -->
<button class="btn btn-secondary">次要按钮</button>

<!-- 轮廓按钮 -->
<button class="btn btn-outline">轮廓按钮</button>

<!-- 危险按钮 -->
<button class="btn btn-danger">危险按钮</button>
```

#### 按钮尺寸

```html
<!-- 小按钮 -->
<button class="btn btn-primary btn-sm">小按钮</button>

<!-- 默认按钮 -->
<button class="btn btn-primary">默认按钮</button>

<!-- 大按钮 -->
<button class="btn btn-primary btn-lg">大按钮</button>
```

#### 按钮状态

```html
<!-- 加载状态 -->
<button class="btn btn-primary btn-loading">加载中...</button>

<!-- 禁用状态 -->
<button class="btn btn-primary" disabled>禁用按钮</button>

<!-- 带图标 -->
<button class="btn btn-primary">
    <i class="icon-plus"></i>
    添加项目
</button>
```

#### API 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | string | 'button' | 按钮类型 |
| variant | string | 'primary' | 按钮变体 |
| size | string | 'default' | 按钮尺寸 |
| disabled | boolean | false | 是否禁用 |
| loading | boolean | false | 是否显示加载状态 |

#### JavaScript API

```javascript
// 创建按钮实例
const button = new ButtonComponent({
    element: document.querySelector('.my-button'),
    variant: 'primary',
    size: 'lg'
});

// 设置加载状态
button.setLoading(true);

// 禁用按钮
button.setDisabled(true);

// 监听点击事件
button.on('click', function(event) {
    console.log('按钮被点击');
});
```

### 卡片组件 (Card)

灵活的卡片容器，用于组织和展示内容。

#### 基本用法

```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">卡片标题</h3>
    </div>
    <div class="card-body">
        <p>卡片内容</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-primary">操作</button>
    </div>
</div>
```

#### 卡片变体

```html
<!-- 统计卡片 -->
<div class="card stat-card">
    <div class="card-body">
        <div class="stat-value">1,234</div>
        <div class="stat-label">总订单数</div>
        <div class="stat-trend positive">+12%</div>
    </div>
</div>

<!-- 数据卡片 -->
<div class="card data-card">
    <div class="card-header">
        <h4>数据概览</h4>
    </div>
    <div class="card-body">
        <!-- 数据内容 -->
    </div>
</div>

<!-- 警告卡片 -->
<div class="card warning-card">
    <div class="card-body">
        <div class="warning-icon">⚠️</div>
        <div class="warning-message">注意：系统将在30分钟后维护</div>
    </div>
</div>
```

#### 响应式卡片网格

```html
<div class="card-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
</div>
```

#### JavaScript API

```javascript
// 创建卡片实例
const card = new CardComponent({
    element: document.querySelector('.my-card'),
    collapsible: true,
    draggable: false
});

// 折叠卡片
card.collapse();

// 展开卡片
card.expand();

// 监听折叠事件
card.on('collapse', function() {
    console.log('卡片已折叠');
});
```

## 表单组件

### 输入框组件 (Input)

现代化的表单输入组件，支持验证和多种状态。

#### 基本用法

```html
<div class="form-group">
    <label for="username" class="form-label">用户名</label>
    <input type="text" id="username" name="username" class="form-input" placeholder="请输入用户名">
    <div class="form-feedback">用户名长度应为3-20个字符</div>
</div>
```

#### 输入组

```html
<div class="form-group">
    <label class="form-label">金额</label>
    <div class="input-group">
        <span class="input-group-text">¥</span>
        <input type="number" class="form-input" placeholder="0.00">
        <span class="input-group-text">元</span>
    </div>
</div>
```

#### 验证状态

```html
<!-- 成功状态 -->
<div class="form-group">
    <input type="email" class="form-input valid" value="user@example.com">
    <div class="form-feedback valid">邮箱格式正确</div>
</div>

<!-- 错误状态 -->
<div class="form-group">
    <input type="email" class="form-input invalid" value="invalid-email">
    <div class="form-feedback invalid">请输入有效的邮箱地址</div>
</div>
```

### 表单向导 (Form Wizard)

多步骤表单组件，用于复杂的数据录入流程。

#### 基本用法

```html
<div class="form-wizard" data-wizard="recharge-wizard">
    <!-- 步骤指示器 -->
    <div class="wizard-steps">
        <div class="wizard-step active" data-step="1">
            <div class="step-number">1</div>
            <div class="step-title">基本信息</div>
        </div>
        <div class="wizard-step" data-step="2">
            <div class="step-number">2</div>
            <div class="step-title">支付方式</div>
        </div>
        <div class="wizard-step" data-step="3">
            <div class="step-number">3</div>
            <div class="step-title">确认提交</div>
        </div>
    </div>
    
    <!-- 步骤内容 -->
    <div class="wizard-content">
        <div class="wizard-panel active" data-panel="1">
            <!-- 第一步内容 -->
        </div>
        <div class="wizard-panel" data-panel="2">
            <!-- 第二步内容 -->
        </div>
        <div class="wizard-panel" data-panel="3">
            <!-- 第三步内容 -->
        </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="wizard-actions">
        <button class="btn btn-secondary" data-wizard-prev>上一步</button>
        <button class="btn btn-primary" data-wizard-next>下一步</button>
        <button class="btn btn-success" data-wizard-submit style="display: none;">提交</button>
    </div>
</div>
```

#### JavaScript API

```javascript
// 初始化表单向导
const wizard = new FormWizard({
    element: document.querySelector('[data-wizard="recharge-wizard"]'),
    validation: true,
    autoSave: true
});

// 跳转到指定步骤
wizard.goToStep(2);

// 获取当前步骤
const currentStep = wizard.getCurrentStep();

// 监听步骤变化
wizard.on('stepChange', function(step) {
    console.log('当前步骤:', step);
});

// 监听表单提交
wizard.on('submit', function(data) {
    console.log('表单数据:', data);
});
```

## 数据展示组件

### 表格组件 (Table)

功能丰富的数据表格组件，支持排序、筛选、分页等功能。

#### 基本用法

```html
<div class="table-container">
    <table class="table">
        <thead>
            <tr>
                <th data-sortable="true" data-field="id">ID</th>
                <th data-sortable="true" data-field="name">名称</th>
                <th data-sortable="true" data-field="amount">金额</th>
                <th data-sortable="true" data-field="status">状态</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1001</td>
                <td>充值订单</td>
                <td>¥100.00</td>
                <td><span class="badge badge-success">已完成</span></td>
                <td>
                    <button class="btn btn-sm btn-outline">查看</button>
                    <button class="btn btn-sm btn-outline">编辑</button>
                </td>
            </tr>
        </tbody>
    </table>
    
    <!-- 分页 -->
    <div class="pagination">
        <div class="pagination-info">
            显示 1-10 条，共 100 条记录
        </div>
        <div class="pagination-controls">
            <button class="page-btn" disabled>上一页</button>
            <button class="page-btn active">1</button>
            <button class="page-btn">2</button>
            <button class="page-btn">3</button>
            <button class="page-btn">下一页</button>
        </div>
    </div>
</div>
```

#### JavaScript API

```javascript
// 创建表格实例
const table = new TableComponent({
    element: document.querySelector('.table'),
    sortable: true,
    filterable: true,
    pagination: {
        pageSize: 10,
        showSizeChanger: true
    }
});

// 设置数据
table.setData([
    { id: 1, name: '订单1', amount: 100, status: 'completed' },
    { id: 2, name: '订单2', amount: 200, status: 'pending' }
]);

// 添加筛选器
table.addFilter('status', 'completed');

// 监听排序事件
table.on('sort', function(field, direction) {
    console.log('排序:', field, direction);
});
```

### 图表组件 (Chart)

基于 Chart.js 的图表组件封装，支持多种图表类型。

#### 基本用法

```html
<div class="chart-container">
    <canvas id="sales-chart" class="chart"></canvas>
</div>
```

#### JavaScript API

```javascript
// 创建图表实例
const chart = new ChartComponent({
    element: document.getElementById('sales-chart'),
    type: 'line',
    data: {
        labels: ['1月', '2月', '3月', '4月', '5月'],
        datasets: [{
            label: '销售额',
            data: [1200, 1900, 3000, 5000, 2300],
            borderColor: 'var(--primary-500)',
            backgroundColor: 'var(--primary-100)'
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

// 更新数据
chart.updateData(newData);

// 切换主题
chart.setTheme('dark');
```

## 反馈组件

### 通知组件 (Toast)

轻量级的消息通知组件。

#### 基本用法

```javascript
// 显示成功通知
Toast.success('操作成功！');

// 显示错误通知
Toast.error('操作失败，请重试');

// 显示警告通知
Toast.warning('请注意数据安全');

// 显示信息通知
Toast.info('系统将在5分钟后维护');

// 自定义通知
Toast.show({
    type: 'success',
    title: '充值成功',
    message: '您的账户已成功充值 ¥100.00',
    duration: 5000,
    actions: [
        {
            text: '查看详情',
            handler: () => console.log('查看详情')
        }
    ]
});
```

### 模态框组件 (Modal)

灵活的对话框组件。

#### 基本用法

```html
<div class="modal" id="confirm-modal">
    <div class="modal-backdrop"></div>
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">确认删除</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <p>确定要删除这条记录吗？此操作不可撤销。</p>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-modal-close>取消</button>
            <button class="btn btn-danger" data-modal-confirm>删除</button>
        </div>
    </div>
</div>
```

#### JavaScript API

```javascript
// 创建模态框实例
const modal = new ModalComponent({
    element: document.getElementById('confirm-modal'),
    backdrop: true,
    keyboard: true
});

// 显示模态框
modal.show();

// 隐藏模态框
modal.hide();

// 监听事件
modal.on('show', function() {
    console.log('模态框显示');
});

modal.on('confirm', function() {
    console.log('用户确认操作');
});
```

## 导航组件

### 导航栏组件 (Navigation)

响应式的顶部导航栏。

#### 基本用法

```html
<nav class="navbar">
    <div class="navbar-brand">
        <img src="/logo.png" alt="CJPayment" class="brand-logo">
        <span class="brand-text">CJPayment</span>
    </div>
    
    <div class="navbar-nav">
        <a href="/dashboard" class="nav-link active">仪表板</a>
        <a href="/recharge" class="nav-link">充值管理</a>
        <a href="/system" class="nav-link">系统管理</a>
        <a href="/reports" class="nav-link">报表中心</a>
    </div>
    
    <div class="navbar-actions">
        <div class="theme-switcher">
            <button class="theme-option active" data-theme="light">🌞</button>
            <button class="theme-option" data-theme="dark">🌙</button>
        </div>
        <div class="user-menu">
            <button class="user-avatar">👤</button>
        </div>
    </div>
    
    <button class="mobile-menu-toggle">☰</button>
</nav>
```

## 最佳实践

### 组件使用原则

1. **语义化**: 使用语义化的 HTML 结构
2. **可访问性**: 添加适当的 ARIA 标签
3. **性能**: 按需加载组件资源
4. **一致性**: 遵循设计系统规范
5. **可维护性**: 保持组件的独立性

### 代码示例

```javascript
// 推荐的组件初始化方式
class MyPageController {
    constructor() {
        this.initComponents();
        this.bindEvents();
    }
    
    initComponents() {
        // 初始化表格
        this.table = new TableComponent({
            element: document.querySelector('#data-table'),
            sortable: true,
            pagination: true
        });
        
        // 初始化表单
        this.form = new FormWizard({
            element: document.querySelector('#create-form'),
            validation: true
        });
    }
    
    bindEvents() {
        // 绑定事件处理器
        this.table.on('rowClick', this.handleRowClick.bind(this));
        this.form.on('submit', this.handleFormSubmit.bind(this));
    }
    
    handleRowClick(row) {
        // 处理行点击事件
    }
    
    handleFormSubmit(data) {
        // 处理表单提交
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new MyPageController();
});
```

### 样式定制

```css
/* 自定义主题变量 */
:root {
    --primary-color: #your-brand-color;
    --secondary-color: #your-secondary-color;
}

/* 自定义组件样式 */
.my-custom-card {
    --card-padding: var(--space-8);
    --card-border-radius: var(--radius-xl);
}

.my-custom-card .card-header {
    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
    color: white;
}
```

## 浏览器支持

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## 更新日志

### v1.0.0 (2025-01-01)
- 初始版本发布
- 包含所有基础组件
- 支持明暗主题切换
- 完整的可访问性支持

---

更多详细信息请参考各组件的专门文档。
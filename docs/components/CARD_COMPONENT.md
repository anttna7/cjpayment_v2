# 卡片组件 (Card Component)

## 概述

卡片组件是一个灵活的容器，用于组织和展示相关内容。它提供了一致的视觉结构，支持多种布局和交互模式，是现代化界面设计的核心组件。

## 特性

- ✅ 灵活的内容结构（头部、主体、底部）
- ✅ 多种视觉变体（统计卡片、数据卡片、警告卡片等）
- ✅ 响应式网格布局系统
- ✅ 交互功能（悬停效果、点击事件、折叠展开）
- ✅ 拖拽排序支持
- ✅ 主题适配和自定义样式
- ✅ 可访问性支持

## 基本用法

### 标准卡片结构

```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">卡片标题</h3>
        <div class="card-actions">
            <button class="btn btn-sm btn-outline">编辑</button>
        </div>
    </div>
    <div class="card-body">
        <p class="card-text">这里是卡片的主要内容区域。</p>
        <p>可以包含任何类型的内容，如文本、图片、表单等。</p>
    </div>
    <div class="card-footer">
        <small class="text-muted">最后更新：2025-01-05</small>
    </div>
</div>
```

### 简化卡片

```html
<!-- 仅包含主体的简单卡片 -->
<div class="card">
    <div class="card-body">
        <h4 class="card-title">简单卡片</h4>
        <p class="card-text">这是一个简化的卡片示例。</p>
    </div>
</div>
```

## 卡片变体

### 统计卡片

```html
<div class="card stat-card">
    <div class="card-body">
        <div class="stat-icon">
            <i class="icon-users"></i>
        </div>
        <div class="stat-content">
            <div class="stat-value">1,234</div>
            <div class="stat-label">总用户数</div>
            <div class="stat-trend positive">
                <i class="icon-arrow-up"></i>
                +12.5%
            </div>
        </div>
    </div>
</div>
```

### 数据卡片

```html
<div class="card data-card">
    <div class="card-header">
        <h4 class="card-title">
            <i class="icon-chart-bar"></i>
            销售数据
        </h4>
        <div class="card-actions">
            <button class="btn btn-sm btn-outline" title="刷新数据">
                <i class="icon-refresh"></i>
            </button>
        </div>
    </div>
    <div class="card-body">
        <div class="data-grid">
            <div class="data-item">
                <span class="data-label">今日销售</span>
                <span class="data-value">¥12,345</span>
            </div>
            <div class="data-item">
                <span class="data-label">本月销售</span>
                <span class="data-value">¥123,456</span>
            </div>
        </div>
    </div>
</div>
```

### 状态卡片

```html
<!-- 成功状态 -->
<div class="card success-card">
    <div class="card-body">
        <div class="status-icon">✅</div>
        <div class="status-content">
            <h5>操作成功</h5>
            <p>您的充值请求已成功处理。</p>
        </div>
    </div>
</div>

<!-- 警告状态 -->
<div class="card warning-card">
    <div class="card-body">
        <div class="status-icon">⚠️</div>
        <div class="status-content">
            <h5>注意</h5>
            <p>系统将在30分钟后进行维护。</p>
        </div>
    </div>
</div>

<!-- 错误状态 -->
<div class="card error-card">
    <div class="card-body">
        <div class="status-icon">❌</div>
        <div class="status-content">
            <h5>操作失败</h5>
            <p>网络连接异常，请稍后重试。</p>
        </div>
    </div>
</div>
```

### 图片卡片

```html
<div class="card image-card">
    <div class="card-image">
        <img src="/images/product.jpg" alt="产品图片" class="card-img">
        <div class="card-overlay">
            <button class="btn btn-primary">查看详情</button>
        </div>
    </div>
    <div class="card-body">
        <h5 class="card-title">产品名称</h5>
        <p class="card-text">产品描述信息...</p>
        <div class="card-meta">
            <span class="price">¥299.00</span>
            <span class="rating">⭐⭐⭐⭐⭐</span>
        </div>
    </div>
</div>
```

## 卡片布局系统

### 响应式网格

```html
<div class="card-grid">
    <!-- 自动适配的卡片网格 -->
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
</div>

<!-- 指定列数的网格 -->
<div class="card-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
</div>
```

### 等高卡片

```html
<div class="card-grid card-grid-equal-height">
    <div class="card">
        <div class="card-body">
            <h4>短内容</h4>
            <p>这是较短的内容。</p>
        </div>
    </div>
    <div class="card">
        <div class="card-body">
            <h4>长内容</h4>
            <p>这是一段较长的内容，包含更多的文字描述和详细信息。</p>
            <p>额外的段落内容。</p>
        </div>
    </div>
</div>
```

### 瀑布流布局

```html
<div class="card-masonry">
    <div class="card">
        <div class="card-body">
            <h4>卡片 1</h4>
            <p>不同高度的内容...</p>
        </div>
    </div>
    <div class="card">
        <div class="card-body">
            <h4>卡片 2</h4>
            <p>更多内容...</p>
            <p>额外段落...</p>
        </div>
    </div>
</div>
```

## 交互功能

### 可折叠卡片

```html
<div class="card collapsible-card" data-collapsible="true">
    <div class="card-header">
        <h4 class="card-title">可折叠卡片</h4>
        <button class="card-toggle" aria-expanded="true">
            <i class="icon-chevron-up"></i>
        </button>
    </div>
    <div class="card-body card-collapse">
        <p>这部分内容可以折叠和展开。</p>
        <p>点击右上角的箭头图标来切换显示状态。</p>
    </div>
</div>
```

### 可点击卡片

```html
<div class="card clickable-card" data-href="/user/123" role="button" tabindex="0">
    <div class="card-body">
        <h5 class="card-title">用户信息</h5>
        <p class="card-text">点击查看详细信息</p>
        <div class="card-arrow">
            <i class="icon-arrow-right"></i>
        </div>
    </div>
</div>
```

### 拖拽排序卡片

```html
<div class="card-grid sortable-cards" data-sortable="true">
    <div class="card draggable-card" draggable="true">
        <div class="card-header">
            <div class="drag-handle">
                <i class="icon-drag"></i>
            </div>
            <h5 class="card-title">可拖拽卡片 1</h5>
        </div>
        <div class="card-body">
            <p>拖拽手柄来重新排序</p>
        </div>
    </div>
    <div class="card draggable-card" draggable="true">
        <div class="card-header">
            <div class="drag-handle">
                <i class="icon-drag"></i>
            </div>
            <h5 class="card-title">可拖拽卡片 2</h5>
        </div>
        <div class="card-body">
            <p>支持拖拽排序功能</p>
        </div>
    </div>
</div>
```

## JavaScript API

### 初始化

```javascript
// 自动初始化所有卡片
CardComponent.init();

// 手动创建卡片实例
const card = new CardComponent({
    element: document.querySelector('#my-card'),
    collapsible: true,
    clickable: false,
    draggable: false
});
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `element` | HTMLElement | null | 卡片元素 |
| `collapsible` | boolean | false | 是否可折叠 |
| `clickable` | boolean | false | 是否可点击 |
| `draggable` | boolean | false | 是否可拖拽 |
| `href` | string | null | 点击跳转链接 |
| `target` | string | '_self' | 链接打开方式 |
| `animation` | boolean | true | 是否启用动画 |

### 方法

```javascript
// 折叠卡片
card.collapse();

// 展开卡片
card.expand();

// 切换折叠状态
card.toggle();

// 设置加载状态
card.setLoading(true);

// 更新内容
card.updateContent({
    title: '新标题',
    body: '新内容'
});

// 销毁实例
card.destroy();
```

### 事件

```javascript
// 折叠/展开事件
card.on('collapse', function() {
    console.log('卡片已折叠');
});

card.on('expand', function() {
    console.log('卡片已展开');
});

// 点击事件
card.on('click', function(event) {
    console.log('卡片被点击', event);
});

// 拖拽事件
card.on('dragStart', function(event) {
    console.log('开始拖拽', event);
});

card.on('dragEnd', function(event) {
    console.log('拖拽结束', event);
});
```

## 卡片网格系统

### 网格容器

```javascript
// 创建卡片网格实例
const cardGrid = new CardGridSystem({
    container: document.querySelector('.card-grid'),
    columns: {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5
    },
    gap: '1.5rem',
    equalHeight: true,
    sortable: true
});
```

### 网格方法

```javascript
// 添加卡片
cardGrid.addCard(cardElement);

// 移除卡片
cardGrid.removeCard(cardElement);

// 重新布局
cardGrid.relayout();

// 设置列数
cardGrid.setColumns(3);

// 启用/禁用排序
cardGrid.setSortable(true);
```

## 样式定制

### CSS 变量

```css
.card {
    /* 基础样式 */
    --card-bg: var(--bg-primary);
    --card-border: 1px solid var(--border-primary);
    --card-border-radius: var(--radius-lg);
    --card-shadow: var(--shadow-sm);
    --card-padding: var(--space-6);
    
    /* 悬停效果 */
    --card-hover-shadow: var(--shadow-md);
    --card-hover-transform: translateY(-2px);
    
    /* 头部样式 */
    --card-header-bg: var(--bg-secondary);
    --card-header-border: 1px solid var(--border-primary);
    --card-header-padding: var(--space-4) var(--space-6);
    
    /* 底部样式 */
    --card-footer-bg: var(--bg-secondary);
    --card-footer-border: 1px solid var(--border-primary);
    --card-footer-padding: var(--space-4) var(--space-6);
    
    /* 文字样式 */
    --card-title-color: var(--text-primary);
    --card-title-font-size: var(--font-size-lg);
    --card-title-font-weight: var(--font-weight-semibold);
    --card-text-color: var(--text-secondary);
}
```

### 自定义主题

```css
/* 渐变卡片 */
.card-gradient {
    --card-bg: linear-gradient(135deg, var(--primary-500), var(--primary-600));
    --card-border: none;
    color: white;
}

.card-gradient .card-title {
    color: white;
}

/* 玻璃态效果 */
.card-glass {
    --card-bg: rgba(255, 255, 255, 0.1);
    --card-border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
}

/* 极简风格 */
.card-minimal {
    --card-border: none;
    --card-shadow: none;
    --card-bg: transparent;
}

.card-minimal:hover {
    --card-bg: var(--bg-secondary);
}

/* 立体效果 */
.card-3d {
    --card-shadow: 
        0 4px 8px rgba(0, 0, 0, 0.1),
        0 8px 16px rgba(0, 0, 0, 0.1);
    transform-style: preserve-3d;
}

.card-3d:hover {
    transform: rotateX(5deg) rotateY(5deg) translateY(-5px);
}
```

### 响应式设计

```css
/* 移动端优化 */
@media (max-width: 768px) {
    .card {
        --card-padding: var(--space-4);
        --card-border-radius: var(--radius-md);
    }
    
    .card-header {
        --card-header-padding: var(--space-3) var(--space-4);
    }
    
    .card-footer {
        --card-footer-padding: var(--space-3) var(--space-4);
    }
    
    .card-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
    }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
    .card-grid {
        gap: var(--space-8);
    }
    
    .card {
        --card-padding: var(--space-8);
    }
}
```

## 可访问性

### ARIA 属性

```html
<!-- 可折叠卡片 -->
<div class="card" role="region" aria-labelledby="card-title-1">
    <div class="card-header">
        <h3 id="card-title-1" class="card-title">用户设置</h3>
        <button class="card-toggle" 
                aria-expanded="true" 
                aria-controls="card-content-1"
                aria-label="折叠卡片内容">
            <i class="icon-chevron-up" aria-hidden="true"></i>
        </button>
    </div>
    <div id="card-content-1" class="card-body">
        <p>卡片内容...</p>
    </div>
</div>

<!-- 可点击卡片 -->
<div class="card clickable-card" 
     role="button" 
     tabindex="0"
     aria-label="查看用户详情"
     data-href="/user/123">
    <div class="card-body">
        <h4 class="card-title">张三</h4>
        <p class="card-text">高级用户</p>
    </div>
</div>

<!-- 状态卡片 -->
<div class="card success-card" role="alert" aria-live="polite">
    <div class="card-body">
        <h5>操作成功</h5>
        <p>您的设置已保存。</p>
    </div>
</div>
```

### 键盘导航

```javascript
// 键盘导航支持
class CardAccessibility {
    constructor(card) {
        this.card = card;
        this.init();
    }
    
    init() {
        this.card.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                if (this.card.classList.contains('clickable-card')) {
                    event.preventDefault();
                    this.card.click();
                }
                break;
                
            case 'Escape':
                if (this.card.classList.contains('collapsible-card')) {
                    this.collapseCard();
                }
                break;
        }
    }
    
    collapseCard() {
        const toggle = this.card.querySelector('.card-toggle');
        if (toggle) {
            toggle.click();
        }
    }
}

// 为所有可交互卡片添加键盘支持
document.querySelectorAll('.clickable-card, .collapsible-card').forEach(card => {
    new CardAccessibility(card);
});
```

## 最佳实践

### 内容组织

1. **层次清晰**: 使用标题、副标题和正文建立清晰的信息层次
2. **内容简洁**: 避免在单个卡片中放置过多信息
3. **操作明确**: 将相关操作放在卡片的头部或底部
4. **状态明显**: 使用颜色和图标清楚地表示卡片状态

### 布局设计

```html
<!-- ✅ 推荐：清晰的信息层次 -->
<div class="card">
    <div class="card-header">
        <h4 class="card-title">订单 #12345</h4>
        <span class="badge badge-success">已完成</span>
    </div>
    <div class="card-body">
        <div class="order-info">
            <p><strong>客户：</strong>张三</p>
            <p><strong>金额：</strong>¥299.00</p>
            <p><strong>时间：</strong>2025-01-05 14:30</p>
        </div>
    </div>
    <div class="card-footer">
        <button class="btn btn-sm btn-outline">查看详情</button>
        <button class="btn btn-sm btn-primary">处理订单</button>
    </div>
</div>

<!-- ❌ 避免：信息混乱 -->
<div class="card">
    <div class="card-body">
        <h4>订单 #12345 张三 ¥299.00 已完成 2025-01-05 14:30</h4>
        <button class="btn">查看</button>
        <button class="btn">处理</button>
        <button class="btn">删除</button>
        <button class="btn">编辑</button>
    </div>
</div>
```

### 性能优化

```javascript
// 虚拟化大量卡片
class VirtualCardGrid {
    constructor(container, items, renderCard) {
        this.container = container;
        this.items = items;
        this.renderCard = renderCard;
        this.visibleItems = [];
        this.init();
    }
    
    init() {
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.updateVisibleItems();
    }
    
    handleScroll() {
        requestAnimationFrame(() => {
            this.updateVisibleItems();
        });
    }
    
    updateVisibleItems() {
        const containerRect = this.container.getBoundingClientRect();
        const cardHeight = 200; // 估算卡片高度
        const startIndex = Math.floor(this.container.scrollTop / cardHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerRect.height / cardHeight) + 2,
            this.items.length
        );
        
        // 只渲染可见的卡片
        this.renderVisibleCards(startIndex, endIndex);
    }
    
    renderVisibleCards(start, end) {
        const fragment = document.createDocumentFragment();
        
        for (let i = start; i < end; i++) {
            const card = this.renderCard(this.items[i]);
            card.style.position = 'absolute';
            card.style.top = `${i * 200}px`;
            fragment.appendChild(card);
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }
}
```

## 示例代码

### 完整的仪表板卡片

```html
<div class="dashboard-grid">
    <!-- 统计卡片组 -->
    <div class="card stat-card stat-card-primary">
        <div class="card-body">
            <div class="stat-icon">
                <i class="icon-dollar-sign"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value" data-counter="12345">0</div>
                <div class="stat-label">总收入</div>
                <div class="stat-trend positive">
                    <i class="icon-trending-up"></i>
                    +15.3%
                </div>
            </div>
        </div>
    </div>
    
    <!-- 图表卡片 -->
    <div class="card chart-card">
        <div class="card-header">
            <h4 class="card-title">销售趋势</h4>
            <div class="card-actions">
                <select class="form-select form-select-sm">
                    <option>最近7天</option>
                    <option>最近30天</option>
                    <option>最近90天</option>
                </select>
            </div>
        </div>
        <div class="card-body">
            <canvas id="sales-chart" class="chart"></canvas>
        </div>
    </div>
    
    <!-- 列表卡片 -->
    <div class="card list-card">
        <div class="card-header">
            <h4 class="card-title">最新订单</h4>
            <a href="/orders" class="card-link">查看全部</a>
        </div>
        <div class="card-body">
            <div class="list-group">
                <div class="list-item">
                    <div class="list-content">
                        <h6>订单 #12345</h6>
                        <p class="text-muted">张三 - ¥299.00</p>
                    </div>
                    <div class="list-actions">
                        <span class="badge badge-success">已完成</span>
                    </div>
                </div>
                <div class="list-item">
                    <div class="list-content">
                        <h6>订单 #12346</h6>
                        <p class="text-muted">李四 - ¥199.00</p>
                    </div>
                    <div class="list-actions">
                        <span class="badge badge-warning">处理中</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// 初始化仪表板卡片
class DashboardCards {
    constructor() {
        this.init();
    }
    
    init() {
        this.initStatCards();
        this.initChartCards();
        this.initListCards();
    }
    
    initStatCards() {
        // 数字动画效果
        document.querySelectorAll('[data-counter]').forEach(counter => {
            const target = parseInt(counter.dataset.counter);
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;
            
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(current).toLocaleString();
            }, 16);
        });
    }
    
    initChartCards() {
        // 初始化图表
        const chartCanvas = document.getElementById('sales-chart');
        if (chartCanvas) {
            new ChartComponent({
                element: chartCanvas,
                type: 'line',
                data: {
                    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                    datasets: [{
                        label: '销售额',
                        data: [1200, 1900, 3000, 5000, 2300, 3200, 4100],
                        borderColor: 'var(--primary-500)',
                        backgroundColor: 'var(--primary-100)',
                        tension: 0.4
                    }]
                }
            });
        }
    }
    
    initListCards() {
        // 列表项点击事件
        document.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', function() {
                const orderId = this.querySelector('h6').textContent;
                console.log('查看订单:', orderId);
            });
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new DashboardCards();
});
</script>
```

## 浏览器兼容性

| 浏览器 | 版本 | 支持状态 | 备注 |
|--------|------|----------|------|
| Chrome | 70+ | ✅ 完全支持 | 包括 CSS Grid 和 Flexbox |
| Firefox | 65+ | ✅ 完全支持 | 包括 CSS Grid 和 Flexbox |
| Safari | 12+ | ✅ 完全支持 | 包括 CSS Grid 和 Flexbox |
| Edge | 79+ | ✅ 完全支持 | 包括 CSS Grid 和 Flexbox |
| IE | 11 | ⚠️ 部分支持 | 需要 Flexbox polyfill |

## 更新日志

### v1.3.0 (2025-01-05)
- 新增拖拽排序功能
- 优化响应式布局
- 增强可访问性支持
- 新增瀑布流布局

### v1.2.0 (2025-01-03)
- 新增图片卡片变体
- 支持自定义主题
- 改进动画性能
- 新增虚拟化支持

### v1.1.0 (2025-01-02)
- 新增折叠展开功能
- 支持点击跳转
- 改进网格布局系统

### v1.0.0 (2025-01-01)
- 初始版本发布
- 基础卡片功能
- 多种变体支持
- 响应式布局
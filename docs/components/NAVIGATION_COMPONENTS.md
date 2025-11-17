# 导航组件 (Navigation Components)

## 概述

导航组件系统提供了完整的页面导航解决方案，包括顶部导航栏、面包屑导航、侧边栏导航和标签页导航。所有组件都支持响应式设计和可访问性标准。

## 特性

- ✅ 响应式顶部导航栏
- ✅ 移动端汉堡菜单
- ✅ 面包屑导航
- ✅ 侧边栏导航
- ✅ 标签页导航
- ✅ 导航搜索功能
- ✅ 活跃状态指示
- ✅ 键盘导航支持
- ✅ 可访问性支持

## 顶部导航栏 (Navbar)

### 基本结构

```html
<nav class="navbar" role="navigation" aria-label="主导航">
    <!-- 品牌标识 -->
    <div class="navbar-brand">
        <a href="/" class="brand-link">
            <img src="/static/images/logo.png" alt="CJPayment" class="brand-logo">
            <span class="brand-text">CJPayment</span>
        </a>
    </div>
    
    <!-- 主导航菜单 -->
    <div class="navbar-nav" id="main-nav">
        <a href="/dashboard" class="nav-link active" aria-current="page">
            <i class="icon-dashboard" aria-hidden="true"></i>
            仪表板
        </a>
        <div class="nav-item dropdown">
            <a href="#" class="nav-link dropdown-toggle" 
               aria-expanded="false" 
               aria-haspopup="true"
               data-dropdown="recharge-menu">
                <i class="icon-credit-card" aria-hidden="true"></i>
                充值管理
                <i class="icon-chevron-down" aria-hidden="true"></i>
            </a>
            <div class="dropdown-menu" id="recharge-menu">
                <a href="/recharge/orders" class="dropdown-item">充值订单</a>
                <a href="/recharge/accounts" class="dropdown-item">收款账户</a>
                <a href="/recharge/rules" class="dropdown-item">轮询规则</a>
            </div>
        </div>
        <a href="/system" class="nav-link">
            <i class="icon-settings" aria-hidden="true"></i>
            系统管理
        </a>
        <a href="/reports" class="nav-link">
            <i class="icon-chart-bar" aria-hidden="true"></i>
            报表中心
        </a>
    </div>
    
    <!-- 右侧操作区 -->
    <div class="navbar-actions">
        <!-- 搜索框 -->
        <div class="navbar-search">
            <div class="search-input-group">
                <input type="search" 
                       class="search-input" 
                       placeholder="搜索功能..."
                       aria-label="搜索">
                <button class="search-btn" aria-label="执行搜索">
                    <i class="icon-search" aria-hidden="true"></i>
                </button>
            </div>
        </div>
        
        <!-- 通知 -->
        <div class="navbar-notifications">
            <button class="notification-btn" 
                    aria-label="通知"
                    data-badge="3">
                <i class="icon-bell" aria-hidden="true"></i>
            </button>
        </div>
        
        <!-- 主题切换 -->
        <div class="theme-switcher">
            <button class="theme-option active" 
                    data-theme="light" 
                    aria-label="切换到明亮主题">
                <i class="icon-sun" aria-hidden="true"></i>
            </button>
            <button class="theme-option" 
                    data-theme="dark" 
                    aria-label="切换到暗黑主题">
                <i class="icon-moon" aria-hidden="true"></i>
            </button>
        </div>
        
        <!-- 用户菜单 -->
        <div class="user-menu dropdown">
            <button class="user-avatar dropdown-toggle" 
                    aria-expanded="false" 
                    aria-haspopup="true"
                    data-dropdown="user-menu">
                <img src="/static/images/avatar.jpg" alt="用户头像" class="avatar-img">
                <span class="user-name">管理员</span>
                <i class="icon-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="dropdown-menu dropdown-menu-right" id="user-menu">
                <div class="dropdown-header">
                    <div class="user-info">
                        <div class="user-name">管理员</div>
                        <div class="user-email">admin@example.com</div>
                    </div>
                </div>
                <div class="dropdown-divider"></div>
                <a href="/profile" class="dropdown-item">
                    <i class="icon-user" aria-hidden="true"></i>
                    个人资料
                </a>
                <a href="/settings" class="dropdown-item">
                    <i class="icon-settings" aria-hidden="true"></i>
                    系统设置
                </a>
                <div class="dropdown-divider"></div>
                <a href="/logout" class="dropdown-item">
                    <i class="icon-log-out" aria-hidden="true"></i>
                    退出登录
                </a>
            </div>
        </div>
    </div>
    
    <!-- 移动端菜单切换按钮 -->
    <button class="mobile-menu-toggle" 
            aria-label="切换导航菜单"
            aria-expanded="false"
            aria-controls="main-nav">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
    </button>
</nav>
```

### 固定导航栏

```html
<!-- 固定在顶部 -->
<nav class="navbar navbar-fixed-top">
    <!-- 导航内容 -->
</nav>

<!-- 固定在底部 -->
<nav class="navbar navbar-fixed-bottom">
    <!-- 导航内容 -->
</nav>

<!-- 粘性导航栏 -->
<nav class="navbar navbar-sticky">
    <!-- 导航内容 -->
</nav>
```

## 面包屑导航 (Breadcrumb)

### 基本用法

```html
<nav class="breadcrumb" aria-label="面包屑导航">
    <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
            <a href="/" class="breadcrumb-link">
                <i class="icon-home" aria-hidden="true"></i>
                首页
            </a>
        </li>
        <li class="breadcrumb-item">
            <a href="/system" class="breadcrumb-link">系统管理</a>
        </li>
        <li class="breadcrumb-item">
            <a href="/system/users" class="breadcrumb-link">用户管理</a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
            用户详情
        </li>
    </ol>
</nav>
```

### 带图标的面包屑

```html
<nav class="breadcrumb breadcrumb-with-icons">
    <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
            <a href="/" class="breadcrumb-link">
                <i class="icon-home"></i>
                <span>首页</span>
            </a>
        </li>
        <li class="breadcrumb-item">
            <a href="/recharge" class="breadcrumb-link">
                <i class="icon-credit-card"></i>
                <span>充值管理</span>
            </a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
            <i class="icon-list"></i>
            <span>充值订单</span>
        </li>
    </ol>
</nav>
```

### 可折叠面包屑

```html
<nav class="breadcrumb breadcrumb-collapsible">
    <ol class="breadcrumb-list">
        <li class="breadcrumb-item">
            <a href="/" class="breadcrumb-link">首页</a>
        </li>
        <li class="breadcrumb-item breadcrumb-ellipsis">
            <button class="breadcrumb-toggle" aria-label="展开隐藏的路径">
                <i class="icon-more-horizontal"></i>
            </button>
            <div class="breadcrumb-dropdown">
                <a href="/system" class="breadcrumb-link">系统管理</a>
                <a href="/system/users" class="breadcrumb-link">用户管理</a>
            </div>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
            用户详情
        </li>
    </ol>
</nav>
```

## 侧边栏导航 (Sidebar)

### 基本结构

```html
<aside class="sidebar" role="navigation" aria-label="侧边栏导航">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
        <div class="sidebar-brand">
            <img src="/static/images/logo.png" alt="CJPayment" class="sidebar-logo">
            <span class="sidebar-title">CJPayment</span>
        </div>
        <button class="sidebar-toggle" aria-label="折叠侧边栏">
            <i class="icon-chevron-left"></i>
        </button>
    </div>
    
    <!-- 侧边栏菜单 -->
    <nav class="sidebar-nav">
        <ul class="nav-list">
            <li class="nav-item">
                <a href="/dashboard" class="nav-link active">
                    <i class="nav-icon icon-dashboard"></i>
                    <span class="nav-text">仪表板</span>
                </a>
            </li>
            
            <!-- 带子菜单的导航项 -->
            <li class="nav-item has-submenu">
                <a href="#" class="nav-link" 
                   aria-expanded="false" 
                   aria-controls="recharge-submenu">
                    <i class="nav-icon icon-credit-card"></i>
                    <span class="nav-text">充值管理</span>
                    <i class="nav-arrow icon-chevron-right"></i>
                </a>
                <ul class="nav-submenu" id="recharge-submenu">
                    <li class="nav-subitem">
                        <a href="/recharge/orders" class="nav-sublink">
                            <span class="nav-subtext">充值订单</span>
                        </a>
                    </li>
                    <li class="nav-subitem">
                        <a href="/recharge/accounts" class="nav-sublink">
                            <span class="nav-subtext">收款账户</span>
                        </a>
                    </li>
                    <li class="nav-subitem">
                        <a href="/recharge/rules" class="nav-sublink">
                            <span class="nav-subtext">轮询规则</span>
                        </a>
                    </li>
                </ul>
            </li>
            
            <li class="nav-item">
                <a href="/system" class="nav-link">
                    <i class="nav-icon icon-settings"></i>
                    <span class="nav-text">系统管理</span>
                </a>
            </li>
            
            <li class="nav-item">
                <a href="/reports" class="nav-link">
                    <i class="nav-icon icon-chart-bar"></i>
                    <span class="nav-text">报表中心</span>
                </a>
            </li>
        </ul>
    </nav>
    
    <!-- 侧边栏底部 -->
    <div class="sidebar-footer">
        <div class="user-info">
            <img src="/static/images/avatar.jpg" alt="用户头像" class="user-avatar">
            <div class="user-details">
                <div class="user-name">管理员</div>
                <div class="user-role">系统管理员</div>
            </div>
        </div>
    </div>
</aside>
```

### 可折叠侧边栏

```html
<aside class="sidebar sidebar-collapsible" data-collapsed="false">
    <!-- 侧边栏内容 -->
</aside>

<script>
// 侧边栏折叠功能
class SidebarCollapse {
    constructor(sidebar) {
        this.sidebar = sidebar;
        this.toggle = sidebar.querySelector('.sidebar-toggle');
        this.init();
    }
    
    init() {
        this.toggle.addEventListener('click', this.toggleSidebar.bind(this));
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    toggleSidebar() {
        const isCollapsed = this.sidebar.dataset.collapsed === 'true';
        this.sidebar.dataset.collapsed = !isCollapsed;
        
        // 更新按钮状态
        this.toggle.setAttribute('aria-expanded', isCollapsed);
        
        // 触发自定义事件
        this.sidebar.dispatchEvent(new CustomEvent('sidebarToggle', {
            detail: { collapsed: !isCollapsed }
        }));
    }
    
    handleResize() {
        // 在小屏幕上自动折叠
        if (window.innerWidth < 768) {
            this.sidebar.dataset.collapsed = 'true';
        }
    }
}

// 初始化侧边栏
document.querySelectorAll('.sidebar-collapsible').forEach(sidebar => {
    new SidebarCollapse(sidebar);
});
</script>
```

## 标签页导航 (Tabs)

### 基本用法

```html
<div class="tabs" role="tablist" aria-label="内容标签页">
    <!-- 标签页头部 -->
    <div class="tab-list">
        <button class="tab-item active" 
                role="tab" 
                aria-selected="true" 
                aria-controls="tab-panel-1" 
                id="tab-1">
            基本信息
        </button>
        <button class="tab-item" 
                role="tab" 
                aria-selected="false" 
                aria-controls="tab-panel-2" 
                id="tab-2">
            账户设置
        </button>
        <button class="tab-item" 
                role="tab" 
                aria-selected="false" 
                aria-controls="tab-panel-3" 
                id="tab-3">
            安全设置
        </button>
    </div>
    
    <!-- 标签页内容 -->
    <div class="tab-content">
        <div class="tab-panel active" 
             role="tabpanel" 
             aria-labelledby="tab-1" 
             id="tab-panel-1">
            <h3>基本信息</h3>
            <p>这里是基本信息的内容...</p>
        </div>
        <div class="tab-panel" 
             role="tabpanel" 
             aria-labelledby="tab-2" 
             id="tab-panel-2">
            <h3>账户设置</h3>
            <p>这里是账户设置的内容...</p>
        </div>
        <div class="tab-panel" 
             role="tabpanel" 
             aria-labelledby="tab-3" 
             id="tab-panel-3">
            <h3>安全设置</h3>
            <p>这里是安全设置的内容...</p>
        </div>
    </div>
</div>
```

### 带图标的标签页

```html
<div class="tabs tabs-with-icons">
    <div class="tab-list">
        <button class="tab-item active" role="tab" aria-selected="true">
            <i class="tab-icon icon-user"></i>
            <span class="tab-text">用户信息</span>
        </button>
        <button class="tab-item" role="tab" aria-selected="false">
            <i class="tab-icon icon-settings"></i>
            <span class="tab-text">系统设置</span>
        </button>
        <button class="tab-item" role="tab" aria-selected="false">
            <i class="tab-icon icon-shield"></i>
            <span class="tab-text">安全中心</span>
        </button>
    </div>
    <!-- 标签页内容 -->
</div>
```

### 垂直标签页

```html
<div class="tabs tabs-vertical">
    <div class="tab-list">
        <button class="tab-item active" role="tab">个人资料</button>
        <button class="tab-item" role="tab">账户安全</button>
        <button class="tab-item" role="tab">通知设置</button>
        <button class="tab-item" role="tab">隐私设置</button>
    </div>
    <div class="tab-content">
        <!-- 标签页内容 -->
    </div>
</div>
```

## JavaScript API

### 导航栏 API

```javascript
// 创建导航栏实例
const navbar = new NavigationComponent({
    element: document.querySelector('.navbar'),
    responsive: true,
    dropdownHover: false,
    searchEnabled: true
});

// 方法
navbar.toggleMobileMenu(); // 切换移动菜单
navbar.setActiveItem('/dashboard'); // 设置活跃项
navbar.showSearch(); // 显示搜索框
navbar.hideSearch(); // 隐藏搜索框

// 事件监听
navbar.on('itemClick', function(item, event) {
    console.log('导航项被点击:', item);
});

navbar.on('search', function(query) {
    console.log('搜索查询:', query);
});
```

### 面包屑 API

```javascript
// 创建面包屑实例
const breadcrumb = new BreadcrumbComponent({
    element: document.querySelector('.breadcrumb'),
    maxItems: 5,
    collapsible: true
});

// 更新面包屑路径
breadcrumb.updatePath([
    { text: '首页', href: '/' },
    { text: '系统管理', href: '/system' },
    { text: '用户管理', href: '/system/users' },
    { text: '用户详情' } // 当前页面，无链接
]);

// 添加面包屑项
breadcrumb.addItem({ text: '编辑用户', href: '/system/users/edit' });
```

### 标签页 API

```javascript
// 创建标签页实例
const tabs = new TabsComponent({
    element: document.querySelector('.tabs'),
    activeIndex: 0,
    keyboard: true,
    lazy: false
});

// 方法
tabs.showTab(1); // 显示指定索引的标签页
tabs.showTabById('tab-2'); // 通过ID显示标签页
tabs.getActiveTab(); // 获取当前活跃标签页
tabs.addTab('新标签', '<p>新内容</p>'); // 动态添加标签页
tabs.removeTab(2); // 移除指定标签页

// 事件监听
tabs.on('tabChange', function(activeIndex, previousIndex) {
    console.log('标签页切换:', activeIndex, previousIndex);
});

tabs.on('tabAdd', function(index, tab) {
    console.log('标签页添加:', index, tab);
});
```

## 导航搜索功能

### 全局搜索

```html
<div class="navbar-search">
    <div class="search-container">
        <input type="search" 
               class="search-input" 
               placeholder="搜索功能、页面或内容..."
               data-search="global">
        <div class="search-results" style="display: none;">
            <!-- 搜索结果将动态插入 -->
        </div>
    </div>
</div>

<script>
// 全局搜索功能
class GlobalSearch {
    constructor(input) {
        this.input = input;
        this.results = input.parentElement.querySelector('.search-results');
        this.searchData = [];
        this.init();
    }
    
    init() {
        this.loadSearchData();
        this.bindEvents();
    }
    
    async loadSearchData() {
        // 加载搜索数据
        try {
            const response = await fetch('/api/search/data');
            this.searchData = await response.json();
        } catch (error) {
            console.error('加载搜索数据失败:', error);
        }
    }
    
    bindEvents() {
        let searchTimeout;
        
        this.input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        this.input.addEventListener('focus', () => {
            if (this.input.value) {
                this.showResults();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!this.input.parentElement.contains(e.target)) {
                this.hideResults();
            }
        });
    }
    
    performSearch(query) {
        if (!query.trim()) {
            this.hideResults();
            return;
        }
        
        const results = this.searchData.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
        
        this.renderResults(results, query);
        this.showResults();
    }
    
    renderResults(results, query) {
        if (results.length === 0) {
            this.results.innerHTML = `
                <div class="search-empty">
                    <i class="icon-search"></i>
                    <p>未找到相关结果</p>
                </div>
            `;
            return;
        }
        
        const html = results.map(item => `
            <a href="${item.url}" class="search-result-item">
                <div class="result-icon">
                    <i class="${item.icon}"></i>
                </div>
                <div class="result-content">
                    <div class="result-title">${this.highlightText(item.title, query)}</div>
                    <div class="result-description">${this.highlightText(item.description, query)}</div>
                </div>
                <div class="result-type">${item.type}</div>
            </a>
        `).join('');
        
        this.results.innerHTML = html;
    }
    
    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    showResults() {
        this.results.style.display = 'block';
    }
    
    hideResults() {
        this.results.style.display = 'none';
    }
}

// 初始化全局搜索
document.querySelectorAll('[data-search="global"]').forEach(input => {
    new GlobalSearch(input);
});
</script>
```

## 响应式设计

### 移动端适配

```css
/* 移动端导航栏 */
@media (max-width: 768px) {
    .navbar {
        flex-wrap: wrap;
    }
    
    .navbar-nav {
        position: fixed;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-primary);
        box-shadow: var(--shadow-lg);
        flex-direction: column;
        padding: var(--space-4);
        transform: translateY(-100%);
        transition: transform 0.3s ease-in-out;
        z-index: 1000;
    }
    
    .navbar-nav.show {
        transform: translateY(0);
    }
    
    .nav-link {
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-2);
    }
    
    .mobile-menu-toggle {
        display: flex;
    }
    
    /* 汉堡菜单动画 */
    .mobile-menu-toggle[aria-expanded="true"] .hamburger-line:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle[aria-expanded="true"] .hamburger-line:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-toggle[aria-expanded="true"] .hamburger-line:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
}

/* 平板端适配 */
@media (min-width: 769px) and (max-width: 1024px) {
    .navbar-nav {
        gap: var(--space-2);
    }
    
    .nav-link {
        padding: var(--space-2) var(--space-3);
        font-size: var(--font-size-sm);
    }
}
```

## 可访问性

### 键盘导航

```javascript
// 导航键盘支持
class NavigationKeyboard {
    constructor(nav) {
        this.nav = nav;
        this.items = nav.querySelectorAll('.nav-link, .dropdown-toggle');
        this.currentIndex = 0;
        this.init();
    }
    
    init() {
        this.nav.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // 为每个导航项添加tabindex
        this.items.forEach((item, index) => {
            item.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
    }
    
    handleKeydown(event) {
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                this.moveNext();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                this.movePrevious();
                break;
            case 'Home':
                event.preventDefault();
                this.moveToFirst();
                break;
            case 'End':
                event.preventDefault();
                this.moveToLast();
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.activateItem();
                break;
            case 'Escape':
                this.closeDropdowns();
                break;
        }
    }
    
    moveNext() {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.focusCurrentItem();
    }
    
    movePrevious() {
        this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.focusCurrentItem();
    }
    
    moveToFirst() {
        this.currentIndex = 0;
        this.focusCurrentItem();
    }
    
    moveToLast() {
        this.currentIndex = this.items.length - 1;
        this.focusCurrentItem();
    }
    
    focusCurrentItem() {
        // 更新tabindex
        this.items.forEach((item, index) => {
            item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
        });
        
        // 聚焦当前项
        this.items[this.currentIndex].focus();
    }
    
    activateItem() {
        const currentItem = this.items[this.currentIndex];
        
        if (currentItem.classList.contains('dropdown-toggle')) {
            // 切换下拉菜单
            this.toggleDropdown(currentItem);
        } else {
            // 点击链接
            currentItem.click();
        }
    }
    
    toggleDropdown(toggle) {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        
        const dropdown = document.getElementById(toggle.dataset.dropdown);
        if (dropdown) {
            dropdown.style.display = isExpanded ? 'none' : 'block';
        }
    }
    
    closeDropdowns() {
        this.nav.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.setAttribute('aria-expanded', 'false');
            const dropdown = document.getElementById(toggle.dataset.dropdown);
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        });
    }
}

// 为所有导航组件启用键盘支持
document.querySelectorAll('.navbar-nav, .sidebar-nav').forEach(nav => {
    new NavigationKeyboard(nav);
});
```

### ARIA 标签和语义化

```html
<!-- 完整的可访问性导航示例 -->
<nav class="navbar" role="navigation" aria-label="主导航">
    <div class="navbar-brand">
        <a href="/" class="brand-link" aria-label="返回首页">
            <img src="/logo.png" alt="CJPayment 标志" class="brand-logo">
            <span class="brand-text">CJPayment</span>
        </a>
    </div>
    
    <ul class="navbar-nav" role="menubar">
        <li role="none">
            <a href="/dashboard" 
               class="nav-link active" 
               role="menuitem" 
               aria-current="page">
                仪表板
            </a>
        </li>
        <li role="none">
            <div class="nav-item dropdown">
                <button class="nav-link dropdown-toggle" 
                        role="menuitem" 
                        aria-expanded="false" 
                        aria-haspopup="true"
                        aria-controls="recharge-menu">
                    充值管理
                </button>
                <ul class="dropdown-menu" 
                    id="recharge-menu" 
                    role="menu" 
                    aria-labelledby="recharge-toggle">
                    <li role="none">
                        <a href="/recharge/orders" 
                           class="dropdown-item" 
                           role="menuitem">
                            充值订单
                        </a>
                    </li>
                    <li role="none">
                        <a href="/recharge/accounts" 
                           class="dropdown-item" 
                           role="menuitem">
                            收款账户
                        </a>
                    </li>
                </ul>
            </div>
        </li>
    </ul>
    
    <button class="mobile-menu-toggle" 
            aria-label="切换导航菜单"
            aria-expanded="false"
            aria-controls="navbar-nav">
        <span class="sr-only">菜单</span>
        <span class="hamburger-line" aria-hidden="true"></span>
        <span class="hamburger-line" aria-hidden="true"></span>
        <span class="hamburger-line" aria-hidden="true"></span>
    </button>
</nav>
```

## 最佳实践

### 导航设计原则

1. **一致性**: 在整个应用中保持导航的一致性
2. **清晰性**: 使用清晰、描述性的标签
3. **层次性**: 建立清晰的信息架构
4. **反馈性**: 提供当前位置的视觉反馈
5. **可访问性**: 支持键盘导航和屏幕阅读器

### 推荐用法

```html
<!-- ✅ 推荐：语义化和可访问性 -->
<nav role="navigation" aria-label="主导航">
    <ul role="menubar">
        <li role="none">
            <a href="/dashboard" 
               role="menuitem" 
               aria-current="page"
               class="nav-link active">
                <i class="icon-dashboard" aria-hidden="true"></i>
                仪表板
            </a>
        </li>
    </ul>
</nav>

<!-- ✅ 推荐：清晰的面包屑 -->
<nav aria-label="面包屑导航">
    <ol class="breadcrumb-list">
        <li><a href="/">首页</a></li>
        <li><a href="/system">系统管理</a></li>
        <li aria-current="page">用户管理</li>
    </ol>
</nav>
```

### 避免的用法

```html
<!-- ❌ 避免：缺少语义化 -->
<div class="nav">
    <div class="nav-item">首页</div>
    <div class="nav-item">关于</div>
</div>

<!-- ❌ 避免：不清晰的标签 -->
<nav>
    <a href="/page1">页面1</a>
    <a href="/page2">页面2</a>
</nav>

<!-- ❌ 避免：缺少当前状态指示 -->
<nav>
    <a href="/dashboard">仪表板</a>
    <a href="/users">用户</a>
</nav>
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
- 新增全局搜索功能
- 优化移动端体验
- 增强键盘导航支持
- 改进可访问性

### v1.2.0 (2025-01-03)
- 新增侧边栏导航组件
- 支持导航项徽章
- 改进下拉菜单功能
- 新增垂直标签页

### v1.1.0 (2025-01-02)
- 新增面包屑导航组件
- 支持标签页导航
- 改进响应式设计
- 新增主题切换功能

### v1.0.0 (2025-01-01)
- 初始版本发布
- 基础导航栏功能
- 移动端汉堡菜单
- 下拉菜单支持
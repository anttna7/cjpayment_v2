/**
 * 虚拟滚动系统
 * Virtual Scrolling System
 */

class VirtualScroll {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        
        if (!this.container) {
            throw new Error('Container element not found');
        }
        
        this.config = {
            itemHeight: 50,
            bufferSize: 5,
            threshold: 100,
            estimatedItemHeight: 50,
            overscan: 3,
            scrollDebounce: 16,
            ...options
        };
        
        this.data = [];
        this.renderItem = options.renderItem || this.defaultRenderItem;
        this.getItemHeight = options.getItemHeight || (() => this.config.itemHeight);
        
        // 状态管理
        this.state = {
            scrollTop: 0,
            containerHeight: 0,
            totalHeight: 0,
            startIndex: 0,
            endIndex: 0,
            visibleItems: [],
            itemHeights: new Map(),
            itemPositions: new Map()
        };
        
        // DOM 元素
        this.viewport = null;
        this.content = null;
        this.spacerBefore = null;
        this.spacerAfter = null;
        
        // 性能优化
        this.rafId = null;
        this.scrollTimer = null;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        this.setupDOM();
        this.setupEventListeners();
        this.measureContainer();
        this.calculateLayout();
        this.render();
    }
    
    /**
     * 设置 DOM 结构
     */
    setupDOM() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建视口
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroll-viewport';
        this.viewport.style.cssText = `
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
        `;
        
        // 创建内容容器
        this.content = document.createElement('div');
        this.content.className = 'virtual-scroll-content';
        this.content.style.cssText = `
            position: relative;
            width: 100%;
        `;
        
        // 创建占位符
        this.spacerBefore = document.createElement('div');
        this.spacerBefore.className = 'virtual-scroll-spacer-before';
        this.spacerBefore.style.cssText = `
            height: 0px;
            width: 100%;
        `;
        
        this.spacerAfter = document.createElement('div');
        this.spacerAfter.className = 'virtual-scroll-spacer-after';
        this.spacerAfter.style.cssText = `
            height: 0px;
            width: 100%;
        `;
        
        // 组装 DOM
        this.content.appendChild(this.spacerBefore);
        this.content.appendChild(this.spacerAfter);
        this.viewport.appendChild(this.content);
        this.container.appendChild(this.viewport);
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 滚动事件
        this.viewport.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        
        // 窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 容器大小变化观察器
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
            this.resizeObserver.observe(this.container);
        }
    }
    
    /**
     * 处理滚动事件
     */
    handleScroll(event) {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(() => {
            this.state.scrollTop = this.viewport.scrollTop;
            this.isScrolling = true;
            
            // 清除滚动结束定时器
            if (this.scrollTimer) {
                clearTimeout(this.scrollTimer);
            }
            
            // 设置滚动结束定时器
            this.scrollTimer = setTimeout(() => {
                this.isScrolling = false;
                this.onScrollEnd();
            }, 150);
            
            this.calculateVisibleRange();
            this.render();
            
            // 触发滚动事件
            this.onScroll(event);
        });
    }
    
    /**
     * 处理窗口大小变化
     */
    handleResize() {
        this.measureContainer();
        this.calculateLayout();
        this.render();
    }
    
    /**
     * 测量容器尺寸
     */
    measureContainer() {
        const rect = this.container.getBoundingClientRect();
        this.state.containerHeight = rect.height;
    }
    
    /**
     * 计算布局
     */
    calculateLayout() {
        let totalHeight = 0;
        
        for (let i = 0; i < this.data.length; i++) {
            const itemHeight = this.getItemHeight(this.data[i], i);
            this.state.itemHeights.set(i, itemHeight);
            this.state.itemPositions.set(i, totalHeight);
            totalHeight += itemHeight;
        }
        
        this.state.totalHeight = totalHeight;
        this.content.style.height = `${totalHeight}px`;
    }
    
    /**
     * 计算可见范围
     */
    calculateVisibleRange() {
        const { scrollTop, containerHeight } = this.state;
        const { overscan } = this.config;
        
        // 二分查找起始索引
        let startIndex = this.findStartIndex(scrollTop);
        let endIndex = this.findEndIndex(scrollTop + containerHeight);
        
        // 添加缓冲区
        startIndex = Math.max(0, startIndex - overscan);
        endIndex = Math.min(this.data.length - 1, endIndex + overscan);
        
        this.state.startIndex = startIndex;
        this.state.endIndex = endIndex;
        
        // 更新可见项目
        this.state.visibleItems = this.data.slice(startIndex, endIndex + 1);
    }
    
    /**
     * 二分查找起始索引
     */
    findStartIndex(scrollTop) {
        let left = 0;
        let right = this.data.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const position = this.state.itemPositions.get(mid) || 0;
            
            if (position < scrollTop) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return Math.max(0, right);
    }
    
    /**
     * 二分查找结束索引
     */
    findEndIndex(scrollBottom) {
        let left = 0;
        let right = this.data.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const position = this.state.itemPositions.get(mid) || 0;
            const height = this.state.itemHeights.get(mid) || this.config.itemHeight;
            
            if (position + height < scrollBottom) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return Math.min(this.data.length - 1, left);
    }
    
    /**
     * 渲染可见项目
     */
    render() {
        const { startIndex, endIndex, visibleItems } = this.state;
        
        // 清空现有内容（除了占位符）
        const existingItems = this.content.querySelectorAll('.virtual-scroll-item');
        existingItems.forEach(item => item.remove());
        
        // 计算占位符高度
        const beforeHeight = this.state.itemPositions.get(startIndex) || 0;
        const afterHeight = this.state.totalHeight - (this.state.itemPositions.get(endIndex + 1) || this.state.totalHeight);
        
        this.spacerBefore.style.height = `${beforeHeight}px`;
        this.spacerAfter.style.height = `${afterHeight}px`;
        
        // 渲染可见项目
        const fragment = document.createDocumentFragment();
        
        visibleItems.forEach((item, index) => {
            const actualIndex = startIndex + index;
            const element = this.renderItem(item, actualIndex);
            
            if (element) {
                element.className = `virtual-scroll-item ${element.className || ''}`;
                element.style.position = 'relative';
                element.dataset.index = actualIndex;
                fragment.appendChild(element);
            }
        });
        
        // 插入到占位符之间
        this.content.insertBefore(fragment, this.spacerAfter);
        
        // 触发渲染完成事件
        this.onRender();
    }
    
    /**
     * 默认渲染函数
     */
    defaultRenderItem(item, index) {
        const div = document.createElement('div');
        div.style.cssText = `
            height: ${this.config.itemHeight}px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            border-bottom: 1px solid #eee;
        `;
        div.textContent = typeof item === 'object' ? JSON.stringify(item) : String(item);
        return div;
    }
    
    /**
     * 设置数据
     */
    setData(data) {
        this.data = Array.isArray(data) ? data : [];
        this.state.itemHeights.clear();
        this.state.itemPositions.clear();
        this.calculateLayout();
        this.calculateVisibleRange();
        this.render();
    }
    
    /**
     * 添加数据
     */
    appendData(newData) {
        const startIndex = this.data.length;
        this.data.push(...newData);
        
        // 计算新项目的布局
        let totalHeight = this.state.totalHeight;
        
        for (let i = startIndex; i < this.data.length; i++) {
            const itemHeight = this.getItemHeight(this.data[i], i);
            this.state.itemHeights.set(i, itemHeight);
            this.state.itemPositions.set(i, totalHeight);
            totalHeight += itemHeight;
        }
        
        this.state.totalHeight = totalHeight;
        this.content.style.height = `${totalHeight}px`;
        
        this.calculateVisibleRange();
        this.render();
    }
    
    /**
     * 滚动到指定索引
     */
    scrollToIndex(index, alignment = 'auto') {
        if (index < 0 || index >= this.data.length) {
            return;
        }
        
        const itemPosition = this.state.itemPositions.get(index) || 0;
        const itemHeight = this.state.itemHeights.get(index) || this.config.itemHeight;
        const containerHeight = this.state.containerHeight;
        
        let scrollTop;
        
        switch (alignment) {
            case 'start':
                scrollTop = itemPosition;
                break;
            case 'center':
                scrollTop = itemPosition - (containerHeight - itemHeight) / 2;
                break;
            case 'end':
                scrollTop = itemPosition - containerHeight + itemHeight;
                break;
            default: // 'auto'
                const currentScrollTop = this.state.scrollTop;
                if (itemPosition < currentScrollTop) {
                    scrollTop = itemPosition;
                } else if (itemPosition + itemHeight > currentScrollTop + containerHeight) {
                    scrollTop = itemPosition - containerHeight + itemHeight;
                } else {
                    return; // 已经可见，不需要滚动
                }
        }
        
        scrollTop = Math.max(0, Math.min(scrollTop, this.state.totalHeight - containerHeight));
        this.viewport.scrollTop = scrollTop;
    }
    
    /**
     * 获取可见项目信息
     */
    getVisibleRange() {
        return {
            startIndex: this.state.startIndex,
            endIndex: this.state.endIndex,
            visibleItems: this.state.visibleItems
        };
    }
    
    /**
     * 更新项目高度
     */
    updateItemHeight(index, height) {
        if (index < 0 || index >= this.data.length) {
            return;
        }
        
        const oldHeight = this.state.itemHeights.get(index) || this.config.itemHeight;
        const heightDiff = height - oldHeight;
        
        this.state.itemHeights.set(index, height);
        
        // 更新后续项目的位置
        for (let i = index + 1; i < this.data.length; i++) {
            const oldPosition = this.state.itemPositions.get(i) || 0;
            this.state.itemPositions.set(i, oldPosition + heightDiff);
        }
        
        this.state.totalHeight += heightDiff;
        this.content.style.height = `${this.state.totalHeight}px`;
        
        this.calculateVisibleRange();
        this.render();
    }
    
    /**
     * 事件回调
     */
    onScroll(event) {
        // 可以被子类重写
    }
    
    onScrollEnd() {
        // 可以被子类重写
    }
    
    onRender() {
        // 可以被子类重写
    }
    
    /**
     * 销毁实例
     */
    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // 清理事件监听器
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        // 清理 DOM
        this.container.innerHTML = '';
        
        // 清理状态
        this.state.itemHeights.clear();
        this.state.itemPositions.clear();
        this.data = [];
    }
}

/**
 * 虚拟表格类
 */
class VirtualTable extends VirtualScroll {
    constructor(container, options = {}) {
        const tableOptions = {
            itemHeight: 40,
            ...options
        };
        
        super(container, tableOptions);
        
        this.columns = options.columns || [];
        this.headerHeight = options.headerHeight || 40;
        this.setupTable();
    }
    
    setupTable() {
        // 创建表头
        this.createHeader();
        
        // 调整内容区域
        this.content.style.marginTop = `${this.headerHeight}px`;
    }
    
    createHeader() {
        const header = document.createElement('div');
        header.className = 'virtual-table-header';
        header.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: ${this.headerHeight}px;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            display: flex;
            z-index: 1;
        `;
        
        this.columns.forEach(column => {
            const cell = document.createElement('div');
            cell.className = 'virtual-table-header-cell';
            cell.style.cssText = `
                flex: ${column.width || 1};
                padding: 0 16px;
                display: flex;
                align-items: center;
                font-weight: bold;
                border-right: 1px solid #ddd;
            `;
            cell.textContent = column.title || column.key;
            header.appendChild(cell);
        });
        
        this.viewport.appendChild(header);
    }
    
    renderItem(item, index) {
        const row = document.createElement('div');
        row.className = 'virtual-table-row';
        row.style.cssText = `
            height: ${this.config.itemHeight}px;
            display: flex;
            border-bottom: 1px solid #eee;
        `;
        
        this.columns.forEach(column => {
            const cell = document.createElement('div');
            cell.className = 'virtual-table-cell';
            cell.style.cssText = `
                flex: ${column.width || 1};
                padding: 0 16px;
                display: flex;
                align-items: center;
                border-right: 1px solid #eee;
            `;
            
            const value = column.render ? 
                column.render(item[column.key], item, index) : 
                item[column.key];
                
            if (typeof value === 'string') {
                cell.textContent = value;
            } else {
                cell.appendChild(value);
            }
            
            row.appendChild(cell);
        });
        
        return row;
    }
}

/**
 * 虚拟网格类
 */
class VirtualGrid extends VirtualScroll {
    constructor(container, options = {}) {
        const gridOptions = {
            itemHeight: 200,
            columnsCount: 3,
            gap: 16,
            ...options
        };
        
        super(container, gridOptions);
        
        this.columnsCount = gridOptions.columnsCount;
        this.gap = gridOptions.gap;
    }
    
    calculateLayout() {
        const rowsCount = Math.ceil(this.data.length / this.columnsCount);
        const rowHeight = this.config.itemHeight + this.gap;
        
        for (let i = 0; i < rowsCount; i++) {
            this.state.itemHeights.set(i, rowHeight);
            this.state.itemPositions.set(i, i * rowHeight);
        }
        
        this.state.totalHeight = rowsCount * rowHeight;
        this.content.style.height = `${this.state.totalHeight}px`;
    }
    
    calculateVisibleRange() {
        const { scrollTop, containerHeight } = this.state;
        const rowHeight = this.config.itemHeight + this.gap;
        
        const startRow = Math.floor(scrollTop / rowHeight);
        const endRow = Math.ceil((scrollTop + containerHeight) / rowHeight);
        
        this.state.startIndex = startRow * this.columnsCount;
        this.state.endIndex = Math.min(this.data.length - 1, (endRow + 1) * this.columnsCount - 1);
        
        this.state.visibleItems = this.data.slice(this.state.startIndex, this.state.endIndex + 1);
    }
    
    render() {
        const { startIndex, endIndex, visibleItems } = this.state;
        
        // 清空现有内容
        const existingItems = this.content.querySelectorAll('.virtual-grid-row');
        existingItems.forEach(item => item.remove());
        
        const startRow = Math.floor(startIndex / this.columnsCount);
        const endRow = Math.floor(endIndex / this.columnsCount);
        
        // 计算占位符高度
        const rowHeight = this.config.itemHeight + this.gap;
        const beforeHeight = startRow * rowHeight;
        const afterHeight = this.state.totalHeight - (endRow + 1) * rowHeight;
        
        this.spacerBefore.style.height = `${beforeHeight}px`;
        this.spacerAfter.style.height = `${afterHeight}px`;
        
        // 渲染可见行
        const fragment = document.createDocumentFragment();
        
        for (let row = startRow; row <= endRow; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'virtual-grid-row';
            rowElement.style.cssText = `
                display: flex;
                gap: ${this.gap}px;
                margin-bottom: ${this.gap}px;
                height: ${this.config.itemHeight}px;
            `;
            
            for (let col = 0; col < this.columnsCount; col++) {
                const itemIndex = row * this.columnsCount + col;
                if (itemIndex < this.data.length) {
                    const item = this.data[itemIndex];
                    const element = this.renderItem(item, itemIndex);
                    
                    if (element) {
                        element.style.flex = '1';
                        rowElement.appendChild(element);
                    }
                }
            }
            
            fragment.appendChild(rowElement);
        }
        
        this.content.insertBefore(fragment, this.spacerAfter);
        this.onRender();
    }
}

// 导出类
export { VirtualScroll, VirtualTable, VirtualGrid };
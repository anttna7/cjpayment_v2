/**
 * Virtual Scroll Pagination Component
 * Combines virtual scrolling with pagination for optimal performance with large datasets
 */
class VirtualScrollPagination {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        if (!this.container) {
            throw new Error('Virtual scroll container not found');
        }

        // Default configuration
        this.options = {
            itemHeight: 80, // Height of each item in pixels
            bufferSize: 5, // Number of items to render outside visible area
            pageSize: 50, // Items per page
            totalItems: 0,
            renderItem: null, // Function to render each item
            loadPage: null, // Function to load a page of data
            threshold: 200, // Pixels from bottom to trigger next page load
            ...options
        };

        this.state = {
            scrollTop: 0,
            containerHeight: 0,
            visibleStart: 0,
            visibleEnd: 0,
            loadedPages: new Set(),
            currentPage: 1,
            totalPages: 1,
            isLoading: false,
            data: new Map() // Map of index -> item data
        };

        this.init();
    }

    init() {
        this.setupContainer();
        this.bindEvents();
        this.calculateDimensions();
        this.loadInitialData();
    }

    setupContainer() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.height = this.container.style.height || '400px';

        // Create virtual scroll content
        this.scrollContent = document.createElement('div');
        this.scrollContent.className = 'virtual-scroll-content';
        this.scrollContent.style.position = 'relative';
        
        // Create viewport for visible items
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroll-viewport';
        this.viewport.style.position = 'absolute';
        this.viewport.style.top = '0';
        this.viewport.style.left = '0';
        this.viewport.style.right = '0';

        this.scrollContent.appendChild(this.viewport);
        this.container.appendChild(this.scrollContent);

        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'virtual-scroll-loading';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>加载中...</span>
            </div>
        `;
        this.loadingIndicator.style.display = 'none';
        this.container.appendChild(this.loadingIndicator);
    }

    bindEvents() {
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    calculateDimensions() {
        this.state.containerHeight = this.container.clientHeight;
        this.visibleCount = Math.ceil(this.state.containerHeight / this.options.itemHeight);
        this.updateScrollHeight();
    }

    updateScrollHeight() {
        const totalHeight = this.options.totalItems * this.options.itemHeight;
        this.scrollContent.style.height = `${totalHeight}px`;
    }

    handleScroll() {
        this.state.scrollTop = this.container.scrollTop;
        this.updateVisibleRange();
        this.renderVisibleItems();
        this.checkLoadMore();
    }

    handleResize() {
        this.calculateDimensions();
        this.updateVisibleRange();
        this.renderVisibleItems();
    }

    updateVisibleRange() {
        const start = Math.floor(this.state.scrollTop / this.options.itemHeight);
        const end = Math.min(
            start + this.visibleCount + this.options.bufferSize,
            this.options.totalItems
        );

        this.state.visibleStart = Math.max(0, start - this.options.bufferSize);
        this.state.visibleEnd = end;
    }

    async loadInitialData() {
        if (typeof this.options.loadPage === 'function') {
            await this.loadPage(1);
        }
    }

    async loadPage(page) {
        if (this.state.loadedPages.has(page) || this.state.isLoading) {
            return;
        }

        this.state.isLoading = true;
        this.showLoading();

        try {
            const result = await this.options.loadPage(page, this.options.pageSize);
            
            if (result && result.data) {
                const startIndex = (page - 1) * this.options.pageSize;
                result.data.forEach((item, index) => {
                    this.state.data.set(startIndex + index, item);
                });

                this.state.loadedPages.add(page);
                
                if (result.total !== undefined) {
                    this.setTotal(result.total);
                }
            }

            this.renderVisibleItems();
        } catch (error) {
            console.error('Failed to load page:', error);
            this.showError('加载数据失败');
        } finally {
            this.state.isLoading = false;
            this.hideLoading();
        }
    }

    checkLoadMore() {
        const scrollBottom = this.state.scrollTop + this.state.containerHeight;
        const contentHeight = this.options.totalItems * this.options.itemHeight;
        
        if (contentHeight - scrollBottom < this.options.threshold) {
            const nextPage = Math.ceil(this.state.visibleEnd / this.options.pageSize) + 1;
            if (nextPage <= this.state.totalPages && !this.state.loadedPages.has(nextPage)) {
                this.loadPage(nextPage);
            }
        }
    }

    renderVisibleItems() {
        if (typeof this.options.renderItem !== 'function') {
            return;
        }

        const fragment = document.createDocumentFragment();
        
        for (let i = this.state.visibleStart; i < this.state.visibleEnd; i++) {
            const item = this.state.data.get(i);
            if (item) {
                const element = this.createItemElement(item, i);
                fragment.appendChild(element);
            }
        }

        // Clear viewport and add new items
        this.viewport.innerHTML = '';
        this.viewport.appendChild(fragment);

        // Position viewport
        this.viewport.style.transform = `translateY(${this.state.visibleStart * this.options.itemHeight}px)`;
    }

    createItemElement(item, index) {
        const element = document.createElement('div');
        element.className = 'virtual-scroll-item';
        element.style.height = `${this.options.itemHeight}px`;
        element.style.position = 'relative';
        element.dataset.index = index;

        // Render item content
        const content = this.options.renderItem(item, index);
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        }

        return element;
    }

    showLoading() {
        this.loadingIndicator.style.display = 'flex';
    }

    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    showError(message) {
        // Create or update error message
        let errorElement = this.container.querySelector('.virtual-scroll-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'virtual-scroll-error';
            this.container.appendChild(errorElement);
        }
        
        errorElement.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <span>${message}</span>
                <button class="retry-btn" onclick="this.parentElement.parentElement.style.display='none'">重试</button>
            </div>
        `;
        errorElement.style.display = 'block';
    }

    // Public methods
    setTotal(total) {
        this.options.totalItems = total;
        this.state.totalPages = Math.ceil(total / this.options.pageSize);
        this.updateScrollHeight();
        this.calculateDimensions();
    }

    scrollToIndex(index) {
        const scrollTop = index * this.options.itemHeight;
        this.container.scrollTop = scrollTop;
    }

    scrollToTop() {
        this.container.scrollTop = 0;
    }

    refresh() {
        this.state.data.clear();
        this.state.loadedPages.clear();
        this.state.currentPage = 1;
        this.scrollToTop();
        this.loadInitialData();
    }

    updateItem(index, newData) {
        this.state.data.set(index, newData);
        if (index >= this.state.visibleStart && index < this.state.visibleEnd) {
            this.renderVisibleItems();
        }
    }

    removeItem(index) {
        // Shift all items after the removed index
        for (let i = index; i < this.options.totalItems - 1; i++) {
            const nextItem = this.state.data.get(i + 1);
            if (nextItem) {
                this.state.data.set(i, nextItem);
            } else {
                this.state.data.delete(i);
            }
        }
        
        this.state.data.delete(this.options.totalItems - 1);
        this.setTotal(this.options.totalItems - 1);
        this.renderVisibleItems();
    }

    addItem(item, index = this.options.totalItems) {
        // Shift items to make room for new item
        for (let i = this.options.totalItems; i > index; i--) {
            const prevItem = this.state.data.get(i - 1);
            if (prevItem) {
                this.state.data.set(i, prevItem);
            }
        }
        
        this.state.data.set(index, item);
        this.setTotal(this.options.totalItems + 1);
        this.renderVisibleItems();
    }

    destroy() {
        this.container.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        this.container.innerHTML = '';
    }

    // Get current state
    getVisibleRange() {
        return {
            start: this.state.visibleStart,
            end: this.state.visibleEnd
        };
    }

    getLoadedPages() {
        return Array.from(this.state.loadedPages);
    }

    getTotalItems() {
        return this.options.totalItems;
    }

    isItemLoaded(index) {
        return this.state.data.has(index);
    }
}

// Factory function
window.createVirtualScrollPagination = function(container, options) {
    return new VirtualScrollPagination(container, options);
};

// Export class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualScrollPagination;
}
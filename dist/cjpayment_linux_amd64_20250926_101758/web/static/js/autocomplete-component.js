/**
 * Autocomplete Component
 * 自动完成组件
 * 
 * Features:
 * - 搜索防抖和结果缓存
 * - 键盘导航支持
 * - 选择项高亮显示
 * - 使用计数更新逻辑
 * - 无障碍访问支持
 */

class AutocompleteComponent {
  constructor(inputElement, options = {}) {
    if (!inputElement) {
      throw new Error('Input element is required');
    }
    
    this.input = inputElement;
    this.options = {
      // 数据源配置
      dataSource: null, // 数据源函数或URL
      minLength: 2, // 最小搜索长度
      maxResults: 10, // 最大结果数量
      
      // 防抖和缓存
      debounceDelay: 300, // 防抖延迟（毫秒）
      cacheTimeout: 300000, // 缓存超时（5分钟）
      
      // 显示配置
      displayProperty: 'name', // 显示属性名
      valueProperty: 'value', // 值属性名
      highlightMatches: true, // 是否高亮匹配文本
      
      // 回调函数
      onSelect: null, // 选择回调
      onSearch: null, // 搜索回调
      onError: null, // 错误回调
      
      // 样式配置
      containerClass: 'autocomplete-container',
      suggestionsClass: 'autocomplete-suggestions',
      suggestionClass: 'autocomplete-suggestion',
      selectedClass: 'autocomplete-selected',
      loadingClass: 'autocomplete-loading',
      
      // 无障碍访问
      ariaLabel: '自动完成建议',
      announceResults: true,
      
      ...options
    };
    
    // 状态管理
    this.isOpen = false;
    this.selectedIndex = -1;
    this.currentQuery = '';
    this.suggestions = [];
    this.cache = new Map();
    this.debounceTimer = null;
    this.loadingTimer = null;
    
    // DOM元素
    this.container = null;
    this.suggestionsContainer = null;
    this.loadingIndicator = null;
    
    // 初始化
    this.init();
  }
  
  // ==========================================================================
  // 初始化方法
  // ==========================================================================
  
  init() {
    this.createDOM();
    this.bindEvents();
    this.setupAccessibility();
  }
  
  /**
   * 创建DOM结构
   */
  createDOM() {
    // 创建容器
    this.container = document.createElement('div');
    this.container.className = this.options.containerClass;
    this.container.style.position = 'relative';
    
    // 包装输入框
    const parent = this.input.parentNode;
    parent.insertBefore(this.container, this.input);
    this.container.appendChild(this.input);
    
    // 创建建议列表容器
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = this.options.suggestionsClass;
    this.suggestionsContainer.style.display = 'none';
    this.suggestionsContainer.setAttribute('role', 'listbox');
    this.suggestionsContainer.setAttribute('aria-label', this.options.ariaLabel);
    this.container.appendChild(this.suggestionsContainer);
    
    // 创建加载指示器
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.className = this.options.loadingClass;
    this.loadingIndicator.style.display = 'none';
    this.loadingIndicator.innerHTML = '<span class="loading-spinner"></span>正在搜索...';
    this.container.appendChild(this.loadingIndicator);
  }
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 输入事件
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('focus', (e) => this.handleFocus(e));
    this.input.addEventListener('blur', (e) => this.handleBlur(e));
    
    // 键盘事件
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // 建议列表事件
    this.suggestionsContainer.addEventListener('click', (e) => this.handleSuggestionClick(e));
    this.suggestionsContainer.addEventListener('mouseover', (e) => this.handleSuggestionHover(e));
    
    // 全局点击事件（关闭建议）
    document.addEventListener('click', (e) => this.handleDocumentClick(e));
  }
  
  /**
   * 设置无障碍访问
   */
  setupAccessibility() {
    // 为输入框添加ARIA属性
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-haspopup', 'listbox');
    
    // 生成唯一ID
    const suggestionId = `autocomplete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.suggestionsContainer.id = suggestionId;
    this.input.setAttribute('aria-owns', suggestionId);
  }
  
  // ==========================================================================
  // 事件处理方法
  // ==========================================================================
  
  /**
   * 处理输入事件
   */
  handleInput(e) {
    const query = e.target.value.trim();
    this.currentQuery = query;
    
    // 清除之前的防抖定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // 如果查询长度不足，隐藏建议
    if (query.length < this.options.minLength) {
      this.hideSuggestions();
      return;
    }
    
    // 防抖搜索
    this.debounceTimer = setTimeout(() => {
      this.search(query);
    }, this.options.debounceDelay);
  }
  
  /**
   * 处理焦点事件
   */
  handleFocus(e) {
    // 如果有缓存的建议且查询长度足够，显示建议
    if (this.currentQuery.length >= this.options.minLength && this.suggestions.length > 0) {
      this.showSuggestions();
    }
  }
  
  /**
   * 处理失焦事件
   */
  handleBlur(e) {
    // 延迟隐藏，允许点击建议
    setTimeout(() => {
      if (!this.container.contains(document.activeElement)) {
        this.hideSuggestions();
      }
    }, 200);
  }
  
  /**
   * 处理键盘事件
   */
  handleKeydown(e) {
    if (!this.isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.hideSuggestions();
        break;
      case 'Tab':
        // Tab键关闭建议但不阻止默认行为
        this.hideSuggestions();
        break;
    }
  }
  
  /**
   * 处理建议点击事件
   */
  handleSuggestionClick(e) {
    const suggestionElement = e.target.closest(`.${this.options.suggestionClass}`);
    if (!suggestionElement) return;
    
    const index = parseInt(suggestionElement.dataset.index);
    if (index >= 0 && index < this.suggestions.length) {
      this.selectSuggestion(this.suggestions[index]);
    }
  }
  
  /**
   * 处理建议悬停事件
   */
  handleSuggestionHover(e) {
    const suggestionElement = e.target.closest(`.${this.options.suggestionClass}`);
    if (!suggestionElement) return;
    
    const index = parseInt(suggestionElement.dataset.index);
    this.setSelectedIndex(index);
  }
  
  /**
   * 处理文档点击事件
   */
  handleDocumentClick(e) {
    if (!this.container.contains(e.target)) {
      this.hideSuggestions();
    }
  }
  
  // ==========================================================================
  // 搜索和数据处理
  // ==========================================================================
  
  /**
   * 执行搜索
   */
  async search(query) {
    if (!query || query.length < this.options.minLength) {
      this.hideSuggestions();
      return;
    }
    
    // 检查缓存
    const cachedResult = this.getFromCache(query);
    if (cachedResult) {
      this.handleSearchResults(cachedResult, query);
      return;
    }
    
    // 显示加载状态
    this.showLoading();
    
    try {
      // 调用搜索回调
      if (this.options.onSearch) {
        this.options.onSearch(query);
      }
      
      // 执行搜索
      const results = await this.executeSearch(query);
      
      // 处理结果
      this.handleSearchResults(results, query);
      
      // 缓存结果
      this.addToCache(query, results);
      
    } catch (error) {
      console.error('Autocomplete search failed:', error);
      this.handleSearchError(error);
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * 执行实际搜索
   */
  async executeSearch(query) {
    if (typeof this.options.dataSource === 'function') {
      return await this.options.dataSource(query, this.options.maxResults);
    } else if (typeof this.options.dataSource === 'string') {
      // URL数据源
      const url = new URL(this.options.dataSource);
      url.searchParams.set('q', query);
      url.searchParams.set('limit', this.options.maxResults.toString());
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } else {
      throw new Error('Invalid data source configuration');
    }
  }
  
  /**
   * 处理搜索结果
   */
  handleSearchResults(results, query) {
    // 验证查询是否仍然有效（防止过期的异步结果）
    if (query !== this.currentQuery) {
      return;
    }
    
    this.suggestions = Array.isArray(results) ? results : [];
    this.selectedIndex = -1;
    
    if (this.suggestions.length > 0) {
      this.renderSuggestions();
      this.showSuggestions();
      this.announceResults();
    } else {
      this.hideSuggestions();
    }
  }
  
  /**
   * 处理搜索错误
   */
  handleSearchError(error) {
    this.suggestions = [];
    this.hideSuggestions();
    
    if (this.options.onError) {
      this.options.onError(error);
    }
  }
  
  // ==========================================================================
  // 建议渲染和显示
  // ==========================================================================
  
  /**
   * 渲染建议列表
   */
  renderSuggestions() {
    this.suggestionsContainer.innerHTML = '';
    
    this.suggestions.forEach((suggestion, index) => {
      const element = this.createSuggestionElement(suggestion, index);
      this.suggestionsContainer.appendChild(element);
    });
  }
  
  /**
   * 创建建议元素
   */
  createSuggestionElement(suggestion, index) {
    const element = document.createElement('div');
    element.className = this.options.suggestionClass;
    element.dataset.index = index.toString();
    element.setAttribute('role', 'option');
    element.setAttribute('aria-selected', 'false');
    
    // 获取显示文本
    const displayText = this.getDisplayText(suggestion);
    
    // 高亮匹配文本
    const highlightedText = this.options.highlightMatches 
      ? this.highlightMatches(displayText, this.currentQuery)
      : this.escapeHtml(displayText);
    
    // 创建内容
    element.innerHTML = `
      <div class="autocomplete-suggestion-text">${highlightedText}</div>
      ${this.createSuggestionMeta(suggestion)}
    `;
    
    return element;
  }
  
  /**
   * 创建建议元数据
   */
  createSuggestionMeta(suggestion) {
    let meta = '';
    
    // 使用计数
    if (suggestion.usage_count) {
      meta += `<div class="autocomplete-suggestion-meta">使用次数: ${suggestion.usage_count}</div>`;
    }
    
    // 最后使用时间
    if (suggestion.last_used_at) {
      const lastUsed = new Date(suggestion.last_used_at);
      const timeAgo = this.getTimeAgo(lastUsed);
      meta += `<div class="autocomplete-suggestion-meta">最后使用: ${timeAgo}</div>`;
    }
    
    return meta;
  }
  
  /**
   * 显示建议列表
   */
  showSuggestions() {
    if (this.suggestions.length === 0) return;
    
    this.isOpen = true;
    this.suggestionsContainer.style.display = 'block';
    this.input.setAttribute('aria-expanded', 'true');
    
    // 设置位置
    this.positionSuggestions();
  }
  
  /**
   * 隐藏建议列表
   */
  hideSuggestions() {
    this.isOpen = false;
    this.selectedIndex = -1;
    this.suggestionsContainer.style.display = 'none';
    this.input.setAttribute('aria-expanded', 'false');
    
    // 清除选中状态
    this.clearSelection();
  }
  
  /**
   * 显示加载状态
   */
  showLoading() {
    this.loadingIndicator.style.display = 'block';
    this.input.classList.add('autocomplete-loading');
    
    // 设置加载超时
    this.loadingTimer = setTimeout(() => {
      this.hideLoading();
    }, 10000); // 10秒超时
  }
  
  /**
   * 隐藏加载状态
   */
  hideLoading() {
    this.loadingIndicator.style.display = 'none';
    this.input.classList.remove('autocomplete-loading');
    
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  }
  
  /**
   * 设置建议位置
   */
  positionSuggestions() {
    const inputRect = this.input.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // 基本定位
    this.suggestionsContainer.style.position = 'absolute';
    this.suggestionsContainer.style.top = `${this.input.offsetHeight}px`;
    this.suggestionsContainer.style.left = '0';
    this.suggestionsContainer.style.right = '0';
    this.suggestionsContainer.style.zIndex = '1000';
    
    // 检查是否需要向上显示
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    const suggestionsHeight = this.suggestionsContainer.offsetHeight || 200;
    
    if (spaceBelow < suggestionsHeight && spaceAbove > suggestionsHeight) {
      this.suggestionsContainer.style.top = `-${suggestionsHeight}px`;
      this.suggestionsContainer.classList.add('autocomplete-above');
    } else {
      this.suggestionsContainer.classList.remove('autocomplete-above');
    }
  }
  
  // ==========================================================================
  // 选择和导航
  // ==========================================================================
  
  /**
   * 选择下一个建议
   */
  selectNext() {
    const newIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
    this.setSelectedIndex(newIndex);
  }
  
  /**
   * 选择上一个建议
   */
  selectPrevious() {
    const newIndex = Math.max(this.selectedIndex - 1, -1);
    this.setSelectedIndex(newIndex);
  }
  
  /**
   * 设置选中索引
   */
  setSelectedIndex(index) {
    // 清除之前的选中状态
    this.clearSelection();
    
    this.selectedIndex = index;
    
    if (index >= 0 && index < this.suggestions.length) {
      const element = this.suggestionsContainer.children[index];
      if (element) {
        element.classList.add(this.options.selectedClass);
        element.setAttribute('aria-selected', 'true');
        
        // 滚动到可见区域
        this.scrollToSelected(element);
        
        // 更新输入框的aria-activedescendant
        this.input.setAttribute('aria-activedescendant', element.id || `suggestion-${index}`);
      }
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }
  
  /**
   * 清除选中状态
   */
  clearSelection() {
    const selected = this.suggestionsContainer.querySelector(`.${this.options.selectedClass}`);
    if (selected) {
      selected.classList.remove(this.options.selectedClass);
      selected.setAttribute('aria-selected', 'false');
    }
  }
  
  /**
   * 滚动到选中项
   */
  scrollToSelected(element) {
    const container = this.suggestionsContainer;
    const elementTop = element.offsetTop;
    const elementBottom = elementTop + element.offsetHeight;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    
    if (elementTop < containerTop) {
      container.scrollTop = elementTop;
    } else if (elementBottom > containerBottom) {
      container.scrollTop = elementBottom - container.clientHeight;
    }
  }
  
  /**
   * 选择建议
   */
  async selectSuggestion(suggestion) {
    // 设置输入框值
    const value = this.getValue(suggestion);
    this.input.value = value;
    
    // 隐藏建议
    this.hideSuggestions();
    
    // 更新使用计数
    await this.updateUsageCount(suggestion);
    
    // 调用选择回调
    if (this.options.onSelect) {
      this.options.onSelect(suggestion, value);
    }
    
    // 触发input事件
    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 聚焦输入框
    this.input.focus();
  }
  
  // ==========================================================================
  // 缓存管理
  // ==========================================================================
  
  /**
   * 从缓存获取结果
   */
  getFromCache(query) {
    const cacheKey = query.toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
      return cached.data;
    }
    
    return null;
  }
  
  /**
   * 添加到缓存
   */
  addToCache(query, data) {
    const cacheKey = query.toLowerCase();
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    
    // 限制缓存大小
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
  
  // ==========================================================================
  // 使用计数管理
  // ==========================================================================
  
  /**
   * 更新使用计数
   */
  async updateUsageCount(suggestion) {
    try {
      // 如果有API客户端，调用更新接口
      if (typeof MerchantAPI !== 'undefined') {
        const api = new MerchantAPI();
        const agentName = suggestion.agent_name || suggestion.name;
        if (agentName) {
          await api.updateSuggestionUsage(agentName);
        }
      }
      
      // 更新本地缓存中的计数
      if (suggestion.usage_count !== undefined) {
        suggestion.usage_count += 1;
        suggestion.last_used_at = new Date().toISOString();
      }
      
    } catch (error) {
      console.warn('Failed to update usage count:', error);
      // 静默失败，不影响用户体验
    }
  }
  
  // ==========================================================================
  // 工具方法
  // ==========================================================================
  
  /**
   * 获取显示文本
   */
  getDisplayText(suggestion) {
    if (typeof suggestion === 'string') {
      return suggestion;
    }
    
    return suggestion[this.options.displayProperty] || suggestion.name || suggestion.text || '';
  }
  
  /**
   * 获取值
   */
  getValue(suggestion) {
    if (typeof suggestion === 'string') {
      return suggestion;
    }
    
    return suggestion[this.options.valueProperty] || suggestion.value || this.getDisplayText(suggestion);
  }
  
  /**
   * 高亮匹配文本
   */
  highlightMatches(text, query) {
    if (!query) return this.escapeHtml(text);
    
    const escapedText = this.escapeHtml(text);
    const escapedQuery = this.escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return escapedText.replace(regex, '<mark>$1</mark>');
  }
  
  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * 获取相对时间
   */
  getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  }
  
  /**
   * 宣布搜索结果（屏幕阅读器）
   */
  announceResults() {
    if (!this.options.announceResults) return;
    
    const count = this.suggestions.length;
    const message = count > 0 
      ? `找到 ${count} 个建议` 
      : '没有找到匹配的建议';
    
    this.announceToScreenReader(message);
  }
  
  /**
   * 向屏幕阅读器宣布消息
   */
  announceToScreenReader(message) {
    // 创建临时的aria-live区域
    let announcer = document.getElementById('autocomplete-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'autocomplete-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
    }
    
    announcer.textContent = message;
  }
  
  // ==========================================================================
  // 公共API
  // ==========================================================================
  
  /**
   * 销毁组件
   */
  destroy() {
    // 清除定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }
    
    // 移除事件监听器
    this.input.removeEventListener('input', this.handleInput);
    this.input.removeEventListener('focus', this.handleFocus);
    this.input.removeEventListener('blur', this.handleBlur);
    this.input.removeEventListener('keydown', this.handleKeydown);
    
    // 恢复DOM结构
    const parent = this.container.parentNode;
    parent.insertBefore(this.input, this.container);
    parent.removeChild(this.container);
    
    // 清理ARIA属性
    this.input.removeAttribute('role');
    this.input.removeAttribute('aria-expanded');
    this.input.removeAttribute('aria-autocomplete');
    this.input.removeAttribute('aria-haspopup');
    this.input.removeAttribute('aria-owns');
    this.input.removeAttribute('aria-activedescendant');
    
    // 清除缓存
    this.clearCache();
  }
  
  /**
   * 更新选项
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
  
  /**
   * 手动触发搜索
   */
  triggerSearch(query = null) {
    const searchQuery = query || this.input.value.trim();
    if (searchQuery.length >= this.options.minLength) {
      this.search(searchQuery);
    }
  }
  
  /**
   * 获取当前建议
   */
  getSuggestions() {
    return [...this.suggestions];
  }
  
  /**
   * 检查是否打开
   */
  isOpened() {
    return this.isOpen;
  }
}

// ==========================================================================
// 导出
// ==========================================================================

// 全局暴露
if (typeof window !== 'undefined') {
  window.AutocompleteComponent = AutocompleteComponent;
}

// ES6模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutocompleteComponent;
}
/**
 * 加载和骨架屏组件
 * 提供多种加载动画和骨架屏占位符
 */
class LoadingComponent {
  constructor() {
    this.activeLoaders = new Map();
    this.globalLoadingCount = 0;
  }

  // 创建旋转器加载
  createSpinner(size = 'md', color = null) {
    const spinner = document.createElement('div');
    spinner.className = `loading-spinner ${size}`;
    
    if (color) {
      spinner.style.borderTopColor = color;
    }
    
    return spinner;
  }

  // 创建脉冲加载
  createPulse(size = 'md', color = null) {
    const pulse = document.createElement('div');
    pulse.className = `loading-pulse ${size}`;
    
    if (color) {
      pulse.style.backgroundColor = color;
    }
    
    return pulse;
  }

  // 创建点状加载
  createDots(size = 'md', color = null) {
    const dots = document.createElement('div');
    dots.className = `loading-dots ${size}`;
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      if (color) {
        dot.style.backgroundColor = color;
      }
      dots.appendChild(dot);
    }
    
    return dots;
  }

  // 创建波浪加载
  createWave(size = 'md', color = null) {
    const wave = document.createElement('div');
    wave.className = `loading-wave ${size}`;
    
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('span');
      if (color) {
        bar.style.backgroundColor = color;
      }
      wave.appendChild(bar);
    }
    
    return wave;
  }

  // 创建进度条
  createProgress(size = 'md', determinate = false, value = 0) {
    const progress = document.createElement('div');
    progress.className = `loading-progress ${size}`;
    
    if (determinate) {
      progress.classList.add('determinate');
    }
    
    const bar = document.createElement('div');
    bar.className = 'loading-progress-bar';
    
    if (determinate) {
      bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
    
    progress.appendChild(bar);
    return progress;
  }

  // 更新进度条值
  updateProgress(progressElement, value) {
    const bar = progressElement.querySelector('.loading-progress-bar');
    if (bar && progressElement.classList.contains('determinate')) {
      bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
  }

  // 创建加载容器
  createContainer(type = 'spinner', options = {}) {
    const {
      size = 'md',
      text = '加载中...',
      inline = false,
      overlay = false,
      fullscreen = false,
      color = null
    } = options;

    const container = document.createElement('div');
    let className = 'loading-container';
    
    if (inline) className += ' inline';
    if (overlay) className += ' overlay';
    if (fullscreen) className += ' fullscreen';
    
    container.className = className;

    // 创建加载动画
    let loader;
    switch (type) {
      case 'pulse':
        loader = this.createPulse(size, color);
        break;
      case 'dots':
        loader = this.createDots(size, color);
        break;
      case 'wave':
        loader = this.createWave(size, color);
        break;
      case 'progress':
        loader = this.createProgress(size, options.determinate, options.value);
        break;
      default:
        loader = this.createSpinner(size, color);
    }

    container.appendChild(loader);

    // 添加文本
    if (text && !inline) {
      const textElement = document.createElement('span');
      textElement.textContent = text;
      container.appendChild(textElement);
    }

    return container;
  }

  // 显示加载状态
  show(target, options = {}) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return null;

    const loaderId = this.generateId();
    const loader = this.createContainer(options.type, {
      ...options,
      overlay: true
    });

    loader.setAttribute('data-loader-id', loaderId);
    targetElement.style.position = 'relative';
    targetElement.appendChild(loader);

    this.activeLoaders.set(loaderId, {
      element: loader,
      target: targetElement
    });

    return loaderId;
  }

  // 隐藏加载状态
  hide(loaderId) {
    const loader = this.activeLoaders.get(loaderId);
    if (loader) {
      loader.element.remove();
      this.activeLoaders.delete(loaderId);
    }
  }

  // 显示全局加载
  showGlobal(options = {}) {
    if (this.globalLoadingCount === 0) {
      const loader = this.createContainer(options.type, {
        ...options,
        fullscreen: true,
        text: options.text || '加载中，请稍候...'
      });

      loader.setAttribute('data-global-loader', 'true');
      document.body.appendChild(loader);
    }
    
    this.globalLoadingCount++;
    return 'global';
  }

  // 隐藏全局加载
  hideGlobal() {
    this.globalLoadingCount = Math.max(0, this.globalLoadingCount - 1);
    
    if (this.globalLoadingCount === 0) {
      const globalLoader = document.querySelector('[data-global-loader="true"]');
      if (globalLoader) {
        globalLoader.remove();
      }
    }
  }

  // 生成唯一ID
  generateId() {
    return 'loader_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

/**
 * 骨架屏组件
 */
class SkeletonComponent {
  constructor() {
    this.templates = new Map();
  }

  // 创建文本骨架
  createText(options = {}) {
    const { width = '100%', height = '1em', size = 'md', lines = 1 } = options;
    
    if (lines === 1) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton skeleton-text ${size}`;
      skeleton.style.width = width;
      skeleton.style.height = height;
      return skeleton;
    }

    // 多行文本
    const container = document.createElement('div');
    container.className = 'skeleton-paragraph';
    
    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div');
      line.className = `skeleton skeleton-text ${size}`;
      
      // 最后一行通常较短
      if (i === lines - 1 && lines > 1) {
        line.style.width = '60%';
      }
      
      container.appendChild(line);
    }
    
    return container;
  }

  // 创建标题骨架
  createTitle(options = {}) {
    const { width = '60%', size = 'lg' } = options;
    
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-title ${size}`;
    skeleton.style.width = width;
    
    return skeleton;
  }

  // 创建头像骨架
  createAvatar(options = {}) {
    const { size = 'md' } = options;
    
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-avatar ${size}`;
    
    return skeleton;
  }

  // 创建图片骨架
  createImage(options = {}) {
    const { width = '100%', height = '200px', size = 'md' } = options;
    
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-image ${size}`;
    skeleton.style.width = width;
    skeleton.style.height = height;
    
    return skeleton;
  }

  // 创建按钮骨架
  createButton(options = {}) {
    const { width = '80px', size = 'md' } = options;
    
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-button ${size}`;
    skeleton.style.width = width;
    
    return skeleton;
  }

  // 创建卡片骨架
  createCard(options = {}) {
    const {
      showAvatar = true,
      showTitle = true,
      textLines = 3,
      showActions = true,
      size = 'md'
    } = options;

    const card = document.createElement('div');
    card.className = 'skeleton-card';

    // 卡片头部
    if (showAvatar || showTitle) {
      const header = document.createElement('div');
      header.className = 'skeleton-card-header';

      if (showAvatar) {
        header.appendChild(this.createAvatar({ size }));
      }

      if (showTitle) {
        const titleContainer = document.createElement('div');
        titleContainer.style.flex = '1';
        titleContainer.appendChild(this.createTitle({ size }));
        titleContainer.appendChild(this.createText({ width: '40%', size: 'sm' }));
        header.appendChild(titleContainer);
      }

      card.appendChild(header);
    }

    // 卡片内容
    if (textLines > 0) {
      const content = document.createElement('div');
      content.className = 'skeleton-card-content';
      content.appendChild(this.createText({ lines: textLines, size }));
      card.appendChild(content);
    }

    // 卡片操作
    if (showActions) {
      const actions = document.createElement('div');
      actions.className = 'skeleton-card-actions';
      actions.appendChild(this.createButton({ size }));
      actions.appendChild(this.createButton({ width: '60px', size }));
      card.appendChild(actions);
    }

    return card;
  }

  // 创建表格骨架
  createTable(options = {}) {
    const { rows = 5, columns = 4, showHeader = true } = options;

    const table = document.createElement('table');
    table.className = 'skeleton-table';

    // 表头
    if (showHeader) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      for (let i = 0; i < columns; i++) {
        const th = document.createElement('th');
        th.appendChild(this.createText({ width: '80%' }));
        headerRow.appendChild(th);
      }
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    // 表体
    const tbody = document.createElement('tbody');
    
    for (let i = 0; i < rows; i++) {
      const row = document.createElement('tr');
      
      for (let j = 0; j < columns; j++) {
        const td = document.createElement('td');
        td.appendChild(this.createText({ width: '90%' }));
        row.appendChild(td);
      }
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    return table;
  }

  // 创建列表骨架
  createList(options = {}) {
    const { items = 5, showAvatar = true, textLines = 2, size = 'md' } = options;

    const list = document.createElement('div');
    list.className = 'skeleton-list';

    for (let i = 0; i < items; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-list-item';

      if (showAvatar) {
        item.appendChild(this.createAvatar({ size }));
      }

      const content = document.createElement('div');
      content.className = 'skeleton-list-content';
      content.appendChild(this.createText({ lines: textLines, size }));
      item.appendChild(content);

      list.appendChild(item);
    }

    return list;
  }

  // 显示骨架屏
  show(target, template, options = {}) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return null;

    const skeletonId = this.generateId();
    let skeleton;

    switch (template) {
      case 'text':
        skeleton = this.createText(options);
        break;
      case 'title':
        skeleton = this.createTitle(options);
        break;
      case 'avatar':
        skeleton = this.createAvatar(options);
        break;
      case 'image':
        skeleton = this.createImage(options);
        break;
      case 'button':
        skeleton = this.createButton(options);
        break;
      case 'card':
        skeleton = this.createCard(options);
        break;
      case 'table':
        skeleton = this.createTable(options);
        break;
      case 'list':
        skeleton = this.createList(options);
        break;
      default:
        skeleton = this.createText(options);
    }

    skeleton.setAttribute('data-skeleton-id', skeletonId);
    
    // 保存原始内容
    const originalContent = targetElement.innerHTML;
    targetElement.innerHTML = '';
    targetElement.appendChild(skeleton);

    this.templates.set(skeletonId, {
      element: skeleton,
      target: targetElement,
      originalContent
    });

    return skeletonId;
  }

  // 隐藏骨架屏
  hide(skeletonId) {
    const template = this.templates.get(skeletonId);
    if (template) {
      template.target.innerHTML = template.originalContent;
      this.templates.delete(skeletonId);
    }
  }

  // 生成唯一ID
  generateId() {
    return 'skeleton_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

/**
 * 全局加载状态管理器
 */
class LoadingManager {
  constructor() {
    this.loading = new LoadingComponent();
    this.skeleton = new SkeletonComponent();
    this.states = new Map();
  }

  // 显示加载状态
  showLoading(target, options = {}) {
    const key = typeof target === 'string' ? target : target.id || this.generateKey();
    
    if (this.states.has(key)) {
      this.hideLoading(key);
    }

    const loaderId = this.loading.show(target, options);
    this.states.set(key, { type: 'loading', id: loaderId });
    
    return key;
  }

  // 显示骨架屏
  showSkeleton(target, template = 'text', options = {}) {
    const key = typeof target === 'string' ? target : target.id || this.generateKey();
    
    if (this.states.has(key)) {
      this.hideSkeleton(key);
    }

    const skeletonId = this.skeleton.show(target, template, options);
    this.states.set(key, { type: 'skeleton', id: skeletonId });
    
    return key;
  }

  // 隐藏加载状态
  hideLoading(key) {
    const state = this.states.get(key);
    if (state && state.type === 'loading') {
      this.loading.hide(state.id);
      this.states.delete(key);
    }
  }

  // 隐藏骨架屏
  hideSkeleton(key) {
    const state = this.states.get(key);
    if (state && state.type === 'skeleton') {
      this.skeleton.hide(state.id);
      this.states.delete(key);
    }
  }

  // 隐藏任何状态
  hide(key) {
    const state = this.states.get(key);
    if (state) {
      if (state.type === 'loading') {
        this.loading.hide(state.id);
      } else if (state.type === 'skeleton') {
        this.skeleton.hide(state.id);
      }
      this.states.delete(key);
    }
  }

  // 全局加载
  showGlobalLoading(options = {}) {
    return this.loading.showGlobal(options);
  }

  hideGlobalLoading() {
    this.loading.hideGlobal();
  }

  // 生成键
  generateKey() {
    return 'state_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 清理所有状态
  clear() {
    for (const [key, state] of this.states) {
      if (state.type === 'loading') {
        this.loading.hide(state.id);
      } else if (state.type === 'skeleton') {
        this.skeleton.hide(state.id);
      }
    }
    this.states.clear();
  }
}

// 创建全局实例
const loadingManager = new LoadingManager();

// 全局函数
window.showLoading = (target, options) => loadingManager.showLoading(target, options);
window.showSkeleton = (target, template, options) => loadingManager.showSkeleton(target, template, options);
window.hideLoading = (key) => loadingManager.hideLoading(key);
window.hideSkeleton = (key) => loadingManager.hideSkeleton(key);
window.hideLoadingState = (key) => loadingManager.hide(key);
window.showGlobalLoading = (options) => loadingManager.showGlobalLoading(options);
window.hideGlobalLoading = () => loadingManager.hideGlobalLoading();

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LoadingComponent, SkeletonComponent, LoadingManager };
}
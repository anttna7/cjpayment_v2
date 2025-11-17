/**
 * CJPayment Chart Component System
 * Modern chart wrapper with theme support and interactive features
 * Supports Chart.js with unified interface and theme adaptation
 */

class ChartComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = this.mergeOptions(options);
    this.chart = null;
    this.themeObserver = null;
    
    if (!this.container) {
      throw new Error('Chart container not found');
    }
    
    this.init();
  }
  
  /**
   * Initialize the chart component
   */
  init() {
    this.createChartContainer();
    this.setupThemeObserver();
    this.loadChartLibrary().then(() => {
      this.createChart();
    });
  }
  
  /**
   * Create the chart container structure
   */
  createChartContainer() {
    this.container.classList.add('chart-container');
    
    // Create wrapper structure
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', this.options.title || 'Chart');
    
    // Create loading state
    const loading = document.createElement('div');
    loading.className = 'chart-loading';
    loading.innerHTML = `
      <div class="loading-spinner"></div>
      <span class="loading-text">加载图表中...</span>
    `;
    
    // Create error state
    const error = document.createElement('div');
    error.className = 'chart-error hidden';
    error.innerHTML = `
      <div class="error-icon">⚠️</div>
      <span class="error-text">图表加载失败</span>
      <button class="error-retry btn btn-sm btn-outline">重试</button>
    `;
    
    // Create legend container if needed
    if (this.options.legend && this.options.legend.external) {
      const legend = document.createElement('div');
      legend.className = 'chart-legend';
      wrapper.appendChild(legend);
    }
    
    wrapper.appendChild(canvas);
    wrapper.appendChild(loading);
    wrapper.appendChild(error);
    
    this.container.appendChild(wrapper);
    
    // Store references
    this.canvas = canvas;
    this.loadingElement = loading;
    this.errorElement = error;
    
    // Setup error retry
    const retryButton = error.querySelector('.error-retry');
    retryButton.addEventListener('click', () => this.retry());
  }
  
  /**
   * Load Chart.js library dynamically
   */
  async loadChartLibrary() {
    if (window.Chart) {
      return Promise.resolve();
    }
    
    try {
      // Load Chart.js from CDN
      await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js');
      
      // Load additional plugins if needed
      if (this.options.plugins && this.options.plugins.includes('datalabels')) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js');
      }
      
      if (this.options.plugins && this.options.plugins.includes('annotation')) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js');
      }
      
    } catch (error) {
      console.error('Failed to load Chart.js:', error);
      this.showError('图表库加载失败');
      throw error;
    }
  }
  
  /**
   * Load external script
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Create the actual chart
   */
  createChart() {
    try {
      this.hideLoading();
      
      const ctx = this.canvas.getContext('2d');
      const config = this.buildChartConfig();
      
      this.chart = new Chart(ctx, config);
      
      // Setup interactions
      this.setupInteractions();
      
      // Trigger ready event
      this.container.dispatchEvent(new CustomEvent('chart:ready', {
        detail: { chart: this.chart, component: this }
      }));
      
    } catch (error) {
      console.error('Failed to create chart:', error);
      this.showError('图表创建失败');
    }
  }
  
  /**
   * Build Chart.js configuration with theme support
   */
  buildChartConfig() {
    const theme = this.getCurrentTheme();
    const themeColors = this.getThemeColors(theme);
    
    const config = {
      type: this.options.type || 'line',
      data: this.processData(this.options.data),
      options: {
        responsive: true,
        maintainAspectRatio: this.options.maintainAspectRatio !== false,
        aspectRatio: this.options.aspectRatio || 2,
        
        // Theme-aware styling
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        color: themeColors.text,
        
        // Plugins configuration
        plugins: {
          title: {
            display: !!this.options.title,
            text: this.options.title,
            color: themeColors.text,
            font: {
              size: 16,
              weight: 'bold'
            },
            padding: 20
          },
          
          legend: {
            display: this.options.legend !== false,
            position: this.options.legend?.position || 'top',
            labels: {
              color: themeColors.text,
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          
          tooltip: {
            enabled: this.options.tooltip !== false,
            backgroundColor: themeColors.tooltipBackground,
            titleColor: themeColors.text,
            bodyColor: themeColors.text,
            borderColor: themeColors.border,
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: this.options.tooltipCallbacks || {}
          }
        },
        
        // Scales configuration
        scales: this.buildScalesConfig(themeColors),
        
        // Animation
        animation: {
          duration: this.options.animation?.duration || 750,
          easing: this.options.animation?.easing || 'easeInOutQuart'
        },
        
        // Interaction
        interaction: {
          intersect: false,
          mode: 'index'
        },
        
        // Custom options
        ...this.options.chartOptions
      }
    };
    
    return config;
  }
  
  /**
   * Build scales configuration with theme colors
   */
  buildScalesConfig(themeColors) {
    const scales = {};
    
    if (this.options.type !== 'pie' && this.options.type !== 'doughnut') {
      scales.x = {
        display: true,
        grid: {
          color: themeColors.gridLines,
          borderColor: themeColors.border
        },
        ticks: {
          color: themeColors.text,
          font: {
            size: 11
          }
        },
        title: {
          display: !!this.options.xAxisTitle,
          text: this.options.xAxisTitle,
          color: themeColors.text,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      };
      
      scales.y = {
        display: true,
        grid: {
          color: themeColors.gridLines,
          borderColor: themeColors.border
        },
        ticks: {
          color: themeColors.text,
          font: {
            size: 11
          }
        },
        title: {
          display: !!this.options.yAxisTitle,
          text: this.options.yAxisTitle,
          color: themeColors.text,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      };
    }
    
    return scales;
  }
  
  /**
   * Process chart data with theme colors
   */
  processData(data) {
    if (!data) return { labels: [], datasets: [] };
    
    const theme = this.getCurrentTheme();
    const processedData = { ...data };
    
    // Apply theme colors to datasets
    if (processedData.datasets) {
      processedData.datasets = processedData.datasets.map((dataset, index) => {
        const colors = this.getDatasetColors(theme, index);
        
        return {
          ...dataset,
          backgroundColor: dataset.backgroundColor || colors.background,
          borderColor: dataset.borderColor || colors.border,
          pointBackgroundColor: dataset.pointBackgroundColor || colors.point,
          pointBorderColor: dataset.pointBorderColor || colors.pointBorder,
          borderWidth: dataset.borderWidth || 2,
          pointRadius: dataset.pointRadius || 4,
          pointHoverRadius: dataset.pointHoverRadius || 6,
          tension: dataset.tension || 0.4
        };
      });
    }
    
    return processedData;
  }
  
  /**
   * Get current theme
   */
  getCurrentTheme() {
    const html = document.documentElement;
    return html.getAttribute('data-theme') || 
           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  
  /**
   * Get theme-specific colors
   */
  getThemeColors(theme) {
    const isDark = theme === 'dark';
    const isHighContrast = theme === 'high-contrast';
    
    if (isHighContrast) {
      return {
        background: '#ffffff',
        text: '#000000',
        border: '#000000',
        gridLines: '#333333',
        tooltipBackground: '#ffffff'
      };
    }
    
    if (isDark) {
      return {
        background: 'var(--color-bg-surface, #171717)',
        text: 'var(--color-text-primary, #fafafa)',
        border: 'var(--color-border-primary, #404040)',
        gridLines: 'var(--color-border-secondary, #525252)',
        tooltipBackground: 'var(--color-bg-secondary, #262626)'
      };
    }
    
    return {
      background: 'var(--color-bg-surface, #ffffff)',
      text: 'var(--color-text-primary, #171717)',
      border: 'var(--color-border-primary, #e5e5e5)',
      gridLines: 'var(--color-border-secondary, #d4d4d4)',
      tooltipBackground: 'var(--color-bg-surface, #ffffff)'
    };
  }
  
  /**
   * Get dataset colors based on theme and index
   */
  getDatasetColors(theme, index) {
    const colorPalette = this.getColorPalette(theme);
    const colorIndex = index % colorPalette.length;
    const baseColor = colorPalette[colorIndex];
    
    return {
      background: this.addAlpha(baseColor, 0.2),
      border: baseColor,
      point: baseColor,
      pointBorder: '#ffffff'
    };
  }
  
  /**
   * Get color palette for theme
   */
  getColorPalette(theme) {
    const isDark = theme === 'dark';
    const isHighContrast = theme === 'high-contrast';
    
    if (isHighContrast) {
      return [
        '#0066cc', '#008800', '#cc6600', '#cc0000', 
        '#6600cc', '#00cc88', '#cc0066', '#0088cc'
      ];
    }
    
    if (isDark) {
      return [
        'var(--primary-400, #38bdf8)',
        'var(--success-400, #4ade80)',
        'var(--warning-400, #fbbf24)',
        'var(--error-400, #f87171)',
        'var(--info-400, #60a5fa)',
        '#a78bfa', '#fb7185', '#34d399'
      ];
    }
    
    return [
      'var(--primary-500, #0ea5e9)',
      'var(--success-500, #22c55e)',
      'var(--warning-500, #f59e0b)',
      'var(--error-500, #ef4444)',
      'var(--info-500, #3b82f6)',
      '#8b5cf6', '#ec4899', '#10b981'
    ];
  }
  
  /**
   * Add alpha transparency to color
   */
  addAlpha(color, alpha) {
    if (color.startsWith('var(')) {
      // For CSS variables, we'll use rgba with fallback
      return `rgba(${this.hexToRgb(color.split(',')[1]?.trim() || '#0ea5e9')}, ${alpha})`;
    }
    
    if (color.startsWith('#')) {
      const rgb = this.hexToRgb(color);
      return `rgba(${rgb}, ${alpha})`;
    }
    
    return color;
  }
  
  /**
   * Convert hex to RGB values
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      '14, 165, 233'; // fallback to primary-500
  }
  
  /**
   * Setup theme observer for automatic theme switching
   */
  setupThemeObserver() {
    // Watch for theme attribute changes
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          this.updateTheme();
        }
      });
    });
    
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    // Watch for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (!document.documentElement.getAttribute('data-theme')) {
          this.updateTheme();
        }
      });
    }
  }
  
  /**
   * Update chart theme
   */
  updateTheme() {
    if (!this.chart) return;
    
    const theme = this.getCurrentTheme();
    const themeColors = this.getThemeColors(theme);
    
    // Update chart options
    this.chart.options.plugins.title.color = themeColors.text;
    this.chart.options.plugins.legend.labels.color = themeColors.text;
    this.chart.options.plugins.tooltip.backgroundColor = themeColors.tooltipBackground;
    this.chart.options.plugins.tooltip.titleColor = themeColors.text;
    this.chart.options.plugins.tooltip.bodyColor = themeColors.text;
    this.chart.options.plugins.tooltip.borderColor = themeColors.border;
    
    // Update scales
    if (this.chart.options.scales.x) {
      this.chart.options.scales.x.grid.color = themeColors.gridLines;
      this.chart.options.scales.x.grid.borderColor = themeColors.border;
      this.chart.options.scales.x.ticks.color = themeColors.text;
      if (this.chart.options.scales.x.title) {
        this.chart.options.scales.x.title.color = themeColors.text;
      }
    }
    
    if (this.chart.options.scales.y) {
      this.chart.options.scales.y.grid.color = themeColors.gridLines;
      this.chart.options.scales.y.grid.borderColor = themeColors.border;
      this.chart.options.scales.y.ticks.color = themeColors.text;
      if (this.chart.options.scales.y.title) {
        this.chart.options.scales.y.title.color = themeColors.text;
      }
    }
    
    // Update dataset colors
    this.chart.data.datasets.forEach((dataset, index) => {
      const colors = this.getDatasetColors(theme, index);
      dataset.backgroundColor = colors.background;
      dataset.borderColor = colors.border;
      dataset.pointBackgroundColor = colors.point;
    });
    
    // Re-render chart
    this.chart.update('none');
  }
  
  /**
   * Setup chart interactions
   */
  setupInteractions() {
    if (!this.chart) return;
    
    // Custom click handler
    if (this.options.onClick) {
      this.canvas.addEventListener('click', (event) => {
        const points = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (points.length) {
          const point = points[0];
          const datasetIndex = point.datasetIndex;
          const index = point.index;
          const value = this.chart.data.datasets[datasetIndex].data[index];
          const label = this.chart.data.labels[index];
          
          this.options.onClick({
            datasetIndex,
            index,
            value,
            label,
            event,
            chart: this.chart
          });
        }
      });
    }
    
    // Custom hover handler
    if (this.options.onHover) {
      this.canvas.addEventListener('mousemove', (event) => {
        const points = this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        this.options.onHover({
          points,
          event,
          chart: this.chart
        });
      });
    }
    
    // Export functionality
    if (this.options.exportable) {
      this.addExportButton();
    }
  }
  
  /**
   * Add export button
   */
  addExportButton() {
    const exportBtn = document.createElement('button');
    exportBtn.className = 'chart-export-btn btn btn-sm btn-outline';
    exportBtn.innerHTML = '📊 导出';
    exportBtn.title = '导出图表';
    
    exportBtn.addEventListener('click', () => this.exportChart());
    
    this.container.querySelector('.chart-wrapper').appendChild(exportBtn);
  }
  
  /**
   * Export chart as image
   */
  exportChart(format = 'png') {
    if (!this.chart) return;
    
    const url = this.chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.${format}`;
    link.href = url;
    link.click();
  }
  
  /**
   * Update chart data
   */
  updateData(newData) {
    if (!this.chart) return;
    
    const processedData = this.processData(newData);
    this.chart.data = processedData;
    this.chart.update();
    
    // Trigger update event
    this.container.dispatchEvent(new CustomEvent('chart:updated', {
      detail: { data: newData, chart: this.chart }
    }));
  }
  
  /**
   * Add new data point
   */
  addData(label, data) {
    if (!this.chart) return;
    
    this.chart.data.labels.push(label);
    this.chart.data.datasets.forEach((dataset, index) => {
      dataset.data.push(data[index] || 0);
    });
    
    this.chart.update();
  }
  
  /**
   * Remove data point
   */
  removeData() {
    if (!this.chart) return;
    
    this.chart.data.labels.pop();
    this.chart.data.datasets.forEach((dataset) => {
      dataset.data.pop();
    });
    
    this.chart.update();
  }
  
  /**
   * Show loading state
   */
  showLoading() {
    this.loadingElement.classList.remove('hidden');
    this.errorElement.classList.add('hidden');
  }
  
  /**
   * Hide loading state
   */
  hideLoading() {
    this.loadingElement.classList.add('hidden');
  }
  
  /**
   * Show error state
   */
  showError(message) {
    this.loadingElement.classList.add('hidden');
    this.errorElement.classList.remove('hidden');
    this.errorElement.querySelector('.error-text').textContent = message;
  }
  
  /**
   * Retry chart creation
   */
  retry() {
    this.errorElement.classList.add('hidden');
    this.showLoading();
    
    setTimeout(() => {
      this.createChart();
    }, 500);
  }
  
  /**
   * Resize chart
   */
  resize() {
    if (this.chart) {
      this.chart.resize();
    }
  }
  
  /**
   * Destroy chart and cleanup
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    
    // Trigger destroy event
    this.container.dispatchEvent(new CustomEvent('chart:destroyed', {
      detail: { component: this }
    }));
  }
  
  /**
   * Merge default options with user options
   */
  mergeOptions(userOptions) {
    const defaultOptions = {
      type: 'line',
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      },
      legend: {
        position: 'top'
      },
      tooltip: true,
      exportable: false,
      plugins: []
    };
    
    return this.deepMerge(defaultOptions, userOptions);
  }
  
  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

/**
 * Chart Factory for creating different chart types
 */
class ChartFactory {
  /**
   * Create line chart
   */
  static createLineChart(container, data, options = {}) {
    return new ChartComponent(container, {
      type: 'line',
      data,
      ...options
    });
  }
  
  /**
   * Create bar chart
   */
  static createBarChart(container, data, options = {}) {
    return new ChartComponent(container, {
      type: 'bar',
      data,
      ...options
    });
  }
  
  /**
   * Create pie chart
   */
  static createPieChart(container, data, options = {}) {
    return new ChartComponent(container, {
      type: 'pie',
      data,
      ...options
    });
  }
  
  /**
   * Create doughnut chart
   */
  static createDoughnutChart(container, data, options = {}) {
    return new ChartComponent(container, {
      type: 'doughnut',
      data,
      ...options
    });
  }
  
  /**
   * Create area chart
   */
  static createAreaChart(container, data, options = {}) {
    const processedData = {
      ...data,
      datasets: data.datasets.map(dataset => ({
        ...dataset,
        fill: true,
        backgroundColor: dataset.backgroundColor || 'rgba(14, 165, 233, 0.1)',
        borderColor: dataset.borderColor || 'rgba(14, 165, 233, 1)'
      }))
    };
    
    return new ChartComponent(container, {
      type: 'line',
      data: processedData,
      ...options
    });
  }
  
  /**
   * Create scatter chart
   */
  static createScatterChart(container, data, options = {}) {
    return new ChartComponent(container, {
      type: 'scatter',
      data,
      ...options
    });
  }
}

/**
 * Chart Manager for handling multiple charts
 */
class ChartManager {
  constructor() {
    this.charts = new Map();
    this.setupGlobalListeners();
  }
  
  /**
   * Register a chart
   */
  register(id, chart) {
    this.charts.set(id, chart);
  }
  
  /**
   * Get chart by ID
   */
  get(id) {
    return this.charts.get(id);
  }
  
  /**
   * Remove chart
   */
  remove(id) {
    const chart = this.charts.get(id);
    if (chart) {
      chart.destroy();
      this.charts.delete(id);
    }
  }
  
  /**
   * Update all charts theme
   */
  updateAllThemes() {
    this.charts.forEach(chart => {
      chart.updateTheme();
    });
  }
  
  /**
   * Resize all charts
   */
  resizeAll() {
    this.charts.forEach(chart => {
      chart.resize();
    });
  }
  
  /**
   * Destroy all charts
   */
  destroyAll() {
    this.charts.forEach(chart => {
      chart.destroy();
    });
    this.charts.clear();
  }
  
  /**
   * Setup global event listeners
   */
  setupGlobalListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeAll();
    });
    
    // Handle theme changes
    document.addEventListener('theme:changed', () => {
      this.updateAllThemes();
    });
  }
}

// Global chart manager instance
window.ChartManager = new ChartManager();

// Export classes
window.ChartComponent = ChartComponent;
window.ChartFactory = ChartFactory;

// Auto-initialize charts with data attributes
document.addEventListener('DOMContentLoaded', () => {
  const chartElements = document.querySelectorAll('[data-chart]');
  
  chartElements.forEach((element, index) => {
    try {
      const config = JSON.parse(element.getAttribute('data-chart-config') || '{}');
      const data = JSON.parse(element.getAttribute('data-chart-data') || '{}');
      const type = element.getAttribute('data-chart') || 'line';
      
      const chart = new ChartComponent(element, {
        type,
        data,
        ...config
      });
      
      // Register with manager
      const id = element.id || `chart-${index}`;
      window.ChartManager.register(id, chart);
      
    } catch (error) {
      console.error('Failed to initialize chart:', error);
    }
  });
});
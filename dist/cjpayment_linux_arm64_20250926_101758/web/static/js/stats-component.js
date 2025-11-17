/**
 * CJPayment Statistics Component System
 * Modern statistics cards and indicators with animations and real-time updates
 */

class StatsComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = this.mergeOptions(options);
    this.currentValue = 0;
    this.targetValue = 0;
    this.animationFrame = null;
    
    if (!this.container) {
      throw new Error('Stats container not found');
    }
    
    this.init();
  }
  
  /**
   * Initialize the stats component
   */
  init() {
    this.createStatsStructure();
    this.setupEventListeners();
    this.setValue(this.options.value || 0);
  }
  
  /**
   * Create the stats component structure
   */
  createStatsStructure() {
    this.container.classList.add('stats-component');
    
    // Add type-specific classes
    if (this.options.type) {
      this.container.classList.add(`stats-${this.options.type}`);
    }
    
    // Create the HTML structure
    this.container.innerHTML = `
      <div class="stats-content">
        ${this.options.icon ? `<div class="stats-icon">${this.options.icon}</div>` : ''}
        <div class="stats-main">
          <div class="stats-value" aria-live="polite">
            ${this.options.prefix || ''}
            <span class="stats-number">0</span>
            ${this.options.suffix || ''}
          </div>
          <div class="stats-label">${this.options.label || ''}</div>
          ${this.options.description ? `<div class="stats-description">${this.options.description}</div>` : ''}
        </div>
        ${this.createTrendIndicator()}
        ${this.createProgressIndicator()}
      </div>
      ${this.options.chart ? '<div class="stats-chart"></div>' : ''}
    `;
    
    // Store references to key elements
    this.valueElement = this.container.querySelector('.stats-number');
    this.trendElement = this.container.querySelector('.stats-trend');
    this.progressElement = this.container.querySelector('.stats-progress-fill');
    this.chartElement = this.container.querySelector('.stats-chart');
  }
  
  /**
   * Create trend indicator
   */
  createTrendIndicator() {
    if (!this.options.trend) return '';
    
    const { value, type } = this.options.trend;
    const isPositive = type === 'up' || (type === 'auto' && value > 0);
    const isNegative = type === 'down' || (type === 'auto' && value < 0);
    
    const trendClass = isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral';
    const trendIcon = isPositive ? '↗️' : isNegative ? '↘️' : '➡️';
    
    return `
      <div class="stats-trend ${trendClass}">
        <span class="trend-icon">${trendIcon}</span>
        <span class="trend-value">${Math.abs(value)}%</span>
        <span class="trend-label">${this.options.trend.label || '较上期'}</span>
      </div>
    `;
  }
  
  /**
   * Create progress indicator
   */
  createProgressIndicator() {
    if (!this.options.progress) return '';
    
    const { value, max, showPercentage } = this.options.progress;
    const percentage = Math.min((value / max) * 100, 100);
    
    return `
      <div class="stats-progress">
        <div class="stats-progress-bar">
          <div class="stats-progress-fill" style="width: ${percentage}%"></div>
        </div>
        ${showPercentage ? `<div class="stats-progress-text">${Math.round(percentage)}%</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Set the stats value with animation
   */
  setValue(newValue, animate = true) {
    this.targetValue = newValue;
    
    if (!animate) {
      this.currentValue = newValue;
      this.updateDisplay();
      return;
    }
    
    this.animateValue();
  }
  
  /**
   * Animate value change
   */
  animateValue() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    const startValue = this.currentValue;
    const endValue = this.targetValue;
    const duration = this.options.animationDuration || 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function
      const easedProgress = this.easeOutQuart(progress);
      
      this.currentValue = startValue + (endValue - startValue) * easedProgress;
      this.updateDisplay();
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
        this.onAnimationComplete();
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  /**
   * Easing function for smooth animation
   */
  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  
  /**
   * Update the display with current value
   */
  updateDisplay() {
    if (!this.valueElement) return;
    
    const displayValue = this.formatValue(this.currentValue);
    this.valueElement.textContent = displayValue;
    
    // Update progress if exists
    if (this.progressElement && this.options.progress) {
      const percentage = Math.min((this.currentValue / this.options.progress.max) * 100, 100);
      this.progressElement.style.width = `${percentage}%`;
      
      const progressText = this.container.querySelector('.stats-progress-text');
      if (progressText) {
        progressText.textContent = `${Math.round(percentage)}%`;
      }
    }
  }
  
  /**
   * Format value for display
   */
  formatValue(value) {
    const { format, decimals = 0 } = this.options;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        
      case 'percentage':
        return `${value.toFixed(decimals)}%`;
        
      case 'number':
        return new Intl.NumberFormat('zh-CN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        
      case 'compact':
        return new Intl.NumberFormat('zh-CN', {
          notation: 'compact',
          compactDisplay: 'short'
        }).format(value);
        
      default:
        return Math.round(value).toLocaleString('zh-CN');
    }
  }
  
  /**
   * Update trend indicator
   */
  updateTrend(trendData) {
    if (!this.trendElement) return;
    
    const { value, type } = trendData;
    const isPositive = type === 'up' || (type === 'auto' && value > 0);
    const isNegative = type === 'down' || (type === 'auto' && value < 0);
    
    // Update classes
    this.trendElement.className = 'stats-trend';
    if (isPositive) this.trendElement.classList.add('trend-up');
    else if (isNegative) this.trendElement.classList.add('trend-down');
    else this.trendElement.classList.add('trend-neutral');
    
    // Update content
    const trendIcon = isPositive ? '↗️' : isNegative ? '↘️' : '➡️';
    this.trendElement.querySelector('.trend-icon').textContent = trendIcon;
    this.trendElement.querySelector('.trend-value').textContent = `${Math.abs(value)}%`;
  }
  
  /**
   * Update progress indicator
   */
  updateProgress(progressData) {
    if (!this.progressElement) return;
    
    const { value, max } = progressData;
    const percentage = Math.min((value / max) * 100, 100);
    
    this.progressElement.style.width = `${percentage}%`;
    
    const progressText = this.container.querySelector('.stats-progress-text');
    if (progressText) {
      progressText.textContent = `${Math.round(percentage)}%`;
    }
  }
  
  /**
   * Add mini chart to stats card
   */
  addChart(chartData, chartOptions = {}) {
    if (!this.chartElement) return;
    
    // Create mini chart using Chart.js
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 40;
    this.chartElement.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Simple line chart for trends
    if (window.Chart) {
      new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          elements: {
            point: { radius: 0 },
            line: { 
              borderWidth: 2,
              tension: 0.4
            }
          },
          ...chartOptions
        }
      });
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Click handler for interactive stats
    if (this.options.onClick) {
      this.container.addEventListener('click', (event) => {
        this.options.onClick(event, this);
      });
      this.container.style.cursor = 'pointer';
    }
    
    // Hover effects
    if (this.options.interactive) {
      this.container.addEventListener('mouseenter', () => {
        this.container.classList.add('stats-hover');
      });
      
      this.container.addEventListener('mouseleave', () => {
        this.container.classList.remove('stats-hover');
      });
    }
  }
  
  /**
   * Animation complete callback
   */
  onAnimationComplete() {
    this.container.dispatchEvent(new CustomEvent('stats:animationComplete', {
      detail: { value: this.currentValue, component: this }
    }));
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.container.dispatchEvent(new CustomEvent('stats:destroyed', {
      detail: { component: this }
    }));
  }
  
  /**
   * Merge default options with user options
   */
  mergeOptions(userOptions) {
    const defaultOptions = {
      value: 0,
      format: 'number',
      decimals: 0,
      animationDuration: 1000,
      interactive: false,
      type: 'default'
    };
    
    return { ...defaultOptions, ...userOptions };
  }
}

/**
 * Circular Progress Component
 */
class CircularProgress {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = { ...this.defaultOptions(), ...options };
    this.currentProgress = 0;
    
    if (!this.container) {
      throw new Error('Circular progress container not found');
    }
    
    this.init();
  }
  
  defaultOptions() {
    return {
      size: 120,
      strokeWidth: 8,
      progress: 0,
      max: 100,
      color: 'var(--primary-500, #0ea5e9)',
      backgroundColor: 'var(--neutral-200, #e5e5e5)',
      showPercentage: true,
      showLabel: true,
      label: '',
      animationDuration: 1000
    };
  }
  
  init() {
    this.createSVG();
    this.setProgress(this.options.progress);
  }
  
  createSVG() {
    const { size, strokeWidth } = this.options;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    this.container.innerHTML = `
      <div class="circular-progress" style="width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" class="circular-progress-svg">
          <circle
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
            stroke="${this.options.backgroundColor}"
            stroke-width="${strokeWidth}"
            fill="none"
            class="circular-progress-bg"
          />
          <circle
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
            stroke="${this.options.color}"
            stroke-width="${strokeWidth}"
            fill="none"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            class="circular-progress-fill"
            transform="rotate(-90 ${size / 2} ${size / 2})"
          />
        </svg>
        <div class="circular-progress-content">
          ${this.options.showPercentage ? '<div class="circular-progress-percentage">0%</div>' : ''}
          ${this.options.showLabel && this.options.label ? `<div class="circular-progress-label">${this.options.label}</div>` : ''}
        </div>
      </div>
    `;
    
    this.progressFill = this.container.querySelector('.circular-progress-fill');
    this.percentageElement = this.container.querySelector('.circular-progress-percentage');
    this.circumference = circumference;
  }
  
  setProgress(progress, animate = true) {
    const targetProgress = Math.min(Math.max(progress, 0), this.options.max);
    
    if (!animate) {
      this.currentProgress = targetProgress;
      this.updateDisplay();
      return;
    }
    
    this.animateProgress(targetProgress);
  }
  
  animateProgress(targetProgress) {
    const startProgress = this.currentProgress;
    const duration = this.options.animationDuration;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeOutCubic(progress);
      
      this.currentProgress = startProgress + (targetProgress - startProgress) * easedProgress;
      this.updateDisplay();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  updateDisplay() {
    const percentage = (this.currentProgress / this.options.max) * 100;
    const offset = this.circumference - (percentage / 100) * this.circumference;
    
    this.progressFill.style.strokeDashoffset = offset;
    
    if (this.percentageElement) {
      this.percentageElement.textContent = `${Math.round(percentage)}%`;
    }
  }
  
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}

/**
 * Gauge Chart Component
 */
class GaugeChart {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = { ...this.defaultOptions(), ...options };
    this.currentValue = 0;
    
    if (!this.container) {
      throw new Error('Gauge chart container not found');
    }
    
    this.init();
  }
  
  defaultOptions() {
    return {
      size: 200,
      min: 0,
      max: 100,
      value: 0,
      startAngle: -90,
      endAngle: 90,
      strokeWidth: 20,
      colors: [
        { stop: 0, color: '#ef4444' },
        { stop: 0.5, color: '#f59e0b' },
        { stop: 1, color: '#22c55e' }
      ],
      backgroundColor: 'var(--neutral-200, #e5e5e5)',
      showValue: true,
      showLabel: true,
      label: '',
      unit: '',
      animationDuration: 1000
    };
  }
  
  init() {
    this.createGauge();
    this.setValue(this.options.value);
  }
  
  createGauge() {
    const { size, strokeWidth } = this.options;
    const radius = (size - strokeWidth) / 2;
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Create gradient
    const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;
    
    this.container.innerHTML = `
      <div class="gauge-chart" style="width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" class="gauge-svg">
          <defs>
            <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
              ${this.options.colors.map(color => 
                `<stop offset="${color.stop * 100}%" stop-color="${color.color}" />`
              ).join('')}
            </linearGradient>
          </defs>
          <circle
            cx="${centerX}"
            cy="${centerY}"
            r="${radius}"
            stroke="${this.options.backgroundColor}"
            stroke-width="${strokeWidth}"
            fill="none"
            class="gauge-bg"
          />
          <circle
            cx="${centerX}"
            cy="${centerY}"
            r="${radius}"
            stroke="url(#${gradientId})"
            stroke-width="${strokeWidth}"
            fill="none"
            stroke-linecap="round"
            class="gauge-fill"
          />
        </svg>
        <div class="gauge-content">
          ${this.options.showValue ? '<div class="gauge-value">0</div>' : ''}
          ${this.options.showLabel && this.options.label ? `<div class="gauge-label">${this.options.label}</div>` : ''}
        </div>
      </div>
    `;
    
    this.gaugeFill = this.container.querySelector('.gauge-fill');
    this.valueElement = this.container.querySelector('.gauge-value');
    
    // Calculate arc properties
    this.calculateArcProperties();
  }
  
  calculateArcProperties() {
    const { startAngle, endAngle } = this.options;
    const totalAngle = endAngle - startAngle;
    const circumference = 2 * Math.PI * ((this.options.size - this.options.strokeWidth) / 2);
    
    this.arcLength = (totalAngle / 360) * circumference;
    this.gaugeFill.style.strokeDasharray = `${this.arcLength} ${circumference}`;
    this.gaugeFill.style.strokeDashoffset = this.arcLength;
    this.gaugeFill.style.transform = `rotate(${startAngle}deg)`;
    this.gaugeFill.style.transformOrigin = 'center';
  }
  
  setValue(value, animate = true) {
    const clampedValue = Math.min(Math.max(value, this.options.min), this.options.max);
    
    if (!animate) {
      this.currentValue = clampedValue;
      this.updateDisplay();
      return;
    }
    
    this.animateValue(clampedValue);
  }
  
  animateValue(targetValue) {
    const startValue = this.currentValue;
    const duration = this.options.animationDuration;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.easeOutQuart(progress);
      
      this.currentValue = startValue + (targetValue - startValue) * easedProgress;
      this.updateDisplay();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  updateDisplay() {
    const { min, max } = this.options;
    const percentage = (this.currentValue - min) / (max - min);
    const offset = this.arcLength - (percentage * this.arcLength);
    
    this.gaugeFill.style.strokeDashoffset = offset;
    
    if (this.valueElement) {
      this.valueElement.textContent = `${Math.round(this.currentValue)}${this.options.unit}`;
    }
  }
  
  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
}

/**
 * Stats Factory for creating different stat components
 */
class StatsFactory {
  static createStatsCard(container, options) {
    return new StatsComponent(container, options);
  }
  
  static createCircularProgress(container, options) {
    return new CircularProgress(container, options);
  }
  
  static createGaugeChart(container, options) {
    return new GaugeChart(container, options);
  }
  
  static createKPICard(container, data) {
    return new StatsComponent(container, {
      type: 'kpi',
      value: data.value,
      label: data.label,
      format: data.format || 'number',
      trend: data.trend,
      icon: data.icon,
      interactive: true,
      ...data.options
    });
  }
  
  static createMetricCard(container, data) {
    return new StatsComponent(container, {
      type: 'metric',
      value: data.value,
      label: data.label,
      description: data.description,
      progress: data.progress,
      chart: data.chart,
      ...data.options
    });
  }
}

/**
 * Stats Manager for handling multiple stats components
 */
class StatsManager {
  constructor() {
    this.components = new Map();
    this.updateInterval = null;
  }
  
  register(id, component) {
    this.components.set(id, component);
  }
  
  get(id) {
    return this.components.get(id);
  }
  
  remove(id) {
    const component = this.components.get(id);
    if (component && component.destroy) {
      component.destroy();
    }
    this.components.delete(id);
  }
  
  updateAll(data) {
    Object.entries(data).forEach(([id, value]) => {
      const component = this.components.get(id);
      if (component && component.setValue) {
        component.setValue(value);
      }
    });
  }
  
  startRealTimeUpdates(updateFunction, interval = 5000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      const data = updateFunction();
      if (data) {
        this.updateAll(data);
      }
    }, interval);
  }
  
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  destroyAll() {
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.components.clear();
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Global instances
window.StatsComponent = StatsComponent;
window.CircularProgress = CircularProgress;
window.GaugeChart = GaugeChart;
window.StatsFactory = StatsFactory;
window.StatsManager = new StatsManager();

// Auto-initialize stats components
document.addEventListener('DOMContentLoaded', () => {
  // Initialize stats cards with data attributes
  const statsElements = document.querySelectorAll('[data-stats]');
  
  statsElements.forEach((element, index) => {
    try {
      const config = JSON.parse(element.getAttribute('data-stats-config') || '{}');
      const type = element.getAttribute('data-stats') || 'default';
      
      let component;
      switch (type) {
        case 'circular':
          component = new CircularProgress(element, config);
          break;
        case 'gauge':
          component = new GaugeChart(element, config);
          break;
        default:
          component = new StatsComponent(element, { type, ...config });
      }
      
      // Register with manager
      const id = element.id || `stats-${index}`;
      window.StatsManager.register(id, component);
      
    } catch (error) {
      console.error('Failed to initialize stats component:', error);
    }
  });
});
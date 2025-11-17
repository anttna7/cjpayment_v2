/**
 * Progress Component System
 * Handles progress bars, step progress, circular progress, and upload progress
 */

class ProgressComponent {
  constructor() {
    this.progressInstances = new Map();
    this.stepProgressInstances = new Map();
    this.uploadProgressInstances = new Map();
    this.init();
  }

  init() {
    this.initializeExistingProgress();
    this.setupObserver();
  }

  /**
   * Initialize existing progress components on page load
   */
  initializeExistingProgress() {
    // Initialize progress bars
    const progressBars = document.querySelectorAll('.progress');
    progressBars.forEach(progress => this.initializeProgressBar(progress));

    // Initialize step progress
    const stepProgress = document.querySelectorAll('.step-progress');
    stepProgress.forEach(steps => this.initializeStepProgress(steps));

    // Initialize circular progress
    const circularProgress = document.querySelectorAll('.progress-circle');
    circularProgress.forEach(circle => this.initializeCircularProgress(circle));

    // Initialize upload progress
    const uploadProgress = document.querySelectorAll('.upload-progress');
    uploadProgress.forEach(upload => this.initializeUploadProgress(upload));
  }

  /**
   * Setup mutation observer for dynamically added progress components
   */
  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for progress components
            if (node.matches('.progress')) {
              this.initializeProgressBar(node);
            }
            if (node.matches('.step-progress')) {
              this.initializeStepProgress(node);
            }
            if (node.matches('.progress-circle')) {
              this.initializeCircularProgress(node);
            }
            if (node.matches('.upload-progress')) {
              this.initializeUploadProgress(node);
            }

            // Check within added nodes
            const progressBars = node.querySelectorAll('.progress');
            const stepProgress = node.querySelectorAll('.step-progress');
            const circularProgress = node.querySelectorAll('.progress-circle');
            const uploadProgress = node.querySelectorAll('.upload-progress');

            progressBars.forEach(p => this.initializeProgressBar(p));
            stepProgress.forEach(s => this.initializeStepProgress(s));
            circularProgress.forEach(c => this.initializeCircularProgress(c));
            uploadProgress.forEach(u => this.initializeUploadProgress(u));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Generate unique ID for progress components
   */
  generateId() {
    return `progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize progress bar
   */
  initializeProgressBar(progressElement) {
    const id = progressElement.id || this.generateId();
    progressElement.id = id;

    const progressBar = progressElement.querySelector('.progress-bar');
    const value = parseInt(progressElement.getAttribute('data-value') || '0', 10);
    const max = parseInt(progressElement.getAttribute('data-max') || '100', 10);

    const config = {
      element: progressElement,
      bar: progressBar,
      value: value,
      max: max,
      animated: progressElement.hasAttribute('data-animated'),
      striped: progressBar?.classList.contains('progress-bar-striped'),
      indeterminate: progressElement.classList.contains('progress-indeterminate')
    };

    this.progressInstances.set(id, config);
    this.updateProgressBar(id, value);
  }

  /**
   * Initialize step progress
   */
  initializeStepProgress(stepElement) {
    const id = stepElement.id || this.generateId();
    stepElement.id = id;

    const steps = Array.from(stepElement.querySelectorAll('.step-progress-item'));
    const currentStep = parseInt(stepElement.getAttribute('data-current-step') || '0', 10);

    const config = {
      element: stepElement,
      steps: steps,
      currentStep: currentStep,
      totalSteps: steps.length
    };

    this.stepProgressInstances.set(id, config);
    this.updateStepProgress(id, currentStep);
  }

  /**
   * Initialize circular progress
   */
  initializeCircularProgress(circleElement) {
    const id = circleElement.id || this.generateId();
    circleElement.id = id;

    const value = parseInt(circleElement.getAttribute('data-value') || '0', 10);
    const max = parseInt(circleElement.getAttribute('data-max') || '100', 10);
    
    // Create SVG if it doesn't exist
    if (!circleElement.querySelector('.progress-circle-svg')) {
      this.createCircularProgressSVG(circleElement);
    }

    const svg = circleElement.querySelector('.progress-circle-svg');
    const bar = circleElement.querySelector('.progress-circle-bar');
    const text = circleElement.querySelector('.progress-circle-text');

    const config = {
      element: circleElement,
      svg: svg,
      bar: bar,
      text: text,
      value: value,
      max: max,
      radius: 40,
      circumference: 2 * Math.PI * 40
    };

    this.progressInstances.set(id, config);
    this.updateCircularProgress(id, value);
  }

  /**
   * Initialize upload progress
   */
  initializeUploadProgress(uploadElement) {
    const id = uploadElement.id || this.generateId();
    uploadElement.id = id;

    const progressBar = uploadElement.querySelector('.progress');
    const cancelBtn = uploadElement.querySelector('[data-action="cancel"]');
    const pauseBtn = uploadElement.querySelector('[data-action="pause"]');

    const config = {
      element: uploadElement,
      progressBar: progressBar,
      cancelBtn: cancelBtn,
      pauseBtn: pauseBtn,
      status: 'pending',
      progress: 0,
      speed: 0,
      filename: uploadElement.querySelector('.upload-progress-filename')?.textContent || '',
      size: uploadElement.querySelector('.upload-progress-size')?.textContent || ''
    };

    this.uploadProgressInstances.set(id, config);

    // Bind events
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelUpload(id));
    }
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.toggleUploadPause(id));
    }
  }

  /**
   * Create SVG for circular progress
   */
  createCircularProgressSVG(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('progress-circle-svg');
    svg.setAttribute('viewBox', '0 0 80 80');

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.classList.add('progress-circle-bg');
    bgCircle.setAttribute('cx', '40');
    bgCircle.setAttribute('cy', '40');
    bgCircle.setAttribute('r', '36');

    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.classList.add('progress-circle-bar');
    progressCircle.setAttribute('cx', '40');
    progressCircle.setAttribute('cy', '40');
    progressCircle.setAttribute('r', '36');

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);

    // Create text element if it doesn't exist
    if (!container.querySelector('.progress-circle-text')) {
      const text = document.createElement('div');
      text.classList.add('progress-circle-text');
      text.textContent = '0%';
      container.appendChild(text);
    }

    container.insertBefore(svg, container.firstChild);
  }

  /**
   * Create progress bar
   */
  createProgressBar(options = {}) {
    const {
      value = 0,
      max = 100,
      size = 'md',
      variant = 'primary',
      striped = false,
      animated = false,
      indeterminate = false,
      labeled = false,
      label = '',
      className = '',
      attributes = {}
    } = options;

    const container = document.createElement('div');
    container.className = `progress progress-${size} ${indeterminate ? 'progress-indeterminate' : ''} ${className}`.trim();

    // Set attributes
    Object.entries(attributes).forEach(([key, val]) => {
      container.setAttribute(key, val);
    });

    container.setAttribute('data-value', value);
    container.setAttribute('data-max', max);

    if (animated) {
      container.setAttribute('data-animated', 'true');
    }

    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.className = `progress-bar progress-bar-${variant} ${striped ? 'progress-bar-striped' : ''} ${animated ? 'progress-bar-animated' : ''}`.trim();

    container.appendChild(progressBar);

    // Add label if requested
    if (labeled) {
      const labelContainer = document.createElement('div');
      labelContainer.className = 'progress-labeled';

      const labelElement = document.createElement('div');
      labelElement.className = 'progress-label';
      labelElement.innerHTML = `
        <span class="progress-label-text">${label}</span>
        <span class="progress-label-value">${value}%</span>
      `;

      labelContainer.appendChild(labelElement);
      labelContainer.appendChild(container);
      
      this.initializeProgressBar(container);
      return labelContainer;
    }

    this.initializeProgressBar(container);
    return container;
  }

  /**
   * Create circular progress
   */
  createCircularProgress(options = {}) {
    const {
      value = 0,
      max = 100,
      size = 'md',
      variant = 'primary',
      showText = true,
      className = '',
      attributes = {}
    } = options;

    const container = document.createElement('div');
    container.className = `progress-circle progress-circle-${size} progress-circle-${variant} ${className}`.trim();

    // Set attributes
    Object.entries(attributes).forEach(([key, val]) => {
      container.setAttribute(key, val);
    });

    container.setAttribute('data-value', value);
    container.setAttribute('data-max', max);

    if (showText) {
      const text = document.createElement('div');
      text.className = 'progress-circle-text';
      text.textContent = `${Math.round((value / max) * 100)}%`;
      container.appendChild(text);
    }

    this.initializeCircularProgress(container);
    return container;
  }

  /**
   * Create step progress
   */
  createStepProgress(steps, options = {}) {
    const {
      currentStep = 0,
      vertical = false,
      className = '',
      attributes = {}
    } = options;

    const container = document.createElement('div');
    container.className = `step-progress ${vertical ? 'step-progress-vertical' : ''} ${className}`.trim();

    // Set attributes
    Object.entries(attributes).forEach(([key, val]) => {
      container.setAttribute(key, val);
    });

    container.setAttribute('data-current-step', currentStep);

    steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = 'step-progress-item';

      if (index < currentStep) {
        stepElement.classList.add('completed');
      } else if (index === currentStep) {
        stepElement.classList.add('active');
      }

      const icon = document.createElement('div');
      icon.className = 'step-progress-icon';
      icon.textContent = step.completed ? '✓' : (index + 1).toString();

      const label = document.createElement('div');
      label.className = 'step-progress-label';
      label.textContent = step.label;

      if (step.description) {
        const description = document.createElement('div');
        description.className = 'step-progress-description';
        description.textContent = step.description;
        label.appendChild(description);
      }

      stepElement.appendChild(icon);
      stepElement.appendChild(label);
      container.appendChild(stepElement);
    });

    this.initializeStepProgress(container);
    return container;
  }

  /**
   * Create upload progress
   */
  createUploadProgress(file, options = {}) {
    const {
      showActions = true,
      className = '',
      attributes = {}
    } = options;

    const container = document.createElement('div');
    container.className = `upload-progress ${className}`.trim();

    // Set attributes
    Object.entries(attributes).forEach(([key, val]) => {
      container.setAttribute(key, val);
    });

    const header = document.createElement('div');
    header.className = 'upload-progress-header';

    const info = document.createElement('div');
    info.className = 'upload-progress-info';

    const icon = document.createElement('div');
    icon.className = 'upload-progress-icon';
    icon.textContent = '📄';

    const details = document.createElement('div');
    details.className = 'upload-progress-details';

    const filename = document.createElement('div');
    filename.className = 'upload-progress-filename';
    filename.textContent = file.name || 'Unknown file';

    const size = document.createElement('div');
    size.className = 'upload-progress-size';
    size.textContent = this.formatFileSize(file.size || 0);

    details.appendChild(filename);
    details.appendChild(size);

    info.appendChild(icon);
    info.appendChild(details);

    if (showActions) {
      const actions = document.createElement('div');
      actions.className = 'upload-progress-actions';

      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'upload-progress-action';
      pauseBtn.setAttribute('data-action', 'pause');
      pauseBtn.innerHTML = '⏸️';
      pauseBtn.title = '暂停';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'upload-progress-action';
      cancelBtn.setAttribute('data-action', 'cancel');
      cancelBtn.innerHTML = '✕';
      cancelBtn.title = '取消';

      actions.appendChild(pauseBtn);
      actions.appendChild(cancelBtn);
      header.appendChild(actions);
    }

    header.appendChild(info);

    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-bar-container';

    const progress = this.createProgressBar({
      value: 0,
      size: 'sm',
      variant: 'info',
      striped: true,
      animated: true
    });

    progressContainer.appendChild(progress);

    const status = document.createElement('div');
    status.className = 'upload-progress-status';
    status.innerHTML = `
      <span>准备上传...</span>
      <span class="upload-progress-speed">0 KB/s</span>
    `;

    container.appendChild(header);
    container.appendChild(progressContainer);
    container.appendChild(status);

    this.initializeUploadProgress(container);
    return container;
  }

  /**
   * Update progress bar value
   */
  updateProgressBar(progressId, value, max = null) {
    const config = this.progressInstances.get(progressId);
    if (!config) return;

    if (max !== null) {
      config.max = max;
      config.element.setAttribute('data-max', max);
    }

    config.value = Math.max(0, Math.min(value, config.max));
    config.element.setAttribute('data-value', config.value);

    if (config.bar) {
      const percentage = (config.value / config.max) * 100;
      config.bar.style.width = `${percentage}%`;
    }

    // Update label if it exists
    const labelValue = config.element.parentElement?.querySelector('.progress-label-value');
    if (labelValue) {
      labelValue.textContent = `${Math.round((config.value / config.max) * 100)}%`;
    }

    // Trigger progress update event
    config.element.dispatchEvent(new CustomEvent('progressUpdate', {
      detail: { value: config.value, max: config.max, percentage: (config.value / config.max) * 100 }
    }));
  }

  /**
   * Update circular progress value
   */
  updateCircularProgress(progressId, value, max = null) {
    const config = this.progressInstances.get(progressId);
    if (!config) return;

    if (max !== null) {
      config.max = max;
      config.element.setAttribute('data-max', max);
    }

    config.value = Math.max(0, Math.min(value, config.max));
    config.element.setAttribute('data-value', config.value);

    const percentage = (config.value / config.max) * 100;
    const offset = config.circumference - (percentage / 100) * config.circumference;

    if (config.bar) {
      config.bar.style.strokeDashoffset = offset;
    }

    if (config.text) {
      config.text.textContent = `${Math.round(percentage)}%`;
    }

    // Trigger progress update event
    config.element.dispatchEvent(new CustomEvent('progressUpdate', {
      detail: { value: config.value, max: config.max, percentage }
    }));
  }

  /**
   * Update step progress
   */
  updateStepProgress(stepId, currentStep) {
    const config = this.stepProgressInstances.get(stepId);
    if (!config) return;

    config.currentStep = Math.max(0, Math.min(currentStep, config.totalSteps - 1));
    config.element.setAttribute('data-current-step', config.currentStep);

    config.steps.forEach((step, index) => {
      step.classList.remove('completed', 'active', 'error');
      
      const icon = step.querySelector('.step-progress-icon');
      
      if (index < config.currentStep) {
        step.classList.add('completed');
        if (icon) icon.textContent = '✓';
      } else if (index === config.currentStep) {
        step.classList.add('active');
        if (icon) icon.textContent = (index + 1).toString();
      } else {
        if (icon) icon.textContent = (index + 1).toString();
      }
    });

    // Trigger step change event
    config.element.dispatchEvent(new CustomEvent('stepChange', {
      detail: { currentStep: config.currentStep, totalSteps: config.totalSteps }
    }));
  }

  /**
   * Set step as error
   */
  setStepError(stepId, stepIndex, errorMessage = null) {
    const config = this.stepProgressInstances.get(stepId);
    if (!config || stepIndex >= config.steps.length) return;

    const step = config.steps[stepIndex];
    step.classList.add('error');
    step.classList.remove('completed', 'active');

    const icon = step.querySelector('.step-progress-icon');
    if (icon) icon.textContent = '✗';

    if (errorMessage) {
      let description = step.querySelector('.step-progress-description');
      if (!description) {
        description = document.createElement('div');
        description.className = 'step-progress-description';
        step.querySelector('.step-progress-label').appendChild(description);
      }
      description.textContent = errorMessage;
    }
  }

  /**
   * Update upload progress
   */
  updateUploadProgress(uploadId, progress, speed = null, status = null) {
    const config = this.uploadProgressInstances.get(uploadId);
    if (!config) return;

    config.progress = Math.max(0, Math.min(progress, 100));
    
    if (speed !== null) {
      config.speed = speed;
    }
    
    if (status !== null) {
      config.status = status;
    }

    // Update progress bar
    if (config.progressBar) {
      const progressBarId = config.progressBar.id;
      if (progressBarId && this.progressInstances.has(progressBarId)) {
        this.updateProgressBar(progressBarId, config.progress);
      }
    }

    // Update status text
    const statusElement = config.element.querySelector('.upload-progress-status');
    if (statusElement) {
      const statusText = this.getUploadStatusText(config.status, config.progress);
      const speedText = this.formatSpeed(config.speed);
      
      statusElement.innerHTML = `
        <span>${statusText}</span>
        <span class="upload-progress-speed">${speedText}</span>
      `;
    }

    // Update element class based on status
    config.element.className = config.element.className.replace(/\b(uploading|completed|error|paused)\b/g, '');
    if (config.status !== 'pending') {
      config.element.classList.add(config.status);
    }

    // Trigger upload progress event
    config.element.dispatchEvent(new CustomEvent('uploadProgress', {
      detail: { progress: config.progress, speed: config.speed, status: config.status }
    }));
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId) {
    const config = this.uploadProgressInstances.get(uploadId);
    if (!config) return;

    config.status = 'cancelled';
    this.updateUploadProgress(uploadId, config.progress, 0, 'cancelled');

    // Trigger cancel event
    config.element.dispatchEvent(new CustomEvent('uploadCancel', {
      detail: { uploadId }
    }));
  }

  /**
   * Toggle upload pause
   */
  toggleUploadPause(uploadId) {
    const config = this.uploadProgressInstances.get(uploadId);
    if (!config) return;

    const wasPaused = config.status === 'paused';
    config.status = wasPaused ? 'uploading' : 'paused';
    
    this.updateUploadProgress(uploadId, config.progress, wasPaused ? config.speed : 0, config.status);

    // Update pause button
    const pauseBtn = config.pauseBtn;
    if (pauseBtn) {
      pauseBtn.innerHTML = wasPaused ? '⏸️' : '▶️';
      pauseBtn.title = wasPaused ? '暂停' : '继续';
    }

    // Trigger pause/resume event
    config.element.dispatchEvent(new CustomEvent(wasPaused ? 'uploadResume' : 'uploadPause', {
      detail: { uploadId }
    }));
  }

  /**
   * Complete upload
   */
  completeUpload(uploadId) {
    const config = this.uploadProgressInstances.get(uploadId);
    if (!config) return;

    this.updateUploadProgress(uploadId, 100, 0, 'completed');

    // Trigger complete event
    config.element.dispatchEvent(new CustomEvent('uploadComplete', {
      detail: { uploadId }
    }));
  }

  /**
   * Set upload error
   */
  setUploadError(uploadId, errorMessage = '上传失败') {
    const config = this.uploadProgressInstances.get(uploadId);
    if (!config) return;

    config.status = 'error';
    this.updateUploadProgress(uploadId, config.progress, 0, 'error');

    // Update status with error message
    const statusElement = config.element.querySelector('.upload-progress-status');
    if (statusElement) {
      statusElement.innerHTML = `
        <span style="color: var(--color-status-error);">${errorMessage}</span>
        <span class="upload-progress-speed">0 KB/s</span>
      `;
    }

    // Trigger error event
    config.element.dispatchEvent(new CustomEvent('uploadError', {
      detail: { uploadId, error: errorMessage }
    }));
  }

  /**
   * Animate progress to value
   */
  animateProgressTo(progressId, targetValue, duration = 1000) {
    const config = this.progressInstances.get(progressId);
    if (!config) return;

    const startValue = config.value;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeOut;

      if (config.element.classList.contains('progress-circle')) {
        this.updateCircularProgress(progressId, currentValue);
      } else {
        this.updateProgressBar(progressId, currentValue);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Utility functions
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 KB/s';
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  getUploadStatusText(status, progress) {
    switch (status) {
      case 'uploading':
        return `上传中... ${Math.round(progress)}%`;
      case 'completed':
        return '上传完成';
      case 'error':
        return '上传失败';
      case 'paused':
        return '已暂停';
      case 'cancelled':
        return '已取消';
      default:
        return '准备上传...';
    }
  }

  /**
   * Get progress instance
   */
  getProgress(progressId) {
    return this.progressInstances.get(progressId) || this.stepProgressInstances.get(progressId) || this.uploadProgressInstances.get(progressId);
  }

  /**
   * Remove progress instance
   */
  removeProgress(progressId) {
    const config = this.getProgress(progressId);
    if (!config) return;

    if (config.element.parentNode) {
      config.element.parentNode.removeChild(config.element);
    }

    this.progressInstances.delete(progressId);
    this.stepProgressInstances.delete(progressId);
    this.uploadProgressInstances.delete(progressId);
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    this.progressInstances.clear();
    this.stepProgressInstances.clear();
    this.uploadProgressInstances.clear();
  }
}

// Utility functions for common progress operations
const ProgressUtils = {
  /**
   * Create payment progress steps
   */
  createPaymentSteps(currentStep = 0) {
    const steps = [
      { label: '确认订单', description: '验证订单信息' },
      { label: '选择支付', description: '选择支付方式' },
      { label: '支付处理', description: '处理支付请求' },
      { label: '支付完成', description: '支付成功确认' }
    ];

    return window.progressComponent.createStepProgress(steps, { currentStep });
  },

  /**
   * Create order processing steps
   */
  createOrderSteps(currentStep = 0) {
    const steps = [
      { label: '订单创建', description: '创建新订单' },
      { label: '库存检查', description: '验证商品库存' },
      { label: '支付确认', description: '确认支付状态' },
      { label: '订单完成', description: '订单处理完成' }
    ];

    return window.progressComponent.createStepProgress(steps, { currentStep });
  },

  /**
   * Create file upload progress
   */
  createFileUpload(file) {
    return window.progressComponent.createUploadProgress(file);
  },

  /**
   * Simulate upload progress
   */
  simulateUpload(uploadId, callback = null) {
    let progress = 0;
    const speed = Math.random() * 1000000 + 500000; // Random speed between 500KB/s and 1.5MB/s
    
    window.progressComponent.updateUploadProgress(uploadId, 0, speed, 'uploading');
    
    const interval = setInterval(() => {
      progress += Math.random() * 10 + 5; // Random increment between 5-15%
      
      if (progress >= 100) {
        progress = 100;
        window.progressComponent.completeUpload(uploadId);
        clearInterval(interval);
        
        if (callback) callback(true);
      } else {
        // Simulate occasional errors (5% chance)
        if (Math.random() < 0.05) {
          window.progressComponent.setUploadError(uploadId, '网络连接错误');
          clearInterval(interval);
          
          if (callback) callback(false, '网络连接错误');
          return;
        }
        
        window.progressComponent.updateUploadProgress(uploadId, progress, speed, 'uploading');
      }
    }, 200);
    
    return interval;
  }
};

// Initialize component when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.progressComponent = new ProgressComponent();
    window.ProgressUtils = ProgressUtils;
  });
} else {
  window.progressComponent = new ProgressComponent();
  window.ProgressUtils = ProgressUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProgressComponent, ProgressUtils };
}
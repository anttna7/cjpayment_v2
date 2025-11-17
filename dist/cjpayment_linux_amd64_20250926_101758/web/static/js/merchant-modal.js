/**
 * Merchant Management Modal Component
 * 商户管理模态框组件
 * 
 * Features:
 * - 创建和编辑商户信息
 * - 表单验证和错误处理
 * - 集成现有Modal组件库
 * - 支持键盘导航和无障碍访问
 * - 自动完成和实时验证
 */

class MerchantModal {
  constructor(options = {}) {
    this.options = {
      mode: 'create', // 'create' | 'edit'
      merchantId: null,
      onSave: null,
      onCancel: null,
      ...options
    };
    
    this.modal = null;
    this.form = null;
    this.validator = null;
    this.api = null;
    this.isSubmitting = false;
    this.formData = {};
    
    // 初始化
    this.init();
  }
  
  // ==========================================================================
  // 初始化方法
  // ==========================================================================
  
  init() {
    this.initializeAPI();
    this.initializeValidator();
    this.initializeErrorHandler();
    this.initializeAccessibility();
    this.bindGlobalEvents();
  }
  
  initializeAPI() {
    // Load API client if not already loaded
    if (typeof MerchantAPI === 'undefined') {
      this.loadAPIClient();
    }
    this.api = new MerchantAPI();
  }
  
  loadAPIClient() {
    // Dynamically load API client
    const script = document.createElement('script');
    script.src = '/static/js/merchant-api.js';
    script.async = false;
    document.head.appendChild(script);
  }
  
  initializeValidator() {
    // Load validation system if not already loaded
    if (typeof MerchantFormValidator === 'undefined') {
      this.loadValidationSystem();
    }
    this.validator = new MerchantFormValidator();
  }
  
  initializeErrorHandler() {
    // Load error handler if not already loaded
    if (typeof MerchantModalErrorHandler === 'undefined') {
      this.loadErrorHandler();
    }
    this.errorHandler = new MerchantModalErrorHandler({
      showFieldErrors: true,
      showToastErrors: true,
      enableRetry: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      onError: (type, field, message) => {
        console.log(`Error: ${type} - ${field} - ${message}`);
      },
      onRetry: (operationId, attempt, context) => {
        console.log(`Retry: ${operationId} - attempt ${attempt}`);
      },
      onSuccess: (type, message) => {
        console.log(`Success: ${type} - ${message}`);
      }
    });
  }
  
  initializeAccessibility() {
    // Load accessibility enhancement if not already loaded
    if (typeof MerchantModalAccessibility === 'undefined') {
      this.loadAccessibilityEnhancement();
    }
  }
  
  loadErrorHandler() {
    // Dynamically load error handler
    const script = document.createElement('script');
    script.src = '/static/js/merchant-modal-error-handler.js';
    script.async = false;
    document.head.appendChild(script);
    
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/css/components/merchant-modal-error-handler.css';
    document.head.appendChild(link);
  }
  
  loadValidationSystem() {
    // Dynamically load validation system
    const script = document.createElement('script');
    script.src = '/static/js/merchant-form-validation.js';
    script.async = false;
    document.head.appendChild(script);
  }
  
  loadAccessibilityEnhancement() {
    // Dynamically load accessibility enhancement
    const script = document.createElement('script');
    script.src = '/static/js/merchant-modal-accessibility.js';
    script.async = false;
    document.head.appendChild(script);
    
    // Load accessibility CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/css/components/accessibility.css';
    document.head.appendChild(link);
  }
  
  bindGlobalEvents() {
    // Note: Escape key handling is now managed by accessibility enhancement
    // This provides better integration with screen readers and other accessibility features
  }
  
  /**
   * 初始化无障碍功能
   */
  initializeAccessibilityFeatures() {
    if (typeof MerchantModalAccessibility !== 'undefined') {
      this.accessibility = new MerchantModalAccessibility(this);
    } else {
      // Fallback: basic keyboard support
      this.setupBasicKeyboardSupport();
    }
  }
  
  /**
   * 设置基础键盘支持（降级方案）
   */
  setupBasicKeyboardSupport() {
    this.keyboardHandler = (e) => {
      if (e.key === 'Escape' && this.modal) {
        e.preventDefault();
        this.handleCancel();
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }
  
  /**
   * 清理无障碍功能
   */
  cleanupAccessibilityFeatures() {
    if (this.accessibility) {
      this.accessibility.destroy();
      this.accessibility = null;
    }
    
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }
  
  // ==========================================================================
  // 公共方法
  // ==========================================================================
  
  /**
   * 显示模态框
   * @param {Object} data - 商户数据（编辑模式时使用）
   */
  async show(data = null) {
    try {
      // 设置模式和数据
      if (data) {
        this.options.mode = 'edit';
        this.options.merchantId = data.id;
        this.formData = { ...data };
      } else {
        this.options.mode = 'create';
        this.options.merchantId = null;
        this.formData = {};
      }
      
      // 创建模态框内容
      const content = this.createModalContent();
      
      // 显示模态框
      this.modal = await Modal.show({
        title: this.options.mode === 'create' ? '添加商户' : '编辑商户',
        content: content,
        size: 'lg',
        animation: 'scale',
        closable: true,
        backdrop: true, // 允许点击背景关闭
        keyboard: true, // 允许ESC键关闭
        onShow: () => this.onModalShow(),
        onHide: () => this.onModalHide()
      });
      
      return this.modal;
    } catch (error) {
      console.error('Failed to show merchant modal:', error);
      this.showError('无法打开商户编辑窗口');
      throw error;
    }
  }
  
  /**
   * 隐藏模态框
   */
  hide() {
    if (this.modal) {
      // 如果有未保存的更改，提示用户
      if (this.hasUnsavedChanges()) {
        this.confirmClose();
      } else {
        this.forceClose();
      }
    }
  }
  
  /**
   * 强制关闭模态框
   */
  forceClose() {
    if (this.modal) {
      // 清理事件监听器
      this.unbindEvents();
      
      // 清理验证器
      if (this.validator) {
        this.validator.destroy();
      }
      
      // 清理错误处理器
      if (this.errorHandler) {
        this.errorHandler.destroy();
      }
      
      // 清理自动完成实例
      this.cleanupAutocompleteInstances();
      
      // 关闭模态框
      Modal.manager.hide(this.modal.id, { reason: 'programmatic' });
      this.modal = null;
    }
  }
  
  // ==========================================================================
  // 模态框内容创建
  // ==========================================================================
  
  createModalContent() {
    const formHtml = this.createFormHtml();
    const buttonsHtml = this.createButtonsHtml();
    
    return `
      <div class="merchant-modal-content">
        ${formHtml}
        <div class="modal-footer">
          ${buttonsHtml}
        </div>
      </div>
    `;
  }
  
  createFormHtml() {
    const fields = this.getFormFields();
    let html = '<form class="merchant-form" id="merchantForm" novalidate>';
    
    // 动态生成表单分组
    const sections = this.groupFieldsBySection(fields);
    const formSections = this.getFormSections();
    
    Object.entries(sections).forEach(([sectionKey, sectionFields]) => {
      const sectionConfig = formSections[sectionKey];
      if (!sectionConfig) return;
      
      html += this.createSectionHtml(sectionConfig, sectionFields);
    });
    
    html += '</form>';
    return html;
  }
  
  /**
   * 按分组组织字段
   */
  groupFieldsBySection(fields) {
    const sections = {};
    
    Object.values(fields).forEach(field => {
      const sectionKey = field.section || 'other';
      if (!sections[sectionKey]) {
        sections[sectionKey] = [];
      }
      sections[sectionKey].push(field);
    });
    
    // 按order排序每个分组内的字段
    Object.keys(sections).forEach(sectionKey => {
      sections[sectionKey].sort((a, b) => (a.order || 999) - (b.order || 999));
    });
    
    // 按分组order排序
    const sortedSections = {};
    const formSections = this.getFormSections();
    Object.keys(sections)
      .sort((a, b) => {
        const orderA = formSections[a]?.order || 999;
        const orderB = formSections[b]?.order || 999;
        return orderA - orderB;
      })
      .forEach(key => {
        sortedSections[key] = sections[key];
      });
    
    return sortedSections;
  }
  
  getFormSections() {
    // Use the configuration from validation system if available
    if (typeof FORM_SECTIONS !== 'undefined') {
      return FORM_SECTIONS;
    }
    
    // Fallback configuration
    return {
      basic: { title: '基础信息', order: 1, icon: '🏢' },
      account: { title: '收款账户信息', order: 2, icon: '💳' },
      limits: { title: '限额设置', order: 3, icon: '⚖️' },
      business: { title: '业务信息', order: 4, icon: '📊' }
    };
  }
  
  /**
   * 创建表单分组HTML
   */
  createSectionHtml(sectionConfig, fields) {
    let html = '<div class="form-section" data-section="' + sectionConfig.title + '">';
    
    // 分组标题
    html += '<h3 class="form-section-title">';
    if (sectionConfig.icon) {
      html += '<span class="section-icon">' + sectionConfig.icon + '</span>';
    }
    html += sectionConfig.title;
    html += '</h3>';
    
    // 分组描述（可选）
    if (sectionConfig.description) {
      html += '<p class="form-section-description">' + sectionConfig.description + '</p>';
    }
    
    // 字段渲染
    html += this.createFieldsRowsHtml(fields);
    
    html += '</div>';
    return html;
  }
  
  /**
   * 创建字段行HTML
   */
  createFieldsRowsHtml(fields) {
    let html = '';
    let currentRow = [];
    
    fields.forEach((field, index) => {
      currentRow.push(field);
      
      // 如果是textarea或者到达行末，创建一行
      if (field.type === 'textarea' || currentRow.length === 2 || index === fields.length - 1) {
        html += '<div class="form-row">';
        currentRow.forEach(rowField => {
          html += this.createFieldHtml(rowField);
        });
        html += '</div>';
        currentRow = [];
      }
    });
    
    return html;
  }
  
  createFieldHtml(field) {
    const value = this.formData[field.name] || field.defaultValue || '';
    const isRequired = field.required ? 'required' : '';
    const isHidden = field.dependsOn && !this.shouldShowField(field) ? 'style="display: none;"' : '';
    
    let html = `<div class="form-group" data-field="${field.name}" ${isHidden}>`;
    
    // 标签和帮助文本
    html += this.createFieldLabelHtml(field);
    
    // 输入控件
    html += this.createFieldInputHtml(field, value, isRequired);
    
    // 错误提示区域
    html += `<div class="field-error" id="error-${field.name}" role="alert" aria-live="polite"></div>`;
    
    // 字符计数（如果需要）
    if (field.maxLength && (field.type === 'text' || field.type === 'textarea')) {
      html += this.createCharacterCounterHtml(field);
    }
    
    // 帮助文本
    if (field.helpText) {
      html += `<div class="field-help" id="help-${field.name}">${field.helpText}</div>`;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * 创建字段标签HTML
   */
  createFieldLabelHtml(field) {
    let html = `<label class="form-label" for="${field.name}">`;
    html += field.label;
    if (field.required) {
      html += '<span class="required-mark" aria-label="必填">*</span>';
    }
    html += '</label>';
    return html;
  }
  
  /**
   * 创建字段输入控件HTML
   */
  createFieldInputHtml(field, value, isRequired) {
    const commonAttrs = this.getCommonFieldAttributes(field, isRequired);
    
    switch (field.type) {
      case 'text':
        return this.createTextInputHtml(field, value, commonAttrs);
      case 'number':
        return this.createNumberInputHtml(field, value, commonAttrs);
      case 'select':
        return this.createSelectInputHtml(field, value, commonAttrs);
      case 'textarea':
        return this.createTextareaInputHtml(field, value, commonAttrs);
      default:
        return this.createTextInputHtml(field, value, commonAttrs);
    }
  }
  
  /**
   * 获取通用字段属性
   */
  getCommonFieldAttributes(field, isRequired) {
    const attrs = {
      id: field.name,
      name: field.name,
      placeholder: field.placeholder || '',
      required: isRequired,
      'aria-describedby': []
    };
    
    // 添加帮助文本关联
    if (field.helpText) {
      attrs['aria-describedby'].push(`help-${field.name}`);
    }
    
    // 添加错误提示关联
    attrs['aria-describedby'].push(`error-${field.name}`);
    
    // 转换为字符串
    attrs['aria-describedby'] = attrs['aria-describedby'].join(' ');
    
    return attrs;
  }
  
  /**
   * 创建文本输入框HTML
   */
  createTextInputHtml(field, value, attrs) {
    let inputClass = 'form-input';
    if (field.autocomplete) {
      inputClass += ' autocomplete-input';
    }
    
    let html = `<input 
      type="text" 
      id="${attrs.id}" 
      name="${attrs.name}" 
      class="${inputClass}" 
      value="${this.escapeHtml(value)}"
      placeholder="${attrs.placeholder}"
      ${attrs.required}
      ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
      aria-describedby="${attrs['aria-describedby']}"
    `;
    
    // 自动完成属性
    if (field.autocomplete) {
      html += ` data-autocomplete="${field.autocomplete}"`;
    }
    
    html += '>';
    
    return html;
  }
  
  /**
   * 创建数字输入框HTML
   */
  createNumberInputHtml(field, value, attrs) {
    let inputClass = 'form-input';
    if (field.format === 'currency') {
      inputClass += ' currency-input';
    }
    
    let html = `<div class="number-input-wrapper">`;
    
    // 货币符号（如果是货币格式）
    if (field.format === 'currency') {
      html += '<span class="currency-symbol">¥</span>';
    }
    
    html += `<input 
      type="number" 
      id="${attrs.id}" 
      name="${attrs.name}" 
      class="${inputClass}" 
      value="${value}"
      placeholder="${attrs.placeholder}"
      ${attrs.required}
      ${field.min !== undefined ? `min="${field.min}"` : ''}
      ${field.max !== undefined ? `max="${field.max}"` : ''}
      ${field.step ? `step="${field.step}"` : ''}
      aria-describedby="${attrs['aria-describedby']}"
    >`;
    
    html += '</div>';
    return html;
  }
  
  /**
   * 创建选择框HTML
   */
  createSelectInputHtml(field, value, attrs) {
    let html = `<select 
      id="${attrs.id}" 
      name="${attrs.name}" 
      class="form-select" 
      ${attrs.required}
      aria-describedby="${attrs['aria-describedby']}"
    >`;
    
    // 默认选项（非必填时）
    if (!field.required) {
      html += '<option value="">请选择</option>';
    }
    
    // 选项列表
    field.options.forEach(option => {
      const selected = value === option.value ? 'selected' : '';
      const icon = option.icon ? `${option.icon} ` : '';
      html += `<option value="${option.value}" ${selected}>${icon}${option.label}</option>`;
    });
    
    html += '</select>';
    return html;
  }
  
  /**
   * 创建文本域HTML
   */
  createTextareaInputHtml(field, value, attrs) {
    return `<textarea 
      id="${attrs.id}" 
      name="${attrs.name}" 
      class="form-textarea" 
      placeholder="${attrs.placeholder}"
      ${attrs.required}
      ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
      rows="${field.rows || 3}"
      aria-describedby="${attrs['aria-describedby']}"
    >${this.escapeHtml(value)}</textarea>`;
  }
  
  /**
   * 创建字符计数器HTML
   */
  createCharacterCounterHtml(field) {
    return `<div class="field-counter" id="counter-${field.name}">
      <span class="counter-current">0</span>/<span class="counter-max">${field.maxLength}</span>
    </div>`;
  }
  
  createButtonsHtml() {
    const saveText = this.options.mode === 'create' ? '创建商户' : '保存更改';
    
    return `
      <button type="button" class="modal-btn modal-btn-secondary" id="cancelBtn">
        取消
      </button>
      <button type="submit" class="modal-btn modal-btn-primary" id="saveBtn" form="merchantForm">
        <span class="btn-text">${saveText}</span>
        <span class="btn-loading" style="display: none;">
          <span class="loading-spinner"></span>
          保存中...
        </span>
      </button>
    `;
  }
  
  // ==========================================================================
  // 表单字段配置
  // ==========================================================================
  
  getFormFields() {
    // Use the configuration from validation system if available
    if (typeof MERCHANT_FORM_FIELDS !== 'undefined') {
      return MERCHANT_FORM_FIELDS;
    }
    
    // Fallback configuration if validation system not loaded
    return this.getFallbackFormFields();
  }
  
  getFallbackFormFields() {
    // Basic fallback configuration
    return {
      companyName: {
        name: 'companyName',
        type: 'text',
        label: '公司名称',
        required: true,
        section: 'basic',
        order: 1
      },
      receiveAccountName: {
        name: 'receiveAccountName',
        type: 'text',
        label: '收款账户名称',
        required: true,
        section: 'account',
        order: 1
      },
      receiveAccountNumber: {
        name: 'receiveAccountNumber',
        type: 'text',
        label: '收款账号',
        required: true,
        section: 'account',
        order: 2
      },
      accountType: {
        name: 'accountType',
        type: 'select',
        label: '收款账号类型',
        required: true,
        section: 'account',
        order: 3,
        options: [
          { value: 'alipay', label: '支付宝' },
          { value: 'wechat', label: '微信' },
          { value: 'bank', label: '银行卡' },
          { value: 'other', label: '其它' }
        ]
      },
      customPaymentProvider: {
        name: 'customPaymentProvider',
        type: 'text',
        label: '收单机构名称',
        required: false,
        section: 'account',
        order: 4,
        dependsOn: 'accountType',
        showWhen: 'other'
      },
      dailyLimit: {
        name: 'dailyLimit',
        type: 'number',
        label: '单日收款限额',
        required: false,
        format: 'currency',
        section: 'limits',
        order: 1
      },
      singleLimit: {
        name: 'singleLimit',
        type: 'number',
        label: '单笔收款限额',
        required: false,
        format: 'currency',
        section: 'limits',
        order: 2
      },
      agentName: {
        name: 'agentName',
        type: 'text',
        label: '代理商名称',
        required: false,
        section: 'business',
        order: 1,
        autocomplete: 'agents'
      },
      portName: {
        name: 'portName',
        type: 'text',
        label: '端口名称',
        required: false,
        section: 'business',
        order: 2
      },
      remark: {
        name: 'remark',
        type: 'textarea',
        label: '备注',
        required: false,
        maxLength: 500,
        section: 'business',
        order: 3
      }
    };
  }
  
  // ==========================================================================
  // 事件处理
  // ==========================================================================
  
  onModalShow() {
    // 绑定表单事件
    this.bindFormEvents();
    
    // 初始化无障碍功能
    this.initializeAccessibilityFeatures();
    
    // 设置焦点到第一个输入框
    this.focusFirstField();
    
    // 初始化字段状态
    this.initializeFieldStates();
    
    // 如果是编辑模式，填充数据
    if (this.options.mode === 'edit') {
      this.populateForm();
    }
  }
  
  onModalHide() {
    // 清理无障碍功能
    this.cleanupAccessibilityFeatures();
    
    // 清理事件监听器
    this.unbindEvents();
    
    // 调用取消回调
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }
  
  bindFormEvents() {
    const form = document.getElementById('merchantForm');
    if (!form) return;
    
    this.form = form;
    
    // 表单提交
    form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // 取消按钮
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }
    
    // 字段变化监听
    this.bindFieldEvents();
    
    // 条件字段显示/隐藏
    this.bindConditionalFields();
  }
  
  bindFieldEvents() {
    const fields = this.form.querySelectorAll('input, select, textarea');
    
    fields.forEach(field => {
      // 实时验证
      field.addEventListener('blur', (e) => this.validateField(e.target));
      field.addEventListener('input', (e) => this.onFieldInput(e.target));
      
      // 字符计数
      if (field.hasAttribute('maxlength')) {
        field.addEventListener('input', (e) => this.updateCharacterCount(e.target));
      }
      
      // 自动完成
      if (field.classList.contains('autocomplete-input')) {
        this.bindAutocompleteEvents(field);
      }
      
      // 货币格式化
      if (field.classList.contains('currency-input')) {
        this.bindCurrencyEvents(field);
      }
    });
  }
  
  /**
   * 绑定自动完成事件
   */
  bindAutocompleteEvents(field) {
    const autocompleteType = field.dataset.autocomplete;
    if (!autocompleteType) return;
    
    // 加载自动完成组件
    if (typeof AutocompleteComponent === 'undefined') {
      this.loadAutocompleteComponent(() => {
        this.initializeAutocomplete(field, autocompleteType);
      });
    } else {
      this.initializeAutocomplete(field, autocompleteType);
    }
  }
  
  /**
   * 加载自动完成组件
   */
  loadAutocompleteComponent(callback) {
    const script = document.createElement('script');
    script.src = '/static/js/autocomplete-component.js';
    script.onload = callback;
    script.onerror = () => {
      console.error('Failed to load autocomplete component');
    };
    document.head.appendChild(script);
    
    // 加载CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/static/css/components/autocomplete.css';
    document.head.appendChild(link);
  }
  
  /**
   * 初始化自动完成组件
   */
  initializeAutocomplete(field, autocompleteType) {
    try {
      const options = this.getAutocompleteOptions(autocompleteType);
      const autocomplete = new AutocompleteComponent(field, options);
      
      // 存储引用以便后续清理
      if (!this.autocompleteInstances) {
        this.autocompleteInstances = [];
      }
      this.autocompleteInstances.push(autocomplete);
      
    } catch (error) {
      console.error('Failed to initialize autocomplete:', error);
      // 降级到简单的输入框
      this.fallbackToSimpleInput(field);
    }
  }
  
  /**
   * 获取自动完成选项配置
   */
  getAutocompleteOptions(autocompleteType) {
    const baseOptions = {
      minLength: 2,
      maxResults: 10,
      debounceDelay: 300,
      highlightMatches: true,
      announceResults: true,
      onSelect: (suggestion, value) => {
        // 触发字段验证
        const field = suggestion.target || document.activeElement;
        if (field) {
          this.onFieldInput(field);
        }
      },
      onError: (error) => {
        console.warn('Autocomplete error:', error);
      }
    };
    
    switch (autocompleteType) {
      case 'agents':
        return {
          ...baseOptions,
          dataSource: async (query, limit) => {
            if (!this.api) return [];
            return await this.api.getAgentSuggestions(query, limit);
          },
          displayProperty: 'agent_name',
          valueProperty: 'agent_name',
          onSelect: (suggestion, value) => {
            // 更新使用计数
            if (this.api && suggestion.agent_name) {
              this.api.updateSuggestionUsage(suggestion.agent_name).catch(err => {
                console.warn('Failed to update suggestion usage:', err);
              });
            }
            
            // 触发字段验证
            const field = document.getElementById('agentName');
            if (field) {
              this.onFieldInput(field);
            }
          }
        };
      
      default:
        return baseOptions;
    }
  }
  
  /**
   * 降级到简单输入框
   */
  fallbackToSimpleInput(field) {
    // 移除自动完成相关的属性和元素
    field.removeAttribute('data-autocomplete');
    const suggestionsContainer = document.getElementById(`suggestions-${field.name}`);
    if (suggestionsContainer) {
      suggestionsContainer.remove();
    }
  }
  
  /**
   * 绑定货币格式化事件
   */
  bindCurrencyEvents(field) {
    field.addEventListener('input', (e) => {
      this.formatCurrencyInput(e.target);
    });
    
    field.addEventListener('blur', (e) => {
      this.validateCurrencyInput(e.target);
    });
  }
  
  bindConditionalFields() {
    const accountTypeField = document.getElementById('accountType');
    if (accountTypeField) {
      accountTypeField.addEventListener('change', (e) => {
        this.toggleConditionalFields(e.target.value);
      });
      
      // 初始状态
      this.toggleConditionalFields(accountTypeField.value);
    }
  }
  
  unbindEvents() {
    // 清理自动完成实例
    this.cleanupAutocompleteInstances();
    
    // 移除所有事件监听器
    if (this.form) {
      const newForm = this.form.cloneNode(true);
      this.form.parentNode.replaceChild(newForm, this.form);
      this.form = null;
    }
  }
  
  // ==========================================================================
  // 表单处理
  // ==========================================================================
  
  async handleSubmit(e) {
    e.preventDefault();
    
    if (this.isSubmitting) return;
    
    try {
      this.isSubmitting = true;
      this.setSubmitButtonLoading(true);
      
      // 验证表单
      const isValid = await this.validateForm();
      if (!isValid) {
        this.showError('请检查表单中的错误信息');
        return;
      }
      
      // 收集表单数据
      const formData = this.collectFormData();
      
      // 提交数据
      const result = await this.submitForm(formData);
      
      // 成功处理
      this.showSuccess(this.options.mode === 'create' ? '商户创建成功' : '商户更新成功');
      
      // 调用保存回调
      if (this.options.onSave) {
        this.options.onSave(result);
      }
      
      // 关闭模态框
      this.forceClose();
      
    } catch (error) {
      console.error('Form submission failed:', error);
      this.handleSubmitError(error);
    } finally {
      this.isSubmitting = false;
      this.setSubmitButtonLoading(false);
    }
  }
  
  handleCancel() {
    if (this.hasUnsavedChanges()) {
      this.confirmClose();
    } else {
      this.forceClose();
    }
  }
  
  async confirmClose() {
    const confirmed = await Modal.confirm(
      '您有未保存的更改，确定要关闭吗？',
      {
        title: '确认关闭',
        confirmText: '确定关闭',
        cancelText: '继续编辑'
      }
    );
    
    if (confirmed) {
      this.forceClose();
    }
  }
  
  // ==========================================================================
  // 表单验证
  // ==========================================================================
  
  async validateForm() {
    const formData = this.collectFormData();
    
    // 清除之前的错误
    this.clearAllErrors();
    
    try {
      // 使用验证器验证整个表单
      const result = await this.validator.validateForm(formData, this.options.mode);
      
      if (!result.isValid) {
        // 显示所有错误
        Object.entries(result.errors).forEach(([fieldName, message]) => {
          this.showFieldError(fieldName, message);
        });
      }
      
      return result.isValid;
    } catch (error) {
      console.error('Form validation failed:', error);
      this.showError('表单验证失败，请检查输入信息');
      return false;
    }
  }
  
  async validateField(field) {
    if (!field) return true;
    
    const fieldName = field.name;
    const value = field.value.trim();
    const formData = this.collectFormData();
    
    try {
      // 使用验证器验证
      await this.validator.validateField(fieldName, value, this.options.mode, formData);
      
      // 清除错误
      this.clearFieldError(fieldName);
      this.setFieldValid(field);
      
      return true;
    } catch (error) {
      // 显示错误
      this.showFieldError(fieldName, error.message);
      this.setFieldInvalid(field);
      
      return false;
    }
  }
  

  
  // ==========================================================================
  // 工具方法
  // ==========================================================================
  
  collectFormData() {
    const formData = new FormData(this.form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    return data;
  }
  
  populateForm() {
    Object.entries(this.formData).forEach(([key, value]) => {
      const field = document.getElementById(key);
      if (field) {
        field.value = value || '';
        
        // 触发change事件以更新条件字段
        if (field.tagName === 'SELECT') {
          field.dispatchEvent(new Event('change'));
        }
      }
    });
  }
  
  hasUnsavedChanges() {
    if (this.options.mode === 'create') {
      // 创建模式：检查是否有任何输入
      const currentData = this.collectFormData();
      return Object.values(currentData).some(value => value !== '');
    } else {
      // 编辑模式：检查是否有更改
      const currentData = this.collectFormData();
      return JSON.stringify(currentData) !== JSON.stringify(this.formData);
    }
  }
  
  shouldShowField(field) {
    if (!field.dependsOn) return true;
    
    const dependentField = document.getElementById(field.dependsOn);
    if (!dependentField) return true;
    
    return dependentField.value === field.showWhen;
  }
  
  toggleConditionalFields(accountType) {
    const customProviderGroup = document.querySelector('[data-field="customPaymentProvider"]');
    if (customProviderGroup) {
      if (accountType === 'other') {
        customProviderGroup.style.display = 'block';
        const field = customProviderGroup.querySelector('input');
        if (field) field.required = true;
      } else {
        customProviderGroup.style.display = 'none';
        const field = customProviderGroup.querySelector('input');
        if (field) {
          field.required = false;
          field.value = '';
        }
      }
    }
  }
  
  focusFirstField() {
    const firstField = this.form.querySelector('input, select, textarea');
    if (firstField) {
      firstField.focus();
    }
  }
  
  initializeFieldStates() {
    // 初始化字符计数
    const fieldsWithCounter = this.form.querySelectorAll('[maxlength]');
    fieldsWithCounter.forEach(field => {
      this.updateCharacterCount(field);
    });
  }
  
  onFieldInput(field) {
    // 清除该字段的错误状态
    this.clearFieldError(field.name);
    
    // 特殊处理端口名称验证
    if (field.name === 'portName' && field.value.trim()) {
      this.validatePortNameDebounced(field.value.trim());
    }
    
    // 使用验证器的防抖验证
    const formData = this.collectFormData();
    this.validator.validateFieldDebounced(
      field.name,
      field.value.trim(),
      this.options.mode,
      formData,
      (error, isValid) => {
        if (error) {
          this.showFieldError(field.name, error.message);
          this.setFieldInvalid(field);
        } else if (isValid) {
          this.clearFieldError(field.name);
          this.setFieldValid(field);
        }
      },
      500
    );
  }
  
  /**
   * 防抖验证端口名称
   */
  validatePortNameDebounced(portName) {
    // 清除之前的定时器
    if (this.portValidationTimer) {
      clearTimeout(this.portValidationTimer);
    }
    
    // 设置新的定时器
    this.portValidationTimer = setTimeout(async () => {
      try {
        const result = await this.api.validatePortName(portName);
        const field = document.getElementById('portName');
        
        if (!result.available) {
          this.showFieldError('portName', result.message || '端口名称不可用');
          this.setFieldInvalid(field);
        } else {
          this.clearFieldError('portName');
          this.setFieldValid(field);
        }
      } catch (error) {
        console.warn('Port name validation failed:', error);
      }
    }, 800);
  }
  
  updateCharacterCount(field) {
    const counter = field.parentNode.querySelector('.field-counter');
    if (counter) {
      const current = counter.querySelector('.counter-current');
      const max = counter.querySelector('.counter-max');
      if (current && max) {
        const currentLength = field.value.length;
        const maxLength = parseInt(max.textContent);
        
        current.textContent = currentLength;
        
        // 更新样式状态
        counter.classList.remove('warning', 'error');
        if (currentLength > maxLength) {
          counter.classList.add('error');
        } else if (currentLength > maxLength * 0.8) {
          counter.classList.add('warning');
        }
      }
    }
  }
  
  /**
   * 清理自动完成实例
   */
  cleanupAutocompleteInstances() {
    if (this.autocompleteInstances) {
      this.autocompleteInstances.forEach(instance => {
        try {
          instance.destroy();
        } catch (error) {
          console.warn('Failed to destroy autocomplete instance:', error);
        }
      });
      this.autocompleteInstances = [];
    }
  }
  
  /**
   * 选择自动完成建议
   */
  selectSuggestion(field, suggestion) {
    const value = suggestion.agent_name || suggestion.name;
    field.value = value;
    this.hideSuggestions(document.getElementById(`suggestions-${field.name}`));
    
    // 触发input事件以更新验证状态
    field.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 更新使用计数（如果支持）
    this.updateSuggestionUsage(suggestion);
  }
  
  /**
   * 更新建议选择状态
   */
  updateSuggestionSelection(container, selectedIndex) {
    const suggestions = container.querySelectorAll('.autocomplete-suggestion');
    suggestions.forEach((item, index) => {
      item.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false');
    });
  }
  
  /**
   * 更新建议使用计数
   */
  async updateSuggestionUsage(suggestion) {
    const agentName = suggestion.agent_name || suggestion.name;
    if (agentName) {
      await this.api.updateSuggestionUsage(agentName);
    }
  }
  
  /**
   * 格式化货币输入
   */
  formatCurrencyInput(field) {
    let value = field.value.replace(/[^\d.]/g, '');
    
    // 限制小数点后两位
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1];
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    field.value = value;
  }
  
  /**
   * 验证货币输入
   */
  validateCurrencyInput(field) {
    const value = parseFloat(field.value);
    if (!isNaN(value) && value >= 0) {
      // 格式化为两位小数
      field.value = value.toFixed(2);
    }
  }
  
  // ==========================================================================
  // UI状态管理
  // ==========================================================================
  
  setSubmitButtonLoading(loading) {
    const operationId = `merchant-${this.options.mode}`;
    
    if (loading) {
      const message = this.options.mode === 'create' ? '创建中...' : '保存中...';
      if (this.errorHandler) {
        this.errorHandler.showLoading(operationId, message, {
          showSpinner: false,
          disableForm: false
        });
      } else {
        // 降级处理
        this.setSubmitButtonLoadingFallback(true);
      }
    } else {
      if (this.errorHandler) {
        this.errorHandler.hideLoading(operationId);
      } else {
        // 降级处理
        this.setSubmitButtonLoadingFallback(false);
      }
    }
  }
  
  setSubmitButtonLoadingFallback(loading) {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      const btnText = saveBtn.querySelector('.btn-text');
      const btnLoading = saveBtn.querySelector('.btn-loading');
      
      if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        saveBtn.disabled = true;
      } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        saveBtn.disabled = false;
      }
    }
  }
  
  showFieldError(fieldName, message) {
    const errorElement = document.getElementById(`error-${fieldName}`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    
    const field = document.getElementById(fieldName);
    if (field) {
      field.classList.add('error');
    }
  }
  
  clearFieldError(fieldName) {
    const errorElement = document.getElementById(`error-${fieldName}`);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
    
    const field = document.getElementById(fieldName);
    if (field) {
      field.classList.remove('error');
    }
  }
  
  clearAllErrors() {
    const errorElements = this.form.querySelectorAll('.field-error');
    errorElements.forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    
    const errorFields = this.form.querySelectorAll('.error');
    errorFields.forEach(field => {
      field.classList.remove('error');
    });
  }
  
  setFieldValid(field) {
    if (this.errorHandler) {
      this.errorHandler.setFieldValid(field);
    } else {
      field.classList.remove('error');
      field.classList.add('valid');
    }
  }
  
  setFieldInvalid(field) {
    if (this.errorHandler) {
      this.errorHandler.setFieldInvalid(field);
    } else {
      field.classList.remove('valid');
      field.classList.add('error');
    }
  }
  
  // ==========================================================================
  // API调用
  // ==========================================================================
  
  async submitForm(formData) {
    try {
      if (this.options.mode === 'create') {
        return await this.api.createMerchant(formData);
      } else {
        return await this.api.updateMerchant(this.options.merchantId, formData);
      }
    } catch (error) {
      // 重新抛出错误，让调用者处理
      throw error;
    }
  }
  
  async handleSubmitError(error) {
    const context = {
      operationId: `merchant-${this.options.mode}`,
      retryFunction: async () => {
        const formData = this.collectFormData();
        return await this.submitForm(formData);
      }
    };
    
    // 使用错误处理器处理错误
    await this.errorHandler.handleAPIError(error, context);
  }
  
  // ==========================================================================
  // 消息提示
  // ==========================================================================
  
  showSuccess(message) {
    if (this.errorHandler) {
      this.errorHandler.showSuccess(message);
    } else if (window.CJComponents && window.CJComponents.Toast) {
      window.CJComponents.Toast.success(message);
    } else {
      alert(message);
    }
  }
  
  showError(message) {
    if (this.errorHandler) {
      this.errorHandler.showGenericError(message);
    } else if (window.CJComponents && window.CJComponents.Toast) {
      window.CJComponents.Toast.error(message);
    } else {
      alert(message);
    }
  }
  
  showFieldError(fieldName, message) {
    if (this.errorHandler) {
      this.errorHandler.showFieldError(fieldName, message);
    } else {
      // 降级处理
      const errorContainer = document.getElementById(`error-${fieldName}`);
      if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
      }
    }
  }
  
  clearFieldError(fieldName) {
    if (this.errorHandler) {
      this.errorHandler.clearFieldError(fieldName);
    } else {
      // 降级处理
      const errorContainer = document.getElementById(`error-${fieldName}`);
      if (errorContainer) {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
      }
    }
  }
  
  clearAllErrors() {
    if (this.errorHandler) {
      this.errorHandler.clearAllFieldErrors();
    } else {
      // 降级处理
      const errorContainers = document.querySelectorAll('.field-error');
      errorContainers.forEach(container => {
        container.textContent = '';
        container.style.display = 'none';
      });
    }
  }
  
  // ==========================================================================
  // 工具函数
  // ==========================================================================
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ==========================================================================
// 表单字段配置
// ==========================================================================

/**
 * 商户表单字段配置
 * 注意：MERCHANT_FORM_FIELDS 已在 merchant-form-validation.js 中定义
 * 此文件依赖于 merchant-form-validation.js 先加载
 */

/**
 * 表单验证规则配置
 * 注意：VALIDATION_RULES 已在 merchant-form-validation.js 中定义
 */

/**
 * 表单分组配置
 * 注意：FORM_SECTIONS 已在 merchant-form-validation.js 中定义
 */

// ==========================================================================
// 表单验证器
// 注意：MerchantFormValidator 已在 merchant-form-validation.js 中定义
// ==========================================================================

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MerchantModal, MerchantFormValidator };
}

// 全局注册
if (typeof window !== 'undefined') {
  window.MerchantModal = MerchantModal;
  window.MerchantFormValidator = MerchantFormValidator;
}
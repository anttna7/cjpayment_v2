# 表单组件 (Form Components)

## 概述

表单组件系统提供了一套完整的表单控件，包括输入框、选择器、复选框、单选框等，以及高级功能如表单验证、表单向导和自动保存。所有组件都遵循统一的设计规范和可访问性标准。

## 特性

- ✅ 丰富的表单控件（输入框、选择器、复选框等）
- ✅ 实时验证和错误提示
- ✅ 表单向导（多步骤表单）
- ✅ 自动保存和恢复
- ✅ 智能联想和自动完成
- ✅ 响应式设计
- ✅ 可访问性支持
- ✅ 主题适配

## 基础表单控件

### 输入框 (Input)

```html
<!-- 基础文本输入框 -->
<div class="form-group">
    <label for="username" class="form-label">用户名</label>
    <input type="text" 
           id="username" 
           name="username" 
           class="form-input" 
           placeholder="请输入用户名"
           required>
    <div class="form-help">用户名长度应为3-20个字符</div>
</div>

<!-- 密码输入框 -->
<div class="form-group">
    <label for="password" class="form-label">密码</label>
    <div class="input-group">
        <input type="password" 
               id="password" 
               name="password" 
               class="form-input" 
               placeholder="请输入密码">
        <button type="button" class="input-group-btn" data-toggle-password>
            <i class="icon-eye"></i>
        </button>
    </div>
</div>

<!-- 数字输入框 -->
<div class="form-group">
    <label for="amount" class="form-label">充值金额</label>
    <div class="input-group">
        <span class="input-group-text">¥</span>
        <input type="number" 
               id="amount" 
               name="amount" 
               class="form-input" 
               placeholder="0.00"
               min="0"
               step="0.01">
        <span class="input-group-text">元</span>
    </div>
</div>
```

### 文本域 (Textarea)

```html
<div class="form-group">
    <label for="description" class="form-label">描述</label>
    <textarea id="description" 
              name="description" 
              class="form-textarea" 
              rows="4" 
              placeholder="请输入描述信息"></textarea>
    <div class="form-counter">
        <span class="current">0</span> / <span class="max">500</span>
    </div>
</div>
```

### 选择器 (Select)

```html
<!-- 单选下拉框 -->
<div class="form-group">
    <label for="category" class="form-label">分类</label>
    <select id="category" name="category" class="form-select">
        <option value="">请选择分类</option>
        <option value="recharge">充值</option>
        <option value="withdraw">提现</option>
        <option value="transfer">转账</option>
    </select>
</div>

<!-- 多选下拉框 -->
<div class="form-group">
    <label for="permissions" class="form-label">权限</label>
    <select id="permissions" 
            name="permissions" 
            class="form-select" 
            multiple 
            data-placeholder="请选择权限">
        <option value="read">查看</option>
        <option value="write">编辑</option>
        <option value="delete">删除</option>
        <option value="admin">管理</option>
    </select>
</div>
```

### 复选框和单选框

```html
<!-- 复选框 -->
<div class="form-group">
    <div class="form-check">
        <input type="checkbox" 
               id="agree" 
               name="agree" 
               class="form-check-input" 
               value="1">
        <label for="agree" class="form-check-label">
            我同意<a href="/terms">服务条款</a>和<a href="/privacy">隐私政策</a>
        </label>
    </div>
</div>

<!-- 复选框组 -->
<div class="form-group">
    <fieldset>
        <legend class="form-label">兴趣爱好</legend>
        <div class="form-check-group">
            <div class="form-check">
                <input type="checkbox" id="hobby1" name="hobbies" value="reading" class="form-check-input">
                <label for="hobby1" class="form-check-label">阅读</label>
            </div>
            <div class="form-check">
                <input type="checkbox" id="hobby2" name="hobbies" value="music" class="form-check-input">
                <label for="hobby2" class="form-check-label">音乐</label>
            </div>
            <div class="form-check">
                <input type="checkbox" id="hobby3" name="hobbies" value="sports" class="form-check-input">
                <label for="hobby3" class="form-check-label">运动</label>
            </div>
        </div>
    </fieldset>
</div>

<!-- 单选框组 -->
<div class="form-group">
    <fieldset>
        <legend class="form-label">性别</legend>
        <div class="form-radio-group">
            <div class="form-radio">
                <input type="radio" id="male" name="gender" value="male" class="form-radio-input">
                <label for="male" class="form-radio-label">男</label>
            </div>
            <div class="form-radio">
                <input type="radio" id="female" name="gender" value="female" class="form-radio-input">
                <label for="female" class="form-radio-label">女</label>
            </div>
            <div class="form-radio">
                <input type="radio" id="other" name="gender" value="other" class="form-radio-input">
                <label for="other" class="form-radio-label">其他</label>
            </div>
        </div>
    </fieldset>
</div>
```

### 开关 (Switch)

```html
<div class="form-group">
    <div class="form-switch">
        <input type="checkbox" 
               id="notifications" 
               name="notifications" 
               class="form-switch-input" 
               checked>
        <label for="notifications" class="form-switch-label">
            <span class="form-switch-slider"></span>
            接收通知
        </label>
    </div>
</div>
```

## 表单验证

### 内置验证规则

```html
<form class="form-validation" novalidate>
    <!-- 必填字段 -->
    <div class="form-group">
        <label for="email" class="form-label required">邮箱</label>
        <input type="email" 
               id="email" 
               name="email" 
               class="form-input" 
               required 
               data-validate="email">
        <div class="form-feedback invalid">请输入有效的邮箱地址</div>
    </div>
    
    <!-- 长度验证 -->
    <div class="form-group">
        <label for="phone" class="form-label required">手机号</label>
        <input type="tel" 
               id="phone" 
               name="phone" 
               class="form-input" 
               required 
               pattern="^1[3-9]\d{9}$"
               data-validate="phone">
        <div class="form-feedback invalid">请输入有效的手机号码</div>
    </div>
    
    <!-- 数值范围验证 -->
    <div class="form-group">
        <label for="age" class="form-label">年龄</label>
        <input type="number" 
               id="age" 
               name="age" 
               class="form-input" 
               min="18" 
               max="100"
               data-validate="range">
        <div class="form-feedback invalid">年龄必须在18-100之间</div>
    </div>
    
    <!-- 确认密码验证 -->
    <div class="form-group">
        <label for="password-confirm" class="form-label required">确认密码</label>
        <input type="password" 
               id="password-confirm" 
               name="password_confirm" 
               class="form-input" 
               required 
               data-validate="confirm"
               data-confirm-target="password">
        <div class="form-feedback invalid">两次输入的密码不一致</div>
    </div>
    
    <div class="form-actions">
        <button type="submit" class="btn btn-primary">提交</button>
    </div>
</form>
```

### 自定义验证规则

```javascript
// 注册自定义验证规则
FormValidation.addRule('idcard', {
    validate: function(value) {
        // 身份证号验证逻辑
        const pattern = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
        return pattern.test(value);
    },
    message: '请输入有效的身份证号码'
});

// 使用自定义规则
const validator = new FormValidation({
    form: document.querySelector('#user-form'),
    rules: {
        idcard: 'idcard',
        email: 'required|email',
        phone: 'required|phone',
        age: 'required|range:18,100'
    },
    messages: {
        'email.required': '邮箱不能为空',
        'email.email': '邮箱格式不正确'
    }
});
```

## 表单向导 (Form Wizard)

### 基本结构

```html
<div class="form-wizard" data-wizard="user-registration">
    <!-- 步骤指示器 -->
    <div class="wizard-steps">
        <div class="wizard-step active" data-step="1">
            <div class="step-number">1</div>
            <div class="step-title">基本信息</div>
            <div class="step-description">填写个人基本信息</div>
        </div>
        <div class="wizard-step" data-step="2">
            <div class="step-number">2</div>
            <div class="step-title">账户设置</div>
            <div class="step-description">设置登录账户</div>
        </div>
        <div class="wizard-step" data-step="3">
            <div class="step-number">3</div>
            <div class="step-title">完成注册</div>
            <div class="step-description">确认信息并提交</div>
        </div>
    </div>
    
    <!-- 步骤内容 -->
    <div class="wizard-content">
        <!-- 第一步：基本信息 -->
        <div class="wizard-panel active" data-panel="1">
            <div class="panel-header">
                <h3>基本信息</h3>
                <p>请填写您的个人基本信息</p>
            </div>
            <div class="panel-body">
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="first-name" class="form-label required">姓</label>
                        <input type="text" id="first-name" name="first_name" class="form-input" required>
                    </div>
                    <div class="form-group col-md-6">
                        <label for="last-name" class="form-label required">名</label>
                        <input type="text" id="last-name" name="last_name" class="form-input" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="birth-date" class="form-label">出生日期</label>
                    <input type="date" id="birth-date" name="birth_date" class="form-input">
                </div>
            </div>
        </div>
        
        <!-- 第二步：账户设置 -->
        <div class="wizard-panel" data-panel="2">
            <div class="panel-header">
                <h3>账户设置</h3>
                <p>设置您的登录账户信息</p>
            </div>
            <div class="panel-body">
                <div class="form-group">
                    <label for="username" class="form-label required">用户名</label>
                    <input type="text" id="username" name="username" class="form-input" required>
                </div>
                <div class="form-group">
                    <label for="email" class="form-label required">邮箱</label>
                    <input type="email" id="email" name="email" class="form-input" required>
                </div>
                <div class="form-group">
                    <label for="password" class="form-label required">密码</label>
                    <input type="password" id="password" name="password" class="form-input" required>
                </div>
            </div>
        </div>
        
        <!-- 第三步：确认信息 -->
        <div class="wizard-panel" data-panel="3">
            <div class="panel-header">
                <h3>确认信息</h3>
                <p>请确认您填写的信息是否正确</p>
            </div>
            <div class="panel-body">
                <div class="confirmation-summary">
                    <!-- 动态生成的确认信息 -->
                </div>
            </div>
        </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="wizard-actions">
        <button type="button" class="btn btn-secondary" data-wizard-prev disabled>
            <i class="icon-arrow-left"></i>
            上一步
        </button>
        <button type="button" class="btn btn-primary" data-wizard-next>
            下一步
            <i class="icon-arrow-right"></i>
        </button>
        <button type="submit" class="btn btn-success" data-wizard-submit style="display: none;">
            <i class="icon-check"></i>
            完成注册
        </button>
    </div>
</div>
```

## JavaScript API

### 表单验证 API

```javascript
// 创建表单验证实例
const validator = new FormValidation({
    form: document.querySelector('#my-form'),
    realtime: true,
    rules: {
        username: 'required|min:3|max:20',
        email: 'required|email',
        password: 'required|min:8',
        password_confirm: 'required|confirm:password'
    },
    messages: {
        'username.required': '用户名不能为空',
        'username.min': '用户名至少3个字符',
        'email.email': '邮箱格式不正确'
    }
});

// 验证方法
validator.validate(); // 验证整个表单
validator.validateField('email'); // 验证单个字段
validator.isValid(); // 检查表单是否有效

// 事件监听
validator.on('valid', function(field) {
    console.log('字段验证通过:', field);
});

validator.on('invalid', function(field, errors) {
    console.log('字段验证失败:', field, errors);
});

validator.on('submit', function(data) {
    console.log('表单提交:', data);
});
```

### 表单向导 API

```javascript
// 创建表单向导实例
const wizard = new FormWizard({
    element: document.querySelector('[data-wizard="user-registration"]'),
    validation: true,
    autoSave: true,
    saveKey: 'user-registration-draft'
});

// 导航方法
wizard.next(); // 下一步
wizard.prev(); // 上一步
wizard.goToStep(2); // 跳转到指定步骤
wizard.getCurrentStep(); // 获取当前步骤

// 数据方法
wizard.getData(); // 获取所有数据
wizard.getStepData(1); // 获取指定步骤数据
wizard.setData({username: 'john'}); // 设置数据

// 事件监听
wizard.on('stepChange', function(step, direction) {
    console.log('步骤变化:', step, direction);
});

wizard.on('beforeNext', function(currentStep) {
    // 可以返回 false 阻止前进
    return this.validateCurrentStep();
});

wizard.on('submit', function(data) {
    console.log('向导提交:', data);
});
```

### 自动保存功能

```javascript
// 启用自动保存
const autoSave = new FormAutoSave({
    form: document.querySelector('#my-form'),
    saveInterval: 30000, // 30秒保存一次
    storageKey: 'form-draft',
    excludeFields: ['password', 'password_confirm']
});

// 手动保存
autoSave.save();

// 恢复数据
autoSave.restore();

// 清除保存的数据
autoSave.clear();

// 事件监听
autoSave.on('save', function(data) {
    console.log('表单已自动保存');
});

autoSave.on('restore', function(data) {
    console.log('表单数据已恢复');
});
```

## 高级功能

### 智能联想

```html
<div class="form-group">
    <label for="city" class="form-label">城市</label>
    <input type="text" 
           id="city" 
           name="city" 
           class="form-input" 
           data-autocomplete="/api/cities"
           data-autocomplete-min="2"
           placeholder="输入城市名称">
    <div class="autocomplete-suggestions"></div>
</div>

<script>
// 初始化自动完成
new AutoComplete({
    input: document.getElementById('city'),
    source: '/api/cities',
    minLength: 2,
    delay: 300,
    renderItem: function(item) {
        return `<div class="autocomplete-item">${item.name}</div>`;
    },
    onSelect: function(item) {
        console.log('选择了:', item);
    }
});
</script>
```

### 文件上传

```html
<div class="form-group">
    <label class="form-label">头像上传</label>
    <div class="file-upload" data-upload="avatar">
        <div class="upload-area">
            <div class="upload-icon">
                <i class="icon-upload"></i>
            </div>
            <div class="upload-text">
                <p>点击或拖拽文件到此处上传</p>
                <p class="text-muted">支持 JPG、PNG 格式，最大 2MB</p>
            </div>
            <input type="file" 
                   name="avatar" 
                   accept="image/jpeg,image/png" 
                   class="upload-input">
        </div>
        <div class="upload-preview"></div>
        <div class="upload-progress" style="display: none;">
            <div class="progress-bar"></div>
            <div class="progress-text">0%</div>
        </div>
    </div>
</div>

<script>
// 初始化文件上传
new FileUpload({
    element: document.querySelector('[data-upload="avatar"]'),
    url: '/api/upload',
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png'],
    preview: true,
    onProgress: function(percent) {
        console.log('上传进度:', percent);
    },
    onSuccess: function(response) {
        console.log('上传成功:', response);
    },
    onError: function(error) {
        console.log('上传失败:', error);
    }
});
</script>
```

### 动态表单字段

```html
<div class="form-group">
    <label class="form-label">联系方式</label>
    <div class="dynamic-fields" data-dynamic="contacts">
        <div class="dynamic-field">
            <div class="form-row">
                <div class="form-group col-md-4">
                    <select name="contacts[0][type]" class="form-select">
                        <option value="phone">电话</option>
                        <option value="email">邮箱</option>
                        <option value="wechat">微信</option>
                    </select>
                </div>
                <div class="form-group col-md-6">
                    <input type="text" name="contacts[0][value]" class="form-input" placeholder="联系方式">
                </div>
                <div class="form-group col-md-2">
                    <button type="button" class="btn btn-outline btn-remove-field">
                        <i class="icon-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    <button type="button" class="btn btn-outline btn-add-field" data-target="contacts">
        <i class="icon-plus"></i>
        添加联系方式
    </button>
</div>

<script>
// 初始化动态字段
new DynamicFields({
    container: document.querySelector('[data-dynamic="contacts"]'),
    addButton: document.querySelector('[data-target="contacts"]'),
    maxFields: 5,
    template: function(index) {
        return `
            <div class="dynamic-field">
                <div class="form-row">
                    <div class="form-group col-md-4">
                        <select name="contacts[${index}][type]" class="form-select">
                            <option value="phone">电话</option>
                            <option value="email">邮箱</option>
                            <option value="wechat">微信</option>
                        </select>
                    </div>
                    <div class="form-group col-md-6">
                        <input type="text" name="contacts[${index}][value]" class="form-input" placeholder="联系方式">
                    </div>
                    <div class="form-group col-md-2">
                        <button type="button" class="btn btn-outline btn-remove-field">
                            <i class="icon-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
});
</script>
```

## 样式定制

### CSS 变量

```css
.form-group {
    /* 间距 */
    --form-group-margin: var(--space-6);
    
    /* 标签样式 */
    --form-label-color: var(--text-primary);
    --form-label-font-size: var(--font-size-sm);
    --form-label-font-weight: var(--font-weight-medium);
    --form-label-margin: var(--space-2);
    
    /* 输入框样式 */
    --form-input-bg: var(--bg-primary);
    --form-input-border: 1px solid var(--border-primary);
    --form-input-border-radius: var(--radius-md);
    --form-input-padding: var(--space-3) var(--space-4);
    --form-input-font-size: var(--font-size-base);
    --form-input-line-height: var(--line-height-normal);
    
    /* 焦点状态 */
    --form-input-focus-border: var(--primary-500);
    --form-input-focus-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    
    /* 验证状态 */
    --form-input-valid-border: var(--success-500);
    --form-input-invalid-border: var(--error-500);
    
    /* 帮助文本 */
    --form-help-color: var(--text-tertiary);
    --form-help-font-size: var(--font-size-xs);
    
    /* 反馈文本 */
    --form-feedback-font-size: var(--font-size-xs);
    --form-feedback-valid-color: var(--success-600);
    --form-feedback-invalid-color: var(--error-600);
}
```

### 自定义主题

```css
/* 紧凑型表单 */
.form-compact {
    --form-group-margin: var(--space-4);
    --form-input-padding: var(--space-2) var(--space-3);
    --form-label-font-size: var(--font-size-xs);
}

/* 大尺寸表单 */
.form-large {
    --form-input-padding: var(--space-4) var(--space-6);
    --form-input-font-size: var(--font-size-lg);
    --form-label-font-size: var(--font-size-base);
}

/* 圆角表单 */
.form-rounded {
    --form-input-border-radius: var(--radius-full);
}

/* 无边框表单 */
.form-borderless .form-input {
    --form-input-border: none;
    --form-input-bg: var(--bg-secondary);
}

.form-borderless .form-input:focus {
    --form-input-bg: var(--bg-primary);
    --form-input-border: 1px solid var(--primary-500);
}
```

## 可访问性

### ARIA 属性和语义化

```html
<!-- 表单区域 -->
<form role="form" aria-labelledby="form-title">
    <h2 id="form-title">用户注册</h2>
    
    <!-- 必填字段组 -->
    <fieldset>
        <legend>基本信息（必填）</legend>
        
        <!-- 输入框 -->
        <div class="form-group">
            <label for="username" class="form-label">
                用户名
                <span class="required" aria-label="必填">*</span>
            </label>
            <input type="text" 
                   id="username" 
                   name="username" 
                   class="form-input"
                   required
                   aria-describedby="username-help username-error"
                   aria-invalid="false">
            <div id="username-help" class="form-help">
                用户名长度应为3-20个字符
            </div>
            <div id="username-error" class="form-feedback invalid" aria-live="polite">
                <!-- 错误信息将动态插入 -->
            </div>
        </div>
    </fieldset>
    
    <!-- 可选字段组 -->
    <fieldset>
        <legend>其他信息（可选）</legend>
        
        <!-- 单选框组 -->
        <div class="form-group" role="radiogroup" aria-labelledby="gender-legend">
            <div id="gender-legend" class="form-label">性别</div>
            <div class="form-radio">
                <input type="radio" id="male" name="gender" value="male" class="form-radio-input">
                <label for="male" class="form-radio-label">男</label>
            </div>
            <div class="form-radio">
                <input type="radio" id="female" name="gender" value="female" class="form-radio-input">
                <label for="female" class="form-radio-label">女</label>
            </div>
        </div>
    </fieldset>
    
    <!-- 提交按钮 -->
    <div class="form-actions">
        <button type="submit" class="btn btn-primary" aria-describedby="submit-help">
            注册账户
        </button>
        <div id="submit-help" class="sr-only">
            点击注册按钮将创建您的账户
        </div>
    </div>
</form>
```

### 键盘导航

```javascript
// 表单键盘导航增强
class FormKeyboardNavigation {
    constructor(form) {
        this.form = form;
        this.init();
    }
    
    init() {
        this.form.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
                this.handleEnterKey(event);
                break;
            case 'Escape':
                this.handleEscapeKey(event);
                break;
            case 'Tab':
                this.handleTabKey(event);
                break;
        }
    }
    
    handleEnterKey(event) {
        const target = event.target;
        
        // 在文本域中允许换行
        if (target.tagName === 'TEXTAREA') {
            return;
        }
        
        // 在其他输入框中跳转到下一个字段
        if (target.matches('input, select')) {
            event.preventDefault();
            this.focusNextField(target);
        }
    }
    
    handleEscapeKey(event) {
        // 清除当前字段的错误状态
        const target = event.target;
        if (target.matches('input, select, textarea')) {
            this.clearFieldError(target);
        }
    }
    
    focusNextField(currentField) {
        const fields = Array.from(this.form.querySelectorAll('input, select, textarea, button'));
        const currentIndex = fields.indexOf(currentField);
        const nextField = fields[currentIndex + 1];
        
        if (nextField) {
            nextField.focus();
        }
    }
    
    clearFieldError(field) {
        field.classList.remove('invalid');
        const errorElement = document.getElementById(field.getAttribute('aria-describedby'));
        if (errorElement) {
            errorElement.textContent = '';
        }
    }
}

// 为所有表单启用键盘导航
document.querySelectorAll('form').forEach(form => {
    new FormKeyboardNavigation(form);
});
```

## 最佳实践

### 表单设计原则

1. **清晰的标签**: 每个输入字段都应该有清晰、描述性的标签
2. **逻辑分组**: 使用 fieldset 和 legend 对相关字段进行分组
3. **即时反馈**: 提供实时验证和清晰的错误信息
4. **渐进增强**: 确保在 JavaScript 禁用时表单仍然可用
5. **移动友好**: 使用适当的输入类型和键盘

### 推荐用法

```html
<!-- ✅ 推荐：清晰的表单结构 -->
<form class="user-form" novalidate>
    <fieldset>
        <legend>账户信息</legend>
        
        <div class="form-row">
            <div class="form-group col-md-6">
                <label for="first-name" class="form-label required">姓</label>
                <input type="text" 
                       id="first-name" 
                       name="first_name" 
                       class="form-input" 
                       required
                       autocomplete="given-name"
                       aria-describedby="first-name-help">
                <div id="first-name-help" class="form-help">请输入您的姓</div>
            </div>
            
            <div class="form-group col-md-6">
                <label for="last-name" class="form-label required">名</label>
                <input type="text" 
                       id="last-name" 
                       name="last_name" 
                       class="form-input" 
                       required
                       autocomplete="family-name"
                       aria-describedby="last-name-help">
                <div id="last-name-help" class="form-help">请输入您的名</div>
            </div>
        </div>
        
        <div class="form-group">
            <label for="email" class="form-label required">邮箱地址</label>
            <input type="email" 
                   id="email" 
                   name="email" 
                   class="form-input" 
                   required
                   autocomplete="email"
                   aria-describedby="email-help email-error">
            <div id="email-help" class="form-help">我们将使用此邮箱发送重要通知</div>
            <div id="email-error" class="form-feedback invalid" aria-live="polite"></div>
        </div>
    </fieldset>
    
    <div class="form-actions">
        <button type="submit" class="btn btn-primary">
            <i class="icon-user-plus"></i>
            创建账户
        </button>
        <button type="reset" class="btn btn-secondary">
            重置表单
        </button>
    </div>
</form>
```

### 避免的用法

```html
<!-- ❌ 避免：缺少标签和结构 -->
<form>
    <input type="text" placeholder="用户名">
    <input type="password" placeholder="密码">
    <button>提交</button>
</form>

<!-- ❌ 避免：不清晰的错误信息 -->
<input type="email" class="error">
<span style="color: red;">错误</span>

<!-- ❌ 避免：不合理的字段顺序 -->
<form>
    <input type="submit" value="提交">
    <input type="text" placeholder="姓名">
    <input type="email" placeholder="邮箱">
</form>
```

## 浏览器兼容性

| 浏览器 | 版本 | 支持状态 | 备注 |
|--------|------|----------|------|
| Chrome | 70+ | ✅ 完全支持 | 包括 HTML5 表单验证 |
| Firefox | 65+ | ✅ 完全支持 | 包括 HTML5 表单验证 |
| Safari | 12+ | ✅ 完全支持 | 包括 HTML5 表单验证 |
| Edge | 79+ | ✅ 完全支持 | 包括 HTML5 表单验证 |
| IE | 11 | ⚠️ 部分支持 | 需要 polyfill 支持 |

## 更新日志

### v1.4.0 (2025-01-05)
- 新增动态字段功能
- 优化文件上传组件
- 增强表单向导功能
- 改进可访问性支持

### v1.3.0 (2025-01-03)
- 新增自动保存功能
- 支持智能联想
- 改进验证系统
- 新增开关组件

### v1.2.0 (2025-01-02)
- 新增表单向导
- 支持实时验证
- 改进样式系统

### v1.1.0 (2025-01-01)
- 新增复选框和单选框组件
- 支持自定义验证规则
- 改进响应式设计

### v1.0.0 (2024-12-30)
- 初始版本发布
- 基础表单控件
- 表单验证功能
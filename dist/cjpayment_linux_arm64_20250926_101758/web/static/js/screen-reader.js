/**
 * 屏幕阅读器支持管理器 - Screen Reader Support Manager
 * 提供ARIA标签、语义化标记和屏幕阅读器通知功能
 */

class ScreenReaderManager {
    constructor() {
        this.announcer = null;
        this.statusRegion = null;
        this.alertRegion = null;
        this.logRegion = null;
        this.ariaDescriptions = new Map();
        this.dynamicContent = new Set();
        
        this.init();
    }
    
    init() {
        this.createAriaLiveRegions();
        this.enhanceExistingElements();
        this.setupDynamicContentObserver();
        this.setupFormEnhancements();
        this.setupNavigationEnhancements();
        this.setupTableEnhancements();
        this.setupModalEnhancements();
        
        console.log('屏幕阅读器支持管理器已初始化');
    }
    
    /**
     * 创建ARIA Live区域
     */
    createAriaLiveRegions() {
        // 创建公告区域 (polite)
        this.announcer = document.createElement('div');
        this.announcer.id = 'aria-announcer';
        this.announcer.className = 'sr-only';
        this.announcer.setAttribute('aria-live', 'polite');
        this.announcer.setAttribute('aria-atomic', 'true');
        this.announcer.setAttribute('aria-relevant', 'additions text');
        document.body.appendChild(this.announcer);
        
        // 创建状态区域 (assertive)
        this.statusRegion = document.createElement('div');
        this.statusRegion.id = 'aria-status';
        this.statusRegion.className = 'sr-only';
        this.statusRegion.setAttribute('aria-live', 'assertive');
        this.statusRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.statusRegion);
        
        // 创建警告区域 (assertive)
        this.alertRegion = document.createElement('div');
        this.alertRegion.id = 'aria-alert';
        this.alertRegion.className = 'sr-only';
        this.alertRegion.setAttribute('role', 'alert');
        this.alertRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.alertRegion);
        
        // 创建日志区域 (polite)
        this.logRegion = document.createElement('div');
        this.logRegion.id = 'aria-log';
        this.logRegion.className = 'sr-only';
        this.logRegion.setAttribute('role', 'log');
        this.logRegion.setAttribute('aria-live', 'polite');
        this.logRegion.setAttribute('aria-atomic', 'false');
        document.body.appendChild(this.logRegion);
    }
    
    /**
     * 向屏幕阅读器宣布消息
     */
    announce(message, priority = 'polite', options = {}) {
        if (!message || typeof message !== 'string') return;
        
        const { 
            atomic = true, 
            relevant = 'additions text',
            delay = 100,
            clear = true 
        } = options;
        
        let targetRegion;
        
        switch (priority) {
            case 'assertive':
                targetRegion = this.statusRegion;
                break;
            case 'alert':
                targetRegion = this.alertRegion;
                break;
            case 'log':
                targetRegion = this.logRegion;
                break;
            default:
                targetRegion = this.announcer;
        }
        
        if (!targetRegion) return;
        
        // 清除之前的内容（如果需要）
        if (clear) {
            targetRegion.textContent = '';
        }
        
        // 延迟添加内容以确保屏幕阅读器能够检测到变化
        setTimeout(() => {
            if (priority === 'log' && !clear) {
                // 对于日志，追加内容
                const logEntry = document.createElement('div');
                logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
                targetRegion.appendChild(logEntry);
                
                // 限制日志条目数量
                const entries = targetRegion.children;
                if (entries.length > 10) {
                    targetRegion.removeChild(entries[0]);
                }
            } else {
                targetRegion.textContent = message;
            }
            
            // 自动清除内容（除了日志）
            if (priority !== 'log' && clear) {
                setTimeout(() => {
                    targetRegion.textContent = '';
                }, 1000);
            }
        }, delay);
    }
    
    /**
     * 增强现有元素的可访问性
     */
    enhanceExistingElements() {
        this.enhanceButtons();
        this.enhanceLinks();
        this.enhanceImages();
        this.enhanceHeadings();
        this.enhanceLandmarks();
        this.enhanceInteractiveElements();
    }
    
    /**
     * 增强按钮元素
     */
    enhanceButtons() {
        document.querySelectorAll('button, .btn').forEach(button => {
            // 确保按钮有role属性
            if (!button.hasAttribute('role')) {
                button.setAttribute('role', 'button');
            }
            
            // 为图标按钮添加标签
            if (this.isIconOnlyButton(button)) {
                this.addAriaLabel(button);
            }
            
            // 为加载状态添加描述
            if (button.classList.contains('btn--loading')) {
                button.setAttribute('aria-busy', 'true');
                button.setAttribute('aria-describedby', this.createDescription('正在处理，请稍候...'));
            }
            
            // 为禁用按钮添加描述
            if (button.disabled || button.classList.contains('btn--disabled')) {
                button.setAttribute('aria-disabled', 'true');
            }
            
            // 监听状态变化
            this.observeButtonState(button);
        });
    }
    
    /**
     * 检查是否为仅图标按钮
     */
    isIconOnlyButton(button) {
        const text = button.textContent.trim();
        const hasIcon = button.querySelector('.btn__icon, [class*="icon"]');
        return hasIcon && (!text || text.length < 3);
    }
    
    /**
     * 为元素添加ARIA标签
     */
    addAriaLabel(element, label = null) {
        if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) {
            return;
        }
        
        if (!label) {
            // 尝试从多个来源推断标签
            label = this.inferAriaLabel(element);
        }
        
        if (label) {
            element.setAttribute('aria-label', label);
        }
    }
    
    /**
     * 推断ARIA标签
     */
    inferAriaLabel(element) {
        // 从title属性
        if (element.title) {
            return element.title;
        }
        
        // 从data属性
        if (element.dataset.label) {
            return element.dataset.label;
        }
        
        // 从图标类名推断
        const iconElement = element.querySelector('[class*="icon"]');
        if (iconElement) {
            const iconClass = iconElement.className;
            if (iconClass.includes('search')) return '搜索';
            if (iconClass.includes('close') || iconClass.includes('times')) return '关闭';
            if (iconClass.includes('menu') || iconClass.includes('bars')) return '菜单';
            if (iconClass.includes('edit') || iconClass.includes('pencil')) return '编辑';
            if (iconClass.includes('delete') || iconClass.includes('trash')) return '删除';
            if (iconClass.includes('save') || iconClass.includes('check')) return '保存';
            if (iconClass.includes('add') || iconClass.includes('plus')) return '添加';
            if (iconClass.includes('download')) return '下载';
            if (iconClass.includes('upload')) return '上传';
            if (iconClass.includes('print')) return '打印';
            if (iconClass.includes('share')) return '分享';
            if (iconClass.includes('copy')) return '复制';
            if (iconClass.includes('refresh') || iconClass.includes('reload')) return '刷新';
            if (iconClass.includes('settings') || iconClass.includes('gear')) return '设置';
            if (iconClass.includes('help') || iconClass.includes('question')) return '帮助';
            if (iconClass.includes('info')) return '信息';
            if (iconClass.includes('warning')) return '警告';
            if (iconClass.includes('error')) return '错误';
        }
        
        // 从按钮文本内容
        const textContent = element.textContent.trim();
        if (textContent && textContent.length > 0) {
            return textContent;
        }
        
        return null;
    }
    
    /**
     * 监听按钮状态变化
     */
    observeButtonState(button) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'disabled') {
                        const isDisabled = button.disabled;
                        button.setAttribute('aria-disabled', isDisabled.toString());
                        
                        if (isDisabled) {
                            this.announce(`${this.getElementLabel(button)} 已禁用`, 'polite');
                        }
                    }
                    
                    if (mutation.attributeName === 'class') {
                        const isLoading = button.classList.contains('btn--loading');
                        button.setAttribute('aria-busy', isLoading.toString());
                        
                        if (isLoading) {
                            this.announce(`${this.getElementLabel(button)} 正在处理`, 'polite');
                        }
                    }
                }
            });
        });
        
        observer.observe(button, {
            attributes: true,
            attributeFilter: ['disabled', 'class']
        });
    }
    
    /**
     * 获取元素标签
     */
    getElementLabel(element) {
        return element.getAttribute('aria-label') || 
               element.textContent.trim() || 
               element.title || 
               '按钮';
    }
    
    /**
     * 增强链接元素
     */
    enhanceLinks() {
        document.querySelectorAll('a').forEach(link => {
            // 为外部链接添加描述
            if (this.isExternalLink(link)) {
                const description = this.createDescription('外部链接，将在新窗口打开');
                link.setAttribute('aria-describedby', description);
                
                if (!link.hasAttribute('rel')) {
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            }
            
            // 为下载链接添加描述
            if (link.hasAttribute('download')) {
                const description = this.createDescription('下载链接');
                link.setAttribute('aria-describedby', description);
            }
            
            // 为邮件链接添加描述
            if (link.href.startsWith('mailto:')) {
                const description = this.createDescription('邮件链接');
                link.setAttribute('aria-describedby', description);
            }
            
            // 为电话链接添加描述
            if (link.href.startsWith('tel:')) {
                const description = this.createDescription('电话链接');
                link.setAttribute('aria-describedby', description);
            }
        });
    }
    
    /**
     * 检查是否为外部链接
     */
    isExternalLink(link) {
        return link.hostname && link.hostname !== window.location.hostname;
    }
    
    /**
     * 增强图片元素
     */
    enhanceImages() {
        document.querySelectorAll('img').forEach(img => {
            // 为装饰性图片添加空alt属性
            if (this.isDecorativeImage(img)) {
                img.setAttribute('alt', '');
                img.setAttribute('role', 'presentation');
            }
            
            // 为缺少alt属性的图片添加警告
            if (!img.hasAttribute('alt')) {
                console.warn('图片缺少alt属性:', img.src);
                img.setAttribute('alt', '图片');
            }
            
            // 为复杂图片添加长描述
            if (img.hasAttribute('data-longdesc')) {
                const longdesc = img.getAttribute('data-longdesc');
                const description = this.createDescription(longdesc);
                img.setAttribute('aria-describedby', description);
            }
        });
    }
    
    /**
     * 检查是否为装饰性图片
     */
    isDecorativeImage(img) {
        return img.classList.contains('decorative') ||
               img.hasAttribute('data-decorative') ||
               img.closest('.icon, .logo, .avatar');
    }
    
    /**
     * 增强标题元素
     */
    enhanceHeadings() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let currentLevel = 0;
        
        headings.forEach(heading => {
            const level = parseInt(heading.tagName.charAt(1));
            
            // 检查标题层级是否合理
            if (level > currentLevel + 1) {
                console.warn(`标题层级跳跃: 从 h${currentLevel} 跳到 h${level}`, heading);
            }
            
            currentLevel = level;
            
            // 为标题添加导航功能
            if (!heading.id) {
                heading.id = this.generateHeadingId(heading);
            }
            
            // 为可点击标题添加role
            if (heading.onclick || heading.classList.contains('clickable')) {
                heading.setAttribute('role', 'button');
                heading.setAttribute('tabindex', '0');
            }
        });
    }
    
    /**
     * 生成标题ID
     */
    generateHeadingId(heading) {
        const text = heading.textContent.trim();
        const id = text.toLowerCase()
                      .replace(/[^\w\s-]/g, '')
                      .replace(/\s+/g, '-')
                      .substring(0, 50);
        
        // 确保ID唯一
        let uniqueId = id;
        let counter = 1;
        while (document.getElementById(uniqueId)) {
            uniqueId = `${id}-${counter}`;
            counter++;
        }
        
        return uniqueId;
    }
    
    /**
     * 增强地标元素
     */
    enhanceLandmarks() {
        // 确保主要地标存在
        this.ensureLandmark('main', 'main, .main-content, .content');
        this.ensureLandmark('navigation', 'nav, .navbar, .navigation');
        this.ensureLandmark('banner', 'header, .header');
        this.ensureLandmark('contentinfo', 'footer, .footer');
        this.ensureLandmark('complementary', 'aside, .sidebar');
        this.ensureLandmark('search', '.search-form, .search-container');
        
        // 为多个相同类型的地标添加标签
        this.labelMultipleLandmarks();
    }
    
    /**
     * 确保地标存在
     */
    ensureLandmark(role, selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (!element.hasAttribute('role')) {
                element.setAttribute('role', role);
            }
        });
    }
    
    /**
     * 为多个相同类型的地标添加标签
     */
    labelMultipleLandmarks() {
        const landmarkTypes = ['navigation', 'main', 'complementary', 'banner', 'contentinfo'];
        
        landmarkTypes.forEach(type => {
            const landmarks = document.querySelectorAll(`[role="${type}"]`);
            if (landmarks.length > 1) {
                landmarks.forEach((landmark, index) => {
                    if (!landmark.hasAttribute('aria-label') && !landmark.hasAttribute('aria-labelledby')) {
                        const label = this.generateLandmarkLabel(type, index + 1);
                        landmark.setAttribute('aria-label', label);
                    }
                });
            }
        });
    }
    
    /**
     * 生成地标标签
     */
    generateLandmarkLabel(type, index) {
        const labels = {
            navigation: `导航 ${index}`,
            main: `主要内容 ${index}`,
            complementary: `侧边栏 ${index}`,
            banner: `页头 ${index}`,
            contentinfo: `页脚 ${index}`
        };
        
        return labels[type] || `${type} ${index}`;
    }
    
    /**
     * 增强交互元素
     */
    enhanceInteractiveElements() {
        // 增强可点击元素
        document.querySelectorAll('[onclick], .clickable').forEach(element => {
            if (!element.hasAttribute('role')) {
                element.setAttribute('role', 'button');
            }
            
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
            
            // 添加键盘事件支持
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
        });
        
        // 增强拖拽元素
        document.querySelectorAll('[draggable="true"]').forEach(element => {
            element.setAttribute('aria-grabbed', 'false');
            
            element.addEventListener('dragstart', () => {
                element.setAttribute('aria-grabbed', 'true');
                this.announce(`开始拖拽 ${this.getElementLabel(element)}`, 'assertive');
            });
            
            element.addEventListener('dragend', () => {
                element.setAttribute('aria-grabbed', 'false');
                this.announce(`结束拖拽 ${this.getElementLabel(element)}`, 'assertive');
            });
        });
    }
    
    /**
     * 设置表单增强
     */
    setupFormEnhancements() {
        // 增强表单字段
        document.querySelectorAll('input, select, textarea').forEach(field => {
            this.enhanceFormField(field);
        });
        
        // 增强表单组
        document.querySelectorAll('fieldset').forEach(fieldset => {
            this.enhanceFieldset(fieldset);
        });
        
        // 增强表单验证
        this.setupFormValidation();
    }
    
    /**
     * 增强表单字段
     */
    enhanceFormField(field) {
        // 确保字段有标签
        this.ensureFieldLabel(field);
        
        // 添加必填标识
        if (field.hasAttribute('required')) {
            field.setAttribute('aria-required', 'true');
        }
        
        // 添加描述文本
        this.linkFieldDescription(field);
        
        // 添加错误消息
        this.linkFieldError(field);
        
        // 监听字段变化
        this.observeFieldChanges(field);
    }
    
    /**
     * 确保字段有标签
     */
    ensureFieldLabel(field) {
        const fieldId = field.id || this.generateFieldId(field);
        field.id = fieldId;
        
        // 查找关联的标签
        let label = document.querySelector(`label[for="${fieldId}"]`);
        
        if (!label) {
            // 查找包含字段的标签
            label = field.closest('label');
        }
        
        if (!label && !field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
            // 尝试从占位符或名称创建标签
            const labelText = field.placeholder || field.name || '输入字段';
            field.setAttribute('aria-label', labelText);
        }
    }
    
    /**
     * 生成字段ID
     */
    generateFieldId(field) {
        const name = field.name || field.type || 'field';
        let id = `field-${name}`;
        let counter = 1;
        
        while (document.getElementById(id)) {
            id = `field-${name}-${counter}`;
            counter++;
        }
        
        return id;
    }
    
    /**
     * 链接字段描述
     */
    linkFieldDescription(field) {
        const helpText = field.parentElement.querySelector('.form-help, .help-text, [data-help]');
        if (helpText) {
            if (!helpText.id) {
                helpText.id = `${field.id}-help`;
            }
            
            const describedBy = field.getAttribute('aria-describedby') || '';
            const descriptions = describedBy.split(' ').filter(id => id);
            
            if (!descriptions.includes(helpText.id)) {
                descriptions.push(helpText.id);
                field.setAttribute('aria-describedby', descriptions.join(' '));
            }
        }
    }
    
    /**
     * 链接字段错误
     */
    linkFieldError(field) {
        const errorText = field.parentElement.querySelector('.form-error, .error-text, [data-error]');
        if (errorText) {
            if (!errorText.id) {
                errorText.id = `${field.id}-error`;
            }
            
            const describedBy = field.getAttribute('aria-describedby') || '';
            const descriptions = describedBy.split(' ').filter(id => id);
            
            if (!descriptions.includes(errorText.id)) {
                descriptions.push(errorText.id);
                field.setAttribute('aria-describedby', descriptions.join(' '));
            }
            
            // 设置无效状态
            field.setAttribute('aria-invalid', 'true');
        }
    }
    
    /**
     * 监听字段变化
     */
    observeFieldChanges(field) {
        // 监听验证状态变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isValid = field.classList.contains('valid');
                    const isInvalid = field.classList.contains('invalid');
                    
                    if (isValid) {
                        field.setAttribute('aria-invalid', 'false');
                        this.announce(`${this.getFieldLabel(field)} 输入有效`, 'polite');
                    } else if (isInvalid) {
                        field.setAttribute('aria-invalid', 'true');
                        const errorMessage = this.getFieldErrorMessage(field);
                        if (errorMessage) {
                            this.announce(`${this.getFieldLabel(field)} ${errorMessage}`, 'assertive');
                        }
                    }
                }
            });
        });
        
        observer.observe(field, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // 监听值变化
        field.addEventListener('input', () => {
            if (field.hasAttribute('aria-invalid') && field.value.trim()) {
                // 用户开始输入时，暂时移除错误状态
                field.setAttribute('aria-invalid', 'false');
            }
        });
    }
    
    /**
     * 获取字段标签
     */
    getFieldLabel(field) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.trim();
        }
        
        return field.getAttribute('aria-label') || 
               field.placeholder || 
               field.name || 
               '字段';
    }
    
    /**
     * 获取字段错误消息
     */
    getFieldErrorMessage(field) {
        const errorElement = field.parentElement.querySelector('.form-error, .error-text, [data-error]');
        return errorElement ? errorElement.textContent.trim() : '输入无效';
    }
    
    /**
     * 增强字段集
     */
    enhanceFieldset(fieldset) {
        const legend = fieldset.querySelector('legend');
        if (!legend) {
            console.warn('Fieldset缺少legend元素:', fieldset);
        }
        
        // 为字段集中的字段添加组描述
        const fields = fieldset.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            if (legend && !field.hasAttribute('aria-describedby')) {
                const legendId = legend.id || `legend-${Date.now()}`;
                legend.id = legendId;
                field.setAttribute('aria-describedby', legendId);
            }
        });
    }
    
    /**
     * 设置表单验证
     */
    setupFormValidation() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                const invalidFields = form.querySelectorAll(':invalid');
                if (invalidFields.length > 0) {
                    e.preventDefault();
                    
                    // 聚焦到第一个无效字段
                    invalidFields[0].focus();
                    
                    // 宣布验证错误
                    this.announce(`表单包含 ${invalidFields.length} 个错误，请检查并修正`, 'assertive');
                    
                    // 为每个无效字段宣布错误
                    invalidFields.forEach((field, index) => {
                        setTimeout(() => {
                            const label = this.getFieldLabel(field);
                            const error = this.getFieldErrorMessage(field);
                            this.announce(`${label}: ${error}`, 'polite');
                        }, (index + 1) * 500);
                    });
                }
            });
        });
    }
    
    /**
     * 设置导航增强
     */
    setupNavigationEnhancements() {
        // 增强菜单
        document.querySelectorAll('.menu, .nav, [role="menu"]').forEach(menu => {
            this.enhanceMenu(menu);
        });
        
        // 增强面包屑
        document.querySelectorAll('.breadcrumb, [role="navigation"]').forEach(breadcrumb => {
            this.enhanceBreadcrumb(breadcrumb);
        });
        
        // 增强分页
        document.querySelectorAll('.pagination').forEach(pagination => {
            this.enhancePagination(pagination);
        });
    }
    
    /**
     * 增强菜单
     */
    enhanceMenu(menu) {
        if (!menu.hasAttribute('role')) {
            menu.setAttribute('role', 'menu');
        }
        
        const menuItems = menu.querySelectorAll('a, button, [role="menuitem"]');
        menuItems.forEach((item, index) => {
            if (!item.hasAttribute('role')) {
                item.setAttribute('role', 'menuitem');
            }
            
            // 添加位置信息
            item.setAttribute('aria-posinset', index + 1);
            item.setAttribute('aria-setsize', menuItems.length);
            
            // 为子菜单添加展开状态
            const submenu = item.nextElementSibling;
            if (submenu && submenu.classList.contains('submenu')) {
                item.setAttribute('aria-haspopup', 'true');
                item.setAttribute('aria-expanded', 'false');
                
                // 监听子菜单展开/折叠
                item.addEventListener('click', () => {
                    const isExpanded = item.getAttribute('aria-expanded') === 'true';
                    item.setAttribute('aria-expanded', (!isExpanded).toString());
                    
                    const label = this.getElementLabel(item);
                    this.announce(`${label} ${isExpanded ? '已折叠' : '已展开'}`, 'polite');
                });
            }
        });
    }
    
    /**
     * 增强面包屑
     */
    enhanceBreadcrumb(breadcrumb) {
        if (!breadcrumb.hasAttribute('aria-label')) {
            breadcrumb.setAttribute('aria-label', '面包屑导航');
        }
        
        const items = breadcrumb.querySelectorAll('a, span');
        items.forEach((item, index) => {
            if (index === items.length - 1) {
                // 当前页面
                item.setAttribute('aria-current', 'page');
            }
        });
    }
    
    /**
     * 增强分页
     */
    enhancePagination(pagination) {
        if (!pagination.hasAttribute('role')) {
            pagination.setAttribute('role', 'navigation');
        }
        
        if (!pagination.hasAttribute('aria-label')) {
            pagination.setAttribute('aria-label', '分页导航');
        }
        
        const pageLinks = pagination.querySelectorAll('a, button');
        pageLinks.forEach(link => {
            const text = link.textContent.trim();
            
            if (text === '上一页' || text === 'Previous') {
                link.setAttribute('aria-label', '上一页');
            } else if (text === '下一页' || text === 'Next') {
                link.setAttribute('aria-label', '下一页');
            } else if (/^\d+$/.test(text)) {
                link.setAttribute('aria-label', `第 ${text} 页`);
                
                if (link.classList.contains('active') || link.classList.contains('current')) {
                    link.setAttribute('aria-current', 'page');
                }
            }
        });
    }
    
    /**
     * 设置表格增强
     */
    setupTableEnhancements() {
        document.querySelectorAll('table').forEach(table => {
            this.enhanceTable(table);
        });
    }
    
    /**
     * 增强表格
     */
    enhanceTable(table) {
        // 添加表格标题
        const caption = table.querySelector('caption');
        if (!caption) {
            const title = table.getAttribute('data-title') || 
                         table.previousElementSibling?.textContent?.trim();
            if (title) {
                const captionElement = document.createElement('caption');
                captionElement.textContent = title;
                captionElement.className = 'sr-only';
                table.insertBefore(captionElement, table.firstChild);
            }
        }
        
        // 增强表头
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (!header.id) {
                header.id = `header-${Date.now()}-${index}`;
            }
            
            if (!header.hasAttribute('scope')) {
                // 判断是行头还是列头
                const isRowHeader = header.parentElement.children[0] === header;
                header.setAttribute('scope', isRowHeader ? 'row' : 'col');
            }
        });
        
        // 增强表格单元格
        const cells = table.querySelectorAll('td');
        cells.forEach(cell => {
            // 关联表头
            const row = cell.parentElement;
            const cellIndex = Array.from(row.children).indexOf(cell);
            const headerRow = table.querySelector('thead tr, tr:first-child');
            
            if (headerRow) {
                const header = headerRow.children[cellIndex];
                if (header && header.id) {
                    const headersAttr = cell.getAttribute('headers') || '';
                    const headerIds = headersAttr.split(' ').filter(id => id);
                    
                    if (!headerIds.includes(header.id)) {
                        headerIds.push(header.id);
                        cell.setAttribute('headers', headerIds.join(' '));
                    }
                }
            }
        });
        
        // 添加排序支持
        const sortableHeaders = table.querySelectorAll('th[data-sortable], th.sortable');
        sortableHeaders.forEach(header => {
            header.setAttribute('role', 'columnheader');
            header.setAttribute('tabindex', '0');
            
            if (!header.hasAttribute('aria-sort')) {
                header.setAttribute('aria-sort', 'none');
            }
            
            // 添加排序指示器
            if (!header.querySelector('.sort-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator sr-only';
                indicator.textContent = '可排序';
                header.appendChild(indicator);
            }
            
            // 监听排序变化
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'aria-sort') {
                        const sortState = header.getAttribute('aria-sort');
                        const indicator = header.querySelector('.sort-indicator');
                        
                        if (indicator) {
                            switch (sortState) {
                                case 'ascending':
                                    indicator.textContent = '升序排列';
                                    break;
                                case 'descending':
                                    indicator.textContent = '降序排列';
                                    break;
                                default:
                                    indicator.textContent = '可排序';
                            }
                        }
                        
                        const columnName = header.textContent.trim();
                        const sortText = sortState === 'ascending' ? '升序' : 
                                        sortState === 'descending' ? '降序' : '未排序';
                        this.announce(`${columnName} 列 ${sortText}`, 'polite');
                    }
                });
            });
            
            observer.observe(header, {
                attributes: true,
                attributeFilter: ['aria-sort']
            });
        });
    }
    
    /**
     * 设置模态框增强
     */
    setupModalEnhancements() {
        document.querySelectorAll('.modal, [role="dialog"]').forEach(modal => {
            this.enhanceModal(modal);
        });
    }
    
    /**
     * 增强模态框
     */
    enhanceModal(modal) {
        if (!modal.hasAttribute('role')) {
            modal.setAttribute('role', 'dialog');
        }
        
        modal.setAttribute('aria-modal', 'true');
        
        // 确保有标题
        const title = modal.querySelector('.modal-title, h1, h2, h3');
        if (title) {
            if (!title.id) {
                title.id = `modal-title-${Date.now()}`;
            }
            modal.setAttribute('aria-labelledby', title.id);
        }
        
        // 监听模态框显示/隐藏
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    
                    const isVisible = this.isElementVisible(modal);
                    
                    if (isVisible && !modal.hasAttribute('data-announced')) {
                        const titleText = title ? title.textContent.trim() : '对话框';
                        this.announce(`${titleText} 已打开`, 'assertive');
                        modal.setAttribute('data-announced', 'true');
                    } else if (!isVisible && modal.hasAttribute('data-announced')) {
                        this.announce('对话框已关闭', 'polite');
                        modal.removeAttribute('data-announced');
                    }
                }
            });
        });
        
        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }
    
    /**
     * 检查元素是否可见
     */
    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               !element.hasAttribute('hidden');
    }
    
    /**
     * 设置动态内容观察器
     */
    setupDynamicContentObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // 处理新添加的元素
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.enhanceNewElement(node);
                        }
                    });
                }
                
                if (mutation.type === 'attributes') {
                    // 处理属性变化
                    this.handleAttributeChange(mutation);
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'hidden', 'aria-hidden', 'disabled']
        });
    }
    
    /**
     * 增强新元素
     */
    enhanceNewElement(element) {
        // 递归增强元素及其子元素
        this.enhanceElement(element);
        
        const childElements = element.querySelectorAll('*');
        childElements.forEach(child => {
            this.enhanceElement(child);
        });
    }
    
    /**
     * 增强单个元素
     */
    enhanceElement(element) {
        const tagName = element.tagName.toLowerCase();
        
        switch (tagName) {
            case 'button':
                this.enhanceButtons();
                break;
            case 'a':
                this.enhanceLinks();
                break;
            case 'img':
                this.enhanceImages();
                break;
            case 'input':
            case 'select':
            case 'textarea':
                this.enhanceFormField(element);
                break;
            case 'table':
                this.enhanceTable(element);
                break;
            case 'form':
                this.setupFormValidation();
                break;
        }
        
        // 检查特殊类名
        if (element.classList.contains('modal')) {
            this.enhanceModal(element);
        }
        
        if (element.classList.contains('menu') || element.classList.contains('nav')) {
            this.enhanceMenu(element);
        }
    }
    
    /**
     * 处理属性变化
     */
    handleAttributeChange(mutation) {
        const element = mutation.target;
        const attributeName = mutation.attributeName;
        
        if (attributeName === 'hidden' || attributeName === 'aria-hidden') {
            const isHidden = element.hasAttribute('hidden') || 
                           element.getAttribute('aria-hidden') === 'true';
            
            if (isHidden) {
                this.announce(`${this.getElementLabel(element)} 已隐藏`, 'polite');
            } else {
                this.announce(`${this.getElementLabel(element)} 已显示`, 'polite');
            }
        }
        
        if (attributeName === 'disabled') {
            const isDisabled = element.hasAttribute('disabled');
            element.setAttribute('aria-disabled', isDisabled.toString());
            
            if (isDisabled) {
                this.announce(`${this.getElementLabel(element)} 已禁用`, 'polite');
            } else {
                this.announce(`${this.getElementLabel(element)} 已启用`, 'polite');
            }
        }
    }
    
    /**
     * 创建描述元素
     */
    createDescription(text) {
        const id = `desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        if (this.ariaDescriptions.has(text)) {
            return this.ariaDescriptions.get(text);
        }
        
        const description = document.createElement('div');
        description.id = id;
        description.className = 'sr-only';
        description.textContent = text;
        document.body.appendChild(description);
        
        this.ariaDescriptions.set(text, id);
        return id;
    }
    
    /**
     * 清理未使用的描述
     */
    cleanupDescriptions() {
        this.ariaDescriptions.forEach((id, text) => {
            const element = document.getElementById(id);
            const isReferenced = document.querySelector(`[aria-describedby*="${id}"]`);
            
            if (!isReferenced && element) {
                element.remove();
                this.ariaDescriptions.delete(text);
            }
        });
    }
    
    /**
     * 获取可访问性报告
     */
    getAccessibilityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            issues: [],
            suggestions: [],
            stats: {
                totalElements: document.querySelectorAll('*').length,
                interactiveElements: document.querySelectorAll('button, a, input, select, textarea, [tabindex]').length,
                imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
                headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
                landmarks: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').length
            }
        };
        
        // 检查常见问题
        this.checkAccessibilityIssues(report);
        
        return report;
    }
    
    /**
     * 检查可访问性问题
     */
    checkAccessibilityIssues(report) {
        // 检查缺少alt属性的图片
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length > 0) {
            report.issues.push({
                type: 'missing-alt',
                severity: 'high',
                count: imagesWithoutAlt.length,
                message: `${imagesWithoutAlt.length} 张图片缺少alt属性`
            });
        }
        
        // 检查缺少标签的表单字段
        const unlabeledFields = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])');
        const fieldsWithoutLabels = Array.from(unlabeledFields).filter(field => {
            return !document.querySelector(`label[for="${field.id}"]`) && !field.closest('label');
        });
        
        if (fieldsWithoutLabels.length > 0) {
            report.issues.push({
                type: 'unlabeled-fields',
                severity: 'high',
                count: fieldsWithoutLabels.length,
                message: `${fieldsWithoutLabels.length} 个表单字段缺少标签`
            });
        }
        
        // 检查标题层级
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;
        let hasH1 = false;
        
        headings.forEach(heading => {
            const level = parseInt(heading.tagName.charAt(1));
            
            if (level === 1) {
                hasH1 = true;
            }
            
            if (level > previousLevel + 1) {
                report.issues.push({
                    type: 'heading-skip',
                    severity: 'medium',
                    element: heading,
                    message: `标题层级跳跃: 从 h${previousLevel} 跳到 h${level}`
                });
            }
            
            previousLevel = level;
        });
        
        if (!hasH1) {
            report.issues.push({
                type: 'missing-h1',
                severity: 'medium',
                message: '页面缺少h1标题'
            });
        }
        
        // 检查颜色对比度（简单检查）
        const lowContrastElements = this.findLowContrastElements();
        if (lowContrastElements.length > 0) {
            report.issues.push({
                type: 'low-contrast',
                severity: 'medium',
                count: lowContrastElements.length,
                message: `${lowContrastElements.length} 个元素可能存在颜色对比度问题`
            });
        }
        
        // 添加建议
        if (report.stats.landmarks === 0) {
            report.suggestions.push('建议添加页面地标元素（main, nav, header, footer等）');
        }
        
        if (report.stats.interactiveElements > 0) {
            report.suggestions.push('确保所有交互元素都可以通过键盘访问');
        }
    }
    
    /**
     * 查找低对比度元素（简化版）
     */
    findLowContrastElements() {
        const elements = [];
        const textElements = document.querySelectorAll('p, span, div, a, button, label, h1, h2, h3, h4, h5, h6');
        
        textElements.forEach(element => {
            const style = window.getComputedStyle(element);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            
            // 简单的对比度检查（实际应用中需要更复杂的算法）
            if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
                const contrast = this.calculateSimpleContrast(color, backgroundColor);
                if (contrast < 3) { // 简化的阈值
                    elements.push(element);
                }
            }
        });
        
        return elements;
    }
    
    /**
     * 计算简单对比度（简化版）
     */
    calculateSimpleContrast(color1, color2) {
        // 这是一个非常简化的对比度计算
        // 实际应用中应该使用WCAG标准的对比度计算公式
        const rgb1 = this.parseColor(color1);
        const rgb2 = this.parseColor(color2);
        
        if (!rgb1 || !rgb2) return 5; // 假设对比度足够
        
        const brightness1 = (rgb1.r * 299 + rgb1.g * 587 + rgb1.b * 114) / 1000;
        const brightness2 = (rgb2.r * 299 + rgb2.g * 587 + rgb2.b * 114) / 1000;
        
        return Math.abs(brightness1 - brightness2) / 255 * 21;
    }
    
    /**
     * 解析颜色值（简化版）
     */
    parseColor(color) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
        return null;
    }
}

// 初始化屏幕阅读器支持管理器
document.addEventListener('DOMContentLoaded', () => {
    window.ScreenReaderManager = new ScreenReaderManager();
});

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenReaderManager;
}
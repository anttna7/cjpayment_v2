/**
 * 用户体验优化模块
 * 根据用户反馈调整界面元素，优化操作流程，添加用户引导功能
 */

class UXOptimization {
    constructor() {
        this.feedbackData = [];
        this.optimizationRules = new Map();
        this.userGuidance = new Map();
        this.cognitiveLoadMetrics = {};
        this.adaptiveElements = new Set();
        
        this.init();
    }
    
    init() {
        this.loadOptimizationRules();
        this.setupAdaptiveElements();
        this.initializeUserGuidance();
        this.startCognitiveLoadMonitoring();
    }
    
    /**
     * 加载优化规则
     */
    loadOptimizationRules() {
        // 基于用户反馈的优化规则
        this.optimizationRules.set('high_error_rate', {
            condition: (element, data) => data.errorRate > 0.3,
            action: (element) => this.addErrorPrevention(element),
            priority: 'high'
        });
        
        this.optimizationRules.set('low_completion_rate', {
            condition: (element, data) => data.completionRate < 0.5,
            action: (element) => this.simplifyElement(element),
            priority: 'high'
        });
        
        this.optimizationRules.set('high_cognitive_load', {
            condition: (element, data) => data.cognitiveLoad > 0.7,
            action: (element) => this.reduceCognitiveLoad(element),
            priority: 'medium'
        });
        
        this.optimizationRules.set('poor_discoverability', {
            condition: (element, data) => data.clickRate < 0.1,
            action: (element) => this.improveDiscoverability(element),
            priority: 'medium'
        });
        
        this.optimizationRules.set('negative_feedback', {
            condition: (element, data) => data.averageRating < 3,
            action: (element) => this.addressNegativeFeedback(element),
            priority: 'high'
        });
    }
    
    /**
     * 设置自适应元素
     */
    setupAdaptiveElements() {
        // 识别需要自适应优化的元素
        const adaptiveSelectors = [
            'button', 'input', 'select', 'textarea',
            '.card', '.form-group', '.nav-item',
            '[data-adaptive="true"]'
        ];
        
        adaptiveSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                this.adaptiveElements.add(element);
                this.setupElementMonitoring(element);
            });
        });
    }
    
    /**
     * 设置元素监控
     */
    setupElementMonitoring(element) {
        const elementData = {
            interactions: 0,
            errors: 0,
            completions: 0,
            feedbackScores: [],
            cognitiveLoadScore: 0
        };
        
        // 监听交互事件
        element.addEventListener('click', () => {
            elementData.interactions++;
            this.updateElementMetrics(element, elementData);
        });
        
        // 监听错误事件
        element.addEventListener('error', () => {
            elementData.errors++;
            this.updateElementMetrics(element, elementData);
        });
        
        // 如果是表单元素，监听完成事件
        if (element.tagName === 'FORM') {
            element.addEventListener('submit', () => {
                elementData.completions++;
                this.updateElementMetrics(element, elementData);
            });
        }
        
        // 存储元素数据
        element._uxData = elementData;
    }
    
    /**
     * 更新元素指标
     */
    updateElementMetrics(element, data) {
        const metrics = {
            errorRate: data.interactions > 0 ? data.errors / data.interactions : 0,
            completionRate: data.interactions > 0 ? data.completions / data.interactions : 0,
            averageRating: data.feedbackScores.length > 0 ? 
                data.feedbackScores.reduce((sum, score) => sum + score, 0) / data.feedbackScores.length : 5,
            clickRate: data.interactions / (Date.now() - (element._startTime || Date.now())),
            cognitiveLoad: this.calculateCognitiveLoad(element)
        };
        
        // 应用优化规则
        this.applyOptimizationRules(element, metrics);
    }
    
    /**
     * 应用优化规则
     */
    applyOptimizationRules(element, metrics) {
        this.optimizationRules.forEach((rule, ruleName) => {
            if (rule.condition(element, metrics)) {
                console.log(`应用优化规则: ${ruleName}`, element);
                rule.action(element);
            }
        });
    }
    
    /**
     * 添加错误预防机制
     */
    addErrorPrevention(element) {
        // 添加确认对话框
        if (element.tagName === 'BUTTON' && element.type !== 'submit') {
            const originalHandler = element.onclick;
            element.onclick = (e) => {
                if (element.dataset.dangerous === 'true') {
                    if (!confirm('确定要执行此操作吗？')) {
                        e.preventDefault();
                        return false;
                    }
                }
                if (originalHandler) originalHandler.call(element, e);
            };
        }
        
        // 为表单添加验证提示
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            this.addInputValidation(element);
        }
        
        // 添加视觉提示
        element.classList.add('ux-error-prevention');
        this.addTooltip(element, '此操作需要谨慎处理');
    }
    
    /**
     * 简化元素
     */
    simplifyElement(element) {
        // 减少选项数量
        if (element.tagName === 'SELECT') {
            const options = Array.from(element.options);
            if (options.length > 7) {
                // 保留最常用的选项
                const commonOptions = options.slice(0, 5);
                element.innerHTML = '';
                commonOptions.forEach(option => element.appendChild(option));
                
                // 添加"更多选项"按钮
                this.addMoreOptionsButton(element, options.slice(5));
            }
        }
        
        // 简化表单布局
        if (element.tagName === 'FORM') {
            this.simplifyFormLayout(element);
        }
        
        // 添加进度指示器
        if (element.classList.contains('multi-step')) {
            this.addProgressIndicator(element);
        }
        
        element.classList.add('ux-simplified');
    }
    
    /**
     * 减少认知负担
     */
    reduceCognitiveLoad(element) {
        // 添加分组和标签
        if (element.tagName === 'FORM') {
            this.addFormGrouping(element);
        }
        
        // 使用图标和视觉提示
        this.addVisualCues(element);
        
        // 隐藏高级选项
        this.hideAdvancedOptions(element);
        
        // 添加智能默认值
        this.addSmartDefaults(element);
        
        element.classList.add('ux-cognitive-optimized');
    }
    
    /**
     * 改善可发现性
     */
    improveDiscoverability(element) {
        // 添加动画提示
        element.classList.add('ux-highlight-animation');
        
        // 增加视觉权重
        element.style.boxShadow = '0 0 0 2px var(--primary-500)';
        element.style.position = 'relative';
        element.style.zIndex = '10';
        
        // 添加工具提示
        this.addTooltip(element, '点击这里进行操作');
        
        // 添加引导箭头
        this.addGuidanceArrow(element);
        
        setTimeout(() => {
            element.classList.remove('ux-highlight-animation');
            element.style.boxShadow = '';
            element.style.zIndex = '';
        }, 5000);
    }
    
    /**
     * 处理负面反馈
     */
    addressNegativeFeedback(element) {
        // 收集具体的负面反馈
        const negativeFeedback = this.feedbackData.filter(f => 
            f.element === this.getElementSelector(element) && f.rating < 3
        );
        
        // 根据反馈类型采取不同措施
        negativeFeedback.forEach(feedback => {
            switch (feedback.category) {
                case 'usability':
                    this.improveUsability(element, feedback);
                    break;
                case 'design':
                    this.improveDesign(element, feedback);
                    break;
                case 'performance':
                    this.improvePerformance(element, feedback);
                    break;
                default:
                    this.addGeneralImprovement(element, feedback);
            }
        });
    }
    
    /**
     * 初始化用户引导
     */
    initializeUserGuidance() {
        // 新用户引导
        this.userGuidance.set('new_user', {
            triggers: ['first_visit', 'no_interactions'],
            steps: [
                { element: '.navbar', message: '这是主导航栏，您可以在这里切换不同功能' },
                { element: '.dashboard', message: '这是仪表板，显示系统的关键信息' },
                { element: '.btn-primary', message: '点击这些按钮来执行主要操作' }
            ]
        });
        
        // 功能引导
        this.userGuidance.set('feature_discovery', {
            triggers: ['element_unused', 'low_engagement'],
            steps: [
                { element: '[data-feature="advanced"]', message: '这里有更多高级功能' },
                { element: '.shortcuts', message: '使用快捷键可以提高效率' }
            ]
        });
        
        // 错误恢复引导
        this.userGuidance.set('error_recovery', {
            triggers: ['error_occurred', 'user_confused'],
            steps: [
                { element: '.error-message', message: '出现了错误，请按照提示进行操作' },
                { element: '.help-button', message: '如需帮助，请点击这里' }
            ]
        });
        
        this.checkGuidanceTriggers();
    }
    
    /**
     * 检查引导触发条件
     */
    checkGuidanceTriggers() {
        // 检查是否为新用户
        if (!localStorage.getItem('user_visited')) {
            this.triggerGuidance('new_user');
            localStorage.setItem('user_visited', 'true');
        }
        
        // 定期检查其他触发条件
        setInterval(() => {
            this.checkFeatureUsage();
            this.checkUserEngagement();
        }, 30000); // 每30秒检查一次
    }
    
    /**
     * 触发用户引导
     */
    triggerGuidance(guidanceType) {
        const guidance = this.userGuidance.get(guidanceType);
        if (!guidance) return;
        
        this.showGuidanceOverlay(guidance.steps);
    }
    
    /**
     * 显示引导覆盖层
     */
    showGuidanceOverlay(steps) {
        let currentStep = 0;
        
        const showStep = () => {
            if (currentStep >= steps.length) {
                this.hideGuidanceOverlay();
                return;
            }
            
            const step = steps[currentStep];
            const element = document.querySelector(step.element);
            
            if (!element) {
                currentStep++;
                showStep();
                return;
            }
            
            this.highlightElement(element);
            this.showGuidanceTooltip(element, step.message, () => {
                currentStep++;
                showStep();
            });
        };
        
        this.createGuidanceOverlay();
        showStep();
    }
    
    /**
     * 创建引导覆盖层
     */
    createGuidanceOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'ux-guidance-overlay';
        overlay.className = 'ux-guidance-overlay';
        overlay.innerHTML = `
            <div class="guidance-backdrop"></div>
            <div class="guidance-controls">
                <button class="skip-guidance">跳过引导</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 跳过引导
        overlay.querySelector('.skip-guidance').addEventListener('click', () => {
            this.hideGuidanceOverlay();
        });
    }
    
    /**
     * 高亮元素
     */
    highlightElement(element) {
        // 移除之前的高亮
        document.querySelectorAll('.ux-highlighted').forEach(el => {
            el.classList.remove('ux-highlighted');
        });
        
        // 添加新的高亮
        element.classList.add('ux-highlighted');
        
        // 滚动到元素位置
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    /**
     * 显示引导工具提示
     */
    showGuidanceTooltip(element, message, onNext) {
        const tooltip = document.createElement('div');
        tooltip.className = 'ux-guidance-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <p>${message}</p>
                <div class="tooltip-actions">
                    <button class="btn-next">下一步</button>
                    <button class="btn-skip">跳过</button>
                </div>
            </div>
            <div class="tooltip-arrow"></div>
        `;
        
        document.body.appendChild(tooltip);
        
        // 定位工具提示
        this.positionTooltip(tooltip, element);
        
        // 事件处理
        tooltip.querySelector('.btn-next').addEventListener('click', () => {
            tooltip.remove();
            onNext();
        });
        
        tooltip.querySelector('.btn-skip').addEventListener('click', () => {
            this.hideGuidanceOverlay();
        });
    }
    
    /**
     * 定位工具提示
     */
    positionTooltip(tooltip, element) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width - tooltipRect.width) / 2;
        
        // 确保工具提示在视窗内
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = rect.top - tooltipRect.height - 10;
            tooltip.classList.add('tooltip-above');
        }
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }
    
    /**
     * 隐藏引导覆盖层
     */
    hideGuidanceOverlay() {
        const overlay = document.getElementById('ux-guidance-overlay');
        if (overlay) overlay.remove();
        
        document.querySelectorAll('.ux-highlighted').forEach(el => {
            el.classList.remove('ux-highlighted');
        });
        
        document.querySelectorAll('.ux-guidance-tooltip').forEach(el => {
            el.remove();
        });
    }
    
    /**
     * 开始认知负担监控
     */
    startCognitiveLoadMonitoring() {
        // 监控页面复杂度
        this.monitorPageComplexity();
        
        // 监控用户行为模式
        this.monitorUserBehaviorPatterns();
        
        // 定期评估认知负担
        setInterval(() => {
            this.assessCognitiveLoad();
        }, 60000); // 每分钟评估一次
    }
    
    /**
     * 监控页面复杂度
     */
    monitorPageComplexity() {
        const complexity = {
            elementCount: document.querySelectorAll('*').length,
            formFieldCount: document.querySelectorAll('input, select, textarea').length,
            buttonCount: document.querySelectorAll('button, [role="button"]').length,
            linkCount: document.querySelectorAll('a').length,
            colorCount: this.countUniqueColors(),
            fontCount: this.countUniqueFonts()
        };
        
        this.cognitiveLoadMetrics.pageComplexity = this.calculateComplexityScore(complexity);
    }
    
    /**
     * 监控用户行为模式
     */
    monitorUserBehaviorPatterns() {
        let hesitationCount = 0;
        let backtrackCount = 0;
        let errorCount = 0;
        
        // 监听犹豫行为（鼠标悬停但不点击）
        document.addEventListener('mouseover', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                setTimeout(() => {
                    if (e.target.matches(':hover') && !e.target.dataset.clicked) {
                        hesitationCount++;
                    }
                }, 2000);
            }
        });
        
        // 监听点击行为
        document.addEventListener('click', (e) => {
            e.target.dataset.clicked = 'true';
            setTimeout(() => delete e.target.dataset.clicked, 100);
        });
        
        // 监听回退行为
        window.addEventListener('popstate', () => {
            backtrackCount++;
        });
        
        // 监听错误
        window.addEventListener('error', () => {
            errorCount++;
        });
        
        // 定期更新行为指标
        setInterval(() => {
            this.cognitiveLoadMetrics.userBehavior = {
                hesitationRate: hesitationCount / 60, // 每分钟犹豫次数
                backtrackRate: backtrackCount / 60,   // 每分钟回退次数
                errorRate: errorCount / 60            // 每分钟错误次数
            };
            
            // 重置计数器
            hesitationCount = backtrackCount = errorCount = 0;
        }, 60000);
    }
    
    /**
     * 评估认知负担
     */
    assessCognitiveLoad() {
        const complexity = this.cognitiveLoadMetrics.pageComplexity || 0;
        const behavior = this.cognitiveLoadMetrics.userBehavior || {};
        
        const cognitiveLoad = (
            complexity * 0.4 +
            (behavior.hesitationRate || 0) * 0.3 +
            (behavior.backtrackRate || 0) * 0.2 +
            (behavior.errorRate || 0) * 0.1
        );
        
        this.cognitiveLoadMetrics.overall = Math.min(cognitiveLoad, 1);
        
        // 如果认知负担过高，触发优化
        if (cognitiveLoad > 0.7) {
            this.triggerCognitiveLoadReduction();
        }
    }
    
    /**
     * 触发认知负担减少措施
     */
    triggerCognitiveLoadReduction() {
        // 隐藏非必要元素
        document.querySelectorAll('[data-priority="low"]').forEach(el => {
            el.style.display = 'none';
        });
        
        // 简化导航
        this.simplifyNavigation();
        
        // 添加帮助提示
        this.addContextualHelp();
        
        // 显示简化模式提示
        this.showSimplificationNotice();
    }
    
    /**
     * 工具方法
     */
    calculateCognitiveLoad(element) {
        const rect = element.getBoundingClientRect();
        const childCount = element.children.length;
        const textLength = element.textContent?.length || 0;
        const hasComplexStyling = this.hasComplexStyling(element);
        
        return Math.min((childCount * 0.1 + textLength * 0.001 + (hasComplexStyling ? 0.2 : 0)), 1);
    }
    
    hasComplexStyling(element) {
        const styles = getComputedStyle(element);
        return (
            styles.boxShadow !== 'none' ||
            styles.borderRadius !== '0px' ||
            styles.background.includes('gradient') ||
            styles.transform !== 'none'
        );
    }
    
    calculateComplexityScore(complexity) {
        return Math.min((
            complexity.elementCount * 0.001 +
            complexity.formFieldCount * 0.05 +
            complexity.buttonCount * 0.02 +
            complexity.linkCount * 0.01 +
            complexity.colorCount * 0.1 +
            complexity.fontCount * 0.1
        ), 1);
    }
    
    countUniqueColors() {
        const colors = new Set();
        document.querySelectorAll('*').forEach(el => {
            const styles = getComputedStyle(el);
            colors.add(styles.color);
            colors.add(styles.backgroundColor);
        });
        return colors.size;
    }
    
    countUniqueFonts() {
        const fonts = new Set();
        document.querySelectorAll('*').forEach(el => {
            const styles = getComputedStyle(el);
            fonts.add(styles.fontFamily);
        });
        return fonts.size;
    }
    
    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }
    
    addTooltip(element, message) {
        element.title = message;
        element.setAttribute('data-tooltip', message);
    }
    
    addInputValidation(element) {
        const validationMessage = document.createElement('div');
        validationMessage.className = 'ux-validation-message';
        validationMessage.style.display = 'none';
        element.parentNode.appendChild(validationMessage);
        
        element.addEventListener('blur', () => {
            if (!element.value && element.required) {
                validationMessage.textContent = '此字段为必填项';
                validationMessage.style.display = 'block';
                element.classList.add('ux-validation-error');
            } else {
                validationMessage.style.display = 'none';
                element.classList.remove('ux-validation-error');
            }
        });
    }
    
    addGuidanceArrow(element) {
        const arrow = document.createElement('div');
        arrow.className = 'ux-guidance-arrow';
        arrow.innerHTML = '↑';
        
        const rect = element.getBoundingClientRect();
        arrow.style.position = 'fixed';
        arrow.style.left = `${rect.left + rect.width / 2}px`;
        arrow.style.top = `${rect.bottom + 10}px`;
        arrow.style.zIndex = '10001';
        
        document.body.appendChild(arrow);
        
        setTimeout(() => arrow.remove(), 5000);
    }
    
    // 其他辅助方法的简化实现
    addMoreOptionsButton(select, hiddenOptions) {
        const button = document.createElement('button');
        button.textContent = '更多选项...';
        button.onclick = () => {
            hiddenOptions.forEach(option => select.appendChild(option));
            button.remove();
        };
        select.parentNode.appendChild(button);
    }
    
    simplifyFormLayout(form) {
        const groups = form.querySelectorAll('.form-group');
        if (groups.length > 5) {
            Array.from(groups).slice(5).forEach(group => {
                group.style.display = 'none';
            });
            
            const showMoreBtn = document.createElement('button');
            showMoreBtn.textContent = '显示更多字段';
            showMoreBtn.onclick = () => {
                Array.from(groups).slice(5).forEach(group => {
                    group.style.display = 'block';
                });
                showMoreBtn.remove();
            };
            form.appendChild(showMoreBtn);
        }
    }
    
    addProgressIndicator(element) {
        const progress = document.createElement('div');
        progress.className = 'ux-progress-indicator';
        progress.innerHTML = '<div class="progress-bar"></div>';
        element.insertBefore(progress, element.firstChild);
    }
    
    addFormGrouping(form) {
        const fieldsets = form.querySelectorAll('fieldset');
        if (fieldsets.length === 0) {
            // 自动创建分组
            const groups = Array.from(form.querySelectorAll('.form-group'));
            const groupSize = Math.ceil(groups.length / 3);
            
            for (let i = 0; i < groups.length; i += groupSize) {
                const fieldset = document.createElement('fieldset');
                const legend = document.createElement('legend');
                legend.textContent = `第 ${Math.floor(i / groupSize) + 1} 部分`;
                fieldset.appendChild(legend);
                
                groups.slice(i, i + groupSize).forEach(group => {
                    fieldset.appendChild(group);
                });
                
                form.appendChild(fieldset);
            }
        }
    }
    
    addVisualCues(element) {
        // 添加图标
        if (element.tagName === 'BUTTON' && !element.querySelector('.icon')) {
            const icon = document.createElement('span');
            icon.className = 'icon';
            icon.textContent = '▶';
            element.insertBefore(icon, element.firstChild);
        }
    }
    
    hideAdvancedOptions(element) {
        const advanced = element.querySelectorAll('[data-advanced="true"]');
        advanced.forEach(el => {
            el.style.display = 'none';
        });
        
        if (advanced.length > 0) {
            const toggle = document.createElement('button');
            toggle.textContent = '显示高级选项';
            toggle.onclick = () => {
                advanced.forEach(el => {
                    el.style.display = el.style.display === 'none' ? 'block' : 'none';
                });
                toggle.textContent = toggle.textContent === '显示高级选项' ? '隐藏高级选项' : '显示高级选项';
            };
            element.appendChild(toggle);
        }
    }
    
    addSmartDefaults(element) {
        const inputs = element.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (!input.value && input.dataset.smartDefault) {
                input.value = input.dataset.smartDefault;
            }
        });
    }
    
    improveUsability(element, feedback) {
        element.classList.add('ux-usability-improved');
        this.addTooltip(element, '已根据用户反馈优化');
    }
    
    improveDesign(element, feedback) {
        element.classList.add('ux-design-improved');
    }
    
    improvePerformance(element, feedback) {
        element.classList.add('ux-performance-improved');
    }
    
    addGeneralImprovement(element, feedback) {
        element.classList.add('ux-general-improved');
    }
    
    checkFeatureUsage() {
        // 检查功能使用情况
        document.querySelectorAll('[data-feature]').forEach(element => {
            if (!element._interactionCount) {
                element._interactionCount = 0;
            }
            
            if (element._interactionCount === 0) {
                this.triggerGuidance('feature_discovery');
            }
        });
    }
    
    checkUserEngagement() {
        // 检查用户参与度
        const now = Date.now();
        const lastInteraction = window._lastInteractionTime || now;
        
        if (now - lastInteraction > 120000) { // 2分钟无交互
            this.triggerGuidance('error_recovery');
        }
    }
    
    simplifyNavigation() {
        const nav = document.querySelector('.navbar-nav');
        if (nav) {
            const items = nav.querySelectorAll('.nav-item');
            if (items.length > 5) {
                Array.from(items).slice(5).forEach(item => {
                    item.style.display = 'none';
                });
            }
        }
    }
    
    addContextualHelp() {
        const helpButton = document.createElement('button');
        helpButton.className = 'ux-help-button';
        helpButton.textContent = '?';
        helpButton.title = '获取帮助';
        helpButton.style.position = 'fixed';
        helpButton.style.bottom = '20px';
        helpButton.style.right = '20px';
        helpButton.style.zIndex = '10000';
        
        helpButton.onclick = () => {
            this.showContextualHelp();
        };
        
        document.body.appendChild(helpButton);
    }
    
    showContextualHelp() {
        const modal = document.createElement('div');
        modal.className = 'ux-help-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>页面帮助</h3>
                <p>当前页面已简化以减少认知负担。如需查看完整功能，请点击相应的"显示更多"按钮。</p>
                <button onclick="this.closest('.ux-help-modal').remove()">关闭</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    showSimplificationNotice() {
        const notice = document.createElement('div');
        notice.className = 'ux-simplification-notice';
        notice.innerHTML = `
            <div class="notice-content">
                <p>🎯 页面已自动简化以提升使用体验</p>
                <button onclick="this.closest('.ux-simplification-notice').remove()">知道了</button>
            </div>
        `;
        
        document.body.appendChild(notice);
        
        setTimeout(() => {
            if (notice.parentNode) notice.remove();
        }, 5000);
    }
    
    /**
     * 收集用户反馈
     */
    collectUserFeedback(feedback) {
        this.feedbackData.push({
            ...feedback,
            timestamp: Date.now()
        });
        
        // 立即应用反馈优化
        if (feedback.element) {
            const element = document.querySelector(feedback.element);
            if (element && element._uxData) {
                element._uxData.feedbackScores.push(feedback.rating);
                this.updateElementMetrics(element, element._uxData);
            }
        }
    }
    
    /**
     * 导出优化报告
     */
    exportOptimizationReport() {
        return {
            optimizedElements: Array.from(this.adaptiveElements).length,
            appliedRules: Array.from(this.optimizationRules.keys()),
            cognitiveLoadMetrics: this.cognitiveLoadMetrics,
            feedbackCount: this.feedbackData.length,
            guidanceTriggered: Array.from(this.userGuidance.keys()),
            recommendations: this.generateOptimizationRecommendations()
        };
    }
    
    generateOptimizationRecommendations() {
        const recommendations = [];
        
        if (this.cognitiveLoadMetrics.overall > 0.7) {
            recommendations.push({
                type: 'cognitive_load',
                priority: 'high',
                description: '页面认知负担过高，建议进一步简化界面'
            });
        }
        
        if (this.feedbackData.filter(f => f.rating < 3).length > this.feedbackData.length * 0.3) {
            recommendations.push({
                type: 'user_satisfaction',
                priority: 'high',
                description: '用户满意度较低，需要重点关注用户体验问题'
            });
        }
        
        return recommendations;
    }
}

// 全局实例
window.uxOptimization = new UXOptimization();
/**
 * 用户反馈系统
 * 提供多种反馈收集方式和用户支持功能
 */

class UserFeedbackSystem {
    constructor() {
        this.feedbackData = [];
        this.isInitialized = false;
        this.config = {
            apiEndpoint: '/api/feedback',
            enableFloatingButton: true,
            enablePageFeedback: true,
            enableSatisfactionSurvey: true,
            enableBugReport: true,
            enableFeatureRequest: true,
            autoShowSurvey: true,
            surveyInterval: 7 * 24 * 60 * 60 * 1000, // 7天
            maxFeedbackLength: 1000
        };
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.createStyles();
        this.createFloatingButton();
        this.createFeedbackModal();
        this.createSatisfactionSurvey();
        this.createBugReportModal();
        this.createFeatureRequestModal();
        this.setupEventListeners();
        this.checkAutoSurvey();
        
        this.isInitialized = true;
        console.log('用户反馈系统已初始化');
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .feedback-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: var(--primary-500, #0ea5e9);
                border: none;
                border-radius: 50%;
                color: white;
                font-size: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .feedback-floating-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
                background: var(--primary-600, #0284c7);
            }

            .feedback-floating-btn.pulse {
                animation: feedbackPulse 2s infinite;
            }

            @keyframes feedbackPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            .feedback-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }

            .feedback-modal.show {
                display: flex;
            }

            .feedback-modal-content {
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .feedback-modal.show .feedback-modal-content {
                transform: scale(1);
            }

            .feedback-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .feedback-modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
            }

            .feedback-close-btn {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .feedback-close-btn:hover {
                background: #f3f4f6;
                color: #374151;
            }

            .feedback-type-selector {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 12px;
                margin-bottom: 20px;
            }

            .feedback-type-btn {
                padding: 12px 16px;
                border: 2px solid #e5e7eb;
                background: white;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: center;
                font-size: 14px;
                font-weight: 500;
            }

            .feedback-type-btn:hover {
                border-color: var(--primary-300, #7dd3fc);
                background: var(--primary-50, #f0f9ff);
            }

            .feedback-type-btn.active {
                border-color: var(--primary-500, #0ea5e9);
                background: var(--primary-500, #0ea5e9);
                color: white;
            }

            .feedback-form-group {
                margin-bottom: 16px;
            }

            .feedback-label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #374151;
                font-size: 14px;
            }

            .feedback-input,
            .feedback-textarea {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .feedback-input:focus,
            .feedback-textarea:focus {
                outline: none;
                border-color: var(--primary-500, #0ea5e9);
                box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
            }

            .feedback-textarea {
                resize: vertical;
                min-height: 100px;
            }

            .feedback-rating {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
            }

            .feedback-star {
                font-size: 24px;
                color: #d1d5db;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .feedback-star:hover,
            .feedback-star.active {
                color: #fbbf24;
            }

            .feedback-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
            }

            .feedback-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .feedback-btn-primary {
                background: var(--primary-500, #0ea5e9);
                color: white;
            }

            .feedback-btn-primary:hover {
                background: var(--primary-600, #0284c7);
            }

            .feedback-btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .feedback-btn-secondary:hover {
                background: #e5e7eb;
            }

            .feedback-success {
                text-align: center;
                padding: 40px 20px;
            }

            .feedback-success-icon {
                font-size: 48px;
                color: var(--success-500, #22c55e);
                margin-bottom: 16px;
            }

            .feedback-success-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 8px;
            }

            .feedback-success-text {
                color: #6b7280;
                font-size: 14px;
            }

            .feedback-survey-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: var(--primary-500, #0ea5e9);
                color: white;
                padding: 16px;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                z-index: 999;
            }

            .feedback-survey-banner.show {
                transform: translateY(0);
            }

            .feedback-survey-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
            }

            .feedback-survey-text {
                flex: 1;
                font-size: 14px;
            }

            .feedback-survey-actions {
                display: flex;
                gap: 12px;
            }

            .feedback-survey-btn {
                padding: 8px 16px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }

            .feedback-survey-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .feedback-page-widget {
                position: fixed;
                bottom: 100px;
                right: 20px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                max-width: 300px;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                z-index: 999;
            }

            .feedback-page-widget.show {
                transform: translateX(0);
            }

            .feedback-page-widget-title {
                font-size: 14px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 8px;
            }

            .feedback-page-widget-text {
                font-size: 12px;
                color: #6b7280;
                margin-bottom: 12px;
            }

            .feedback-quick-actions {
                display: flex;
                gap: 8px;
            }

            .feedback-quick-btn {
                flex: 1;
                padding: 6px 12px;
                border: 1px solid #d1d5db;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            }

            .feedback-quick-btn:hover {
                background: #f3f4f6;
            }

            .feedback-quick-btn.positive {
                border-color: var(--success-300, #86efac);
                color: var(--success-600, #16a34a);
            }

            .feedback-quick-btn.negative {
                border-color: var(--error-300, #fca5a5);
                color: var(--error-600, #dc2626);
            }

            @media (max-width: 768px) {
                .feedback-modal-content {
                    margin: 20px;
                    width: calc(100% - 40px);
                }

                .feedback-type-selector {
                    grid-template-columns: 1fr;
                }

                .feedback-survey-content {
                    flex-direction: column;
                    text-align: center;
                }

                .feedback-page-widget {
                    right: 10px;
                    bottom: 90px;
                    max-width: calc(100% - 20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    createFloatingButton() {
        if (!this.config.enableFloatingButton) return;

        const button = document.createElement('button');
        button.className = 'feedback-floating-btn';
        button.innerHTML = '💬';
        button.title = '意见反馈';
        button.onclick = () => this.showFeedbackModal();
        
        document.body.appendChild(button);
        this.floatingButton = button;
    }

    createFeedbackModal() {
        const modal = document.createElement('div');
        modal.className = 'feedback-modal';
        modal.innerHTML = `
            <div class="feedback-modal-content">
                <div class="feedback-modal-header">
                    <h3 class="feedback-modal-title">意见反馈</h3>
                    <button class="feedback-close-btn" onclick="userFeedback.hideFeedbackModal()">&times;</button>
                </div>
                
                <div class="feedback-type-selector">
                    <button class="feedback-type-btn active" data-type="general">一般反馈</button>
                    <button class="feedback-type-btn" data-type="bug">问题报告</button>
                    <button class="feedback-type-btn" data-type="feature">功能建议</button>
                    <button class="feedback-type-btn" data-type="satisfaction">满意度</button>
                </div>

                <div id="feedbackFormContainer">
                    <!-- 动态内容 -->
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.feedbackModal = modal;
        
        // 设置类型选择器事件
        modal.querySelectorAll('.feedback-type-btn').forEach(btn => {
            btn.onclick = () => this.selectFeedbackType(btn.dataset.type);
        });
        
        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hideFeedbackModal();
            }
        };
        
        // 初始化一般反馈表单
        this.selectFeedbackType('general');
    }

    createSatisfactionSurvey() {
        if (!this.config.enableSatisfactionSurvey) return;

        const banner = document.createElement('div');
        banner.className = 'feedback-survey-banner';
        banner.innerHTML = `
            <div class="feedback-survey-content">
                <div class="feedback-survey-text">
                    您对新界面的使用体验如何？您的反馈对我们很重要！
                </div>
                <div class="feedback-survey-actions">
                    <button class="feedback-survey-btn" onclick="userFeedback.showSatisfactionSurvey()">参与调查</button>
                    <button class="feedback-survey-btn" onclick="userFeedback.dismissSurvey()">稍后提醒</button>
                    <button class="feedback-survey-btn" onclick="userFeedback.dismissSurvey(true)">不再提醒</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        this.surveyBanner = banner;
    }

    createBugReportModal() {
        // Bug报告模态框将在selectFeedbackType中动态创建
    }

    createFeatureRequestModal() {
        // 功能建议模态框将在selectFeedbackType中动态创建
    }

    setupEventListeners() {
        // 页面卸载前保存未完成的反馈
        window.addEventListener('beforeunload', () => {
            this.saveDraftFeedback();
        });

        // 监听页面停留时间，适时显示反馈提示
        let pageStartTime = Date.now();
        let hasShownPageFeedback = false;
        
        setTimeout(() => {
            if (!hasShownPageFeedback && this.config.enablePageFeedback) {
                this.showPageFeedbackWidget();
                hasShownPageFeedback = true;
            }
        }, 30000); // 30秒后显示

        // 监听错误事件，自动触发错误报告
        window.addEventListener('error', (e) => {
            this.handlePageError(e);
        });

        // 监听键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.showFeedbackModal();
            }
        });
    }

    selectFeedbackType(type) {
        // 更新按钮状态
        this.feedbackModal.querySelectorAll('.feedback-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // 生成对应的表单
        const container = document.getElementById('feedbackFormContainer');
        container.innerHTML = this.generateFormHTML(type);
        
        // 设置表单事件
        this.setupFormEvents(type);
    }

    generateFormHTML(type) {
        switch (type) {
            case 'general':
                return `
                    <form id="generalFeedbackForm">
                        <div class="feedback-form-group">
                            <label class="feedback-label">反馈类型</label>
                            <select class="feedback-input" name="category" required>
                                <option value="">请选择</option>
                                <option value="ui">界面设计</option>
                                <option value="performance">性能问题</option>
                                <option value="usability">易用性</option>
                                <option value="content">内容建议</option>
                                <option value="other">其他</option>
                            </select>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">详细描述 *</label>
                            <textarea class="feedback-textarea" name="description" placeholder="请详细描述您的反馈..." required maxlength="${this.config.maxFeedbackLength}"></textarea>
                            <div style="text-align: right; font-size: 12px; color: #6b7280; margin-top: 4px;">
                                <span id="charCount">0</span>/${this.config.maxFeedbackLength}
                            </div>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">联系方式（可选）</label>
                            <input type="email" class="feedback-input" name="contact" placeholder="如需回复，请留下邮箱">
                        </div>
                        <div class="feedback-actions">
                            <button type="button" class="feedback-btn feedback-btn-secondary" onclick="userFeedback.hideFeedbackModal()">取消</button>
                            <button type="submit" class="feedback-btn feedback-btn-primary">提交反馈</button>
                        </div>
                    </form>
                `;

            case 'bug':
                return `
                    <form id="bugReportForm">
                        <div class="feedback-form-group">
                            <label class="feedback-label">问题严重程度</label>
                            <select class="feedback-input" name="severity" required>
                                <option value="">请选择</option>
                                <option value="low">轻微 - 不影响使用</option>
                                <option value="medium">中等 - 影响部分功能</option>
                                <option value="high">严重 - 影响主要功能</option>
                                <option value="critical">紧急 - 系统无法使用</option>
                            </select>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">问题描述 *</label>
                            <textarea class="feedback-textarea" name="description" placeholder="请详细描述遇到的问题..." required></textarea>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">重现步骤</label>
                            <textarea class="feedback-textarea" name="steps" placeholder="1. 打开页面&#10;2. 点击某个按钮&#10;3. 出现错误..."></textarea>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">浏览器信息</label>
                            <input type="text" class="feedback-input" name="browser" value="${this.getBrowserInfo()}" readonly>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">联系方式 *</label>
                            <input type="email" class="feedback-input" name="contact" placeholder="请留下邮箱以便我们联系您" required>
                        </div>
                        <div class="feedback-actions">
                            <button type="button" class="feedback-btn feedback-btn-secondary" onclick="userFeedback.hideFeedbackModal()">取消</button>
                            <button type="submit" class="feedback-btn feedback-btn-primary">提交报告</button>
                        </div>
                    </form>
                `;

            case 'feature':
                return `
                    <form id="featureRequestForm">
                        <div class="feedback-form-group">
                            <label class="feedback-label">功能类型</label>
                            <select class="feedback-input" name="type" required>
                                <option value="">请选择</option>
                                <option value="new">新功能</option>
                                <option value="improvement">功能改进</option>
                                <option value="integration">集成需求</option>
                                <option value="automation">自动化</option>
                            </select>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">功能描述 *</label>
                            <textarea class="feedback-textarea" name="description" placeholder="请描述您希望添加或改进的功能..." required></textarea>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">使用场景</label>
                            <textarea class="feedback-textarea" name="useCase" placeholder="请描述这个功能的使用场景和预期效果..."></textarea>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">优先级</label>
                            <select class="feedback-input" name="priority">
                                <option value="low">低 - 有了更好</option>
                                <option value="medium" selected>中 - 比较重要</option>
                                <option value="high">高 - 非常需要</option>
                            </select>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">联系方式（可选）</label>
                            <input type="email" class="feedback-input" name="contact" placeholder="如需讨论详细需求，请留下邮箱">
                        </div>
                        <div class="feedback-actions">
                            <button type="button" class="feedback-btn feedback-btn-secondary" onclick="userFeedback.hideFeedbackModal()">取消</button>
                            <button type="submit" class="feedback-btn feedback-btn-primary">提交建议</button>
                        </div>
                    </form>
                `;

            case 'satisfaction':
                return `
                    <form id="satisfactionForm">
                        <div class="feedback-form-group">
                            <label class="feedback-label">总体满意度 *</label>
                            <div class="feedback-rating" data-rating="0">
                                <span class="feedback-star" data-value="1">★</span>
                                <span class="feedback-star" data-value="2">★</span>
                                <span class="feedback-star" data-value="3">★</span>
                                <span class="feedback-star" data-value="4">★</span>
                                <span class="feedback-star" data-value="5">★</span>
                            </div>
                            <input type="hidden" name="rating" required>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">界面设计评价</label>
                            <select class="feedback-input" name="design">
                                <option value="">请选择</option>
                                <option value="excellent">非常好</option>
                                <option value="good">好</option>
                                <option value="average">一般</option>
                                <option value="poor">不好</option>
                            </select>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">易用性评价</label>
                            <select class="feedback-input" name="usability">
                                <option value="">请选择</option>
                                <option value="excellent">非常好</option>
                                <option value="good">好</option>
                                <option value="average">一般</option>
                                <option value="poor">不好</option>
                            </select>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">最喜欢的功能</label>
                            <textarea class="feedback-textarea" name="likes" placeholder="请告诉我们您最喜欢的功能或改进..."></textarea>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">需要改进的地方</label>
                            <textarea class="feedback-textarea" name="improvements" placeholder="请告诉我们还有哪些地方需要改进..."></textarea>
                        </div>
                        <div class="feedback-form-group">
                            <label class="feedback-label">是否愿意推荐给同事？</label>
                            <select class="feedback-input" name="recommend">
                                <option value="">请选择</option>
                                <option value="definitely">肯定会</option>
                                <option value="probably">可能会</option>
                                <option value="neutral">中性</option>
                                <option value="probably_not">可能不会</option>
                                <option value="definitely_not">肯定不会</option>
                            </select>
                        </div>
                        <div class="feedback-actions">
                            <button type="button" class="feedback-btn feedback-btn-secondary" onclick="userFeedback.hideFeedbackModal()">取消</button>
                            <button type="submit" class="feedback-btn feedback-btn-primary">提交评价</button>
                        </div>
                    </form>
                `;

            default:
                return '<p>未知的反馈类型</p>';
        }
    }

    setupFormEvents(type) {
        const form = document.querySelector(`#${type}FeedbackForm, #${type}Form, #generalFeedbackForm, #bugReportForm, #featureRequestForm, #satisfactionForm`);
        if (!form) return;

        // 字符计数
        const textarea = form.querySelector('textarea[name="description"]');
        const charCount = document.getElementById('charCount');
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
            });
        }

        // 星级评分
        const ratingContainer = form.querySelector('.feedback-rating');
        if (ratingContainer) {
            const stars = ratingContainer.querySelectorAll('.feedback-star');
            const ratingInput = form.querySelector('input[name="rating"]');
            
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    const value = parseInt(star.dataset.value);
                    ratingContainer.dataset.rating = value;
                    ratingInput.value = value;
                    
                    stars.forEach((s, index) => {
                        s.classList.toggle('active', index < value);
                    });
                });
                
                star.addEventListener('mouseenter', () => {
                    const value = parseInt(star.dataset.value);
                    stars.forEach((s, index) => {
                        s.style.color = index < value ? '#fbbf24' : '#d1d5db';
                    });
                });
            });
            
            ratingContainer.addEventListener('mouseleave', () => {
                const currentRating = parseInt(ratingContainer.dataset.rating);
                stars.forEach((s, index) => {
                    s.style.color = index < currentRating ? '#fbbf24' : '#d1d5db';
                });
            });
        }

        // 表单提交
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitFeedback(form, type);
        });
    }

    async submitFeedback(form, type) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // 添加额外信息
        data.type = type;
        data.timestamp = new Date().toISOString();
        data.url = window.location.href;
        data.userAgent = navigator.userAgent;
        data.screenResolution = `${screen.width}x${screen.height}`;
        data.viewportSize = `${window.innerWidth}x${window.innerHeight}`;

        try {
            // 显示提交中状态
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '提交中...';
            submitBtn.disabled = true;

            // 发送到服务器
            const response = await this.sendFeedback(data);
            
            if (response.success) {
                this.showSuccessMessage(type);
                this.trackFeedbackSubmission(type);
            } else {
                throw new Error(response.message || '提交失败');
            }
        } catch (error) {
            console.error('反馈提交失败:', error);
            this.showErrorMessage(error.message);
            
            // 恢复按钮状态
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async sendFeedback(data) {
        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            // 如果服务器不可用，保存到本地存储
            this.saveFeedbackLocally(data);
            return { success: true, message: '反馈已保存，将在网络恢复后提交' };
        }
    }

    saveFeedbackLocally(data) {
        const localFeedback = JSON.parse(localStorage.getItem('pendingFeedback') || '[]');
        localFeedback.push(data);
        localStorage.setItem('pendingFeedback', JSON.stringify(localFeedback));
    }

    showSuccessMessage(type) {
        const container = document.getElementById('feedbackFormContainer');
        const messages = {
            general: '感谢您的反馈！我们会认真考虑您的建议。',
            bug: '问题报告已提交！我们会尽快处理并与您联系。',
            feature: '功能建议已收到！我们会评估并考虑在未来版本中实现。',
            satisfaction: '感谢您的评价！您的意见对我们改进产品非常重要。'
        };
        
        container.innerHTML = `
            <div class="feedback-success">
                <div class="feedback-success-icon">✅</div>
                <div class="feedback-success-title">提交成功</div>
                <div class="feedback-success-text">${messages[type] || '反馈已提交成功！'}</div>
                <div class="feedback-actions" style="margin-top: 20px;">
                    <button class="feedback-btn feedback-btn-primary" onclick="userFeedback.hideFeedbackModal()">关闭</button>
                </div>
            </div>
        `;
        
        // 3秒后自动关闭
        setTimeout(() => {
            this.hideFeedbackModal();
        }, 3000);
    }

    showErrorMessage(message) {
        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 6px;
            border: 1px solid #fecaca;
            z-index: 10001;
            max-width: 300px;
        `;
        errorDiv.textContent = `提交失败: ${message}`;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showFeedbackModal() {
        this.feedbackModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideFeedbackModal() {
        this.feedbackModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    showPageFeedbackWidget() {
        const widget = document.createElement('div');
        widget.className = 'feedback-page-widget';
        widget.innerHTML = `
            <div class="feedback-page-widget-title">这个页面对您有帮助吗？</div>
            <div class="feedback-page-widget-text">您的反馈帮助我们改进用户体验</div>
            <div class="feedback-quick-actions">
                <button class="feedback-quick-btn positive" onclick="userFeedback.quickFeedback('helpful')">有帮助</button>
                <button class="feedback-quick-btn negative" onclick="userFeedback.quickFeedback('not-helpful')">没帮助</button>
                <button class="feedback-quick-btn" onclick="userFeedback.hidePageWidget()">关闭</button>
            </div>
        `;
        
        document.body.appendChild(widget);
        this.pageWidget = widget;
        
        setTimeout(() => {
            widget.classList.add('show');
        }, 100);
        
        // 30秒后自动隐藏
        setTimeout(() => {
            this.hidePageWidget();
        }, 30000);
    }

    hidePageWidget() {
        if (this.pageWidget) {
            this.pageWidget.classList.remove('show');
            setTimeout(() => {
                this.pageWidget.remove();
            }, 300);
        }
    }

    quickFeedback(type) {
        const data = {
            type: 'quick',
            feedback: type,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        this.sendFeedback(data);
        this.hidePageWidget();
        
        // 显示感谢消息
        const thanks = document.createElement('div');
        thanks.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 999;
        `;
        thanks.textContent = '感谢您的反馈！';
        document.body.appendChild(thanks);
        
        setTimeout(() => {
            thanks.remove();
        }, 3000);
    }

    checkAutoSurvey() {
        if (!this.config.autoShowSurvey) return;
        
        const lastSurvey = localStorage.getItem('lastSurveyTime');
        const neverShow = localStorage.getItem('neverShowSurvey');
        
        if (neverShow === 'true') return;
        
        const now = Date.now();
        if (!lastSurvey || (now - parseInt(lastSurvey)) > this.config.surveyInterval) {
            setTimeout(() => {
                this.showSurveyBanner();
            }, 60000); // 1分钟后显示
        }
    }

    showSurveyBanner() {
        this.surveyBanner.classList.add('show');
    }

    showSatisfactionSurvey() {
        this.hideSurveyBanner();
        this.showFeedbackModal();
        this.selectFeedbackType('satisfaction');
    }

    dismissSurvey(never = false) {
        this.hideSurveyBanner();
        
        if (never) {
            localStorage.setItem('neverShowSurvey', 'true');
        } else {
            localStorage.setItem('lastSurveyTime', Date.now().toString());
        }
    }

    hideSurveyBanner() {
        this.surveyBanner.classList.remove('show');
    }

    handlePageError(error) {
        // 自动收集错误信息，但不强制用户报告
        const errorData = {
            type: 'auto-error',
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            stack: error.error ? error.error.stack : '',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // 静默发送错误报告
        this.sendFeedback(errorData).catch(() => {
            // 如果发送失败，保存到本地
            this.saveFeedbackLocally(errorData);
        });
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        return `${browser} - ${ua}`;
    }

    trackFeedbackSubmission(type) {
        // 记录反馈提交统计
        const stats = JSON.parse(localStorage.getItem('feedbackStats') || '{}');
        stats[type] = (stats[type] || 0) + 1;
        stats.total = (stats.total || 0) + 1;
        stats.lastSubmission = new Date().toISOString();
        localStorage.setItem('feedbackStats', JSON.stringify(stats));
    }

    saveDraftFeedback() {
        // 保存未完成的反馈草稿
        const activeForm = document.querySelector('.feedback-modal.show form');
        if (activeForm) {
            const formData = new FormData(activeForm);
            const draft = Object.fromEntries(formData.entries());
            localStorage.setItem('feedbackDraft', JSON.stringify(draft));
        }
    }

    // 公共API方法
    showFeedback(type = 'general') {
        this.showFeedbackModal();
        if (type !== 'general') {
            this.selectFeedbackType(type);
        }
    }

    reportBug() {
        this.showFeedback('bug');
    }

    requestFeature() {
        this.showFeedback('feature');
    }

    rateSatisfaction() {
        this.showFeedback('satisfaction');
    }
}

// 初始化用户反馈系统
let userFeedback;
document.addEventListener('DOMContentLoaded', () => {
    userFeedback = new UserFeedbackSystem();
    
    // 将实例暴露到全局，方便其他脚本调用
    window.userFeedback = userFeedback;
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserFeedbackSystem;
}
/**
 * Account Settings Management System
 * 账户设置管理系统 - 个人信息、安全设置、偏好配置
 */

class AccountSettingsManager {
    constructor() {
        this.currentSection = 'profile';
        this.isDemoMode = true; // 默认演示模式
        this.settings = this.loadSettings();
        this.init();
    }

    /**
     * 初始化账户设置管理系统
     */
    init() {
        this.setupNavigation();
        this.setupProfileSection();
        this.setupSecuritySection();
        this.setupPreferencesSection();
        this.setupNotificationsSection();
        this.setupActivitySection();
        this.setupGlobalEvents();
        
        console.log('Account Settings Manager initialized');
    }

    /**
     * 设置导航功能
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.settings-nav-item');
        
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetSection = e.currentTarget.dataset.section;
                this.switchSection(targetSection);
            });
        });
    }

    /**
     * 切换设置区域
     */
    switchSection(sectionName) {
        // 更新导航状态
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.classList.remove('settings-nav-item--active');
            item.setAttribute('aria-selected', 'false');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('settings-nav-item--active');
            activeNavItem.setAttribute('aria-selected', 'true');
        }

        // 更新内容区域
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('settings-section--active');
        });

        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.classList.add('settings-section--active');
        }

        this.currentSection = sectionName;
        
        // 根据不同区域执行特定初始化
        if (sectionName === 'activity') {
            this.loadActivityData();
        }
    }

    /**
     * 设置个人信息区域
     */
    setupProfileSection() {
        const profileForm = document.getElementById('profileForm');
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const removeAvatarBtn = document.getElementById('removeAvatarBtn');
        const avatarInput = document.getElementById('avatarInput');
        const resetProfileBtn = document.getElementById('resetProfileBtn');

        // 头像更换
        if (changeAvatarBtn && avatarInput) {
            changeAvatarBtn.addEventListener('click', () => {
                avatarInput.click();
            });

            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarUpload(e.target.files[0]);
            });
        }

        // 移除头像
        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => {
                this.removeAvatar();
            });
        }

        // 表单提交
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        // 重置按钮
        if (resetProfileBtn) {
            resetProfileBtn.addEventListener('click', () => {
                this.resetProfile();
            });
        }

        // 实时验证
        this.setupProfileValidation();
    }

    /**
     * 设置个人信息验证
     */
    setupProfileValidation() {
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');

        if (emailInput) {
            emailInput.addEventListener('blur', () => {
                this.validateEmail(emailInput.value);
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('blur', () => {
                this.validatePhone(phoneInput.value);
            });
        }
    }

    /**
     * 处理头像上传
     */
    handleAvatarUpload(file) {
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this.showNotification('请选择有效的图片文件', 'error');
            return;
        }

        // 验证文件大小 (2MB)
        if (file.size > 2 * 1024 * 1024) {
            this.showNotification('图片文件大小不能超过2MB', 'error');
            return;
        }

        // 预览头像
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatar = document.querySelector('.user-avatar__text');
            if (avatar) {
                // 创建预览图片
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '50%';
                
                avatar.parentElement.style.background = 'none';
                avatar.style.display = 'none';
                avatar.parentElement.appendChild(img);
            }
        };
        reader.readAsDataURL(file);

        this.showNotification('头像已更新', 'success');
    }

    /**
     * 移除头像
     */
    removeAvatar() {
        const avatar = document.querySelector('.user-avatar');
        if (avatar) {
            // 恢复默认头像
            avatar.style.background = 'linear-gradient(135deg, var(--account-primary) 0%, var(--account-secondary) 100%)';
            
            const img = avatar.querySelector('img');
            if (img) {
                img.remove();
            }
            
            const text = avatar.querySelector('.user-avatar__text');
            if (text) {
                text.style.display = 'flex';
            }
        }

        this.showNotification('头像已移除', 'success');
    }

    /**
     * 保存个人信息
     */
    async saveProfile() {
        const formData = new FormData(document.getElementById('profileForm'));
        const profileData = Object.fromEntries(formData);

        // 验证必填字段
        if (!this.validateProfileData(profileData)) {
            return;
        }

        try {
            this.setLoading(true);

            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 保存到本地存储
            this.settings.profile = { ...this.settings.profile, ...profileData };
            this.saveSettings();

            this.showNotification('个人信息已保存', 'success');
        } catch (error) {
            this.showNotification('保存失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 验证个人信息数据
     */
    validateProfileData(data) {
        const requiredFields = ['username', 'email', 'fullName'];
        
        for (const field of requiredFields) {
            if (!data[field] || !data[field].trim()) {
                this.showNotification(`请填写${this.getFieldLabel(field)}`, 'error');
                return false;
            }
        }

        if (!this.validateEmail(data.email)) {
            return false;
        }

        if (data.phone && !this.validatePhone(data.phone)) {
            return false;
        }

        return true;
    }

    /**
     * 重置个人信息
     */
    resetProfile() {
        const form = document.getElementById('profileForm');
        if (form) {
            form.reset();
            this.showNotification('已重置为原始信息', 'info');
        }
    }

    /**
     * 设置安全区域
     */
    setupSecuritySection() {
        this.setupPasswordChange();
        this.setupTwoFactorAuth();
        this.setupSessionManagement();
    }

    /**
     * 设置密码修改功能
     */
    setupPasswordChange() {
        const passwordForm = document.getElementById('passwordForm');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        // 密码可见性切换
        this.setupPasswordVisibilityToggles();

        // 密码强度检测
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
                this.validatePasswordMatch();
            });
        }

        // 确认密码验证
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }

        // 表单提交
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }
    }

    /**
     * 设置密码可见性切换
     */
    setupPasswordVisibilityToggles() {
        const toggleButtons = [
            'toggleCurrentPassword',
            'toggleNewPassword', 
            'toggleConfirmPassword'
        ];

        toggleButtons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.togglePasswordVisibility(button);
                });
            }
        });
    }

    /**
     * 切换密码可见性
     */
    togglePasswordVisibility(button) {
        const input = button.previousElementSibling;
        if (input && input.type) {
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🙈';
            } else {
                input.type = 'password';
                button.textContent = '👁️';
            }
        }
    }

    /**
     * 检查密码强度
     */
    checkPasswordStrength(password) {
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
        
        if (!password) {
            this.updateStrengthDisplay(strengthBar, strengthText, 'none', '请输入新密码');
            this.updateRequirements(password);
            return;
        }

        const strength = this.calculatePasswordStrength(password);
        const strengthLevels = ['weak', 'fair', 'good', 'strong'];
        const strengthTexts = ['弱', '一般', '好', '强'];
        
        this.updateStrengthDisplay(strengthBar, strengthText, strengthLevels[strength], `密码强度：${strengthTexts[strength]}`);
        this.updateRequirements(password);
    }

    /**
     * 计算密码强度
     */
    calculatePasswordStrength(password) {
        let score = 0;
        
        // 长度检查
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // 字符类型检查
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        // 复杂度检查
        if (password.length >= 12 && score >= 4) score++;

        return Math.min(Math.floor(score / 2), 3);
    }

    /**
     * 更新强度显示
     */
    updateStrengthDisplay(strengthBar, strengthText, level, text) {
        if (strengthBar) {
            strengthBar.className = `strength-bar-fill ${level}`;
        }
        
        if (strengthText) {
            strengthText.className = `strength-text ${level}`;
            strengthText.textContent = text;
        }
    }

    /**
     * 更新密码要求显示
     */
    updateRequirements(password) {
        const requirements = [
            { id: 'lengthReq', test: password.length >= 8 },
            { id: 'upperReq', test: /[A-Z]/.test(password) },
            { id: 'lowerReq', test: /[a-z]/.test(password) },
            { id: 'numberReq', test: /[0-9]/.test(password) },
            { id: 'specialReq', test: /[^A-Za-z0-9]/.test(password) }
        ];

        requirements.forEach(req => {
            const element = document.getElementById(req.id);
            if (element) {
                element.classList.toggle('met', req.test);
            }
        });
    }

    /**
     * 验证密码匹配
     */
    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const matchElement = document.getElementById('passwordMatch');

        if (!confirmPassword) {
            matchElement.textContent = '';
            return true;
        }

        if (newPassword === confirmPassword) {
            matchElement.textContent = '✓ 密码匹配';
            matchElement.style.color = 'var(--status-success)';
            return true;
        } else {
            matchElement.textContent = '✗ 密码不匹配';
            matchElement.style.color = 'var(--status-error)';
            return false;
        }
    }

    /**
     * 修改密码
     */
    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 验证输入
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showNotification('请填写所有密码字段', 'error');
            return;
        }

        if (!this.validatePasswordMatch()) {
            this.showNotification('新密码和确认密码不匹配', 'error');
            return;
        }

        if (this.calculatePasswordStrength(newPassword) < 2) {
            this.showNotification('新密码强度太弱，请使用更强的密码', 'error');
            return;
        }

        try {
            this.setLoading(true);

            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.showNotification('密码修改成功', 'success');
            
            // 清空表单
            document.getElementById('passwordForm').reset();
            this.checkPasswordStrength('');

        } catch (error) {
            this.showNotification('密码修改失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 设置双因素认证
     */
    setupTwoFactorAuth() {
        const smsAuthSwitch = document.getElementById('smsAuth');
        const emailAuthSwitch = document.getElementById('emailAuth');
        const setupTOTPBtn = document.getElementById('setupTOTP');

        // 短信认证开关
        if (smsAuthSwitch) {
            smsAuthSwitch.addEventListener('change', (e) => {
                this.toggleTwoFactorAuth('sms', e.target.checked);
            });
        }

        // 邮箱认证开关
        if (emailAuthSwitch) {
            emailAuthSwitch.addEventListener('change', (e) => {
                this.toggleTwoFactorAuth('email', e.target.checked);
            });
        }

        // TOTP设置
        if (setupTOTPBtn) {
            setupTOTPBtn.addEventListener('click', () => {
                this.setupTOTP();
            });
        }
    }

    /**
     * 切换双因素认证
     */
    async toggleTwoFactorAuth(type, enabled) {
        try {
            this.setLoading(true);

            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));

            const typeNames = { sms: '短信', email: '邮箱' };
            const message = enabled ? 
                `${typeNames[type]}验证已启用` : 
                `${typeNames[type]}验证已禁用`;

            this.showNotification(message, 'success');
            
            // 保存设置
            this.settings.security = this.settings.security || {};
            this.settings.security[`${type}Auth`] = enabled;
            this.saveSettings();

        } catch (error) {
            this.showNotification('设置失败，请重试', 'error');
            // 回滚开关状态
            const switchElement = document.getElementById(`${type}Auth`);
            if (switchElement) {
                switchElement.checked = !enabled;
            }
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 设置TOTP认证
     */
    setupTOTP() {
        // 生成模拟的二维码
        const qrCode = this.generateMockQRCode();
        
        // 显示设置对话框
        this.showTOTPSetupDialog(qrCode);
    }

    /**
     * 生成模拟二维码
     */
    generateMockQRCode() {
        return {
            secret: 'JBSWY3DPEHPK3PXP',
            qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            appName: 'CJPayment',
            accountName: 'admin@cjpayment.com'
        };
    }

    /**
     * 显示TOTP设置对话框
     */
    showTOTPSetupDialog(qrData) {
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = `
            <div class="modal totp-setup-modal">
                <div class="modal__header">
                    <h3>设置身份验证器</h3>
                    <button class="modal__close" type="button">&times;</button>
                </div>
                <div class="modal__body">
                    <div class="totp-setup-steps">
                        <div class="setup-step">
                            <h4>步骤 1: 安装身份验证器应用</h4>
                            <p>下载并安装 Google Authenticator、Microsoft Authenticator 或其他支持 TOTP 的应用</p>
                        </div>
                        
                        <div class="setup-step">
                            <h4>步骤 2: 扫描二维码</h4>
                            <div class="qr-code-container">
                                <div class="qr-code-placeholder">📱 二维码</div>
                                <p>使用身份验证器应用扫描此二维码</p>
                            </div>
                        </div>
                        
                        <div class="setup-step">
                            <h4>步骤 3: 输入验证码</h4>
                            <div class="verification-input">
                                <input type="text" class="form-input" id="totpCode" placeholder="输入6位验证码" maxlength="6">
                                <button class="btn btn-primary" id="verifyTOTP">验证</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal__footer">
                    <button class="btn btn-outline cancel-totp">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 设置事件监听
        const closeDialog = () => {
            document.body.removeChild(dialog);
        };

        dialog.querySelector('.modal__close').onclick = closeDialog;
        dialog.querySelector('.cancel-totp').onclick = closeDialog;
        dialog.onclick = (e) => {
            if (e.target === dialog) closeDialog();
        };

        // 验证按钮
        dialog.querySelector('#verifyTOTP').onclick = () => {
            const code = dialog.querySelector('#totpCode').value;
            if (code && code.length === 6) {
                this.showNotification('TOTP认证设置成功', 'success');
                closeDialog();
            } else {
                this.showNotification('请输入6位验证码', 'error');
            }
        };
    }

    /**
     * 设置会话管理
     */
    setupSessionManagement() {
        const revokeAllBtn = document.getElementById('revokeAllSessions');
        const revokeButtons = document.querySelectorAll('.session-revoke');

        // 注销所有其他会话
        if (revokeAllBtn) {
            revokeAllBtn.addEventListener('click', () => {
                this.revokeAllSessions();
            });
        }

        // 注销单个会话
        revokeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.dataset.session;
                this.revokeSession(sessionId);
            });
        });
    }

    /**
     * 注销所有其他会话
     */
    async revokeAllSessions() {
        if (!confirm('确定要注销所有其他设备的登录会话吗？')) {
            return;
        }

        try {
            this.setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.showNotification('已注销所有其他会话', 'success');
            
            // 移除非当前会话的显示
            const sessionItems = document.querySelectorAll('.session-item:not(.session-item--current)');
            sessionItems.forEach(item => item.remove());

        } catch (error) {
            this.showNotification('操作失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 注销单个会话
     */
    async revokeSession(sessionId) {
        try {
            this.setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showNotification('会话已注销', 'success');
            
            // 移除会话显示
            const sessionItem = document.querySelector(`[data-session="${sessionId}"]`).closest('.session-item');
            if (sessionItem) {
                sessionItem.remove();
            }

        } catch (error) {
            this.showNotification('操作失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 设置偏好区域
     */
    setupPreferencesSection() {
        const preferencesForm = document.getElementById('preferencesForm');
        const resetPreferencesBtn = document.getElementById('resetPreferencesBtn');
        const themeRadios = document.querySelectorAll('input[name="theme"]');

        // 主题切换
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.applyTheme(e.target.value);
                }
            });
        });

        // 表单提交
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePreferences();
            });
        }

        // 重置按钮
        if (resetPreferencesBtn) {
            resetPreferencesBtn.addEventListener('click', () => {
                this.resetPreferences();
            });
        }

        // 加载已保存的偏好设置
        this.loadPreferences();
    }

    /**
     * 应用主题
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'auto') {
            // 跟随系统
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            html.setAttribute('data-theme', theme);
        }

        // 更新主题按钮图标
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '🌞' : '🌙';
            }
        }

        this.showNotification(`已切换到${this.getThemeName(theme)}`, 'success');
    }

    /**
     * 获取主题名称
     */
    getThemeName(theme) {
        const themeNames = {
            light: '浅色模式',
            dark: '深色模式',
            auto: '跟随系统'
        };
        return themeNames[theme] || theme;
    }

    /**
     * 保存偏好设置
     */
    async savePreferences() {
        const formData = new FormData(document.getElementById('preferencesForm'));
        const preferences = Object.fromEntries(formData);

        // 处理复选框
        const checkboxes = document.querySelectorAll('#preferencesForm input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            preferences[checkbox.name] = checkbox.checked;
        });

        try {
            this.setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 保存到本地存储
            this.settings.preferences = preferences;
            this.saveSettings();

            this.showNotification('偏好设置已保存', 'success');

        } catch (error) {
            this.showNotification('保存失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 重置偏好设置
     */
    resetPreferences() {
        if (!confirm('确定要重置为默认偏好设置吗？')) {
            return;
        }

        // 重置表单
        const form = document.getElementById('preferencesForm');
        if (form) {
            form.reset();
            
            // 重置主题为浅色
            document.documentElement.setAttribute('data-theme', 'light');
            
            this.showNotification('已重置为默认设置', 'success');
        }
    }

    /**
     * 加载偏好设置
     */
    loadPreferences() {
        const preferences = this.settings.preferences || {};
        
        // 设置表单值
        Object.keys(preferences).forEach(key => {
            const element = document.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = preferences[key];
                } else {
                    element.value = preferences[key];
                }
            }
        });

        // 应用主题设置
        const theme = preferences.theme || 'light';
        this.applyTheme(theme);
    }

    /**
     * 设置通知区域
     */
    setupNotificationsSection() {
        const notificationsForm = document.getElementById('notificationsForm');
        const testNotificationsBtn = document.getElementById('testNotifications');

        // 表单提交
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNotificationSettings();
            });
        }

        // 测试通知
        if (testNotificationsBtn) {
            testNotificationsBtn.addEventListener('click', () => {
                this.testNotifications();
            });
        }

        // 请求通知权限
        this.requestNotificationPermission();
    }

    /**
     * 请求通知权限
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showNotification('浏览器通知已启用', 'success');
            }
        }
    }

    /**
     * 保存通知设置
     */
    async saveNotificationSettings() {
        const formData = new FormData(document.getElementById('notificationsForm'));
        const notifications = {};

        // 处理所有输入类型
        for (const [key, value] of formData.entries()) {
            notifications[key] = value;
        }

        // 处理复选框
        const checkboxes = document.querySelectorAll('#notificationsForm input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            notifications[checkbox.name] = checkbox.checked;
        });

        try {
            this.setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 保存到本地存储
            this.settings.notifications = notifications;
            this.saveSettings();

            this.showNotification('通知设置已保存', 'success');

        } catch (error) {
            this.showNotification('保存失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 测试通知
     */
    testNotifications() {
        // 测试浏览器通知
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('CJPayment 测试通知', {
                body: '这是一条测试通知消息',
                icon: '/static/favicon.ico'
            });
        }

        // 测试应用内通知
        this.showNotification('🧪 这是一条测试通知', 'info');
        
        setTimeout(() => {
            this.showNotification('📧 邮件通知测试（模拟）', 'success');
        }, 2000);

        setTimeout(() => {
            this.showNotification('📱 短信通知测试（模拟）', 'warning');
        }, 4000);
    }

    /**
     * 设置活动记录区域
     */
    setupActivitySection() {
        const activityType = document.getElementById('activityType');
        const activityDate = document.getElementById('activityDate');
        const refreshActivityBtn = document.getElementById('refreshActivity');
        const loadMoreActivityBtn = document.getElementById('loadMoreActivity');
        const exportActivityBtn = document.getElementById('exportActivity');

        // 筛选变更
        [activityType, activityDate].forEach(select => {
            if (select) {
                select.addEventListener('change', () => {
                    this.filterActivity();
                });
            }
        });

        // 刷新活动
        if (refreshActivityBtn) {
            refreshActivityBtn.addEventListener('click', () => {
                this.loadActivityData(true);
            });
        }

        // 加载更多
        if (loadMoreActivityBtn) {
            loadMoreActivityBtn.addEventListener('click', () => {
                this.loadMoreActivity();
            });
        }

        // 导出记录
        if (exportActivityBtn) {
            exportActivityBtn.addEventListener('click', () => {
                this.exportActivity();
            });
        }
    }

    /**
     * 加载活动数据
     */
    async loadActivityData(refresh = false) {
        if (refresh) {
            this.showNotification('正在刷新活动记录...', 'info');
        }

        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 800));

            // 生成模拟活动数据
            const activities = this.generateMockActivities();
            this.renderActivityTimeline(activities);

            if (refresh) {
                this.showNotification('活动记录已刷新', 'success');
            }

        } catch (error) {
            this.showNotification('加载活动记录失败', 'error');
        }
    }

    /**
     * 生成模拟活动数据
     */
    generateMockActivities() {
        const activityTypes = [
            { type: 'login', icon: '🔓', title: '成功登录', desc: 'Chrome浏览器 · 北京, 中国' },
            { type: 'security', icon: '🔐', title: '修改了密码', desc: '密码强度：强' },
            { type: 'settings', icon: '⚙️', title: '更新了偏好设置', desc: '主题模式变更为深色模式' },
            { type: 'data', icon: '📊', title: '导出了数据报表', desc: '商户管理数据 · CSV格式' }
        ];

        return Array.from({ length: 10 }, (_, i) => {
            const activity = activityTypes[i % activityTypes.length];
            const hoursAgo = Math.floor(Math.random() * 168) + 1; // 1周内
            
            return {
                ...activity,
                time: this.formatTimeAgo(hoursAgo),
                timestamp: Date.now() - (hoursAgo * 60 * 60 * 1000)
            };
        }).sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * 渲染活动时间线
     */
    renderActivityTimeline(activities) {
        const timeline = document.getElementById('activityTimeline');
        if (!timeline) return;

        timeline.innerHTML = activities.map(activity => `
            <div class="activity-item activity-item--${activity.type}">
                <div class="activity-icon">
                    <span class="activity-icon-text">${activity.icon}</span>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-desc">${activity.desc}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * 筛选活动
     */
    filterActivity() {
        this.loadActivityData();
    }

    /**
     * 加载更多活动
     */
    async loadMoreActivity() {
        try {
            this.setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 生成更多模拟数据
            const moreActivities = this.generateMockActivities();
            const timeline = document.getElementById('activityTimeline');
            
            if (timeline) {
                timeline.innerHTML += moreActivities.map(activity => `
                    <div class="activity-item activity-item--${activity.type}">
                        <div class="activity-icon">
                            <span class="activity-icon-text">${activity.icon}</span>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${activity.title}</div>
                            <div class="activity-desc">${activity.desc}</div>
                            <div class="activity-time">${activity.time}</div>
                        </div>
                    </div>
                `).join('');
            }

            this.showNotification('已加载更多记录', 'success');

        } catch (error) {
            this.showNotification('加载失败，请重试', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 导出活动记录
     */
    exportActivity() {
        const activities = this.generateMockActivities();
        const csvContent = [
            '时间,类型,活动,描述',
            ...activities.map(activity => 
                `"${new Date(activity.timestamp).toLocaleString()}","${activity.type}","${activity.title}","${activity.desc}"`
            )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `活动记录-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        this.showNotification('活动记录已导出', 'success');
    }

    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 关闭模态框
                const modal = document.querySelector('.modal-overlay');
                if (modal) {
                    modal.remove();
                }
            }
        });

        // 自动保存提醒
        let changesMade = false;
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    changesMade = true;
                });
            });
        });

        // 页面离开提醒
        window.addEventListener('beforeunload', (e) => {
            if (changesMade) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
            }
        });
    }

    /**
     * 工具方法
     */
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = regex.test(email);
        
        if (!isValid && email) {
            this.showNotification('请输入有效的邮箱地址', 'error');
        }
        
        return isValid;
    }

    validatePhone(phone) {
        const regex = /^1[3-9]\d{9}$/;
        const isValid = regex.test(phone);
        
        if (!isValid && phone) {
            this.showNotification('请输入有效的手机号码', 'error');
        }
        
        return isValid;
    }

    getFieldLabel(fieldName) {
        const labels = {
            username: '用户名',
            email: '邮箱地址',
            fullName: '姓名',
            phone: '手机号码'
        };
        return labels[fieldName] || fieldName;
    }

    formatTimeAgo(hours) {
        if (hours < 1) return '刚刚';
        if (hours < 24) return `${hours}小时前`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}天前`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks}周前`;
        
        const months = Math.floor(days / 30);
        return `${months}个月前`;
    }

    /**
     * 设置和本地存储
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('accountSettings');
            return saved ? JSON.parse(saved) : {
                profile: {},
                security: {},
                preferences: {
                    theme: 'light',
                    language: 'zh-CN',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: '24'
                },
                notifications: {}
            };
        } catch (error) {
            console.warn('Failed to load settings:', error);
            return {};
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('accountSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    /**
     * UI 反馈方法
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            background: var(--account-bg-secondary);
            border: 1px solid var(--dashboard-border-light);
            border-radius: 8px;
            box-shadow: var(--account-shadow-lg);
            padding: 1rem;
            min-width: 300px;
            animation: slideInNotification 0.3s ease;
        `;

        // 添加到页面
        document.body.appendChild(notification);

        // 关闭按钮事件
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.onclick = () => this.hideNotification(notification);

        // 自动关闭
        setTimeout(() => this.hideNotification(notification), 5000);
    }

    hideNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutNotification 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    setLoading(loading) {
        const loadingOverlay = document.getElementById('globalLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }
}

// CSS 动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInNotification {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutNotification {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.6;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    .notification--success {
        border-left: 4px solid var(--status-success);
    }
    
    .notification--error {
        border-left: 4px solid var(--status-error);
    }
    
    .notification--warning {
        border-left: 4px solid var(--status-warning);
    }
    
    .notification--info {
        border-left: 4px solid var(--status-info);
    }
`;
document.head.appendChild(style);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    window.accountSettingsManager = new AccountSettingsManager();
});

// 导出到全局
window.AccountSettingsManager = AccountSettingsManager;
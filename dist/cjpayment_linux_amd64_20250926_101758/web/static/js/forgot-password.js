/**
 * 忘记密码功能JavaScript
 * 处理多步骤密码重置流程
 */

class ForgotPasswordManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.accountId = '';
        this.resetToken = '';
        this.resendCountdown = 0;
        this.resendTimer = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initPasswordStrength();
        console.log('🔐 忘记密码系统初始化完成');
    }
    
    bindEvents() {
        // Step 1: 发送重置请求
        document.getElementById('forgotPasswordForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendReset();
        });
        
        // Step 2: 验证码验证
        document.getElementById('verifyCodeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVerifyCode();
        });
        
        // Step 3: 重置密码
        document.getElementById('resetPasswordForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResetPassword();
        });
        
        // 重发验证码
        document.getElementById('resendCodeBtn')?.addEventListener('click', () => {
            this.handleResendCode();
        });
        
        // 密码显示/隐藏切换
        this.initPasswordToggles();
        
        // 验证码输入格式化
        const verificationInput = document.getElementById('verificationCode');
        if (verificationInput) {
            verificationInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\\D/g, '').slice(0, 6);
            });
        }
    }
    
    initPasswordToggles() {
        ['newPasswordToggle', 'confirmPasswordToggle'].forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (!toggle) return;
            
            toggle.addEventListener('click', () => {
                const targetId = toggleId.replace('Toggle', '');
                const input = document.getElementById(targetId);
                const icon = toggle.querySelector('.icon');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = '🙈';
                } else {
                    input.type = 'password';
                    icon.textContent = '👁️';
                }
            });
        });
    }
    
    initPasswordStrength() {
        const passwordInput = document.getElementById('newPassword');
        if (!passwordInput) return;
        
        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
            this.validatePasswordMatch();
        });
        
        document.getElementById('confirmPassword')?.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
    }
    
    updatePasswordStrength(password) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthFill || !strengthText) return;
        
        const strength = this.calculatePasswordStrength(password);
        
        // 清除之前的class
        strengthFill.className = 'strength-fill';
        strengthText.className = 'strength-text';
        
        if (password.length === 0) {
            strengthText.textContent = '密码强度';
            return;
        }
        
        if (strength.score <= 2) {
            strengthFill.classList.add('weak');
            strengthText.classList.add('weak');
            strengthText.textContent = '弱';
        } else if (strength.score <= 4) {
            strengthFill.classList.add('medium');
            strengthText.classList.add('medium');
            strengthText.textContent = '中等';
        } else {
            strengthFill.classList.add('strong');
            strengthText.classList.add('strong');
            strengthText.textContent = '强';
        }
    }
    
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
        
        return { score, maxScore: 6 };
    }
    
    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorElement = document.getElementById('confirmPasswordError');
        
        if (confirmPassword && newPassword !== confirmPassword) {
            this.showError(errorElement, '两次输入的密码不一致');
            return false;
        } else {
            this.clearError(errorElement);
            return true;
        }
    }
    
    async handleSendReset() {
        const accountId = document.getElementById('accountId').value.trim();
        const securityAnswer = document.getElementById('securityAnswer')?.value?.trim() || '';
        
        if (!accountId) {
            this.showError(document.getElementById('accountIdError'), '请输入用户名或邮箱');
            return;
        }
        
        this.setLoading('sendResetButton', true);
        
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: accountId,
                    securityAnswer: securityAnswer
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.accountId = accountId;
                this.resetToken = result.data.resetToken;
                
                // 显示遮罩邮箱
                const maskedEmail = this.maskEmail(result.data.email);
                document.getElementById('maskedEmail').textContent = maskedEmail;
                
                // 进入下一步
                this.goToStep(2);
                this.startResendCountdown();
                
                console.log('✅ 重置链接发送成功');
            } else {
                // 处理错误情况
                if (result.data?.requireSecurity) {
                    // 需要安全问题验证
                    this.showSecurityQuestion(result.data.securityQuestion);
                } else {
                    this.showError(document.getElementById('accountIdError'), result.message || '发送失败，请稍后重试');
                }
            }
        } catch (error) {
            console.error('❌ 发送重置请求失败:', error);
            this.showError(document.getElementById('accountIdError'), '网络错误，请稍后重试');
        } finally {
            this.setLoading('sendResetButton', false);
        }
    }
    
    showSecurityQuestion(question) {
        const securityGroup = document.getElementById('securityQuestionGroup');
        const questionText = document.getElementById('securityQuestionText');
        
        questionText.textContent = question;
        securityGroup.style.display = 'block';
    }
    
    async handleVerifyCode() {
        const verificationCode = document.getElementById('verificationCode').value.trim();
        
        if (!verificationCode || verificationCode.length !== 6) {
            this.showError(document.getElementById('verificationCodeError'), '请输入6位验证码');
            return;
        }
        
        this.setLoading('verifyCodeButton', true);
        
        try {
            const response = await fetch('/api/verify-reset-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: this.accountId,
                    resetToken: this.resetToken,
                    verificationCode: verificationCode
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.resetToken = result.data.validatedToken;
                this.goToStep(3);
                console.log('✅ 验证码验证成功');
            } else {
                this.showError(document.getElementById('verificationCodeError'), result.message || '验证码错误');
            }
        } catch (error) {
            console.error('❌ 验证码验证失败:', error);
            this.showError(document.getElementById('verificationCodeError'), '验证失败，请稍后重试');
        } finally {
            this.setLoading('verifyCodeButton', false);
        }
    }
    
    async handleResetPassword() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // 验证密码
        if (!this.validatePasswordInput(newPassword, confirmPassword)) {
            return;
        }
        
        this.setLoading('resetPasswordButton', true);
        
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: this.accountId,
                    resetToken: this.resetToken,
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccessMessage();
                console.log('✅ 密码重置成功');
            } else {
                this.showError(document.getElementById('newPasswordError'), result.message || '重置失败，请稍后重试');
            }
        } catch (error) {
            console.error('❌ 密码重置失败:', error);
            this.showError(document.getElementById('newPasswordError'), '重置失败，请稍后重试');
        } finally {
            this.setLoading('resetPasswordButton', false);
        }
    }
    
    validatePasswordInput(newPassword, confirmPassword) {
        let valid = true;
        
        // 密码强度验证
        if (newPassword.length < 8) {
            this.showError(document.getElementById('newPasswordError'), '密码至少需要8个字符');
            valid = false;
        } else if (this.calculatePasswordStrength(newPassword).score < 3) {
            this.showError(document.getElementById('newPasswordError'), '密码强度太弱，请使用更复杂的密码');
            valid = false;
        } else {
            this.clearError(document.getElementById('newPasswordError'));
        }
        
        // 密码一致性验证
        if (!this.validatePasswordMatch()) {
            valid = false;
        }
        
        return valid;
    }
    
    async handleResendCode() {
        if (this.resendCountdown > 0) return;
        
        try {
            const response = await fetch('/api/resend-reset-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: this.accountId,
                    resetToken: this.resetToken
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.startResendCountdown();
                console.log('✅ 验证码重发成功');
            } else {
                alert(result.message || '重发失败，请稍后重试');
            }
        } catch (error) {
            console.error('❌ 重发验证码失败:', error);
            alert('重发失败，请稍后重试');
        }
    }
    
    startResendCountdown() {
        this.resendCountdown = 60;
        const button = document.getElementById('resendCodeBtn');
        const text = document.getElementById('resendText');
        
        button.disabled = true;
        
        this.resendTimer = setInterval(() => {
            this.resendCountdown--;
            text.textContent = `重新发送 (${this.resendCountdown}s)`;
            
            if (this.resendCountdown <= 0) {
                clearInterval(this.resendTimer);
                button.disabled = false;
                text.textContent = '重新发送';
            }
        }, 1000);
    }
    
    goToStep(step) {
        // 隐藏当前步骤
        const currentContainer = document.getElementById(`step${this.currentStep}`);
        if (currentContainer) {
            currentContainer.classList.remove('step-container--active');
            setTimeout(() => {
                currentContainer.style.display = 'none';
            }, 300);
        }
        
        // 显示目标步骤
        const targetContainer = document.getElementById(`step${step}`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
            setTimeout(() => {
                targetContainer.classList.add('step-container--active');
            }, 50);
        }
        
        // 更新进度指示器
        this.updateProgressSteps(step);
        
        this.currentStep = step;
    }
    
    updateProgressSteps(step) {
        for (let i = 1; i <= this.totalSteps; i++) {
            const progressStep = document.getElementById(`progressStep${i}`);
            if (!progressStep) continue;
            
            progressStep.classList.remove('progress-step--active', 'progress-step--completed');
            
            if (i < step) {
                progressStep.classList.add('progress-step--completed');
            } else if (i === step) {
                progressStep.classList.add('progress-step--active');
            }
        }
    }
    
    showSuccessMessage() {
        // 隐藏所有步骤
        for (let i = 1; i <= this.totalSteps; i++) {
            const container = document.getElementById(`step${i}`);
            if (container) {
                container.style.display = 'none';
            }
        }
        
        // 隐藏进度条
        const progressSteps = document.querySelector('.progress-steps');
        if (progressSteps) {
            progressSteps.style.display = 'none';
        }
        
        // 显示成功消息
        const successContainer = document.getElementById('successMessage');
        if (successContainer) {
            successContainer.style.display = 'block';
        }
    }
    
    maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        
        const [username, domain] = email.split('@');
        const maskedUsername = username.length > 2 
            ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
            : username[0] + '*';
        
        return maskedUsername + '@' + domain;
    }
    
    setLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const textSpan = button.querySelector('.btn-text');
        const loadingSpan = button.querySelector('.btn-loading');
        
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            if (textSpan) textSpan.style.display = 'none';
            if (loadingSpan) loadingSpan.style.display = 'flex';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (textSpan) textSpan.style.display = 'inline';
            if (loadingSpan) loadingSpan.style.display = 'none';
        }
    }
    
    showError(element, message) {
        if (!element) return;
        
        element.textContent = message;
        element.style.display = 'block';
        
        // 添加字段错误样式
        const formGroup = element.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('form-group--error');
        }
    }
    
    clearError(element) {
        if (!element) return;
        
        element.textContent = '';
        element.style.display = 'none';
        
        // 移除字段错误样式
        const formGroup = element.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('form-group--error');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new ForgotPasswordManager();
});
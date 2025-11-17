/**
 * Authentication Manager
 * Handles login, registration, and user authentication
 */

window.AuthManager = (function() {
    'use strict';

    class AuthManager {
        constructor() {
            this.loginForm = null;
            this.registerForm = null;
            this.isLoading = false;
        }

        // ==========================================================================
        // Login Page
        // ==========================================================================

        initLogin() {
            this.loginForm = CJUtils.$('#loginForm');
            if (!this.loginForm) return;

            this.bindLoginEvents();
            this.setupPasswordToggle();
            this.checkAutoLogin();
        }

        bindLoginEvents() {
            // Form submission
            CJUtils.on(this.loginForm, 'submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });

            // Real-time validation
            const inputs = this.loginForm.querySelectorAll('input');
            inputs.forEach(input => {
                CJUtils.on(input, 'blur', () => {
                    this.validateField(input);
                });

                CJUtils.on(input, 'input', () => {
                    this.clearFieldError(input);
                });
            });

            // Enter key handling
            CJUtils.on(this.loginForm, 'keydown', (e) => {
                if (e.key === 'Enter' && !this.isLoading) {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }

        setupPasswordToggle() {
            const passwordToggle = CJUtils.$('#passwordToggle');
            const passwordInput = CJUtils.$('#password');
            
            if (passwordToggle && passwordInput) {
                CJUtils.on(passwordToggle, 'click', () => {
                    const isPassword = passwordInput.type === 'password';
                    passwordInput.type = isPassword ? 'text' : 'password';
                    
                    const icon = passwordToggle.querySelector('.icon');
                    icon.textContent = isPassword ? '🙈' : '👁️';
                });
            }
        }

        async handleLogin() {
            if (this.isLoading) return;

            const formData = new FormData(this.loginForm);
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password'),
                remember: formData.get('remember') === 'on'
            };

            // Validate form
            if (!this.validateLoginForm(credentials)) {
                return;
            }

            this.setLoading(true);

            try {
                const response = await CJApi.post('/api/login', credentials);

                if (response.success) {
                    // Store auth token
                    CJUtils.storage.set('auth_token', response.token);
                    CJUtils.storage.set('user', response.user);
                    
                    if (credentials.remember) {
                        CJUtils.storage.set('remember_login', true, 'local');
                    }

                    // Show success message
                    CJComponents.toast.success('登录成功，正在跳转...');

                    // Redirect after short delay
                    setTimeout(() => {
                        const intendedRoute = CJUtils.storage.get('intended_route') || '/dashboard';
                        CJUtils.storage.remove('intended_route');
                        window.location.href = intendedRoute;
                    }, 1000);
                } else {
                    this.showLoginError(response.message || '登录失败');
                }
            } catch (error) {
                console.error('Login error:', error);
                this.showLoginError(error.message || '登录失败，请检查网络连接');
            } finally {
                this.setLoading(false);
            }
        }

        validateLoginForm(credentials) {
            let isValid = true;

            // Validate username
            if (!credentials.username || credentials.username.trim().length < 3) {
                this.showFieldError('username', '用户名至少需要3个字符');
                isValid = false;
            }

            // Validate password
            if (!credentials.password || credentials.password.length < 6) {
                this.showFieldError('password', '密码至少需要6个字符');
                isValid = false;
            }

            return isValid;
        }

        validateField(input) {
            const value = input.value.trim();
            const name = input.name;

            switch (name) {
                case 'username':
                    if (!value) {
                        this.showFieldError(name, '请输入用户名');
                        return false;
                    } else if (value.length < 3) {
                        this.showFieldError(name, '用户名至少需要3个字符');
                        return false;
                    }
                    break;

                case 'password':
                    if (!value) {
                        this.showFieldError(name, '请输入密码');
                        return false;
                    } else if (value.length < 6) {
                        this.showFieldError(name, '密码至少需要6个字符');
                        return false;
                    }
                    break;
            }

            this.clearFieldError(name);
            return true;
        }

        showFieldError(fieldName, message) {
            const errorElement = CJUtils.$(`#${fieldName}Error`);
            const inputElement = CJUtils.$(`#${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = message;
            }
            
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }

        clearFieldError(fieldName) {
            const errorElement = CJUtils.$(`#${fieldName}Error`);
            const inputElement = CJUtils.$(`#${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = '';
            }
            
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }

        showLoginError(message) {
            CJComponents.toast.error(message);
        }

        setLoading(loading) {
            this.isLoading = loading;
            const loginButton = CJUtils.$('#loginButton');
            
            if (loginButton) {
                if (loading) {
                    loginButton.classList.add('loading');
                    loginButton.disabled = true;
                } else {
                    loginButton.classList.remove('loading');
                    loginButton.disabled = false;
                }
            }
        }

        checkAutoLogin() {
            const token = CJUtils.storage.get('auth_token');
            const rememberLogin = CJUtils.storage.get('remember_login', 'local');
            
            if (token && rememberLogin) {
                // Verify token is still valid
                this.verifyToken(token);
            }
        }

        async verifyToken(token) {
            try {
                const response = await CJApi.get('/api/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.success) {
                    // Token is valid, redirect to dashboard
                    window.location.href = '/dashboard';
                } else {
                    // Token is invalid, clear storage
                    CJUtils.storage.remove('auth_token');
                    CJUtils.storage.remove('user');
                    CJUtils.storage.remove('remember_login', 'local');
                }
            } catch (error) {
                console.debug('Token verification failed:', error);
                // Clear invalid token
                CJUtils.storage.remove('auth_token');
                CJUtils.storage.remove('user');
            }
        }

        // ==========================================================================
        // Registration Page
        // ==========================================================================

        initRegister() {
            this.registerForm = CJUtils.$('#registerForm');
            if (!this.registerForm) return;

            this.bindRegisterEvents();
        }

        bindRegisterEvents() {
            CJUtils.on(this.registerForm, 'submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });

            // Real-time validation for registration
            const inputs = this.registerForm.querySelectorAll('input');
            inputs.forEach(input => {
                CJUtils.on(input, 'blur', () => {
                    this.validateRegisterField(input);
                });

                CJUtils.on(input, 'input', () => {
                    this.clearFieldError(input.name);
                });
            });
        }

        async handleRegister() {
            if (this.isLoading) return;

            const formData = new FormData(this.registerForm);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword'),
                fullName: formData.get('fullName'),
                phone: formData.get('phone')
            };

            // Validate form
            if (!this.validateRegisterForm(userData)) {
                return;
            }

            this.setLoading(true);

            try {
                const response = await CJApi.post('/api/register', userData);
                
                if (response.success) {
                    CJComponents.toast.success('注册成功，请联系管理员激活账户');
                    
                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    CJComponents.toast.error(response.message || '注册失败');
                }
            } catch (error) {
                console.error('Registration error:', error);
                CJComponents.toast.error(error.message || '注册失败，请稍后重试');
            } finally {
                this.setLoading(false);
            }
        }

        validateRegisterForm(userData) {
            let isValid = true;

            // Validate username
            if (!userData.username || userData.username.length < 3) {
                this.showFieldError('username', '用户名至少需要3个字符');
                isValid = false;
            }

            // Validate email
            if (!userData.email || !this.isValidEmail(userData.email)) {
                this.showFieldError('email', '请输入有效的邮箱地址');
                isValid = false;
            }

            // Validate password
            if (!userData.password || userData.password.length < 6) {
                this.showFieldError('password', '密码至少需要6个字符');
                isValid = false;
            }

            // Validate password confirmation
            if (userData.password !== userData.confirmPassword) {
                this.showFieldError('confirmPassword', '两次输入的密码不一致');
                isValid = false;
            }

            // Validate full name
            if (!userData.fullName || userData.fullName.trim().length < 2) {
                this.showFieldError('fullName', '请输入真实姓名');
                isValid = false;
            }

            return isValid;
        }

        validateRegisterField(input) {
            const value = input.value.trim();
            const name = input.name;

            switch (name) {
                case 'username':
                    if (!value) {
                        this.showFieldError(name, '请输入用户名');
                        return false;
                    } else if (value.length < 3) {
                        this.showFieldError(name, '用户名至少需要3个字符');
                        return false;
                    }
                    break;

                case 'email':
                    if (!value) {
                        this.showFieldError(name, '请输入邮箱地址');
                        return false;
                    } else if (!this.isValidEmail(value)) {
                        this.showFieldError(name, '请输入有效的邮箱地址');
                        return false;
                    }
                    break;

                case 'password':
                    if (!value) {
                        this.showFieldError(name, '请输入密码');
                        return false;
                    } else if (value.length < 6) {
                        this.showFieldError(name, '密码至少需要6个字符');
                        return false;
                    }
                    break;

                case 'confirmPassword':
                    const password = CJUtils.$('#password').value;
                    if (!value) {
                        this.showFieldError(name, '请确认密码');
                        return false;
                    } else if (value !== password) {
                        this.showFieldError(name, '两次输入的密码不一致');
                        return false;
                    }
                    break;

                case 'fullName':
                    if (!value) {
                        this.showFieldError(name, '请输入真实姓名');
                        return false;
                    } else if (value.length < 2) {
                        this.showFieldError(name, '姓名至少需要2个字符');
                        return false;
                    }
                    break;
            }

            this.clearFieldError(name);
            return true;
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        // ==========================================================================
        // Logout
        // ==========================================================================

        async logout() {
            try {
                const token = CJUtils.storage.get('auth_token');
                if (token) {
                    await CJApi.post('/api/logout', {}, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            } catch (error) {
                console.debug('Logout API call failed:', error);
            } finally {
                // Clear local storage regardless of API call result
                CJUtils.storage.remove('auth_token');
                CJUtils.storage.remove('user');
                CJUtils.storage.remove('remember_login', 'local');
                
                // Redirect to login page
                window.location.href = '/login';
            }
        }

        // ==========================================================================
        // Password Reset
        // ==========================================================================

        async requestPasswordReset(email) {
            try {
                const response = await CJApi.post('/api/forgot-password', { email });
                
                if (response.success) {
                    CJComponents.toast.success('密码重置邮件已发送，请检查您的邮箱');
                    return true;
                } else {
                    CJComponents.toast.error(response.message || '发送失败');
                    return false;
                }
            } catch (error) {
                console.error('Password reset error:', error);
                CJComponents.toast.error('发送失败，请稍后重试');
                return false;
            }
        }

        async resetPassword(token, newPassword) {
            try {
                const response = await CJApi.post('/api/reset-password', {
                    token,
                    password: newPassword
                });
                
                if (response.success) {
                    CJComponents.toast.success('密码重置成功，请使用新密码登录');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                    return true;
                } else {
                    CJComponents.toast.error(response.message || '重置失败');
                    return false;
                }
            } catch (error) {
                console.error('Password reset error:', error);
                CJComponents.toast.error('重置失败，请稍后重试');
                return false;
            }
        }
    }

    return AuthManager;
})();
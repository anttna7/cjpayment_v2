/**
 * 简化的登录处理脚本
 * 直接替换复杂的AuthManager，确保登录功能正常工作
 */

(function() {
    'use strict';

    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        console.log('简化登录脚本已加载');

        // 绑定表单提交事件
        loginForm.addEventListener('submit', handleLogin);
    });

    async function handleLogin(event) {
        event.preventDefault();

        console.log('开始处理登录...');

        const form = event.target;
        const formData = new FormData(form);

        const username = formData.get('username');
        const password = formData.get('password');

        console.log('登录信息:', { username, password: '***' });

        // 基本验证
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }

        // 设置加载状态
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = '登录中...';

        try {
            // 发送登录请求
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: username,
                    password: password
                })
            });

            console.log('请求响应状态:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            const result = await response.json();
            console.log('登录响应:', result);

            // 检查登录是否成功
            if (result.success || result.status === 'success') {
                // 存储登录信息
                if (result.token) {
                    localStorage.setItem('auth_token', result.token);
                }
                if (result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                }

                showSuccess('登录成功，正在跳转...');

                // 延迟跳转，让用户看到成功消息
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);

            } else {
                showError(result.message || '登录失败');
            }

        } catch (error) {
            console.error('登录错误:', error);
            showError('登录失败: ' + error.message);
        } finally {
            // 恢复按钮状态
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    function showError(message) {
        console.error('登录错误:', message);

        // 尝试找到错误显示元素
        let errorElement = document.getElementById('loginError');

        if (!errorElement) {
            // 如果没有错误元素，创建一个
            errorElement = document.createElement('div');
            errorElement.id = 'loginError';
            errorElement.style.cssText = `
                background: #fee;
                border: 1px solid #fcc;
                color: #c33;
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                font-size: 14px;
            `;

            const form = document.getElementById('loginForm');
            if (form) {
                form.insertBefore(errorElement, form.firstChild);
            }
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function showSuccess(message) {
        console.log('登录成功:', message);

        // 尝试找到成功显示元素
        let successElement = document.getElementById('loginSuccess');

        if (!successElement) {
            // 如果没有成功元素，创建一个
            successElement = document.createElement('div');
            successElement.id = 'loginSuccess';
            successElement.style.cssText = `
                background: #efe;
                border: 1px solid #cfc;
                color: #383;
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                font-size: 14px;
            `;

            const form = document.getElementById('loginForm');
            if (form) {
                form.insertBefore(successElement, form.firstChild);
            }
        }

        successElement.textContent = message;
        successElement.style.display = 'block';
    }

    // 全局暴露，以便调试
    window.SimpleLogin = {
        handleLogin: handleLogin,
        showError: showError,
        showSuccess: showSuccess
    };

})();
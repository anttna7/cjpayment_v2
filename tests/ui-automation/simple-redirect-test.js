/**
 * 简化版认证重定向测试
 */

const { chromium } = require('playwright');

async function testDashboardRedirect() {
    console.log('BOSS，开始简化版认证重定向测试...');
    
    let browser = null;
    let page = null;
    
    try {
        browser = await chromium.launch({
            headless: false,
            slowMo: 1000
        });
        
        page = await browser.newPage();
        
        // 监听重定向
        const redirects = [];
        page.on('response', response => {
            if (response.status() >= 300 && response.status() < 400) {
                redirects.push({
                    url: response.url(),
                    status: response.status(),
                    location: response.headers()['location']
                });
                console.log(`🔄 重定向: ${response.url()} -> ${response.status()}`);
            }
        });
        
        console.log('📍 测试1: 访问dashboard页面');
        const response = await page.goto('http://127.0.0.1:8091/dashboard', {
            waitUntil: 'networkidle'
        });
        
        const finalUrl = await page.url();
        console.log(`🎯 最终URL: ${finalUrl}`);
        console.log(`📊 状态码: ${response.status()}`);
        console.log(`🔄 是否重定向: ${finalUrl !== 'http://127.0.0.1:8091/dashboard'}`);
        
        // 检查认证状态
        console.log('🔍 检查JavaScript认证状态...');
        const authInfo = await page.evaluate(() => {
            return {
                hasCJPaymentApp: typeof window.CJPaymentApp !== 'undefined',
                hasRouter: typeof window.router !== 'undefined',
                localStorage: {
                    authToken: localStorage.getItem('auth_token'),
                    userInfo: localStorage.getItem('user_info')
                },
                isAuthenticated: typeof window.CJPaymentApp !== 'undefined' ? 
                    (typeof window.CJPaymentApp.isAuthenticated === 'function' ? 
                     window.CJPaymentApp.isAuthenticated() : 'method not found') : 
                    'CJPaymentApp not found'
            };
        });
        
        console.log('🔐 认证状态:', JSON.stringify(authInfo, null, 2));
        
        // 如果在登录页面，尝试登录
        if (finalUrl.includes('/login')) {
            console.log('🔑 尝试登录...');
            
            const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
            const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
            const loginButton = page.locator('button[type="submit"], button:has-text("登录")').first();
            
            if (await usernameInput.count() > 0) {
                await usernameInput.fill('admin');
                await passwordInput.fill('admin123');
                await loginButton.click();
                
                await page.waitForTimeout(3000);
                const afterLoginUrl = await page.url();
                console.log(`✅ 登录后URL: ${afterLoginUrl}`);
                
                if (!afterLoginUrl.includes('/login')) {
                    console.log('🎉 登录成功，重新访问dashboard...');
                    await page.goto('http://127.0.0.1:8091/dashboard');
                    const dashboardUrl = await page.url();
                    console.log(`📍 登录后访问dashboard结果: ${dashboardUrl}`);
                    
                    if (dashboardUrl.includes('/dashboard')) {
                        console.log('🔍 查找财务审核按钮...');
                        const financialAuditBtn = page.locator('a:has-text("财务审核"), button:has-text("财务审核")').first();
                        
                        if (await financialAuditBtn.count() > 0) {
                            console.log('✅ 找到财务审核按钮');
                            const href = await financialAuditBtn.getAttribute('href');
                            console.log(`🔗 按钮href: ${href}`);
                            
                            const beforeClickUrl = dashboardUrl;
                            await financialAuditBtn.click();
                            await page.waitForTimeout(2000);
                            const afterClickUrl = await page.url();
                            
                            console.log(`👆 点击结果:`);
                            console.log(`   点击前: ${beforeClickUrl}`);
                            console.log(`   点击后: ${afterClickUrl}`);
                            console.log(`   重定向到登录: ${afterClickUrl.includes('/login')}`);
                            
                        } else {
                            console.log('❌ 未找到财务审核按钮');
                            // 列出可见的按钮
                            const buttons = await page.locator('a, button').all();
                            console.log(`📊 页面共有 ${buttons.length} 个按钮/链接`);
                            
                            for (let i = 0; i < Math.min(buttons.length, 10); i++) {
                                try {
                                    const text = await buttons[i].textContent();
                                    const href = await buttons[i].getAttribute('href');
                                    if (text && text.trim()) {
                                        console.log(`  - "${text.trim()}" (href: ${href})`);
                                    }
                                } catch (e) {
                                    // 忽略错误
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log('\n=== 测试总结 ===');
        console.log(`初始请求: http://127.0.0.1:8091/dashboard`);
        console.log(`最终URL: ${finalUrl}`);
        console.log(`重定向次数: ${redirects.length}`);
        console.log(`认证状态: ${JSON.stringify(authInfo.isAuthenticated)}`);
        
        if (redirects.length > 0) {
            console.log('重定向详情:');
            redirects.forEach((redirect, index) => {
                console.log(`  ${index + 1}. ${redirect.url} -> ${redirect.status} -> ${redirect.location}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 执行测试
testDashboardRedirect().catch(console.error);
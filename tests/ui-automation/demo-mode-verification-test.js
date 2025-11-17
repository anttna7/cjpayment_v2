/**
 * 专门验证演示模式设置的详细测试
 * 检查localStorage、页面初始化和认证状态
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function verifyDemoModeSetup() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    const testResults = {
        timestamp: new Date().toISOString(),
        testName: '演示模式设置验证',
        success: true,
        details: {}
    };
    
    try {
        // 步骤1: 访问页面前检查localStorage
        console.log('步骤1: 访问页面前检查localStorage...');
        await page.goto('http://127.0.0.1:8091/audit');
        
        // 检查页面加载后的localStorage
        const beforeAuth = await page.evaluate(() => {
            return {
                token: localStorage.getItem('token'),
                userInfo: localStorage.getItem('userInfo'),
                authTime: localStorage.getItem('authTime'),
                allKeys: Object.keys(localStorage),
                allData: JSON.stringify(localStorage)
            };
        });
        
        console.log('页面加载后localStorage状态:');
        console.log('- token:', beforeAuth.token);
        console.log('- userInfo:', beforeAuth.userInfo);
        console.log('- authTime:', beforeAuth.authTime);
        console.log('- 所有键:', beforeAuth.allKeys);
        
        testResults.details.initialLocalStorage = beforeAuth;
        
        // 步骤2: 等待页面完全加载并检查认证状态
        await page.waitForTimeout(3000);
        
        // 检查页面是否有认证相关的元素
        const authElements = await page.evaluate(() => {
            const userInfo = document.querySelector('.user-info, [class*="user"], [data-user]');
            const loginForm = document.querySelector('form[action*="login"], .login-form');
            const authMessage = document.querySelector('.auth-message, .demo-mode');
            
            return {
                hasUserInfo: !!userInfo,
                userInfoText: userInfo ? userInfo.textContent : null,
                hasLoginForm: !!loginForm,
                hasAuthMessage: !!authMessage,
                authMessageText: authMessage ? authMessage.textContent : null,
                pageTitle: document.title,
                currentUrl: window.location.href
            };
        });
        
        console.log('页面认证状态检查:');
        console.log('- 有用户信息:', authElements.hasUserInfo);
        console.log('- 用户信息文本:', authElements.userInfoText);
        console.log('- 有登录表单:', authElements.hasLoginForm);
        console.log('- 有认证消息:', authElements.hasAuthMessage);
        console.log('- 页面标题:', authElements.pageTitle);
        
        testResults.details.authElements = authElements;
        
        // 步骤3: 手动设置演示模式并验证
        console.log('步骤3: 手动设置演示模式并验证...');
        
        const demoSetupResult = await page.evaluate(() => {
            try {
                // 设置演示模式的localStorage数据
                const demoToken = 'demo_token_' + Date.now();
                const demoUser = {
                    id: 'demo_user_001',
                    name: '演示用户',
                    role: '管理员',
                    email: 'demo@cjpayment.com',
                    isDemo: true
                };
                
                localStorage.setItem('token', demoToken);
                localStorage.setItem('userInfo', JSON.stringify(demoUser));
                localStorage.setItem('authTime', Date.now().toString());
                localStorage.setItem('demo_mode', 'true');
                
                console.log('演示模式设置完成');
                
                return {
                    success: true,
                    token: localStorage.getItem('token'),
                    userInfo: localStorage.getItem('userInfo'),
                    demoMode: localStorage.getItem('demo_mode'),
                    message: '演示模式设置成功'
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('演示模式设置结果:', demoSetupResult);
        testResults.details.demoSetup = demoSetupResult;
        
        // 步骤4: 刷新页面验证演示模式生效
        console.log('步骤4: 刷新页面验证演示模式...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        // 再次检查localStorage
        const afterRefresh = await page.evaluate(() => {
            return {
                token: localStorage.getItem('token'),
                userInfo: localStorage.getItem('userInfo'),
                demoMode: localStorage.getItem('demo_mode'),
                authTime: localStorage.getItem('authTime'),
                currentUrl: window.location.href,
                hasRedirected: window.location.href.includes('/login')
            };
        });
        
        console.log('刷新后状态:');
        console.log('- token 保持:', !!afterRefresh.token);
        console.log('- 演示模式:', afterRefresh.demoMode);
        console.log('- 当前URL:', afterRefresh.currentUrl);
        console.log('- 是否重定向到登录:', afterRefresh.hasRedirected);
        
        testResults.details.afterRefresh = afterRefresh;
        
        // 步骤5: 检查网络请求中的认证信息
        console.log('步骤5: 检查认证头信息...');
        
        // 监听下一个请求
        let nextRequest = null;
        page.on('request', request => {
            if (!nextRequest && request.url().includes('/api/')) {
                nextRequest = {
                    url: request.url(),
                    headers: request.headers(),
                    method: request.method()
                };
            }
        });
        
        // 尝试触发一个API请求（如果页面有的话）
        try {
            await page.click('button', { timeout: 5000 });
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('没有找到可点击的按钮，跳过API请求测试');
        }
        
        testResults.details.apiRequest = nextRequest;
        
        // 截图记录
        const screenshotPath = path.join(__dirname, 'demo-mode-verification.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // 最终验证
        const finalCheck = await page.evaluate(() => {
            const isOnAuditPage = window.location.href.includes('/audit');
            const hasContent = document.body.textContent.length > 100;
            const hasToken = !!localStorage.getItem('token');
            const isDemoMode = localStorage.getItem('demo_mode') === 'true';
            
            return {
                isOnAuditPage,
                hasContent,
                hasToken,
                isDemoMode,
                success: isOnAuditPage && hasContent && hasToken
            };
        });
        
        testResults.details.finalCheck = finalCheck;
        testResults.success = finalCheck.success;
        
        console.log('\n=== 演示模式验证结果 ===');
        console.log('整体成功:', testResults.success);
        console.log('在审核页面:', finalCheck.isOnAuditPage);
        console.log('有页面内容:', finalCheck.hasContent);
        console.log('有认证Token:', finalCheck.hasToken);
        console.log('演示模式开启:', finalCheck.isDemoMode);
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        testResults.success = false;
        testResults.error = error.message;
    } finally {
        await browser.close();
        
        // 保存测试报告
        const reportPath = path.join(__dirname, 'demo-mode-verification-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        console.log(`\n详细测试报告已保存至: ${reportPath}`);
    }
    
    return testResults;
}

// 运行测试
if (require.main === module) {
    verifyDemoModeSetup().catch(console.error);
}

module.exports = { verifyDemoModeSetup };
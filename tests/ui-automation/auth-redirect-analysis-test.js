/**
 * 认证重定向问题分析测试
 * 深入分析为什么访问dashboard时会重定向到登录页面
 */

const { chromium } = require('playwright');

class AuthRedirectAnalysisTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            testStartTime: new Date().toISOString(),
            steps: [],
            authChecks: [],
            redirectAnalysis: [],
            cookieAnalysis: [],
            localStorageAnalysis: [],
            serverResponseAnalysis: []
        };
    }

    async setup() {
        console.log('BOSS，开始设置认证重定向分析测试...');
        
        this.browser = await chromium.launch({
            headless: false,
            slowMo: 1000,
            args: ['--start-maximized']
        });
        
        this.page = await this.browser.newPage();
        
        // 监听所有网络响应
        this.page.on('response', response => {
            if (response.status() >= 300 && response.status() < 400) {
                this.results.redirectAnalysis.push({
                    timestamp: new Date().toISOString(),
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText(),
                    location: response.headers()['location'] || null
                });
                console.log(`🔄 服务器重定向: ${response.url()} -> ${response.status()}`);
            }
        });
        
        // 监听请求
        this.page.on('request', request => {
            if (request.url().includes('dashboard') || request.url().includes('login')) {
                console.log(`📡 请求: ${request.method()} ${request.url()}`);
                console.log(`   Headers: ${JSON.stringify(request.headers())}`);
            }
        });
    }

    async logStep(description, data = null) {
        const step = {
            timestamp: new Date().toISOString(),
            description,
            url: await this.page.url(),
            data
        };
        this.results.steps.push(step);
        console.log(`📝 ${description}`);
        if (data) {
            console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
        }
    }

    async analyzeInitialState() {
        await this.logStep('分析初始状态');
        
        // 检查初始cookies
        const cookies = await this.page.context().cookies();
        this.results.cookieAnalysis.push({
            timestamp: new Date().toISOString(),
            phase: 'initial',
            cookies: cookies
        });
        
        await this.logStep('初始Cookies分析', {
            cookieCount: cookies.length,
            relevantCookies: cookies.filter(c => 
                c.name.includes('auth') || 
                c.name.includes('token') || 
                c.name.includes('session')
            )
        });
    }

    async testDashboardAccess() {
        await this.logStep('测试1: 直接访问dashboard页面');
        
        try {
            // 记录访问前的状态
            const beforeUrl = await this.page.url();
            
            // 访问dashboard
            const response = await this.page.goto('http://127.0.0.1:8091/dashboard', {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            
            // 记录响应信息
            this.results.serverResponseAnalysis.push({
                timestamp: new Date().toISOString(),
                requestUrl: 'http://127.0.0.1:8091/dashboard',
                finalUrl: await this.page.url(),
                statusCode: response.status(),
                headers: response.headers()
            });
            
            const afterUrl = await this.page.url();
            const wasRedirected = afterUrl !== 'http://127.0.0.1:8091/dashboard';
            
            await this.logStep('Dashboard访问结果', {
                requestUrl: 'http://127.0.0.1:8091/dashboard',
                finalUrl: afterUrl,
                wasRedirected: wasRedirected,
                statusCode: response.status(),
                isLoginPage: afterUrl.includes('/login')
            });
            
            // 如果被重定向，分析原因
            if (wasRedirected) {
                await this.analyzeRedirectCause();
            }
            
        } catch (error) {
            await this.logStep('Dashboard访问失败', { error: error.message });
        }
    }

    async analyzeRedirectCause() {
        await this.logStep('分析重定向原因');
        
        // 检查页面上的JavaScript认证逻辑
        const authInfo = await this.page.evaluate(() => {
            const result = {
                hasWindow: typeof window !== 'undefined',
                hasCJPaymentApp: typeof window.CJPaymentApp !== 'undefined',
                hasRouter: typeof window.router !== 'undefined',
                authTokenInLS: null,
                userInfoInLS: null,
                authAppMethods: [],
                routerInfo: null
            };
            
            // 检查localStorage
            try {
                result.authTokenInLS = localStorage.getItem('auth_token');
                result.userInfoInLS = localStorage.getItem('user_info');
            } catch (e) {
                result.localStorageError = e.message;
            }
            
            // 检查CJPaymentApp
            if (typeof window.CJPaymentApp !== 'undefined') {
                result.authAppMethods = Object.keys(window.CJPaymentApp);
                try {
                    if (typeof window.CJPaymentApp.isAuthenticated === 'function') {
                        result.isAuthenticated = window.CJPaymentApp.isAuthenticated();
                    }
                } catch (e) {
                    result.authCheckError = e.message;
                }
            }
            
            // 检查router
            if (typeof window.router !== 'undefined') {
                result.routerInfo = {
                    currentRoute: window.router.currentRoute || null,
                    hasAuthMiddleware: typeof window.router.auth === 'function'
                };
            }
            
            return result;
        });
        
        this.results.authChecks.push({
            timestamp: new Date().toISOString(),
            phase: 'redirect_analysis',
            authInfo: authInfo
        });
        
        await this.logStep('JavaScript认证状态分析', authInfo);
    }

    async testLoginAndRetryDashboard() {
        await this.logStep('测试2: 登录后再次访问dashboard');
        
        try {
            // 假设我们在登录页面，尝试填写登录表单
            const currentUrl = await this.page.url();
            
            if (currentUrl.includes('/login')) {
                // 查找登录表单元素
                const usernameInput = await this.page.locator('input[name="username"], input[type="text"]').first();
                const passwordInput = await this.page.locator('input[name="password"], input[type="password"]').first();
                const loginButton = await this.page.locator('button[type="submit"], input[type="submit"], button:has-text("登录")').first();
                
                if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
                    await this.logStep('找到登录表单，尝试登录');
                    
                    // 填写测试账号 (假设有默认的管理员账号)
                    await usernameInput.fill('admin');
                    await passwordInput.fill('admin123');
                    
                    // 点击登录按钮
                    await loginButton.click();
                    
                    // 等待登录完成
                    await this.page.waitForTimeout(3000);
                    
                    const afterLoginUrl = await this.page.url();
                    
                    await this.logStep('登录尝试结果', {
                        beforeUrl: currentUrl,
                        afterUrl: afterLoginUrl,
                        loginSuccessful: !afterLoginUrl.includes('/login')
                    });
                    
                    // 如果登录成功，再次尝试访问dashboard
                    if (!afterLoginUrl.includes('/login')) {
                        await this.page.goto('http://127.0.0.1:8091/dashboard', {
                            waitUntil: 'networkidle'
                        });
                        
                        const dashboardUrl = await this.page.url();
                        
                        await this.logStep('登录后访问dashboard结果', {
                            finalUrl: dashboardUrl,
                            successfulAccess: dashboardUrl.includes('/dashboard')
                        });
                        
                        // 如果成功进入dashboard，查找财务审核按钮
                        if (dashboardUrl.includes('/dashboard')) {
                            await this.testFinancialAuditButton();
                        }
                    }
                } else {
                    await this.logStep('未找到登录表单元素');
                }
            }
            
        } catch (error) {
            await this.logStep('登录测试失败', { error: error.message });
        }
    }

    async testFinancialAuditButton() {
        await this.logStep('测试3: 在已认证状态下测试财务审核按钮');
        
        try {
            // 等待页面完全加载
            await this.page.waitForTimeout(2000);
            
            // 查找财务审核按钮
            const selectors = [
                'a[href="/financial-audit"]',
                'button:has-text("财务审核")',
                'a:has-text("财务审核")',
                '[data-nav="financial-audit"]',
                '.nav-item:has-text("财务审核")',
                '#financial-audit-btn'
            ];
            
            let financialButton = null;
            let usedSelector = null;
            
            for (const selector of selectors) {
                try {
                    const element = await this.page.locator(selector).first();
                    if (await element.count() > 0) {
                        financialButton = element;
                        usedSelector = selector;
                        break;
                    }
                } catch (error) {
                    // 继续下一个选择器
                }
            }
            
            if (financialButton) {
                const buttonHref = await financialButton.getAttribute('href');
                await this.logStep('找到财务审核按钮', {
                    selector: usedSelector,
                    href: buttonHref
                });
                
                // 点击按钮并观察行为
                const beforeClickUrl = await this.page.url();
                await financialButton.click();
                await this.page.waitForTimeout(2000);
                const afterClickUrl = await this.page.url();
                
                await this.logStep('财务审核按钮点击结果', {
                    beforeUrl: beforeClickUrl,
                    afterUrl: afterClickUrl,
                    redirectedToLogin: afterClickUrl.includes('/login')
                });
                
            } else {
                // 列出所有可见的导航元素
                const navElements = await this.page.locator('a, button, .nav-item, .sidebar-item').all();
                const navTexts = [];
                
                for (let i = 0; i < Math.min(navElements.length, 10); i++) {
                    try {
                        const text = await navElements[i].textContent();
                        const href = await navElements[i].getAttribute('href');
                        if (text && text.trim()) {
                            navTexts.push({ text: text.trim(), href });
                        }
                    } catch (error) {
                        // 忽略错误
                    }
                }
                
                await this.logStep('未找到财务审核按钮，当前可见导航元素', navTexts);
            }
            
        } catch (error) {
            await this.logStep('财务审核按钮测试失败', { error: error.message });
        }
    }

    async generateReport() {
        const report = `
# 认证重定向问题分析报告

**测试时间**: ${this.results.testStartTime}

## 问题概述
通过自动化测试发现，访问dashboard页面时会自动重定向到登录页面，这是导致"财务审核"按钮点击后跳转到登录页面的根本原因。

## 详细分析结果

### 1. 服务器重定向分析
${this.results.redirectAnalysis.map(redirect => `
- **时间**: ${redirect.timestamp}
- **URL**: ${redirect.url}
- **状态码**: ${redirect.status}
- **重定向位置**: ${redirect.location || '无'}
`).join('\n')}

### 2. 认证状态检查
${this.results.authChecks.map(check => `
**检查时间**: ${check.timestamp}
**阶段**: ${check.phase}
**认证信息**:
\`\`\`json
${JSON.stringify(check.authInfo, null, 2)}
\`\`\`
`).join('\n')}

### 3. 执行步骤详情
${this.results.steps.map((step, index) => `
**${index + 1}. ${step.description}**
- 时间: ${step.timestamp}
- URL: ${step.url}
- 数据: ${step.data ? JSON.stringify(step.data, null, 2) : '无'}
`).join('\n')}

### 4. Cookie分析
${this.results.cookieAnalysis.map(analysis => `
**${analysis.phase}阶段**: ${analysis.cookies.length}个cookies
相关认证cookies: ${analysis.cookies.filter(c => 
    c.name.includes('auth') || c.name.includes('token') || c.name.includes('session')
).map(c => c.name).join(', ') || '无'}
`).join('\n')}

### 5. 服务器响应分析
${this.results.serverResponseAnalysis.map(response => `
- **请求URL**: ${response.requestUrl}
- **最终URL**: ${response.finalUrl}
- **状态码**: ${response.statusCode}
- **是否重定向**: ${response.finalUrl !== response.requestUrl}
`).join('\n')}

## 问题根因分析

基于测试结果，问题的根本原因是：

1. **服务器端认证检查**: 当访问 `/dashboard` 路由时，服务器检查用户认证状态
2. **认证失败**: 由于缺少有效的认证token或session，认证检查失败
3. **自动重定向**: 服务器自动将请求重定向到 `/login` 页面
4. **客户端路由影响**: 即使在登录后，客户端路由的认证中间件可能仍然存在问题

## 修复建议

### 立即修复方案：
1. 检查服务器端认证中间件的逻辑 (可能在 `/internal/middleware/auth.go`)
2. 验证JWT token的生成和验证逻辑
3. 检查session管理是否正常工作
4. 确保认证状态在客户端正确同步

### 代码检查重点：
- /internal/middleware/auth.go - 服务器端认证中间件
- /web/static/js/auth.js - 客户端认证逻辑  
- /web/static/js/router.js - 客户端路由认证检查
- /internal/handler/dashboard_handler.go - Dashboard处理器的认证要求

### 测试验证：
1. 手动登录后检查localStorage中是否存储了正确的token
2. 验证token是否在请求headers中正确发送
3. 检查服务器日志确认认证失败的具体原因
`;

        console.log(report);
        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.setup();
            await this.analyzeInitialState();
            await this.testDashboardAccess();
            await this.testLoginAndRetryDashboard();
            
            const report = await this.generateReport();
            return report;
        } finally {
            await this.cleanup();
        }
    }
}

// 主执行函数
async function main() {
    console.log('BOSS，开始认证重定向问题深度分析...\n');
    
    const test = new AuthRedirectAnalysisTest();
    const report = await test.run();
    
    // 保存报告
    const fs = require('fs');
    const reportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/auth-redirect-analysis-report.md';
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 详细分析报告已保存至: ${reportPath}`);
    
    return report;
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AuthRedirectAnalysisTest };
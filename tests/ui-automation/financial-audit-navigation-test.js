/**
 * 财务审核按钮导航测试
 * 验证点击财务审核按钮后是否跳转到登录页面的问题
 */

const { chromium } = require('playwright');

class FinancialAuditNavigationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            testStartTime: new Date().toISOString(),
            steps: [],
            errors: [],
            urlChanges: [],
            consoleErrors: [],
            networkRequests: [],
            finalStatus: 'UNKNOWN'
        };
    }

    async setup() {
        console.log('BOSS，开始设置Playwright浏览器环境...');
        
        this.browser = await chromium.launch({
            headless: false, // 显示浏览器以便观察
            slowMo: 1000,    // 每个操作延迟1秒便于观察
            args: ['--start-maximized']
        });
        
        this.page = await this.browser.newPage();
        
        // 监听控制台错误
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.results.consoleErrors.push({
                    timestamp: new Date().toISOString(),
                    message: msg.text(),
                    location: msg.location()
                });
                console.log(`❌ 控制台错误: ${msg.text()}`);
            }
        });
        
        // 监听网络请求
        this.page.on('request', request => {
            this.results.networkRequests.push({
                timestamp: new Date().toISOString(),
                method: request.method(),
                url: request.url(),
                resourceType: request.resourceType()
            });
        });
        
        // 监听页面错误
        this.page.on('pageerror', error => {
            this.results.errors.push({
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack
            });
            console.log(`❌ 页面错误: ${error.message}`);
        });
        
        // 监听URL变化
        this.page.on('framenavigated', frame => {
            if (frame === this.page.mainFrame()) {
                const url = frame.url();
                this.results.urlChanges.push({
                    timestamp: new Date().toISOString(),
                    url: url
                });
                console.log(`🔄 URL变化: ${url}`);
            }
        });
    }

    async logStep(description, details = null) {
        const step = {
            timestamp: new Date().toISOString(),
            description,
            url: await this.page.url(),
            details
        };
        this.results.steps.push(step);
        console.log(`📝 步骤: ${description}`);
        if (details) {
            console.log(`   详情: ${JSON.stringify(details)}`);
        }
    }

    async testFinancialAuditNavigation() {
        try {
            await this.logStep('开始财务审核导航测试');
            
            // 步骤1: 访问dashboard页面
            console.log('🌐 步骤1: 访问 http://127.0.0.1:8091/dashboard');
            await this.page.goto('http://127.0.0.1:8091/dashboard', {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            
            await this.logStep('成功访问dashboard页面', {
                finalUrl: await this.page.url(),
                title: await this.page.title()
            });
            
            // 等待页面完全加载
            await this.page.waitForTimeout(3000);
            
            // 步骤2: 查找财务审核按钮
            console.log('🔍 步骤2: 查找财务审核按钮');
            
            // 尝试多种选择器来找到财务审核按钮
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
                        console.log(`✅ 找到财务审核按钮，使用选择器: ${selector}`);
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️  选择器 ${selector} 未找到元素`);
                }
            }
            
            if (!financialButton) {
                // 如果找不到，尝试查看页面所有导航元素
                const navElements = await this.page.locator('.nav-item, .sidebar-item, a, button').all();
                console.log(`📊 页面共发现 ${navElements.length} 个导航相关元素`);
                
                const navTexts = [];
                for (let i = 0; i < Math.min(navElements.length, 20); i++) {
                    try {
                        const text = await navElements[i].textContent();
                        const href = await navElements[i].getAttribute('href');
                        navTexts.push({ text: text?.trim(), href });
                    } catch (error) {
                        // 忽略错误，继续检查其他元素
                    }
                }
                
                await this.logStep('未找到财务审核按钮，列出前20个导航元素', navTexts);
                throw new Error('未找到财务审核按钮');
            }
            
            // 获取按钮属性
            const buttonHref = await financialButton.getAttribute('href');
            const buttonText = await financialButton.textContent();
            const buttonClass = await financialButton.getAttribute('class');
            
            await this.logStep('找到财务审核按钮', {
                selector: usedSelector,
                href: buttonHref,
                text: buttonText?.trim(),
                class: buttonClass
            });
            
            // 步骤3: 记录点击前的状态
            const beforeClickUrl = await this.page.url();
            console.log(`📍 点击前URL: ${beforeClickUrl}`);
            
            // 检查认证状态
            const authStatus = await this.page.evaluate(() => {
                return {
                    hasAuthApp: typeof window.CJPaymentApp !== 'undefined',
                    isAuthenticated: typeof window.CJPaymentApp !== 'undefined' ? 
                        window.CJPaymentApp.isAuthenticated() : null,
                    hasAuthToken: localStorage.getItem('auth_token') !== null,
                    hasUserInfo: localStorage.getItem('user_info') !== null
                };
            });
            
            await this.logStep('点击前认证状态检查', authStatus);
            
            // 步骤4: 点击财务审核按钮
            console.log('👆 步骤4: 点击财务审核按钮');
            await financialButton.click();
            
            // 等待导航完成
            await this.page.waitForTimeout(2000);
            
            // 步骤5: 检查点击后的状态
            const afterClickUrl = await this.page.url();
            const pageTitle = await this.page.title();
            
            await this.logStep('点击后页面状态', {
                beforeUrl: beforeClickUrl,
                afterUrl: afterClickUrl,
                title: pageTitle,
                redirected: beforeClickUrl !== afterClickUrl
            });
            
            // 步骤6: 分析重定向行为
            const isLoginPage = afterClickUrl.includes('/login') || 
                               pageTitle.toLowerCase().includes('login') ||
                               pageTitle.toLowerCase().includes('登录');
            
            if (isLoginPage) {
                console.log('🚨 确认：页面确实重定向到了登录页面！');
                
                // 检查页面内容确认是登录页面
                const loginElements = await this.page.locator('input[type="password"], input[name="password"], .login-form, #login-form').count();
                const hasLoginForm = loginElements > 0;
                
                await this.logStep('重定向到登录页面确认', {
                    isLoginUrl: afterClickUrl.includes('/login'),
                    isLoginTitle: pageTitle.toLowerCase().includes('login'),
                    hasLoginForm: hasLoginForm,
                    loginElementsCount: loginElements
                });
                
                this.results.finalStatus = 'REDIRECTED_TO_LOGIN';
            } else {
                console.log('✅ 页面没有重定向到登录页面');
                this.results.finalStatus = 'NO_REDIRECT';
            }
            
            // 步骤7: 检查JavaScript执行情况
            const jsInfo = await this.page.evaluate(() => {
                return {
                    routerExists: typeof window.router !== 'undefined',
                    navigationHandlerExists: typeof window.handleNavClick !== 'undefined',
                    authMiddlewareInfo: typeof window.router !== 'undefined' ? 
                        Object.keys(window.router).filter(key => key.includes('auth')) : [],
                    currentRoute: typeof window.router !== 'undefined' ? window.router.currentRoute : null
                };
            });
            
            await this.logStep('JavaScript执行状态检查', jsInfo);
            
        } catch (error) {
            console.error(`❌ 测试执行错误: ${error.message}`);
            this.results.errors.push({
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack
            });
            this.results.finalStatus = 'ERROR';
        }
    }

    async generateReport() {
        this.results.testEndTime = new Date().toISOString();
        this.results.totalSteps = this.results.steps.length;
        this.results.totalErrors = this.results.errors.length;
        this.results.totalConsoleErrors = this.results.consoleErrors.length;
        this.results.totalNetworkRequests = this.results.networkRequests.length;
        
        const report = `
=== 财务审核导航测试报告 ===
测试开始时间: ${this.results.testStartTime}
测试结束时间: ${this.results.testEndTime}
最终状态: ${this.results.finalStatus}

📋 执行步骤 (${this.results.totalSteps}):
${this.results.steps.map((step, index) => 
    `${index + 1}. [${step.timestamp}] ${step.description}\n   URL: ${step.url}\n   详情: ${JSON.stringify(step.details, null, 2)}`
).join('\n\n')}

🔄 URL变化记录 (${this.results.urlChanges.length}):
${this.results.urlChanges.map((change, index) => 
    `${index + 1}. [${change.timestamp}] ${change.url}`
).join('\n')}

❌ 页面错误 (${this.results.totalErrors}):
${this.results.errors.map((error, index) => 
    `${index + 1}. [${error.timestamp}] ${error.message}\n   堆栈: ${error.stack?.substring(0, 200)}...`
).join('\n\n')}

🖥️  控制台错误 (${this.results.totalConsoleErrors}):
${this.results.consoleErrors.map((error, index) => 
    `${index + 1}. [${error.timestamp}] ${error.message}\n   位置: ${JSON.stringify(error.location)}`
).join('\n\n')}

🌐 网络请求统计:
总请求数: ${this.results.totalNetworkRequests}
主要请求类型: ${this.getRequestTypeStats()}

=== 测试结论 ===
${this.getConclusion()}
`;

        console.log(report);
        return report;
    }

    getRequestTypeStats() {
        const stats = {};
        this.results.networkRequests.forEach(req => {
            stats[req.resourceType] = (stats[req.resourceType] || 0) + 1;
        });
        return JSON.stringify(stats, null, 2);
    }

    getConclusion() {
        switch (this.results.finalStatus) {
            case 'REDIRECTED_TO_LOGIN':
                return `
🚨 问题确认：财务审核按钮点击后确实重定向到了登录页面！

可能的原因分析：
1. /web/static/js/router.js 的 auth 中间件检测到用户未认证
2. window.CJPaymentApp.isAuthenticated() 返回了 false
3. /web/static/js/navigation.js 的 handleNavClick 方法触发了客户端路由
4. 认证令牌可能已过期或不存在

建议修复方案：
1. 检查用户认证状态的逻辑
2. 验证认证令牌的有效性
3. 确保已登录用户不会被重定向到登录页面
4. 检查路由中间件的认证逻辑
`;

            case 'NO_REDIRECT':
                return `
✅ 测试结果：财务审核按钮工作正常，没有异常重定向到登录页面。

这可能表明：
1. 用户认证状态正常
2. 路由系统工作正确
3. 之前的问题可能已被修复，或者是特定条件下才出现
`;

            case 'ERROR':
                return `
❌ 测试执行过程中出现错误，无法完成完整的导航测试。

请检查：
1. 服务器是否正在运行在 http://127.0.0.1:8091
2. dashboard页面是否可以正常访问
3. 页面结构是否发生了变化
4. JavaScript是否有语法错误
`;

            default:
                return '🤔 测试结果不明确，需要进一步分析。';
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.setup();
            await this.testFinancialAuditNavigation();
            const report = await this.generateReport();
            return report;
        } finally {
            await this.cleanup();
        }
    }
}

// 主执行函数
async function main() {
    console.log('BOSS，开始执行财务审核导航自动化测试...\n');
    
    const test = new FinancialAuditNavigationTest();
    const report = await test.run();
    
    // 将报告写入文件
    const fs = require('fs');
    const reportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/financial-audit-test-report.md';
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📄 详细报告已保存至: ${reportPath}`);
    
    return report;
}

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { FinancialAuditNavigationTest };
/**
 * 全面验证测试 - 使用MCP Playwright
 * BOSS要求的完整功能验证测试清单
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class ComprehensiveValidator {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:8091';
        this.results = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0
            },
            details: {}
        };
        this.screenshots = [];
    }

    async saveScreenshot(page, name, description = '') {
        const screenshotPath = path.join(__dirname, `validation-${name}.png`);
        await page.screenshot({ 
            path: screenshotPath, 
            fullPage: true 
        });
        this.screenshots.push({
            name,
            path: screenshotPath,
            description,
            timestamp: new Date().toISOString()
        });
        return screenshotPath;
    }

    log(category, test, status, details = {}) {
        console.log(`[${category}] ${test}: ${status}`);
        if (!this.results.details[category]) {
            this.results.details[category] = [];
        }
        this.results.details[category].push({
            test,
            status,
            timestamp: new Date().toISOString(),
            ...details
        });
        this.results.summary.totalTests++;
        if (status === 'PASSED') {
            this.results.summary.passed++;
        } else {
            this.results.summary.failed++;
        }
    }

    async checkResourceLoading(page, url, expectedResources = []) {
        const loadedResources = [];
        const failedResources = [];
        
        page.on('response', response => {
            const resourceUrl = response.url();
            const status = response.status();
            
            if (resourceUrl.includes('.css') || resourceUrl.includes('.js')) {
                const resource = {
                    url: resourceUrl.replace(this.baseUrl, ''),
                    status,
                    contentType: response.headers()['content-type'] || 'unknown'
                };
                
                if (status === 200) {
                    loadedResources.push(resource);
                } else {
                    failedResources.push(resource);
                }
            }
        });

        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(3000); // 等待所有资源加载
            
            return {
                success: true,
                loadedResources,
                failedResources,
                totalLoaded: loadedResources.length,
                totalFailed: failedResources.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                loadedResources,
                failedResources
            };
        }
    }

    async testLoginPage() {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        console.log('\n=== 1. 登录页面测试 ===');
        
        try {
            // 1.1 页面加载测试
            const resourceResult = await this.checkResourceLoading(page, `${this.baseUrl}/login`);
            await this.saveScreenshot(page, '01-login-initial', '登录页面初始加载');

            this.log('LOGIN', '页面加载', resourceResult.success ? 'PASSED' : 'FAILED', {
                loadedResources: resourceResult.loadedResources,
                failedResources: resourceResult.failedResources
            });

            // 1.2 检查登录按钮背景色
            const loginButton = await page.locator('button[type="submit"], .login-btn, .btn-primary').first();
            if (await loginButton.count() > 0) {
                const buttonStyle = await loginButton.evaluate(el => {
                    const computed = window.getComputedStyle(el);
                    return {
                        background: computed.background,
                        backgroundImage: computed.backgroundImage,
                        backgroundColor: computed.backgroundColor
                    };
                });
                
                const hasGradient = buttonStyle.backgroundImage !== 'none' && 
                                  (buttonStyle.backgroundImage.includes('gradient') || 
                                   buttonStyle.background.includes('gradient'));
                
                this.log('LOGIN', '登录按钮样式', hasGradient ? 'PASSED' : 'FAILED', {
                    buttonStyle,
                    hasGradient
                });
            }

            // 1.3 测试登录功能
            await page.fill('input[name="username"], #username', 'admin');
            await page.fill('input[name="password"], #password', 'admin123');
            await this.saveScreenshot(page, '02-login-filled', '登录表单填写完成');

            await loginButton.click();
            await page.waitForTimeout(3000);

            // 检查是否跳转到dashboard
            const currentUrl = page.url();
            const loginSuccess = currentUrl.includes('/dashboard') || !currentUrl.includes('/login');
            
            this.log('LOGIN', '登录功能', loginSuccess ? 'PASSED' : 'FAILED', {
                currentUrl,
                expectedRedirect: '/dashboard'
            });

            await this.saveScreenshot(page, '03-login-result', '登录后页面状态');

        } catch (error) {
            this.log('LOGIN', 'Overall Test', 'FAILED', { error: error.message });
        }

        await browser.close();
    }

    async testDashboardPage() {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        console.log('\n=== 2. Dashboard页面测试 ===');
        
        try {
            // 先登录
            await page.goto(`${this.baseUrl}/login`);
            await page.fill('input[name="username"], #username', 'admin');
            await page.fill('input[name="password"], #password', 'admin123');
            await page.click('button[type="submit"], .login-btn, .btn-primary');
            await page.waitForTimeout(2000);

            // 访问Dashboard
            const resourceResult = await this.checkResourceLoading(page, `${this.baseUrl}/dashboard`);
            await this.saveScreenshot(page, '04-dashboard-initial', 'Dashboard页面初始状态');

            this.log('DASHBOARD', '页面加载', resourceResult.success ? 'PASSED' : 'FAILED', {
                loadedResources: resourceResult.loadedResources,
                failedResources: resourceResult.failedResources
            });

            // 检查关键CSS/JS文件
            const expectedFiles = [
                'dashboard-enhanced.css',
                'dashboard-enhanced.js',
                'toast-enhanced.js'
            ];

            for (const file of expectedFiles) {
                const found = resourceResult.loadedResources.some(resource => 
                    resource.url.includes(file));
                this.log('DASHBOARD', `${file}文件加载`, found ? 'PASSED' : 'FAILED');
            }

            // 检查页面元素
            const statsCards = await page.locator('.stats-card, .stat-card, [class*="stat"]').count();
            this.log('DASHBOARD', '统计卡片显示', statsCards > 0 ? 'PASSED' : 'FAILED', {
                cardCount: statsCards
            });

            // 测试财务审核按钮
            const auditButton = await page.locator('text=财务审核, [href*="audit"], .audit-btn').first();
            if (await auditButton.count() > 0) {
                await auditButton.click();
                await page.waitForTimeout(2000);
                
                const currentUrl = page.url();
                const noRedirectToLogin = !currentUrl.includes('/login');
                
                this.log('DASHBOARD', '财务审核按钮', noRedirectToLogin ? 'PASSED' : 'FAILED', {
                    currentUrl,
                    redirectedToLogin: currentUrl.includes('/login')
                });
            }

            await this.saveScreenshot(page, '05-dashboard-final', 'Dashboard测试完成状态');

        } catch (error) {
            this.log('DASHBOARD', 'Overall Test', 'FAILED', { error: error.message });
        }

        await browser.close();
    }

    async testMerchantPage() {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        console.log('\n=== 3. 商户管理页面测试 ===');
        
        try {
            // 先登录
            await page.goto(`${this.baseUrl}/login`);
            await page.fill('input[name="username"], #username', 'admin');
            await page.fill('input[name="password"], #password', 'admin123');
            await page.click('button[type="submit"], .login-btn, .btn-primary');
            await page.waitForTimeout(2000);

            // 访问商户管理页面
            const resourceResult = await this.checkResourceLoading(page, `${this.baseUrl}/merchant`);
            await this.saveScreenshot(page, '06-merchant-initial', '商户管理页面初始状态');

            this.log('MERCHANT', '页面加载', resourceResult.success ? 'PASSED' : 'FAILED', {
                loadedResources: resourceResult.loadedResources,
                failedResources: resourceResult.failedResources
            });

            // 检查关键JS文件
            const expectedFiles = [
                'merchant-link-api.js',
                'merchant-link-manager.js',
                'enhanced-table.js'
            ];

            for (const file of expectedFiles) {
                const found = resourceResult.loadedResources.some(resource => 
                    resource.url.includes(file));
                this.log('MERCHANT', `${file}文件加载`, found ? 'PASSED' : 'FAILED');
            }

            // 检查商户数据表格
            const tableRows = await page.locator('tbody tr, .table-row').count();
            this.log('MERCHANT', '商户数据显示', tableRows > 0 ? 'PASSED' : 'FAILED', {
                rowCount: tableRows
            });

            // 测试添加商户按钮
            const addButton = await page.locator('text=添加商户, .add-btn, [class*="add"]').first();
            if (await addButton.count() > 0) {
                await addButton.click();
                await page.waitForTimeout(2000);
                
                const modal = await page.locator('.modal, .dialog, [class*="modal"]').count();
                this.log('MERCHANT', '添加商户模态框', modal > 0 ? 'PASSED' : 'FAILED', {
                    modalCount: modal
                });
            }

            // 检查JavaScript错误
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });

            await page.waitForTimeout(2000);
            this.log('MERCHANT', 'JavaScript错误检查', errors.length === 0 ? 'PASSED' : 'FAILED', {
                errors
            });

            await this.saveScreenshot(page, '07-merchant-final', '商户管理测试完成状态');

        } catch (error) {
            this.log('MERCHANT', 'Overall Test', 'FAILED', { error: error.message });
        }

        await browser.close();
    }

    async testSystemManagementPage() {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        console.log('\n=== 4. 系统管理页面测试 ===');
        
        try {
            // 先登录
            await page.goto(`${this.baseUrl}/login`);
            await page.fill('input[name="username"], #username', 'admin');
            await page.fill('input[name="password"], #password', 'admin123');
            await page.click('button[type="submit"], .login-btn, .btn-primary');
            await page.waitForTimeout(2000);

            // 访问系统管理页面
            const resourceResult = await this.checkResourceLoading(page, `${this.baseUrl}/system_management`);
            await this.saveScreenshot(page, '08-system-initial', '系统管理页面初始状态');

            this.log('SYSTEM', '页面加载', resourceResult.success ? 'PASSED' : 'FAILED', {
                loadedResources: resourceResult.loadedResources,
                failedResources: resourceResult.failedResources
            });

            // 检查CSS文件
            const cssLoaded = resourceResult.loadedResources.some(resource => 
                resource.url.includes('system_management.css'));
            this.log('SYSTEM', 'CSS文件加载', cssLoaded ? 'PASSED' : 'FAILED');

            // 检查管理卡片
            const managementCards = await page.locator('.card, .management-card, [class*="card"]').count();
            this.log('SYSTEM', '管理卡片显示', managementCards > 0 ? 'PASSED' : 'FAILED', {
                cardCount: managementCards
            });

            await this.saveScreenshot(page, '09-system-final', '系统管理测试完成状态');

        } catch (error) {
            this.log('SYSTEM', 'Overall Test', 'FAILED', { error: error.message });
        }

        await browser.close();
    }

    async testFinancialAuditPage() {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        console.log('\n=== 5. 财务审核页面测试 ===');
        
        try {
            // 先登录
            await page.goto(`${this.baseUrl}/login`);
            await page.fill('input[name="username"], #username', 'admin');
            await page.fill('input[name="password"], #password', 'admin123');
            await page.click('button[type="submit"], .login-btn, .btn-primary');
            await page.waitForTimeout(2000);

            // 访问财务审核页面
            const resourceResult = await this.checkResourceLoading(page, `${this.baseUrl}/audit`);
            await this.saveScreenshot(page, '10-audit-initial', '财务审核页面初始状态');

            this.log('AUDIT', '页面加载', resourceResult.success ? 'PASSED' : 'FAILED', {
                loadedResources: resourceResult.loadedResources,
                failedResources: resourceResult.failedResources
            });

            // 检查CSS文件
            const cssLoaded = resourceResult.loadedResources.some(resource => 
                resource.url.includes('financial-audit-enhanced.css'));
            this.log('AUDIT', 'CSS文件加载', cssLoaded ? 'PASSED' : 'FAILED');

            // 检查审核数据表格
            const auditData = await page.locator('table, .audit-table, [class*="table"]').count();
            this.log('AUDIT', '审核数据显示', auditData > 0 ? 'PASSED' : 'FAILED', {
                tableCount: auditData
            });

            await this.saveScreenshot(page, '11-audit-final', '财务审核测试完成状态');

        } catch (error) {
            this.log('AUDIT', 'Overall Test', 'FAILED', { error: error.message });
        }

        await browser.close();
    }

    async generateReport() {
        console.log('\n=== 生成测试报告 ===');
        
        const reportContent = `
# 全面验证测试报告

## 测试概要
- **测试时间**: ${this.results.timestamp}
- **总测试数**: ${this.results.summary.totalTests}
- **通过数**: ${this.results.summary.passed}
- **失败数**: ${this.results.summary.failed}
- **通过率**: ${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(2)}%

## 测试结果详情

${Object.keys(this.results.details).map(category => `
### ${category}测试
${this.results.details[category].map(test => `
- **${test.test}**: ${test.status}
  - 时间: ${test.timestamp}
  ${test.error ? `- 错误: ${test.error}` : ''}
  ${test.loadedResources ? `- 加载的资源数: ${test.loadedResources.length}` : ''}
  ${test.failedResources ? `- 失败的资源数: ${test.failedResources.length}` : ''}
`).join('')}
`).join('')}

## 截图记录
${this.screenshots.map(screenshot => `
- **${screenshot.name}**: ${screenshot.description}
  - 路径: ${screenshot.path}
  - 时间: ${screenshot.timestamp}
`).join('')}

## 问题汇总
${this.results.details && Object.keys(this.results.details).map(category => {
    const failedTests = this.results.details[category].filter(test => test.status === 'FAILED');
    return failedTests.length > 0 ? `
### ${category}问题
${failedTests.map(test => `
- **${test.test}**: ${test.error || '功能异常'}
`).join('')}` : '';
}).join('')}

## 建议修复
1. 检查所有404错误的CSS/JS文件路径
2. 确认MIME类型配置正确
3. 验证所有页面的登录状态检查
4. 确保JavaScript控制台无错误
5. 测试所有关键功能按钮的响应

---
*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
        `;

        const reportPath = path.join(__dirname, 'comprehensive-validation-report.md');
        fs.writeFileSync(reportPath, reportContent);
        
        const jsonPath = path.join(__dirname, 'comprehensive-validation-report.json');
        fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

        console.log(`\n测试报告已生成:`);
        console.log(`- Markdown报告: ${reportPath}`);
        console.log(`- JSON报告: ${jsonPath}`);
        
        return reportPath;
    }

    async runAllTests() {
        console.log('开始运行全面验证测试...');
        console.log(`基础URL: ${this.baseUrl}`);
        
        try {
            await this.testLoginPage();
            await this.testDashboardPage();
            await this.testMerchantPage();
            await this.testSystemManagementPage();
            await this.testFinancialAuditPage();
            
            const reportPath = await this.generateReport();
            
            console.log(`\n=== 测试完成 ===`);
            console.log(`总测试数: ${this.results.summary.totalTests}`);
            console.log(`通过: ${this.results.summary.passed}`);
            console.log(`失败: ${this.results.summary.failed}`);
            console.log(`成功率: ${((this.results.summary.passed / this.results.summary.totalTests) * 100).toFixed(2)}%`);
            
            return reportPath;
            
        } catch (error) {
            console.error('测试运行出错:', error);
            throw error;
        }
    }
}

// 运行测试
if (require.main === module) {
    const validator = new ComprehensiveValidator();
    validator.runAllTests().then(reportPath => {
        console.log(`\n详细报告请查看: ${reportPath}`);
        process.exit(0);
    }).catch(error => {
        console.error('测试失败:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveValidator;
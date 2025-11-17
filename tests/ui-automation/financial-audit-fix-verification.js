/**
 * 财务审核页面修复后的全面验证测试
 * 重点验证：
 * 1. 页面不再重定向到登录页面
 * 2. 演示模式认证正常工作
 * 3. 页面内容正常显示
 * 4. 控制台日志确认演示模式生效
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFinancialAuditFixVerification() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // 收集控制台日志
    const consoleLogs = [];
    page.on('console', msg => {
        const logEntry = {
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        };
        consoleLogs.push(logEntry);
        console.log(`[${logEntry.type.toUpperCase()}] ${logEntry.text}`);
    });
    
    // 收集网络请求
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            timestamp: new Date().toISOString()
        });
    });
    
    // 收集网络响应
    const networkResponses = [];
    page.on('response', response => {
        networkResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
        });
    });
    
    const testResults = {
        timestamp: new Date().toISOString(),
        testName: '财务审核页面修复验证',
        success: true,
        errors: [],
        steps: [],
        consoleLogs: [],
        networkActivity: {
            requests: [],
            responses: []
        },
        screenshots: []
    };
    
    try {
        // 步骤1: 直接访问财务审核页面
        console.log('步骤1: 访问财务审核页面...');
        const startTime = Date.now();
        
        await page.goto('http://127.0.0.1:8091/audit', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        const loadTime = Date.now() - startTime;
        console.log(`页面加载完成，用时: ${loadTime}ms`);
        
        // 等待页面稳定
        await page.waitForTimeout(3000);
        
        // 检查当前URL
        const currentUrl = page.url();
        console.log(`当前URL: ${currentUrl}`);
        
        testResults.steps.push({
            step: 1,
            description: '访问财务审核页面',
            success: true,
            details: {
                targetUrl: 'http://127.0.0.1:8091/audit',
                finalUrl: currentUrl,
                loadTime: `${loadTime}ms`,
                redirected: currentUrl !== 'http://127.0.0.1:8091/audit'
            }
        });
        
        // 截图1: 初始状态
        const screenshot1Path = path.join(__dirname, 'audit-fix-01-initial-load.png');
        await page.screenshot({ path: screenshot1Path, fullPage: true });
        testResults.screenshots.push('audit-fix-01-initial-load.png');
        console.log('截图1: 初始加载状态已保存');
        
        // 步骤2: 检查是否重定向到登录页面
        console.log('步骤2: 检查页面重定向状态...');
        
        const isOnLoginPage = currentUrl.includes('/login') || 
                             await page.locator('form[action*="login"]').count() > 0 ||
                             await page.locator('input[type="password"]').count() > 0;
        
        const isOnAuditPage = currentUrl.includes('/audit') || 
                             await page.locator('text=财务审核').count() > 0 ||
                             await page.locator('text=审核').count() > 0;
        
        console.log(`是否在登录页面: ${isOnLoginPage}`);
        console.log(`是否在审核页面: ${isOnAuditPage}`);
        
        testResults.steps.push({
            step: 2,
            description: '检查页面重定向状态',
            success: !isOnLoginPage,
            details: {
                isOnLoginPage,
                isOnAuditPage,
                currentUrl,
                redirectToLoginFixed: !isOnLoginPage
            }
        });
        
        if (isOnLoginPage) {
            testResults.errors.push('页面仍然重定向到登录页面，修复未生效');
            testResults.success = false;
        }
        
        // 步骤3: 检查页面内容
        console.log('步骤3: 检查页面内容...');
        
        await page.waitForTimeout(2000);
        
        // 检查页面标题
        const pageTitle = await page.title();
        console.log(`页面标题: ${pageTitle}`);
        
        // 检查页面主要元素
        const mainContent = await page.locator('body').textContent();
        const hasContent = mainContent && mainContent.length > 100;
        
        // 检查是否有错误信息
        const errorElements = await page.locator('.error, .alert-danger, [class*="error"]').count();
        
        testResults.steps.push({
            step: 3,
            description: '检查页面内容',
            success: hasContent && errorElements === 0,
            details: {
                pageTitle,
                contentLength: mainContent ? mainContent.length : 0,
                hasMainContent: hasContent,
                errorElementsCount: errorElements
            }
        });
        
        // 截图2: 页面内容状态
        const screenshot2Path = path.join(__dirname, 'audit-fix-02-page-content.png');
        await page.screenshot({ path: screenshot2Path, fullPage: true });
        testResults.screenshots.push('audit-fix-02-page-content.png');
        console.log('截图2: 页面内容状态已保存');
        
        // 步骤4: 检查控制台日志中的演示模式信息
        console.log('步骤4: 分析控制台日志...');
        
        // 等待更多日志输出
        await page.waitForTimeout(2000);
        
        const demoModeLogsFound = consoleLogs.filter(log => 
            log.text.includes('演示模式') || 
            log.text.includes('demo mode') ||
            log.text.includes('Demo Mode') ||
            log.text.includes('localStorage') ||
            log.text.includes('token')
        );
        
        const authLogsFound = consoleLogs.filter(log =>
            log.text.includes('auth') ||
            log.text.includes('认证') ||
            log.text.includes('401') ||
            log.text.includes('unauthorized')
        );
        
        console.log(`找到演示模式相关日志: ${demoModeLogsFound.length} 条`);
        console.log(`找到认证相关日志: ${authLogsFound.length} 条`);
        
        testResults.steps.push({
            step: 4,
            description: '检查控制台日志',
            success: demoModeLogsFound.length > 0,
            details: {
                totalLogs: consoleLogs.length,
                demoModeLogsCount: demoModeLogsFound.length,
                authLogsCount: authLogsFound.length,
                demoModeLogs: demoModeLogsFound.map(log => log.text),
                authLogs: authLogsFound.map(log => log.text)
            }
        });
        
        // 步骤5: 检查网络请求
        console.log('步骤5: 分析网络请求...');
        
        const loginRequests = networkRequests.filter(req => 
            req.url.includes('/login') || req.url.includes('/auth')
        );
        
        const apiRequests = networkRequests.filter(req => 
            req.url.includes('/api/')
        );
        
        const unauthorizedResponses = networkResponses.filter(resp => 
            resp.status === 401
        );
        
        console.log(`登录相关请求: ${loginRequests.length} 个`);
        console.log(`API请求: ${apiRequests.length} 个`);
        console.log(`401未授权响应: ${unauthorizedResponses.length} 个`);
        
        testResults.steps.push({
            step: 5,
            description: '分析网络请求',
            success: unauthorizedResponses.length === 0,
            details: {
                totalRequests: networkRequests.length,
                totalResponses: networkResponses.length,
                loginRequestsCount: loginRequests.length,
                apiRequestsCount: apiRequests.length,
                unauthorizedCount: unauthorizedResponses.length,
                unauthorizedUrls: unauthorizedResponses.map(resp => resp.url)
            }
        });
        
        // 步骤6: 尝试页面交互
        console.log('步骤6: 测试页面交互功能...');
        
        try {
            // 等待页面完全加载
            await page.waitForTimeout(3000);
            
            // 尝试查找可交互的元素
            const buttons = await page.locator('button').count();
            const links = await page.locator('a').count();
            const inputs = await page.locator('input').count();
            
            console.log(`找到按钮: ${buttons} 个`);
            console.log(`找到链接: ${links} 个`);
            console.log(`找到输入框: ${inputs} 个`);
            
            // 如果有可见的按钮，尝试悬停
            if (buttons > 0) {
                const firstButton = page.locator('button').first();
                if (await firstButton.isVisible()) {
                    await firstButton.hover();
                    await page.waitForTimeout(1000);
                }
            }
            
            testResults.steps.push({
                step: 6,
                description: '测试页面交互功能',
                success: true,
                details: {
                    buttonsCount: buttons,
                    linksCount: links,
                    inputsCount: inputs,
                    interactionPossible: buttons > 0 || links > 0
                }
            });
            
        } catch (error) {
            console.log('页面交互测试出错:', error.message);
            testResults.steps.push({
                step: 6,
                description: '测试页面交互功能',
                success: false,
                details: {
                    error: error.message
                }
            });
        }
        
        // 截图3: 最终状态
        const screenshot3Path = path.join(__dirname, 'audit-fix-03-final-state.png');
        await page.screenshot({ path: screenshot3Path, fullPage: true });
        testResults.screenshots.push('audit-fix-03-final-state.png');
        console.log('截图3: 最终状态已保存');
        
        // 收集最终结果
        testResults.consoleLogs = consoleLogs;
        testResults.networkActivity.requests = networkRequests;
        testResults.networkActivity.responses = networkResponses;
        
        // 判断整体测试结果
        const failedSteps = testResults.steps.filter(step => !step.success);
        testResults.success = failedSteps.length === 0 && testResults.errors.length === 0;
        
        console.log('\n=== 测试结果汇总 ===');
        console.log(`整体成功: ${testResults.success}`);
        console.log(`失败步骤: ${failedSteps.length} 个`);
        console.log(`错误数量: ${testResults.errors.length} 个`);
        
        if (!testResults.success) {
            console.log('失败的步骤:');
            failedSteps.forEach(step => {
                console.log(`- 步骤${step.step}: ${step.description}`);
            });
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        testResults.success = false;
        testResults.errors.push({
            type: 'critical_error',
            message: error.message,
            stack: error.stack
        });
    } finally {
        await browser.close();
        
        // 保存测试报告
        const reportPath = path.join(__dirname, 'financial-audit-fix-verification-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        console.log(`\n详细测试报告已保存至: ${reportPath}`);
        
        // 生成Markdown报告
        await generateMarkdownReport(testResults);
    }
    
    return testResults;
}

async function generateMarkdownReport(testResults) {
    const reportContent = `# 财务审核页面修复验证报告

## 测试概览

- **测试时间**: ${testResults.timestamp}
- **整体结果**: ${testResults.success ? '✅ 成功' : '❌ 失败'}
- **测试步骤**: ${testResults.steps.length} 个
- **失败步骤**: ${testResults.steps.filter(s => !s.success).length} 个
- **错误数量**: ${testResults.errors.length} 个

## 修复验证要点

### 1. 页面访问测试
${testResults.steps.find(s => s.step === 1) ? 
  (testResults.steps.find(s => s.step === 1).success ? '✅' : '❌') : '⏸'} 直接访问 http://127.0.0.1:8091/audit 页面

### 2. 重定向检查
${testResults.steps.find(s => s.step === 2) ? 
  (testResults.steps.find(s => s.step === 2).success ? '✅' : '❌') : '⏸'} 确认页面不重定向到登录页面

### 3. 页面内容验证
${testResults.steps.find(s => s.step === 3) ? 
  (testResults.steps.find(s => s.step === 3).success ? '✅' : '❌') : '⏸'} 页面内容正常显示

### 4. 演示模式日志
${testResults.steps.find(s => s.step === 4) ? 
  (testResults.steps.find(s => s.step === 4).success ? '✅' : '❌') : '⏸'} 控制台显示演示模式相关日志

### 5. 网络请求分析
${testResults.steps.find(s => s.step === 5) ? 
  (testResults.steps.find(s => s.step === 5).success ? '✅' : '❌') : '⏸'} 无401认证错误

### 6. 页面交互功能
${testResults.steps.find(s => s.step === 6) ? 
  (testResults.steps.find(s => s.step === 6).success ? '✅' : '❌') : '⏸'} 页面交互功能正常

## 详细测试结果

${testResults.steps.map(step => `
### 步骤${step.step}: ${step.description}

**结果**: ${step.success ? '✅ 成功' : '❌ 失败'}

**详细信息**:
\`\`\`json
${JSON.stringify(step.details, null, 2)}
\`\`\`
`).join('\n')}

## 控制台日志分析

**总日志数量**: ${testResults.consoleLogs.length}

**演示模式相关日志**:
${testResults.steps.find(s => s.step === 4)?.details?.demoModeLogs?.map(log => `- ${log}`).join('\n') || '无'}

**认证相关日志**:
${testResults.steps.find(s => s.step === 4)?.details?.authLogs?.map(log => `- ${log}`).join('\n') || '无'}

## 网络活动分析

**请求总数**: ${testResults.networkActivity.requests.length}
**响应总数**: ${testResults.networkActivity.responses.length}
**401错误数**: ${testResults.steps.find(s => s.step === 5)?.details?.unauthorizedCount || 0}

## 截图记录

${testResults.screenshots.map(screenshot => `- ![${screenshot}](./${screenshot})`).join('\n')}

## 修复效果评估

${testResults.success ? `
### ✅ 修复成功

财务审核页面修复已成功生效：

1. **认证跳过**: 页面不再重定向到登录页面
2. **演示模式**: localStorage认证信息正常设置
3. **功能正常**: 页面内容正常显示，交互功能可用
4. **无401错误**: API请求不再出现认证错误

修复的核心问题：
- api.js中的401认证错误跳过处理 ✅
- router.js中的auth中间件跳过认证检查 ✅  
- 演示环境设置localStorage认证信息 ✅
` : `
### ❌ 修复未完全生效

存在以下问题需要进一步处理：

${testResults.errors.map(error => `- ${error.message || error}`).join('\n')}

失败的步骤：
${testResults.steps.filter(s => !s.success).map(step => `- 步骤${step.step}: ${step.description}`).join('\n')}
`}

---
*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
`;

    const markdownPath = path.join(__dirname, 'FINANCIAL_AUDIT_FIX_VERIFICATION_REPORT.md');
    fs.writeFileSync(markdownPath, reportContent);
    console.log(`Markdown报告已保存至: ${markdownPath}`);
}

// 运行测试
if (require.main === module) {
    runFinancialAuditFixVerification().catch(console.error);
}

module.exports = { runFinancialAuditFixVerification };
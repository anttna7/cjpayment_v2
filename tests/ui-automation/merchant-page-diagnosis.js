const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Merchant页面问题诊断工具
 * 全面检查merchant页面的加载状态、JavaScript错误、样式问题等
 */
async function diagnoseMerchantPage() {
    const browser = await chromium.launch({ 
        headless: false, // 显示浏览器窗口便于观察
        slowMo: 1000    // 延缓操作便于观察
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // 收集所有错误和日志
    const errors = [];
    const consoleMessages = [];
    const networkFailures = [];
    
    // 监听控制台消息
    page.on('console', msg => {
        const logEntry = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: new Date().toISOString()
        };
        consoleMessages.push(logEntry);
        
        if (msg.type() === 'error') {
            console.log(`🚨 控制台错误: ${msg.text()}`);
        }
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
        const errorEntry = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        errors.push(errorEntry);
        console.log(`❌ JavaScript错误: ${error.message}`);
    });
    
    // 监听网络失败
    page.on('response', response => {
        if (!response.ok()) {
            const networkError = {
                url: response.url(),
                status: response.status(),
                statusText: response.statusText(),
                timestamp: new Date().toISOString()
            };
            networkFailures.push(networkError);
            console.log(`🌐 网络错误: ${response.url()} - ${response.status()}`);
        }
    });
    
    console.log('🔍 开始诊断merchant页面...');
    
    try {
        // 1. 访问merchant页面
        console.log('📍 步骤1: 访问merchant页面');
        const startTime = Date.now();
        
        await page.goto('http://127.0.0.1:8091/merchant', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        const loadTime = Date.now() - startTime;
        console.log(`⏱️ 页面加载耗时: ${loadTime}ms`);
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 2. 检查页面基本信息
        console.log('📍 步骤2: 检查页面基本信息');
        const pageTitle = await page.title();
        const currentUrl = page.url();
        
        console.log(`📄 页面标题: ${pageTitle}`);
        console.log(`🔗 当前URL: ${currentUrl}`);
        
        // 3. 检查是否有重定向
        if (currentUrl !== 'http://127.0.0.1:8091/merchant') {
            console.log(`🔄 检测到重定向: ${currentUrl}`);
        }
        
        // 4. 截图记录当前状态
        console.log('📍 步骤3: 截图记录页面状态');
        await page.screenshot({ 
            path: 'merchant-diagnosis-initial.png',
            fullPage: true 
        });
        
        // 5. 检查页面内容
        console.log('📍 步骤4: 检查页面内容');
        
        // 检查页面是否为空白
        const bodyText = await page.textContent('body');
        const isBlank = !bodyText || bodyText.trim().length < 50;
        
        if (isBlank) {
            console.log('⚠️ 页面内容为空或几乎为空');
        }
        
        // 检查关键元素
        const keyElements = {
            loginForm: await page.locator('form, [class*="login"], [class*="form"]').count(),
            merchantTitle: await page.locator('h1, h2, h3').filter({ hasText: /商户|merchant|登录|login/i }).count(),
            inputFields: await page.locator('input').count(),
            buttons: await page.locator('button').count(),
            navigation: await page.locator('nav, [class*="nav"], [class*="menu"]').count()
        };
        
        console.log('🔍 关键元素统计:');
        Object.entries(keyElements).forEach(([key, count]) => {
            console.log(`  ${key}: ${count}个`);
        });
        
        // 6. 检查CSS样式加载
        console.log('📍 步骤5: 检查CSS样式加载');
        const stylesheets = await page.evaluate(() => {
            return Array.from(document.styleSheets).map(sheet => {
                try {
                    return {
                        href: sheet.href,
                        rules: sheet.cssRules ? sheet.cssRules.length : 0,
                        disabled: sheet.disabled
                    };
                } catch (e) {
                    return {
                        href: sheet.href,
                        error: e.message
                    };
                }
            });
        });
        
        console.log('🎨 样式表信息:');
        stylesheets.forEach((sheet, index) => {
            console.log(`  样式表${index + 1}: ${sheet.href || '内联样式'}`);
            if (sheet.error) {
                console.log(`    ❌ 错误: ${sheet.error}`);
            } else {
                console.log(`    ✅ 规则数: ${sheet.rules}, 禁用: ${sheet.disabled}`);
            }
        });
        
        // 7. 检查JavaScript运行状态
        console.log('📍 步骤6: 检查JavaScript运行状态');
        const jsInfo = await page.evaluate(() => {
            return {
                windowLoaded: document.readyState,
                scriptsCount: document.querySelectorAll('script').length,
                hasJQuery: typeof window.jQuery !== 'undefined',
                hasVue: typeof window.Vue !== 'undefined',
                hasReact: typeof window.React !== 'undefined',
                userAgent: navigator.userAgent
            };
        });
        
        console.log('🔧 JavaScript环境:');
        Object.entries(jsInfo).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
        
        // 8. 尝试交互测试
        console.log('📍 步骤7: 测试页面交互');
        
        // 查找可点击元素
        const clickableElements = await page.locator('button, input[type="submit"], a, [onclick]').count();
        console.log(`🖱️ 可点击元素数量: ${clickableElements}`);
        
        // 如果有输入框，尝试输入测试
        const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"]');
        const inputCount = await inputs.count();
        
        if (inputCount > 0) {
            console.log(`📝 发现${inputCount}个输入框，测试输入功能`);
            
            // 测试第一个输入框
            await inputs.first().click();
            await inputs.first().fill('test');
            await page.waitForTimeout(1000);
            
            const inputValue = await inputs.first().inputValue();
            console.log(`✅ 输入测试结果: "${inputValue}"`);
        }
        
        // 9. 最终截图
        await page.screenshot({ 
            path: 'merchant-diagnosis-final.png',
            fullPage: true 
        });
        
        // 10. 生成诊断报告
        const diagnosticReport = {
            timestamp: new Date().toISOString(),
            pageInfo: {
                title: pageTitle,
                url: currentUrl,
                loadTime: loadTime,
                isRedirected: currentUrl !== 'http://127.0.0.1:8091/merchant'
            },
            content: {
                isBlank: isBlank,
                bodyTextLength: bodyText ? bodyText.length : 0,
                keyElements: keyElements
            },
            styles: {
                stylesheetsCount: stylesheets.length,
                stylesheets: stylesheets
            },
            javascript: jsInfo,
            interactions: {
                clickableElements: clickableElements,
                inputFields: inputCount
            },
            errors: {
                javascriptErrors: errors,
                consoleMessages: consoleMessages.filter(msg => msg.type === 'error'),
                networkFailures: networkFailures
            },
            allConsoleMessages: consoleMessages
        };
        
        // 保存详细报告
        fs.writeFileSync('merchant-diagnosis-report.json', JSON.stringify(diagnosticReport, null, 2));
        
        console.log('\n📊 诊断总结:');
        console.log(`✅ 页面加载: ${loadTime}ms`);
        console.log(`🔗 URL状态: ${currentUrl === 'http://127.0.0.1:8091/merchant' ? '正常' : '重定向'}`);
        console.log(`📄 内容状态: ${isBlank ? '空白页面' : '有内容'}`);
        console.log(`❌ JavaScript错误: ${errors.length}个`);
        console.log(`🚨 控制台错误: ${consoleMessages.filter(msg => msg.type === 'error').length}个`);
        console.log(`🌐 网络错误: ${networkFailures.length}个`);
        
        if (errors.length > 0) {
            console.log('\n🚨 JavaScript错误详情:');
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.message}`);
            });
        }
        
        if (networkFailures.length > 0) {
            console.log('\n🌐 网络错误详情:');
            networkFailures.forEach((failure, index) => {
                console.log(`  ${index + 1}. ${failure.url} - ${failure.status}`);
            });
        }
        
        console.log('\n📁 生成的文件:');
        console.log('  - merchant-diagnosis-initial.png (初始状态截图)');
        console.log('  - merchant-diagnosis-final.png (最终状态截图)');
        console.log('  - merchant-diagnosis-report.json (详细诊断报告)');
        
    } catch (error) {
        console.error('❌ 诊断过程中发生错误:', error.message);
        
        // 错误情况下也要截图
        try {
            await page.screenshot({ 
                path: 'merchant-diagnosis-error.png',
                fullPage: true 
            });
        } catch (screenshotError) {
            console.error('截图失败:', screenshotError.message);
        }
        
        // 保存错误报告
        const errorReport = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack
            },
            errors: errors,
            consoleMessages: consoleMessages,
            networkFailures: networkFailures
        };
        
        fs.writeFileSync('merchant-diagnosis-error-report.json', JSON.stringify(errorReport, null, 2));
    } finally {
        await browser.close();
    }
}

// 执行诊断
diagnoseMerchantPage().catch(console.error);
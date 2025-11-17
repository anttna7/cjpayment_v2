const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugDashboardCSS() {
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 100,
        devtools: true
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    const debugReport = {
        timestamp: new Date().toISOString(),
        url: 'http://127.0.0.1:8091/dashboard',
        cssFiles: [],
        loadErrors: [],
        consoleErrors: [],
        mimeTypeErrors: [],
        networkRequests: [],
        screenshots: []
    };

    // 监听控制台错误
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            debugReport.consoleErrors.push({
                text: msg.text(),
                timestamp: new Date().toISOString()
            });
            console.log('❌ Console Error:', msg.text());
        }
    });

    // 监听网络请求
    page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        const contentType = response.headers()['content-type'] || '';
        
        debugReport.networkRequests.push({
            url,
            status,
            contentType,
            statusText: response.statusText()
        });

        // 检查CSS文件加载
        if (url.includes('.css')) {
            const cssInfo = {
                url,
                status,
                contentType,
                statusText: response.statusText(),
                size: 0
            };

            if (status === 200) {
                try {
                    const content = await response.text();
                    cssInfo.size = content.length;
                    cssInfo.loaded = true;
                    console.log(`✅ CSS Loaded: ${path.basename(url)} (${cssInfo.size} bytes)`);
                } catch (error) {
                    cssInfo.error = error.message;
                    console.log(`❌ CSS Load Error: ${path.basename(url)} - ${error.message}`);
                }
            } else {
                cssInfo.loaded = false;
                debugReport.loadErrors.push(cssInfo);
                console.log(`❌ CSS Failed: ${path.basename(url)} - Status: ${status}`);
            }

            // 检查MIME类型错误
            if (status === 200 && !contentType.includes('text/css')) {
                const mimeError = {
                    url,
                    expectedType: 'text/css',
                    actualType: contentType
                };
                debugReport.mimeTypeErrors.push(mimeError);
                console.log(`⚠️  MIME Type Error: ${path.basename(url)} - Expected: text/css, Got: ${contentType}`);
            }

            debugReport.cssFiles.push(cssInfo);
        }
    });

    console.log('🚀 正在访问Dashboard页面...');
    
    try {
        // 访问Dashboard页面
        await page.goto('http://127.0.0.1:8091/dashboard', { 
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('📸 截图：初始页面加载状态');
        await page.screenshot({ 
            path: 'dashboard-debug-01-initial.png', 
            fullPage: true 
        });
        debugReport.screenshots.push('dashboard-debug-01-initial.png');

        // 等待页面完全加载
        await page.waitForTimeout(2000);

        // 检查页面标题
        const title = await page.title();
        debugReport.pageTitle = title;
        console.log(`📄 页面标题: ${title}`);

        // 检查CSS文件加载状态
        console.log('\n🔍 检查CSS文件加载状态...');
        
        const cssLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            return links.map(link => ({
                href: link.href,
                disabled: link.disabled,
                loaded: !link.sheet || link.sheet.cssRules.length > 0
            }));
        });

        debugReport.cssLinkElements = cssLinks;
        
        cssLinks.forEach(link => {
            const fileName = path.basename(link.href);
            console.log(`  ${link.loaded ? '✅' : '❌'} ${fileName}`);
        });

        // 检查特定的CSS文件
        const targetCSSFiles = [
            'dashboard.css',
            'dashboard-enhanced.css',
            'theme-unified.css',
            'design-tokens.css',
            'base.css',
            'main.css'
        ];

        console.log('\n🎯 检查目标CSS文件...');
        for (const fileName of targetCSSFiles) {
            const found = debugReport.cssFiles.find(css => css.url.includes(fileName));
            if (found) {
                console.log(`  ✅ ${fileName}: Status ${found.status}, Size: ${found.size} bytes`);
            } else {
                console.log(`  ❌ ${fileName}: 未找到`);
            }
        }

        // 检查CSS变量是否正确定义
        console.log('\n🎨 检查CSS变量定义...');
        const cssVariables = await page.evaluate(() => {
            const computedStyle = getComputedStyle(document.documentElement);
            const variables = {};
            
            // 检查一些关键变量
            const keyVars = [
                '--primary-500',
                '--color-bg-primary',
                '--color-text-primary',
                '--space-4',
                '--font-size-base',
                '--header-height'
            ];
            
            keyVars.forEach(varName => {
                const value = computedStyle.getPropertyValue(varName).trim();
                variables[varName] = value || 'undefined';
            });
            
            return variables;
        });

        debugReport.cssVariables = cssVariables;
        Object.entries(cssVariables).forEach(([name, value]) => {
            console.log(`  ${value !== 'undefined' ? '✅' : '❌'} ${name}: ${value}`);
        });

        // 检查页面元素样式
        console.log('\n🏗️  检查Dashboard元素样式...');
        const elementStyles = await page.evaluate(() => {
            const elements = {
                dashboard: document.querySelector('.dashboard'),
                header: document.querySelector('.dashboard__header'),
                title: document.querySelector('.dashboard__title h1'),
                cards: document.querySelectorAll('.card')
            };
            
            const styles = {};
            
            Object.entries(elements).forEach(([name, element]) => {
                if (element) {
                    const computed = getComputedStyle(element);
                    styles[name] = {
                        display: computed.display,
                        visibility: computed.visibility,
                        opacity: computed.opacity,
                        backgroundColor: computed.backgroundColor,
                        color: computed.color,
                        padding: computed.padding,
                        margin: computed.margin,
                        fontSize: computed.fontSize
                    };
                } else {
                    styles[name] = { error: 'Element not found' };
                }
            });
            
            return styles;
        });

        debugReport.elementStyles = elementStyles;
        Object.entries(elementStyles).forEach(([name, styles]) => {
            if (styles.error) {
                console.log(`  ❌ ${name}: ${styles.error}`);
            } else {
                console.log(`  ✅ ${name}: display=${styles.display}, visibility=${styles.visibility}`);
            }
        });

        // 截图：CSS检查后的状态
        console.log('📸 截图：CSS检查后状态');
        await page.screenshot({ 
            path: 'dashboard-debug-02-css-check.png', 
            fullPage: true 
        });
        debugReport.screenshots.push('dashboard-debug-02-css-check.png');

        // 检查开发者工具中的错误
        console.log('\n🛠️  检查开发者工具控制台...');
        const devToolsErrors = await page.evaluate(() => {
            // 尝试获取控制台错误信息
            return window.console.errors || [];
        });

        // 检查Network面板中的失败请求
        console.log('\n🌐 网络请求汇总:');
        const failedRequests = debugReport.networkRequests.filter(req => req.status >= 400);
        
        if (failedRequests.length > 0) {
            console.log('❌ 失败的请求:');
            failedRequests.forEach(req => {
                console.log(`  ${req.status} ${req.statusText}: ${req.url}`);
            });
        } else {
            console.log('✅ 所有网络请求成功');
        }

        // 检查MIME类型错误
        if (debugReport.mimeTypeErrors.length > 0) {
            console.log('\n⚠️  MIME类型错误:');
            debugReport.mimeTypeErrors.forEach(error => {
                console.log(`  ${path.basename(error.url)}: 期望 ${error.expectedType}, 实际 ${error.actualType}`);
            });
        }

        // 模拟切换主题测试CSS
        console.log('\n🎭 测试主题切换...');
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
        });
        
        await page.waitForTimeout(1000);
        
        console.log('📸 截图：深色主题');
        await page.screenshot({ 
            path: 'dashboard-debug-03-dark-theme.png', 
            fullPage: true 
        });
        debugReport.screenshots.push('dashboard-debug-03-dark-theme.png');

        // 切回浅色主题
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'light');
        });

        await page.waitForTimeout(1000);

        // 最终截图
        console.log('📸 截图：最终状态');
        await page.screenshot({ 
            path: 'dashboard-debug-04-final.png', 
            fullPage: true 
        });
        debugReport.screenshots.push('dashboard-debug-04-final.png');

    } catch (error) {
        console.error('❌ 页面访问失败:', error);
        debugReport.pageError = error.message;
        
        // 即使出错也要截图
        try {
            await page.screenshot({ 
                path: 'dashboard-debug-error.png', 
                fullPage: true 
            });
            debugReport.screenshots.push('dashboard-debug-error.png');
        } catch (screenshotError) {
            console.error('截图失败:', screenshotError);
        }
    }

    // 保存调试报告
    fs.writeFileSync('dashboard-css-debug-report.json', JSON.stringify(debugReport, null, 2));
    
    console.log('\n📊 调试报告汇总:');
    console.log(`- CSS文件总数: ${debugReport.cssFiles.length}`);
    console.log(`- 加载失败: ${debugReport.loadErrors.length}`);
    console.log(`- 控制台错误: ${debugReport.consoleErrors.length}`);
    console.log(`- MIME类型错误: ${debugReport.mimeTypeErrors.length}`);
    console.log(`- 截图数量: ${debugReport.screenshots.length}`);
    
    if (debugReport.loadErrors.length > 0) {
        console.log('\n❌ 加载失败的CSS文件:');
        debugReport.loadErrors.forEach(error => {
            console.log(`  - ${path.basename(error.url)}: ${error.status} ${error.statusText}`);
        });
    }
    
    if (debugReport.consoleErrors.length > 0) {
        console.log('\n❌ 控制台错误:');
        debugReport.consoleErrors.forEach(error => {
            console.log(`  - ${error.text}`);
        });
    }

    console.log('\n✅ 调试完成! 报告已保存到: dashboard-css-debug-report.json');

    await browser.close();
    return debugReport;
}

// 运行调试
debugDashboardCSS().catch(console.error);
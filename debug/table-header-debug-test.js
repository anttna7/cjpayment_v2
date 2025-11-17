const { chromium } = require('playwright');

/**
 * 简化调试测试：检查页面结构和表格元素
 */
async function debugPageStructure() {
    console.log('启动页面结构调试测试...\n');
    
    let browser = null;
    let page = null;
    
    try {
        // 启动浏览器
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 500
        });
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        page = await context.newPage();
        console.log('浏览器已启动');
        
        // 导航到收款账户页面
        console.log('正在访问页面...');
        await page.goto('http://127.0.0.1:8091/accounts', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // 等待页面加载
        await page.waitForTimeout(5000);
        
        // 检查页面标题
        const title = await page.title();
        console.log(`页面标题: ${title}`);
        
        // 截图查看页面状态
        await page.screenshot({
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug-page-structure.png',
            fullPage: true
        });
        console.log('调试截图已保存: debug-page-structure.png');
        
        // 检查所有可能的表格选择器
        const possibleSelectors = [
            'table',
            '.table',
            '.account-table',
            '.data-table',
            '#accountTable',
            '.enhanced-table',
            '[id*="table"]',
            '[class*="table"]'
        ];
        
        console.log('\n检查可能的表格选择器:');
        for (let selector of possibleSelectors) {
            try {
                const elements = await page.locator(selector).all();
                if (elements.length > 0) {
                    console.log(`✓ 找到 ${selector}: ${elements.length} 个元素`);
                    
                    // 如果找到表格，检查表头
                    if (selector.includes('table') || selector.includes('Table')) {
                        const headers = await page.locator(`${selector} th`).all();
                        if (headers.length > 0) {
                            console.log(`  - 表头列数: ${headers.length}`);
                            
                            // 获取表头文本
                            const headerTexts = [];
                            for (let header of headers) {
                                const text = await header.textContent();
                                headerTexts.push(text.trim());
                            }
                            console.log(`  - 表头内容: ${headerTexts.join(', ')}`);
                        }
                    }
                } else {
                    console.log(`✗ 未找到 ${selector}`);
                }
            } catch (error) {
                console.log(`✗ 检查 ${selector} 时出错: ${error.message}`);
            }
        }
        
        // 检查tab结构
        console.log('\n检查Tab结构:');
        const tabSelectors = [
            '.tab-item',
            '.nav-tab',
            '.tab',
            '[class*="tab"]',
            '.active',
            '.nav-link'
        ];
        
        for (let selector of tabSelectors) {
            try {
                const elements = await page.locator(selector).all();
                if (elements.length > 0) {
                    console.log(`✓ 找到 ${selector}: ${elements.length} 个元素`);
                    
                    // 获取tab文本
                    const tabTexts = [];
                    for (let tab of elements) {
                        const text = await tab.textContent();
                        tabTexts.push(text.trim());
                    }
                    console.log(`  - Tab内容: ${tabTexts.join(', ')}`);
                }
            } catch (error) {
                console.log(`✗ 检查 ${selector} 时出错: ${error.message}`);
            }
        }
        
        // 获取页面所有元素的类名
        console.log('\n页面主要元素类名:');
        const allElements = await page.locator('*[class]').all();
        const classNames = new Set();
        
        for (let element of allElements.slice(0, 50)) { // 只检查前50个元素
            try {
                const className = await element.getAttribute('class');
                if (className && (className.includes('table') || className.includes('tab') || className.includes('account'))) {
                    classNames.add(className);
                }
            } catch (error) {
                // 忽略错误
            }
        }
        
        Array.from(classNames).forEach(className => {
            console.log(`  - ${className}`);
        });
        
        // 检查页面HTML结构（部分）
        console.log('\n页面body内容预览:');
        const bodyContent = await page.locator('body').innerHTML();
        const preview = bodyContent.substring(0, 1000);
        console.log(preview);
        
    } catch (error) {
        console.error('调试测试失败:', error.message);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

// 运行调试测试
debugPageStructure().catch(console.error);
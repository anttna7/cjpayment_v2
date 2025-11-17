/**
 * 直接测试HTML文件
 */
const { chromium } = require('playwright');

async function testDirectHTML() {
    console.log('🚀 直接测试HTML文件...\n');
    
    let browser, page;
    
    try {
        browser = await chromium.launch({ 
            headless: false, 
            slowMo: 1000,
            viewport: { width: 1440, height: 900 }
        });
        const context = await browser.newContext();
        page = await context.newPage();

        // 监听console和错误
        page.on('console', msg => console.log(`页面Console: ${msg.text()}`));
        page.on('pageerror', error => console.error(`页面错误: ${error.message}`));

        const htmlPath = 'file:///Users/c/Desktop/labs/cjpay/cjpayment/web/templates/accounts_new.html';
        console.log(`📱 访问HTML文件: ${htmlPath}`);
        
        await page.goto(htmlPath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 检查页面元素
        const pageState = await page.evaluate(() => {
            return {
                title: document.title,
                tabsCount: document.querySelectorAll('.tab-nav__item').length,
                activeTab: document.querySelector('.tab-nav__item--active')?.dataset.tab,
                mainContent: !!document.querySelector('.accounts-management'),
                jsLoaded: typeof window.accountsManager !== 'undefined'
            };
        });
        
        console.log('页面状态:', pageState);

        // 测试标签切换
        if (pageState.tabsCount > 0) {
            console.log('\n测试标签切换...');
            await page.locator('[data-tab="receiving-accounts"]').click();
            await page.waitForTimeout(1000);
            
            const afterClick = await page.evaluate(() => {
                const activeTab = document.querySelector('.tab-nav__item--active');
                const activePanel = document.querySelector('.tab-panel--active');
                return {
                    activeTab: activeTab?.dataset.tab,
                    activePanel: activePanel?.dataset.tab
                };
            });
            
            console.log('切换后状态:', afterClick);
        }

        // 截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/direct-html-test.png',
            fullPage: true 
        });
        
        console.log('\n📸 截图: direct-html-test.png');

        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('❌ 测试错误:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testDirectHTML().catch(console.error);
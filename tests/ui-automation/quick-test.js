/**
 * 快速测试修复效果
 */
const { chromium } = require('playwright');

async function quickTest() {
    console.log('⚡ 快速测试修复效果...\n');
    
    let browser, page;
    
    try {
        browser = await chromium.launch({ 
            headless: false, 
            slowMo: 1000
        });
        const context = await browser.newContext();
        page = await context.newPage();

        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 检查页面状态
        const pageState = await page.evaluate(() => {
            const activePanels = document.querySelectorAll('.tab-panel--active');
            return {
                activePanelCount: activePanels.length,
                activePanels: Array.from(activePanels).map(panel => ({
                    id: panel.id,
                    visible: panel.offsetHeight > 0,
                    display: window.getComputedStyle(panel).display
                })),
                allPanels: Array.from(document.querySelectorAll('.tab-panel')).map(panel => ({
                    id: panel.id,
                    hasActiveClass: panel.classList.contains('tab-panel--active'),
                    visible: panel.offsetHeight > 0
                }))
            };
        });
        
        console.log('页面状态检查:', pageState);

        // 使用更精确的选择器测试标签切换
        console.log('\n测试标签切换...');
        
        await page.locator('.tab-nav__item[data-tab="receiving-accounts"]').click();
        await page.waitForTimeout(2000);
        
        const receivingState = await page.evaluate(() => {
            const activePanel = document.querySelector('.tab-panel--active');
            return {
                activePanelId: activePanel?.id,
                visible: activePanel ? activePanel.offsetHeight > 0 : false
            };
        });
        
        console.log('收款账户切换结果:', receivingState);

        await page.locator('.tab-nav__item[data-tab="polling-rules"]').click();
        await page.waitForTimeout(2000);
        
        const pollingState = await page.evaluate(() => {
            const activePanel = document.querySelector('.tab-panel--active');
            return {
                activePanelId: activePanel?.id,
                visible: activePanel ? activePanel.offsetHeight > 0 : false
            };
        });
        
        console.log('轮询规则切换结果:', pollingState);

        // 截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/quick-test-result.png',
            fullPage: true 
        });

        console.log('\n📸 快速测试截图: quick-test-result.png');

        // 判断修复是否成功
        const isFixed = pageState.activePanelCount > 0 && 
                       pageState.activePanels.some(panel => panel.visible);
                       
        if (isFixed) {
            console.log('\n🎉 修复成功！页面内容现在可以正常显示了！');
        } else {
            console.log('\n❌ 修复可能仍有问题');
        }

        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('❌ 测试错误:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

quickTest().catch(console.error);
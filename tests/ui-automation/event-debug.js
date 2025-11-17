/**
 * 检查JavaScript事件绑定问题
 */
const { chromium } = require('playwright');

async function debugEvents() {
  console.log('🔍 调试JavaScript事件绑定...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    page = await context.newPage();

    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ 页面加载完成');

    // 检查accountManager是否正确初始化
    const accountManagerCheck = await page.evaluate(() => {
      return {
        exists: typeof window.accountManager !== 'undefined',
        currentTab: window.accountManager ? window.accountManager.state.currentTab : 'N/A',
        tabsElement: window.accountManager ? Object.keys(window.accountManager.elements.tabs) : []
      };
    });
    
    console.log('AccountManager状态:', accountManagerCheck);

    // 检查标签元素的data-tab属性
    const tabDataCheck = await page.evaluate(() => {
      const paymentTab = document.getElementById('paymentAccountsTab');
      return {
        exists: !!paymentTab,
        dataTab: paymentTab ? paymentTab.dataset.tab : null,
        eventListeners: paymentTab ? 'Cannot check directly' : null
      };
    });
    
    console.log('付款账户标签检查:', tabDataCheck);

    // 模拟点击并跟踪console日志
    console.log('\n2️⃣ 手动触发点击事件...');
    
    // 监听console日志
    page.on('console', msg => console.log('页面Console:', msg.text()));
    
    // 点击标签
    await page.locator('#paymentAccountsTab').click();
    await page.waitForTimeout(2000);
    
    // 检查点击后的状态
    const afterClick = await page.evaluate(() => {
      return {
        currentTab: window.accountManager ? window.accountManager.state.currentTab : 'N/A',
        paymentContentActive: document.getElementById('paymentAccountsContent')?.classList.contains('active'),
        paymentTabActive: document.getElementById('paymentAccountsTab')?.classList.contains('active')
      };
    });
    
    console.log('点击后状态:', afterClick);

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugEvents().catch(console.error);
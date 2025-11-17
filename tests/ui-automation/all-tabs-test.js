/**
 * 测试所有标签切换功能
 */
const { chromium } = require('playwright');

async function testAllTabs() {
  console.log('🔧 测试所有标签切换功能...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: false, slowMo: 800 });
    const context = await browser.newContext();
    page = await context.newPage();

    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('✅ 页面加载完成');

    const tabsToTest = [
      { id: 'paymentAccountsTab', name: '付款账户', expectedContent: 'paymentAccountsContent' },
      { id: 'flowTab', name: '流程图', expectedContent: 'flowContent' },
      { id: 'statsTab', name: '统计分析', expectedContent: 'statsContent' },
      { id: 'rulesTab', name: '轮询规则', expectedContent: 'rulesContent' },
      { id: 'accountsTab', name: '收款账户', expectedContent: 'accountsContent' }
    ];

    for (const tab of tabsToTest) {
      console.log(`\n🔄 测试 ${tab.name} 标签...`);
      
      // 点击标签
      await page.locator(`#${tab.id}`).click();
      await page.waitForTimeout(1500);
      
      // 检查标签和内容状态
      const tabState = await page.evaluate((tabInfo) => {
        const tabElement = document.getElementById(tabInfo.id);
        const contentElement = document.getElementById(tabInfo.expectedContent);
        
        return {
          tabActive: tabElement ? tabElement.classList.contains('active') : false,
          contentActive: contentElement ? contentElement.classList.contains('active') : false,
          contentDisplay: contentElement ? window.getComputedStyle(contentElement).display : 'N/A',
          contentOpacity: contentElement ? window.getComputedStyle(contentElement).opacity : 'N/A'
        };
      }, tab);
      
      const isWorking = tabState.tabActive && 
                       tabState.contentActive && 
                       tabState.contentDisplay === 'block' &&
                       tabState.contentOpacity === '1';
      
      console.log(`  ${isWorking ? '✅' : '❌'} ${tab.name}: ${isWorking ? '正常' : '异常'}`);
      if (!isWorking) {
        console.log(`    状态: tab活跃=${tabState.tabActive}, 内容活跃=${tabState.contentActive}, display=${tabState.contentDisplay}, opacity=${tabState.contentOpacity}`);
      }
    }

    // 最终截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/all-tabs-test.png',
      fullPage: true 
    });
    console.log('\n📸 所有标签测试截图: all-tabs-test.png');

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testAllTabs().catch(console.error);
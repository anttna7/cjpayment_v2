/**
 * 验证JavaScript标签切换修复效果
 */
const { chromium } = require('playwright');

async function verifyFix() {
  console.log('🔧 验证JavaScript标签切换修复效果...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    page = await context.newPage();

    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ 页面加载完成');

    // 等待页面完全初始化
    await page.waitForTimeout(2000);

    // 检查初始化后的状态
    const initialState = await page.evaluate(() => {
      const accountsTab = document.getElementById('accountsTab');
      const accountsContent = document.getElementById('accountsContent');
      return {
        accountsTabActive: accountsTab ? accountsTab.classList.contains('active') : false,
        accountsContentActive: accountsContent ? accountsContent.classList.contains('active') : false,
        currentTab: window.accountManager ? window.accountManager.state.currentTab : 'N/A'
      };
    });
    
    console.log('初始化状态:', initialState);

    // 点击付款账户标签
    console.log('\n2️⃣ 点击付款账户标签...');
    await page.locator('#paymentAccountsTab').click();
    await page.waitForTimeout(2000);
    
    // 检查点击后的最终状态
    const finalState = await page.evaluate(() => {
      const paymentTab = document.getElementById('paymentAccountsTab');
      const paymentContent = document.getElementById('paymentAccountsContent');
      const accountsTab = document.getElementById('accountsTab');
      const accountsContent = document.getElementById('accountsContent');
      
      return {
        paymentTabActive: paymentTab ? paymentTab.classList.contains('active') : false,
        paymentContentActive: paymentContent ? paymentContent.classList.contains('active') : false,
        paymentContentDisplay: paymentContent ? window.getComputedStyle(paymentContent).display : 'N/A',
        paymentContentOpacity: paymentContent ? window.getComputedStyle(paymentContent).opacity : 'N/A',
        accountsTabActive: accountsTab ? accountsTab.classList.contains('active') : false,
        accountsContentActive: accountsContent ? accountsContent.classList.contains('active') : false,
        currentTab: window.accountManager ? window.accountManager.state.currentTab : 'N/A'
      };
    });
    
    console.log('点击后最终状态:', finalState);

    // 验证修复结果
    const isFixed = finalState.paymentTabActive && 
                    finalState.paymentContentActive && 
                    finalState.paymentContentDisplay === 'block' &&
                    finalState.paymentContentOpacity === '1' &&
                    !finalState.accountsTabActive &&
                    !finalState.accountsContentActive;
                    
    console.log(`\n${isFixed ? '✅' : '❌'} 修复结果: ${isFixed ? '成功' : '失败'}`);
    
    if (isFixed) {
      console.log('🎉 付款账户标签切换正常工作！');
    } else {
      console.log('⚠️ 标签切换仍有问题，需要进一步调试');
    }

    // 最终截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/fix-verification.png',
      fullPage: true 
    });
    console.log('📸 验证截图: fix-verification.png');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

verifyFix().catch(console.error);
/**
 * 最终调试 - 检查active类添加问题
 */
const { chromium } = require('playwright');

async function finalDebug() {
  console.log('🔍 最终调试 - 检查active类问题...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    page = await context.newPage();

    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ 页面加载完成');

    // 在点击之前检查初始状态
    console.log('\n1️⃣ 检查初始状态...');
    const initialCheck = await page.evaluate(() => {
      const paymentContent = document.getElementById('paymentAccountsContent');
      const paymentTab = document.getElementById('paymentAccountsTab');
      
      return {
        paymentContent: {
          exists: !!paymentContent,
          classList: paymentContent ? paymentContent.className : 'NOT_FOUND',
          display: paymentContent ? window.getComputedStyle(paymentContent).display : 'NOT_FOUND'
        },
        paymentTab: {
          exists: !!paymentTab,
          classList: paymentTab ? paymentTab.className : 'NOT_FOUND'
        }
      };
    });
    
    console.log('初始状态:', initialCheck);

    // 点击付款账户标签
    console.log('\n2️⃣ 点击付款账户标签...');
    await page.locator('#paymentAccountsTab').click();
    
    // 等待并检查点击后的状态
    await page.waitForTimeout(1000);
    
    const afterClickCheck = await page.evaluate(() => {
      const paymentContent = document.getElementById('paymentAccountsContent');
      const paymentTab = document.getElementById('paymentAccountsTab');
      
      return {
        paymentContent: {
          exists: !!paymentContent,
          classList: paymentContent ? paymentContent.className : 'NOT_FOUND',
          hasActive: paymentContent ? paymentContent.classList.contains('active') : false,
          display: paymentContent ? window.getComputedStyle(paymentContent).display : 'NOT_FOUND'
        },
        paymentTab: {
          exists: !!paymentTab,
          classList: paymentTab ? paymentTab.className : 'NOT_FOUND',
          hasActive: paymentTab ? paymentTab.classList.contains('active') : false
        }
      };
    });
    
    console.log('点击后状态:', afterClickCheck);

    // 手动添加active类测试
    console.log('\n3️⃣ 手动添加active类测试...');
    await page.evaluate(() => {
      const paymentContent = document.getElementById('paymentAccountsContent');
      if (paymentContent) {
        paymentContent.classList.add('active');
        console.log('手动添加了active类');
      }
    });
    
    await page.waitForTimeout(1000);
    
    const manualCheck = await page.evaluate(() => {
      const paymentContent = document.getElementById('paymentAccountsContent');
      return {
        exists: !!paymentContent,
        classList: paymentContent ? paymentContent.className : 'NOT_FOUND',
        hasActive: paymentContent ? paymentContent.classList.contains('active') : false,
        display: paymentContent ? window.getComputedStyle(paymentContent).display : 'NOT_FOUND',
        opacity: paymentContent ? window.getComputedStyle(paymentContent).opacity : 'NOT_FOUND',
        isVisible: paymentContent ? paymentContent.offsetHeight > 0 && paymentContent.offsetWidth > 0 : false
      };
    });
    
    console.log('手动添加active后:', manualCheck);

    // 最终截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/final-debug.png',
      fullPage: true 
    });
    console.log('📸 最终调试截图: final-debug.png');

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

finalDebug().catch(console.error);
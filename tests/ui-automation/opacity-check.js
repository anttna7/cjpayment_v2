/**
 * 检查CSS透明度修复效果
 */
const { chromium } = require('playwright');

async function checkOpacityFix() {
  console.log('🔧 检查CSS透明度修复效果...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    page = await context.newPage();

    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ 页面加载完成');

    // 点击付款账户标签
    await page.locator('#paymentAccountsTab').click();
    await page.waitForTimeout(2000);
    
    // 检查修复后的CSS属性
    const paymentSection = page.locator('#paymentAccountsContent');
    const computedStyles = await paymentSection.evaluate(element => {
      const styles = window.getComputedStyle(element);
      return {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,        // 👈 关键检查
        height: styles.height,
        classList: element.className
      };
    });
    
    console.log('💳 修复后CSS属性:', computedStyles);
    
    // 检查是否真的可见
    const isVisible = await paymentSection.isVisible();
    console.log(`👁️ 用户可见性: ${isVisible}`);
    
    // 截图确认
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/opacity-fixed.png',
      fullPage: true 
    });
    console.log('📸 修复后截图: opacity-fixed.png');

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

checkOpacityFix().catch(console.error);
const { chromium } = require('playwright');

(async () => {
  console.log('🔧 最终测试轮询组模态框...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 访问页面
    await page.goto('http://localhost:8091/accounts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 切换标签页
    await page.click('#pollingRulesTab');
    await page.waitForTimeout(1500);

    // 点击创建轮询组按钮
    console.log('👆 点击创建轮询组按钮...');
    await page.click('#createPollingGroupBtn');
    await page.waitForTimeout(1500);

    // 截图
    await page.screenshot({ path: 'final-modal-test.png', fullPage: true });

    // 检查状态
    const status = await page.evaluate(() => {
      const overlay = document.getElementById('pollingGroupModalOverlay');
      const modal = document.getElementById('pollingGroupModal');
      
      return {
        overlayVisible: overlay && window.getComputedStyle(overlay).display !== 'none',
        modalVisible: modal && window.getComputedStyle(modal).display !== 'none',
        overlayActive: overlay && overlay.classList.contains('active'),
        modalRect: modal ? modal.getBoundingClientRect() : null
      };
    });

    console.log('📊 最终状态:', status);

    if (status.overlayVisible && status.modalVisible) {
      console.log('✅ 模态框修复成功！');
    } else {
      console.log('❌ 模态框仍有问题');
    }

    await page.waitForTimeout(10000); // 10秒供观察

  } catch (error) {
    console.error('❌ 测试错误:', error);
  } finally {
    await browser.close();
  }
})();
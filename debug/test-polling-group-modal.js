const { chromium } = require('playwright');

(async () => {
  console.log('🔍 测试创建轮询组按钮功能...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ JavaScript错误:', msg.text());
      }
    });

    // 监听页面错误
    page.on('pageerror', error => {
      console.log('❌ 页面错误:', error.message);
    });

    // 访问账户管理页面
    console.log('📍 访问账户管理页面...');
    await page.goto('http://localhost:8091/accounts');
    await page.waitForTimeout(2000);

    // 切换到轮询规则标签页
    console.log('🔄 切换到轮询规则标签页...');
    const pollingRulesTab = page.locator('#pollingRulesTab');
    await pollingRulesTab.click();
    await page.waitForTimeout(1000);

    // 检查创建轮询组按钮是否存在
    console.log('🔍 检查创建轮询组按钮...');
    const createBtn = page.locator('#createPollingGroupBtn');
    const btnExists = await createBtn.count() > 0;
    console.log(`  按钮存在: ${btnExists ? '✅' : '❌'}`);

    if (btnExists) {
      // 检查按钮是否可见
      const btnVisible = await createBtn.isVisible();
      console.log(`  按钮可见: ${btnVisible ? '✅' : '❌'}`);

      // 检查模态框是否存在
      const modalOverlay = page.locator('#pollingGroupModalOverlay');
      const modalExists = await modalOverlay.count() > 0;
      console.log(`  模态框存在: ${modalExists ? '✅' : '❌'}`);

      // 截图：点击前的状态
      await page.screenshot({ path: 'polling-modal-before-click.png' });

      // 点击按钮
      console.log('👆 点击创建轮询组按钮...');
      await createBtn.click();
      await page.waitForTimeout(1000);

      // 检查模态框是否显示
      const modalVisible = await modalOverlay.isVisible();
      console.log(`  点击后模态框可见: ${modalVisible ? '✅' : '❌'}`);

      // 检查模态框是否有active类
      const hasActiveClass = await modalOverlay.evaluate(el => el.classList.contains('active'));
      console.log(`  模态框有active类: ${hasActiveClass ? '✅' : '❌'}`);

      // 截图：点击后的状态
      await page.screenshot({ path: 'polling-modal-after-click.png' });

      if (modalVisible) {
        console.log('✅ 模态框成功显示！');
      } else {
        console.log('❌ 模态框未显示，可能存在问题');
        
        // 检查JavaScript是否正确加载
        const jsLoaded = await page.evaluate(() => {
          return typeof window.accountsManager !== 'undefined';
        });
        console.log(`  AccountsManager加载: ${jsLoaded ? '✅' : '❌'}`);

        if (jsLoaded) {
          // 手动调用方法测试
          await page.evaluate(() => {
            if (window.accountsManager && window.accountsManager.openPollingGroupModal) {
              window.accountsManager.openPollingGroupModal();
            }
          });
          await page.waitForTimeout(500);
          
          const modalVisibleAfterManual = await modalOverlay.isVisible();
          console.log(`  手动调用后模态框可见: ${modalVisibleAfterManual ? '✅' : '❌'}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
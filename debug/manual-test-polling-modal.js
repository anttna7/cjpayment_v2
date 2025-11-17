const { chromium } = require('playwright');

(async () => {
  console.log('🔧 手动验证创建轮询组模态框功能...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 访问账户管理页面
    console.log('📍 访问账户管理页面...');
    await page.goto('http://localhost:8091/accounts');
    await page.waitForTimeout(2000);

    // 检查页面是否正常加载
    const title = await page.title();
    console.log(`页面标题: ${title}`);

    // 切换到轮询规则标签页
    console.log('🔄 切换到轮询规则标签页...');
    await page.click('#pollingRulesTab');
    await page.waitForTimeout(2000);

    // 截图：轮询规则页面
    await page.screenshot({ path: 'polling-rules-tab.png', fullPage: true });
    console.log('📸 已截取轮询规则页面截图: polling-rules-tab.png');

    // 查找创建轮询组按钮
    const createBtn = await page.locator('#createPollingGroupBtn');
    const btnCount = await createBtn.count();
    console.log(`创建轮询组按钮数量: ${btnCount}`);

    if (btnCount > 0) {
      // 滚动到按钮位置并高亮
      await createBtn.scrollIntoViewIfNeeded();
      await createBtn.hover();
      
      // 截图：高亮按钮
      await page.screenshot({ path: 'polling-button-highlighted.png' });
      console.log('📸 已截取高亮按钮截图: polling-button-highlighted.png');

      // 点击按钮
      console.log('👆 点击创建轮询组按钮...');
      await createBtn.click();
      await page.waitForTimeout(1500);

      // 截图：点击后状态
      await page.screenshot({ path: 'polling-modal-opened.png', fullPage: true });
      console.log('📸 已截取点击后截图: polling-modal-opened.png');

      // 检查模态框是否显示
      const modal = page.locator('#pollingGroupModalOverlay');
      const isVisible = await modal.isVisible();
      const hasActiveClass = await modal.evaluate(el => el.classList.contains('active'));
      
      console.log(`模态框可见性: ${isVisible ? '✅' : '❌'}`);
      console.log(`模态框active类: ${hasActiveClass ? '✅' : '❌'}`);

      if (isVisible) {
        console.log('✅ 创建轮询组模态框功能正常工作！');
        
        // 测试关闭功能
        console.log('🔄 测试关闭模态框...');
        await page.click('#pollingGroupModalClose');
        await page.waitForTimeout(500);
        
        const isVisibleAfterClose = await modal.isVisible();
        console.log(`关闭后模态框可见性: ${isVisibleAfterClose ? '❌ 仍可见' : '✅ 已隐藏'}`);
      } else {
        console.log('❌ 模态框未正常显示，需要进一步调试');
      }
    } else {
      console.log('❌ 未找到创建轮询组按钮');
    }

    console.log('\n👍 请手动验证页面功能，按任意键继续...');
    await page.waitForTimeout(30000); // 等待30秒供手动验证

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
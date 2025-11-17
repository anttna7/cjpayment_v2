const { chromium } = require('playwright');

(async () => {
  console.log('🔧 测试模态框z-index修复效果...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 访问账户管理页面
    console.log('📍 访问账户管理页面...');
    await page.goto('http://localhost:8091/accounts', { waitUntil: 'networkidle' });
    
    // 等待页面完全加载
    await page.waitForTimeout(3000);

    // 切换到轮询规则标签页
    console.log('🔄 切换到轮询规则标签页...');
    await page.click('#pollingRulesTab');
    await page.waitForTimeout(2000);

    // 截图：点击前状态
    await page.screenshot({ path: 'modal-fix-before.png', fullPage: true });

    // 检查模态框的z-index
    const modalZIndex = await page.evaluate(() => {
      const modal = document.getElementById('pollingGroupModalOverlay');
      return modal ? window.getComputedStyle(modal).zIndex : null;
    });
    
    console.log(`模态框z-index: ${modalZIndex}`);

    // 点击创建轮询组按钮
    console.log('👆 点击创建轮询组按钮...');
    await page.click('#createPollingGroupBtn');
    await page.waitForTimeout(1500);

    // 截图：点击后状态
    await page.screenshot({ path: 'modal-fix-after.png', fullPage: true });

    // 检查模态框状态
    const modalStatus = await page.evaluate(() => {
      const modal = document.getElementById('pollingGroupModalOverlay');
      if (!modal) return { error: 'Modal not found' };
      
      const styles = window.getComputedStyle(modal);
      const rect = modal.getBoundingClientRect();
      
      return {
        hasActiveClass: modal.classList.contains('active'),
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        zIndex: styles.zIndex,
        position: styles.position,
        top: styles.top,
        left: styles.left,
        width: rect.width,
        height: rect.height,
        isInViewport: rect.top >= 0 && rect.left >= 0 && 
                     rect.bottom <= window.innerHeight && 
                     rect.right <= window.innerWidth
      };
    });
    
    console.log('🔍 模态框详细状态:');
    console.log(JSON.stringify(modalStatus, null, 2));

    // 检查是否有其他高z-index元素遮挡
    const highZIndexElements = await page.evaluate(() => {
      const elements = [];
      document.querySelectorAll('*').forEach(el => {
        const zIndex = parseInt(window.getComputedStyle(el).zIndex);
        if (zIndex >= 10000) {
          elements.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            zIndex: zIndex,
            display: window.getComputedStyle(el).display
          });
        }
      });
      return elements.sort((a, b) => b.zIndex - a.zIndex);
    });
    
    console.log('🎯 高z-index元素（可能遮挡）:');
    highZIndexElements.slice(0, 5).forEach(el => {
      console.log(`  ${el.tagName}#${el.id}.${el.className} - z-index: ${el.zIndex} - display: ${el.display}`);
    });

    if (modalStatus.hasActiveClass && modalStatus.visibility === 'visible') {
      console.log('✅ 模态框应该可见！');
      
      // 尝试检查模态框内容
      const modalContent = await page.evaluate(() => {
        const modal = document.getElementById('pollingGroupModal');
        return modal ? {
          exists: true,
          visible: modal.offsetWidth > 0 && modal.offsetHeight > 0,
          innerHTML: modal.innerHTML.substring(0, 200) + '...'
        } : { exists: false };
      });
      
      console.log('📋 模态框内容状态:', modalContent);
    } else {
      console.log('❌ 模态框仍不可见');
    }

    console.log('⏸️ 保持页面打开供手动检查...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
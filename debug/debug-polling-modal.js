const { chromium } = require('playwright');

(async () => {
  console.log('🔍 深度调试创建轮询组模态框问题...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true // 打开开发者工具
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 监听所有控制台消息
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`❌ JavaScript错误: ${text}`);
      } else if (type === 'log') {
        console.log(`📝 控制台日志: ${text}`);
      } else if (type === 'warn') {
        console.log(`⚠️ 警告: ${text}`);
      }
    });

    // 监听页面错误
    page.on('pageerror', error => {
      console.log(`💥 页面错误: ${error.message}`);
    });

    // 监听网络请求失败
    page.on('requestfailed', request => {
      console.log(`🌐 请求失败: ${request.url()} - ${request.failure().errorText}`);
    });

    // 访问账户管理页面
    console.log('📍 访问账户管理页面...');
    await page.goto('http://localhost:8091/accounts');
    await page.waitForLoadState('networkidle');

    // 等待JavaScript加载完成
    console.log('⏳ 等待JavaScript初始化...');
    await page.waitForTimeout(3000);

    // 检查AccountsManager是否正确加载
    const accountsManagerStatus = await page.evaluate(() => {
      return {
        exists: typeof window.accountsManager !== 'undefined',
        type: typeof window.accountsManager,
        hasMethod: window.accountsManager && typeof window.accountsManager.openPollingGroupModal === 'function'
      };
    });
    
    console.log('🔧 AccountsManager状态:', accountsManagerStatus);

    // 切换到轮询规则标签页
    console.log('🔄 切换到轮询规则标签页...');
    await page.click('#pollingRulesTab');
    await page.waitForTimeout(2000);

    // 检查按钮是否存在
    const buttonInfo = await page.evaluate(() => {
      const btn = document.getElementById('createPollingGroupBtn');
      return {
        exists: !!btn,
        visible: btn ? btn.offsetWidth > 0 && btn.offsetHeight > 0 : false,
        text: btn ? btn.textContent.trim() : null,
        disabled: btn ? btn.disabled : null,
        onclick: btn ? btn.onclick : null,
        hasEventListeners: btn ? btn.getAttribute('data-has-listeners') : null
      };
    });
    
    console.log('🎯 创建轮询组按钮信息:', buttonInfo);

    // 检查模态框元素
    const modalInfo = await page.evaluate(() => {
      const modal = document.getElementById('pollingGroupModalOverlay');
      return {
        exists: !!modal,
        classes: modal ? modal.className : null,
        style: modal ? modal.style.cssText : null,
        computedDisplay: modal ? window.getComputedStyle(modal).display : null,
        computedVisibility: modal ? window.getComputedStyle(modal).visibility : null,
        computedOpacity: modal ? window.getComputedStyle(modal).opacity : null
      };
    });
    
    console.log('🪟 模态框元素信息:', modalInfo);

    if (buttonInfo.exists) {
      // 高亮按钮
      await page.locator('#createPollingGroupBtn').highlight();
      
      // 截图：点击前
      await page.screenshot({ path: 'debug-before-click.png', fullPage: true });
      
      console.log('👆 点击创建轮询组按钮...');
      
      // 使用多种方式尝试点击
      try {
        // 方法1: 直接点击
        await page.click('#createPollingGroupBtn');
        console.log('✅ 直接点击成功');
      } catch (error) {
        console.log('❌ 直接点击失败:', error.message);
        
        // 方法2: 强制点击
        try {
          await page.click('#createPollingGroupBtn', { force: true });
          console.log('✅ 强制点击成功');
        } catch (error2) {
          console.log('❌ 强制点击失败:', error2.message);
          
          // 方法3: JavaScript点击
          await page.evaluate(() => {
            document.getElementById('createPollingGroupBtn').click();
          });
          console.log('✅ JavaScript点击完成');
        }
      }
      
      await page.waitForTimeout(2000);
      
      // 截图：点击后
      await page.screenshot({ path: 'debug-after-click.png', fullPage: true });
      
      // 检查点击后的模态框状态
      const modalAfterClick = await page.evaluate(() => {
        const modal = document.getElementById('pollingGroupModalOverlay');
        return {
          hasActiveClass: modal ? modal.classList.contains('active') : false,
          display: modal ? window.getComputedStyle(modal).display : null,
          visibility: modal ? window.getComputedStyle(modal).visibility : null,
          opacity: modal ? window.getComputedStyle(modal).opacity : null,
          zIndex: modal ? window.getComputedStyle(modal).zIndex : null
        };
      });
      
      console.log('🔍 点击后模态框状态:', modalAfterClick);
      
      // 手动调用方法测试
      console.log('🧪 手动调用openPollingGroupModal方法...');
      const manualCallResult = await page.evaluate(() => {
        try {
          if (window.accountsManager && window.accountsManager.openPollingGroupModal) {
            window.accountsManager.openPollingGroupModal();
            return { success: true, error: null };
          } else {
            return { success: false, error: 'Method not found' };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      console.log('🔧 手动调用结果:', manualCallResult);
      
      if (manualCallResult.success) {
        await page.waitForTimeout(1000);
        
        // 再次检查模态框状态
        const finalModalState = await page.evaluate(() => {
          const modal = document.getElementById('pollingGroupModalOverlay');
          return {
            isVisible: modal ? modal.offsetWidth > 0 && modal.offsetHeight > 0 : false,
            hasActiveClass: modal ? modal.classList.contains('active') : false,
            computedVisibility: modal ? window.getComputedStyle(modal).visibility : null
          };
        });
        
        console.log('🎯 最终模态框状态:', finalModalState);
        
        // 最终截图
        await page.screenshot({ path: 'debug-final-state.png', fullPage: true });
        
        if (finalModalState.isVisible) {
          console.log('✅ 模态框已成功显示！');
        } else {
          console.log('❌ 模态框仍未显示，可能存在CSS或其他问题');
        }
      }
    } else {
      console.log('❌ 创建轮询组按钮不存在');
    }

    console.log('\n📋 调试报告已生成，请查看截图文件了解详细情况');
    console.log('🔧 如果问题仍存在，可能需要检查CSS样式或事件绑定');

    // 保持页面打开供手动检查
    console.log('⏸️ 页面将保持打开30秒供手动检查...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
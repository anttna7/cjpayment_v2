/**
 * 实时调试用户看到的页面状态
 * 模拟用户真实操作流程
 */
const { chromium } = require('playwright');

async function realTimeDebug() {
  console.log('🔍 实时调试用户页面状态...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ 
      headless: false, 
      slowMo: 2000,  // 慢速操作便于观察
      viewport: { width: 1920, height: 1080 }
    });
    
    const context = await browser.newContext();
    page = await context.newPage();

    // 监听所有控制台消息
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('error') || text.includes('Error')) {
        console.log(`🔴 [ERROR] ${text}`);
      } else if (text.includes('账户') || text.includes('payment') || text.includes('渲染')) {
        console.log(`📊 [DATA] ${text}`);
      }
    });

    console.log('1️⃣ 访问accounts页面...');
    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    
    // 初始状态截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/debug-1-initial.png',
      fullPage: true 
    });
    console.log('📸 初始页面截图: debug-1-initial.png');

    console.log('\n2️⃣ 检查页面可见元素...');
    
    // 检查标签页是否可见
    const tabs = await page.locator('.account-tab').all();
    console.log(`📋 找到 ${tabs.length} 个标签页按钮`);
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const text = await tab.textContent();
      const isVisible = await tab.isVisible();
      console.log(`  标签${i+1}: "${text}" - ${isVisible ? '可见' : '隐藏'}`);
    }

    console.log('\n3️⃣ 检查内容区域可见性...');
    
    const contents = [
      'accountsContent',
      'paymentAccountsContent', 
      'rulesContent',
      'flowContent',
      'statsContent'
    ];
    
    for (const contentId of contents) {
      const element = page.locator(`#${contentId}`);
      const exists = await element.count() > 0;
      const isVisible = exists ? await element.isVisible() : false;
      const hasActiveClass = exists ? await element.evaluate(el => el.classList.contains('active')) : false;
      
      console.log(`  ${contentId}: 存在=${exists}, 可见=${isVisible}, active=${hasActiveClass}`);
    }

    console.log('\n4️⃣ 点击付款账户标签...');
    const paymentTab = page.locator('#paymentAccountsTab');
    await paymentTab.click();
    await page.waitForTimeout(3000);
    
    // 付款账户状态截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/debug-2-payment-clicked.png',
      fullPage: true 
    });
    console.log('📸 付款账户点击后: debug-2-payment-clicked.png');

    // 检查付款账户表格内容
    const paymentTableBody = page.locator('#paymentAccountsTableBody');
    const paymentRows = await paymentTableBody.locator('tr').count();
    const paymentContent = await paymentTableBody.textContent();
    
    console.log(`💳 付款账户表格行数: ${paymentRows}`);
    console.log(`💳 付款账户内容长度: ${paymentContent?.length || 0} 字符`);
    
    if (paymentContent && paymentContent.length > 100) {
      console.log(`💳 内容预览: ${paymentContent.substring(0, 200)}...`);
    } else {
      console.log(`💳 内容: "${paymentContent}"`);
    }

    console.log('\n5️⃣ 检查CSS显示属性...');
    
    const paymentSection = page.locator('#paymentAccountsContent');
    const computedStyles = await paymentSection.evaluate(element => {
      const styles = window.getComputedStyle(element);
      return {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        height: styles.height,
        overflow: styles.overflow,
        transform: styles.transform
      };
    });
    
    console.log('💳 付款账户区域CSS:', computedStyles);

    console.log('\n6️⃣ 检查父容器状态...');
    const mainContainer = page.locator('main.main');
    const mainExists = await mainContainer.count() > 0;
    const mainVisible = mainExists ? await mainContainer.isVisible() : false;
    
    console.log(`🏗️ 主容器: 存在=${mainExists}, 可见=${mainVisible}`);

    console.log('\n7️⃣ 最终用户视角检查...');
    
    // 检查用户实际能看到的内容
    const visibleText = await page.locator('body').textContent();
    const hasAccountData = visibleText.includes('付款账户') || visibleText.includes('PAY001') || visibleText.includes('银行');
    
    console.log(`👁️ 页面包含账户数据: ${hasAccountData}`);
    console.log(`👁️ 页面总内容长度: ${visibleText?.length || 0} 字符`);

    if (!hasAccountData) {
      console.log('\n🔍 深度检查页面HTML结构...');
      const htmlStructure = await page.evaluate(() => {
        const tabsContainer = document.querySelector('.account-tabs');
        const contentContainer = document.querySelector('.tab-content');
        
        return {
          hasTabsContainer: !!tabsContainer,
          hasContentContainer: !!contentContainer,
          tabsHTML: tabsContainer ? tabsContainer.outerHTML.substring(0, 300) : 'NOT FOUND',
          contentHTML: contentContainer ? contentContainer.outerHTML.substring(0, 300) : 'NOT FOUND'
        };
      });
      
      console.log('🏗️ HTML结构分析:', htmlStructure);
    }

    // 最终状态截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/debug-3-final-state.png',
      fullPage: true 
    });
    console.log('📸 最终状态截图: debug-3-final-state.png');

    console.log('\n✅ 实时调试完成');
    console.log('🎯 请查看生成的3张截图，对比您看到的页面状态');

  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error);
  } finally {
    // 保持浏览器打开5秒供观察
    console.log('\n⏳ 浏览器将保持打开5秒供观察...');
    await page.waitForTimeout(5000);
    
    if (browser) {
      await browser.close();
    }
  }
}

// 运行实时调试
realTimeDebug().catch(console.error);
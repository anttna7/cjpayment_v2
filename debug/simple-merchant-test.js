const { chromium } = require('playwright');

(async () => {
  console.log('🔧 简化商户管理测试...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 直接访问商户管理页面 (注意URL是/merchant)
    await page.goto('http://localhost:8091/merchant', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 检查页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);
    
    // 检查是否跳转到登录页面
    const currentUrl = await page.url();
    console.log(`当前URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      console.log('🔐 需要先登录...');
      
      // 登录
      await page.fill('[name="username"]', 'admin');
      await page.fill('[name="password"]', 'admin123');
      await page.click('button:has-text("立即登录")');
      
      await page.waitForTimeout(2000);
      
      // 再次访问商户管理页面
      await page.goto('http://localhost:8091/merchant', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
    
    // 检查最终URL
    const finalUrl = await page.url();
    console.log(`最终URL: ${finalUrl}`);
    
    // 检查页面元素
    console.log('\n📋 检查页面元素...');
    
    // 检查表格容器
    const merchantTableContainer = await page.locator('#merchantTableContainer').count();
    console.log(`商户表格容器: ${merchantTableContainer > 0 ? '✅' : '❌'}`);
    
    const accountsTableContainer = await page.locator('.accounts-table-container').count();
    console.log(`收款账户样式容器: ${accountsTableContainer > 0 ? '✅' : '❌'}`);
    
    const tableResponseWrapper = await page.locator('.table-responsive-wrapper').count();
    console.log(`响应式表格包装器: ${tableResponseWrapper > 0 ? '✅' : '❌'}`);
    
    const enhancedTable = await page.locator('#merchantTable').count();
    console.log(`增强表格: ${enhancedTable > 0 ? '✅' : '❌'}`);
    
    const tableBody = await page.locator('#merchantTableBody').count();
    console.log(`表格体: ${tableBody > 0 ? '✅' : '❌'}`);
    
    if (enhancedTable > 0) {
      // 检查表头
      const headers = await page.locator('#merchantTable thead th').all();
      console.log(`表头列数: ${headers.length}`);
      
      for (let i = 0; i < Math.min(headers.length, 5); i++) {
        const headerText = await headers[i].textContent();
        const headerClass = await headers[i].getAttribute('class');
        console.log(`  第${i+1}列: "${headerText?.trim()}" - CSS: ${headerClass}`);
      }
      
      // 等待数据加载
      await page.waitForTimeout(2000);
      
      // 检查数据行
      const dataRows = await page.locator('#merchantTableBody tr:not(.loading-row)').count();
      console.log(`数据行数: ${dataRows}`);
      
      // 检查操作按钮
      const actionButtons = await page.locator('button:has-text("详情"), button:has-text("编辑"), button:has-text("轮询")').count();
      console.log(`操作按钮总数: ${actionButtons}`);
    }
    
    // 检查JS错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ JavaScript错误:', msg.text());
      }
    });
    
    // 截图
    await page.screenshot({ path: 'simple-merchant-test.png', fullPage: true });
    console.log('📸 已截取测试截图');
    
    // 保持页面开放供检查
    console.log('\n⏸️ 页面保持打开15秒供检查...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
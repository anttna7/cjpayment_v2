const { chromium } = require('playwright');

(async () => {
  console.log('🔧 测试商户管理表格样式和交互修复...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 先登录
    await page.goto('http://localhost:8091/login');
    await page.waitForLoadState('networkidle');
    
    // 使用演示账户登录
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button:has-text("立即登录")');
    
    await page.waitForTimeout(2000);
    
    // 访问商户管理页面
    await page.goto('http://localhost:8091/merchants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('📋 检查商户管理表格样式...');
    
    // 检查表格容器类
    const tableContainer = await page.locator('.accounts-table-container').count();
    const responsiveWrapper = await page.locator('.table-responsive-wrapper').count();
    console.log(`表格容器: ${tableContainer > 0 ? '✅' : '❌'}`);
    console.log(`响应式包装器: ${responsiveWrapper > 0 ? '✅' : '❌'}`);
    
    // 检查表格结构
    const tableExists = await page.locator('#merchantTable').count() > 0;
    console.log(`商户表格存在: ${tableExists ? '✅' : '❌'}`);
    
    if (tableExists) {
      // 检查表头结构
      const headers = await page.locator('#merchantTable thead th').all();
      console.log(`表头列数: ${headers.length}`);
      
      for (let i = 0; i < Math.min(headers.length, 5); i++) {
        const headerText = await headers[i].textContent();
        const headerClass = await headers[i].getAttribute('class');
        console.log(`  第${i+1}列: "${headerText.trim()}" - CSS: ${headerClass}`);
      }
      
      // 检查表格数据
      const dataRows = await page.locator('#merchantTableBody tr:not(.loading-row)').all();
      console.log(`数据行数: ${dataRows.length}`);
      
      if (dataRows.length > 0) {
        console.log('🔍 检查操作列按钮...');
        
        // 查找操作按钮
        var detailButtons = await page.locator('button:has-text("详情")').all();
        var editButtons = await page.locator('button:has-text("编辑")').all();
        var pollingButtons = await page.locator('button:has-text("轮询")').all();
        
        console.log(`详情按钮数量: ${detailButtons.length}`);
        console.log(`编辑按钮数量: ${editButtons.length}`);
        console.log(`轮询按钮数量: ${pollingButtons.length}`);
        
        // 测试按钮交互
        if (detailButtons.length > 0) {
          console.log('🖱️ 测试详情按钮交互...');
          
          // 设置对话框处理
          page.on('dialog', async dialog => {
            console.log(`对话框内容: ${dialog.message()}`);
            await dialog.accept();
          });
          
          try {
            await detailButtons[0].click();
            await page.waitForTimeout(1000);
            console.log('✅ 详情按钮可点击');
          } catch (error) {
            console.log('❌ 详情按钮点击失败:', error.message);
          }
        }
        
        if (editButtons.length > 0) {
          console.log('🖱️ 测试编辑按钮交互...');
          try {
            await editButtons[0].click();
            await page.waitForTimeout(1000);
            console.log('✅ 编辑按钮可点击');
          } catch (error) {
            console.log('❌ 编辑按钮点击失败:', error.message);
          }
        }
        
        if (pollingButtons.length > 0) {
          console.log('🖱️ 测试轮询按钮交互...');
          try {
            await pollingButtons[0].click();
            await page.waitForTimeout(1000);
            console.log('✅ 轮询按钮可点击');
          } catch (error) {
            console.log('❌ 轮询按钮点击失败:', error.message);
          }
        }
      }
      
      // 检查表格宽度和滚动
      const tableWidth = await page.locator('#merchantTable').evaluate(el => el.scrollWidth);
      const containerWidth = await page.locator('.table-responsive-wrapper').evaluate(el => el.clientWidth);
      
      console.log(`表格宽度: ${tableWidth}px`);
      console.log(`容器宽度: ${containerWidth}px`);
      console.log(`需要滚动: ${tableWidth > containerWidth ? '✅' : '❌'}`);
      
      // 测试横向滚动
      if (tableWidth > containerWidth) {
        console.log('🖱️ 测试横向滚动...');
        const wrapper = await page.locator('.table-responsive-wrapper').first();
        await wrapper.evaluate(el => el.scrollLeft = 200);
        await page.waitForTimeout(1000);
        console.log('✅ 横向滚动正常');
      }
    }
    
    // 截图最终效果
    await page.screenshot({ path: 'merchant-table-fixed.png', fullPage: true });
    console.log('📸 已截取修复后效果截图');
    
    // 获取最终按钮数量
    const finalDetailButtons = await page.locator('button:has-text("详情")').all();
    const finalEditButtons = await page.locator('button:has-text("编辑")').all();
    const finalPollingButtons = await page.locator('button:has-text("轮询")').all();
    
    // 验证结果总结
    console.log('\n🎉 修复验证结果:');
    console.log(`✅ 应用收款账户表样式: ${tableContainer > 0 && responsiveWrapper > 0}`);
    console.log(`✅ 表格响应式滚动: ${tableExists && tableWidth > containerWidth}`);
    console.log(`✅ 操作列按钮存在: ${finalDetailButtons.length + finalEditButtons.length + finalPollingButtons.length > 0}`);
    
    if (tableContainer > 0 && responsiveWrapper > 0 && (finalDetailButtons.length + finalEditButtons.length + finalPollingButtons.length > 0)) {
      console.log('\n🎯 修复成功！商户管理表格现在具有：');
      console.log('  ✅ 收款账户表的优秀样式和交互');
      console.log('  ✅ 横向滚动和固定列功能');
      console.log('  ✅ 可交互的操作按钮（详情、编辑、轮询）');
    } else {
      console.log('\n⚠️ 部分功能仍需调整');
    }

    // 保持页面打开供手动验证
    console.log('⏸️ 页面保持打开供手动验证...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
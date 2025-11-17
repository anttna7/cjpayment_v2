/**
 * Accounts页面修复效果快速验证
 */
const { chromium } = require('playwright');

async function validateAccountsFix() {
  console.log('🔧 验证Accounts页面修复效果...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext();
    page = await context.newPage();

    // 访问账户页面
    await page.goto('http://127.0.0.1:8091/accounts');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ 页面加载完成');

    // 检查关键ID是否存在
    const criticalIds = [
      'receivingAccountsSection',
      'paymentAccountsSection', 
      'pollingRulesSection',
      'flowChartSection',
      'analyticsSection'
    ];

    console.log('\n📋 检查关键ID元素：');
    for (const id of criticalIds) {
      const element = await page.locator(`#${id}`).count();
      console.log(`  ${element > 0 ? '✅' : '❌'} ${id}: ${element > 0 ? '存在' : '缺失'}`);
    }

    // 测试标签页切换
    const tabs = [
      { name: '付款账户', id: 'paymentAccountsTab' },
      { name: '流程图', id: 'flowTab' },
      { name: '统计分析', id: 'statsTab' }
    ];

    console.log('\n📊 测试标签页切换：');
    for (const tab of tabs) {
      try {
        const tabElement = page.locator(`#${tab.id}`);
        if (await tabElement.count() > 0) {
          await tabElement.click();
          await page.waitForTimeout(1000);
          console.log(`  ✅ ${tab.name} 标签页切换成功`);
        } else {
          console.log(`  ❌ ${tab.name} 标签页不存在`);
        }
      } catch (error) {
        console.log(`  ❌ ${tab.name} 标签页切换失败: ${error.message}`);
      }
    }

    // 检查数据是否加载
    console.log('\n📈 检查数据加载状态：');
    
    // 切换到付款账户检查数据
    await page.locator('#paymentAccountsTab').click();
    await page.waitForTimeout(2000);
    
    const paymentRows = await page.locator('#paymentAccountsTableBody tr').count();
    console.log(`  💳 付款账户数据行数: ${paymentRows}`);
    
    // 切换到流程图
    await page.locator('#flowTab').click();
    await page.waitForTimeout(1000);
    
    const flowDiagram = await page.locator('.flow-diagram').count();
    console.log(`  🔄 流程图元素: ${flowDiagram > 0 ? '存在' : '缺失'}`);
    
    // 切换到统计分析
    await page.locator('#statsTab').click();
    await page.waitForTimeout(1000);
    
    const statsCards = await page.locator('.stats-card').count();
    console.log(`  📊 统计卡片数量: ${statsCards}`);

    // 最终截图
    await page.screenshot({ 
      path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/accounts-fixed-validation.png',
      fullPage: true
    });

    console.log('\n🎉 验证完成！');
    console.log('📸 完整页面截图已保存: accounts-fixed-validation.png');

  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行验证
validateAccountsFix().catch(console.error);
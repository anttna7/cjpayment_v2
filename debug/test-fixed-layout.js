const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🔧 测试修复后的账户管理页面布局...');
  
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

    // 截图：修复后的页面
    console.log('📸 截取修复后页面截图...');
    await page.screenshot({ 
      path: 'accounts-layout-fixed.png',
      fullPage: true
    });

    // 分析新的布局结构
    console.log('📊 分析修复后的布局结构...');
    
    // 检查新的布局容器
    const sectionHeaderFull = await page.locator('.section-header-full').first();
    const fullBounds = await sectionHeaderFull.boundingBox();
    
    // 检查左侧和右侧区域
    const leftArea = await page.locator('.section-left-area').first();
    const rightArea = await page.locator('.section-right-area').first();
    
    const leftBounds = await leftArea.boundingBox();
    const rightBounds = await rightArea.boundingBox();
    
    // 检查按钮位置
    const addButton = await page.locator('#addReceivingAccountBtn');
    const exportButton = await page.locator('#exportReceivingAccountsBtn');
    
    const addButtonBounds = await addButton.boundingBox();
    const exportButtonBounds = await exportButton.boundingBox();

    console.log('🔍 修复后布局分析:');
    console.log(`  完整容器宽度: ${fullBounds?.width || 0}px`);
    console.log(`  左侧区域: 宽度 ${leftBounds?.width || 0}px, 位置 x:${leftBounds?.x || 0}`);
    console.log(`  右侧区域: 宽度 ${rightBounds?.width || 0}px, 位置 x:${rightBounds?.x || 0}`);
    console.log(`  添加按钮位置: x:${addButtonBounds?.x || 0}, y:${addButtonBounds?.y || 0}`);
    console.log(`  导出按钮位置: x:${exportButtonBounds?.x || 0}, y:${exportButtonBounds?.y || 0}`);

    // 计算按钮之间的距离
    const buttonDistance = Math.abs((exportButtonBounds?.x || 0) - (addButtonBounds?.x || 0));
    console.log(`  按钮间距离: ${buttonDistance}px`);

    // 检查是否真正实现了左右分布
    const containerWidth = fullBounds?.width || 0;
    const leftPosition = (addButtonBounds?.x || 0) - (fullBounds?.x || 0);
    const rightPosition = (exportButtonBounds?.x || 0) - (fullBounds?.x || 0);
    
    const leftRatio = (leftPosition / containerWidth) * 100;
    const rightRatio = (rightPosition / containerWidth) * 100;

    console.log('⚖️ 真实分布分析:');
    console.log(`  添加按钮位置比例: ${leftRatio.toFixed(1)}%`);
    console.log(`  导出按钮位置比例: ${rightRatio.toFixed(1)}%`);
    console.log(`  是否实现真正分布: ${rightRatio > 70 ? '✅ 是' : '❌ 否'}`);

    // 生成修复报告
    const fixReport = {
      timestamp: new Date().toISOString(),
      fix: "账户管理页面布局真正左右分布修复",
      results: {
        containerWidth: `${containerWidth}px`,
        buttonDistance: `${buttonDistance}px`,
        leftButtonPosition: `${leftRatio.toFixed(1)}%`,
        rightButtonPosition: `${rightRatio.toFixed(1)}%`,
        fixStatus: rightRatio > 70 ? "成功" : "需要进一步调整",
        screenshot: "accounts-layout-fixed.png"
      },
      improvements: [
        "🔧 重新设计section-header-full容器",
        "📐 左右区域真正占满页面宽度", 
        "🎯 导出按钮位置真正移到右侧",
        "⚖️ 实现真正的视觉平衡"
      ]
    };

    fs.writeFileSync('accounts-layout-fix-report.json', JSON.stringify(fixReport, null, 2));
    console.log('📋 修复报告已生成');

    if (rightRatio > 70) {
      console.log('✅ 布局修复成功！导出按钮已移到页面右侧');
    } else {
      console.log('⚠️ 需要进一步调整布局');
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await browser.close();
  }
})();
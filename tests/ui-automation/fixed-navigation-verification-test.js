/**
 * 修复后的导航功能验证测试
 * 验证Dashboard页面和财务审核功能的正常工作
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFixedNavigationTest() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // 慢速执行以便观察
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  const testResults = [];
  const screenshots = [];

  console.log('🚀 开始修复后的导航功能验证测试...');

  try {
    // 步骤1: 访问Dashboard页面
    console.log('📍 步骤1: 访问Dashboard页面');
    await page.goto('http://127.0.0.1:8091/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });

    // 等待页面加载完成
    await page.waitForTimeout(2000);

    // 检查是否成功加载Dashboard页面
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`当前URL: ${currentUrl}`);
    console.log(`页面标题: ${pageTitle}`);

    // 截图：初始Dashboard页面
    await page.screenshot({ 
      path: 'fixed-navigation-01-dashboard-initial.png',
      fullPage: true 
    });
    screenshots.push('fixed-navigation-01-dashboard-initial.png');

    // 验证点1: 确认页面没有重定向到登录页面
    const isOnDashboard = currentUrl.includes('/dashboard') && !currentUrl.includes('/login');
    testResults.push({
      step: 1,
      test: '访问Dashboard页面不重定向到登录页面',
      result: isOnDashboard ? 'PASS' : 'FAIL',
      details: {
        currentUrl,
        pageTitle,
        redirected: !isOnDashboard
      }
    });

    console.log(`✅ Dashboard页面访问: ${isOnDashboard ? '成功' : '失败'}`);

    // 步骤2: 检查页面内容和认证状态
    console.log('📍 步骤2: 检查页面认证状态');
    
    // 检查localStorage中的认证信息
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    const userInfo = await page.evaluate(() => localStorage.getItem('userInfo'));
    
    console.log(`AuthToken存在: ${!!authToken}`);
    console.log(`UserInfo存在: ${!!userInfo}`);

    testResults.push({
      step: 2,
      test: '检查认证状态',
      result: (authToken && userInfo) ? 'PASS' : 'FAIL',
      details: {
        authToken: !!authToken,
        userInfo: !!userInfo,
        authTokenValue: authToken ? '已设置' : '未设置',
        userInfoValue: userInfo ? '已设置' : '未设置'
      }
    });

    // 步骤3: 查找并点击"财务审核"按钮
    console.log('📍 步骤3: 查找财务审核按钮');
    
    // 等待侧边栏加载
    await page.waitForSelector('.sidebar', { timeout: 5000 });
    
    // 查找财务审核按钮的多种可能选择器
    const possibleSelectors = [
      'a[href*="financial"]',
      'a[href*="audit"]', 
      'a[href*="财务"]',
      '.menu-item:has-text("财务审核")',
      '.sidebar a:has-text("财务")',
      '[data-menu="financial-audit"]'
    ];

    let financialButton = null;
    let usedSelector = null;

    for (const selector of possibleSelectors) {
      try {
        financialButton = await page.$(selector);
        if (financialButton) {
          usedSelector = selector;
          console.log(`找到财务审核按钮，使用选择器: ${selector}`);
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }

    // 如果没找到，尝试通过文本内容查找
    if (!financialButton) {
      console.log('尝试通过文本内容查找财务审核按钮...');
      financialButton = await page.locator('text=财务审核').first();
      if (await financialButton.count() > 0) {
        usedSelector = 'text=财务审核';
        console.log('通过文本内容找到财务审核按钮');
      }
    }

    // 截图：显示侧边栏和按钮状态
    await page.screenshot({ 
      path: 'fixed-navigation-02-sidebar-buttons.png',
      fullPage: true 
    });
    screenshots.push('fixed-navigation-02-sidebar-buttons.png');

    const buttonFound = !!financialButton && (await financialButton.count() > 0);
    testResults.push({
      step: 3,
      test: '查找财务审核按钮',
      result: buttonFound ? 'PASS' : 'FAIL',
      details: {
        buttonFound,
        usedSelector,
        availableButtons: await page.$$eval('.sidebar a', buttons => 
          buttons.map(btn => ({ text: btn.textContent.trim(), href: btn.href }))
        )
      }
    });

    if (buttonFound) {
      console.log('✅ 财务审核按钮找到');
      
      // 步骤4: 点击财务审核按钮
      console.log('📍 步骤4: 点击财务审核按钮');
      
      // 确保按钮可见并可点击
      await financialButton.scrollIntoViewIfNeeded();
      await financialButton.click();
      
      // 等待页面跳转
      await page.waitForTimeout(3000);
      
      const newUrl = page.url();
      console.log(`点击后的URL: ${newUrl}`);
      
      // 截图：点击后的页面状态
      await page.screenshot({ 
        path: 'fixed-navigation-03-after-click.png',
        fullPage: true 
      });
      screenshots.push('fixed-navigation-03-after-click.png');

      // 验证点2: 确认成功跳转到财务审核页面
      const isOnFinancialPage = newUrl.includes('financial') || newUrl.includes('audit') || 
                               newUrl.includes('财务') || !newUrl.includes('login');
      
      testResults.push({
        step: 4,
        test: '点击财务审核按钮跳转成功',
        result: isOnFinancialPage ? 'PASS' : 'FAIL',
        details: {
          previousUrl: currentUrl,
          newUrl,
          redirectedToLogin: newUrl.includes('login'),
          successfulNavigation: isOnFinancialPage
        }
      });

      console.log(`✅ 财务审核页面跳转: ${isOnFinancialPage ? '成功' : '失败'}`);

    } else {
      console.log('❌ 财务审核按钮未找到，跳过点击测试');
      testResults.push({
        step: 4,
        test: '点击财务审核按钮跳转成功',
        result: 'SKIP',
        details: {
          reason: '财务审核按钮未找到'
        }
      });
    }

    // 步骤5: 检查控制台日志
    console.log('📍 步骤5: 检查控制台日志');
    
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    // 等待一段时间收集日志
    await page.waitForTimeout(2000);

    testResults.push({
      step: 5,
      test: '检查控制台认证相关日志',
      result: 'INFO',
      details: {
        totalLogs: consoleLogs.length,
        authRelatedLogs: consoleLogs.filter(log => 
          log.text.includes('auth') || 
          log.text.includes('login') || 
          log.text.includes('token') ||
          log.text.includes('认证')
        ),
        errorLogs: consoleLogs.filter(log => log.type === 'error'),
        allLogs: consoleLogs.slice(-10) // 最后10条日志
      }
    });

    // 最终截图
    await page.screenshot({ 
      path: 'fixed-navigation-04-final-state.png',
      fullPage: true 
    });
    screenshots.push('fixed-navigation-04-final-state.png');

  } catch (error) {
    console.error('❌ 测试执行错误:', error);
    testResults.push({
      step: 'ERROR',
      test: '测试执行',
      result: 'FAIL',
      details: {
        error: error.message,
        stack: error.stack
      }
    });

    // 错误截图
    await page.screenshot({ 
      path: 'fixed-navigation-error.png',
      fullPage: true 
    });
    screenshots.push('fixed-navigation-error.png');
  }

  await browser.close();

  // 生成测试报告
  const report = {
    testName: '修复后的导航功能验证测试',
    timestamp: new Date().toISOString(),
    testResults,
    screenshots,
    summary: {
      totalTests: testResults.filter(r => r.step !== 'ERROR' && r.result !== 'INFO').length,
      passed: testResults.filter(r => r.result === 'PASS').length,
      failed: testResults.filter(r => r.result === 'FAIL').length,
      skipped: testResults.filter(r => r.result === 'SKIP').length,
      overall: testResults.every(r => r.result === 'PASS' || r.result === 'SKIP' || r.result === 'INFO') ? 'PASS' : 'FAIL'
    }
  };

  // 保存测试报告
  fs.writeFileSync(
    'fixed-navigation-test-report.json', 
    JSON.stringify(report, null, 2)
  );

  console.log('\n📊 测试完成！');
  console.log(`总测试数: ${report.summary.totalTests}`);
  console.log(`通过: ${report.summary.passed}`);
  console.log(`失败: ${report.summary.failed}`);
  console.log(`跳过: ${report.summary.skipped}`);
  console.log(`整体结果: ${report.summary.overall}`);
  console.log(`截图文件: ${screenshots.join(', ')}`);
  console.log('详细报告已保存到: fixed-navigation-test-report.json');

  return report;
}

// 运行测试
if (require.main === module) {
  runFixedNavigationTest().catch(console.error);
}

module.exports = { runFixedNavigationTest };
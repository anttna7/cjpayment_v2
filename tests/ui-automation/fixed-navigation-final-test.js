/**
 * 修复后的导航功能最终验证测试
 * 适应新的页面布局，验证顶部导航菜单
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function runFinalNavigationTest() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  const testResults = [];
  const screenshots = [];
  const consoleLogs = [];

  // 收集控制台日志
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`Console [${logEntry.type}]: ${logEntry.text}`);
  });

  console.log('🚀 开始修复后的导航功能最终验证测试...');

  try {
    // 步骤1: 访问Dashboard页面
    console.log('📍 步骤1: 访问Dashboard页面');
    await page.goto('http://127.0.0.1:8091/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`当前URL: ${currentUrl}`);
    console.log(`页面标题: ${pageTitle}`);

    // 截图：初始Dashboard页面
    await page.screenshot({ 
      path: 'final-navigation-01-dashboard-loaded.png',
      fullPage: true 
    });
    screenshots.push('final-navigation-01-dashboard-loaded.png');

    // 验证点1: 确认页面没有重定向到登录页面
    const isOnDashboard = currentUrl.includes('/dashboard') && !currentUrl.includes('/login');
    testResults.push({
      step: 1,
      test: 'Dashboard页面访问成功，无重定向',
      result: isOnDashboard ? 'PASS' : 'FAIL',
      details: {
        currentUrl,
        pageTitle,
        isOnDashboard,
        hasLoginRedirect: currentUrl.includes('/login')
      }
    });

    console.log(`✅ Dashboard页面访问: ${isOnDashboard ? '成功' : '失败'}`);

    // 步骤2: 检查认证状态
    console.log('📍 步骤2: 检查认证状态');
    
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    const userInfo = await page.evaluate(() => localStorage.getItem('userInfo'));
    
    console.log(`AuthToken: ${authToken ? '已设置' : '未设置'}`);
    console.log(`UserInfo: ${userInfo ? '已设置' : '未设置'}`);

    testResults.push({
      step: 2,
      test: '认证状态检查',
      result: (authToken && userInfo) ? 'PASS' : 'FAIL',
      details: {
        authToken: !!authToken,
        userInfo: !!userInfo,
        authTokenLength: authToken ? authToken.length : 0,
        userInfoContent: userInfo ? JSON.parse(userInfo) : null
      }
    });

    // 步骤3: 查找财务审计按钮（顶部导航）
    console.log('📍 步骤3: 查找顶部导航中的财务审计按钮');

    // 等待顶部导航加载
    await page.waitForSelector('.navbar, .nav, .header', { timeout: 5000 });

    // 查找财务审计相关的按钮
    const financialSelectors = [
      'text=财务审计',
      'text=财务审核', 
      '[href*="financial"]',
      '[href*="audit"]',
      'button:has-text("财务")',
      'a:has-text("财务")',
      '.nav-item:has-text("财务")'
    ];

    let financialButton = null;
    let usedSelector = null;

    for (const selector of financialSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          financialButton = element;
          usedSelector = selector;
          console.log(`找到财务审计按钮，选择器: ${selector}`);
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }

    // 如果还没找到，获取所有顶部导航按钮
    const topNavButtons = await page.$$eval('nav a, .navbar a, .header a, [class*="nav"] a', 
      buttons => buttons.map(btn => ({
        text: btn.textContent.trim(),
        href: btn.href,
        className: btn.className
      }))
    );

    console.log('顶部导航按钮:', topNavButtons);

    // 截图：显示顶部导航
    await page.screenshot({ 
      path: 'final-navigation-02-top-navigation.png',
      fullPage: true 
    });
    screenshots.push('final-navigation-02-top-navigation.png');

    const buttonFound = financialButton && (await financialButton.count() > 0);
    testResults.push({
      step: 3,
      test: '查找财务审计按钮',
      result: buttonFound ? 'PASS' : 'FAIL',
      details: {
        buttonFound,
        usedSelector,
        availableNavButtons: topNavButtons,
        totalNavButtons: topNavButtons.length
      }
    });

    if (buttonFound) {
      console.log('✅ 财务审计按钮找到');
      
      // 步骤4: 点击财务审计按钮
      console.log('📍 步骤4: 点击财务审计按钮');
      
      // 确保按钮可见
      await financialButton.scrollIntoViewIfNeeded();
      await financialButton.highlight();
      
      // 截图：高亮按钮
      await page.screenshot({ 
        path: 'final-navigation-03-button-highlighted.png',
        fullPage: true 
      });
      screenshots.push('final-navigation-03-button-highlighted.png');

      // 点击按钮
      await financialButton.click();
      
      // 等待页面响应
      await page.waitForTimeout(3000);
      
      const newUrl = page.url();
      const newTitle = await page.title();
      
      console.log(`点击后URL: ${newUrl}`);
      console.log(`点击后标题: ${newTitle}`);
      
      // 截图：点击后的页面
      await page.screenshot({ 
        path: 'final-navigation-04-after-click.png',
        fullPage: true 
      });
      screenshots.push('final-navigation-04-after-click.png');

      // 验证点2: 确认没有重定向到登录页面
      const hasLoginRedirect = newUrl.includes('/login');
      const navigationSuccess = !hasLoginRedirect && (newUrl !== currentUrl || newTitle !== pageTitle);
      
      testResults.push({
        step: 4,
        test: '财务审计按钮点击导航',
        result: !hasLoginRedirect ? 'PASS' : 'FAIL',
        details: {
          beforeUrl: currentUrl,
          afterUrl: newUrl,
          beforeTitle: pageTitle,
          afterTitle: newTitle,
          hasLoginRedirect,
          urlChanged: newUrl !== currentUrl,
          titleChanged: newTitle !== pageTitle,
          navigationSuccess
        }
      });

      console.log(`✅ 财务审计导航: ${!hasLoginRedirect ? '成功' : '失败'}`);

    } else {
      console.log('❌ 财务审计按钮未找到');
      testResults.push({
        step: 4,
        test: '财务审计按钮点击导航',
        result: 'SKIP',
        details: {
          reason: '财务审计按钮未找到',
          availableButtons: topNavButtons
        }
      });
    }

    // 步骤5: 检查控制台日志
    console.log('📍 步骤5: 分析控制台日志');
    
    const authRelatedLogs = consoleLogs.filter(log => 
      log.text.toLowerCase().includes('auth') || 
      log.text.toLowerCase().includes('login') || 
      log.text.toLowerCase().includes('token') ||
      log.text.includes('认证') ||
      log.text.includes('登录')
    );

    const errorLogs = consoleLogs.filter(log => log.type === 'error');

    testResults.push({
      step: 5,
      test: '控制台日志分析',
      result: 'INFO',
      details: {
        totalLogs: consoleLogs.length,
        authRelatedLogs,
        errorLogs,
        recentLogs: consoleLogs.slice(-5)
      }
    });

    console.log(`总控制台日志: ${consoleLogs.length}条`);
    console.log(`认证相关日志: ${authRelatedLogs.length}条`);
    console.log(`错误日志: ${errorLogs.length}条`);

    // 最终状态截图
    await page.screenshot({ 
      path: 'final-navigation-05-final-state.png',
      fullPage: true 
    });
    screenshots.push('final-navigation-05-final-state.png');

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

    await page.screenshot({ 
      path: 'final-navigation-error.png',
      fullPage: true 
    });
    screenshots.push('final-navigation-error.png');
  }

  await browser.close();

  // 生成综合测试报告
  const report = {
    testName: '修复后导航功能最终验证测试',
    timestamp: new Date().toISOString(),
    testResults,
    screenshots,
    consoleLogs,
    summary: {
      totalTests: testResults.filter(r => r.step !== 'ERROR' && r.result !== 'INFO').length,
      passed: testResults.filter(r => r.result === 'PASS').length,
      failed: testResults.filter(r => r.result === 'FAIL').length,
      skipped: testResults.filter(r => r.result === 'SKIP').length,
      overall: testResults.filter(r => r.result === 'FAIL').length === 0 ? 'PASS' : 'FAIL'
    },
    keyFindings: {
      dashboardAccessible: testResults.find(r => r.step === 1)?.result === 'PASS',
      authenticationWorking: testResults.find(r => r.step === 2)?.result === 'PASS',
      financialButtonFound: testResults.find(r => r.step === 3)?.result === 'PASS',
      navigationSuccessful: testResults.find(r => r.step === 4)?.result === 'PASS',
      noLoginRedirects: !testResults.some(r => r.details?.hasLoginRedirect)
    }
  };

  // 保存报告
  fs.writeFileSync(
    'final-navigation-test-report.json', 
    JSON.stringify(report, null, 2)
  );

  console.log('\n📊 最终测试结果:');
  console.log(`总测试数: ${report.summary.totalTests}`);
  console.log(`通过: ${report.summary.passed}`);
  console.log(`失败: ${report.summary.failed}`);
  console.log(`跳过: ${report.summary.skipped}`);
  console.log(`整体结果: ${report.summary.overall}`);
  
  console.log('\n🔍 关键发现:');
  console.log(`Dashboard可访问: ${report.keyFindings.dashboardAccessible ? '✅' : '❌'}`);
  console.log(`认证正常工作: ${report.keyFindings.authenticationWorking ? '✅' : '❌'}`);
  console.log(`财务审计按钮可找到: ${report.keyFindings.financialButtonFound ? '✅' : '❌'}`);
  console.log(`导航功能正常: ${report.keyFindings.navigationSuccessful ? '✅' : '❌'}`);
  console.log(`无登录重定向: ${report.keyFindings.noLoginRedirects ? '✅' : '❌'}`);
  
  console.log(`\n📸 截图文件: ${screenshots.join(', ')}`);
  console.log('详细报告: final-navigation-test-report.json');

  return report;
}

// 运行测试
if (require.main === module) {
  runFinalNavigationTest().catch(console.error);
}

module.exports = { runFinalNavigationTest };
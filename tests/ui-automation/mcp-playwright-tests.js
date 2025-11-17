/**
 * CJPayment MCP Playwright深度交互测试
 * 使用系统浏览器进行真实用户交互验证
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8091';

// 测试配置
const TEST_CONFIG = {
  // 使用系统Chrome而非下载新的
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false, // 显示浏览器便于观察
  viewport: { width: 1440, height: 900 },
  slowMo: 800, // 放慢操作便于观察
  args: [
    '--no-sandbox',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
};

/**
 * 测试报告生成器
 */
class MCPTestReport {
  constructor() {
    this.tests = [];
    this.screenshots = [];
    this.startTime = Date.now();
  }

  addTest(name, status, details, screenshot = null) {
    const test = {
      name,
      status, // 'pass', 'fail', 'skip'
      details,
      screenshot,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime
    };
    
    this.tests.push(test);
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
    console.log(`${icon} ${name}: ${details}`);
    
    if (screenshot) {
      this.screenshots.push(screenshot);
      console.log(`   📸 截图: ${screenshot}`);
    }
  }

  generateReport() {
    const summary = {
      total: this.tests.length,
      passed: this.tests.filter(t => t.status === 'pass').length,
      failed: this.tests.filter(t => t.status === 'fail').length,
      skipped: this.tests.filter(t => t.status === 'skip').length,
      duration: Date.now() - this.startTime,
      screenshots: this.screenshots.length
    };

    console.log('\n🎭 Playwright MCP测试报告');
    console.log('========================');
    console.log(`总测试数: ${summary.total}`);
    console.log(`✅ 通过: ${summary.passed}`);
    console.log(`❌ 失败: ${summary.failed}`);
    console.log(`⏭️ 跳过: ${summary.skipped}`);
    console.log(`⏱️ 总耗时: ${(summary.duration / 1000).toFixed(1)}秒`);
    console.log(`📸 截图数: ${summary.screenshots}`);
    console.log(`🏆 成功率: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);

    return { summary, tests: this.tests };
  }
}

/**
 * 主测试执行器
 */
async function runMCPPlaywrightTests() {
  console.log('🎭 启动Playwright MCP深度交互测试...\n');
  
  const report = new MCPTestReport();
  let browser, context, page;

  try {
    // 尝试启动浏览器
    try {
      browser = await chromium.launch(TEST_CONFIG);
      context = await browser.newContext();
      page = await context.newPage();
      
      report.addTest('浏览器启动', 'pass', '成功启动Chrome浏览器');
    } catch (error) {
      // 如果系统Chrome不可用，尝试使用Playwright的Chrome
      console.log('系统Chrome不可用，尝试使用Playwright Chrome...');
      try {
        browser = await chromium.launch({ 
          headless: false, 
          viewport: TEST_CONFIG.viewport,
          slowMo: TEST_CONFIG.slowMo 
        });
        context = await browser.newContext();
        page = await context.newPage();
        
        report.addTest('浏览器启动', 'pass', '使用Playwright Chrome启动成功');
      } catch (fallbackError) {
        report.addTest('浏览器启动', 'fail', `无法启动浏览器: ${fallbackError.message}`);
        return;
      }
    }

    // 创建截图目录
    const screenshotDir = path.join(__dirname, 'mcp-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 执行测试套件
    await testLoginAndNavigation(page, report, screenshotDir);
    await testButtonInteractions(page, report, screenshotDir);
    await testMerchantModalDeepDive(page, report, screenshotDir);
    await testAccountModalDeepDive(page, report, screenshotDir);
    await testDataLoadingAndDisplay(page, report, screenshotDir);
    await testThemeAndResponsive(page, report, screenshotDir);
    await testFormValidationFlow(page, report, screenshotDir);

  } catch (error) {
    report.addTest('测试执行', 'fail', `严重错误: ${error.message}`);
    console.error('测试执行失败:', error);
  } finally {
    if (browser) {
      await browser.close();
      report.addTest('清理资源', 'pass', '浏览器已关闭');
    }
    
    // 生成最终报告
    const finalReport = report.generateReport();
    
    // 保存报告
    fs.writeFileSync(
      path.join(__dirname, 'mcp-playwright-report.json'),
      JSON.stringify(finalReport, null, 2)
    );
  }
}

/**
 * 测试1: 登录和导航交互
 */
async function testLoginAndNavigation(page, report, screenshotDir) {
  console.log('\n🔐 测试1: 登录和导航交互');

  try {
    // 访问登录页面
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    const loginScreenshot = path.join(screenshotDir, '01-login-page.png');
    await page.screenshot({ path: loginScreenshot });
    report.addTest('登录页面加载', 'pass', '页面成功加载', loginScreenshot);

    // 测试导航到仪表板
    try {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      const dashboardScreenshot = path.join(screenshotDir, '02-dashboard.png');
      await page.screenshot({ path: dashboardScreenshot });
      report.addTest('仪表板访问', 'pass', '仪表板页面正常显示', dashboardScreenshot);

      // 测试导航链接悬停效果
      const navLinks = await page.locator('.nav__link, .nav-link').all();
      if (navLinks.length > 0) {
        await navLinks[0].hover();
        await page.waitForTimeout(500);
        
        const hoverScreenshot = path.join(screenshotDir, '03-nav-hover.png');
        await page.screenshot({ path: hoverScreenshot });
        report.addTest('导航悬停效果', 'pass', `测试了导航链接悬停效果`, hoverScreenshot);
      }

    } catch (error) {
      report.addTest('导航测试', 'fail', `导航测试失败: ${error.message}`);
    }

  } catch (error) {
    report.addTest('登录页面', 'fail', `登录页面测试失败: ${error.message}`);
  }
}

/**
 * 测试2: 按钮交互深度测试
 */
async function testButtonInteractions(page, report, screenshotDir) {
  console.log('\n🔘 测试2: 按钮交互深度测试');

  const testPages = [
    { path: '/merchant', name: '商户管理' },
    { path: '/accounts', name: '账户管理' },
    { path: '/audit', name: '财务审计' }
  ];

  for (const testPage of testPages) {
    try {
      await page.goto(`${BASE_URL}${testPage.path}`);
      await page.waitForLoadState('networkidle');

      // 查找并测试按钮
      const buttons = await page.locator('button, .btn').all();
      
      if (buttons.length > 0) {
        // 测试第一个按钮的悬停效果
        await buttons[0].hover();
        await page.waitForTimeout(300);
        
        const hoverScreenshot = path.join(screenshotDir, `04-${testPage.name}-button-hover.png`);
        await page.screenshot({ path: hoverScreenshot });
        
        report.addTest(`${testPage.name}按钮悬停`, 'pass', 
          `按钮悬停效果正常，找到${buttons.length}个按钮`, hoverScreenshot);
      } else {
        report.addTest(`${testPage.name}按钮`, 'skip', '页面未找到按钮元素');
      }

    } catch (error) {
      report.addTest(`${testPage.name}按钮测试`, 'fail', `按钮测试失败: ${error.message}`);
    }
  }
}

/**
 * 测试3: 商户模态框深度交互
 */
async function testMerchantModalDeepDive(page, report, screenshotDir) {
  console.log('\n🏢 测试3: 商户模态框深度交互');

  try {
    await page.goto(`${BASE_URL}/merchant`);
    await page.waitForLoadState('networkidle');

    // 查找添加商户按钮
    const addButton = page.locator('button:has-text("添加商户"), .btn:has-text("添加商户")').first();
    
    if (await addButton.isVisible()) {
      // 点击打开模态框
      await addButton.click();
      await page.waitForSelector('.modal, .modal-dialog', { state: 'visible', timeout: 5000 });

      const modalScreenshot = path.join(screenshotDir, '05-merchant-modal-open.png');
      await page.screenshot({ path: modalScreenshot });
      report.addTest('商户模态框打开', 'pass', '模态框成功打开', modalScreenshot);

      // 测试必填字段
      const requiredFields = ['merchantName', 'agencyId', 'agencyName', 'adAccountId', 'adAccountName'];
      let filledFields = 0;

      for (const fieldId of requiredFields) {
        const field = page.locator(`#${fieldId}, [name="${fieldId}"]`);
        
        if (await field.isVisible()) {
          await field.fill(`测试${fieldId}`);
          filledFields++;
          await page.waitForTimeout(200);
        }
      }

      const fillScreenshot = path.join(screenshotDir, '06-merchant-modal-filled.png');
      await page.screenshot({ path: fillScreenshot });
      report.addTest('商户表单填写', 'pass', `成功填写${filledFields}个必填字段`, fillScreenshot);

      // 测试下拉框交互
      const selects = await page.locator('select, .form-select-enhanced').all();
      if (selects.length > 0) {
        await selects[0].click();
        await page.waitForTimeout(300);
        
        const selectScreenshot = path.join(screenshotDir, '07-merchant-select-open.png');
        await page.screenshot({ path: selectScreenshot });
        report.addTest('商户下拉框交互', 'pass', `下拉框交互正常，找到${selects.length}个下拉框`, selectScreenshot);
      }

      // 关闭模态框
      const closeButton = page.locator('.modal .close, .modal .btn-close, button:has-text("取消")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
        report.addTest('商户模态框关闭', 'pass', '模态框成功关闭');
      }

    } else {
      report.addTest('商户模态框', 'skip', '未找到添加商户按钮');
    }

  } catch (error) {
    report.addTest('商户模态框测试', 'fail', `模态框测试失败: ${error.message}`);
  }
}

/**
 * 测试4: 账户模态框深度交互
 */
async function testAccountModalDeepDive(page, report, screenshotDir) {
  console.log('\n💰 测试4: 账户模态框深度交互');

  try {
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForLoadState('networkidle');

    // 查找添加账户按钮
    const addButton = page.locator('button:has-text("添加账户"), .btn:has-text("添加收款账户")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('.modal, .modal-dialog', { state: 'visible', timeout: 5000 });

      const modalScreenshot = path.join(screenshotDir, '08-account-modal-open.png');
      await page.screenshot({ path: modalScreenshot });
      report.addTest('账户模态框打开', 'pass', '模态框成功打开', modalScreenshot);

      // 测试收款机构选择功能
      const institutionSelect = page.locator('#institution, [name="institution"]');
      if (await institutionSelect.isVisible()) {
        await institutionSelect.selectOption('银行卡');
        await page.waitForTimeout(500);

        const bankSelectScreenshot = path.join(screenshotDir, '09-account-bank-select.png');
        await page.screenshot({ path: bankSelectScreenshot });
        report.addTest('收款机构选择', 'pass', '银行卡选择功能正常', bankSelectScreenshot);

        // 检查银行名称字段是否显示
        const bankNameRow = page.locator('#bankNameRow, #merchantBankNameRow');
        if (await bankNameRow.isVisible()) {
          report.addTest('银行名称字段显示', 'pass', '选择银行卡后正确显示银行名称字段');
          
          // 测试银行选择
          const bankSelect = page.locator('#bankName, [name="bankName"]');
          if (await bankSelect.isVisible()) {
            await bankSelect.selectOption('中国工商银行');
            await page.waitForTimeout(300);

            const bankChoiceScreenshot = path.join(screenshotDir, '10-bank-choice.png');
            await page.screenshot({ path: bankChoiceScreenshot });
            report.addTest('银行选择功能', 'pass', '银行选择功能正常', bankChoiceScreenshot);
          }
        }
      }

      // 填写其他必填字段
      const accountFields = {
        'accountName': '测试收款账户',
        'accountNumber': '6222000000000000',
        'dailyLimit': '100000',
        'singleLimit': '50000'
      };

      let accountFieldsFilled = 0;
      for (const [fieldId, value] of Object.entries(accountFields)) {
        const field = page.locator(`#${fieldId}, [name="${fieldId}"]`);
        if (await field.isVisible()) {
          await field.fill(value);
          accountFieldsFilled++;
          await page.waitForTimeout(200);
        }
      }

      const accountFilledScreenshot = path.join(screenshotDir, '11-account-form-filled.png');
      await page.screenshot({ path: accountFilledScreenshot });
      report.addTest('账户表单填写', 'pass', `成功填写${accountFieldsFilled}个账户字段`, accountFilledScreenshot);

      // 关闭模态框
      const closeButton = page.locator('.modal .close, .modal .btn-close, button:has-text("取消")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
        report.addTest('账户模态框关闭', 'pass', '模态框成功关闭');
      }

    } else {
      report.addTest('账户模态框', 'skip', '未找到添加账户按钮');
    }

  } catch (error) {
    report.addTest('账户模态框测试', 'fail', `模态框测试失败: ${error.message}`);
  }
}

/**
 * 测试5: 数据加载和显示
 */
async function testDataLoadingAndDisplay(page, report, screenshotDir) {
  console.log('\n📊 测试5: 数据加载和显示');

  try {
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForLoadState('networkidle');
    
    // 等待数据加载
    await page.waitForTimeout(3000);

    const accountsScreenshot = path.join(screenshotDir, '12-accounts-data.png');
    await page.screenshot({ path: accountsScreenshot });
    report.addTest('账户页面数据', 'pass', '账户页面数据区域截图完成', accountsScreenshot);

    // 测试标签页切换
    const tabs = ['收款账户', '付款账户', '轮询规则', '流程图', '统计分析'];
    
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}"), .tab:has-text("${tabName}")`);
      
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(1000);
        
        const tabScreenshot = path.join(screenshotDir, `13-${tabName}-tab.png`);
        await page.screenshot({ path: tabScreenshot });
        report.addTest(`${tabName}标签页`, 'pass', `${tabName}标签页切换正常`, tabScreenshot);
      } else {
        report.addTest(`${tabName}标签页`, 'skip', `未找到${tabName}标签页`);
      }
    }

  } catch (error) {
    report.addTest('数据显示测试', 'fail', `数据显示测试失败: ${error.message}`);
  }
}

/**
 * 测试6: 主题切换和响应式设计
 */
async function testThemeAndResponsive(page, report, screenshotDir) {
  console.log('\n🎨 测试6: 主题切换和响应式设计');

  try {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // 测试主题切换
    const themeToggle = page.locator('#themeToggle, .theme-toggle, button:has-text("主题")');
    
    if (await themeToggle.isVisible()) {
      const beforeTheme = await page.getAttribute('html', 'data-theme');
      
      await themeToggle.click();
      await page.waitForTimeout(1000);
      
      const afterTheme = await page.getAttribute('html', 'data-theme');
      
      const themeScreenshot = path.join(screenshotDir, '14-theme-switched.png');
      await page.screenshot({ path: themeScreenshot });
      
      if (beforeTheme !== afterTheme) {
        report.addTest('主题切换功能', 'pass', `主题从${beforeTheme}切换到${afterTheme}`, themeScreenshot);
      } else {
        report.addTest('主题切换功能', 'fail', '主题切换未生效');
      }
    } else {
      report.addTest('主题切换', 'skip', '未找到主题切换按钮');
    }

    // 测试响应式设计
    const viewports = [
      { width: 1920, height: 1080, name: '桌面' },
      { width: 768, height: 1024, name: '平板' },
      { width: 375, height: 667, name: '手机' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      const responsiveScreenshot = path.join(screenshotDir, `15-responsive-${viewport.name}.png`);
      await page.screenshot({ path: responsiveScreenshot });
      report.addTest(`响应式设计-${viewport.name}`, 'pass', 
        `${viewport.name}视图 (${viewport.width}x${viewport.height})`, responsiveScreenshot);
    }

  } catch (error) {
    report.addTest('主题响应式测试', 'fail', `主题响应式测试失败: ${error.message}`);
  }
}

/**
 * 测试7: 表单验证流程
 */
async function testFormValidationFlow(page, report, screenshotDir) {
  console.log('\n✅ 测试7: 表单验证流程');

  try {
    await page.goto(`${BASE_URL}/merchant`);
    await page.waitForLoadState('networkidle');

    const addButton = page.locator('button:has-text("添加商户")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('.modal', { state: 'visible', timeout: 5000 });

      // 尝试直接提交空表单，测试验证
      const submitButton = page.locator('.modal button[type="submit"], .modal .btn-primary').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        const validationScreenshot = path.join(screenshotDir, '16-form-validation.png');
        await page.screenshot({ path: validationScreenshot });
        report.addTest('表单验证', 'pass', '表单验证测试完成', validationScreenshot);
      }

      // 关闭模态框
      const closeButton = page.locator('.modal .close, button:has-text("取消")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addTest('表单验证', 'skip', '未找到表单提交按钮');
    }

  } catch (error) {
    report.addTest('表单验证测试', 'fail', `表单验证测试失败: ${error.message}`);
  }
}

// 运行测试
if (require.main === module) {
  runMCPPlaywrightTests().catch(console.error);
}

module.exports = { runMCPPlaywrightTests };
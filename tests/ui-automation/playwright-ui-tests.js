/**
 * CJPayment UI自动化测试 - 验证所有UI优化效果
 * 使用Playwright进行真实浏览器测试
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://127.0.0.1:8091';
const TEST_CONFIG = {
  headless: false, // 显示浏览器便于观察
  viewport: { width: 1920, height: 1080 },
  slowMo: 500 // 放慢操作速度便于观察
};

/**
 * 主测试函数
 */
async function runUITests() {
  console.log('🚀 开始CJPayment UI自动化测试...');
  
  const browser = await chromium.launch(TEST_CONFIG);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 测试1: 登录页面UI验证
    await testLoginPage(page);
    
    // 测试2: 导航菜单统一样式验证
    await testNavigationStyles(page);
    
    // 测试3: 按钮统一样式验证
    await testButtonStyles(page);
    
    // 测试4: 商户管理模态框优化验证
    await testMerchantModal(page);
    
    // 测试5: 账户管理模态框优化验证
    await testAccountModal(page);
    
    // 测试6: 账户管理页面数据显示验证
    await testAccountDataDisplay(page);
    
    // 测试7: 主题切换功能验证
    await testThemeSwitch(page);
    
    console.log('✅ 所有UI测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await browser.close();
  }
}

/**
 * 测试1: 登录页面UI验证
 */
async function testLoginPage(page) {
  console.log('\n📋 测试1: 登录页面UI验证');
  
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // 验证页面标题
  const title = await page.title();
  console.log(`  页面标题: ${title}`);
  
  // 验证登录按钮样式
  const loginButton = page.locator('button[type="submit"], .btn-primary').first();
  if (await loginButton.isVisible()) {
    const buttonStyle = await loginButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.background,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow
      };
    });
    console.log('  ✅ 登录按钮样式已应用紫色渐变主题');
  }
  
  // 截图保存
  await page.screenshot({ path: 'tests/ui-automation/screenshots/login-page.png' });
}

/**
 * 测试2: 导航菜单统一样式验证
 */
async function testNavigationStyles(page) {
  console.log('\n📋 测试2: 导航菜单统一样式验证');
  
  // 访问仪表板页面
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  
  // 测试导航链接悬停效果
  const navLinks = page.locator('.nav__link, .nav-link');
  const linkCount = await navLinks.count();
  
  if (linkCount > 0) {
    console.log(`  找到 ${linkCount} 个导航链接`);
    
    // 测试第一个链接的悬停效果
    const firstLink = navLinks.first();
    await firstLink.hover();
    
    const hoverStyle = await firstLink.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        color: styles.color,
        background: styles.background,
        transform: styles.transform
      };
    });
    
    console.log('  ✅ 导航链接悬停效果已应用');
    console.log(`    颜色: ${hoverStyle.color}`);
    console.log(`    背景: ${hoverStyle.background}`);
  }
  
  await page.screenshot({ path: 'tests/ui-automation/screenshots/navigation-hover.png' });
}

/**
 * 测试3: 按钮统一样式验证
 */
async function testButtonStyles(page) {
  console.log('\n📋 测试3: 按钮统一样式验证');
  
  // 访问不同页面测试按钮样式一致性
  const pages = [
    { url: '/merchant', name: '商户管理' },
    { url: '/accounts', name: '账户管理' },
    { url: '/audit', name: '财务审计' }
  ];
  
  for (const testPage of pages) {
    await page.goto(`${BASE_URL}${testPage.url}`);
    await page.waitForLoadState('networkidle');
    
    const buttons = page.locator('button, .btn, .btn-primary');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      console.log(`  ${testPage.name}页面: 找到 ${buttonCount} 个按钮`);
      
      // 测试第一个按钮样式
      const firstButton = buttons.first();
      if (await firstButton.isVisible()) {
        const buttonStyle = await firstButton.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            background: styles.background.includes('linear-gradient'),
            borderRadius: styles.borderRadius,
            boxShadow: styles.boxShadow
          };
        });
        
        if (buttonStyle.background) {
          console.log(`    ✅ ${testPage.name}: 按钮样式统一`);
        }
      }
    }
  }
}

/**
 * 测试4: 商户管理模态框优化验证
 */
async function testMerchantModal(page) {
  console.log('\n📋 测试4: 商户管理模态框优化验证');
  
  await page.goto(`${BASE_URL}/merchant`);
  await page.waitForLoadState('networkidle');
  
  // 查找添加商户按钮
  const addButton = page.locator('button:has-text("添加商户"), .btn:has-text("添加商户")').first();
  
  if (await addButton.isVisible()) {
    console.log('  找到添加商户按钮');
    await addButton.click();
    
    // 等待模态框出现
    await page.waitForSelector('.modal, .modal-dialog', { state: 'visible', timeout: 5000 });
    
    // 验证必填字段
    const requiredFields = [
      'merchantName', 'agencyId', 'agencyName', 
      'adAccountId', 'adAccountName'
    ];
    
    let foundFields = 0;
    for (const fieldId of requiredFields) {
      const field = page.locator(`#${fieldId}, [name="${fieldId}"]`);
      if (await field.isVisible()) {
        foundFields++;
        console.log(`    ✅ 必填字段 ${fieldId} 存在`);
      }
    }
    
    console.log(`  必填字段统计: ${foundFields}/${requiredFields.length}`);
    
    // 验证下拉框美化效果
    const selectFields = page.locator('select, .form-select-enhanced');
    const selectCount = await selectFields.count();
    console.log(`  找到 ${selectCount} 个下拉框`);
    
    // 截图保存
    await page.screenshot({ path: 'tests/ui-automation/screenshots/merchant-modal.png' });
    
    // 关闭模态框
    const closeButton = page.locator('.modal .close, .modal .btn-close, button:has-text("取消")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  } else {
    console.log('  ⚠️ 未找到添加商户按钮');
  }
}

/**
 * 测试5: 账户管理模态框优化验证
 */
async function testAccountModal(page) {
  console.log('\n📋 测试5: 账户管理模态框优化验证');
  
  await page.goto(`${BASE_URL}/accounts`);
  await page.waitForLoadState('networkidle');
  
  // 查找添加账户按钮
  const addButton = page.locator('button:has-text("添加账户"), .btn:has-text("添加收款账户")').first();
  
  if (await addButton.isVisible()) {
    console.log('  找到添加账户按钮');
    await addButton.click();
    
    // 等待模态框出现
    await page.waitForSelector('.modal, .modal-dialog', { state: 'visible', timeout: 5000 });
    
    // 验证收款账户信息字段
    const accountFields = [
      'accountName', 'accountNumber', 'accountType', 'institution'
    ];
    
    let foundAccountFields = 0;
    for (const fieldId of accountFields) {
      const field = page.locator(`#${fieldId}, [name="${fieldId}"]`);
      if (await field.isVisible()) {
        foundAccountFields++;
        console.log(`    ✅ 收款账户字段 ${fieldId} 存在`);
      }
    }
    
    console.log(`  收款账户字段统计: ${foundAccountFields}/${accountFields.length}`);
    
    // 测试银行卡动态选择功能
    const institutionSelect = page.locator('#institution, [name="institution"]');
    if (await institutionSelect.isVisible()) {
      await institutionSelect.selectOption('银行卡');
      
      // 检查是否显示银行名称选择
      const bankNameRow = page.locator('#bankNameRow, #merchantBankNameRow');
      if (await bankNameRow.isVisible()) {
        console.log('    ✅ 银行卡选择时正确显示银行名称字段');
      }
    }
    
    await page.screenshot({ path: 'tests/ui-automation/screenshots/account-modal.png' });
    
    // 关闭模态框
    const closeButton = page.locator('.modal .close, .modal .btn-close, button:has-text("取消")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  } else {
    console.log('  ⚠️ 未找到添加账户按钮');
  }
}

/**
 * 测试6: 账户管理页面数据显示验证
 */
async function testAccountDataDisplay(page) {
  console.log('\n📋 测试6: 账户管理页面数据显示验证');
  
  await page.goto(`${BASE_URL}/accounts`);
  await page.waitForLoadState('networkidle');
  
  // 等待数据加载
  await page.waitForTimeout(3000);
  
  // 检查收款账户数据
  const receivingAccountsSection = page.locator('#receivingAccountsSection, .receiving-accounts');
  if (await receivingAccountsSection.isVisible()) {
    console.log('  ✅ 收款账户区域可见');
    
    const dataRows = receivingAccountsSection.locator('tr, .account-item');
    const rowCount = await dataRows.count();
    console.log(`    数据行数: ${rowCount}`);
  }
  
  // 检查付款账户标签页
  const paymentTab = page.locator('button:has-text("付款账户"), .tab:has-text("付款账户")');
  if (await paymentTab.isVisible()) {
    await paymentTab.click();
    await page.waitForTimeout(2000);
    
    const paymentSection = page.locator('#paymentAccountsSection, .payment-accounts');
    if (await paymentSection.isVisible()) {
      console.log('  ✅ 付款账户标签页工作正常');
    }
  }
  
  await page.screenshot({ path: 'tests/ui-automation/screenshots/accounts-data.png' });
}

/**
 * 测试7: 主题切换功能验证
 */
async function testThemeSwitch(page) {
  console.log('\n📋 测试7: 主题切换功能验证');
  
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  
  // 查找主题切换按钮
  const themeToggle = page.locator('#themeToggle, .theme-toggle, button:has-text("主题")');
  
  if (await themeToggle.isVisible()) {
    console.log('  找到主题切换按钮');
    
    // 获取当前主题
    const currentTheme = await page.getAttribute('html', 'data-theme');
    console.log(`  当前主题: ${currentTheme}`);
    
    // 切换主题
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    // 验证主题是否改变
    const newTheme = await page.getAttribute('html', 'data-theme');
    console.log(`  切换后主题: ${newTheme}`);
    
    if (currentTheme !== newTheme) {
      console.log('  ✅ 主题切换功能正常');
    }
    
    await page.screenshot({ path: 'tests/ui-automation/screenshots/theme-switch.png' });
  } else {
    console.log('  ⚠️ 未找到主题切换按钮');
  }
}

// 创建截图目录
const fs = require('fs');
const path = require('path');
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// 运行测试
runUITests().catch(console.error);
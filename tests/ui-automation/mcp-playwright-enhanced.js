/**
 * CJPayment MCP Playwright增强版测试
 * 修复模态框选择器和严格模式冲突问题
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8091';

/**
 * 增强的MCP测试执行器
 */
async function runEnhancedMCPTests() {
  console.log('🎭 启动增强版Playwright MCP测试...\n');
  
  let browser, context, page;

  try {
    browser = await chromium.launch({
      headless: false,
      viewport: { width: 1440, height: 900 },
      slowMo: 600
    });
    
    context = await browser.newContext();
    page = await context.newPage();
    
    console.log('✅ 浏览器启动成功');

    // 创建截图目录
    const screenshotDir = path.join(__dirname, 'enhanced-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 核心功能测试
    await testModalInteractions(page, screenshotDir);
    await testAdvancedFormFeatures(page, screenshotDir);
    await testUIConsistency(page, screenshotDir);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ 浏览器已关闭');
    }
  }
}

/**
 * 测试模态框交互（修复选择器问题）
 */
async function testModalInteractions(page, screenshotDir) {
  console.log('\n🔲 测试模态框交互功能');

  try {
    // 测试商户模态框
    await page.goto(`${BASE_URL}/merchant`);
    await page.waitForLoadState('networkidle');
    
    console.log('  📍 访问商户管理页面');
    
    // 更精确的按钮选择器
    const addMerchantButtons = await page.locator('button').all();
    let merchantModalButton = null;
    
    for (const button of addMerchantButtons) {
      const text = await button.textContent();
      if (text && text.includes('添加商户')) {
        merchantModalButton = button;
        break;
      }
    }
    
    if (merchantModalButton) {
      await merchantModalButton.click();
      console.log('  🔘 点击添加商户按钮');
      
      // 等待任何形式的模态框出现
      try {
        await page.waitForTimeout(2000); // 给模态框时间显示
        
        // 检查多种可能的模态框选择器
        const modalSelectors = [
          '.modal:visible',
          '[role="dialog"]:visible', 
          '.modal-dialog:visible',
          '.overlay:visible',
          '.popup:visible'
        ];
        
        let modalFound = false;
        for (const selector of modalSelectors) {
          const elements = await page.locator(selector).count();
          if (elements > 0) {
            console.log(`  ✅ 找到模态框: ${selector} (${elements}个)`);
            modalFound = true;
            
            const modalScreenshot = path.join(screenshotDir, 'merchant-modal-found.png');
            await page.screenshot({ path: modalScreenshot });
            break;
          }
        }
        
        if (!modalFound) {
          console.log('  ⚠️ 未检测到模态框，可能使用了其他实现');
          const fallbackScreenshot = path.join(screenshotDir, 'merchant-modal-fallback.png');
          await page.screenshot({ path: fallbackScreenshot });
        }
        
      } catch (error) {
        console.log(`  ⚠️ 模态框检测异常: ${error.message}`);
      }
    } else {
      console.log('  ⚠️ 未找到添加商户按钮');
    }

    // 测试账户模态框
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForLoadState('networkidle');
    
    console.log('  📍 访问账户管理页面');
    
    const addAccountButtons = await page.locator('button').all();
    let accountModalButton = null;
    
    for (const button of addAccountButtons) {
      const text = await button.textContent();
      if (text && (text.includes('添加账户') || text.includes('添加收款'))) {
        accountModalButton = button;
        break;
      }
    }
    
    if (accountModalButton) {
      await accountModalButton.click();
      console.log('  🔘 点击添加账户按钮');
      
      await page.waitForTimeout(2000);
      
      const accountModalScreenshot = path.join(screenshotDir, 'account-modal-attempt.png');
      await page.screenshot({ path: accountModalScreenshot });
      console.log('  📸 账户模态框尝试截图完成');
    } else {
      console.log('  ⚠️ 未找到添加账户按钮');
    }

  } catch (error) {
    console.log(`  ❌ 模态框测试异常: ${error.message}`);
  }
}

/**
 * 测试高级表单功能
 */
async function testAdvancedFormFeatures(page, screenshotDir) {
  console.log('\n📋 测试高级表单功能');

  try {
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForLoadState('networkidle');
    
    // 测试标签页功能（避免严格模式冲突）
    const tabNames = ['收款账户', '付款账户', '轮询规则', '流程图', '统计分析'];
    
    for (const tabName of tabNames) {
      // 使用更精确的选择器
      const tabs = await page.locator(`button:has-text("${tabName}")`).all();
      
      if (tabs.length === 1) {
        await tabs[0].click();
        await page.waitForTimeout(1000);
        
        const tabScreenshot = path.join(screenshotDir, `enhanced-${tabName}-tab.png`);
        await page.screenshot({ path: tabScreenshot });
        console.log(`  ✅ ${tabName}标签页切换成功`);
        
      } else if (tabs.length > 1) {
        // 处理多个匹配的情况
        console.log(`  ⚠️ ${tabName}有${tabs.length}个匹配项，选择第一个`);
        await tabs[0].click();
        await page.waitForTimeout(1000);
        
        const tabScreenshot = path.join(screenshotDir, `enhanced-${tabName}-tab-first.png`);
        await page.screenshot({ path: tabScreenshot });
        
      } else {
        console.log(`  ⚠️ 未找到${tabName}标签页`);
      }
    }

    // 测试表单输入功能
    console.log('  🔍 检测页面表单元素');
    
    const inputs = await page.locator('input').all();
    const selects = await page.locator('select').all();
    const textareas = await page.locator('textarea').all();
    
    console.log(`  📊 表单统计: ${inputs.length}个输入框, ${selects.length}个下拉框, ${textareas.length}个文本域`);

  } catch (error) {
    console.log(`  ❌ 表单功能测试异常: ${error.message}`);
  }
}

/**
 * 测试UI一致性
 */
async function testUIConsistency(page, screenshotDir) {
  console.log('\n🎨 测试UI一致性');

  const testPages = [
    { path: '/login', name: '登录页面' },
    { path: '/dashboard', name: '仪表板' },
    { path: '/merchant', name: '商户管理' },
    { path: '/accounts', name: '账户管理' },
    { path: '/audit', name: '财务审计' },
    { path: '/system_management', name: '系统管理' },
    { path: '/security_center', name: '安全中心' }
  ];

  for (const testPage of testPages) {
    try {
      await page.goto(`${BASE_URL}${testPage.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // 检查页面基本元素
      const buttons = await page.locator('button').count();
      const links = await page.locator('a').count();
      const forms = await page.locator('form').count();
      
      console.log(`  📄 ${testPage.name}: ${buttons}个按钮, ${links}个链接, ${forms}个表单`);

      // 截图对比
      const pageScreenshot = path.join(screenshotDir, `consistency-${testPage.name}.png`);
      await page.screenshot({ path: pageScreenshot });

      // 测试导航链接悬停（如果存在）
      const navLinks = await page.locator('.nav__link, .nav-link').all();
      if (navLinks.length > 0 && navLinks.length <= 10) { // 避免过多测试
        for (let i = 0; i < Math.min(navLinks.length, 3); i++) {
          await navLinks[i].hover();
          await page.waitForTimeout(300);
        }
        
        const hoverScreenshot = path.join(screenshotDir, `hover-${testPage.name}.png`);
        await page.screenshot({ path: hoverScreenshot });
        console.log(`  ✅ ${testPage.name}导航悬停测试完成`);
      }

    } catch (error) {
      console.log(`  ❌ ${testPage.name}测试失败: ${error.message}`);
    }
  }

  // 最终一致性报告
  console.log('\n📊 UI一致性测试完成');
  console.log(`📸 生成的截图保存在: ${screenshotDir}`);
}

// 运行增强测试
if (require.main === module) {
  runEnhancedMCPTests().catch(console.error);
}

module.exports = { runEnhancedMCPTests };
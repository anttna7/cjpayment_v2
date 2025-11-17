/**
 * CJPayment Accounts页面深度调试
 * 使用Playwright MCP分析付款账户、流程图、统计分析内容缺失问题
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8091';

class AccountsDebugger {
  constructor() {
    this.issues = [];
    this.screenshots = [];
    this.consoleLogs = [];
    this.networkRequests = [];
  }

  addIssue(category, severity, description, details = null, screenshot = null) {
    const issue = {
      category,
      severity, // 'critical', 'major', 'minor', 'info'
      description,
      details,
      screenshot,
      timestamp: new Date().toISOString()
    };
    
    this.issues.push(issue);
    
    const icons = {
      critical: '🔴',
      major: '🟠', 
      minor: '🟡',
      info: '🔵'
    };
    
    console.log(`${icons[severity]} [${category}] ${description}`);
    if (details) console.log(`   详情: ${details}`);
    if (screenshot) console.log(`   📸 截图: ${screenshot}`);
  }

  generateReport() {
    const summary = {
      total: this.issues.length,
      critical: this.issues.filter(i => i.severity === 'critical').length,
      major: this.issues.filter(i => i.severity === 'major').length,
      minor: this.issues.filter(i => i.severity === 'minor').length,
      info: this.issues.filter(i => i.severity === 'info').length
    };

    console.log('\n🔍 Accounts页面调试报告');
    console.log('====================');
    console.log(`🔴 严重问题: ${summary.critical}`);
    console.log(`🟠 主要问题: ${summary.major}`); 
    console.log(`🟡 次要问题: ${summary.minor}`);
    console.log(`🔵 信息提示: ${summary.info}`);
    console.log(`📊 问题总数: ${summary.total}`);

    return { summary, issues: this.issues, consoleLogs: this.consoleLogs, networkRequests: this.networkRequests };
  }
}

async function debugAccountsPage() {
  console.log('🔍 启动Accounts页面深度调试...\n');
  
  const debugTool = new AccountsDebugger();
  let browser, context, page;

  try {
    browser = await chromium.launch({
      headless: false,
      viewport: { width: 1440, height: 900 },
      slowMo: 1000
    });
    
    context = await browser.newContext();
    page = await context.newPage();

    // 创建调试截图目录
    const debugDir = path.join(__dirname, 'accounts-debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    // 监听控制台日志
    page.on('console', msg => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      debugTool.consoleLogs.push(logEntry);
      console.log(`📝 控制台: ${logEntry}`);
    });

    // 监听网络请求
    page.on('request', request => {
      const requestInfo = `${request.method()} ${request.url()}`;
      debugTool.networkRequests.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
    });

    // 监听网络响应失败
    page.on('requestfailed', request => {
      debugTool.addIssue('网络', 'major', '请求失败', 
        `${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });

    console.log('✅ 浏览器启动成功，开始调试...\n');

    // 1. 基础页面加载调试
    await debugBasicPageLoad(page, debugTool, debugDir);

    // 2. 标签页功能调试
    await debugTabFunctionality(page, debugTool, debugDir);

    // 3. 数据加载机制调试
    await debugDataLoadingMechanisms(page, debugTool, debugDir);

    // 4. JavaScript错误调试
    await debugJavaScriptErrors(page, debugTool, debugDir);

    // 5. DOM元素结构调试
    await debugDOMStructure(page, debugTool, debugDir);

    // 6. CSS样式问题调试
    await debugCSSIssues(page, debugTool, debugDir);

    // 7. API调用调试
    await debugAPICallsAndData(page, debugTool, debugDir);

  } catch (error) {
    debugTool.addIssue('系统', 'critical', '调试过程异常', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }

    // 生成完整调试报告
    const report = debugTool.generateReport();
    
    // 保存调试报告
    fs.writeFileSync(
      path.join(__dirname, 'accounts-debug-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📋 调试报告已保存到: accounts-debug-report.json');
  }
}

/**
 * 1. 基础页面加载调试
 */
async function debugBasicPageLoad(page, debugTool, debugDir) {
  console.log('\n🔍 1. 基础页面加载调试');

  try {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/accounts`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    debugTool.addIssue('性能', loadTime > 3000 ? 'major' : 'info', 
      '页面加载时间', `${loadTime}ms`);

    // 截图页面初始状态
    const initialScreenshot = path.join(debugDir, '01-initial-load.png');
    await page.screenshot({ path: initialScreenshot });
    debugTool.addIssue('页面状态', 'info', '初始页面截图', '页面成功加载', initialScreenshot);

    // 检查页面标题和基本元素
    const title = await page.title();
    debugTool.addIssue('页面信息', 'info', '页面标题', title);

    // 检查是否有JavaScript错误
    const errors = await page.evaluate(() => {
      return window.console._errors || [];
    });

    if (errors.length > 0) {
      debugTool.addIssue('JavaScript', 'major', 'JavaScript错误', `发现${errors.length}个错误`);
    }

  } catch (error) {
    debugTool.addIssue('页面加载', 'critical', '页面加载失败', error.message);
  }
}

/**
 * 2. 标签页功能调试
 */
async function debugTabFunctionality(page, debugTool, debugDir) {
  console.log('\n🔍 2. 标签页功能调试');

  const tabs = [
    { name: '收款账户', id: 'receivingAccountsTab', content: 'receivingAccountsSection' },
    { name: '付款账户', id: 'paymentAccountsTab', content: 'paymentAccountsSection' },
    { name: '轮询规则', id: 'pollingRulesTab', content: 'pollingRulesSection' },
    { name: '流程图', id: 'flowChartTab', content: 'flowChartSection' },
    { name: '统计分析', id: 'analyticsTab', content: 'analyticsSection' }
  ];

  for (const tab of tabs) {
    try {
      console.log(`  📋 测试 ${tab.name} 标签页`);

      // 查找标签按钮
      const tabButton = await page.locator(`#${tab.id}, button:has-text("${tab.name}")`).first();
      
      if (await tabButton.isVisible()) {
        debugTool.addIssue('标签页', 'info', `${tab.name}标签按钮`, '按钮存在且可见');
        
        // 点击标签
        await tabButton.click();
        await page.waitForTimeout(2000); // 等待内容加载

        // 检查标签是否激活
        const isActive = await tabButton.evaluate(el => {
          return el.classList.contains('active') || 
                 el.getAttribute('aria-selected') === 'true' ||
                 el.classList.contains('selected');
        });

        if (isActive) {
          debugTool.addIssue('标签页', 'info', `${tab.name}激活状态`, '标签正确激活');
        } else {
          debugTool.addIssue('标签页', 'major', `${tab.name}激活状态`, '标签未正确激活');
        }

        // 检查对应内容区域
        const contentSection = page.locator(`#${tab.content}, .${tab.content}`);
        const contentExists = await contentSection.count() > 0;
        const contentVisible = contentExists ? await contentSection.first().isVisible() : false;

        if (!contentExists) {
          debugTool.addIssue('内容区域', 'critical', `${tab.name}内容区域`, `找不到ID为${tab.content}的内容区域`);
        } else if (!contentVisible) {
          debugTool.addIssue('内容区域', 'major', `${tab.name}内容可见性`, '内容区域存在但不可见');
        } else {
          debugTool.addIssue('内容区域', 'info', `${tab.name}内容区域`, '内容区域存在且可见');
        }

        // 检查内容是否为空
        if (contentVisible) {
          const contentText = await contentSection.first().textContent();
          const hasRealContent = contentText && contentText.trim().length > 50; // 假设真实内容应该超过50字符

          if (!hasRealContent) {
            debugTool.addIssue('内容数据', 'major', `${tab.name}内容为空`, 
              `内容长度: ${contentText ? contentText.trim().length : 0}字符`);
          } else {
            debugTool.addIssue('内容数据', 'info', `${tab.name}内容充实`, 
              `内容长度: ${contentText.trim().length}字符`);
          }
        }

        // 截图当前标签状态
        const tabScreenshot = path.join(debugDir, `02-${tab.name}-tab.png`);
        await page.screenshot({ path: tabScreenshot });
        debugTool.screenshots.push(tabScreenshot);

      } else {
        debugTool.addIssue('标签页', 'critical', `${tab.name}标签按钮`, '标签按钮不存在或不可见');
      }

    } catch (error) {
      debugTool.addIssue('标签页', 'major', `${tab.name}标签测试失败`, error.message);
    }
  }
}

/**
 * 3. 数据加载机制调试
 */
async function debugDataLoadingMechanisms(page, debugTool, debugDir) {
  console.log('\n🔍 3. 数据加载机制调试');

  try {
    // 检查是否有加载指示器
    const loadingIndicators = await page.locator('.loading, .spinner, .loader, [data-loading="true"]').count();
    debugTool.addIssue('加载状态', 'info', '加载指示器', `找到${loadingIndicators}个加载指示器`);

    // 检查是否有空状态提示
    const emptyStates = await page.locator('.empty, .no-data, .no-content, :has-text("暂无数据")').count();
    debugTool.addIssue('空状态', 'info', '空状态提示', `找到${emptyStates}个空状态提示`);

    // 检查JavaScript初始化
    const jsInitialized = await page.evaluate(() => {
      // 检查常见的初始化标志
      return {
        hasAccountManagement: typeof window.AccountManagementEnhanced !== 'undefined',
        hasJQuery: typeof $ !== 'undefined',
        hasAccountsData: window.accountsData !== undefined,
        hasInitFunction: typeof initializeAccountManagement !== 'undefined'
      };
    });

    Object.entries(jsInitialized).forEach(([key, value]) => {
      debugTool.addIssue('JavaScript初始化', value ? 'info' : 'major', key, value ? '已初始化' : '未初始化');
    });

    // 等待数据加载
    await page.waitForTimeout(5000);

    // 检查数据表格/列表内容
    const dataTables = await page.locator('table, .data-table, .account-list').count();
    debugTool.addIssue('数据结构', 'info', '数据表格数量', `${dataTables}个`);

    if (dataTables > 0) {
      const tableRows = await page.locator('table tr, .data-row, .account-item').count();
      debugTool.addIssue('数据行数', tableRows > 1 ? 'info' : 'major', '数据行统计', `${tableRows}行`);
    }

  } catch (error) {
    debugTool.addIssue('数据加载', 'major', '数据加载机制检查失败', error.message);
  }
}

/**
 * 4. JavaScript错误调试
 */
async function debugJavaScriptErrors(page, debugTool, debugDir) {
  console.log('\n🔍 4. JavaScript错误调试');

  try {
    // 执行JavaScript代码检查
    const jsStatus = await page.evaluate(() => {
      const errors = [];
      const warnings = [];

      try {
        // 检查关键函数是否存在
        if (typeof initializeAccountManagement === 'undefined') {
          errors.push('initializeAccountManagement函数未定义');
        }

        if (typeof AccountManagementEnhanced === 'undefined') {
          errors.push('AccountManagementEnhanced类未定义');
        }

        // 检查DOM是否准备好
        if (document.readyState !== 'complete') {
          warnings.push('DOM未完全加载');
        }

        // 检查必要的DOM元素
        const requiredElements = [
          'receivingAccountsTab',
          'paymentAccountsTab', 
          'pollingRulesTab',
          'flowChartTab',
          'analyticsTab'
        ];

        requiredElements.forEach(id => {
          if (!document.getElementById(id)) {
            errors.push(`必要元素 ${id} 不存在`);
          }
        });

        return { errors, warnings };
      } catch (e) {
        return { errors: [e.message], warnings: [] };
      }
    });

    jsStatus.errors.forEach(error => {
      debugTool.addIssue('JavaScript错误', 'major', 'JS执行错误', error);
    });

    jsStatus.warnings.forEach(warning => {
      debugTool.addIssue('JavaScript警告', 'minor', 'JS警告', warning);
    });

  } catch (error) {
    debugTool.addIssue('JavaScript', 'critical', 'JavaScript调试失败', error.message);
  }
}

/**
 * 5. DOM元素结构调试
 */
async function debugDOMStructure(page, debugTool, debugDir) {
  console.log('\n🔍 5. DOM元素结构调试');

  try {
    // 检查账户相关的DOM结构
    const domStructure = await page.evaluate(() => {
      const structure = {
        tabsContainer: !!document.querySelector('.account-tabs, .tabs-container, .nav-tabs'),
        contentAreas: {
          receivingAccountsSection: !!document.getElementById('receivingAccountsSection'),
          paymentAccountsSection: !!document.getElementById('paymentAccountsSection'),
          pollingRulesSection: !!document.getElementById('pollingRulesSection'),
          flowChartSection: !!document.getElementById('flowChartSection'),
          analyticsSection: !!document.getElementById('analyticsSection')
        },
        buttons: {
          receivingAccountsTab: !!document.getElementById('receivingAccountsTab'),
          paymentAccountsTab: !!document.getElementById('paymentAccountsTab'),
          pollingRulesTab: !!document.getElementById('pollingRulesTab'),
          flowChartTab: !!document.getElementById('flowChartTab'),
          analyticsTab: !!document.getElementById('analyticsTab')
        },
        scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline').filter(s => s.includes('account') || s.includes('management'))
      };

      return structure;
    });

    // 分析DOM结构
    debugTool.addIssue('DOM结构', domStructure.tabsContainer ? 'info' : 'major', 
      '标签容器', domStructure.tabsContainer ? '存在' : '缺失');

    Object.entries(domStructure.contentAreas).forEach(([key, exists]) => {
      debugTool.addIssue('内容区域', exists ? 'info' : 'critical', 
        `${key}内容区域`, exists ? '存在' : '缺失');
    });

    Object.entries(domStructure.buttons).forEach(([key, exists]) => {
      debugTool.addIssue('标签按钮', exists ? 'info' : 'critical', 
        `${key}按钮`, exists ? '存在' : '缺失');
    });

    debugTool.addIssue('脚本文件', 'info', '相关脚本数量', `${domStructure.scripts.length}个`);
    domStructure.scripts.forEach(script => {
      debugTool.addIssue('脚本文件', 'info', '账户相关脚本', script);
    });

  } catch (error) {
    debugTool.addIssue('DOM结构', 'major', 'DOM结构检查失败', error.message);
  }
}

/**
 * 6. CSS样式问题调试
 */
async function debugCSSIssues(page, debugTool, debugDir) {
  console.log('\n🔍 6. CSS样式问题调试');

  try {
    const styleIssues = await page.evaluate(() => {
      const issues = [];

      // 检查关键元素的样式
      const criticalElements = [
        '#paymentAccountsSection',
        '#flowChartSection', 
        '#analyticsSection'
      ];

      criticalElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          const styles = window.getComputedStyle(element);
          
          if (styles.display === 'none') {
            issues.push(`${selector} 被CSS隐藏 (display: none)`);
          }
          
          if (styles.visibility === 'hidden') {
            issues.push(`${selector} 不可见 (visibility: hidden)`);
          }
          
          if (styles.opacity === '0') {
            issues.push(`${selector} 透明 (opacity: 0)`);
          }

          if (styles.height === '0px' || styles.maxHeight === '0px') {
            issues.push(`${selector} 高度为0`);
          }
        } else {
          issues.push(`${selector} 元素不存在`);
        }
      });

      return issues;
    });

    styleIssues.forEach(issue => {
      debugTool.addIssue('CSS样式', 'major', 'CSS隐藏问题', issue);
    });

    if (styleIssues.length === 0) {
      debugTool.addIssue('CSS样式', 'info', 'CSS检查', '未发现明显的CSS隐藏问题');
    }

  } catch (error) {
    debugTool.addIssue('CSS样式', 'major', 'CSS检查失败', error.message);
  }
}

/**
 * 7. API调用调试
 */
async function debugAPICallsAndData(page, debugTool, debugDir) {
  console.log('\n🔍 7. API调用和数据调试');

  try {
    // 监听XHR请求
    const apiCalls = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/') || 
          response.url().includes('/accounts') ||
          response.url().includes('/payment') ||
          response.url().includes('/analytics')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // 切换到付款账户标签触发可能的API调用
    const paymentTab = page.locator('#paymentAccountsTab, button:has-text("付款账户")').first();
    if (await paymentTab.isVisible()) {
      await paymentTab.click();
      await page.waitForTimeout(3000); // 等待API调用完成
    }

    // 切换到流程图标签
    const flowTab = page.locator('#flowChartTab, button:has-text("流程图")').first();
    if (await flowTab.isVisible()) {
      await flowTab.click();
      await page.waitForTimeout(3000);
    }

    // 切换到统计分析标签  
    const analyticsTab = page.locator('#analyticsTab, button:has-text("统计分析")').first();
    if (await analyticsTab.isVisible()) {
      await analyticsTab.click();
      await page.waitForTimeout(3000);
    }

    // 报告API调用情况
    if (apiCalls.length === 0) {
      debugTool.addIssue('API调用', 'major', 'API请求缺失', '未检测到相关API调用');
    } else {
      debugTool.addIssue('API调用', 'info', 'API调用统计', `检测到${apiCalls.length}个API调用`);
      
      apiCalls.forEach(call => {
        const severity = call.status >= 400 ? 'major' : 'info';
        debugTool.addIssue('API响应', severity, `API调用: ${call.status}`, call.url);
      });
    }

    // 最终状态截图
    const finalScreenshot = path.join(debugDir, '07-final-state.png');
    await page.screenshot({ path: finalScreenshot });
    debugTool.screenshots.push(finalScreenshot);

  } catch (error) {
    debugTool.addIssue('API调试', 'major', 'API调试失败', error.message);
  }
}

// 运行调试
if (require.main === module) {
  debugAccountsPage().catch(console.error);
}

module.exports = { debugAccountsPage };
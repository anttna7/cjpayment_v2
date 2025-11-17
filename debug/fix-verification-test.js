const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFixVerificationTest() {
    console.log('🚀 开始修复验证测试...');
    
    const testResults = {
        timestamp: new Date().toISOString(),
        tests: [],
        screenshots: [],
        errors: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0
        }
    };

    const browser = await chromium.launch({ 
        headless: false,  // 显示浏览器界面以便观察
        slowMo: 500       // 减慢操作速度便于观察
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // 监听JavaScript错误
    const jsErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            jsErrors.push({
                timestamp: new Date().toISOString(),
                message: msg.text(),
                location: msg.location()
            });
            console.log('❌ JavaScript错误:', msg.text());
        }
    });

    // 监听页面错误
    page.on('pageerror', error => {
        jsErrors.push({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack
        });
        console.log('❌ 页面错误:', error.message);
    });

    try {
        // 测试1: 商户管理页面模态框测试
        console.log('\n📋 测试1: 商户管理页面模态框功能...');
        testResults.tests.push({
            name: '商户管理页面模态框测试',
            url: 'http://127.0.0.1:8091/merchant',
            steps: [],
            passed: false,
            errors: []
        });

        const merchantTest = testResults.tests[testResults.tests.length - 1];
        
        // 访问商户管理页面
        console.log('  🔗 访问商户管理页面...');
        await page.goto('http://127.0.0.1:8091/merchant', { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
        });
        
        merchantTest.steps.push('页面加载完成');
        
        // 等待页面完全加载
        await page.waitForTimeout(2000);
        
        // 截图: 商户管理页面初始状态
        const merchantInitialScreenshot = `merchant-page-initial-${Date.now()}.png`;
        await page.screenshot({ 
            path: merchantInitialScreenshot,
            fullPage: true 
        });
        console.log('  📸 商户管理页面初始截图:', merchantInitialScreenshot);
        testResults.screenshots.push({
            name: '商户管理页面初始状态',
            path: merchantInitialScreenshot
        });

        // 查找添加商户按钮
        console.log('  🔍 查找添加商户按钮...');
        const addMerchantButtons = [
            'button:has-text("添加商户")',
            'button:has-text("新增商户")',
            '.add-merchant-btn',
            '#add-merchant-btn',
            'button[onclick*="addMerchant"]',
            'button[onclick*="showAddModal"]'
        ];

        let addButton = null;
        for (const selector of addMerchantButtons) {
            try {
                addButton = await page.locator(selector).first();
                if (await addButton.isVisible()) {
                    console.log(`  ✅ 找到添加商户按钮: ${selector}`);
                    merchantTest.steps.push(`找到添加商户按钮: ${selector}`);
                    break;
                }
            } catch (error) {
                // 继续尝试下一个选择器
            }
        }

        if (!addButton || !(await addButton.isVisible())) {
            // 尝试通过文本查找按钮
            const allButtons = await page.locator('button').all();
            for (const button of allButtons) {
                try {
                    const text = await button.textContent();
                    if (text && (text.includes('添加') || text.includes('新增') || text.includes('商户'))) {
                        addButton = button;
                        console.log(`  ✅ 通过文本找到按钮: ${text}`);
                        merchantTest.steps.push(`通过文本找到按钮: ${text}`);
                        break;
                    }
                } catch (error) {
                    // 继续尝试下一个按钮
                }
            }
        }

        if (!addButton || !(await addButton.isVisible())) {
            const error = '未找到添加商户按钮';
            console.log('  ❌', error);
            merchantTest.errors.push(error);
            merchantTest.steps.push('❌ ' + error);
        } else {
            // 点击添加商户按钮
            console.log('  🖱️ 点击添加商户按钮...');
            await addButton.click();
            merchantTest.steps.push('点击添加商户按钮');
            
            // 等待模态框出现
            await page.waitForTimeout(1000);
            
            // 检查模态框是否出现
            const modalSelectors = [
                '.modal',
                '.modal-dialog',
                '.modal-content',
                '#merchantModal',
                '[role="dialog"]',
                '.merchant-modal'
            ];
            
            let modalFound = false;
            for (const selector of modalSelectors) {
                try {
                    const modal = await page.locator(selector);
                    if (await modal.isVisible()) {
                        console.log(`  ✅ 模态框弹出成功: ${selector}`);
                        merchantTest.steps.push(`模态框弹出成功: ${selector}`);
                        modalFound = true;
                        break;
                    }
                } catch (error) {
                    // 继续尝试下一个选择器
                }
            }
            
            if (!modalFound) {
                const error = '模态框未弹出';
                console.log('  ❌', error);
                merchantTest.errors.push(error);
                merchantTest.steps.push('❌ ' + error);
            } else {
                merchantTest.passed = true;
            }
        }
        
        // 截图: 点击按钮后的状态
        const merchantModalScreenshot = `merchant-modal-${Date.now()}.png`;
        await page.screenshot({ 
            path: merchantModalScreenshot,
            fullPage: true 
        });
        console.log('  📸 商户管理页面模态框截图:', merchantModalScreenshot);
        testResults.screenshots.push({
            name: '商户管理页面模态框状态',
            path: merchantModalScreenshot
        });

        // 测试2: 账户管理页面测试
        console.log('\n📋 测试2: 账户管理页面功能...');
        testResults.tests.push({
            name: '账户管理页面测试',
            url: 'http://127.0.0.1:8091/accounts',
            steps: [],
            passed: false,
            errors: []
        });

        const accountTest = testResults.tests[testResults.tests.length - 1];
        
        // 清空之前的JavaScript错误
        jsErrors.length = 0;
        
        // 访问账户管理页面
        console.log('  🔗 访问账户管理页面...');
        await page.goto('http://127.0.0.1:8091/accounts', { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
        });
        
        accountTest.steps.push('页面加载完成');
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 截图: 账户管理页面初始状态
        const accountInitialScreenshot = `account-page-initial-${Date.now()}.png`;
        await page.screenshot({ 
            path: accountInitialScreenshot,
            fullPage: true 
        });
        console.log('  📸 账户管理页面初始截图:', accountInitialScreenshot);
        testResults.screenshots.push({
            name: '账户管理页面初始状态',
            path: accountInitialScreenshot
        });

        // 检查JavaScript错误
        if (jsErrors.length === 0) {
            console.log('  ✅ 无JavaScript错误');
            accountTest.steps.push('无JavaScript错误');
        } else {
            console.log(`  ❌ 发现 ${jsErrors.length} 个JavaScript错误`);
            jsErrors.forEach(error => {
                console.log(`    - ${error.message}`);
                accountTest.errors.push(error.message);
            });
            accountTest.steps.push(`发现 ${jsErrors.length} 个JavaScript错误`);
        }

        // 检查收款账户tab是否默认激活
        console.log('  🔍 检查收款账户tab状态...');
        const tabSelectors = [
            '.tab-pane.active',
            '.nav-link.active:has-text("收款账户")',
            '.tab-content .active',
            '#receivingAccounts.active'
        ];
        
        let activeTabFound = false;
        for (const selector of tabSelectors) {
            try {
                const activeTab = await page.locator(selector);
                if (await activeTab.isVisible()) {
                    const tabText = await activeTab.textContent();
                    if (tabText && tabText.includes('收款')) {
                        console.log('  ✅ 收款账户tab默认激活');
                        accountTest.steps.push('收款账户tab默认激活');
                        activeTabFound = true;
                        break;
                    }
                }
            } catch (error) {
                // 继续尝试下一个选择器
            }
        }
        
        if (!activeTabFound) {
            // 尝试通过其他方式检查tab状态
            try {
                const allTabs = await page.locator('.nav-link, .tab-link').all();
                for (const tab of allTabs) {
                    const text = await tab.textContent();
                    const isActive = await tab.getAttribute('class');
                    if (text && text.includes('收款') && isActive && isActive.includes('active')) {
                        console.log('  ✅ 收款账户tab默认激活');
                        accountTest.steps.push('收款账户tab默认激活');
                        activeTabFound = true;
                        break;
                    }
                }
            } catch (error) {
                // 忽略错误
            }
        }
        
        if (!activeTabFound) {
            const error = '收款账户tab未默认激活';
            console.log('  ❌', error);
            accountTest.errors.push(error);
            accountTest.steps.push('❌ ' + error);
        }

        // 检查表格是否正常显示
        console.log('  🔍 检查表格显示状态...');
        const tableSelectors = [
            'table',
            '.table',
            '.data-table',
            '#accountsTable'
        ];
        
        let tableFound = false;
        for (const selector of tableSelectors) {
            try {
                const table = await page.locator(selector);
                if (await table.isVisible()) {
                    console.log(`  ✅ 表格正常显示: ${selector}`);
                    accountTest.steps.push(`表格正常显示: ${selector}`);
                    tableFound = true;
                    break;
                }
            } catch (error) {
                // 继续尝试下一个选择器
            }
        }
        
        if (!tableFound) {
            const error = '表格未正常显示';
            console.log('  ❌', error);
            accountTest.errors.push(error);
            accountTest.steps.push('❌ ' + error);
        }

        // 判断账户管理页面测试是否通过
        if (jsErrors.length === 0 && activeTabFound && tableFound) {
            accountTest.passed = true;
        }

        // 收集所有JavaScript错误
        testResults.errors = jsErrors;

        // 生成测试摘要
        testResults.summary.total = testResults.tests.length;
        testResults.summary.passed = testResults.tests.filter(test => test.passed).length;
        testResults.summary.failed = testResults.summary.total - testResults.summary.passed;

        console.log('\n📊 测试摘要:');
        console.log(`  总测试数: ${testResults.summary.total}`);
        console.log(`  通过: ${testResults.summary.passed}`);
        console.log(`  失败: ${testResults.summary.failed}`);
        console.log(`  JavaScript错误: ${testResults.errors.length}`);

        // 生成测试报告
        const reportContent = `# 修复验证测试报告

## 测试概要
- **测试时间**: ${testResults.timestamp}
- **总测试数**: ${testResults.summary.total}
- **通过**: ${testResults.summary.passed}
- **失败**: ${testResults.summary.failed}
- **JavaScript错误**: ${testResults.errors.length}

## 测试详情

${testResults.tests.map(test => `
### ${test.name}
- **URL**: ${test.url}
- **状态**: ${test.passed ? '✅ 通过' : '❌ 失败'}

#### 测试步骤
${test.steps.map(step => `- ${step}`).join('\n')}

${test.errors.length > 0 ? `#### 错误信息
${test.errors.map(error => `- ❌ ${error}`).join('\n')}` : ''}
`).join('\n')}

## JavaScript错误日志
${testResults.errors.length > 0 ? 
    testResults.errors.map(error => `
### 错误时间: ${error.timestamp}
- **消息**: ${error.message}
${error.stack ? `- **堆栈**: ${error.stack}` : ''}
${error.location ? `- **位置**: ${JSON.stringify(error.location)}` : ''}
`).join('\n') : 
    '✅ 无JavaScript错误'
}

## 截图记录
${testResults.screenshots.map(screenshot => `- **${screenshot.name}**: ${screenshot.path}`).join('\n')}

## 修复建议
${testResults.summary.failed > 0 ? `
### 需要修复的问题
${testResults.tests.filter(test => !test.passed).map(test => `
#### ${test.name}
${test.errors.map(error => `- ${error}`).join('\n')}
`).join('\n')}
` : '✅ 所有测试通过，修复生效！'}
`;

        // 保存测试报告
        const reportPath = `fix-verification-report-${Date.now()}.md`;
        fs.writeFileSync(reportPath, reportContent);
        console.log(`\n📄 测试报告已保存: ${reportPath}`);

        // 保存JSON格式的测试结果
        const jsonReportPath = `fix-verification-results-${Date.now()}.json`;
        fs.writeFileSync(jsonReportPath, JSON.stringify(testResults, null, 2));
        console.log(`📄 JSON测试结果已保存: ${jsonReportPath}`);

    } catch (error) {
        console.error('❌ 测试执行出错:', error);
        testResults.errors.push({
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack
        });
    } finally {
        await browser.close();
        console.log('\n🏁 测试完成');
    }

    return testResults;
}

// 执行测试
if (require.main === module) {
    runFixVerificationTest()
        .then(results => {
            console.log('\n✅ 修复验证测试执行完成');
            if (results.summary.failed > 0) {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ 测试执行失败:', error);
            process.exit(1);
        });
}

module.exports = { runFixVerificationTest };
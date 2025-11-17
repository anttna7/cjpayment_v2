/**
 * UI一致性测试脚本
 * 验证所有页面的表格样式和导出功能是否一致
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// 测试配置
const baseUrl = 'http://localhost:8091';
const testPages = [
    { name: '财务审核', path: '/audit', tableSelector: '#auditOrdersTable', exportButtonSelector: '#exportAuditTableBtn' },
    { name: '账户管理-付款账户', path: '/accounts', tabSelector: '#paymentAccountsTab', tableSelector: '#paymentAccountsTable', exportButtonSelector: '#exportPaymentAccountsBtn' },
    { name: '账户管理-收款账户', path: '/accounts', tabSelector: '#receivingAccountsTab', tableSelector: '#receivingAccountsTable', exportButtonSelector: '#exportReceivingAccountsBtn' },
    { name: '数据报表', path: '/reports', tableSelector: '#advancedDataTable', exportButtonSelector: '#exportAdvancedTableBtn' }
];

async function testPageConsistency() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    const testResults = [];
    
    try {
        console.log('🚀 开始UI一致性测试...\n');
        
        for (const testPage of testPages) {
            console.log(`📊 测试页面: ${testPage.name}`);
            
            // 访问页面
            await page.goto(`${baseUrl}${testPage.path}`, { waitUntil: 'networkidle0' });
            await page.waitForTimeout(2000);
            
            // 如果有标签页需要切换
            if (testPage.tabSelector) {
                await page.click(testPage.tabSelector);
                await page.waitForTimeout(1000);
            }
            
            const result = {
                pageName: testPage.name,
                path: testPage.path,
                tests: {}
            };
            
            // 测试1: 检查统一表格CSS是否加载
            result.tests.unifiedCSSLoaded = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('link[href*="table-unified.css"]'));
                return links.length > 0;
            });
            
            // 测试2: 检查表格结构
            result.tests.tableExists = await page.$(testPage.tableSelector) !== null;
            
            if (result.tests.tableExists) {
                // 测试3: 检查表格包装器类
                result.tests.hasUnifiedWrapper = await page.evaluate((selector) => {
                    const table = document.querySelector(selector);
                    const wrapper = table?.closest('.unified-table-wrapper');
                    return wrapper !== null;
                }, testPage.tableSelector);
                
                // 测试4: 检查表头统一样式
                result.tests.hasUnifiedHeaders = await page.evaluate((selector) => {
                    const table = document.querySelector(selector);
                    const headers = table?.querySelectorAll('th.unified-table-header, .unified-table-header th');
                    return headers && headers.length > 0;
                }, testPage.tableSelector);
                
                // 测试5: 检查固定列
                result.tests.hasFixedColumns = await page.evaluate((selector) => {
                    const table = document.querySelector(selector);
                    const fixedCols = table?.querySelectorAll('.col-fixed-left, .col-fixed-right');
                    return fixedCols && fixedCols.length > 0;
                }, testPage.tableSelector);
                
                // 测试6: 检查内容交互样式
                result.tests.hasInteractiveContent = await page.evaluate((selector) => {
                    const table = document.querySelector(selector);
                    const interactiveCells = table?.querySelectorAll('.copyable-cell, .expandable-cell');
                    return interactiveCells && interactiveCells.length > 0;
                }, testPage.tableSelector);
            }
            
            // 测试7: 检查导出按钮
            if (testPage.exportButtonSelector) {
                result.tests.exportButtonExists = await page.$(testPage.exportButtonSelector) !== null;
                
                if (result.tests.exportButtonExists) {
                    // 测试8: 检查导出按钮样式
                    result.tests.exportButtonStyled = await page.evaluate((selector) => {
                        const btn = document.querySelector(selector);
                        const styles = window.getComputedStyle(btn);
                        return styles.backgroundColor.includes('34, 197, 94') || styles.backgroundColor.includes('rgb(34, 197, 94)');
                    }, testPage.exportButtonSelector);
                    
                    // 测试9: 点击导出按钮测试
                    try {
                        await page.click(testPage.exportButtonSelector);
                        await page.waitForTimeout(500);
                        
                        // 检查模态框是否出现
                        const modalExists = await page.$('.modal-enhanced[style*="flex"], .modal-enhanced.show') !== null;
                        result.tests.exportModalWorks = modalExists;
                        
                        // 关闭模态框
                        if (modalExists) {
                            await page.keyboard.press('Escape');
                        }
                    } catch (error) {
                        result.tests.exportModalWorks = false;
                        result.tests.exportError = error.message;
                    }
                }
            }
            
            testResults.push(result);
            console.log(`✅ ${testPage.name} 测试完成\n`);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
    
    await browser.close();
    return testResults;
}

async function generateTestReport(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/Users/c/Desktop/labs/cjpay/cjpayment/UI_CONSISTENCY_TEST_REPORT_${timestamp}.md`;
    
    let report = `# UI一致性测试报告\n\n`;
    report += `**测试时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
    report += `**测试目的**: 验证财务审核、账户管理、数据报表页面的表格样式和导出功能一致性\n\n`;
    
    // 统计
    let totalTests = 0;
    let passedTests = 0;
    
    results.forEach(result => {
        report += `## ${result.pageName}\n\n`;
        report += `**页面路径**: ${result.path}\n\n`;
        report += `### 测试结果\n\n`;
        
        Object.entries(result.tests).forEach(([testName, passed]) => {
            totalTests++;
            if (passed === true) passedTests++;
            
            const status = passed === true ? '✅ 通过' : '❌ 失败';
            const testNameCN = {
                'unifiedCSSLoaded': '统一表格CSS加载',
                'tableExists': '表格存在',
                'hasUnifiedWrapper': '统一表格包装器',
                'hasUnifiedHeaders': '统一表头样式',
                'hasFixedColumns': '固定列功能',
                'hasInteractiveContent': '内容交互功能',
                'exportButtonExists': '导出按钮存在',
                'exportButtonStyled': '导出按钮样式一致',
                'exportModalWorks': '导出模态框功能'
            }[testName] || testName;
            
            report += `- **${testNameCN}**: ${status}\n`;
            
            if (passed !== true && typeof passed === 'string') {
                report += `  - 错误信息: ${passed}\n`;
            }
        });
        
        report += `\n`;
    });
    
    // 总结
    report += `## 测试总结\n\n`;
    report += `- **总测试项**: ${totalTests}\n`;
    report += `- **通过数量**: ${passedTests}\n`;
    report += `- **通过率**: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;
    
    if (passedTests === totalTests) {
        report += `🎉 **所有测试通过！UI一致性达标。**\n`;
    } else {
        report += `⚠️ **存在${totalTests - passedTests}个测试项未通过，需要进一步优化。**\n`;
    }
    
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`📋 测试报告已生成: ${reportPath}`);
    
    return reportPath;
}

// 执行测试
async function runTest() {
    try {
        const results = await testPageConsistency();
        await generateTestReport(results);
        
        // 打印简要结果
        console.log('\n📊 测试结果概览:');
        results.forEach(result => {
            const passed = Object.values(result.tests).filter(v => v === true).length;
            const total = Object.keys(result.tests).length;
            console.log(`  ${result.pageName}: ${passed}/${total} 通过`);
        });
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
    }
}

// 检查是否有puppeteer
if (typeof require !== 'undefined') {
    try {
        require('puppeteer');
        runTest();
    } catch (e) {
        console.log('❌ 需要安装 puppeteer: npm install puppeteer');
        console.log('🔄 改用基础HTML文件检查...\n');
        
        // 基础文件检查
        console.log('📁 检查文件存在性:');
        const files = [
            'web/static/css/table-unified.css',
            'web/static/js/account-export.js', 
            'web/static/js/report-advanced-export.js',
            'web/templates/financial_audit.html',
            'web/templates/account_management.html',
            'web/templates/report.html'
        ];
        
        files.forEach(file => {
            const exists = require('fs').existsSync(file);
            console.log(`  ${exists ? '✅' : '❌'} ${file}`);
        });
    }
}
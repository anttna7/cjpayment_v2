const { chromium } = require('playwright');
const fs = require('fs');

/**
 * 收款账户表头颜色一致性测试
 * 验证表格各列表头背景色是否统一，特别关注操作列
 */
async function testTableHeaderColorConsistency() {
    console.log('启动收款账户表头颜色一致性测试...\n');
    
    let browser = null;
    let page = null;
    
    try {
        // 启动浏览器
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 1000 // 减慢操作以便观察
        });
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        page = await context.newPage();
        console.log('浏览器已启动，页面尺寸: 1920x1080');
        
        // 导航到收款账户页面
        console.log('正在访问收款账户页面...');
        await page.goto('http://127.0.0.1:8091/accounts', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // 等待页面加载完成
        console.log('等待页面加载完成...');
        await page.waitForTimeout(3000);
        
        const testResults = {
            timestamp: new Date().toISOString(),
            url: 'http://127.0.0.1:8091/accounts',
            tests: {},
            screenshots: [],
            errors: []
        };
        
        // 测试1: 检查收款账户tab是否默认激活
        console.log('测试1: 检查收款账户tab是否默认激活');
        try {
            const activeTab = await page.locator('.tab-item.active').first();
            const activeTabText = await activeTab.textContent();
            const isPaymentTabActive = activeTabText.includes('收款账户');
            
            testResults.tests.activeTab = {
                passed: isPaymentTabActive,
                tabText: activeTabText,
                expected: '收款账户tab应该默认激活'
            };
            
            console.log(`   结果: ${isPaymentTabActive ? '✓' : '✗'} 活动tab: "${activeTabText}"`);
        } catch (error) {
            testResults.errors.push(`测试1失败: ${error.message}`);
            console.log('   结果: ✗ 无法找到活动tab');
        }
        
        // 等待表格加载
        console.log('\n等待收款账户表格加载...');
        await page.waitForSelector('.enhanced-table', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // 测试2: 检查表格列数结构
        console.log('测试2: 检查表格是否正确显示10列结构');
        try {
            const headerCells = await page.locator('.enhanced-table thead th').all();
            const columnCount = headerCells.length;
            
            // 获取每列的表头文本
            const columnTexts = [];
            for (let cell of headerCells) {
                const text = await cell.textContent();
                columnTexts.push(text.trim());
            }
            
            testResults.tests.tableStructure = {
                passed: columnCount === 10,
                actualColumns: columnCount,
                expectedColumns: 10,
                columnHeaders: columnTexts
            };
            
            console.log(`   结果: ${columnCount === 10 ? '✓' : '✗'} 实际列数: ${columnCount}, 期望列数: 10`);
            console.log(`   列标题: ${columnTexts.join(', ')}`);
        } catch (error) {
            testResults.errors.push(`测试2失败: ${error.message}`);
            console.log('   结果: ✗ 无法检测表格结构');
        }
        
        // 测试3: 检查所有表头的背景色是否一致
        console.log('\n测试3: 检查所有表头背景色一致性');
        try {
            const headerCells = await page.locator('.enhanced-table thead th').all();
            const headerStyles = [];
            
            for (let i = 0; i < headerCells.length; i++) {
                const cell = headerCells[i];
                const computedStyle = await cell.evaluate(el => {
                    const styles = window.getComputedStyle(el);
                    return {
                        backgroundColor: styles.backgroundColor,
                        color: styles.color,
                        borderColor: styles.borderColor,
                        fontSize: styles.fontSize,
                        fontWeight: styles.fontWeight,
                        textAlign: styles.textAlign,
                        padding: styles.padding
                    };
                });
                
                const text = await cell.textContent();
                headerStyles.push({
                    column: i + 1,
                    text: text.trim(),
                    styles: computedStyle
                });
            }
            
            // 检查背景色一致性
            const backgroundColors = headerStyles.map(h => h.styles.backgroundColor);
            const uniqueBackgroundColors = [...new Set(backgroundColors)];
            const isBackgroundColorConsistent = uniqueBackgroundColors.length === 1;
            
            // 特别关注第1列(序号)和第10列(操作)
            const firstColumnBg = headerStyles[0]?.styles.backgroundColor;
            const lastColumnBg = headerStyles[headerStyles.length - 1]?.styles.backgroundColor;
            const isFirstLastConsistent = firstColumnBg === lastColumnBg;
            
            testResults.tests.headerColorConsistency = {
                passed: isBackgroundColorConsistent && isFirstLastConsistent,
                totalColumns: headerStyles.length,
                uniqueBackgroundColors: uniqueBackgroundColors,
                firstColumnBackground: firstColumnBg,
                lastColumnBackground: lastColumnBg,
                isConsistent: isBackgroundColorConsistent,
                headerDetails: headerStyles
            };
            
            console.log(`   结果: ${isBackgroundColorConsistent ? '✓' : '✗'} 背景色一致性`);
            console.log(`   唯一背景色数量: ${uniqueBackgroundColors.length}`);
            console.log(`   背景色值: ${uniqueBackgroundColors.join(', ')}`);
            console.log(`   第1列(序号)背景色: ${firstColumnBg}`);
            console.log(`   第10列(操作)背景色: ${lastColumnBg}`);
            console.log(`   第1列与第10列是否一致: ${isFirstLastConsistent ? '✓' : '✗'}`);
            
            // 显示每列详细信息
            console.log('\n   各列详细样式信息:');
            headerStyles.forEach(header => {
                console.log(`   第${header.column}列 [${header.text}]: 背景色=${header.styles.backgroundColor}, 文字色=${header.styles.color}`);
            });
            
        } catch (error) {
            testResults.errors.push(`测试3失败: ${error.message}`);
            console.log('   结果: ✗ 无法检测表头颜色');
        }
        
        // 测试4: 检查固定列样式
        console.log('\n测试4: 检查固定列样式是否正确应用');
        try {
            const fixedColumns = await page.locator('.enhanced-table thead th.fixed-column').all();
            const fixedColumnInfo = [];
            
            for (let cell of fixedColumns) {
                const text = await cell.textContent();
                const computedStyle = await cell.evaluate(el => {
                    const styles = window.getComputedStyle(el);
                    return {
                        position: styles.position,
                        zIndex: styles.zIndex,
                        left: styles.left,
                        right: styles.right,
                        backgroundColor: styles.backgroundColor,
                        borderRight: styles.borderRight
                    };
                });
                
                fixedColumnInfo.push({
                    text: text.trim(),
                    styles: computedStyle
                });
            }
            
            testResults.tests.fixedColumnStyles = {
                passed: fixedColumns.length > 0,
                fixedColumnCount: fixedColumns.length,
                fixedColumnDetails: fixedColumnInfo
            };
            
            console.log(`   结果: ${fixedColumns.length > 0 ? '✓' : '✗'} 固定列数量: ${fixedColumns.length}`);
            fixedColumnInfo.forEach((col, index) => {
                console.log(`   固定列${index + 1} [${col.text}]: position=${col.styles.position}, zIndex=${col.styles.zIndex}`);
            });
            
        } catch (error) {
            testResults.errors.push(`测试4失败: ${error.message}`);
            console.log('   结果: ✗ 无法检测固定列样式');
        }
        
        // 生成对比截图
        console.log('\n生成验证截图...');
        try {
            await page.screenshot({
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-fix-verification.png',
                fullPage: true,
                animations: 'disabled'
            });
            
            testResults.screenshots.push('table-header-fix-verification.png');
            console.log('   截图已保存: table-header-fix-verification.png');
        } catch (error) {
            testResults.errors.push(`截图失败: ${error.message}`);
            console.log('   截图保存失败');
        }
        
        // 生成测试报告
        const reportContent = generateTestReport(testResults);
        
        // 保存测试报告
        const reportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-color-test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        
        const mdReportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/TABLE_HEADER_COLOR_TEST_REPORT.md';
        fs.writeFileSync(mdReportPath, reportContent);
        
        console.log('\n测试完成！');
        console.log(`详细报告已保存: ${mdReportPath}`);
        console.log(`JSON数据已保存: ${reportPath}`);
        
        // 输出测试摘要
        const totalTests = Object.keys(testResults.tests).length;
        const passedTests = Object.values(testResults.tests).filter(test => test.passed).length;
        
        console.log('\n=== 测试摘要 ===');
        console.log(`总测试项: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${totalTests - passedTests}`);
        console.log(`错误数量: ${testResults.errors.length}`);
        
        return testResults;
        
    } catch (error) {
        console.error('测试执行失败:', error.message);
        throw error;
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

/**
 * 生成测试报告内容
 */
function generateTestReport(results) {
    const timestamp = new Date().toLocaleString('zh-CN');
    
    let report = `# 收款账户表头颜色一致性测试报告

## 测试概览
- 测试时间: ${timestamp}
- 测试页面: ${results.url}
- 测试项目: 表头颜色一致性验证

## 测试结果详情

`;

    // 测试1: 收款账户tab激活状态
    const activeTabTest = results.tests.activeTab;
    if (activeTabTest) {
        report += `### 1. 收款账户Tab激活检查
- 状态: ${activeTabTest.passed ? '✅ 通过' : '❌ 失败'}
- 当前活动Tab: ${activeTabTest.tabText}
- 预期: ${activeTabTest.expected}

`;
    }

    // 测试2: 表格结构检查
    const tableStructureTest = results.tests.tableStructure;
    if (tableStructureTest) {
        report += `### 2. 表格结构检查
- 状态: ${tableStructureTest.passed ? '✅ 通过' : '❌ 失败'}
- 实际列数: ${tableStructureTest.actualColumns}
- 期望列数: ${tableStructureTest.expectedColumns}
- 列标题: ${tableStructureTest.columnHeaders.join(', ')}

`;
    }

    // 测试3: 表头颜色一致性
    const colorTest = results.tests.headerColorConsistency;
    if (colorTest) {
        report += `### 3. 表头颜色一致性检查
- 状态: ${colorTest.passed ? '✅ 通过' : '❌ 失败'}
- 总列数: ${colorTest.totalColumns}
- 唯一背景色数量: ${colorTest.uniqueBackgroundColors.length}
- 背景色值: ${colorTest.uniqueBackgroundColors.join(', ')}
- 第1列(序号)背景色: ${colorTest.firstColumnBackground}
- 第10列(操作)背景色: ${colorTest.lastColumnBackground}

#### 各列详细样式信息:
`;
        
        if (colorTest.headerDetails) {
            colorTest.headerDetails.forEach(header => {
                report += `- 第${header.column}列 [${header.text}]: 背景色=${header.styles.backgroundColor}, 文字色=${header.styles.color}\n`;
            });
        }
        report += '\n';
    }

    // 测试4: 固定列样式
    const fixedColumnTest = results.tests.fixedColumnStyles;
    if (fixedColumnTest) {
        report += `### 4. 固定列样式检查
- 状态: ${fixedColumnTest.passed ? '✅ 通过' : '❌ 失败'}
- 固定列数量: ${fixedColumnTest.fixedColumnCount}

`;
        
        if (fixedColumnTest.fixedColumnDetails) {
            report += '#### 固定列详细信息:\n';
            fixedColumnTest.fixedColumnDetails.forEach((col, index) => {
                report += `- 固定列${index + 1} [${col.text}]: position=${col.styles.position}, zIndex=${col.styles.zIndex}\n`;
            });
            report += '\n';
        }
    }

    // 错误信息
    if (results.errors && results.errors.length > 0) {
        report += `## 错误信息
`;
        results.errors.forEach(error => {
            report += `- ${error}\n`;
        });
        report += '\n';
    }

    // 截图信息
    if (results.screenshots && results.screenshots.length > 0) {
        report += `## 截图文件
`;
        results.screenshots.forEach(screenshot => {
            report += `- ${screenshot}\n`;
        });
        report += '\n';
    }

    // 测试摘要
    const totalTests = Object.keys(results.tests).length;
    const passedTests = Object.values(results.tests).filter(test => test.passed).length;
    
    report += `## 测试摘要
- 总测试项: ${totalTests}
- 通过测试: ${passedTests}
- 失败测试: ${totalTests - passedTests}
- 错误数量: ${results.errors.length}
- 总体状态: ${passedTests === totalTests && results.errors.length === 0 ? '✅ 全部通过' : '❌ 存在问题'}

---
*报告生成时间: ${timestamp}*
`;

    return report;
}

// 运行测试
if (require.main === module) {
    testTableHeaderColorConsistency().catch(console.error);
}

module.exports = { testTableHeaderColorConsistency };
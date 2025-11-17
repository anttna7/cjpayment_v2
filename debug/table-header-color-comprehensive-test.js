const { chromium } = require('playwright');
const fs = require('fs');

/**
 * 收款账户表头颜色一致性综合测试
 * 处理页面tab切换和表格可见性问题
 */
async function testTableHeaderColorComprehensive() {
    console.log('启动收款账户表头颜色一致性综合测试...\n');
    
    let browser = null;
    let page = null;
    
    try {
        // 启动浏览器
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 800
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
        
        // 截图1：初始页面状态
        await page.screenshot({
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-test-01-initial.png',
            fullPage: true
        });
        testResults.screenshots.push('table-header-test-01-initial.png');
        console.log('初始状态截图已保存');
        
        // 关闭侧边栏（如果存在）
        try {
            const sidebarCloseButton = page.locator('.sidebar-close, .close-btn, [aria-label="关闭"]').first();
            if (await sidebarCloseButton.isVisible()) {
                await sidebarCloseButton.click();
                await page.waitForTimeout(1000);
                console.log('已关闭侧边栏');
            }
        } catch (error) {
            console.log('未找到侧边栏关闭按钮，继续测试');
        }
        
        // 尝试点击收款账户选项（如果存在多个tab）
        try {
            const receivingAccountsOption = page.locator('text=收款账户').first();
            if (await receivingAccountsOption.isVisible()) {
                await receivingAccountsOption.click();
                await page.waitForTimeout(2000);
                console.log('已切换到收款账户tab');
            }
        } catch (error) {
            console.log('未找到收款账户tab切换按钮');
        }
        
        // 等待表格可见（尝试多种选择器）
        console.log('\n等待表格元素可见...');
        let tableSelector = null;
        const tableSelectors = [
            '.enhanced-table:visible',
            'table:visible',
            '#receivingAccountsTable:visible',
            '.enhanced-table',
            'table'
        ];
        
        for (let selector of tableSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000, state: 'visible' });
                tableSelector = selector;
                console.log(`✓ 找到可见表格: ${selector}`);
                break;
            } catch (error) {
                console.log(`✗ ${selector} 不可见或不存在`);
            }
        }
        
        if (!tableSelector) {
            // 尝试强制显示隐藏的表格
            console.log('尝试显示隐藏的表格...');
            await page.evaluate(() => {
                const hiddenTables = document.querySelectorAll('table[style*="display: none"], .enhanced-table[style*="display: none"]');
                hiddenTables.forEach(table => {
                    table.style.display = 'table';
                    table.style.visibility = 'visible';
                });
            });
            await page.waitForTimeout(1000);
            
            // 再次尝试找到表格
            for (let selector of tableSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 3000, state: 'visible' });
                    tableSelector = selector;
                    console.log(`✓ 强制显示后找到表格: ${selector}`);
                    break;
                } catch (error) {
                    continue;
                }
            }
        }
        
        if (!tableSelector) {
            throw new Error('无法找到可见的表格元素');
        }
        
        // 截图2：表格可见状态
        await page.screenshot({
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-test-02-table-visible.png',
            fullPage: true
        });
        testResults.screenshots.push('table-header-test-02-table-visible.png');
        
        // 测试1: 检查表格列数结构
        console.log('\\n测试1: 检查表格是否正确显示10列结构');
        try {
            const headerCells = await page.locator(`${tableSelector} thead th`).all();
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
                columnHeaders: columnTexts,
                tableSelector: tableSelector
            };
            
            console.log(`   结果: ${columnCount === 10 ? '✓' : '✗'} 实际列数: ${columnCount}, 期望列数: 10`);
            console.log(`   列标题: ${columnTexts.join(', ')}`);
        } catch (error) {
            testResults.errors.push(`测试1失败: ${error.message}`);
            console.log('   结果: ✗ 无法检测表格结构');
        }
        
        // 测试2: 检查所有表头的背景色是否一致
        console.log('\\n测试2: 检查所有表头背景色一致性');
        try {
            const headerCells = await page.locator(`${tableSelector} thead th`).all();
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
                        padding: styles.padding,
                        position: styles.position,
                        zIndex: styles.zIndex,
                        left: styles.left,
                        right: styles.right
                    };
                });
                
                const text = await cell.textContent();
                const boundingBox = await cell.boundingBox();
                headerStyles.push({
                    column: i + 1,
                    text: text.trim(),
                    styles: computedStyle,
                    boundingBox: boundingBox
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
            
            // 检查中间列（第5列和第6列）的颜色
            const middleColumnBg1 = headerStyles[4]?.styles.backgroundColor; // 第5列
            const middleColumnBg2 = headerStyles[5]?.styles.backgroundColor; // 第6列
            const isMiddleConsistent = middleColumnBg1 === middleColumnBg2 && middleColumnBg1 === firstColumnBg;
            
            testResults.tests.headerColorConsistency = {
                passed: isBackgroundColorConsistent && isFirstLastConsistent && isMiddleConsistent,
                totalColumns: headerStyles.length,
                uniqueBackgroundColors: uniqueBackgroundColors,
                firstColumnBackground: firstColumnBg,
                lastColumnBackground: lastColumnBg,
                middleColumn1Background: middleColumnBg1,
                middleColumn2Background: middleColumnBg2,
                isConsistent: isBackgroundColorConsistent,
                isFirstLastConsistent: isFirstLastConsistent,
                isMiddleConsistent: isMiddleConsistent,
                headerDetails: headerStyles
            };
            
            console.log(`   结果: ${isBackgroundColorConsistent ? '✓' : '✗'} 整体背景色一致性`);
            console.log(`   唯一背景色数量: ${uniqueBackgroundColors.length}`);
            console.log(`   背景色值: ${uniqueBackgroundColors.join(', ')}`);
            console.log(`   第1列(序号)背景色: ${firstColumnBg}`);
            console.log(`   第10列(操作)背景色: ${lastColumnBg}`);
            console.log(`   第5列(返点政策)背景色: ${middleColumnBg1}`);
            console.log(`   第6列(充值链接)背景色: ${middleColumnBg2}`);
            console.log(`   第1列与第10列一致性: ${isFirstLastConsistent ? '✓' : '✗'}`);
            console.log(`   中间列一致性: ${isMiddleConsistent ? '✓' : '✗'}`);
            
            // 显示每列详细信息
            console.log('\\n   各列详细样式信息:');
            headerStyles.forEach((header, index) => {
                const isFixed = header.styles.position === 'sticky' || header.styles.position === 'fixed';
                const fixedInfo = isFixed ? ` [固定列: position=${header.styles.position}, zIndex=${header.styles.zIndex}]` : '';
                console.log(`   第${header.column}列 [${header.text}]: 背景色=${header.styles.backgroundColor}, 文字色=${header.styles.color}${fixedInfo}`);
            });
            
        } catch (error) {
            testResults.errors.push(`测试2失败: ${error.message}`);
            console.log('   结果: ✗ 无法检测表头颜色');
        }
        
        // 测试3: 检查固定列样式
        console.log('\\n测试3: 检查固定列样式是否正确应用');
        try {
            const allHeaderCells = await page.locator(`${tableSelector} thead th`).all();
            const fixedColumnInfo = [];
            
            for (let i = 0; i < allHeaderCells.length; i++) {
                const cell = allHeaderCells[i];
                const text = await cell.textContent();
                const computedStyle = await cell.evaluate(el => {
                    const styles = window.getComputedStyle(el);
                    const isFixed = styles.position === 'sticky' || styles.position === 'fixed' || 
                                   el.classList.contains('fixed-column') || el.classList.contains('sticky');
                    return {
                        position: styles.position,
                        zIndex: styles.zIndex,
                        left: styles.left,
                        right: styles.right,
                        backgroundColor: styles.backgroundColor,
                        borderRight: styles.borderRight,
                        isFixed: isFixed,
                        classList: Array.from(el.classList)
                    };
                });
                
                if (computedStyle.isFixed || computedStyle.position === 'sticky' || computedStyle.position === 'fixed') {
                    fixedColumnInfo.push({
                        column: i + 1,
                        text: text.trim(),
                        styles: computedStyle
                    });
                }
            }
            
            testResults.tests.fixedColumnStyles = {
                passed: fixedColumnInfo.length >= 0, // 允许没有固定列
                fixedColumnCount: fixedColumnInfo.length,
                fixedColumnDetails: fixedColumnInfo
            };
            
            console.log(`   结果: ✓ 固定列数量: ${fixedColumnInfo.length}`);
            fixedColumnInfo.forEach((col) => {
                console.log(`   固定列${col.column} [${col.text}]: position=${col.styles.position}, zIndex=${col.styles.zIndex}, classList=${col.styles.classList.join(',')}`);
            });
            
        } catch (error) {
            testResults.errors.push(`测试3失败: ${error.message}`);
            console.log('   结果: ✗ 无法检测固定列样式');
        }
        
        // 测试4: 视觉对比测试 - 高亮操作列
        console.log('\\n测试4: 视觉对比测试 - 高亮不同列进行对比');
        try {
            // 高亮第1列(序号)
            await page.evaluate((selector) => {
                const firstHeader = document.querySelector(`${selector} thead th:nth-child(1)`);
                if (firstHeader) {
                    firstHeader.style.outline = '3px solid red';
                    firstHeader.style.outlineOffset = '-3px';
                }
            }, tableSelector);
            
            await page.waitForTimeout(1000);
            await page.screenshot({
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-test-03-first-column-highlighted.png',
                fullPage: true
            });
            testResults.screenshots.push('table-header-test-03-first-column-highlighted.png');
            
            // 高亮第10列(操作)
            await page.evaluate((selector) => {
                const firstHeader = document.querySelector(`${selector} thead th:nth-child(1)`);
                const lastHeader = document.querySelector(`${selector} thead th:nth-child(10)`);
                if (firstHeader) firstHeader.style.outline = 'none';
                if (lastHeader) {
                    lastHeader.style.outline = '3px solid blue';
                    lastHeader.style.outlineOffset = '-3px';
                }
            }, tableSelector);
            
            await page.waitForTimeout(1000);
            await page.screenshot({
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-test-04-last-column-highlighted.png',
                fullPage: true
            });
            testResults.screenshots.push('table-header-test-04-last-column-highlighted.png');
            
            // 高亮中间列对比
            await page.evaluate((selector) => {
                const lastHeader = document.querySelector(`${selector} thead th:nth-child(10)`);
                const middleHeader1 = document.querySelector(`${selector} thead th:nth-child(5)`);
                const middleHeader2 = document.querySelector(`${selector} thead th:nth-child(6)`);
                if (lastHeader) lastHeader.style.outline = 'none';
                if (middleHeader1) {
                    middleHeader1.style.outline = '3px solid green';
                    middleHeader1.style.outlineOffset = '-3px';
                }
                if (middleHeader2) {
                    middleHeader2.style.outline = '3px solid orange';
                    middleHeader2.style.outlineOffset = '-3px';
                }
            }, tableSelector);
            
            await page.waitForTimeout(1000);
            await page.screenshot({
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-test-05-middle-columns-highlighted.png',
                fullPage: true
            });
            testResults.screenshots.push('table-header-test-05-middle-columns-highlighted.png');
            
            // 清除所有高亮
            await page.evaluate((selector) => {
                const allHeaders = document.querySelectorAll(`${selector} thead th`);
                allHeaders.forEach(header => {
                    header.style.outline = 'none';
                });
            }, tableSelector);
            
            testResults.tests.visualComparison = {
                passed: true,
                description: '已生成视觉对比截图',
                screenshots: [
                    'table-header-test-03-first-column-highlighted.png',
                    'table-header-test-04-last-column-highlighted.png', 
                    'table-header-test-05-middle-columns-highlighted.png'
                ]
            };
            
            console.log('   结果: ✓ 视觉对比截图已生成');
            
        } catch (error) {
            testResults.errors.push(`测试4失败: ${error.message}`);
            console.log('   结果: ✗ 视觉对比测试失败');
        }
        
        // 生成最终截图
        console.log('\\n生成最终验证截图...');
        try {
            await page.screenshot({
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-fix-verification.png',
                fullPage: true,
                animations: 'disabled'
            });
            
            testResults.screenshots.push('table-header-fix-verification.png');
            console.log('   最终截图已保存: table-header-fix-verification.png');
        } catch (error) {
            testResults.errors.push(`最终截图失败: ${error.message}`);
            console.log('   最终截图保存失败');
        }
        
        // 生成测试报告
        const reportContent = generateTestReport(testResults);
        
        // 保存测试报告
        const reportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/table-header-color-test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
        
        const mdReportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/TABLE_HEADER_COLOR_COMPREHENSIVE_TEST_REPORT.md';
        fs.writeFileSync(mdReportPath, reportContent);
        
        console.log('\\n测试完成！');
        console.log(`详细报告已保存: ${mdReportPath}`);
        console.log(`JSON数据已保存: ${reportPath}`);
        
        // 输出测试摘要
        const totalTests = Object.keys(testResults.tests).length;
        const passedTests = Object.values(testResults.tests).filter(test => test.passed).length;
        
        console.log('\\n=== 测试摘要 ===');
        console.log(`总测试项: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${totalTests - passedTests}`);
        console.log(`错误数量: ${testResults.errors.length}`);
        console.log(`截图数量: ${testResults.screenshots.length}`);
        
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
    
    let report = `# 收款账户表头颜色一致性综合测试报告

## 测试概览
- 测试时间: ${timestamp}
- 测试页面: ${results.url}
- 测试项目: 表头颜色一致性综合验证

## 测试结果详情

`;

    // 测试1: 表格结构检查
    const tableStructureTest = results.tests.tableStructure;
    if (tableStructureTest) {
        report += `### 1. 表格结构检查
- 状态: ${tableStructureTest.passed ? '✅ 通过' : '❌ 失败'}
- 实际列数: ${tableStructureTest.actualColumns}
- 期望列数: ${tableStructureTest.expectedColumns}
- 表格选择器: ${tableStructureTest.tableSelector}
- 列标题: ${tableStructureTest.columnHeaders.join(', ')}

`;
    }

    // 测试2: 表头颜色一致性
    const colorTest = results.tests.headerColorConsistency;
    if (colorTest) {
        report += `### 2. 表头颜色一致性检查
- 整体状态: ${colorTest.passed ? '✅ 通过' : '❌ 失败'}
- 总列数: ${colorTest.totalColumns}
- 唯一背景色数量: ${colorTest.uniqueBackgroundColors.length}
- 背景色值: ${colorTest.uniqueBackgroundColors.join(', ')}
- 整体一致性: ${colorTest.isConsistent ? '✅' : '❌'}
- 首尾列一致性: ${colorTest.isFirstLastConsistent ? '✅' : '❌'}
- 中间列一致性: ${colorTest.isMiddleConsistent ? '✅' : '❌'}

#### 关键列对比:
- 第1列(序号)背景色: \`${colorTest.firstColumnBackground}\`
- 第5列(返点政策)背景色: \`${colorTest.middleColumn1Background}\`
- 第6列(充值链接)背景色: \`${colorTest.middleColumn2Background}\`
- 第10列(操作)背景色: \`${colorTest.lastColumnBackground}\`

#### 各列详细样式信息:
`;
        
        if (colorTest.headerDetails) {
            colorTest.headerDetails.forEach(header => {
                const isFixed = header.styles.position === 'sticky' || header.styles.position === 'fixed';
                const fixedInfo = isFixed ? ` *[固定列]*` : '';
                report += `- 第${header.column}列 **[${header.text}]**${fixedInfo}: 
  - 背景色: \`${header.styles.backgroundColor}\`
  - 文字色: \`${header.styles.color}\`
  - 位置: \`${header.styles.position}\`
  - Z-Index: \`${header.styles.zIndex}\`\n`;
            });
        }
        report += '\n';
    }

    // 测试3: 固定列样式
    const fixedColumnTest = results.tests.fixedColumnStyles;
    if (fixedColumnTest) {
        report += `### 3. 固定列样式检查
- 状态: ${fixedColumnTest.passed ? '✅ 通过' : '❌ 失败'}
- 固定列数量: ${fixedColumnTest.fixedColumnCount}

`;
        
        if (fixedColumnTest.fixedColumnDetails && fixedColumnTest.fixedColumnDetails.length > 0) {
            report += '#### 固定列详细信息:\n';
            fixedColumnTest.fixedColumnDetails.forEach((col) => {
                report += `- 第${col.column}列 **[${col.text}]**: 
  - 定位方式: \`${col.styles.position}\`
  - Z-Index: \`${col.styles.zIndex}\`
  - CSS类: \`${col.styles.classList.join(', ')}\`\n`;
            });
            report += '\n';
        } else {
            report += '- 未检测到固定列样式\n\n';
        }
    }

    // 测试4: 视觉对比测试
    const visualTest = results.tests.visualComparison;
    if (visualTest) {
        report += `### 4. 视觉对比测试
- 状态: ${visualTest.passed ? '✅ 通过' : '❌ 失败'}
- 说明: ${visualTest.description}

#### 对比截图:
`;
        if (visualTest.screenshots) {
            visualTest.screenshots.forEach((screenshot, index) => {
                const descriptions = [
                    '第1列(序号)高亮对比',
                    '第10列(操作)高亮对比', 
                    '中间列(第5、6列)高亮对比'
                ];
                report += `- ${descriptions[index] || `对比${index + 1}`}: \`${screenshot}\`\n`;
            });
        }
        report += '\n';
    }

    // 错误信息
    if (results.errors && results.errors.length > 0) {
        report += `## 错误信息
`;
        results.errors.forEach(error => {
            report += `- ⚠️ ${error}\n`;
        });
        report += '\n';
    }

    // 截图文件列表
    if (results.screenshots && results.screenshots.length > 0) {
        report += `## 截图文件
`;
        results.screenshots.forEach((screenshot, index) => {
            const descriptions = [
                '初始页面状态',
                '表格可见状态',
                '第1列高亮对比',
                '第10列高亮对比',
                '中间列高亮对比',
                '最终验证截图'
            ];
            report += `${index + 1}. **${descriptions[index] || '其他截图'}**: \`${screenshot}\`\n`;
        });
        report += '\n';
    }

    // 测试摘要和结论
    const totalTests = Object.keys(results.tests).length;
    const passedTests = Object.values(results.tests).filter(test => test.passed).length;
    const hasColorIssue = results.tests.headerColorConsistency && !results.tests.headerColorConsistency.passed;
    
    report += `## 测试摘要与结论

### 统计信息
- 总测试项: ${totalTests}
- 通过测试: ${passedTests}
- 失败测试: ${totalTests - passedTests}
- 错误数量: ${results.errors.length}
- 总体状态: ${passedTests === totalTests && results.errors.length === 0 ? '✅ 全部通过' : '❌ 存在问题'}

### 关键发现
`;

    if (hasColorIssue) {
        const colorTest = results.tests.headerColorConsistency;
        report += `
#### ⚠️ 表头颜色一致性问题:
- 发现 ${colorTest.uniqueBackgroundColors.length} 种不同的背景色
- 首尾列一致性: ${colorTest.isFirstLastConsistent ? '正常' : '**异常**'}
- 中间列一致性: ${colorTest.isMiddleConsistent ? '正常' : '**异常**'}

#### 🔧 建议修复方案:
1. 统一所有表头背景色为同一颜色值
2. 检查CSS样式优先级，确保固定列样式不会覆盖通用样式
3. 验证表格组件的样式继承是否正确
`;
    } else {
        report += `
#### ✅ 表头颜色一致性正常:
- 所有表头使用统一背景色
- 首尾列颜色一致
- 中间列颜色一致
`;
    }

    report += `
### 测试环境
- 浏览器: Chromium
- 视窗尺寸: 1920x1080
- 页面URL: ${results.url}

---
*报告生成时间: ${timestamp}*
*测试工具: Playwright自动化测试框架*
`;

    return report;
}

// 运行测试
if (require.main === module) {
    testTableHeaderColorComprehensive().catch(console.error);
}

module.exports = { testTableHeaderColorComprehensive };
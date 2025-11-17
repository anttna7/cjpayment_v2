/**
 * 最终MCP修复验证 - 检查JavaScript控制台输出和实际执行情况
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function finalModalFixTest() {
    console.log('🔧 最终MCP验证: 检查修复后的实际执行情况...');
    
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 2000,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 监听控制台输出
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `[${msg.type()}] ${msg.text()}`;
        consoleMessages.push(message);
        console.log('浏览器控制台:', message);
    });
    
    const testResults = {
        timestamp: new Date().toISOString(),
        console_messages: [],
        tests: [],
        final_analysis: {}
    };

    try {
        // 访问报表页面
        console.log('📊 访问报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'debug/final-test-01-loaded.png', fullPage: true });

        // 检查JavaScript对象是否存在
        const jsState = await page.evaluate(() => {
            return {
                orderInfoTable_exists: typeof window.orderInfoTable !== 'undefined',
                advancedDataTable_exists: typeof window.advancedDataTable !== 'undefined',
                elements_count: {
                    backdrop: document.querySelectorAll('#advancedFiltersBackdrop').length,
                    container: document.querySelectorAll('#advancedFiltersContainer').length,
                    filter_tabs: document.querySelectorAll('.filter-tab').length,
                    close_buttons: document.querySelectorAll('#closeAdvancedFilters').length
                }
            };
        });
        
        testResults.final_analysis.js_state = jsState;
        console.log('JavaScript状态:', JSON.stringify(jsState, null, 2));

        // 测试1: 打开模态框并检查控制台输出
        console.log('🎯 测试1: 打开高级筛选模态框...');
        const filterButton = page.locator('#advancedFiltersToggle');
        await filterButton.waitFor({ state: 'visible', timeout: 5000 });
        
        await filterButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug/final-test-02-modal-opened.png', fullPage: true });

        // 检查模态框状态
        const modalState = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            return {
                backdrop: backdrop ? {
                    visible: backdrop.offsetParent !== null,
                    classes: backdrop.className,
                    style_display: backdrop.style.display,
                    computed_display: getComputedStyle(backdrop).display,
                    computed_position: getComputedStyle(backdrop).position
                } : null,
                container: container ? {
                    visible: container.offsetParent !== null,
                    classes: container.className,
                    computed_display: getComputedStyle(container).display
                } : null
            };
        });
        
        testResults.final_analysis.modal_state = modalState;
        console.log('模态框状态:', JSON.stringify(modalState, null, 2));

        // 测试2: 尝试点击高级条件标签页
        console.log('📑 测试2: 点击高级条件标签页...');
        const advancedTab = page.locator('.filter-tab[data-tab="advanced"]');
        
        if (await advancedTab.count() > 0) {
            console.log('高级条件标签页存在，尝试点击...');
            await advancedTab.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug/final-test-03-advanced-tab.png', fullPage: true });
            
            // 检查标签页激活状态
            const tabState = await advancedTab.evaluate(el => ({
                classes: el.className,
                active: el.classList.contains('active'),
                dataset_tab: el.dataset.tab
            }));
            
            testResults.tests.push({
                name: '高级条件标签页点击',
                status: tabState.active ? 'passed' : 'failed',
                details: JSON.stringify(tabState)
            });
        }

        // 测试3: 尝试关闭模态框
        console.log('❌ 测试3: 尝试关闭模态框...');
        const closeButton = page.locator('#closeAdvancedFilters');
        
        if (await closeButton.count() > 0) {
            console.log('关闭按钮存在，尝试点击...');
            await closeButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug/final-test-04-close-attempt.png', fullPage: true });
            
            // 检查模态框是否关闭
            const isClosed = await page.evaluate(() => {
                const backdrop = document.getElementById('advancedFiltersBackdrop');
                return backdrop ? !backdrop.classList.contains('show') : true;
            });
            
            testResults.tests.push({
                name: '关闭按钮功能',
                status: isClosed ? 'passed' : 'failed',
                details: `模态框${isClosed ? '已关闭' : '未关闭'}`
            });
        }

        // 收集最终控制台消息
        testResults.console_messages = consoleMessages;

    } catch (error) {
        console.error('❌ 测试过程发生错误:', error);
        testResults.error = error.message;
    } finally {
        await browser.close();
        
        // 生成最终报告
        await generateFinalReport(testResults);
        console.log('📋 最终修复验证报告已生成');
    }
}

async function generateFinalReport(results) {
    const passedTests = results.tests.filter(t => t.status === 'passed').length;
    const totalTests = results.tests.length;
    
    const report = `# 最终修复验证报告

## 测试概要
- **执行时间**: ${results.timestamp}
- **通过测试**: ${passedTests}/${totalTests}
- **成功率**: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%

## JavaScript状态检查
\`\`\`json
${JSON.stringify(results.final_analysis.js_state || {}, null, 2)}
\`\`\`

## 模态框状态分析
\`\`\`json
${JSON.stringify(results.final_analysis.modal_state || {}, null, 2)}
\`\`\`

## 测试结果详情
${results.tests.map((test, index) => `
### ${index + 1}. ${test.name}
**状态**: ${test.status === 'passed' ? '✅ 通过' : '❌ 失败'}
**详情**: ${test.details}
`).join('\n')}

## 浏览器控制台输出
${results.console_messages.length > 0 ? results.console_messages.map(msg => `- ${msg}`).join('\n') : '无控制台输出'}

## 关键发现

### CSS状态分析
${results.final_analysis.modal_state ? `
- Backdrop display: ${results.final_analysis.modal_state.backdrop?.computed_display}
- Backdrop position: ${results.final_analysis.modal_state.backdrop?.computed_position}
- Container display: ${results.final_analysis.modal_state.container?.computed_display}
` : '无法获取模态框状态'}

### JavaScript执行状态
- OrderInfoTable实例: ${results.final_analysis.js_state?.orderInfoTable_exists ? '✅' : '❌'}
- AdvancedDataTable实例: ${results.final_analysis.js_state?.advancedDataTable_exists ? '✅' : '❌'}
- DOM元素数量: ${JSON.stringify(results.final_analysis.js_state?.elements_count || {})}

## 修复建议

${passedTests === totalTests ? '🎉 所有测试通过！模态框功能已完全修复。' : `
基于测试结果，仍需要进一步修复：

### 待解决问题
${results.tests.filter(t => t.status === 'failed').map(test => `- ${test.name}: ${test.details}`).join('\n')}

### 技术分析
${results.final_analysis.modal_state?.backdrop?.computed_display === 'none' ? 
    '⚠️ 模态框backdrop未正确显示 (display: none)' : 
    '✅ 模态框backdrop显示正常'}

${results.console_messages.length === 0 ? 
    '⚠️ 无JavaScript控制台输出，可能存在脚本加载问题' : 
    '✅ JavaScript脚本正常执行'}
`}

## 结论
${results.error ? 
    `❌ 测试执行出错: ${results.error}` : 
    (passedTests === totalTests ? 
        '✅ 高级筛选模态框功能完全正常！' : 
        `⚠️ ${totalTests - passedTests} 个功能仍需修复`)
}
`;

    fs.writeFileSync('debug/FINAL_MODAL_FIX_VERIFICATION_REPORT.md', report);
    fs.writeFileSync('debug/final-modal-fix-test-results.json', JSON.stringify(results, null, 2));
}

// 执行最终验证
if (require.main === module) {
    finalModalFixTest().catch(console.error);
}

module.exports = { finalModalFixTest };
/**
 * MCP调试脚本 - 专门诊断高级筛选模态框的具体问题
 * 重点检查：居中显示、按钮切换、标签页响应、关闭功能
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function diagnosisAdvancedFilterModal() {
    console.log('🔧 MCP诊断: 开始检查高级筛选模态框具体问题...');
    
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 1000,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    const diagnosisResults = {
        timestamp: new Date().toISOString(),
        issues: [],
        screenshots: [],
        detailed_analysis: {}
    };

    try {
        // 访问报表页面
        console.log('📊 访问报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(2000);
        await captureScreenshot(page, 'debug/diagnosis-01-page-loaded.png', diagnosisResults);

        // 问题1：检查模态框打开和居中显示
        console.log('🎯 检查问题1: 模态框打开和居中显示...');
        await diagnoseModalCentering(page, diagnosisResults);

        // 问题2：检查按钮切换功能
        console.log('🔘 检查问题2: 按钮切换功能...');
        await diagnoseButtonSwitching(page, diagnosisResults);

        // 问题3：检查高级条件标签页响应
        console.log('📑 检查问题3: 高级条件标签页响应...');
        await diagnoseTabResponse(page, diagnosisResults);

        // 问题4：检查关闭功能
        console.log('❌ 检查问题4: 关闭功能...');
        await diagnoseCloseFunction(page, diagnosisResults);

        // 检查CSS和JavaScript状态
        await analyzeModalState(page, diagnosisResults);

    } catch (error) {
        console.error('❌ MCP诊断过程发生错误:', error);
        diagnosisResults.issues.push({
            type: 'critical',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        await browser.close();
        
        // 生成详细诊断报告
        await generateDiagnosisReport(diagnosisResults);
        console.log('📋 MCP诊断报告已生成');
    }
}

async function diagnoseModalCentering(page, results) {
    try {
        // 尝试打开筛选模态框
        const filterButton = page.locator('#advancedFiltersToggle');
        await filterButton.waitFor({ state: 'visible', timeout: 5000 });
        
        console.log('点击高级筛选按钮...');
        await filterButton.click();
        await page.waitForTimeout(1000);
        
        await captureScreenshot(page, 'debug/diagnosis-02-modal-opened.png', results);
        
        // 检查backdrop和container的存在和位置
        const backdrop = page.locator('#advancedFiltersBackdrop');
        const container = page.locator('#advancedFiltersContainer');
        
        const backdropExists = await backdrop.count() > 0;
        const containerExists = await container.count() > 0;
        
        results.detailed_analysis.modal_elements = {
            backdrop_exists: backdropExists,
            container_exists: containerExists
        };
        
        if (backdropExists) {
            const backdropVisible = await backdrop.isVisible();
            const backdropBox = await backdrop.boundingBox();
            
            results.detailed_analysis.backdrop = {
                visible: backdropVisible,
                boundingBox: backdropBox,
                classes: await backdrop.getAttribute('class')
            };
        }
        
        if (containerExists) {
            const containerVisible = await container.isVisible();
            const containerBox = await container.boundingBox();
            
            // 检查是否居中
            const viewportSize = page.viewportSize();
            const isCentered = containerBox && 
                Math.abs(containerBox.x + containerBox.width / 2 - viewportSize.width / 2) < 100 &&
                Math.abs(containerBox.y + containerBox.height / 2 - viewportSize.height / 2) < 100;
            
            results.detailed_analysis.container = {
                visible: containerVisible,
                boundingBox: containerBox,
                is_centered: isCentered,
                classes: await container.getAttribute('class')
            };
            
            if (!isCentered) {
                results.issues.push({
                    type: 'positioning',
                    message: '模态框未正确居中显示',
                    expected_center: { x: viewportSize.width / 2, y: viewportSize.height / 2 },
                    actual_center: containerBox ? { 
                        x: containerBox.x + containerBox.width / 2, 
                        y: containerBox.y + containerBox.height / 2 
                    } : null
                });
            }
        }
        
    } catch (error) {
        results.issues.push({
            type: 'modal-opening',
            message: '模态框打开失败: ' + error.message
        });
    }
}

async function diagnoseButtonSwitching(page, results) {
    try {
        // 检查筛选标签页按钮
        const tabButtons = page.locator('.filter-tab');
        const tabCount = await tabButtons.count();
        
        console.log(`发现 ${tabCount} 个标签页按钮`);
        
        results.detailed_analysis.tabs = {
            count: tabCount,
            buttons: []
        };
        
        for (let i = 0; i < tabCount; i++) {
            const tab = tabButtons.nth(i);
            const tabText = await tab.textContent();
            const isActive = await tab.evaluate(el => el.classList.contains('active'));
            const isVisible = await tab.isVisible();
            const isClickable = await tab.isEnabled();
            
            results.detailed_analysis.tabs.buttons.push({
                index: i,
                text: tabText,
                active: isActive,
                visible: isVisible,
                clickable: isClickable
            });
            
            // 尝试点击每个标签页
            if (isVisible && isClickable) {
                console.log(`尝试点击标签页: ${tabText}`);
                try {
                    await tab.click({ timeout: 3000 });
                    await page.waitForTimeout(500);
                    
                    const isActiveAfterClick = await tab.evaluate(el => el.classList.contains('active'));
                    
                    if (!isActiveAfterClick) {
                        results.issues.push({
                            type: 'tab-switching',
                            message: `标签页 "${tabText}" 点击后未激活`,
                            tab_index: i
                        });
                    }
                } catch (clickError) {
                    results.issues.push({
                        type: 'tab-click-error',
                        message: `标签页 "${tabText}" 无法点击: ${clickError.message}`,
                        tab_index: i
                    });
                }
            }
        }
        
        await captureScreenshot(page, 'debug/diagnosis-03-tab-testing.png', results);
        
    } catch (error) {
        results.issues.push({
            type: 'tab-analysis',
            message: '标签页分析失败: ' + error.message
        });
    }
}

async function diagnoseTabResponse(page, results) {
    try {
        // 具体检查"高级条件"标签页
        const advancedTab = page.locator('.filter-tab[data-tab="advanced"]');
        const advancedTabExists = await advancedTab.count() > 0;
        
        if (advancedTabExists) {
            console.log('检查高级条件标签页...');
            
            const tabText = await advancedTab.textContent();
            const isVisible = await advancedTab.isVisible();
            
            results.detailed_analysis.advanced_tab = {
                exists: true,
                text: tabText,
                visible: isVisible
            };
            
            if (isVisible) {
                // 检查点击前的状态
                const beforeClick = {
                    active: await advancedTab.evaluate(el => el.classList.contains('active')),
                    classes: await advancedTab.getAttribute('class')
                };
                
                // 尝试点击
                try {
                    await advancedTab.click({ timeout: 5000 });
                    await page.waitForTimeout(1000);
                    
                    // 检查点击后的状态
                    const afterClick = {
                        active: await advancedTab.evaluate(el => el.classList.contains('active')),
                        classes: await advancedTab.getAttribute('class')
                    };
                    
                    results.detailed_analysis.advanced_tab.click_test = {
                        before: beforeClick,
                        after: afterClick,
                        state_changed: beforeClick.active !== afterClick.active
                    };
                    
                    if (!afterClick.active && !beforeClick.active) {
                        results.issues.push({
                            type: 'advanced-tab-unresponsive',
                            message: '高级条件标签页点击无反应，未激活'
                        });
                    }
                    
                } catch (clickError) {
                    results.issues.push({
                        type: 'advanced-tab-click-blocked',
                        message: '高级条件标签页被阻止点击: ' + clickError.message
                    });
                }
            }
        } else {
            results.issues.push({
                type: 'advanced-tab-missing',
                message: '高级条件标签页不存在'
            });
        }
        
        await captureScreenshot(page, 'debug/diagnosis-04-advanced-tab.png', results);
        
    } catch (error) {
        results.issues.push({
            type: 'advanced-tab-analysis',
            message: '高级条件标签页分析失败: ' + error.message
        });
    }
}

async function diagnoseCloseFunction(page, results) {
    try {
        // 检查所有可能的关闭方式
        const closeButtons = await page.locator('#closeAdvancedFilters, .filters-close-btn, .modal-close').all();
        
        results.detailed_analysis.close_methods = {
            close_buttons: closeButtons.length,
            methods_tested: []
        };
        
        // 测试关闭按钮
        for (let i = 0; i < closeButtons.length; i++) {
            const button = closeButtons[i];
            const buttonId = await button.getAttribute('id') || await button.getAttribute('class');
            const isVisible = await button.isVisible();
            
            console.log(`测试关闭按钮 ${i + 1}: ${buttonId}`);
            
            if (isVisible) {
                try {
                    await button.click({ timeout: 3000 });
                    await page.waitForTimeout(1000);
                    
                    // 检查模态框是否关闭
                    const backdrop = page.locator('#advancedFiltersBackdrop');
                    const isModalClosed = await backdrop.isHidden();
                    
                    results.detailed_analysis.close_methods.methods_tested.push({
                        button_index: i,
                        button_id: buttonId,
                        click_successful: true,
                        modal_closed: isModalClosed
                    });
                    
                    if (!isModalClosed) {
                        results.issues.push({
                            type: 'close-button-ineffective',
                            message: `关闭按钮 "${buttonId}" 点击后模态框未关闭`
                        });
                    } else {
                        console.log('✅ 模态框成功关闭');
                        return; // 成功关闭，退出测试
                    }
                    
                } catch (clickError) {
                    results.detailed_analysis.close_methods.methods_tested.push({
                        button_index: i,
                        button_id: buttonId,
                        click_successful: false,
                        error: clickError.message
                    });
                    
                    results.issues.push({
                        type: 'close-button-click-blocked',
                        message: `关闭按钮 "${buttonId}" 无法点击: ${clickError.message}`
                    });
                }
            }
        }
        
        // 测试ESC键关闭
        console.log('测试ESC键关闭...');
        try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            
            const backdrop = page.locator('#advancedFiltersBackdrop');
            const isModalClosed = await backdrop.isHidden();
            
            results.detailed_analysis.close_methods.esc_key_test = {
                tested: true,
                modal_closed: isModalClosed
            };
            
            if (!isModalClosed) {
                results.issues.push({
                    type: 'esc-key-ineffective',
                    message: 'ESC键无法关闭模态框'
                });
            }
        } catch (error) {
            results.detailed_analysis.close_methods.esc_key_test = {
                tested: false,
                error: error.message
            };
        }
        
        // 测试背景点击关闭
        console.log('测试背景点击关闭...');
        try {
            const backdrop = page.locator('#advancedFiltersBackdrop');
            await backdrop.click({ position: { x: 10, y: 10 } });
            await page.waitForTimeout(1000);
            
            const isModalClosed = await backdrop.isHidden();
            
            results.detailed_analysis.close_methods.backdrop_click_test = {
                tested: true,
                modal_closed: isModalClosed
            };
            
            if (!isModalClosed) {
                results.issues.push({
                    type: 'backdrop-click-ineffective',
                    message: '背景点击无法关闭模态框'
                });
            }
        } catch (error) {
            results.detailed_analysis.close_methods.backdrop_click_test = {
                tested: false,
                error: error.message
            };
        }
        
        await captureScreenshot(page, 'debug/diagnosis-05-close-testing.png', results);
        
    } catch (error) {
        results.issues.push({
            type: 'close-function-analysis',
            message: '关闭功能分析失败: ' + error.message
        });
    }
}

async function analyzeModalState(page, results) {
    try {
        // 分析CSS状态
        const cssAnalysis = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            return {
                backdrop: backdrop ? {
                    display: getComputedStyle(backdrop).display,
                    position: getComputedStyle(backdrop).position,
                    pointerEvents: getComputedStyle(backdrop).pointerEvents,
                    zIndex: getComputedStyle(backdrop).zIndex,
                    opacity: getComputedStyle(backdrop).opacity
                } : null,
                container: container ? {
                    display: getComputedStyle(container).display,
                    position: getComputedStyle(container).position,
                    pointerEvents: getComputedStyle(container).pointerEvents,
                    transform: getComputedStyle(container).transform
                } : null
            };
        });
        
        results.detailed_analysis.css_state = cssAnalysis;
        
        // 分析JavaScript状态
        const jsAnalysis = await page.evaluate(() => {
            return {
                orderInfoTable_exists: typeof window.orderInfoTable !== 'undefined',
                advancedDataTable_exists: typeof window.advancedDataTable !== 'undefined',
                global_click_handlers: document._listenerCount || 0
            };
        });
        
        results.detailed_analysis.js_state = jsAnalysis;
        
    } catch (error) {
        results.issues.push({
            type: 'state-analysis',
            message: '状态分析失败: ' + error.message
        });
    }
}

async function captureScreenshot(page, path, results) {
    try {
        await page.screenshot({ 
            path: path, 
            fullPage: true 
        });
        results.screenshots.push(path);
        console.log(`📸 截图已保存: ${path}`);
    } catch (error) {
        console.warn(`截图失败: ${path}`, error.message);
    }
}

async function generateDiagnosisReport(results) {
    const totalIssues = results.issues.length;
    const criticalIssues = results.issues.filter(issue => issue.type === 'critical').length;
    
    const report = `# MCP诊断报告 - 高级筛选模态框问题分析

## 诊断概要
- **执行时间**: ${results.timestamp}
- **发现问题**: ${totalIssues}
- **严重问题**: ${criticalIssues}

## 详细问题分析

${results.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
${issue.expected_center ? `**期望居中**: x=${issue.expected_center.x}, y=${issue.expected_center.y}` : ''}
${issue.actual_center ? `**实际位置**: x=${issue.actual_center.x}, y=${issue.actual_center.y}` : ''}
${issue.tab_index !== undefined ? `**标签页索引**: ${issue.tab_index}` : ''}
`).join('\n')}

## 模态框元素状态

### Backdrop状态
\`\`\`json
${JSON.stringify(results.detailed_analysis.backdrop || {}, null, 2)}
\`\`\`

### Container状态
\`\`\`json
${JSON.stringify(results.detailed_analysis.container || {}, null, 2)}
\`\`\`

## 标签页分析

### 标签页按钮状态
\`\`\`json
${JSON.stringify(results.detailed_analysis.tabs || {}, null, 2)}
\`\`\`

### 高级条件标签页专项分析
\`\`\`json
${JSON.stringify(results.detailed_analysis.advanced_tab || {}, null, 2)}
\`\`\`

## 关闭功能分析

\`\`\`json
${JSON.stringify(results.detailed_analysis.close_methods || {}, null, 2)}
\`\`\`

## 技术状态分析

### CSS计算样式
\`\`\`json
${JSON.stringify(results.detailed_analysis.css_state || {}, null, 2)}
\`\`\`

### JavaScript运行状态
\`\`\`json
${JSON.stringify(results.detailed_analysis.js_state || {}, null, 2)}
\`\`\`

## 截图记录
${results.screenshots.map(screenshot => `- ${screenshot}`).join('\n')}

## 修复建议

${totalIssues === 0 ? '🎉 未发现问题，功能正常！' : `
基于诊断结果，建议进行以下修复：

### 优先级1 - 关键问题
${results.issues.filter(issue => ['critical', 'modal-opening', 'close-function-analysis'].includes(issue.type)).map(issue => `- ${issue.message}`).join('\n')}

### 优先级2 - 功能问题  
${results.issues.filter(issue => ['positioning', 'tab-switching', 'advanced-tab-unresponsive'].includes(issue.type)).map(issue => `- ${issue.message}`).join('\n')}

### 优先级3 - 交互问题
${results.issues.filter(issue => ['tab-click-error', 'close-button-ineffective'].includes(issue.type)).map(issue => `- ${issue.message}`).join('\n')}
`}

## 结论
${totalIssues === 0 ? 
    '✅ 高级筛选模态框功能完全正常，所有交互都按预期工作。' : 
    `⚠️  发现 ${totalIssues} 个问题需要修复，其中 ${criticalIssues} 个为严重问题。`
}
`;

    // 保存JSON格式详细数据
    fs.writeFileSync('debug/advanced-filter-modal-diagnosis.json', JSON.stringify(results, null, 2));
    
    // 保存Markdown报告
    fs.writeFileSync('debug/ADVANCED_FILTER_MODAL_DIAGNOSIS_REPORT.md', report);
}

// 执行诊断
if (require.main === module) {
    diagnosisAdvancedFilterModal().catch(console.error);
}

module.exports = { diagnosisAdvancedFilterModal };
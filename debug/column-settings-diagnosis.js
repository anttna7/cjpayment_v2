/**
 * MCP调试脚本 - 专门诊断列设置模态框不弹出问题
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function diagnoseColumnSettings() {
    console.log('🔧 MCP诊断: 检查列设置模态框问题...');
    
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 1500,
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
    
    const diagnosisResults = {
        timestamp: new Date().toISOString(),
        console_messages: [],
        analysis: {},
        issues: [],
        screenshots: []
    };

    try {
        // 访问报表页面
        console.log('📊 访问报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        await captureScreenshot(page, 'debug/column-settings-01-loaded.png', diagnosisResults);

        // 1. 检查列设置按钮是否存在
        console.log('🔍 检查列设置按钮...');
        const columnBtn = page.locator('#columnSettingsBtn');
        const btnExists = await columnBtn.count() > 0;
        
        diagnosisResults.analysis.button = {
            exists: btnExists,
            visible: btnExists ? await columnBtn.isVisible() : false,
            enabled: btnExists ? await columnBtn.isEnabled() : false
        };
        
        if (btnExists) {
            const btnText = await columnBtn.textContent();
            const btnClasses = await columnBtn.getAttribute('class');
            diagnosisResults.analysis.button.text = btnText;
            diagnosisResults.analysis.button.classes = btnClasses;
            console.log(`列设置按钮: 文本="${btnText}", 类名="${btnClasses}"`);
        } else {
            diagnosisResults.issues.push({
                type: 'missing-element',
                message: '列设置按钮不存在 (#columnSettingsBtn)'
            });
        }

        // 2. 检查列设置模态框HTML结构
        console.log('📋 检查列设置模态框HTML结构...');
        const modalExists = await page.locator('#columnSettingsModal').count() > 0;
        
        diagnosisResults.analysis.modal = {
            exists: modalExists
        };
        
        if (modalExists) {
            const modal = page.locator('#columnSettingsModal');
            const modalClasses = await modal.getAttribute('class');
            const modalStyle = await modal.getAttribute('style');
            const isVisible = await modal.isVisible();
            
            diagnosisResults.analysis.modal.classes = modalClasses;
            diagnosisResults.analysis.modal.style = modalStyle;
            diagnosisResults.analysis.modal.visible = isVisible;
            console.log(`列设置模态框: 类名="${modalClasses}", 样式="${modalStyle}", 可见=${isVisible}`);
        } else {
            diagnosisResults.issues.push({
                type: 'missing-modal',
                message: '列设置模态框不存在 (#columnSettingsModal)'
            });
        }

        // 3. 检查JavaScript事件绑定
        console.log('⚙️ 检查JavaScript事件绑定...');
        const jsAnalysis = await page.evaluate(() => {
            const btn = document.getElementById('columnSettingsBtn');
            return {
                orderInfoTable_exists: typeof window.orderInfoTable !== 'undefined',
                advancedDataTable_exists: typeof window.advancedDataTable !== 'undefined',
                button_has_listeners: btn ? btn._listeners || 'unknown' : null,
                showColumnSettings_exists: window.orderInfoTable ? typeof window.orderInfoTable.showColumnSettings === 'function' : false
            };
        });
        
        diagnosisResults.analysis.javascript = jsAnalysis;
        console.log('JavaScript状态:', JSON.stringify(jsAnalysis, null, 2));

        // 4. 尝试点击列设置按钮
        if (btnExists && diagnosisResults.analysis.button.visible) {
            console.log('🖱️ 尝试点击列设置按钮...');
            
            try {
                await columnBtn.click();
                await page.waitForTimeout(2000);
                await captureScreenshot(page, 'debug/column-settings-02-after-click.png', diagnosisResults);
                
                // 检查点击后模态框状态
                if (modalExists) {
                    const isModalVisible = await page.locator('#columnSettingsModal').isVisible();
                    diagnosisResults.analysis.click_result = {
                        success: true,
                        modal_appeared: isModalVisible
                    };
                    
                    if (!isModalVisible) {
                        diagnosisResults.issues.push({
                            type: 'modal-not-appearing',
                            message: '点击列设置按钮后模态框未出现'
                        });
                    }
                } else {
                    diagnosisResults.analysis.click_result = {
                        success: true,
                        modal_appeared: false,
                        note: '模态框HTML不存在'
                    };
                }
                
            } catch (clickError) {
                diagnosisResults.analysis.click_result = {
                    success: false,
                    error: clickError.message
                };
                diagnosisResults.issues.push({
                    type: 'click-error',
                    message: `点击列设置按钮失败: ${clickError.message}`
                });
            }
        }

        // 5. 检查所有可能的列设置相关元素
        console.log('🔎 检查所有列设置相关元素...');
        const allColumnElements = await page.evaluate(() => {
            return {
                columnSettingsBtn_count: document.querySelectorAll('#columnSettingsBtn').length,
                columnSettingsModal_count: document.querySelectorAll('#columnSettingsModal').length,
                modal_close_buttons: document.querySelectorAll('#columnSettingsModal .modal-close').length,
                all_modals: Array.from(document.querySelectorAll('[id*="modal"], [class*="modal"]')).map(el => ({
                    id: el.id,
                    classes: el.className,
                    tagName: el.tagName
                }))
            };
        });
        
        diagnosisResults.analysis.all_elements = allColumnElements;
        console.log('所有列设置元素:', JSON.stringify(allColumnElements, null, 2));

        // 收集控制台消息
        diagnosisResults.console_messages = consoleMessages;

    } catch (error) {
        console.error('❌ 诊断过程发生错误:', error);
        diagnosisResults.error = error.message;
    } finally {
        await browser.close();
        
        // 生成诊断报告
        await generateColumnSettingsReport(diagnosisResults);
        console.log('📋 列设置诊断报告已生成');
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

async function generateColumnSettingsReport(results) {
    const totalIssues = results.issues.length;
    
    const report = `# 列设置模态框诊断报告

## 诊断概要
- **执行时间**: ${results.timestamp}
- **发现问题**: ${totalIssues}

## 列设置按钮分析
\`\`\`json
${JSON.stringify(results.analysis.button || {}, null, 2)}
\`\`\`

## 列设置模态框分析
\`\`\`json
${JSON.stringify(results.analysis.modal || {}, null, 2)}
\`\`\`

## JavaScript状态分析
\`\`\`json
${JSON.stringify(results.analysis.javascript || {}, null, 2)}
\`\`\`

## 点击测试结果
\`\`\`json
${JSON.stringify(results.analysis.click_result || {}, null, 2)}
\`\`\`

## 所有相关元素统计
\`\`\`json
${JSON.stringify(results.analysis.all_elements || {}, null, 2)}
\`\`\`

## 发现的问题

${results.issues.length > 0 ? results.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
`).join('\n') : '✅ 未发现明显问题'}

## 浏览器控制台输出
${results.console_messages.length > 0 ? results.console_messages.map(msg => `- ${msg}`).join('\n') : '无控制台输出'}

## 截图记录
${results.screenshots.map(screenshot => `- ${screenshot}`).join('\n')}

## 修复建议

${totalIssues === 0 ? '🎉 列设置功能正常！' : `
基于诊断结果，建议按以下优先级修复：

### 优先级1 - 关键问题
${results.issues.filter(issue => ['missing-element', 'missing-modal'].includes(issue.type)).map(issue => `- ${issue.message}`).join('\n')}

### 优先级2 - 功能问题  
${results.issues.filter(issue => ['modal-not-appearing', 'click-error'].includes(issue.type)).map(issue => `- ${issue.message}`).join('\n')}

### 技术建议
1. 确保 #columnSettingsBtn 按钮存在且可见
2. 确保 #columnSettingsModal 模态框HTML结构完整
3. 检查JavaScript事件绑定是否正确
4. 验证 showColumnSettings() 函数是否正确实现
`}

## 结论
${totalIssues === 0 ? 
    '✅ 列设置模态框功能完全正常。' : 
    `⚠️ 发现 ${totalIssues} 个问题需要修复。`
}
`;

    fs.writeFileSync('debug/column-settings-diagnosis-report.md', report);
    fs.writeFileSync('debug/column-settings-diagnosis.json', JSON.stringify(results, null, 2));
}

// 执行诊断
if (require.main === module) {
    diagnoseColumnSettings().catch(console.error);
}

module.exports = { diagnoseColumnSettings };
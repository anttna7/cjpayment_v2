const { chromium } = require('playwright');

async function diagnoseAdvancedFiltersInteraction() {
    console.log('🔧 MCP诊断: 检查高级筛选交互失效问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听控制台消息
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `[${msg.type()}] ${msg.text()}`;
        console.log(`浏览器控制台: ${message}`);
        consoleMessages.push(message);
    });
    
    // 监听JavaScript错误
    const jsErrors = [];
    page.on('pageerror', error => {
        console.error(`❌ JavaScript错误: ${error.message}`);
        jsErrors.push({
            message: error.message,
            stack: error.stack
        });
    });
    
    try {
        console.log('📊 访问报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 截图：初始状态
        await page.screenshot({ path: 'debug/advanced-filters-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/advanced-filters-01-initial.png');
        
        console.log('🔍 检查高级筛选按钮...');
        
        // 检查高级筛选按钮
        const advancedFilterBtnCheck = await page.evaluate(() => {
            // 查找所有可能的高级筛选按钮
            const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.textContent.includes('高级筛选') || 
                btn.textContent.includes('Advanced') ||
                btn.id.includes('filter') ||
                btn.className.includes('filter')
            );
            
            return buttons.map(btn => ({
                id: btn.id,
                className: btn.className,
                textContent: btn.textContent.trim(),
                onclick: btn.onclick ? 'has onclick' : 'no onclick',
                disabled: btn.disabled,
                style: {
                    display: window.getComputedStyle(btn).display,
                    visibility: window.getComputedStyle(btn).visibility,
                    pointerEvents: window.getComputedStyle(btn).pointerEvents
                }
            }));
        });
        
        console.log('高级筛选按钮检查结果:', JSON.stringify(advancedFilterBtnCheck, null, 2));
        
        console.log('🔧 检查JavaScript实例...');
        
        // 检查JavaScript实例和函数
        const jsInstancesCheck = await page.evaluate(() => {
            return {
                orderInfoTableExists: typeof window.orderInfoTable !== 'undefined',
                orderInfoTableType: typeof window.orderInfoTable,
                advancedDataTableExists: typeof window.advancedDataTable !== 'undefined',
                advancedDataTableType: typeof window.advancedDataTable,
                toggleAdvancedFiltersExists: window.orderInfoTable && typeof window.orderInfoTable.toggleAdvancedFilters === 'function',
                advancedDataTableToggleExists: window.advancedDataTable && typeof window.advancedDataTable.toggleAdvancedFilters === 'function',
                globalToggleFunction: typeof toggleAdvancedFilters !== 'undefined',
                allGlobalFunctions: Object.keys(window).filter(key => 
                    key.toLowerCase().includes('filter') || 
                    key.toLowerCase().includes('toggle') ||
                    key.toLowerCase().includes('advanced')
                ).slice(0, 20) // 限制数量避免太多
            };
        });
        
        console.log('JavaScript实例检查:', JSON.stringify(jsInstancesCheck, null, 2));
        
        console.log('🎯 尝试手动触发高级筛选...');
        
        // 查找并点击高级筛选按钮
        const clickResult = await page.evaluate(() => {
            try {
                // 方法1：通过文本查找
                const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
                    btn.textContent.includes('高级筛选')
                );
                
                if (buttons.length > 0) {
                    const btn = buttons[0];
                    console.log('找到高级筛选按钮，准备点击:', btn.textContent.trim());
                    btn.click();
                    return { method: 'button_click', success: true, buttonText: btn.textContent.trim() };
                }
                
                // 方法2：直接调用函数
                if (window.orderInfoTable && typeof window.orderInfoTable.toggleAdvancedFilters === 'function') {
                    console.log('通过OrderInfoTable实例调用toggleAdvancedFilters');
                    window.orderInfoTable.toggleAdvancedFilters();
                    return { method: 'orderInfoTable_call', success: true };
                }
                
                // 方法3：通过AdvancedDataTable调用
                if (window.advancedDataTable && typeof window.advancedDataTable.toggleAdvancedFilters === 'function') {
                    console.log('通过AdvancedDataTable实例调用toggleAdvancedFilters');
                    window.advancedDataTable.toggleAdvancedFilters();
                    return { method: 'advancedDataTable_call', success: true };
                }
                
                return { success: false, reason: '未找到可用的触发方法' };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('点击结果:', JSON.stringify(clickResult, null, 2));
        
        // 等待可能的UI变化
        await page.waitForTimeout(1000);
        
        // 截图：点击后状态
        await page.screenshot({ path: 'debug/advanced-filters-02-after-click.png', fullPage: true });
        console.log('📸 截图已保存: debug/advanced-filters-02-after-click.png');
        
        console.log('🔍 检查模态框状态...');
        
        // 检查高级筛选模态框状态
        const modalCheck = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            return {
                backdrop: backdrop ? {
                    exists: true,
                    display: window.getComputedStyle(backdrop).display,
                    visibility: window.getComputedStyle(backdrop).visibility,
                    classes: backdrop.className,
                    hasShow: backdrop.classList.contains('show')
                } : { exists: false },
                container: container ? {
                    exists: true,
                    display: window.getComputedStyle(container).display,
                    visibility: window.getComputedStyle(container).visibility,
                    classes: container.className
                } : { exists: false },
                // 检查旧版本的模态框
                oldModal: document.getElementById('advancedFiltersPanel') ? {
                    exists: true,
                    display: window.getComputedStyle(document.getElementById('advancedFiltersPanel')).display
                } : { exists: false }
            };
        });
        
        console.log('模态框状态检查:', JSON.stringify(modalCheck, null, 2));
        
        console.log('📋 检查页面中的所有筛选相关元素...');
        
        // 获取所有筛选相关元素
        const allFilterElements = await page.evaluate(() => {
            const elements = [];
            
            // 所有包含filter的ID
            document.querySelectorAll('[id*="filter"], [id*="Filter"]').forEach(el => {
                elements.push({
                    type: 'by_id',
                    id: el.id,
                    tagName: el.tagName,
                    className: el.className,
                    textContent: el.textContent ? el.textContent.substring(0, 50) + '...' : ''
                });
            });
            
            // 所有包含filter的class
            document.querySelectorAll('[class*="filter"], [class*="Filter"]').forEach(el => {
                elements.push({
                    type: 'by_class',
                    id: el.id,
                    tagName: el.tagName,
                    className: el.className,
                    textContent: el.textContent ? el.textContent.substring(0, 50) + '...' : ''
                });
            });
            
            return elements.slice(0, 30); // 限制数量
        });
        
        console.log('所有筛选相关元素:', JSON.stringify(allFilterElements, null, 2));
        
        // 生成诊断报告
        const report = {
            timestamp: new Date().toISOString(),
            issues: [],
            advancedFilterBtnCheck,
            jsInstancesCheck,
            clickResult,
            modalCheck,
            allFilterElements,
            consoleMessages,
            jsErrors
        };
        
        // 分析问题
        if (clickResult.success && !modalCheck.backdrop.hasShow) {
            report.issues.push({
                type: 'modal-not-showing',
                message: '高级筛选触发成功但模态框未显示',
                priority: 'high'
            });
        }
        
        if (!clickResult.success) {
            report.issues.push({
                type: 'trigger-failed',
                message: '无法触发高级筛选功能',
                priority: 'critical'
            });
        }
        
        if (jsErrors.length > 0) {
            report.issues.push({
                type: 'javascript-errors',
                message: `发现${jsErrors.length}个JavaScript错误`,
                priority: 'high'
            });
        }
        
        // 保存报告
        require('fs').writeFileSync(
            'debug/advanced-filters-interaction-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        // 生成Markdown报告
        const markdownReport = `# 高级筛选交互诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 高级筛选按钮分析
\`\`\`json
${JSON.stringify(advancedFilterBtnCheck, null, 2)}
\`\`\`

## JavaScript实例状态
\`\`\`json
${JSON.stringify(jsInstancesCheck, null, 2)}
\`\`\`

## 触发测试结果  
\`\`\`json
${JSON.stringify(clickResult, null, 2)}
\`\`\`

## 模态框状态检查
\`\`\`json
${JSON.stringify(modalCheck, null, 2)}
\`\`\`

## 发现的问题

${report.issues.length === 0 ? '✅ 未发现明显问题' : ''}
${report.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
**优先级**: ${issue.priority}
`).join('')}

## 浏览器控制台输出
${consoleMessages.map(msg => `- ${msg}`).join('\n')}

## 截图记录
- debug/advanced-filters-01-initial.png
- debug/advanced-filters-02-after-click.png

## 修复建议

${report.issues.length === 0 ? '🎉 高级筛选功能正常！' : '基于诊断结果，建议按以下优先级修复：'}

${report.issues.filter(issue => issue.priority === 'critical').length > 0 ? `
### 优先级1 - 关键问题
${report.issues.filter(issue => issue.priority === 'critical').map(issue => `- ${issue.message}`).join('\n')}
` : ''}

${report.issues.filter(issue => issue.priority === 'high').length > 0 ? `
### 优先级2 - 重要问题  
${report.issues.filter(issue => issue.priority === 'high').map(issue => `- ${issue.message}`).join('\n')}
` : ''}

### 技术建议
1. 检查 toggleAdvancedFilters 函数是否正确绑定
2. 验证模态框HTML结构是否完整
3. 确认CSS样式未被覆盖
4. 检查事件处理函数是否有冲突

## 结论
${report.issues.length === 0 ? '✅ 高级筛选功能完全正常。' : `⚠️ 发现 ${report.issues.length} 个问题需要修复。`}
`;

        require('fs').writeFileSync(
            'debug/advanced-filters-interaction-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 高级筛选诊断完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseAdvancedFiltersInteraction().catch(console.error);
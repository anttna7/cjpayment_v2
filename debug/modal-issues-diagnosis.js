const { chromium } = require('playwright');

async function diagnoseModalIssues() {
    console.log('🔧 MCP诊断: 仪表板和数据报表页面模态框问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听控制台消息
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `[${msg.type()}] ${msg.text()}`;
        console.log(`浏览器控制台: ${message}`);
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: Date.now()
        });
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
        console.log(`页面错误: ${error.message}`);
        consoleMessages.push({
            type: 'error',
            text: `页面错误: ${error.message}`,
            timestamp: Date.now()
        });
    });
    
    const diagnosisResults = {
        timestamp: new Date().toISOString(),
        dashboardTest: null,
        reportsTest: null,
        issues: [],
        consoleMessages: []
    };
    
    try {
        console.log('📊 测试1: 仪表板页面模态框...');
        
        await page.goto('http://localhost:8091/dashboard', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        // 截图：仪表板初始状态
        await page.screenshot({ path: 'debug/modal-issues-01-dashboard.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-issues-01-dashboard.png');
        
        // 检查仪表板页面的导出按钮
        const dashboardAnalysis = await page.evaluate(() => {
            const exportButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.textContent.includes('导出') || 
                btn.id?.includes('export') ||
                btn.onclick?.toString().includes('showModal')
            );
            
            const modals = Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'));
            
            const showModalExists = typeof showModal === 'function';
            const hideModalExists = typeof hideModal === 'function';
            
            return {
                exportButtons: exportButtons.map(btn => ({
                    id: btn.id,
                    className: btn.className,
                    text: btn.textContent.trim(),
                    onclick: btn.onclick ? btn.onclick.toString() : null,
                    disabled: btn.disabled
                })),
                modals: modals.map(modal => ({
                    id: modal.id,
                    className: modal.className,
                    display: window.getComputedStyle(modal).display,
                    visible: modal.style.display !== 'none' && !modal.hasAttribute('aria-hidden')
                })),
                functions: {
                    showModalExists,
                    hideModalExists
                },
                errors: []
            };
        });
        
        console.log('仪表板分析:', JSON.stringify(dashboardAnalysis, null, 2));
        diagnosisResults.dashboardTest = dashboardAnalysis;
        
        // 尝试点击仪表板导出按钮
        if (dashboardAnalysis.exportButtons.length > 0) {
            const targetButton = dashboardAnalysis.exportButtons[0];
            console.log(`尝试点击仪表板导出按钮: ${targetButton.id || targetButton.text}`);
            
            const messagesBeforeClick = consoleMessages.length;
            
            try {
                if (targetButton.id) {
                    await page.click(`#${targetButton.id}`);
                } else {
                    // 使用文本查找按钮
                    await page.click(`button:has-text("${targetButton.text.slice(0, 10)}")`);
                }
                
                await page.waitForTimeout(1000);
                
                // 检查模态框是否出现
                const modalStatus = await page.evaluate(() => {
                    const modals = Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'));
                    return modals.map(modal => ({
                        id: modal.id,
                        visible: window.getComputedStyle(modal).display !== 'none' && modal.classList.contains('show'),
                        display: window.getComputedStyle(modal).display,
                        classes: modal.className
                    }));
                });
                
                console.log('点击后模态框状态:', JSON.stringify(modalStatus, null, 2));
                
                const newMessages = consoleMessages.slice(messagesBeforeClick);
                console.log(`仪表板点击产生的新消息: ${newMessages.length} 条`);
                
                diagnosisResults.dashboardTest.clickResult = {
                    modalStatus,
                    newMessages,
                    success: modalStatus.some(modal => modal.visible)
                };
                
                // 截图：点击后状态
                await page.screenshot({ path: 'debug/modal-issues-02-dashboard-clicked.png', fullPage: true });
                
                // 如果有模态框打开，尝试关闭
                if (modalStatus.some(modal => modal.visible)) {
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                }
                
            } catch (clickError) {
                console.log(`仪表板按钮点击错误: ${clickError.message}`);
                diagnosisResults.dashboardTest.clickError = clickError.message;
            }
        }
        
        console.log('📊 测试2: 数据报表页面模态框...');
        
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        // 截图：报表页面初始状态
        await page.screenshot({ path: 'debug/modal-issues-03-reports.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-issues-03-reports.png');
        
        // 检查报表页面的导出按钮和模态框
        const reportsAnalysis = await page.evaluate(() => {
            const exportButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                btn.textContent.includes('导出') || 
                btn.id?.includes('export') ||
                btn.onclick?.toString().includes('showModal')
            );
            
            const modals = Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"]'));
            
            const showModalExists = typeof showModal === 'function';
            const hideModalExists = typeof hideModal === 'function';
            
            // 检查特定的导出模态框
            const exportModal = document.getElementById('exportModal');
            const exportAdvancedTableModal = document.getElementById('exportAdvancedTableModal');
            
            return {
                exportButtons: exportButtons.map(btn => ({
                    id: btn.id,
                    className: btn.className,
                    text: btn.textContent.trim(),
                    onclick: btn.onclick ? btn.onclick.toString() : null,
                    disabled: btn.disabled
                })),
                modals: modals.map(modal => ({
                    id: modal.id,
                    className: modal.className,
                    display: window.getComputedStyle(modal).display,
                    visible: modal.style.display !== 'none' && !modal.hasAttribute('aria-hidden'),
                    parentNode: modal.parentNode.tagName
                })),
                functions: {
                    showModalExists,
                    hideModalExists
                },
                specificModals: {
                    exportModal: exportModal ? {
                        exists: true,
                        display: window.getComputedStyle(exportModal).display,
                        parentNode: exportModal.parentNode.tagName,
                        classes: exportModal.className
                    } : { exists: false },
                    exportAdvancedTableModal: exportAdvancedTableModal ? {
                        exists: true,
                        display: window.getComputedStyle(exportAdvancedTableModal).display,
                        parentNode: exportAdvancedTableModal.parentNode.tagName,
                        classes: exportAdvancedTableModal.className
                    } : { exists: false }
                },
                errors: []
            };
        });
        
        console.log('报表页面分析:', JSON.stringify(reportsAnalysis, null, 2));
        diagnosisResults.reportsTest = reportsAnalysis;
        
        // 测试报表页面的导出功能
        console.log('测试报表页面导出功能...');
        
        // 尝试直接调用showModal函数
        const directShowModalTest = await page.evaluate(() => {
            if (typeof showModal === 'function') {
                try {
                    showModal('exportModal');
                    return { success: true, error: null };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            } else {
                return { success: false, error: 'showModal函数不存在' };
            }
        });
        
        console.log('直接调用showModal结果:', JSON.stringify(directShowModalTest, null, 2));
        
        await page.waitForTimeout(500);
        
        // 检查模态框是否显示
        const reportModalStatus = await page.evaluate(() => {
            const exportModal = document.getElementById('exportModal');
            return exportModal ? {
                display: window.getComputedStyle(exportModal).display,
                visible: exportModal.classList.contains('show'),
                classes: exportModal.className,
                styles: {
                    position: window.getComputedStyle(exportModal).position,
                    top: window.getComputedStyle(exportModal).top,
                    left: window.getComputedStyle(exportModal).left,
                    zIndex: window.getComputedStyle(exportModal).zIndex
                }
            } : { error: 'exportModal not found' };
        });
        
        console.log('报表模态框状态:', JSON.stringify(reportModalStatus, null, 2));
        
        diagnosisResults.reportsTest.directShowModalTest = directShowModalTest;
        diagnosisResults.reportsTest.modalStatus = reportModalStatus;
        
        // 截图：测试后状态
        await page.screenshot({ path: 'debug/modal-issues-04-reports-tested.png', fullPage: true });
        
        // 分析问题
        if (!diagnosisResults.dashboardTest.clickResult?.success) {
            diagnosisResults.issues.push({
                type: 'dashboard-export-not-working',
                message: '仪表板导出模态框无法打开',
                page: 'dashboard'
            });
        }
        
        if (!directShowModalTest.success || !reportModalStatus.visible) {
            diagnosisResults.issues.push({
                type: 'reports-export-not-working',
                message: '数据报表页面导出模态框无法打开',
                page: 'reports',
                details: { directShowModalTest, reportModalStatus }
            });
        }
        
        // 记录控制台消息
        diagnosisResults.consoleMessages = consoleMessages;
        
        // 保存诊断报告
        require('fs').writeFileSync(
            'debug/modal-issues-diagnosis-report.json',
            JSON.stringify(diagnosisResults, null, 2)
        );
        
        const markdownReport = `# 模态框问题诊断报告

## 诊断概要
- **执行时间**: ${diagnosisResults.timestamp}
- **发现问题**: ${diagnosisResults.issues.length}

## 仪表板页面测试结果

### 导出按钮分析
\`\`\`json
${JSON.stringify(diagnosisResults.dashboardTest.exportButtons, null, 2)}
\`\`\`

### 模态框状态
\`\`\`json
${JSON.stringify(diagnosisResults.dashboardTest.modals, null, 2)}
\`\`\`

### 点击测试结果
\`\`\`json
${JSON.stringify(diagnosisResults.dashboardTest.clickResult || diagnosisResults.dashboardTest.clickError, null, 2)}
\`\`\`

## 数据报表页面测试结果

### 导出按钮分析
\`\`\`json
${JSON.stringify(diagnosisResults.reportsTest.exportButtons, null, 2)}
\`\`\`

### 特定模态框状态
\`\`\`json
${JSON.stringify(diagnosisResults.reportsTest.specificModals, null, 2)}
\`\`\`

### showModal函数测试
\`\`\`json
${JSON.stringify(diagnosisResults.reportsTest.directShowModalTest, null, 2)}
\`\`\`

### 模态框显示状态
\`\`\`json
${JSON.stringify(diagnosisResults.reportsTest.modalStatus, null, 2)}
\`\`\`

## 发现的问题

${diagnosisResults.issues.length === 0 ? '✅ 未发现问题' : ''}
${diagnosisResults.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**页面**: ${issue.page}
**消息**: ${issue.message}
${issue.details ? `
**详情**: 
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`
` : ''}
`).join('')}

## 控制台消息 (${diagnosisResults.consoleMessages.length}条)

${diagnosisResults.consoleMessages.slice(-20).map(msg => `- [${msg.type}] ${msg.text}`).join('\n')}

## 截图记录
- debug/modal-issues-01-dashboard.png - 仪表板初始状态
- debug/modal-issues-02-dashboard-clicked.png - 仪表板点击后
- debug/modal-issues-03-reports.png - 报表页面初始状态
- debug/modal-issues-04-reports-tested.png - 报表页面测试后

## 修复建议

基于诊断结果，建议进行以下修复：

${diagnosisResults.issues.includes(i => i.type.includes('dashboard')) ? `
### 仪表板页面修复
1. 检查导出按钮的事件绑定
2. 确保showModal函数在仪表板页面可用
3. 验证模态框HTML结构是否正确
` : ''}

${diagnosisResults.issues.includes(i => i.type.includes('reports')) ? `
### 数据报表页面修复  
1. 检查showModal函数的requestAnimationFrame逻辑
2. 确保模态框能正确显示
3. 验证CSS样式是否冲突
` : ''}

## 结论
${diagnosisResults.issues.length === 0 ? '✅ 所有模态框功能正常。' : `⚠️ 发现 ${diagnosisResults.issues.length} 个问题需要修复。`}
`;
        
        require('fs').writeFileSync(
            'debug/modal-issues-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 模态框问题诊断完成');
        console.log(`📋 详细报告: debug/modal-issues-diagnosis-report.md`);
        console.log(`发现问题: ${diagnosisResults.issues.length} 个`);
        
        return diagnosisResults;
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
        diagnosisResults.error = error.message;
        return diagnosisResults;
    } finally {
        await browser.close();
    }
}

diagnoseModalIssues().catch(console.error);
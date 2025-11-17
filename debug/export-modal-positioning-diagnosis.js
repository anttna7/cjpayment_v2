const { chromium } = require('playwright');

async function diagnoseExportModalPositioning() {
    console.log('🔧 MCP诊断: 导出模态框定位问题...');
    
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
    
    try {
        console.log('📊 访问报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        // 截图：初始状态
        await page.screenshot({ path: 'debug/export-modal-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/export-modal-01-initial.png');
        
        console.log('🔍 测试仪表板导出模态框...');
        
        // 滚动到数据表区域
        await page.evaluate(() => {
            const dataTable = document.getElementById('advancedDataTableContainer');
            if (dataTable) {
                dataTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        await page.waitForTimeout(1000);
        
        // 获取页面滚动状态
        const pageState = await page.evaluate(() => {
            return {
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };
        });
        
        console.log('页面状态:', JSON.stringify(pageState, null, 2));
        
        // 点击仪表板导出按钮
        const exportAdvancedBtn = await page.$('#exportAdvancedTableBtn');
        if (exportAdvancedBtn) {
            console.log('🎯 点击仪表板导出按钮...');
            await exportAdvancedBtn.click();
            await page.waitForTimeout(500);
            
            // 分析仪表板导出模态框定位
            const advancedTableModalPositioning = await page.evaluate(() => {
                const modal = document.getElementById('exportAdvancedTableModal');
                const modalContent = modal ? modal.querySelector('.modal-content') : null;
                
                let modalInfo = null;
                if (modal) {
                    const rect = modal.getBoundingClientRect();
                    const styles = window.getComputedStyle(modal);
                    modalInfo = {
                        rect: {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height
                        },
                        styles: {
                            position: styles.position,
                            top: styles.top,
                            left: styles.left,
                            display: styles.display,
                            alignItems: styles.alignItems,
                            justifyContent: styles.justifyContent,
                            zIndex: styles.zIndex
                        },
                        classes: modal.className,
                        visible: styles.display !== 'none' && modal.classList.contains('show'),
                        // 检查是否真正固定在视口
                        isProperlyFixed: styles.position === 'fixed' && 
                                       Math.abs(rect.top) < 5 && 
                                       Math.abs(rect.left) < 5,
                        coversFullViewport: rect.width >= window.innerWidth - 10 && 
                                          rect.height >= window.innerHeight - 10
                    };
                }
                
                let contentInfo = null;
                if (modalContent) {
                    const rect = modalContent.getBoundingClientRect();
                    const styles = window.getComputedStyle(modalContent);
                    contentInfo = {
                        rect: {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                            centerX: rect.left + rect.width / 2,
                            centerY: rect.top + rect.height / 2
                        },
                        styles: {
                            position: styles.position,
                            transform: styles.transform
                        },
                        isCenteredInViewport: {
                            horizontally: Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 50,
                            vertically: Math.abs((rect.top + rect.height / 2) - (window.innerHeight / 2)) < 50
                        }
                    };
                }
                
                return {
                    scroll: {
                        x: window.scrollX,
                        y: window.scrollY
                    },
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    modal: modalInfo,
                    content: contentInfo
                };
            });
            
            console.log('仪表板导出模态框定位分析:', JSON.stringify(advancedTableModalPositioning, null, 2));
            
            // 截图：仪表板导出模态框
            await page.screenshot({ path: 'debug/export-modal-02-advanced-table.png', fullPage: true });
            console.log('📸 截图已保存: debug/export-modal-02-advanced-table.png');
            
            // 关闭仪表板导出模态框
            await page.click('.modal-close');
            await page.waitForTimeout(500);
        }
        
        console.log('🔍 测试报表导出模态框...');
        
        // 滚动到页面顶部寻找导出按钮
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        
        await page.waitForTimeout(1000);
        
        // 查找报表导出按钮
        const exportBtns = await page.$$('button[onclick*="showModal"], button[onclick*="exportModal"]');
        let reportExportBtn = null;
        
        // 搜索包含"导出"文本的按钮
        for (const btn of exportBtns) {
            const text = await btn.textContent();
            if (text && text.includes('导出')) {
                console.log(`找到导出按钮: "${text}"`);
                reportExportBtn = btn;
                break;
            }
        }
        
        // 如果没找到，尝试查找页面中的导出按钮
        if (!reportExportBtn) {
            reportExportBtn = await page.$('button:has-text("导出报表"), button:has-text("导出"), .btn:has-text("导出")');
        }
        
        // 如果还是没找到，列出所有可能的按钮
        if (!reportExportBtn) {
            console.log('🔍 搜索页面中所有可能的导出按钮...');
            const allButtons = await page.$$eval('button, .btn', buttons => 
                buttons.map((btn, index) => ({
                    index,
                    text: btn.textContent.trim(),
                    id: btn.id,
                    className: btn.className,
                    onclick: btn.getAttribute('onclick')
                })).filter(btn => 
                    btn.text.includes('导出') || 
                    btn.onclick?.includes('showModal') || 
                    btn.onclick?.includes('exportModal') ||
                    btn.id?.includes('export')
                )
            );
            
            console.log('找到的导出相关按钮:', JSON.stringify(allButtons, null, 2));
            
            if (allButtons.length > 0) {
                // 选择第一个看起来像报表导出的按钮
                const targetBtn = allButtons.find(btn => btn.onclick?.includes('exportModal')) || allButtons[0];
                reportExportBtn = await page.$(`button:nth-of-type(${targetBtn.index + 1})`);
            }
        }
        
        if (reportExportBtn) {
            console.log('🎯 点击报表导出按钮...');
            await reportExportBtn.click();
            await page.waitForTimeout(500);
            
            // 分析报表导出模态框定位
            const reportModalPositioning = await page.evaluate(() => {
                const modal = document.getElementById('exportModal');
                const modalContent = modal ? modal.querySelector('.modal-content') : null;
                
                let modalInfo = null;
                if (modal) {
                    const rect = modal.getBoundingClientRect();
                    const styles = window.getComputedStyle(modal);
                    modalInfo = {
                        rect: {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height
                        },
                        styles: {
                            position: styles.position,
                            top: styles.top,
                            left: styles.left,
                            display: styles.display,
                            alignItems: styles.alignItems,
                            justifyContent: styles.justifyContent,
                            zIndex: styles.zIndex
                        },
                        classes: modal.className,
                        visible: styles.display !== 'none' && modal.classList.contains('show'),
                        isProperlyFixed: styles.position === 'fixed' && 
                                       Math.abs(rect.top) < 5 && 
                                       Math.abs(rect.left) < 5,
                        coversFullViewport: rect.width >= window.innerWidth - 10 && 
                                          rect.height >= window.innerHeight - 10
                    };
                }
                
                let contentInfo = null;
                if (modalContent) {
                    const rect = modalContent.getBoundingClientRect();
                    const styles = window.getComputedStyle(modalContent);
                    contentInfo = {
                        rect: {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                            centerX: rect.left + rect.width / 2,
                            centerY: rect.top + rect.height / 2
                        },
                        styles: {
                            position: styles.position,
                            transform: styles.transform
                        },
                        isCenteredInViewport: {
                            horizontally: Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 50,
                            vertically: Math.abs((rect.top + rect.height / 2) - (window.innerHeight / 2)) < 50
                        }
                    };
                }
                
                return {
                    scroll: {
                        x: window.scrollX,
                        y: window.scrollY
                    },
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    modal: modalInfo,
                    content: contentInfo
                };
            });
            
            console.log('报表导出模态框定位分析:', JSON.stringify(reportModalPositioning, null, 2));
            
            // 截图：报表导出模态框
            await page.screenshot({ path: 'debug/export-modal-03-report.png', fullPage: true });
            console.log('📸 截图已保存: debug/export-modal-03-report.png');
            
            // 关闭报表导出模态框
            await page.click('.modal-close');
            await page.waitForTimeout(500);
        } else {
            console.log('⚠️ 未找到报表导出按钮');
        }
        
        // 生成诊断报告
        const report = {
            timestamp: new Date().toISOString(),
            pageState,
            advancedTableModal: advancedTableModalPositioning || null,
            reportModal: reportModalPositioning || null,
            issues: []
        };
        
        // 分析问题
        if (advancedTableModalPositioning) {
            if (!advancedTableModalPositioning.modal?.isProperlyFixed) {
                report.issues.push({
                    type: 'advanced-table-modal-not-fixed',
                    message: '仪表板导出模态框没有正确固定在视口',
                    severity: 'high',
                    details: advancedTableModalPositioning.modal
                });
            }
            
            if (advancedTableModalPositioning.content && 
                (!advancedTableModalPositioning.content.isCenteredInViewport.horizontally || 
                 !advancedTableModalPositioning.content.isCenteredInViewport.vertically)) {
                report.issues.push({
                    type: 'advanced-table-modal-not-centered',
                    message: '仪表板导出模态框内容未在视口中心显示',
                    severity: 'medium',
                    details: advancedTableModalPositioning.content
                });
            }
        }
        
        if (reportModalPositioning) {
            if (!reportModalPositioning.modal?.isProperlyFixed) {
                report.issues.push({
                    type: 'report-modal-not-fixed',
                    message: '报表导出模态框没有正确固定在视口',
                    severity: 'high',
                    details: reportModalPositioning.modal
                });
            }
            
            if (reportModalPositioning.content && 
                (!reportModalPositioning.content.isCenteredInViewport.horizontally || 
                 !reportModalPositioning.content.isCenteredInViewport.vertically)) {
                report.issues.push({
                    type: 'report-modal-not-centered',
                    message: '报表导出模态框内容未在视口中心显示',
                    severity: 'medium',
                    details: reportModalPositioning.content
                });
            }
        }
        
        // 保存详细报告
        require('fs').writeFileSync(
            'debug/export-modal-positioning-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        // 生成Markdown报告
        const markdownReport = `# 导出模态框定位诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 页面状态
\`\`\`json
${JSON.stringify(pageState, null, 2)}
\`\`\`

${advancedTableModalPositioning ? `
## 仪表板导出模态框分析
\`\`\`json
${JSON.stringify(advancedTableModalPositioning, null, 2)}
\`\`\`
` : ''}

${reportModalPositioning ? `
## 报表导出模态框分析
\`\`\`json
${JSON.stringify(reportModalPositioning, null, 2)}
\`\`\`
` : ''}

## 发现的问题

${report.issues.length === 0 ? '✅ 未发现问题' : ''}
${report.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
**严重程度**: ${issue.severity}
**详情**: 
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`
`).join('')}

## 截图记录
- debug/export-modal-01-initial.png - 初始状态
- debug/export-modal-02-advanced-table.png - 仪表板导出模态框
- debug/export-modal-03-report.png - 报表导出模态框

## 修复建议

${report.issues.length === 0 ? '🎉 导出模态框定位正常！' : `
基于诊断结果，建议进行以下修复：

### 定位修复
1. 确保所有.modal-enhanced使用正确的fixed定位
2. 检查showModal函数是否正确应用样式
3. 确保模态框在视口中心正确显示

### CSS样式检查
1. 验证.modal-enhanced的flexbox居中配置
2. 检查是否有其他CSS规则干扰定位
3. 确保z-index层级正确
`}

## 结论
${report.issues.length === 0 ? '✅ 导出模态框定位正常。' : `⚠️ 发现 ${report.issues.length} 个问题需要修复。`}
`;
        
        require('fs').writeFileSync(
            'debug/export-modal-positioning-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 导出模态框定位诊断完成');
        console.log(`📋 详细报告: debug/export-modal-positioning-diagnosis-report.md`);
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseExportModalPositioning().catch(console.error);
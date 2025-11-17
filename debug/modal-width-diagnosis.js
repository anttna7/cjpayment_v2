const { chromium } = require('playwright');

async function diagnoseModalWidth() {
    console.log('🔧 MCP诊断: 高级筛选模态框宽度问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('📊 访问报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 截图：初始状态
        await page.screenshot({ path: 'debug/modal-width-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-width-01-initial.png');
        
        // 获取视口尺寸
        const viewport = await page.evaluate(() => {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
                documentWidth: document.documentElement.scrollWidth,
                documentHeight: document.documentElement.scrollHeight
            };
        });
        
        console.log('视口信息:', viewport);
        
        // 点击高级筛选按钮
        console.log('🎯 打开高级筛选模态框...');
        await page.click('#toggleAdvancedFilters');
        await page.waitForTimeout(1000);
        
        // 截图：模态框打开状态
        await page.screenshot({ path: 'debug/modal-width-02-modal-opened.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-width-02-modal-opened.png');
        
        // 分析模态框尺寸
        const modalAnalysis = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            if (!backdrop || !container) {
                return { error: '模态框元素未找到' };
            }
            
            const backdropRect = backdrop.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const backdropStyles = window.getComputedStyle(backdrop);
            const containerStyles = window.getComputedStyle(container);
            
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                backdrop: {
                    width: backdropRect.width,
                    height: backdropRect.height,
                    left: backdropRect.left,
                    right: backdropRect.right,
                    top: backdropRect.top,
                    bottom: backdropRect.bottom,
                    styles: {
                        width: backdropStyles.width,
                        height: backdropStyles.height,
                        position: backdropStyles.position,
                        left: backdropStyles.left,
                        top: backdropStyles.top,
                        zIndex: backdropStyles.zIndex
                    }
                },
                container: {
                    width: containerRect.width,
                    height: containerRect.height,
                    left: containerRect.left,
                    right: containerRect.right,
                    top: containerRect.top,
                    bottom: containerRect.bottom,
                    exceedsViewport: {
                        right: containerRect.right > window.innerWidth,
                        left: containerRect.left < 0,
                        bottom: containerRect.bottom > window.innerHeight,
                        top: containerRect.top < 0
                    },
                    styles: {
                        width: containerStyles.width,
                        maxWidth: containerStyles.maxWidth,
                        height: containerStyles.height,
                        maxHeight: containerStyles.maxHeight,
                        position: containerStyles.position,
                        left: containerStyles.left,
                        top: containerStyles.top,
                        margin: containerStyles.margin,
                        padding: containerStyles.padding,
                        boxSizing: containerStyles.boxSizing,
                        overflow: containerStyles.overflow,
                        overflowX: containerStyles.overflowX,
                        overflowY: containerStyles.overflowY
                    }
                }
            };
        });
        
        console.log('模态框尺寸分析:', JSON.stringify(modalAnalysis, null, 2));
        
        // 检查内容区域
        const contentAnalysis = await page.evaluate(() => {
            const filtersContent = document.querySelector('.filters-content-wrapper');
            const tabsContainer = document.querySelector('.filter-tabs');
            const tabContent = document.querySelector('.filter-tab-content');
            
            const analyses = {};
            
            if (filtersContent) {
                const rect = filtersContent.getBoundingClientRect();
                const styles = window.getComputedStyle(filtersContent);
                analyses.filtersContent = {
                    width: rect.width,
                    height: rect.height,
                    styles: {
                        width: styles.width,
                        maxWidth: styles.maxWidth,
                        minWidth: styles.minWidth,
                        padding: styles.padding,
                        margin: styles.margin,
                        boxSizing: styles.boxSizing
                    }
                };
            }
            
            if (tabsContainer) {
                const rect = tabsContainer.getBoundingClientRect();
                const styles = window.getComputedStyle(tabsContainer);
                analyses.tabsContainer = {
                    width: rect.width,
                    styles: {
                        width: styles.width,
                        display: styles.display,
                        flexWrap: styles.flexWrap
                    }
                };
            }
            
            if (tabContent) {
                const rect = tabContent.getBoundingClientRect();
                const styles = window.getComputedStyle(tabContent);
                analyses.tabContent = {
                    width: rect.width,
                    styles: {
                        width: styles.width,
                        padding: styles.padding
                    }
                };
            }
            
            return analyses;
        });
        
        console.log('内容区域分析:', JSON.stringify(contentAnalysis, null, 2));
        
        // 检查是否有水平滚动条
        const scrollInfo = await page.evaluate(() => {
            return {
                hasHorizontalScrollbar: document.documentElement.scrollWidth > window.innerWidth,
                hasVerticalScrollbar: document.documentElement.scrollHeight > window.innerHeight,
                scrollWidth: document.documentElement.scrollWidth,
                scrollHeight: document.documentElement.scrollHeight,
                clientWidth: document.documentElement.clientWidth,
                clientHeight: document.documentElement.clientHeight
            };
        });
        
        console.log('滚动信息:', scrollInfo);
        
        // 生成报告
        const report = {
            timestamp: new Date().toISOString(),
            viewport,
            modalAnalysis,
            contentAnalysis,
            scrollInfo,
            issues: []
        };
        
        // 分析问题
        if (modalAnalysis.container && modalAnalysis.container.exceedsViewport.right) {
            report.issues.push({
                type: 'modal-exceeds-viewport-width',
                message: '模态框超出视口右边界',
                details: {
                    containerWidth: modalAnalysis.container.width,
                    viewportWidth: modalAnalysis.viewport.width,
                    excess: modalAnalysis.container.right - modalAnalysis.viewport.width
                }
            });
        }
        
        if (modalAnalysis.container && modalAnalysis.container.exceedsViewport.bottom) {
            report.issues.push({
                type: 'modal-exceeds-viewport-height',
                message: '模态框超出视口下边界',
                details: {
                    containerHeight: modalAnalysis.container.height,
                    viewportHeight: modalAnalysis.viewport.height,
                    excess: modalAnalysis.container.bottom - modalAnalysis.viewport.height
                }
            });
        }
        
        if (scrollInfo.hasHorizontalScrollbar) {
            report.issues.push({
                type: 'horizontal-scrollbar-present',
                message: '页面出现水平滚动条',
                details: {
                    scrollWidth: scrollInfo.scrollWidth,
                    clientWidth: scrollInfo.clientWidth,
                    excess: scrollInfo.scrollWidth - scrollInfo.clientWidth
                }
            });
        }
        
        // 保存报告
        require('fs').writeFileSync(
            'debug/modal-width-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        // 生成Markdown报告
        const markdownReport = `# 高级筛选模态框宽度诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 视口信息
\`\`\`json
${JSON.stringify(viewport, null, 2)}
\`\`\`

## 模态框尺寸分析
\`\`\`json
${JSON.stringify(modalAnalysis, null, 2)}
\`\`\`

## 内容区域分析
\`\`\`json
${JSON.stringify(contentAnalysis, null, 2)}
\`\`\`

## 滚动信息
\`\`\`json
${JSON.stringify(scrollInfo, null, 2)}
\`\`\`

## 发现的问题

${report.issues.length === 0 ? '✅ 未发现模态框宽度问题' : ''}
${report.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
**详情**: 
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`
`).join('')}

## 修复建议

${report.issues.length === 0 ? '🎉 模态框宽度正常！' : `
基于诊断结果，建议进行以下修复：

### CSS调整建议
1. 设置模态框容器的最大宽度
2. 添加响应式断点适配
3. 确保内容区域正确换行
4. 添加水平滚动条（如需要）

### 具体修复方案
- 设置 \`.modal-container\` 的 \`max-width\`
- 调整内容区域的 padding 和 margin
- 添加媒体查询适配小屏幕
- 确保表单元素正确换行
`}

## 截图记录
- debug/modal-width-01-initial.png - 初始状态
- debug/modal-width-02-modal-opened.png - 模态框打开状态

## 结论
${report.issues.length === 0 ? '✅ 模态框宽度完全正常。' : `⚠️ 发现 ${report.issues.length} 个宽度相关问题需要修复。`}
`;

        require('fs').writeFileSync(
            'debug/modal-width-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 模态框宽度诊断完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseModalWidth().catch(console.error);
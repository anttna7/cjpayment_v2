const { chromium } = require('playwright');

async function diagnoseBackdropWidth() {
    console.log('🔧 MCP诊断: 高级筛选模态框透明背景超出页面宽度问题...');
    
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
        await page.screenshot({ path: 'debug/backdrop-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/backdrop-01-initial.png');
        
        // 分析页面基础信息
        const pageInfo = await page.evaluate(() => {
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                document: {
                    scrollWidth: document.documentElement.scrollWidth,
                    scrollHeight: document.documentElement.scrollHeight,
                    clientWidth: document.documentElement.clientWidth,
                    clientHeight: document.documentElement.clientHeight
                },
                body: {
                    scrollWidth: document.body.scrollWidth,
                    scrollHeight: document.body.scrollHeight,
                    clientWidth: document.body.clientWidth,
                    clientHeight: document.body.clientHeight
                }
            };
        });
        
        console.log('页面基础信息:', pageInfo);
        
        // 点击高级筛选按钮，打开模态框
        console.log('🎯 打开高级筛选模态框...');
        await page.click('#toggleAdvancedFilters');
        await page.waitForTimeout(1000);
        
        // 截图：模态框打开状态
        await page.screenshot({ path: 'debug/backdrop-02-modal-opened.png', fullPage: true });
        console.log('📸 截图已保存: debug/backdrop-02-modal-opened.png');
        
        // 详细分析backdrop的尺寸和位置
        const backdropAnalysis = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            if (!backdrop) {
                return { error: 'backdrop元素未找到' };
            }
            
            const backdropRect = backdrop.getBoundingClientRect();
            const backdropStyles = window.getComputedStyle(backdrop);
            
            let containerInfo = null;
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const containerStyles = window.getComputedStyle(container);
                containerInfo = {
                    rect: {
                        width: containerRect.width,
                        height: containerRect.height,
                        left: containerRect.left,
                        right: containerRect.right,
                        top: containerRect.top,
                        bottom: containerRect.bottom
                    },
                    styles: {
                        width: containerStyles.width,
                        height: containerStyles.height,
                        position: containerStyles.position,
                        left: containerStyles.left,
                        top: containerStyles.top,
                        transform: containerStyles.transform
                    }
                };
            }
            
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                document: {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth
                },
                backdrop: {
                    rect: {
                        width: backdropRect.width,
                        height: backdropRect.height,
                        left: backdropRect.left,
                        right: backdropRect.right,
                        top: backdropRect.top,
                        bottom: backdropRect.bottom
                    },
                    computed: {
                        width: backdropStyles.width,
                        height: backdropStyles.height,
                        position: backdropStyles.position,
                        left: backdropStyles.left,
                        top: backdropStyles.top,
                        right: backdropStyles.right,
                        bottom: backdropStyles.bottom,
                        zIndex: backdropStyles.zIndex,
                        display: backdropStyles.display,
                        visibility: backdropStyles.visibility
                    },
                    exceedsViewport: {
                        width: backdropRect.width > window.innerWidth,
                        height: backdropRect.height > window.innerHeight,
                        right: backdropRect.right > window.innerWidth,
                        bottom: backdropRect.bottom > window.innerHeight,
                        excess: {
                            width: backdropRect.width - window.innerWidth,
                            height: backdropRect.height - window.innerHeight,
                            right: backdropRect.right - window.innerWidth,
                            bottom: backdropRect.bottom - window.innerHeight
                        }
                    }
                },
                container: containerInfo
            };
        });
        
        console.log('Backdrop分析结果:', JSON.stringify(backdropAnalysis, null, 2));
        
        // 检查backdrop是否基于document还是viewport定位
        const positioningAnalysis = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            if (!backdrop) return null;
            
            const styles = window.getComputedStyle(backdrop);
            
            return {
                positioning: {
                    position: styles.position,
                    left: styles.left,
                    top: styles.top,
                    right: styles.right,
                    bottom: styles.bottom,
                    width: styles.width,
                    height: styles.height
                },
                viewport: {
                    width: window.innerWidth + 'px',
                    height: window.innerHeight + 'px'
                },
                documentSize: {
                    width: document.documentElement.scrollWidth + 'px',
                    height: document.documentElement.scrollHeight + 'px'
                },
                shouldBe: {
                    width: '100vw',
                    height: '100vh',
                    position: 'fixed',
                    left: '0',
                    top: '0'
                }
            };
        });
        
        console.log('定位分析:', JSON.stringify(positioningAnalysis, null, 2));
        
        // 生成报告
        const report = {
            timestamp: new Date().toISOString(),
            pageInfo,
            backdropAnalysis,
            positioningAnalysis,
            issues: []
        };
        
        // 分析问题
        if (backdropAnalysis.backdrop && backdropAnalysis.backdrop.exceedsViewport.width) {
            report.issues.push({
                type: 'backdrop-exceeds-viewport-width',
                message: 'backdrop透明背景超出视口宽度',
                severity: 'high',
                details: {
                    backdropWidth: backdropAnalysis.backdrop.rect.width,
                    viewportWidth: backdropAnalysis.viewport.width,
                    excess: backdropAnalysis.backdrop.exceedsViewport.excess.width
                }
            });
        }
        
        if (backdropAnalysis.backdrop && backdropAnalysis.backdrop.computed.width !== '100vw') {
            report.issues.push({
                type: 'backdrop-width-not-viewport',
                message: 'backdrop宽度不是基于视口(100vw)',
                severity: 'medium',
                details: {
                    currentWidth: backdropAnalysis.backdrop.computed.width,
                    shouldBe: '100vw'
                }
            });
        }
        
        if (backdropAnalysis.backdrop && backdropAnalysis.backdrop.computed.position !== 'fixed') {
            report.issues.push({
                type: 'backdrop-position-not-fixed',
                message: 'backdrop定位方式不是fixed',
                severity: 'medium',
                details: {
                    currentPosition: backdropAnalysis.backdrop.computed.position,
                    shouldBe: 'fixed'
                }
            });
        }
        
        // 保存报告
        require('fs').writeFileSync(
            'debug/backdrop-width-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        // 生成Markdown报告
        const markdownReport = `# 高级筛选模态框透明背景宽度诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 页面基础信息
\`\`\`json
${JSON.stringify(pageInfo, null, 2)}
\`\`\`

## Backdrop分析结果
\`\`\`json
${JSON.stringify(backdropAnalysis, null, 2)}
\`\`\`

## 定位分析
\`\`\`json
${JSON.stringify(positioningAnalysis, null, 2)}
\`\`\`

## 发现的问题

${report.issues.length === 0 ? '✅ 透明背景显示正常' : ''}
${report.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
**严重程度**: ${issue.severity}
**详情**: 
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`
`).join('')}

## 修复建议

${report.issues.length === 0 ? '🎉 透明背景正常！' : `
基于诊断结果，建议进行以下修复：

### CSS修复方案
1. 确保backdrop使用 \`position: fixed\`
2. 设置backdrop尺寸为 \`width: 100vw; height: 100vh\`
3. 设置backdrop位置为 \`left: 0; top: 0\`
4. 避免backdrop继承父容器的尺寸限制

### 具体代码修改
\`\`\`css
.modal-backdrop {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 1000 !important;
}
\`\`\`
`}

## 截图记录
- debug/backdrop-01-initial.png - 初始状态
- debug/backdrop-02-modal-opened.png - 模态框打开状态

## 结论
${report.issues.length === 0 ? '✅ 透明背景完全正常。' : `⚠️ 发现 ${report.issues.length} 个透明背景相关问题需要修复。`}
`;

        require('fs').writeFileSync(
            'debug/backdrop-width-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 透明背景宽度诊断完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseBackdropWidth().catch(console.error);
const { chromium } = require('playwright');

async function diagnoseModalFlicker() {
    console.log('🔧 MCP诊断: 模态框闪烁和定位问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听所有控制台消息
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
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 截图：初始状态
        await page.screenshot({ path: 'debug/flicker-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/flicker-01-initial.png');
        
        // 分析页面滚动状态和backdrop位置
        console.log('🔍 分析初始页面状态...');
        const initialState = await page.evaluate(() => {
            return {
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                document: {
                    scrollWidth: document.documentElement.scrollWidth,
                    scrollHeight: document.documentElement.scrollHeight
                },
                backdrop: {
                    exists: !!document.getElementById('advancedFiltersBackdrop'),
                    visible: document.getElementById('advancedFiltersBackdrop')?.style.display !== 'none'
                }
            };
        });
        
        console.log('初始状态:', JSON.stringify(initialState, null, 2));
        
        // 点击高级筛选按钮，打开模态框
        console.log('🎯 打开高级筛选模态框...');
        await page.click('#advancedFiltersToggle');
        await page.waitForTimeout(1000);
        
        // 截图：模态框刚打开
        await page.screenshot({ path: 'debug/flicker-02-modal-opened.png', fullPage: true });
        console.log('📸 截图已保存: debug/flicker-02-modal-opened.png');
        
        // 分析模态框打开后的状态
        const modalOpenedState = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            let backdropInfo = null;
            if (backdrop) {
                const rect = backdrop.getBoundingClientRect();
                const styles = window.getComputedStyle(backdrop);
                backdropInfo = {
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom
                    },
                    styles: {
                        position: styles.position,
                        left: styles.left,
                        top: styles.top,
                        width: styles.width,
                        height: styles.height,
                        transform: styles.transform,
                        zIndex: styles.zIndex
                    },
                    classes: backdrop.className,
                    hasShowClass: backdrop.classList.contains('show')
                };
            }
            
            let containerInfo = null;
            if (container) {
                const rect = container.getBoundingClientRect();
                containerInfo = {
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom
                    },
                    inViewport: {
                        visible: rect.top >= 0 && rect.left >= 0 && 
                                rect.bottom <= window.innerHeight && 
                                rect.right <= window.innerWidth,
                        partiallyVisible: !(rect.bottom < 0 || rect.top > window.innerHeight ||
                                          rect.right < 0 || rect.left > window.innerWidth)
                    }
                };
            }
            
            return {
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                backdrop: backdropInfo,
                container: containerInfo,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };
        });
        
        console.log('模态框打开状态:', JSON.stringify(modalOpenedState, null, 2));
        
        // 模拟页面向上滚动
        console.log('📜 模拟页面向上滚动...');
        await page.evaluate(() => {
            window.scrollTo(0, 500); // 向上滚动500px
        });
        await page.waitForTimeout(500);
        
        // 截图：滚动后状态
        await page.screenshot({ path: 'debug/flicker-03-after-scroll.png', fullPage: true });
        console.log('📸 截图已保存: debug/flicker-03-after-scroll.png');
        
        // 分析滚动后的状态
        const afterScrollState = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            let backdropInfo = null;
            if (backdrop) {
                const rect = backdrop.getBoundingClientRect();
                backdropInfo = {
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom
                    },
                    exceedsViewport: {
                        right: rect.right > window.innerWidth,
                        bottom: rect.bottom > window.innerHeight,
                        left: rect.left < 0,
                        top: rect.top < 0
                    }
                };
            }
            
            let containerInfo = null;
            if (container) {
                const rect = container.getBoundingClientRect();
                containerInfo = {
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom
                    },
                    inViewport: {
                        completelyVisible: rect.top >= 0 && rect.left >= 0 && 
                                         rect.bottom <= window.innerHeight && 
                                         rect.right <= window.innerWidth,
                        partiallyVisible: !(rect.bottom < 0 || rect.top > window.innerHeight ||
                                          rect.right < 0 || rect.left > window.innerWidth)
                    }
                };
            }
            
            return {
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                backdrop: backdropInfo,
                container: containerInfo
            };
        });
        
        console.log('滚动后状态:', JSON.stringify(afterScrollState, null, 2));
        
        // 测试鼠标悬停是否会引起闪烁
        console.log('🖱️ 测试鼠标悬停在模态框上...');
        
        // 记录悬停前的控制台消息数量
        const messagesBeforeHover = consoleMessages.length;
        
        // 鼠标悬停在模态框中心
        const containerRect = afterScrollState.container?.rect;
        if (containerRect) {
            const hoverX = containerRect.left + containerRect.width / 2;
            const hoverY = containerRect.top + containerRect.height / 2;
            
            console.log(`鼠标移动到 (${hoverX}, ${hoverY})`);
            await page.mouse.move(hoverX, hoverY);
            await page.waitForTimeout(1000);
            
            // 截图：鼠标悬停状态
            await page.screenshot({ path: 'debug/flicker-04-mouse-hover.png', fullPage: true });
            console.log('📸 截图已保存: debug/flicker-04-mouse-hover.png');
            
            // 轻微移动鼠标测试
            await page.mouse.move(hoverX + 10, hoverY + 10);
            await page.waitForTimeout(500);
            await page.mouse.move(hoverX - 10, hoverY - 10);
            await page.waitForTimeout(500);
        }
        
        // 检查悬停期间是否有新的控制台消息（表明有事件触发）
        const messagesAfterHover = consoleMessages.length;
        const newMessages = consoleMessages.slice(messagesBeforeHover);
        
        console.log(`悬停期间新增控制台消息: ${newMessages.length} 条`);
        newMessages.forEach(msg => {
            console.log(`  - [${msg.type}] ${msg.text}`);
        });
        
        // 分析pointer events设置
        const pointerEventsAnalysis = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            return {
                backdrop: backdrop ? {
                    pointerEvents: window.getComputedStyle(backdrop).pointerEvents,
                    cursor: window.getComputedStyle(backdrop).cursor,
                    zIndex: window.getComputedStyle(backdrop).zIndex
                } : null,
                container: container ? {
                    pointerEvents: window.getComputedStyle(container).pointerEvents,
                    cursor: window.getComputedStyle(container).cursor,
                    zIndex: window.getComputedStyle(container).zIndex
                } : null
            };
        });
        
        console.log('Pointer Events分析:', JSON.stringify(pointerEventsAnalysis, null, 2));
        
        // 生成综合报告
        const report = {
            timestamp: new Date().toISOString(),
            initialState,
            modalOpenedState,
            afterScrollState,
            pointerEventsAnalysis,
            hoverMessages: newMessages,
            allConsoleMessages: consoleMessages,
            issues: []
        };
        
        // 分析问题
        if (afterScrollState.backdrop?.exceedsViewport.right) {
            report.issues.push({
                type: 'backdrop-exceeds-viewport',
                message: '滚动后backdrop超出视口右边界',
                severity: 'high'
            });
        }
        
        if (newMessages.some(msg => msg.text.includes('外部点击关闭模态框'))) {
            report.issues.push({
                type: 'unintended-close-trigger',
                message: '鼠标悬停时意外触发关闭事件',
                severity: 'high'
            });
        }
        
        if (pointerEventsAnalysis.backdrop?.pointerEvents !== 'none') {
            report.issues.push({
                type: 'backdrop-pointer-events',
                message: 'backdrop的pointer-events设置可能导致事件冲突',
                severity: 'medium'
            });
        }
        
        // 保存报告
        require('fs').writeFileSync(
            'debug/modal-flicker-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        // 生成Markdown报告
        const markdownReport = `# 模态框闪烁和定位问题诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 初始状态
\`\`\`json
${JSON.stringify(initialState, null, 2)}
\`\`\`

## 模态框打开状态
\`\`\`json
${JSON.stringify(modalOpenedState, null, 2)}
\`\`\`

## 滚动后状态
\`\`\`json
${JSON.stringify(afterScrollState, null, 2)}
\`\`\`

## Pointer Events分析
\`\`\`json
${JSON.stringify(pointerEventsAnalysis, null, 2)}
\`\`\`

## 鼠标悬停期间消息 (${newMessages.length}条)
${newMessages.map(msg => `- [${msg.type}] ${msg.text}`).join('\n')}

## 发现的问题

${report.issues.length === 0 ? '✅ 未发现问题' : ''}
${report.issues.map((issue, index) => `
### ${index + 1}. ${issue.type}
**消息**: ${issue.message}
**严重程度**: ${issue.severity}
`).join('')}

## 截图记录
- debug/flicker-01-initial.png - 初始状态
- debug/flicker-02-modal-opened.png - 模态框打开
- debug/flicker-03-after-scroll.png - 滚动后状态  
- debug/flicker-04-mouse-hover.png - 鼠标悬停状态

## 修复建议

${report.issues.length === 0 ? '🎉 模态框工作正常！' : `
基于诊断结果，建议进行以下修复：

### 修复方案
1. 确保backdrop完全覆盖视口而不超出
2. 检查事件处理函数的条件判断
3. 优化pointer-events设置
4. 改进鼠标事件的边界检测
`}

## 结论
${report.issues.length === 0 ? '✅ 模态框功能正常，无闪烁问题。' : `⚠️ 发现 ${report.issues.length} 个问题需要修复。`}
`;

        require('fs').writeFileSync(
            'debug/modal-flicker-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 模态框闪烁诊断完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseModalFlicker().catch(console.error);
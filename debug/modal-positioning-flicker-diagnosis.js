const { chromium } = require('playwright');

async function diagnoseModalPositioningFlicker() {
    console.log('🔧 MCP诊断: 模态框定位和鼠标悬停闪烁问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听控制台消息，特别关注闪烁相关的日志
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
        await page.screenshot({ path: 'debug/modal-pos-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-pos-01-initial.png');
        
        console.log('🔍 分析页面滚动到数据表区域...');
        
        // 滚动到数据表区域（模拟用户正常使用场景）
        await page.evaluate(() => {
            const dataTable = document.getElementById('advancedDataTableContainer');
            if (dataTable) {
                dataTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        await page.waitForTimeout(1000);
        
        // 获取滚动后的页面状态
        const pageState = await page.evaluate(() => {
            return {
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                dataTablePosition: (() => {
                    const table = document.getElementById('advancedDataTableContainer');
                    if (table) {
                        const rect = table.getBoundingClientRect();
                        return {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                            inViewport: rect.top >= 0 && rect.top <= window.innerHeight
                        };
                    }
                    return null;
                })()
            };
        });
        
        console.log('页面状态（滚动到数据表后）:', JSON.stringify(pageState, null, 2));
        
        // 截图：滚动到数据表后
        await page.screenshot({ path: 'debug/modal-pos-02-scrolled-to-table.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-pos-02-scrolled-to-table.png');
        
        console.log('🎯 打开高级筛选模态框...');
        const messagesBeforeOpen = consoleMessages.length;
        
        // 点击高级筛选按钮
        await page.click('#advancedFiltersToggle');
        await page.waitForTimeout(1000);
        
        // 分析模态框打开后的定位
        const modalPositioning = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            let backdropInfo = null;
            if (backdrop) {
                const rect = backdrop.getBoundingClientRect();
                const styles = window.getComputedStyle(backdrop);
                backdropInfo = {
                    rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        right: rect.right,
                        bottom: rect.bottom
                    },
                    styles: {
                        position: styles.position,
                        top: styles.top,
                        left: styles.left,
                        right: styles.right,
                        bottom: styles.bottom,
                        width: styles.width,
                        height: styles.height,
                        zIndex: styles.zIndex,
                        transform: styles.transform
                    },
                    // 检查是否真正固定在视口
                    isFixedToViewport: styles.position === 'fixed' && rect.top === 0 && rect.left === 0,
                    followsScroll: rect.top !== 0 || rect.left !== 0
                };
            }
            
            let containerInfo = null;
            if (container) {
                const rect = container.getBoundingClientRect();
                const styles = window.getComputedStyle(container);
                containerInfo = {
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
                        top: styles.top,
                        left: styles.left,
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
                backdrop: backdropInfo,
                container: containerInfo
            };
        });
        
        console.log('模态框定位分析:', JSON.stringify(modalPositioning, null, 2));
        
        // 截图：模态框刚打开
        await page.screenshot({ path: 'debug/modal-pos-03-modal-opened.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-pos-03-modal-opened.png');
        
        console.log('📜 测试滚动时模态框行为...');
        
        // 向上滚动，观察模态框是否跟随滚动
        await page.evaluate(() => {
            window.scrollTo(0, Math.max(0, window.scrollY - 300));
        });
        
        await page.waitForTimeout(500);
        
        // 分析滚动后的模态框位置
        const afterScrollPositioning = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            const container = document.getElementById('advancedFiltersContainer');
            
            const backdropRect = backdrop ? backdrop.getBoundingClientRect() : null;
            const containerRect = container ? container.getBoundingClientRect() : null;
            
            return {
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                },
                backdrop: backdropRect ? {
                    top: backdropRect.top,
                    left: backdropRect.left,
                    isAtViewportTop: Math.abs(backdropRect.top) < 5,
                    followedScroll: backdropRect.top !== 0
                } : null,
                container: containerRect ? {
                    top: containerRect.top,
                    left: containerRect.left,
                    centerY: containerRect.top + containerRect.height / 2,
                    isCenteredVertically: Math.abs((containerRect.top + containerRect.height / 2) - (window.innerHeight / 2)) < 50
                } : null
            };
        });
        
        console.log('滚动后定位:', JSON.stringify(afterScrollPositioning, null, 2));
        
        // 截图：滚动后的模态框
        await page.screenshot({ path: 'debug/modal-pos-04-after-scroll.png', fullPage: true });
        console.log('📸 截图已保存: debug/modal-pos-04-after-scroll.png');
        
        console.log('🖱️ 测试鼠标悬停时的闪烁...');
        
        const messagesBeforeHover = consoleMessages.length;
        
        // 将鼠标移动到模态框中心
        const containerRect = afterScrollPositioning.container;
        if (containerRect) {
            const hoverX = containerRect.left + 544; // 容器宽度一半
            const hoverY = containerRect.centerY;
            
            console.log(`鼠标移动到模态框中心: (${hoverX}, ${hoverY})`);
            
            // 慢慢移动鼠标到模态框
            await page.mouse.move(hoverX, hoverY, { steps: 10 });
            await page.waitForTimeout(1000);
            
            // 在模态框内小幅移动鼠标，观察是否引起闪烁
            for (let i = 0; i < 5; i++) {
                await page.mouse.move(hoverX + (i * 10), hoverY + (i * 5));
                await page.waitForTimeout(200);
            }
            
            // 截图：鼠标悬停状态
            await page.screenshot({ path: 'debug/modal-pos-05-mouse-hover.png', fullPage: true });
            console.log('📸 截图已保存: debug/modal-pos-05-mouse-hover.png');
        }
        
        // 分析鼠标悬停期间的消息
        const hoverMessages = consoleMessages.slice(messagesBeforeHover);
        console.log(`鼠标悬停期间新增消息: ${hoverMessages.length} 条`);
        
        hoverMessages.forEach((msg, index) => {
            console.log(`  ${index + 1}. [${msg.type}] ${msg.text}`);
        });
        
        // 检查是否有闪烁相关的模式
        const flickerPatterns = hoverMessages.filter(msg => 
            msg.text.includes('关闭模态框') || 
            msg.text.includes('显示模态框') ||
            msg.text.includes('外部点击') ||
            msg.text.includes('跳过初始化')
        );
        
        console.log(`检测到闪烁模式: ${flickerPatterns.length} 条`);
        flickerPatterns.forEach(msg => {
            console.log(`  - [闪烁] ${msg.text}`);
        });
        
        // 生成综合报告
        const report = {
            timestamp: new Date().toISOString(),
            pageState,
            modalPositioning,
            afterScrollPositioning,
            hoverMessages,
            flickerPatterns,
            issues: []
        };
        
        // 分析问题
        if (modalPositioning.backdrop && !modalPositioning.backdrop.isFixedToViewport) {
            report.issues.push({
                type: 'modal-not-fixed-to-viewport',
                message: '模态框没有固定在视口，跟随页面滚动',
                severity: 'high',
                details: modalPositioning.backdrop
            });
        }
        
        if (flickerPatterns.length > 0) {
            report.issues.push({
                type: 'mouse-hover-flicker',
                message: `鼠标悬停时检测到${flickerPatterns.length}次闪烁事件`,
                severity: 'high',
                details: flickerPatterns
            });
        }
        
        if (modalPositioning.container && !modalPositioning.container.isCenteredInViewport.vertically) {
            report.issues.push({
                type: 'modal-not-centered',
                message: '模态框未在视口中心显示',
                severity: 'medium',
                details: modalPositioning.container
            });
        }
        
        // 保存报告
        require('fs').writeFileSync(
            'debug/modal-positioning-flicker-report.json',
            JSON.stringify(report, null, 2)
        );
        
        const markdownReport = `# 模态框定位和鼠标悬停闪烁诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 页面状态（滚动到数据表后）
\`\`\`json
${JSON.stringify(pageState, null, 2)}
\`\`\`

## 模态框定位分析
\`\`\`json
${JSON.stringify(modalPositioning, null, 2)}
\`\`\`

## 滚动后定位
\`\`\`json
${JSON.stringify(afterScrollPositioning, null, 2)}
\`\`\`

## 鼠标悬停期间消息 (${hoverMessages.length}条)
${hoverMessages.map(msg => `- [${msg.type}] ${msg.text}`).join('\n')}

## 闪烁模式检测 (${flickerPatterns.length}条)
${flickerPatterns.map(msg => `- [闪烁] ${msg.text}`).join('\n')}

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
- debug/modal-pos-01-initial.png - 初始状态
- debug/modal-pos-02-scrolled-to-table.png - 滚动到数据表
- debug/modal-pos-03-modal-opened.png - 模态框打开
- debug/modal-pos-04-after-scroll.png - 滚动后状态
- debug/modal-pos-05-mouse-hover.png - 鼠标悬停

## 修复建议

${report.issues.length === 0 ? '🎉 模态框定位正常！' : `
基于诊断结果，建议进行以下修复：

### 定位修复
1. 确保backdrop使用正确的fixed定位
2. 将模态框居中显示在视口中心
3. 防止模态框跟随页面滚动

### 闪烁修复
1. 改进事件处理逻辑，避免鼠标悬停时的误触发
2. 增强初始化保护机制
3. 优化事件边界检测
`}

## 结论
${report.issues.length === 0 ? '✅ 模态框定位和交互正常。' : `⚠️ 发现 ${report.issues.length} 个问题需要修复。`}
`;

        require('fs').writeFileSync(
            'debug/modal-positioning-flicker-report.md',
            markdownReport
        );
        
        console.log('📊 模态框定位和闪烁诊断完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseModalPositioningFlicker().catch(console.error);
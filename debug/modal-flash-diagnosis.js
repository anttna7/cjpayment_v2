const { chromium } = require('playwright');

async function diagnoseModalFlashIssue() {
    console.log('🔧 MCP诊断: 模态框闪现到居中位置问题...');
    
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
        console.log('📊 访问仪表板页面...');
        await page.goto('http://localhost:8091/dashboard', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        // 截图：初始状态
        await page.screenshot({ path: 'debug/flash-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/flash-01-initial.png');
        
        console.log('🔍 测试模态框初始位置问题...');
        
        // 查找导出按钮
        const exportButtons = await page.$$eval('button', buttons => 
            buttons.map((btn, index) => ({
                index,
                text: btn.textContent.trim(),
                onclick: btn.getAttribute('onclick'),
                id: btn.id,
                className: btn.className
            })).filter(btn => 
                btn.text.includes('导出') || 
                btn.onclick?.includes('showModal') ||
                btn.id?.includes('export')
            )
        );
        
        console.log('找到的导出按钮:', JSON.stringify(exportButtons, null, 2));
        
        if (exportButtons.length === 0) {
            console.log('未找到导出按钮，创建测试按钮...');
            // 创建测试按钮
            await page.evaluate(() => {
                const testBtn = document.createElement('button');
                testBtn.textContent = '测试导出';
                testBtn.onclick = () => showModal('exportModal');
                testBtn.style.position = 'fixed';
                testBtn.style.top = '10px';
                testBtn.style.right = '10px';
                testBtn.style.zIndex = '10000';
                testBtn.style.background = 'red';
                testBtn.style.color = 'white';
                testBtn.style.padding = '10px';
                testBtn.id = 'testExportBtn';
                document.body.appendChild(testBtn);
            });
            
            await page.waitForTimeout(500);
        }
        
        // 滚动页面到中间位置
        await page.evaluate(() => {
            window.scrollTo(0, 500);
        });
        await page.waitForTimeout(1000);
        
        console.log('📍 第1步: 分析模态框打开瞬间的位置...');
        
        // 点击导出按钮并立即分析位置
        const targetButton = exportButtons.length > 0 ? 
            `button:nth-of-type(${exportButtons[0].index + 1})` : 
            '#testExportBtn';
            
        await page.click(targetButton);
        
        // 立即分析模态框位置（不等待）
        const immediatePosition = await page.evaluate(() => {
            const modal = document.getElementById('exportModal');
            if (!modal) return { error: '模态框未找到' };
            
            const rect = modal.getBoundingClientRect();
            const styles = window.getComputedStyle(modal);
            const content = modal.querySelector('.modal-content');
            const contentRect = content ? content.getBoundingClientRect() : null;
            
            return {
                timestamp: Date.now(),
                modal: {
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
                        transform: styles.transform
                    },
                    classes: modal.className,
                    visible: styles.display !== 'none'
                },
                content: contentRect ? {
                    rect: {
                        top: contentRect.top,
                        left: contentRect.left,
                        width: contentRect.width,
                        height: contentRect.height
                    }
                } : null,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                }
            };
        });
        
        console.log('模态框打开瞬间位置:', JSON.stringify(immediatePosition, null, 2));
        
        // 截图：模态框刚打开
        await page.screenshot({ path: 'debug/flash-02-just-opened.png', fullPage: true });
        console.log('📸 截图已保存: debug/flash-02-just-opened.png');
        
        // 等待一下，再次分析位置
        await page.waitForTimeout(100);
        
        const afterDelayPosition = await page.evaluate(() => {
            const modal = document.getElementById('exportModal');
            if (!modal) return { error: '模态框未找到' };
            
            const rect = modal.getBoundingClientRect();
            const content = modal.querySelector('.modal-content');
            const contentRect = content ? content.getBoundingClientRect() : null;
            
            return {
                timestamp: Date.now(),
                modal: {
                    rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    }
                },
                content: contentRect ? {
                    rect: {
                        top: contentRect.top,
                        left: contentRect.left,
                        width: contentRect.width,
                        height: contentRect.height
                    }
                } : null
            };
        });
        
        console.log('模态框100ms后位置:', JSON.stringify(afterDelayPosition, null, 2));
        
        console.log('📍 第2步: 测试滚动时模态框位置...');
        
        // 滚动页面
        await page.evaluate(() => {
            window.scrollTo(0, 800);
        });
        await page.waitForTimeout(500);
        
        const scrollPosition = await page.evaluate(() => {
            const modal = document.getElementById('exportModal');
            if (!modal) return { error: '模态框未找到' };
            
            const rect = modal.getBoundingClientRect();
            
            return {
                timestamp: Date.now(),
                modal: {
                    rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    }
                },
                scroll: {
                    x: window.scrollX,
                    y: window.scrollY
                }
            };
        });
        
        console.log('滚动后模态框位置:', JSON.stringify(scrollPosition, null, 2));
        
        // 截图：滚动后状态
        await page.screenshot({ path: 'debug/flash-03-after-scroll.png', fullPage: true });
        console.log('📸 截图已保存: debug/flash-03-after-scroll.png');
        
        console.log('📍 第3步: 测试关闭时的闪现...');
        
        // 监听关闭过程中的位置变化
        const closePositions = [];
        
        // 设置定时器监听位置变化
        const positionMonitor = await page.evaluateHandle(() => {
            const positions = [];
            const modal = document.getElementById('exportModal');
            
            const monitor = setInterval(() => {
                if (modal) {
                    const rect = modal.getBoundingClientRect();
                    const styles = window.getComputedStyle(modal);
                    positions.push({
                        timestamp: Date.now(),
                        rect: {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height
                        },
                        display: styles.display,
                        className: modal.className
                    });
                }
            }, 10); // 每10ms记录一次位置
            
            return { monitor, positions };
        });
        
        // 点击关闭按钮
        await page.keyboard.press('Escape');
        
        // 等待动画完成
        await page.waitForTimeout(500);
        
        // 停止监听并获取位置记录
        const positionData = await page.evaluate((monitorHandle) => {
            clearInterval(monitorHandle.monitor);
            return monitorHandle.positions;
        }, positionMonitor);
        
        console.log('关闭过程中位置变化:', JSON.stringify(positionData.slice(-10), null, 2));
        
        // 截图：关闭后状态
        await page.screenshot({ path: 'debug/flash-04-after-close.png', fullPage: true });
        console.log('📸 截图已保存: debug/flash-04-after-close.png');
        
        // 生成诊断报告
        const report = {
            timestamp: new Date().toISOString(),
            immediatePosition,
            afterDelayPosition,
            scrollPosition,
            closePositions: positionData,
            issues: []
        };
        
        // 分析问题
        if (immediatePosition.modal && (
            immediatePosition.modal.rect.top < -50 || 
            immediatePosition.modal.rect.left < -50 ||
            immediatePosition.modal.rect.top > 50 ||
            immediatePosition.modal.rect.left > 50
        )) {
            report.issues.push({
                type: 'modal-initial-position-wrong',
                message: '模态框初始位置不在视口中心',
                severity: 'high',
                details: immediatePosition.modal.rect
            });
        }
        
        if (scrollPosition.modal && immediatePosition.modal && (
            Math.abs(scrollPosition.modal.rect.top - immediatePosition.modal.rect.top) > 10 ||
            Math.abs(scrollPosition.modal.rect.left - immediatePosition.modal.rect.left) > 10
        )) {
            report.issues.push({
                type: 'modal-follows-scroll',
                message: '模态框跟随页面滚动，没有固定在视口',
                severity: 'high',
                details: {
                    initial: immediatePosition.modal.rect,
                    afterScroll: scrollPosition.modal.rect
                }
            });
        }
        
        if (positionData.length > 5) {
            const firstPos = positionData[0];
            const lastPos = positionData[positionData.length - 1];
            
            if (firstPos && lastPos && (
                Math.abs(firstPos.rect.top - lastPos.rect.top) > 50 ||
                Math.abs(firstPos.rect.left - lastPos.rect.left) > 50
            )) {
                report.issues.push({
                    type: 'modal-flash-during-close',
                    message: '模态框关闭时出现位置闪现',
                    severity: 'medium',
                    details: {
                        startPosition: firstPos.rect,
                        endPosition: lastPos.rect
                    }
                });
            }
        }
        
        // 保存报告
        require('fs').writeFileSync(
            'debug/modal-flash-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        const markdownReport = `# 模态框闪现问题诊断报告

## 诊断概要
- **执行时间**: ${report.timestamp}
- **发现问题**: ${report.issues.length}

## 模态框打开瞬间位置
\`\`\`json
${JSON.stringify(immediatePosition, null, 2)}
\`\`\`

## 100ms后位置
\`\`\`json
${JSON.stringify(afterDelayPosition, null, 2)}
\`\`\`

## 滚动后位置
\`\`\`json
${JSON.stringify(scrollPosition, null, 2)}
\`\`\`

## 关闭过程位置变化（最后10个记录）
\`\`\`json
${JSON.stringify(positionData.slice(-10), null, 2)}
\`\`\`

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
- debug/flash-01-initial.png - 初始状态
- debug/flash-02-just-opened.png - 模态框刚打开
- debug/flash-03-after-scroll.png - 滚动后状态
- debug/flash-04-after-close.png - 关闭后状态

## 结论
${report.issues.length === 0 ? '✅ 模态框显示正常，无闪现问题。' : `⚠️ 发现 ${report.issues.length} 个问题需要修复。`}
`;
        
        require('fs').writeFileSync(
            'debug/modal-flash-diagnosis-report.md',
            markdownReport
        );
        
        console.log('📊 模态框闪现问题诊断完成');
        console.log(`📋 详细报告: debug/modal-flash-diagnosis-report.md`);
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseModalFlashIssue().catch(console.error);
const { chromium } = require('playwright');

async function verifyModalPositioningFix() {
    console.log('🔧 MCP验证: 模态框定位修复效果...');
    
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
        await page.screenshot({ path: 'debug/fix-verify-01-initial.png', fullPage: true });
        console.log('📸 截图已保存: debug/fix-verify-01-initial.png');
        
        console.log('🔍 滚动到数据表区域...');
        
        // 滚动到数据表区域
        await page.evaluate(() => {
            const dataTable = document.getElementById('advancedDataTableContainer');
            if (dataTable) {
                dataTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        await page.waitForTimeout(1000);
        
        // 获取滚动状态
        const scrollState = await page.evaluate(() => {
            return {
                scrollY: window.scrollY,
                viewportHeight: window.innerHeight
            };
        });
        
        console.log(`页面滚动状态: Y=${scrollState.scrollY}, 视口高度=${scrollState.viewportHeight}`);
        
        // 截图：滚动后状态
        await page.screenshot({ path: 'debug/fix-verify-02-scrolled.png', fullPage: true });
        console.log('📸 截图已保存: debug/fix-verify-02-scrolled.png');
        
        console.log('🎯 打开高级筛选模态框...');
        
        // 点击高级筛选按钮
        await page.click('#advancedFiltersToggle');
        await page.waitForTimeout(500);
        
        // 分析修复后的模态框定位
        const fixedModalPositioning = await page.evaluate(() => {
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
                        height: rect.height
                    },
                    styles: {
                        position: styles.position,
                        top: styles.top,
                        left: styles.left,
                        width: styles.width,
                        height: styles.height,
                        zIndex: styles.zIndex,
                        pointerEvents: styles.pointerEvents
                    },
                    // 检查是否真正固定在视口
                    isProperlyFixed: styles.position === 'fixed' && 
                                   Math.abs(rect.top) < 5 && 
                                   Math.abs(rect.left) < 5,
                    coversFullViewport: rect.width >= window.innerWidth - 10 && 
                                      rect.height >= window.innerHeight - 10
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
                        pointerEvents: styles.pointerEvents,
                        zIndex: styles.zIndex
                    },
                    isCenteredInViewport: {
                        horizontally: Math.abs((rect.left + rect.width / 2) - (window.innerWidth / 2)) < 30,
                        vertically: Math.abs((rect.top + rect.height / 2) - (window.innerHeight / 2)) < 30
                    },
                    isFullyVisible: rect.top >= 0 && rect.left >= 0 && 
                                  rect.bottom <= window.innerHeight && 
                                  rect.right <= window.innerWidth
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
        
        console.log('修复后模态框定位分析:', JSON.stringify(fixedModalPositioning, null, 2));
        
        // 截图：修复后模态框
        await page.screenshot({ path: 'debug/fix-verify-03-modal-fixed.png', fullPage: true });
        console.log('📸 截图已保存: debug/fix-verify-03-modal-fixed.png');
        
        console.log('📜 测试滚动时的模态框稳定性...');
        
        // 进一步向上滚动，测试模态框是否保持固定
        await page.evaluate(() => {
            window.scrollTo(0, Math.max(0, window.scrollY - 500));
        });
        
        await page.waitForTimeout(500);
        
        // 分析滚动后模态框是否仍然固定在视口
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
                    isStillFixed: Math.abs(backdropRect.top) < 5 && Math.abs(backdropRect.left) < 5,
                    coversViewport: backdropRect.width >= window.innerWidth - 10
                } : null,
                container: containerRect ? {
                    top: containerRect.top,
                    left: containerRect.left,
                    centerY: containerRect.top + containerRect.height / 2,
                    isStillCentered: Math.abs((containerRect.top + containerRect.height / 2) - (window.innerHeight / 2)) < 30,
                    isFullyVisible: containerRect.top >= 0 && containerRect.bottom <= window.innerHeight
                } : null
            };
        });
        
        console.log('滚动后定位稳定性:', JSON.stringify(afterScrollPositioning, null, 2));
        
        // 截图：滚动后仍然固定
        await page.screenshot({ path: 'debug/fix-verify-04-scroll-stability.png', fullPage: true });
        console.log('📸 截图已保存: debug/fix-verify-04-scroll-stability.png');
        
        console.log('🖱️ 测试鼠标交互...');
        
        const messagesBeforeHover = consoleMessages.length;
        
        // 将鼠标移动到模态框中心进行交互测试
        if (afterScrollPositioning.container) {
            const hoverX = afterScrollPositioning.container.left + 544; // 容器宽度一半
            const hoverY = afterScrollPositioning.container.centerY;
            
            console.log(`鼠标移动到模态框中心: (${hoverX}, ${hoverY})`);
            
            // 移动鼠标并测试交互
            await page.mouse.move(hoverX, hoverY, { steps: 5 });
            await page.waitForTimeout(500);
            
            // 在模态框内移动，测试是否稳定
            for (let i = 0; i < 3; i++) {
                await page.mouse.move(hoverX + (i * 20), hoverY + (i * 10));
                await page.waitForTimeout(200);
            }
            
            // 截图：鼠标交互测试
            await page.screenshot({ path: 'debug/fix-verify-05-mouse-interaction.png', fullPage: true });
            console.log('📸 截图已保存: debug/fix-verify-05-mouse-interaction.png');
        }
        
        // 分析交互期间的消息
        const interactionMessages = consoleMessages.slice(messagesBeforeHover);
        console.log(`鼠标交互期间新增消息: ${interactionMessages.length} 条`);
        
        // 检查是否有闪烁或错误
        const flickerPatterns = interactionMessages.filter(msg => 
            msg.text.includes('关闭模态框') || 
            msg.text.includes('外部点击') ||
            msg.text.includes('闪烁') ||
            msg.text.includes('错误')
        );
        
        console.log(`检测到问题模式: ${flickerPatterns.length} 条`);
        flickerPatterns.forEach(msg => {
            console.log(`  - [问题] ${msg.text}`);
        });
        
        // 测试背景点击关闭功能
        console.log('🎯 测试背景点击关闭...');
        
        // 点击背景区域
        await page.mouse.click(50, 50); // 点击左上角背景
        await page.waitForTimeout(1000);
        
        // 检查模态框是否正确关闭
        const modalClosedCheck = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            return {
                isHidden: backdrop ? backdrop.style.display === 'none' || !backdrop.classList.contains('show') : true,
                styles: backdrop ? {
                    display: backdrop.style.display,
                    className: backdrop.className
                } : null
            };
        });
        
        console.log('背景点击关闭测试:', JSON.stringify(modalClosedCheck, null, 2));
        
        // 截图：最终状态
        await page.screenshot({ path: 'debug/fix-verify-06-final-state.png', fullPage: true });
        console.log('📸 截图已保存: debug/fix-verify-06-final-state.png');
        
        // 生成验证报告
        const verificationReport = {
            timestamp: new Date().toISOString(),
            fixedModalPositioning,
            afterScrollPositioning,
            interactionMessages,
            flickerPatterns,
            modalClosedCheck,
            testResults: []
        };
        
        // 分析测试结果
        if (fixedModalPositioning.backdrop?.isProperlyFixed) {
            verificationReport.testResults.push({
                test: 'backdrop-fixed-positioning',
                status: 'PASS',
                message: 'Backdrop正确固定在视口'
            });
        } else {
            verificationReport.testResults.push({
                test: 'backdrop-fixed-positioning',
                status: 'FAIL',
                message: 'Backdrop定位仍然有问题',
                details: fixedModalPositioning.backdrop
            });
        }
        
        if (fixedModalPositioning.container?.isCenteredInViewport.vertically && 
            fixedModalPositioning.container?.isCenteredInViewport.horizontally) {
            verificationReport.testResults.push({
                test: 'container-centering',
                status: 'PASS',
                message: '模态框正确在视口中心显示'
            });
        } else {
            verificationReport.testResults.push({
                test: 'container-centering',
                status: 'FAIL',
                message: '模态框居中仍然有问题',
                details: fixedModalPositioning.container
            });
        }
        
        if (afterScrollPositioning.backdrop?.isStillFixed) {
            verificationReport.testResults.push({
                test: 'scroll-stability',
                status: 'PASS',
                message: '滚动时模态框保持固定'
            });
        } else {
            verificationReport.testResults.push({
                test: 'scroll-stability',
                status: 'FAIL',
                message: '滚动时模态框跟随页面移动',
                details: afterScrollPositioning.backdrop
            });
        }
        
        if (flickerPatterns.length === 0) {
            verificationReport.testResults.push({
                test: 'mouse-interaction-stability',
                status: 'PASS',
                message: '鼠标交互无闪烁问题'
            });
        } else {
            verificationReport.testResults.push({
                test: 'mouse-interaction-stability',
                status: 'FAIL',
                message: `鼠标交互检测到 ${flickerPatterns.length} 个问题`,
                details: flickerPatterns
            });
        }
        
        if (modalClosedCheck.isHidden) {
            verificationReport.testResults.push({
                test: 'background-click-close',
                status: 'PASS',
                message: '背景点击正确关闭模态框'
            });
        } else {
            verificationReport.testResults.push({
                test: 'background-click-close',
                status: 'FAIL',
                message: '背景点击无法关闭模态框',
                details: modalClosedCheck
            });
        }
        
        // 保存详细报告
        require('fs').writeFileSync(
            'debug/modal-positioning-fix-verification-report.json',
            JSON.stringify(verificationReport, null, 2)
        );
        
        // 生成Markdown报告
        const passedTests = verificationReport.testResults.filter(t => t.status === 'PASS').length;
        const totalTests = verificationReport.testResults.length;
        const overallStatus = passedTests === totalTests ? '✅ 全部通过' : `⚠️ ${passedTests}/${totalTests} 通过`;
        
        const markdownReport = `# 模态框定位修复验证报告

## 验证概要
- **执行时间**: ${verificationReport.timestamp}
- **测试结果**: ${overallStatus}
- **通过测试**: ${passedTests}/${totalTests}

## 测试结果详情

${verificationReport.testResults.map((result, index) => `
### ${index + 1}. ${result.test}
**状态**: ${result.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
**消息**: ${result.message}
${result.details ? `
**详情**: 
\`\`\`json
${JSON.stringify(result.details, null, 2)}
\`\`\`
` : ''}
`).join('')}

## 修复后定位分析
\`\`\`json
${JSON.stringify(fixedModalPositioning, null, 2)}
\`\`\`

## 滚动后稳定性分析
\`\`\`json
${JSON.stringify(afterScrollPositioning, null, 2)}
\`\`\`

## 截图记录
- debug/fix-verify-01-initial.png - 初始状态
- debug/fix-verify-02-scrolled.png - 滚动后状态
- debug/fix-verify-03-modal-fixed.png - 修复后模态框
- debug/fix-verify-04-scroll-stability.png - 滚动稳定性测试
- debug/fix-verify-05-mouse-interaction.png - 鼠标交互测试
- debug/fix-verify-06-final-state.png - 最终状态

## 结论

${passedTests === totalTests ? 
`🎉 **修复成功！** 所有测试通过，模态框定位问题已完全解决。

### 修复效果:
- ✅ Backdrop正确固定在视口，不跟随页面滚动
- ✅ 模态框在视口中心正确显示
- ✅ 滚动时保持稳定定位
- ✅ 鼠标交互无闪烁问题
- ✅ 背景点击正常关闭模态框` :
`⚠️ **需要进一步修复。** ${totalTests - passedTests} 个测试未通过。

### 仍需解决的问题:
${verificationReport.testResults.filter(t => t.status === 'FAIL').map(t => `- ${t.message}`).join('\n')}
`}
`;
        
        require('fs').writeFileSync(
            'debug/modal-positioning-fix-verification-report.md',
            markdownReport
        );
        
        console.log('📊 模态框定位修复验证完成');
        console.log(`✅ 通过测试: ${passedTests}/${totalTests}`);
        console.log(`📋 详细报告: debug/modal-positioning-fix-verification-report.md`);
        
    } catch (error) {
        console.error('❌ 验证过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

verifyModalPositioningFix().catch(console.error);
const { chromium } = require('playwright');

async function detectModalFlashIssue() {
    console.log('🔍 检测模态框初始闪现问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 访问仪表板
        await page.goto('http://localhost:8091/dashboard', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(2000);
        
        // 注入监听器来捕获模态框位置变化
        await page.evaluate(() => {
            window.modalPositionHistory = [];
            window.modalFlashDetector = {
                startTime: null,
                positions: [],
                
                recordPosition(modalId) {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        const rect = modal.getBoundingClientRect();
                        const style = window.getComputedStyle(modal);
                        const timestamp = performance.now();
                        
                        const position = {
                            time: timestamp,
                            relativeTime: this.startTime ? timestamp - this.startTime : 0,
                            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                            styles: {
                                display: style.display,
                                position: style.position,
                                top: style.top,
                                left: style.left,
                                transform: style.transform
                            },
                            classes: modal.className,
                            isVisible: rect.width > 0 && rect.height > 0,
                            isCentered: Math.abs(rect.x + rect.width/2 - window.innerWidth/2) < 50 &&
                                      Math.abs(rect.y + rect.height/2 - window.innerHeight/2) < 50
                        };
                        
                        this.positions.push(position);
                        console.log(`📍 时间 ${position.relativeTime.toFixed(1)}ms: 位置 (${rect.x}, ${rect.y}), 居中: ${position.isCentered}`);
                        return position;
                    }
                    return null;
                },
                
                startTracking(modalId) {
                    this.startTime = performance.now();
                    this.positions = [];
                    console.log(`🎬 开始追踪模态框 ${modalId} 的位置变化...`);
                    
                    // 立即记录一次
                    this.recordPosition(modalId);
                    
                    // 设置高频监听器
                    const trackingInterval = setInterval(() => {
                        const position = this.recordPosition(modalId);
                        if (position && position.relativeTime > 2000) {
                            clearInterval(trackingInterval);
                            console.log('📊 位置追踪完成');
                        }
                    }, 16); // 约60fps
                    
                    return trackingInterval;
                }
            };
        });
        
        console.log('🎯 测试仪表板导出模态框初始显示...');
        
        // 开始追踪并点击按钮
        await page.evaluate(() => {
            window.modalFlashDetector.startTracking('exportDashboardModal');
        });
        
        // 点击导出按钮
        await page.click('#exportDashboard');
        
        // 等待追踪完成
        await page.waitForTimeout(3000);
        
        // 获取位置历史
        const positionHistory = await page.evaluate(() => {
            return window.modalFlashDetector.positions;
        });
        
        console.log(`📊 捕获到 ${positionHistory.length} 个位置记录`);
        
        // 分析闪现问题
        const analysis = analyzeFlashIssue(positionHistory);
        
        // 截图当前状态
        await page.screenshot({ path: 'debug/flash-detection-result.png', fullPage: true });
        
        // 关闭模态框
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        
        console.log('🎯 测试交易导出模态框...');
        
        // 重置并测试交易模态框
        await page.evaluate(() => {
            window.modalFlashDetector.startTracking('exportTransactionsModal');
        });
        
        await page.click('#exportTransactions');
        await page.waitForTimeout(3000);
        
        const transactionHistory = await page.evaluate(() => {
            return window.modalFlashDetector.positions;
        });
        
        const transactionAnalysis = analyzeFlashIssue(transactionHistory);
        
        // 保存分析报告
        const report = {
            dashboard: { history: positionHistory, analysis },
            transactions: { history: transactionHistory, analysis: transactionAnalysis },
            timestamp: new Date().toISOString()
        };
        
        require('fs').writeFileSync('debug/flash-detection-report.json', JSON.stringify(report, null, 2));
        
        console.log('📋 闪现检测报告已保存: debug/flash-detection-report.json');
        
        return report;
        
    } catch (error) {
        console.error('❌ 检测过程出错:', error.message);
        return { error: error.message };
    } finally {
        await browser.close();
    }
}

function analyzeFlashIssue(positions) {
    if (positions.length === 0) {
        return { issue: 'no_data', message: '没有捕获到位置数据' };
    }
    
    const firstVisible = positions.find(p => p.isVisible);
    if (!firstVisible) {
        return { issue: 'not_visible', message: '模态框始终不可见' };
    }
    
    const firstVisibleIndex = positions.indexOf(firstVisible);
    const subsequentPositions = positions.slice(firstVisibleIndex);
    
    // 检查位置是否有显著变化
    const positionChanges = [];
    for (let i = 1; i < subsequentPositions.length; i++) {
        const prev = subsequentPositions[i - 1];
        const curr = subsequentPositions[i];
        
        const xDiff = Math.abs(curr.rect.x - prev.rect.x);
        const yDiff = Math.abs(curr.rect.y - prev.rect.y);
        
        if (xDiff > 10 || yDiff > 10) {
            positionChanges.push({
                time: curr.relativeTime,
                from: { x: prev.rect.x, y: prev.rect.y, centered: prev.isCentered },
                to: { x: curr.rect.x, y: curr.rect.y, centered: curr.isCentered },
                diff: { x: xDiff, y: yDiff }
            });
        }
    }
    
    const hasFlash = positionChanges.length > 0;
    const startsOffCenter = firstVisible && !firstVisible.isCentered;
    const eventuallyCenter = subsequentPositions.some(p => p.isCentered);
    
    return {
        issue: hasFlash ? 'position_flash' : (startsOffCenter ? 'initial_position' : 'none'),
        hasFlash,
        startsOffCenter,
        eventuallyCenter,
        positionChanges,
        firstVisiblePosition: firstVisible,
        totalFrames: positions.length,
        message: hasFlash 
            ? `检测到 ${positionChanges.length} 次位置跳跃`
            : startsOffCenter 
                ? '初始位置不居中但无跳跃'
                : '位置正常，无闪现问题'
    };
}

detectModalFlashIssue().then(result => {
    console.log('\n🔍 闪现检测完成');
    if (result.dashboard) {
        console.log('仪表板模态框:', result.dashboard.analysis.message);
    }
    if (result.transactions) {
        console.log('交易模态框:', result.transactions.analysis.message);
    }
}).catch(console.error);
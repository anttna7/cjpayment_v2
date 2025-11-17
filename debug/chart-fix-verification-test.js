/**
 * 图表修复验证测试
 * 验证状态图表是否能正常加载和显示
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function verifyChartFix() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 500,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
        summary: {
            passed: 0,
            failed: 0,
            total: 0
        }
    };
    
    try {
        console.log('🔍 开始验证图表修复...');
        
        // 1. 导航到仪表板
        console.log('📍 导航到仪表板页面');
        await page.goto('http://localhost:8091/dashboard', { waitUntil: 'networkidle2' });
        
        // 等待页面完全加载
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. 检查Canvas元素是否存在
        console.log('🔍 检查Canvas元素...');
        const canvasElements = await page.evaluate(() => {
            return {
                trendCanvas: !!document.getElementById('trendChartCanvas'),
                statusCanvas: !!document.getElementById('statusChartCanvas'),
                trendContainer: !!document.getElementById('trendChart'),
                statusContainer: !!document.getElementById('statusChart')
            };
        });
        
        results.tests.push({
            name: 'Canvas元素存在性检查',
            status: canvasElements.trendCanvas && canvasElements.statusCanvas ? 'PASS' : 'FAIL',
            details: canvasElements
        });
        
        // 3. 检查Chart.js是否加载
        console.log('📊 检查Chart.js加载状态...');
        const chartJSLoaded = await page.evaluate(() => {
            return typeof Chart !== 'undefined';
        });
        
        results.tests.push({
            name: 'Chart.js加载检查',
            status: chartJSLoaded ? 'PASS' : 'FAIL',
            details: { chartJSLoaded }
        });
        
        // 4. 等待图表初始化
        console.log('⏳ 等待图表初始化...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 5. 检查图表是否创建成功
        const chartStatus = await page.evaluate(() => {
            const manager = window.dashboardChartsManager;
            if (!manager) {
                return { error: '图表管理器未初始化' };
            }
            
            return {
                managerExists: !!manager,
                trendChart: !!manager.charts.trend,
                statusChart: !!manager.charts.status,
                chartCount: Object.keys(manager.charts).length
            };
        });
        
        results.tests.push({
            name: '图表创建状态检查',
            status: chartStatus.trendChart && chartStatus.statusChart ? 'PASS' : 'FAIL',
            details: chartStatus
        });
        
        // 6. 检查Canvas内容是否有实际绘制
        const canvasContent = await page.evaluate(() => {
            const trendCanvas = document.getElementById('trendChartCanvas');
            const statusCanvas = document.getElementById('statusChartCanvas');
            
            const hasContent = (canvas) => {
                if (!canvas) return false;
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // 检查是否有非透明像素
                for (let i = 3; i < data.length; i += 4) {
                    if (data[i] > 0) return true;
                }
                return false;
            };
            
            return {
                trendHasContent: hasContent(trendCanvas),
                statusHasContent: hasContent(statusCanvas),
                trendSize: trendCanvas ? `${trendCanvas.width}x${trendCanvas.height}` : 'N/A',
                statusSize: statusCanvas ? `${statusCanvas.width}x${statusCanvas.height}` : 'N/A'
            };
        });
        
        results.tests.push({
            name: 'Canvas内容渲染检查',
            status: canvasContent.trendHasContent && canvasContent.statusHasContent ? 'PASS' : 'FAIL',
            details: canvasContent
        });
        
        // 7. 检查布局优化效果
        const layoutOptimization = await page.evaluate(() => {
            const dualRow = document.querySelector('.dashboard__chart-row--dual');
            const trendCard = document.querySelector('.card--chart-trend');
            const statusCard = document.querySelector('.card--chart-status');
            
            if (!dualRow || !trendCard || !statusCard) {
                return { error: '布局元素未找到' };
            }
            
            const dualRowRect = dualRow.getBoundingClientRect();
            const trendRect = trendCard.getBoundingClientRect();
            const statusRect = statusCard.getBoundingClientRect();
            
            return {
                dualRowDisplay: window.getComputedStyle(dualRow).display,
                trendWidth: Math.round((trendRect.width / dualRowRect.width) * 100),
                statusWidth: Math.round((statusRect.width / dualRowRect.width) * 100),
                gap: trendRect.right < statusRect.left,
                totalUtilization: Math.round(((trendRect.width + statusRect.width) / dualRowRect.width) * 100)
            };
        });
        
        results.tests.push({
            name: '布局优化效果检查',
            status: layoutOptimization.dualRowDisplay === 'flex' && 
                   layoutOptimization.trendWidth >= 58 && 
                   layoutOptimization.statusWidth >= 35 ? 'PASS' : 'FAIL',
            details: layoutOptimization
        });
        
        // 8. 截图记录最终状态
        console.log('📸 截图记录最终状态...');
        await page.screenshot({ 
            path: 'debug/chart-fix-verification-final.png',
            fullPage: true
        });
        
        // 统计测试结果
        results.summary.total = results.tests.length;
        results.summary.passed = results.tests.filter(t => t.status === 'PASS').length;
        results.summary.failed = results.summary.total - results.summary.passed;
        
        console.log(`\n✅ 测试完成: ${results.summary.passed}/${results.summary.total} 通过`);
        
        // 保存测试报告
        await fs.writeFile('debug/chart-fix-verification-report.json', JSON.stringify(results, null, 2));
        
        // 生成详细报告
        const reportContent = generateDetailedReport(results);
        await fs.writeFile('debug/CHART_FIX_VERIFICATION_REPORT.md', reportContent);
        
        console.log('📄 测试报告已保存');
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        results.error = error.message;
    } finally {
        await browser.close();
    }
    
    return results;
}

function generateDetailedReport(results) {
    const passRate = Math.round((results.summary.passed / results.summary.total) * 100);
    
    let report = `# 图表修复验证报告\n\n`;
    report += `**测试时间**: ${results.timestamp}\n`;
    report += `**通过率**: ${passRate}% (${results.summary.passed}/${results.summary.total})\n\n`;
    
    report += `## 测试结果概览\n\n`;
    results.tests.forEach((test, index) => {
        const status = test.status === 'PASS' ? '✅' : '❌';
        report += `${index + 1}. ${status} **${test.name}**: ${test.status}\n`;
    });
    
    report += `\n## 详细测试结果\n\n`;
    results.tests.forEach((test, index) => {
        report += `### ${index + 1}. ${test.name}\n\n`;
        report += `**状态**: ${test.status}\n\n`;
        report += `**详细信息**:\n`;
        report += '```json\n';
        report += JSON.stringify(test.details, null, 2);
        report += '\n```\n\n';
    });
    
    if (results.summary.failed > 0) {
        report += `## 问题分析\n\n`;
        const failedTests = results.tests.filter(t => t.status === 'FAIL');
        failedTests.forEach(test => {
            report += `- **${test.name}**: 需要进一步调试\n`;
        });
    }
    
    report += `\n## 建议\n\n`;
    if (passRate >= 80) {
        report += `图表优化基本成功，主要功能正常。\n`;
    } else {
        report += `需要进一步调试和修复失败的测试项。\n`;
    }
    
    return report;
}

// 执行测试
verifyChartFix().then(results => {
    if (results.summary.passed === results.summary.total) {
        console.log('🎉 所有测试通过！');
        process.exit(0);
    } else {
        console.log('⚠️ 部分测试失败，请检查报告');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 测试执行异常:', error);
    process.exit(1);
});
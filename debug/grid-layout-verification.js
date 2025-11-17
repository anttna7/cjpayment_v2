/**
 * 网格布局验证测试
 * 验证交易趋势分析和交易状态分布是否等高等宽且布满行
 */

const puppeteer = require('puppeteer');

async function verifyGridLayout() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 300,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    try {
        console.log('🔍 验证网格布局修复...');
        
        // 导航到仪表板
        await page.goto('http://localhost:8091/dashboard', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 测量布局效果
        const layoutMeasurement = await page.evaluate(() => {
            const dualRow = document.querySelector('.dashboard__chart-row--dual');
            const trendCard = document.querySelector('.card--chart-trend');
            const statusCard = document.querySelector('.card--chart-status');
            
            if (!dualRow || !trendCard || !statusCard) {
                return { error: '无法找到布局元素' };
            }
            
            const dualRowRect = dualRow.getBoundingClientRect();
            const trendRect = trendCard.getBoundingClientRect();
            const statusRect = statusCard.getBoundingClientRect();
            
            // 计算尺寸比较
            const widthDiff = Math.abs(trendRect.width - statusRect.width);
            const heightDiff = Math.abs(trendRect.height - statusRect.height);
            
            // 检查是否填满行
            const totalWidth = trendRect.width + statusRect.width;
            const gap = statusRect.left - trendRect.right;
            const expectedTotalWidth = dualRowRect.width - gap;
            const widthUtilization = (totalWidth / expectedTotalWidth) * 100;
            
            return {
                layout: {
                    display: window.getComputedStyle(dualRow).display,
                    gridTemplateColumns: window.getComputedStyle(dualRow).gridTemplateColumns
                },
                dimensions: {
                    trendWidth: Math.round(trendRect.width),
                    statusWidth: Math.round(statusRect.width),
                    trendHeight: Math.round(trendRect.height),
                    statusHeight: Math.round(statusRect.height),
                    widthDiff: Math.round(widthDiff),
                    heightDiff: Math.round(heightDiff)
                },
                utilization: {
                    widthUtilization: Math.round(widthUtilization),
                    gap: Math.round(gap),
                    totalWidth: Math.round(totalWidth),
                    containerWidth: Math.round(dualRowRect.width)
                },
                equal: {
                    equalWidth: widthDiff < 5,
                    equalHeight: heightDiff < 5,
                    fillsRow: widthUtilization > 95
                }
            };
        });
        
        // 截图记录
        await page.screenshot({ 
            path: 'debug/grid-layout-fixed.png',
            fullPage: true
        });
        
        console.log('\n📊 布局测量结果:');
        console.log('• 显示类型:', layoutMeasurement.layout.display);
        console.log('• 网格列:', layoutMeasurement.layout.gridTemplateColumns);
        console.log('• 趋势卡片:', `${layoutMeasurement.dimensions.trendWidth}×${layoutMeasurement.dimensions.trendHeight}`);
        console.log('• 状态卡片:', `${layoutMeasurement.dimensions.statusWidth}×${layoutMeasurement.dimensions.statusHeight}`);
        console.log('• 宽度差异:', layoutMeasurement.dimensions.widthDiff + 'px');
        console.log('• 高度差异:', layoutMeasurement.dimensions.heightDiff + 'px');
        console.log('• 行占用率:', layoutMeasurement.utilization.widthUtilization + '%');
        
        console.log('\n✅ 验证结果:');
        console.log('• 等宽:', layoutMeasurement.equal.equalWidth ? '✓' : '✗');
        console.log('• 等高:', layoutMeasurement.equal.equalHeight ? '✓' : '✗'); 
        console.log('• 填满行:', layoutMeasurement.equal.fillsRow ? '✓' : '✗');
        
        const success = layoutMeasurement.equal.equalWidth && 
                       layoutMeasurement.equal.equalHeight && 
                       layoutMeasurement.equal.fillsRow;
        
        if (success) {
            console.log('\n🎉 网格布局修复成功！');
        } else {
            console.log('\n⚠️ 布局仍需调整');
        }
        
        return success;
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return false;
    } finally {
        await browser.close();
    }
}

// 执行验证
verifyGridLayout().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 执行异常:', error);
    process.exit(1);
});
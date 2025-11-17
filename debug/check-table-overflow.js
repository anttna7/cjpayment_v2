const { chromium } = require('playwright');

async function checkTableOverflow() {
    console.log('🔍 检查仪表板交易表格超出问题...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('📊 访问仪表板页面...');
        await page.goto('http://localhost:8091/dashboard');
        
        // 等待页面加载完成
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000); // 等待数据加载
        
        // 获取容器和表格的尺寸信息
        const measurements = await page.evaluate(() => {
            const dashboardTable = document.querySelector('.dashboard__table');
            const card = document.querySelector('#recentTransactionsCard');
            const tableContainer = document.querySelector('.table-container');
            const table = document.querySelector('#recentTransactionsTable');
            
            function getMeasurements(element, name) {
                if (!element) return { name, exists: false };
                
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                
                return {
                    name,
                    exists: true,
                    width: rect.width,
                    height: rect.height,
                    scrollWidth: element.scrollWidth,
                    scrollHeight: element.scrollHeight,
                    offsetWidth: element.offsetWidth,
                    offsetHeight: element.offsetHeight,
                    overflow: {
                        x: styles.overflowX,
                        y: styles.overflowY
                    },
                    padding: {
                        left: styles.paddingLeft,
                        right: styles.paddingRight,
                        top: styles.paddingTop,
                        bottom: styles.paddingBottom
                    },
                    margin: {
                        left: styles.marginLeft,
                        right: styles.marginRight,
                        top: styles.marginTop,
                        bottom: styles.marginBottom
                    },
                    isOverflowing: {
                        horizontal: element.scrollWidth > element.clientWidth,
                        vertical: element.scrollHeight > element.clientHeight
                    }
                };
            }
            
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                dashboardTable: getMeasurements(dashboardTable, 'dashboard__table'),
                card: getMeasurements(card, 'recentTransactionsCard'),
                tableContainer: getMeasurements(tableContainer, 'table-container'),
                table: getMeasurements(table, 'recentTransactionsTable')
            };
        });
        
        console.log('\n📏 容器和表格尺寸信息:');
        console.log('🖥️  视窗尺寸:', measurements.viewport);
        console.log('\n📦 容器层级信息:');
        
        Object.entries(measurements).forEach(([key, data]) => {
            if (key === 'viewport') return;
            
            console.log(`\n${data.name}:`);
            if (!data.exists) {
                console.log('  ❌ 元素不存在');
                return;
            }
            
            console.log(`  📐 尺寸: ${data.width}x${data.height}px`);
            console.log(`  📊 滚动: ${data.scrollWidth}x${data.scrollHeight}px`);
            console.log(`  🔄 溢出: ${data.overflow.x} / ${data.overflow.y}`);
            console.log(`  ⚠️  是否溢出: 水平=${data.isOverflowing.horizontal}, 垂直=${data.isOverflowing.vertical}`);
            
            if (data.isOverflowing.horizontal || data.isOverflowing.vertical) {
                console.log('  🚨 检测到溢出问题!');
            }
        });
        
        // 截图保存当前状态
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/table-overflow-analysis.png',
            fullPage: true 
        });
        
        console.log('\n📸 溢出分析截图已保存');
        
        // 保存测量数据
        const fs = require('fs');
        fs.writeFileSync(
            '/Users/c/Desktop/labs/cjpay/cjpayment/debug/table-measurements.json', 
            JSON.stringify(measurements, null, 2)
        );
        
        return measurements;
        
    } catch (error) {
        console.error('❌ 检查过程出现错误:', error);
        return null;
    } finally {
        await browser.close();
    }
}

checkTableOverflow().then(result => {
    if (result) {
        console.log('\n✅ 溢出检查完成');
    } else {
        console.log('\n❌ 溢出检查失败');
    }
    process.exit(0);
});
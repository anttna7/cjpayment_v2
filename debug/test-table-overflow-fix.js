const { chromium } = require('playwright');

async function testTableOverflowFix() {
    console.log('🔧 测试仪表板表格溢出修复...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 500  // 慢速模式便于观察
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    try {
        console.log('📊 访问修复后的仪表板页面...');
        await page.goto('http://localhost:8091/dashboard');
        
        // 等待页面加载完成
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000); // 等待数据和样式加载
        
        console.log('📏 检查修复后的尺寸和溢出情况...');
        
        // 获取修复后的尺寸信息
        const fixedMeasurements = await page.evaluate(() => {
            const dashboardTable = document.querySelector('.dashboard__table');
            const card = document.querySelector('#recentTransactionsCard');
            const tableContainer = document.querySelector('.table-container');
            const table = document.querySelector('#recentTransactionsTable');
            
            function getFixedMeasurements(element, name) {
                if (!element) return { name, exists: false };
                
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                
                return {
                    name,
                    exists: true,
                    dimensions: {
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        scrollWidth: element.scrollWidth,
                        scrollHeight: element.scrollHeight
                    },
                    overflow: {
                        x: styles.overflowX,
                        y: styles.overflowY
                    },
                    maxHeight: styles.maxHeight,
                    position: styles.position,
                    isOverflowing: {
                        horizontal: element.scrollWidth > element.clientWidth,
                        vertical: element.scrollHeight > element.clientHeight
                    },
                    isScrollable: {
                        horizontal: styles.overflowX === 'auto' || styles.overflowX === 'scroll',
                        vertical: styles.overflowY === 'auto' || styles.overflowY === 'scroll'
                    }
                };
            }
            
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                dashboardTable: getFixedMeasurements(dashboardTable, 'dashboard__table'),
                card: getFixedMeasurements(card, 'recentTransactionsCard'),
                tableContainer: getFixedMeasurements(tableContainer, 'table-container'),
                table: getFixedMeasurements(table, 'recentTransactionsTable')
            };
        });
        
        console.log('\n✅ 修复后的测量结果:');
        console.log('🖥️  视窗尺寸:', fixedMeasurements.viewport);
        
        Object.entries(fixedMeasurements).forEach(([key, data]) => {
            if (key === 'viewport') return;
            
            console.log(`\n📦 ${data.name}:`);
            if (!data.exists) {
                console.log('  ❌ 元素不存在');
                return;
            }
            
            const { dimensions, overflow, maxHeight, isOverflowing, isScrollable } = data;
            
            console.log(`  📐 尺寸: ${dimensions.width}x${dimensions.height}px`);
            console.log(`  📊 滚动区域: ${dimensions.scrollWidth}x${dimensions.scrollHeight}px`);
            console.log(`  🔄 溢出设置: ${overflow.x} / ${overflow.y}`);
            console.log(`  📏 最大高度: ${maxHeight}`);
            
            if (isOverflowing.horizontal || isOverflowing.vertical) {
                console.log(`  ⚠️  溢出状态: 水平=${isOverflowing.horizontal}, 垂直=${isOverflowing.vertical}`);
            } else {
                console.log('  ✅ 无溢出');
            }
            
            if (isScrollable.horizontal || isScrollable.vertical) {
                console.log(`  🔄 可滚动: 水平=${isScrollable.horizontal}, 垂直=${isScrollable.vertical}`);
            }
        });
        
        // 测试滚动功能
        console.log('\n🔄 测试表格滚动功能...');
        
        const scrollTest = await page.evaluate(() => {
            const tableContainer = document.querySelector('.table-container');
            if (!tableContainer) return { success: false, reason: '容器不存在' };
            
            const initialScrollTop = tableContainer.scrollTop;
            
            // 尝试滚动
            tableContainer.scrollTop = 100;
            const newScrollTop = tableContainer.scrollTop;
            
            // 恢复原始位置
            tableContainer.scrollTop = initialScrollTop;
            
            return {
                success: true,
                canScroll: newScrollTop > initialScrollTop,
                scrollHeight: tableContainer.scrollHeight,
                clientHeight: tableContainer.clientHeight,
                needsScroll: tableContainer.scrollHeight > tableContainer.clientHeight
            };
        });
        
        console.log('🔄 滚动测试结果:', scrollTest);
        
        // 截图对比
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/table-overflow-fixed.png',
            fullPage: true 
        });
        
        console.log('\n📸 修复后截图已保存');
        
        // 检查表格数据是否正常显示
        const tableContent = await page.evaluate(() => {
            const tbody = document.querySelector('#recentTransactionsTable tbody');
            const rows = tbody?.querySelectorAll('.table__row') || [];
            return {
                hasData: rows.length > 0,
                rowCount: rows.length,
                firstRowVisible: rows[0]?.getBoundingClientRect().height > 0
            };
        });
        
        console.log('📊 表格内容状态:', tableContent);
        
        // 判断修复是否成功
        const isFixed = !fixedMeasurements.dashboardTable.isOverflowing.vertical && 
                        !fixedMeasurements.card.isOverflowing.vertical &&
                        fixedMeasurements.tableContainer.isScrollable.vertical &&
                        tableContent.hasData;
                        
        console.log(`\n${isFixed ? '✅' : '❌'} 表格溢出修复${isFixed ? '成功' : '失败'}！`);
        
        return {
            success: isFixed,
            measurements: fixedMeasurements,
            scrollTest,
            tableContent
        };
        
    } catch (error) {
        console.error('❌ 测试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/table-overflow-fix-error.png',
            fullPage: true 
        });
        
        return {
            success: false,
            error: error.message
        };
    } finally {
        await browser.close();
    }
}

testTableOverflowFix().then(result => {
    console.log('\n📋 修复测试最终结果:');
    console.log(`成功状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    
    if (result.error) {
        console.log(`错误信息: ${result.error}`);
    }
    
    process.exit(result.success ? 0 : 1);
});
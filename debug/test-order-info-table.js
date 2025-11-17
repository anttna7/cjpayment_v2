const { chromium } = require('playwright');

async function testOrderInfoTable() {
    console.log('🔍 测试订单信息表功能...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 300  // 慢速模式以便观察
    });
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();

    // 监听控制台日志
    page.on('console', msg => {
        if (msg.text().includes('OrderInfoTable')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    // 监听页面错误
    page.on('pageerror', error => {
        console.error(`❌ 页面错误: ${error.message}`);
    });

    try {
        console.log('📊 访问数据报表页面...');
        await page.goto('http://localhost:8091/reports');
        
        // 等待页面加载完成
        await page.waitForLoadState('networkidle');
        console.log('⏱️  页面加载完成，等待JavaScript初始化...');
        
        // 等待OrderInfoTable初始化
        await page.waitForTimeout(3000);
        
        // 检查表格是否存在
        const tableExists = await page.isVisible('#advancedDataTable');
        console.log(`📋 表格存在: ${tableExists}`);
        
        if (!tableExists) {
            console.error('❌ 表格未找到');
            return { success: false, error: '表格未找到' };
        }
        
        // 检查表头结构
        const headers = await page.evaluate(() => {
            const headerCells = document.querySelectorAll('#advancedDataTable thead th');
            return Array.from(headerCells).map((th, index) => {
                const textElement = th.querySelector('.th-text');
                return {
                    index,
                    text: textElement ? textElement.textContent.trim() : th.textContent.trim(),
                    isSerial: th.classList.contains('col-serial'),
                    isFixed: th.classList.contains('col-fixed-left')
                };
            });
        });
        
        console.log('📝 表头结构:');
        headers.forEach(header => {
            console.log(`  ${header.index + 1}. ${header.text} ${header.isSerial ? '(序号列)' : ''} ${header.isFixed ? '(固定列)' : ''}`);
        });
        
        // 验证表头数量和内容
        const expectedHeaders = [
            '序号', '订单号', '银行凭证号', '交易金额', '商户名称', 
            '付款账户名称', '付款账号', '收款账户名称', '收款账号', 
            '业务类别', '状态', '创建时间', '成功时间', '审核'
        ];
        
        const actualHeaders = headers.map(h => h.text);
        const headersMatch = expectedHeaders.every((expected, index) => 
            actualHeaders[index] === expected
        );
        
        console.log(`✅ 表头结构正确: ${headersMatch}`);
        if (!headersMatch) {
            console.log('期望的表头:', expectedHeaders);
            console.log('实际的表头:', actualHeaders);
        }
        
        // 等待数据加载
        console.log('⏳ 等待数据加载...');
        try {
            await page.waitForFunction(() => {
                const tbody = document.querySelector('#advancedDataTableBody');
                const loadingRow = tbody?.querySelector('.loading-row');
                const dataRows = tbody?.querySelectorAll('.table-row-enhanced');
                return !loadingRow && dataRows && dataRows.length > 0;
            }, { timeout: 10000 });
            
            console.log('✅ 数据加载完成');
        } catch (timeoutError) {
            console.warn('⚠️  数据加载超时，检查当前状态...');
        }
        
        // 检查数据行
        const dataStatus = await page.evaluate(() => {
            const tbody = document.querySelector('#advancedDataTableBody');
            if (!tbody) return { status: 'no_tbody' };
            
            const loadingRow = tbody.querySelector('.loading-row');
            const dataRows = tbody.querySelectorAll('.table-row-enhanced');
            const serialCells = tbody.querySelectorAll('.col-serial-cell');
            
            if (loadingRow) return { status: 'loading' };
            if (dataRows.length === 0) return { status: 'no_data' };
            
            // 检查第一行数据
            const firstRow = dataRows[0];
            const cells = firstRow.querySelectorAll('td');
            const firstRowData = {
                serial: serialCells[0]?.textContent?.trim(),
                orderNumber: cells[1]?.textContent?.trim(),
                bankVoucher: cells[2]?.textContent?.trim(),
                amount: cells[3]?.textContent?.trim(),
                merchant: cells[4]?.textContent?.trim()
            };
            
            return {
                status: 'success',
                rowCount: dataRows.length,
                serialCellCount: serialCells.length,
                firstRowData
            };
        });
        
        console.log('📊 数据状态:', dataStatus);
        
        // 测试序号列固定功能
        console.log('🔄 测试序号列固定滚动功能...');
        
        const scrollTest = await page.evaluate(async () => {
            const tableWrapper = document.querySelector('.table-wrapper-advanced');
            if (!tableWrapper) return { success: false, reason: '表格容器不存在' };
            
            const serialColumn = document.querySelector('.col-serial');
            const firstSerialCell = document.querySelector('.col-serial-cell');
            
            if (!serialColumn || !firstSerialCell) {
                return { success: false, reason: '序号列不存在' };
            }
            
            // 获取初始位置
            const initialSerialPos = serialColumn.getBoundingClientRect().left;
            const initialCellPos = firstSerialCell.getBoundingClientRect().left;
            
            // 执行水平滚动
            tableWrapper.scrollLeft = 200;
            
            // 等待滚动完成
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 获取滚动后位置
            const scrolledSerialPos = serialColumn.getBoundingClientRect().left;
            const scrolledCellPos = firstSerialCell.getBoundingClientRect().left;
            
            // 检查序号列是否保持固定
            const serialFixed = Math.abs(initialSerialPos - scrolledSerialPos) < 5;
            const cellFixed = Math.abs(initialCellPos - scrolledCellPos) < 5;
            
            // 恢复滚动位置
            tableWrapper.scrollLeft = 0;
            
            return {
                success: serialFixed && cellFixed,
                initialSerialPos,
                scrolledSerialPos,
                initialCellPos,
                scrolledCellPos,
                serialFixed,
                cellFixed,
                scrollLeft: tableWrapper.scrollLeft
            };
        });
        
        console.log('🔄 滚动测试结果:', scrollTest);
        
        // 测试排序功能
        console.log('📊 测试排序功能...');
        
        // 点击金额列进行排序
        await page.click('th[data-column="amount"]');
        await page.waitForTimeout(1000);
        
        const sortTest = await page.evaluate(() => {
            const sortIndicator = document.querySelector('th[data-column="amount"] .sort-indicator-enhanced');
            const firstAmount = document.querySelector('#advancedDataTableBody tr:first-child td[data-column="amount"]');
            
            return {
                sortIndicatorExists: !!sortIndicator,
                sortIndicatorText: sortIndicator?.textContent,
                firstAmount: firstAmount?.textContent?.trim()
            };
        });
        
        console.log('📊 排序测试结果:', sortTest);
        
        // 截图保存结果
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/order-info-table-test-success.png',
            fullPage: true 
        });
        
        console.log('📸 测试结果截图已保存');
        
        // 评估测试结果
        const testResults = {
            tableExists,
            headersCorrect: headersMatch,
            dataLoaded: dataStatus.status === 'success',
            dataCount: dataStatus.rowCount || 0,
            serialColumnFixed: scrollTest.success,
            sortingWorks: sortTest.sortIndicatorExists
        };
        
        const allTestsPassed = Object.values(testResults).every(result => 
            typeof result === 'boolean' ? result : result > 0
        );
        
        console.log('\n📋 测试结果汇总:');
        Object.entries(testResults).forEach(([key, value]) => {
            const icon = (typeof value === 'boolean' && value) || (typeof value === 'number' && value > 0) ? '✅' : '❌';
            console.log(`  ${icon} ${key}: ${value}`);
        });
        
        return {
            success: allTestsPassed,
            details: testResults,
            dataStatus,
            scrollTest,
            sortTest
        };
        
    } catch (error) {
        console.error('❌ 测试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/order-info-table-test-error.png',
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

testOrderInfoTable().then(result => {
    console.log('\n📋 最终测试结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log('\n🎉 订单信息表功能测试成功！');
        console.log('✅ 表格结构正确');
        console.log('✅ 数据加载正常'); 
        console.log('✅ 序号列固定滚动功能正常');
        console.log('✅ 排序功能正常');
    } else {
        console.log('\n❌ 订单信息表功能测试存在问题');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});
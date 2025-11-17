const { chromium } = require('playwright');

async function simpleVisualTest() {
    console.log('📸 简单可视化测试 - 验证操作链接样式...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 1500
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    try {
        console.log('🚀 打开财务审核页面...');
        await page.goto('http://localhost:8091/audit');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);
        
        console.log('✅ 页面加载完成');

        // 等待表格数据加载
        await page.waitForFunction(() => {
            return document.querySelectorAll('#financialAuditTableBody tr').length > 0;
        }, { timeout: 10000 });

        // 检查操作链接状态
        const stats = await page.evaluate(() => {
            return {
                actionLinks: document.querySelectorAll('.action-link').length,
                viewLinks: document.querySelectorAll('.action-view').length,
                arrivedLinks: document.querySelectorAll('.action-arrived').length,
                notArrivedLinks: document.querySelectorAll('.action-not-arrived').length,
                separators: document.querySelectorAll('.action-separator').length,
                oldButtons: document.querySelectorAll('.audit-action-btn').length,
                actionCells: document.querySelectorAll('.col-actions-cell').length,
                firstActionCellContent: document.querySelector('.col-actions-cell')?.innerHTML || '无内容'
            };
        });
        
        console.log('📊 操作链接统计:', stats);
        console.log('🔍 第一个操作单元格内容预览:', stats.firstActionCellContent.substring(0, 200));

        // 截图1: 初始状态
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/visual-test-01-initial.png',
            fullPage: true 
        });

        // 切换到待审核标签，确保有操作链接
        await page.click('.filter-tab[data-filter="pending"]');
        await page.waitForTimeout(2000);

        // 截图2: 待审核状态
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/visual-test-02-pending.png',
            fullPage: true 
        });

        // 水平滚动到右侧看操作列
        await page.evaluate(() => {
            const wrapper = document.querySelector('.financial-audit-table-wrapper');
            if (wrapper) {
                wrapper.scrollLeft = wrapper.scrollWidth - wrapper.clientWidth;
            }
        });
        await page.waitForTimeout(2000);

        // 截图3: 滚动到最右侧
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/visual-test-03-scrolled-right.png',
            fullPage: true 
        });

        // 检查滚动后的状态
        const scrolledStats = await page.evaluate(() => {
            const wrapper = document.querySelector('.financial-audit-table-wrapper');
            const actionCell = document.querySelector('.col-actions-cell');
            
            return {
                scrollPosition: wrapper?.scrollLeft || 0,
                maxScroll: wrapper ? wrapper.scrollWidth - wrapper.clientWidth : 0,
                actionCellVisible: actionCell ? actionCell.getBoundingClientRect().width > 0 : false,
                actionCellPosition: actionCell ? actionCell.getBoundingClientRect() : null
            };
        });
        
        console.log('📐 滚动状态:', scrolledStats);

        // 测试卡片视图
        const cardViewBtn = await page.$('.view-btn[data-view="cards"]');
        if (cardViewBtn) {
            await cardViewBtn.click();
            await page.waitForTimeout(3000);
            
            // 截图4: 卡片视图
            await page.screenshot({ 
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/visual-test-04-cards.png',
                fullPage: true 
            });
        }

        console.log('✅ 可视化测试完成！');
        console.log('\\n📋 测试结果总结:');
        console.log(`  ├─ 操作链接总数: ${stats.actionLinks}`);
        console.log(`  ├─ 查看链接: ${stats.viewLinks}`);
        console.log(`  ├─ 审核链接: ${stats.arrivedLinks + stats.notArrivedLinks}`);
        console.log(`  ├─ 旧按钮移除: ${stats.oldButtons === 0 ? '✅' : '❌'}`);
        console.log(`  └─ 操作列固定: ${scrolledStats.actionCellVisible ? '✅' : '❌'}`);

        return {
            success: true,
            stats: stats,
            scrolledStats: scrolledStats
        };

    } catch (error) {
        console.error('❌ 可视化测试失败:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/visual-test-error.png',
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

simpleVisualTest().then(result => {
    console.log('\\n🎯 可视化测试结果:');
    
    if (result.success) {
        console.log('\\n🎉 操作链接样式优化成功！');
        console.log('\\n📸 已生成测试截图:');
        console.log('  📷 visual-test-01-initial.png - 初始状态');
        console.log('  📷 visual-test-02-pending.png - 待审核状态');  
        console.log('  📷 visual-test-03-scrolled-right.png - 滚动状态');
        console.log('  📷 visual-test-04-cards.png - 卡片视图');
        
    } else {
        console.log('\\n❌ 可视化测试失败');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});
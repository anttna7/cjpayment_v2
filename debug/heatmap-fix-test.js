/**
 * 热力图修复验证测试
 * 验证时段活跃度热力图是否正确显示
 */

const puppeteer = require('puppeteer');

async function testHeatmapFix() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 500,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        console.log('🔥 开始测试时段活跃度热力图修复...\n');
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });
        
        // 访问数据报表页面
        console.log('📄 访问数据报表页面...');
        await page.goto('http://localhost:8091/reports', { waitUntil: 'networkidle2' });
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查热力图容器是否存在
        console.log('🔍 检查热力图容器...');
        const heatmapContainer = await page.$('#heatmapChart');
        
        if (!heatmapContainer) {
            console.log('❌ 热力图容器未找到');
            return false;
        }
        
        // 检查热力图网格是否渲染
        console.log('🔍 检查热力图网格渲染...');
        const heatmapGrid = await page.$('#heatmapChart .heatmap-grid');
        
        if (!heatmapGrid) {
            console.log('❌ 热力图网格未渲染');
            return false;
        }
        
        // 检查热力图单元格数量 (7天 × 24小时 = 168个单元格)
        console.log('🔍 检查热力图单元格...');
        const cells = await page.$$('#heatmapChart .heatmap-cell');
        console.log(`   找到 ${cells.length} 个热力图单元格 (预期: 168个)`);
        
        if (cells.length !== 168) {
            console.log('⚠️ 热力图单元格数量不正确');
        }
        
        // 检查坐标轴标签
        console.log('🔍 检查坐标轴标签...');
        const hourLabels = await page.$$('#heatmapChart .hour-label');
        const dayLabels = await page.$$('#heatmapChart .day-label');
        
        console.log(`   小时标签: ${hourLabels.length} 个`);
        console.log(`   日期标签: ${dayLabels.length} 个`);
        
        // 测试热力图交互
        console.log('🔍 测试热力图单元格交互...');
        if (cells.length > 0) {
            // 点击第一个单元格
            await cells[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 检查是否显示弹窗
            const popup = await page.$('.heatmap-detail-popup');
            if (popup) {
                console.log('✅ 热力图交互弹窗显示正常');
                
                // 关闭弹窗
                const closeBtn = await page.$('.heatmap-detail-popup .close-popup');
                if (closeBtn) {
                    await closeBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } else {
                console.log('⚠️ 热力图交互弹窗未显示');
            }
        }
        
        // 检查热力图样式
        console.log('🔍 检查热力图样式...');
        const gridStyles = await page.evaluate(() => {
            const grid = document.querySelector('#heatmapChart .heatmap-grid');
            if (!grid) return null;
            
            const styles = window.getComputedStyle(grid);
            return {
                display: styles.display,
                gridTemplateColumns: styles.gridTemplateColumns,
                gridTemplateRows: styles.gridTemplateRows,
                gap: styles.gap
            };
        });
        
        if (gridStyles) {
            console.log('   网格样式信息:');
            console.log(`     display: ${gridStyles.display}`);
            console.log(`     columns: ${gridStyles.gridTemplateColumns.split(' ').length} 列`);
            console.log(`     rows: ${gridStyles.gridTemplateRows.split(' ').length} 行`);
            console.log(`     gap: ${gridStyles.gap}`);
        }
        
        // 截图保存结果
        console.log('📸 保存测试截图...');
        await page.screenshot({ 
            path: 'debug/heatmap-fix-verification.png',
            fullPage: false
        });
        
        // 生成测试报告
        const testResult = {
            timestamp: new Date().toISOString(),
            containerExists: !!heatmapContainer,
            gridExists: !!heatmapGrid,
            cellCount: cells.length,
            expectedCells: 168,
            hourLabels: hourLabels.length,
            dayLabels: dayLabels.length,
            interactionWorking: !!(await page.$('.heatmap-detail-popup')),
            gridStyles: gridStyles,
            success: cells.length === 168 && gridStyles?.display === 'grid'
        };
        
        await page.evaluate((result) => {
            console.log('热力图测试结果:', result);
        }, testResult);
        
        console.log('\n📊 测试结果汇总:');
        console.log(`• 容器存在: ${testResult.containerExists ? '✅' : '❌'}`);
        console.log(`• 网格渲染: ${testResult.gridExists ? '✅' : '❌'}`);
        console.log(`• 单元格数量: ${testResult.cellCount}/168 ${testResult.cellCount === 168 ? '✅' : '⚠️'}`);
        console.log(`• 小时标签: ${testResult.hourLabels} 个`);
        console.log(`• 日期标签: ${testResult.dayLabels} 个`);
        console.log(`• 网格样式: ${testResult.gridStyles?.display === 'grid' ? '✅' : '❌'}`);
        
        return testResult.success;
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        return false;
    } finally {
        await browser.close();
    }
}

// 执行测试
testHeatmapFix().then(success => {
    if (success) {
        console.log('\n🎉 热力图修复验证测试通过！');
        process.exit(0);
    } else {
        console.log('\n⚠️ 热力图仍存在问题，需要进一步调试');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 测试执行异常:', error);
    process.exit(1);
});
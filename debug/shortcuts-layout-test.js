/**
 * 快捷入口布局测试
 * 验证删除快速操作后，快捷入口是否充分利用了空间
 */

const puppeteer = require('puppeteer');

async function testShortcutsLayout() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 300,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    
    try {
        console.log('🔍 测试快捷入口布局优化...');
        
        // 导航到仪表板
        await page.goto('http://localhost:8091/dashboard', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 测量布局效果
        const layoutInfo = await page.evaluate(() => {
            const actionsRow = document.querySelector('.dashboard__actions-row');
            const shortcuts = document.querySelector('.dashboard__shortcuts');
            const shortcutsCard = document.querySelector('.shortcuts-card');
            const quickActionsArea = document.querySelector('.dashboard__quick-actions');
            
            if (!actionsRow || !shortcuts || !shortcutsCard) {
                return { error: '无法找到快捷入口元素' };
            }
            
            const actionsRowRect = actionsRow.getBoundingClientRect();
            const shortcutsRect = shortcuts.getBoundingClientRect();
            const cardRect = shortcutsCard.getBoundingClientRect();
            
            // 计算占用率
            const widthUtilization = (shortcutsRect.width / actionsRowRect.width) * 100;
            
            // 统计快捷入口项目数量
            const shortcutItems = document.querySelectorAll('.shortcut-item');
            const grids = document.querySelectorAll('.shortcuts-grid');
            
            return {
                quickActionsRemoved: !quickActionsArea,
                layout: {
                    actionsRowWidth: Math.round(actionsRowRect.width),
                    shortcutsWidth: Math.round(shortcutsRect.width),
                    cardWidth: Math.round(cardRect.width),
                    widthUtilization: Math.round(widthUtilization)
                },
                content: {
                    shortcutItemsCount: shortcutItems.length,
                    gridsCount: grids.length,
                    itemsPerGrid: grids.length > 0 ? Math.ceil(shortcutItems.length / grids.length) : 0
                }
            };
        });
        
        // 截图记录
        await page.screenshot({ 
            path: 'debug/shortcuts-optimized.png',
            fullPage: true
        });
        
        console.log('\n📊 快捷入口布局测量结果:');
        console.log('• 快速操作已删除:', layoutInfo.quickActionsRemoved ? '✓' : '✗');
        console.log('• 行总宽度:', layoutInfo.layout.actionsRowWidth + 'px');
        console.log('• 快捷入口宽度:', layoutInfo.layout.shortcutsWidth + 'px');
        console.log('• 宽度占用率:', layoutInfo.layout.widthUtilization + '%');
        console.log('• 快捷入口项目数:', layoutInfo.content.shortcutItemsCount + '个');
        console.log('• 网格数量:', layoutInfo.content.gridsCount + '行');
        console.log('• 每行项目数:', layoutInfo.content.itemsPerGrid + '个');
        
        const success = layoutInfo.quickActionsRemoved && 
                       layoutInfo.layout.widthUtilization > 95 &&
                       layoutInfo.content.shortcutItemsCount >= 16;
        
        if (success) {
            console.log('\n🎉 快捷入口布局优化成功！');
        } else {
            console.log('\n⚠️ 布局优化需要进一步调整');
        }
        
        return success;
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return false;
    } finally {
        await browser.close();
    }
}

// 执行测试
testShortcutsLayout().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('💥 执行异常:', error);
    process.exit(1);
});
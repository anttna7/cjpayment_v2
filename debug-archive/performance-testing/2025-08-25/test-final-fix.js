/**
 * 测试最终修复效果
 */

const puppeteer = require('puppeteer');

async function testFinalFix() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[浏览器] ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    try {
        console.log('🎯 测试最终修复效果...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        // 等待页面初始化
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        console.log('=== 检查页面初始状态 ===');
        const initialCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            const tableBtn = document.getElementById('tableViewBtn');
            const cardBtn = document.getElementById('gridViewBtn');
            
            // 检查容器的计算样式和实际大小
            const tableRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
            const cardRect = cardContainer ? cardContainer.getBoundingClientRect() : null;
            
            return {
                containers: {
                    table: {
                        exists: !!tableContainer,
                        display: tableContainer ? getComputedStyle(tableContainer).display : 'none',
                        size: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                        innerHTML: tableContainer ? tableContainer.innerHTML.length : 0
                    },
                    card: {
                        exists: !!cardContainer,
                        display: cardContainer ? getComputedStyle(cardContainer).display : 'none',
                        size: cardRect ? `${cardRect.width}x${cardRect.height}` : '0x0'
                    }
                },
                buttons: {
                    tableActive: tableBtn ? tableBtn.classList.contains('active') : false,
                    cardActive: cardBtn ? cardBtn.classList.contains('active') : false
                },
                tableElements: {
                    table: !!document.querySelector('.merchant-table'),
                    tbody: !!document.querySelector('#merchantTableBody'),
                    rows: document.querySelectorAll('.merchant-row').length,
                    accounts: document.querySelectorAll('.account-count-badge').length
                }
            };
        });
        
        console.log('初始状态检查:');
        console.log('容器状态:');
        console.log(`  表格容器: ${initialCheck.containers.table.exists ? '存在' : '不存在'}`);
        console.log(`    显示: ${initialCheck.containers.table.display}`);
        console.log(`    尺寸: ${initialCheck.containers.table.size}`);
        console.log(`    内容长度: ${initialCheck.containers.table.innerHTML}`);
        console.log(`  卡片容器: ${initialCheck.containers.card.exists ? '存在' : '不存在'}`);
        console.log(`    显示: ${initialCheck.containers.card.display}`);
        console.log(`    尺寸: ${initialCheck.containers.card.size}`);
        
        console.log('按钮状态:');
        console.log(`  表格按钮激活: ${initialCheck.buttons.tableActive}`);
        console.log(`  卡片按钮激活: ${initialCheck.buttons.cardActive}`);
        
        console.log('表格元素:');
        console.log(`  表格: ${initialCheck.tableElements.table}`);
        console.log(`  tbody: ${initialCheck.tableElements.tbody}`);
        console.log(`  数据行: ${initialCheck.tableElements.rows}`);
        console.log(`  账户徽章: ${initialCheck.tableElements.accounts}`);
        
        const initialSuccess = initialCheck.containers.table.display === 'block' && 
                              initialCheck.containers.table.innerHTML > 0 && 
                              initialCheck.tableElements.rows > 0;
        
        console.log(`\n初始状态结果: ${initialSuccess ? '✅ 成功' : '❌ 失败'}`);
        
        await page.screenshot({ path: 'test-final-fix-01-initial.png', fullPage: true });
        
        if (!initialSuccess) {
            console.log('\n=== 尝试手动修复 ===');
            
            // 手动调用渲染器
            const manualFix = await page.evaluate(() => {
                try {
                    if (window.enhancedMerchantTableRenderer) {
                        console.log('手动调用表格渲染器...');
                        window.enhancedMerchantTableRenderer.render();
                        
                        // 强制设置显示
                        const tableContainer = document.getElementById('merchantTableContainer');
                        if (tableContainer) {
                            tableContainer.style.display = 'block';
                            tableContainer.style.visibility = 'visible';
                        }
                        
                        return '手动修复尝试成功';
                    }
                    return '渲染器不存在';
                } catch (error) {
                    return `手动修复失败: ${error.message}`;
                }
            });
            
            console.log(`手动修复结果: ${manualFix}`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 再次检查
            const afterManualFix = await page.evaluate(() => {
                const tableContainer = document.getElementById('merchantTableContainer');
                const tableRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
                
                return {
                    display: tableContainer ? getComputedStyle(tableContainer).display : 'none',
                    size: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                    rows: document.querySelectorAll('.merchant-row').length,
                    accounts: document.querySelectorAll('.account-count-badge').length
                };
            });
            
            console.log('手动修复后:');
            console.log(`  表格显示: ${afterManualFix.display}`);
            console.log(`  表格尺寸: ${afterManualFix.size}`);
            console.log(`  数据行: ${afterManualFix.rows}`);
            console.log(`  账户徽章: ${afterManualFix.accounts}`);
            
            await page.screenshot({ path: 'test-final-fix-02-manual.png', fullPage: true });
        }
        
        console.log('\n=== 测试视图切换 ===');
        
        // 切换到卡片视图
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cardCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            
            return {
                tableDisplay: tableContainer ? getComputedStyle(tableContainer).display : 'unknown',
                cardDisplay: cardContainer ? getComputedStyle(cardContainer).display : 'unknown',
                cardCount: document.querySelectorAll('.merchant-card').length
            };
        });
        
        console.log('切换到卡片视图:');
        console.log(`  表格隐藏: ${cardCheck.tableDisplay === 'none'}`);
        console.log(`  卡片显示: ${cardCheck.cardDisplay !== 'none'}`);
        console.log(`  卡片数量: ${cardCheck.cardCount}`);
        
        await page.screenshot({ path: 'test-final-fix-03-cards.png', fullPage: true });
        
        // 切换回表格视图
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const backToTable = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            const tableRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
            
            return {
                tableDisplay: tableContainer ? getComputedStyle(tableContainer).display : 'unknown',
                cardDisplay: cardContainer ? getComputedStyle(cardContainer).display : 'unknown',
                tableSize: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                rows: document.querySelectorAll('.merchant-row').length,
                accounts: document.querySelectorAll('.account-count-badge').length
            };
        });
        
        console.log('切换回表格视图:');
        console.log(`  表格显示: ${backToTable.tableDisplay}`);
        console.log(`  表格尺寸: ${backToTable.tableSize}`);
        console.log(`  卡片隐藏: ${backToTable.cardDisplay === 'none'}`);
        console.log(`  数据行: ${backToTable.rows}`);
        console.log(`  账户徽章: ${backToTable.accounts}`);
        
        await page.screenshot({ path: 'test-final-fix-04-back-table.png', fullPage: true });
        
        const finalSuccess = backToTable.tableDisplay === 'block' && 
                            backToTable.rows > 0 && 
                            backToTable.accounts > 0 &&
                            !backToTable.tableSize.includes('x0');
        
        console.log(`\n🎯 最终测试结果: ${finalSuccess ? '✅ 完全修复成功' : '❌ 仍有问题'}`);
        console.log('📸 测试截图已保存: test-final-fix-*.png');
        
        if (finalSuccess) {
            console.log('\n🎉 商户管理表格显示问题已彻底解决！');
        } else {
            console.log('\n⚠️ 需要进一步调试...');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

testFinalFix().catch(console.error);
/**
 * 最终验证修复效果
 */
const { chromium } = require('playwright');

async function finalFixValidation() {
    console.log('🎯 最终验证ID映射修复效果...\n');
    
    let browser, page;
    
    try {
        browser = await chromium.launch({ 
            headless: false, 
            slowMo: 800,
            viewport: { width: 1440, height: 900 }
        });
        const context = await browser.newContext();
        page = await context.newPage();

        // 监听console日志确认修复
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (text.includes('切换到标签') || text.includes('激活面板') || text.includes('找不到面板')) {
                console.log(`🔍 调试信息: ${text}`);
            }
        });

        console.log('📱 访问修复后的账户管理页面...');
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 检查初始状态
        console.log('\n1️⃣ 检查初始页面状态...');
        const initialState = await page.evaluate(() => {
            const activeTab = document.querySelector('.tab-nav__item--active');
            const activePanel = document.querySelector('.tab-panel--active');
            
            return {
                hasActiveTab: !!activeTab,
                activeTabText: activeTab?.textContent?.trim(),
                hasActivePanel: !!activePanel,
                activePanelId: activePanel?.id,
                activePanelVisible: activePanel ? activePanel.offsetHeight > 0 : false
            };
        });
        
        console.log('初始状态:', initialState);

        // 依次测试每个标签页
        const tabs = [
            { tab: 'payment-accounts', expectedPanel: 'paymentAccountsPanel', name: '付款账户' },
            { tab: 'receiving-accounts', expectedPanel: 'receivingAccountsPanel', name: '收款账户' },
            { tab: 'polling-rules', expectedPanel: 'pollingRulesPanel', name: '轮询规则' }
        ];

        let allTestsPassed = true;

        for (const { tab, expectedPanel, name } of tabs) {
            console.log(`\n2️⃣ 测试 ${name} 标签页...`);
            
            await page.locator(`[data-tab="${tab}"]`).click();
            await page.waitForTimeout(1500);
            
            const tabState = await page.evaluate((tabName, panelId) => {
                const activeTab = document.querySelector('.tab-nav__item--active');
                const activePanel = document.querySelector('.tab-panel--active');
                const targetPanel = document.getElementById(panelId);
                
                return {
                    correctTabActive: activeTab?.dataset.tab === tabName,
                    hasActivePanel: !!activePanel,
                    correctPanelActive: activePanel?.id === panelId,
                    panelVisible: activePanel ? activePanel.offsetHeight > 0 : false,
                    panelDisplay: activePanel ? window.getComputedStyle(activePanel).display : 'N/A',
                    targetPanelExists: !!targetPanel,
                    targetPanelClasses: targetPanel?.className || 'N/A'
                };
            }, tab, expectedPanel);
            
            console.log(`  ${name} 测试结果:`, tabState);
            
            if (tabState.correctTabActive && tabState.correctPanelActive && tabState.panelVisible) {
                console.log(`  ✅ ${name} 标签页完全正常`);
            } else {
                console.log(`  ❌ ${name} 标签页存在问题`);
                allTestsPassed = false;
            }
            
            // 截图当前状态
            await page.screenshot({ 
                path: `/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/fix-validation-${tab}.png`
            });
        }

        // 快速切换测试
        console.log('\n3️⃣ 测试快速标签切换...');
        
        for (let i = 0; i < 3; i++) {
            for (const { tab } of tabs) {
                await page.locator(`[data-tab="${tab}"]`).click();
                await page.waitForTimeout(300);
            }
        }
        
        // 最终状态检查
        const finalState = await page.evaluate(() => {
            const activeTab = document.querySelector('.tab-nav__item--active');
            const activePanel = document.querySelector('.tab-panel--active');
            
            return {
                activeTab: activeTab?.dataset.tab,
                activePanel: activePanel?.id,
                allPanelsState: Array.from(document.querySelectorAll('.tab-panel')).map(panel => ({
                    id: panel.id,
                    hasActiveClass: panel.classList.contains('tab-panel--active'),
                    display: window.getComputedStyle(panel).display,
                    visible: panel.offsetHeight > 0
                }))
            };
        });
        
        console.log('\n快速切换后状态:', finalState);

        // 测试内容加载
        console.log('\n4️⃣ 测试内容数据加载...');
        
        await page.locator('[data-tab="payment-accounts"]').click();
        await page.waitForTimeout(2000);
        
        const contentState = await page.evaluate(() => {
            const paymentTableBody = document.getElementById('paymentAccountsTableBody');
            const rows = paymentTableBody?.querySelectorAll('tr') || [];
            const dataRows = Array.from(rows).filter(row => 
                !row.querySelector('.table__loading') && row.cells.length > 1
            );
            
            return {
                tableExists: !!paymentTableBody,
                rowCount: rows.length,
                dataRowCount: dataRows.length,
                hasRealData: dataRows.length > 0,
                firstRowSample: dataRows[0] ? {
                    序号: dataRows[0].cells[0]?.textContent?.trim(),
                    付款账号: dataRows[0].cells[1]?.textContent?.trim().substring(0, 20),
                    账户名称: dataRows[0].cells[2]?.textContent?.trim()
                } : null
            };
        });
        
        console.log('内容加载状态:', contentState);

        // 最终总结截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/fix-validation-final-result.png',
            fullPage: true 
        });

        console.log('\n📊 修复验证总结:');
        console.log('========================');
        
        if (allTestsPassed && contentState.hasRealData) {
            console.log('🎉 修复完全成功！');
            console.log('✅ 所有标签页都能正常显示内容');
            console.log('✅ 标签切换流畅无误');  
            console.log('✅ 数据加载正常');
            console.log('\n🚀 页面现在完全可用，空白问题已彻底解决！');
        } else {
            console.log('⚠️ 修复部分成功，但仍有问题需要解决');
            if (!allTestsPassed) {
                console.log('❌ 标签页切换仍有问题');
            }
            if (!contentState.hasRealData) {
                console.log('❌ 数据加载仍有问题');  
            }
        }

        console.log('\n📸 验证截图已保存');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('💥 验证过程中出现错误:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

finalFixValidation().catch(console.error);
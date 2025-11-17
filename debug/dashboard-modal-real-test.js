const { chromium } = require('playwright');

async function testDashboardModalReality() {
    console.log('🔧 实际测试仪表板模态框初始位置问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 访问仪表板
        await page.goto('http://localhost:8091/dashboard', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        console.log('📊 测试仪表板导出报表按钮...');
        
        // 查找所有可能的导出按钮
        const buttonAnalysis = await page.evaluate(() => {
            const allButtons = Array.from(document.querySelectorAll('button'));
            const exportButtons = allButtons.filter(btn => 
                btn.textContent.includes('导出') || 
                btn.id?.includes('export') ||
                btn.onclick?.toString().includes('export')
            );
            
            return exportButtons.map(btn => ({
                id: btn.id,
                text: btn.textContent.trim(),
                className: btn.className,
                onclick: btn.onclick ? btn.onclick.toString() : 'none',
                visible: window.getComputedStyle(btn).display !== 'none'
            }));
        });
        
        console.log('发现的导出按钮:', JSON.stringify(buttonAnalysis, null, 2));
        
        // 逐个测试每个导出按钮
        for (let i = 0; i < buttonAnalysis.length; i++) {
            const button = buttonAnalysis[i];
            console.log(`\n🧪 测试按钮 ${i + 1}: ${button.text || button.id}`);
            
            try {
                // 点击按钮
                if (button.id) {
                    await page.click(`#${button.id}`);
                } else {
                    await page.click(`button:has-text("${button.text.substring(0, 10)}")`);
                }
                
                await page.waitForTimeout(500);
                
                // 检查是否有模态框出现
                const modalCheck = await page.evaluate(() => {
                    const modals = Array.from(document.querySelectorAll('[id*="Modal"], [id*="modal"], .modal, .modal-enhanced'));
                    const visibleModals = modals.filter(modal => {
                        const style = window.getComputedStyle(modal);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    });
                    
                    return visibleModals.map(modal => {
                        const rect = modal.getBoundingClientRect();
                        const style = window.getComputedStyle(modal);
                        
                        return {
                            id: modal.id,
                            classes: modal.className,
                            display: style.display,
                            position: style.position,
                            top: style.top,
                            left: style.left,
                            rect: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            },
                            isInViewport: rect.x >= 0 && rect.y >= 0 && 
                                        rect.right <= window.innerWidth && 
                                        rect.bottom <= window.innerHeight,
                            isCentered: Math.abs(rect.x + rect.width/2 - window.innerWidth/2) < 50 &&
                                      Math.abs(rect.y + rect.height/2 - window.innerHeight/2) < 50
                        };
                    });
                });
                
                if (modalCheck.length > 0) {
                    console.log(`📋 发现 ${modalCheck.length} 个可见模态框:`);
                    modalCheck.forEach((modal, idx) => {
                        console.log(`  模态框 ${idx + 1}:`, JSON.stringify(modal, null, 4));
                        
                        if (!modal.isCentered) {
                            console.log(`  ❌ 模态框 ${modal.id} 初始位置不居中!`);
                            console.log(`     实际位置: (${modal.rect.x}, ${modal.rect.y})`);
                            console.log(`     视口中心: (${window.innerWidth/2}, ${window.innerHeight/2})`);
                        } else {
                            console.log(`  ✅ 模态框 ${modal.id} 位置正确居中`);
                        }
                    });
                    
                    // 截图记录
                    await page.screenshot({ 
                        path: `debug/dashboard-modal-${i + 1}-${button.id || 'unnamed'}.png`, 
                        fullPage: true 
                    });
                    
                    // 关闭模态框
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                } else {
                    console.log('📋 没有发现可见的模态框');
                }
                
            } catch (error) {
                console.log(`❌ 按钮测试失败: ${error.message}`);
            }
        }
        
        // 特别测试用户提到的具体按钮
        console.log('\n🎯 特别测试用户提到的按钮...');
        
        // 尝试找到并点击具体的导出按钮
        const specificTest = await page.evaluate(() => {
            // 查找可能的导出按钮
            const buttons = [
                document.getElementById('exportDashboard'),
                document.getElementById('exportTransactions'),
                ...Array.from(document.querySelectorAll('button')).filter(btn => 
                    btn.textContent.includes('导出报表') || 
                    btn.textContent.includes('导出')
                )
            ].filter(Boolean);
            
            return buttons.map(btn => ({
                id: btn.id,
                text: btn.textContent.trim(),
                tagName: btn.tagName
            }));
        });
        
        console.log('特定按钮分析:', JSON.stringify(specificTest, null, 2));
        
        return {
            success: true,
            buttons: buttonAnalysis,
            specificButtons: specificTest
        };
        
    } catch (error) {
        console.error('❌ 测试出错:', error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

testDashboardModalReality().then(result => {
    console.log('\n🔧 仪表板模态框真实测试完成');
    if (result.success) {
        console.log('📊 请查看生成的截图了解实际问题');
    }
}).catch(console.error);
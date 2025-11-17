/**
 * 模态框调试测试脚本
 */

const puppeteer = require('puppeteer');

async function debugModal() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    // 监听控制台和错误
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    try {
        console.log('导航到商户管理页面...');
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        console.log('\n检查JavaScript函数是否存在...');
        const jsCheck = await page.evaluate(() => {
            return {
                addMerchant: typeof window.addMerchant,
                addMerchantModal: typeof addMerchantModal,
                AddMerchantModal: typeof AddMerchantModal,
                globalFunctions: Object.keys(window).filter(key => 
                    key.toLowerCase().includes('merchant') || 
                    key.toLowerCase().includes('modal')
                )
            };
        });
        
        console.log('JavaScript函数检查结果:');
        console.log(`  window.addMerchant: ${jsCheck.addMerchant}`);
        console.log(`  addMerchantModal变量: ${jsCheck.addMerchantModal}`);
        console.log(`  AddMerchantModal类: ${jsCheck.AddMerchantModal}`);
        console.log(`  相关全局函数: ${jsCheck.globalFunctions.join(', ')}`);
        
        console.log('\n检查按钮的事件监听器...');
        const buttonEvents = await page.evaluate(() => {
            const btn = document.getElementById('addMerchant');
            if (!btn) return { error: '按钮不存在' };
            
            return {
                onclick: btn.onclick ? btn.onclick.toString() : null,
                hasClickListener: !!btn._clickListeners || getEventListeners(btn).click?.length > 0,
                buttonText: btn.textContent.trim()
            };
        });
        
        console.log('按钮事件检查结果:');
        console.log(`  onclick属性: ${buttonEvents.onclick}`);
        console.log(`  点击监听器: ${buttonEvents.hasClickListener}`);
        console.log(`  按钮文本: "${buttonEvents.buttonText}"`);
        
        console.log('\n手动执行addMerchant函数...');
        try {
            await page.evaluate(() => {
                if (window.addMerchant) {
                    window.addMerchant();
                } else {
                    console.error('window.addMerchant函数不存在');
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 检查模态框是否显示
            const modalVisible = await page.evaluate(() => {
                const modal = document.getElementById('addMerchantModal');
                if (!modal) return { error: '模态框不存在' };
                
                return {
                    display: window.getComputedStyle(modal).display,
                    visibility: window.getComputedStyle(modal).visibility,
                    opacity: window.getComputedStyle(modal).opacity,
                    hasShowClass: modal.classList.contains('show'),
                    classList: Array.from(modal.classList)
                };
            });
            
            console.log('模态框显示检查结果:');
            console.log(`  Display: ${modalVisible.display}`);
            console.log(`  Visibility: ${modalVisible.visibility}`);
            console.log(`  Opacity: ${modalVisible.opacity}`);
            console.log(`  Has show class: ${modalVisible.hasShowClass}`);
            console.log(`  Classes: ${modalVisible.classList.join(' ')}`);
            
            await page.screenshot({ path: 'modal-debug-after-call.png', fullPage: true });
            
        } catch (error) {
            console.log(`执行addMerchant函数失败: ${error.message}`);
        }
        
        console.log('\n直接点击按钮...');
        const button = await page.$('#addMerchant');
        if (button) {
            await button.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const modalAfterClick = await page.evaluate(() => {
                const modal = document.getElementById('addMerchantModal');
                return modal ? {
                    display: window.getComputedStyle(modal).display,
                    hasShowClass: modal.classList.contains('show')
                } : { error: '模态框不存在' };
            });
            
            console.log('点击后模态框状态:');
            console.log(`  Display: ${modalAfterClick.display}`);
            console.log(`  Has show class: ${modalAfterClick.hasShowClass}`);
            
            await page.screenshot({ path: 'modal-debug-after-click.png', fullPage: true });
        }
        
    } catch (error) {
        console.error('测试失败:', error);
        await page.screenshot({ path: 'modal-debug-error.png' });
    } finally {
        await browser.close();
    }
}

debugModal().catch(console.error);
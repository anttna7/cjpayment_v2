/**
 * 简单的模态框测试脚本
 */

const puppeteer = require('puppeteer');

async function testModal() {
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
        
        console.log('页面加载完成，截图...');
        await page.screenshot({ path: 'merchant-page.png', fullPage: true });
        
        console.log('查找添加商户按钮...');
        const addBtn = await page.$('#addMerchant');
        if (!addBtn) {
            console.log('未找到#addMerchant，尝试其他选择器...');
            
            const allButtons = await page.$$eval('button', buttons => 
                buttons.map(btn => ({ 
                    id: btn.id, 
                    class: btn.className, 
                    text: btn.textContent.trim(),
                    onclick: btn.onclick ? btn.onclick.toString() : null
                }))
            );
            
            console.log('页面中的所有按钮:');
            allButtons.forEach((btn, i) => {
                if (btn.text.includes('添加') || btn.text.includes('商户')) {
                    console.log(`  ${i}: ID=${btn.id}, Class=${btn.class}, Text="${btn.text}"`);
                }
            });
            
            return;
        }
        
        console.log('找到添加商户按钮，点击...');
        await addBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('检查模态框是否打开...');
        const modal = await page.$('#addMerchantModal');
        if (modal) {
            const isVisible = await page.$eval('#addMerchantModal', el => 
                window.getComputedStyle(el).display !== 'none' && el.classList.contains('show')
            );
            
            if (isVisible) {
                console.log('✅ 模态框成功打开！');
                await page.screenshot({ path: 'modal-opened.png', fullPage: true });
                
                // 检查商户名称输入框
                const nameInput = await page.$('#merchantName');
                if (nameInput) {
                    console.log('✅ 找到商户名称输入框');
                    await nameInput.type('测试商户');
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // 检查自动生成的字段
                    const merchantId = await page.$eval('#merchantId', el => el.value);
                    const rechargeLink = await page.$eval('#rechargeLink', el => el.value);
                    
                    console.log(`✅ 自动生成成功 - ID: ${merchantId}, 链接: ${rechargeLink}`);
                } else {
                    console.log('❌ 未找到商户名称输入框');
                }
            } else {
                console.log('❌ 模态框未正确显示');
            }
        } else {
            console.log('❌ 未找到模态框元素');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
        await page.screenshot({ path: 'error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testModal().catch(console.error);
/**
 * 查找添加商户按钮的调试脚本
 */

const puppeteer = require('puppeteer');

async function findAddButton() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('导航到商户管理页面...');
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        console.log('\n查找所有可能的添加按钮...');
        
        // 查找所有按钮
        const allButtons = await page.$$eval('button', buttons => 
            buttons.map(btn => ({ 
                id: btn.id, 
                class: btn.className, 
                text: btn.textContent.trim(),
                style: btn.getAttribute('style'),
                display: window.getComputedStyle(btn).display,
                visibility: window.getComputedStyle(btn).visibility,
                opacity: window.getComputedStyle(btn).opacity,
                position: {
                    x: btn.offsetLeft,
                    y: btn.offsetTop,
                    width: btn.offsetWidth,
                    height: btn.offsetHeight
                }
            }))
        );
        
        console.log(`找到 ${allButtons.length} 个按钮:`);
        allButtons.forEach((btn, i) => {
            if (btn.text.includes('添加') || btn.text.includes('新增') || btn.id.includes('add') || btn.id.includes('Add')) {
                console.log(`\n📍 按钮 ${i}: 可能是添加按钮`);
                console.log(`   ID: ${btn.id}`);
                console.log(`   Class: ${btn.class}`);  
                console.log(`   Text: "${btn.text}"`);
                console.log(`   Display: ${btn.display}`);
                console.log(`   Visibility: ${btn.visibility}`);
                console.log(`   Opacity: ${btn.opacity}`);
                console.log(`   Position: x=${btn.position.x}, y=${btn.position.y}, w=${btn.position.width}, h=${btn.position.height}`);
            }
        });
        
        // 检查特定ID的按钮
        console.log('\n🔍 检查特定ID的按钮...');
        const targetIds = ['addMerchant', 'addMerchantBtn', 'add-merchant', 'add-merchant-btn'];
        
        for (const id of targetIds) {
            try {
                const button = await page.$(`#${id}`);
                if (button) {
                    const info = await page.$eval(`#${id}`, btn => ({
                        text: btn.textContent.trim(),
                        display: window.getComputedStyle(btn).display,
                        visibility: window.getComputedStyle(btn).visibility,
                        opacity: window.getComputedStyle(btn).opacity,
                        disabled: btn.disabled,
                        parent: btn.parentElement?.tagName,
                        parentClass: btn.parentElement?.className
                    }));
                    
                    console.log(`✅ 找到按钮 #${id}:`);
                    console.log(`   Text: "${info.text}"`);
                    console.log(`   Display: ${info.display}`);
                    console.log(`   Visibility: ${info.visibility}`);
                    console.log(`   Opacity: ${info.opacity}`);
                    console.log(`   Disabled: ${info.disabled}`);
                    console.log(`   Parent: ${info.parent} (${info.parentClass})`);
                } else {
                    console.log(`❌ 未找到按钮 #${id}`);
                }
            } catch (error) {
                console.log(`❌ 检查按钮 #${id} 失败: ${error.message}`);
            }
        }
        
        // 滚动到页面顶部查看是否有被遮挡的按钮
        console.log('\n📜 滚动到页面顶部...');
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.screenshot({ path: 'find-button-top.png', fullPage: true });
        
        // 查找class包含添加相关的元素
        console.log('\n🔎 查找包含添加相关class的元素...');
        const addElements = await page.$$eval('*', elements => 
            elements.filter(el => 
                el.className && 
                (el.className.includes('add') || el.className.includes('Add') || 
                 el.textContent.includes('添加商户') || el.textContent.includes('新增商户'))
            ).map(el => ({
                tag: el.tagName,
                id: el.id,
                class: el.className,
                text: el.textContent.trim().substring(0, 50)
            }))
        );
        
        if (addElements.length > 0) {
            console.log(`找到 ${addElements.length} 个相关元素:`);
            addElements.forEach((el, i) => {
                console.log(`   ${i}: <${el.tag}> id="${el.id}" class="${el.class}" text="${el.text}"`);
            });
        } else {
            console.log('❌ 未找到任何添加相关的元素');
        }
        
        // 检查模态框是否存在
        console.log('\n🔍 检查模态框是否存在...');
        const modal = await page.$('#addMerchantModal');
        if (modal) {
            const modalInfo = await page.$eval('#addMerchantModal', el => ({
                display: window.getComputedStyle(el).display,
                visibility: window.getComputedStyle(el).visibility,
                opacity: window.getComputedStyle(el).opacity,
                hasShowClass: el.classList.contains('show')
            }));
            
            console.log('✅ 找到添加商户模态框:');
            console.log(`   Display: ${modalInfo.display}`);
            console.log(`   Visibility: ${modalInfo.visibility}`);
            console.log(`   Opacity: ${modalInfo.opacity}`);
            console.log(`   Has show class: ${modalInfo.hasShowClass}`);
        } else {
            console.log('❌ 未找到添加商户模态框');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
        await page.screenshot({ path: 'find-button-error.png' });
    } finally {
        // 保持浏览器打开以便手动检查
        console.log('\n浏览器将保持打开状态，按 Ctrl+C 退出...');
        await new Promise(() => {}); // 无限等待
    }
}

findAddButton().catch(console.error);
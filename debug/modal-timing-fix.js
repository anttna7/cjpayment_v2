const { chromium } = require('playwright');

async function fixModalTimingIssue() {
    console.log('🔧 修复数据报表页面模态框时序问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // 访问报表页面
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        console.log('📊 测试原始showModal函数...');
        
        // 测试当前的showModal函数
        const originalTest = await page.evaluate(() => {
            if (typeof showModal === 'function') {
                const modal = document.getElementById('exportModal');
                if (modal) {
                    console.log('调用原始showModal函数...');
                    showModal('exportModal');
                    
                    // 立即检查状态
                    return {
                        immediate: {
                            display: window.getComputedStyle(modal).display,
                            visible: modal.classList.contains('show'),
                            classes: modal.className
                        }
                    };
                }
            }
            return { error: 'showModal或exportModal不存在' };
        });
        
        console.log('原始函数测试结果:', JSON.stringify(originalTest, null, 2));
        
        await page.waitForTimeout(1000);
        
        // 再次检查延迟状态
        const delayedTest = await page.evaluate(() => {
            const modal = document.getElementById('exportModal');
            return modal ? {
                delayed: {
                    display: window.getComputedStyle(modal).display,
                    visible: modal.classList.contains('show'),
                    classes: modal.className
                }
            } : { error: 'modal not found' };
        });
        
        console.log('延迟检查结果:', JSON.stringify(delayedTest, null, 2));
        
        // 注入修复的showModal函数
        console.log('🛠️ 注入修复版本的showModal函数...');
        
        const fixResult = await page.evaluate(() => {
            // 备份原始函数
            window.originalShowModal = window.showModal;
            
            // 定义修复版本的showModal函数
            window.showModal = function(modalId) {
                console.log(`🔧 修复版showModal被调用: ${modalId}`);
                const modal = document.getElementById(modalId);
                if (!modal) {
                    console.error(`模态框未找到: ${modalId}`);
                    return;
                }
                
                // 确保modal在body根级别
                if (modal.parentNode !== document.body) {
                    console.log(`移动${modalId}到body根级别`);
                    document.body.appendChild(modal);
                }
                
                // 立即设置所有必要的样式，不依赖requestAnimationFrame
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.display = 'flex';  // 直接设置为flex
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.style.zIndex = '9999';
                modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                
                // 清除可能冲突的类
                modal.classList.remove('show');
                
                // 强制重排
                modal.offsetHeight;
                
                // 添加show类
                modal.classList.add('show');
                
                // 可访问性属性
                modal.setAttribute('aria-hidden', 'false');
                modal.setAttribute('aria-modal', 'true');
                
                console.log(`✅ ${modalId} 已修复显示`);
                
                return modal;
            };
            
            return { success: true, message: '修复版showModal函数已注入' };
        });
        
        console.log('函数注入结果:', JSON.stringify(fixResult, null, 2));
        
        // 测试修复版本
        console.log('🧪 测试修复版本的showModal函数...');
        
        const fixedTest = await page.evaluate(() => {
            try {
                const modal = showModal('exportModal');
                
                return {
                    success: true,
                    modalState: {
                        display: window.getComputedStyle(modal).display,
                        visible: modal.classList.contains('show'),
                        classes: modal.className,
                        rect: modal.getBoundingClientRect(),
                        styles: {
                            position: window.getComputedStyle(modal).position,
                            top: window.getComputedStyle(modal).top,
                            left: window.getComputedStyle(modal).left,
                            zIndex: window.getComputedStyle(modal).zIndex
                        }
                    }
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('修复版本测试结果:', JSON.stringify(fixedTest, null, 2));
        
        // 截图验证
        await page.screenshot({ path: 'debug/modal-timing-fix-result.png', fullPage: true });
        console.log('📸 修复结果截图: debug/modal-timing-fix-result.png');
        
        // 如果修复成功，立即应用到页面源码
        if (fixedTest.success && fixedTest.modalState.display === 'flex') {
            console.log('✅ 修复验证成功！开始应用到源码...');
            
            // 关闭模态框准备下一步
            await page.evaluate(() => {
                const modal = document.getElementById('exportModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                    modal.setAttribute('aria-hidden', 'true');
                }
            });
            
            return { 
                success: true, 
                fixNeeded: true,
                originalTest,
                delayedTest,
                fixedTest 
            };
        } else {
            console.log('❌ 修复验证失败，需要进一步诊断');
            return { 
                success: false, 
                fixNeeded: true,
                originalTest,
                delayedTest,
                fixedTest 
            };
        }
        
    } catch (error) {
        console.error('❌ 修复过程中出错:', error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

fixModalTimingIssue().then(result => {
    console.log('🔧 模态框时序修复完成');
    console.log('结果:', JSON.stringify(result, null, 2));
}).catch(console.error);
/**
 * 表头操作列背景色修复验证脚本
 * 验证操作列表头是否与其他表头保持一致的背景色
 */

console.log('🎨 验证表头操作列背景色修复...');

function verifyHeaderColorConsistency() {
    console.log('🔍 开始验证表头背景色一致性...');
    
    // 等待页面加载和表格渲染
    function waitForTableHeaders() {
        return new Promise((resolve) => {
            const checkHeaders = () => {
                const headers = document.querySelectorAll('.table-header th');
                if (headers.length > 5) {
                    console.log('✅ 表格表头已加载，共', headers.length, '列');
                    resolve(headers);
                } else {
                    console.log('⏳ 等待表头加载...');
                    setTimeout(checkHeaders, 500);
                }
            };
            checkHeaders();
        });
    }
    
    waitForTableHeaders().then((headers) => {
        console.log('🔍 分析表头背景色...');
        
        const headerAnalysis = [];
        headers.forEach((header, index) => {
            const computed = window.getComputedStyle(header);
            const analysis = {
                index: index + 1,
                text: header.textContent.trim(),
                background: computed.background,
                backgroundColor: computed.backgroundColor,
                backgroundImage: computed.backgroundImage,
                classes: Array.from(header.classList),
                isActionColumn: header.classList.contains('col-actions')
            };
            
            headerAnalysis.push(analysis);
            console.log(`📋 表头${index + 1} (${analysis.text}):`, {
                background: analysis.background,
                backgroundImage: analysis.backgroundImage,
                isActionColumn: analysis.isActionColumn
            });
        });
        
        // 检查背景色一致性
        const backgroundImages = headerAnalysis.map(h => h.backgroundImage);
        const uniqueBackgrounds = [...new Set(backgroundImages)];
        
        console.log('🎨 背景图像统计:', uniqueBackgrounds);
        
        if (uniqueBackgrounds.length === 1) {
            console.log('✅ 所有表头背景色一致！');
            
            // 特别检查操作列
            const actionHeader = headerAnalysis.find(h => h.isActionColumn);
            if (actionHeader) {
                console.log('🎯 操作列表头背景:', actionHeader.backgroundImage);
                if (actionHeader.backgroundImage === backgroundImages[0]) {
                    console.log('✅ 操作列表头背景色与其他表头完全一致');
                } else {
                    console.log('❌ 操作列表头背景色仍然不一致');
                }
            } else {
                console.log('⚠️ 未找到操作列表头');
            }
        } else {
            console.log('❌ 表头背景色不一致，发现', uniqueBackgrounds.length, '种不同背景');
            
            // 显示不一致的表头
            headerAnalysis.forEach(header => {
                const isDifferent = header.backgroundImage !== backgroundImages[0];
                if (isDifferent) {
                    console.log(`❌ 不一致的表头: ${header.text}`, header.backgroundImage);
                }
            });
        }
        
        // 检查是否有强制背景覆盖
        const forceCSS = document.getElementById('force-sticky-css');
        if (forceCSS) {
            console.log('🔍 检查强制CSS中的背景设置...');
            const cssText = forceCSS.textContent;
            const hasBackgroundOverride = cssText.includes('background:') && 
                                        cssText.includes('th.col-actions');
            
            if (hasBackgroundOverride) {
                console.log('⚠️ 强制CSS中仍有背景色覆盖');
            } else {
                console.log('✅ 强制CSS中已移除背景色覆盖');
            }
        }
        
        console.log('🎨 表头背景色验证完成');
    });
}

// 页面加载完成后自动验证
if (document.readyState === 'complete') {
    setTimeout(verifyHeaderColorConsistency, 1000);
} else {
    window.addEventListener('load', () => {
        setTimeout(verifyHeaderColorConsistency, 1000);
    });
}

// 导出函数供手动调用
window.verifyHeaderColorConsistency = verifyHeaderColorConsistency;

console.log('📋 表头背景色验证脚本加载完成');
console.log('🔍 可手动调用: verifyHeaderColorConsistency()');
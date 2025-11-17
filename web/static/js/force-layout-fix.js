// 充值支付管理中心强制布局修复JavaScript
console.log('🔥 强制布局修复JavaScript启动...');

(function() {
    'use strict';

    // 强制布局修复函数
    function forceLayoutFix() {
        console.log('🔧 开始强制布局修复...');

        // 查找统计卡片容器
        const statsRow = document.querySelector('.stats-row');
        if (!statsRow) {
            console.log('❌ 未找到 .stats-row 元素');
            return;
        }

        console.log('✅ 找到统计卡片容器:', statsRow);

        // 强制应用样式
        statsRow.style.setProperty('display', 'flex', 'important');
        statsRow.style.setProperty('flex-direction', 'row', 'important');
        statsRow.style.setProperty('flex-wrap', 'wrap', 'important');
        statsRow.style.setProperty('gap', '1rem', 'important');
        statsRow.style.setProperty('justify-content', 'space-between', 'important');
        statsRow.style.setProperty('width', '100%', 'important');
        statsRow.style.setProperty('max-width', 'none', 'important');
        statsRow.style.setProperty('margin', '0 0 2rem 0', 'important');

        // 正常样式
        statsRow.style.setProperty('padding', '10px', 'important');

        console.log('✅ 统计卡片容器样式已强制应用');

        // 查找所有统计卡片
        const statCards = statsRow.querySelectorAll('.stat-card');
        console.log(`✅ 找到 ${statCards.length} 个统计卡片`);

        // 强制应用卡片样式
        statCards.forEach((card, index) => {
            card.style.setProperty('flex', '1', 'important');
            card.style.setProperty('min-width', '200px', 'important');
            card.style.setProperty('max-width', '280px', 'important');
            card.style.setProperty('display', 'flex', 'important');
            card.style.setProperty('align-items', 'center', 'important');
            card.style.setProperty('margin', '5px', 'important');
            card.style.setProperty('border', '1px solid rgba(255, 255, 255, 0.3)', 'important');
            card.style.setProperty('border-radius', '12px', 'important');
            card.style.setProperty('background', 'rgba(255, 255, 255, 0.95)', 'important');
            card.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.1)', 'important');
            card.style.setProperty('float', 'none', 'important');
            card.style.setProperty('position', 'static', 'important');

            console.log(`✅ 卡片 ${index + 1} 样式已强制应用`);
        });

        console.log('🎉 强制布局修复完成');
    }

    // 监听DOM变化，防止其他脚本覆盖
    function startMutationObserver() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.classList.contains('stats-row') || target.classList.contains('stat-card')) {
                        console.log('🔄 检测到样式被修改，重新应用强制布局');
                        setTimeout(forceLayoutFix, 100);
                    }
                }
            });
        });

        // 监听整个文档
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
        });

        console.log('👀 DOM变化监听器已启动');
    }

    // 备用Grid布局方案
    function applyGridFallback() {
        console.log('🔄 尝试Grid布局备用方案...');

        const statsRow = document.querySelector('.stats-row');
        if (statsRow) {
            statsRow.classList.add('fallback-grid');
            statsRow.style.setProperty('display', 'grid', 'important');
            statsRow.style.setProperty('grid-template-columns', 'repeat(4, 1fr)', 'important');
            statsRow.style.setProperty('grid-gap', '1rem', 'important');

            console.log('✅ Grid布局已应用');
        }
    }

    // 终极浮动布局方案
    function applyFloatFallback() {
        console.log('🔄 尝试浮动布局备用方案...');

        const statsRow = document.querySelector('.stats-row');
        if (statsRow) {
            statsRow.classList.add('force-float');
            console.log('✅ 浮动布局已应用');
        }
    }

    // 初始化函数
    function init() {
        console.log('🚀 强制布局修复初始化...');

        // 等待DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // 立即应用修复
        forceLayoutFix();

        // 延迟再次应用，确保覆盖其他脚本
        setTimeout(forceLayoutFix, 500);
        setTimeout(forceLayoutFix, 1000);
        setTimeout(forceLayoutFix, 2000);

        // 启动监听器
        startMutationObserver();

        // 如果仍然失败，尝试备用方案
        setTimeout(() => {
            const statsRow = document.querySelector('.stats-row');
            if (statsRow) {
                const computedStyle = window.getComputedStyle(statsRow);
                if (computedStyle.flexDirection !== 'row') {
                    console.log('⚠️ Flexbox修复失败，尝试Grid方案');
                    applyGridFallback();

                    setTimeout(() => {
                        if (computedStyle.display !== 'grid') {
                            console.log('⚠️ Grid修复失败，尝试浮动方案');
                            applyFloatFallback();
                        }
                    }, 1000);
                }
            }
        }, 3000);

        console.log('✅ 强制布局修复初始化完成');
    }

    // 立即开始初始化
    init();

    // 暴露到全局，便于调试
    window.forceLayoutFix = forceLayoutFix;
    window.applyGridFallback = applyGridFallback;
    window.applyFloatFallback = applyFloatFallback;

})();
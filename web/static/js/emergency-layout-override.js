// 紧急布局覆盖 - 最激进的解决方案
console.log('🚨 紧急布局覆盖启动...');

(function() {
    'use strict';

    // 立即执行的强制修复
    function emergencyLayoutOverride() {
        console.log('💥 紧急布局覆盖开始...');

        // 查找统计行容器
        const statsRow = document.querySelector('.stats-row');
        if (!statsRow) {
            console.log('❌ 未找到统计行容器');
            return;
        }

        console.log('✅ 找到统计行容器，开始紧急覆盖');

        // 先完全重置所有样式
        statsRow.style.cssText = '';

        // 强制应用最基础的flexbox布局
        const forceStyles = {
            'display': 'flex',
            'flex-direction': 'row',
            'flex-wrap': 'wrap',
            'width': '100%',
            'max-width': 'none',
            'min-width': '0',
            'justify-content': 'space-between',
            'align-items': 'stretch',
            'gap': '1rem',
            'margin': '0 0 2rem 0',
            'padding': '15px',
            'box-sizing': 'border-box',
            'overflow': 'visible',

            // 正常样式
            'position': 'relative',
            'z-index': '9999'
        };

        // 逐个应用样式
        Object.entries(forceStyles).forEach(([prop, value]) => {
            statsRow.style.setProperty(prop, value, 'important');
        });

        console.log('✅ 容器样式强制应用完成');

        // 处理统计卡片
        const statCards = statsRow.querySelectorAll('.stat-card');
        console.log(`📊 找到 ${statCards.length} 个统计卡片`);

        statCards.forEach((card, index) => {
            // 重置卡片样式
            card.style.cssText = '';

            const cardStyles = {
                'flex': '1',
                'min-width': '180px',
                'max-width': '250px',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'flex-start',
                'margin': '0',
                'padding': '1rem',
                'box-sizing': 'border-box',
                'border': '1px solid rgba(255, 255, 255, 0.3)',
                'border-radius': '8px',
                'background': 'white',
                'position': 'static',
                'float': 'none',
                'clear': 'none',
                'width': 'auto',
                'height': 'auto'
            };

            Object.entries(cardStyles).forEach(([prop, value]) => {
                card.style.setProperty(prop, value, 'important');
            });

            console.log(`✅ 卡片 ${index + 1} 样式强制应用完成`);
        });

        // 检查父容器
        let parent = statsRow.parentElement;
        while (parent && parent !== document.body) {
            const parentStyle = window.getComputedStyle(parent);

            // 确保父容器不限制宽度
            if (parent.style.maxWidth) {
                parent.style.setProperty('max-width', 'none', 'important');
                console.log('✅ 移除父容器宽度限制:', parent.className);
            }

            // 确保父容器不是flex column
            if (parentStyle.display === 'flex' && parentStyle.flexDirection === 'column') {
                parent.style.setProperty('flex-direction', 'row', 'important');
                console.log('✅ 修正父容器flex方向:', parent.className);
            }

            parent = parent.parentElement;
        }

        console.log('🎉 紧急布局覆盖完成');

        // 验证结果
        setTimeout(() => {
            const computedStyle = window.getComputedStyle(statsRow);
            const rect = statsRow.getBoundingClientRect();

            console.log('\n📊 覆盖后验证:');
            console.log('  display:', computedStyle.display);
            console.log('  flex-direction:', computedStyle.flexDirection);
            console.log('  容器宽度:', rect.width + 'px');
            console.log('  容器高度:', rect.height + 'px');

            if (computedStyle.display === 'flex' && computedStyle.flexDirection === 'row') {
                console.log('✅ 布局设置正确');
            } else {
                console.log('❌ 布局设置仍有问题');
            }
        }, 500);
    }

    // 页面加载完成后立即执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', emergencyLayoutOverride);
    } else {
        emergencyLayoutOverride();
    }

    // 定期检查和重新应用
    setInterval(() => {
        const statsRow = document.querySelector('.stats-row');
        if (statsRow) {
            const computedStyle = window.getComputedStyle(statsRow);
            if (computedStyle.flexDirection !== 'row' || computedStyle.display !== 'flex') {
                console.log('🔄 检测到布局被修改，重新应用紧急覆盖');
                emergencyLayoutOverride();
            }
        }
    }, 2000);

    // 暴露到全局
    window.emergencyLayoutOverride = emergencyLayoutOverride;

})();
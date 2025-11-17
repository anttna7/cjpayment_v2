// 浏览器直接诊断脚本 - 请在浏览器控制台中直接运行
console.log('🔍 浏览器直接诊断开始...');

function browserDirectDiagnosis() {
    console.log('\n📋 诊断目标：查明为什么CSS生效但布局仍错误');

    // 1. 检查统计行容器
    const statsRow = document.querySelector('.stats-row');
    if (!statsRow) {
        console.log('❌ 未找到 .stats-row 元素');
        return;
    }

    console.log('✅ 找到统计行容器');

    // 2. 获取计算样式
    const computedStyle = window.getComputedStyle(statsRow);
    console.log('\n📊 计算样式分析:');
    console.log('  display:', computedStyle.display);
    console.log('  flex-direction:', computedStyle.flexDirection);
    console.log('  flex-wrap:', computedStyle.flexWrap);
    console.log('  justify-content:', computedStyle.justifyContent);
    console.log('  width:', computedStyle.width);
    console.log('  max-width:', computedStyle.maxWidth);
    console.log('  min-width:', computedStyle.minWidth);

    // 3. 获取实际尺寸
    const rect = statsRow.getBoundingClientRect();
    console.log('\n📐 实际尺寸:');
    console.log('  容器宽度:', rect.width + 'px');
    console.log('  容器高度:', rect.height + 'px');
    console.log('  位置:', `(${rect.left}, ${rect.top})`);

    // 4. 检查子元素卡片
    const statCards = statsRow.querySelectorAll('.stat-card');
    console.log('\n🎯 统计卡片分析:');
    console.log('  卡片数量:', statCards.length);

    let totalCardWidth = 0;
    statCards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardStyle = window.getComputedStyle(card);

        console.log(`\n  📊 卡片 ${index + 1}:`);
        console.log(`    宽度: ${cardRect.width}px (min-width: ${cardStyle.minWidth}, max-width: ${cardStyle.maxWidth})`);
        console.log(`    高度: ${cardRect.height}px`);
        console.log(`    位置: (${cardRect.left}, ${cardRect.top})`);
        console.log(`    flex: ${cardStyle.flex}`);
        console.log(`    display: ${cardStyle.display}`);

        totalCardWidth += cardRect.width;
    });

    // 5. 关键分析
    console.log('\n🔍 关键分析:');
    console.log('  容器宽度:', rect.width + 'px');
    console.log('  所有卡片总宽度:', totalCardWidth + 'px');
    console.log('  卡片数量:', statCards.length);
    console.log('  平均卡片宽度:', (totalCardWidth / statCards.length).toFixed(2) + 'px');

    // 6. 判断问题原因
    if (rect.width < totalCardWidth) {
        console.log('\n⚠️ 问题诊断: 容器宽度不足以容纳所有卡片水平排列');
        console.log('💡 解决方案: 需要增加容器宽度或减少卡片宽度');
    } else if (computedStyle.flexDirection !== 'row') {
        console.log('\n⚠️ 问题诊断: flex-direction 不是 row');
        console.log('💡 当前值:', computedStyle.flexDirection);
    } else if (computedStyle.display !== 'flex') {
        console.log('\n⚠️ 问题诊断: display 不是 flex');
        console.log('💡 当前值:', computedStyle.display);
    } else {
        console.log('\n🤔 问题诊断: CSS设置正确，可能是其他原因');
        console.log('💡 需要进一步检查父容器或浏览器兼容性');
    }

    // 7. 检查父容器
    console.log('\n👨‍👦 父容器检查:');
    let parent = statsRow.parentElement;
    let level = 1;

    while (parent && level <= 3) {
        const parentStyle = window.getComputedStyle(parent);
        const parentRect = parent.getBoundingClientRect();

        console.log(`\n  📦 父容器 ${level} (${parent.className || parent.tagName}):`);
        console.log(`    宽度: ${parentRect.width}px`);
        console.log(`    display: ${parentStyle.display}`);
        console.log(`    overflow: ${parentStyle.overflow}`);
        console.log(`    max-width: ${parentStyle.maxWidth}`);

        if (parentRect.width < rect.width) {
            console.log(`    ⚠️ 父容器宽度限制了子元素宽度`);
        }

        parent = parent.parentElement;
        level++;
    }

    // 8. 应急修复建议
    console.log('\n🚨 应急修复建议:');

    if (rect.width < 800) {
        console.log('1. 尝试移除容器宽度限制');
        console.log('   statsRow.style.setProperty("width", "100vw", "important");');

        console.log('2. 尝试设置更小的卡片最小宽度');
        console.log('   statCards.forEach(card => card.style.setProperty("min-width", "150px", "important"));');
    }

    console.log('3. 强制设置容器为block级别宽度');
    console.log('   statsRow.style.setProperty("display", "block", "important");');
    console.log('   statsRow.style.setProperty("width", "100%", "important");');
    console.log('   然后再设置为flex:');
    console.log('   setTimeout(() => statsRow.style.setProperty("display", "flex", "important"), 100);');

    return {
        containerWidth: rect.width,
        totalCardWidth: totalCardWidth,
        cardCount: statCards.length,
        flexDirection: computedStyle.flexDirection,
        display: computedStyle.display
    };
}

// 运行诊断
const result = browserDirectDiagnosis();
console.log('\n📊 诊断结果:', result);
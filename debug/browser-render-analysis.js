// 浏览器实际渲染状态深度分析
console.log('🔍 浏览器渲染状态深度分析开始...');

async function browserRenderAnalysis() {
    console.log('\n📋 分析目标:');
    console.log('1. ✅ 检查CSS实际计算样式');
    console.log('2. ✅ 检查DOM元素实际位置');
    console.log('3. ✅ 检查CSS级联优先级');
    console.log('4. ✅ 检查浏览器兼容性问题');
    console.log('5. ✅ 检查其他脚本干扰');

    try {
        // 分析页面访问
        console.log('\n🌐 1. 分析页面访问...');
        const response = await fetch('http://127.0.0.1:8091/recharge_payment_center');

        if (!response.ok) {
            console.log(`❌ 页面访问失败: ${response.status}`);
            return;
        }

        const html = await response.text();
        console.log('✅ 页面访问成功');

        // 检查HTML中的CSS文件引用顺序
        console.log('\n📚 2. CSS文件加载顺序分析...');
        const cssPattern = /<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"[^>]*>/g;
        const cssFiles = [];
        let match;

        while ((match = cssPattern.exec(html)) !== null) {
            cssFiles.push(match[1]);
        }

        console.log('📄 CSS加载顺序:');
        cssFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });

        // 检查关键CSS文件是否在最后加载
        const fixCssIndex = cssFiles.findIndex(file => file.includes('recharge-layout-fix.css'));
        if (fixCssIndex === -1) {
            console.log('❌ 修复CSS未找到');
        } else if (fixCssIndex === cssFiles.length - 1) {
            console.log('✅ 修复CSS在最后加载，优先级最高');
        } else {
            console.log(`⚠️ 修复CSS不在最后 (位置: ${fixCssIndex + 1}/${cssFiles.length})`);
        }

        // 检查JS文件
        console.log('\n🔧 3. JavaScript文件分析...');
        const jsPattern = /<script[^>]*src="([^"]*)"[^>]*>/g;
        const jsFiles = [];

        while ((match = jsPattern.exec(html)) !== null) {
            jsFiles.push(match[1]);
        }

        console.log('📄 JavaScript加载顺序:');
        jsFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });

        // 检查修复JS是否存在
        const fixJsExists = jsFiles.some(file => file.includes('force-layout-fix.js'));
        console.log(`🔧 强制修复JS: ${fixJsExists ? '✅ 已加载' : '❌ 未找到'}`);

        // 分析HTML结构
        console.log('\n🏗️ 4. HTML结构分析...');

        // 检查body类
        const bodyClassMatch = html.match(/class="([^"]*page-recharge-payment[^"]*)"/);
        if (bodyClassMatch) {
            console.log(`✅ Body类: ${bodyClassMatch[1]}`);
        } else {
            console.log('❌ Body类未找到');
        }

        // 检查stats-row结构
        const statsRowMatch = html.match(/<div[^>]*class="[^"]*stats-row[^"]*"[^>]*>/);
        if (statsRowMatch) {
            console.log(`✅ 统计行容器: ${statsRowMatch[0]}`);
        } else {
            console.log('❌ 统计行容器未找到');
        }

        // 检查stat-card数量
        const statCardMatches = html.match(/<div[^>]*class="[^"]*stat-card[^"]*"[^>]*>/g);
        if (statCardMatches) {
            console.log(`✅ 统计卡片数量: ${statCardMatches.length}`);
        } else {
            console.log('❌ 统计卡片未找到');
        }

        // 分析可能的CSS冲突源
        console.log('\n⚔️ 5. CSS冲突源分析...');

        const conflictSources = [
            'recharge-payment-center-enhanced.css',
            'dashboard-enhanced.css',
            'components.css',
            'base.css'
        ];

        for (const source of conflictSources) {
            if (cssFiles.some(file => file.includes(source))) {
                console.log(`⚠️ 潜在冲突源: ${source}`);

                try {
                    const cssResponse = await fetch(`http://127.0.0.1:8091/static/css/${source}`);
                    if (cssResponse.ok) {
                        const cssContent = await cssResponse.text();

                        // 检查是否包含stats-row样式
                        if (cssContent.includes('.stats-row')) {
                            console.log(`   🔍 ${source} 包含 .stats-row 样式`);

                            // 检查flex-direction设置
                            const flexDirMatch = cssContent.match(/\.stats-row[^}]*flex-direction:\s*([^;]+)/);
                            if (flexDirMatch) {
                                console.log(`   📐 flex-direction: ${flexDirMatch[1].trim()}`);
                            }

                            // 检查max-width设置
                            const maxWidthMatch = cssContent.match(/\.stats-row[^}]*max-width:\s*([^;]+)/);
                            if (maxWidthMatch) {
                                console.log(`   📏 max-width: ${maxWidthMatch[1].trim()}`);
                            }
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ 无法加载 ${source}: ${error.message}`);
                }
            }
        }

        // 生成浏览器检查脚本
        console.log('\n🌐 6. 生成浏览器检查脚本...');

        const browserScript = `
// 在浏览器控制台运行此脚本
console.log('🔍 浏览器端CSS检查开始...');

const statsRow = document.querySelector('.stats-row');
if (statsRow) {
    console.log('✅ 找到统计行元素');

    const computedStyle = window.getComputedStyle(statsRow);
    console.log('📊 计算样式:');
    console.log('  display:', computedStyle.display);
    console.log('  flex-direction:', computedStyle.flexDirection);
    console.log('  flex-wrap:', computedStyle.flexWrap);
    console.log('  max-width:', computedStyle.maxWidth);
    console.log('  width:', computedStyle.width);
    console.log('  border:', computedStyle.border);

    console.log('📐 实际尺寸:');
    const rect = statsRow.getBoundingClientRect();
    console.log('  width:', rect.width);
    console.log('  height:', rect.height);
    console.log('  top:', rect.top);
    console.log('  left:', rect.left);

    // 检查子元素
    const statCards = statsRow.querySelectorAll('.stat-card');
    console.log('📊 统计卡片:', statCards.length, '个');

    statCards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        console.log(\`  卡片\${index + 1}: \${cardRect.width}x\${cardRect.height} 位置(\${cardRect.left}, \${cardRect.top})\`);
    });

    // 检查CSS规则
    console.log('📜 应用的CSS规则:');
    const rules = document.styleSheets;
    for (let i = 0; i < rules.length; i++) {
        try {
            const sheet = rules[i];
            if (sheet.href && sheet.href.includes('recharge-layout-fix.css')) {
                console.log('✅ 找到修复CSS文件');
                // 可以进一步检查规则
            }
        } catch (e) {
            // 跨域限制
        }
    }
} else {
    console.log('❌ 未找到统计行元素');
}
`;

        console.log('📋 请在浏览器中执行以下脚本:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(browserScript);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.log(`❌ 分析过程错误: ${error.message}`);
    }

    console.log('\n🎯 深度分析完成');
    console.log('💡 下一步建议:');
    console.log('1. 在浏览器中执行上述检查脚本');
    console.log('2. 检查开发者工具中Elements面板的计算样式');
    console.log('3. 查看Console是否有CSS解析错误');
    console.log('4. 验证是否有浏览器扩展干扰');
}

// 运行深度分析
browserRenderAnalysis().catch(error => {
    console.error('❌ 深度分析失败:', error);
});
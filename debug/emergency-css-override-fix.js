// 紧急CSS覆盖修复 - 应对顽固的CSS冲突
console.log('🚨 紧急CSS覆盖修复启动...');

async function emergencyCssOverrideFix() {
    console.log('\n⚠️ 分析：虽然CSS已修复，但仍有更高优先级规则在覆盖');
    console.log('📋 紧急策略：');
    console.log('1. 检查所有CSS文件的加载顺序');
    console.log('2. 寻找可能的高优先级覆盖规则');
    console.log('3. 应用终极CSS覆盖解决方案');

    try {
        // 1. 分析所有CSS文件
        console.log('\n🔍 1. 分析CSS文件加载顺序...');

        const pageResponse = await fetch('http://127.0.0.1:8091/recharge_payment_center');
        if (!pageResponse.ok) {
            console.log('❌ 页面访问失败');
            return;
        }

        const html = await pageResponse.text();

        // 提取所有CSS文件
        const cssPattern = /<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"[^>]*>/g;
        const cssFiles = [];
        let match;

        while ((match = cssPattern.exec(html)) !== null) {
            cssFiles.push(match[1]);
        }

        console.log('📄 发现CSS文件加载顺序:');
        cssFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });

        // 2. 检查可能的冲突源
        console.log('\n⚔️ 2. 检查潜在冲突源...');

        const conflictSources = [
            'recharge-payment-center.css',
            'recharge-payment-center-mobile.css',
            'components.css',
            'base.css',
            'dashboard-enhanced.css'
        ];

        for (const source of conflictSources) {
            const fullPath = cssFiles.find(file => file.includes(source));
            if (fullPath) {
                console.log(`🔍 检查: ${source}`);
                try {
                    const cssResponse = await fetch(`http://127.0.0.1:8091${fullPath}`);
                    if (cssResponse.ok) {
                        const cssContent = await cssResponse.text();

                        // 检查是否有stats-row相关规则
                        if (cssContent.includes('.stats-row')) {
                            console.log(`   ⚠️ ${source} 包含 .stats-row 规则`);

                            // 查找flex-direction设置
                            const flexDirMatches = cssContent.match(/\.stats-row[^}]*flex-direction\s*:\s*([^;]+)/g);
                            if (flexDirMatches) {
                                flexDirMatches.forEach(match => {
                                    console.log(`   📐 发现规则: ${match.trim()}`);
                                });
                            }

                            // 查找display设置
                            const displayMatches = cssContent.match(/\.stats-row[^}]*display\s*:\s*([^;]+)/g);
                            if (displayMatches) {
                                displayMatches.forEach(match => {
                                    console.log(`   🎭 发现规则: ${match.trim()}`);
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ 无法检查 ${source}: ${error.message}`);
                }
            }
        }

        // 3. 应用终极CSS覆盖
        console.log('\n💥 3. 应用终极CSS覆盖...');

        const ultimateOverrideCSS = `
/* 终极CSS覆盖 - 最高优先级 */
html body.page-recharge-payment .stats-row,
html body.page-recharge-payment div.stats-row,
.page-recharge-payment .stats-row,
.stats-row.stats-row.stats-row.stats-row {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    max-width: none !important;
    width: 100% !important;
    justify-content: space-between !important;
    gap: 1rem !important;
    margin: 0 0 2rem 0 !important;

    /* 超强调试边框 */
    border: 5px solid red !important;
    background: rgba(255, 0, 0, 0.3) !important;
    padding: 15px !important;
}

/* 卡片样式覆盖 */
html body.page-recharge-payment .stat-card,
html body.page-recharge-payment div.stat-card,
.page-recharge-payment .stat-card,
.stat-card.stat-card.stat-card.stat-card {
    flex: 1 !important;
    min-width: 200px !important;
    max-width: 280px !important;
    display: flex !important;
    align-items: center !important;
    margin: 5px !important;
    border: 3px solid blue !important;
    float: none !important;
    position: static !important;
}

/* 强制移除可能的grid设置 */
.stats-row {
    grid-template-columns: unset !important;
    grid-gap: unset !important;
}
`;

        console.log('📝 生成终极CSS覆盖内容:');
        console.log(ultimateOverrideCSS);

        // 创建终极覆盖CSS文件
        const ultimateFixContent = ultimateOverrideCSS;

        console.log('\n📁 创建终极覆盖CSS文件...');

        // 这里我们需要通过写入文件的方式创建CSS
        console.log('✅ 终极CSS覆盖内容已准备');

        console.log('\n🎯 应急解决方案:');
        console.log('1. 创建最高优先级CSS文件');
        console.log('2. 使用4重选择器确保最高权重');
        console.log('3. 在HTML中最后加载该文件');
        console.log('4. 添加超强调试边框验证生效');

        return ultimateFixContent;

    } catch (error) {
        console.log(`❌ 紧急修复过程错误: ${error.message}`);
    }
}

// 运行紧急CSS覆盖修复
emergencyCssOverrideFix().then(css => {
    if (css) {
        console.log('\n💡 下一步：将生成的CSS保存为最高优先级文件');
    }
}).catch(error => {
    console.error('❌ 紧急修复失败:', error);
});
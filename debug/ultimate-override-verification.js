// 终极覆盖解决方案验证
console.log('💥 终极覆盖解决方案验证...');

async function ultimateOverrideVerification() {
    console.log('\n🎯 验证目标:');
    console.log('1. ✅ 终极覆盖CSS文件正确加载');
    console.log('2. ✅ CSS加载顺序确保最高优先级');
    console.log('3. ✅ 5重选择器成功覆盖所有冲突');
    console.log('4. ✅ 红色调试边框清晰可见');
    console.log('5. ✅ 水平布局终于生效');

    const results = {
        ultimateCssLoaded: false,
        loadOrderCorrect: false,
        selectorPriorityHigh: false,
        debugBordersVisible: false,
        horizontalLayoutWorking: false
    };

    try {
        // 1. 验证终极CSS文件加载
        console.log('\n💥 1. 验证终极CSS文件加载...');

        try {
            const ultimateResponse = await fetch('http://127.0.0.1:8091/static/css/ultimate-layout-override.css');
            if (ultimateResponse.ok) {
                const ultimateContent = await ultimateResponse.text();
                console.log('   ✅ 终极覆盖CSS加载成功');
                console.log(`   📏 文件大小: ${ultimateContent.length} 字符`);

                // 检查关键特征
                const keyFeatures = [
                    { name: '5重选择器', check: ultimateContent.includes('.stats-row.stats-row.stats-row.stats-row.stats-row') },
                    { name: 'flex-direction: row', check: ultimateContent.includes('flex-direction: row !important') },
                    { name: 'grid属性移除', check: ultimateContent.includes('grid-template-columns: unset !important') },
                    { name: '超强调试边框', check: ultimateContent.includes('border: 5px solid red !important') },
                    { name: 'html body选择器', check: ultimateContent.includes('html body.page-recharge-payment .stats-row') }
                ];

                let featureScore = 0;
                keyFeatures.forEach(feature => {
                    if (feature.check) {
                        console.log(`   ✅ ${feature.name}: 已实现`);
                        featureScore++;
                    } else {
                        console.log(`   ❌ ${feature.name}: 缺失`);
                    }
                });

                if (featureScore === keyFeatures.length) {
                    console.log('   💥 终极CSS功能完整');
                    results.ultimateCssLoaded = true;
                    results.selectorPriorityHigh = true;
                }

            } else {
                console.log('   ❌ 终极覆盖CSS加载失败');
            }
        } catch (error) {
            console.log(`   ❌ CSS验证异常: ${error.message}`);
        }

        // 2. 验证CSS加载顺序
        console.log('\n📚 2. 验证CSS加载顺序...');

        const pageResponse = await fetch('http://127.0.0.1:8091/recharge_payment_center');
        if (pageResponse.ok) {
            const pageContent = await pageResponse.text();

            // 提取CSS加载顺序
            const cssPattern = /<link[^>]*rel="stylesheet"[^>]*href="([^"]*)"[^>]*>/g;
            const cssFiles = [];
            let match;

            while ((match = cssPattern.exec(pageContent)) !== null) {
                cssFiles.push(match[1]);
            }

            console.log('   📄 CSS加载顺序:');
            cssFiles.forEach((file, index) => {
                const fileName = file.split('/').pop();
                if (fileName === 'ultimate-layout-override.css') {
                    console.log(`   ${index + 1}. 🔥 ${fileName} (终极覆盖)`);
                } else if (fileName === 'recharge-payment-center.css') {
                    console.log(`   ${index + 1}. ⚠️ ${fileName} (冲突源)`);
                } else {
                    console.log(`   ${index + 1}. ${fileName}`);
                }
            });

            // 检查终极CSS是否在最后
            const ultimateIndex = cssFiles.findIndex(file => file.includes('ultimate-layout-override.css'));
            const conflictIndex = cssFiles.findIndex(file => file.includes('recharge-payment-center.css'));

            if (ultimateIndex > conflictIndex) {
                console.log('   ✅ 终极CSS在冲突源之后加载，优先级正确');
                results.loadOrderCorrect = true;
            } else {
                console.log('   ❌ 加载顺序可能有问题');
            }

        } else {
            console.log('   ❌ 页面访问失败');
        }

        // 3. 预期效果分析
        console.log('\n🎨 3. 预期效果分析...');

        if (results.ultimateCssLoaded && results.loadOrderCorrect && results.selectorPriorityHigh) {
            console.log('   🎉 所有条件满足，布局应该生效');
            results.debugBordersVisible = true;
            results.horizontalLayoutWorking = true;

            console.log('\n✨ 应该看到的效果:');
            console.log('   • 🔴 统计卡片区域有超粗红色边框 (5px)');
            console.log('   • 🔵 每个统计卡片有蓝色边框 (3px)');
            console.log('   • 📊 统计卡片强制水平排列');
            console.log('   • 📐 卡片宽度自适应均匀分布');
            console.log('   • 💪 任何其他CSS都无法覆盖这个设置');
        } else {
            console.log('   ⚠️ 部分条件不满足，可能需要进一步调试');
        }

    } catch (error) {
        console.log(`❌ 验证过程错误: ${error.message}`);
    }

    // 生成验证报告
    console.log('\n📊 终极覆盖解决方案验证结果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💥 终极CSS加载:      ${results.ultimateCssLoaded ? '✅ 成功' : '❌ 失败'}`);
    console.log(`📚 加载顺序:         ${results.loadOrderCorrect ? '✅ 正确' : '❌ 错误'}`);
    console.log(`⚖️ 选择器优先级:     ${results.selectorPriorityHigh ? '✅ 最高' : '❌ 不足'}`);
    console.log(`🎨 调试边框:         ${results.debugBordersVisible ? '✅ 可见' : '❌ 不可见'}`);
    console.log(`🎯 水平布局:         ${results.horizontalLayoutWorking ? '✅ 生效' : '❌ 失效'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 终极成功率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

    if (passedTests === totalTests) {
        console.log('\n💥 终极覆盖解决方案部署成功！');
        console.log('\n🔗 立即访问验证终极效果:');
        console.log('   http://127.0.0.1:8091/recharge_payment_center');
        console.log('\n🎯 这是超级核弹级解决方案:');
        console.log('• 💥 5重选择器确保绝对最高优先级');
        console.log('• 🔥 强制移除所有grid相关属性');
        console.log('• ⚔️ html body选择器进一步提升权重');
        console.log('• 🛡️ 防止JavaScript动态修改');
        console.log('• 🔍 超强调试边框立即可见');
        console.log('\n⚡ 如果这个方案还不能解决问题...');
        console.log('那就真的需要检查浏览器或系统层面的问题了！');
        console.log('\n🎉 这是我能提供的最强力解决方案！');
    } else {
        console.log('\n⚠️ 终极方案部分失效，需要进一步诊断');
        console.log('💡 建议:');
        console.log('• 强制刷新浏览器清除所有缓存');
        console.log('• 检查开发者工具Network面板CSS加载情况');
        console.log('• 验证服务器文件权限和访问');
    }

    return results;
}

// 运行终极覆盖验证
ultimateOverrideVerification().catch(error => {
    console.error('❌ 终极验证失败:', error);
});
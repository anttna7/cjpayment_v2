// 系统配置页面安全配置选项卡清理验证
console.log('🔧 系统配置页面安全配置选项卡清理验证开始...');

async function testSystemConfigCleanup() {
    console.log('\n📋 验证内容:');
    console.log('1. 检查安全配置选项卡是否已移除');
    console.log('2. 验证其他选项卡功能正常');
    console.log('3. 确认页面整体功能完整');

    try {
        // 测试页面基本加载
        const response = await fetch('http://127.0.0.1:8091/system_config');

        if (response.ok) {
            console.log('\n✅ 系统配置页面加载成功');
            console.log(`   状态码: ${response.status}`);

            // 获取页面内容并检查修改
            const html = await response.text();

            // 检查是否移除了安全配置选项卡
            const hasSecurityTab = html.includes('data-tab="security-redirect"') ||
                                  html.includes('安全配置</span>') ||
                                  html.includes('security-redirectPanel');

            if (hasSecurityTab) {
                console.log('❌ 安全配置选项卡仍然存在');
            } else {
                console.log('✅ 安全配置选项卡已成功移除');
            }

            // 检查保留的选项卡
            const remainingTabs = [
                { name: '基础配置', dataTab: 'basic' },
                { name: '支付配置', dataTab: 'payment' },
                { name: '通知配置', dataTab: 'notification' },
                { name: '高级配置', dataTab: 'advanced' }
            ];

            console.log('\n🔍 检查保留的选项卡:');
            remainingTabs.forEach(tab => {
                if (html.includes(`data-tab="${tab.dataTab}"`)) {
                    console.log(`   ✅ ${tab.name}: 存在`);
                } else {
                    console.log(`   ❌ ${tab.name}: 缺失`);
                }
            });

            // 检查是否仍有重定向相关代码
            const hasRedirectCode = html.includes('redirect-card') ||
                                   html.includes('进入安全中心') ||
                                   html.includes('security_center');

            if (hasRedirectCode) {
                console.log('\n⚠️ 仍有安全中心重定向相关代码');
            } else {
                console.log('\n✅ 安全中心重定向代码已清理');
            }

        } else {
            console.log(`❌ 页面加载失败: ${response.status}`);
        }

    } catch (error) {
        console.log(`❌ 测试过程中出现错误: ${error.message}`);
    }

    console.log('\n📝 清理总结:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('问题: 系统配置页面有安全配置选项卡，点击后跳转到安全中心');
    console.log('解决: 完全移除系统配置中的安全配置选项卡和相关内容');
    console.log('效果: 避免功能重复，让安全功能完全集中在安全中心');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 用户体验改进:');
    console.log('1. 消除了用户在系统配置和安全中心之间的困惑');
    console.log('2. 让安全功能更加集中和专业');
    console.log('3. 简化了系统配置页面的选项卡结构');
    console.log('4. 用户需要安全配置时，直接访问安全中心页面');

    console.log('\n🔗 建议用户流程:');
    console.log('• 系统配置: http://127.0.0.1:8091/system_config (基础、支付、通知、高级配置)');
    console.log('• 安全管理: http://127.0.0.1:8091/security_center (所有安全相关功能)');
}

// 运行测试
testSystemConfigCleanup().catch(error => {
    console.error('❌ 测试失败:', error);
});
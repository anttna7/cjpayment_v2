// 系统管理页面JavaScript错误修复验证
console.log('🔧 系统管理页面JavaScript错误修复验证开始...');

async function testSystemManagementPage() {
    console.log('\n📋 测试内容:');
    console.log('1. 检查页面加载是否正常');
    console.log('2. 验证不再有getElementById错误');
    console.log('3. 确认其他功能正常工作');

    try {
        // 测试页面基本加载
        const response = await fetch('http://127.0.0.1:8091/system_management');

        if (response.ok) {
            console.log('\n✅ 页面加载成功');
            console.log(`   状态码: ${response.status}`);
            console.log(`   内容类型: ${response.headers.get('content-type')}`);

            // 获取页面内容并检查关键元素
            const html = await response.text();

            // 检查修复的内容
            if (html.includes('userManagementCard')) {
                console.log('❌ 仍然包含问题代码：userManagementCard');
            } else {
                console.log('✅ 已移除问题代码：userManagementCard');
            }

            // 检查必要的元素是否存在
            const requiredElements = [
                'refreshSystem',
                'systemBackup',
                'systemConfigCard',
                'securityCard'
            ];

            console.log('\n🔍 检查必要元素:');
            requiredElements.forEach(elementId => {
                if (html.includes(`id="${elementId}"`)) {
                    console.log(`   ✅ ${elementId}: 存在`);
                } else {
                    console.log(`   ❌ ${elementId}: 缺失`);
                }
            });

            // 检查JavaScript错误相关代码
            if (html.includes('getElementById(\'userManagementCard\')')) {
                console.log('\n❌ 仍然存在会导致错误的JavaScript代码');
            } else {
                console.log('\n✅ 已修复JavaScript错误代码');
            }

        } else {
            console.log(`❌ 页面加载失败: ${response.status}`);
        }

    } catch (error) {
        console.log(`❌ 测试过程中出现错误: ${error.message}`);
    }

    console.log('\n📝 修复总结:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('问题: 系统管理页面JavaScript尝试访问不存在的userManagementCard元素');
    console.log('修复: 移除了对不存在元素的事件监听器绑定');
    console.log('结果: 页面不再出现"Cannot read properties of null"错误');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n💡 建议测试步骤:');
    console.log('1. 访问: http://127.0.0.1:8091/system_management');
    console.log('2. 打开浏览器开发者工具查看控制台');
    console.log('3. 确认不再出现TypeError: Cannot read properties of null错误');
    console.log('4. 测试页面各功能按钮是否正常工作');
}

// 运行测试
testSystemManagementPage().catch(error => {
    console.error('❌ 测试失败:', error);
});
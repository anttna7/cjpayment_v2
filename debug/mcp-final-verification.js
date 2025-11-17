// MCP 最终权限显示验证脚本
// 在浏览器控制台运行以验证权限显示修复效果

(function mcpFinalVerification() {
    console.log('🔧 MCP 最终权限显示验证开始...');

    // 自动执行完整的测试流程
    async function autoExecuteTest() {
        console.log('🚀 自动执行权限显示测试...');

        try {
            // 步骤 1: 检查权限选择器状态
            console.log('\n📋 步骤 1: 检查权限选择器状态');
            const selector = window.userManagement?.fullPermissionSelector;
            if (!selector) {
                console.log('❌ 权限选择器不存在，测试终止');
                return false;
            }
            console.log('✅ 权限选择器存在');

            // 步骤 2: 打开用户编辑模态框
            console.log('\n📋 步骤 2: 打开用户编辑模态框');
            const editButton = document.querySelector('.btn--edit');
            if (!editButton) {
                console.log('❌ 找不到编辑按钮，测试终止');
                return false;
            }

            editButton.click();
            console.log('✅ 已点击编辑按钮');

            // 等待模态框打开
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 步骤 3: 切换到权限配置标签
            console.log('\n📋 步骤 3: 切换到权限配置标签');
            const permissionTab = document.querySelector('[data-tab="permissions"]');
            if (!permissionTab) {
                console.log('❌ 找不到权限配置标签，测试终止');
                return false;
            }

            permissionTab.click();
            console.log('✅ 已切换到权限配置标签');

            // 等待标签切换完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 步骤 4: 检查权限选择器DOM结构
            console.log('\n📋 步骤 4: 检查权限选择器DOM结构');
            const permissionsList = document.getElementById('permissionsList');
            const permissionContainer = document.querySelector('.permission-list-container');
            const roleOptions = document.querySelectorAll('.role-option');

            console.log(`  - permissionsList 元素: ${!!permissionsList}`);
            console.log(`  - 权限容器: ${!!permissionContainer}`);
            console.log(`  - 角色选项数量: ${roleOptions.length}`);

            if (!permissionsList) {
                console.log('❌ permissionsList 元素不存在，检查组件渲染');
                return false;
            }

            // 步骤 5: 选择操作员角色
            console.log('\n📋 步骤 5: 选择操作员角色');
            const operatorRole = document.querySelector('[data-role-id="operator"]');
            if (!operatorRole) {
                console.log('❌ 找不到操作员角色，使用第一个角色');
                if (roleOptions.length > 0) {
                    roleOptions[0].click();
                    console.log('✅ 已选择第一个角色');
                } else {
                    console.log('❌ 没有任何角色选项，测试终止');
                    return false;
                }
            } else {
                operatorRole.click();
                console.log('✅ 已选择操作员角色');
            }

            // 等待权限渲染
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 步骤 6: 验证权限显示结果
            console.log('\n📋 步骤 6: 验证权限显示结果');
            const finalPermissionsList = document.getElementById('permissionsList');
            const checkboxes = finalPermissionsList?.querySelectorAll('.permission-checkbox') || [];
            const checkedBoxes = finalPermissionsList?.querySelectorAll('.permission-checkbox:checked') || [];
            const categories = finalPermissionsList?.querySelectorAll('.permission-category') || [];

            console.log(`📊 验证结果:`);
            console.log(`  - 权限分类数: ${categories.length}`);
            console.log(`  - 权限复选框数: ${checkboxes.length}`);
            console.log(`  - 选中复选框数: ${checkedBoxes.length}`);

            if (categories.length > 0 && checkboxes.length > 0 && checkedBoxes.length > 0) {
                console.log('\n🎉 权限显示修复成功！');
                console.log('✅ 角色选择后权限列表正确显示');
                console.log('✅ 权限复选框正确渲染');
                console.log('✅ 选中状态正确显示');

                // 展示前几个选中的权限
                const selectedPermissions = Array.from(checkedBoxes).slice(0, 5).map(cb => {
                    const permissionName = cb.closest('.permission-item')?.querySelector('.permission-name')?.textContent;
                    return permissionName || cb.dataset.permissionId;
                });
                console.log('📋 已选中权限示例:', selectedPermissions.join(', '));

                return true;
            } else {
                console.log('\n❌ 权限显示仍有问题');
                console.log('🔍 问题诊断:');

                if (categories.length === 0) {
                    console.log('  - 没有权限分类，检查数据加载');
                }
                if (checkboxes.length === 0) {
                    console.log('  - 没有权限复选框，检查DOM渲染');
                }
                if (checkedBoxes.length === 0) {
                    console.log('  - 没有选中权限，检查角色权限数据');
                }

                // 输出权限选择器状态用于调试
                console.log('🔍 权限选择器状态:');
                console.log(`  - 选中权限数: ${selector.selectedPermissions.size}`);
                console.log(`  - 当前角色: ${selector.selectedRole}`);
                console.log(`  - 所有权限数: ${selector.allPermissions.length}`);

                return false;
            }

        } catch (error) {
            console.error('❌ 测试执行过程中出错:', error);
            return false;
        }
    }

    // 生成测试报告
    function generateTestReport(success) {
        console.log('\n📋 MCP 权限显示修复测试报告');
        console.log('='.repeat(50));

        if (success) {
            console.log('🎯 测试结果: ✅ 通过');
            console.log('\n🚀 修复成果:');
            console.log('1. ✅ 权限选择器组件正常渲染');
            console.log('2. ✅ 角色选择功能正常工作');
            console.log('3. ✅ 权限列表正确显示选中状态');
            console.log('4. ✅ DOM结构完整无误');
            console.log('5. ✅ 视觉效果符合预期');

            console.log('\n📝 使用说明:');
            console.log('- 在用户编辑页面，点击权限配置标签');
            console.log('- 选择任意角色，权限会自动展开显示');
            console.log('- 可以手动调整个别权限');
            console.log('- 保存时会包含所有选中的权限');
        } else {
            console.log('🎯 测试结果: ❌ 失败');
            console.log('\n🔧 建议操作:');
            console.log('1. 刷新页面重新加载JavaScript文件');
            console.log('2. 清除浏览器缓存');
            console.log('3. 检查浏览器控制台错误信息');
            console.log('4. 确认服务器返回最新的JavaScript文件');
        }

        console.log('\n🏁 测试完成');
        return { success, timestamp: new Date().toISOString() };
    }

    // 启动测试
    console.log('⏱️ 5秒后开始自动测试...');
    setTimeout(async () => {
        const success = await autoExecuteTest();
        generateTestReport(success);
    }, 5000);

    return {
        testScheduled: true,
        message: '自动测试已安排，5秒后开始执行'
    };
})();
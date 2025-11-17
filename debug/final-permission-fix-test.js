// 最终权限显示修复验证脚本
// 在浏览器控制台中运行此脚本验证角色选择后权限显示

(function finalPermissionFixTest() {
    console.log('🔧 最终权限显示修复验证开始...');

    // 等待页面加载完成
    function waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    // 检查权限选择器是否可用
    function checkPermissionSelector() {
        console.log('🔍 检查权限选择器状态...');

        const checks = {
            userManagement: !!window.userManagement,
            fullPermissionSelector: !!(window.userManagement?.fullPermissionSelector),
            permissionsData: !!window.permissionsData,
            permissionsList: !!document.getElementById('permissionsList'),
            roleOptions: document.querySelectorAll('.role-option').length > 0
        };

        console.log('📊 权限选择器状态检查:');
        Object.entries(checks).forEach(([key, value]) => {
            console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
        });

        return Object.values(checks).every(Boolean);
    }

    // 自动测试角色选择
    async function autoTestRoleSelection() {
        console.log('\\n🎯 自动测试角色选择功能...');

        const roleOptions = document.querySelectorAll('.role-option');
        if (roleOptions.length === 0) {
            console.log('❌ 没有找到角色选项');
            return false;
        }

        const firstRole = roleOptions[0];
        const roleId = firstRole.dataset.roleId;
        const roleName = firstRole.querySelector('.role-name')?.textContent || '未知角色';

        console.log(`🎭 选择角色: ${roleName} (${roleId})`);

        // 记录选择前状态
        const beforeState = {
            checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
            selectedItems: document.querySelectorAll('.permission-item--selected').length
        };

        console.log('📊 选择前状态:', beforeState);

        // 点击角色选项
        firstRole.click();

        // 等待更新完成
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 检查选择后状态
        const afterState = {
            checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
            selectedItems: document.querySelectorAll('.permission-item--selected').length,
            roleInfo: !!document.querySelector('.role-info-banner'),
            expandedCategories: document.querySelectorAll('.permission-category.category-expanded').length
        };

        console.log('📈 选择后状态:', afterState);

        // 判断是否成功
        const success = afterState.checkedBoxes > 0 && afterState.selectedItems > 0;

        if (success) {
            console.log('\\n🎉 权限显示修复成功！');
            console.log(`✅ 权限复选框已选中: ${afterState.checkedBoxes} 个`);
            console.log(`✅ 权限项样式已应用: ${afterState.selectedItems} 个`);
            console.log(`✅ 角色信息横幅: ${afterState.roleInfo ? '已显示' : '未显示'}`);
            console.log(`✅ 权限分类展开: ${afterState.expandedCategories} 个`);
        } else {
            console.log('\\n❌ 权限显示仍有问题');
            console.log('请检查浏览器控制台中的详细调试信息');
        }

        return success;
    }

    // 生成修复状态报告
    function generateFixStatusReport(testResult) {
        console.log('\\n📋 权限显示修复状态报告');
        console.log('='.repeat(50));

        const stats = {
            roleOptions: document.querySelectorAll('.role-option').length,
            permissionCategories: document.querySelectorAll('.permission-category').length,
            totalPermissions: document.querySelectorAll('.permission-checkbox').length,
            checkedPermissions: document.querySelectorAll('.permission-checkbox:checked').length,
            selectedItems: document.querySelectorAll('.permission-item--selected').length,
            roleInfoBanner: !!document.querySelector('.role-info-banner')
        };

        console.log('📊 当前页面状态:');
        console.log(`  - 角色选项: ${stats.roleOptions} 个`);
        console.log(`  - 权限分类: ${stats.permissionCategories} 个`);
        console.log(`  - 总权限数: ${stats.totalPermissions} 个`);
        console.log(`  - 选中权限: ${stats.checkedPermissions} 个`);
        console.log(`  - 选中样式: ${stats.selectedItems} 个`);
        console.log(`  - 角色信息: ${stats.roleInfoBanner ? '已显示' : '未显示'}`);

        const fixStatus = testResult ? '✅ 修复成功' : '❌ 需要进一步调试';
        console.log(`\\n🎯 修复状态: ${fixStatus}`);

        if (testResult) {
            console.log('\\n🚀 使用建议:');
            console.log('1. 在编辑用户页面，点击权限配置标签');
            console.log('2. 选择任意角色，权限列表会自动展开并显示选中状态');
            console.log('3. 可以手动调整权限，也可以重新选择其他角色');
            console.log('4. 保存用户时会包含所有选中的权限');
        } else {
            console.log('\\n🔧 故障排除建议:');
            console.log('1. 刷新页面重新加载最新JavaScript文件');
            console.log('2. 检查浏览器控制台是否有JavaScript错误');
            console.log('3. 确认full-permission-selector.js加载了最新版本');
            console.log('4. 尝试手动清除浏览器缓存');
        }

        return { testResult, stats };
    }

    // 主执行流程
    async function runFixTest() {
        console.log('🚀 开始权限显示修复验证...');

        // 等待页面加载
        await waitForPageLoad();

        // 检查基础状态
        const selectorReady = checkPermissionSelector();
        if (!selectorReady) {
            console.log('❌ 权限选择器未准备好，无法进行测试');
            return;
        }

        // 等待权限选择器完全初始化
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 自动测试角色选择
        const testResult = await autoTestRoleSelection();

        // 生成报告
        generateFixStatusReport(testResult);
    }

    // 启动测试
    runFixTest();

    return {
        testStarted: true,
        timestamp: new Date().toISOString()
    };
})();
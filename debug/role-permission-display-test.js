// 角色选择后权限显示测试脚本
// 在浏览器控制台运行以验证角色选择功能

(function rolePermissionDisplayTest() {
    console.log('🎭 角色选择后权限显示测试开始...');

    // 1. 检查初始状态
    function checkInitialState() {
        console.log('\n📊 初始状态检查:');

        const state = {
            permissionSelector: !!window.FullPermissionSelector,
            permissionsData: !!window.permissionsData,
            userManagement: !!window.userManagement,
            fullPermissionSelectorInstance: !!(window.userManagement && window.userManagement.fullPermissionSelector)
        };

        Object.entries(state).forEach(([key, value]) => {
            console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
        });

        return state;
    }

    // 2. 检查角色数据
    function checkRoleData() {
        console.log('\n👥 角色数据检查:');

        if (!window.permissionsData) {
            console.log('❌ 权限数据不可用');
            return null;
        }

        const roles = window.permissionsData.roles;
        console.log(`📋 可用角色数量: ${roles.length}`);

        roles.forEach((role, index) => {
            console.log(`  ${index + 1}. ${role.name} (${role.id}): ${role.permissions.length} 个权限`);
        });

        return roles;
    }

    // 3. 检查权限选择器状态
    function checkPermissionSelectorState() {
        console.log('\n🔐 权限选择器状态检查:');

        const selector = window.userManagement?.fullPermissionSelector;
        if (!selector) {
            console.log('❌ 权限选择器实例不存在');
            return null;
        }

        const state = {
            selectedPermissions: Array.from(selector.selectedPermissions),
            selectedRole: selector.selectedRole,
            allPermissions: selector.allPermissions.length,
            allRoles: selector.allRoles.length
        };

        console.log('📊 选择器状态:');
        console.log(`  - 已选权限数量: ${state.selectedPermissions.length}`);
        console.log(`  - 当前选中角色: ${state.selectedRole || '无'}`);
        console.log(`  - 总权限数量: ${state.allPermissions}`);
        console.log(`  - 总角色数量: ${state.allRoles}`);

        if (state.selectedPermissions.length > 0) {
            console.log('📋 已选权限列表:', state.selectedPermissions.slice(0, 5).join(', ') + (state.selectedPermissions.length > 5 ? '...' : ''));
        }

        return state;
    }

    // 4. 检查DOM元素状态
    function checkDOMElementsState() {
        console.log('\n🏗️ DOM元素状态检查:');

        const elements = {
            roleOptions: document.querySelectorAll('.role-option'),
            permissionCheckboxes: document.querySelectorAll('.permission-checkbox'),
            selectedCheckboxes: document.querySelectorAll('.permission-checkbox:checked'),
            permissionItems: document.querySelectorAll('.permission-item'),
            selectedItems: document.querySelectorAll('.permission-item--selected'),
            categories: document.querySelectorAll('.permission-category'),
            expandedCategories: document.querySelectorAll('.permission-category.category-expanded')
        };

        console.log('📊 DOM元素统计:');
        Object.entries(elements).forEach(([key, nodeList]) => {
            console.log(`  - ${key}: ${nodeList.length}`);
        });

        return elements;
    }

    // 5. 模拟角色选择
    function simulateRoleSelection() {
        console.log('\n🎯 模拟角色选择测试:');

        const roleOptions = document.querySelectorAll('.role-option');
        if (roleOptions.length === 0) {
            console.log('❌ 没有找到角色选项');
            return false;
        }

        try {
            // 选择第一个角色
            console.log('🎭 选择第一个角色...');
            const firstRole = roleOptions[0];
            const roleId = firstRole.dataset.roleId;
            const roleName = firstRole.querySelector('.role-name')?.textContent || '未知角色';

            console.log(`📋 即将选择角色: ${roleName} (${roleId})`);

            // 记录选择前的状态
            const beforeState = {
                selectedPermissions: window.userManagement?.fullPermissionSelector?.selectedPermissions?.size || 0,
                checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
                selectedItems: document.querySelectorAll('.permission-item--selected').length
            };

            console.log('📊 选择前状态:', beforeState);

            // 触发角色选择
            firstRole.click();

            // 等待一段时间让更新完成
            setTimeout(() => {
                console.log('\n📈 角色选择后状态检查:');

                const afterState = {
                    selectedPermissions: window.userManagement?.fullPermissionSelector?.selectedPermissions?.size || 0,
                    checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
                    selectedItems: document.querySelectorAll('.permission-item--selected').length,
                    roleInfo: !!document.querySelector('.role-info-banner'),
                    expandedCategories: document.querySelectorAll('.permission-category.category-expanded').length
                };

                console.log('📊 选择后状态:', afterState);

                // 比较前后状态
                const changes = {
                    permissionsChanged: afterState.selectedPermissions !== beforeState.selectedPermissions,
                    checkboxesChanged: afterState.checkedBoxes !== beforeState.checkedBoxes,
                    itemsChanged: afterState.selectedItems !== beforeState.selectedItems,
                    roleInfoShown: afterState.roleInfo,
                    categoriesExpanded: afterState.expandedCategories > 0
                };

                console.log('\n🔄 状态变化分析:');
                Object.entries(changes).forEach(([key, value]) => {
                    const status = value ? '✅' : '❌';
                    const description = {
                        permissionsChanged: '权限数据已更新',
                        checkboxesChanged: '复选框状态已更新',
                        itemsChanged: '权限项样式已更新',
                        roleInfoShown: '角色信息横幅已显示',
                        categoriesExpanded: '权限分类已展开'
                    };
                    console.log(`${status} ${description[key]}`);
                });

                // 检查具体的权限显示
                if (afterState.checkedBoxes > 0) {
                    console.log('\n✅ 权限显示成功！');
                    console.log(`📊 共显示 ${afterState.checkedBoxes} 个选中权限`);

                    // 显示前几个选中的权限
                    const checkedBoxes = document.querySelectorAll('.permission-checkbox:checked');
                    const firstFewPermissions = Array.from(checkedBoxes).slice(0, 5).map(cb => {
                        const permissionName = cb.parentNode.querySelector('.permission-name')?.textContent;
                        return permissionName || cb.dataset.permissionId;
                    });

                    console.log('📋 选中的权限样例:', firstFewPermissions.join(', '));
                } else {
                    console.log('❌ 权限未正确显示为选中状态');
                }

                return changes;
            }, 1500);

            return true;
        } catch (error) {
            console.error('❌ 角色选择测试失败:', error);
            return false;
        }
    }

    // 6. 检查权限渲染问题
    function diagnosePermissionRenderingIssues() {
        console.log('\n🔍 权限渲染问题诊断:');

        const selector = window.userManagement?.fullPermissionSelector;
        if (!selector) {
            console.log('❌ 权限选择器不可用');
            return;
        }

        // 检查权限数据完整性
        const issues = [];

        if (selector.selectedPermissions.size === 0) {
            issues.push('selectedPermissions 集合为空');
        }

        if (selector.allPermissions.length === 0) {
            issues.push('allPermissions 数组为空');
        }

        const permissionsList = document.getElementById('permissionsList');
        if (!permissionsList) {
            issues.push('permissionsList DOM元素不存在');
        } else if (permissionsList.children.length === 0) {
            issues.push('permissionsList 没有子元素');
        }

        if (issues.length > 0) {
            console.log('🚨 发现问题:');
            issues.forEach(issue => console.log(`  ❌ ${issue}`));
        } else {
            console.log('✅ 基础检查通过');
        }

        // 详细检查权限渲染
        const categories = document.querySelectorAll('.permission-category');
        console.log(`📂 权限分类数量: ${categories.length}`);

        categories.forEach((category, index) => {
            const categoryName = category.querySelector('.category-name')?.textContent;
            const permissions = category.querySelectorAll('.permission-item');
            const checkedPermissions = category.querySelectorAll('.permission-checkbox:checked');

            console.log(`  📁 ${categoryName || `分类${index + 1}`}: ${permissions.length} 个权限, ${checkedPermissions.length} 个选中`);
        });
    }

    // 7. 生成诊断报告
    function generateDiagnosticReport(initialState, domState, simulationResult) {
        console.log('\n📋 角色选择功能诊断报告:');
        console.log('='.repeat(60));

        const overallHealth = {
            dataAvailable: initialState.permissionSelector && initialState.permissionsData,
            selectorInitialized: initialState.fullPermissionSelectorInstance,
            domElementsPresent: domState.roleOptions.length > 0 && domState.permissionCheckboxes.length > 0,
            functionalityWorking: simulationResult
        };

        console.log('🎯 系统健康状况:');
        Object.entries(overallHealth).forEach(([key, value]) => {
            const status = value ? '✅' : '❌';
            const description = {
                dataAvailable: '权限数据和组件可用',
                selectorInitialized: '权限选择器已初始化',
                domElementsPresent: 'DOM元素正常存在',
                functionalityWorking: '角色选择功能正常'
            };
            console.log(`${status} ${description[key]}`);
        });

        const healthScore = Object.values(overallHealth).filter(Boolean).length;
        const totalChecks = Object.keys(overallHealth).length;
        const healthPercentage = (healthScore / totalChecks * 100).toFixed(1);

        console.log(`\n📊 总体健康度: ${healthPercentage}% (${healthScore}/${totalChecks})`);

        if (healthPercentage >= 75) {
            console.log('\n✅ 角色选择功能基本正常');
            console.log('💡 如果仍有问题，可能是视觉显示或时序问题');
        } else {
            console.log('\n⚠️ 发现重要问题，需要修复');
        }

        console.log('\n🛠️ 故障排除建议:');
        if (!overallHealth.dataAvailable) {
            console.log('1. 检查 permissions-data.js 是否正确加载');
            console.log('2. 确认 FullPermissionSelector 类是否可用');
        }
        if (!overallHealth.selectorInitialized) {
            console.log('3. 检查用户管理系统的权限选择器初始化');
        }
        if (!overallHealth.domElementsPresent) {
            console.log('4. 确认 HTML 模板正确包含权限选择器容器');
        }
        if (!overallHealth.functionalityWorking) {
            console.log('5. 检查角色选择事件处理和权限更新逻辑');
        }

        return overallHealth;
    }

    // 执行测试
    console.log('🚀 开始执行角色选择后权限显示测试...');

    const initialState = checkInitialState();
    checkRoleData();
    checkPermissionSelectorState();
    const domState = checkDOMElementsState();

    setTimeout(() => {
        diagnosePermissionRenderingIssues();
    }, 1000);

    setTimeout(() => {
        const simulationResult = simulateRoleSelection();

        setTimeout(() => {
            generateDiagnosticReport(initialState, domState, simulationResult);
        }, 3000);
    }, 2000);

    return {
        initialState,
        domState,
        testCompleted: true
    };
})();
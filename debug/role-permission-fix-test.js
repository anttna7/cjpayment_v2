// 角色权限显示修复测试脚本
// 在浏览器控制台运行以修复权限显示问题

(function rolePermissionFixTest() {
    console.log('🔧 角色权限显示修复测试开始...');

    // 1. 强化权限选择器的角色选择方法
    function enhanceRoleSelectMethod() {
        console.log('⚡ 强化角色选择方法...');

        const selector = window.userManagement?.fullPermissionSelector;
        if (!selector) {
            console.log('❌ 权限选择器不存在');
            return false;
        }

        // 备份原方法
        const originalHandleRoleSelect = selector.handleRoleSelect;

        // 增强的角色选择方法
        selector.handleRoleSelect = function(roleId) {
            console.log('🎯 [增强版] 选择角色:', roleId);

            // 清除之前的角色选择状态
            document.querySelectorAll('.role-option').forEach(option => {
                option.classList.remove('role-option--selected');
            });

            // 设置新的角色选择状态
            const roleOption = document.querySelector(`[data-role-id="${roleId}"]`);
            if (roleOption) {
                roleOption.classList.add('role-option--selected');
            }

            // 获取角色权限并设置
            const role = this.allRoles.find(r => r.id === roleId);
            if (role) {
                console.log('📋 [增强版] 角色权限:', role.permissions);
                console.log('📊 [增强版] 权限数量:', role.permissions.length);

                // 清除所有现有权限选择
                this.selectedPermissions.clear();

                // 设置选中的权限
                role.permissions.forEach(permissionId => {
                    this.selectedPermissions.add(permissionId);
                });

                this.selectedRole = roleId;

                console.log('✅ [增强版] 已设置选中权限:', Array.from(this.selectedPermissions));

                // 立即更新显示计数
                this.updateDisplay();

                // 强制重新渲染整个权限列表
                console.log('🔄 [增强版] 强制重新渲染权限列表...');
                this.filteredPermissions = [...this.allPermissions]; // 重置过滤
                this.renderPermissionsList();

                // 等待DOM更新后强制检查复选框状态
                setTimeout(() => {
                    this.forceUpdateAllCheckboxes();
                }, 100);

                // 强制展开所有权限分类
                setTimeout(() => {
                    this.expandAllCategories();
                }, 200);

                // 显示角色信息
                setTimeout(() => {
                    this.showRoleInfo(role);
                }, 300);

                if (this.options.onRoleChange) {
                    this.options.onRoleChange(role);
                }
            } else {
                console.error('❌ [增强版] 未找到角色:', roleId);
            }
        };

        // 添加强制更新所有复选框的方法
        selector.forceUpdateAllCheckboxes = function() {
            console.log('💪 强制更新所有复选框状态...');

            const permissionsList = document.getElementById('permissionsList');
            if (!permissionsList) {
                console.log('❌ 权限列表容器不存在');
                return;
            }

            // 找到所有权限复选框
            const allCheckboxes = permissionsList.querySelectorAll('.permission-checkbox');
            console.log(`📋 找到 ${allCheckboxes.length} 个权限复选框`);

            let updatedCount = 0;
            allCheckboxes.forEach((checkbox, index) => {
                const permissionId = checkbox.dataset.permissionId;
                const shouldBeChecked = this.selectedPermissions.has(permissionId);

                console.log(`🔍 检查权限 ${permissionId}: 应该选中=${shouldBeChecked}, 当前选中=${checkbox.checked}`);

                // 强制设置复选框状态
                checkbox.checked = shouldBeChecked;

                // 更新父级样式
                const permissionItem = checkbox.closest('.permission-item');
                if (permissionItem) {
                    if (shouldBeChecked) {
                        permissionItem.classList.add('permission-item--selected');
                        updatedCount++;
                    } else {
                        permissionItem.classList.remove('permission-item--selected');
                    }
                }
            });

            console.log(`✅ 已更新 ${updatedCount} 个权限为选中状态`);

            // 更新分类复选框状态
            this.updateCategoryCheckboxes();
        };

        console.log('✅ 角色选择方法增强完成');
        return true;
    }

    // 2. 测试角色选择
    function testRoleSelection() {
        console.log('\\n🧪 测试角色选择功能...');

        const roleOptions = document.querySelectorAll('.role-option');
        if (roleOptions.length === 0) {
            console.log('❌ 没有找到角色选项');
            return false;
        }

        try {
            console.log('🎯 选择第一个角色进行测试...');
            const firstRole = roleOptions[0];
            const roleId = firstRole.dataset.roleId;
            const roleName = firstRole.querySelector('.role-name')?.textContent || '未知角色';

            console.log(`📋 将选择角色: ${roleName} (${roleId})`);

            // 记录选择前状态
            const beforeState = {
                checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
                selectedItems: document.querySelectorAll('.permission-item--selected').length,
                roleInfo: !!document.querySelector('.role-info-banner')
            };
            console.log('📊 选择前状态:', beforeState);

            // 触发角色选择
            firstRole.click();

            // 等待更新完成后检查状态
            setTimeout(() => {
                const afterState = {
                    checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
                    selectedItems: document.querySelectorAll('.permission-item--selected').length,
                    roleInfo: !!document.querySelector('.role-info-banner'),
                    expandedCategories: document.querySelectorAll('.permission-category.category-expanded').length
                };

                console.log('\\n📈 选择后状态:', afterState);

                const success = afterState.checkedBoxes > beforeState.checkedBoxes;
                if (success) {
                    console.log('\\n🎉 角色选择测试成功！');
                    console.log(`✅ 权限复选框已正确更新: ${afterState.checkedBoxes} 个选中`);
                    console.log(`✅ 权限项样式已更新: ${afterState.selectedItems} 个选中样式`);
                    console.log(`✅ 角色信息横幅: ${afterState.roleInfo ? '已显示' : '未显示'}`);
                    console.log(`✅ 权限分类展开: ${afterState.expandedCategories} 个`);
                } else {
                    console.log('\\n❌ 角色选择测试失败！权限未正确显示');
                    console.log('🔍 排查建议：');
                    console.log('1. 检查权限数据是否正确加载');
                    console.log('2. 检查renderPermissionsList方法是否被调用');
                    console.log('3. 检查DOM元素是否正确更新');

                    // 额外诊断
                    const selector = window.userManagement?.fullPermissionSelector;
                    if (selector) {
                        console.log('🔍 权限选择器状态:');
                        console.log(`  - 选中权限数: ${selector.selectedPermissions.size}`);
                        console.log(`  - 所有权限数: ${selector.allPermissions.length}`);
                        console.log(`  - 当前角色: ${selector.selectedRole}`);
                    }
                }

                return success;
            }, 1500);

        } catch (error) {
            console.error('❌ 角色选择测试异常:', error);
            return false;
        }

        return true;
    }

    // 3. 手动修复权限显示
    function manualFixPermissionDisplay() {
        console.log('\\n🛠️ 手动修复权限显示...');

        const selector = window.userManagement?.fullPermissionSelector;
        if (!selector) {
            console.log('❌ 权限选择器不存在');
            return false;
        }

        // 如果有选中的角色但权限没有显示，强制修复
        if (selector.selectedRole && selector.selectedPermissions.size > 0) {
            console.log('🔧 检测到有选中角色但权限可能未显示，开始修复...');

            // 强制重新渲染
            selector.renderPermissionsList();

            // 强制更新复选框状态
            setTimeout(() => {
                selector.forceUpdateAllCheckboxes();
            }, 100);

            // 展开所有分类
            setTimeout(() => {
                selector.expandAllCategories();
            }, 200);

            console.log('✅ 手动修复完成');
            return true;
        }

        console.log('ℹ️ 当前没有选中角色或权限，无需修复');
        return false;
    }

    // 4. 生成修复报告
    function generateFixReport() {
        console.log('\\n📋 权限显示修复报告:');
        console.log('='.repeat(50));

        const selector = window.userManagement?.fullPermissionSelector;
        const checkedBoxes = document.querySelectorAll('.permission-checkbox:checked').length;
        const selectedItems = document.querySelectorAll('.permission-item--selected').length;
        const roleInfo = document.querySelector('.role-info-banner');

        console.log('🎯 修复结果:');
        console.log(`  - 权限选择器状态: ${selector ? '✅ 正常' : '❌ 异常'}`);
        console.log(`  - 选中权限复选框: ${checkedBoxes} 个`);
        console.log(`  - 选中权限样式: ${selectedItems} 个`);
        console.log(`  - 角色信息显示: ${roleInfo ? '✅ 已显示' : '❌ 未显示'}`);

        if (selector) {
            console.log(`  - 数据中选中权限: ${selector.selectedPermissions.size} 个`);
            console.log(`  - 当前选中角色: ${selector.selectedRole || '无'}`);
        }

        const isFixed = checkedBoxes > 0 && selectedItems > 0;

        console.log('\\n🏆 总体状态:');
        if (isFixed) {
            console.log('✅ 权限显示已修复，功能正常');
        } else {
            console.log('❌ 权限显示仍有问题，需要进一步排查');
        }

        return {
            isFixed,
            checkedBoxes,
            selectedItems,
            hasRoleInfo: !!roleInfo,
            selectorState: !!selector
        };
    }

    // 执行修复流程
    console.log('🚀 开始执行权限显示修复...');

    const enhanced = enhanceRoleSelectMethod();
    if (!enhanced) {
        console.log('❌ 无法增强角色选择方法，退出修复');
        return;
    }

    // 先尝试手动修复
    manualFixPermissionDisplay();

    // 等待一段时间后测试角色选择
    setTimeout(() => {
        testRoleSelection();

        // 再等一段时间生成报告
        setTimeout(() => {
            generateFixReport();
        }, 2000);
    }, 1000);

    return {
        enhanced: true,
        testInitiated: true
    };
})();
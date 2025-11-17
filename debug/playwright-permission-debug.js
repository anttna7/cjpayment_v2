const { chromium } = require('playwright');

async function debugPermissionDisplay() {
    console.log('🎭 Playwright 权限显示调试开始...');

    const browser = await chromium.launch({
        headless: false, // 显示浏览器窗口以便观察
        slowMo: 500 // 减慢操作速度便于观察
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    try {
        // 步骤 1: 访问用户管理页面
        console.log('📋 步骤 1: 访问用户管理页面');
        await page.goto('http://127.0.0.1:8091/user_management');
        await page.waitForLoadState('networkidle');
        console.log('✅ 页面加载完成');

        // 等待页面完全加载
        await page.waitForTimeout(2000);

        // 步骤 2: 检查页面基础元素
        console.log('📋 步骤 2: 检查页面基础元素');

        // 等待更长时间确保页面数据加载
        console.log('⏱️ 等待页面数据加载...');
        await page.waitForTimeout(5000);

        // 检查各种可能的编辑按钮选择器
        const possibleEditSelectors = [
            '.btn--edit',
            '.edit-btn',
            '[title="编辑"]',
            '[aria-label="编辑"]',
            'button:has-text("编辑")',
            '.edit-user-btn',
            '.user-edit'
        ];

        let editButtons = 0;
        let workingSelector = null;

        for (const selector of possibleEditSelectors) {
            const count = await page.locator(selector).count();
            if (count > 0) {
                editButtons = count;
                workingSelector = selector;
                console.log(`✅ 找到编辑按钮: ${selector} (${count}个)`);
                break;
            }
        }

        const userTable = await page.locator('.users-table').count();
        const userCards = await page.locator('.user-card').count();
        const userRows = await page.locator('tr').count();

        console.log(`  - 用户表格: ${userTable > 0 ? '存在' : '不存在'}`);
        console.log(`  - 用户卡片: ${userCards}`);
        console.log(`  - 表格行数: ${userRows}`);
        console.log(`  - 编辑按钮数量: ${editButtons}`);

        // 如果还是没有找到编辑按钮，检查页面内容
        if (editButtons === 0) {
            console.log('⚠️ 没有找到编辑按钮，检查页面内容...');

            // 获取页面所有按钮
            const allButtons = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.map(btn => ({
                    text: btn.textContent?.trim(),
                    className: btn.className,
                    id: btn.id,
                    title: btn.title
                }));
            });

            console.log('📋 页面上的所有按钮:', allButtons);

            // 检查是否有用户数据
            const pageText = await page.textContent('body');
            const hasUserData = pageText.includes('admin') || pageText.includes('用户') || pageText.includes('User');

            if (!hasUserData) {
                console.log('⚠️ 页面似乎没有用户数据，可能需要登录或数据加载中');
            }

            // 尝试截图查看当前页面状态
            await page.screenshot({
                path: 'no-edit-buttons-page.png',
                fullPage: true
            });
            console.log('📸 已保存无编辑按钮时的页面截图: no-edit-buttons-page.png');
        }

        if (editButtons === 0) {
            throw new Error('页面上没有找到编辑按钮，请检查页面是否正确加载用户数据');
        }

        // 步骤 3: 点击第一个编辑按钮
        console.log('📋 步骤 3: 点击编辑按钮');
        await page.locator(workingSelector || '.btn--edit').first().click();

        // 等待模态框打开
        await page.waitForSelector('#userModal', { state: 'visible' });
        console.log('✅ 用户编辑模态框已打开');

        // 步骤 4: 切换到权限配置标签
        console.log('📋 步骤 4: 切换到权限配置标签');

        // 等待标签元素出现，使用更具体的选择器
        await page.waitForSelector('button[data-tab="permissions"]', { timeout: 5000 });
        await page.locator('button[data-tab="permissions"]').click();
        console.log('✅ 已切换到权限配置标签');

        // 等待权限选择器加载
        await page.waitForTimeout(2000);

        // 步骤 5: 检查权限选择器DOM结构
        console.log('📋 步骤 5: 检查权限选择器DOM结构');

        const permissionSelector = await page.locator('#fullPermissionSelector').count();
        const permissionsList = await page.locator('#permissionsList').count();
        const roleOptions = await page.locator('.role-option').count();

        console.log(`  - 权限选择器容器: ${permissionSelector > 0 ? '存在' : '不存在'}`);
        console.log(`  - 权限列表元素: ${permissionsList > 0 ? '存在' : '不存在'}`);
        console.log(`  - 角色选项数量: ${roleOptions}`);

        // 步骤 6: 截图记录当前状态
        await page.screenshot({
            path: 'permission-debug-before-role-select.png',
            fullPage: true
        });
        console.log('📸 已保存选择角色前的截图');

        // 步骤 7: 选择角色（尝试操作员角色，如果没有则选择第一个）
        console.log('📋 步骤 7: 选择角色');

        let selectedRole = null;
        const operatorRole = await page.locator('[data-role-id="operator"]').count();

        if (operatorRole > 0) {
            await page.locator('[data-role-id="operator"]').click();
            selectedRole = 'operator';
            console.log('✅ 已选择操作员角色');
        } else if (roleOptions > 0) {
            await page.locator('.role-option').first().click();
            selectedRole = 'first-role';
            console.log('✅ 已选择第一个角色');
        } else {
            throw new Error('没有找到任何角色选项');
        }

        // 等待权限列表渲染
        console.log('⏱️ 等待权限列表渲染...');
        await page.waitForTimeout(3000);

        // 步骤 8: 检查JavaScript状态
        console.log('📋 步骤 8: 检查JavaScript状态');

        const jsState = await page.evaluate(() => {
            const selector = window.userManagement?.fullPermissionSelector;
            return {
                selectorExists: !!selector,
                selectedPermissions: selector?.selectedPermissions?.size || 0,
                selectedRole: selector?.selectedRole || null,
                allPermissions: selector?.allPermissions?.length || 0,
                allRoles: selector?.allRoles?.length || 0
            };
        });

        console.log('🔍 JavaScript状态:', jsState);

        // 步骤 9: 检查DOM元素状态
        console.log('📋 步骤 9: 检查DOM元素状态');

        const domState = await page.evaluate(() => {
            const permissionsList = document.getElementById('permissionsList');
            const categories = document.querySelectorAll('.permission-category');
            const checkboxes = document.querySelectorAll('.permission-checkbox');
            const checkedBoxes = document.querySelectorAll('.permission-checkbox:checked');
            const roleInfoBanner = document.querySelector('.role-info-banner');

            return {
                permissionsListExists: !!permissionsList,
                permissionsListVisible: permissionsList ? window.getComputedStyle(permissionsList).visibility : 'none',
                permissionsListDisplay: permissionsList ? window.getComputedStyle(permissionsList).display : 'none',
                permissionsListContent: permissionsList ? permissionsList.innerHTML.length : 0,
                categoriesCount: categories.length,
                checkboxesCount: checkboxes.length,
                checkedBoxesCount: checkedBoxes.length,
                roleInfoExists: !!roleInfoBanner,
                permissionsListRect: permissionsList ? {
                    width: permissionsList.offsetWidth,
                    height: permissionsList.offsetHeight,
                    top: permissionsList.getBoundingClientRect().top
                } : null
            };
        });

        console.log('🏗️ DOM状态:', domState);

        // 步骤 10: 截图记录选择角色后的状态
        await page.screenshot({
            path: 'permission-debug-after-role-select.png',
            fullPage: true
        });
        console.log('📸 已保存选择角色后的截图');

        // 步骤 11: 如果权限没有显示，尝试强制渲染
        if (domState.checkboxesCount === 0 || domState.checkedBoxesCount === 0) {
            console.log('⚠️ 检测到权限没有正确显示，尝试强制渲染...');

            await page.evaluate(() => {
                const selector = window.userManagement?.fullPermissionSelector;
                if (selector) {
                    console.log('🔧 强制执行权限渲染...');

                    // 强制重新渲染
                    selector.renderPermissionsList();

                    // 如果有选中的角色但没有权限，手动设置
                    if (selector.selectedRole && selector.selectedPermissions.size === 0) {
                        const role = selector.allRoles.find(r => r.id === selector.selectedRole);
                        if (role) {
                            role.permissions.forEach(p => selector.selectedPermissions.add(p));
                            selector.renderPermissionsList();
                        }
                    }
                }
            });

            await page.waitForTimeout(2000);

            // 再次检查状态
            const afterForceState = await page.evaluate(() => {
                const checkboxes = document.querySelectorAll('.permission-checkbox');
                const checkedBoxes = document.querySelectorAll('.permission-checkbox:checked');
                return {
                    checkboxesCount: checkboxes.length,
                    checkedBoxesCount: checkedBoxes.length
                };
            });

            console.log('🔧 强制渲染后状态:', afterForceState);

            // 强制渲染后截图
            await page.screenshot({
                path: 'permission-debug-after-force-render.png',
                fullPage: true
            });
            console.log('📸 已保存强制渲染后的截图');
        }

        // 步骤 12: 生成详细的调试报告
        console.log('📋 步骤 12: 生成调试报告');

        const finalReport = {
            browser: 'Chromium',
            timestamp: new Date().toISOString(),
            selectedRole,
            jsState,
            domState,
            success: domState.checkboxesCount > 0 && domState.checkedBoxesCount > 0,
            screenshots: [
                'permission-debug-before-role-select.png',
                'permission-debug-after-role-select.png',
                'permission-debug-after-force-render.png'
            ]
        };

        console.log('\n📋 Playwright 权限显示调试报告');
        console.log('='.repeat(60));
        console.log('🎯 测试结果:', finalReport.success ? '✅ 成功' : '❌ 失败');
        console.log('🎭 选择的角色:', finalReport.selectedRole);
        console.log('📊 JavaScript状态:');
        console.log(`  - 权限选择器存在: ${jsState.selectorExists}`);
        console.log(`  - 选中权限数: ${jsState.selectedPermissions}`);
        console.log(`  - 当前角色: ${jsState.selectedRole}`);
        console.log(`  - 总权限数: ${jsState.allPermissions}`);
        console.log('🏗️ DOM状态:');
        console.log(`  - 权限列表存在: ${domState.permissionsListExists}`);
        console.log(`  - 权限列表可见性: ${domState.permissionsListVisible}`);
        console.log(`  - 权限列表显示: ${domState.permissionsListDisplay}`);
        console.log(`  - 权限分类数: ${domState.categoriesCount}`);
        console.log(`  - 权限复选框数: ${domState.checkboxesCount}`);
        console.log(`  - 选中复选框数: ${domState.checkedBoxesCount}`);
        console.log(`  - 角色信息横幅: ${domState.roleInfoExists}`);

        if (domState.permissionsListRect) {
            console.log(`  - 权限列表尺寸: ${domState.permissionsListRect.width}x${domState.permissionsListRect.height}`);
            console.log(`  - 权限列表位置: top=${domState.permissionsListRect.top}`);
        }

        console.log('📸 截图文件:', finalReport.screenshots.join(', '));

        if (!finalReport.success) {
            console.log('\n🔍 问题分析:');
            if (!domState.permissionsListExists) {
                console.log('  - permissionsList 元素不存在，组件渲染失败');
            } else if (domState.permissionsListContent === 0) {
                console.log('  - permissionsList 元素存在但内容为空');
            } else if (domState.checkboxesCount === 0) {
                console.log('  - 没有权限复选框，权限数据渲染失败');
            } else if (domState.checkedBoxesCount === 0) {
                console.log('  - 权限复选框存在但没有选中状态，角色权限映射失败');
            }

            if (domState.permissionsListVisible === 'hidden') {
                console.log('  - 权限列表被CSS隐藏');
            }
            if (domState.permissionsListDisplay === 'none') {
                console.log('  - 权限列表CSS display为none');
            }
        }

        // 保持浏览器打开一段时间供手动检查
        console.log('\n⏱️ 浏览器将保持打开10秒供手动检查...');
        await page.waitForTimeout(10000);

        return finalReport;

    } catch (error) {
        console.error('❌ Playwright调试过程中出错:', error);

        // 错误时也截图
        await page.screenshot({
            path: 'permission-debug-error.png',
            fullPage: true
        });

        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        await browser.close();
        console.log('🏁 Playwright调试完成');
    }
}

// 检查是否有playwright依赖
async function checkPlaywrightDependency() {
    try {
        require.resolve('playwright');
        return true;
    } catch (e) {
        console.log('⚠️ 未检测到Playwright，尝试安装...');
        console.log('请运行: npm install playwright');
        console.log('然后运行: npx playwright install chromium');
        return false;
    }
}

// 主执行函数
async function main() {
    const hasPlaywright = await checkPlaywrightDependency();
    if (!hasPlaywright) {
        console.log('❌ 请先安装Playwright依赖');
        process.exit(1);
    }

    try {
        const result = await debugPermissionDisplay();
        console.log('\n🎉 调试完成，结果:', result);
    } catch (error) {
        console.error('❌ 调试失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { debugPermissionDisplay };
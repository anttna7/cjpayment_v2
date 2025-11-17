/**
 * 商户管理页面最终综合测试脚本
 * 测试模态框功能 + 表头背景色统一 + 操作列固定效果
 */

console.log('🚀 启动商户管理页面最终综合测试...');

class FinalComprehensiveTest {
    constructor() {
        this.testResults = {};
        this.errors = [];
        this.passedTests = 0;
        this.totalTests = 0;
    }

    // 等待元素出现
    async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // 测试1: 表头背景色一致性
    async testHeaderColorConsistency() {
        console.log('🎨 测试1: 验证表头背景色一致性...');
        this.totalTests++;

        try {
            await this.waitForElement('.table-header th');
            
            const headers = document.querySelectorAll('.table-header th');
            if (headers.length === 0) {
                throw new Error('未找到表头元素');
            }

            console.log(`找到 ${headers.length} 个表头元素`);

            const backgroundImages = [];
            headers.forEach((header, index) => {
                const computed = window.getComputedStyle(header);
                backgroundImages.push(computed.backgroundImage);
                console.log(`表头${index + 1}(${header.textContent.trim()}): ${computed.backgroundImage}`);
            });

            const uniqueBackgrounds = [...new Set(backgroundImages)];
            const isConsistent = uniqueBackgrounds.length === 1;

            if (isConsistent) {
                console.log('✅ 测试1通过: 所有表头背景色一致');
                this.passedTests++;
                this.testResults.headerColorConsistency = true;
            } else {
                console.log(`❌ 测试1失败: 发现 ${uniqueBackgrounds.length} 种不同背景色`);
                this.errors.push('表头背景色不一致');
                this.testResults.headerColorConsistency = false;
            }

            return isConsistent;
        } catch (error) {
            console.log('❌ 测试1异常:', error.message);
            this.errors.push(`表头背景色测试异常: ${error.message}`);
            this.testResults.headerColorConsistency = false;
            return false;
        }
    }

    // 测试2: 操作列固定效果
    async testActionColumnSticky() {
        console.log('🔧 测试2: 验证操作列固定效果...');
        this.totalTests++;

        try {
            // 等待表格数据加载
            await this.waitForElement('#merchantTableBody tr');

            // 查找操作列元素
            const actionCells = document.querySelectorAll('#merchantTableBody td:last-child');
            if (actionCells.length === 0) {
                throw new Error('未找到操作列单元格');
            }

            const testCell = actionCells[0];
            const computed = window.getComputedStyle(testCell);
            
            console.log('操作列样式检查:');
            console.log(`- position: ${computed.position}`);
            console.log(`- right: ${computed.right}`);
            console.log(`- z-index: ${computed.zIndex}`);

            // 检查关键样式
            const hasSticky = computed.position === 'sticky';
            const hasRight = computed.right === '0px';
            const hasZIndex = parseInt(computed.zIndex) > 0;

            // 测试滚动效果
            const tableWrapper = document.querySelector('.table-responsive-wrapper, .table-wrapper');
            if (tableWrapper) {
                // 记录初始位置
                const initialRect = testCell.getBoundingClientRect();
                console.log('初始位置:', initialRect.right);

                // 滚动测试
                tableWrapper.scrollLeft = 200;
                await new Promise(resolve => setTimeout(resolve, 300));

                const scrolledRect = testCell.getBoundingClientRect();
                console.log('滚动后位置:', scrolledRect.right);

                // 检查是否保持固定
                const positionChanged = Math.abs(initialRect.right - scrolledRect.right) > 5;
                const stickyWorking = !positionChanged;

                // 重置滚动
                tableWrapper.scrollLeft = 0;

                if (hasSticky && hasRight && stickyWorking) {
                    console.log('✅ 测试2通过: 操作列固定效果正常');
                    this.passedTests++;
                    this.testResults.actionColumnSticky = true;
                    return true;
                } else {
                    console.log('❌ 测试2失败: 操作列固定效果异常');
                    this.errors.push('操作列固定效果不正常');
                    this.testResults.actionColumnSticky = false;
                    return false;
                }
            } else {
                throw new Error('未找到表格滚动容器');
            }
        } catch (error) {
            console.log('❌ 测试2异常:', error.message);
            this.errors.push(`操作列固定测试异常: ${error.message}`);
            this.testResults.actionColumnSticky = false;
            return false;
        }
    }

    // 测试3: 模态框结构完整性
    testModalStructures() {
        console.log('📋 测试3: 检查模态框结构完整性...');
        this.totalTests++;

        const modalConfigs = [
            { id: 'merchantDetailsModal', name: '商户详情模态框' },
            { id: 'merchantEditModal', name: '商户编辑模态框' },
            { id: 'merchantPollingModal', name: '轮询配置模态框' }
        ];

        let foundModals = 0;

        modalConfigs.forEach(config => {
            const modal = document.getElementById(config.id);
            if (modal) {
                foundModals++;
                console.log(`✅ 找到: ${config.name}`);

                // 检查基本结构
                const header = modal.querySelector('.modal-header');
                const body = modal.querySelector('.modal-body');
                const close = modal.querySelector('.modal-close');

                console.log(`  - header: ${!!header}`);
                console.log(`  - body: ${!!body}`);
                console.log(`  - close: ${!!close}`);
            } else {
                console.log(`❌ 缺失: ${config.name}`);
            }
        });

        const allFound = foundModals === modalConfigs.length;
        this.testResults.modalStructures = allFound;

        if (allFound) {
            console.log('✅ 测试3通过: 所有模态框结构完整');
            this.passedTests++;
        } else {
            console.log('❌ 测试3失败: 部分模态框结构缺失');
            this.errors.push('部分模态框HTML结构缺失');
        }

        return allFound;
    }

    // 测试4: JavaScript函数完整性
    testJavaScriptFunctions() {
        console.log('⚙️ 测试4: 检查JavaScript函数完整性...');
        this.totalTests++;

        const requiredFunctions = [
            { name: 'viewMerchantDetails', desc: '查看商户详情' },
            { name: 'editMerchant', desc: '编辑商户' },
            { name: 'configureMerchantPolling', desc: '配置轮询' },
            { name: 'showModal', desc: '显示模态框' },
            { name: 'hideModal', desc: '隐藏模态框' },
            { name: 'showToast', desc: 'Toast通知' }
        ];

        let foundFunctions = 0;

        requiredFunctions.forEach(func => {
            const exists = typeof window[func.name] === 'function';
            if (exists) {
                foundFunctions++;
                console.log(`✅ ${func.desc}: ${func.name}`);
            } else {
                console.log(`❌ ${func.desc}: ${func.name} 缺失`);
            }
        });

        const allFound = foundFunctions === requiredFunctions.length;
        this.testResults.javaScriptFunctions = allFound;

        if (allFound) {
            console.log('✅ 测试4通过: 所有JavaScript函数存在');
            this.passedTests++;
        } else {
            console.log('❌ 测试4失败: 部分JavaScript函数缺失');
            this.errors.push('部分JavaScript函数缺失');
        }

        return allFound;
    }

    // 测试5: 模态框功能测试
    async testModalFunctionality() {
        console.log('🔄 测试5: 模态框功能测试...');
        this.totalTests++;

        try {
            const testMerchant = {
                id: 'TEST_MERCHANT_001',
                name: '测试商户',
                status: 'enabled'
            };

            // 测试详情模态框
            console.log('📋 测试详情模态框...');
            if (typeof viewMerchantDetails === 'function') {
                viewMerchantDetails(testMerchant.id);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const detailModal = document.getElementById('merchantDetailsModal');
                const detailVisible = detailModal && detailModal.style.display !== 'none';
                
                if (detailVisible) {
                    console.log('✅ 详情模态框打开成功');
                    if (typeof hideModal === 'function') {
                        hideModal('merchantDetailsModal');
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                } else {
                    throw new Error('详情模态框未能打开');
                }
            }

            // 测试编辑模态框
            console.log('✏️ 测试编辑模态框...');
            if (typeof editMerchant === 'function') {
                editMerchant(testMerchant.id);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const editModal = document.getElementById('merchantEditModal');
                const editVisible = editModal && editModal.style.display !== 'none';
                
                if (editVisible) {
                    console.log('✅ 编辑模态框打开成功');
                    if (typeof hideModal === 'function') {
                        hideModal('merchantEditModal');
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                } else {
                    throw new Error('编辑模态框未能打开');
                }
            }

            // 测试轮询配置模态框
            console.log('🔄 测试轮询配置模态框...');
            if (typeof configureMerchantPolling === 'function') {
                configureMerchantPolling(testMerchant.id);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const pollingModal = document.getElementById('merchantPollingModal');
                const pollingVisible = pollingModal && pollingModal.style.display !== 'none';
                
                if (pollingVisible) {
                    console.log('✅ 轮询配置模态框打开成功');
                    if (typeof hideModal === 'function') {
                        hideModal('merchantPollingModal');
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                } else {
                    throw new Error('轮询配置模态框未能打开');
                }
            }

            // 测试Toast通知
            console.log('📢 测试Toast通知...');
            if (typeof showToast === 'function') {
                showToast('测试通知 - 成功', 'success');
                await new Promise(resolve => setTimeout(resolve, 1000));
                showToast('测试通知 - 信息', 'info');
                console.log('✅ Toast通知功能正常');
            }

            console.log('✅ 测试5通过: 所有模态框功能正常');
            this.passedTests++;
            this.testResults.modalFunctionality = true;
            return true;

        } catch (error) {
            console.log('❌ 测试5失败:', error.message);
            this.errors.push(`模态框功能测试失败: ${error.message}`);
            this.testResults.modalFunctionality = false;
            return false;
        }
    }

    // 测试6: 操作按钮完整性
    testActionButtons() {
        console.log('🔘 测试6: 检查操作按钮完整性...');
        this.totalTests++;

        try {
            // 等待表格加载
            const rows = document.querySelectorAll('#merchantTableBody tr');
            if (rows.length === 0) {
                throw new Error('表格数据未加载');
            }

            let hasDetailButtons = 0;
            let hasEditButtons = 0;
            let hasPollingButtons = 0;

            rows.forEach((row, index) => {
                const actionCell = row.querySelector('td:last-child');
                if (actionCell) {
                    // 查找详情按钮
                    const detailBtn = actionCell.querySelector('[onclick*="viewMerchantDetails"], .action-btn--details');
                    if (detailBtn) hasDetailButtons++;

                    // 查找编辑按钮
                    const editBtn = actionCell.querySelector('[onclick*="editMerchant"], .action-btn--edit');
                    if (editBtn) hasEditButtons++;

                    // 查找轮询按钮
                    const pollingBtn = actionCell.querySelector('[onclick*="configureMerchantPolling"], .action-btn--config');
                    if (pollingBtn) hasPollingButtons++;
                }
            });

            console.log(`详情按钮: ${hasDetailButtons}/${rows.length}`);
            console.log(`编辑按钮: ${hasEditButtons}/${rows.length}`);
            console.log(`轮询按钮: ${hasPollingButtons}/${rows.length}`);

            const allButtonsPresent = hasDetailButtons > 0 && hasEditButtons > 0 && hasPollingButtons > 0;

            if (allButtonsPresent) {
                console.log('✅ 测试6通过: 操作按钮完整');
                this.passedTests++;
                this.testResults.actionButtons = true;
            } else {
                console.log('❌ 测试6失败: 部分操作按钮缺失');
                this.errors.push('部分操作按钮缺失');
                this.testResults.actionButtons = false;
            }

            return allButtonsPresent;
        } catch (error) {
            console.log('❌ 测试6异常:', error.message);
            this.errors.push(`操作按钮测试异常: ${error.message}`);
            this.testResults.actionButtons = false;
            return false;
        }
    }

    // 运行完整测试套件
    async runCompleteTest() {
        console.log('🚀 开始商户管理页面最终综合测试...');

        // 等待页面完全加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        // 等待表格初始化
        console.log('⏳ 等待表格初始化...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('📋 执行测试序列...');

        // 执行所有测试
        const tests = [
            { name: '表头背景色一致性', test: () => this.testHeaderColorConsistency() },
            { name: '操作列固定效果', test: () => this.testActionColumnSticky() },
            { name: '模态框结构完整性', test: () => this.testModalStructures() },
            { name: 'JavaScript函数完整性', test: () => this.testJavaScriptFunctions() },
            { name: '模态框功能测试', test: () => this.testModalFunctionality() },
            { name: '操作按钮完整性', test: () => this.testActionButtons() }
        ];

        for (let i = 0; i < tests.length; i++) {
            console.log(`\n--- 执行测试 ${i + 1}/${tests.length}: ${tests[i].name} ---`);
            try {
                await tests[i].test();
            } catch (error) {
                console.error(`测试 ${i + 1} 异常:`, error);
                this.errors.push(`${tests[i].name}异常: ${error.message}`);
            }
            
            // 测试间隔
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        this.generateFinalReport();
        return this.getTestSummary();
    }

    // 生成最终报告
    generateFinalReport() {
        console.log('\n📊 ========== 商户管理页面最终测试报告 ==========');
        console.log(`🎯 测试完成: ${this.passedTests}/${this.totalTests} 项通过`);
        console.log(`📈 通过率: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        
        console.log('\n📋 详细测试结果:');
        Object.entries(this.testResults).forEach(([test, result]) => {
            const testName = {
                headerColorConsistency: '表头背景色一致性',
                actionColumnSticky: '操作列固定效果',
                modalStructures: '模态框结构完整性',
                javaScriptFunctions: 'JavaScript函数完整性',
                modalFunctionality: '模态框功能测试',
                actionButtons: '操作按钮完整性'
            }[test] || test;
            
            console.log(`  ${result ? '✅' : '❌'} ${testName}: ${result ? '通过' : '失败'}`);
        });

        if (this.errors.length > 0) {
            console.log('\n🚨 发现的问题:');
            this.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 恭喜！所有测试通过！');
            console.log('✨ 商户管理页面功能完整且正常工作');
            console.log('🎯 表头背景色统一，操作列固定正常');
            console.log('📋 所有模态框功能完整可用');
        } else {
            console.log('\n⚠️ 部分测试未通过，需要进一步检查和修复');
        }

        console.log('\n========================================');
    }

    // 获取测试摘要
    getTestSummary() {
        return {
            success: this.passedTests === this.totalTests,
            passedTests: this.passedTests,
            totalTests: this.totalTests,
            successRate: ((this.passedTests / this.totalTests) * 100).toFixed(1),
            testResults: this.testResults,
            errors: this.errors
        };
    }
}

// 自动执行测试
if (typeof window !== 'undefined') {
    window.finalTester = new FinalComprehensiveTest();
    
    // 延迟启动测试
    setTimeout(() => {
        window.finalTester.runCompleteTest()
            .then(result => {
                console.log('🎯 最终综合测试完成，结果:', result);
                
                // 如果所有测试通过，显示成功提示
                if (result.success && typeof showToast === 'function') {
                    showToast('🎉 所有测试通过！商户管理页面功能完整！', 'success');
                }
            })
            .catch(error => {
                console.error('❌ 最终综合测试异常:', error);
            });
    }, 4000);
}

console.log('📋 最终综合测试脚本加载完成');
console.log('🔍 将在4秒后自动开始测试...');
console.log('💡 可手动调用: window.finalTester.runCompleteTest()');
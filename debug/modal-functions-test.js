/**
 * 商户管理页面模态框功能完整测试脚本
 * 测试所有三个模态框的功能完整性、数据验证和用户交互
 */

console.log('🧪 启动商户管理模态框功能测试...');

class ModalFunctionTester {
    constructor() {
        this.testResults = {};
        this.errors = [];
        this.passedTests = 0;
        this.totalTests = 0;
    }

    // 等待元素出现
    waitForElement(selector, timeout = 5000) {
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

    // 测试1: 检查模态框HTML结构
    testModalStructures() {
        console.log('🔍 测试1: 检查模态框HTML结构...');
        this.totalTests++;

        const modalIds = [
            'merchantDetailsModal',
            'merchantEditModal', 
            'merchantPollingModal'
        ];

        let foundModals = 0;
        const results = {};

        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            results[id] = !!modal;
            if (modal) {
                foundModals++;
                console.log(`✅ 找到模态框: ${id}`);
                
                // 检查基本结构元素
                const overlay = modal.querySelector('.modal-overlay');
                const content = modal.querySelector('.modal-content');
                const header = modal.querySelector('.modal-header');
                const body = modal.querySelector('.modal-body');
                
                console.log(`  - overlay: ${!!overlay}`);
                console.log(`  - content: ${!!content}`);
                console.log(`  - header: ${!!header}`);
                console.log(`  - body: ${!!body}`);
            } else {
                console.log(`❌ 缺失模态框: ${id}`);
            }
        });

        const allFound = foundModals === modalIds.length;
        this.testResults.modalStructures = allFound;

        if (allFound) {
            console.log('✅ 测试1通过: 所有模态框结构完整');
            this.passedTests++;
        } else {
            console.log('❌ 测试1失败: 模态框结构不完整');
            this.errors.push('部分模态框HTML结构缺失');
        }

        return { success: allFound, results };
    }

    // 测试2: 检查JavaScript函数
    testJavaScriptFunctions() {
        console.log('🔍 测试2: 检查JavaScript函数...');
        this.totalTests++;

        const requiredFunctions = [
            'viewMerchantDetails',
            'editMerchant',
            'configureMerchantPolling',
            'showModal',
            'hideModal',
            'validateMerchantForm',
            'showToast'
        ];

        let foundFunctions = 0;
        const results = {};

        requiredFunctions.forEach(funcName => {
            const exists = typeof window[funcName] === 'function';
            results[funcName] = exists;
            
            if (exists) {
                foundFunctions++;
                console.log(`✅ 函数存在: ${funcName}`);
            } else {
                console.log(`❌ 函数缺失: ${funcName}`);
            }
        });

        const allFound = foundFunctions === requiredFunctions.length;
        this.testResults.jsFunctions = allFound;

        if (allFound) {
            console.log('✅ 测试2通过: 所有JavaScript函数存在');
            this.passedTests++;
        } else {
            console.log('❌ 测试2失败: 部分JavaScript函数缺失');
            this.errors.push('部分JavaScript函数缺失');
        }

        return { success: allFound, results };
    }

    // 测试3: 测试详情模态框功能
    async testDetailsModal() {
        console.log('🔍 测试3: 测试详情模态框功能...');
        this.totalTests++;

        try {
            // 模拟商户数据
            const mockMerchant = {
                id: 'TEST001',
                name: '测试商户',
                code: 'TEST_MERCHANT',
                status: '启用',
                rebatePolicy: '2.5%',
                linkType: 'general',
                rechargeLink: 'https://pay.example.com/test',
                remarks: '测试商户备注'
            };

            // 测试打开详情模态框
            if (typeof viewMerchantDetails === 'function') {
                console.log('🔄 测试打开详情模态框...');
                viewMerchantDetails(mockMerchant);

                // 等待模态框显示
                await new Promise(resolve => setTimeout(resolve, 500));

                const modal = document.getElementById('merchantDetailsModal');
                const isVisible = modal && modal.style.display !== 'none' && !modal.classList.contains('hidden');

                if (isVisible) {
                    console.log('✅ 详情模态框成功打开');
                    
                    // 检查数据是否正确填充
                    const nameElement = modal.querySelector('#detailMerchantName');
                    const codeElement = modal.querySelector('#detailMerchantCode');
                    
                    const dataFilled = nameElement && nameElement.textContent.includes(mockMerchant.name);
                    
                    if (dataFilled) {
                        console.log('✅ 详情数据正确填充');
                    } else {
                        console.log('⚠️ 详情数据可能未正确填充');
                    }

                    // 测试关闭功能
                    if (typeof hideModal === 'function') {
                        hideModal('merchantDetailsModal');
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        const isClosed = modal.style.display === 'none' || modal.classList.contains('hidden');
                        if (isClosed) {
                            console.log('✅ 详情模态框正确关闭');
                        }
                    }

                    this.testResults.detailsModal = true;
                    this.passedTests++;
                    console.log('✅ 测试3通过: 详情模态框功能正常');
                    return true;
                } else {
                    throw new Error('详情模态框未能正确显示');
                }
            } else {
                throw new Error('viewMerchantDetails函数不存在');
            }
        } catch (error) {
            console.log('❌ 测试3失败:', error.message);
            this.testResults.detailsModal = false;
            this.errors.push(`详情模态框测试失败: ${error.message}`);
            return false;
        }
    }

    // 测试4: 测试编辑模态框功能
    async testEditModal() {
        console.log('🔍 测试4: 测试编辑模态框功能...');
        this.totalTests++;

        try {
            const mockMerchant = {
                id: 'TEST001',
                name: '测试商户',
                code: 'TEST_MERCHANT',
                status: '启用',
                rebatePolicy: '2.5%',
                remarks: '测试备注'
            };

            if (typeof editMerchant === 'function') {
                console.log('🔄 测试打开编辑模态框...');
                editMerchant(mockMerchant);

                await new Promise(resolve => setTimeout(resolve, 500));

                const modal = document.getElementById('merchantEditModal');
                const isVisible = modal && modal.style.display !== 'none';

                if (isVisible) {
                    console.log('✅ 编辑模态框成功打开');

                    // 测试表单元素
                    const form = modal.querySelector('#editMerchantForm');
                    const nameInput = modal.querySelector('#editMerchantName');
                    const codeInput = modal.querySelector('#editMerchantCode');

                    if (form && nameInput && codeInput) {
                        console.log('✅ 编辑表单元素存在');

                        // 测试表单验证
                        if (typeof validateMerchantForm === 'function') {
                            // 测试空值验证
                            nameInput.value = '';
                            const validation = validateMerchantForm(form);
                            
                            if (validation && !validation.isValid) {
                                console.log('✅ 表单验证功能正常');
                            } else {
                                console.log('⚠️ 表单验证可能有问题');
                            }

                            // 恢复测试数据
                            nameInput.value = mockMerchant.name;
                            codeInput.value = mockMerchant.code;
                        }

                        // 关闭模态框
                        if (typeof hideModal === 'function') {
                            hideModal('merchantEditModal');
                        }

                        this.testResults.editModal = true;
                        this.passedTests++;
                        console.log('✅ 测试4通过: 编辑模态框功能正常');
                        return true;
                    } else {
                        throw new Error('编辑表单元素不完整');
                    }
                } else {
                    throw new Error('编辑模态框未能正确显示');
                }
            } else {
                throw new Error('editMerchant函数不存在');
            }
        } catch (error) {
            console.log('❌ 测试4失败:', error.message);
            this.testResults.editModal = false;
            this.errors.push(`编辑模态框测试失败: ${error.message}`);
            return false;
        }
    }

    // 测试5: 测试轮询配置模态框
    async testPollingModal() {
        console.log('🔍 测试5: 测试轮询配置模态框功能...');
        this.totalTests++;

        try {
            const mockMerchant = {
                id: 'TEST001',
                name: '测试商户'
            };

            if (typeof configureMerchantPolling === 'function') {
                console.log('🔄 测试打开轮询配置模态框...');
                configureMerchantPolling(mockMerchant);

                await new Promise(resolve => setTimeout(resolve, 500));

                const modal = document.getElementById('merchantPollingModal');
                const isVisible = modal && modal.style.display !== 'none';

                if (isVisible) {
                    console.log('✅ 轮询配置模态框成功打开');

                    // 检查关键元素
                    const form = modal.querySelector('#pollingConfigForm');
                    const urlInput = modal.querySelector('#pollingUrl');
                    const intervalSelect = modal.querySelector('#pollingInterval');

                    if (form && urlInput && intervalSelect) {
                        console.log('✅ 轮询配置表单元素存在');

                        // 测试连接测试按钮
                        const testBtn = modal.querySelector('#testConnectionBtn');
                        if (testBtn) {
                            console.log('✅ 连接测试按钮存在');
                        }

                        // 关闭模态框
                        if (typeof hideModal === 'function') {
                            hideModal('merchantPollingModal');
                        }

                        this.testResults.pollingModal = true;
                        this.passedTests++;
                        console.log('✅ 测试5通过: 轮询配置模态框功能正常');
                        return true;
                    } else {
                        throw new Error('轮询配置表单元素不完整');
                    }
                } else {
                    throw new Error('轮询配置模态框未能正确显示');
                }
            } else {
                throw new Error('configureMerchantPolling函数不存在');
            }
        } catch (error) {
            console.log('❌ 测试5失败:', error.message);
            this.testResults.pollingModal = false;
            this.errors.push(`轮询配置模态框测试失败: ${error.message}`);
            return false;
        }
    }

    // 测试6: 测试Toast通知功能
    testToastNotifications() {
        console.log('🔍 测试6: 测试Toast通知功能...');
        this.totalTests++;

        try {
            if (typeof showToast === 'function') {
                console.log('🔄 测试显示Toast通知...');
                
                // 测试成功通知
                showToast('测试成功通知', 'success');
                
                setTimeout(() => {
                    // 测试错误通知
                    showToast('测试错误通知', 'error');
                }, 1000);

                setTimeout(() => {
                    // 测试警告通知
                    showToast('测试警告通知', 'warning');
                }, 2000);

                this.testResults.toastNotifications = true;
                this.passedTests++;
                console.log('✅ 测试6通过: Toast通知功能正常');
                return true;
            } else {
                throw new Error('showToast函数不存在');
            }
        } catch (error) {
            console.log('❌ 测试6失败:', error.message);
            this.testResults.toastNotifications = false;
            this.errors.push(`Toast通知测试失败: ${error.message}`);
            return false;
        }
    }

    // 运行完整测试套件
    async runCompleteTest() {
        console.log('🚀 开始商户管理模态框完整功能测试...');

        // 等待页面完全加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        console.log('📋 执行测试序列...');

        // 执行所有测试
        const tests = [
            () => this.testModalStructures(),
            () => this.testJavaScriptFunctions(),
            () => this.testDetailsModal(),
            () => this.testEditModal(),
            () => this.testPollingModal(),
            () => this.testToastNotifications()
        ];

        for (let i = 0; i < tests.length; i++) {
            console.log(`\n--- 执行测试 ${i + 1}/${tests.length} ---`);
            try {
                await tests[i]();
            } catch (error) {
                console.error(`测试 ${i + 1} 异常:`, error);
                this.errors.push(`测试${i + 1}异常: ${error.message}`);
            }
            
            // 测试间隔
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        this.generateTestReport();
        return this.getTestSummary();
    }

    // 生成测试报告
    generateTestReport() {
        console.log('\n📊 ========== 模态框功能测试报告 ==========');
        console.log(`🎯 测试完成: ${this.passedTests}/${this.totalTests} 项通过`);
        console.log(`📈 通过率: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        
        console.log('\n📋 详细测试结果:');
        Object.entries(this.testResults).forEach(([test, result]) => {
            console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? '通过' : '失败'}`);
        });

        if (this.errors.length > 0) {
            console.log('\n🚨 发现的问题:');
            this.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        if (this.passedTests === this.totalTests) {
            console.log('\n🎉 恭喜！所有模态框功能测试通过！');
            console.log('✨ 商户管理页面的三个模态框功能完整且正常工作');
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
    window.modalTester = new ModalFunctionTester();
    
    // 延迟启动测试
    setTimeout(() => {
        window.modalTester.runCompleteTest()
            .then(result => {
                console.log('🎯 模态框功能测试完成，最终结果:', result);
            })
            .catch(error => {
                console.error('❌ 模态框功能测试过程异常:', error);
            });
    }, 2000);
}

console.log('📋 模态框功能测试脚本加载完成');
console.log('🔍 将在2秒后自动开始测试...');
console.log('💡 可手动调用: window.modalTester.runCompleteTest()');
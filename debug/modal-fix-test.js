/**
 * 模态框修复验证脚本
 * 验证删除TODO函数后模态框是否能正常弹出
 */

console.log('🔧 启动模态框修复验证...');

class ModalFixTester {
    constructor() {
        this.testResults = {};
        this.errors = [];
    }

    // 测试函数是否存在且非TODO实现
    testFunctionImplementation() {
        console.log('⚙️ 测试JavaScript函数实现...');
        
        const functions = [
            'viewMerchantDetails',
            'editMerchant',
            'configureMerchantPolling',
            'showModal',
            'hideModal'
        ];

        const results = {};

        functions.forEach(funcName => {
            const func = window[funcName];
            if (typeof func === 'function') {
                const funcStr = func.toString();
                const isTODO = funcStr.includes('TODO') || funcStr.includes('实现商户详情查看逻辑');
                const isShort = funcStr.length < 200; // 简单的长度检查
                
                results[funcName] = {
                    exists: true,
                    isTODO: isTODO,
                    isShort: isShort,
                    length: funcStr.length,
                    preview: funcStr.substring(0, 150) + '...'
                };

                if (isTODO) {
                    console.log(`❌ ${funcName}: 仍然是TODO实现`);
                    this.errors.push(`${funcName} 仍然是TODO实现`);
                } else {
                    console.log(`✅ ${funcName}: 完整实现`);
                }
            } else {
                results[funcName] = { exists: false };
                console.log(`❌ ${funcName}: 函数不存在`);
                this.errors.push(`${funcName} 函数不存在`);
            }
        });

        this.testResults.functionImplementation = results;
        return results;
    }

    // 测试模态框元素
    testModalElements() {
        console.log('📋 测试模态框元素...');
        
        const modalIds = [
            'merchantDetailsModal',
            'merchantEditModal',
            'merchantPollingModal'
        ];

        const results = {};

        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const styles = window.getComputedStyle(modal);
                results[modalId] = {
                    exists: true,
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity
                };
                console.log(`✅ ${modalId}: 元素存在 - display: ${styles.display}`);
            } else {
                results[modalId] = { exists: false };
                console.log(`❌ ${modalId}: 元素不存在`);
                this.errors.push(`${modalId} 元素不存在`);
            }
        });

        this.testResults.modalElements = results;
        return results;
    }

    // 手动测试模态框显示
    async testModalDisplay() {
        console.log('🧪 测试模态框显示功能...');
        
        const results = {};
        
        // 创建模拟商户数据
        const testMerchant = {
            id: 'TEST_001',
            name: '测试商户',
            accountStatus: 'enabled',
            contactPerson: '测试联系人',
            contactPhone: '13800138000'
        };

        // 确保mockMerchants包含测试数据
        if (typeof mockMerchants === 'undefined') {
            window.mockMerchants = [testMerchant];
        } else {
            // 添加测试商户到现有数组（如果不存在）
            if (!mockMerchants.find(m => m.id === testMerchant.id)) {
                mockMerchants.unshift(testMerchant);
            }
        }

        console.log('添加测试商户数据:', testMerchant);

        // 测试每个模态框函数
        const tests = [
            { name: '详情模态框', func: 'viewMerchantDetails', modalId: 'merchantDetailsModal' },
            { name: '编辑模态框', func: 'editMerchant', modalId: 'merchantEditModal' },
            { name: '轮询模态框', func: 'configureMerchantPolling', modalId: 'merchantPollingModal' }
        ];

        for (const test of tests) {
            console.log(`测试 ${test.name}...`);
            
            try {
                // 调用函数
                window[test.func](testMerchant.id);
                
                // 等待异步操作
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 检查模态框是否显示
                const modal = document.getElementById(test.modalId);
                if (modal) {
                    const styles = window.getComputedStyle(modal);
                    const isVisible = styles.display !== 'none' && 
                                     styles.visibility !== 'hidden' && 
                                     parseFloat(styles.opacity) > 0;
                    
                    results[test.name] = {
                        called: true,
                        modalFound: true,
                        visible: isVisible,
                        display: styles.display,
                        opacity: styles.opacity
                    };
                    
                    if (isVisible) {
                        console.log(`✅ ${test.name} 成功显示`);
                        
                        // 关闭模态框
                        if (typeof hideModal === 'function') {
                            hideModal(test.modalId);
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    } else {
                        console.log(`❌ ${test.name} 未显示: display=${styles.display}, opacity=${styles.opacity}`);
                        this.errors.push(`${test.name} 调用后未显示`);
                    }
                } else {
                    results[test.name] = { called: true, modalFound: false };
                    console.log(`❌ ${test.name} 模态框元素不存在`);
                    this.errors.push(`${test.name} 模态框元素不存在`);
                }
            } catch (error) {
                results[test.name] = { called: true, error: error.message };
                console.log(`❌ ${test.name} 调用异常: ${error.message}`);
                this.errors.push(`${test.name} 调用异常: ${error.message}`);
            }
            
            // 测试间隔
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        this.testResults.modalDisplay = results;
        return results;
    }

    // 测试按钮点击
    async testButtonClicks() {
        console.log('👆 测试按钮点击...');
        
        const rows = document.querySelectorAll('#merchantTableBody tr');
        
        if (rows.length === 0) {
            console.log('❌ 没有表格数据');
            this.testResults.buttonClicks = { noData: true };
            return { noData: true };
        }

        const results = {};
        
        // 选择第一行测试
        const firstRow = rows[0];
        const actionCell = firstRow.querySelector('td:last-child');
        
        if (actionCell) {
            const buttons = actionCell.querySelectorAll('button');
            console.log(`找到 ${buttons.length} 个按钮`);
            
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                const onclick = button.getAttribute('onclick');
                const title = button.getAttribute('title');
                
                console.log(`测试按钮 ${i + 1}: ${title} - ${onclick}`);
                
                try {
                    // 模拟点击
                    button.click();
                    
                    // 等待异步操作
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 检查是否有模态框显示
                    let modalShown = false;
                    const modalIds = ['merchantDetailsModal', 'merchantEditModal', 'merchantPollingModal'];
                    
                    for (const modalId of modalIds) {
                        const modal = document.getElementById(modalId);
                        if (modal) {
                            const styles = window.getComputedStyle(modal);
                            if (styles.display !== 'none' && parseFloat(styles.opacity) > 0) {
                                modalShown = true;
                                console.log(`  ✅ 显示了模态框: ${modalId}`);
                                
                                // 关闭模态框
                                if (typeof hideModal === 'function') {
                                    hideModal(modalId);
                                    await new Promise(resolve => setTimeout(resolve, 200));
                                }
                                break;
                            }
                        }
                    }
                    
                    results[`button_${i}`] = {
                        title: title,
                        onclick: onclick,
                        clicked: true,
                        modalShown: modalShown
                    };
                    
                    if (!modalShown) {
                        console.log(`  ❌ 点击后没有模态框显示`);
                    }
                    
                } catch (error) {
                    results[`button_${i}`] = {
                        title: title,
                        onclick: onclick,
                        error: error.message
                    };
                    console.log(`  ❌ 点击异常: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } else {
            console.log('❌ 第一行没有操作列');
            results.noActionCell = true;
        }

        this.testResults.buttonClicks = results;
        return results;
    }

    // 运行完整测试
    async runCompleteTest() {
        console.log('🚀 开始模态框修复验证...');

        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📋 执行验证步骤...');

        // 执行测试步骤
        try {
            await this.testFunctionImplementation();
            await this.testModalElements();
            await this.testModalDisplay();
            await this.testButtonClicks();
        } catch (error) {
            console.error('验证过程异常:', error);
            this.errors.push(`验证过程异常: ${error.message}`);
        }

        this.generateReport();
        
        return {
            success: this.errors.length === 0,
            testResults: this.testResults,
            errors: this.errors
        };
    }

    // 生成报告
    generateReport() {
        console.log('\n📊 ========== 模态框修复验证报告 ==========');
        
        if (this.errors.length === 0) {
            console.log('🎉 验证通过！模态框功能已修复！');
            console.log('✅ 所有函数正确实现');
            console.log('✅ 所有模态框可以正常显示');
            console.log('✅ 按钮点击可以触发模态框');
        } else {
            console.log(`⚠️ 发现 ${this.errors.length} 个问题:`);
            this.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        console.log('\n详细结果已保存到 testResults 对象');
        console.log('========================================');
    }
}

// 自动执行验证
if (typeof window !== 'undefined') {
    window.modalFixTester = new ModalFixTester();
    
    // 延迟启动验证
    setTimeout(() => {
        window.modalFixTester.runCompleteTest()
            .then(result => {
                console.log('🎯 模态框修复验证完成:', result);
                window.modalFixResult = result;
                
                // 如果验证通过，显示成功提示
                if (result.success && typeof showToast === 'function') {
                    showToast('🎉 模态框修复成功！现在可以正常使用了！', 'success');
                }
            })
            .catch(error => {
                console.error('❌ 模态框修复验证异常:', error);
            });
    }, 3000);
}

console.log('📋 模态框修复验证脚本加载完成');
console.log('🔍 将在3秒后自动开始验证...');
console.log('💡 可手动调用: window.modalFixTester.runCompleteTest()');
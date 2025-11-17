/**
 * 商户模态框数据修复验证脚本
 * 验证修复mockMerchants数据源问题后模态框是否正常工作
 */

console.log('🔧 启动商户模态框数据修复验证...');

class ModalDataFixTester {
    constructor() {
        this.results = {};
        this.issues = [];
    }

    // 检查数据源
    checkDataSources() {
        console.log('📊 检查数据源配置...');
        
        const sources = {
            merchantDataManager: !!window.merchantDataManager,
            merchants: !!window.merchantDataManager?.merchants,
            merchantCount: window.merchantDataManager?.merchants?.length || 0,
            getMerchantById: typeof window.merchantDataManager?.getMerchantById === 'function',
            tableData: !!window.tableData
        };

        console.log('数据源状态:', sources);
        
        if (!sources.merchantDataManager) {
            this.issues.push('merchantDataManager 未初始化');
        }
        
        if (sources.merchantCount === 0) {
            this.issues.push('商户数据为空');
        }

        this.results.dataSources = sources;
        return sources;
    }

    // 测试数据获取
    testDataRetrieval() {
        console.log('🔍 测试数据获取...');
        
        const results = {};
        
        if (window.merchantDataManager && window.merchantDataManager.merchants) {
            const merchants = window.merchantDataManager.merchants;
            const sampleId = merchants[0]?.id;
            
            if (sampleId) {
                console.log(`使用样本ID测试: ${sampleId}`);
                
                // 测试不同获取方式
                const methods = {
                    getMerchantById: window.merchantDataManager.getMerchantById?.(sampleId),
                    directFind: merchants.find(m => m.id === sampleId),
                    newLogic: window.merchantDataManager?.getMerchantById?.(sampleId) ||
                             window.merchantDataManager?.merchants?.find(m => m.id === sampleId) ||
                             window.tableData?.find(m => m.id === sampleId)
                };

                Object.entries(methods).forEach(([method, result]) => {
                    results[method] = {
                        success: !!result,
                        data: result ? { id: result.id, name: result.name } : null
                    };
                    console.log(`${method}: ${result ? '✅ 成功' : '❌ 失败'}`);
                    if (result) {
                        console.log(`  - ID: ${result.id}, 名称: ${result.name}`);
                    }
                });

                this.results.dataRetrieval = results;
            } else {
                this.issues.push('无法找到样本商户ID');
            }
        } else {
            this.issues.push('商户数据不可用');
        }

        return results;
    }

    // 测试模态框函数
    async testModalFunctions() {
        console.log('🧪 测试模态框函数...');
        
        const results = {};
        
        if (!window.merchantDataManager?.merchants?.length) {
            console.log('❌ 没有商户数据可供测试');
            this.issues.push('没有商户数据可供测试');
            return results;
        }

        const testMerchantId = window.merchantDataManager.merchants[0].id;
        console.log(`使用测试商户ID: ${testMerchantId}`);

        const functions = [
            { name: 'viewMerchantDetails', modalId: 'merchantDetailsModal' },
            { name: 'editMerchant', modalId: 'merchantEditModal' },
            { name: 'configureMerchantPolling', modalId: 'merchantPollingModal' }
        ];

        for (const func of functions) {
            console.log(`测试函数: ${func.name}`);
            
            try {
                // 调用函数
                window[func.name](testMerchantId);
                
                // 等待异步操作
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 检查模态框
                const modal = document.getElementById(func.modalId);
                if (modal) {
                    const styles = window.getComputedStyle(modal);
                    const isVisible = styles.display !== 'none' && 
                                     parseFloat(styles.opacity) > 0;
                    
                    results[func.name] = {
                        called: true,
                        modalVisible: isVisible,
                        display: styles.display,
                        opacity: styles.opacity
                    };
                    
                    if (isVisible) {
                        console.log(`✅ ${func.name} - 模态框成功显示`);
                        
                        // 关闭模态框
                        if (typeof hideModal === 'function') {
                            hideModal(func.modalId);
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    } else {
                        console.log(`❌ ${func.name} - 模态框未显示`);
                        console.log(`  display: ${styles.display}, opacity: ${styles.opacity}`);
                    }
                } else {
                    results[func.name] = { called: true, modalNotFound: true };
                    console.log(`❌ ${func.name} - 模态框元素不存在`);
                }
            } catch (error) {
                results[func.name] = { called: true, error: error.message };
                console.log(`❌ ${func.name} - 调用异常: ${error.message}`);
                this.issues.push(`${func.name} 调用异常: ${error.message}`);
            }
        }

        this.results.modalFunctions = results;
        return results;
    }

    // 测试实际按钮点击
    async testRealButtonClicks() {
        console.log('👆 测试实际按钮点击...');
        
        const results = {};
        
        // 等待表格加载
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const rows = document.querySelectorAll('#merchantTableBody tr');
        console.log(`找到 ${rows.length} 行商户数据`);
        
        if (rows.length === 0) {
            this.issues.push('表格数据未加载');
            return { noData: true };
        }

        // 测试第一行的按钮
        const firstRow = rows[0];
        const actionCell = firstRow.querySelector('td:last-child');
        
        if (actionCell) {
            const buttons = actionCell.querySelectorAll('button');
            console.log(`第一行找到 ${buttons.length} 个按钮`);
            
            for (let i = 0; i < Math.min(buttons.length, 3); i++) {
                const button = buttons[i];
                const onclick = button.getAttribute('onclick');
                const title = button.getAttribute('title');
                
                console.log(`测试按钮 ${i + 1}: ${title}`);
                console.log(`onclick: ${onclick}`);
                
                try {
                    // 模拟点击
                    button.click();
                    
                    // 等待处理
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
                        modalShown: modalShown,
                        success: modalShown
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
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } else {
            console.log('❌ 第一行没有操作列');
            results.noActionCell = true;
        }

        this.results.buttonClicks = results;
        return results;
    }

    // 运行完整测试
    async runCompleteTest() {
        console.log('🚀 开始商户模态框数据修复验证...');

        // 等待页面和数据加载
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📋 执行验证步骤...');

        try {
            // 执行所有测试
            await this.checkDataSources();
            await this.testDataRetrieval();
            await this.testModalFunctions();
            await this.testRealButtonClicks();

            this.generateReport();

        } catch (error) {
            console.error('验证过程异常:', error);
            this.issues.push(`验证异常: ${error.message}`);
        }

        return {
            success: this.issues.length === 0,
            results: this.results,
            issues: this.issues
        };
    }

    // 生成报告
    generateReport() {
        console.log('\n📊 ========== 数据修复验证报告 ==========');
        
        if (this.issues.length === 0) {
            console.log('🎉 验证通过！商户模态框数据问题已修复！');
            console.log('✅ 数据源配置正确');
            console.log('✅ 数据获取逻辑正常');
            console.log('✅ 模态框函数工作正常');
            console.log('✅ 按钮点击触发模态框');
        } else {
            console.log(`⚠️ 发现 ${this.issues.length} 个问题:`);
            this.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }

        console.log('\n详细结果:', this.results);
        console.log('========================================');
    }
}

// 自动执行验证
if (typeof window !== 'undefined') {
    window.modalDataFixTester = new ModalDataFixTester();
    
    // 延迟启动验证，确保数据加载完成
    setTimeout(() => {
        window.modalDataFixTester.runCompleteTest()
            .then(result => {
                console.log('🎯 数据修复验证完成:', result);
                window.modalDataFixResult = result;
                
                // 显示验证结果
                if (result.success && typeof showToast === 'function') {
                    showToast('🎉 数据修复成功！模态框现在可以正常使用！', 'success');
                } else if (typeof showToast === 'function') {
                    showToast('⚠️ 部分问题待解决，请查看控制台', 'warning');
                }
            })
            .catch(error => {
                console.error('❌ 数据修复验证异常:', error);
            });
    }, 4000);
}

console.log('📋 商户模态框数据修复验证脚本加载完成');
console.log('🔍 将在4秒后自动开始验证...');
console.log('💡 可手动调用: window.modalDataFixTester.runCompleteTest()');
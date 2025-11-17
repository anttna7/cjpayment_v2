/**
 * MCP模态框调试脚本
 * 深入分析为什么模态框无法弹出
 */

console.log('🔍 MCP模态框调试启动...');

class MCPModalDebugger {
    constructor() {
        this.debugResults = {};
        this.issues = [];
        this.stepResults = [];
    }

    // 步骤1: 检查模态框HTML结构
    checkModalHTMLStructure() {
        console.log('📋 步骤1: 检查模态框HTML结构...');
        
        const modalIds = [
            'merchantDetailsModal',
            'merchantEditModal', 
            'merchantPollingModal'
        ];

        const htmlResults = {};
        
        modalIds.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                console.log(`✅ 找到模态框: ${modalId}`);
                
                // 检查模态框基本属性
                const styles = window.getComputedStyle(modal);
                htmlResults[modalId] = {
                    exists: true,
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    zIndex: styles.zIndex,
                    position: styles.position,
                    classes: Array.from(modal.classList),
                    inlineStyle: modal.style.cssText
                };
                
                console.log(`  - display: ${styles.display}`);
                console.log(`  - visibility: ${styles.visibility}`);
                console.log(`  - opacity: ${styles.opacity}`);
                console.log(`  - classes: ${Array.from(modal.classList).join(', ')}`);
                console.log(`  - inline style: ${modal.style.cssText}`);
                
                // 检查内部结构
                const header = modal.querySelector('.modal-header');
                const body = modal.querySelector('.modal-body');
                const close = modal.querySelector('.modal-close');
                
                console.log(`  - header: ${!!header}`);
                console.log(`  - body: ${!!body}`);
                console.log(`  - close: ${!!close}`);
                
            } else {
                console.log(`❌ 缺失模态框: ${modalId}`);
                htmlResults[modalId] = { exists: false };
                this.issues.push(`模态框 ${modalId} HTML结构不存在`);
            }
        });

        this.debugResults.htmlStructure = htmlResults;
        return htmlResults;
    }

    // 步骤2: 检查JavaScript函数
    checkJavaScriptFunctions() {
        console.log('⚙️ 步骤2: 检查JavaScript函数...');
        
        const functions = [
            'viewMerchantDetails',
            'editMerchant', 
            'configureMerchantPolling',
            'showModal',
            'hideModal',
            'showToast'
        ];

        const functionResults = {};

        functions.forEach(funcName => {
            const exists = typeof window[funcName] === 'function';
            functionResults[funcName] = exists;
            
            if (exists) {
                console.log(`✅ 函数存在: ${funcName}`);
                
                // 尝试获取函数源码（调试用）
                try {
                    const funcStr = window[funcName].toString();
                    console.log(`  - 函数长度: ${funcStr.length} 字符`);
                    
                    // 检查函数是否是空实现
                    if (funcStr.includes('TODO') || funcStr.length < 100) {
                        console.log(`  ⚠️ 可能是空实现或TODO`);
                        this.issues.push(`函数 ${funcName} 可能未完整实现`);
                    }
                } catch (e) {
                    console.log(`  - 无法获取函数源码`);
                }
            } else {
                console.log(`❌ 函数缺失: ${funcName}`);
                this.issues.push(`函数 ${funcName} 不存在`);
            }
        });

        this.debugResults.jsFunctions = functionResults;
        return functionResults;
    }

    // 步骤3: 检查按钮事件绑定
    checkButtonEventBinding() {
        console.log('🔘 步骤3: 检查按钮事件绑定...');
        
        const rows = document.querySelectorAll('#merchantTableBody tr');
        console.log(`找到 ${rows.length} 行表格数据`);

        if (rows.length === 0) {
            this.issues.push('表格数据未加载');
            return { tableRows: 0 };
        }

        const buttonResults = {
            tableRows: rows.length,
            detailButtons: 0,
            editButtons: 0,
            pollingButtons: 0,
            buttonDetails: []
        };

        rows.forEach((row, index) => {
            const actionCell = row.querySelector('td:last-child');
            if (actionCell) {
                console.log(`检查第${index + 1}行操作按钮...`);
                
                // 查找详情按钮
                const detailBtns = actionCell.querySelectorAll('[onclick*="viewMerchantDetails"], .action-btn--details, button, a');
                console.log(`  - 找到 ${detailBtns.length} 个可能的详情按钮`);
                
                detailBtns.forEach((btn, btnIndex) => {
                    console.log(`    按钮${btnIndex + 1}: ${btn.tagName} - onclick: ${btn.getAttribute('onclick')} - class: ${btn.className}`);
                    
                    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('viewMerchantDetails')) {
                        buttonResults.detailButtons++;
                    }
                });

                // 查找编辑按钮
                const editBtns = actionCell.querySelectorAll('[onclick*="editMerchant"], .action-btn--edit');
                if (editBtns.length > 0) {
                    buttonResults.editButtons++;
                    console.log(`  - 找到编辑按钮`);
                }

                // 查找轮询按钮
                const pollingBtns = actionCell.querySelectorAll('[onclick*="configureMerchantPolling"], .action-btn--config');
                if (pollingBtns.length > 0) {
                    buttonResults.pollingButtons++;
                    console.log(`  - 找到轮询按钮`);
                }

                // 记录完整按钮信息
                buttonResults.buttonDetails.push({
                    rowIndex: index,
                    innerHTML: actionCell.innerHTML,
                    buttons: Array.from(actionCell.querySelectorAll('button, a')).map(btn => ({
                        tagName: btn.tagName,
                        onclick: btn.getAttribute('onclick'),
                        className: btn.className,
                        textContent: btn.textContent.trim()
                    }))
                });
            } else {
                console.log(`第${index + 1}行没有找到操作列`);
            }
        });

        console.log(`总结: 详情按钮${buttonResults.detailButtons}个, 编辑按钮${buttonResults.editButtons}个, 轮询按钮${buttonResults.pollingButtons}个`);

        this.debugResults.buttonBinding = buttonResults;
        return buttonResults;
    }

    // 步骤4: 手动测试模态框显示
    async testModalDisplay() {
        console.log('🧪 步骤4: 手动测试模态框显示...');
        
        const testResults = {};

        // 测试showModal函数
        if (typeof showModal === 'function') {
            console.log('测试showModal函数...');
            
            const modalIds = ['merchantDetailsModal', 'merchantEditModal', 'merchantPollingModal'];
            
            for (const modalId of modalIds) {
                console.log(`测试显示: ${modalId}`);
                
                try {
                    // 调用showModal
                    showModal(modalId);
                    
                    // 等待一下让动画执行
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        const styles = window.getComputedStyle(modal);
                        const isVisible = styles.display !== 'none' && 
                                         styles.visibility !== 'hidden' && 
                                         parseFloat(styles.opacity) > 0;
                        
                        testResults[modalId] = {
                            called: true,
                            visible: isVisible,
                            display: styles.display,
                            visibility: styles.visibility,
                            opacity: styles.opacity
                        };
                        
                        console.log(`  - 调用结果: visible=${isVisible}, display=${styles.display}, opacity=${styles.opacity}`);
                        
                        // 关闭模态框
                        if (typeof hideModal === 'function') {
                            hideModal(modalId);
                        }
                    } else {
                        testResults[modalId] = { called: true, modal_missing: true };
                    }
                } catch (error) {
                    console.log(`  - 测试异常: ${error.message}`);
                    testResults[modalId] = { called: true, error: error.message };
                }
                
                // 测试间隔
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } else {
            console.log('❌ showModal函数不存在');
            testResults.showModal_missing = true;
        }

        this.debugResults.modalDisplay = testResults;
        return testResults;
    }

    // 步骤5: 检查CSS样式
    checkModalCSS() {
        console.log('🎨 步骤5: 检查模态框CSS样式...');
        
        const cssResults = {};
        
        // 检查是否有模态框相关的CSS规则
        const styleSheets = Array.from(document.styleSheets);
        let modalCSS = [];
        
        styleSheets.forEach((sheet, index) => {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                rules.forEach(rule => {
                    if (rule.selectorText && (
                        rule.selectorText.includes('modal') || 
                        rule.selectorText.includes('Modal')
                    )) {
                        modalCSS.push({
                            sheet: index,
                            selector: rule.selectorText,
                            cssText: rule.cssText
                        });
                    }
                });
            } catch (e) {
                console.log(`无法读取样式表 ${index}: ${e.message}`);
            }
        });

        console.log(`找到 ${modalCSS.length} 个模态框相关CSS规则`);
        modalCSS.forEach((css, index) => {
            console.log(`  ${index + 1}. ${css.selector}`);
        });

        cssResults.modalCSSRules = modalCSS;
        this.debugResults.modalCSS = cssResults;
        return cssResults;
    }

    // 步骤6: 模拟点击测试
    async simulateButtonClick() {
        console.log('👆 步骤6: 模拟按钮点击测试...');
        
        const rows = document.querySelectorAll('#merchantTableBody tr');
        if (rows.length === 0) {
            console.log('❌ 没有表格数据可供测试');
            return { noData: true };
        }

        const clickResults = {};
        
        // 选择第一行进行测试
        const firstRow = rows[0];
        const actionCell = firstRow.querySelector('td:last-child');
        
        if (actionCell) {
            console.log('测试第一行操作按钮...');
            
            // 查找所有可点击元素
            const clickableElements = actionCell.querySelectorAll('button, a, [onclick]');
            console.log(`找到 ${clickableElements.length} 个可点击元素`);
            
            for (let i = 0; i < clickableElements.length; i++) {
                const element = clickableElements[i];
                const onclick = element.getAttribute('onclick');
                const className = element.className;
                const text = element.textContent.trim();
                
                console.log(`测试点击元素${i + 1}: ${element.tagName} - "${text}" - onclick: ${onclick}`);
                
                try {
                    // 模拟点击
                    element.click();
                    
                    // 等待可能的异步操作
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 检查是否有模态框显示
                    let modalShown = false;
                    const modalIds = ['merchantDetailsModal', 'merchantEditModal', 'merchantPollingModal'];
                    
                    modalIds.forEach(modalId => {
                        const modal = document.getElementById(modalId);
                        if (modal) {
                            const styles = window.getComputedStyle(modal);
                            if (styles.display !== 'none' && parseFloat(styles.opacity) > 0) {
                                modalShown = true;
                                console.log(`  ✅ 模态框 ${modalId} 已显示`);
                                
                                // 关闭模态框
                                if (typeof hideModal === 'function') {
                                    hideModal(modalId);
                                }
                            }
                        }
                    });
                    
                    clickResults[`element_${i}`] = {
                        text: text,
                        onclick: onclick,
                        className: className,
                        modalShown: modalShown,
                        success: modalShown
                    };
                    
                    if (!modalShown) {
                        console.log(`  ❌ 点击后没有模态框显示`);
                    }
                    
                } catch (error) {
                    console.log(`  ❌ 点击测试异常: ${error.message}`);
                    clickResults[`element_${i}`] = {
                        text: text,
                        onclick: onclick,
                        error: error.message
                    };
                }
                
                // 测试间隔
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } else {
            console.log('❌ 第一行没有找到操作列');
            clickResults.noActionCell = true;
        }

        this.debugResults.clickTest = clickResults;
        return clickResults;
    }

    // 运行完整调试流程
    async runCompleteDebug() {
        console.log('🚀 开始MCP模态框完整调试...');

        // 等待页面加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        // 等待表格加载
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📋 执行调试步骤...');

        // 执行所有调试步骤
        const steps = [
            { name: 'HTML结构检查', fn: () => this.checkModalHTMLStructure() },
            { name: 'JavaScript函数检查', fn: () => this.checkJavaScriptFunctions() },
            { name: '按钮事件绑定检查', fn: () => this.checkButtonEventBinding() },
            { name: '模态框显示测试', fn: () => this.testModalDisplay() },
            { name: 'CSS样式检查', fn: () => this.checkModalCSS() },
            { name: '按钮点击模拟测试', fn: () => this.simulateButtonClick() }
        ];

        for (let i = 0; i < steps.length; i++) {
            console.log(`\n--- 执行步骤 ${i + 1}/${steps.length}: ${steps[i].name} ---`);
            try {
                const result = await steps[i].fn();
                this.stepResults.push({ step: steps[i].name, success: true, result });
            } catch (error) {
                console.error(`步骤 ${i + 1} 异常:`, error);
                this.stepResults.push({ step: steps[i].name, success: false, error: error.message });
                this.issues.push(`${steps[i].name} 执行异常: ${error.message}`);
            }
        }

        this.generateDebugReport();
        return {
            success: this.issues.length === 0,
            debugResults: this.debugResults,
            stepResults: this.stepResults,
            issues: this.issues
        };
    }

    // 生成调试报告
    generateDebugReport() {
        console.log('\n📊 ========== MCP模态框调试报告 ==========');
        
        console.log('📋 执行步骤总结:');
        this.stepResults.forEach((step, index) => {
            console.log(`  ${index + 1}. ${step.step}: ${step.success ? '✅ 成功' : '❌ 失败'}`);
        });

        if (this.issues.length > 0) {
            console.log('\n🚨 发现的问题:');
            this.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });

            console.log('\n💡 修复建议:');
            
            // 基于问题提供修复建议
            if (this.issues.some(issue => issue.includes('HTML结构不存在'))) {
                console.log('  - 检查模态框HTML是否正确加载到页面');
            }
            
            if (this.issues.some(issue => issue.includes('函数') && issue.includes('不存在'))) {
                console.log('  - 检查JavaScript函数是否正确定义和加载');
            }
            
            if (this.issues.some(issue => issue.includes('表格数据未加载'))) {
                console.log('  - 确保表格数据已正确加载');
            }
            
            if (this.issues.some(issue => issue.includes('未完整实现'))) {
                console.log('  - 检查函数实现，移除TODO标记');
            }

        } else {
            console.log('\n✅ 未发现明显问题');
        }

        console.log('\n🎯 详细调试结果已保存到 debugResults 对象');
        console.log('========================================');
    }
}

// 自动执行调试
if (typeof window !== 'undefined') {
    window.mcpModalDebugger = new MCPModalDebugger();
    
    // 延迟启动调试
    setTimeout(() => {
        window.mcpModalDebugger.runCompleteDebug()
            .then(result => {
                console.log('🎯 MCP模态框调试完成，结果:', result);
                
                // 将结果暴露到全局以便查看
                window.modalDebugResult = result;
            })
            .catch(error => {
                console.error('❌ MCP模态框调试异常:', error);
            });
    }, 3000);
}

console.log('📋 MCP模态框调试脚本加载完成');
console.log('🔍 将在3秒后自动开始调试...');
console.log('💡 可手动调用: window.mcpModalDebugger.runCompleteDebug()');
console.log('💡 可查看结果: window.modalDebugResult');
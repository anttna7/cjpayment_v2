/**
 * MCP财务审核表调试脚本
 * 深度分析页面加载、JavaScript执行、数据渲染等各个环节
 */

console.log('🔍 MCP财务审核表调试启动...');

class FinancialAuditDebugger {
    constructor() {
        this.debugResults = {
            pageLoad: {},
            domElements: {},
            jsExecution: {},
            dataGeneration: {},
            rendering: {},
            errors: []
        };
        this.startTime = Date.now();
    }

    async runFullDiagnosis() {
        console.log('🚀 开始全面诊断财务审核表问题...');
        
        // 等待页面稳定
        await this.waitForPageStable();
        
        // 逐步诊断
        await this.checkPageLoadStatus();
        await this.checkDOMElements();
        await this.checkJSExecution();
        await this.checkDataGeneration();
        await this.checkRendering();
        await this.checkConsoleErrors();
        
        // 生成诊断报告
        this.generateDiagnosisReport();
        
        // 尝试修复
        await this.attemptAutoFix();
        
        return this.debugResults;
    }

    async waitForPageStable() {
        console.log('⏳ 等待页面稳定...');
        
        // 等待DOM完全加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
                setTimeout(resolve, 5000); // 最多等待5秒
            });
        }
        
        // 额外等待JavaScript加载
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ 页面稳定，开始诊断...');
    }

    async checkPageLoadStatus() {
        console.log('📋 检查页面加载状态...');
        
        this.debugResults.pageLoad = {
            readyState: document.readyState,
            url: window.location.href,
            title: document.title,
            loadTime: Date.now() - this.startTime
        };
        
        // 检查基础HTML结构
        const hasMainContent = !!document.querySelector('main') || !!document.querySelector('.main-content');
        const hasTable = !!document.querySelector('#financialAuditTable');
        const hasStyles = document.querySelectorAll('style, link[rel="stylesheet"]').length > 0;
        const hasScripts = document.querySelectorAll('script').length > 0;
        
        this.debugResults.pageLoad.structure = {
            hasMainContent,
            hasTable,
            hasStyles,
            hasScripts,
            scriptCount: document.querySelectorAll('script').length,
            styleCount: document.querySelectorAll('style, link[rel="stylesheet"]').length
        };
        
        console.log('页面加载状态:', this.debugResults.pageLoad);
    }

    async checkDOMElements() {
        console.log('🔍 检查DOM元素...');
        
        const criticalElements = [
            'financialAuditTable',
            'financialAuditTableBody', 
            'tableView',
            'cardsView'
        ];
        
        this.debugResults.domElements = {};
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            this.debugResults.domElements[id] = {
                exists: !!element,
                visible: element ? this.isElementVisible(element) : false,
                innerHTML: element ? element.innerHTML.substring(0, 200) + '...' : null,
                classes: element ? Array.from(element.classList) : null
            };
            
            console.log(`${element ? '✅' : '❌'} ${id}: ${element ? '存在' : '不存在'}`);
        });
        
        // 检查表格结构
        const table = document.getElementById('financialAuditTable');
        if (table) {
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            const headers = table.querySelectorAll('thead th');
            const rows = table.querySelectorAll('tbody tr');
            
            this.debugResults.domElements.tableStructure = {
                hasHead: !!thead,
                hasBody: !!tbody,
                headerCount: headers.length,
                rowCount: rows.length,
                headers: Array.from(headers).map(th => th.textContent.trim())
            };
            
            console.log('表格结构:', this.debugResults.domElements.tableStructure);
        }
    }

    async checkJSExecution() {
        console.log('⚙️ 检查JavaScript执行状态...');
        
        // 检查关键JavaScript对象和函数
        const jsChecks = {
            FinancialAuditTableClass: typeof FinancialAuditTable !== 'undefined',
            windowInstance: !!window.financialAuditTable,
            instanceType: window.financialAuditTable ? typeof window.financialAuditTable : null,
            instanceMethods: window.financialAuditTable ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.financialAuditTable)) : null
        };
        
        this.debugResults.jsExecution = jsChecks;
        
        console.log('JavaScript执行状态:', jsChecks);
        
        // 如果实例存在，检查其内部状态
        if (window.financialAuditTable) {
            const instance = window.financialAuditTable;
            this.debugResults.jsExecution.instanceState = {
                originalDataLength: instance.originalData ? instance.originalData.length : 0,
                currentDataLength: instance.currentData ? instance.currentData.length : 0,
                filteredDataLength: instance.filteredData ? instance.filteredData.length : 0,
                currentView: instance.currentView,
                currentPage: instance.currentPage,
                pageSize: instance.pageSize
            };
            
            console.log('实例状态:', this.debugResults.jsExecution.instanceState);
        }
    }

    async checkDataGeneration() {
        console.log('📊 检查数据生成...');
        
        if (window.financialAuditTable && typeof window.financialAuditTable.generateMockAuditData === 'function') {
            try {
                console.log('测试数据生成函数...');
                const testData = window.financialAuditTable.generateMockAuditData();
                
                this.debugResults.dataGeneration = {
                    success: true,
                    dataLength: testData.length,
                    sampleData: testData.slice(0, 3), // 前3条样本数据
                    dataStructure: testData.length > 0 ? Object.keys(testData[0]) : []
                };
                
                console.log('✅ 数据生成成功:', this.debugResults.dataGeneration);
            } catch (error) {
                this.debugResults.dataGeneration = {
                    success: false,
                    error: error.message,
                    stack: error.stack
                };
                
                console.error('❌ 数据生成失败:', error);
                this.debugResults.errors.push(`数据生成错误: ${error.message}`);
            }
        } else {
            this.debugResults.dataGeneration = {
                success: false,
                reason: 'generateMockAuditData函数不存在或不可调用'
            };
            
            console.log('❌ 无法测试数据生成');
        }
    }

    async checkRendering() {
        console.log('🎨 检查渲染逻辑...');
        
        const tbody = document.getElementById('financialAuditTableBody');
        
        if (tbody) {
            // 检查当前表格内容
            const currentRows = tbody.querySelectorAll('tr');
            const loadingRows = tbody.querySelectorAll('tr.loading-row');
            const emptyRows = tbody.querySelectorAll('tr.empty-row');
            const dataRows = tbody.querySelectorAll('tr:not(.loading-row):not(.empty-row)');
            
            this.debugResults.rendering = {
                tbodyExists: true,
                totalRows: currentRows.length,
                loadingRows: loadingRows.length,
                emptyRows: emptyRows.length,
                dataRows: dataRows.length,
                innerHTML: tbody.innerHTML.substring(0, 500) + '...'
            };
            
            console.log('渲染状态:', this.debugResults.rendering);
            
            // 如果有数据但没有渲染，尝试手动渲染测试
            if (window.financialAuditTable && this.debugResults.dataGeneration.success && dataRows.length === 0) {
                console.log('尝试手动渲染测试...');
                try {
                    const testData = this.debugResults.dataGeneration.sampleData || [];
                    if (testData.length > 0 && typeof window.financialAuditTable.renderTableData === 'function') {
                        window.financialAuditTable.renderTableData(testData);
                        
                        // 重新检查渲染结果
                        setTimeout(() => {
                            const newDataRows = tbody.querySelectorAll('tr:not(.loading-row):not(.empty-row)');
                            console.log(`手动渲染后数据行数: ${newDataRows.length}`);
                            this.debugResults.rendering.manualRenderTest = {
                                success: newDataRows.length > 0,
                                rowCount: newDataRows.length
                            };
                        }, 500);
                    }
                } catch (error) {
                    console.error('手动渲染测试失败:', error);
                    this.debugResults.rendering.manualRenderTest = {
                        success: false,
                        error: error.message
                    };
                }
            }
        } else {
            this.debugResults.rendering = {
                tbodyExists: false,
                reason: 'financialAuditTableBody元素不存在'
            };
        }
    }

    async checkConsoleErrors() {
        console.log('🐛 检查控制台错误...');
        
        // 监听新的错误
        const originalConsoleError = console.error;
        const capturedErrors = [];
        
        console.error = function(...args) {
            capturedErrors.push({
                timestamp: new Date().toISOString(),
                message: args.join(' ')
            });
            originalConsoleError.apply(console, args);
        };
        
        // 等待一段时间收集错误
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 恢复原始console.error
        console.error = originalConsoleError;
        
        this.debugResults.errors.push(...capturedErrors.map(e => e.message));
        
        console.log(`发现 ${capturedErrors.length} 个新错误`);
    }

    generateDiagnosisReport() {
        console.log('\n🎯 ========== MCP财务审核表诊断报告 ==========');
        
        console.log('\n📊 问题分析:');
        
        // 分析问题
        const issues = [];
        
        if (!this.debugResults.domElements.financialAuditTable?.exists) {
            issues.push('❌ 关键元素financialAuditTable不存在');
        }
        
        if (!this.debugResults.jsExecution.FinancialAuditTableClass) {
            issues.push('❌ FinancialAuditTable类未定义');
        }
        
        if (!this.debugResults.jsExecution.windowInstance) {
            issues.push('❌ window.financialAuditTable实例不存在');
        }
        
        if (!this.debugResults.dataGeneration.success) {
            issues.push('❌ 数据生成失败');
        }
        
        if (this.debugResults.rendering.dataRows === 0) {
            issues.push('❌ 表格没有数据行');
        }
        
        if (this.debugResults.errors.length > 0) {
            issues.push(`❌ 发现 ${this.debugResults.errors.length} 个错误`);
        }
        
        if (issues.length === 0) {
            console.log('✅ 未发现明显问题');
        } else {
            issues.forEach(issue => console.log(issue));
        }
        
        console.log('\n🔍 详细信息:');
        console.log('页面加载:', this.debugResults.pageLoad.structure);
        console.log('JavaScript状态:', this.debugResults.jsExecution);
        console.log('数据生成:', this.debugResults.dataGeneration.success);
        console.log('渲染状态:', this.debugResults.rendering);
        
        if (this.debugResults.errors.length > 0) {
            console.log('\n❌ 错误列表:');
            this.debugResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        console.log('\n===============================================');
    }

    async attemptAutoFix() {
        console.log('\n🔧 尝试自动修复...');
        
        // 修复1: 如果类存在但实例不存在，创建实例
        if (this.debugResults.jsExecution.FinancialAuditTableClass && !this.debugResults.jsExecution.windowInstance) {
            console.log('🔄 尝试创建FinancialAuditTable实例...');
            try {
                window.financialAuditTable = new FinancialAuditTable();
                console.log('✅ 实例创建成功');
                
                // 等待一段时间让初始化完成
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 重新检查结果
                const tbody = document.getElementById('financialAuditTableBody');
                if (tbody) {
                    const dataRows = tbody.querySelectorAll('tr:not(.loading-row):not(.empty-row)');
                    console.log(`修复后数据行数: ${dataRows.length}`);
                }
            } catch (error) {
                console.error('❌ 实例创建失败:', error);
            }
        }
        
        // 修复2: 如果实例存在但数据为空，尝试重新加载数据
        if (window.financialAuditTable && 
            this.debugResults.jsExecution.instanceState?.originalDataLength === 0) {
            console.log('🔄 尝试重新加载数据...');
            try {
                await window.financialAuditTable.loadAuditData();
                console.log('✅ 数据重新加载完成');
            } catch (error) {
                console.error('❌ 数据重新加载失败:', error);
            }
        }
    }

    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }
}

// 自动执行诊断
if (typeof window !== 'undefined') {
    window.financialAuditDebugger = new FinancialAuditDebugger();
    
    // 延迟执行以确保页面加载完成
    setTimeout(async () => {
        try {
            const results = await window.financialAuditDebugger.runFullDiagnosis();
            
            // 将结果保存到全局变量供后续分析
            window.debugResults = results;
            
            console.log('\n🎉 MCP调试完成！');
            console.log('💡 可通过 window.debugResults 查看详细结果');
            console.log('🔄 可通过 window.financialAuditDebugger.runFullDiagnosis() 重新运行');
            
        } catch (error) {
            console.error('❌ MCP调试过程中出现异常:', error);
        }
    }, 3000);
}

console.log('⏳ MCP财务审核表调试将在3秒后开始...');
console.log('💡 可手动执行: window.financialAuditDebugger.runFullDiagnosis()');
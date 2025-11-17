/**
 * 商户表格操作列固定调试工具
 * 使用MCP进行深度调试分析
 */

console.log('🔍 启动商户表格操作列固定深度调试...');

// 调试工具类
class MerchantTableDebugger {
    constructor() {
        this.debugResults = {};
        this.issues = [];
    }

    // 等待元素加载
    waitForElement(selector, timeout = 10000) {
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
                reject(new Error(`调试失败: 元素 ${selector} 在 ${timeout}ms 内未找到`));
            }, timeout);
        });
    }

    // 深度分析元素样式
    analyzeElementStyles(element, elementName) {
        const computed = window.getComputedStyle(element);
        const inline = element.style;
        
        const analysis = {
            elementName,
            selector: this.getElementSelector(element),
            classes: Array.from(element.classList),
            computedStyles: {
                position: computed.position,
                left: computed.left,
                right: computed.right,
                top: computed.top,
                bottom: computed.bottom,
                zIndex: computed.zIndex,
                backgroundColor: computed.backgroundColor,
                boxShadow: computed.boxShadow,
                borderLeft: computed.borderLeft,
                borderRight: computed.borderRight,
                width: computed.width,
                minWidth: computed.minWidth,
                transform: computed.transform
            },
            inlineStyles: {
                position: inline.position,
                left: inline.left,
                right: inline.right,
                zIndex: inline.zIndex,
                backgroundColor: inline.backgroundColor,
                boxShadow: inline.boxShadow
            },
            rect: element.getBoundingClientRect(),
            parent: element.parentElement?.tagName.toLowerCase(),
            parentClasses: element.parentElement ? Array.from(element.parentElement.classList) : []
        };

        console.log(`🔬 ${elementName} 详细分析:`, analysis);
        return analysis;
    }

    // 获取元素选择器路径
    getElementSelector(element) {
        if (!element) return '';
        
        let path = [];
        while (element && element.nodeType === 1) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
            }
            if (element.classList.length > 0) {
                selector += '.' + Array.from(element.classList).join('.');
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    // 检查CSS规则冲突
    checkCSSConflicts(element, targetProperty) {
        const rules = [];
        const sheets = Array.from(document.styleSheets);
        
        try {
            sheets.forEach(sheet => {
                try {
                    const cssRules = Array.from(sheet.cssRules || sheet.rules || []);
                    cssRules.forEach(rule => {
                        if (rule.style && rule.style[targetProperty]) {
                            // 检查规则是否匹配当前元素
                            try {
                                if (element.matches(rule.selectorText)) {
                                    rules.push({
                                        selector: rule.selectorText,
                                        value: rule.style[targetProperty],
                                        important: rule.style.getPropertyPriority(targetProperty) === 'important',
                                        href: sheet.href || 'inline'
                                    });
                                }
                            } catch (e) {
                                // 忽略无法匹配的选择器
                            }
                        }
                    });
                } catch (e) {
                    console.warn('无法访问样式表:', sheet.href, e.message);
                }
            });
        } catch (e) {
            console.warn('检查CSS冲突时出错:', e.message);
        }

        return rules;
    }

    // 调试表格容器结构
    async debugTableStructure() {
        console.log('📋 调试表格容器结构...');
        
        try {
            const tableWrapper = await this.waitForElement('.table-responsive-wrapper, .table-wrapper');
            const table = await this.waitForElement('#merchantTable, .enhanced-table');
            
            const wrapperAnalysis = this.analyzeElementStyles(tableWrapper, '表格包装器');
            const tableAnalysis = this.analyzeElementStyles(table, '表格元素');
            
            this.debugResults.tableStructure = {
                wrapper: wrapperAnalysis,
                table: tableAnalysis
            };

            // 检查关键样式
            if (wrapperAnalysis.computedStyles.position !== 'relative') {
                this.issues.push('⚠️ 表格包装器没有设置 position: relative');
            }

            if (wrapperAnalysis.computedStyles.overflowX !== 'auto' && wrapperAnalysis.computedStyles.overflowX !== 'scroll') {
                this.issues.push('⚠️ 表格包装器没有正确设置水平滚动');
            }

            return true;
        } catch (error) {
            console.error('❌ 调试表格结构失败:', error.message);
            this.issues.push(`❌ 表格结构调试失败: ${error.message}`);
            return false;
        }
    }

    // 调试表头固定列
    async debugHeaderColumns() {
        console.log('🔍 调试表头固定列...');
        
        try {
            // 查找所有可能的表头操作列选择器
            const selectors = [
                '.col-actions.col-fixed-right',
                '.col-actions',
                'th.col-actions',
                '.table-header th.col-actions',
                '.enhanced-table th.col-actions'
            ];

            let headerActionColumn = null;
            let usedSelector = '';

            for (const selector of selectors) {
                headerActionColumn = document.querySelector(selector);
                if (headerActionColumn) {
                    usedSelector = selector;
                    break;
                }
            }

            if (!headerActionColumn) {
                this.issues.push('❌ 未找到表头操作列元素');
                return false;
            }

            console.log(`✅ 找到表头操作列，使用选择器: ${usedSelector}`);
            
            const analysis = this.analyzeElementStyles(headerActionColumn, '表头操作列');
            this.debugResults.headerColumn = analysis;

            // 检查关键样式
            if (analysis.computedStyles.position !== 'sticky') {
                this.issues.push('❌ 表头操作列 position 不是 sticky');
            }

            if (analysis.computedStyles.right === 'auto' || analysis.computedStyles.right === '0px') {
                console.log('⚠️ 表头操作列 right 值可能有问题:', analysis.computedStyles.right);
            }

            // 检查CSS规则冲突
            const positionConflicts = this.checkCSSConflicts(headerActionColumn, 'position');
            const rightConflicts = this.checkCSSConflicts(headerActionColumn, 'right');
            
            console.log('📜 position 样式规则:', positionConflicts);
            console.log('📜 right 样式规则:', rightConflicts);

            this.debugResults.headerCSSConflicts = {
                position: positionConflicts,
                right: rightConflicts
            };

            return true;
        } catch (error) {
            console.error('❌ 调试表头固定列失败:', error.message);
            this.issues.push(`❌ 表头固定列调试失败: ${error.message}`);
            return false;
        }
    }

    // 调试表体固定列（重点）
    async debugBodyColumns() {
        console.log('🎯 调试表体固定列（重点分析）...');
        
        try {
            // 等待表格数据加载
            await this.waitForElement('#merchantTableBody tr');
            
            // 查找所有可能的表体操作列选择器
            const selectors = [
                '.col-actions-cell',
                'td.col-actions-cell',
                '#merchantTableBody .col-actions-cell',
                '#merchantTableBody td.col-actions',
                '.col-fixed.col-actions',
                '#merchantTableBody .col-fixed.col-actions'
            ];

            let bodyActionColumn = null;
            let usedSelector = '';
            let allFoundElements = [];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    allFoundElements.push({ selector, count: elements.length });
                    if (!bodyActionColumn) {
                        bodyActionColumn = elements[0];
                        usedSelector = selector;
                    }
                }
            }

            console.log('🔍 搜索结果:', allFoundElements);

            if (!bodyActionColumn) {
                this.issues.push('❌ 未找到表体操作列元素');
                
                // 尝试查找任何表体单元格
                const anyTd = document.querySelector('#merchantTableBody td');
                if (anyTd) {
                    console.log('🔍 找到表体单元格示例:', this.analyzeElementStyles(anyTd, '任意表体单元格'));
                }
                
                return false;
            }

            console.log(`✅ 找到表体操作列，使用选择器: ${usedSelector}`);
            
            const analysis = this.analyzeElementStyles(bodyActionColumn, '表体操作列');
            this.debugResults.bodyColumn = analysis;

            // 详细检查每个关键样式
            const issues = [];
            
            if (analysis.computedStyles.position !== 'sticky') {
                issues.push(`❌ position: ${analysis.computedStyles.position} (应该是 sticky)`);
            }

            if (analysis.computedStyles.right === 'auto') {
                issues.push(`❌ right: ${analysis.computedStyles.right} (应该是 0px 或具体值)`);
            }

            if (parseInt(analysis.computedStyles.zIndex) < 50) {
                issues.push(`⚠️ zIndex: ${analysis.computedStyles.zIndex} (可能太低)`);
            }

            if (issues.length > 0) {
                this.issues.push(...issues);
                console.log('🚨 表体操作列样式问题:', issues);
            }

            // 检查CSS规则冲突
            const positionConflicts = this.checkCSSConflicts(bodyActionColumn, 'position');
            const rightConflicts = this.checkCSSConflicts(bodyActionColumn, 'right');
            
            console.log('📜 表体操作列 position 规则:', positionConflicts);
            console.log('📜 表体操作列 right 规则:', rightConflicts);

            this.debugResults.bodyCSSConflicts = {
                position: positionConflicts,
                right: rightConflicts
            };

            // 检查是否有多个操作列
            const allActionColumns = document.querySelectorAll(usedSelector);
            console.log(`📊 找到 ${allActionColumns.length} 个表体操作列`);
            
            if (allActionColumns.length > 1) {
                allActionColumns.forEach((col, index) => {
                    const colAnalysis = this.analyzeElementStyles(col, `表体操作列-${index + 1}`);
                    console.log(`🔍 第 ${index + 1} 个操作列分析:`, colAnalysis);
                });
            }

            return true;
        } catch (error) {
            console.error('❌ 调试表体固定列失败:', error.message);
            this.issues.push(`❌ 表体固定列调试失败: ${error.message}`);
            return false;
        }
    }

    // 检查JavaScript函数
    debugJavaScriptFunctions() {
        console.log('⚙️ 调试JavaScript函数...');
        
        const functions = {
            setupFixedColumns: typeof setupFixedColumns === 'function',
            handleTableScroll: typeof handleTableScroll === 'function',
            renderMerchantTable: typeof renderMerchantTable === 'function'
        };

        console.log('🔧 JavaScript函数状态:', functions);
        this.debugResults.jsFunctions = functions;

        if (!functions.setupFixedColumns) {
            this.issues.push('❌ setupFixedColumns 函数不存在');
        } else {
            try {
                // 尝试执行函数
                console.log('🔄 尝试执行 setupFixedColumns...');
                setupFixedColumns();
                console.log('✅ setupFixedColumns 执行成功');
            } catch (error) {
                console.error('❌ setupFixedColumns 执行失败:', error.message);
                this.issues.push(`❌ setupFixedColumns 执行失败: ${error.message}`);
            }
        }

        return Object.values(functions).every(exists => exists);
    }

    // 模拟滚动测试
    async testScrollBehavior() {
        console.log('🖱️ 测试滚动行为...');
        
        try {
            const tableWrapper = document.querySelector('.table-responsive-wrapper, .table-wrapper');
            if (!tableWrapper) {
                this.issues.push('❌ 找不到表格滚动容器');
                return false;
            }

            const bodyActionColumn = document.querySelector('.col-actions-cell, #merchantTableBody .col-actions');
            if (!bodyActionColumn) {
                this.issues.push('❌ 找不到表体操作列进行滚动测试');
                return false;
            }

            // 记录初始位置
            const initialRect = bodyActionColumn.getBoundingClientRect();
            console.log('📍 滚动前操作列位置:', {
                left: initialRect.left,
                right: initialRect.right,
                top: initialRect.top
            });

            // 执行滚动
            tableWrapper.scrollLeft = 200;
            await new Promise(resolve => setTimeout(resolve, 300));

            // 记录滚动后位置
            const scrolledRect = bodyActionColumn.getBoundingClientRect();
            console.log('📍 滚动后操作列位置:', {
                left: scrolledRect.left,
                right: scrolledRect.right,
                top: scrolledRect.top
            });

            // 检查位置变化
            const rightChanged = Math.abs(initialRect.right - scrolledRect.right) > 2;
            const leftChanged = Math.abs(initialRect.left - scrolledRect.left) > 2;

            if (rightChanged || leftChanged) {
                this.issues.push('❌ 滚动时操作列位置发生了变化，说明固定失败');
                console.log('🚨 滚动测试失败: 操作列跟随滚动移动了');
            } else {
                console.log('✅ 滚动测试成功: 操作列保持固定');
            }

            // 重置滚动位置
            tableWrapper.scrollLeft = 0;

            this.debugResults.scrollTest = {
                initialPosition: initialRect,
                scrolledPosition: scrolledRect,
                positionChanged: rightChanged || leftChanged
            };

            return !rightChanged && !leftChanged;
        } catch (error) {
            console.error('❌ 滚动测试失败:', error.message);
            this.issues.push(`❌ 滚动测试失败: ${error.message}`);
            return false;
        }
    }

    // 生成修复建议
    generateFixSuggestions() {
        console.log('💡 生成修复建议...');
        
        const suggestions = [];

        // 基于发现的问题生成建议
        this.issues.forEach(issue => {
            if (issue.includes('position 不是 sticky')) {
                suggestions.push('🔧 强制设置 position: sticky !important');
            }
            if (issue.includes('right 值可能有问题')) {
                suggestions.push('🔧 强制设置 right: 0 !important');
            }
            if (issue.includes('zIndex 可能太低')) {
                suggestions.push('🔧 提高 z-index 值到 99 或更高');
            }
            if (issue.includes('未找到表体操作列元素')) {
                suggestions.push('🔧 检查表格渲染逻辑，确保使用正确的CSS类名');
            }
            if (issue.includes('setupFixedColumns 函数不存在')) {
                suggestions.push('🔧 添加或修复 setupFixedColumns 函数');
            }
        });

        // 通用建议
        suggestions.push('🔧 考虑使用 JavaScript 强制覆盖样式');
        suggestions.push('🔧 检查 CSS 加载顺序和优先级');
        suggestions.push('🔧 使用 !important 确保样式优先级');

        this.debugResults.suggestions = suggestions;
        console.log('💡 修复建议:', suggestions);

        return suggestions;
    }

    // 运行完整调试
    async runCompleteDebug() {
        console.log('🚀 开始商户表格操作列固定完整调试...');
        
        // 等待页面加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        // 等待表格渲染
        await new Promise(resolve => setTimeout(resolve, 3000));

        const debugSteps = [
            { name: '表格结构', method: this.debugTableStructure.bind(this) },
            { name: '表头固定列', method: this.debugHeaderColumns.bind(this) },
            { name: '表体固定列', method: this.debugBodyColumns.bind(this) },
            { name: 'JavaScript函数', method: this.debugJavaScriptFunctions.bind(this) },
            { name: '滚动行为', method: this.testScrollBehavior.bind(this) }
        ];

        const results = {};
        for (const step of debugSteps) {
            console.log(`\n🔍 调试步骤: ${step.name}`);
            try {
                results[step.name] = await step.method();
            } catch (error) {
                console.error(`❌ ${step.name} 调试失败:`, error);
                results[step.name] = false;
            }
        }

        // 生成修复建议
        this.generateFixSuggestions();

        // 输出调试摘要
        console.log('\n📊 调试摘要:');
        console.log('调试结果:', results);
        console.log('发现的问题:', this.issues);
        console.log('完整调试数据:', this.debugResults);

        const successCount = Object.values(results).filter(r => r).length;
        const totalCount = Object.keys(results).length;
        
        console.log(`🎯 调试完成: ${successCount}/${totalCount} 项正常`);

        if (this.issues.length === 0) {
            console.log('🎉 未发现问题，操作列应该已正确固定！');
        } else {
            console.log('🚨 发现问题，需要修复:', this.issues);
        }

        return {
            results,
            issues: this.issues,
            debugData: this.debugResults,
            success: this.issues.length === 0
        };
    }
}

// 自动启动调试
if (typeof window !== 'undefined') {
    // 创建全局调试实例
    window.merchantTableDebugger = new MerchantTableDebugger();
    
    // 延迟启动调试
    setTimeout(() => {
        window.merchantTableDebugger.runCompleteDebug()
            .then(result => {
                console.log('🎯 调试完成，结果:', result);
                
                // 如果发现问题，提供快速修复
                if (!result.success) {
                    console.log('🔧 尝试应用快速修复...');
                    window.merchantTableDebugger.applyQuickFix();
                }
            })
            .catch(console.error);
    }, 4000);
}

// 快速修复函数
MerchantTableDebugger.prototype.applyQuickFix = function() {
    console.log('⚡ 应用快速修复...');
    
    // 强制修复表体操作列
    const selectors = [
        '.col-actions-cell',
        '#merchantTableBody .col-actions-cell',
        '#merchantTableBody td.col-actions',
        '#merchantTableBody .col-actions'
    ];
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            console.log(`🔧 修复元素 ${selector} [${index}]`);
            
            // 强制设置样式
            el.style.position = 'sticky';
            el.style.right = '0px';
            el.style.zIndex = '99';
            el.style.backgroundColor = '#ffffff';
            el.style.borderLeft = '2px solid #3b82f6';
            el.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
            
            // 添加!important（通过CSS字符串）
            el.style.cssText += '; position: sticky !important; right: 0px !important; z-index: 99 !important;';
            
            console.log('✅ 样式修复完成');
        });
    });
    
    console.log('⚡ 快速修复执行完成');
};

// 导出调试器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchantTableDebugger;
}
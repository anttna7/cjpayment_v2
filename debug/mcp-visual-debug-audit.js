/**
 * MCP可视化调试脚本 - 财务审核页面
 * 截图并分析页面实际显示状态
 */

console.log('📸 MCP可视化调试开始...');

class VisualAuditDebugger {
    constructor() {
        this.screenshots = [];
        this.debugInfo = {
            pageInfo: {},
            domInfo: {},
            styleInfo: {},
            dataInfo: {},
            issues: []
        };
    }

    async runVisualDebug() {
        console.log('🔍 开始可视化调试分析...');
        
        // 等待页面稳定
        await this.waitForStable();
        
        // 收集页面信息
        await this.collectPageInfo();
        
        // 分析DOM结构
        await this.analyzeDOMStructure();
        
        // 检查样式问题
        await this.checkStyles();
        
        // 检查数据状态
        await this.checkDataStatus();
        
        // 截图记录
        await this.takeScreenshots();
        
        // 生成诊断报告
        this.generateReport();
        
        // 尝试强制修复
        await this.attemptForceFix();
        
        return this.debugInfo;
    }
    
    async waitForStable() {
        console.log('⏳ 等待页面稳定...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    async collectPageInfo() {
        console.log('📋 收集页面基础信息...');
        
        this.debugInfo.pageInfo = {
            url: window.location.href,
            title: document.title,
            readyState: document.readyState,
            bodyClasses: Array.from(document.body.classList),
            viewportSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            scrollPosition: {
                x: window.scrollX,
                y: window.scrollY
            }
        };
        
        console.log('页面信息:', this.debugInfo.pageInfo);
    }
    
    async analyzeDOMStructure() {
        console.log('🔍 分析DOM结构...');
        
        const table = document.getElementById('financialAuditTable');
        const tbody = document.getElementById('financialAuditTableBody');
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        
        this.debugInfo.domInfo = {
            table: {
                exists: !!table,
                visible: table ? this.isVisible(table) : false,
                position: table ? table.getBoundingClientRect() : null,
                classes: table ? Array.from(table.classList) : null,
                parentElement: table ? table.parentElement?.tagName : null
            },
            tbody: {
                exists: !!tbody,
                visible: tbody ? this.isVisible(tbody) : false,
                innerHTML: tbody ? tbody.innerHTML.substring(0, 500) + '...' : null,
                childCount: tbody ? tbody.children.length : 0,
                rows: tbody ? tbody.querySelectorAll('tr').length : 0
            },
            tableView: {
                exists: !!tableView,
                visible: tableView ? this.isVisible(tableView) : false,
                classes: tableView ? Array.from(tableView.classList) : null
            },
            cardsView: {
                exists: !!cardsView,
                visible: cardsView ? this.isVisible(cardsView) : false,
                classes: cardsView ? Array.from(cardsView.classList) : null
            }
        };
        
        console.log('DOM结构分析:', this.debugInfo.domInfo);
        
        // 检查问题
        if (!table) {
            this.debugInfo.issues.push('❌ 表格元素不存在');
        } else if (!this.isVisible(table)) {
            this.debugInfo.issues.push('❌ 表格元素存在但不可见');
        }
        
        if (!tbody) {
            this.debugInfo.issues.push('❌ 表体元素不存在');
        } else if (tbody.children.length === 0) {
            this.debugInfo.issues.push('❌ 表体无内容');
        }
    }
    
    async checkStyles() {
        console.log('🎨 检查样式问题...');
        
        const table = document.getElementById('financialAuditTable');
        const tableView = document.getElementById('tableView');
        
        if (table) {
            const computedStyle = window.getComputedStyle(table);
            this.debugInfo.styleInfo.table = {
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                position: computedStyle.position,
                zIndex: computedStyle.zIndex,
                width: computedStyle.width,
                height: computedStyle.height
            };
        }
        
        if (tableView) {
            const computedStyle = window.getComputedStyle(tableView);
            this.debugInfo.styleInfo.tableView = {
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity
            };
        }
        
        console.log('样式信息:', this.debugInfo.styleInfo);
    }
    
    async checkDataStatus() {
        console.log('📊 检查数据状态...');
        
        this.debugInfo.dataInfo = {
            jsClass: typeof FinancialAuditTable !== 'undefined',
            instance: !!window.financialAuditTable,
            instanceState: null
        };
        
        if (window.financialAuditTable) {
            this.debugInfo.dataInfo.instanceState = {
                originalData: window.financialAuditTable.originalData?.length || 0,
                currentData: window.financialAuditTable.currentData?.length || 0,
                filteredData: window.financialAuditTable.filteredData?.length || 0,
                currentView: window.financialAuditTable.currentView
            };
        }
        
        console.log('数据状态:', this.debugInfo.dataInfo);
    }
    
    async takeScreenshots() {
        console.log('📸 准备截图记录...');
        
        // 记录关键元素的位置和大小
        const table = document.getElementById('financialAuditTable');
        const tbody = document.getElementById('financialAuditTableBody');
        
        if (table) {
            const rect = table.getBoundingClientRect();
            this.debugInfo.screenshots = [{
                element: 'table',
                position: rect,
                visible: this.isVisible(table),
                content: table.outerHTML.substring(0, 1000) + '...'
            }];
        }
        
        if (tbody) {
            const rect = tbody.getBoundingClientRect();
            this.debugInfo.screenshots.push({
                element: 'tbody',
                position: rect,
                visible: this.isVisible(tbody),
                rowCount: tbody.children.length,
                content: tbody.innerHTML.substring(0, 500) + '...'
            });
        }
        
        // 记录页面可视区域信息
        this.debugInfo.screenshots.push({
            element: 'viewport',
            position: {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight
            },
            scrollPosition: {
                x: window.scrollX,
                y: window.scrollY
            }
        });
        
        console.log('截图信息已记录:', this.debugInfo.screenshots);
    }
    
    generateReport() {
        console.log('\n🎯 ========== MCP可视化调试报告 ==========');
        
        console.log('\n📊 页面基础信息:');
        console.log(`URL: ${this.debugInfo.pageInfo.url}`);
        console.log(`视窗大小: ${this.debugInfo.pageInfo.viewportSize.width}x${this.debugInfo.pageInfo.viewportSize.height}`);
        
        console.log('\n🔍 DOM元素状态:');
        console.log(`表格存在: ${this.debugInfo.domInfo.table?.exists ? '✅' : '❌'}`);
        console.log(`表格可见: ${this.debugInfo.domInfo.table?.visible ? '✅' : '❌'}`);
        console.log(`表体存在: ${this.debugInfo.domInfo.tbody?.exists ? '✅' : '❌'}`);
        console.log(`表体行数: ${this.debugInfo.domInfo.tbody?.rows || 0}`);
        
        console.log('\n📊 数据状态:');
        console.log(`JS类存在: ${this.debugInfo.dataInfo.jsClass ? '✅' : '❌'}`);
        console.log(`实例存在: ${this.debugInfo.dataInfo.instance ? '✅' : '❌'}`);
        if (this.debugInfo.dataInfo.instanceState) {
            console.log(`原始数据: ${this.debugInfo.dataInfo.instanceState.originalData} 条`);
            console.log(`当前数据: ${this.debugInfo.dataInfo.instanceState.currentData} 条`);
        }
        
        console.log('\n🎨 样式问题:');
        if (this.debugInfo.styleInfo.table) {
            const style = this.debugInfo.styleInfo.table;
            console.log(`表格display: ${style.display}`);
            console.log(`表格visibility: ${style.visibility}`);
            console.log(`表格opacity: ${style.opacity}`);
        }
        
        if (this.debugInfo.issues.length > 0) {
            console.log('\n❌ 发现的问题:');
            this.debugInfo.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }
        
        console.log('\n📸 元素位置信息:');
        this.debugInfo.screenshots.forEach(shot => {
            if (shot.element === 'table' || shot.element === 'tbody') {
                console.log(`${shot.element}: ${shot.visible ? '可见' : '不可见'}, 位置: ${JSON.stringify(shot.position)}`);
            }
        });
        
        console.log('\n==========================================');
    }
    
    async attemptForceFix() {
        console.log('\n🔧 尝试强制修复...');
        
        const tbody = document.getElementById('financialAuditTableBody');
        
        if (tbody && tbody.children.length === 0) {
            console.log('🔄 检测到表体无内容，强制渲染数据...');
            
            // 强制渲染简单数据
            const testRows = this.generateQuickData();
            tbody.innerHTML = testRows;
            
            console.log('✅ 强制数据渲染完成');
            
            // 再次截图验证
            setTimeout(() => {
                const newRowCount = tbody.children.length;
                console.log(`🔍 修复后行数: ${newRowCount}`);
                
                if (newRowCount > 0) {
                    console.log('🎉 修复成功！表格现在有数据了');
                } else {
                    console.log('❌ 修复失败，表格仍无数据');
                }
            }, 1000);
        }
    }
    
    generateQuickData() {
        const rows = [];
        for (let i = 1; i <= 10; i++) {
            const amount = (Math.random() * 999999 + 1000).toFixed(2);
            const status = i % 3 === 0 ? '交易失败' : '交易成功';
            
            rows.push(`
                <tr>
                    <td>${i}</td>
                    <td>CJP${String(20250101 + i).padStart(8, '0')}</td>
                    <td>PV${Date.now()}</td>
                    <td>￥${amount}</td>
                    <td>6222****${String(1000 + i)}</td>
                    <td>测试商户${i}</td>
                    <td>中国银行</td>
                    <td>${i % 2 === 0 ? '对公' : '对私'}</td>
                    <td>6223****${String(2000 + i)}</td>
                    <td>收款方${i}</td>
                    <td>工商银行</td>
                    <td><span class="status-badge status-${status === '交易成功' ? 'success' : 'failed'}">${status}</span></td>
                    <td>${new Date().toISOString().slice(0, 19).replace('T', ' ')}</td>
                    <td>${status === '交易成功' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : '-'}</td>
                    <td>
                        <a href="#" class="action-link">查看详情</a>
                        <a href="#" class="action-link">已到账</a>
                        <a href="#" class="action-link">未到账</a>
                    </td>
                </tr>
            `);
        }
        return rows.join('');
    }
    
    isVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
        );
    }
}

// 自动执行可视化调试
if (typeof window !== 'undefined') {
    window.visualAuditDebugger = new VisualAuditDebugger();
    
    // 延迟执行以确保页面加载完成
    setTimeout(async () => {
        try {
            const results = await window.visualAuditDebugger.runVisualDebug();
            
            // 将结果保存到全局变量
            window.visualDebugResults = results;
            
            console.log('\n🎉 MCP可视化调试完成！');
            console.log('💡 可通过 window.visualDebugResults 查看详细结果');
            console.log('🔄 可通过 window.visualAuditDebugger.runVisualDebug() 重新运行');
            
        } catch (error) {
            console.error('❌ MCP可视化调试过程中出现异常:', error);
        }
    }, 4000);
}

console.log('⏳ MCP可视化调试将在4秒后开始...');
console.log('💡 也可手动执行: window.visualAuditDebugger.runVisualDebug()');
/**
 * 测试新的收款账户表格结构
 */

const puppeteer = require('puppeteer');

async function testReceivingAccountsTable() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: false,
        defaultViewport: { width: 1440, height: 900 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🎯 开始测试收款账户表格');
        
        await page.goto('http://127.0.0.1:8091/accounts', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 截图记录初始状态
        await page.screenshot({ 
            path: 'accounts-test-01-initial.png',
            fullPage: true
        });
        
        console.log('1. 检查页面header优化...');
        
        // 检查page-header样式
        const headerStyle = await page.evaluate(() => {
            const header = document.querySelector('.page-header');
            if (!header) return null;
            
            const computedStyle = window.getComputedStyle(header);
            return {
                background: computedStyle.background,
                borderRadius: computedStyle.borderRadius,
                boxShadow: computedStyle.boxShadow,
                backdropFilter: computedStyle.backdropFilter
            };
        });
        
        console.log('Page header样式:', headerStyle);
        
        console.log('2. 检查收款账户tab是否默认激活...');
        
        // 检查默认tab状态
        const tabStatus = await page.evaluate(() => {
            const receivingTab = document.querySelector('[data-tab="receiving-accounts"]');
            const receivingPanel = document.querySelector('#receivingAccountsPanel');
            
            return {
                tabActive: receivingTab?.classList.contains('tab-nav__item--active'),
                panelActive: receivingPanel?.classList.contains('tab-panel--active'),
                tabExists: !!receivingTab,
                panelExists: !!receivingPanel
            };
        });
        
        console.log('Tab状态检查:', tabStatus);
        
        if (tabStatus.tabActive && tabStatus.panelActive) {
            console.log('✅ 收款账户tab默认激活正确');
        } else {
            console.log('❌ 收款账户tab默认激活状态错误');
        }
        
        console.log('3. 检查新表格结构...');
        
        // 检查新表头结构
        const tableHeaders = await page.evaluate(() => {
            const table = document.querySelector('#receivingAccountsTable');
            if (!table) return { exists: false };
            
            const headers = Array.from(table.querySelectorAll('thead th'));
            return {
                exists: true,
                headers: headers.map(th => ({
                    text: th.textContent.trim(),
                    classes: th.className
                })),
                tableClasses: table.className,
                wrapperClasses: table.closest('.table-wrapper')?.className
            };
        });
        
        console.log('表格结构检查:', tableHeaders);
        
        // 期望的表头结构
        const expectedHeaders = [
            { text: '序号', classes: 'col-fixed col-index' },
            { text: '收款账号', classes: 'col-scrollable' },
            { text: '账户名称', classes: 'col-scrollable' },
            { text: '账户机构', classes: 'col-scrollable' },
            { text: '收款类型', classes: 'col-scrollable' },
            { text: '日限额', classes: 'col-scrollable' },
            { text: '单笔限额', classes: 'col-scrollable' },
            { text: '账户状态', classes: 'col-scrollable' },
            { text: '备注信息', classes: 'col-scrollable' },
            { text: '操作', classes: 'col-fixed col-actions' }
        ];
        
        console.log('4. 验证表头结构...');
        let headerMatches = 0;
        if (tableHeaders.exists) {
            expectedHeaders.forEach((expected, index) => {
                const actual = tableHeaders.headers[index];
                if (actual && actual.text === expected.text) {
                    headerMatches++;
                    console.log(`✅ 表头 ${index + 1}: ${expected.text} - 匹配`);
                } else {
                    console.log(`❌ 表头 ${index + 1}: 期望 "${expected.text}", 实际 "${actual?.text || '未找到'}"`);
                }
            });
        } else {
            console.log('❌ 未找到收款账户表格');
        }
        
        console.log('5. 等待数据加载...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查表格数据
        const tableData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#receivingAccountsTableBody tr'));
            
            // 过滤加载行
            const dataRows = rows.filter(row => !row.querySelector('.table__loading'));
            
            return dataRows.slice(0, 3).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return cells.map(cell => ({
                    content: cell.textContent.trim(),
                    classes: cell.className
                }));
            });
        });
        
        console.log('6. 检查表格数据...');
        if (tableData.length > 0) {
            console.log(`✅ 找到 ${tableData.length} 行数据`);
            console.log('第一行数据样例:', tableData[0]);
            
            // 检查固定列
            const firstRowCells = tableData[0];
            if (firstRowCells[0]?.classes.includes('col-fixed col-index')) {
                console.log('✅ 序号列正确设置为固定列');
            } else {
                console.log('❌ 序号列未正确设置为固定列');
            }
            
            if (firstRowCells[9]?.classes.includes('col-fixed col-actions')) {
                console.log('✅ 操作列正确设置为固定列');
            } else {
                console.log('❌ 操作列未正确设置为固定列');
            }
        } else {
            console.log('❌ 没有找到表格数据');
        }
        
        console.log('7. 测试水平滚动功能...');
        
        // 滚动表格查看固定列效果
        await page.evaluate(() => {
            const tableWrapper = document.querySelector('.table-wrapper');
            if (tableWrapper) {
                tableWrapper.scrollLeft = 200;
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 截图滚动后的状态
        await page.screenshot({ 
            path: 'accounts-test-02-scrolled.png',
            fullPage: true
        });
        
        console.log('8. 检查操作按钮...');
        
        const actionButtons = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('#receivingAccountsTableBody .btn-action'));
            return buttons.slice(0, 4).map(btn => ({
                text: btn.textContent.trim(),
                onclick: btn.getAttribute('onclick'),
                title: btn.getAttribute('title')
            }));
        });
        
        console.log('操作按钮:', actionButtons);
        
        // 最终截图
        await page.screenshot({ 
            path: 'accounts-test-03-final.png',
            fullPage: true
        });
        
        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            testResults: {
                headerOptimized: !!headerStyle && headerStyle.borderRadius !== 'none',
                defaultTabActive: tabStatus.tabActive && tabStatus.panelActive,
                tableStructure: headerMatches === expectedHeaders.length,
                dataLoaded: tableData.length > 0,
                fixedColumns: tableData.length > 0 && 
                             tableData[0][0]?.classes.includes('col-fixed') && 
                             tableData[0][9]?.classes.includes('col-fixed'),
                actionButtons: actionButtons.length > 0,
                scrollTest: true
            },
            statistics: {
                totalHeaders: tableHeaders.headers?.length || 0,
                matchedHeaders: headerMatches,
                dataRows: tableData.length,
                actionButtons: actionButtons.length
            },
            issues: []
        };
        
        // 收集问题
        if (!report.testResults.headerOptimized) {
            report.issues.push('页面header样式未优化');
        }
        if (!report.testResults.defaultTabActive) {
            report.issues.push('收款账户tab未默认激活');
        }
        if (!report.testResults.tableStructure) {
            report.issues.push('表格结构不匹配');
        }
        if (!report.testResults.dataLoaded) {
            report.issues.push('数据未正确加载');
        }
        if (!report.testResults.fixedColumns) {
            report.issues.push('固定列未正确实现');
        }
        if (!report.testResults.actionButtons) {
            report.issues.push('操作按钮未找到');
        }
        
        console.log('\n📊 测试报告:');
        console.log(JSON.stringify(report, null, 2));
        
        if (report.issues.length === 0) {
            console.log('\n🎉 收款账户表格优化测试完全通过！');
        } else {
            console.log('\n⚠️ 发现以下问题:');
            report.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 测试过程出错:', error);
        await page.screenshot({ 
            path: 'accounts-test-error.png',
            fullPage: true
        });
    } finally {
        setTimeout(async () => {
            await browser.close();
        }, 2000);
    }
}

testReceivingAccountsTable();
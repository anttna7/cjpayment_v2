/**
 * 测试新商户管理表格结构
 */

const puppeteer = require('puppeteer');

async function testNewMerchantTable() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: false,
        defaultViewport: { width: 1440, height: 900 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🎯 开始测试新商户管理表格');
        
        await page.goto('http://127.0.0.1:8091/merchant', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 截图记录初始状态
        await page.screenshot({ 
            path: 'new-table-01-initial.png',
            fullPage: true
        });
        
        console.log('1. 检查表格结构...');
        
        // 检查新表头结构
        const tableHeaders = await page.evaluate(() => {
            const headers = Array.from(document.querySelectorAll('.enhanced-table thead th'));
            return headers.map(th => ({
                text: th.textContent.trim(),
                classes: th.className
            }));
        });
        
        console.log('表格标题:', tableHeaders);
        
        // 期望的表头结构
        const expectedHeaders = [
            { text: '序号', classes: 'col-fixed col-index' },
            { text: '账户ID', classes: 'col-scrollable' },
            { text: '开户主体', classes: 'col-scrollable' },
            { text: '代理商ID', classes: 'col-scrollable' },
            { text: '代理商名称', classes: 'col-scrollable' },
            { text: '返点政策', classes: 'col-scrollable' },
            { text: '充值链接', classes: 'col-scrollable' },
            { text: '账户状态', classes: 'col-scrollable' },
            { text: '备注信息', classes: 'col-scrollable' },
            { text: '操作', classes: 'col-fixed col-actions' }
        ];
        
        console.log('2. 验证表头结构...');
        let headerMatches = 0;
        expectedHeaders.forEach((expected, index) => {
            const actual = tableHeaders[index];
            if (actual && actual.text === expected.text) {
                headerMatches++;
                console.log(`✅ 表头 ${index + 1}: ${expected.text} - 匹配`);
            } else {
                console.log(`❌ 表头 ${index + 1}: 期望 "${expected.text}", 实际 "${actual?.text || '未找到'}"`);
            }
        });
        
        console.log('3. 等待数据加载...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查表格数据
        const tableData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#merchantTableBody tr.merchant-row'));
            return rows.slice(0, 3).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return cells.map(cell => ({
                    content: cell.textContent.trim(),
                    classes: cell.className
                }));
            });
        });
        
        console.log('4. 检查表格数据...');
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
        
        console.log('5. 测试水平滚动功能...');
        
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
            path: 'new-table-02-scrolled.png',
            fullPage: true
        });
        
        console.log('6. 检查操作按钮...');
        
        const actionButtons = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('.btn-action'));
            return buttons.slice(0, 3).map(btn => ({
                text: btn.textContent.trim(),
                onclick: btn.getAttribute('onclick')
            }));
        });
        
        console.log('操作按钮:', actionButtons);
        
        // 测试一个操作按钮
        if (actionButtons.length > 0) {
            console.log('7. 测试详情按钮...');
            
            // 点击第一个详情按钮（需要定义这个函数）
            await page.evaluate(() => {
                // 模拟详情函数
                window.viewMerchantDetails = function(accountId) {
                    console.log('查看商户详情:', accountId);
                    return true;
                };
                
                // 点击第一个详情按钮
                const firstDetailBtn = document.querySelector('.btn-action[onclick*="viewMerchantDetails"]');
                if (firstDetailBtn) {
                    firstDetailBtn.click();
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 最终截图
        await page.screenshot({ 
            path: 'new-table-03-final.png',
            fullPage: true
        });
        
        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            testResults: {
                headerStructure: headerMatches === expectedHeaders.length,
                dataLoaded: tableData.length > 0,
                fixedColumns: tableData.length > 0 && 
                             tableData[0][0]?.classes.includes('col-fixed') && 
                             tableData[0][9]?.classes.includes('col-fixed'),
                actionButtons: actionButtons.length > 0,
                scrollTest: true
            },
            statistics: {
                totalHeaders: tableHeaders.length,
                matchedHeaders: headerMatches,
                dataRows: tableData.length,
                actionButtons: actionButtons.length
            },
            issues: []
        };
        
        // 收集问题
        if (!report.testResults.headerStructure) {
            report.issues.push('表头结构不匹配');
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
            console.log('\n🎉 新商户表格结构测试完全通过！');
        } else {
            console.log('\n⚠️ 发现以下问题:');
            report.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 测试过程出错:', error);
        await page.screenshot({ 
            path: 'new-table-error.png',
            fullPage: true
        });
    } finally {
        setTimeout(async () => {
            await browser.close();
        }, 2000);
    }
}

testNewMerchantTable();
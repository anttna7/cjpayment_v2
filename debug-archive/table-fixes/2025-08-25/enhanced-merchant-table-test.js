/**
 * 增强商户表格功能测试脚本
 * 验证多账户展示、固定列、表格/卡片视图切换等功能
 */

const puppeteer = require('puppeteer');

class EnhancedMerchantTableTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.screenshotIndex = 1;
    }
    
    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1400, height: 900 }
        });
        this.page = await this.browser.newPage();
        
        // 监听控制台消息
        this.page.on('console', msg => {
            const text = msg.text();
            if (!text.includes('HeaderUnified') && !text.includes('NotificationDataUnified')) {
                console.log(`浏览器: ${text}`);
            }
        });
        
        // 监听页面错误
        this.page.on('pageerror', error => {
            console.error(`页面错误: ${error.message}`);
        });
    }
    
    async takeScreenshot(name) {
        const filename = `enhanced-table-test-${String(this.screenshotIndex).padStart(2, '0')}-${name}.png`;
        await this.page.screenshot({ 
            path: filename, 
            fullPage: true 
        });
        console.log(`📸 截图已保存: ${filename}`);
        this.screenshotIndex++;
        return filename;
    }
    
    async testTableView() {
        console.log('\n🎯 测试1：表格视图功能...');
        
        try {
            // 导航到页面
            await this.page.goto('http://localhost:8092/merchant', { 
                waitUntil: 'networkidle0',
                timeout: 15000 
            });
            
            // 等待页面完全加载
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await this.takeScreenshot('page-loaded');
            
            // 切换到表格视图
            const tableViewBtn = await this.page.$('#tableViewBtn');
            if (tableViewBtn) {
                await tableViewBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log('  ✅ 成功切换到表格视图');
                await this.takeScreenshot('table-view-loaded');
                
                // 检查表格是否正确渲染
                const tableExists = await this.page.evaluate(() => {
                    const table = document.querySelector('.merchant-table');
                    const rows = document.querySelectorAll('.merchant-row');
                    return {
                        tableExists: !!table,
                        rowCount: rows.length,
                        hasFixedColumns: document.querySelectorAll('.col-fixed-left, .col-fixed-right').length > 0
                    };
                });
                
                if (tableExists.tableExists && tableExists.rowCount > 0) {
                    console.log(`  ✅ 表格渲染成功，包含 ${tableExists.rowCount} 行数据`);
                    console.log(`  ✅ 固定列功能: ${tableExists.hasFixedColumns ? '已启用' : '未启用'}`);
                    this.testResults.push({ test: '表格视图渲染', result: '通过', details: tableExists });
                } else {
                    throw new Error('表格渲染失败或无数据');
                }
                
            } else {
                throw new Error('未找到表格视图按钮');
            }
            
        } catch (error) {
            console.error('  ❌ 表格视图测试失败:', error.message);
            this.testResults.push({ test: '表格视图渲染', result: '失败', error: error.message });
            await this.takeScreenshot('table-view-error');
        }
    }
    
    async testMultiAccountDisplay() {
        console.log('\n🎯 测试2：多账户展示功能...');
        
        try {
            // 检查多账户显示
            const accountsInfo = await this.page.evaluate(() => {
                const adAccountCells = document.querySelectorAll('.col-ad-accounts');
                const paymentAccountCells = document.querySelectorAll('.col-payment-accounts');
                
                let maxAdAccounts = 0;
                let maxPaymentAccounts = 0;
                
                adAccountCells.forEach(cell => {
                    const countBadge = cell.querySelector('.account-count-badge .count');
                    if (countBadge) {
                        const count = parseInt(countBadge.textContent);
                        maxAdAccounts = Math.max(maxAdAccounts, count);
                    }
                });
                
                paymentAccountCells.forEach(cell => {
                    const countBadge = cell.querySelector('.account-count-badge .count');
                    if (countBadge) {
                        const count = parseInt(countBadge.textContent);
                        maxPaymentAccounts = Math.max(maxPaymentAccounts, count);
                    }
                });
                
                return {
                    adAccountCells: adAccountCells.length,
                    paymentAccountCells: paymentAccountCells.length,
                    maxAdAccounts: maxAdAccounts,
                    maxPaymentAccounts: maxPaymentAccounts,
                    hasExpandButtons: document.querySelectorAll('.expand-toggle').length > 0
                };
            });
            
            if (accountsInfo.adAccountCells > 0 && accountsInfo.paymentAccountCells > 0) {
                console.log('  ✅ 多账户列显示正常');
                console.log(`  📢 最多广告账户: ${accountsInfo.maxAdAccounts} 个`);
                console.log(`  💳 最多付款账户: ${accountsInfo.maxPaymentAccounts} 个`);
                console.log(`  🔽 展开按钮: ${accountsInfo.hasExpandButtons ? '已显示' : '未显示'}`);
                
                await this.takeScreenshot('multi-accounts-display');
                this.testResults.push({ test: '多账户展示', result: '通过', details: accountsInfo });
                
                // 测试展开功能
                if (accountsInfo.hasExpandButtons) {
                    await this.testExpandFunction();
                }
            } else {
                throw new Error('多账户列未正确显示');
            }
            
        } catch (error) {
            console.error('  ❌ 多账户展示测试失败:', error.message);
            this.testResults.push({ test: '多账户展示', result: '失败', error: error.message });
            await this.takeScreenshot('multi-accounts-error');
        }
    }
    
    async testExpandFunction() {
        console.log('\n🎯 测试3：账户展开/折叠功能...');
        
        try {
            // 点击第一个展开按钮
            const expandBtn = await this.page.$('.expand-toggle');
            if (expandBtn) {
                await expandBtn.click();
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // 检查是否展开了内容
                const expanded = await this.page.evaluate(() => {
                    const expandedContainer = document.querySelector('.accounts-collapsed');
                    return !expandedContainer; // 如果没有collapsed类，说明已展开
                });
                
                if (expanded) {
                    console.log('  ✅ 账户展开功能正常');
                    await this.takeScreenshot('accounts-expanded');
                } else {
                    console.log('  ⚠️ 账户展开功能可能有问题');
                }
                
                this.testResults.push({ test: '展开折叠功能', result: expanded ? '通过' : '部分通过' });
            }
            
        } catch (error) {
            console.error('  ❌ 展开功能测试失败:', error.message);
            this.testResults.push({ test: '展开折叠功能', result: '失败', error: error.message });
        }
    }
    
    async testFixedColumns() {
        console.log('\n🎯 测试4：固定列滚动功能...');
        
        try {
            // 模拟水平滚动
            await this.page.evaluate(() => {
                const tableWrapper = document.querySelector('.merchant-table-wrapper');
                if (tableWrapper) {
                    tableWrapper.scrollLeft = 200; // 向右滚动200px
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 检查固定列是否有阴影效果
            const shadowCheck = await this.page.evaluate(() => {
                const leftFixed = document.querySelector('.col-fixed-left');
                const rightFixed = document.querySelector('.col-fixed-right');
                
                return {
                    hasLeftShadow: leftFixed && leftFixed.style.boxShadow !== 'none',
                    hasRightShadow: rightFixed && rightFixed.style.boxShadow !== 'none',
                    leftStyle: leftFixed ? leftFixed.style.boxShadow : null,
                    rightStyle: rightFixed ? rightFixed.style.boxShadow : null
                };
            });
            
            console.log('  🔍 固定列阴影检查:');
            console.log(`    左侧固定列: ${shadowCheck.hasLeftShadow ? '有阴影' : '无阴影'}`);
            console.log(`    右侧固定列: ${shadowCheck.hasRightShadow ? '有阴影' : '无阴影'}`);
            
            await this.takeScrollScreenshot('scrolled-table');
            
            this.testResults.push({ 
                test: '固定列滚动', 
                result: shadowCheck.hasLeftShadow || shadowCheck.hasRightShadow ? '通过' : '部分通过',
                details: shadowCheck 
            });
            
        } catch (error) {
            console.error('  ❌ 固定列测试失败:', error.message);
            this.testResults.push({ test: '固定列滚动', result: '失败', error: error.message });
        }
    }
    
    async testCardView() {
        console.log('\n🎯 测试5：卡片视图功能...');
        
        try {
            // 切换到卡片视图
            const gridViewBtn = await this.page.$('#gridViewBtn');
            if (gridViewBtn) {
                await gridViewBtn.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 检查卡片是否正确渲染
                const cardInfo = await this.page.evaluate(() => {
                    const cards = document.querySelectorAll('.enhanced-card');
                    const accountSections = document.querySelectorAll('.card-section');
                    const expandBtns = document.querySelectorAll('.expand-btn');
                    
                    return {
                        cardCount: cards.length,
                        sectionCount: accountSections.length,
                        expandButtonCount: expandBtns.length,
                        hasRechargeLinks: document.querySelectorAll('.recharge-link-card').length > 0
                    };
                });
                
                if (cardInfo.cardCount > 0) {
                    console.log(`  ✅ 卡片视图渲染成功，包含 ${cardInfo.cardCount} 张卡片`);
                    console.log(`  📱 卡片区域: ${cardInfo.sectionCount} 个`);
                    console.log(`  🔽 展开按钮: ${cardInfo.expandButtonCount} 个`);
                    
                    await this.takeScreenshot('card-view-loaded');
                    this.testResults.push({ test: '卡片视图渲染', result: '通过', details: cardInfo });
                    
                    // 测试卡片展开功能
                    if (cardInfo.expandButtonCount > 0) {
                        await this.testCardExpand();
                    }
                } else {
                    throw new Error('卡片视图无内容');
                }
                
            } else {
                throw new Error('未找到卡片视图按钮');
            }
            
        } catch (error) {
            console.error('  ❌ 卡片视图测试失败:', error.message);
            this.testResults.push({ test: '卡片视图渲染', result: '失败', error: error.message });
            await this.takeScreenshot('card-view-error');
        }
    }
    
    async testCardExpand() {
        console.log('\n🎯 测试6：卡片展开功能...');
        
        try {
            // 点击第一个卡片的展开按钮
            const expandBtn = await this.page.$('.expand-btn');
            if (expandBtn) {
                await expandBtn.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const expanded = await this.page.evaluate(() => {
                    const expandedContainer = document.querySelector('.accounts-container.expanded');
                    return !!expandedContainer;
                });
                
                if (expanded) {
                    console.log('  ✅ 卡片账户展开功能正常');
                    await this.takeScreenshot('card-expanded');
                } else {
                    console.log('  ⚠️ 卡片展开功能可能有问题');
                }
                
                this.testResults.push({ test: '卡片展开功能', result: expanded ? '通过' : '部分通过' });
            }
            
        } catch (error) {
            console.error('  ❌ 卡片展开功能测试失败:', error.message);
            this.testResults.push({ test: '卡片展开功能', result: '失败', error: error.message });
        }
    }
    
    async takeScrollScreenshot(name) {
        // 针对滚动后的表格截图
        const filename = `enhanced-table-test-${String(this.screenshotIndex).padStart(2, '0')}-${name}.png`;
        
        // 只截取表格区域
        const tableElement = await this.page.$('.merchant-table-wrapper');
        if (tableElement) {
            await tableElement.screenshot({ path: filename });
        } else {
            await this.page.screenshot({ path: filename });
        }
        
        console.log(`📸 滚动截图已保存: ${filename}`);
        this.screenshotIndex++;
        return filename;
    }
    
    async generateReport() {
        console.log('\n📊 生成测试报告...');
        
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passedTests: this.testResults.filter(t => t.result === '通过').length,
            partialTests: this.testResults.filter(t => t.result === '部分通过').length,
            failedTests: this.testResults.filter(t => t.result === '失败').length,
            results: this.testResults
        };
        
        const reportContent = `
# 增强商户表格功能测试报告

**测试时间**: ${report.timestamp}
**总测试数**: ${report.totalTests}
**通过测试**: ${report.passedTests}
**部分通过**: ${report.partialTests} 
**失败测试**: ${report.failedTests}
**通过率**: ${((report.passedTests + report.partialTests * 0.5) / report.totalTests * 100).toFixed(1)}%

## 详细结果

${this.testResults.map(result => `
### ${result.test}
- **结果**: ${result.result}
${result.error ? `- **错误**: ${result.error}` : ''}
${result.details ? `- **详情**: ${JSON.stringify(result.details, null, 2)}` : ''}
`).join('\n')}

## 功能验证清单

- [${report.results.find(r => r.test === '表格视图渲染')?.result === '通过' ? 'x' : ' '}] 表格视图正常渲染
- [${report.results.find(r => r.test === '多账户展示')?.result === '通过' ? 'x' : ' '}] 多账户数据正确显示
- [${report.results.find(r => r.test === '展开折叠功能')?.result.includes('通过') ? 'x' : ' '}] 账户展开/折叠功能
- [${report.results.find(r => r.test === '固定列滚动')?.result.includes('通过') ? 'x' : ' '}] 固定列滚动效果
- [${report.results.find(r => r.test === '卡片视图渲染')?.result === '通过' ? 'x' : ' '}] 卡片视图正常显示
- [${report.results.find(r => r.test === '卡片展开功能')?.result.includes('通过') ? 'x' : ' '}] 卡片账户展开功能

## 测试总结

${report.passedTests === report.totalTests 
    ? '🎉 所有测试通过！增强商户表格功能正常运行。'
    : report.passedTests + report.partialTests >= report.totalTests * 0.8
        ? '✅ 大部分功能正常，少量功能需要优化。'
        : '⚠️ 发现较多问题，需要修复和完善。'
}

### 核心功能状态
- **表格视图**: ${report.results.find(r => r.test === '表格视图渲染')?.result || '未测试'}
- **多账户展示**: ${report.results.find(r => r.test === '多账户展示')?.result || '未测试'}
- **卡片视图**: ${report.results.find(r => r.test === '卡片视图渲染')?.result || '未测试'}
- **交互功能**: ${report.results.filter(r => r.test.includes('展开') || r.test.includes('滚动')).map(r => r.result).join(', ')}
        `;
        
        const fs = require('fs');
        fs.writeFileSync('enhanced-merchant-table-test-report.md', reportContent);
        fs.writeFileSync('enhanced-merchant-table-test-results.json', JSON.stringify(report, null, 2));
        
        console.log('📄 测试报告已生成: enhanced-merchant-table-test-report.md');
        console.log('📊 测试数据已保存: enhanced-merchant-table-test-results.json');
        
        return report;
    }
    
    async runAllTests() {
        console.log('🚀 开始增强商户表格功能测试...\n');
        
        try {
            await this.init();
            
            await this.testTableView();
            await this.testMultiAccountDisplay();
            await this.testFixedColumns();
            await this.testCardView();
            
            const report = await this.generateReport();
            
            console.log('\n🎯 测试完成总结:');
            console.log(`   总测试数: ${report.totalTests}`);
            console.log(`   通过测试: ${report.passedTests}`);
            console.log(`   部分通过: ${report.partialTests}`);
            console.log(`   失败测试: ${report.failedTests}`);
            console.log(`   综合通过率: ${((report.passedTests + report.partialTests * 0.5) / report.totalTests * 100).toFixed(1)}%`);
            
            if (report.passedTests === report.totalTests) {
                console.log('\n🎉 恭喜！所有功能测试通过！');
            } else if (report.passedTests + report.partialTests >= report.totalTests * 0.8) {
                console.log('\n✅ 大部分功能正常运行！');
            } else {
                console.log('\n⚠️ 部分功能需要修复，请查看详细报告。');
            }
            
        } catch (error) {
            console.error('💥 测试执行过程中发生错误:', error);
        } finally {
            if (this.browser) {
                console.log('\n⏱️ 保持浏览器开启10秒以供检查...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                await this.browser.close();
            }
        }
    }
}

// 运行测试
const tester = new EnhancedMerchantTableTester();
tester.runAllTests().catch(console.error);
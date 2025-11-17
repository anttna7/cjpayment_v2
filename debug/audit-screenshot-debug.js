/**
 * 审核页面截图调试脚本
 * 在浏览器控制台运行，分析页面实际显示问题
 */

console.log('📸 审核页面截图调试开始...');

async function auditScreenshotDebug() {
    console.log('🔍 开始页面显示分析...');
    
    // 1. 基础元素检查
    console.log('\n📋 === 基础元素检查 ===');
    const table = document.getElementById('financialAuditTable');
    const tbody = document.getElementById('financialAuditTableBody');
    const tableView = document.getElementById('tableView');
    
    console.log('表格元素:', table ? '✅ 存在' : '❌ 不存在');
    console.log('表体元素:', tbody ? '✅ 存在' : '❌ 不存在');
    console.log('表格视图:', tableView ? '✅ 存在' : '❌ 不存在');
    
    if (table) {
        const rect = table.getBoundingClientRect();
        console.log('表格位置:', rect);
        console.log('表格可见:', rect.width > 0 && rect.height > 0);
    }
    
    if (tbody) {
        console.log('表体行数:', tbody.children.length);
        console.log('表体HTML长度:', tbody.innerHTML.length);
        console.log('表体前100字符:', tbody.innerHTML.substring(0, 100));
    }
    
    // 2. 样式检查
    console.log('\n🎨 === 样式检查 ===');
    if (table) {
        const computedStyle = window.getComputedStyle(table);
        console.log('表格样式:');
        console.log('- display:', computedStyle.display);
        console.log('- visibility:', computedStyle.visibility);
        console.log('- opacity:', computedStyle.opacity);
        console.log('- position:', computedStyle.position);
        console.log('- z-index:', computedStyle.zIndex);
    }
    
    if (tableView) {
        const computedStyle = window.getComputedStyle(tableView);
        console.log('表格视图样式:');
        console.log('- display:', computedStyle.display);
        console.log('- visibility:', computedStyle.visibility);
        console.log('- opacity:', computedStyle.opacity);
    }
    
    // 3. 数据状态检查
    console.log('\n📊 === 数据状态检查 ===');
    console.log('FinancialAuditTable类:', typeof FinancialAuditTable !== 'undefined' ? '✅ 存在' : '❌ 不存在');
    console.log('全局实例:', window.financialAuditTable ? '✅ 存在' : '❌ 不存在');
    
    if (window.financialAuditTable) {
        console.log('实例数据:');
        console.log('- 原始数据:', window.financialAuditTable.originalData?.length || 0);
        console.log('- 当前数据:', window.financialAuditTable.currentData?.length || 0);
        console.log('- 过滤数据:', window.financialAuditTable.filteredData?.length || 0);
        console.log('- 当前视图:', window.financialAuditTable.currentView);
    }
    
    // 4. 检查可能的遮挡元素
    console.log('\n👁️ === 可见性检查 ===');
    if (table) {
        const rect = table.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const elementAtCenter = document.elementFromPoint(centerX, centerY);
        console.log('表格中心点元素:', elementAtCenter?.tagName, elementAtCenter?.className);
        
        // 检查是否被其他元素遮挡
        const isTableVisible = elementAtCenter === table || table.contains(elementAtCenter);
        console.log('表格是否在可见区域:', isTableVisible);
    }
    
    // 5. 强制显示数据（如果表体为空）
    if (tbody && tbody.children.length === 0) {
        console.log('\n🔧 === 强制修复 ===');
        console.log('⚠️ 检测到表体无内容，强制渲染数据...');
        
        const quickData = generateQuickTestData();
        tbody.innerHTML = quickData;
        
        setTimeout(() => {
            console.log('✅ 强制渲染完成，新行数:', tbody.children.length);
            console.log('🎯 请查看页面是否现在显示数据');
        }, 500);
    }
    
    // 6. 生成截图提示
    console.log('\n📸 === 截图建议 ===');
    console.log('请在开发者工具中：');
    console.log('1. 按 F12 打开开发者工具');
    console.log('2. 切换到 Elements 面板');
    console.log('3. 找到 #financialAuditTable 元素');
    console.log('4. 右键该元素选择 "Capture node screenshot"');
    console.log('5. 或使用 Ctrl+Shift+P > Screenshot');
}

function generateQuickTestData() {
    const rows = [];
    const now = new Date();
    
    for (let i = 1; i <= 15; i++) {
        const amount = (Math.random() * 500000 + 10000).toFixed(2);
        const isSuccess = i % 4 !== 0;
        const time = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        
        rows.push(`
            <tr>
                <td class="col-serial">${i}</td>
                <td class="col-order-number">CJP${String(20250101 + i).padStart(8, '0')}</td>
                <td class="col-payment-voucher">PV${Date.now() + i}</td>
                <td class="col-amount">￥${amount}</td>
                <td class="col-payer-account">6222****${String(1000 + i).slice(-4)}</td>
                <td class="col-payer-name">测试商户${i}</td>
                <td class="col-payer-bank">${['中国银行', '工商银行', '建设银行'][i % 3]}</td>
                <td class="col-business-type">${i % 2 === 0 ? '对公' : '对私'}</td>
                <td class="col-receiver-account">6223****${String(2000 + i).slice(-4)}</td>
                <td class="col-receiver-name">收款方${i}</td>
                <td class="col-receiver-bank">${['招商银行', '交通银行', '农业银行'][i % 3]}</td>
                <td class="col-status">
                    <span class="status-badge status-${isSuccess ? 'success' : 'failed'}">
                        ${isSuccess ? '交易成功' : '交易失败'}
                    </span>
                </td>
                <td class="col-created-time">${time}</td>
                <td class="col-payment-time">${isSuccess ? time : '-'}</td>
                <td class="col-actions-cell">
                    <div class="action-buttons">
                        <a href="#" class="action-link action-view">查看详情</a>
                        <a href="#" class="action-link action-approve">已到账</a>
                        <a href="#" class="action-link action-reject">未到账</a>
                    </div>
                </td>
            </tr>
        `);
    }
    
    return rows.join('');
}

// 延迟执行调试
setTimeout(() => {
    auditScreenshotDebug();
}, 3000);

console.log('⏳ 3秒后开始截图调试...');
console.log('💡 手动执行: auditScreenshotDebug()');
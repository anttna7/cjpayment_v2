/**
 * 简化的审核表测试脚本
 * 在浏览器控制台运行，快速定位问题
 */

console.log('🔧 简化审核表测试开始...');

// 延迟执行以确保页面加载
setTimeout(() => {
    console.log('📋 开始基础检查...');
    
    // 1. 检查基础元素
    const table = document.getElementById('financialAuditTable');
    const tbody = document.getElementById('financialAuditTableBody');
    
    console.log('表格元素:', table ? '✅ 存在' : '❌ 不存在');
    console.log('表体元素:', tbody ? '✅ 存在' : '❌ 不存在');
    
    if (tbody) {
        console.log('表体内容长度:', tbody.innerHTML.length);
        console.log('当前行数:', tbody.querySelectorAll('tr').length);
    }
    
    // 2. 检查JS类和实例
    console.log('FinancialAuditTable类:', typeof FinancialAuditTable !== 'undefined' ? '✅ 已定义' : '❌ 未定义');
    console.log('全局实例:', window.financialAuditTable ? '✅ 存在' : '❌ 不存在');
    
    // 3. 强制创建实例和加载数据
    if (typeof FinancialAuditTable !== 'undefined') {
        console.log('🔄 强制创建实例...');
        
        try {
            // 创建或重新创建实例
            window.testAuditTable = new FinancialAuditTable();
            console.log('✅ 测试实例创建成功');
            
            // 等待初始化完成后检查结果
            setTimeout(() => {
                console.log('📊 检查实例状态...');
                console.log('原始数据长度:', window.testAuditTable.originalData?.length || 0);
                console.log('当前数据长度:', window.testAuditTable.currentData?.length || 0);
                
                // 检查表格是否有内容了
                const newRows = tbody?.querySelectorAll('tr:not(.loading-row)').length || 0;
                console.log('表格行数:', newRows);
                
                if (newRows === 0) {
                    console.log('⚠️ 仍无数据，尝试手动生成和渲染...');
                    
                    try {
                        // 手动生成数据
                        const testData = window.testAuditTable.generateMockAuditData();
                        console.log('✅ 手动生成数据成功，条数:', testData.length);
                        
                        // 手动渲染数据
                        window.testAuditTable.renderTableData(testData);
                        console.log('✅ 手动渲染完成');
                        
                        // 再次检查
                        setTimeout(() => {
                            const finalRows = tbody?.querySelectorAll('tr:not(.loading-row)').length || 0;
                            console.log('手动渲染后行数:', finalRows);
                            
                            if (finalRows > 0) {
                                console.log('🎉 问题修复！表格现在有数据了');
                                
                                // 显示前几行数据作为验证
                                const firstRows = tbody.querySelectorAll('tr:not(.loading-row)');
                                for (let i = 0; i < Math.min(3, firstRows.length); i++) {
                                    const cells = firstRows[i].querySelectorAll('td');
                                    console.log(`第${i+1}行:`, Array.from(cells).map(cell => cell.textContent.trim()).slice(0, 5));
                                }
                            } else {
                                console.log('❌ 手动渲染后仍无数据，可能是渲染函数问题');
                                
                                // 直接检查渲染函数
                                if (tbody && testData.length > 0) {
                                    console.log('🔧 尝试直接HTML渲染...');
                                    
                                    // 简单的HTML渲染测试
                                    const testHtml = testData.slice(0, 5).map((row, index) => `
                                        <tr>
                                            <td>${row.serial}</td>
                                            <td>${row.order_number}</td>
                                            <td>${row.payment_voucher}</td>
                                            <td>￥${row.amount}</td>
                                            <td>${row.payer_account_number}</td>
                                            <td>${row.payer_account_name}</td>
                                            <td>${row.payer_bank}</td>
                                            <td>${row.business_type}</td>
                                            <td>${row.receiver_account_number}</td>
                                            <td>${row.receiver_account_name}</td>
                                            <td>${row.receiver_bank}</td>
                                            <td><span class="status-badge status-${row.status === '交易成功' ? 'success' : 'failed'}">${row.status}</span></td>
                                            <td>${row.created_time}</td>
                                            <td>${row.payment_time}</td>
                                            <td class="col-actions-cell">
                                                <a href="#" class="action-link action-view">查看详情</a>
                                                <a href="#" class="action-link action-approve">已到账</a>
                                                <a href="#" class="action-link action-reject">未到账</a>
                                            </td>
                                        </tr>
                                    `).join('');
                                    
                                    tbody.innerHTML = testHtml;
                                    console.log('✅ 直接HTML渲染完成');
                                    
                                    setTimeout(() => {
                                        const htmlRows = tbody.querySelectorAll('tr').length;
                                        console.log('HTML渲染后行数:', htmlRows);
                                        
                                        if (htmlRows > 0) {
                                            console.log('🎉 直接HTML渲染成功！问题可能在renderTableData函数中');
                                        }
                                    }, 100);
                                }
                            }
                        }, 500);
                        
                    } catch (dataError) {
                        console.error('❌ 数据生成或渲染失败:', dataError);
                    }
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ 实例创建失败:', error);
        }
    } else {
        console.log('❌ FinancialAuditTable类未定义，可能JS文件未加载');
        
        // 检查是否有相关的script标签
        const scripts = Array.from(document.querySelectorAll('script'));
        const auditScript = scripts.find(s => s.src && s.src.includes('financial-audit-table.js'));
        console.log('JS文件script标签:', auditScript ? '✅ 存在' : '❌ 不存在');
        
        if (auditScript) {
            console.log('Script src:', auditScript.src);
            console.log('Script loaded:', auditScript.readyState || '未知');
        }
    }
    
}, 2000);

console.log('⏳ 2秒后开始测试...');
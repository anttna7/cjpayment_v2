/**
 * 账户管理页面导出功能
 * 复用财务审核页面的导出模态框样式和交互逻辑
 */

// 模态框管理函数 - 复用数据报表页面的标准函数
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function showExportAccountModal() {
    showModal('exportAccountModal');
}

function closeExportAccountModal() {
    hideModal('exportAccountModal');
}

// 获取当前活跃标签页的数据
function getCurrentTabData() {
    const activeTab = document.querySelector('.tab-nav__item--active');
    const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'payment-accounts';
    
    let tableData = [];
    let dataType = '';
    
    if (tabType === 'payment-accounts') {
        // 获取付款账户数据
        const rows = document.querySelectorAll('#paymentAccountsTableBody tr');
        dataType = '付款账户';
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) { // 跳过加载行
                tableData.push({
                    序号: index + 1,
                    付款账号: cells[1]?.textContent?.trim() || '',
                    账户名称: cells[2]?.textContent?.trim() || '',
                    账户类型: cells[3]?.textContent?.trim() || '',
                    账户机构: cells[4]?.textContent?.trim() || '',
                    所属商户: cells[5]?.textContent?.trim() || '',
                    广告账户ID: cells[6]?.textContent?.trim() || '',
                    广告账户名称: cells[7]?.textContent?.trim() || '',
                    余额信息: cells[8]?.textContent?.trim() || '',
                    状态: cells[9]?.textContent?.trim() || '',
                    创建时间: cells[10]?.textContent?.trim() || '',
                    最后更新: cells[11]?.textContent?.trim() || ''
                });
            }
        });
    } else if (tabType === 'receiving-accounts') {
        // 获取收款账户数据
        const rows = document.querySelectorAll('#receivingAccountsTableBody tr');
        dataType = '收款账户';
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) { // 跳过加载行
                tableData.push({
                    序号: index + 1,
                    账户信息: cells[1]?.textContent?.trim() || '',
                    账户类型: cells[2]?.textContent?.trim() || '',
                    今日收款: cells[3]?.textContent?.trim() || '',
                    本月收款: cells[4]?.textContent?.trim() || '',
                    累计收款: cells[5]?.textContent?.trim() || '',
                    成功率: cells[6]?.textContent?.trim() || '',
                    日限额: cells[7]?.textContent?.trim() || '',
                    单笔限额: cells[8]?.textContent?.trim() || '',
                    状态: cells[9]?.textContent?.trim() || '',
                    轮询组: cells[10]?.textContent?.trim() || '',
                    创建时间: cells[11]?.textContent?.trim() || '',
                    最后使用: cells[12]?.textContent?.trim() || ''
                });
            }
        });
    }
    
    return { data: tableData, type: dataType };
}

// 处理账户导出功能
function handleAccountExport() {
    const formatRadios = document.querySelectorAll('input[name="accountFormat"]');
    const contentCheckboxes = document.querySelectorAll('#exportAccountModal input[type="checkbox"]');
    const rangeRadios = document.querySelectorAll('input[name="accountDataRange"]');
    
    let selectedFormat = 'pdf';
    let selectedContent = [];
    let selectedRange = 'current';
    
    // 获取选择的格式
    formatRadios.forEach(radio => {
        if (radio.checked) {
            selectedFormat = radio.value;
        }
    });
    
    // 获取选择的内容
    contentCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const label = checkbox.closest('label').textContent.trim();
            selectedContent.push(label);
        }
    });
    
    // 获取数据范围
    rangeRadios.forEach(radio => {
        if (radio.checked) {
            selectedRange = radio.value;
        }
    });
    
    console.log('账户导出配置:', {
        format: selectedFormat,
        content: selectedContent,
        range: selectedRange
    });
    
    // 获取当前数据
    const { data: currentData, type: dataType } = getCurrentTabData();
    
    if (!currentData || currentData.length === 0) {
        alert('没有可导出的数据');
        return;
    }
    
    // 显示导出进度
    const exportBtn = document.getElementById('confirmAccountExportBtn');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<span class="btn__icon">⏳</span>正在导出...';
    exportBtn.disabled = true;
    
    // 模拟导出过程
    setTimeout(() => {
        if (selectedFormat === 'excel') {
            exportAccountToExcel(currentData, selectedContent, dataType);
        } else if (selectedFormat === 'csv') {
            exportAccountToCSV(currentData, selectedContent, dataType);
        } else {
            exportAccountToPDF(currentData, selectedContent, dataType);
        }
        
        // 恢复按钮状态
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
        
        // 关闭模态窗口
        closeExportAccountModal();
        
        // 显示成功提示
        alert(`${selectedFormat.toUpperCase()}格式的${dataType}报表正在生成中，请稍后查看下载...`);
    }, 2000);
}

// 导出为Excel格式
function exportAccountToExcel(data, selectedContent, dataType) {
    console.log(`导出Excel格式的${dataType}，数据条数:`, data.length, '包含内容:', selectedContent);
    // 这里可以集成真正的Excel导出库，如SheetJS
}

// 导出为CSV格式
function exportAccountToCSV(data, selectedContent, dataType) {
    console.log(`导出CSV格式的${dataType}，数据条数:`, data.length, '包含内容:', selectedContent);
    
    if (data.length === 0) return;
    
    // 构建CSV内容
    const firstItem = data[0];
    const headers = Object.keys(firstItem);
    const csvContent = [headers.join(',')];
    
    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header] || '';
            // 处理包含逗号的值
            if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvContent.push(row.join(','));
    });
    
    // 创建下载链接
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataType}数据_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 导出为PDF格式
function exportAccountToPDF(data, selectedContent, dataType) {
    console.log(`导出PDF格式的${dataType}，数据条数:`, data.length, '包含内容:', selectedContent);
    // 这里可以集成PDF生成库，如jsPDF
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定付款账户导出按钮事件
    const exportPaymentBtn = document.getElementById('exportPaymentAccountsBtn');
    if (exportPaymentBtn) {
        exportPaymentBtn.addEventListener('click', function() {
            // 确保当前是付款账户标签页
            const paymentTab = document.getElementById('paymentAccountsTab');
            if (paymentTab && !paymentTab.classList.contains('tab-nav__item--active')) {
                paymentTab.click();
                setTimeout(() => {
                    showExportAccountModal();
                }, 300);
            } else {
                showExportAccountModal();
            }
        });
    }
    
    // 绑定收款账户导出按钮事件
    const exportReceivingBtn = document.getElementById('exportReceivingAccountsBtn');
    if (exportReceivingBtn) {
        exportReceivingBtn.addEventListener('click', function() {
            // 确保当前是收款账户标签页
            const receivingTab = document.getElementById('receivingAccountsTab');
            if (receivingTab && !receivingTab.classList.contains('tab-nav__item--active')) {
                receivingTab.click();
                setTimeout(() => {
                    showExportAccountModal();
                }, 300);
            } else {
                showExportAccountModal();
            }
        });
    }
    
    // 绑定确认导出按钮事件
    const confirmExportBtn = document.getElementById('confirmAccountExportBtn');
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', handleAccountExport);
    }
    
    // 绑定模态窗口关闭事件 - 与数据报表页面保持一致
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-enhanced')) {
            const modalId = e.target.id;
            hideModal(modalId);
        }
    });
    
    // 绑定关闭按钮事件 - 与数据报表页面保持一致
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-enhanced');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    console.log('账户管理页面导出功能已初始化');
});
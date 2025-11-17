/**
 * 数据报表页面高级数据表导出功能
 * 复用财务审核页面的导出模态框样式和交互逻辑
 */

// 高级数据表导出模态框管理函数
function showExportAdvancedTableModal() {
    showModal('exportAdvancedTableModal');
}

function closeExportAdvancedTableModal() {
    hideModal('exportAdvancedTableModal');
}

// 获取高级数据表的数据
function getAdvancedTableData() {
    const tableBody = document.getElementById('advancedDataTableBody');
    if (!tableBody) return [];
    
    const rows = tableBody.querySelectorAll('tr:not(.loading-row)');
    const tableData = [];
    
    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 1) { // 确保不是加载行
            tableData.push({
                序号: index + 1,
                订单号: cells[1]?.textContent?.trim() || '',
                银行凭证号: cells[2]?.textContent?.trim() || '',
                交易金额: cells[3]?.textContent?.trim() || '',
                商户名称: cells[4]?.textContent?.trim() || '',
                付款账户名称: cells[5]?.textContent?.trim() || '',
                付款账号: cells[6]?.textContent?.trim() || '',
                收款账户名称: cells[7]?.textContent?.trim() || '',
                收款账号: cells[8]?.textContent?.trim() || '',
                业务类别: cells[9]?.textContent?.trim() || '',
                状态: cells[10]?.textContent?.trim() || '',
                创建时间: cells[11]?.textContent?.trim() || '',
                成功时间: cells[12]?.textContent?.trim() || '',
                审核: cells[13]?.textContent?.trim() || ''
            });
        }
    });
    
    return tableData;
}

// 处理高级数据表导出功能
function handleAdvancedTableExport() {
    const formatRadios = document.querySelectorAll('input[name="advancedTableFormat"]');
    const contentCheckboxes = document.querySelectorAll('#exportAdvancedTableModal input[type="checkbox"]');
    const rangeRadios = document.querySelectorAll('input[name="advancedTableDataRange"]');
    
    let selectedFormat = 'pdf';
    let selectedContent = [];
    let selectedRange = 'filtered';
    
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
    
    console.log('高级数据表导出配置:', {
        format: selectedFormat,
        content: selectedContent,
        range: selectedRange
    });
    
    // 获取当前数据
    let currentData = getAdvancedTableData();
    
    // 如果选择所有数据，可以调用API获取更多数据
    if (selectedRange === 'all' && window.advancedTable && typeof window.advancedTable.getAllData === 'function') {
        currentData = window.advancedTable.getAllData();
    }
    
    if (!currentData || currentData.length === 0) {
        alert('没有可导出的订单数据');
        return;
    }
    
    // 显示导出进度
    const exportBtn = document.getElementById('confirmAdvancedTableExportBtn');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<span class="btn__icon">⏳</span>正在导出...';
    exportBtn.disabled = true;
    
    // 模拟导出过程
    setTimeout(() => {
        if (selectedFormat === 'excel') {
            exportAdvancedTableToExcel(currentData, selectedContent);
        } else if (selectedFormat === 'csv') {
            exportAdvancedTableToCSV(currentData, selectedContent);
        } else {
            exportAdvancedTableToPDF(currentData, selectedContent);
        }
        
        // 恢复按钮状态
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
        
        // 关闭模态窗口
        closeExportAdvancedTableModal();
        
        // 显示成功提示
        alert(`${selectedFormat.toUpperCase()}格式的订单数据报表正在生成中，请稍后查看下载...`);
    }, 2000);
}

// 导出为Excel格式
function exportAdvancedTableToExcel(data, selectedContent) {
    console.log('导出Excel格式的订单数据，数据条数:', data.length, '包含内容:', selectedContent);
    // 这里可以集成真正的Excel导出库，如SheetJS
}

// 导出为CSV格式
function exportAdvancedTableToCSV(data, selectedContent) {
    console.log('导出CSV格式的订单数据，数据条数:', data.length, '包含内容:', selectedContent);
    
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
    link.setAttribute('download', `订单数据报表_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 导出为PDF格式
function exportAdvancedTableToPDF(data, selectedContent) {
    console.log('导出PDF格式的订单数据，数据条数:', data.length, '包含内容:', selectedContent);
    // 这里可以集成PDF生成库，如jsPDF
}

// 页面加载完成后初始化高级数据表导出功能
document.addEventListener('DOMContentLoaded', function() {
    // 绑定高级数据表导出按钮事件
    const exportAdvancedTableBtn = document.getElementById('exportAdvancedTableBtn');
    if (exportAdvancedTableBtn) {
        exportAdvancedTableBtn.addEventListener('click', showExportAdvancedTableModal);
    }
    
    // 绑定确认导出按钮事件
    const confirmAdvancedTableExportBtn = document.getElementById('confirmAdvancedTableExportBtn');
    if (confirmAdvancedTableExportBtn) {
        confirmAdvancedTableExportBtn.addEventListener('click', handleAdvancedTableExport);
    }
    
    console.log('数据报表页面高级数据表导出功能已初始化');
});
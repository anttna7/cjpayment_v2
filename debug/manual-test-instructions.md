# 高级数据表15列结构测试指南

## 测试步骤

### 1. 访问数据报表页面
在浏览器中打开：`http://127.0.0.1:8091/reports`

### 2. 等待页面完全加载
确保看到"📊 高级数据表"标题和表格内容

### 3. 在浏览器控制台中执行测试脚本

#### 方法一：使用完整测试脚本
打开浏览器开发者工具（F12），在控制台(Console)标签中复制粘贴以下脚本：

```javascript
/**
 * 高级数据表15列结构验证脚本
 */

console.log('🔍 开始验证高级数据表15列结构...');

function verifyAdvancedDataTable() {
    console.log('📊 高级数据表结构验证开始...');
    
    // 1. 检查页面标题
    console.log('📝 页面标题:', document.title);
    console.log('🌐 当前URL:', window.location.href);
    
    // 2. 查找高级数据表
    const table = document.querySelector('#advancedDataTable');
    if (!table) {
        console.error('❌ 未找到高级数据表 #advancedDataTable');
        return false;
    }
    
    console.log('✅ 找到高级数据表');
    
    // 3. 验证表头15列结构
    const headers = table.querySelectorAll('thead th');
    console.log(`📊 表头列数: ${headers.length}`);
    
    const expectedColumns = [
        '序号',
        '订单号', 
        '付款凭证',
        '付款金额',
        '付款账号',
        '付款账户名称',
        '付款账户机构',
        '付款类型',
        '收款账号',
        '收款账户名称', 
        '收款账户机构',
        '订单状态',
        '创建时间',
        '付款时间',
        '审核状态'
    ];
    
    console.log('📋 验证表头内容:');
    let headerMatch = true;
    
    headers.forEach((header, index) => {
        const text = header.textContent.trim();
        const expected = expectedColumns[index] || '未定义';
        const isMatch = text.includes(expected) || expected.includes(text);
        
        if (!isMatch) headerMatch = false;
        
        console.log(`第${index + 1}列: "${text}" ${isMatch ? '✅' : '❌'} (期望: "${expected}")`);
    });
    
    if (headers.length === 15 && headerMatch) {
        console.log('✅ 表头15列结构验证通过');
    } else {
        console.warn(`⚠️ 表头验证失败 - 列数: ${headers.length}/15, 内容匹配: ${headerMatch}`);
    }
    
    // 4. 检查表格数据
    const tbody = table.querySelector('tbody');
    const dataRows = tbody ? tbody.querySelectorAll('tr:not(.loading-row)') : [];
    
    console.log(`📊 数据行数: ${dataRows.length}`);
    
    if (dataRows.length > 0) {
        const firstRow = dataRows[0];
        const cells = firstRow.querySelectorAll('td');
        
        console.log(`📝 第一行数据列数: ${cells.length}`);
        
        // 检查审核状态列（第15列）
        if (cells.length >= 15) {
            const auditCell = cells[14]; // 第15列（索引14）
            const auditText = auditCell ? auditCell.textContent.trim() : '';
            const hasStatusBadge = auditCell ? auditCell.querySelector('.audit-badge, .status-badge') : null;
            
            console.log(`📋 审核状态内容: "${auditText}"`);
            console.log(`🏷️ 状态徽章: ${hasStatusBadge ? '有' : '无'}`);
            
            const validStatuses = ['已到账', '未到账', '未审核'];
            const hasValidStatus = validStatuses.some(status => auditText.includes(status));
            
            if (hasValidStatus) {
                console.log('✅ 审核状态格式正确');
            } else {
                console.warn('⚠️ 审核状态格式异常');
            }
        }
        
        // 显示前几列的数据示例
        console.log('📋 数据示例:');
        cells.forEach((cell, index) => {
            if (index < 5) { // 只显示前5列
                const content = cell.textContent.trim().substring(0, 20);
                console.log(`  ${expectedColumns[index]}: "${content}${content.length === 20 ? '...' : ''}"`);
            }
        });
        
    } else {
        console.warn('⚠️ 表格暂无数据行');
        
        // 尝试触发数据加载
        if (window.advancedDataTable && typeof window.advancedDataTable.loadData === 'function') {
            console.log('🔄 尝试加载数据...');
            window.advancedDataTable.loadData();
        }
    }
    
    // 5. 检查表格样式和交互功能
    const tableStyle = window.getComputedStyle(table);
    console.log('🎨 表格显示状态:', tableStyle.display);
    console.log('📏 表格宽度:', table.offsetWidth + 'px');
    
    // 6. 检查可复制和可展开功能
    const copyableCells = table.querySelectorAll('[data-copyable="true"], .copyable-cell');
    const expandableCells = table.querySelectorAll('[data-expandable="true"], .expandable-cell');
    
    console.log(`📋 可复制单元格: ${copyableCells.length}个`);
    console.log(`📖 可展开单元格: ${expandableCells.length}个`);
    
    // 7. 生成验证报告
    const report = {
        timestamp: new Date().toLocaleString('zh-CN'),
        tableFound: !!table,
        headerCount: headers.length,
        headerMatch: headerMatch,
        dataRows: dataRows.length,
        interactiveFeatures: {
            copyable: copyableCells.length,
            expandable: expandableCells.length
        },
        status: (headers.length === 15 && headerMatch) ? '通过' : '失败'
    };
    
    console.log('📊 验证报告:', report);
    
    return report;
}

// 执行验证
verifyAdvancedDataTable();
```

#### 方法二：使用简化版测试
如果上面的脚本太长，可以使用这个简化版本：

```javascript
// 简化验证脚本
const table = document.querySelector('#advancedDataTable');
const headers = table ? table.querySelectorAll('thead th') : [];

console.log('📊 表格状态:', table ? '找到' : '未找到');
console.log('📊 表头列数:', headers.length);

if (headers.length === 15) {
    console.log('✅ 15列结构正确');
    headers.forEach((h, i) => console.log(`第${i+1}列: ${h.textContent.trim()}`));
} else {
    console.log('❌ 列数不正确，期望15列');
}

const rows = table ? table.querySelectorAll('tbody tr:not(.loading-row)') : [];
console.log('📊 数据行数:', rows.length);

// 检查审核状态列
if (rows.length > 0) {
    const firstRowCells = rows[0].querySelectorAll('td');
    if (firstRowCells.length >= 15) {
        const auditCell = firstRowCells[14];
        console.log('📋 审核状态列:', auditCell.textContent.trim());
    }
}
```

### 4. 截图要求

请在测试过程中截取以下4张截图：

1. **页面整体布局截图** - 显示完整的数据报表页面
2. **表头结构截图** - 聚焦表格表头，清楚显示15列标题
3. **表格数据截图** - 显示表格数据内容，特别是审核状态列
4. **控制台结果截图** - 显示测试脚本在控制台的执行结果

### 5. 验证重点

- ✅ 确认表头显示15列完整结构
- ✅ 确认最后一列"审核状态"内容正确显示
- ✅ 确认表格数据正常渲染
- ✅ 确认交互功能（复制、展开等）工作正常
- ✅ 确认控制台测试脚本执行无错误

### 6. 问题排查

如果遇到问题：

1. **表格未显示** - 检查页面是否完全加载，等待几秒再测试
2. **数据未加载** - 在控制台执行 `window.advancedDataTable?.loadData?.()`
3. **列数不对** - 检查CSS样式是否正确加载
4. **脚本报错** - 确保在正确的页面执行脚本

### 7. 预期结果

✅ **测试通过的标准：**
- 表头显示15列，内容匹配预期
- 审核状态列显示"已到账、未到账、未审核"等状态
- 表格数据正常显示
- 控制台输出"✅ 表头15列结构验证通过"
- 验证报告状态为"通过"

执行测试后，请提供截图和控制台输出结果。
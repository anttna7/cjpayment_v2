// 快速脚本找到高级筛选面板的结束位置
const fs = require('fs');
const path = '/Users/c/Desktop/labs/cjpay/cjpayment/web/templates/report.html';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let inFilterPanel = false;
let divDepth = 0;
let startLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('id="advancedFiltersPanel"')) {
        inFilterPanel = true;
        startLine = i + 1;
        divDepth = 1;
        console.log(`Found start at line ${startLine}: ${line.substring(0, 80)}...`);
        continue;
    }
    
    if (inFilterPanel) {
        // 计算div层级
        const openDivs = (line.match(/<div[^>]*>/g) || []).length;
        const closeDivs = (line.match(/<\/div>/g) || []).length;
        
        divDepth += openDivs - closeDivs;
        
        if (divDepth <= 0) {
            console.log(`Found end at line ${i + 1}: ${line.substring(0, 80)}...`);
            console.log(`Filter panel spans from line ${startLine} to line ${i + 1}`);
            break;
        }
        
        // 显示一些关键行
        if (line.includes('</div>') && divDepth <= 2) {
            console.log(`Line ${i + 1} (depth ${divDepth}): ${line.substring(0, 80)}...`);
        }
    }
}
/**
 * 调试商户模态框布局问题
 * 重点检查：行业信息残留、备注位置、按钮位置
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugModalLayoutIssues() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: false,
        defaultViewport: { width: 1440, height: 900 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 开始调试模态框布局问题');
        
        await page.goto('http://127.0.0.1:8091/merchant', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('1. 打开模态框并检查结构...');
        
        await page.click('#addMerchant');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 截图记录模态框完整状态
        await page.screenshot({ 
            path: 'modal-debug-01-full-modal.png',
            fullPage: true
        });
        
        console.log('2. 检查是否还有行业相关内容...');
        
        // 搜索所有包含"行业"的文本
        const industryElements = await page.evaluate(() => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const results = [];
            let node;
            
            while (node = walker.nextNode()) {
                if (node.nodeValue.includes('行业') || node.nodeValue.includes('Industry')) {
                    results.push({
                        text: node.nodeValue.trim(),
                        parentTag: node.parentElement.tagName,
                        parentId: node.parentElement.id,
                        parentClass: node.parentElement.className
                    });
                }
            }
            
            return results;
        });
        
        console.log('发现包含"行业"的元素:', industryElements);
        
        // 检查是否有行业相关的select元素
        const industrySelects = await page.$$eval('select', selects => 
            selects.map(select => ({
                id: select.id,
                name: select.name,
                hasIndustryOption: Array.from(select.options).some(opt => 
                    opt.text.includes('行业') || opt.value.includes('industry')
                )
            })).filter(item => item.hasIndustryOption || item.id.includes('industry') || item.name.includes('industry'))
        );
        
        console.log('发现行业相关的select元素:', industrySelects);
        
        console.log('3. 检查备注信息的位置...');
        
        // 检查备注信息的位置和父元素结构
        const remarksInfo = await page.evaluate(() => {
            const remarksField = document.getElementById('remarks');
            if (!remarksField) return null;
            
            const parentSection = remarksField.closest('.form-section');
            const allSections = Array.from(document.querySelectorAll('.form-section'));
            const sectionIndex = allSections.indexOf(parentSection);
            
            return {
                exists: true,
                sectionIndex: sectionIndex,
                totalSections: allSections.length,
                sectionTitle: parentSection ? parentSection.querySelector('h3')?.textContent : null,
                position: remarksField.getBoundingClientRect()
            };
        });
        
        console.log('备注信息位置分析:', remarksInfo);
        
        console.log('4. 检查按钮的位置...');
        
        // 检查取消和保存按钮的位置
        const buttonsInfo = await page.evaluate(() => {
            const modalActions = document.querySelector('.modal-actions, .modal-footer, .form-actions');
            const cancelBtn = document.querySelector('[type="button"]:not([id]), button:contains("取消"), .btn-cancel');
            const saveBtn = document.querySelector('[type="submit"], button:contains("保存"), .btn-save, .btn-primary');
            
            const getElementInfo = (element) => {
                if (!element) return null;
                const rect = element.getBoundingClientRect();
                return {
                    text: element.textContent.trim(),
                    position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    parentClass: element.parentElement?.className,
                    parentId: element.parentElement?.id
                };
            };
            
            return {
                modalActions: modalActions ? {
                    exists: true,
                    className: modalActions.className,
                    position: modalActions.getBoundingClientRect()
                } : null,
                cancelButton: getElementInfo(cancelBtn),
                saveButton: getElementInfo(saveBtn)
            };
        });
        
        console.log('按钮位置分析:', buttonsInfo);
        
        console.log('5. 检查模态框的整体HTML结构...');
        
        // 获取模态框的完整结构
        const modalStructure = await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            if (!modal) return null;
            
            const getSectionInfo = (section) => ({
                title: section.querySelector('h3, .form-section-title')?.textContent?.trim(),
                className: section.className,
                fieldsCount: section.querySelectorAll('.form-group').length
            });
            
            return {
                sections: Array.from(modal.querySelectorAll('.form-section')).map(getSectionInfo),
                totalFormGroups: modal.querySelectorAll('.form-group').length,
                hasModalFooter: !!modal.querySelector('.modal-footer, .modal-actions'),
                modalClasses: modal.className
            };
        });
        
        console.log('模态框结构分析:', JSON.stringify(modalStructure, null, 2));
        
        console.log('6. 滚动并检查模态框底部...');
        
        // 滚动到模态框底部查看按钮区域
        await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            if (modal) {
                modal.scrollTop = modal.scrollHeight;
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 截图模态框底部
        await page.screenshot({ 
            path: 'modal-debug-02-bottom-section.png',
            fullPage: true
        });
        
        console.log('7. 生成详细的DOM结构报告...');
        
        // 生成详细的DOM结构信息
        const detailedStructure = await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            if (!modal) return null;
            
            const analyzeElement = (element, level = 0) => {
                const children = Array.from(element.children);
                return {
                    tag: element.tagName,
                    id: element.id,
                    className: element.className,
                    textContent: element.textContent?.slice(0, 100) + (element.textContent?.length > 100 ? '...' : ''),
                    level: level,
                    children: children.map(child => analyzeElement(child, level + 1))
                };
            };
            
            return analyzeElement(modal);
        });
        
        // 保存结构分析到文件
        fs.writeFileSync('modal-structure-analysis.json', JSON.stringify(detailedStructure, null, 2));
        
        console.log('✅ 调试分析完成');
        console.log('📄 详细结构已保存到: modal-structure-analysis.json');
        
        // 生成问题报告
        const issueReport = {
            timestamp: new Date().toISOString(),
            issues: {
                industryContent: {
                    found: industryElements.length > 0 || industrySelects.length > 0,
                    details: { industryElements, industrySelects }
                },
                remarksPosition: {
                    isAtBottom: remarksInfo?.sectionIndex === remarksInfo?.totalSections - 1,
                    currentSection: remarksInfo?.sectionIndex,
                    details: remarksInfo
                },
                buttonPosition: {
                    inCorrectPosition: buttonsInfo?.modalActions?.exists,
                    details: buttonsInfo
                }
            },
            recommendations: [
                industryElements.length > 0 ? "需要清理残留的行业信息内容" : "行业信息已清理完成",
                !remarksInfo || remarksInfo.sectionIndex !== remarksInfo.totalSections - 1 ? "需要将备注信息移到底部" : "备注位置正确",
                !buttonsInfo?.modalActions?.exists ? "需要修复按钮位置到模态框底部" : "按钮位置正确"
            ]
        };
        
        console.log('\n📋 问题分析报告:');
        console.log(JSON.stringify(issueReport, null, 2));
        
        fs.writeFileSync('modal-issues-report.json', JSON.stringify(issueReport, null, 2));
        
    } catch (error) {
        console.error('❌ 调试过程错误:', error);
        await page.screenshot({ 
            path: 'modal-debug-error.png',
            fullPage: true
        });
    } finally {
        setTimeout(async () => {
            await browser.close();
        }, 2000);
    }
}

debugModalLayoutIssues();
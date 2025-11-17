/**
 * 最终布局验证测试
 * 验证：行业信息清理、备注位置、按钮位置
 */

const puppeteer = require('puppeteer');

async function finalLayoutVerification() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: false,
        defaultViewport: { width: 1440, height: 900 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🎯 最终布局验证开始');
        
        await page.goto('http://127.0.0.1:8091/merchant', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 截图记录初始状态
        await page.screenshot({ 
            path: 'layout-verification-01-initial.png',
            fullPage: true
        });
        
        console.log('1. 打开模态框...');
        await page.click('#addMerchant');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 截图记录模态框打开状态
        await page.screenshot({ 
            path: 'layout-verification-02-modal-opened.png',
            fullPage: true
        });
        
        console.log('2. 检查行业信息是否完全清理...');
        
        // 检查所有包含"行业"的元素
        const industryCheck = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const industryElements = [];
            
            allElements.forEach(el => {
                if (el.textContent && el.textContent.includes('行业')) {
                    industryElements.push({
                        tag: el.tagName,
                        id: el.id,
                        className: el.className,
                        textContent: el.textContent.trim().substring(0, 100)
                    });
                }
            });
            
            // 检查是否还有行业相关的select选项
            const selects = document.querySelectorAll('select');
            const industryOptions = [];
            
            selects.forEach(select => {
                Array.from(select.options).forEach(option => {
                    if (option.textContent.includes('行业')) {
                        industryOptions.push({
                            selectId: select.id,
                            optionText: option.textContent,
                            optionValue: option.value
                        });
                    }
                });
            });
            
            return { industryElements, industryOptions };
        });
        
        console.log('行业信息检查结果:');
        console.log('- 包含行业的元素数量:', industryCheck.industryElements.length);
        console.log('- 包含行业的选项数量:', industryCheck.industryOptions.length);
        
        if (industryCheck.industryElements.length === 0 && industryCheck.industryOptions.length === 0) {
            console.log('✅ 行业信息已完全清理');
        } else {
            console.log('❌ 仍有残留的行业信息:');
            console.log(JSON.stringify(industryCheck, null, 2));
        }
        
        console.log('3. 检查form sections结构...');
        
        const sectionsCheck = await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            if (!modal) return null;
            
            const sections = Array.from(modal.querySelectorAll('.form-section'));
            return sections.map((section, index) => {
                const title = section.querySelector('h3, .form-section-title');
                return {
                    index,
                    title: title ? title.textContent.trim() : 'No title',
                    fieldsCount: section.querySelectorAll('.form-group').length
                };
            });
        });
        
        console.log('Form sections结构:');
        sectionsCheck?.forEach(section => {
            console.log(`  ${section.index}. ${section.title} (${section.fieldsCount} fields)`);
        });
        
        console.log('4. 检查备注信息位置...');
        
        const remarksPosition = await page.evaluate(() => {
            const remarksField = document.getElementById('remarks');
            if (!remarksField) return { exists: false };
            
            const modal = document.getElementById('addMerchantModal');
            const allSections = Array.from(modal.querySelectorAll('.form-section'));
            const allFormGroups = Array.from(modal.querySelectorAll('.form-group'));
            
            // 找到备注字段在所有form-group中的位置
            const remarksGroup = remarksField.closest('.form-group');
            const remarksIndex = allFormGroups.indexOf(remarksGroup);
            
            return {
                exists: true,
                isLastField: remarksIndex === allFormGroups.length - 1,
                currentIndex: remarksIndex,
                totalFields: allFormGroups.length,
                parentSection: remarksGroup.closest('.form-section')?.querySelector('h3')?.textContent?.trim()
            };
        });
        
        console.log('备注信息位置分析:');
        console.log('- 存在:', remarksPosition.exists);
        console.log('- 是否为最后一个字段:', remarksPosition.isLastField);
        console.log('- 当前位置:', remarksPosition.currentIndex + 1, '/', remarksPosition.totalFields);
        console.log('- 所在区域:', remarksPosition.parentSection);
        
        if (remarksPosition.isLastField) {
            console.log('✅ 备注信息位置正确（在底部）');
        } else {
            console.log('❌ 备注信息位置错误（不在底部）');
        }
        
        console.log('5. 检查按钮位置...');
        
        const buttonsCheck = await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            if (!modal) return null;
            
            const modalFooter = modal.querySelector('.modal-footer');
            const cancelBtn = modal.querySelector('#cancelAddMerchant');
            const saveBtn = modal.querySelector('#submitAddMerchant');
            
            return {
                hasModalFooter: !!modalFooter,
                footerPosition: modalFooter ? modalFooter.getBoundingClientRect() : null,
                cancelBtnExists: !!cancelBtn,
                saveBtnExists: !!saveBtn,
                buttonsInFooter: modalFooter && cancelBtn && modalFooter.contains(cancelBtn)
            };
        });
        
        console.log('按钮位置分析:');
        console.log('- 存在modal-footer:', buttonsCheck.hasModalFooter);
        console.log('- 取消按钮存在:', buttonsCheck.cancelBtnExists);
        console.log('- 保存按钮存在:', buttonsCheck.saveBtnExists);
        console.log('- 按钮在footer中:', buttonsCheck.buttonsInFooter);
        
        if (buttonsCheck.hasModalFooter && buttonsCheck.buttonsInFooter) {
            console.log('✅ 按钮位置正确（在modal footer）');
        } else {
            console.log('❌ 按钮位置错误');
        }
        
        console.log('6. 滚动到模态框底部验证...');
        
        // 滚动到底部
        await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            if (modal) {
                const modalBody = modal.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.scrollTop = modalBody.scrollHeight;
                }
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 截图模态框底部
        await page.screenshot({ 
            path: 'layout-verification-03-modal-bottom.png',
            fullPage: true
        });
        
        console.log('7. 测试表单功能...');
        
        // 快速测试主要功能
        await page.type('#accountId', 'TEST_LAYOUT_001');
        await page.type('#accountEntity', '布局验证测试公司');
        await page.type('#agentId', 'AGENT001');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 最终完整截图
        await page.screenshot({ 
            path: 'layout-verification-04-final.png',
            fullPage: true
        });
        
        // 生成验证报告
        const report = {
            timestamp: new Date().toISOString(),
            verification: {
                industryContentCleaned: industryCheck.industryElements.length === 0 && industryCheck.industryOptions.length === 0,
                remarksAtBottom: remarksPosition.isLastField,
                buttonsInCorrectPosition: buttonsCheck.hasModalFooter && buttonsCheck.buttonsInFooter,
                sectionsCount: sectionsCheck?.length || 0,
                totalFields: remarksPosition.totalFields || 0
            },
            issues: [],
            summary: 'Layout verification completed'
        };
        
        // 收集问题
        if (!report.verification.industryContentCleaned) {
            report.issues.push('行业信息未完全清理');
        }
        if (!report.verification.remarksAtBottom) {
            report.issues.push('备注信息不在底部');
        }
        if (!report.verification.buttonsInCorrectPosition) {
            report.issues.push('按钮位置不正确');
        }
        
        console.log('\n📊 最终验证报告:');
        console.log(JSON.stringify(report, null, 2));
        
        if (report.issues.length === 0) {
            console.log('\n🎉 所有布局问题已修复完成！');
        } else {
            console.log('\n⚠️ 还有以下问题需要解决:');
            report.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }
        
    } catch (error) {
        console.error('❌ 验证过程出错:', error);
        await page.screenshot({ 
            path: 'layout-verification-error.png',
            fullPage: true
        });
    } finally {
        setTimeout(async () => {
            await browser.close();
        }, 2000);
    }
}

finalLayoutVerification();
/**
 * User Menu颜色一致性测试
 * 验证不同页面的user-menu头像颜色是否统一
 */

const puppeteer = require('puppeteer');

async function testUserMenuConsistency() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 300,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const results = {
        pages: [],
        consistent: true,
        baselineColor: null
    };
    
    const pagesToTest = [
        { name: '仪表板', url: 'http://localhost:8091/dashboard' },
        { name: '商户管理', url: 'http://localhost:8091/merchant' },
        { name: '账户管理', url: 'http://localhost:8091/accounts' },
        { name: '财务审核', url: 'http://localhost:8091/audit' },
        { name: '数据报表', url: 'http://localhost:8091/reports' }
    ];
    
    try {
        console.log('🔍 测试User Menu颜色一致性...\n');
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1400, height: 900 });
        
        for (const [index, testPage] of pagesToTest.entries()) {
            console.log(`📄 测试页面: ${testPage.name}`);
            
            try {
                await page.goto(testPage.url, { waitUntil: 'networkidle2' });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 获取user-menu头像的样式
                const avatarInfo = await page.evaluate(() => {
                    const avatar = document.querySelector('.user-menu__avatar');
                    if (!avatar) {
                        return { error: 'user-menu__avatar 元素未找到' };
                    }
                    
                    const styles = window.getComputedStyle(avatar);
                    return {
                        background: styles.background,
                        backgroundColor: styles.backgroundColor,
                        backgroundImage: styles.backgroundImage,
                        // 提取RGB值用于比较
                        backgroundImageValue: styles.backgroundImage
                    };
                });
                
                if (avatarInfo.error) {
                    console.log(`   ❌ ${avatarInfo.error}`);
                    results.pages.push({
                        name: testPage.name,
                        url: testPage.url,
                        error: avatarInfo.error
                    });
                    continue;
                }
                
                // 设置基准颜色（第一个成功的页面）
                if (!results.baselineColor) {
                    results.baselineColor = avatarInfo.backgroundImage;
                }
                
                // 比较颜色 - 提取RGB值进行比较而非字符串比较
                const extractColors = (gradient) => {
                    const rgbMatches = gradient.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/g);
                    return rgbMatches ? rgbMatches.map(rgb => {
                        const values = rgb.match(/\d+/g);
                        return `${values[0]},${values[1]},${values[2]}`;
                    }).sort() : [];
                };
                
                const baselineColors = extractColors(results.baselineColor);
                const currentColors = extractColors(avatarInfo.backgroundImage);
                const colorMatch = JSON.stringify(baselineColors) === JSON.stringify(currentColors);
                
                results.pages.push({
                    name: testPage.name,
                    url: testPage.url,
                    background: avatarInfo.backgroundImage,
                    colorMatch: colorMatch
                });
                
                if (!colorMatch) {
                    results.consistent = false;
                }
                
                console.log(`   背景: ${avatarInfo.backgroundImage.substring(0, 60)}...`);
                console.log(`   一致性: ${colorMatch ? '✓' : '✗'}`);
                
                // 截图记录
                await page.screenshot({ 
                    path: `debug/user-menu-${testPage.name.replace(/[^a-zA-Z0-9]/g, '')}.png`,
                    clip: { x: 1200, y: 50, width: 200, height: 100 }
                });
                
            } catch (error) {
                console.log(`   ❌ 页面加载失败: ${error.message}`);
                results.pages.push({
                    name: testPage.name,
                    url: testPage.url,
                    error: error.message
                });
            }
            
            console.log('');
        }
        
        // 生成报告
        console.log('📊 测试结果汇总:');
        console.log(`• 总页面数: ${pagesToTest.length}`);
        console.log(`• 成功测试: ${results.pages.filter(p => !p.error).length}`);
        console.log(`• 颜色一致性: ${results.consistent ? '✓ 通过' : '✗ 失败'}`);
        
        if (!results.consistent) {
            console.log('\n⚠️ 发现颜色不一致的页面:');
            results.pages.filter(p => p.colorMatch === false).forEach(page => {
                console.log(`   - ${page.name}: ${page.background.substring(0, 50)}...`);
            });
        }
        
        return results.consistent;
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error);
        return false;
    } finally {
        await browser.close();
    }
}

// 执行测试
testUserMenuConsistency().then(success => {
    if (success) {
        console.log('\n🎉 User Menu颜色一致性测试通过！');
        process.exit(0);
    } else {
        console.log('\n⚠️ User Menu颜色存在不一致问题');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 测试执行异常:', error);
    process.exit(1);
});
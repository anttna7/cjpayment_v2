/**
 * 轮询规则初始化脚本
 * 确保轮询规则组件正确加载和初始化
 */

console.log('🔄 轮询规则初始化脚本加载');

// 轮询规则初始化管理器
window.RotationRulesInit = {
    initialized: false,
    retryCount: 0,
    maxRetries: 3,
    
    init: function() {
        console.log('🚀 开始初始化轮询规则...');
        
        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        
        if (tab === 'rotation') {
            console.log('✅ 检测到轮询规则标签页');
            this.initializeRotationRules();
        }
        
        // 监听标签页切换
        this.bindTabEvents();
    },
    
    bindTabEvents: function() {
        // 监听轮询规则标签页点击
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab="rotation"]') || e.target.closest('[data-tab="rotation"]')) {
                console.log('🎯 轮询规则标签页被点击');
                setTimeout(() => {
                    this.initializeRotationRules();
                }, 100);
            }
        });
    },
    
    initializeRotationRules: function() {
        console.log('🔧 初始化轮询规则组件...');
        
        const container = document.getElementById('rotationRulesContainer');
        if (!container) {
            console.error('❌ 找不到轮询规则容器');
            return;
        }
        
        // 检查组件是否可用
        if (typeof RotationRulesManagement === 'undefined') {
            console.warn('⚠️ RotationRulesManagement 组件未加载');
            this.showLoadingState(container);
            this.retryLoadComponents();
            return;
        }
        
        try {
            // 创建轮询规则管理实例
            if (!window.rotationRulesManagement) {
                console.log('📦 创建轮询规则管理实例...');
                window.rotationRulesManagement = new RotationRulesManagement('rotationRulesContainer');
                console.log('✅ 轮询规则管理实例创建成功');
            }
            
            this.initialized = true;
        } catch (error) {
            console.error('❌ 轮询规则初始化失败:', error);
            this.showErrorState(container, error.message);
        }
    },
    
    retryLoadComponents: function() {
        if (this.retryCount >= this.maxRetries) {
            console.error('❌ 达到最大重试次数，停止重试');
            return;
        }
        
        this.retryCount++;
        console.log(`🔄 重试加载组件 (${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
            this.initializeRotationRules();
        }, 1000 * this.retryCount);
    },
    
    showLoadingState: function(container) {
        container.innerHTML = `
            <div class="rotation-rules-loading" style="padding: 3rem; text-align: center;">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <h5 class="text-primary">正在加载轮询规则</h5>
                <p class="text-muted">请稍候，正在初始化轮询规则管理组件...</p>
                
                <div class="mt-4">
                    <div class="alert alert-info">
                        <h6><i class="fas fa-info-circle"></i> 轮询规则功能</h6>
                        <ul class="text-left mb-0">
                            <li>支持权重轮询、时间段轮询、金额分层轮询</li>
                            <li>可为不同商户配置不同的轮询策略</li>
                            <li>支持规则优先级和状态管理</li>
                        </ul>
                    </div>
                </div>
                
                <button type="button" class="btn btn-outline-primary" onclick="RotationRulesInit.initializeRotationRules()">
                    <i class="fas fa-redo"></i> 重试加载
                </button>
            </div>
        `;
    },
    
    showErrorState: function(container, message) {
        container.innerHTML = `
            <div class="rotation-rules-error" style="padding: 3rem; text-align: center;">
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle"></i> 加载失败</h5>
                    <p>轮询规则组件加载失败: ${message}</p>
                    
                    <div class="mt-3">
                        <button type="button" class="btn btn-primary me-2" onclick="RotationRulesInit.initializeRotationRules()">
                            <i class="fas fa-redo"></i> 重试
                        </button>
                    </div>
                </div>
                
                <details class="mt-3">
                    <summary class="btn btn-link">查看详细信息</summary>
                    <div class="mt-2 p-3 bg-light border rounded">
                        <h6>可能的解决方案:</h6>
                        <ul class="text-left">
                            <li>检查网络连接</li>
                            <li>刷新页面重试</li>
                            <li>检查浏览器控制台错误</li>
                            <li>联系技术支持</li>
                        </ul>
                    </div>
                </details>
            </div>
        `;
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 页面加载完成，准备初始化轮询规则');
    
    // 延迟初始化，确保其他脚本已加载
    setTimeout(() => {
        RotationRulesInit.init();
    }, 500);
});

// 导出到全局作用域
window.RotationRulesInit = RotationRulesInit;
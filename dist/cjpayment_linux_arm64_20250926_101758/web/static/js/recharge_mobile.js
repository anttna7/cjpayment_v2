/**
 * 移动端充值页面增强功能
 * 包含触屏优化、拍照上传、一键复制、离线缓存、网络状态检测等功能
 */

class MobileRechargeEnhancer {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineData = new Map();
        this.networkRetryQueue = [];
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        this.setupNetworkMonitoring();
        this.setupOfflineCache();
        this.setupTouchOptimizations();
        this.setupCameraCapture();
        this.setupShareFunctionality();
        this.setupPullToRefresh();
        this.setupVibrationFeedback();
        this.setupAccessibilityFeatures();
        this.setupPerformanceOptimizations();
    }
    
    /**
     * 网络状态监控
     */
    setupNetworkMonitoring() {
        // 监听网络状态变化
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNetworkStatus('网络已连接', 'success');
            this.processRetryQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkStatus('网络已断开，数据将在网络恢复后同步', 'warning');
        });
        
        // 定期检测网络质量
        this.startNetworkQualityMonitoring();
        
        // 显示初始网络状态
        this.updateNetworkIndicator();
    }
    
    /**
     * 离线缓存设置
     */
    setupOfflineCache() {
        // 注册Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/static/sw-recharge.js')
                .then(registration => {
                    console.log('Service Worker注册成功:', registration);
                })
                .catch(error => {
                    console.log('Service Worker注册失败:', error);
                });
        }
        
        // 缓存关键数据
        this.cacheEssentialData();
        
        // 监听表单数据变化并缓存
        this.setupFormDataCaching();
    }
    
    /**
     * 触屏优化
     */
    setupTouchOptimizations() {
        // 增大触摸目标
        this.enhanceTouchTargets();
        
        // 优化滚动性能
        this.optimizeScrolling();
        
        // 手势支持
        this.setupGestureSupport();
        
        // 触觉反馈
        this.setupHapticFeedback();
        
        // 防止双击缩放
        this.preventDoubleClickZoom();
    }
    
    /**
     * 相机拍照功能
     */
    setupCameraCapture() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('proofFile');
        
        if (!uploadArea || !fileInput) return;
        
        // 创建拍照按钮
        const cameraBtn = document.createElement('button');
        cameraBtn.type = 'button';
        cameraBtn.className = 'camera-btn';
        cameraBtn.innerHTML = '<i class="fas fa-camera"></i> 拍照';
        cameraBtn.addEventListener('click', () => this.openCamera());
        
        // 创建相册按钮
        const galleryBtn = document.createElement('button');
        galleryBtn.type = 'button';
        galleryBtn.className = 'gallery-btn';
        galleryBtn.innerHTML = '<i class="fas fa-images"></i> 相册';
        galleryBtn.addEventListener('click', () => this.openGallery());
        
        // 添加按钮到上传区域
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'upload-buttons';
        buttonContainer.appendChild(cameraBtn);
        buttonContainer.appendChild(galleryBtn);
        
        uploadArea.appendChild(buttonContainer);
        
        // 设置文件输入属性
        fileInput.setAttribute('accept', 'image/*');
        fileInput.setAttribute('capture', 'environment');
    }
    
    /**
     * 一键复制和分享功能
     */
    setupShareFunctionality() {
        // 增强复制功能
        this.enhanceCopyFunctionality();
        
        // 添加分享功能
        this.addShareButtons();
        
        // 设置快捷复制手势
        this.setupQuickCopyGestures();
    }
    
    /**
     * 下拉刷新功能
     */
    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let pullDistance = 0;
        const threshold = 80;
        let isPulling = false;
        
        const refreshIndicator = this.createRefreshIndicator();
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            currentY = e.touches[0].clientY;
            pullDistance = currentY - startY;
            
            if (pullDistance > 0 && window.scrollY === 0) {
                e.preventDefault();
                this.updateRefreshIndicator(refreshIndicator, pullDistance, threshold);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            if (isPulling && pullDistance > threshold) {
                this.performRefresh();
            }
            
            isPulling = false;
            pullDistance = 0;
            this.hideRefreshIndicator(refreshIndicator);
        });
    }
    
    /**
     * 振动反馈
     */
    setupVibrationFeedback() {
        if (!('vibrate' in navigator)) return;
        
        // 按钮点击反馈
        document.querySelectorAll('button, .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                navigator.vibrate(10); // 轻微振动
            });
        });
        
        // 表单验证反馈
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('invalid', () => {
                navigator.vibrate([100, 50, 100]); // 错误振动模式
            });
        });
        
        // 成功操作反馈
        this.onSuccess = () => {
            navigator.vibrate([50, 30, 50, 30, 50]); // 成功振动模式
        };
    }
    
    /**
     * 无障碍功能
     */
    setupAccessibilityFeatures() {
        // 语音播报
        this.setupVoiceAnnouncements();
        
        // 高对比度模式
        this.setupHighContrastMode();
        
        // 大字体模式
        this.setupLargeFontMode();
        
        // 键盘导航增强
        this.enhanceKeyboardNavigation();
        
        // 屏幕阅读器优化
        this.optimizeForScreenReaders();
    }
    
    /**
     * 性能优化
     */
    setupPerformanceOptimizations() {
        // 图片懒加载
        this.setupImageLazyLoading();
        
        // 防抖处理
        this.setupDebouncing();
        
        // 内存管理
        this.setupMemoryManagement();
        
        // 电池优化
        this.setupBatteryOptimization();
    }
    
    /**
     * 打开相机
     */
    async openCamera() {
        try {
            if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) {
                // 降级到文件输入
                this.openFileInput('camera');
                return;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // 后置摄像头
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            
            this.showCameraModal(stream);
        } catch (error) {
            console.error('相机访问失败:', error);
            this.showError('无法访问相机，请检查权限设置');
            this.openFileInput('camera');
        }
    }
    
    /**
     * 打开相册
     */
    openGallery() {
        this.openFileInput('gallery');
    }
    
    /**
     * 打开文件输入
     */
    openFileInput(source) {
        const fileInput = document.getElementById('proofFile');
        if (source === 'camera') {
            fileInput.setAttribute('capture', 'environment');
        } else {
            fileInput.removeAttribute('capture');
        }
        fileInput.click();
    }
    
    /**
     * 显示相机模态框
     */
    showCameraModal(stream) {
        const modal = document.createElement('div');
        modal.className = 'camera-modal';
        modal.innerHTML = `
            <div class="camera-container">
                <video id="cameraVideo" autoplay playsinline></video>
                <canvas id="cameraCanvas" style="display: none;"></canvas>
                <div class="camera-controls">
                    <button class="camera-cancel">取消</button>
                    <button class="camera-capture">拍照</button>
                    <button class="camera-switch">切换</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const video = modal.querySelector('#cameraVideo');
        const canvas = modal.querySelector('#cameraCanvas');
        const captureBtn = modal.querySelector('.camera-capture');
        const cancelBtn = modal.querySelector('.camera-cancel');
        const switchBtn = modal.querySelector('.camera-switch');
        
        video.srcObject = stream;
        
        // 拍照
        captureBtn.addEventListener('click', () => {
            this.capturePhoto(video, canvas, stream);
            this.closeCameraModal(modal, stream);
        });
        
        // 取消
        cancelBtn.addEventListener('click', () => {
            this.closeCameraModal(modal, stream);
        });
        
        // 切换摄像头
        switchBtn.addEventListener('click', () => {
            this.switchCamera(stream, video);
        });
        
        // 触摸拍照
        video.addEventListener('click', () => {
            this.capturePhoto(video, canvas, stream);
            this.closeCameraModal(modal, stream);
        });
    }
    
    /**
     * 拍照
     */
    capturePhoto(video, canvas, stream) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            this.handleCapturedPhoto(file);
        }, 'image/jpeg', 0.8);
    }
    
    /**
     * 处理拍摄的照片
     */
    handleCapturedPhoto(file) {
        // 创建文件输入事件
        const fileInput = document.getElementById('proofFile');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        // 触发change事件
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
        
        // 振动反馈
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        
        this.showSuccess('照片拍摄成功！');
    }
    
    /**
     * 关闭相机模态框
     */
    closeCameraModal(modal, stream) {
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
    }
    
    /**
     * 增强复制功能
     */
    enhanceCopyFunctionality() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            // 添加长按复制
            let pressTimer;
            
            btn.addEventListener('touchstart', (e) => {
                pressTimer = setTimeout(() => {
                    this.performCopy(btn);
                    if ('vibrate' in navigator) {
                        navigator.vibrate(100);
                    }
                }, 500);
            });
            
            btn.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
            
            btn.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
        });
    }
    
    /**
     * 添加分享按钮
     */
    addShareButtons() {
        if (!('share' in navigator)) return;
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> 分享';
        shareBtn.addEventListener('click', () => this.shareOrderInfo());
        
        // 添加到操作按钮区域
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.appendChild(shareBtn);
        }
    }
    
    /**
     * 分享订单信息
     */
    async shareOrderInfo() {
        if (!('share' in navigator)) {
            this.showError('当前浏览器不支持分享功能');
            return;
        }
        
        const orderNo = document.getElementById('orderNumber')?.textContent;
        const amount = document.getElementById('transferAmount')?.textContent;
        
        try {
            await navigator.share({
                title: '充值订单信息',
                text: `订单号：${orderNo}\n金额：${amount}`,
                url: window.location.href
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('分享失败:', error);
                this.showError('分享失败');
            }
        }
    }
    
    /**
     * 网络质量监控
     */
    startNetworkQualityMonitoring() {
        if (!('connection' in navigator)) return;
        
        const connection = navigator.connection;
        
        const updateNetworkInfo = () => {
            const networkInfo = {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt
            };
            
            this.adaptToNetworkConditions(networkInfo);
        };
        
        connection.addEventListener('change', updateNetworkInfo);
        updateNetworkInfo();
    }
    
    /**
     * 根据网络条件调整
     */
    adaptToNetworkConditions(networkInfo) {
        const isSlowNetwork = networkInfo.effectiveType === 'slow-2g' || 
                             networkInfo.effectiveType === '2g' ||
                             networkInfo.downlink < 0.5;
        
        if (isSlowNetwork) {
            // 降低图片质量
            this.reduceImageQuality();
            
            // 减少动画
            document.body.classList.add('reduce-animations');
            
            // 显示网络提示
            this.showNetworkStatus('网络较慢，已优化加载速度', 'info');
        } else {
            document.body.classList.remove('reduce-animations');
        }
    }
    
    /**
     * 缓存表单数据
     */
    setupFormDataCaching() {
        const form = document.getElementById('rechargeForm');
        if (!form) return;
        
        // 自动保存表单数据
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveFormData();
            });
        });
        
        // 恢复表单数据
        this.restoreFormData();
        
        // 页面可见性变化时保存数据（替代beforeunload）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveFormData();
            }
        });
    }
    
    /**
     * 保存表单数据
     */
    saveFormData() {
        const form = document.getElementById('rechargeForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        localStorage.setItem('recharge_form_data', JSON.stringify(data));
    }
    
    /**
     * 恢复表单数据
     */
    restoreFormData() {
        const savedData = localStorage.getItem('recharge_form_data');
        if (!savedData) return;
        
        try {
            const data = JSON.parse(savedData);
            
            Object.keys(data).forEach(key => {
                const input = document.querySelector(`[name="${key}"]`);
                if (input && data[key]) {
                    input.value = data[key];
                    if (input.type === 'radio' && input.value === data[key]) {
                        input.checked = true;
                    }
                }
            });
            
            this.showInfo('已恢复之前填写的数据');
        } catch (error) {
            console.error('恢复表单数据失败:', error);
        }
    }
    
    /**
     * 处理重试队列
     */
    processRetryQueue() {
        if (this.networkRetryQueue.length === 0) return;
        
        this.showInfo(`正在同步 ${this.networkRetryQueue.length} 个待处理请求...`);
        
        const queue = [...this.networkRetryQueue];
        this.networkRetryQueue = [];
        
        queue.forEach(async (request) => {
            try {
                await request.retry();
                this.showSuccess('数据同步成功');
            } catch (error) {
                console.error('重试失败:', error);
                this.networkRetryQueue.push(request);
            }
        });
    }
    
    /**
     * 创建刷新指示器
     */
    createRefreshIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'refresh-indicator';
        indicator.innerHTML = `
            <div class="refresh-spinner"></div>
            <span class="refresh-text">下拉刷新</span>
        `;
        document.body.insertBefore(indicator, document.body.firstChild);
        return indicator;
    }
    
    /**
     * 更新刷新指示器
     */
    updateRefreshIndicator(indicator, distance, threshold) {
        const progress = Math.min(distance / threshold, 1);
        const rotation = progress * 180;
        
        indicator.style.transform = `translateY(${Math.min(distance, threshold)}px)`;
        indicator.querySelector('.refresh-spinner').style.transform = `rotate(${rotation}deg)`;
        
        if (progress >= 1) {
            indicator.querySelector('.refresh-text').textContent = '释放刷新';
            indicator.classList.add('ready');
        } else {
            indicator.querySelector('.refresh-text').textContent = '下拉刷新';
            indicator.classList.remove('ready');
        }
    }
    
    /**
     * 隐藏刷新指示器
     */
    hideRefreshIndicator(indicator) {
        indicator.style.transform = 'translateY(-100%)';
        setTimeout(() => {
            indicator.style.transform = '';
            indicator.classList.remove('ready');
        }, 300);
    }
    
    /**
     * 执行刷新
     */
    async performRefresh() {
        try {
            // 重新加载页面数据
            await this.refreshPageData();
            this.showSuccess('刷新成功');
        } catch (error) {
            console.error('刷新失败:', error);
            this.showError('刷新失败，请重试');
        }
    }
    
    /**
     * 刷新页面数据
     */
    async refreshPageData() {
        // 清除缓存的表单数据
        localStorage.removeItem('recharge_form_data');
        
        // 重新获取商户信息
        const merchantId = document.getElementById('merchantId')?.value;
        if (merchantId) {
            const response = await fetch(`/api/merchant/${merchantId}`);
            if (response.ok) {
                const data = await response.json();
                // 更新页面数据
                this.updateMerchantInfo(data);
            }
        }
    }
    
    /**
     * 更新网络状态指示器
     */
    updateNetworkIndicator() {
        let indicator = document.querySelector('.network-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'network-indicator';
            document.body.appendChild(indicator);
        }
        
        indicator.className = `network-indicator ${this.isOnline ? 'online' : 'offline'}`;
        indicator.innerHTML = this.isOnline ? 
            '<i class="fas fa-wifi"></i>' : 
            '<i class="fas fa-wifi-slash"></i>';
    }
    
    /**
     * 显示网络状态
     */
    showNetworkStatus(message, type) {
        this.showToast(message, type, 3000);
    }
    
    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        switch (type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            case 'info':
                icon = 'fas fa-info-circle';
                break;
        }
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // 关闭按钮
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // 自动移除
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        // 触摸滑动移除
        this.setupToastSwipeGesture(toast);
    }
    
    /**
     * 创建Toast容器
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * 移除Toast
     */
    removeToast(toast) {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }
    
    /**
     * 设置Toast滑动手势
     */
    setupToastSwipeGesture(toast) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        toast.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });
        
        toast.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            if (deltaX > 0) {
                toast.style.transform = `translateX(${deltaX}px)`;
                toast.style.opacity = Math.max(0.3, 1 - deltaX / 200);
            }
        });
        
        toast.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const deltaX = currentX - startX;
            
            if (deltaX > 100) {
                this.removeToast(toast);
            } else {
                toast.style.transform = '';
                toast.style.opacity = '';
            }
            
            isDragging = false;
        });
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showToast(message, 'success');
        if (this.onSuccess) {
            this.onSuccess();
        }
    }
    
    /**
     * 显示信息消息
     */
    showInfo(message) {
        this.showToast(message, 'info');
    }
}

// 页面加载完成后初始化移动端增强功能
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        new MobileRechargeEnhancer();
    }
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileRechargeEnhancer;
}
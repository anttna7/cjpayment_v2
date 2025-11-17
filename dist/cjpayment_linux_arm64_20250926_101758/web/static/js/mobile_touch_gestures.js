/**
 * 移动端高级触屏手势支持
 * 包含长按、双击、滑动、捏合等复杂手势识别
 */

class MobileTouchGestures {
    constructor() {
        // 触摸状态
        this.touches = new Map();
        this.gestureState = {
            isActive: false,
            startTime: 0,
            gestureType: null,
            data: {}
        };
        
        // 手势配置
        this.config = {
            longPressDelay: 500,
            doubleTapDelay: 300,
            swipeThreshold: 50,
            swipeVelocityThreshold: 0.3,
            pinchThreshold: 10,
            tapTimeout: 100
        };
        
        // 手势历史记录
        this.gestureHistory = [];
        this.maxHistoryLength = 10;
        
        this.init();
    }
    
    /**
     * 初始化手势识别
     */
    init() {
        this.setupTouchEvents();
        this.setupGestureCallbacks();
    }
    
    /**
     * 设置触摸事件监听
     */
    setupTouchEvents() {
        // 使用被动监听器优化性能
        const options = { passive: true };
        
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), options);
    }
    
    /**
     * 处理触摸开始
     */
    handleTouchStart(e) {
        const now = Date.now();
        
        // 记录每个触摸点
        Array.from(e.touches).forEach((touch, index) => {
            this.touches.set(touch.identifier, {
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: now,
                target: e.target,
                moved: false
            });
        });
        
        this.gestureState.isActive = true;
        this.gestureState.startTime = now;
        
        // 根据触摸点数量判断手势类型
        if (e.touches.length === 1) {
            this.handleSingleTouchStart(e.touches[0]);
        } else if (e.touches.length === 2) {
            this.handleMultiTouchStart(e.touches);
        }
    }
    
    /**
     * 处理单点触摸开始
     */
    handleSingleTouchStart(touch) {
        const touchData = this.touches.get(touch.identifier);
        
        // 检测长按
        this.startLongPressTimer(touch);
        
        // 检测双击
        this.checkDoubleTap(touch, touchData);
        
        // 通知开始触摸
        this.dispatchGestureEvent('touchStart', {
            x: touch.clientX,
            y: touch.clientY,
            target: touchData.target
        });
    }
    
    /**
     * 处理多点触摸开始
     */
    handleMultiTouchStart(touches) {
        if (touches.length === 2) {
            const touch1 = this.touches.get(touches[0].identifier);
            const touch2 = this.touches.get(touches[1].identifier);
            
            // 计算初始距离（用于捏合手势）
            const distance = this.calculateDistance(
                touch1.startX, touch1.startY,
                touch2.startX, touch2.startY
            );
            
            this.gestureState.gestureType = 'pinch';
            this.gestureState.data = {
                initialDistance: distance,
                currentDistance: distance,
                scale: 1,
                centerX: (touch1.startX + touch2.startX) / 2,
                centerY: (touch1.startY + touch2.startY) / 2
            };
        }
    }
    
    /**
     * 处理触摸移动
     */
    handleTouchMove(e) {
        if (!this.gestureState.isActive) return;
        
        // 更新触摸点位置
        Array.from(e.touches).forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;
                
                // 检测是否移动
                const deltaX = Math.abs(touch.clientX - touchData.startX);
                const deltaY = Math.abs(touch.clientY - touchData.startY);
                
                if (deltaX > 5 || deltaY > 5) {
                    touchData.moved = true;
                    this.cancelLongPress();
                }
            }
        });
        
        if (e.touches.length === 1) {
            this.handleSingleTouchMove(e.touches[0]);
        } else if (e.touches.length === 2) {
            this.handlePinchMove(e.touches);
        }
    }
    
    /**
     * 处理单点触摸移动
     */
    handleSingleTouchMove(touch) {
        const touchData = this.touches.get(touch.identifier);
        if (!touchData) return;
        
        const deltaX = touch.clientX - touchData.startX;
        const deltaY = touch.clientY - touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 滑动手势检测
        if (distance > this.config.swipeThreshold && !this.gestureState.gestureType) {
            this.gestureState.gestureType = 'swipe';
            this.gestureState.data = {
                startX: touchData.startX,
                startY: touchData.startY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                deltaX: deltaX,
                deltaY: deltaY,
                direction: this.getSwipeDirection(deltaX, deltaY)
            };
            
            this.dispatchGestureEvent('swipeStart', this.gestureState.data);
        }
        
        // 拖拽手势
        if (touchData.moved) {
            this.dispatchGestureEvent('drag', {
                startX: touchData.startX,
                startY: touchData.startY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                deltaX: deltaX,
                deltaY: deltaY,
                target: touchData.target
            });
        }
    }
    
    /**
     * 处理捏合手势移动
     */
    handlePinchMove(touches) {
        const touch1 = this.touches.get(touches[0].identifier);
        const touch2 = this.touches.get(touches[1].identifier);
        
        if (!touch1 || !touch2) return;
        
        const currentDistance = this.calculateDistance(
            touch1.currentX, touch1.currentY,
            touch2.currentX, touch2.currentY
        );
        
        const scale = currentDistance / this.gestureState.data.initialDistance;
        
        this.gestureState.data.currentDistance = currentDistance;
        this.gestureState.data.scale = scale;
        
        this.dispatchGestureEvent('pinch', {
            scale: scale,
            centerX: this.gestureState.data.centerX,
            centerY: this.gestureState.data.centerY,
            distance: currentDistance,
            delta: currentDistance - this.gestureState.data.initialDistance
        });
    }
    
    /**
     * 处理触摸结束
     */
    handleTouchEnd(e) {
        const now = Date.now();
        
        // 处理剩余的触摸点
        Array.from(e.changedTouches).forEach(touch => {
            const touchData = this.touches.get(touch.identifier);
            if (!touchData) return;
            
            const duration = now - touchData.startTime;
            
            // 检测点击
            if (!touchData.moved && duration < this.config.tapTimeout) {
                this.handleTap(touch, touchData);
            }
            
            // 检测滑动结束
            if (this.gestureState.gestureType === 'swipe') {
                this.handleSwipeEnd(touch, touchData);
            }
            
            this.touches.delete(touch.identifier);
        });
        
        // 如果没有剩余触摸点，结束手势
        if (e.touches.length === 0) {
            this.endGesture();
        }
        
        this.cancelLongPress();
    }
    
    /**
     * 处理触摸取消
     */
    handleTouchCancel(e) {
        this.touches.clear();
        this.endGesture();
        this.cancelLongPress();
    }
    
    /**
     * 处理点击
     */
    handleTap(touch, touchData) {
        this.dispatchGestureEvent('tap', {
            x: touch.clientX,
            y: touch.clientY,
            target: touchData.target
        });
        
        // 添加视觉反馈
        this.addTapRipple(touch.clientX, touch.clientY);
    }
    
    /**
     * 处理滑动结束
     */
    handleSwipeEnd(touch, touchData) {
        const deltaTime = Date.now() - touchData.startTime;
        const deltaX = touch.clientX - touchData.startX;
        const deltaY = touch.clientY - touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const velocity = distance / deltaTime;
        
        if (velocity > this.config.swipeVelocityThreshold) {
            const direction = this.getSwipeDirection(deltaX, deltaY);
            
            this.dispatchGestureEvent('swipe', {
                direction: direction,
                distance: distance,
                velocity: velocity,
                deltaX: deltaX,
                deltaY: deltaY,
                duration: deltaTime,
                target: touchData.target
            });
            
            this.addGestureToHistory('swipe', { direction, velocity });
        }
    }
    
    /**
     * 开始长按计时器
     */
    startLongPressTimer(touch) {
        this.longPressTimer = setTimeout(() => {
            const touchData = this.touches.get(touch.identifier);
            if (touchData && !touchData.moved) {
                this.dispatchGestureEvent('longPress', {
                    x: touch.clientX,
                    y: touch.clientY,
                    target: touchData.target
                });
                
                // 添加长按视觉反馈
                this.addLongPressEffect(touchData.target);
            }
        }, this.config.longPressDelay);
    }
    
    /**
     * 取消长按
     */
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
    
    /**
     * 检测双击
     */
    checkDoubleTap(touch, touchData) {
        const lastTap = this.lastTapTime;
        const lastTapX = this.lastTapX;
        const lastTapY = this.lastTapY;
        
        this.lastTapTime = Date.now();
        this.lastTapX = touch.clientX;
        this.lastTapY = touch.clientY;
        
        if (lastTap &&
            (this.lastTapTime - lastTap) < this.config.doubleTapDelay &&
            Math.abs(touch.clientX - lastTapX) < 50 &&
            Math.abs(touch.clientY - lastTapY) < 50) {
            
            this.dispatchGestureEvent('doubleTap', {
                x: touch.clientX,
                y: touch.clientY,
                target: touchData.target
            });
            
            this.lastTapTime = 0; // 重置以避免三击
        }
    }
    
    /**
     * 计算两点距离
     */
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    /**
     * 获取滑动方向
     */
    getSwipeDirection(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (absDeltaX > absDeltaY) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }
    
    /**
     * 结束手势
     */
    endGesture() {
        this.gestureState.isActive = false;
        this.gestureState.gestureType = null;
        this.gestureState.data = {};
        
        this.dispatchGestureEvent('gestureEnd', {});
    }
    
    /**
     * 分发手势事件
     */
    dispatchGestureEvent(type, data) {
        const event = new CustomEvent(`mobile-${type}`, {
            detail: data,
            bubbles: true,
            cancelable: true
        });
        
        if (data.target) {
            data.target.dispatchEvent(event);
        } else {
            document.dispatchEvent(event);
        }
    }
    
    /**
     * 设置手势回调
     */
    setupGestureCallbacks() {
        // 长按复制功能
        document.addEventListener('mobile-longPress', (e) => {
            const target = e.target;
            
            if (target.classList.contains('copy-btn') || 
                target.closest('.account-value') ||
                target.dataset.copyable) {
                this.handleLongPressCopy(target, e.detail);
            }
        });
        
        // 双击放大功能
        document.addEventListener('mobile-doubleTap', (e) => {
            const target = e.target;
            
            if (target.tagName === 'IMG' || target.classList.contains('zoomable')) {
                this.handleDoubleTapZoom(target, e.detail);
            }
        });
        
        // 滑动导航
        document.addEventListener('mobile-swipe', (e) => {
            this.handleSwipeNavigation(e.detail);
        });
        
        // 捏合缩放
        document.addEventListener('mobile-pinch', (e) => {
            const target = e.target;
            
            if (target.classList.contains('pinch-zoomable')) {
                this.handlePinchZoom(target, e.detail);
            }
        });
    }
    
    /**
     * 处理长按复制
     */
    handleLongPressCopy(target, detail) {
        let textToCopy = '';
        
        if (target.dataset.copy) {
            const copyTarget = document.getElementById(target.dataset.copy);
            textToCopy = copyTarget ? copyTarget.textContent : '';
        } else if (target.closest('.account-value')) {
            textToCopy = target.closest('.account-value').textContent.trim();
        } else {
            textToCopy = target.textContent.trim();
        }
        
        if (textToCopy) {
            this.copyToClipboard(textToCopy);
            this.showCopyFeedback(detail.x, detail.y);
            
            // 触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }
    
    /**
     * 处理双击放大
     */
    handleDoubleTapZoom(target, detail) {
        const currentScale = target.style.transform ? 
            parseFloat(target.style.transform.match(/scale\\(([^)]+)\\)/)?.[1] || 1) : 1;
        
        const newScale = currentScale === 1 ? 2 : 1;
        
        target.style.transition = 'transform 0.3s ease-out';
        target.style.transform = `scale(${newScale})`;
        target.style.transformOrigin = `${detail.x}px ${detail.y}px`;
        
        // 自动恢复
        if (newScale > 1) {
            setTimeout(() => {
                target.style.transform = 'scale(1)';
            }, 2000);
        }
    }
    
    /**
     * 处理滑动导航
     */
    handleSwipeNavigation(detail) {
        switch (detail.direction) {
            case 'right':
                // 右滑返回
                const backBtn = document.querySelector('.nav-back');
                if (backBtn && !backBtn.style.display !== 'none') {
                    backBtn.click();
                }
                break;
                
            case 'left':
                // 左滑前进或显示菜单
                this.handleLeftSwipe();
                break;
                
            case 'up':
                // 上滑提交表单
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn && this.isElementVisible(submitBtn)) {
                    this.highlightElement(submitBtn);
                }
                break;
                
            case 'down':
                // 下滑刷新
                if (window.scrollY === 0) {
                    this.triggerPullToRefresh();
                }
                break;
        }
    }
    
    /**
     * 处理捏合缩放
     */
    handlePinchZoom(target, detail) {
        const scale = Math.max(0.5, Math.min(3, detail.scale));
        target.style.transform = `scale(${scale})`;
        target.style.transformOrigin = `${detail.centerX}px ${detail.centerY}px`;
    }
    
    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // 回退方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            return true;
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    }
    
    /**
     * 显示复制反馈
     */
    showCopyFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.textContent = '已复制';
        feedback.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 40}px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            animation: copyFeedback 1.5s ease-out forwards;
        `;
        
        // 添加CSS动画
        if (!document.querySelector('#copyFeedbackStyle')) {
            const style = document.createElement('style');
            style.id = 'copyFeedbackStyle';
            style.textContent = `
                @keyframes copyFeedback {
                    0% { opacity: 0; transform: scale(0.8) translateY(0); }
                    20% { opacity: 1; transform: scale(1) translateY(0); }
                    100% { opacity: 0; transform: scale(0.8) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 1500);
    }
    
    /**
     * 添加点击涟漪效果
     */
    addTapRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(102, 126, 234, 0.3);
            transform: scale(0);
            z-index: 9999;
            pointer-events: none;
            animation: tapRipple 0.6s ease-out forwards;
        `;
        
        // 添加CSS动画
        if (!document.querySelector('#tapRippleStyle')) {
            const style = document.createElement('style');
            style.id = 'tapRippleStyle';
            style.textContent = `
                @keyframes tapRipple {
                    0% { transform: scale(0); opacity: 0.8; }
                    100% { transform: scale(2); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    /**
     * 添加长按效果
     */
    addLongPressEffect(target) {
        target.classList.add('long-press-active');
        
        // 添加CSS样式
        if (!document.querySelector('#longPressStyle')) {
            const style = document.createElement('style');
            style.id = 'longPressStyle';
            style.textContent = `
                .long-press-active {
                    transform: scale(1.05) !important;
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3) !important;
                    z-index: 1000 !important;
                    transition: all 0.2s ease-out !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            target.classList.remove('long-press-active');
        }, 300);
    }
    
    /**
     * 处理左滑
     */
    handleLeftSwipe() {
        // 可以实现侧边菜单、工具栏等功能
        console.log('Left swipe detected');
    }
    
    /**
     * 检查元素是否可见
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && 
               rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth;
    }
    
    /**
     * 高亮元素
     */
    highlightElement(element) {
        element.style.animation = 'highlightPulse 0.5s ease-in-out';
        
        // 添加CSS动画
        if (!document.querySelector('#highlightStyle')) {
            const style = document.createElement('style');
            style.id = 'highlightStyle';
            style.textContent = `
                @keyframes highlightPulse {
                    0%, 100% { transform: scale(1); box-shadow: none; }
                    50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(102, 126, 234, 0.5); }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
    
    /**
     * 触发下拉刷新
     */
    triggerPullToRefresh() {
        // 发送自定义事件给主应用
        document.dispatchEvent(new CustomEvent('mobile-pullToRefresh', {
            detail: { source: 'gesture' }
        }));
    }
    
    /**
     * 添加手势到历史记录
     */
    addGestureToHistory(type, data) {
        this.gestureHistory.unshift({
            type: type,
            data: data,
            timestamp: Date.now()
        });
        
        // 限制历史记录长度
        if (this.gestureHistory.length > this.maxHistoryLength) {
            this.gestureHistory = this.gestureHistory.slice(0, this.maxHistoryLength);
        }
    }
    
    /**
     * 获取手势历史
     */
    getGestureHistory() {
        return this.gestureHistory;
    }
    
    /**
     * 清理资源
     */
    destroy() {
        this.touches.clear();
        this.cancelLongPress();
        this.gestureHistory = [];
        
        // 移除事件监听器
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchCancel);
    }
}

// 自动初始化
if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    window.mobileTouchGestures = new MobileTouchGestures();
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileTouchGestures;
}
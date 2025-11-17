/**
 * 统一的通知数据管理系统
 * 确保所有页面显示相同的通知内容和数量
 * 
 * 解决问题：
 * 1. 不同页面显示不同的通知内容
 * 2. 通知数量badge不一致
 * 3. 通知标题和文案不统一
 */

class NotificationDataUnified {
    constructor() {
        this.notifications = [
            {
                id: 'maintenance_2024',
                title: '系统维护通知',
                text: '系统将在今晚22:00-24:00进行例行维护',
                time: '2小时前',
                unread: true,
                type: 'system',
                priority: 'high'
            },
            {
                id: 'merchant_pending_2024',
                title: '新商户待审核',
                text: '有2个新商户申请待审核',
                time: '10分钟前',
                unread: true,
                type: 'business',
                priority: 'medium'
            },
            {
                id: 'report_generated_2024',
                title: '数据报表已生成',
                text: '本月财务报表已生成完成',
                time: '1小时前',
                unread: false,
                type: 'info',
                priority: 'low'
            }
        ];
        
        this.initializeNotifications();
    }
    
    /**
     * 初始化通知系统
     */
    initializeNotifications() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.renderNotifications());
        } else {
            this.renderNotifications();
        }
    }
    
    /**
     * 渲染通知到页面
     */
    renderNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        const notificationBadge = document.getElementById('notificationBadge');
        
        if (!notificationsList) {
            console.warn('NotificationDataUnified: notificationsList element not found');
            return;
        }
        
        // 统一通知HTML结构
        const notificationsHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.unread ? 'notification-unread' : ''}" data-id="${notification.id}">
                <div class="notification-icon ${notification.unread ? 'unread' : ''}"></div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-text">${notification.text}</div>
                    <div class="notification-meta">
                        <span class="notification-time">${notification.time}</span>
                        ${notification.unread ? '<span class="notification-new">新</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // 强制更新通知列表 - 覆盖现有HTML内容
        notificationsList.innerHTML = notificationsHTML;
        console.log('NotificationDataUnified: 通知列表HTML已更新', notificationsHTML.length, '个通知');
        
        // 更新通知徽章
        const unreadCount = this.getUnreadCount();
        if (notificationBadge) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
        // 绑定通知点击事件
        this.bindNotificationEvents();
        
        console.log('NotificationDataUnified: 通知数据已统一渲染');
    }
    
    /**
     * 获取未读通知数量
     */
    getUnreadCount() {
        return this.notifications.filter(n => n.unread).length;
    }
    
    /**
     * 标记所有通知为已读
     */
    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.unread = false;
        });
        this.renderNotifications();
        
        // 保存到本地存储
        this.saveToStorage();
        
        console.log('NotificationDataUnified: 所有通知已标记为已读');
    }
    
    /**
     * 标记特定通知为已读
     */
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.unread = false;
            this.renderNotifications();
            this.saveToStorage();
            
            console.log(`NotificationDataUnified: 通知 ${notificationId} 已标记为已读`);
        }
    }
    
    /**
     * 绑定通知相关事件
     */
    bindNotificationEvents() {
        // 绑定"全部标记为已读"按钮
        const clearButton = document.getElementById('clearNotifications');
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.markAllAsRead();
            });
        }
        
        // 绑定单个通知点击事件
        const notificationItems = document.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const notificationId = item.dataset.id;
                if (notificationId) {
                    this.markAsRead(notificationId);
                }
            });
        });
    }
    
    /**
     * 添加新通知
     */
    addNotification(notification) {
        const newNotification = {
            id: `notification_${Date.now()}`,
            unread: true,
            type: 'info',
            priority: 'medium',
            time: '刚刚',
            ...notification
        };
        
        this.notifications.unshift(newNotification);
        this.renderNotifications();
        this.saveToStorage();
        
        console.log('NotificationDataUnified: 新通知已添加', newNotification);
    }
    
    /**
     * 保存到本地存储
     */
    saveToStorage() {
        try {
            localStorage.setItem('cjpayment_notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.warn('NotificationDataUnified: 保存通知到本地存储失败', error);
        }
    }
    
    /**
     * 从本地存储加载
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('cjpayment_notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
                return true;
            }
        } catch (error) {
            console.warn('NotificationDataUnified: 从本地存储加载通知失败', error);
        }
        return false;
    }
    
    /**
     * 获取通知统计信息
     */
    getStats() {
        return {
            total: this.notifications.length,
            unread: this.getUnreadCount(),
            types: {
                system: this.notifications.filter(n => n.type === 'system').length,
                business: this.notifications.filter(n => n.type === 'business').length,
                info: this.notifications.filter(n => n.type === 'info').length
            }
        };
    }
}

// 全局通知管理器实例
window.notificationManager = new NotificationDataUnified();

// 导出给其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationDataUnified;
}
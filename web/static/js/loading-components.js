/**
 * Loading Components and Skeleton Screens
 * Provides better loading experience with skeleton screens and loading indicators
 */

window.LoadingComponents = (function() {
    'use strict';

    class LoadingComponents {
        constructor() {
            this.init();
        }

        init() {
            this.addStyles();
        }

        addStyles() {
            if (document.getElementById('loading-components-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'loading-components-styles';
            styles.textContent = `
                /* Loading States */
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    color: #6b7280;
                }
                
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f4f6;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                
                .loading-text {
                    font-size: 14px;
                    font-weight: 500;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Skeleton Screens */
                .skeleton-container {
                    padding: 20px;
                }
                
                .skeleton-item {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: skeleton-loading 1.5s infinite;
                    border-radius: 4px;
                    margin-bottom: 12px;
                }
                
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                .skeleton-card {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .skeleton-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .skeleton-title {
                    height: 20px;
                    width: 60%;
                }
                
                .skeleton-status {
                    height: 16px;
                    width: 60px;
                    border-radius: 12px;
                }
                
                .skeleton-body {
                    margin-bottom: 16px;
                }
                
                .skeleton-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .skeleton-label {
                    height: 14px;
                    width: 30%;
                }
                
                .skeleton-value {
                    height: 14px;
                    width: 40%;
                }
                
                .skeleton-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .skeleton-button {
                    height: 32px;
                    width: 60px;
                    border-radius: 4px;
                }
                
                /* Table Skeleton */
                .skeleton-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .skeleton-table th,
                .skeleton-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .skeleton-table-header {
                    height: 16px;
                    width: 80%;
                }
                
                .skeleton-table-cell {
                    height: 14px;
                    width: 70%;
                }
                
                /* Error States */
                .error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                    color: #6b7280;
                }
                
                .error-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                    opacity: 0.6;
                }
                
                .error-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }
                
                .error-message {
                    font-size: 14px;
                    margin-bottom: 24px;
                    max-width: 400px;
                    line-height: 1.5;
                }
                
                .error-actions {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                /* Empty States */
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 80px 20px;
                    text-align: center;
                    color: #6b7280;
                }
                
                .empty-state-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                    opacity: 0.6;
                }
                
                .empty-state-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }
                
                .empty-state-description {
                    font-size: 14px;
                    max-width: 400px;
                    line-height: 1.5;
                }
                
                /* Progress Indicators */
                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background-color: #e5e7eb;
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 16px 0;
                }
                
                .progress-fill {
                    height: 100%;
                    background-color: #3b82f6;
                    border-radius: 2px;
                    transition: width 0.3s ease;
                }
                
                .progress-indeterminate {
                    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
                    background-size: 200% 100%;
                    animation: progress-indeterminate 1.5s infinite;
                }
                
                @keyframes progress-indeterminate {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                /* Network Status Indicator */
                .network-status {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    z-index: 1000;
                    transition: all 0.3s ease;
                }
                
                .network-status.online {
                    background-color: #10b981;
                    color: white;
                }
                
                .network-status.offline {
                    background-color: #ef4444;
                    color: white;
                }
                
                .network-status.reconnecting {
                    background-color: #f59e0b;
                    color: white;
                }
                
                /* Disabled state for network issues */
                .network-disabled {
                    opacity: 0.6;
                    pointer-events: none;
                    cursor: not-allowed;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .skeleton-card {
                        padding: 16px;
                        margin-bottom: 12px;
                    }
                    
                    .skeleton-row {
                        flex-direction: column;
                        gap: 4px;
                    }
                    
                    .skeleton-label,
                    .skeleton-value {
                        width: 100%;
                    }
                    
                    .error-actions,
                    .skeleton-actions {
                        flex-direction: column;
                        width: 100%;
                    }
                    
                    .skeleton-button {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        // Create skeleton for card layout
        createCardSkeleton(count = 3) {
            const skeletons = [];
            
            for (let i = 0; i < count; i++) {
                skeletons.push(`
                    <div class="skeleton-card">
                        <div class="skeleton-header">
                            <div class="skeleton-item skeleton-title"></div>
                            <div class="skeleton-item skeleton-status"></div>
                        </div>
                        <div class="skeleton-body">
                            <div class="skeleton-row">
                                <div class="skeleton-item skeleton-label"></div>
                                <div class="skeleton-item skeleton-value"></div>
                            </div>
                            <div class="skeleton-row">
                                <div class="skeleton-item skeleton-label"></div>
                                <div class="skeleton-item skeleton-value"></div>
                            </div>
                            <div class="skeleton-row">
                                <div class="skeleton-item skeleton-label"></div>
                                <div class="skeleton-item skeleton-value"></div>
                            </div>
                        </div>
                        <div class="skeleton-actions">
                            <div class="skeleton-item skeleton-button"></div>
                            <div class="skeleton-item skeleton-button"></div>
                        </div>
                    </div>
                `);
            }
            
            return `<div class="skeleton-container">${skeletons.join('')}</div>`;
        }

        // Create skeleton for table layout
        createTableSkeleton(rows = 5, columns = 4) {
            const headerCells = Array(columns).fill('<th><div class="skeleton-item skeleton-table-header"></div></th>').join('');
            const bodyRows = [];
            
            for (let i = 0; i < rows; i++) {
                const cells = Array(columns).fill('<td><div class="skeleton-item skeleton-table-cell"></div></td>').join('');
                bodyRows.push(`<tr>${cells}</tr>`);
            }
            
            return `
                <div class="skeleton-container">
                    <table class="skeleton-table">
                        <thead>
                            <tr>${headerCells}</tr>
                        </thead>
                        <tbody>
                            ${bodyRows.join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Create loading spinner
        createLoadingSpinner(text = '加载中...') {
            return `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${text}</div>
                </div>
            `;
        }

        // Create error state
        createErrorState(error, section) {
            const errorMessage = error.message || '加载失败';
            const isNetworkError = error.type === 'network' || error.code === 'NETWORK_ERROR';
            
            return `
                <div class="error-state">
                    <div class="error-icon">${isNetworkError ? '🌐' : '⚠️'}</div>
                    <div class="error-title">${isNetworkError ? '网络连接失败' : '加载失败'}</div>
                    <div class="error-message">${errorMessage}</div>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="window.systemManagement.retry${section.charAt(0).toUpperCase() + section.slice(1)}()">
                            重试
                        </button>
                        ${!isNetworkError ? `<button class="btn btn-outline" onclick="window.systemManagement.loadMock${section.charAt(0).toUpperCase() + section.slice(1)}()">使用示例数据</button>` : ''}
                    </div>
                </div>
            `;
        }

        // Create empty state
        createEmptyState(type, config = {}) {
            const emptyStates = {
                merchants: {
                    icon: '🏢',
                    title: '暂无商户',
                    description: '点击"添加商户"按钮创建第一个商户',
                    ...config
                },
                accounts: {
                    icon: '💳',
                    title: '暂无账户',
                    description: '点击"添加账户"按钮创建第一个收款账户',
                    ...config
                },
                rotation: {
                    icon: '🔄',
                    title: '暂无轮询规则',
                    description: '点击"添加规则"按钮创建第一个轮询规则',
                    ...config
                },
                limits: {
                    icon: '📊',
                    title: '暂无限额数据',
                    description: '系统将自动监控账户限额使用情况',
                    ...config
                }
            };
            
            const state = emptyStates[type] || {
                icon: '📄',
                title: '暂无数据',
                description: '暂时没有可显示的内容'
            };
            
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">${state.icon}</div>
                    <div class="empty-state-title">${state.title}</div>
                    <div class="empty-state-description">${state.description}</div>
                </div>
            `;
        }

        // Create progress bar
        createProgressBar(progress = 0, indeterminate = false) {
            const fillClass = indeterminate ? 'progress-indeterminate' : '';
            const width = indeterminate ? '100%' : `${Math.max(0, Math.min(100, progress))}%`;
            
            return `
                <div class="progress-bar">
                    <div class="progress-fill ${fillClass}" style="width: ${width}"></div>
                </div>
            `;
        }

        // Show network status indicator
        showNetworkStatus(status) {
            let existingIndicator = document.querySelector('.network-status');
            
            if (!existingIndicator) {
                existingIndicator = document.createElement('div');
                existingIndicator.className = 'network-status';
                document.body.appendChild(existingIndicator);
            }
            
            existingIndicator.className = `network-status ${status}`;
            
            const statusText = {
                online: '在线',
                offline: '离线',
                reconnecting: '重连中...'
            };
            
            existingIndicator.textContent = statusText[status] || status;
            
            // Auto-hide online status after 3 seconds
            if (status === 'online') {
                setTimeout(() => {
                    if (existingIndicator && existingIndicator.classList.contains('online')) {
                        existingIndicator.style.opacity = '0';
                        setTimeout(() => {
                            if (existingIndicator && existingIndicator.parentNode) {
                                existingIndicator.parentNode.removeChild(existingIndicator);
                            }
                        }, 300);
                    }
                }, 3000);
            }
        }

        // Hide network status indicator
        hideNetworkStatus() {
            const indicator = document.querySelector('.network-status');
            if (indicator) {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 300);
            }
        }
    }

    return LoadingComponents;
})();

// Create global instance
window.loadingComponents = new window.LoadingComponents();
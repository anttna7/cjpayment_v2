/**
 * 轮询规则管理组件
 * 用于管理轮询规则的增删改查
 */
class RotationRulesManagement {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.rules = [];
        this.merchants = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalCount = 0;
        this.filters = {
            merchant_id: '',
            strategy_type: '',
            is_active: '',
            keyword: ''
        };
        
        this.init();
    }

    async init() {
        await this.loadMerchants();
        this.render();
        this.bindEvents();
        await this.loadRules();
    }

    async loadMerchants() {
        try {
            const response = await fetch('/api/v1/merchants?limit=1000');
            if (response.ok) {
                const data = await response.json();
                this.merchants = data.data || [];
            }
        } catch (error) {
            console.error('加载商户列表失败:', error);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="rotation-rules-management">
                <!-- 页面标题 -->
                <div class="page-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="page-title">轮询规则管理</h4>
                            <p class="page-description text-muted">管理收款账户的轮询策略和规则</p>
                        </div>
                        <button type="button" class="btn btn-primary" id="addRuleBtn">
                            <i class="fas fa-plus"></i> 添加规则
                        </button>
                    </div>
                </div>

                <!-- 筛选器 -->
                <div class="filters-section">
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3">
                                    <label for="merchantFilter">商户</label>
                                    <select class="form-control" id="merchantFilter">
                                        <option value="">全部商户</option>
                                        ${this.merchants.map(merchant => 
                                            `<option value="${merchant.id}">${merchant.name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="strategyFilter">轮询策略</label>
                                    <select class="form-control" id="strategyFilter">
                                        <option value="">全部策略</option>
                                        <option value="weighted">权重轮询</option>
                                        <option value="round_robin">轮询</option>
                                        <option value="time_based">时间段轮询</option>
                                        <option value="amount_tier">金额分层轮询</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="statusFilter">状态</label>
                                    <select class="form-control" id="statusFilter">
                                        <option value="">全部状态</option>
                                        <option value="true">启用</option>
                                        <option value="false">禁用</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label for="keywordFilter">关键词</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="keywordFilter" 
                                               placeholder="搜索规则名称">
                                        <div class="input-group-append">
                                            <button class="btn btn-outline-secondary" type="button" id="searchBtn">
                                                <i class="fas fa-search"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 规则列表 -->
                <div class="rules-section">
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="card-title mb-0">轮询规则列表</h6>
                                <div class="card-tools">
                                    <span class="badge badge-info" id="totalCount">总计: 0</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead class="thead-light">
                                        <tr>
                                            <th>规则名称</th>
                                            <th>商户</th>
                                            <th>轮询策略</th>
                                            <th>优先级</th>
                                            <th>状态</th>
                                            <th>创建时间</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="rulesTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-4">
                                                <div class="loading-spinner">
                                                    <i class="fas fa-spinner fa-spin"></i> 加载中...
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div id="pagination" class="d-flex justify-content-between align-items-center">
                                <div class="pagination-info">
                                    <span class="text-muted">显示第 <span id="pageStart">0</span> - <span id="pageEnd">0</span> 条，共 <span id="totalItems">0</span> 条</span>
                                </div>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="paginationList">
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // 添加规则按钮
        document.getElementById('addRuleBtn').addEventListener('click', () => {
            console.log('点击添加规则按钮');
            // 优先使用紧急修复版本
            if (typeof RotationRuleModalEmergencyFix !== 'undefined') {
                this.showRuleModalEmergencyFix();
            } else {
                this.showRuleModal();
            }
        });



        // 筛选器事件
        ['merchantFilter', 'strategyFilter', 'statusFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.applyFilters();
            });
        });

        // 搜索按钮
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        // 关键词输入框回车事件
        document.getElementById('keywordFilter').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
    }

    applyFilters() {
        this.filters.merchant_id = document.getElementById('merchantFilter').value;
        this.filters.strategy_type = document.getElementById('strategyFilter').value;
        this.filters.is_active = document.getElementById('statusFilter').value;
        this.filters.keyword = document.getElementById('keywordFilter').value.trim();
        
        this.currentPage = 1;
        this.loadRules();
    }

    async loadRules() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize,
                ...this.filters
            });

            // 移除空值参数
            for (const [key, value] of params.entries()) {
                if (!value) {
                    params.delete(key);
                }
            }

            const response = await fetch(`/api/v1/rotation-rules?${params}`);
            if (response.ok) {
                const data = await response.json();
                this.rules = data.data || [];
                this.totalCount = data.total || 0;
                this.renderRulesTable();
                this.renderPagination();
            } else {
                throw new Error('加载轮询规则失败');
            }
        } catch (error) {
            console.error('加载轮询规则失败:', error);
            this.renderError('加载轮询规则失败: ' + error.message);
        }
    }

    renderRulesTable() {
        const tbody = document.getElementById('rulesTableBody');
        const totalCountEl = document.getElementById('totalCount');
        
        totalCountEl.textContent = `总计: ${this.totalCount}`;

        if (this.rules.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
                            <p class="text-muted">暂无轮询规则</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.rules.map(rule => `
            <tr>
                <td>
                    <div class="rule-name">
                        <strong>${this.escapeHtml(rule.rule_name)}</strong>
                        ${rule.priority === 1 ? '<span class="badge badge-warning badge-sm ml-1">高优先级</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="merchant-info">
                        <span>${this.escapeHtml(rule.merchant_name || '未知商户')}</span>
                    </div>
                </td>
                <td>
                    <span class="badge badge-${this.getStrategyBadgeClass(rule.strategy_type)}">
                        ${this.getStrategyDisplayName(rule.strategy_type)}
                    </span>
                </td>
                <td>
                    <span class="priority-badge">${rule.priority}</span>
                </td>
                <td>
                    <span class="badge badge-${rule.is_active ? 'success' : 'secondary'}">
                        ${rule.is_active ? '启用' : '禁用'}
                    </span>
                </td>
                <td>
                    <small class="text-muted">
                        ${new Date(rule.created_at).toLocaleString('zh-CN')}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm" 
                                onclick="rotationRulesManagement.showRuleModal('${rule.id}')" 
                                title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-outline-${rule.is_active ? 'warning' : 'success'} btn-sm" 
                                onclick="rotationRulesManagement.toggleRuleStatus('${rule.id}', ${!rule.is_active})" 
                                title="${rule.is_active ? '禁用' : '启用'}">
                            <i class="fas fa-${rule.is_active ? 'pause' : 'play'}"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" 
                                onclick="rotationRulesManagement.deleteRule('${rule.id}')" 
                                title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalCount / this.pageSize);
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalCount);

        // 更新分页信息
        document.getElementById('pageStart').textContent = this.totalCount > 0 ? start : 0;
        document.getElementById('pageEnd').textContent = end;
        document.getElementById('totalItems').textContent = this.totalCount;

        // 生成分页按钮
        const paginationList = document.getElementById('paginationList');
        let paginationHtml = '';

        // 上一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rotationRulesManagement.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="rotationRulesManagement.goToPage(1)">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="rotationRulesManagement.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="rotationRulesManagement.goToPage(${totalPages})">${totalPages}</a>
                </li>
            `;
        }

        // 下一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rotationRulesManagement.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationList.innerHTML = paginationHtml;
    }

    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.totalCount / this.pageSize)) {
            return;
        }
        this.currentPage = page;
        this.loadRules();
    }

    async showRuleModal(ruleId = null) {
        console.log('显示轮询规则模态框, ruleId:', ruleId);
        
        let rule = null;
        if (ruleId) {
            rule = this.rules.find(r => r.id === ruleId);
            if (!rule) {
                // 从服务器获取规则详情
                try {
                    const response = await fetch(`/api/v1/rotation-rules/${ruleId}`);
                    if (response.ok) {
                        const data = await response.json();
                        rule = data.data;
                    }
                } catch (error) {
                    console.error('获取规则详情失败:', error);
                    alert('获取规则详情失败');
                    return;
                }
            }
        }

        try {
            console.log('创建轮询规则模态框实例');
            const modal = new RotationRuleModal({
                mode: ruleId ? 'edit' : 'create',
                onSave: (savedRule) => {
                    console.log('模态框保存成功:', savedRule);
                    this.loadRules();
                    this.showSuccessMessage(ruleId ? '规则更新成功' : '规则创建成功');
                },
                onCancel: () => {
                    console.log('模态框取消操作');
                }
            });

            console.log('模态框实例创建成功，准备显示');
            await modal.show(rule);
            console.log('模态框显示完成');
        } catch (error) {
            console.error('显示模态框失败:', error);
            alert('显示模态框失败: ' + error.message);
        }
    }

    async toggleRuleStatus(ruleId, isActive) {
        try {
            const response = await fetch(`/api/v1/rotation-rules/${ruleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: isActive })
            });

            if (response.ok) {
                this.loadRules();
                this.showSuccessMessage(`规则已${isActive ? '启用' : '禁用'}`);
            } else {
                throw new Error('操作失败');
            }
        } catch (error) {
            console.error('切换规则状态失败:', error);
            alert('操作失败: ' + error.message);
        }
    }

    async deleteRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (!rule) return;

        if (!confirm(`确定要删除轮询规则"${rule.rule_name}"吗？此操作不可撤销。`)) {
            return;
        }

        try {
            const response = await fetch(`/api/v1/rotation-rules/${ruleId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadRules();
                this.showSuccessMessage('规则删除成功');
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除规则失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    renderError(message) {
        const tbody = document.getElementById('rulesTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
                        <p class="text-danger">${this.escapeHtml(message)}</p>
                        <button type="button" class="btn btn-outline-primary btn-sm" onclick="rotationRulesManagement.loadRules()">
                            <i class="fas fa-redo"></i> 重试
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    showSuccessMessage(message) {
        // 创建成功提示
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            <i class="fas fa-check-circle"></i> ${this.escapeHtml(message)}
            <button type="button" class="close" data-dismiss="alert">
                <span>&times;</span>
            </button>
        `;
        
        document.body.appendChild(alert);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 3000);
    }

    getStrategyDisplayName(strategyType) {
        const names = {
            'weighted': '权重轮询',
            'round_robin': '轮询',
            'time_based': '时间段轮询',
            'amount_tier': '金额分层轮询'
        };
        return names[strategyType] || strategyType;
    }

    getStrategyBadgeClass(strategyType) {
        const classes = {
            'weighted': 'primary',
            'round_robin': 'success',
            'time_based': 'info',
            'amount_tier': 'warning'
        };
        return classes[strategyType] || 'secondary';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }





    showRuleModalEmergencyFix(ruleId = null) {
        console.log('使用紧急修复版显示轮询规则模态框, ruleId:', ruleId);
        
        // 检查紧急修复版本是否可用
        if (typeof RotationRuleModalEmergencyFix === 'undefined') {
            console.error('紧急修复版模态框未加载');
            alert('模态框组件未加载，请刷新页面重试');
            return;
        }

        let rule = null;
        if (ruleId) {
            rule = this.rules.find(r => r.id === ruleId);
        }

        const modal = new RotationRuleModalEmergencyFix({
            mode: ruleId ? 'edit' : 'create',
            onSave: (savedRule) => {
                console.log('紧急修复版模态框保存成功:', savedRule);
                this.loadRules();
                this.showSuccessMessage(ruleId ? '规则更新成功' : '规则创建成功');
            },
            onCancel: () => {
                console.log('紧急修复版模态框取消操作');
            }
        });

        modal.show(rule);
    }
}

// 全局实例
let rotationRulesManagement = null;

// 初始化函数
function initRotationRulesManagement(containerId) {
    rotationRulesManagement = new RotationRulesManagement(containerId);
    return rotationRulesManagement;
}

// 导出到全局作用域
window.RotationRulesManagement = RotationRulesManagement;
window.initRotationRulesManagement = initRotationRulesManagement;


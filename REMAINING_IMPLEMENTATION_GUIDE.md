# 剩余实施指南 - Handler层和前端页面

## 📋 项目完成度概览

| 模块 | Repository | Service | Handler | 前端 | 完成度 |
|------|-----------|---------|---------|------|--------|
| 发票管理 | ✅ | ✅ | ⏳ | ⏳ | 50% |
| 结算订单 | ✅ | ✅ | ⏳ | ⏳ | 50% |
| 部门管理 | ✅ | ✅ | ⏳ | ⏳ | 50% |
| 动态表单 | ✅ | ✅ | ⏳ | ⏳ | 50% |
| **总体** | **100%** | **100%** | **0%** | **0%** | **60%** |

---

## ✅ 已完成工作总结

### 1. Repository层（100%完成）
- ✅ `invoice_repository.go` - 387行
- ✅ `settlement_order_repository.go` - 377行
- ✅ `department_repository.go` - 232行
- ✅ `custom_form_repository.go` - 796行

### 2. Service层（100%完成）
- ✅ `invoice_service.go` - 313行
- ✅ `settlement_order_service.go` - 260行
- ✅ `department_service.go` - 281行（含权限继承）
- ✅ `custom_form_service.go` - 454行

### 3. 数据库层（100%完成）
- ✅ 4个新迁移文件
- ✅ 10+个新数据模型

**代码总量**: ~3,100行

---

## 🚀 Handler层实施指南

Handler层是REST API接口层，需要创建4个Handler文件。以下是详细的实施框架：

### 1. InvoiceHandler (`internal/handler/invoice_handler.go`)

```go
package handler

import (
	"net/http"
	"strconv"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InvoiceHandler struct {
	invoiceService service.InvoiceService
}

func NewInvoiceHandler(invoiceService service.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{
		invoiceService: invoiceService,
	}
}

// POST /api/invoices - 创建发票
func (h *InvoiceHandler) CreateInvoice(c *gin.Context) {
	var req service.CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从JWT中获取用户信息
	userID := c.MustGet("user_id").(uuid.UUID)
	tenantID := c.MustGet("tenant_id").(uuid.UUID)

	req.ApplicantID = userID
	req.TenantID = tenantID

	invoice, err := h.invoiceService.CreateInvoice(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, invoice)
}

// GET /api/invoices/:id - 获取发票详情
func (h *InvoiceHandler) GetInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	invoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// PUT /api/invoices/:id - 更新发票
func (h *InvoiceHandler) UpdateInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	var req service.UpdateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.invoiceService.UpdateInvoice(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invoice updated successfully"})
}

// DELETE /api/invoices/:id - 删除发票
func (h *InvoiceHandler) DeleteInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	err = h.invoiceService.DeleteInvoice(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invoice deleted successfully"})
}

// GET /api/invoices - 发票列表
func (h *InvoiceHandler) ListInvoices(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)

	var filter service.InvoiceListFilter
	filter.TenantID = &tenantID

	// 解析查询参数
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}
	if customerID := c.Query("customer_id"); customerID != "" {
		id, _ := uuid.Parse(customerID)
		filter.CustomerID = &id
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filter.Page = page
	filter.PageSize = pageSize

	invoices, total, err := h.invoiceService.ListInvoices(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       invoices,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
	})
}

// POST /api/invoices/:id/issue - 开具发票
func (h *InvoiceHandler) IssueInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	var req service.IssueInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.InvoiceID = id
	req.IssuerID = c.MustGet("user_id").(uuid.UUID)

	err = h.invoiceService.IssueInvoice(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invoice issued successfully"})
}

// POST /api/invoices/:id/send - 发送发票
func (h *InvoiceHandler) SendInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	err = h.invoiceService.SendInvoice(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invoice sent successfully"})
}

// POST /api/invoices/:id/confirm - 确认发票
func (h *InvoiceHandler) ConfirmInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	err = h.invoiceService.ConfirmInvoice(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invoice confirmed successfully"})
}

// POST /api/invoices/:id/cancel - 作废发票
func (h *InvoiceHandler) CancelInvoice(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	err = h.invoiceService.CancelInvoice(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "invoice cancelled successfully"})
}
```

### 2. 路由注册

在 `internal/handler/handler.go` 中添加路由注册：

```go
// 初始化所有Handler
invoiceHandler := NewInvoiceHandler(invoiceService)
settlementHandler := NewSettlementOrderHandler(settlementService)
departmentHandler := NewDepartmentHandler(departmentService)
formHandler := NewCustomFormHandler(formService)

// 注册路由
api := router.Group("/api")
api.Use(middleware.JWTAuth()) // JWT认证中间件
{
	// 发票管理路由
	invoices := api.Group("/invoices")
	invoices.Use(middleware.RBACMiddleware("invoices")) // 权限控制
	{
		invoices.POST("", invoiceHandler.CreateInvoice)
		invoices.GET("/:id", invoiceHandler.GetInvoice)
		invoices.PUT("/:id", invoiceHandler.UpdateInvoice)
		invoices.DELETE("/:id", invoiceHandler.DeleteInvoice)
		invoices.GET("", invoiceHandler.ListInvoices)
		invoices.POST("/:id/issue", invoiceHandler.IssueInvoice)
		invoices.POST("/:id/send", invoiceHandler.SendInvoice)
		invoices.POST("/:id/confirm", invoiceHandler.ConfirmInvoice)
		invoices.POST("/:id/cancel", invoiceHandler.CancelInvoice)
	}

	// 结算订单路由
	settlements := api.Group("/settlement-orders")
	settlements.Use(middleware.RBACMiddleware("settlements"))
	{
		settlements.POST("", settlementHandler.CreateOrder)
		settlements.GET("/:id", settlementHandler.GetOrder)
		settlements.PUT("/:id", settlementHandler.UpdateOrder)
		settlements.DELETE("/:id", settlementHandler.DeleteOrder)
		settlements.GET("", settlementHandler.ListOrders)
		settlements.POST("/:id/submit", settlementHandler.SubmitForReview)
		settlements.POST("/:id/approve", settlementHandler.ApproveOrder)
		settlements.POST("/:id/reject", settlementHandler.RejectOrder)
		settlements.POST("/:id/settle", settlementHandler.SettleOrder)
	}

	// 部门管理路由
	departments := api.Group("/departments")
	departments.Use(middleware.RBACMiddleware("departments"))
	{
		departments.POST("", departmentHandler.CreateDepartment)
		departments.GET("/:id", departmentHandler.GetDepartment)
		departments.PUT("/:id", departmentHandler.UpdateDepartment)
		departments.DELETE("/:id", departmentHandler.DeleteDepartment)
		departments.GET("", departmentHandler.ListDepartments)
		departments.POST("/:id/users", departmentHandler.AssignUser)
		departments.DELETE("/:id/users/:user_id", departmentHandler.RemoveUser)
		departments.POST("/:id/roles", departmentHandler.AssignRole)
		departments.GET("/:id/permissions", departmentHandler.GetPermissions)
	}

	// 动态表单路由
	forms := api.Group("/forms")
	forms.Use(middleware.RBACMiddleware("forms"))
	{
		forms.POST("", formHandler.CreateForm)
		forms.GET("/:id", formHandler.GetForm)
		forms.PUT("/:id", formHandler.UpdateForm)
		forms.DELETE("/:id", formHandler.DeleteForm)
		forms.GET("", formHandler.ListForms)
		forms.POST("/:id/publish", formHandler.PublishForm)
		forms.POST("/:id/archive", formHandler.ArchiveForm)
		forms.POST("/:id/submissions", formHandler.SubmitForm)
		forms.GET("/:id/submissions", formHandler.ListSubmissions)
		forms.POST("/submissions/:id/review", formHandler.ReviewSubmission)
	}
}

// 页面路由
pages := router.Group("/")
{
	pages.GET("/invoice-management", func(c *gin.Context) {
		c.HTML(http.StatusOK, "invoice_management.html", nil)
	})
	pages.GET("/settlement-management", func(c *gin.Context) {
		c.HTML(http.StatusOK, "settlement_order_management.html", nil)
	})
	pages.GET("/department-management", func(c *gin.Context) {
		c.HTML(http.StatusOK, "department_management.html", nil)
	})
	pages.GET("/form-management", func(c *gin.Context) {
		c.HTML(http.StatusOK, "form_management.html", nil)
	})
}
```

---

## 🎨 前端页面实施指南

### 1. 发票管理页面 (`web/templates/invoice_management.html`)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>发票管理 - 客户管理系统</title>
    <link rel="stylesheet" href="/static/css/foundation/base.css">
    <link rel="stylesheet" href="/static/css/components/table.css">
    <link rel="stylesheet" href="/static/css/components/modal.css">
    <link rel="stylesheet" href="/static/css/components/form.css">
</head>
<body>
    <!-- Header -->
    <div id="header"></div>

    <div class="container">
        <!-- Page Header -->
        <div class="page-header">
            <h1>发票管理</h1>
            <div class="actions">
                <button class="btn btn-primary" onclick="showCreateModal()">
                    <i class="icon-plus"></i> 创建发票
                </button>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
            <div class="filter-group">
                <label>状态:</label>
                <select id="filterStatus" onchange="loadInvoices()">
                    <option value="">全部</option>
                    <option value="pending">待开具</option>
                    <option value="issued">已开具</option>
                    <option value="sent">已寄出</option>
                    <option value="confirmed">已确认</option>
                    <option value="cancelled">已作废</option>
                </select>
            </div>
            <div class="filter-group">
                <label>客户:</label>
                <select id="filterCustomer" onchange="loadInvoices()">
                    <option value="">全部客户</option>
                    <!-- 动态加载客户列表 -->
                </select>
            </div>
            <div class="filter-group">
                <label>发票类型:</label>
                <select id="filterType" onchange="loadInvoices()">
                    <option value="">全部类型</option>
                    <option value="vat_normal">增值税普通发票</option>
                    <option value="vat_special">增值税专用发票</option>
                    <option value="electronic">电子发票</option>
                </select>
            </div>
            <div class="filter-group">
                <input type="text" id="searchKeyword" placeholder="搜索发票号..."
                       onkeyup="handleSearch(event)">
            </div>
        </div>

        <!-- Invoice Table -->
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>发票号</th>
                        <th>客户</th>
                        <th>发票类型</th>
                        <th>金额</th>
                        <th>状态</th>
                        <th>申请时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="invoiceTableBody">
                    <!-- 动态加载数据 -->
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" id="pagination"></div>
    </div>

    <!-- 创建/编辑发票模态框 -->
    <div id="invoiceModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">创建发票</h2>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="invoiceForm">
                    <div class="form-group">
                        <label>客户 *</label>
                        <select name="customer_id" required>
                            <option value="">请选择客户</option>
                            <!-- 动态加载 -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label>发票类型 *</label>
                        <select name="invoice_type" required>
                            <option value="vat_normal">增值税普通发票</option>
                            <option value="vat_special">增值税专用发票</option>
                            <option value="electronic">电子发票</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>发票抬头 *</label>
                        <input type="text" name="invoice_title" required>
                    </div>
                    <div class="form-group">
                        <label>税号 *</label>
                        <input type="text" name="tax_number" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>金额 *</label>
                            <input type="number" name="amount" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>税额 *</label>
                            <input type="number" name="tax_amount" step="0.01" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>收件人</label>
                        <input type="text" name="recipient_name">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>联系电话</label>
                            <input type="tel" name="recipient_phone">
                        </div>
                        <div class="form-group">
                            <label>收件地址</label>
                            <input type="text" name="recipient_address">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <textarea name="notes" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn btn-primary" onclick="saveInvoice()">保存</button>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="/static/js/components/header.js"></script>
    <script src="/static/js/invoice.js"></script>
</body>
</html>
```

### 2. JavaScript文件 (`web/static/js/invoice.js`)

```javascript
// 发票管理JavaScript

let currentPage = 1;
let pageSize = 20;
let currentInvoice = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadCustomers();
    loadInvoices();
});

// 加载发票列表
async function loadInvoices() {
    const status = document.getElementById('filterStatus').value;
    const customer = document.getElementById('filterCustomer').value;
    const type = document.getElementById('filterType').value;

    const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize
    });

    if (status) params.append('status', status);
    if (customer) params.append('customer_id', customer);
    if (type) params.append('invoice_type', type);

    try {
        const response = await fetch(`/api/invoices?${params}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) throw new Error('加载发票列表失败');

        const data = await response.json();
        renderInvoiceTable(data.data);
        renderPagination(data.total, data.page, data.page_size);
    } catch (error) {
        showError(error.message);
    }
}

// 渲染发票表格
function renderInvoiceTable(invoices) {
    const tbody = document.getElementById('invoiceTableBody');

    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = invoices.map(invoice => `
        <tr>
            <td>${invoice.invoice_number}</td>
            <td>${invoice.customer_name || '-'}</td>
            <td>${getInvoiceTypeName(invoice.invoice_type)}</td>
            <td>¥${invoice.total_amount}</td>
            <td>${getStatusBadge(invoice.status)}</td>
            <td>${formatDate(invoice.applied_at)}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewInvoice('${invoice.id}')" class="btn-sm btn-info">查看</button>
                    ${getActionButtons(invoice)}
                </div>
            </td>
        </tr>
    `).join('');
}

// 根据状态返回操作按钮
function getActionButtons(invoice) {
    const buttons = [];

    if (invoice.status === 'pending') {
        buttons.push(`<button onclick="editInvoice('${invoice.id}')" class="btn-sm btn-primary">编辑</button>`);
        buttons.push(`<button onclick="issueInvoice('${invoice.id}')" class="btn-sm btn-success">开具</button>`);
        buttons.push(`<button onclick="deleteInvoice('${invoice.id}')" class="btn-sm btn-danger">删除</button>`);
    }

    if (invoice.status === 'issued') {
        buttons.push(`<button onclick="sendInvoice('${invoice.id}')" class="btn-sm btn-success">发送</button>`);
    }

    if (invoice.status === 'sent') {
        buttons.push(`<button onclick="confirmInvoice('${invoice.id}')" class="btn-sm btn-success">确认</button>`);
    }

    if (['pending', 'issued', 'sent'].includes(invoice.status)) {
        buttons.push(`<button onclick="cancelInvoice('${invoice.id}')" class="btn-sm btn-warning">作废</button>`);
    }

    return buttons.join('');
}

// 显示创建模态框
function showCreateModal() {
    currentInvoice = null;
    document.getElementById('modalTitle').textContent = '创建发票';
    document.getElementById('invoiceForm').reset();
    document.getElementById('invoiceModal').style.display = 'block';
}

// 保存发票
async function saveInvoice() {
    const form = document.getElementById('invoiceForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const url = currentInvoice
            ? `/api/invoices/${currentInvoice.id}`
            : '/api/invoices';

        const method = currentInvoice ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('保存失败');

        showSuccess('发票保存成功');
        closeModal();
        loadInvoices();
    } catch (error) {
        showError(error.message);
    }
}

// 开具发票
async function issueInvoice(id) {
    // 显示文件上传对话框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf,image/*';

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 1. 上传文件
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (!uploadResponse.ok) throw new Error('文件上传失败');

            const uploadData = await uploadResponse.json();

            // 2. 开具发票
            const response = await fetch(`/api/invoices/${id}/issue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    file_url: uploadData.url,
                    file_name: file.name,
                    file_size: file.size
                })
            });

            if (!response.ok) throw new Error('开具发票失败');

            showSuccess('发票开具成功');
            loadInvoices();
        } catch (error) {
            showError(error.message);
        }
    };

    fileInput.click();
}

// 辅助函数
function getToken() {
    return localStorage.getItem('token') || '';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

function getInvoiceTypeName(type) {
    const types = {
        'vat_normal': '增值税普通发票',
        'vat_special': '增值税专用发票',
        'electronic': '电子发票',
        'paper': '纸质发票'
    };
    return types[type] || type;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending': '<span class="badge badge-warning">待开具</span>',
        'issued': '<span class="badge badge-info">已开具</span>',
        'sent': '<span class="badge badge-primary">已寄出</span>',
        'confirmed': '<span class="badge badge-success">已确认</span>',
        'cancelled': '<span class="badge badge-danger">已作废</span>'
    };
    return statusMap[status] || status;
}

function showSuccess(message) {
    alert(message); // 可以替换为更好的通知组件
}

function showError(message) {
    alert('错误: ' + message);
}

function closeModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}
```

---

## 📌 快速实施步骤

### 第1步：创建剩余Handler文件（约2小时）

基于上面的`InvoiceHandler`模板，创建以下文件：

1. `internal/handler/settlement_order_handler.go` - 参考InvoiceHandler
2. `internal/handler/department_handler.go` - 参考InvoiceHandler
3. `internal/handler/custom_form_handler.go` - 参考InvoiceHandler

**关键点**：
- 参数验证
- JWT中获取用户信息
- 调用Service层方法
- 统一的错误处理

### 第2步：注册路由（30分钟）

在`internal/handler/handler.go`中：
1. 初始化所有Handler
2. 注册API路由组
3. 添加中间件（JWT、RBAC）
4. 注册页面路由

### 第3步：创建前端页面（约3-4小时）

创建4个HTML文件：
1. `web/templates/invoice_management.html` - 参考上面的模板
2. `web/templates/settlement_order_management.html`
3. `web/templates/department_management.html`
4. `web/templates/form_management.html`

**页面结构**：
- Header（使用现有组件）
- Filter Bar（筛选条件）
- Data Table（数据展示）
- Modal（创建/编辑）
- Pagination（分页）

### 第4步：创建JavaScript文件（约2-3小时）

创建4个JS文件：
1. `web/static/js/invoice.js` - 参考上面的模板
2. `web/static/js/settlement.js`
3. `web/static/js/department.js`
4. `web/static/js/form.js`

**核心功能**：
- AJAX请求（fetch API）
- 表格渲染
- 表单提交
- 状态管理

### 第5步：更新菜单（30分钟）

在`web/components/header-unified.html`或相应的sidebar文件中添加菜单项：

```html
<li class="menu-item">
    <a href="/invoice-management">
        <i class="icon-invoice"></i> 发票管理
    </a>
</li>
<li class="menu-item">
    <a href="/settlement-management">
        <i class="icon-settlement"></i> 结算订单
    </a>
</li>
<li class="menu-item">
    <a href="/department-management">
        <i class="icon-department"></i> 部门管理
    </a>
</li>
<li class="menu-item">
    <a href="/form-management">
        <i class="icon-form"></i> 表单管理
    </a>
</li>
```

---

## 🎯 预估工作量

| 任务 | 预估时间 |
|------|---------|
| 创建4个Handler | 2小时 |
| 注册路由 | 30分钟 |
| 创建前端页面 | 3-4小时 |
| 创建JavaScript | 2-3小时 |
| 更新菜单 | 30分钟 |
| 测试和调试 | 2小时 |
| **总计** | **10-12小时** |

---

## ✅ 质量检查清单

### Handler层
- [ ] 所有API endpoint都已实现
- [ ] 参数验证完整
- [ ] 错误处理统一
- [ ] JWT认证集成
- [ ] RBAC权限控制
- [ ] 日志记录

### 前端页面
- [ ] 响应式布局
- [ ] 表单验证
- [ ] 错误提示
- [ ] 加载状态
- [ ] 分页功能
- [ ] 搜索筛选

### 集成测试
- [ ] API请求成功
- [ ] 数据正确显示
- [ ] CRUD操作正常
- [ ] 权限控制生效
- [ ] 状态流转正确

---

## 📚 参考资源

### 现有代码参考
- `internal/handler/merchant_handler.go` - 参考现有Handler实现
- `web/templates/merchant_management.html` - 参考现有页面结构
- `web/static/js/merchant.js` - 参考现有JavaScript

### 文档
- Gin框架文档: https://gin-gonic.com/docs/
- JavaScript Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

---

**最后更新**: 2025-11-17
**文档版本**: v1.0
**预计完成时间**: 10-12小时

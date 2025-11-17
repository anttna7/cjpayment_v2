# 客户管理+收款系统实施文档

## 项目概述

本项目将原有的充值管理系统改造为完整的**客户管理+收款系统**，支持多租户、部门权限管理、发票管理、结算订单等核心功能。

## 技术栈

- **后端**: Go 1.24+ / Gin 1.10+ / PostgreSQL
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **架构**: 单体应用 (Repository-Service-Handler分层架构)

---

## 已完成的工作

### 1. 数据库架构设计 ✅

#### 新增数据库迁移文件 (migrations/)

1. **`20251117140000_create_invoices_table.up.sql`** - 发票管理表
   - 支持多种发票类型（增值税普通、专用、电子、纸质）
   - 完整的发票生命周期（申请→开具→寄出→确认→作废）
   - 关联客户和订单
   - 发票文件管理

2. **`20251117141000_create_settlement_orders_table.up.sql`** - 结算订单表
   - 支持周期结算（起止日期）
   - 关联多个充值订单（JSONB数组）
   - 完整的审批流程（待处理→审核中→已批准→已拒绝→已结算）
   - 结算金额跟踪（总额、已结算、未结算）

3. **`20251117142000_create_custom_forms_system.up.sql`** - 动态表单系统
   - `custom_forms`: 表单定义表
   - `form_fields`: 字段配置表（支持20+种字段类型）
   - `form_submissions`: 提交记录表
   - `form_submission_files`: 附件管理表
   - 支持基于角色和部门的权限控制

4. **`20251117143000_add_scope_to_roles.up.sql`** - 角色作用域扩展
   - 为roles表添加`scope`字段（platform/tenant）
   - 添加`tenant_id`支持租户角色
   - 优化唯一约束（平台角色全局唯一，租户角色租户内唯一）

#### 已存在的表（无需修改）

- `departments` - 部门表
- `user_departments` - 用户-部门关联
- `role_hierarchy` - 角色层级
- `department_roles` - 部门-角色关联
- `customers` - 客户表
- `contracts` - 合同表
- `funds_accounts` - 资金账户（现金+赠款）
- `consume_accounts` - 消费账户
- `ledger_entries` - 账本记录
- `transfer_orders` - 转账订单
- `recharge_orders` - 充值订单

### 2. 数据模型层 ✅

#### 更新的模型 (`internal/repository/models.go`)

1. **Role模型更新**
   - 添加`Scope`字段：区分平台角色和租户角色
   - 添加`TenantID`字段：租户角色关联

2. **新增模型**
   - `Department` - 部门模型
   - `UserDepartment` - 用户-部门关联
   - `RoleHierarchy` - 角色层级
   - `DepartmentRole` - 部门-角色关联
   - `Invoice` - 发票模型
   - `SettlementOrder` - 结算订单模型
   - `CustomForm` - 自定义表单模型
   - `FormField` - 表单字段模型
   - `FormSubmission` - 表单提交记录
   - `FormSubmissionFile` - 表单附件
   - `JSONBArray` - JSONB数组辅助类型

### 3. Repository层（数据访问层） ✅

#### 已实现的Repository

1. **`invoice_repository.go`** - 发票数据访问层
   ```go
   - Create/Update/Delete: 基础CRUD操作
   - GetByID/GetByInvoiceNumber: 查询操作
   - List: 支持多条件筛选（租户、客户、状态、类型、日期范围、金额范围）
   - UpdateStatus: 状态管理
   - IssueInvoice: 开具发票
   - GetPendingInvoices: 获取待处理发票
   ```

2. **`settlement_order_repository.go`** - 结算订单数据访问层
   ```go
   - Create/Update/Delete: 基础CRUD操作
   - GetByID/GetByOrderNumber: 查询操作
   - List: 支持多条件筛选
   - Approve/Reject: 审批操作
   - Settle: 结算操作
   - GetPendingOrders: 获取待处理订单
   ```

3. **`department_repository.go`** - 部门数据访问层
   ```go
   - Create/Update/Delete: 部门CRUD
   - GetByTenantID: 获取租户下所有部门
   - AssignUserToDepartment: 用户-部门关联
   - AssignRoleToDepartment: 部门-角色关联
   - GetUserDepartments: 获取用户所属部门
   - GetDepartmentRoles: 获取部门角色
   ```

4. **`custom_form_repository.go`** - 动态表单数据访问层
   ```go
   // CustomFormRepository
   - Create/Update/Delete: 表单CRUD
   - GetByCode: 按编码查询
   - UpdateStatus: 状态管理

   // FormFieldRepository
   - BatchCreate/BatchDelete: 批量字段操作
   - GetByFormID: 获取表单所有字段

   // FormSubmissionRepository
   - Create/Update: 提交记录管理
   - UpdateStatus: 审核状态更新
   - AddFile/GetFiles: 附件管理
   ```

### 4. Service层（业务逻辑层） ✅ (部分)

#### 已实现的Service

1. **`invoice_service.go`** - 发票服务
   ```go
   - CreateInvoice: 创建发票（自动生成发票号）
   - UpdateInvoice: 更新发票（仅限pending状态）
   - IssueInvoice: 开具发票
   - SendInvoice: 发送发票
   - ConfirmInvoice: 确认发票
   - CancelInvoice: 作废发票
   - GenerateInvoiceNumber: 生成唯一发票号（INV-YYYYMMDD-XXXXXX）
   ```

---

## 待实现的工作

### 1. Service层（业务逻辑层）⏳

需要实现以下Service：

#### 1.1 结算订单Service
```go
// settlement_order_service.go
- CreateSettlementOrder: 创建结算订单
- UpdateSettlementOrder: 更新结算订单
- SubmitForReview: 提交审核
- ApproveOrder: 批准订单
- RejectOrder: 拒绝订单
- SettleOrder: 完成结算
- GenerateOrderNumber: 生成结算单号
- GetRelatedRechargeOrders: 获取关联充值订单
```

#### 1.2 部门管理Service（含权限继承）
```go
// department_service.go
- CreateDepartment: 创建部门
- UpdateDepartment: 更新部门
- DeleteDepartment: 删除部门（级联处理）
- AssignUserToDepartment: 分配用户到部门
- AssignRoleToDepartment: 分配角色到部门
- GetUserEffectivePermissions: 获取用户有效权限（继承部门权限）
- GetDepartmentPermissions: 获取部门权限（聚合所有角色权限）
```

#### 1.3 动态表单Service
```go
// custom_form_service.go
- CreateForm: 创建表单（含字段）
- UpdateForm: 更新表单
- PublishForm: 发布表单
- ArchiveForm: 归档表单
- SubmitForm: 提交表单
- ReviewSubmission: 审核提交
- ValidateSubmission: 验证提交数据
```

### 2. Handler层（HTTP接口层）⏳

需要实现以下Handler：

#### 2.1 发票管理Handler
```go
// invoice_handler.go
POST   /api/invoices              - 创建发票
GET    /api/invoices/:id          - 获取发票详情
PUT    /api/invoices/:id          - 更新发票
DELETE /api/invoices/:id          - 删除发票
GET    /api/invoices              - 发票列表（分页、筛选）
POST   /api/invoices/:id/issue    - 开具发票
POST   /api/invoices/:id/send     - 发送发票
POST   /api/invoices/:id/confirm  - 确认发票
POST   /api/invoices/:id/cancel   - 作废发票
```

#### 2.2 结算订单Handler
```go
// settlement_order_handler.go
POST   /api/settlement-orders                - 创建结算订单
GET    /api/settlement-orders/:id            - 获取订单详情
PUT    /api/settlement-orders/:id            - 更新订单
GET    /api/settlement-orders                - 订单列表
POST   /api/settlement-orders/:id/submit     - 提交审核
POST   /api/settlement-orders/:id/approve    - 批准订单
POST   /api/settlement-orders/:id/reject     - 拒绝订单
POST   /api/settlement-orders/:id/settle     - 完成结算
```

#### 2.3 部门管理Handler
```go
// department_handler.go
POST   /api/departments                      - 创建部门
GET    /api/departments/:id                  - 获取部门详情
PUT    /api/departments/:id                  - 更新部门
DELETE /api/departments/:id                  - 删除部门
GET    /api/departments                      - 部门列表
POST   /api/departments/:id/users            - 分配用户
POST   /api/departments/:id/roles            - 分配角色
GET    /api/departments/:id/permissions      - 获取部门权限
```

#### 2.4 动态表单Handler
```go
// custom_form_handler.go
POST   /api/forms                            - 创建表单
GET    /api/forms/:id                        - 获取表单详情
PUT    /api/forms/:id                        - 更新表单
DELETE /api/forms/:id                        - 删除表单
GET    /api/forms                            - 表单列表
POST   /api/forms/:id/publish                - 发布表单
POST   /api/forms/:id/submissions            - 提交表单
GET    /api/forms/:id/submissions            - 获取提交记录
POST   /api/submissions/:id/review           - 审核提交
```

### 3. 路由注册 ⏳

需要在 `internal/handler/handler.go` 中注册新的路由：

```go
// 发票管理
invoiceGroup := api.Group("/invoices")
invoiceGroup.Use(middleware.JWTAuth(), middleware.RBACMiddleware("invoices"))
{
    invoiceGroup.POST("", h.CreateInvoice)
    invoiceGroup.GET("/:id", h.GetInvoice)
    // ... 其他路由
}

// 结算订单
settlementGroup := api.Group("/settlement-orders")
// ...

// 部门管理
departmentGroup := api.Group("/departments")
// ...

// 动态表单
formGroup := api.Group("/forms")
// ...
```

### 4. 前端页面 ⏳

需要创建以下前端页面（`web/templates/`）：

#### 4.1 发票管理页面
```
invoice_management.html - 发票列表和管理页面
  - 发票列表（分页、筛选、排序）
  - 创建发票弹窗
  - 编辑发票弹窗
  - 开具发票弹窗（文件上传）
  - 发票详情查看
  - 状态流转按钮（发送、确认、作废）
```

#### 4.2 结算订单页面
```
settlement_order_management.html - 结算订单管理页面
  - 订单列表（分页、筛选）
  - 创建结算单弹窗（选择充值订单）
  - 订单详情查看
  - 审批操作界面（批准、拒绝）
  - 结算操作界面
```

#### 4.3 部门管理页面
```
department_management.html - 部门管理页面
  - 部门树形结构展示
  - 创建/编辑部门弹窗
  - 用户分配界面
  - 角色分配界面
  - 权限查看界面
```

#### 4.4 动态表单页面
```
form_management.html - 表单管理页面
  - 表单列表
  - 表单设计器（拖拽式）
  - 字段配置界面
  - 表单预览

form_submission.html - 表单提交页面
  - 动态渲染表单
  - 表单验证
  - 文件上传

form_submissions.html - 提交记录页面
  - 提交列表
  - 详情查看
  - 审核操作
```

### 5. 客户管理增强 ⏳

#### 5.1 导入导出功能
```go
// customer_service.go
- ImportCustomersFromExcel: 从Excel导入客户
- ExportCustomersToExcel: 导出客户到Excel
- BatchCreateCustomers: 批量创建客户
- BatchUpdateCustomers: 批量更新客户
- ValidateImportData: 验证导入数据
```

#### 5.2 前端增强
```javascript
// customer_management.html 增强功能
- Excel导入按钮和上传界面
- 导出按钮（支持筛选条件）
- 批量选择和批量操作
- 数据验证提示
```

### 6. 订单流转工作流完善 ⏳

需要实现完整的订单流转工作流：

```
客户发起充值
  ↓
生成充值订单 (status: pending)
  ↓
客户完成支付
  ↓
系统收到通知 (status: paid)
  ↓
财务审核充值 (status: confirmed)
  ↓
自动更新资金账户余额 (funds_accounts)
  - cash_balance += 充值金额
  - 记录账本 (ledger_entries)
  ↓
业务员创建转账订单 (transfer_orders)
  ↓
从资金账户划转到消费账户
  - funds_accounts.balance -= 转账金额
  - consume_accounts.balance += 转账金额
  - 记录账本
  ↓
客户可用余额更新完成
```

实现要点：
```go
// recharge_workflow_service.go
- HandlePaymentNotification: 处理支付通知
- AutoUpdateFundsAccount: 自动更新资金账户
- CreateLedgerEntry: 创建账本记录
- ProcessTransfer: 处理转账
- ValidateBalance: 余额验证
```

### 7. 菜单结构调整 ⏳

更新管理后台菜单结构（`web/templates/partials/sidebar.html`）：

```html
仪表台 (Dashboard)
├── 概览统计

角色管理 (Role Management)
├── 平台角色
├── 租户角色
└── 角色权限配置

权限管理 (Permission Management)
├── 部门管理
├── 权限组设置
└── 权限分配

客户管理 (Customer Management)
├── 客户列表
├── 合同归档
├── 导入客户
└── 导出客户

订单管理 (Order Management)
├── 充值订单
├── 结算订单
└── 转账订单

财务管理 (Finance Management)
├── 充值审核
├── 发票管理
└── 资金账户

表单管理 (Form Management)
├── 表单设计
├── 表单列表
└── 提交记录
```

---

## 核心功能说明

### 1. 多租户架构

- **租户（Tenant）**: 使用`merchants`表作为租户
- **租户隔离**: 所有业务数据都关联`tenant_id`
- **租户角色**: 每个租户可以自定义角色和权限

### 2. 角色权限体系

#### 平台角色 (scope=platform)
- 超级管理员 (super_admin)
- 平台管理员 (platform_admin)
- 全局唯一，不属于任何租户

#### 租户角色 (scope=tenant)
- 租户管理员 (tenant_admin)
- 财务人员 (finance)
- 业务人员 (sales)
- 客服人员 (customer_service)
- 在租户内唯一

#### 部门权限继承
- 用户继承所属部门的所有角色权限
- 部门可以分配多个角色
- 用户的最终权限 = 直接分配的权限 + 部门继承的权限

### 3. 订单流转流程

```
充值订单 (recharge_orders)
  status: pending → paid → confirmed → settled

结算订单 (settlement_orders)
  status: pending → reviewing → approved/rejected → settled

转账订单 (transfer_orders)
  status: pending → completed/failed
```

### 4. 余额账户系统

#### 资金账户 (funds_accounts)
- `cash_balance`: 现金余额
- `grant_balance`: 赠款余额
- 充值到账后更新

#### 消费账户 (consume_accounts)
- `balance`: 可用余额
- 从资金账户转账而来
- 用于广告投放等业务消耗

#### 账本记录 (ledger_entries)
- 记录所有余额变动
- 支持追溯和审计
- 分类：充值(recharge)、转账(transfer)、消费(consume)、退款(refund)

---

## 代码组织结构

```
cjpayment_v2/
├── cmd/
│   └── api/
│       └── main.go                    # 应用入口
├── internal/
│   ├── repository/                    # 数据访问层
│   │   ├── models.go                  # 数据模型
│   │   ├── invoice_repository.go      # ✅ 发票仓库
│   │   ├── settlement_order_repository.go  # ✅ 结算订单仓库
│   │   ├── department_repository.go   # ✅ 部门仓库
│   │   └── custom_form_repository.go  # ✅ 动态表单仓库
│   ├── service/                       # 业务逻辑层
│   │   ├── invoice_service.go         # ✅ 发票服务
│   │   ├── settlement_order_service.go # ⏳ 待实现
│   │   ├── department_service.go      # ⏳ 待实现
│   │   └── custom_form_service.go     # ⏳ 待实现
│   └── handler/                       # HTTP处理层
│       ├── invoice_handler.go         # ⏳ 待实现
│       ├── settlement_order_handler.go # ⏳ 待实现
│       ├── department_handler.go      # ⏳ 待实现
│       └── custom_form_handler.go     # ⏳ 待实现
├── migrations/                        # 数据库迁移
│   ├── 20251117140000_create_invoices_table.up.sql           # ✅
│   ├── 20251117141000_create_settlement_orders_table.up.sql  # ✅
│   ├── 20251117142000_create_custom_forms_system.up.sql      # ✅
│   └── 20251117143000_add_scope_to_roles.up.sql              # ✅
└── web/
    ├── templates/                     # HTML模板
    │   ├── invoice_management.html    # ⏳ 待创建
    │   ├── settlement_order_management.html  # ⏳ 待创建
    │   ├── department_management.html # ⏳ 待创建
    │   └── form_management.html       # ⏳ 待创建
    ├── static/
    │   ├── js/                        # JavaScript文件
    │   │   ├── invoice.js             # ⏳ 待创建
    │   │   ├── settlement.js          # ⏳ 待创建
    │   │   ├── department.js          # ⏳ 待创建
    │   │   └── form.js                # ⏳ 待创建
    │   └── css/                       # 样式文件
    └── components/                    # 可复用组件
```

---

## 下一步操作建议

### 优先级 1: 核心功能完成
1. 实现剩余的Service层（结算订单、部门、表单）
2. 实现Handler层（所有模块）
3. 注册路由和中间件

### 优先级 2: 前端界面
1. 创建发票管理页面
2. 创建结算订单页面
3. 创建部门管理页面

### 优先级 3: 增强功能
1. 客户导入导出
2. 订单流转工作流
3. 动态表单设计器

### 优先级 4: 测试和优化
1. 单元测试
2. 集成测试
3. 性能优化

---

## Git提交历史

```
commit 5df354a - feat: Implement repository layer (2025-11-17)
  - InvoiceRepository
  - SettlementOrderRepository
  - DepartmentRepository
  - CustomFormRepository
  - InvoiceService

commit 0002975 - feat: Add database schema and models (2025-11-17)
  - 发票管理表
  - 结算订单表
  - 动态表单系统
  - 角色作用域扩展
  - 所有新模型定义
```

---

## 联系和支持

如有问题或需要进一步的开发支持，请参考以下资源：

- 项目文档: `/docs`
- 数据库设计: `/migrations`
- API文档: (待生成 Swagger文档)

---

**文档版本**: v1.0
**最后更新**: 2025-11-17
**项目状态**: 开发中 (约40%完成)

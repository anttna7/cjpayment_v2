# CJPayment - 客户管理与收款系统

CJPayment是一个现代化的企业客户管理与收款系统，基于Go语言和单体架构设计，用于管理客户信息、充值业务、发票管理、结算订单等全流程业务。

## 系统概述

本系统采用**单体架构（Monolithic Architecture）**设计，所有功能模块集成在一个应用程序中，便于部署、维护和管理。系统支持多租户（Multi-tenancy），提供完整的客户生命周期管理和财务管理功能。

## 核心功能模块

### 1. 客户管理系统
- 客户信息管理（CRUD）
- 客户合同管理
- 客户批量导入/导出（CSV）
- 客户资金账户管理
- 客户消费账户管理

### 2. 充值管理系统
- 对公对私充值流程管理
- 智能收款账户轮询
- 充值订单全生命周期跟踪
- 财务审核工作流
- 自动到账通知

### 3. 发票管理系统
- 发票开具与管理
- 支持多种发票类型（增值税普通/专用发票、电子/纸质发票）
- 发票生命周期管理（待开票→已开票→已发送→已确认）
- 发票文件管理
- 发票作废功能

### 4. 结算订单系统
- 结算单创建与管理
- 结算期间管理
- 审批工作流（提交→审核→批准→结算）
- 关联充值订单追踪
- 已结/未结金额统计

### 5. 部门管理系统
- 部门组织架构管理
- 用户-部门关联管理
- 部门-角色权限管理
- **权限继承机制**（用户权限 = 直接权限 + 部门继承权限）
- 部门用户分配

### 6. 动态表单系统
- 自定义表单构建器
- 20+种字段类型支持
- 表单发布/归档管理
- 表单提交与审核
- 表单数据统计

### 7. 权限管理系统
- 多角色权限管理（平台角色 + 租户角色）
- 基于RBAC的权限控制
- 细粒度权限配置（资源.操作）
- 部门权限继承
- JWT身份认证

### 8. 数据报表系统
- 完善的数据报表功能
- 多维度数据查询
- 时间序列分析
- 实时统计面板
- 数据导出功能

### 9. 支付渠道系统
- 多种支付渠道支持
- 银行转账集成
- 支付回调处理
- 自动对账功能

## 技术栈

### 后端技术
- **语言**: Go 1.25+
- **Web框架**: Gin 1.11+
- **数据库**: PostgreSQL 18+
- **缓存**: Redis 7+
- **ORM**: sqlx (轻量级SQL扩展)
- **认证**: JWT (golang-jwt/jwt/v5)
- **迁移**: golang-migrate/migrate/v4
- **日志**: logrus
- **UUID**: google/uuid
- **金额处理**: shopspring/decimal

### 前端技术
- **标准技术**: 纯 HTML5、CSS3
- **JavaScript**: 原生 ES6+（无框架依赖）
- **样式方案**: 内联CSS + 模块化CSS文件
- **特点**: 轻量级、高性能、易维护

### 架构特点
- **架构模式**: 单体架构（Monolithic）
- **分层设计**: Handler → Service → Repository
- **多租户支持**: 基于 tenant_id 的数据隔离
- **容器化**: Docker + Docker Compose

## 项目结构

```
cjpayment_v2/
├── cmd/                           # 应用程序入口
│   ├── api/                      # API服务器主程序
│   └── migrate/                  # 数据库迁移工具
├── internal/                      # 私有应用程序代码
│   ├── config/                   # 配置管理
│   ├── handler/                  # HTTP处理器层
│   │   ├── invoice_handler.go           # 发票管理Handler
│   │   ├── settlement_order_handler.go  # 结算订单Handler
│   │   ├── department_handler.go        # 部门管理Handler
│   │   ├── custom_form_handler.go       # 表单管理Handler
│   │   └── ...                          # 其他Handler
│   ├── service/                  # 业务逻辑层
│   │   ├── invoice_service.go           # 发票服务
│   │   ├── settlement_order_service.go  # 结算订单服务
│   │   ├── department_service.go        # 部门服务（含权限继承）
│   │   ├── custom_form_service.go       # 表单服务
│   │   └── ...                          # 其他服务
│   ├── repository/               # 数据访问层
│   │   ├── invoice_repository.go        # 发票Repository
│   │   ├── settlement_order_repository.go
│   │   ├── department_repository.go
│   │   ├── custom_form_repository.go
│   │   └── ...                          # 其他Repository
│   ├── middleware/               # 中间件
│   │   ├── jwt_auth.go                  # JWT认证中间件
│   │   └── permission.go                # 权限检查中间件
│   └── controller/               # 控制器
├── migrations/                    # 数据库迁移文件
│   ├── 000001_initial_schema.up.sql
│   ├── 20251117140000_create_invoices_table.up.sql
│   ├── 20251117141000_create_settlement_orders_table.up.sql
│   ├── 20251117142000_create_custom_forms_system.up.sql
│   └── 20251117143000_add_scope_to_roles.up.sql
├── web/                          # 前端资源
│   ├── templates/                # HTML模板
│   │   ├── invoice_management.html
│   │   ├── settlement_order_management.html
│   │   ├── department_management.html
│   │   ├── form_management.html
│   │   └── partials/             # 公共组件
│   │       └── navigation.html   # 导航菜单
│   └── static/                   # 静态资源
│       ├── css/                  # 样式文件
│       └── js/                   # JavaScript文件
├── pkg/                          # 可重用的库代码
│   ├── cache/                    # 缓存工具
│   ├── database/                 # 数据库工具
│   ├── logger/                   # 日志工具
│   ├── security/                 # 安全工具
│   └── reports/                  # 报表工具
├── configs/                      # 配置文件
├── deployments/                  # 部署配置
├── docker-compose.yml            # Docker Compose配置
├── Dockerfile                    # Docker构建文件
└── go.mod                        # Go模块文件
```

## 数据库架构

### 核心表结构
- **merchants** - 租户（商户）表
- **customers** - 客户信息表
- **users** - 用户表
- **roles** - 角色表（支持platform/tenant scope）
- **permissions** - 权限表
- **departments** - 部门表
- **user_departments** - 用户-部门关联表
- **department_roles** - 部门-角色关联表
- **invoices** - 发票表
- **settlement_orders** - 结算订单表
- **custom_forms** - 自定义表单表
- **form_fields** - 表单字段表
- **form_submissions** - 表单提交表
- **recharge_orders** - 充值订单表
- **receive_accounts** - 收款账户表
- **funds_accounts** - 资金账户表
- **consume_accounts** - 消费账户表

## 快速开始

### 环境要求

- Go 1.25+
- PostgreSQL 18+
- Redis 7+
- Docker & Docker Compose (可选)

### 本地开发

#### 1. 克隆项目
```bash
git clone <repository-url>
cd cjpayment_v2
```

#### 2. 安装依赖
```bash
go mod download
```

#### 3. 配置数据库
创建PostgreSQL数据库：
```sql
CREATE DATABASE cjpayment;
CREATE USER cjpayment_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cjpayment TO cjpayment_user;
```

#### 4. 配置环境变量
复制配置文件并修改：
```bash
cp configs/config.yaml.example configs/config.yaml
```

编辑 `configs/config.yaml` 设置数据库连接信息。

#### 5. 运行数据库迁移
```bash
go run cmd/migrate/main.go -direction=up
```

#### 6. 启动服务
```bash
go run cmd/api/main.go
```

服务将在 `http://localhost:8080` 启动。

### Docker部署

#### 开发环境
```bash
docker-compose -f docker-compose.development.yml up -d
```

#### 生产环境
```bash
docker-compose -f docker-compose.production.yml up -d
```

## API接口

### 认证接口
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新Token

### 客户管理接口
- `GET /api/v1/customers` - 客户列表
- `POST /api/v1/customers` - 创建客户
- `GET /api/v1/customers/:id` - 客户详情
- `PUT /api/v1/customers/:id` - 更新客户
- `DELETE /api/v1/customers/:id` - 删除客户
- `POST /api/v1/customers/import` - 批量导入
- `GET /api/v1/customers/export` - 批量导出

### 发票管理接口
- `GET /api/v1/invoices` - 发票列表
- `POST /api/v1/invoices` - 创建发票
- `POST /api/v1/invoices/:id/issue` - 开具发票
- `POST /api/v1/invoices/:id/send` - 发送发票
- `POST /api/v1/invoices/:id/confirm` - 确认发票
- `POST /api/v1/invoices/:id/cancel` - 作废发票

### 结算订单接口
- `GET /api/v1/settlement-orders` - 订单列表
- `POST /api/v1/settlement-orders` - 创建订单
- `POST /api/v1/settlement-orders/:id/submit` - 提交审核
- `POST /api/v1/settlement-orders/:id/approve` - 批准订单
- `POST /api/v1/settlement-orders/:id/reject` - 拒绝订单
- `POST /api/v1/settlement-orders/:id/settle` - 结算订单

### 部门管理接口
- `GET /api/v1/departments` - 部门列表
- `POST /api/v1/departments` - 创建部门
- `POST /api/v1/departments/:departmentId/users/:userId` - 分配用户
- `POST /api/v1/departments/:departmentId/roles/:roleId` - 分配角色
- `GET /api/v1/departments/users/:userId/permissions` - 获取用户有效权限

### 表单管理接口
- `GET /api/v1/forms` - 表单列表
- `POST /api/v1/forms` - 创建表单
- `POST /api/v1/forms/:id/publish` - 发布表单
- `POST /api/v1/forms/:id/submissions` - 提交表单
- `GET /api/v1/submissions/:id` - 提交详情
- `POST /api/v1/submissions/:id/review` - 审核提交

## 开发指南

### 代码规范
- 遵循Go官方代码规范
- 使用 `gofmt` 格式化代码
- 使用 `golint` 进行代码检查
- 编写单元测试，覆盖率 > 80%
- 添加清晰的代码注释

### 分层架构说明

#### Handler层
- 负责HTTP请求处理
- 参数验证和解析
- 响应格式化
- 错误处理

#### Service层
- 核心业务逻辑
- 事务管理
- 权限验证
- 业务规则实现

#### Repository层
- 数据库操作
- SQL查询封装
- 数据模型转换

### 数据库迁移

创建新的迁移文件：
```bash
migrate create -ext sql -dir migrations -seq create_new_table
```

执行迁移：
```bash
# 向上迁移
go run cmd/migrate/main.go -direction=up

# 向下迁移
go run cmd/migrate/main.go -direction=down -steps=1
```

## 部署指南

详细的部署文档请参考：
- [部署指南](DEPLOYMENT_GUIDE.md)
- [生产环境部署清单](PRODUCTION_DEPLOYMENT_MANIFEST.md)

### Docker镜像构建

```bash
# 构建标准镜像
docker build -t cjpayment:latest .

# 构建生产镜像
docker build -f Dockerfile.recharge.production -t cjpayment:production .

# 构建阿里云镜像
docker build -f Dockerfile.aliyun -t cjpayment:aliyun .
```

### 环境变量配置

主要环境变量：
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cjpayment
DB_USER=cjpayment_user
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
SERVER_PORT=8080
```

## 监控与维护

### 健康检查
```bash
curl http://localhost:8080/health
```

### 日志查看
```bash
# 查看应用日志
docker-compose logs -f api

# 查看数据库日志
docker-compose logs -f postgres
```

### 性能监控
系统集成了Prometheus和Grafana用于性能监控，访问：
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 版本历史

- **v2.0.0** - 客户管理+收款系统完整版
  - 新增客户管理系统
  - 新增发票管理系统
  - 新增结算订单系统
  - 新增部门管理系统（含权限继承）
  - 新增动态表单系统
  - 升级到单体架构
  - 技术栈升级（Go 1.25+, PostgreSQL 18+, Gin 1.11+）

- **v1.0.0** - 充值管理系统
  - 基础充值管理功能
  - 多角色权限系统
  - 收款账户轮询
  - 数据报表功能

## 许可证

本项目为企业内部使用，版权所有。未经授权不得复制、修改或分发。

## 技术支持

如有问题或建议，请联系开发团队。

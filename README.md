# CJPayment - 企业内部支付系统

CJPayment是一个现代化的企业内部支付管理系统，基于Go语言和微服务架构设计，用于管理公司内部的充值业务。

## 功能特性

- 对公对私充值流程管理
- 多角色权限管理系统
- 智能收款账户轮询
- 完善的数据报表功能
- 广告账户系统对接
- 多种支付渠道支持

## 技术栈

- **后端**: Go 1.24+, Gin 1.10+
- **数据库**: PostgreSQL 17+
- **缓存**: Redis 7+
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **容器化**: Docker, Docker Compose

## 项目结构

```
cjpayment/
├── cmd/                    # 应用程序入口
│   ├── api/               # API服务器
│   └── migrate/           # 数据库迁移工具
├── internal/              # 私有应用程序代码
│   ├── config/           # 配置管理
│   ├── handler/          # HTTP处理器
│   ├── middleware/       # 中间件
│   ├── model/            # 数据模型
│   ├── repository/       # 数据访问层
│   └── service/          # 业务逻辑层
├── pkg/                   # 可重用的库代码
│   ├── cache/            # 缓存工具
│   ├── database/         # 数据库工具
│   ├── logger/           # 日志工具
│   └── utils/            # 通用工具
├── configs/               # 配置文件
├── migrations/            # 数据库迁移文件
├── deployments/           # 部署配置
├── docs/                  # 文档
├── scripts/               # 脚本文件
└── go.mod                # Go模块文件
```

## 快速开始

### 环境要求

- Go 1.24+
- PostgreSQL 17+
- Redis 7+

### 安装依赖

```bash
go mod download
```

### 配置数据库

1. 创建PostgreSQL数据库
2. 复制并修改配置文件：
   ```bash
   cp configs/config.yaml.example configs/config.yaml
   ```
3. 运行数据库迁移：
   ```bash
   go run cmd/migrate/main.go -direction=up
   ```

### 启动服务

```bash
go run cmd/api/main.go
```

服务将在 `http://localhost:8080` 启动。

## 开发指南

### 代码规范

- 遵循Go官方代码规范
- 使用gofmt格式化代码
- 编写单元测试
- 添加适当的注释

### 数据库迁移

创建新的迁移文件：
```bash
# 创建迁移文件
migrate create -ext sql -dir migrations -seq create_users_table
```

运行迁移：
```bash
# 向上迁移
go run cmd/migrate/main.go -direction=up

# 向下迁移
go run cmd/migrate/main.go -direction=down -steps=1
```

## 部署

### Docker部署

```bash
# 构建镜像
docker build -t cjpayment:latest .

# 使用docker-compose启动
docker-compose up -d
```

## 文档

### 技术文档
- [API接口文档](docs/API.md) - 完整的API接口说明和示例
- [部署运维文档](docs/DEPLOYMENT.md) - 系统部署和运维指南
- [开发者指南](docs/DEVELOPER_GUIDE.md) - 开发规范和最佳实践
- [Docker部署](docs/DOCKER.md) - 容器化部署指南
- [数据库迁移](docs/MIGRATIONS.md) - 数据库迁移管理
- [监控指南](docs/MONITORING.md) - 系统监控和告警配置

### 用户文档
- [用户操作手册](docs/USER_MANUAL.md) - 系统功能使用指南
- [管理员指南](docs/ADMIN_GUIDE.md) - 系统管理和配置指南
- [常见问题解答](docs/FAQ.md) - 常见问题和解决方案

## 许可证

本项目为企业内部使用，版权所有。
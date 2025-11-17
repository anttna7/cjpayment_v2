# CJPayment 开发者指南

## 概述

本文档为CJPayment系统的开发者提供详细的开发指南，包括项目结构、开发规范、测试指南、调试技巧等内容。

## 开发环境搭建

### 1. 环境要求

- Go 1.24+
- PostgreSQL 17+
- Redis 7+
- Docker 20.10+
- Git 2.30+
- IDE: VS Code / GoLand (推荐)

### 2. 克隆项目

```bash
git clone https://github.com/company/cjpayment.git
cd cjpayment
```

### 3. 安装依赖

```bash
# 安装Go依赖
go mod download

# 安装开发工具
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
go install github.com/swaggo/swag/cmd/swag@latest
go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

### 4. 配置开发环境

```bash
# 复制配置文件
cp configs/config.yaml.example configs/config.development.yaml

# 启动开发环境依赖服务
docker-compose -f docker-compose.development.yml up -d postgres redis

# 运行数据库迁移
go run cmd/migrate/main.go -direction=up

# 启动应用
go run cmd/api/main.go
```

### 5. IDE配置

#### VS Code配置

创建 `.vscode/settings.json`:

```json
{
  "go.toolsManagement.checkForUpdates": "local",
  "go.useLanguageServer": true,
  "go.gopath": "",
  "go.goroot": "",
  "go.lintTool": "golangci-lint",
  "go.lintFlags": [
    "--fast"
  ],
  "go.testFlags": ["-v"],
  "go.testTimeout": "30s",
  "go.coverOnSave": true,
  "go.coverOnSingleTest": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch API Server",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/cmd/api/main.go",
      "env": {
        "CONFIG_FILE": "${workspaceFolder}/configs/config.development.yaml"
      },
      "args": []
    },
    {
      "name": "Run Tests",
      "type": "go",
      "request": "launch",
      "mode": "test",
      "program": "${workspaceFolder}",
      "env": {
        "CONFIG_FILE": "${workspaceFolder}/configs/config.testing.yaml"
      }
    }
  ]
}
```

## 项目架构

### 目录结构详解

```
cjpayment/
├── cmd/                           # 应用程序入口点
│   ├── api/                      # API服务器
│   │   └── main.go              # 主程序入口
│   └── migrate/                 # 数据库迁移工具
│       └── main.go              # 迁移工具入口
├── internal/                     # 私有应用程序代码
│   ├── app/                     # 应用程序初始化
│   ├── config/                  # 配置管理
│   │   └── config.go           # 配置结构和加载
│   ├── handler/                 # HTTP处理器
│   │   ├── handler.go          # 基础处理器
│   │   └── webhook_handler.go  # Webhook处理器
│   ├── middleware/              # 中间件
│   │   ├── auth.go             # 认证中间件
│   │   ├── cache.go            # 缓存中间件
│   │   ├── security.go         # 安全中间件
│   │   └── webhook.go          # Webhook中间件
│   ├── model/                   # 数据模型
│   ├── repository/              # 数据访问层
│   │   ├── interfaces.go       # 接口定义
│   │   ├── base.go             # 基础仓库
│   │   ├── user_repository.go  # 用户仓库
│   │   └── ...                 # 其他仓库
│   └── service/                 # 业务逻辑层
│       ├── interfaces.go       # 服务接口
│       ├── auth_service.go     # 认证服务
│       ├── recharge_service.go # 充值服务
│       └── ...                 # 其他服务
├── pkg/                         # 可重用的库代码
│   ├── cache/                  # 缓存工具
│   ├── database/               # 数据库工具
│   ├── logger/                 # 日志工具
│   ├── migration/              # 迁移工具
│   ├── security/               # 安全工具
│   └── utils/                  # 通用工具
├── configs/                     # 配置文件
├── migrations/                  # 数据库迁移文件
├── web/                        # 前端资源
│   ├── static/                 # 静态文件
│   └── templates/              # 模板文件
├── tests/                      # 测试文件
│   ├── integration/            # 集成测试
│   └── performance/            # 性能测试
├── scripts/                    # 脚本文件
├── docs/                       # 文档
└── deployments/                # 部署配置
```

### 分层架构

```
┌─────────────────────────────────────┐
│            Handler Layer            │  HTTP处理层
├─────────────────────────────────────┤
│           Middleware Layer          │  中间件层
├─────────────────────────────────────┤
│           Service Layer             │  业务逻辑层
├─────────────────────────────────────┤
│          Repository Layer           │  数据访问层
├─────────────────────────────────────┤
│            Model Layer              │  数据模型层
└─────────────────────────────────────┘
```

## 开发规范

### 1. 代码规范

#### Go代码规范

遵循官方Go代码规范：

```go
// 包注释
// Package service provides business logic implementations.
package service

import (
    "context"
    "fmt"
    "time"
    
    "github.com/company/cjpayment/internal/model"
    "github.com/company/cjpayment/internal/repository"
)

// Service接口定义
type RechargeService interface {
    // CreateRecharge creates a new recharge order
    CreateRecharge(ctx context.Context, req *CreateRechargeRequest) (*model.RechargeOrder, error)
    // GetRecharge retrieves a recharge order by ID
    GetRecharge(ctx context.Context, id string) (*model.RechargeOrder, error)
}

// 结构体定义
type rechargeService struct {
    repo   repository.RechargeRepository
    logger logger.Logger
}

// 构造函数
func NewRechargeService(repo repository.RechargeRepository, logger logger.Logger) RechargeService {
    return &rechargeService{
        repo:   repo,
        logger: logger,
    }
}

// 方法实现
func (s *rechargeService) CreateRecharge(ctx context.Context, req *CreateRechargeRequest) (*model.RechargeOrder, error) {
    // 参数验证
    if err := s.validateCreateRequest(req); err != nil {
        return nil, fmt.Errorf("invalid request: %w", err)
    }
    
    // 业务逻辑
    order := &model.RechargeOrder{
        ID:          generateID(),
        OrderNumber: generateOrderNumber(),
        PayerName:   req.PayerName,
        Amount:      req.Amount,
        Status:      model.StatusPending,
        CreatedAt:   time.Now(),
    }
    
    // 数据持久化
    if err := s.repo.Create(ctx, order); err != nil {
        s.logger.Error("failed to create recharge order", "error", err)
        return nil, fmt.Errorf("failed to create order: %w", err)
    }
    
    return order, nil
}

// 私有方法
func (s *rechargeService) validateCreateRequest(req *CreateRechargeRequest) error {
    if req.PayerName == "" {
        return errors.New("payer name is required")
    }
    if req.Amount <= 0 {
        return errors.New("amount must be positive")
    }
    return nil
}
```

#### 命名规范

- **包名**: 小写，简短，有意义
- **接口名**: 以`er`结尾，如`Reader`, `Writer`
- **结构体**: 驼峰命名，首字母大写表示公开
- **方法名**: 驼峰命名，首字母大写表示公开
- **变量名**: 驼峰命名，简短有意义
- **常量名**: 全大写，下划线分隔

#### 错误处理

```go
// 定义错误类型
var (
    ErrRechargeNotFound = errors.New("recharge order not found")
    ErrInvalidAmount    = errors.New("invalid amount")
    ErrExceedLimit      = errors.New("exceed limit")
)

// 错误包装
func (s *service) ProcessRecharge(ctx context.Context, id string) error {
    order, err := s.repo.GetByID(ctx, id)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            return ErrRechargeNotFound
        }
        return fmt.Errorf("failed to get recharge order: %w", err)
    }
    
    // 处理逻辑...
    
    return nil
}
```

### 2. 数据库规范

#### 表命名规范

- 表名使用复数形式，如`users`, `recharge_orders`
- 使用下划线分隔单词
- 避免使用保留字

#### 字段命名规范

```sql
CREATE TABLE recharge_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL,
    payer_name VARCHAR(100) NOT NULL,
    payer_account VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);
```

#### 索引规范

```sql
-- 主键索引（自动创建）
-- 唯一索引
CREATE UNIQUE INDEX idx_recharge_orders_order_number ON recharge_orders(order_number);

-- 普通索引
CREATE INDEX idx_recharge_orders_status ON recharge_orders(status);
CREATE INDEX idx_recharge_orders_created_at ON recharge_orders(created_at);

-- 复合索引
CREATE INDEX idx_recharge_orders_status_created_at ON recharge_orders(status, created_at);
```

### 3. API设计规范

#### RESTful API设计

```go
// 路由定义
func (h *Handler) RegisterRoutes(r *gin.Engine) {
    api := r.Group("/api/v1")
    
    // 认证路由
    auth := api.Group("/auth")
    {
        auth.POST("/login", h.Login)
        auth.POST("/refresh", h.RefreshToken)
        auth.POST("/logout", h.Logout)
    }
    
    // 需要认证的路由
    protected := api.Group("")
    protected.Use(h.AuthMiddleware())
    {
        // 充值管理
        recharge := protected.Group("/recharge")
        {
            recharge.POST("/orders", h.CreateRechargeOrder)
            recharge.GET("/orders", h.ListRechargeOrders)
            recharge.GET("/orders/:id", h.GetRechargeOrder)
            recharge.PUT("/orders/:id", h.UpdateRechargeOrder)
            recharge.DELETE("/orders/:id", h.DeleteRechargeOrder)
            recharge.POST("/orders/:id/voucher", h.UploadVoucher)
            recharge.POST("/orders/:id/audit", h.AuditRechargeOrder)
        }
        
        // 商户管理
        merchants := protected.Group("/merchants")
        {
            merchants.POST("", h.CreateMerchant)
            merchants.GET("", h.ListMerchants)
            merchants.GET("/:id", h.GetMerchant)
            merchants.PUT("/:id", h.UpdateMerchant)
            merchants.DELETE("/:id", h.DeleteMerchant)
        }
    }
}
```

#### 请求响应格式

```go
// 统一响应结构
type Response struct {
    Code      string      `json:"code"`
    Message   string      `json:"message"`
    Data      interface{} `json:"data,omitempty"`
    Details   string      `json:"details,omitempty"`
    TraceID   string      `json:"trace_id"`
    Timestamp time.Time   `json:"timestamp"`
}

// 分页响应
type PageResponse struct {
    Items      interface{} `json:"items"`
    Total      int64       `json:"total"`
    Page       int         `json:"page"`
    PageSize   int         `json:"page_size"`
    TotalPages int         `json:"total_pages"`
}

// 成功响应
func SuccessResponse(c *gin.Context, data interface{}) {
    c.JSON(http.StatusOK, Response{
        Code:      "00000",
        Message:   "success",
        Data:      data,
        TraceID:   getTraceID(c),
        Timestamp: time.Now(),
    })
}

// 错误响应
func ErrorResponse(c *gin.Context, code string, message string, details string) {
    c.JSON(getHTTPStatus(code), Response{
        Code:      code,
        Message:   message,
        Details:   details,
        TraceID:   getTraceID(c),
        Timestamp: time.Now(),
    })
}
```

## 测试指南

### 1. 单元测试

#### 测试文件结构

```
internal/service/
├── recharge_service.go
├── recharge_service_test.go
├── auth_service.go
└── auth_service_test.go
```

#### 测试示例

```go
package service

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    
    "github.com/company/cjpayment/internal/model"
    "github.com/company/cjpayment/internal/repository/mocks"
)

func TestRechargeService_CreateRecharge(t *testing.T) {
    tests := []struct {
        name    string
        request *CreateRechargeRequest
        setup   func(*mocks.RechargeRepository)
        want    *model.RechargeOrder
        wantErr bool
    }{
        {
            name: "successful creation",
            request: &CreateRechargeRequest{
                PayerName:    "张三",
                PayerAccount: "6222021234567890",
                Amount:       1000.00,
                MerchantName: "测试商户",
            },
            setup: func(repo *mocks.RechargeRepository) {
                repo.On("Create", mock.Anything, mock.AnythingOfType("*model.RechargeOrder")).
                    Return(nil)
            },
            want: &model.RechargeOrder{
                PayerName: "张三",
                Amount:    1000.00,
                Status:    model.StatusPending,
            },
            wantErr: false,
        },
        {
            name: "invalid amount",
            request: &CreateRechargeRequest{
                PayerName: "张三",
                Amount:    -100.00,
            },
            setup:   func(repo *mocks.RechargeRepository) {},
            want:    nil,
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // 创建mock
            mockRepo := new(mocks.RechargeRepository)
            mockLogger := new(mocks.Logger)
            
            // 设置mock期望
            tt.setup(mockRepo)
            
            // 创建服务
            service := NewRechargeService(mockRepo, mockLogger)
            
            // 执行测试
            got, err := service.CreateRecharge(context.Background(), tt.request)
            
            // 断言结果
            if tt.wantErr {
                assert.Error(t, err)
                assert.Nil(t, got)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, got)
                assert.Equal(t, tt.want.PayerName, got.PayerName)
                assert.Equal(t, tt.want.Amount, got.Amount)
                assert.Equal(t, tt.want.Status, got.Status)
            }
            
            // 验证mock调用
            mockRepo.AssertExpectations(t)
        })
    }
}

// 基准测试
func BenchmarkRechargeService_CreateRecharge(b *testing.B) {
    mockRepo := new(mocks.RechargeRepository)
    mockLogger := new(mocks.Logger)
    
    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*model.RechargeOrder")).
        Return(nil)
    
    service := NewRechargeService(mockRepo, mockLogger)
    request := &CreateRechargeRequest{
        PayerName:    "张三",
        PayerAccount: "6222021234567890",
        Amount:       1000.00,
        MerchantName: "测试商户",
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = service.CreateRecharge(context.Background(), request)
    }
}
```

### 2. 集成测试

```go
package integration

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
    
    "github.com/company/cjpayment/internal/handler"
    "github.com/company/cjpayment/internal/service"
)

type RechargeTestSuite struct {
    suite.Suite
    router  *gin.Engine
    handler *handler.Handler
}

func (suite *RechargeTestSuite) SetupSuite() {
    // 设置测试环境
    gin.SetMode(gin.TestMode)
    
    // 初始化依赖
    db := setupTestDB()
    cache := setupTestCache()
    
    // 创建服务
    rechargeService := service.NewRechargeService(db, cache)
    
    // 创建处理器
    suite.handler = handler.NewHandler(rechargeService)
    
    // 设置路由
    suite.router = gin.New()
    suite.handler.RegisterRoutes(suite.router)
}

func (suite *RechargeTestSuite) TearDownSuite() {
    // 清理测试环境
    cleanupTestDB()
}

func (suite *RechargeTestSuite) TestCreateRechargeOrder() {
    // 准备测试数据
    request := map[string]interface{}{
        "payer_name":    "张三",
        "payer_account": "6222021234567890",
        "amount":        "1000.00",
        "merchant_name": "测试商户",
    }
    
    body, _ := json.Marshal(request)
    
    // 创建HTTP请求
    req, _ := http.NewRequest("POST", "/api/v1/recharge/orders", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+getTestToken())
    
    // 执行请求
    w := httptest.NewRecorder()
    suite.router.ServeHTTP(w, req)
    
    // 验证响应
    assert.Equal(suite.T(), http.StatusOK, w.Code)
    
    var response map[string]interface{}
    err := json.Unmarshal(w.Body.Bytes(), &response)
    assert.NoError(suite.T(), err)
    assert.Equal(suite.T(), "00000", response["code"])
    
    // 验证数据
    data := response["data"].(map[string]interface{})
    assert.Equal(suite.T(), "张三", data["payer_name"])
    assert.Equal(suite.T(), "1000.00", data["amount"])
}

func TestRechargeTestSuite(t *testing.T) {
    suite.Run(t, new(RechargeTestSuite))
}
```

### 3. 运行测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/service

# 运行特定测试
go test -run TestRechargeService_CreateRecharge ./internal/service

# 运行测试并显示覆盖率
go test -cover ./...

# 生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 运行基准测试
go test -bench=. ./...

# 运行集成测试
go test -tags=integration ./tests/integration/...
```

## 调试技巧

### 1. 日志调试

```go
// 使用结构化日志
logger.Info("processing recharge order",
    "order_id", order.ID,
    "amount", order.Amount,
    "status", order.Status,
)

logger.Error("failed to process payment",
    "order_id", order.ID,
    "error", err,
    "stack", string(debug.Stack()),
)

// 条件日志
if logger.IsDebugEnabled() {
    logger.Debug("detailed processing info",
        "request", fmt.Sprintf("%+v", request),
        "response", fmt.Sprintf("%+v", response),
    )
}
```

### 2. 性能分析

```go
// 添加性能分析端点
import _ "net/http/pprof"

func main() {
    // 启动pprof服务器
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()
    
    // 启动主应用
    startApplication()
}
```

```bash
# 分析CPU性能
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# 分析内存使用
go tool pprof http://localhost:6060/debug/pprof/heap

# 分析goroutine
go tool pprof http://localhost:6060/debug/pprof/goroutine
```

### 3. 数据库调试

```go
// 启用SQL日志
db.LogMode(true)

// 使用事务调试
tx := db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
        panic(r)
    }
}()

if err := tx.Error; err != nil {
    return err
}

// 执行操作...

if err := tx.Commit().Error; err != nil {
    return err
}
```

## 部署和发布

### 1. 构建应用

```bash
# 本地构建
make build

# 交叉编译
GOOS=linux GOARCH=amd64 go build -o bin/cjpayment-linux cmd/api/main.go

# Docker构建
docker build -t cjpayment:latest .
```

### 2. 版本管理

```bash
# 创建版本标签
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 查看版本信息
git describe --tags --always
```

### 3. CI/CD配置

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: cjpayment_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v3
      with:
        go-version: 1.24
    
    - name: Cache Go modules
      uses: actions/cache@v3
      with:
        path: ~/go/pkg/mod
        key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
        restore-keys: |
          ${{ runner.os }}-go-
    
    - name: Install dependencies
      run: go mod download
    
    - name: Run tests
      run: go test -v -race -coverprofile=coverage.out ./...
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: cjpayment_test
        DB_USER: postgres
        DB_PASSWORD: postgres
        REDIS_HOST: localhost
        REDIS_PORT: 6379
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.out
    
    - name: Run linter
      uses: golangci/golangci-lint-action@v3
      with:
        version: latest
```

## 常见问题

### 1. 依赖管理

```bash
# 添加依赖
go get github.com/gin-gonic/gin

# 更新依赖
go get -u github.com/gin-gonic/gin

# 清理未使用的依赖
go mod tidy

# 查看依赖树
go mod graph
```

### 2. 性能优化

```go
// 使用对象池减少GC压力
var requestPool = sync.Pool{
    New: func() interface{} {
        return &CreateRechargeRequest{}
    },
}

func (h *Handler) CreateRecharge(c *gin.Context) {
    req := requestPool.Get().(*CreateRechargeRequest)
    defer requestPool.Put(req)
    
    // 重置对象
    *req = CreateRechargeRequest{}
    
    // 处理请求...
}

// 使用缓存减少数据库查询
func (s *service) GetMerchant(ctx context.Context, id string) (*model.Merchant, error) {
    // 先查缓存
    if merchant, err := s.cache.Get(ctx, "merchant:"+id); err == nil {
        return merchant.(*model.Merchant), nil
    }
    
    // 查数据库
    merchant, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // 写入缓存
    s.cache.Set(ctx, "merchant:"+id, merchant, time.Hour)
    
    return merchant, nil
}
```

### 3. 错误处理最佳实践

```go
// 定义业务错误
type BusinessError struct {
    Code    string
    Message string
    Details string
}

func (e *BusinessError) Error() string {
    return e.Message
}

// 错误处理中间件
func ErrorHandlerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        if len(c.Errors) > 0 {
            err := c.Errors.Last().Err
            
            switch e := err.(type) {
            case *BusinessError:
                ErrorResponse(c, e.Code, e.Message, e.Details)
            case *ValidationError:
                ErrorResponse(c, "10002", "Validation failed", e.Error())
            default:
                logger.Error("unhandled error", "error", err)
                ErrorResponse(c, "10001", "Internal server error", "")
            }
        }
    }
}
```

## 贡献指南

### 1. 提交代码

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/new-feature

# 创建Pull Request
```

### 2. 提交信息规范

使用Conventional Commits规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(auth): add JWT token refresh functionality

Add automatic token refresh mechanism to improve user experience.
The refresh token is valid for 7 days and can be used to obtain
a new access token without re-authentication.

Closes #123
```

### 3. 代码审查

代码审查检查清单：

- [ ] 代码符合项目规范
- [ ] 有适当的测试覆盖
- [ ] 文档已更新
- [ ] 性能影响已评估
- [ ] 安全性已考虑
- [ ] 向后兼容性已确认

## 联系方式

- 开发团队: dev@company.com
- 技术讨论: https://github.com/company/cjpayment/discussions
- 问题报告: https://github.com/company/cjpayment/issues
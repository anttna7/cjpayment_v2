# 生产部署文件清单

## 核心应用文件

### Go应用核心
- `go.mod` - Go模块定义
- `go.sum` - 依赖版本锁定
- `main.go` / `demo_server.go` / `frontend_demo.go` - 主程序入口
- `simple_server.go` - 简化服务器

### 源代码目录
- `cmd/` - 命令行工具和服务入口
- `internal/` - 内部应用代码
  - `handler/` - HTTP处理器
  - `service/` - 业务逻辑服务  
  - `repository/` - 数据访问层
  - `middleware/` - 中间件
  - `model/` - 数据模型
- `pkg/` - 可重用包
- `web/` - Web资源
  - `templates/` - HTML模板
  - `static/` - 静态资源(CSS/JS/图片)

## 配置文件

### 应用配置
- `configs/` - 配置文件目录
  - `config.yaml.example` - 配置模板
  - `config.production.yaml` - 生产环境配置
  - `deployment-production.yaml` - 部署配置

### 容器和服务配置
- `Dockerfile` - 容器镜像构建
- `Dockerfile.recharge` - 充值系统容器
- `Dockerfile.recharge.production` - 生产环境充值系统
- `docker-compose.production.yml` - 生产环境容器编排
- `nginx/` - 反向代理配置

## 数据库

### 迁移文件
- `migrations/` - 数据库迁移脚本
  - `*.up.sql` - 升级脚本
  - `*.down.sql` - 回滚脚本

## 构建和部署

### 构建脚本
- `Makefile` - 构建配置
- `Makefile.recharge` - 充值系统构建
- `scripts/build-production.sh` - 生产构建脚本
- `scripts/deploy.sh` - 部署脚本
- `scripts/validate-environment.sh` - 环境验证

### 系统服务
- `configs/systemd/` - 系统服务配置

## 监控和运维

### 监控配置
- `configs/monitoring.yaml` - 监控配置
- `configs/prometheus.yml` - Prometheus配置
- `configs/grafana-dashboard.json` - Grafana仪表板
- `configs/alertmanager.yml` - 告警配置

### 健康检查
- `scripts/health-check.sh` - 健康检查脚本
- `scripts/healthcheck.sh` - 容器健康检查

## 文档

### 部署文档
- `README.md` - 项目说明
- `docs/DEPLOYMENT.md` - 部署指南
- `docs/API_REFERENCE.md` - API文档
- `docs/USER_MANUAL.md` - 用户手册
- `docs/ADMIN_GUIDE.md` - 管理员指南

## 不需要部署的文件

### 调试和测试文件
- `debug-archive/` - 调试文件归档
- `debug/` - 当前调试文件
- `tmp/` - 临时文件
- `node_modules/` - Node.js依赖
- `tests/` - 测试文件
- `*.log` - 日志文件
- `*.db` - 本地数据库文件

### 开发工具文件
- `package.json` / `package-lock.json` - 前端开发依赖
- `.vscode/` / `.idea/` - IDE配置
- `debug-file-classification.md` - 调试文件分类

### 临时和备份文件
- `*.bak` - 备份文件
- `*.tmp` / `*.temp` - 临时文件
- `cleanup_temp_files.sh` - 清理脚本

## 部署检查清单

### 环境验证
- [ ] 检查生产配置文件存在且正确
- [ ] 验证数据库迁移完整
- [ ] 确认静态资源完整
- [ ] 检查容器镜像构建成功

### 安全检查  
- [ ] 移除所有调试代码
- [ ] 清理敏感信息和测试数据
- [ ] 验证访问权限配置
- [ ] 确认HTTPS证书配置

### 性能优化
- [ ] 压缩静态资源
- [ ] 启用Gzip压缩
- [ ] 配置缓存策略
- [ ] 优化数据库连接池

## 部署后验证

### 功能验证
- [ ] 主要业务流程测试
- [ ] API接口健康检查
- [ ] 用户界面完整性检查
- [ ] 数据库连接正常

### 监控验证
- [ ] 应用指标采集正常  
- [ ] 日志收集配置正确
- [ ] 告警规则生效
- [ ] 仪表板数据显示正常
# CJPayment阿里云部署文件清单

## 📦 必需文件列表

### 主要部署文件
- [ ] `Dockerfile.aliyun` - 阿里云优化的Docker镜像构建文件
- [ ] `docker-compose.aliyun.yml` - 阿里云Docker Compose配置
- [ ] `.env.aliyun` - 阿里云环境变量模板
- [ ] `deploy-aliyun.sh` - 自动化部署脚本
- [ ] `阿里云部署指南.md` - 详细部署文档

### 核心应用文件
- [ ] `frontend_demo.go` - 主应用程序
- [ ] `go.mod` & `go.sum` - Go模块依赖
- [ ] `web/` 目录 - 完整的前端资源
  - [ ] `web/templates/` - HTML模板
  - [ ] `web/static/` - CSS、JS、图片资源
- [ ] `internal/` 目录 - 内部代码包
- [ ] `pkg/` 目录 - 共享代码包

### 配置文件
- [ ] `nginx/conf.d/cjpayment.conf` - Nginx反向代理配置
- [ ] `configs/mysql/my.cnf` - MySQL优化配置
- [ ] `configs/redis/redis.conf` - Redis优化配置

### 可选文件（建议包含）
- [ ] `README.md` - 项目说明文档
- [ ] `DEPLOYMENT_GUIDE.md` - 通用部署指南
- [ ] `.gitignore` - Git忽略文件配置

## 📝 部署前准备

### 1. 服务器准备
```bash
# 最小配置
CPU: 2核
内存: 4GB
存储: 40GB SSD
系统: Ubuntu 20.04+
```

### 2. 环境依赖
- [ ] Docker (latest)
- [ ] Docker Compose (v2.0+)
- [ ] Git
- [ ] Curl/Wget

### 3. 网络配置
- [ ] 域名解析（如使用域名）
- [ ] 防火墙端口开放（80, 443, 8091）
- [ ] SSL证书准备（可选，支持Let's Encrypt）

## 🚀 快速部署命令

```bash
# 1. 克隆代码到服务器
git clone <your-repo> cjpayment && cd cjpayment

# 2. 配置环境变量
cp .env.aliyun .env
vim .env  # 修改密码等配置

# 3. 执行部署
./deploy-aliyun.sh

# 4. 启用监控（可选）
./deploy-aliyun.sh --with-monitoring
```

## 🔧 配置要点

### 必须修改的配置项
```bash
# .env文件中必须修改的值：
MYSQL_ROOT_PASSWORD=your_strong_password
DB_PASSWORD=your_db_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret
DOMAIN=your-domain.com
```

### Nginx配置
- 修改 `nginx/conf.d/cjpayment.conf` 中的域名
- 配置SSL证书路径（如使用HTTPS）

## 📊 部署后验证

### 健康检查
- [ ] http://your-server:8091/health - 应用健康状态
- [ ] http://your-server/health - Nginx健康状态
- [ ] MySQL连接测试
- [ ] Redis连接测试

### 服务状态
```bash
docker-compose -f docker-compose.aliyun.yml ps
```

### 日志检查
```bash
docker-compose -f docker-compose.aliyun.yml logs -f
```

## ⚠️ 注意事项

1. **安全性**：
   - 修改所有默认密码
   - 使用强密码
   - 配置防火墙
   - 定期更新系统

2. **备份策略**：
   - 配置自动备份
   - 测试恢复流程
   - 异地备份存储

3. **监控告警**：
   - 设置资源监控
   - 配置异常告警
   - 定期健康检查

## 📞 支持联系

如遇部署问题：
1. 查看部署日志
2. 检查配置文件
3. 参考故障排除文档
4. 联系技术支持团队

---

**部署成功标志**：所有服务正常运行，健康检查通过，可通过浏览器正常访问系统界面。
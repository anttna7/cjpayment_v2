# CJPayment 部署包

版本: 20250926_101758
编译时间: 2025年 9月26日 星期五 10时17分59秒 CST
目标平台: linux/amd64

## 快速启动

### Linux系统:
```bash
# 给执行权限
chmod +x cjpayment

# 直接运行
./cjpayment

# 或使用启动脚本（后台运行）
./start.sh
```

### 访问地址
- 主页: http://localhost:8091
- 健康检查: http://localhost:8091/health

### 停止服务
```bash
# 如果使用start.sh启动
./stop.sh

# 或直接kill进程
kill $(cat cjpayment.pid)
```

### 配置说明
- 默认端口: 8091
- 日志文件: cjpayment.log
- 静态资源: web/目录

### 环境变量
可通过环境变量进行配置:
- PORT: 服务端口 (默认8091)
- GIN_MODE: 运行模式 (推荐生产环境设为release)

### 目录结构
- cjpayment: 主程序
- web/: 前端资源
- start.sh: 启动脚本 (仅Linux)
- stop.sh: 停止脚本 (仅Linux)
- README.md: 说明文档

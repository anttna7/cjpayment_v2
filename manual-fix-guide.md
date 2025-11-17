# CJPayment 服务器修复手册

## 🚨 当前问题
- 所有页面返回404错误
- SSH连接可能存在问题

## 📋 手动修复步骤

### 第1步：SSH连接服务器
```bash
ssh root@139.196.54.251
# 密码: Cjpay2025
```

### 第2步：检查当前状态
```bash
# 查看进程
ps aux | grep cjpayment

# 查看端口
lsof -i :8091

# 查看已有文件
ls -la /root/*cjpayment*
```

### 第3步：清理现有进程
```bash
# 强制停止所有CJPayment进程
pkill -9 -f cjpayment

# 释放端口
lsof -ti :8091 | xargs kill -9
```

### 第4步：检查部署文件
```bash
# 查找CJPayment目录
find /root -name "*cjpayment*" -type d

# 如果找到目录，进入查看
cd /root/cjpayment_linux_amd64_*
ls -la
```

### 第5步：启动服务
```bash
# 设置权限
chmod +x cjpayment

# 启动服务
nohup ./cjpayment > cjpayment.log 2>&1 &

# 记录PID
echo $! > cjpayment.pid
```

### 第6步：验证启动
```bash
# 检查进程
ps aux | grep cjpayment | grep -v grep

# 检查端口
lsof -i :8091

# 查看日志
tail -20 cjpayment.log
```

### 第7步：测试访问
```bash
# 本地测试
curl -I http://localhost:8091/

# 如果本地正常，检查防火墙
iptables -L | grep 8091
systemctl status firewalld
```

## 🔧 如果文件不存在

### 重新上传构建包
从本地机器执行：
```bash
scp dist/cjpayment_linux_amd64_20250926_101758.tar.gz root@139.196.54.251:/root/
```

### 在服务器上解压
```bash
cd /root
tar -xzf cjpayment_linux_amd64_20250926_101758.tar.gz
cd cjpayment_linux_amd64_20250926_101758
chmod +x cjpayment
nohup ./cjpayment > cjpayment.log 2>&1 &
echo $! > cjpayment.pid
```

## 🔍 故障排查

### 如果启动失败
1. 查看详细日志：`cat cjpayment.log`
2. 检查二进制文件：`file cjpayment`
3. 检查依赖：`ldd cjpayment`
4. 检查权限：`ls -la cjpayment`

### 如果端口无法访问
1. 检查防火墙：`iptables -L`
2. 检查服务绑定：`netstat -tlnp | grep 8091`
3. 测试本地连接：`curl http://localhost:8091`

## 📞 最终检查清单
- [ ] CJPayment进程正在运行
- [ ] 端口8091正在监听
- [ ] 本地可以访问 http://localhost:8091
- [ ] 防火墙允许8091端口
- [ ] 日志文件无严重错误
- [ ] web目录结构完整

## 🎯 期望结果
修复完成后，以下地址应该可以正常访问：
- http://139.196.54.251:8091 (主页)
- http://139.196.54.251:8091/login (登录页)
- http://139.196.54.251:8091/summary (系统概览)

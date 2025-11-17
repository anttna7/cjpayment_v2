package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    // 静态文件服务器
    fs := http.FileServer(http.Dir("web/static"))
    http.Handle("/static/", http.StripPrefix("/static/", fs))

    // 首页
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/dashboard.html")
    })

    // 仪表板页面
    http.HandleFunc("/dashboard", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/dashboard.html")
    })

    // 系统管理页面
    http.HandleFunc("/system_management", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/system_management.html")
    })

    // 备份管理页面
    http.HandleFunc("/backup_management", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/backup_management.html")
    })

    // 其他管理页面
    http.HandleFunc("/api_management", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/api_management.html")
    })

    http.HandleFunc("/user_management", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/user_management.html")
    })

    http.HandleFunc("/system_config", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/system_config.html")
    })

    http.HandleFunc("/security_center", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/security_center.html")
    })

    http.HandleFunc("/monitoring_alerts", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/monitoring_alerts.html")
    })

    http.HandleFunc("/reports", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/report.html")
    })

    http.HandleFunc("/report", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/report.html")
    })

    http.HandleFunc("/merchant", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/merchant_management.html")
    })

    http.HandleFunc("/accounts", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/account_management.html")
    })

    http.HandleFunc("/audit", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/financial_audit.html")
    })

    // 登录页面
    http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "web/templates/login.html")
    })

    // 模拟登录API
    http.HandleFunc("/api/login", func(w http.ResponseWriter, r *http.Request) {
        // 添加CORS头
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
        w.Header().Set("Content-Type", "application/json")
        
        // 处理OPTIONS预检请求
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        if r.Method != "POST" {
            w.WriteHeader(http.StatusMethodNotAllowed)
            w.Write([]byte(`{"status":"error","message":"仅支持POST请求"}`))
            return
        }
        
        username := r.FormValue("username")
        password := r.FormValue("password")
        
        // 演示账户验证
        if (username == "admin" && password == "admin123") || 
           (username == "test" && password == "test123") {
            w.Write([]byte(`{
                "status": "success",
                "token": "demo_token_` + username + `",
                "user": {
                    "id": "user_001",
                    "username": "` + username + `",
                    "name": "系统管理员",
                    "role": "超级管理员",
                    "email": "admin@cjpayment.com",
                    "avatar": "👤"
                },
                "message": "登录成功"
            }`))
        } else {
            w.WriteHeader(http.StatusUnauthorized)
            w.Write([]byte(`{"status":"error","message":"用户名或密码错误。演示账户：admin/admin123 或 test/test123","code":"INVALID_CREDENTIALS"}`))
        }
    })

    fmt.Println("CJPayment Server starting on http://127.0.0.1:8091")
    fmt.Println("登录页面: http://127.0.0.1:8091/login")
    fmt.Println("演示账户: admin/admin123 或 test/test123")
    fmt.Println("系统管理页面: http://127.0.0.1:8091/system_management")
    fmt.Println("备份管理页面: http://127.0.0.1:8091/backup_management")
    log.Fatal(http.ListenAndServe(":8091", nil))
}
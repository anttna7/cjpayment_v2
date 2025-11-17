
=== 财务审核导航测试报告 ===
测试开始时间: 2025-08-22T15:57:21.750Z
测试结束时间: 2025-08-22T15:57:30.347Z
最终状态: ERROR

📋 执行步骤 (3):
1. [2025-08-22T15:57:25.525Z] 开始财务审核导航测试
   URL: about:blank
   详情: null

2. [2025-08-22T15:57:27.270Z] 成功访问dashboard页面
   URL: http://127.0.0.1:8091/login
   详情: {
  "finalUrl": "http://127.0.0.1:8091/login",
  "title": "登录 - CJPayment 企业内部支付管理系统"
}

3. [2025-08-22T15:57:30.347Z] 未找到财务审核按钮，列出前20个导航元素
   URL: http://127.0.0.1:8091/login
   详情: [
  {
    "text": "🌙",
    "href": null
  },
  {
    "text": "👁️",
    "href": null
  },
  {
    "text": "立即登录\n                            \n                                \n                                登录中...",
    "href": null
  },
  {
    "text": "忘记密码？",
    "href": "/forgot-password"
  },
  {
    "text": "使用帮助",
    "href": "/help"
  }
]

🔄 URL变化记录 (2):
1. [2025-08-22T15:57:25.581Z] http://127.0.0.1:8091/dashboard
2. [2025-08-22T15:57:25.751Z] http://127.0.0.1:8091/login

❌ 页面错误 (1):
1. [2025-08-22T15:57:30.347Z] 未找到财务审核按钮
   堆栈: Error: 未找到财务审核按钮
    at FinancialAuditNavigationTest.testFinancialAuditNavigation (/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/financial-audit-navigation-test.js:159:23)
    at async Fin...

🖥️  控制台错误 (0):


🌐 网络请求统计:
总请求数: 24
主要请求类型: {
  "document": 2,
  "stylesheet": 10,
  "script": 12
}

=== 测试结论 ===

❌ 测试执行过程中出现错误，无法完成完整的导航测试。

请检查：
1. 服务器是否正在运行在 http://127.0.0.1:8091
2. dashboard页面是否可以正常访问
3. 页面结构是否发生了变化
4. JavaScript是否有语法错误


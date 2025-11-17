# 充值测试系统 API 文档

## 概述

充值测试系统提供完整的 RESTful API，支持商户管理、收款账号绑定、充值订单处理等功能。

### API 基础信息
- **Base URL**: `https://api.recharge-system.com/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": "2024-08-12T10:30:00Z"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": 1001,
    "message": "商户不存在",
    "details": "Merchant with ID 123 not found"
  },
  "timestamp": "2024-08-12T10:30:00Z"
}
```

### 错误码说明

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| 1001 | 商户不存在 | 404 |
| 1002 | 商户名称已存在 | 409 |
| 1003 | 商户状态异常 | 400 |
| 2001 | 收款账号不存在 | 404 |
| 2002 | 账号已被绑定 | 409 |
| 2003 | 账号限额不足 | 400 |
| 2004 | 无可用账号 | 400 |
| 3001 | 订单不存在 | 404 |
| 3002 | 订单状态无效 | 400 |
| 3003 | 订单金额无效 | 400 |
| 3004 | 订单已支付 | 409 |
| 9001 | 内部服务器错误 | 500 |
| 9002 | 数据库连接错误 | 500 |
| 9003 | Redis连接错误 | 500 |

## 认证接口

### 用户登录

**POST** `/auth/login`

#### 请求参数
```json
{
  "username": "admin",
  "password": "password123"
}
```

#### 响应数据
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "permissions": ["merchant:read", "merchant:write"]
    }
  }
}
```

### 刷新令牌

**POST** `/auth/refresh`

#### 请求头
```
Authorization: Bearer <token>
```

#### 响应数据
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

### 用户登出

**POST** `/auth/logout`

#### 请求头
```
Authorization: Bearer <token>
```

## 商户管理接口

### 创建商户

**POST** `/merchants`

#### 请求参数
```json
{
  "name": "测试商户",
  "contact_name": "张三",
  "contact_phone": "13800138000",
  "email": "zhangsan@example.com",
  "business_type": "电商"
}
```

#### 响应数据
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "测试商户",
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "email": "zhangsan@example.com",
    "business_type": "电商",
    "status": "active",
    "recharge_url": "https://recharge.example.com/pay/abc123",
    "created_at": "2024-08-12T10:30:00Z",
    "updated_at": "2024-08-12T10:30:00Z"
  }
}
```

### 获取商户列表

**GET** `/merchants`

#### 查询参数
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 20
- `status`: 状态筛选 (active/inactive)
- `search`: 搜索关键词

#### 响应数据
```json
{
  "success": true,
  "data": {
    "merchants": [
      {
        "id": 1,
        "name": "测试商户",
        "contact_name": "张三",
        "status": "active",
        "created_at": "2024-08-12T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### 获取商户详情

**GET** `/merchants/{id}`

#### 响应数据
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "测试商户",
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "email": "zhangsan@example.com",
    "business_type": "电商",
    "status": "active",
    "recharge_url": "https://recharge.example.com/pay/abc123",
    "statistics": {
      "total_orders": 100,
      "total_amount": "50000.00",
      "success_rate": 0.95
    },
    "created_at": "2024-08-12T10:30:00Z",
    "updated_at": "2024-08-12T10:30:00Z"
  }
}
```

### 更新商户

**PUT** `/merchants/{id}`

#### 请求参数
```json
{
  "name": "更新后的商户名",
  "contact_name": "李四",
  "contact_phone": "13900139000",
  "email": "lisi@example.com",
  "business_type": "服务业"
}
```

### 删除商户

**DELETE** `/merchants/{id}`

### 更新商户状态

**PATCH** `/merchants/{id}/status`

#### 请求参数
```json
{
  "status": "inactive"
}
```

## 收款账号管理接口

### 绑定收款账号

**POST** `/merchants/{merchant_id}/accounts`

#### 请求参数
```json
{
  "receive_account_id": 1,
  "priority": 1
}
```

#### 响应数据
```json
{
  "success": true,
  "data": {
    "id": 1,
    "merchant_id": 1,
    "receive_account_id": 1,
    "priority": 1,
    "status": "active",
    "created_at": "2024-08-12T10:30:00Z"
  }
}
```

### 获取商户绑定账号

**GET** `/merchants/{merchant_id}/accounts`

#### 响应数据
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 1,
      "receive_account_id": 1,
      "priority": 1,
      "status": "active",
      "receive_account": {
        "id": 1,
        "account_name": "测试收款账号",
        "account_type": "corporate",
        "bank_name": "中国银行",
        "account_number": "1234****5678",
        "daily_limit": "100000.00",
        "used_amount": "5000.00"
      }
    }
  ]
}
```

### 更新账号优先级

**PATCH** `/merchants/{merchant_id}/accounts/{account_id}/priority`

#### 请求参数
```json
{
  "priority": 2
}
```

### 解绑收款账号

**DELETE** `/merchants/{merchant_id}/accounts/{account_id}`

### 获取可用收款账号

**GET** `/merchants/{merchant_id}/available-accounts`

#### 查询参数
- `payment_type`: 付款类型 (corporate/personal)
- `amount`: 充值金额

#### 响应数据
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "account_name": "测试收款账号",
      "account_type": "corporate",
      "bank_name": "中国银行",
      "account_number": "1234****5678",
      "daily_limit": "100000.00",
      "remaining_limit": "95000.00",
      "priority": 1
    }
  ]
}
```

## 充值订单接口

### 创建充值订单

**POST** `/recharge/orders`

#### 请求参数
```json
{
  "merchant_id": 1,
  "payer_name": "王五",
  "amount": "1000.00",
  "ad_account": "AD123456",
  "payment_type": "corporate"
}
```

#### 响应数据
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_no": "RO20240812001",
    "merchant_id": 1,
    "payer_name": "王五",
    "amount": "1000.00",
    "ad_account": "AD123456",
    "payment_type": "corporate",
    "status": "pending",
    "receive_account": {
      "id": 1,
      "account_name": "测试收款账号",
      "bank_name": "中国银行",
      "account_number": "1234567890123456",
      "account_holder": "测试公司"
    },
    "created_at": "2024-08-12T10:30:00Z"
  }
}
```

### 获取订单详情

**GET** `/recharge/orders/{order_no}`

#### 响应数据
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_no": "RO20240812001",
    "merchant_id": 1,
    "payer_name": "王五",
    "amount": "1000.00",
    "ad_account": "AD123456",
    "payment_type": "corporate",
    "status": "pending",
    "payment_proof": "",
    "remark": "",
    "merchant": {
      "id": 1,
      "name": "测试商户"
    },
    "receive_account": {
      "id": 1,
      "account_name": "测试收款账号",
      "bank_name": "中国银行",
      "account_number": "1234567890123456"
    },
    "status_logs": [
      {
        "id": 1,
        "status": "pending",
        "remark": "订单创建",
        "created_at": "2024-08-12T10:30:00Z"
      }
    ],
    "created_at": "2024-08-12T10:30:00Z",
    "updated_at": "2024-08-12T10:30:00Z"
  }
}
```

### 获取订单列表

**GET** `/recharge/orders`

#### 查询参数
- `page`: 页码，默认 1
- `limit`: 每页数量，默认 20
- `merchant_id`: 商户ID
- `status`: 订单状态
- `start_date`: 开始日期 (YYYY-MM-DD)
- `end_date`: 结束日期 (YYYY-MM-DD)
- `min_amount`: 最小金额
- `max_amount`: 最大金额

#### 响应数据
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "order_no": "RO20240812001",
        "merchant_name": "测试商户",
        "payer_name": "王五",
        "amount": "1000.00",
        "status": "pending",
        "created_at": "2024-08-12T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    },
    "statistics": {
      "total_amount": "1000.00",
      "total_orders": 1,
      "pending_orders": 1,
      "completed_orders": 0
    }
  }
}
```

### 上传付款凭证

**POST** `/recharge/orders/{order_no}/proof`

#### 请求参数 (multipart/form-data)
- `proof`: 付款凭证文件
- `remark`: 付款说明

#### 响应数据
```json
{
  "success": true,
  "data": {
    "proof_url": "https://cdn.example.com/proofs/20240812001.jpg",
    "status": "paid"
  }
}
```

### 更新订单状态

**PATCH** `/recharge/orders/{order_no}/status`

#### 请求参数
```json
{
  "status": "confirmed",
  "remark": "付款凭证审核通过"
}
```

### 取消订单

**DELETE** `/recharge/orders/{order_no}`

#### 请求参数
```json
{
  "reason": "用户取消"
}
```

## 数据导出接口

### 导出订单数据

**POST** `/export/orders`

#### 请求参数
```json
{
  "start_date": "2024-08-01",
  "end_date": "2024-08-12",
  "merchant_id": 1,
  "status": "completed",
  "format": "excel"
}
```

#### 响应数据
```json
{
  "success": true,
  "data": {
    "export_id": "EXP20240812001",
    "status": "processing",
    "estimated_time": 60
  }
}
```

### 获取导出状态

**GET** `/export/{export_id}/status`

#### 响应数据
```json
{
  "success": true,
  "data": {
    "export_id": "EXP20240812001",
    "status": "completed",
    "download_url": "https://cdn.example.com/exports/orders_20240812.xlsx",
    "file_size": 1024000,
    "record_count": 100,
    "created_at": "2024-08-12T10:30:00Z",
    "completed_at": "2024-08-12T10:31:00Z"
  }
}
```

### 下载导出文件

**GET** `/export/{export_id}/download`

返回文件流，浏览器会自动下载文件。

## 统计分析接口

### 获取仪表板数据

**GET** `/dashboard/stats`

#### 查询参数
- `date_range`: 日期范围 (today/week/month/custom)
- `start_date`: 自定义开始日期
- `end_date`: 自定义结束日期

#### 响应数据
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_orders": 1000,
      "total_amount": "500000.00",
      "success_rate": 0.95,
      "avg_amount": "500.00"
    },
    "trends": {
      "orders": [
        {"date": "2024-08-01", "count": 50},
        {"date": "2024-08-02", "count": 60}
      ],
      "amounts": [
        {"date": "2024-08-01", "amount": "25000.00"},
        {"date": "2024-08-02", "amount": "30000.00"}
      ]
    },
    "merchants": [
      {
        "merchant_id": 1,
        "merchant_name": "测试商户",
        "order_count": 100,
        "total_amount": "50000.00"
      }
    ],
    "status_distribution": {
      "pending": 10,
      "paid": 20,
      "confirmed": 15,
      "completed": 50,
      "cancelled": 5
    }
  }
}
```

### 获取商户统计

**GET** `/merchants/{merchant_id}/stats`

#### 查询参数
- `date_range`: 日期范围
- `start_date`: 开始日期
- `end_date`: 结束日期

#### 响应数据
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_orders": 100,
      "total_amount": "50000.00",
      "success_rate": 0.98,
      "avg_processing_time": 1800
    },
    "daily_stats": [
      {
        "date": "2024-08-01",
        "order_count": 10,
        "amount": "5000.00",
        "success_count": 9
      }
    ],
    "account_usage": [
      {
        "account_id": 1,
        "account_name": "测试账号",
        "usage_count": 50,
        "usage_amount": "25000.00"
      }
    ]
  }
}
```

## 通知接口

### 获取通知列表

**GET** `/notifications`

#### 查询参数
- `page`: 页码
- `limit`: 每页数量
- `type`: 通知类型
- `status`: 通知状态 (unread/read)

#### 响应数据
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "order_created",
        "title": "新订单通知",
        "content": "订单 RO20240812001 已创建",
        "status": "unread",
        "created_at": "2024-08-12T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    },
    "unread_count": 5
  }
}
```

### 标记通知为已读

**PATCH** `/notifications/{id}/read`

### 批量标记已读

**PATCH** `/notifications/mark-read`

#### 请求参数
```json
{
  "notification_ids": [1, 2, 3]
}
```

## 系统接口

### 健康检查

**GET** `/health`

#### 响应数据
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600,
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "storage": "healthy"
    }
  }
}
```

### 获取系统信息

**GET** `/system/info`

#### 响应数据
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "build_time": "2024-08-12T08:00:00Z",
    "git_commit": "abc123def456",
    "environment": "production",
    "features": {
      "mobile_optimization": true,
      "auto_export": true,
      "webhook_support": true
    }
  }
}
```

## Webhook 接口

### 订单状态变更通知

当订单状态发生变更时，系统会向配置的 Webhook URL 发送 POST 请求。

#### 请求头
```
Content-Type: application/json
X-Webhook-Signature: sha256=<signature>
X-Webhook-Event: order.status_changed
```

#### 请求体
```json
{
  "event": "order.status_changed",
  "timestamp": "2024-08-12T10:30:00Z",
  "data": {
    "order_no": "RO20240812001",
    "merchant_id": 1,
    "old_status": "paid",
    "new_status": "confirmed",
    "amount": "1000.00",
    "payer_name": "王五"
  }
}
```

### 验证 Webhook 签名

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDK 示例

### JavaScript SDK

```javascript
class RechargeSystemAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: data ? JSON.stringify(data) : null
    });

    return response.json();
  }

  // 创建商户
  async createMerchant(merchantData) {
    return this.request('POST', '/merchants', merchantData);
  }

  // 获取订单列表
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/recharge/orders?${query}`);
  }

  // 创建充值订单
  async createOrder(orderData) {
    return this.request('POST', '/recharge/orders', orderData);
  }
}

// 使用示例
const api = new RechargeSystemAPI('https://api.recharge-system.com/v1', 'your-token');

// 创建订单
const order = await api.createOrder({
  merchant_id: 1,
  payer_name: '张三',
  amount: '1000.00',
  ad_account: 'AD123456',
  payment_type: 'corporate'
});
```

### Python SDK

```python
import requests
import json

class RechargeSystemAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

    def request(self, method, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method, url, 
            headers=self.headers, 
            json=data
        )
        return response.json()

    def create_merchant(self, merchant_data):
        return self.request('POST', '/merchants', merchant_data)

    def get_orders(self, **params):
        query = '&'.join([f"{k}={v}" for k, v in params.items()])
        return self.request('GET', f'/recharge/orders?{query}')

    def create_order(self, order_data):
        return self.request('POST', '/recharge/orders', order_data)

# 使用示例
api = RechargeSystemAPI('https://api.recharge-system.com/v1', 'your-token')

# 创建订单
order = api.create_order({
    'merchant_id': 1,
    'payer_name': '张三',
    'amount': '1000.00',
    'ad_account': 'AD123456',
    'payment_type': 'corporate'
})
```

## 限流说明

API 采用令牌桶算法进行限流：

| 用户类型 | 限制 | 时间窗口 |
|----------|------|----------|
| 普通用户 | 100 请求 | 1 分钟 |
| VIP 用户 | 500 请求 | 1 分钟 |
| 系统集成 | 1000 请求 | 1 分钟 |

### 限流响应头
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1691836800
```

### 限流错误响应
```json
{
  "success": false,
  "error": {
    "code": 429,
    "message": "请求过于频繁，请稍后再试",
    "retry_after": 60
  }
}
```

---

**文档版本**: v1.0  
**更新日期**: 2024-08-12  
**维护团队**: API 开发团队
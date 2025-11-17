# 组件库 API 参考文档

## 概述

本文档提供了 CJPayment 组件库所有 JavaScript API 的详细参考信息，包括类、方法、属性和事件。

## 目录

- [基础组件 API](#基础组件-api)
- [表单组件 API](#表单组件-api)
- [数据展示组件 API](#数据展示组件-api)
- [反馈组件 API](#反馈组件-api)
- [导航组件 API](#导航组件-api)
- [工具类 API](#工具类-api)
- [事件系统](#事件系统)

## 基础组件 API

### ButtonComponent

按钮组件的 JavaScript API。

#### 构造函数

```javascript
new ButtonComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 按钮元素
  - `variant` (string): 按钮变体，默认 'primary'
  - `size` (string): 按钮尺寸，默认 'default'
  - `disabled` (boolean): 是否禁用，默认 false
  - `loading` (boolean): 是否显示加载状态，默认 false
  - `ripple` (boolean): 是否启用波纹效果，默认 true

#### 方法

##### setLoading(loading)

设置按钮的加载状态。

**参数:**
- `loading` (boolean): 是否显示加载状态

**返回值:** `ButtonComponent` - 返回实例以支持链式调用

**示例:**
```javascript
button.setLoading(true);
```

##### setDisabled(disabled)

设置按钮的禁用状态。

**参数:**
- `disabled` (boolean): 是否禁用按钮

**返回值:** `ButtonComponent`

##### setVariant(variant)

设置按钮的变体。

**参数:**
- `variant` (string): 按钮变体 ('primary', 'secondary', 'outline', 'danger')

**返回值:** `ButtonComponent`

##### setSize(size)

设置按钮的尺寸。

**参数:**
- `size` (string): 按钮尺寸 ('sm', 'default', 'lg')

**返回值:** `ButtonComponent`

##### click()

程序化触发按钮点击。

**返回值:** `ButtonComponent`

##### destroy()

销毁按钮实例，移除所有事件监听器。

**返回值:** `void`

#### 事件

##### click

按钮被点击时触发。

**回调参数:**
- `event` (Event): 原生点击事件对象

**示例:**
```javascript
button.on('click', function(event) {
    console.log('按钮被点击');
});
```

##### stateChange

按钮状态发生变化时触发。

**回调参数:**
- `state` (Object): 状态对象
  - `loading` (boolean): 加载状态
  - `disabled` (boolean): 禁用状态
  - `variant` (string): 当前变体
  - `size` (string): 当前尺寸

### CardComponent

卡片组件的 JavaScript API。

#### 构造函数

```javascript
new CardComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 卡片元素
  - `collapsible` (boolean): 是否可折叠，默认 false
  - `clickable` (boolean): 是否可点击，默认 false
  - `draggable` (boolean): 是否可拖拽，默认 false
  - `href` (string): 点击跳转链接
  - `target` (string): 链接打开方式，默认 '_self'
  - `animation` (boolean): 是否启用动画，默认 true

#### 方法

##### collapse()

折叠卡片内容。

**返回值:** `CardComponent`

##### expand()

展开卡片内容。

**返回值:** `CardComponent`

##### toggle()

切换卡片的折叠状态。

**返回值:** `CardComponent`

##### setLoading(loading)

设置卡片的加载状态。

**参数:**
- `loading` (boolean): 是否显示加载状态

**返回值:** `CardComponent`

##### updateContent(content)

更新卡片内容。

**参数:**
- `content` (Object): 内容对象
  - `title` (string): 卡片标题
  - `body` (string): 卡片主体内容
  - `footer` (string): 卡片底部内容

**返回值:** `CardComponent`

#### 事件

##### collapse

卡片折叠时触发。

##### expand

卡片展开时触发。

##### click

卡片被点击时触发（仅当 clickable 为 true 时）。

## 表单组件 API

### FormValidation

表单验证组件的 JavaScript API。

#### 构造函数

```javascript
new FormValidation(options)
```

**参数:**
- `options` (Object): 配置选项
  - `form` (HTMLElement): 表单元素
  - `realtime` (boolean): 是否启用实时验证，默认 true
  - `rules` (Object): 验证规则对象
  - `messages` (Object): 自定义错误消息
  - `submitHandler` (Function): 表单提交处理函数

#### 方法

##### validate()

验证整个表单。

**返回值:** `boolean` - 表单是否有效

##### validateField(fieldName)

验证指定字段。

**参数:**
- `fieldName` (string): 字段名称

**返回值:** `boolean` - 字段是否有效

##### isValid()

检查表单是否有效。

**返回值:** `boolean`

##### getErrors()

获取所有验证错误。

**返回值:** `Object` - 错误对象，键为字段名，值为错误数组

##### clearErrors()

清除所有验证错误。

**返回值:** `FormValidation`

##### addRule(name, rule)

添加自定义验证规则。

**参数:**
- `name` (string): 规则名称
- `rule` (Object): 规则对象
  - `validate` (Function): 验证函数
  - `message` (string): 错误消息

**返回值:** `FormValidation`

#### 静态方法

##### FormValidation.addRule(name, rule)

全局添加验证规则。

**参数:**
- `name` (string): 规则名称
- `rule` (Object): 规则对象

#### 事件

##### valid

字段验证通过时触发。

**回调参数:**
- `field` (string): 字段名称

##### invalid

字段验证失败时触发。

**回调参数:**
- `field` (string): 字段名称
- `errors` (Array): 错误数组

##### submit

表单提交时触发。

**回调参数:**
- `data` (Object): 表单数据

### FormWizard

表单向导组件的 JavaScript API。

#### 构造函数

```javascript
new FormWizard(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 向导元素
  - `validation` (boolean): 是否启用验证，默认 true
  - `autoSave` (boolean): 是否自动保存，默认 false
  - `saveKey` (string): 本地存储键名
  - `steps` (Array): 步骤配置数组

#### 方法

##### next()

前进到下一步。

**返回值:** `boolean` - 是否成功前进

##### prev()

返回到上一步。

**返回值:** `boolean` - 是否成功返回

##### goToStep(stepIndex)

跳转到指定步骤。

**参数:**
- `stepIndex` (number): 步骤索引（从 0 开始）

**返回值:** `boolean` - 是否成功跳转

##### getCurrentStep()

获取当前步骤索引。

**返回值:** `number`

##### getData()

获取所有步骤的数据。

**返回值:** `Object` - 表单数据

##### getStepData(stepIndex)

获取指定步骤的数据。

**参数:**
- `stepIndex` (number): 步骤索引

**返回值:** `Object` - 步骤数据

##### setData(data)

设置表单数据。

**参数:**
- `data` (Object): 表单数据

**返回值:** `FormWizard`

##### reset()

重置向导到初始状态。

**返回值:** `FormWizard`

#### 事件

##### stepChange

步骤变化时触发。

**回调参数:**
- `step` (number): 当前步骤索引
- `direction` (string): 变化方向 ('next' 或 'prev')

##### beforeNext

前进到下一步之前触发。

**回调参数:**
- `currentStep` (number): 当前步骤索引

**返回值:** 如果返回 `false`，将阻止前进

##### beforePrev

返回到上一步之前触发。

**回调参数:**
- `currentStep` (number): 当前步骤索引

##### submit

向导提交时触发。

**回调参数:**
- `data` (Object): 所有步骤的数据

## 数据展示组件 API

### TableComponent

表格组件的 JavaScript API。

#### 构造函数

```javascript
new TableComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 表格元素
  - `sortable` (boolean): 是否可排序，默认 false
  - `filterable` (boolean): 是否可筛选，默认 false
  - `pagination` (Object|boolean): 分页配置
  - `virtualScroll` (boolean): 是否启用虚拟滚动，默认 false
  - `data` (Array): 初始数据

#### 方法

##### setData(data)

设置表格数据。

**参数:**
- `data` (Array): 数据数组

**返回值:** `TableComponent`

##### getData()

获取当前表格数据。

**返回值:** `Array`

##### addRow(rowData)

添加行数据。

**参数:**
- `rowData` (Object): 行数据

**返回值:** `TableComponent`

##### removeRow(index)

移除指定行。

**参数:**
- `index` (number): 行索引

**返回值:** `TableComponent`

##### updateRow(index, rowData)

更新指定行数据。

**参数:**
- `index` (number): 行索引
- `rowData` (Object): 新的行数据

**返回值:** `TableComponent`

##### sort(field, direction)

对表格进行排序。

**参数:**
- `field` (string): 排序字段
- `direction` (string): 排序方向 ('asc' 或 'desc')

**返回值:** `TableComponent`

##### filter(filters)

对表格进行筛选。

**参数:**
- `filters` (Object): 筛选条件对象

**返回值:** `TableComponent`

##### clearFilters()

清除所有筛选条件。

**返回值:** `TableComponent`

##### refresh()

刷新表格显示。

**返回值:** `TableComponent`

#### 事件

##### rowClick

行被点击时触发。

**回调参数:**
- `rowData` (Object): 行数据
- `index` (number): 行索引
- `event` (Event): 原生事件对象

##### sort

表格排序时触发。

**回调参数:**
- `field` (string): 排序字段
- `direction` (string): 排序方向

##### filter

表格筛选时触发。

**回调参数:**
- `filters` (Object): 筛选条件

### ChartComponent

图表组件的 JavaScript API。

#### 构造函数

```javascript
new ChartComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 画布元素
  - `type` (string): 图表类型
  - `data` (Object): 图表数据
  - `options` (Object): Chart.js 选项
  - `responsive` (boolean): 是否响应式，默认 true

#### 方法

##### updateData(data)

更新图表数据。

**参数:**
- `data` (Object): 新的图表数据

**返回值:** `ChartComponent`

##### setTheme(theme)

设置图表主题。

**参数:**
- `theme` (string): 主题名称 ('light' 或 'dark')

**返回值:** `ChartComponent`

##### resize()

调整图表大小。

**返回值:** `ChartComponent`

##### destroy()

销毁图表实例。

**返回值:** `void`

## 反馈组件 API

### Toast

通知组件的静态 API。

#### 静态方法

##### Toast.success(message, options)

显示成功通知。

**参数:**
- `message` (string): 通知消息
- `options` (Object): 可选配置
  - `title` (string): 通知标题
  - `duration` (number): 显示时长（毫秒）
  - `actions` (Array): 操作按钮数组

**返回值:** `ToastInstance`

##### Toast.error(message, options)

显示错误通知。

##### Toast.warning(message, options)

显示警告通知。

##### Toast.info(message, options)

显示信息通知。

##### Toast.show(options)

显示自定义通知。

**参数:**
- `options` (Object): 通知配置
  - `type` (string): 通知类型
  - `title` (string): 标题
  - `message` (string): 消息
  - `duration` (number): 显示时长
  - `actions` (Array): 操作按钮

**返回值:** `ToastInstance`

##### Toast.clear()

清除所有通知。

**返回值:** `void`

#### ToastInstance 方法

##### close()

关闭通知。

**返回值:** `void`

##### update(options)

更新通知内容。

**参数:**
- `options` (Object): 新的通知配置

**返回值:** `ToastInstance`

### ModalComponent

模态框组件的 JavaScript API。

#### 构造函数

```javascript
new ModalComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 模态框元素
  - `backdrop` (boolean): 是否显示背景遮罩，默认 true
  - `keyboard` (boolean): 是否支持键盘关闭，默认 true
  - `focus` (boolean): 是否自动聚焦，默认 true

#### 方法

##### show()

显示模态框。

**返回值:** `ModalComponent`

##### hide()

隐藏模态框。

**返回值:** `ModalComponent`

##### toggle()

切换模态框显示状态。

**返回值:** `ModalComponent`

##### setContent(content)

设置模态框内容。

**参数:**
- `content` (Object): 内容对象
  - `title` (string): 标题
  - `body` (string): 主体内容
  - `footer` (string): 底部内容

**返回值:** `ModalComponent`

#### 事件

##### show

模态框显示时触发。

##### shown

模态框显示完成后触发。

##### hide

模态框隐藏时触发。

##### hidden

模态框隐藏完成后触发。

##### confirm

确认按钮被点击时触发。

##### cancel

取消按钮被点击时触发。

## 导航组件 API

### NavigationComponent

导航栏组件的 JavaScript API。

#### 构造函数

```javascript
new NavigationComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 导航栏元素
  - `responsive` (boolean): 是否响应式，默认 true
  - `dropdownHover` (boolean): 是否悬停显示下拉菜单，默认 false
  - `searchEnabled` (boolean): 是否启用搜索，默认 false

#### 方法

##### toggleMobileMenu()

切换移动端菜单。

**返回值:** `NavigationComponent`

##### setActiveItem(href)

设置活跃的导航项。

**参数:**
- `href` (string): 链接地址

**返回值:** `NavigationComponent`

##### showSearch()

显示搜索框。

**返回值:** `NavigationComponent`

##### hideSearch()

隐藏搜索框。

**返回值:** `NavigationComponent`

#### 事件

##### itemClick

导航项被点击时触发。

**回调参数:**
- `item` (HTMLElement): 被点击的导航项
- `event` (Event): 原生事件对象

##### search

搜索时触发。

**回调参数:**
- `query` (string): 搜索查询

### TabsComponent

标签页组件的 JavaScript API。

#### 构造函数

```javascript
new TabsComponent(options)
```

**参数:**
- `options` (Object): 配置选项
  - `element` (HTMLElement): 标签页元素
  - `activeIndex` (number): 初始活跃标签页索引，默认 0
  - `keyboard` (boolean): 是否支持键盘导航，默认 true
  - `lazy` (boolean): 是否懒加载内容，默认 false

#### 方法

##### showTab(index)

显示指定索引的标签页。

**参数:**
- `index` (number): 标签页索引

**返回值:** `TabsComponent`

##### showTabById(id)

通过 ID 显示标签页。

**参数:**
- `id` (string): 标签页 ID

**返回值:** `TabsComponent`

##### getActiveTab()

获取当前活跃的标签页索引。

**返回值:** `number`

##### addTab(title, content, index)

动态添加标签页。

**参数:**
- `title` (string): 标签页标题
- `content` (string): 标签页内容
- `index` (number): 插入位置，可选

**返回值:** `TabsComponent`

##### removeTab(index)

移除指定标签页。

**参数:**
- `index` (number): 标签页索引

**返回值:** `TabsComponent`

#### 事件

##### tabChange

标签页切换时触发。

**回调参数:**
- `activeIndex` (number): 当前活跃标签页索引
- `previousIndex` (number): 之前活跃标签页索引

##### tabAdd

标签页添加时触发。

**回调参数:**
- `index` (number): 新标签页索引
- `tab` (Object): 标签页对象

##### tabRemove

标签页移除时触发。

**回调参数:**
- `index` (number): 被移除标签页索引

## 工具类 API

### ThemeSystem

主题系统的静态 API。

#### 静态方法

##### ThemeSystem.init()

初始化主题系统。

**返回值:** `void`

##### ThemeSystem.setTheme(theme)

设置主题。

**参数:**
- `theme` (string): 主题名称 ('light', 'dark', 'auto')

**返回值:** `void`

##### ThemeSystem.getTheme()

获取当前主题。

**返回值:** `string`

##### ThemeSystem.toggleTheme()

切换主题（在明暗主题间切换）。

**返回值:** `void`

##### ThemeSystem.addTheme(name, config)

添加自定义主题。

**参数:**
- `name` (string): 主题名称
- `config` (Object): 主题配置

**返回值:** `void`

#### 事件

##### themeChange

主题变化时触发。

**回调参数:**
- `theme` (string): 新主题名称
- `previousTheme` (string): 之前的主题名称

### Utils

工具函数集合。

#### 静态方法

##### Utils.debounce(func, wait)

防抖函数。

**参数:**
- `func` (Function): 要防抖的函数
- `wait` (number): 等待时间（毫秒）

**返回值:** `Function` - 防抖后的函数

##### Utils.throttle(func, wait)

节流函数。

**参数:**
- `func` (Function): 要节流的函数
- `wait` (number): 等待时间（毫秒）

**返回值:** `Function` - 节流后的函数

##### Utils.formatCurrency(amount, currency)

格式化货币。

**参数:**
- `amount` (number): 金额
- `currency` (string): 货币代码，默认 'CNY'

**返回值:** `string` - 格式化后的货币字符串

##### Utils.formatDate(date, format)

格式化日期。

**参数:**
- `date` (Date|string|number): 日期
- `format` (string): 格式字符串，默认 'YYYY-MM-DD'

**返回值:** `string` - 格式化后的日期字符串

##### Utils.generateId(prefix)

生成唯一 ID。

**参数:**
- `prefix` (string): ID 前缀，可选

**返回值:** `string` - 唯一 ID

##### Utils.deepClone(obj)

深度克隆对象。

**参数:**
- `obj` (any): 要克隆的对象

**返回值:** `any` - 克隆后的对象

##### Utils.merge(target, ...sources)

合并对象。

**参数:**
- `target` (Object): 目标对象
- `sources` (...Object): 源对象

**返回值:** `Object` - 合并后的对象

## 事件系统

### EventEmitter

事件发射器基类，所有组件都继承自此类。

#### 方法

##### on(event, callback)

监听事件。

**参数:**
- `event` (string): 事件名称
- `callback` (Function): 回调函数

**返回值:** `EventEmitter`

##### off(event, callback)

移除事件监听器。

**参数:**
- `event` (string): 事件名称
- `callback` (Function): 回调函数，可选

**返回值:** `EventEmitter`

##### once(event, callback)

监听事件一次。

**参数:**
- `event` (string): 事件名称
- `callback` (Function): 回调函数

**返回值:** `EventEmitter`

##### emit(event, ...args)

触发事件。

**参数:**
- `event` (string): 事件名称
- `args` (...any): 传递给回调函数的参数

**返回值:** `boolean` - 是否有监听器处理了事件

### 全局事件

#### 组件事件

所有组件都会触发以下全局事件：

##### component:init

组件初始化时触发。

**事件数据:**
- `component` (string): 组件名称
- `instance` (Object): 组件实例

##### component:destroy

组件销毁时触发。

**事件数据:**
- `component` (string): 组件名称
- `instance` (Object): 组件实例

#### 主题事件

##### theme:change

主题变化时触发。

**事件数据:**
- `theme` (string): 新主题
- `previousTheme` (string): 之前的主题

#### 响应式事件

##### breakpoint:change

断点变化时触发。

**事件数据:**
- `breakpoint` (string): 当前断点
- `previousBreakpoint` (string): 之前的断点

## 错误处理

### ComponentError

组件错误类。

#### 构造函数

```javascript
new ComponentError(message, component, code)
```

**参数:**
- `message` (string): 错误消息
- `component` (string): 组件名称
- `code` (string): 错误代码

#### 属性

- `name` (string): 错误名称，始终为 'ComponentError'
- `message` (string): 错误消息
- `component` (string): 组件名称
- `code` (string): 错误代码
- `stack` (string): 错误堆栈

### 错误处理示例

```javascript
try {
    const button = new ButtonComponent({
        element: document.querySelector('#my-button')
    });
} catch (error) {
    if (error instanceof ComponentError) {
        console.error(`组件错误 [${error.component}]: ${error.message}`);
        console.error(`错误代码: ${error.code}`);
    } else {
        console.error('未知错误:', error);
    }
}
```

## 类型定义

### TypeScript 支持

组件库提供了完整的 TypeScript 类型定义。

```typescript
// 按钮组件类型
interface ButtonOptions {
    element: HTMLElement;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    size?: 'sm' | 'default' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    ripple?: boolean;
}

interface ButtonComponent extends EventEmitter {
    setLoading(loading: boolean): ButtonComponent;
    setDisabled(disabled: boolean): ButtonComponent;
    setVariant(variant: string): ButtonComponent;
    setSize(size: string): ButtonComponent;
    click(): ButtonComponent;
    destroy(): void;
}

// 表单验证类型
interface ValidationRule {
    validate(value: any): boolean;
    message: string;
}

interface FormValidationOptions {
    form: HTMLElement;
    realtime?: boolean;
    rules?: Record<string, string>;
    messages?: Record<string, string>;
    submitHandler?: (data: Record<string, any>) => void;
}
```

## 版本兼容性

### API 版本

当前 API 版本：`1.0.0`

### 向后兼容性

- 主版本号变更：可能包含破坏性变更
- 次版本号变更：新增功能，向后兼容
- 修订版本号变更：错误修复，向后兼容

### 废弃 API

#### v1.0.0 中废弃的 API

目前没有废弃的 API。

### 迁移指南

当有破坏性变更时，我们会提供详细的迁移指南。

## 示例代码

### 完整的组件使用示例

```javascript
// 初始化主题系统
ThemeSystem.init();

// 创建按钮组件
const submitButton = new ButtonComponent({
    element: document.querySelector('#submit-btn'),
    variant: 'primary',
    size: 'lg'
});

// 监听按钮点击
submitButton.on('click', async function() {
    // 设置加载状态
    this.setLoading(true);
    
    try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 显示成功通知
        Toast.success('操作成功！');
        
    } catch (error) {
        // 显示错误通知
        Toast.error('操作失败，请重试');
        
    } finally {
        // 恢复按钮状态
        this.setLoading(false);
    }
});

// 创建表单验证
const validator = new FormValidation({
    form: document.querySelector('#user-form'),
    rules: {
        username: 'required|min:3|max:20',
        email: 'required|email',
        password: 'required|min:8'
    }
});

// 监听表单提交
validator.on('submit', function(data) {
    console.log('表单数据:', data);
});

// 创建模态框
const modal = new ModalComponent({
    element: document.querySelector('#confirm-modal')
});

// 监听模态框确认
modal.on('confirm', function() {
    console.log('用户确认操作');
    this.hide();
});
```

---

更多详细信息和示例，请参考各组件的专门文档。
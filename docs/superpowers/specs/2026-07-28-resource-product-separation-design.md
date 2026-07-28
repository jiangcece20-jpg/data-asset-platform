# 资源/商品分离 + 资源管理中心 + 用数产出接入 设计文档

## 概述

本设计覆盖三个互相关联的需求，一次性设计、分阶段实施：

1. **商品中心增加"资源名称"列 + 上下架操作** —— 引入 Resource 概念，资源可选择上架为商品
2. **用数模块产出的报表/视图接入找数检索** —— 用数模块由其他团队负责，我们接入其产出的内部数据视图
3. **商品中心 + 内容中心合并** —— 统一为"资源管理"入口，按类型动态适配页面配置

## 架构方案

采用 **Resource 独立实体 + Product 引用** 的方案：

- **Resource**：底层数据资产（表/API端点/报告文档/看板配置/用户视图），只含资源描述信息
- **Product**：资源的售卖实例，引用 resourceId，含价格、售卖方式、上架状态等

关系：**1 Resource : 0..1 Product**（一个资源最多对应一个上架商品）

## 1. 领域模型

### Resource（新实体）

```typescript
export interface Resource {
  id: string
  resourceName: string
  type: ResourceType
  origin: ResourceOrigin
  typeDetail: ResourceTypeDetail
  createdBy?: string        // 用数模块创建者
  enterpriseId?: string     // 企业范围（用数视图）
  createdAt: string
  updatedAt: string
}
```

### ResourceType 扩展

```typescript
export type ResourceType = 'dataset' | 'api' | 'report' | 'dashboard' | 'user_view'
```

新增 `user_view` 类型，表示用数模块产出的用户数据视图。

### ResourceOrigin 扩展

```typescript
export type ResourceOrigin = 'asset_platform' | 'app_content' | 'trusted_space' | 'user_created'
```

新增 `user_created`，表示用数模块创建的资源。

### UserViewDetail（用数视图详情）

```typescript
export interface UserViewDetail {
  sourceModule: string    // 来源模块标识，如 "bi-workbench"
  externalId: string      // 用数模块内部的视图 ID
  externalUrl: string     // 跳转链接（查看/编辑）
  chartType: string       // 图表类型摘要
  dataSourceName: string  // 基于哪个数据集
  lastViewedAt?: string
  viewCount?: number
}
```

关键设计原则：**不复制用数模块的图表配置**，只存元信息 + 跳转链接，保持单一数据源。

### Product（修改）

```typescript
export interface Product {
  id: string
  resourceId: string      // → Resource.id（新增）
  name: string            // 面向买家的商品展示名
  // ... 其余字段不变
}
```

### ResourceTypeDetail

```typescript
export interface ResourceTypeDetail {
  dataset?: DatasetDetail
  api?: ApiDetail
  report?: ReportDetail
  dashboard?: DashboardDetail
  userView?: UserViewDetail  // 新增
}
```

## 2. 资源管理中心（后台）

### 导航变更

- 合并前：商品中心 + 内容中心 两个独立入口
- 合并后：统一为"资源管理"入口（`/admin/resources`）
- 删除 ContentCenter 页面，ProductCenter 重构为 ResourceCenter

### 统一资源列表

- 所有资源（含未上架）在一个列表中展示
- 新增"资源名称"列，显示底层资源名（区别于面向买家的商品名）
- 顶部按类型筛选：全部 / 数据集 / API / 报告 / 看板 / 用数视图
- 未上架的资源：商品名称显示"—"，前台状态为"未上架"，操作按钮为绿色"上架"
- 已上架的资源：显示商品名称，前台状态为实际状态，操作按钮为红色"下架"

### 编辑页：类型驱动配置

- 合并现有 ProductEdit 和 ContentEdit 为统一的 ResourceEdit
- 共用区块（基本信息/价格/合规/资源信息）始终显示
- 类型特有区块根据 resource.type 动态渲染：
  - dataset：字段列表、样例数据、探查配置
  - report/dashboard：内容区块、面板指标、预览权限
  - api：参数、响应字段、错误码、沙箱
  - user_view：只读展示（来源模块、跳转链接、元信息）

### 上架操作流程

1. 资源列表点"上架"按钮
2. 弹出上架表单：填写商品名、副标题、价格、售卖方式、场景标签等
3. 提交后创建 Product（引用 resourceId），资源状态变为"已上架"
4. 下架操作：将 availability 设为 delisted，商品从前台消失，资源保留

## 3. 用数产出接入

### 接入边界

| 其他团队负责 | 我们负责 |
|-------------|---------|
| BI 拖拽分析工作台 | 定义 UserView 资源类型并接入 catalog |
| 图表渲染引擎 | 找数搜索时检索到内部用数视图 |
| 视图编辑器 | 搜索结果中用 🏠内部 标签区分 |
| 数据查询引擎 | 资源管理中心展示这些资源（只读） |
| | 点击可跳转到用数模块查看/编辑 |

### 搜索集成

- 搜索结果混合展示市场商品和内部视图
- 每条结果附来源标签：🏪市场 / 🏠内部
- 支持按来源筛选
- 点击内部视图卡片 → 跳转到用数模块（externalUrl），不在 APP 内直接展示图表

### 数据同步

- **原型阶段**：用 Mock 数据模拟已有的用户视图
- **后续迭代**：预留 Webhook 接口定义，用数模块创建/更新视图时主动推送

## 4. 技术架构

### Catalog Store 变更

新增 state/getters/actions：

```typescript
// state
resources: Resource[]

// getters
resourceById(id): Resource | undefined
productForResource(resourceId): Product | undefined
internalViews(enterpriseId?): Resource[]

// actions
listResource(resourceId, salesInfo): void    // 上架
delistProduct(productId): void               // 下架
searchInternalViews(query): Resource[]        // 搜索内部视图
```

### 搜索数据流

```
用户输入搜索词
  ├── catalog.search(query) → Product[]（市场商品，discoverable）
  └── catalog.searchInternalViews(query) → Resource[]（user_view, user_created, 本企业）
        ↓ 前端合并
  按相关性排序，每条结果附 source 标签
```

### 迁移策略

1. 遍历现有 products 数组
2. 每条 Product 创建对应 Resource：resourceName = product.name, typeDetail = product.typeDetail
3. Product 保留 resourceId 引用
4. **对现有代码透明**——前端通过 resourceId 关联获取资源信息
5. 新增 3 条 user_view 类型 mock 资源

### 边界规则

- 一个资源最多上架一次（1:0..1）
- user_view 类型资源不可上架
- 下架后商品从前台消失，资源保留在后台
- 内部视图仅本企业可见（enterpriseId 过滤）

### 错误处理

- 上架重复资源 → 提示"该资源已有上架商品"
- 下架不存在的商品 → 静默忽略（幂等）
- 搜索内部视图失败 → 仅显示市场结果，不阻塞
- 跳转到用数模块失败 → 降级为提示"模块暂不可用"

## 5. 改动文件清单

### 新增

- `src/types/resource.ts` — Resource, UserViewDetail, ResourceOrigin 扩展, ResourceTypeDetail
- `src/views/admin/ResourceCenter.vue` — 合并后的资源管理列表页
- `src/views/admin/ResourceEdit.vue` — 合并后的类型驱动编辑页

### 修改

- `src/types/domain.ts` — Product 增加 resourceId, ProductOrigin 增加 user_created
- `src/stores/catalog.ts` — 增加 resources state, listResource/delistProduct/searchInternalViews
- `src/data/products.ts` / `src/data/mockProducts.ts` — 现有 mock 数据适配 + 新增 user_view mock
- `src/router/index.ts` — 路由替换 /admin/products → /admin/resources，删除 /admin/content 相关路由
- `src/layouts/AdminShell.vue` — 导航项更新（删除内容中心，商品中心改为资源管理）
- `src/views/mobile/SearchResult.vue` — 搜索结果集成内部视图
- `src/views/mobile/AnswerResult.vue` — AI 找数结果集成内部视图

### 删除

- `src/views/admin/ContentEdit.vue` — 内容编辑合并到 ResourceEdit
- `src/views/admin/ProductEdit.vue` — 商品编辑合并到 ResourceEdit
- `src/views/admin/ProductCenter.vue` — 被 ResourceCenter 替代
- `src/views/admin/ContentCenter.vue` — 被 ResourceCenter 替代

## 6. 实施顺序

1. **Task 1：Resource 类型定义 + domain.ts 修改** — 新增 Resource 类型，Product 增加 resourceId
2. **Task 2：Mock 数据迁移** — 现有 mock 数据自动生成 Resource + 新增 user_view mock
3. **Task 3：Catalog Store 扩展** — resources state, 上架/下架 actions, 搜索内部视图
4. **Task 4：资源管理中心（后台）** — ResourceCenter 列表页 + ResourceEdit 编辑页 + 路由/导航
5. **Task 5：找数搜索集成** — SearchResult/AnswerResult 集成内部视图展示
6. **Task 6：测试** — Store 测试 + 组件测试 + 类型检查

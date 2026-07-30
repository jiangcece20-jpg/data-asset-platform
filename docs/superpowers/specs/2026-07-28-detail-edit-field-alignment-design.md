# 详情页与编辑页字段对齐设计

## 概述

精简编辑页冗余字段、补全详情页展示缺口，确保每个编辑字段都有展示出口、每个展示位都有编辑入口。同时按交易渠道区分价格编辑权限。

## 背景问题

1. **标题重复**：`name` + `displayTitle` 两个字段竞争同一展示位
2. **死字段**：`manualDescription`、`previewNote` 在编辑页维护但无任何渲染点
3. **说明书断裂**：详情页的"商品说明书"由 4 字段拼合，而 `manualDescription`（说明书补充）未接入
4. **tags 无展示**：编辑页维护标签，详情页不渲染
5. **recommendText 缺席**：推荐语仅出现在商品卡片列表，详情页不展示

## 设计决策

### 1. 删除字段

| 字段 | 删除原因 |
|------|---------|
| `displayTitle` | 与 `name` 重复，统一为 `name` 一个入口 |
| `manualDescription` | 无展示点，死字段 |
| `previewNote` | 无展示点，死字段 |

从以下位置移除：
- `Product` 类型定义（domain.ts）
- 编辑页表单（ResourceEdit.vue）
- 种子数据（products.ts）
- Store getter（catalog.ts 的 `displayTitle` getter）
- 所有引用处

### 2. 详情页标题卡片区调整

```
┌─────────────────────────────────────────────┐
│ [类型] [渠道] [状态]                    ★收藏 │
│                                             │
│ product.name                     （大标题）  │
│ recommendText || subtitle        （副标题行）│
│ [tag1] [tag2] [tag3]             （标签行）  │
└─────────────────────────────────────────────┘
```

- **大标题**：直接读 `product.name`
- **副标题行**：`product.recommendText || product.subtitle`（推荐语优先，无则回退副标题）
- **标签行（新增）**：`product.tags` 以 pill 样式展示，无 tags 时不渲染该行

### 3. 价格编辑权限按交易渠道区分

| 交易渠道 | 编辑页价格区行为 |
|---------|----------------|
| `app_payment` | 显示完整价格编辑表单 |
| `space_purchase` | **隐藏**价格设置区（价格由可信空间同步，本地不可编辑） |

实现：编辑页"价格设置"段增加 `v-if="product.dealChannel === 'app_payment'"` 条件。

### 4. 编辑页最终字段表

| 分段 | 字段 | 详情页展示位 |
|------|------|-------------|
| 基本信息 | name | 标题 |
| 基本信息 | subtitle | 副标题行（recommendText 为空时回退） |
| 基本信息 | description | 商品说明书 |
| 基本信息 | valueProposition | 商品说明书 |
| 基本信息 | scenarios | 商品说明书 / 场景标签 |
| 价格设置（仅 app_payment） | priceModel, itemPrice, memberDiscount, acquisitions, memberIncluded | 购买面板 |
| 运营信息 | coverage | 基本信息网格 |
| 运营信息 | updateFrequency | 基本信息网格 |
| 运营信息 | deliveryMethod | 基本信息网格 |
| 运营信息 | provider | 基本信息网格 |
| 运营信息 | qualityPromise | 商品说明书 |
| 运营信息 | complianceNote | 商品说明书 |
| 展示与推荐 | recommendText | 标题卡片副标题行 |
| 展示与推荐 | tags | 标题卡片标签行 |
| 展示与推荐 | sortWeight | 内部排序（不直面用户） |
| 展示与推荐 | recommendSlot | 推荐位控制（不直面用户） |

### 5. Store 层变更

- 删除 `catalog.displayTitle()` getter
- 所有引用处（PortalProductDetail、ProductCard、移动端等）改为直接读 `product.name`
- ProductCard 副标题逻辑：`product.recommendText || product.subtitle`

### 6. 影响范围

| 文件 | 变更 |
|------|------|
| `types/domain.ts` | 移除 displayTitle、manualDescription、previewNote 字段 |
| `stores/catalog.ts` | 删除 displayTitle getter、updateEnhancement 中相关字段 |
| `data/products.ts` | 移除种子数据中三个字段 |
| `views/admin/ResourceEdit.vue` | 移除三个表单字段 + 价格区加 dealChannel 条件 |
| `views/portal/PortalProductDetail.vue` | 标题改 name、副标题逻辑、新增 tags 行 |
| `views/portal/components/Portal*Detail.vue` | 无变化（说明书区已有的 4 字段保持） |
| `components/mobile/ProductCard.vue` | title 改 name、subtitle 逻辑 |
| 其他引用 displayTitle 的组件 | 替换为 name |

## 验证标准

- `npx vue-tsc --noEmit` 零错误
- `npx vitest run` 全部通过
- 详情页标题卡片展示：name + recommendText/subtitle + tags
- 编辑页无死字段（每个字段有对应展示出口）
- 可信空间商品编辑页不显示价格设置区

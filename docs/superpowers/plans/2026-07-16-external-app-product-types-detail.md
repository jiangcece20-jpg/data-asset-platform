# External App Product Types and Detail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `external-app-vue3` 的前台商品收口为数据集、API、行业报告、自有看板四类，并交付类型化 Tab 详情、可信空间购买规则、内容付费墙、限期权益和“求上架”闭环。

**Architecture:** 保留 Vue 3 + Pinia + Vue Router 的单页原型架构，新增纯函数商品动作决策层和可测试的领域模型；商品详情改为通用壳层加四个类型组件。目录、权益、求上架与 PC 线索页通过 Pinia mock 状态联动，所有正式数据/API 交易仍只模拟跳转可信空间。

**Tech Stack:** Vue 3.4、TypeScript 5.5、Vite 5、Pinia 2、Vue Router 4、Tailwind CSS 3、Vitest 3、Vue Test Utils 2、jsdom 26。

## Global Constraints

- 只修改 `external-app-vue3` 及其 README；不修改仓库内 React 工程、旧 HTML 原型或 `external-app-vue3_old_1783768156`。
- 前台标准商品类型固定为 `dataset`、`api`、`report`、`dashboard` 四类。
- 数据集与 API 只能在可信空间购买；数据集不提供试用，API 仅提供固定脱敏沙箱结果。
- 行业报告支持免费、会员、单品购买；单品权益永久绑定购买时的报告版本，不包含后续独立版本。
- 自有看板支持免费、会员、单品购买；单品权益默认有效 12 个月。
- 候选数据集/API 可被搜索，但不得展示样例值、真实响应、价格、下载、试用或正式调用入口。
- 求上架状态固定为 `submitted → evaluating → preparing → published | unsupported`。
- 数据集不通过 APP 下载或邮件附件交付；正式数据/API 交付统一由可信空间负责。
- 不接入真实支付、可信空间订单、API 网关、PDF 阅读器或生产级鉴权。
- `external-app-vue3/preview` 是既有构建产物，不纳入源代码提交；验证使用被忽略的 `dist`。

---

## File Structure

### Create

- `external-app-vue3/vitest.config.ts`：Vitest + Vue + jsdom 配置。
- `external-app-vue3/src/domain/productAccess.ts`：商品主动作、次动作和权益可见性的纯函数决策。
- `external-app-vue3/src/domain/productAccess.test.ts`：主动作优先级和异常状态测试。
- `external-app-vue3/src/data/products.ts`：四类商品与类型附件的唯一种子数据源。
- `external-app-vue3/src/data/products.test.ts`：类型收口、交易渠道、候选可见性和样例安全测试。
- `external-app-vue3/src/components/mobile/product-detail/ProductDetailTabs.vue`：通用横向 Tab 导航。
- `external-app-vue3/src/components/mobile/product-detail/ProductSummaryCard.vue`：通用商品摘要。
- `external-app-vue3/src/components/mobile/product-detail/ProductPrimaryAction.vue`：固定底部主/次动作展示。
- `external-app-vue3/src/components/mobile/product-detail/ContentGate.vue`：`visible/masked/locked` 内容门控。
- `external-app-vue3/src/components/mobile/product-detail/DatasetDetail.vue`：数据集四 Tab。
- `external-app-vue3/src/components/mobile/product-detail/ApiDetail.vue`：API 四 Tab与本地沙箱。
- `external-app-vue3/src/components/mobile/product-detail/ReportDetail.vue`：行业报告四 Tab与内容区块门控。
- `external-app-vue3/src/components/mobile/product-detail/DashboardDetail.vue`：自有看板四 Tab与指标打码。
- `external-app-vue3/src/components/mobile/product-detail/ProductDetailTabs.test.ts`：Tab 唯一激活与事件测试。
- `external-app-vue3/src/components/mobile/product-detail/ContentGate.test.ts`：三种门控模式测试。
- `external-app-vue3/src/components/mobile/product-detail/ApiDetail.test.ts`：沙箱参数和固定结果测试。
- `external-app-vue3/src/stores/entitlements.test.ts`：报告版本权益和看板到期测试。
- `external-app-vue3/src/stores/listingRequests.ts`：求上架提交、去重和状态推进。
- `external-app-vue3/src/stores/listingRequests.test.ts`：求上架 store 测试。
- `external-app-vue3/src/views/mobile/ListingRequest.vue`：轻量求上架表单和提交结果。

### Modify

- `external-app-vue3/.gitignore`：忽略 `preview`。
- `external-app-vue3/package.json`、`package-lock.json`：加入测试依赖与脚本。
- `external-app-vue3/tsconfig.json`：纳入测试文件的 Vitest 类型。
- `external-app-vue3/src/types/domain.ts`：四类商品、来源、可用状态、获取方式、类型附件、权益策略和求上架模型。
- `external-app-vue3/src/data/seed.ts`：改为从 `products.ts` 引入商品，保留企业、订单、审批等其他种子。
- `external-app-vue3/src/utils/productMeta.ts`：四类类型、来源和获取方式元数据。
- `external-app-vue3/src/utils/statusMeta.ts`、`src/components/StatusBadge.vue`：新增商品可用状态与求上架状态。
- `external-app-vue3/src/stores/catalog.ts`：候选资产可发现、四类搜索和来源同步。
- `external-app-vue3/src/stores/entitlements.ts`：报告版本权益和看板限期权益。
- `external-app-vue3/src/stores/orders.ts`：单品购买按商品生成正确权益。
- `external-app-vue3/src/views/mobile/ProductDetail.vue`：改为通用详情壳和类型组件路由。
- `external-app-vue3/src/components/mobile/ProductCard.vue`：候选/准备中/可购买状态文案与动作提示。
- `external-app-vue3/src/views/mobile/DiscoverHome.vue`、`SearchResult.vue`：四类频道与筛选。
- `external-app-vue3/src/views/mobile/CheckoutItem.vue`：报告版本权益和看板 12 个月权益说明。
- `external-app-vue3/src/views/mobile/Mine.vue`：权益期限、报告版本和求上架记录。
- `external-app-vue3/src/views/admin/TrialsLeads.vue`：增加“求上架”处理分区，不新增后台一级导航。
- `external-app-vue3/src/views/admin/ProductCenter.vue`、`ProductEdit.vue`、`ContentCenter.vue`、`CommerceCenter.vue`、`EnterpriseBenefits.vue`：适配新类型、来源和获取方式。
- `external-app-vue3/src/stores/approval.ts`、`src/views/admin/ApprovalIntegration.vue`：保持审批状态与前台可用状态分离。
- `external-app-vue3/src/router/index.ts`：新增求上架路由。
- `external-app-vue3/README.md`：同步四类商品、详情 Tab、交易与演示链路。

---

### Task 1: Establish the Test Harness and Product Decision Model

**Files:**
- Modify: `external-app-vue3/.gitignore`
- Modify: `external-app-vue3/package.json`
- Modify: `external-app-vue3/package-lock.json`
- Modify: `external-app-vue3/tsconfig.json`
- Create: `external-app-vue3/vitest.config.ts`
- Modify: `external-app-vue3/src/types/domain.ts`
- Create: `external-app-vue3/src/domain/productAccess.ts`
- Test: `external-app-vue3/src/domain/productAccess.test.ts`

**Interfaces:**
- Produces: `StandardProductType`, `ProductOrigin`, `AvailabilityStatus`, `AcquisitionOption`, `EntitlementPolicy`, `ProductActionContext`, `ProductAction`, `resolveProductActions(context)`。
- Consumes: 无；这是后续所有任务的领域契约。

- [ ] **Step 1: Add the test dependencies and scripts**

将 `package.json` 的脚本和开发依赖更新为：

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vue-tsc -b --noCheck && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.2",
    "@vue/test-utils": "^2.4.6",
    "autoprefixer": "^10.4.20",
    "jsdom": "^26.0.0",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.1",
    "vitest": "^3.0.0",
    "vue-tsc": "^2.0.29"
  }
}
```

运行：

```bash
cd external-app-vue3 && npm install
```

预期：安装成功并更新 `package-lock.json`，不升级 Vue、Pinia 或 Vue Router 的主版本。

- [ ] **Step 2: Configure Vitest and ignore generated preview files**

创建 `vitest.config.ts`：

```ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    clearMocks: true
  }
})
```

在 `.gitignore` 增加独立一行 `preview`，在 `tsconfig.json` 的 `compilerOptions.types` 中增加 `vitest/globals`。

- [ ] **Step 3: Write the failing product-action tests**

创建 `src/domain/productAccess.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { resolveProductActions, type ProductActionContext } from './productAccess'

const base: ProductActionContext = {
  type: 'dataset',
  availability: 'published',
  acquisitions: ['space_purchase'],
  hasAccess: false,
  hasOpenListingRequest: false,
  enterpriseAuthenticated: false
}

describe('resolveProductActions', () => {
  it('prioritizes existing access', () => {
    expect(resolveProductActions({ ...base, hasAccess: true }).primary.key).toBe('view')
  })

  it('routes candidates to listing requests', () => {
    expect(resolveProductActions({ ...base, availability: 'candidate' }).primary.key).toBe('request_listing')
  })

  it('routes requested candidates to listing progress', () => {
    expect(resolveProductActions({ ...base, availability: 'candidate', hasOpenListingRequest: true }).primary.key).toBe('listing_progress')
  })

  it('routes preparing assets to progress', () => {
    expect(resolveProductActions({ ...base, availability: 'preparing' }).primary.key).toBe('listing_progress')
  })

  it('requires enterprise authentication before trusted-space purchase', () => {
    expect(resolveProductActions(base).primary.key).toBe('enterprise_auth')
    expect(resolveProductActions({ ...base, enterpriseAuthenticated: true }).primary.key).toBe('space_purchase')
  })

  it('offers membership first and item purchase second', () => {
    const actions = resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase']
    })
    expect(actions.primary.key).toBe('member_purchase')
    expect(actions.secondary?.key).toBe('item_purchase')
  })

  it('opens free products without purchase', () => {
    expect(resolveProductActions({ ...base, type: 'dashboard', acquisitions: ['free'] }).primary.key).toBe('free_view')
  })

  it('blocks paused and delisted products', () => {
    expect(resolveProductActions({ ...base, availability: 'paused' }).primary.key).toBe('unavailable')
    expect(resolveProductActions({ ...base, availability: 'delisted' }).primary.key).toBe('unavailable')
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

运行：

```bash
cd external-app-vue3 && npm test -- src/domain/productAccess.test.ts
```

预期：FAIL，提示无法找到 `./productAccess`。

- [ ] **Step 5: Add the final domain primitives without breaking the legacy catalog**

在 `src/types/domain.ts` 中增加以下类型；本任务暂时保留旧 `ProductType`、`Product`、`ProductTypeDetail`、`source` 和试用字段，确保基线仍可构建。Task 2 在新种子数据准备完成后一次性完成替换：

```ts
export type StandardProductType = 'dataset' | 'api' | 'report' | 'dashboard'
export type ProductOrigin = 'asset_platform' | 'app_content' | 'trusted_space'
export type AvailabilityStatus = 'candidate' | 'preparing' | 'published' | 'paused' | 'delisted'
export type AcquisitionOption = 'free' | 'member' | 'item_purchase' | 'space_purchase'
export type PreviewMode = 'visible' | 'masked' | 'locked'
export type EntitlementPolicy =
  | { kind: 'report_version'; version: string }
  | { kind: 'term'; months: number }

export interface DatasetField {
  name: string
  dataType: string
  meaning: string
  description: string
  primaryKey: boolean
  nullable: boolean
  sensitivity?: 'L1' | 'L2' | 'L3'
}

export interface DatasetDetail {
  granularity: string
  timeRange: string
  rowCount: number
  classification: string
  qualityUpdatedAt: string
  fields: DatasetField[]
  sampleColumns: string[]
  sampleRows: Array<Record<string, string | number>>
  sampleGeneratedAt: string
  profiling: {
    completeness: string
    uniqueness: string
    nullRate: string
    distribution: string
    anomalies: string
    conclusion: string
    updatedAt: string
  }
}

export interface ApiParameter {
  name: string
  location: 'query' | 'body' | 'header'
  dataType: string
  required: boolean
  description: string
  example: string
}

export interface ApiDetail {
  method: 'GET' | 'POST'
  pathExample: string
  version: string
  authentication: string
  parameters: ApiParameter[]
  responseFields: Array<{ name: string; dataType: string; description: string }>
  sandbox: {
    editableParameters: string[]
    fixedResponse: Record<string, string | number | boolean>
    simulatedLatencyMs: number
  }
  errorCodes: Array<{ code: string; message: string }>
  sla: string
  rateLimit: string
  billing: string
}

export interface ReportContentBlock {
  id: string
  title: string
  kind: 'text' | 'metric' | 'chart' | 'pdf_page'
  content: string
  preview: PreviewMode
}

export interface ReportDetail {
  author: string
  publishedAt: string
  version: string
  audience: string
  catalog: Array<{ title: string; previewable: boolean }>
  blocks: ReportContentBlock[]
  license: string
}

export interface DashboardDetail {
  timeRange: string
  updateCycle: string
  metrics: Array<{ name: string; definition: string; formula: string; dimensions: string[]; preview: PreviewMode }>
  panels: Array<{ id: string; title: string; chartType: 'line' | 'bar' | 'number'; preview: PreviewMode; summary: string }>
  exportRule: string
}
```

本任务不修改现有 `Product` 和 `Entitlement` 的字段，避免基线种子与页面提前失配。

- [ ] **Step 6: Implement the pure product-action resolver**

创建 `src/domain/productAccess.ts`：

```ts
import type { AcquisitionOption, AvailabilityStatus, StandardProductType } from '@/types/domain'

export type ProductActionKey =
  | 'view'
  | 'request_listing'
  | 'listing_progress'
  | 'enterprise_auth'
  | 'space_purchase'
  | 'free_view'
  | 'member_purchase'
  | 'item_purchase'
  | 'unavailable'

export interface ProductAction {
  key: ProductActionKey
  label: string
  disabled?: boolean
}

export interface ProductActionContext {
  type: StandardProductType
  availability: AvailabilityStatus
  acquisitions: AcquisitionOption[]
  hasAccess: boolean
  hasOpenListingRequest: boolean
  enterpriseAuthenticated: boolean
}

export function resolveProductActions(context: ProductActionContext): {
  primary: ProductAction
  secondary?: ProductAction
} {
  if (context.hasAccess) return { primary: { key: 'view', label: '立即查看' } }
  if (context.availability === 'candidate') {
    return {
      primary: context.hasOpenListingRequest
        ? { key: 'listing_progress', label: '查看上架进度' }
        : { key: 'request_listing', label: '求上架' }
    }
  }
  if (context.availability === 'preparing') return { primary: { key: 'listing_progress', label: '查看上架进度' } }
  if (context.availability === 'paused' || context.availability === 'delisted') {
    return { primary: { key: 'unavailable', label: context.availability === 'paused' ? '暂停销售' : '已下架', disabled: true } }
  }
  if (context.acquisitions.includes('space_purchase')) {
    return {
      primary: context.enterpriseAuthenticated
        ? { key: 'space_purchase', label: '前往可信空间购买' }
        : { key: 'enterprise_auth', label: '完成企业认证' }
    }
  }
  if (context.acquisitions.includes('free')) return { primary: { key: 'free_view', label: '免费查看' } }
  if (context.acquisitions.includes('member')) {
    return {
      primary: { key: 'member_purchase', label: '开通会员' },
      secondary: context.acquisitions.includes('item_purchase')
        ? { key: 'item_purchase', label: '单品购买' }
        : undefined
    }
  }
  return { primary: { key: 'item_purchase', label: '单品购买' } }
}
```

- [ ] **Step 7: Run focused tests and build**

运行：

```bash
cd external-app-vue3 && npm test -- src/domain/productAccess.test.ts && npm run build
```

预期：产品动作测试 PASS；基线 Vue 类型检查和 Vite 构建 PASS。若失败，本任务内修复测试配置或新增类型带来的兼容问题，不提交无法构建的中间状态。

- [ ] **Step 8: Commit the project baseline plus the decision model**

首次提交只纳入源代码和配置，不纳入 `preview`、`node_modules` 或旧备份：

```bash
git add external-app-vue3/.gitignore external-app-vue3/README.md external-app-vue3/index.html external-app-vue3/package.json external-app-vue3/package-lock.json external-app-vue3/postcss.config.js external-app-vue3/tailwind.config.js external-app-vue3/tsconfig.json external-app-vue3/tsconfig.node.json external-app-vue3/vite.config.ts external-app-vue3/vitest.config.ts external-app-vue3/src
git commit -m "chore: establish external app vue prototype baseline"
```

预期：`external-app-vue3/preview` 与 `external-app-vue3_old_1783768156` 仍未被暂存。

---

### Task 2: Migrate the Catalog to Four Safe Product Types

**Files:**
- Create: `external-app-vue3/src/data/products.ts`
- Test: `external-app-vue3/src/data/products.test.ts`
- Modify: `external-app-vue3/src/data/seed.ts`
- Modify: `external-app-vue3/src/stores/catalog.ts`
- Modify: `external-app-vue3/src/utils/productMeta.ts`
- Modify: `external-app-vue3/src/utils/statusMeta.ts`
- Modify: `external-app-vue3/src/components/StatusBadge.vue`
- Modify: `external-app-vue3/src/components/mobile/ProductCard.vue`
- Modify: `external-app-vue3/src/views/mobile/DiscoverHome.vue`
- Modify: `external-app-vue3/src/views/mobile/SearchResult.vue`
- Modify: `external-app-vue3/src/views/admin/ProductCenter.vue`
- Modify: `external-app-vue3/src/views/admin/ProductEdit.vue`
- Modify: `external-app-vue3/src/stores/approval.ts`

**Interfaces:**
- Consumes: Task 1 的 `StandardProductType`、`AvailabilityStatus`、`AcquisitionOption`。
- Produces: `seedProducts`、`catalog.discoverable`、`catalog.search()` 和四类元数据。

- [ ] **Step 1: Write failing catalog-contract tests**

创建 `src/data/products.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { seedProducts } from './products'

describe('four-type product catalog', () => {
  it('contains only the four approved public types', () => {
    expect(new Set(seedProducts.map((product) => product.type))).toEqual(
      new Set(['dataset', 'api', 'report', 'dashboard'])
    )
  })

  it('routes every dataset and API to trusted-space purchase', () => {
    for (const product of seedProducts.filter((item) => item.type === 'dataset' || item.type === 'api')) {
      expect(product.dealChannel).toBe('space_purchase')
      expect(product.acquisitions).toEqual(['space_purchase'])
    }
  })

  it('keeps candidate assets free of samples and real responses', () => {
    for (const product of seedProducts.filter((item) => item.availability === 'candidate')) {
      expect(product.typeDetail.dataset?.sampleRows ?? []).toHaveLength(0)
      expect(product.typeDetail.api?.sandbox.fixedResponse ?? {}).toEqual({})
    }
  })

  it('limits published dataset samples to ten rows', () => {
    for (const product of seedProducts.filter((item) => item.type === 'dataset' && item.availability === 'published')) {
      expect(product.typeDetail.dataset?.sampleRows.length).toBeLessThanOrEqual(10)
    }
  })
})
```

- [ ] **Step 2: Run the catalog test to verify it fails**

运行：

```bash
cd external-app-vue3 && npm test -- src/data/products.test.ts
```

预期：FAIL，提示 `./products` 不存在。

- [ ] **Step 3: Create the exact representative catalog**

创建 `src/data/products.ts`，使用以下固定商品集合；每个商品必须填写 Task 1 定义的类型附件，不保留 `pq_pir`、`joint_analysis` 或 `solution`：

| ID | 类型 | 来源 | 可用状态 | 获取方式 | 关键演示状态 |
| --- | --- | --- | --- | --- | --- |
| `prod-freight-index` | dashboard | app_content | published | member + item_purchase | 会员/12 个月单品、图表打码 |
| `prod-cold-chain-dashboard` | dashboard | app_content | paused | member + item_purchase | 暂停销售 |
| `prod-port-dashboard-free` | dashboard | app_content | published | free | 免费完整看板 |
| `prod-logistics-monthly` | report | app_content | published | member + item_purchase | visible/masked/locked 混合区块 |
| `prod-industry-brief-free` | report | app_content | published | free | 免费报告 |
| `prod-qualification-api` | api | trusted_space | published | space_purchase | 固定脱敏沙箱 |
| `prod-privacy-verify` | api | trusted_space | published | space_purchase | 原 PQ/PIR 迁移为 API |
| `prod-enterprise-activity` | dataset | trusted_space | published | space_purchase | 5 行脱敏样例与探查报告 |
| `prod-driver-credit-candidate` | dataset | asset_platform | candidate | space_purchase | 有限字段信息、无样例、求上架 |

数据集脱敏样例固定使用 `ENT-8A12`、`ENT-2C31` 等不可逆演示 ID；API 沙箱固定返回：

```ts
{
  requestId: 'sandbox-demo-001',
  valid: true,
  vehicleClass: 'A2',
  expireAt: '2028-05-01'
}
```

候选司机信用数据集的 `sampleRows` 必须是空数组，探查结论只显示“资料准备中”，不得出现司机样例值。

- [ ] **Step 4: Atomically switch Product to the four-type contract**

在 `domain.ts` 中完成兼容字段收口：

```ts
export type ProductType = StandardProductType
export type DealChannel = 'app_payment' | 'space_purchase'
export type PriceModel = 'free' | 'member_free' | 'member_discount' | 'item_only' | 'quote'

export interface ProductTypeDetail {
  dataset?: DatasetDetail
  api?: ApiDetail
  report?: ReportDetail
  dashboard?: DashboardDetail
}

export interface Product {
  id: string
  name: string
  subtitle: string
  type: ProductType
  origin: ProductOrigin
  dealChannel: DealChannel
  availability: AvailabilityStatus
  acquisitions: AcquisitionOption[]
  entitlementPolicy?: EntitlementPolicy
  scenarios: string[]
  provider: string
  coverage: string
  updateFrequency: string
  qualityPromise: string
  complianceNote: string
  price: ProductPrice
  status: ProductStatus
  tags: string[]
  description: string
  valueProposition: string
  deliveryMethod: string
  memberIncluded: boolean
  spaceProductNo?: string
  spaceSyncedAt?: string
  updatedAt: string
  typeDetail: ProductTypeDetail
  favorite?: boolean
}
```

删除 `ProductSource` 以及 `Product` 的 `source`、`trialPolicy`、`trialMode`；保留独立的 `TrialMode` 和 `TrialApplication` 类型供历史试用记录使用。为 `Entitlement` 增加可选 `productVersion?: string`，并将 `validTo` 改为 `validTo?: string`。

- [ ] **Step 5: Re-export products and make candidates discoverable**

从 `seed.ts` 删除原七类 `seedProducts` 定义，改为：

```ts
export { seedProducts } from './products'
import { seedProducts } from './products'
```

在 `catalog.ts` 增加：

```ts
getters: {
  discoverable(state): Product[] {
    return state.products.filter((product) => ['candidate', 'published', 'paused'].includes(product.availability))
  }
},
actions: {
  updateAvailability(productId: string, availability: AvailabilityStatus) {
    const product = this.products.find((item) => item.id === productId)
    if (product) {
      product.availability = availability
      product.updatedAt = now()
    }
  }
}
```

让 `search()` 基于 `this.discoverable`，筛选 `type` 和 `dealChannel`；推荐位只允许 `availability === 'published'`。`syncSpaceProducts()` 只处理 `dealChannel === 'space_purchase' && availability === 'published'` 的商品，不再判断已删除的 `source`。

- [ ] **Step 6: Replace public type, source, and status metadata**

`productMeta.ts` 固定为：

```ts
export const typeMeta = {
  dataset: { label: '数据集', icon: '🗄️' },
  api: { label: 'API', icon: '🔌' },
  report: { label: '行业报告', icon: '📘' },
  dashboard: { label: '自有看板', icon: '📊' }
} satisfies Record<ProductType, { label: string; icon: string }>

export const originMeta = {
  asset_platform: '资产平台',
  app_content: 'APP 自有内容',
  trusted_space: '可信空间'
} satisfies Record<ProductOrigin, string>
```

`dealChannelMeta` 只保留 APP 购买和可信空间购买。`statusMeta.ts` 新增 `availability` 字典：候选资产、上架准备中、已上架、暂停销售、已下架；`StatusBadge.vue` 的 `dict` 联合类型同步增加 `availability`。

- [ ] **Step 7: Update cards, filters, and admin references**

- `DiscoverHome.vue` 与 `SearchResult.vue` 的类型数组固定为 `['dataset', 'api', 'report', 'dashboard']`。
- `SearchResult.vue` 渠道固定为 `['space_purchase', 'app_payment']`。
- `ProductCard.vue` 删除试用标签；候选显示“可申请上架”，准备中显示“查看进度”，空间商品显示“空间购买”，APP 商品按免费/会员/单品显示。
- `ProductCenter.vue` 与 `ProductEdit.vue` 将 `source` 改为 `origin`，保留后台 `ProductStatus` 审批流程，并另外显示 `AvailabilityStatus`。
- `ProductEdit.vue` 删除“试用政策”输入，改为来源、前台可用状态和获取方式；数据集/API 的获取方式只读为可信空间购买。
- `approval.ts` 审批通过只推进内部 `ProductStatus`；调用发布动作时再将 `availability` 设为 `published`。

- [ ] **Step 8: Run catalog tests and the full build**

运行：

```bash
cd external-app-vue3 && npm test -- src/data/products.test.ts && npm run build
```

预期：测试 PASS；构建 PASS；代码库不再出现 `pq_pir`、`joint_analysis`、`solution` 的运行时类型分支。

- [ ] **Step 9: Commit**

```bash
git add external-app-vue3/src/types external-app-vue3/src/data external-app-vue3/src/stores/catalog.ts external-app-vue3/src/stores/approval.ts external-app-vue3/src/utils external-app-vue3/src/components/StatusBadge.vue external-app-vue3/src/components/mobile/ProductCard.vue external-app-vue3/src/views/mobile/DiscoverHome.vue external-app-vue3/src/views/mobile/SearchResult.vue external-app-vue3/src/views/admin/ProductCenter.vue external-app-vue3/src/views/admin/ProductEdit.vue
git commit -m "feat: consolidate external app product catalog"
```

---

### Task 3: Build the Shared Tabbed Product Detail Shell

**Files:**
- Create: `external-app-vue3/src/components/mobile/product-detail/ProductDetailTabs.vue`
- Create: `external-app-vue3/src/components/mobile/product-detail/ProductSummaryCard.vue`
- Create: `external-app-vue3/src/components/mobile/product-detail/ProductPrimaryAction.vue`
- Test: `external-app-vue3/src/components/mobile/product-detail/ProductDetailTabs.test.ts`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`

**Interfaces:**
- Consumes: `resolveProductActions()`、`Product`、`ProductAction`。
- Produces: `DetailTab { key: string; label: string }`、`ProductDetailTabs` 的 `update:modelValue` 事件、`ProductPrimaryAction` 的 `action` 事件。

- [ ] **Step 1: Write the failing Tab component test**

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProductDetailTabs from './ProductDetailTabs.vue'

describe('ProductDetailTabs', () => {
  it('renders one active tab and emits the selected key', async () => {
    const wrapper = mount(ProductDetailTabs, {
      props: {
        modelValue: 'basic',
        tabs: [
          { key: 'basic', label: '基本信息' },
          { key: 'fields', label: '字段信息' }
        ]
      }
    })
    expect(wrapper.find('[aria-selected="true"]').text()).toBe('基本信息')
    await wrapper.get('button[data-tab="fields"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['fields'])
  })
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

运行 `cd external-app-vue3 && npm test -- ProductDetailTabs.test.ts`。

预期：FAIL，组件文件不存在。

- [ ] **Step 3: Implement the generic Tab contract**

`ProductDetailTabs.vue` 使用以下公开契约：

```ts
export interface DetailTab {
  key: string
  label: string
}

defineProps<{ modelValue: string; tabs: DetailTab[] }>()
const emit = defineEmits<{ 'update:modelValue': [key: string] }>()
```

每个按钮使用 `role="tab"`、`:aria-selected="modelValue === tab.key"` 和 `:data-tab="tab.key"`；容器使用横向滚动和吸顶白底，不使用位置索引作为状态。

- [ ] **Step 4: Implement summary and fixed-action presentational components**

`ProductSummaryCard.vue` 接收 `product: Product` 与 `title: string`，展示类型、来源、`AvailabilityStatus`、更新频率和标签。

`ProductPrimaryAction.vue` 接收：

```ts
defineProps<{ primary: ProductAction; secondary?: ProductAction; priceText?: string }>()
const emit = defineEmits<{ action: [key: ProductActionKey] }>()
```

禁用动作不触发事件；主按钮和次按钮均显示明确文案，不在该组件内读取 router 或 store。

- [ ] **Step 5: Refactor ProductDetail into the shell**

`ProductDetail.vue` 负责：

```ts
const activeTab = ref('basic')
const access = computed(() => product.value
  ? entitlements.accessLevel(product.value.id, product.value.memberIncluded)
  : 'none')
const actions = computed(() => product.value ? resolveProductActions({
  type: product.value.type,
  availability: product.value.availability,
  acquisitions: product.value.acquisitions,
  hasAccess: access.value !== 'none',
  hasOpenListingRequest: false,
  enterpriseAuthenticated: user.isEnterpriseAuthenticated
}) : null)
```

动作路由固定为：`request_listing → /app/listing-request/:id`、`listing_progress → /app/mine?tab=求上架`、`enterprise_auth → /app/enterprise-auth`、`space_purchase → /app/space-bridge/:id`、`member_purchase → /app/checkout/member`、`item_purchase → /app/checkout/item/:id`。`view/free_view` 将当前 Tab 切换到报告 `reader` 或看板 `preview`，数据集/API 则保持当前详情。类型内容在 Task 4/5 注入；本任务先让四类各显示对应 Tab 标签和“资料准备中”的稳定空态，确保壳层可独立验证。

- [ ] **Step 6: Run tests and build**

运行：

```bash
cd external-app-vue3 && npm test -- ProductDetailTabs.test.ts src/domain/productAccess.test.ts && npm run build
```

预期：PASS；四类详情路由均能构建，固定操作区不出现冲突主按钮。

- [ ] **Step 7: Commit**

```bash
git add external-app-vue3/src/components/mobile/product-detail external-app-vue3/src/views/mobile/ProductDetail.vue
git commit -m "feat: add shared tabbed product detail shell"
```

---

### Task 4: Implement Dataset and API Evaluation Tabs

**Files:**
- Create: `external-app-vue3/src/components/mobile/product-detail/DatasetDetail.vue`
- Create: `external-app-vue3/src/components/mobile/product-detail/ApiDetail.vue`
- Test: `external-app-vue3/src/components/mobile/product-detail/ApiDetail.test.ts`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`

**Interfaces:**
- Consumes: `DatasetDetail`、`ApiDetail` 类型附件；父级传入 `product` 与 `activeTab`。
- Produces: 数据集 Tab keys `basic|fields|samples|profiling`；API Tab keys `basic|docs|sandbox|sla`。

- [ ] **Step 1: Write the failing API sandbox tests**

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ApiDetail from './ApiDetail.vue'
import { seedProducts } from '@/data/products'

const api = seedProducts.find((product) => product.id === 'prod-qualification-api')!

describe('ApiDetail sandbox', () => {
  it('rejects missing required parameters', async () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'sandbox' } })
    await wrapper.get('[data-testid="sandbox-send"]').trigger('click')
    expect(wrapper.text()).toContain('请输入 idCardNo')
  })

  it('returns the fixed sandbox response without a real request', async () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'sandbox' } })
    await wrapper.get('[data-param="idCardNo"]').setValue('110101199001010011')
    await wrapper.get('[data-param="certificateNo"]').setValue('CERT-A2-001')
    await wrapper.get('[data-testid="sandbox-send"]').trigger('click')
    expect(wrapper.text()).toContain('sandbox-demo-001')
    expect(wrapper.text()).toContain('不调用真实服务')
  })

  it('keeps parameters when a simulated sandbox failure is selected', async () => {
    const wrapper = mount(ApiDetail, { props: { product: api, activeTab: 'sandbox' } })
    await wrapper.get('[data-param="idCardNo"]').setValue('110101199001010011')
    await wrapper.get('[data-param="certificateNo"]').setValue('CERT-A2-001')
    await wrapper.get('[data-testid="sandbox-fail"]').trigger('click')
    expect(wrapper.text()).toContain('沙箱服务暂时繁忙，请重试')
    expect((wrapper.get('[data-param="idCardNo"]').element as HTMLInputElement).value).toBe('110101199001010011')
  })
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

运行 `cd external-app-vue3 && npm test -- ApiDetail.test.ts`。

预期：FAIL，API 详情组件不存在。

- [ ] **Step 3: Implement DatasetDetail**

组件 props：

```ts
defineProps<{ product: Product; activeTab: 'basic' | 'fields' | 'samples' | 'profiling' }>()
```

- `basic`：描述、更新频率、最后更新时间、行数、分类、粒度、时间范围、来源。
- `fields`：字段名、类型、业务含义、描述、主键、可空、已审核敏感等级。
- `samples`：仅 `availability === 'published'` 且最多 10 行；显示脱敏、水印和生成时间。候选资产显示“上架审核通过后提供脱敏样例”。
- `profiling`：完整率、唯一性、空值率、分布、异常、结论、更新时间；候选资产显示“资料准备中”。

候选资产的模板不得访问或序列化 `sampleRows` 内容。

- [ ] **Step 4: Implement ApiDetail with a local-only sandbox**

使用 `reactive<Record<string, string>>` 保存白名单参数；点击发送时逐个检查 `required` 参数。成功后直接把 `detail.sandbox.fixedResponse` 赋给本地结果并显示 `simulatedLatencyMs`，不使用 `fetch`、Axios、定时网络调用或真实 URL。原型同时提供次要按钮“模拟失败”，点击后显示“沙箱服务暂时繁忙，请重试”并保留参数，便于验证恢复状态。

四个 Tab 固定呈现：基本信息、接口文档、在线调试、错误码与 SLA。所有沙箱结果旁显示“固定脱敏沙箱样例，不调用真实服务、不消耗正式额度”。

- [ ] **Step 5: Wire both components into ProductDetail**

依据商品类型提供固定 Tab：

```ts
const tabsByType = {
  dataset: [
    { key: 'basic', label: '基本信息' },
    { key: 'fields', label: '字段信息' },
    { key: 'samples', label: '样例数据' },
    { key: 'profiling', label: '探查报告' }
  ],
  api: [
    { key: 'basic', label: '基本信息' },
    { key: 'docs', label: '接口文档' },
    { key: 'sandbox', label: '在线调试' },
    { key: 'sla', label: '错误码与 SLA' }
  ]
}
```

商品 ID 变化时将 `activeTab` 重置为该类型第一个 Tab。

- [ ] **Step 6: Run focused and catalog safety tests**

运行：

```bash
cd external-app-vue3 && npm test -- ApiDetail.test.ts src/data/products.test.ts && npm run build
```

预期：PASS；数据集无试用按钮；API 调试不产生网络请求；候选数据集无样例值。

- [ ] **Step 7: Commit**

```bash
git add external-app-vue3/src/components/mobile/product-detail/DatasetDetail.vue external-app-vue3/src/components/mobile/product-detail/ApiDetail.vue external-app-vue3/src/components/mobile/product-detail/ApiDetail.test.ts external-app-vue3/src/views/mobile/ProductDetail.vue
git commit -m "feat: add dataset and API evaluation details"
```

---

### Task 5: Implement Report and Dashboard Paywalls and Correct Entitlements

**Files:**
- Create: `external-app-vue3/src/components/mobile/product-detail/ContentGate.vue`
- Test: `external-app-vue3/src/components/mobile/product-detail/ContentGate.test.ts`
- Create: `external-app-vue3/src/components/mobile/product-detail/ReportDetail.vue`
- Create: `external-app-vue3/src/components/mobile/product-detail/DashboardDetail.vue`
- Modify: `external-app-vue3/src/stores/entitlements.ts`
- Test: `external-app-vue3/src/stores/entitlements.test.ts`
- Modify: `external-app-vue3/src/stores/orders.ts`
- Modify: `external-app-vue3/src/stores/ai.ts`
- Modify: `external-app-vue3/src/components/mobile/ProductCard.vue`
- Modify: `external-app-vue3/src/views/mobile/CheckoutItem.vue`
- Modify: `external-app-vue3/src/views/mobile/Mine.vue`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`

**Interfaces:**
- Consumes: `PreviewMode`、`EntitlementPolicy`、`Product`。
- Produces: `ContentGate(mode, unlocked)`；`entitlements.accessLevel(product, today?)`；报告版本权益和看板期限权益。

- [ ] **Step 1: Write failing content-gate and entitlement tests**

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContentGate from './ContentGate.vue'

describe('ContentGate', () => {
  it('shows visible content', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'visible', unlocked: false }, slots: { default: '完整内容' } })
    expect(wrapper.text()).toContain('完整内容')
  })

  it('masks restricted content without leaking slot text', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'masked', unlocked: false }, slots: { default: '关键数字 108.6' } })
    expect(wrapper.text()).not.toContain('108.6')
    expect(wrapper.text()).toContain('解锁后查看')
  })

  it('reveals masked content after entitlement', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'masked', unlocked: true }, slots: { default: '关键数字 108.6' } })
    expect(wrapper.text()).toContain('108.6')
  })

  it('never renders locked slot content before entitlement', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'locked', unlocked: false }, slots: { default: '隐藏正文' } })
    expect(wrapper.text()).not.toContain('隐藏正文')
  })
})
```

创建 `src/stores/entitlements.test.ts`：

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { useEntitlementStore } from './entitlements'

describe('item entitlement policies', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('binds report access permanently to the purchased version', () => {
    const store = useEntitlementStore()
    const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!
    store.grantItem(report)
    expect(store.hasPersonalItem(report, '2099-01-01')).toBe(true)
    expect(store.hasPersonalItem({
      ...report,
      typeDetail: { report: { ...report.typeDetail.report!, version: 'V2026-08' } }
    }, '2099-01-01')).toBe(false)
  })

  it('expires dashboard item access after its term', () => {
    const store = useEntitlementStore()
    const dashboard = seedProducts.find((product) => product.id === 'prod-freight-index')!
    store.grantItem(dashboard)
    expect(store.hasPersonalItem(dashboard, '2100-01-01')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

运行 `cd external-app-vue3 && npm test -- ContentGate.test.ts entitlements.test.ts`。

预期：FAIL，组件不存在。

- [ ] **Step 3: Implement ContentGate without DOM data leakage**

`ContentGate.vue` props：

```ts
defineProps<{ mode: PreviewMode; unlocked: boolean; label?: string }>()
```

只有 `mode === 'visible' || unlocked` 时才渲染默认 slot。`masked` 未解锁时渲染三行中性骨架和“解锁后查看关键内容”；`locked` 未解锁时渲染锁图标、标题和解锁提示。不要把受限 slot 隐藏在 CSS blur、`display:none`、`aria-label` 或 HTML 属性中。

- [ ] **Step 4: Implement report and dashboard type components**

`ReportDetail.vue` Tab keys：`overview|catalog|reader|license`。在线阅读遍历 `ReportContentBlock`，每块使用 `ContentGate`；商品包含 `free`，或用户已拥有会员、当前版本单品权益、企业席位时传入 `unlocked=true`。

`DashboardDetail.vue` Tab keys：`overview|preview|metrics|updates`。面板和指标同样通过 `ContentGate`；商品包含 `free` 时全部解锁，未解锁时不得在摘要文案中重复精确数字。

- [ ] **Step 5: Add version and term entitlement rules**

将 `entitlements.ts` 的商品权限改为：

```ts
function isActive(entitlement: Entitlement, today: string): boolean {
  return entitlement.status === 'active' && (!entitlement.validTo || entitlement.validTo >= today)
}

hasPersonalItem(state) {
  return (product: Product, today = new Date().toISOString().slice(0, 10)) =>
    state.list.some((entitlement) => {
      if (entitlement.source !== 'personal' || entitlement.type !== 'item' || entitlement.productId !== product.id) return false
      if (!isActive(entitlement, today)) return false
      if (product.type === 'report') return entitlement.productVersion === product.typeDetail.report?.version
      return true
    })
}
```

`grantItem(product)`：报告写入 `productVersion` 且不写 `validTo`；看板写入 `validTo = plusMonths(product.entitlementPolicy.months)`，默认 12 个月。`orders.purchaseItem()` 传完整 `Product` 给 `grantItem()`。

同时把 `accessLevel` 的签名改为 `accessLevel(product: Product, today?: string)`：只有商品包含 `member` 时才使用会员权益，随后检查当前版本/期限单品权益和企业席位。同步修改 `ProductDetail.vue`、`ProductCard.vue`、`stores/ai.ts` 的全部调用，禁止保留旧的 `(productId, memberIncluded)` 签名。

- [ ] **Step 6: Update checkout and My Entitlements copy**

- 报告结算页显示“永久访问当前版本 `<version>`；后续独立版本需另行购买”。
- 看板结算页显示“购买后使用 12 个月，期间持续获得更新”。
- “我的—权益”对报告显示“版本 `<version>` · 长期有效”，对看板显示“有效至 `<validTo>`”。

- [ ] **Step 7: Wire report/dashboard tabs and run tests**

运行：

```bash
cd external-app-vue3 && npm test -- ContentGate.test.ts entitlements.test.ts src/domain/productAccess.test.ts && npm run build
```

预期：PASS；未解锁 DOM 不包含受限数字；购买报告只解锁对应版本；购买看板生成 12 个月权益。

- [ ] **Step 8: Commit**

```bash
git add external-app-vue3/src/components/mobile/product-detail/ContentGate.vue external-app-vue3/src/components/mobile/product-detail/ContentGate.test.ts external-app-vue3/src/components/mobile/product-detail/ReportDetail.vue external-app-vue3/src/components/mobile/product-detail/DashboardDetail.vue external-app-vue3/src/components/mobile/ProductCard.vue external-app-vue3/src/stores/entitlements.ts external-app-vue3/src/stores/entitlements.test.ts external-app-vue3/src/stores/orders.ts external-app-vue3/src/stores/ai.ts external-app-vue3/src/views/mobile/CheckoutItem.vue external-app-vue3/src/views/mobile/Mine.vue external-app-vue3/src/views/mobile/ProductDetail.vue
git commit -m "feat: add report and dashboard access gates"
```

---

### Task 6: Complete the Listing-Request Loop

**Files:**
- Modify: `external-app-vue3/src/types/domain.ts`
- Create: `external-app-vue3/src/stores/listingRequests.ts`
- Test: `external-app-vue3/src/stores/listingRequests.test.ts`
- Create: `external-app-vue3/src/views/mobile/ListingRequest.vue`
- Modify: `external-app-vue3/src/router/index.ts`
- Modify: `external-app-vue3/src/views/mobile/Mine.vue`
- Modify: `external-app-vue3/src/views/admin/TrialsLeads.vue`
- Modify: `external-app-vue3/src/utils/statusMeta.ts`
- Modify: `external-app-vue3/src/components/StatusBadge.vue`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`

**Interfaces:**
- Produces: `ListingRequestStatus`、`ListingRequestPayload`、`useListingRequestStore().submit/byProduct/advance`。
- Consumes: 商品 `availability` 与目录 `byId()`。

- [ ] **Step 1: Add the listing-request types and failing store tests**

新增领域类型：

```ts
export type ListingRequestStatus = 'submitted' | 'evaluating' | 'preparing' | 'published' | 'unsupported'

export interface ListingRequest {
  id: string
  productId: string
  productName: string
  userId: string
  scenario: string
  requestedScope: string
  timeRange: string
  updateFrequency: string
  expectedAvailableAt: string
  note: string
  status: ListingRequestStatus
  feedbackMessage: string
  alternativeProductIds: string[]
  createdAt: string
  updatedAt: string
}
```

创建测试：

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useListingRequestStore } from './listingRequests'

const payload = {
  productId: 'prod-driver-credit-candidate',
  productName: '司机信用评分数据集（可申请上架）',
  userId: 'mem-1',
  scenario: '司机准入',
  requestedScope: '安全驾驶评分与违规次数',
  timeRange: '近 12 个月',
  updateFrequency: '每月',
  expectedAvailableAt: '2026-09-01',
  note: '用于供应商风险评估'
}

describe('listingRequests store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('creates a submitted request', () => {
    const store = useListingRequestStore()
    expect(store.submit(payload).status).toBe('submitted')
  })

  it('deduplicates unfinished requests for the same user and product', () => {
    const store = useListingRequestStore()
    const first = store.submit(payload)
    expect(store.submit(payload).id).toBe(first.id)
    expect(store.list).toHaveLength(1)
  })

  it('advances to published with user feedback', () => {
    const store = useListingRequestStore()
    const request = store.submit(payload)
    store.advance(request.id, 'published', '已上架可信空间，可前往购买')
    expect(store.byProduct(payload.productId)?.status).toBe('published')
  })
})
```

- [ ] **Step 2: Run tests and confirm failure**

运行 `cd external-app-vue3 && npm test -- listingRequests.test.ts`。

预期：FAIL，store 不存在。

- [ ] **Step 3: Implement the listing-request store**

`submit(payload)` 对 `submitted/evaluating/preparing` 状态去重；`byProduct(productId, userId?)` 返回当前用户最新记录；`advance(id, status, feedbackMessage, alternativeProductIds=[])` 更新状态和时间。推进到 `published` 时同步 `catalog.updateAvailability(productId, 'published')`，推进到 `preparing` 时同步为 `preparing`。

Task 6 同时把 `ProductDetail.vue` 的 `hasOpenListingRequest` 从固定 `false` 改为：

```ts
const listingRequest = computed(() => product.value
  ? listingRequests.byProduct(product.value.id, user.context.currentMemberId)
  : undefined)

const hasOpenListingRequest = computed(() =>
  listingRequest.value != null && ['submitted', 'evaluating', 'preparing'].includes(listingRequest.value.status)
)
```

并将该值传给 `resolveProductActions()`，确保提交后详情主按钮立即变为“查看上架进度”。

- [ ] **Step 4: Build the lightweight mobile form**

新增路由 `/app/listing-request/:id`。表单预填商品名称，必填：使用场景、所需范围、时间跨度、更新频率、希望可购买时间；补充说明可选。提交前检查 `user.context.loggedIn`，未登录显示“请先登录后提交”；原型默认用户已登录，不新增登录系统。

成功提交后显示记录编号、`已提交` 状态以及“在我的—求上架查看进度”按钮。重复进入时直接展示现有进度并允许返回详情。

- [ ] **Step 5: Add My and admin progress views**

- “我的”增加独立 Tab“求上架”，按更新时间倒序显示商品、状态、反馈和已上架购买入口。
- PC“试用与线索”保留原试用/需求区，在页面末尾新增“求上架”分区。
- 管理动作固定为：`开始评估`、`进入上架准备`、`标记已上架`、`暂不支持`。
- 暂不支持时使用反馈“当前资产暂不满足出域与商品化条件”，并允许填写替代商品 ID。
- `statusMeta.ts` 新增 `listingRequest` 字典，`StatusBadge` 支持该字典。

- [ ] **Step 6: Run store tests and build**

运行：

```bash
cd external-app-vue3 && npm test -- listingRequests.test.ts && npm run build
```

预期：PASS；重复提交不新增记录；后台推进后“我的”和商品详情动作同步变化。

- [ ] **Step 7: Commit**

```bash
git add external-app-vue3/src/types/domain.ts external-app-vue3/src/stores/listingRequests.ts external-app-vue3/src/stores/listingRequests.test.ts external-app-vue3/src/views/mobile/ListingRequest.vue external-app-vue3/src/router/index.ts external-app-vue3/src/views/mobile/Mine.vue external-app-vue3/src/views/admin/TrialsLeads.vue external-app-vue3/src/utils/statusMeta.ts external-app-vue3/src/components/StatusBadge.vue external-app-vue3/src/views/mobile/ProductDetail.vue
git commit -m "feat: add request-to-list workflow"
```

---

### Task 7: Reconcile Admin Surfaces, Documentation, and End-to-End Verification

**Files:**
- Modify: `external-app-vue3/src/views/admin/ContentCenter.vue`
- Modify: `external-app-vue3/src/views/admin/CommerceCenter.vue`
- Modify: `external-app-vue3/src/views/admin/EnterpriseBenefits.vue`
- Modify: `external-app-vue3/src/views/admin/ApprovalIntegration.vue`
- Modify: `external-app-vue3/src/views/mobile/AnswerResult.vue`
- Modify: `external-app-vue3/src/views/mobile/SpaceBridge.vue`
- Modify: `external-app-vue3/README.md`

**Interfaces:**
- Consumes: Tasks 1–6 的最终四类模型、权益和求上架 store。
- Produces: 无新领域接口；交付一个构建、测试和浏览器冒烟均通过的原型。

- [ ] **Step 1: Remove stale seven-type and trial-commerce assumptions**

运行：

```bash
rg -n "pq_pir|joint_analysis|solution|trialMode|trialPolicy|sourceMeta|ProductSource|inquiry" external-app-vue3/src
```

逐个消除运行时代码引用：

- 内容中心只管理行业报告和自有看板。
- 商业化中心只列 APP 内容商品，显示报告版本权益或看板期限权益。
- 企业权益不把数据集/API 当作 APP 席位商品。
- 审批集成继续处理内部审批，但展示前台可用状态。
- 问答案中的解锁按钮只针对报告/看板；数据集/API 推荐只跳详情。
- 可信空间页只接受数据集/API；其他类型访问时返回商品详情并显示提示。增加“模拟空间不可用”动作，失败态保留商品上下文、显示“可信空间暂不可用，请稍后重试”，并提供唯一的“重新连接”按钮，不创建成功订单。

保留 `TrialApplication` 历史模型和空列表，不再从任何标准商品详情发起试用。

- [ ] **Step 2: Update README with exact demo routes**

README 写明四类商品、Tab、交易规则与以下六条演示：

1. `/app/product/prod-enterprise-activity`：已上架数据集四 Tab → 企业认证 → 可信空间购买。
2. `/app/product/prod-driver-credit-candidate`：候选数据集 → 求上架 → 我的进度 → PC 推进。
3. `/app/product/prod-qualification-api`：接口文档 → 固定脱敏在线调试 → 可信空间购买。
4. `/app/product/prod-logistics-monthly`：报告打码 → 开会员或单品购买 → 当前版本解锁。
5. `/app/product/prod-freight-index`：看板打码 → 单品购买 → 12 个月权益。
6. `/app/product/prod-port-dashboard-free`：免费完整看板。

明确 `preview` 为旧构建产物、`dist` 为本地验证产物，两者都不是源文件。

- [ ] **Step 3: Run the full automated verification**

运行：

```bash
cd external-app-vue3 && npm test && npm run build
```

预期：所有 Vitest 测试 PASS；Vue 类型检查和 Vite 生产构建 PASS；无未处理 Promise 或编译警告导致退出码非零。

- [ ] **Step 4: Start the app and perform browser smoke checks**

运行：

```bash
cd external-app-vue3 && npm run dev -- --host 127.0.0.1
```

按顺序检查：

- `/#/app/discover`：仅四个频道。
- `/#/app/search?type=dataset`：同时出现已上架数据集和候选数据集。
- `/#/app/product/prod-enterprise-activity`：四 Tab、最多 10 行样例、无试用按钮、空间购买动作。
- `/#/app/product/prod-driver-credit-candidate`：无样例值、无价格、主按钮求上架。
- `/#/app/product/prod-qualification-api`：缺参报错、填写参数后只显示固定沙箱结果。
- `/#/app/product/prod-logistics-monthly`：未购不泄露 masked/locked 内容，购买后当前版本解锁。
- `/#/app/product/prod-freight-index`：未购关键数字不在 DOM，购买后权益有效期 12 个月。
- `/#/app/mine` 与 `/#/admin/trials-leads`：求上架状态双端一致。
- 在可信空间桥接页模拟不可用：商品名仍可见，点击重新连接后回到处理中，不伪造购买成功。

每次动作后用 DOM 快照确认唯一主动作和当前状态；检查控制台无 error。

- [ ] **Step 5: Check repository scope and generated artifacts**

运行：

```bash
git status --short
git diff --check
```

预期：没有 `external-app-vue3/preview`、`external-app-vue3/dist`、`external-app-vue3/node_modules` 或 `external-app-vue3_old_1783768156` 被暂存；没有空白错误。

- [ ] **Step 6: Commit final integration and docs**

```bash
git add external-app-vue3/src/views/admin/ContentCenter.vue external-app-vue3/src/views/admin/CommerceCenter.vue external-app-vue3/src/views/admin/EnterpriseBenefits.vue external-app-vue3/src/views/admin/ApprovalIntegration.vue external-app-vue3/src/views/mobile/AnswerResult.vue external-app-vue3/src/views/mobile/SpaceBridge.vue external-app-vue3/README.md
git commit -m "docs: finalize external app product commerce prototype"
```

---

## Final Acceptance Checklist

- [ ] 前台只显示数据集、API、行业报告、自有看板四类。
- [ ] 数据集/API 只在可信空间购买；数据集无试用，API 只有固定脱敏沙箱。
- [ ] 候选资产可搜索但不泄露样例值或真实响应，并能完成求上架闭环。
- [ ] 数据集、API、报告、看板均使用各自四个 Tab。
- [ ] 报告未购内容不进入 DOM；购买只解锁购买时版本。
- [ ] 看板单品权益默认 12 个月，过期恢复打码。
- [ ] 免费报告/看板无需购买即可查看。
- [ ] 主动作决策不存在求上架、购买、会员、试用等互相冲突按钮。
- [ ] “我的”和 PC“试用与线索”共享求上架状态。
- [ ] `npm test` 与 `npm run build` 均通过。
- [ ] 浏览器六条演示链路通过，控制台无 error。
- [ ] 旧备份与构建产物未进入提交。

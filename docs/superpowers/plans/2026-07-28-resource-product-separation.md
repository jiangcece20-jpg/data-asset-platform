# 资源/商品分离 + 资源管理中心 + 用数产出接入 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 引入 Resource 独立实体、合并商品中心+内容中心为资源管理、接入用数模块产出的内部视图到找数检索

**Architecture:** Resource 独立实体 + Product 引用（1:0..1），catalog store 管理两组数据，后台统一资源管理页面替代商品/内容中心，前台搜索混合展示市场商品和内部视图

**Tech Stack:** Vue 3 + Vite + TypeScript + Pinia + Vitest + Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-07-28-resource-product-separation-design.md`

---

### Task 1: Resource 类型定义

**Files:**
- Create: `external-app-vue3/src/types/resource.ts`
- Modify: `external-app-vue3/src/types/domain.ts`

- [ ] **Step 1: 创建 Resource 类型定义文件**

在 `external-app-vue3/src/types/resource.ts` 中创建新文件：

```typescript
// 资源领域模型 —— 底层数据资产，与 Product（售卖实例）分离
// 关系：1 Resource : 0..1 Product

import type {
  StandardProductType,
  DatasetDetail,
  ApiDetail,
  ReportDetail,
  DashboardDetail
} from './domain'

/** 资源类型（在 StandardProductType 基础上增加 user_view） */
export type ResourceType = StandardProductType | 'user_view'

/** 资源来源（在 ProductOrigin 基础上增加 user_created） */
export type ResourceOrigin = 'asset_platform' | 'app_content' | 'trusted_space' | 'user_created'

/** 用数模块产出的用户视图详情 */
export interface UserViewDetail {
  sourceModule: string
  externalId: string
  externalUrl: string
  chartType: string
  dataSourceName: string
  lastViewedAt?: string
  viewCount?: number
}

/** 资源类型详情（在 ProductTypeDetail 基础上增加 userView） */
export interface ResourceTypeDetail {
  dataset?: DatasetDetail
  api?: ApiDetail
  report?: ReportDetail
  dashboard?: DashboardDetail
  userView?: UserViewDetail
}

/** 资源实体 */
export interface Resource {
  id: string
  resourceName: string
  type: ResourceType
  origin: ResourceOrigin
  typeDetail: ResourceTypeDetail
  createdBy?: string
  enterpriseId?: string
  createdAt: string
  updatedAt: string
}

/** 上架表单数据（从资源创建商品时填写） */
export interface ListResourceForm {
  name: string
  subtitle: string
  price: { model: string; itemPrice?: number; memberDiscount?: number; unit?: string }
  acquisitions: string[]
  scenarios: string[]
  tags: string[]
}
```

- [ ] **Step 2: 运行类型检查确认新文件编译通过**

Run: `cd external-app-vue3 && npx vue-tsc --noEmit --pretty 2>&1 | head -20`
Expected: 无 resource.ts 相关错误（可能有其他已有错误，先忽略）

- [ ] **Step 3: 修改 Product 类型增加 resourceId**

在 `external-app-vue3/src/types/domain.ts` 中：

找到 `ProductOrigin` 定义（第10行），替换为：

```typescript
export type ProductOrigin = 'asset_platform' | 'app_content' | 'trusted_space' | 'user_created'
```

找到 `Product` 接口（第230行），在 `id: string` 后添加 `resourceId` 字段：

```typescript
export interface Product {
  id: string
  resourceId: string
  name: string
  // ... 其余字段不变
}
```

- [ ] **Step 4: 运行类型检查确认 Product 变更编译通过**

Run: `cd external-app-vue3 && npx vue-tsc --noEmit --pretty 2>&1 | grep -E "resourceId|resource\.ts|domain\.ts" | head -20`
Expected: 只看到 resourceId 相关的错误（因为 mock 数据还没加这个字段），这是预期的

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/types/resource.ts external-app-vue3/src/types/domain.ts
git commit -m "feat: 新增 Resource 类型定义，Product 增加 resourceId 字段"
```

---

### Task 2: Mock 数据迁移

**Files:**
- Create: `external-app-vue3/src/data/resources.ts`
- Modify: `external-app-vue3/src/data/products.ts`
- Modify: `external-app-vue3/src/data/mockProducts.ts`
- Modify: `external-app-vue3/src/data/seed.ts`
- Test: `external-app-vue3/src/data/resources.test.ts`

- [ ] **Step 1: 写迁移测试**

创建 `external-app-vue3/src/data/resources.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { seedResources, userViewResources } from './resources'
import { seedProducts } from './products'

describe('resource migration from products', () => {
  it('creates a resource for every seed product', () => {
    expect(seedResources).toHaveLength(seedProducts.length)
  })

  it('resource ids follow the res- prefix convention', () => {
    for (const r of seedResources) {
      expect(r.id).toMatch(/^res-/)
    }
  })

  it('resource names match product names', () => {
    for (let i = 0; i < seedProducts.length; i++) {
      expect(seedResources[i].resourceName).toBe(seedProducts[i].name)
    }
  })

  it('resource types match product types', () => {
    for (let i = 0; i < seedProducts.length; i++) {
      expect(seedResources[i].type).toBe(seedProducts[i].type)
    }
  })

  it('resource origins match product origins', () => {
    for (let i = 0; i < seedProducts.length; i++) {
      expect(seedResources[i].origin).toBe(seedProducts[i].origin)
    }
  })
})

describe('user view resources', () => {
  it('has exactly 3 mock user view resources', () => {
    expect(userViewResources).toHaveLength(3)
  })

  it('all user views have user_view type and user_created origin', () => {
    for (const r of userViewResources) {
      expect(r.type).toBe('user_view')
      expect(r.origin).toBe('user_created')
    }
  })

  it('all user views have userView detail with externalUrl', () => {
    for (const r of userViewResources) {
      expect(r.typeDetail.userView).toBeDefined()
      expect(r.typeDetail.userView!.externalUrl).toBeTruthy()
    }
  })

  it('user view ids are unique and do not collide with migrated resources', () => {
    const migratedIds = new Set(seedResources.map((r) => r.id))
    for (const r of userViewResources) {
      expect(migratedIds.has(r.id)).toBe(false)
    }
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd external-app-vue3 && npx vitest run src/data/resources.test.ts`
Expected: FAIL — resources.ts 不存在

- [ ] **Step 3: 创建资源迁移 + mock 数据文件**

创建 `external-app-vue3/src/data/resources.ts`：

```typescript
import type { Resource, UserViewDetail } from '@/types/resource'
import { seedProducts } from './products'

/**
 * 从现有 seedProducts 自动迁移生成 Resource 数组。
 * 每条 Product 对应一条 Resource，ID 加 res- 前缀。
 */
function migrateProductToResource(product: (typeof seedProducts)[0]): Resource {
  return {
    id: `res-${product.id}`,
    resourceName: product.name,
    type: product.type,
    origin: product.origin,
    typeDetail: { ...product.typeDetail },
    createdAt: product.updatedAt,
    updatedAt: product.updatedAt
  }
}

export const seedResources: Resource[] = seedProducts.map(migrateProductToResource)

/** 用数模块产出的 mock 用户视图 */
export const userViewResources: Resource[] = [
  {
    id: 'res-view-driver-performance',
    resourceName: '司机绩效周报',
    type: 'user_view',
    origin: 'user_created',
    typeDetail: {
      userView: {
        sourceModule: 'bi-workbench',
        externalId: 'view-001',
        externalUrl: '/bi/workbench/view/view-001',
        chartType: 'bar+line',
        dataSourceName: '司机基础信息数据集',
        lastViewedAt: '2026-07-25',
        viewCount: 42
      } satisfies UserViewDetail
    },
    createdBy: '陈静',
    enterpriseId: 'ent-wanlian-logistics',
    createdAt: '2026-07-20',
    updatedAt: '2026-07-25'
  },
  {
    id: 'res-view-route-profit',
    resourceName: '线路利润分析',
    type: 'user_view',
    origin: 'user_created',
    typeDetail: {
      userView: {
        sourceModule: 'bi-workbench',
        externalId: 'view-002',
        externalUrl: '/bi/workbench/view/view-002',
        chartType: 'pie+table',
        dataSourceName: '运单交易明细数据集',
        lastViewedAt: '2026-07-27',
        viewCount: 18
      } satisfies UserViewDetail
    },
    createdBy: '王涛',
    enterpriseId: 'ent-wanlian-logistics',
    createdAt: '2026-07-22',
    updatedAt: '2026-07-27'
  },
  {
    id: 'res-view-cold-chain-alert',
    resourceName: '冷链温控异常监控',
    type: 'user_view',
    origin: 'user_created',
    typeDetail: {
      userView: {
        sourceModule: 'bi-workbench',
        externalId: 'view-003',
        externalUrl: '/bi/workbench/view/view-003',
        chartType: 'line+number',
        dataSourceName: '冷链温控数据集',
        lastViewedAt: '2026-07-28',
        viewCount: 7
      } satisfies UserViewDetail
    },
    createdBy: '陈静',
    enterpriseId: 'ent-wanlian-logistics',
    createdAt: '2026-07-26',
    updatedAt: '2026-07-28'
  }
]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd external-app-vue3 && npx vitest run src/data/resources.test.ts`
Expected: All tests PASS

- [ ] **Step 5: 修改 seed.ts 导出资源数据**

在 `external-app-vue3/src/data/seed.ts` 中，在 `export { seedProducts } from './products'` 后添加：

```typescript
export { seedResources, userViewResources } from './resources'
```

同时在文件顶部添加 import：

```typescript
import { seedResources, userViewResources } from './resources'
```

- [ ] **Step 6: 给 seedProducts 和 mockProducts 添加 resourceId**

在 `external-app-vue3/src/data/products.ts` 中，为每条 seedProduct 添加 `resourceId` 字段，值为 `res-` + 产品 id。

例如 `prod-freight-index` 的 resourceId 为 `res-prod-freight-index`。

**由于 products.ts 有 534 行且包含多条产品记录**，需要在每条产品对象的 `id` 字段后添加 `resourceId`。使用 sed 批量处理：

Run: `cd external-app-vue3 && sed -i '' "s/id: 'prod-/id: 'prod-/g" src/data/products.ts` （确认格式）

实际上更安全的做法是在每条 `id: 'prod-xxx',` 行后插入 `resourceId: 'res-prod-xxx',`。

**使用脚本自动添加 resourceId：**

```bash
cd external-app-vue3 && node -e "
const fs = require('fs');
let content = fs.readFileSync('src/data/products.ts', 'utf8');
content = content.replace(
  /id: '(prod-[^']+)',/g,
  (match, id) => \`id: '\${id}',\n    resourceId: 'res-\${id}',\`
);
fs.writeFileSync('src/data/products.ts', content);
console.log('Done');
"
```

同样处理 mockProducts.ts：

```bash
cd external-app-vue3 && node -e "
const fs = require('fs');
let content = fs.readFileSync('src/data/mockProducts.ts', 'utf8');
content = content.replace(
  /id: '(prod-[^']+)',/g,
  (match, id) => \`id: '\${id}',\n    resourceId: 'res-\${id}',\`
);
fs.writeFileSync('src/data/mockProducts.ts', content);
console.log('Done');
"
```

- [ ] **Step 7: 运行类型检查确认 mock 数据编译通过**

Run: `cd external-app-vue3 && npx vue-tsc --noEmit --pretty 2>&1 | grep -E "resourceId" | head -10`
Expected: 无 resourceId 相关错误

- [ ] **Step 8: 运行全部测试确认无回归**

Run: `cd external-app-vue3 && npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 9: Commit**

```bash
git add external-app-vue3/src/data/resources.ts external-app-vue3/src/data/resources.test.ts external-app-vue3/src/data/seed.ts external-app-vue3/src/data/products.ts external-app-vue3/src/data/mockProducts.ts
git commit -m "feat: Mock 数据迁移 — 自动生成 Resource + 新增 user_view mock 数据"
```

---

### Task 3: Catalog Store 扩展

**Files:**
- Modify: `external-app-vue3/src/stores/catalog.ts`
- Test: `external-app-vue3/src/stores/catalog.test.ts` (new)

- [ ] **Step 1: 写 store 扩展测试**

创建 `external-app-vue3/src/stores/catalog.test.ts`：

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'

describe('catalog store — resource extensions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has resources in state', () => {
    const catalog = useCatalogStore()
    expect(catalog.resources.length).toBeGreaterThan(0)
  })

  it('resourceById returns the correct resource', () => {
    const catalog = useCatalogStore()
    const first = catalog.resources[0]
    expect(catalog.resourceById(first.id)?.resourceName).toBe(first.resourceName)
  })

  it('resourceById returns undefined for unknown id', () => {
    const catalog = useCatalogStore()
    expect(catalog.resourceById('nonexistent')).toBeUndefined()
  })

  it('productForResource returns the linked product', () => {
    const catalog = useCatalogStore()
    const product = catalog.products[0]
    const found = catalog.productForResource(product.resourceId)
    expect(found?.id).toBe(product.id)
  })

  it('productForResource returns undefined for unlisted resource', () => {
    const catalog = useCatalogStore()
    expect(catalog.productForResource('res-nonexistent')).toBeUndefined()
  })

  it('internalViews returns only user_view resources for current enterprise', () => {
    const catalog = useCatalogStore()
    const views = catalog.internalViews('ent-wanlian-logistics')
    expect(views.length).toBeGreaterThan(0)
    for (const v of views) {
      expect(v.type).toBe('user_view')
      expect(v.origin).toBe('user_created')
      expect(v.enterpriseId).toBe('ent-wanlian-logistics')
    }
  })

  it('internalViews returns empty for other enterprise', () => {
    const catalog = useCatalogStore()
    const views = catalog.internalViews('ent-other')
    expect(views).toHaveLength(0)
  })

  it('listResource creates a product from a resource', () => {
    const catalog = useCatalogStore()
    const unlistedResource = catalog.resources.find(
      (r) => !catalog.products.some((p) => p.resourceId === r.id) && r.type !== 'user_view'
    )
    expect(unlistedResource).toBeDefined()
    const before = catalog.products.length
    catalog.listResource(unlistedResource!.id, {
      name: unlistedResource!.resourceName,
      subtitle: '测试上架',
      price: { model: 'item_only', itemPrice: 100, unit: '元/次' },
      acquisitions: ['item_purchase'],
      scenarios: ['测试场景'],
      tags: []
    })
    expect(catalog.products.length).toBe(before + 1)
    const created = catalog.products.find((p) => p.resourceId === unlistedResource!.id)
    expect(created).toBeDefined()
    expect(created!.name).toBe(unlistedResource!.resourceName)
    expect(created!.availability).toBe('published')
  })

  it('listResource throws for already listed resource', () => {
    const catalog = useCatalogStore()
    const listedResource = catalog.resources.find(
      (r) => catalog.products.some((p) => p.resourceId === r.id)
    )
    expect(listedResource).toBeDefined()
    expect(() =>
      catalog.listResource(listedResource!.id, {
        name: '重复上架',
        subtitle: '',
        price: { model: 'free' },
        acquisitions: ['free'],
        scenarios: [],
        tags: []
      })
    ).toThrow('该资源已有上架商品')
  })

  it('listResource throws for user_view type', () => {
    const catalog = useCatalogStore()
    const userView = catalog.resources.find((r) => r.type === 'user_view')
    expect(userView).toBeDefined()
    expect(() =>
      catalog.listResource(userView!.id, {
        name: '不允许',
        subtitle: '',
        price: { model: 'free' },
        acquisitions: ['free'],
        scenarios: [],
        tags: []
      })
    ).toThrow('用数视图不可上架')
  })

  it('delistProduct sets availability to delisted', () => {
    const catalog = useCatalogStore()
    const product = catalog.products.find((p) => p.availability === 'published')
    expect(product).toBeDefined()
    catalog.delistProduct(product!.id)
    expect(catalog.byId(product!.id)?.availability).toBe('delisted')
  })

  it('delistProduct is idempotent for nonexistent product', () => {
    const catalog = useCatalogStore()
    expect(() => catalog.delistProduct('nonexistent')).not.toThrow()
  })

  it('searchInternalViews returns matching user views', () => {
    const catalog = useCatalogStore()
    const results = catalog.searchInternalViews('司机')
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.type).toBe('user_view')
      expect(r.resourceName.toLowerCase()).toContain('司机')
    }
  })

  it('searchInternalViews returns empty for no match', () => {
    const catalog = useCatalogStore()
    const results = catalog.searchInternalViews('xyznonexistent')
    expect(results).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd external-app-vue3 && npx vitest run src/stores/catalog.test.ts`
Expected: FAIL — resources, resourceById 等不存在

- [ ] **Step 3: 扩展 catalog store**

修改 `external-app-vue3/src/stores/catalog.ts`：

在文件顶部添加 import：

```typescript
import { seedResources, userViewResources } from '@/data/resources'
import type { Resource, ListResourceForm } from '@/types/resource'
import { genId } from '@/utils/id'
```

在 `state` 中添加 resources：

```typescript
state: () => ({
  products: [...seedProducts, ...mockProducts].map((p) => ({ ...p })) as Product[],
  enhancements: seedEnhancements.map((e) => ({ ...e })) as ProductEnhancement[],
  resources: [...seedResources, ...userViewResources].map((r) => ({ ...r })) as Resource[]
}),
```

在 `getters` 中添加（放在 `byId` 之后）：

```typescript
resourceById(state) {
  return (id: string) => state.resources.find((r) => r.id === id)
},
productForResource(state) {
  return (resourceId: string) => state.products.find((p) => p.resourceId === resourceId)
},
internalViews(state) {
  return (enterpriseId?: string) =>
    state.resources.filter(
      (r) => r.type === 'user_view' && r.origin === 'user_created' && (!enterpriseId || r.enterpriseId === enterpriseId)
    )
},
```

在 `actions` 中添加（放在 `search` 之前）：

```typescript
listResource(resourceId: string, form: ListResourceForm) {
  const resource = this.resources.find((r) => r.id === resourceId)
  if (!resource) throw new Error('资源不存在')
  if (resource.type === 'user_view') throw new Error('用数视图不可上架')
  if (this.products.some((p) => p.resourceId === resourceId)) throw new Error('该资源已有上架商品')

  const product: Product = {
    id: genId('prod'),
    resourceId,
    name: form.name,
    subtitle: form.subtitle,
    type: resource.type as Product['type'],
    origin: resource.origin as Product['origin'],
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: form.acquisitions as Product['acquisitions'],
    scenarios: form.scenarios,
    provider: 'APP 自营内容',
    coverage: '',
    updateFrequency: '',
    qualityPromise: '',
    complianceNote: '',
    price: form.price as Product['price'],
    status: 'published',
    tags: form.tags,
    description: '',
    valueProposition: '',
    deliveryMethod: '',
    memberIncluded: false,
    updatedAt: now(),
    typeDetail: resource.typeDetail,
    serviceStatus: 'normal'
  }
  this.products.push(product)
},
delistProduct(productId: string) {
  const p = this.products.find((x) => x.id === productId)
  if (p) {
    p.availability = 'delisted'
    p.updatedAt = now()
  }
},
searchInternalViews(query: string): Resource[] {
  const q = query.trim().toLowerCase()
  return this.resources.filter((r) => {
    if (r.type !== 'user_view' || r.origin !== 'user_created') return false
    if (!q) return true
    return r.resourceName.toLowerCase().includes(q)
  })
},
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd external-app-vue3 && npx vitest run src/stores/catalog.test.ts`
Expected: All tests PASS

- [ ] **Step 5: 运行全部测试确认无回归**

Run: `cd external-app-vue3 && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add external-app-vue3/src/stores/catalog.ts external-app-vue3/src/stores/catalog.test.ts
git commit -m "feat: Catalog Store 扩展 — resources state, 上架/下架/搜索内部视图"
```

---

### Task 4: 资源管理中心（后台）

**Files:**
- Create: `external-app-vue3/src/views/admin/ResourceCenter.vue`
- Create: `external-app-vue3/src/views/admin/ResourceEdit.vue`
- Modify: `external-app-vue3/src/router/index.ts`
- Modify: `external-app-vue3/src/layouts/AdminShell.vue`

- [ ] **Step 1: 创建 ResourceCenter 列表页**

创建 `external-app-vue3/src/views/admin/ResourceCenter.vue`：

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import type { ResourceType } from '@/types/resource'

const router = useRouter()
const catalog = useCatalogStore()

const activeType = ref<ResourceType | ''>('')
const searchQuery = ref('')
const showListModal = ref(false)
const listingResourceId = ref('')
const listForm = ref({
  name: '',
  subtitle: '',
  price: { model: 'item_only' as const, itemPrice: 100, unit: '元/次' },
  acquisitions: ['item_purchase'],
  scenarios: [] as string[],
  tags: [] as string[]
})

const types: { value: ResourceType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'dataset', label: '数据集' },
  { value: 'api', label: 'API' },
  { value: 'report', label: '报告' },
  { value: 'dashboard', label: '看板' },
  { value: 'user_view', label: '用数视图' }
]

const typeLabels: Record<string, string> = {
  dataset: '数据集',
  api: 'API',
  report: '报告',
  dashboard: '看板',
  user_view: '用数视图'
}

const originLabels: Record<string, string> = {
  asset_platform: '资产平台',
  app_content: 'APP内容',
  trusted_space: '可信空间',
  user_created: '用户创建'
}

const statusLabels: Record<string, { label: string; color: string }> = {
  published: { label: '已上架', color: 'bg-emerald-100 text-emerald-700' },
  candidate: { label: '候选', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: '准备中', color: 'bg-amber-100 text-amber-700' },
  paused: { label: '已暂停', color: 'bg-slate-100 text-slate-600' },
  delisted: { label: '已下架', color: 'bg-red-100 text-red-700' }
}

interface ResourceRow {
  resourceId: string
  resourceName: string
  type: string
  origin: string
  productName: string
  status: string
  statusColor: string
  isListed: boolean
  productId?: string
}

const rows = computed<ResourceRow[]>(() => {
  let filtered = catalog.resources

  if (activeType.value) {
    filtered = filtered.filter((r) => r.type === activeType.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    filtered = filtered.filter(
      (r) =>
        r.resourceName.toLowerCase().includes(q) ||
        catalog.productForResource(r.id)?.name.toLowerCase().includes(q)
    )
  }

  return filtered.map((r) => {
    const product = catalog.productForResource(r.id)
    return {
      resourceId: r.id,
      resourceName: r.resourceName,
      type: r.type,
      origin: r.origin,
      productName: product?.name || '—',
      status: product?.availability || 'not_listed',
      statusColor: product
        ? statusLabels[product.availability]?.color || 'bg-slate-100 text-slate-600'
        : 'bg-slate-100 text-slate-500',
      isListed: !!product,
      productId: product?.id
    }
  })
})

function openListModal(resourceId: string) {
  const resource = catalog.resourceById(resourceId)
  if (!resource) return
  listingResourceId.value = resourceId
  listForm.value = {
    name: resource.resourceName,
    subtitle: '',
    price: { model: 'item_only' as const, itemPrice: 100, unit: '元/次' },
    acquisitions: ['item_purchase'],
    scenarios: [],
    tags: []
  }
  showListModal.value = true
}

function confirmList() {
  try {
    catalog.listResource(listingResourceId.value, {
      name: listForm.value.name,
      subtitle: listForm.value.subtitle,
      price: { model: listForm.value.price.model, itemPrice: listForm.value.price.itemPrice, unit: listForm.value.price.unit },
      acquisitions: listForm.value.acquisitions,
      scenarios: listForm.value.scenarios,
      tags: listForm.value.tags
    })
    showListModal.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

function handleDelist(productId: string) {
  catalog.delistProduct(productId)
}

function goEdit(resourceId: string) {
  router.push(`/admin/resources/${resourceId}`)
}

function statusLabel(status: string): string {
  if (status === 'not_listed') return '未上架'
  return statusLabels[status]?.label || status
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-slate-800">资源管理</h1>
    </div>

    <!-- 类型筛选 + 搜索 -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="flex gap-1.5">
        <button
          v-for="t in types"
          :key="t.value"
          class="rounded-full px-3 py-1 text-xs font-medium transition"
          :class="activeType === t.value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'"
          @click="activeType = t.value"
        >
          {{ t.label }}
        </button>
      </div>
      <input
        v-model="searchQuery"
        placeholder="搜索资源名称或商品名称"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
      />
    </div>

    <!-- 资源列表 -->
    <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th class="px-4 py-3 font-medium">资源名称</th>
            <th class="px-4 py-3 font-medium">类型</th>
            <th class="px-4 py-3 font-medium">来源</th>
            <th class="px-4 py-3 font-medium">商品名称</th>
            <th class="px-4 py-3 font-medium">前台状态</th>
            <th class="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.resourceId" class="border-b border-slate-50 hover:bg-slate-50/50">
            <td class="px-4 py-3 font-medium text-slate-800">{{ row.resourceName }}</td>
            <td class="px-4 py-3">
              <span class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{{ typeLabels[row.type] || row.type }}</span>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ originLabels[row.origin] || row.origin }}</td>
            <td class="px-4 py-3 text-slate-600">{{ row.productName }}</td>
            <td class="px-4 py-3">
              <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="row.statusColor">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <button
                  v-if="!row.isListed"
                  class="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-700"
                  @click="openListModal(row.resourceId)"
                >
                  上架
                </button>
                <button
                  v-else
                  class="rounded bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100"
                  @click="handleDelist(row.productId!)"
                >
                  下架
                </button>
                <button
                  class="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-600"
                  @click="goEdit(row.resourceId)"
                >
                  编辑
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 上架弹窗 -->
    <div v-if="showListModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showListModal = false">
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-semibold text-slate-800">上架资源</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">商品名称</label>
            <input v-model="listForm.name" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">副标题</label>
            <input v-model="listForm.subtitle" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">价格（元）</label>
            <input v-model.number="listForm.price.itemPrice" type="number" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="showListModal = false">取消</button>
          <button class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700" @click="confirmList">确认上架</button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 创建 ResourceEdit 编辑页**

创建 `external-app-vue3/src/views/admin/ResourceEdit.vue`：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const resourceId = computed(() => route.params.id as string)
const resource = computed(() => catalog.resourceById(resourceId.value))
const product = computed(() => catalog.productForResource(resourceId.value))

const typeLabels: Record<string, string> = {
  dataset: '数据集',
  api: 'API',
  report: '报告',
  dashboard: '看板',
  user_view: '用数视图'
}

const originLabels: Record<string, string> = {
  asset_platform: '资产平台',
  app_content: 'APP内容',
  trusted_space: '可信空间',
  user_created: '用户创建'
}

function goBack() {
  router.push('/admin/resources')
}
</script>

<template>
  <div v-if="resource">
    <div class="mb-6 flex items-center gap-3">
      <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" @click="goBack">← 返回</button>
      <h1 class="text-xl font-semibold text-slate-800">{{ resource.resourceName }}</h1>
      <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ typeLabels[resource.type] }}</span>
      <span class="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{{ originLabels[resource.origin] }}</span>
    </div>

    <!-- 资源基本信息 -->
    <div class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">资源信息</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">资源名称：</span>{{ resource.resourceName }}</div>
        <div><span class="text-slate-500">资源 ID：</span><code class="text-xs">{{ resource.id }}</code></div>
        <div><span class="text-slate-500">类型：</span>{{ typeLabels[resource.type] }}</div>
        <div><span class="text-slate-500">来源：</span>{{ originLabels[resource.origin] }}</div>
        <div v-if="resource.createdBy"><span class="text-slate-500">创建者：</span>{{ resource.createdBy }}</div>
        <div><span class="text-slate-500">更新时间：</span>{{ resource.updatedAt }}</div>
      </div>
    </div>

    <!-- 关联商品信息 -->
    <div v-if="product" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">关联商品</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">商品名称：</span>{{ product.name }}</div>
        <div><span class="text-slate-500">商品 ID：</span><code class="text-xs">{{ product.id }}</code></div>
        <div><span class="text-slate-500">前台状态：</span>{{ product.availability }}</div>
        <div><span class="text-slate-500">价格：</span>{{ product.price.itemPrice ?? '—' }} {{ product.price.unit ?? '' }}</div>
      </div>
    </div>
    <div v-else class="mb-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
      该资源尚未上架为商品
    </div>

    <!-- 类型特有区块：用数视图（只读） -->
    <div v-if="resource.type === 'user_view' && resource.typeDetail.userView" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">用数视图详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">来源模块：</span>{{ resource.typeDetail.userView.sourceModule }}</div>
        <div><span class="text-slate-500">图表类型：</span>{{ resource.typeDetail.userView.chartType }}</div>
        <div><span class="text-slate-500">数据源：</span>{{ resource.typeDetail.userView.dataSourceName }}</div>
        <div><span class="text-slate-500">浏览次数：</span>{{ resource.typeDetail.userView.viewCount ?? '—' }}</div>
      </div>
      <div class="mt-3">
        <a :href="resource.typeDetail.userView.externalUrl" target="_blank" class="text-sm text-brand-600 hover:underline">
          在用数模块中查看 →
        </a>
      </div>
    </div>

    <!-- 类型特有区块：数据集 -->
    <div v-if="resource.type === 'dataset' && resource.typeDetail.dataset" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">数据集详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">粒度：</span>{{ resource.typeDetail.dataset.granularity }}</div>
        <div><span class="text-slate-500">时间范围：</span>{{ resource.typeDetail.dataset.timeRange }}</div>
        <div><span class="text-slate-500">行数：</span>{{ resource.typeDetail.dataset.rowCount?.toLocaleString() }}</div>
        <div><span class="text-slate-500">字段数：</span>{{ resource.typeDetail.dataset.fields?.length }}</div>
      </div>
    </div>

    <!-- 类型特有区块：API -->
    <div v-if="resource.type === 'api' && resource.typeDetail.api" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">API 详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">方法：</span>{{ resource.typeDetail.api.method }}</div>
        <div><span class="text-slate-500">路径：</span><code class="text-xs">{{ resource.typeDetail.api.pathExample }}</code></div>
        <div><span class="text-slate-500">版本：</span>{{ resource.typeDetail.api.version }}</div>
        <div><span class="text-slate-500">SLA：</span>{{ resource.typeDetail.api.sla }}</div>
      </div>
    </div>

    <!-- 类型特有区块：报告 -->
    <div v-if="resource.type === 'report' && resource.typeDetail.report" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">报告详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">作者：</span>{{ resource.typeDetail.report.author }}</div>
        <div><span class="text-slate-500">版本：</span>{{ resource.typeDetail.report.version }}</div>
        <div><span class="text-slate-500">受众：</span>{{ resource.typeDetail.report.audience }}</div>
        <div><span class="text-slate-500">内容区块：</span>{{ resource.typeDetail.report.blocks?.length }}</div>
      </div>
    </div>

    <!-- 类型特有区块：看板 -->
    <div v-if="resource.type === 'dashboard' && resource.typeDetail.dashboard" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">看板详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">时间范围：</span>{{ resource.typeDetail.dashboard.timeRange }}</div>
        <div><span class="text-slate-500">更新周期：</span>{{ resource.typeDetail.dashboard.updateCycle }}</div>
        <div><span class="text-slate-500">指标数：</span>{{ resource.typeDetail.dashboard.metrics?.length }}</div>
        <div><span class="text-slate-500">面板数：</span>{{ resource.typeDetail.dashboard.panels?.length }}</div>
      </div>
    </div>
  </div>
  <div v-else class="py-20 text-center text-slate-500">
    资源不存在
  </div>
</template>
```

- [ ] **Step 3: 更新路由**

修改 `external-app-vue3/src/router/index.ts`：

将第32-35行替换为：

```typescript
    { path: '/admin/resources', name: 'admin-resources', component: () => import('@/views/admin/ResourceCenter.vue'), meta: { title: '资源管理' } },
    { path: '/admin/resources/:id', name: 'admin-resource-edit', component: () => import('@/views/admin/ResourceEdit.vue'), meta: { title: '资源编辑' } },
```

即删除旧的 `/admin/products`、`/admin/products/:id`、`/admin/content`、`/admin/content/:id` 四条路由，替换为 `/admin/resources` 和 `/admin/resources/:id`。

- [ ] **Step 4: 更新 AdminShell 导航**

修改 `external-app-vue3/src/layouts/AdminShell.vue`，将 nav 数组中的：

```typescript
  { path: '/admin/products', label: '商品中心', icon: '🗂️', badge: '重点' },
  { path: '/admin/content', label: '内容中心', icon: '📰' },
```

替换为：

```typescript
  { path: '/admin/resources', label: '资源管理', icon: '🗂️', badge: '重点' },
```

- [ ] **Step 5: 运行类型检查**

Run: `cd external-app-vue3 && npx vue-tsc --noEmit --pretty 2>&1 | grep -E "ResourceCenter|ResourceEdit|router|AdminShell" | head -10`
Expected: 无新文件相关错误

- [ ] **Step 6: 运行全部测试确认无回归**

Run: `cd external-app-vue3 && npx vitest run`
Expected: All tests PASS（ContentEdit.test.ts 可能失败，因为组件还在但路由已删除——先检查）

如果 `ContentEdit.test.ts` 失败，确认失败原因是路由变更而非组件本身。如果组件本身不再被路由引用，暂时跳过该测试（后续 Task 6 统一清理）。

- [ ] **Step 7: Commit**

```bash
git add external-app-vue3/src/views/admin/ResourceCenter.vue external-app-vue3/src/views/admin/ResourceEdit.vue external-app-vue3/src/router/index.ts external-app-vue3/src/layouts/AdminShell.vue
git commit -m "feat: 资源管理中心 — ResourceCenter 列表页 + ResourceEdit 编辑页 + 路由/导航更新"
```

---

### Task 5: 找数搜索集成

**Files:**
- Modify: `external-app-vue3/src/views/mobile/SearchResult.vue`

- [ ] **Step 1: 修改 SearchResult.vue 集成内部视图搜索**

在 `external-app-vue3/src/views/mobile/SearchResult.vue` 中：

在 `<script setup>` 中添加 import：

```typescript
import type { Resource } from '@/types/resource'
```

在 `results` computed 后添加内部视图搜索：

```typescript
const internalViews = computed(() => catalog.searchInternalViews(query.value))

const hasInternalViews = computed(() => internalViews.value.length > 0)
```

在模板中搜索结果列表之后添加内部视图区块：

```vue
    <!-- 内部视图结果 -->
    <div v-if="hasInternalViews" class="mt-4 px-4">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-xs font-medium text-slate-500">🏠 内部视图</span>
        <span class="text-xs text-slate-400">{{ internalViews.length }} 条</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="view in internalViews"
          :key="view.id"
          class="rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50"
          @click="openExternalView(view)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-slate-800">{{ view.resourceName }}</span>
                <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">🏠内部</span>
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ view.typeDetail.userView?.dataSourceName }} · {{ view.typeDetail.userView?.chartType }}
              </div>
              <div class="mt-0.5 text-xs text-slate-400">
                更新于 {{ view.updatedAt }}
              </div>
            </div>
            <span class="text-slate-300">›</span>
          </div>
        </div>
      </div>
    </div>
```

在 `<script setup>` 中添加 `openExternalView` 方法：

```typescript
function openExternalView(view: Resource) {
  const url = view.typeDetail.userView?.externalUrl
  if (url) {
    window.open(url, '_blank')
  } else {
    alert('该视图暂无跳转链接')
  }
}
```

- [ ] **Step 2: 运行类型检查**

Run: `cd external-app-vue3 && npx vue-tsc --noEmit --pretty 2>&1 | grep -E "SearchResult" | head -10`
Expected: 无 SearchResult 相关错误

- [ ] **Step 3: 运行全部测试确认无回归**

Run: `cd external-app-vue3 && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add external-app-vue3/src/views/mobile/SearchResult.vue
git commit -m "feat: 找数搜索集成内部视图 — 混合展示市场商品和用数产出"
```

---

### Task 6: 清理旧文件 + 测试修复

**Files:**
- Delete: `external-app-vue3/src/views/admin/ProductCenter.vue`
- Delete: `external-app-vue3/src/views/admin/ContentCenter.vue`
- Delete: `external-app-vue3/src/views/admin/ProductEdit.vue`
- Delete: `external-app-vue3/src/views/admin/ContentEdit.vue`
- Modify: `external-app-vue3/src/views/admin/ContentEdit.test.ts` (删除或适配)

- [ ] **Step 1: 检查旧文件引用**

Run: `cd external-app-vue3 && grep -r "ProductCenter\|ContentCenter\|ProductEdit\|ContentEdit" src/ --include="*.ts" --include="*.vue" -l`
Expected: 只看到路由（已更新）和测试文件

- [ ] **Step 2: 处理 ContentEdit.test.ts**

检查 `external-app-vue3/src/views/admin/ContentEdit.test.ts` 是否还有效。如果 ContentEdit 组件已被删除且功能已合并到 ResourceEdit，则删除此测试文件：

```bash
rm external-app-vue3/src/views/admin/ContentEdit.test.ts
```

- [ ] **Step 3: 删除旧文件**

```bash
rm external-app-vue3/src/views/admin/ProductCenter.vue
rm external-app-vue3/src/views/admin/ContentCenter.vue
rm external-app-vue3/src/views/admin/ProductEdit.vue
rm external-app-vue3/src/views/admin/ContentEdit.vue
```

- [ ] **Step 4: 运行类型检查确认无引用残留**

Run: `cd external-app-vue3 && npx vue-tsc --noEmit --pretty 2>&1 | grep -E "ProductCenter|ContentCenter|ProductEdit|ContentEdit" | head -10`
Expected: 无输出（无残留引用）

- [ ] **Step 5: 运行全部测试确认无回归**

Run: `cd external-app-vue3 && npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: 运行完整构建**

Run: `cd external-app-vue3 && npx vue-tsc -b --noCheck && npx vite build 2>&1 | tail -5`
Expected: Build 成功

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: 删除旧的商品中心/内容中心页面，功能已合并到资源管理"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Resource 类型定义 → Task 1
- ✅ Product 增加 resourceId → Task 1 Step 3
- ✅ Mock 数据迁移 → Task 2
- ✅ user_view mock 数据 → Task 2 Step 3
- ✅ Catalog Store 扩展 (resources, getters, actions) → Task 3
- ✅ 资源管理中心 (ResourceCenter + ResourceEdit) → Task 4
- ✅ 路由/导航更新 → Task 4 Steps 3-4
- ✅ 搜索集成内部视图 → Task 5
- ✅ 删除旧文件 → Task 6
- ✅ 边界规则（user_view 不可上架、重复上架报错）→ Task 3 listResource

**2. Placeholder scan:** 无 TBD/TODO/"add appropriate error handling" 等占位符

**3. Type consistency:**
- `Resource` 在 Task 1 定义，Task 2/3/4/5 一致使用
- `ListResourceForm` 在 Task 1 定义，Task 3 listResource 使用
- `ResourceType` / `ResourceOrigin` / `UserViewDetail` / `ResourceTypeDetail` 全文一致
- `resourceById` / `productForResource` / `internalViews` / `listResource` / `delistProduct` / `searchInternalViews` 命名一致

**遗漏检查：**
- AnswerResult.vue 的修改在当前 Task 中省略——因为 AI 找数结果的修改逻辑与 SearchResult 类似但涉及 AI store 的联动，更适合在后续迭代中处理。原型阶段先在 SearchResult 中集成即可验证核心流程。

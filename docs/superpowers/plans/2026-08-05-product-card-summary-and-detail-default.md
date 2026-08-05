# Product Card Summary and Detail Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 数据集和 API 列表从已有商品配置生成业务内容总结，并让两端详情进入符合类型定位的默认页签。

**Architecture:** 新建纯函数集中完成摘要摘取，列表组件只负责展示。`ProductContentPeek` 保留报告和看板内容预览，数据集和 API 改为摘要视图。移动端、PC 详情共用相同页签顺序；后台复用摘要组件预览生成结果。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vitest、Vue Test Utils、Tailwind CSS。

## Global Constraints

- 不新增“内容总结”商品字段。
- 不调用 AI 生成摘要。
- 数据集卡片不展示字段名、字段值或样例数据行。
- API 卡片不展示接口路径、请求参数、返回字段或响应样例。
- 报告保持在线阅读优先；看板保持看板预览优先。
- APP 与 PC 行为一致。
- 可信空间只读使用同步信息。

---

### Task 1: 摘要摘取规则

**Files:**
- Create: `external-app-vue3/src/domain/productCardSummary.ts`
- Create: `external-app-vue3/src/domain/productCardSummary.test.ts`

**Interfaces:**
- Consumes: `Product` from `@/types/domain`.
- Produces: `productCardSummary(product: Product): { lead: string; facts: string[] }`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { productCardSummary } from './productCardSummary'

const product = (id: string) => seedProducts.find((item) => item.id === id)!

describe('productCardSummary', () => {
  it('summarizes dataset business content without field samples', () => {
    const summary = productCardSummary(product('prod-truck-trajectory'))
    expect(summary.lead).toContain('货车轨迹')
    expect(summary.facts).toContain('区县 × 小时')
    expect(`${summary.lead} ${summary.facts.join(' ')}`).not.toContain('district_code')
  })

  it('summarizes API capability without endpoint details', () => {
    const summary = productCardSummary(product('prod-qualification-api'))
    expect(summary.lead).toContain('核验')
    expect(summary.facts.join(' ')).toContain('证件是否有效')
    expect(`${summary.lead} ${summary.facts.join(' ')}`).not.toContain('/api/')
  })

  it('falls back to subtitle and then preparation copy', () => {
    const source = product('prod-truck-trajectory')
    expect(productCardSummary({ ...source, description: '' }).lead).toBe(source.subtitle)
    expect(productCardSummary({ ...source, description: '', subtitle: '' }).lead).toBe('内容说明准备中')
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/domain/productCardSummary.test.ts`

Expected: FAIL because `productCardSummary.ts` does not exist.

- [ ] **Step 3: Implement fixed extraction**

```ts
import type { Product } from '@/types/domain'

function firstSentence(value: string) {
  return value.trim().split(/(?<=[。！？])/u)[0]?.trim() || ''
}

function compact(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

export function productCardSummary(product: Product) {
  const lead = firstSentence(product.description) || product.subtitle.trim() || '内容说明准备中'
  if (product.type === 'dataset') {
    const detail = product.typeDetail.dataset
    return { lead, facts: compact([product.coverage, detail?.granularity, product.updateFrequency, detail?.rowCount ? `${detail.rowCount.toLocaleString('zh-CN')} 条` : undefined]).slice(0, 3) }
  }
  if (product.type === 'api') {
    const detail = product.typeDetail.api
    const result = detail?.responseFields.filter((field) => field.name !== 'requestId').map((field) => field.description).filter(Boolean).slice(0, 2).join('、')
    return { lead, facts: compact([result ? `返回${result}` : undefined, detail?.sla, detail?.rateLimit]).slice(0, 3) }
  }
  return { lead, facts: [] }
}
```

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/domain/productCardSummary.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/domain/productCardSummary.ts external-app-vue3/src/domain/productCardSummary.test.ts
git commit -m "feat: derive product card summaries"
```

### Task 2: 两端列表卡片摘要

**Files:**
- Modify: `external-app-vue3/src/components/ProductContentPeek.vue`
- Modify: `external-app-vue3/src/components/ProductContentPeek.test.ts`
- Verify: `external-app-vue3/src/components/mobile/ProductCard.vue`
- Verify: `external-app-vue3/src/views/portal/PortalSearch.vue`
- Verify: `external-app-vue3/src/views/mobile/SearchResult.vue`

**Interfaces:**
- Consumes: `productCardSummary(product)` from Task 1.
- Produces: dataset/API summary card with `data-testid="product-content-summary"`.

- [ ] **Step 1: Extend component tests**

```ts
it('shows a dataset content summary instead of sample fields', () => {
  const product = seedProducts.find((item) => item.id === 'prod-truck-trajectory')!
  const wrapper = mount(ProductContentPeek, { props: { product } })
  expect(wrapper.get('[data-testid="product-content-summary"]').text()).toContain('货车轨迹')
  expect(wrapper.text()).not.toContain('district_code')
  expect(wrapper.text()).not.toContain('310115')
})

it('shows an API capability summary instead of endpoint docs', () => {
  const product = seedProducts.find((item) => item.id === 'prod-qualification-api')!
  const wrapper = mount(ProductContentPeek, { props: { product } })
  expect(wrapper.get('[data-testid="product-content-summary"]').text()).toContain('核验')
  expect(wrapper.text()).not.toContain('/api/v1/')
  expect(wrapper.text()).not.toContain('requestId')
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/components/ProductContentPeek.test.ts`

Expected: FAIL because current component renders sample cells and endpoint details.

- [ ] **Step 3: Replace dataset/API preview branches**

Import `productCardSummary`, compute it once, render lead text plus up to three fact pills. Keep report and dashboard branches unchanged. Remove dataset sample and API response computations after no callers remain.

- [ ] **Step 4: Run component and search tests**

Run: `npm test -- --run src/components/ProductContentPeek.test.ts src/views/mobile/SearchResult.test.ts`

Expected: PASS; both search surfaces continue using shared preview.

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/components/ProductContentPeek.vue external-app-vue3/src/components/ProductContentPeek.test.ts
git commit -m "feat: show business summaries in cards"
```

### Task 3: 四类详情默认页签

**Files:**
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`
- Modify: `external-app-vue3/src/views/portal/PortalProductDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.test.ts`
- Create: `external-app-vue3/src/views/portal/PortalProductDetail.test.ts`

**Interfaces:**
- Produces tab order: dataset `basic,samples,fields,profiling`; API `basic,docs,sandbox,sla`; report `reader,catalog,overview`; dashboard `preview,metrics,overview,updates`.

- [ ] **Step 1: Write default-tab tests**

```ts
it.each([
  ['prod-truck-trajectory', 'basic'],
  ['prod-qualification-api', 'basic'],
  ['prod-logistics-monthly', 'reader'],
  ['prod-freight-index', 'preview']
])('selects the expected default tab for %s', async (productId, tab) => {
  const wrapper = await mountProductDetail(`/app/product/${productId}`)
  expect(wrapper.get(`[role="tab"][data-tab="${tab}"]`).attributes('aria-selected')).toBe('true')
})
```

Portal test mounts `/portal/product/:id`, then asserts:

```ts
expect(wrapper.findComponent(PortalDetailTabs).props('modelValue')).toBe(expectedTab)
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/views/mobile/ProductDetail.test.ts src/views/portal/PortalProductDetail.test.ts`

Expected: dataset/API assertions FAIL because current first tabs are samples/docs.

- [ ] **Step 3: Reorder tab declarations**

Move `basic` to first position for dataset and API in both files. Keep report and dashboard arrays unchanged. Preserve watcher behavior that selects `tabsByType[type][0].key` when product changes.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- --run src/views/mobile/ProductDetail.test.ts src/views/portal/PortalProductDetail.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/views/mobile/ProductDetail.vue external-app-vue3/src/views/mobile/ProductDetail.test.ts external-app-vue3/src/views/portal/PortalProductDetail.vue external-app-vue3/src/views/portal/PortalProductDetail.test.ts
git commit -m "fix: align product detail default tabs"
```

### Task 4: 后台预览、PRD 与验证

**Files:**
- Modify: `external-app-vue3/src/views/admin/ResourceEdit.vue`
- Modify: `external-app-vue3/src/views/admin/ResourceEdit.test.ts`
- Modify: `docs/product/2026-08-03-对外APP找数买数用数-功能说明PRD.md`
- Modify: `docs/product/2026-08-03-对外APP找数买数用数-完整模块PRD.md`
- Modify: `docs/product/2026-07-31-对外APP找数买数用数-评审演示路线.md`

**Interfaces:**
- Consumes: `ProductContentPeek` shared component.
- Produces: admin card preview without a new input field; synchronized product documentation.

- [ ] **Step 1: Write admin preview test**

Extend `mountResourceEdit(resourceId = 'res-prod-freight-index')`, then add:

```ts
it('previews generated dataset summary without adding a summary input', async () => {
  const wrapper = await mountResourceEdit('res-prod-truck-trajectory')
  expect(wrapper.get('[data-testid="product-content-summary"]').text()).toContain('货车轨迹')
  expect(wrapper.find('[data-testid="product-content-summary-input"]').exists()).toBe(false)
})
```

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- --run src/views/admin/ResourceEdit.test.ts`

Expected: FAIL because edit page does not render shared card preview.

- [ ] **Step 3: Add shared preview**

Render `ProductContentPeek` in the existing front-end preview section. Do not add form state, save logic, or model fields.

- [ ] **Step 4: Update docs**

Add these exact product rules:

- `数据集和 API 列表摘要从已有商品配置按固定规则摘取，不新增内容总结输入项。`
- `数据集卡片不展示字段名、字段值和样例数据行；API 卡片不展示接口路径、请求参数、返回字段和响应样例。`
- `摘要按详细描述、商品副标题、内容说明准备中的顺序回退。`
- `数据集与 API 默认进入基本信息；报告默认进入在线阅读；看板默认进入看板预览。`
- `APP 与 PC 使用相同摘要和默认页签规则。`

Mark functional PRD adjustment date as `2026-08-05`.

- [ ] **Step 5: Run full verification**

Run: `npm test -- --run`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vue TypeScript and Vite build PASS.

- [ ] **Step 6: Sync Feishu and read back markers**

Sync functional PRD and review demo route using existing Feishu scripts. Verify markers: `内容总结`, `不展示接口路径`, `数据集与 API 默认进入基本信息`, `不新增内容总结输入项`.

- [ ] **Step 7: Commit**

```bash
git add external-app-vue3/src/views/admin/ResourceEdit.vue external-app-vue3/src/views/admin/ResourceEdit.test.ts
git commit -m "feat: preview generated card summaries"
```

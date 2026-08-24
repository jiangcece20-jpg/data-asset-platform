# 找数买数空间意向单与标签 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 空间数据集/API 前台改为提交意向单（不再跳转购买），补齐空间名称/样例/试用接口标签，运营代办空间成交后把数据集接到本平台用数。

**Architecture:** 固定标签与意向单状态机做成 `domain/spaceIntent.ts` 纯函数；Pinia `spaceIntents` 管意向单生命周期；`productAccess` 把空间商品主按钮改成「提交意向单」。用户页不再调用 `trustedSpacePurchase.preparePurchase`。运营后台「去空间处理」才打开现有 `SpaceBridge`。数据集完成接入时复用 `entitlements.grantDatasetPending` + `activateDataset`。

**Tech Stack:** Vue 3.4、TypeScript 5.5、Pinia、Vue Router 4、Vitest 3、Vue Test Utils 2、Tailwind CSS 3（`external-app-vue3`）

**Spec:** `docs/superpowers/specs/2026-08-24-find-buy-space-intent-and-tags-design.md`

## Global Constraints

- 只改 `external-app-vue3` 和本计划点名的 `docs/product/**`、README、本 spec。不改内部 React 数据资产平台。
- 自有空间对外名称必须是「万联易达可信空间」，禁止写成「万联可信空间」。
- 用户路径禁止「前往可信空间购买」。`SpaceBridge` 仅运营「去空间处理」使用。
- 意向单与搜不到货的需求提报分表，不写入 `demand` store。
- 数据集没有「有无试用接口」；API 没有「有无样例数据」。API「有试用接口」只是标签，不提供真实调用。
- APP/门户不展示「自有 / 互联」；该字段仅运营后台。
- 个人可提交意向单；未落到认证企业不得进入 `space_dealing`。
- 测试在 `external-app-vue3` 下跑：`npm test`。提交信息：`feat(commerce)` / `test(commerce)` / `docs(search)`。
- `docs/` 被 gitignore，提交文档用 `git add -f`。

## File Structure

| 文件 | 职责 |
|------|------|
| `external-app-vue3/src/domain/spaceIntent.ts` | 标签展示、用户/运营状态映射、状态迁移校验 |
| `external-app-vue3/src/domain/spaceIntent.test.ts` | 上述纯函数单测 |
| `external-app-vue3/src/domain/productAccess.ts` | 空间商品主按钮改为提交意向单 |
| `external-app-vue3/src/domain/productAccess.test.ts` | 去掉企业认证才能买的断言 |
| `external-app-vue3/src/types/spaceIntent.ts` | 意向单类型 |
| `external-app-vue3/src/types/domain.ts` | Product 增加 spaceName / spaceKind / hasSampleData / hasTrialApi |
| `external-app-vue3/src/data/products.ts` | 空间商品打标签、样例、自有/互联示例 |
| `external-app-vue3/src/stores/spaceIntents.ts` | 提交与运营流转 |
| `external-app-vue3/src/stores/spaceIntents.test.ts` | 个人提交、禁未确认企业成交、数据集交付发权 |
| `external-app-vue3/src/stores/catalog.ts` | search 增加空间名/样例/试用筛选 |
| `external-app-vue3/src/views/mobile/SpaceIntentForm.vue` | 用户提交意向单 |
| `external-app-vue3/src/views/mobile/ProductDetail.vue` | 主按钮走意向单，去掉 goSpace |
| `external-app-vue3/src/views/portal/PortalProductDetail.vue` | 同上 |
| `external-app-vue3/src/views/admin/SpaceIntentList.vue` | 运营工作台 |
| `external-app-vue3/src/views/admin/SpaceIntentDetail.vue` | 领取、确认企业、去空间、回填、接入、关闭 |
| `docs/product/2026-07-31-对外APP找数买数用数-产品规划-简明版.md` | 空间购买口径 |
| `docs/product/2026-07-31-对外APP找数买数用数-产品规划.md` | 同上 |
| `docs/product/2026-08-03-对外APP找数买数用数-完整模块PRD.md` | F6 改为意向单 |
| `docs/product/2026-08-03-对外APP找数买数用数-功能说明PRD.md` | 同步用户可见规则 |

不删除 `SpaceBridge.vue` 和 `trustedSpacePurchase.ts`。用户详情页不再跳转它们。

---

### Task 1: 标签与意向单纯函数，改主按钮决策

**Files:**
- Create: `external-app-vue3/src/types/spaceIntent.ts`
- Create: `external-app-vue3/src/domain/spaceIntent.ts`
- Create: `external-app-vue3/src/domain/spaceIntent.test.ts`
- Modify: `external-app-vue3/src/types/domain.ts`（`Product` 增加四个可选字段）
- Modify: `external-app-vue3/src/domain/productAccess.ts`
- Modify: `external-app-vue3/src/domain/productAccess.test.ts`

**Interfaces:**
- Consumes: `Product`、`ProductActionContext`
- Produces:
  - `OWNED_SPACE_NAME = '万联易达可信空间'`
  - `SpaceKind = 'owned' | 'federated'`
  - `SpaceIntentOpsStatus = 'unclaimed' | 'pending_enterprise' | 'space_dealing' | 'pending_delivery' | 'completed' | 'closed'`
  - `SpaceIntentUserStatus = 'submitted' | 'processing' | 'completed' | 'closed'`
  - `userStatusOf(ops: SpaceIntentOpsStatus): SpaceIntentUserStatus`
  - `USER_STATUS_LABELS` / `OPS_STATUS_LABELS`
  - `publicSpaceChips(product: Product): string[]`（用户可见：空间名称、有样例、有试用接口）
  - `canEnterSpaceDealing(intent: { enterpriseId?: string }): boolean`
  - `nextOpsStatus(current, action)` 见 Step 3
  - `ProductActionKey` 增加 `'submit_space_intent'`
  - `resolveProductActions`：`acquisitions` 含 `space_purchase` 时，主按钮 `{ key: 'submit_space_intent', label: '提交意向单' }`，不再要求企业认证，不再用 `trustedPurchaseCheck` 拦截用户按钮

- [ ] **Step 1: Write the failing test**

Create `external-app-vue3/src/types/spaceIntent.ts`:

```ts
export type SpaceKind = 'owned' | 'federated'

export type SpaceIntentOpsStatus =
  | 'unclaimed'
  | 'pending_enterprise'
  | 'space_dealing'
  | 'pending_delivery'
  | 'completed'
  | 'closed'

export type SpaceIntentUserStatus = 'submitted' | 'processing' | 'completed' | 'closed'

export interface SpaceIntentOrder {
  id: string
  productId: string
  productType: 'dataset' | 'api'
  ownerMemberId: string
  contactName: string
  contactPhone: string
  scenario: string
  requestedEnterpriseName?: string
  enterpriseId?: string
  opsStatus: SpaceIntentOpsStatus
  spaceOrderNo?: string
  spaceDealNote?: string
  closeReason?: string
  createdAt: string
  updatedAt: string
}
```

Create `external-app-vue3/src/domain/spaceIntent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import {
  OWNED_SPACE_NAME,
  canEnterSpaceDealing,
  nextOpsStatus,
  publicSpaceChips,
  userStatusOf
} from './spaceIntent'

function product(over: Partial<Product>): Product {
  return { type: 'dataset', dealChannel: 'space_purchase', tags: [], ...over } as Product
}

describe('spaceIntent domain', () => {
  it('maps ops status to three user statuses', () => {
    expect(userStatusOf('unclaimed')).toBe('submitted')
    expect(userStatusOf('pending_enterprise')).toBe('processing')
    expect(userStatusOf('space_dealing')).toBe('processing')
    expect(userStatusOf('pending_delivery')).toBe('processing')
    expect(userStatusOf('completed')).toBe('completed')
    expect(userStatusOf('closed')).toBe('closed')
  })

  it('shows space name and sample chip to users, never owned/federated', () => {
    const chips = publicSpaceChips(product({
      spaceName: OWNED_SPACE_NAME,
      spaceKind: 'owned',
      hasSampleData: true,
      type: 'dataset'
    }))
    expect(chips).toEqual([OWNED_SPACE_NAME, '有样例'])
    expect(chips.join()).not.toContain('自有')
    expect(chips.join()).not.toContain('互联')
  })

  it('shows trial-api chip only for APIs', () => {
    expect(publicSpaceChips(product({
      type: 'dataset',
      spaceName: OWNED_SPACE_NAME,
      hasTrialApi: true,
      hasSampleData: false
    }))).toEqual([OWNED_SPACE_NAME])
    expect(publicSpaceChips(product({
      type: 'api',
      spaceName: '某省互联空间',
      hasTrialApi: true
    }))).toEqual(['某省互联空间', '有试用接口'])
  })

  it('blocks space dealing until an enterprise is attached', () => {
    expect(canEnterSpaceDealing({})).toBe(false)
    expect(canEnterSpaceDealing({ enterpriseId: 'ent-1' })).toBe(true)
  })

  it('routes dataset completion through pending_delivery', () => {
    expect(nextOpsStatus('space_dealing', 'mark_space_deal', 'dataset')).toBe('pending_delivery')
    expect(nextOpsStatus('space_dealing', 'mark_space_deal', 'api')).toBe('completed')
    expect(() => nextOpsStatus('unclaimed', 'mark_space_deal', 'dataset')).toThrow()
  })
})
```

Add to `external-app-vue3/src/domain/productAccess.test.ts` (replace the two trusted-space purchase tests):

```ts
  it('lets any unpublished-access user submit a space intent without enterprise auth', () => {
    expect(resolveProductActions(base).primary).toEqual({
      key: 'submit_space_intent',
      label: '提交意向单'
    })
    expect(resolveProductActions({ ...base, enterpriseAuthenticated: true }).primary.key).toBe('submit_space_intent')
  })

  it('does not disable the space intent CTA when the space snapshot is stale', () => {
    expect(resolveProductActions({
      ...base,
      enterpriseAuthenticated: true,
      trustedPurchaseCheck: { allowed: false, reason: 'product_stale' }
    }).primary).toEqual({ key: 'submit_space_intent', label: '提交意向单' })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd external-app-vue3 && npx vitest run src/domain/spaceIntent.test.ts src/domain/productAccess.test.ts`

Expected: FAIL，`spaceIntent` 模块不存在；`productAccess` 仍返回 `enterprise_auth` / `space_purchase`。

- [ ] **Step 3: Write minimal implementation**

`Product` 在 `spaceMeta` 旁增加：

```ts
  /** 空间展示名；用户侧只展示这个，不展示自有/互联 */
  spaceName?: string
  /** 自有 / 互联；仅运营后台 */
  spaceKind?: import('./spaceIntent').SpaceKind extends never ? never : 'owned' | 'federated'
  hasSampleData?: boolean
  hasTrialApi?: boolean
```

不要从 `spaceIntent.ts` 反向 import 到 `domain.ts` 造成环。直接写：

```ts
  spaceKind?: 'owned' | 'federated'
```

Create `external-app-vue3/src/domain/spaceIntent.ts`:

```ts
import type { Product } from '@/types/domain'
import type { SpaceIntentOpsStatus, SpaceIntentUserStatus } from '@/types/spaceIntent'

export const OWNED_SPACE_NAME = '万联易达可信空间'

export const USER_STATUS_LABELS: Record<SpaceIntentUserStatus, string> = {
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  closed: '已关闭'
}

export const OPS_STATUS_LABELS: Record<SpaceIntentOpsStatus, string> = {
  unclaimed: '待领取',
  pending_enterprise: '待确认企业',
  space_dealing: '空间成交中',
  pending_delivery: '待接入交付',
  completed: '已完成',
  closed: '关闭'
}

export function userStatusOf(ops: SpaceIntentOpsStatus): SpaceIntentUserStatus {
  if (ops === 'unclaimed') return 'submitted'
  if (ops === 'completed') return 'completed'
  if (ops === 'closed') return 'closed'
  return 'processing'
}

export function publicSpaceChips(product: Product): string[] {
  const chips: string[] = []
  if (product.dealChannel === 'space_purchase' && product.spaceName) chips.push(product.spaceName)
  if (product.type === 'dataset' && product.hasSampleData) chips.push('有样例')
  if (product.type === 'api' && product.hasTrialApi) chips.push('有试用接口')
  return chips
}

export function canEnterSpaceDealing(intent: { enterpriseId?: string }): boolean {
  return Boolean(intent.enterpriseId)
}

export type SpaceIntentOpsAction = 'claim' | 'confirm_enterprise' | 'mark_space_deal' | 'complete_delivery' | 'close'

export function nextOpsStatus(
  current: SpaceIntentOpsStatus,
  action: SpaceIntentOpsAction,
  productType: 'dataset' | 'api'
): SpaceIntentOpsStatus {
  if (action === 'close') {
    if (current === 'completed') throw new Error('已完成不可关闭')
    return 'closed'
  }
  if (action === 'claim') {
    if (current !== 'unclaimed') throw new Error('仅待领取可领取')
    return 'pending_enterprise'
  }
  if (action === 'confirm_enterprise') {
    if (current !== 'unclaimed' && current !== 'pending_enterprise') throw new Error('企业未确认')
    return 'space_dealing'
  }
  if (action === 'mark_space_deal') {
    if (current !== 'space_dealing') throw new Error('未在空间成交中')
    return productType === 'dataset' ? 'pending_delivery' : 'completed'
  }
  if (action === 'complete_delivery') {
    if (current !== 'pending_delivery') throw new Error('仅待接入交付可完成接入')
    return 'completed'
  }
  throw new Error('未知动作')
}
```

`productAccess.ts`：给 `ProductActionKey` 增加 `'submit_space_intent'`。把 `space_purchase` 分支改成：

```ts
  if (context.acquisitions.includes('space_purchase')) {
    return { primary: { key: 'submit_space_intent', label: '提交意向单' } }
  }
```

删掉该分支里对 `enterpriseAuthenticated` 和 `trustedPurchaseCheck` 的拦截。暂停/下架/已有权益等前面的分支保持不变。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd external-app-vue3 && npx vitest run src/domain/spaceIntent.test.ts src/domain/productAccess.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/types/spaceIntent.ts \
  external-app-vue3/src/types/domain.ts \
  external-app-vue3/src/domain/spaceIntent.ts \
  external-app-vue3/src/domain/spaceIntent.test.ts \
  external-app-vue3/src/domain/productAccess.ts \
  external-app-vue3/src/domain/productAccess.test.ts
git commit -m "$(cat <<'EOF'
feat(commerce): 空间商品主按钮改为提交意向单

EOF
)"
```

---

### Task 2: 空间商品种子打上固定标签

**Files:**
- Modify: `external-app-vue3/src/data/products.ts`
- Modify: `external-app-vue3/src/data/products.test.ts`
- Modify: `external-app-vue3/src/data/mockProducts.ts`（空间来源同样补字段，避免类型漏）

**Interfaces:**
- Consumes: Task 1 的 `Product` 字段、`OWNED_SPACE_NAME`
- Produces: 至少 1 个自有空间数据集（有样例）、1 个互联空间数据集（无样例）、1 个自有空间 API（有试用接口）、1 个互联空间 API（无试用接口）

- [ ] **Step 1: Write the failing test**

Add to `external-app-vue3/src/data/products.test.ts`:

```ts
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'

it('tags owned vs federated space products without putting 自有/互联 in free-text tags', () => {
  const ownedDs = products.find((p) => p.id === 'prod-enterprise-activity')!
  const federatedDs = products.find((p) => p.id === 'prod-truck-trajectory') // 若该 id 不是空间商品，改成种子里实际新增的互联数据集 id
  expect(ownedDs.spaceName).toBe(OWNED_SPACE_NAME)
  expect(ownedDs.spaceKind).toBe('owned')
  expect(ownedDs.hasSampleData).toBe(true)
  expect(ownedDs.hasTrialApi).toBeUndefined()
  expect(ownedDs.tags.join()).not.toContain('万联可信空间')
})
```

**落地时以 `products.ts` 里实际 `origin === 'trusted_space'` 的 id 为准**，不要误改资产平台数据集 `prod-truck-trajectory`。当前空间商品是：

- `prod-qualification-api`（API）
- `prod-privacy-verify`（API）
- `prod-enterprise-activity`（数据集）

再新增一条互联空间数据集，id 用 `prod-space-port-throughput`，名称任意，`spaceName: '某省数据空间'`，`spaceKind: 'federated'`，`hasSampleData: false`，`sampleRows: []`。把现有两条 API 一条标 `hasTrialApi: true`（`prod-qualification-api`），一条 `false`（`prod-privacy-verify`）。`prod-enterprise-activity` 标自有、有样例。

测试写成：

```ts
import { products } from './products'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'

describe('space product tags', () => {
  const space = () => products.filter((p) => p.origin === 'trusted_space')

  it('uses 万联易达可信空间 for owned space copy', () => {
    expect(space().some((p) => JSON.stringify(p).includes('万联可信空间'))).toBe(false)
    expect(space().filter((p) => p.spaceKind === 'owned').every((p) => p.spaceName === OWNED_SPACE_NAME)).toBe(true)
  })

  it('splits sample tag to datasets and trial-api tag to APIs', () => {
    for (const p of space()) {
      if (p.type === 'dataset') expect(p.hasTrialApi).toBeUndefined()
      if (p.type === 'api') expect(p.hasSampleData).toBeUndefined()
    }
    expect(products.find((p) => p.id === 'prod-enterprise-activity')?.hasSampleData).toBe(true)
    expect(products.find((p) => p.id === 'prod-space-port-throughput')?.hasSampleData).toBe(false)
    expect(products.find((p) => p.id === 'prod-qualification-api')?.hasTrialApi).toBe(true)
    expect(products.find((p) => p.id === 'prod-privacy-verify')?.hasTrialApi).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd external-app-vue3 && npx vitest run src/data/products.test.ts`

Expected: FAIL，缺少新字段和新商品。

- [ ] **Step 3: Write minimal implementation**

给每个 `origin: 'trusted_space'` 的商品补 `spaceName`、`spaceKind`。自有用 `OWNED_SPACE_NAME`（在 products.ts 里可直接写字符串 `'万联易达可信空间'`，避免 data 层强依赖 domain 也可，但测试用常量）。`provider` 里若写「可信数据空间 · 平台自营」可改为「万联易达可信空间」，不要出现「万联可信空间」。

`prod-enterprise-activity`：`hasSampleData: true`，保留已有 `sampleRows`。

新增互联数据集 `prod-space-port-throughput`：结构抄 `prod-enterprise-activity` 精简版，`spaceKind: 'federated'`，`spaceName: '某省数据空间'`，`hasSampleData: false`，`sampleRows: []`。同时在 `external-app-vue3/src/data/resources.ts` 补对应 `res-prod-space-port-throughput`，否则资源列表缺映射。若 resources 测试过严，最小是 products 数组能被 catalog clone。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd external-app-vue3 && npx vitest run src/data/products.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/data/products.ts external-app-vue3/src/data/products.test.ts external-app-vue3/src/data/resources.ts external-app-vue3/src/data/mockProducts.ts
git commit -m "$(cat <<'EOF'
feat(commerce): 为空间商品补齐来源与样例标签

EOF
)"
```

---

### Task 3: 意向单 store

**Files:**
- Create: `external-app-vue3/src/stores/spaceIntents.ts`
- Create: `external-app-vue3/src/stores/spaceIntents.test.ts`

**Interfaces:**
- Consumes: `SpaceIntentOrder`、`nextOpsStatus`、`canEnterSpaceDealing`、`useUserStore`、`useCatalogStore`、`useEntitlementStore`
- Produces:
  - `submit(payload)` → 新单 `opsStatus: 'unclaimed'`；已带 `enterpriseId` 的仍先 `unclaimed`（领取后可直接 `confirm_enterprise`）
  - `claim(id)`
  - `confirmEnterprise(id, enterpriseId)`：内部要求 `canEnterSpaceDealing`，再 `nextOpsStatus(..., 'confirm_enterprise')`
  - `markSpaceDeal(id, { spaceOrderNo, spaceDealNote })`
  - `completeDelivery(id)`：仅数据集；调用 entitlements 发权
  - `close(id, reason)`
  - getters: `byOwner`、`byId`、`openOpsList`

- [ ] **Step 1: Write the failing test**

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './user'
import { useSpaceIntentStore } from './spaceIntents'
import { useEntitlementStore } from './entitlements'
import { userStatusOf } from '@/domain/spaceIntent'

describe('spaceIntents store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('allows a personal user to submit an intent', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    expect(intent.opsStatus).toBe('unclaimed')
    expect(userStatusOf(intent.opsStatus)).toBe('submitted')
    expect(intent.ownerMemberId).toBe(useUserStore().context.currentMemberId)
  })

  it('rejects space dealing before an enterprise is confirmed', () => {
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验'
    })
    store.claim(intent.id)
    expect(() => store.markSpaceDeal(intent.id, { spaceOrderNo: 'SO-1', spaceDealNote: 'x' })).toThrow()
  })

  it('completes API after space deal without creating a dataset entitlement', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '核验',
      enterpriseId: user.enterprise.id
    })
    store.claim(intent.id)
    store.confirmEnterprise(intent.id, user.enterprise.id)
    store.markSpaceDeal(intent.id, { spaceOrderNo: 'SO-api', spaceDealNote: '空间已开通调用' })
    expect(intent.opsStatus).toBe('completed')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-qualification-api' && e.type === 'dataset')).toBe(false)
  })

  it('keeps dataset processing until platform delivery is completed', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-enterprise-activity',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '画像',
      enterpriseId: user.enterprise.id
    })
    store.claim(intent.id)
    store.confirmEnterprise(intent.id, user.enterprise.id)
    store.markSpaceDeal(intent.id, { spaceOrderNo: 'SO-ds', spaceDealNote: '空间已成交' })
    expect(intent.opsStatus).toBe('pending_delivery')
    expect(userStatusOf(intent.opsStatus)).toBe('processing')
    store.completeDelivery(intent.id)
    expect(intent.opsStatus).toBe('completed')
    expect(useEntitlementStore().list.some((e) => e.productId === 'prod-enterprise-activity' && e.type === 'dataset' && e.status === 'active')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd external-app-vue3 && npx vitest run src/stores/spaceIntents.test.ts`

Expected: FAIL，store 不存在。

- [ ] **Step 3: Write minimal implementation**

`submit` 用 `useCatalogStore().byId` 取 `type`，只允许 `dataset | api` 且 `dealChannel === 'space_purchase'`。`completeDelivery`：

```ts
const catalog = useCatalogStore()
const product = catalog.byId(intent.productId)!
const offer = product.datasetOffers?.[0]
if (!offer) throw new Error('空间数据集缺少方案，无法接入')
const ent = entitlements.grantDatasetPending({
  product,
  orderId: intent.id,
  ownerType: 'enterprise',
  ownerId: intent.enterpriseId!,
  operatorMemberId: intent.ownerMemberId,
  offerId: offer.id
})
entitlements.activateDataset(ent.id, `bi-space-${intent.id}`)
```

`confirmEnterprise` 在写入 `enterpriseId` 后调用 `nextOpsStatus`。若当前是 `unclaimed` 且已有企业，允许 `claim` 后立刻 `confirmEnterprise`（测试里分开调用）。

领取已选企业的单：`claim` 只到 `pending_enterprise`；`confirmEnterprise` 才到 `space_dealing`。这与 spec「领取后可直接进入空间成交中」兼容：详情页可连续点两个按钮，或 `confirmEnterprise` 在 `unclaimed` 时先内部 claim。实现选后者更省点击：

```ts
confirmEnterprise(id, enterpriseId) {
  const intent = this.must(id)
  if (intent.opsStatus === 'unclaimed') nextOpsStatus(intent.opsStatus, 'claim', intent.productType) // 不要只算不算写
  intent.enterpriseId = enterpriseId
  if (!canEnterSpaceDealing(intent)) throw new Error('未落到认证企业')
  intent.opsStatus = nextOpsStatus(
    intent.opsStatus === 'unclaimed' ? 'pending_enterprise' : intent.opsStatus,
    'confirm_enterprise',
    intent.productType
  )
}
```

保持测试里 `claim` 再 `confirmEnterprise` 的路径能过即可。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd external-app-vue3 && npx vitest run src/stores/spaceIntents.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/stores/spaceIntents.ts external-app-vue3/src/stores/spaceIntents.test.ts
git commit -m "$(cat <<'EOF'
feat(commerce): 新增空间商品意向单流转

EOF
)"
```

---

### Task 4: 移动端提交意向单，去掉跳转购买

**Files:**
- Create: `external-app-vue3/src/views/mobile/SpaceIntentForm.vue`
- Create: `external-app-vue3/src/views/mobile/SpaceIntentForm.test.ts`
- Modify: `external-app-vue3/src/router/index.ts`（加 `/app/space-intent/:id`）
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.test.ts`
- Modify: `external-app-vue3/src/components/mobile/ProductCard.vue`（空间商品文案改为「提交意向单」）
- Modify: `external-app-vue3/src/views/mobile/Mine.vue` 或 `components/mine/OrdersPanel.vue`：增加「意向单」入口列表（用户三档状态）

**Interfaces:**
- Consumes: `submit_space_intent`、`useSpaceIntentStore().submit`
- Produces: 路由 `space-intent`；详情主按钮文案「提交意向单」；点击进入表单

- [ ] **Step 1: Write the failing test**

Rewrite `ProductDetail.test.ts` 里 trusted-space 三件套：

```ts
  it('shows submit-intent as the primary action for personal users', async () => {
    const wrapper = await mountProductDetail()
    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('提交意向单')
    expect(wrapper.text()).not.toContain('前往可信空间购买')
    expect(wrapper.text()).not.toContain('个人身份不能下单')
  })
```

删掉「必须 binding 才能前往可信空间购买」和「去企业认证」主按钮断言。若详情仍有资格提示条 `trusted-space-purchase-eligibility`，改为意向说明：「成交由运营在空间代办，买方为企业；个人可先提交意向单。」或直接去掉该条。

`SpaceIntentForm.test.ts`：mount `/app/space-intent/prod-qualification-api`，填联系人/场景，submit 后 store 有一条 `unclaimed`，页面出现「已提交」。

未登录：`useUserStore().context.loggedIn = false` 时，详情点主按钮应先把 loggedIn 打回 true 的演示开关，或显示「请先登录」。原型默认 `loggedIn: true`。最小：表单页若 `!loggedIn` 展示「请先登录」且不调用 submit。加一条测试即可。

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd external-app-vue3 && npx vitest run src/views/mobile/ProductDetail.test.ts src/views/mobile/SpaceIntentForm.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`ProductDetail.vue`：`handleAction` 增加 `case 'submit_space_intent': router.push('/app/space-intent/' + id)`。删除 `goSpace` 及对 `space_purchase` 的跳转。资格条不要再阻止提交。

`SpaceIntentForm.vue` 字段：联系人（默认 `user.context.name`）、联系方式、使用场景、可选「希望落到的企业名称」。已认证则展示本企业并默认带上 `enterpriseId`。提交后显示已提交，可回「我的」。

`ProductCard.vue`：`dealChannel === 'space_purchase'` 的按钮文案改为「提交意向单」，不要「需企业认证」。

用户意向列表：在 `OrdersPanel` 旁或「我的」增加 tab「意向单」，用 `userStatusOf` + `USER_STATUS_LABELS`。不要展示运营细状态。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd external-app-vue3 && npx vitest run src/views/mobile/ProductDetail.test.ts src/views/mobile/SpaceIntentForm.test.ts src/domain/productAccess.test.ts`

Expected: PASS。然后跑全量 `npm test`，把仍断言「前往可信空间购买」的用例按同样口径改掉（`PortalProductDetail.test.ts`、`TrustedSpaceViews.test.ts`、`CheckoutItem.test.ts` 等）。本任务必须改到 `npm test` 里不再出现该主按钮文案断言。用户跳转 `space-bridge` 的用例改为「详情不再 push space-bridge」。

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/views/mobile/SpaceIntentForm.vue \
  external-app-vue3/src/views/mobile/SpaceIntentForm.test.ts \
  external-app-vue3/src/router/index.ts \
  external-app-vue3/src/views/mobile/ProductDetail.vue \
  external-app-vue3/src/views/mobile/ProductDetail.test.ts \
  external-app-vue3/src/components/mobile/ProductCard.vue \
  external-app-vue3/src/components/mine \
  external-app-vue3/src/views/portal/PortalProductDetail.vue \
  external-app-vue3/src/views/portal/PortalProductDetail.test.ts \
  external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts \
  external-app-vue3/src/views/mobile/CheckoutItem.test.ts
git commit -m "$(cat <<'EOF'
feat(commerce): 空间商品改为提交意向单不再跳转购买

EOF
)"
```

Portal 若本任务改不完，允许 Task 5 接着改，但 `npm test` 在 Task 4 结束时必须绿。优先在本任务把 Portal 主按钮一并改掉，避免红测挂着。

---

### Task 5: 标签展示、筛选、样例空态

**Files:**
- Modify: `external-app-vue3/src/stores/catalog.ts`（`search` opts）
- Modify: `external-app-vue3/src/stores/catalog.test.ts`
- Modify: `external-app-vue3/src/components/mobile/product-detail/ProductSummaryCard.vue`
- Modify: `external-app-vue3/src/components/mobile/ProductCard.vue`
- Modify: `external-app-vue3/src/components/mobile/product-detail/DatasetDetail.vue`
- Modify: `external-app-vue3/src/views/portal/components/PortalDatasetDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/SearchResult.vue`
- Modify: `external-app-vue3/src/views/portal/PortalSearch.vue`
- Modify: `external-app-vue3/src/views/admin/ResourceEdit.vue`（只读展示 spaceKind）
- Create: `external-app-vue3/src/components/mobile/product-detail/ProductSummaryCard.test.ts`（若无现成测试就新建）

**Interfaces:**
- Consumes: `publicSpaceChips`、`Product.spaceName/hasSampleData/hasTrialApi/spaceKind`
- Produces: `catalog.search(q, { spaceName, hasSampleData, hasTrialApi, spaceKind })`

- [ ] **Step 1: Write the failing test**

`catalog.test.ts`：

```ts
it('filters space datasets by sample and APIs by trial flag', () => {
  const catalog = useCatalogStore()
  const sampled = catalog.search('', { type: 'dataset', hasSampleData: true })
  expect(sampled.every((p) => p.hasSampleData === true)).toBe(true)
  const trialApis = catalog.search('', { type: 'api', hasTrialApi: true })
  expect(trialApis.every((p) => p.hasTrialApi === true)).toBe(true)
})
```

`DatasetDetail` 测试或 ProductDetail：无样例数据集 `prod-space-port-throughput` 的 samples tab 文案为「当前无样例」，不是「上架审核通过后提供脱敏样例」。

Summary：自有商品用户芯片含「万联易达可信空间」，不含「自有」。

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd external-app-vue3 && npx vitest run src/stores/catalog.test.ts`

Expected: FAIL，search 不认识新 opts。

- [ ] **Step 3: Write minimal implementation**

扩展 `search`：

```ts
search(query: string, opts?: {
  type?: string
  dealChannel?: string
  scenario?: string
  origin?: string
  spaceName?: string
  hasSampleData?: boolean
  hasTrialApi?: boolean
  spaceKind?: 'owned' | 'federated'
}): Product[]
```

`spaceKind` 只给运营筛；SearchResult 用户筛：空间名称（有空间商品时列出去重后的 `spaceName`）、类型为数据集时出「有样例」、类型为 API 时出「有试用接口」。

`ProductSummaryCard` 在自由 tags 之前渲染 `publicSpaceChips(product)`。

`DatasetDetail` samples：

```vue
<template v-if="product.hasSampleData && detail.sampleRows.length > 0">...</template>
<div v-else class="py-8 text-center text-[13px] text-slate-400">当前无样例</div>
```

未登录也能看：不要包 `user.loggedIn`。API 详情继续展示 `requestExample` / `responseExample`，不要加调试台。

运营 ResourceEdit 空间商品区增加只读「来源类型：自有/互联」。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd external-app-vue3 && npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/stores/catalog.ts external-app-vue3/src/stores/catalog.test.ts \
  external-app-vue3/src/components/mobile/product-detail/ProductSummaryCard.vue \
  external-app-vue3/src/components/mobile/product-detail/DatasetDetail.vue \
  external-app-vue3/src/views/portal/components/PortalDatasetDetail.vue \
  external-app-vue3/src/views/mobile/SearchResult.vue \
  external-app-vue3/src/views/portal/PortalSearch.vue \
  external-app-vue3/src/views/admin/ResourceEdit.vue \
  external-app-vue3/src/components/mobile/ProductCard.vue
git commit -m "$(cat <<'EOF'
feat(commerce): 空间商品支持来源与样例筛选

EOF
)"
```

---

### Task 6: 运营意向单工作台

**Files:**
- Create: `external-app-vue3/src/views/admin/SpaceIntentList.vue`
- Create: `external-app-vue3/src/views/admin/SpaceIntentDetail.vue`
- Create: `external-app-vue3/src/views/admin/SpaceIntentDetail.test.ts`
- Modify: `external-app-vue3/src/router/index.ts`
- Modify: `external-app-vue3/src/layouts/AdminShell.vue`（运营管理增加「空间意向单」）

**Interfaces:**
- Consumes: store 全部 actions、`OPS_STATUS_LABELS`、`spaceKind`
- Produces: `/admin/space-intents`、`/admin/space-intents/:id`；详情「去空间处理」`router.push({ name: 'space-bridge', params: { id: productId }, query: { intent: 'ops-' + id }})`。无企业时隐藏该按钮。

- [ ] **Step 1: Write the failing test**

`SpaceIntentDetail.test.ts`：pinia 里先 `submit` 一条个人 API 意向 → mount 详情 → 可见「待领取」→ 点领取 → 点确认企业（用 `useUserStore().completeEnterpriseAuth()` 后的 `enterprise.id`）→ 「去空间处理」出现 → `markSpaceDeal` 后面试按钮「回填空间成交」把单变成已完成。数据集单回填后状态是待接入交付，完成接入按钮才出现。

无企业时「去空间处理」不渲染（`data-testid="go-space-ops"` 不存在）。

- [ ] **Step 2: Run test to verify it fails**

Run: `cd external-app-vue3 && npx vitest run src/views/admin/SpaceIntentDetail.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

列表：筛 opsStatus、spaceKind（通过商品 `catalog.byId`）、空间名称。不要和 TrialsLeads 混页。

详情动作按钮按当前状态露出，文案用 `OPS_STATUS_LABELS`。关闭必须填原因。

「去空间处理」是新窗口/路由到现有 SpaceBridge，失败也没关系，原型只要入口在。不要在用户商品详情恢复该入口。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd external-app-vue3 && npx vitest run src/views/admin/SpaceIntentDetail.test.ts && npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/views/admin/SpaceIntentList.vue \
  external-app-vue3/src/views/admin/SpaceIntentDetail.vue \
  external-app-vue3/src/views/admin/SpaceIntentDetail.test.ts \
  external-app-vue3/src/router/index.ts \
  external-app-vue3/src/layouts/AdminShell.vue
git commit -m "$(cat <<'EOF'
feat(commerce): 增加空间意向单运营工作台

EOF
)"
```

---

### Task 7: 文档与演示口径同步

**Files:**
- Modify: `docs/product/2026-07-31-对外APP找数买数用数-产品规划-简明版.md`（§4.2 购买方式、§4.6 买后使用、§5.2 购买与交易、§9 演示路线第 1/5 点）
- Modify: `docs/product/2026-07-31-对外APP找数买数用数-产品规划.md`（§3.1、§3.5 原则里「跳转可信空间」、可信空间购买场景）
- Modify: `docs/product/2026-08-03-对外APP找数买数用数-完整模块PRD.md`（A06、S06、F6 整节改意向单；F1-05/F2-08 标签；验收「未认证个人无法进入空间成交」改为「未落到认证企业不能空间成交」）
- Modify: `docs/product/2026-08-03-对外APP找数买数用数-功能说明PRD.md`（搜索「前往」「跳转空间购买」同步）
- Modify: `docs/product/version-index.md` 加一行 2026-08-24 变更摘要
- Modify: `external-app-vue3/README.md` 演示链路 3、4 改为意向单；可信空间闭环改为运营代办
- Modify: `docs/superpowers/specs/2026-08-24-find-buy-space-intent-and-tags-design.md` 状态改为「原型已按计划落地」仅当 Task 1–6 完成

产品文档用产品语言，不写类型名和文件路径。必须出现：

- 主按钮「提交意向单」
- 自有空间名称「万联易达可信空间」
- 数据集有无样例、API 有无试用接口
- APP 不展示自有/互联
- 数据集接到本平台用数；API 仍在空间使用

- [ ] **Step 1: 改规划简明版购买表**

把「可信空间数据集/API / APP 展示 / 可信空间购买」改成「APP 提交意向单，运营到空间代办成交」。交付写清数据集回本平台。

- [ ] **Step 2: 改完整模块 PRD F6**

F6 标题改为「空间商品意向与代办成交」。删除「跳转前校验…生成短期购买承接入口并跳转」作为用户需求。运营「去空间处理」可保留一句。

- [ ] **Step 3: 改 README 演示**

`/#/app/product/prod-qualification-api`：提交意向单，不要写跳空间购买。补 `/#/admin/space-intents` 运营领取。

- [ ] **Step 4: Commit docs**

```bash
git add -f docs/product/2026-07-31-对外APP找数买数用数-产品规划-简明版.md \
  docs/product/2026-07-31-对外APP找数买数用数-产品规划.md \
  docs/product/2026-08-03-对外APP找数买数用数-完整模块PRD.md \
  docs/product/2026-08-03-对外APP找数买数用数-功能说明PRD.md \
  docs/product/version-index.md \
  docs/superpowers/specs/2026-08-24-find-buy-space-intent-and-tags-design.md \
  external-app-vue3/README.md
git commit -m "$(cat <<'EOF'
docs(search): 同步空间意向单与标签产品口径

EOF
)"
```

---

## Self-review

1. **Spec coverage**
   - 用户不跳转购买 → Task 1 + 4
   - 三类标签与筛选、APP 不展示自有/互联 → Task 2 + 5
   - 样例未登录可看、无样例空态、API 不真调 → Task 5
   - 个人可提交、须认证企业才能空间成交 → Task 3
   - 用户三档 / 运营六档 → Task 1 + 3 + 4 + 6
   - 数据集接入本平台、API 只记结果 → Task 3 + 6
   - 万联易达命名 → Task 2 + 7
   - 意向单 ≠ 需求提报 → Task 3（独立 store）
   - 文档同步 → Task 7

2. **Placeholder scan:** 无 TBD。Task 2 写明了现有空间商品 id 和新增 id。

3. **Type consistency:** `SpaceIntentOpsStatus` / `submit_space_intent` / `OWNED_SPACE_NAME` 全计划共用。

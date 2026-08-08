# 我的中心壳重构（买数 / 我购买的数据）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `external-app-vue3` 落地统一「我的」壳：一级入口与「我的订单 / 我的数据」同级；真内容仅填「买数」与「我购买的数据」；移动端对齐产品截图，PC 用左栏一级 + 右栏内容。

**Architecture:** 抽出 `mineQuery` 解析/兼容层 + `MineShell` 共享壳（`layout: mobile | portal`），内容拆为 `OrdersPanel` / `DataPanel` / `BuyDataOrders` / `PurchasedData` / `PlaceholderPanel`。`Mine.vue` / `PortalMine.vue` 变薄壳组装页。状态筛仍为本地 state；`orderTab` 专指 VIP|买数|看数 品类 Tab。

**Tech Stack:** Vue 3 + Vue Router + Pinia + Vitest + `@vue/test-utils` + Tailwind（现有 `external-app-vue3`）

**Spec:** `docs/superpowers/specs/2026-08-08-mine-shell-find-buy-design.md`

## Global Constraints

- 范围仅 `external-app-vue3` 的 `/app/mine`、`/portal/mine`；不改内部 React「我的」。
- 原型默认入口：`menu=orders&orderTab=buy`；文档备注正式规划可能改为 VIP。
- 非主责入口/Tab 只做壳 + 统一占位文案：`该模块由其它产品负责`。
- 买数列表仅 `productType === 'dataset'`（含空间侧 dataset）；去掉买数区内「商品类型」筛选。
- 保留现有状态/主体/渠道筛选；Portal 额外经办人/时间/导出保留。
- 路由仍用现 path + query；必须兼容 legacy `tab=orders|data|我的数据`。
- 占位文案与 data-testid 命名保持稳定，便于测试。

## File Structure

| 文件 | 职责 |
|------|------|
| `external-app-vue3/src/domain/mineQuery.ts` | menu/orderTab/dataTab 类型、legacy 映射、build/replace query |
| `external-app-vue3/src/domain/mineQuery.test.ts` | query 解析单测 |
| `external-app-vue3/src/composables/useMineOrders.ts` | 共享订单投影 + 买数过滤（状态/主体/渠道） |
| `external-app-vue3/src/components/mine/PlaceholderPanel.vue` | 统一占位 |
| `external-app-vue3/src/components/mine/BuyDataOrders.vue` | 买数订单列表 UI（移动/门户通过 props 区分路径与扩展筛） |
| `external-app-vue3/src/components/mine/PurchasedData.vue` | 我购买的数据权益列表 |
| `external-app-vue3/src/components/mine/OrdersPanel.vue` | 订单二级 Tab + 插槽内容 |
| `external-app-vue3/src/components/mine/DataPanel.vue` | 数据二级 Tab + 插槽内容 |
| `external-app-vue3/src/components/mine/MineShell.vue` | 用户头区 + 一级入口 + 内容槽 + query 同步 |
| `external-app-vue3/src/views/mobile/Mine.vue` | Phone 组装：MobileHeader + MineShell layout=mobile |
| `external-app-vue3/src/views/portal/PortalMine.vue` | Portal 组装：MineShell layout=portal |
| 深链文件 | DatasetPayment / ProductDetail / PortalProductDetail / MineEnterprise / PortalBills / DatasetCheckout 等回跳 query |
| 测试 | `DatasetAccountViews.test.ts`、`TrustedSpaceViews.test.ts` 更新断言 |

---

### Task 1: mineQuery 解析与兼容层

**Files:**
- Create: `external-app-vue3/src/domain/mineQuery.ts`
- Create: `external-app-vue3/src/domain/mineQuery.test.ts`

**Interfaces:**
- Consumes: Vue Router `LocationQuery`
- Produces:
  - `MineMenu = 'orders' | 'data' | 'vip' | 'messages' | 'favorites' | 'profile'`
  - `OrderTab = 'vip' | 'buy' | 'view'`
  - `DataTab = 'purchased' | 'produced'`
  - `MineQueryState { menu, orderTab, dataTab, subject?: 'personal' | 'enterprise' }`
  - `parseMineQuery(query): MineQueryState`
  - `mineQueryPatch(state: Partial<MineQueryState>, currentQuery): Record<string, string | undefined>`

- [ ] **Step 1: 写失败单测**

```ts
import { describe, expect, it } from 'vitest'
import { parseMineQuery, mineQueryPatch } from './mineQuery'

describe('mineQuery', () => {
  it('defaults to orders/buy for empty query', () => {
    expect(parseMineQuery({})).toEqual({
      menu: 'orders',
      orderTab: 'buy',
      dataTab: 'purchased'
    })
  })

  it('maps legacy tab=我的数据 to data/purchased', () => {
    expect(parseMineQuery({ tab: '我的数据' })).toMatchObject({
      menu: 'data',
      dataTab: 'purchased'
    })
  })

  it('maps legacy tab=data and tab=orders', () => {
    expect(parseMineQuery({ tab: 'data' }).menu).toBe('data')
    expect(parseMineQuery({ tab: 'orders' }).menu).toBe('orders')
  })

  it('prefers explicit menu/orderTab/dataTab over legacy tab', () => {
    expect(parseMineQuery({
      tab: 'data',
      menu: 'orders',
      orderTab: 'view'
    })).toMatchObject({ menu: 'orders', orderTab: 'view' })
  })

  it('builds patch that writes menu/orderTab and clears conflicting tab when needed', () => {
    const patch = mineQueryPatch(
      { menu: 'data', dataTab: 'purchased' },
      { tab: 'orders', subject: 'enterprise' }
    )
    expect(patch.menu).toBe('data')
    expect(patch.dataTab).toBe('purchased')
    expect(patch.tab).toBeUndefined()
    expect(patch.subject).toBe('enterprise')
  })
})
```

- [ ] **Step 2: 跑测确认失败**

Run:

```bash
cd external-app-vue3 && npm test -- src/domain/mineQuery.test.ts
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 mineQuery**

```ts
import type { LocationQuery, LocationQueryValue } from 'vue-router'

export type MineMenu = 'orders' | 'data' | 'vip' | 'messages' | 'favorites' | 'profile'
export type OrderTab = 'vip' | 'buy' | 'view'
export type DataTab = 'purchased' | 'produced'
export type MineSubject = 'personal' | 'enterprise'

export interface MineQueryState {
  menu: MineMenu
  orderTab: OrderTab
  dataTab: DataTab
  subject?: MineSubject
}

const MENUS: MineMenu[] = ['orders', 'data', 'vip', 'messages', 'favorites', 'profile']
const ORDER_TABS: OrderTab[] = ['vip', 'buy', 'view']
const DATA_TABS: DataTab[] = ['purchased', 'produced']

function first(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '')
  return value == null ? '' : String(value)
}

function asMenu(value: string): MineMenu | undefined {
  return MENUS.includes(value as MineMenu) ? (value as MineMenu) : undefined
}

function asOrderTab(value: string): OrderTab | undefined {
  return ORDER_TABS.includes(value as OrderTab) ? (value as OrderTab) : undefined
}

function asDataTab(value: string): DataTab | undefined {
  return DATA_TABS.includes(value as DataTab) ? (value as DataTab) : undefined
}

export function parseMineQuery(query: LocationQuery): MineQueryState {
  const menuFromQuery = asMenu(first(query.menu))
  const legacyTab = first(query.tab)
  let menu: MineMenu = menuFromQuery ?? 'orders'
  if (!menuFromQuery) {
    if (legacyTab === 'data' || legacyTab === '我的数据') menu = 'data'
    else if (legacyTab === '求上架') menu = 'favorites' // 显式落到占位入口，避免静默当 orders
    else menu = 'orders'
  }

  const orderTab = asOrderTab(first(query.orderTab)) ?? 'buy'
  const dataTab = asDataTab(first(query.dataTab)) ?? 'purchased'
  const subjectRaw = first(query.subject)
  const subject = subjectRaw === 'personal' || subjectRaw === 'enterprise' ? subjectRaw : undefined

  return { menu, orderTab, dataTab, subject }
}

export function mineQueryPatch(
  next: Partial<MineQueryState>,
  currentQuery: LocationQuery
): Record<string, string | undefined> {
  const current = parseMineQuery(currentQuery)
  const merged: MineQueryState = {
    menu: next.menu ?? current.menu,
    orderTab: next.orderTab ?? current.orderTab,
    dataTab: next.dataTab ?? current.dataTab,
    subject: next.subject !== undefined ? next.subject : current.subject
  }

  const patch: Record<string, string | undefined> = {
    ...Object.fromEntries(
      Object.entries(currentQuery).map(([k, v]) => [k, Array.isArray(v) ? String(v[0] ?? '') : v == null ? undefined : String(v)])
    ),
    menu: merged.menu,
    orderTab: merged.menu === 'orders' ? merged.orderTab : undefined,
    dataTab: merged.menu === 'data' ? merged.dataTab : undefined,
    tab: undefined,
    subject: merged.subject
  }
  return patch
}
```

- [ ] **Step 4: 跑测确认通过**

Run:

```bash
cd external-app-vue3 && npm test -- src/domain/mineQuery.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/domain/mineQuery.ts external-app-vue3/src/domain/mineQuery.test.ts
git commit -m "feat(external-app): 增加我的中心 query 解析与兼容层"
```

---

### Task 2: PlaceholderPanel

**Files:**
- Create: `external-app-vue3/src/components/mine/PlaceholderPanel.vue`
- Create: `external-app-vue3/src/components/mine/PlaceholderPanel.test.ts`

**Interfaces:**
- Consumes: optional `title?: string`
- Produces: 文案固定为「该模块由其它产品负责」；根节点 `data-testid="mine-placeholder"`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlaceholderPanel from './PlaceholderPanel.vue'

describe('PlaceholderPanel', () => {
  it('renders unified ownership copy', () => {
    const wrapper = mount(PlaceholderPanel, { props: { title: 'VIP' } })
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
    expect(wrapper.text()).toContain('VIP')
  })
})
```

- [ ] **Step 2: 跑测确认失败**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/PlaceholderPanel.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现组件**

```vue
<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div data-testid="mine-placeholder" class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
    <div v-if="title" class="text-[13px] font-medium text-slate-700">{{ title }}</div>
    <p class="mt-2 text-[12px] text-slate-500">该模块由其它产品负责</p>
  </div>
</template>
```

- [ ] **Step 4: 跑测确认通过**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/PlaceholderPanel.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/components/mine/PlaceholderPanel.vue external-app-vue3/src/components/mine/PlaceholderPanel.test.ts
git commit -m "feat(external-app): 增加我的中心占位面板"
```

---

### Task 3: useMineOrders + BuyDataOrders（买数真内容）

**Files:**
- Create: `external-app-vue3/src/composables/useMineOrders.ts`
- Create: `external-app-vue3/src/components/mine/BuyDataOrders.vue`
- Create: `external-app-vue3/src/components/mine/BuyDataOrders.test.ts`
- Reference: `external-app-vue3/src/views/mobile/Mine.vue`（迁出订单列表与筛选 UI）
- Reference: `external-app-vue3/src/domain/myCenter.ts`

**Interfaces:**
- Consumes: `useUserStore` / `useOrderStore` / `useSpaceOrderStore` / `useCatalogStore`；`MyOrderFilter`；`subject` from parent
- Produces:
  - `useMineOrders()` → `{ allOrders, filterBuyDataOrders(opts) }`
  - `BuyDataOrders` props：
    - `variant: 'mobile' | 'portal'`
    - `subjectFilter` + `update:subjectFilter`
    - portal-only：`operatorFilter` / `timeFilter` / `export` 由 Portal 包装层传入 slots 或额外 props
  - 强制 `productType === 'dataset'`；**不渲染商品类型 select**
  - 保留 `data-testid="my-orders"`（mobile）与 portal 企业上下文 testid

- [ ] **Step 1: 写失败测试（买数只含 dataset）**

在 `BuyDataOrders.test.ts` 用内存 router + pinia seed，挂载组件后：

```ts
it('lists only dataset buy-data orders and keeps status filters', async () => {
  // mount BuyDataOrders variant=mobile with seeded mixed orders
  expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
  expect(wrapper.text()).not.toContain('标准VIP') // 会员单不应出现
  // 点击「已完成」chip 后仍只见 dataset
})
```

（实现时用现有 `seedOrders` / store；断言以当前 seed 里可见的 dataset 订单 id 为准，如 `order-enterprise-dataset-001`。）

- [ ] **Step 2: 跑测确认失败**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/BuyDataOrders.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现 composable**

```ts
// useMineOrders.ts — 从 Mine.vue allOrders / filteredOrders 迁出
// filterBuyDataOrders: 在原过滤上追加
//   card.productType === 'dataset'
// 去掉 productTypeFilter 参数
```

完整过滤逻辑复制自 `Mine.vue` L60–86，删除 `productTypeFilter` 分支，改为恒等 `productType === 'dataset'`。

- [ ] **Step 4: 实现 BuyDataOrders**

从 `Mine.vue` template L180–253 迁入：

- 状态 chips、主体 segmented、渠道 select、API 账单入口、订单卡片、EmptyState
- **删除**商品类型 `<select>`
- `goData` emit `view-purchased-data`；`pay` / `goProduct` / `openBills` 通过 props 回调注入路径前缀（`/app` vs `/portal`）

Portal 扩展（经办人/时间/导出）以 `variant==='portal'` 条件块迁自 `PortalMine.vue`，保留：

- `data-testid="portal-enterprise-order-filter-context"`
- `data-testid="export-enterprise-orders"`
- `aria-label="经办人筛选"`

- [ ] **Step 5: 跑测确认通过**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/BuyDataOrders.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add external-app-vue3/src/composables/useMineOrders.ts external-app-vue3/src/components/mine/BuyDataOrders.vue external-app-vue3/src/components/mine/BuyDataOrders.test.ts
git commit -m "feat(external-app): 抽出买数订单列表与共享过滤"
```

---

### Task 4: PurchasedData + DataPanel

**Files:**
- Create: `external-app-vue3/src/components/mine/PurchasedData.vue`
- Create: `external-app-vue3/src/components/mine/DataPanel.vue`
- Create: `external-app-vue3/src/components/mine/DataPanel.test.ts`
- Reference: `Mine.vue` L255–285；`PortalMine.vue` 对应 data 区

**Interfaces:**
- Consumes: `useEntitlementStore.visibleDatasetEntitlements`、`useDatasetCommerceStore`、`useCatalogStore`
- Produces:
  - `PurchasedData`：`data-testid="my-datasets"`；portal 条目保留 `portal-dataset-entitlement` / `portal-renew-dataset`
  - `DataPanel` props：`dataTab: DataTab`、`update:dataTab`；`variant`
  - `dataTab==='purchased'` → PurchasedData；`produced` → PlaceholderPanel title="我生产的数据"

- [ ] **Step 1: 写失败测试**

```ts
it('shows purchased data and placeholder for produced tab', async () => {
  const wrapper = mount(DataPanel, {
    props: { dataTab: 'purchased', variant: 'mobile' },
    global: { plugins: [pinia, router] }
  })
  expect(wrapper.find('[data-testid="my-datasets"]').exists()).toBe(true)

  await wrapper.setProps({ dataTab: 'produced' })
  expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
})
```

- [ ] **Step 2: 跑测确认失败**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/DataPanel.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现 PurchasedData 与 DataPanel**

- 将现有权益卡片/说明条迁入 `PurchasedData.vue`
- `DataPanel` 顶部二级 Tab：

```vue
<button data-testid="data-tab-purchased" ...>我购买的数据</button>
<button data-testid="data-tab-produced" ...>我生产的数据</button>
```

- [ ] **Step 4: 跑测确认通过**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/DataPanel.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/components/mine/PurchasedData.vue external-app-vue3/src/components/mine/DataPanel.vue external-app-vue3/src/components/mine/DataPanel.test.ts
git commit -m "feat(external-app): 抽出我购买的数据与数据面板"
```

---

### Task 5: OrdersPanel（VIP / 买数 / 看数）

**Files:**
- Create: `external-app-vue3/src/components/mine/OrdersPanel.vue`
- Create: `external-app-vue3/src/components/mine/OrdersPanel.test.ts`

**Interfaces:**
- Consumes: `orderTab: OrderTab`、BuyDataOrders、PlaceholderPanel
- Produces: 二级 Tab UI；`orderTab==='buy'` 渲染 BuyDataOrders；`vip`/`view` 占位

- [ ] **Step 1: 写失败测试**

```ts
it('switches between buy content and placeholders', async () => {
  const wrapper = mount(OrdersPanel, { props: { orderTab: 'buy', variant: 'mobile' }, ... })
  expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
  await wrapper.get('[data-testid="order-tab-vip"]').trigger('click')
  expect(wrapper.emitted('update:orderTab')?.[0]).toEqual(['vip'])
})
```

- [ ] **Step 2: 跑测确认失败**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/OrdersPanel.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现 OrdersPanel**

```vue
<script setup lang="ts">
import type { OrderTab } from '@/domain/mineQuery'
import BuyDataOrders from './BuyDataOrders.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'

const props = defineProps<{ orderTab: OrderTab; variant: 'mobile' | 'portal' }>()
const emit = defineEmits<{ 'update:orderTab': [OrderTab] }>()
</script>

<template>
  <div>
    <div class="flex gap-4 border-b border-slate-100 px-1 text-[13px]">
      <button data-testid="order-tab-vip" @click="emit('update:orderTab', 'vip')">VIP</button>
      <button data-testid="order-tab-buy" @click="emit('update:orderTab', 'buy')">买数</button>
      <button data-testid="order-tab-view" @click="emit('update:orderTab', 'view')">看数</button>
    </div>
    <BuyDataOrders v-if="orderTab === 'buy'" :variant="variant" />
    <PlaceholderPanel v-else-if="orderTab === 'vip'" title="VIP" class="mt-3" />
    <PlaceholderPanel v-else title="看数" class="mt-3" />
  </div>
</template>
```

（BuyDataOrders 的 subject/回调 props 在 Task 6 组装时由 MineShell 注入；若类型需要，本任务先写齐 props 透传。）

- [ ] **Step 4: 跑测确认通过**

Run:

```bash
cd external-app-vue3 && npm test -- src/components/mine/OrdersPanel.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/components/mine/OrdersPanel.vue external-app-vue3/src/components/mine/OrdersPanel.test.ts
git commit -m "feat(external-app): 增加订单品类 Tab 面板"
```

---

### Task 6: MineShell（mobile）并改写 Mine.vue

**Files:**
- Create: `external-app-vue3/src/components/mine/MineShell.vue`
- Modify: `external-app-vue3/src/views/mobile/Mine.vue`
- Modify: `external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts`
- Modify: `external-app-vue3/src/views/mobile/DatasetAccountViews.test.ts`

**Interfaces:**
- Consumes: `parseMineQuery` / `mineQueryPatch`；OrdersPanel；DataPanel；PlaceholderPanel
- Produces:
  - props：`layout: 'mobile' | 'portal'`
  - 一级入口：成为VIP / 我的订单 / 消息中心 / 我的收藏 / 个人信息 / 我的数据
  - 默认无 query 时 `orders+buy`
  - mobile：截图风格头区宫格；保留卖家中心入口 `seller-center-entry`、企业中心按钮
  - `data-testid="mine-menu-orders"` / `mine-menu-data` 等

- [ ] **Step 1: 更新失败断言（入口结构）**

将 `TrustedSpaceViews.test.ts` 中：

```ts
it('uses one common Mine entry with only orders and data tabs', ...)
```

改为：

```ts
it('exposes orders/data as primary mine menus with buy default', async () => {
  const wrapper = await mountMine()
  expect(wrapper.find('[data-testid="mine-menu-orders"]').exists()).toBe(true)
  expect(wrapper.find('[data-testid="mine-menu-data"]').exists()).toBe(true)
  expect(wrapper.find('[data-testid="order-tab-buy"]').exists()).toBe(true)
  expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
})
```

保留企业订单深链用例：`/app/mine?tab=orders&subject=enterprise&from=enterprise-center` 仍应显示企业过滤条与 dataset 订单。

`DatasetAccountViews`：`/app/mine?tab=我的数据` 仍应命中 `[data-testid="my-datasets"]`。

- [ ] **Step 2: 跑相关测确认失败/需改**

Run:

```bash
cd external-app-vue3 && npm test -- src/views/mobile/TrustedSpaceViews.test.ts src/views/mobile/DatasetAccountViews.test.ts
```

Expected: 旧 Tab 断言 FAIL（或按 Step 1 改完后在实现前仍因缺 testid FAIL）

- [ ] **Step 3: 实现 MineShell + 薄 Mine.vue**

`Mine.vue` 目标结构：

```vue
<script setup lang="ts">
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import MineShell from '@/components/mine/MineShell.vue'
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="我的" :show-back="false" />
    <MineShell layout="mobile" />
  </div>
</template>
```

`MineShell` 内：

1. 读 `route.query` → `parseMineQuery`
2. 切换入口时 `router.replace({ query: mineQueryPatch(...) })`
3. `menu==='orders'` → OrdersPanel；`menu==='data'` → DataPanel；其它 → PlaceholderPanel
4. mobile 头区：用户名、手机/企业摘要、会员徽章（可用现有 user store 字段）、6 宫格入口
5. 卖家入口保留在 mobile 头区下方

- [ ] **Step 4: 跑测确认通过**

Run:

```bash
cd external-app-vue3 && npm test -- src/views/mobile/TrustedSpaceViews.test.ts src/views/mobile/DatasetAccountViews.test.ts
```

Expected: PASS（与 mine 相关用例）

- [ ] **Step 5: Commit**

```bash
git add external-app-vue3/src/components/mine/MineShell.vue external-app-vue3/src/views/mobile/Mine.vue external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts external-app-vue3/src/views/mobile/DatasetAccountViews.test.ts
git commit -m "feat(external-app): 移动端接入统一我的中心壳"
```

---

### Task 7: Portal 布局 A + 改写 PortalMine.vue

**Files:**
- Modify: `external-app-vue3/src/components/mine/MineShell.vue`（补 portal 左栏布局）
- Modify: `external-app-vue3/src/views/portal/PortalMine.vue`
- Modify: `external-app-vue3/src/views/mobile/DatasetAccountViews.test.ts`（portal 用例）

**Interfaces:**
- Consumes: 同 Task 6
- Produces:
  - `layout==='portal'`：左栏用户卡 + 一级入口列表；右栏二级 Tab + 内容
  - 保留 `portal-my-orders-tab` / `portal-my-data-tab`（可挂在一级入口按钮上）以免破坏现有 portal 测试；或同步改测试为 `mine-menu-*`

- [ ] **Step 1: 调整 portal 测试选择器（若改 testid）**

优先兼容：一级「我的订单」按钮同时带 `data-testid="portal-my-orders-tab"` 与 `mine-menu-orders`。

- [ ] **Step 2: 实现 portal 分支并瘦身 PortalMine.vue**

```vue
<script setup lang="ts">
import MineShell from '@/components/mine/MineShell.vue'
</script>
<template>
  <MineShell layout="portal" />
</template>
```

Portal 特有：企业中心链到 `/portal/enterprise`；账单 `/portal/bills`；导出企业订单逻辑留在 BuyDataOrders portal 分支。

- [ ] **Step 3: 跑 portal 相关测**

Run:

```bash
cd external-app-vue3 && npm test -- src/views/mobile/DatasetAccountViews.test.ts
```

Expected: PASS（含 portal my data / enterprise filters）

- [ ] **Step 4: Commit**

```bash
git add external-app-vue3/src/components/mine/MineShell.vue external-app-vue3/src/views/portal/PortalMine.vue external-app-vue3/src/views/mobile/DatasetAccountViews.test.ts
git commit -m "feat(external-app): 门户左栏布局接入我的中心壳"
```

---

### Task 8: 深链回跳统一到新 query

**Files:**
- Modify: `external-app-vue3/src/views/shared/DatasetPayment.vue`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`
- Modify: `external-app-vue3/src/views/portal/PortalProductDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/MineEnterprise.vue`
- Modify: `external-app-vue3/src/views/portal/PortalBills.vue`
- Modify: `external-app-vue3/src/views/shared/DatasetCheckout.vue`
- Optional: `external-app-vue3/src/views/portal/PortalEnterprise.vue`（补 menu=orders）

**Interfaces:**
- Produces: 新深链（legacy 仍可由 parse 兼容，但新代码写新参数）

| 场景 | 新目标 |
|------|--------|
| 查看我的数据 / 支付成功 | `?menu=data&dataTab=purchased` |
| 我的订单 | `?menu=orders&orderTab=buy` |
| 企业订单 | `?menu=orders&orderTab=buy&subject=enterprise` |
| listing_progress / 求上架 | `?menu=favorites`（占位）或保持 tab 由 parse 映射 |

- [ ] **Step 1: 改 DatasetPayment.goMyData**

```ts
function goMyData() {
  router.push({
    path: isPortal.value ? '/portal/mine' : '/app/mine',
    query: { menu: 'data', dataTab: 'purchased' }
  })
}
```

- [ ] **Step 2: 同步其它入口**

`ProductDetail` / `PortalProductDetail` 的 dataset「查看我的数据」同上。  
`MineEnterprise.goMyData` → `menu=data&dataTab=purchased`。  
`MineEnterprise.goEnterpriseOrders` → `menu=orders&orderTab=buy&subject=enterprise&from=enterprise-center`。  
`PortalBills` 返回 → `menu=orders&orderTab=buy`。  
`DatasetCheckout` portal 取消/返回订单 → `menu=orders&orderTab=buy`。

- [ ] **Step 3: 跑全量相关测 + commerce 测若有**

Run:

```bash
cd external-app-vue3 && npm test -- src/views/mobile/DatasetAccountViews.test.ts src/views/mobile/TrustedSpaceViews.test.ts src/views/shared/DatasetCommerceViews.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add external-app-vue3/src/views/shared/DatasetPayment.vue external-app-vue3/src/views/mobile/ProductDetail.vue external-app-vue3/src/views/portal/PortalProductDetail.vue external-app-vue3/src/views/mobile/MineEnterprise.vue external-app-vue3/src/views/portal/PortalBills.vue external-app-vue3/src/views/shared/DatasetCheckout.vue
git commit -m "fix(external-app): 统一我的中心深链到 menu/dataTab query"
```

---

### Task 9: 验收补测与全量回归

**Files:**
- Modify/Create: `external-app-vue3/src/components/mine/MineShell.test.ts`（可选但推荐）
- Modify: 既有 mine 测试文件

**Interfaces:**
- Produces: 覆盖验收标准 1–7 的自动化断言

- [ ] **Step 1: 补充默认入口与占位切换测**

```ts
it('defaults to buy-data orders', async () => {
  const wrapper = await mountMine({}, '/app/mine')
  expect(wrapper.find('[data-testid="order-tab-buy"]').classes().join('')).toMatch(/brand|font-medium|active/)
  expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
})

it('shows placeholder for VIP menu entry', async () => {
  const wrapper = await mountMine({}, '/app/mine?menu=vip')
  expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
})
```

（active class 断言按实际实现的选中样式调整，避免脆弱匹配。）

- [ ] **Step 2: 全量测试**

Run:

```bash
cd external-app-vue3 && npm test
```

Expected: 全部 PASS

- [ ] **Step 3: 手动冒烟清单（记录在 commit message 或 PR 描述）**

1. 打开 `/app/mine` → 默认买数列表  
2. 切「我的数据」→「我购买的数据」有权益；「我生产的数据」占位  
3. VIP/看数/消息等占位  
4. `/portal/mine` 左栏一级 + 右栏买数  
5. legacy `?tab=我的数据` 仍进已购数据  

- [ ] **Step 4: 更新 spec 状态行**

将 `docs/superpowers/specs/2026-08-08-mine-shell-find-buy-design.md` 状态改为「实现中/已落地」，并 `git add -f`。

- [ ] **Step 5: Commit**

```bash
git add -f docs/superpowers/specs/2026-08-08-mine-shell-find-buy-design.md
git add external-app-vue3/src/components/mine external-app-vue3/src/views
git commit -m "test(external-app): 补齐我的中心壳验收用例并回归"
```

---

## Spec Coverage Self-Check

| Spec 项 | Task |
|---------|------|
| 统一壳 + 一级入口 | Task 6/7 |
| 我的订单→买数真内容 | Task 3/5 |
| 我的数据→我购买的数据 | Task 4 |
| 其它占位 | Task 2/5/6 |
| 移动端截图风 | Task 6 |
| PC 左栏方案 A | Task 7 |
| 默认买数 + 文档备注 | Task 1/6；备注已在 spec |
| legacy query | Task 1/8/9 |
| 深链到我购买的数据 | Task 8 |
| 去掉买数商品类型筛 | Task 3 |
| 不改支付主链路 | Task 8 仅回跳 |
| 测试更新 | Task 6/7/9 |

## Placeholder / Consistency Notes

- `orderTab` **不是**状态筛；状态筛继续用 `MyOrderFilter` 本地 ref。
- Portal `portal-my-*-tab` 与 `mine-menu-*` 双 testid，避免一次改爆旧测。
- `tab=求上架` → `menu=favorites` 占位；若产品后续有独立入口再改 mapping。

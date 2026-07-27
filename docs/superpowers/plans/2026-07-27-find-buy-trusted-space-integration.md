# 找数买数与可信空间对接闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Vue 原型中，以可替换的可信空间契约适配层贯通商品同步、认证企业购买、SSO 承接、订单/交付镜像和 API 账单查询，同时补齐 APP 报告的个人/企业购买主体选择。

**Architecture:** 可信空间继续作为商品、交易、授权、交付和账单权威源；APP 将空间数据保存为只读镜像，并将本地展示增强、购买意图、APP 订单和 APP 权益与空间镜像分开。当前由确定性的 mock 适配器实现契约，Pinia Store 负责业务编排，现有集成管线负责验签、幂等、版本、重试、死信和人工修正。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vue Router、Tailwind CSS、Vitest、Vue Test Utils、Vite。

## Global Constraints

- 可信空间数据集和 API 只能由已认证企业购买；空间订单 `ownerId` 必须是企业 ID，经办人单独记录为当前个人账号 ID。
- 可信空间商品、价格、订单、合同/支付、授权、交付和 API 账单以空间事实为准；APP 不创建空间数据访问权益。
- APP 报告支持个人购买和认证企业购买，收银台必须明确选择并再次确认购买主体。
- 企业管理员可查看企业全部空间订单和 API 账单；普通成员只查看本人经办订单及本人应用/凭证用量，且不显示企业总金额。
- APP 只展示、下载空间账单并深链回空间处理疑问；APP 不创建本地账单异议对象。
- mock 原型将最近 30 分钟内成功校验的空间商品快照视为可购买；过期或同步失败时详情可看、购买锁定。
- 重复、旧版本、验签失败或关联不匹配的空间事件不得更新业务镜像。
- 不增加第三方依赖，不建设真实后端、数据库、消息队列或真实可信空间网络调用。
- 保留用户未跟踪文件 `六层次架构梳理.md`，不得暂存、覆盖或删除。

---

## File Structure

### 新建文件

| 文件 | 单一职责 |
| --- | --- |
| `external-app-vue3/src/types/trustedSpace.ts` | 可信空间商品、企业映射、购买意图、订单镜像、账单镜像和事件契约 |
| `external-app-vue3/src/domain/trustedSpacePolicy.ts` | 购买资格、快照新鲜度、订单状态映射与事件推进纯函数 |
| `external-app-vue3/src/domain/trustedSpacePolicy.test.ts` | 纯领域规则测试 |
| `external-app-vue3/src/services/trusted-space/TrustedSpaceAdapter.ts` | 可替换适配器接口和默认实例入口 |
| `external-app-vue3/src/services/trusted-space/mockTrustedSpaceAdapter.ts` | 确定性 mock 适配器 |
| `external-app-vue3/src/services/trusted-space/mockTrustedSpaceAdapter.test.ts` | 适配器契约测试 |
| `external-app-vue3/src/data/trustedSpace.ts` | 空间商品、企业映射、订单和账单 fixtures |
| `external-app-vue3/src/stores/trustedSpaceCatalog.ts` | 空间商品快照同步和购买前校验 |
| `external-app-vue3/src/stores/trustedSpaceCatalog.test.ts` | 商品同步 Store 测试 |
| `external-app-vue3/src/stores/trustedSpacePurchase.ts` | 企业映射、购买意图和 SSO 深链编排 |
| `external-app-vue3/src/stores/trustedSpacePurchase.test.ts` | 企业购买与购买意图测试 |
| `external-app-vue3/src/stores/spaceOrders.ts` | 空间订单/交付镜像和主动对账 |
| `external-app-vue3/src/stores/spaceOrders.test.ts` | 回调、乱序、对账和权限测试 |
| `external-app-vue3/src/stores/apiUsageBills.ts` | API 账单同步、权限过滤和空间深链 |
| `external-app-vue3/src/stores/apiUsageBills.test.ts` | API 账单 Store 测试 |
| `external-app-vue3/src/views/mobile/ApiUsageBills.vue` | 企业 API 月度账单列表 |
| `external-app-vue3/src/views/mobile/ApiUsageBillDetail.vue` | API 用量/费用明细、下载和空间疑问入口 |
| `external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts` | 空间承接、订单和账单页面测试 |
| `external-app-vue3/src/views/mobile/CheckoutItem.test.ts` | 报告购买主体选择测试 |

### 主要修改文件

| 文件 | 修改目的 |
| --- | --- |
| `external-app-vue3/src/stores/catalog.ts` | 将空间主字段同步与 APP 展示增强分开 |
| `external-app-vue3/src/stores/integration.ts` | 按业务对象隔离事件版本，并驱动订单镜像 |
| `external-app-vue3/src/stores/integration.test.ts` | 覆盖对象级版本、重复、死信和修正 |
| `external-app-vue3/src/stores/orders.ts` | 收口为 APP 自营订单，不再伪造空间订单 |
| `external-app-vue3/src/stores/entitlements.ts` | 保持 APP 报告个人/企业权益发放 |
| `external-app-vue3/src/stores/user.ts` | 提供当前企业成员和角色的一致来源 |
| `external-app-vue3/src/domain/productAccess.ts` | 将空间快照和企业映射纳入购买动作决策 |
| `external-app-vue3/src/views/mobile/ProductDetail.vue` | 展示空间购买锁定原因并创建购买意图 |
| `external-app-vue3/src/views/mobile/SpaceBridge.vue` | 改为 SSO 跳转与返回恢复页 |
| `external-app-vue3/src/views/mobile/Mine.vue` | 分离个人 APP 订单和企业订单视图 |
| `external-app-vue3/src/views/mobile/MineEnterprise.vue` | 增加 API 用量账单入口 |
| `external-app-vue3/src/views/mobile/CheckoutItem.vue` | 增加个人/企业购买主体选择 |
| `external-app-vue3/src/views/admin/ProductCenter.vue` | 展示空间商品同步状态和手动校验 |
| `external-app-vue3/src/views/admin/OrderCenter.vue` | 合并展示 APP 订单和空间订单镜像 |
| `external-app-vue3/src/views/admin/IntegrationGovernance.vue` | 展示业务对象、处理版本、重试和主动对账 |
| `external-app-vue3/src/views/admin/ApprovalIntegration.vue` | 使用空间镜像识别回调/对账异常 |
| `external-app-vue3/src/views/admin/Dashboard.vue` | 使用空间镜像统计回调异常 |
| `external-app-vue3/src/domain/productImpact.ts` | 用统一影响引用纳入 APP 订单与空间订单镜像 |
| `external-app-vue3/src/router/index.ts` | 注册 API 账单列表和详情路由 |
| `external-app-vue3/src/utils/statusMeta.ts` | 增加快照、购买意图和空间订单新状态文案 |
| `external-app-vue3/README.md` | 更新演示链路与验证说明 |

---

### Task 1: 建立可信空间领域契约与纯决策

**Files:**
- Create: `external-app-vue3/src/types/trustedSpace.ts`
- Create: `external-app-vue3/src/domain/trustedSpacePolicy.ts`
- Create: `external-app-vue3/src/domain/trustedSpacePolicy.test.ts`
- Modify: `external-app-vue3/src/utils/statusMeta.ts:42-49`

**Interfaces:**
- Consumes: 现有 `ProductType`、`ProductPrice`、`EnterpriseAuthStatus`。
- Produces:
  - `evaluateTrustedPurchase(input: TrustedPurchaseCheckInput): TrustedPurchaseCheck`
  - `mapSpaceOrderStatus(rawStatus: string): SpaceOrderDisplayStatus`
  - `canApplySpaceOrderEvent(current: SpaceOrderMirror | undefined, incoming: SpaceOrderEvent): boolean`
  - `TrustedProductSnapshot`
  - `EnterpriseSpaceBinding`
  - `SpacePurchaseIntent`
  - `SpaceOrderMirror`
  - `ApiUsageBillMirror`

- [ ] **Step 1: 写购买资格和订单版本的失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { evaluateTrustedPurchase, mapSpaceOrderStatus, canApplySpaceOrderEvent } from './trustedSpacePolicy'
import type { SpaceOrderEvent, SpaceOrderMirror, TrustedProductSnapshot } from '@/types/trustedSpace'

const snapshot = (over: Partial<TrustedProductSnapshot> = {}): TrustedProductSnapshot => ({
  appProductId: 'prod-api',
  spaceProductId: 'sp-prod-api',
  spaceProductNo: 'SPACE-API-1',
  name: '资格核验 API',
  type: 'api',
  provider: '可信空间',
  saleStatus: 'published',
  price: { model: 'quote', unit: '次' },
  currency: 'CNY',
  version: 3,
  spaceUpdatedAt: '2026-07-27T09:00:00.000Z',
  syncedAt: '2026-07-27T09:05:00.000Z',
  syncState: 'current',
  ...over
})

describe('trustedSpacePolicy', () => {
  it('requires authenticated enterprise and an active space binding', () => {
    expect(evaluateTrustedPurchase({
      enterpriseAuthStatus: 'none',
      bindingStatus: 'unbound',
      snapshot: snapshot(),
      now: '2026-07-27T09:10:00.000Z',
      maxAgeMs: 30 * 60 * 1000
    })).toEqual({ allowed: false, reason: 'enterprise_required' })
  })

  it('blocks a stale product snapshot', () => {
    expect(evaluateTrustedPurchase({
      enterpriseAuthStatus: 'authenticated',
      bindingStatus: 'active',
      snapshot: snapshot({ syncedAt: '2026-07-27T08:00:00.000Z' }),
      now: '2026-07-27T09:10:00.000Z',
      maxAgeMs: 30 * 60 * 1000
    })).toEqual({ allowed: false, reason: 'product_stale' })
  })

  it('does not apply a duplicate or older order event', () => {
    const current = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 5,
      displayStatus: 'delivered'
    } as SpaceOrderMirror
    const incoming = { spaceOrderId: 'sp-order-1', eventVersion: 5 } as SpaceOrderEvent
    expect(canApplySpaceOrderEvent(current, incoming)).toBe(false)
  })

  it('does not regress a terminal order even when the incoming version is higher', () => {
    const current = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 5,
      displayStatus: 'delivered'
    } as SpaceOrderMirror
    const incoming = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 6,
      rawStatus: 'PAID'
    } as SpaceOrderEvent
    expect(canApplySpaceOrderEvent(current, incoming)).toBe(false)
  })

  it('does not regress a non-terminal order to an earlier known status', () => {
    const current = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 5,
      displayStatus: 'delivering'
    } as SpaceOrderMirror
    const incoming = {
      spaceOrderId: 'sp-order-1',
      eventVersion: 6,
      rawStatus: 'PAID'
    } as SpaceOrderEvent
    expect(canApplySpaceOrderEvent(current, incoming)).toBe(false)
  })

  it('maps an unknown space status to unknown_processing', () => {
    expect(mapSpaceOrderStatus('SPACE_NEW_STATUS')).toBe('unknown_processing')
  })
})
```

- [ ] **Step 2: 运行领域测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/domain/trustedSpacePolicy.test.ts`

Expected: FAIL，提示 `trustedSpacePolicy` 或 `trustedSpace` 模块不存在。

- [ ] **Step 3: 定义可信空间领域类型**

在 `src/types/trustedSpace.ts` 中定义以下核心形状：

```ts
import type { EnterpriseAuthStatus, ProductPrice, ProductType } from './domain'

export type SnapshotSyncState = 'current' | 'stale' | 'sync_failed' | 'unavailable'
export type SpaceProductSaleStatus = 'published' | 'paused' | 'delisted' | 'unknown'
export type SpaceBindingStatus = 'unbound' | 'pending' | 'active' | 'failed'
export type PurchaseIntentStatus =
  | 'validating' | 'ready' | 'redirected' | 'returned_pending_sync'
  | 'linked' | 'failed' | 'expired'
export type SpaceOrderDisplayStatus =
  | 'accepted' | 'pending_payment' | 'paid' | 'delivering'
  | 'delivered' | 'failed' | 'cancelled' | 'unknown_processing'

export interface TrustedProductSnapshot {
  appProductId: string
  spaceProductId: string
  spaceProductNo: string
  name: string
  type: ProductType
  provider: string
  saleStatus: SpaceProductSaleStatus
  price: ProductPrice
  currency: string
  version: number
  spaceUpdatedAt: string
  syncedAt: string
  syncState: SnapshotSyncState
}

export interface EnterpriseSpaceBinding {
  appEnterpriseId: string
  spaceEnterpriseId?: string
  status: SpaceBindingStatus
  syncedAt?: string
  failureReason?: string
}

export interface SpacePurchaseIntent {
  id: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  spaceProductNo: string
  returnUrl: string
  idempotencyKey: string
  correlationId: string
  status: PurchaseIntentStatus
  createdAt: string
  expiresAt: string
  purchaseUrl?: string
  failureReason?: string
}

export interface SpaceOrderEvent {
  eventId: string
  idempotencyKey: string
  eventVersion: number
  signatureValid: boolean
  spaceOrderId: string
  purchaseIntentId: string
  spaceEnterpriseId: string
  spaceProductNo: string
  rawStatus: string
  amount: number
  currency: string
  occurredAt: string
  deliverySummary?: string
  detailUrl?: string
}

export interface SpaceOrderMirror {
  spaceOrderId: string
  purchaseIntentId: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  spaceProductNo: string
  productName: string
  rawStatus: string
  displayStatus: SpaceOrderDisplayStatus
  amount: number
  currency: string
  eventVersion: number
  spaceUpdatedAt: string
  syncedAt: string
  deliverySummary?: string
  detailUrl?: string
}

export interface ApiUsageBillLine {
  id: string
  date: string
  apiName: string
  appCredentialId: string
  ownerMemberId: string
  calls: number
  successCalls: number
  dataVolume: string
  amount: number
}

export interface ApiUsageBillMirror {
  spaceBillId: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  billingMonth: string
  currency: string
  rawStatus: string
  totalCalls: number
  successCalls: number
  totalAmount: number
  lines: ApiUsageBillLine[]
  version: number
  spaceUpdatedAt: string
  syncedAt: string
  downloadLocator: string
  supportLocator: string
}

export interface TrustedPurchaseCheckInput {
  enterpriseAuthStatus: EnterpriseAuthStatus
  bindingStatus: SpaceBindingStatus
  snapshot?: TrustedProductSnapshot
  now: string
  maxAgeMs: number
}

export type TrustedPurchaseBlockReason =
  | 'enterprise_required' | 'binding_required' | 'product_unavailable'
  | 'product_stale' | 'product_not_for_sale'

export type TrustedPurchaseCheck =
  | { allowed: true }
  | { allowed: false; reason: TrustedPurchaseBlockReason }
```

- [ ] **Step 4: 实现纯决策并补状态文案**

```ts
const knownOrderStatus: Record<string, SpaceOrderDisplayStatus> = {
  ACCEPTED: 'accepted',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

export function mapSpaceOrderStatus(rawStatus: string): SpaceOrderDisplayStatus {
  return knownOrderStatus[rawStatus] ?? 'unknown_processing'
}

export function canApplySpaceOrderEvent(
  current: SpaceOrderMirror | undefined,
  incoming: SpaceOrderEvent
): boolean {
  if (!current) return true
  if (incoming.eventVersion <= current.eventVersion) return false
  const next = mapSpaceOrderStatus(incoming.rawStatus)
  if (['delivered', 'failed', 'cancelled'].includes(current.displayStatus)) {
    return next === current.displayStatus
  }
  if (next === 'unknown_processing' || next === 'failed' || next === 'cancelled') return true
  const rank: Record<Exclude<SpaceOrderDisplayStatus, 'unknown_processing' | 'failed' | 'cancelled'>, number> = {
    accepted: 0,
    pending_payment: 1,
    paid: 2,
    delivering: 3,
    delivered: 4
  }
  const currentRank = rank[current.displayStatus as keyof typeof rank]
  return currentRank === undefined || rank[next] >= currentRank
}
```

`evaluateTrustedPurchase` 按以下固定顺序返回首个阻断原因：企业认证、企业映射、快照存在、同步状态/30 分钟新鲜度、销售状态。向 `statusMeta.ts` 增加 `snapshotSync`、`purchaseIntent` 和新的 `spaceOrder` 字典。

- [ ] **Step 5: 运行测试并确认通过**

Run: `cd external-app-vue3 && npm test -- --run src/domain/trustedSpacePolicy.test.ts`

Expected: PASS，6 个测试全部通过。

- [ ] **Step 6: 提交领域契约**

```bash
git add external-app-vue3/src/types/trustedSpace.ts external-app-vue3/src/domain/trustedSpacePolicy.ts external-app-vue3/src/domain/trustedSpacePolicy.test.ts external-app-vue3/src/utils/statusMeta.ts
git commit -m "feat(trusted-space): define integration domain contracts"
```

---

### Task 2: 建立可替换适配器和确定性 mock

**Files:**
- Create: `external-app-vue3/src/services/trusted-space/TrustedSpaceAdapter.ts`
- Create: `external-app-vue3/src/services/trusted-space/mockTrustedSpaceAdapter.ts`
- Create: `external-app-vue3/src/services/trusted-space/mockTrustedSpaceAdapter.test.ts`
- Create: `external-app-vue3/src/data/trustedSpace.ts`

**Interfaces:**
- Consumes: Task 1 的全部可信空间领域类型。
- Produces:
  - `TrustedSpaceAdapter`
  - `trustedSpaceAdapter`
  - `MockTrustedSpaceAdapter`
  - `seedTrustedProductSnapshots`
  - `seedSpaceOrderRecords`
  - `seedApiUsageBills`

- [ ] **Step 1: 写适配器契约失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { MockTrustedSpaceAdapter } from './mockTrustedSpaceAdapter'

describe('MockTrustedSpaceAdapter', () => {
  it('syncs versioned trusted products', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const result = await adapter.syncProducts()
    expect(result.items.every((item) => item.syncState === 'current')).toBe(true)
    expect(result.items[0].version).toBeGreaterThan(0)
  })

  it('binds an app enterprise and creates a short-lived product link', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const binding = await adapter.ensureEnterpriseBinding('ent-wanlian-logistics')
    const link = await adapter.createPurchaseLink({
      intentId: 'intent-1',
      spaceEnterpriseId: binding.spaceEnterpriseId!,
      operatorMemberId: 'mem-1',
      spaceProductNo: 'SPACE-API-20415',
      returnUrl: '/app/product/prod-qualification-api'
    })
    expect(link.url).toContain('intent=intent-1')
    expect(link.expiresAt).toBe('2026-07-27T10:05:00.000Z')
  })

  it('returns bills and separate download/support links', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const bills = await adapter.listUsageBills('space-ent-wanlian')
    expect(bills[0].lines.length).toBeGreaterThan(0)
    expect(await adapter.createBillSupportLink(bills[0].spaceBillId, '/app/mine/enterprise/bills')).toContain('support')
  })
})
```

- [ ] **Step 2: 运行适配器测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/services/trusted-space/mockTrustedSpaceAdapter.test.ts`

Expected: FAIL，提示适配器模块不存在。

- [ ] **Step 3: 定义适配器接口**

```ts
export interface PurchaseLinkInput {
  intentId: string
  spaceEnterpriseId: string
  operatorMemberId: string
  spaceProductNo: string
  returnUrl: string
}

export interface TrustedSpaceAdapter {
  syncProducts(cursor?: string): Promise<{ items: TrustedProductSnapshot[]; nextCursor?: string }>
  getProduct(spaceProductNo: string): Promise<TrustedProductSnapshot | undefined>
  ensureEnterpriseBinding(appEnterpriseId: string): Promise<EnterpriseSpaceBinding>
  createPurchaseLink(input: PurchaseLinkInput): Promise<{ url: string; expiresAt: string }>
  findOrderByIntent(intentId: string): Promise<SpaceOrderEvent | undefined>
  listUsageBills(spaceEnterpriseId: string): Promise<ApiUsageBillMirror[]>
  createBillDownloadLink(spaceBillId: string): Promise<string>
  createBillSupportLink(spaceBillId: string, returnUrl: string): Promise<string>
}
```

默认导出：

```ts
export const trustedSpaceAdapter: TrustedSpaceAdapter =
  new MockTrustedSpaceAdapter(() => new Date().toISOString())
```

- [ ] **Step 4: 建立 fixtures 与 mock 行为**

`data/trustedSpace.ts` 使用现有三个空间商品编号创建快照；提供一个 `space-ent-wanlian` 企业映射、两个不同经办人的订单和一个 2026-07 账单。账单明细必须同时包含 `mem-1` 与 `mem-2` 的凭证数据，以便验证角色过滤。

`MockTrustedSpaceAdapter` 复制 fixtures，所有返回值均深复制；`createPurchaseLink` 返回带 `intent`、`enterprise`、`product` 和 `returnUrl` 的 mock URL，5 分钟后过期。`findOrderByIntent` 只返回匹配的空间事件，不自动制造 APP 权益。

- [ ] **Step 5: 运行适配器测试和类型检查**

Run: `cd external-app-vue3 && npm test -- --run src/services/trusted-space/mockTrustedSpaceAdapter.test.ts && npm run build`

Expected: 适配器测试 PASS，Vite build 成功。

- [ ] **Step 6: 提交适配器**

```bash
git add external-app-vue3/src/services/trusted-space external-app-vue3/src/data/trustedSpace.ts
git commit -m "feat(trusted-space): add mock contract adapter"
```

---

### Task 3: 接通空间商品同步与购买资格

**Files:**
- Create: `external-app-vue3/src/stores/trustedSpaceCatalog.ts`
- Create: `external-app-vue3/src/stores/trustedSpaceCatalog.test.ts`
- Modify: `external-app-vue3/src/stores/catalog.ts:1-137`
- Modify: `external-app-vue3/src/domain/productAccess.ts:1-90`
- Modify: `external-app-vue3/src/domain/productAccess.test.ts`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue:1-120`
- Modify: `external-app-vue3/src/views/admin/ProductCenter.vue:1-80`

**Interfaces:**
- Consumes: `TrustedSpaceAdapter.syncProducts/getProduct`、`evaluateTrustedPurchase`。
- Produces:
  - `useTrustedSpaceCatalogStore`
  - `syncAll(adapter?: TrustedSpaceAdapter): Promise<void>`
  - `refreshProduct(appProductId: string, adapter?: TrustedSpaceAdapter): Promise<void>`
  - `purchaseCheck(appProductId: string, enterpriseAuthStatus: EnterpriseAuthStatus, bindingStatus: SpaceBindingStatus, now?: string): TrustedPurchaseCheck`

- [ ] **Step 1: 写 Store 同步和过期阻断失败测试**

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'

describe('trustedSpaceCatalog store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('syncs snapshots without overwriting APP enhancements', async () => {
    const store = useTrustedSpaceCatalogStore()
    await store.syncAll(new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z'))
    expect(store.byProductId('prod-qualification-api')?.spaceProductNo).toBe('SPACE-API-20415')
    expect(store.lastSuccessAt).toBe('2026-07-27T10:00:00.000Z')
  })

  it('blocks purchase when the cached snapshot is stale', async () => {
    const store = useTrustedSpaceCatalogStore()
    await store.syncAll(new MockTrustedSpaceAdapter(() => '2026-07-27T09:00:00.000Z'))
    expect(store.purchaseCheck(
      'prod-qualification-api',
      'authenticated',
      'active',
      '2026-07-27T10:00:01.000Z'
    )).toEqual({ allowed: false, reason: 'product_stale' })
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/stores/trustedSpaceCatalog.test.ts`

Expected: FAIL，提示 Store 不存在。

- [ ] **Step 3: 实现空间商品 Store**

Store 状态固定为：

```ts
state: () => ({
  snapshots: [] as TrustedProductSnapshot[],
  cursor: undefined as string | undefined,
  syncing: false,
  lastSuccessAt: undefined as string | undefined,
  error: ''
})
```

`syncAll` 采用空间版本号 upsert；同步失败时保留历史快照并把已有快照标为 `sync_failed`。`refreshProduct` 只更新目标商品。同步成功后调用 `catalog.applyTrustedSnapshot(snapshot)` 更新空间主字段；不得修改 `catalog.enhancements`。

- [ ] **Step 4: 在 Catalog 中增加受控主字段更新**

```ts
applyTrustedSnapshot(snapshot: TrustedProductSnapshot) {
  const product = this.products.find((item) => item.id === snapshot.appProductId)
  if (!product || product.dealChannel !== 'space_purchase') return
  product.name = snapshot.name
  product.provider = snapshot.provider
  product.price = { ...snapshot.price }
  if (snapshot.saleStatus === 'published') product.availability = 'published'
  if (snapshot.saleStatus === 'paused') product.availability = 'paused'
  if (snapshot.saleStatus === 'delisted') product.availability = 'delisted'
  product.spaceProductNo = snapshot.spaceProductNo
  product.spaceSyncedAt = snapshot.syncedAt
}
```

`saleStatus === 'unknown'` 时保留最近一次前台状态，但购买检查必须返回 `product_not_for_sale`；不得把未知状态展示为已下架。

删除旧的 `syncSpaceProducts()` 时间戳伪同步，所有空间同步统一走新 Store。

- [ ] **Step 5: 将购买资格接入商品动作和后台**

扩展 `ProductActionContext`：

```ts
trustedPurchaseCheck?: TrustedPurchaseCheck
```

当空间商品检查失败时，返回禁用主动作：

```ts
const labels: Record<TrustedPurchaseBlockReason, string> = {
  enterprise_required: '认证企业后购买',
  binding_required: '企业信息同步中',
  product_unavailable: '商品信息暂不可用',
  product_stale: '商品信息待更新',
  product_not_for_sale: '暂不可购买'
}
```

`ProductDetail.vue` 读取空间商品 Store 的检查结果。`ProductCenter.vue` 增加同步状态、最近成功时间和“同步空间商品”按钮。

- [ ] **Step 6: 运行 Store、动作和全量测试**

Run: `cd external-app-vue3 && npm test -- --run src/stores/trustedSpaceCatalog.test.ts src/domain/productAccess.test.ts && npm test -- --run`

Expected: 新增测试 PASS，现有测试保持通过。

- [ ] **Step 7: 提交商品同步闭环**

```bash
git add external-app-vue3/src/stores/trustedSpaceCatalog.ts external-app-vue3/src/stores/trustedSpaceCatalog.test.ts external-app-vue3/src/stores/catalog.ts external-app-vue3/src/domain/productAccess.ts external-app-vue3/src/domain/productAccess.test.ts external-app-vue3/src/views/mobile/ProductDetail.vue external-app-vue3/src/views/admin/ProductCenter.vue
git commit -m "feat(trusted-space): sync catalog and guard purchases"
```

---

### Task 4: 建立企业映射、购买意图与 SSO 承接

**Files:**
- Create: `external-app-vue3/src/stores/trustedSpacePurchase.ts`
- Create: `external-app-vue3/src/stores/trustedSpacePurchase.test.ts`
- Modify: `external-app-vue3/src/stores/user.ts:6-90`
- Modify: `external-app-vue3/src/views/mobile/ProductDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/SpaceBridge.vue:1-111`
- Create: `external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts`

**Interfaces:**
- Consumes: `useTrustedSpaceCatalogStore.purchaseCheck`、`TrustedSpaceAdapter.ensureEnterpriseBinding/createPurchaseLink`。
- Produces:
  - `preparePurchase(input: PrepareSpacePurchaseInput, adapter?: TrustedSpaceAdapter): Promise<SpacePurchaseIntent>`
  - `createLink(intentId: string, adapter?: TrustedSpaceAdapter): Promise<string>`
  - `markRedirected(intentId: string): void`
  - `markReturned(intentId: string): void`
  - `useUserStore.currentEnterpriseMember`

- [ ] **Step 1: 写“企业为主体、个人为经办人”的失败测试**

```ts
it('creates a purchase intent owned by the enterprise with a separate operator', async () => {
  const store = useTrustedSpacePurchaseStore()
  const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
  await useTrustedSpaceCatalogStore().syncAll(adapter)

  const intent = await store.preparePurchase({
    appEnterpriseId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-1',
    appProductId: 'prod-qualification-api',
    enterpriseAuthStatus: 'authenticated',
    returnUrl: '/app/product/prod-qualification-api'
  }, adapter)

  expect(intent.appEnterpriseId).toBe('ent-wanlian-logistics')
  expect(intent.operatorMemberId).toBe('mem-1')
  expect(intent.status).toBe('ready')
})

it('rejects a personal-only context before creating an intent', async () => {
  await expect(store.preparePurchase({
    appEnterpriseId: '',
    operatorMemberId: 'mem-1',
    appProductId: 'prod-qualification-api',
    enterpriseAuthStatus: 'none',
    returnUrl: '/app/product/prod-qualification-api'
  }, adapter)).rejects.toThrow('可信空间购买仅限认证企业')
})
```

- [ ] **Step 2: 运行购买 Store 测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/stores/trustedSpacePurchase.test.ts`

Expected: FAIL，提示 Store 不存在。

- [ ] **Step 3: 实现用户角色一致性**

为 `user.ts` 增加：

```ts
currentEnterpriseMember(state) {
  return state.enterprise.members.find((member) => member.id === state.context.currentMemberId)
}
```

`completeEnterpriseAuth()` 在设置企业上下文时，同时从当前成员写入 `context.role`。这样 seed 中的 `mem-1` 会成为管理员，不再出现 `context.role = member` 与企业成员表冲突。

- [ ] **Step 4: 实现购买 Store**

在 `trustedSpacePurchase.ts` 中定义：

```ts
export interface PrepareSpacePurchaseInput {
  appEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  enterpriseAuthStatus: EnterpriseAuthStatus
  returnUrl: string
}
```

`preparePurchase` 固定执行：

1. 调用 `ensureEnterpriseBinding`。
2. 使用 Task 3 的 `purchaseCheck`。
3. 生成 `intent-*`、`idem-*`、`corr-*`。
4. 将购买意图设为 `ready`，过期时间为创建后 30 分钟。

`createLink` 只对 `ready` 或 `failed` 意图生成 5 分钟短链。生成成功写入 `purchaseUrl`；生成失败保留意图并写 `failureReason`。

- [ ] **Step 5: 改造商品详情和空间承接页**

`ProductDetail.goSpace()` 改为：

```ts
const intent = await trustedPurchase.preparePurchase({
  appEnterpriseId: user.context.currentEnterpriseId!,
  operatorMemberId: user.context.currentMemberId,
  appProductId: product.value!.id,
  enterpriseAuthStatus: user.context.enterpriseAuthStatus,
  returnUrl: route.fullPath
})
router.push({ name: 'space-bridge', params: { id: product.value!.id }, query: { intent: intent.id } })
```

`SpaceBridge.vue` 删除 `orders.createSpaceOrder/advanceSpaceOrder/retryCallback` 和三个模拟按钮，改为：

- 展示企业、经办人、商品与意图状态。
- 调用 `createLink` 后显示“进入可信空间”。
- 点击后 `markRedirected`；mock 环境使用生成的本地安全链接。
- 带 `returned=1` 回到页面时调用 `markReturned`，展示“空间已受理，状态同步中”。
- SSO 失败时提供“重新连接”，复用意图并生成新短链。

- [ ] **Step 6: 写并运行空间承接组件测试**

```ts
it('shows enterprise and operator before handoff and has no fake success button', async () => {
  const wrapper = await mountSpaceBridgeWithIntent()
  expect(wrapper.text()).toContain('万联供应链管理有限公司')
  expect(wrapper.text()).toContain('经办人：陈静')
  expect(wrapper.text()).not.toContain('模拟：购买成功')
})
```

Run: `cd external-app-vue3 && npm test -- --run src/stores/trustedSpacePurchase.test.ts src/views/mobile/TrustedSpaceViews.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交企业购买与 SSO 承接**

```bash
git add external-app-vue3/src/stores/trustedSpacePurchase.ts external-app-vue3/src/stores/trustedSpacePurchase.test.ts external-app-vue3/src/stores/user.ts external-app-vue3/src/views/mobile/ProductDetail.vue external-app-vue3/src/views/mobile/SpaceBridge.vue external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts
git commit -m "feat(trusted-space): add enterprise purchase handoff"
```

---

### Task 5: 用回调与主动查询驱动空间订单/交付镜像

**Files:**
- Create: `external-app-vue3/src/stores/spaceOrders.ts`
- Create: `external-app-vue3/src/stores/spaceOrders.test.ts`
- Modify: `external-app-vue3/src/stores/integration.ts:1-112`
- Modify: `external-app-vue3/src/stores/integration.test.ts`
- Modify: `external-app-vue3/src/types/configGovernance.ts:22-45`
- Modify: `external-app-vue3/src/stores/orders.ts:1-210`
- Modify: `external-app-vue3/src/views/mobile/SpaceBridge.vue`

**Interfaces:**
- Consumes: `SpaceOrderEvent`、`mapSpaceOrderStatus`、`canApplySpaceOrderEvent`、`TrustedSpaceAdapter.findOrderByIntent`。
- Produces:
  - `processSpaceOrderEvent(event: SpaceOrderEvent): PipelineDecision`
  - `reconcileIntent(intentId: string, adapter?: TrustedSpaceAdapter): Promise<SpaceOrderMirror | undefined>`
  - 对象级事件版本键 `connector:subjectId:eventType`

- [ ] **Step 1: 写对象级版本、幂等和主动查询失败测试**

```ts
it('keeps event versions isolated by space order', () => {
  const integration = useIntegrationStore()
  expect(integration.processEvent(evt({ subjectId: 'sp-order-1', eventVersion: 5 })).decision).toBe('process')
  expect(integration.processEvent(evt({
    subjectId: 'sp-order-2',
    eventVersion: 1,
    idempotencyKey: 'order-2-v1'
  })).decision).toBe('process')
})

it('does not roll a delivered order back with an older event', () => {
  const store = useSpaceOrderStore()
  store.processSpaceOrderEvent(spaceEvent({ rawStatus: 'DELIVERED', eventVersion: 5 }))
  store.processSpaceOrderEvent(spaceEvent({
    rawStatus: 'PAID',
    eventVersion: 4,
    idempotencyKey: 'older'
  }))
  expect(store.byId('sp-order-1')?.displayStatus).toBe('delivered')
})

it('reconciles an intent when return happens before callback', async () => {
  const mirror = await store.reconcileIntent('intent-delayed', adapter)
  expect(mirror?.purchaseIntentId).toBe('intent-delayed')
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/stores/integration.test.ts src/stores/spaceOrders.test.ts`

Expected: FAIL，提示 `subjectId` 或空间订单 Store 不存在。

- [ ] **Step 3: 修正集成管线对象版本键**

`IncomingEvent` 和 `ConnectorEvent` 增加 `subjectId`。版本键改为：

```ts
function subjectKey(connector: Connector, subjectId: string, eventType: string): string {
  return `${connector}:${subjectId}:${eventType}`
}
```

所有现有集成测试 fixture 明确传入 `subjectId`。人工修正仍提升该对象的处理版本，不影响其他订单或账单。

- [ ] **Step 4: 实现空间订单镜像 Store**

```ts
processSpaceOrderEvent(event: SpaceOrderEvent): PipelineDecision {
  const result = useIntegrationStore().processEvent({
    connector: 'trusted_space',
    subjectId: event.spaceOrderId,
    eventType: 'order_update',
    eventVersion: event.eventVersion,
    idempotencyKey: event.idempotencyKey,
    signatureValid: event.signatureValid
  })
  if (result.decision !== 'process') return result.decision
  this.upsertFromEvent(event)
  return result.decision
}
```

`upsertFromEvent` 必须通过购买意图反查 APP 企业、经办人和商品；企业、商品或意图不匹配时调用 `integration.failEvent`，最终进入死信，不写镜像。

`reconcileIntent` 查询适配器后复用 `processSpaceOrderEvent`，不得建立第二条直接更新路径。

- [ ] **Step 5: 收口 APP 自营订单**

从 `orders.ts` 删除 `createSpaceOrder`、`advanceSpaceOrder`、`retryCallback` 和 `setStatusChain`。为保证 Task 7 前现有 `Mine.vue` 可编译，暂时保留只读的旧 `spaceOrders` getter；新业务不得再向其中写入空间订单。

`Order` 的旧空间状态类型也暂时保留到 Task 9。同步修改支付/权益售后测试 fixture，使新测试只使用 APP 订单状态；空间订单影响分析在 Task 9 通过统一影响引用接入。

- [ ] **Step 6: 将返回同步接入 SpaceBridge**

当意图处于 `returned_pending_sync`：

```ts
const mirror = await spaceOrders.reconcileIntent(intent.id)
if (mirror) trustedPurchase.linkOrder(intent.id)
```

页面展示镜像状态；未查询到时继续显示“状态同步中”，提供“重新同步”，不显示购买成功。

- [ ] **Step 7: 运行订单、集成和售后回归**

Run: `cd external-app-vue3 && npm test -- --run src/stores/spaceOrders.test.ts src/stores/integration.test.ts src/stores/orders.afterSales.test.ts src/stores/afterSales.test.ts src/domain/productImpact.test.ts`

Expected: 全部 PASS。

- [ ] **Step 8: 提交订单/交付镜像**

```bash
git add external-app-vue3/src/stores/spaceOrders.ts external-app-vue3/src/stores/spaceOrders.test.ts external-app-vue3/src/stores/integration.ts external-app-vue3/src/stores/integration.test.ts external-app-vue3/src/types/configGovernance.ts external-app-vue3/src/stores/orders.ts external-app-vue3/src/views/mobile/SpaceBridge.vue external-app-vue3/src/stores/orders.afterSales.test.ts external-app-vue3/src/stores/afterSales.test.ts
git commit -m "feat(trusted-space): mirror orders and delivery events"
```

---

### Task 6: 增加 API 用量账单与空间疑问入口

**Files:**
- Create: `external-app-vue3/src/stores/apiUsageBills.ts`
- Create: `external-app-vue3/src/stores/apiUsageBills.test.ts`
- Create: `external-app-vue3/src/views/mobile/ApiUsageBills.vue`
- Create: `external-app-vue3/src/views/mobile/ApiUsageBillDetail.vue`
- Modify: `external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts`
- Modify: `external-app-vue3/src/views/mobile/MineEnterprise.vue:1-89`
- Modify: `external-app-vue3/src/router/index.ts:10-32`

**Interfaces:**
- Consumes: `TrustedSpaceAdapter.listUsageBills/createBillDownloadLink/createBillSupportLink`、`useUserStore.currentEnterpriseMember`。
- Produces:
  - `syncBills(appEnterpriseId: string, spaceEnterpriseId: string, adapter?: TrustedSpaceAdapter): Promise<void>`
  - `visibleBills(memberId: string, role: 'admin' | 'member'): ApiUsageBillView[]`
  - `billDetail(spaceBillId: string, memberId: string, role: 'admin' | 'member'): ApiUsageBillView | undefined`
  - `download(spaceBillId: string, memberId: string, role: 'admin' | 'member'): Promise<string | undefined>`
  - `support(spaceBillId: string, returnUrl: string): Promise<string>`

- [ ] **Step 1: 写管理员/成员范围和零值保护失败测试**

```ts
it('shows full bill totals to admins', async () => {
  await store.syncBills('ent-wanlian-logistics', 'space-ent-wanlian', adapter)
  const bill = store.billDetail('bill-2026-07', 'mem-1', 'admin')!
  expect(bill.totalAmount).toBe(12680)
  expect(bill.lines.length).toBe(2)
})

it('shows only owned credential lines and hides enterprise total from members', async () => {
  await store.syncBills('ent-wanlian-logistics', 'space-ent-wanlian', adapter)
  const bill = store.billDetail('bill-2026-07', 'mem-2', 'member')!
  expect(bill.totalAmount).toBeUndefined()
  expect(bill.lines.every((line) => line.ownerMemberId === 'mem-2')).toBe(true)
})

it('keeps the last successful snapshot when sync fails', async () => {
  await store.syncBills('ent-wanlian-logistics', 'space-ent-wanlian', adapter)
  await expect(store.syncBills('ent-wanlian-logistics', 'space-ent-wanlian', failingAdapter)).rejects.toThrow()
  expect(store.rawBills[0].totalAmount).toBe(12680)
  expect(store.stale).toBe(true)
})

it('does not expose a full enterprise statement download to a member', async () => {
  await store.syncBills('ent-wanlian-logistics', 'space-ent-wanlian', adapter)
  expect(await store.download('bill-2026-07', 'mem-2', 'member')).toBeUndefined()
})
```

- [ ] **Step 2: 运行账单测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/stores/apiUsageBills.test.ts`

Expected: FAIL，提示 Store 不存在。

- [ ] **Step 3: 实现账单 Store 和视图模型**

```ts
export interface ApiUsageBillView {
  spaceBillId: string
  billingMonth: string
  currency: string
  rawStatus: string
  totalAmount?: number
  visibleCalls: number
  successCalls: number
  lines: ApiUsageBillLine[]
  syncedAt: string
  stale: boolean
}
```

管理员视图的 `totalAmount` 使用空间权威总额；成员视图将其设为 `undefined`，按 `ownerMemberId` 过滤明细并重新汇总 `visibleCalls`。不得从成员可见明细推导或暴露企业总金额。

同步失败时保留 `rawBills`，设置 `stale = true` 和 `error`；成功时记录 `lastSuccessAt` 并清除过期标记。

- [ ] **Step 4: 实现账单列表和详情**

`ApiUsageBills.vue`：

- 未认证企业显示认证引导。
- 管理员显示月度总额、调用量和状态。
- 普通成员显示本人调用量，不渲染企业总金额 DOM。

`ApiUsageBillDetail.vue`：

- 支持按日期和 API 展示明细。
- 管理员显示完整账单下载按钮并调用 `download`；当前 mock 只提供企业完整账单，因此普通成员不渲染下载按钮。
- “账单有疑问”调用 `support`，使用带 `spaceBillId` 和 `returnUrl` 的短期空间深链。
- 不出现“提交异议”“异议状态”或本地表单。

- [ ] **Step 5: 注册入口和路由**

```ts
{ path: '/app/mine/enterprise/bills', name: 'api-usage-bills', component: () => import('@/views/mobile/ApiUsageBills.vue') },
{ path: '/app/mine/enterprise/bills/:id', name: 'api-usage-bill-detail', component: () => import('@/views/mobile/ApiUsageBillDetail.vue') }
```

在 `MineEnterprise.vue` 增加“API 用量账单”卡片，只有已认证企业上下文可见。

- [ ] **Step 6: 运行 Store 和页面测试**

Run: `cd external-app-vue3 && npm test -- --run src/stores/apiUsageBills.test.ts src/views/mobile/TrustedSpaceViews.test.ts`

Expected: PASS；成员页面不存在企业总金额文本。

- [ ] **Step 7: 提交 API 账单**

```bash
git add external-app-vue3/src/stores/apiUsageBills.ts external-app-vue3/src/stores/apiUsageBills.test.ts external-app-vue3/src/views/mobile/ApiUsageBills.vue external-app-vue3/src/views/mobile/ApiUsageBillDetail.vue external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts external-app-vue3/src/views/mobile/MineEnterprise.vue external-app-vue3/src/router/index.ts
git commit -m "feat(trusted-space): add API usage bill views"
```

---

### Task 7: 重构“我的”订单查询与空间订单权限

**Files:**
- Modify: `external-app-vue3/src/views/mobile/Mine.vue:1-135`
- Modify: `external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts`
- Modify: `external-app-vue3/src/stores/spaceOrders.ts`
- Modify: `external-app-vue3/src/stores/spaceOrders.test.ts`
- Modify: `external-app-vue3/src/stores/orders.ts`

**Interfaces:**
- Consumes: `useOrderStore.appOrders`、`useUserStore.currentEnterpriseMember`。
- Produces:
  - `visibleFor(user: Pick<UserContext, 'currentEnterpriseId' | 'currentMemberId' | 'enterpriseAuthStatus' | 'role'>): SpaceOrderMirror[]`
  - “个人订单”只含本人 APP 订单。
  - “企业订单”合并 APP 企业订单和空间订单镜像的展示模型。

- [ ] **Step 1: 写订单可见范围失败测试**

```ts
it('lets an admin see every enterprise space order', () => {
  store.mirrors = [
    mirror({ spaceOrderId: 'o1', operatorMemberId: 'mem-1' }),
    mirror({ spaceOrderId: 'o2', operatorMemberId: 'mem-2' })
  ]
  expect(store.visibleFor({
    currentEnterpriseId: 'ent-wanlian-logistics',
    currentMemberId: 'mem-1',
    enterpriseAuthStatus: 'authenticated',
    role: 'admin'
  } as UserContext)).toHaveLength(2)
})

it('limits a member to orders they operated', () => {
  expect(store.visibleFor({
    currentEnterpriseId: 'ent-wanlian-logistics',
    currentMemberId: 'mem-2',
    enterpriseAuthStatus: 'authenticated',
    role: 'member'
  } as UserContext).map((order) => order.spaceOrderId)).toEqual(['o2'])
})
```

- [ ] **Step 2: 运行权限测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/stores/spaceOrders.test.ts`

Expected: FAIL，权限 getter 尚未满足断言。

- [ ] **Step 3: 实现服务边界过滤**

`visibleFor` 先验证 `enterpriseAuthStatus` 和 `currentEnterpriseId`，再按企业过滤；管理员返回企业全部镜像，成员追加 `operatorMemberId === currentMemberId`。页面不得直接读取未过滤的 `mirrors`。

- [ ] **Step 4: 重构 Mine 订单 UI**

将现有 `APP订单`、`空间订单` 两个 Tab 收口为：

- `个人订单`：`orders.appOrders.filter(ownerType === 'personal' && ownerId === currentMemberId)`。
- `企业订单`：APP 企业订单与 `spaceOrders.visibleFor(user.context)` 合并，使用 `channelLabel` 区分“APP 支付”和“可信空间”。

空间订单卡展示空间订单号、金额/币种、交付摘要、最近同步时间和“前往空间使用”。不得显示 APP 权益已生效。

页面迁移完成后，从 `orders.ts` 删除 Task 5 暂留的旧 `spaceOrders` getter。

- [ ] **Step 5: 写页面测试并运行**

```ts
it('does not render enterprise orders outside authenticated enterprise context', async () => {
  const wrapper = await mountMine({ enterpriseAuthStatus: 'none' })
  await selectTab(wrapper, '企业订单')
  expect(wrapper.text()).toContain('完成企业认证后查看企业订单')
  expect(wrapper.text()).not.toContain('SP-ORDER-')
})
```

Run: `cd external-app-vue3 && npm test -- --run src/stores/spaceOrders.test.ts src/views/mobile/TrustedSpaceViews.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交订单查询**

```bash
git add external-app-vue3/src/views/mobile/Mine.vue external-app-vue3/src/views/mobile/TrustedSpaceViews.test.ts external-app-vue3/src/stores/spaceOrders.ts external-app-vue3/src/stores/spaceOrders.test.ts external-app-vue3/src/stores/orders.ts
git commit -m "feat(trusted-space): separate personal and enterprise orders"
```

---

### Task 8: 补齐 APP 报告个人/企业购买主体选择

**Files:**
- Create: `external-app-vue3/src/views/mobile/CheckoutItem.test.ts`
- Modify: `external-app-vue3/src/views/mobile/CheckoutItem.vue:1-71`
- Modify: `external-app-vue3/src/views/mobile/CheckoutEnterprise.vue:1-81`
- Modify: `external-app-vue3/src/stores/orders.ts`
- Modify: `external-app-vue3/src/stores/entitlements.ts`
- Modify: `external-app-vue3/src/stores/orders.afterSales.test.ts`

**Interfaces:**
- Consumes: 现有 `purchaseItem`、`submitEnterpriseOrder`、`grantItem`、`grantEnterpriseSeat`。
- Produces:
  - `PurchaseSubject = 'personal' | 'enterprise'`
  - `purchaseReportForSubject(productId: string, subject: PurchaseSubject, mode?: 'online' | 'contract'): Order`

- [ ] **Step 1: 写购买主体失败测试**

```ts
it('creates a personal report order and entitlement', () => {
  const order = store.purchaseReportForSubject('prod-logistics-monthly', 'personal')
  expect(order.ownerType).toBe('personal')
  expect(order.ownerId).toBe('mem-1')
})

it('creates an enterprise report order owned by the authenticated enterprise', () => {
  user.completeEnterpriseAuth()
  const order = store.purchaseReportForSubject('prod-logistics-monthly', 'enterprise', 'online')
  expect(order.ownerType).toBe('enterprise')
  expect(order.ownerId).toBe('ent-wanlian-logistics')
  expect(user.enterprise.entitledProductIds).toContain('prod-logistics-monthly')
})

it('rejects enterprise subject without enterprise authentication', () => {
  expect(() => store.purchaseReportForSubject('prod-logistics-monthly', 'enterprise', 'online'))
    .toThrow('企业购买需要先完成企业认证')
})
```

- [ ] **Step 2: 运行订单测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/stores/orders.afterSales.test.ts src/views/mobile/CheckoutItem.test.ts`

Expected: FAIL，提示新 action 或组件交互不存在。

- [ ] **Step 3: 实现订单 action**

```ts
purchaseReportForSubject(
  productId: string,
  subject: 'personal' | 'enterprise',
  mode: 'online' | 'contract' = 'online'
) {
  const product = useCatalogStore().byId(productId)
  if (!product || product.type !== 'report') throw new Error('仅报告支持此购买方式')
  if (subject === 'personal') return this.purchaseItem(productId, product.price.itemPrice ?? 0)
  const user = useUserStore()
  if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId) {
    throw new Error('企业购买需要先完成企业认证')
  }
  return this.submitEnterpriseOrder(productId, (product.price.itemPrice ?? 0) * 10, mode)
}
```

- [ ] **Step 4: 改造收银台**

`CheckoutItem.vue` 增加购买主体卡片：

- 未进入企业上下文时默认个人，企业选项显示“认证后可选”。
- 已进入企业上下文时默认企业，但用户可以切回个人。
- 支付按钮前显示“购买主体：个人姓名”或“购买主体：企业名称”。
- 企业选择在线模式时调用新 action；合同模式跳转或复用 `CheckoutEnterprise.vue`。
- 提交前按钮文案必须包含主体，例如“确认以企业名义购买”。

`CheckoutEnterprise.vue` 保留在线/合同选择，并在页首重复展示企业名称，防止主体误选。

- [ ] **Step 5: 运行收银台和订单测试**

Run: `cd external-app-vue3 && npm test -- --run src/views/mobile/CheckoutItem.test.ts src/stores/orders.afterSales.test.ts src/stores/entitlements.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交 APP 报告双主体购买**

```bash
git add external-app-vue3/src/views/mobile/CheckoutItem.vue external-app-vue3/src/views/mobile/CheckoutItem.test.ts external-app-vue3/src/views/mobile/CheckoutEnterprise.vue external-app-vue3/src/stores/orders.ts external-app-vue3/src/stores/entitlements.ts external-app-vue3/src/stores/orders.afterSales.test.ts
git commit -m "feat(commerce): distinguish personal and enterprise report purchases"
```

---

### Task 9: 接入运营后台、影响分析和异常治理

**Files:**
- Modify: `external-app-vue3/src/views/admin/OrderCenter.vue:1-95`
- Modify: `external-app-vue3/src/views/admin/OrderCenter.test.ts`
- Modify: `external-app-vue3/src/views/admin/IntegrationGovernance.vue:1-43`
- Modify: `external-app-vue3/src/views/admin/IntegrationGovernance.test.ts`
- Modify: `external-app-vue3/src/views/admin/ApprovalIntegration.vue:131-151`
- Modify: `external-app-vue3/src/views/admin/Dashboard.vue:1-40`
- Modify: `external-app-vue3/src/domain/productImpact.ts:1-104`
- Modify: `external-app-vue3/src/domain/productImpact.test.ts`
- Modify: `external-app-vue3/src/stores/productReverse.ts:40-126`
- Modify: `external-app-vue3/src/stores/productReverse.test.ts`
- Modify: `external-app-vue3/src/types/domain.ts:260-303`

**Interfaces:**
- Consumes: APP `Order[]`、`SpaceOrderMirror[]`、`ConnectorEvent[]`。
- Produces:
  - `UnifiedOrderRow`
  - `ProductImpactOrderRef`
  - 后台手动对账入口 `reconcileIntent`

- [ ] **Step 1: 写统一订单和影响分析失败测试**

```ts
it('lists APP orders and trusted-space mirrors without enabling APP contract actions on space orders', async () => {
  appOrders.list = [appOrder({ id: 'app-1' })]
  spaceOrders.mirrors = [spaceMirror({ spaceOrderId: 'space-1', displayStatus: 'delivering' })]
  const wrapper = await mountView()
  expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
  expect(wrapper.find('[data-id="space-1"]').text()).toContain('可信空间')
  expect(wrapper.find('[data-id="space-1"] [data-testid="confirm-pay"]').exists()).toBe(false)
})

it('includes an in-flight space order in product impact', () => {
  const result = buildProductImpactSnapshot({
    ...baseInput(),
    orders: [],
    spaceOrders: [impactOrder({ id: 'space-1', status: 'delivering' })]
  })
  expect(result.inFlightOrderIds).toContain('space-1')
})

it('includes a trusted-space order when previewing a product reverse action', () => {
  useSpaceOrderStore().mirrors = [
    spaceMirror({
      spaceOrderId: 'space-1',
      appProductId: 'prod-qualification-api',
      appEnterpriseId: 'ent-wanlian-logistics',
      displayStatus: 'delivering'
    })
  ]
  const preview = useProductReverseStore().previewProductReverse(
    previewInput('prod-qualification-api', 'pause', 'commercial_adjustment')
  )
  expect(preview.impact.inFlightOrderIds).toContain('space-1')
})
```

- [ ] **Step 2: 运行后台和影响测试并确认失败**

Run: `cd external-app-vue3 && npm test -- --run src/views/admin/OrderCenter.test.ts src/views/admin/IntegrationGovernance.test.ts src/domain/productImpact.test.ts`

Expected: FAIL，新镜像尚未进入后台或影响分析。

- [ ] **Step 3: 建立统一后台展示模型**

```ts
export interface UnifiedOrderRow {
  id: string
  channel: 'app' | 'trusted_space'
  ownerType: 'personal' | 'enterprise'
  ownerId: string
  operatorMemberId?: string
  productId: string
  productName: string
  amount: number
  currency: string
  status: string
  contractStatus?: string
  createdAt: string
}
```

`OrderCenter.vue` 合并 `orders.list` 和 `spaceOrders.mirrors`。合同签署/付款确认按钮只对 `channel === 'app'` 显示。空间订单提供“主动对账”和“查看空间详情”。

- [ ] **Step 4: 扩展集成治理和告警**

`IntegrationGovernance.vue` 展示事件的 `subjectId`、事件类型、版本、处理结果和工单。空间订单的 `unknown_processing`、长时间未关联或死信记录提供主动对账/人工修正。

`ApprovalIntegration.vue` 和 `Dashboard.vue` 不再查询 `orders.list.status === callback_delayed`，改为查询空间镜像未关联、未知处理中和集成死信。

- [ ] **Step 5: 统一商品影响引用**

将 `productImpact.ts` 的输入改为：

```ts
export interface ProductImpactOrderRef {
  id: string
  productId: string
  ownerId: string
  status: string
}

interface BuildProductImpactInput {
  // 其他字段保持不变
  orders: ProductImpactOrderRef[]
  spaceOrders: ProductImpactOrderRef[]
}
```

在计算在途订单前合并两组引用。空间镜像仅提供影响识别，不触发 APP 权益退款或发放。

`productReverse.ts` 读取 `useSpaceOrderStore().mirrors`，映射成 `ProductImpactOrderRef` 后作为 `spaceOrders` 传入。空间订单的客户 ID 使用 `appEnterpriseId`，不得使用个人经办人 ID。

所有页面和影响分析完成迁移后，从 `types/domain.ts` 删除旧 `SpaceOrderStatus`，并将 APP `Order` 的渠道收口为 `channel: 'app'`。若保留 `OrderChannel` 类型，其唯一值为 `'app'`。

- [ ] **Step 6: 运行后台、影响和全量测试**

Run: `cd external-app-vue3 && npm test -- --run src/views/admin/OrderCenter.test.ts src/views/admin/IntegrationGovernance.test.ts src/domain/productImpact.test.ts && npm test -- --run`

Expected: 全量测试 PASS。

- [ ] **Step 7: 提交后台治理**

```bash
git add external-app-vue3/src/views/admin/OrderCenter.vue external-app-vue3/src/views/admin/OrderCenter.test.ts external-app-vue3/src/views/admin/IntegrationGovernance.vue external-app-vue3/src/views/admin/IntegrationGovernance.test.ts external-app-vue3/src/views/admin/ApprovalIntegration.vue external-app-vue3/src/views/admin/Dashboard.vue external-app-vue3/src/domain/productImpact.ts external-app-vue3/src/domain/productImpact.test.ts external-app-vue3/src/stores/productReverse.ts external-app-vue3/src/stores/productReverse.test.ts external-app-vue3/src/types/domain.ts
git commit -m "feat(trusted-space): expose mirrors and reconciliation in admin"
```

---

### Task 10: 同步文档并完成全链路验证

**Files:**
- Modify: `docs/product/2026-07-09-对外APP找数买数-六层次蓝图与产品设计.md`
- Modify: `docs/product/2026-07-10-对外APP找数买数-功能矩阵.md`
- Modify: `external-app-vue3/README.md`
- Modify: `docs/superpowers/plans/2026-07-27-find-buy-trusted-space-integration.md`

**Interfaces:**
- Consumes: Tasks 1-9 的最终行为。
- Produces: 产品规则、实施状态、演示路径和验证结果的一致记录。

- [x] **Step 1: 更新产品蓝图中的空间购买规则**

在蓝图中明确：

- 可信空间数据集/API 只能由认证企业购买，个人为经办人。
- APP 只镜像空间订单、交付和 API 账单，不创建空间权益。
- APP 账单疑问深链回可信空间处理。
- APP 报告支持个人/企业购买主体选择。
- 商品快照过期时可查看但不可购买。

- [x] **Step 2: 更新功能矩阵**

将目录同步、SSO 企业映射、订单/交付回调、主动对账、API 账单查询、账单空间深链和 APP 报告双主体购买映射到现有场景与阶段；不新增“APP 账单异议处理”功能点。

- [x] **Step 3: 更新 README 演示路径**

加入以下可直接访问路径：

```text
/#/app/product/prod-qualification-api
/#/app/mine?tab=企业订单
/#/app/mine/enterprise/bills
/#/admin/products
/#/admin/orders
/#/admin/approval/integration
```

说明 mock 场景切换方式、管理员/成员身份和预期结果。

- [x] **Step 4: 运行完整自动验证**

Run:

```bash
cd external-app-vue3
npm test -- --run
npm run build
```

Expected:

- 所有 Vitest 文件通过。
- Vite build 成功。
- 无 TypeScript 或模板编译错误。

- [ ] **Step 5: 运行浏览器冒烟**

使用移动端 390×844 和 PC 1440×900 验证：

1. 同步空间商品后，资格核验 API 可以购买；将快照设为过期后购买按钮锁定。
2. 未认证用户被引导认证；认证后购买意图显示企业和经办人。
3. 空间返回早于回调时显示同步中，主动查询后出现企业空间订单。
4. 管理员能看全部空间订单和账单；切换普通成员后只看本人范围且无企业总金额。
5. 账单可下载并深链回空间处理疑问，APP 内无异议表单。
6. APP 报告个人/企业购买分别生成正确订单和权益。
7. 后台可查看商品同步、空间镜像、事件版本、死信和主动对账。

- [x] **Step 6: 将验证结果写入计划**

在本任务末尾追加实际测试数量、构建结果和浏览器检查结果；若任何检查未执行，写明原因和剩余风险，不写“已完成”。

- [x] **Step 7: 检查提交范围并提交文档**

```bash
git status --short
git diff --check
git add external-app-vue3/README.md
git add -f docs/product/2026-07-09-对外APP找数买数-六层次蓝图与产品设计.md docs/product/2026-07-10-对外APP找数买数-功能矩阵.md docs/superpowers/plans/2026-07-27-find-buy-trusted-space-integration.md
git diff --cached --check
git commit -m "docs: document trusted-space integration closure"
```

#### Task 10 验证记录（2026-07-27）

- RED：新增 `src/integration/trustedSpaceJourneys.test.ts` 后，README 演示契约因缺少 `/#/app/mine?tab=企业订单` 失败；补齐 README 的直接入口、角色、mock 切换和权威边界后转 GREEN。连续集成测试覆盖认证企业购买意图 → SSO 短链 → 返回同步中 → 主动对账镜像 → 管理员账单下载/空间支持深链，并覆盖 APP 报告个人/企业主体各自产生订单和权益。
- 自动验证：`npm test -- --run` 通过，54 个 Vitest 文件、403 个测试；`npm run build` 通过（项目脚本为 `vue-tsc -b --noCheck && vite build`），仅证明生产构建与 SFC/模板转换通过，不证明 TypeScript 语义无错。
- 独立类型检查：`npx vue-tsc --noEmit -p tsconfig.json` 已运行但未通过，存在既有的联合类型收窄、适配器测试 fixture、`Array.at` 目标库、Store 泛型与商品详情比较等诊断；因此不声明 APP 源码项目类型检查通过。`npx vue-tsc -b` 同样未通过，另含既有 `vite.config.ts` 的 `node:url` 类型配置问题；该基线问题不在 Task 10 范围。
- 禁止项扫描：对生产源码扫描旧的 `createSpaceOrder`、`advanceSpaceOrder`、`retryCallback`、`SpaceOrderStatus`、`callback_delayed` 及本地账单异议关键字，未发现命中。
- 浏览器烟测（部分完成）：390×844 下页面 `scrollWidth=390`、无横向溢出；未认证资格核验 API 显示禁用「认证企业后购买」，完成提交认证 → 模拟审核通过 → 继续后为「前往可信空间购买」。购买意图页展示万联供应链管理有限公司、陈静和 APP 不创建本地空间订单说明；mock SSO 短链在 `redirected` 后以 `returned=1` 返回时显示 `returned_pending_sync` /「空间已受理，状态同步中」/「重新同步」。管理员账单显示企业总额 ¥1,840、两条凭证明细、下载和空间支持入口，APP 内无异议表单；报告个人/企业主体均经主体确认和再次确认并落入对应「我的」分栏。1440×900 下商品中心、订单中心和集成治理无横向溢出，且分别展示同步、只读空间镜像、长时间未关联/死信/事件区；控制台 warning/error 为 0。
- 剩余浏览器风险：原型没有 UI mock 开关，未页面级实测强制快照过期、切换 `mem-2` 普通成员，以及生成真实空间镜像/回调治理；这些由 Vitest 覆盖，不能替代相应视觉/交互验收，因此 Step 5 保持未勾选。

---

## Final Verification

完成所有任务后，从仓库根目录执行：

```bash
git status --short --branch
cd external-app-vue3
npm test -- --run
npm run build
```

验收结果必须同时满足：

- 用户未跟踪文件 `六层次架构梳理.md` 仍未被暂存或修改。
- 空间商品过期会锁定购买。
- 空间购买只能由认证企业发起，订单保留企业主体和个人经办人。
- 空间回调幂等且旧版本不能回退订单状态。
- APP 不创建空间数据/API 权益。
- 管理员与普通成员的订单和账单范围符合规则。
- 账单疑问跳转可信空间，不在 APP 创建异议。
- APP 报告个人/企业购买生成对应 APP 订单与权益。
- 全量测试和构建通过。

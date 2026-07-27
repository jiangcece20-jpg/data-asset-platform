import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { UserContext } from '@/types/domain'
import type { SpaceOrderEvent, SpaceOrderMirror, SpacePurchaseIntent } from '@/types/trustedSpace'
import type { TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useIntegrationStore } from './integration'
import { LONG_UNLINKED_SPACE_ORDER_DELAY_MS, isLongUnlinkedSpacePurchase, useSpaceOrderStore } from './spaceOrders'
import { useUserStore } from './user'

const spaceEvent = (over: Partial<SpaceOrderEvent> = {}): SpaceOrderEvent => ({
  eventId: 'space-event-1',
  idempotencyKey: 'space-event-key-1',
  eventVersion: 5,
  signatureValid: true,
  spaceOrderId: 'sp-order-1',
  purchaseIntentId: 'intent-delayed',
  spaceEnterpriseId: 'space-ent-wanlian',
  spaceProductNo: 'SPACE-API-20415',
  rawStatus: 'DELIVERED',
  amount: 1280,
  currency: 'CNY',
  occurredAt: '2026-07-27T10:00:00.000Z',
  deliverySummary: '已开通资格核验 API 凭证',
  ...over
})

function intent(over: Partial<SpacePurchaseIntent> = {}): SpacePurchaseIntent {
  return {
    id: 'intent-delayed',
    appEnterpriseId: 'ent-wanlian-logistics',
    spaceEnterpriseId: 'space-ent-wanlian',
    operatorMemberId: 'mem-1',
    appProductId: 'prod-qualification-api',
    spaceProductNo: 'SPACE-API-20415',
    returnUrl: '/app/product/prod-qualification-api',
    idempotencyKey: 'intent-key-1',
    correlationId: 'intent-correlation-1',
    status: 'returned_pending_sync',
    createdAt: '2026-07-27T09:00:00.000Z',
    expiresAt: '2026-07-27T10:30:00.000Z',
    ...over
  }
}

function mirror(over: Partial<SpaceOrderMirror> = {}): SpaceOrderMirror {
  return {
    spaceOrderId: 'o1',
    purchaseIntentId: 'intent-delayed',
    appEnterpriseId: 'ent-wanlian-logistics',
    spaceEnterpriseId: 'space-ent-wanlian',
    operatorMemberId: 'mem-1',
    appProductId: 'prod-qualification-api',
    spaceProductNo: 'SPACE-API-20415',
    productName: '企业资质核验 API',
    rawStatus: 'DELIVERED',
    displayStatus: 'delivered',
    amount: 1280,
    currency: 'CNY',
    eventVersion: 5,
    spaceUpdatedAt: '2026-07-27T10:00:00.000Z',
    syncedAt: '2026-07-27T10:01:00.000Z',
    ...over
  }
}

describe('space order mirror store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useTrustedSpacePurchaseStore().intents = [intent()]
    useTrustedSpaceCatalogStore().snapshots = [{ ...seedTrustedProductSnapshots[0] }]
  })

  it('does not roll a delivered order back with an older event', () => {
    const store = useSpaceOrderStore()
    store.processSpaceOrderEvent(spaceEvent())
    store.processSpaceOrderEvent(spaceEvent({
      rawStatus: 'PAID',
      eventVersion: 4,
      idempotencyKey: 'older'
    }))
    expect(store.byId('sp-order-1')?.displayStatus).toBe('delivered')
  })

  it('lets an admin see every enterprise space order', () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    store.mirrors = [
      mirror({ spaceOrderId: 'o1', operatorMemberId: 'mem-1' }),
      mirror({ spaceOrderId: 'o2', operatorMemberId: 'mem-2' })
    ]

    expect(store.visibleFor(user.context)).toHaveLength(2)
  })

  it('limits a member to orders they operated', () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    store.mirrors = [
      mirror({ spaceOrderId: 'o1', operatorMemberId: 'mem-1' }),
      mirror({ spaceOrderId: 'o2', operatorMemberId: 'mem-2' })
    ]

    expect(store.visibleFor(user.context).map((order) => order.spaceOrderId)).toEqual(['o2'])
  })

  it('does not let an admin see space orders after switching to an enterprise they do not belong to', () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    store.mirrors = [
      mirror({ spaceOrderId: 'o1', appEnterpriseId: 'ent-wanlian-logistics' }),
      mirror({ spaceOrderId: 'o2', appEnterpriseId: 'ent-another' })
    ]

    user.setEnterpriseContext('ent-another')

    expect(store.visibleFor(user.context)).toEqual([])
  })

  it('does not let a member forge an admin role to expand space-order visibility', () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    store.mirrors = [
      mirror({ spaceOrderId: 'o1', operatorMemberId: 'mem-1' }),
      mirror({ spaceOrderId: 'o2', operatorMemberId: 'mem-2' })
    ]

    expect(store.visibleFor({ ...user.context, role: 'admin' } as UserContext).map((order) => order.spaceOrderId)).toEqual(['o2'])
  })

  it('clears mirrors and related intents when the enterprise context changes or exits', () => {
    const store = useSpaceOrderStore()
    const purchases = useTrustedSpacePurchaseStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    store.mirrors = [mirror()]

    user.setEnterpriseContext('ent-another')
    expect(store.mirrors).toEqual([])
    expect(purchases.intents).toEqual([])

    purchases.intents = [intent()]
    store.mirrors = [mirror()]
    user.clearEnterpriseContext()
    expect(store.mirrors).toEqual([])
    expect(purchases.intents).toEqual([])
  })

  it('does not repopulate cleared mirrors when an old reconciliation completes after exit', async () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    useTrustedSpacePurchaseStore().intents = [intent()]
    let releaseOrder: ((event: SpaceOrderEvent | undefined) => void) | undefined
    const delayedAdapter: TrustedSpaceAdapter = {
      syncProducts: async () => ({ items: [] }),
      getProduct: async () => undefined,
      ensureEnterpriseBinding: async () => ({ appEnterpriseId: 'ent-wanlian-logistics', status: 'active' }),
      createPurchaseLink: async () => ({ url: '', expiresAt: '' }),
      findOrderByIntent: () => new Promise((resolve) => { releaseOrder = resolve }),
      listUsageBills: async () => [],
      createBillDownloadLink: async () => '',
      createBillSupportLink: async () => ({ url: '', expiresAt: '' })
    }

    const reconciliation = store.reconcileIntent('intent-delayed', delayedAdapter)
    user.clearEnterpriseContext()
    releaseOrder!(spaceEvent())
    await reconciliation

    expect(store.mirrors).toEqual([])
  })

  it('does not reconcile an intent after its operator loses enterprise membership', async () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    useTrustedSpacePurchaseStore().intents = [intent()]
    user.enterprise.members.find((member) => member.id === 'mem-1')!.status = 'revoked'
    const adapter: TrustedSpaceAdapter = {
      syncProducts: async () => ({ items: [] }),
      getProduct: async () => undefined,
      ensureEnterpriseBinding: async () => ({ appEnterpriseId: 'ent-wanlian-logistics', status: 'active' }),
      createPurchaseLink: async () => ({ url: '', expiresAt: '' }),
      findOrderByIntent: async () => spaceEvent(),
      listUsageBills: async () => [],
      createBillDownloadLink: async () => '',
      createBillSupportLink: async () => ({ url: '', expiresAt: '' })
    }

    await expect(store.reconcileIntent('intent-delayed', adapter)).resolves.toBeUndefined()
    expect(store.mirrors).toEqual([])
  })

  it('does not overwrite a delivered mirror with a same-version event using a new idempotency key', () => {
    const store = useSpaceOrderStore()
    const integration = useIntegrationStore()
    store.processSpaceOrderEvent(spaceEvent())

    expect(store.processSpaceOrderEvent(spaceEvent({
      rawStatus: 'PAID',
      eventVersion: 5,
      idempotencyKey: 'same-version-new-key'
    }))).toBe('stale_dropped')
    expect(store.byId('sp-order-1')?.displayStatus).toBe('delivered')
    expect(store.byId('sp-order-1')?.eventVersion).toBe(5)
    expect(integration.processingVersions['trusted_space:sp-order-1:order_update']).toBe(5)
  })

  it('accepts a higher-version callback with the same terminal status', () => {
    const store = useSpaceOrderStore()
    store.processSpaceOrderEvent(spaceEvent())

    expect(store.processSpaceOrderEvent(spaceEvent({
      eventVersion: 6,
      idempotencyKey: 'same-status-v6'
    }))).toBe('process')
    expect(store.byId('sp-order-1')?.eventVersion).toBe(6)
  })

  it('reconciles an intent when return happens before callback', async () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    useTrustedSpacePurchaseStore().intents = [intent()]
    const adapter: TrustedSpaceAdapter = {
      syncProducts: async () => ({ items: [] }),
      getProduct: async () => undefined,
      ensureEnterpriseBinding: async () => ({ appEnterpriseId: 'ent-wanlian-logistics', status: 'active' }),
      createPurchaseLink: async () => ({ url: '', expiresAt: '' }),
      findOrderByIntent: async () => spaceEvent(),
      listUsageBills: async () => [],
      createBillDownloadLink: async () => '',
      createBillSupportLink: async () => ({ url: '', expiresAt: '' })
    }

    const mirror = await store.reconcileIntent('intent-delayed', adapter)
    expect(mirror?.purchaseIntentId).toBe('intent-delayed')
    expect(mirror?.displayStatus).toBe('delivered')
  })

  it('does not reconcile a requested intent with a lookup result for another intent', async () => {
    const store = useSpaceOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    useTrustedSpacePurchaseStore().intents = [intent(), intent({ id: 'intent-other' })]
    const adapter: TrustedSpaceAdapter = {
      syncProducts: async () => ({ items: [] }),
      getProduct: async () => undefined,
      ensureEnterpriseBinding: async () => ({ appEnterpriseId: 'ent-wanlian-logistics', status: 'active' }),
      createPurchaseLink: async () => ({ url: '', expiresAt: '' }),
      findOrderByIntent: async () => spaceEvent({ purchaseIntentId: 'intent-other' }),
      listUsageBills: async () => [],
      createBillDownloadLink: async () => '',
      createBillSupportLink: async () => ({ url: '', expiresAt: '' })
    }

    await expect(store.reconcileIntent('intent-delayed', adapter)).resolves.toBeUndefined()
    expect(store.byId('sp-order-1')).toBeUndefined()
  })

  it('dead-letters an event whose space product does not match its purchase intent', () => {
    const store = useSpaceOrderStore()
    const decision = store.processSpaceOrderEvent(spaceEvent({
      spaceProductNo: 'SPACE-OTHER-999',
      idempotencyKey: 'wrong-product'
    }))

    expect(decision).toBe('dead_letter')
    expect(store.byId('sp-order-1')).toBeUndefined()
    expect(useIntegrationStore().deadLetters).toMatchObject([{
      purchaseIntentId: 'intent-delayed',
      spaceEnterpriseId: 'space-ent-wanlian',
      spaceProductNo: 'SPACE-OTHER-999',
    }])
  })

  it('identifies returned intents as long unlinked exactly at the exported reconciliation threshold', () => {
    const returned = intent({ returnedAt: '2026-07-27T10:00:00.000Z' })

    expect(isLongUnlinkedSpacePurchase(returned, new Date('2026-07-27T10:14:59.999Z'))).toBe(false)
    expect(isLongUnlinkedSpacePurchase(returned, new Date('2026-07-27T10:15:00.000Z'))).toBe(true)
    expect(LONG_UNLINKED_SPACE_ORDER_DELAY_MS).toBe(15 * 60 * 1000)
  })

  it('dead-letters a callback that attempts to attach an existing space order to another intent', () => {
    const store = useSpaceOrderStore()
    store.processSpaceOrderEvent(spaceEvent())
    useTrustedSpacePurchaseStore().intents.push(intent({ id: 'intent-other' }))

    const decision = store.processSpaceOrderEvent(spaceEvent({
      purchaseIntentId: 'intent-other',
      eventVersion: 6,
      idempotencyKey: 'wrong-intent'
    }))

    expect(decision).toBe('dead_letter')
    expect(store.byId('sp-order-1')?.purchaseIntentId).toBe('intent-delayed')
    expect(useIntegrationStore().deadLetters).toHaveLength(1)
  })

  it('does not let a rejected high-version status regression suppress a later valid callback', () => {
    const store = useSpaceOrderStore()
    store.processSpaceOrderEvent(spaceEvent())
    expect(store.processSpaceOrderEvent(spaceEvent({
      rawStatus: 'PAID',
      eventVersion: 6,
      idempotencyKey: 'invalid-regression'
    }))).toBe('dead_letter')

    expect(store.processSpaceOrderEvent(spaceEvent({
      eventVersion: 6,
      idempotencyKey: 'valid-delivered-v6'
    }))).toBe('process')
    expect(store.byId('sp-order-1')?.eventVersion).toBe(6)
  })
})

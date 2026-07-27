import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { SpaceOrderEvent, SpacePurchaseIntent } from '@/types/trustedSpace'
import type { TrustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { useTrustedSpacePurchaseStore } from './trustedSpacePurchase'
import { useTrustedSpaceCatalogStore } from './trustedSpaceCatalog'
import { useIntegrationStore } from './integration'
import { useSpaceOrderStore } from './spaceOrders'

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

  it('reconciles an intent when return happens before callback', async () => {
    const store = useSpaceOrderStore()
    const adapter: TrustedSpaceAdapter = {
      syncProducts: async () => ({ items: [] }),
      getProduct: async () => undefined,
      ensureEnterpriseBinding: async () => ({ appEnterpriseId: 'ent-wanlian-logistics', status: 'active' }),
      createPurchaseLink: async () => ({ url: '', expiresAt: '' }),
      findOrderByIntent: async () => spaceEvent(),
      listUsageBills: async () => [],
      createBillDownloadLink: async () => '',
      createBillSupportLink: async () => ''
    }

    const mirror = await store.reconcileIntent('intent-delayed', adapter)
    expect(mirror?.purchaseIntentId).toBe('intent-delayed')
    expect(mirror?.displayStatus).toBe('delivered')
  })

  it('does not reconcile a requested intent with a lookup result for another intent', async () => {
    const store = useSpaceOrderStore()
    useTrustedSpacePurchaseStore().intents.push(intent({ id: 'intent-other' }))
    const adapter: TrustedSpaceAdapter = {
      syncProducts: async () => ({ items: [] }),
      getProduct: async () => undefined,
      ensureEnterpriseBinding: async () => ({ appEnterpriseId: 'ent-wanlian-logistics', status: 'active' }),
      createPurchaseLink: async () => ({ url: '', expiresAt: '' }),
      findOrderByIntent: async () => spaceEvent({ purchaseIntentId: 'intent-other' }),
      listUsageBills: async () => [],
      createBillDownloadLink: async () => '',
      createBillSupportLink: async () => ''
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
    expect(useIntegrationStore().deadLetters).toHaveLength(1)
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

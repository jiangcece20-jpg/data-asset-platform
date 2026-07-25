import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from './orders'
import type { Order } from '@/types/domain'

function seedOrder(over: Partial<Order> & { id: string }): Order {
  return {
    channel: 'app', ownerType: 'personal', ownerId: 'mem-1',
    productId: 'prod-logistics-monthly', productName: '物流月报', amount: 99,
    status: 'pending_payment', createdAt: '2026-07-17 09:00', ...over
  }
}

describe('orders after-sales', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('applyCharge is idempotent on repeated callbacks with the same key', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'o1' })]
    const first = store.applyCharge('o1', 99, 'key-1')
    const second = store.applyCharge('o1', 99, 'key-1')
    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(store.ledger.filter((e) => e.type === 'charge')).toHaveLength(1)
    expect(store.list[0].status).toBe('paid')
  })

  it('failed entitlement grant retries up to threshold then flags manual without reverting to unpaid', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'o1', status: 'paid', paidAt: '2026-07-17 09:01' })]
    let last = { granted: false, needsWorkOrder: false }
    for (let i = 0; i < 3; i++) last = store.grantEntitlementForOrder('o1', false)
    expect(last.needsWorkOrder).toBe(true)
    expect(store.list[0].entitlementPendingManual).toBe(true)
    expect(store.list[0].status).toBe('paid') // never reverts to unpaid
    expect(store.list[0].entitlementGrantAttempts).toBe(3)
  })

  it('successful grant is idempotent and does not double-grant', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'o1', status: 'paid' })]
    const a = store.grantEntitlementForOrder('o1', true)
    const b = store.grantEntitlementForOrder('o1', true)
    expect(a.granted).toBe(true)
    expect(b.granted).toBe(true)
    expect(store.list[0].entitlementGranted).toBe(true)
    expect(store.list[0].status).toBe('entitlement_active')
  })
})

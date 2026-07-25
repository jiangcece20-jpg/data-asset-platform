import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRefundStore } from './refunds'
import { useEntitlementStore } from './entitlements'
import type { Entitlement } from '@/types/domain'

function ent(over: Partial<Entitlement> & { id: string }): Entitlement {
  return {
    source: 'personal', type: 'item', productId: 'prod-1', ownerId: 'mem-1',
    validFrom: '2026-07-01', status: 'active', ...over
  }
}

describe('refunds store — sequencing', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup() {
    const entitlements = useEntitlementStore()
    entitlements.list = [ent({ id: 'e1' })]
    return { entitlements, refunds: useRefundStore() }
  }

  it('requestRefund freezes the entitlement and opens reviewing', () => {
    const { entitlements, refunds } = setup()
    const r = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: '客户取消', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    expect(r.status).toBe('reviewing')
    expect(entitlements.list[0].status).toBe('frozen')
    expect(entitlements.list[0].refundId).toBe(r.id)
  })

  it('revokes entitlement only after refund succeeds', () => {
    const { entitlements, refunds } = setup()
    const r = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: 'x', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    expect(entitlements.list[0].status).toBe('frozen') // not revoked yet
    refunds.executeRefund(r.id, 'succeeded')
    expect(entitlements.list[0].status).toBe('revoked')
  })

  it('restores entitlement when refund fails', () => {
    const { entitlements, refunds } = setup()
    const r = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: 'x', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    refunds.executeRefund(r.id, 'failed')
    expect(entitlements.list[0].status).toBe('active')
    expect(entitlements.list[0].refundId).toBeUndefined()
  })

  it('keeps an independent compliance freeze even if refund fails', () => {
    const entitlements = useEntitlementStore()
    entitlements.list = [ent({ id: 'e1', reverseWorkOrderId: 'rwo-1' })]
    const refunds = useRefundStore()
    const r = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: 'x', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    refunds.executeRefund(r.id, 'rejected')
    expect(entitlements.list[0].status).toBe('frozen') // compliance freeze holds
  })

  it('executeRefund is idempotent for a terminal record', () => {
    const { entitlements, refunds } = setup()
    const r = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: 'x', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    refunds.executeRefund(r.id, 'succeeded')
    const second = refunds.executeRefund(r.id, 'succeeded')
    expect(second.applied).toBe(false)
    expect(entitlements.list[0].status).toBe('revoked')
  })

  it('deduplicates a refund request by idempotency key', () => {
    const { refunds } = setup()
    const a = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: 'x', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    const b = refunds.requestRefund({ orderId: 'o1', customerId: 'mem-1', reason: 'x', amount: 99, scope: 'full', entitlementId: 'e1', idempotencyKey: 'k1' })
    expect(a.id).toBe(b.id)
    expect(refunds.list).toHaveLength(1)
  })
})

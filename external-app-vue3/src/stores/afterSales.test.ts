import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAfterSalesStore } from './afterSales'
import { useReverseWorkOrderStore } from './reverseWorkOrders'
import { useRefundStore } from './refunds'
import { useEntitlementStore } from './entitlements'
import { useContractStore } from './contracts'
import { useOrderStore } from './orders'
import type { Entitlement, Order } from '@/types/domain'
import type { EnterpriseContract } from '@/types/afterSales'

function ent(over: Partial<Entitlement> & { id: string }): Entitlement {
  return { source: 'personal', type: 'item', productId: 'prod-1', ownerId: 'mem-1', validFrom: '2026-07-01', status: 'active', ...over }
}
function order(over: Partial<Order> & { id: string }): Order {
  return { channel: 'app', ownerType: 'personal', ownerId: 'mem-1', productId: 'prod-1', productName: 'P', amount: 99, status: 'entitlement_active', createdAt: '2026-07-17 09:00', ...over }
}

describe('afterSales orchestrator', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('customer refund opens an order work order, freezes then revokes in order', () => {
    const entitlements = useEntitlementStore()
    entitlements.list = [ent({ id: 'e1' })]
    const after = useAfterSalesStore()
    const wo = useReverseWorkOrderStore()

    const { workOrderId, refundId } = after.initiateCustomerRefund({
      orderId: 'o1', customerId: 'mem-1', entitlementId: 'e1', reason: '客户取消',
      scope: 'full', amount: 99, actor: 'op-1', owner: 'op-1', reviewAt: '2026-07-18T10:00:00.000Z'
    })
    expect(wo.byId(workOrderId)?.subjectType).toBe('order')
    expect(entitlements.list[0].status).toBe('frozen') // frozen first

    after.completeCustomerRefund(refundId, 'succeeded', 'op-2')
    expect(entitlements.list[0].status).toBe('revoked') // revoked only after success
  })

  it('compliance batch refund fans out under one work order', () => {
    const entitlements = useEntitlementStore()
    entitlements.list = [ent({ id: 'e1', ownerId: 'mem-1' }), ent({ id: 'e2', ownerId: 'mem-2' })]
    const after = useAfterSalesStore()
    const refunds = useRefundStore()

    const { workOrderId, refundIds } = after.initiateComplianceBatchRefund(
      'prod-1',
      [
        { orderId: 'o1', customerId: 'mem-1', entitlementId: 'e1', amount: 99 },
        { orderId: 'o2', customerId: 'mem-2', entitlementId: 'e2', amount: 99 }
      ],
      { actor: 'op-1', owner: 'op-1', reviewAt: '2026-07-18T10:00:00.000Z' }
    )
    expect(refundIds).toHaveLength(2)
    expect(refunds.list.every((r) => r.status === 'succeeded')).toBe(true)
    expect(entitlements.list.every((e) => e.status === 'revoked')).toBe(true)
    expect(refunds.list.every((r) => r.workOrderId === workOrderId)).toBe(true)
  })

  it('payment reconciliation backfills without a duplicate entitlement', () => {
    const orders = useOrderStore()
    orders.list = [order({ id: 'o1', status: 'paid', entitlementGranted: false })]
    const after = useAfterSalesStore()
    const { action } = after.reconcilePayment('o1', 'space_success_app_stale', 'op-1')
    expect(action).toBe('backfill_order')
    expect(orders.list[0].entitlementGranted).toBe(true)
    // second reconcile is idempotent — no double grant
    after.reconcilePayment('o1', 'space_success_app_stale', 'op-1')
    expect(orders.list[0].entitlementGranted).toBe(true)
  })

  it('contract termination opens a contract work order and requires two-layer notice', () => {
    const entitlements = useEntitlementStore()
    entitlements.list = [
      { id: 's1', source: 'enterprise', type: 'seat', productId: 'prod-1', enterpriseId: 'ent-1', ownerId: 'mem-x', validFrom: '2026-07-01', status: 'active' },
      { id: 's2', source: 'enterprise', type: 'seat', productId: 'prod-1', enterpriseId: 'ent-1', ownerId: 'mem-y', validFrom: '2026-07-01', status: 'active' }
    ]
    const contracts = useContractStore()
    contracts.list = [{ id: 'c1', enterpriseId: 'ent-1', productId: 'prod-1', status: 'active', effectiveFrom: '2026-01-01', seatIds: ['s1', 's2'] } as EnterpriseContract]
    const after = useAfterSalesStore()
    const wo = useReverseWorkOrderStore()

    const { workOrderId, requiresTwoLayerNotice } = after.terminateEnterpriseContract('c1', {
      effectiveTo: '2026-12-31', enterpriseId: 'ent-1', actor: 'op-1', owner: 'op-1', reviewAt: '2026-07-18T10:00:00.000Z'
    })
    expect(wo.byId(workOrderId)?.subjectType).toBe('contract')
    expect(requiresTwoLayerNotice).toBe(true)
    expect(entitlements.list.every((e) => e.status === 'revoked')).toBe(true)
  })

  it('records an audit entry for each orchestrated action', () => {
    const entitlements = useEntitlementStore()
    entitlements.list = [ent({ id: 'e1' })]
    const after = useAfterSalesStore()
    after.initiateCustomerRefund({ orderId: 'o1', customerId: 'mem-1', entitlementId: 'e1', reason: 'x', scope: 'full', amount: 99, actor: 'op-1', owner: 'op-1', reviewAt: '2026-07-18T10:00:00.000Z' })
    expect(after.auditEntries.length).toBeGreaterThan(0)
  })
})

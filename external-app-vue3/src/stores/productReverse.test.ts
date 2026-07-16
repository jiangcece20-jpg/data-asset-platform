import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useProductReverseStore } from './productReverse'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useReverseWorkOrderStore } from './reverseWorkOrders'
import { useUserStore } from './user'
import { seedProducts } from '@/data/products'
import type { ProductReverseAction, ReverseReasonCode } from '@/types/reverseFlow'

function previewInput(productId: string, action: ProductReverseAction, reason: ReverseReasonCode, reasonDetail = 'Test reason') {
  return { productId, action, reason, reasonDetail }
}

function execInput(
  productId: string,
  action: ProductReverseAction,
  reason: ReverseReasonCode,
  preview: ReturnType<ReturnType<typeof useProductReverseStore>['previewProductReverse']>,
  actor = 'operator-a',
  owner = 'operator-a',
  reasonDetail = 'Test reason',
) {
  return {
    productId,
    action,
    reason,
    reasonDetail,
    preview,
    actor,
    owner,
    reviewAt: new Date().toISOString(),
  }
}

describe('useProductReverseStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const report = seedProducts.find((p) => p.id === 'prod-logistics-monthly')!
  const freeDashboard = seedProducts.find((p) => p.id === 'prod-port-dashboard-free')!
  const paidDashboard = seedProducts.find((p) => p.id === 'prod-freight-index')!

  it('commercial pause blocks new sales but keeps historical access active', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()
    const entitlements = useEntitlementStore()

    const preview = store.previewProductReverse(previewInput(report.id, 'pause', 'commercial_adjustment'))
    expect(preview.policy.createsWorkOrder).toBe(true)

    const result = store.executeProductReverse(execInput(report.id, 'pause', 'commercial_adjustment', preview))
    expect(result.workOrderId).toBeTruthy()

    const product = catalog.byId(report.id)!
    expect(product.availability).toBe('paused')
    expect(product.serviceStatus).toBe('normal')

    // Historical entitlement remains active
    const ent = entitlements.list.find((e) => e.productId === report.id)
    expect(ent?.status).toBe('active')
  })

  it('compliance recall suspends service and freezes affected entitlements', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()
    const entitlements = useEntitlementStore()

    const preview = store.previewProductReverse(previewInput(report.id, 'recall', 'compliance_risk'))
    const result = store.executeProductReverse(execInput(report.id, 'recall', 'compliance_risk', preview))

    const product = catalog.byId(report.id)!
    expect(product.availability).toBe('paused')
    expect(product.serviceStatus).toBe('suspended')

    const ent = entitlements.list.find((e) => e.productId === report.id)
    expect(ent?.status).toBe('frozen')
    expect(ent?.reverseWorkOrderId).toBe(result.workOrderId)
  })

  it('upstream delist terminates service and marks affected entitlements migrating', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()
    const entitlements = useEntitlementStore()

    const preview = store.previewProductReverse(previewInput(report.id, 'delist', 'upstream_stop'))
    const result = store.executeProductReverse(execInput(report.id, 'delist', 'upstream_stop', preview))

    const product = catalog.byId(report.id)!
    expect(product.availability).toBe('delisted')
    expect(product.serviceStatus).toBe('terminated')

    const ent = entitlements.list.find((e) => e.productId === report.id)
    expect(ent?.status).toBe('migrating')
    expect(ent?.reverseWorkOrderId).toBe(result.workOrderId)
  })

  it('pausing an unowned free product does not create an unnecessary work order', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()

    const preview = store.previewProductReverse(previewInput(freeDashboard.id, 'pause', 'commercial_adjustment'))
    expect(preview.policy.createsWorkOrder).toBe(false)
    expect(preview.impact.customerIds).toHaveLength(0)

    const result = store.executeProductReverse(execInput(freeDashboard.id, 'pause', 'commercial_adjustment', preview))
    expect(result.workOrderId).toBeUndefined()

    const product = catalog.byId(freeDashboard.id)!
    expect(product.availability).toBe('paused')
    expect(product.serviceStatus).toBe('normal')
  })

  it('resume sales refuses while an open S1 or S2 work order exists', () => {
    const store = useProductReverseStore()

    // Create an S1 compliance recall
    const preview = store.previewProductReverse(previewInput(report.id, 'recall', 'compliance_risk'))
    store.executeProductReverse(execInput(report.id, 'recall', 'compliance_risk', preview))

    // Try to resume sales
    expect(() => store.resumeSales(report.id, 'operator-a')).toThrow()
  })

  it('restoring service requires cross-system verification and unfreezes only this work order', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()
    const entitlements = useEntitlementStore()
    const woStore = useReverseWorkOrderStore()

    // Freeze entitlements via compliance recall
    const preview = store.previewProductReverse(previewInput(report.id, 'recall', 'compliance_risk'))
    const result = store.executeProductReverse(execInput(report.id, 'recall', 'compliance_risk', preview))
    const workOrderId = result.workOrderId!

    // Entitlements should be frozen
    expect(entitlements.list.find((e) => e.productId === report.id)?.status).toBe('frozen')

    // Advance work order to cross_system_verification
    // executeProductReverse already moved it to impact_analysis
    woStore.transition(workOrderId, 'plan_confirmation', 'operator-a')
    woStore.confirmPlan(workOrderId, 'operator-b')
    woStore.transition(workOrderId, 'executing', 'operator-a')
    // No customers in this test? Wait - the report has a seed entitlement, so there IS a customer.
    // Need to deliver notice and complete compensation
    const notices = woStore.noticesFor(workOrderId)
    notices.forEach((n) => woStore.markNoticeDelivered(workOrderId, n.id, 'system'))
    const comps = woStore.compensationsFor(workOrderId)
    // compliance_risk → freeze treatment, no compensations
    woStore.transition(workOrderId, 'customer_handling', 'operator-a')
    woStore.transition(workOrderId, 'cross_system_verification', 'operator-a')

    // Restore service
    store.restoreService(report.id, workOrderId, 'operator-a')

    // Entitlements should be active again
    expect(entitlements.list.find((e) => e.productId === report.id)?.status).toBe('active')
    // Service should be normal
    expect(catalog.byId(report.id)?.serviceStatus).toBe('normal')
  })

  it('resuming sales does not silently restore recommendation placement', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()

    // prod-freight-index has '热门' tag
    expect(catalog.recommendSlotProducts.some((p) => p.id === paidDashboard.id)).toBe(true)

    // Pause it (no customers affected for this product since no seed entitlement)
    const preview = store.previewProductReverse(previewInput(paidDashboard.id, 'pause', 'commercial_adjustment'))
    store.executeProductReverse(execInput(paidDashboard.id, 'pause', 'commercial_adjustment', preview))

    // '热门' tag should be removed
    expect(catalog.byId(paidDashboard.id)?.tags).not.toContain('热门')

    // Resume sales
    store.resumeSales(paidDashboard.id, 'operator-a')

    // Product should be published but NOT in recommendSlotProducts
    expect(catalog.byId(paidDashboard.id)?.availability).toBe('published')
    expect(catalog.recommendSlotProducts.some((p) => p.id === paidDashboard.id)).toBe(false)
  })

  it('records owner, review time, and append-only audit even when no work order is needed', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()

    const reviewAt = new Date().toISOString()
    const preview = store.previewProductReverse(previewInput(freeDashboard.id, 'pause', 'commercial_adjustment'))
    store.executeProductReverse({
      ...execInput(freeDashboard.id, 'pause', 'commercial_adjustment', preview, 'operator-a', 'operator-b'),
      reviewAt,
    })

    const product = catalog.byId(freeDashboard.id)!
    expect(product.salesReviewOwner).toBe('operator-b')
    expect(product.salesReviewAt).toBe(reviewAt)

    // Audit entry should exist
    expect(store.auditEntries.some((a) => a.productId === freeDashboard.id)).toBe(true)
  })

  it('raises an otherwise S3 action to S2 when more than one customer is affected', () => {
    const store = useProductReverseStore()
    const entitlements = useEntitlementStore()
    const woStore = useReverseWorkOrderStore()

    // Grant a second entitlement for the same product to a different user
    entitlements.list.push({
      id: 'ent-test-extra',
      source: 'personal',
      type: 'item',
      productId: report.id,
      productVersion: report.typeDetail.report?.version,
      ownerId: 'mem-2',
      validFrom: '2026-07-17',
      status: 'active',
    })

    const preview = store.previewProductReverse(previewInput(report.id, 'pause', 'commercial_adjustment'))
    // Preview policy severity is S3
    expect(preview.policy.severity).toBe('S3')

    const result = store.executeProductReverse(execInput(report.id, 'pause', 'commercial_adjustment', preview))
    // Work order severity should be escalated to S2
    const wo = woStore.byId(result.workOrderId!)
    expect(wo?.severity).toBe('S2')
  })

  it('removes a stopped product from discovery while preserving direct historical lookup', () => {
    const store = useProductReverseStore()
    const catalog = useCatalogStore()

    // Product should be discoverable before
    expect(catalog.discoverable.some((p) => p.id === report.id)).toBe(true)

    const preview = store.previewProductReverse(previewInput(report.id, 'pause', 'commercial_adjustment'))
    store.executeProductReverse(execInput(report.id, 'pause', 'commercial_adjustment', preview))

    // Not discoverable after pause
    expect(catalog.discoverable.some((p) => p.id === report.id)).toBe(false)
    // But still accessible by ID
    expect(catalog.byId(report.id)).toBeTruthy()
  })
})

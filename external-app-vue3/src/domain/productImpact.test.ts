import { describe, expect, it } from 'vitest'
import { buildProductImpactSnapshot } from './productImpact'
import type { Order, Entitlement } from '../types/domain'
import type {
  ProductImpactTrial,
  ProductImpactListingRequest,
  ProductImpactEnterpriseMember,
  ProductImpactReference,
  ProductImpactContract,
  ProductImpactOrderRef,
} from './productImpact'

const productId = 'prod-logistics-monthly'

describe('buildProductImpactSnapshot', () => {
  it('includes an in-flight trusted-space order using its enterprise as the impacted customer', () => {
    const spaceOrders: ProductImpactOrderRef[] = [
      { id: 'space-1', productId, ownerId: 'ent-wanlian-logistics', status: 'delivering' },
    ]

    const snapshot = buildProductImpactSnapshot({
      id: 'impact-space-001', productId, createdAt: '2026-07-17T10:00:00.000Z',
      orders: [], spaceOrders, entitlements: [], trials: [], listingRequests: [], enterpriseMembers: [], catalogReferences: [], contracts: [],
    })

    expect(snapshot.inFlightOrderIds).toContain('space-1')
    expect(snapshot.customerIds).toContain('ent-wanlian-logistics')
  })

  it('aggregates in-flight orders, active entitlements, members, trials, requests, references, and contracts', () => {
    const orders: Order[] = [
      {
        id: 'ord-inflight-1',
        channel: 'app',
        ownerType: 'personal',
        ownerId: 'mem-1',
        productId,
        productName: 'Report',
        amount: 99,
        status: 'pending_payment',
        createdAt: '2026-07-17T08:00:00.000Z',
      },
      {
        id: 'ord-completed',
        channel: 'app',
        ownerType: 'personal',
        ownerId: 'mem-1',
        productId,
        productName: 'Report',
        amount: 99,
        status: 'entitlement_active',
        createdAt: '2026-07-10T08:00:00.000Z',
        paidAt: '2026-07-10T08:01:00.000Z',
      },
    ]

    const entitlements: Entitlement[] = [
      {
        id: 'ent-active',
        source: 'personal',
        type: 'item',
        productId,
        productVersion: 'V2026-07',
        ownerId: 'mem-1',
        validFrom: '2026-07-10',
        status: 'active',
      },
      {
        id: 'ent-frozen',
        source: 'personal',
        type: 'item',
        productId,
        ownerId: 'mem-3',
        validFrom: '2026-07-10',
        status: 'frozen',
      },
      {
        id: 'ent-expired',
        source: 'personal',
        type: 'item',
        productId,
        ownerId: 'mem-4',
        validFrom: '2026-06-01',
        status: 'expired',
      },
    ]

    const trials: ProductImpactTrial[] = [
      { id: 'trial-1', productId, ownerId: 'mem-2', status: 'approved' },
    ]

    const listingRequests: ProductImpactListingRequest[] = [
      { id: 'lr-1', productId, userId: 'mem-5', status: 'evaluating' },
    ]

    const enterpriseMembers: ProductImpactEnterpriseMember[] = [
      { id: 'em-1', enterpriseId: 'ent-corp-a', productId, status: 'active' },
      { id: 'em-2', enterpriseId: 'ent-corp-b', productId, status: 'active' },
    ]

    const catalogReferences: ProductImpactReference[] = [
      { id: 'ref-1', productId, type: 'recommendation' },
      { id: 'ref-2', productId, type: 'ai_reference' },
    ]

    const contracts: ProductImpactContract[] = [
      { id: 'contract-1', productId, customerId: 'ent-corp-a', status: 'active' },
    ]
    const spaceOrders: ProductImpactOrderRef[] = [
      { id: 'ord-inflight-2', productId, ownerId: 'ent-corp-space', status: 'delivering' },
    ]

    const snapshot = buildProductImpactSnapshot({
      id: 'impact-001',
      productId,
      createdAt: '2026-07-17T10:00:00.000Z',
      orders,
      spaceOrders,
      entitlements,
      trials,
      listingRequests,
      enterpriseMembers,
      catalogReferences,
      contracts,
    })

    // Only in-flight order IDs
    expect(snapshot.inFlightOrderIds).toEqual(['ord-inflight-1', 'ord-inflight-2'])

    // Active + frozen entitlements, not expired
    expect(snapshot.activeEntitlementIds).toEqual(['ent-active', 'ent-frozen'])

    // Both enterprise members
    expect(snapshot.enterpriseMemberIds).toEqual(['em-1', 'em-2'])

    // Trial, listing request, references, contract
    expect(snapshot.trialIds).toEqual(['trial-1'])
    expect(snapshot.listingRequestIds).toEqual(['lr-1'])
    expect(snapshot.catalogReferenceIds).toEqual(['ref-1', 'ref-2'])
    expect(snapshot.contractIds).toEqual(['contract-1'])

    // Deduplicated customer IDs (mem-1 appears in both order and entitlement)
    expect(snapshot.customerIds).toContain('mem-1')
    expect(snapshot.customerIds).toContain('mem-2')
    expect(snapshot.customerIds).toContain('ent-corp-space')
    expect(snapshot.customerIds).toContain('mem-3')
    expect(snapshot.customerIds).toContain('mem-5')
    expect(snapshot.customerIds).toContain('ent-corp-a')
    expect(snapshot.customerIds).toContain('ent-corp-b')
    // mem-4 from expired entitlement should NOT be included
    expect(snapshot.customerIds).not.toContain('mem-4')
    // Deduplicated: mem-1 only once
    expect(snapshot.customerIds.filter((c) => c === 'mem-1')).toHaveLength(1)

    expect(snapshot.isComplete).toBe(true)
  })

  it('returns immutable arrays that do not change when inputs are mutated', () => {
    const orders: Order[] = [
      {
        id: 'ord-1',
        channel: 'app',
        ownerType: 'personal',
        ownerId: 'mem-1',
        productId,
        productName: 'Report',
        amount: 99,
        status: 'paid',
        createdAt: '2026-07-17T08:00:00.000Z',
      },
    ]

    const snapshot = buildProductImpactSnapshot({
      id: 'impact-002',
      productId,
      createdAt: '2026-07-17T10:00:00.000Z',
      orders,
      spaceOrders: [],
      entitlements: [],
      trials: [],
      listingRequests: [],
      enterpriseMembers: [],
      catalogReferences: [],
      contracts: [],
    })

    const originalIds = [...snapshot.inFlightOrderIds]
    const originalCustomers = [...snapshot.customerIds]

    // Mutate input arrays after snapshot
    orders.push({
      id: 'ord-2',
      channel: 'app',
      ownerType: 'personal',
      ownerId: 'mem-99',
      productId,
      productName: 'Report',
      amount: 99,
      status: 'paid',
      createdAt: '2026-07-17T09:00:00.000Z',
    })

    expect(snapshot.inFlightOrderIds).toEqual(originalIds)
    expect(snapshot.customerIds).toEqual(originalCustomers)
  })
})

import { describe, expect, it } from 'vitest'
import type { Entitlement, Order, Product } from '@/types/domain'
import { orderExpiryText } from './orderExpiry'

const product = {
  memberIncluded: false,
  price: { model: 'item_only' },
  acquisitions: ['item_purchase'],
  entitlementPolicy: { kind: 'term', months: 12 }
} as Product

const memberFree = {
  memberIncluded: true,
  price: { model: 'member_free' },
  acquisitions: ['member', 'item_purchase'],
  memberBenefits: [{ tier: 'standard', mode: 'free' }]
} as Product

function order(over: Partial<Order>): Order {
  return {
    id: 'o1',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    productId: 'prod-1',
    productName: '货运指数',
    amount: 99,
    status: 'entitlement_active',
    createdAt: '2026-07-17T09:00:00.000Z',
    paidAt: '2026-07-17T09:01:00.000Z',
    ...over
  }
}

describe('orderExpiryText', () => {
  it('uses entitlement update end date when present', () => {
    const entitlements = [{
      id: 'ent-1',
      orderId: 'o1',
      type: 'dataset',
      source: 'personal',
      ownerId: 'mem-1',
      validFrom: '2025-08-10',
      updateValidTo: '2026-08-17',
      status: 'active'
    }] as Entitlement[]
    expect(orderExpiryText({
      order: order({ entitlementId: 'ent-1' }),
      product,
      entitlements
    })).toBe('2026-08-17')
  })

  it('uses membership expiry for membership orders', () => {
    const entitlements = [{
      id: 'ent-m',
      type: 'member',
      source: 'personal',
      ownerId: 'mem-1',
      validFrom: '2026-07-04',
      validTo: '2027-07-04',
      status: 'active'
    }] as Entitlement[]
    expect(orderExpiryText({
      order: order({ productId: 'membership', productName: '普通会员 · 12 个月' }),
      entitlements
    })).toBe('2027-07-04')
  })

  it('uses membership expiry for member-free products without a product entitlement', () => {
    expect(orderExpiryText({
      order: order({ productId: 'prod-freight-index' }),
      product: memberFree,
      entitlements: [],
      memberExpiresAt: '2027-07-04'
    })).toBe('会员到期 2027-07-04')
  })

  it('does not invent an expiry before payment is confirmed', () => {
    expect(orderExpiryText({
      order: order({ status: 'pending_payment', selectedTermMonths: 12, paidAt: undefined }),
      product,
      entitlements: []
    })).toBe('—')
  })
})

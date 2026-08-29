import { describe, expect, it } from 'vitest'
import {
  resolveProductActions,
  resolveProductListActionHint,
  resolvePurchaseInProgress,
  type ProductActionContext
} from './productAccess'
import { formatYuan } from './membership'
import type { Order } from '@/types/domain'
import type { SpaceIntentOrder } from '@/types/spaceIntent'

const base: ProductActionContext = {
  type: 'dataset',
  availability: 'published',
  acquisitions: ['space_purchase'],
  hasAccess: false,
  hasOpenListingRequest: false,
  enterpriseAuthenticated: false,
  serviceStatus: 'normal',
}

const ownedProduct: ProductActionContext = {
  ...base,
  hasAccess: true,
}

function order(partial: Partial<Order> & Pick<Order, 'id' | 'status'>): Order {
  return {
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    productId: 'prod-x',
    productName: 'X',
    amount: 99,
    createdAt: '2026-08-01T10:00:00',
    ...partial
  }
}

describe('resolveProductActions', () => {
  it('uses purchase CTA on list cards when both member and item paths exist', () => {
    expect(resolveProductListActionHint({
      ...base,
      type: 'dashboard',
      acquisitions: ['member', 'item_purchase'],
      memberBenefit: 'free',
      itemPrice: 199
    })).toBe('购买')
  })

  it('keeps member-only list CTA when there is no item price', () => {
    expect(resolveProductListActionHint({
      ...base,
      type: 'dashboard',
      acquisitions: ['member'],
      memberBenefit: 'free'
    })).toBe('开通会员')
  })

  it('prioritizes existing access', () => {
    expect(resolveProductActions({ ...base, hasAccess: true }).primary.key).toBe('view')
  })

  it('routes candidates to listing requests', () => {
    expect(resolveProductActions({ ...base, availability: 'candidate' }).primary.key).toBe('request_listing')
  })

  it('routes requested candidates to listing progress', () => {
    expect(resolveProductActions({ ...base, availability: 'candidate', hasOpenListingRequest: true }).primary.key).toBe('listing_progress')
  })

  it('routes preparing assets to progress', () => {
    expect(resolveProductActions({ ...base, availability: 'preparing' }).primary.key).toBe('listing_progress')
  })

  it('lets any unpublished-access user submit a space intent without enterprise auth', () => {
    expect(resolveProductActions(base).primary).toEqual({
      key: 'submit_space_intent',
      label: '提交试用申请'
    })
    expect(resolveProductActions({ ...base, enterpriseAuthenticated: true }).primary.key).toBe('submit_space_intent')
  })

  it('does not disable the space intent CTA when the space snapshot is stale', () => {
    expect(resolveProductActions({
      ...base,
      enterpriseAuthenticated: true,
      trustedPurchaseCheck: { allowed: false, reason: 'product_stale' }
    }).primary).toEqual({ key: 'submit_space_intent', label: '提交试用申请' })
  })

  it('offers a single purchase button when both member and item paths exist', () => {
    const actions = resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase'],
      itemPrice: 199
    })
    expect(actions.primary).toEqual({ key: 'item_purchase', label: '立即购买' })
    expect(actions.secondary).toBeUndefined()
  })

  it('keeps member-only CTA when there is no item price', () => {
    expect(resolveProductActions({
      ...base,
      type: 'dashboard',
      acquisitions: ['member'],
      memberBenefit: 'free'
    }).primary).toEqual({ key: 'member_purchase', label: '开通个人会员，免费看本商品' })
  })

  it('uses the same purchase label for free and discount membership benefits', () => {
    const free = resolveProductActions({
      ...base,
      type: 'dashboard',
      acquisitions: ['member', 'item_purchase'],
      memberBenefit: 'free',
      itemPrice: 199
    })
    expect(free.primary).toEqual({ key: 'item_purchase', label: '立即购买' })
    expect(free.secondary).toBeUndefined()

    const discount = resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase'],
      identitySubject: 'enterprise',
      memberBenefit: 'discount',
      itemPrice: 1990,
      discountZhe: 6
    })
    expect(discount.primary).toEqual({ key: 'item_purchase', label: '立即购买' })
    expect(discount.secondary).toBeUndefined()
  })

  it('keeps only member-price purchase after membership is effective on a discount product', () => {
    expect(resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase'],
      hasEffectiveMembership: true,
      canPurchaseMembership: false,
      memberBenefit: 'discount',
      memberItemPrice: 119
    }).primary).toEqual({ key: 'item_purchase', label: `会员价购买 ${formatYuan(119)}` })
  })

  it('hides membership purchase when the account already has a team VIP', () => {
    expect(resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase'],
      canPurchaseMembership: false,
      itemPrice: 199
    }).primary).toEqual({ key: 'item_purchase', label: `单品购买 ${formatYuan(199)}` })
  })

  it('opens free products without purchase', () => {
    expect(resolveProductActions({ ...base, type: 'dashboard', acquisitions: ['free'] }).primary.key).toBe('free_view')
  })

  it('routes APP-owned datasets to the dedicated dataset checkout', () => {
    expect(resolveProductActions({ ...base, acquisitions: ['item_purchase'] }).primary).toEqual({
      key: 'dataset_purchase',
      label: '购买数据集'
    })
  })

  it('routes APP-owned datasets with member benefits to item checkout dual path', () => {
    expect(resolveProductActions({
      ...base,
      acquisitions: ['member', 'item_purchase'],
      itemPrice: 199
    }).primary).toEqual({
      key: 'item_purchase',
      label: '立即购买'
    })
  })

  it('routes seller-market datasets to item checkout', () => {
    expect(resolveProductActions({
      ...base,
      origin: 'seller_market',
      acquisitions: ['item_purchase']
    }).primary).toEqual({
      key: 'item_purchase',
      label: '购买数据集'
    })
  })

  it('blocks paused and delisted products', () => {
    expect(resolveProductActions({ ...base, availability: 'paused' }).primary.key).toBe('unavailable')
    expect(resolveProductActions({ ...base, availability: 'delisted' }).primary.key).toBe('unavailable')
  })

  it('allows historical access when sales are paused but service remains normal', () => {
    expect(resolveProductActions({
      ...ownedProduct,
      availability: 'paused',
      serviceStatus: 'normal',
    }).primary.key).toBe('view')
  })

  it('blocks historical access when compliance handling suspends service', () => {
    expect(resolveProductActions({
      ...ownedProduct,
      availability: 'paused',
      serviceStatus: 'suspended',
    }).primary).toMatchObject({ key: 'unavailable', label: '服务风险处置中' })
  })

  it('keeps access during a degraded quality incident', () => {
    expect(resolveProductActions({
      ...ownedProduct,
      availability: 'paused',
      serviceStatus: 'degraded',
    }).primary.key).toBe('view')
  })

  it('blocks access when service is terminated', () => {
    expect(resolveProductActions({
      ...ownedProduct,
      availability: 'delisted',
      serviceStatus: 'terminated',
    }).primary.key).toBe('unavailable')
  })

  it('shows 继续付款 for pending_payment purchase-in-progress', () => {
    expect(resolveProductActions({
      ...base,
      acquisitions: ['item_purchase'],
      purchaseInProgress: { phase: 'pending_payment', orderId: 'ord-1', canPay: true }
    }).primary).toEqual({ key: 'continue_payment', label: '继续付款' })
  })

  it('shows fulfilling labels by order status', () => {
    expect(resolveProductActions({
      ...base,
      acquisitions: ['item_purchase'],
      purchaseInProgress: { phase: 'fulfilling', orderId: 'ord-1', status: 'paid' }
    }).primary).toEqual({ key: 'delivery_progress', label: '查看交付进度' })
    expect(resolveProductActions({
      ...base,
      acquisitions: ['item_purchase'],
      purchaseInProgress: { phase: 'fulfilling', orderId: 'ord-1', status: 'pending_activation' }
    }).primary.label).toBe('待开通')
  })

  it('shows intent progress instead of submit-intent while space intent is open', () => {
    expect(resolveProductActions({
      ...base,
      purchaseInProgress: { phase: 'space_intent', intentId: 'intent-1', userStatus: 'submitted' }
    }).primary).toEqual({ key: 'intent_progress', label: '查看订单' })
    expect(resolveProductActions({
      ...base,
      purchaseInProgress: { phase: 'space_intent', intentId: 'intent-1', userStatus: 'processing' }
    }).primary.label).toBe('意向处理中')
  })
})

describe('resolvePurchaseInProgress', () => {
  it('prefers open APP order over space intent', () => {
    const phase = resolvePurchaseInProgress({
      productId: 'prod-x',
      ownerMemberId: 'mem-1',
      orders: [order({ id: 'ord-1', status: 'paid', createdAt: '2026-08-02T10:00:00' })],
      intents: [{
        id: 'intent-1',
        productId: 'prod-x',
        productType: 'api',
        ownerMemberId: 'mem-1',
        contactName: '陈静',
        contactPhone: '138',
        scenario: '试用',
        opsStatus: 'unclaimed',
        createdAt: '2026-08-03T10:00:00',
        updatedAt: '2026-08-03T10:00:00'
      } satisfies SpaceIntentOrder]
    })
    expect(phase).toEqual({ phase: 'fulfilling', orderId: 'ord-1', status: 'paid' })
  })

  it('maps open space intent to user-facing intent status', () => {
    expect(resolvePurchaseInProgress({
      productId: 'prod-x',
      ownerMemberId: 'mem-1',
      orders: [],
      intents: [{
        id: 'intent-1',
        productId: 'prod-x',
        productType: 'dataset',
        ownerMemberId: 'mem-1',
        contactName: '陈静',
        contactPhone: '138',
        scenario: '试用',
        opsStatus: 'processing',
        createdAt: '2026-08-03T10:00:00',
        updatedAt: '2026-08-03T10:00:00'
      }]
    })).toEqual({ phase: 'space_intent', intentId: 'intent-1', userStatus: 'processing' })
  })

  it('marks seller or space-converted pending_payment as not canPay', () => {
    expect(resolvePurchaseInProgress({
      productId: 'prod-x',
      ownerMemberId: 'mem-1',
      orders: [order({ id: 'ord-s', status: 'pending_payment', sellerId: 'seller-1' })],
      intents: []
    })).toEqual({ phase: 'pending_payment', orderId: 'ord-s', canPay: false })
  })
})

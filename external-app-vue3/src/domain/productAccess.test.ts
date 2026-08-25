import { describe, expect, it } from 'vitest'
import { resolveProductActions, type ProductActionContext } from './productAccess'
import { formatYuan } from './membership'

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

describe('resolveProductActions', () => {
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

  it('offers membership first and item purchase second', () => {
    const actions = resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase']
    })
    expect(actions.primary.key).toBe('member_purchase')
    expect(actions.secondary?.key).toBe('item_purchase')
  })

  it('uses dual-path labels for free and discount membership benefits', () => {
    const free = resolveProductActions({
      ...base,
      type: 'dashboard',
      acquisitions: ['member', 'item_purchase'],
      memberBenefit: 'free',
      itemPrice: 199
    })
    expect(free.primary).toEqual({ key: 'member_purchase', label: '开通个人会员，免费看本商品' })
    expect(free.secondary).toEqual({ key: 'item_purchase', label: `单品购买 ${formatYuan(199)}` })

    const discount = resolveProductActions({
      ...base,
      type: 'report',
      acquisitions: ['member', 'item_purchase'],
      identitySubject: 'enterprise',
      memberBenefit: 'discount',
      itemPrice: 1990,
      discountZhe: 6
    })
    expect(discount.primary).toEqual({ key: 'member_purchase', label: '开通团队会员，享6折' })
    expect(discount.secondary).toEqual({ key: 'item_purchase', label: `原价购买 ${formatYuan(1990)}` })
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
})

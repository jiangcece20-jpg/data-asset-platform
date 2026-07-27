import { describe, expect, it } from 'vitest'
import { resolveProductActions, type ProductActionContext } from './productAccess'

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

  it('requires enterprise authentication before trusted-space purchase', () => {
    expect(resolveProductActions(base).primary.key).toBe('enterprise_auth')
    expect(resolveProductActions({ ...base, enterpriseAuthenticated: true }).primary.key).toBe('space_purchase')
  })

  it('disables trusted-space purchase when the product snapshot is stale', () => {
    expect(resolveProductActions({
      ...base,
      enterpriseAuthenticated: true,
      trustedPurchaseCheck: { allowed: false, reason: 'product_stale' }
    }).primary).toEqual({ key: 'unavailable', label: '商品信息待更新', disabled: true })
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

  it('opens free products without purchase', () => {
    expect(resolveProductActions({ ...base, type: 'dashboard', acquisitions: ['free'] }).primary.key).toBe('free_view')
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

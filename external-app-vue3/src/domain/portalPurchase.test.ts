import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { portalPurchaseActions } from './portalPurchase'

describe('portalPurchaseActions', () => {
  it('does not offer purchasing to a trial member', () => {
    const product = seedProducts.find((item) => item.id === 'prod-logistics-monthly')!
    expect(portalPurchaseActions(product, { loggedIn: true, subject: 'personal', memberTier: null })).toEqual([
      { key: 'unavailable', label: '试用会员不能购买或申请。', disabled: true }
    ])
  })
})

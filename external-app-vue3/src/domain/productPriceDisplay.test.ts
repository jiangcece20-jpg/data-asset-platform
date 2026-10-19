import { describe, expect, it } from 'vitest'
import { ownedProductPriceLine, productDetailPriceSummary, productPriceLines } from './productPriceDisplay'
import { seedProducts } from '@/data/products'

function product(id: string) {
  const found = seedProducts.find((item) => item.id === id)
  if (!found) throw new Error(`missing ${id}`)
  return found
}

describe('productPriceLines', () => {
  it('shows member-free summary without a personal item price', () => {
    expect(productPriceLines(product('prod-freight-index'), 'personal')).toEqual({
      singleLine: '会员免费'
    })
  })

  it('shows the enterprise member discount price', () => {
    const price = productPriceLines(product('prod-logistics-monthly'), 'personal')
    expect(price.singleLine).toBe(productPriceLines(product('prod-logistics-monthly'), 'enterprise').singleLine)
    expect(price.singleLine).toMatch(/^¥/)
  })

  it('does not add a starting-price suffix for a single enterprise plan', () => {
    const fixed = structuredClone(product('prod-logistics-monthly'))
    fixed.commerceOffers = fixed.commerceOffers?.filter((offer) =>
      offer.subject !== 'personal' || offer.id === 'offer-monthly-personal-current'
    )

    expect(productPriceLines(fixed, 'personal').singleLine).not.toContain('起')
  })

  it('uses the same enterprise scheme regardless of the current identity', () => {
    expect(productPriceLines(product('prod-seller-route-board'), 'personal').singleLine).toBe('¥1,990 / 12个月')
    expect(productPriceLines(product('prod-seller-route-board'), 'enterprise').singleLine).toBe('¥1,990 / 12个月')
  })
})

describe('ownedProductPriceLine', () => {
  it('uses team ownership language for enterprise entitlements', () => {
    expect(ownedProductPriceLine('enterprise')).toBe('团队已购')
  })
})

describe('productDetailPriceSummary', () => {
  it('returns list and member prices for app payment products', () => {
    expect(productDetailPriceSummary(product('prod-logistics-monthly'), 'personal')).toMatchObject({
      listPrice: 199,
      listPriceText: '¥199',
      memberPriceText: '¥119.4',
      memberPrice: 119.4,
      purchaseNote: '可直接购买，或开通会员享权益价'
    })
  })

  it('returns member free text for member-free products', () => {
    expect(productDetailPriceSummary(product('prod-freight-index'), 'personal')).toMatchObject({
      listPriceText: '¥199',
      memberPriceText: '会员免费'
    })
  })
})

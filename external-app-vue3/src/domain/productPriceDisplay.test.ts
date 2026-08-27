import { describe, expect, it } from 'vitest'
import { productDetailPriceSummary, productPriceLines } from './productPriceDisplay'
import { seedProducts } from '@/data/products'

function product(id: string) {
  const found = seedProducts.find((item) => item.id === id)
  if (!found) throw new Error(`missing ${id}`)
  return found
}

describe('productPriceLines', () => {
  it('shows item and member-free summary for dashboard products', () => {
    expect(productPriceLines(product('prod-freight-index'), 'personal')).toEqual({
      itemLine: '¥199 起',
      memberLine: '会员免费',
      singleLine: '¥199 起 · 会员免费'
    })
  })

  it('shows item and member discount summary', () => {
    expect(productPriceLines(product('prod-logistics-monthly'), 'personal')).toEqual({
      itemLine: '¥199 起',
      memberLine: '会员 ¥119.4 起',
      singleLine: '¥199 起 · 会员 ¥119.4 起'
    })
  })

  it('uses enterprise item price for enterprise subject', () => {
    expect(productPriceLines(product('prod-freight-index'), 'enterprise').itemLine).toBe('¥1,990 起')
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

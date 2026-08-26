import { describe, expect, it } from 'vitest'
import {
  ITEM_DISCOUNT_ZHE_DEFAULT,
  hasMarketingDiscount,
  itemDiscountZheOk,
  itemSalePrice,
  originalPriceOk,
  resolveItemOfferPricing,
  roundPrice1
} from './itemPricing'

describe('itemPricing', () => {
  it('computes sale price from original and discount zhe', () => {
    expect(itemSalePrice(100, 8.5)).toBe(85)
    expect(itemSalePrice(199, 10)).toBe(199)
    expect(itemSalePrice(99.9, 7.5)).toBe(74.9)
  })

  it('validates original price and discount zhe', () => {
    expect(originalPriceOk(100)).toBe(true)
    expect(originalPriceOk(100.1)).toBe(true)
    expect(originalPriceOk(100.12)).toBe(false)
    expect(originalPriceOk(0)).toBe(false)
    expect(originalPriceOk(10_000_000)).toBe(false)

    expect(itemDiscountZheOk(10)).toBe(true)
    expect(itemDiscountZheOk(8.5)).toBe(true)
    expect(itemDiscountZheOk(0)).toBe(false)
    expect(itemDiscountZheOk(10.1)).toBe(false)
    expect(itemDiscountZheOk(ITEM_DISCOUNT_ZHE_DEFAULT)).toBe(true)
  })

  it('detects marketing discount below 10 zhe', () => {
    expect(hasMarketingDiscount(9.9)).toBe(true)
    expect(hasMarketingDiscount(10)).toBe(false)
  })

  it('resolves legacy offers without original/discount fields', () => {
    expect(resolveItemOfferPricing({ price: 199 })).toEqual({
      originalPrice: 199,
      discountZhe: 10,
      salePrice: 199
    })
  })

  it('rounds to one decimal place', () => {
    expect(roundPrice1(119.44)).toBe(119.4)
  })
})

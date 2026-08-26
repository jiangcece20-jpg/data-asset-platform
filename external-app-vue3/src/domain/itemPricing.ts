/** 单品营销折扣默认值：10 折 = 不打营销折。 */
export const ITEM_DISCOUNT_ZHE_DEFAULT = 10

export function roundPrice1(amount: number): number {
  if (!Number.isFinite(amount)) return 0
  return Number(amount.toFixed(1))
}

export function hasOneDecimalAtMost(value: number): boolean {
  return roundPrice1(value) === value
}

export function originalPriceOk(value: number): boolean {
  return Number.isFinite(value)
    && value > 0
    && value <= 9_999_999
    && hasOneDecimalAtMost(value)
}

/** 单品营销折扣：> 0 且 ≤ 10，最多 1 位小数；10 表示售价等于原价。 */
export function itemDiscountZheOk(value: number): boolean {
  return Number.isFinite(value)
    && value > 0
    && value <= 10
    && hasOneDecimalAtMost(value)
}

export function itemSalePrice(originalPrice: number, discountZhe: number): number {
  return roundPrice1(originalPrice * (discountZhe / 10))
}

export function hasMarketingDiscount(discountZhe: number): boolean {
  return itemDiscountZheOk(discountZhe) && discountZhe < 10
}

export function resolveItemOfferPricing(offer: {
  price: number
  originalPrice?: number
  discountZhe?: number
}): { originalPrice: number; discountZhe: number; salePrice: number } {
  const discountZhe = offer.discountZhe ?? ITEM_DISCOUNT_ZHE_DEFAULT
  const originalPrice = offer.originalPrice ?? offer.price
  const salePrice = itemDiscountZheOk(discountZhe) && originalPriceOk(originalPrice)
    ? itemSalePrice(originalPrice, discountZhe)
    : roundPrice1(offer.price)
  return {
    originalPrice: roundPrice1(originalPrice),
    discountZhe,
    salePrice
  }
}

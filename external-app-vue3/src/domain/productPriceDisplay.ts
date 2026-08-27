import type { Product } from '@/types/domain'
import type { PurchaseIdentitySubject } from '@/domain/purchaseIdentity'
import { commerceOffersOf } from '@/domain/commerceOffers'
import { formatYuan, productMemberBenefit, productMemberDiscountFactor } from '@/domain/membership'
import { roundPrice1 } from '@/domain/itemPricing'
import { discountToZhe } from '@/domain/memberBenefits'

export interface ProductPriceLines {
  itemLine?: string
  memberLine?: string
  singleLine: string
}

export interface ProductDetailPriceSummary {
  listPrice?: number
  listPriceText?: string
  memberPriceText?: string
  memberPrice?: number
  purchaseNote?: string
}

function minOfferPrice(product: Product, subject: PurchaseIdentitySubject): number | undefined {
  const offers = commerceOffersOf(product).filter((offer) => offer.subject === subject)
  if (!offers.length) return undefined
  return Math.min(...offers.map((offer) => offer.price))
}

function memberPriceLine(product: Product, itemPrice?: number): string | undefined {
  const benefit = productMemberBenefit(product)
  if (benefit === 'free') return '会员免费'
  if (benefit === 'discount' && itemPrice != null) {
    const factor = productMemberDiscountFactor(product)
    if (factor == null) return undefined
    return `会员 ${formatYuan(roundPrice1(itemPrice * factor))} 起`
  }
  return undefined
}

/** 列表卡片：只展示当前身份可理解的最低价摘要，不含交易按钮。 */
export function productPriceLines(product: Product, subject: PurchaseIdentitySubject): ProductPriceLines {
  if (product.acquisitions.includes('free')) {
    return { singleLine: '免费' }
  }

  if (product.dealChannel === 'space_purchase') {
    const offers = commerceOffersOf(product)
    if (offers.length) {
      const min = Math.min(...offers.map((offer) => offer.price))
      return { singleLine: `${formatYuan(min)} 起` }
    }
    return { singleLine: product.price.quoteNote || '询价' }
  }

  const itemPrice = minOfferPrice(product, subject)
  const hasItem = product.acquisitions.includes('item_purchase') && itemPrice != null
  const hasMember = product.acquisitions.includes('member')
  const benefit = productMemberBenefit(product)

  if (hasMember && !hasItem) {
    if (benefit === 'free') return { singleLine: '会员免费' }
    const zhe = discountToZhe(productMemberDiscountFactor(product))
    return { singleLine: zhe ? `会员 ${zhe} 折` : '会员优惠' }
  }

  if (!hasItem && product.price.model === 'quote') {
    return { singleLine: product.price.quoteNote || '询价' }
  }

  const itemLine = hasItem ? `${formatYuan(itemPrice!)} 起` : undefined
  const memberLine = hasMember ? memberPriceLine(product, itemPrice) : undefined
  const displayParts = [itemLine, memberLine].filter(Boolean) as string[]

  return {
    itemLine,
    memberLine,
    singleLine: displayParts.length ? displayParts.join(' · ') : (product.price.quoteNote || '询价')
  }
}

/** 详情页价格区：展示当前身份单品价与会员权益价。 */
export function productDetailPriceSummary(product: Product, subject: PurchaseIdentitySubject): ProductDetailPriceSummary | null {
  if (product.acquisitions.includes('free')) {
    return { listPriceText: '免费', purchaseNote: '无需支付即可查看' }
  }
  if (product.dealChannel === 'space_purchase') {
    return null
  }

  const listPrice = minOfferPrice(product, subject)
  const hasItem = product.acquisitions.includes('item_purchase') && listPrice != null
  const hasMember = product.acquisitions.includes('member')
  if (!hasItem && !hasMember) return null

  const benefit = productMemberBenefit(product)
  const rawMemberLine = hasMember ? memberPriceLine(product, listPrice) : undefined
  const memberPriceText = hasMember
    ? (benefit === 'free'
      ? '会员免费'
      : rawMemberLine?.replace(/^会员 /, '').replace(/ 起$/, ''))
    : undefined
  const memberPrice = benefit === 'discount' && listPrice != null
    ? roundPrice1(listPrice * (productMemberDiscountFactor(product) ?? 1))
    : undefined

  return {
    listPrice,
    listPriceText: hasItem ? formatYuan(listPrice!) : undefined,
    memberPriceText,
    memberPrice,
    purchaseNote: hasItem && hasMember ? '点击「立即购买」后选择直接购买或开通会员' : undefined
  }
}

export function ownedProductPriceLine(access: 'none' | 'member' | 'item' | 'enterprise'): string | undefined {
  if (access === 'member') return '会员可看'
  if (access === 'item') return '已购买'
  if (access === 'enterprise') return '企业已购'
  return undefined
}

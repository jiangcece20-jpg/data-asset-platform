import type { Product } from '@/types/domain'
import { commerceOffersOf } from './commerceOffers'

export interface PricingPresentation {
  label: string
  note: string
}

/** 将底层价格字段收口成用户能理解的报价方式。 */
export function pricingPresentation(product: Product): PricingPresentation {
  const synchronized = product.dealChannel === 'space_purchase'
  const authorityNote = synchronized ? '价格由可信空间同步，APP 只展示、不改价' : '价格由 APP 商品配置'
  const apiPlans = product.typeDetail.api?.pricingPlans ?? []
  const datasetOffers = product.datasetOffers ?? []
  const commerceOffers = commerceOffersOf(product)

  if (synchronized && apiPlans.length > 0) {
    return { label: '按量 / 套餐', note: authorityNote }
  }
  if (synchronized && datasetOffers.length > 1) {
    return { label: '多方案报价', note: authorityNote }
  }
  if (datasetOffers.length > 0) {
    return { label: '一次性 / 持续更新', note: `${authorityNote}，个人和企业按购买主体选择方案；持续方案设最长有效期` }
  }
  if (commerceOffers.length > 0) {
    return { label: '一次性 / 持续服务', note: `${authorityNote}，按购买主体、交付方式和有效期选择方案` }
  }

  switch (product.price.model) {
    case 'free':
      return { label: '免费', note: '无需支付，按商品规则直接使用' }
    case 'member_free':
      return { label: '会员权益', note: '会员权益范围内免费使用' }
    case 'member_discount':
      return { label: '固定价 / 会员优惠', note: authorityNote }
    case 'quote':
      return { label: '询价', note: synchronized ? authorityNote : (product.price.quoteNote || '提交需求后确认报价') }
    case 'item_only':
    default:
      return { label: '固定价', note: authorityNote }
  }
}

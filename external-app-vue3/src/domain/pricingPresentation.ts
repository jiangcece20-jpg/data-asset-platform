import type { Product } from '@/types/domain'
import { commerceOffersOf, salePeriodMonthsOf } from './commerceOffers'

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
  if (!synchronized && commerceOffers.length > 0) {
    return {
      label: '个人 / 企业单品价',
      note: `${authorityNote}，固定购买周期 ${salePeriodMonthsOf(product)} 个月；订单创建后锁定，用户不可自选周期`
    }
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

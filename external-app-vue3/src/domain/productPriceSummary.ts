import type { CommerceOffer, Product } from '@/types/domain'
import { commerceOffersOf, datasetOfferToCommerce } from './commerceOffers'
import { purchaseMoney } from './portalPurchase'

export type PriceSummaryKind = 'free' | 'money' | 'quote' | 'none'

export interface ProductPriceSummary {
  kind: PriceSummaryKind
  /** 主文案：免费 / ¥99 / 待报价 / 已下架 */
  text: string
  /** 后缀，如「起」「/年」，与主文案拼接展示 */
  suffix?: string
  /** 灰色补充说明，如「多方案可选」「会员专享价」 */
  hint?: string
}

const PRICE_IN_TEXT = /¥\s*([\d,]+(?:\.\d+)?)/

function periodSuffix(months?: number): string {
  if (!months) return ''
  if (months % 12 === 0) return '/年'
  return `/${months}个月`
}

function cheapestOffer(offers: CommerceOffer[]): CommerceOffer {
  return offers.reduce((min, offer) => (offer.price < min.price ? offer : min))
}

/**
 * 商品起步价摘要：用于详情头部与右栏购买卡片，保证用户在任何位置都能看到价格锚点。
 * 询价制商品（可信空间无报价）返回 quote；免费商品返回 free。
 */
export function productPriceSummary(product: Product): ProductPriceSummary {
  if (product.availability === 'delisted' || product.status === 'delisted') {
    return { kind: 'none', text: '已下架' }
  }
  if (product.availability === 'candidate' || product.availability === 'preparing') {
    return { kind: 'none', text: '暂未定价' }
  }

  if (product.dealChannel === 'space_purchase') {
    const offers = product.commerceOffers?.length ? product.commerceOffers : product.datasetOffers ?? []
    if (offers.length) {
      const cheapest = cheapestOffer(offers)
      const multi = offers.length > 1
      return {
        kind: 'money',
        text: purchaseMoney(cheapest.price),
        suffix: `${periodSuffix(cheapest.billingPeriodMonths)}${multi ? ' 起' : ''}`,
        hint: multi ? '多方案可选' : undefined
      }
    }
    const plans = product.typeDetail.api?.pricingPlans ?? []
    const planPrices = plans
      .map((plan) => PRICE_IN_TEXT.exec(plan.price)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value.replace(/,/g, '')))
    if (planPrices.length) {
      const min = Math.min(...planPrices)
      const perCall = plans.some((plan) => /\/\s*次/.test(plan.price))
      return {
        kind: 'money',
        text: purchaseMoney(min),
        suffix: perCall ? '/次 起' : ' 起',
        hint: '多套餐可选'
      }
    }
    return { kind: 'quote', text: '待报价', hint: '提交申请后由提供方报价' }
  }

  const freeOnly = product.acquisitions.includes('free') && !product.acquisitions.includes('item_purchase')
  if (freeOnly) return { kind: 'free', text: '免费' }

  // 收口后的单品价用于定价；周期信息取原始 offers（收口会抹掉订阅周期）
  const offers = commerceOffersOf(product, true)
  if (offers.length) {
    const configured = product.commerceOffers?.length
      ? product.commerceOffers
      : product.datasetOffers?.map(datasetOfferToCommerce) ?? []
    const personal = offers.filter((offer) => offer.subject === 'personal')
    const pool = personal.length ? personal : offers
    const cheapest = cheapestOffer(pool)
    const rawOfSubject = configured.filter((offer) => offer.subject === cheapest.subject)
    const periodSource = rawOfSubject.length ? cheapestOffer(rawOfSubject) : cheapest
    const memberOnly = !product.acquisitions.includes('item_purchase') && product.acquisitions.includes('member')
    return {
      kind: 'money',
      text: purchaseMoney(cheapest.price),
      suffix: `${periodSuffix(periodSource.billingPeriodMonths)} 起`,
      hint: memberOnly ? '会员专享价' : undefined
    }
  }

  return { kind: 'quote', text: '待报价' }
}

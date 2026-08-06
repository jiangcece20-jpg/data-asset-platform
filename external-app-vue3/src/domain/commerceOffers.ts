import type {
  CommerceContentKind,
  CommerceOffer,
  CommerceServiceMode,
  DatasetOffer,
  Product,
  ProductType
} from '@/types/domain'

const oneTimeKind: Record<ProductType, CommerceContentKind> = {
  dataset: 'snapshot',
  report: 'current_version',
  dashboard: 'fixed_dashboard',
  api: 'quota_package'
}

const continuousKind: Record<ProductType, CommerceContentKind> = {
  dataset: 'continuous_updates',
  report: 'continuous_updates',
  dashboard: 'continuous_updates',
  api: 'continuous_service'
}

const typeName: Record<ProductType, string> = {
  dataset: '数据',
  report: '报告',
  dashboard: '看板',
  api: 'API'
}

export function datasetOfferToCommerce(offer: DatasetOffer): CommerceOffer {
  const serviceMode: CommerceServiceMode = offer.licenseKind === 'subscription' ? 'continuous' : 'one_time'
  return {
    ...offer,
    serviceMode: offer.serviceMode || serviceMode,
    contentKind: offer.contentKind || (serviceMode === 'continuous' ? 'continuous_updates' : 'snapshot'),
    billingPeriodMonths: serviceMode === 'continuous' ? (offer.billingPeriodMonths || offer.termMonths || 12) : undefined,
    maxTermMonths: serviceMode === 'continuous' ? (offer.maxTermMonths || offer.termMonths || 12) : undefined
  }
}

/**
 * 为尚未迁移的 Mock 生成四套默认方案，让所有 APP 商品都能演示统一配置。
 * 显式 commerceOffers / datasetOffers 始终优先。
 */
export function commerceOffersOf(product: Product): CommerceOffer[] {
  if (product.commerceOffers?.length) return product.commerceOffers
  if (product.datasetOffers?.length) return product.datasetOffers.map(datasetOfferToCommerce)
  if (product.dealChannel !== 'app_payment' || !product.acquisitions.includes('item_purchase')) return []

  const base = Math.max(1, product.price.itemPrice || 100)
  const make = (
    subject: 'personal' | 'enterprise',
    serviceMode: CommerceServiceMode,
    price: number
  ): CommerceOffer => ({
    id: `offer-${product.id}-${subject}-${serviceMode}`,
    name: `${subject === 'personal' ? '个人' : '企业'}${serviceMode === 'one_time' ? '一次性' : '持续'}${typeName[product.type]}方案`,
    subject,
    price,
    currency: 'CNY',
    serviceMode,
    contentKind: serviceMode === 'one_time' ? oneTimeKind[product.type] : continuousKind[product.type],
    billingPeriodMonths: serviceMode === 'continuous' ? 12 : undefined,
    maxTermMonths: serviceMode === 'continuous' ? 36 : undefined,
    accessScope: subject === 'personal' ? 'personal' : 'named_seats',
    seats: subject === 'enterprise' ? 10 : undefined,
    allowDownload: product.type === 'report' || product.type === 'dataset',
   recommended: subject === 'enterprise' && serviceMode === 'continuous'
  })

  return [
    make('personal', 'one_time', base),
    make('personal', 'continuous', base * 3),
    make('enterprise', 'one_time', base * 10),
    make('enterprise', 'continuous', base * 24)
  ]
}

export function offerTermOptions(offer: CommerceOffer): number[] {
  if (offer.serviceMode !== 'continuous') return []
  const period = Math.max(1, offer.billingPeriodMonths || 12)
  const max = Math.max(period, offer.maxTermMonths || period)
  const result: number[] = []
  for (let months = period; months <= max; months += period) result.push(months)
  return result
}

export function normalizeOfferTerm(offer: CommerceOffer, selectedTermMonths?: number): number | undefined {
  if (offer.serviceMode !== 'continuous') return undefined
  const allowed = offerTermOptions(offer)
  const selected = selectedTermMonths || allowed[0]
  if (!allowed.includes(selected)) throw new Error(`购买期限必须按计价周期选择，最长 ${offer.maxTermMonths || offer.billingPeriodMonths || 12} 个月`)
  return selected
}

export function offerAmount(offer: CommerceOffer, selectedTermMonths?: number): number {
  const term = normalizeOfferTerm(offer, selectedTermMonths)
  if (!term) return offer.price
  return offer.price * (term / Math.max(1, offer.billingPeriodMonths || term))
}

export function offerDescription(offer: CommerceOffer): string {
  const content: Record<CommerceContentKind, string> = {
    snapshot: '购买时点快照',
    current_version: '当前版本',
    fixed_dashboard: '固定数据版本',
    quota_package: '固定调用量包',
    continuous_updates: '持续获得更新',
    continuous_service: '持续调用服务'
  }
  if (offer.serviceMode === 'one_time') return `${content[offer.contentKind]} · 一次性交付`
  return `${content[offer.contentKind]} · ¥${offer.price.toLocaleString()}/${offer.billingPeriodMonths || 12}个月 · 最长可购${offer.maxTermMonths || offer.billingPeriodMonths || 12}个月`
}

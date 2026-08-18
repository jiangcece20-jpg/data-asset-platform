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

/** APP 商品只暴露当前主体的一条单品价；旧多方案 Mock 在读取时收口，可信空间多方案保持原样。 */
export function commerceOffersOf(product: Product): CommerceOffer[] {
  const configured = product.commerceOffers?.length
    ? product.commerceOffers
    : product.datasetOffers?.length
      ? product.datasetOffers.map(datasetOfferToCommerce)
      : []

  if (product.dealChannel !== 'app_payment') return configured
  if (!product.acquisitions.includes('item_purchase')) return []

  const base = Math.max(1, product.price.itemPrice || 100)
  return (['personal', 'enterprise'] as const).flatMap((subject) => {
    const candidates = configured.filter((offer) => offer.subject === subject)
    const source = candidates.find((offer) => offer.serviceMode === 'one_time') ?? candidates[0]
    if (!source && configured.length) return []
    const fallback: CommerceOffer = {
      id: `offer-${product.id}-${subject}-item`,
      name: subject === 'personal' ? '个人单品' : '企业单品',
      subject,
      price: subject === 'personal' ? base : base * 10,
      currency: 'CNY',
      serviceMode: 'one_time',
      contentKind: oneTimeKind[product.type],
      accessScope: subject === 'personal' ? 'personal' : 'enterprise_wide',
      allowDownload: product.type === 'report' || product.type === 'dataset'
    }
    return [{
      ...(source ?? fallback),
      name: subject === 'personal' ? '个人单品' : '企业单品',
      serviceMode: 'one_time',
      contentKind: oneTimeKind[product.type],
      billingPeriodMonths: undefined,
      maxTermMonths: undefined,
      recommended: false
    }]
  })
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

/** 商品当前可售卖周期；兼容旧商品的权益期限，未配置时默认 12 个月。 */
export function salePeriodMonthsOf(product: Pick<Product, 'salePeriodMonths' | 'entitlementPolicy'>): number {
  if (product.salePeriodMonths && product.salePeriodMonths > 0) return product.salePeriodMonths
  if (product.entitlementPolicy?.kind === 'term' && product.entitlementPolicy.months > 0) {
    return product.entitlementPolicy.months
  }
  return 12
}

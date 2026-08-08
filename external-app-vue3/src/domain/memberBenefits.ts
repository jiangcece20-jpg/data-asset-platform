import type { MemberBenefitConfig, MemberTier, PriceModel, Product, ProductPrice } from '@/types/domain'

export const MEMBER_TIER_LABELS: Record<MemberTier, string> = {
  standard: '普通会员',
  premium: '高级会员'
}

export function normalizeDiscountFactor(zheOrFactor: number): number {
  const value = Number(zheOrFactor)
  if (!Number.isFinite(value) || value <= 0) return 0.6
  if (value > 0 && value < 1) return Math.min(0.99, Math.max(0.1, Number(value.toFixed(2))))
  return Math.min(0.99, Math.max(0.1, Number((value / 10).toFixed(2))))
}

export function discountToZhe(factor?: number): number {
  if (factor == null || !Number.isFinite(factor)) return 6
  return Number((factor * 10).toFixed(1))
}

/** 从商品配置解析会员权益；兼容旧字段 memberIncluded / price.model */
export function resolveMemberBenefits(product: Pick<Product, 'memberBenefits' | 'memberIncluded' | 'price' | 'acquisitions'>): MemberBenefitConfig[] {
  if (product.memberBenefits?.length) {
    return normalizeMemberBenefits(product.memberBenefits)
  }

  const legacy: MemberBenefitConfig[] = []
  if (product.price.model === 'member_discount' || product.price.memberDiscount != null) {
    legacy.push({
      tier: 'standard',
      mode: 'discount',
      discount: normalizeDiscountFactor(product.price.memberDiscount ?? 0.6)
    })
  } else if (product.memberIncluded || product.price.model === 'member_free') {
    legacy.push({ tier: 'standard', mode: 'free' })
  }

  if (product.price.premiumMemberDiscount != null) {
    legacy.push({
      tier: 'premium',
      mode: 'discount',
      discount: normalizeDiscountFactor(product.price.premiumMemberDiscount)
    })
  }

  return normalizeMemberBenefits(legacy)
}

/** 同级只保留一条；跨级可并存 */
export function normalizeMemberBenefits(list: MemberBenefitConfig[]): MemberBenefitConfig[] {
  const byTier = new Map<MemberTier, MemberBenefitConfig>()
  for (const item of list) {
    if (item.mode === 'discount') {
      byTier.set(item.tier, {
        tier: item.tier,
        mode: 'discount',
        discount: normalizeDiscountFactor(item.discount ?? 0.6)
      })
    } else {
      byTier.set(item.tier, { tier: item.tier, mode: 'free' })
    }
  }
  const order: MemberTier[] = ['standard', 'premium']
  return order.filter((tier) => byTier.has(tier)).map((tier) => byTier.get(tier)!)
}

export function deriveLegacyMemberFields(benefits: MemberBenefitConfig[], basePrice: ProductPrice, hasFreeAcquisition: boolean, hasItem: boolean): {
  memberIncluded: boolean
  price: ProductPrice
} {
  const normalized = normalizeMemberBenefits(benefits)
  const standard = normalized.find((item) => item.tier === 'standard')
  const premium = normalized.find((item) => item.tier === 'premium')
  const memberIncluded = normalized.some((item) => item.mode === 'free')

  let model: PriceModel = 'item_only'
  if (normalized.some((item) => item.mode === 'discount')) model = 'member_discount'
  else if (memberIncluded) model = 'member_free'
  else if (hasFreeAcquisition && !hasItem) model = 'free'

  return {
    memberIncluded,
    price: {
      ...basePrice,
      model,
      memberDiscount: standard?.mode === 'discount' ? standard.discount : undefined,
      premiumMemberDiscount: premium?.mode === 'discount' ? premium.discount : undefined
    }
  }
}

export function formatMemberBenefitsLabel(benefits: MemberBenefitConfig[]): string {
  if (!benefits.length) return ''
  return benefits.map((item) => {
    const tier = MEMBER_TIER_LABELS[item.tier]
    if (item.mode === 'free') return `${tier}免费`
    return `${tier}${discountToZhe(item.discount)}折`
  }).join(' · ')
}

/** 用户会员等级是否覆盖某商品的「免费」权益 */
export function memberTierCoversFree(product: Product, userTier?: MemberTier | null): boolean {
  if (!userTier) return false
  const covered: MemberTier[] = userTier === 'premium' ? ['standard', 'premium'] : ['standard']
  return resolveMemberBenefits(product).some((item) => item.mode === 'free' && covered.includes(item.tier))
}

/** 用户会员等级对应的可用折扣（优先更高/匹配等级） */
export function memberTierDiscount(product: Product, userTier?: MemberTier | null): number | undefined {
  if (!userTier) return undefined
  const benefits = resolveMemberBenefits(product)
  if (userTier === 'premium') {
    const premium = benefits.find((item) => item.tier === 'premium' && item.mode === 'discount')
    if (premium?.discount != null) return premium.discount
  }
  const standard = benefits.find((item) => item.tier === 'standard' && item.mode === 'discount')
  return standard?.discount
}

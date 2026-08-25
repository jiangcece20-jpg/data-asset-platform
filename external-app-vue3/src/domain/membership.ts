import type { Product } from '@/types/domain'
import { commerceOffersOf } from '@/domain/commerceOffers'
import { discountToZhe, resolveMemberBenefits } from '@/domain/memberBenefits'
import type { PurchaseIdentitySubject } from '@/domain/purchaseIdentity'

export type MembershipKind = 'personal' | 'team' | 'combo'
export type ProductMemberBenefit = 'none' | 'free' | 'discount'

export interface MembershipPlan {
  kind: Exclude<MembershipKind, 'combo'>
  name: string
  shortName: string
  price: number
  months: number
  note: string
}

export const MEMBERSHIP_PLANS: Record<'personal' | 'team', MembershipPlan> = {
  personal: {
    kind: 'personal',
    name: '万联灵析个人版',
    shortName: '个人会员',
    price: 1099,
    months: 12,
    note: '标准会员 · 仅个人身份生效'
  },
  team: {
    kind: 'team',
    name: '万联灵析企业版',
    shortName: '团队会员',
    price: 3199,
    months: 12,
    note: '5 个租户 + 20 个子账户 · 仅当前企业身份生效'
  }
}

export function membershipPlanForSubject(subject: PurchaseIdentitySubject): MembershipPlan {
  return subject === 'enterprise' ? MEMBERSHIP_PLANS.team : MEMBERSHIP_PLANS.personal
}

/** 商品对生效会员的权益：免费可直接看，折扣仍需付折后单品款。普通档优先。 */
export function productMemberBenefit(product: Pick<Product, 'acquisitions' | 'memberBenefits' | 'memberIncluded' | 'price'>): ProductMemberBenefit {
  if (!product.acquisitions.includes('member')) return 'none'
  const benefits = resolveMemberBenefits(product)
  const standard = benefits.find((item) => item.tier === 'standard')
  if (standard) return standard.mode
  if (benefits.some((item) => item.mode === 'free')) return 'free'
  if (benefits.some((item) => item.mode === 'discount')) return 'discount'
  return 'free'
}

export function productMemberDiscountFactor(product: Pick<Product, 'acquisitions' | 'memberBenefits' | 'memberIncluded' | 'price'>): number | undefined {
  if (productMemberBenefit(product) !== 'discount') return undefined
  const benefits = resolveMemberBenefits(product)
  const standard = benefits.find((item) => item.tier === 'standard' && item.mode === 'discount')
  return standard?.discount ?? benefits.find((item) => item.mode === 'discount')?.discount
}

export function itemListPriceOf(product: Product, subject: PurchaseIdentitySubject): number | undefined {
  return commerceOffersOf(product).find((offer) => offer.subject === subject)?.price
}

export function memberDiscountedAmount(listPrice: number, product: Product, hasEffectiveMembership: boolean): number {
  if (product.origin === 'seller_market') return listPrice
  if (!hasEffectiveMembership) return listPrice
  const factor = productMemberDiscountFactor(product)
  if (factor == null) return listPrice
  return Math.round(listPrice * factor)
}

export function formatYuan(amount: number): string {
  return `¥${amount.toLocaleString()}`
}

export interface MembershipActionFields {
  identitySubject: PurchaseIdentitySubject
  memberBenefit: ProductMemberBenefit
  hasEffectiveMembership: boolean
  canPurchaseMembership: boolean
  itemPrice?: number
  memberItemPrice?: number
  discountZhe?: number
}

export function membershipActionFields(product: Product, options: {
  identitySubject: PurchaseIdentitySubject
  hasEffectiveMembership: boolean
  canPurchaseMembership: boolean
}): MembershipActionFields {
  const memberBenefit = productMemberBenefit(product)
  const itemPrice = itemListPriceOf(product, options.identitySubject)
  const factor = productMemberDiscountFactor(product)
  return {
    identitySubject: options.identitySubject,
    memberBenefit,
    hasEffectiveMembership: options.hasEffectiveMembership,
    canPurchaseMembership: options.canPurchaseMembership,
    itemPrice,
    memberItemPrice: memberBenefit === 'discount' && itemPrice != null && factor != null
      ? Math.round(itemPrice * factor)
      : undefined,
    discountZhe: memberBenefit === 'discount' ? discountToZhe(factor) : undefined
  }
}

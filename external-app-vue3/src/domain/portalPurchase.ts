import type { MemberTier, Product } from '@/types/domain'
import type { PurchaseIdentitySubject } from './purchaseIdentity'
import { commerceOffersOf } from './commerceOffers'
import { resolveMemberBenefits } from './memberBenefits'

export type PurchasePricePath = 'item' | 'member'
export type PortalPurchaseKey = PurchasePricePath | 'subscribe' | 'free' | 'trial' | 'login' | 'unavailable' | 'listing'
export interface PortalPurchaseAction {
  key: PortalPurchaseKey
  label: string
  disabled?: boolean
}
export interface PortalPurchaseContext {
  loggedIn: boolean
  subject: PurchaseIdentitySubject
  memberTier: MemberTier | null
}

export const purchaseMoney = (amount: number) => `¥${amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`

export function purchaseMemberBenefit(product: Product, tier: MemberTier | null) {
  const benefits = resolveMemberBenefits(product)
  return benefits.find((benefit) => benefit.tier === (tier ?? 'standard'))
    ?? benefits.find((benefit) => benefit.tier === 'standard')
    ?? benefits[0]
    ?? { tier: 'standard' as const, mode: 'free' as const }
}

export function purchasePrice(product: Product, subject: PurchaseIdentitySubject, path: PurchasePricePath, tier: MemberTier | null): number {
  const price = commerceOffersOf(product, true).find((offer) => offer.subject === subject)?.price
  if (path === 'member' && product.origin !== 'seller_market') {
    const benefit = purchaseMemberBenefit(product, tier)
    if (benefit.mode === 'free') return 0
    if (price == null) throw new Error('未配置当前主体价格')
    return Math.round((price * (benefit.discount ?? 0.6) + Number.EPSILON) * 100) / 100
  }
  if (price == null) throw new Error('未配置当前主体价格')
  return price
}

export function portalPurchaseActions(product: Product, context: PortalPurchaseContext): PortalPurchaseAction[] {
  if (product.availability === 'delisted' || product.status === 'delisted') {
    return [{ key: 'unavailable', label: '已下架', disabled: true }]
  }
  if (product.availability === 'candidate' || product.availability === 'preparing') {
    return [{ key: 'listing', label: product.availability === 'candidate' ? '求上架' : '查看上架进度' }]
  }
  const space = product.dealChannel === 'space_purchase'
  const free = !space && product.acquisitions.includes('free')
  if (!context.loggedIn) {
    return [{ key: 'login', label: space ? '登录后提交试用申请' : free ? '登录后免费获取' : '登录查看价格' }]
  }
  if (space) return [{ key: 'trial', label: '提交试用申请' }]
  if (free) return [{ key: 'free', label: '免费获取' }]
  const actions: PortalPurchaseAction[] = []
  if (product.acquisitions.includes('item_purchase')) {
    actions.push({ key: 'item', label: `单品购买｜${purchaseMoney(purchasePrice(product, context.subject, 'item', context.memberTier))}` })
  }
  if (product.origin !== 'seller_market' && product.acquisitions.includes('member')) {
    const price = purchaseMoney(purchasePrice(product, context.subject, 'member', context.memberTier))
    actions.push(context.memberTier
      ? { key: 'member', label: `会员价｜${price}` }
      : { key: 'subscribe', label: `开通会员｜会员价 ${price}` })
  }
  return actions.length ? actions : [{ key: 'unavailable', label: '暂不可购', disabled: true }]
}

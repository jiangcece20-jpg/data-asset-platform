import type { Product } from '@/types/domain'
import type { PurchaseIdentitySubject } from '@/domain/purchaseIdentity'
import { formatYuan, memberDiscountedAmount, membershipActionFields, productMemberBenefit } from '@/domain/membership'
import { roundPrice1 } from '@/domain/itemPricing'

export interface CheckoutDualPathContext {
  product: Product
  identitySubject: PurchaseIdentitySubject
  hasEffectiveMembership: boolean
  canPurchaseMembership: boolean
  isSellerMarket: boolean
}

export function shouldShowCheckoutDualPath(context: CheckoutDualPathContext): boolean {
  if (context.isSellerMarket) return false
  if (context.hasEffectiveMembership) return false
  if (context.canPurchaseMembership === false) return false
  if (!context.product.acquisitions.includes('member')) return false
  if (!context.product.acquisitions.includes('item_purchase')) return false
  return productMemberBenefit(context.product) !== 'none'
}

export function becomeMemberLabel(subject: PurchaseIdentitySubject): string {
  return subject === 'enterprise' ? '成为团队会员' : '成为个人会员'
}

export function memberPurchaseSavingsAmount(
  itemPrice: number,
  product: Product,
  hasEffectiveMembership: boolean
): number {
  const memberPrice = memberDiscountedAmount(itemPrice, product, true)
  const benefit = productMemberBenefit(product)
  if (benefit === 'free') return roundPrice1(itemPrice)
  if (benefit === 'discount') return roundPrice1(Math.max(0, itemPrice - memberPrice))
  return 0
}

export function memberPurchaseSavingsLabel(itemPrice: number, product: Product): string {
  const savings = memberPurchaseSavingsAmount(itemPrice, product, false)
  if (savings <= 0) return '成为会员更划算'
  return `会员购买立省 ${formatYuan(savings)}`
}

export function checkoutDualPathFields(product: Product, options: {
  identitySubject: PurchaseIdentitySubject
  hasEffectiveMembership: boolean
  canPurchaseMembership: boolean
  isSellerMarket: boolean
  itemPrice: number
}) {
  const membership = membershipActionFields(product, {
    identitySubject: options.identitySubject,
    hasEffectiveMembership: options.hasEffectiveMembership,
    canPurchaseMembership: options.canPurchaseMembership
  })
  const showDualPath = shouldShowCheckoutDualPath({
    product,
    identitySubject: options.identitySubject,
    hasEffectiveMembership: options.hasEffectiveMembership,
    canPurchaseMembership: options.canPurchaseMembership,
    isSellerMarket: options.isSellerMarket
  })
  return {
    showDualPath,
    savingsLabel: showDualPath ? memberPurchaseSavingsLabel(options.itemPrice, product) : undefined,
    memberButtonLabel: showDualPath ? becomeMemberLabel(options.identitySubject) : undefined,
    memberBenefit: membership.memberBenefit
  }
}

export function previewOrderNo(productId: string): string {
  const suffix = productId.replace(/^prod-/, '').slice(0, 8).toUpperCase()
  const stamp = Date.now().toString().slice(-8)
  return `ORD${stamp}${suffix}`
}

import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import {
  checkoutDualPathFields,
  memberPurchaseSavingsAmount,
  memberPurchaseSavingsLabel,
  previewOrderNo,
  shouldShowCheckoutDualPath
} from './checkoutDualPath'

function discountProduct(): Product {
  return {
    id: 'prod-logistics-monthly',
    acquisitions: ['member', 'item_purchase'],
    memberBenefits: [{ tier: 'standard', mode: 'discount', discount: 0.6 }],
    price: { model: 'member_discount', itemPrice: 199 }
  } as Product
}

describe('checkoutDualPath', () => {
  it('shows dual path for personal and enterprise non-members', () => {
    expect(shouldShowCheckoutDualPath({
      product: discountProduct(),
      identitySubject: 'personal',
      hasEffectiveMembership: false,
      canPurchaseMembership: true,
      isSellerMarket: false
    })).toBe(true)
    expect(shouldShowCheckoutDualPath({
      product: discountProduct(),
      identitySubject: 'enterprise',
      hasEffectiveMembership: false,
      canPurchaseMembership: true,
      isSellerMarket: false
    })).toBe(true)
  })

  it('hides dual path for effective members and seller market', () => {
    expect(shouldShowCheckoutDualPath({
      product: discountProduct(),
      identitySubject: 'personal',
      hasEffectiveMembership: true,
      canPurchaseMembership: false,
      isSellerMarket: false
    })).toBe(false)
    expect(shouldShowCheckoutDualPath({
      product: discountProduct(),
      identitySubject: 'personal',
      hasEffectiveMembership: false,
      canPurchaseMembership: true,
      isSellerMarket: true
    })).toBe(false)
  })

  it('computes savings label from item and member prices', () => {
    expect(memberPurchaseSavingsAmount(199, discountProduct(), false)).toBe(79.6)
    expect(memberPurchaseSavingsLabel(199, discountProduct())).toBe('会员购买立省 ¥79.6')
  })

  it('builds checkout dual path fields', () => {
    const fields = checkoutDualPathFields(discountProduct(), {
      identitySubject: 'personal',
      hasEffectiveMembership: false,
      canPurchaseMembership: true,
      isSellerMarket: false,
      itemPrice: 199
    })
    expect(fields.showDualPath).toBe(true)
    expect(fields.savingsLabel).toContain('立省')
    expect(fields.memberButtonLabel).toBe('成为个人会员')
  })

  it('uses team member label for enterprise checkout', () => {
    const fields = checkoutDualPathFields(discountProduct(), {
      identitySubject: 'enterprise',
      hasEffectiveMembership: false,
      canPurchaseMembership: true,
      isSellerMarket: false,
      itemPrice: 1990
    })
    expect(fields.showDualPath).toBe(true)
    expect(fields.memberButtonLabel).toBe('成为团队会员')
    expect(fields.savingsLabel).toBe('会员购买立省 ¥796')
  })

  it('generates a preview order number', () => {
    expect(previewOrderNo('prod-freight-index')).toMatch(/^ORD\d+[A-Z-]+$/)
  })
})

import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import {
  itemListPriceOf,
  memberDiscountedAmount,
  membershipActionFields,
  membershipPlanForSubject,
  productMemberBenefit,
  productMemberDiscountFactor
} from './membership'

describe('membership', () => {
  const freight = seedProducts.find((product) => product.id === 'prod-freight-index')!
  const report = seedProducts.find((product) => product.id === 'prod-logistics-monthly')!

  it('treats freight index as member-free and the monthly report as member-discount', () => {
    expect(productMemberBenefit(freight)).toBe('free')
    expect(productMemberBenefit(report)).toBe('discount')
    expect(productMemberDiscountFactor(report)).toBe(0.6)
  })

  it('prices membership by current identity', () => {
    expect(membershipPlanForSubject('personal')).toMatchObject({ shortName: '个人会员', price: 1099 })
    expect(membershipPlanForSubject('enterprise')).toMatchObject({ shortName: '团队会员', price: 3199 })
  })

  it('applies member discount only when membership is effective', () => {
    expect(itemListPriceOf(report, 'personal')).toBe(199)
    expect(memberDiscountedAmount(199, report, false)).toBe(199)
    expect(memberDiscountedAmount(199, report, true)).toBe(119)
    expect(memberDiscountedAmount(1990, report, true)).toBe(1194)
    expect(memberDiscountedAmount(199, freight, true)).toBe(199)
  })

  it('never applies member prices to seller-market products', () => {
    const seller = seedProducts.find((product) => product.id === 'prod-seller-route-board')!
    expect(productMemberBenefit(seller)).toBe('none')
    expect(itemListPriceOf(seller, 'personal')).toBe(199)
    expect(itemListPriceOf(seller, 'enterprise')).toBe(1990)
    expect(memberDiscountedAmount(199, seller, true)).toBe(199)
    expect(memberDiscountedAmount(1990, seller, true)).toBe(1990)
  })

  it('builds identity-aware action fields for product CTAs', () => {
    expect(membershipActionFields(freight, {
      identitySubject: 'personal',
      hasEffectiveMembership: false,
      canPurchaseMembership: true
    })).toMatchObject({
      memberBenefit: 'free',
      itemPrice: 199
    })
    expect(membershipActionFields(report, {
      identitySubject: 'enterprise',
      hasEffectiveMembership: true,
      canPurchaseMembership: false
    })).toMatchObject({
      memberBenefit: 'discount',
      itemPrice: 1990,
      memberItemPrice: 1194,
      discountZhe: 6
    })
  })
})

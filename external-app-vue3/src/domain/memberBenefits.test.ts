import { describe, expect, it } from 'vitest'
import {
  deriveLegacyMemberFields,
  formatMemberBenefitsLabel,
  memberTierCoversFree,
  normalizeMemberBenefits,
  resolveMemberBenefits
} from './memberBenefits'
import type { Product } from '@/types/domain'

describe('memberBenefits', () => {
  it('keeps same-tier free/discount mutually exclusive while allowing cross-tier combos', () => {
    expect(normalizeMemberBenefits([
      { tier: 'standard', mode: 'free' },
      { tier: 'standard', mode: 'discount', discount: 0.7 },
      { tier: 'premium', mode: 'free' }
    ])).toEqual([
      { tier: 'standard', mode: 'discount', discount: 0.7 },
      { tier: 'premium', mode: 'free' }
    ])
  })

  it('derives legacy fields and formats labels', () => {
    const benefits = normalizeMemberBenefits([
      { tier: 'standard', mode: 'discount', discount: 0.6 },
      { tier: 'premium', mode: 'free' }
    ])
    const legacy = deriveLegacyMemberFields(benefits, { model: 'item_only', itemPrice: 199 }, false, true)
    expect(legacy.memberIncluded).toBe(true)
    expect(legacy.price.model).toBe('member_discount')
    expect(legacy.price.memberDiscount).toBe(0.6)
    expect(formatMemberBenefitsLabel(benefits)).toBe('普通会员6折 · 高级会员免费')
  })

  it('covers free access by member tier hierarchy', () => {
    const product = {
      memberBenefits: [{ tier: 'premium', mode: 'free' }],
      memberIncluded: true,
      price: { model: 'member_free' },
      acquisitions: ['member']
    } as Product
    expect(memberTierCoversFree(product, 'standard')).toBe(false)
    expect(memberTierCoversFree(product, 'premium')).toBe(true)
    expect(resolveMemberBenefits(product)).toHaveLength(1)
  })
})

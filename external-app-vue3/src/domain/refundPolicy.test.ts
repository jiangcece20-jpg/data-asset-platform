import { describe, expect, it } from 'vitest'
import { resolveRefundScope } from './refundPolicy'

describe('resolveRefundScope', () => {
  it('full refund for an unused term entitlement', () => {
    expect(resolveRefundScope({ productType: 'dashboard', entitlementKind: 'term', used: false, complianceRecall: false })).toBe('full')
  })
  it('no refund for a delivered report version', () => {
    expect(resolveRefundScope({ productType: 'report', entitlementKind: 'report_version', used: true, complianceRecall: false })).toBe('none')
  })
  it('partial refund for a used API/dataset/term', () => {
    expect(resolveRefundScope({ productType: 'api', entitlementKind: 'term', used: true, complianceRecall: false })).toBe('partial')
  })
  it('compliance recall is always a full proactive refund', () => {
    expect(resolveRefundScope({ productType: 'report', entitlementKind: 'report_version', used: true, complianceRecall: true })).toBe('full')
  })
})

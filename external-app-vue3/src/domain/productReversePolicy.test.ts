import { describe, expect, it } from 'vitest'
import { resolveProductReversePolicy } from './productReversePolicy'

describe('resolveProductReversePolicy', () => {
  it.each([
    ['pause', 'commercial_adjustment', true, 'paused', 'normal', 'keep', 'S3', true],
    ['pause', 'quality_issue', true, 'paused', 'degraded', 'keep_and_compensate', 'S2', true],
    ['recall', 'quality_issue', true, 'paused', 'suspended', 'freeze', 'S2', true],
    ['recall', 'compliance_risk', true, 'paused', 'suspended', 'freeze', 'S1', true],
    ['delist', 'upstream_stop', true, 'delisted', 'terminated', 'migrate_or_refund', 'S2', true],
    ['delist', 'commercial_adjustment', true, 'delisted', 'normal', 'keep', 'S3', true],
    ['pause', 'commercial_adjustment', false, 'paused', 'normal', 'keep', 'S3', false],
  ] as const)(
    '%s / %s applies the expected treatment',
    (action, reason, hasCustomerImpact, availability, service, entitlement, severity, createsWorkOrder) => {
      expect(resolveProductReversePolicy({ action, reason, hasCustomerImpact })).toMatchObject({
        availability,
        service,
        entitlement,
        severity,
        createsWorkOrder,
        requiresCustomerNotice: hasCustomerImpact,
        requiresReview: true,
      })
    },
  )

  it('rejects a commercial recall', () => {
    expect(() => resolveProductReversePolicy({
      action: 'recall',
      reason: 'commercial_adjustment',
      hasCustomerImpact: true,
    })).toThrow('召回仅允许质量或合规原因')
  })
})

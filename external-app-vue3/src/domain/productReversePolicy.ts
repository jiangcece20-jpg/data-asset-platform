import type {
  ProductReversePolicy,
  ProductReverseAction,
  ReverseReasonCode,
} from '../types/reverseFlow'

interface PolicyInput {
  action: ProductReverseAction
  reason: ReverseReasonCode
  hasCustomerImpact: boolean
}

export function resolveProductReversePolicy(input: PolicyInput): ProductReversePolicy {
  const { reason, hasCustomerImpact } = input
  // Legacy pause requests use the same delisting path; no separate sales state remains.
  const action = input.action === 'pause' ? 'delist' : input.action

  if (action === 'recall' && !['quality_issue', 'compliance_risk'].includes(reason)) {
    throw new Error('召回仅允许质量或合规原因')
  }
  if (action === 'delist' && !['commercial_adjustment', 'upstream_stop', 'quality_issue', 'compliance_risk'].includes(reason)) {
    throw new Error('下架原因不适用')
  }

  if (action === 'recall' && reason === 'compliance_risk') {
    return {
      availability: 'delisted',
      service: 'suspended',
      entitlement: 'freeze',
      severity: 'S1',
      createsWorkOrder: true,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (reason === 'quality_issue' && action === 'recall') {
    return {
      availability: 'delisted',
      service: 'suspended',
      entitlement: 'freeze',
      severity: 'S2',
      createsWorkOrder: true,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  return {
    availability: 'delisted',
    service: 'normal',
    entitlement: 'keep',
    severity: reason === 'commercial_adjustment' ? 'S3' : 'S2',
    createsWorkOrder: hasCustomerImpact,
    requiresCustomerNotice: hasCustomerImpact,
    requiresReview: true,
  }
}

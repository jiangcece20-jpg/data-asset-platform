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
  const { action, reason, hasCustomerImpact } = input

  if (action === 'recall' && !['quality_issue', 'compliance_risk'].includes(reason)) {
    throw new Error('召回仅允许质量或合规原因')
  }
  if (action === 'pause' && !['commercial_adjustment', 'quality_issue'].includes(reason)) {
    throw new Error('暂停销售仅允许商业调整或质量问题')
  }
  if (action === 'delist' && !['commercial_adjustment', 'upstream_stop'].includes(reason)) {
    throw new Error('下架仅允许商业调整或上游停供')
  }

  if (reason === 'compliance_risk') {
    return {
      availability: 'paused',
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
      availability: 'paused',
      service: 'suspended',
      entitlement: 'freeze',
      severity: 'S2',
      createsWorkOrder: true,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (reason === 'quality_issue') {
    return {
      availability: 'paused',
      service: 'degraded',
      entitlement: 'keep_and_compensate',
      severity: 'S2',
      createsWorkOrder: hasCustomerImpact,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (reason === 'upstream_stop') {
    return {
      availability: 'delisted',
      service: 'terminated',
      entitlement: 'migrate_or_refund',
      severity: 'S2',
      createsWorkOrder: hasCustomerImpact,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  if (action === 'delist') {
    return {
      availability: 'delisted',
      service: 'normal',
      entitlement: 'keep',
      severity: 'S3',
      createsWorkOrder: hasCustomerImpact,
      requiresCustomerNotice: hasCustomerImpact,
      requiresReview: true,
    }
  }

  return {
    availability: 'paused',
    service: 'normal',
    entitlement: 'keep',
    severity: 'S3',
    createsWorkOrder: hasCustomerImpact,
    requiresCustomerNotice: hasCustomerImpact,
    requiresReview: true,
  }
}

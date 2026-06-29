import { describe, expect, it } from 'vitest';
import {
  batchAggregateStatusLabels,
  deriveBatchAggregateStatus,
  batchEffectAggregateStatusLabels,
  deriveBatchEffectAggregateStatus,
} from './approvalAggregateStatus';
import type { ApprovalBatch, ApprovalStatus } from './approvalData';

const effectInstances = (...statuses: string[]) => statuses.map(effectStatus => ({ effectStatus }));
const batchWithStatuses = (...statuses: ApprovalStatus[]): ApprovalBatch => ({
  id: 'batch-test',
  batchId: 'BATCH-TEST',
  ticketType: '权限申请',
  totalAssets: statuses.length,
  instanceCount: statuses.length,
  createdAt: '2026-06-26 10:00:00',
  status: 'approving',
  effectStatus: 'not_effective',
  instances: statuses.map((status, index) => ({
    id: `instance-${index}`,
    subOrderNo: `SUB-${index}`,
    instanceCode: `INS-${index}`,
    feishuUrl: '#',
    status,
    effectStatus: 'not_effective',
    applicant: '刘数据',
    applicantDept: '数据分析部',
    applicantManager: '王经理',
    assets: [`asset-${index}`],
    securityLevel: 'S3',
    permissionType: '只读',
    expireDate: '长期',
    directory: '交易域',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    matchedFlow: '权限申请_统一版',
    matchedRoute: '标准权限申请',
    reason: '测试',
    approvers: [],
    timeline: [],
  })),
});

describe('deriveBatchAggregateStatus', () => {
  it('returns partial rejected or withdrawn in progress when rejected and approving children coexist without approvals', () => {
    expect(deriveBatchAggregateStatus(batchWithStatuses('rejected', 'approving'))).toBe('partial_rejected_or_cancelled_in_progress');
    expect(deriveBatchAggregateStatus(batchWithStatuses('cancelled', 'approving'))).toBe('partial_rejected_or_cancelled_in_progress');
  });

  it('returns mixed approved in progress and rejected when all three result classes coexist', () => {
    expect(deriveBatchAggregateStatus(batchWithStatuses('approved', 'approving', 'rejected'))).toBe('partial_approved_in_progress_with_rejected_or_cancelled');
  });
});

describe('batchAggregateStatusLabels', () => {
  it('keeps product copy for every approval aggregate status', () => {
    expect(batchAggregateStatusLabels.partial_rejected_or_cancelled_in_progress).toBe('部分拒绝/撤回，审批中');
    expect(batchAggregateStatusLabels.partial_approved_in_progress_with_rejected_or_cancelled).toBe('部分通过，部分审批中，部分拒绝/撤回');
  });
});

describe('deriveBatchEffectAggregateStatus', () => {
  it('returns all_effective when every child is effective', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effective'))).toBe('all_effective');
  });

  it('returns not_effective when every child is not effective', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('not_effective', 'not_effective'))).toBe('not_effective');
  });

  it('returns effecting when children are only effecting', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effecting', 'effecting'))).toBe('effecting');
  });

  it('returns partial_effective_effecting when effective and effecting children coexist', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting'))).toBe('partial_effective_effecting');
  });

  it('prioritizes effecting over failed or not effective children', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effecting', 'effect_failed', 'not_effective'))).toBe('effecting');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting', 'effect_failed'))).toBe('partial_effective_effecting');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting', 'not_effective'))).toBe('partial_effective_effecting');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting', 'effect_failed', 'not_effective'))).toBe('partial_effective_effecting');
  });

  it('returns partial_effective_with_failed_or_not_effective when effective children coexist with failed or not effective children', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effect_failed'))).toBe('partial_effective_with_failed_or_not_effective');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'not_effective'))).toBe('partial_effective_with_failed_or_not_effective');
  });

  it('returns all_failed_or_not_effective when no child is effective or effecting and at least one failed or not effective child exists', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effect_failed', 'effect_failed'))).toBe('all_failed_or_not_effective');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effect_failed', 'not_effective'))).toBe('all_failed_or_not_effective');
  });

  it('returns unknown for empty input or unrecognized effect statuses', () => {
    expect(deriveBatchEffectAggregateStatus([])).toBe('unknown');
    expect(deriveBatchEffectAggregateStatus(effectInstances('paused', 'cancelled'))).toBe('unknown');
  });
});

describe('batchEffectAggregateStatusLabels', () => {
  it('keeps product copy for every effect aggregate status', () => {
    expect(batchEffectAggregateStatusLabels).toEqual({
      not_effective: '未生效',
      effecting: '生效中',
      partial_effective_effecting: '部分生效，生效中',
      all_effective: '全部生效',
      partial_effective_with_failed_or_not_effective: '部分生效，部分失败/未生效',
      all_failed_or_not_effective: '全部失败/未生效',
      unknown: '未知',
    });
  });
});

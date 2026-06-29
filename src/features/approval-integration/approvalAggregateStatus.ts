import type { ApprovalBatch, ApprovalStatus } from './approvalData';

export type BatchAggregateStatus =
  | 'in_progress'
  | 'partial_approved_in_progress'
  | 'partial_rejected_or_cancelled_in_progress'
  | 'all_approved'
  | 'partial_approved_with_rejected_or_cancelled'
  | 'partial_approved_in_progress_with_rejected_or_cancelled'
  | 'all_rejected_or_cancelled'
  | 'cancelled'
  | 'unknown';

export type BatchEffectAggregateStatus =
  | 'not_effective'
  | 'effecting'
  | 'partial_effective_effecting'
  | 'all_effective'
  | 'partial_effective_with_failed_or_not_effective'
  | 'all_failed_or_not_effective'
  | 'unknown';

type ChildStatus = 'approved' | 'approving' | 'rejected' | 'cancelled';
type ChildEffectStatus = 'effective' | 'effecting' | 'effect_failed' | 'not_effective';

export interface ChildEffectStatusCounts {
  effective: number;
  effecting: number;
  effectFailed: number;
  notEffective: number;
  total: number;
}

export const batchAggregateStatusLabels: Record<BatchAggregateStatus, string> = {
  in_progress: '审批中',
  partial_approved_in_progress: '部分通过，审批中',
  partial_rejected_or_cancelled_in_progress: '部分拒绝/撤回，审批中',
  all_approved: '全部通过',
  partial_approved_with_rejected_or_cancelled: '部分通过，部分拒绝/撤回',
  partial_approved_in_progress_with_rejected_or_cancelled: '部分通过，部分审批中，部分拒绝/撤回',
  all_rejected_or_cancelled: '全部拒绝/撤回',
  cancelled: '已取消',
  unknown: '未知',
};

export const batchEffectAggregateStatusLabels: Record<BatchEffectAggregateStatus, string> = {
  not_effective: '未生效',
  effecting: '生效中',
  partial_effective_effecting: '部分生效，生效中',
  all_effective: '全部生效',
  partial_effective_with_failed_or_not_effective: '部分生效，部分失败/未生效',
  all_failed_or_not_effective: '全部失败/未生效',
  unknown: '未知',
};

export const batchAggregateStatusTone: Record<BatchAggregateStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  in_progress: 'warning',
  partial_approved_in_progress: 'warning',
  partial_rejected_or_cancelled_in_progress: 'warning',
  all_approved: 'success',
  partial_approved_with_rejected_or_cancelled: 'danger',
  partial_approved_in_progress_with_rejected_or_cancelled: 'danger',
  all_rejected_or_cancelled: 'danger',
  cancelled: 'gray',
  unknown: 'gray',
};

export const batchEffectAggregateStatusTone: Record<BatchEffectAggregateStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  not_effective: 'gray',
  effecting: 'warning',
  partial_effective_effecting: 'warning',
  all_effective: 'success',
  partial_effective_with_failed_or_not_effective: 'danger',
  all_failed_or_not_effective: 'danger',
  unknown: 'gray',
};

function toChildStatus(status: ApprovalStatus): ChildStatus | null {
  if (status === 'approved' || status === 'approving' || status === 'rejected' || status === 'cancelled') return status;
  return null;
}

function toChildEffectStatus(status: string): ChildEffectStatus | null {
  if (status === 'effective' || status === 'effecting' || status === 'effect_failed' || status === 'not_effective') return status;
  return null;
}

export function deriveBatchAggregateStatus(batch: ApprovalBatch): BatchAggregateStatus {
  const statuses = batch.instances.map(instance => toChildStatus(instance.status)).filter((status): status is ChildStatus => status !== null);
  if (statuses.length === 0) return 'unknown';

  const approved = statuses.filter(status => status === 'approved').length;
  const approving = statuses.filter(status => status === 'approving').length;
  const rejected = statuses.filter(status => status === 'rejected').length;
  const cancelled = statuses.filter(status => status === 'cancelled').length;
  const rejectedOrCancelled = rejected + cancelled;

  if (cancelled === statuses.length) return 'cancelled';
  if (approved === statuses.length) return 'all_approved';
  if (approved > 0 && approving > 0 && rejectedOrCancelled > 0) return 'partial_approved_in_progress_with_rejected_or_cancelled';
  if (approved > 0 && approving > 0) return 'partial_approved_in_progress';
  if (approved === 0 && approving > 0 && rejectedOrCancelled > 0) return 'partial_rejected_or_cancelled_in_progress';
  if (approved === 0 && approving > 0) return 'in_progress';
  if (approved > 0 && rejectedOrCancelled > 0) return 'partial_approved_with_rejected_or_cancelled';
  if (approved === 0 && approving === 0 && rejectedOrCancelled > 0) return 'all_rejected_or_cancelled';

  return 'unknown';
}

export function countChildEffectStatuses(instances: Array<{ effectStatus: string }>): ChildEffectStatusCounts {
  return instances.reduce<ChildEffectStatusCounts>((counts, instance) => {
    const status = toChildEffectStatus(instance.effectStatus);
    if (status === null) return counts;

    if (status === 'effect_failed') {
      counts.effectFailed += 1;
    } else if (status === 'not_effective') {
      counts.notEffective += 1;
    } else {
      counts[status] += 1;
    }
    counts.total += 1;

    return counts;
  }, {
    effective: 0,
    effecting: 0,
    effectFailed: 0,
    notEffective: 0,
    total: 0,
  });
}

export function deriveBatchEffectAggregateStatus(instances: Array<{ effectStatus: string }>): BatchEffectAggregateStatus {
  const counts = countChildEffectStatuses(instances);
  if (counts.total === 0) return 'unknown';

  const failedOrNotEffective = counts.effectFailed + counts.notEffective;

  if (counts.effective === counts.total) return 'all_effective';
  if (counts.notEffective === counts.total) return 'not_effective';
  if (counts.effective > 0 && counts.effecting > 0) return 'partial_effective_effecting';
  if (counts.effective === 0 && counts.effecting > 0) return 'effecting';
  if (counts.effective > 0 && counts.effecting === 0 && failedOrNotEffective > 0) return 'partial_effective_with_failed_or_not_effective';
  if (counts.effective === 0 && counts.effecting === 0 && failedOrNotEffective > 0) return 'all_failed_or_not_effective';

  return 'unknown';
}

import type { ApprovalBatch, ApprovalStatus } from './approvalData';

export type BatchAggregateStatus =
  | 'in_progress'
  | 'partial_approved_in_progress'
  | 'all_approved'
  | 'partial_approved_with_rejected_or_cancelled'
  | 'all_rejected_or_cancelled'
  | 'cancelled'
  | 'unknown';

type ChildStatus = 'approved' | 'approving' | 'rejected' | 'cancelled';

export const batchAggregateStatusLabels: Record<BatchAggregateStatus, string> = {
  in_progress: '审批中',
  partial_approved_in_progress: '部分通过，审批中',
  all_approved: '全部通过',
  partial_approved_with_rejected_or_cancelled: '部分通过，部分拒绝/撤回',
  all_rejected_or_cancelled: '全部拒绝/撤回',
  cancelled: '已取消',
  unknown: '未知',
};

export const batchAggregateStatusTone: Record<BatchAggregateStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  in_progress: 'warning',
  partial_approved_in_progress: 'warning',
  all_approved: 'success',
  partial_approved_with_rejected_or_cancelled: 'danger',
  all_rejected_or_cancelled: 'danger',
  cancelled: 'gray',
  unknown: 'gray',
};

function toChildStatus(status: ApprovalStatus): ChildStatus | null {
  if (status === 'approved' || status === 'approving' || status === 'rejected' || status === 'cancelled') return status;
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
  if (approved > 0 && approving > 0) return 'partial_approved_in_progress';
  if (approved === 0 && approving > 0) return 'in_progress';
  if (approved > 0 && rejectedOrCancelled > 0) return 'partial_approved_with_rejected_or_cancelled';
  if (approved === 0 && approving === 0 && rejectedOrCancelled > 0) return 'all_rejected_or_cancelled';

  return 'unknown';
}

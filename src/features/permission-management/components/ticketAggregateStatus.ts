export type ChildApprovalStatus = 'approved' | 'pending' | 'rejected' | 'withdrawn';

export type MainTicketAggregateStatus =
  | 'in_progress'
  | 'partial_approved_in_progress'
  | 'all_approved'
  | 'partial_approved_with_rejected_or_withdrawn'
  | 'all_rejected_or_withdrawn'
  | 'withdrawn'
  | 'unknown';

export type ChildApprovalStatusCounts = {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  withdrawn: number;
};

type DeriveMainTicketAggregateStatusOptions = {
  mainWithdrawn?: boolean;
};

export const aggregateStatusLabels: Record<MainTicketAggregateStatus, string> = {
  in_progress: '审批中',
  partial_approved_in_progress: '部分通过，审批中',
  all_approved: '全部通过',
  partial_approved_with_rejected_or_withdrawn: '部分通过，部分拒绝/撤回',
  all_rejected_or_withdrawn: '全部拒绝/撤回',
  withdrawn: '已撤回',
  unknown: '未知',
};

export const aggregateStatusTone: Record<MainTicketAggregateStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
  in_progress: 'warning',
  partial_approved_in_progress: 'warning',
  all_approved: 'success',
  partial_approved_with_rejected_or_withdrawn: 'danger',
  all_rejected_or_withdrawn: 'danger',
  withdrawn: 'gray',
  unknown: 'gray',
};

export function countChildApprovalStatuses(statuses: ChildApprovalStatus[]): ChildApprovalStatusCounts {
  return statuses.reduce<ChildApprovalStatusCounts>(
    (counts, status) => ({
      ...counts,
      [status]: counts[status] + 1,
    }),
    { total: statuses.length, approved: 0, rejected: 0, pending: 0, withdrawn: 0 }
  );
}

export function deriveMainTicketAggregateStatus(
  statuses: ChildApprovalStatus[],
  options: DeriveMainTicketAggregateStatusOptions = {}
): MainTicketAggregateStatus {
  if (options.mainWithdrawn) return 'withdrawn';
  if (statuses.length === 0) return 'unknown';

  const counts = countChildApprovalStatuses(statuses);
  const hasApproved = counts.approved > 0;
  const hasPending = counts.pending > 0;
  const hasRejectedOrWithdrawn = counts.rejected > 0 || counts.withdrawn > 0;

  if (counts.withdrawn === counts.total) return 'withdrawn';
  if (counts.approved === counts.total) return 'all_approved';
  if (hasApproved && hasPending) return 'partial_approved_in_progress';
  if (!hasApproved && hasPending) return 'in_progress';
  if (hasApproved && hasRejectedOrWithdrawn) return 'partial_approved_with_rejected_or_withdrawn';
  if (!hasApproved && !hasPending && hasRejectedOrWithdrawn) return 'all_rejected_or_withdrawn';

  return 'unknown';
}

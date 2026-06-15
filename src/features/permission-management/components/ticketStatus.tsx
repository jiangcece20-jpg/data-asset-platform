import { Tag } from '../../../components/base/Tag';
import type { Ticket } from '../PermissionManagementPage';

export const statusLabels: Record<string, string> = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  expired: '已过期',
};

export const pendingStatusLabels: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  expired: '已过期',
};

export function statusTone(status: string): 'success' | 'warning' | 'danger' | 'gray' {
  if (status === 'approved' || status === '通过' || status === '启用') return 'success';
  if (status === 'pending' || status === '审批中') return 'warning';
  if (status === 'rejected' || status === '驳回' || status === '已拒绝') return 'danger';
  return 'gray';
}

export function categoryTone(category: string): 'blue' | 'warning' | 'gray' {
  if (category === 'perm' || category === '权限') return 'blue';
  if (category === 'gov' || category === '治理') return 'warning';
  return 'gray';
}

export function syncTone(syncMode: Ticket['syncMode']): 'success' | 'warning' | 'gray' {
  if (syncMode === 'event') return 'success';
  if (syncMode === 'polling') return 'warning';
  return 'gray';
}

export function subOrderStatusTag(status: string) {
  const map: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' | 'gray' }> = {
    approved: { label: '✅ 已通过', tone: 'success' },
    rejected: { label: '❌ 已驳回', tone: 'danger' },
    pending: { label: '⏳ 审批中', tone: 'warning' },
    withdrawn: { label: '已撤回', tone: 'gray' },
  };
  const item = map[status];
  return item ? <Tag tone={item.tone}>{item.label}</Tag> : null;
}

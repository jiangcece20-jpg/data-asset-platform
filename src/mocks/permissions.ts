import type { PermissionStatus } from '../types/permissions';

export const mockPermissions: PermissionStatus[] = [
  {
    resourceId: 'resource-table-order-detail',
    status: 'granted',
    ticketId: 'PA-2026040100001',
    grantedAt: '2026-04-01',
    expireAt: '2026-07-01',
  },
  {
    resourceId: 'resource-report-gmv-daily',
    status: 'none',
  },
];

export type PermissionStatusValue = 'granted' | 'none' | 'pending' | 'rejected' | 'expired' | 'unknown';

export type PermissionStatus = {
  resourceId: string;
  status: PermissionStatusValue;
  ticketId?: string;
  grantedAt?: string;
  expireAt?: string;
};

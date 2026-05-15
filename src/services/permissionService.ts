import { mockPermissions } from '../mocks/permissions';
import type { PermissionStatus } from '../types/permissions';

export const permissionService = {
  async getPermissionStatus(resourceId: string): Promise<PermissionStatus> {
    return mockPermissions.find((permission) => permission.resourceId === resourceId) ?? { resourceId, status: 'unknown' };
  },
};

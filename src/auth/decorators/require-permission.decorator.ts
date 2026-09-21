import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

export interface PermissionRequirement {
  name?: string;
  resource?: string;
  action?: string;
}

export const RequirePermission = (permission: string | PermissionRequirement) =>
  SetMetadata(PERMISSION_KEY, permission);


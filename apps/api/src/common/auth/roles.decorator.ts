import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type PlatformRole =
  | 'customer'
  | 'pharmacist'
  | 'branch_manager'
  | 'inventory_officer'
  | 'dispatcher'
  | 'support_admin'
  | 'super_admin';

export const Roles = (...roles: PlatformRole[]) => SetMetadata(ROLES_KEY, roles);
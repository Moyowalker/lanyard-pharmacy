import type { PlatformRole } from '../../../common/auth/roles.decorator';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  roles: PlatformRole[];
  branchIds: string[];
}
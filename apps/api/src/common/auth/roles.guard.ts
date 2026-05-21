import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BRANCH_SCOPE_KEY } from './branch-scope.decorator';
import { ROLES_KEY, type PlatformRole } from './roles.decorator';
import type { AuthenticatedUser } from '../../modules/identity/interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiresBranchScope = this.reflector.getAllAndOverride<boolean>(BRANCH_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiresBranchScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser; params?: Record<string, string> }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authenticated user context is required');
    }

    if (requiredRoles?.length && !requiredRoles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    if (requiresBranchScope) {
      const branchId = request.params?.branchId;
      if (branchId && user.branchIds.length > 0 && !user.branchIds.includes(branchId)) {
        throw new ForbiddenException('User is outside the requested branch scope');
      }
    }

    return true;
  }
}
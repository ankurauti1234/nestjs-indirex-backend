import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  PERMISSION_KEY,
  PermissionRequirement,
} from '../decorators/require-permission.decorator.js';
import { User, Permission } from '../../database/entities/index.js';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requirement = this.reflector.getAllAndOverride<
      string | PermissionRequirement
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      return false;
    }

    const userWithPermissions = await this.userRepository.findOne({
      where: { id: user.id },
      relations: { roles: { permissions: true } },
    });

    if (!userWithPermissions || !userWithPermissions.roles) {
      throw new ForbiddenException('Access denied: User has no assigned roles');
    }

    const activePermissions: Permission[] = [];
    for (const role of userWithPermissions.roles) {
      if (role.isActive && role.permissions) {
        for (const perm of role.permissions) {
          if (perm.isActive) {
            activePermissions.push(perm);
          }
        }
      }
    }

    if (!requirement) {
      const httpMethod = request.method;
      const routePath = request.route?.path || request.url;

      const matchingPermission = activePermissions.find(
        (p) =>
          (p.httpMethod === '*' || p.httpMethod === httpMethod) &&
          (p.routePath === '*' || p.routePath === routePath),
      );

      if (matchingPermission) {
        return true;
      }

      return true;
    }

    let reqName: string | undefined;
    let reqResource: string | undefined;
    let reqAction: string | undefined;

    if (typeof requirement === 'string') {
      reqName = requirement;
      if (requirement.includes(':')) {
        const [res, act] = requirement.split(':');
        reqResource = res;
        reqAction = act;
      }
    } else {
      reqName = requirement.name;
      reqResource = requirement.resource;
      reqAction = requirement.action;
    }

    const hasPermission = activePermissions.some((perm) => {
      if (perm.name === '*' || (perm.resource === '*' && perm.action === '*')) {
        return true;
      }

      if (reqName && perm.name === reqName) {
        return true;
      }

      if (reqResource && reqAction) {
        const resourceMatch = perm.resource === '*' || perm.resource === reqResource;
        const actionMatch = perm.action === '*' || perm.action === reqAction;
        if (resourceMatch && actionMatch) {
          return true;
        }
      }

      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Forbidden: Missing required permission [${reqName || `${reqResource}:${reqAction}`}]`,
      );
    }

    return true;
  }
}


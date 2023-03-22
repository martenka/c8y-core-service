import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { isNil } from '@nestjs/common/utils/shared.utils';
import { Request } from 'express';
import { ensureArray } from '../utils/validation';
import { Role } from '../global/types/roles';
import { ROLES_KEY } from '../decorators/authorization';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = ensureArray(
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );

    // By default all routes are normal user routes
    if (isNil(requiredRoles) || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (isNil(request.user)) {
      this.logger.warn('User object on Request not present!');
      throw new InternalServerErrorException();
    }

    return requiredRoles.some((role) => request.user.roles.includes(role));
  }
}

export const UseRolesGuard = () => UseGuards(RolesGuard);

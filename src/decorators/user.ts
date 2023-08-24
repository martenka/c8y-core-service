import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { LoggedInUserType } from '../core/auth/types/types';
import { notPresent } from '../utils/validation';

export const LoggedInUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): LoggedInUserType => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (notPresent(request.user)) {
      new Logger('LoggedInUser').error(
        'User data not present on request object!',
      );
      throw new InternalServerErrorException();
    }
    return request.user;
  },
);

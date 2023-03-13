import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { LoggedInUserType } from '../core/auth/types/types';

export const LoggedInUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): LoggedInUserType => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

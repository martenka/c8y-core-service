import { HydratedDocument } from 'mongoose';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import {
  ClassConstructor,
  instanceToPlain,
  plainToClass,
} from 'class-transformer';
import { CONTROLLER_DTO, NO_DTO_VALIDATION } from '../decorators/dto';
import { isArray } from 'class-validator';
import { isNil } from '@nestjs/common/utils/shared.utils';

@Injectable()
export class DtoTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const dto = this.reflector.getAllAndOverride<
      ClassConstructor<unknown> | typeof NO_DTO_VALIDATION
    >(CONTROLLER_DTO, [context.getClass(), context.getHandler()]);

    return next.handle().pipe(
      map((data: HydratedDocument<unknown> | HydratedDocument<unknown>[]) => {
        if (isArray(data)) {
          return data.map((value: HydratedDocument<unknown>) =>
            toDTO(dto, value),
          );
        }
        return toDTO(dto, data);
      }),
    );
  }
}
export function toDTO(
  dto: ClassConstructor<unknown> | typeof NO_DTO_VALIDATION,
  data: HydratedDocument<unknown>,
) {
  if (isNil(data) || dto === NO_DTO_VALIDATION) {
    return data;
  }

  return plainToClass(dto, instanceToPlain(data.toObject()), {
    excludeExtraneousValues: true,
  });
}

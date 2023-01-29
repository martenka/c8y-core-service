import { HydratedDocument } from 'mongoose';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(DtoTransformInterceptor.name);

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
            toOutputDTO(dto, value, () => noDtoHandler(dto, this.logger)),
          );
        }
        return toOutputDTO(dto, data, () => noDtoHandler(dto, this.logger));
      }),
    );
  }
}

function noDtoHandler(dto, logger: Logger) {
  if (isNil(dto)) {
    logger?.warn(
      'DTO transform interceptor set, but not DTO was provided. Check your controller annotations! ',
    );
    throw new InternalServerErrorException();
  }
}

function toOutputDTO(
  dto: ClassConstructor<unknown> | typeof NO_DTO_VALIDATION,
  data: HydratedDocument<unknown>,
  noDtoProvidedHandler?: () => void,
) {
  if (dto === NO_DTO_VALIDATION) {
    return data;
  }

  if (isNil(dto)) {
    noDtoProvidedHandler();
  }

  return plainToClass(dto, instanceToPlain(data.toObject()), {
    excludeExtraneousValues: true,
  });
}

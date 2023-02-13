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
/**
 * Expects input data as an object with toObject() method or an array with the same method <br>
 * Based on this method input will be converted into specified DTO
 */
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
      map((data: { toObject: () => object }) => {
        if (isArray(data)) {
          return data.map((value) =>
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
  input: { toObject: () => object },
  noDtoProvidedHandler?: () => void,
) {
  if (isNil(input)) {
    return undefined;
  }

  if (dto === NO_DTO_VALIDATION) {
    return input;
  }

  if (isNil(dto)) {
    noDtoProvidedHandler();
  }

  return plainToClass(dto, instanceToPlain(input.toObject()), {
    excludeExtraneousValues: true,
  });
}

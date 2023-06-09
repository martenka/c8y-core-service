import { ClassConstructor } from 'class-transformer';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ensureArray } from '../utils/validation';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';
import { removeNilProperties } from '../utils/helpers';

export const CONTROLLER_DTO = 'CONTROLLER_DTO';
export const NO_DTO_VALIDATION = 'NO_DTO_VALIDATION';
export const EXPOSE_GROUPS = 'VALIDATION_GROUPS';

export const SetControllerDTO = (
  dto: ClassConstructor<unknown> | string,
  options: {
    apiResponseOptions?: ApiResponseOptions;
    isArray?: boolean;
    noStatus?: boolean;
  } = {
    apiResponseOptions: {},
    isArray: false,
  },
) =>
  applyDecorators(
    SetMetadata(CONTROLLER_DTO, dto),
    ApiResponse(
      removeNilProperties({
        type: options.isArray && typeof dto !== 'string' ? [dto] : dto,
        ...(options.apiResponseOptions ?? {}),
        status: options.noStatus
          ? undefined
          : options?.apiResponseOptions?.status ?? 200,
      }),
    ),
  );

export const NoDTOValidation = () =>
  SetMetadata(CONTROLLER_DTO, NO_DTO_VALIDATION);

export const SetExposeGroups = (groups: string | string[]) => {
  return SetMetadata(EXPOSE_GROUPS, ensureArray(groups));
};

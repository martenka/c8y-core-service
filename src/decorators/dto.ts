import { ClassConstructor } from 'class-transformer';
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ensureArray } from '../utils/validation';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';

export const CONTROLLER_DTO = 'CONTROLLER_DTO';
export const NO_DTO_VALIDATION = 'NO_DTO_VALIDATION';
export const EXPOSE_GROUPS = 'VALIDATION_GROUPS';

export const SetControllerDTO = (
  dto: ClassConstructor<unknown> | string,
  apiResponseOptions: ApiResponseOptions = {},
) =>
  applyDecorators(
    SetMetadata(CONTROLLER_DTO, dto),
    ApiResponse({
      type: dto,
      ...apiResponseOptions,
      status: apiResponseOptions.status ?? '2XX',
    }),
  );

export const NoDTOValidation = () =>
  SetMetadata(CONTROLLER_DTO, NO_DTO_VALIDATION);

export const SetExposeGroups = (groups: string | string[]) => {
  return SetMetadata(EXPOSE_GROUPS, ensureArray(groups));
};

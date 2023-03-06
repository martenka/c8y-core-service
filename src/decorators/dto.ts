import { ClassConstructor } from 'class-transformer';
import { SetMetadata } from '@nestjs/common';
import { ensureArray } from '../utils/validation';

export const CONTROLLER_DTO = 'CONTROLLER_DTO';
export const NO_DTO_VALIDATION = 'NO_DTO_VALIDATION';
export const EXPOSE_GROUPS = 'VALIDATION_GROUPS';

export const SetControllerDTO = (dto: ClassConstructor<unknown> | string) =>
  SetMetadata(CONTROLLER_DTO, dto);

export const NoDTOValidation = () =>
  SetMetadata(CONTROLLER_DTO, NO_DTO_VALIDATION);

export const SetExposeGroups = (groups: string | string[]) => {
  return SetMetadata(EXPOSE_GROUPS, ensureArray(groups));
};

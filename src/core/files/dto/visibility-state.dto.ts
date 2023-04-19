import { IsEnum } from 'class-validator';
import { VisibilityState } from '../../../models';
import { Properties } from '../../../global/types/types';

export class VisibilityStateDto {
  @IsEnum(VisibilityState)
  newVisibilityState: VisibilityState;
}

export type VisibilityStateDtoProperties = Properties<VisibilityStateDto>;

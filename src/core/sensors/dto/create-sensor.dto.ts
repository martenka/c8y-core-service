import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { CustomAttributes } from '../../../models';
import { Properties } from '../../../global/types/types';

export class CreateSensorDto {
  @IsString()
  managedObjectId: string;

  @IsString()
  @IsNotEmpty()
  managedObjectName: string;

  @IsString()
  @IsNotEmpty()
  valueFragmentType: string;

  @IsString()
  @IsOptional()
  valueFragmentDisplayName?: string;

  @IsString()
  @IsOptional()
  owner?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  customAttributes?: CustomAttributes;
}

export type CreateSensorDtoProperties = Properties<CreateSensorDto>;

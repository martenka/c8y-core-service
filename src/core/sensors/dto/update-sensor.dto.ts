import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { CustomAttributes } from '../../../models';
import { OmitType } from '@nestjs/swagger';

export class UpdateSensorDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  managedObjectId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  managedObjectName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  valueFragmentType?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  valueFragmentDisplayName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsObject()
  customAttributes?: CustomAttributes;
}

export class UpdateOneSensorDto extends OmitType(UpdateSensorDto, [
  'id',
] as const) {}

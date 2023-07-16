import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CustomAttributes } from '../../../models';
import { OmitType, PickType } from '@nestjs/swagger';

import { TransformCustomAttributesObject } from '../../../decorators/transformers/custom-attributes-transformer';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { IsMongoIdInstance } from '../../../decorators/custom-validators/mongo-id.validator';
import { TransformMongoId } from '../../../decorators/transformers/object-id-transformer';
import { TransformBoolean } from '../../../decorators/transformers/boolean-transformer';

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
  @TransformCustomAttributesObject()
  @IsObject()
  customAttributes?: CustomAttributes;
}

export class UpdateOneSensorDto extends OmitType(UpdateSensorDto, [
  'id',
] as const) {}

export class SensorUpdateIdentifiers {
  @IsOptional()
  @IsString()
  valueFragmentType?: string;

  @IsOptional()
  @IsMongoIdInstance({ each: true })
  @TransformMongoId()
  sensorIds?: Types.ObjectId[];
}

export class UpdateSensorsAttributesDto {
  @Type(() => SensorUpdateIdentifiers)
  @ValidateNested()
  identifiers: SensorUpdateIdentifiers;

  @IsOptional()
  @IsString()
  valueFragmentDisplayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @TransformCustomAttributesObject()
  @IsObject()
  customAttributes?: CustomAttributes;
}

export class DeleteSensorAttributesDto extends PickType(
  UpdateSensorsAttributesDto,
  ['identifiers'] as const,
) {
  @IsOptional()
  @IsString({ each: true })
  customAttributeKeys?: string[];

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  valueFragmentDisplayName?: boolean;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  description?: boolean;

  @IsOptional()
  @TransformBoolean()
  @IsBoolean()
  customAttributes?: boolean;
}

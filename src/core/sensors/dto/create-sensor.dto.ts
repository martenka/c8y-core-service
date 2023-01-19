import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomAttributes } from '../../../models/types/types';

export class CreateSensorDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  managedObjectId: number;

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
  description?: string;

  @IsObject()
  @IsOptional()
  customAttributes?: CustomAttributes;
}

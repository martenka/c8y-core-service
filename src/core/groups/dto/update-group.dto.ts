import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomAttributes } from '../../../models/types/types';

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensors: string[];

  @IsOptional()
  @IsObject()
  customAttributes?: CustomAttributes;
}

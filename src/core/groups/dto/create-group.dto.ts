import { CustomAttributes } from '../../../models/types/types';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  sensors: string[];

  @IsOptional()
  @IsObject()
  customAttributes?: CustomAttributes;
}

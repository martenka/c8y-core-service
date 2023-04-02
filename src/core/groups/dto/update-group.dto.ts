import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomAttributes } from '../../../models';
import { Properties } from '../../../global/types/types';
import { Types } from 'mongoose';

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensors: string[] | Types.ObjectId[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groups: string[] | Types.ObjectId[];

  @IsOptional()
  @IsObject()
  customAttributes?: CustomAttributes;
}

export type UpdateGroupDtoProperties = Properties<UpdateGroupDto>;

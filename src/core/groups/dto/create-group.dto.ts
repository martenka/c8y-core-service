import { CustomAttributes } from '../../../models';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Properties } from '../../../global/types/types';
import { Types } from 'mongoose';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  managedObjectId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsArray()
  @IsString({ each: true })
  sensors: string[] | Types.ObjectId[];

  @IsArray()
  @IsString({ each: true })
  groups: string[] | Types.ObjectId[];

  @IsOptional()
  @IsObject()
  customAttributes?: CustomAttributes;
}

export type CreateGroupDtoProperties = Properties<CreateGroupDto>;

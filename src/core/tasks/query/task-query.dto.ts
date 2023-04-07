import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoIdInstance } from '../../../decorators/custom-validators/mongo-id.validator';
import { TransformMongoId } from '../../../decorators/transformers/object-id-transformer';
import { TaskSteps, TaskTypes } from '../../../models';
import { Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { Properties } from '../../../global/types/types';
import { convertBooleanOrOriginal } from '../../../utils/helpers';

export class TaskQuery {
  @IsOptional()
  @IsMongoIdInstance()
  @TransformMongoId()
  @ApiProperty({ type: 'string' })
  id?: Types.ObjectId;

  @IsOptional()
  @IsEnum(TaskTypes)
  taskType?: TaskTypes;

  @IsOptional()
  @IsEnum(TaskSteps)
  taskStatus?: TaskSteps;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  firstRunAt?: string;

  @IsOptional()
  @Transform(({ value }) => {
    return convertBooleanOrOriginal(value);
  })
  @IsBoolean()
  isPeriodic?: boolean;
}

export type TaskQueryProperties = Properties<TaskQuery>;

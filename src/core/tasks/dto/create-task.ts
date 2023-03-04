import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TaskTypes } from '../../../models';
import { Type } from 'class-transformer';

export class PeriodicData {
  @IsString()
  pattern: string;

  @IsISO8601({ strict: true })
  firstRunAt = new Date().toISOString();

  @IsNumber()
  fetchDuration: number;
}

export class CreateTaskDto {
  @IsEnum(TaskTypes)
  taskType: TaskTypes;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => PeriodicData)
  @ValidateNested()
  periodicData?: PeriodicData;
}

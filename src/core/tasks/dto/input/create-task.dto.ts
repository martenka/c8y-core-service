import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TaskTypes } from '../../../../models';
import { Type } from 'class-transformer';
import { IsValidTaskPeriodicPattern } from '../../../../decorators/custom-validators/task-periodic-pattern';
import { ApiProperty } from '@nestjs/swagger';

export class PeriodicData {
  @IsValidTaskPeriodicPattern({
    message:
      'Pattern must be a valid numeric string, human-interval or cron pattern. 0 is not allowed',
  })
  @ApiProperty({
    type: 'string',
    required: true,
    description:
      'Cron pattern (parseable by cron-parser library) or human-interval',
  })
  pattern: string;

  @IsOptional()
  @IsNumber()
  windowDurationSeconds: number;
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

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  firstRunAt = new Date();
}

import {
  IsDate,
  IsEnum,
  isISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TaskTypes } from '../../../../models';
import { Transform, Type } from 'class-transformer';
import { IsValidTaskPeriodicPattern } from '../../../../decorators/custom-validators/task-periodic-pattern';

export class PeriodicData {
  @IsValidTaskPeriodicPattern({
    message:
      'Pattern must be a valid numeric string, human-interval or cron pattern. 0 is not allowed',
  })
  pattern: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (isISO8601(value, { strict: true })) {
      return new Date(value);
    }
    return value;
  })
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

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  firstRunAt = new Date();
}

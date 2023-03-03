import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskTypes } from '../../../models';
import { OverrideValidationOptions } from '../../../decorators/validation';

@OverrideValidationOptions({
  whitelist: false,
})
export class CreateTaskDto {
  @IsEnum(TaskTypes)
  taskType: TaskTypes;

  @IsOptional()
  @IsString()
  name?: string;
}

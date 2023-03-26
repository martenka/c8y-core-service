import { Exclude, Expose, Type } from 'class-transformer';
import { BaseDBPagination } from '../../../../global/pagination/pagination.dto';
import { ValidateNested } from 'class-validator';
import { Groups } from '../../../../global/tokens';
import { TaskSteps, TaskTypes } from '../../../../models';

@Exclude()
export class OutputTaskDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  taskType: TaskTypes;

  @Expose()
  name: string;

  @Expose()
  status: TaskSteps;

  @Expose({ groups: [Groups.ALL] })
  payload?: object;

  @Expose()
  createdAt?: string;
}

@Exclude()
export class PaginatedOutputTaskDto extends BaseDBPagination<OutputTaskDto> {
  @Expose()
  @Type(() => OutputTaskDto)
  @ValidateNested({ each: true })
  data: OutputTaskDto[];
}

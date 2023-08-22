import { Exclude, Expose, Type } from 'class-transformer';
import { BaseDBPagination } from '../../../../global/pagination/pagination.dto';
import { ValidateNested } from 'class-validator';
import { Groups } from '../../../../global/tokens';
import { TaskMode, TaskSteps, TaskTypes } from '../../../../models';
@Exclude()
export class OutputTaskPeriodicData {
  @Expose()
  pattern: string;

  @Expose()
  windowDurationSeconds?: number;
}

@Exclude()
export class OutputTaskMetadata {
  @Expose()
  lastRanAt?: string;

  @Expose()
  lastScheduledAt?: string;

  @Expose()
  lastCompletedAt?: string;

  @Expose()
  lastFailedAt?: string;

  @Expose()
  lastFailReason?: string;

  @Expose()
  firstRunAt?: string;

  @Expose()
  periodicData?: OutputTaskPeriodicData;
}

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

  @Expose()
  mode: TaskMode;

  @Expose({ groups: [Groups.ALL] })
  payload?: object;

  @Expose({ groups: [Groups.ALL] })
  metadata: OutputTaskMetadata;

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

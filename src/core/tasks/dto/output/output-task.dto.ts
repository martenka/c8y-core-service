import { Exclude, Expose, Type } from 'class-transformer';
import { BaseDBPagination } from '../../../../global/pagination/pagination';
import { ValidateNested } from 'class-validator';

@Exclude()
export class OutputTaskDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  taskType: string;

  @Expose()
  name: string;

  @Expose()
  status: string;

  @Expose()
  payload: object;
}

@Exclude()
export class PaginatedOutputTaskDto extends BaseDBPagination<OutputTaskDto> {
  @Expose()
  @Type(() => OutputTaskDto)
  @ValidateNested({ each: true })
  data: OutputTaskDto[];
}

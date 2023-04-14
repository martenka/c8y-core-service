import { Exclude, Expose, Type } from 'class-transformer';
import { CustomAttributes } from '../../../models';
import { OutputSensorDto } from '../../sensors/dto/output-sensor.dto';
import { BaseDBPagination } from '../../../global/pagination/pagination.dto';
import { ValidateNested } from 'class-validator';
import { Groups } from '../../../global/tokens';

@Exclude()
export class OutputGroupDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  name: string;

  @Expose()
  sensorAmount?: number;

  @Expose({ groups: [Groups.ALL] })
  @Type(() => OutputSensorDto)
  sensors: OutputSensorDto[];

  @Expose()
  description?: string;

  @Expose({ groups: [Groups.ALL] })
  customAttributes?: CustomAttributes;
}

@Exclude()
export class PaginatedOutputGroupDto extends BaseDBPagination<OutputGroupDto> {
  @Expose()
  @Type(() => OutputGroupDto)
  @ValidateNested({ each: true })
  data: OutputGroupDto[];
}

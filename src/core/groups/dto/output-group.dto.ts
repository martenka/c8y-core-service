import { Exclude, Expose, Type } from 'class-transformer';
import { CustomAttributes } from '../../../models/types/types';
import { OutputSensorDto } from '../../sensors/dto/output-sensor.dto';

@Exclude()
export class OutputGroupDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  name: string;

  @Expose()
  @Type(() => OutputSensorDto)
  sensors: OutputSensorDto[];

  @Expose()
  customAttributes?: CustomAttributes;
}

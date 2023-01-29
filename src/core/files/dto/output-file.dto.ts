import { Exclude, Expose, Type } from 'class-transformer';
import { OutputSensorDto } from '../../sensors/dto/output-sensor.dto';

@Exclude()
export class OutputSensorWithFilenameDto {
  @Expose()
  sensor: string;

  @Expose()
  filename?: string;
}

@Exclude()
export class OutputFileTaskDataDto {
  @Expose()
  @Type(() => OutputSensorWithFilenameDto)
  sensorData: OutputSensorWithFilenameDto[];

  @Expose()
  dateFrom: string;

  @Expose()
  dateTo: string;

  @Expose()
  groupId?: string;
}

@Exclude()
export class OutputFileDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  name?: string;

  @Expose()
  type?: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => OutputSensorDto)
  sensors: OutputSensorDto[];

  @Expose()
  @Type(() => OutputFileTaskDataDto)
  data: OutputFileTaskDataDto;

  @Expose()
  customAttributes: Record<string, unknown>;

  @Expose()
  scheduledAt?: string;

  @Expose()
  lastRanAt?: string;

  @Expose()
  completedAt?: string;

  @Expose()
  failedAt?: string;

  @Expose()
  failReason: string;
}

import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { OutputSensorDto } from '../../sensors/dto/output-sensor.dto';
import { Types } from 'mongoose';

@Exclude()
export class OutputSensorWithFilenameDto {
  @Expose()
  @Transform(({ value }) => {
    if (typeof value === 'object') {
      return value['_id'] ?? value['id'];
    }
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
  })
  sensor: string;

  @Expose()
  fileName?: string;
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

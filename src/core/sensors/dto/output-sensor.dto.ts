import { CustomAttributes } from '../../../models/types/types';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OutputSensorDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  managedObjectId: number;

  @Expose()
  managedObjectName: string;

  @Expose()
  valueFragmentType: string;

  @Expose()
  valueFragmentDisplayName: string;

  @Expose()
  description?: string;

  @Expose()
  customAttributes?: CustomAttributes;
}

import { CustomAttributes } from '../../../models';
import { Exclude, Expose, Type } from 'class-transformer';
import { BaseDBPagination } from '../../../global/pagination/pagination.dto';
import { ValidateNested } from 'class-validator';
import { Properties } from '../../../global/types/types';

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
  type?: string;

  @Expose()
  owner?: string;

  @Expose()
  description?: string;

  @Expose()
  customAttributes?: CustomAttributes;
}

@Exclude()
export class PaginatedOutputSensorDto extends BaseDBPagination<OutputSensorDto> {
  @Expose()
  @Type(() => OutputSensorDto)
  @ValidateNested({ each: true })
  data: OutputSensorDto[];
}

export type OutputSensorProperties = Properties<OutputSensorDto>;
export type PaginatedOutputSensorDtoProperties =
  Properties<PaginatedOutputSensorDto>;

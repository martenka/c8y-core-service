import { Exclude, Expose, Type } from 'class-transformer';
import { BaseDBPagination } from '../../../global/pagination/pagination.dto';
import { ValidateNested } from 'class-validator';
import { CustomAttributes } from '../../../models';
import { Groups } from '../../../global/tokens';

@Exclude()
export class OutputFileStorageDto {
  @Expose()
  bucket: string;

  @Expose()
  path: string;

  @Expose()
  url?: string;
}

@Exclude()
export class OutputFileValueFragmentDto {
  @Expose()
  type: string;

  @Expose()
  description?: string;
}

@Exclude()
export class OutputFileMetadataDto {
  @Expose()
  sensors?: string[];

  @Expose()
  fromDate?: string;

  @Expose()
  toDate?: string;

  @Expose()
  managedObjectId?: string;

  @Expose()
  managedObjectName?: string;

  @Expose()
  @Type(() => OutputFileValueFragmentDto)
  @ValidateNested({ each: true })
  valueFragments?: OutputFileValueFragmentDto[];
}

@Exclude()
export class OutputFileDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  name: string;

  @Expose()
  url?: string;

  @Expose()
  createdByTask?: string;

  @Expose()
  description?: string;

  @Expose({ groups: [Groups.ALL] })
  @Type(() => OutputFileMetadataDto)
  metadata?: OutputFileMetadataDto;

  @Expose({ groups: [Groups.ALL] })
  @Type(() => OutputFileStorageDto)
  storage?: OutputFileStorageDto;

  @Expose({ groups: [Groups.ALL] })
  customAttributes?: CustomAttributes;
}

@Exclude()
export class PaginatedOutputFileDto extends BaseDBPagination<OutputFileDto> {
  @Expose()
  @Type(() => OutputFileDto)
  @ValidateNested({ each: true })
  data: OutputFileDto[];
}

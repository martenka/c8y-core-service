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
export class OutputFileVisibilityState {
  @Expose()
  published: boolean;

  @Expose()
  stateChanging: boolean;

  @Expose()
  errorMessage?: string;
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
  dateFrom?: string;

  @Expose()
  dateTo?: string;

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

  @Expose()
  @Type(() => OutputFileVisibilityState)
  visibilityState: OutputFileVisibilityState;

  @Expose({ groups: [Groups.ALL] })
  customAttributes?: CustomAttributes;

  @Expose({ groups: [Groups.ALL] })
  createdAt?: string;
}

@Exclude()
export class PaginatedOutputFileDto extends BaseDBPagination<OutputFileDto> {
  @Expose()
  @Type(() => OutputFileDto)
  @ValidateNested({ each: true })
  data: OutputFileDto[];
}

import { IsMongoId, IsOptional, IsString } from 'class-validator';

import { SensorSearchOptions } from '../../../global/query/types';

export class SensorQuery implements SensorSearchOptions {
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsOptional()
  @IsString()
  managedObjectId?: string;

  @IsOptional()
  @IsString()
  managedObjectName?: string;

  @IsOptional()
  @IsString()
  valueFragmentType?: string;

  @IsOptional()
  @IsString()
  valueFragmentDisplayName?: string;
}

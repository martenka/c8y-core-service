import {
  IsLowercase,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { SensorSearchOptions } from '../../../global/query/types';
import { Type } from 'class-transformer';
import { TransformCustomAttributes } from '../../../decorators/transformers/custom-attributes-transformer';
import { KeyValue, SearchType } from '../../../global/query/key-value';
import { Properties } from '../../../global/types/types';
import { TransformToLowercase } from '../../../decorators/transformers/lowercase-transformer';

export class SensorQuery implements SensorSearchOptions {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @TransformToLowercase()
  @IsLowercase()
  searchType?: SearchType;

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

  @IsOptional()
  @Type(() => KeyValue)
  @ValidateNested({
    each: true,
    message: (args) => `${args.value} is not legal ${args.property} value!`,
  })
  @TransformCustomAttributes()
  customAttributes?: KeyValue[];
}

export type SensorQueryOptions = Properties<SensorQuery>;

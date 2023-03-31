import { IsOptional, IsString, ValidateNested } from 'class-validator';

import { SensorSearchOptions } from '../../../global/query/types';
import { Type } from 'class-transformer';
import { TransformCustomAttributes } from '../../../decorators/transformers/custom-attributes-transformer';
import { KeyValue } from '../../../global/query/key-value';

export class SensorQuery implements SensorSearchOptions {
  @IsOptional()
  @IsString()
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

  @IsOptional()
  @Type(() => KeyValue)
  @ValidateNested({
    each: true,
    message: (args) => `${args.value} is not legal ${args.property} value!`,
  })
  @TransformCustomAttributes()
  customAttributes?: KeyValue[];
}

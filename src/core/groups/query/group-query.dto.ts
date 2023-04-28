import { IsLowercase, IsOptional, IsString } from 'class-validator';
import { Properties } from '../../../global/types/types';
import { SearchType } from '../../../global/query/key-value';
import { TransformToLowercase } from '../../../decorators/transformers/lowercase-transformer';

export class GroupQuery {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @TransformToLowercase()
  @IsLowercase()
  searchType?: SearchType;
}

export type GroupQueryOptions = Properties<GroupQuery>;

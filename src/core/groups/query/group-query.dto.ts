import { IsOptional, IsString } from 'class-validator';
import { Properties } from '../../../global/types/types';

export class GroupQuery {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export type GroupQueryOptions = Properties<GroupQuery>;

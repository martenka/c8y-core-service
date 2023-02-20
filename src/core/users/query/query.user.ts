import { UserSearchOptions } from '../../../global/query/types';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UserQuery implements UserSearchOptions {
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsOptional()
  @IsString()
  username?: string;
}

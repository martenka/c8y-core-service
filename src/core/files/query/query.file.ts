import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { FileTaskSearchOptions } from '../../../global/query/types';

export class FileTaskQuery implements FileTaskSearchOptions {
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

import { IsISO8601, IsOptional } from 'class-validator';
import { IsMongoIdInstance } from '../../../decorators/custom-validators/mongo-id.validator';
import { Types } from 'mongoose';
import { TransformMongoId } from '../../../decorators/transformers/object-id-transformer';
import { Properties } from '../../../global/types/types';

export class FileQuery {
  @IsOptional()
  @IsMongoIdInstance()
  @TransformMongoId()
  id?: Types.ObjectId;

  @IsOptional()
  @IsMongoIdInstance()
  @TransformMongoId()
  createdByTask?: Types.ObjectId;

  @IsOptional()
  @IsMongoIdInstance({ each: true })
  @TransformMongoId(',')
  sensors?: Types.ObjectId[];

  @IsOptional()
  @IsISO8601({ strict: true })
  fromDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  toDate?: string;
}

export type FileQueryOptions = Properties<FileQuery>;

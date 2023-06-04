import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { IsMongoIdInstance } from '../../../decorators/custom-validators/mongo-id.validator';
import { Types } from 'mongoose';
import { TransformMongoId } from '../../../decorators/transformers/object-id-transformer';
import { Properties } from '../../../global/types/types';
import { ApiProperty } from '@nestjs/swagger';

export class FileQuery {
  @IsOptional()
  @IsString()
  @ApiProperty({ type: 'string' })
  id?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ type: 'string' })
  createdByTask?: string;

  @IsOptional()
  @IsMongoIdInstance({ each: true })
  @TransformMongoId(',')
  sensors?: Types.ObjectId[];

  @IsOptional()
  @IsString()
  name?: string;

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
  @IsISO8601({ strict: true, strictSeparator: true })
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'ISO8601 string',
  })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'ISO8601 string',
  })
  dateTo?: string;
}

export type FileQueryOptions = Properties<FileQuery>;

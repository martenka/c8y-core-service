import { Expose } from 'class-transformer';
import { IDeleteResponse } from './types';
import { Types } from 'mongoose';
import { IsMongoIdInstance } from '../../decorators/custom-validators/mongo-id.validator';
import { TransformMongoId } from '../../decorators/transformers/object-id-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Properties } from '../types/types';

export class BaseDeleteResponse implements IDeleteResponse {
  @Expose()
  deletedCount: number;
}

export class DeleteInputDto {
  @IsMongoIdInstance({ each: true })
  @TransformMongoId()
  @ApiProperty({ type: 'string', isArray: true })
  items: Types.ObjectId[];
}

export type DeleteInputProperties = Properties<DeleteInputDto>;

import { CreateTaskDto } from './create-task.dto';

import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import { IsMongoIdInstance } from '../../../../decorators/custom-validators/mongo-id.validator';
import { TransformMongoId } from '../../../../decorators/transformers/object-id-transformer';
import { Properties } from '../../../../global/types/types';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateDataUploadTaskDtoPayload {
  @IsArray()
  @IsMongoIdInstance({ each: true })
  @TransformMongoId()
  fileIds: Types.ObjectId[];
}

export class CreateDataUploadTaskDto extends CreateTaskDto {
  @IsDefined()
  @Type(() => CreateDataUploadTaskDtoPayload)
  @ValidateNested()
  taskPayload: CreateDataUploadTaskDtoPayload;
}

export type CreateDataUploadTaskDtoProperties =
  Properties<CreateDataUploadTaskDto>;
